/**
 * 物料与组件复用统计工具
 * 数据从 store 和 IndexedDB 实时计算，不硬编码
 */
import type { Module, Project, BomItem, OrderBomItem, SelectedModule } from '@/types'
import { useModulesStore } from '@/stores/modules'
import { useProjectsStore } from '@/stores/projects'
import { useEquipmentStore } from '@/stores/equipment'

// ==================== 物料使用统计 ====================

export interface MaterialModuleUsage {
  moduleId: string
  drawingNo: string
  nameZh: string
  equipmentName: string
  quantity: number
  bomType: BomItem['type']
}

export interface MaterialProjectUsage {
  projectId: string
  projectName: string
  jobNo: string
  status: Project['status']
  quantity: number
  sourceModuleDrawingNos: string[]
}

export interface MaterialUsageResult {
  materialCatalogNo: string
  drawingNo: string
  chineseDescription: string
  reserved1: string
  assemblyUnit: string
  moduleCount: number
  projectCount: number
  totalQuantity: number
  moduleUsages: MaterialModuleUsage[]
  projectUsages: MaterialProjectUsage[]
}

/**
 * 按物料号/描述搜索物料使用情况
 * @param keyword 搜索关键词（物料号/图号/中文描述）
 */
export async function searchMaterialUsage(keyword: string): Promise<MaterialUsageResult[]> {
  const modulesStore = useModulesStore()
  const projectsStore = useProjectsStore()
  const equipmentStore = useEquipmentStore()

  const kw = keyword.trim().toLowerCase()
  if (!kw) return []

  // partKey -> 聚合结果
  const partMap = new Map<string, MaterialUsageResult & {
    _moduleIds: Set<string>
    _projectIds: Set<string>
  }>()

  function matchItem(item: BomItem | OrderBomItem): boolean {
    return (
      (item.materialCatalogNo || '').toLowerCase().includes(kw) ||
      (item.drawingNo || '').toLowerCase().includes(kw) ||
      (item.chineseDescription || '').toLowerCase().includes(kw) ||
      ((item as any).reserved1 || '').toLowerCase().includes(kw)
    )
  }

  function getOrCreatePart(item: BomItem | OrderBomItem): MaterialUsageResult & {
    _moduleIds: Set<string>
    _projectIds: Set<string>
  } {
    const key = `${item.materialCatalogNo || ''}|${item.drawingNo || ''}|${item.chineseDescription || ''}`
    let part = partMap.get(key)
    if (!part) {
      part = {
        materialCatalogNo: item.materialCatalogNo || '',
        drawingNo: item.drawingNo || '',
        chineseDescription: item.chineseDescription || '',
        reserved1: (item as any).reserved1 || '',
        assemblyUnit: (item as any).assemblyUnit || '',
        moduleCount: 0,
        projectCount: 0,
        totalQuantity: 0,
        moduleUsages: [],
        projectUsages: [],
        _moduleIds: new Set<string>(),
        _projectIds: new Set<string>()
      }
      partMap.set(key, part)
    }
    return part
  }

  // 1. 遍历项目下单BOM
  for (const project of projectsStore.projects) {
    const orderBom = await projectsStore.getOrderBomItems(project.id)
    if (!orderBom || orderBom.length === 0) continue

    const matched = orderBom.filter(matchItem)
    if (matched.length === 0) continue

    const sourceModNos = new Set<string>()
    let projQty = 0
    for (const item of matched) {
      projQty += item.quantity
      if (item.sourceModuleIds) {
        for (const modId of item.sourceModuleIds) {
          const mod = modulesStore.getModuleById(modId)
          if (mod) sourceModNos.add(mod.drawingNo)
        }
      }
    }

    for (const item of matched) {
      const part = getOrCreatePart(item)
      part.totalQuantity += item.quantity
      if (!part._projectIds.has(project.id)) {
        part._projectIds.add(project.id)
        part.projectCount = part._projectIds.size
        part.projectUsages.push({
          projectId: project.id,
          projectName: project.name,
          jobNo: project.jobNo,
          status: project.status,
          quantity: projQty,
          sourceModuleDrawingNos: Array.from(sourceModNos)
        })
      } else {
        const existing = part.projectUsages.find((p) => p.projectId === project.id)
        if (existing) existing.quantity += item.quantity
      }
    }
  }

  // 2. 遍历组件BOM
  for (const mod of modulesStore.modules) {
    const bomItems = await modulesStore.getBomItems(mod.id)
    if (!bomItems || bomItems.length === 0) continue

    const matched = bomItems.filter(matchItem)
    if (matched.length === 0) continue

    const equipment = equipmentStore.getEquipmentById(mod.equipmentId)
    const equipmentName = equipment ? `${equipment.name}(${equipment.model})` : '-'

    // 按 type 分组
    const typeGroups = new Map<BomItem['type'], number>()
    for (const item of matched) {
      const p = getOrCreatePart(item)
      p.totalQuantity += item.quantity
      typeGroups.set(item.type, (typeGroups.get(item.type) || 0) + item.quantity)
    }

    for (const [bomType, typeQty] of typeGroups.entries()) {
      const part = getOrCreatePart(matched[0])
      if (!part._moduleIds.has(mod.id + '|' + bomType)) {
        part._moduleIds.add(mod.id + '|' + bomType)
        part.moduleCount = part._moduleIds.size
        part.moduleUsages.push({
          moduleId: mod.id,
          drawingNo: mod.drawingNo,
          nameZh: mod.nameZh,
          equipmentName,
          quantity: typeQty,
          bomType
        })
      }
    }
  }

  // 转换输出
  return Array.from(partMap.values())
    .map(({ _moduleIds, _projectIds, ...rest }) => rest)
    .sort((a, b) => b.totalQuantity - a.totalQuantity)
}

