/**
 * 测试generateOrderBom函数中模块本身和BOM条目数量是否正确
 * 重点测试：模块图号与BOM条目物料编码相同时，数量是否错误累加
 */

// 模拟generateId函数
let idCounter = 0
function generateId(prefix) {
  idCounter++
  return `${prefix}_${idCounter}`
}

// 复制generateOrderBom函数的核心逻辑（修复后的版本）
function generateOrderBom(selectedModules, modules) {
  const mergedMap = new Map()
  let globalSortOrder = 1

  const selectedModuleIds = new Set(selectedModules.map((s) => s.moduleId))

  function isChildOfAnotherSelected(moduleId, visited = new Set()) {
    const mod = modules.find((m) => m.id === moduleId)
    if (!mod || !mod.parentModuleId) return false
    if (visited.has(moduleId)) return false
    visited.add(moduleId)
    if (selectedModuleIds.has(mod.parentModuleId)) return true
    return isChildOfAnotherSelected(mod.parentModuleId, visited)
  }

  function getAllChildModules(module, modules, visited = new Set()) {
    const result = []
    if (!module.childModuleIds || module.childModuleIds.length === 0) return result
    for (const childId of module.childModuleIds) {
      if (visited.has(childId)) continue
      visited.add(childId)
      const child = modules.find((m) => m.id === childId)
      if (child) {
        result.push(child)
        const grandchildren = getAllChildModules(child, modules, visited)
        result.push(...grandchildren)
      }
    }
    return result
  }

  function moduleToBomItem(module, quantity, sourceModuleId, sortOrder, isModuleItself) {
    return {
      id: generateId('ob'),
      materialCode: module.drawingNo,
      materialName: module.nameZh,
      spec: module.nameEn || '',
      unit: 'SET',
      qty: quantity,
      position: '',
      sourceModuleIds: [sourceModuleId],
      source: 'generated',
      remark: isModuleItself ? '模块本身' : '子模块',
      sortOrder
    }
  }

  for (const selected of selectedModules) {
    const module = modules.find((m) => m.id === selected.moduleId)
    if (!module) continue

    const isChildModule = isChildOfAnotherSelected(selected.moduleId)

    if (!isChildModule) {
      // 1. 模块本身（使用特殊key前缀）
      const moduleItem = moduleToBomItem(module, selected.quantity, selected.moduleId, globalSortOrder++, true)
      const moduleKey = `__module__|${moduleItem.materialCode || ''}|${moduleItem.spec || ''}|${moduleItem.unit || ''}`
      if (mergedMap.has(moduleKey)) {
        const existing = mergedMap.get(moduleKey)
        existing.qty += moduleItem.qty
      } else {
        mergedMap.set(moduleKey, moduleItem)
      }

      // 2. 子模块（使用特殊key前缀）
      const childModules = getAllChildModules(module, modules)
      for (const child of childModules) {
        // 子模块数量：优先使用子模块自己设置的数量（如果在selectedModules中），否则使用父模块的数量
        const childSelected = selectedModules.find((s) => s.moduleId === child.id)
        const childQuantity = childSelected ? childSelected.quantity : selected.quantity

        const childItem = moduleToBomItem(child, childQuantity, selected.moduleId, globalSortOrder++, false)
        const childKey = `__module__|${childItem.materialCode || ''}|${childItem.spec || ''}|${childItem.unit || ''}`
        if (mergedMap.has(childKey)) {
          const existing = mergedMap.get(childKey)
          existing.qty += childItem.qty
        } else {
          mergedMap.set(childKey, childItem)
        }

        // 2.1 处理子模块的BOM条目（如果子模块不在selectedModules中，避免重复处理）
        if (!selectedModuleIds.has(child.id)) {
          processModuleBomItems(child, childQuantity, child.id)
        }
      }
    }

    // 3. 处理当前模块的BOM条目
    processModuleBomItems(module, selected.quantity, selected.moduleId)
  }

  function processModuleBomItems(mod, quantity, sourceModuleId) {
    if (!mod.bom || !mod.bom.items) return

    const orderItems = mod.bom.items
      .filter((item) => item.type === 'order' || item.type === 'both')
      .sort((a, b) => a.sortOrder - b.sortOrder)

    for (const item of orderItems) {
      const key = `${item.materialCode || ''}|${item.spec || ''}|${item.unit || ''}`
      const calculatedQty = (item.qty || 0) * quantity

      if (mergedMap.has(key)) {
        const existing = mergedMap.get(key)
        existing.qty += calculatedQty
      } else {
        const newItem = {
          id: generateId('ob'),
          materialCode: item.materialCode || '',
          materialName: item.materialName || '',
          spec: item.spec,
          unit: item.unit,
          qty: calculatedQty,
          position: item.position,
          sourceModuleIds: [sourceModuleId],
          source: 'generated',
          remark: item.remark,
          sortOrder: globalSortOrder++
        }
        mergedMap.set(key, newItem)
      }
    }
  }

  return Array.from(mergedMap.values()).sort((a, b) => a.sortOrder - b.sortOrder)
}

