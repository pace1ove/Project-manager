<template>
  <!-- 存储信息 -->
  <el-card
    shadow="never"
    class="data-card"
    style="margin-bottom: 16px;"
  >
    <template #header>
      <div class="card-header">
        <span>存储信息</span>
        <el-tag
          type="info"
          size="small"
        >
          IndexedDB
        </el-tag>
      </div>
    </template>
    <el-row :gutter="16">
      <el-col :span="4.8">
        <div class="storage-stat-item">
          <div class="storage-stat-label">
            设备数
          </div>
          <div class="storage-stat-value">
            {{ equipmentCount }}
          </div>
        </div>
      </el-col>
      <el-col :span="4.8">
        <div class="storage-stat-item">
          <div class="storage-stat-label">
            模块数
          </div>
          <div class="storage-stat-value">
            {{ moduleCount }}
          </div>
        </div>
      </el-col>
      <el-col :span="4.8">
        <div class="storage-stat-item">
          <div class="storage-stat-label">
            项目数
          </div>
          <div class="storage-stat-value">
            {{ projectCount }}
          </div>
        </div>
      </el-col>
      <el-col :span="4.8">
        <div class="storage-stat-item">
          <div class="storage-stat-label">
            零件库
          </div>
          <div class="storage-stat-value">
            {{ partsCount }}
          </div>
        </div>
      </el-col>
      <el-col :span="4.8">
        <div class="storage-stat-item">
          <div class="storage-stat-label">
            BOM条目总数
          </div>
          <div class="storage-stat-value">
            {{ bomItemCount + orderBomCount }}
          </div>
        </div>
      </el-col>
    </el-row>
    <el-divider style="margin: 12px 0;" />
    <div class="storage-usage">
      <span class="storage-usage-label">估算存储用量：</span>
      <el-progress
        :percentage="storageUsagePercent"
        :stroke-width="14"
        :text-inside="true"
        :status="storageUsagePercent > 80 ? 'exception' : 'success'"
        style="flex: 1; max-width: 400px;"
      />
      <span class="storage-usage-text">{{ storageUsageText }}</span>
    </div>
  </el-card>

  <!-- 数据导入/导出 -->
  <el-card
    shadow="never"
    class="data-card"
    style="margin-bottom: 16px;"
  >
    <template #header>
      <span>数据导入 / 导出</span>
    </template>
    <el-row :gutter="24">
      <el-col :span="12">
        <div class="io-section">
          <div class="io-section-header">
            <el-icon class="io-icon">
              <Download />
            </el-icon>
            <span class="io-title">导出数据</span>
          </div>
          <p class="io-description">
            将所有数据导出为JSON备份文件，包含设备、模块、项目、BOM条目、零件库、标签、模板等全部数据。
          </p>
          <el-button
            type="primary"
            :loading="exporting"
            @click="openExportDialog"
          >
            <el-icon style="margin-right: 4px">
              <Download />
            </el-icon>
            导出为JSON
          </el-button>
        </div>
      </el-col>
      <el-col :span="12">
        <div class="io-section">
          <div class="io-section-header">
            <el-icon class="io-icon">
              <Upload />
            </el-icon>
            <span class="io-title">导入数据</span>
          </div>
          <p class="io-description">
            从JSON备份文件恢复数据，导入前可预览数据统计，导入将覆盖现有数据。
          </p>
          <el-button
            type="success"
            :loading="importing"
            @click="openImportDialog"
          >
            <el-icon style="margin-right: 4px">
              <Upload />
            </el-icon>
            从JSON导入
          </el-button>
        </div>
      </el-col>
    </el-row>
  </el-card>

  <!-- 数据健康检查 -->
  <el-card
    shadow="never"
    class="data-card"
    style="margin-bottom: 16px;"
  >
    <template #header>
      <div class="card-header">
        <span>数据健康检查</span>
        <el-tag
          type="info"
          size="small"
        >
          孤儿数据 / 无效引用 / 循环引用
        </el-tag>
      </div>
    </template>
    <p class="data-description">
      自动扫描数据库，检测孤儿组件、无效引用（设备/配置/序列号/项目）、BOM 未登记字段、组件父子循环引用等问题，并支持一键修复。
    </p>
    <DataHealthCheck />
  </el-card>

  <!-- 数据存储位置 -->
  <el-card
    shadow="never"
    class="data-card"
    style="margin-bottom: 16px;"
  >
    <template #header>
      <div class="card-header">
        <span>数据存储位置</span>
        <el-tag
          v-if="!isElectron"
          type="info"
          size="small"
        >
          仅Electron桌面版可用
        </el-tag>
      </div>
    </template>
    <div class="data-path-info">
      <el-descriptions
        :column="1"
        border
        size="small"
      >
        <el-descriptions-item label="当前存储路径">
          <span class="path-text">{{ dataPathInfo.currentPath || '加载中...' }}</span>
          <el-button
            link
            type="primary"
            :disabled="!isElectron"
            @click="handleOpenDataFolder"
          >
            <el-icon><FolderOpened /></el-icon> 打开目录
          </el-button>
        </el-descriptions-item>
        <el-descriptions-item label="默认存储路径">
          <span class="path-text">{{ dataPathInfo.defaultPath || '加载中...' }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag
            :type="dataPathInfo.isDefault ? 'success' : 'warning'"
            size="small"
          >
            {{ dataPathInfo.isDefault ? '使用默认路径' : '使用自定义路径' }}
          </el-tag>
        </el-descriptions-item>
      </el-descriptions>
    </div>
    <div class="data-path-actions">
      <el-button
        type="primary"
        :disabled="!isElectron || pathChanging"
        @click="handleSelectDataPath"
      >
        <el-icon style="margin-right: 4px">
          <Folder />
        </el-icon>
        更改存储路径
      </el-button>
      <el-button
        :disabled="!isElectron || dataPathInfo.isDefault || pathChanging"
        @click="handleResetDataPath"
      >
        <el-icon style="margin-right: 4px">
          <RefreshLeft />
        </el-icon>
        恢复默认路径
      </el-button>
      <el-button
        type="success"
        :disabled="!isElectron || !pendingPath || migrating"
        @click="handleMigrateData"
      >
        <el-icon style="margin-right: 4px">
          <Download />
        </el-icon>
        迁移数据到新路径
      </el-button>
    </div>
    <div
      v-if="pendingPath"
      class="pending-path-notice"
    >
      <el-alert
        type="warning"
        :closable="false"
        show-icon
        title="路径已更改，待生效"
      >
        <template #default>
          <p>新路径：<code>{{ pendingPath }}</code></p>
          <p>您可以选择"迁移数据到新路径"将现有数据复制过去，或直接重启应用使用空数据目录。</p>
          <div style="margin-top: 8px;">
            <el-button
              type="primary"
              size="small"
              :disabled="!isElectron"
              @click="handleRestartApp"
            >
              立即重启应用
            </el-button>
            <el-button
              size="small"
              @click="pendingPath = ''"
            >
              取消更改
            </el-button>
          </div>
        </template>
      </el-alert>
    </div>
    <div class="data-path-tips">
      <el-text
        type="info"
        size="small"
      >
        提示：更改存储路径后需要重启应用才能生效。数据包括IndexedDB数据库、LocalStorage配置、缓存等。
      </el-text>
    </div>
  </el-card>

  <!-- 数据重置 -->
  <el-card
    shadow="never"
    class="data-card danger-card"
  >
    <template #header>
      <div class="card-header">
        <span class="danger-title">数据重置</span>
        <el-tag
          type="danger"
          size="small"
        >
          危险操作
        </el-tag>
      </div>
    </template>
    <p class="data-description">
      此操作将清除系统中的所有数据（设备、组件、项目、BOM条目、零件库、标签、模板等），清除后系统将为空，需要手动创建数据。
      <br>
      <strong style="color: #f56c6c;">警告：此操作不可撤销，请谨慎操作。建议先导出数据备份。</strong>
    </p>
    <div class="data-stats">
      <el-descriptions
        :column="3"
        border
        size="small"
      >
        <el-descriptions-item label="设备数量">
          {{ equipmentCount }}
        </el-descriptions-item>
        <el-descriptions-item label="组件数量">
          {{ moduleCount }}
        </el-descriptions-item>
        <el-descriptions-item label="项目数量">
          {{ projectCount }}
        </el-descriptions-item>
        <el-descriptions-item label="零件库数量">
          {{ partsCount }}
        </el-descriptions-item>
        <el-descriptions-item label="BOM条目数">
          {{ bomItemCount }}
        </el-descriptions-item>
        <el-descriptions-item label="下单BOM数">
          {{ orderBomCount }}
        </el-descriptions-item>
        <el-descriptions-item label="标签数量">
          {{ tagCount }}
        </el-descriptions-item>
      </el-descriptions>
    </div>
    <div class="data-actions">
      <el-button
        type="danger"
        :loading="clearing"
        @click="handleClearDemoData"
      >
        <el-icon style="margin-right: 4px">
          <RefreshLeft />
        </el-icon>
        清除所有数据
      </el-button>
    </div>
  </el-card>

  <!-- 导出预览弹窗 -->
  <el-dialog
    v-model="exportDialogVisible"
    title="导出数据预览"
    width="560px"
  >
    <el-alert
      type="info"
      :closable="false"
      show-icon
      title="以下为即将导出的数据统计"
      style="margin-bottom: 16px;"
    />
    <el-descriptions
      :column="2"
      border
      size="default"
    >
      <el-descriptions-item label="设备数">
        {{ exportStats.equipment }}
      </el-descriptions-item>
      <el-descriptions-item label="配置数">
        {{ exportStats.configurations }}
      </el-descriptions-item>
      <el-descriptions-item label="序列号数">
        {{ exportStats.serials }}
      </el-descriptions-item>
      <el-descriptions-item label="模块数">
        {{ exportStats.modules }}
      </el-descriptions-item>
      <el-descriptions-item label="模块BOM条目">
        {{ exportStats.bomItems }}
      </el-descriptions-item>
      <el-descriptions-item label="项目数">
        {{ exportStats.projects }}
      </el-descriptions-item>
      <el-descriptions-item label="下单BOM条目">
        {{ exportStats.orderBomItems }}
      </el-descriptions-item>
      <el-descriptions-item label="零件库数量">
        {{ exportStats.parts }}
      </el-descriptions-item>
      <el-descriptions-item label="更改记录">
        {{ exportStats.changeRecords }}
      </el-descriptions-item>
      <el-descriptions-item label="标签数">
        {{ exportStats.tags }}
      </el-descriptions-item>
      <el-descriptions-item label="项目类型">
        {{ exportStats.projectTypes }}
      </el-descriptions-item>
      <el-descriptions-item label="模板字段">
        {{ exportStats.bomTemplates }}
      </el-descriptions-item>
      <el-descriptions-item label="导出格式">
        JSON
      </el-descriptions-item>
    </el-descriptions>
    <el-form
      label-width="100px"
      style="margin-top: 16px;"
    >
      <el-form-item label="文件名">
        <el-input
          v-model="exportFileName"
          placeholder="bom_backup"
        >
          <template #append>
            .json
          </template>
        </el-input>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="exportDialogVisible = false">
        取消
      </el-button>
      <el-button
        type="primary"
        :loading="exporting"
        @click="confirmExport"
      >
        确认导出
      </el-button>
    </template>
  </el-dialog>

  <!-- 导入向导弹窗 -->
  <el-dialog
    v-model="importDialogVisible"
    title="导入数据"
    width="640px"
    :close-on-click-modal="false"
    @close="resetImportWizard"
  >
    <el-steps
      :active="importStep"
      finish-status="success"
      align-center
      style="margin-bottom: 24px;"
    >
      <el-step title="选择文件" />
      <el-step title="校验确认" />
      <el-step title="导入完成" />
    </el-steps>

    <!-- Step 1: 选择文件 -->
    <div
      v-if="importStep === 0"
      class="import-step-content"
    >
      <el-upload
        drag
        :auto-upload="false"
        :show-file-list="false"
        accept=".json"
        :on-change="handleImportFileSelect"
      >
        <el-icon class="el-icon--upload">
          <UploadFilled />
        </el-icon>
        <div class="el-upload__text">
          将JSON文件拖到此处，或<em>点击上传</em>
        </div>
        <template #tip>
          <div class="el-upload__tip">
            仅支持 .json 格式的备份文件
          </div>
        </template>
      </el-upload>
      <div
        v-if="importFileName"
        class="import-file-info"
      >
        <el-icon><Document /></el-icon>
        <span>{{ importFileName }}</span>
        <el-tag
          size="small"
          type="success"
        >
          已选择
        </el-tag>
      </div>
    </div>

    <!-- Step 2: 校验确认 -->
    <div
      v-else-if="importStep === 1"
      class="import-step-content"
    >
      <el-alert
        type="warning"
        :closable="false"
        show-icon
        title="导入将覆盖现有所有数据，请确认以下数据统计"
        style="margin-bottom: 16px;"
      />
      <el-descriptions
        :column="2"
        border
        size="default"
      >
        <el-descriptions-item label="设备数">
          {{ importStats.equipment }}
        </el-descriptions-item>
        <el-descriptions-item label="配置数">
          {{ importStats.configurations }}
        </el-descriptions-item>
        <el-descriptions-item label="序列号数">
          {{ importStats.serials }}
        </el-descriptions-item>
        <el-descriptions-item label="模块数">
          {{ importStats.modules }}
        </el-descriptions-item>
        <el-descriptions-item label="模块BOM条目">
          {{ importStats.bomItems }}
        </el-descriptions-item>
        <el-descriptions-item label="项目数">
          {{ importStats.projects }}
        </el-descriptions-item>
        <el-descriptions-item label="下单BOM条目">
          {{ importStats.orderBomItems }}
        </el-descriptions-item>
        <el-descriptions-item label="零件库数量">
          {{ importStats.parts }}
        </el-descriptions-item>
        <el-descriptions-item label="更改记录">
          {{ importStats.changeRecords }}
        </el-descriptions-item>
        <el-descriptions-item label="标签数">
          {{ importStats.tags }}
        </el-descriptions-item>
        <el-descriptions-item label="项目类型">
          {{ importStats.projectTypes }}
        </el-descriptions-item>
        <el-descriptions-item label="模板字段">
          {{ importStats.bomTemplates }}
        </el-descriptions-item>
      </el-descriptions>
      <el-checkbox
        v-model="importConfirmOverride"
        style="margin-top: 16px;"
      >
        我已了解，确认覆盖现有所有数据
      </el-checkbox>
    </div>

    <!-- Step 3: 导入完成 -->
    <div
      v-else-if="importStep === 2"
      class="import-step-content"
    >
      <div
        v-if="importing"
        class="import-progress"
      >
        <el-progress
          :percentage="importProgress"
          :stroke-width="18"
          status="success"
        />
        <p class="import-progress-text">
          {{ importProgressText }}
        </p>
      </div>
      <div
        v-else
        class="import-complete"
      >
        <el-result
          icon="success"
          title="导入完成"
          sub-title="数据已成功导入，页面即将刷新"
        >
          <template #extra>
            <el-button
              type="primary"
              @click="handleImportCompleteRefresh"
            >
              立即刷新
            </el-button>
          </template>
        </el-result>
      </div>
    </div>

    <template #footer>
      <template v-if="importStep === 0">
        <el-button @click="importDialogVisible = false">
          取消
        </el-button>
        <el-button
          type="primary"
          :disabled="!importFileName"
          @click="validateImportFile"
        >
          下一步
        </el-button>
      </template>
      <template v-else-if="importStep === 1">
        <el-button @click="importStep = 0">
          上一步
        </el-button>
        <el-button
          type="danger"
          :disabled="!importConfirmOverride"
          :loading="importing"
          @click="confirmImport"
        >
          确认导入
        </el-button>
      </template>
      <template v-else>
        <el-button
          v-if="!importing"
          @click="importDialogVisible = false"
        >
          关闭
        </el-button>
      </template>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Download, Upload, UploadFilled, Document, RefreshLeft, Folder, FolderOpened
} from '@element-plus/icons-vue'
import { useEquipmentStore } from '@/stores/equipment'
import { useModulesStore } from '@/stores/modules'
import { useProjectsStore } from '@/stores/projects'
import { useTagsStore } from '@/stores/tags'
import { usePartsStore } from '@/stores/parts'
import { db } from '@/db/index'
import { notifyDbError } from '@/utils/dbErrorHandler'
import DataHealthCheck from '@/components/common/DataHealthCheck.vue'

