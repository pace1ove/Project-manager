<template>
  <el-dialog
    :model-value="visible"
    :title="title"
    width="720px"
    :close-on-click-modal="false"
    @update:model-value="(v: boolean) => emit('update:visible', v)"
    @open="initState"
  >
    <!-- 数据统计（可选） -->
    <div
      v-if="showStats && stats.length > 0"
      class="export-stats"
    >
      <el-tag
        v-for="s in stats"
        :key="s.label"
        :type="s.type || 'primary'"
      >
        {{ s.label }}：{{ s.count }}
      </el-tag>
    </div>

    <!-- 导出选项 -->
    <el-form
      label-width="80px"
      style="margin-top: 16px"
    >
      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="导出格式">
            <el-radio-group v-model="format">
              <el-radio value="excel">
                Excel
              </el-radio>
              <el-radio value="csv">
                CSV
              </el-radio>
            </el-radio-group>
          </el-form-item>
        </el-col>
        <el-col
          v-if="showScope"
          :span="12"
        >
          <el-form-item label="导出范围">
            <el-radio-group v-model="scope">
              <el-radio value="all">
                全部
              </el-radio>
              <el-radio
                value="selected"
                :disabled="selectedCount === 0"
              >
                选中 ({{ selectedCount }})
              </el-radio>
            </el-radio-group>
          </el-form-item>
        </el-col>
      </el-row>
      <el-form-item label="文件名">
        <el-input
          v-model="fileName"
          placeholder="自定义文件名"
        />
      </el-form-item>
    </el-form>

    <!-- 字段选择工具栏 -->
    <div class="export-toolbar">
      <el-button
        size="small"
        @click="handleSelectAll(true)"
      >
        全选
      </el-button>
      <el-button
        size="small"
        @click="handleSelectAll(false)"
      >
        全不选
      </el-button>
      <span class="export-hint">勾选字段并使用上下箭头调整导出顺序</span>
    </div>

    <!-- 表头预览 -->
    <div class="export-preview">
      <div class="export-preview-title">
        表头预览（{{ selectedKeys.length }} 列）
      </div>
      <div class="export-preview-tags">
        <template v-if="selectedKeys.length > 0">
          <el-tag
            v-for="key in selectedKeys"
            :key="key"
            size="small"
            type="primary"
            effect="plain"
            class="export-preview-tag"
          >
            {{ getLabel(key) }}
          </el-tag>
        </template>
        <span
          v-else
          class="text-muted"
        >未选择任何字段，确认时将导出全部列</span>
      </div>
    </div>

    <!-- 字段列表（勾选 + 排序） -->
    <div class="export-header-list">
      <div
        v-for="col in fields"
        :key="col.key"
        class="export-header-item"
        :class="{ 'is-selected': selectedKeys.includes(col.key) }"
      >
        <el-checkbox
          :model-value="selectedKeys.includes(col.key)"
          @change="(val: boolean) => toggleKey(col.key, val)"
        >
          {{ col.label }}
        </el-checkbox>
        <span class="export-header-key">{{ col.key }}</span>
        <div class="export-header-actions">
          <el-button
            size="small"
            text
            :disabled="!selectedKeys.includes(col.key) || getIndex(col.key) === 0"
            @click="moveUp(col.key)"
          >
            <el-icon><ArrowUp /></el-icon>
          </el-button>
          <el-button
            size="small"
            text
            :disabled="!selectedKeys.includes(col.key) || getIndex(col.key) === selectedKeys.length - 1"
            @click="moveDown(col.key)"
          >
            <el-icon><ArrowDown /></el-icon>
          </el-button>
          <span
            v-if="selectedKeys.includes(col.key)"
            class="export-header-order"
          >
            #{{ getIndex(col.key) + 1 }}
          </span>
        </div>
      </div>
    </div>

    <template #footer>
      <el-button @click="emit('update:visible', false)">
        取消
      </el-button>
      <el-button
        type="primary"
        :loading="exporting"
        @click="handleConfirm"
      >
        <el-icon><Download /></el-icon>
        确认导出
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { ArrowUp, ArrowDown, Download } from '@element-plus/icons-vue'

export interface BomExportField {
  key: string
  label: string
}

export interface BomExportConfig {
  /** 选中并排序后的字段 key 列表（空数组表示导出全部列） */
  selectedKeys: string[]
  format: 'excel' | 'csv'
  scope: 'all' | 'selected'
  fileName: string
}