// ==================== 测试用例 ====================

console.log('╔══════════════════════════════════════════════════════════════╗')
console.log('║           下单BOM生成 - 模块与BOM条目数量测试                 ║')
console.log('╚══════════════════════════════════════════════════════════════╝')

// 测试1：模块图号与BOM条目物料编码相同（关键测试）
console.log('\n========== 测试1：模块图号与BOM条目物料编码相同 ==========')

const testModules1 = [
  {
    id: 'mod001',
    drawingNo: 'M-001',
    nameZh: '测试模块',
    nameEn: 'Test Module',
    childModuleIds: [],
    bom: {
      moduleId: 'mod001',
      items: [
        {
          id: 'b001',
          materialCode: 'M-001',
          materialName: '测试物料',
          spec: '规格A',
          unit: 'PCS',
          qty: 5,
          type: 'order',
          source: 'manual',
          sortOrder: 1
        }
      ]
    }
  }
]

const testSelected1 = [
  { moduleId: 'mod001', quantity: 2 }
]

const result1 = generateOrderBom(testSelected1, testModules1)

console.log(`选中模块：mod001 x2`)
console.log(`模块图号：M-001，模块数量：2`)
console.log(`BOM条目：物料编码M-001，数量5，类型order`)
console.log(`\n生成的下单BOM条目数：${result1.length}`)
console.log(`条目列表：`)
result1.forEach((item, idx) => {
  console.log(`  ${idx + 1}. ${item.materialCode} - ${item.materialName} x${item.qty} (${item.remark || 'BOM条目'})`)
})

const moduleItem1 = result1.find((r) => r.remark === '模块本身')
const bomItem1 = result1.find((r) => r.remark !== '模块本身' && r.remark !== '子模块')

let test1Passed = true
if (result1.length !== 2) {
  console.log(`\n✗ 测试失败：预期2个条目，实际${result1.length}个（模块本身和BOM条目被错误合并了）`)
  test1Passed = false
}
if (moduleItem1 && moduleItem1.qty !== 2) {
  console.log(`✗ 测试失败：模块本身数量预期2，实际${moduleItem1.qty}`)
  test1Passed = false
}
if (bomItem1 && bomItem1.qty !== 10) {
  console.log(`✗ 测试失败：BOM条目数量预期10，实际${bomItem1.qty}`)
  test1Passed = false
}

if (test1Passed) {
  console.log(`\n✓ 测试通过：模块本身(数量2)和BOM条目(数量10)正确分离，没有错误合并`)
}

// 测试2：正常情况（模块图号与BOM条目物料编码不同）
console.log('\n========== 测试2：正常情况（模块图号与BOM条目物料编码不同） ==========')

const testModules2 = [
  {
    id: 'mod001',
    drawingNo: 'ASM-001',
    nameZh: '主机模块',
    nameEn: 'Main Module',
    childModuleIds: ['mod002'],
    bom: {
      moduleId: 'mod001',
      items: [
        { id: 'b001', materialCode: 'M-001', materialName: '主机架', spec: '304不锈钢', unit: 'SET', qty: 1, type: 'both', source: 'manual', sortOrder: 1 },
        { id: 'b002', materialCode: 'STD-001', materialName: '螺栓', spec: 'M8', unit: 'PCS', qty: 10, type: 'order', source: 'manual', sortOrder: 2 }
      ]
    }
  },
  {
    id: 'mod002',
    drawingNo: 'ASM-002',
    nameZh: '子模块',
    nameEn: 'Child Module',
    parentModuleId: 'mod001',
    childModuleIds: [],
    bom: {
      moduleId: 'mod002',
      items: [
        { id: 'b003', materialCode: 'STD-001', materialName: '螺栓', spec: 'M8', unit: 'PCS', qty: 5, type: 'order', source: 'manual', sortOrder: 1 }
      ]
    }
  }
]

