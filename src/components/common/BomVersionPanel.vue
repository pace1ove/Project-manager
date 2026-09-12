<template>
  <div class="bom-version-panel">
    <!-- 创建版本快照按钮（可选） -->
    <div
      v-if="showCreateButton"
      class="versions-toolbar"
    >
      <el-button
        type="primary"
        size="small"
        :disabled="createDisabled"
        @click="emit('create')"
      >
        <el-icon><Plus /></el-icon>创建版本快照
      </el-button>
    </div>

    <EmptyState
      v-if="versions.length === 0"
      title="暂无BOM版本"
      :description="emptyDescription"
      icon="Box"
    />

    <!-- 版本列表 -->
    <el-table
      v-else
      :data="versions"
      size="small"
      border
      style="margin-bottom: 16px"
    >
      <el-table-column
        label="版本号"
        width="90"
      >
        <template #default="{ row }">
          <el-tag size="small">
            {{ row.versionNo }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        label="版本说明"
        prop="description"
        min-width="180"
        show-overflow-tooltip
      />
      <el-table-column
        label="条目数"
        width="80"
      >
        <template #default="{ row }">
          {{ (row.items || []).length }}
        </template>
      </el-table-column>
      <el-table-column
        label="创建时间"
        width="160"
      >
        <template #default="{ row }">
          {{ formatDate(row.createdAt) }}
        </template>
      </el-table-column>
      <el-table-column
        v-if="showCreatedBy"
        label="创建人"
        width="90"
        prop="createdBy"
      />
      <el-table-column
        label="操作"
        :width="showCreatedBy ? 240 : 200"
        fixed="right"
      >
        <template #default="{ row }">
          <el-button
            link
            type="primary"
            size="small"
            @click="viewVersionDetail(row)"
          >
            查看
          </el-button>
          <el-button
            link
            type="warning"
            size="small"
            @click="emit('rollback', row)"
          >
            回滚
          </el-button>
          <el-button
            link
            type="danger"
            size="small"
            @click="emit('delete', row)"
          >
            删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 差异对比 -->
    <BomDiffViewer
      v-if="versions.length >= 2"
      :versions="versions"
    />

    <!-- ===== 版本详情对话框（只读） ===== -->
    <el-dialog
      v-model="versionDetailVisible"
      :title="`版本 ${versionDetailNo} 详情（只读）`"
      width="900px"
    >
      <div class="version-detail-toolbar">
        <el-input
          v-model="versionDetailSearch"
          placeholder="搜索物料/目录号、图号、中文描述..."
          clearable
          prefix-icon="Search"
          style="width: 320px"
        />
        <div class="toolbar-right">
          <span class="version-detail-count">共 {{ filteredVersionDetailItems.length }} / {{ versionDetailItems.length }} 条</span>
          <el-dropdown
            trigger="click"
            @command="handleColumnToggle"
          >
            <el-button
              size="small"
              :icon="Setting"
            >
              列设置
              <el-icon class="el-icon--right">
                <ArrowDown />
              </el-icon>
            </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item
                  v-for="col in allVersionColumns"
                  :key="col.key"
                  :command="col.key"
                  :class="{ 'is-checked': visibleVersionColumnKeys.includes(col.key) }"
                >
                  <el-icon
                    v-if="visibleVersionColumnKeys.includes(col.key)"
                    class="check-icon"
                  >
                    <Check />
                  </el-icon>
                  <span class="col-label">{{ col.label }}</span>
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </div>
      <el-table
        :data="filteredVersionDetailItems"
        size="small"
        border
        max-height="500"
      >
        <el-table-column
          type="index"
          label="#"
          width="50"
          fixed="left"
        />
        <el-table-column
          v-for="col in visibleVersionColumns"
          :key="col.key"
          :prop="col.key"
          :label="col.label"
          :width="col.width"
          :min-width="col.minWidth"
          :show-overflow-tooltip="col.showOverflowTooltip"
        />
      </el-table>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Plus, Search, Setting, Check, ArrowDown } from '@element-plus/icons-vue'
import dayjs from 'dayjs'
import type { BomVersion } from '@/types'
import BomDiffViewer from './BomDiffViewer.vue'
import EmptyState from './EmptyState.vue'

