<template>
  <div class="dashboard-page">
    <PageBreadcrumb />
    <!-- ===== 关键指标卡片 ===== -->
    <el-row
      :gutter="16"
      class="stat-row"
    >
      <el-col
        v-for="card in statCards"
        :key="card.label"
        :xs="24"
        :sm="12"
        :md="6"
      >
        <div
          class="stat-card"
          :style="{ '--card-color': card.color }"
        >
          <div class="stat-icon-wrap">
            <el-icon :size="26">
              <component :is="card.icon" />
            </el-icon>
          </div>
          <div class="stat-body">
            <div class="stat-value">
              {{ card.value }}
            </div>
            <div class="stat-label">
              {{ card.label }}
            </div>
            <div
              class="stat-trend"
              :class="card.trendUp ? 'up' : 'down'"
            >
              <el-icon :size="12">
                <CaretTop v-if="card.trendUp" /><CaretBottom v-else />
              </el-icon>
              <span>{{ card.trendText }}</span>
            </div>
          </div>
        </div>
      </el-col>
    </el-row>

    <!-- ===== 项目交付时间线 ===== -->
    <div class="chart-card">
      <div class="chart-header">
        <h3 class="chart-title">
          项目交付时间线
        </h3>
        <el-tag
          size="small"
          type="warning"
        >
          按交付日期统计
        </el-tag>
      </div>
      <el-row :gutter="12">
        <el-col
          v-for="bucket in deliveryBuckets"
          :key="bucket.key"
          :span="6"
        >
          <div
            class="delivery-bucket"
            :class="'bucket-' + bucket.key"
          >
            <div class="bucket-count">
              {{ bucket.projects.length }}
            </div>
            <div class="bucket-label">
              {{ bucket.label }}
            </div>
          </div>
        </el-col>
      </el-row>
      <!-- 交付项目列表 -->
      <div class="delivery-list">
        <div
          v-for="bucket in deliveryBuckets"
          v-show="bucket.projects.length > 0"
          :key="'list-' + bucket.key"
          class="delivery-group"
        >
          <div class="delivery-group-title">
            <el-tag
              size="small"
              :type="bucketTagType(bucket.key)"
            >
              {{ bucket.label }}
            </el-tag>
            <span class="delivery-group-count">{{ bucket.projects.length }} 个项目</span>
          </div>
          <div class="delivery-items">
            <div
              v-for="p in bucket.projects.slice(0, 8)"
              :key="p.id"
              class="delivery-item"
            >
              <span class="delivery-name">{{ p.name }}</span>
              <span class="delivery-jobno">{{ p.jobNo }}</span>
              <span class="delivery-date">{{ formatDeliveryDate(p) }}</span>
              <el-tag
                size="small"
                :type="projectStatusTagType(p.status)"
              >
                {{ projectStatusLabel(p.status) }}
              </el-tag>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ===== 最近活动时间线 + 物料用量 ===== -->
    <el-row
      :gutter="16"
      class="bottom-row"
    >
      <!-- 最近活动 -->
      <el-col
        :xs="24"
        :lg="14"
      >
        <div class="chart-card">
          <div class="chart-header">
            <h3 class="chart-title">
              最近活动
            </h3>
            <el-tag
              size="small"
              type="primary"
            >
              最近 {{ recentActivities.length }} 条
            </el-tag>
          </div>
          <div class="timeline-wrap">
            <el-timeline>
              <el-timeline-item
                v-for="(act, idx) in recentActivities"
                :key="act.id + idx"
                :timestamp="formatTime(act.timestamp)"
                placement="top"
                :color="activityColor(act.operation)"
              >
                <div class="activity-content">
                  <span
                    class="activity-op"
                    :style="{ color: activityColor(act.operation) }"
                  >
                    {{ act.operation }}
                  </span>
                  <span class="activity-detail">{{ act.detail }}</span>
                </div>
                <div class="activity-meta">
                  <el-icon :size="12">
                    <User />
                  </el-icon>
                  <span>{{ act.operator }}</span>
                  <el-tag
                    size="small"
                    effect="plain"
                    class="activity-type-tag"
                  >
                    {{ targetTypeLabel(act.targetType) }}
                  </el-tag>
                </div>
              </el-timeline-item>
            </el-timeline>
            <div
              v-if="recentActivities.length === 0"
              class="empty-state"
            >
              暂无活动记录
            </div>
          </div>
        </div>
      </el-col>

      <!-- 物料用量统计 -->
      <el-col
        :xs="24"
        :lg="10"
      >
        <div class="chart-card">
          <div class="chart-header">
            <h3 class="chart-title">
              物料用量 TOP5
            </h3>
            <el-tag
              size="small"
              type="warning"
            >
              按物料号聚合
            </el-tag>
          </div>
          <div
            v-loading="statsLoading"
            class="material-list"
          >
            <div
              v-for="(mat, idx) in topMaterials"
              :key="mat.materialCatalogNo"
              class="material-item"
            >
              <div
                class="material-rank"
                :class="'rank-' + (idx + 1)"
              >
                {{ idx + 1 }}
              </div>
              <div class="material-info">
                <div class="material-name">
                  {{ mat.chineseDescription || mat.materialCatalogNo }}
                </div>
                <div class="material-no">
                  {{ mat.materialCatalogNo }}
                </div>
                <div class="material-bar-track">
                  <div
                    class="material-bar-fill"
                    :style="{ width: mat.pct + '%' }"
                  />
                </div>
              </div>
              <div class="material-qty">
                {{ mat.totalQty }}
              </div>
            </div>
            <div
              v-if="topMaterials.length === 0"
              class="empty-state"
            >
              暂无物料数据
            </div>
          </div>
        </div>
      </el-col>
    </el-row>

    <!-- ===== 快捷入口（可拖拽排序） ===== -->
    <div class="chart-card">
      <div class="chart-header">
        <h3 class="chart-title">
          快捷入口
        </h3>
        <span class="chart-hint">拖拽卡片可调整顺序</span>
      </div>
      <div class="quick-grid">
        <div
          v-for="(item, idx) in quickEntries"
          :key="item.id"
          class="quick-card"
          :class="{ 'dragging': dragIndex === idx, 'drag-over': dragOverIndex === idx && dragIndex !== idx }"
          draggable="true"
          @dragstart="handleDragStart(idx)"
          @dragover.prevent="handleDragOver(idx)"
          @dragleave="handleDragLeave"
          @drop="handleDrop(idx)"
          @dragend="handleDragEnd"
          @click="router.push(item.path)"
        >
          <div
            class="quick-icon"
            :style="{ background: item.color }"
          >
            <el-icon :size="22">
              <component :is="item.icon" />
            </el-icon>
          </div>
          <div class="quick-info">
            <div class="quick-title">
              {{ item.title }}
            </div>
            <div class="quick-desc">
              {{ item.desc }}
            </div>
          </div>
          <el-icon
            class="quick-arrow"
            :size="16"
          >
            <ArrowRight />
          </el-icon>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  Cpu, Grid, Folder, Odometer, CaretTop, CaretBottom,
  User, ArrowRight
} from '@element-plus/icons-vue'
import dayjs from 'dayjs'
import { useEquipmentStore } from '@/stores/equipment'
import { useModulesStore } from '@/stores/modules'
import { useProjectsStore } from '@/stores/projects'
import { db } from '@/db/index'
import type { ChangeRecord, BomItem, Project } from '@/types'
import { getDeliveryBuckets, getEffectiveDeliveryDate } from '@/utils/materialStats'
import { notifyDbError } from '@/utils/dbErrorHandler'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'

