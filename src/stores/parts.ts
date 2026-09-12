import { defineStore } from 'pinia'
import { ref } from 'vue'
import { DEFAULT_PART_LIBRARY_ID } from '@/types'
import type { Part } from '@/types'
import { db } from '@/db/index'
import type { Collection } from 'dexie'
import { generateId, deepClone } from '@/utils/storage'

/**
 * BOM 条目侧（非零件）字段。
 * 从 BOM 记录中提取零件参数时需排除这些字段；BOM 表本身只持久化这些字段 + partId。
 * 注意：isModuleItem / sourceModuleIds 仅存在于下单 BOM 条目，同样不属于零件参数。
 */
export const BOM_ONLY_FIELDS = new Set([
  'id', 'moduleId', 'projectId', 'partId',
  'quantity', 'type', 'source', 'sortOrder',
  'isModuleItem', 'sourceModuleIds',
  'jobNo', // JOB号是BOM特有字段，每个项目的BOM条目都有自己的JOB号
  'createdAt', 'updatedAt'
])

/** 从一条 BOM 记录中提取零件参数字段（排除 BOM 侧字段） */
export function extractPartParams(record: Record<string, any>): Record<string, any> {
  const part: Record<string, any> = {}
  for (const [k, v] of Object.entries(record)) {
    if (!BOM_ONLY_FIELDS.has(k) && v !== undefined) {
      part[k] = v
    }
  }
  return part
}

/** 从一条 BOM 记录中提取需要持久化到 BOM 表的字段（仅 BOM 侧字段） */
export function extractBomFields(record: Record<string, any>): Record<string, any> {
  const bom: Record<string, any> = {}
  for (const [k, v] of Object.entries(record)) {
    if (BOM_ONLY_FIELDS.has(k) && v !== undefined) {
      bom[k] = v
    }
  }
  return bom
}

/** 判断一个值是否为空（用于 upsert 时不覆盖已有值） */
function isEmptyValue(v: any): boolean {
  return v === undefined || v === null || v === ''
}

// ===== 查重对比校验（共享工具） =====

/** 字段差异信息 */
export interface FieldDiff {
  key: string
  label: string
  oldValue: any
  newValue: any
}

/** 零件冲突信息 */
export interface PartConflict {
  /** 冲突的图号（或物料/目录号，取决于matchField） */
  drawingNo: string
  /** 匹配字段：'drawingNo' 图号，'materialCatalogNo' 物料/目录号 */
  matchField: 'drawingNo' | 'materialCatalogNo'
  /** 零件库中已存在的零件 */
  existingPart: Part
  /** 新输入的零件数据 */
  newData: Record<string, any>
  /** 参数差异列表（空数组表示完全一致） */
  diffs: FieldDiff[]
  /** 用户选择的处理方式：'keep' 保留库里参数，'overwrite' 用新数据覆盖 */
  action: 'keep' | 'overwrite'
}

/** 零件参数字段标签映射（用于差异对比表展示） */
export const PART_FIELD_LABELS: Record<string, string> = {
  partType: '零件类型',
  drawingNo: '图号',
  jobNo: 'JOB号',
  chineseDescription: '中文描述',
  englishDescription: '英文描述',
  materialCatalogNo: '物料/目录号',
  assemblyUnit: '装配单位',
  totalAmount: '总金额',
  spareParts: '备件',
  reserved1: '预留1',
  partCategory: '零件分类',
  reserved2: '预留2',
  purchasingBatch: '采购批次',
  remarks: '备注',
  ecnNo: 'ECN号',
  ifKeyParts: '是否关键件'
}

