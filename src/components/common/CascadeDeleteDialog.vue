<template>
  <el-dialog
    :model-value="modelValue"
    :title="title"
    width="600px"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    destroy-on-close
    @update:model-value="emit('update:modelValue', $event)"
    @closed="onClosed"
  >
    <div class="cascade-delete-body">
      <p class="desc">
        即将删除：<strong class="entity-name">{{ entityName }}</strong>
      </p>

      <!-- 关联统计 -->
      <div
        v-if="references.length > 0"
        class="ref-summary"
      >
        <p class="ref-title">
          该数据当前存在以下关联引用：
        </p>
        <div class="ref-tags">
          <el-tag
            v-for="ref in references"
            :key="ref.label"
            :type="ref.count > 0 ? 'warning' : 'info'"
            class="ref-tag"
          >
            {{ ref.label }}：{{ ref.count }}
          </el-tag>
        </div>
      </div>
      <el-alert
        v-else
        type="success"
        :closable="false"
        title="该数据无任何关联引用，将被直接删除。"
        style="margin-bottom: 12px"
      />

      <!-- 操作选项 -->
      <el-radio-group
        v-model="selected"
        class="options"
      >
        <el-radio
          v-for="opt in options"
          :key="opt.value"
          :value="opt.value"
          class="option-item"
        >
          <div class="option-content">
            <div class="option-label">
              <span>{{ opt.label }}</span>
              <el-tag
                v-if="opt.type"
                :type="opt.type"
                size="small"
                effect="plain"
              >
                {{ optTagText(opt.type) }}
              </el-tag>
            </div>
            <div
              v-if="opt.description"
              class="option-desc"
            >
              {{ opt.description }}
            </div>
          </div>
        </el-radio>
      </el-radio-group>
    </div>

    <template #footer>
      <el-button @click="emit('update:modelValue', false)">
        取消
      </el-button>
      <el-button
        type="danger"
        :loading="loading"
        @click="onConfirm"
      >
        确认删除
      </el-button>
    </template>
  </el-dialog>
</template>

<script lang="ts">
/** 级联删除对话框的可复用类型 */
export interface CascadeRefItem {
  label: string
  count: number
}

export interface CascadeOption {
  value: string
  label: string
  description?: string
  /** primary=推荐 / warning=谨慎 / danger=危险操作 */
  type?: 'primary' | 'warning' | 'danger'
}
</script>

<script setup lang="ts">
import { ref, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    title?: string
    entityName: string
    references: CascadeRefItem[]
    options: CascadeOption[]
    defaultValue?: string
    loading?: boolean
  }>(),
  {
    title: '删除确认',
    references: () => [],
    options: () => [],
    defaultValue: '',
    loading: false
  }
)

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  confirm: [action: string]
}>()

const selected = ref<string>(props.defaultValue || props.options[0]?.value || '')

watch(
  () => props.modelValue,
  (visible) => {
    if (visible) {
      selected.value = props.defaultValue || props.options[0]?.value || ''
    }
  }
)

function optTagText(type: string): string {
  if (type === 'primary') return '推荐'
  if (type === 'danger') return '危险'
  if (type === 'warning') return '谨慎'
  return ''
}

function onConfirm() {
  if (!selected.value) return
  emit('confirm', selected.value)
}

function onClosed() {
  // 关闭后由父组件负责关闭 v-model
}
</script>

<style scoped>
.cascade-delete-body {
  padding: 0 4px;
}

.desc {
  font-size: 14px;
  color: #606266;
  margin: 0 0 12px;
}

.entity-name {
  color: #303133;
}

.ref-summary {
  background: #fdf6ec;
  border: 1px solid #faecd8;
  border-radius: 6px;
  padding: 10px 12px;
  margin-bottom: 14px;
}

.ref-title {
  margin: 0 0 8px;
  font-size: 13px;
  color: #b88230;
}

.ref-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.options {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
}

.option-item {
  height: auto;
  white-space: normal;
  padding: 10px 12px;
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  margin-right: 0;
}

.option-item :deep(.el-radio__label) {
  width: 100%;
}

.option-content {
  margin-left: 4px;
}

.option-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  color: #303133;
}

.option-desc {
  margin-top: 4px;
  font-size: 12px;
  color: #909399;
  line-height: 1.5;
  font-weight: normal;
}
</style>
