import type { BomTemplateField } from '@/types'

/**
 * 系统预设BOM条目模板
 * 参考 Refer/系统模板-00-MXB-测试demo300条.xls 的表头设置
 * key值与英文表头一致（驼峰命名）
 * S/N（序号）为自动生成，不作为BOM条目字段
 * type（BOM类型）和source（来源）为系统内部字段
 *
 * 拆分为三种模板类型：
 * - module: 组件编辑器中的BOM管理使用
 * - order: 项目编辑器中的下单BOM使用
 * - import: 组件批量导入的BOM明细Sheet下载模板使用（不含"组件图号"列）
 */

// 组件BOM条目模板（参考Refer文件表头，16个字段）
export const moduleBomTemplates: BomTemplateField[] = [
  { id: 'mod_bt001', key: 'drawingNo', label: '图号', fieldType: 'text', required: false, visible: true, sortOrder: 1, templateType: 'module' },
  { id: 'mod_bt002', key: 'jobNo', label: 'JOB号', fieldType: 'text', required: false, visible: true, sortOrder: 2, templateType: 'module' },
  { id: 'mod_bt003', key: 'chineseDescription', label: '中文描述', fieldType: 'text', required: true, visible: true, sortOrder: 3, templateType: 'module' },
  { id: 'mod_bt004', key: 'englishDescription', label: '英文描述', fieldType: 'text', required: false, visible: true, sortOrder: 4, templateType: 'module' },
  { id: 'mod_bt005', key: 'materialCatalogNo', label: '物料/目录号', fieldType: 'text', required: false, visible: true, sortOrder: 5, templateType: 'module' },
  { id: 'mod_bt006', key: 'assemblyUnit', label: '装配单位', fieldType: 'select', required: true, visible: true, defaultValue: 'PCS', options: ['PCS', 'SET', 'TAI', 'M', 'KG', 'M²', 'L', 'PA'], sortOrder: 6, templateType: 'module' },
  { id: 'mod_bt007', key: 'quantity', label: '数量', fieldType: 'number', required: true, visible: true, sortOrder: 7, templateType: 'module' },
  { id: 'mod_bt008', key: 'totalAmount', label: '总金额', fieldType: 'number', required: false, visible: true, sortOrder: 8, templateType: 'module' },
  { id: 'mod_bt009', key: 'spareParts', label: '备件', fieldType: 'number', required: false, visible: true, sortOrder: 9, templateType: 'module' },
  { id: 'mod_bt010', key: 'reserved1', label: '预留1', fieldType: 'text', required: false, visible: true, sortOrder: 10, templateType: 'module' },
  { id: 'mod_bt011', key: 'reserved2', label: '预留2', fieldType: 'text', required: false, visible: true, sortOrder: 11, templateType: 'module' },
  { id: 'mod_bt012', key: 'purchasingBatch', label: '采购批次', fieldType: 'text', required: false, visible: true, sortOrder: 12, templateType: 'module' },
  { id: 'mod_bt013', key: 'remarks', label: '备注', fieldType: 'text', required: false, visible: true, sortOrder: 13, templateType: 'module' },
  { id: 'mod_bt014', key: 'ecnNo', label: 'ECN号', fieldType: 'text', required: false, visible: true, sortOrder: 14, templateType: 'module' },
  { id: 'mod_bt015', key: 'ifKeyParts', label: '是否关键件', fieldType: 'select', required: false, visible: true, options: ['是', '否'], sortOrder: 15, templateType: 'module' },
  { id: 'mod_bt016', key: 'type', label: 'BOM类型', fieldType: 'select', required: true, visible: true, defaultValue: 'both', options: ['assembly', 'order', 'both'], sortOrder: 16, templateType: 'module' }
]

