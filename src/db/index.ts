import Dexie, { type Table } from 'dexie'
import type {
  Equipment, EquipmentConfiguration, EquipmentSerial, ConfigurationGroup,
  Module, BomItem, Project, OrderBomItem, Part, PartLibrary,
  ChangeRecord, Tag, ProjectType, BomTemplateField, BomVersion
} from '@/types'

/**
 * BOM管理系统 IndexedDB 数据库
 * 使用Dexie封装，支持十万级BOM条目存储与查询
 */
export class BomManagerDB extends Dexie {
  // 设备相关
  equipment!: Table<Equipment, string>
  configurations!: Table<EquipmentConfiguration, string>
  configurationGroups!: Table<ConfigurationGroup, string>
  serials!: Table<EquipmentSerial, string>

  // 模块相关
  modules!: Table<Module, string>
  bomItems!: Table<BomItem & { moduleId: string }, string>

  // 全局零件库
  parts!: Table<Part, string>
  partLibraries!: Table<PartLibrary, string>

  // 项目相关
  projects!: Table<Project, string>
  orderBomItems!: Table<OrderBomItem & { projectId: string }, string>

  // 通用
  changeRecords!: Table<ChangeRecord, string>
  tags!: Table<Tag, string>
  projectTypes!: Table<ProjectType, string>
  bomTemplates!: Table<BomTemplateField, string>
  bomVersions!: Table<BomVersion, string>

