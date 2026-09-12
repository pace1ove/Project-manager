import { db } from '@/db/index'
import type { BomTemplateType } from '@/types'

/**
 * BOM 模板字段变更的数据迁移工具
 *
 * 迁移范围按模板类型区分：
 * - module → 仅 bomItems（组件 BOM）
 * - order  → 仅 orderBomItems（项目下单 BOM）
 * - import → 两者都迁移
 *
 * 系统字段（id/moduleId/projectId/sortOrder/source 等）不参与迁移。
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

export interface MigrationProgress {
  processed: number
  total: number
  table: string
}

export type ProgressCallback = (p: MigrationProgress) => void

/** 根据模板类型选择目标表名列表 */
function targetTables(templateType: BomTemplateType): Array<'bomItems' | 'orderBomItems'> {
  if (templateType === 'module') return ['bomItems']
  if (templateType === 'order') return ['orderBomItems']
  return ['bomItems', 'orderBomItems']
}

/** 分批处理工具：让 UI 有机会刷新进度条 */
async function yieldToUI() {
  await new Promise((r) => setTimeout(r, 0))
}

/**
 * 字段重命名迁移：旧 key 的值移动到新 key，然后删除旧 key
 * 幂等：新 key 已存在时不覆盖（保留已有新数据）
 */
export async function renameBomFieldKey(
  oldKey: string,
  newKey: string,
  templateType: BomTemplateType = 'import',
  onProgress?: ProgressCallback
): Promise<{ renamedCount: number }> {
  if (oldKey === newKey || SYSTEM_FIELDS.has(oldKey)) return { renamedCount: 0 }
  let renamedCount = 0

  for (const table of targetTables(templateType)) {
    const items: Record<string, unknown>[] = await (db[table] as any).toArray()
    const total = items.length
    const updates: Record<string, unknown>[] = []
    for (let i = 0; i < items.length; i++) {
      const record = items[i]
      if (oldKey in record) {
        const updated = { ...record }
        if (!(newKey in updated) || updated[newKey] === undefined || updated[newKey] === '') {
          updated[newKey] = updated[oldKey]
        }
        delete updated[oldKey]
        updates.push(updated)
        renamedCount++
      }
      if (onProgress && (i % 500 === 0 || i === total - 1)) {
        onProgress({ processed: i + 1, total, table })
        await yieldToUI()
      }
    }
    if (updates.length > 0) {
      await (db[table] as any).bulkPut(updates)
    }
  }
  return { renamedCount }
}

/**
 * 字段删除迁移：清除所有 BOM 数据中的该 key
 */
export async function clearBomFieldKey(
  key: string,
  templateType: BomTemplateType = 'import',
  onProgress?: ProgressCallback
): Promise<{ clearedCount: number }> {
  if (SYSTEM_FIELDS.has(key)) return { clearedCount: 0 }
  let clearedCount = 0

  for (const table of targetTables(templateType)) {
    const items: Record<string, unknown>[] = await (db[table] as any).toArray()
    const total = items.length
    const updates: Record<string, unknown>[] = []
    for (let i = 0; i < items.length; i++) {
      const record = items[i]
      if (key in record) {
        const updated = { ...record }
        delete updated[key]
        updates.push(updated)
        clearedCount++
      }
      if (onProgress && (i % 500 === 0 || i === total - 1)) {
        onProgress({ processed: i + 1, total, table })
        await yieldToUI()
      }
    }
    if (updates.length > 0) {
      await (db[table] as any).bulkPut(updates)
    }
  }
  return { clearedCount }
}

/**
 * 字段新增迁移：为现有 BOM 数据补充该字段（值为 defaultValue 或空字符串）
 * 仅当记录中不存在该 key 时才补充，不覆盖已有值
 */
export async function addBomFieldToExisting(
  key: string,
  defaultValue: string | undefined,
  templateType: BomTemplateType = 'import',
  onProgress?: ProgressCallback
): Promise<{ addedCount: number }> {
  if (SYSTEM_FIELDS.has(key)) return { addedCount: 0 }
  const fillValue = defaultValue ?? ''
  let addedCount = 0

  for (const table of targetTables(templateType)) {
    const items: Record<string, unknown>[] = await (db[table] as any).toArray()
    const total = items.length
    const updates: Record<string, unknown>[] = []
    for (let i = 0; i < items.length; i++) {
      const record = items[i]
      if (!(key in record)) {
        const updated = { ...record, [key]: fillValue }
        updates.push(updated)
        addedCount++
      }
      if (onProgress && (i % 500 === 0 || i === total - 1)) {
        onProgress({ processed: i + 1, total, table })
        await yieldToUI()
      }
    }
    if (updates.length > 0) {
      await (db[table] as any).bulkPut(updates)
    }
  }
  return { addedCount }
}
