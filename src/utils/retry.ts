/**
 * 通用重试工具函数
 *
 * 用于删除、保存等异步操作失败时自动重试。
 *
 * 用法：
 *   await withRetry(() => db.modules.put(data), 3)
 *   await withRetry(async () => { await saveData() }, 5)
 */

export interface WithRetryOptions {
  /** 最大重试次数，默认 3 */
  retries?: number
  /** 重试间隔（毫秒），默认 1000，指数退避：间隔 * 2^attempt */
  delay?: number
  /** 是否使用指数退避，默认 true */
  backoff?: boolean
  /** 重试前回调 */
  onRetry?: (attempt: number, error: any) => void
}

/**
 * 带重试的异步执行
 *
 * @param fn 要执行的异步函数
 * @param retries 重试次数（也可以传 options 对象）
 * @returns 函数执行结果
 * @throws 最终失败时抛出最后一次错误
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  retries: number | WithRetryOptions = 3
): Promise<T> {
  const options: WithRetryOptions = typeof retries === 'number'
    ? { retries }
    : retries

  const maxRetries = options.retries ?? 3
  const baseDelay = options.delay ?? 1000
  const useBackoff = options.backoff ?? true

  let lastError: any

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error

      // 最后一次尝试不再等待
      if (attempt >= maxRetries) break

      // 计算延迟时间
      const waitTime = useBackoff
        ? baseDelay * Math.pow(2, attempt)
        : baseDelay

      // 通知回调
      if (options.onRetry) {
        options.onRetry(attempt + 1, error)
      }

      // 等待后重试
      await new Promise((resolve) => setTimeout(resolve, waitTime))
    }
  }

  throw lastError
}