// 项目下单BOM条目模板（与组件模板相同字段）
export const orderBomTemplates: BomTemplateField[] = [
  { id: 'ord_bt001', key: 'drawingNo', label: '图号', fieldType: 'text', required: false, visible: true, sortOrder: 1, templateType: 'order' },
  { id: 'ord_bt002', key: 'jobNo', label: 'JOB号', fieldType: 'text', required: false, visible: true, sortOrder: 2, templateType: 'order' },
  { id: 'ord_bt003', key: 'chineseDescription', label: '中文描述', fieldType: 'text', required: true, visible: true, sortOrder: 3, templateType: 'order' },
  { id: 'ord_bt004', key: 'englishDescription', label: '英文描述', fieldType: 'text', required: false, visible: true, sortOrder: 4, templateType: 'order' },
  { id: 'ord_bt005', key: 'materialCatalogNo', label: '物料/目录号', fieldType: 'text', required: false, visible: true, sortOrder: 5, templateType: 'order' },
  { id: 'ord_bt006', key: 'assemblyUnit', label: '装配单位', fieldType: 'select', required: true, visible: true, defaultValue: 'PCS', options: ['PCS', 'SET', 'TAI', 'M', 'KG', 'M²', 'L', 'PA'], sortOrder: 6, templateType: 'order' },
  { id: 'ord_bt007', key: 'quantity', label: '数量', fieldType: 'number', required: true, visible: true, sortOrder: 7, templateType: 'order' },
  { id: 'ord_bt008', key: 'totalAmount', label: '总金额', fieldType: 'number', required: false, visible: true, sortOrder: 8, templateType: 'order' },
  { id: 'ord_bt009', key: 'spareParts', label: '备件', fieldType: 'number', required: false, visible: true, sortOrder: 9, templateType: 'order' },
  { id: 'ord_bt010', key: 'reserved1', label: '预留1', fieldType: 'text', required: false, visible: true, sortOrder: 10, templateType: 'order' },
  { id: 'ord_bt011', key: 'reserved2', label: '预留2', fieldType: 'text', required: false, visible: true, sortOrder: 11, templateType: 'order' },
  { id: 'ord_bt012', key: 'purchasingBatch', label: '采购批次', fieldType: 'text', required: false, visible: true, sortOrder: 12, templateType: 'order' },
  { id: 'ord_bt013', key: 'remarks', label: '备注', fieldType: 'text', required: false, visible: true, sortOrder: 13, templateType: 'order' },
  { id: 'ord_bt014', key: 'ecnNo', label: 'ECN号', fieldType: 'text', required: false, visible: true, sortOrder: 14, templateType: 'order' },
  { id: 'ord_bt015', key: 'ifKeyParts', label: '是否关键件', fieldType: 'select', required: false, visible: true, options: ['是', '否'], sortOrder: 15, templateType: 'order' },
  { id: 'ord_bt016', key: 'type', label: 'BOM类型', fieldType: 'select', required: true, visible: true, defaultValue: 'both', options: ['assembly', 'order', 'both'], sortOrder: 16, templateType: 'order' }
]

// 批量导入组件模板（不含"组件图号"列，组件图号在 buildDynamicBomColumnMap 中单独处理）
export const importBomTemplates: BomTemplateField[] = [
  { id: 'imp_bt001', key: 'drawingNo', label: '图号', fieldType: 'text', required: false, visible: true, sortOrder: 1, templateType: 'import' },
  { id: 'imp_bt002', key: 'jobNo', label: 'JOB号', fieldType: 'text', required: false, visible: true, sortOrder: 2, templateType: 'import' },
  { id: 'imp_bt003', key: 'chineseDescription', label: '中文描述', fieldType: 'text', required: true, visible: true, sortOrder: 3, templateType: 'import' },
  { id: 'imp_bt004', key: 'englishDescription', label: '英文描述', fieldType: 'text', required: false, visible: true, sortOrder: 4, templateType: 'import' },
  { id: 'imp_bt005', key: 'materialCatalogNo', label: '物料/目录号', fieldType: 'text', required: false, visible: true, sortOrder: 5, templateType: 'import' },
  { id: 'imp_bt006', key: 'assemblyUnit', label: '装配单位', fieldType: 'select', required: true, visible: true, defaultValue: 'PCS', options: ['PCS', 'SET', 'TAI', 'M', 'KG', 'M²', 'L', 'PA'], sortOrder: 6, templateType: 'import' },
  { id: 'imp_bt007', key: 'quantity', label: '数量', fieldType: 'number', required: true, visible: true, sortOrder: 7, templateType: 'import' },
  { id: 'imp_bt008', key: 'totalAmount', label: '总金额', fieldType: 'number', required: false, visible: true, sortOrder: 8, templateType: 'import' },
  { id: 'imp_bt009', key: 'spareParts', label: '备件', fieldType: 'number', required: false, visible: true, sortOrder: 9, templateType: 'import' },
  { id: 'imp_bt010', key: 'reserved1', label: '预留1', fieldType: 'text', required: false, visible: true, sortOrder: 10, templateType: 'import' },
  { id: 'imp_bt011', key: 'reserved2', label: '预留2', fieldType: 'text', required: false, visible: true, sortOrder: 11, templateType: 'import' },
  { id: 'imp_bt012', key: 'purchasingBatch', label: '采购批次', fieldType: 'text', required: false, visible: true, sortOrder: 12, templateType: 'import' },
  { id: 'imp_bt013', key: 'remarks', label: '备注', fieldType: 'text', required: false, visible: true, sortOrder: 13, templateType: 'import' },
  { id: 'imp_bt014', key: 'ecnNo', label: 'ECN号', fieldType: 'text', required: false, visible: true, sortOrder: 14, templateType: 'import' },
  { id: 'imp_bt015', key: 'ifKeyParts', label: '是否关键件', fieldType: 'select', required: false, visible: true, options: ['是', '否'], sortOrder: 15, templateType: 'import' },
  { id: 'imp_bt016', key: 'type', label: 'BOM类型', fieldType: 'select', required: true, visible: true, defaultValue: 'both', options: ['assembly', 'order', 'both'], sortOrder: 16, templateType: 'import' }
]

/** 合并三种模板类型的完整默认字段集 */
export const mockBomTemplates: BomTemplateField[] = [
  ...moduleBomTemplates,
  ...orderBomTemplates,
  ...importBomTemplates
]
