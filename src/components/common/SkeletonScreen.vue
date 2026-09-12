<template>
  <div
    v-if="loading"
    class="skeleton-screen"
  >
    <!-- 卡片骨架 -->
    <template v-if="cardCount && cardCount > 0">
      <div
        v-for="i in cardCount"
        :key="`card-${i}`"
        class="skeleton-card"
      >
        <div
          v-if="showAvatar"
          class="skeleton-avatar"
        />
        <div class="skeleton-card-lines">
          <div
            class="skeleton-line"
            style="width: 60%; height: 16px;"
          />
          <div
            class="skeleton-line"
            style="width: 90%; height: 12px; margin-top: 10px;"
          />
          <div
            class="skeleton-line"
            style="width: 75%; height: 12px; margin-top: 8px;"
          />
        </div>
      </div>
    </template>

    <!-- 表格行骨架 -->
    <template v-else>
      <div
        v-for="i in rows"
        :key="`row-${i}`"
        class="skeleton-row"
      >
        <div
          v-if="showAvatar"
          class="skeleton-avatar-sm"
        />
        <div
          class="skeleton-line"
          style="width: 15%;"
        />
        <div
          class="skeleton-line"
          style="width: 25%;"
        />
        <div
          class="skeleton-line"
          style="width: 30%;"
        />
        <div
          class="skeleton-line"
          style="width: 10%;"
        />
        <div
          class="skeleton-line"
          style="width: 12%;"
        />
      </div>
    </template>
  </div>
  <slot v-else />
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    /** 是否显示骨架 */
    loading: boolean
    /** 骨架行数（表格模式），默认 5 */
    rows?: number
    /** 是否显示头像骨架 */
    showAvatar?: boolean
    /** 卡片数量（大于0时渲染卡片骨架而非表格行） */
    cardCount?: number
  }>(),
  {
    rows: 5,
    showAvatar: false,
    cardCount: 0
  }
)
</script>

<style scoped>
.skeleton-screen {
  width: 100%;
}
.skeleton-row {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 0;
  border-bottom: 1px solid var(--border-extra-light, #f2f6fc);
}
.skeleton-card {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 16px;
  background: var(--bg-card, #fff);
  border-radius: var(--radius-base, 4px);
  margin-bottom: 12px;
  box-shadow: var(--shadow-base);
}
.skeleton-card-lines {
  flex: 1;
}
.skeleton-line {
  height: 14px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  border-radius: 4px;
  animation: skeleton-shimmer 1.5s infinite;
}
.skeleton-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: skeleton-shimmer 1.5s infinite;
  flex-shrink: 0;
}
.skeleton-avatar-sm {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: skeleton-shimmer 1.5s infinite;
  flex-shrink: 0;
}
@keyframes skeleton-shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
</style>
