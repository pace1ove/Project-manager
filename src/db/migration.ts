import { db, initBomTemplatesIfEmpty } from '@/db/index'
import { seedDatabase, isDatabaseSeeded } from '@/db/seed'

/**
 * LocalStorage 旧数据的 key 列表
 */
const LEGACY_STORAGE_KEYS = [
  'equipment', 'equipmentConfigurations', 'equipmentSerials',
  'modules', 'projects', 'tags', 'projectTypes', 'bomTemplates'
]

/**
 * 从LocalStorage读取旧数据
 */
function readLegacyData<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (raw) return JSON.parse(raw) as T
  } catch {
    // ignore parse errors
  }
  return fallback
}

/**
 * 生成唯一ID
 */
function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * 确保数组中的每个对象都有id字段
 */
function ensureIds<T extends Record<string, any>>(items: T[], prefix: string): T[] {
  return items.map((item, index) => {
    if (!item.id) {
      return { ...item, id: generateId(prefix) }
    }
    return item
  })
}

/**
 * 规范化BOM模板字段数据，确保格式正确
 */
function normalizeBomTemplates(items: any[]): any[] {
  return items.map((item, index) => {
    const normalized = { ...item }
    // 确保有id
    if (!normalized.id) {
      normalized.id = generateId('bt')
    }
    // 确保有key（如果没有，用label生成）
    if (!normalized.key && normalized.label) {
      normalized.key = normalized.label.toLowerCase().replace(/\s+/g, '')
    }
    // 确保有fieldType
    if (!normalized.fieldType) {
      normalized.fieldType = 'text'
    }
    // 确保有required
    if (typeof normalized.required !== 'boolean') {
      normalized.required = false
    }
    // 确保有visible
    if (typeof normalized.visible !== 'boolean') {
      normalized.visible = true
    }
    // 确保有sortOrder
    if (typeof normalized.sortOrder !== 'number') {
      normalized.sortOrder = index + 1
    }
    // 旧数据迁移：templateType 默认为 'module'
    if (!normalized.templateType) {
      normalized.templateType = 'module'
    }
    return normalized
  })
}

/**
 * 安全地批量添加数据到表
 */
async function safeBulkAdd(table: any, items: any[], tableName: string): Promise<void> {
  if (!items || items.length === 0) return
  try {
    await table.bulkAdd(items)
    console.log(`[Migration] ${tableName}: 迁移 ${items.length} 条记录成功`)
  } catch (error: any) {
    console.warn(`[Migration] ${tableName}: 批量添加失败，尝试逐条添加:`, error.message)
    // 逐条添加，跳过失败的记录
    let successCount = 0
    for (const item of items) {
      try {
        await table.add(item)
        successCount++
      } catch (e: any) {
        console.warn(`[Migration] ${tableName}: 跳过一条记录:`, e.message, item)
      }
    }
    console.log(`[Migration] ${tableName}: 逐条添加完成，成功 ${successCount}/${items.length} 条`)
  }
}

/**
 * 迁移LocalStorage旧数据到IndexedDB
 * 如果LocalStorage有数据则迁移，否则用Mock数据初始化
 * 如果用户已主动清除数据（bom_data_cleared标记），则不初始化Mock数据
 */
export async function migrateFromLocalStorage(): Promise<void> {
  // 始终确保 bomTemplates 表已初始化（三种模板类型的默认字段）
  // 这是系统配置数据，不属于演示数据，即使清除演示数据后也应存在
  await initBomTemplatesIfEmpty()

  const alreadySeeded = await isDatabaseSeeded()
  if (alreadySeeded) return

  // 检查用户是否已主动清除数据，如果是则不初始化Mock数据
  const dataCleared = localStorage.getItem('bom_data_cleared') === 'true'
  if (dataCleared) {
    console.log('[Migration] 检测到数据已清除标记，跳过Mock数据初始化')
    return
  }

  // 检查LocalStorage是否有旧数据
  const hasLegacyData = LEGACY_STORAGE_KEYS.some(key => localStorage.getItem(key) !== null)

  if (hasLegacyData) {
    // 从LocalStorage迁移
    try {
      await migrateLegacyData()
      console.log('[Migration] LocalStorage数据迁移完成')
    } catch (error: any) {
      console.error('[Migration] 数据迁移失败，回退到Mock数据初始化:', error)
      // 清空可能已部分写入的数据
      await clearAllTables()
      // 用Mock数据初始化
      await seedDatabase()
    }
  } else {
    // 用Mock数据初始化
    await seedDatabase()
  }
}

