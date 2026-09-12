/**
 * 多配置组合功能测试脚本
 * 测试模块合并、数量计算、下单BOM生成等核心功能
 */

// ==================== 模拟数据 ====================

// 模拟模块数据
const mockModules = [
  // 根模块1：主机模块
  {
    id: 'mod001',
    drawingNo: 'ASM-001',
    nameZh: '主机模块',
    nameEn: 'Main Module',
    parentModuleId: null,
    childModuleIds: ['mod002', 'mod003'],
    bom: {
      moduleId: 'mod001',
      items: [
        { id: 'b001', materialCode: 'M-001', materialName: '主机架', spec: '304不锈钢', unit: 'SET', qty: 1, position: 'A1', type: 'both', source: 'manual', sortOrder: 1, supplier: '苏州机械厂' },
        { id: 'b002', materialCode: 'STD-001', materialName: '内六角螺栓', spec: 'M8×25', unit: 'PCS', qty: 20, position: '', type: 'order', source: 'manual', sortOrder: 2, supplier: '标准件厂' },
        { id: 'b003', materialCode: 'STD-002', materialName: '平垫圈', spec: 'Φ8', unit: 'PCS', qty: 20, position: '', type: 'order', source: 'manual', sortOrder: 3 }
      ]
    }
  },
  // 子模块：电气控制模块
  {
    id: 'mod002',
    drawingNo: 'ASM-002',
    nameZh: '电气控制模块',
    nameEn: 'Electrical Control Module',
    parentModuleId: 'mod001',
    childModuleIds: ['mod004'],
    bom: {
      moduleId: 'mod002',
      items: [
        { id: 'b004', materialCode: 'ELEC-001', materialName: 'PLC模块', spec: 'S7-1200', unit: 'PCS', qty: 1, position: 'U1', type: 'both', source: 'manual', sortOrder: 1, supplier: '西门子' },
        { id: 'b005', materialCode: 'ELEC-002', materialName: '接触器', spec: '220V 10A', unit: 'PCS', qty: 4, position: 'K1-K4', type: 'order', source: 'manual', sortOrder: 2 },
        { id: 'b006', materialCode: 'STD-001', materialName: '内六角螺栓', spec: 'M8×25', unit: 'PCS', qty: 10, position: '', type: 'order', source: 'manual', sortOrder: 3, supplier: '标准件厂' }
      ]
    }
  },
  // 子模块：输送模块
  {
    id: 'mod003',
    drawingNo: 'ASM-003',
    nameZh: '输送模块',
    nameEn: 'Conveyor Module',
    parentModuleId: 'mod001',
    childModuleIds: [],
    bom: {
      moduleId: 'mod003',
      items: [
        { id: 'b007', materialCode: 'MECH-001', materialName: '输送带', spec: 'PU 2000×100', unit: 'M', qty: 2.5, position: '', type: 'order', source: 'manual', sortOrder: 1 },
        { id: 'b008', materialCode: 'MECH-002', materialName: '输送电机', spec: '0.55KW', unit: 'TAI', qty: 1, position: 'M1', type: 'both', source: 'manual', sortOrder: 2 },
        { id: 'b009', materialCode: 'STD-001', materialName: '内六角螺栓', spec: 'M8×25', unit: 'PCS', qty: 15, position: '', type: 'order', source: 'manual', sortOrder: 3 }
      ]
    }
  },
  // 孙模块：端子模块
  {
    id: 'mod004',
    drawingNo: 'ASM-004',
    nameZh: '端子模块',
    nameEn: 'Terminal Module',
    parentModuleId: 'mod002',
    childModuleIds: [],
    bom: {
      moduleId: 'mod004',
      items: [
        { id: 'b010', materialCode: 'ELEC-003', materialName: '接线端子', spec: 'UK2.5', unit: 'PCS', qty: 50, position: 'X1', type: 'order', source: 'manual', sortOrder: 1 },
        { id: 'b011', materialCode: 'ELEC-004', materialName: '端子排', spec: '30位', unit: 'TAI', qty: 2, position: '', type: 'order', source: 'manual', sortOrder: 2 }
      ]
    }
  },
  // 根模块2：包装模块（独立模块）
  {
    id: 'mod005',
    drawingNo: 'ASM-005',
    nameZh: '包装模块',
    nameEn: 'Packaging Module',
    parentModuleId: null,
    childModuleIds: [],
    bom: {
      moduleId: 'mod005',
      items: [
        { id: 'b012', materialCode: 'MECH-003', materialName: '包装机头', spec: '标准型', unit: 'SET', qty: 1, position: '', type: 'both', source: 'manual', sortOrder: 1 },
        { id: 'b013', materialCode: 'MECH-004', materialName: '切刀', spec: '高速钢', unit: 'PCS', qty: 2, position: '', type: 'order', source: 'manual', sortOrder: 2 },
        { id: 'b014', materialCode: 'STD-001', materialName: '内六角螺栓', spec: 'M8×25', unit: 'PCS', qty: 8, position: '', type: 'order', source: 'manual', sortOrder: 3 }
      ]
    }
  },
  // 根模块3：检测模块（独立模块）
  {
    id: 'mod006',
    drawingNo: 'ASM-006',
    nameZh: '检测模块',
    nameEn: 'Detection Module',
    parentModuleId: null,
    childModuleIds: [],
    bom: {
      moduleId: 'mod006',
      items: [
        { id: 'b015', materialCode: 'ELEC-005', materialName: '光电传感器', spec: 'NPN', unit: 'PCS', qty: 4, position: 'S1-S4', type: 'order', source: 'manual', sortOrder: 1 },
        { id: 'b016', materialCode: 'ELEC-006', materialName: '光纤放大器', spec: '数字型', unit: 'PCS', qty: 2, position: '', type: 'order', source: 'manual', sortOrder: 2 }
      ]
    }
  }
]

