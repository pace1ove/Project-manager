<template>
  <div
    class="empty-state-wrapper"
    :class="`variant-${variant}`"
  >
    <div class="empty-icon">
      <el-icon
        :size="64"
        :color="iconColor"
      >
        <component :is="iconComponent" />
      </el-icon>
    </div>
    <div class="empty-title">
      {{ title }}
    </div>
    <div
      v-if="description"
      class="empty-description"
    >
      {{ description }}
    </div>
    <el-button
      v-if="actionText"
      type="primary"
      class="empty-action"
      @click="emit('action')"
    >
      {{ actionText }}
    </el-button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  Box,
  Search,
  WarningFilled,
  Loading
} from '@element-plus/icons-vue'

/** 空状态变体 */
type EmptyVariant = 'empty' | 'no-results' | 'error' | 'loading'

const props = withDefaults(
  defineProps<{
    /** 标题 */
    title: string
    /** 描述文字 */
    description?: string
    /** Element Plus 图标组件名 */
    icon?: string
    /** 操作按钮文字 */
    actionText?: string
    /** 变体类型 */
    variant?: EmptyVariant
  }>(),
  {
    description: '',
    icon: '',
    actionText: '',
    variant: 'empty'
  }
)

const emit = defineEmits<{
  (e: 'action'): void
}>()

/** 各变体对应的默认图标和颜色 */
const variantConfig: Record<EmptyVariant, { icon: any; color: string }> = {
  empty: { icon: Box, color: '#c0c4cc' },
  'no-results': { icon: Search, color: '#909399' },
  error: { icon: WarningFilled, color: '#f56c6c' },
  loading: { icon: Loading, color: '#409eff' }
}

const iconComponent = computed(() => {
  if (props.icon) {
    // 动态解析图标组件
    const iconMap: Record<string, any> = { Box, Search, WarningFilled, Loading }
    return iconMap[props.icon] || variantConfig[props.variant].icon
  }
  return variantConfig[props.variant].icon
})

const iconColor = computed(() => variantConfig[props.variant].color)
</script>

<style scoped>
.empty-state-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  text-align: center;
}
.empty-icon {
  margin-bottom: 16px;
  opacity: 0.8;
}
.empty-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary, #303133);
  margin-bottom: 8px;
}
.empty-description {
  font-size: 13px;
  color: var(--text-secondary, #909399);
  max-width: 360px;
  line-height: 1.6;
  margin-bottom: 16px;
}
.empty-action {
  margin-top: 8px;
}
.variant-loading .empty-icon {
  animation: spin 1.2s linear infinite;
}
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
