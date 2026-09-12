<template>
  <div class="page-container">
    <PageBreadcrumb />
    <!-- ===== 顶部标题栏 ===== -->
    <div class="card-wrapper editor-header">
      <div class="header-left">
        <el-button @click="handleBack">
          <el-icon><ArrowLeft /></el-icon>
          返回
        </el-button>
        <div class="header-title">
          <span class="project-name">{{ form.name || '未命名项目' }}</span>
          <span
            v-if="form.jobNo"
            class="project-jobno"
          >{{ form.jobNo }}</span>
          <el-tag
            v-if="!isNew"
            :type="statusTagType(form.status)"
            size="small"
            effect="dark"
          >
            {{ statusLabel(form.status) }}
          </el-tag>
          <el-tag
            v-if="autoSaveDirty"
            type="warning"
            size="small"
            effect="plain"
          >
            未保存
          </el-tag>
          <span
            v-if="autoSaveLastSaved"
            class="last-saved-tip"
          >
            上次保存 {{ formatTime(autoSaveLastSaved) }}
          </span>
        </div>
      </div>
      <div class="header-right">
        <el-button
          :disabled="isNew"
          @click="openProjectPrint"
        >
          <el-icon><Printer /></el-icon>
          打印
        </el-button>
        <el-button
          type="primary"
          :loading="saving || autoSaveSaving"
          :disabled="!autoSaveDirty && !isNew"
          @click="handleSave"
        >
          <el-icon><Check /></el-icon>
          保存
        </el-button>
      </div>
    </div>

    <!-- ===== Tab 页 ===== -->
    <div class="card-wrapper">
      <el-tabs
        v-model="activeTab"
        type="border-card"
        class="project-tabs"
      >
        <!-- ========== Tab1: 基本信息 ========== -->
        <el-tab-pane name="basic">
          <template #label>
            <span class="tab-label-with-status">
              基本信息
              <span
                v-if="autoSaveDirty"
                class="tab-dirty"
              >*</span>
              <el-icon
                v-if="basicComplete"
                class="tab-status-dot success"
              ><CircleCheckFilled /></el-icon>
              <el-icon
                v-else
                class="tab-status-dot pending"
              ><CircleClose /></el-icon>
            </span>
          </template>

          <el-collapse
            v-model="activeCollapse"
            class="basic-collapse"
          >
            <!-- 项目属性 -->
            <el-collapse-item
              title="项目属性"
              name="props"
            >
              <el-form
                ref="formRef"
                :model="form"
                :rules="formRules"
                label-width="100px"
                class="basic-form"
              >
                <el-row :gutter="20">
                  <el-col :span="12">
                    <el-form-item
                      label="项目名称"
                      prop="name"
                      required
                    >
                      <el-input
                        v-model="form.name"
                        placeholder="请输入项目名称"
                        maxlength="100"
                        show-word-limit
                      />
                    </el-form-item>
                  </el-col>
                  <el-col :span="12">
                    <el-form-item
                      label="JOB号"
                      prop="jobNo"
                      required
                    >
                      <el-input
                        v-model="form.jobNo"
                        placeholder="请输入JOB号（唯一标识）"
                        :class="{ 'input-error': jobNoUnique.hasError.value }"
                      />
                      <div
                        v-if="jobNoUnique.hasError.value"
                        class="field-error-text"
                      >
                        {{ jobNoUnique.error.value }}
                      </div>
                      <template #tip>
                        <span class="form-tip">JOB号是项目的唯一标识符，不可重复</span>
                      </template>
                    </el-form-item>
                  </el-col>
                </el-row>

                <el-row :gutter="20">
                  <el-col :span="12">
                    <el-form-item
                      label="项目状态"
                      prop="status"
                    >
                      <el-select
                        v-model="form.status"
                        placeholder="请选择项目状态"
                        style="width: 100%"
                        @change="handleStatusChange"
                      >
                        <el-option
                          label="进行中"
                          value="ongoing"
                        />
                        <el-option
                          label="已完成"
                          value="completed"
                        />
                        <el-option
                          label="已取消"
                          value="cancelled"
                        />
                        <el-option
                          label="已暂停"
                          value="paused"
                        />
                      </el-select>
                    </el-form-item>
                  </el-col>
                  <el-col :span="12">
                    <el-form-item label="项目类型">
                      <el-tooltip
                        content="项目类型用于分类和报表统计"
                        placement="top"
                      >
                        <el-select
                          v-model="form.projectTypeId"
                          placeholder="请选择项目类型"
                          clearable
                          style="width: 100%"
                        >
                          <el-option
                            v-for="pt in projectTypesStore.projectTypes"
                            :key="pt.id"
                            :label="pt.name"
                            :value="pt.id"
                          />
                        </el-select>
                      </el-tooltip>
                    </el-form-item>
                  </el-col>
                </el-row>

                <el-row :gutter="20">
                  <el-col :span="12">
                    <el-form-item
                      label="机型"
                      prop="equipmentId"
                      required
                    >
                      <el-tooltip
                        content="机型用于关联设备配置和BOM模块校核"
                        placement="top"
                      >
                        <el-select
                          v-model="form.equipmentId"
                          placeholder="请选择机型"
                          style="width: 100%"
                          @change="handleEquipmentChange"
                        >
                          <el-option
                            v-for="eq in activeEquipments"
                            :key="eq.id"
                            :label="`${eq.model} - ${eq.name}`"
                            :value="eq.id"
                          />
                        </el-select>
                      </el-tooltip>
                    </el-form-item>
                  </el-col>
                  <el-col :span="12">
                    <el-form-item label="序列号">
                      <div class="serial-display">
                        <template v-if="!form.equipmentId">
                          <span class="text-muted">请先选择机型</span>
                        </template>
                        <template v-else-if="assignedSerial">
                          <el-tag
                            type="success"
                            size="large"
                          >
                            {{ assignedSerial.serialNumber }}
                          </el-tag>
                        </template>
                        <template v-else>
                          <span class="text-muted">该设备尚未分配序列号给此项目</span>
                        </template>
                      </div>
                    </el-form-item>
                  </el-col>
                </el-row>

                <el-row :gutter="20">
                  <el-col :span="12">
                    <el-form-item label="交付日期">
                      <el-date-picker
                        v-model="form.deliveryDate"
                        type="date"
                        placeholder="选择交付日期"
                        value-format="YYYY-MM-DD"
                        style="width: 100%"
                      />
                    </el-form-item>
                  </el-col>
                </el-row>
              </el-form>
            </el-collapse-item>

            <!-- 客户信息 -->
            <el-collapse-item
              title="客户信息"
              name="customer"
            >
              <el-form
                :model="form"
                label-width="100px"
                class="basic-form"
              >
                <el-row :gutter="20">
                  <el-col :span="12">
                    <el-form-item label="客户名称">
                      <el-input
                        v-model="form.customer"
                        placeholder="请输入客户名称"
                      />
                    </el-form-item>
                  </el-col>
                  <el-col :span="12">
                    <el-form-item label="客户所在地">
                      <el-input
                        v-model="form.customerLocation"
                        placeholder="请输入客户所在地"
                      />
                    </el-form-item>
                  </el-col>
                </el-row>

                <!-- 客户需求动态行（整行） -->
                <el-form-item label="客户需求">
                  <div class="requirements-wrapper">
                    <div
                      v-for="(req, idx) in form.customerRequirements"
                      :key="req.id"
                      class="requirement-row"
                    >
                      <span class="req-index">{{ idx + 1 }}.</span>
                      <el-input
                        v-model="req.content"
                        placeholder="请输入客户需求内容"
                        maxlength="200"
                        show-word-limit
                      />
                      <el-button
                        type="danger"
                        link
                        class="req-delete-btn"
                        @click="removeRequirement(req.id)"
                      >
                        <el-icon><Delete /></el-icon>
                      </el-button>
                    </div>
                    <el-button
                      type="primary"
                      plain
                      size="small"
                      @click="addRequirement"
                    >
                      <el-icon><Plus /></el-icon>
                      添加需求
                    </el-button>
                  </div>
                </el-form-item>
              </el-form>
            </el-collapse-item>

            <!-- 关联信息 -->
            <el-collapse-item
              title="关联信息"
              name="related"
            >
              <el-form
                :model="form"
                label-width="100px"
                class="basic-form"
              >
                <el-form-item label="关联项目">
                  <el-select
                    v-model="form.relatedProjectIds"
                    multiple
                    filterable
                    placeholder="搜索并选择关联项目"
                    style="width: 100%"
                  >
                    <el-option
                      v-for="p in relatedProjectOptions"
                      :key="p.id"
                      :label="`${p.name} (${p.jobNo})`"
                      :value="p.id"
                    />
                  </el-select>
                </el-form-item>
              </el-form>
            </el-collapse-item>
          </el-collapse>
        </el-tab-pane>

        <!-- ========== Tab2: 配置与模块选择 ========== -->
        <el-tab-pane name="modules">
          <template #label>
            <span class="tab-label-with-status">
              模块配置
              <el-icon
                v-if="modulesComplete"
                class="tab-status-dot success"
              ><CircleCheckFilled /></el-icon>
              <el-icon
                v-else
                class="tab-status-dot pending"
              ><CircleClose /></el-icon>
            </span>
          </template>

          <template v-if="isNew">
            <EmptyState
              title="请先保存项目"
              description="在基本信息页填写并保存项目后，即可进行配置与模块选择"
              icon="Box"
            />
          </template>
          <template v-else>
            <!-- 未选择设备空状态 -->
            <EmptyState
              v-if="!form.equipmentId"
              title="请先选择机型"
              description="在基本信息中选择机型后，这里会显示该机型的配置列表"
              icon="WarningFilled"
              action-text="去选择机型"
              @action="activeTab = 'basic'"
            />

            <template v-else>
              <!-- 配置组合卡片 -->
              <div class="config-combination-section">
                <div class="section-header">
                  <span class="section-title">配置组合</span>
                  <el-button
                    type="primary"
                    size="small"
                    @click="addConfigCombination"
                  >
                    <el-icon><Plus /></el-icon>
                    添加配置组合
                  </el-button>
                </div>

                <div
                  v-if="localConfigCombinations.length > 0"
                  class="config-cards"
                >
                  <div
                    v-for="(combo, idx) in localConfigCombinations"
                    :key="combo.id"
                    class="config-card"
                  >
                    <div class="config-card-header">
                      <span class="config-card-index">#{{ idx + 1 }}</span>
                      <el-button
                        type="danger"
                        link
                        size="small"
                        @click="removeConfigCombination(idx)"
                      >
                        <el-icon><Delete /></el-icon>
                      </el-button>
                    </div>
                    <div class="config-card-body">
                      <el-select
                        v-model="combo.configurationId"
                        placeholder="请选择配置"
                        style="width: 100%"
                        @change="handleConfigCombinationChange(combo)"
                      >
                        <el-option-group
                          v-for="group in groupedConfigOptions"
                          :key="group.groupId || 'ungrouped'"
                          :label="group.groupName"
                        >
                          <el-option
                            v-for="cfg in group.configs"
                            :key="cfg.id"
                            :label="cfg.name"
                            :value="cfg.id"
                          >
                            <span>{{ cfg.name }}</span>
                            <span style="float: right; color: #8492a6; font-size: 12px">{{ cfg.description }}</span>
                          </el-option>
                        </el-option-group>
                      </el-select>
                      <div class="config-card-meta">
                        <div class="config-card-meta-item">
                          <span class="meta-label">数量</span>
                          <el-input-number
                            v-model="combo.quantity"
                            :min="1"
                            :max="999"
                            size="small"
                          />
                        </div>
                        <div class="config-card-meta-item">
                          <span class="meta-label">关联模块</span>
                          <el-tag
                            size="small"
                            type="info"
                          >
                            {{ getConfigModuleCount(combo.configurationId) }}
                          </el-tag>
                        </div>
                      </div>
                      <el-input
                        v-model="combo.remark"
                        placeholder="备注（可选）"
                        size="small"
                        class="config-card-remark"
                      />
                    </div>
                  </div>
                </div>
                <div
                  v-else
                  class="empty-tip"
                >
                  暂无配置组合，请点击上方"添加配置组合"按钮添加
                </div>
              </div>

              <!-- 模块选择 -->
              <template v-if="configModules.length > 0">
                <div class="module-info-bar">
                  <el-alert
                    :title="`已选 ${checkedModuleCount} 个组件，预计生成 ${previewBomCount} 条下单BOM条目`"
                    type="info"
                    :closable="false"
                    show-icon
                  />
                </div>

                <div class="module-toolbar">
                  <el-input
                    v-model="moduleSearchKeyword"
                    placeholder="搜索图号/组件名称..."
                    clearable
                    :prefix-icon="Search"
                    style="width: 240px"
                  />
                  <div class="module-toolbar-actions">
                    <el-button
                      type="primary"
                      @click="handleApplyModules"
                    >
                      <el-icon><Check /></el-icon>
                      应用选择
                    </el-button>
                    <el-button @click="handleSelectAllModules">
                      全选
                    </el-button>
                    <el-button @click="handleClearAllModules">
                      清空选择
                    </el-button>
                  </div>
                </div>

                <el-table
                  :data="filteredLocalSelectedModules"
                  stripe
                  style="width: 100%"
                  class="module-table"
                >
                  <el-table-column
                    width="50"
                    align="center"
                  >
                    <template #default="{ row }">
                      <el-checkbox
                        v-model="row.checked"
                        :disabled="isChildOfSelectedParent(row.moduleId)"
                        @change="handleModuleCheckChange(row)"
                      />
                    </template>
                  </el-table-column>
                  <el-table-column
                    label="图号"
                    width="200"
                  >
                    <template #default="{ row }">
                      <span
                        :style="{ paddingLeft: row.depth * 20 + 'px' }"
                        class="module-tree-cell"
                      >
                        <span
                          v-if="projectTreeHasChildren(row.moduleId)"
                          class="tree-toggle"
                          @click.stop="projectTreeToggleCollapse(row.moduleId)"
                        >
                          {{ projectTreeIsCollapsed(row.moduleId) ? '▶' : '▼' }}
                        </span>
                        <span
                          v-else
                          class="tree-toggle-placeholder"
                        />
                        <span
                          v-if="row.depth > 0"
                          style="color: #c0c4cc;"
                        >└ </span>
                        {{ row.drawingNo }}
                      </span>
                    </template>
                  </el-table-column>
                  <el-table-column
                    prop="nameZh"
                    label="组件名称"
                    min-width="160"
                    show-overflow-tooltip
                  />
                  <el-table-column
                    label="BOM下单条目数"
                    width="130"
                    align="center"
                  >
                    <template #default="{ row }">
                      <el-tag
                        size="small"
                        type="success"
                      >
                        {{ getModuleOrderItemCount(row.moduleId) }}
                      </el-tag>
                    </template>
                  </el-table-column>
                  <el-table-column
                    label="数量"
                    width="120"
                    align="center"
                  >
                    <template #default="{ row }">
                      <el-input-number
                        v-model="row.quantity"
                        :min="1"
                        :max="999"
                        size="small"
                        class="module-qty-input"
                      />
                    </template>
                  </el-table-column>
                  <el-table-column
                    label="操作"
                    width="80"
                    align="center"
                  >
                    <template #default="{ row }">
                      <el-button
                        type="primary"
                        link
                        size="small"
                        :disabled="isChildOfSelectedParent(row.moduleId)"
                        @click="handleToggleModule(row)"
                      >
                        {{ row.checked ? '取消' : '选择' }}
                      </el-button>
                    </template>
                  </el-table-column>
                </el-table>
              </template>
              <EmptyState
                v-else-if="localConfigCombinations.some(c => c.configurationId)"
                title="该配置下暂无组件"
                description="请检查配置是否正确关联了组件"
                icon="Box"
              />
              <EmptyState
                v-else
                title="请先添加配置组合"
                description="添加配置组合并选择配置后，这里会显示可选组件"
                icon="Box"
              />
            </template>
          </template>
        </el-tab-pane>

        <!-- ========== Tab3: 下单BOM ========== -->
        <el-tab-pane name="orderBom">
          <template #label>
            <span class="tab-label-with-status">
              下单BOM
              <span
                v-if="orderBomCount > 0"
                class="tab-count"
              >({{ orderBomCount }})</span>
              <el-icon
                v-if="orderBomCount > 0"
                class="tab-status-dot success"
              ><CircleCheckFilled /></el-icon>
              <el-icon
                v-else
                class="tab-status-dot pending"
              ><CircleClose /></el-icon>
            </span>
          </template>

          <template v-if="isNew">
            <EmptyState
              title="请先保存项目"
              description="在基本信息页填写并保存项目后，即可生成和管理下单BOM"
              icon="Box"
            />
          </template>
          <template v-else>
            <!-- BOM 操作工具栏 -->
            <div class="bom-action-bar">
              <el-button
                type="primary"
                :loading="generatingBom"
                @click="handleGenerateBom"
              >
                <el-icon><MagicStick /></el-icon>
                重新生成BOM
              </el-button>
              <el-button
                type="success"
                plain
                :disabled="isNew"
                @click="openOrderBomAddDialog"
              >
                <el-icon><Plus /></el-icon>
                手动添加条目
              </el-button>
              <el-button
                type="success"
                :disabled="orderBomCount === 0"
                @click="handleExportBom"
              >
                <el-icon><Download /></el-icon>
                导出BOM
              </el-button>
              <el-button
                :disabled="orderBomCount === 0"
                @click="openProjectPrint"
              >
                <el-icon><Printer /></el-icon>
                打印BOM
              </el-button>
              <el-button
                type="warning"
                plain
                :disabled="orderBomCount === 0"
                @click="openCreateVersionDialog"
              >
                <el-icon><Clock /></el-icon>
                创建版本快照
              </el-button>
              <div class="bom-stats-inline">
                <el-tag
                  size="small"
                  type="success"
                >
                  生成 {{ bomStats.generated }}
                </el-tag>
                <el-tag
                  size="small"
                  type="warning"
                >
                  手动 {{ bomStats.manual }}
                </el-tag>
                <el-tag
                  size="small"
                  type="danger"
                >
                  修改 {{ bomStats.modified }}
                </el-tag>
                <el-tag
                  size="small"
                  type="info"
                >
                  共 {{ orderBomCount }} 条
                </el-tag>
                <el-tag
                  size="small"
                  type="primary"
                >
                  总数量 {{ bomStats.totalQty }}
                </el-tag>
              </div>
            </div>

            <!-- BOM 生成进度（Web Worker 独立线程计算） -->
            <div
              v-if="generatingBom"
              class="bom-gen-progress"
            >
              <el-progress
                :percentage="bomGenProgress"
                :stroke-width="10"
                :text-inside="true"
              />
              <span class="bom-gen-progress-text">正在后台线程生成 BOM，主线程保持响应…</span>
            </div>

            <!-- BOM 统计摘要卡片 -->
            <div
              v-if="orderBomCount > 0"
              class="bom-summary-cards"
            >
              <div class="summary-card">
                <div class="summary-label">
                  BOM总条目
                </div>
                <div class="summary-value">
                  {{ bomStats.total }}
                </div>
              </div>
              <div class="summary-card">
                <div class="summary-label">
                  总数量
                </div>
                <div class="summary-value">
                  {{ bomStats.totalQty }}
                </div>
              </div>
              <div class="summary-card">
                <div class="summary-label">
                  来源模块数
                </div>
                <div class="summary-value">
                  {{ bomSourceDist.length }}
                </div>
              </div>
              <div
                v-if="bomSourceDist.length > 0"
                class="summary-card summary-source"
              >
                <div class="summary-label">
                  来源模块分布
                </div>
                <div class="summary-source-list">
                  <el-tag
                    v-for="s in bomSourceDist.slice(0, 6)"
                    :key="s.name"
                    size="small"
                    type="info"
                    effect="plain"
                  >
                    {{ s.name }}: {{ s.count }}
                  </el-tag>
                </div>
              </div>
            </div>

            <!-- BomTable 核心组件 -->
            <BomTable
              ref="bomTableRef"
              :items="bomTableItems"
              :editable="true"
              :show-summary="true"
              :show-source-modules="true"
              :storage-key="`project_order_bom_${projectId}`"
              :readonly-part-fields="true"
              :hide-add-button="true"
              @update:items="handleBomItemsUpdate"
              @selection-change="handleBomSelectionChange"
              @row-click="handleBomRowClick"
            />

            <!-- 空状态 -->
            <EmptyState
              v-if="orderBomCount === 0"
              title="暂无下单BOM数据"
              description="点击上方「重新生成BOM」按钮，根据已选模块自动生成下单BOM"
              icon="Box"
              action-text="去配置模块"
              @action="activeTab = 'modules'"
            />

            <!-- ===== BOM 版本管理区域 ===== -->
            <div
              v-if="bomVersions.length > 0"
              class="project-version-section"
            >
              <el-divider content-position="left">
                BOM 版本管理（{{ bomVersions.length }}）
              </el-divider>
              <BomVersionPanel
                :versions="bomVersions"
                :show-created-by="false"
                @rollback="handleRollbackToVersion"
                @delete="deleteVersion"
              />
            </div>
          </template>
        </el-tab-pane>

        <!-- ========== Tab4: 变更历史 ========== -->
        <el-tab-pane name="history">
          <template #label>
            <span class="tab-label-with-status">变更历史</span>
          </template>
          <ChangeHistoryList
            :records="changeHistoryList"
            show-rollback
            @rollback="handleRollbackHistory"
          />
        </el-tab-pane>
      </el-tabs>
    </div>

    <!-- ===== 底部固定操作栏 ===== -->
    <div class="bottom-action-bar">
      <div class="bottom-bar-left">
        <el-button @click="handleBack">
          <el-icon><ArrowLeft /></el-icon>
          返回
        </el-button>
      </div>
      <div class="bottom-bar-right">
        <el-button
          :disabled="!canUndo"
          title="Ctrl+Z"
          @click="handleUndo"
        >
          <el-icon><RefreshLeft /></el-icon>
          撤销
        </el-button>
        <el-button
          :disabled="!canRedo"
          title="Ctrl+Y"
          @click="handleRedo"
        >
          <el-icon><RefreshRight /></el-icon>
          重做
        </el-button>
        <el-button
          type="primary"
          :loading="saving || autoSaveSaving"
          :disabled="!autoSaveDirty && !isNew"
          @click="handleSave"
        >
          <el-icon><Check /></el-icon>
          保存
        </el-button>
      </div>
    </div>

    <!-- ===== 批量操作栏 ===== -->
    <BatchActionBar
      :visible="selectedBomRows.length > 0"
      :selected-count="selectedBomRows.length"
      :total-count="orderBomCount"
      :actions="batchActions"
      @action="handleBatchAction"
      @clear="clearBomSelection"
    />

    <!-- ===== 批量修改数量弹窗 ===== -->
    <el-dialog
      v-model="batchQtyDialogVisible"
      title="批量修改数量"
      width="420px"
      :close-on-click-modal="false"
    >
      <el-form label-width="80px">
        <el-form-item label="修改方式">
          <el-radio-group v-model="batchQtyMode">
            <el-radio value="multiply">
              乘以倍数
            </el-radio>
            <el-radio value="set">
              设为固定值
            </el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item :label="batchQtyMode === 'multiply' ? '倍数' : '数量'">
          <el-input-number
            v-model="batchQtyValue"
            :min="batchQtyMode === 'multiply' ? 0.1 : 0"
            :max="9999"
            :precision="batchQtyMode === 'multiply' ? 2 : 0"
            :step="batchQtyMode === 'multiply' ? 0.5 : 1"
            style="width: 200px"
          />
        </el-form-item>
        <el-form-item label="影响范围">
          <el-tag size="small">
            已选 {{ selectedBomRows.length }} 行
          </el-tag>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="batchQtyDialogVisible = false">
          取消
        </el-button>
        <el-button
          type="primary"
          @click="confirmBatchQty"
        >
          确定
        </el-button>
      </template>
    </el-dialog>

    <!-- ===== 导出对话框（公共组件） ===== -->
    <BomExportDialog
      v-model:visible="exportDialogVisible"
      title="导出下单BOM"
      :fields="exportColumnOptions"
      :default-selected="defaultExportHeaders"
      storage-key="project_export_order_fields"
      :default-file-name="exportDefaultFileName"
      :selected-count="selectedBomRows.length"
      :exporting="exporting"
      @export="confirmExport"
    />


    <!-- ===== 手动添加下单BOM条目对话框 ===== -->
    <el-dialog
      v-model="orderAddDialogVisible"
      title="手动添加下单BOM条目"
      width="680px"
      @closed="resetOrderAddForm"
    >
      <div class="bom-select-mode">
        <el-radio-group v-model="orderSelectMode">
          <el-radio value="library">
            从零件库选择
          </el-radio>
          <el-radio value="direct">
            直接输入参数
          </el-radio>
        </el-radio-group>
      </div>

      <!-- 从零件库选择 -->
      <PartPickerSelect
        v-if="orderSelectMode === 'library'"
        ref="orderPartPickerRef"
        v-model="orderSelectedPartId"
        @pick="onPickPartForOrder"
      />

      <el-form
        ref="orderAddFormRef"
        :model="orderAddForm"
        label-width="110px"
      >
        <el-form-item label="图号">
          <span
            v-if="orderIsPartParamReadonly('drawingNo')"
            class="readonly-field-text"
          >{{ orderAddForm.drawingNo || '—' }}</span>
          <el-input
            v-else
            v-model="orderAddForm.drawingNo"
            placeholder="请输入图号"
          />
        </el-form-item>
        <el-form-item label="中文描述">
          <span
            v-if="orderIsPartParamReadonly('chineseDescription')"
            class="readonly-field-text"
          >{{ orderAddForm.chineseDescription || '—' }}</span>
          <el-input
            v-else
            v-model="orderAddForm.chineseDescription"
            placeholder="请输入中文描述"
          />
        </el-form-item>
        <el-form-item label="英文描述">
          <span
            v-if="orderIsPartParamReadonly('englishDescription')"
            class="readonly-field-text"
          >{{ orderAddForm.englishDescription || '—' }}</span>
          <el-input
            v-else
            v-model="orderAddForm.englishDescription"
            placeholder="请输入英文描述"
          />
        </el-form-item>
        <el-form-item label="物料/目录号">
          <span
            v-if="orderIsPartParamReadonly('materialCatalogNo')"
            class="readonly-field-text"
          >{{ orderAddForm.materialCatalogNo || '—' }}</span>
          <el-input
            v-else
            v-model="orderAddForm.materialCatalogNo"
            placeholder="请输入物料/目录号"
          />
        </el-form-item>
        <el-form-item label="装配单位">
          <span
            v-if="orderIsPartParamReadonly('assemblyUnit')"
            class="readonly-field-text"
          >{{ orderAddForm.assemblyUnit || '—' }}</span>
          <el-input
            v-else
            v-model="orderAddForm.assemblyUnit"
            placeholder="如 PCS / SET"
          />
        </el-form-item>
        <el-form-item
          label="数量"
          required
        >
          <el-input-number
            v-model="orderAddForm.quantity"
            :min="0"
            :precision="2"
            :step="1"
            style="width: 60%"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="orderAddDialogVisible = false">
          取消
        </el-button>
        <el-button
          type="primary"
          @click="handleConfirmOrderAdd"
        >
          确定添加
        </el-button>
      </template>
    </el-dialog>

    <!-- ===== 下单BOM条目零件数据冲突确认对话框 ===== -->
    <el-dialog
      v-model="orderPartConflictDialogVisible"
      title="零件数据冲突确认"
      width="720px"
      :close-on-click-modal="false"
    >
      <div class="conflict-intro">
        <el-alert
          type="warning"
          :closable="false"
          title="检测到同图号零件与零件库已有数据不一致，请选择处理方式"
        />
      </div>

      <div class="conflict-list">
        <div
          v-for="(conflict, idx) in orderPartConflicts"
          :key="conflict.drawingNo"
          class="conflict-item"
        >
          <div class="conflict-header">
            <span class="conflict-index">{{ idx + 1 }}.</span>
            <span class="conflict-drawing-no">{{ conflict.drawingNo }}</span>
            <span
              v-if="conflict.diffs.length > 0"
              class="conflict-diff-count"
            >{{ conflict.diffs.length }} 个字段不一致</span>
            <span
              v-else
              class="conflict-diff-count"
              style="background: #f0f9eb; color: #67c23a"
            >数据完全一致</span>
            <div class="conflict-action-select">
              <el-radio-group
                v-model="conflict.action"
                size="small"
              >
                <el-radio value="keep">
                  保留库里参数（数量用新的）
                </el-radio>
                <el-radio value="overwrite">
                  全部用新数据覆盖
                </el-radio>
              </el-radio-group>
            </div>
          </div>
          <div
            v-if="conflict.diffs.length > 0"
            class="conflict-diff-table"
          >
            <el-table
              :data="conflict.diffs"
              size="small"
              border
            >
              <el-table-column
                prop="label"
                label="字段"
                width="140"
              />
              <el-table-column
                label="零件库中值"
                min-width="180"
              >
                <template #default="{ row }">
                  <span class="old-value">{{ row.oldValue !== undefined && row.oldValue !== null && row.oldValue !== '' ? row.oldValue : '(空)' }}</span>
                </template>
              </el-table-column>
              <el-table-column
                label="新输入值"
                min-width="180"
              >
                <template #default="{ row }">
                  <span class="new-value">{{ row.newValue !== undefined && row.newValue !== null && row.newValue !== '' ? row.newValue : '(空)' }}</span>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </div>
      </div>

      <template #footer>
        <el-button @click="orderPartConflictDialogVisible = false">
          取消
        </el-button>
        <el-button
          type="primary"
          @click="applyOrderPartConflictResolution"
        >
          确认并添加
        </el-button>
      </template>
    </el-dialog>

    <!-- ===== 打印预览对话框 ===== -->
    <PrintPreviewDialog
      ref="printDialogRef"
      :title="`项目 ${form.name} (${form.jobNo})`"
    >
      <!-- 基本信息 -->
      <div class="print-section">
        <div class="print-section-title">
          项目基本信息
        </div>
        <table class="print-info-table">
          <tr>
            <td class="label">
              项目名称
            </td><td>{{ form.name }}</td>
          </tr>
          <tr>
            <td class="label">
              JOB号
            </td><td>{{ form.jobNo }}</td>
          </tr>
          <tr>
            <td class="label">
              项目状态
            </td><td>{{ statusLabel(form.status) }}</td>
          </tr>
          <tr>
            <td class="label">
              客户名称
            </td><td>{{ form.customer || '-' }}</td>
          </tr>
          <tr>
            <td class="label">
              客户所在地
            </td><td>{{ form.customerLocation || '-' }}</td>
          </tr>
          <tr>
            <td class="label">
              机型
            </td><td>{{ form.equipmentModel || '-' }}</td>
          </tr>
          <tr>
            <td class="label">
              交付日期
            </td><td>{{ form.deliveryDate || '未设置' }}</td>
          </tr>
        </table>
      </div>

      <!-- 组件选择 -->
      <div
        v-if="localSelectedModules.length > 0"
        class="print-section"
      >
        <div class="print-section-title">
          组件选择（共 {{ localSelectedModules.filter(m => m.checked).length }} 个）
        </div>
        <table class="print-table">
          <thead>
            <tr>
              <th style="width:40px">
                #
              </th><th>组件图号</th><th>组件名称</th><th style="width:60px">
                数量
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(m, idx) in localSelectedModules.filter(x => x.checked)"
              :key="m.moduleId"
            >
              <td>{{ idx + 1 }}</td>
              <td>{{ m.drawingNo }}</td>
              <td>{{ m.nameZh }}</td>
              <td>{{ m.quantity }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 下单BOM -->
      <div
        v-if="orderBomItems.length > 0"
        class="print-section"
      >
        <div class="print-section-title">
          下单BOM（共 {{ orderBomItems.length }} 条）
        </div>
        <BomPrintTable
          :rows="orderBomItems"
          :columns="printColumns"
          template-type="order"
          :show-source-modules="true"
        />
      </div>
    </PrintPreviewDialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch, nextTick } from 'vue'
