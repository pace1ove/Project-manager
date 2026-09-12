<template>
  <div>
    <el-card shadow="never">
      <template #header>
        <div class="overview-header">
          <span>BOM结构总览（含所有子组件）</span>
          <el-radio-group
            v-model="overviewViewMode"
            size="small"
          >
            <el-radio-button value="tree">
              组件树视图
            </el-radio-button>
            <el-radio-button value="merged">
              合并明细视图
            </el-radio-button>
          </el-radio-group>
        </div>
      </template>

      <div class="overview-filters">
        <el-input
          v-model="overviewModuleSearch"
          placeholder="搜索模块名称/图号..."
          clearable
          prefix-icon="Search"
          style="width: 220px; margin-right: 8px"
        />
        <el-radio-group
          v-model="overviewTypeFilter"
          size="small"
          style="margin-right: 8px"
        >
          <el-radio-button value="all">
            全部
          </el-radio-button>
          <el-radio-button value="assembly">
            装配
          </el-radio-button>
          <el-radio-button value="order">
            下单
          </el-radio-button>
          <el-radio-button value="both">
            两者
          </el-radio-button>
        </el-radio-group>
        <el-input
          v-if="overviewViewMode === 'merged'"
          v-model="overviewMaterialSearch"
          placeholder="搜索中文描述/物料目录号..."
          clearable
          prefix-icon="Search"
          style="width: 220px"
        />
      </div>

      <!-- 模块树视图 -->
      <div
        v-if="overviewViewMode === 'tree'"
        class="tree-view"
      >
        <div
          v-if="overviewModules.length === 0"
          class="empty-tip"
        >
          暂无组件数据
        </div>
        <div v-else>
          <div
            v-for="mod in filteredOverviewModules"
            :key="mod.id"
            class="tree-module-item"
            :style="{ marginLeft: mod.depth * 24 + 'px' }"
          >
            <div
              class="tree-module-header"
              @click="toggleOverviewModule(mod.id)"
            >
              <span class="tree-toggle-icon">{{ overviewCollapsedIds.has(mod.id) ? '▶' : '▼' }}</span>
              <span class="tree-module-drawing">{{ mod.drawingNo }}</span>
              <span class="tree-module-name">{{ mod.nameZh }}</span>
              <el-tag
                size="small"
                type="info"
                class="tree-module-count"
              >
                {{ mod.originalBomCount }} 条BOM
              </el-tag>
            </div>
            <div
              v-if="!overviewCollapsedIds.has(mod.id) && mod.bomItems.length > 0"
              class="tree-bom-table"
            >
              <el-table
                :data="mod.bomItems"
                size="small"
                border
                style="width: 100%"
              >
                <el-table-column
                  label="行号"
                  width="60"
                  align="center"
                >
                  <template #default="{ $index }">
                    {{ $index + 1 }}
                  </template>
                </el-table-column>
                <el-table-column
                  v-for="field in visibleFields"
                  :key="field.key"
                  :prop="field.key"
                  :label="field.label"
                  :min-width="field.key === 'chineseDescription' ? 160 : 100"
                  show-overflow-tooltip
                >
                  <template #default="{ row }">
                    <el-tag
                      v-if="field.key === 'type'"
                      :type="getBomTypeCfg(row[field.key]).type"
                      size="small"
                    >
                      {{ getBomTypeCfg(row[field.key]).label }}
                    </el-tag>
                    <span v-else>{{ row[field.key] || '-' }}</span>
                  </template>
                </el-table-column>
              </el-table>
            </div>
            <div
              v-else-if="!overviewCollapsedIds.has(mod.id) && mod.bomItems.length === 0"
              class="empty-bom-tip"
            >
              该组件暂无BOM条目
            </div>
          </div>
          <div
            v-if="filteredOverviewModules.length === 0"
            class="empty-tip"
          >
            没有匹配筛选条件的模块
          </div>
        </div>
      </div>

      <!-- 合并明细视图 -->
      <div
        v-else
        class="merged-view"
      >
        <div class="merged-summary">
          <el-tag type="primary">
            组件总数：{{ overviewModules.length }}
          </el-tag>
          <el-tag type="success">
            合并后条目数：{{ mergedBomItems.length }}
          </el-tag>
          <el-tag type="warning">
            原始条目数：{{ totalOriginalBomCount }}
          </el-tag>
        </div>
        <el-table
          :data="filteredMergedBomItems"
          stripe
          border
          style="width: 100%; margin-top: 12px"
          max-height="600"
        >
          <el-table-column
            label="行号"
            width="60"
            align="center"
          >
            <template #default="{ $index }">
              {{ $index + 1 }}
            </template>
          </el-table-column>
          <el-table-column
            v-for="field in visibleFields"
            :key="field.key"
            :prop="field.key"
            :label="field.label"
            :min-width="field.key === 'chineseDescription' ? 160 : 100"
            show-overflow-tooltip
          >
            <template #default="{ row }">
              <el-tag
                v-if="field.key === 'type'"
                :type="getBomTypeCfg(row[field.key]).type"
                size="small"
              >
                {{ getBomTypeCfg(row[field.key]).label }}
              </el-tag>
              <span
                v-else-if="field.key === 'quantity'"
                style="font-weight: 600; color: #409eff;"
              >{{ row[field.key] }}</span>
              <span v-else>{{ row[field.key] || '-' }}</span>
            </template>
          </el-table-column>
          <el-table-column
            label="来源组件"
            min-width="200"
            show-overflow-tooltip
          >
            <template #default="{ row }">
              <el-tooltip
                :content="row.sourceModuleNames.join('、')"
                placement="top"
                :disabled="row.sourceModuleNames.length <= 2"
              >
                <div class="source-modules">
                  <el-tag
                    v-for="(name, idx) in row.sourceModuleNames.slice(0, 2)"
                    :key="idx"
                    size="small"
                    type="info"
                    effect="plain"
                    style="margin-right: 4px;"
                  >
                    {{ name }}
                  </el-tag>
                  <el-tag
                    v-if="row.sourceModuleNames.length > 2"
                    size="small"
                    type="info"
                    effect="plain"
                  >
                    +{{ row.sourceModuleNames.length - 2 }}
                  </el-tag>
                </div>
              </el-tooltip>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useModulesStore } from '@/stores/modules'
