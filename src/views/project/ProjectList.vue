<template>
  <div class="page-container">
    <PageBreadcrumb />
    <!-- 搜索栏 -->
    <div class="card-wrapper">
      <el-form
        :inline="true"
        :model="searchForm"
        class="search-bar"
        label-position="right"
      >
        <el-form-item label="名称/JOB号">
          <el-input
            v-model="searchForm.keyword"
            placeholder="输入项目名称或JOB号"
            clearable
            style="width: 220px"
            @keyup.enter="handleSearch"
          />
        </el-form-item>
        <el-form-item label="客户">
          <el-input
            v-model="searchForm.customer"
            placeholder="输入客户名称"
            clearable
            style="width: 180px"
            @keyup.enter="handleSearch"
          />
        </el-form-item>
        <el-form-item label="状态">
          <el-select
            v-model="searchForm.status"
            placeholder="全部状态"
            clearable
            style="width: 140px"
          >
            <el-option
              label="进行中"
              value="ongoing"
            />
            <el-option
              label="已完成"
              value="completed"
            />
            <el-option
              label="已取消"
              value="cancelled"
            />
            <el-option
              label="已暂停"
              value="paused"
            />
          </el-select>
        </el-form-item>
        <el-form-item>
          <AdvancedFilter
            v-model="filterConditions"
            v-model:logic="filterLogic"
            :fields="filterFields"
            storage-key="project_list"
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

    <!-- 操作栏 + 表格 -->
    <div
      ref="tableContainerRef"
      class="card-wrapper"
    >
      <div class="action-bar">
        <div class="action-bar-left">
          <el-button
            type="primary"
            @click="router.push('/project/new')"
          >
            <el-icon><Plus /></el-icon>
            新建项目
          </el-button>
          <el-button
            type="success"
            @click="openBatchImportDialog"
          >
            <el-icon><UploadFilled /></el-icon>
            批量导入
          </el-button>
        </div>
        <div class="action-bar-right">
          <ColumnSettings
            v-model="columnConfigs"
            storage-key="project_list"
          />
        </div>
      </div>

      <SkeletonScreen
        :loading="loading"
        :rows="5"
      >
        <el-table
          ref="tableRef"
          :data="pagedProjects"
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
              <template v-if="col.key === 'jobNo'">
                <span
                  class="job-no-cell"
                  @click="copyJobNo(row.jobNo)"
                >
                  {{ row.jobNo }}
                  <el-icon class="copy-icon"><CopyDocument /></el-icon>
                </span>
              </template>
              <template v-else-if="col.key === 'status'">
                <el-tag
                  :type="statusTagType(row.status)"
                  size="small"
                >
                  {{ statusLabel(row.status) }}
                </el-tag>
              </template>
              <template v-else-if="col.key === 'equipmentName'">
                {{ getEquipmentName(row.equipmentId) }}
              </template>
              <template v-else-if="col.key === 'serialNumber'">
                {{ getProjectSerial(row.id, row.equipmentId) }}
              </template>
              <template v-else-if="col.key === 'projectType'">
                {{ getProjectTypeName(row.projectTypeId) }}
              </template>
              <template v-else-if="col.key === 'createdAt'">
                {{ dayjs(row.createdAt).format('YYYY-MM-DD HH:mm') }}
              </template>
              <template v-else>
                {{ row[col.prop ?? col.key] }}
              </template>
            </template>
          </el-table-column>

          <el-table-column
            label="操作"
            width="160"
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
                  type="primary"
                  link
                  class="table-action-btn"
                  @click="handleView(row)"
                >
                  查看
                </el-button>
                <el-button
                  type="danger"
                  link
                  class="table-action-btn danger"
                  @click="handleDelete(row)"
                >
                  删除
                </el-button>
              </div>
            </template>
          </el-table-column>

          <template #empty>
            <EmptyState
              :variant="hasActiveSearch ? 'no-results' : 'empty'"
              :title="hasActiveSearch ? '没有找到匹配的数据' : '暂无项目数据'"
              :description="hasActiveSearch ? '请尝试调整搜索条件或筛选器' : '点击下方按钮创建项目'"
              :action-text="hasActiveSearch ? '' : '新建项目'"
              @action="router.push('/project/new')"
            />
          </template>
        </el-table>
      </SkeletonScreen>

      <!-- 分页 -->
      <div class="pagination-wrapper">
        <span class="pagination-total">共 {{ filteredProjects.length }} 条</span>
        <div class="pagination-center">
          <el-pagination
            v-model:current-page="currentPage"
            v-model:page-size="pageSize"
            :page-sizes="[10, 20, 50, 100]"
            :total="filteredProjects.length"
            layout="sizes, prev, pager, next, jumper"
            background
            @size-change="handleSizeChange"
            @current-change="handleCurrentChange"
          />
        </div>
        <span class="pagination-spacer" />
      </div>
    </div>

    <!-- 批量导入对话框 -->
    <el-dialog
      v-model="batchImportDialogVisible"
      title="批量导入项目"
      width="700px"
      :close-on-click-modal="false"
      @close="resetBatchImport"
    >
      <el-steps
        :active="batchImportStep"
        finish-status="success"
        align-center
      >
        <el-step title="下载模板" />
        <el-step title="上传文件" />
        <el-step title="校验结果" />
        <el-step title="导入完成" />
      </el-steps>

      <div class="batch-import-content">
        <!-- 第一步：下载模板 -->
        <div v-if="batchImportStep === 0">
          <el-alert
            type="info"
            :closable="false"
            show-icon
            title="请先下载模板，按模板格式填写项目信息和客户需求"
            class="batch-import-alert"
          />
          <div class="batch-import-template-info">
            <p><strong>模板包含两个Sheet：</strong></p>
            <ul>
              <li><strong>项目信息</strong>：JOB号、项目名称、客户、设备型号、配置等基本信息</li>
              <li><strong>客户需求</strong>：JOB号关联，需求内容（可选，支持多条）</li>
            </ul>
            <p><strong>更新模式：</strong>如果JOB号已存在，将更新该项目的基本信息和客户需求（保留已有的模块选择和下单BOM）</p>
          </div>
          <el-button
            type="primary"
            @click="downloadProjectTemplate"
          >
            <el-icon><Download /></el-icon>
            下载导入模板
          </el-button>
        </div>

        <!-- 第二步：上传文件 -->
        <div v-else-if="batchImportStep === 1">
          <el-upload
            ref="batchImportUploadRef"
            class="batch-import-upload"
            drag
            :auto-upload="false"
            :limit="1"
            accept=".xlsx,.xls"
            :on-change="handleImportFileChange"
            :on-remove="handleImportFileRemove"
          >
            <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
            <div class="el-upload__text">
              将Excel文件拖到此处，或<em>点击上传</em>
            </div>
            <template #tip>
              <div class="el-upload__tip">
                支持 .xlsx / .xls 格式，文件大小不超过 10MB
              </div>
            </template>
          </el-upload>
          <div v-if="batchImportFileName" class="batch-import-file-name">
            已选择文件：{{ batchImportFileName }}
          </div>
        </div>

        <!-- 第三步：校验结果 -->
        <div v-else-if="batchImportStep === 2">
          <div v-if="batchImportErrors.length > 0">
            <el-alert
              type="error"
              :closable="false"
              show-icon
              :title="`校验失败，共 ${batchImportErrors.length} 个错误`"
              class="batch-import-alert"
            />
            <el-table
              :data="batchImportErrors"
              max-height="300"
              border
              size="small"
            >
              <el-table-column
                prop="sheet"
                label="Sheet"
                width="100"
              />
              <el-table-column
                prop="rowIndex"
                label="行号"
                width="80"
              />
              <el-table-column
                prop="field"
                label="字段"
                width="120"
              />
              <el-table-column
                prop="message"
                label="错误描述"
              />
            </el-table>
          </div>
          <div v-else>
            <el-alert
              type="success"
              :closable="false"
              show-icon
              title="校验通过"
              class="batch-import-alert"
            />
            <div class="batch-import-preview">
              <p><strong>预览统计：</strong></p>
              <ul>
                <li>项目数量：{{ batchImportValidated.projects.length }} 个</li>
                <li>客户需求：{{ batchImportValidated.requirements.length }} 条</li>
                <li>新建项目：{{ batchImportNewCount }} 个</li>
                <li>更新项目：{{ batchImportUpdateCount }} 个</li>
              </ul>
            </div>
            <el-table
              :data="batchImportValidated.projects.slice(0, 5)"
              max-height="200"
              border
              size="small"
            >
              <el-table-column
                prop="jobNo"
                label="JOB号"
                width="150"
              />
              <el-table-column
                prop="name"
                label="项目名称"
              />
              <el-table-column
                prop="equipmentModel"
                label="设备型号"
                width="120"
              />
              <el-table-column
                label="操作"
                width="100"
              >
                <template #default="{ row }">
                  <el-tag
                    :type="isExistingProject(row.jobNo) ? 'warning' : 'success'"
                    size="small"
                  >
                    {{ isExistingProject(row.jobNo) ? '更新' : '新建' }}
                  </el-tag>
                </template>
              </el-table-column>
            </el-table>
            <div v-if="batchImportValidated.projects.length > 5" class="batch-import-more">
              ...还有 {{ batchImportValidated.projects.length - 5 }} 个项目
            </div>
          </div>
        </div>

        <!-- 第四步：导入完成 -->
        <div v-else-if="batchImportStep === 3">
          <el-result
            icon="success"
            title="导入完成"
            :sub-title="`新建 ${batchImportResult.created} 个，更新 ${batchImportResult.updated} 个，跳过 ${batchImportResult.skipped} 个`"
          />
          <div v-if="batchImportResult.errors.length > 0" class="batch-import-errors">
            <el-alert
              type="warning"
              :closable="false"
              show-icon
              title="部分项目导入失败"
              class="batch-import-alert"
            />
            <ul>
              <li v-for="(error, idx) in batchImportResult.errors" :key="idx">
                {{ error }}
              </li>
            </ul>
          </div>
        </div>
      </div>

      <template #footer>
        <div class="batch-import-footer">
          <el-button @click="batchImportDialogVisible = false">
            取消
          </el-button>
          <el-button
            v-if="batchImportStep === 0"
            type="primary"
            @click="batchImportStep = 1"
          >
            下一步
          </el-button>
          <el-button
            v-if="batchImportStep === 1"
            @click="batchImportStep = 0"
          >
            上一步
          </el-button>
          <el-button
            v-if="batchImportStep === 1"
            type="primary"
            :disabled="!batchImportFile"
            :loading="batchImportValidating"
            @click="validateImportFile"
          >
            开始校验
          </el-button>
          <el-button
            v-if="batchImportStep === 2 && batchImportErrors.length === 0"
            type="primary"
            :loading="batchImportExecuting"
            @click="executeImport"
          >
            确认导入
          </el-button>
          <el-button
            v-if="batchImportStep === 3"
            type="primary"
            @click="finishBatchImport"
          >
            完成
          </el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 批量操作浮动栏 -->
    <BatchActionBar
      :visible="selectedRows.length > 0"
      :selected-count="selectedRows.length"
      :total-count="filteredProjects.length"
      :actions="batchActions"
      @action="handleBatchAction"
      @clear="clearSelection"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { usePageSize } from '@/composables/usePageSize'
