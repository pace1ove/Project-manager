<template>
  <div class="bom-template-header">
    <p class="description-text">
      设置BOM条目的字段，可自由新增、编辑、删除字段，拖拽行或使用上下按钮调整显示顺序
    </p>
    <!-- 数据迁移状态 -->
    <div
      v-if="bomTemplatesStore.migrationState.active || bomTemplatesStore.migrationState.message"
      class="migration-status"
    >
      <el-progress
        v-if="bomTemplatesStore.migrationState.active"
        :percentage="bomTemplatesStore.migrationState.percent"
        :stroke-width="14"
        :text-inside="true"
        status="success"
        style="max-width: 360px;"
      />
      <el-text
        :type="bomTemplatesStore.migrationState.active ? 'primary' : 'success'"
        size="small"
      >
        {{ bomTemplatesStore.migrationState.message }}
      </el-text>
    </div>
    <div class="action-bar">
      <el-radio-group
        v-model="selectedTemplateType"
        size="default"
        style="margin-right: 12px"
      >
        <el-radio-button value="module">
          组件BOM模板
        </el-radio-button>
        <el-radio-button value="order">
          下单BOM模板
        </el-radio-button>
        <el-radio-button value="import">
          批量导入模板
        </el-radio-button>
      </el-radio-group>
      <el-input
        v-model="fieldSearchKeyword"
        placeholder="搜索字段Key/标签..."
        clearable
        prefix-icon="Search"
        style="width: 200px; margin-right: 12px"
      />
      <el-button
        type="primary"
        @click="openFieldDialog()"
      >
        <el-icon style="margin-right: 4px">
          <Plus />
        </el-icon>
        新增字段
      </el-button>
      <el-button @click="handleResetTemplate">
        <el-icon style="margin-right: 4px">
          <RefreshLeft />
        </el-icon>
        恢复默认
      </el-button>
      <el-button
        type="success"
        :loading="scanLoading"
        @click="handleScanFields"
      >
        <el-icon style="margin-right: 4px">
          <Search />
        </el-icon>
        扫描现有数据
      </el-button>
    </div>
  </div>
  <el-table
    :data="filteredFields"
    stripe
    style="width: 100%"
    row-key="id"
    @row-drag-start="onFieldDragStart"
    @row-drag-over="onFieldDragOver"
    @row-drop="onFieldDrop"
    @row-drag-end="onFieldDragEnd"
  >
    <el-table-column
      label="排序"
      width="100"
      align="center"
    >
      <template #default="{ row }">
        <div class="sort-actions">
          <el-icon
            class="drag-handle"
            title="拖拽排序"
          >
            <Rank />
          </el-icon>
          <div class="sort-buttons">
            <el-button
              link
              type="primary"
              size="small"
              :disabled="isFirstField(row)"
              @click="moveField(row, -1)"
            >
              <el-icon><Top /></el-icon>
            </el-button>
            <el-button
              link
              type="primary"
              size="small"
              :disabled="isLastField(row)"
              @click="moveField(row, 1)"
            >
              <el-icon><Bottom /></el-icon>
            </el-button>
          </div>
        </div>
      </template>
    </el-table-column>
    <el-table-column
      prop="key"
      label="字段Key"
      width="160"
    />
    <el-table-column
      prop="label"
      label="字段标签"
      width="140"
    />
    <el-table-column
      label="类型"
      width="100"
      align="center"
    >
      <template #default="{ row }">
        <el-tag
          size="small"
          :type="row.fieldType === 'number' ? 'warning' : row.fieldType === 'select' ? 'success' : 'info'"
        >
          {{ fieldTypeLabel(row.fieldType) }}
        </el-tag>
      </template>
    </el-table-column>
    <el-table-column
      label="是否显示"
      width="100"
      align="center"
    >
      <template #default="{ row }">
        <el-switch
          :model-value="row.visible"
          @change="(val: boolean) => handleFieldChange(row, { visible: val })"
        />
      </template>
    </el-table-column>
    <el-table-column
      label="是否必填"
      width="100"
      align="center"
    >
      <template #default="{ row }">
        <el-switch
          :model-value="row.required"
          @change="(val: boolean) => handleFieldChange(row, { required: val })"
        />
      </template>
    </el-table-column>
    <el-table-column
      label="默认值"
      min-width="140"
    >
      <template #default="{ row }">
        <el-input
          :model-value="row.defaultValue"
          placeholder="无默认值"
          size="small"
          @change="(val: string) => handleFieldChange(row, { defaultValue: val })"
        />
      </template>
    </el-table-column>
    <el-table-column
      label="选项"
      width="120"
      align="center"
    >
      <template #default="{ row }">
        <el-tag
          v-if="row.fieldType === 'select' && row.options && row.options.length > 0"
          size="small"
          type="success"
        >
          {{ row.options.length }}项
        </el-tag>
        <span
          v-else
          class="text-muted"
        >-</span>
      </template>
    </el-table-column>
    <el-table-column
      label="使用次数"
      width="110"
      align="center"
    >
      <template #default="{ row }">
        <template v-if="(fieldUsageMap.get(row.key) || 0) > 0">
          {{ fieldUsageMap.get(row.key) }}
        </template>
        <el-tag
          v-else
          type="info"
          size="small"
        >
          未使用
        </el-tag>
      </template>
    </el-table-column>
    <el-table-column
      label="操作"
      width="140"
      align="center"
      fixed="right"
    >
      <template #default="{ row }">
        <el-button
          type="primary"
          link
          size="small"
          @click="openFieldDialog(row)"
        >
          编辑
        </el-button>
        <el-button
          type="danger"
          link
          size="small"
          @click="handleDeleteField(row)"
        >
          删除
        </el-button>
      </template>
    </el-table-column>
    <template #empty>
      <EmptyState
        title="暂无字段"
        description="点击上方「新增字段」按钮添加BOM字段"
        variant="empty"
        action-text="新增字段"
        @action="openFieldDialog()"
      />
    </template>
  </el-table>

  <!-- BOM字段新增/编辑弹窗 -->
  <el-dialog
    v-model="fieldDialogVisible"
    :title="fieldForm.originalKey ? '编辑字段' : (fieldForm.lockedKey ? '添加字段（从扫描）' : '新增字段')"
    width="520px"
    :close-on-click-modal="false"
  >
    <el-form
      ref="fieldFormRef"
      :model="fieldForm"
      :rules="fieldRules"
      label-width="90px"
    >
      <el-form-item
        label="字段Key"
        prop="key"
      >
        <el-input
          v-model="fieldForm.key"
          placeholder="如 materialCatalogNo"
          :disabled="!!fieldForm.lockedKey"
        />
        <div
          v-if="fieldForm.lockedKey"
          class="form-tip"
        >
          Key由扫描数据预填，不可修改
        </div>
        <div
          v-else-if="fieldForm.originalKey && fieldForm.key !== fieldForm.originalKey"
          class="form-tip"
        >
          Key已修改，可选择是否同时迁移现有数据
        </div>
      </el-form-item>
      <el-form-item
        label="字段标签"
        prop="label"
      >
        <el-input
          v-model="fieldForm.label"
          placeholder="如 物料编码"
        />
      </el-form-item>
      <el-form-item
        label="字段类型"
        prop="fieldType"
      >
        <el-select
          v-model="fieldForm.fieldType"
          style="width: 100%"
        >
          <el-option
            label="文本"
            value="text"
          />
          <el-option
            label="数字"
            value="number"
          />
          <el-option
            label="下拉选择"
            value="select"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="默认值">
        <el-input
          v-model="fieldForm.defaultValue"
          placeholder="可选，留空则无默认值"
        />
      </el-form-item>
      <el-form-item
        v-if="fieldForm.fieldType === 'select'"
        label="下拉选项"
      >
        <div class="options-editor">
          <div
            v-for="(opt, idx) in fieldForm.options"
            :key="idx"
            class="option-row"
          >
            <el-input
              v-model="fieldForm.options[idx]"
              placeholder="选项值"
              size="small"
              style="flex: 1"
            />
            <el-button
              link
              type="danger"
              size="small"
              @click="removeOption(idx)"
            >
              删除
            </el-button>
          </div>
          <el-button
            size="small"
            @click="addOption"
          >
            <el-icon><Plus /></el-icon> 添加选项
          </el-button>
        </div>
      </el-form-item>
      <el-form-item label="是否显示">
        <el-switch v-model="fieldForm.visible" />
      </el-form-item>
      <el-form-item label="是否必填">
        <el-switch v-model="fieldForm.required" />
      </el-form-item>
      <el-form-item
        v-if="fieldForm.originalKey && fieldForm.key !== fieldForm.originalKey"
        label="迁移数据"
      >
        <el-checkbox v-model="fieldForm.migrateData">
          同时迁移现有数据（将旧Key的值复制到新Key）
        </el-checkbox>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="fieldDialogVisible = false">
        取消
      </el-button>
      <el-button
        type="primary"
        :loading="fieldSaving"
        @click="handleSaveField"
      >
        确定
      </el-button>
    </template>
  </el-dialog>

  <!-- 扫描现有数据字段弹窗 -->
  <el-dialog
    v-model="scanDialogVisible"
    title="扫描现有数据字段"
    width="720px"
    :close-on-click-modal="false"
  >
    <div class="scan-toolbar">
      <el-button
        type="primary"
        size="small"
        :disabled="undefinedFieldCount === 0"
        @click="handleBatchAddUndefined"
      >
        一键添加所有未定义字段（{{ undefinedFieldCount }}）
      </el-button>
      <span class="scan-type-hint">
        当前扫描范围：{{ scanTypeLabel }}
      </span>
    </div>
    <el-table
      :data="scanResults"
      stripe
      style="width: 100%"
      empty-text="未扫描到字段"
      max-height="400"
    >
      <el-table-column
        prop="key"
        label="字段Key"
        min-width="160"
      />
      <el-table-column
        label="推断标签"
        width="140"
      >
        <template #default="{ row }">
          {{ inferFieldLabel(row.key) }}
        </template>
      </el-table-column>
      <el-table-column
        prop="occurrenceCount"
        label="出现次数"
        width="100"
        align="center"
      />
      <el-table-column
        prop="hasValueCount"
        label="有值条目数"
        width="110"
        align="center"
      />
      <el-table-column
        label="模板状态"
        width="110"
        align="center"
      >
        <template #default="{ row }">
          <el-tag
            v-if="isFieldDefined(row.key)"
            type="success"
            size="small"
          >
            已定义
          </el-tag>
          <el-tag
            v-else
            type="danger"
            size="small"
          >
            未定义
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        label="操作"
        width="140"
        align="center"
        fixed="right"
      >
        <template #default="{ row }">
          <el-button
            v-if="!isFieldDefined(row.key)"
            type="primary"
            link
            size="small"
            @click="handleAddFromScan(row)"
          >
            添加到模板
          </el-button>
          <span
            v-else
            class="text-muted"
          >已在模板中</span>
        </template>
      </el-table-column>
    </el-table>
    <template #footer>
      <div class="scan-footer">
        <span>共扫描 <strong>{{ scanSummary.totalBomItems }}</strong> 条 BOM 条目，</span>
        <span>发现 <strong>{{ scanSummary.fields.length }}</strong> 个字段，</span>
        <span>其中 <strong>{{ definedFieldCount }}</strong> 个已在模板中</span>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import {
  Plus, RefreshLeft, Top, Bottom, Search, Rank
} from '@element-plus/icons-vue'
import { useBomTemplatesStore } from '@/stores/bomTemplates'
import {
  scanAllBomFields,
  getFieldUsageMap,
  inferFieldLabel,
  type FieldScanResult,
  type ScanSummary
} from '@/utils/bomFieldScan'
import { notifyDbError } from '@/utils/dbErrorHandler'
import type { BomTemplateField, BomTemplateType } from '@/types'
import EmptyState from '@/components/common/EmptyState.vue'