import { BOM_TYPE_CONFIG } from '@/utils/bomGenerator'
import type { BomItem, BomTemplateField } from '@/types'

type BomType = 'assembly' | 'order' | 'both'

const props = defineProps<{
  moduleId: string
  isNew: boolean
  visibleFields: BomTemplateField[]
}>()

const modulesStore = useModulesStore()

/** 递归收集所有子孙模块ID（与主编辑器保持一致的本地实现） */
function getDescendantIds(rootId: string): Set<string> {
  const descendants = new Set<string>()
  const stack = [rootId]
  while (stack.length > 0) {
    const id = stack.pop()!
    const mod = modulesStore.getModuleById(id)
    if (!mod) continue
    for (const childId of mod.childModuleIds) {
      if (!descendants.has(childId)) {
        descendants.add(childId)
        stack.push(childId)
      }
    }
  }
  return descendants
}

interface OverviewModule {
  id: string
  drawingNo: string
  nameZh: string
  depth: number
  bomItems: BomItem[]
}

interface MergedBomItem {
  [key: string]: any
  materialCatalogNo?: string
  chineseDescription?: string
  reserved1?: string
  assemblyUnit?: string
  quantity: number
  sourceModuleIds: string[]
  sourceModuleNames: string[]
}

const overviewViewMode = ref<'tree' | 'merged'>('tree')
const overviewCollapsedIds = ref<Set<string>>(new Set())
const overviewModules = ref<OverviewModule[]>([])

const overviewModuleSearch = ref('')
const overviewTypeFilter = ref<'all' | BomType>('all')
const overviewMaterialSearch = ref('')

interface FilteredOverviewModule extends OverviewModule {
  originalBomCount: number
}

const totalOriginalBomCount = computed(() =>
  overviewModules.value.reduce((sum, mod) => sum + mod.bomItems.length, 0)
)

const filteredOverviewModules = computed<FilteredOverviewModule[]>(() => {
  const kw = overviewModuleSearch.value.trim().toLowerCase()
  return overviewModules.value
    .filter((mod) => {
      if (!kw) return true
      return mod.nameZh.toLowerCase().includes(kw) || mod.drawingNo.toLowerCase().includes(kw)
    })
    .map((mod) => ({
      ...mod,
      originalBomCount: mod.bomItems.length,
      bomItems: overviewTypeFilter.value === 'all' ? mod.bomItems : mod.bomItems.filter((i) => i.type === overviewTypeFilter.value)
    }))
})

function getBomTypeCfg(type: string) {
  return BOM_TYPE_CONFIG[type as BomType]
}

function mergeBomItems(modules: OverviewModule[]): MergedBomItem[] {
  const mergedMap = new Map<string, MergedBomItem>()
  const fixedFields = new Set(['id', 'moduleId', 'sortOrder', 'source'])
  for (const mod of modules) {
    for (const item of mod.bomItems) {
      const key = `${item.materialCatalogNo || ''}|${item.reserved1 || ''}|${item.assemblyUnit || ''}`
      if (mergedMap.has(key)) {
        const existing = mergedMap.get(key)!
        existing.quantity += (item.quantity || 0)
        if (!existing.sourceModuleIds.includes(mod.id)) {
          existing.sourceModuleIds.push(mod.id)
          existing.sourceModuleNames.push(mod.drawingNo)
        }
      } else {
        const newItem: MergedBomItem = {
          quantity: item.quantity || 0,
          sourceModuleIds: [mod.id],
          sourceModuleNames: [mod.drawingNo]
        }
        for (const fieldKey of Object.keys(item)) {
          if (!fixedFields.has(fieldKey)) {
            newItem[fieldKey] = item[fieldKey]
          }
        }
        mergedMap.set(key, newItem)
      }
    }
  }
  return Array.from(mergedMap.values()).sort((a, b) => {
    const aName = a.chineseDescription || ''
    const bName = b.chineseDescription || ''
    return aName.localeCompare(bName, 'zh-CN')
  })
}

