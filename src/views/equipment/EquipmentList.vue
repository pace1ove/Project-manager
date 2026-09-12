<template>
  <div class="page-container">
    <PageBreadcrumb />
    <!-- 查询条件 -->
    <div class="card-wrapper">
      <el-form
        :inline="true"
        :model="searchForm"
        class="search-bar"
        label-position="right"
      >
        <el-form-item label="名称/型号">
          <el-input
            v-model="searchForm.keyword"
            placeholder="搜索名称/型号..."
            clearable
            prefix-icon="Search"
            style="width: 220px"
            @keyup.enter="handleSearch"
          />
        </el-form-item>
        <el-form-item label="状态">
          <el-select
            v-model="searchForm.status"
            placeholder="全部"
            clearable
            style="width: 140px"
          >
            <el-option
              label="启用"
              value="active"
            />
            <el-option
              label="停用"
              value="inactive"
            />
          </el-select>
        </el-form-item>
        <el-form-item>
          <AdvancedFilter
            v-model="filterConditions"
            v-model:logic="filterLogic"
            :fields="filterFields"
            storage-key="equipment_list"
            @filter="handleAdvancedFilter"
            @reset="handleAdvancedReset"
          />
        </el-form-item>
        <el-form-item>
          <el-button
            type="primary"
            @click="handleSearch"
          >
            <el-icon><Search /></el-icon>
            查询
          </el-button>
          <el-button @click="handleReset">
            重置
          </el-button>
        </el-form-item>
      </el-form>
    </div>

    <!-- 操作栏 -->
    <div class="action-bar">
      <el-button
        type="primary"
        @click="openNewDialog"
      >
        <el-icon><Plus /></el-icon>
        新建设备
      </el-button>
      <div class="action-bar-right">
        <ColumnSettings
          v-model="columnConfigs"
          storage-key="equipment_list"
        />
      </div>
    </div>

    <!-- 表格 -->
    <div
      ref="tableContainerRef"
      class="card-wrapper"
    >
      <SkeletonScreen
        :loading="loading"
        :rows="5"
      >
        <el-table
          ref="tableRef"
          :data="pagedData"
          stripe
          style="width: 100%"
          @selection-change="handleSelectionChange"
          @header-dragend="handleHeaderDragEnd"
        >
          <el-table-column
            type="selection"
            width="55"
            align="center"
          />

          <el-table-column
            v-for="col in visibleColumns"
            :key="col.key"
            :column-key="col.key"
            :prop="col.prop"
            :label="col.label"
            :width="getColumnWidth(col)"
            :min-width="col.minWidth"
            show-overflow-tooltip
          >
            <template #default="{ row }">
              <template v-if="col.key === 'status'">
                <el-tag
                  :type="row.status === 'active' ? 'success' : 'info'"
                  size="small"
                >
                  {{ row.status === 'active' ? '启用' : '停用' }}
                </el-tag>
              </template>
              <template v-else-if="col.key === 'createdAt' || col.key === 'updatedAt'">
                {{ dayjs(row[col.key]).format('YYYY-MM-DD HH:mm') }}
              </template>
              <template v-else>
                {{ row[col.prop ?? col.key] }}
              </template>
            </template>
          </el-table-column>

          <el-table-column
            label="操作"
            width="220"
            fixed="right"
          >
            <template #default="{ row }">
              <div class="row-actions">
                <el-button
                  type="primary"
                  link
                  class="table-action-btn"
                  @click="handleEdit(row)"
                >
                  编辑
                </el-button>
                <el-button
                  type="danger"
                  link
                  class="table-action-btn danger"
                  @click="handleDelete(row)"
                >
                  删除
                </el-button>
                <el-button
                  type="warning"
                  link
                  class="table-action-btn"
                  @click="handleToggleStatus(row)"
                >
                  {{ row.status === 'active' ? '停用' : '启用' }}
                </el-button>
              </div>
            </template>
          </el-table-column>

          <template #empty>
            <EmptyState
              :variant="hasActiveSearch ? 'no-results' : 'empty'"
              :title="hasActiveSearch ? '没有找到匹配的数据' : '暂无设备数据'"
              :description="hasActiveSearch ? '请尝试调整搜索条件或筛选器' : '点击下方按钮创建设备'"
              :action-text="hasActiveSearch ? '' : '新建设备'"
              @action="openNewDialog"
            />
          </template>
        </el-table>
      </SkeletonScreen>

      <!-- 分页 -->
      <div class="pagination-wrapper">
        <span class="pagination-total">共 {{ filteredData.length }} 条</span>
        <div class="pagination-center">
          <el-pagination
            v-model:current-page="currentPage"
            v-model:page-size="pageSize"
            :page-sizes="[10, 20, 50, 100]"
            :total="filteredData.length"
            layout="sizes, prev, pager, next, jumper"
            background
            @current-change="handlePageChange"
          />
        </div>
        <span class="pagination-spacer" />
      </div>
    </div>

    <!-- 批量操作浮动栏 -->
    <BatchActionBar
      :visible="selectedRows.length > 0"
      :selected-count="selectedRows.length"
      :total-count="filteredData.length"
      :actions="batchActions"
      @action="handleBatchAction"
      @clear="clearSelection"
    />

    <!-- 新建设备弹窗 -->
    <el-dialog
      v-model="newDialogVisible"
      title="新建设备"
      width="500px"
      @closed="resetNewForm"
    >
      <el-form
        ref="newFormRef"
        :model="newForm"
        :rules="newFormRules"
        label-width="80px"
        class="dialog-form"
      >
        <el-form-item
          label="名称"
          prop="name"
        >
          <el-input
            v-model="newForm.name"
            placeholder="请输入设备名称"
            maxlength="100"
            show-word-limit
          />
        </el-form-item>
        <el-form-item
          label="型号"
          prop="model"
        >
          <el-input
            v-model="newForm.model"
            placeholder="请输入设备型号"
            maxlength="50"
            :class="{ 'input-error': newModelHasError }"
          />
          <div
            v-if="newModelHasError"
            class="error-tip"
          >
            {{ newModelError }}
          </div>
        </el-form-item>
        <el-form-item label="描述">
          <el-input
            v-model="newForm.description"
            type="textarea"
            :rows="3"
            placeholder="可选"
            maxlength="500"
            show-word-limit
          />
        </el-form-item>
        <el-form-item label="状态">
          <el-select
            v-model="newForm.status"
            style="width: 100%"
          >
            <el-option
              label="启用"
              value="active"
            />
            <el-option
              label="停用"
              value="inactive"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="newDialogVisible = false">
          取消
        </el-button>
        <el-button
          type="primary"
          @click="confirmCreate"
        >
          确定
        </el-button>
      </template>
    </el-dialog>

    <!-- 级联删除/引用保护对话框 -->
    <CascadeDeleteDialog
      v-model="cascadeDialogVisible"
      title="删除设备"
      :entity-name="cascadeTargets.length > 1 ? `选中的 ${cascadeTargets.length} 个设备` : (cascadeTargets[0]?.name || '')"
      :references="cascadeReferences"
      :options="cascadeOptions"
      :default-value="cascadeDefaultValue"
      :loading="cascadeLoading"
      @confirm="onCascadeConfirm"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted } from 'vue'