const bomTemplatesStore = useBomTemplatesStore()

// ===== BOM模板类型选择 =====
const selectedTemplateType = ref<BomTemplateType>('module')

// ===== 搜索 =====
const fieldSearchKeyword = ref('')

const sortedFields = computed<BomTemplateField[]>(() => {
  return bomTemplatesStore.getFieldsByType(selectedTemplateType.value)
})

const filteredFields = computed(() => {
  if (!fieldSearchKeyword.value.trim()) return sortedFields.value
  const kw = fieldSearchKeyword.value.toLowerCase()
  return sortedFields.value.filter(
    (f) => f.key.toLowerCase().includes(kw) || f.label.toLowerCase().includes(kw)
  )
})

function handleFieldChange(row: BomTemplateField, data: Partial<BomTemplateField>) {
  bomTemplatesStore.updateField(row.key, data, row.templateType)
}

function fieldTypeLabel(type: string): string {
  const map: Record<string, string> = { text: '文本', number: '数字', select: '下拉' }
  return map[type] || type
}

// 字段编辑弹窗
const fieldDialogVisible = ref(false)
const fieldFormRef = ref<FormInstance>()
const fieldSaving = ref(false)

interface FieldForm {
  id: string
  originalKey: string
  lockedKey: string
  key: string
  label: string
  fieldType: 'text' | 'number' | 'select'
  defaultValue: string
  options: string[]
  visible: boolean
  required: boolean
  templateType: BomTemplateType
  migrateData: boolean
}

