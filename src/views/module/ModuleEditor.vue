<template>
  <div class="module-editor">
    <PageBreadcrumb />
    <!-- ===== 顶部操作栏 ===== -->
    <div class="editor-header">
      <div class="header-left">
        <el-button @click="handleBack">
          <el-icon><ArrowLeft /></el-icon>返回
        </el-button>
        <el-divider direction="vertical" />
        <span class="header-drawing-no">{{ isNew ? '新建组件' : form.drawingNo }}</span>
        <el-divider direction="vertical" />
        <span class="header-name">{{ isNew ? '' : form.nameZh }}</span>
        <el-tag
          v-if="!isNew"
          :type="moduleStatusType"
          size="small"
          class="header-status"
        >
          {{ moduleStatusLabel }}
        </el-tag>
      </div>
      <div class="header-right">
        <!-- 保存状态 -->
        <span
          class="save-status"
          :class="{ dirty: dirty }"
        >
          <el-icon v-if="autoSaveSaving"><Loading class="spin" /></el-icon>
          <el-icon v-else-if="dirty"><CircleClose /></el-icon>
          <el-icon v-else><CircleCheck /></el-icon>
          <span>{{ saveStatusText }}</span>
        </span>
        <el-button
          :icon="RefreshLeft"
          :disabled="!canUndo"
          title="撤销 (Ctrl+Z)"
          @click="undo"
        >
          撤销
        </el-button>
        <el-button
          :icon="RefreshRight"
          :disabled="!canRedo"
          title="重做 (Ctrl+Y)"
          @click="redo"
        >
          重做
        </el-button>
        <el-button
          :icon="Printer"
          :disabled="isNew"
          title="打印组件详情"
          @click="openModulePrint"
        >
          打印
        </el-button>
        <el-button
          type="primary"
          :loading="saving"
          :disabled="!dirty && !isNew"
          @click="handleSave"
        >
          <el-icon><Check /></el-icon>保存
        </el-button>
      </div>
    </div>

    <!-- ===== Tab 导航 ===== -->
    <el-tabs
      v-model="activeTab"
      type="border-card"
      class="editor-tabs"
    >
      <template #nav-prepend />

      <!-- ---------- Tab1 基本信息 ---------- -->
      <el-tab-pane name="basic">
        <template #label>
          <span class="tab-label">
            <span
              class="tab-dot"
              :class="{ complete: tabComplete.basic }"
            />
            基本信息 <span
              v-if="dirty"
              class="tab-dirty"
            >*</span>
          </span>
        </template>
        <el-collapse
          v-model="basicCollapse"
          class="basic-collapse"
        >
          <!-- 基本属性 -->
          <el-collapse-item
            title="基本属性"
            name="props"
          >
            <el-form
              ref="basicFormRef"
              :model="form"
              :rules="basicRules"
              label-width="110px"
              class="basic-form"
            >
              <el-row :gutter="24">
                <el-col :span="12">
                  <el-form-item
                    label="图号"
                    prop="drawingNo"
                    required
                  >
                    <el-tooltip
                      content="ASM结尾，唯一标识"
                      placement="top"
                    >
                      <el-input
                        v-model="form.drawingNo"
                        placeholder="请输入图号（唯一，ASM结尾）"
                        :class="{ 'input-error': drawingNoUnique.hasError.value }"
                        @blur="validateDrawingNo"
                      />
                    </el-tooltip>
                    <div
                      v-if="drawingNoUnique.hasError.value"
                      class="field-error-text"
                    >
                      {{ drawingNoUnique.error.value }}
                    </div>
                  </el-form-item>
                </el-col>
                <el-col :span="12">
                  <el-form-item
                    label="中文名"
                    prop="nameZh"
                    required
                  >
                    <el-input
                      v-model="form.nameZh"
                      placeholder="请输入中文名"
                    />
                  </el-form-item>
                </el-col>
                <el-col :span="12">
                  <el-form-item
                    label="英文名"
                    prop="nameEn"
                  >
                    <el-input
                      v-model="form.nameEn"
                      placeholder="请输入英文名（可选）"
                    />
                  </el-form-item>
                </el-col>
                <el-col :span="12">
                  <el-form-item
                    label="状态"
                    prop="status"
                  >
                    <el-select
                      v-model="form.status"
                      placeholder="请选择状态"
                      style="width: 100%"
                    >
                      <el-option
                        label="设计中"
                        value="designing"
                      />
                      <el-option
                        label="已发布"
                        value="released"
                      />
                      <el-option
                        label="已归档"
                        value="archived"
                      />
                      <el-option
                        label="已作废"
                        value="obsolete"
                      />
                    </el-select>
                  </el-form-item>
                </el-col>
              </el-row>
            </el-form>
          </el-collapse-item>

          <!-- 关联信息 -->
          <el-collapse-item
            title="关联信息"
            name="relation"
          >
            <el-form
              :model="form"
              label-width="110px"
              class="basic-form"
            >
              <el-row :gutter="24">
                <el-col :span="12">
                  <el-form-item
                    label="对应机型"
                    prop="equipmentId"
                  >
                    <el-tooltip
                      content="关联设备后可在设备配置中引用"
                      placement="top"
                    >
                      <el-select
                        v-model="form.equipmentId"
                        placeholder="请选择设备"
                        style="width: 100%"
                        @change="handleEquipmentChange"
                      >
                        <el-option
                          v-for="eq in equipmentStore.equipments"
                          :key="eq.id"
                          :label="`${eq.name}（${eq.model}）`"
                          :value="eq.id"
                        />
                      </el-select>
                    </el-tooltip>
                  </el-form-item>
                </el-col>
                <el-col :span="12">
                  <el-form-item
                    label="机型配置"
                    prop="configurationIds"
                  >
                    <el-select
                      v-model="form.configurationIds"
                      multiple
                      placeholder="请选择配置（可多选）"
                      style="width: 100%"
                      :disabled="!form.equipmentId"
                    >
                      <el-option
                        v-for="cfg in availableConfigurations"
                        :key="cfg.id"
                        :label="cfg.name"
                        :value="cfg.id"
                      />
                    </el-select>
                  </el-form-item>
                </el-col>
                <el-col :span="12">
                  <el-form-item
                    label="父模块"
                    prop="parentModuleIds"
                  >
                    <el-tree-select
                      v-model="form.parentModuleIds"
                      :data="parentModuleTreeData"
                      :props="{ label: 'label', children: 'children' }"
                      node-key="id"
                      placeholder="选择父模块（可选，支持多选）"
                      clearable
                      filterable
                      multiple
                      style="width: 100%"
                      :disabled="isNew || !form.equipmentId"
                      @change="handleParentChange"
                    />
                  </el-form-item>
                </el-col>
                <el-col :span="12">
                  <el-form-item
                    label="标签"
                    prop="tags"
                  >
                    <el-select
                      v-model="form.tags"
                      multiple
                      filterable
                      allow-create
                      default-first-option
                      placeholder="选择或输入新标签"
                      style="width: 100%"
                      @create="handleCreateTag"
                    >
                      <el-option
                        v-for="tag in tagsStore.tags"
                        :key="tag.id"
                        :label="tag.name"
                        :value="tag.id"
                      >
                        <span :style="{ color: tag.color }">●</span>
                        {{ tag.name }}
                      </el-option>
                    </el-select>
                  </el-form-item>
                </el-col>
              </el-row>
              <el-form-item
                label="备注"
                prop="remark"
              >
                <el-input
                  v-model="form.remark"
                  type="textarea"
                  :rows="3"
                  placeholder="请输入备注（可选）"
                />
              </el-form-item>
              <el-form-item
                label="描述"
                prop="description"
              >
                <el-input
                  v-model="form.description"
                  type="textarea"
                  :rows="3"
                  placeholder="请输入详细描述（可选）"
                />
              </el-form-item>
            </el-form>
          </el-collapse-item>
        </el-collapse>
      </el-tab-pane>

      <!-- ---------- Tab2 BOM管理 ---------- -->
      <el-tab-pane name="bom">
        <template #label>
          <span class="tab-label">
            <span
              class="tab-dot"
              :class="{ complete: tabComplete.bom }"
            />
            BOM管理 <span
              v-if="dirty"
              class="tab-dirty"
            >*</span><span
              v-if="bomItems.length > 0"
              class="tab-count"
            >({{ bomItems.length }})</span>
          </span>
        </template>
        <div class="bom-tab-content">
          <!-- 工具栏：导入/导出 -->
          <div class="bom-toolbar-extra">
            <el-button
              type="primary"
              size="small"
              :disabled="isNew"
              @click="openBomDialog()"
            >
              <el-icon><Plus /></el-icon>新增条目
            </el-button>
            <el-button
              size="small"
              :disabled="isNew"
              @click="importDialogVisible = true"
            >
              <el-icon><Upload /></el-icon>导入Excel/CSV
            </el-button>
            <el-button
              size="small"
              :disabled="isNew || bomItems.length === 0"
              @click="openExportDialog"
            >
              <el-icon><Download /></el-icon>导出
            </el-button>
            <el-button
              size="small"
              :disabled="isNew || bomItems.length === 0"
              @click="openModulePrint"
            >
              <el-icon><Printer /></el-icon>打印BOM
            </el-button>
          </div>

          <!-- BomTable 核心组件 -->
          <BomTable
            v-if="!isNew"
            :items="bomItems"
            :editable="true"
            :storage-key="`module_bom_${moduleId}`"
            :show-source-modules="false"
            :template-fields="visibleFields"
            :readonly-part-fields="true"
            :hide-add-button="true"
            @update:items="handleBomItemsUpdate"
            @selection-change="handleBomSelectionChange"
            @row-click="handleBomRowClick"
          />

          <EmptyState
            v-else
            title="请先保存组件"
            description="保存组件后即可添加和管理BOM条目"
            icon="Box"
          />
          <EmptyState
            v-if="!isNew && !bomLoading && bomItems.length === 0"
            title="暂无BOM条目"
            description="点击上方「新增条目」或「导入Excel/CSV」添加BOM数据"
            icon="Box"
            action-text="新增条目"
            @action="openBomDialog()"
          />
        </div>
      </el-tab-pane>

      <!-- ---------- Tab3 层级结构 ---------- -->
      <el-tab-pane name="hierarchy">
        <template #label>
          <span class="tab-label">
            <span
              class="tab-dot"
              :class="{ complete: tabComplete.hierarchy }"
            />
            层级结构
          </span>
        </template>
        <div>
          <el-card shadow="never">
            <template #header>
              <span>组件层级关系</span>
            </template>

            <!-- 父模块路径面包屑 -->
            <div
              v-if="!isNew && ancestorChain.length > 0"
              class="hierarchy-path"
            >
              <span class="path-label">当前层级位置：</span>
              <el-breadcrumb separator="/">
                <el-breadcrumb-item
                  v-for="ancestor in ancestorChain"
                  :key="ancestor.id"
                  :to="{ path: `/module/${ancestor.id}/edit` }"
                >
                  {{ ancestor.nameZh }}
                </el-breadcrumb-item>
                <el-breadcrumb-item class="current-node">
                  {{ form.nameZh || '当前组件' }}
                </el-breadcrumb-item>
              </el-breadcrumb>
            </div>

            <!-- 层级树 -->
            <div
              v-if="!isNew"
              class="hierarchy-tree-section"
            >
              <el-tree
                :data="hierarchyTreeData"
                :props="{ label: 'label', children: 'children' }"
                node-key="id"
                default-expand-all
                :expand-on-click-node="false"
                :highlight-current="true"
                @node-click="handleHierarchyNodeClick"
              >
                <template #default="{ data, node }">
                  <div
                    class="hierarchy-tree-node"
                    :class="{ 'is-current': data.id === moduleId, 'is-root': node.level === 1 }"
                  >
                    <div class="node-icon">
                      <el-icon :size="16">
                        <Box v-if="node.level === 1" />
                        <Folder v-else-if="data.children && data.children.length > 0" />
                        <Document v-else />
                      </el-icon>
                    </div>
                    <div class="node-content">
                      <div class="node-main">
                        <span class="node-drawing">{{ data.drawingNo }}</span>
                        <span class="node-name">{{ data.nameZh }}</span>
                      </div>
                      <div class="node-meta">
                        <el-tag
                          size="small"
                          type="info"
                          effect="plain"
                          class="node-count"
                        >
                          <el-icon><List /></el-icon>
                          {{ data.bomCount }} 条BOM
                        </el-tag>
                        <el-tag
                          v-if="data.id === moduleId"
                          size="small"
                          type="success"
                          effect="dark"
                          class="node-current"
                        >
                          <el-icon><Location /></el-icon>
                          当前
                        </el-tag>
                      </div>
                    </div>
                  </div>
                </template>
              </el-tree>
            </div>

            <el-divider />

            <!-- 子模块列表 -->
            <div class="child-section">
              <div class="child-header">
                <span>子组件（{{ childModules.length }}）</span>
                <el-button
                  type="primary"
                  size="small"
                  :disabled="isNew"
                  @click="addChildDialogVisible = true"
                >
                  <el-icon><Plus /></el-icon>添加子组件
                </el-button>
                <el-button
                  size="small"
                  :disabled="isNew"
                  @click="moveDialogVisible = true"
                >
                  <el-icon><Position /></el-icon>移动到...
                </el-button>
              </div>

              <el-table
                v-if="childModules.length > 0"
                :data="childModules"
                stripe
                border
              >
                <el-table-column
                  prop="drawingNo"
                  label="图号"
                  width="140"
                />
                <el-table-column
                  prop="nameZh"
                  label="中文名"
                  width="180"
                />
                <el-table-column
                  label="BOM条目数"
                  width="120"
                  align="center"
                >
                  <template #default="{ row }">
                    {{ childBomCountMap.get(row.id) ?? '...' }}
                  </template>
                </el-table-column>
                <el-table-column
                  label="操作"
                  width="150"
                >
                  <template #default="{ row }">
                    <el-button
                      link
                      type="primary"
                      @click="router.push(`/module/${row.id}/edit`)"
                    >
                      查看
                    </el-button>
                    <el-button
                      link
                      type="danger"
                      @click="handleRemoveChild(row)"
                    >
                      移除
                    </el-button>
                  </template>
                </el-table-column>
              </el-table>
              <EmptyState
                v-else-if="!isNew"
                title="暂无子组件"
                description="点击「添加子组件」按钮关联下级组件"
                icon="Box"
              />
            </div>
          </el-card>
        </div>
      </el-tab-pane>

      <!-- ---------- Tab4 BOM总览（保留现有功能） ---------- -->
      <el-tab-pane name="overview">
        <template #label>
          <span class="tab-label">
            <span class="tab-dot" />
            BOM总览
          </span>
        </template>
        <ModuleOverviewPane
          ref="overviewPaneRef"
          :module-id="moduleId"
          :is-new="isNew"
          :visible-fields="visibleFields"
        />
      </el-tab-pane>

      <!-- ---------- Tab5 更改历史 ---------- -->
      <el-tab-pane name="history">
        <template #label>
          <span class="tab-label">
            <span
              class="tab-dot"
              :class="{ complete: tabComplete.history }"
            />
            更改历史
          </span>
        </template>
        <div>
          <ChangeHistoryList
            :records="changeHistoryList"
            show-rollback
            @rollback="handleRollbackHistory"
          />
        </div>
      </el-tab-pane>

      <!-- ---------- Tab: BOM版本 ---------- -->
      <el-tab-pane name="versions">
        <template #label>
          <span class="tab-label">
            <span
              class="tab-dot"
              :class="{ complete: bomVersions.length > 0 }"
            />
            BOM版本 <span
              v-if="bomVersions.length > 0"
              class="tab-count"
            >({{ bomVersions.length }})</span>
          </span>
        </template>
        <div class="versions-tab-content">
          <BomVersionPanel
            :versions="bomVersions"
            show-create-button
            :create-disabled="isNew || bomItems.length === 0"
            @create="openCreateVersionDialog"
            @rollback="handleRollbackToVersion"
            @delete="deleteVersion"
          />
        </div>
      </el-tab-pane>
    </el-tabs>

    <!-- ===== 底部固定操作栏 ===== -->
    <div class="editor-footer">
      <div class="footer-left">
        <span class="footer-info">{{ isNew ? '新建组件' : `${form.drawingNo} - ${form.nameZh}` }}</span>
      </div>
      <div class="footer-right">
        <el-button @click="handleBack">
          返回
        </el-button>
        <el-button
          :icon="RefreshLeft"
          :disabled="!canUndo"
          @click="undo"
        >
          撤销
        </el-button>
        <el-button
          :icon="RefreshRight"
          :disabled="!canRedo"
          @click="redo"
        >
          重做
        </el-button>
        <el-button
          type="primary"
          :loading="saving"
          :disabled="!dirty && !isNew"
          @click="handleSave"
        >
          <el-icon><Check /></el-icon>保存
        </el-button>
      </div>
    </div>

    <!-- ===== 批量操作栏 ===== -->
    <BatchActionBar
      :visible="selectedBomItems.length > 0"
      :selected-count="selectedBomItems.length"
      :total-count="bomItems.length"
      :actions="batchActions"
      @action="handleBatchAction"
      @clear="clearBomSelection"
    />

    <!-- ===== BOM条目 新增/编辑弹窗 ===== -->
    <el-dialog
      v-model="bomDialogVisible"
      :title="bomEditingItem ? '编辑BOM条目' : '新增BOM条目'"
      width="680px"
      @closed="resetBomForm"
    >
      <!-- 编辑现有条目：严格模式提示 -->
      <el-alert
        v-if="bomEditingItem"
        type="info"
        :closable="false"
        style="margin-bottom: 16px"
      >
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
          <span>零件库参数为严格模式，本页面只读，请到零件库管理页面修改零件参数。</span>
          <el-button
            type="primary"
            size="small"
            @click="goEditPartInLibrary"
          >
            在零件库中编辑
          </el-button>
        </div>
      </el-alert>

      <!-- 新增条目：选择方式切换 -->
      <div
        v-if="!bomEditingItem"
        class="bom-select-mode"
      >
        <el-radio-group v-model="bomSelectMode">
          <el-radio value="library">
            从零件库选择
          </el-radio>
          <el-radio value="direct">
            直接输入参数
          </el-radio>
        </el-radio-group>
      </div>

      <!-- 从零件库选择：可搜索下拉 -->
      <PartPickerSelect
        v-if="!bomEditingItem && bomSelectMode === 'library'"
        ref="partPickerRef"
        v-model="selectedPartId"
        @pick="onPickPartFromLibrary"
      />

      <el-form
        ref="bomFormRef"
        :model="bomForm"
        :rules="bomRules"
        label-width="90px"
      >
        <el-form-item
          v-for="field in visibleFields"
          :key="field.key"
          :label="field.label"
          :prop="field.key"
        >
          <template v-if="isFieldReadonly(field.key)">
            <span class="readonly-field-text">{{ bomForm[field.key] || '—' }}</span>
          </template>
          <template v-else>
            <el-radio-group
              v-if="field.key === 'type'"
              v-model="bomForm[field.key]"
            >
              <el-radio value="assembly">
                装配
              </el-radio>
              <el-radio value="order">
                下单
              </el-radio>
              <el-radio value="both">
                两者
              </el-radio>
            </el-radio-group>
            <el-input-number
              v-else-if="field.key === 'quantity' || field.fieldType === 'number'"
              v-model="bomForm[field.key]"
              :min="0"
              :precision="2"
              :step="1"
              style="width: 50%"
            />
            <el-select
              v-else-if="field.fieldType === 'select'"
              v-model="bomForm[field.key]"
              placeholder="请选择"
              style="width: 100%"
              clearable
            >
              <el-option
                v-for="opt in getSelectOptions(field.key)"
                :key="opt.value"
                :label="opt.label"
                :value="opt.value"
              />
            </el-select>
            <el-input
              v-else
              v-model="bomForm[field.key]"
              :placeholder="`请输入${field.label}`"
            />
          </template>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="bomDialogVisible = false">
          取消
        </el-button>
        <el-button
          type="primary"
          @click="handleSaveBomItem"
        >
          确定
        </el-button>
      </template>
    </el-dialog>

    <!-- ===== 批量修改类型弹窗 ===== -->
    <el-dialog
      v-model="batchTypeDialogVisible"
      title="批量修改BOM类型"
      width="420px"
    >
      <p style="margin-bottom: 16px; color: #606266;">
        将选中的 <strong>{{ selectedBomItems.length }}</strong> 条BOM条目的类型修改为：
      </p>
      <el-radio-group
        v-model="batchTypeValue"
        style="margin-bottom: 8px;"
      >
        <el-radio value="assembly">
          装配
        </el-radio>
        <el-radio value="order">
          下单
        </el-radio>
        <el-radio value="both">
          两者
        </el-radio>
      </el-radio-group>
      <template #footer>
        <el-button @click="batchTypeDialogVisible = false">
          取消
        </el-button>
        <el-button
          type="primary"
          @click="handleBatchUpdateType"
        >
          确定修改
        </el-button>
      </template>
    </el-dialog>

    <!-- ===== 操作备注弹窗 ===== -->
    <el-dialog
      v-model="remarkDialogVisible"
      :title="remarkDialogTitle"
      width="480px"
      :close-on-click-modal="false"
    >
      <el-form label-width="80px">
        <el-form-item label="备注">
          <el-input
            v-model="operationRemark"
            type="textarea"
            :rows="4"
            placeholder="请输入本次操作的备注说明（可选）"
            maxlength="500"
            show-word-limit
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="remarkDialogVisible = false">
          取消
        </el-button>
        <el-button
          type="primary"
          @click="confirmWithRemark"
        >
          确定
        </el-button>
      </template>
    </el-dialog>

    <!-- ===== 导入弹窗（增强版：3步骤） ===== -->
    <el-dialog
      v-model="importDialogVisible"
      title="导入BOM"
      width="760px"
      @closed="resetImport"
    >
      <!-- 步骤指示器 -->
      <el-steps
        :active="importStep"
        finish-status="success"
        align-center
        style="margin-bottom: 24px"
      >
        <el-step title="选择文件" />
        <el-step title="字段映射" />
        <el-step title="数据校验" />
      </el-steps>

      <!-- 步骤1：上传 -->
      <div v-if="importStep === 1">
        <el-upload
          drag
          :auto-upload="false"
          :show-file-list="false"
          accept=".xlsx,.xls,.csv"
          :on-change="handleFileChange"
        >
          <el-icon class="el-icon--upload">
            <UploadFilled />
          </el-icon>
          <div class="el-upload__text">
            将文件拖到此处，或<em>点击上传</em>
          </div>
          <template #tip>
            <div class="el-upload__tip">
              支持 .xlsx / .xls / .csv 格式，第一行为表头
            </div>
          </template>
        </el-upload>
        <div
          v-if="importFileName"
          class="import-file-name"
        >
          已选择：{{ importFileName }}
        </div>
      </div>

      <!-- 步骤2：预览 + 字段映射 -->
      <div v-else-if="importStep === 2">
        <el-alert
          type="info"
          :closable="false"
          style="margin-bottom: 16px"
        >
          识别到 {{ parsedColumns.length }} 列，共 {{ parsedRows.length }} 行数据。请确认字段映射。
        </el-alert>

        <div class="import-columns">
          <span class="import-columns-label">识别列名：</span>
          <el-tag
            v-for="col in parsedColumns"
            :key="col.name"
            size="small"
            class="col-tag"
          >
            {{ col.label }}
          </el-tag>
        </div>

        <!-- 数据预览（前10行） -->
        <div class="import-preview-label">
          数据预览（前10行）：
        </div>
        <el-table
          :data="parsedRows.slice(0, 10)"
          border
          size="small"
          style="margin: 8px 0 16px"
          max-height="240"
        >
          <el-table-column
            v-for="col in parsedColumns"
            :key="col.name"
            :prop="col.name"
            :label="col.label"
            min-width="120"
            show-overflow-tooltip
          />
        </el-table>

        <el-divider content-position="left">
          字段映射（左右对照）
        </el-divider>

        <div class="import-mapping-grid">
          <div class="mapping-col">
            <div class="mapping-col-title">
              系统字段
            </div>
            <div
              v-for="field in importableFields"
              :key="field.key"
              class="mapping-field-item"
              :class="{ matched: fieldMapping[field.key] }"
            >
              <span class="field-name">{{ field.label }}</span>
              <el-select
                v-model="fieldMapping[field.key]"
                placeholder="不导入"
                clearable
                size="small"
                style="width: 160px"
              >
                <el-option
                  v-for="col in parsedColumns"
                  :key="col.name"
                  :label="col.label"
                  :value="col.name"
                />
              </el-select>
            </div>
          </div>
          <div class="mapping-col">
            <div class="mapping-col-title">
              导入类型
            </div>
            <el-radio-group v-model="importType">
              <el-radio value="assembly">
                装配
              </el-radio>
              <el-radio value="order">
                下单
              </el-radio>
              <el-radio value="both">
                两者
              </el-radio>
            </el-radio-group>
          </div>
        </div>
      </div>

      <!-- 步骤3：数据校验 -->
      <div v-else-if="importStep === 3">
        <div
          v-if="importValidating"
          class="import-validating"
        >
          <el-icon class="spin">
            <Loading />
          </el-icon>
          <span>正在校验数据...</span>
          <el-progress
            :percentage="importValidateProgress"
            :stroke-width="6"
            style="width: 300px; margin-top: 12px"
          />
        </div>
        <div v-else>
          <el-alert
            :type="importErrors.length === 0 ? 'success' : 'warning'"
            :closable="false"
            style="margin-bottom: 16px"
          >
            校验完成：共 {{ parsedRows.length }} 行，有效 {{ importValidCount }} 行，错误 {{ importErrors.length }} 行。
          </el-alert>

          <div
            v-if="importErrors.length > 0"
            class="import-errors"
          >
            <div class="import-errors-header">
              <span>错误明细（{{ importErrors.length }} 行）</span>
              <el-button
                size="small"
                type="primary"
                link
                @click="exportImportErrors"
              >
                导出错误行
              </el-button>
            </div>
            <el-table
              :data="importErrors"
              border
              size="small"
              max-height="240"
            >
              <el-table-column
                prop="rowNum"
                label="行号"
                width="80"
                align="center"
              />
              <el-table-column
                prop="reason"
                label="错误原因"
                min-width="300"
              />
            </el-table>
          </div>

          <div
            v-if="importValidCount > 0"
            class="import-valid-preview"
          >
            <div class="import-preview-label">
              有效数据预览（前5行）：
            </div>
            <el-table
              :data="importValidRows.slice(0, 5)"
              border
              size="small"
              max-height="200"
            >
              <el-table-column
                v-for="field in importableFields"
                :key="field.key"
                :prop="field.key"
                :label="field.label"
                min-width="100"
                show-overflow-tooltip
              />
              <el-table-column
                prop="type"
                label="类型"
                width="80"
              >
                <template #default="{ row }">
                  {{ getBomTypeCfg(row.type).label }}
                </template>
              </el-table-column>
            </el-table>
          </div>
        </div>
      </div>

      <template #footer>
        <template v-if="importStep === 1">
          <el-button @click="importDialogVisible = false">
            取消
          </el-button>
        </template>
        <template v-else-if="importStep === 2">
          <el-button @click="importStep = 1">
            上一步
          </el-button>
          <el-button
            type="primary"
            @click="validateImportData"
          >
            下一步：数据校验
          </el-button>
        </template>
        <template v-else-if="importStep === 3">
          <el-button @click="importStep = 2">
            上一步
          </el-button>
          <el-button
            type="primary"
            :loading="importing"
            :disabled="importValidCount === 0"
            @click="handleConfirmImport"
          >
            确认导入（{{ importValidCount }} 行）
          </el-button>
        </template>
      </template>
    </el-dialog>

    <!-- ===== 同图号/物料冲突解决对话框 ===== -->
    <el-dialog
      v-model="conflictDialogVisible"
      :title="conflictSource === 'import' ? '导入数据冲突确认' : '保存数据冲突确认'"
      width="900px"
      :close-on-click-modal="false"
    >
      <div class="conflict-intro">
        <el-alert
          type="warning"
          :closable="false"
          :title="conflictSource === 'import'
            ? `检测到 ${conflicts.length} 个同图号或同物料/目录号零件与系统已有数据（零件库/其他组件）不一致，请选择处理方式`
            : `检测到 ${conflicts.length} 个同图号或同物料/目录号零件与系统已有数据（零件库/其他组件）不一致，请选择处理方式`"
        />
      </div>

      <div class="conflict-toolbar">
        <span class="conflict-count">共 {{ conflicts.length }} 个冲突</span>
        <div class="conflict-actions">
          <el-button
            size="small"
            :type="conflictAllAction === 'keep' ? 'primary' : ''"
            @click="setAllConflictAction('keep')"
          >
            全部保留库里参数(数量用新的)
          </el-button>
          <el-button
            size="small"
            :type="conflictAllAction === 'overwrite' ? 'primary' : ''"
            @click="setAllConflictAction('overwrite')"
          >
            全部用新数据覆盖
          </el-button>
        </div>
      </div>

      <div class="conflict-list">
        <div
          v-for="(conflict, idx) in conflicts"
          :key="conflict.drawingNo"
          class="conflict-item"
        >
          <div class="conflict-header">
            <span class="conflict-index">{{ idx + 1 }}.</span>
            <span class="conflict-drawing-no">{{ conflict.drawingNo }}</span>
            <el-tag
              v-if="conflict.conflictSource === 'partsLibrary'"
              size="small"
              type="warning"
              effect="light"
            >
              零件库
            </el-tag>
            <el-tag
              v-else-if="conflict.conflictSource === 'otherModule'"
              size="small"
              type="info"
              effect="light"
            >
              其他组件
            </el-tag>
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
                  保留库里参数(数量用新的)
                </el-radio>
                <el-radio value="overwrite">
                  全部用新数据覆盖
                </el-radio>
              </el-radio-group>
            </div>
          </div>
          <div class="conflict-diff-table">
            <el-table
              :data="conflict.diffs"
              size="small"
              border
            >
              <el-table-column
                prop="label"
                label="字段名"
                width="140"
              />
              <el-table-column
                label="库里的值"
                min-width="180"
              >
                <template #default="{ row }">
                  <span class="old-value">{{ row.oldValue !== undefined && row.oldValue !== null && row.oldValue !== '' ? row.oldValue : '(空)' }}</span>
                </template>
              </el-table-column>
              <el-table-column
                label="新导入的值"
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
        <el-button @click="conflictDialogVisible = false">
          取消
        </el-button>
        <el-button
          type="primary"
          :loading="importing"
          @click="applyConflictResolution"
        >
          {{ conflictSource === 'import' ? '确认并导入' : '确认并保存' }}
        </el-button>
      </template>
    </el-dialog>

    <!-- ===== 导出弹窗（公共组件） ===== -->
    <BomExportDialog
      v-model:visible="exportDialogVisible"
      title="导出BOM"
      :fields="exportFieldsForDialog"
      :default-selected="defaultExportSelected"
      storage-key="module_export_fields"
      :default-file-name="exportDefaultFileName"
      :selected-count="selectedBomItems.length"
      show-stats
      :stats="exportStats"
      :exporting="exporting"
      @export="handleConfirmExport"
    />

    <!-- ===== 添加子模块弹窗 ===== -->
    <el-dialog
      v-model="addChildDialogVisible"
      title="添加子组件"
      width="500px"
    >
      <el-select
        v-model="selectedChildId"
        placeholder="选择要添加的子组件"
        filterable
        style="width: 100%"
      >
        <el-option
          v-for="mod in availableChildModules"
          :key="mod.id"
          :label="`${mod.drawingNo} - ${mod.nameZh}`"
          :value="mod.id"
        />
      </el-select>
      <template #footer>
        <el-button @click="addChildDialogVisible = false">
          取消
        </el-button>
        <el-button
          type="primary"
          :disabled="!selectedChildId"
          @click="handleAddChild"
        >
          确定
        </el-button>
      </template>
    </el-dialog>

    <!-- ===== 移动到...弹窗 ===== -->
    <el-dialog
      v-model="moveDialogVisible"
      title="移动组件到..."
      width="500px"
    >
      <el-tree-select
        v-model="moveToParentId"
        :data="moveTargetTreeData"
        :props="{ label: 'label', children: 'children' }"
        placeholder="选择新父组件（留空为提升为顶层）"
        clearable
        filterable
        check-strictly
        style="width: 100%"
      />
      <div style="margin-top: 8px; color: #909399; font-size: 13px;">
        移动后当前组件将从原父组件移除，挂载到新父组件下。
      </div>
      <template #footer>
        <el-button @click="moveDialogVisible = false">
          取消
        </el-button>
        <el-button
          type="primary"
          @click="confirmMoveModule"
        >
          确定移动
        </el-button>
      </template>
    </el-dialog>

    <!-- ===== 打印预览对话框 ===== -->
    <PrintPreviewDialog
      ref="printDialogRef"
      :title="`组件 ${form.drawingNo} - ${form.nameZh}`"
    >
      <!-- 基本信息 -->
      <div class="print-section">
        <div class="print-section-title">
          组件基本信息
        </div>
        <table class="print-info-table">
          <tbody>
            <tr>
              <td class="label">
                图号
              </td><td>{{ form.drawingNo }}</td>
            </tr>
            <tr>
              <td class="label">
                中文名称
              </td><td>{{ form.nameZh }}</td>
            </tr>
            <tr>
              <td class="label">
                英文名称
              </td><td>{{ form.nameEn || '-' }}</td>
            </tr>
            <tr>
              <td class="label">
                所属设备
              </td><td>{{ printEquipmentName }}</td>
            </tr>
            <tr>
              <td class="label">
                父组件
              </td><td>{{ printParentName }}</td>
            </tr>
            <tr>
              <td class="label">
                备注
              </td><td>{{ form.remark || '-' }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 层级结构 -->
      <div
        v-if="printHierarchy.length > 0"
        class="print-section"
      >
        <div class="print-section-title">
          组件层级结构
        </div>
        <div
          v-for="node in printHierarchy"
          :key="node.id"
          :class="['print-tree-item', `print-tree-level-${Math.min(node.depth, 4)}`]"
        >
          {{ node.drawingNo }} - {{ node.nameZh }}
        </div>
      </div>

      <!-- BOM 明细 -->
      <div class="print-section">
        <div class="print-section-title">
          BOM 明细（共 {{ bomItems.length }} 条）
        </div>
        <BomPrintTable
          :rows="bomItems"
          template-type="module"
        />
      </div>
    </PrintPreviewDialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted, nextTick } from 'vue'