import { useDebounceRef } from '@/composables/useDebounce'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Plus, Download, Delete, CopyDocument, Upload, UploadFilled } from '@element-plus/icons-vue'
import dayjs from 'dayjs'
import { useProjectsStore } from '@/stores/projects'
import { useEquipmentStore } from '@/stores/equipment'
import { useProjectTypesStore } from '@/stores/projectTypes'
import type { Project } from '@/types'
import ColumnSettings from '@/components/common/ColumnSettings.vue'
import type { ColumnConfig } from '@/components/common/ColumnSettings.vue'
import AdvancedFilter from '@/components/common/AdvancedFilter.vue'
import type { FilterCondition, FilterField } from '@/components/common/AdvancedFilter.vue'
import BatchActionBar from '@/components/common/BatchActionBar.vue'
import type { BatchAction } from '@/components/common/BatchActionBar.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import SkeletonScreen from '@/components/common/SkeletonScreen.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import { exportToExcel } from '@/utils/excel'
import {
  downloadProjectTemplate,
  parseProjectImportFile,
  validateProjectImportData,
  executeProjectImport,
  type ValidationResult,
  type ImportResult,
  type ImportError,
  type ProjectImportStores
} from '@/utils/projectBatchImport'

const router = useRouter()
const projectsStore = useProjectsStore()
const equipmentStore = useEquipmentStore()
const projectTypesStore = useProjectTypesStore()

