<template>
  <div class="page-breadcrumb">
    <el-breadcrumb separator-icon="ArrowRight">
      <el-breadcrumb-item :to="{ path: '/dashboard' }">
        首页
      </el-breadcrumb-item>
      <el-breadcrumb-item
        v-for="(crumb, idx) in breadcrumbItems"
        :key="idx"
        :to="crumb.to ? { path: crumb.to } : undefined"
      >
        {{ crumb.label }}
      </el-breadcrumb-item>
    </el-breadcrumb>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

interface BreadcrumbItem {
  label: string
  to?: string
}

const route = useRoute()

const breadcrumbItems = computed<BreadcrumbItem[]>(() => {
  const path = route.path
  const items: BreadcrumbItem[] = []
  
  // 设备管理
  if (path.startsWith('/equipment')) {
    items.push({ label: '设备管理', to: '/equipment' })
    if (path.includes('/edit') || path.includes('/new')) {
      items.push({ label: path.includes('/new') ? '新建设备' : '编辑设备' })
    }
  }
  // 组件管理
  else if (path.startsWith('/module')) {
    items.push({ label: '组件管理', to: '/module' })
    if (path.includes('/edit') || path.includes('/new')) {
      items.push({ label: path.includes('/new') ? '新建组件' : '编辑组件' })
    }
  }
  // 项目管理
  else if (path.startsWith('/project')) {
    items.push({ label: '项目管理', to: '/project' })
    if (path.includes('/edit') || path.includes('/new')) {
      items.push({ label: path.includes('/new') ? '新建项目' : '编辑项目' })
    }
  }
  // 零件库管理
  else if (path.startsWith('/parts')) {
    items.push({ label: '零件库管理' })
  }
  // 扩展功能
  else if (path.startsWith('/extension')) {
    items.push({ label: '扩展功能' })
  }
  // 设置
  else if (path.startsWith('/settings')) {
    items.push({ label: '系统设置' })
  }
  // 工作台
  else if (path.startsWith('/dashboard')) {
    items.push({ label: '工作台' })
  }
  
  return items
})
</script>

<style scoped>
.page-breadcrumb {
  padding: 8px 4px 12px 4px;
  margin-bottom: 12px;
  border-bottom: 1px solid #ebeef5;
  display: flex;
  align-items: center;
  min-height: 32px;
}

.page-breadcrumb :deep(.el-breadcrumb) {
  font-size: 13px;
  line-height: 1;
}

.page-breadcrumb :deep(.el-breadcrumb__inner) {
  color: #909399;
}

.page-breadcrumb :deep(.el-breadcrumb__inner.is-link) {
  color: #606266;
}

.page-breadcrumb :deep(.el-breadcrumb__inner.is-link:hover) {
  color: #409eff;
}

.page-breadcrumb :deep(.el-breadcrumb__item:last-child .el-breadcrumb__inner) {
  color: #303133;
  font-weight: 600;
}

.page-breadcrumb :deep(.el-breadcrumb__separator) {
  color: #c0c4cc;
  margin: 0 6px;
}
</style>
