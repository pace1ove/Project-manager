import { db } from '@/db/index'
import { detectModuleCycle } from '@/utils/moduleGraph'
import type {
  Module, Equipment, EquipmentConfiguration, EquipmentSerial,
  Project, BomTemplateField
} from '@/types'

/**
 * 数据健康检查：检测孤儿数据、无效引用、循环引用等问题
 * 直接操作 IndexedDB，修复后由调用方重新 initialize 各 store
 */

export type IssueType =
  | 'invalid_parent_module'        // 父组件不存在
  | 'invalid_equipment_ref'        // 引用了不存在的设备
  | 'invalid_config_ref'            // 引用了不存在的配置
  | 'invalid_project_module_ref'   // 项目引用了不存在的组件
  | 'invalid_project_config_ref'  // 项目引用了不存在的配置
  | 'invalid_serial_ref'           // 序列号引用了不存在的设备/项目
  | 'unknown_bom_field'            // BOM 条目包含模板中不存在的字段
  | 'circular_module_ref'           // 组件父子循环引用

export interface HealthIssue {
  id: string
  type: IssueType
  severity: 'error' | 'warning'
  /** 涉及数据的可读名称 */
  targetName: string
  /** 涉及数据的主键 ID */
  targetId: string
  /** 问题详细描述 */
  detail: string
  /** 修复建议 */
  suggestion: string
  /** 是否可自动修复 */
  fixable: boolean
}

const SYSTEM_FIELDS = new Set([
  'id', 'moduleId', 'projectId', 'sortOrder', 'source',
  'sourceModuleIds', 'type', 'createdAt', 'updatedAt'
])

let issueSeq = 0
function nextIssueId(): string {
  issueSeq++
  return `issue_${Date.now()}_${issueSeq}`
}