// ===== 加载状态（骨架屏） =====
const loading = ref(true)
onMounted(() => {
  setTimeout(() => {
    loading.value = false
  }, 300)
})

// 搜索表单
const searchForm = ref({
  keyword: '',
  customer: '',
  status: '' as '' | Project['status']
})

// 搜索关键词防抖（300ms）
const debouncedKeyword = useDebounceRef(computed(() => searchForm.value.keyword), 300)

// ===== 高级筛选 =====
const filterConditions = ref<FilterCondition[]>([])
const filterLogic = ref<'AND' | 'OR'>('AND')
const filterFields: FilterField[] = [
  { key: 'name', label: '项目名称', type: 'text' },
  { key: 'jobNo', label: 'JOB号', type: 'text' },
  { key: 'customer', label: '客户', type: 'text' },
  { key: 'customerLocation', label: '客户所在地', type: 'text' },
  { key: 'status', label: '状态', type: 'select', options: ['ongoing', 'completed', 'cancelled', 'paused'] },
  { key: 'createdAt', label: '创建时间', type: 'date' }
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
  { key: 'name', label: '项目名称', prop: 'name', visible: true, minWidth: 180 },
  { key: 'jobNo', label: 'JOB号', prop: 'jobNo', visible: true, width: 160 },
  { key: 'customer', label: '客户', prop: 'customer', visible: true, width: 160 },
  { key: 'customerLocation', label: '客户所在地', prop: 'customerLocation', visible: true, width: 140 },
  { key: 'status', label: '状态', visible: true, width: 100 },
  { key: 'equipmentName', label: '机型名称', visible: true, width: 140 },
  { key: 'serialNumber', label: '序列号', visible: true, width: 160 },
  { key: 'projectType', label: '项目类型', visible: true, width: 100 },
  { key: 'createdAt', label: '创建时间', visible: true, width: 170 }
]