import { useRoute, useRouter, onBeforeRouteLeave } from 'vue-router'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import {
  ArrowLeft, Check, Plus, Upload, Download, UploadFilled,
  Search, Loading, CircleCheck, CircleClose, RefreshLeft, RefreshRight, Box, Position, Printer,
  Folder, Document, List, Location
} from '@element-plus/icons-vue'
import dayjs from 'dayjs'
import { useModulesStore } from '@/stores/modules'
import { useEquipmentStore } from '@/stores/equipment'
import { useTagsStore } from '@/stores/tags'
import { BOM_TYPE_CONFIG } from '@/utils/bomGenerator'
import { useBomTemplatesStore } from '@/stores/bomTemplates'
import { parseFile } from '@/utils/importParser'
import { exportToExcel, isElectronEnvironment } from '@/utils/excel'
import type { Module, BomItem, OrderBomItem, BomTemplateField, ChangeRecord, BomVersion, Part } from '@/types'
import { useBomVersionsStore } from '@/stores/bomVersions'
import { usePartsStore } from '@/stores/parts'

// 通用组件
import BomTable from '@/components/common/BomTable.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import BatchActionBar from '@/components/common/BatchActionBar.vue'
import type { BatchAction } from '@/components/common/BatchActionBar.vue'
import PrintPreviewDialog from '@/components/common/PrintPreviewDialog.vue'
import BomPrintTable from '@/components/common/BomPrintTable.vue'
import ChangeHistoryList from '@/components/common/ChangeHistoryList.vue'
import BomVersionPanel from '@/components/common/BomVersionPanel.vue'
import BomExportDialog, { type BomExportConfig } from '@/components/common/BomExportDialog.vue'
import PartPickerSelect from '@/components/common/PartPickerSelect.vue'
import ModuleOverviewPane from './ModuleOverviewPane.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'