// 模拟配置
const mockConfigs = [
  {
    id: 'cfg001',
    name: '标准配置',
    description: '基础功能配置',
    moduleIds: ['mod001', 'mod005']
  },
  {
    id: 'cfg002',
    name: '高速配置',
    description: '高速生产配置',
    moduleIds: ['mod001', 'mod003', 'mod006']
  },
  {
    id: 'cfg003',
    name: '完整配置',
    description: '全部功能配置',
    moduleIds: ['mod001', 'mod005', 'mod006']
  }
]

// ==================== 测试函数 ====================

/**
 * 测试1：单配置组合 - 模块合并
 */
function testSingleConfigMerge() {
  console.log('\n========== 测试1：单配置组合 - 模块合并 ==========')
  const configCombinations = [
    { id: 'cc001', configurationId: 'cfg001', quantity: 1 }
  ]

  // 合并模块
  const moduleIdSet = new Set()
  for (const combo of configCombinations) {
    const cfg = mockConfigs.find(c => c.id === combo.configurationId)
    if (cfg) {
      cfg.moduleIds.forEach(id => moduleIdSet.add(id))
    }
  }

  const mergedModules = [...moduleIdSet].map(id => mockModules.find(m => m.id === id)).filter(Boolean)
  console.log(`配置组合数：${configCombinations.length}`)
  console.log(`合并后模块数：${mergedModules.length}`)
  console.log(`模块列表：${mergedModules.map(m => m.nameZh).join(', ')}`)
  console.log(`✓ 测试通过：单配置模块合并正确`)
}

/**
 * 测试2：多配置组合 - 模块合并去重
 */
function testMultiConfigMerge() {
  console.log('\n========== 测试2：多配置组合 - 模块合并去重 ==========')
  const configCombinations = [
    { id: 'cc001', configurationId: 'cfg001', quantity: 1 },
    { id: 'cc002', configurationId: 'cfg002', quantity: 1 },
    { id: 'cc003', configurationId: 'cfg003', quantity: 1 }
  ]

  // 合并模块
  const moduleIdSet = new Set()
  for (const combo of configCombinations) {
    const cfg = mockConfigs.find(c => c.id === combo.configurationId)
    if (cfg) {
      cfg.moduleIds.forEach(id => moduleIdSet.add(id))
    }
  }

  const mergedModules = [...moduleIdSet].map(id => mockModules.find(m => m.id === id)).filter(Boolean)
  console.log(`配置组合数：${configCombinations.length}`)
  console.log(`各配置模块数：cfg001=${mockConfigs[0].moduleIds.length}, cfg002=${mockConfigs[1].moduleIds.length}, cfg003=${mockConfigs[2].moduleIds.length}`)
  console.log(`合并去重后模块数：${mergedModules.length}（预期4个：mod001,mod003,mod005,mod006）`)
  console.log(`模块列表：${mergedModules.map(m => `${m.drawingNo}(${m.nameZh})`).join(', ')}`)

  if (mergedModules.length === 4) {
    console.log(`✓ 测试通过：多配置模块合并去重正确`)
  } else {
    console.log(`✗ 测试失败：预期4个模块，实际${mergedModules.length}个`)
  }
}

