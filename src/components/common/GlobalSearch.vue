<template>
  <div
    ref="containerRef"
    class="global-search"
  >
    <!-- 搜索输入框 -->
    <div
      class="search-input-wrapper"
      :class="{ 'is-focused': panelVisible }"
    >
      <el-icon class="search-icon">
        <Search />
      </el-icon>
      <input
        ref="inputRef"
        v-model="keyword"
        type="text"
        class="search-input"
        placeholder="搜索设备、组件、项目、BOM条目..."
        @focus="onFocus"
        @keydown="onKeydown"
      >
      <kbd class="search-kbd">Ctrl+K</kbd>
    </div>

    <!-- 下拉面板 -->
    <Transition name="search-panel">
      <div
        v-if="panelVisible"
        class="search-panel"
      >
        <!-- 最近搜索 -->
        <div
          v-if="!keyword && recentSearches.length > 0"
          class="search-section"
        >
          <div class="search-section-title">
            最近搜索
          </div>
          <div
            v-for="(item, idx) in recentSearches"
            :key="`recent-${idx}`"
            class="search-result-item"
            :class="{ active: activeIndex === idx }"
            @mouseenter="activeIndex = idx"
            @click="navigateTo(item)"
          >
            <el-icon class="result-icon">
              <Clock />
            </el-icon>
            <span class="result-name">{{ item.name }}</span>
            <el-tag
              size="small"
              type="info"
              effect="plain"
            >
              {{ typeLabel(item.type) }}
            </el-tag>
          </div>
        </div>

        <!-- 搜索结果 -->
        <template v-if="keyword">
          <div
            v-if="hasResults"
            class="search-results"
          >
            <!-- 设备 -->
            <div
              v-if="results.equipment.length > 0"
              class="search-section"
            >
              <div class="search-section-title">
                <el-icon><Monitor /></el-icon> 设备 ({{ results.equipment.length }})
              </div>
              <div
                v-for="item in results.equipment"
                :key="`eq-${item.id}`"
                class="search-result-item"
                :class="{ active: isActive(item) }"
                @mouseenter="setActive(item)"
                @click="navigateTo(item)"
              >
                <el-icon class="result-icon">
                  <Monitor />
                </el-icon>
                <span
                  class="result-name"
                  v-html="highlight(item.name)"
                />
                <span class="result-sub">{{ item.model }}</span>
              </div>
            </div>

            <!-- 组件 -->
            <div
              v-if="results.module.length > 0"
              class="search-section"
            >
              <div class="search-section-title">
                <el-icon><Box /></el-icon> 组件 ({{ results.module.length }})
              </div>
              <div
                v-for="item in results.module"
                :key="`mod-${item.id}`"
                class="search-result-item"
                :class="{ active: isActive(item) }"
                @mouseenter="setActive(item)"
                @click="navigateTo(item)"
              >
                <el-icon class="result-icon">
                  <Box />
                </el-icon>
                <span
                  class="result-name"
                  v-html="highlight(item.nameZh || '')"
                />
                <span class="result-sub">{{ item.drawingNo }}</span>
              </div>
            </div>

            <!-- 项目 -->
            <div
              v-if="results.project.length > 0"
              class="search-section"
            >
              <div class="search-section-title">
                <el-icon><Folder /></el-icon> 项目 ({{ results.project.length }})
              </div>
              <div
                v-for="item in results.project"
                :key="`prj-${item.id}`"
                class="search-result-item"
                :class="{ active: isActive(item) }"
                @mouseenter="setActive(item)"
                @click="navigateTo(item)"
              >
                <el-icon class="result-icon">
                  <Folder />
                </el-icon>
                <span
                  class="result-name"
                  v-html="highlight(item.name)"
                />
                <span class="result-sub">{{ item.jobNo }} · {{ item.customer || '无客户' }}</span>
              </div>
            </div>

            <!-- BOM条目 -->
            <div
              v-if="results.bom.length > 0"
              class="search-section"
            >
              <div class="search-section-title">
                <el-icon><Document /></el-icon> BOM条目 ({{ results.bom.length }})
              </div>
              <div
                v-for="item in results.bom"
                :key="`bom-${item.id}`"
                class="search-result-item"
                :class="{ active: isActive(item) }"
                @mouseenter="setActive(item)"
                @click="navigateTo(item)"
              >
                <el-icon class="result-icon">
                  <Document />
                </el-icon>
                <span
                  class="result-name"
                  v-html="highlight(item.chineseDescription || item.drawingNo || '未命名')"
                />
                <span class="result-sub">{{ item.drawingNo }} · {{ item.materialCatalogNo || '' }}</span>
              </div>
            </div>
          </div>

          <!-- 无结果 -->
          <div
            v-else
            class="search-no-results"
          >
            <el-icon
              :size="32"
              color="#c0c4cc"
            >
              <Search />
            </el-icon>
            <p>未找到与 "{{ keyword }}" 相关的结果</p>
          </div>
        </template>

        <!-- 空状态提示 -->
        <div
          v-if="!keyword && recentSearches.length === 0"
          class="search-empty"
        >
          <p>输入关键词搜索设备、组件、项目或BOM条目</p>
          <p class="search-tip">
            按 <kbd>↑</kbd> <kbd>↓</kbd> 导航，<kbd>Enter</kbd> 跳转，<kbd>Esc</kbd> 关闭
          </p>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { Search, Clock, Monitor, Box, Folder, Document } from '@element-plus/icons-vue'