const props = withDefaults(defineProps<{
  visible: boolean
  /** 全部可选字段 */
  fields: BomExportField[]
  /** 默认选中字段 key 列表（无 localStorage 时使用） */
  defaultSelected?: string[]
  /** localStorage 持久化 key（传入则记住上次选择） */
  storageKey?: string
  title?: string
  defaultFileName?: string
  /** 是否显示「导出范围」单选 */
  showScope?: boolean
  /** 已选行数（用于「选中」范围禁用态与计数） */
  selectedCount?: number
  /** 是否展示统计标签 */
  showStats?: boolean
  /** 统计标签内容 */
  stats?: Array<{ label: string; count: number; type?: 'primary' | 'success' | 'warning' | 'info' }>
  /** 确认导出按钮 loading */
  exporting?: boolean
}>(), {
  defaultSelected: () => [],
  storageKey: '',
  title: '导出BOM',
  defaultFileName: '',
  showScope: true,
  selectedCount: 0,
  showStats: false,
  stats: () => [],
  exporting: false
})

const emit = defineEmits<{
  (e: 'update:visible', v: boolean): void
  (e: 'export', config: BomExportConfig): void
}>()

const selectedKeys = ref<string[]>([])
const format = ref<'excel' | 'csv'>('excel')
const scope = ref<'all' | 'selected'>('all')
const fileName = ref('')

function getLabel(key: string): string {
  const col = props.fields.find((c) => c.key === key)
  return col?.label || key
}

function getIndex(key: string): number {
  return selectedKeys.value.indexOf(key)
}

/** 对话框打开时初始化内部状态（优先 localStorage，其次 defaultSelected） */
function initState() {
  const allKeys = props.fields.map((f) => f.key)
  let initial: string[] = [...props.defaultSelected]
  if (props.storageKey) {
    try {
      const saved = localStorage.getItem(props.storageKey)
      if (saved) {
        const parsed: string[] = JSON.parse(saved)
        const valid = new Set(allKeys)
        initial = parsed.filter((k) => valid.has(k))
      }
    } catch {
      // ignore，使用 defaultSelected
    }
  }
  selectedKeys.value = initial
  fileName.value = props.defaultFileName || ''
  scope.value = 'all'
  format.value = 'excel'
}

function handleSelectAll(val: boolean) {
  selectedKeys.value = val ? props.fields.map((f) => f.key) : []
}

function toggleKey(key: string, val: boolean) {
  if (val) {
    if (!selectedKeys.value.includes(key)) selectedKeys.value.push(key)
  } else {
    selectedKeys.value = selectedKeys.value.filter((k) => k !== key)
  }
}

function moveUp(key: string) {
  const index = getIndex(key)
  if (index <= 0) return
  const arr = [...selectedKeys.value]
  ;[arr[index - 1], arr[index]] = [arr[index], arr[index - 1]]
  selectedKeys.value = arr
}

function moveDown(key: string) {
  const index = getIndex(key)
  if (index < 0 || index >= selectedKeys.value.length - 1) return
  const arr = [...selectedKeys.value]
  ;[arr[index], arr[index + 1]] = [arr[index + 1], arr[index]]
  selectedKeys.value = arr
}

function handleConfirm() {
  // 持久化选择
  if (props.storageKey) {
    try {
      localStorage.setItem(props.storageKey, JSON.stringify(selectedKeys.value))
    } catch {
      // ignore
    }
  }
  emit('export', {
    selectedKeys: [...selectedKeys.value],
    format: format.value,
    scope: scope.value,
    fileName: fileName.value
  })
}

// 外部以 selectedCount 驱动默认范围（与原行为一致：有选中行默认选“选中”）
watch(
  () => props.visible,
  (v) => {
    if (v && props.showScope && props.selectedCount > 0) {
      scope.value = 'selected'
    }
  }
)
</script>

<style scoped>
.export-stats {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.export-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 8px 0 12px;
}
.export-hint {
  font-size: 12px;
  color: #909399;
}
.export-preview {
  margin-bottom: 12px;
}
.export-preview-title {
  font-size: 13px;
  color: #606266;
  margin-bottom: 6px;
}
.export-preview-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.export-preview-tag {
  margin-right: 0;
}
.text-muted {
  color: #909399;
  font-size: 13px;
}
.export-header-list {
  max-height: 280px;
  overflow-y: auto;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  padding: 4px 0;
}
.export-header-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 6px 12px;
}
.export-header-item:hover {
  background: #f5f7fa;
}
.export-header-item.is-selected {
  background: #ecf5ff;
}
.export-header-key {
  font-size: 12px;
  color: #c0c4cc;
  flex: 1;
}
.export-header-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}
.export-header-order {
  font-size: 12px;
  color: #909399;
  min-width: 32px;
}
</style>