export const usePartsStore = defineStore('parts', () => {
  const parts = ref<Part[]>([])
  /** 图号 -> 零件 的Map索引，O(1)查找，避免8万条数据下线性遍历卡顿 */
  const drawingNoMap = new Map<string, Part>()

  /** 重建图号索引（全量加载后调用） */
  function rebuildDrawingNoMap() {
    drawingNoMap.clear()
    for (const part of parts.value) {
      if (part.drawingNo) {
        drawingNoMap.set(part.drawingNo, part)
      }
    }
  }

  async function initialize() {
    const loaded = await db.parts.toArray()
    // 数据修复：drawingNo为空时，使用materialCatalogNo作为图号
    let needUpdate = false
    for (const part of loaded) {
      if (!part.drawingNo && part.materialCatalogNo) {
        part.drawingNo = part.materialCatalogNo
        needUpdate = true
      }
    }
    if (needUpdate) {
      await db.parts.bulkPut(loaded)
    }
    parts.value = loaded
    rebuildDrawingNoMap()
  }

  function getAll(): Part[] {
    return parts.value
  }

  function getById(id: string): Part | undefined {
    if (!id) return undefined
    return parts.value.find((p) => p.id === id)
  }

  function getByDrawingNo(drawingNo: string): Part | undefined {
    if (!drawingNo) return undefined
    const dn = drawingNo.trim()
    if (!dn) return undefined
    // O(1) Map查找，避免8万条数据下线性遍历卡顿
    return drawingNoMap.get(dn)
  }

  /**
   * 检测新零件数据与零件库中已有零件的冲突（按图号或物料/目录号匹配）。
   * - 优先按图号匹配，图号为空或未命中时按物料/目录号匹配
   * - 都为空或未命中：返回 null（无冲突）
   * - 匹配到已存在零件：返回冲突信息，包含所有参数差异列表
   * 调用方根据 diffs 展示对比表，并让用户选择 keep/overwrite。
   */
  function detectPartConflict(newData: Record<string, any>): PartConflict | null {
    // 1. 优先按图号匹配
    const drawingNo = newData.drawingNo != null ? String(newData.drawingNo).trim() : ''
    if (drawingNo) {
      const existing = getByDrawingNo(drawingNo)
      if (existing) {
        return buildPartConflict(existing, newData, drawingNo, 'drawingNo')
      }
    }

    // 2. 图号为空或未命中时，按物料/目录号匹配
    const materialCatalogNo = newData.materialCatalogNo != null ? String(newData.materialCatalogNo).trim() : ''
    if (materialCatalogNo) {
      const existing = parts.value.find(p => 
        p.materialCatalogNo && String(p.materialCatalogNo).trim() === materialCatalogNo
      )
      if (existing) {
        return buildPartConflict(existing, newData, materialCatalogNo, 'materialCatalogNo')
      }
    }

    return null
  }

  /** 构建零件冲突信息（内部辅助函数） */
  function buildPartConflict(
    existing: Part,
    newData: Record<string, any>,
    matchValue: string,
    matchField: 'drawingNo' | 'materialCatalogNo'
  ): PartConflict {
    // 对比所有零件参数字段（匹配键不参与对比）
    const diffs: FieldDiff[] = []
    for (const [key, label] of Object.entries(PART_FIELD_LABELS)) {
      if (key === matchField) continue
      const oldVal = (existing as any)[key]
      const newVal = newData[key]
      const oldStr = oldVal !== undefined && oldVal !== null ? String(oldVal).trim() : ''
      const newStr = newVal !== undefined && newVal !== null ? String(newVal).trim() : ''
      if (oldStr !== newStr) {
        diffs.push({ key, label, oldValue: oldVal, newValue: newVal })
      }
    }

    return {
      drawingNo: matchValue,
      matchField,
      existingPart: existing,
      newData: { ...newData },
      diffs,
      action: 'overwrite'
    }
  }

  /**
   * 批量检测多条零件数据的冲突。
   * 返回有冲突的条目列表（无冲突的条目不在结果中）。
   * 支持按图号或物料/目录号匹配（与detectPartConflict一致）。
   */
  function detectPartConflictsBatch(items: Record<string, any>[]): PartConflict[] {
    const conflicts: PartConflict[] = []
    const seenKeys = new Set<string>()
    for (const item of items) {
      // 调用detectPartConflict，支持图号和物料/目录号匹配
      const conflict = detectPartConflict(item)
      if (!conflict) continue
      // 同一批导入中相同匹配键只报一次冲突（以第一条为准）
      const seenKey = `${conflict.matchField}:${conflict.drawingNo}`
      if (seenKeys.has(seenKey)) continue
      seenKeys.add(seenKey)
      conflicts.push(conflict)
    }
    return conflicts
  }

  /**
   * 按图号、中文描述、英文描述、物料目录号搜索（小写模糊匹配）。
   * @param keyword 关键词
   * @param libraryIds 可选库过滤；传入且非空时只返回这些库下的零件，不传/空数组返回所有库（向后兼容）
   */
  function search(keyword: string, libraryIds?: string[]): Part[] {
    const kw = keyword.trim().toLowerCase()
    // 库过滤：传入且非空时只保留指定库下的零件
    const libraryFilter =
      libraryIds && libraryIds.length > 0 ? new Set(libraryIds) : null
    let source = parts.value
    if (libraryFilter) {
      source = source.filter((p) => libraryFilter.has(p.libraryId))
    }
    if (!kw) return source
    return source.filter(
      (p) =>
        (p.drawingNo || '').toLowerCase().includes(kw) ||
        (p.chineseDescription || '').toLowerCase().includes(kw) ||
        (p.englishDescription || '').toLowerCase().includes(kw) ||
        (p.materialCatalogNo || '').toLowerCase().includes(kw)
    )
  }

  /**
   * 新增零件。图号非空时校验唯一性（跨所有库，已存在同图号零件则抛错）。
   * data.libraryId 由调用方传入；为空时默认归入默认库。
   */
  async function addPart(
    data: Omit<Part, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Part> {
    const drawingNo = data.drawingNo != null ? String(data.drawingNo).trim() : ''
    if (drawingNo && getByDrawingNo(drawingNo)) {
      throw new Error(`图号「${drawingNo}」已存在零件库中`)
    }
    const now = new Date().toISOString()
    const part: Part = {
      ...deepClone(data),
      id: generateId('part'),
      drawingNo: drawingNo || undefined,
      libraryId: data.libraryId || DEFAULT_PART_LIBRARY_ID,
      createdAt: now,
      updatedAt: now
    }
    await db.parts.add(part)
    parts.value.push(part)
    // 同步更新Map索引
    if (part.drawingNo) {
      drawingNoMap.set(part.drawingNo, part)
    }
    return part
  }

  /**
   * 更新零件参数。严格模式下，零件库是物料主数据的唯一来源，
   * 所有引用该零件的 BOM 条目在读取时实时关联，自动同步最新参数。
   */
  async function updatePart(id: string, data: Partial<Part>): Promise<void> {
    const idx = parts.value.findIndex((p) => p.id === id)
    if (idx === -1) return
    // 保存旧图号，用于更新Map索引
    const oldDrawingNo = parts.value[idx]?.drawingNo
    const updated: Part = {
      ...parts.value[idx],
      ...deepClone(data),
      id,
      updatedAt: new Date().toISOString()
    }
    // 处理 null 值：表示清除该字段
    for (const [k, v] of Object.entries(data)) {
      if (v === null) {
        delete (updated as any)[k]
      }
    }
    await db.parts.put(deepClone(updated))
    parts.value[idx] = updated
    // 同步更新Map索引（处理图号变化的情况）
    const newDrawingNo = updated.drawingNo
    if (oldDrawingNo && oldDrawingNo !== newDrawingNo) {
      drawingNoMap.delete(oldDrawingNo)
    }
    if (newDrawingNo) {
      drawingNoMap.set(newDrawingNo, updated)
    }
  }

  /**
   * 删除零件。被任何模块 BOM 或项目下单 BOM 引用时禁止删除（抛错，由调用方提示）。
   */
  async function deletePart(id: string): Promise<void> {
    const referenced = await isPartReferenced(id)
    if (referenced) {
      throw new Error('该零件正被 BOM 条目引用，不能删除')
    }
    // 保存要删除的零件的图号，用于更新Map索引
    const partToDelete = parts.value.find((p) => p.id === id)
    await db.parts.delete(id)
    parts.value = parts.value.filter((p) => p.id !== id)
    // 同步更新Map索引
    if (partToDelete?.drawingNo) {
      drawingNoMap.delete(partToDelete.drawingNo)
    }
  }

  /**
   * 按图号 upsert：存在则更新（仅覆盖传入的非空字段），不存在则创建。
   * 图号为空/未提供时，无法去重，始终创建新零件。
   * 这是 BOM 条目同步零件库的核心方法。
   * @param libraryId 创建新零件时归入的库；不传则默认库。更新已有零件时不改变其 libraryId。
   */
  async function upsertByDrawingNo(
    partData: Partial<Part> & { drawingNo?: string },
    libraryId?: string
  ): Promise<Part> {
    const drawingNo = partData.drawingNo != null ? String(partData.drawingNo).trim() : ''

    // 有图号：尝试命中已有零件
    if (drawingNo) {
      const existing = getByDrawingNo(drawingNo)
      if (existing) {
        // 仅用传入的非空字段更新（空字段不覆盖零件库已有值）
        const merged: Record<string, any> = { ...existing }
        for (const [k, v] of Object.entries(partData)) {
          if (!isEmptyValue(v)) merged[k] = v
        }
        merged.id = existing.id
        merged.updatedAt = new Date().toISOString()
        const updated = merged as Part
        await db.parts.put(deepClone(updated))
        const idx = parts.value.findIndex((p) => p.id === existing.id)
        if (idx !== -1) parts.value[idx] = updated
        // 同步更新Map索引
        if (updated.drawingNo) {
          drawingNoMap.set(updated.drawingNo, updated)
        }
        return updated
      }
    }

    // 无图号或未命中：创建新零件
    const now = new Date().toISOString()
    const part: Part = {
      ...deepClone(partData),
      id: generateId('part'),
      drawingNo: drawingNo || undefined,
      libraryId: libraryId || (partData as Part).libraryId || DEFAULT_PART_LIBRARY_ID,
      createdAt: now,
      updatedAt: now
    }
    await db.parts.add(part)
    parts.value.push(part)
    // 同步更新Map索引
    if (part.drawingNo) {
      drawingNoMap.set(part.drawingNo, part)
    }
    return part
  }

  /**
   * 批量导入（按图号去重）。返回新增/更新/跳过计数。
   * 注意：文件内重复零件的去重由调用方（UI层）处理后传入，
   * 因此此处返回的 skipped 恒为 0，跳过数量由 UI 层统计。
   * @param targetLibraryId 目标库；item 未携带 libraryId 时归入此库，否则默认库。
   *                        更新已有零件时不改变其所属库。
   */
  async function bulkImport(
    items: Omit<Part, 'id' | 'createdAt' | 'updatedAt'>[],
    targetLibraryId?: string
  ): Promise<{ added: number; updated: number; skipped: number }> {
    const defaultLib = targetLibraryId || DEFAULT_PART_LIBRARY_ID
    let added = 0
    let updated = 0
    for (const item of items) {
      // item 未携带 libraryId 时归入目标库（或默认库）
      if (!item.libraryId) {
        item.libraryId = defaultLib
      }
      const drawingNo = item.drawingNo != null ? String(item.drawingNo).trim() : ''
      if (drawingNo && getByDrawingNo(drawingNo)) {
        await upsertByDrawingNo(item)
        updated++
      } else {
        await upsertByDrawingNo(item)
        added++
      }
    }
    return { added, updated, skipped: 0 }
  }

  /**
   * 快速批量导入（大数据量优化版）。
   * 适用于8万条以上的大批量导入，使用bulkPut批量写入，性能提升10-100倍。
   * 注意：调用方需提前完成数据校验和冲突检测，此方法不做逐条校验。
   * @param toCreate 要新增的零件数据（已校验无冲突）
   * @param toUpdate 要更新的零件数据，格式为 { item, existingId }
   * @param targetLibraryId 目标库；toCreate 中未携带 libraryId 的零件归入此库，否则默认库。
   *                        更新已有零件时不改变其所属库。
   * @returns 新增和更新的数量
   */
  async function bulkImportFast(
    toCreate: Omit<Part, 'id' | 'createdAt' | 'updatedAt'>[],
    toUpdate: { item: Partial<Part>; existingId: string }[],
    targetLibraryId?: string
  ): Promise<{ added: number; updated: number }> {
    const now = new Date().toISOString()
    const defaultLib = targetLibraryId || DEFAULT_PART_LIBRARY_ID

    // 1. 准备新增数据（生成id、时间戳，不做deepClone）
    const partsToCreate: Part[] = toCreate.map((item, index) => ({
      ...item,
      libraryId: item.libraryId || defaultLib,
      id: `part_${Date.now()}_${index}_${Math.random().toString(36).slice(2, 8)}`,
      createdAt: now,
      updatedAt: now
    }))

    // 2. 准备更新数据（合并已有数据，更新时间戳）
    const partsToUpdate: Part[] = []
    for (const { item, existingId } of toUpdate) {
      const existing = parts.value.find((p) => p.id === existingId)
      if (existing) {
        const updated: Part = {
          ...existing,
          ...item,
          id: existingId,
          updatedAt: now
        }
        // 处理 null 值：表示清除该字段
        for (const [k, v] of Object.entries(item)) {
          if (v === null) {
            delete (updated as any)[k]
          }
        }
        partsToUpdate.push(updated)
      }
    }

    // 3. 批量写入数据库（一次bulkPut操作，性能关键）
    const allParts = [...partsToCreate, ...partsToUpdate]
    if (allParts.length > 0) {
      await db.parts.bulkPut(allParts)
    }

    // 4. 批量更新内存数组（导入完成后一次性更新，避免逐条push）
    if (partsToCreate.length > 0) {
      parts.value.push(...partsToCreate)
    }
    for (const updated of partsToUpdate) {
      const idx = parts.value.findIndex((p) => p.id === updated.id)
      if (idx !== -1) {
        parts.value[idx] = updated
      }
    }

    // 5. 批量更新Map索引（一次性更新，避免逐条set）
    for (const part of allParts) {
      if (part.drawingNo) {
        drawingNoMap.set(part.drawingNo, part)
      }
    }

    return {
      added: partsToCreate.length,
      updated: partsToUpdate.length
    }
  }

  /** 查询零件被哪些模块/项目引用 */
  async function getPartReferences(partId: string): Promise<{ moduleIds: string[]; projectIds: string[] }> {
    const moduleItems = await db.bomItems.where('partId').equals(partId).toArray()
    const orderItems = await db.orderBomItems.where('partId').equals(partId).toArray()
    const moduleIds = Array.from(new Set(moduleItems.map((i) => (i as any).moduleId).filter(Boolean))) as string[]
    const projectIds = Array.from(new Set(orderItems.map((i) => (i as any).projectId).filter(Boolean))) as string[]
    return { moduleIds, projectIds }
  }

  async function isPartReferenced(partId: string): Promise<boolean> {
    const modCount = await db.bomItems.where('partId').equals(partId).count()
    if (modCount > 0) return true
    const projCount = await db.orderBomItems.where('partId').equals(partId).count()
    return projCount > 0
  }

  /**
   * 重新同步零件库：
   * 1. 清空现有零件库
   * 2. 遍历所有 BOM 条目（排除 isModuleItem 组件/子组件条目）
   * 3. 按图号去重提取零件参数
   * 4. 回填 partId
   */
  async function resyncPartsLibrary(): Promise<{ createdParts: number; linkedItems: number }> {
    const now = new Date().toISOString()
    const drawingNoToPartId = new Map<string, string>()
    let createdParts = 0
    let linkedItems = 0

    // 清空现有零件库
    await db.parts.clear()
    parts.value = []

    /**
     * 处理一条 BOM 记录：
     * - isModuleItem 为 true 的组件/子组件条目不进零件库
     * - 有图号且非空：按图号复用/创建零件，回填 partId
     * - 图号为空：为该条目独立创建一个零件（无法去重）
     */
    async function processRecord(record: Record<string, any>): Promise<void> {
      // 组件和子组件条目不进零件库
      if (record.isModuleItem) {
        record.partId = undefined
        return
      }

      const drawingNo = record.drawingNo != null ? String(record.drawingNo).trim() : ''
      const partParams = extractPartParams(record)

      // 把 BOM 条目的 type 字段映射为零件的 partType 字段
      // BOM type: assembly(装配) / order(下单) / both(两者)
      // 零件 partType: assembly(模型零件) / order(下单零件) / both(两者)
      if (record.type && !partParams.partType) {
        partParams.partType = record.type as 'order' | 'assembly' | 'both'
      }

      let partId: string | undefined
      if (drawingNo) {
        partId = drawingNoToPartId.get(drawingNo)
        if (!partId) {
          const part: Part = {
            ...partParams,
            id: `part_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
            drawingNo,
            libraryId: DEFAULT_PART_LIBRARY_ID,
            createdAt: now,
            updatedAt: now
          }
          await db.parts.add(part)
          drawingNoToPartId.set(drawingNo, part.id)
          partId = part.id
          createdParts++
        }
      } else {
        // 空图号：每条独立创建一个零件
        const part: Part = {
          ...partParams,
          id: `part_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
          drawingNo: undefined,
          libraryId: DEFAULT_PART_LIBRARY_ID,
          createdAt: now,
          updatedAt: now
        }
        await db.parts.add(part)
        partId = part.id
        createdParts++
      }

      record.partId = partId
      linkedItems++
    }

    // 1) 遍历模块 BOM 条目
    const bomItems = await db.bomItems.toArray()
    for (const item of bomItems) {
      await processRecord(item as Record<string, any>)
    }
    if (bomItems.length > 0) {
      await db.bomItems.bulkPut(bomItems)
    }

    // 2) 遍历项目下单 BOM 条目
    const orderItems = await db.orderBomItems.toArray()
    for (const item of orderItems) {
      await processRecord(item as Record<string, any>)
    }
    if (orderItems.length > 0) {
      await db.orderBomItems.bulkPut(orderItems)
    }

    // 重新加载零件库到内存
    parts.value = await db.parts.toArray()
    // 重建Map索引
    rebuildDrawingNoMap()

    console.log(
      `[零件库重新同步] 完成：新建零件 ${createdParts} 个，回填 partId 的 BOM 条目 ${linkedItems} 条`
    )

    return { createdParts, linkedItems }
  }

  /**
   * 分页查询零件（按需加载，不经过内存全量数组）。
   * @param page 页码（从1开始）
   * @param pageSize 每页条数
   * @param options.keyword 关键词模糊搜索（图号/中文描述/英文描述/物料目录号）
   * @param options.category 零件分类精确过滤
   * @param options.libraryIds 库过滤；传入且非空时只查这些库下的零件，不传/空数组查所有库
   */
  async function getPartsPage(
    page: number,
    pageSize: number,
    options?: {
      keyword?: string
      category?: string
      sortField?: string
      sortOrder?: 'asc' | 'desc'
      libraryIds?: string[]
    }
  ): Promise<{ items: Part[]; total: number }> {
    const offset = (page - 1) * pageSize
    const sortField = options?.sortField || 'updatedAt'
    const sortOrder = options?.sortOrder || 'desc'

    // 数字类型字段可以直接用Dexie的orderBy排序（性能好）
    // 字符串类型字段需要在客户端自然排序（否则"10"会排在"2"前面）
    const numericFields = ['updatedAt', 'createdAt', 'totalAmount', 'spareParts']
    const isNumericSort = numericFields.includes(sortField)

    function buildCollection(): Collection<Part, string, Part> {
      let collection: Collection<Part, string, Part> = db.parts as any

      // 数字类型字段使用Dexie的orderBy排序
      if (isNumericSort) {
        collection = db.parts.orderBy(sortField) as any
        if (sortOrder === 'desc') {
          collection = collection.reverse()
        }
      }

      if (options?.category) {
        collection = collection.filter((p: Part) => p.partCategory === options.category)
      }

      // 库过滤：传入且非空时只保留指定库下的零件
      if (options?.libraryIds && options.libraryIds.length > 0) {
        const libSet = new Set(options.libraryIds)
        collection = collection.filter((p: Part) => libSet.has(p.libraryId))
      }

      const kw = options?.keyword?.trim().toLowerCase()
      if (kw) {
        collection = collection.filter((p: Part) =>
          (p.drawingNo || '').toLowerCase().includes(kw) ||
          (p.chineseDescription || '').toLowerCase().includes(kw) ||
          (p.englishDescription || '').toLowerCase().includes(kw) ||
          (p.materialCatalogNo || '').toLowerCase().includes(kw)
        )
      }

      return collection
    }

    const total = await buildCollection().count()

    let items: Part[]
    if (isNumericSort) {
      // 数字类型字段：直接分页查询
      items = await buildCollection().offset(offset).limit(pageSize).toArray()
    } else {
      // 字符串类型字段：获取全量数据，在客户端自然排序后分页
      // 这样可以保证"2"排在"10"前面
      const allItems = await buildCollection().toArray()
      allItems.sort((a, b) => {
        const valA = a[sortField as keyof Part]
        const valB = b[sortField as keyof Part]
        // 空值始终排在最后（不管升序还是降序），这样更直观
        const isEmptyA = valA === undefined || valA === null || valA === ''
        const isEmptyB = valB === undefined || valB === null || valB === ''
        if (isEmptyA && isEmptyB) return 0
        if (isEmptyA) return 1
        if (isEmptyB) return -1
        const strA = String(valA)
        const strB = String(valB)
        // 自然排序：正确处理包含数字的字符串，支持中文
        const cmp = strA.localeCompare(strB, 'zh-CN', { numeric: true, sensitivity: 'base' })
        return sortOrder === 'asc' ? cmp : -cmp
      })
      items = allItems.slice(offset, offset + pageSize)
    }

    return { items, total }
  }

  /** 获取零件库总条数 */
  async function getTotalCount(): Promise<number> {
    return db.parts.count()
  }

  /**
   * 批量移动零件到指定库（更新 libraryId）。
   * 同步更新数据库和内存数组，返回成功移动的零件数量。
   */
  async function movePartsToLibrary(
    partIds: string[],
    targetLibraryId: string
  ): Promise<number> {
    if (!partIds || partIds.length === 0) return 0
    const idSet = new Set(partIds)
    const targets = parts.value.filter((p) => idSet.has(p.id))
    if (targets.length === 0) return 0

    const now = new Date().toISOString()
    for (const p of targets) {
      p.libraryId = targetLibraryId
      p.updatedAt = now
    }
    await db.parts.bulkPut(targets.map((p) => deepClone(p)))
    return targets.length
  }

  return {
    parts,
    initialize,
    getAll,
    getById,
    getByDrawingNo,
    search,
    addPart,
    updatePart,
    deletePart,
    upsertByDrawingNo,
    bulkImport,
    bulkImportFast,
    detectPartConflict,
    detectPartConflictsBatch,
    getPartReferences,
    isPartReferenced,
    resyncPartsLibrary,
    getPartsPage,
    getTotalCount,
    movePartsToLibrary
  }
})
