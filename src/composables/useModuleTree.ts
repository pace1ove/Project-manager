import { ref, computed } from 'vue'
import type { Module } from '@/types'
import { getDescendantModuleIds } from '@/utils/moduleGraph'

/**
 * 模块树折叠管理组合式函数
 * 用于在表格中显示模块树时，支持折叠/展开子模块
 */
export function useModuleTree(modulesGetter: () => Module[]) {
  // 折叠状态：存储被折叠的模块ID
  const collapsedModuleIds = ref<Set<string>>(new Set())

  // 模块ID到子模块ID的映射（支持多父模块）
  const childrenMap = computed(() => {
    const map = new Map<string, string[]>()
    for (const mod of modulesGetter()) {
      const parentIds = mod.parentModuleIds || []
      for (const parentId of parentIds) {
        if (!map.has(parentId)) {
          map.set(parentId, [])
        }
        if (!map.get(parentId)!.includes(mod.id)) {
          map.get(parentId)!.push(mod.id)
        }
      }
    }
    return map
  })

  // 判断模块是否有子模块
  function hasChildren(moduleId: string): boolean {
    return childrenMap.value.has(moduleId) && childrenMap.value.get(moduleId)!.length > 0
  }

  // 判断模块是否被折叠
  function isCollapsed(moduleId: string): boolean {
    return collapsedModuleIds.value.has(moduleId)
  }

  // 切换折叠状态
  function toggleCollapse(moduleId: string) {
    if (collapsedModuleIds.value.has(moduleId)) {
      collapsedModuleIds.value.delete(moduleId)
    } else {
      collapsedModuleIds.value.add(moduleId)
    }
    // 触发响应式更新
    collapsedModuleIds.value = new Set(collapsedModuleIds.value)
  }

  // 展开所有
  function expandAll() {
    collapsedModuleIds.value = new Set()
  }

  // 折叠所有（只折叠有子模块的）
  function collapseAll() {
    const newSet = new Set<string>()
    for (const mod of modulesGetter()) {
      if (hasChildren(mod.id)) {
        newSet.add(mod.id)
      }
    }
    collapsedModuleIds.value = newSet
  }

  // 获取所有被折叠模块的后代模块ID（用于过滤）
  function getHiddenDescendantIds(): Set<string> {
    const hidden = new Set<string>()
    const allModules = modulesGetter()
    for (const moduleId of collapsedModuleIds.value) {
      for (const descId of getDescendantModuleIds(moduleId, allModules)) {
        hidden.add(descId)
      }
    }
    return hidden
  }

  // 过滤后的模块列表（隐藏被折叠模块的子模块）
  const filteredModules = computed(() => {
    const hidden = getHiddenDescendantIds()
    return modulesGetter().filter(mod => !hidden.has(mod.id))
  })

  return {
    collapsedModuleIds,
    hasChildren,
    isCollapsed,
    toggleCollapse,
    expandAll,
    collapseAll,
    filteredModules,
    getHiddenDescendantIds
  }
}