// Composables
import { useKeyboardShortcuts } from '@/composables/useKeyboardShortcuts'
import { useAutoSave } from '@/composables/useAutoSave'
import { useUndoRedo } from '@/composables/useUndoRedo'
import { useTabSync } from '@/composables/useTabSync'
import { useUniqueValidation } from '@/composables/useUniqueValidation'

// ==================== 类型定义 ====================
type BomTableRow = (BomItem | OrderBomItem) & { _rowStatus?: 'new' | 'modified' | 'deleted' }
type BomType = 'assembly' | 'order' | 'both'

interface EditorState {
  form: Record<string, any>
  bomItems: BomItem[]
  deletedBomIds: string[]
}

// ==================== 基础 ====================
const route = useRoute()
const router = useRouter()
const modulesStore = useModulesStore()
const equipmentStore = useEquipmentStore()
const tagsStore = useTagsStore()
const bomTemplatesStore = useBomTemplatesStore()
const bomVersionsStore = useBomVersionsStore()
const partsStore = usePartsStore()
const visibleFields = computed(() => bomTemplatesStore.getVisibleFieldsByType('module'))

const moduleId = computed(() => route.params.id as string)
const isNew = computed(() => moduleId.value === 'new' || !moduleId.value)

const activeTab = ref('basic')
const saving = ref(false)

// ==================== 操作备注 ====================
const remarkDialogVisible = ref(false)
const remarkDialogTitle = ref('操作备注')
const operationRemark = ref('')
let pendingOperation: (() => void) | null = null

function openRemarkDialog(title: string, operation: () => void) {
  remarkDialogTitle.value = title
  operationRemark.value = ''
  pendingOperation = operation
  remarkDialogVisible.value = true
}

function confirmWithRemark() {
  remarkDialogVisible.value = false
  if (pendingOperation) {
    const op = pendingOperation
    pendingOperation = null
    op()
  }
}

// ==================== 基本信息表单 ====================
const basicFormRef = ref<FormInstance>()
const basicCollapse = ref<string[]>(['props', 'relation'])

const form = reactive({
  drawingNo: '',
  nameZh: '',
  nameEn: '',
  equipmentId: '',
  configurationIds: [] as string[],
  tags: [] as string[],
  parentModuleIds: [] as string[],
  status: 'designing',
  remark: '',
  description: ''
})

const basicRules: FormRules = {
  drawingNo: [
    { required: true, message: '请输入图号', trigger: 'blur' },
    { validator: validateDrawingNoUnique, trigger: 'blur' }
  ],
  nameZh: [{ required: true, message: '请输入中文名', trigger: 'blur' }]
}

function validateDrawingNoUnique(_rule: unknown, value: string, callback: (err?: Error) => void) {
  if (!value) return callback()
  if (!modulesStore.isDrawingNoUnique(value, isNew.value ? undefined : moduleId.value)) {
    callback(new Error('图号已存在，请更换'))
  } else {
    callback()
  }
}

function validateDrawingNo() {
  if (!form.drawingNo) return
  if (!modulesStore.isDrawingNoUnique(form.drawingNo, isNew.value ? undefined : moduleId.value)) {
    ElMessage.warning('图号已存在，请更换')
  }
}

const availableConfigurations = computed(() => {
  if (!form.equipmentId) return []
  return equipmentStore.getConfigurationsByEquipment(form.equipmentId)
})

function handleEquipmentChange() {
  form.configurationIds = []
  markDirty()
}

const TAG_COLORS = ['#409eff', '#67c23a', '#e6a23c', '#f56c6c', '#909399', '#9c27b0', '#00bcd4', '#ff9800']

function handleCreateTag(tagName: string) {
  const color = TAG_COLORS[Math.floor(Math.random() * TAG_COLORS.length)]
  const newTag = tagsStore.addTag({ name: tagName, color })
  form.tags.push(newTag.id)
  markDirty()
}

// 模块状态
const moduleStatusType = computed(() => {
  const map: Record<string, string> = { designing: 'info', released: 'success', archived: 'warning', obsolete: 'danger' }
  return map[form.status] || 'info'
})
const moduleStatusLabel = computed(() => {
  const map: Record<string, string> = { designing: '设计中', released: '已发布', archived: '已归档', obsolete: '已作废' }
  return map[form.status] || form.status
})

// 父模块树数据
interface TreeNode {
  id: string
  label: string
  drawingNo: string
  nameZh: string
  children?: TreeNode[]
}