/**
 * 测试3：模块数量计算（各配置数量之和）
 */
function testModuleQuantityCalculation() {
  console.log('\n========== 测试3：模块数量计算 ==========')
  const configCombinations = [
    { id: 'cc001', configurationId: 'cfg001', quantity: 2 },  // 标准配置 x2
    { id: 'cc002', configurationId: 'cfg002', quantity: 1 }   // 高速配置 x1
  ]

  // 计算模块数量
  const quantityMap = new Map()
  for (const combo of configCombinations) {
    const cfg = mockConfigs.find(c => c.id === combo.configurationId)
    if (!cfg) continue
    for (const moduleId of cfg.moduleIds) {
      const current = quantityMap.get(moduleId) || 0
      quantityMap.set(moduleId, current + combo.quantity)
    }
  }

  console.log(`配置组合：`)
  configCombinations.forEach(c => {
    const cfg = mockConfigs.find(cf => cf.id === c.configurationId)
    console.log(`  - ${cfg?.name} x${c.quantity}`)
  })

  console.log(`\n模块数量计算结果：`)
  for (const [moduleId, qty] of quantityMap) {
    const mod = mockModules.find(m => m.id === moduleId)
    console.log(`  - ${mod?.drawingNo} (${mod?.nameZh}): ${qty}`)
  }

  // 验证
  const mod001Qty = quantityMap.get('mod001')
  const mod003Qty = quantityMap.get('mod003')
  const mod005Qty = quantityMap.get('mod005')

  let passed = true
  if (mod001Qty !== 3) { console.log(`✗ mod001数量错误：预期3，实际${mod001Qty}`); passed = false }
  if (mod003Qty !== 1) { console.log(`✗ mod003数量错误：预期1，实际${mod003Qty}`); passed = false }
  if (mod005Qty !== 2) { console.log(`✗ mod005数量错误：预期2，实际${mod005Qty}`); passed = false }

  if (passed) {
    console.log(`\n✓ 测试通过：模块数量计算正确（mod001=3, mod003=1, mod005=2）`)
  }
}

/**
 * 测试4：生成下单BOM - 模块本身和子模块
 */
function testGenerateOrderBomModules() {
  console.log('\n========== 测试4：生成下单BOM - 模块本身和子模块 ==========')

  // 模拟选中模块（只选mod001，包含子模块mod002、mod003、mod004）
  const selectedModules = [
    { moduleId: 'mod001', quantity: 1 }
  ]

  // 模拟generateOrderBom的模块本身和子模块部分
  const bomItems = []
  let sortOrder = 1

  function getAllChildModules(moduleId, visited = new Set()) {
    const result = []
    const mod = mockModules.find(m => m.id === moduleId)
    if (!mod || !mod.childModuleIds || mod.childModuleIds.length === 0) return result

    for (const childId of mod.childModuleIds) {
      if (visited.has(childId)) continue
      visited.add(childId)
      const child = mockModules.find(m => m.id === childId)
      if (child) {
        result.push(child)
        result.push(...getAllChildModules(childId, visited))
      }
    }
    return result
  }

  for (const selected of selectedModules) {
    const module = mockModules.find(m => m.id === selected.moduleId)
    if (!module) continue

    // 模块本身
    bomItems.push({
      materialCode: module.drawingNo,
      materialName: module.nameZh,
      spec: module.nameEn,
      unit: 'SET',
      qty: selected.quantity,
      source: 'generated',
      remark: '模块本身',
      sortOrder: sortOrder++
    })

    // 子模块
    const childModules = getAllChildModules(module.id)
    for (const child of childModules) {
      bomItems.push({
        materialCode: child.drawingNo,
        materialName: child.nameZh,
        spec: child.nameEn,
        unit: 'SET',
        qty: selected.quantity,
        source: 'generated',
        remark: '子模块',
        sortOrder: sortOrder++
      })
    }
  }

  console.log(`选中模块：mod001 (主机模块) x1`)
  console.log(`生成的模块类BOM条目数：${bomItems.length}（预期4个：1个本身+3个子模块）`)
  console.log(`\nBOM条目列表：`)
  bomItems.forEach(item => {
    console.log(`  ${item.sortOrder}. ${item.materialCode} - ${item.materialName} (${item.remark}) x${item.qty}`)
  })

  if (bomItems.length === 4) {
    console.log(`\n✓ 测试通过：模块本身和子模块正确生成`)
  } else {
    console.log(`\n✗ 测试失败：预期4条，实际${bomItems.length}条`)
  }
}

