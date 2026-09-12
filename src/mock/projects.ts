import type { Project } from '@/types'

export const mockProjects: Project[] = [
  {
    id: 'prj001',
    name: '客户A灌装机订单',
    jobNo: 'JOB-2026-001',
    customer: '苏州食品有限公司',
    customerLocation: '苏州工业园区',
    status: 'ongoing',
    equipmentId: 'eq001',
    equipmentModel: 'GZX-100',
    configurationId: 'cfg001',
    configCombinations: [
      { id: 'cc001', configurationId: 'cfg001', quantity: 1, remark: '标准配置' }
    ],
    serialNumber: 'GZX100-2026-001',
    projectTypeId: 'pt001',
    relatedProjectIds: [],
    customerRequirements: [
      { id: 'cr001', content: '灌装量500ml，精度±1%' },
      { id: 'cr002', content: '接触物料部分316L不锈钢' },
      { id: 'cr003', content: '交付日期2026年12月' }
    ],
    selectedModules: [
      { moduleId: 'mod001', quantity: 1 },
      { moduleId: 'mod002', quantity: 1 },
      { moduleId: 'mod003', quantity: 1 },
      { moduleId: 'mod004', quantity: 1 },
      { moduleId: 'mod005', quantity: 1 }
    ],
    orderBom: [
      { id: 'ob001', materialCatalogNo: 'M-GZ-001', chineseDescription: '主机架焊接件', reserved1: '304不锈钢 2000×800×1500', assemblyUnit: 'SET', quantity: 1, reserved2: 'A1', sourceModuleIds: ['mod001'], source: 'generated', sortOrder: 1 },
      { id: 'ob002', materialCatalogNo: 'STD-001', chineseDescription: '内六角螺栓', reserved1: 'M8×25 8.8级', assemblyUnit: 'PCS', quantity: 20, sourceModuleIds: ['mod001'], source: 'generated', sortOrder: 2 },
      { id: 'ob003', materialCatalogNo: 'STD-003', chineseDescription: '平垫圈', reserved1: 'Φ8', assemblyUnit: 'PCS', quantity: 20, sourceModuleIds: ['mod001'], source: 'generated', sortOrder: 3 },
      { id: 'ob004', materialCatalogNo: 'M-GZ-101', chineseDescription: '灌装阀体', reserved1: '316L不锈钢 DN25', assemblyUnit: 'PCS', quantity: 4, reserved2: 'B1-B4', sourceModuleIds: ['mod002'], source: 'generated', sortOrder: 4 },
      { id: 'ob005', materialCatalogNo: 'M-GZ-102', chineseDescription: '活塞组件', reserved1: 'Φ25 316L', assemblyUnit: 'PCS', quantity: 4, sourceModuleIds: ['mod002'], source: 'generated', sortOrder: 5 },
      { id: 'ob006', materialCatalogNo: 'M-GZ-103', chineseDescription: '密封圈', reserved1: 'Φ25 硅胶', assemblyUnit: 'PCS', quantity: 8, sourceModuleIds: ['mod002'], source: 'generated', remarks: '易损件', sortOrder: 6 },
      { id: 'ob007', materialCatalogNo: 'MECH-008', chineseDescription: '标准气缸', reserved1: 'SC32×50', assemblyUnit: 'PCS', quantity: 4, reserved2: 'C1-C4', sourceModuleIds: ['mod002'], source: 'generated', sortOrder: 7 },
      { id: 'ob008', materialCatalogNo: 'MECH-009', chineseDescription: '电磁阀', reserved1: '4V210-08 DC24V', assemblyUnit: 'PCS', quantity: 1, sourceModuleIds: ['mod002'], source: 'generated', sortOrder: 8 },
      { id: 'ob009', materialCatalogNo: 'M-SS-001', chineseDescription: '输送带', reserved1: 'PU白色 2000×100mm', assemblyUnit: 'M', quantity: 2.5, sourceModuleIds: ['mod003'], source: 'generated', sortOrder: 9 },
      { id: 'ob010', materialCatalogNo: 'MECH-001', chineseDescription: '输送电机', reserved1: 'YE3-80M1-4 0.55KW', assemblyUnit: 'TAI', quantity: 1, reserved2: 'D1', sourceModuleIds: ['mod003'], source: 'generated', sortOrder: 10 },
      { id: 'ob011', materialCatalogNo: 'MECH-002', chineseDescription: '减速机', reserved1: 'NMRV040 速比20', assemblyUnit: 'TAI', quantity: 1, sourceModuleIds: ['mod003'], source: 'generated', sortOrder: 11 },
      { id: 'ob012', materialCatalogNo: 'MECH-003', chineseDescription: '滚筒轴承', reserved1: '6204-2RS', assemblyUnit: 'PCS', quantity: 8, sourceModuleIds: ['mod003'], source: 'generated', sortOrder: 12 },
      { id: 'ob013', materialCatalogNo: 'ELEC-009', chineseDescription: 'PLC模块', reserved1: 'S7-1200 CPU1214C', assemblyUnit: 'PCS', quantity: 1, reserved2: 'U1', sourceModuleIds: ['mod004'], source: 'generated', sortOrder: 13 },
      { id: 'ob014', materialCatalogNo: 'ELEC-007', chineseDescription: '变频器', reserved1: 'MD320T1.5GB', assemblyUnit: 'TAI', quantity: 1, reserved2: 'U2', sourceModuleIds: ['mod004'], source: 'generated', sortOrder: 14 },
      { id: 'ob015', materialCatalogNo: 'ELEC-011', chineseDescription: '开关电源', reserved1: 'S-120-24 24V/5A', assemblyUnit: 'PCS', quantity: 1, reserved2: 'PS1', sourceModuleIds: ['mod004'], source: 'generated', sortOrder: 15 },
      { id: 'ob016', materialCatalogNo: 'ELEC-004', chineseDescription: '按钮开关', reserved1: 'LA38-11', assemblyUnit: 'PCS', quantity: 6, sourceModuleIds: ['mod004'], source: 'generated', sortOrder: 16 },
      { id: 'ob017', materialCatalogNo: 'ELEC-005', chineseDescription: '指示灯', reserved1: 'AD16-22DS', assemblyUnit: 'PCS', quantity: 4, sourceModuleIds: ['mod004'], source: 'generated', sortOrder: 17 },
      { id: 'ob018', materialCatalogNo: 'M-FR-001', chineseDescription: '方管机架', reserved1: '40×40×2 碳钢喷塑', assemblyUnit: 'SET', quantity: 1, sourceModuleIds: ['mod005'], source: 'generated', sortOrder: 18 },
      { id: 'ob019', materialCatalogNo: 'STD-001', chineseDescription: '内六角螺栓', reserved1: 'M6×20 8.8级', assemblyUnit: 'PCS', quantity: 30, sourceModuleIds: ['mod005'], source: 'generated', sortOrder: 19 },
      { id: 'ob020', materialCatalogNo: 'STD-002', chineseDescription: '六角螺母', reserved1: 'M6', assemblyUnit: 'PCS', quantity: 30, sourceModuleIds: ['mod005'], source: 'generated', sortOrder: 20 },
      { id: 'ob021', materialCatalogNo: 'STD-003', chineseDescription: '平垫圈', reserved1: 'Φ6', assemblyUnit: 'PCS', quantity: 30, sourceModuleIds: ['mod005'], source: 'generated', sortOrder: 21 },
      // 手动添加行（浅黄色高亮）
      { id: 'ob022', materialCatalogNo: 'AUX-001', chineseDescription: '绝缘胶带', reserved1: 'PVC 18mm×20m', assemblyUnit: 'PING', quantity: 2, sourceModuleIds: [], source: 'manual', remarks: '现场调试用', sortOrder: 22 }
    ],
    createdAt: '2026-06-01T08:00:00.000Z',
    updatedAt: '2026-09-01T08:00:00.000Z'
  },
  {
    id: 'prj002',
    name: '客户B贴标机订单',
    jobNo: 'JOB-2026-002',
    customer: '上海日化有限公司',
    customerLocation: '上海浦东',
    status: 'ongoing',
    equipmentId: 'eq002',
    equipmentModel: 'TBX-50',
    configurationId: 'cfg003',
    configCombinations: [
      { id: 'cc002', configurationId: 'cfg003', quantity: 1, remark: '高速配置' }
    ],
    serialNumber: 'TBX50-2026-001',
    projectTypeId: 'pt001',
    relatedProjectIds: [],
    customerRequirements: [
      { id: 'cr004', content: '圆瓶贴标，直径30-80mm' },
      { id: 'cr005', content: '标签材质铜版纸' }
    ],
    selectedModules: [
      { moduleId: 'mod006', quantity: 1 },
      { moduleId: 'mod007', quantity: 1 },
      { moduleId: 'mod004', quantity: 1 },
      { moduleId: 'mod005', quantity: 1 }
    ],
    orderBom: [
      { id: 'ob030', materialCatalogNo: 'M-TB-001', chineseDescription: '贴标头主体', reserved1: '6061铝合金 阳极氧化', assemblyUnit: 'SET', quantity: 1, sourceModuleIds: ['mod006'], source: 'generated', sortOrder: 1 },
      { id: 'ob031', materialCatalogNo: 'M-TB-002', chineseDescription: '剥标板', reserved1: '钨钢 锐角', assemblyUnit: 'PCS', quantity: 1, sourceModuleIds: ['mod006'], source: 'generated', sortOrder: 2 },
      { id: 'ob032', materialCatalogNo: 'ELEC-008', chineseDescription: '伺服电机', reserved1: 'MSMD012G1U 100W', assemblyUnit: 'TAI', quantity: 1, reserved2: 'M1', sourceModuleIds: ['mod006'], source: 'generated', sortOrder: 3 },
      { id: 'ob033', materialCatalogNo: 'MECH-003', chineseDescription: '导辊轴承', reserved1: '6002-2RS', assemblyUnit: 'PCS', quantity: 6, sourceModuleIds: ['mod006'], source: 'generated', sortOrder: 4 },
      { id: 'ob034', materialCatalogNo: 'M-TB-101', chineseDescription: '料盘组件', reserved1: 'Φ300 可调', assemblyUnit: 'SET', quantity: 1, sourceModuleIds: ['mod007'], source: 'generated', sortOrder: 5 },
      { id: 'ob035', materialCatalogNo: 'MECH-008', chineseDescription: '张力气缸', reserved1: 'CDJ2B10-30', assemblyUnit: 'PCS', quantity: 1, sourceModuleIds: ['mod007'], source: 'generated', sortOrder: 6 },
      { id: 'ob036', materialCatalogNo: 'ELEC-003', chineseDescription: '标签传感器', reserved1: '电容式 NPN', assemblyUnit: 'PCS', quantity: 1, reserved2: 'S1', sourceModuleIds: ['mod007'], source: 'generated', sortOrder: 7 },
      { id: 'ob037', materialCatalogNo: 'ELEC-009', chineseDescription: 'PLC模块', reserved1: 'S7-1200 CPU1214C', assemblyUnit: 'PCS', quantity: 1, sourceModuleIds: ['mod004'], source: 'generated', sortOrder: 8 },
      { id: 'ob038', materialCatalogNo: 'ELEC-007', chineseDescription: '变频器', reserved1: 'MD320T1.5GB', assemblyUnit: 'TAI', quantity: 1, sourceModuleIds: ['mod004'], source: 'generated', sortOrder: 9 },
      { id: 'ob039', materialCatalogNo: 'M-FR-001', chineseDescription: '方管机架', reserved1: '40×40×2 碳钢喷塑', assemblyUnit: 'SET', quantity: 1, sourceModuleIds: ['mod005'], source: 'generated', sortOrder: 10 }
    ],
    createdAt: '2026-07-15T08:00:00.000Z',
    updatedAt: '2026-08-20T08:00:00.000Z'
  }
]
