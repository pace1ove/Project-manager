/**
 * 批量导入模块（含子模块和BOM明细）核心逻辑
 * 纯函数化设计，不直接操作DOM，UI逻辑在Vue组件中
 */
import * as XLSX from 'xlsx'
import type { Module, BomItem, Equipment, EquipmentConfiguration, Tag, BomTemplateField, Part } from '@/types'
import type { PartConflict } from '@/stores/parts'
import { isElectronEnvironment } from '@/utils/excel'

// ==================== 系统必需BOM字段（始终保留，不可删除） ====================
// 关联组件图号是批量导入特有的字段，用于关联模块，不在BOM条目中
// drawingNo是BOM条目的普通字段（图号），不用于关联模块
const IMPORT_SPECIAL_FIELDS = [
  { key: 'moduleDrawingNo', label: '关联组件图号', required: true }
]

// 向后兼容：旧模板中可能使用drawingNo作为关联字段，导入时也能识别
const IMPORT_MODULE_LINK_ALIASES = ['moduleDrawingNo', 'drawingNo', '组件图号', '关联组件图号']

// BOM条目中的系统必需字段key（这些字段在BOM条目中必须存在）
const BOM_REQUIRED_FIELD_KEYS = ['chineseDescription', 'quantity', 'type']

// 系统必需字段的默认label（当用户模板中没有对应字段时使用）
const BOM_REQUIRED_FIELD_DEFAULT_LABELS: Record<string, string> = {
  chineseDescription: '中文描述',
  quantity: '数量',
  type: '类型'
}

/**
 * 根据用户自定义BOM模板字段生成动态列映射
 * - 模块图号始终放在第一列（批量导入特有字段）
 * - 其他字段从用户自定义BOM模板中获取，包括label和顺序（sortOrder）
 * - 如果用户模板中没有某个必需字段，使用默认label并追加到末尾
 * - 同时支持中文label和字段key两种表头（导入时两种都能识别）
 */
function buildDynamicBomColumnMap(bomFields?: BomTemplateField[]): Record<string, string> {
  const columnMap: Record<string, string> = {}

  // 1. 关联组件图号始终放在第一列（批量导入特有字段，用于关联模块）
  for (const field of IMPORT_SPECIAL_FIELDS) {
    columnMap[field.label] = field.key
    columnMap[field.key] = field.key  // 同时支持字段key作为表头
  }
  // 向后兼容：旧模板中可能使用drawingNo/组件图号作为关联字段
  columnMap['组件图号'] = 'moduleDrawingNo'
  columnMap['drawingNo'] = 'moduleDrawingNo'  // 旧模板兼容：drawingNo列用于关联模块

  // 2. 用户自定义字段（按sortOrder排序）
  const usedKeys = new Set<string>(['moduleDrawingNo'])
  if (bomFields && bomFields.length > 0) {
    const sortedFields = [...bomFields]
      .filter(f => f.visible)
      .sort((a, b) => a.sortOrder - b.sortOrder)

    for (const field of sortedFields) {
      // moduleDrawingNo是关联字段，不在BOM条目中，跳过
      if (field.key === 'moduleDrawingNo') continue
      columnMap[field.label] = field.key
      columnMap[field.key] = field.key  // 同时支持字段key作为表头
      usedKeys.add(field.key)
    }
  } else {
    // 如果没有传入自定义字段，使用默认字段（兼容旧版本）
    const defaultFields = [
      { key: 'drawingNo', label: '图号' },
      { key: 'jobNo', label: 'JOB号' },
      { key: 'chineseDescription', label: '中文描述' },
      { key: 'englishDescription', label: '英文描述' },
      { key: 'materialCatalogNo', label: '物料/目录号' },
      { key: 'assemblyUnit', label: '装配单位' },
      { key: 'quantity', label: '数量' },
      { key: 'totalAmount', label: '总金额' },
      { key: 'spareParts', label: '备件' },
      { key: 'reserved1', label: '预留1' },
      { key: 'reserved2', label: '预留2' },
      { key: 'purchasingBatch', label: '采购批次' },
      { key: 'remarks', label: '备注' },
      { key: 'ecnNo', label: 'ECN号' },
      { key: 'ifKeyParts', label: '是否关键件' },
      { key: 'type', label: '类型' }
    ]
    for (const field of defaultFields) {
      columnMap[field.label] = field.key
      columnMap[field.key] = field.key  // 同时支持字段key作为表头
      usedKeys.add(field.key)
    }
  }

  // 3. 确保BOM必需字段存在（如果用户模板中没有，使用默认label追加到末尾）
  for (const key of BOM_REQUIRED_FIELD_KEYS) {
    if (!usedKeys.has(key)) {
      const defaultLabel = BOM_REQUIRED_FIELD_DEFAULT_LABELS[key] || key
      columnMap[defaultLabel] = key
      columnMap[key] = key  // 同时支持字段key作为表头
    }
  }

  return columnMap
}

// ==================== 类型定义 ====================
export interface ImportError {
  sheet: string
  row: number
  message: string
}

export interface ValidModule {
  row: number
  drawingNo: string
  nameZh: string
  nameEn: string
  equipmentModel: string
  configNames: string[]
  parentDrawingNos: string[]  // 多个父组件图号（支持逗号分隔，多对多关系）
  tagNames: string[]
  remark: string
}

export interface ValidBomItem {
  row: number
  moduleDrawingNo: string  // 关联组件图号（用于关联模块，不在BOM条目中）
  drawingNo?: string  // 图号（BOM条目的普通字段）
  chineseDescription: string
  englishDescription?: string
  materialCatalogNo?: string
  assemblyUnit?: string
  quantity: number
  totalAmount?: number
  spareParts?: number
  reserved1?: string
  reserved2?: string
  purchasingBatch?: string
  remarks?: string
  ecnNo?: string
  ifKeyParts?: string
  type: 'assembly' | 'order' | 'both'
  [key: string]: any
}