const columnConfigs = ref<TableColumnConfig[]>(defaultColumns.map((c) => ({ ...c })))

const visibleColumns = computed<TableColumnConfig[]>(() => {
  return columnConfigs.value.filter((c) => c.visible)
})

// ===== 列宽记忆 =====
const COL_WIDTH_KEY = 'bom_col_width_project_list'
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

// 分页
const currentPage = ref(1)
const pageSize = usePageSize('project_list', 20)
const tableContainerRef = ref<HTMLElement | null>(null)

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

function applyAdvancedFilters(items: Project[]): Project[] {
  if (filterConditions.value.length === 0) return items
  return items.filter((item) => {
    const results = filterConditions.value.map((cond) => evalCondition(item as unknown as Record<string, unknown>, cond))
    return filterLogic.value === 'AND' ? results.every(Boolean) : results.some(Boolean)
  })
}

// 过滤后的项目列表
const filteredProjects = computed(() => {
  let result = projectsStore.projects.filter((p) => {
    // 名称/JOB号模糊搜索（使用防抖后的关键词）
    if (debouncedKeyword.value) {
      const kw = debouncedKeyword.value.toLowerCase()
      const matchName = p.name.toLowerCase().includes(kw)
      const matchJobNo = p.jobNo.toLowerCase().includes(kw)
      if (!matchName && !matchJobNo) return false
    }
    // 客户搜索
    if (searchForm.value.customer) {
      if (!p.customer?.toLowerCase().includes(searchForm.value.customer.toLowerCase())) return false
    }
    // 状态筛选
    if (searchForm.value.status) {
      if (p.status !== searchForm.value.status) return false
    }
    return true
  })
  result = applyAdvancedFilters(result)
  return result
})

