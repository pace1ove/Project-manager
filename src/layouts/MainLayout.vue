<template>
  <el-container class="main-layout">
    <!-- 侧边栏 -->
    <el-aside
      :width="collapsed ? '64px' : '220px'"
      class="sidebar"
      :class="{ collapsed }"
    >
      <!-- Logo 区域 + 折叠按钮 -->
      <div
        class="logo-area"
        @click="collapsed && toggleCollapse()"
      >
        <div class="logo-icon">
          <el-icon
            :size="22"
            color="#409eff"
          >
            <Box />
          </el-icon>
        </div>
        <transition name="fade-width">
          <span
            v-if="!collapsed"
            class="logo-text"
          >BOM管理系统</span>
        </transition>
        <button
          class="collapse-btn"
          :title="collapsed ? '展开侧边栏' : '折叠侧边栏'"
          @click.stop="toggleCollapse"
        >
          <el-icon :size="16">
            <Fold v-if="!collapsed" /><Expand v-else />
          </el-icon>
        </button>
      </div>

      <!-- 菜单 -->
      <el-menu
        :default-active="activeMenu"
        :collapse="collapsed"
        :collapse-transition="false"
        router
        background-color="#001529"
        text-color="#b9c4d1"
        active-text-color="#ffffff"
        class="side-menu"
      >
        <!-- 业务管理 -->
        <el-menu-item-group>
          <template #title>
            <span class="menu-group-title">业务管理</span>
          </template>
          <el-tooltip
            content="工作台"
            placement="right"
            :disabled="!collapsed"
          >
            <el-menu-item index="/dashboard">
              <el-icon><Odometer /></el-icon>
              <span>工作台</span>
            </el-menu-item>
          </el-tooltip>
          <el-tooltip
            content="设备管理"
            placement="right"
            :disabled="!collapsed"
          >
            <el-menu-item index="/equipment">
              <el-icon><Cpu /></el-icon>
              <span>设备管理</span>
            </el-menu-item>
          </el-tooltip>
          <el-tooltip
            content="组件管理"
            placement="right"
            :disabled="!collapsed"
          >
            <el-menu-item index="/module">
              <el-icon><Grid /></el-icon>
              <span>组件管理</span>
            </el-menu-item>
          </el-tooltip>
          <el-tooltip
            content="项目管理"
            placement="right"
            :disabled="!collapsed"
          >
            <el-menu-item index="/project">
              <el-icon><Folder /></el-icon>
              <span>项目管理</span>
            </el-menu-item>
          </el-tooltip>
          <el-tooltip
            content="零件库管理"
            placement="right"
            :disabled="!collapsed"
          >
            <el-menu-item index="/parts">
              <el-icon><Box /></el-icon>
              <span>零件库管理</span>
            </el-menu-item>
          </el-tooltip>
        </el-menu-item-group>

        <!-- 系统功能 -->
        <el-menu-item-group>
          <template #title>
            <span class="menu-group-title">系统功能</span>
          </template>
          <el-tooltip
            content="扩展"
            placement="right"
            :disabled="!collapsed"
          >
            <el-menu-item index="/extension">
              <el-icon><Operation /></el-icon>
              <span>扩展</span>
            </el-menu-item>
          </el-tooltip>
          <el-tooltip
            content="设置"
            placement="right"
            :disabled="!collapsed"
          >
            <el-menu-item index="/settings">
              <el-icon><Setting /></el-icon>
              <span>设置</span>
            </el-menu-item>
          </el-tooltip>
        </el-menu-item-group>
      </el-menu>

      <!-- 底部用户区 -->
      <div class="sidebar-footer">
        <el-avatar
          :size="collapsed ? 32 : 36"
          style="background-color: #409eff; flex-shrink: 0"
        >
          {{ userStore.user.name.charAt(0) }}
        </el-avatar>
        <transition name="fade-width">
          <div
            v-if="!collapsed"
            class="footer-user-info"
          >
            <div class="footer-user-name">
              {{ userStore.user.name }}
            </div>
            <div class="footer-user-role">
              {{ userStore.user.role }}
            </div>
          </div>
        </transition>
      </div>
    </el-aside>

    <!-- 主容器 -->
    <el-container class="main-container">
      <!-- 顶部栏 -->
      <el-header class="header">
        <div class="header-left">
          <!-- 全局搜索框 -->
          <div class="search-wrapper">
            <GlobalSearch />
          </div>
          <!-- 小屏搜索图标按钮 -->
          <el-tooltip
            content="搜索 (Ctrl+K)"
            placement="bottom"
          >
            <button
              class="search-icon-btn"
              @click="openSearch"
            >
              <el-icon :size="18">
                <Search />
              </el-icon>
            </button>
          </el-tooltip>

          <!-- 新建下拉按钮 -->
          <el-dropdown
            trigger="click"
            @command="handleNewCommand"
          >
            <button class="new-btn">
              <el-icon :size="16">
                <Plus />
              </el-icon>
              <span>新建</span>
              <el-icon :size="12">
                <ArrowDown />
              </el-icon>
            </button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="equipment">
                  <el-icon><Cpu /></el-icon>新建设备
                </el-dropdown-item>
                <el-dropdown-item command="module">
                  <el-icon><Grid /></el-icon>新建组件
                </el-dropdown-item>
                <el-dropdown-item command="project">
                  <el-icon><Folder /></el-icon>新建项目
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>

          <!-- 数据存储指示 -->
          <el-tooltip
            content="数据存储在浏览器本地 IndexedDB 中"
            placement="bottom"
          >
            <div class="storage-tag">
              <el-icon
                :size="14"
                color="#67c23a"
              >
                <Coin />
              </el-icon>
              <span>本地存储 IndexedDB</span>
            </div>
          </el-tooltip>
        </div>

        <!-- 用户下拉 -->
        <div class="header-right">
          <el-dropdown trigger="click">
            <span class="user-info">
              <el-avatar
                :size="32"
                style="background-color: #409eff"
              >
                {{ userStore.user.name.charAt(0) }}
              </el-avatar>
              <span class="username">{{ userStore.user.name }}</span>
              <el-icon :size="12"><ArrowDown /></el-icon>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item disabled>
                  <el-icon><User /></el-icon>角色：{{ userStore.user.role }}
                </el-dropdown-item>
                <el-dropdown-item
                  divided
                  @click="handleResetData"
                >
                  <el-icon><RefreshLeft /></el-icon>重置演示数据
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>

      <!-- 主内容区 -->
      <el-main class="main-content">
        <router-view v-slot="{ Component }">
          <component :is="Component" />
        </router-view>
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Box, Odometer, Cpu, Grid, Folder, Operation, Setting,
  Fold, Expand, ArrowDown, Search, Plus, Coin, User, RefreshLeft
} from '@element-plus/icons-vue'
import GlobalSearch from '@/components/common/GlobalSearch.vue'
import { useUserStore } from '@/stores/user'
import { useEquipmentStore } from '@/stores/equipment'
import { useModulesStore } from '@/stores/modules'
import { useProjectsStore } from '@/stores/projects'
import { useTagsStore } from '@/stores/tags'
import { useProjectTypesStore } from '@/stores/projectTypes'
import { useBomTemplatesStore } from '@/stores/bomTemplates'
import { resetDatabase } from '@/db/migration'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const equipmentStore = useEquipmentStore()
const modulesStore = useModulesStore()
const projectsStore = useProjectsStore()
const tagsStore = useTagsStore()
const projectTypesStore = useProjectTypesStore()
const bomTemplatesStore = useBomTemplatesStore()

