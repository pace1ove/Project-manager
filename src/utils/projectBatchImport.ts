/**
 * 批量导入项目核心逻辑
 * 纯函数化设计，不直接操作DOM，UI逻辑在Vue组件中
 * 支持：项目基本信息导入、客户需求导入、更新模式（根据JOB号更新已有项目）
 */
import * as XLSX from 'xlsx'
import type { Project, CustomerRequirement, Equipment, EquipmentConfiguration, ProjectType } from '@/types'
import { isElectronEnvironment } from '@/utils/excel'

// ==================== 类型定义 ====================

/** 解析后的项目行数据（原始） */
export interface RawProjectRow {
  rowIndex: number
  jobNo: string
  name: string
  customer?: string
  customerLocation?: string
  status?: string
  equipmentModel?: string
  configurationNames?: string[]
  serialNumber?: string
  projectTypeName?: string
  deliveryDate?: string
  remark?: string
}

/** 解析后的客户需求行数据（原始） */
export interface RawRequirementRow {
  rowIndex: number
  jobNo: string
  content: string
}

/** 校验错误 */
export interface ImportError {
  sheet: string
  rowIndex: number
  field: string
  message: string
}

/** 校验结果 */
export interface ValidationResult {
  valid: boolean
  errors: ImportError[]
  projects: RawProjectRow[]
  requirements: RawRequirementRow[]
}

/** 导入结果统计 */
export interface ImportResult {
  created: number
  updated: number
  skipped: number
  errors: string[]
}

/** 执行导入所需的Store接口（最小化依赖） */
export interface ProjectImportStores {
  equipments: Equipment[]
  configurations: EquipmentConfiguration[]
  projectTypes: ProjectType[]
  existingProjects: Project[]
  createProject: (data: Partial<Project>) => Project | Promise<Project>
  updateProject: (id: string, data: Partial<Project>) => Promise<void> | void
  generateId: (prefix?: string) => string
}

// ==================== 列名映射（支持中文label和字段key两种表头） ====================

const PROJECT_COLUMN_MAP: Record<string, string> = {
  // 中文label
  'JOB号': 'jobNo',
  '项目名称': 'name',
  '客户名称': 'customer',
  '客户地点': 'customerLocation',
  '项目状态': 'status',
  '设备型号': 'equipmentModel',
  '配置名称': 'configurationNames',
  '序列号': 'serialNumber',
  '项目类型': 'projectTypeName',
  '交付日期': 'deliveryDate',
  '备注': 'remark',
  // 字段key
  'jobNo': 'jobNo',
  'name': 'name',
  'customer': 'customer',
  'customerLocation': 'customerLocation',
  'status': 'status',
  'equipmentModel': 'equipmentModel',
  'configurationNames': 'configurationNames',
  'serialNumber': 'serialNumber',
  'projectTypeName': 'projectTypeName',
  'deliveryDate': 'deliveryDate',
  'remark': 'remark'
}

const REQUIREMENT_COLUMN_MAP: Record<string, string> = {
  'JOB号': 'jobNo',
  '需求内容': 'content',
  '客户需求': 'content',
  'jobNo': 'jobNo',
  'content': 'content'
}

// ==================== 状态映射 ====================

const STATUS_MAP: Record<string, Project['status']> = {
  '进行中': 'ongoing',
  '已完成': 'completed',
  '已取消': 'cancelled',
  '已暂停': 'paused',
  'ongoing': 'ongoing',
  'completed': 'completed',
  'cancelled': 'cancelled',
  'paused': 'paused'
}

// ==================== (a) downloadTemplate ====================

/**
 * 下载批量导入项目模板
 * 两个Sheet：项目信息 + 客户需求
 */
