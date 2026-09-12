import { defineStore } from 'pinia'
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import Dexie from 'dexie'
import type { Module, BomItem } from '@/types'
import { db } from '@/db/index'
import { generateId, deepClone } from '@/utils/storage'
import { getDescendantModuleIds, getReferencingModuleIds } from '@/utils/moduleGraph'
import { useEquipmentStore } from '@/stores/equipment'
import { useProjectsStore } from '@/stores/projects'
import { usePartsStore, extractPartParams, extractBomFields } from '@/stores/parts'

/** 子组件处理模式：promote=提升为顶层（推荐）；cascade=递归删除整个子树 */
export type ModuleChildMode = 'promote' | 'cascade'

export interface ModuleReferencesInfo {
  childCount: number
  childNames: string[]
  referencedByConfigCount: number
  referencedByConfigNames: string[]
  referencedByProjectCount: number
  referencedByProjectNames: string[]
  bomItemCount: number
}

export const useModulesStore = defineStore('modules', () => {
  const modules = ref<Module[]>([])

  async function initialize() {
    modules.value = await db.modules.toArray()
  }

  // ===== 模块CRUD =====
  // addModule 保持同步返回（视图兼容），DB写入为fire-and-forget
  function addModule(data: Omit<Module, 'id' | 'createdAt' | 'updatedAt' | 'changeHistory' | 'bom'> & { bomItems?: BomItem[] }, remark?: string) {
    const item = {
      ...data,
      id: generateId('mod'),
      childModuleIds: data.childModuleIds || [],
      configurationIds: data.configurationIds || [],
      tags: data.tags || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      changeHistory: [{ id: generateId('ch'), targetType: 'module', targetId: '', operation: '创建', detail: `创建组件${data.nameZh}`, operator: 'admin', timestamp: new Date().toISOString(), remark: remark || '' }]
    } as Module
    item.changeHistory![0].targetId = item.id
    modules.value.push(item)

    // 更新所有父模块的childModuleIds（支持多父模块）
    const parentIds = data.parentModuleIds || []
    for (const parentId of parentIds) {
      const parent = getModuleById(parentId)
      if (parent && !parent.childModuleIds.includes(item.id)) {
        parent.childModuleIds.push(item.id)
        db.modules.put(deepClone(parent)).catch(console.error)
      }
    }

    // 更新设备配置的moduleIds（fire-and-forget，确保双向关联）
    const cfgIds = data.configurationIds || []
    if (cfgIds.length > 0) {
      const equipmentStore = useEquipmentStore()
      for (const cfgId of cfgIds) {
        const cfg = equipmentStore.configurations.find((c) => c.id === cfgId)
        if (cfg && Array.isArray(cfg.moduleIds) && !cfg.moduleIds.includes(item.id)) {
          cfg.moduleIds.push(item.id)
          db.configurations.put(deepClone(cfg)).catch(console.error)
        }
      }
    }

    // fire-and-forget DB写入，失败时回滚内存
    db.modules.add(deepClone(item)).catch((err) => {
      console.error('addModule DB error:', err)
      const idx = modules.value.findIndex((m) => m.id === item.id)
      if (idx !== -1) modules.value.splice(idx, 1)
      ElMessage.error('保存组件失败，请重试')
    })
    return item
  }

  async function updateModule(id: string, data: Partial<Module>, remark?: string) {
    const idx = modules.value.findIndex((m) => m.id === id)
    if (idx !== -1) {
      const original = modules.value[idx]
      // 记录基本信息字段的变更前后值（用于 diff 与回滚）
      const BASIC_FIELDS = ['drawingNo', 'nameZh', 'nameEn', 'remark', 'equipmentId']
      const beforeBasic: Record<string, any> = {}
      const afterBasic: Record<string, any> = {}
      const changedFields: string[] = []
      for (const f of BASIC_FIELDS) {
        if (f in data) {
          beforeBasic[f] = (original as any)[f]
          afterBasic[f] = (data as any)[f]
          if (String((original as any)[f] ?? '') !== String((data as any)[f] ?? '')) {
            changedFields.push(f)
          }
        }
      }
      const hasBasicChange = changedFields.length > 0
      const updated: Module = {
        ...original,
        ...data,
        updatedAt: new Date().toISOString(),
        changeHistory: hasBasicChange
          ? [
              ...(original.changeHistory || []),
              {
                id: generateId('ch'),
                targetType: 'module',
                targetId: id,
                operation: '更新',
                detail: `更新组件信息（${changedFields.join('、')}）`,
                operator: 'admin',
                timestamp: new Date().toISOString(),
                remark: remark || '',
                beforeData: beforeBasic,
                afterData: afterBasic
              }
            ]
          : (original.changeHistory || [])
      }
      await db.modules.put(deepClone(updated))
      modules.value[idx] = updated

      // 如果配置关联发生变更，更新设备配置的moduleIds（双向关联）
      if (data.configurationIds !== undefined) {
        const oldCfgIds = original.configurationIds || []
        const newCfgIds = data.configurationIds || []
        const equipmentStore = useEquipmentStore()

        // 从移除的配置中删除该模块ID
        for (const cfgId of oldCfgIds) {
          if (!newCfgIds.includes(cfgId)) {
            const cfg = equipmentStore.configurations.find((c) => c.id === cfgId)
            if (cfg && Array.isArray(cfg.moduleIds) && cfg.moduleIds.includes(id)) {
              cfg.moduleIds = cfg.moduleIds.filter((mid) => mid !== id)
              db.configurations.put(deepClone(cfg)).catch(console.error)
            }
          }
        }

        // 向新增的配置中添加该模块ID
        for (const cfgId of newCfgIds) {
          if (!oldCfgIds.includes(cfgId)) {
            const cfg = equipmentStore.configurations.find((c) => c.id === cfgId)
            if (cfg && Array.isArray(cfg.moduleIds) && !cfg.moduleIds.includes(id)) {
              cfg.moduleIds.push(id)
              db.configurations.put(deepClone(cfg)).catch(console.error)
            }
          }
        }
      }
    }
  }

  /**
   * 循环检测：判断将 childId 的父模块设为 newParentId 是否会形成循环引用
   * 原理：若 childId 是 newParentId 的祖先（沿 parentModuleIds 向上可追溯到 childId），
   * 则把 newParentId 设为 childId 的父模块会形成循环。支持多父模块。
   */
  function wouldCreateCycle(childId: string, newParentId: string | null | undefined): boolean {
    if (!newParentId) return false
    if (newParentId === childId) return true // 不能设为自己的父模块
    // childId 在 newParentId 的祖先链中 → 成环
    return getReferencingModuleIds(newParentId, modules.value).includes(childId)
  }

  /**
   * 递归获取模块的所有后代ID
   */
  function getAllDescendantIds(rootId: string): Set<string> {
    return new Set(getDescendantModuleIds(rootId, modules.value))
  }

  /**
   * 统计指定组件的关联引用
   * 异步，因为需要统计 BOM 条目数量
   */
  async function getModuleReferences(id: string): Promise<ModuleReferencesInfo> {
    const mod = getModuleById(id)
    const equipmentStore = useEquipmentStore()
    const projectsStore = useProjectsStore()

    const childModules = (mod?.childModuleIds || [])
      .map((cid) => getModuleById(cid))
      .filter((m): m is Module => m !== undefined)

    const refCfgs = equipmentStore.configurations.filter(
      (c) => Array.isArray(c.moduleIds) && c.moduleIds.includes(id)
    )
    const refProjects = projectsStore.projects.filter(
      (p) => Array.isArray(p.selectedModules) && p.selectedModules.some((s) => s.moduleId === id)
    )
    const bomItemCount = await db.bomItems.where('moduleId').equals(id).count()

    return {
      childCount: childModules.length,
      childNames: childModules.map((m) => m.nameZh || m.drawingNo),
      referencedByConfigCount: refCfgs.length,
      referencedByConfigNames: refCfgs.map((c) => c.name),
      referencedByProjectCount: refProjects.length,
      referencedByProjectNames: refProjects.map((p) => p.name || p.jobNo),
      bomItemCount
    }
  }

  /**
   * 删除组件
   * @param id 组件ID
   * @param options.strategy 子组件处理方式：promote=提升为顶层（有子组件时默认）；cascade=递归删除整个子树
   * @param options.forceRef 被设备配置/项目引用时是否强制删除（引用处保留已失效的 id，显示"已删除"）
   */
  async function deleteModule(
    id: string,
    options?: { strategy?: 'promote' | 'cascade'; forceRef?: boolean }
  ) {
    const mod = getModuleById(id)
    if (!mod) return

    const hasChildren = mod.childModuleIds && mod.childModuleIds.length > 0
    const strategy = options?.strategy || (hasChildren ? 'promote' : 'cascade')

    if (hasChildren) {
      if (strategy === 'promote') {
        // 子组件提升为顶层：从所有父模块中移除该子组件
        for (const childId of mod.childModuleIds) {
          const child = getModuleById(childId)
          if (child) {
            child.parentModuleIds = (child.parentModuleIds || []).filter(pid => pid !== id)
            await db.modules.put(deepClone(child))
          }
        }
      } else if (strategy === 'cascade') {
        // 一并删除子组件（递归删除整个子树及其BOM）
        const descendantIds = getAllDescendantIds(id)
        for (const descId of descendantIds) {
          await db.modules.delete(descId)
          await db.bomItems.where('moduleId').equals(descId).delete()
        }
        modules.value = modules.value.filter((m) => !descendantIds.has(m.id))
      }
    }

    // 从所有父模块移除（支持多父模块）
    const parentIds = mod.parentModuleIds || []
    for (const parentId of parentIds) {
      const parent = getModuleById(parentId)
      if (parent) {
        parent.childModuleIds = parent.childModuleIds.filter((cid) => cid !== id)
        await db.modules.put(deepClone(parent))
      }
    }
    // 删除模块及其BOM条目
    await db.modules.delete(id)
    await db.bomItems.where('moduleId').equals(id).delete()
    modules.value = modules.value.filter((m) => m.id !== id)

    // 清理设备配置中对该组件的引用
    const equipmentStore = useEquipmentStore()
    for (const cfg of equipmentStore.configurations) {
      if (Array.isArray(cfg.moduleIds) && cfg.moduleIds.includes(id)) {
        cfg.moduleIds = cfg.moduleIds.filter((mid) => mid !== id)
        await db.configurations.put(deepClone(cfg))
      }
    }
    // 清理项目中对该组件的引用
    const projectsStore = useProjectsStore()
    for (const p of projectsStore.projects) {
      let dirty = false
      if (Array.isArray(p.selectedModules)) {
        const filtered = p.selectedModules.filter((s) => s.moduleId !== id)
        if (filtered.length !== p.selectedModules.length) {
          p.selectedModules = filtered
          dirty = true
        }
      }
      if (dirty) {
        await db.projects.put(deepClone(p))
      }
    }
    // forceRef 仅用于语义标识：被引用时引用处 id 保留不动（显示"已删除"），由调用方对话框控制是否传入
    void options?.forceRef
  }

  /**
   * 层级移动：将模块移动到新父模块下，或提升为顶层
   * newParentId 为 null 时提升为顶层
   * 支持多父模块：可以添加/移除父模块关系
   */
  async function moveModule(moduleId: string, newParentId: string | null) {
    const mod = getModuleById(moduleId)
    if (!mod) return
    if (newParentId && wouldCreateCycle(moduleId, newParentId)) {
      throw new Error('不能将组件设置为自己的后代组件的子组件')
    }
    // 确保parentModuleIds存在
    if (!mod.parentModuleIds) {
      mod.parentModuleIds = []
    }
    
    if (newParentId) {
      // 添加新父模块关系（如果不存在）
      if (!mod.parentModuleIds.includes(newParentId)) {
        mod.parentModuleIds.push(newParentId)
        const newParent = getModuleById(newParentId)
        if (newParent && !newParent.childModuleIds.includes(moduleId)) {
          newParent.childModuleIds.push(moduleId)
          await db.modules.put(deepClone(newParent))
        }
      }
    } else {
      // 提升为顶层：清空所有父模块关系
      const oldParentIds = [...mod.parentModuleIds]
      mod.parentModuleIds = []
      for (const oldParentId of oldParentIds) {
        const oldParent = getModuleById(oldParentId)
        if (oldParent) {
          oldParent.childModuleIds = oldParent.childModuleIds.filter((cid) => cid !== moduleId)
          await db.modules.put(deepClone(oldParent))
        }
      }
    }
    await db.modules.put(deepClone(mod))
  }

  // copyModule 保持同步返回（视图兼容），DB写入为fire-and-forget
  // options.copyChildren: 是否递归复制整个子树（默认 false，子组件不一起复制）
  function copyModule(id: string, options?: { copyChildren?: boolean }): Module | undefined {
    const mod = getModuleById(id)
    if (!mod) return undefined
    const copyChildren = options?.copyChildren || false

    // 生成唯一图号后缀（-COPY-1, -COPY-2 ...）
    let suffix = 1
    let baseDrawingNo = mod.drawingNo || 'MOD'
    // 去掉已有的 -COPY-N 后缀再追加新后缀
    baseDrawingNo = baseDrawingNo.replace(/-COPY-\d+$/, '')
    let newDrawingNo = `${baseDrawingNo}-COPY-${suffix}`
    while (!isDrawingNoUnique(newDrawingNo)) {
      suffix++
      newDrawingNo = `${baseDrawingNo}-COPY-${suffix}`
    }

    const copy = JSON.parse(JSON.stringify(mod)) as Module
    copy.id = generateId('mod')
    copy.drawingNo = newDrawingNo
    copy.nameZh = `${mod.nameZh} 副本`
    copy.parentModuleIds = [] // 复制后的组件默认提升为顶层
    copy.createdAt = new Date().toISOString()
    copy.updatedAt = new Date().toISOString()
    copy.changeHistory = []

    // 如果不复制子组件，清空 childModuleIds；如果复制，后续递归处理
    if (!copyChildren) {
      copy.childModuleIds = []
    }
    modules.value.push(copy)

    // fire-and-forget: 写入模块及复制BOM条目（BOM source 标记为 copy）
    const copiedChildIdMap = new Map<string, string>() // 原childId -> 新childId

    ;(async () => {
      try {
        await db.modules.add(deepClone(copy))
        // 复制BOM条目，source 标记为 'copy'
        const bomItems = await db.bomItems.where('moduleId').equals(id).toArray()
        if (bomItems.length > 0) {
          await db.bomItems.bulkAdd(
            bomItems.map((i) => deepClone({
              ...i,
              id: generateId('bi'),
              moduleId: copy.id,
              source: 'copy' as const
            }))
          )
        }

        // 递归复制子组件
        if (copyChildren && mod.childModuleIds.length > 0) {
          for (const childId of mod.childModuleIds) {
            const childCopy = copyModuleRecursive(childId, copy.id, copiedChildIdMap)
            if (childCopy) {
              copy.childModuleIds.push(childCopy.id)
            }
          }
          await db.modules.put(deepClone(copy))
        }
      } catch (e) {
        console.error('copyModule DB error:', e)
      }
    })()

    return copy
  }

  /**
   * 递归复制子组件（内部使用）
   */
  function copyModuleRecursive(
    sourceChildId: string,
    newParentId: string,
    idMap: Map<string, string>,
    visited: Set<string> = new Set()
  ): Module | undefined {
    if (visited.has(sourceChildId)) return undefined // 防止循环引用导致无限递归
    visited.add(sourceChildId)
    const child = getModuleById(sourceChildId)
    if (!child) return undefined
    const childCopy = JSON.parse(JSON.stringify(child)) as Module
    childCopy.id = generateId('mod')
    childCopy.parentModuleIds = [newParentId]
    // 图号加副本后缀（避免重复）
    let suffix = 1
    const baseDrawingNo = (child.drawingNo || 'MOD').replace(/-COPY-\d+$/, '')
    let newDrawingNo = `${baseDrawingNo}-COPY-${suffix}`
    while (!isDrawingNoUnique(newDrawingNo)) {
      suffix++
      newDrawingNo = `${baseDrawingNo}-COPY-${suffix}`
    }
    childCopy.drawingNo = newDrawingNo
    childCopy.nameZh = `${child.nameZh} 副本`
    childCopy.createdAt = new Date().toISOString()
    childCopy.updatedAt = new Date().toISOString()
    childCopy.changeHistory = []
    childCopy.childModuleIds = []
    idMap.set(sourceChildId, childCopy.id)
    modules.value.push(childCopy)

    // fire-and-forget DB 写入
    ;(async () => {
      try {
        await db.modules.add(deepClone(childCopy))
        const bomItems = await db.bomItems.where('moduleId').equals(sourceChildId).toArray()
        if (bomItems.length > 0) {
          await db.bomItems.bulkAdd(
            bomItems.map((i) => deepClone({
              ...i,
              id: generateId('bi'),
              moduleId: childCopy.id,
              source: 'copy' as const
            }))
          )
        }
        // 递归复制孙组件
        for (const grandchildId of child.childModuleIds) {
          const gcCopy = copyModuleRecursive(grandchildId, childCopy.id, idMap, new Set(visited))
          if (gcCopy) {
            childCopy.childModuleIds.push(gcCopy.id)
          }
        }
        if (child.childModuleIds.length > 0) {
          await db.modules.put(deepClone(childCopy))
        }
      } catch (e) {
        console.error('copyModuleRecursive DB error:', e)
      }
    })()

    return childCopy
  }

  function getModuleById(id: string): Module | undefined {
    return modules.value.find((m) => m.id === id)
  }

  function getModulesByEquipment(equipmentId: string): Module[] {
    return modules.value.filter((m) => m.equipmentId === equipmentId)
  }

  function getModulesByConfiguration(configurationId: string): Module[] {
    return modules.value.filter((m) => m.configurationIds.includes(configurationId))
  }

  function getChildModules(moduleId: string): Module[] {
    const mod = getModuleById(moduleId)
    if (!mod || !mod.childModuleIds) return []
    return mod.childModuleIds.map((cid) => getModuleById(cid)).filter((m): m is Module => m !== undefined)
  }

  async function addChangeHistory(
    targetId: string,
    operation: string,
    detail: string,
    extra?: { beforeData?: any; afterData?: any; remark?: string }
  ) {
    const mod = getModuleById(targetId)
    if (mod) {
      if (!mod.changeHistory) mod.changeHistory = []
      mod.changeHistory.push({
        id: generateId('ch'),
        targetType: 'module',
        targetId,
        operation,
        detail,
        operator: 'admin',
        timestamp: new Date().toISOString(),
        remark: extra?.remark || '',
        beforeData: extra?.beforeData,
        afterData: extra?.afterData
      })
      await db.modules.put(deepClone(mod))
    }
  }

  // ===== BOM条目管理（独立存储，按需查询） =====
  /**
   * 将 DB 中的 BOM 条目与零件库实时关联，返回合并后的完整 BomItem。
   * - 有 partId：零件参数以零件库为准（BOM 表只存 partId + BOM 特有字段）
   * - 无 partId（旧数据/种子数据）：直接返回原条目（参数挂在条目上）
   */
  function mergeWithPart<T extends BomItem & { moduleId?: string; projectId?: string }>(item: T): T {
    if (!item.partId) return item
    const partsStore = usePartsStore()
    const part = partsStore.getById(item.partId)
    if (!part) return item
    // 零件参数覆盖到条目上（零件库为物料主数据唯一来源）
    const partFields = extractPartParams(part)
    return { ...item, ...partFields }
  }

  function mergeListWithParts<T extends BomItem & { moduleId?: string; projectId?: string }>(items: T[]): T[] {
    return items.map((i) => mergeWithPart(i))
  }

  async function getBomItems(moduleId: string): Promise<BomItem[]> {
    const items = await db.bomItems.where('moduleId').equals(moduleId).sortBy('sortOrder')
    return mergeListWithParts(items)
  }

  async function getBomItemsPage(
    moduleId: string,
    page: number,
    pageSize: number,
    searchKeyword?: string
  ): Promise<{ items: BomItem[]; total: number }> {
    const start = (page - 1) * pageSize
    const kw = searchKeyword?.trim().toLowerCase()

    // 无搜索关键词：利用复合索引 [moduleId+sortOrder] 做真正的分页查询，
    // 只取当前页数据，避免全量加载该模块下所有 BOM 条目到内存
    if (!kw) {
      const total = await db.bomItems.where('moduleId').equals(moduleId).count()
      const rawItems = await db.bomItems
        .where('[moduleId+sortOrder]')
        .between([moduleId, Dexie.minKey], [moduleId, Dexie.maxKey], true, true)
        .offset(start)
        .limit(pageSize)
        .toArray()
      return { items: mergeListWithParts(rawItems), total }
    }

    // 有搜索关键词：先按 moduleId 缩小范围，关联零件参数后再前端过滤、分页
    // （零件库为参数来源，新 BOM 条目本身不冗余存零件参数，必须先合并再搜）
    const allRaw = await db.bomItems.where('moduleId').equals(moduleId).sortBy('sortOrder')
    const all = mergeListWithParts(allRaw)
    const items = all.filter(
      (i) =>
        (i.drawingNo || '').toLowerCase().includes(kw) ||
        (i.materialCatalogNo || '').toLowerCase().includes(kw) ||
        (i.chineseDescription || '').toLowerCase().includes(kw) ||
        (i.englishDescription || '').toLowerCase().includes(kw) ||
        (i.jobNo || '').toLowerCase().includes(kw) ||
        (i.reserved1 || '').toLowerCase().includes(kw) ||
        (i.reserved2 || '').toLowerCase().includes(kw) ||
        (i.remarks || '').toLowerCase().includes(kw)
    )
    const total = items.length
    return { items: items.slice(start, start + pageSize), total }
  }

  async function addBomItem(moduleId: string, item: Omit<BomItem, 'id'>) {
    const partsStore = usePartsStore()
    // 组件/子组件条目不进零件库
    const isModuleItem = (item as any).isModuleItem === true

    if (isModuleItem) {
      // 组件/子组件条目：保存完整数据（包括零件参数如图号、中文描述等），不通过partId关联
      const newItem = deepClone({
        ...item,
        id: generateId('bi'),
        moduleId,
        partId: undefined,
        isModuleItem: true
      }) as unknown as BomItem & { moduleId: string }
      await db.bomItems.add(newItem)
    } else {
      // 普通零件条目：已有 partId 直接使用；否则按图号同步零件库（不存在则创建）
      let partId = (item as any).partId as string | undefined
      if (!partId) {
        const partData = extractPartParams(item)
        // 把 BOM 条目的 type 字段映射为零件的 partType 字段
        if (item.type && !partData.partType) {
          partData.partType = item.type as 'order' | 'assembly' | 'both'
        }
        const part = await partsStore.upsertByDrawingNo(partData)
        partId = part.id
      }
      // BOM 表只存 partId + BOM 特有字段（零件参数由零件库实时关联）
      const bomFields = extractBomFields(item)
      const newItem = deepClone({
        ...bomFields,
        id: generateId('bi'),
        moduleId,
        partId,
        isModuleItem: false
      }) as unknown as BomItem & { moduleId: string }
      await db.bomItems.add(newItem)
    }
    await addChangeHistory(
      moduleId,
      '新增BOM条目',
      `新增BOM条目：${item.chineseDescription || item.materialCatalogNo || item.drawingNo || ''}`,
      { afterData: { ...item } }
    )
  }

  async function updateBomItem(moduleId: string, itemId: string, data: Partial<BomItem>) {
    const partsStore = usePartsStore()
    const original = await db.bomItems.get(itemId)
    const isModuleItem = (original as any)?.isModuleItem === true || (data as any)?.isModuleItem === true

    // 拆分：零件参数变更 → 同步零件库；BOM 特有字段变更 → 更新 BOM 表
    const partData: Record<string, any> = {}
    const bomData: Record<string, any> = {}
    for (const [k, v] of Object.entries(data)) {
      // BOM 侧字段才写 BOM 表，其余视为零件参数
      if (['quantity', 'type', 'source', 'sortOrder', 'isModuleItem'].includes(k)) {
        bomData[k] = v
        // type 字段变更时，同步更新零件的 partType 字段
        if (k === 'type' && v && !isModuleItem) {
          partData.partType = v as 'order' | 'assembly' | 'both'
        }
      } else if (k !== 'id' && k !== 'moduleId' && k !== 'partId') {
        partData[k] = v
      }
    }

    // 零件参数变更
    if (Object.keys(partData).length > 0) {
      if (isModuleItem) {
        // 组件/子组件条目：不关联零件库，零件参数直接更新到BOM条目
        await db.bomItems.update(itemId, deepClone(partData))
      } else {
        // 普通零件条目：通过 partId 更新对应零件
        let partId = original?.partId
        if (partId) {
          await partsStore.updatePart(partId, partData)
        } else {
          // 旧数据无 partId：补齐零件库关联
          const mergedPartData = { ...(original ? extractPartParams(original) : {}), ...partData }
          const part = await partsStore.upsertByDrawingNo(mergedPartData)
          partId = part.id
          await db.bomItems.update(itemId, { partId })
        }
      }
    }
    // BOM 特有字段变更
    if (Object.keys(bomData).length > 0) {
      await db.bomItems.update(itemId, deepClone(bomData))
    }

    if (original) {
      await addChangeHistory(
        moduleId,
        '更新BOM条目',
        `修改BOM条目：${original.chineseDescription || original.materialCatalogNo || original.drawingNo || ''}`,
        { beforeData: { ...original }, afterData: { ...original, ...data } }
      )
    } else {
      await addChangeHistory(moduleId, '更新BOM条目', '更新BOM条目')
    }
  }

  async function deleteBomItem(moduleId: string, itemId: string) {
    const item = await db.bomItems.get(itemId)
    await db.bomItems.delete(itemId)
    // 注意：只删除 BOM 条目，不删除零件库中的零件（零件可能被其他条目引用）
    if (item) {
      await addChangeHistory(
        moduleId,
        '删除BOM条目',
        `删除BOM条目：${item.chineseDescription || item.materialCatalogNo || item.drawingNo || ''}`,
        { beforeData: { ...item } }
      )
    }
  }

  async function importBomItems(moduleId: string, items: Omit<BomItem, 'id'>[]) {
    const partsStore = usePartsStore()
    const newItems: (BomItem & { moduleId: string })[] = []
    for (const item of items) {
      // 同步零件库
      let partId = (item as any).partId as string | undefined
      if (!partId) {
        const partData = extractPartParams(item)
        const part = await partsStore.upsertByDrawingNo(partData)
        partId = part.id
      }
      // BOM 表只存 partId + BOM 特有字段
      const bomFields = extractBomFields(item)
      newItems.push(deepClone({
        ...bomFields,
        id: generateId('bi'),
        source: 'import' as const,
        moduleId,
        partId
      }) as BomItem & { moduleId: string })
    }
    await db.bomItems.bulkAdd(newItems)
    await addChangeHistory(moduleId, '导入BOM条目', `导入${items.length}条BOM条目`)
  }

  /**
   * 整体替换某模块的 BOM 条目（先清空该 moduleId 下所有条目，再写入传入条目）。
   * 用于版本回滚等需要用快照数据原样覆盖的场景；条目自带 id，按 id upsert。
   */
  async function saveBomItems(moduleId: string, items: BomItem[]) {
    await db.bomItems.where('moduleId').equals(moduleId).delete()
    if (items.length > 0) {
      await db.bomItems.bulkPut(
        items.map((i) => deepClone({ ...i, moduleId }))
      )
    }
  }

  /**
   * 按物料编码(materialCatalogNo)全局查询模块 BOM 条目（跨模块追溯用）。
   * 返回原始 DB 条目（不与零件库合并），与直接 db 查询语义一致。
   */
  async function searchBomItemsByMaterialCatalogNo(materialCatalogNo: string): Promise<BomItem[]> {
    return db.bomItems.where('materialCatalogNo').equals(materialCatalogNo).toArray()
  }

  // ===== 唯一性校验（内存中查询） =====
  function isDrawingNoUnique(drawingNo: string, excludeId?: string): boolean {
    return !modules.value.some((m) => m.drawingNo === drawingNo && m.id !== excludeId)
  }

  function isNameZhUnique(nameZh: string, excludeId?: string): boolean {
    return !modules.value.some((m) => m.nameZh === nameZh && m.id !== excludeId)
  }

  async function resetToMock() {
    await initialize()
  }

  return {
    modules,
    initialize,
    addModule,
    updateModule,
    deleteModule,
    getModuleReferences,
    copyModule,
    moveModule,
    wouldCreateCycle,
    getAllDescendantIds,
    getModuleById,
    getModulesByEquipment,
    getModulesByConfiguration,
    getChildModules,
    addChangeHistory,
    getBomItems,
    getBomItemsPage,
    addBomItem,
    updateBomItem,
    deleteBomItem,
    importBomItems,
    saveBomItems,
    searchBomItemsByMaterialCatalogNo,
    isDrawingNoUnique,
    isNameZhUnique,
    resetToMock
  }
})