// ===== 侧边栏折叠 =====
const SIDEBAR_KEY = 'bom_sidebar_collapsed'
const collapsed = ref<boolean>(localStorage.getItem(SIDEBAR_KEY) === 'true')

function toggleCollapse(): void {
  collapsed.value = !collapsed.value
  localStorage.setItem(SIDEBAR_KEY, String(collapsed.value))
}

// ===== 响应式 =====
function handleResize(): void {
  const w = window.innerWidth
  if (w < 992 && !collapsed.value) {
    collapsed.value = true
    localStorage.setItem(SIDEBAR_KEY, 'true')
  }
}

onMounted(() => {
  window.addEventListener('resize', handleResize)
  handleResize()
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})

// ===== 菜单高亮 =====
const activeMenu = computed<string>(() => {
  const path = route.path
  if (path.startsWith('/equipment')) return '/equipment'
  if (path.startsWith('/module')) return '/module'
  if (path.startsWith('/project')) return '/project'
  if (path.startsWith('/parts')) return '/parts'
  return path
})

// ===== 面包屑 =====
interface BreadcrumbItem {
  label: string
  to?: string
}

const breadcrumbItems = computed<BreadcrumbItem[]>(() => {
  const path = route.path
  if (path === '/dashboard') return [{ label: '工作台' }]
  if (path.startsWith('/equipment')) {
    if (path === '/equipment') return [{ label: '设备管理' }]
    return [{ label: '设备管理', to: '/equipment' }, { label: (route.meta.title as string) || '编辑设备' }]
  }
  if (path.startsWith('/module')) {
    if (path === '/module') return [{ label: '组件管理' }]
    return [{ label: '组件管理', to: '/module' }, { label: (route.meta.title as string) || '组件详情' }]
  }
  if (path.startsWith('/project')) {
    if (path === '/project') return [{ label: '项目管理' }]
    return [{ label: '项目管理', to: '/project' }, { label: (route.meta.title as string) || '项目详情' }]
  }
  if (path === '/parts') return [{ label: '零件库管理' }]
  if (path === '/extension') return [{ label: '扩展' }]
  if (path === '/settings') return [{ label: '设置' }]
  return [{ label: (route.meta.title as string) || '页面' }]
})

