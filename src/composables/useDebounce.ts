import { ref, onBeforeUnmount } from 'vue'

/**
 * 防抖函数工具
 *
 * 用法：
 *   const debouncedFn = useDebounceFn(() => { console.log('debounced') }, 300)
 *   debouncedFn() // 300ms 后执行
 */

/**
 * 创建防抖函数
 *
 * @param fn 要防抖的函数
 * @param delay 延迟毫秒数，默认 300
 */
export function useDebounceFn<T extends (...args: any[]) => any>(
  fn: T,
  delay = 300
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout> | null = null

  const debounced = (...args: Parameters<T>) => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      fn(...args)
      timer = null
    }, delay)
  }

  // 组件卸载时清除定时器
  onBeforeUnmount(() => {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
  })

  return debounced
}

/**
 * 防抖 ref：监听值变化，防抖后更新
 *
 * 用法：
 *   const debouncedSearch = useDebounceRef(searchKeyword, 300)
 */
export function useDebounceRef<T>(source: { value: T }, delay = 300) {
  const debounced = ref(source.value) as { value: T }
  let timer: ReturnType<typeof setTimeout> | null = null

  // 监听源值变化
  watchSource(source, () => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      debounced.value = source.value
    }, delay)
  })

  onBeforeUnmount(() => {
    if (timer) clearTimeout(timer)
  })

  return debounced
}

// 内部工具：监听 ref 变化（避免直接导入 watch 导致循环依赖）
import { watch } from 'vue'
function watchSource(source: { value: any }, cb: () => void) {
  watch(source, cb)
}
