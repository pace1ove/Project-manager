<template>
  <div
    class="bom-table-wrapper"
    :class="`density-${localDensity}`"
  >
    <!-- ===== 工具栏 ===== -->
    <div class="bom-toolbar">
      <div class="bom-toolbar-left">
        <!-- 密度切换 -->
        <el-radio-group
          v-model="localDensity"
          size="small"
          @change="onDensityChange"
        >
          <el-radio-button value="compact">
            紧凑
          </el-radio-button>
          <el-radio-button value="comfortable">
            舒适
          </el-radio-button>
        </el-radio-group>
      </div>

      <div class="bom-toolbar-right">
        <!-- 搜索框 -->
        <el-input
          v-model="searchKeyword"
          placeholder="搜索..."
          size="small"
          clearable
          style="width: 200px;"
          :prefix-icon="Search"
        />

        <!-- 添加行 -->
        <el-button
          v-if="editable && !hideAddButton"
          type="primary"
          size="small"
          :icon="Plus"
          @click="addRow"
        >
          添加行
        </el-button>

        <!-- 列设置 -->
        <ColumnSettings
          v-model="columnConfigs"
          :storage-key="storageKey ? `${storageKey}_cols` : ''"
        />

        <!-- 刷新 -->
        <el-button
          size="small"
          :icon="Refresh"
          @click="onRefresh"
        />
      </div>
    </div>

    <!-- ===== 列表视图 ===== -->
    <div
      ref="scrollContainerRef"
      class="bom-table-container"
      :class="{ 'virtual-mode': virtualEnabled }"
      @scroll="onTableScroll"
    >
      <div class="bom-table-scroll">
        <table class="bom-table">
          <thead>
            <tr>
              <!-- 复选框列 -->
              <th
                v-if="editable"
                class="col-checkbox"
              >
                <el-checkbox
                  :model-value="isAllSelected"
                  :indeterminate="isIndeterminate"
                  @change="toggleSelectAll"
                />
              </th>
              <!-- 序号列（固定左侧） -->
              <th class="col-index fixed-left">
                #
              </th>

              <!-- 动态列 -->
              <th
                v-for="col in visibleColumns"
                :key="col.key"
                :class="[`col-${col.key}`, { 'fixed-left': col.fixed === 'left', 'sortable': true, 'sorted': sortField === col.key }]"
                :style="{ width: col.width ? `${col.width}px` : undefined }"
                @click="toggleSort(col.key)"
              >
                <div class="th-content">
                  <span class="th-label">{{ col.label }}</span>
                  <!-- 排序图标 -->
                  <span
                    v-if="getSortIcon(col.key)"
                    class="sort-icon"
                  >
                    {{ getSortIcon(col.key) }}
                  </span>
                  <!-- 列头筛选 -->
                  <el-popover
                    v-if="col.filterable"
                    placement="bottom"
                    :width="200"
                    trigger="click"
                    @click.stop
                  >
                    <template #reference>
                      <el-icon
                        class="filter-icon"
                        :class="{ active: getColumnFilter(col.key) }"
                      >
                        <Filter />
                      </el-icon>
                    </template>
                    <div class="col-filter-panel">
                      <el-radio-group
                        v-model="filterOperators[col.key]"
                        size="small"
                      >
                        <el-radio-button value="contains">
                          包含
                        </el-radio-button>
                        <el-radio-button value="equals">
                          等于
                        </el-radio-button>
                      </el-radio-group>
                      <el-input
                        v-model="filterValues[col.key]"
                        size="small"
                        placeholder="输入筛选值"
                        clearable
                        class="mt-1"
                        @keyup.enter="applyColumnFilter"
                      />
                      <div class="col-filter-actions">
                        <el-button
                          size="small"
                          text
                          @click="clearColumnFilter(col.key)"
                        >
                          清除
                        </el-button>
                        <el-button
                          size="small"
                          type="primary"
                          @click="applyColumnFilter"
                        >
                          确定
                        </el-button>
                      </div>
                    </div>
                  </el-popover>
                </div>
              </th>

              <!-- 操作列（固定右侧） -->
              <th
                v-if="editable"
                class="col-actions fixed-right"
              >
                操作
              </th>
            </tr>
          </thead>
          <tbody>
            <!-- 虚拟滚动顶部占位行 -->
            <tr
              v-if="virtualEnabled"
              class="virtual-spacer-row"
              :style="{ height: startIndex * rowHeight + 'px' }"
            >
              <td
                :colspan="totalColCount"
                class="spacer-cell"
              />
            </tr>
            <tr
              v-for="(row, vi) in displayRows"
              :key="row.id"
              :class="rowClass(row)"
              @click="emit('row-click', row)"
            >
              <!-- 复选框 -->
              <td
                v-if="editable"
                class="col-checkbox"
                @click.stop
              >
                <el-checkbox
                  :model-value="isRowSelected(row)"
                  @change="(val: boolean) => toggleRowSelect(row, val)"
                />
              </td>
              <!-- 序号 -->
              <td class="col-index fixed-left">
                {{ rowGlobalIndex(vi) + 1 }}
              </td>

              <!-- 动态单元格 -->
              <td
                v-for="col in visibleColumns"
                :key="col.key"
                :class="[`col-${col.key}`, { 'fixed-left': col.fixed === 'left', 'cell-error': hasCellError(row.id, col.key) }]"
                :style="{ width: col.width ? `${col.width}px` : undefined }"
                @dblclick="editable && col.editable && startEdit(row, col.key)"
              >
                <el-tooltip
                  :disabled="!hasCellError(row.id, col.key)"
                  :content="getCellError(row.id, col.key)"
                  placement="top"
                  effect="dark"
                >
                  <template #content>
                    <span style="color: #f56c6c">{{ getCellError(row.id, col.key) }}</span>
                  </template>
                  <!-- 编辑态 -->
                  <template v-if="editingCell?.rowId === row.id && editingCell?.field === col.key">
                    <el-input-number
                      v-if="col.dataType === 'number'"
                      ref="editInputRef"
                      v-model="editValue"
                      size="small"
                      :min="0"
                      :controls="false"
                      style="width: 100%;"
                      @keyup.enter="confirmEdit(row, col.key)"
                      @keyup.esc="cancelEdit"
                      @blur="confirmEdit(row, col.key)"
                    />
                    <el-input
                      v-else
                      ref="editInputRef"
                      v-model="editValue"
                      size="small"
                      style="width: 100%;"
                      @keyup.enter="confirmEdit(row, col.key)"
                      @keyup.esc="cancelEdit"
                      @blur="confirmEdit(row, col.key)"
                    />
                  </template>
                  <!-- 展示态 -->
                  <template v-else>
                    <!-- 特殊列渲染 -->
                    <template v-if="col.key === 'type'">
                      <el-tag
                        :type="typeTagType(row.type)"
                        size="small"
                        effect="light"
                      >
                        {{ typeLabel(row.type) }}
                      </el-tag>
                    </template>
                    <template v-else-if="col.key === 'sourceModuleIds' && showSourceModules">
                      <div class="source-modules">
                        <el-tooltip
                          v-for="modId in getSourceModules(row)"
                          :key="modId"
                          :content="getModuleName(modId)"
                          placement="top"
                        >
                          <el-tag
                            size="small"
                            type="info"
                            effect="plain"
                            class="source-module-tag"
                          >
                            {{ getModuleDrawingNo(modId) }}
                          </el-tag>
                        </el-tooltip>
                      </div>
                    </template>
                    <template v-else-if="col.key === 'quantity'">
                      <span class="cell-number">{{ formatNumber(row.quantity) }}</span>
                    </template>
                    <template v-else-if="col.key === 'totalAmount'">
                      <span class="cell-number">{{ formatNumber(row.totalAmount) }}</span>
                    </template>
                    <template v-else-if="col.key === 'spareParts'">
                      <span class="cell-number">{{ row.spareParts ?? '-' }}</span>
                    </template>
                    <!-- 普通文本列（带搜索高亮） -->
                    <span
                      v-else
                      v-html="highlightText(String(row[col.key] ?? ''))"
                    />
                  </template>
                </el-tooltip>
              </td>

              <!-- 操作列 -->
              <td
                v-if="editable"
                class="col-actions fixed-right"
                @click.stop
              >
                <div class="action-buttons">
                  <el-button
                    text
                    type="primary"
                    size="small"
                    :icon="Edit"
                    title="编辑"
                    @click="startEdit(row, getFirstEditableCol())"
                  />
                  <el-button
                    text
                    type="warning"
                    size="small"
                    :icon="CopyDocument"
                    title="复制"
                    @click="copyRow(row)"
                  />
                  <el-button
                    text
                    type="danger"
                    size="small"
                    :icon="Delete"
                    title="删除"
                    @click="deleteRow(row)"
                  />
                  <!-- 拖拽手柄 -->
                  <el-icon
                    class="drag-handle"
                    :rank="true"
                  >
                    <Rank />
                  </el-icon>
                </div>
              </td>
            </tr>

            <!-- 虚拟滚动底部占位行 -->
            <tr
              v-if="virtualEnabled"
              class="virtual-spacer-row"
              :style="{ height: (filteredItems.length - endIndex) * rowHeight + 'px' }"
            >
              <td
                :colspan="totalColCount"
                class="spacer-cell"
              />
            </tr>

            <!-- 空行 -->
            <tr v-if="filteredItems.length === 0">
              <td
                :colspan="totalColCount"
                class="bom-empty"
              >
                <el-empty
                  description="暂无数据"
                  :image-size="60"
                />
              </td>
            </tr>
          </tbody>

          <!-- 合计行 -->
          <tfoot v-if="showSummary && filteredItems.length > 0">
            <tr class="bom-summary-row">
              <td
                v-if="editable"
                class="col-checkbox"
              />
              <td class="col-index fixed-left">
                合计
              </td>
              <td
                v-for="col in visibleColumns"
                :key="col.key"
                :class="[`col-${col.key}`, { 'fixed-left': col.fixed === 'left' }]"
              >
                <template v-if="col.key === 'quantity'">
                  <strong class="summary-number">{{ totalQuantity }}</strong>
                </template>
                <template v-else-if="col.key === 'totalAmount'">
                  <strong class="summary-number">{{ totalAmount }}</strong>
                </template>
                <template v-else />
              </td>
              <td
                v-if="editable"
                class="col-actions fixed-right"
              />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import {
  Search, Plus, Refresh, Edit, CopyDocument, Delete,
  Rank, Filter
} from '@element-plus/icons-vue'
import { ElMessageBox, ElMessage } from 'element-plus'
import ColumnSettings, { type ColumnConfig } from './ColumnSettings.vue'
import { useModulesStore } from '@/stores/modules'
import { generateId } from '@/utils/storage'
import { validateBomField } from '@/utils/bomValidation'
import { useDebounceRef } from '@/composables/useDebounce'
import { usePerformanceSettings } from '@/composables/usePerformanceSettings'
import { useCleanup } from '@/composables/useCleanup'
import type { BomItem, OrderBomItem, BomTemplateField } from '@/types'

