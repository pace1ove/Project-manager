import { db } from '@/db/index'
import { mockEquipments, mockEquipmentConfigurations, mockEquipmentSerials } from '@/mock/equipment'
import { mockModules } from '@/mock/modules'
import { mockProjects } from '@/mock/projects'
import { mockTags } from '@/mock/tags'
import { mockProjectTypes } from '@/mock/projectTypes'
import { mockBomTemplates } from '@/mock/bomTemplates'
import type { BomItem, OrderBomItem, Module, Project } from '@/types'

/**
 * 将Mock数据初始化到IndexedDB
 * BOM条目从模块/项目对象中拆分到独立表
 */
export async function seedDatabase(): Promise<void> {
  // 使用bulkPut（幂等），处理部分初始化的脏数据
  // 1. 基础数据
  await db.tags.bulkPut(mockTags)
  await db.projectTypes.bulkPut(mockProjectTypes)
  await db.bomTemplates.bulkPut(mockBomTemplates)

  // 2. 设备相关
  await db.equipment.bulkPut(mockEquipments)
  await db.configurations.bulkPut(mockEquipmentConfigurations)
  await db.serials.bulkPut(mockEquipmentSerials)

  // 3. 模块 + BOM条目拆分
  const modulesWithoutBom = mockModules.map((mod) => {
    const { bom, ...moduleData } = mod
    return moduleData
  })
  await db.modules.bulkPut(modulesWithoutBom as Module[])

  // 拆分BOM条目到独立表
  const allBomItems: (BomItem & { moduleId: string })[] = []
  for (const mod of mockModules) {
    for (const item of mod.bom!.items) {
      allBomItems.push({ ...item, moduleId: mod.id })
    }
  }
  if (allBomItems.length > 0) {
    await db.bomItems.bulkPut(allBomItems)
  }

  // 4. 项目 + 下单BOM拆分
  const projectsWithoutOrderBom = mockProjects.map((proj) => {
    const { orderBom, ...projectData } = proj
    return projectData
  })
  await db.projects.bulkPut(projectsWithoutOrderBom as Project[])

  // 拆分下单BOM条目到独立表
  const allOrderBomItems: (OrderBomItem & { projectId: string })[] = []
  for (const proj of mockProjects) {
    for (const item of proj.orderBom!) {
      allOrderBomItems.push({ ...item, projectId: proj.id })
    }
  }
  if (allOrderBomItems.length > 0) {
    await db.orderBomItems.bulkPut(allOrderBomItems)
  }

  // 5. 更改历史（从设备/模块中提取）
  const allChangeRecords = []
  for (const eq of mockEquipments) {
    if (eq.changeHistory) {
      allChangeRecords.push(...eq.changeHistory)
    }
  }
  for (const mod of mockModules) {
    if (mod.changeHistory) {
      allChangeRecords.push(...mod.changeHistory)
    }
  }
  if (allChangeRecords.length > 0) {
    await db.changeRecords.bulkPut(allChangeRecords)
  }
}

/**
 * 检查数据库是否已有数据
 */
export async function isDatabaseSeeded(): Promise<boolean> {
  const count = await db.equipment.count()
  return count > 0
}
