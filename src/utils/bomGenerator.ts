import type { Module, OrderBomItem, OrderBomResult, SelectedModule, BomItem } from '@/types'
import { generateId } from '@/utils/storage'

/**
 * 递归获取模块的所有子模块（深度优先）
 */
function getAllChildModules(module: Module, modules: Module[], visited: Set<string> = new Set()): Module[] {
  const result: Module[] = []
  if (!module.childModuleIds || module.childModuleIds.length === 0) return result

  for (const childId of module.childModuleIds) {
    if (visited.has(childId)) continue
    visited.add(childId)
    const child = modules.find((m) => m.id === childId)
    if (child) {
      result.push(child)
      // 递归获取子模块的子模块
      const grandchildren = getAllChildModules(child, modules, visited)
      result.push(...grandchildren)
    }
  }
  return result
}

/**
 * 生成组件的物料/目录号
 * 所有组件条目的物料/目录号统一为固定值"ASM/"
 */
function generateModuleMaterialCatalogNo(drawingNo: string): string {
  return 'ASM/'
}

/**
 * 将模块转换为BOM条目
 */
function moduleToBomItem(
  module: Module,
  quantity: number,
  sourceModuleId: string,
  sortOrder: number,
  isModuleItself: boolean,
  projectJobNo?: string
): OrderBomItem {
  return {
    id: generateId('ob'),
    drawingNo: module.drawingNo,
    jobNo: projectJobNo,
    chineseDescription: module.nameZh,
    englishDescription: module.nameEn || '',
    materialCatalogNo: generateModuleMaterialCatalogNo(module.drawingNo),
    assemblyUnit: 'SET',
    quantity,
    type: 'both',
    sourceModuleIds: [sourceModuleId],
    source: 'generated',
    remarks: isModuleItself ? '组件本身' : '子组件',
    sortOrder,
    isModuleItem: true
  }
}

/**
 * 计算物料BOM条目的合并key
 * 优先级：materialCatalogNo（物料编码，唯一标识）→ drawingNo+reserved1+assemblyUnit → chineseDescription → id
 * 同一物料编码（materialCatalogNo）必须合并，不受其他字段差异影响
 */
function computeMergeKey(item: {
  materialCatalogNo?: string
  drawingNo?: string
  reserved1?: string
  assemblyUnit?: string
  chineseDescription?: string
  id: string
}): string {
  // 物料编码存在时，仅用物料编码作为合并key（同一物料必须合并）
  if (item.materialCatalogNo && item.materialCatalogNo.trim()) {
    return `__mat__|${item.materialCatalogNo.trim()}`
  }
  // 无物料编码时，用图号+预留1+装配单位组合
  const base = `${item.drawingNo || ''}|${item.reserved1 || ''}|${item.assemblyUnit || ''}`
  if (item.drawingNo || item.reserved1 || item.assemblyUnit) {
    return base
  }
  // 全部为空时，使用中文描述兜底
  if (item.chineseDescription) {
    return `__desc__|${item.chineseDescription}`
  }
  // 中文描述也为空，使用id确保不合并（每条独立）
  return `__id__|${item.id}`
}

/**
 * 生成下单BOM
 * 1. 将选中的顶层模块本身作为BOM条目
 * 2. 将顶层模块的所有子模块作为BOM条目（递归）
 * 3. 遍历所有选中模块（包括子模块）BOM中type为'order'或'both'的条目
 * 按 materialCatalogNo+reserved1+assemblyUnit 分组，累加 quantity×模块quantity
 * 记录 sourceModuleIds
 * 按模块顺序、同模块按sortOrder排序
 *
 * @param selectedModules 已选模块
 * @param modules 模块全量（用于解析父子关系；不再要求携带 bom 字段）
 * @param bomItemsMap moduleId -> 该模块的 BOM 条目（来自 bomItems 表，通过 modulesStore.getBomItems 获取）
 *
 * 注意：由于UI层面选中父模块时子模块会自动选中，
 * selectedModules中可能同时包含父模块和子模块。
 * 为避免重复计数，只有"顶层选中模块"（不是其他选中模块子模块的模块）
 * 才会添加模块本身和子模块条目；所有选中模块都会处理其BOM条目。
 */