const parentModuleTreeData = computed<TreeNode[]>(() => {
  if (isNew.value || !form.equipmentId) return []
  const mods = modulesStore.getModulesByEquipment(form.equipmentId)
  const descendants = getDescendantIds(moduleId.value)
  const validMods = mods.filter((m) => m.id !== moduleId.value && !descendants.has(m.id))

  // 构建树
  const idToNode = new Map<string, TreeNode>()
  const roots: TreeNode[] = []
  for (const m of validMods) {
    idToNode.set(m.id, { id: m.id, label: `${m.drawingNo} - ${m.nameZh}`, drawingNo: m.drawingNo, nameZh: m.nameZh, children: [] })
  }
  for (const m of validMods) {
    const node = idToNode.get(m.id)!
    const parentIds = m.parentModuleIds || []
    let hasParent = false
    for (const parentId of parentIds) {
      if (idToNode.has(parentId)) {
        idToNode.get(parentId)!.children!.push(node)
        hasParent = true
      }
    }
    if (!hasParent) {
      roots.push(node)
    }
  }
  return roots
})

// ==================== 撤销/重做 ====================
const undoState = ref<EditorState>({ form: {}, bomItems: [], deletedBomIds: [] })
const { canUndo, canRedo, undo: undoRaw, redo: redoRaw, commit, clearHistory } = useUndoRedo(undoState)

function syncUndoState() {
  undoState.value = {
    form: JSON.parse(JSON.stringify(form)),
    bomItems: JSON.parse(JSON.stringify(bomItems.value)),
    deletedBomIds: Array.from(deletedBomIds.value)
  }
}

function undo() {
  if (!canUndo.value) return
  // 记录撤销前状态用于对比
  const prevBomCount = bomItems.value.length
  undoRaw()
  restoreFromUndoState()
  // 根据变化生成描述性消息
  const newBomCount = bomItems.value.length
  const diff = newBomCount - prevBomCount
  let msg = '已撤销'
  if (diff !== 0) {
    msg = diff > 0 ? `已撤销删除${Math.abs(diff)}行` : `已撤销新增${diff}行`
  }
  ElMessage({ message: msg, type: 'info', duration: 2000 })
}

function redo() {
  if (!canRedo.value) return
  const prevBomCount = bomItems.value.length
  redoRaw()
  restoreFromUndoState()
  const newBomCount = bomItems.value.length
  const diff = newBomCount - prevBomCount
  let msg = '已重做'
  if (diff !== 0) {
    msg = diff > 0 ? `已重做新增${diff}行` : `已重做删除${Math.abs(diff)}行`
  }
  ElMessage({ message: msg, type: 'info', duration: 2000 })
}

function restoreFromUndoState() {
  Object.assign(form, undoState.value.form)
  bomItems.value = [...undoState.value.bomItems]
  deletedBomIds.value = new Set(undoState.value.deletedBomIds || [])
}

function commitUndo() {
  syncUndoState()
  commit()
}

// ==================== Dirty 标记 & 自动保存 ====================
const dirty = ref(false)
const autoSaveSaving = ref(false)
const lastSavedTime = ref<string | null>(null)
const isLoading = ref(false)   // 初始加载时跳过watch
const isPersisting = ref(false) // 保存过程中跳过watch，防止无限循环

function markDirty() {
  if (isLoading.value || isPersisting.value) return
  dirty.value = true
}

// BOM数据
const bomItems = ref<BomTableRow[]>([])
const deletedBomIds = ref<Set<string>>(new Set())
const bomLoading = ref(false)

// 直接组合form和bomItems的引用（不做深拷贝），useAutoSave内部deep watch检测变化
const autoSaveData = computed(() => ({
  form,
  bomItems: bomItems.value,
  deletedBomIds: Array.from(deletedBomIds.value)
}))

// 初始加载期间禁用自动保存watch，避免加载触发误保存
const autoSaveEnabled = computed(() => !isLoading.value)

const { isSaving: autoIsSaving, dirty: autoSaveDirty } = useAutoSave({
  data: autoSaveData,
  saveFn: doAutoSave,
  interval: getAutoSaveInterval(),
  enabled: autoSaveEnabled
})

// 同步useAutoSave的dirty状态到本地dirty
watch(autoSaveDirty, (val) => {
  if (isLoading.value) return
  dirty.value = val
})

/** 从 localStorage 读取自动保存间隔（毫秒） */
function getAutoSaveInterval(): number {
  try {
    const saved = localStorage.getItem('bom-manager-autosave-interval')
    if (saved) {
      const ms = parseInt(saved, 10)
      if (!isNaN(ms) && ms > 0) return ms
      if (ms === -1) return 0 // 关闭自动保存
    }
  } catch { /* ignore */ }
  return 30000 // 默认30秒
}

watch(autoIsSaving, (val) => {
  autoSaveSaving.value = val
})

async function doAutoSave() {
  if (isNew.value) return
  if (!form.drawingNo || !form.nameZh) return // 不自动保存不完整的表单
  if (isPersisting.value) return
  isPersisting.value = true
  try {
    await persistModuleData('自动保存')
    lastSavedTime.value = new Date().toISOString()
    dirty.value = false
  } catch (err) {
    console.error('自动保存失败:', err)
  } finally {
    await nextTick()
    isPersisting.value = false
  }
}

const saveStatusText = computed(() => {
  if (autoSaveSaving.value) return '保存中...'
  if (saving.value) return '保存中...'
  if (dirty.value) return '有未保存更改'
  if (lastSavedTime.value) return `已保存 ${dayjs(lastSavedTime.value).format('HH:mm:ss')}`
  return '已保存'
})

// ==================== 多标签页同步 ====================
async function reloadFromDb() {
  if (isNew.value) return
  const mod = modulesStore.getModuleById(moduleId.value)
  if (mod) {
    Object.assign(form, {
      drawingNo: mod.drawingNo,
      nameZh: mod.nameZh,
      nameEn: mod.nameEn || '',
      equipmentId: mod.equipmentId || '',
      configurationIds: mod.configurationIds || [],
      tags: mod.tags || [],
      parentModuleIds: mod.parentModuleIds || [],
      status: (mod as any).status || 'designing',
      remark: mod.remark || '',
      description: (mod as any).description || ''
    })
  }
  const items = await modulesStore.getBomItems(moduleId.value)
  bomItems.value = items as BomTableRow[]
}

const tabSync = useTabSync({
  storageKey: 'module-editor',
  entityId: moduleId.value || 'new',
  onRefresh: reloadFromDb
})

// ==================== 实时唯一性校验 ====================
const drawingNoUnique = useUniqueValidation(
  () => modulesStore.isDrawingNoUnique(form.drawingNo, isNew.value ? undefined : moduleId.value),
  () => form.drawingNo
)

// ==================== 打印功能 ====================
const printDialogRef = ref<InstanceType<typeof PrintPreviewDialog> | null>(null)

const printEquipmentName = computed(() => {
  if (!form.equipmentId) return '-'
  const eq = equipmentStore.getEquipmentById(form.equipmentId)
  return eq ? `${eq.name} (${eq.model})` : '-'
})

const printParentName = computed(() => {
  const parentIds = form.parentModuleIds || []
  if (parentIds.length === 0) return '-'
  const parentNames = parentIds.map(pid => {
    const parent = modulesStore.getModuleById(pid)
    return parent ? `${parent.drawingNo} - ${parent.nameZh}` : pid
  })
  return parentNames.join('、')
})

/** 打印层级结构：从当前组件递归收集子组件树 */
const printHierarchy = computed(() => {
  if (isNew.value) return []
  const result: { id: string; drawingNo: string; nameZh: string; depth: number }[] = []
  const visited = new Set<string>() // 防止循环引用导致无限递归
  function walk(modId: string, depth: number) {
    if (visited.has(modId)) return
    visited.add(modId)
    const mod = modulesStore.getModuleById(modId)
    if (!mod) return
    result.push({ id: mod.id, drawingNo: mod.drawingNo, nameZh: mod.nameZh, depth })
    for (const childId of mod.childModuleIds || []) {
      walk(childId, depth + 1)
    }
  }
  walk(moduleId.value, 0)
  return result
})

function openModulePrint() {
  if (isNew.value) return
  printDialogRef.value?.open()
}

// ==================== 键盘快捷键 ====================
const { register } = useKeyboardShortcuts()

register('ctrl+s', () => { handleSave() })
register('ctrl+z', () => { undo() })
register('ctrl+y', () => { redo() })
register('ctrl+tab', (e) => {
  e.preventDefault()
  const tabs = ['basic', 'bom', 'hierarchy', 'overview', 'history']
  const idx = tabs.indexOf(activeTab.value)
  activeTab.value = tabs[(idx + 1) % tabs.length]
})
register('esc', () => {
  // 关闭所有弹窗
  if (bomDialogVisible.value) bomDialogVisible.value = false
  else if (importDialogVisible.value) importDialogVisible.value = false
  else if (exportDialogVisible.value) exportDialogVisible.value = false
  else if (batchTypeDialogVisible.value) batchTypeDialogVisible.value = false
  else if (remarkDialogVisible.value) remarkDialogVisible.value = false
  else if (addChildDialogVisible.value) addChildDialogVisible.value = false
})

// ==================== Tab 完成状态 ====================
const tabComplete = computed(() => ({
  basic: !!(form.drawingNo && form.nameZh),
  bom: bomItems.value.length > 0,
  hierarchy: !!(form.parentModuleIds && form.parentModuleIds.length > 0 || childModules.value.length > 0),
  history: changeHistoryList.value.length > 0
}))

// ==================== 保存逻辑 ====================
/** 校验所有 BOM 条目，返回错误数 */
function validateAllBomItems(): number {
  let errorCount = 0
  for (const item of bomItems.value) {
    // 数量必须 > 0
    if (!item.quantity || Number(item.quantity) <= 0) {
      errorCount++
    }
    // 中文描述必填
    if (!item.chineseDescription || !String(item.chineseDescription).trim()) {
      errorCount++
    }
  }
  return errorCount
}

function handleSave() {
  if (!basicFormRef.value) return
  basicFormRef.value.validate().then(() => {
    if (!modulesStore.isDrawingNoUnique(form.drawingNo, isNew.value ? undefined : moduleId.value)) {
      ElMessage.error('图号已存在')
      activeTab.value = 'basic'
      return
    }
    // BOM 条目校验汇总
    const bomErrors = validateAllBomItems()
    if (bomErrors > 0 && !isNew.value) {
      ElMessageBox.confirm(
        `BOM 表中有 ${bomErrors} 个字段未通过校验（数量需>0、中文描述必填）。是否仍要保存？`,
        '校验提示',
        {
          confirmButtonText: '仍要保存',
          cancelButtonText: '去修正',
          type: 'warning'
        }
      ).then(() => {
        openRemarkDialog(isNew.value ? '创建组件备注' : '保存修改备注', doSave)
      }).catch(() => {
        activeTab.value = 'bom'
      })
      return
    }
    openRemarkDialog(isNew.value ? '创建组件备注' : '保存修改备注', doSave)
  }).catch(() => {
    ElMessage.error('请完善必填项')
    activeTab.value = 'basic'
  })
}

async function doSave() {
  const remark = operationRemark.value
  saving.value = true
  isPersisting.value = true
  try {
    if (isNew.value) {
      const newMod = modulesStore.addModule({
        drawingNo: form.drawingNo,
        nameZh: form.nameZh,
        nameEn: form.nameEn,
        equipmentId: form.equipmentId,
        configurationIds: form.configurationIds,
        tags: form.tags,
        remark: form.remark,
        childModuleIds: []
      }, remark)
      ElMessage.success('创建成功')
      dirty.value = false
      lastSavedTime.value = new Date().toISOString()
      router.replace(`/module/${newMod.id}/edit`)
    } else {
      await persistModuleData(remark)
      ElMessage.success('保存成功')
      dirty.value = false
      lastSavedTime.value = new Date().toISOString()
    }
  } catch (error) {
    console.error('保存模块失败:', error)
    const msg = error instanceof Error ? error.message : String(error)
    ElMessage.error(`保存失败：${msg || '未知错误'}`)
  } finally {
    saving.value = false
    await nextTick()
    isPersisting.value = false
  }
}

/** 持久化模块数据（表单 + BOM） */
async function persistModuleData(remark: string) {
  // 保存表单
  await modulesStore.updateModule(moduleId.value, {
    drawingNo: form.drawingNo,
    nameZh: form.nameZh,
    nameEn: form.nameEn,
    equipmentId: form.equipmentId,
    configurationIds: form.configurationIds,
    tags: form.tags,
    remark: form.remark,
    parentModuleIds: form.parentModuleIds || []
  }, remark)

  // 保存BOM变更
  await persistBomChanges()
}

/** 持久化BOM变更（新增/修改/删除） */
async function persistBomChanges() {
  let hasStatusMarkers = false

  // 删除已移除的条目
  if (deletedBomIds.value.size > 0) {
    for (const id of deletedBomIds.value) {
      await modulesStore.deleteBomItem(moduleId.value, id)
    }
    deletedBomIds.value.clear()
    hasStatusMarkers = true
  }

  // 新增和修改
  for (const item of bomItems.value) {
    const row = item as BomTableRow
    const status = row._rowStatus
    if (status === 'new') {
      const { _rowStatus, ...clean } = row
      await modulesStore.addBomItem(moduleId.value, clean as Omit<BomItem, 'id'>)
      hasStatusMarkers = true
    } else if (status === 'modified') {
      const { _rowStatus, ...clean } = row
      await modulesStore.updateBomItem(moduleId.value, item.id, clean as Partial<BomItem>)
      hasStatusMarkers = true
    }
  }

  // 仅在有状态标记时才清除，避免创建新数组触发watch导致无限循环
  if (hasStatusMarkers) {
    isPersisting.value = true
    bomItems.value = bomItems.value.map((item) => {
      const { _rowStatus, ...rest } = item as BomTableRow
      return rest as BomItem
    })
    await nextTick()
    isPersisting.value = false
  }
}