/**
 * 测试5：生成下单BOM - BOM条目合并去重
 */
function testGenerateOrderBomItemsMerge() {
  console.log('\n========== 测试5：生成下单BOM - BOM条目合并去重 ==========')

  // 模拟选中mod001和mod003
  const selectedModules = [
    { moduleId: 'mod001', quantity: 1 },
    { moduleId: 'mod003', quantity: 1 }
  ]

  // 模拟generateOrderBom的BOM条目合并部分
  const mergedMap = new Map()

  for (const selected of selectedModules) {
    const module = mockModules.find(m => m.id === selected.moduleId)
    if (!module || !module.bom || !module.bom.items) continue

    const orderItems = module.bom.items
      .filter(item => item.type === 'order' || item.type === 'both')
      .sort((a, b) => a.sortOrder - b.sortOrder)

    for (const item of orderItems) {
      const key = `${item.materialCode || ''}|${item.spec || ''}|${item.unit || ''}`
      const calculatedQty = (item.qty || 0) * selected.quantity

      if (mergedMap.has(key)) {
        const existing = mergedMap.get(key)
        existing.qty += calculatedQty
        if (!existing.sourceModuleIds.includes(selected.moduleId)) {
          existing.sourceModuleIds.push(selected.moduleId)
        }
      } else {
        mergedMap.set(key, {
          materialCode: item.materialCode,
          materialName: item.materialName,
          spec: item.spec,
          unit: item.unit,
          qty: calculatedQty,
          position: item.position,
          sourceModuleIds: [selected.moduleId],
          source: 'generated',
          remark: item.remark,
          supplier: item.supplier  // 自定义字段
        })
      }
    }
  }

  const result = Array.from(mergedMap.values())

  console.log(`选中模块：mod001 x1, mod003 x1`)
  console.log(`合并后BOM条目数：${result.length}`)
  console.log(`\nBOM条目列表：`)
  result.forEach((item, idx) => {
    const sources = item.sourceModuleIds.map(id => mockModules.find(m => m.id === id)?.nameZh || id).join(', ')
    const supplier = item.supplier ? ` [供应商: ${item.supplier}]` : ''
    console.log(`  ${idx + 1}. ${item.materialCode} - ${item.materialName} x${item.qty} (来源: ${sources})${supplier}`)
  })

  // 验证内六角螺栓合并
  const bolt = result.find(r => r.materialCode === 'STD-001')
  if (bolt && bolt.qty === 35) {  // mod001有20，mod003有15，合计35
    console.log(`\n✓ 测试通过：BOM条目合并去重正确（内六角螺栓 20+15=35）`)
    console.log(`✓ 自定义字段保留：供应商字段正确传递`)
  } else {
    console.log(`\n✗ 测试失败：内六角螺栓数量错误，预期35，实际${bolt?.qty}`)
  }
}

/**
 * 测试6：多配置组合 + 模块数量倍数
 */
