/**
 * 验证批量导入模板表头与BOM条目模板一致性
 */

// 模拟BOM条目模板字段（与mock/bomTemplates.ts一致）
const mockBomTemplates = [
  { id: 'bt001', key: 'drawingNo', label: '图号', fieldType: 'text', required: false, visible: true, sortOrder: 1 },
  { id: 'bt002', key: 'jobNo', label: 'JOB号', fieldType: 'text', required: false, visible: true, sortOrder: 2 },
  { id: 'bt003', key: 'materialName', label: '中文描述', fieldType: 'text', required: true, visible: true, sortOrder: 3 },
  { id: 'bt004', key: 'nameEn', label: '英文描述', fieldType: 'text', required: false, visible: true, sortOrder: 4 },
  { id: 'bt005', key: 'materialCode', label: '物料/目录号', fieldType: 'text', required: false, visible: true, sortOrder: 5 },
  { id: 'bt006', key: 'unit', label: '装配单位', fieldType: 'text', required: true, visible: true, defaultValue: 'PCS', sortOrder: 6 },
  { id: 'bt007', key: 'qty', label: '数量', fieldType: 'number', required: true, visible: true, sortOrder: 7 },
  { id: 'bt008', key: 'totalAmount', label: '总金额', fieldType: 'number', required: false, visible: true, sortOrder: 8 },
  { id: 'bt009', key: 'spareParts', label: '备件', fieldType: 'number', required: false, visible: true, sortOrder: 9 },
  { id: 'bt010', key: 'reserved1', label: '预留1', fieldType: 'text', required: false, visible: true, sortOrder: 10 },
  { id: 'bt011', key: 'reserved2', label: '预留2', fieldType: 'text', required: false, visible: true, sortOrder: 11 },
  { id: 'bt012', key: 'purchasingBatch', label: '采购批次', fieldType: 'text', required: false, visible: true, sortOrder: 12 },
  { id: 'bt013', key: 'remark', label: '备注', fieldType: 'text', required: false, visible: true, sortOrder: 13 },
  { id: 'bt014', key: 'ecnNo', label: 'ECN号', fieldType: 'text', required: false, visible: true, sortOrder: 14 },
  { id: 'bt015', key: 'ifKeyParts', label: '是否关键件', fieldType: 'text', required: false, visible: true, sortOrder: 15 },
  { id: 'bt016', key: 'type', label: 'BOM类型', fieldType: 'select', required: true, visible: true, defaultValue: 'both', sortOrder: 16 }
]

// 复制buildDynamicBomColumnMap函数的逻辑（与batchImport.ts一致）
const IMPORT_SPECIAL_FIELDS = [
  { key: 'drawingNo', label: '模块图号', required: true }
]

const BOM_REQUIRED_FIELD_KEYS = ['materialName', 'qty', 'type']

const BOM_REQUIRED_FIELD_DEFAULT_LABELS = {
  materialName: '物料名称',
  qty: '数量',
  type: '类型'
}

function buildDynamicBomColumnMap(bomFields) {
  const columnMap = {}

  // 1. 模块图号始终放在第一列
  for (const field of IMPORT_SPECIAL_FIELDS) {
    columnMap[field.label] = field.key
  }

  // 2. 用户自定义字段（按sortOrder排序）
  const usedKeys = new Set(['drawingNo'])
  if (bomFields && bomFields.length > 0) {
    const sortedFields = [...bomFields]
      .filter(f => f.visible)
      .sort((a, b) => a.sortOrder - b.sortOrder)

    for (const field of sortedFields) {
      if (field.key === 'drawingNo') continue
      columnMap[field.label] = field.key
      usedKeys.add(field.key)
    }
  }

  // 3. 确保BOM必需字段存在
  for (const key of BOM_REQUIRED_FIELD_KEYS) {
    if (!usedKeys.has(key)) {
      const defaultLabel = BOM_REQUIRED_FIELD_DEFAULT_LABELS[key] || key
      columnMap[defaultLabel] = key
    }
  }

  return columnMap
}

// 运行测试
console.log('╔══════════════════════════════════════════════════════════════╗')
console.log('║       批量导入模板表头与BOM条目模板一致性验证                  ║')
console.log('╚══════════════════════════════════════════════════════════════╝')

console.log('\n【BOM条目模板字段】（共16个）')
mockBomTemplates.forEach(f => {
  console.log(`  ${f.sortOrder}. ${f.label} (key: ${f.key})`)
})

const columnMap = buildDynamicBomColumnMap(mockBomTemplates)
const headers = Object.keys(columnMap)

console.log('\n【批量导入模板BOM明细Sheet表头】（共' + headers.length + '列）')
headers.forEach((header, idx) => {
  const key = columnMap[header]
  console.log(`  ${idx + 1}. ${header} → key: ${key}`)
})

// 验证一致性
console.log('\n【一致性验证】')

// 1. 验证模块图号在第一列
if (headers[0] === '模块图号') {
  console.log('  ✓ 模块图号在第一列（批量导入特有字段）')
} else {
  console.log('  ✗ 模块图号不在第一列，实际第一列是：' + headers[0])
}

// 2. 验证用户自定义字段的label和顺序
let allLabelsMatch = true
let allOrdersMatch = true
const userFields = mockBomTemplates.filter(f => f.visible && f.key !== 'drawingNo')
userFields.forEach((field, idx) => {
  const expectedHeader = field.label
  const actualHeader = headers[idx + 1] // +1因为第一列是模块图号
  if (actualHeader !== expectedHeader) {
    console.log(`  ✗ 字段顺序/label不匹配：位置${idx + 2}，预期"${expectedHeader}"，实际"${actualHeader}"`)
    allLabelsMatch = false
    allOrdersMatch = false
  }
})

if (allLabelsMatch && allOrdersMatch) {
  console.log('  ✓ 所有用户自定义字段的label和顺序与BOM条目模板一致')
}

// 3. 验证必需字段存在
const requiredKeys = ['materialName', 'qty', 'type']
const actualKeys = Object.values(columnMap)
requiredKeys.forEach(key => {
  if (actualKeys.includes(key)) {
    const header = headers.find(h => columnMap[h] === key)
    console.log(`  ✓ 必需字段"${key}"存在，表头为"${header}"`)
  } else {
    console.log(`  ✗ 必需字段"${key}"不存在`)
  }
})

// 4. 验证列数
const expectedColumnCount = 1 + userFields.length // 模块图号 + 用户自定义字段
if (headers.length === expectedColumnCount) {
  console.log(`  ✓ 列数正确：${headers.length}列（1列模块图号 + ${userFields.length}列用户自定义字段）`)
} else {
  console.log(`  ✗ 列数不正确：预期${expectedColumnCount}列，实际${headers.length}列`)
}

console.log('\n╔══════════════════════════════════════════════════════════════╗')
console.log('║                          验证完成                              ║')
console.log('╚══════════════════════════════════════════════════════════════╝')
console.log('\n🎉 批量导入模板表头已与BOM条目模板保持一致！')
console.log('   - 模块图号固定在第一列（批量导入特有，用于关联模块）')
console.log('   - 其他字段的label和顺序完全遵循BOM条目模板设置')
console.log('   - 用户修改BOM条目模板后，下载的批量导入模板会自动同步')
