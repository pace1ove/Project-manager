import { ref, computed, type Ref } from 'vue'

/**
 * 撤销/重做 Composable
 *
 * 用法：
 *   const { canUndo, canRedo, undo, redo, commit, clearHistory, historyLength } = useUndoRedo(state)
 *
 * 与 Ctrl+Z / Ctrl+Y 快捷键配合：
 *   const { register } = useKeyboardShortcuts()
 *   register('ctrl+z', () => undo())
 *   register('ctrl+y', () => redo())
 */

export interface UseUndoRedoOptions {
  /** 最大历史记录数，默认 50 */
  maxHistory?: number
  /** 是否深度克隆（JSON 序列化），默认 true */
  deep?: boolean
}

export interface UseUndoRedoReturn<T> {
  /** 是否可以撤销 */
  canUndo: Ref<boolean>
  /** 是否可以重做 */
  canRedo: Ref<boolean>
  /** 撤销 */
  undo: () => void
  /** 重做 */
  redo: () => void
  /** 将当前 state 快照推入历史栈（在每次修改后调用） */
  commit: () => void
  /** 清空历史 */
  clearHistory: () => void
  /** 当前历史栈长度 */
  historyLength: number
}

/** 深度克隆快照 */
function snapshot<T>(value: T, deep: boolean): T {
  if (deep) {
    return JSON.parse(JSON.stringify(value)) as T
  }
  return value
}

export function useUndoRedo<T>(
  state: Ref<T>,
  options: UseUndoRedoOptions = {}
): UseUndoRedoReturn<T> {
  const { maxHistory = 50, deep = true } = options

  // 历史栈：存储快照
  const history = ref<T[]>([])
  // 当前索引，-1 表示没有历史
  const currentIndex = ref(-1)

  const canUndo = computed(() => currentIndex.value > 0)
  const canRedo = computed(() => currentIndex.value < history.value.length - 1)

  function commit() {
    // 如果当前不在历史末尾（执行过 undo），丢弃 redo 部分
    if (currentIndex.value < history.value.length - 1) {
      history.value = history.value.slice(0, currentIndex.value + 1)
    }

    // 推入新快照
    ;(history.value as any[]).push(snapshot(state.value as T, deep))

    // 超过最大历史数，移除最旧的
    if (history.value.length > maxHistory) {
      history.value.shift()
    }

    currentIndex.value = history.value.length - 1
  }

  function undo() {
    if (!canUndo.value) return
    currentIndex.value--
    ;(state as any).value = snapshot(history.value[currentIndex.value], deep)
  }

  function redo() {
    if (!canRedo.value) return
    currentIndex.value++
    ;(state as any).value = snapshot(history.value[currentIndex.value], deep)
  }

  function clearHistory() {
    history.value = []
    currentIndex.value = -1
  }

  return {
    canUndo,
    canRedo,
    undo,
    redo,
    commit,
    clearHistory,
    get historyLength() {
      return history.value.length
    }
  }
}