const router = useRouter()
const equipmentStore = useEquipmentStore()
const modulesStore = useModulesStore()
const projectsStore = useProjectsStore()

// ===== BOM 条目总数 + TOP5（异步流式聚合加载） =====
const bomTotalCount = ref<number>(0)
const topMaterialsData = ref<MaterialAgg[]>([])
const statsLoading = ref(true)

onMounted(async () => {
  try {
    const [modCount, orderCount] = await Promise.all([
      db.bomItems.count(),
      db.orderBomItems.count()
    ])
    bomTotalCount.value = modCount + orderCount

    // 流式遍历累加TOP5物料用量，不全部存入数组
    const agg = new Map<string, { qty: number; desc: string }>()
    await db.bomItems.each((item: BomItem & { moduleId: string }) => {
      const key = item.materialCatalogNo || '未分类'
      const existing = agg.get(key)
      if (existing) {
        existing.qty += item.quantity || 0
      } else {
        agg.set(key, { qty: item.quantity || 0, desc: item.chineseDescription || '' })
      }
    })
    const sorted = Array.from(agg.entries())
      .map(([no, data]) => ({
        materialCatalogNo: no,
        chineseDescription: data.desc,
        totalQty: data.qty
      }))
      .sort((a, b) => b.totalQty - a.totalQty)
      .slice(0, 5)
    const max = Math.max(...sorted.map(s => s.totalQty), 1)
    topMaterialsData.value = sorted.map(s => ({ ...s, pct: Math.round((s.totalQty / max) * 100) }))
  } catch (e) {
    notifyDbError(e, '加载Dashboard BOM统计')
  } finally {
    statsLoading.value = false
  }
})