// 分页后的列表
const pagedProjects = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filteredProjects.value.slice(start, start + pageSize.value)
})

const hasActiveSearch = computed(() => {
  return !!(
    searchForm.value.keyword ||
    searchForm.value.customer ||
    searchForm.value.status ||
    filterConditions.value.length > 0
  )
})

// 状态标签映射
function statusTagType(status: Project['status']) {
  const map: Record<Project['status'], 'primary' | 'success' | 'info' | 'warning'> = {
    ongoing: 'primary',
    completed: 'success',
    cancelled: 'info',
    paused: 'warning'
  }
  return map[status]
}

function statusLabel(status: Project['status']) {
  const map: Record<Project['status'], string> = {
    ongoing: '进行中',
    completed: '已完成',
    cancelled: '已取消',
    paused: '已暂停'
  }
  return map[status]
}

// 获取机型名称
function getEquipmentName(equipmentId: string): string {
  return equipmentStore.getEquipmentById(equipmentId)?.name || '—'
}

// 获取项目在设备上分配的序列号
function getProjectSerial(projectId: string, equipmentId: string): string {
  if (!equipmentId) return '—'
  const serial = equipmentStore.getAssignedSerialByProject(equipmentId, projectId)
  return serial ? serial.serialNumber : '—'
}

// 获取项目类型名称
function getProjectTypeName(typeId?: string): string {
  if (!typeId) return '—'
  return projectTypesStore.projectTypes.find((t) => t.id === typeId)?.name || '—'
}

// 复制JOB号
function copyJobNo(jobNo: string) {
  navigator.clipboard.writeText(jobNo).then(() => {
    ElMessage.success(`已复制 JOB号: ${jobNo}`)
  }).catch(() => {
    // fallback
    const textarea = document.createElement('textarea')
    textarea.value = jobNo
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    document.body.removeChild(textarea)
    ElMessage.success(`已复制 JOB号: ${jobNo}`)
  })
}

// 搜索
function handleSearch() {
  currentPage.value = 1
}

// 重置
function handleReset() {
  searchForm.value = { keyword: '', customer: '', status: '' }
  filterConditions.value = []
  filterLogic.value = 'AND'
  currentPage.value = 1
}

// 分页变化
function handleSizeChange(size: number) {
  pageSize.value = size
  currentPage.value = 1
}

function handleCurrentChange(page: number) {
  currentPage.value = page
  tableContainerRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

// 编辑
function handleEdit(row: Project) {
  router.push(`/project/${row.id}/edit`)
}

// 查看（同编辑）
function handleView(row: Project) {
  router.push(`/project/${row.id}/edit`)
}

// 删除
function handleDelete(row: Project) {
  ElMessageBox.confirm(`确定要删除项目"${row.name}"吗？此操作不可恢复。`, '确认删除', {
    confirmButtonText: '确定删除',
    cancelButtonText: '取消',
    type: 'warning'
  })
    .then(() => {
      projectsStore.deleteProject(row.id)
      ElMessage.success('删除成功')
      // 如果当前页删空了，回退一页
      if (pagedProjects.value.length === 0 && currentPage.value > 1) {
        currentPage.value--
      }
    })
    .catch(() => {})
}

// ===== 批量操作 =====
const selectedRows = ref<Project[]>([])
const tableRef = ref<{ clearSelection: () => void; toggleAllSelection: () => void } | null>(null)

const batchActions: BatchAction[] = [
  { key: 'export', label: '批量导出', type: 'primary', icon: 'Download' },
  { key: 'delete', label: '批量删除', type: 'danger', icon: 'Delete' }
]

function handleSelectionChange(selection: Project[]) {
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
    case 'delete':
      await handleBatchDelete()
      break
  }
}