const fieldForm = reactive<FieldForm>({
  id: '',
  originalKey: '',
  lockedKey: '',
  key: '',
  label: '',
  fieldType: 'text',
  defaultValue: '',
  options: [],
  visible: true,
  required: false,
  templateType: 'module',
  migrateData: false
})

const fieldRules: FormRules = {
  key: [
    { required: true, message: '请输入字段Key', trigger: 'blur' },
    {
      validator: (_rule, value, callback) => {
        if (!value) {
          callback()
          return
        }
        if (!/^[a-zA-Z][a-zA-Z0-9]*$/.test(value)) {
          callback(new Error('Key需以字母开头，仅含字母和数字'))
          return
        }
        if (!bomTemplatesStore.isKeyUnique(value, fieldForm.originalKey || undefined, fieldForm.templateType)) {
          callback(new Error('该Key已存在，请使用其他Key'))
          return
        }
        callback()
      },
      trigger: 'blur'
    }
  ],
  label: [{ required: true, message: '请输入字段标签', trigger: 'blur' }]
}

function openFieldDialog(row?: BomTemplateField) {
  if (row) {
    fieldForm.id = row.id
    fieldForm.originalKey = row.key
    fieldForm.lockedKey = ''
    fieldForm.key = row.key
    fieldForm.label = row.label
    fieldForm.fieldType = row.fieldType
    fieldForm.defaultValue = row.defaultValue || ''
    fieldForm.options = row.options ? [...row.options] : []
    fieldForm.visible = row.visible
    fieldForm.required = row.required
    fieldForm.templateType = row.templateType
    fieldForm.migrateData = false
  } else {
    fieldForm.id = ''
    fieldForm.originalKey = ''
    fieldForm.lockedKey = ''
    fieldForm.key = ''
    fieldForm.label = ''
    fieldForm.fieldType = 'text'
    fieldForm.defaultValue = ''
    fieldForm.options = []
    fieldForm.visible = true
    fieldForm.required = false
    fieldForm.templateType = selectedTemplateType.value
    fieldForm.migrateData = false
  }
  fieldDialogVisible.value = true
}

