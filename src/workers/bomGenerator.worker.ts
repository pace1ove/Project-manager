/// <reference lib="webworker" />
/**
 * 下单 BOM 生成 Worker
 * 将纯计算函数 generateOrderBom 放到 Worker 线程执行，避免阻塞主线程 UI
 *
 * 协议：
 *   主线程 → Worker: { selectedModules, modules, bomItemsMap }
 *     - bomItemsMap 为普通对象 { [moduleId]: BomItem[] }（主线程已把 Map 序列化）
 *   Worker → 主线程: { type: 'progress', value: number }
 *   Worker → 主线程: { type: 'result', result: OrderBomResult }
 *   Worker → 主线程: { type: 'error', message: string }
 */
import { generateOrderBom } from '@/utils/bomGenerator'
import type { Module, OrderBomResult, SelectedModule, BomItem } from '@/types'

export interface BomGeneratorRequest {
  selectedModules: SelectedModule[]
  modules: Module[]
  bomItemsMap: Record<string, BomItem[]>
  projectJobNo?: string
}

self.onmessage = (e: MessageEvent<BomGeneratorRequest>) => {
  const { selectedModules, modules, bomItemsMap, projectJobNo } = e.data || ({} as BomGeneratorRequest)
  try {
    ;(self as unknown as Worker).postMessage({ type: 'progress', value: 10 })
    // 纯计算，不依赖 DOM / Pinia / IndexedDB；把普通对象转回 Map
    const bomItemsMapObj = new Map<string, BomItem[]>(Object.entries(bomItemsMap || {}))
    const result: OrderBomResult = generateOrderBom(selectedModules, modules, bomItemsMapObj, projectJobNo)
    ;(self as unknown as Worker).postMessage({ type: 'progress', value: 100 })
    ;(self as unknown as Worker).postMessage({ type: 'result', result })
  } catch (err) {
    ;(self as unknown as Worker).postMessage({
      type: 'error',
      message: err instanceof Error ? err.message : String(err)
    })
  }
}
