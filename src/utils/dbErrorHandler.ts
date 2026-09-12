import { ElMessage, ElMessageBox } from 'element-plus'

/**
 * IndexedDB 错误统一处理器
 *
 * 根据错误类型返回用户友好消息，并提供对应的修复操作。
 */

export interface DbErrorInfo {
  /** 用户友好的错误标题 */
  title: string
  /** 详细描述 */
  message: string
  /** 建议操作 */
  suggestion: string
  /** 错误类型分类 */
  category: 'quota' | 'data' | 'version' | 'unknown'
}

/**
 * 识别并分类 IndexedDB 错误
 */
function classifyError(error: any): DbErrorInfo {
  const name = error?.name || ''
  const msg = error?.message || String(error || '')

  // 配额超限：存储空间不足
  if (name === 'QuotaExceededError' || /quota|存储空间|空间不足|exceeded/i.test(msg)) {
    return {
      title: '存储空间不足',
      message: '浏览器本地存储空间已满，无法保存更多数据。',
      suggestion: '建议清理旧数据或导出数据备份后清理。',
      category: 'quota'
    }
  }

  // 数据损坏：数据格式错误
  if (name === 'DataError' || /data.?corrupt|数据损坏|data error/i.test(msg)) {
    return {
      title: '数据读取错误',
      message: '部分数据可能已损坏，无法正常读取。',
      suggestion: '建议从最近的备份恢复数据。',
      category: 'data'
    }
  }

  // 版本冲突：数据库版本不匹配
  if (name === 'VersionError' || /version.?change|version.?error|版本/i.test(msg)) {
    return {
      title: '数据库版本冲突',
      message: '数据库结构已更新，需要刷新页面加载新版本。',
      suggestion: '请刷新页面（Ctrl+R）或清除浏览器缓存后重试。',
      category: 'version'
    }
  }

  // 约束错误：唯一约束、外键等
  if (name === 'ConstraintError' || /constraint|unique|唯一约束/i.test(msg)) {
    return {
      title: '数据约束冲突',
      message: '数据违反了唯一性约束或关联约束。',
      suggestion: '请检查是否有重复的图号、名称或关联数据。',
      category: 'data'
    }
  }

  // 事务错误
  if (name === 'TransactionInactiveError' || /transaction/i.test(msg)) {
    return {
      title: '数据库事务失败',
      message: '数据库操作事务异常终止。',
      suggestion: '请重试操作。',
      category: 'unknown'
    }
  }

  // 通用未知错误
  return {
    title: '数据库操作失败',
    message: msg || '未知数据库错误',
    suggestion: '请重试，如持续出现请刷新页面。',
    category: 'unknown'
  }
}

/**
 * 记录错误到 DEBUG_LOG.md（通过控制台输出，实际写入由构建流程处理）
 */
function logToDebug(error: any, context: string, info: DbErrorInfo) {
  const timestamp = new Date().toISOString()
  const logEntry = `[${timestamp}] [DB_ERROR] [${context}] [${info.category}] ${info.title}: ${error?.message || error}`
  console.error(logEntry)
  // 在开发环境下追加到 DEBUG_LOG
  if (import.meta.env?.DEV) {
    // 异步追加，不阻塞主流程
    appendDebugLog(logEntry).catch(() => {})
  }
}

/** 异步追加调试日志到本地文件（通过 fetch 到开发服务器） */
async function appendDebugLog(entry: string): Promise<void> {
  try {
    // 仅在 Vite 开发服务器可用时尝试
    await fetch('/__debug_log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entry })
    }).catch(() => {})
  } catch {
    // 忽略网络错误
  }
}

/**
 * 统一处理 IndexedDB 错误
 *
 * @param error 原始错误对象
 * @param context 错误发生的上下文描述（如"保存BOM条目"）
 * @returns 用户友好的错误信息
 *
 * 用法：
 *   try { await db.xxx.put(data) } catch (e) { handleDbError(e, '保存模块') }
 */
export function handleDbError(error: any, context: string): DbErrorInfo {
  const info = classifyError(error)
  logToDebug(error, context, info)

  // 根据错误类型显示不同的提示
  switch (info.category) {
    case 'quota':
      ElMessageBox.alert(
        `${info.message}\n\n${info.suggestion}`,
        info.title,
        {
          confirmButtonText: '知道了',
          type: 'warning'
        }
      ).catch(() => {})
      break

    case 'data':
      ElMessageBox.confirm(
        `${info.message}\n\n${info.suggestion}`,
        info.title,
        {
          confirmButtonText: '恢复备份',
          cancelButtonText: '知道了',
          type: 'error'
        }
      ).then(() => {
        // 触发刷新以重新加载
        window.location.reload()
      }).catch(() => {})
      break

    case 'version':
      ElMessageBox.confirm(
        `${info.message}\n\n${info.suggestion}`,
        info.title,
        {
          confirmButtonText: '立即刷新',
          cancelButtonText: '稍后',
          type: 'warning'
        }
      ).then(() => {
        window.location.reload()
      }).catch(() => {})
      break

    default:
      ElMessage.error(`${context}失败：${info.message}`)
      break
  }

  return info
}

/**
 * 轻量级错误提示（不弹窗，只显示消息）
 * 用于自动保存等不需要用户交互的场景
 */
export function notifyDbError(error: any, context: string): string {
  const info = classifyError(error)
  logToDebug(error, context, info)
  return `${context}失败：${info.message}`
}
