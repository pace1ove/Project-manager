<template>
  <div class="change-history-list">
    <!-- 工具栏：筛选 + 导出 -->
    <div class="ch-toolbar">
      <el-select
        v-model="filterOperation"
        placeholder="操作类型"
        clearable
        size="small"
        style="width: 150px"
        @change="applyFilter"
      >
        <el-option
          label="创建/新增"
          value="create"
        />
        <el-option
          label="更新/修改"
          value="update"
        />
        <el-option
          label="删除"
          value="delete"
        />
        <el-option
          label="回滚"
          value="rollback"
        />
        <el-option
          label="导入/生成"
          value="import"
        />
      </el-select>

      <el-date-picker
        v-model="dateRange"
        type="daterange"
        range-separator="至"
        start-placeholder="开始日期"
        end-placeholder="结束日期"
        size="small"
        value-format="YYYY-MM-DD"
        style="width: 260px"
        @change="applyFilter"
      />

      <el-input
        v-model="keyword"
        placeholder="搜索详情/备注"
        clearable
        size="small"
        style="width: 200px"
        @input="applyFilter"
      >
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
      </el-input>

      <div class="ch-toolbar-right">
        <el-button
          size="small"
          :icon="Download"
          :disabled="filteredRecords.length === 0"
          @click="handleExport"
        >
          导出Excel
        </el-button>
      </div>
    </div>

    <!-- 空状态 -->
    <el-empty
      v-if="filteredRecords.length === 0"
      description="暂无变更记录"
      :image-size="80"
    />

    <!-- 时间线 -->
    <el-timeline
      v-else
      class="ch-timeline"
    >
      <el-timeline-item
        v-for="record in filteredRecords"
        :key="record.id"
        :timestamp="dayjs(record.timestamp).format('YYYY-MM-DD HH:mm:ss')"
        placement="top"
        :type="timelineType(record.operation)"
      >
        <div class="ch-item">
          <div class="ch-item-head">
            <el-tag
              size="small"
              :type="tagType(record.operation)"
            >
              {{ record.operation }}
            </el-tag>
            <span class="ch-detail">{{ record.detail }}</span>
            <span class="ch-operator">操作人：{{ record.operator }}</span>
          </div>

          <div
            v-if="record.remark"
            class="ch-remark"
          >
            备注：{{ record.remark }}
          </div>

          <!-- diff 展开/收起 -->
          <div
            v-if="hasDiff(record)"
            class="ch-diff"
          >
            <el-button
              link
              size="small"
              @click="toggleExpand(record.id)"
            >
              <el-icon><ArrowDown v-if="!expandedIds[record.id]" /><ArrowUp v-else /></el-icon>
              {{ expandedIds[record.id] ? '收起详情' : '查看字段对比' }}
            </el-button>
            <div
              v-if="expandedIds[record.id]"
              class="ch-diff-body"
            >
              <table class="ch-diff-table">
                <thead>
                  <tr><th>字段</th><th>修改前</th><th>修改后</th></tr>
                </thead>
                <tbody>
                  <tr
                    v-for="d in computeDiff(record)"
                    :key="d.field"
                    :class="`diff-${d.type}`"
                  >
                    <td>{{ getFieldLabel(d.field) }}</td>
                    <td>{{ formatDiffValue(d.before) }}</td>
                    <td>{{ formatDiffValue(d.after) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- 回滚按钮：仅对"更新"类操作显示 -->
          <div
            v-if="showRollback && canRollback(record)"
            class="ch-actions"
          >
            <el-button
              size="small"
              type="warning"
              plain
              @click="handleRollback(record)"
            >
              回滚到此版本
            </el-button>
          </div>
        </div>
      </el-timeline-item>
    </el-timeline>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Download, ArrowDown, ArrowUp } from '@element-plus/icons-vue'
import dayjs from 'dayjs'
import type { ChangeRecord } from '@/types'
import { diffObjects, getFieldLabel, formatDiffValue, type FieldDiff } from '@/utils/diff'
import { exportToExcel } from '@/utils/excel'

const props = withDefaults(
  defineProps<{
    records: ChangeRecord[]
    /** 是否显示回滚按钮（仅对"更新"操作生效） */
    showRollback?: boolean
  }>(),
  { showRollback: false }
)

const emit = defineEmits<{
  (e: 'rollback', record: ChangeRecord): void
}>()

// ===== 筛选 =====
const filterOperation = ref('')
const dateRange = ref<[string, string] | null>(null)
const keyword = ref('')

const expandedIds = ref<Record<string, boolean>>({})

function applyFilter() {
  // 计算属性自动响应，此处保留钩子以便扩展
}

const filteredRecords = computed<ChangeRecord[]>(() => {
  let list = [...props.records].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  )
  if (filterOperation.value) {
    list = list.filter((r) => matchOperation(r.operation, filterOperation.value))
  }
  if (dateRange.value && dateRange.value.length === 2) {
    const start = dayjs(dateRange.value[0]).startOf('day').valueOf()
    const end = dayjs(dateRange.value[1]).endOf('day').valueOf()
    list = list.filter((r) => {
      const t = new Date(r.timestamp).getTime()
      return t >= start && t <= end
    })
  }
  if (keyword.value && keyword.value.trim()) {
    const kw = keyword.value.trim().toLowerCase()
    list = list.filter(
      (r) =>
        (r.detail || '').toLowerCase().includes(kw) ||
        (r.remark || '').toLowerCase().includes(kw) ||
        (r.operation || '').toLowerCase().includes(kw)
    )
  }
  return list
})

