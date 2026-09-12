// ==================== 列定义（导入解析用） ====================
export interface ColumnDef {
  id: string
  name: string
  label: string
  type: 'text' | 'number'
  sortOrder: number
}

export function normalizeColumnName(name: string): string {
  return name.toLowerCase().replace(/[\s_\-\/\\()（）]/g, '')
}

export const STANDARD_COLUMN_LABELS: Record<string, string> = {
  materialcatalognumber: '物料/目录号',
  materialcatalogno: '物料/目录号',
  chinesedescription: '中文描述',
  englishdescription: '英文描述',
  assemblyunit: '装配单位',
  quantity: '数量',
  totalamount: '总金额',
  spareparts: '备件',
  reserved1: '预留1',
  reserved2: '预留2',
  partcategory: '零件分类',
  零件分类: '零件分类',
  purchasingbatch: '采购批次',
  remarks: '备注',
  ecnno: 'ECN号',
  ifkeyparts: '是否关键件',
  comment: '备注',
  drawingno: '图号',
  jobno: 'JOB号',
  图号: '图号',
  JOB号: 'JOB号',
  中文描述: '中文描述',
  英文描述: '英文描述',
  '物料/目录号': '物料/目录号',
  物料目录号: '物料/目录号',
  物料编码: '物料/目录号',
  物料号: '物料/目录号',
  物料编号: '物料/目录号',
  装配单位: '装配单位',
  单位: '装配单位',
  数量: '数量',
  总金额: '总金额',
  备件: '备件',
  预留1: '预留1',
  预留2: '预留2',
  采购批次: '采购批次',
  备注: '备注',
  ECN号: 'ECN号',
  是否关键件: '是否关键件'
}

// ==================== 更改历史 ====================
export interface ChangeRecord {
  id: string
  targetType: 'equipment' | 'module' | 'project' | 'bom'
  targetId: string
  operation: string
  detail: string
  operator: string
  timestamp: string
  remark?: string  // 操作备注
  /** 更新前的字段快照（用于 diff 展示与回滚） */
  beforeData?: any
  /** 更新后的字段快照（用于 diff 展示） */
  afterData?: any
}

// ==================== 设备 ====================
export interface Equipment {
  id: string
  name: string
  model: string
  description?: string
  status: 'active' | 'inactive'
  createdAt: string
  updatedAt: string
  changeHistory?: ChangeRecord[]
}

export interface EquipmentConfiguration {
  id: string
  equipmentId: string
  name: string
  description?: string
  moduleIds: string[]
  groupId?: string       // 所属分组ID，undefined 表示未分组
}

/**
 * 配置分组：用户可对同一设备下的配置进行自定义分组，方便查找与筛选
 */
export interface ConfigurationGroup {
  id: string
  equipmentId: string
  name: string           // 组名，同一设备下不可重复
  description?: string
  sortOrder: number
}

export interface EquipmentSerial {
  id: string
  equipmentId: string
  serialNumber: string
  projectId?: string
  status: 'unassigned' | 'assigned'
  remark?: string
}

// ==================== 零件库 ====================
/**
 * 零件库：用户可创建多个零件库（如标准件库、外购件库、自制件库）。
 * 图号全局唯一（跨所有库），不做权限隔离。
 */
export interface PartLibrary {
  id: string
  name: string
  description?: string
  sortOrder: number
  createdAt: string
  updatedAt: string
}

/** 默认库 ID（迁移时所有现有零件归入此库） */
export const DEFAULT_PART_LIBRARY_ID = 'default-lib'

// ==================== 全局零件库 ====================
/**
 * 全局零件：跨模块/项目共享的物料主数据。
 * 图号(drawingNo)为业务唯一标识。BOM条目只引用 partId，显示时实时关联本表。
 * 注意：不包含 quantity/type/source/sortOrder 等 BOM 特有字段。
 */
export interface Part {
  id: string
  /** 所属零件库ID */
  libraryId: string
  /** 零件类型：order=下单零件，assembly=模型零件，both=两者 */
  partType?: 'order' | 'assembly' | 'both'
  drawingNo?: string
  jobNo?: string
  chineseDescription?: string
  englishDescription?: string
  materialCatalogNo?: string
  assemblyUnit?: string
  totalAmount?: number
  spareParts?: number
  reserved1?: string
  partCategory?: string  // 零件分类（替代预留1，值为分类ID）
  reserved2?: string
  purchasingBatch?: string
  remarks?: string
  ecnNo?: string
  ifKeyParts?: string
  createdAt: string
  updatedAt: string
  [key: string]: any  // 支持动态字段
}

// ==================== 模块 ====================
export interface BomItem {
  id: string
  /** 关联全局零件库的零件ID（数据迁移后写入；为空时表示旧数据，参数直接挂在本条目上） */
  partId?: string
  drawingNo?: string
  jobNo?: string
  chineseDescription?: string
  englishDescription?: string
  materialCatalogNo?: string
  assemblyUnit?: string
  quantity: number
  totalAmount?: number
  spareParts?: number
  reserved1?: string
  reserved2?: string
  purchasingBatch?: string
  remarks?: string
  ecnNo?: string
  ifKeyParts?: string
  type: 'assembly' | 'order' | 'both'
  source: 'manual' | 'import' | 'generated' | 'copy'
  sortOrder: number
  [key: string]: any
}