function openFieldDialogFromScan(scanField: FieldScanResult) {
  fieldForm.id = ''
  fieldForm.originalKey = ''
  fieldForm.lockedKey = scanField.key
  fieldForm.key = scanField.key
  fieldForm.label = inferFieldLabel(scanField.key)
  fieldForm.fieldType = 'text'
  fieldForm.defaultValue = ''
  fieldForm.options = []
  fieldForm.visible = true
  fieldForm.required = false
  fieldForm.templateType = selectedTemplateType.value
  fieldForm.migrateData = false
  fieldDialogVisible.value = true
}

async function handleSaveField() {
  if (!fieldFormRef.value) return
  try {
    await fieldFormRef.value.validate()
  } catch {
    return
  }
  fieldSaving.value = true

  let effectiveOriginalKey = fieldForm.originalKey
  if (!effectiveOriginalKey && fieldForm.id) {
    const existingField = bomTemplatesStore.fields.find(f => f.id === fieldForm.id)
    if (existingField) {
      effectiveOriginalKey = existingField.key
      console.warn('originalKey was empty, recovered from id:', effectiveOriginalKey)
    }
  }

  try {
    if (effectiveOriginalKey) {
      const keyChanged = fieldForm.key !== effectiveOriginalKey

      if (keyChanged && fieldForm.migrateData) {
        try {
          await bomTemplatesStore.renameFieldInData(effectiveOriginalKey, fieldForm.key, fieldForm.templateType)
          ElMessage.success('数据迁移完成')
        } catch (error) {
          notifyDbError(error, '迁移字段数据')
          ElMessage.error('数据迁移失败，请检查控制台')
          return
        }
      }

      const updateData: Partial<BomTemplateField> = {
        label: fieldForm.label,
        fieldType: fieldForm.fieldType,
        defaultValue: fieldForm.defaultValue || undefined,
        options: fieldForm.fieldType === 'select' ? fieldForm.options.filter(o => o.trim() !== '') : undefined,
        visible: fieldForm.visible,
        required: fieldForm.required
      }
      if (keyChanged) {
        updateData.key = fieldForm.key
      }

      await bomTemplatesStore.updateField(effectiveOriginalKey, updateData, fieldForm.templateType)
      ElMessage.success('字段更新成功')
      loadFieldUsage()
    } else {
      const success = bomTemplatesStore.addField({
        key: fieldForm.key,
        label: fieldForm.label,
        fieldType: fieldForm.fieldType,
        defaultValue: fieldForm.defaultValue || undefined,
        options: fieldForm.fieldType === 'select' ? fieldForm.options.filter(o => o.trim() !== '') : undefined,
        visible: fieldForm.visible,
        required: fieldForm.required
      }, fieldForm.templateType)
      if (success) {
        ElMessage.success('字段新增成功')
        if (scanDialogVisible.value) {
          refreshScanResults()
        }
      } else {
        ElMessage.error('字段Key已存在')
        return
      }
    }
    fieldDialogVisible.value = false
  } finally {
    fieldSaving.value = false
  }
}