import { useRoute, useRouter, onBeforeRouteLeave } from 'vue-router'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import {
  ArrowLeft,
  Check,
  Plus,
  Delete,
  MagicStick,
  Download,
  Search,
  CircleCheckFilled,
  CircleClose,
  RefreshLeft,
  RefreshRight,
  Printer,
  Clock
} from '@element-plus/icons-vue'
import dayjs from 'dayjs'
import { useProjectsStore } from '@/stores/projects'
import { useEquipmentStore } from '@/stores/equipment'
import { useModulesStore } from '@/stores/modules'
import { useProjectTypesStore } from '@/stores/projectTypes'
import { useBomTemplatesStore } from '@/stores/bomTemplates'
import { generateOrderBom } from '@/utils/bomGenerator'
import { getDescendantModuleIds } from '@/utils/moduleGraph'
import { exportToExcel, isElectronEnvironment } from '@/utils/excel'
import { generateId } from '@/utils/storage'
import BomTable, { type BomTableRow } from '@/components/common/BomTable.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import ChangeHistoryList from '@/components/common/ChangeHistoryList.vue'
import BatchActionBar, { type BatchAction } from '@/components/common/BatchActionBar.vue'
import PrintPreviewDialog from '@/components/common/PrintPreviewDialog.vue'
import BomPrintTable from '@/components/common/BomPrintTable.vue'
import BomVersionPanel from '@/components/common/BomVersionPanel.vue'
import BomExportDialog, { type BomExportConfig } from '@/components/common/BomExportDialog.vue'
import PartPickerSelect from '@/components/common/PartPickerSelect.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import { useKeyboardShortcuts } from '@/composables/useKeyboardShortcuts'
import { useAutoSave } from '@/composables/useAutoSave'
import { useUndoRedo } from '@/composables/useUndoRedo'
import { useTabSync } from '@/composables/useTabSync'
import { useUniqueValidation } from '@/composables/useUniqueValidation'
import { useBomGeneratorWorker } from '@/composables/useBomGeneratorWorker'
import type {
  Project,
  OrderBomItem,
  CustomerRequirement,
  SelectedModule,
  Module,
  BomItem,
  BomTemplateField,
  ChangeRecord,
  BomVersion,
  Part,
  EquipmentConfiguration
} from '@/types'
import { useBomVersionsStore } from '@/stores/bomVersions'
import { usePartsStore, type PartConflict } from '@/stores/parts'
import { db } from '@/db/index'
import { notifyDbError } from '@/utils/dbErrorHandler'