  constructor() {
    super('bom-manager-db')

    this.version(1).stores({
      // 设备
      equipment: 'id, model, name, status, updatedAt',
      configurations: 'id, equipmentId, name',
      serials: 'id, equipmentId, serialNumber, projectId, status',

      // 模块
      modules: 'id, drawingNo, nameZh, equipmentId, parentModuleId, *configurationIds, *tags, updatedAt',
      bomItems: 'id, moduleId, materialCode, materialName, type, source, sortOrder',

      // 项目
      projects: 'id, jobNo, name, equipmentId, status, updatedAt',
      orderBomItems: 'id, projectId, materialCode, materialName, source, sortOrder',

      // 通用
      changeRecords: 'id, targetType, targetId, timestamp',
      tags: 'id, name',
      projectTypes: 'id, name',
      bomTemplates: 'id, key, label, sortOrder'
    })

    // Version 2: bomTemplates 表添加 templateType 字段，支持三种模板类型
    this.version(2).stores({
      bomTemplates: 'id, key, label, templateType, sortOrder'
    }).upgrade((tx) => {
      // 旧数据迁移：所有已有字段的 templateType 设为 'module'（默认）
      return tx.table('bomTemplates').toCollection().modify((item: BomTemplateField) => {
        if (!item.templateType) {
          item.templateType = 'module'
        }
      })
    })

    // Version 3: 为三种模板类型补充 spec（规格型号）和 position（位号）字段
    this.version(3).stores({
      bomTemplates: 'id, key, label, templateType, sortOrder'
    }).upgrade(async (tx) => {
      const { moduleBomTemplates, orderBomTemplates, importBomTemplates } = await import('@/mock/bomTemplates')
      const existing = await tx.table('bomTemplates').toArray()
      const existingKeys = new Set(
        existing.map((f: BomTemplateField) => `${f.templateType}:${f.key}`)
      )
      const toAdd: BomTemplateField[] = []
      const allDefaults = [...moduleBomTemplates, ...orderBomTemplates, ...importBomTemplates]
      for (const field of allDefaults) {
        if ((field.key === 'spec' || field.key === 'position') &&
            !existingKeys.has(`${field.templateType}:${field.key}`)) {
          toAdd.push(field)
        }
      }
      if (toAdd.length > 0) {
        await tx.table('bomTemplates').bulkAdd(toAdd)
        console.log(`[DB Migration v3] 已补充 ${toAdd.length} 个 spec/position 模板字段`)
      }
    })

    // Version 4: BOM条目字段 key 值统一改造
    // 旧 key → 新 key 映射：
    //   materialCode → materialCatalogNo
    //   materialName → chineseDescription
    //   spec → reserved1
    //   unit → assemblyUnit
    //   qty → quantity
    //   position → reserved2
    //   remark → remarks
    // 更新 bomItems 和 orderBomItems 表的索引，并迁移现有数据
    this.version(4).stores({
      bomItems: 'id, moduleId, materialCatalogNo, chineseDescription, type, source, sortOrder',
      orderBomItems: 'id, projectId, materialCatalogNo, chineseDescription, source, sortOrder'
    }).upgrade(async (tx) => {
      console.log('[DB Migration v4] 开始迁移 BOM 条目字段 key')

      // 旧 key → 新 key 映射表
      const keyMap: Record<string, string> = {
        materialCode: 'materialCatalogNo',
        materialName: 'chineseDescription',
        spec: 'reserved1',
        unit: 'assemblyUnit',
        qty: 'quantity',
        position: 'reserved2',
        remark: 'remarks'
      }

      /**
       * 迁移单条 BOM 记录的字段 key
       * 幂等：只有旧 key 存在时才迁移，新 key 已存在则不覆盖
       */
      function migrateRecord(record: Record<string, any>): boolean {
        let changed = false
        for (const [oldKey, newKey] of Object.entries(keyMap)) {
          if (oldKey in record) {
            // 只有新 key 不存在时才复制值（避免覆盖已有新数据）
            if (!(newKey in record) || record[newKey] === undefined || record[newKey] === '') {
              record[newKey] = record[oldKey]
            }
            delete record[oldKey]
            changed = true
          }
        }
        return changed
      }

      // 迁移模块 BOM 条目
      const moduleBomItems = await tx.table('bomItems').toArray()
      const moduleUpdates: typeof moduleBomItems = []
      for (const item of moduleBomItems) {
        const record = item as Record<string, any>
        if (migrateRecord(record)) {
          moduleUpdates.push(record as typeof moduleBomItems[number])
        }
      }
      if (moduleUpdates.length > 0) {
        await tx.table('bomItems').bulkPut(moduleUpdates)
        console.log(`[DB Migration v4] 已迁移 ${moduleUpdates.length} 条模块 BOM 条目`)
      }

      // 迁移项目下单 BOM 条目
      const orderBomItems = await tx.table('orderBomItems').toArray()
      const orderUpdates: typeof orderBomItems = []
      for (const item of orderBomItems) {
        const record = item as Record<string, any>
        if (migrateRecord(record)) {
          orderUpdates.push(record as typeof orderBomItems[number])
        }
      }
      if (orderUpdates.length > 0) {
        await tx.table('orderBomItems').bulkPut(orderUpdates)
        console.log(`[DB Migration v4] 已迁移 ${orderUpdates.length} 条项目下单 BOM 条目`)
      }

      console.log('[DB Migration v4] BOM 条目字段 key 迁移完成')
    })

    // Version 5: 新增 bomVersions 表，支持 BOM 版本快照与差异对比
    this.version(5).stores({
      bomVersions: 'id, targetType, targetId, versionNo, createdAt'
    })

    // Version 6: 性能优化索引
    // - bomItems 补充 drawingNo 单字段索引（零件追溯按图号精确查询）
    // - bomItems 补充复合索引 [moduleId+sortOrder]，支持按模块真正分页（无需全量加载后 slice）
    // - orderBomItems 补充复合索引 [projectId+sortOrder]，支持按项目真正分页
    // 注意：必须写完整索引串，未列出的索引会被删除；其余表索引保持不变
    this.version(6).stores({
      bomItems: 'id, moduleId, materialCatalogNo, chineseDescription, type, source, sortOrder, drawingNo, [moduleId+sortOrder]',
      orderBomItems: 'id, projectId, materialCatalogNo, chineseDescription, source, sortOrder, [projectId+sortOrder]'
    })

    // Version 7: 父子组件关系从一对多改为多对多
    // - parentModuleId (string) → parentModuleIds (string[])
    // - modules 表索引改为 *parentModuleIds（多值索引）
    this.version(7).stores({
      modules: 'id, drawingNo, nameZh, equipmentId, *parentModuleIds, *configurationIds, *tags, updatedAt'
    }).upgrade(async (tx) => {
      console.log('[DB Migration v7] 开始迁移父子组件关系为多对多...')
      const modules = await tx.table('modules').toArray()
      let migrated = 0
      for (const mod of modules) {
        // 将旧的 parentModuleId 转换为 parentModuleIds 数组
        if (mod.parentModuleId && !mod.parentModuleIds) {
          mod.parentModuleIds = [mod.parentModuleId]
          delete mod.parentModuleId
          await tx.table('modules').put(mod)
          migrated++
        } else if (!mod.parentModuleIds) {
          mod.parentModuleIds = []
          delete mod.parentModuleId
          await tx.table('modules').put(mod)
          migrated++
        }
      }
      console.log(`[DB Migration v7] 迁移完成，共更新 ${migrated} 个模块`)
    })

    // Version 8: 全局零件库
    // - 新增 parts 表（按图号去重的物料主数据）
    // - bomItems / orderBomItems 增加 partId 索引
    // - 数据迁移：从现有 BOM 条目中按图号去重提取零件参数到 parts 表，
    //   并为每个 bomItem / orderBomItem 回填 partId
    this.version(8).stores({
      parts: 'id, drawingNo, materialCatalogNo, chineseDescription, updatedAt',
      bomItems: 'id, moduleId, partId, type, source, sortOrder, [moduleId+sortOrder]',
      orderBomItems: 'id, projectId, partId, source, sortOrder, [projectId+sortOrder]'
    }).upgrade(async (tx) => {
      console.log('[DB Migration v8] 开始迁移全局零件库...')

      // 迁移期内联生成零件ID（upgrade 在 DB open 阶段执行，此时 Pinia/store 尚未初始化）
      const genPartId = () =>
        `part_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

      // 不属于零件字段的 BOM 侧字段（迁移零件参数时需排除）
      const EXCLUDE_KEYS = new Set([
        'id', 'moduleId', 'projectId', 'partId',
        'quantity', 'type', 'source', 'sortOrder',
        'isModuleItem', 'sourceModuleIds',
        'createdAt', 'updatedAt'
      ])

      /** 从一条 BOM 记录中提取零件参数字段 */
      function extractPartParams(record: Record<string, any>): Record<string, any> {
        const part: Record<string, any> = {}
        for (const [k, v] of Object.entries(record)) {
          if (!EXCLUDE_KEYS.has(k) && v !== undefined) {
            part[k] = v
          }
        }
        return part
      }

      const now = new Date().toISOString()
      // drawingNo -> partId（相同图号先到先得，只保留一条）
      const drawingNoToPartId = new Map<string, string>()
      let createdParts = 0
      let linkedItems = 0
      let emptyDrawingParts = 0

      /**
       * 处理一条 BOM 记录：
       * - 有图号且非空：按图号复用/创建零件，回填 partId
       * - 图号为空：为该条目独立创建一个零件（无法去重）
       * - isModuleItem 为 true 的组件/子组件条目不进零件库
       */
      async function processRecord(record: Record<string, any>): Promise<void> {
        // 组件和子组件条目不进零件库
        if (record.isModuleItem) {
          return
        }

        const drawingNo = record.drawingNo != null ? String(record.drawingNo).trim() : ''
        const partParams = extractPartParams(record)

        let partId: string | undefined
        if (drawingNo) {
          partId = drawingNoToPartId.get(drawingNo)
          if (!partId) {
            const part: Part = {
              ...partParams,
              id: genPartId(),
              drawingNo,
              libraryId: 'default-lib',
              createdAt: now,
              updatedAt: now
            }
            await tx.table('parts').add(part)
            drawingNoToPartId.set(drawingNo, part.id)
            partId = part.id
            createdParts++
          }
        } else {
          // 空图号：每条独立创建一个零件
          const part: Part = {
            ...partParams,
            id: genPartId(),
            drawingNo: undefined,
            libraryId: 'default-lib',
            createdAt: now,
            updatedAt: now
          }
          await tx.table('parts').add(part)
          partId = part.id
          createdParts++
          emptyDrawingParts++
        }

        record.partId = partId
        linkedItems++
      }

      // 1) 遍历模块 BOM 条目
      const bomItems = await tx.table('bomItems').toArray()
      for (const item of bomItems) {
        await processRecord(item as Record<string, any>)
      }
      if (bomItems.length > 0) {
        await tx.table('bomItems').bulkPut(bomItems)
      }

      // 2) 遍历项目下单 BOM 条目（空图号/模块条目同样处理）
      const orderItems = await tx.table('orderBomItems').toArray()
      for (const item of orderItems) {
        await processRecord(item as Record<string, any>)
      }
      if (orderItems.length > 0) {
        await tx.table('orderBomItems').bulkPut(orderItems)
      }

      console.log(
        `[DB Migration v8] 完成：新建零件 ${createdParts} 个（其中空图号零件 ${emptyDrawingParts} 个），` +
        `回填 partId 的 BOM 条目 ${linkedItems} 条（模块 ${bomItems.length} / 项目 ${orderItems.length}）`
      )
    })

    // Version 9: 零件库新增 partCategory 字段（零件分类）
    // - 将现有零件的 reserved1 值迁移到 partCategory（仅当值匹配预设分类名称时）
    // - reserved1 字段保留但不再在零件库UI中使用
    this.version(9).stores({
      parts: 'id, drawingNo, materialCatalogNo, chineseDescription, partCategory, updatedAt'
    }).upgrade(async (tx) => {
      console.log('[DB Migration v9] 开始迁移零件分类字段...')
      const PRESET_CATEGORY_NAMES = new Set(['85零件', '86零件', '标准件', '外购件'])
      const NAME_TO_ID: Record<string, string> = {
        '85零件': 'cat_85',
        '86零件': 'cat_86',
        '标准件': 'cat_standard',
        '外购件': 'cat_purchased'
      }

      const parts = await tx.table('parts').toArray()
      let migrated = 0
      for (const part of parts) {
        const record = part as Record<string, any>
        // 如果已有partCategory则跳过
        if (record.partCategory) continue
        // 如果reserved1的值匹配预设分类名称，则迁移
        const r1 = String(record.reserved1 || '').trim()
        if (r1 && PRESET_CATEGORY_NAMES.has(r1)) {
          record.partCategory = NAME_TO_ID[r1]
          await tx.table('parts').put(record)
          migrated++
        }
      }
      console.log(`[DB Migration v9] 完成：迁移 ${migrated} 个零件的分类字段`)
    })

    // Version 10: 新增 configurationGroups 表（配置分组）
    // 新表为空表，无需数据迁移；现有配置 groupId 为 undefined 即表示未分组
    this.version(10).stores({
      configurationGroups: 'id, equipmentId, name, sortOrder'
    })

    // Version 11: 多零件库支持
    // - 新增 partLibraries 表
    // - parts 表增加 libraryId 索引
    // - 数据迁移：创建"默认库"，所有现有零件的 libraryId 设置为 'default-lib'
    this.version(11).stores({
      partLibraries: 'id, name, sortOrder',
      parts: 'id, libraryId, drawingNo, materialCatalogNo, chineseDescription, partCategory, updatedAt'
    }).upgrade(async (tx) => {
      console.log('[DB Migration v11] 开始迁移多零件库...')

      const now = new Date().toISOString()
      const defaultLib: PartLibrary = {
        id: 'default-lib',
        name: '默认库',
        description: '系统默认零件库，迁移前的所有零件均在此库中',
        sortOrder: 0,
        createdAt: now,
        updatedAt: now
      }

      // 创建默认库（幂等：已存在则不重复创建）
      const existingDefault = await tx.table('partLibraries').get('default-lib')
      if (!existingDefault) {
        await tx.table('partLibraries').add(defaultLib)
        console.log('[DB Migration v11] 已创建默认库')
      }

      // 为所有现有零件设置 libraryId = 'default-lib'
      const parts = await tx.table('parts').toArray()
      let updated = 0
      for (const part of parts) {
        const record = part as Record<string, any>
        if (!record.libraryId) {
          record.libraryId = 'default-lib'
          await tx.table('parts').put(record)
          updated++
        }
      }
      console.log(`[DB Migration v11] 已为 ${updated} 个零件设置默认库归属`)
      console.log('[DB Migration v11] 多零件库迁移完成')
    })
  }
}

export const db = new BomManagerDB()

/**
 * 若 bomTemplates 表为空，则初始化所有三种模板类型的默认字段
 */
export async function initBomTemplatesIfEmpty(): Promise<void> {
  const count = await db.bomTemplates.count()
  if (count === 0) {
    const { mockBomTemplates } = await import('@/mock/bomTemplates')
    await db.bomTemplates.bulkPut(mockBomTemplates)
    console.log('[DB] bomTemplates 已初始化为三种模板类型默认字段')
  }
}

/**
 * 清空所有表（用于重置演示数据）
 */
export async function clearAllTables(): Promise<void> {
  await Promise.all([
    db.equipment.clear(),
    db.configurations.clear(),
    db.configurationGroups.clear(),
    db.serials.clear(),
    db.modules.clear(),
    db.bomItems.clear(),
    db.parts.clear(),
    db.partLibraries.clear(),
    db.projects.clear(),
    db.orderBomItems.clear(),
    db.changeRecords.clear(),
    db.tags.clear(),
    db.projectTypes.clear(),
    db.bomTemplates.clear(),
    db.bomVersions.clear()
  ])
}