function addOption() {
  fieldForm.options.push('')
}

function removeOption(idx: number) {
  fieldForm.options.splice(idx, 1)
}

async function handleDeleteField(row: BomTemplateField) {
  try {
    await ElMessageBox.confirm(
      `确定要删除字段"${row.label}"(${row.key})吗？\n\n此操作将同时清除所有 BOM 数据中的该字段值，删除后不可恢复。`,
      '删除确认',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'warning',
        confirmButtonClass: 'el-button--danger'
      }
    )
  } catch {
    return
  }
  try {
    await bomTemplatesStore.clearFieldInData(row.key, row.templateType)
  } catch (error) {
    notifyDbError(error, '清除字段数据')
  }
  await bomTemplatesStore.deleteField(row.id)
  ElMessage.success('字段删除成功')
}

function isFirstField(field: BomTemplateField): boolean {
  return sortedFields.value[0]?.id === field.id
}

function isLastField(field: BomTemplateField): boolean {
  const fields = sortedFields.value
  return fields.length > 0 && fields[fields.length - 1].id === field.id
}

function moveField(field: BomTemplateField, direction: number) {
  const fields = sortedFields.value
  const index = fields.findIndex((f) => f.id === field.id)
  if (index === -1) return
  const targetIndex = index + direction
  if (targetIndex < 0 || targetIndex >= fields.length) return
  const current = fields[index]
  const target = fields[targetIndex]
  const tempOrder = current.sortOrder
  bomTemplatesStore.updateField(current.key, { sortOrder: target.sortOrder }, current.templateType)
  bomTemplatesStore.updateField(target.key, { sortOrder: tempOrder }, target.templateType)
}

// ===== 拖拽排序 =====
let dragFieldId: string | null = null

function onFieldDragStart(row: BomTemplateField) {
  dragFieldId = row.id
}

function onFieldDragOver(_draggingRow: BomTemplateField, _dropRow: BomTemplateField) {
  // Element Plus 会自动处理视觉反馈
}

function onFieldDrop(draggingRow: BomTemplateField, dropRow: BomTemplateField) {
  if (!dragFieldId || draggingRow.id === dropRow.id) return
  const fields = sortedFields.value
  const fromIndex = fields.findIndex((f) => f.id === draggingRow.id)
  const toIndex = fields.findIndex((f) => f.id === dropRow.id)
  if (fromIndex === -1 || toIndex === -1) return

  // 重新分配 sortOrder
  const newFields = [...fields]
  const [moved] = newFields.splice(fromIndex, 1)
  newFields.splice(toIndex, 0, moved)
  newFields.forEach((f, idx) => {
    bomTemplatesStore.updateField(f.key, { sortOrder: idx + 1 }, f.templateType)
  })
  ElMessage.success('排序已更新')
}

function onFieldDragEnd() {
  dragFieldId = null
}

function handleResetTemplate() {
  const typeLabel: Record<BomTemplateType, string> = {
    module: '组件BOM模板',
    order: '下单BOM模板',
    import: '批量导入模板'
  }
  ElMessageBox.confirm(`确定要恢复【${typeLabel[selectedTemplateType.value]}】的默认字段吗？当前所有自定义字段将被清除。`, '恢复默认', {
    confirmButtonText: '确定恢复',
    cancelButtonText: '取消',
    type: 'warning'
  })
    .then(async () => {
      await bomTemplatesStore.resetToMock(selectedTemplateType.value)
      ElMessage.success('已恢复默认模板')
      loadFieldUsage()
    })
    .catch(() => {})
}

