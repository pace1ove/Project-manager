<template>
  <Transition name="batch-bar-slide">
    <div
      v-if="visible && selectedCount > 0"
      class="batch-action-bar"
    >
      <div class="batch-bar-info">
        <span class="batch-bar-count">
          已选 <strong>{{ selectedCount }}</strong> 项
          <template v-if="totalCount !== undefined"> / 共 {{ totalCount }} 项</template>
        </span>
      </div>
      <div class="batch-bar-actions">
        <el-button
          v-for="action in actions"
          :key="action.key"
          :type="action.type || 'default'"
          size="small"
          @click="emit('action', action.key)"
        >
          <el-icon
            v-if="action.icon"
            class="mr-1"
          >
            <component :is="action.icon" />
          </el-icon>
          {{ action.label }}
        </el-button>
        <el-button
          size="small"
          @click="emit('clear')"
        >
          清除选择
        </el-button>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
/** 批量操作按钮定义 */
export interface BatchAction {
  key: string
  label: string
  type?: 'primary' | 'danger' | 'warning' | 'success'
  icon?: string
}

withDefaults(
  defineProps<{
    /** 是否显示 */
    visible: boolean
    /** 已选数量 */
    selectedCount: number
    /** 操作按钮列表 */
    actions: BatchAction[]
    /** 总数量（可选） */
    totalCount?: number
  }>(),
  {
    totalCount: undefined
  }
)

const emit = defineEmits<{
  (e: 'action', key: string): void
  (e: 'clear'): void
}>()
</script>

<style scoped>
.batch-action-bar {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  z-index: var(--z-fixed, 1030);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 12px 20px;
  background: var(--bg-card, #fff);
  border-radius: var(--radius-lg, 8px);
  box-shadow: var(--shadow-lg);
  border: 1px solid var(--border-light, #e4e7ed);
  min-width: 400px;
  max-width: 90vw;
}
.batch-bar-info {
  flex-shrink: 0;
}
.batch-bar-count {
  font-size: 14px;
  color: var(--text-regular, #606266);
}
.batch-bar-count strong {
  color: var(--color-primary, #409eff);
  font-size: 16px;
  margin: 0 2px;
}
.batch-bar-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}
.mr-1 {
  margin-right: 4px;
}
/* 上滑动画 */
.batch-bar-slide-enter-active,
.batch-bar-slide-leave-active {
  transition: all 0.3s ease;
}
.batch-bar-slide-enter-from,
.batch-bar-slide-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(20px);
}
</style>