const equipmentStore = useEquipmentStore()
const modulesStore = useModulesStore()
const projectsStore = useProjectsStore()
const tagsStore = useTagsStore()
const partsStore = usePartsStore()

// ===== 数据管理 =====
const clearing = ref(false)
const bomItemCount = ref(0)
const orderBomCount = ref(0)

// ===== 存储用量估算 =====
const storageUsageBytes = ref(0)
const storageQuotaBytes = ref(0)

const storageUsagePercent = computed(() => {
  if (storageQuotaBytes.value === 0) return 0
  return Math.min(100, Math.round((storageUsageBytes.value / storageQuotaBytes.value) * 100))
})

const storageUsageText = computed(() => {
  const used = formatBytes(storageUsageBytes.value)
  const total = formatBytes(storageQuotaBytes.value)
  return storageQuotaBytes.value > 0 ? `${used} / ${total}` : `${used}（配额未知）`
})

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

async function estimateStorageUsage() {
  try {
    if (navigator.storage && navigator.storage.estimate) {
      const estimate = await navigator.storage.estimate()
      storageUsageBytes.value = estimate.usage || 0
      storageQuotaBytes.value = estimate.quota || 0
    }
  } catch {
    // 浏览器不支持，忽略
  }
}

// ===== 数据存储路径 =====
const isElectron = computed(() => !!window.electronAPI)
const pathChanging = ref(false)
const migrating = ref(false)
const pendingPath = ref('')
const dataPathInfo = reactive({
  currentPath: '',
  defaultPath: '',
  isDefault: true
})