export interface ParsedImportData {
  modules: Record<string, any>[]
  bomItems: Record<string, any>[]
}

/** BOM明细Sheet的原始解析数据（未做字段映射） */
export interface RawBomSheetData {
  headers: string[]
  rows: Record<string, any>[]
}

export interface ValidationResult {
  errors: ImportError[]
  validModules: ValidModule[]
  validBomItems: ValidBomItem[]
  missingConfigurations: MissingConfiguration[]  // 需要自动创建的配置
}

/** 需要自动创建的配置信息 */
export interface MissingConfiguration {
  equipmentModel: string  // 所属设备型号
  equipmentId?: string    // 设备ID（校验后填充）
  configName: string      // 配置名称
  moduleCount: number     // 关联该配置的模块数量
}

export interface ImportResult {
  success: boolean
  moduleCount: number
  bomItemCount: number
  partsAdded: number    // 新增到零件库的零件数
  partsUpdated: number  // 覆盖更新的零件数
  partsKept: number     // 保留库里参数的零件数（使用已有partId）
  createdConfigCount: number  // 自动创建的配置数
}

/** Store 最小接口（解耦Pinia，便于纯函数化） */
interface EquipmentStoreLike {
  equipments: Equipment[]
  configurations: EquipmentConfiguration[]
  addConfiguration: (data: Omit<EquipmentConfiguration, 'id'>) => Promise<EquipmentConfiguration> | EquipmentConfiguration
}
interface ModulesStoreLike {
  modules: Module[]
  addModule: (data: any) => Module
  addBomItem: (moduleId: string, item: Omit<BomItem, 'id'>) => Promise<void>
  importBomItems: (moduleId: string, items: Omit<BomItem, 'id'>[]) => Promise<void>
  getBomItems: (moduleId: string) => Promise<BomItem[]>
  updateModule: (id: string, data: Partial<Module>) => void
  getModuleById: (id: string) => Module | undefined
}
interface TagsStoreLike {
  tags: Tag[]
  addTag: (data: Omit<Tag, 'id'>) => Tag
}
interface PartsStoreLike {
  parts: Part[]
  detectPartConflictsBatch: (items: Record<string, any>[]) => PartConflict[]
  upsertByDrawingNo: (partData: Partial<Part> & { drawingNo?: string }) => Promise<Part>
  updatePart: (id: string, data: Partial<Part>) => Promise<void>
  getByDrawingNo: (drawingNo: string) => Part | undefined
}

// ==================== 列名映射 ====================
const MODULE_COLUMN_MAP: Record<string, string> = {
  '组件图号': 'drawingNo',
  '中文名称': 'nameZh',
  '英文名称': 'nameEn',
  '所属设备型号': 'equipmentModel',
  '所属配置名称': 'configNames',
  '父组件图号': 'parentDrawingNo',
  '标签': 'tagNames',
  '备注': 'remark'
}

const BOM_COLUMN_MAP: Record<string, string> = {
  '组件图号': 'drawingNo',
  '图号': 'drawingNo',
  'JOB号': 'jobNo',
  '中文描述': 'chineseDescription',
  '英文描述': 'englishDescription',
  '物料/目录号': 'materialCatalogNo',
  '物料目录号': 'materialCatalogNo',
  '物料编码': 'materialCatalogNo',
  '装配单位': 'assemblyUnit',
  '单位': 'assemblyUnit',
  '数量': 'quantity',
  '总金额': 'totalAmount',
  '备件': 'spareParts',
  '预留1': 'reserved1',
  '预留2': 'reserved2',
  '采购批次': 'purchasingBatch',
  '备注': 'remarks',
  'ECN号': 'ecnNo',
  '是否关键件': 'ifKeyParts',
  '类型': 'type'
}

const MODULE_HEADERS = Object.keys(MODULE_COLUMN_MAP)
const BOM_HEADERS = Object.keys(BOM_COLUMN_MAP)

/** BOM类型中英文映射 */
const BOM_TYPE_MAP: Record<string, 'assembly' | 'order' | 'both'> = {
  'assembly': 'assembly',
  'order': 'order',
  'both': 'both',
  '装配': 'assembly',
  '下单': 'order',
  '两者': 'both',
  '装配/下单': 'both'
}

// ==================== 工具函数 ====================
/** 拆分逗号分隔字符串（支持中英文逗号） */
function splitCommaSeparated(value: string): string[] {
  if (!value) return []
  return String(value).split(/[,，]/).map(s => s.trim()).filter(s => s !== '')
}

/** 将Sheet二维数组按列名映射转为对象数组（带_row行号） */
function mapSheetToObjects(data: any[][], columnMap: Record<string, string>): Record<string, any>[] {
  if (!data || data.length < 2) return []
  const headers = data[0].map((h: any) => String(h ?? '').trim())
  const colIndexMap: Record<number, string> = {}
  headers.forEach((header: string, idx: number) => {
    const field = columnMap[header]
    if (field) colIndexMap[idx] = field
  })
  const result: Record<string, any>[] = []
  for (let i = 1; i < data.length; i++) {
    const row = data[i]
    if (!row || row.every((cell: any) => cell === '' || cell === undefined || cell === null)) continue
    const obj: Record<string, any> = { _row: i + 1 }
    Object.entries(colIndexMap).forEach(([idx, field]) => {
      obj[field] = row[Number(idx)] ?? ''
    })
    result.push(obj)
  }
  return result
}