// ==================== 离开提示 ====================
const isLeaving = ref(false) // 防止重复弹出离开确认框

onBeforeRouteLeave((_to, _from, next) => {
  if (isLeaving.value) {
    next()
    return
  }
  if (dirty.value) {
    ElMessageBox.confirm('有未保存的更改，确定离开吗？', '提示', {
      type: 'warning',
      confirmButtonText: '离开',
      cancelButtonText: '取消'
    }).then(() => {
      isLeaving.value = true
      next()
    }).catch(() => next(false))
  } else {
    next()
  }
})

function handleBack() {
  if (isLeaving.value) {
    router.back()
    return
  }
  if (dirty.value) {
    ElMessageBox.confirm('有未保存的更改，确定返回吗？', '提示', {
      type: 'warning',
      confirmButtonText: '离开',
      cancelButtonText: '取消'
    }).then(() => {
      isLeaving.value = true
      router.back()
    }).catch(() => {})
  } else {
    router.back()
  }
}

// ==================== Tab2 层级结构 ====================
const addChildDialogVisible = ref(false)
const selectedChildId = ref('')
const moveDialogVisible = ref(false)
const moveToParentId = ref('')

const currentModule = computed(() => {
  if (isNew.value) return undefined
  return modulesStore.getModuleById(moduleId.value)
})

const childModules = computed(() => {
  if (isNew.value) return []
  return modulesStore.getChildModules(moduleId.value)
})

const childBomCountMap = ref<Map<string, number>>(new Map())

async function loadChildBomCounts() {
  if (childModules.value.length === 0) {
    childBomCountMap.value = new Map()
    return
  }
  const results = await Promise.all(
    childModules.value.map(async (m) => ({
      moduleId: m.id,
      count: (await modulesStore.getBomItems(m.id)).length
    }))
  )
  const map = new Map<string, number>()
  results.forEach((r) => map.set(r.moduleId, r.count))
  childBomCountMap.value = map
}

watch(childModules, () => { loadChildBomCounts() }, { immediate: true })

const ancestorChain = computed(() => {
  const chain: Module[] = []
  if (isNew.value || !currentModule.value) return chain
  const parentIds = currentModule.value.parentModuleIds || []
  if (parentIds.length === 0) return chain
  // 只显示第一个父模块的祖先链
  let parentId: string | undefined = parentIds[0]
  const visited = new Set<string>()
  while (parentId && !visited.has(parentId)) {
    visited.add(parentId)
    const parent = modulesStore.getModuleById(parentId)
    if (!parent) break
    chain.unshift(parent)
    const nextParentIds = parent.parentModuleIds || []
    parentId = nextParentIds.length > 0 ? nextParentIds[0] : undefined
  }
  return chain
})

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

// 层级树数据
interface HierarchyTreeNode {
  id: string
  label: string
  drawingNo: string
  nameZh: string
  bomCount: number
  children: HierarchyTreeNode[]
}

const hierarchyTreeData = computed<HierarchyTreeNode[]>(() => {
  if (isNew.value || !currentModule.value) return []
  // 找到根节点（只追踪第一个父模块）
  let root: Module | undefined = currentModule.value
  const visited = new Set<string>()
  while (root && root.parentModuleIds && root.parentModuleIds.length > 0) {
    if (visited.has(root.id)) break
    visited.add(root.id)
    const parent = modulesStore.getModuleById(root.parentModuleIds[0])
    if (!parent) break
    root = parent
  }
  return root ? [buildHierarchyNode(root)].filter((n): n is HierarchyTreeNode => n !== null) : []
})

function buildHierarchyNode(mod: Module, visited: Set<string> = new Set()): HierarchyTreeNode | null {
  if (visited.has(mod.id)) return null // 防止循环引用导致无限递归
  visited.add(mod.id)
  const children = mod.childModuleIds
    .map((id) => modulesStore.getModuleById(id))
    .filter((m): m is Module => !!m)
    .map((m) => buildHierarchyNode(m, new Set(visited)))
    .filter((n): n is HierarchyTreeNode => n !== null)
  const bomCount = childBomCountMap.value.get(mod.id) ?? 0
  return {
    id: mod.id,
    label: `${mod.drawingNo} - ${mod.nameZh}`,
    drawingNo: mod.drawingNo,
    nameZh: mod.nameZh,
    bomCount,
    children
  }
}

function handleHierarchyNodeClick(data: HierarchyTreeNode) {
  if (data.id !== moduleId.value) {
    router.push(`/module/${data.id}/edit`)
  }
}

const availableParentModules = computed(() => {
  if (isNew.value || !form.equipmentId) return []
  const descendants = getDescendantIds(moduleId.value)
  return modulesStore.getModulesByEquipment(form.equipmentId).filter(
    (m) => m.id !== moduleId.value && !descendants.has(m.id)
  )
})

const availableChildModules = computed(() => {
  if (isNew.value || !form.equipmentId) return []
  const currentChildren = new Set(currentModule.value?.childModuleIds || [])
  const ancestors = new Set(ancestorChain.value.map((m) => m.id))
  return modulesStore.getModulesByEquipment(form.equipmentId).filter(
    (m) => m.id !== moduleId.value && !currentChildren.has(m.id) && !ancestors.has(m.id)
  )
})

function handleParentChange(newParentIds: string[]) {
  if (isNew.value) return
  // 循环检测：防止将组件设为自己后代的子组件
  for (const newParentId of newParentIds) {
    if (newParentId && modulesStore.wouldCreateCycle(moduleId.value, newParentId)) {
      ElMessage.error('不能将组件设置为自己的后代组件的子组件')
      form.parentModuleIds = currentModule.value?.parentModuleIds || []
      return
    }
  }
  markDirty()
  ElMessage.success('父模块已更新（保存后生效）')
}

function handleRemoveChild(child: Module) {
  if (!currentModule.value) return
  currentModule.value.childModuleIds = currentModule.value.childModuleIds.filter((id) => id !== child.id)
  // 从子组件的父模块列表中移除当前模块
  const newParentIds = (child.parentModuleIds || []).filter(pid => pid !== moduleId.value)
  modulesStore.updateModule(child.id, { parentModuleIds: newParentIds })
  ElMessage.success(`已移除子组件：${child.nameZh}`)
}

function handleAddChild() {
  if (!selectedChildId.value || !currentModule.value) return
  const child = modulesStore.getModuleById(selectedChildId.value)
  if (!child) return
  // 循环检测
  if (modulesStore.wouldCreateCycle(child.id, moduleId.value)) {
    ElMessage.error('不能将该组件添加为子组件，会形成循环引用')
    return
  }
  // 多父模块：不需要移除旧的父模块关系，只添加新的
  if (!currentModule.value.childModuleIds.includes(child.id)) {
    currentModule.value.childModuleIds.push(child.id)
  }
  const newParentIds = child.parentModuleIds || []
  if (!newParentIds.includes(moduleId.value)) {
    newParentIds.push(moduleId.value)
  }
  modulesStore.updateModule(child.id, { parentModuleIds: newParentIds })
  ElMessage.success(`已添加子组件：${child.nameZh}`)
  addChildDialogVisible.value = false
  selectedChildId.value = ''
}

// 移动目标树数据（排除当前组件及其后代，防止循环）
const moveTargetTreeData = computed<TreeNode[]>(() => {
  if (isNew.value || !form.equipmentId) return []
  const mods = modulesStore.getModulesByEquipment(form.equipmentId)
  const descendants = getDescendantIds(moduleId.value)
  const validMods = mods.filter((m) => m.id !== moduleId.value && !descendants.has(m.id))

  const idToNode = new Map<string, TreeNode>()
  const roots: TreeNode[] = []
  for (const m of validMods) {
    idToNode.set(m.id, { id: m.id, label: `${m.drawingNo} - ${m.nameZh}`, drawingNo: m.drawingNo, nameZh: m.nameZh, children: [] })
  }
  for (const m of validMods) {
    const node = idToNode.get(m.id)!
    const parentIds = m.parentModuleIds || []
    let hasParent = false
    for (const parentId of parentIds) {
      if (idToNode.has(parentId)) {
        idToNode.get(parentId)!.children!.push(node)
        hasParent = true
      }
    }
    if (!hasParent) {
      roots.push(node)
    }
  }
  return roots
})

async function confirmMoveModule() {
  if (!currentModule.value) return
  const newParentId = moveToParentId.value || null
  // 循环检测
  if (newParentId && modulesStore.wouldCreateCycle(moduleId.value, newParentId)) {
    ElMessage.error('不能将组件设置为自己的后代组件的子组件')
    return
  }
  try {
    await modulesStore.moveModule(moduleId.value, newParentId)
    form.parentModuleIds = newParentId ? [newParentId] : []
    ElMessage.success(newParentId ? '组件已移动' : '组件已提升为顶层')
    moveDialogVisible.value = false
    moveToParentId.value = ''
    markDirty()
  } catch (e: any) {
    ElMessage.error(e.message || '移动失败')
  }
}

// ==================== BOM总览（已拆分为 ModuleOverviewPane） ====================
const overviewPaneRef = ref<InstanceType<typeof ModuleOverviewPane> | null>(null)

watch(activeTab, (val) => {
  if (val === 'overview') overviewPaneRef.value?.load()
})

// ==================== Tab3 BOM管理 ====================
const bomDialogVisible = ref(false)
const bomFormRef = ref<FormInstance>()
const bomEditingItem = ref<BomItem | null>(null)
const selectedBomItems = ref<BomTableRow[]>([])
const batchTypeDialogVisible = ref(false)
const batchTypeValue = ref<BomType>('order')

// ===== 零件库选择（严格模式） =====
const bomSelectMode = ref<'library' | 'direct'>('library')
const selectedPartId = ref<string>('')
const partPickerRef = ref<InstanceType<typeof PartPickerSelect> | null>(null)

/** 零件参数字段（BOM 特有字段之外的都是零件参数） */
const PART_PARAM_KEYS = new Set([
  'drawingNo', 'jobNo', 'chineseDescription', 'englishDescription',
  'materialCatalogNo', 'assemblyUnit', 'totalAmount', 'spareParts',
  'reserved1', 'reserved2', 'purchasingBatch', 'remarks', 'ecnNo', 'ifKeyParts'
])

/** 表单字段是否只读：编辑现有条目时全部零件参数只读；新增时若选择"从零件库选择"则零件参数只读 */
function isFieldReadonly(fieldKey: string): boolean {
  if (!PART_PARAM_KEYS.has(fieldKey)) return false // quantity/type 等 BOM 特有字段始终可编辑
  if (bomEditingItem.value) return true // 编辑现有条目：严格模式只读
  if (bomSelectMode.value === 'library') return true // 新增且从零件库选择：参数自动填充只读
  return false
}

function onPickPartFromLibrary(part: Part) {
  // 填充零件参数到表单（只读展示），保留 quantity/type
  for (const field of visibleFields.value) {
    if (PART_PARAM_KEYS.has(field.key)) {
      bomForm[field.key] = (part as any)[field.key] ?? (field.fieldType === 'number' ? 0 : '')
    }
  }
}

function goEditPartInLibrary() {
  bomDialogVisible.value = false
  router.push('/parts')
}

const bomStats = computed(() => ({
  assembly: bomItems.value.filter((i) => i.type === 'assembly').length,
  order: bomItems.value.filter((i) => i.type === 'order').length,
  both: bomItems.value.filter((i) => i.type === 'both').length
}))

function getBomTypeCfg(type: string) {
  return BOM_TYPE_CONFIG[type as BomType]
}

// BomTable 更新处理
function handleBomItemsUpdate(newItems: BomTableRow[]) {
  // 记录被删除的条目ID
  const newIds = new Set(newItems.map((i) => i.id))
  for (const old of bomItems.value) {
    if (!newIds.has(old.id) && !(old as BomTableRow)._rowStatus) {
      deletedBomIds.value.add(old.id)
    }
  }
  bomItems.value = newItems
  markDirty()
  commitUndo()
}

function handleBomSelectionChange(selection: BomTableRow[]) {
  selectedBomItems.value = selection
}

function handleBomRowClick(_row: BomTableRow) {
  // 行点击事件（可扩展）
}

function clearBomSelection() {
  selectedBomItems.value = []
}

// 批量操作
const batchActions: BatchAction[] = [
  { key: 'type', label: '批量改类型', type: 'warning', icon: 'Edit' },
  { key: 'delete', label: '批量删除', type: 'danger', icon: 'Delete' },
  { key: 'export', label: '批量导出', type: 'primary', icon: 'Download' }
]

function handleBatchAction(key: string) {
  if (key === 'type') openBatchTypeDialog()
  else if (key === 'delete') handleBatchDeleteBom()
  else if (key === 'export') {
    // 打开导出对话框；存在选中行时对话框自动默认“选中”范围
    openExportDialog()
  }
}

function openBatchTypeDialog() {
  if (selectedBomItems.value.length === 0) return
  batchTypeValue.value = 'order'
  batchTypeDialogVisible.value = true
}