import { useEquipmentStore } from '@/stores/equipment'
import { useModulesStore } from '@/stores/modules'
import { useProjectsStore } from '@/stores/projects'

/** 搜索结果项（统一结构） */
interface SearchResultItem {
  id: string
  type: 'equipment' | 'module' | 'project' | 'bom'
  name: string
  /** 跳转路由 */
  route: { name: string; params?: Record<string, string> }
  /** 设备型号 */
  model?: string
  /** 组件图号 */
  drawingNo?: string
  /** 组件中文名 */
  nameZh?: string
  /** 项目JOB号 */
  jobNo?: string
  /** 项目客户 */
  customer?: string
  /** BOM物料号 */
  materialCatalogNo?: string
  /** BOM中文描述 */
  chineseDescription?: string
  /** 关联模块ID（BOM条目用） */
  moduleId?: string
}

const router = useRouter()
const equipmentStore = useEquipmentStore()
const modulesStore = useModulesStore()
const projectsStore = useProjectsStore()

const containerRef = ref<HTMLElement | null>(null)
const inputRef = ref<HTMLInputElement | null>(null)
const keyword = ref('')
const panelVisible = ref(false)
const activeIndex = ref(-1)

const RECENT_KEY = 'bom_global_recent_searches'
const MAX_RECENT = 8

/** 最近搜索记录 */
const recentSearches = ref<SearchResultItem[]>([])

function loadRecent() {
  try {
    const raw = localStorage.getItem(RECENT_KEY)
    if (raw) recentSearches.value = JSON.parse(raw)
  } catch {
    recentSearches.value = []
  }
}

function saveRecent(item: SearchResultItem) {
  // 去重：同类型同id只保留最新
  recentSearches.value = recentSearches.value.filter(
    (r) => !(r.type === item.type && r.id === item.id)
  )
  recentSearches.value.unshift(item)
  if (recentSearches.value.length > MAX_RECENT) {
    recentSearches.value = recentSearches.value.slice(0, MAX_RECENT)
  }
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(recentSearches.value))
  } catch {
    // ignore
  }
}

/** 搜索结果分组 */
const results = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  if (!kw) return { equipment: [], module: [], project: [], bom: [] as SearchResultItem[] }

  // 设备：name / model
  const equipment: SearchResultItem[] = equipmentStore.equipments
    .filter(
      (e) =>
        e.name.toLowerCase().includes(kw) ||
        (e.model || '').toLowerCase().includes(kw)
    )
    .slice(0, 5)
    .map((e) => ({
      id: e.id,
      type: 'equipment' as const,
      name: e.name,
      model: e.model,
      route: { name: 'EquipmentEdit', params: { id: e.id } }
    }))

  // 组件：drawingNo / nameZh / nameEn
  const module: SearchResultItem[] = modulesStore.modules
    .filter(
      (m) =>
        m.drawingNo.toLowerCase().includes(kw) ||
        m.nameZh.toLowerCase().includes(kw) ||
        (m.nameEn || '').toLowerCase().includes(kw)
    )
    .slice(0, 5)
    .map((m) => ({
      id: m.id,
      type: 'module' as const,
      name: m.nameZh,
      nameZh: m.nameZh,
      drawingNo: m.drawingNo,
      route: { name: 'ModuleEdit', params: { id: m.id } }
    }))

  // 项目：name / jobNo / customer
  const project: SearchResultItem[] = projectsStore.projects
    .filter(
      (p) =>
        p.name.toLowerCase().includes(kw) ||
        p.jobNo.toLowerCase().includes(kw) ||
        (p.customer || '').toLowerCase().includes(kw)
    )
    .slice(0, 5)
    .map((p) => ({
      id: p.id,
      type: 'project' as const,
      name: p.name,
      jobNo: p.jobNo,
      customer: p.customer,
      route: { name: 'ProjectEdit', params: { id: p.id } }
    }))

  // BOM条目：BOM 数据存于独立 bomItems 表（异步按需加载），
  // modulesStore.modules 运行时不携带 BOM 条目，全局搜索保持只读同步，故此处不返回 BOM 结果。
  const bom: SearchResultItem[] = []

  return { equipment, module, project, bom }
})

/** 所有结果扁平化（用于键盘导航） */
const allResults = computed<SearchResultItem[]>(() => {
  if (!keyword.value) return recentSearches.value
  return [
    ...results.value.equipment,
    ...results.value.module,
    ...results.value.project,
    ...results.value.bom
  ]
})

const hasResults = computed(() => allResults.value.length > 0)

