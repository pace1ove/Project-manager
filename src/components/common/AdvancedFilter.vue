<template>
  <el-popover
    v-model:visible="popoverVisible"
    placement="bottom-start"
    :width="420"
    trigger="click"
  >
    <template #reference>
      <el-button
        :icon="Filter"
        size="small"
        :type="hasActiveFilters ? 'primary' : 'default'"
      >
        筛选
        <el-badge
          v-if="hasActiveFilters"
          :value="activeFilterCount"
          class="filter-badge"
        />
      </el-button>
    </template>

    <div class="advanced-filter">
      <div class="filter-header">
        <span class="filter-title">高级筛选</span>
        <el-radio-group
          v-model="localLogic"
          size="small"
          @change="onLogicChange"
        >
          <el-radio-button value="AND">
            且
          </el-radio-button>
          <el-radio-button value="OR">
            或
          </el-radio-button>
        </el-radio-group>
      </div>

      <!-- 条件列表 -->
      <div class="filter-conditions">
        <div
          v-for="(cond, index) in localConditions"
          :key="index"
          class="filter-condition-row"
        >
          <el-select
            v-model="cond.field"
            placeholder="字段"
            size="small"
            style="width: 110px;"
            @change="onFieldChange(cond)"
          >
            <el-option
              v-for="f in fields"
              :key="f.key"
              :label="f.label"
              :value="f.key"
            />
          </el-select>

          <el-select
            v-model="cond.operator"
            placeholder="操作符"
            size="small"
            style="width: 100px;"
          >
            <el-option
              v-for="op in getOperatorsForField(cond.field)"
              :key="op.value"
              :label="op.label"
              :value="op.value"
            />
          </el-select>

          <!-- 值输入：根据字段类型 -->
          <template v-if="cond.operator !== 'between'">
            <el-input
              v-if="getFieldType(cond.field) === 'text'"
              v-model="cond.value"
              placeholder="值"
              size="small"
              style="width: 120px;"
              clearable
            />
            <el-select
              v-else-if="getFieldType(cond.field) === 'select'"
              v-model="cond.value"
              placeholder="值"
              size="small"
              style="width: 120px;"
              clearable
            >
              <el-option
                v-for="opt in getFieldOptions(cond.field)"
                :key="opt"
                :label="opt"
                :value="opt"
              />
            </el-select>
            <el-input-number
              v-else-if="getFieldType(cond.field) === 'number'"
              v-model="cond.value"
              size="small"
              style="width: 120px;"
              controls-position="right"
            />
            <el-date-picker
              v-else-if="getFieldType(cond.field) === 'date'"
              v-model="cond.value"
              type="date"
              size="small"
              style="width: 120px;"
              value-format="YYYY-MM-DD"
            />
          </template>
          <!-- between 双值 -->
          <template v-else>
            <el-input-number
              v-if="getFieldType(cond.field) === 'number'"
              v-model="cond.valueMin"
              size="small"
              style="width: 80px;"
              controls-position="right"
              placeholder="最小"
            />
            <span class="filter-between-sep">~</span>
            <el-input-number
              v-if="getFieldType(cond.field) === 'number'"
              v-model="cond.valueMax"
              size="small"
              style="width: 80px;"
              controls-position="right"
              placeholder="最大"
            />
          </template>

          <el-button
            text
            type="danger"
            size="small"
            :icon="Delete"
            @click="removeCondition(index)"
          />
        </div>
      </div>

      <!-- 添加条件 -->
      <el-button
        text
        type="primary"
        size="small"
        :icon="Plus"
        @click="addCondition"
      >
        添加条件
      </el-button>

      <!-- 常用筛选 -->
      <div
        v-if="storageKey && savedFilters.length > 0"
        class="filter-saved"
      >
        <div class="filter-saved-title">
          常用筛选
        </div>
        <div class="filter-saved-list">
          <el-tag
            v-for="(sf, idx) in savedFilters"
            :key="idx"
            closable
            size="small"
            class="filter-saved-tag"
            @click="applySavedFilter(sf)"
            @close="deleteSavedFilter(idx)"
          >
            {{ sf.name }}
          </el-tag>
        </div>
      </div>

      <!-- 底部按钮 -->
      <div class="filter-footer">
        <el-button
          v-if="storageKey"
          text
          size="small"
          @click="saveCurrentFilter"
        >
          保存为常用
        </el-button>
        <div class="filter-footer-actions">
          <el-button
            size="small"
            @click="onReset"
          >
            重置
          </el-button>
          <el-button
            type="primary"
            size="small"
            @click="onApply"
          >
            应用
          </el-button>
        </div>
      </div>
    </div>
  </el-popover>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Filter, Plus, Delete } from '@element-plus/icons-vue'