/** BOM表格行类型（兼容 BomItem 和 OrderBomItem） */
export type BomTableRow = (BomItem | OrderBomItem) & {
  /** 临时行状态：new/modified/deleted，不持久化 */
  _rowStatus?: 'new' | 'modified' | 'deleted'
}

/** 列定义 */
interface TableColumn {
  key: string
  label: string
  width?: number
  fixed?: 'left' | 'right'
  editable?: boolean
  filterable?: boolean
  dataType?: 'text' | 'number'
}

const props = withDefaults(
  defineProps<{
    /** BOM条目数据 */
    items: BomTableRow[]
    /** 是否可编辑 */
    editable?: boolean
    /** 密度 */
    density?: 'compact' | 'comfortable'
    /** 是否显示合计行 */
    showSummary?: boolean
    /** localStorage 持久化 key */
    storageKey?: string
    /** 是否显示来源模块列（下单BOM用） */
    showSourceModules?: boolean
    /** 模板字段配置（用于动态获取必填字段校验） */
    templateFields?: BomTemplateField[]
    /** 严格模式：零件参数字段只读（数量/类型等BOM特有字段仍可编辑） */
    readonlyPartFields?: boolean
    /** 隐藏内置「添加行」按钮（由父页面通过对话框新增条目时使用） */
    hideAddButton?: boolean
  }>(),
  {
    editable: true,
    density: 'comfortable',
    showSummary: true,
    storageKey: '',
    showSourceModules: false,
    templateFields: () => [],
    readonlyPartFields: false,
    hideAddButton: false
  }
)