export function generateOrderBom(
  selectedModules: SelectedModule[],
  modules: Module[],
  bomItemsMap: Map<string, BomItem[]>,
  projectJobNo?: string
): OrderBomResult {
  // key: materialCatalogNo|reserved1|assemblyUnit, value: 合并后的条目
  const mergedMap = new Map<string, OrderBomItem>()
  let globalSortOrder = 1

  // 生成日志统计
  const warnings: string[] = []
  let mergedCount = 0
  let skippedCount = 0
  let bomLineCount = 0
  // 记录已产生合并冲突警告的 key（同一 key 只警告一次）
  const mergeWarnedKeys = new Set<string>()

  // 预先计算所有选中模块的ID集合
  const selectedModuleIds = new Set(selectedModules.map((s) => s.moduleId))

  // 多配置组合去重验证：记录每个模块首次出现的来源配置
  const moduleFirstSeen = new Map<string, string>()
  for (const selected of selectedModules) {
    if (!moduleFirstSeen.has(selected.moduleId)) {
      moduleFirstSeen.set(selected.moduleId, selected.moduleId)
    }
  }

  /**
   * 判断模块是否是另一个选中模块的子模块（递归）
   * 如果是，则该模块不是"顶层选中模块"，跳过模块本身和子模块条目的添加
   * 支持多父模块：遍历所有父模块的祖先链
   */
  function isChildOfAnotherSelected(moduleId: string, visited: Set<string> = new Set()): boolean {
    const mod = modules.find((m) => m.id === moduleId)
    if (!mod || !mod.parentModuleIds || mod.parentModuleIds.length === 0) return false
    if (visited.has(moduleId)) return false // 防止循环引用
    visited.add(moduleId)
    
    // 遍历所有父模块
    for (const parentId of mod.parentModuleIds) {
      // 如果直接父模块也被选中，则当前模块是子模块
      if (selectedModuleIds.has(parentId)) return true
      // 递归检查更上层的父模块
      if (isChildOfAnotherSelected(parentId, new Set(visited))) return true
    }
    return false
  }

  for (const selected of selectedModules) {
    const module = modules.find((m) => m.id === selected.moduleId)
    if (!module) continue

    // 判断当前模块是否是其他选中模块的子模块
    const isChildModule = isChildOfAnotherSelected(selected.moduleId)

    // 只有顶层选中模块才添加模块本身和子模块条目（避免重复计数）
    if (!isChildModule) {
      // 1. 将模块本身作为BOM条目
      const moduleItem = moduleToBomItem(module, selected.quantity, selected.moduleId, globalSortOrder++, true, projectJobNo)
      // 组件条目（isModuleItem=true）不参与合并：使用包含模块ID的唯一key，确保每条独立显示
      const moduleKey = `__module__|${module.id}|${moduleItem.materialCatalogNo || ''}|${moduleItem.reserved1 || ''}|${moduleItem.assemblyUnit || ''}`
      if (mergedMap.has(moduleKey)) {
        const existing = mergedMap.get(moduleKey)!
        existing.quantity += moduleItem.quantity
        mergedCount++
        if (!existing.sourceModuleIds.includes(selected.moduleId)) {
          existing.sourceModuleIds.push(selected.moduleId)
        }
      } else {
        mergedMap.set(moduleKey, moduleItem)
      }

      // 2. 将模块的所有子模块作为BOM条目（递归，维护累计倍数）
      const walkedChildren = new Set<string>() // 防止循环引用导致无限递归
      const walkChildren = (parentModule: Module, parentQty: number) => {
        for (const childId of parentModule.childModuleIds || []) {
          if (walkedChildren.has(childId)) continue // 已访问过，防止循环引用
          walkedChildren.add(childId)
          const child = modules.find((m) => m.id === childId)
          if (!child) continue
          // 子模块数量：优先使用子模块自己设置的数量（如果在selectedModules中），否则继承父模块的累计数量
          const childSelected = selectedModules.find((s) => s.moduleId === child.id)
          const childQty = childSelected ? childSelected.quantity : parentQty

          const childItem = moduleToBomItem(child, childQty, selected.moduleId, globalSortOrder++, false, projectJobNo)
          // 组件条目（isModuleItem=true）不参与合并：使用包含模块ID的唯一key，确保每条独立显示
          const childKey = `__module__|${child.id}|${childItem.materialCatalogNo || ''}|${childItem.reserved1 || ''}|${childItem.assemblyUnit || ''}`
          if (mergedMap.has(childKey)) {
            const existing = mergedMap.get(childKey)!
            existing.quantity += childItem.quantity
            mergedCount++
            if (!existing.sourceModuleIds.includes(selected.moduleId)) {
              existing.sourceModuleIds.push(selected.moduleId)
            }
          } else {
            mergedMap.set(childKey, childItem)
          }

          // 递归处理子模块的BOM条目（如果子模块不在selectedModules中，避免重复处理）
          if (!selectedModuleIds.has(child.id)) {
            processModuleBomItems(child, bomItemsMap.get(child.id) || [], childQty, child.id)
          }
          // 递归处理更深层级的子模块
          walkChildren(child, childQty)
        }
      }
      walkChildren(module, selected.quantity)
    }

    // 3. 遍历模块BOM中type为order或both的条目（所有选中模块都处理，包括子模块）
    processModuleBomItems(module, bomItemsMap.get(module.id) || [], selected.quantity, selected.moduleId)
  }

  /**
   * 处理单个模块的BOM条目
   * @param mod 模块（仅用于名称/ID展示与来源记录，不再读取 mod.bom）
   * @param bomItems 该模块的 BOM 条目（来自 bomItems 表）
   */
  function processModuleBomItems(mod: Module, bomItems: BomItem[], quantity: number, sourceModuleId: string) {
    if (!bomItems || bomItems.length === 0) return

    const orderItems = bomItems
      .filter((item) => item.type === 'order' || item.type === 'both')
      .sort((a, b) => a.sortOrder - b.sortOrder)

    for (const item of orderItems) {
      bomLineCount++
      // 零数量/负数量处理：跳过并记录警告
      const itemQty = item.quantity || 0
      if (itemQty <= 0) {
        skippedCount++
        warnings.push(
          `[跳过] 模块「${mod.nameZh}」中BOM条目「${item.chineseDescription || item.materialCatalogNo || item.id}」数量为${itemQty}，已跳过`
        )
        continue
      }

      // 合并key：物料目录号 + 图号 + 预留1 + 装配单位（空字段兜底）
      const key = computeMergeKey(item)
      const calculatedQty = itemQty * quantity

      if (mergedMap.has(key)) {
        // 已存在，累加数量和来源模块
        const existing = mergedMap.get(key)!
        // 合并冲突检测：对比同 key 条目与已存在条目的零件参数，不一致时记录警告（每 key 仅一次）
        if (!mergeWarnedKeys.has(key)) {
          const MERGE_COMPARE_FIELDS: Array<{ key: keyof typeof existing; label: string }> = [
            { key: 'drawingNo', label: '图号' },
            { key: 'chineseDescription', label: '中文描述' },
            { key: 'englishDescription', label: '英文描述' },
            { key: 'materialCatalogNo', label: '物料/目录号' },
            { key: 'assemblyUnit', label: '装配单位' },
            { key: 'reserved1', label: '预留1' },
            { key: 'totalAmount', label: '总金额' },
            { key: 'spareParts', label: '备件' },
            { key: 'purchasingBatch', label: '采购批次' },
            { key: 'remarks', label: '备注' },
            { key: 'ecnNo', label: 'ECN号' },
            { key: 'ifKeyParts', label: '是否关键件' }
          ]
          const diffLabels: string[] = []
          for (const { key: fk, label } of MERGE_COMPARE_FIELDS) {
            const oldVal = (existing as any)[fk]
            const newVal = (item as any)[fk]
            const oldStr = oldVal !== undefined && oldVal !== null ? String(oldVal).trim() : ''
            const newStr = newVal !== undefined && newVal !== null ? String(newVal).trim() : ''
            if (oldStr !== newStr) {
              diffLabels.push(label)
            }
          }
          if (diffLabels.length > 0) {
            mergeWarnedKeys.add(key)
            warnings.push(
              `[合并冲突] 物料「${existing.materialCatalogNo || existing.drawingNo || existing.chineseDescription}」在不同模块中参数不一致：${diffLabels.join('、')}，已保留首次出现的参数`
            )
          }
        }
        existing.quantity += calculatedQty
        mergedCount++
        if (!existing.sourceModuleIds.includes(sourceModuleId)) {
          existing.sourceModuleIds.push(sourceModuleId)
        }
        // 合并位号（如果不同）
        if (item.reserved2 && existing.reserved2 !== item.reserved2) {
          existing.reserved2 = existing.reserved2 ? `${existing.reserved2},${item.reserved2}` : item.reserved2
        }
        // 合并用户自定义动态字段（如果现有条目没有该字段，则从当前条目复制）
        const fixedFields = new Set(['id', 'moduleId', 'projectId', 'partId', 'drawingNo', 'jobNo', 'chineseDescription', 'englishDescription', 'materialCatalogNo', 'assemblyUnit', 'quantity', 'totalAmount', 'spareParts', 'reserved1', 'reserved2', 'purchasingBatch', 'remarks', 'ecnNo', 'ifKeyParts', 'type', 'source', 'sortOrder', 'sourceModuleIds', 'isModuleItem'])
        for (const fieldKey of Object.keys(item)) {
          if (!fixedFields.has(fieldKey) && item[fieldKey] !== undefined && item[fieldKey] !== '') {
            if (existing[fieldKey] === undefined || existing[fieldKey] === '') {
              existing[fieldKey] = item[fieldKey]
            }
          }
        }
      } else {
        // 新增：先构建基础字段
        const newItem: OrderBomItem = {
          id: generateId('ob'),
          partId: item.partId,
          drawingNo: item.drawingNo,
          jobNo: projectJobNo || item.jobNo,
          chineseDescription: item.chineseDescription || '',
          englishDescription: item.englishDescription,
          materialCatalogNo: item.materialCatalogNo || '',
          assemblyUnit: item.assemblyUnit,
          quantity: calculatedQty,
          totalAmount: item.totalAmount,
          spareParts: item.spareParts,
          type: item.type || 'order',
          reserved1: item.reserved1,
          reserved2: item.reserved2,
          purchasingBatch: item.purchasingBatch,
          remarks: item.remarks,
          ecnNo: item.ecnNo,
          ifKeyParts: item.ifKeyParts,
          sourceModuleIds: [sourceModuleId],
          source: 'generated',
          sortOrder: globalSortOrder++
        }
        // 复制用户自定义动态字段（排除固定字段）
        const fixedFields = new Set(['id', 'moduleId', 'projectId', 'partId', 'drawingNo', 'jobNo', 'chineseDescription', 'englishDescription', 'materialCatalogNo', 'assemblyUnit', 'quantity', 'totalAmount', 'spareParts', 'reserved1', 'reserved2', 'purchasingBatch', 'remarks', 'ecnNo', 'ifKeyParts', 'type', 'source', 'sortOrder', 'sourceModuleIds', 'isModuleItem'])
        for (const fieldKey of Object.keys(item)) {
          if (!fixedFields.has(fieldKey) && item[fieldKey] !== undefined && item[fieldKey] !== '') {
            newItem[fieldKey] = item[fieldKey]
          }
        }
        mergedMap.set(key, newItem)
      }
    }
  }

  const items = Array.from(mergedMap.values()).sort((a, b) => a.sortOrder - b.sortOrder)

  // 多配置组合验证日志：检查同一模块出现在多个选中项中的去重情况
  const moduleCountMap = new Map<string, number>()
  for (const s of selectedModules) {
    moduleCountMap.set(s.moduleId, (moduleCountMap.get(s.moduleId) || 0) + 1)
  }
  for (const [mid, cnt] of moduleCountMap) {
    if (cnt > 1) {
      warnings.push(`[验证] 模块ID ${mid} 在 ${cnt} 个选中项中重复出现，已按去重逻辑只计一次`)
    }
  }

  return {
    items,
    logs: {
      modules: selectedModules.length,
      bomLines: bomLineCount,
      merged: mergedCount,
      skipped: skippedCount,
      warnings
    }
  }
}

/**
 * 获取模块的下单BOM条目数
 * @param bomItems 该模块的 BOM 条目（来自 bomItems 表）
 */
export function getOrderItemCount(bomItems: BomItem[] | undefined | null): number {
  if (!bomItems || bomItems.length === 0) return 0
  return bomItems.filter((item) => item.type === 'order' || item.type === 'both').length
}

/**
 * 获取模块的装配BOM条目数
 * @param bomItems 该模块的 BOM 条目（来自 bomItems 表）
 */
export function getAssemblyItemCount(bomItems: BomItem[] | undefined | null): number {
  if (!bomItems || bomItems.length === 0) return 0
  return bomItems.filter((item) => item.type === 'assembly' || item.type === 'both').length
}

/**
 * BOM类型标签配置
 */
export const BOM_TYPE_CONFIG = {
  assembly: { label: '装配', type: 'primary' as const, color: '#409eff' },
  order: { label: '下单', type: 'success' as const, color: '#67c23a' },
  both: { label: '两者', type: 'warning' as const, color: '#e6a23c' }
}