/** 筛选字段定义 */
export interface FilterField {
  key: string
  label: string
  type: 'text' | 'select' | 'number' | 'date'
  options?: string[]
}

/** 单个筛选条件 */
export interface FilterCondition {
  field: string
  operator: string
  value: any
  valueMin?: number
  valueMax?: number
}

/** 保存的筛选方案 */
interface SavedFilter {
  name: string
  conditions: FilterCondition[]
  logic: 'AND' | 'OR'
}

const props = withDefaults(
  defineProps<{
    /** 可选字段列表 */
    fields: FilterField[]
    /** 当前条件 v-model */
    modelValue: FilterCondition[]
    /** 逻辑关系 */
    logic: 'AND' | 'OR'
    /** localStorage 持久化 key（保存常用筛选） */
    storageKey?: string
  }>(),
  {
    storageKey: ''
  }
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: FilterCondition[]): void
  (e: 'update:logic', value: 'AND' | 'OR'): void
  (e: 'filter', conditions: FilterCondition[], logic: 'AND' | 'OR'): void
  (e: 'reset'): void
}>()

const popoverVisible = ref(false)
const localConditions = ref<FilterCondition[]>([])
const localLogic = ref<'AND' | 'OR'>('AND')
const savedFilters = ref<SavedFilter[]>([])

const STORAGE_PREFIX = 'bom_saved_filter_'

/** 操作符定义 */
const ALL_OPERATORS = [
  { value: '=', label: '等于' },
  { value: '!=', label: '不等于' },
  { value: 'contains', label: '包含' },
  { value: 'startsWith', label: '开头是' },
  { value: '>', label: '大于' },
  { value: '<', label: '小于' },
  { value: '>=', label: '大于等于' },
  { value: '<=', label: '小于等于' },
  { value: 'between', label: '介于' }
]

/** 文本类操作符 */
const TEXT_OPERATORS = ['=', '!=', 'contains', 'startsWith']
/** 数值类操作符 */
const NUMBER_OPERATORS = ['=', '!=', '>', '<', '>=', '<=', 'between']
/** 日期类操作符 */
const DATE_OPERATORS = ['=', '!=', '>', '<', '>=', '<=', 'between']
/** 下拉类操作符 */
const SELECT_OPERATORS = ['=', '!=']

// 初始化本地状态
watch(
  () => props.modelValue,
  (val) => {
    localConditions.value = JSON.parse(JSON.stringify(val || []))
  },
  { immediate: true, deep: true }
)

watch(
  () => props.logic,
  (val) => {
    localLogic.value = val
  },
  { immediate: true }
)

// 加载保存的筛选方案
if (props.storageKey) {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + props.storageKey)
    if (raw) savedFilters.value = JSON.parse(raw)
  } catch {
    // ignore
  }
}

/** 是否有激活的筛选条件 */
const hasActiveFilters = computed(() => activeFilterCount.value > 0)
const activeFilterCount = computed(
  () => props.modelValue.filter((c) => c.field && c.value !== '' && c.value !== null && c.value !== undefined).length
)

/** 获取字段类型 */
function getFieldType(key: string): FilterField['type'] {
  return props.fields.find((f) => f.key === key)?.type || 'text'
}

/** 获取字段选项 */
function getFieldOptions(key: string): string[] {
  return props.fields.find((f) => f.key === key)?.options || []
}