/** 检测导入批次内的循环引用，返回存在循环的模块图号列表（支持多父组件） */
function detectCircularReferences(modules: { drawingNo: string; parentDrawingNos: string[] }[]): string[] {
  // 构建图号→父组件图号列表的映射
  const parentMap = new Map<string, string[]>()
  const importDrawingNos = new Set(modules.map(m => m.drawingNo))
  modules.forEach(m => {
    if (m.parentDrawingNos && m.parentDrawingNos.length > 0) {
      parentMap.set(m.drawingNo, m.parentDrawingNos.filter(p => importDrawingNos.has(p)))
    }
  })

  const cycles: string[] = []

  // 对每个模块进行DFS检测循环（支持多父组件路径）
  function hasCycle(start: string): boolean {
    const visited = new Set<string>()
    const stack: string[] = [start]

    while (stack.length > 0) {
      const current = stack.pop()!
      if (visited.has(current)) {
        // 回到起点说明有循环
        if (current === start) return true
        continue
      }
      visited.add(current)
      const parents = parentMap.get(current) || []
      for (const parent of parents) {
        if (parent === start) return true  // 直接回到起点
        if (!visited.has(parent)) {
          stack.push(parent)
        }
      }
    }
    return false
  }

  for (const mod of modules) {
    if (hasCycle(mod.drawingNo)) {
      cycles.push(mod.drawingNo)
    }
  }

  return [...new Set(cycles)]
}

/** 按父模块依赖关系拓扑排序，确保父模块先创建（支持多父组件） */
function topologicallySortModules(modules: ValidModule[], existingDrawingNos: Set<string>): ValidModule[] {
  const sorted: ValidModule[] = []
  const created = new Set<string>()
  let remaining = [...modules]
  while (remaining.length > 0) {
    const ready = remaining.filter(m => {
      // 没有父组件，直接就绪
      if (!m.parentDrawingNos || m.parentDrawingNos.length === 0) return true
      // 所有父组件都已存在（系统中已有或已创建），则就绪
      return m.parentDrawingNos.every(pdn =>
        existingDrawingNos.has(pdn) || created.has(pdn)
      )
    })
    if (ready.length === 0) break // 理论上不会发生（校验已排除循环）
    ready.forEach(m => {
      sorted.push(m)
      created.add(m.drawingNo)
    })
    remaining = remaining.filter(m => !created.has(m.drawingNo))
  }
  return sorted
}

// ==================== (a) downloadTemplate ====================

/** 生成并下载Excel模板（含模块信息和BOM明细两个Sheet）
 * @param bomFields - 用户自定义的BOM模板字段，用于动态生成BOM明细Sheet的表头
 */
export function downloadTemplate(bomFields?: BomTemplateField[]): void {
  const workbook = XLSX.utils.book_new()

  // Sheet1: 模块信息
  const moduleHeader = MODULE_HEADERS
  const moduleExample = [
    'DEMO-001-ASM',
    '示例组件',
    'Demo Module',
    'FILL-EQ-001',
    '标准配置,高速配置',
    'PARENT-001,PARENT-002',
    '电气,标准件',
    '示例数据，请删除此行后填写真实数据；父组件图号支持逗号分隔多个（多对多关系）'
  ]
  const moduleWs = XLSX.utils.aoa_to_sheet([moduleHeader, moduleExample])
  moduleWs['!cols'] = [
    { wch: 18 }, { wch: 16 }, { wch: 20 }, { wch: 16 },
    { wch: 22 }, { wch: 18 }, { wch: 16 }, { wch: 28 }
  ]
  XLSX.utils.book_append_sheet(workbook, moduleWs, '组件信息')

  // Sheet2: BOM明细（动态列，根据用户自定义BOM模板字段生成，表头直接使用字段key）
  const dynamicBomColumnMap = buildDynamicBomColumnMap(bomFields)
  
  // 获取字段key列表（按sortOrder排序，去重）
  const bomKeys: string[] = []
  const seenKeys = new Set<string>()
  // 先加关联组件图号（批量导入特有字段，用于关联模块）
  bomKeys.push('moduleDrawingNo')
  seenKeys.add('moduleDrawingNo')
  // 再加用户自定义字段（包括drawingNo作为普通字段）
  if (bomFields && bomFields.length > 0) {
    const sortedFields = [...bomFields]
      .filter(f => f.visible)
      .sort((a, b) => a.sortOrder - b.sortOrder)
    for (const field of sortedFields) {
      if (!seenKeys.has(field.key) && field.key !== 'moduleDrawingNo') {
        bomKeys.push(field.key)
        seenKeys.add(field.key)
      }
    }
  } else {
    // 默认字段顺序（包括drawingNo作为普通字段）
    const defaultKeys = ['drawingNo', 'jobNo', 'chineseDescription', 'englishDescription', 'materialCatalogNo', 'assemblyUnit', 'quantity', 'totalAmount', 'spareParts', 'reserved1', 'reserved2', 'purchasingBatch', 'remarks', 'ecnNo', 'ifKeyParts', 'type']
    for (const key of defaultKeys) {
      if (!seenKeys.has(key)) {
        bomKeys.push(key)
        seenKeys.add(key)
      }
    }
  }
  // 确保必需字段存在
  for (const key of BOM_REQUIRED_FIELD_KEYS) {
    if (!seenKeys.has(key)) {
      bomKeys.push(key)
      seenKeys.add(key)
    }
  }

  const bomHeader = bomKeys

  // 生成示例数据（根据字段key）
  const bomExampleMap: Record<string, any> = {
    'moduleDrawingNo': 'DEMO-001-ASM',
    'drawingNo': 'DEMO-001',
    'jobNo': 'JOB-DEMO-001',
    'chineseDescription': '示例物料',
    'englishDescription': 'Demo Material',
    'materialCatalogNo': 'MAT-001',
    'assemblyUnit': 'PCS',
    'quantity': 2,
    'totalAmount': 100,
    'spareParts': 0,
    'reserved1': '',
    'reserved2': '',
    'purchasingBatch': '',
    'remarks': '示例数据，请删除此行后填写真实数据',
    'ecnNo': '',
    'ifKeyParts': '',
    'type': 'assembly'
  }
  const bomExample = bomHeader.map(h => bomExampleMap[h] ?? '')

  const bomWs = XLSX.utils.aoa_to_sheet([bomHeader, bomExample])
  // 动态列宽（根据字段key）
  const keyWidthMap: Record<string, number> = {
    'moduleDrawingNo': 20, 'drawingNo': 14, 'jobNo': 14, 'chineseDescription': 18, 'englishDescription': 18,
    'materialCatalogNo': 16, 'assemblyUnit': 12, 'quantity': 10, 'totalAmount': 12,
    'spareParts': 10, 'reserved1': 12, 'reserved2': 12, 'purchasingBatch': 14,
    'remarks': 28, 'ecnNo': 12, 'ifKeyParts': 12, 'type': 12
  }
  bomWs['!cols'] = bomHeader.map(h => ({ wch: keyWidthMap[h] ?? 14 }))
  XLSX.utils.book_append_sheet(workbook, bomWs, 'BOM明细')

  if (isElectronEnvironment()) {
    // Electron环境：使用主进程的文件保存API
    downloadTemplateToElectron(workbook)
  } else {
    // 浏览器环境：触发浏览器下载
    XLSX.writeFile(workbook, '组件批量导入模板.xlsx')
  }
}