/** 主检测函数 */
export async function detectAllIssues(): Promise<HealthIssue[]> {
  const issues: HealthIssue[] = []

  const [
    equipments, configurations, serials, modules, projects, bomItems, orderBomItems, templateFields
  ] = await Promise.all([
    db.equipment.toArray(),
    db.configurations.toArray(),
    db.serials.toArray(),
    db.modules.toArray(),
    db.projects.toArray(),
    db.bomItems.toArray(),
    db.orderBomItems.toArray(),
    db.bomTemplates.toArray()
  ])

  const equipmentIds = new Set(equipments.map((e) => e.id))
  const configIds = new Set(configurations.map((c) => c.id))
  const moduleIds = new Set(modules.map((m) => m.id))
  const projectIds = new Set(projects.map((p) => p.id))

  const eqName = (id: string) => equipments.find((e) => e.id === id)?.name || id
  const modName = (id: string) => modules.find((m) => m.id === id)?.nameZh || id
  const cfgName = (id: string) => configurations.find((c) => c.id === id)?.name || id

  // 1. 组件：父组件不存在（支持多父模块）
  for (const m of modules) {
    const parentIds = m.parentModuleIds || []
    for (const parentId of parentIds) {
      if (parentId && !moduleIds.has(parentId)) {
        issues.push({
          id: nextIssueId(),
          type: 'invalid_parent_module',
          severity: 'error',
          targetName: `${m.nameZh}（${m.drawingNo}）`,
          targetId: m.id,
          detail: `父组件 ID「${parentId}」不存在`,
          suggestion: '将该组件提升为顶层组件（清空 parentModuleIds）',
          fixable: true
        })
      }
    }
  }

  // 2. 配置：引用了不存在的设备
  for (const c of configurations) {
    if (c.equipmentId && !equipmentIds.has(c.equipmentId)) {
      issues.push({
        id: nextIssueId(),
        type: 'invalid_equipment_ref',
        severity: 'error',
        targetName: `配置「${c.name}」`,
        targetId: c.id,
        detail: `所属设备「${eqName(c.equipmentId)}」不存在`,
        suggestion: '将该配置的 equipmentId 置空',
        fixable: true
      })
    }
  }

  // 3. 组件：引用了不存在的设备 / 配置
  for (const m of modules) {
    if (m.equipmentId && !equipmentIds.has(m.equipmentId)) {
      issues.push({
        id: nextIssueId(),
        type: 'invalid_equipment_ref',
        severity: 'error',
        targetName: `组件「${m.nameZh}」`,
        targetId: m.id,
        detail: `所属设备「${eqName(m.equipmentId)}」不存在`,
        suggestion: '将该组件的 equipmentId 置空',
        fixable: true
      })
    }
    const badCfgRefs = (m.configurationIds || []).filter((cid) => !configIds.has(cid))
    if (badCfgRefs.length > 0) {
      issues.push({
        id: nextIssueId(),
        type: 'invalid_config_ref',
        severity: 'error',
        targetName: `组件「${m.nameZh}」`,
        targetId: m.id,
        detail: `引用了 ${badCfgRefs.length} 个不存在的配置：${badCfgRefs.map(cfgName).join('、')}`,
        suggestion: '从 configurationIds 中移除无效配置引用',
        fixable: true
      })
    }
  }

  // 4. 项目：引用了不存在的组件 / 配置
  for (const p of projects) {
    const badModRefs = (p.selectedModules || [])
      .filter((s) => !moduleIds.has(s.moduleId))
      .map((s) => s.moduleId)
    if (badModRefs.length > 0) {
      issues.push({
        id: nextIssueId(),
        type: 'invalid_project_module_ref',
        severity: 'error',
        targetName: `项目「${p.name || p.jobNo}」`,
        targetId: p.id,
        detail: `引用了 ${badModRefs.length} 个不存在的组件：${badModRefs.map(modName).join('、')}`,
        suggestion: '从 selectedModules 中移除无效组件引用',
        fixable: true
      })
    }
    let configDirty = false
    let configDetail = ''
    if (p.configurationId && !configIds.has(p.configurationId)) {
      configDirty = true
      configDetail = `单配置「${cfgName(p.configurationId)}」不存在`
    }
    const badCombo = (p.configCombinations || []).filter((cc) => !configIds.has(cc.configurationId))
    if (badCombo.length > 0) {
      configDirty = true
      configDetail = `配置组合引用了 ${badCombo.length} 个不存在的配置：${badCombo.map((cc) => cfgName(cc.configurationId)).join('、')}`
    }
    if (configDirty) {
      issues.push({
        id: nextIssueId(),
        type: 'invalid_project_config_ref',
        severity: 'error',
        targetName: `项目「${p.name || p.jobNo}」`,
        targetId: p.id,
        detail: configDetail,
        suggestion: '清除无效的配置引用',
        fixable: true
      })
    }
    if (p.equipmentId && !equipmentIds.has(p.equipmentId)) {
      issues.push({
        id: nextIssueId(),
        type: 'invalid_equipment_ref',
        severity: 'error',
        targetName: `项目「${p.name || p.jobNo}」`,
        targetId: p.id,
        detail: `所属设备「${eqName(p.equipmentId)}」不存在`,
        suggestion: '将该项目的 equipmentId 置空',
        fixable: true
      })
    }
  }

  // 5. 序列号：引用了不存在的设备/项目
  for (const s of serials) {
    const bad: string[] = []
    if (s.equipmentId && !equipmentIds.has(s.equipmentId)) bad.push(`设备「${eqName(s.equipmentId)}」`)
    if (s.projectId && !projectIds.has(s.projectId)) bad.push(`项目「${s.projectId}」`)
    if (bad.length > 0) {
      issues.push({
        id: nextIssueId(),
        type: 'invalid_serial_ref',
        severity: 'warning',
        targetName: `序列号「${s.serialNumber}」`,
        targetId: s.id,
        detail: `引用了不存在的：${bad.join('、')}`,
        suggestion: '清除序列号中的无效引用',
        fixable: true
      })
    }
  }

  // 6. BOM 条目：包含模板中不存在的字段 key
  const knownKeys = new Set(templateFields.map((f: BomTemplateField) => f.key))
  const unknownKeyMap = new Map<string, { table: string; itemId: string; key: string }>()
  const scanUnknown = (rows: Record<string, any>[], table: string) => {
    for (const row of rows) {
      for (const key of Object.keys(row)) {
        if (SYSTEM_FIELDS.has(key)) continue
        if (!knownKeys.has(key)) {
          unknownKeyMap.set(`${table}:${row.id}:${key}`, { table, itemId: row.id, key })
        }
      }
    }
  }
  scanUnknown(bomItems as unknown as Record<string, any>[], 'bomItems')
  scanUnknown(orderBomItems as unknown as Record<string, any>[], 'orderBomItems')
  // 聚合成汇总问题（按 key 聚合，避免报告过长）
  const byKeyCount = new Map<string, number>()
  for (const v of unknownKeyMap.values()) {
    byKeyCount.set(v.key, (byKeyCount.get(v.key) || 0) + 1)
  }
  for (const [key, count] of byKeyCount) {
    issues.push({
      id: nextIssueId(),
      type: 'unknown_bom_field',
      severity: 'warning',
      targetName: `未登记字段「${key}」`,
      targetId: key,
      detail: `该字段出现在 ${count} 条 BOM 条目中，但未在 BOM 模板中登记`,
      suggestion: '可在模板中登记该字段，或从 BOM 数据中清除',
      fixable: false
    })
  }

  // 7. 循环引用
  const cycleIds = detectModuleCycle(modules) || []
  for (const id of cycleIds) {
    const m = modules.find((x) => x.id === id)!
    const parentNames = (m.parentModuleIds || []).map(pid => modName(pid)).join('、')
    issues.push({
      id: nextIssueId(),
      type: 'circular_module_ref',
      severity: 'error',
      targetName: `组件「${m.nameZh}（${m.drawingNo}）」`,
      targetId: id,
      detail: `组件父子关系形成循环（→ ${parentNames} → … → 自身）`,
      suggestion: '断开循环：将该组件提升为顶层',
      fixable: true
    })
  }

  return issues
}

