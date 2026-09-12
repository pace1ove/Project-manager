import { onBeforeUnmount } from 'vue'

/**
 * 组件卸载清理注册机制
 *
 * 统一注册需要在 onBeforeUnmount 时执行的清理函数，避免遗漏：
 * - addEventListener → removeEventListener
 * - setInterval/setTimeout → clearInterval/clearTimeout
 * - Web Worker → terminate()
 * - Pinia $subscribe / watch → 调用其返回的取消函数
 *
 * 用法：
 *   const cleanup = useCleanup()
 *   cleanup.add(() => window.removeEventListener('resize', onResize))
 *   const timer = setInterval(...)
 *   cleanup.addTimeout(timer)
 *   const worker = new Worker(...)
 *   cleanup.addWorker(worker)
 */
export interface CleanupHandle {
  /** 注册一个任意清理函数，卸载时执行 */
  add(fn: () => void): void
  /** 注册事件监听清理 */
  addEventListener(el: EventTarget, type: string, listener: (...args: any[]) => void, options?: any): void
  /** 注册定时器清理（兼容 setTimeout / setInterval） */
  addTimer(timer: ReturnType<typeof setTimeout> | ReturnType<typeof setInterval>): void
  /** 注册 Worker 清理 */
  addWorker(worker: Worker): void
  /** 注册 watch / $subscribe 等返回取消函数的清理 */
  addDisposer(disposer: () => void): void
}

export function useCleanup(): CleanupHandle {
  const fns: Array<() => void> = []

  onBeforeUnmount(() => {
    for (const fn of fns) {
      try {
        fn()
      } catch (e) {
        console.warn('[useCleanup] 清理函数执行失败:', e)
      }
    }
    fns.length = 0
  })

  return {
    add(fn: () => void) {
      fns.push(fn)
    },
    addEventListener(el: EventTarget, type: string, listener: (...args: any[]) => void, options?: any) {
      fns.push(() => el.removeEventListener(type, listener, options))
    },
    addTimer(timer) {
      fns.push(() => {
        clearTimeout(timer as any)
        clearInterval(timer as any)
      })
    },
    addWorker(worker: Worker) {
      fns.push(() => {
        try {
          worker.terminate()
        } catch { /* ignore */ }
      })
    },
    addDisposer(disposer: () => void) {
      fns.push(disposer)
    }
  }
}
