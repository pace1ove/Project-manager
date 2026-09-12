<template>
  <div
    v-if="hasError"
    class="global-error-boundary"
  >
    <div class="error-content">
      <el-result
        icon="error"
        title="页面出现错误"
        :sub-title="errorMessage"
      >
        <template #extra>
          <el-button
            type="primary"
            @click="handleRefresh"
          >
            刷新页面
          </el-button>
          <el-button @click="handleReset">
            尝试恢复
          </el-button>
        </template>
      </el-result>
      <el-collapse
        v-if="showDetails"
        class="error-details"
      >
        <el-collapse-item title="错误详情（开发调试用）">
          <pre class="error-stack">{{ errorStack }}</pre>
        </el-collapse-item>
      </el-collapse>
      <el-button
        v-else
        link
        type="primary"
        @click="showDetails = true"
      >
        查看错误详情
      </el-button>
    </div>
  </div>
  <slot v-else />
</template>

<script setup lang="ts">
import { ref, onErrorCaptured, watch } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const hasError = ref(false)
const errorMessage = ref('')
const errorStack = ref('')
const showDetails = ref(false)

// 路由变化时自动重置错误状态，避免错误泄漏到其他页面
watch(() => route.fullPath, () => {
  if (hasError.value) {
    hasError.value = false
    errorMessage.value = ''
    errorStack.value = ''
    showDetails.value = false
  }
})

/**
 * 捕获子组件渲染错误
 * onErrorCaptured 会捕获所有后代组件的错误
 */
onErrorCaptured((err, instance, info) => {
  const error = err instanceof Error ? err : new Error(String(err))

  hasError.value = true
  errorMessage.value = error.message || '发生未知错误'
  errorStack.value = error.stack || ''

  // 记录到调试日志
  const timestamp = new Date().toISOString()
  const logEntry = `[${timestamp}] [RUNTIME_ERROR] ${error.message}\n  组件: ${instance?.$options?.name || 'unknown'}\n  信息: ${info}\n  堆栈: ${error.stack}`
  console.error(logEntry)

  // 防止错误继续向上传播
  return false
})

function handleRefresh() {
  window.location.reload()
}

function handleReset() {
  hasError.value = false
  errorMessage.value = ''
  errorStack.value = ''
  showDetails.value = false
}
</script>

<style scoped>
.global-error-boundary {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 24px;
  background: #f5f7fa;
}

.error-content {
  max-width: 600px;
  width: 100%;
  text-align: center;
}

.error-details {
  margin-top: 16px;
  text-align: left;
}

.error-stack {
  max-height: 300px;
  overflow-y: auto;
  font-size: 12px;
  color: #909399;
  white-space: pre-wrap;
  word-break: break-all;
}
</style>