const emit = defineEmits<{
  (e: 'update:items', value: BomTableRow[]): void
  (e: 'row-click', row: BomTableRow): void
  (e: 'selection-change', rows: BomTableRow[]): void
}>()

const modulesStore = useModulesStore()
const perf = usePerformanceSettings()
const cleanup = useCleanup()

// ===== 本地状态 =====
const localDensity = ref<'compact' | 'comfortable'>(props.density)
const searchKeyword = ref('')

// 搜索防抖（300ms）：大数据量时避免每次按键都全量过滤
const debouncedSearchKeyword = useDebounceRef(searchKeyword, 300)
const selectedRows = ref<Set<string>>(new Set())
const editingCell = ref<{ rowId: string; field: string } | null>(null)
const editValue = ref<any>('')
const editInputRef = ref<any>(null)

// 单元格校验错误：key 为 `${rowId}:${field}`
const cellErrors = ref<Map<string, string>>(new Map())

// 列头排序：sortField 为 null 表示不排序，sortOrder 为 'asc' | 'desc'
const sortField = ref<string | null>(null)
const sortOrder = ref<'asc' | 'desc' | null>(null)

/** 点击列标题切换排序：默认 → 升序 → 降序 → 默认 */
function toggleSort(field: string) {
  if (sortField.value !== field) {
    // 切换到新字段：升序
    sortField.value = field
    sortOrder.value = 'asc'
  } else if (sortOrder.value === 'asc') {
    // 升序 → 降序
    sortOrder.value = 'desc'
  } else if (sortOrder.value === 'desc') {
    // 降序 → 默认（不排序）
    sortField.value = null
    sortOrder.value = null
  } else {
    // 默认 → 升序
    sortOrder.value = 'asc'
  }
}

