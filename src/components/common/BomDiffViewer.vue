<template>
  <div class="bom-diff-viewer">
    <!-- 版本选择栏 -->
    <div class="diff-toolbar">
      <span class="diff-label">对比：</span>
      <el-select
        v-model="leftId"
        placeholder="选择版本A"
        size="small"
        style="width: 180px"
        @change="recompute"
      >
        <el-option
          v-for="v in versions"
          :key="v.id"
          :label="`${v.versionNo}（${formatTime(v.createdAt)}）`"
          :value="v.id"
        />
      </el-select>
      <span class="diff-arrow">vs</span>
      <el-select
        v-model="rightId"
        placeholder="选择版本B"
        size="small"
        style="width: 180px"
        @change="recompute"
      >
        <el-option
          v-for="v in versions"
          :key="v.id"
          :label="`${v.versionNo}（${formatTime(v.createdAt)}）`"
          :value="v.id"
        />
      </el-select>

      <div class="diff-stats">
        <el-tag
          size="small"
          type="success"
        >
          新增 {{ addedCount }}
        </el-tag>
        <el-tag
          size="small"
          type="danger"
        >
          删除 {{ removedCount }}
        </el-tag>
        <el-tag
          size="small"
          type="warning"
        >
          修改 {{ changedCount }}
        </el-tag>
        <el-tag
          size="small"
          type="info"
        >
          一致 {{ unchangedCount }}
        </el-tag>
      </div>

      <el-button
        size="small"
        :icon="Download"
        :disabled="leftId === '' || rightId === ''"
        @click="handleExport"
      >
        导出差异报告
      </el-button>
    </div>

    <el-empty
      v-if="leftId === '' || rightId === ''"
      description="请选择两个版本进行对比"
      :image-size="80"
    />

    <div
      v-else-if="diffs.length === 0"
      class="diff-empty"
    >
      两个版本的 BOM 完全一致
    </div>

    <!-- 差异表格 -->
    <el-table
      v-else
      :data="visibleDiffs"
      size="small"
      border
      row-key="key"
      :row-class-name="rowClassName"
      style="width: 100%; margin-top: 12px"
    >
      <el-table-column type="expand">
        <template #default="{ row }">
          <div
            v-if="row.type === 'changed' && row.fieldDiffs"
            class="diff-field-detail"
          >
            <table class="diff-field-table">
              <thead>
                <tr><th>字段</th><th>版本A</th><th>版本B</th></tr>
              </thead>
              <tbody>
                <tr
                  v-for="fd in row.fieldDiffs"
                  :key="fd.field"
                >
                  <td>{{ getFieldLabel(fd.field) }}</td>
                  <td>{{ formatDiffValue(fd.before) }}</td>
                  <td>{{ formatDiffValue(fd.after) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div
            v-else
            class="diff-field-detail"
          >
            <span class="muted">{{ row.type === 'added' ? '该行为新增条目' : '该行为删除条目' }}</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column
        label="状态"
        width="80"
      >
        <template #default="{ row }">
          <el-tag
            v-if="row.type === 'added'"
            size="small"
            type="success"
          >
            新增
          </el-tag>
          <el-tag
            v-else-if="row.type === 'removed'"
            size="small"
            type="danger"
          >
            删除
          </el-tag>
          <el-tag
            v-else-if="row.type === 'changed'"
            size="small"
            type="warning"
          >
            修改
          </el-tag>
          <el-tag
            v-else
            size="small"
            type="info"
          >
            一致
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        label="物料/目录号"
        width="150"
      >
        <template #default="{ row }">
          {{ row.after?.materialCatalogNo || row.before?.materialCatalogNo || '—' }}
        </template>
      </el-table-column>
      <el-table-column
        label="图号"
        width="120"
      >
        <template #default="{ row }">
          {{ row.after?.drawingNo || row.before?.drawingNo || '—' }}
        </template>
      </el-table-column>
      <el-table-column
        label="中文描述"
        min-width="180"
        show-overflow-tooltip
      >
        <template #default="{ row }">
          {{ row.after?.chineseDescription || row.before?.chineseDescription || '—' }}
        </template>
      </el-table-column>
      <el-table-column
        label="数量"
        width="80"
      >
        <template #default="{ row }">
          <span v-if="row.type === 'added'">{{ row.after?.quantity }}</span>
          <span v-else-if="row.type === 'removed'">{{ row.before?.quantity }}</span>
          <span v-else>
            {{ row.before?.quantity }}
            <span
              v-if="row.before?.quantity !== row.after?.quantity"
              class="qty-arrow"
            >→ {{ row.after?.quantity }}</span>
          </span>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Download } from '@element-plus/icons-vue'
import dayjs from 'dayjs'
import type { BomVersion } from '@/types'
import { diffBomRows, getFieldLabel, formatDiffValue, type BomRowDiff } from '@/utils/diff'
import { exportToExcel } from '@/utils/excel'

const props = defineProps<{
  versions: BomVersion[]
}>()

const leftId = ref('')
const rightId = ref('')
const diffs = ref<BomRowDiff[]>([])

// 默认选中最新两个版本
function initDefaults() {
  const list = [...props.versions].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  if (list.length >= 1) leftId.value = list[0].id
  if (list.length >= 2) rightId.value = list[1].id
}

watch(
  () => props.versions,
  () => {
    initDefaults()
    recompute()
  },
  { immediate: true }
)

async function recompute() {
  if (!leftId.value || !rightId.value) {
    diffs.value = []
    return
  }
  const left = props.versions.find((v) => v.id === leftId.value)
  const right = props.versions.find((v) => v.id === rightId.value)
  if (!left || !right) {
    diffs.value = []
    return
  }
  diffs.value = diffBomRows(left.items || [], right.items || [])
}

// 仅展示非"一致"的行
const visibleDiffs = computed(() => diffs.value.filter((d) => d.type !== 'unchanged'))

const addedCount = computed(() => diffs.value.filter((d) => d.type === 'added').length)
const removedCount = computed(() => diffs.value.filter((d) => d.type === 'removed').length)
const changedCount = computed(() => diffs.value.filter((d) => d.type === 'changed').length)
const unchangedCount = computed(() => diffs.value.filter((d) => d.type === 'unchanged').length)

function rowClassName({ row }: { row: BomRowDiff }): string {
  return `diff-row-${row.type}`
}

function formatTime(iso: string): string {
  return dayjs(iso).format('MM-DD HH:mm')
}

function handleExport() {
  const left = props.versions.find((v) => v.id === leftId.value)
  const right = props.versions.find((v) => v.id === rightId.value)
  const data = visibleDiffs.value.map((d) => {
    let fieldChanges = ''
    if (d.type === 'changed' && d.fieldDiffs) {
      fieldChanges = d.fieldDiffs
        .map((fd) => `${getFieldLabel(fd.field)}: ${formatDiffValue(fd.before)} → ${formatDiffValue(fd.after)}`)
        .join('；')
    }
    return {
      状态: d.type === 'added' ? '新增' : d.type === 'removed' ? '删除' : '修改',
      '物料/目录号': d.after?.materialCatalogNo || d.before?.materialCatalogNo || '',
      图号: d.after?.drawingNo || d.before?.drawingNo || '',
      中文描述: d.after?.chineseDescription || d.before?.chineseDescription || '',
      数量_A: d.before?.quantity ?? '',
      数量_B: d.after?.quantity ?? '',
      字段变化: fieldChanges
    }
  })
  exportToExcel(
    data,
    `BOM差异_${left?.versionNo}_vs_${right?.versionNo}_${dayjs().format('YYYYMMDD_HHmmss')}`,
    'BOM差异'
  )
}
</script>

<style scoped>
.bom-diff-viewer {
  padding: 4px 0;
}
.diff-toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 8px;
}
.diff-label {
  font-size: 14px;
  color: #606266;
}
.diff-arrow {
  color: #909399;
  font-size: 13px;
}
.diff-stats {
  display: flex;
  gap: 6px;
  margin: 0 8px;
}
.diff-empty {
  text-align: center;
  color: #67c23a;
  padding: 40px 0;
}
.diff-field-detail {
  padding: 8px 24px;
}
.diff-field-table {
  width: 100%;
  max-width: 680px;
  border-collapse: collapse;
  font-size: 12px;
}
.diff-field-table th,
.diff-field-table td {
  border: 1px solid #ebeef5;
  padding: 4px 10px;
  text-align: left;
}
.diff-field-table th {
  background: #f5f7fa;
}
.muted {
  color: #909399;
  font-size: 13px;
}
.qty-arrow {
  color: #e6a23c;
  margin-left: 4px;
}
:deep(.diff-row-added td) {
  background: #f0f9eb !important;
}
:deep(.diff-row-removed td) {
  background: #fef0f0 !important;
}
:deep(.diff-row-changed td) {
  background: #fdf6ec !important;
}
</style>
