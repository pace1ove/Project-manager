import { defineStore } from 'pinia'
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import Dexie from 'dexie'
import type { Project, OrderBomItem, CustomerRequirement, SelectedModule, ChangeRecord } from '@/types'
import { db } from '@/db/index'
import { generateId, deepClone } from '@/utils/storage'
import { useEquipmentStore } from '@/stores/equipment'
import { usePartsStore, extractPartParams, extractBomFields } from '@/stores/parts'

export const useProjectsStore = defineStore('projects', () => {
  const projects = ref<Project[]>([])

  async function initialize() {
    projects.value = await db.projects.toArray()
  }

  // ===== 项目变更历史 =====
  async function addChangeHistory(
    targetId: string,
    operation: string,
    detail: string,
    extra?: { beforeData?: any; afterData?: any; remark?: string }
  ) {
    const p = getProjectById(targetId)
    if (p) {
      if (!p.changeHistory) p.changeHistory = []
      p.changeHistory.push({
        id: generateId('ch'),
        targetType: 'project',
        targetId,
        operation,
        detail,
        operator: 'admin',
        timestamp: new Date().toISOString(),
        remark: extra?.remark || '',
        beforeData: extra?.beforeData,
        afterData: extra?.afterData
      })
      await db.projects.put(deepClone(p))
    }
  }

  // ===== 项目CRUD =====
  // addProject 保持同步返回（视图兼容），DB写入为fire-and-forget
  function addProject(data: Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'changeHistory'>) {
    const { orderBom, ...projectData } = data
    const item = {
      ...projectData,
      id: generateId('prj'),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      changeHistory: [
        {
          id: generateId('ch'),
          targetType: 'project' as const,
          targetId: '',
          operation: '创建',
          detail: `创建项目 ${data.name || data.jobNo}`,
          operator: 'admin',
          timestamp: new Date().toISOString()
        }
      ]
    } as Project
    item.changeHistory![0].targetId = item.id
    projects.value.push(item)
    // fire-and-forget DB写入（deepClone 避免引用共享），失败时回滚内存
    db.projects.add(deepClone(item)).catch((err) => {
      console.error('addProject DB error:', err)
      const idx = projects.value.findIndex((p) => p.id === item.id)
      if (idx !== -1) projects.value.splice(idx, 1)
      ElMessage.error('保存项目失败，请重试')
    })
    return item
  }

  async function updateProject(id: string, data: Partial<Project>) {
    const idx = projects.value.findIndex((p) => p.id === id)
    if (idx !== -1) {
      const original = projects.value[idx]
      // 仅对基本信息字段记录 before/after（避免 BOM/组件选择等大对象刷屏）
      const BASIC_FIELDS = ['name', 'jobNo', 'customer', 'customerLocation', 'status', 'serialNumber']
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
      const updated = {
        ...original,
        ...data,
        updatedAt: new Date().toISOString()
      }
      // 基本信息有实际变化时记录一条更新历史
      if (changedFields.length > 0) {
        if (!updated.changeHistory) updated.changeHistory = []
        updated.changeHistory = [
          ...(original.changeHistory || []),
          {
            id: generateId('ch'),
            targetType: 'project',
            targetId: id,
            operation: '更新',
            detail: `更新项目信息（${changedFields.join('、')}）`,
            operator: 'admin',
            timestamp: new Date().toISOString(),
            beforeData: beforeBasic,
            afterData: afterBasic
          }
        ]
      }
      await db.projects.put(deepClone(updated))
      projects.value[idx] = updated
    }
  }

  async function deleteProject(id: string) {
    // 删除项目前，先取消该项目在所有设备上的序列号分配
    const equipmentStore = useEquipmentStore()
    const assignedSerials = equipmentStore.serials.filter(
      (s) => s.projectId === id && s.status === 'assigned'
    )
    for (const serial of assignedSerials) {
      await equipmentStore.unassignSerial(serial.id)
    }
    await db.projects.delete(id)
    await db.orderBomItems.where('projectId').equals(id).delete()
    projects.value = projects.value.filter((p) => p.id !== id)
  }

  function getProjectById(id: string): Project | undefined {
    return projects.value.find((p) => p.id === id)
  }

  function isJobNoUnique(jobNo: string, excludeId?: string): boolean {
    return !projects.value.some((p) => p.jobNo === jobNo && p.id !== excludeId)
  }

  // ===== 下单BOM管理（独立存储，按需查询） =====
  /**
   * 将 DB 中的下单 BOM 条目与零件库实时关联，返回合并后的完整 OrderBomItem。
   * - 有 partId：零件参数以零件库为准
   * - 无 partId（isModuleItem 模块条目 / 旧数据）：直接返回原条目
   */
  function mergeWithPart(item: OrderBomItem & { projectId?: string }): OrderBomItem {
    // 数据修复：type为空时设置默认值
    if (!item.type) {
      item.type = item.isModuleItem ? 'both' : 'order'
    }
    if (!item.partId) return item
    const partsStore = usePartsStore()
    const part = partsStore.getById(item.partId)
    if (!part) return item
    const partFields = extractPartParams(part)
    return { ...item, ...partFields }
  }

  function mergeListWithParts(items: (OrderBomItem & { projectId?: string })[]): OrderBomItem[] {
    return items.map((i) => mergeWithPart(i))
  }

  async function getOrderBomItems(projectId: string): Promise<OrderBomItem[]> {
    const items = await db.orderBomItems.where('projectId').equals(projectId).sortBy('sortOrder')
    return mergeListWithParts(items)
  }

  async function getOrderBomItemsPage(
    projectId: string,
    page: number,
    pageSize: number,
    searchKeyword?: string
  ): Promise<{ items: OrderBomItem[]; total: number }> {
    const start = (page - 1) * pageSize
    const kw = searchKeyword?.trim().toLowerCase()

    // 无搜索关键词：利用复合索引 [projectId+sortOrder] 做真正的分页查询
    if (!kw) {
      const total = await db.orderBomItems.where('projectId').equals(projectId).count()
      const rawItems = await db.orderBomItems
        .where('[projectId+sortOrder]')
        .between([projectId, Dexie.minKey], [projectId, Dexie.maxKey], true, true)
        .offset(start)
        .limit(pageSize)
        .toArray()
      return { items: mergeListWithParts(rawItems), total }
    }

    // 有搜索关键词：先按 projectId 缩小范围，关联零件参数后再前端过滤分页
    const allRaw = await db.orderBomItems.where('projectId').equals(projectId).sortBy('sortOrder')
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

  async function setOrderBom(projectId: string, items: OrderBomItem[]) {
    const partsStore = usePartsStore()
    const beforeCount = (await db.orderBomItems.where('projectId').equals(projectId).toArray()).length
    await db.orderBomItems.where('projectId').equals(projectId).delete()
    if (items.length > 0) {
      // 确保所有条目都有合法的 sortOrder（数字）和 projectId，避免复合索引 [projectId+sortOrder] 约束失败
      // 使用 JSON.parse(JSON.stringify()) 深度清理，移除 Vue 响应式代理、循环引用、不可序列化值
      const normalized: (OrderBomItem & { projectId: string })[] = []
      for (let idx = 0; idx < items.length; idx++) {
        const i = items[idx]
        const sortOrder = typeof i.sortOrder === 'number' && !isNaN(i.sortOrder) ? i.sortOrder : idx + 1

        if (i.isModuleItem) {
          // isModuleItem（模块本身/子组件）不是真实零件，不进零件库
          // 需要保存完整的条目数据（包括零件参数如图号、中文描述等），因为不通过partId关联
          const cleaned = JSON.parse(JSON.stringify({ ...i, projectId, sortOrder }))
          cleaned.partId = undefined
          normalized.push(cleaned)
        } else {
          // 普通零件条目：提取零件参数，upsert到零件库，获取partId
          let partId = (i as any).partId as string | undefined
          if (!partId) {
            const partData = extractPartParams(i)
            const part = await partsStore.upsertByDrawingNo(partData)
            partId = part.id
          }
          // BOM 表只存 partId + BOM 特有字段
          const bomFields = extractBomFields(i)
          const cleaned = JSON.parse(JSON.stringify({ ...bomFields, projectId, sortOrder }))
          if (partId) cleaned.partId = partId
          normalized.push(cleaned)
        }
      }
      await db.orderBomItems.bulkPut(normalized)
    }
    await addChangeHistory(
      projectId,
      items.length > 0 ? '生成下单BOM' : '清空下单BOM',
      `下单BOM ${beforeCount} 条 → ${items.length} 条`
    )
  }

  async function addOrderBomItem(projectId: string, item: Omit<OrderBomItem, 'id'>) {
    const partsStore = usePartsStore()
    if (item.isModuleItem) {
      // isModuleItem（模块本身/子组件）不是真实零件，不进零件库
      // 需要保存完整的条目数据（包括零件参数如图号、中文描述等）
      const newItem = deepClone({ ...item, id: generateId('ob'), projectId }) as OrderBomItem & { projectId: string }
      newItem.partId = undefined
      await db.orderBomItems.add(newItem)
    } else {
      // 普通零件条目：提取零件参数，upsert到零件库，获取partId
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
      const bomFields = extractBomFields(item)
      const newItem = deepClone({ ...bomFields, id: generateId('ob'), projectId }) as OrderBomItem & { projectId: string }
      if (partId) newItem.partId = partId
      await db.orderBomItems.add(newItem)
    }
  }

  async function updateOrderBomItem(projectId: string, itemId: string, data: Partial<OrderBomItem>) {
    const partsStore = usePartsStore()
    const original = await db.orderBomItems.get(itemId)
    if (original) {
      // 如果原来是generated，修改后变为modified
      if (original.source === 'generated' && data.source !== 'generated') {
        data.source = 'modified'
      }
    }

    // 拆分零件参数变更 / BOM 特有字段变更
    const partData: Record<string, any> = {}
    const bomData: Record<string, any> = {}
    for (const [k, v] of Object.entries(data)) {
      if (['quantity', 'type', 'source', 'sortOrder', 'isModuleItem', 'sourceModuleIds'].includes(k)) {
        bomData[k] = v
        // type 字段变更时，同步更新零件的 partType 字段
        if (k === 'type' && v && original && !original.isModuleItem) {
          partData.partType = v as 'order' | 'assembly' | 'both'
        }
      } else if (k !== 'id' && k !== 'projectId' && k !== 'partId') {
        partData[k] = v
      }
    }

    // 零件参数变更
    if (Object.keys(partData).length > 0 && original) {
      if (original.isModuleItem) {
        // isModuleItem（模块本身/子组件）不关联零件库，零件参数直接更新到BOM条目
        await db.orderBomItems.update(itemId, deepClone(partData))
      } else {
        // 普通零件条目：通过 partId 更新对应零件
        let partId = original.partId
        if (partId) {
          await partsStore.updatePart(partId, partData)
        } else {
          const mergedPartData = { ...(original ? extractPartParams(original) : {}), ...partData }
          const part = await partsStore.upsertByDrawingNo(mergedPartData)
          partId = part.id
          await db.orderBomItems.update(itemId, { partId })
        }
      }
    }
    if (Object.keys(bomData).length > 0) {
      await db.orderBomItems.update(itemId, deepClone(bomData))
    }
  }

  async function deleteOrderBomItem(projectId: string, itemId: string) {
    await db.orderBomItems.delete(itemId)
  }

  /**
   * 按物料编码(materialCatalogNo)全局查询下单 BOM 条目（跨项目追溯用）。
   * 返回原始 DB 条目（不与零件库合并），与直接 db 查询语义一致。
   */
  async function searchOrderBomItemsByMaterialCatalogNo(materialCatalogNo: string): Promise<OrderBomItem[]> {
    return db.orderBomItems.where('materialCatalogNo').equals(materialCatalogNo).toArray()
  }

  // ===== 客户需求管理（内嵌在project对象中） =====
  async function addCustomerRequirement(projectId: string, content: string) {
    const project = getProjectById(projectId)
    if (!project) return
    const req: CustomerRequirement = { id: generateId('cr'), content }
    project.customerRequirements.push(req)
    await updateProject(projectId, { customerRequirements: project.customerRequirements })
  }

  async function updateCustomerRequirement(projectId: string, reqId: string, content: string) {
    const project = getProjectById(projectId)
    if (!project) return
    const req = project.customerRequirements.find((r) => r.id === reqId)
    if (req) {
      req.content = content
      await updateProject(projectId, { customerRequirements: project.customerRequirements })
    }
  }

  async function deleteCustomerRequirement(projectId: string, reqId: string) {
    const project = getProjectById(projectId)
    if (!project) return
    project.customerRequirements = project.customerRequirements.filter((r) => r.id !== reqId)
    await updateProject(projectId, { customerRequirements: project.customerRequirements })
  }

  // ===== 模块选择管理（内嵌在project对象中） =====
  async function setSelectedModules(projectId: string, modules: SelectedModule[]) {
    const project = getProjectById(projectId)
    const before = project ? deepClone(project.selectedModules) : []
    await updateProject(projectId, { selectedModules: modules })
    await addChangeHistory(
      projectId,
      '组件选择变更',
      `选择组件变更：${before.length} 个 → ${modules.length} 个`,
      { beforeData: { selectedModules: before }, afterData: { selectedModules: deepClone(modules) } }
    )
  }

  async function updateSelectedModuleQuantity(projectId: string, moduleId: string, quantity: number) {
    const project = getProjectById(projectId)
    if (!project) return
    const sel = project.selectedModules.find((s) => s.moduleId === moduleId)
    if (sel) {
      const beforeQty = sel.quantity
      sel.quantity = quantity
      await updateProject(projectId, { selectedModules: project.selectedModules })
      await addChangeHistory(
        projectId,
        '组件数量修改',
        `组件数量 ${beforeQty} → ${quantity}`,
        { beforeData: { quantity: beforeQty }, afterData: { quantity } }
      )
    }
  }

  async function resetToMock() {
    await initialize()
  }

  return {
    projects,
    initialize,
    addProject,
    updateProject,
    deleteProject,
    getProjectById,
    isJobNoUnique,
    addChangeHistory,
    getOrderBomItems,
    getOrderBomItemsPage,
    setOrderBom,
    addOrderBomItem,
    updateOrderBomItem,
    deleteOrderBomItem,
    searchOrderBomItemsByMaterialCatalogNo,
    addCustomerRequirement,
    updateCustomerRequirement,
    deleteCustomerRequirement,
    setSelectedModules,
    updateSelectedModuleQuantity,
    resetToMock
  }
})