/** 获取列的排序状态图标 */
function getSortIcon(field: string): string {
  if (sortField.value !== field) return ''
  if (sortOrder.value === 'asc') return '↑'
  if (sortOrder.value === 'desc') return '↓'
  return ''
}

// 列头筛选
const filterValues = ref<Record<string, string>>({})
const filterOperators = ref<Record<string, string>>({})
const activeFilters = ref<Record<string, { operator: string; value: string }>>({})

// ===== 默认列配置 =====
const defaultColumns: TableColumn[] = [
  { key: 'drawingNo', label: '图号', width: 120, fixed: 'left', editable: true, filterable: true, dataType: 'text' },
  { key: 'jobNo', label: 'JOB号', width: 100, editable: true, filterable: true, dataType: 'text' },
  { key: 'chineseDescription', label: '中文描述', width: 200, fixed: 'left', editable: true, filterable: true, dataType: 'text' },
  { key: 'englishDescription', label: '英文描述', width: 180, editable: true, filterable: true, dataType: 'text' },
  { key: 'materialCatalogNo', label: '物料/目录号', width: 130, editable: true, filterable: true, dataType: 'text' },
  { key: 'assemblyUnit', label: '装配单位', width: 90, editable: true, dataType: 'text' },
  { key: 'quantity', label: '数量', width: 90, editable: true, dataType: 'number' },
  { key: 'totalAmount', label: '总金额', width: 100, editable: true, dataType: 'number' },
  { key: 'spareParts', label: '备件', width: 70, editable: true, dataType: 'number' },
  { key: 'type', label: '类型', width: 90, editable: false, filterable: true, dataType: 'text' }
]

// 如果显示来源模块，添加来源模块列
if (props.showSourceModules) {
  defaultColumns.push({ key: 'sourceModuleIds', label: '来源模块', width: 160, editable: false, dataType: 'text' })
}

/** 列配置（用于 ColumnSettings） */
const columnConfigs = ref<ColumnConfig[]>(
  defaultColumns.map((c) => ({
    key: c.key,
    label: c.label,
    visible: true,
    width: c.width
  }))
)

// 从 localStorage 恢复列配置
onMounted(() => {
  if (props.storageKey) {
    try {
      const raw = localStorage.getItem(`bom_column_settings_${props.storageKey}_cols`)
      if (raw) {
        const saved = JSON.parse(raw) as ColumnConfig[]
        const validKeys = new Set(defaultColumns.map((c) => c.key))
        columnConfigs.value = saved.filter((c) => validKeys.has(c.key))
        // 补充新增列
        for (const col of defaultColumns) {
          if (!columnConfigs.value.find((c) => c.key === col.key)) {
            columnConfigs.value.push({ key: col.key, label: col.label, visible: true, width: col.width })
          }
        }
      }
    } catch {
      // ignore
    }
  }
  // 虚拟滚动：测量容器高度并监听窗口 resize（防抖）
  nextTick(measureContainer)
  let resizeTimer: ReturnType<typeof setTimeout> | null = null
  const onResize = () => {
    if (resizeTimer) clearTimeout(resizeTimer)
    resizeTimer = setTimeout(measureContainer, 150)
  }
  cleanup.addEventListener(window, 'resize', onResize)
  cleanup.add(() => {
    if (resizeTimer) clearTimeout(resizeTimer)
  })
  // ResizeObserver：当容器从隐藏变可见（如切换Tab）时重新测量
  let ro: ResizeObserver | null = null
  if (typeof ResizeObserver !== 'undefined' && scrollContainerRef.value) {
    ro = new ResizeObserver(() => {
      if (resizeTimer) clearTimeout(resizeTimer)
      resizeTimer = setTimeout(measureContainer, 100)
    })
    ro.observe(scrollContainerRef.value)
    cleanup.add(() => ro?.disconnect())
  }
  // 数据加载后重新测量
  watch(() => props.items.length, () => {
    nextTick(measureContainer)
  })
})