async function handleBatchDeleteBom() {
  if (selectedBomItems.value.length === 0) return
  try {
    await ElMessageBox.confirm(
      `确定删除选中的 ${selectedBomItems.value.length} 条BOM条目吗？`,
      '批量删除确认',
      { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' }
    )
    const ids = new Set(selectedBomItems.value.map((item) => item.id))
    for (const id of ids) {
      deletedBomIds.value.add(id)
    }
    bomItems.value = bomItems.value.filter((item) => !ids.has(item.id))
    ElMessage.success(`已删除 ${ids.size} 条BOM条目`)
    clearBomSelection()
    markDirty()
    commitUndo()
  } catch {
    // 用户取消
  }
}

function handleBatchUpdateType() {
  if (selectedBomItems.value.length === 0) return
  const ids = new Set(selectedBomItems.value.map((item) => item.id))
  bomItems.value = bomItems.value.map((item) => {
    if (ids.has(item.id)) {
      return { ...item, type: batchTypeValue.value, _rowStatus: (item as BomTableRow)._rowStatus === 'new' ? 'new' : 'modified' } as BomTableRow
    }
    return item
  })
  ElMessage.success(`已将 ${ids.size} 条BOM条目类型修改为「${getBomTypeCfg(batchTypeValue.value).label}」`)
  batchTypeDialogVisible.value = false
  clearBomSelection()
  markDirty()
  commitUndo()
}

// BOM表单
const bomForm = reactive<Record<string, any>>({})

const bomRules = computed<FormRules>(() => {
  const rules: FormRules = {}
  for (const field of visibleFields.value) {
    if (field.required) {
      rules[field.key] = [
        { required: true, message: `请输入${field.label}`, trigger: field.key === 'type' ? 'change' : 'blur' }
      ]
    }
  }
  return rules
})

function getFieldDefaultValue(field: BomTemplateField): string | number {
  if (field.key === 'type') return 'both'
  if (field.key === 'quantity') return 1
  if (field.defaultValue !== undefined && field.defaultValue !== '') return field.defaultValue
  if (field.fieldType === 'number') return 0
  return ''
}

function getSelectOptions(key: string): { label: string; value: string }[] {
  const field = visibleFields.value.find((f) => f.key === key)
  if (!field || !field.options || field.options.length === 0) return []
  return field.options.map((opt) => ({ label: opt, value: opt }))
}

function openBomDialog(item?: BomItem) {
  for (const field of visibleFields.value) {
    bomForm[field.key] = getFieldDefaultValue(field)
  }
  // 重置零件库选择状态
  bomSelectMode.value = 'library'
  selectedPartId.value = ''
  partPickerRef.value?.reset()
  if (item) {
    bomEditingItem.value = item
    for (const field of visibleFields.value) {
      const val = item[field.key]
      if (val !== undefined && val !== null && val !== '') {
        bomForm[field.key] = val
      }
    }
  } else {
    bomEditingItem.value = null
    // 新增时由 PartPickerSelect 在下拉展开时懒加载零件
  }
  bomDialogVisible.value = true
}

function resetBomForm() {
  for (const field of visibleFields.value) {
    bomForm[field.key] = getFieldDefaultValue(field)
  }
  bomEditingItem.value = null
  bomSelectMode.value = 'library'
  selectedPartId.value = ''
  partPickerRef.value?.reset()
}

async function handleSaveBomItem() {
  if (!bomFormRef.value) return
  try {
    await bomFormRef.value.validate()
  } catch {
    return
  }
  // 新增且选择"从零件库选择"模式时，必须先选中一个零件
  if (!bomEditingItem.value && bomSelectMode.value === 'library' && !selectedPartId.value) {
    ElMessage.warning('请先从零件库选择一个零件')
    return
  }
  const hasMaterialCatalogNo = visibleFields.value.some((f) => f.key === 'materialCatalogNo')
  const hasChineseDescription = visibleFields.value.some((f) => f.key === 'chineseDescription')
  if (hasMaterialCatalogNo && hasChineseDescription && !bomForm.materialCatalogNo && !bomForm.chineseDescription) {
    ElMessage.error('物料/目录号和中文描述至少填写一个')
    return
  }

  const saveData: Record<string, any> = {}
  for (const field of visibleFields.value) {
    saveData[field.key] = bomForm[field.key]
  }
  // 从零件库选择时，携带 partId 直接引用，避免重复建零件
  if (!bomEditingItem.value && bomSelectMode.value === 'library' && selectedPartId.value) {
    saveData.partId = selectedPartId.value
  }

  // 检测同图号或同物料/目录号冲突（编辑时排除自身，对比系统中所有组件）
  const excludeId = bomEditingItem.value?.id
  const detectedConflicts = await detectConflicts(saveData, excludeId)
  if (detectedConflicts.length > 0) {
    conflicts.value = detectedConflicts
    conflictAllAction.value = 'overwrite'
    conflictSource.value = 'manual'
    pendingManualSaveData.value = saveData
    conflictDialogVisible.value = true
    return
  }

  // 无冲突，直接保存
  await executeManualSave(saveData)
}

/** 执行手动新增/编辑保存 */
async function executeManualSave(saveData: Record<string, any>) {
  if (bomEditingItem.value) {
    // 更新现有条目
    bomItems.value = bomItems.value.map((item) => {
      if (item.id === bomEditingItem.value!.id) {
        return { ...item, ...saveData, _rowStatus: (item as BomTableRow)._rowStatus === 'new' ? 'new' : 'modified' } as BomTableRow
      }
      return item
    })
    ElMessage.success('更新成功')
  } else {
    // 新增条目
    const maxSort = bomItems.value.length > 0 ? Math.max(...bomItems.value.map((i) => i.sortOrder || 0)) : 0
    const newItem: BomTableRow = {
      id: `bi_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      ...saveData,
      source: 'manual',
      sortOrder: maxSort + 1,
      _rowStatus: 'new'
    } as BomTableRow
    bomItems.value = [...bomItems.value, newItem]
    ElMessage.success('新增成功')
  }
  bomDialogVisible.value = false
  markDirty()
  commitUndo()
}

// 加载BOM
async function loadBomItems() {
  if (isNew.value) return
  bomLoading.value = true
  isLoading.value = true
  try {
    const items = await modulesStore.getBomItems(moduleId.value)
    bomItems.value = items as BomTableRow[]
    deletedBomIds.value.clear()
    dirty.value = false
  } finally {
    bomLoading.value = false
    await nextTick()
    isLoading.value = false
  }
}

watch(activeTab, (val) => {
  if (val === 'bom' && bomItems.value.length === 0 && !isNew.value) {
    loadBomItems()
  }
})

// ==================== 导出 ====================
const exportDialogVisible = ref(false)
const exporting = ref(false)

/** 导出对话框可选字段（来自当前可见模板字段） */
const exportFieldsForDialog = computed(() =>
  visibleFields.value.map((f) => ({ key: f.key, label: f.label }))
)

/** 默认导出全部字段 */
const defaultExportSelected = computed(() => exportFieldsForDialog.value.map((f) => f.key))

/** 导出统计标签 */
const exportStats = computed(() => [
  { label: '总条目', count: bomItems.value.length, type: 'primary' as const },
  { label: '装配', count: bomStats.value.assembly, type: 'success' as const },
  { label: '下单', count: bomStats.value.order, type: 'warning' as const },
  { label: '两者', count: bomStats.value.both, type: 'info' as const }
])

/** 默认文件名 */
const exportDefaultFileName = computed(() =>
  `${currentModule.value?.drawingNo || 'BOM'}_BOM明细_${dayjs().format('YYYYMMDD_HHmmss')}`
)

function openExportDialog() {
  exportDialogVisible.value = true
}

/** 导出确认：由 BomExportDialog 抛出选中字段/排序/格式/范围/文件名 */
async function handleConfirmExport(config: BomExportConfig) {
  const selectedKeys = config.selectedKeys.length > 0 ? config.selectedKeys : defaultExportSelected.value
  if (selectedKeys.length === 0) {
    ElMessage.warning('请至少选择一个导出字段')
    return
  }

  let dataItems: BomTableRow[] = []
  if (config.scope === 'selected') {
    dataItems = selectedBomItems.value
  } else {
    dataItems = bomItems.value
  }

  if (dataItems.length === 0) {
    ElMessage.warning('没有可导出的数据')
    return
  }

  exporting.value = true
  try {
    const data = dataItems.map((item, idx) => {
      const row: Record<string, any> = { 序号: idx + 1 }
      for (const key of selectedKeys) {
        // 解析字段 label（保持与原导出一致的表头文案）
        const field = visibleFields.value.find((f) => f.key === key)
        const label = field?.label || key
        if (key === 'type') {
          row[label] = getBomTypeCfg(item.type).label
        } else if (key === 'source') {
          row[label] = item.source === 'manual' ? '手动' : item.source === 'import' ? '导入' : '生成'
        } else {
          row[label] = item[key] ?? ''
        }
      }
      return row
    })

    const fileName = config.fileName || `${currentModule.value?.drawingNo || 'BOM'}_BOM明细`
    if (config.format === 'excel') {
      exportToExcel(data, fileName, 'BOM明细')
    } else {
      // CSV导出
      const headers = Object.keys(data[0])
      const csvContent = [
        headers.join(','),
        ...data.map((row) => headers.map((h) => `"${String(row[h] ?? '').replace(/"/g, '""')}"`).join(','))
      ].join('\n')
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${fileName}.csv`
      link.click()
      URL.revokeObjectURL(url)
    }

    if (!isElectronEnvironment()) {
      ElMessage.success('导出成功')
    }
    exportDialogVisible.value = false
  } catch (err) {
    console.error('导出失败:', err)
    ElMessage.error('导出失败')
  } finally {
    exporting.value = false
  }
}

// ==================== 导入流程（增强版） ====================
interface ParsedColumn {
  id: string
  name: string
  label: string
  type: 'text' | 'number'
  sortOrder: number
}

interface ImportError {
  rowNum: number
  reason: string
}

/** 字段差异信息 */
interface FieldDiff {
  key: string
  label: string
  oldValue: any
  newValue: any
}

/** 同图号冲突信息 */
interface DrawingNoConflict {
  drawingNo: string
  oldItem: BomTableRow
  newItem: Record<string, any>
  diffs: FieldDiff[]
  /** 用户选择：'keep' 保留库里的，'overwrite' 用新导入的覆盖 */
  action: 'keep' | 'overwrite'
  /** 冲突来源：'partsLibrary' 零件库，'otherModule' 其他组件BOM */
  conflictSource?: 'partsLibrary' | 'otherModule'
  /** 冲突来源描述（用于显示） */
  sourceDescription?: string
}

const importDialogVisible = ref(false)
const importStep = ref(1)
const importFileName = ref('')
const importing = ref(false)
const parsedColumns = ref<ParsedColumn[]>([])
const parsedRows = ref<Record<string, any>[]>([])

/** 冲突检测相关状态 */
const conflictDialogVisible = ref(false)
const conflicts = ref<DrawingNoConflict[]>([])
const conflictAllAction = ref<'keep' | 'overwrite'>('overwrite')
/** 冲突来源：'import' 批量导入，'manual' 手动新增/编辑 */
const conflictSource = ref<'import' | 'manual'>('import')
/** 手动新增/编辑时待保存的数据 */
const pendingManualSaveData = ref<Record<string, any> | null>(null)
const importType = ref<BomType>('order')

const importableFields = computed(() =>
  visibleFields.value.filter((f) => !['type', 'source', 'sortOrder'].includes(f.key))
)

const fieldMapping = reactive<Record<string, string>>({})

watch(importDialogVisible, (val) => {
  if (val) {
    for (const field of importableFields.value) {
      if (!(field.key in fieldMapping)) {
        fieldMapping[field.key] = ''
      }
    }
  }
})

const COLUMN_ALIAS: Record<string, string> = {
  图号: 'drawingNo', drawingno: 'drawingNo',
  JOB号: 'jobNo', jobno: 'jobNo',
  中文描述: 'chineseDescription', 物料名称: 'chineseDescription', 名称: 'chineseDescription',
  materialname: 'chineseDescription', name: 'chineseDescription', chinesedescription: 'chineseDescription',
  英文描述: 'englishDescription', englishdescription: 'englishDescription',
  '物料/目录号': 'materialCatalogNo', 物料目录号: 'materialCatalogNo', 物料编码: 'materialCatalogNo',
  物料号: 'materialCatalogNo', 物料编号: 'materialCatalogNo', materialcode: 'materialCatalogNo',
  code: 'materialCatalogNo', partno: 'materialCatalogNo', materialcatalognumber: 'materialCatalogNo',
  装配单位: 'assemblyUnit', 单位: 'assemblyUnit', unit: 'assemblyUnit', assemblyunit: 'assemblyUnit',
  数量: 'quantity', qty: 'quantity', quantity: 'quantity',
  总金额: 'totalAmount', totalamount: 'totalAmount',
  备件: 'spareParts', spareparts: 'spareParts',
  预留1: 'reserved1', reserved1: 'reserved1', 规格: 'reserved1', 规格型号: 'reserved1',
  型号: 'reserved1', spec: 'reserved1', specification: 'reserved1',
  预留2: 'reserved2', reserved2: 'reserved2', 位号: 'reserved2', position: 'reserved2',
  采购批次: 'purchasingBatch', purchasingbatch: 'purchasingBatch',
  备注: 'remarks', remarks: 'remarks', remark: 'remarks', comment: 'remarks',
  ECN号: 'ecnNo', ecnno: 'ecnNo',
  是否关键件: 'ifKeyParts', ifkeyparts: 'ifKeyParts'
}

function autoMatchMapping() {
  for (const field of importableFields.value) {
    fieldMapping[field.key] = ''
  }
  for (const col of parsedColumns.value) {
    const key = col.label.toLowerCase().replace(/\s/g, '')
    const matched = COLUMN_ALIAS[key] || COLUMN_ALIAS[col.label]
    if (matched && !fieldMapping[matched]) {
      fieldMapping[matched] = col.name
    }
  }
}

async function handleFileChange(file: { raw: File; name: string }) {
  const rawFile = file.raw
  importFileName.value = rawFile.name
  try {
    const result = (await parseFile(rawFile)) as { columns: ParsedColumn[]; rows: Record<string, any>[] }
    parsedColumns.value = result.columns
    parsedRows.value = result.rows
    if (result.rows.length === 0) {
      ElMessage.warning('文件中没有数据行')
      return
    }
    autoMatchMapping()
    importStep.value = 2
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '文件解析失败')
  }
}

// 数据校验
const importValidating = ref(false)
const importValidateProgress = ref(0)
const importErrors = ref<ImportError[]>([])
const importValidRows = ref<Record<string, any>[]>([])
const importValidCount = computed(() => importValidRows.value.length)

async function validateImportData() {
  const hasQuantityField = importableFields.value.some((f) => f.key === 'quantity')
  if (hasQuantityField && !fieldMapping['quantity']) {
    ElMessage.warning('请映射"数量"字段')
    return
  }

  importValidating.value = true
  importValidateProgress.value = 0
  importErrors.value = []
  importValidRows.value = []

  const quantityCol = fieldMapping['quantity']
  const total = parsedRows.value.length

  // 模拟进度（实际校验是同步的，分批处理以显示进度）
  const batchSize = Math.max(1, Math.floor(total / 10))
  for (let i = 0; i < total; i += batchSize) {
    const batch = parsedRows.value.slice(i, i + batchSize)
    for (let j = 0; j < batch.length; j++) {
      const rowNum = i + j + 1
      const row = batch[j]
      const errors: string[] = []

      // 数量校验
      if (quantityCol) {
        const qty = Number(row[quantityCol])
        if (isNaN(qty) || qty <= 0) {
          errors.push('数量必须为大于0的数字')
        }
      }

      // 至少有一个标识字段
      const hasMaterial = fieldMapping['materialCatalogNo'] && row[fieldMapping['materialCatalogNo']]
      const hasDesc = fieldMapping['chineseDescription'] && row[fieldMapping['chineseDescription']]
      if (!hasMaterial && !hasDesc) {
        errors.push('物料/目录号和中文描述至少填写一个')
      }

      if (errors.length > 0) {
        importErrors.value.push({ rowNum, reason: errors.join('；') })
      } else {
        // 构建有效行
        const validRow: Record<string, any> = { type: importType.value }
        for (const field of importableFields.value) {
          if (fieldMapping[field.key]) {
            const val = row[fieldMapping[field.key]]
            if (field.fieldType === 'number') {
              validRow[field.key] = Number(val) || 0
            } else {
              validRow[field.key] = val !== undefined && val !== null ? String(val) : ''
            }
          } else {
            validRow[field.key] = field.fieldType === 'number' ? 0 : ''
          }
        }
        importValidRows.value.push(validRow)
      }
    }
    importValidateProgress.value = Math.min(100, Math.round(((i + batchSize) / total) * 100))
    await nextTick()
  }

  importValidating.value = false
  importStep.value = 3
}

function exportImportErrors() {
  if (importErrors.value.length === 0) return
  const data = importErrors.value.map((e) => ({ 行号: e.rowNum, 错误原因: e.reason }))
  exportToExcel(data, `导入错误_${dayjs().format('YYYYMMDD_HHmmss')}`, '错误明细')
  ElMessage.success('错误报告已导出')
}

/** 检测同图号或同物料/目录号冲突（对比系统中所有组件的BOM条目和零件库） */
async function detectConflicts(newRow: Record<string, any>, excludeId?: string): Promise<DrawingNoConflict[]> {
  const result: DrawingNoConflict[] = []
  const fieldLabels: Record<string, string> = {}
  for (const field of visibleFields.value) {
    fieldLabels[field.key] = field.label
  }

  // ===== 1. 检测零件库冲突 =====
  // 优先按图号匹配，图号为空或未命中时按物料/目录号匹配
  const partConflict = partsStore.detectPartConflict(newRow)
  if (partConflict) {
    // 将零件库冲突转换为DrawingNoConflict格式
    // 注意：Part类型缺少BomTableRow的quantity/source/sortOrder等字段，需要补充默认值
    const oldItem = {
      ...partConflict.existingPart,
      id: `part_${partConflict.existingPart.id}`,
      quantity: 0,
      source: 'import' as const,
      sortOrder: 0,
      sourceModuleIds: []
    } as unknown as BomTableRow
    const matchFieldLabel = partConflict.matchField === 'drawingNo' ? '图号' : '物料/目录号'
    result.push({
      drawingNo: `${matchFieldLabel}：${partConflict.drawingNo}（零件库中已存在）`,
      oldItem,
      newItem: { ...newRow },
      diffs: partConflict.diffs.map(d => ({
        key: d.key,
        label: d.label,
        oldValue: d.oldValue,
        newValue: d.newValue
      })),
      action: 'overwrite',
      conflictSource: 'partsLibrary',
      sourceDescription: '零件库'
    })
  }

  // ===== 2. 检测其他组件BOM冲突 =====
  // 需要校核的唯一字段：图号、物料/目录号
  const uniqueFields = [
    { key: 'drawingNo', label: '图号' },
    { key: 'materialCatalogNo', label: '物料/目录号' }
  ]

  // 获取系统中所有组件的BOM条目
  const allExistingBomItems: Array<{ moduleDrawingNo: string; moduleName: string; item: BomTableRow }> = []
  for (const mod of modulesStore.modules) {
    try {
      const items = await modulesStore.getBomItems(mod.id)
      for (const item of items) {
        // 编辑时排除自身
        if (excludeId && item.id === excludeId) continue
        allExistingBomItems.push({ moduleDrawingNo: mod.drawingNo, moduleName: mod.nameZh, item: item as BomTableRow })
      }
    } catch {
      // 忽略获取失败的组件
    }
  }

  for (const uniqueField of uniqueFields) {
    const fieldValue = String(newRow[uniqueField.key] || '').trim()
    if (!fieldValue) continue

    // 在所有组件的BOM条目中查找同字段值的条目
    const existing = allExistingBomItems.find((e) => {
      return String(e.item[uniqueField.key] || '').trim() === fieldValue
    })
    if (!existing) continue

    // 对比所有可见字段，找出差异
    const diffs: FieldDiff[] = []
    for (const field of visibleFields.value) {
      if (['type', 'source', 'sortOrder'].includes(field.key)) continue
      const oldVal = existing.item[field.key]
      const newVal = newRow[field.key]
      const oldStr = oldVal !== undefined && oldVal !== null ? String(oldVal).trim() : ''
      const newStr = newVal !== undefined && newVal !== null ? String(newVal).trim() : ''
      if (oldStr !== newStr) {
        diffs.push({
          key: field.key,
          label: field.label,
          oldValue: oldVal,
          newValue: newVal
        })
      }
    }

    // 即使没有差异，也提示重复（diffs为空时表示完全一致）
    result.push({
      drawingNo: `${uniqueField.label}：${fieldValue}（所属组件：${existing.moduleDrawingNo} ${existing.moduleName}）`,
      oldItem: existing.item,
      newItem: { ...newRow },
      diffs,
      action: 'overwrite',
      conflictSource: 'otherModule',
      sourceDescription: `组件：${existing.moduleDrawingNo} ${existing.moduleName}`
    })
  }

  return result
}

async function handleConfirmImport() {
  if (importValidCount.value === 0) {
    ElMessage.warning('没有可导入的有效数据')
    return
  }

  // 检测同图号或同物料/目录号冲突（对比系统中所有组件）
  const allConflicts: DrawingNoConflict[] = []
  for (const row of importValidRows.value) {
    const conflicts = await detectConflicts(row)
    allConflicts.push(...conflicts)
  }
  if (allConflicts.length > 0) {
    conflicts.value = allConflicts
    conflictAllAction.value = 'overwrite'
    conflictDialogVisible.value = true
    return
  }

  // 无冲突，直接导入
  await executeImport()
}

/** 执行实际导入 */
async function executeImport() {
  const existingCount = bomItems.value.length
  const newItems: BomTableRow[] = importValidRows.value.map((row, idx) => ({
    id: `bi_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 6)}`,
    ...row,
    source: 'import',
    sortOrder: existingCount + idx + 1,
    _rowStatus: 'new'
  })) as BomTableRow[]

  importing.value = true
  try {
    bomItems.value = [...bomItems.value, ...newItems]
    ElMessage.success(`成功导入 ${newItems.length} 条BOM条目（参数将自动同步到零件库）`)
    importDialogVisible.value = false
    markDirty()
    commitUndo()
  } finally {
    importing.value = false
  }
}

/** 应用冲突解决，执行导入 */
async function applyConflictResolution() {
  if (conflictSource.value === 'manual') {
    // 手动新增/编辑的冲突处理
    if (pendingManualSaveData.value) {
      const saveData = pendingManualSaveData.value
      const hasOverwrite = conflicts.value.some((c) => c.action === 'overwrite')
      const hasKeep = conflicts.value.some((c) => c.action === 'keep')

      if (bomEditingItem.value) {
        // 编辑现有条目
        if (hasOverwrite) {
          // 覆盖：用新输入的所有参数更新
          bomItems.value = bomItems.value.map((item) => {
            if (item.id === bomEditingItem.value!.id) {
              return { ...item, ...saveData, _rowStatus: (item as BomTableRow)._rowStatus === 'new' ? 'new' : 'modified' } as BomTableRow
            }
            return item
          })
          ElMessage.success('更新成功')
        } else {
          // 保留库里的参数，但数量使用新输入的数量
          bomItems.value = bomItems.value.map((item) => {
            if (item.id === bomEditingItem.value!.id) {
              return {
                ...item,
                quantity: saveData.quantity !== undefined && saveData.quantity !== null && saveData.quantity !== '' ? Number(saveData.quantity) : item.quantity,
                _rowStatus: (item as BomTableRow)._rowStatus === 'new' ? 'new' : 'modified'
              } as BomTableRow
            }
            return item
          })
          ElMessage.success('已保留原有参数，仅更新数量')
        }
      } else {
        // 新增条目：根据用户选择使用库里的参数或新参数，在当前组件中新增
        let finalSaveData = { ...saveData }
        let actionType = 'new'

        for (const conflict of conflicts.value) {
          if (conflict.action === 'keep') {
            // 保留库里的参数，但数量使用新输入的数量
            finalSaveData = { ...conflict.oldItem }
            if (saveData.quantity !== undefined && saveData.quantity !== null && saveData.quantity !== '') {
              finalSaveData.quantity = Number(saveData.quantity)
            }
            actionType = 'keep'
          } else {
            // 覆盖：使用新输入的所有参数
            actionType = 'overwrite'
          }
          break
        }

        // 在当前组件中新增条目
        const maxSort = bomItems.value.length > 0 ? Math.max(...bomItems.value.map((i) => i.sortOrder || 0)) : 0
        const newItem: BomTableRow = {
          id: `bi_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          ...finalSaveData,
          source: 'manual',
          sortOrder: maxSort + 1,
          _rowStatus: 'new'
        } as BomTableRow
        bomItems.value = [...bomItems.value, newItem]

        if (actionType === 'keep') {
          ElMessage.success('已使用库里参数（数量用新的）新增条目')
        } else if (actionType === 'overwrite') {
          ElMessage.success('已使用新数据新增条目')
        } else {
          ElMessage.success('新增成功')
        }
      }
      bomDialogVisible.value = false
      markDirty()
      commitUndo()
    }
    conflictDialogVisible.value = false
    pendingManualSaveData.value = null
    return
  }

  // 批量导入的冲突处理
  const overwriteConflicts = conflicts.value.filter((c) => c.action === 'overwrite')
  const keepConflicts = conflicts.value.filter((c) => c.action === 'keep')

  const existingCount = bomItems.value.length
  let addedCount = 0
  let overwrittenCount = 0
  let keepParamCount = 0

  importing.value = true
  try {
    const newBomItems = [...bomItems.value]

    for (let idx = 0; idx < importValidRows.value.length; idx++) {
      const row = importValidRows.value[idx]

      // 检查是否有冲突
      let conflict: DrawingNoConflict | undefined
      for (const c of [...overwriteConflicts, ...keepConflicts]) {
        // 根据冲突来源和drawingNo格式确定匹配字段和值
        let fieldKey: string
        let conflictValue: string

        if (c.conflictSource === 'partsLibrary') {
          // 零件库冲突：格式为"图号：XXX（零件库中已存在）"或"物料/目录号：XXX（零件库中已存在）"
          if (c.drawingNo.startsWith('图号：')) {
            fieldKey = 'drawingNo'
            const match = c.drawingNo.match(/图号：(.+?)（零件库中已存在）/)
            conflictValue = match ? match[1] : ''
          } else {
            fieldKey = 'materialCatalogNo'
            const match = c.drawingNo.match(/物料\/目录号：(.+?)（零件库中已存在）/)
            conflictValue = match ? match[1] : ''
          }
        } else {
          // 其他组件冲突：格式为"图号：XXX（所属组件：...）"或"物料/目录号：XXX（所属组件：...）"
          fieldKey = c.drawingNo.startsWith('图号') ? 'drawingNo' : 'materialCatalogNo'
          // 提取字段值部分（在第一个"（"之前）
          const colonIdx = c.drawingNo.indexOf('：')
          const parenIdx = c.drawingNo.indexOf('（')
          conflictValue = colonIdx >= 0 ? c.drawingNo.substring(colonIdx + 1, parenIdx >= 0 ? parenIdx : undefined).trim() : ''
        }

        const fieldValue = String(row[fieldKey] || '').trim()
        if (fieldValue && conflictValue && fieldValue === conflictValue) {
          conflict = c
          break
        }
      }

      let finalRowData = { ...row }

      if (conflict) {
        if (conflict.action === 'keep') {
          // 保留库里的参数，但数量使用新导入的数量
          finalRowData = { ...conflict.oldItem }
          if (row.quantity !== undefined && row.quantity !== null && row.quantity !== '') {
            finalRowData.quantity = Number(row.quantity)
          }
          keepParamCount++
        } else {
          // 覆盖：使用新导入的所有参数
          overwrittenCount++
        }
      }

      // 在当前组件中新增条目
      const newItem: BomTableRow = {
        id: `bi_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 6)}`,
        ...finalRowData,
        source: 'import',
        sortOrder: existingCount + addedCount + 1,
        _rowStatus: 'new'
      } as BomTableRow
      newBomItems.push(newItem)
      addedCount++
    }

    bomItems.value = newBomItems
    conflictDialogVisible.value = false
    importDialogVisible.value = false

    let msg = `成功导入 ${addedCount} 条新条目`
    if (overwrittenCount > 0) {
      msg += `，覆盖 ${overwrittenCount} 条已有条目`
    }
    if (keepParamCount > 0) {
      msg += `，保留参数更新数量 ${keepParamCount} 条`
    }
    ElMessage.success(msg)
    markDirty()
    commitUndo()
  } finally {
    importing.value = false
  }
}

