import type { Module } from '@/types'

/**
 * 模块有向图统一遍历工具
 *
 * 边方向约定（与 Module 字段一致）：
 *  - parentModuleIds: 模块 → 其所有父模块（向上，祖先链）
 *  - childModuleIds:  模块 → 其所有子模块（向下，后代链）
 *
 * 全项目（stores/modules、ProjectEditor、bomGenerator、useModuleTree、dataHealthCheck）
 * 原先各自实现了一套后代遍历 / 祖先遍历 / 环检测 / 拓扑排序，这里统一收敛为一处。
 * 所有遍历均为循环安全（访问集合去重）。
 */

/** 构建 id -> Module 映射 */
function buildModuleMap(modules: Module[]): Map<string, Module> {
  return new Map(modules.map((m) => [m.id, m]))
}

/**
 * 获取模块的所有后代模块ID（沿 childModuleIds 向下递归，不含模块自身）。
 * 深度优先，结果顺序对业务无依赖（删除/缓存等场景只关心集合）。
 */
export function getDescendantModuleIds(moduleId: string, modules: Module[]): string[] {
  const byId = buildModuleMap(modules)
  const result: string[] = []
  const seen = new Set<string>([moduleId])
  const stack: string[] = [...(byId.get(moduleId)?.childModuleIds || [])]

  while (stack.length > 0) {
    const id = stack.pop()!
    if (seen.has(id)) continue
    seen.add(id)
    result.push(id)
    const mod = byId.get(id)
    if (mod) {
      for (const childId of mod.childModuleIds || []) {
        stack.push(childId)
      }
    }
  }
  return result
}

/**
 * 获取引用了指定模块的所有父模块ID（沿 parentModuleIds 向上递归祖先链，不含自身）。
 * 即：哪些模块会把 moduleId 当作后代。
 */
export function getReferencingModuleIds(moduleId: string, modules: Module[]): string[] {
  const byId = buildModuleMap(modules)
  const result: string[] = []
  const seen = new Set<string>([moduleId])
  const queue: string[] = [...(byId.get(moduleId)?.parentModuleIds || [])]

  while (queue.length > 0) {
    const id = queue.shift()!
    if (seen.has(id)) continue
    seen.add(id)
    result.push(id)
    const mod = byId.get(id)
    if (mod) {
      for (const parentId of mod.parentModuleIds || []) {
        if (!seen.has(parentId)) queue.push(parentId)
      }
    }
  }
  return result
}

/**
 * 检测模块图中是否存在环（沿 parentModuleIds 边方向做三色 DFS）。
 * @returns 参与成环的模块ID数组；无环时返回 null。
 *          语义与原 dataHealthCheck.findModuleCycles 一致（返回所有处于环上的节点）。
 */
export function detectModuleCycle(modules: Module[]): string[] | null {
  const byId = buildModuleMap(modules)
  const cycles = new Set<string>()
  // 0=未访问, 1=访问中(栈上), 2=已完成
  const state = new Map<string, 0 | 1 | 2>()

  function dfs(id: string, stack: string[]) {
    state.set(id, 1)
    stack.push(id)
    const mod = byId.get(id)
    for (const parent of mod?.parentModuleIds || []) {
      if (!byId.has(parent)) continue
      if (state.get(parent) === 1) {
        // 找到环：记录栈中从 parent 开始的所有节点
        const idx = stack.indexOf(parent)
        for (let i = idx; i < stack.length; i++) cycles.add(stack[i])
      } else if (!state.has(parent)) {
        dfs(parent, stack)
      }
    }
    stack.pop()
    state.set(id, 2)
  }

  for (const m of modules) {
    if (!state.has(m.id)) dfs(m.id, [])
  }
  return cycles.size > 0 ? [...cycles] : null
}

/**
 * 拓扑排序模块（按依赖关系：父模块在前，子模块在后，Kahn 算法）。
 * 仅统计集合内存在的父模块作为入度，外部（数据库中已存在但不在本批次）父模块不计入。
 * 若图中存在环，剩余模块按原顺序兜底追加，避免丢失。
 */
export function topologicalSortModules(modules: Module[]): Module[] {
  const byId = buildModuleMap(modules)
  const inDegree = new Map<string, number>()
  const childrenOf = new Map<string, string[]>()

  for (const m of modules) {
    const realParents = (m.parentModuleIds || []).filter((pid) => byId.has(pid))
    inDegree.set(m.id, realParents.length)
    for (const pid of realParents) {
      if (!childrenOf.has(pid)) childrenOf.set(pid, [])
      childrenOf.get(pid)!.push(m.id)
    }
  }

  const queue = modules.filter((m) => (inDegree.get(m.id) || 0) === 0).map((m) => m.id)
  const sorted: Module[] = []
  const sortedIds = new Set<string>()

  while (queue.length > 0) {
    const id = queue.shift()!
    const mod = byId.get(id)
    if (mod) {
      sorted.push(mod)
      sortedIds.add(id)
    }
    for (const childId of childrenOf.get(id) || []) {
      const d = (inDegree.get(childId) || 0) - 1
      inDegree.set(childId, d)
      if (d === 0) queue.push(childId)
    }
  }

  // 有环时兜底：按原顺序追加未处理模块，保证返回长度等于入参长度
  if (sorted.length < modules.length) {
    for (const m of modules) {
      if (!sortedIds.has(m.id)) sorted.push(m)
    }
  }
  return sorted
}