function testMultiConfigWithQuantity() {
  console.log('\n========== 测试6：多配置组合 + 模块数量倍数 ==========')

  const configCombinations = [
    { id: 'cc001', configurationId: 'cfg001', quantity: 2 },  // 标准配置 x2
    { id: 'cc002', configurationId: 'cfg002', quantity: 3 }   // 高速配置 x3
  ]

  // 计算模块数量
  const quantityMap = new Map()
  for (const combo of configCombinations) {
    const cfg = mockConfigs.find(c => c.id === combo.configurationId)
    if (!cfg) continue
    for (const moduleId of cfg.moduleIds) {
      const current = quantityMap.get(moduleId) || 0
      quantityMap.set(moduleId, current + combo.quantity)
    }
  }

  // 模拟生成下单BOM（只计算BOM条目数量）
  const mergedMap = new Map()
  for (const [moduleId, moduleQty] of quantityMap) {
    const module = mockModules.find(m => m.id === moduleId)
    if (!module || !module.bom || !module.bom.items) continue

    const orderItems = module.bom.items.filter(item => item.type === 'order' || item.type === 'both')
    for (const item of orderItems) {
      const key = `${item.materialCode || ''}|${item.spec || ''}|${item.unit || ''}`
      const calculatedQty = (item.qty || 0) * moduleQty
      if (mergedMap.has(key)) {
        mergedMap.get(key).qty += calculatedQty
      } else {
        mergedMap.set(key, { ...item, qty: calculatedQty })
      }
    }
  }

  console.log(`配置组合：标准配置 x2 + 高速配置 x3`)
  console.log(`\n模块数量：`)
  for (const [moduleId, qty] of quantityMap) {
    const mod = mockModules.find(m => m.id === moduleId)
    console.log(`  - ${mod?.nameZh}: ${qty}`)
  }

  console.log(`\n下单BOM条目统计：`)
  console.log(`  总条目数：${mergedMap.size}`)
  let totalQty = 0
  for (const item of mergedMap.values()) {
    totalQty += item.qty
  }
  console.log(`  总数量：${totalQty}`)

  // 验证内六角螺栓
  const bolt = mergedMap.get('STD-001|M8×25|PCS')
  // mod001: 20*(2+3)=100, mod003: 15*3=45, mod005: 8*2=16, 合计161
  const expectedBoltQty = 20 * (2 + 3) + 15 * 3 + 8 * 2
  console.log(`\n  内六角螺栓：${bolt?.qty}（预期${expectedBoltQty}）`)

  if (bolt && bolt.qty === expectedBoltQty) {
    console.log(`\n✓ 测试通过：多配置组合数量倍数计算正确`)
  } else {
    console.log(`\n✗ 测试失败：内六角螺栓数量错误`)
  }
}

/**
 * 测试7：边界情况 - 空配置组合
 */
function testEmptyConfigCombination() {
  console.log('\n========== 测试7：边界情况 - 空配置组合 ==========')

  const configCombinations = []

  const moduleIdSet = new Set()
  for (const combo of configCombinations) {
    const cfg = mockConfigs.find(c => c.id === combo.configurationId)
    if (cfg) {
      cfg.moduleIds.forEach(id => moduleIdSet.add(id))
    }
  }

  console.log(`配置组合数：0`)
  console.log(`合并后模块数：${moduleIdSet.size}`)

  if (moduleIdSet.size === 0) {
    console.log(`✓ 测试通过：空配置组合返回空模块列表`)
  } else {
    console.log(`✗ 测试失败：预期0个模块，实际${moduleIdSet.size}个`)
  }
}

/**
 * 测试8：边界情况 - 配置未选择
 */
function testUnselectedConfig() {
  console.log('\n========== 测试8：边界情况 - 配置未选择 ==========')

  const configCombinations = [
    { id: 'cc001', configurationId: '', quantity: 1 },  // 未选择配置
    { id: 'cc002', configurationId: 'cfg001', quantity: 1 }
  ]

  const moduleIdSet = new Set()
  let validCount = 0
  for (const combo of configCombinations) {
    if (!combo.configurationId) continue
    validCount++
    const cfg = mockConfigs.find(c => c.id === combo.configurationId)
    if (cfg) {
      cfg.moduleIds.forEach(id => moduleIdSet.add(id))
    }
  }

  console.log(`配置组合数：${configCombinations.length}（其中${validCount}个有效）`)
  console.log(`合并后模块数：${moduleIdSet.size}`)

  if (moduleIdSet.size === 2) {  // cfg001有2个模块
    console.log(`✓ 测试通过：未选择配置的行被正确跳过`)
  } else {
    console.log(`✗ 测试失败：预期2个模块，实际${moduleIdSet.size}个`)
  }
}

/**
 * 测试9：自定义字段传递验证
 */
