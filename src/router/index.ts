import { createRouter, createWebHashHistory, type RouteRecordRaw } from 'vue-router'
import MainLayout from '@/layouts/MainLayout.vue'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: MainLayout,
    redirect: '/dashboard',
    children: [
      { path: 'dashboard', name: 'Dashboard', component: () => import('@/views/Dashboard.vue'), meta: { title: '工作台' } },
      // 设备管理
      { path: 'equipment', name: 'EquipmentList', component: () => import('@/views/equipment/EquipmentList.vue'), meta: { title: '设备列表' } },
      { path: 'equipment/:id/edit', name: 'EquipmentEdit', component: () => import('@/views/equipment/EquipmentEditor.vue'), meta: { title: '编辑设备' } },
      // 模块管理
      { path: 'module', name: 'ModuleList', component: () => import('@/views/module/ModuleList.vue'), meta: { title: '组件列表' } },
      { path: 'module/new', name: 'ModuleNew', component: () => import('@/views/module/ModuleEditor.vue'), meta: { title: '新建组件' } },
      { path: 'module/:id/edit', name: 'ModuleEdit', component: () => import('@/views/module/ModuleEditor.vue'), meta: { title: '编辑组件' } },
      // 项目管理
      { path: 'project', name: 'ProjectList', component: () => import('@/views/project/ProjectList.vue'), meta: { title: '项目列表' } },
      { path: 'project/new', name: 'ProjectNew', component: () => import('@/views/project/ProjectEditor.vue'), meta: { title: '新建项目' } },
      { path: 'project/:id/edit', name: 'ProjectEdit', component: () => import('@/views/project/ProjectEditor.vue'), meta: { title: '编辑项目' } },
      // 零件库管理
      { path: 'parts', name: 'PartsList', component: () => import('@/views/parts/PartsList.vue'), meta: { title: '零件库管理' } },
      // 扩展
      { path: 'extension', name: 'Extension', component: () => import('@/views/Extension.vue'), meta: { title: '扩展' } },
      // 设置
      { path: 'settings', name: 'Settings', component: () => import('@/views/Settings.vue'), meta: { title: '设置' } }
    ]
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router