import { usePageSize } from '@/composables/usePageSize'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { Search, Plus, Download, Delete, SwitchButton } from '@element-plus/icons-vue'
import dayjs from 'dayjs'
import { useEquipmentStore } from '@/stores/equipment'
import type { Equipment } from '@/types'
import ColumnSettings from '@/components/common/ColumnSettings.vue'
import type { ColumnConfig } from '@/components/common/ColumnSettings.vue'
import AdvancedFilter from '@/components/common/AdvancedFilter.vue'
import type { FilterCondition, FilterField } from '@/components/common/AdvancedFilter.vue'
import BatchActionBar from '@/components/common/BatchActionBar.vue'
import type { BatchAction } from '@/components/common/BatchActionBar.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import SkeletonScreen from '@/components/common/SkeletonScreen.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import CascadeDeleteDialog, {
  type CascadeRefItem,
  type CascadeOption
} from '@/components/common/CascadeDeleteDialog.vue'
import { exportToExcel } from '@/utils/excel'

const router = useRouter()
const equipmentStore = useEquipmentStore()

// ===== 加载状态（骨架屏） =====
const loading = ref(true)
onMounted(() => {
  setTimeout(() => {
    loading.value = false
  }, 300)
})

// ===== 查询表单 =====
const searchForm = reactive({
  keyword: '',
  status: 'active' as '' | 'active' | 'inactive'
})