function handleBatchExport() {
  const data = selectedRows.value.map((p, idx) => ({
    序号: idx + 1,
    项目名称: p.name,
    JOB号: p.jobNo,
    客户: p.customer || '',
    客户所在地: p.customerLocation || '',
    状态: statusLabel(p.status),
    机型名称: getEquipmentName(p.equipmentId),
    序列号: getProjectSerial(p.id, p.equipmentId),
    项目类型: getProjectTypeName(p.projectTypeId),
    创建时间: dayjs(p.createdAt).format('YYYY-MM-DD HH:mm')
  }))
  exportToExcel(data, `项目批量导出_${dayjs().format('YYYYMMDD_HHmmss')}`, '项目列表')
  ElMessage.success(`已导出 ${selectedRows.value.length} 个项目`)
}

async function handleBatchDelete() {
  try {
    await ElMessageBox.confirm(
      `确定删除选中的 ${selectedRows.value.length} 个项目吗？此操作不可恢复。`,
      '批量删除确认',
      { type: 'warning', confirmButtonText: '确定删除', cancelButtonText: '取消' }
    )
    for (const p of selectedRows.value) {
      projectsStore.deleteProject(p.id)
    }
    ElMessage.success(`成功删除 ${selectedRows.value.length} 个项目`)
    clearSelection()
    if (pagedProjects.value.length === 0 && currentPage.value > 1) {
      currentPage.value--
    }
  } catch {
    // 用户取消
  }
}

// ===== 批量导入 =====
const batchImportDialogVisible = ref(false)
const batchImportStep = ref(0)
const batchImportFile = ref<File | null>(null)
const batchImportFileName = ref('')
const batchImportUploadRef = ref()
const batchImportValidating = ref(false)
const batchImportExecuting = ref(false)
const batchImportErrors = ref<ImportError[]>([])
const batchImportValidated = ref<ValidationResult>({ valid: true, errors: [], projects: [], requirements: [] })
const batchImportResult = ref<ImportResult>({ created: 0, updated: 0, skipped: 0, errors: [] })

const batchImportNewCount = computed(() => {
  return batchImportValidated.value.projects.filter((p) => !isExistingProject(p.jobNo)).length
})

const batchImportUpdateCount = computed(() => {
  return batchImportValidated.value.projects.filter((p) => isExistingProject(p.jobNo)).length
})

function openBatchImportDialog() {
  batchImportDialogVisible.value = true
  batchImportStep.value = 0
}

function resetBatchImport() {
  batchImportStep.value = 0
  batchImportFile.value = null
  batchImportFileName.value = ''
  batchImportErrors.value = []
  batchImportValidated.value = { valid: true, errors: [], projects: [], requirements: [] }
  batchImportResult.value = { created: 0, updated: 0, skipped: 0, errors: [] }
}

function isExistingProject(jobNo: string): boolean {
  return projectsStore.projects.some((p) => p.jobNo === jobNo)
}

function handleImportFileChange(file: any) {
  batchImportFile.value = file.raw
  batchImportFileName.value = file.name
}

function handleImportFileRemove() {
  batchImportFile.value = null
  batchImportFileName.value = ''
}

