<template>
  <div class="page-container">
    <PageBreadcrumb />
    <el-tabs
      v-model="activeTab"
      type="border-card"
      class="extension-tabs"
    >
      <!-- ===== Tab1: 零件追溯查询（原有） ===== -->
      <el-tab-pane
        label="零件追溯查询"
        name="trace"
      >
        <div class="card-wrapper">
          <!-- 搜索区域 -->
          <div class="search-bar">
            <div class="search-title">
              <el-icon class="search-icon">
                <Search />
              </el-icon>
              <span>零件追溯查询</span>
            </div>
            <el-form
              :model="searchForm"
              inline
              class="search-form"
              @submit.prevent="handleSearch"
            >
              <el-form-item label="物料号">
                <el-input
                  v-model="searchForm.materialCatalogNo"
                  placeholder="如 ELEC-001"
                  clearable
                  style="width: 180px"
                  @keyup.enter="handleSearch"
                />
              </el-form-item>
              <el-form-item label="图号">
                <el-input
                  v-model="searchForm.drawingNo"
                  placeholder="如 ASM-001"
                  clearable
                  style="width: 180px"
                  @keyup.enter="handleSearch"
                />
              </el-form-item>
              <el-form-item label="中文描述">
                <el-input
                  v-model="searchForm.chineseDescription"
                  placeholder="如 断路器"
                  clearable
                  style="width: 200px"
                  @keyup.enter="handleSearch"
                />
              </el-form-item>
              <el-form-item>
                <el-button
                  type="primary"
                  :loading="searching"
                  @click="handleSearch"
                >
                  <el-icon><Search /></el-icon>
                  查询
                </el-button>
                <el-button
                  v-if="hasSearched"
                  @click="handleReset"
                >
                  重置
                </el-button>
              </el-form-item>
            </el-form>
            <div class="search-tip">
              <el-text
                type="info"
                size="small"
              >
                提示：支持多字段组合查询，留空的字段将被忽略。将检索所有项目下单BOM和组件BOM
              </el-text>
            </div>
          </div>

          <!-- 加载骨架屏 -->
          <SkeletonScreen
            v-if="searching"
            :loading="searching"
            :rows="6"
          />

          <!-- 查询结果 -->
          <template v-else-if="hasSearched">
            <!-- 统计面板 -->
            <div
              v-if="traceResults.length > 0"
              class="stats-panel"
            >
              <el-row :gutter="16">
                <el-col :span="6">
                  <div class="stat-card stat-parts">
                    <div class="stat-icon">
                      <el-icon><Box /></el-icon>
                    </div>
                    <div class="stat-info">
                      <div class="stat-value">
                        {{ traceResults.length }}
                      </div>
                      <div class="stat-label">
                        匹配零件数
                      </div>
                    </div>
                  </div>
                </el-col>
                <el-col :span="6">
                  <div class="stat-card stat-modules">
                    <div class="stat-icon">
                      <el-icon><Box /></el-icon>
                    </div>
                    <div class="stat-info">
                      <div class="stat-value">
                        {{ totalModuleCount }}
                      </div>
                      <div class="stat-label">
                        涉及组件数
                      </div>
                    </div>
                  </div>
                </el-col>
                <el-col :span="6">
                  <div class="stat-card stat-projects">
                    <div class="stat-icon">
                      <el-icon><FolderOpened /></el-icon>
                    </div>
                    <div class="stat-info">
                      <div class="stat-value">
                        {{ totalProjectCount }}
                      </div>
                      <div class="stat-label">
                        涉及项目数
                      </div>
                    </div>
                  </div>
                </el-col>
                <el-col :span="6">
                  <div class="stat-card stat-qty">
                    <div class="stat-icon">
                      <el-icon><DataAnalysis /></el-icon>
                    </div>
                    <div class="stat-info">
                      <div class="stat-value">
                        {{ totalQuantity }}
                      </div>
                      <div class="stat-label">
                        总用量
                      </div>
                    </div>
                  </div>
                </el-col>
              </el-row>
            </div>

            <!-- 无结果 -->
            <EmptyState
              v-if="traceResults.length === 0"
              title="未找到匹配的零件"
              description="请检查输入的物料号、图号或中文描述是否正确"
              variant="no-results"
            />

            <!-- 结果超上限提示 -->
            <el-alert
              v-if="traceTruncated"
              type="warning"
              :closable="false"
              show-icon
              style="margin-bottom: 12px;"
              :title="`匹配结果超过 ${MAX_TRACE_RESULTS} 条，已仅展示前 ${MAX_TRACE_RESULTS} 条。请缩小搜索范围（如指定更精确的物料号）。`"
            />

            <!-- 匹配零件列表 + 追溯详情 -->
            <div
              v-if="traceResults.length > 0"
              class="result-section"
            >
              <div class="section-header">
                <el-icon class="section-icon">
                  <List />
                </el-icon>
                <span class="section-title">匹配零件明细与追溯</span>
                <el-tag
                  type="warning"
                  size="small"
                >
                  {{ traceResults.length }} 种零件
                </el-tag>
                <div class="section-actions">
                  <ColumnSettings
                    v-model="resultColumns"
                    storage-key="extension_trace_results"
                  />
                </div>
              </div>

              <el-table
                :data="traceResults"
                stripe
                border
                style="width: 100%"
                class="result-table"
                row-key="partKey"
              >
                <el-table-column type="expand">
                  <template #default="{ row }">
                    <div class="trace-detail">
                      <el-collapse
                        v-model="row.activeCollapse"
                        class="trace-collapse"
                      >
                        <!-- 组件追溯 -->
                        <el-collapse-item
                          v-if="row.components.length > 0"
                          name="components"
                        >
                          <template #title>
                            <span class="collapse-title">
                              <el-icon><Box /></el-icon>
                              出现在 {{ row.components.length }} 个组件中
                            </span>
                          </template>
                          <el-table
                            :data="row.components"
                            size="small"
                            stripe
                            style="width: 100%"
                          >
                            <el-table-column
                              label="组件图号"
                              width="160"
                            >
                              <template #default="{ row: mod }">
                                <el-link
                                  type="primary"
                                  @click="goToModule(mod.moduleId)"
                                >
                                  {{ mod.drawingNo }}
                                </el-link>
                              </template>
                            </el-table-column>
                            <el-table-column
                              label="组件名称"
                              min-width="180"
                            >
                              <template #default="{ row: mod }">
                                <el-link
                                  type="primary"
                                  @click="goToModule(mod.moduleId)"
                                >
                                  {{ mod.nameZh }}
                                </el-link>
                              </template>
                            </el-table-column>
                            <el-table-column
                              prop="equipmentName"
                              label="所属设备"
                              min-width="160"
                              show-overflow-tooltip
                            />
                            <el-table-column
                              label="数量"
                              width="100"
                              align="center"
                            >
                              <template #default="{ row: mod }">
                                <span class="qty-highlight">{{ mod.quantity }}</span>
                              </template>
                            </el-table-column>
                            <el-table-column
                              label="BOM类型"
                              width="100"
                              align="center"
                            >
                              <template #default="{ row: mod }">
                                <el-tag
                                  :type="bomTypeTagType(mod.bomType)"
                                  size="small"
                                >
                                  {{ bomTypeLabel(mod.bomType) }}
                                </el-tag>
                              </template>
                            </el-table-column>
                          </el-table>
                        </el-collapse-item>

                        <!-- 项目追溯 -->
                        <el-collapse-item
                          v-if="row.projects.length > 0"
                          name="projects"
                        >
                          <template #title>
                            <span class="collapse-title">
                              <el-icon><FolderOpened /></el-icon>
                              出现在 {{ row.projects.length }} 个项目中
                            </span>
                          </template>
                          <el-table
                            :data="row.projects"
                            size="small"
                            stripe
                            style="width: 100%"
                          >
                            <el-table-column
                              label="项目名称"
                              min-width="180"
                            >
                              <template #default="{ row: proj }">
                                <el-link
                                  type="primary"
                                  @click="goToProject(proj.projectId)"
                                >
                                  {{ proj.projectName }}
                                </el-link>
                              </template>
                            </el-table-column>
                            <el-table-column
                              prop="jobNo"
                              label="JOB号"
                              width="140"
                            />
                            <el-table-column
                              label="项目状态"
                              width="100"
                              align="center"
                            >
                              <template #default="{ row: proj }">
                                <el-tag
                                  :type="projectStatusType(proj.status)"
                                  size="small"
                                >
                                  {{ projectStatusLabel(proj.status) }}
                                </el-tag>
                              </template>
                            </el-table-column>
                            <el-table-column
                              label="数量"
                              width="100"
                              align="center"
                            >
                              <template #default="{ row: proj }">
                                <span class="qty-highlight">{{ proj.quantity }}</span>
                              </template>
                            </el-table-column>
                            <el-table-column
                              label="来源组件"
                              min-width="200"
                              show-overflow-tooltip
                            >
                              <template #default="{ row: proj }">
                                <template v-if="proj.sourceModules.length > 0">
                                  <el-tag
                                    v-for="mod in proj.sourceModules"
                                    :key="mod"
                                    size="small"
                                    type="info"
                                    class="source-tag"
                                  >
                                    {{ mod }}
                                  </el-tag>
                                </template>
                                <span
                                  v-else
                                  class="text-muted"
                                >手动添加</span>
                              </template>
                            </el-table-column>
                          </el-table>
                        </el-collapse-item>

                        <el-collapse-item
                          v-if="row.components.length === 0 && row.projects.length === 0"
                          name="none"
                          disabled
                        >
                          <template #title>
                            <span class="collapse-title text-muted">无追溯信息</span>
                          </template>
                        </el-collapse-item>
                      </el-collapse>
                    </div>
                  </template>
                </el-table-column>

                <el-table-column
                  v-for="col in visibleColumns"
                  :key="col.key"
                  :label="col.label"
                  :width="col.width"
                  :min-width="col.key === 'chineseDescription' ? 160 : undefined"
                  :show-overflow-tooltip="col.key === 'chineseDescription' || col.key === 'reserved1'"
                  :align="col.key === 'totalQty' || col.key === 'projectCount' || col.key === 'moduleCount' ? 'center' : undefined"
                >
                  <template #default="{ row }">
                    <!-- 物料号 -->
                    <template v-if="col.key === 'materialCatalogNo'">
                      <span
                        class="code-highlight"
                        v-html="highlightText(row.materialCatalogNo || '-', searchForm.materialCatalogNo)"
                      />
                    </template>
                    <!-- 图号 -->
                    <template v-else-if="col.key === 'drawingNo'">
                      <span
                        class="code-highlight"
                        v-html="highlightText(row.drawingNo || '-', searchForm.drawingNo)"
                      />
                    </template>
                    <!-- 中文描述 -->
                    <template v-else-if="col.key === 'chineseDescription'">
                      <span v-html="highlightText(row.chineseDescription || '-', searchForm.chineseDescription)" />
                    </template>
                    <!-- 预留1 -->
                    <template v-else-if="col.key === 'reserved1'">
                      {{ row.reserved1 || '-' }}
                    </template>
                    <!-- 装配单位 -->
                    <template v-else-if="col.key === 'assemblyUnit'">
                      {{ row.assemblyUnit || '-' }}
                    </template>
                    <!-- 项目出现次数 -->
                    <template v-else-if="col.key === 'projectCount'">
                      <el-tag
                        type="primary"
                        size="small"
                      >
                        {{ row.projectCount }}
                      </el-tag>
                    </template>
                    <!-- 组件出现次数 -->
                    <template v-else-if="col.key === 'moduleCount'">
                      <el-tag
                        type="success"
                        size="small"
                      >
                        {{ row.moduleCount }}
                      </el-tag>
                    </template>
                    <!-- 总数量 -->
                    <template v-else-if="col.key === 'totalQty'">
                      <span class="qty-highlight">{{ row.totalQty }}</span>
                    </template>
                  </template>
                </el-table-column>
              </el-table>
            </div>
          </template>

          <!-- 初始状态 -->
          <div
            v-else
            class="initial-state"
          >
            <el-icon class="initial-icon">
              <Search />
            </el-icon>
            <p class="initial-text">
              输入物料号、图号或中文描述，点击查询按钮开始追溯
            </p>
          </div>
        </div>
      </el-tab-pane>

      <!-- ===== Tab2: 物料使用统计 ===== -->
      <el-tab-pane
        label="物料使用统计"
        name="material"
      >
        <div class="card-wrapper">
          <div class="search-bar">
            <div class="search-title">
              <el-icon class="search-icon">
                <Search />
              </el-icon>
              <span>物料使用统计</span>
            </div>
            <el-form
              inline
              @submit.prevent="handleMaterialSearch"
            >
              <el-form-item label="物料搜索">
                <el-input
                  v-model="materialKeyword"
                  placeholder="物料号 / 图号 / 中文描述"
                  clearable
                  style="width: 280px"
                  @keyup.enter="handleMaterialSearch"
                />
              </el-form-item>
              <el-form-item>
                <el-button
                  type="primary"
                  :loading="materialLoading"
                  @click="handleMaterialSearch"
                >
                  <el-icon><Search /></el-icon> 统计
                </el-button>
                <el-button
                  :disabled="materialResults.length === 0"
                  @click="exportMaterialStats"
                >
                  <el-icon><Download /></el-icon> 导出Excel
                </el-button>
              </el-form-item>
            </el-form>
          </div>

          <SkeletonScreen
            v-if="materialLoading"
            :loading="materialLoading"
            :rows="5"
          />

          <template v-else-if="materialSearched">
            <EmptyState
              v-if="materialResults.length === 0"
              title="未找到匹配的物料"
              description="请检查搜索关键词"
              variant="no-results"
            />
            <el-table
              v-else
              :data="materialResults"
              stripe
              border
              style="width: 100%"
              row-key="materialCatalogNo"
            >
              <el-table-column type="expand">
                <template #default="{ row }">
                  <div class="material-detail">
                    <el-collapse>
                      <el-collapse-item
                        v-if="row.moduleUsages.length > 0"
                        :title="`出现在 ${row.moduleUsages.length} 个组件BOM中`"
                        name="m"
                      >
                        <el-table
                          :data="row.moduleUsages"
                          size="small"
                          stripe
                        >
                          <el-table-column
                            label="组件图号"
                            min-width="140"
                          >
                            <template #default="{ row: mu }">
                              <el-link
                                type="primary"
                                @click="goToModule(mu.moduleId)"
                              >
                                {{ mu.drawingNo }}
                              </el-link>
                            </template>
                          </el-table-column>
                          <el-table-column
                            prop="nameZh"
                            label="组件名称"
                            min-width="160"
                          />
                          <el-table-column
                            prop="equipmentName"
                            label="所属设备"
                            min-width="140"
                          />
                          <el-table-column
                            prop="quantity"
                            label="数量"
                            width="80"
                            align="center"
                          />
                          <el-table-column
                            label="类型"
                            width="80"
                            align="center"
                          >
                            <template #default="{ row: mu }">
                              {{ bomTypeLabel(mu.bomType) }}
                            </template>
                          </el-table-column>
                        </el-table>
                      </el-collapse-item>
                      <el-collapse-item
                        v-if="row.projectUsages.length > 0"
                        :title="`出现在 ${row.projectUsages.length} 个项目中`"
                        name="p"
                      >
                        <el-table
                          :data="row.projectUsages"
                          size="small"
                          stripe
                        >
                          <el-table-column
                            label="项目名称"
                            min-width="160"
                          >
                            <template #default="{ row: pu }">
                              <el-link
                                type="primary"
                                @click="goToProject(pu.projectId)"
                              >
                                {{ pu.projectName }}
                              </el-link>
                            </template>
                          </el-table-column>
                          <el-table-column
                            prop="jobNo"
                            label="JOB号"
                            width="130"
                          />
                          <el-table-column
                            prop="quantity"
                            label="数量"
                            width="80"
                            align="center"
                          />
                          <el-table-column
                            prop="sourceModuleDrawingNos"
                            label="来源模块"
                            min-width="180"
                          >
                            <template #default="{ row: pu }">
                              {{ pu.sourceModuleDrawingNos.join(', ') || '-' }}
                            </template>
                          </el-table-column>
                        </el-table>
                      </el-collapse-item>
                    </el-collapse>
                  </div>
                </template>
              </el-table-column>
              <el-table-column
                prop="materialCatalogNo"
                label="物料/目录号"
                width="150"
              />
              <el-table-column
                prop="drawingNo"
                label="图号"
                width="130"
              />
              <el-table-column
                prop="chineseDescription"
                label="中文描述"
                min-width="180"
              />
              <el-table-column
                prop="reserved1"
                label="规格"
                width="120"
              />
              <el-table-column
                prop="assemblyUnit"
                label="单位"
                width="80"
                align="center"
              />
              <el-table-column
                prop="moduleCount"
                label="组件数"
                width="80"
                align="center"
              />
              <el-table-column
                prop="projectCount"
                label="项目数"
                width="80"
                align="center"
              />
              <el-table-column
                prop="totalQuantity"
                label="总用量"
                width="90"
                align="center"
              >
                <template #default="{ row }">
                  <span class="qty-highlight">{{ row.totalQuantity }}</span>
                </template>
              </el-table-column>
            </el-table>
          </template>

          <div
            v-else
            class="initial-state"
          >
            <el-icon class="initial-icon">
              <DataAnalysis />
            </el-icon>
            <p class="initial-text">
              输入物料关键词，统计其在组件BOM和项目下单BOM中的使用情况
            </p>
          </div>
        </div>
      </el-tab-pane>

      <!-- ===== Tab3: 组件复用统计 ===== -->
      <el-tab-pane
        label="组件复用统计"
        name="reuse"
      >
        <div class="card-wrapper">
          <div class="search-bar">
            <div class="search-title">
              <el-icon class="search-icon">
                <Box />
              </el-icon>
              <span>组件复用统计</span>
            </div>
            <el-form inline>
              <el-form-item>
                <el-button
                  type="primary"
                  :loading="reuseLoading"
                  @click="loadReuseStats"
                >
                  <el-icon><Refresh /></el-icon> 刷新统计
                </el-button>
                <el-button
                  :disabled="reuseStats.length === 0"
                  @click="exportReuseStats"
                >
                  <el-icon><Download /></el-icon> 导出Excel
                </el-button>
              </el-form-item>
            </el-form>
          </div>

          <SkeletonScreen
            v-if="reuseLoading"
            :loading="reuseLoading"
            :rows="8"
          />
          <el-table
            v-else
            :data="reuseStats"
            stripe
            border
            style="width: 100%"
          >
            <el-table-column
              type="index"
              label="#"
              width="50"
              align="center"
            />
            <el-table-column
              label="组件图号"
              min-width="140"
            >
              <template #default="{ row }">
                <el-link
                  type="primary"
                  @click="goToModule(row.moduleId)"
                >
                  {{ row.drawingNo }}
                </el-link>
              </template>
            </el-table-column>
            <el-table-column
              prop="nameZh"
              label="组件名称"
              min-width="160"
            />
            <el-table-column
              prop="equipmentName"
              label="所属设备"
              min-width="140"
            />
            <el-table-column
              prop="configRefCount"
              label="被配置引用"
              width="100"
              align="center"
            >
              <template #default="{ row }">
                <el-tag
                  :type="row.configRefCount > 0 ? 'primary' : 'info'"
                  size="small"
                >
                  {{ row.configRefCount }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column
              prop="projectRefCount"
              label="被项目使用"
              width="100"
              align="center"
            >
              <template #default="{ row }">
                <el-tag
                  :type="row.projectRefCount > 0 ? 'success' : 'info'"
                  size="small"
                >
                  {{ row.projectRefCount }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column
              prop="totalReuse"
              label="总复用次数"
              width="100"
              align="center"
            >
              <template #default="{ row }">
                <span class="qty-highlight">{{ row.totalReuse }}</span>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Search, FolderOpened, Box, List, DataAnalysis, Refresh, Download } from '@element-plus/icons-vue'
import { useProjectsStore } from '@/stores/projects'
import { useModulesStore } from '@/stores/modules'
import { useEquipmentStore } from '@/stores/equipment'
import type { Project, OrderBomItem, Module, BomItem } from '@/types'
import EmptyState from '@/components/common/EmptyState.vue'
import SkeletonScreen from '@/components/common/SkeletonScreen.vue'
import ColumnSettings, { type ColumnConfig } from '@/components/common/ColumnSettings.vue'
import { exportToExcel } from '@/utils/excel'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import {
  searchMaterialUsage,
  getModuleReuseStats,
  type MaterialUsageResult,
  type ModuleReuseStat
} from '@/utils/materialStats'
import dayjs from 'dayjs'

const router = useRouter()
const projectsStore = useProjectsStore()
const modulesStore = useModulesStore()
const equipmentStore = useEquipmentStore()

// ===== Tab 切换 =====
const activeTab = ref('trace')

// ===== 物料使用统计 =====
const materialKeyword = ref('')
const materialLoading = ref(false)
const materialSearched = ref(false)
const materialResults = ref<MaterialUsageResult[]>([])

async function handleMaterialSearch() {
  const kw = materialKeyword.value.trim()
  if (!kw) return
  materialLoading.value = true
  materialSearched.value = true
  try {
    materialResults.value = await searchMaterialUsage(kw)
  } finally {
    materialLoading.value = false
  }
}

function exportMaterialStats() {
  const data = materialResults.value.map((r, idx) => ({
    序号: idx + 1,
    '物料/目录号': r.materialCatalogNo,
    图号: r.drawingNo,
    中文描述: r.chineseDescription,
    规格: r.reserved1,
    单位: r.assemblyUnit,
    涉及组件数: r.moduleCount,
    涉及项目数: r.projectCount,
    总用量: r.totalQuantity
  }))
  exportToExcel(data, `物料使用统计_${dayjs().format('YYYYMMDD_HHmmss')}`, '物料使用统计')
}

// ===== 组件复用统计 =====
const reuseLoading = ref(false)
const reuseStats = ref<ModuleReuseStat[]>([])

async function loadReuseStats() {
  reuseLoading.value = true
  try {
    reuseStats.value = await getModuleReuseStats()
  } finally {
    reuseLoading.value = false
  }
}

function exportReuseStats() {
  const data = reuseStats.value.map((r, idx) => ({
    序号: idx + 1,
    组件图号: r.drawingNo,
    组件名称: r.nameZh,
    所属设备: r.equipmentName,
    被配置引用数: r.configRefCount,
    被项目使用数: r.projectRefCount,
    总复用次数: r.totalReuse
  }))
  exportToExcel(data, `组件复用统计_${dayjs().format('YYYYMMDD_HHmmss')}`, '组件复用统计')
}

// 首次进入复用Tab时自动加载
watch(activeTab, (val) => {
  if (val === 'reuse' && reuseStats.value.length === 0) {
    loadReuseStats()
  }
})

// ===== 搜索表单 =====
interface SearchForm {
  materialCatalogNo: string
  drawingNo: string
  chineseDescription: string
}

const searchForm = reactive<SearchForm>({
  materialCatalogNo: '',
  drawingNo: '',
  chineseDescription: ''
})

const searching = ref(false)
const hasSearched = ref(false)

// ===== 列配置 =====
const resultColumns = ref<ColumnConfig[]>([
  { key: 'materialCatalogNo', label: '物料/目录号', visible: true, width: 140 },
  { key: 'drawingNo', label: '图号', visible: true, width: 140 },
  { key: 'chineseDescription', label: '中文描述', visible: true },
  { key: 'reserved1', label: '预留1', visible: true, width: 140 },
  { key: 'assemblyUnit', label: '装配单位', visible: true, width: 90 },
  { key: 'projectCount', label: '项目出现次数', visible: true, width: 120 },
  { key: 'moduleCount', label: '组件出现次数', visible: true, width: 120 },
  { key: 'totalQty', label: '总数量', visible: true, width: 100 }
])

const visibleColumns = computed(() => resultColumns.value.filter((c) => c.visible))

// ===== 追溯结果类型 =====
interface ComponentTrace {
  moduleId: string
  drawingNo: string
  nameZh: string
  equipmentName: string
  quantity: number
  bomType: BomItem['type']
}

interface ProjectTrace {
  projectId: string
  projectName: string
  jobNo: string
  status: Project['status']
  quantity: number
  sourceModules: string[]
}

interface TraceResult {
  partKey: string
  materialCatalogNo: string
  drawingNo: string
  chineseDescription: string
  reserved1: string
  assemblyUnit: string
  components: ComponentTrace[]
  projects: ProjectTrace[]
  projectCount: number
  moduleCount: number
  totalQty: number
  activeCollapse: string[]
}

const traceResults = ref<TraceResult[]>([])
// 追溯结果上限：防止极端数据量导致渲染/聚合卡顿
const MAX_TRACE_RESULTS = 200
const traceTruncated = ref(false)

// ===== 统计 =====
const totalModuleCount = computed(() => {
  const set = new Set<string>()
  traceResults.value.forEach((r) => r.components.forEach((c) => set.add(c.moduleId)))
  return set.size
})

const totalProjectCount = computed(() => {
  const set = new Set<string>()
  traceResults.value.forEach((r) => r.projects.forEach((p) => set.add(p.projectId)))
  return set.size
})

const totalQuantity = computed(() => {
  return traceResults.value.reduce((sum, r) => sum + r.totalQty, 0)
})

// ===== 关键词高亮 =====
function highlightText(text: string, keyword: string): string {
  if (!keyword || !keyword.trim()) return escapeHtml(text)
  const escaped = escapeHtml(text)
  const escapedKw = escapeHtml(keyword.trim())
  const regex = new RegExp(`(${escapedKw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
  return escaped.replace(regex, '<span class="search-highlight">$1</span>')
}

function escapeHtml(text: string): string {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

// ===== 模糊匹配 =====
function fuzzyMatch(text: string | undefined, keyword: string): boolean {
  if (!keyword || !keyword.trim()) return true
  if (!text) return false
  return text.toLowerCase().includes(keyword.trim().toLowerCase())
}

// ===== 执行查询 =====
async function handleSearch() {
  const hasAnyField = searchForm.materialCatalogNo.trim() || searchForm.drawingNo.trim() || searchForm.chineseDescription.trim()
  if (!hasAnyField) {
    return
  }

  searching.value = true
  hasSearched.value = true

  // 模拟异步加载，让骨架屏有机会展示
  await new Promise((resolve) => setTimeout(resolve, 300))

  // 用于收集所有匹配的零件（key: materialCatalogNo|drawingNo）
  const partMap = new Map<string, TraceResult & { projectIds: Set<string>; moduleIds: Set<string> }>()

  function collectPart(
    item: OrderBomItem | BomItem,
    sourceType: 'project' | 'module',
    sourceId: string,
    extra?: { component?: ComponentTrace; project?: ProjectTrace }
  ) {
    const key = `${item.materialCatalogNo || ''}|${item.drawingNo || ''}`
    let part = partMap.get(key)
    if (!part) {
      part = {
        partKey: key,
        materialCatalogNo: item.materialCatalogNo || '',
        drawingNo: item.drawingNo || '',
        chineseDescription: item.chineseDescription || '',
        reserved1: (item as any).reserved1 || '',
        assemblyUnit: (item as any).assemblyUnit || '',
        components: [],
        projects: [],
        projectCount: 0,
        moduleCount: 0,
        totalQty: 0,
        activeCollapse: [],
        projectIds: new Set<string>(),
        moduleIds: new Set<string>()
      }
      partMap.set(key, part)
    }
    // 更新规格和单位（取非空值）
    if (!part.reserved1 && (item as any).reserved1) part.reserved1 = (item as any).reserved1
    if (!part.assemblyUnit && (item as any).assemblyUnit) part.assemblyUnit = (item as any).assemblyUnit
    // 累加数量
    part.totalQty += item.quantity
    // 记录来源和追溯详情
    if (sourceType === 'project') {
      if (!part.projectIds.has(sourceId)) {
        part.projectIds.add(sourceId)
        part.projectCount = part.projectIds.size
        if (extra?.project) {
          part.projects.push(extra.project)
        }
      } else if (extra?.project) {
        // 同一项目可能有多条匹配，累加数量
        const existing = part.projects.find((p) => p.projectId === sourceId)
        if (existing) {
          existing.quantity += extra.project.quantity
        }
      }
    } else {
      if (!part.moduleIds.has(sourceId)) {
        part.moduleIds.add(sourceId)
        part.moduleCount = part.moduleIds.size
        if (extra?.component) {
          part.components.push(extra.component)
        }
      } else if (extra?.component) {
        const existing = part.components.find((c) => c.moduleId === sourceId && c.bomType === extra.component!.bomType)
        if (existing) {
          existing.quantity += extra.component.quantity
        } else if (extra.component) {
          part.components.push(extra.component)
        }
      }
    }
  }

  const exactMc = searchForm.materialCatalogNo.trim()

  if (exactMc) {
    // ===== 精确物料编码快速路径：利用 materialCatalogNo 索引 where().equals() 直接命中 =====
    // 避免遍历所有项目/模块再逐个模糊匹配；命中后再对图号、中文描述做二次过滤
    // 1) 下单BOM：按 projectId 分组
    const matchedOrder = await projectsStore.searchOrderBomItemsByMaterialCatalogNo(exactMc)
    const orderByProject = new Map<string, OrderBomItem[]>()
    for (const item of matchedOrder) {
      if (!fuzzyMatch(item.drawingNo, searchForm.drawingNo)) continue
      if (!fuzzyMatch(item.chineseDescription, searchForm.chineseDescription)) continue
      const pid = (item as any).projectId as string
      if (!orderByProject.has(pid)) orderByProject.set(pid, [])
      orderByProject.get(pid)!.push(item)
    }
    for (const [projectId, matchedItems] of orderByProject) {
      const project = projectsStore.getProjectById(projectId)
      if (!project) continue
      let totalQty = 0
      const sourceModuleSet = new Set<string>()
      for (const item of matchedItems) {
        totalQty += item.quantity
        if (item.sourceModuleIds && item.sourceModuleIds.length > 0) {
          for (const modId of item.sourceModuleIds) {
            const mod = modulesStore.getModuleById(modId)
            if (mod) sourceModuleSet.add(mod.drawingNo)
          }
        }
      }
      const projectTrace: ProjectTrace = {
        projectId,
        projectName: project.name,
        jobNo: project.jobNo,
        status: project.status,
        quantity: totalQty,
        sourceModules: Array.from(sourceModuleSet)
      }
      for (const item of matchedItems) collectPart(item, 'project', projectId, { project: projectTrace })
    }

    // 2) 模块BOM：按 moduleId 分组
    const matchedModule = await modulesStore.searchBomItemsByMaterialCatalogNo(exactMc)
    const bomByModule = new Map<string, BomItem[]>()
    for (const item of matchedModule) {
      if (!fuzzyMatch(item.drawingNo, searchForm.drawingNo)) continue
      if (!fuzzyMatch(item.chineseDescription, searchForm.chineseDescription)) continue
      const mid = (item as any).moduleId as string
      if (!bomByModule.has(mid)) bomByModule.set(mid, [])
      bomByModule.get(mid)!.push(item)
    }
    for (const [moduleId, matchedItems] of bomByModule) {
      const module = modulesStore.getModuleById(moduleId)
      if (!module) continue
      const equipment = equipmentStore.getEquipmentById(module.equipmentId)
      const equipmentName = equipment ? `${equipment.name} (${equipment.model})` : '未知设备'
      const bomTypes = new Set(matchedItems.map((i) => i.type))
      for (const bomType of bomTypes) {
        const typeQty = matchedItems.filter((i) => i.type === bomType).reduce((sum, i) => sum + i.quantity, 0)
        const componentTrace: ComponentTrace = {
          moduleId,
          drawingNo: module.drawingNo,
          nameZh: module.nameZh,
          equipmentName,
          quantity: typeQty,
          bomType
        }
        const typeItems = matchedItems.filter((i) => i.type === bomType)
        for (const item of typeItems) collectPart(item, 'module', moduleId, { component: componentTrace })
      }
    }
  } else {
    // ===== 模糊搜索回退：未提供物料编码时，遍历所有项目/模块（无法走索引） =====
    // 查询项目下单BOM
    for (const project of projectsStore.projects) {
      const orderBom = await projectsStore.getOrderBomItems(project.id)
      if (!orderBom || orderBom.length === 0) continue

      const matchedItems = orderBom.filter((item: OrderBomItem) =>
        fuzzyMatch(item.drawingNo, searchForm.drawingNo) &&
        fuzzyMatch(item.chineseDescription, searchForm.chineseDescription)
      )

      if (matchedItems.length > 0) {
        let totalQty = 0
        const sourceModuleSet = new Set<string>()
        for (const item of matchedItems) {
          totalQty += item.quantity
          if (item.sourceModuleIds && item.sourceModuleIds.length > 0) {
            for (const modId of item.sourceModuleIds) {
              const mod = modulesStore.getModuleById(modId)
              if (mod) sourceModuleSet.add(mod.drawingNo)
            }
          }
        }
        const projectTrace: ProjectTrace = {
          projectId: project.id,
          projectName: project.name,
          jobNo: project.jobNo,
          status: project.status,
          quantity: totalQty,
          sourceModules: Array.from(sourceModuleSet)
        }
        for (const item of matchedItems) collectPart(item, 'project', project.id, { project: projectTrace })
      }
    }

    // 查询模块BOM
    for (const module of modulesStore.modules) {
      const bomItems = await modulesStore.getBomItems(module.id)
      if (!bomItems || bomItems.length === 0) continue

      const matchedItems = bomItems.filter((item: BomItem) =>
        fuzzyMatch(item.drawingNo, searchForm.drawingNo) &&
        fuzzyMatch(item.chineseDescription, searchForm.chineseDescription)
      )

      if (matchedItems.length > 0) {
        const equipment = equipmentStore.getEquipmentById(module.equipmentId)
        const equipmentName = equipment ? `${equipment.name} (${equipment.model})` : '未知设备'
        const bomTypes = new Set(matchedItems.map((i) => i.type))
        for (const bomType of bomTypes) {
          const typeQty = matchedItems.filter((i) => i.type === bomType).reduce((sum, i) => sum + i.quantity, 0)
          const componentTrace: ComponentTrace = {
            moduleId: module.id,
            drawingNo: module.drawingNo,
            nameZh: module.nameZh,
            equipmentName,
            quantity: typeQty,
            bomType
          }
          const typeItems = matchedItems.filter((i) => i.type === bomType)
          for (const item of typeItems) collectPart(item, 'module', module.id, { component: componentTrace })
        }
      }
    }
  }

  // 生成匹配零件列表（按总数量降序排序）
  const sorted = Array.from(partMap.values())
    .map(({ projectIds, moduleIds, ...rest }) => rest)
    .sort((a, b) => b.totalQty - a.totalQty)

  // 结果上限保护：超过 MAX_TRACE_RESULTS 时截断并提示用户缩小范围
  traceTruncated.value = sorted.length > MAX_TRACE_RESULTS
  traceResults.value = traceTruncated.value ? sorted.slice(0, MAX_TRACE_RESULTS) : sorted

  searching.value = false
}

// ===== 重置 =====
function handleReset() {
  searchForm.materialCatalogNo = ''
  searchForm.drawingNo = ''
  searchForm.chineseDescription = ''
  hasSearched.value = false
  traceResults.value = []
  traceTruncated.value = false
}

// ===== 跳转 =====
function goToProject(projectId: string) {
  router.push(`/project/${projectId}/edit`)
}

function goToModule(moduleId: string) {
  router.push(`/module/${moduleId}/edit`)
}

// ===== 标签辅助函数 =====
function projectStatusType(status: Project['status']) {
  const map: Record<Project['status'], 'primary' | 'success' | 'info' | 'warning'> = {
    ongoing: 'primary',
    completed: 'success',
    cancelled: 'info',
    paused: 'warning'
  }
  return map[status]
}

function projectStatusLabel(status: Project['status']) {
  const map: Record<Project['status'], string> = {
    ongoing: '进行中',
    completed: '已完成',
    cancelled: '已取消',
    paused: '已暂停'
  }
  return map[status]
}

function bomTypeTagType(type: BomItem['type']) {
  const map: Record<BomItem['type'], 'primary' | 'success' | 'warning'> = {
    assembly: 'primary',
    order: 'success',
    both: 'warning'
  }
  return map[type]
}

function bomTypeLabel(type: BomItem['type']) {
  const map: Record<BomItem['type'], string> = {
    assembly: '装配',
    order: '下单',
    both: '两者'
  }
  return map[type]
}
</script>

<style scoped>
.search-bar {
  margin-bottom: 24px;
  padding: 20px;
  background: #f5f7fa;
  border-radius: 8px;
}

.search-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 16px;
}

.search-icon {
  font-size: 20px;
  color: #409eff;
}

.search-form {
  margin-bottom: 0;
}

.search-form :deep(.el-form-item) {
  margin-bottom: 0;
  margin-right: 16px;
}

.search-tip {
  margin-top: 12px;
}

/* 统计面板 */
.stats-panel {
  margin-bottom: 24px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px 20px;
  background: #fff;
  border-radius: 8px;
  border: 1px solid #ebeef5;
  transition: box-shadow 0.2s;
}

.stat-card:hover {
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  flex-shrink: 0;
}

.stat-parts .stat-icon {
  background: #ecf5ff;
  color: #409eff;
}

.stat-modules .stat-icon {
  background: #f0f9eb;
  color: #67c23a;
}

.stat-projects .stat-icon {
  background: #fdf6ec;
  color: #e6a23c;
}

.stat-qty .stat-icon {
  background: #fef0f0;
  color: #f56c6c;
}

.stat-info {
  flex: 1;
  min-width: 0;
}

.stat-value {
  font-size: 26px;
  font-weight: 700;
  color: #303133;
  line-height: 1.2;
}

.stat-label {
  font-size: 13px;
  color: #909399;
  margin-top: 4px;
}

/* 结果区域 */
.result-section {
  margin-bottom: 28px;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.section-icon {
  font-size: 18px;
  color: #409eff;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.section-actions {
  margin-left: auto;
}

.result-table {
  margin-bottom: 8px;
}

/* 追溯详情 */
.trace-detail {
  padding: 12px 24px;
  background: #fafafa;
  border-radius: 4px;
}

.trace-collapse {
  border: none;
}

.trace-collapse :deep(.el-collapse-item__header) {
  background: transparent;
  border-bottom: 1px solid #ebeef5;
  font-weight: 600;
}

.trace-collapse :deep(.el-collapse-item__wrap) {
  background: transparent;
  border-bottom: none;
}

.collapse-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
}

/* 高亮 */
:deep(.search-highlight) {
  background: #fff3cd;
  color: #856404;
  padding: 0 2px;
  border-radius: 2px;
  font-weight: 600;
}

.qty-highlight {
  font-weight: 600;
  color: #409eff;
  font-size: 15px;
}

.code-highlight {
  font-family: 'Consolas', 'Monaco', monospace;
  font-weight: 600;
  color: #e6a23c;
}

.source-tag {
  margin: 2px;
}

.text-muted {
  color: #c0c4cc;
  font-size: 13px;
}

.initial-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
}

.initial-icon {
  font-size: 56px;
  color: #dcdfe6;
  margin-bottom: 16px;
}

.initial-text {
  font-size: 14px;
  color: #909399;
}

/* ===== 新Tab样式 ===== */
.extension-tabs :deep(.el-tabs__content) {
  padding: 0;
}
.material-detail {
  padding: 12px 24px;
  background: #fafafa;
  border-radius: 4px;
}
.material-detail :deep(.el-collapse) {
  border: none;
}
</style>