// ==================== 组件复用统计 ====================

export interface ModuleReuseStat {
  moduleId: string
  drawingNo: string
  nameZh: string
  equipmentName: string
  configRefCount: number
  projectRefCount: number
  totalReuse: number
}

/**
 * 统计每个组件被多少设备配置引用、被多少项目使用
 */
export async function getModuleReuseStats(): Promise<ModuleReuseStat[]> {
  const modulesStore = useModulesStore()
  const projectsStore = useProjectsStore()
  const equipmentStore = useEquipmentStore()

  const result: ModuleReuseStat[] = []

  for (const mod of modulesStore.modules) {
    // 被配置引用：module.configurationIds 出现在哪些 configuration.moduleIds 中
    // 注意：反向关系是 configuration.moduleIds 包含 moduleId
    const configRefs = equipmentStore.configurations.filter(
      (c) => Array.isArray(c.moduleIds) && c.moduleIds.includes(mod.id)
    )

    // 被项目使用：项目 selectedModules 中包含该 moduleId
    const projectRefs = projectsStore.projects.filter(
      (p) =>
        Array.isArray(p.selectedModules) &&
        p.selectedModules.some((s) => s.moduleId === mod.id)
    )

    const equipment = equipmentStore.getEquipmentById(mod.equipmentId)
    const equipmentName = equipment ? `${equipment.name}(${equipment.model})` : '-'

    result.push({
      moduleId: mod.id,
      drawingNo: mod.drawingNo,
      nameZh: mod.nameZh,
      equipmentName,
      configRefCount: configRefs.length,
      projectRefCount: projectRefs.length,
      totalReuse: configRefs.length + projectRefs.length
    })
  }

  // 按总复用次数降序
  return result.sort((a, b) => b.totalReuse - a.totalReuse)
}

// ==================== BOM 统计 ====================

export interface ModuleBomStat {
  moduleId: string
  drawingNo: string
  nameZh: string
  totalItems: number
  assemblyCount: number
  orderCount: number
  bothCount: number
  totalQuantity: number
}

/**
 * 统计每个组件的 BOM 条目分布（按 type 分类）
 */
