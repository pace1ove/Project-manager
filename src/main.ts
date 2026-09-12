import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import App from './App.vue'
import router from './router'
import './styles/global.css'
import './styles/print.css'
import { migrateFromLocalStorage } from '@/db/migration'
import { useEquipmentStore } from '@/stores/equipment'
import { useModulesStore } from '@/stores/modules'
import { useProjectsStore } from '@/stores/projects'
import { useTagsStore } from '@/stores/tags'
import { useProjectTypesStore } from '@/stores/projectTypes'
import { useBomTemplatesStore } from '@/stores/bomTemplates'
import { useBomVersionsStore } from '@/stores/bomVersions'
import { usePartsStore } from '@/stores/parts'
import { usePartLibrariesStore } from '@/stores/partLibraries'

async function bootstrap() {
  const app = createApp(App)

  // 注册所有图标
  for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
    app.component(key, component)
  }

  const pinia = createPinia()
  app.use(pinia)
  app.use(router)
  app.use(ElementPlus, { locale: zhCn })

  // 全局错误处理器
  app.config.errorHandler = (err, instance, info) => {
    const error = err instanceof Error ? err : new Error(String(err))
    const timestamp = new Date().toISOString()
    const logEntry = `[${timestamp}] [GLOBAL_ERROR] ${error.message}\n  组件: ${instance?.$options?.name || 'unknown'}\n  信息: ${info}\n  堆栈: ${error.stack}`
    console.error(logEntry)
  }

  // 未捕获的 Promise  rejection
  window.addEventListener('unhandledrejection', (event) => {
    const timestamp = new Date().toISOString()
    console.error(`[${timestamp}] [UNHANDLED_REJECTION]`, event.reason)
  })

  // 先迁移/初始化数据库
  await migrateFromLocalStorage()

  // 然后初始化所有store（从IndexedDB加载数据到内存）
  const equipmentStore = useEquipmentStore()
  const modulesStore = useModulesStore()
  const projectsStore = useProjectsStore()
  const tagsStore = useTagsStore()
  const projectTypesStore = useProjectTypesStore()
  const bomTemplatesStore = useBomTemplatesStore()
  const bomVersionsStore = useBomVersionsStore()
  const partsStore = usePartsStore()
  const partLibrariesStore = usePartLibrariesStore()

  await Promise.all([
    equipmentStore.initialize(),
    modulesStore.initialize(),
    projectsStore.initialize(),
    tagsStore.initialize(),
    projectTypesStore.initialize(),
    bomTemplatesStore.initialize(),
    bomVersionsStore.initialize(),
    partsStore.initialize(),
    partLibrariesStore.initialize()
  ])

  app.mount('#app')
}

bootstrap()