// ===== 高级筛选 =====
const filterConditions = ref<FilterCondition[]>([])
const filterLogic = ref<'AND' | 'OR'>('AND')
const filterFields: FilterField[] = [
  { key: 'name', label: '名称', type: 'text' },
  { key: 'model', label: '型号', type: 'text' },
  { key: 'description', label: '描述', type: 'text' },
  { key: 'status', label: '状态', type: 'select', options: ['active', 'inactive'] },
  { key: 'createdAt', label: '创建时间', type: 'date' },
  { key: 'updatedAt', label: '更新时间', type: 'date' }
]

function handleAdvancedFilter() {
  currentPage.value = 1
}

function handleAdvancedReset() {
  filterConditions.value = []
  filterLogic.value = 'AND'
  currentPage.value = 1
}

// ===== 列设置 =====
interface TableColumnConfig extends ColumnConfig {
  prop?: string
  minWidth?: number
}

const defaultColumns: TableColumnConfig[] = [
  { key: 'name', label: '名称', prop: 'name', visible: true, minWidth: 160 },
  { key: 'model', label: '型号', prop: 'model', visible: true, width: 140 },
  { key: 'description', label: '描述', prop: 'description', visible: true, minWidth: 220 },
  { key: 'status', label: '状态', visible: true, width: 100 },
  { key: 'createdAt', label: '创建时间', visible: true, width: 160 },
  { key: 'updatedAt', label: '更新时间', visible: true, width: 160 }
]

const columnConfigs = ref<TableColumnConfig[]>(defaultColumns.map((c) => ({ ...c })))

const visibleColumns = computed<TableColumnConfig[]>(() => {
  return columnConfigs.value.filter((c) => c.visible)
})

// ===== 列宽记忆 =====
const COL_WIDTH_KEY = 'bom_col_width_equipment_list'
const columnWidths = ref<Record<string, number>>({})

function loadColumnWidths() {
  try {
    const raw = localStorage.getItem(COL_WIDTH_KEY)
    if (raw) columnWidths.value = JSON.parse(raw)
  } catch {
    // ignore
  }
}

function saveColumnWidths() {
  try {
    localStorage.setItem(COL_WIDTH_KEY, JSON.stringify(columnWidths.value))
  } catch {
    // ignore
  }
}

function handleHeaderDragEnd(newWidth: number, _oldWidth: number, column: { columnKey?: string }) {
  if (column.columnKey) {
    columnWidths.value[column.columnKey] = newWidth
    saveColumnWidths()
  }
}

function getColumnWidth(col: TableColumnConfig): number | undefined {
  return columnWidths.value[col.key] ?? col.width
}

onMounted(() => {
  loadColumnWidths()
})

// ===== 分页 =====
const currentPage = ref(1)
const pageSize = usePageSize('equipment_list', 20)
const tableContainerRef = ref<HTMLElement | null>(null)

