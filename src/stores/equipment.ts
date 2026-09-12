import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Equipment, EquipmentConfiguration, EquipmentSerial, ConfigurationGroup } from '@/types'
import { db } from '@/db/index'
import { generateId, deepClone } from '@/utils/storage'
import { useModulesStore } from '@/stores/modules'
import { useProjectsStore } from '@/stores/projects'

/** 设备删除模式：
 * direct  = 无引用时直接物理删除
 * cascade = 级联删除：连同配置/序列号一起删除，解除组件/项目的设备关联
 * unlink  = 解除关联后删除：保留配置/序列号/组件/项目，仅断开与设备的关联
 */
export type EquipmentDeleteMode = 'direct' | 'cascade' | 'unlink'

export interface EquipmentReferencesInfo {
  configurationCount: number
  serialCount: number
  moduleCount: number
  projectCount: number
  configurationNames: string[]
  moduleNames: string[]
  projectNames: string[]
}

/** 配置删除模式：direct=直接删除；unlink=先解除组件/项目引用后删除 */
export type ConfigurationDeleteMode = 'direct' | 'unlink'

export interface ConfigurationReferencesInfo {
  moduleCount: number
  projectCount: number
  moduleNames: string[]
  projectNames: string[]
}

export const useEquipmentStore = defineStore('equipment', () => {
  const equipments = ref<Equipment[]>([])
  const configurations = ref<EquipmentConfiguration[]>([])
  const configurationGroups = ref<ConfigurationGroup[]>([])
  const serials = ref<EquipmentSerial[]>([])

  async function initialize() {
    const [eq, cfg, groups, sn] = await Promise.all([
      db.equipment.toArray(),
      db.configurations.toArray(),
      db.configurationGroups.toArray(),
      db.serials.toArray()
    ])
    equipments.value = eq
    configurations.value = cfg
    configurationGroups.value = groups
    serials.value = sn
  }

  // ===== 设备CRUD =====
  async function addEquipment(data: Omit<Equipment, 'id' | 'createdAt' | 'updatedAt' | 'changeHistory'>) {
    // 机型唯一性校验
    if (!isModelUnique(data.model)) {
      throw new Error(`设备型号「${data.model}」已存在，型号必须唯一`)
    }
    const item: Equipment = {
      ...data,
      id: generateId('eq'),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      changeHistory: [{ id: generateId('ch'), targetType: 'equipment', targetId: '', operation: '创建', detail: `创建设备${data.name}`, operator: 'admin', timestamp: new Date().toISOString() }]
    }
    item.changeHistory![0].targetId = item.id
    await db.equipment.add(item)
    equipments.value.push(item)
    return item
  }

  async function updateEquipment(id: string, data: Partial<Equipment>) {
    // 机型唯一性校验（如果修改了机型）
    if (data.model !== undefined && !isModelUnique(data.model, id)) {
      throw new Error(`设备型号「${data.model}」已存在，型号必须唯一`)
    }
    const idx = equipments.value.findIndex((e) => e.id === id)
    if (idx !== -1) {
      const original = equipments.value[idx]
      // 记录基本信息字段的变更前后值（用于 diff 与回滚）
      const BASIC_FIELDS = ['name', 'model', 'description', 'status']
      const beforeBasic: Record<string, any> = {}
      const afterBasic: Record<string, any> = {}
      const changedFields: string[] = []
      for (const f of BASIC_FIELDS) {
        if (f in data) {
          beforeBasic[f] = (original as any)[f]
          afterBasic[f] = (data as any)[f]
          if (String((original as any)[f] ?? '') !== String((data as any)[f] ?? '')) {
            changedFields.push(f)
          }
        }
      }
      const hasBasicChange = changedFields.length > 0
      const updated: Equipment = {
        ...original,
        ...data,
        updatedAt: new Date().toISOString(),
        changeHistory: hasBasicChange
          ? [
              ...(original.changeHistory || []),
              {
                id: generateId('ch'),
                targetType: 'equipment',
                targetId: id,
                operation: '更新',
                detail: `更新设备信息（${changedFields.join('、')}）`,
                operator: 'admin',
                timestamp: new Date().toISOString(),
                beforeData: beforeBasic,
                afterData: afterBasic
              }
            ]
          : (original.changeHistory || [])
      }
      await db.equipment.put(deepClone(updated))
      equipments.value[idx] = updated
    }
  }

  /**
   * 统计指定设备的关联引用（同步，基于内存数据）
   */
  function getEquipmentReferences(id: string): EquipmentReferencesInfo {
    const modulesStore = useModulesStore()
    const projectsStore = useProjectsStore()
    const cfgs = configurations.value.filter((c) => c.equipmentId === id)
    const sns = serials.value.filter((s) => s.equipmentId === id)
    const mods = modulesStore.modules.filter((m) => m.equipmentId === id)
    const prjs = projectsStore.projects.filter((p) => p.equipmentId === id)
    return {
      configurationCount: cfgs.length,
      serialCount: sns.length,
      moduleCount: mods.length,
      projectCount: prjs.length,
      configurationNames: cfgs.map((c) => c.name),
      moduleNames: mods.map((m) => m.nameZh || m.drawingNo),
      projectNames: prjs.map((p) => p.name || p.jobNo)
    }
  }

  async function deleteEquipment(id: string, mode: EquipmentDeleteMode = 'direct') {
    const idx = equipments.value.findIndex((e) => e.id === id)
    if (idx === -1) return
    const original = equipments.value[idx]
    const modulesStore = useModulesStore()
    const projectsStore = useProjectsStore()

    if (mode === 'cascade') {
      // 1. 删除该设备下的所有配置与序列号
      const cfgIds = configurations.value.filter((c) => c.equipmentId === id).map((c) => c.id)
      if (cfgIds.length > 0) {
        await db.configurations.bulkDelete(cfgIds)
        configurations.value = configurations.value.filter((c) => c.equipmentId !== id)
      }
      // 1b. 删除该设备下的所有配置分组
      const groupIds = configurationGroups.value.filter((g) => g.equipmentId === id).map((g) => g.id)
      if (groupIds.length > 0) {
        await db.configurationGroups.bulkDelete(groupIds)
        configurationGroups.value = configurationGroups.value.filter((g) => g.equipmentId !== id)
      }
      const snIds = serials.value.filter((s) => s.equipmentId === id).map((s) => s.id)
      if (snIds.length > 0) {
        await db.serials.bulkDelete(snIds)
        serials.value = serials.value.filter((s) => s.equipmentId !== id)
      }
      // 2. 解除组件的设备关联；同时清理已删除配置在组件 configurationIds 中的引用
      for (const m of modulesStore.modules) {
        let dirty = false
        if (m.equipmentId === id) {
          m.equipmentId = ''
          dirty = true
        }
        if (cfgIds.length > 0 && m.configurationIds.some((cid) => cfgIds.includes(cid))) {
          m.configurationIds = m.configurationIds.filter((cid) => !cfgIds.includes(cid))
          dirty = true
        }
        if (dirty) {
          await db.modules.put(deepClone(m))
        }
      }
      // 3. 项目保留，但 equipmentId 置空；清理已删除配置在项目中的引用
      for (const p of projectsStore.projects) {
        let dirty = false
        if (p.equipmentId === id) {
          p.equipmentId = ''
          dirty = true
        }
        if (p.configurationId && cfgIds.includes(p.configurationId)) {
          p.configurationId = ''
          dirty = true
        }
        if (Array.isArray(p.configCombinations) && p.configCombinations.some((cc) => cfgIds.includes(cc.configurationId))) {
          p.configCombinations = p.configCombinations.filter((cc) => !cfgIds.includes(cc.configurationId))
          dirty = true
        }
        if (dirty) {
          await db.projects.put(deepClone(p))
        }
      }
    } else if (mode === 'unlink') {
      // 保留配置/序列号/组件/项目，仅断开与设备的关联
      for (const c of configurations.value) {
        if (c.equipmentId === id) {
          c.equipmentId = ''
          await db.configurations.put(deepClone(c))
        }
      }
      for (const s of serials.value) {
        if (s.equipmentId === id) {
          s.equipmentId = ''
          await db.serials.put(deepClone(s))
        }
      }
      for (const m of modulesStore.modules) {
        if (m.equipmentId === id) {
          m.equipmentId = ''
          await db.modules.put(deepClone(m))
        }
      }
      for (const p of projectsStore.projects) {
        if (p.equipmentId === id) {
          p.equipmentId = ''
          await db.projects.put(deepClone(p))
        }
      }
    }

    // 物理删除设备本体
    await db.equipment.delete(id)
    equipments.value.splice(idx, 1)
    void original
  }

  function getEquipmentById(id: string): Equipment | undefined {
    return equipments.value.find((e) => e.id === id)
  }

  // ===== 唯一性校验（内存中查询） =====
  function isModelUnique(model: string, excludeId?: string): boolean {
    return !equipments.value.some((e) => e.model === model && e.id !== excludeId)
  }

  function isNameUnique(name: string, excludeId?: string): boolean {
    return !equipments.value.some((e) => e.name === name && e.id !== excludeId)
  }

  async function addChangeHistory(
    targetId: string,
    operation: string,
    detail: string,
    extra?: { beforeData?: any; afterData?: any; remark?: string }
  ) {
    const eq = getEquipmentById(targetId)
    if (eq) {
      if (!eq.changeHistory) eq.changeHistory = []
      eq.changeHistory.push({
        id: generateId('ch'),
        targetType: 'equipment',
        targetId,
        operation,
        detail,
        operator: 'admin',
        timestamp: new Date().toISOString(),
        remark: extra?.remark || '',
        beforeData: extra?.beforeData,
        afterData: extra?.afterData
      })
      await db.equipment.put(deepClone(eq))
    }
  }

  // ===== 配置CRUD =====
  function getConfigurationsByEquipment(equipmentId: string): EquipmentConfiguration[] {
    return configurations.value.filter((c) => c.equipmentId === equipmentId)
  }

  async function addConfiguration(data: Omit<EquipmentConfiguration, 'id'>) {
    const item: EquipmentConfiguration = { ...data, id: generateId('cfg') }
    await db.configurations.add(item)
    configurations.value.push(item)
    await addChangeHistory(data.equipmentId, '新增配置', `新增配置${data.name}`)
    return item
  }

  async function updateConfiguration(id: string, data: Partial<EquipmentConfiguration>) {
    const idx = configurations.value.findIndex((c) => c.id === id)
    if (idx !== -1) {
      const original = configurations.value[idx]
      const updated = { ...original, ...data }
      await db.configurations.put(deepClone(updated))
      configurations.value[idx] = updated
      await addChangeHistory(
        original.equipmentId,
        '修改配置',
        `修改配置 ${original.name}`,
        { beforeData: { name: original.name, description: original.description }, afterData: { name: updated.name, description: updated.description } }
      )
    }
  }

  /**
   * 统计指定配置的关联引用（同步，基于内存数据）
   */
  function getConfigurationReferences(id: string): ConfigurationReferencesInfo {
    const modulesStore = useModulesStore()
    const projectsStore = useProjectsStore()
    const mods = modulesStore.modules.filter((m) => m.configurationIds.includes(id))
    const prjs = projectsStore.projects.filter(
      (p) =>
        p.configurationId === id ||
        (Array.isArray(p.configCombinations) && p.configCombinations.some((cc) => cc.configurationId === id))
    )
    return {
      moduleCount: mods.length,
      projectCount: prjs.length,
      moduleNames: mods.map((m) => m.nameZh || m.drawingNo),
      projectNames: prjs.map((p) => p.name || p.jobNo)
    }
  }

  async function deleteConfiguration(id: string, mode: ConfigurationDeleteMode = 'direct') {
    const cfg = configurations.value.find((c) => c.id === id)
    if (!cfg) return

    // 无论 direct 还是 unlink 模式，都清理组件和项目中的悬空引用
    {
      const modulesStore = useModulesStore()
      const projectsStore = useProjectsStore()
      for (const m of modulesStore.modules) {
        if (Array.isArray(m.configurationIds) && m.configurationIds.includes(id)) {
          m.configurationIds = m.configurationIds.filter((cid) => cid !== id)
          await db.modules.put(deepClone(m))
        }
      }
      for (const p of projectsStore.projects) {
        let dirty = false
        if (p.configurationId === id) {
          p.configurationId = ''
          dirty = true
        }
        if (Array.isArray(p.configCombinations) && p.configCombinations.some((cc) => cc.configurationId === id)) {
          p.configCombinations = p.configCombinations.filter((cc) => cc.configurationId !== id)
          dirty = true
        }
        if (dirty) {
          await db.projects.put(deepClone(p))
        }
      }
    }

    await db.configurations.delete(id)
    configurations.value = configurations.value.filter((c) => c.id !== id)
    await addChangeHistory(cfg.equipmentId, '删除配置', `删除配置${cfg.name}`)
  }

  function getConfigurationById(id: string): EquipmentConfiguration | undefined {
    return configurations.value.find((c) => c.id === id)
  }

  // ===== 配置分组CRUD =====
  /** 按 sortOrder 排序返回指定设备下的所有分组 */
  function getConfigurationGroups(equipmentId: string): ConfigurationGroup[] {
    return configurationGroups.value
      .filter((g) => g.equipmentId === equipmentId)
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder)
  }

  /** 同设备下组名唯一性校验（excludeId 用于编辑时排除自身） */
  function isGroupNameUnique(name: string, equipmentId: string, excludeId?: string): boolean {
    return !configurationGroups.value.some(
      (g) => g.equipmentId === equipmentId && g.name === name && g.id !== excludeId
    )
  }

  /** 新增分组：校验组名不重复，sortOrder 自动取当前最大值+1 */
  async function addConfigurationGroup(
    data: Omit<ConfigurationGroup, 'id' | 'sortOrder'>
  ): Promise<ConfigurationGroup> {
    if (!isGroupNameUnique(data.name, data.equipmentId)) {
      throw new Error(`分组名「${data.name}」在该设备下已存在`)
    }
    const groups = getConfigurationGroups(data.equipmentId)
    const maxSort = groups.length > 0 ? groups[groups.length - 1].sortOrder : 0
    const item: ConfigurationGroup = {
      ...data,
      id: generateId('cfggrp'),
      sortOrder: maxSort + 1
    }
    await db.configurationGroups.add(item)
    configurationGroups.value.push(item)
    return item
  }

  /** 编辑分组：校验组名不重复（排除自身） */
  async function updateConfigurationGroup(id: string, data: Partial<ConfigurationGroup>): Promise<void> {
    const idx = configurationGroups.value.findIndex((g) => g.id === id)
    if (idx === -1) return
    const original = configurationGroups.value[idx]
    // 若修改了组名，校验唯一性
    if (data.name !== undefined && data.name !== original.name) {
      if (!isGroupNameUnique(data.name, original.equipmentId, id)) {
        throw new Error(`分组名「${data.name}」在该设备下已存在`)
      }
    }
    const updated = { ...original, ...data }
    await db.configurationGroups.put(deepClone(updated))
    configurationGroups.value[idx] = updated
  }

  /**
   * 删除分组：同时将该分组下所有配置的 groupId 置空（不删除配置）
   */
  async function deleteConfigurationGroup(id: string): Promise<void> {
    // 1. 将该分组下所有配置的 groupId 置空
    const dirtyCfgs = configurations.value.filter((c) => c.groupId === id)
    for (const c of dirtyCfgs) {
      c.groupId = undefined
      await db.configurations.put(deepClone(c))
    }
    // 2. 删除分组本身
    await db.configurationGroups.delete(id)
    configurationGroups.value = configurationGroups.value.filter((g) => g.id !== id)
  }

  function getConfigurationGroupById(id: string): ConfigurationGroup | undefined {
    return configurationGroups.value.find((g) => g.id === id)
  }

  /**
   * 按分组筛选配置：groupId 为 null 时返回未分组的配置
   */
  function getConfigurationsByGroup(equipmentId: string, groupId: string | null): EquipmentConfiguration[] {
    return configurations.value.filter((c) => {
      if (c.equipmentId !== equipmentId) return false
      if (groupId === null) {
        return !c.groupId
      }
      return c.groupId === groupId
    })
  }

  // ===== 序列号CRUD =====
  function getSerialsByEquipment(equipmentId: string): EquipmentSerial[] {
    return serials.value.filter((s) => s.equipmentId === equipmentId)
  }

  function getUnassignedSerials(equipmentId: string): EquipmentSerial[] {
    return serials.value.filter((s) => s.equipmentId === equipmentId && s.status === 'unassigned')
  }

  /** 获取指定设备下分配给指定项目的序列号 */
  function getAssignedSerialByProject(equipmentId: string, projectId: string): EquipmentSerial | undefined {
    return serials.value.find(
      (s) => s.equipmentId === equipmentId && s.projectId === projectId && s.status === 'assigned'
    )
  }

  async function addSerial(data: Omit<EquipmentSerial, 'id'>) {
    const item: EquipmentSerial = { ...data, id: generateId('sn') }
    await db.serials.add(item)
    serials.value.push(item)
    await addChangeHistory(data.equipmentId, '新增序列号', `新增序列号 ${data.serialNumber}`)
    return item
  }

  async function updateSerial(id: string, data: Partial<EquipmentSerial>) {
    const idx = serials.value.findIndex((s) => s.id === id)
    if (idx !== -1) {
      const original = serials.value[idx]
      const updated = { ...original, ...data }
      await db.serials.put(deepClone(updated))
      serials.value[idx] = updated
      await addChangeHistory(
        original.equipmentId,
        '修改序列号',
        `修改序列号 ${original.serialNumber}`,
        { beforeData: { serialNumber: original.serialNumber, remark: original.remark }, afterData: { serialNumber: updated.serialNumber, remark: updated.remark } }
      )
    }
  }

  async function deleteSerial(id: string) {
    const serial = serials.value.find((s) => s.id === id)
    await db.serials.delete(id)
    serials.value = serials.value.filter((s) => s.id !== id)
    if (serial) {
      await addChangeHistory(serial.equipmentId, '删除序列号', `删除序列号 ${serial.serialNumber}`)
    }
  }

  async function assignSerial(serialId: string, projectId: string) {
    const idx = serials.value.findIndex((s) => s.id === serialId)
    if (idx !== -1) {
      const serial = serials.value[idx]
      // 校验1：该序列号已分配给其他项目，禁止重复分配
      if (serial.status === 'assigned' && serial.projectId && serial.projectId !== projectId) {
        throw new Error('该序列号已分配给其他项目，无法重复分配')
      }
      // 校验2：该项目已分配过该设备的其他序列号，禁止一个项目占用同一设备的多个序列号
      const existingForProject = serials.value.find(
        (s) =>
          s.equipmentId === serial.equipmentId &&
          s.projectId === projectId &&
          s.status === 'assigned' &&
          s.id !== serialId
      )
      if (existingForProject) {
        throw new Error('该项目已分配过该设备的序列号，无法重复分配')
      }
      const updated = { ...serial, projectId, status: 'assigned' as const }
      await db.serials.put(deepClone(updated))
      serials.value[idx] = updated
      await addChangeHistory(serial.equipmentId, '分配序列号', `序列号 ${serial.serialNumber} 分配给项目 ${projectId}`)
    }
  }

  async function unassignSerial(serialId: string) {
    const idx = serials.value.findIndex((s) => s.id === serialId)
    if (idx !== -1) {
      const serial = serials.value[idx]
      const updated = { ...serial, projectId: undefined, status: 'unassigned' as const }
      await db.serials.put(deepClone(updated))
      serials.value[idx] = updated
      await addChangeHistory(serial.equipmentId, '取消分配序列号', `序列号 ${serial.serialNumber} 取消分配`)
    }
  }

  async function resetToMock() {
    await initialize()
  }

  return {
    equipments,
    configurations,
    configurationGroups,
    serials,
    initialize,
    addEquipment,
    updateEquipment,
    deleteEquipment,
    getEquipmentReferences,
    getEquipmentById,
    isModelUnique,
    isNameUnique,
    addChangeHistory,
    getConfigurationsByEquipment,
    addConfiguration,
    updateConfiguration,
    deleteConfiguration,
    getConfigurationReferences,
    getConfigurationById,
    getConfigurationGroups,
    isGroupNameUnique,
    addConfigurationGroup,
    updateConfigurationGroup,
    deleteConfigurationGroup,
    getConfigurationGroupById,
    getConfigurationsByGroup,
    getSerialsByEquipment,
    getUnassignedSerials,
    getAssignedSerialByProject,
    addSerial,
    updateSerial,
    deleteSerial,
    assignSerial,
    unassignSerial,
    resetToMock
  }
})