export function downloadProjectTemplate(): void {
  const wb = XLSX.utils.book_new()

  // Sheet1：项目信息
  const projectHeaders = ['JOB号', '项目名称', '客户名称', '客户地点', '项目状态', '设备型号', '配置名称', '序列号', '项目类型', '交付日期', '备注']
  const projectExample = [
    ['JOB-2026-001', '客户A灌装机订单', '客户A', '上海', '进行中', 'GZ-2000', '标准配置,高速配置', 'SN-001', '标准订单', '2026-12-31', '示例项目'],
    ['JOB-2026-002', '客户B贴标机订单', '客户B', '北京', '进行中', 'TB-1000', '标准配置', '', '', '2026-11-30', '']
  ]
  const projectWs = XLSX.utils.aoa_to_sheet([projectHeaders, ...projectExample])
  projectWs['!cols'] = projectHeaders.map((_, i) => ({ wch: [15, 25, 15, 15, 12, 15, 20, 15, 15, 12, 20][i] || 15 }))
  XLSX.utils.book_append_sheet(wb, projectWs, '项目信息')

  // Sheet2：客户需求
  const reqHeaders = ['JOB号', '需求内容']
  const reqExample = [
    ['JOB-2026-001', '产能要求≥200瓶/分钟'],
    ['JOB-2026-001', '符合GMP标准'],
    ['JOB-2026-002', '支持圆形瓶和方形瓶']
  ]
  const reqWs = XLSX.utils.aoa_to_sheet([reqHeaders, ...reqExample])
  reqWs['!cols'] = [{ wch: 15 }, { wch: 50 }]
  XLSX.utils.book_append_sheet(wb, reqWs, '客户需求')

  // 导出
  if (isElectronEnvironment()) {
    downloadTemplateToElectron(wb)
  } else {
    XLSX.writeFile(wb, `项目批量导入模板_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }
}

/** Electron环境下下载文件 */
async function downloadTemplateToElectron(wb: XLSX.WorkBook): Promise<void> {
  try {
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    const blob = new Blob([wbout], { type: 'application/octet-stream' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `项目批量导入模板_${new Date().toISOString().slice(0, 10)}.xlsx`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  } catch (err) {
    console.error('Electron下载模板失败:', err)
    // fallback到浏览器方式
    XLSX.writeFile(wb, `项目批量导入模板_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }
}

// ==================== (b) parseImportFile ====================

/**
 * 解析导入的Excel文件
 * @param file Excel文件
 * @returns 解析后的项目行和客户需求行
 */
export function parseProjectImportFile(file: File): Promise<{ projects: RawProjectRow[]; requirements: RawRequirementRow[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const wb = XLSX.read(data, { type: 'array' })

        // 解析项目信息Sheet
        const projectSheetName = wb.SheetNames.find((name) => name.includes('项目') || name === 'Sheet1') || wb.SheetNames[0]
        const projectWs = wb.Sheets[projectSheetName]
        const projectRows = parseProjectSheet(projectWs)

        // 解析客户需求Sheet（如果存在）
        let requirementRows: RawRequirementRow[] = []
        const reqSheetName = wb.SheetNames.find((name) => name.includes('需求') || name.includes('客户'))
        if (reqSheetName) {
          const reqWs = wb.Sheets[reqSheetName]
          requirementRows = parseRequirementSheet(reqWs)
        }

        resolve({ projects: projectRows, requirements: requirementRows })
      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = () => reject(new Error('文件读取失败'))
    reader.readAsArrayBuffer(file)
  })
}

/** 解析项目信息Sheet */
function parseProjectSheet(ws: XLSX.WorkSheet): RawProjectRow[] {
  const rows: RawProjectRow[] = []
  const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: '' })

  jsonData.forEach((row, idx) => {
    // 行号从2开始（第1行是表头）
    const rowIndex = idx + 2

    // 构建标准化对象（支持中文label和字段key两种表头）
    const normalized: Record<string, any> = {}
    for (const [key, value] of Object.entries(row)) {
      const mappedKey = PROJECT_COLUMN_MAP[key.trim()]
      if (mappedKey && value !== undefined && value !== '') {
        normalized[mappedKey] = value
      }
    }

    // 配置名称可能是逗号分隔的字符串
    let configurationNames: string[] | undefined
    if (normalized.configurationNames) {
      configurationNames = String(normalized.configurationNames)
        .split(/[,，]/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
    }

    rows.push({
      rowIndex,
      jobNo: String(normalized.jobNo || '').trim(),
      name: String(normalized.name || '').trim(),
      customer: normalized.customer ? String(normalized.customer).trim() : undefined,
      customerLocation: normalized.customerLocation ? String(normalized.customerLocation).trim() : undefined,
      status: normalized.status ? String(normalized.status).trim() : undefined,
      equipmentModel: normalized.equipmentModel ? String(normalized.equipmentModel).trim() : undefined,
      configurationNames,
      serialNumber: normalized.serialNumber ? String(normalized.serialNumber).trim() : undefined,
      projectTypeName: normalized.projectTypeName ? String(normalized.projectTypeName).trim() : undefined,
      deliveryDate: normalized.deliveryDate ? String(normalized.deliveryDate).trim() : undefined,
      remark: normalized.remark ? String(normalized.remark).trim() : undefined
    })
  })

  return rows
}