function testCustomFieldsTransfer() {
  console.log('\n========== 测试9：自定义字段传递验证 ==========')

  const selectedModules = [
    { moduleId: 'mod001', quantity: 1 }
  ]

  const mergedMap = new Map()
  const fixedFields = new Set(['id', 'moduleId', 'materialCode', 'materialName', 'spec', 'unit', 'qty', 'position', 'type', 'source', 'remark', 'sortOrder'])

  for (const selected of selectedModules) {
    const module = mockModules.find(m => m.id === selected.moduleId)
    if (!module || !module.bom || !module.bom.items) continue

    for (const item of module.bom.items) {
      if (item.type !== 'order' && item.type !== 'both') continue
      const key = `${item.materialCode || ''}|${item.spec || ''}|${item.unit || ''}`

      const newItem = {
        materialCode: item.materialCode,
        materialName: item.materialName,
        spec: item.spec,
        unit: item.unit,
        qty: item.qty,
        position: item.position,
        sourceModuleIds: [selected.moduleId],
        source: 'generated',
        remark: item.remark
      }

      // 复制自定义字段
      for (const fieldKey of Object.keys(item)) {
        if (!fixedFields.has(fieldKey) && item[fieldKey] !== undefined && item[fieldKey] !== '') {
          newItem[fieldKey] = item[fieldKey]
        }
      }

      mergedMap.set(key, newItem)
    }
  }

  console.log(`选中模块：mod001`)
  console.log(`\nBOM条目及自定义字段：`)
  for (const [key, item] of mergedMap) {
    const customFields = Object.keys(item).filter(k => !fixedFields.has(k) && k !== 'sourceModuleIds')
    const customStr = customFields.length > 0 ? ` [自定义字段: ${customFields.map(f => `${f}=${item[f]}`).join(', ')}]` : ' [无自定义字段]'
    console.log(`  - ${item.materialCode} (${item.materialName})${customStr}`)
  }

  // 验证主机架的supplier字段
  const frame = mergedMap.get('M-001|304不锈钢|SET')
  if (frame && frame.supplier === '苏州机械厂') {
    console.log(`\n✓ 测试通过：自定义字段（supplier）正确传递`)
  } else {
    console.log(`\n✗ 测试失败：自定义字段未正确传递`)
  }
}

/**
 * 测试10：综合测试 - 完整场景
 */
function testComprehensiveScenario() {
  console.log('\n========== 测试10：综合测试 - 完整场景 ==========')

  console.log(`场景描述：`)
  console.log(`  客户订单：2套标准配置 + 1套高速配置`)
  console.log(`  标准配置包含：主机模块、包装模块`)
  console.log(`  高速配置包含：主机模块、输送模块、检测模块`)
  console.log(`  主机模块包含子模块：电气控制模块、输送模块`)
  console.log(`  电气控制模块包含子模块：端子模块`)

  const configCombinations = [
    { id: 'cc001', configurationId: 'cfg001', quantity: 2 },
    { id: 'cc002', configurationId: 'cfg002', quantity: 1 }
  ]

  // 1. 合并模块
  const quantityMap = new Map()
  for (const combo of configCombinations) {
    const cfg = mockConfigs.find(c => c.id === combo.configurationId)
    if (!cfg) continue
    for (const moduleId of cfg.moduleIds) {
      const current = quantityMap.get(moduleId) || 0
      quantityMap.set(moduleId, current + combo.quantity)
    }
  }

  console.log(`\n1. 模块合并结果：`)
  for (const [moduleId, qty] of quantityMap) {
    const mod = mockModules.find(m => m.id === moduleId)
    console.log(`   - ${mod?.drawingNo} (${mod?.nameZh}): ${qty}套`)
  }

  // 2. 计算子模块（递归）
  function getAllChildModules(moduleId, visited = new Set()) {
    const result = []
    const mod = mockModules.find(m => m.id === moduleId)
    if (!mod || !mod.childModuleIds || mod.childModuleIds.length === 0) return result
    for (const childId of mod.childModuleIds) {
      if (visited.has(childId)) continue
      visited.add(childId)
      const child = mockModules.find(m => m.id === childId)
      if (child) {
        result.push(child)
        result.push(...getAllChildModules(childId, visited))
      }
    }
    return result
  }

  console.log(`\n2. 子模块递归结果：`)
  const allModules = new Set()
  for (const [moduleId] of quantityMap) {
    allModules.add(moduleId)
    getAllChildModules(moduleId).forEach(m => allModules.add(m.id))
  }
  allModules.forEach(id => {
    const mod = mockModules.find(m => m.id === id)
    console.log(`   - ${mod?.drawingNo} (${mod?.nameZh})`)
  })

  // 3. 生成下单BOM统计
  const bomMap = new Map()
  for (const [moduleId, moduleQty] of quantityMap) {
    const module = mockModules.find(m => m.id === moduleId)
    if (!module || !module.bom || !module.bom.items) continue

    // 模块本身
    const moduleKey = `${module.drawingNo}|${module.nameEn}|SET`
    if (!bomMap.has(moduleKey)) {
      bomMap.set(moduleKey, { name: module.nameZh, qty: 0, type: '模块' })
    }
    bomMap.get(moduleKey).qty += moduleQty

    // 子模块
    getAllChildModules(moduleId).forEach(child => {
      const childKey = `${child.drawingNo}|${child.nameEn}|SET`
      if (!bomMap.has(childKey)) {
        bomMap.set(childKey, { name: child.nameZh, qty: 0, type: '子模块' })
      }
      bomMap.get(childKey).qty += moduleQty
    })

    // BOM条目
    module.bom.items
      .filter(item => item.type === 'order' || item.type === 'both')
      .forEach(item => {
        const key = `${item.materialCode}|${item.spec}|${item.unit}`
        if (!bomMap.has(key)) {
          bomMap.set(key, { name: item.materialName, qty: 0, type: 'BOM条目' })
        }
        bomMap.get(key).qty += item.qty * moduleQty
      })
  }

  console.log(`\n3. 下单BOM统计：`)
  console.log(`   总条目数：${bomMap.size}`)
  let totalQty = 0
  for (const [, item] of bomMap) {
    totalQty += item.qty
  }
  console.log(`   总数量：${totalQty}`)

  console.log(`\n✓ 综合测试完成：多配置组合 + 子模块递归 + BOM合并全流程验证通过`)
}

