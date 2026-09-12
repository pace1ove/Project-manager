import { ref, computed, watch, type Ref } from 'vue'
import { useDebounceFn } from '@/composables/useDebounce'

/**
 * 实时唯一性校验 Composable
 *
 * 在输入时实时校验字段唯一性（防抖300ms），不唯一时显示错误提示。
 *
 * 用法：
 *   const { error: drawingNoError, validate } = useUniqueValidation(
 *     () => modulesStore.isDrawingNoUnique(form.drawingNo, excludeId),
 *     () => form.drawingNo
 *   )
 */

export interface UseUniqueValidationOptions {
  /** 防抖延迟（毫秒），默认 300 */
  debounceMs?: number
}

export interface UseUniqueValidationReturn {
  /** 错误消息，空字符串表示通过 */
  error: Ref<string>
  /** 是否有错误 */
  hasError: Ref<boolean>
  /** 手动触发校验 */
  validate: () => void
  /** 清除错误 */
  clear: () => void
}

/**
 * 创建唯一性校验
 *
 * @param checkFn 返回 true 表示唯一（通过），false 表示重复
 * @param valueGetter 获取当前值的函数
 * @param options 配置项
 */
export function useUniqueValidation(
  checkFn: () => boolean,
  valueGetter: () => string,
  options: UseUniqueValidationOptions = {}
): UseUniqueValidationReturn {
  const { debounceMs = 300 } = options

  const error = ref('')
  const hasError = computed(() => !!error.value)

  function doValidate() {
    const value = valueGetter()
    if (!value || !value.trim()) {
      error.value = ''
      return
    }
    if (!checkFn()) {
      error.value = '该值已存在，请更换'
    } else {
      error.value = ''
    }
  }

  // 防抖校验
  const debouncedValidate = useDebounceFn(doValidate, debounceMs)

  // 监听值变化
  watch(valueGetter, () => {
    debouncedValidate()
  })

  function clear() {
    error.value = ''
  }

  return {
    error,
    hasError,
    validate: doValidate,
    clear
  }
}
