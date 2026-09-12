import { db } from '@/db/index'
import type { BomTemplateType } from '@/types'

/**
 * 系统字段排除列表
 * 核心排除：id, moduleId, sortOrder, source
 * 同时排除：projectId, sourceModuleIds, type, createdAt, updatedAt（如实际出现在数据中）
 */
const SYSTEM_FIELDS = new Set([
  'id',
  'moduleId',
  'projectId',
  'sortOrder',
  'source',
  'sourceModuleIds',
  'type',
  'createdAt',
  'updatedAt'
])

/**
 * 常见字段 key → 中文 label 推断映射
 */
export const FIELD_KEY_LABEL_MAP: Record<string, string> = {
  drawingNo: '图号',
  jobNo: 'JOB号',
  chineseDescription: '中文描述',
  englishDescription: '英文描述',
  materialCatalogNo: '物料/目录号',
  assemblyUnit: '装配单位',
  quantity: '数量',
  totalAmount: '总金额',
  spareParts: '备件',
  reserved1: '预留1',
  reserved2: '预留2',
  purchasingBatch: '采购批次',
  remarks: '备注',
  ecnNo: 'ECN号',
  ifKeyParts: '是否关键件',
  type: 'BOM类型',
  supplier: '供应商',
  manufacturer: '制造商',
  price: '单价'
}

/**
 * 根据字段 key 推断中文 label
 * 未知 key 则返回 key 本身
 */
export function inferFieldLabel(key: string): string {
  return FIELD_KEY_LABEL_MAP[key] || key
}

/** 单个字段的扫描统计结果 */
export interface FieldScanResult {
  /** 字段 key */
  key: string
  /** 出现次数：在多少条 BOM 条目中作为属性存在 */
  occurrenceCount: number
  /** 有值条目数：值非空非 undefined 的条目数 */
  hasValueCount: number
}

/** 扫描汇总结果 */
export interface ScanSummary {
  /** 共扫描的 BOM 条目总数 */
  totalBomItems: number
  /** 字段统计列表（按出现次数降序） */
  fields: FieldScanResult[]
}

/**
 * 判断值是否为"有值"（非 undefined、非 null、非空字符串）
 */
function hasValue(val: unknown): boolean {
  return val !== undefined && val !== null && val !== ''
}

/**
 * 扫描一组 BOM 条目，累加字段统计
 */
function accumulateFieldStats(
  items: Record<string, unknown>[],
  fieldStats: Map<string, { occurrenceCount: number; hasValueCount: number }>
): number {
  let count = 0
  for (const item of items) {
    count++
    for (const key of Object.keys(item)) {
      if (SYSTEM_FIELDS.has(key)) continue
      const stat = fieldStats.get(key) || { occurrenceCount: 0, hasValueCount: 0 }
      stat.occurrenceCount++
      if (hasValue(item[key])) {
        stat.hasValueCount++
      }
      fieldStats.set(key, stat)
    }
  }
  return count
}

/**
 * 扫描所有 BOM 条目，收集字段使用统计
 *
 * 扫描范围按模板类型区分：
 * - module: 只扫描模块 BOM 条目
 * - order: 只扫描项目下单 BOM 条目
 * - import: 扫描两者（模块 BOM + 项目下单 BOM）
 *
 * 结果按出现次数降序排列
 */
export async function scanAllBomFields(templateType: BomTemplateType): Promise<ScanSummary> {
  const fieldStats = new Map<string, { occurrenceCount: number; hasValueCount: number }>()
  let totalItems = 0

  if (templateType === 'module' || templateType === 'import') {
    const moduleBomItems = await db.bomItems.toArray()
    totalItems += accumulateFieldStats(
      moduleBomItems as Record<string, unknown>[],
      fieldStats
    )
  }

  if (templateType === 'order' || templateType === 'import') {
    const orderBomItems = await db.orderBomItems.toArray()
    totalItems += accumulateFieldStats(
      orderBomItems as Record<string, unknown>[],
      fieldStats
    )
  }

  const fields: FieldScanResult[] = Array.from(fieldStats.entries())
    .map(([key, stat]) => ({
      key,
      occurrenceCount: stat.occurrenceCount,
      hasValueCount: stat.hasValueCount
    }))
    .sort((a, b) => b.occurrenceCount - a.occurrenceCount)

  return { totalBomItems: totalItems, fields }
}

/**
 * 获取全局字段使用次数映射（模块 BOM + 下单 BOM 合计）
 * key → 有值条目数
 * 用于模板字段列表的"使用次数"列
 */
export async function getFieldUsageMap(): Promise<Map<string, number>> {
  const usageMap = new Map<string, number>()
  const [moduleItems, orderItems] = await Promise.all([
    db.bomItems.toArray(),
    db.orderBomItems.toArray()
  ])
  for (const item of [...moduleItems, ...orderItems] as Record<string, unknown>[]) {
    for (const key of Object.keys(item)) {
      if (SYSTEM_FIELDS.has(key)) continue
      if (hasValue(item[key])) {
        usageMap.set(key, (usageMap.get(key) || 0) + 1)
      }
    }
  }
  return usageMap
}

/**
 * 迁移 BOM 条目中的字段 key：将旧 key 的值复制到新 key，然后删除旧 key
 * 遍历模块 BOM 和项目下单 BOM 所有条目
 */
export async function migrateBomFieldKey(oldKey: string, newKey: string): Promise<void> {
  if (oldKey === newKey) return

  // 迁移模块 BOM
  const moduleItems = await db.bomItems.toArray()
  const moduleUpdates: typeof moduleItems = []
  for (const item of moduleItems) {
    const record = item as Record<string, unknown>
    if (oldKey in record) {
      const updated = { ...record }
      updated[newKey] = updated[oldKey]
      delete updated[oldKey]
      moduleUpdates.push(updated as typeof moduleItems[number])
    }
  }
  if (moduleUpdates.length > 0) {
    await db.bomItems.bulkPut(moduleUpdates)
  }

  // 迁移项目下单 BOM
  const orderItems = await db.orderBomItems.toArray()
  const orderUpdates: typeof orderItems = []
  for (const item of orderItems) {
    const record = item as Record<string, unknown>
    if (oldKey in record) {
      const updated = { ...record }
      updated[newKey] = updated[oldKey]
      delete updated[oldKey]
      orderUpdates.push(updated as typeof orderItems[number])
    }
  }
  if (orderUpdates.length > 0) {
    await db.orderBomItems.bulkPut(orderUpdates)
  }
}
