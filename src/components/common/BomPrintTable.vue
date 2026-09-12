<template>
  <table class="print-table">
    <thead>
      <tr>
        <th style="width: 40px">
          #
        </th>
        <th
          v-for="col in visibleColumns"
          :key="col.key"
        >
          {{ col.label }}
        </th>
        <th v-if="showSourceModules && !hasSourceModuleColumn">
          来源模块
        </th>
      </tr>
    </thead>
    <tbody>
      <tr
        v-for="(item, idx) in rows"
        :key="item.id"
      >
        <td>{{ idx + 1 }}</td>
        <td
          v-for="col in visibleColumns"
          :key="col.key"
        >
          {{ formatCellValue(item, col.key) }}
        </td>
        <td v-if="showSourceModules && !hasSourceModuleColumn">
          {{ sourceModulesText(item) }}
        </td>
      </tr>
      <!-- 合计行 -->
      <tr
        v-if="showSummary && rows.length > 0"
        style="font-weight: 700; background: #f0f0f0;"
      >
        <td :colspan="visibleColumns.length + 1">
          合计
        </td>
        <td>{{ totalQty }}</td>
        <td v-if="showSourceModules && !hasSourceModuleColumn" />
      </tr>
    </tbody>
  </table>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { BomItem, OrderBomItem } from '@/types'
import { useModulesStore } from '@/stores/modules'
import { useBomTemplatesStore } from '@/stores/bomTemplates'
import type { BomTemplateType } from '@/types'

type PrintRow = {
  id: string
  quantity: number
  drawingNo?: string
  jobNo?: string
  chineseDescription?: string
  englishDescription?: string
  materialCatalogNo?: string
  assemblyUnit?: string
  reserved1?: string
  type?: string
  sourceModuleIds?: string[]
  [key: string]: any
}

const props = withDefaults(
  defineProps<{
    rows: PrintRow[]
    /** 直接传入列配置（优先级最高，与BomTable当前显示的列一致） */
    columns?: { key: string; label: string }[]
    /** BOM模板类型：order=下单BOM，module=模块BOM（当columns未传入时使用） */
    templateType?: BomTemplateType
    /** 是否显示来源模块列（下单BOM用） */
    showSourceModules?: boolean
    /** 是否显示合计行 */
    showSummary?: boolean
  }>(),
  {
    columns: () => [],
    templateType: 'order',
    showSourceModules: false,
    showSummary: true
  }
)

const modulesStore = useModulesStore()
const bomTemplatesStore = useBomTemplatesStore()

/** 可见列：优先使用传入的columns，否则从BOM条目模板配置中获取 */
const visibleColumns = computed(() => {
  if (props.columns && props.columns.length > 0) {
    return props.columns
  }
  return bomTemplatesStore.getVisibleFieldsByType(props.templateType)
})

/** 检查columns中是否已经包含了来源模块列（避免重复显示） */
const hasSourceModuleColumn = computed(() => {
  return visibleColumns.value.some((c) => c.key === 'sourceModuleIds')
})

const totalQty = computed(() => props.rows.reduce((s, r) => s + (Number(r.quantity) || 0), 0))

/**
 * 格式化单元格值
 * 特殊字段处理：
 * - type: 显示中文标签（装配/下单/两者）
 * - quantity: 显示数字
 * - 空值显示 '-'
 */
function formatCellValue(item: PrintRow, key: string): string {
  if (key === 'type') {
    return typeLabel(item.type)
  }
  if (key === 'sourceModuleIds') {
    return sourceModulesText(item)
  }
  const value = item[key]
  if (value === undefined || value === null || value === '') {
    return '-'
  }
  return String(value)
}

function typeLabel(type?: string): string {
  const map: Record<string, string> = { assembly: '装配', order: '下单', both: '两者' }
  return map[type || ''] || type || '-'
}

function sourceModulesText(item: PrintRow): string {
  const ids = (item as OrderBomItem).sourceModuleIds
  if (!ids || ids.length === 0) return '-'
  return ids.map((id) => modulesStore.getModuleById(id)?.drawingNo || id).join(', ')
}
</script>

<style scoped>
.print-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}

.print-table th,
.print-table td {
  border: 1px solid #333;
  padding: 4px 6px;
  text-align: left;
  word-break: break-all;
}

.print-table th {
  background: #f5f5f5;
  font-weight: 600;
}

.print-table td:nth-child(1) {
  text-align: center;
}
</style>