// ===== 字段使用次数统计 =====
const fieldUsageMap = ref<Map<string, number>>(new Map())

async function loadFieldUsage() {
  try {
    fieldUsageMap.value = await getFieldUsageMap()
  } catch (error) {
    notifyDbError(error, '加载字段使用次数')
  }
}

// ===== 扫描现有数据字段 =====
const scanDialogVisible = ref(false)
const scanLoading = ref(false)
const scanSummary = ref<ScanSummary>({ totalBomItems: 0, fields: [] })
const scanResults = ref<FieldScanResult[]>([])

const scanTypeLabel = computed(() => {
  const map: Record<BomTemplateType, string> = {
    module: '模块BOM条目',
    order: '项目下单BOM条目',
    import: '模块BOM + 项目下单BOM'
  }
  return map[selectedTemplateType.value]
})

function isFieldDefined(key: string): boolean {
  return bomTemplatesStore.getFieldsByType(selectedTemplateType.value).some((f) => f.key === key)
}

const definedFieldCount = computed(() =>
  scanResults.value.filter((f) => isFieldDefined(f.key)).length
)

const undefinedFieldCount = computed(() =>
  scanResults.value.filter((f) => !isFieldDefined(f.key)).length
)

async function handleScanFields() {
  scanLoading.value = true
  try {
    scanSummary.value = await scanAllBomFields(selectedTemplateType.value)
    scanResults.value = scanSummary.value.fields
    scanDialogVisible.value = true
  } catch (error) {
    notifyDbError(error, '扫描字段')
    ElMessage.error('扫描失败，请检查控制台')
  } finally {
    scanLoading.value = false
  }
}

async function refreshScanResults() {
  try {
    scanSummary.value = await scanAllBomFields(selectedTemplateType.value)
    scanResults.value = scanSummary.value.fields
  } catch (error) {
    notifyDbError(error, '刷新扫描结果')
  }
}

function handleAddFromScan(row: FieldScanResult) {
  openFieldDialogFromScan(row)
}

async function handleBatchAddUndefined() {
  const undefinedFields = scanResults.value.filter((f) => !isFieldDefined(f.key))
  if (undefinedFields.length === 0) return

  try {
    await ElMessageBox.confirm(
      `确定要将 ${undefinedFields.length} 个未定义字段添加到【${selectedTemplateType.value === 'module' ? '组件BOM模板' : selectedTemplateType.value === 'order' ? '下单BOM模板' : '批量导入模板'}】吗？\n\n默认配置：文本类型、显示、非必填`,
      '批量添加字段',
      {
        confirmButtonText: '确定添加',
        cancelButtonText: '取消',
        type: 'info'
      }
    )
  } catch {
    return
  }

  let addedCount = 0
  for (const field of undefinedFields) {
    const success = bomTemplatesStore.addField({
      key: field.key,
      label: inferFieldLabel(field.key),
      fieldType: 'text',
      visible: true,
      required: false
    }, selectedTemplateType.value)
    if (success) addedCount++
  }

  ElMessage.success(`已添加 ${addedCount} 个字段`)
  await refreshScanResults()
  loadFieldUsage()
}

onMounted(() => {
  loadFieldUsage()
})
</script>

<style scoped>
.description-text {
  color: #909399;
  font-size: 13px;
  margin-bottom: 16px;
}

.bom-template-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
  gap: 16px;
}

.bom-template-header .description-text {
  margin-bottom: 0;
  flex: 1;
  max-width: 320px;
}

.migration-status {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
  max-width: 420px;
}

.action-bar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
}

.sort-actions {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.drag-handle {
  color: #c0c4cc;
  cursor: grab;
  font-size: 16px;
}

.drag-handle:active {
  cursor: grabbing;
}

.sort-buttons {
  display: flex;
  flex-direction: column;
}

.sort-actions .el-button {
  padding: 2px;
}

.form-tip {
  color: #909399;
  font-size: 12px;
  margin-top: 4px;
}

.text-muted {
  color: #c0c4cc;
  font-size: 12px;
}

.options-editor {
  width: 100%;
}

.option-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.scan-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.scan-type-hint {
  color: #909399;
  font-size: 12px;
}

.scan-footer {
  display: flex;
  gap: 4px;
  color: #606266;
  font-size: 13px;
}

.scan-footer strong {
  color: #409eff;
}
</style>
