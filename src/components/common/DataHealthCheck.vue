<template>
  <div class="data-health-check">
    <div class="action-bar">
      <el-button
        type="primary"
        :loading="checking"
        @click="runCheck"
      >
        <el-icon style="margin-right: 4px">
          <Search />
        </el-icon>
        {{ hasRun ? '重新检测' : '开始检测' }}
      </el-button>
      <el-button
        type="warning"
        :disabled="!fixableCount || fixing"
        :loading="fixing"
        @click="fixAll"
      >
        <el-icon style="margin-right: 4px">
          <MagicStick />
        </el-icon>
        一键修复（{{ fixableCount }} 项）
      </el-button>
      <el-button
        :disabled="issues.length === 0"
        @click="exportReport"
      >
        <el-icon style="margin-right: 4px">
          <Download />
        </el-icon>
        导出检测报告
      </el-button>
    </div>

    <!-- 概览 -->
    <div
      v-if="hasRun"
      class="summary"
    >
      <el-tag
        :type="issueCount === 0 ? 'success' : 'danger'"
        size="large"
      >
        共发现 {{ issueCount }} 个问题
      </el-tag>
      <el-tag
        type="danger"
        effect="plain"
        style="margin-left: 8px;"
      >
        错误 {{ errorCount }}
      </el-tag>
      <el-tag
        type="warning"
        effect="plain"
        style="margin-left: 8px;"
      >
        警告 {{ warningCount }}
      </el-tag>
    </div>

    <el-empty
      v-if="hasRun && issueCount === 0"
      description="未发现数据问题，数据健康"
    />

    <el-table
      v-if="issues.length > 0"
      :data="issues"
      stripe
      style="width: 100%; margin-top: 12px;"
    >
      <el-table-column
        label="级别"
        width="80"
        align="center"
      >
        <template #default="{ row }">
          <el-tag
            :type="row.severity === 'error' ? 'danger' : 'warning'"
            size="small"
          >
            {{ row.severity === 'error' ? '错误' : '警告' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        prop="type"
        label="问题类型"
        width="170"
      >
        <template #default="{ row }">
          {{ typeLabel(row.type) }}
        </template>
      </el-table-column>
      <el-table-column
        prop="targetName"
        label="涉及数据"
        min-width="180"
        show-overflow-tooltip
      />
      <el-table-column
        prop="detail"
        label="问题详情"
        min-width="260"
        show-overflow-tooltip
      />
      <el-table-column
        prop="suggestion"
        label="修复建议"
        min-width="200"
        show-overflow-tooltip
      />
      <el-table-column
        label="操作"
        width="110"
        align="center"
        fixed="right"
      >
        <template #default="{ row }">
          <el-button
            v-if="row.fixable"
            type="primary"
            link
            size="small"
            :loading="fixingId === row.id"
            @click="fixOne(row)"
          >
            修复
          </el-button>
          <span
            v-else
            class="no-fix"
          >需人工处理</span>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, MagicStick, Download } from '@element-plus/icons-vue'
import * as XLSX from 'xlsx'
import dayjs from 'dayjs'
import {
  detectAllIssues,
  fixIssue,
  fixAllFixable,
  type HealthIssue
} from '@/utils/dataHealthCheck'
import { notifyDbError } from '@/utils/dbErrorHandler'
import { useEquipmentStore } from '@/stores/equipment'
import { useModulesStore } from '@/stores/modules'
import { useProjectsStore } from '@/stores/projects'

const equipmentStore = useEquipmentStore()
const modulesStore = useModulesStore()
const projectsStore = useProjectsStore()

const issues = ref<HealthIssue[]>([])
const checking = ref(false)
const fixing = ref(false)
const fixingId = ref('')
const hasRun = ref(false)

const issueCount = computed(() => issues.value.length)
const errorCount = computed(() => issues.value.filter((i) => i.severity === 'error').length)
const warningCount = computed(() => issues.value.filter((i) => i.severity === 'warning').length)
const fixableCount = computed(() => issues.value.filter((i) => i.fixable).length)

function typeLabel(type: string): string {
  const map: Record<string, string> = {
    invalid_parent_module: '父组件无效',
    invalid_equipment_ref: '设备引用无效',
    invalid_config_ref: '配置引用无效',
    invalid_project_module_ref: '项目组件引用无效',
    invalid_project_config_ref: '项目配置引用无效',
    invalid_serial_ref: '序列号引用无效',
    unknown_bom_field: '未登记BOM字段',
    circular_module_ref: '组件循环引用'
  }
  return map[type] || type
}

async function runCheck() {
  checking.value = true
  try {
    issues.value = await detectAllIssues()
    hasRun.value = true
    if (issues.value.length === 0) {
      ElMessage.success('未发现数据问题')
    } else {
      ElMessage.warning(`发现 ${issues.value.length} 个问题`)
    }
  } catch (e) {
    notifyDbError(e, '数据检测')
    ElMessage.error('检测失败，请检查控制台')
  } finally {
    checking.value = false
  }
}

async function reloadStores() {
  await Promise.all([
    equipmentStore.initialize(),
    modulesStore.initialize(),
    projectsStore.initialize()
  ])
}

async function fixOne(issue: HealthIssue) {
  fixingId.value = issue.id
  try {
    await fixIssue(issue)
    ElMessage.success('已修复')
    issues.value = issues.value.filter((i) => i.id !== issue.id)
    await reloadStores()
  } catch (e) {
    notifyDbError(e, '修复数据问题')
    ElMessage.error('修复失败')
  } finally {
    fixingId.value = ''
  }
}

async function fixAll() {
  try {
    await ElMessageBox.confirm(
      `将自动修复 ${fixableCount.value} 个可自动修复的问题，是否继续？`,
      '一键修复确认',
      { type: 'warning', confirmButtonText: '开始修复', cancelButtonText: '取消' }
    )
  } catch {
    return
  }
  fixing.value = true
  try {
    const { fixed, skipped } = await fixAllFixable(issues.value)
    ElMessage.success(`已修复 ${fixed} 个问题${skipped ? `，${skipped} 个跳过` : ''}`)
    issues.value = issues.value.filter((i) => !i.fixable)
    await reloadStores()
  } catch (e) {
    notifyDbError(e, '一键修复数据')
    ElMessage.error('修复失败')
  } finally {
    fixing.value = false
  }
}

function exportReport() {
  const data = issues.value.map((i, idx) => ({
    序号: idx + 1,
    级别: i.severity === 'error' ? '错误' : '警告',
    问题类型: typeLabel(i.type),
    涉及数据: i.targetName,
    数据ID: i.targetId,
    问题详情: i.detail,
    修复建议: i.suggestion,
    是否可自动修复: i.fixable ? '是' : '否'
  }))
  const ws = XLSX.utils.json_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '数据健康报告')
  XLSX.writeFile(wb, `数据健康检查报告_${dayjs().format('YYYYMMDD_HHmmss')}.xlsx`)
  ElMessage.success('报告已导出')
}
</script>

<style scoped>
.data-health-check {
  padding: 4px;
}

.action-bar {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
}

.summary {
  display: flex;
  align-items: center;
}

.no-fix {
  color: #c0c4cc;
  font-size: 12px;
}
</style>