// ===== 统计卡片 =====
interface StatCard {
  label: string
  value: number
  color: string
  icon: string
  trendUp: boolean
  trendText: string
}

// 简单确定性伪随机，基于数值生成趋势
function deterministicTrend(base: number, seed: number): { up: boolean; pct: number } {
  const hash = ((base * 9301 + seed * 49297 + 233280) % 233280) / 233280
  const pct = Math.round(hash * 20 + 2)
  return { up: hash > 0.35, pct }
}

const statCards = computed<StatCard[]>(() => {
  const eqCount = equipmentStore.equipments.length
  const modCount = modulesStore.modules.length
  const prjCount = projectsStore.projects.length
  const bomCount = bomTotalCount.value

  const eqTrend = deterministicTrend(eqCount, 1)
  const modTrend = deterministicTrend(modCount, 2)
  const prjTrend = deterministicTrend(prjCount, 3)
  const bomTrend = deterministicTrend(bomCount, 4)

  return [
    {
      label: '设备总数',
      value: eqCount,
      color: '#409eff',
      icon: 'Cpu',
      trendUp: eqTrend.up,
      trendText: `较上月 ${eqTrend.up ? '+' : '-'}${eqTrend.pct}%（演示数据）`
    },
    {
      label: '组件总数',
      value: modCount,
      color: '#67c23a',
      icon: 'Grid',
      trendUp: modTrend.up,
      trendText: `较上月 ${modTrend.up ? '+' : '-'}${modTrend.pct}%（演示数据）`
    },
    {
      label: '项目总数',
      value: prjCount,
      color: '#e6a23c',
      icon: 'Folder',
      trendUp: prjTrend.up,
      trendText: `较上月 ${prjTrend.up ? '+' : '-'}${prjTrend.pct}%（演示数据）`
    },
    {
      label: 'BOM条目总数',
      value: bomCount,
      color: '#f56c6c',
      icon: 'Odometer',
      trendUp: bomTrend.up,
      trendText: `较上月 ${bomTrend.up ? '+' : '-'}${bomTrend.pct}%（演示数据）`
    }
  ]
})

// ===== 项目交付时间线 =====
const deliveryBuckets = computed(() => {
  return getDeliveryBuckets(projectsStore.projects)
})

function bucketTagType(key: string): 'danger' | 'warning' | 'primary' | 'info' | 'success' {
  const map: Record<string, 'danger' | 'warning' | 'primary' | 'info' | 'success'> = {
    overdue: 'danger',
    thisMonth: 'warning',
    nextMonth: 'primary',
    later: 'info',
    completed: 'success'
  }
  return map[key] || 'info'
}

function formatDeliveryDate(p: Project): string {
  return dayjs(getEffectiveDeliveryDate(p)).format('YYYY-MM-DD')
}

function projectStatusTagType(status: Project['status']) {
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

// ===== 最近活动时间线 =====
const recentActivities = computed<ChangeRecord[]>(() => {
  const all: ChangeRecord[] = []
  for (const eq of equipmentStore.equipments) {
    if (eq.changeHistory) all.push(...eq.changeHistory)
  }
  for (const mod of modulesStore.modules) {
    if (mod.changeHistory) all.push(...mod.changeHistory)
  }
  for (const prj of projectsStore.projects) {
    if (prj.changeHistory) all.push(...prj.changeHistory)
  }
  return all
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 20)
})

function formatTime(ts: string): string {
  return dayjs(ts).format('YYYY-MM-DD HH:mm')
}

function activityColor(operation: string): string {
  if (operation.includes('创建') || operation.includes('新增') || operation.includes('导入')) return '#67c23a'
  if (operation.includes('更新') || operation.includes('修改')) return '#409eff'
  if (operation.includes('删除') || operation.includes('停用')) return '#f56c6c'
  return '#909399'
}