/** 解析客户需求Sheet */
function parseRequirementSheet(ws: XLSX.WorkSheet): RawRequirementRow[] {
  const rows: RawRequirementRow[] = []
  const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: '' })

  jsonData.forEach((row, idx) => {
    const rowIndex = idx + 2
    const normalized: Record<string, any> = {}
    for (const [key, value] of Object.entries(row)) {
      const mappedKey = REQUIREMENT_COLUMN_MAP[key.trim()]
      if (mappedKey && value !== undefined && value !== '') {
        normalized[mappedKey] = value
      }
    }

    rows.push({
      rowIndex,
      jobNo: String(normalized.jobNo || '').trim(),
      content: String(normalized.content || '').trim()
    })
  })

  return rows
}

// ==================== (c) validateImportData ====================

/**
 * 校验导入数据
 * @param projects 解析后的项目行
 * @param requirements 解析后的客户需求行
 * @param stores Store接口
 * @returns 校验结果
 */
export function validateProjectImportData(
  projects: RawProjectRow[],
  requirements: RawRequirementRow[],
  stores: ProjectImportStores
): ValidationResult {
  const errors: ImportError[] = []
  const validProjects: RawProjectRow[] = []
  const validRequirements: RawRequirementRow[] = []

  // 1. 校验项目信息
  const jobNoSet = new Set<string>()

  for (const project of projects) {
    const rowErrors: ImportError[] = []

    // JOB号必填
    if (!project.jobNo) {
      rowErrors.push({ sheet: '项目信息', rowIndex: project.rowIndex, field: 'JOB号', message: 'JOB号不能为空' })
    } else {
      // JOB号在本次导入中唯一
      if (jobNoSet.has(project.jobNo)) {
        rowErrors.push({ sheet: '项目信息', rowIndex: project.rowIndex, field: 'JOB号', message: `JOB号「${project.jobNo}」在本次导入中重复` })
      }
      jobNoSet.add(project.jobNo)
    }

    // 项目名称必填
    if (!project.name) {
      rowErrors.push({ sheet: '项目信息', rowIndex: project.rowIndex, field: '项目名称', message: '项目名称不能为空' })
    }

    // 设备型号必填
    if (!project.equipmentModel) {
      rowErrors.push({ sheet: '项目信息', rowIndex: project.rowIndex, field: '设备型号', message: '设备型号不能为空' })
    } else {
      // 设备型号必须存在
      const equipment = stores.equipments.find((e) => e.model === project.equipmentModel)
      if (!equipment) {
        rowErrors.push({ sheet: '项目信息', rowIndex: project.rowIndex, field: '设备型号', message: `设备型号「${project.equipmentModel}」不存在` })
      } else if (project.configurationNames && project.configurationNames.length > 0) {
        // 配置名称必须属于该设备
        for (const configName of project.configurationNames) {
          const config = stores.configurations.find(
            (c) => c.name === configName && c.equipmentId === equipment.id
          )
          if (!config) {
            rowErrors.push({ sheet: '项目信息', rowIndex: project.rowIndex, field: '配置名称', message: `配置「${configName}」不属于设备「${project.equipmentModel}」` })
          }
        }
      }
    }

    // 项目状态校验
    if (project.status && !STATUS_MAP[project.status]) {
      rowErrors.push({ sheet: '项目信息', rowIndex: project.rowIndex, field: '项目状态', message: `项目状态「${project.status}」不合法，可选值：进行中/已完成/已取消/已暂停` })
    }

    // 项目类型校验
    if (project.projectTypeName) {
      const projectType = stores.projectTypes.find((t) => t.name === project.projectTypeName)
      if (!projectType) {
        rowErrors.push({ sheet: '项目信息', rowIndex: project.rowIndex, field: '项目类型', message: `项目类型「${project.projectTypeName}」不存在` })
      }
    }

    // 交付日期格式校验
    if (project.deliveryDate) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/
      if (!dateRegex.test(project.deliveryDate)) {
        rowErrors.push({ sheet: '项目信息', rowIndex: project.rowIndex, field: '交付日期', message: `交付日期「${project.deliveryDate}」格式不正确，应为YYYY-MM-DD` })
      }
    }

    if (rowErrors.length === 0) {
      validProjects.push(project)
    } else {
      errors.push(...rowErrors)
    }
  }

  // 2. 校验客户需求
  const validJobNos = new Set(validProjects.map((p) => p.jobNo))
  for (const req of requirements) {
    const rowErrors: ImportError[] = []

    // JOB号必填
    if (!req.jobNo) {
      rowErrors.push({ sheet: '客户需求', rowIndex: req.rowIndex, field: 'JOB号', message: 'JOB号不能为空' })
    } else if (!validJobNos.has(req.jobNo)) {
      // JOB号必须在项目信息中存在（或在已有项目中存在，用于更新模式）
      const existingProject = stores.existingProjects.find((p) => p.jobNo === req.jobNo)
      if (!existingProject) {
        rowErrors.push({ sheet: '客户需求', rowIndex: req.rowIndex, field: 'JOB号', message: `JOB号「${req.jobNo}」在项目信息中不存在，且不是已有项目` })
      }
    }

    // 需求内容必填
    if (!req.content) {
      rowErrors.push({ sheet: '客户需求', rowIndex: req.rowIndex, field: '需求内容', message: '需求内容不能为空' })
    }

    if (rowErrors.length === 0) {
      validRequirements.push(req)
    } else {
      errors.push(...rowErrors)
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    projects: validProjects,
    requirements: validRequirements
  }
}

