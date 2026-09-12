import { ref, onMounted, onBeforeUnmount, type Ref } from 'vue'
import { ElMessageBox } from 'element-plus'

/**
 * 多标签页同步 Composable
 *
 * 监听 localStorage 的 storage 事件，检测其他标签页的数据修改。
 * 检测到冲突时提示用户选择刷新或保留本地修改。
 *
 * 用法：
 *   const { conflictDetected, checkConflict, resolveConflict } = useTabSync({
 *     storageKey: 'module-bom-sync',
 *     entityId: moduleId,
 *     onRefresh: () => reloadData()
 *   })
 */

export interface UseTabSyncOptions {
  /** localStorage 存储 key 前缀 */
  storageKey: string
  /** 当前编辑的实体 ID（用于区分不同编辑器） */
  entityId: string
  /** 检测到冲突后刷新数据的回调 */
  onRefresh: () => void | Promise<void>
}

export interface UseTabSyncReturn {
  /** 是否检测到冲突 */
  conflictDetected: Ref<boolean>
  /** 手动触发冲突检测 */
  checkConflict: () => void
  /** 标记当前标签页已更新数据（写入 localStorage 通知其他标签页） */
  notifyUpdate: () => void
  /** 解决冲突后的回调（内部使用） */
  resolveConflict: () => void
}

const SYNC_PREFIX = 'bom-tab-sync:'

export function useTabSync(options: UseTabSyncOptions): UseTabSyncReturn {
  const { storageKey, entityId, onRefresh } = options
  const conflictDetected = ref(false)
  const fullKey = `${SYNC_PREFIX}${storageKey}:${entityId}`
  // 记录本标签页最近写入的时间戳，用于区分"自己写入"与"其他标签页写入"
  let initialLastSeen = ''
  try {
    initialLastSeen = localStorage.getItem(fullKey) || ''
  } catch {
    initialLastSeen = ''
  }
  const lastSeen = ref<string>(initialLastSeen)

  /** 处理 storage 事件 */
  function handleStorageEvent(e: StorageEvent) {
    if (e.key !== fullKey || !e.newValue) return
    // 与本标签页最近写入的值比较：相同则是自己 notifyUpdate 触发的（storage 事件不会在自己标签页触发，
    // 但通过本地记录可正确区分其他标签页的更新）
    if (e.newValue === lastSeen.value) return

    // 其他标签页更新了数据，提示用户
    conflictDetected.value = true

    ElMessageBox.confirm(
      '数据已在其他标签页被修改，是否刷新以获取最新数据？',
      '多标签页冲突',
      {
        confirmButtonText: '刷新',
        cancelButtonText: '保留本地修改',
        type: 'warning'
      }
    ).then(async () => {
      // 用户选择刷新
      await onRefresh()
      conflictDetected.value = false
    }).catch(() => {
      // 用户选择保留本地修改
      conflictDetected.value = false
    })
  }

  /** 标记当前标签页已更新 */
  function notifyUpdate() {
    try {
      const ts = Date.now().toString()
      localStorage.setItem(fullKey, ts)
      lastSeen.value = ts
    } catch {
      // 忽略 localStorage 写入失败
    }
  }

  /** 手动检查冲突（比较 localStorage 时间戳与本地记录） */
  function checkConflict() {
    // 此方法可在需要时手动调用
    // storage 事件会自动触发，这里仅作为接口预留
  }

  function resolveConflict() {
    conflictDetected.value = false
  }

  onMounted(() => {
    window.addEventListener('storage', handleStorageEvent)
  })

  onBeforeUnmount(() => {
    window.removeEventListener('storage', handleStorageEvent)
  })

  return {
    conflictDetected,
    checkConflict,
    notifyUpdate,
    resolveConflict
  }
}