const mergedBomItems = computed<MergedBomItem[]>(() => mergeBomItems(overviewModules.value))

const filteredMergedBomItems = computed<MergedBomItem[]>(() => {
  const modKw = overviewModuleSearch.value.trim().toLowerCase()
  const matKw = overviewMaterialSearch.value.trim().toLowerCase()
  const modules = overviewModules.value.filter((mod) => {
    if (!modKw) return true
    return mod.nameZh.toLowerCase().includes(modKw) || mod.drawingNo.toLowerCase().includes(modKw)
  })
  let result = mergeBomItems(modules)
  if (overviewTypeFilter.value !== 'all') {
    result = result.filter((i) => i.type === overviewTypeFilter.value)
  }
  if (matKw) {
    result = result.filter(
      (i) =>
        (i.materialCatalogNo || '').toLowerCase().includes(matKw) ||
        (i.chineseDescription || '').toLowerCase().includes(matKw)
    )
  }
  return result
})

function toggleOverviewModule(id: string) {
  if (overviewCollapsedIds.value.has(id)) {
    overviewCollapsedIds.value.delete(id)
  } else {
    overviewCollapsedIds.value.add(id)
  }
  overviewCollapsedIds.value = new Set(overviewCollapsedIds.value)
}

async function load() {
  if (props.isNew) {
    overviewModules.value = []
    return
  }
  try {
    const allModuleIds = [props.moduleId, ...Array.from(getDescendantIds(props.moduleId))]
    const moduleMap = new Map(allModuleIds.map((id) => [id, modulesStore.getModuleById(id)]))
    const depthMap = new Map<string, number>()
    function calcDepth(id: string): number {
      if (depthMap.has(id)) return depthMap.get(id)!
      const mod = moduleMap.get(id)
      const parentIds = mod?.parentModuleIds || []
      let maxDepth = 0
      for (const parentId of parentIds) {
        if (moduleMap.has(parentId)) {
          const depth = calcDepth(parentId) + 1
          maxDepth = Math.max(maxDepth, depth)
        }
      }
      depthMap.set(id, maxDepth)
      return maxDepth
    }
    for (const id of allModuleIds) calcDepth(id)
    const sortedIds: string[] = []
    const visited = new Set<string>()
    function traverse(id: string) {
      if (visited.has(id)) return
      visited.add(id)
      sortedIds.push(id)
      const mod = moduleMap.get(id)
      if (mod) {
        for (const childId of mod.childModuleIds) {
          if (moduleMap.has(childId)) traverse(childId)
        }
      }
    }
    traverse(props.moduleId)
    for (const id of allModuleIds) {
      if (!visited.has(id)) traverse(id)
    }
    const results = await Promise.all(
      sortedIds.map(async (id) => {
        const mod = moduleMap.get(id)
        const bomItems = await modulesStore.getBomItems(id)
        return {
          id,
          drawingNo: mod?.drawingNo || id,
          nameZh: mod?.nameZh || '',
          depth: depthMap.get(id) || 0,
          bomItems: bomItems.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
        } as OverviewModule
      })
    )
    overviewModules.value = results
  } catch (err) {
    console.error('加载BOM总览失败:', err)
  }
}

defineExpose({ load })
</script>

<style scoped>
.overview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.overview-filters {
  margin-bottom: 12px;
}
.tree-view .empty-tip,
.merged-view .empty-tip {
  color: #909399;
  text-align: center;
  padding: 24px 0;
}
.tree-module-item {
  margin-bottom: 4px;
}
.tree-module-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  cursor: pointer;
  border-radius: 4px;
}
.tree-module-header:hover {
  background: #f5f7fa;
}
.tree-toggle-icon {
  font-size: 12px;
  color: #909399;
  width: 14px;
}
.tree-module-drawing {
  font-weight: 600;
  color: #303133;
}
.tree-module-name {
  color: #606266;
  flex: 1;
}
.tree-module-count {
  margin-left: auto;
}
.tree-bom-table {
  margin: 4px 0 8px 28px;
}
.empty-bom-tip {
  margin: 4px 0 8px 28px;
  color: #c0c4cc;
  font-size: 13px;
}
.merged-summary {
  display: flex;
  gap: 8px;
}
.source-modules {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
}
</style>