function targetTypeLabel(type: ChangeRecord['targetType']): string {
  const map: Record<ChangeRecord['targetType'], string> = {
    equipment: '设备',
    module: '组件',
    project: '项目',
    bom: 'BOM'
  }
  return map[type] || type
}

// ===== 物料用量 TOP5 =====
interface MaterialAgg {
  materialCatalogNo: string
  chineseDescription: string
  totalQty: number
  pct: number
}

const topMaterials = computed<MaterialAgg[]>(() => topMaterialsData.value)

// ===== 快捷入口（可拖拽排序） =====
interface QuickEntry {
  id: string
  title: string
  desc: string
  icon: string
  color: string
  path: string
}

const QUICK_ORDER_KEY = 'bom_dashboard_quick_order'

const defaultQuickEntries: QuickEntry[] = [
  { id: 'new-eq', title: '新建设备', desc: '创建设备档案及配置', icon: 'Cpu', color: '#409eff', path: '/equipment' },
  { id: 'new-mod', title: '新建组件', desc: '创建组件及BOM结构', icon: 'Grid', color: '#67c23a', path: '/module/new' },
  { id: 'new-prj', title: '新建项目', desc: '创建项目并分配序列号', icon: 'Folder', color: '#e6a23c', path: '/project/new' },
  { id: 'list-eq', title: '设备列表', desc: '查看和管理所有设备', icon: 'Cpu', color: '#909399', path: '/equipment' },
  { id: 'list-mod', title: '组件列表', desc: '查看和管理所有组件', icon: 'Grid', color: '#909399', path: '/module' },
  { id: 'list-prj', title: '项目列表', desc: '查看和管理所有项目', icon: 'Folder', color: '#909399', path: '/project' }
]

function loadQuickOrder(): QuickEntry[] {
  try {
    const saved = localStorage.getItem(QUICK_ORDER_KEY)
    if (saved) {
      const orderIds: string[] = JSON.parse(saved)
      const ordered: QuickEntry[] = []
      const remaining = [...defaultQuickEntries]
      for (const id of orderIds) {
        const idx = remaining.findIndex(e => e.id === id)
        if (idx !== -1) {
          ordered.push(remaining[idx])
          remaining.splice(idx, 1)
        }
      }
      return [...ordered, ...remaining]
    }
  } catch (e) {
    console.error('Load quick order error:', e)
  }
  return [...defaultQuickEntries]
}

const quickEntries = ref<QuickEntry[]>(loadQuickOrder())
const dragIndex = ref<number>(-1)
const dragOverIndex = ref<number>(-1)

function handleDragStart(idx: number): void {
  dragIndex.value = idx
}

function handleDragOver(idx: number): void {
  dragOverIndex.value = idx
}

function handleDragLeave(): void {
  dragOverIndex.value = -1
}

function handleDrop(idx: number): void {
  if (dragIndex.value === -1 || dragIndex.value === idx) return
  const items = [...quickEntries.value]
  const [moved] = items.splice(dragIndex.value, 1)
  items.splice(idx, 0, moved)
  quickEntries.value = items
  localStorage.setItem(QUICK_ORDER_KEY, JSON.stringify(items.map(i => i.id)))
}

function handleDragEnd(): void {
  dragIndex.value = -1
  dragOverIndex.value = -1
}
</script>

<style scoped>
.dashboard-page {
  padding: 16px;
}

/* ===== 统计卡片 ===== */
.stat-row {
  margin-bottom: 16px;
}

.stat-card {
  background: #fff;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
  display: flex;
  align-items: center;
  gap: 16px;
  transition: all 0.25s ease;
  border: 1px solid transparent;
  height: 100%;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  border-color: var(--card-color, #409eff);
}

.stat-icon-wrap {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  background: var(--card-color, #409eff);
  flex-shrink: 0;
}

.stat-body {
  flex: 1;
  min-width: 0;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: #303133;
  line-height: 1.2;
}

.stat-label {
  font-size: 13px;
  color: #909399;
  margin-top: 2px;
}

.stat-trend {
  display: flex;
  align-items: center;
  gap: 2px;
  font-size: 12px;
  margin-top: 4px;
}

.stat-trend.up {
  color: #67c23a;
}

.stat-trend.down {
  color: #f56c6c;
}

/* ===== 图表卡片通用 ===== */
.bottom-row {
  margin-bottom: 16px;
}

.chart-card {
  background: #fff;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
  margin-bottom: 16px;
}

.chart-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.chart-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  margin: 0;
}

.chart-hint {
  font-size: 12px;
  color: #c0c4cc;
}

/* ===== 时间线 ===== */
.timeline-wrap {
  max-height: 420px;
  overflow-y: auto;
  padding-right: 8px;
}

.activity-content {
  display: flex;
  align-items: baseline;
  gap: 8px;
  flex-wrap: wrap;
}

.activity-op {
  font-weight: 600;
  font-size: 13px;
  flex-shrink: 0;
}

.activity-detail {
  font-size: 13px;
  color: #606266;
}

.activity-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 6px;
  font-size: 12px;
  color: #909399;
}

