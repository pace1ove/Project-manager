import type { Module } from '@/types'

export const mockModules: Module[] = [
  // ===== 灌装机模块 =====
  {
    id: 'mod001',
    drawingNo: 'ASM-GZ-001',
    nameZh: '灌装机总装配',
    nameEn: 'Filling Machine Assembly',
    equipmentId: 'eq001',
    configurationIds: ['cfg001', 'cfg002'],
    tags: ['tag002', 'tag005'],
    childModuleIds: ['mod002', 'mod003'],
    bom: {
      moduleId: 'mod001',
      items: [
        { id: 'bi001', materialCatalogNo: 'M-GZ-001', chineseDescription: '主机架焊接件', reserved1: '304不锈钢 2000×800×1500', assemblyUnit: 'SET', quantity: 1, reserved2: 'A1', type: 'both', source: 'manual', sortOrder: 1 },
        { id: 'bi002', materialCatalogNo: 'M-GZ-002', chineseDescription: '面板组件', reserved1: '304不锈钢 拉丝', assemblyUnit: 'SET', quantity: 1, reserved2: 'A2', type: 'assembly', source: 'manual', sortOrder: 2 },
        { id: 'bi003', materialCatalogNo: 'STD-001', chineseDescription: '内六角螺栓', reserved1: 'M8×25 8.8级', assemblyUnit: 'PCS', quantity: 20, type: 'order', source: 'manual', remarks: '标准件', sortOrder: 3 },
        { id: 'bi004', materialCatalogNo: 'STD-003', chineseDescription: '平垫圈', reserved1: 'Φ8', assemblyUnit: 'PCS', quantity: 20, type: 'order', source: 'manual', sortOrder: 4 }
      ]
    },
    remark: '总装组件，包含机架和面板',
    createdAt: '2026-01-15T08:00:00.000Z',
    updatedAt: '2026-06-10T08:00:00.000Z',
    changeHistory: [
      { id: 'chm001', targetType: 'module', targetId: 'mod001', operation: '创建', detail: '创建灌装机总装配组件', operator: 'admin', timestamp: '2026-01-15T08:00:00.000Z' }
    ]
  },
  {
    id: 'mod002',
    drawingNo: 'ASM-GZ-002',
    nameZh: '灌装阀组件',
    nameEn: 'Filling Valve Assembly',
    equipmentId: 'eq001',
    configurationIds: ['cfg001', 'cfg002'],
    tags: ['tag002', 'tag003', 'tag005'],
    parentModuleIds: ['mod001'],
    childModuleIds: [],
    bom: {
      moduleId: 'mod002',
      items: [
        { id: 'bi005', materialCatalogNo: 'M-GZ-101', chineseDescription: '灌装阀体', reserved1: '316L不锈钢 DN25', assemblyUnit: 'PCS', quantity: 4, reserved2: 'B1-B4', type: 'both', source: 'manual', sortOrder: 1 },
        { id: 'bi006', materialCatalogNo: 'M-GZ-102', chineseDescription: '活塞组件', reserved1: 'Φ25 316L', assemblyUnit: 'PCS', quantity: 4, type: 'both', source: 'manual', sortOrder: 2 },
        { id: 'bi007', materialCatalogNo: 'M-GZ-103', chineseDescription: '密封圈', reserved1: 'Φ25 硅胶', assemblyUnit: 'PCS', quantity: 8, type: 'order', source: 'manual', remarks: '易损件', sortOrder: 3 },
        { id: 'bi008', materialCatalogNo: 'MECH-008', chineseDescription: '标准气缸', reserved1: 'SC32×50', assemblyUnit: 'PCS', quantity: 4, reserved2: 'C1-C4', type: 'order', source: 'import', sortOrder: 4 },
        { id: 'bi009', materialCatalogNo: 'MECH-009', chineseDescription: '电磁阀', reserved1: '4V210-08 DC24V', assemblyUnit: 'PCS', quantity: 1, type: 'order', source: 'import', sortOrder: 5 }
      ]
    },
    remark: '核心灌装部件，4头灌装',
    createdAt: '2026-01-16T08:00:00.000Z',
    updatedAt: '2026-05-20T08:00:00.000Z'
  },
  {
    id: 'mod003',
    drawingNo: 'ASM-GZ-003',
    nameZh: '输送系统',
    nameEn: 'Conveyor System',
    equipmentId: 'eq001',
    configurationIds: ['cfg001', 'cfg002'],
    tags: ['tag002', 'tag006'],
    parentModuleIds: ['mod001'],
    childModuleIds: [],
    bom: {
      moduleId: 'mod003',
      items: [
        { id: 'bi010', materialCatalogNo: 'M-SS-001', chineseDescription: '输送带', reserved1: 'PU白色 2000×100mm', assemblyUnit: 'M', quantity: 2.5, type: 'both', source: 'manual', sortOrder: 1 },
        { id: 'bi011', materialCatalogNo: 'MECH-001', chineseDescription: '输送电机', reserved1: 'YE3-80M1-4 0.55KW', assemblyUnit: 'TAI', quantity: 1, reserved2: 'D1', type: 'order', source: 'import', sortOrder: 2 },
        { id: 'bi012', materialCatalogNo: 'MECH-002', chineseDescription: '减速机', reserved1: 'NMRV040 速比20', assemblyUnit: 'TAI', quantity: 1, type: 'order', source: 'import', sortOrder: 3 },
        { id: 'bi013', materialCatalogNo: 'MECH-003', chineseDescription: '滚筒轴承', reserved1: '6204-2RS', assemblyUnit: 'PCS', quantity: 8, type: 'order', source: 'import', sortOrder: 4 }
      ]
    },
    createdAt: '2026-01-18T08:00:00.000Z',
    updatedAt: '2026-04-10T08:00:00.000Z'
  },
  {
    id: 'mod004',
    drawingNo: 'ASM-CTL-001',
    nameZh: '控制系统',
    nameEn: 'Control System',
    equipmentId: 'eq001',
    configurationIds: ['cfg001', 'cfg002', 'cfg003', 'cfg004', 'cfg005', 'cfg006'],
    tags: ['tag001', 'tag006'],
    childModuleIds: [],
    bom: {
      moduleId: 'mod004',
      items: [
        { id: 'bi014', materialCatalogNo: 'ELEC-009', chineseDescription: 'PLC模块', reserved1: 'S7-1200 CPU1214C', assemblyUnit: 'PCS', quantity: 1, reserved2: 'U1', type: 'order', source: 'import', sortOrder: 1 },
        { id: 'bi015', materialCatalogNo: 'ELEC-007', chineseDescription: '变频器', reserved1: 'MD320T1.5GB', assemblyUnit: 'TAI', quantity: 1, reserved2: 'U2', type: 'order', source: 'import', sortOrder: 2 },
        { id: 'bi016', materialCatalogNo: 'ELEC-011', chineseDescription: '开关电源', reserved1: 'S-120-24 24V/5A', assemblyUnit: 'PCS', quantity: 1, reserved2: 'PS1', type: 'order', source: 'import', sortOrder: 3 },
        { id: 'bi017', materialCatalogNo: 'ELEC-004', chineseDescription: '按钮开关', reserved1: 'LA38-11', assemblyUnit: 'PCS', quantity: 6, type: 'order', source: 'import', sortOrder: 4 },
        { id: 'bi018', materialCatalogNo: 'ELEC-005', chineseDescription: '指示灯', reserved1: 'AD16-22DS', assemblyUnit: 'PCS', quantity: 4, type: 'order', source: 'import', sortOrder: 5 },
        { id: 'bi019', materialCatalogNo: 'ELEC-012', chineseDescription: '端子排', reserved1: 'UK-5N', assemblyUnit: 'PCS', quantity: 40, type: 'assembly', source: 'manual', sortOrder: 6 }
      ]
    },
    remark: '通用控制组件，多设备复用',
    createdAt: '2026-01-20T08:00:00.000Z',
    updatedAt: '2026-07-15T08:00:00.000Z'
  },
  {
    id: 'mod005',
    drawingNo: 'ASM-FRM-001',
    nameZh: '机架组件',
    nameEn: 'Frame Assembly',
    equipmentId: 'eq001',
    configurationIds: ['cfg001', 'cfg002', 'cfg003', 'cfg004', 'cfg005', 'cfg006'],
    tags: ['tag002', 'tag004'],
    childModuleIds: [],
    bom: {
      moduleId: 'mod005',
      items: [
        { id: 'bi020', materialCatalogNo: 'M-FR-001', chineseDescription: '方管机架', reserved1: '40×40×2 碳钢喷塑', assemblyUnit: 'SET', quantity: 1, type: 'both', source: 'manual', sortOrder: 1 },
        { id: 'bi021', materialCatalogNo: 'STD-001', chineseDescription: '内六角螺栓', reserved1: 'M6×20 8.8级', assemblyUnit: 'PCS', quantity: 30, type: 'order', source: 'manual', sortOrder: 2 },
        { id: 'bi022', materialCatalogNo: 'STD-002', chineseDescription: '六角螺母', reserved1: 'M6', assemblyUnit: 'PCS', quantity: 30, type: 'order', source: 'manual', sortOrder: 3 },
        { id: 'bi023', materialCatalogNo: 'STD-003', chineseDescription: '平垫圈', reserved1: 'Φ6', assemblyUnit: 'PCS', quantity: 30, type: 'order', source: 'manual', sortOrder: 4 }
      ]
    },
    createdAt: '2026-01-22T08:00:00.000Z',
    updatedAt: '2026-03-01T08:00:00.000Z'
  },
  // ===== 贴标机模块 =====
  {
    id: 'mod006',
    drawingNo: 'ASM-TB-001',
    nameZh: '贴标头组件',
    nameEn: 'Labeling Head Assembly',
    equipmentId: 'eq002',
    configurationIds: ['cfg003', 'cfg004'],
    tags: ['tag002', 'tag005'],
    childModuleIds: [],
    bom: {
      moduleId: 'mod006',
      items: [
        { id: 'bi024', materialCatalogNo: 'M-TB-001', chineseDescription: '贴标头主体', reserved1: '6061铝合金 阳极氧化', assemblyUnit: 'SET', quantity: 1, type: 'both', source: 'manual', sortOrder: 1 },
        { id: 'bi025', materialCatalogNo: 'M-TB-002', chineseDescription: '剥标板', reserved1: '钨钢 锐角', assemblyUnit: 'PCS', quantity: 1, type: 'both', source: 'manual', sortOrder: 2 },
        { id: 'bi026', materialCatalogNo: 'ELEC-008', chineseDescription: '伺服电机', reserved1: 'MSMD012G1U 100W', assemblyUnit: 'TAI', quantity: 1, reserved2: 'M1', type: 'order', source: 'import', sortOrder: 3 },
        { id: 'bi027', materialCatalogNo: 'MECH-003', chineseDescription: '导辊轴承', reserved1: '6002-2RS', assemblyUnit: 'PCS', quantity: 6, type: 'order', source: 'import', sortOrder: 4 }
      ]
    },
    remark: '核心贴标部件',
    createdAt: '2026-02-10T08:00:00.000Z',
    updatedAt: '2026-06-01T08:00:00.000Z'
  },
  {
    id: 'mod007',
    drawingNo: 'ASM-TB-002',
    nameZh: '标签供料器',
    nameEn: 'Label Feeder',
    equipmentId: 'eq002',
    configurationIds: ['cfg003', 'cfg004'],
    tags: ['tag002', 'tag006'],
    childModuleIds: [],
    bom: {
      moduleId: 'mod007',
      items: [
        { id: 'bi028', materialCatalogNo: 'M-TB-101', chineseDescription: '料盘组件', reserved1: 'Φ300 可调', assemblyUnit: 'SET', quantity: 1, type: 'both', source: 'manual', sortOrder: 1 },
        { id: 'bi029', materialCatalogNo: 'MECH-008', chineseDescription: '张力气缸', reserved1: 'CDJ2B10-30', assemblyUnit: 'PCS', quantity: 1, type: 'order', source: 'import', sortOrder: 2 },
        { id: 'bi030', materialCatalogNo: 'ELEC-003', chineseDescription: '标签传感器', reserved1: '电容式 NPN', assemblyUnit: 'PCS', quantity: 1, reserved2: 'S1', type: 'order', source: 'import', sortOrder: 3 }
      ]
    },
    createdAt: '2026-02-12T08:00:00.000Z',
    updatedAt: '2026-05-01T08:00:00.000Z'
  },
  // ===== 包装机模块 =====
  {
    id: 'mod008',
    drawingNo: 'ASM-BZ-001',
    nameZh: '包装主机',
    nameEn: 'Packaging Main Unit',
    equipmentId: 'eq003',
    configurationIds: ['cfg005', 'cfg006', 'cfg007'],
    tags: ['tag002', 'tag005'],
    childModuleIds: ['mod009'],
    bom: {
      moduleId: 'mod008',
      items: [
        { id: 'bi031', materialCatalogNo: 'M-BZ-001', chineseDescription: '主机架', reserved1: '碳钢喷塑 1500×1000×1800', assemblyUnit: 'SET', quantity: 1, type: 'both', source: 'manual', sortOrder: 1 },
        { id: 'bi032', materialCatalogNo: 'M-BZ-002', chineseDescription: '成型器', reserved1: '定制 袋宽100mm', assemblyUnit: 'PCS', quantity: 1, reserved2: 'F1', type: 'both', source: 'manual', sortOrder: 2 },
        { id: 'bi033', materialCatalogNo: 'MECH-001', chineseDescription: '主电机', reserved1: 'YE3-100L1-4 2.2KW', assemblyUnit: 'TAI', quantity: 1, reserved2: 'M1', type: 'order', source: 'import', sortOrder: 3 },
        { id: 'bi034', materialCatalogNo: 'ELEC-007', chineseDescription: '变频器', reserved1: 'MD320T2.2GB', assemblyUnit: 'TAI', quantity: 1, type: 'order', source: 'import', sortOrder: 4 }
      ]
    },
    remark: '枕式包装主机',
    createdAt: '2026-03-05T08:00:00.000Z',
    updatedAt: '2026-07-01T08:00:00.000Z'
  },
  {
    id: 'mod009',
    drawingNo: 'ASM-BZ-002',
    nameZh: '封口装置',
    nameEn: 'Sealing Device',
    equipmentId: 'eq003',
    configurationIds: ['cfg005', 'cfg006', 'cfg007'],
    tags: ['tag002', 'tag001', 'tag005'],
    parentModuleIds: ['mod008'],
    childModuleIds: [],
    bom: {
      moduleId: 'mod009',
      items: [
        { id: 'bi035', materialCatalogNo: 'M-BZ-101', chineseDescription: '纵封加热块', reserved1: '铜合金 200W', assemblyUnit: 'PCS', quantity: 2, reserved2: 'H1-H2', type: 'both', source: 'manual', sortOrder: 1 },
        { id: 'bi036', materialCatalogNo: 'M-BZ-102', chineseDescription: '横封加热块', reserved1: '铜合金 300W', assemblyUnit: 'PCS', quantity: 2, reserved2: 'H3-H4', type: 'both', source: 'manual', sortOrder: 2 },
        { id: 'bi037', materialCatalogNo: 'ELEC-008', chineseDescription: '伺服电机', reserved1: 'MSMD022G1U 200W', assemblyUnit: 'TAI', quantity: 1, reserved2: 'M2', type: 'order', source: 'import', sortOrder: 3 },
        { id: 'bi038', materialCatalogNo: 'MECH-004', chineseDescription: '联轴器', reserved1: 'LK4-C30', assemblyUnit: 'PCS', quantity: 1, type: 'order', source: 'import', sortOrder: 4 }
      ]
    },
    createdAt: '2026-03-08T08:00:00.000Z',
    updatedAt: '2026-06-15T08:00:00.000Z'
  },
  // ===== 通用模块 =====
  {
    id: 'mod010',
    drawingNo: 'ASM-ELEC-001',
    nameZh: '电气柜',
    nameEn: 'Electrical Cabinet',
    equipmentId: 'eq001',
    configurationIds: ['cfg002', 'cfg006'],
    tags: ['tag001', 'tag004'],
    childModuleIds: [],
    bom: {
      moduleId: 'mod010',
      items: [
        { id: 'bi039', materialCatalogNo: 'ELEC-001', chineseDescription: '断路器', reserved1: 'NM1-63/3300 32A', assemblyUnit: 'PCS', quantity: 1, reserved2: 'Q1', type: 'order', source: 'import', sortOrder: 1 },
        { id: 'bi040', materialCatalogNo: 'ELEC-002', chineseDescription: '接触器', reserved1: 'CJX2-1810 AC220V', assemblyUnit: 'PCS', quantity: 3, type: 'order', source: 'import', sortOrder: 2 },
        { id: 'bi041', materialCatalogNo: 'ELEC-010', chineseDescription: '控制电缆', reserved1: 'RVV 4×1.5', assemblyUnit: 'M', quantity: 15, type: 'order', source: 'import', sortOrder: 3 },
        { id: 'bi042', materialCatalogNo: 'M-ELEC-001', chineseDescription: '电气柜柜体', reserved1: '600×400×1200 IP54', assemblyUnit: 'TAI', quantity: 1, type: 'both', source: 'manual', sortOrder: 4 }
      ]
    },
    remark: '高配电气柜，含断路器和接触器',
    createdAt: '2026-04-01T08:00:00.000Z',
    updatedAt: '2026-07-20T08:00:00.000Z'
  },
  {
    id: 'mod011',
    drawingNo: 'ASM-PNEU-001',
    nameZh: '气动系统',
    nameEn: 'Pneumatic System',
    equipmentId: 'eq001',
    configurationIds: ['cfg002', 'cfg004'],
    tags: ['tag003', 'tag006'],
    childModuleIds: [],
    bom: {
      moduleId: 'mod011',
      items: [
        { id: 'bi043', materialCatalogNo: 'MECH-009', chineseDescription: '电磁阀组', reserved1: '4V210-08 5联', assemblyUnit: 'SET', quantity: 1, reserved2: 'V1', type: 'order', source: 'import', sortOrder: 1 },
        { id: 'bi044', materialCatalogNo: 'MECH-008', chineseDescription: '标准气缸', reserved1: 'SC40×100', assemblyUnit: 'PCS', quantity: 2, type: 'order', source: 'import', sortOrder: 2 },
        { id: 'bi045', materialCatalogNo: 'AUX-002', chineseDescription: '气动接头', reserved1: 'PC8-02', assemblyUnit: 'PCS', quantity: 10, type: 'order', source: 'import', sortOrder: 3 },
        { id: 'bi046', materialCatalogNo: 'AUX-003', chineseDescription: '气管', reserved1: 'Φ8 PU 透明', assemblyUnit: 'M', quantity: 10, type: 'order', source: 'import', sortOrder: 4 }
      ]
    },
    createdAt: '2026-04-10T08:00:00.000Z',
    updatedAt: '2026-06-20T08:00:00.000Z'
  }
]
