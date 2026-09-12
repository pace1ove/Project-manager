<template>
  <div class="changelog-page">
    <el-card
      shadow="never"
      class="changelog-card"
    >
      <template #header>
        <div class="card-header">
          <span>更新日志</span>
          <el-tag
            type="success"
            size="small"
          >
            当前版本 v1.1.0
          </el-tag>
        </div>
      </template>

      <div class="changelog-list">
        <div
          v-for="(log, index) in changelogs"
          :key="index"
          class="changelog-item"
        >
          <div class="changelog-header">
            <el-tag
              :type="log.type === 'feature' ? 'success' : log.type === 'fix' ? 'danger' : log.type === 'improve' ? 'warning' : 'info'"
              size="small"
            >
              {{ log.typeLabel }}
            </el-tag>
            <span class="changelog-version">{{ log.version }}</span>
            <span class="changelog-date">{{ log.date }}</span>
          </div>
          <div class="changelog-title">{{ log.title }}</div>
          <ul class="changelog-details">
            <li
              v-for="(detail, idx) in log.details"
              :key="idx"
            >
              {{ detail }}
            </li>
          </ul>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

interface ChangelogItem {
  version: string
  date: string
  type: 'feature' | 'fix' | 'improve' | 'refactor'
  typeLabel: string
  title: string
  details: string[]
}

const changelogs = ref<ChangelogItem[]>([
  {
    version: 'v1.1.0',
    date: '2026-09-11',
    type: 'feature',
    typeLabel: '新功能',
    title: '零件库全局管理与冲突检测',
    details: [
      '新增全局零件库管理页面，支持零件的增删改查、搜索、分页、批量操作',
      '零件库支持按图号或物料/目录号匹配，参数全局共享',
      '组件BOM导入时新增零件库冲突检测，支持参数差异对比和用户选择处理方式',
      '零件库支持零件分类（仅下单零件），预设85零件、86零件、标准件、外购件，可自定义',
      '数据管理页面完善零件库相关信息，导出/导入包含零件库数据'
    ]
  },
  {
    version: 'v1.0.9',
    date: '2026-09-11',
    type: 'improve',
    typeLabel: '优化',
    title: '配置与组件双向关联及设备型号唯一性',
    details: [
      '修复配置与组件关联单向问题，新增/修改/删除模块时自动同步配置的moduleIds',
      '设备型号唯一性校验，新增和编辑设备时实时校验型号重复',
      '组件批量导入时配置自动关联，缺失配置可自动创建'
    ]
  },
  {
    version: 'v1.0.8',
    date: '2026-09-10',
    type: 'feature',
    typeLabel: '新功能',
    title: '大数据量性能优化',
    details: [
      '零件库新增Map索引（drawingNoMap），O(1)查找，8万条数据查找性能提升1000倍',
      '批量导入支持bulkPut批量写入，分片处理+进度显示',
      '新增Web Worker处理Excel解析/校验/冲突检测，避免阻塞UI'
    ]
  },
  {
    version: 'v1.0.7',
    date: '2026-09-10',
    type: 'feature',
    typeLabel: '新功能',
    title: '组件批量导入与零件追溯',
    details: [
      '组件批量导入功能，支持模板下载、多维度校验、循环引用检测、拓扑排序导入',
      '零件追溯查询页面，支持按零件编码或名称模糊搜索，显示项目和模块使用情况',
      '所有表格增加搜索功能，支持动态列搜索'
    ]
  },
  {
    version: 'v1.0.6',
    date: '2026-09-09',
    type: 'refactor',
    typeLabel: '重构',
    title: '动态列BOM模板与BOM版本管理',
    details: [
      'BOM条目模板支持自由增删改字段，动态列渲染',
      '新增BOM版本管理，支持快照查看、字段筛选、列显示选择',
      '导出下单BOM支持表头选择、排序、预览，保留选择记录'
    ]
  },
  {
    version: 'v1.0.5',
    date: '2026-09-09',
    type: 'feature',
    typeLabel: '新功能',
    title: 'Electron桌面应用与数据存储',
    details: [
      '打包为Electron桌面应用，支持unpack便携版',
      '数据存储位置可自定义，默认与运行文件同一目录',
      '导出功能在Electron环境下支持文件保存对话框'
    ]
  },
  {
    version: 'v1.0.0',
    date: '2026-09-08',
    type: 'feature',
    typeLabel: '新功能',
    title: 'BOM管理系统初始版本',
    details: [
      '设备-模块-项目三层BOM管理架构',
      '设备管理：配置管理、序列号分配、更改历史',
      '模块管理：层级结构、BOM条目管理、Excel导入导出',
      '项目管理：客户需求、模块选择、下单BOM自动生成、差异对比',
      '工作台：统计卡片、快捷入口、最近项目'
    ]
  }
])
</script>

<style scoped>
.changelog-page {
  max-width: 900px;
}

.changelog-card {
  margin-bottom: 16px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.changelog-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.changelog-item {
  padding: 16px;
  background: #fafafa;
  border-radius: 8px;
  border-left: 4px solid #409eff;
}

.changelog-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.changelog-version {
  font-weight: 600;
  color: #303133;
  font-size: 15px;
}

.changelog-date {
  color: #909399;
  font-size: 13px;
}

.changelog-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 8px;
}

.changelog-details {
  margin: 0;
  padding-left: 20px;
  color: #606266;
  font-size: 14px;
  line-height: 1.8;
}

.changelog-details li {
  margin-bottom: 4px;
}
</style>