async function loadDataPathInfo() {
  if (!window.electronAPI) return
  try {
    const info = await window.electronAPI.getDataPath()
    dataPathInfo.currentPath = info.currentPath
    dataPathInfo.defaultPath = info.defaultPath
    dataPathInfo.isDefault = info.isDefault
  } catch (error) {
    notifyDbError(error, '加载数据路径信息')
  }
}

async function handleSelectDataPath() {
  if (!window.electronAPI) return
  try {
    const result = await window.electronAPI.selectDataPath()
    if (result.canceled || !result.path) return

    try {
      await ElMessageBox.confirm(
        `确定要将数据存储路径更改为：\n${result.path}\n\n更改后需要重启应用才能生效。您可以选择是否迁移现有数据。`,
        '更改数据存储路径',
        {
          confirmButtonText: '确定更改',
          cancelButtonText: '取消',
          type: 'warning'
        }
      )
    } catch {
      return
    }

    pathChanging.value = true
    const saveResult = await window.electronAPI.saveDataPath(result.path)
    if (saveResult.success) {
      pendingPath.value = result.path
      ElMessage.success(saveResult.message || '路径已保存')
    } else {
      ElMessage.error(saveResult.error || '保存路径失败')
    }
  } catch (error) {
    notifyDbError(error, '选择数据路径')
    ElMessage.error('选择路径失败')
  } finally {
    pathChanging.value = false
  }
}