/**
 * Electron环境下下载模板文件
 * 弹出保存对话框，用户选择保存位置后写入文件
 */
async function downloadTemplateToElectron(workbook: XLSX.WorkBook): Promise<void> {
  try {
    // 生成Excel文件的ArrayBuffer
    const excelBuffer = XLSX.write(workbook, {
      bookType: 'xlsx',
      type: 'array'
    })

    // 调用Electron主进程的保存API
    const result = await window.electronAPI!.saveExcelFile({
      filename: '组件批量导入模板.xlsx',
      data: excelBuffer
    })

    if (result.canceled) {
      // 用户取消保存
      return
    }

    if (result.success) {
      // 保存成功，使用ElMessage提示（动态导入避免循环依赖）
      import('element-plus').then(({ ElMessage }) => {
        ElMessage.success(`模板下载成功：${result.filePath}`)
      })
    } else {
      import('element-plus').then(({ ElMessage }) => {
        ElMessage.error(`模板下载失败：${result.error || '未知错误'}`)
      })
    }
  } catch (error) {
    console.error('Electron下载模板失败:', error)
    const msg = error instanceof Error ? error.message : String(error)
    import('element-plus').then(({ ElMessage }) => {
      ElMessage.error(`模板下载失败：${msg || '未知错误'}`)
    })
  }
}

// ==================== (b) parseImportFile ====================
/** 解析Excel文件，返回原始行数据（带行号） */
export function parseImportFile(file: File, bomFields?: BomTemplateField[]): Promise<ParsedImportData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })

        // 读取模块信息Sheet
        const moduleSheetName = workbook.SheetNames.find(n => n.includes('组件')) || workbook.SheetNames[0]
        const moduleSheet = workbook.Sheets[moduleSheetName]
        const moduleRaw = moduleSheet
          ? (XLSX.utils.sheet_to_json(moduleSheet, { header: 1, defval: '' }) as any[][])
          : []
        const modules = mapSheetToObjects(moduleRaw, MODULE_COLUMN_MAP)

        // 读取BOM明细Sheet（使用动态列映射）
        const dynamicBomColumnMap = buildDynamicBomColumnMap(bomFields)
        const bomSheetName = workbook.SheetNames.find(n => n.includes('BOM') || n.includes('明细')) || workbook.SheetNames[1]
        const bomSheet = bomSheetName ? workbook.Sheets[bomSheetName] : undefined
        const bomRaw = bomSheet
          ? (XLSX.utils.sheet_to_json(bomSheet, { header: 1, defval: '' }) as any[][])
          : []
        const bomItems = mapSheetToObjects(bomRaw, dynamicBomColumnMap)

        resolve({ modules, bomItems })
      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = () => reject(new Error('文件读取失败'))
    reader.readAsArrayBuffer(file)
  })
}

// ==================== (b2) parseImportFileRaw ====================
/**
 * 解析Excel文件，返回组件信息（固定映射）和BOM明细原始数据（表头+行，未做字段映射）
 * 用于字段映射对话框：用户在解析后、导入前手动确认/调整列映射
 */
export function parseImportFileRaw(file: File): Promise<{ modules: Record<string, any>[]; bom: RawBomSheetData }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })

        // 读取模块信息Sheet（固定列映射）
        const moduleSheetName = workbook.SheetNames.find(n => n.includes('组件')) || workbook.SheetNames[0]
        const moduleSheet = workbook.Sheets[moduleSheetName]
        const moduleRaw = moduleSheet
          ? (XLSX.utils.sheet_to_json(moduleSheet, { header: 1, defval: '' }) as any[][])
          : []
        const modules = mapSheetToObjects(moduleRaw, MODULE_COLUMN_MAP)

        // 读取BOM明细Sheet（原始表头+行数据，不做映射）
        const bomSheetName = workbook.SheetNames.find(n => n.includes('BOM') || n.includes('明细')) || workbook.SheetNames[1]
        const bomSheet = bomSheetName ? workbook.Sheets[bomSheetName] : undefined
        const bomRaw = bomSheet
          ? (XLSX.utils.sheet_to_json(bomSheet, { header: 1, defval: '' }) as any[][])
          : []

        const bom = rawSheetToHeaderKeyed(bomRaw)

        resolve({ modules, bom })
      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = () => reject(new Error('文件读取失败'))
    reader.readAsArrayBuffer(file)
  })
}

