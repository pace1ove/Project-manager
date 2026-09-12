/**
 * 字段级差异对比工具
 * 用于变更历史的 before/after diff 展示，以及 BOM 条目对比
 */

export type DiffType = 'added' | 'removed' | 'changed'

export interface FieldDiff {
  field: string
  before: any
  after: any
  type: DiffType
}

/** 内部字段 key → 中文展示名（与 BOM 列定义保持一致） */
const FIELD_LABELS: Record<string, string> = {
  materialCatalogNo: '物料/目录号',
  drawingNo: '图号',
  jobNo: 'JOB号',
  chineseDescription: '中文描述',
  englishDescription: '英文描述',
  assemblyUnit: '装配单位',
  quantity: '数量',
  totalAmount: '总金额',
  spareParts: '备件',
  reserved1: '预留1/规格',
  reserved2: '预留2/位号',
  purchasingBatch: '采购批次',
  remarks: '备注',
  ecnNo: 'ECN号',
  ifKeyParts: '是否关键件',
  name: '名称',
  nameZh: '中文名称',
  nameEn: '英文名称',
  model: '型号',
  description: '描述',
  status: '状态',
  remark: '备注',
  customer: '客户',
  customerLocation: '客户地点',
  jobNo2: 'JOB号',
  equipmentModel: '设备型号'
}

export function getFieldLabel(key: string): string {
  return FIELD_LABELS[key] || key
}

/** 判断两个值是否相等（宽松比较，数字/字符串归一） */
function isEqual(a: any, b: any): boolean {
  if (a === b) return true
  if (a === undefined || a === null || a === '') {
    if (b === undefined || b === null || b === '') return true
  }
  if (typeof a === 'number' && typeof b === 'number') return a === b
  return JSON.stringify(a) === JSON.stringify(b)
}

/**
 * 对比两个对象，返回字段级差异列表。
 * - before 中有 after 中没有的字段 → removed
 * - after 中有 before 中没有的字段 → added
 * - 两边都有但值不同 → changed
 * 忽略 id/timestamp/sortOrder 等系统字段。
 */
export function diffObjects(before: any, after: any): FieldDiff[] {
  const IGNORE = new Set(['id', 'timestamp', 'sortOrder', 'createdAt', 'updatedAt', 'changeHistory', '_rowStatus', 'moduleId', 'projectId'])
  const result: FieldDiff[] = []
  if (!before && !after) return result
  const b = (before && typeof before === 'object') ? before : {}
  const a = (after && typeof after === 'object') ? after : {}
  const keys = new Set([...Object.keys(b), ...Object.keys(a)])
  for (const key of keys) {
    if (IGNORE.has(key)) continue
    const bv = b[key]
    const av = a[key]
    if (isEqual(bv, av)) continue
    let type: DiffType
    const bExists = bv !== undefined && bv !== null && bv !== ''
    const aExists = av !== undefined && av !== null && av !== ''
    if (bExists && !aExists) type = 'removed'
    else if (!bExists && aExists) type = 'added'
    else type = 'changed'
    result.push({ field: key, before: bv, after: av, type })
  }
  return result
}

/** 将值格式化为可读字符串 */
export function formatDiffValue(v: any): string {
  if (v === undefined || v === null || v === '') return '—'
  if (typeof v === 'object') return JSON.stringify(v)
  return String(v)
}

// ==================== BOM 行级对比 ====================

export interface BomRowDiff {
  /** 行标识 key：materialCatalogNo + '|' + drawingNo */
  key: string
  type: 'added' | 'removed' | 'changed' | 'unchanged'
  before?: any
  after?: any
  fieldDiffs?: FieldDiff[]
}

/** 生成 BOM 行的唯一标识 */
export function bomRowKey(item: any): string {
  const cat = (item?.materialCatalogNo || '').toString().trim()
  const draw = (item?.drawingNo || '').toString().trim()
  return `${cat}|${draw}`
}

/**
 * 对比两组 BOM 条目，基于 materialCatalogNo + drawingNo 作为行标识。
 * - 新增行：绿色
 * - 删除行：红色
 * - 修改行：黄色（逐字段对比）
 */
export function diffBomRows(beforeItems: any[], afterItems: any[]): BomRowDiff[] {
  const beforeMap = new Map<string, any>()
  for (const item of beforeItems || []) {
    beforeMap.set(bomRowKey(item), item)
  }
  const afterMap = new Map<string, any>()
  for (const item of afterItems || []) {
    afterMap.set(bomRowKey(item), item)
  }

  const result: BomRowDiff[] = []
  const allKeys = new Set([...beforeMap.keys(), ...afterMap.keys()])

  for (const key of allKeys) {
    const b = beforeMap.get(key)
    const a = afterMap.get(key)
    if (b && !a) {
      result.push({ key, type: 'removed', before: b })
    } else if (!b && a) {
      result.push({ key, type: 'added', after: a })
    } else if (b && a) {
      const fieldDiffs = diffObjects(b, a)
      if (fieldDiffs.length > 0) {
        result.push({ key, type: 'changed', before: b, after: a, fieldDiffs })
      } else {
        result.push({ key, type: 'unchanged', before: b, after: a })
      }
    }
  }
  return result
}