const testSelected2 = [
  { moduleId: 'mod001', quantity: 2 }
]

const result2 = generateOrderBom(testSelected2, testModules2)

console.log(`选中模块：mod001 x2（含子模块mod002）`)
console.log(`\n生成的下单BOM条目数：${result2.length}`)
console.log(`条目列表：`)
result2.forEach((item, idx) => {
  console.log(`  ${idx + 1}. ${item.materialCode} - ${item.materialName} x${item.qty} (${item.remark || 'BOM条目'})`)
})

const moduleItem2 = result2.find((r) => r.remark === '模块本身')
const childItem2 = result2.find((r) => r.remark === '子模块')
const boltItem2 = result2.find((r) => r.materialCode === 'STD-001')
const frameItem2 = result2.find((r) => r.materialCode === 'M-001')

let test2Passed = true
if (result2.length !== 4) {
  console.log(`\n✗ 测试失败：预期4个条目（模块本身+子模块+主机架+螺栓），实际${result2.length}个`)
  test2Passed = false
}
if (moduleItem2 && moduleItem2.qty !== 2) {
  console.log(`✗ 测试失败：模块本身数量预期2，实际${moduleItem2.qty}`)
  test2Passed = false
}
if (childItem2 && childItem2.qty !== 2) {
  console.log(`✗ 测试失败：子模块数量预期2，实际${childItem2.qty}`)
  test2Passed = false
}
if (frameItem2 && frameItem2.qty !== 2) {
  console.log(`✗ 测试失败：主机架数量预期2，实际${frameItem2.qty}`)
  test2Passed = false
}
if (boltItem2 && boltItem2.qty !== 30) {
  console.log(`✗ 测试失败：螺栓数量预期30，实际${boltItem2.qty}`)
  test2Passed = false
}

if (test2Passed) {
  console.log(`\n✓ 测试通过：所有条目数量正确（模块本身2，子模块2，主机架2，螺栓30）`)
}

// 测试3：多个模块选中，相同BOM条目合并
console.log('\n========== 测试3：多个模块选中，相同BOM条目合并 ==========')

const testModules3 = [
  {
    id: 'mod001',
    drawingNo: 'ASM-001',
    nameZh: '模块A',
    childModuleIds: [],
    bom: {
      moduleId: 'mod001',
      items: [
        { id: 'b001', materialCode: 'STD-001', materialName: '螺栓', spec: 'M8', unit: 'PCS', qty: 10, type: 'order', source: 'manual', sortOrder: 1 }
      ]
    }
  },
  {
    id: 'mod002',
    drawingNo: 'ASM-002',
    nameZh: '模块B',
    childModuleIds: [],
    bom: {
      moduleId: 'mod002',
      items: [
        { id: 'b002', materialCode: 'STD-001', materialName: '螺栓', spec: 'M8', unit: 'PCS', qty: 5, type: 'order', source: 'manual', sortOrder: 1 }
      ]
    }
  }
]

const testSelected3 = [
  { moduleId: 'mod001', quantity: 1 },
  { moduleId: 'mod002', quantity: 2 }
]

const result3 = generateOrderBom(testSelected3, testModules3)

console.log(`选中模块：mod001 x1, mod002 x2`)
console.log(`模块A螺栓数量：10，模块B螺栓数量：5`)
console.log(`\n生成的下单BOM条目数：${result3.length}`)
console.log(`条目列表：`)
result3.forEach((item, idx) => {
  console.log(`  ${idx + 1}. ${item.materialCode} - ${item.materialName} x${item.qty} (${item.remark || 'BOM条目'})`)
})

const boltItem3 = result3.find((r) => r.materialCode === 'STD-001')
const moduleItems3 = result3.filter((r) => r.remark === '模块本身')

let test3Passed = true
if (result3.length !== 3) {
  console.log(`\n✗ 测试失败：预期3个条目，实际${result3.length}个`)
  test3Passed = false
}
if (boltItem3 && boltItem3.qty !== 20) {
  console.log(`✗ 测试失败：螺栓合并数量预期20，实际${boltItem3.qty}`)
  test3Passed = false
}
if (moduleItems3.length !== 2) {
  console.log(`✗ 测试失败：预期2个模块本身条目，实际${moduleItems3.length}个`)
  test3Passed = false
}

if (test3Passed) {
  console.log(`\n✓ 测试通过：螺栓正确合并（数量20），模块本身正确分离（2个）`)
}

