import { ref, watch } from 'vue'

/**
 * 分页每页显示数量记忆composable
 * 自动将用户选择的每页显示数量保存到LocalStorage，下次访问时自动恢复
 *
 * @param storageKey LocalStorage存储的key，建议使用页面名称，如'equipment_list'
 * @param defaultValue 默认每页显示数量，默认20
 * @returns pageSize ref，可直接用于v-model:page-size
 */
export function usePageSize(storageKey: string, defaultValue: number = 20) {
  const STORAGE_PREFIX = 'bom_page_size_'
  const fullKey = STORAGE_PREFIX + storageKey

  // 从LocalStorage读取上次的设置，没有则使用默认值
  const loadSaved = (): number => {
    try {
      const saved = localStorage.getItem(fullKey)
      if (saved) {
        const parsed = parseInt(saved, 10)
        if (!isNaN(parsed) && parsed > 0) {
          return parsed
        }
      }
    } catch {
      // ignore
    }
    return defaultValue
  }

  const pageSize = ref<number>(loadSaved())

  // 监听变化，自动保存到LocalStorage
  watch(pageSize, (newVal) => {
    try {
      localStorage.setItem(fullKey, String(newVal))
    } catch {
      // ignore
    }
  })

  return pageSize
}