function handlePageChange(page: number) {
  currentPage.value = page
  tableContainerRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

// ===== 高级筛选求值 =====
const filterFieldTypeMap = computed(() => new Map(filterFields.map((f) => [f.key, f.type])))

function evalCondition(row: Record<string, unknown>, cond: FilterCondition): boolean {
  const fieldType = filterFieldTypeMap.value.get(cond.field) || 'text'
  const raw = row[cond.field]
  const strVal = String(raw ?? '')

  if (cond.operator === 'between') {
    const num = fieldType === 'date' ? dayjs(raw as string).valueOf() : Number(raw)
    return num >= (cond.valueMin ?? -Infinity) && num <= (cond.valueMax ?? Infinity)
  }

  if (fieldType === 'date') {
    const t1 = dayjs(raw as string).valueOf()
    const t2 = dayjs(String(cond.value)).valueOf()
    switch (cond.operator) {
      case '=':
        return dayjs(raw as string).format('YYYY-MM-DD') === String(cond.value)
      case '!=':
        return dayjs(raw as string).format('YYYY-MM-DD') !== String(cond.value)
      case '>':
        return t1 > t2
      case '<':
        return t1 < t2
      case '>=':
        return t1 >= t2
      case '<=':
        return t1 <= t2
    }
  }

  switch (cond.operator) {
    case '=':
      return strVal === String(cond.value)
    case '!=':
      return strVal !== String(cond.value)
    case 'contains':
      return strVal.toLowerCase().includes(String(cond.value).toLowerCase())
    case 'startsWith':
      return strVal.toLowerCase().startsWith(String(cond.value).toLowerCase())
    case '>':
      return Number(raw) > Number(cond.value)
    case '<':
      return Number(raw) < Number(cond.value)
    case '>=':
      return Number(raw) >= Number(cond.value)
    case '<=':
      return Number(raw) <= Number(cond.value)
    default:
      return true
  }
}

function applyAdvancedFilters(items: Equipment[]): Equipment[] {
  if (filterConditions.value.length === 0) return items
  return items.filter((item) => {
    const results = filterConditions.value.map((cond) => evalCondition(item as unknown as Record<string, unknown>, cond))
    return filterLogic.value === 'AND' ? results.every(Boolean) : results.some(Boolean)
  })
}

// ===== 过滤与分页 =====
const filteredData = computed<Equipment[]>(() => {
  let result = equipmentStore.equipments.filter((eq) => {
    if (searchForm.keyword) {
      const kw = searchForm.keyword.toLowerCase()
      if (!eq.name.toLowerCase().includes(kw) && !eq.model.toLowerCase().includes(kw)) {
        return false
      }
    }
    if (searchForm.status && eq.status !== searchForm.status) {
      return false
    }
    return true
  })
  result = applyAdvancedFilters(result)
  return result
})

const pagedData = computed<Equipment[]>(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filteredData.value.slice(start, start + pageSize.value)
})

const hasActiveSearch = computed(() => {
  return !!(searchForm.keyword || filterConditions.value.length > 0)
})

// ===== 查询操作 =====
function handleSearch() {
  currentPage.value = 1
}

function handleReset() {
  searchForm.keyword = ''
  searchForm.status = 'active'
  filterConditions.value = []
  filterLogic.value = 'AND'
  currentPage.value = 1
}

// ===== 行操作 =====
function handleEdit(row: Equipment) {
  router.push(`/equipment/${row.id}/edit`)
}

// ===== 删除（引用检查 + 级联选项对话框） =====
const cascadeDialogVisible = ref(false)
const cascadeLoading = ref(false)
const cascadeTargets = ref<{ id: string; name: string }[]>([])
const cascadeReferences = ref<CascadeRefItem[]>([])
const cascadeOptions = ref<CascadeOption[]>([])
const cascadeDefaultValue = ref('cascade')

function buildEquipmentCascadeOptions(refs: { configurationCount: number; moduleCount: number; projectCount: number }): CascadeOption[] {
  const hasRefs = refs.configurationCount > 0 || refs.moduleCount > 0 || refs.projectCount > 0
  if (!hasRefs) {
    return [{ value: 'direct', label: '直接删除', description: '设备无关联引用，将被物理删除。' }]
  }
  return [
    {
      value: 'cascade',
      label: '级联删除',
      type: 'danger',
      description: '删除设备及其全部配置、序列号；组件与项目解除设备关联（equipmentId 置空），数据保留。'
    },
    {
      value: 'unlink',
      label: '解除关联后删除',
      type: 'warning',
      description: '保留配置、序列号、组件、项目，仅将其 equipmentId 置空，设备本体被删除。'
    }
  ]
}