// ==================== (d) executeImport ====================

/**
 * 执行导入（支持更新模式）
 * - 根据JOB号匹配已有项目
 * - 如果JOB号已存在，则更新该项目
 * - 如果JOB号不存在，则创建新项目
 * @param validatedData 校验通过的数据
 * @param stores Store接口
 * @returns 导入结果统计
 */
export async function executeProjectImport(
  validatedData: ValidationResult,
  stores: ProjectImportStores
): Promise<ImportResult> {
  const result: ImportResult = {
    created: 0,
    updated: 0,
    skipped: 0,
    errors: []
  }

  // 按JOB号分组客户需求
  const requirementsByJobNo = new Map<string, CustomerRequirement[]>()
  for (const req of validatedData.requirements) {
    if (!requirementsByJobNo.has(req.jobNo)) {
      requirementsByJobNo.set(req.jobNo, [])
    }
    requirementsByJobNo.get(req.jobNo)!.push({
      id: stores.generateId('cr'),
      content: req.content
    })
  }

  // 处理每个项目
  for (const project of validatedData.projects) {
    try {
      // 查找设备
      const equipment = stores.equipments.find((e) => e.model === project.equipmentModel)
      if (!equipment) {
        result.errors.push(`第${project.rowIndex}行：设备型号「${project.equipmentModel}」不存在`)
        result.skipped++
        continue
      }

      // 解析配置
      let configurationId = ''
      const configCombinations: { id: string; configurationId: string; quantity: number; remark?: string }[] = []

      if (project.configurationNames && project.configurationNames.length > 0) {
        for (const configName of project.configurationNames) {
          const config = stores.configurations.find(
            (c) => c.name === configName && c.equipmentId === equipment.id
          )
          if (config) {
            if (!configurationId) configurationId = config.id
            configCombinations.push({
              id: stores.generateId('cc'),
              configurationId: config.id,
              quantity: 1,
              remark: ''
            })
          }
        }
      } else {
        // 如果没有指定配置，使用设备的第一个配置
        const firstConfig = stores.configurations.find((c) => c.equipmentId === equipment.id)
        if (firstConfig) {
          configurationId = firstConfig.id
          configCombinations.push({
            id: stores.generateId('cc'),
            configurationId: firstConfig.id,
            quantity: 1,
            remark: ''
          })
        }
      }

      // 解析项目类型
      let projectTypeId: string | undefined
      if (project.projectTypeName) {
        const projectType = stores.projectTypes.find((t) => t.name === project.projectTypeName)
        if (projectType) {
          projectTypeId = projectType.id
        }
      }

      // 解析状态
      const status: Project['status'] = project.status && STATUS_MAP[project.status]
        ? STATUS_MAP[project.status]
        : 'ongoing'

      // 客户需求
      const customerRequirements = requirementsByJobNo.get(project.jobNo) || []

      // 构建项目数据
      const projectData: Partial<Project> = {
        name: project.name,
        jobNo: project.jobNo,
        customer: project.customer,
        customerLocation: project.customerLocation,
        status,
        equipmentId: equipment.id,
        equipmentModel: project.equipmentModel,
        configurationId,
        configCombinations,
        serialNumber: project.serialNumber,
        projectTypeId,
        deliveryDate: project.deliveryDate,
        customerRequirements,
        relatedProjectIds: [],
        selectedModules: []
      }

      // 查找已有项目（更新模式）
      const existingProject = stores.existingProjects.find((p) => p.jobNo === project.jobNo)

      if (existingProject) {
        // 更新模式：保留已有项目的selectedModules和orderBom，只更新基本信息和客户需求
        await stores.updateProject(existingProject.id, {
          ...projectData,
          // 保留已有的模块选择和下单BOM（不覆盖）
          selectedModules: existingProject.selectedModules,
          relatedProjectIds: existingProject.relatedProjectIds
        })
        result.updated++
      } else {
        // 新建模式
        await stores.createProject(projectData)
        result.created++
      }
    } catch (err) {
      result.errors.push(`第${project.rowIndex}行：导入失败 - ${err instanceof Error ? err.message : String(err)}`)
      result.skipped++
    }
  }

  return result
}