/**
 * 清空所有表
 */
async function clearAllTables(): Promise<void> {
  await Promise.all([
    db.equipment.clear(), db.configurations.clear(), db.serials.clear(),
    db.modules.clear(), db.bomItems.clear(),
    db.projects.clear(), db.orderBomItems.clear(),
    db.changeRecords.clear(), db.tags.clear(),
    db.projectTypes.clear(), db.bomTemplates.clear()
  ])
}

/**
 * 执行LocalStorage数据迁移
 */
async function migrateLegacyData(): Promise<void> {
  // 标签和项目类型
  const tags = ensureIds(readLegacyData<any[]>('tags', []), 'tag')
  const projectTypes = ensureIds(readLegacyData<any[]>('projectTypes', []), 'pt')
  const bomTemplates = normalizeBomTemplates(readLegacyData<any[]>('bomTemplates', []))

  await safeBulkAdd(db.tags, tags, 'tags')
  await safeBulkAdd(db.projectTypes, projectTypes, 'projectTypes')
  await safeBulkAdd(db.bomTemplates, bomTemplates, 'bomTemplates')

  // 设备相关
  const equipment = ensureIds(readLegacyData<any[]>('equipment', []), 'eq')
  const configurations = ensureIds(readLegacyData<any[]>('equipmentConfigurations', []), 'cfg')
  const serials = ensureIds(readLegacyData<any[]>('equipmentSerials', []), 'sn')

  await safeBulkAdd(db.equipment, equipment, 'equipment')
  await safeBulkAdd(db.configurations, configurations, 'configurations')
  await safeBulkAdd(db.serials, serials, 'serials')

  // 模块 + BOM条目拆分
  const modules = ensureIds(readLegacyData<any[]>('modules', []), 'mod')
  if (modules.length) {
    const modulesWithoutBom = modules.map((mod: any) => {
      const { bom, ...moduleData } = mod
      // 确保childModuleIds存在
      if (!moduleData.childModuleIds) {
        moduleData.childModuleIds = []
      }
      return moduleData
    })
    await safeBulkAdd(db.modules, modulesWithoutBom, 'modules')

    const allBomItems: any[] = []
    for (const mod of modules) {
      if (mod.bom?.items) {
        for (const item of mod.bom.items) {
          // 确保BOM条目有id和moduleId
          const bomItem = { ...item, moduleId: mod.id }
          if (!bomItem.id) {
            bomItem.id = generateId('bi')
          }
          allBomItems.push(bomItem)
        }
      }
    }
    await safeBulkAdd(db.bomItems, allBomItems, 'bomItems')
  }

  // 项目 + 下单BOM拆分
  const projects = ensureIds(readLegacyData<any[]>('projects', []), 'prj')
  if (projects.length) {
    const projectsWithoutOrderBom = projects.map((proj: any) => {
      const { orderBom, ...projectData } = proj
      return projectData
    })
    await safeBulkAdd(db.projects, projectsWithoutOrderBom, 'projects')

    const allOrderBomItems: any[] = []
    for (const proj of projects) {
      if (proj.orderBom) {
        for (const item of proj.orderBom) {
          // 确保下单BOM条目有id和projectId
          const orderItem = { ...item, projectId: proj.id }
          if (!orderItem.id) {
            orderItem.id = generateId('obi')
          }
          allOrderBomItems.push(orderItem)
        }
      }
    }
    await safeBulkAdd(db.orderBomItems, allOrderBomItems, 'orderBomItems')
  }
}

/**
 * 重置数据库（清空后重新用Mock初始化）
 */
export async function resetDatabase(): Promise<void> {
  await clearAllTables()
  await seedDatabase()
}
