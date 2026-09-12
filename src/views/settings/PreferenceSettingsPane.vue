<template>
  <!-- 自动保存设置 -->
  <el-card
    shadow="never"
    class="data-card"
    style="margin-bottom: 16px;"
  >
    <template #header>
      <span>自动保存设置</span>
    </template>
    <el-form
      label-width="140px"
      style="max-width: 500px;"
    >
      <el-form-item label="自动保存间隔">
        <el-radio-group
          v-model="autoSaveInterval"
          @change="saveAutoSaveInterval"
        >
          <el-radio-button :value="30000">
            30秒
          </el-radio-button>
          <el-radio-button :value="60000">
            1分钟
          </el-radio-button>
          <el-radio-button :value="300000">
            5分钟
          </el-radio-button>
          <el-radio-button :value="-1">
            关闭
          </el-radio-button>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="图号格式校验">
        <el-input
          v-model="drawingNoPattern"
          placeholder="留空表示不限制，如：^ASM-.*ASM$"
          clearable
          @change="saveDrawingNoPattern"
        />
        <div style="font-size: 12px; color: #909399; margin-top: 4px;">
          输入正则表达式用于校验图号格式，留空则不校验
        </div>
      </el-form-item>
    </el-form>
  </el-card>

  <!-- 性能设置 -->
  <el-card
    shadow="never"
    class="data-card"
    style="margin-bottom: 16px;"
  >
    <template #header>
      <div class="card-header">
        <span>性能设置</span>
        <el-tag
          type="info"
          size="small"
        >
          大数据量优化
        </el-tag>
      </div>
    </template>
    <el-form
      label-width="180px"
      style="max-width: 560px;"
    >
      <el-form-item label="启用虚拟滚动">
        <el-switch
          v-model="virtualScrollEnabled"
          @change="handleVirtualScrollToggle"
        />
        <div style="font-size: 12px; color: #909399; margin-top: 4px;">
          BOM表格/列表数据量超过阈值时，仅渲染可视区域行，提升滚动流畅度
        </div>
      </el-form-item>
      <el-form-item label="BOM虚拟滚动阈值">
        <el-input-number
          v-model="bomVirtualThreshold"
          :min="50"
          :max="5000"
          :step="50"
          :disabled="!virtualScrollEnabled"
          @change="handleBomThresholdChange"
        />
        <div style="font-size: 12px; color: #909399; margin-top: 4px;">
          BOM条目超过此次数自动启用虚拟滚动（默认500）
        </div>
      </el-form-item>
      <el-form-item label="列表虚拟滚动阈值">
        <el-input-number
          v-model="listVirtualThreshold"
          :min="20"
          :max="5000"
          :step="20"
          :disabled="!virtualScrollEnabled"
          @change="handleListThresholdChange"
        />
        <div style="font-size: 12px; color: #909399; margin-top: 4px;">
          组件/项目列表超过此次数提示使用分页/虚拟滚动（默认200）
        </div>
      </el-form-item>
    </el-form>
  </el-card>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { usePerformanceSettings } from '@/composables/usePerformanceSettings'

// ===== 自动保存设置 =====
const autoSaveInterval = ref<number>(30000)
const drawingNoPattern = ref('')

// 从 localStorage 加载配置
try {
  const savedInterval = localStorage.getItem('bom-manager-autosave-interval')
  if (savedInterval) {
    autoSaveInterval.value = parseInt(savedInterval, 10)
  }
  const savedPattern = localStorage.getItem('bom-manager-drawingno-pattern')
  if (savedPattern) {
    drawingNoPattern.value = savedPattern
  }
} catch { /* ignore */ }

function saveAutoSaveInterval(val: number) {
  localStorage.setItem('bom-manager-autosave-interval', String(val))
  ElMessage.success(val === -1 ? '自动保存已关闭' : '自动保存间隔已更新，刷新后生效')
}

function saveDrawingNoPattern(val: string) {
  if (val && val.trim()) {
    // 验证正则有效性
    try {
      new RegExp(val.trim())
      localStorage.setItem('bom-manager-drawingno-pattern', val.trim())
      ElMessage.success('图号格式校验已更新')
    } catch {
      ElMessage.error('正则表达式无效，请检查格式')
    }
  } else {
    localStorage.removeItem('bom-manager-drawingno-pattern')
    ElMessage.success('图号格式校验已关闭')
  }
}

// ===== 性能设置（虚拟滚动） =====
const {
  virtualScrollEnabled,
  bomThreshold,
  listThreshold,
  setVirtualScrollEnabled,
  setBomThreshold,
  setListThreshold
} = usePerformanceSettings()

const bomVirtualThreshold = ref(bomThreshold.value)
const listVirtualThreshold = ref(listThreshold.value)

function handleVirtualScrollToggle(val: boolean) {
  setVirtualScrollEnabled(val)
  ElMessage.success(val ? '虚拟滚动已启用，刷新后全量生效' : '虚拟滚动已关闭')
}

function handleBomThresholdChange(val: number | undefined) {
  const v = val && val > 0 ? val : 500
  bomVirtualThreshold.value = v
  setBomThreshold(v)
  ElMessage.success('BOM虚拟滚动阈值已更新')
}

function handleListThresholdChange(val: number | undefined) {
  const v = val && val > 0 ? val : 200
  listVirtualThreshold.value = v
  setListThreshold(v)
  ElMessage.success('列表虚拟滚动阈值已更新')
}
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
</style>
