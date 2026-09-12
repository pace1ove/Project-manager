import { ref, computed } from 'vue'

/**
 * 性能设置（虚拟滚动开关与阈值）
 * 通过 localStorage 持久化，全局共享响应式状态
 */

const VS_ENABLED_KEY = 'bom-manager-virtual-scroll'
const VS_BOM_THRESHOLD_KEY = 'bom-manager-virtual-scroll-bom-threshold'
const VS_LIST_THRESHOLD_KEY = 'bom-manager-virtual-scroll-list-threshold'

// 全局单例响应式状态（模块级，跨组件共享）
const virtualScrollEnabled = ref<boolean>(loadEnabled())
const bomThreshold = ref<number>(loadThreshold(VS_BOM_THRESHOLD_KEY, 500))
const listThreshold = ref<number>(loadThreshold(VS_LIST_THRESHOLD_KEY, 200))

function loadEnabled(): boolean {
  try {
    const raw = localStorage.getItem(VS_ENABLED_KEY)
    if (raw === null) return true // 默认开启
    return raw === 'true'
  } catch {
    return true
  }
}

function loadThreshold(key: string, fallback: number): number {
  try {
    const raw = localStorage.getItem(key)
    if (raw === null) return fallback
    const n = parseInt(raw, 10)
    return Number.isFinite(n) && n > 0 ? n : fallback
  } catch {
    return fallback
  }
}

export function usePerformanceSettings() {
  function setVirtualScrollEnabled(val: boolean) {
    virtualScrollEnabled.value = val
    try {
      localStorage.setItem(VS_ENABLED_KEY, String(val))
    } catch { /* ignore */ }
  }

  function setBomThreshold(val: number) {
    bomThreshold.value = val
    try {
      localStorage.setItem(VS_BOM_THRESHOLD_KEY, String(val))
    } catch { /* ignore */ }
  }

  function setListThreshold(val: number) {
    listThreshold.value = val
    try {
      localStorage.setItem(VS_LIST_THRESHOLD_KEY, String(val))
    } catch { /* ignore */ }
  }

  /** BOM表格是否应启用虚拟滚动：开关开启 且 数据量超过阈值 */
  function shouldUseBomVirtualScroll(rowCount: number): boolean {
    return virtualScrollEnabled.value && rowCount > bomThreshold.value
  }

  /** 列表是否应启用虚拟滚动：开关开启 且 数据量超过阈值 */
  function shouldUseListVirtualScroll(rowCount: number): boolean {
    return virtualScrollEnabled.value && rowCount > listThreshold.value
  }

  return {
    virtualScrollEnabled: computed(() => virtualScrollEnabled.value),
    bomThreshold: computed(() => bomThreshold.value),
    listThreshold: computed(() => listThreshold.value),
    setVirtualScrollEnabled,
    setBomThreshold,
    setListThreshold,
    shouldUseBomVirtualScroll,
    shouldUseListVirtualScroll
  }
}
