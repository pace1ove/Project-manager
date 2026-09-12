<template>
  <div class="part-picker-select">
    <el-select
      :model-value="modelValue"
      filterable
      remote
      :remote-method="handleSearch"
      :placeholder="placeholder"
      style="width: 100%"
      @update:model-value="onSelect"
      @visible-change="onVisibleChange"
    >
      <el-option
        v-for="p in options"
        :key="p.id"
        :value="p.id"
        :label="`${p.drawingNo || '(无图号)'} | ${p.chineseDescription || ''}`"
      >
        <span>{{ p.drawingNo || '(无图号)' }} | {{ p.chineseDescription || '' }}</span>
        <el-tag
          v-if="showLibraryName && getLibraryName(p.libraryId)"
          size="small"
          type="info"
          style="float: right; margin-top: 2px"
        >
          {{ getLibraryName(p.libraryId) }}
        </el-tag>
      </el-option>
    </el-select>
    <div
      v-if="selectedPart"
      class="selected-part-preview"
    >
      <el-tag
        size="small"
        type="info"
        style="margin-bottom: 6px"
      >
        已选中零件库零件（参数自动填充且只读）
      </el-tag>
      <div class="part-preview-grid">
        <span><b>图号：</b>{{ selectedPart.drawingNo || '—' }}</span>
        <span><b>中文描述：</b>{{ selectedPart.chineseDescription || '—' }}</span>
        <span><b>物料/目录号：</b>{{ selectedPart.materialCatalogNo || '—' }}</span>
        <span><b>装配单位：</b>{{ selectedPart.assemblyUnit || '—' }}</span>
        <span v-if="showLibraryName"><b>所属库：</b>{{ getLibraryName(selectedPart.libraryId) || '—' }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Part } from '@/types'
import { usePartsStore } from '@/stores/parts'
import { usePartLibrariesStore } from '@/stores/partLibraries'

const props = withDefaults(defineProps<{
  /** 当前选中零件 ID */
  modelValue: string
  placeholder?: string
  /** 仅从指定库中搜索零件；为空或空数组时搜索所有库 */
  libraryIds?: string[]
  /** 是否在选项和预览中显示所属库名称 */
  showLibraryName?: boolean
}>(), {
  placeholder: '输入图号/中文描述/物料目录号搜索零件库',
  libraryIds: () => [],
  showLibraryName: false
})

const emit = defineEmits<{
  (e: 'update:modelValue', id: string): void
  /** 选中零件时抛出完整零件对象（用于填充表单） */
  (e: 'pick', part: Part): void
}>()

const partsStore = usePartsStore()
const partLibrariesStore = usePartLibrariesStore()
const options = ref<Part[]>([])

const selectedPart = computed<Part | undefined>(() => {
  if (!props.modelValue) return undefined
  return partsStore.getById(props.modelValue)
})

function getLibraryName(libraryId: string): string {
  return partLibrariesStore.getById(libraryId)?.name || ''
}

function handleSearch(kw: string) {
  const libIds = props.libraryIds && props.libraryIds.length > 0 ? props.libraryIds : undefined
  options.value = partsStore.search(kw, libIds)
}

/** 下拉展开时若选项为空，预加载前 N 条，改善初次打开体验 */
function onVisibleChange(visible: boolean) {
  if (visible && options.value.length === 0) {
    const libIds = props.libraryIds && props.libraryIds.length > 0 ? props.libraryIds : undefined
    options.value = partsStore.search('', libIds).slice(0, 20)
  }
}

function onSelect(partId: string) {
  emit('update:modelValue', partId)
  const part = partsStore.getById(partId)
  if (part) emit('pick', part)
}

/** 外部重置（关闭对话框时调用）：清空选中与选项 */
function reset() {
  options.value = []
}
defineExpose({ reset })
</script>

<style scoped>
.part-picker-select {
  margin-bottom: 16px;
}
.selected-part-preview {
  margin-top: 10px;
  padding: 10px 12px;
  background: #f0f9eb;
  border: 1px solid #e1f3d8;
  border-radius: 6px;
}
.part-preview-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px 16px;
  font-size: 13px;
  color: #606266;
}
</style>
