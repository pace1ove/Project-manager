import { ref, onBeforeUnmount } from 'vue'
import type { Module, OrderBomResult, SelectedModule, BomItem } from '@/types'
import { useCleanup } from '@/composables/useCleanup'
import { generateOrderBom } from '@/utils/bomGenerator'

/**
 * 下单 BOM 生成 Worker 封装
 * 在独立线程执行 generateOrderBom，主线程不阻塞，并暴露进度
 * 如果 Worker 加载失败或报错，自动回退到同步直接调用 generateOrderBom
 */
export function useBomGeneratorWorker() {
  const cleanup = useCleanup()
  const progress = ref(0)
  const running = ref(false)

  let worker: Worker | null = null
  let workerFailed = false

  function ensureWorker(): Worker | null {
    if (workerFailed) return null
    try {
      if (!worker) {
        worker = new Worker(
          new URL('../workers/bomGenerator.worker.ts', import.meta.url),
          { type: 'module' }
        )
        cleanup.addWorker(worker)
      }
      return worker
    } catch (err) {
      console.warn('[BOM Worker] Worker 创建失败，回退到同步模式:', err)
      workerFailed = true
      return null
    }
  }

  /**
   * 在 Worker 中生成下单 BOM（带同步 fallback）
   * @param selectedModules 已选模块
   * @param modules 模块全量（用于解析父子关系，不要求携带 bom）
   * @param bomItemsMap moduleId -> 该模块的 BOM 条目（来自 bomItems 表）
   * @param projectJobNo 项目的JOB号，自动填写到每个BOM条目的jobNo字段
   */
  function generate(
    selectedModules: SelectedModule[],
    modules: Module[],
    bomItemsMap: Map<string, BomItem[]>,
    projectJobNo?: string
  ): Promise<OrderBomResult> {
    const w = ensureWorker()

    // Worker 不可用，直接同步调用
    if (!w) {
      running.value = true
      progress.value = 0
      try {
        const result = generateOrderBom(selectedModules, modules, bomItemsMap, projectJobNo)
        progress.value = 100
        return Promise.resolve(result)
      } catch (err) {
        return Promise.reject(err instanceof Error ? err : new Error(String(err)))
      } finally {
        running.value = false
      }
    }

    return new Promise((resolve, reject) => {
      running.value = true
      progress.value = 0

      let settled = false

      const fallbackToSync = (reason: string) => {
        if (settled) return
        settled = true
        console.warn(`[BOM Worker] ${reason}，回退到同步模式`)
        try {
          const result = generateOrderBom(selectedModules, modules, bomItemsMap, projectJobNo)
          progress.value = 100
          running.value = false
          resolve(result)
        } catch (err) {
          running.value = false
          reject(err instanceof Error ? err : new Error(String(err)))
        }
      }

      const onMessage = (e: MessageEvent) => {
        const data = e.data
        if (!data) return
        if (data.type === 'progress') {
          progress.value = data.value
        } else if (data.type === 'result') {
          if (settled) return
          settled = true
          w.removeEventListener('message', onMessage)
          w.removeEventListener('error', onError)
          running.value = false
          resolve(data.result as OrderBomResult)
        } else if (data.type === 'error') {
          fallbackToSync(`Worker 内部错误: ${data.message || '未知'}`)
        }
      }

      const onError = (e: ErrorEvent) => {
        fallbackToSync(`Worker 加载/执行错误: ${e.message || '未知'}`)
      }

      w.addEventListener('message', onMessage)
      w.addEventListener('error', onError)

      try {
        // 清理数据，确保可序列化（移除响应式代理、内部字段、不可序列化值）
        const cleanModules = modules.map((m) => JSON.parse(JSON.stringify(m)))
        const cleanSelectedModules = selectedModules.map((m) => JSON.parse(JSON.stringify(m)))
        // postMessage 不发送 Map，序列化为普通对象（worker 端再转回 Map）
        const cleanBomItemsMap: Record<string, BomItem[]> = {}
        for (const [mid, items] of bomItemsMap) {
          cleanBomItemsMap[mid] = items.map((i) => JSON.parse(JSON.stringify(i)))
        }
        w.postMessage({
          selectedModules: cleanSelectedModules,
          modules: cleanModules,
          bomItemsMap: cleanBomItemsMap,
          projectJobNo
        })
      } catch (err) {
        fallbackToSync(`postMessage 失败: ${err instanceof Error ? err.message : String(err)}`)
      }
    })
  }

  onBeforeUnmount(() => {
    // useCleanup 已注册 worker.terminate()
  })

  return { generate, progress, running }
}
