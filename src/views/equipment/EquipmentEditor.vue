<template>
  <div class="page-container">
    <PageBreadcrumb />
    <div class="card-wrapper">
      <!-- 顶部操作栏 -->
      <div class="editor-header">
        <div class="header-left">
          <el-button @click="goBack">
            <el-icon><ArrowLeft /></el-icon>
            返回
          </el-button>
          <span class="header-title">
            {{ equipment?.name || '设备详情' }}
            <span
              v-if="equipment?.model"
              class="header-model"
            >{{ equipment.model }}</span>
          </span>
          <el-tag
            v-if="equipment"
            :type="equipment.status === 'active' ? 'success' : 'info'"
            size="small"
          >
            {{ equipment.status === 'active' ? '启用' : '停用' }}
          </el-tag>
        </div>
        <div class="header-right">
          <!-- 保存状态指示 -->
          <span
            class="save-status"
            :class="{ 'save-status-dirty': dirty, 'save-status-saving': isSaving }"
          >
            <el-icon
              v-if="isSaving"
              class="is-loading"
            ><Loading /></el-icon>
            {{ saveStatusText }}
          </span>
          <!-- 撤销/重做按钮 -->
          <el-button
            size="small"
            :disabled="!canUndo"
            title="撤销 (Ctrl+Z)"
            @click="doUndo"
          >
            <el-icon><RefreshLeft /></el-icon>
          </el-button>
          <el-button
            size="small"
            :disabled="!canRedo"
            title="重做 (Ctrl+Y)"
            @click="doRedo"
          >
            <el-icon><RefreshRight /></el-icon>
          </el-button>
        </div>
      </div>

      <!-- 7个Tab（始终渲染，避免条件渲染导致Element Plus Tab生命周期崩溃） -->
      <el-tabs
        v-model="activeTab"
        type="border-card"
        class="equipment-tabs"
        @tab-change="onTabChange"
      >
        <!-- ==================== Tab1 基本信息 ==================== -->
        <el-tab-pane name="basic">
          <template #label>
            <span class="tab-label-wrap">
              基本信息
              <span
                v-if="dirty"
                class="tab-dirty"
              >*</span>
              <span
                class="tab-status-dot"
                :class="`dot-${tabStatuses.basic}`"
              />
            </span>
          </template>
          <!-- 未找到设备时显示空状态 -->
          <el-empty
            v-if="!equipment"
            description="未找到该设备"
          />
          <div
            v-else
            :key="`basic-${tabSwitchKey}`"
            class="tabs-content"
          >
            <el-form
              ref="basicFormRef"
              :model="basicForm"
              :rules="basicFormRules"
              label-width="100px"
              class="basic-form"
            >
              <el-collapse
                v-model="activeCollapse"
                class="form-collapse"
              >
                <!-- 基本属性组 -->
                <el-collapse-item
                  title="基本属性"
                  name="basicProps"
                >
                  <el-row :gutter="20">
                    <el-col :span="12">
                      <el-form-item
                        label="名称"
                        prop="name"
                      >
                        <el-input
                          v-model="basicForm.name"
                          placeholder="请输入设备名称"
                          maxlength="100"
                          show-word-limit
                        />
                      </el-form-item>
                    </el-col>
                    <el-col :span="12">
                      <el-form-item prop="model">
                        <template #label>
                          <span class="label-with-tooltip">
                            型号
                            <el-tooltip
                              content="设备型号，用于项目关联时校核"
                              placement="top"
                            >
                              <el-icon class="tooltip-icon"><QuestionFilled /></el-icon>
                            </el-tooltip>
                          </span>
                        </template>
                        <el-input
                          v-model="basicForm.model"
                          placeholder="请输入设备型号"
                          maxlength="50"
                          :class="{ 'input-error': modelUnique.hasError.value }"
                        />
                        <div
                          v-if="modelUnique.hasError.value"
                          class="field-error-text"
                        >
                          {{ modelUnique.error.value }}
                        </div>
                      </el-form-item>
                    </el-col>
                  </el-row>
                  <el-form-item label="描述">
                    <el-input
                      v-model="basicForm.description"
                      type="textarea"
                      :rows="4"
                      placeholder="请输入设备描述"
                      maxlength="500"
                      show-word-limit
                    />
                  </el-form-item>
                </el-collapse-item>
                <!-- 状态管理组 -->
                <el-collapse-item
                  title="状态管理"
                  name="statusMgmt"
                >
                  <el-row :gutter="20">
                    <el-col :span="12">
                      <el-form-item prop="status">
                        <template #label>
                          <span class="label-with-tooltip">
                            状态
                            <el-tooltip
                              content="停用后该设备不可关联新项目"
                              placement="top"
                            >
                              <el-icon class="tooltip-icon"><QuestionFilled /></el-icon>
                            </el-tooltip>
                          </span>
                        </template>
                        <el-select
                          v-model="basicForm.status"
                          style="width: 100%"
                        >
                          <el-option
                            label="启用"
                            value="active"
                          />
                          <el-option
                            label="停用"
                            value="inactive"
                          />
                        </el-select>
                      </el-form-item>
                    </el-col>
                  </el-row>
                </el-collapse-item>
              </el-collapse>
            </el-form>
          </div>
        </el-tab-pane>

        <!-- ==================== Tab2 配置管理 ==================== -->
        <el-tab-pane name="config">
          <template #label>
            <span class="tab-label-wrap">
              配置管理
              <span
                class="tab-status-dot"
                :class="`dot-${tabStatuses.config}`"
              />
            </span>
          </template>
          <div
            :key="`config-${tabSwitchKey}`"
            class="tabs-content config-tab-layout"
          >
            <!-- 左侧：分组面板 -->
            <div class="config-group-panel">
              <div class="group-panel-header">
                <el-button
                  type="primary"
                  size="small"
                  plain
                  style="width: 100%"
                  @click="openGroupDialog()"
                >
                  <el-icon><Plus /></el-icon>
                  新增分组
                </el-button>
              </div>
              <div class="group-list">
                <!-- 未分组（虚拟项） -->
                <div
                  class="group-list-item"
                  :class="{ active: selectedGroupId === null }"
                  @click="selectedGroupId = null"
                >
                  <div class="group-item-main">
                    <el-icon class="group-item-icon"><FolderOpened /></el-icon>
                    <span class="group-item-name">未分组</span>
                    <el-tag
                      size="small"
                      type="info"
                      class="group-item-count"
                    >{{ ungroupedConfigCount }}</el-tag>
                  </div>
                </div>
                <!-- 实际分组 -->
                <div
                  v-for="g in groupList"
                  :key="g.id"
                  class="group-list-item"
                  :class="{ active: selectedGroupId === g.id }"
                  @click="selectedGroupId = g.id"
                >
                  <div class="group-item-main">
                    <el-icon class="group-item-icon"><Folder /></el-icon>
                    <span class="group-item-name" :title="g.name">{{ g.name }}</span>
                    <el-tag
                      size="small"
                      type="info"
                      class="group-item-count"
                    >{{ getConfigCountByGroup(g.id) }}</el-tag>
                  </div>
                  <div
                    class="group-item-actions"
                    @click.stop
                  >
                    <el-button
                      type="primary"
                      link
                      size="small"
                      @click="openGroupDialog(g)"
                    >
                      编辑
                    </el-button>
                    <el-button
                      type="danger"
                      link
                      size="small"
                      @click="handleDeleteGroup(g)"
                    >
                      删除
                    </el-button>
                  </div>
                </div>
                <EmptyState
                  v-if="groupList.length === 0"
                  title="暂无分组"
                  description="可创建分组归类配置"
                />
              </div>
            </div>

            <!-- 右侧：配置列表 -->
            <div class="config-list-panel">
              <div class="action-bar">
                <el-button
                  type="primary"
                  @click="openConfigDialog()"
                >
                  <el-icon><Plus /></el-icon>
                  新增配置
                </el-button>
                <span
                  v-if="selectedGroupId === null"
                  class="panel-current-label"
                >当前：未分组（{{ filteredConfigList.length }}）</span>
                <span
                  v-else
                  class="panel-current-label"
                >当前：{{ getSelectedGroupName() }}（{{ filteredConfigList.length }}）</span>
              </div>
              <template v-if="filteredConfigList.length > 0">
                <el-table
                  :data="filteredConfigList"
                  stripe
                  style="width: 100%"
                >
                  <el-table-column
                    prop="name"
                    label="配置名称"
                    min-width="160"
                  />
                  <el-table-column
                    prop="description"
                    label="描述"
                    min-width="220"
                    show-overflow-tooltip
                  />
                  <el-table-column
                    label="关联组件数"
                    width="120"
                    align="center"
                  >
                    <template #default="{ row }">
                      <el-tag
                        size="small"
                        type="info"
                      >
                        {{ (row.moduleIds || []).length }}
                      </el-tag>
                    </template>
                  </el-table-column>
                  <el-table-column
                    label="操作"
                    width="260"
                    fixed="right"
                  >
                    <template #default="{ row }">
                      <el-button
                        type="primary"
                        link
                        class="table-action-btn"
                        @click="openConfigDialog(row)"
                      >
                        编辑
                      </el-button>
                      <el-button
                        type="success"
                        link
                        class="table-action-btn"
                        @click="openModuleDialog(row)"
                      >
                        关联组件
                      </el-button>
                      <el-button
                        type="danger"
                        link
                        class="table-action-btn danger"
                        @click="handleDeleteConfig(row)"
                      >
                        删除
                      </el-button>
                    </template>
                  </el-table-column>
                </el-table>
              </template>
              <EmptyState
                v-else
                title="暂无配置"
                description="点击上方按钮创建配置，或在左侧切换其他分组"
                action-text="新增配置"
                @action="openConfigDialog()"
              />
            </div>
          </div>
        </el-tab-pane>

        <!-- ==================== Tab3 关联项目 ==================== -->
        <el-tab-pane name="project">
          <template #label>
            <span class="tab-label-wrap">
              关联项目
              <span
                class="tab-status-dot"
                :class="`dot-${tabStatuses.project}`"
              />
            </span>
          </template>
          <div
            :key="`project-${tabSwitchKey}`"
            class="tabs-content"
          >
            <div class="project-toolbar">
              <el-button
                type="primary"
                size="small"
                @click="openLinkProjectDialog"
              >
                <el-icon><Plus /></el-icon>关联项目
              </el-button>
              <span class="project-count">共 {{ equipmentProjects.length }} 个关联项目</span>
            </div>
            <el-table
              :data="equipmentProjects"
              stripe
              style="width: 100%"
              empty-text="暂无关联项目"
            >
              <el-table-column
                prop="name"
                label="项目名称"
                min-width="180"
              />
              <el-table-column
                prop="jobNo"
                label="JOB号"
                width="160"
              />
              <el-table-column
                prop="customer"
                label="客户"
                width="180"
                show-overflow-tooltip
              />
              <el-table-column
                label="状态"
                width="100"
              >
                <template #default="{ row }">
                  <el-tag
                    :type="projectStatusTagType(row.status)"
                    size="small"
                  >
                    {{ projectStatusLabel(row.status) }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column
                label="创建时间"
                width="160"
              >
                <template #default="{ row }">
                  {{ dayjs(row.createdAt).format('YYYY-MM-DD HH:mm') }}
                </template>
              </el-table-column>
              <el-table-column
                label="操作"
                width="180"
                fixed="right"
              >
                <template #default="{ row }">
                  <el-button
                    type="primary"
                    link
                    class="table-action-btn"
                    @click="goToProject(row.id)"
                  >
                    查看
                  </el-button>
                  <el-button
                    type="danger"
                    link
                    class="table-action-btn"
                    @click="handleUnlinkProject(row)"
                  >
                    取消关联
                  </el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </el-tab-pane>

        <!-- ==================== Tab4 关联模块 ==================== -->
        <el-tab-pane name="module">
          <template #label>
            <span class="tab-label-wrap">
              关联组件
              <span
                class="tab-status-dot"
                :class="`dot-${tabStatuses.module}`"
              />
            </span>
          </template>
          <div
            :key="`module-${tabSwitchKey}`"
            class="tabs-content"
          >
            <div class="module-filter-bar">
              <span class="filter-label">按配置筛选：</span>
              <el-select
                v-model="filterConfigId"
                placeholder="全部配置"
                clearable
                style="width: 220px"
              >
                <el-option
                  v-for="cfg in configList"
                  :key="cfg.id"
                  :label="cfg.name"
                  :value="cfg.id"
                />
              </el-select>
            </div>
            <el-table
              :data="equipTreeFilteredModules"
              stripe
              style="width: 100%"
              empty-text="暂无组件"
              row-key="id"
            >
              <el-table-column
                label="图号"
                width="220"
              >
                <template #default="{ row }">
                  <span
                    :style="{ paddingLeft: (moduleDepthMap.get(row.id) || 0) * 20 + 'px' }"
                    class="module-tree-cell"
                  >
                    <span
                      v-if="equipTreeHasChildren(row.id)"
                      class="tree-toggle"
                      @click.stop="equipTreeToggleCollapse(row.id)"
                    >
                      {{ equipTreeIsCollapsed(row.id) ? '▶' : '▼' }}
                    </span>
                    <span
                      v-else
                      class="tree-toggle-placeholder"
                    />
                    <span
                      v-if="(moduleDepthMap.get(row.id) || 0) > 0"
                      style="color: #c0c4cc;"
                    >└ </span>
                    {{ row.drawingNo }}
                  </span>
                </template>
              </el-table-column>
              <el-table-column
                prop="nameZh"
                label="中文名"
                min-width="160"
              />
              <el-table-column
                prop="nameEn"
                label="英文名"
                min-width="180"
                show-overflow-tooltip
              />
              <el-table-column
                label="标签"
                min-width="160"
              >
                <template #default="{ row }">
                  <template v-if="row.tags && row.tags.length > 0">
                    <el-tag
                      v-for="tagId in row.tags"
                      :key="tagId"
                      size="small"
                      type="info"
                      effect="plain"
                      style="margin-right: 4px; margin-bottom: 2px"
                    >
                      {{ getTagName(tagId) }}
                    </el-tag>
                  </template>
                  <span
                    v-else
                    class="text-muted"
                  >—</span>
                </template>
              </el-table-column>
              <el-table-column
                label="BOM条目数"
                width="110"
                align="center"
              >
                <template #default="{ row }">
                  {{ moduleBomCountMap.get(row.id) ?? '...' }}
                </template>
              </el-table-column>
              <el-table-column
                label="操作"
                width="100"
                fixed="right"
              >
                <template #default="{ row }">
                  <el-button
                    type="primary"
                    link
                    class="table-action-btn"
                    @click="goToModule(row.id)"
                  >
                    查看
                  </el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </el-tab-pane>

        <!-- ==================== Tab6 序列号管理 ==================== -->
        <el-tab-pane name="serial">
          <template #label>
            <span class="tab-label-wrap">
              序列号管理
              <span
                class="tab-status-dot"
                :class="`dot-${tabStatuses.serial}`"
              />
            </span>
          </template>
          <div
            :key="`serial-${tabSwitchKey}`"
            class="tabs-content"
          >
            <div class="action-bar">
              <el-button
                type="primary"
                @click="openSerialDialog()"
              >
                <el-icon><Plus /></el-icon>
                新增序列号
              </el-button>
              <el-button @click="openBatchImport">
                <el-icon><Upload /></el-icon>
                批量导入
              </el-button>
            </div>
            <el-table
              :data="equipmentSerials"
              stripe
              style="width: 100%"
              empty-text="暂无序列号"
            >
              <el-table-column
                prop="serialNumber"
                label="序列号值"
                min-width="200"
              />
              <el-table-column
                label="关联项目"
                min-width="180"
              >
                <template #default="{ row }">
                  <el-link
                    v-if="row.projectId"
                    type="primary"
                    :underline="'never'"
                    @click="goToProject(row.projectId!)"
                  >
                    {{ getProjectName(row.projectId) }}
                  </el-link>
                  <span
                    v-else
                    class="text-muted"
                  >未分配</span>
                </template>
              </el-table-column>
              <el-table-column
                label="状态"
                width="100"
              >
                <template #default="{ row }">
                  <el-tag
                    :type="row.status === 'assigned' ? 'success' : 'warning'"
                    size="small"
                  >
                    {{ row.status === 'assigned' ? '已分配' : '未分配' }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column
                prop="remark"
                label="备注"
                min-width="160"
                show-overflow-tooltip
              />
              <el-table-column
                label="操作"
                width="280"
                fixed="right"
              >
                <template #default="{ row }">
                  <el-button
                    type="primary"
                    link
                    class="table-action-btn"
                    @click="openSerialDialog(row)"
                  >
                    编辑
                  </el-button>
                  <el-button
                    v-if="row.status === 'unassigned'"
                    type="success"
                    link
                    class="table-action-btn"
                    @click="openAssignDialog(row)"
                  >
                    分配
                  </el-button>
                  <el-button
                    v-else
                    type="warning"
                    link
                    class="table-action-btn"
                    @click="handleUnassign(row)"
                  >
                    取消分配
                  </el-button>
                  <el-button
                    type="danger"
                    link
                    class="table-action-btn danger"
                    @click="handleDeleteSerial(row)"
                  >
                    删除
                  </el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </el-tab-pane>

        <!-- ==================== Tab7 更改历史 ==================== -->
        <el-tab-pane name="history">
          <template #label>
            <span class="tab-label-wrap">
              更改历史
              <span
                class="tab-status-dot"
                :class="`dot-${tabStatuses.history}`"
              />
            </span>
          </template>
          <div
            :key="`history-${tabSwitchKey}`"
            class="tabs-content"
          >
            <ChangeHistoryList
              v-if="changeHistoryList.length > 0"
              :records="changeHistoryList"
              show-rollback
              @rollback="handleRollbackHistory"
            />
            <div
              v-else
              class="empty-state"
            >
              暂无更改记录
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>
    </div>

    <!-- 底部固定操作栏 -->
    <div
      v-if="equipment"
      class="editor-footer"
    >
      <div class="footer-left">
        <el-button @click="goBack">
          <el-icon><ArrowLeft /></el-icon>
          返回
        </el-button>
      </div>
      <div class="footer-right">
        <el-button
          :disabled="!dirty"
          title="恢复到上次保存状态"
          @click="resetForm"
        >
          重置
        </el-button>
        <el-button
          size="default"
          :disabled="!canUndo"
          title="撤销 (Ctrl+Z)"
          @click="doUndo"
        >
          <el-icon><RefreshLeft /></el-icon>
          撤销
        </el-button>
        <el-button
          size="default"
          :disabled="!canRedo"
          title="重做 (Ctrl+Y)"
          @click="doRedo"
        >
          <el-icon><RefreshRight /></el-icon>
          重做
        </el-button>
        <el-button
          type="primary"
          :class="{ 'save-btn-pulse': dirty && !isSaving }"
          :loading="isSavingManually || isSaving"
          :disabled="!dirty && !isSaving"
          @click="handleManualSave"
        >
          <el-icon v-if="!isSavingManually && !isSaving">
            <Check />
          </el-icon>
          {{ dirty ? '保存' : '已保存' }}
        </el-button>
      </div>
    </div>

    <!-- ==================== 配置新增/编辑弹窗 ==================== -->
    <el-dialog
      v-model="configDialogVisible"
      :title="configForm.id ? '编辑配置' : '新增配置'"
      width="500px"
      @closed="resetConfigForm"
    >
      <el-form
        ref="configFormRef"
        :model="configForm"
        :rules="configFormRules"
        label-width="100px"
        class="dialog-form"
      >
        <el-form-item
          label="名称"
          prop="name"
        >
          <el-input
            v-model="configForm.name"
            placeholder="请输入配置名称"
            maxlength="100"
            show-word-limit
          />
        </el-form-item>
        <el-form-item label="描述">
          <el-input
            v-model="configForm.description"
            type="textarea"
            :rows="3"
            placeholder="可选"
            maxlength="500"
          />
        </el-form-item>
        <el-form-item label="所属分组">
          <el-select
            v-model="configForm.groupId"
            placeholder="未分组"
            clearable
            style="width: 100%"
          >
            <el-option
              :value="''"
              label="未分组"
            />
            <el-option
              v-for="g in groupList"
              :key="g.id"
              :label="g.name"
              :value="g.id"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="configDialogVisible = false">
          取消
        </el-button>
        <el-button
          type="primary"
          @click="confirmConfig"
        >
          确定
        </el-button>
      </template>
    </el-dialog>

    <!-- ==================== 分组新增/编辑弹窗 ==================== -->
    <el-dialog
      v-model="groupDialogVisible"
      :title="groupForm.id ? '编辑分组' : '新增分组'"
      width="480px"
      @closed="resetGroupForm"
    >
      <el-form
        ref="groupFormRef"
        :model="groupForm"
        :rules="groupFormRules"
        label-width="80px"
        class="dialog-form"
      >
        <el-form-item
          label="组名"
          prop="name"
        >
          <el-input
            v-model="groupForm.name"
            placeholder="请输入分组名称"
            maxlength="50"
            show-word-limit
          />
          <div
            v-if="groupNameError"
            class="form-error-tip"
          >{{ groupNameError }}</div>
        </el-form-item>
        <el-form-item label="描述">
          <el-input
            v-model="groupForm.description"
            type="textarea"
            :rows="2"
            placeholder="可选"
            maxlength="200"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="groupDialogVisible = false">
          取消
        </el-button>
        <el-button
          type="primary"
          @click="confirmGroup"
        >
          确定
        </el-button>
      </template>
    </el-dialog>

    <!-- ==================== 关联模块弹窗（穿梭框） ==================== -->
    <el-dialog
      v-model="moduleDialogVisible"
      title="关联组件"
      width="80%"
      :close-on-click-modal="false"
      class="module-dialog"
    >
      <div class="module-dialog-info">
        <span>当前配置：<strong>{{ currentConfigName }}</strong></span>
        <span>已选组件数：<el-tag
          size="small"
          type="success"
        >{{ selectedModuleIds.length }}</el-tag></span>
      </div>
      <el-transfer
        v-model="selectedModuleIds"
        :data="transferData"
        :titles="['可选组件', '已选组件']"
        :button-texts="['移除', '添加']"
        filterable
        filter-placeholder="搜索图号/名称"
        height="420px"
        class="module-transfer"
      />
      <template #footer>
        <el-button @click="moduleDialogVisible = false">
          取消
        </el-button>
        <el-button
          type="primary"
          @click="saveConfigModules"
        >
          保存
        </el-button>
      </template>
    </el-dialog>

    <!-- ==================== 序列号新增/编辑弹窗 ==================== -->
    <el-dialog
      v-model="serialDialogVisible"
      :title="serialForm.id ? '编辑序列号' : '新增序列号'"
      width="500px"
      @closed="resetSerialForm"
    >
      <el-form
        ref="serialFormRef"
        :model="serialForm"
        :rules="serialFormRules"
        label-width="100px"
        class="dialog-form"
      >
        <el-form-item
          label="序列号值"
          prop="serialNumber"
        >
          <el-input
            v-model="serialForm.serialNumber"
            placeholder="请输入序列号值"
            maxlength="100"
          />
        </el-form-item>
        <el-form-item label="备注">
          <el-input
            v-model="serialForm.remark"
            type="textarea"
            :rows="3"
            placeholder="可选"
            maxlength="500"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="serialDialogVisible = false">
          取消
        </el-button>
        <el-button
          type="primary"
          @click="confirmSerial"
        >
          确定
        </el-button>
      </template>
    </el-dialog>

    <!-- ==================== 批量导入序列号弹窗 ==================== -->
    <el-dialog
      v-model="batchImportDialogVisible"
      title="批量导入序列号"
      width="500px"
    >
      <el-alert
        title="每行输入一个序列号，支持批量创建"
        type="info"
        :closable="false"
        show-icon
        style="margin-bottom: 16px"
      />
      <el-input
        v-model="batchImportText"
        type="textarea"
        :rows="8"
        placeholder="每行一个序列号，例如：&#10;SN-001&#10;SN-002&#10;SN-003"
      />
      <template #footer>
        <el-button @click="batchImportDialogVisible = false">
          取消
        </el-button>
        <el-button
          type="primary"
          @click="confirmBatchImport"
        >
          导入
        </el-button>
      </template>
    </el-dialog>

    <!-- ==================== 分配序列号弹窗 ==================== -->
    <el-dialog
      v-model="assignDialogVisible"
      title="分配序列号"
      width="500px"
    >
      <el-form
        label-width="100px"
        class="dialog-form"
      >
        <el-form-item label="序列号">
          <el-input
            :model-value="assigningSerialNumber"
            disabled
          />
        </el-form-item>
        <el-form-item
          label="选择项目"
          required
        >
          <el-select
            v-model="assignProjectId"
            placeholder="请选择该设备的项目"
            filterable
            style="width: 100%"
          >
            <el-option
              v-for="p in equipmentProjects"
              :key="p.id"
              :label="`${p.jobNo} - ${p.name}`"
              :value="p.id"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="assignDialogVisible = false">
          取消
        </el-button>
        <el-button
          type="primary"
          :disabled="!assignProjectId"
          @click="confirmAssign"
        >
          确定分配
        </el-button>
      </template>
    </el-dialog>

    <!-- ==================== 关联项目弹窗 ==================== -->
    <el-dialog
      v-model="linkProjectDialogVisible"
      title="关联项目"
      width="70%"
      :close-on-click-modal="false"
    >
      <div class="link-project-search">
        <el-input
          v-model="linkProjectKeyword"
          placeholder="搜索项目名称/JOB号/客户"
          clearable
          style="width: 300px"
        />
        <span class="available-count">可关联项目：{{ filteredAvailableProjects.length }} 个</span>
        <el-alert
          v-if="modelMismatchProjects.length > 0"
          :title="`有 ${modelMismatchProjects.length} 个项目因机型不匹配无法关联`"
          type="warning"
          :closable="false"
          show-icon
          style="margin-left: auto; flex: 1"
        />
      </div>
      <el-table
        :data="filteredAvailableProjects"
        stripe
        style="width: 100%; margin-top: 12px"
        empty-text="暂无可关联的项目（所有项目机型不匹配或已关联其他设备）"
        max-height="400"
        @selection-change="handleLinkProjectSelectionChange"
      >
        <el-table-column
          type="selection"
          width="55"
          align="center"
        />
        <el-table-column
          prop="name"
          label="项目名称"
          min-width="180"
        />
        <el-table-column
          prop="jobNo"
          label="JOB号"
          width="160"
        />
        <el-table-column
          prop="customer"
          label="客户"
          width="180"
          show-overflow-tooltip
        />
        <el-table-column
          label="项目机型"
          width="140"
        >
          <template #default="{ row }">
            <el-tag
              v-if="row.equipmentModel"
              size="small"
              type="info"
            >
              {{ row.equipmentModel }}
            </el-tag>
            <span
              v-else
              style="color: #909399;"
            >未设置</span>
          </template>
        </el-table-column>
        <el-table-column
          label="当前关联设备"
          width="160"
        >
          <template #default="{ row }">
            <span v-if="row.equipmentId">{{ getEquipmentNameById(row.equipmentId) }}</span>
            <span
              v-else
              style="color: #909399;"
            >未关联</span>
          </template>
        </el-table-column>
        <el-table-column
          label="状态"
          width="100"
        >
          <template #default="{ row }">
            <el-tag
              :type="projectStatusTagType(row.status)"
              size="small"
            >
              {{ projectStatusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
      </el-table>
      <template #footer>
        <el-button @click="linkProjectDialogVisible = false">
          取消
        </el-button>
        <el-button
          type="primary"
          :disabled="selectedLinkProjects.length === 0"
          @click="confirmLinkProjects"
        >
          确认关联（{{ selectedLinkProjects.length }}）
        </el-button>
      </template>
    </el-dialog>

    <!-- 配置删除（引用检查）对话框 -->
    <CascadeDeleteDialog
      v-model="cfgCascadeVisible"
      title="删除配置"
      :entity-name="cfgCascadeTarget.name"
      :references="cfgCascadeReferences"
      :options="cfgCascadeOptions"
      :loading="cfgCascadeLoading"
      @confirm="onCfgCascadeConfirm"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, watch, nextTick, onMounted } from 'vue'
import { useRoute, useRouter, onBeforeRouteLeave } from 'vue-router'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import {
  ArrowLeft,
  Check,
  Plus,
  RefreshLeft,
  RefreshRight,
  QuestionFilled,
  Upload,
  Loading,
  Folder,
  FolderOpened
} from '@element-plus/icons-vue'
import dayjs from 'dayjs'
import { useEquipmentStore } from '@/stores/equipment'
import { useModulesStore } from '@/stores/modules'
import { useProjectsStore } from '@/stores/projects'
import { useTagsStore } from '@/stores/tags'
import type {
  Equipment,
  EquipmentConfiguration,
  EquipmentSerial,
  ConfigurationGroup,
  ChangeRecord,
  Project,
  Module
} from '@/types'
import { useModuleTree } from '@/composables/useModuleTree'
import { useKeyboardShortcuts } from '@/composables/useKeyboardShortcuts'
import { useAutoSave } from '@/composables/useAutoSave'
import { useUndoRedo } from '@/composables/useUndoRedo'
import { useTabSync } from '@/composables/useTabSync'
import { useUniqueValidation } from '@/composables/useUniqueValidation'
import EmptyState from '@/components/common/EmptyState.vue'
import ChangeHistoryList from '@/components/common/ChangeHistoryList.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import CascadeDeleteDialog, {
  type CascadeRefItem,
  type CascadeOption
} from '@/components/common/CascadeDeleteDialog.vue'

const route = useRoute()
const router = useRouter()
const equipmentStore = useEquipmentStore()
const modulesStore = useModulesStore()
const projectsStore = useProjectsStore()
const tagsStore = useTagsStore()

const equipmentId = computed(() => route.params.id as string)
const activeTab = ref('basic')
const tabSwitchKey = ref(0)

// Tab顺序（用于Ctrl+Tab切换）
const TAB_ORDER = ['basic', 'config', 'project', 'module', 'serial', 'history'] as const

function onTabChange() {
  tabSwitchKey.value++
}

// ===== 设备数据 =====
const equipment = computed<Equipment | undefined>(() =>
  equipmentStore.getEquipmentById(equipmentId.value)
)

// ===== Tab1 基本信息表单（使用ref以支持撤销/重做） =====
interface BasicFormData {
  name: string
  model: string
  description: string
  status: 'active' | 'inactive'
}

const basicFormRef = ref<FormInstance>()
const basicForm = ref<BasicFormData>({
  name: '',
  model: '',
  description: '',
  status: 'active'
})

const basicFormRules: FormRules = {
  name: [{ required: true, message: '请输入设备名称', trigger: 'blur' }],
  model: [{ required: true, message: '请输入设备型号', trigger: 'blur' }]
}

const activeCollapse = ref<string[]>(['basicProps', 'statusMgmt'])
const formTouched = ref(false)

// 上次保存的表单快照（用于重置）
const lastSavedFormData = ref<BasicFormData | null>(null)

// 标记是否正在执行撤销/重做操作（避免watch触发commit）
const isUndoRedoing = ref(false)
let isInitializing = false

// ===== 撤销/重做 =====
const { canUndo, canRedo, undo, redo, commit, clearHistory } = useUndoRedo<BasicFormData>(basicForm)

let commitTimer: ReturnType<typeof setTimeout> | null = null
function debouncedCommit() {
  if (commitTimer) clearTimeout(commitTimer)
  commitTimer = setTimeout(() => {
    if (!isUndoRedoing.value && !isInitializing) {
      commit()
    }
  }, 800)
}

function doUndo() {
  if (!canUndo.value) return
  isUndoRedoing.value = true
  undo()
  nextTick(() => {
    isUndoRedoing.value = false
  })
}

function doRedo() {
  if (!canRedo.value) return
  isUndoRedoing.value = true
  redo()
  nextTick(() => {
    isUndoRedoing.value = false
  })
}

// 监听表单变化，推入撤销历史
watch(
  basicForm,
  () => {
    if (isInitializing || isUndoRedoing.value) return
    formTouched.value = true
    debouncedCommit()
  },
  { deep: true }
)

// ===== 保存逻辑 =====
const isSavingManually = ref(false)

async function performSave(): Promise<boolean> {
  try {
    // 机型唯一性校验
    if (modelUnique.hasError.value) {
      ElMessage.error(modelUnique.error.value || '设备型号已存在')
      return false
    }
    await equipmentStore.updateEquipment(equipmentId.value, {
      name: basicForm.value.name,
      model: basicForm.value.model,
      description: basicForm.value.description || undefined,
      status: basicForm.value.status
    })
    lastSavedFormData.value = JSON.parse(JSON.stringify(basicForm.value)) as BasicFormData
    return true
  } catch (err) {
    const msg = err instanceof Error ? err.message : '保存失败'
    ElMessage.error(msg)
    return false
  }
}

// ===== 自动保存 =====
const { lastSaved, isSaving, dirty, triggerSave, markClean } = useAutoSave({
  data: basicForm,
  saveFn: async () => {
    if (!basicForm.value.name || !basicForm.value.model) return
    const ok = await performSave()
    if (!ok) throw new Error('auto save failed')
  },
  interval: getAutoSaveIntervalMs()
})

/** 从 localStorage 读取自动保存间隔（毫秒） */
function getAutoSaveIntervalMs(): number {
  try {
    const saved = localStorage.getItem('bom-manager-autosave-interval')
    if (saved) {
      const ms = parseInt(saved, 10)
      if (!isNaN(ms) && ms > 0) return ms
      if (ms === -1) return 0
    }
  } catch { /* ignore */ }
  return 30000
}

// ===== 多标签页同步 =====
async function reloadEquipment() {
  const eq = equipmentStore.getEquipmentById(equipmentId.value)
  if (eq) {
    basicForm.value = {
      name: eq.name,
      model: eq.model,
      description: eq.description || '',
      status: eq.status
    }
  }
}

useTabSync({
  storageKey: 'equipment-editor',
  entityId: equipmentId.value,
  onRefresh: reloadEquipment
})

// ===== 实时唯一性校验 =====
const modelUnique = useUniqueValidation(
  () => equipmentStore.isModelUnique(basicForm.value.model, equipmentId.value),
  () => basicForm.value.model
)

const saveStatusText = computed(() => {
  if (isSaving.value) return '保存中...'
  if (dirty.value) return '有未保存更改'
  if (lastSaved.value) return `已保存 ${dayjs(lastSaved.value).format('HH:mm:ss')}`
  return '未保存'
})

async function handleManualSave() {
  if (!basicFormRef.value) return
  try {
    await basicFormRef.value.validate()
  } catch {
    ElMessage.warning('请填写必填项')
    return
  }
  isSavingManually.value = true
  await triggerSave()
  isSavingManually.value = false
  if (!dirty.value) {
    ElMessage.success('保存成功')
  } else {
    ElMessage.error('保存失败，请重试')
  }
}

function resetForm() {
  if (!lastSavedFormData.value) return
  isUndoRedoing.value = true
  basicForm.value = JSON.parse(JSON.stringify(lastSavedFormData.value)) as BasicFormData
  nextTick(() => {
    isUndoRedoing.value = false
    markClean()
    basicFormRef.value?.clearValidate()
  })
  ElMessage.info('已恢复到上次保存状态')
}

// 回显基本信息
watch(
  equipment,
  (eq) => {
    if (eq) {
      isInitializing = true
      basicForm.value = {
        name: eq.name,
        model: eq.model,
        description: eq.description || '',
        status: eq.status
      }
      lastSavedFormData.value = JSON.parse(JSON.stringify(basicForm.value)) as BasicFormData
      nextTick(() => {
        clearHistory()
        commit()
        markClean()
        isInitializing = false
      })
    }
  },
  { immediate: true }
)

// 路由参数变化时重新加载数据（从一个设备跳到另一个设备）
watch(
  () => route.params.id,
  () => {
    activeTab.value = 'basic'
    tabSwitchKey.value = 0
    moduleBomCountMap.value = new Map()
    if (basicFormRef.value) basicFormRef.value.clearValidate()
  }
)

// ===== Tab完成状态 =====
type TabStatus = 'filled' | 'empty' | 'error'
const tabStatuses = computed<Record<string, TabStatus>>(() => ({
  basic: (() => {
    if (basicForm.value.name && basicForm.value.model) return 'filled'
    return formTouched.value ? 'error' : 'empty'
  })(),
  config: configList.value.length > 0 ? 'filled' : 'empty',
  project: equipmentProjects.value.length > 0 ? 'filled' : 'empty',
  module: equipmentModules.value.length > 0 ? 'filled' : 'empty',
  serial: equipmentSerials.value.length > 0 ? 'filled' : 'empty',
  history: changeHistoryList.value.length > 0 ? 'filled' : 'empty'
}))

// ===== Tab2 配置管理 =====
const configList = computed<EquipmentConfiguration[]>(() =>
  equipmentStore.getConfigurationsByEquipment(equipmentId.value)
)

// ----- 配置分组 -----
const selectedGroupId = ref<string | null>(null)

const groupList = computed<ConfigurationGroup[]>(() =>
  equipmentStore.getConfigurationGroups(equipmentId.value)
)

const ungroupedConfigCount = computed(
  () => configList.value.filter((c) => !c.groupId).length
)

/** 根据选中分组筛选配置 */
const filteredConfigList = computed<EquipmentConfiguration[]>(() =>
  equipmentStore.getConfigurationsByGroup(equipmentId.value, selectedGroupId.value)
)

function getConfigCountByGroup(groupId: string): number {
  return configList.value.filter((c) => c.groupId === groupId).length
}

function getSelectedGroupName(): string {
  if (selectedGroupId.value === null) return '未分组'
  const g = equipmentStore.getConfigurationGroupById(selectedGroupId.value)
  return g ? g.name : '未分组'
}

// 分组弹窗
const groupDialogVisible = ref(false)
const groupFormRef = ref<FormInstance>()
const groupForm = reactive({
  id: '',
  name: '',
  description: ''
})
const groupNameError = ref('')

const groupFormRules: FormRules = {
  name: [{ required: true, message: '请输入分组名称', trigger: 'blur' }]
}

function openGroupDialog(row?: ConfigurationGroup) {
  groupNameError.value = ''
  if (row) {
    groupForm.id = row.id
    groupForm.name = row.name
    groupForm.description = row.description || ''
  } else {
    groupForm.id = ''
    groupForm.name = ''
    groupForm.description = ''
  }
  groupDialogVisible.value = true
}

function resetGroupForm() {
  groupFormRef.value?.clearValidate()
  groupNameError.value = ''
}

async function confirmGroup() {
  if (!groupFormRef.value) return
  try {
    await groupFormRef.value.validate()
  } catch {
    return
  }
  const name = groupForm.name.trim()
  // 组名唯一性校验
  if (!equipmentStore.isGroupNameUnique(name, equipmentId.value, groupForm.id || undefined)) {
    groupNameError.value = `分组名「${name}」在该设备下已存在`
    return
  }
  if (groupForm.id) {
    await equipmentStore.updateConfigurationGroup(groupForm.id, {
      name,
      description: groupForm.description || undefined
    })
    ElMessage.success('分组已更新')
  } else {
    await equipmentStore.addConfigurationGroup({
      equipmentId: equipmentId.value,
      name,
      description: groupForm.description || undefined
    })
    ElMessage.success('分组已创建')
  }
  groupDialogVisible.value = false
}

async function handleDeleteGroup(g: ConfigurationGroup) {
  const count = getConfigCountByGroup(g.id)
  try {
    await ElMessageBox.confirm(
      count > 0
        ? `该分组下有 ${count} 个配置，删除后这些配置将变为未分组，是否继续？`
        : `确定删除分组「${g.name}」吗？`,
      '删除分组',
      {
        confirmButtonText: '删除',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
  } catch {
    return
  }
  await equipmentStore.deleteConfigurationGroup(g.id)
  // 若删除的是当前选中分组，则切回未分组
  if (selectedGroupId.value === g.id) {
    selectedGroupId.value = null
  }
  ElMessage.success('分组已删除')
}

// 配置弹窗
const configDialogVisible = ref(false)
const configFormRef = ref<FormInstance>()
const configForm = reactive({
  id: '',
  name: '',
  description: '',
  groupId: ''
})

const configFormRules: FormRules = {
  name: [{ required: true, message: '请输入配置名称', trigger: 'blur' }]
}

function openConfigDialog(row?: EquipmentConfiguration) {
  if (row) {
    configForm.id = row.id
    configForm.name = row.name
    configForm.description = row.description || ''
    configForm.groupId = row.groupId || ''
  } else {
    configForm.id = ''
    configForm.name = ''
    configForm.description = ''
    // 新增配置时默认归属当前选中分组（未分组则为空）
    configForm.groupId = selectedGroupId.value || ''
  }
  configDialogVisible.value = true
}

function resetConfigForm() {
  configFormRef.value?.clearValidate()
}

async function confirmConfig() {
  if (!configFormRef.value) return
  try {
    await configFormRef.value.validate()
  } catch {
    return
  }
  const groupId = configForm.groupId || undefined
  if (configForm.id) {
    equipmentStore.updateConfiguration(configForm.id, {
      name: configForm.name,
      description: configForm.description || undefined,
      groupId
    })
    ElMessage.success('配置已更新')
  } else {
    equipmentStore.addConfiguration({
      equipmentId: equipmentId.value,
      name: configForm.name,
      description: configForm.description || undefined,
      moduleIds: [],
      groupId
    })
    ElMessage.success('配置已创建')
  }
  configDialogVisible.value = false
}

// ===== 配置删除（引用检查 + 解除关联选项） =====
const cfgCascadeVisible = ref(false)
const cfgCascadeLoading = ref(false)
const cfgCascadeTarget = ref<{ id: string; name: string }>({ id: '', name: '' })
const cfgCascadeReferences = ref<CascadeRefItem[]>([])
const cfgCascadeOptions = ref<CascadeOption[]>([])

async function handleDeleteConfig(row: EquipmentConfiguration) {
  const refs = equipmentStore.getConfigurationReferences(row.id)
  cfgCascadeTarget.value = { id: row.id, name: row.name }
  cfgCascadeReferences.value = [
    { label: '关联组件', count: refs.moduleCount },
    { label: '使用中的项目', count: refs.projectCount }
  ]
  const hasRefs = refs.moduleCount > 0 || refs.projectCount > 0
  if (!hasRefs) {
    cfgCascadeOptions.value = [{
      value: 'direct',
      label: '直接删除',
      description: '该配置无关联引用，将被直接删除。'
    }]
  } else {
    cfgCascadeOptions.value = [
      {
        value: 'unlink',
        label: '解除关联后删除',
        type: 'warning',
        description: `将组件与项目中的配置引用清除（涉及 ${refs.moduleCount} 个组件、${refs.projectCount} 个项目），然后删除配置。`
      },
      { value: 'cancel', label: '取消删除', description: '不执行删除。' }
    ]
  }
  cfgCascadeVisible.value = true
}

async function onCfgCascadeConfirm(action: string) {
  if (action === 'cancel') {
    cfgCascadeVisible.value = false
    return
  }
  cfgCascadeLoading.value = true
  try {
    await equipmentStore.deleteConfiguration(cfgCascadeTarget.value.id, action === 'unlink' ? 'unlink' : 'direct')
    ElMessage.success('删除成功')
    cfgCascadeVisible.value = false
  } finally {
    cfgCascadeLoading.value = false
  }
}

// ===== 关联模块（穿梭框） =====
const moduleDialogVisible = ref(false)
const currentConfigId = ref('')
const selectedModuleIds = ref<string[]>([])

const equipmentModules = computed<Module[]>(() =>
  modulesStore.getModulesByEquipment(equipmentId.value)
)

// 构建按层级排序的扁平化模块列表，子模块缩进
const transferData = computed(() => {
  const modules = equipmentModules.value
  const moduleMap = new Map(modules.map((m) => [m.id, m]))
  const result: { key: string; label: string; depth: number }[] = []
  const visited = new Set<string>()

  function traverse(moduleId: string, depth: number) {
    if (visited.has(moduleId)) return
    const m = moduleMap.get(moduleId)
    if (!m) return
    visited.add(moduleId)
    const indent = '　'.repeat(depth)
    const prefix = depth > 0 ? '└ ' : ''
    result.push({
      key: m.id,
      label: `${indent}${prefix}${m.drawingNo} - ${m.nameZh}`,
      depth
    })
    for (const childId of m.childModuleIds || []) {
      traverse(childId, depth + 1)
    }
  }

  const rootModules = modules.filter((m) => {
    const parentIds = m.parentModuleIds || []
    return parentIds.length === 0 || !parentIds.some(pid => moduleMap.has(pid))
  })
  for (const m of rootModules) {
    traverse(m.id, 0)
  }

  for (const m of modules) {
    if (!visited.has(m.id)) {
      traverse(m.id, 0)
    }
  }

  return result
})

const currentConfigName = computed(() => {
  const cfg = equipmentStore.getConfigurationById(currentConfigId.value)
  return cfg ? cfg.name : ''
})

function openModuleDialog(row: EquipmentConfiguration) {
  currentConfigId.value = row.id
  selectedModuleIds.value = [...row.moduleIds]
  moduleDialogVisible.value = true
}

function saveConfigModules() {
  const cfgId = currentConfigId.value
  equipmentStore.updateConfiguration(cfgId, { moduleIds: [...selectedModuleIds.value] })

  equipmentModules.value.forEach((m) => {
    const ids = m.configurationIds || []
    const has = ids.includes(cfgId)
    const shouldHave = selectedModuleIds.value.includes(m.id)
    if (has && !shouldHave) {
      modulesStore.updateModule(m.id, {
        configurationIds: ids.filter((id) => id !== cfgId)
      })
    } else if (!has && shouldHave) {
      modulesStore.updateModule(m.id, {
        configurationIds: [...ids, cfgId]
      })
    }
  })

  moduleDialogVisible.value = false
  ElMessage.success('关联组件已更新')
}

// ===== Tab3 关联项目 =====
const equipmentProjects = computed<Project[]>(() =>
  projectsStore.projects.filter((p) => p.equipmentId === equipmentId.value)
)

function projectStatusLabel(status: Project['status']): string {
  const map: Record<Project['status'], string> = {
    ongoing: '进行中',
    completed: '已完成',
    cancelled: '已取消',
    paused: '已暂停'
  }
  return map[status]
}

function projectStatusTagType(status: Project['status']): 'primary' | 'success' | 'danger' | 'warning' {
  const map: Record<Project['status'], 'primary' | 'success' | 'danger' | 'warning'> = {
    ongoing: 'primary',
    completed: 'success',
    cancelled: 'danger',
    paused: 'warning'
  }
  return map[status]
}

function goToProject(projectId: string) {
  router.push(`/project/${projectId}/edit`)
}

// ===== 关联项目管理 =====
const linkProjectDialogVisible = ref(false)
const linkProjectKeyword = ref('')
const selectedLinkProjects = ref<Project[]>([])

const availableProjects = computed<Project[]>(() => {
  const currentModel = equipment.value?.model || ''
  return projectsStore.projects.filter((p) => {
    if (p.equipmentId === equipmentId.value) return false
    if (p.equipmentModel && currentModel) {
      return p.equipmentModel === currentModel
    }
    return true
  })
})

const modelMismatchProjects = computed<Project[]>(() => {
  const currentModel = equipment.value?.model || ''
  return projectsStore.projects.filter((p) => {
    if (p.equipmentId === equipmentId.value) return false
    if (p.equipmentModel && currentModel && p.equipmentModel !== currentModel) {
      return true
    }
    return false
  })
})

const filteredAvailableProjects = computed<Project[]>(() => {
  if (!linkProjectKeyword.value) return availableProjects.value
  const kw = linkProjectKeyword.value.toLowerCase()
  return availableProjects.value.filter(
    (p) =>
      p.name.toLowerCase().includes(kw) ||
      p.jobNo.toLowerCase().includes(kw) ||
      (p.customer || '').toLowerCase().includes(kw)
  )
})

function getEquipmentNameById(equipId: string): string {
  const equip = equipmentStore.getEquipmentById(equipId)
  return equip ? equip.name : equipId
}

function openLinkProjectDialog() {
  linkProjectKeyword.value = ''
  selectedLinkProjects.value = []
  linkProjectDialogVisible.value = true
}

function handleLinkProjectSelectionChange(selection: Project[]) {
  selectedLinkProjects.value = selection
}

async function confirmLinkProjects() {
  if (selectedLinkProjects.value.length === 0) return

  const currentModel = equipment.value?.model || ''
  const count = selectedLinkProjects.value.length

  const mismatchProjects = selectedLinkProjects.value.filter(
    (p) => p.equipmentModel && currentModel && p.equipmentModel !== currentModel
  )

  if (mismatchProjects.length > 0) {
    const mismatchNames = mismatchProjects.map((p) => p.name).join('、')
    ElMessage.warning(`以下项目机型不匹配，无法关联：${mismatchNames}`)
    return
  }

  try {
    for (const project of selectedLinkProjects.value) {
      await projectsStore.updateProject(project.id, { equipmentId: equipmentId.value })
    }
    ElMessage.success(`成功关联 ${count} 个项目`)
    linkProjectDialogVisible.value = false
  } catch (err) {
    ElMessage.error('关联项目失败：' + (err as Error).message)
  }
}

async function handleUnlinkProject(project: Project) {
  try {
    await ElMessageBox.confirm(
      `确定要取消项目「${project.name}」与当前设备的关联吗？`,
      '取消关联',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    await projectsStore.updateProject(project.id, { equipmentId: '' })
    ElMessage.success(`已取消项目「${project.name}」的关联`)
  } catch {
    // 用户取消
  }
}

// ===== Tab4 关联模块 =====
const filterConfigId = ref('')

const moduleDepthMap = computed<Map<string, number>>(() => {
  const modules = equipmentModules.value
  const moduleMap = new Map(modules.map((m) => [m.id, m]))
  const depthMap = new Map<string, number>()
  const visited = new Set<string>()

  function calcDepth(moduleId: string): number {
    if (depthMap.has(moduleId)) return depthMap.get(moduleId)!
    if (visited.has(moduleId)) return 0
    visited.add(moduleId)
    const m = moduleMap.get(moduleId)
    const parentIds = m?.parentModuleIds || []
    let maxDepth = 0
    for (const parentId of parentIds) {
      if (moduleMap.has(parentId)) {
        const depth = calcDepth(parentId) + 1
        maxDepth = Math.max(maxDepth, depth)
      }
    }
    depthMap.set(moduleId, maxDepth)
    return maxDepth
  }

  for (const m of modules) {
    calcDepth(m.id)
  }
  return depthMap
})

const sortedModules = computed<Module[]>(() => {
  const modules = equipmentModules.value
  const moduleMap = new Map(modules.map((m) => [m.id, m]))
  const result: Module[] = []
  const visited = new Set<string>()

  function traverse(moduleId: string) {
    if (visited.has(moduleId)) return
    const m = moduleMap.get(moduleId)
    if (!m) return
    visited.add(moduleId)
    result.push(m)
    for (const childId of m.childModuleIds || []) {
      traverse(childId)
    }
  }

  const rootModules = modules.filter((m) => {
    const parentIds = m.parentModuleIds || []
    return parentIds.length === 0 || !parentIds.some(pid => moduleMap.has(pid))
  })
  for (const m of rootModules) {
    traverse(m.id)
  }
  for (const m of modules) {
    if (!visited.has(m.id)) {
      traverse(m.id)
    }
  }
  return result
})

const filteredModules = computed<Module[]>(() => {
  const sorted = sortedModules.value
  if (filterConfigId.value) {
    return sorted.filter((m) => (m.configurationIds || []).includes(filterConfigId.value))
  }
  return sorted
})

const {
  hasChildren: equipTreeHasChildren,
  isCollapsed: equipTreeIsCollapsed,
  toggleCollapse: equipTreeToggleCollapse,
  filteredModules: equipTreeFilteredModules
} = useModuleTree(() => filteredModules.value)

const moduleBomCountMap = ref<Map<string, number>>(new Map())

async function loadModuleBomCounts() {
  if (filteredModules.value.length === 0) {
    moduleBomCountMap.value = new Map()
    return
  }
  const results = await Promise.all(
    filteredModules.value.map(async (m) => ({
      moduleId: m.id,
      count: (await modulesStore.getBomItems(m.id)).length
    }))
  )
  const map = new Map<string, number>()
  results.forEach((r) => map.set(r.moduleId, r.count))
  moduleBomCountMap.value = map
}

watch(filteredModules, () => {
  loadModuleBomCounts()
}, { immediate: true })

function getTagName(tagId: string): string {
  const tag = tagsStore.getTagById(tagId)
  return tag ? tag.name : tagId
}

function goToModule(moduleId: string) {
  router.push(`/module/${moduleId}/edit`)
}

// ===== Tab6 序列号管理 =====
const equipmentSerials = computed<EquipmentSerial[]>(() =>
  equipmentStore.getSerialsByEquipment(equipmentId.value)
)

const serialDialogVisible = ref(false)
const serialFormRef = ref<FormInstance>()
const serialForm = reactive({
  id: '',
  serialNumber: '',
  remark: ''
})

const serialFormRules: FormRules = {
  serialNumber: [{ required: true, message: '请输入序列号值', trigger: 'blur' }]
}

function openSerialDialog(row?: EquipmentSerial) {
  if (row) {
    serialForm.id = row.id
    serialForm.serialNumber = row.serialNumber
    serialForm.remark = row.remark || ''
  } else {
    serialForm.id = ''
    serialForm.serialNumber = ''
    serialForm.remark = ''
  }
  serialDialogVisible.value = true
}

function resetSerialForm() {
  serialFormRef.value?.clearValidate()
}

async function confirmSerial() {
  if (!serialFormRef.value) return
  try {
    await serialFormRef.value.validate()
  } catch {
    return
  }
  if (serialForm.id) {
    equipmentStore.updateSerial(serialForm.id, {
      serialNumber: serialForm.serialNumber,
      remark: serialForm.remark || undefined
    })
    ElMessage.success('序列号已更新')
  } else {
    equipmentStore.addSerial({
      equipmentId: equipmentId.value,
      serialNumber: serialForm.serialNumber,
      status: 'unassigned',
      remark: serialForm.remark || undefined
    })
    ElMessage.success('序列号已创建')
  }
  serialDialogVisible.value = false
}

async function handleDeleteSerial(row: EquipmentSerial) {
  try {
    await ElMessageBox.confirm(
      `确定要删除序列号「${row.serialNumber}」吗？`,
      '删除确认',
      { type: 'warning', confirmButtonText: '确定删除', cancelButtonText: '取消' }
    )
    equipmentStore.deleteSerial(row.id)
    ElMessage.success('删除成功')
  } catch {
    // 用户取消
  }
}

// 批量导入序列号
const batchImportDialogVisible = ref(false)
const batchImportText = ref('')

function openBatchImport() {
  batchImportText.value = ''
  batchImportDialogVisible.value = true
}

function confirmBatchImport() {
  const lines = batchImportText.value
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
  if (lines.length === 0) {
    ElMessage.warning('请输入至少一个序列号')
    return
  }
  let successCount = 0
  for (const sn of lines) {
    try {
      equipmentStore.addSerial({
        equipmentId: equipmentId.value,
        serialNumber: sn,
        status: 'unassigned'
      })
      successCount++
    } catch {
      // 跳过失败的
    }
  }
  if (successCount > 0) {
    ElMessage.success(`成功导入 ${successCount} 个序列号`)
  } else {
    ElMessage.error('导入失败')
  }
  batchImportDialogVisible.value = false
}

// 分配序列号
const assignDialogVisible = ref(false)
const assigningSerialId = ref('')
const assigningSerialNumber = ref('')
const assignProjectId = ref('')

function openAssignDialog(row: EquipmentSerial) {
  assigningSerialId.value = row.id
  assigningSerialNumber.value = row.serialNumber
  assignProjectId.value = ''
  assignDialogVisible.value = true
}

function confirmAssign() {
  if (!assignProjectId.value) {
    ElMessage.warning('请选择项目')
    return
  }
  equipmentStore.assignSerial(assigningSerialId.value, assignProjectId.value)
  assignDialogVisible.value = false
  ElMessage.success('分配成功')
}

async function handleUnassign(row: EquipmentSerial) {
  try {
    await ElMessageBox.confirm(
      `确定要取消序列号「${row.serialNumber}」的项目分配吗？`,
      '取消分配确认',
      { type: 'warning', confirmButtonText: '确定取消', cancelButtonText: '返回' }
    )
    equipmentStore.unassignSerial(row.id)
    ElMessage.success('已取消分配')
  } catch {
    // 用户取消
  }
}

function getProjectName(projectId: string): string {
  const p = projectsStore.getProjectById(projectId)
  return p ? p.name : '—'
}

// ===== Tab7 更改历史 =====
const changeHistoryList = computed<ChangeRecord[]>(() => {
  if (!equipment.value?.changeHistory) return []
  return [...equipment.value.changeHistory].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  )
})

function historyTagType(operation: string): 'success' | 'warning' | 'danger' | 'info' | 'primary' {
  if (operation.includes('创建') || operation.includes('新增')) return 'success'
  if (operation.includes('删除')) return 'danger'
  if (operation.includes('停用') || operation.includes('取消')) return 'warning'
  if (operation.includes('更新')) return 'primary'
  return 'info'
}

// ===== 变更历史回滚（仅基本信息字段） =====
async function handleRollbackHistory(record: ChangeRecord) {
  if (!record.beforeData) {
    ElMessage.warning('该记录无回滚数据')
    return
  }
  try {
    await equipmentStore.updateEquipment(equipmentId.value, { ...record.beforeData })
    // 回滚本身记录到历史
    await equipmentStore.addChangeHistory(
      equipmentId.value,
      '回滚',
      `回滚到「${record.detail}」之前的状态`
    )
    ElMessage.success('回滚成功，基本信息已恢复')
  } catch (e) {
    ElMessage.error('回滚失败：' + (e instanceof Error ? e.message : String(e)))
  }
}

// ===== 键盘快捷键 =====
const { register } = useKeyboardShortcuts()

register('ctrl+s', () => {
  handleManualSave()
})

register('ctrl+z', () => {
  doUndo()
})

register('ctrl+y', () => {
  doRedo()
})

register('ctrl+tab', () => {
  const idx = TAB_ORDER.indexOf(activeTab.value as typeof TAB_ORDER[number])
  const nextIdx = (idx + 1) % TAB_ORDER.length
  activeTab.value = TAB_ORDER[nextIdx]
})

register('esc', () => {
  // 关闭当前打开的弹窗（按优先级）
  if (linkProjectDialogVisible.value) {
    linkProjectDialogVisible.value = false
  } else if (assignDialogVisible.value) {
    assignDialogVisible.value = false
  } else if (batchImportDialogVisible.value) {
    batchImportDialogVisible.value = false
  } else if (serialDialogVisible.value) {
    serialDialogVisible.value = false
  } else if (moduleDialogVisible.value) {
    moduleDialogVisible.value = false
  } else if (configDialogVisible.value) {
    configDialogVisible.value = false
  }
})

// ===== 路由离开守卫 =====
onBeforeRouteLeave((_to, _from, next) => {
  if (dirty.value) {
    ElMessageBox.confirm('有未保存的更改，确定离开吗？', '提示', {
      type: 'warning',
      confirmButtonText: '确定离开',
      cancelButtonText: '取消'
    })
      .then(() => next())
      .catch(() => next(false))
  } else {
    next()
  }
})

// ===== 导航 =====
function goBack() {
  router.push('/equipment')
}
</script>

<style scoped>
.page-container {
  padding-bottom: 80px;
}

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid #ebeef5;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-title {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}

.header-model {
  font-size: 14px;
  font-weight: 400;
  color: #909399;
  margin-left: 8px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* 保存状态 */
.save-status {
  font-size: 13px;
  color: #909399;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-right: 8px;
}

.save-status-dirty {
  color: #e6a23c;
}

.save-status-saving {
  color: #409eff;
}

.save-status .is-loading {
  animation: spin 1s linear infinite;
}

.tab-dirty {
  color: #e6a23c;
  font-weight: bold;
  margin-left: 2px;
}

.input-error :deep(.el-input__wrapper) {
  box-shadow: 0 0 0 1px #f56c6c inset !important;
}

.field-error-text {
  font-size: 12px;
  color: #f56c6c;
  line-height: 1.4;
  margin-top: 2px;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Tab状态圆点 */
.tab-label-wrap {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.tab-status-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #c0c4cc;
}

.tab-status-dot.dot-filled {
  background: #67c23a;
}

.tab-status-dot.dot-error {
  background: #f56c6c;
}

.tab-status-dot.dot-empty {
  background: #c0c4cc;
}

.equipment-tabs {
  margin-top: 8px;
}

/* Tab内容淡入动画 */
.tabs-content {
  animation: fadeInUp 0.25s ease;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 基本信息表单 */
.basic-form {
  max-width: 800px;
}

.form-collapse {
  border: none;
}

.form-collapse :deep(.el-collapse-item__header) {
  font-weight: 600;
  font-size: 15px;
  color: #303133;
  background: #f5f7fa;
  padding-left: 12px;
  border-radius: 4px;
}

.form-collapse :deep(.el-collapse-item__wrap) {
  border-bottom: none;
}

.form-collapse :deep(.el-collapse-item__content) {
  padding: 16px 12px 8px;
}

.label-with-tooltip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.tooltip-icon {
  color: #c0c4cc;
  cursor: help;
  font-size: 14px;
}

.tooltip-icon:hover {
  color: #409eff;
}

/* 操作栏 */
.action-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.panel-current-label {
  color: #909399;
  font-size: 13px;
}

/* ===== Tab2 配置管理：左右布局 ===== */
.config-tab-layout {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}

.config-group-panel {
  width: 220px;
  flex-shrink: 0;
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  background: #fff;
  padding: 12px;
}

.group-panel-header {
  margin-bottom: 12px;
}

.group-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 560px;
  overflow-y: auto;
}

.group-list-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.2s;
}

.group-list-item:hover {
  background: #f5f7fa;
}

.group-list-item.active {
  background: #ecf5ff;
  color: #409eff;
}

.group-item-main {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  flex: 1;
}

.group-item-icon {
  flex-shrink: 0;
  color: #909399;
}

.group-list-item.active .group-item-icon {
  color: #409eff;
}

.group-item-name {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 13px;
}

.group-item-count {
  flex-shrink: 0;
}

.group-item-actions {
  display: none;
  gap: 2px;
  flex-shrink: 0;
}

.group-list-item:hover .group-item-actions {
  display: inline-flex;
}

.config-list-panel {
  flex: 1;
  min-width: 0;
}

.form-error-tip {
  color: #f56c6c;
  font-size: 12px;
  margin-top: 4px;
  line-height: 1.4;
}

.module-tree-cell {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.tree-toggle {
  cursor: pointer;
  user-select: none;
  font-size: 10px;
  color: #909399;
  width: 14px;
  text-align: center;
  transition: color 0.2s;
}

.tree-toggle:hover {
  color: #409eff;
}

.tree-toggle-placeholder {
  display: inline-block;
  width: 14px;
}

.project-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.project-count {
  color: #909399;
  font-size: 13px;
}

.link-project-search {
  display: flex;
  align-items: center;
  gap: 12px;
}

.available-count {
  color: #909399;
  font-size: 13px;
}

.module-filter-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}

.filter-label {
  font-size: 14px;
  color: #606266;
}

.text-muted {
  color: #909399;
}

/* 底部操作栏 */
.editor-footer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #fff;
  border-top: 1px solid #ebeef5;
  padding: 12px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  z-index: 100;
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.05);
}

.footer-left,
.footer-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

/* 保存按钮脉冲动画 */
.save-btn-pulse {
  animation: pulseGlow 1.5s ease-in-out infinite;
}

@keyframes pulseGlow {
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(64, 158, 255, 0.5);
  }
  50% {
    box-shadow: 0 0 0 8px rgba(64, 158, 255, 0);
  }
}

/* 弹窗 */
.module-dialog-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding: 10px 14px;
  background: #f5f7fa;
  border-radius: 4px;
  font-size: 13px;
  color: #606266;
}

.module-dialog :deep(.el-dialog__body) {
  padding: 20px;
}

.module-dialog :deep(.el-dialog) {
  max-width: 1200px;
}

.module-transfer {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.module-transfer :deep(.el-transfer-panel) {
  flex: 1 1 0% !important;
  min-width: 0 !important;
  width: auto !important;
  max-width: none !important;
}

.module-transfer :deep(.el-transfer-panel__body) {
  height: auto;
  min-height: 420px;
}

.module-transfer :deep(.el-transfer-panel__list) {
  height: auto;
  min-height: 380px;
  max-height: 420px;
}

.module-transfer :deep(.el-transfer-panel__item) {
  white-space: normal;
  word-break: break-all;
  line-height: 1.5;
  padding: 8px 12px;
  height: auto;
  min-height: 32px;
}

.module-transfer :deep(.el-transfer__buttons) {
  align-self: center;
  padding-top: 0;
  flex-shrink: 0;
}

.module-transfer :deep(.el-transfer-panel__header) {
  padding: 8px 12px;
}

.module-transfer :deep(.el-transfer-panel__filter) {
  padding: 8px 12px;
}

.module-transfer :deep(.el-transfer-panel__body .el-checkbox__label) {
  width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
}

@media (max-width: 900px) {
  .module-dialog :deep(.el-dialog) {
    width: 95% !important;
    margin-left: 2.5% !important;
  }

  .module-transfer :deep(.el-transfer) {
    flex-direction: row !important;
    gap: 10px !important;
  }

  .module-transfer :deep(.el-transfer-panel) {
    min-width: 150px !important;
    flex: 1 1 0% !important;
  }

  .module-transfer :deep(.el-transfer__buttons) {
    flex-direction: column;
    padding: 0 5px;
    flex-shrink: 0;
  }
}

.dialog-form {
  padding: 0 8px;
}

/* 更改历史 */
.history-item {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.history-op-tag {
  flex-shrink: 0;
}

.history-detail {
  color: #303133;
  font-size: 14px;
}

.history-operator {
  color: #909399;
  font-size: 12px;
  margin-left: auto;
}

.empty-state {
  text-align: center;
  padding: 40px;
  color: #909399;
}
</style>