function openCascadeDialog(targets: { id: string; name: string }[]) {
  cascadeTargets.value = targets
  // 以第一个目标统计引用（批量删除时逐个处理）
  const firstRefs = equipmentStore.getEquipmentReferences(targets[0].id)
  cascadeReferences.value = [
    { label: '配置', count: firstRefs.configurationCount },
    { label: '序列号', count: firstRefs.serialCount },
    { label: '组件', count: firstRefs.moduleCount },
    { label: '项目', count: firstRefs.projectCount }
  ]
  cascadeOptions.value = buildEquipmentCascadeOptions(firstRefs)
  cascadeDefaultValue.value = firstRefs.configurationCount + firstRefs.moduleCount + firstRefs.projectCount > 0
    ? 'cascade'
    : 'direct'
  cascadeDialogVisible.value = true
}

async function onCascadeConfirm(action: string) {
  cascadeLoading.value = true
  try {
    for (const t of cascadeTargets.value) {
      const refs = equipmentStore.getEquipmentReferences(t.id)
      const hasRefs = refs.configurationCount + refs.moduleCount + refs.projectCount > 0
      const mode = !hasRefs ? 'direct' : (action as 'cascade' | 'unlink')
      await equipmentStore.deleteEquipment(t.id, mode)
    }
    ElMessage.success(cascadeTargets.value.length > 1
      ? `成功删除 ${cascadeTargets.value.length} 个设备`
      : '设备已删除')
    cascadeDialogVisible.value = false
    clearSelection()
    if (pagedData.value.length === 0 && currentPage.value > 1) {
      currentPage.value--
    }
  } finally {
    cascadeLoading.value = false
  }
}

async function handleDelete(row: Equipment) {
  openCascadeDialog([{ id: row.id, name: row.name }])
}

function handleToggleStatus(row: Equipment) {
  const newStatus: 'active' | 'inactive' = row.status === 'active' ? 'inactive' : 'active'
  equipmentStore.updateEquipment(row.id, { status: newStatus })
  ElMessage.success(newStatus === 'active' ? '已启用' : '已停用')
}

// ===== 批量操作 =====
const selectedRows = ref<Equipment[]>([])
const tableRef = ref<{ clearSelection: () => void; toggleAllSelection: () => void } | null>(null)

const batchActions: BatchAction[] = [
  { key: 'export', label: '批量导出', type: 'primary', icon: 'Download' },
  { key: 'enable', label: '批量启用', type: 'success', icon: 'SwitchButton' },
  { key: 'disable', label: '批量停用', type: 'warning', icon: 'SwitchButton' },
  { key: 'delete', label: '批量删除', type: 'danger', icon: 'Delete' }
]

function handleSelectionChange(selection: Equipment[]) {
  selectedRows.value = selection
}

function clearSelection() {
  selectedRows.value = []
  tableRef.value?.clearSelection()
}

async function handleBatchAction(key: string) {
  switch (key) {
    case 'export':
      handleBatchExport()
      break
    case 'enable':
      await handleBatchToggleStatus('active')
      break
    case 'disable':
      await handleBatchToggleStatus('inactive')
      break
    case 'delete':
      await handleBatchDelete()
      break
  }
}

function handleBatchExport() {
  const data = selectedRows.value.map((eq, idx) => ({
    序号: idx + 1,
    名称: eq.name,
    型号: eq.model,
    描述: eq.description || '',
    状态: eq.status === 'active' ? '启用' : '停用',
    创建时间: dayjs(eq.createdAt).format('YYYY-MM-DD HH:mm'),
    更新时间: dayjs(eq.updatedAt).format('YYYY-MM-DD HH:mm')
  }))
  exportToExcel(data, `设备批量导出_${dayjs().format('YYYYMMDD_HHmmss')}`, '设备列表')
  ElMessage.success(`已导出 ${selectedRows.value.length} 个设备`)
}