/** 将Sheet二维数组转为 { headers, rows }，rows 以表头名为 key */
function rawSheetToHeaderKeyed(data: any[][]): RawBomSheetData {
  if (!data || data.length < 2) return { headers: [], rows: [] }
  const headers = data[0].map((h: any) => String(h ?? '').trim())
  const rows: Record<string, any>[] = []
  for (let i = 1; i < data.length; i++) {
    const row = data[i]
    if (!row || row.every((cell: any) => cell === '' || cell === undefined || cell === null)) continue
    const obj: Record<string, any> = {}
    headers.forEach((header: string, idx: number) => {
      if (header) obj[header] = row[idx] ?? ''
    })
    rows.push(obj)
  }
  return { headers, rows }
}

// ==================== (b3) applyBomFieldMapping ====================
/**
 * 将用户字段映射应用到BOM原始行数据
 * @param bomData 原始BOM数据（表头+行）
 * @param fieldMapping 模板字段key -> Excel列名 的映射
 * @returns 映射后的对象数组，带 _row 行号
 */
export function applyBomFieldMapping(
  bomData: RawBomSheetData,
  fieldMapping: Record<string, string>
): Record<string, any>[] {
  return bomData.rows.map((row, idx) => {
    const obj: Record<string, any> = { _row: idx + 2 }
    for (const [fieldKey, colName] of Object.entries(fieldMapping)) {
      if (colName && colName in row) {
        obj[fieldKey] = row[colName]
      }
    }
    return obj
  })
}