/** 批量设置冲突处理方式 */
function setAllConflictAction(action: 'keep' | 'overwrite') {
  conflictAllAction.value = action
  for (const conflict of conflicts.value) {
    conflict.action = action
  }
}

function resetImport() {
  importStep.value = 1
  importFileName.value = ''
  parsedColumns.value = []
  parsedRows.value = []
  importType.value = 'order'
  importErrors.value = []
  importValidRows.value = []
  importValidateProgress.value = 0
  for (const field of importableFields.value) {
    fieldMapping[field.key] = ''
  }
}

// ==================== 更改历史 ====================
const historyFilter = ref('')

const changeHistoryList = computed(() => {
  if (!currentModule.value?.changeHistory) return []
  return [...currentModule.value.changeHistory].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  )
})

const filteredHistoryList = computed(() => {
  if (!historyFilter.value) return changeHistoryList.value
  return changeHistoryList.value.filter((record) => {
    const op = record.operation
    if (historyFilter.value === 'create') return op.includes('创建') || op.includes('新增')
    if (historyFilter.value === 'update') return op.includes('更新') || op.includes('编辑')
    if (historyFilter.value === 'delete') return op.includes('删除')
    if (historyFilter.value === 'import') return op.includes('导入')
    return true
  })
})

function getHistoryType(operation: string): 'primary' | 'success' | 'warning' | 'danger' | 'info' {
  if (operation.includes('创建') || operation.includes('新增')) return 'success'
  if (operation.includes('删除')) return 'danger'
  if (operation.includes('更新') || operation.includes('编辑')) return 'warning'
  if (operation.includes('导入')) return 'primary'
  return 'info'
}