async function validateImportFile() {
  if (!batchImportFile.value) {
    ElMessage.warning('请先选择文件')
    return
  }

  batchImportValidating.value = true
  try {
    // 解析文件
    const { projects, requirements } = await parseProjectImportFile(batchImportFile.value)

    // 构建Store接口
    const stores: ProjectImportStores = {
      equipments: equipmentStore.equipments,
      configurations: equipmentStore.configurations,
      projectTypes: projectTypesStore.projectTypes,
      existingProjects: projectsStore.projects,
      createProject: (data) => projectsStore.addProject(data as any),
      updateProject: (id, data) => projectsStore.updateProject(id, data as any),
      generateId: (prefix) => `${prefix || 'id'}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    }

    // 校验数据
    const result = validateProjectImportData(projects, requirements, stores)
    batchImportValidated.value = result
    batchImportErrors.value = result.errors

    if (result.valid) {
      ElMessage.success(`校验通过，共 ${result.projects.length} 个项目，${result.requirements.length} 条客户需求`)
    } else {
      ElMessage.error(`校验失败，共 ${result.errors.length} 个错误`)
    }

    batchImportStep.value = 2
  } catch (err) {
    ElMessage.error(`文件解析失败：${err instanceof Error ? err.message : String(err)}`)
  } finally {
    batchImportValidating.value = false
  }
}

async function executeImport() {
  batchImportExecuting.value = true
  try {
    // 构建Store接口
    const stores: ProjectImportStores = {
      equipments: equipmentStore.equipments,
      configurations: equipmentStore.configurations,
      projectTypes: projectTypesStore.projectTypes,
      existingProjects: projectsStore.projects,
      createProject: (data) => projectsStore.addProject(data as any),
      updateProject: (id, data) => projectsStore.updateProject(id, data as any),
      generateId: (prefix) => `${prefix || 'id'}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    }

    // 执行导入
    const result = await executeProjectImport(batchImportValidated.value, stores)
    batchImportResult.value = result

    ElMessage.success(`导入完成：新建 ${result.created} 个，更新 ${result.updated} 个`)
    batchImportStep.value = 3
  } catch (err) {
    ElMessage.error(`导入失败：${err instanceof Error ? err.message : String(err)}`)
  } finally {
    batchImportExecuting.value = false
  }
}

function finishBatchImport() {
  batchImportDialogVisible.value = false
  resetBatchImport()
}
</script>

<style scoped>
.action-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}
.action-bar-left {
  display: flex;
  align-items: center;
  gap: 8px;
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
.job-no-cell {
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--color-primary, #409eff);
}
.job-no-cell:hover {
  text-decoration: underline;
}
.copy-icon {
  font-size: 12px;
  opacity: 0.6;
}

/* 批量导入 */
.batch-import-content {
  padding: 20px 0;
  min-height: 300px;
}
.batch-import-alert {
  margin-bottom: 16px;
}
.batch-import-template-info {
  margin: 16px 0;
  padding: 16px;
  background: var(--fill-color-light, #f5f7fa);
  border-radius: 4px;
}
.batch-import-template-info p {
  margin: 8px 0;
}
.batch-import-template-info ul {
  margin: 8px 0;
  padding-left: 20px;
}
.batch-import-template-info li {
  margin: 4px 0;
}
.batch-import-upload {
  margin: 20px 0;
}
.batch-import-file-name {
  margin-top: 12px;
  padding: 8px 12px;
  background: var(--color-primary-light-9, #ecf5ff);
  border-radius: 4px;
  color: var(--color-primary, #409eff);
  font-size: 13px;
}
.batch-import-preview {
  margin: 16px 0;
}
.batch-import-preview ul {
  margin: 8px 0;
  padding-left: 20px;
}
.batch-import-preview li {
  margin: 4px 0;
}
.batch-import-more {
  text-align: center;
  color: var(--text-secondary, #909399);
  font-size: 13px;
  margin-top: 8px;
}
.batch-import-errors {
  margin-top: 16px;
}
.batch-import-errors ul {
  margin: 12px 0;
  padding-left: 20px;
}
.batch-import-errors li {
  margin: 4px 0;
  color: var(--color-warning, #e6a23c);
  font-size: 13px;
}
.batch-import-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