// ==================== (c) validateImportData ====================
/** 校验解析后的数据，收集所有错误并转换为结构化数据 */
export function validateImportData(
  parsedData: ParsedImportData,
  equipmentStore: EquipmentStoreLike,
  modulesStore: ModulesStoreLike,
  _tagsStore: TagsStoreLike,
  bomFields?: BomTemplateField[]
): ValidationResult {
  const errors: ImportError[] = []
  const validModules: ValidModule[] = []
  const validBomItems: ValidBomItem[] = []
  const missingConfigurations: MissingConfiguration[] = []

  const existingDrawingNos = new Set(modulesStore.modules.map(m => m.drawingNo))
  const existingNameZhs = new Set(modulesStore.modules.map(m => m.nameZh))

  // 用于收集缺失配置：equipmentModel + configName -> 计数
  const missingConfigMap = new Map<string, { equipmentModel: string; configName: string; moduleCount: number }>()

  // ---------- 校验模块信息 ----------
  const seenDrawingNos = new Set<string>()
  const seenNameZhs = new Set<string>()
  const importDrawingNos = new Set<string>()

  for (const row of parsedData.modules) {
    const rowNum: number = row._row
    const drawingNo = String(row.drawingNo ?? '').trim()
    const nameZh = String(row.nameZh ?? '').trim()
    const nameEn = String(row.nameEn ?? '').trim()
    const equipmentModel = String(row.equipmentModel ?? '').trim()
    const configNamesRaw = String(row.configNames ?? '').trim()
    const parentDrawingNosRaw = String(row.parentDrawingNo ?? '').trim()
    // 支持逗号分隔多个父组件图号（多对多关系）
    const parentDrawingNos = parentDrawingNosRaw
      ? parentDrawingNosRaw.split(/[,，]/).map(s => s.trim()).filter(s => s.length > 0)
      : []
    const tagNamesRaw = String(row.tagNames ?? '').trim()
    const remark = String(row.remark ?? '').trim()

    // 1. 模块图号必填
    if (!drawingNo) {
      errors.push({ sheet: '组件信息', row: rowNum, message: '组件图号必填' })
    } else {
      // 本次导入内唯一
      if (seenDrawingNos.has(drawingNo)) {
        errors.push({ sheet: '组件信息', row: rowNum, message: `组件图号「${drawingNo}」在导入文件中重复` })
      }
      // 与现有模块不重复
      if (existingDrawingNos.has(drawingNo)) {
        errors.push({ sheet: '组件信息', row: rowNum, message: `组件图号「${drawingNo}」已存在于系统中` })
      }
      seenDrawingNos.add(drawingNo)
      importDrawingNos.add(drawingNo)
    }

    // 2. 中文名称必填
    if (!nameZh) {
      errors.push({ sheet: '组件信息', row: rowNum, message: '中文名称必填' })
    } else {
      if (seenNameZhs.has(nameZh)) {
        errors.push({ sheet: '组件信息', row: rowNum, message: `中文名称「${nameZh}」在导入文件中重复` })
      }
      if (existingNameZhs.has(nameZh)) {
        errors.push({ sheet: '组件信息', row: rowNum, message: `中文名称「${nameZh}」已存在于系统中` })
      }
      seenNameZhs.add(nameZh)
    }

    // 3. 所属设备型号必填且存在
    let equipment: Equipment | undefined
    if (!equipmentModel) {
      errors.push({ sheet: '组件信息', row: rowNum, message: '所属设备型号必填' })
    } else {
      equipment = equipmentStore.equipments.find(e => e.model === equipmentModel)
      if (!equipment) {
        errors.push({ sheet: '组件信息', row: rowNum, message: `所属设备型号「${equipmentModel}」不存在` })
      }
    }

    // 4. 所属配置名称校验（收集缺失配置，不报错，后续提示用户自动创建）
    const configNames = splitCommaSeparated(configNamesRaw)
    if (equipment) {
      for (const cfgName of configNames) {
        const exists = equipmentStore.configurations.some(
          c => c.equipmentId === equipment!.id && c.name === cfgName
        )
        if (!exists) {
          // 收集缺失配置，后续提示用户自动创建
          const key = `${equipment.model}::${cfgName}`
          if (!missingConfigMap.has(key)) {
            missingConfigMap.set(key, {
              equipmentModel: equipment.model,
              configName: cfgName,
              moduleCount: 0
            })
          }
          missingConfigMap.get(key)!.moduleCount++
        }
      }
    }

    // 5. 父模块图号校验（存在性 + 循环引用在批量检测）
    // 支持多个父组件图号（多对多关系），逐个校验
    for (const pdn of parentDrawingNos) {
      const parentExists = importDrawingNos.has(pdn) || existingDrawingNos.has(pdn)
      // 注意：importDrawingNos此时可能还未包含后续行的图号，循环引用检测在全部解析后进行
      if (!parentExists && !parsedData.modules.some(r => String(r.drawingNo ?? '').trim() === pdn)) {
        errors.push({ sheet: '组件信息', row: rowNum, message: `父组件图号「${pdn}」不存在` })
      }
    }

    // 6. 标签不校验（不存在则自动创建）
    const tagNames = splitCommaSeparated(tagNamesRaw)

    // 暂存为有效模块（即使有错误也先存，用于后续循环引用检测；最终只返回无错误的）
    validModules.push({
      row: rowNum,
      drawingNo,
      nameZh,
      nameEn,
      equipmentModel,
      configNames,
      parentDrawingNos,
      tagNames,
      remark
    })
  }

  // 循环引用检测（基于全部导入模块，支持多父组件）
  const allImportDrawingNos = new Set(validModules.map(m => m.drawingNo).filter(Boolean))
  const cycleModules = detectCircularReferences(
    validModules.map(m => ({ drawingNo: m.drawingNo, parentDrawingNos: m.parentDrawingNos }))
  )
  for (const dn of cycleModules) {
    const mod = validModules.find(m => m.drawingNo === dn)
    if (mod) {
      errors.push({ sheet: '组件信息', row: mod.row, message: `组件图号「${dn}」存在循环父组件引用` })
    }
  }
  void allImportDrawingNos

  // 过滤掉有错误的模块（按行号匹配错误）
  const errorRows = new Set(errors.filter(e => e.sheet === '组件信息').map(e => e.row))
  const finalValidModules = validModules.filter(m => !errorRows.has(m.row))

  // ---------- 校验BOM明细 ----------
  const validModuleDrawingNos = new Set(finalValidModules.map(m => m.drawingNo))
  
  // 从模板中获取必填字段（排除系统字段moduleDrawingNo和type，这两个始终校验）
  const templateRequiredFields = bomFields
    ? bomFields.filter(f => f.required && f.key !== 'moduleDrawingNo' && f.key !== 'type' && f.visible)
    : []
  // 如果没有传入模板，使用默认必填字段（兼容旧版本）
  const defaultRequiredKeys = ['chineseDescription', 'quantity']
  const requiredFieldKeys = templateRequiredFields.length > 0
    ? templateRequiredFields.map(f => f.key)
    : defaultRequiredKeys
  const requiredFieldLabels: Record<string, string> = {}
  for (const f of templateRequiredFields) {
    requiredFieldLabels[f.key] = f.label
  }
  // 默认字段的label
  requiredFieldLabels['chineseDescription'] = requiredFieldLabels['chineseDescription'] || '中文描述'
  requiredFieldLabels['quantity'] = requiredFieldLabels['quantity'] || '数量'

  for (const row of parsedData.bomItems) {
    const rowNum: number = row._row
    // 关联组件图号：优先使用moduleDrawingNo，向后兼容drawingNo
    const moduleDrawingNo = String(row.moduleDrawingNo ?? row.drawingNo ?? '').trim()
    const typeRaw = String(row.type ?? '').trim()

    // 关联组件图号必填且存在（系统必需字段，始终校验）
    if (!moduleDrawingNo) {
      errors.push({ sheet: 'BOM明细', row: rowNum, message: '关联组件图号必填' })
    } else if (!validModuleDrawingNos.has(moduleDrawingNo) && !existingDrawingNos.has(moduleDrawingNo)) {
      errors.push({ sheet: 'BOM明细', row: rowNum, message: `关联组件图号「${moduleDrawingNo}」不存在（需在组件信息Sheet或系统中存在）` })
    }

    // 类型必填且为assembly/order/both之一（系统必需字段，始终校验）
    let bomType: 'assembly' | 'order' | 'both' | undefined
    if (!typeRaw) {
      errors.push({ sheet: 'BOM明细', row: rowNum, message: '类型必填（assembly/order/both）' })
    } else {
      bomType = BOM_TYPE_MAP[typeRaw.toLowerCase()] || BOM_TYPE_MAP[typeRaw]
      if (!bomType) {
        errors.push({ sheet: 'BOM明细', row: rowNum, message: `类型「${typeRaw}」无效，必须为assembly/order/both（或装配/下单/两者）` })
      }
    }

    // 根据模板必填设置动态校验其他字段
    for (const key of requiredFieldKeys) {
      const value = row[key]
      const label = requiredFieldLabels[key] || key
      if (value === '' || value === undefined || value === null) {
        errors.push({ sheet: 'BOM明细', row: rowNum, message: `${label}必填` })
      } else if (key === 'quantity') {
        // 数量字段特殊校验：必须为数值
        const num = Number(value)
        if (isNaN(num)) {
          errors.push({ sheet: 'BOM明细', row: rowNum, message: `${label}「${value}」不是有效的数值` })
        }
      }
    }

    // 无错误则加入有效BOM明细（包含所有映射后的字段）
    const hasError = errors.some(e => e.sheet === 'BOM明细' && e.row === rowNum)
    if (!hasError && bomType) {
      const { _row, moduleDrawingNo: _mdn, drawingNo: _dn, ...restFields } = row
      // 确保quantity是数值类型
      const quantity = row.quantity !== undefined && row.quantity !== '' ? Number(row.quantity) : 0
      validBomItems.push({
        ...restFields,
        row: rowNum,
        moduleDrawingNo,
        drawingNo: row.drawingNo,  // 保留drawingNo作为BOM条目的普通字段
        chineseDescription: String(row.chineseDescription ?? ''),
        quantity,
        type: bomType
      })
    }
  }

  // 将缺失配置转换为数组
  for (const cfg of missingConfigMap.values()) {
    missingConfigurations.push(cfg)
  }

  return { errors, validModules: finalValidModules, validBomItems, missingConfigurations }
}