/** 可见列（按 columnConfigs 顺序和可见性过滤） */
const visibleColumns = computed<TableColumn[]>(() => {
  return columnConfigs.value
    .filter((c) => c.visible)
    .map((c) => {
      const def = defaultColumns.find((d) => d.key === c.key)
      // 严格模式：零件参数字段只读，仅 BOM 特有字段（quantity）保留可编辑
      const editable = props.readonlyPartFields
        ? c.key === 'quantity'
        : (def?.editable ?? true)
      return {
        key: c.key,
        label: c.label,
        width: c.width || def?.width,
        fixed: def?.fixed,
        editable,
        filterable: def?.filterable ?? false,
        dataType: def?.dataType || 'text'
      }
    })
})

/** 总列数（用于空行 colspan） */
const totalColCount = computed(() => {
  let count = visibleColumns.value.length + 1 // 序号列
  if (props.editable) count += 2 // 复选框 + 操作列
  return count
})

// ===== 搜索 + 筛选过滤 =====
const filteredItems = computed<BomTableRow[]>(() => {
  let result = [...props.items]

  // 列头筛选
  for (const [key, filter] of Object.entries(activeFilters.value)) {
    if (!filter.value) continue
    result = result.filter((row) => {
      const val = String(row[key] ?? '').toLowerCase()
      const fv = filter.value.toLowerCase()
      return filter.operator === 'equals' ? val === fv : val.includes(fv)
    })
  }

  // 全局搜索（使用防抖后的关键词）
  const kw = debouncedSearchKeyword.value.trim().toLowerCase()
  if (kw) {
    result = result.filter((row) => {
      const searchFields = ['drawingNo', 'jobNo', 'chineseDescription', 'englishDescription', 'materialCatalogNo', 'assemblyUnit']
      return searchFields.some((f) => String(row[f] ?? '').toLowerCase().includes(kw))
    })
  }

  // 列头排序
  if (sortField.value && sortOrder.value) {
    const field = sortField.value
    const order = sortOrder.value
    result.sort((a, b) => {
      const valA = a[field as keyof BomTableRow]
      const valB = b[field as keyof BomTableRow]
      // 空值排最后
      const isEmptyA = valA === undefined || valA === null || valA === ''
      const isEmptyB = valB === undefined || valB === null || valB === ''
      if (isEmptyA && isEmptyB) return 0
      if (isEmptyA) return 1
      if (isEmptyB) return -1
      // 数字类型直接比较
      if (typeof valA === 'number' && typeof valB === 'number') {
        return order === 'asc' ? valA - valB : valB - valA
      }
      // 字符串类型自然排序（支持中文和数字）
      const strA = String(valA)
      const strB = String(valB)
      const cmp = strA.localeCompare(strB, 'zh-CN', { numeric: true, sensitivity: 'base' })
      return order === 'asc' ? cmp : -cmp
    })
  }

  return result
})

// ===== 虚拟滚动 =====
// 行高：紧凑36px / 舒适48px
const rowHeight = computed(() => (localDensity.value === 'compact' ? 36 : 48))
const virtualBuffer = 5
// 表格滚动容器
const scrollContainerRef = ref<HTMLElement | null>(null)
const containerHeight = ref(400)
const scrollTop = ref(0)

/** 是否启用虚拟滚动：开关开启 且 过滤后行数超过阈值 */
const virtualEnabled = computed(() => {
  return perf.shouldUseBomVirtualScroll(filteredItems.value.length)
})

/** 可视区可容纳行数 */
const visibleCount = computed(() => Math.ceil(containerHeight.value / rowHeight.value) + virtualBuffer)

/** 起始索引 */
const startIndex = computed(() => {
  const raw = Math.floor(scrollTop.value / rowHeight.value) - virtualBuffer
  return Math.max(0, raw)
})

/** 结束索引 */
const endIndex = computed(() =>
  Math.min(filteredItems.value.length, startIndex.value + visibleCount.value + virtualBuffer)
)

/** 可视区行数据 */
const visibleRows = computed(() => filteredItems.value.slice(startIndex.value, endIndex.value))

/** 实际渲染的行（虚拟滚动时只渲染可视区，否则渲染全部） */
const displayRows = computed<BomTableRow[]>(() => (virtualEnabled.value ? visibleRows.value : filteredItems.value))

/** 根据虚拟滚动状态计算全局行号 */
function rowGlobalIndex(localIndex: number): number {
  return virtualEnabled.value ? startIndex.value + localIndex : localIndex
}

/** 滚动事件处理 */
function onTableScroll(e: Event) {
  scrollTop.value = (e.target as HTMLElement).scrollTop
}