async function handleBatchToggleStatus(status: 'active' | 'inactive') {
  try {
    await ElMessageBox.confirm(
      `确定将选中的 ${selectedRows.value.length} 个设备${status === 'active' ? '启用' : '停用'}吗？`,
      '批量操作确认',
      { type: 'warning', confirmButtonText: '确定', cancelButtonText: '取消' }
    )
    for (const eq of selectedRows.value) {
      equipmentStore.updateEquipment(eq.id, { status })
    }
    ElMessage.success(`已${status === 'active' ? '启用' : '停用'} ${selectedRows.value.length} 个设备`)
    clearSelection()
  } catch {
    // 用户取消
  }
}

async function handleBatchDelete() {
  if (selectedRows.value.length === 0) return
  openCascadeDialog(selectedRows.value.map((eq) => ({ id: eq.id, name: eq.name })))
}

// ===== 新建弹窗 =====
const newDialogVisible = ref(false)
const newFormRef = ref<FormInstance>()
const newForm = reactive({
  name: '',
  model: '',
  description: '',
  status: 'active' as 'active' | 'inactive'
})

const newFormRules: FormRules = {
  name: [{ required: true, message: '请输入设备名称', trigger: 'blur' }],
  model: [{ required: true, message: '请输入设备型号', trigger: 'blur' }]
}

// 新建设备时的机型唯一性校验
const newModelHasError = computed(() => {
  if (!newForm.model.trim()) return false
  return !equipmentStore.isModelUnique(newForm.model.trim())
})
const newModelError = computed(() => {
  if (!newModelHasError.value) return ''
  return `设备型号「${newForm.model.trim()}」已存在，型号必须唯一`
})

function openNewDialog() {
  newForm.name = ''
  newForm.model = ''
  newForm.description = ''
  newForm.status = 'active'
  newDialogVisible.value = true
}

function resetNewForm() {
  newFormRef.value?.clearValidate()
}

async function confirmCreate() {
  if (!newFormRef.value) return
  try {
    await newFormRef.value.validate()
  } catch {
    return
  }
  // 机型唯一性校验
  if (!equipmentStore.isModelUnique(newForm.model.trim())) {
    ElMessage.error(`设备型号「${newForm.model.trim()}」已存在，型号必须唯一`)
    return
  }
  try {
    await equipmentStore.addEquipment({
      name: newForm.name,
      model: newForm.model.trim(),
      description: newForm.description || undefined,
      status: newForm.status
    })
    newDialogVisible.value = false
    ElMessage.success('创建设备成功')
  } catch (err) {
    const msg = err instanceof Error ? err.message : '创建设备失败'
    ElMessage.error(msg)
  }
}
</script>

<style scoped>
.input-error {
  :deep(.el-input__wrapper) {
    box-shadow: 0 0 0 1px #f56c6c inset;
  }
}
.error-tip {
  color: #f56c6c;
  font-size: 12px;
  line-height: 1.5;
  margin-top: 4px;
}
.action-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}
.action-bar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}
.pagination-wrapper {
  display: flex;
  align-items: center;
  margin-top: 16px;
}
.pagination-total {
  width: 100px;
  color: var(--text-secondary, #909399);
  font-size: 13px;
  flex-shrink: 0;
}
.pagination-center {
  flex: 1;
  display: flex;
  justify-content: center;
}
.pagination-spacer {
  width: 100px;
  flex-shrink: 0;
}
.row-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}
.table-action-btn {
  opacity: 0.45;
  transition: opacity var(--transition-fast, 0.15s ease);
}
:deep(.el-table__row:hover) .table-action-btn {
  opacity: 1;
}
</style>