// ==================== 零件参数构建辅助 ====================
/** BOM 条目里不属于零件参数的字段（需排除） */
const BOM_TO_PART_EXCLUDE_KEYS = new Set([
  'quantity', 'type', 'source', 'sortOrder',
  'moduleDrawingNo', 'row', '_row'
])

/**
 * 从 ValidBomItem 构建零件参数对象。
 * - BOM 的 type 字段映射为零件的 partType
 * - 排除 BOM 特有字段（quantity/type/source/sortOrder/moduleDrawingNo/row/_row）
 * @param item      BOM 条目
 * @param overwrite 是否为覆盖模式：true 时空字符串转为 null（清除字段）；false 时空值字段不传入
 */
function buildPartParamsFromBomItem(item: ValidBomItem, overwrite: boolean): Record<string, any> {
  const result: Record<string, any> = {}
  for (const [key, value] of Object.entries(item)) {
    if (BOM_TO_PART_EXCLUDE_KEYS.has(key)) continue
    if (value === undefined) continue

    if (overwrite) {
      // 覆盖模式：空字符串视为清除该字段（传 null）
      result[key] = (value === '') ? null : value
    } else {
      // 非覆盖模式：空值字段不传入（不覆盖已有值）
      if (value === '' || value === null) continue
      result[key] = value
    }
  }
  // BOM type → 零件 partType
  if (item.type) {
    result.partType = item.type
    delete result.type
  }
  return result
}

// ==================== (d) executeImport ====================
/** 执行导入：拓扑排序创建模块，解析设备/配置/标签，添加BOM明细（异步，BOM独立存储）
 * @param autoCreateConfigurations - 是否自动创建设备中不存在的配置（默认true）
 */