.activity-type-tag {
  margin-left: 4px;
}

/* ===== 物料用量 ===== */
.material-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.material-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.material-rank {
  width: 24px;
  height: 24px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  color: #fff;
  flex-shrink: 0;
  background: #c0c4cc;
}

.material-rank.rank-1 { background: #f56c6c; }
.material-rank.rank-2 { background: #e6a23c; }
.material-rank.rank-3 { background: #409eff; }

.material-info {
  flex: 1;
  min-width: 0;
}

.material-name {
  font-size: 13px;
  font-weight: 500;
  color: #303133;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.material-no {
  font-size: 11px;
  color: #909399;
  margin-top: 2px;
}

.material-bar-track {
  height: 6px;
  background: #f0f2f5;
  border-radius: 3px;
  margin-top: 6px;
  overflow: hidden;
}

.material-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #409eff, #66b1ff);
  border-radius: 3px;
  transition: width 0.5s ease;
}

.material-qty {
  font-size: 16px;
  font-weight: 700;
  color: #303133;
  min-width: 50px;
  text-align: right;
  flex-shrink: 0;
}

/* ===== 快捷入口 ===== */
.quick-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
}

.quick-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: #fafbfc;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.25s ease;
  user-select: none;
}

.quick-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.08);
  border-color: #409eff;
  background: #fff;
}

.quick-card.dragging {
  opacity: 0.4;
  transform: scale(0.98);
}

.quick-card.drag-over {
  border-color: #409eff;
  border-style: dashed;
  background: #ecf5ff;
}

.quick-icon {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  flex-shrink: 0;
}

.quick-info {
  flex: 1;
  min-width: 0;
}

.quick-title {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}

.quick-desc {
  font-size: 12px;
  color: #909399;
  margin-top: 3px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.quick-arrow {
  color: #c0c4cc;
  flex-shrink: 0;
  transition: transform 0.2s;
}

.quick-card:hover .quick-arrow {
  color: #409eff;
  transform: translateX(3px);
}

/* ===== 空状态 ===== */
.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: #909399;
  font-size: 13px;
}

/* ===== 交付时间线 ===== */
.delivery-bucket {
  padding: 16px;
  border-radius: 8px;
  text-align: center;
  border: 1px solid #ebeef5;
  transition: transform 0.2s;
  margin-bottom: 12px;
}
.delivery-bucket:hover {
  transform: translateY(-2px);
}
.delivery-bucket.bucket-overdue { background: #fef0f0; }
.delivery-bucket.bucket-thisMonth { background: #fdf6ec; }
.delivery-bucket.bucket-nextMonth { background: #ecf5ff; }
.delivery-bucket.bucket-later { background: #f4f4f5; }
.delivery-bucket.bucket-completed { background: #f0f9eb; }
.bucket-count {
  font-size: 28px;
  font-weight: 700;
  color: #303133;
}
.bucket-label {
  font-size: 13px;
  color: #606266;
  margin-top: 4px;
}
.delivery-list {
  margin-top: 20px;
}
.delivery-group {
  margin-bottom: 16px;
}
.delivery-group-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}
.delivery-group-count {
  font-size: 12px;
  color: #909399;
}
.delivery-items {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
.delivery-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #f5f7fa;
  border-radius: 6px;
  font-size: 13px;
  transition: background 0.2s;
}
.delivery-item:hover {
  background: #e8ecf1;
}
.delivery-name {
  font-weight: 500;
  color: #303133;
}
.delivery-jobno {
  color: #909399;
  font-size: 12px;
}
.delivery-date {
  color: #e6a23c;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}
</style>