const props = withDefaults(defineProps<{
  versions: BomVersion[]
  /** 是否显示「创建版本快照」按钮 */
  showCreateButton?: boolean
  /** 创建按钮是否禁用 */
  createDisabled?: boolean
  /** 空状态描述文案 */
  emptyDescription?: string
  /** 是否显示「创建人」列 */
  showCreatedBy?: boolean
}>(), {
  showCreateButton: false,
  createDisabled: false,
  emptyDescription: '点击「创建版本快照」保存当前BOM为一个版本，便于后续差异对比与回滚',
  showCreatedBy: true
})

const emit = defineEmits<{
  (e: 'create'): void
  (e: 'rollback', version: BomVersion): void
  (e: 'delete', version: BomVersion): void
}>()

function formatDate(iso: string): string {
  return dayjs(iso).format('YYYY-MM-DD HH:mm:ss')
}

// ===== 版本详情对话框 =====
const versionDetailVisible = ref(false)
const versionDetailItems = ref<any[]>([])
const versionDetailNo = ref('')
const versionDetailSearch = ref('')

/** 版本详情表格所有可选列配置（图号第一，物料在数量前一列） */
const allVersionColumns = [
  { key: 'drawingNo', label: '图号', width: 120, defaultVisible: true },
  { key: 'chineseDescription', label: '中文描述', minWidth: 160, showOverflowTooltip: true, defaultVisible: true },
  { key: 'englishDescription', label: '英文描述', minWidth: 140, showOverflowTooltip: true, defaultVisible: false },
  { key: 'materialCatalogNo', label: '物料/目录号', width: 140, defaultVisible: true },
  { key: 'jobNo', label: 'JOB号', width: 100, defaultVisible: false },
  { key: 'assemblyUnit', label: '单位', width: 70, defaultVisible: true },
  { key: 'quantity', label: '数量', width: 70, defaultVisible: true },
  { key: 'totalAmount', label: '总金额', width: 90, defaultVisible: false },
  { key: 'spareParts', label: '备件', width: 70, defaultVisible: false },
  { key: 'reserved1', label: '预留1', width: 100, defaultVisible: false },
  { key: 'reserved2', label: '预留2', width: 100, defaultVisible: false },
  { key: 'purchasingBatch', label: '采购批次', width: 100, defaultVisible: false },
  { key: 'remarks', label: '备注', minWidth: 120, showOverflowTooltip: true, defaultVisible: false },
  { key: 'ecnNo', label: 'ECN号', width: 100, defaultVisible: false },
  { key: 'ifKeyParts', label: '是否关键件', width: 90, defaultVisible: false },
  { key: 'type', label: 'BOM类型', width: 90, defaultVisible: false },
  { key: 'source', label: '来源', width: 80, defaultVisible: false }
]

/** 版本详情表格可见列key列表（默认显示的列） */
const visibleVersionColumnKeys = ref<string[]>(
  allVersionColumns.filter((c) => c.defaultVisible).map((c) => c.key)
)

/** 版本详情表格可见列（按allVersionColumns的顺序） */
const visibleVersionColumns = computed(() => {
  return allVersionColumns.filter((c) => visibleVersionColumnKeys.value.includes(c.key))
})

/** 切换列显示/隐藏 */
function handleColumnToggle(key: string) {
  const idx = visibleVersionColumnKeys.value.indexOf(key)
  if (idx >= 0) {
    visibleVersionColumnKeys.value.splice(idx, 1)
  } else {
    visibleVersionColumnKeys.value.push(key)
  }
}

/** 过滤后的版本详情BOM条目 */
const filteredVersionDetailItems = computed(() => {
  const kw = versionDetailSearch.value.trim().toLowerCase()
  if (!kw) return versionDetailItems.value
  return versionDetailItems.value.filter((item) => {
    return (
      String(item.materialCatalogNo || '').toLowerCase().includes(kw) ||
      String(item.drawingNo || '').toLowerCase().includes(kw) ||
      String(item.chineseDescription || '').toLowerCase().includes(kw) ||
      String(item.englishDescription || '').toLowerCase().includes(kw)
    )
  })
})

function viewVersionDetail(row: BomVersion) {
  versionDetailNo.value = row.versionNo
  versionDetailItems.value = row.items || []
  versionDetailSearch.value = ''
  versionDetailVisible.value = true
}
</script>

<style scoped>
.bom-version-panel {
  /* 容器 */
}
.versions-toolbar {
  margin-bottom: 12px;
}
.version-detail-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.toolbar-right {
  display: flex;
  align-items: center;
  gap: 12px;
}
.version-detail-count {
  font-size: 13px;
  color: #909399;
}
.check-icon {
  color: #409eff;
  margin-right: 6px;
}
.col-label {
  display: inline-block;
}
</style>