export async function executeImport(
  validData: { validModules: ValidModule[]; validBomItems: ValidBomItem[]; missingConfigurations?: MissingConfiguration[] },
  equipmentStore: EquipmentStoreLike,
  modulesStore: ModulesStoreLike,
  tagsStore: TagsStoreLike,
  partsStore?: PartsStoreLike,
  partConflicts?: PartConflict[],
  autoCreateConfigurations: boolean = true
): Promise<ImportResult> {
  const existingDrawingNos = new Set(modulesStore.modules.map(m => m.drawingNo))
  const sortedModules = topologicallySortModules(validData.validModules, existingDrawingNos)

  // ===== 自动创建缺失配置 =====
  let createdConfigCount = 0
  if (autoCreateConfigurations && validData.missingConfigurations && validData.missingConfigurations.length > 0) {
    for (const missingCfg of validData.missingConfigurations) {
      const equipment = equipmentStore.equipments.find(e => e.model === missingCfg.equipmentModel)
      if (!equipment) continue

      // 检查配置是否已存在（可能在循环中已创建）
      const exists = equipmentStore.configurations.some(
        c => c.equipmentId === equipment.id && c.name === missingCfg.configName
      )
      if (exists) continue

      // 自动创建配置
      const newConfig = await equipmentStore.addConfiguration({
        equipmentId: equipment.id,
        name: missingCfg.configName,
        description: `批量导入自动创建（关联${missingCfg.moduleCount}个模块）`,
        moduleIds: []
      })
      createdConfigCount++
      console.log(`[批量导入] 自动创建配置：${equipment.model} / ${missingCfg.configName}，ID: ${newConfig.id}`)
    }
  }

  // 图号→模块ID映射（预填现有模块）
  const drawingNoToId = new Map<string, string>()
  for (const mod of modulesStore.modules) {
    drawingNoToId.set(mod.drawingNo, mod.id)
  }

  // 按模块分组BOM明细（使用moduleDrawingNo关联模块）
  const bomByModule = new Map<string, ValidBomItem[]>()
  for (const item of validData.validBomItems) {
    const moduleDn = item.moduleDrawingNo
    if (!bomByModule.has(moduleDn)) bomByModule.set(moduleDn, [])
    bomByModule.get(moduleDn)!.push(item)
  }

  let bomItemCount = 0

  // 逐模块创建
  for (const mod of sortedModules) {
    // 解析设备ID
    const equipment = equipmentStore.equipments.find(e => e.model === mod.equipmentModel)
    if (!equipment) continue

    // 解析配置ID
    const configurationIds = equipmentStore.configurations
      .filter(c => c.equipmentId === equipment.id && mod.configNames.includes(c.name))
      .map(c => c.id)

    // 解析标签ID（不存在则自动创建）
    const tagIds: string[] = []
    for (const tagName of mod.tagNames) {
      let tag = tagsStore.tags.find(t => t.name === tagName)
      if (!tag) {
        tag = tagsStore.addTag({ name: tagName, color: '#909399' })
      }
      tagIds.push(tag.id)
    }

    // 解析父模块ID（支持多父模块，多对多关系）
    const parentModuleIds: string[] = []
    for (const pdn of mod.parentDrawingNos) {
      const parentId = drawingNoToId.get(pdn)
      if (parentId && !parentModuleIds.includes(parentId)) {
        parentModuleIds.push(parentId)
      }
    }

    // 创建模块（不再传入bom数据，BOM通过importBomItems独立添加）
    const createdModule = modulesStore.addModule({
      drawingNo: mod.drawingNo,
      nameZh: mod.nameZh,
      nameEn: mod.nameEn || undefined,
      equipmentId: equipment.id,
      configurationIds,
      tags: tagIds,
      parentModuleIds,
      childModuleIds: [],
      remark: mod.remark || undefined
    })

    drawingNoToId.set(mod.drawingNo, createdModule.id)
  }

  // ===== 零件库冲突预解析：为所有BOM条目解析 partId =====
  let partsAdded = 0
  let partsUpdated = 0
  let partsKept = 0

  if (partsStore) {
    // 构建冲突映射：drawingNo → PartConflict
    const conflictMap = new Map<string, PartConflict>()
    if (partConflicts && partConflicts.length > 0) {
      for (const c of partConflicts) {
        conflictMap.set(c.drawingNo, c)
      }
    }

    // 按图号分组去重：同一图号只解析一次 partId
    const drawingNoToPartId = new Map<string, string>()
    // 有图号的BOM条目按图号去重
    const uniqueDrawingNos = new Set<string>()
    for (const item of validData.validBomItems) {
      const dn = item.drawingNo != null ? String(item.drawingNo).trim() : ''
      if (dn) uniqueDrawingNos.add(dn)
    }

    for (const dn of uniqueDrawingNos) {
      const conflict = conflictMap.get(dn)
      // 找到第一条该图号的BOM条目来构建零件参数
      const sampleItem = validData.validBomItems.find(
        it => String(it.drawingNo != null ? it.drawingNo : '').trim() === dn
      )
      if (!sampleItem) continue

      if (conflict) {
        if (conflict.action === 'keep') {
          // 保留库里参数：不修改零件库，直接用已有 partId
          drawingNoToPartId.set(dn, conflict.existingPart.id)
          partsKept++
        } else {
          // overwrite：用新参数更新零件库（空字符串→null 表示清除字段）
          const partData = buildPartParamsFromBomItem(sampleItem, true)
          await partsStore.updatePart(conflict.existingPart.id, partData)
          drawingNoToPartId.set(dn, conflict.existingPart.id)
          partsUpdated++
        }
      } else {
        // 无冲突：upsert 创建新零件
        const partData = buildPartParamsFromBomItem(sampleItem, false)
        const part = await partsStore.upsertByDrawingNo(partData)
        drawingNoToPartId.set(dn, part.id)
        partsAdded++
      }
    }

    // 为每个BOM条目设置 partId（无图号的条目单独处理）
    for (const item of validData.validBomItems) {
      const dn = item.drawingNo != null ? String(item.drawingNo).trim() : ''
      if (dn && drawingNoToPartId.has(dn)) {
        ;(item as any).partId = drawingNoToPartId.get(dn)!
      } else if (!dn) {
        // 无图号：每条独立创建零件
        const partData = buildPartParamsFromBomItem(item, false)
        const part = await partsStore.upsertByDrawingNo(partData)
        ;(item as any).partId = part.id
        partsAdded++
      }
    }
  }

  // 批量添加所有BOM明细（包括引用现有模块的）
  for (const [drawingNo, items] of bomByModule) {
    const moduleId = drawingNoToId.get(drawingNo)
    if (!moduleId) continue
    // 查询现有BOM条目数以确定sortOrder起点
    const existingItems = await modulesStore.getBomItems(moduleId)
    const baseSortOrder = existingItems.reduce((m, i) => Math.max(m, i.sortOrder || 0), 0)
    const bomItemsToAdd: Omit<BomItem, 'id'>[] = items.map((item, idx) => {
      // 基础字段
      const bomItem: Omit<BomItem, 'id'> = {
        drawingNo: item.drawingNo || undefined,
        jobNo: item.jobNo || undefined,
        chineseDescription: item.chineseDescription,
        englishDescription: item.englishDescription || undefined,
        materialCatalogNo: item.materialCatalogNo || undefined,
        assemblyUnit: item.assemblyUnit || undefined,
        quantity: item.quantity,
        totalAmount: item.totalAmount || undefined,
        spareParts: item.spareParts || undefined,
        reserved1: item.reserved1 || undefined,
        reserved2: item.reserved2 || undefined,
        purchasingBatch: item.purchasingBatch || undefined,
        remarks: item.remarks || undefined,
        ecnNo: item.ecnNo || undefined,
        ifKeyParts: item.ifKeyParts || undefined,
        type: item.type,
        source: 'import',
        sortOrder: baseSortOrder + idx
      }
      // 透传 partId（若已预解析）
      if ((item as any).partId) {
        bomItem.partId = (item as any).partId
      }
      // 包含所有其他动态字段（用户自定义字段）
      const fixedKeys = new Set(['drawingNo', 'jobNo', 'chineseDescription', 'englishDescription', 'materialCatalogNo', 'assemblyUnit', 'quantity', 'totalAmount', 'spareParts', 'reserved1', 'reserved2', 'purchasingBatch', 'remarks', 'ecnNo', 'ifKeyParts', 'type', 'source', 'sortOrder', '_row', 'row', 'partId'])
      for (const key of Object.keys(item)) {
        if (!fixedKeys.has(key) && item[key] !== undefined && item[key] !== '') {
          bomItem[key] = item[key]
        }
      }
      return bomItem
    })
    await modulesStore.importBomItems(moduleId, bomItemsToAdd)
    bomItemCount += items.length
  }

  return {
    success: true,
    moduleCount: sortedModules.length,
    bomItemCount,
    partsAdded,
    partsUpdated,
    partsKept,
    createdConfigCount
  }
}
