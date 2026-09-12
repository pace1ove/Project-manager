<template>
  <el-popover
    v-model:visible="popoverVisible"
    placement="bottom-end"
    :width="280"
    trigger="click"
  >
    <template #reference>
      <el-button
        :icon="Setting"
        size="small"
        title="列设置"
      />
    </template>

    <div class="column-settings">
      <div class="column-settings-header">
        <span class="column-settings-title">列设置</span>
        <el-button
          text
          type="primary"
          size="small"
          @click="resetDefault"
        >
          重置默认
        </el-button>
      </div>

      <div class="column-settings-list">
        <div
          v-for="(col, index) in localColumns"
          :key="col.key"
          class="column-settings-item"
          :class="{ 'is-dragging': dragIndex === index }"
          draggable="true"
          @dragstart="handleDragStart(index)"
          @dragover.prevent="handleDragOver(index)"
          @drop="handleDrop(index)"
          @dragend="handleDragEnd"
        >
          <el-icon class="drag-handle">
            <Rank />
          </el-icon>
          <el-checkbox
            :model-value="col.visible"
            @change="(val: boolean) => toggleColumn(col.key, val)"
          >
            {{ col.label }}
          </el-checkbox>
        </div>
      </div>

      <div class="column-settings-footer">
        <span class="column-settings-tip">拖拽调整顺序，勾选控制显示</span>
      </div>
    </div>
  </el-popover>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { Setting, Rank } from '@element-plus/icons-vue'

/** 列配置项 */
export interface ColumnConfig {
  key: string
  label: string
  visible: boolean
  width?: number
}

const props = withDefaults(
  defineProps<{
    /** 列配置 v-model */
    modelValue: ColumnConfig[]
    /** localStorage 持久化 key */
    storageKey?: string
  }>(),
  {
    storageKey: ''
  }
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: ColumnConfig[]): void
}>()

const popoverVisible = ref(false)
const localColumns = ref<ColumnConfig[]>([])
const dragIndex = ref<number | null>(null)

const STORAGE_PREFIX = 'bom_column_settings_'

/** 从 localStorage 加载 */
function loadFromStorage(): ColumnConfig[] | null {
  if (!props.storageKey) return null
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + props.storageKey)
    if (raw) {
      return JSON.parse(raw) as ColumnConfig[]
    }
  } catch {
    // ignore
  }
  return null
}

/** 保存到 localStorage */
function saveToStorage() {
  if (!props.storageKey) return
  try {
    localStorage.setItem(
      STORAGE_PREFIX + props.storageKey,
      JSON.stringify(localColumns.value)
    )
  } catch {
    // ignore
  }
}

/** 同步到父组件 */
function syncToParent() {
  emit('update:modelValue', JSON.parse(JSON.stringify(localColumns.value)))
  saveToStorage()
}

/** 初始化：优先从 localStorage 恢复，否则使用 props 默认值 */
function initialize() {
  const saved = loadFromStorage()
  if (saved && saved.length > 0) {
    // 用保存的配置覆盖，但只保留 props 中存在的 key
    const validKeys = new Set(props.modelValue.map((c) => c.key))
    const merged = saved.filter((c) => validKeys.has(c.key))
    // 补充 props 中新增的列
    for (const col of props.modelValue) {
      if (!merged.find((c) => c.key === col.key)) {
        merged.push({ ...col })
      }
    }
    localColumns.value = merged
  } else {
    localColumns.value = JSON.parse(JSON.stringify(props.modelValue))
  }
}

onMounted(() => {
  initialize()
})

// 监听外部 modelValue 变化（如父组件重置）
watch(
  () => props.modelValue,
  (newVal) => {
    // 仅当与本地差异较大时同步（避免循环）
    const localKeys = localColumns.value.map((c) => c.key).join(',')
    const newKeys = newVal.map((c) => c.key).join(',')
    if (localKeys !== newKeys) {
      localColumns.value = JSON.parse(JSON.stringify(newVal))
    }
  },
  { deep: true }
)

/** 切换列显示 */
function toggleColumn(key: string, visible: boolean) {
  const col = localColumns.value.find((c) => c.key === key)
  if (col) {
    col.visible = visible
    syncToParent()
  }
}

/** 重置为默认（全部显示，原始顺序） */
function resetDefault() {
  localColumns.value = props.modelValue.map((c) => ({ ...c, visible: true }))
  syncToParent()
}

// ===== 拖拽排序 =====
function handleDragStart(index: number) {
  dragIndex.value = index
}

function handleDragOver(index: number) {
  if (dragIndex.value === null || dragIndex.value === index) return
  const dragged = localColumns.value[dragIndex.value]
  const newList = [...localColumns.value]
  newList.splice(dragIndex.value, 1)
  newList.splice(index, 0, dragged)
  localColumns.value = newList
  dragIndex.value = index
}

function handleDrop(_index: number) {
  syncToParent()
}

function handleDragEnd() {
  dragIndex.value = null
}
</script>

<style scoped>
.column-settings {
  max-height: 400px;
  display: flex;
  flex-direction: column;
}
.column-settings-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border-extra-light, #f2f6fc);
  margin-bottom: 8px;
}
.column-settings-title {
  font-weight: 600;
  font-size: 14px;
  color: var(--text-primary, #303133);
}
.column-settings-list {
  flex: 1;
  overflow-y: auto;
  max-height: 300px;
}
.column-settings-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 4px;
  border-radius: 4px;
  cursor: move;
  transition: background-color 0.15s;
}
.column-settings-item:hover {
  background-color: var(--bg-hover, #f5f7fa);
}
.column-settings-item.is-dragging {
  opacity: 0.5;
}
.drag-handle {
  color: var(--text-placeholder, #c0c4cc);
  cursor: grab;
  font-size: 14px;
}
.column-settings-footer {
  padding-top: 8px;
  border-top: 1px solid var(--border-extra-light, #f2f6fc);
  margin-top: 8px;
}
.column-settings-tip {
  font-size: 12px;
  color: var(--text-secondary, #909399);
}
</style>
