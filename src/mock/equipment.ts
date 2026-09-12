import type { Equipment, EquipmentConfiguration, EquipmentSerial } from '@/types'

export const mockEquipments: Equipment[] = [
  {
    id: 'eq001',
    name: 'XX型灌装机',
    model: 'GZX-100',
    description: '全自动活塞式灌装机，适用于液体/膏体灌装，产能100瓶/分钟',
    status: 'active',
    createdAt: '2026-01-10T08:00:00.000Z',
    updatedAt: '2026-06-15T08:00:00.000Z',
    changeHistory: [
      { id: 'ch001', targetType: 'equipment', targetId: 'eq001', operation: '创建', detail: '创建设备XX型灌装机', operator: 'admin', timestamp: '2026-01-10T08:00:00.000Z' },
      { id: 'ch002', targetType: 'equipment', targetId: 'eq001', operation: '更新', detail: '更新描述信息', operator: 'admin', timestamp: '2026-03-20T08:00:00.000Z' }
    ]
  },
  {
    id: 'eq002',
    name: 'YY型贴标机',
    model: 'TBX-50',
    description: '全自动不干胶贴标机，适用于圆瓶/方瓶贴标，产能50瓶/分钟',
    status: 'active',
    createdAt: '2026-02-05T08:00:00.000Z',
    updatedAt: '2026-05-10T08:00:00.000Z'
  },
  {
    id: 'eq003',
    name: 'ZZ型枕式包装机',
    model: 'BZX-200',
    description: '全自动枕式包装机，适用于食品/日用品包装，产能200包/分钟',
    status: 'active',
    createdAt: '2026-03-01T08:00:00.000Z',
    updatedAt: '2026-07-01T08:00:00.000Z'
  }
]

export const mockEquipmentConfigurations: EquipmentConfiguration[] = [
  // 灌装机配置
  { id: 'cfg001', equipmentId: 'eq001', name: '标准配置', description: '标准灌装配置，含输送和控制', moduleIds: ['mod001', 'mod002', 'mod003', 'mod004', 'mod005'] },
  { id: 'cfg002', equipmentId: 'eq001', name: '高速配置', description: '高速灌装，增加伺服控制和气动系统', moduleIds: ['mod001', 'mod002', 'mod003', 'mod004', 'mod005', 'mod010', 'mod011'] },
  // 贴标机配置
  { id: 'cfg003', equipmentId: 'eq002', name: '圆瓶配置', description: '圆瓶贴标标准配置', moduleIds: ['mod006', 'mod007', 'mod004', 'mod005'] },
  { id: 'cfg004', equipmentId: 'eq002', name: '方瓶配置', description: '方瓶/异形瓶贴标配置', moduleIds: ['mod006', 'mod007', 'mod004', 'mod005', 'mod011'] },
  // 包装机配置
  { id: 'cfg005', equipmentId: 'eq003', name: '标准配置', description: '标准枕式包装配置', moduleIds: ['mod008', 'mod009', 'mod004', 'mod005'] },
  { id: 'cfg006', equipmentId: 'eq003', name: '高配', description: '含伺服封口和电气柜', moduleIds: ['mod008', 'mod009', 'mod004', 'mod005', 'mod010'] },
  { id: 'cfg007', equipmentId: 'eq003', name: '简配', description: '基础包装功能', moduleIds: ['mod008', 'mod009'] }
]

export const mockEquipmentSerials: EquipmentSerial[] = [
  { id: 'sn001', equipmentId: 'eq001', serialNumber: 'GZX100-2026-001', projectId: 'prj001', status: 'assigned', remark: '已交付客户A' },
  { id: 'sn002', equipmentId: 'eq001', serialNumber: 'GZX100-2026-002', status: 'unassigned', remark: '库存' },
  { id: 'sn003', equipmentId: 'eq002', serialNumber: 'TBX50-2026-001', projectId: 'prj002', status: 'assigned', remark: '已交付客户B' },
  { id: 'sn004', equipmentId: 'eq002', serialNumber: 'TBX50-2026-002', status: 'unassigned' },
  { id: 'sn005', equipmentId: 'eq003', serialNumber: 'BZX200-2026-001', status: 'unassigned', remark: '生产中' }
]