/** 测量容器高度 */
function measureContainer() {
  const el = scrollContainerRef.value
  if (el) containerHeight.value = el.clientHeight || 400
}

// 虚拟滚动关闭或数据大幅变化时重置滚动位置，避免空白
watch(virtualEnabled, () => {
  scrollTop.value = 0
  if (scrollContainerRef.value) scrollContainerRef.value.scrollTop = 0
})

// ===== 合计 =====
const totalQuantity = computed(() => {
  return filteredItems.value.reduce((sum, r) => sum + (Number(r.quantity) || 0), 0)
})

const totalAmount = computed(() => {
  return filteredItems.value.reduce((sum, r) => sum + (Number(r.totalAmount) || 0), 0)
})

// ===== 行选择 =====
const isAllSelected = computed(() => {
  return filteredItems.value.length > 0 && filteredItems.value.every((r) => selectedRows.value.has(r.id))
})

const isIndeterminate = computed(() => {
  const selected = filteredItems.value.filter((r) => selectedRows.value.has(r.id)).length
  return selected > 0 && selected < filteredItems.value.length
})

function isRowSelected(row: BomTableRow): boolean {
  return selectedRows.value.has(row.id)
}

function toggleRowSelect(row: BomTableRow, selected: boolean) {
  if (selected) {
    selectedRows.value.add(row.id)
  } else {
    selectedRows.value.delete(row.id)
  }
  emitSelection()
}

function toggleSelectAll(selected: boolean) {
  if (selected) {
    filteredItems.value.forEach((r) => selectedRows.value.add(r.id))
  } else {
    filteredItems.value.forEach((r) => selectedRows.value.delete(r.id))
  }
  emitSelection()
}

function emitSelection() {
  const rows = props.items.filter((r) => selectedRows.value.has(r.id))
  emit('selection-change', rows)
}

// ===== 行内编辑 =====
function startEdit(row: BomTableRow, field: string) {
  if (!props.editable) return
  editingCell.value = { rowId: row.id, field }
  editValue.value = row[field] ?? ''
  nextTick(() => {
    const input = editInputRef.value
    if (input) {
      const el = Array.isArray(input) ? input[0] : input
      if (el) {
        if (typeof el.focus === 'function') el.focus()
        else if (el.input && typeof el.input.focus === 'function') el.input.focus()
      }
    }
  })
}

function confirmEdit(row: BomTableRow, field: string) {
  if (!editingCell.value) return

  // 校验字段
  const errorMsg = validateBomField(field, editValue.value, props.templateFields)
  const errorKey = `${row.id}:${field}`

  if (errorMsg) {
    cellErrors.value.set(errorKey, errorMsg)
    ElMessage.warning(errorMsg)
  } else {
    cellErrors.value.delete(errorKey)
  }

  const newItems = props.items.map((r) => {
    if (r.id === row.id) {
      const updated = { ...r, [field]: editValue.value }
      // 数量字段强制为数字
      if (field === 'quantity') {
        updated[field] = Number(editValue.value) || 0
      }
      // 标记为修改（非新增行）
      if (updated._rowStatus !== 'new') {
        updated._rowStatus = 'modified'
      }
      return updated
    }
    return r
  })
  // 行内编辑只更新目标行字段，不重排整表 sortOrder
  emit('update:items', newItems)
  editingCell.value = null
  editValue.value = ''
}

function cancelEdit() {
  editingCell.value = null
  editValue.value = ''
}

function getFirstEditableCol(): string {
  return visibleColumns.value.find((c) => c.editable)?.key || 'chineseDescription'
}

// ===== 添加/复制/删除行 =====
function addRow() {
  const maxSort = props.items.length > 0 ? Math.max(...props.items.map((i) => i.sortOrder || 0)) : 0
  const newItem: BomTableRow = {
    id: generateId('bi'),
    drawingNo: '',
    jobNo: '',
    chineseDescription: '',
    englishDescription: '',
    materialCatalogNo: '',
    assemblyUnit: '',
    quantity: 1,
    totalAmount: 0,
    spareParts: 0,
    type: 'assembly',
    source: 'manual',
    sortOrder: maxSort + 1,
    _rowStatus: 'new'
  } as BomTableRow
  // 如果是 OrderBomItem，添加 sourceModuleIds
  if (props.showSourceModules) {
    ;(newItem as OrderBomItem).sourceModuleIds = []
    ;(newItem as OrderBomItem).source = 'manual'
  }
  emit('update:items', [...props.items, newItem])
  // 自动进入编辑
  nextTick(() => startEdit(newItem, 'chineseDescription'))
}