// ===== 新建下拉 =====
function handleNewCommand(command: string): void {
  const routeMap: Record<string, string> = {
    equipment: '/equipment',
    module: '/module/new',
    project: '/project/new'
  }
  const target = routeMap[command]
  if (target) {
    if (command === 'equipment') {
      ElMessage.info('请在设备列表页新建设备')
    }
    router.push(target)
  }
}

// ===== 搜索图标按钮（小屏） =====
function openSearch(): void {
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }))
}

// ===== 重置演示数据 =====
function handleResetData(): void {
  ElMessageBox.confirm(
    '确定要重置所有演示数据吗？此操作将清除IndexedDB中的所有修改并恢复初始演示数据。',
    '确认重置',
    {
      confirmButtonText: '确定重置',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(async () => {
    await resetDatabase()
    await Promise.all([
      equipmentStore.initialize(),
      modulesStore.initialize(),
      projectsStore.initialize(),
      tagsStore.initialize(),
      projectTypesStore.initialize(),
      bomTemplatesStore.initialize()
    ])
    ElMessage.success('演示数据已重置')
  }).catch(() => {})
}
</script>

<style scoped>
.main-layout {
  height: 100vh;
}

/* ===== 侧边栏 ===== */
.sidebar {
  background-color: #001529;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  transition: width 0.28s cubic-bezier(0.4, 0, 0.2, 1);
  flex-shrink: 0;
}

.logo-area {
  height: 60px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 16px;
  border-bottom: 1px solid #1f3a5f;
  position: relative;
  flex-shrink: 0;
}

/* 收缩状态下，logo图标居中 */
.sidebar.collapsed .logo-area {
  padding: 0;
  justify-content: center;
}

.logo-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: rgba(64, 158, 255, 0.12);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.logo-text {
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
}

.collapse-btn {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  width: 24px;
  height: 24px;
  border: none;
  background: rgba(255, 255, 255, 0.06);
  color: #b9c4d1;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  z-index: 10;
}

.collapse-btn:hover {
  background: rgba(64, 158, 255, 0.2);
  color: #fff;
}

/* 展开状态下，收缩按钮默认隐藏，hover时显示 */
.sidebar:not(.collapsed) .collapse-btn {
  opacity: 0;
}

.sidebar:not(.collapsed):hover .collapse-btn {
  opacity: 1;
}

/* 收缩状态下，收缩按钮隐藏，点击整个logo区域展开 */
.sidebar.collapsed .collapse-btn {
  display: none;
}

.sidebar.collapsed .logo-area {
  cursor: pointer;
}

.sidebar.collapsed .logo-area:hover {
  background: rgba(255, 255, 255, 0.05);
}

/* 菜单 */
.side-menu {
  border-right: none;
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 8px 0;
}

.side-menu :deep(.el-menu-item-group__title) {
  padding: 12px 16px 6px;
  font-size: 11px;
  color: #5a7a9e;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 侧边栏收缩时，隐藏分组标题，显示分隔线 */
.side-menu.el-menu--collapse :deep(.el-menu-item-group__title) {
  padding: 8px 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(90, 122, 158, 0.3), transparent);
  margin: 8px 12px;
  font-size: 0;
  overflow: hidden;
}

.side-menu.el-menu--collapse .menu-group-title {
  display: none;
}

.menu-group-title {
  font-size: 11px;
  color: #5a7a9e;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.side-menu :deep(.el-menu-item) {
  height: 44px;
  line-height: 44px;
  margin: 2px 8px;
  border-radius: 6px;
  position: relative;
  overflow: hidden;
}

/* 收缩状态下，菜单项图标居中 */
.side-menu.el-menu--collapse :deep(.el-menu-item) {
  margin: 2px 0;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.side-menu.el-menu--collapse :deep(.el-menu-item .el-icon) {
  margin-right: 0;
  font-size: 18px;
}

/* 收缩状态下，隐藏文字元素 */
.side-menu.el-menu--collapse :deep(.el-menu-item span:not(.el-icon)) {
  display: none !important;
}

.side-menu :deep(.el-menu-item:hover) {
  background-color: rgba(31, 58, 95, 0.8);
  color: #fff;
}

/* active 高亮：左侧指示条 + 浅蓝背景 */
.side-menu :deep(.el-menu-item.is-active) {
  background-color: rgba(64, 158, 255, 0.18);
  color: #fff;
  font-weight: 500;
}

.side-menu :deep(.el-menu-item.is-active)::before {
  content: '';
  position: absolute;
  left: -8px;
  top: 8px;
  bottom: 8px;
  width: 3px;
  background-color: #409eff;
  border-radius: 0 2px 2px 0;
}

.side-menu :deep(.el-menu-item .el-icon) {
  font-size: 18px;
}

/* 底部用户区 */
.sidebar-footer {
  height: 60px;
  border-top: 1px solid #1f3a5f;
  display: flex;
  align-items: center;
  padding: 0 14px;
  gap: 10px;
  flex-shrink: 0;
}

.footer-user-info {
  overflow: hidden;
  white-space: nowrap;
}

.footer-user-name {
  color: #fff;
  font-size: 13px;
  font-weight: 500;
}

.footer-user-role {
  color: #5a7a9e;
  font-size: 11px;
  margin-top: 2px;
}

/* ===== 主容器 ===== */
.main-container {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* ===== 顶部栏 ===== */
.header {
  background: #fff;
  border-bottom: 1px solid #e4e7ed;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  height: 60px;
  gap: 16px;
  flex-shrink: 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

/* 搜索框 */
.search-wrapper {
  width: 320px;
}

.search-icon-btn {
  display: none;
  width: 36px;
  height: 36px;
  border: 1px solid #dcdfe6;
  background: #fff;
  border-radius: 6px;
  cursor: pointer;
  color: #606266;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.search-icon-btn:hover {
  border-color: #409eff;
  color: #409eff;
}

/* 新建按钮 */
.new-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 36px;
  padding: 0 14px;
  border: none;
  background: #409eff;
  color: #fff;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  transition: all 0.2s;
  white-space: nowrap;
}

.new-btn:hover {
  background: #66b1ff;
}

/* 存储标签 */
.storage-tag {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 10px;
  background: #f0f9eb;
  border: 1px solid #e1f3d8;
  border-radius: 6px;
  font-size: 12px;
  color: #67c23a;
  cursor: default;
  white-space: nowrap;
}

/* 面包屑导航栏 */
.breadcrumb-bar {
  padding: 10px 4px 10px 4px;
  margin-bottom: 12px;
  border-bottom: 1px solid #ebeef5;
  display: flex;
  align-items: center;
  min-height: 36px;
}

.breadcrumb-bar :deep(.el-breadcrumb) {
  font-size: 13px;
  line-height: 1;
}

.breadcrumb-bar :deep(.el-breadcrumb__inner) {
  color: #909399;
}

.breadcrumb-bar :deep(.el-breadcrumb__inner.is-link) {
  color: #606266;
}

.breadcrumb-bar :deep(.el-breadcrumb__inner.is-link:hover) {
  color: #409eff;
}

.breadcrumb-bar :deep(.el-breadcrumb__item:last-child .el-breadcrumb__inner) {
  color: #303133;
  font-weight: 600;
}

.breadcrumb-bar :deep(.el-breadcrumb__separator) {
  color: #c0c4cc;
  margin: 0 6px;
}

/* 用户区 */
.header-right {
  flex-shrink: 0;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
  transition: background 0.2s;
}

.user-info:hover {
  background: #f5f7fa;
}

.username {
  font-size: 14px;
  color: #303133;
  font-weight: 500;
}

/* ===== 主内容区 ===== */
.main-content {
  background-color: #f5f7fa;
  padding: 0;
  overflow-y: auto;
  flex: 1;
}

/* ===== 过渡动画 ===== */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.18s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.fade-width-enter-active,
.fade-width-leave-active {
  transition: opacity 0.2s ease;
}

.fade-width-enter-from,
.fade-width-leave-to {
  opacity: 0;
}

/* ===== 响应式 ===== */
@media (max-width: 1200px) {
  .search-wrapper {
    width: 240px;
  }
  .storage-tag {
    display: none;
  }
}

@media (max-width: 992px) {
  .search-wrapper {
    width: 200px;
  }
  .header-center {
    display: none;
  }
}

@media (max-width: 576px) {
  .search-wrapper {
    display: none;
  }
  .search-icon-btn {
    display: flex;
  }
  .storage-tag {
    display: none;
  }
  .username {
    display: none;
  }
  .new-btn span {
    display: none;
  }
  .new-btn {
    padding: 0 10px;
  }
}
</style>
