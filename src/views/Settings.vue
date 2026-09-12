<template>
  <div class="settings-page">
    <PageBreadcrumb />
    <div class="page-header">
      <h2 class="page-title">设置</h2>
      <el-tag
        type="info"
        size="small"
      >
        偏好 / 模板 / 数据
      </el-tag>
    </div>

    <el-tabs
      v-model="activeTab"
      class="settings-tabs"
    >
      <!-- Tab1: 标签管理 -->
      <el-tab-pane
        label="标签管理"
        name="tags"
        lazy
      >
        <div class="tab-content">
          <TagSettingsPane />
        </div>
      </el-tab-pane>

      <!-- Tab2: 零件分类管理 -->
      <el-tab-pane
        label="零件分类管理"
        name="partCategories"
        lazy
      >
        <div class="tab-content">
          <PartCategorySettingsPane />
        </div>
      </el-tab-pane>

      <!-- Tab3: 项目类型管理 -->
      <el-tab-pane
        label="项目类型管理"
        name="projectTypes"
        lazy
      >
        <div class="tab-content">
          <ProjectTypeSettingsPane />
        </div>
      </el-tab-pane>

      <!-- Tab4: BOM模板字段设置 -->
      <el-tab-pane
        label="BOM模板字段设置"
        name="bomTemplates"
        lazy
      >
        <div class="tab-content">
          <BomTemplateSettingsPane />
        </div>
      </el-tab-pane>

      <!-- Tab5: 数据管理（偏好 + 数据操作） -->
      <el-tab-pane
        label="数据管理"
        name="dataManagement"
        lazy
      >
        <div class="tab-content">
          <PreferenceSettingsPane />
          <DataManagementPane />
        </div>
      </el-tab-pane>

      <!-- Tab6: 打印设置 -->
      <el-tab-pane
        label="打印设置"
        name="print"
        lazy
      >
        <div class="tab-content">
          <PrintSettingsPane />
        </div>
      </el-tab-pane>

      <!-- Tab7: 更新日志 -->
      <el-tab-pane
        label="更新日志"
        name="changelog"
        lazy
      >
        <div class="tab-content">
          <ChangelogPane />
        </div>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import TagSettingsPane from './settings/TagSettingsPane.vue'
import PartCategorySettingsPane from './settings/PartCategorySettingsPane.vue'
import ProjectTypeSettingsPane from './settings/ProjectTypeSettingsPane.vue'
import BomTemplateSettingsPane from './settings/BomTemplateSettingsPane.vue'
import PreferenceSettingsPane from './settings/PreferenceSettingsPane.vue'
import DataManagementPane from './settings/DataManagementPane.vue'
import PrintSettingsPane from './settings/PrintSettingsPane.vue'
import ChangelogPane from './settings/ChangelogPane.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'

const activeTab = ref('tags')
</script>

<style scoped>
.settings-page {
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
}

.page-title {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  color: #303133;
}

.settings-tabs {
  background: transparent;
}

.settings-tabs :deep(.el-tabs__header) {
  margin-bottom: 20px;
}

.settings-tabs :deep(.el-tabs__item) {
  font-size: 14px;
  font-weight: 500;
}

.tab-content {
  animation: fadeIn 0.2s ease-in-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
</style>