function copyRow(row: BomTableRow) {
  const copy: BomTableRow = {
    ...JSON.parse(JSON.stringify(row)),
    id: generateId('bi'),
    sortOrder: row.sortOrder + 0.5,
    _rowStatus: 'new'
  }
  const newItems = [...props.items, copy].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
  newItems.forEach((item, idx) => {
    item.sortOrder = idx + 1
  })
  emit('update:items', newItems)
  ElMessage.success('已复制行')
}

async function deleteRow(row: BomTableRow) {
  try {
    await ElMessageBox.confirm(
      `确定删除 "${row.chineseDescription || row.drawingNo || '该行'}" 吗？`,
      '删除确认',
      { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' }
    )
    const newItems = props.items.filter((r) => r.id !== row.id)
    newItems.forEach((item, idx) => {
      item.sortOrder = idx + 1
    })
    selectedRows.value.delete(row.id)
    emit('update:items', newItems)
    emitSelection()
    ElMessage.success('已删除')
  } catch {
    // 用户取消
  }
}

// ===== 列头筛选 =====
function getColumnFilter(key: string): boolean {
  return !!activeFilters.value[key]?.value
}

function applyColumnFilter() {
  activeFilters.value = {}
  for (const key of Object.keys(filterValues.value)) {
    if (filterValues.value[key]) {
      activeFilters.value[key] = {
        operator: filterOperators.value[key] || 'contains',
        value: filterValues.value[key]
      }
    }
  }
}

function clearColumnFilter(key: string) {
  filterValues.value[key] = ''
  delete activeFilters.value[key]
}

// ===== 搜索高亮 =====
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function highlightText(text: string): string {
  const kw = debouncedSearchKeyword.value.trim()
  const escaped = escapeHtml(text)
  if (!kw || !text) return escaped
  const regex = new RegExp(`(${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
  return escaped.replace(regex, '<mark class="search-highlight">$1</mark>')
}

// ===== 行状态样式 =====
function rowClass(row: BomTableRow): string {
  const classes: string[] = []
  if (row._rowStatus === 'new') classes.push('row-status-new')
  else if (row._rowStatus === 'modified') classes.push('row-status-modified')
  else if (row._rowStatus === 'deleted') classes.push('row-status-deleted')
  return classes.join(' ')
}

/** 检查单元格是否有校验错误 */
function hasCellError(rowId: string, field: string): boolean {
  return cellErrors.value.has(`${rowId}:${field}`)
}

/** 获取单元格错误消息 */
function getCellError(rowId: string, field: string): string {
  return cellErrors.value.get(`${rowId}:${field}`) || ''
}

// ===== BOM类型标签 =====
function typeLabel(type: string): string {
  const map: Record<string, string> = {
    assembly: '装配',
    order: '下单',
    both: '两者'
  }
  return map[type] || type
}

function typeTagType(type: string): 'primary' | 'success' | 'warning' | 'info' {
  const map: Record<string, 'primary' | 'success' | 'warning' | 'info'> = {
    assembly: 'primary',
    order: 'success',
    both: 'warning'
  }
  return map[type] || 'info'
}

// ===== 来源模块 =====
function getSourceModules(row: BomTableRow): string[] {
  return (row as OrderBomItem).sourceModuleIds || []
}

function getModuleName(moduleId: string): string {
  return modulesStore.getModuleById(moduleId)?.nameZh || moduleId
}

function getModuleDrawingNo(moduleId: string): string {
  return modulesStore.getModuleById(moduleId)?.drawingNo || moduleId
}

// ===== 工具函数 =====
function formatNumber(val: any): string {
  if (val === null || val === undefined || val === '') return '-'
  const num = Number(val)
  if (isNaN(num)) return String(val)
  return Number.isInteger(num) ? String(num) : num.toFixed(2)
}

// ===== 事件处理 =====
function onDensityChange(val: string) {
  localDensity.value = val as 'compact' | 'comfortable'
}

function onRefresh() {
  // 触发父组件重新加载数据（通过 emit update 原样回传，父组件可监听）
  emit('update:items', [...props.items])
  ElMessage.info('已刷新')
}

// 监听外部 items 变化，清除已删除行的选中状态
watch(
  () => props.items,
  (newItems) => {
    const ids = new Set(newItems.map((i) => i.id))
    let changed = false
    for (const id of selectedRows.value) {
      if (!ids.has(id)) {
        selectedRows.value.delete(id)
        changed = true
      }
    }
    if (changed) emitSelection()
  }
)

// 暴露给父组件：当前可见列配置（用于打印等场景）
defineExpose({
  visibleColumns
})
</script>

<style scoped>
.bom-table-wrapper {
  width: 100%;
  background: var(--bg-card, #fff);
  border-radius: var(--radius-base, 4px);
  border: 1px solid var(--border-light, #e4e7ed);
  overflow: hidden;
}

/* ===== 工具栏 ===== */
.bom-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  border-bottom: 1px solid var(--border-extra-light, #f2f6fc);
  gap: 12px;
  flex-wrap: wrap;
}
.bom-toolbar-left,
.bom-toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

/* ===== 表格 ===== */
.bom-table-container {
  overflow-x: auto;
}
.bom-table-container.virtual-mode {
  /* 虚拟滚动模式：固定可视高度，纵向滚动 */
  max-height: calc(100vh - 260px);
  min-height: 200px;
  overflow-y: auto;
}
.bom-table-scroll {
  min-width: 100%;
}
.bom-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}
.bom-table th,
.bom-table td {
  padding: 8px 10px;
  text-align: left;
  border-bottom: 1px solid var(--border-extra-light, #f2f6fc);
  font-size: 13px;
  vertical-align: middle;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.bom-table th {
  background: var(--bg-hover, #f5f7fa);
  font-weight: 600;
  color: var(--text-primary, #303133);
  position: sticky;
  top: 0;
  z-index: 2;
}
.bom-table tbody tr {
  transition: background-color 0.15s;
  cursor: pointer;
}
.bom-table tbody tr:hover {
  background-color: var(--bg-hover, #f5f7fa);
}
.bom-table tbody tr.row-status-new:hover {
  background-color: #e1f3d8;
}
.bom-table tbody tr.row-status-modified:hover {
  background-color: #faecd8;
}
.bom-table tbody tr.row-status-deleted:hover {
  background-color: #fde2e2;
}

/* 单元格校验错误 */
.cell-error {
  background-color: #fef0f0 !important;
  box-shadow: inset 2px 0 0 #f56c6c;
}

/* 固定列 */
.fixed-left {
  position: sticky;
  left: 0;
  z-index: 1;
  background: inherit;
}
.fixed-right {
  position: sticky;
  right: 0;
  z-index: 1;
  background: inherit;
}
.bom-table th.fixed-left,
.bom-table th.fixed-right {
  z-index: 3;
}

/* 列宽 */
.col-checkbox { width: 40px; text-align: center; }
.col-index { width: 50px; text-align: center; color: var(--text-secondary, #909399); }
.col-actions { width: 130px; text-align: center; }

/* 列头筛选 */
.th-content {
  display: flex;
  align-items: center;
  gap: 4px;
}
.th-label {
  cursor: pointer;
  user-select: none;
}
.sort-icon {
  font-size: 12px;
  color: var(--color-primary, #409eff);
  font-weight: bold;
}
th.sortable {
  cursor: pointer;
  user-select: none;
}
th.sortable:hover {
  background-color: var(--fill-color-light, #f5f7fa);
}
th.sorted .th-label {
  color: var(--color-primary, #409eff);
}
.filter-icon {
  cursor: pointer;
  font-size: 12px;
  color: var(--text-placeholder, #c0c4cc);
  transition: color 0.15s;
}
.filter-icon:hover,
.filter-icon.active {
  color: var(--color-primary, #409eff);
}
.col-filter-panel {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.col-filter-actions {
  display: flex;
  justify-content: flex-end;
  gap: 4px;
}
.mt-1 { margin-top: 4px; }

/* 单元格 */
.cell-number {
  font-variant-numeric: tabular-nums;
}
.source-modules {
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
}
.source-module-tag {
  font-size: 11px;
}

/* 操作按钮 */
.action-buttons {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2px;
}
.drag-handle {
  cursor: grab;
  color: var(--text-placeholder, #c0c4cc);
  font-size: 14px;
  margin-left: 4px;
}
.drag-handle:hover {
  color: var(--text-secondary, #909399);
}

/* 合计行 */
.bom-summary-row {
  background: var(--bg-hover, #f5f7fa);
  font-weight: 600;
}
.bom-summary-row td {
  border-top: 2px solid var(--border-base, #dcdfe6);
  border-bottom: none;
}
.summary-number {
  color: var(--color-primary, #409eff);
}

/* 空状态 */
.bom-empty {
  padding: 32px !important;
  text-align: center;
}

/* 虚拟滚动占位行 */
.virtual-spacer-row td.spacer-cell {
  padding: 0 !important;
  border: none !important;
  height: 100%;
  line-height: 0;
  font-size: 0;
}

/* ===== 密度 ===== */
.density-compact .bom-table th,
.density-compact .bom-table td {
  padding: 4px 8px;
  font-size: 12px;
}
.density-compact .bom-toolbar {
  padding: 6px 10px;
}
</style>