// ==================== 基础设置 ====================
const route = useRoute()
const router = useRouter()
const projectsStore = useProjectsStore()
const equipmentStore = useEquipmentStore()
const modulesStore = useModulesStore()
const projectTypesStore = useProjectTypesStore()
const bomTemplatesStore = useBomTemplatesStore()
const bomVersionsStore = useBomVersionsStore()
const partsStore = usePartsStore()
const visibleFields = computed(() => bomTemplatesStore.getVisibleFieldsByType('order'))

const projectId = computed(() => (route.params.id as string) || '')
const isNew = computed(() => route.name === 'ProjectNew' || projectId.value === 'new')

const activeTab = ref('basic')
const saving = ref(false)
const generatingBom = ref(false)
// 防止离开确认弹窗重复弹出
const isLeaving = ref(false)
// BOM 生成 Worker：独立线程计算，主线程不阻塞
const { generate: generateOrderBomInWorker, progress: bomGenProgress } = useBomGeneratorWorker()
const exporting = ref(false)
const activeCollapse = ref<string[]>(['props', 'customer', 'related'])

// ==================== 当前项目 ====================
const project = computed<Project | undefined>(() => {
  if (isNew.value) return undefined
  return projectsStore.getProjectById(projectId.value)
})

// ==================== Tab1: 基本信息表单 ====================
const formRef = ref<FormInstance>()