/** 根据字段类型获取可用操作符 */
function getOperatorsForField(key: string) {
  const type = getFieldType(key)
  let allowed: string[]
  switch (type) {
    case 'number':
      allowed = NUMBER_OPERATORS
      break
    case 'date':
      allowed = DATE_OPERATORS
      break
    case 'select':
      allowed = SELECT_OPERATORS
      break
    default:
      allowed = TEXT_OPERATORS
  }
  return ALL_OPERATORS.filter((op) => allowed.includes(op.value))
}

/** 字段变化时重置操作符和值 */
function onFieldChange(cond: FilterCondition) {
  const ops = getOperatorsForField(cond.field)
  if (!ops.find((o) => o.value === cond.operator)) {
    cond.operator = ops[0]?.value || '='
  }
  cond.value = ''
  cond.valueMin = undefined
  cond.valueMax = undefined
}

/** 添加条件 */
function addCondition() {
  const firstField = props.fields[0]
  localConditions.value.push({
    field: firstField?.key || '',
    operator: firstField ? getOperatorsForField(firstField.key)[0]?.value || '=' : '=',
    value: ''
  })
}

/** 删除条件 */
function removeCondition(index: number) {
  localConditions.value.splice(index, 1)
}

/** 逻辑变化 */
function onLogicChange(val: string) {
  localLogic.value = val as 'AND' | 'OR'
}

/** 应用筛选 */
function onApply() {
  const valid = localConditions.value.filter(
    (c) => c.field && (c.operator === 'between' ? (c.valueMin !== undefined || c.valueMax !== undefined) : c.value !== '' && c.value !== null)
  )
  emit('update:modelValue', JSON.parse(JSON.stringify(valid)))
  emit('update:logic', localLogic.value)
  emit('filter', JSON.parse(JSON.stringify(valid)), localLogic.value)
  popoverVisible.value = false
}

/** 重置 */
function onReset() {
  localConditions.value = []
  localLogic.value = 'AND'
  emit('update:modelValue', [])
  emit('update:logic', 'AND')
  emit('reset')
  popoverVisible.value = false
}

/** 保存当前筛选为常用 */
function saveCurrentFilter() {
  const name = prompt('请输入筛选方案名称：')
  if (!name || !props.storageKey) return
  savedFilters.value.push({
    name,
    conditions: JSON.parse(JSON.stringify(localConditions.value)),
    logic: localLogic.value
  })
  try {
    localStorage.setItem(
      STORAGE_PREFIX + props.storageKey,
      JSON.stringify(savedFilters.value)
    )
  } catch {
    // ignore
  }
}

/** 应用保存的筛选 */
function applySavedFilter(sf: SavedFilter) {
  localConditions.value = JSON.parse(JSON.stringify(sf.conditions))
  localLogic.value = sf.logic
  onApply()
}

/** 删除保存的筛选 */
function deleteSavedFilter(index: number) {
  savedFilters.value.splice(index, 1)
  if (props.storageKey) {
    try {
      localStorage.setItem(
        STORAGE_PREFIX + props.storageKey,
        JSON.stringify(savedFilters.value)
      )
    } catch {
      // ignore
    }
  }
}
</script>

<style scoped>
.advanced-filter {
  max-height: 500px;
  display: flex;
  flex-direction: column;
}
.filter-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--border-extra-light, #f2f6fc);
  margin-bottom: 12px;
}
.filter-title {
  font-weight: 600;
  font-size: 14px;
}
.filter-conditions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 8px;
  max-height: 240px;
  overflow-y: auto;
}
.filter-condition-row {
  display: flex;
  align-items: center;
  gap: 6px;
}
.filter-between-sep {
  color: var(--text-secondary, #909399);
  font-size: 12px;
}
.filter-saved {
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px solid var(--border-extra-light, #f2f6fc);
}
.filter-saved-title {
  font-size: 12px;
  color: var(--text-secondary, #909399);
  margin-bottom: 6px;
}
.filter-saved-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.filter-saved-tag {
  cursor: pointer;
}
.filter-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px solid var(--border-extra-light, #f2f6fc);
}
.filter-footer-actions {
  display: flex;
  gap: 8px;
}
.filter-badge {
  margin-left: 4px;
}
</style>
