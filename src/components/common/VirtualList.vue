<template>
  <div
    ref="containerRef"
    class="virtual-list"
    :style="{ height: typeof height === 'number' ? `${height}px` : height }"
    @scroll="onScroll"
  >
    <!-- 总高度占位，撑出滚动条 -->
    <div
      class="virtual-list-spacer"
      :style="{ height: totalHeight + 'px' }"
    >
      <!-- 可视区行：通过 translateY 偏移到正确位置 -->
      <div
        class="virtual-list-viewport"
        :style="{ transform: `translateY(${offsetY}px)` }"
      >
        <div
          v-for="(item, i) in visibleItems"
          :key="getItemKey(startIndex + i, item)"
          class="virtual-list-row"
          :style="{ height: rowHeight + 'px' }"
        >
          <slot
            :item="item"
            :index="startIndex + i"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onBeforeUnmount } from 'vue'

/**
 * 通用虚拟列表组件
 * 只渲染可视区域行，适用于长列表场景（组件/项目列表等）
 *
 * 用法：
 *   <VirtualList :items="list" :row-height="48" :height="600">
 *     <template #default="{ item, index }"> ... </template>
 *   </VirtualList>
 */
const props = withDefaults(
  defineProps<{
    /** 全量数据 */
    items: any[]
    /** 行高（px），默认 48 */
    rowHeight?: number
    /** 容器高度（px 或 CSS 值），默认 400 */
    height?: number | string
    /** 上下缓冲区额外渲染行数，默认 5 */
    buffer?: number
    /** 取 item 的 key；默认用索引 */
    keyField?: string
  }>(),
  {
    rowHeight: 48,
    height: 400,
    buffer: 5,
    keyField: 'id'
  }
)

const containerRef = ref<HTMLElement | null>(null)
const scrollTop = ref(0)

function getItemKey(index: number, item: any): string | number {
  if (props.keyField && item && typeof item === 'object' && item[props.keyField] != null) {
    return String(item[props.keyField])
  }
  return index
}

/** 总高度 */
const totalHeight = computed(() => props.items.length * props.rowHeight)

/** 可视区可容纳行数 */
const visibleCount = computed(() => {
  const h = typeof props.height === 'number' ? props.height : 400
  return Math.ceil(h / props.rowHeight) + props.buffer
})

/** 起始索引 */
const startIndex = computed(() => {
  const raw = Math.floor(scrollTop.value / props.rowHeight) - props.buffer
  return Math.max(0, raw)
})

/** 结束索引 */
const endIndex = computed(() => {
  return Math.min(props.items.length, startIndex.value + visibleCount.value + props.buffer)
})

/** 可视区数据 */
const visibleItems = computed(() => {
  return props.items.slice(startIndex.value, endIndex.value)
})

/** 视口偏移 */
const offsetY = computed(() => startIndex.value * props.rowHeight)

function onScroll(e: Event) {
  scrollTop.value = (e.target as HTMLElement).scrollTop
}

onBeforeUnmount(() => {
  // container 随组件销毁，无需额外移除 scroll 监听（@scroll 自动解绑）
})
</script>

<style scoped>
.virtual-list {
  overflow-y: auto;
  position: relative;
  width: 100%;
}
.virtual-list-spacer {
  position: relative;
  width: 100%;
}
.virtual-list-viewport {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  will-change: transform;
}
.virtual-list-row {
  box-sizing: border-box;
  overflow: hidden;
}
</style>