interface ProjectForm {
  name: string
  jobNo: string
  customer: string
  customerLocation: string
  status: Project['status']
  equipmentId: string
  equipmentModel: string
  projectTypeId: string
  relatedProjectIds: string[]
  customerRequirements: CustomerRequirement[]
  deliveryDate: string
}

function createDefaultForm(): ProjectForm {
  return {
    name: '',
    jobNo: '',
    customer: '',
    customerLocation: '',
    status: 'ongoing',
    equipmentId: '',
    equipmentModel: '',
    projectTypeId: '',
    relatedProjectIds: [],
    customerRequirements: [],
    deliveryDate: ''
  }
}

const form = reactive<ProjectForm>(createDefaultForm())

const formRules: FormRules = {
  name: [{ required: true, message: '请输入项目名称', trigger: 'blur' }],
  jobNo: [
    { required: true, message: '请输入JOB号', trigger: 'blur' },
    {
      validator: (_rule, value, callback) => {
        if (!value) {
          callback()
          return
        }
        if (!projectsStore.isJobNoUnique(value, isNew.value ? undefined : projectId.value)) {
          callback(new Error('JOB号已存在，请输入唯一的JOB号'))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ],
  status: [{ required: true, message: '请选择项目状态', trigger: 'change' }],
  equipmentId: [{ required: true, message: '请选择机型', trigger: 'change' }]
}

const activeEquipments = computed(() =>
  equipmentStore.equipments.filter((eq) => eq.status === 'active')
)

const assignedSerial = computed(() => {
  if (!form.equipmentId || isNew.value) return undefined
  return equipmentStore.getAssignedSerialByProject(form.equipmentId, projectId.value)
})

const relatedProjectOptions = computed(() => {
  return projectsStore.projects.filter((p) => p.id !== projectId.value)
})

function handleEquipmentChange() {
  if (form.equipmentId) {
    const eq = equipmentStore.getEquipmentById(form.equipmentId)
    if (eq) {
      form.equipmentModel = eq.model
    }
  } else {
    form.equipmentModel = ''
  }
  commitUndo()
}

async function handleStatusChange(newStatus: Project['status']) {
  if (newStatus === 'cancelled') {
    try {
      await ElMessageBox.confirm(
        '确定要取消该项目吗？取消后项目将标记为已取消状态。',
        '取消项目确认',
        { type: 'warning', confirmButtonText: '确定取消', cancelButtonText: '再想想' }
      )
    } catch {
      // 用户取消，恢复原状态
      if (project.value) {
        form.status = project.value.status
      }
      return
    }
  }
  commitUndo()
}

function addRequirement() {
  form.customerRequirements.push({ id: generateId('cr'), content: '' })
  commitUndo()
}

function removeRequirement(id: string) {
  form.customerRequirements = form.customerRequirements.filter((r) => r.id !== id)
  commitUndo()
}

function statusTagType(status: Project['status']) {
  const map: Record<Project['status'], 'primary' | 'success' | 'info' | 'warning'> = {
    ongoing: 'primary',
    completed: 'success',
    cancelled: 'info',
    paused: 'warning'
  }
  return map[status]
}

function statusLabel(status: Project['status']) {
  const map: Record<Project['status'], string> = {
    ongoing: '进行中',
    completed: '已完成',
    cancelled: '已取消',
    paused: '已暂停'
  }
  return map[status]
}

// ==================== Tab2: 配置与模块选择 ====================
const localConfigId = ref('')

interface LocalConfigCombination {
  id: string
  configurationId: string
  quantity: number
  remark?: string
}
const localConfigCombinations = ref<LocalConfigCombination[]>([])

function addConfigCombination() {
  localConfigCombinations.value.push({
    id: generateId('cc'),
    configurationId: '',
    quantity: 1,
    remark: ''
  })
  commitUndo()
}

function removeConfigCombination(index: number) {
  localConfigCombinations.value.splice(index, 1)
  handleConfigCombinationChange()
  commitUndo()
}

function handleConfigCombinationChange(_row?: LocalConfigCombination) {
  handleConfigChange()
}

function getConfigModuleCount(configurationId: string): number {
  if (!configurationId) return 0
  const cfg = equipmentStore.getConfigurationById(configurationId)
  return cfg?.moduleIds.length || 0
}

interface LocalSelectedModule extends SelectedModule {
  checked: boolean
  drawingNo: string
  nameZh: string
  depth: number
  parentModuleIds: string[]
  configQuantities: Map<string, number>
}

const localSelectedModules = ref<LocalSelectedModule[]>([])
const moduleSearchKeyword = ref('')

const collapsedModuleIds = ref<Set<string>>(new Set())

function projectTreeHasChildren(moduleId: string): boolean {
  return localSelectedModules.value.some((m) => m.parentModuleIds.includes(moduleId))
}

function projectTreeIsCollapsed(moduleId: string): boolean {
  return collapsedModuleIds.value.has(moduleId)
}

function projectTreeToggleCollapse(moduleId: string) {
  if (collapsedModuleIds.value.has(moduleId)) {
    collapsedModuleIds.value.delete(moduleId)
  } else {
    collapsedModuleIds.value.add(moduleId)
  }
  collapsedModuleIds.value = new Set(collapsedModuleIds.value)
}

const filteredLocalSelectedModules = computed(() => {
  const hidden = new Set<string>()
  const visited = new Set<string>() // 防止循环引用导致无限递归
  function collectDescendants(moduleId: string) {
    if (visited.has(moduleId)) return // 已访问过，防止循环引用
    visited.add(moduleId)
    const children = localSelectedModules.value.filter((m) => m.parentModuleIds.includes(moduleId))
    for (const child of children) {
      hidden.add(child.moduleId)
      collectDescendants(child.moduleId)
    }
  }
  for (const moduleId of collapsedModuleIds.value) {
    collectDescendants(moduleId)
  }
  let result = localSelectedModules.value.filter((m) => !hidden.has(m.moduleId))
  const kw = moduleSearchKeyword.value.trim().toLowerCase()
  if (kw) {
    result = result.filter(
      (m) =>
        m.drawingNo.toLowerCase().includes(kw) ||
        m.nameZh.toLowerCase().includes(kw)
    )
  }
  return result
})

const moduleBomCache = ref<Map<string, BomItem[]>>(new Map())

async function ensureModuleBom(moduleId: string): Promise<BomItem[]> {
  if (moduleBomCache.value.has(moduleId)) {
    return moduleBomCache.value.get(moduleId)!
  }
  const items = await modulesStore.getBomItems(moduleId)
  moduleBomCache.value.set(moduleId, items)
  return items
}

async function ensureModulesBom(moduleIds: string[]): Promise<void> {
  // 收集根模块及其所有后代模块ID（统一图遍历）
  const allModuleIds = new Set<string>(moduleIds)
  for (const id of moduleIds) {
    for (const descId of getDescendantModuleIds(id, modulesStore.modules)) {
      allModuleIds.add(descId)
    }
  }
  const missing = [...allModuleIds].filter((id) => !moduleBomCache.value.has(id))
  if (missing.length === 0) return
  const results = await Promise.all(
    missing.map(async (id) => ({ id, items: await modulesStore.getBomItems(id) }))
  )
  results.forEach((r) => moduleBomCache.value.set(r.id, r.items))
}

function buildModulesWithBom(moduleIds: string[]): Module[] {
  // 收集根模块及其所有后代模块ID（统一图遍历）
  const allModuleIds = new Set<string>(moduleIds)
  for (const id of moduleIds) {
    for (const descId of getDescendantModuleIds(id, modulesStore.modules)) {
      allModuleIds.add(descId)
    }
  }
  return [...allModuleIds]
    .map((id) => {
      const mod = modulesStore.getModuleById(id)
      if (!mod) return null
      const items = moduleBomCache.value.get(id) || []
      return { ...mod, bom: { moduleId: id, items } } as Module
    })
    .filter((m): m is Module => m !== null)
}

function getModuleOrderItemCount(moduleId: string): number {
  const items = moduleBomCache.value.get(moduleId)
  if (!items) return 0
  return items.filter((i) => i.type === 'order' || i.type === 'both').length
}

const configOptions = computed(() => {
  if (!form.equipmentId) return []
  return equipmentStore.getConfigurationsByEquipment(form.equipmentId)
})

/**
 * 按分组组织的配置选项：
 * 返回 [{ groupId, groupName, configs }]，未分组的配置作为"未分组"组放在最后
 */
const groupedConfigOptions = computed(() => {
  if (!form.equipmentId) return []
  const allCfgs = equipmentStore.getConfigurationsByEquipment(form.equipmentId)
  const groups = equipmentStore.getConfigurationGroups(form.equipmentId)
  const result: { groupId: string | null; groupName: string; configs: EquipmentConfiguration[] }[] = []
  // 按已分组顺序添加
  for (const g of groups) {
    const configs = allCfgs.filter((c) => c.groupId === g.id)
    if (configs.length > 0) {
      result.push({ groupId: g.id, groupName: g.name, configs })
    }
  }
  // 未分组的放在最后
  const ungrouped = allCfgs.filter((c) => !c.groupId)
  if (ungrouped.length > 0) {
    result.push({ groupId: null, groupName: '未分组', configs: ungrouped })
  }
  return result
})

const configModules = computed<Module[]>(() => {
  const validCombinations = localConfigCombinations.value.filter((c) => c.configurationId)
  if (validCombinations.length === 0) return []
  const moduleIdSet = new Set<string>()
  for (const combo of validCombinations) {
    const cfg = equipmentStore.getConfigurationById(combo.configurationId)
    if (cfg) {
      for (const id of cfg.moduleIds) {
        moduleIdSet.add(id)
      }
    }
  }
  return [...moduleIdSet]
    .map((id) => modulesStore.getModuleById(id))
    .filter((m): m is Module => m !== undefined)
})

const moduleConfigQuantityMap = computed<Map<string, number>>(() => {
  const map = new Map<string, number>()
  for (const combo of localConfigCombinations.value) {
    if (!combo.configurationId) continue
    const cfg = equipmentStore.getConfigurationById(combo.configurationId)
    if (!cfg) continue
    for (const moduleId of cfg.moduleIds) {
      const current = map.get(moduleId) || 0
      map.set(moduleId, current + combo.quantity)
    }
  }
  return map
})

const configModuleDepthMap = computed<Map<string, number>>(() => {
  const modules = configModules.value
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

const sortedConfigModules = computed<Module[]>(() => {
  const modules = configModules.value
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
      if (moduleMap.has(childId)) {
        traverse(childId)
      }
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

const checkedModuleCount = computed(() => {
  return localSelectedModules.value.filter((m) => m.checked).length
})

const previewBomCount = ref(0)

async function updatePreviewBomCount() {
  const selected = localSelectedModules.value
    .filter((m) => m.checked)
    .map((m) => ({ moduleId: m.moduleId, quantity: m.quantity }))
  if (selected.length === 0) {
    previewBomCount.value = 0
    return
  }
  const moduleIds = [...new Set(selected.map((s) => s.moduleId))]
  await ensureModulesBom(moduleIds)
  // 从缓存构建 moduleId -> BOM条目 映射，bomGenerator 不再依赖 mod.bom
  const bomItemsMap = new Map<string, BomItem[]>()
  for (const [mid, items] of moduleBomCache.value) {
    bomItemsMap.set(mid, items)
  }
  previewBomCount.value = generateOrderBom(selected, modulesStore.modules, bomItemsMap, project.value?.jobNo).items.length
}

watch(
  localSelectedModules,
  () => {
    updatePreviewBomCount()
  },
  { deep: true }
)

function getAllChildModuleIds(moduleId: string): string[] {
  return getDescendantModuleIds(moduleId, modulesStore.modules)
}

function isChildOfSelectedParent(moduleId: string, visited: Set<string> = new Set()): boolean {
  if (visited.has(moduleId)) return false
  visited.add(moduleId)
  const mod = modulesStore.getModuleById(moduleId)
  if (!mod || !mod.parentModuleIds || mod.parentModuleIds.length === 0) return false
  // 遍历所有父模块
  for (const parentId of mod.parentModuleIds) {
    const parentInList = localSelectedModules.value.find((m) => m.moduleId === parentId)
    if (parentInList && parentInList.checked) return true
    if (isChildOfSelectedParent(parentId, new Set(visited))) return true
  }
  return false
}

function handleToggleModule(row: LocalSelectedModule) {
  if (isChildOfSelectedParent(row.moduleId)) return
  row.checked = !row.checked
  handleModuleCheckChange(row)
  commitUndo()
}

function handleModuleCheckChange(row: LocalSelectedModule) {
  if (row.checked) {
    const childIds = getAllChildModuleIds(row.moduleId)
    for (const childId of childIds) {
      const child = localSelectedModules.value.find((m) => m.moduleId === childId)
      if (child) {
        child.checked = true
      }
    }
  } else {
    const childIds = getAllChildModuleIds(row.moduleId)
    for (const childId of childIds) {
      const child = localSelectedModules.value.find((m) => m.moduleId === childId)
      if (child) {
        child.checked = false
      }
    }
  }
}

async function handleConfigChange() {
  const validCombinations = localConfigCombinations.value.filter((c) => c.configurationId)
  if (validCombinations.length === 0) {
    localSelectedModules.value = []
    return
  }
  const savedSelected = project.value?.selectedModules || []
  localSelectedModules.value = sortedConfigModules.value.map((mod) => {
    const saved = savedSelected.find((s) => s.moduleId === mod.id)
    const defaultQty = moduleConfigQuantityMap.value.get(mod.id) || 1
    return {
      moduleId: mod.id,
      quantity: saved?.quantity || defaultQty,
      checked: saved ? true : true,
      drawingNo: mod.drawingNo,
      nameZh: mod.nameZh,
      depth: configModuleDepthMap.value.get(mod.id) || 0,
      parentModuleIds: mod.parentModuleIds || [],
      configQuantities: new Map()
    }
  })
  for (const row of localSelectedModules.value) {
    if (row.checked) {
      const childIds = getAllChildModuleIds(row.moduleId)
      for (const childId of childIds) {
        const child = localSelectedModules.value.find((m) => m.moduleId === childId)
        if (child) {
          child.checked = true
        }
      }
    }
  }
  const moduleIds = configModules.value.map((m) => m.id)
  ensureModulesBom(moduleIds)
}

async function handleApplyModules() {
  const validCombinations = localConfigCombinations.value.filter((c) => c.configurationId)
  if (validCombinations.length === 0) {
    ElMessage.warning('请先添加至少一个配置组合并选择配置')
    return
  }
  const configIds = validCombinations.map((c) => c.configurationId)
  const duplicateConfig = configIds.find((id, idx) => configIds.indexOf(id) !== idx)
  if (duplicateConfig) {
    const cfgName = equipmentStore.getConfigurationById(duplicateConfig)?.name || duplicateConfig
    ElMessage.warning(`配置「${cfgName}」重复，请删除重复的配置组合`)
    return
  }
  const selected = localSelectedModules.value
    .filter((m) => m.checked)
    .map((m) => ({ moduleId: m.moduleId, quantity: m.quantity }))
  if (selected.length === 0) {
    ElMessage.warning('请至少选择一个组件')
    return
  }
  await projectsStore.updateProject(projectId.value, {
    configurationId: validCombinations[0]?.configurationId || '',
    configCombinations: validCombinations.map((c) => ({
      id: c.id,
      configurationId: c.configurationId,
      quantity: c.quantity,
      remark: c.remark
    })),
    selectedModules: selected
  })
  commitUndo()
  ElMessage.success(`已保存，${validCombinations.length}个配置组合，选择了 ${selected.length} 个组件`)
}

function handleSelectAllModules() {
  localSelectedModules.value.forEach((m) => (m.checked = true))
  commitUndo()
}

function handleClearAllModules() {
  localSelectedModules.value.forEach((m) => (m.checked = false))
  commitUndo()
}

// ==================== Tab3: 下单BOM ====================

// 全部BOM条目（BomTable需要全量数据，不使用分页）
const orderBomItems = ref<OrderBomItem[]>([])
const orderBomLoading = ref(false)

const orderBomCount = computed(() => orderBomItems.value.length)

// 传给BomTable的items：添加_rowStatus用于高亮
const bomTableItems = computed<BomTableRow[]>(() => {
  return orderBomItems.value.map((item) => {
    const row: BomTableRow = { ...item }
    if (item.source === 'manual') {
      row._rowStatus = 'new'
    } else if (item.source === 'modified') {
      row._rowStatus = 'modified'
    }
    return row
  })
})

// BomTable选中行
const selectedBomRows = ref<BomTableRow[]>([])

function handleBomSelectionChange(rows: BomTableRow[]) {
  selectedBomRows.value = rows
}

function clearBomSelection() {
  selectedBomRows.value = []
}

function handleBomRowClick(_row: BomTableRow) {
  // 行点击预留：可用于打开详情弹窗
}

// BomTable items更新：处理_rowStatus → source映射，持久化
function handleBomItemsUpdate(newItems: BomTableRow[]) {
  const cleaned: OrderBomItem[] = newItems.map((row) => {
    const { _rowStatus, ...rest } = row as BomTableRow & { _rowStatus?: string }
    const item = rest as OrderBomItem
    // 如果BomTable标记为modified且原source是generated，更新source为modified
    if (_rowStatus === 'modified' && item.source === 'generated') {
      item.source = 'modified'
    }
    // 确保sortOrder连续
    return item
  })
  cleaned.forEach((item, idx) => {
    item.sortOrder = idx + 1
  })
  orderBomItems.value = cleaned
  commitUndo()
}

// ===== 手动添加下单BOM条目（零件库选择 / 直接输入） =====
const orderAddDialogVisible = ref(false)
const orderAddFormRef = ref<FormInstance>()
const orderSelectMode = ref<'library' | 'direct'>('library')
const orderSelectedPartId = ref<string>('')
const orderPartPickerRef = ref<InstanceType<typeof PartPickerSelect> | null>(null)
const orderAddForm = reactive({
  drawingNo: '',
  chineseDescription: '',
  englishDescription: '',
  materialCatalogNo: '',
  assemblyUnit: '',
  quantity: 1
})

const ORDER_PART_PARAM_KEYS = new Set([
  'drawingNo', 'chineseDescription', 'englishDescription', 'materialCatalogNo', 'assemblyUnit'
])

/** 零件参数字段在"从零件库选择"模式下只读 */
function orderIsPartParamReadonly(key: string): boolean {
  return ORDER_PART_PARAM_KEYS.has(key) && orderSelectMode.value === 'library' && !!orderSelectedPartId.value
}

function onPickPartForOrder(part: Part) {
  orderAddForm.drawingNo = part.drawingNo || ''
  orderAddForm.chineseDescription = part.chineseDescription || ''
  orderAddForm.englishDescription = part.englishDescription || ''
  orderAddForm.materialCatalogNo = part.materialCatalogNo || ''
  orderAddForm.assemblyUnit = part.assemblyUnit || ''
}

function openOrderBomAddDialog() {
  orderSelectMode.value = 'library'
  orderSelectedPartId.value = ''
  orderPartPickerRef.value?.reset()
  orderAddForm.drawingNo = ''
  orderAddForm.chineseDescription = ''
  orderAddForm.englishDescription = ''
  orderAddForm.materialCatalogNo = ''
  orderAddForm.assemblyUnit = ''
  orderAddForm.quantity = 1
  orderAddDialogVisible.value = true
}

function resetOrderAddForm() {
  orderSelectMode.value = 'library'
  orderSelectedPartId.value = ''
  orderPartPickerRef.value?.reset()
  orderAddForm.drawingNo = ''
  orderAddForm.chineseDescription = ''
  orderAddForm.englishDescription = ''
  orderAddForm.materialCatalogNo = ''
  orderAddForm.assemblyUnit = ''
  orderAddForm.quantity = 1
}

// ===== 下单BOM条目查重对比校验（冲突对话框） =====
const orderPartConflictDialogVisible = ref(false)
const orderPartConflicts = ref<PartConflict[]>([])
const pendingOrderAddItem = ref<OrderBomItem | null>(null)
const pendingOrderAddPartData = ref<Record<string, any> | null>(null)

async function handleConfirmOrderAdd() {
  if (orderSelectMode.value === 'library' && !orderSelectedPartId.value) {
    ElMessage.warning('请先从零件库选择一个零件')
    return
  }
  if (orderSelectMode.value === 'direct' && !orderAddForm.chineseDescription && !orderAddForm.materialCatalogNo) {
    ElMessage.warning('直接输入时，中文描述和物料/目录号至少填写一个')
    return
  }
  if (!orderAddForm.quantity || orderAddForm.quantity <= 0) {
    ElMessage.warning('数量必须大于 0')
    return
  }

  const maxSort = orderBomItems.value.length > 0
    ? Math.max(...orderBomItems.value.map((i) => i.sortOrder || 0))
    : 0

  const newItem: OrderBomItem = {
    id: generateId('ob'),
    drawingNo: orderAddForm.drawingNo || undefined,
    jobNo: project.value?.jobNo,
    chineseDescription: orderAddForm.chineseDescription || '',
    englishDescription: orderAddForm.englishDescription || undefined,
    materialCatalogNo: orderAddForm.materialCatalogNo || undefined,
    assemblyUnit: orderAddForm.assemblyUnit || undefined,
    quantity: Number(orderAddForm.quantity),
    sourceModuleIds: [],
    source: 'manual',
    sortOrder: maxSort + 1
  } as OrderBomItem
  // 从零件库选择时携带 partId，避免重复建零件
  if (orderSelectMode.value === 'library' && orderSelectedPartId.value) {
    ;(newItem as any).partId = orderSelectedPartId.value
  }

  // direct 直接输入模式：与零件库做查重对比校验
  if (orderSelectMode.value === 'direct') {
    const partData: Record<string, any> = {
      drawingNo: orderAddForm.drawingNo || '',
      chineseDescription: orderAddForm.chineseDescription || '',
      englishDescription: orderAddForm.englishDescription || '',
      materialCatalogNo: orderAddForm.materialCatalogNo || '',
      assemblyUnit: orderAddForm.assemblyUnit || ''
    }
    const conflict = partsStore.detectPartConflict(partData)
    // 有冲突（图号命中且参数不一致）：弹出冲突对话框，不直接添加
    if (conflict && conflict.diffs.length > 0) {
      orderPartConflicts.value = [conflict]
      pendingOrderAddItem.value = newItem
      pendingOrderAddPartData.value = partData
      orderPartConflictDialogVisible.value = true
      // 不关闭添加对话框，等冲突处理完再关
      return
    }
  }

  orderBomItems.value = [...orderBomItems.value, newItem]
  orderAddDialogVisible.value = false
  ElMessage.success('已添加下单BOM条目（请点击保存项目以持久化）')
  commitUndo()
}

/** 应用下单BOM条目的冲突处理结果 */
async function applyOrderPartConflictResolution() {
  const targetItem = pendingOrderAddItem.value
  const partData = pendingOrderAddPartData.value
  if (!targetItem || !partData) {
    orderPartConflictDialogVisible.value = false
    return
  }

  const conflicts = orderPartConflicts.value
  let finalItem: OrderBomItem = { ...targetItem }

  for (const conflict of conflicts) {
    if (conflict.action === 'overwrite') {
      // 覆盖：用新输入参数更新零件库
      await partsStore.updatePart(conflict.existingPart.id, { ...partData })
      // 条目关联到已有零件，参数字段用新输入值
      ;(finalItem as any).partId = conflict.existingPart.id
      finalItem.drawingNo = partData.drawingNo || undefined
      finalItem.chineseDescription = partData.chineseDescription || ''
      finalItem.englishDescription = partData.englishDescription || undefined
      finalItem.materialCatalogNo = partData.materialCatalogNo || undefined
      finalItem.assemblyUnit = partData.assemblyUnit || undefined
    } else {
      // 保留库里参数：不修改零件库
      // 条目关联到已有零件，参数字段用零件库已有值，数量保持用户输入
      const ex = conflict.existingPart
      ;(finalItem as any).partId = ex.id
      finalItem.drawingNo = ex.drawingNo || undefined
      finalItem.chineseDescription = ex.chineseDescription || ''
      finalItem.englishDescription = ex.englishDescription || undefined
      finalItem.materialCatalogNo = ex.materialCatalogNo || undefined
      finalItem.assemblyUnit = ex.assemblyUnit || undefined
    }
  }

  orderBomItems.value = [...orderBomItems.value, finalItem]

  // 关闭冲突对话框和添加对话框，清空 pending 数据
  orderPartConflictDialogVisible.value = false
  orderAddDialogVisible.value = false
  pendingOrderAddItem.value = null
  pendingOrderAddPartData.value = null
  orderPartConflicts.value = []

  const hasOverwrite = conflicts.some((c) => c.action === 'overwrite')
  ElMessage.success(
    hasOverwrite
      ? '已用新数据覆盖零件库参数并添加条目'
      : '已使用零件库参数添加条目'
  )
  commitUndo()
}

// BOM统计
const bomStats = computed(() => {
  const items = orderBomItems.value
  return {
    total: items.length,
    totalQty: items.reduce((sum, i) => sum + (i.quantity || 0), 0),
    generated: items.filter((i) => i.source === 'generated').length,
    manual: items.filter((i) => i.source === 'manual').length,
    modified: items.filter((i) => i.source === 'modified').length
  }
})

// ===== 下单BOM来源模块分布统计 =====
const bomSourceDist = computed(() => {
  const map = new Map<string, number>()
  for (const item of orderBomItems.value) {
    if (item.sourceModuleIds && item.sourceModuleIds.length > 0) {
      for (const modId of item.sourceModuleIds) {
        const mod = modulesStore.getModuleById(modId)
        const key = mod ? `${mod.drawingNo} ${mod.nameZh}` : modId
        map.set(key, (map.get(key) || 0) + 1)
      }
    }
  }
  return Array.from(map.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
})

// ===== 打印功能 =====
const printDialogRef = ref<InstanceType<typeof PrintPreviewDialog> | null>(null)
const bomTableRef = ref<InstanceType<typeof BomTable> | null>(null)
const printColumns = ref<{ key: string; label: string }[]>([])

function openProjectPrint() {
  if (isNew.value) return
  // 获取BomTable当前可见列配置，确保打印表头与显示一致
  if (bomTableRef.value?.visibleColumns) {
    printColumns.value = bomTableRef.value.visibleColumns.map((c: any) => ({
      key: c.key,
      label: c.label
    }))
  }
  printDialogRef.value?.open()
}

// 加载全部BOM条目
async function loadOrderBomAll() {
  if (isNew.value) return
  orderBomLoading.value = true
  try {
    const items = await projectsStore.getOrderBomItems(projectId.value)
    orderBomItems.value = items.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
  } finally {
    orderBomLoading.value = false
  }
  loadVersions()
}

// ==================== 项目变更历史 ====================
const changeHistoryList = computed<ChangeRecord[]>(() => {
  if (!project.value?.changeHistory) return []
  return [...project.value.changeHistory].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  )
})

// ==================== 项目 BOM 版本管理 ====================
const bomVersions = ref<BomVersion[]>([])

async function loadVersions() {
  if (isNew.value) {
    bomVersions.value = []
    return
  }
  bomVersions.value = await bomVersionsStore.getVersions('project', projectId.value)
}

async function openCreateVersionDialog() {
  try {
    const { value } = await ElMessageBox.prompt('请输入版本说明', '创建版本快照', {
      confirmButtonText: '创建',
      cancelButtonText: '取消',
      inputPlaceholder: '例如：交付客户前最终版'
    })
    await bomVersionsStore.createVersion('project', projectId.value, orderBomItems.value, value || '')
    await loadVersions()
    ElMessage.success('版本快照创建成功')
  } catch { /* 取消 */ }
}

async function handleRollbackToVersion(row: BomVersion) {
  try {
    await ElMessageBox.confirm(
      `回滚到 ${row.versionNo} 将用该版本的下单BOM覆盖当前BOM，当前BOM会先自动保存为新版本。是否继续？`,
      '版本回滚确认',
      { confirmButtonText: '确定回滚', cancelButtonText: '取消', type: 'warning' }
    )
    // 1. 回滚前自动备份当前
    await bomVersionsStore.createVersion('project', projectId.value, orderBomItems.value, '回滚前自动备份')
    // 2. 取目标版本
    const items = await bomVersionsStore.rollbackToVersion(row.id)
    if (!items) {
      ElMessage.error('版本数据不存在')
      return
    }
    // 3. 写回下单BOM
    await projectsStore.setOrderBom(projectId.value, items)
    orderBomItems.value = items.sort((a: OrderBomItem, b: OrderBomItem) => (a.sortOrder || 0) - (b.sortOrder || 0))
    commitUndo()
    ElMessage.success(`已回滚到版本 ${row.versionNo}`)
    await loadVersions()
  } catch { /* 取消 */ }
}

async function deleteVersion(row: BomVersion) {
  try {
    await ElMessageBox.confirm(`确定删除版本 ${row.versionNo} 吗？`, '删除确认', {
      confirmButtonText: '删除', cancelButtonText: '取消', type: 'warning'
    })
    await bomVersionsStore.deleteVersion(row.id)
    await loadVersions()
    ElMessage.success('版本已删除')
  } catch { /* 取消 */ }
}

// ===== 变更历史回滚（基本信息字段） =====
async function handleRollbackHistory(record: ChangeRecord) {
  if (!record.beforeData) {
    ElMessage.warning('该记录无回滚数据')
    return
  }
  try {
    await projectsStore.updateProject(projectId.value, { ...record.beforeData })
    await projectsStore.addChangeHistory(projectId.value, '回滚', `回滚到「${record.detail}」之前的状态`)
    ElMessage.success('回滚成功，基本信息已恢复')
  } catch (e) {
    ElMessage.error('回滚失败：' + (e instanceof Error ? e.message : String(e)))
  }
}

// 生成下单BOM
function handleGenerateBom() {
  if (!project.value) return
  if (!project.value.equipmentId) {
    ElMessage.warning('请先在基本信息中选择机型')
    return
  }
  const hasConfig =
    (project.value.configCombinations && project.value.configCombinations.length > 0) ||
    project.value.configurationId
  if (!hasConfig) {
    ElMessage.warning('请先在模块配置中添加配置组合')
    return
  }
  if (!project.value.selectedModules || project.value.selectedModules.length === 0) {
    ElMessage.warning('请先在模块配置中选择至少一个组件并应用')
    return
  }

  ElMessageBox.confirm(
    `将根据已选的 ${project.value.selectedModules.length} 个组件重新生成下单BOM，现有BOM数据（含手动修改）将被覆盖。是否继续？`,
    '重新生成BOM确认',
    {
      confirmButtonText: '确定生成',
      cancelButtonText: '取消',
      type: 'warning'
    }
  )
    .then(async () => {
      generatingBom.value = true
      try {
        const selectedModules = project.value!.selectedModules
        const moduleIds = [...new Set(selectedModules.map((s) => s.moduleId))]
        await ensureModulesBom(moduleIds)
        // 从缓存构建 moduleId -> BOM条目 映射，bomGenerator 不再依赖 mod.bom
        const bomItemsMap = new Map<string, BomItem[]>()
        for (const [mid, items] of moduleBomCache.value) {
          bomItemsMap.set(mid, items)
        }
        // 在 Web Worker 中生成，主线程不阻塞，并展示进度
        const result = await generateOrderBomInWorker(selectedModules, modulesStore.modules, bomItemsMap, project.value?.jobNo)
        const generated = result.items
        await projectsStore.setOrderBom(projectId.value, generated)
        orderBomItems.value = generated.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
        clearBomSelection()
        commitUndo()
        if (result.logs.warnings.length > 0) {
          // 单独输出合并冲突警告详情
          const mergeConflicts = result.logs.warnings.filter((w) => w.includes('合并冲突'))
          if (mergeConflicts.length > 0) {
            console.warn('[下单BOM合并冲突]', mergeConflicts)
          }
          ElMessage.warning(`生成完成，共 ${generated.length} 条，${result.logs.warnings.length} 条警告已记录`)
          console.warn('[下单BOM生成警告]', result.logs.warnings)
        } else {
          ElMessage.success(`生成成功，共 ${generated.length} 条`)
        }
      } finally {
        generatingBom.value = false
      }
    })
    .catch(() => {})
}

// 来源模块名称（导出用）
function getSourceModuleNames(moduleIds: string[]): string[] {
  return moduleIds
    .map((id) => modulesStore.getModuleById(id)?.nameZh || id)
    .filter(Boolean)
}

function bomSourceLabel(source: OrderBomItem['source']) {
  const map: Record<OrderBomItem['source'], string> = {
    generated: '生成',
    manual: '手动',
    modified: '修改'
  }
  return map[source]
}

// ==================== 批量操作 ====================
const batchActions: BatchAction[] = [
  { key: 'delete', label: '批量删除', type: 'danger', icon: 'Delete' },
  { key: 'qty', label: '修改数量', type: 'warning', icon: 'Edit' },
  { key: 'export', label: '导出选中', type: 'success', icon: 'Download' }
]

function handleBatchAction(key: string) {
  if (key === 'delete') {
    handleBatchDelete()
  } else if (key === 'qty') {
    batchQtyDialogVisible.value = true
  } else if (key === 'export') {
    // 打开导出对话框；存在选中行时对话框自动默认“选中”范围
    openExportDialog()
  }
}

async function handleBatchDelete() {
  if (selectedBomRows.value.length === 0) return
  try {
    await ElMessageBox.confirm(
      `确定删除选中的 ${selectedBomRows.value.length} 条下单BOM条目吗？`,
      '批量删除确认',
      { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' }
    )
    const ids = new Set(selectedBomRows.value.map((r) => r.id))
    orderBomItems.value = orderBomItems.value.filter((item) => !ids.has(item.id))
    orderBomItems.value.forEach((item, idx) => {
      item.sortOrder = idx + 1
    })
    await projectsStore.setOrderBom(projectId.value, orderBomItems.value)
    clearBomSelection()
    commitUndo()
    ElMessage.success(`已删除 ${ids.size} 条`)
  } catch {
    // 用户取消
  }
}

// 批量修改数量
const batchQtyDialogVisible = ref(false)
const batchQtyMode = ref<'multiply' | 'set'>('multiply')
const batchQtyValue = ref(1)

function confirmBatchQty() {
  if (selectedBomRows.value.length === 0) return
  const ids = new Set(selectedBomRows.value.map((r) => r.id))
  orderBomItems.value = orderBomItems.value.map((item) => {
    if (ids.has(item.id)) {
      const newQty =
        batchQtyMode.value === 'multiply'
          ? Math.round((item.quantity || 0) * batchQtyValue.value * 100) / 100
          : batchQtyValue.value
      return { ...item, quantity: newQty, source: item.source === 'generated' ? 'modified' as const : item.source }
    }
    return item
  })
  projectsStore.setOrderBom(projectId.value, orderBomItems.value)
  batchQtyDialogVisible.value = false
  clearBomSelection()
  commitUndo()
  ElMessage.success('已批量修改数量')
}

// ==================== 导出 ====================
const exportDialogVisible = ref(false)

const exportColumnOptions = computed(() => {
  const options: { key: string; label: string }[] = [{ key: 'sn', label: '序号' }]
  for (const field of bomTemplatesStore.getVisibleFieldsByType('order')) {
    if (field.key === 'type') continue
    options.push({ key: field.key, label: field.label })
  }
  options.push({ key: 'sourceModule', label: '来源组件' })
  options.push({ key: 'source', label: '来源' })
  return options
})

const defaultExportHeaders = computed(() => {
  const orderKeys = bomTemplatesStore
    .getVisibleFieldsByType('order')
    .filter((f) => f.key !== 'type')
    .map((f) => f.key)
  return ['sn', ...orderKeys]
})

/** 默认文件名 */
const exportDefaultFileName = computed(() =>
  `${project.value?.name || '项目'}_下单BOM_${dayjs().format('YYYYMMDD_HHmmss')}`
)

function handleExportBom() {
  if (orderBomCount.value === 0) {
    ElMessage.warning('暂无BOM数据可导出')
    return
  }
  openExportDialog()
}

function openExportDialog() {
  exportDialogVisible.value = true
}

/** 导出确认：由 BomExportDialog 抛出选中字段/排序/格式/范围/文件名 */
async function confirmExport(config: BomExportConfig) {
  exporting.value = true
  try {
    // 确定导出范围
    let itemsToExport: OrderBomItem[]
    if (config.scope === 'selected' && selectedBomRows.value.length > 0) {
      const selectedIds = new Set(selectedBomRows.value.map((r) => r.id))
      itemsToExport = orderBomItems.value.filter((item) => selectedIds.has(item.id))
    } else {
      itemsToExport = orderBomItems.value
    }

    if (itemsToExport.length === 0) {
      ElMessage.warning('暂无数据可导出')
      return
    }

    const headersToExport =
      config.selectedKeys.length > 0
        ? config.selectedKeys
        : exportColumnOptions.value.map((col) => col.key)

    const data = itemsToExport.map((item, idx) => {
      const row: Record<string, any> = {}
      for (const key of headersToExport) {
        if (key === 'sn') {
          row['序号'] = idx + 1
        } else if (key === 'sourceModule') {
          row['来源组件'] = getSourceModuleNames(item.sourceModuleIds).join(', ')
        } else if (key === 'source') {
          row['来源'] = bomSourceLabel(item.source)
        } else {
          const field = bomTemplatesStore.getVisibleFieldsByType('order').find((f) => f.key === key)
          const label = field?.label || key
          row[label] = item[key] ?? ''
        }
      }
      return row
    })

    const filename = config.fileName || `${project.value?.name || '项目'}_下单BOM`

    if (config.format === 'csv') {
      exportToCsv(data, filename)
    } else {
      exportToExcel(data, filename, '下单BOM')
    }
    exportDialogVisible.value = false
    if (!isElectronEnvironment()) {
      ElMessage.success('导出成功')
    }
  } finally {
    exporting.value = false
  }
}

function exportToCsv(data: Record<string, any>[], filename: string) {
  if (data.length === 0) return
  const headers = Object.keys(data[0])
  const escapeCsv = (val: any): string => {
    const str = String(val ?? '')
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`
    }
    return str
  }
  const csvLines = [
    headers.join(','),
    ...data.map((row) => headers.map((h) => escapeCsv(row[h])).join(','))
  ]
  const csvContent = '\uFEFF' + csvLines.join('\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `${filename}.csv`
  link.click()
  URL.revokeObjectURL(link.href)
}

// ==================== 撤销/重做 ====================
interface EditorSnapshot {
  form: ProjectForm
  configCombinations: LocalConfigCombination[]
  selectedModules: Array<{
    moduleId: string
    quantity: number
    checked: boolean
    drawingNo: string
    nameZh: string
    depth: number
    parentModuleIds: string[]
  }>
  orderBom: OrderBomItem[]
}

function createSnapshot(): EditorSnapshot {
  return {
    form: JSON.parse(JSON.stringify(form)) as ProjectForm,
    configCombinations: JSON.parse(JSON.stringify(localConfigCombinations.value)),
    selectedModules: localSelectedModules.value.map((m) => ({
      moduleId: m.moduleId,
      quantity: m.quantity,
      checked: m.checked,
      drawingNo: m.drawingNo,
      nameZh: m.nameZh,
      depth: m.depth,
      parentModuleIds: m.parentModuleIds
    })),
    orderBom: JSON.parse(JSON.stringify(orderBomItems.value))
  }
}

function applySnapshot(snap: EditorSnapshot) {
  Object.assign(form, snap.form)
  localConfigCombinations.value = snap.configCombinations
  localSelectedModules.value = snap.selectedModules.map((m) => ({
    ...m,
    configQuantities: new Map()
  }))
  orderBomItems.value = snap.orderBom
}

const snapshotRef = ref<EditorSnapshot>(createSnapshot())
const { canUndo, canRedo, undo, redo, commit, clearHistory } = useUndoRedo(snapshotRef)

let isRestoringSnapshot = false

function commitUndo() {
  if (isRestoringSnapshot) return
  snapshotRef.value = createSnapshot()
  commit()
}

function handleUndo() {
  if (!canUndo.value) return
  isRestoringSnapshot = true
  undo()
  applySnapshot(snapshotRef.value)
  isRestoringSnapshot = false
  ElMessage({ message: '已撤销上一步操作', type: 'info', duration: 2000 })
}

function handleRedo() {
  if (!canRedo.value) return
  isRestoringSnapshot = true
  redo()
  applySnapshot(snapshotRef.value)
  isRestoringSnapshot = false
  ElMessage({ message: '已重做上一步操作', type: 'info', duration: 2000 })
}

// ==================== 自动保存 ====================
const autoSaveData = computed(() => ({
  form: { ...form },
  configCombinations: localConfigCombinations.value,
  selectedModules: localSelectedModules.value,
  orderBom: orderBomItems.value
}))

const autoSaveEnabled = computed(() => !isNew.value)

const {
  lastSaved: autoSaveLastSaved,
  isSaving: autoSaveSaving,
  dirty: autoSaveDirty,
  triggerSave: triggerAutoSave,
  markClean: markAutoSaveClean
} = useAutoSave({
  data: autoSaveData,
  saveFn: async () => {
    if (isNew.value) return
    const success = await persistAll(false)
    if (!success) {
      throw new Error('自动保存失败，请手动保存')
    }
  },
  interval: getAutoSaveIntervalMs(),
  enabled: autoSaveEnabled
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
async function reloadProject() {
  const p = projectsStore.getProjectById(projectId.value)
  if (p) {
    form.name = p.name
    form.jobNo = p.jobNo
    form.customer = p.customer || ''
    form.customerLocation = p.customerLocation || ''
    form.status = p.status
    form.equipmentId = p.equipmentId
    form.equipmentModel = p.equipmentModel || ''
    form.projectTypeId = p.projectTypeId || ''
    form.relatedProjectIds = p.relatedProjectIds || []
    form.customerRequirements = p.customerRequirements || []
    form.deliveryDate = p.deliveryDate || ''
  }
}

useTabSync({
  storageKey: 'project-editor',
  entityId: projectId.value || 'new',
  onRefresh: reloadProject
})

// ===== 实时唯一性校验（JOB号） =====
const jobNoUnique = useUniqueValidation(
  () => projectsStore.isJobNoUnique(form.jobNo, isNew.value ? undefined : projectId.value),
  () => form.jobNo
)

function formatTime(iso: string): string {
  return dayjs(iso).format('HH:mm:ss')
}

// 持久化所有数据（不校验表单）
async function persistAll(validate: boolean = true): Promise<boolean> {
  if (isNew.value) return false
  if (validate && formRef.value) {
    try {
      await formRef.value.validate()
    } catch {
      ElMessage.error('请填写必填项')
      return false
    }
  }

  try {
    // 保存基本信息
    projectsStore.updateProject(projectId.value, {
      name: form.name,
      jobNo: form.jobNo,
      customer: form.customer || undefined,
      customerLocation: form.customerLocation || undefined,
      status: form.status,
      equipmentId: form.equipmentId,
      equipmentModel: form.equipmentModel || undefined,
      projectTypeId: form.projectTypeId || undefined,
      relatedProjectIds: form.relatedProjectIds,
      customerRequirements: form.customerRequirements,
      deliveryDate: form.deliveryDate || undefined
    })

    // 保存配置组合和模块选择
    const validCombinations = localConfigCombinations.value.filter((c) => c.configurationId)
    const selectedModules = localSelectedModules.value
      .filter((m) => m.checked)
      .map((m) => ({ moduleId: m.moduleId, quantity: m.quantity }))

    projectsStore.updateProject(projectId.value, {
      configurationId: validCombinations[0]?.configurationId || '',
      configCombinations: validCombinations.map((c) => ({
        id: c.id,
        configurationId: c.configurationId,
        quantity: c.quantity,
        remark: c.remark
      })),
      selectedModules
    })

    // 保存BOM（清理内部字段，确保可序列化）
    const cleanBomItems = orderBomItems.value.map((item, idx) => {
      const cleaned: Record<string, any> = {}
      for (const [key, value] of Object.entries(item)) {
        // 跳过去以下划线开头的内部字段（如_rowStatus, _sourceModuleId等）
        if (key.startsWith('_')) continue
        // 确保值是可序列化的（跳过函数、Map、Set等）
        if (typeof value === 'function' || value instanceof Map || value instanceof Set) continue
        cleaned[key] = value
      }
      // 确保sortOrder是数字
      cleaned.sortOrder = typeof cleaned.sortOrder === 'number' && !isNaN(cleaned.sortOrder) ? cleaned.sortOrder : idx + 1
      return cleaned as OrderBomItem
    })
    await projectsStore.setOrderBom(projectId.value, cleanBomItems)

    return true
  } catch (error) {
    notifyDbError(error, '保存项目')
    // 打印 Dexie 错误详情以便定位具体失败的表和操作
    const dexieErr = error as any
    if (dexieErr && dexieErr.name) {
      console.error('[保存失败详情]', {
        name: dexieErr.name,
        message: dexieErr.message,
        inner: dexieErr.inner ? { name: dexieErr.inner.name, message: dexieErr.inner.message } : undefined,
        failures: dexieErr.failures
      })
    }
    const msg = error instanceof Error ? error.message : String(error)
    ElMessage.error(`保存失败：${msg || '未知错误'}`)
    return false
  }
}

// ==================== 保存 ====================
async function handleSave() {
  if (!formRef.value) return
  saving.value = true
  try {
    if (isNew.value) {
      // 新建项目
      try {
        await formRef.value.validate()
      } catch {
        ElMessage.error('请填写必填项')
        return
      }
      const newProject = projectsStore.addProject({
        name: form.name,
        jobNo: form.jobNo,
        customer: form.customer || undefined,
        customerLocation: form.customerLocation || undefined,
        status: form.status,
        equipmentId: form.equipmentId,
        equipmentModel: form.equipmentModel || undefined,
        configurationId: '',
        configCombinations: [],
        projectTypeId: form.projectTypeId || undefined,
        relatedProjectIds: form.relatedProjectIds,
        customerRequirements: form.customerRequirements,
        selectedModules: [],
        orderBom: []
      })
      ElMessage.success('项目创建成功')
      markAutoSaveClean()
      clearHistory()
      router.replace(`/project/${newProject.id}/edit`)
    } else {
      const original = project.value
      const success = await persistAll(true)
      if (!success) return

      // 机型变更处理
      if (original && original.equipmentId !== form.equipmentId) {
        const oldSerial = equipmentStore.getAssignedSerialByProject(original.equipmentId, projectId.value)
        if (oldSerial) {
          equipmentStore.unassignSerial(oldSerial.id)
        }
        if (original.serialNumber) {
          projectsStore.updateProject(projectId.value, { serialNumber: undefined })
        }
      }
      markAutoSaveClean()
      ElMessage.success('保存成功')
    }
  } finally {
    saving.value = false
  }
}

// ==================== Tab完成状态 ====================
const basicComplete = computed(() => {
  return !!(form.name && form.jobNo)
})

const modulesComplete = computed(() => {
  if (isNew.value) return false
  return localSelectedModules.value.some((m) => m.checked)
})

// ==================== 键盘快捷键 ====================
const { register } = useKeyboardShortcuts()

register('ctrl+s', () => {
  handleSave()
})

register('ctrl+z', () => {
  handleUndo()
})

register('ctrl+y', () => {
  handleRedo()
})

register('ctrl+tab', () => {
  const tabs = ['basic', 'modules', 'orderBom']
  const currentIdx = tabs.indexOf(activeTab.value)
  activeTab.value = tabs[(currentIdx + 1) % tabs.length]
})

register('esc', () => {
  if (exportDialogVisible.value) {
    exportDialogVisible.value = false
  } else if (batchQtyDialogVisible.value) {
    batchQtyDialogVisible.value = false
  }
})

// ==================== 离开提示 ====================
onBeforeRouteLeave((_to, _from, next) => {
  // 如果已经在离开流程中（handleBack确认后触发），直接放行，避免重复弹窗
  if (isLeaving.value) {
    next()
    return
  }
  if (autoSaveDirty.value && !isNew.value) {
    ElMessageBox.confirm('有未保存的更改，确定要离开吗？', '离开确认', {
      type: 'warning',
      confirmButtonText: '离开',
      cancelButtonText: '留在页面'
    })
      .then(() => {
        isLeaving.value = true
        next()
      })
      .catch(() => next(false))
  } else {
    next()
  }
})

function handleBack() {
  if (autoSaveDirty.value && !isNew.value) {
    ElMessageBox.confirm('有未保存的更改，确定要返回吗？', '返回确认', {
      type: 'warning',
      confirmButtonText: '返回',
      cancelButtonText: '留在页面'
    })
      .then(() => {
        isLeaving.value = true
        router.back()
      })
      .catch(() => {})
  } else {
    router.back()
  }
}

// ==================== 初始化加载 ====================
async function loadProjectData() {
  if (isNew.value) {
    Object.assign(form, createDefaultForm())
    localConfigId.value = ''
    localSelectedModules.value = []
    orderBomItems.value = []
    return
  }

  const p = project.value
  if (!p) {
    ElMessage.error('项目不存在')
    router.replace('/project')
    return
  }

  form.name = p.name
  form.jobNo = p.jobNo
  form.customer = p.customer || ''
  form.customerLocation = p.customerLocation || ''
  form.status = p.status
  form.equipmentId = p.equipmentId
  form.equipmentModel = p.equipmentModel || ''
  form.projectTypeId = p.projectTypeId || ''
  form.relatedProjectIds = [...p.relatedProjectIds]
  form.customerRequirements = p.customerRequirements.map((r) => ({ ...r }))
  form.deliveryDate = p.deliveryDate || ''

  localConfigId.value = p.configurationId || ''
  if (p.configCombinations && p.configCombinations.length > 0) {
    localConfigCombinations.value = p.configCombinations.map((c) => ({
      id: c.id,
      configurationId: c.configurationId,
      quantity: c.quantity,
      remark: c.remark || ''
    }))
  } else if (p.configurationId) {
    localConfigCombinations.value = [
      {
        id: generateId('cc'),
        configurationId: p.configurationId,
        quantity: 1,
        remark: ''
      }
    ]
  } else {
    localConfigCombinations.value = []
  }
  if (localConfigCombinations.value.length > 0) {
    await handleConfigChange()
  }

  // 加载全部BOM（等待加载完成，避免autoSaveDirty被误触发）
  await loadOrderBomAll()
}

onMounted(async () => {
  await loadProjectData()
  // 初始化后清空历史，避免初始状态被撤销
  nextTick(() => {
    snapshotRef.value = createSnapshot()
    clearHistory()
    commit()
    markAutoSaveClean()
  })
})

watch(
  () => route.params.id,
  async () => {
    await loadProjectData()
    nextTick(() => {
      snapshotRef.value = createSnapshot()
      clearHistory()
      commit()
      markAutoSaveClean()
    })
  }
)

// 切换到下单BOM Tab时确保数据已加载
watch(activeTab, (val) => {
  if (val === 'orderBom' && !isNew.value && orderBomItems.value.length === 0) {
    loadOrderBomAll()
  }
})
</script>

<style scoped>
.page-container {
  padding-bottom: 80px;
}

.card-wrapper {
  background: #fff;
  border-radius: 8px;
  padding: 16px 20px;
  margin-bottom: 16px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
}

/* ===== 顶部标题栏 ===== */
.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.header-title {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.project-name {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}

.project-jobno {
  font-size: 14px;
  color: #909399;
}

.last-saved-tip {
  font-size: 12px;
  color: #c0c4cc;
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

/* ===== Tab 样式 ===== */
.project-tabs {
  --el-tabs-header-height: 48px;
}

.project-tabs :deep(.el-tabs__content) {
  padding-top: 16px;
  min-height: 400px;
}

.project-tabs :deep(.el-tab-pane) {
  animation: tabFadeIn 0.25s ease;
}

@keyframes tabFadeIn {
  from {
    opacity: 0;
    transform: translateY(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.tab-label-with-status {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.tab-status-dot {
  font-size: 14px;
}

.tab-status-dot.success {
  color: #67c23a;
}

.tab-status-dot.pending {
  color: #c0c4cc;
}

.tab-count {
  color: #909399;
  font-size: 13px;
}

/* ===== 基本信息 ===== */
.basic-collapse {
  border: none;
}

.basic-collapse :deep(.el-collapse-item__header) {
  font-weight: 600;
  font-size: 14px;
  color: #303133;
  background: #fafafa;
  padding-left: 12px;
  border-radius: 4px;
}

.basic-collapse :deep(.el-collapse-item__wrap) {
  border-bottom: none;
}

.basic-collapse :deep(.el-collapse-item__content) {
  padding: 16px 12px;
}

.basic-form {
  max-width: 900px;
}

.form-tip {
  font-size: 12px;
  color: #909399;
}

.serial-display {
  display: flex;
  align-items: center;
  min-height: 32px;
}

.text-muted {
  color: #909399;
  font-size: 14px;
}

/* 客户需求 */
.requirements-wrapper {
  width: 100%;
}

.requirement-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.req-index {
  color: #909399;
  font-size: 13px;
  min-width: 24px;
  flex-shrink: 0;
}

.req-delete-btn {
  opacity: 0;
  transition: opacity 0.2s;
  flex-shrink: 0;
}

.requirement-row:hover .req-delete-btn {
  opacity: 1;
}

/* ===== 模块配置 ===== */
.config-combination-section {
  margin-bottom: 20px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
}

.config-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 12px;
}

.config-card {
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  overflow: hidden;
  transition: box-shadow 0.2s;
}

.config-card:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.config-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: #f5f7fa;
  border-bottom: 1px solid #e4e7ed;
}

.config-card-index {
  font-weight: 600;
  color: #409eff;
  font-size: 13px;
}

.config-card-body {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.config-card-meta {
  display: flex;
  gap: 16px;
  align-items: center;
}

.config-card-meta-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.meta-label {
  font-size: 12px;
  color: #909399;
}

.config-card-remark {
  width: 100%;
}

.empty-tip {
  text-align: center;
  padding: 24px;
  color: #909399;
  font-size: 13px;
  border: 1px dashed #dcdfe6;
  border-radius: 8px;
}

.module-info-bar {
  margin-bottom: 16px;
}

.module-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  gap: 12px;
  flex-wrap: wrap;
}

.module-toolbar-actions {
  display: flex;
  gap: 8px;
}

.module-table {
  margin-bottom: 16px;
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

/* ===== 下单BOM ===== */
.bom-action-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.bom-stats-inline {
  display: flex;
  gap: 6px;
  margin-left: auto;
}

/* ===== 手动添加下单BOM：零件库选择 ===== */
.bom-select-mode {
  margin-bottom: 16px;
}
.readonly-field-text {
  display: inline-block;
  padding: 4px 0;
  color: #606266;
  line-height: 1.5;
  word-break: break-all;
}

/* ===== 下单BOM条目零件数据冲突对话框 ===== */
.conflict-intro {
  margin-bottom: 16px;
}
.conflict-list {
  max-height: 400px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.conflict-item {
  border: 1px solid #ebeef5;
  border-radius: 6px;
  overflow: hidden;
}
.conflict-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  background: #fdf6ec;
  border-bottom: 1px solid #faecd8;
}
.conflict-index {
  font-weight: 600;
  color: #e6a23c;
}
.conflict-drawing-no {
  font-weight: 600;
  color: #303133;
  font-size: 14px;
}
.conflict-diff-count {
  font-size: 12px;
  color: #e6a23c;
  background: #fdf6ec;
  padding: 2px 8px;
  border-radius: 10px;
}
.conflict-action-select {
  margin-left: auto;
}
.conflict-diff-table {
  padding: 0;
}
.conflict-diff-table .old-value {
  color: #909399;
}
.conflict-diff-table .new-value {
  color: #409eff;
  font-weight: 500;
}

/* BOM 生成进度 */
.bom-gen-progress {
  margin-bottom: 16px;
  padding: 10px 14px;
  background: #ecf5ff;
  border-radius: 6px;
}
.bom-gen-progress-text {
  display: block;
  margin-top: 6px;
  font-size: 12px;
  color: #409eff;
}

/* BOM 统计摘要卡片 */
.bom-summary-cards {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}
.summary-card {
  flex: 1;
  min-width: 120px;
  padding: 12px 16px;
  background: #f5f7fa;
  border-radius: 6px;
  border: 1px solid #ebeef5;
}
.summary-card.summary-source {
  flex: 2;
  min-width: 240px;
}
.summary-label {
  font-size: 12px;
  color: #909399;
  margin-bottom: 4px;
}
.summary-value {
  font-size: 22px;
  font-weight: 700;
  color: #409eff;
}
.summary-source-list {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

/* BomTable 行高亮覆盖：手动行橙色，修改行红色 */
:deep(.row-status-new) {
  background-color: #fdf6ec !important;
}

:deep(.row-status-new:hover) {
  background-color: #faecd8 !important;
}

:deep(.row-status-modified) {
  background-color: #fef0f0 !important;
}

:deep(.row-status-modified:hover) {
  background-color: #fde2e2 !important;
}

/* ===== 底部操作栏 ===== */
.bottom-action-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 100;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 24px;
  background: #fff;
  border-top: 1px solid #e4e7ed;
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.06);
}

.bottom-bar-left,
.bottom-bar-right {
  display: flex;
  gap: 8px;
  align-items: center;
}
</style>