export async function getModuleBomStats(): Promise<ModuleBomStat[]> {
  const modulesStore = useModulesStore()
  const result: ModuleBomStat[] = []

  for (const mod of modulesStore.modules) {
    const items = await modulesStore.getBomItems(mod.id)
    let assemblyCount = 0
    let orderCount = 0
    let bothCount = 0
    let totalQuantity = 0

    for (const item of items) {
      totalQuantity += item.quantity || 0
      if (item.type === 'assembly') assemblyCount++
      else if (item.type === 'order') orderCount++
      else bothCount++
    }

    result.push({
      moduleId: mod.id,
      drawingNo: mod.drawingNo,
      nameZh: mod.nameZh,
      totalItems: items.length,
      assemblyCount,
      orderCount,
      bothCount,
      totalQuantity
    })
  }

  return result.sort((a, b) => b.totalItems - a.totalItems)
}

export interface ProjectBomStat {
  projectId: string
  projectName: string
  jobNo: string
  totalItems: number
  totalQuantity: number
  sourceModuleDist: { moduleDrawingNo: string; count: number }[]
}

/**
 * 统计每个项目的下单BOM汇总
 */
export async function getProjectBomStats(): Promise<ProjectBomStat[]> {
  const projectsStore = useProjectsStore()
  const modulesStore = useModulesStore()
  const result: ProjectBomStat[] = []

  for (const project of projectsStore.projects) {
    const items = await projectsStore.getOrderBomItems(project.id)
    let totalQuantity = 0
    const sourceMap = new Map<string, number>()

    for (const item of items) {
      totalQuantity += item.quantity || 0
      if (item.sourceModuleIds && item.sourceModuleIds.length > 0) {
        for (const modId of item.sourceModuleIds) {
          const mod = modulesStore.getModuleById(modId)
          const drawingNo = mod?.drawingNo || modId
          sourceMap.set(drawingNo, (sourceMap.get(drawingNo) || 0) + 1)
        }
      }
    }

    result.push({
      projectId: project.id,
      projectName: project.name,
      jobNo: project.jobNo,
      totalItems: items.length,
      totalQuantity,
      sourceModuleDist: Array.from(sourceMap.entries())
        .map(([moduleDrawingNo, count]) => ({ moduleDrawingNo, count }))
        .sort((a, b) => b.count - a.count)
    })
  }

  return result.sort((a, b) => b.totalItems - a.totalItems)
}

// ==================== 交付时间统计 ====================

export interface DeliveryBucket {
  key: 'overdue' | 'thisMonth' | 'nextMonth' | 'later' | 'completed'
  label: string
  projects: Project[]
}

/**
 * 按交付时间对项目分桶
 * deliveryDate 不存在时用 createdAt + 30 天估算
 */
export function getDeliveryBuckets(projects: Project[]): DeliveryBucket[] {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  const endOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 2, 0)

  function effectiveDelivery(p: Project): Date {
    if (p.deliveryDate) return new Date(p.deliveryDate)
    // 估算：创建时间 + 30 天
    return new Date(new Date(p.createdAt).getTime() + 30 * 24 * 60 * 60 * 1000)
  }

  const overdue: Project[] = []
  const thisMonth: Project[] = []
  const nextMonth: Project[] = []
  const later: Project[] = []
  const completed: Project[] = []

  for (const p of projects) {
    if (p.status === 'completed') {
      completed.push(p)
      continue
    }
    if (p.status === 'cancelled') continue

    const d = effectiveDelivery(p)
    if (d < now) {
      overdue.push(p)
    } else if (d >= startOfMonth && d <= endOfMonth) {
      thisMonth.push(p)
    } else if (d >= startOfNextMonth && d <= endOfNextMonth) {
      nextMonth.push(p)
    } else {
      later.push(p)
    }
  }

  return [
    { key: 'overdue', label: '已逾期', projects: overdue },
    { key: 'thisMonth', label: '本月交付', projects: thisMonth },
    { key: 'nextMonth', label: '下月交付', projects: nextMonth },
    { key: 'later', label: '后续交付', projects: later },
    { key: 'completed', label: '已完成', projects: completed }
  ]
}

/** 获取项目的有效交付日期字符串 */
export function getEffectiveDeliveryDate(p: Project): string {
  if (p.deliveryDate) return p.deliveryDate
  const d = new Date(new Date(p.createdAt).getTime() + 30 * 24 * 60 * 60 * 1000)
  return d.toISOString()
}