/**
 * 修复单个问题（直接操作 DB）
 */
export async function fixIssue(issue: HealthIssue): Promise<void> {
  switch (issue.type) {
    case 'invalid_parent_module':
    case 'circular_module_ref': {
      const m = await db.modules.get(issue.targetId)
      if (m) {
        m.parentModuleIds = []
        await db.modules.put(m)
      }
      break
    }
    case 'invalid_equipment_ref': {
      // 根据 targetId 判断是配置还是组件还是项目
      if (await db.configurations.get(issue.targetId)) {
        const c = await db.configurations.get(issue.targetId)
        c!.equipmentId = ''
        await db.configurations.put(c!)
      } else if (await db.modules.get(issue.targetId)) {
        const m = await db.modules.get(issue.targetId)
        m!.equipmentId = ''
        await db.modules.put(m!)
      } else if (await db.projects.get(issue.targetId)) {
        const p = await db.projects.get(issue.targetId)
        p!.equipmentId = ''
        await db.projects.put(p!)
      }
      break
    }
    case 'invalid_config_ref': {
      const m = await db.modules.get(issue.targetId)
      if (m) {
        const cfgList = await db.configurations.toCollection().primaryKeys()
        const cfgSet = new Set(cfgList)
        m.configurationIds = m.configurationIds.filter((cid) => cfgSet.has(cid))
        await db.modules.put(m)
      }
      break
    }
    case 'invalid_project_module_ref': {
      const p = await db.projects.get(issue.targetId)
      if (p) {
        const modList = await db.modules.toCollection().primaryKeys()
        const modSet = new Set(modList)
        p.selectedModules = (p.selectedModules || []).filter((s) => modSet.has(s.moduleId))
        await db.projects.put(p)
      }
      break
    }
    case 'invalid_project_config_ref': {
      const p = await db.projects.get(issue.targetId)
      if (p) {
        const cfgList = await db.configurations.toCollection().primaryKeys()
        const cfgSet = new Set(cfgList)
        if (p.configurationId && !cfgSet.has(p.configurationId)) p.configurationId = ''
        p.configCombinations = (p.configCombinations || []).filter((cc) => cfgSet.has(cc.configurationId))
        await db.projects.put(p)
      }
      break
    }
    case 'invalid_serial_ref': {
      const s = await db.serials.get(issue.targetId)
      if (s) {
        const eqList = await db.equipment.toCollection().primaryKeys()
        const eqSet = new Set(eqList)
        const prjList = await db.projects.toCollection().primaryKeys()
        const prjSet = new Set(prjList)
        if (s.equipmentId && !eqSet.has(s.equipmentId)) s.equipmentId = ''
        if (s.projectId && !prjSet.has(s.projectId)) s.projectId = undefined
        await db.serials.put(s)
      }
      break
    }
    case 'unknown_bom_field': {
      // 汇总类问题：从所有 BOM 条目中删除该 key
      for (const table of [db.bomItems, db.orderBomItems] as const) {
        const rows = await table.toArray()
        const updates: typeof rows = []
        for (const row of rows) {
          const rec = row as unknown as Record<string, any>
          if (issue.targetId in rec) {
            const updated = { ...rec }
            delete updated[issue.targetId]
            updates.push(updated as any)
          }
        }
        if (updates.length > 0) await (table as any).bulkPut(updates)
      }
      break
    }
  }
}

/** 一键修复所有可修复问题 */
export async function fixAllFixable(issues: HealthIssue[]): Promise<{ fixed: number; skipped: number }> {
  let fixed = 0
  let skipped = 0
  for (const issue of issues) {
    if (!issue.fixable) {
      skipped++
      continue
    }
    try {
      await fixIssue(issue)
      fixed++
    } catch (e) {
      console.error('修复失败:', issue, e)
      skipped++
    }
  }
  return { fixed, skipped }
}
