/**
 * LocalStorage 持久化工具
 */

export function loadFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (raw) {
      return JSON.parse(raw) as T
    }
  } catch (e) {
    console.warn(`读取LocalStorage[${key}]失败:`, e)
  }
  return defaultValue
}

export function saveToStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (e) {
    console.warn(`写入LocalStorage[${key}]失败:`, e)
  }
}

export function removeFromStorage(key: string): void {
  try {
    localStorage.removeItem(key)
  } catch (e) {
    console.warn(`删除LocalStorage[${key}]失败:`, e)
  }
}

/** 生成唯一ID */
export function generateId(prefix = 'id'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

/**
 * 深度克隆对象，确保响应式Proxy对象（含嵌套数组/对象）可安全写入IndexedDB。
 * toRaw()仅转换顶层对象，嵌套的响应式数组仍会导致DataCloneError。
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj)) as T
}