function matchOperation(op: string, filter: string): boolean {
  if (filter === 'create') return op.includes('创建') || op.includes('新增')
  if (filter === 'update') return op.includes('更新') || op.includes('修改') || op.includes('配置') || op.includes('序列号')
  if (filter === 'delete') return op.includes('删除') || op.includes('取消')
  if (filter === 'rollback') return op.includes('回滚')
  if (filter === 'import') return op.includes('导入') || op.includes('生成')
  return true
}

// ===== diff =====
function hasDiff(record: ChangeRecord): boolean {
  return record.beforeData !== undefined || record.afterData !== undefined
}

function computeDiff(record: ChangeRecord): FieldDiff[] {
  return diffObjects(record.beforeData, record.afterData)
}

function toggleExpand(id: string) {
  expandedIds.value[id] = !expandedIds.value[id]
}

// ===== 标签样式 =====
function tagType(op: string): 'success' | 'warning' | 'danger' | 'info' | 'primary' {
  if (op.includes('创建') || op.includes('新增')) return 'success'
  if (op.includes('删除') || op.includes('取消')) return 'danger'
  if (op.includes('回滚')) return 'warning'
  if (op.includes('更新') || op.includes('修改')) return 'primary'
  if (op.includes('导入') || op.includes('生成')) return 'success'
  return 'info'
}

function timelineType(op: string): 'primary' | 'success' | 'warning' | 'danger' | 'info' {
  if (op.includes('创建') || op.includes('新增') || op.includes('导入') || op.includes('生成')) return 'success'
  if (op.includes('删除') || op.includes('取消')) return 'danger'
  if (op.includes('回滚')) return 'warning'
  if (op.includes('更新') || op.includes('修改')) return 'primary'
  return 'info'
}

// ===== 回滚 =====
function canRollback(record: ChangeRecord): boolean {
  // 仅对"更新"类操作且有 beforeData 的记录允许回滚
  return record.operation.includes('更新') && record.beforeData !== undefined
}

async function handleRollback(record: ChangeRecord) {
  try {
    await ElMessageBox.confirm(
      '回滚将把基本信息字段恢复到该次更新之前的值，此操作会记录到变更历史。BOM 条目类变更不自动回滚。是否继续？',
      '回滚确认',
      { confirmButtonText: '确定回滚', cancelButtonText: '取消', type: 'warning' }
    )
    emit('rollback', record)
  } catch {
    ElMessage.info('已取消回滚')
  }
}

// ===== 导出 Excel =====
function handleExport() {
  const data = filteredRecords.value.map((r) => ({
    时间: dayjs(r.timestamp).format('YYYY-MM-DD HH:mm:ss'),
    操作类型: r.operation,
    详情: r.detail,
    操作人: r.operator,
    备注: r.remark || ''
  }))
  exportToExcel(data, `变更历史_${dayjs().format('YYYYMMDD_HHmmss')}`, '变更历史')
}
</script>

<style scoped>
.change-history-list {
  padding: 8px 0;
}
.ch-toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}
.ch-toolbar-right {
  margin-left: auto;
}
.ch-timeline {
  padding-left: 6px;
}
.ch-item {
  padding-bottom: 4px;
}
.ch-item-head {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.ch-detail {
  font-size: 14px;
  color: #303133;
}
.ch-operator {
  font-size: 12px;
  color: #909399;
  margin-left: auto;
}
.ch-remark {
  font-size: 12px;
  color: #e6a23c;
  margin-top: 4px;
}
.ch-diff {
  margin-top: 6px;
}
.ch-diff-body {
  margin-top: 6px;
}
.ch-diff-table {
  width: 100%;
  max-width: 720px;
  border-collapse: collapse;
  font-size: 12px;
}
.ch-diff-table th,
.ch-diff-table td {
  border: 1px solid #ebeef5;
  padding: 4px 10px;
  text-align: left;
}
.ch-diff-table th {
  background: #f5f7fa;
  font-weight: 600;
}
.diff-added {
  background: #f0f9eb;
}
.diff-removed {
  background: #fef0f0;
}
.diff-changed {
  background: #fdf6ec;
}
.ch-actions {
  margin-top: 6px;
}
</style>