async function handleResetDataPath() {
  if (!window.electronAPI) return
  try {
    await ElMessageBox.confirm(
      '确定要恢复默认数据存储路径吗？恢复后需要重启应用才能生效。',
      '恢复默认路径',
      {
        confirmButtonText: '确定恢复',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
  } catch {
    return
  }

  pathChanging.value = true
  try {
    const result = await window.electronAPI.resetDataPath()
    if (result.success) {
      pendingPath.value = result.defaultPath || ''
      ElMessage.success(result.message || '已恢复默认路径')
    } else {
      ElMessage.error(result.error || '恢复默认路径失败')
    }
  } catch (error) {
    notifyDbError(error, '恢复默认路径')
    ElMessage.error('恢复默认路径失败')
  } finally {
    pathChanging.value = false
  }
}

async function handleMigrateData() {
  if (!window.electronAPI || !pendingPath.value) return
  try {
    await ElMessageBox.confirm(
      `确定要将现有数据迁移到新路径吗？\n\n目标路径：${pendingPath.value}\n\n迁移过程中请勿关闭应用。`,
      '迁移数据',
      {
        confirmButtonText: '开始迁移',
        cancelButtonText: '取消',
        type: 'info'
      }
    )
  } catch {
    return
  }

  migrating.value = true
  try {
    const result = await window.electronAPI.migrateData(pendingPath.value)
    if (result.success) {
      ElMessage.success(result.message || `已迁移 ${result.copiedCount} 个文件`)
    } else {
      ElMessage.error(result.error || '迁移数据失败')
    }
  } catch (error) {
    notifyDbError(error, '迁移数据')
    ElMessage.error('迁移数据失败')
  } finally {
    migrating.value = false
  }
}

async function handleOpenDataFolder() {
  if (!window.electronAPI) return
  try {
    await window.electronAPI.openDataFolder()
  } catch (error) {
    notifyDbError(error, '打开数据目录')
    ElMessage.error('打开数据目录失败')
  }
}

async function handleRestartApp() {
  if (!window.electronAPI) return
  try {
    await ElMessageBox.confirm(
      '确定要重启应用吗？未保存的数据可能会丢失。',
      '重启应用',
      {
        confirmButtonText: '立即重启',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
  } catch {
    return
  }
  await window.electronAPI.restartApp()
}

const equipmentCount = computed(() => equipmentStore.equipments.length)
const moduleCount = computed(() => modulesStore.modules.length)
const projectCount = computed(() => projectsStore.projects.length)
const tagCount = computed(() => tagsStore.tags.length)
const partsCount = computed(() => partsStore.parts.length)

async function loadDataCounts() {
  try {
    bomItemCount.value = await db.bomItems.count()
    orderBomCount.value = await db.orderBomItems.count()
  } catch (error) {
    notifyDbError(error, '加载数据统计')
  }
}

async function handleClearDemoData() {
  try {
    await ElMessageBox.confirm(
      '此操作将清除所有数据（包括设备、模块、项目、BOM条目、零件库、标签、模板等），清除后系统将为空，确定要继续吗？\n\n建议先导出数据备份。',
      '清除所有数据',
      {
        confirmButtonText: '确定清除',
        cancelButtonText: '取消',
        type: 'warning',
        confirmButtonClass: 'el-button--danger'
      }
    )
  } catch {
    return
  }

  clearing.value = true
  try {
    const { clearAllTables } = await import('@/db/index')
    await clearAllTables()
    console.log('所有数据表已清空')

    localStorage.setItem('bom_data_cleared', 'true')

    const keysToKeep = ['bom_export_headers', 'bom_page_size_equipment_list', 'bom_page_size_module_list', 'bom_page_size_project_list', 'bom_page_size_module_editor_bom', 'bom_page_size_project_editor_order_bom', 'bom_data_cleared']
    const allKeys = Object.keys(localStorage)
    allKeys.forEach((key) => {
      if (!keysToKeep.includes(key)) {
        localStorage.removeItem(key)
      }
    })
    console.log('LocalStorage已清理（保留用户偏好）')

    ElMessage.success('所有数据已清除，系统当前为空')

    setTimeout(() => {
      window.location.reload()
    }, 1000)
  } catch (error) {
    notifyDbError(error, '清除数据')
    const msg = error instanceof Error ? error.message : String(error)
    ElMessage.error(`清除失败：${msg || '未知错误'}`)
  } finally {
    clearing.value = false
  }
}

// ===== 数据导出 =====
interface ExportStats {
  equipment: number
  configurations: number
  serials: number
  modules: number
  bomItems: number
  projects: number
  orderBomItems: number
  changeRecords: number
  tags: number
  projectTypes: number
  bomTemplates: number
  parts: number
}

const exportDialogVisible = ref(false)
const exporting = ref(false)
const exportFileName = ref('')
const exportStats = reactive<ExportStats>({
  equipment: 0, configurations: 0, serials: 0, modules: 0, bomItems: 0,
  projects: 0, orderBomItems: 0, changeRecords: 0, tags: 0, projectTypes: 0, bomTemplates: 0, parts: 0
})

async function openExportDialog() {
  exportFileName.value = `bom_backup_${new Date().toISOString().slice(0, 10)}`
  // 先打开对话框，再异步加载统计数据，避免DB查询阻塞导致按钮无响应
  exportDialogVisible.value = true
  try {
    exportStats.equipment = await db.equipment.count()
    exportStats.configurations = await db.configurations.count()
    exportStats.serials = await db.serials.count()
    exportStats.modules = await db.modules.count()
    exportStats.bomItems = await db.bomItems.count()
    exportStats.projects = await db.projects.count()
    exportStats.orderBomItems = await db.orderBomItems.count()
    exportStats.changeRecords = await db.changeRecords.count()
    exportStats.tags = await db.tags.count()
    exportStats.projectTypes = await db.projectTypes.count()
    exportStats.bomTemplates = await db.bomTemplates.count()
    exportStats.parts = await db.parts.count()
  } catch (error) {
    notifyDbError(error, '统计导出数据')
  }
}

async function confirmExport() {
  if (!exportFileName.value.trim()) {
    ElMessage.warning('请输入文件名')
    return
  }
  exporting.value = true
  try {
    const data = {
      version: '1.1',
      exportedAt: new Date().toISOString(),
      equipment: await db.equipment.toArray(),
      configurations: await db.configurations.toArray(),
      serials: await db.serials.toArray(),
      modules: await db.modules.toArray(),
      bomItems: await db.bomItems.toArray(),
      projects: await db.projects.toArray(),
      orderBomItems: await db.orderBomItems.toArray(),
      changeRecords: await db.changeRecords.toArray(),
      tags: await db.tags.toArray(),
      projectTypes: await db.projectTypes.toArray(),
      bomTemplates: await db.bomTemplates.toArray(),
      parts: await db.parts.toArray()
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${exportFileName.value.trim()}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    ElMessage.success('数据导出成功')
    exportDialogVisible.value = false
  } catch (error) {
    notifyDbError(error, '导出数据')
    ElMessage.error('导出失败，请检查控制台')
  } finally {
    exporting.value = false
  }
}

// ===== 数据导入 =====
const importDialogVisible = ref(false)
const importing = ref(false)
const importStep = ref(0)
const importFileName = ref('')
const importFileData = ref<any>(null)
const importConfirmOverride = ref(false)
const importProgress = ref(0)
const importProgressText = ref('')

const importStats = reactive<ExportStats>({
  equipment: 0, configurations: 0, serials: 0, modules: 0, bomItems: 0,
  projects: 0, orderBomItems: 0, changeRecords: 0, tags: 0, projectTypes: 0, bomTemplates: 0, parts: 0
})

function openImportDialog() {
  resetImportWizard()
  importDialogVisible.value = true
}

function resetImportWizard() {
  importStep.value = 0
  importFileName.value = ''
  importFileData.value = null
  importConfirmOverride.value = false
  importProgress.value = 0
  importProgressText.value = ''
}

function handleImportFileSelect(file: { raw: File; name: string }) {
  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const content = e.target?.result as string
      const parsed = JSON.parse(content)
      if (!parsed || typeof parsed !== 'object') {
        throw new Error('文件格式不正确')
      }
      importFileData.value = parsed
      importFileName.value = file.name
      ElMessage.success('文件读取成功')
    } catch (error) {
      notifyDbError(error, '解析备份JSON')
      ElMessage.error('文件解析失败，请确保是有效的JSON备份文件')
      importFileName.value = ''
      importFileData.value = null
    }
  }
  reader.onerror = () => {
    ElMessage.error('文件读取失败')
  }
  reader.readAsText(file.raw)
}

function validateImportFile() {
  if (!importFileData.value) {
    ElMessage.error('请先选择文件')
    return
  }
  const data = importFileData.value
  const requiredKeys = ['equipment', 'modules', 'projects', 'bomItems', 'orderBomItems', 'tags', 'bomTemplates', 'parts']
  const missing = requiredKeys.filter((k) => !(k in data))
  if (missing.length > 0) {
    ElMessage.error(`文件缺少必要的数据表：${missing.join(', ')}`)
    return
  }

  importStats.equipment = Array.isArray(data.equipment) ? data.equipment.length : 0
  importStats.configurations = Array.isArray(data.configurations) ? data.configurations.length : 0
  importStats.serials = Array.isArray(data.serials) ? data.serials.length : 0
  importStats.modules = Array.isArray(data.modules) ? data.modules.length : 0
  importStats.bomItems = Array.isArray(data.bomItems) ? data.bomItems.length : 0
  importStats.projects = Array.isArray(data.projects) ? data.projects.length : 0
  importStats.orderBomItems = Array.isArray(data.orderBomItems) ? data.orderBomItems.length : 0
  importStats.changeRecords = Array.isArray(data.changeRecords) ? data.changeRecords.length : 0
  importStats.tags = Array.isArray(data.tags) ? data.tags.length : 0
  importStats.projectTypes = Array.isArray(data.projectTypes) ? data.projectTypes.length : 0
  importStats.bomTemplates = Array.isArray(data.bomTemplates) ? data.bomTemplates.length : 0
  importStats.parts = Array.isArray(data.parts) ? data.parts.length : 0

  importStep.value = 1
}

async function confirmImport() {
  if (!importConfirmOverride.value) {
    ElMessage.warning('请先勾选确认覆盖')
    return
  }
  importing.value = true
  importStep.value = 2
  importProgress.value = 0

  const data = importFileData.value
  const tables: Array<{ key: string; label: string }> = [
    { key: 'tags', label: '标签' },
    { key: 'projectTypes', label: '项目类型' },
    { key: 'bomTemplates', label: '模板字段' },
    { key: 'parts', label: '零件库' },
    { key: 'equipment', label: '设备' },
    { key: 'configurations', label: '配置' },
    { key: 'serials', label: '序列号' },
    { key: 'modules', label: '模块' },
    { key: 'bomItems', label: '模块BOM条目' },
    { key: 'projects', label: '项目' },
    { key: 'orderBomItems', label: '下单BOM条目' },
    { key: 'changeRecords', label: '更改记录' }
  ]

  // 导入前在内存中备份当前所有表数据，事务失败时用于恢复
  let backup: Record<string, any[]> = {}

  try {
    // 先将当前所有表数据读取到内存作为备份
    importProgressText.value = '正在备份当前数据...'
    for (const table of db.tables) {
      backup[table.name] = await table.toArray()
    }

    // 导入数据校验：检查每个表的key是否存在、值是否为数组
    for (const { key } of tables) {
      if (!(key in data)) {
        throw new Error(`导入数据缺少必要的数据表：${key}`)
      }
      if (!Array.isArray(data[key])) {
        throw new Error(`导入数据格式错误：${key} 不是数组`)
      }
    }

    // 使用Dexie事务包裹清库+导入，保证原子性
    await db.transaction('rw', db.tables, async () => {
      // 先清空所有表
      importProgressText.value = '正在清空现有数据...'
      for (const table of db.tables) {
        await table.clear()
      }
      importProgress.value = 5

      // 逐步导入
      for (let i = 0; i < tables.length; i++) {
        const { key, label } = tables[i]
        const items = data[key]
        importProgressText.value = `正在导入${label}（${items.length}条）...`

        if (items.length > 0) {
          const table = (db as any)[key]
          if (table && table.bulkPut) {
            await table.bulkPut(items)
          }
        }
        importProgress.value = 5 + Math.round(((i + 1) / tables.length) * 95)
        // 让UI有机会更新
        await new Promise((resolve) => setTimeout(resolve, 50))
      }
    })

    // 导入成功，清除内存备份
    backup = {}

    importProgressText.value = '导入完成，正在刷新...'
    importProgress.value = 100
    ElMessage.success('数据导入成功')
  } catch (error) {
    notifyDbError(error, '导入数据')
    // 从内存备份恢复数据（逐表clear后bulkPut备份数据）
    if (Object.keys(backup).length > 0) {
      try {
        await db.transaction('rw', db.tables, async () => {
          for (const table of db.tables) {
            await table.clear()
          }
          for (const table of db.tables) {
            const items = backup[table.name]
            if (items && items.length > 0) {
              await table.bulkPut(items)
            }
          }
        })
        ElMessage.error('导入失败，已恢复原数据')
      } catch (restoreError) {
        notifyDbError(restoreError, '恢复原数据')
        ElMessage.error('导入失败且恢复原数据失败，请检查控制台')
      }
    } else {
      ElMessage.error('导入失败，请检查控制台')
    }
  } finally {
    importing.value = false
  }
}

function handleImportCompleteRefresh() {
  window.location.reload()
}

onMounted(() => {
  loadDataCounts()
  loadDataPathInfo()
  estimateStorageUsage()
})
</script>

<style scoped>
.data-card {
  max-width: 900px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.data-description {
  color: #606266;
  font-size: 14px;
  line-height: 1.8;
  margin-bottom: 20px;
}

.data-stats {
  margin-bottom: 24px;
}

.data-actions {
  display: flex;
  justify-content: center;
  padding-top: 16px;
  border-top: 1px solid #ebeef5;
}

.danger-card :deep(.el-card__header) {
  border-bottom-color: #fde2e2;
}

.danger-title {
  color: #f56c6c;
  font-weight: 600;
}

/* 存储信息 */
.storage-stat-item {
  text-align: center;
  padding: 12px 8px;
  background: #f5f7fa;
  border-radius: 6px;
}

.storage-stat-label {
  font-size: 13px;
  color: #909399;
  margin-bottom: 6px;
}

.storage-stat-value {
  font-size: 24px;
  font-weight: 700;
  color: #303133;
}

.storage-usage {
  display: flex;
  align-items: center;
  gap: 12px;
}

.storage-usage-label {
  font-size: 13px;
  color: #606266;
  flex-shrink: 0;
}

.storage-usage-text {
  font-size: 13px;
  color: #909399;
  flex-shrink: 0;
}

/* 导入导出 */
.io-section {
  padding: 8px;
}

.io-section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.io-icon {
  font-size: 20px;
  color: #409eff;
}

.io-title {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
}

.io-description {
  color: #909399;
  font-size: 13px;
  line-height: 1.6;
  margin-bottom: 16px;
}

/* 导入向导 */
.import-step-content {
  min-height: 200px;
}

.import-file-info {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 16px;
  padding: 10px 14px;
  background: #f0f9eb;
  border-radius: 4px;
  color: #67c23a;
  font-size: 14px;
}

.import-progress {
  text-align: center;
  padding: 20px 0;
}

.import-progress-text {
  margin-top: 12px;
  color: #606266;
  font-size: 14px;
}

.import-complete {
  padding: 10px 0;
}

/* 数据路径 */
.data-path-info {
  margin-bottom: 16px;
}

.path-text {
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 13px;
  color: #303133;
  word-break: break-all;
}

.data-path-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}

.pending-path-notice {
  margin-bottom: 16px;
}

.pending-path-notice code {
  background: #f5f7fa;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 12px;
}

.data-path-tips {
  padding-top: 12px;
  border-top: 1px solid #ebeef5;
}
</style>