export interface Bom {
  moduleId: string
  items: BomItem[]
}

export interface Module {
  id: string
  drawingNo: string        // 图号，ASM结尾唯一
  nameZh: string           // 中文名，可重复
  nameEn?: string
  equipmentId: string
  configurationIds: string[]
  tags: string[]           // Tag ID列表
  parentModuleIds?: string[]  // 多个父组件ID（多对多关系，可选，默认为空数组）
  childModuleIds: string[]
  /** @deprecated 已废弃，BOM数据从bomItems表读取，通过modulesStore.getBomItems(moduleId)获取 */
  bom?: Bom
  remark?: string
  createdAt: string
  updatedAt: string
  changeHistory?: ChangeRecord[]
}

// ==================== 项目 ====================
export interface CustomerRequirement {
  id: string
  content: string
}

export interface SelectedModule {
  moduleId: string
  quantity: number
}

export interface OrderBomItem {
  id: string
  /** 关联全局零件库的零件ID；isModuleItem（模块本身/子组件）条目为空 */
  partId?: string
  drawingNo?: string
  jobNo?: string
  chineseDescription: string
  englishDescription?: string
  materialCatalogNo?: string
  assemblyUnit?: string
  quantity: number
  totalAmount?: number
  spareParts?: number
  reserved1?: string
  reserved2?: string
  purchasingBatch?: string
  remarks?: string
  ecnNo?: string
  ifKeyParts?: string
  sourceModuleIds: string[]
  source: 'generated' | 'manual' | 'modified'
  sortOrder: number
  /** 标记该条目为模块本身/子模块条目（非真实物料），用于与真实物料区分避免合并冲突 */
  isModuleItem?: boolean
  [key: string]: any
}

/**
 * 下单BOM生成结果
 */
export interface OrderBomResult {
  items: OrderBomItem[]
  logs: {
    modules: number        // 处理的选中模块数
    bomLines: number       // 处理的BOM条目总数（含跳过）
    merged: number         // 合并到已有条目的次数
    skipped: number        // 跳过的条目数（零/负数量等）
    warnings: string[]     // 警告信息
  }
}

export interface Project {
  id: string
  name: string
  jobNo: string                    // JOB号，唯一
  customer?: string
  customerLocation?: string
  status: 'ongoing' | 'completed' | 'cancelled' | 'paused'
  equipmentId: string
  equipmentModel?: string           // 项目要求的机型（设备型号），用于关联设备时校核
  configurationId: string           // 兼容旧版本，单配置
  configCombinations: ConfigCombination[]  // 多配置组合（新版本）
  serialNumber?: string
  projectTypeId?: string
  relatedProjectIds: string[]
  customerRequirements: CustomerRequirement[]
  selectedModules: SelectedModule[]
  /** @deprecated 已废弃，下单BOM数据从orderBomItems表读取，通过projectsStore.getOrderBomItems(projectId)获取 */
  orderBom?: OrderBomItem[]
  deliveryDate?: string               // 交付日期（ISO字符串），用于交付时间线统计
  createdAt: string
  updatedAt: string
  changeHistory?: ChangeRecord[]
}

/**
 * BOM 版本快照：用于组件 BOM / 项目下单 BOM 的版本管理与差异对比
 */
export interface BomVersion {
  id: string
  targetType: 'module' | 'project'
  targetId: string
  versionNo: string        // 自动递增 v1, v2... 或用户自定义
  description: string      // 版本说明
  createdAt: string
  createdBy: string
  items: any[]             // BOM数据快照（深拷贝）
}

/**
 * 配置组合：项目可以选择多个配置进行组合
 * 每个配置组合包含一个配置和该配置的数量（套数）
 */
export interface ConfigCombination {
  id: string
  configurationId: string
  quantity: number          // 该配置的数量（套数），默认1
  remark?: string           // 备注
}

// ==================== 标签 ====================
export interface Tag {
  id: string
  name: string
  color?: string
}

// ==================== 零件分类 ====================
export interface PartCategory {
  id: string
  name: string
  color?: string
  sortOrder: number
}

// ==================== 项目类型 ====================
export interface ProjectType {
  id: string
  name: string
}

// ==================== BOM条目模板字段 ====================
export type BomTemplateType = 'module' | 'order' | 'import'

export interface BomTemplateField {
  id: string
  key: string
  label: string
  fieldType: 'text' | 'number' | 'select'
  required: boolean
  visible: boolean
  defaultValue?: string
  options?: string[]
  sortOrder: number
  templateType: BomTemplateType
}

// ==================== 用户 ====================
export interface UserInfo {
  name: string
  role: string
}

// ==================== 最近打开 ====================
export interface RecentlyOpenedItem {
  id: string
  type: 'equipment' | 'module' | 'project'
  name: string
  no: string
  openedAt: string
}