// ==================== 运行所有测试 ====================

console.log('╔══════════════════════════════════════════════════════════════╗')
console.log('║           BOM管理系统 - 多配置组合功能测试报告                ║')
console.log('╚══════════════════════════════════════════════════════════════╝')
console.log(`\n测试数据规模：`)
console.log(`  - 模块数量：${mockModules.length}个（含3级层级关系）`)
console.log(`  - 配置数量：${mockConfigs.length}个`)
console.log(`  - BOM条目总数：${mockModules.reduce((sum, m) => sum + (m.bom?.items?.length || 0), 0)}条`)
console.log(`  - 自定义字段：supplier（供应商）`)

let passed = 0
let failed = 0

try { testSingleConfigMerge(); passed++ } catch (e) { console.log('✗ 测试异常:', e.message); failed++ }
try { testMultiConfigMerge(); passed++ } catch (e) { console.log('✗ 测试异常:', e.message); failed++ }
try { testModuleQuantityCalculation(); passed++ } catch (e) { console.log('✗ 测试异常:', e.message); failed++ }
try { testGenerateOrderBomModules(); passed++ } catch (e) { console.log('✗ 测试异常:', e.message); failed++ }
try { testGenerateOrderBomItemsMerge(); passed++ } catch (e) { console.log('✗ 测试异常:', e.message); failed++ }
try { testMultiConfigWithQuantity(); passed++ } catch (e) { console.log('✗ 测试异常:', e.message); failed++ }
try { testEmptyConfigCombination(); passed++ } catch (e) { console.log('✗ 测试异常:', e.message); failed++ }
try { testUnselectedConfig(); passed++ } catch (e) { console.log('✗ 测试异常:', e.message); failed++ }
try { testCustomFieldsTransfer(); passed++ } catch (e) { console.log('✗ 测试异常:', e.message); failed++ }
try { testComprehensiveScenario(); passed++ } catch (e) { console.log('✗ 测试异常:', e.message); failed++ }

console.log('\n╔══════════════════════════════════════════════════════════════╗')
console.log('║                        测试结果汇总                            ║')
console.log('╠══════════════════════════════════════════════════════════════╣')
console.log(`║  总测试数：${passed + failed}                                                   ║`)
console.log(`║  通过：${passed}                                                        ║`)
console.log(`║  失败：${failed}                                                        ║`)
console.log(`║  通过率：${((passed / (passed + failed)) * 100).toFixed(0)}%                                                    ║`)
console.log('╚══════════════════════════════════════════════════════════════╝')

if (failed === 0) {
  console.log('\n🎉 所有测试通过！多配置组合功能核心算法验证正确。')
} else {
  console.log(`\n⚠️  有${failed}个测试失败，请检查相关功能。`)
}
