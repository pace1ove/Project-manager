import { ref, watch, type Ref, type WritableComputedRef } from 'vue'

/**
 * 自动保存 Composable
 *
 * 监听数据变化（深度 watch），debounce 后自动调用 saveFn。
 * 支持失败自动重试（最多3次，间隔3秒），重试耗尽后提示用户手动保存。
 *
 * 用法：
 *   const { lastSaved, isSaving, dirty, triggerSave, markClean,
 *           retryCount, lastError, saveFailed, retryNow } = useAutoSave({
 *     data: formData,
 *     saveFn: async () => { await api.save(formData.value) },
 *     interval: 30000,
 *     enabled: ref(true)
 *   })
 */

export interface UseAutoSaveOptions {
  /** 要监听的数据（ref / computed） */
  data: Ref<any> | WritableComputedRef<any>
  /** 保存函数 */
  saveFn: () => Promise<void>
  /** debounce 间隔（毫秒），默认 30000 */
  interval?: number
  /** 是否启用自动保存，默认 true */
  enabled?: Ref<boolean>
  /** 最大重试次数，默认 3 */
  maxRetries?: number
  /** 重试间隔（毫秒），默认 3000 */
  retryDelay?: number
}

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'dirty' | 'error'

export interface UseAutoSaveReturn {
  /** 上次保存时间（ISO 字符串），未保存过为 null */
  lastSaved: Ref<string | null>
  /** 是否正在保存 */
  isSaving: Ref<boolean>
  /** 是否有未保存的更改 */
  dirty: Ref<boolean>
  /** 当前重试次数 */
  retryCount: Ref<number>
  /** 最后一次错误信息 */
  lastError: Ref<string | null>
  /** 保存是否失败（重试耗尽） */
  saveFailed: Ref<boolean>
  /** 当前保存状态 */
  saveStatus: Ref<SaveStatus>
  /** 手动触发保存 */
  triggerSave: () => Promise<void>
  /** 标记为已保存（清除 dirty） */
  markClean: () => void
  /** 手动重试保存（重试次数重置） */
  retryNow: () => Promise<void>
}

export function useAutoSave(options: UseAutoSaveOptions): UseAutoSaveReturn {
  const {
    data,
    saveFn,
    interval = 30000,
    enabled,
    maxRetries = 3,
    retryDelay = 3000
  } = options

  const lastSaved = ref<string | null>(null)
  const isSaving = ref(false)
  const dirty = ref(false)
  const retryCount = ref(0)
  const lastError = ref<string | null>(null)
  const saveFailed = ref(false)
  const saveStatus = ref<SaveStatus>('idle')

  let debounceTimer: ReturnType<typeof setTimeout> | null = null
  let retryTimer: ReturnType<typeof setTimeout> | null = null
  let saveInProgress = false
  let pendingSave = false

  function clearTimer() {
    if (debounceTimer) {
      clearTimeout(debounceTimer)
      debounceTimer = null
    }
  }

  function clearRetryTimer() {
    if (retryTimer) {
      clearTimeout(retryTimer)
      retryTimer = null
    }
  }

  async function doSave(): Promise<boolean> {
    isSaving.value = true
    saveStatus.value = 'saving'
    lastError.value = null

    try {
      await saveFn()
      lastSaved.value = new Date().toISOString()
      dirty.value = false
      retryCount.value = 0
      saveFailed.value = false
      saveStatus.value = 'saved'
      return true
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err || '保存失败')
      lastError.value = msg
      console.error('[useAutoSave] 保存失败:', err)

      // 重试逻辑
      if (retryCount.value < maxRetries) {
        retryCount.value++
        saveStatus.value = 'error'
        // 安排重试（通过 triggerSave 走并发保护）
        clearRetryTimer()
        retryTimer = setTimeout(() => {
          console.warn(`[useAutoSave] 第 ${retryCount.value} 次重试...`)
          triggerSave().catch(() => {})
        }, retryDelay)
      } else {
        // 重试耗尽
        saveFailed.value = true
        saveStatus.value = 'error'
      }
      return false
    } finally {
      isSaving.value = false
    }
  }

  async function triggerSave() {
    clearTimer()
    clearRetryTimer()

    // 如果已有保存进行中，标记待保存
    if (saveInProgress) {
      pendingSave = true
      return
    }

    saveInProgress = true

    try {
      await doSave()

      // 如果有待保存的更改，再执行一次
      if (pendingSave) {
        pendingSave = false
        await doSave()
      }
    } finally {
      saveInProgress = false
    }
  }

  async function retryNow() {
    retryCount.value = 0
    saveFailed.value = false
    clearRetryTimer()
    await triggerSave()
  }

  function markClean() {
    dirty.value = false
    clearTimer()
    clearRetryTimer()
    retryCount.value = 0
    saveFailed.value = false
    saveStatus.value = 'saved'
  }

  // 深度监听数据变化
  watch(
    data,
    () => {
      if (enabled && !enabled.value) return

      dirty.value = true
      if (!saveFailed.value) {
        saveStatus.value = 'dirty'
      }
      clearTimer()
      debounceTimer = setTimeout(() => {
        triggerSave()
      }, interval)
    },
    { deep: true }
  )

  return {
    lastSaved,
    isSaving,
    dirty,
    retryCount,
    lastError,
    saveFailed,
    saveStatus,
    triggerSave,
    markClean,
    retryNow
  }
}
