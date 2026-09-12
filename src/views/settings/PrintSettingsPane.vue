<template>
  <el-card
    shadow="never"
    class="data-card"
  >
    <template #header>
      <div class="card-header">
        <span class="card-title">打印页眉设置</span>
      </div>
    </template>
    <el-form
      label-width="120px"
      class="print-settings-form"
    >
      <el-form-item label="页眉文本">
        <el-input
          v-model="printSettings.headerText"
          placeholder="如：XX机械制造有限公司"
          style="max-width: 400px"
        />
        <div class="form-tip">
          自定义打印页眉显示的公司名称，保存后在打印预览对话框中生效。
        </div>
      </el-form-item>
      <el-form-item label="显示页脚">
        <el-switch v-model="printSettings.showFooter" />
        <div class="form-tip">
          页脚包含打印时间和页码。
        </div>
      </el-form-item>
      <el-form-item>
        <el-button
          type="primary"
          @click="savePrintSettings"
        >
          保存打印设置
        </el-button>
        <el-button @click="resetPrintSettings">
          恢复默认
        </el-button>
      </el-form-item>
    </el-form>
  </el-card>

  <el-card
    shadow="never"
    class="data-card"
    style="margin-top: 16px;"
  >
    <template #header>
      <div class="card-header">
        <span class="card-title">打印说明</span>
      </div>
    </template>
    <p style="color: #606266; font-size: 13px; line-height: 1.8;">
      1. BOM表格、项目详情、组件详情均支持打印功能。<br>
      2. 在各编辑器顶部点击"打印"按钮可打开打印预览对话框。<br>
      3. 打印预览中可选择纸张方向（纵向/横向）、是否打印页眉页脚。<br>
      4. 打印样式已针对A4纸张优化，表头跨页自动重复。<br>
      5. 统计报表（物料使用统计、组件复用统计）支持导出Excel。
    </p>
  </el-card>
</template>

<script setup lang="ts">
import { reactive } from 'vue'
import { ElMessage } from 'element-plus'

// ===== 打印设置 =====
const printSettings = reactive({
  headerText: '',
  showFooter: true
})

try {
  const saved = localStorage.getItem('bom-manager-print-header')
  if (saved) {
    const parsed = JSON.parse(saved)
    printSettings.headerText = parsed.headerText || ''
    if (typeof parsed.showFooter === 'boolean') printSettings.showFooter = parsed.showFooter
  }
} catch {
  // ignore
}

function savePrintSettings() {
  localStorage.setItem(
    'bom-manager-print-header',
    JSON.stringify({
      headerText: printSettings.headerText,
      showFooter: printSettings.showFooter
    })
  )
  ElMessage.success('打印设置已保存')
}

function resetPrintSettings() {
  printSettings.headerText = ''
  printSettings.showFooter = true
  localStorage.removeItem('bom-manager-print-header')
  ElMessage.success('已恢复默认打印设置')
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

.card-title {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
}

.form-tip {
  color: #909399;
  font-size: 12px;
  margin-top: 4px;
}
</style>