// ==================== BOM版本管理 ====================
const bomVersions = ref<BomVersion[]>([])

async function loadVersions() {
  if (isNew.value) {
    bomVersions.value = []
    return
  }
  bomVersions.value = await bomVersionsStore.getVersions('module', moduleId.value)
}

async function openCreateVersionDialog() {
  try {
    const { value } = await ElMessageBox.prompt('请输入版本说明', '创建版本快照', {
      confirmButtonText: '创建',
      cancelButtonText: '取消',
      inputPlaceholder: '例如：首批样机BOM'
    })
    await bomVersionsStore.createVersion('module', moduleId.value, bomItems.value, value || '')
    await loadVersions()
    ElMessage.success('版本快照创建成功')
  } catch { /* 取消 */ }
}

async function handleRollbackToVersion(row: BomVersion) {
  try {
    await ElMessageBox.confirm(
      `回滚到 ${row.versionNo} 将用该版本的BOM覆盖当前BOM，当前BOM会先自动保存为新版本。是否继续？`,
      '版本回滚确认',
      { confirmButtonText: '确定回滚', cancelButtonText: '取消', type: 'warning' }
    )
    // 1. 回滚前自动保存当前为新版本
    await bomVersionsStore.createVersion('module', moduleId.value, bomItems.value, '回滚前自动备份')
    // 2. 取目标版本
    const items = await bomVersionsStore.rollbackToVersion(row.id)
    if (!items) {
      ElMessage.error('版本数据不存在')
      return
    }
    // 3. 替换当前 BOM（通过 modulesStore 统一访问，不再直接操作 db.bomItems）
    await modulesStore.saveBomItems(moduleId.value, items as BomItem[])
    bomItems.value = items as BomItem[]
    // 4. 记录变更历史
    await modulesStore.addChangeHistory(moduleId.value, '回滚BOM版本', `回滚到版本 ${row.versionNo}（共 ${items.length} 条）`)
    await loadVersions()
    ElMessage.success(`已回滚到版本 ${row.versionNo}`)
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
    await modulesStore.updateModule(moduleId.value, { ...record.beforeData })
    await modulesStore.addChangeHistory(moduleId.value, '回滚', `回滚到「${record.detail}」之前的状态`)
    ElMessage.success('回滚成功，基本信息已恢复')
  } catch (e) {
    ElMessage.error('回滚失败：' + (e instanceof Error ? e.message : String(e)))
  }
}

// ==================== 初始化 ====================
function loadModuleData() {
  isLoading.value = true
  try {
    if (isNew.value) {
      form.drawingNo = ''
      form.nameZh = ''
      form.nameEn = ''
      form.equipmentId = ''
      form.configurationIds = []
      form.tags = []
      form.parentModuleIds = []
      form.status = 'designing'
      form.remark = ''
      form.description = ''
      bomItems.value = []
      deletedBomIds.value.clear()
      dirty.value = false
      return
    }

    const mod = modulesStore.getModuleById(moduleId.value)
    if (!mod) {
      ElMessage.error('组件不存在')
      router.replace('/module')
      return
    }

    form.drawingNo = mod.drawingNo
    form.nameZh = mod.nameZh
    form.nameEn = mod.nameEn || ''
    form.equipmentId = mod.equipmentId
    form.configurationIds = [...mod.configurationIds]
    form.tags = [...mod.tags]
    form.parentModuleIds = [...(mod.parentModuleIds || [])]
    form.status = (mod as any).status || 'designing'
    form.remark = mod.remark || ''
    form.description = (mod as any).description || ''

    // 加载BOM
    loadBomItems()
    loadVersions()
    dirty.value = false
  } finally {
    nextTick(() => {
      isLoading.value = false
    })
  }
}

onMounted(() => {
  loadModuleData()
  // 初始化撤销历史
  nextTick(() => {
    syncUndoState()
    commit()
  })
})

watch(
  () => route.params.id,
  () => {
    loadModuleData()
    activeTab.value = 'basic'
    clearHistory()
    nextTick(() => {
      syncUndoState()
      commit()
    })
  }
)
</script>

<style scoped>
.module-editor {
  padding: 16px;
  padding-bottom: 80px;
}

/* ===== 顶部操作栏 ===== */
.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #fff;
  border-radius: 4px;
  margin-bottom: 16px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
}
.header-left {
  display: flex;
  align-items: center;
  gap: 4px;
}
.header-drawing-no {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}
.header-name {
  font-size: 14px;
  color: #606266;
}
.header-status {
  margin-left: 8px;
}
.header-right {
  display: flex;
  align-items: center;
  gap: 8px;
}
.save-status {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #909399;
  margin-right: 8px;
}
.save-status.dirty {
  color: #e6a23c;
}
.spin {
  animation: spin 1s linear infinite;
}
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* ===== Tab ===== */
.editor-tabs {
  background: #fff;
  border-radius: 4px;
}
.tab-label {
  display: flex;
  align-items: center;
  gap: 6px;
}
.tab-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #dcdfe6;
  display: inline-block;
}
.tab-dot.complete {
  background: #67c23a;
}
.tab-count {
  font-size: 12px;
  color: #909399;
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

/* ===== 淡入过渡 ===== */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* ===== 基本信息 ===== */
.basic-collapse {
  border: none;
}
.basic-form {
  padding: 0 8px;
}

/* ===== BOM管理 ===== */
.bom-tab-content {
  padding: 6px 0;
}
.bom-toolbar-extra {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

/* ===== BOM 新增/编辑对话框：零件库选择 ===== */
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

/* ===== 层级结构 ===== */
.hierarchy-path {
  padding: 12px 16px;
  background: linear-gradient(135deg, #f5f7fa 0%, #e8f0fe 100%);
  border-radius: 8px;
  margin-bottom: 16px;
  border-left: 4px solid #409eff;
}
.path-label {
  color: #909399;
  font-size: 13px;
  margin-right: 8px;
}
.current-node {
  font-weight: 600;
  color: #409eff;
}
.hierarchy-tree-section {
  margin-bottom: 8px;
  padding: 12px;
  background: #fafbfc;
  border-radius: 8px;
  border: 1px solid #ebeef5;
}

/* 树节点美化 */
.hierarchy-tree-section :deep(.el-tree) {
  background: transparent;
}

.hierarchy-tree-section :deep(.el-tree-node__content) {
  height: auto;
  padding: 8px 12px;
  border-radius: 8px;
  margin-bottom: 6px;
  transition: all 0.2s ease;
  background: #fff;
  border: 1px solid #ebeef5;
}

.hierarchy-tree-section :deep(.el-tree-node__content:hover) {
  background: #ecf5ff;
  border-color: #b3d8ff;
  transform: translateX(4px);
}

.hierarchy-tree-section :deep(.el-tree-node.is-current > .el-tree-node__content) {
  background: linear-gradient(135deg, #ecf5ff 0%, #d9ecff 100%);
  border-color: #409eff;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.15);
}

.hierarchy-tree-section :deep(.el-tree-node__expand-icon) {
  color: #909399;
  font-size: 14px;
}

.hierarchy-tree-section :deep(.el-tree-node__expand-icon.is-leaf) {
  color: transparent;
}

.hierarchy-tree-node {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  padding: 4px 0;
}

.node-icon {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: linear-gradient(135deg, #409eff 0%, #66b1ff 100%);
  color: #fff;
  flex-shrink: 0;
  box-shadow: 0 2px 6px rgba(64, 158, 255, 0.3);
}

.hierarchy-tree-node.is-root .node-icon {
  background: linear-gradient(135deg, #67c23a 0%, #85ce61 100%);
  box-shadow: 0 2px 6px rgba(103, 194, 58, 0.3);
}

.hierarchy-tree-node.is-current .node-icon {
  background: linear-gradient(135deg, #e6a23c 0%, #f0c78a 100%);
  box-shadow: 0 2px 6px rgba(230, 162, 60, 0.3);
}

.node-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.node-main {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.node-drawing {
  font-weight: 600;
  color: #303133;
  font-size: 14px;
  font-family: 'Consolas', 'Monaco', monospace;
}

.node-name {
  color: #606266;
  font-size: 14px;
}

.node-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 2px;
}

.node-count {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  padding: 0 8px;
  height: 22px;
  line-height: 20px;
}

.node-count :deep(.el-icon) {
  font-size: 12px;
}

.node-current {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  padding: 0 8px;
  height: 22px;
  line-height: 20px;
}

.node-current :deep(.el-icon) {
  font-size: 12px;
}

.child-section {
  margin-top: 8px;
}
.child-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  font-weight: 600;
  font-size: 15px;
  color: #303133;
}

/* ===== 更改历史 ===== */
.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.history-item { padding: 4px 0; }
.history-operation { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
.history-operator { font-size: 12px; color: #909399; }
.history-detail { font-size: 13px; color: #606266; }
.history-remark {
  margin-top: 6px;
  padding: 6px 10px;
  background: #fdf6ec;
  border-left: 3px solid #e6a23c;
  border-radius: 2px;
  font-size: 12px;
  color: #b88230;
  line-height: 1.5;
}
.history-remark-label { font-weight: 600; color: #b88230; }

/* ===== 底部操作栏 ===== */
.editor-footer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 24px;
  background: #fff;
  border-top: 1px solid #e4e7ed;
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.06);
  z-index: 100;
}
.footer-left {
  font-size: 13px;
  color: #606266;
}
.footer-right {
  display: flex;
  gap: 8px;
}

/* ===== 导入 ===== */
.import-file-name {
  margin-top: 12px;
  padding: 8px 12px;
  background: #ecf5ff;
  border-radius: 4px;
  color: #409eff;
  font-size: 13px;
}
.import-columns {
  display: flex;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 8px;
}
.import-columns-label { font-size: 13px; color: #606266; margin-right: 4px; line-height: 24px; }
.col-tag { margin: 0; }
.import-preview-label { font-size: 13px; color: #606266; font-weight: 600; margin: 8px 0; }
.import-mapping-grid {
  display: flex;
  gap: 32px;
}
.mapping-col {
  flex: 1;
}
.mapping-col-title {
  font-size: 13px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #ebeef5;
}
.mapping-field-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 0;
  border-bottom: 1px solid #f5f7fa;
}
.mapping-field-item.matched .field-name {
  color: #67c23a;
}
.field-name {
  font-size: 13px;
  color: #606266;
}
.import-validating {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px;
  gap: 12px;
  color: #606266;
}
.import-errors {
  margin-top: 16px;
}
.import-errors-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: 600;
  color: #e6a23c;
}
.import-valid-preview {
  margin-top: 16px;
}

/* ===== 同图号冲突解决 ===== */
.conflict-intro {
  margin-bottom: 16px;
}

.conflict-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding: 8px 12px;
  background: #f5f7fa;
  border-radius: 4px;
}

.conflict-count {
  font-size: 13px;
  color: #606266;
  font-weight: 600;
}

.conflict-actions {
  display: flex;
  gap: 8px;
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

.old-value {
  color: #909399;
}

.new-value {
  color: #409eff;
  font-weight: 500;
}

</style>