// 测试4：子模块自己设置数量（关键测试）
console.log('\n========== 测试4：子模块自己设置数量 ==========')

const testModules4 = [
  {
    id: 'mod001',
    drawingNo: 'ASM-001',
    nameZh: '父模块',
    nameEn: 'Parent Module',
    childModuleIds: ['mod002'],
    bom: {
      moduleId: 'mod001',
      items: [
        { id: 'b001', materialCode: 'M-001', materialName: '父模块零件', spec: 'A', unit: 'PCS', qty: 10, type: 'order', source: 'manual', sortOrder: 1 }
      ]
    }
  },
  {
    id: 'mod002',
    drawingNo: 'ASM-002',
    nameZh: '子模块',
    nameEn: 'Child Module',
    parentModuleId: 'mod001',
    childModuleIds: [],
    bom: {
      moduleId: 'mod002',
      items: [
        { id: 'b002', materialCode: 'M-002', materialName: '子模块零件', spec: 'B', unit: 'PCS', qty: 5, type: 'order', source: 'manual', sortOrder: 1 }
      ]
    }
  }
]

// 父模块数量1，子模块自己设置数量3
const testSelected4 = [
  { moduleId: 'mod001', quantity: 1 },
  { moduleId: 'mod002', quantity: 3 }
]

const result4 = generateOrderBom(testSelected4, testModules4)

console.log(`选中模块：mod001 x1（父模块），mod002 x3（子模块，自己设置数量）`)
console.log(`\n生成的下单BOM条目数：${result4.length}`)
console.log(`条目列表：`)
result4.forEach((item, idx) => {
  console.log(`  ${idx + 1}. ${item.materialCode} - ${item.materialName} x${item.qty} (${item.remark || 'BOM条目'})`)
})

const parentModuleItem4 = result4.find((r) => r.remark === '模块本身')
const childModuleItem4 = result4.find((r) => r.remark === '子模块')
const parentPartItem4 = result4.find((r) => r.materialCode === 'M-001')
const childPartItem4 = result4.find((r) => r.materialCode === 'M-002')

let test4Passed = true
if (result4.length !== 4) {
  console.log(`\n✗ 测试失败：预期4个条目（父模块本身+子模块本身+父模块零件+子模块零件），实际${result4.length}个`)
  test4Passed = false
}
if (parentModuleItem4 && parentModuleItem4.qty !== 1) {
  console.log(`✗ 测试失败：父模块本身数量预期1，实际${parentModuleItem4.qty}`)
  test4Passed = false
}
if (childModuleItem4 && childModuleItem4.qty !== 3) {
  console.log(`✗ 测试失败：子模块本身数量预期3（子模块自己设置的数量），实际${childModuleItem4.qty}`)
  test4Passed = false
}
if (parentPartItem4 && parentPartItem4.qty !== 10) {  // 10 * 1 = 10
  console.log(`✗ 测试失败：父模块零件数量预期10，实际${parentPartItem4.qty}`)
  test4Passed = false
}
if (childPartItem4 && childPartItem4.qty !== 15) {  // 5 * 3 = 15
  console.log(`✗ 测试失败：子模块零件数量预期15（5*3），实际${childPartItem4.qty}`)
  test4Passed = false
}

if (test4Passed) {
  console.log(`\n✓ 测试通过：子模块本身数量使用子模块自己设置的数量(3)，子模块零件数量正确(15)`)
}

// ==================== 测试结果汇总 ====================
console.log('\n╔══════════════════════════════════════════════════════════════╗')
console.log('║                        测试结果汇总                            ║')
console.log('╠══════════════════════════════════════════════════════════════╣')

const allPassed = test1Passed && test2Passed && test3Passed && test4Passed
console.log(`║  测试1（key冲突修复）：${test1Passed ? '✓ 通过' : '✗ 失败'}                              ║`)
console.log(`║  测试2（正常情况）：${test2Passed ? '✓ 通过' : '✗ 失败'}                                ║`)
console.log(`║  测试3（多模块合并）：${test3Passed ? '✓ 通过' : '✗ 失败'}                              ║`)
console.log(`║  测试4（子模块自定义数量）：${test4Passed ? '✓ 通过' : '✗ 失败'}                        ║`)
console.log('╚══════════════════════════════════════════════════════════════╝')

if (allPassed) {
  console.log('\n🎉 所有测试通过！模块本身和BOM条目数量计算正确，key冲突问题已修复。')
} else {
  console.log('\n⚠️  部分测试失败，请检查相关逻辑。')
}
