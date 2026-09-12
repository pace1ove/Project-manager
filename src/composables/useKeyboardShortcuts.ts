import { onBeforeUnmount } from 'vue'

/**
 * 全局键盘快捷键管理 Composable
 *
 * 用法：
 *   const { register } = useKeyboardShortcuts()
 *   const unregister = register('ctrl+k', (e) => { ... }, { preventDefault: true })
 *   // 组件卸载时自动注销，也可手动调用 unregister()
 *
 * key 格式示例：'ctrl+k', 'ctrl+n', 'ctrl+s', 'ctrl+z', 'ctrl+y',
 *              'ctrl+tab', 'esc', 'delete', 'arrowup', 'arrowdown'
 *
 * 注意：输入框/文本域聚焦时，除 Esc 外的全局快捷键不会触发，避免干扰正常输入。
 */

export interface ShortcutOptions {
  /** 是否阻止默认行为，默认 true */
  preventDefault?: boolean
}

export interface KeyboardShortcutsAPI {
  /**
   * 注册快捷键，返回注销函数
   * @param key 快捷键字符串，如 'ctrl+k'、'esc'、'delete'
   * @param handler 回调函数
   * @param options 配置项
   */
  register: (
    key: string,
    handler: (e: KeyboardEvent) => void,
    options?: ShortcutOptions
  ) => () => void
}

/** 解析快捷键字符串为结构化对象 */
function parseKey(key: string): { ctrl: boolean; shift: boolean; alt: boolean; meta: boolean; key: string } {
  const parts = key.toLowerCase().split('+').map((p) => p.trim())
  const result = { ctrl: false, shift: false, alt: false, meta: false, key: '' }
  for (const part of parts) {
    if (part === 'ctrl' || part === 'control') result.ctrl = true
    else if (part === 'shift') result.shift = true
    else if (part === 'alt' || part === 'option') result.alt = true
    else if (part === 'meta' || part === 'cmd' || part === 'command') result.meta = true
    else result.key = part
  }
  return result
}

/** 规范化 KeyboardEvent 的 key */
function normalizeEventKey(e: KeyboardEvent): string {
  return e.key.toLowerCase()
}

/** 判断当前焦点是否在可输入元素中 */
function isFocusingInput(): boolean {
  const active = document.activeElement
  if (!active) return false
  const tag = active.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
  if ((active as HTMLElement).isContentEditable) return true
  return false
}

export function useKeyboardShortcuts(): KeyboardShortcutsAPI {
  const handlers = new Set<(e: KeyboardEvent) => void>()

  function register(
    key: string,
    handler: (e: KeyboardEvent) => void,
    options: ShortcutOptions = {}
  ): () => void {
    const { preventDefault = true } = options
    const parsed = parseKey(key)

    const listener = (e: KeyboardEvent) => {
      // 修饰键匹配
      if (e.ctrlKey !== parsed.ctrl) return
      if (e.shiftKey !== parsed.shift) return
      if (e.altKey !== parsed.alt) return
      if (e.metaKey !== parsed.meta) return

      // 主键匹配
      if (normalizeEventKey(e) !== parsed.key) return

      // 输入框聚焦时，除 Esc、Ctrl+Z、Ctrl+Y 外不触发全局快捷键
      // Ctrl+Z/Y 即使在输入框中也应触发全局撤销/重做（BOM编辑器等场景）
      const bypassInputCheck = parsed.key === 'escape' || parsed.key === 'esc'
        || parsed.key === 'z' || parsed.key === 'y'
      if (isFocusingInput() && !bypassInputCheck) return

      if (preventDefault) {
        e.preventDefault()
      }
      handler(e)
    }

    window.addEventListener('keydown', listener)
    handlers.add(listener)

    // 返回注销函数
    return () => {
      window.removeEventListener('keydown', listener)
      handlers.delete(listener)
    }
  }

  // 组件卸载时自动注销所有快捷键
  onBeforeUnmount(() => {
    handlers.forEach((h) => window.removeEventListener('keydown', h))
    handlers.clear()
  })

  return { register }
}