/** HTML 转义，防止 v-html 渲染用户输入时引发 XSS */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** 高亮匹配文字（先转义 HTML 再做高亮替换） */
function highlight(text: string): string {
  const escaped = escapeHtml(text)
  const kw = keyword.value.trim()
  if (!kw || !text) return escaped
  const regex = new RegExp(`(${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
  return escaped.replace(regex, '<mark class="search-highlight">$1</mark>')
}

/** 类型标签 */
function typeLabel(type: string): string {
  const map: Record<string, string> = {
    equipment: '设备',
    module: '组件',
    project: '项目',
    bom: 'BOM条目'
  }
  return map[type] || type
}

/** 键盘导航 */
function isActive(item: SearchResultItem): boolean {
  const idx = allResults.value.findIndex((r) => r.id === item.id && r.type === item.type)
  return idx === activeIndex.value
}

function setActive(item: SearchResultItem) {
  activeIndex.value = allResults.value.findIndex((r) => r.id === item.id && r.type === item.type)
}

/** 跳转 */
function navigateTo(item: SearchResultItem) {
  saveRecent(item)
  panelVisible.value = false
  keyword.value = ''
  activeIndex.value = -1
  router.push(item.route)
}

/** 输入框聚焦 */
function onFocus() {
  panelVisible.value = true
  activeIndex.value = -1
}

/** 键盘事件 */
function onKeydown(e: KeyboardEvent) {
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    if (activeIndex.value < allResults.value.length - 1) activeIndex.value++
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    if (activeIndex.value > 0) activeIndex.value--
  } else if (e.key === 'Enter') {
    e.preventDefault()
    const item = allResults.value[activeIndex.value]
    if (item) navigateTo(item)
  } else if (e.key === 'Escape') {
    panelVisible.value = false
    inputRef.value?.blur()
  }
}

/** 全局 Ctrl+K */
function handleGlobalKeydown(e: KeyboardEvent) {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault()
    panelVisible.value = true
    nextTick(() => inputRef.value?.focus())
  }
}

/** 点击外部关闭 */
function handleClickOutside(e: MouseEvent) {
  if (containerRef.value && !containerRef.value.contains(e.target as Node)) {
    panelVisible.value = false
  }
}

onMounted(() => {
  loadRecent()
  window.addEventListener('keydown', handleGlobalKeydown)
  document.addEventListener('click', handleClickOutside)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleGlobalKeydown)
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
.global-search {
  position: relative;
  width: 320px;
}
.search-input-wrapper {
  display: flex;
  align-items: center;
  background: var(--bg-card, #fff);
  border: 1px solid var(--border-base, #dcdfe6);
  border-radius: var(--radius-base, 4px);
  padding: 0 10px;
  height: 32px;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.search-input-wrapper.is-focused {
  border-color: var(--color-primary, #409eff);
  box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.15);
}
.search-icon {
  color: var(--text-secondary, #909399);
  margin-right: 6px;
  font-size: 14px;
}
.search-input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 13px;
  background: transparent;
  color: var(--text-primary, #303133);
  min-width: 0;
}
.search-input::placeholder {
  color: var(--text-placeholder, #c0c4cc);
}
.search-kbd {
  font-size: 11px;
  color: var(--text-secondary, #909399);
  background: var(--bg-hover, #f5f7fa);
  border: 1px solid var(--border-light, #e4e7ed);
  border-radius: 3px;
  padding: 1px 5px;
  margin-left: 6px;
  font-family: inherit;
}
.search-panel {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  background: var(--bg-card, #fff);
  border: 1px solid var(--border-light, #e4e7ed);
  border-radius: var(--radius-base, 4px);
  box-shadow: var(--shadow-lg);
  z-index: var(--z-popover, 2000);
  max-height: 480px;
  overflow-y: auto;
  padding: 8px 0;
}
.search-section {
  margin-bottom: 4px;
}
.search-section-title {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary, #909399);
  background: var(--bg-hover, #f5f7fa);
}
.search-result-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  cursor: pointer;
  transition: background-color 0.15s;
}
.search-result-item:hover,
.search-result-item.active {
  background-color: var(--color-primary-lighter, #ecf5ff);
}
.result-icon {
  color: var(--text-secondary, #909399);
  font-size: 14px;
  flex-shrink: 0;
}
.result-name {
  flex: 1;
  font-size: 13px;
  color: var(--text-primary, #303133);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.result-sub {
  font-size: 12px;
  color: var(--text-secondary, #909399);
  flex-shrink: 0;
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.search-no-results,
.search-empty {
  padding: 32px 16px;
  text-align: center;
  color: var(--text-secondary, #909399);
  font-size: 13px;
}
.search-no-results p,
.search-empty p {
  margin-top: 8px;
}
.search-tip {
  font-size: 12px;
  color: var(--text-placeholder, #c0c4cc);
  margin-top: 4px !important;
}
.search-tip kbd {
  font-size: 11px;
  background: var(--bg-hover, #f5f7fa);
  border: 1px solid var(--border-light, #e4e7ed);
  border-radius: 3px;
  padding: 0 4px;
  margin: 0 2px;
}
/* 面板动画 */
.search-panel-enter-active,
.search-panel-leave-active {
  transition: opacity 0.15s, transform 0.15s;
}
.search-panel-enter-from,
.search-panel-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
