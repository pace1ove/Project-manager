<template>
  <div class="page-container parts-page-layout">
    <!-- ===== 左侧零件库面板 ===== -->
    <div class="library-panel">
      <div class="library-panel-header">
        <span class="library-panel-title">零件库</span>
        <el-button
          circle
          size="small"
          :icon="Plus"
          title="新增零件库"
          @click="openLibraryDialog()"
        />
      </div>
      <div class="library-list">
        <!-- 全部库 -->
        <div
          class="library-item"
          :class="{ active: selectedLibraryId === '' }"
          @click="selectLibrary('')"
        >
          <span class="lib-icon">📁</span>
          <span class="lib-name">全部库</span>
          <span class="lib-count">{{ totalPartCount }}</span>
        </div>
        <!-- 各零件库 -->
        <div
          v-for="lib in partLibrariesStore.libraries"
          :key="lib.id"
          class="library-item"
          :class="{ active: selectedLibraryId === lib.id }"
          :title="lib.description || lib.name"
          @click="selectLibrary(lib.id)"
        >
          <span class="lib-icon">📁</span>
          <span class="lib-name">{{ lib.name }}</span>
          <span class="lib-count">{{ getPartCountOf(lib.id) }}</span>
          <div class="lib-actions">
            <el-button
              link
              size="small"
              :icon="Edit"
              title="编辑库"
              @click.stop="openLibraryDialog(lib)"
            />
            <el-button
              v-if="lib.id !== DEFAULT_PART_LIBRARY_ID"
              link
              size="small"
              type="danger"
              :icon="Delete"
              title="删除库"
              @click.stop="handleDeleteLibrary(lib)"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- ===== 右侧内容区 ===== -->
    <div class="main-content">
    <!-- 面包屑导航 -->
    <PageBreadcrumb />
    <!-- 工具栏 -->
    <div class="card-wrapper">
      <div class="toolbar-bar">
        <el-input
          v-model="keyword"
          placeholder="按图号 / 中文描述 / 英文描述 / 物料目录号搜索"
          clearable
          style="width: 320px"
          :prefix-icon="Search"
          @keyup.enter="handleSearch"
          @clear="handleSearch"
        />
        <el-select
          v-model="filterPartType"
          placeholder="零件类型"
          clearable
          style="width: 140px"
          @change="handleFilterChange"
        >
          <el-option
            label="全部类型"
            value=""
          />
          <el-option
            label="下单零件"
            value="order"
          />
          <el-option
            label="模型零件"
            value="assembly"
          />
          <el-option
            label="两者"
            value="both"
          />
        </el-select>
        <el-select
          v-model="filterPartCategory"
          placeholder="零件分类"
          clearable
          style="width: 140px"
          @change="handleFilterChange"
        >
          <el-option
            label="全部分类"
            value=""
          />
          <el-option
            v-for="cat in partCategories"
            :key="cat.id"
            :label="cat.name"
            :value="cat.id"
          />
        </el-select>
        <div class="sort-status" style="display: flex; align-items: center; gap: 8px; margin-right: 8px;">
          <span style="color: #909399; font-size: 13px;">排序：</span>
          <el-select
            v-model="sortField"
            placeholder="排序字段"
            style="width: 130px"
            @change="handleSortChange"
          >
            <el-option
              label="更新时间"
              value="updatedAt"
            />
            <el-option
              label="图号"
              value="drawingNo"
            />
            <el-option
              label="中文描述"
              value="chineseDescription"
            />
            <el-option
              label="物料/目录号"
              value="materialCatalogNo"
            />
            <el-option
              label="创建时间"
              value="createdAt"
            />
          </el-select>
          <el-radio-group
            v-model="sortOrder"
            size="small"
            @change="handleSortChange"
          >
            <el-radio-button value="asc">
              <span style="display: inline-flex; align-items: center; gap: 2px;">
                <span style="font-size: 12px;">↑</span> 升序
              </span>
            </el-radio-button>
            <el-radio-button value="desc">
              <span style="display: inline-flex; align-items: center; gap: 2px;">
                <span style="font-size: 12px;">↓</span> 降序
              </span>
            </el-radio-button>
          </el-radio-group>
        </div>
        <div class="toolbar-actions">
          <el-button
            type="primary"
            @click="openEditDialog()"
          >
            <el-icon><Plus /></el-icon>
            新增零件
          </el-button>
          <el-button @click="triggerImport">
            <el-icon><Upload /></el-icon>
            批量导入
          </el-button>
          <el-button
            :disabled="filteredParts.length === 0"
            @click="handleExport"
          >
            <el-icon><Download /></el-icon>
            导出
          </el-button>
          <el-button
            :loading="resyncLoading"
            @click="handleResync"
          >
            <el-icon><Refresh /></el-icon>
            重新同步
          </el-button>
          <el-button @click="handleRefresh">
            <el-icon><Refresh /></el-icon>
            刷新
          </el-button>
          <ColumnSettings
            v-model="columnConfigs"
            storage-key="parts_list"
          />
        </div>
      </div>
    </div>

    <!-- 表格 -->
    <div class="card-wrapper">
      <!-- 批量操作栏 -->
      <div
        v-if="selectedParts.length > 0"
        class="batch-action-bar"
      >
        <span class="batch-selected-count">已选择 {{ selectedParts.length }} 项</span>
        <div class="batch-actions">
          <el-select
            v-model="batchPartType"
            placeholder="批量修改类型"
            style="width: 160px"
            :disabled="batchLoading"
          >
            <el-option
              label="下单零件"
              value="order"
            />
            <el-option
              label="模型零件"
              value="assembly"
            />
            <el-option
              label="两者"
              value="both"
            />
            <el-option
              label="清除类型"
              value=""
            />
          </el-select>
          <el-button
            type="primary"
            :loading="batchLoading"
            @click="handleBatchUpdateType"
          >
            应用类型
          </el-button>
          <el-select
            v-model="batchPartCategory"
            placeholder="批量修改分类"
            style="width: 160px"
            :disabled="batchLoading"
          >
            <el-option
              v-for="cat in partCategories"
              :key="cat.id"
              :label="cat.name"
              :value="cat.id"
            />
            <el-option
              label="清除分类"
              value=""
            />
          </el-select>
          <el-button
            type="primary"
            :loading="batchLoading"
            @click="handleBatchUpdateCategory"
          >
            应用分类
          </el-button>
          <el-select
            v-model="moveTargetLibraryId"
            placeholder="移动到库"
            style="width: 150px"
            :disabled="batchLoading"
          >
            <el-option
              v-for="lib in partLibrariesStore.libraries"
              :key="lib.id"
              :label="lib.name"
              :value="lib.id"
            />
          </el-select>
          <el-button
            :loading="batchLoading"
            @click="handleMovePartsToLibrary"
          >
            移动
          </el-button>
          <el-button
            :loading="batchLoading"
            @click="handleBatchExport"
          >
            导出选中
          </el-button>
          <el-button
            type="danger"
            :loading="batchLoading"
            @click="handleBatchDelete"
          >
            批量删除
          </el-button>
          <el-button @click="clearSelection">
            取消选择
          </el-button>
        </div>
      </div>

      <el-table
        ref="tableRef"
        v-loading="tableLoading"
        :data="tableData"
        stripe
        border
        style="width: 100%"
        max-height="calc(100vh - 280px)"
        @selection-change="handleSelectionChange"
      >
        <el-table-column
          type="selection"
          width="50"
          align="center"
          fixed
        />
        <el-table-column
          type="index"
          label="#"
          width="50"
          align="center"
          fixed
        />

        <!-- 动态列渲染 -->
        <el-table-column
          v-for="col in visibleColumns"
          :key="col.key"
          :prop="col.key"
          :label="col.label"
          :width="col.width"
          :align="['partType', 'assemblyUnit', 'spareParts', 'partCategory', 'ifKeyParts', 'updatedAt'].includes(col.key) ? (col.key === 'totalAmount' ? 'right' : 'center') : undefined"
          :fixed="col.key === 'drawingNo' ? 'left' : undefined"
          show-overflow-tooltip
        >
          <!-- 零件类型特殊渲染 -->
          <template #default="{ row }" v-if="col.key === 'partType'">
            <el-tag
              v-if="row.partType === 'order'"
              size="small"
              type="success"
            >
              下单零件
            </el-tag>
            <el-tag
              v-else-if="row.partType === 'assembly'"
              size="small"
              type="primary"
            >
              模型零件
            </el-tag>
            <el-tag
              v-else-if="row.partType === 'both'"
              size="small"
              type="warning"
            >
              两者
            </el-tag>
            <span v-else>—</span>
          </template>

          <!-- 总金额特殊渲染 -->
          <template #default="{ row }" v-else-if="col.key === 'totalAmount'">
            {{ formatMoney(row.totalAmount) }}
          </template>

          <!-- 零件分类特殊渲染 -->
          <template #default="{ row }" v-else-if="col.key === 'partCategory'">
            <el-tag
              v-if="row.partType === 'order' && row.partCategory"
              size="small"
              :color="getCategoryColor(row.partCategory)"
              style="color: #fff; border: none"
            >
              {{ getCategoryName(row.partCategory) }}
            </el-tag>
            <span v-else>—</span>
          </template>

          <!-- 是否关键件特殊渲染 -->
          <template #default="{ row }" v-else-if="col.key === 'ifKeyParts'">
            <el-tag
              v-if="row.ifKeyParts"
              size="small"
              type="warning"
            >
              {{ row.ifKeyParts }}
            </el-tag>
            <span v-else>—</span>
          </template>

          <!-- 更新时间特殊渲染 -->
          <template #default="{ row }" v-else-if="col.key === 'updatedAt'">
            {{ formatTime(row.updatedAt) }}
          </template>

          <!-- 所属库特殊渲染 -->
          <template #default="{ row }" v-else-if="col.key === 'libraryId'">
            <el-tag
              size="small"
              type="info"
            >
              {{ getLibraryName(row.libraryId) }}
            </el-tag>
          </template>

          <!-- 默认文本渲染（带搜索关键词高亮） -->
          <template #default="{ row }" v-else>
            <span v-html="highlightKeyword(row[col.key])"></span>
          </template>
        </el-table-column>

        <el-table-column
          label="操作"
          width="200"
          fixed="right"
        >
          <template #default="{ row }">
            <div class="row-actions">
              <el-button
                type="primary"
                link
                class="table-action-btn"
                @click="openEditDialog(row)"
              >
                编辑
              </el-button>
              <el-button
                type="primary"
                link
                class="table-action-btn"
                @click="openReferencesDialog(row)"
              >
                查看引用
              </el-button>
              <el-button
                type="danger"
                link
                class="table-action-btn"
                @click="handleDelete(row)"
              >
                删除
              </el-button>
            </div>
          </template>
        </el-table-column>

        <template #empty>
          <EmptyState
            :variant="keyword ? 'no-results' : 'empty'"
            :title="keyword ? '没有找到匹配的零件' : '零件库为空'"
            :description="keyword ? '请尝试调整搜索关键词' : '点击「新增零件」或「批量导入」添加零件'"
            :action-text="keyword ? '' : '新增零件'"
            @action="openEditDialog()"
          />
        </template>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-wrapper">
        <span class="pagination-total">共 {{ serverTotal }} 条</span>
        <div class="pagination-center">
          <el-pagination
            v-model:current-page="currentPage"
            v-model:page-size="pageSize"
            :page-sizes="[20, 50, 100, 200]"
            :total="serverTotal"
            layout="sizes, prev, pager, next, jumper"
            background
          />
        </div>
        <span class="pagination-spacer" />
      </div>
    </div>

    <!-- ===== 新增/编辑零件对话框 ===== -->
    <el-dialog
      v-model="editDialogVisible"
      :title="editingPart ? '编辑零件' : '新增零件'"
      width="780px"
      @closed="resetEditForm"
    >
      <el-form
        ref="editFormRef"
        :model="editForm"
        :rules="editRules"
        label-width="110px"
      >
        <el-alert
          v-if="editingPart"
          type="info"
          :closable="false"
          style="margin-bottom: 16px"
          title="图号为零件唯一标识，编辑时不可修改。"
        />
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item
              label="图号"
              prop="drawingNo"
            >
              <el-input
                v-model="editForm.drawingNo"
                placeholder="请输入图号"
                :disabled="!!editingPart"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="所属库">
              <el-select
                v-model="editForm.libraryId"
                placeholder="请选择所属库"
                :disabled="!!editingPart"
                style="width: 100%"
              >
                <el-option
                  v-for="lib in partLibrariesStore.libraries"
                  :key="lib.id"
                  :label="lib.name"
                  :value="lib.id"
                />
              </el-select>
              <div
                v-if="editingPart"
                class="library-form-tip"
              >
                编辑零件不可改库，移动请使用批量操作
              </div>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item
              label="零件类型"
              prop="partType"
            >
              <el-select
                v-model="editForm.partType"
                placeholder="请选择零件类型"
                style="width: 100%"
              >
                <el-option
                  label="下单零件"
                  value="order"
                />
                <el-option
                  label="模型零件"
                  value="assembly"
                />
                <el-option
                  label="两者"
                  value="both"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item
              label="JOB号"
              prop="jobNo"
            >
              <el-input
                v-model="editForm.jobNo"
                placeholder="请输入JOB号"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item
              label="中文描述"
              prop="chineseDescription"
            >
              <el-input
                v-model="editForm.chineseDescription"
                placeholder="请输入中文描述"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item
              label="英文描述"
              prop="englishDescription"
            >
              <el-input
                v-model="editForm.englishDescription"
                placeholder="请输入英文描述"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item
              label="物料/目录号"
              prop="materialCatalogNo"
            >
              <el-input
                v-model="editForm.materialCatalogNo"
                placeholder="请输入物料/目录号"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item
              label="装配单位"
              prop="assemblyUnit"
            >
              <el-input
                v-model="editForm.assemblyUnit"
                placeholder="如 PCS / SET"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item
              label="总金额"
              prop="totalAmount"
            >
              <el-input-number
                v-model="editForm.totalAmount"
                :min="0"
                :precision="2"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item
              label="备件"
              prop="spareParts"
            >
              <el-input-number
                v-model="editForm.spareParts"
                :min="0"
                :precision="0"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col
            v-if="editForm.partType === 'order'"
            :span="12"
          >
            <el-form-item
              label="零件分类"
              prop="partCategory"
            >
              <el-select
                v-model="editForm.partCategory"
                placeholder="请选择零件分类"
                clearable
                style="width: 100%"
              >
                <el-option
                  v-for="cat in partCategories"
                  :key="cat.id"
                  :label="cat.name"
                  :value="cat.id"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item
              label="预留2"
              prop="reserved2"
            >
              <el-input
                v-model="editForm.reserved2"
                placeholder="预留字段2"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item
              label="采购批次"
              prop="purchasingBatch"
            >
              <el-input
                v-model="editForm.purchasingBatch"
                placeholder="请输入采购批次"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item
              label="ECN号"
              prop="ecnNo"
            >
              <el-input
                v-model="editForm.ecnNo"
                placeholder="请输入ECN号"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item
              label="是否关键件"
              prop="ifKeyParts"
            >
              <el-input
                v-model="editForm.ifKeyParts"
                placeholder="如 是 / 否"
              />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item
              label="备注"
              prop="remarks"
            >
              <el-input
                v-model="editForm.remarks"
                type="textarea"
                :rows="2"
                placeholder="备注"
              />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="editDialogVisible = false">
          取消
        </el-button>
        <el-button
          type="primary"
          @click="handleSavePart"
        >
          确定
        </el-button>
      </template>
    </el-dialog>

    <!-- ===== 查看引用对话框 ===== -->
    <el-dialog
      v-model="refsDialogVisible"
      title="零件引用情况"
      width="680px"
    >
      <div
        v-if="refsLoading"
        class="refs-loading"
      >
        <el-icon class="is-loading">
          <Loading />
        </el-icon>
        <span>正在查询引用…</span>
      </div>
      <template v-else>
        <div class="refs-part-header">
          <span class="refs-part-no">{{ refsTarget?.drawingNo || '（无图号）' }}</span>
          <span class="refs-part-desc">{{ refsTarget?.chineseDescription || '' }}</span>
        </div>

        <el-divider content-position="left">
          引用该零件的组件（{{ refModules.length }}）
        </el-divider>
        <el-table
          v-if="refModules.length > 0"
          :data="refModules"
          size="small"
          border
          max-height="220"
        >
          <el-table-column
            prop="nameZh"
            label="组件名称"
            min-width="160"
            show-overflow-tooltip
          />
          <el-table-column
            prop="drawingNo"
            label="组件图号"
            width="160"
            show-overflow-tooltip
          />
          <el-table-column
            label="操作"
            width="100"
            align="center"
          >
            <template #default="{ row }">
              <el-button
                type="primary"
                link
                @click="goToModule(row.id)"
              >
                跳转
              </el-button>
            </template>
          </el-table-column>
        </el-table>
        <el-empty
          v-else
          description="未被任何组件引用"
          :image-size="60"
        />

        <el-divider content-position="left">
          引用该零件的项目（{{ refProjects.length }}）
        </el-divider>
        <el-table
          v-if="refProjects.length > 0"
          :data="refProjects"
          size="small"
          border
          max-height="220"
        >
          <el-table-column
            prop="name"
            label="项目名称"
            min-width="160"
            show-overflow-tooltip
          />
          <el-table-column
            prop="jobNo"
            label="JOB号"
            width="160"
            show-overflow-tooltip
          />
        </el-table>
        <el-empty
          v-else
          description="未被任何项目引用"
          :image-size="60"
        />
      </template>
      <template #footer>
        <el-button @click="refsDialogVisible = false">
          关闭
        </el-button>
      </template>
    </el-dialog>

    <!-- ===== 零件数据冲突确认对话框 ===== -->
    <el-dialog
      v-model="partConflictDialogVisible"
      title="零件数据冲突确认"
      width="720px"
      :close-on-click-modal="false"
    >
      <div class="conflict-intro">
        <el-alert
          type="warning"
          :closable="false"
          :title="`检测到 ${partConflicts.length} 个同图号零件与零件库已有数据不一致，请选择处理方式`"
        />
      </div>

      <div class="conflict-toolbar">
        <span class="conflict-count">共 {{ partConflicts.length }} 个冲突</span>
        <div class="conflict-actions">
          <el-button
            size="small"
            :type="partConflictAllAction === 'keep' ? 'primary' : ''"
            @click="setAllPartConflictAction('keep')"
          >
            全部保留库里参数
          </el-button>
          <el-button
            size="small"
            :type="partConflictAllAction === 'overwrite' ? 'primary' : ''"
            @click="setAllPartConflictAction('overwrite')"
          >
            全部用新数据覆盖
          </el-button>
        </div>
      </div>

      <div class="conflict-list">
        <div
          v-for="(conflict, idx) in partConflicts"
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
              class="conflict-diff-count conflict-diff-equal"
            >数据完全一致</span>
            <div class="conflict-action-select">
              <el-radio-group
                v-model="conflict.action"
                size="small"
              >
                <el-radio value="keep">
                  保留库里参数
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
        <el-button @click="partConflictDialogVisible = false">
          取消
        </el-button>
        <el-button
          type="primary"
          @click="handlePartConflictConfirm"
        >
          确认并处理
        </el-button>
      </template>
    </el-dialog>

    <!-- ===== 批量导入：3步弹窗（选择文件 → 字段映射 → 数据校验+文件内重复处理） ===== -->
    <el-dialog
      v-model="importDialogVisible"
      title="批量导入零件"
      width="820px"
      :close-on-click-modal="false"
      @closed="resetImport"
    >
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

      <!-- 步骤1：选择文件 -->
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
        <div class="import-target-lib">
          <span class="import-target-lib-label">导入到库：</span>
          <el-select
            v-model="importTargetLibraryId"
            style="width: 220px"
          >
            <el-option
              v-for="lib in partLibrariesStore.libraries"
              :key="lib.id"
              :label="lib.name"
              :value="lib.id"
            />
          </el-select>
        </div>
      </div>

      <!-- 步骤2：列识别 + 数据预览 + 字段映射 -->
      <div v-else-if="importStep === 2">
        <el-alert
          type="info"
          :closable="false"
          style="margin-bottom: 16px"
        >
          识别到 {{ parsedColumns.length }} 列，共 {{ parsedRows.length }} 行数据。请确认字段映射（<span style="color: #f56c6c">*</span> 为必填）。
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
          字段映射（左侧系统字段 → 右侧 Excel 列）
        </el-divider>

        <div class="import-mapping-grid">
          <div class="mapping-col">
            <div class="mapping-col-title">
              系统字段
            </div>
            <div
              v-for="field in IMPORTABLE_FIELDS"
              :key="field.key"
              class="mapping-field-item"
              :class="{ matched: fieldMapping[field.key] }"
            >
              <span class="field-name">
                <span
                  v-if="field.required"
                  style="color: #f56c6c"
                >*</span>
                {{ field.label }}
              </span>
              <el-select
                v-model="fieldMapping[field.key]"
                placeholder="不导入"
                clearable
                size="small"
                style="width: 180px"
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
        </div>
      </div>

      <!-- 步骤3：数据校验 + 文件内重复处理 -->
      <div v-else-if="importStep === 3">
        <el-alert
          :type="importErrors.length === 0 ? 'success' : 'warning'"
          :closable="false"
          style="margin-bottom: 16px"
        >
          校验完成：共 {{ parsedRows.length }} 行，有效 {{ importValidCount }} 行，错误 {{ importErrors.length }} 行。
          <template v-if="duplicateGroups.length > 0">
            检测到 {{ duplicateGroups.length }} 组文件内重复图号，需选择处理方式。
          </template>
        </el-alert>

        <!-- 导入进度显示（大数据量优化） -->
        <div v-if="importing" class="import-progress">
          <div class="import-progress-text">{{ importProgressText }}</div>
          <el-progress
            :percentage="Math.round(importProgress)"
            :stroke-width="20"
            status="success"
          />
        </div>

        <!-- 错误明细 -->
        <div
          v-if="importErrors.length > 0"
          class="import-errors"
        >
          <div class="import-errors-header">
            错误明细（{{ importErrors.length }} 行）
          </div>
          <el-table
            :data="importErrors"
            border
            size="small"
            max-height="220"
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

        <!-- 文件内重复处理 -->
        <div
          v-if="duplicateGroups.length > 0"
          class="import-duplicates"
        >
          <div class="import-duplicates-header">
            文件内重复零件（{{ duplicateGroups.length }} 组）
          </div>
          <el-table
            :data="duplicateGroups"
            border
            size="small"
            max-height="200"
            style="margin-bottom: 12px"
          >
            <el-table-column
              prop="drawingNo"
              label="图号"
              min-width="160"
            />
            <el-table-column
              prop="count"
              label="出现次数"
              width="100"
              align="center"
            />
            <el-table-column
              label="所在行号"
              min-width="200"
            >
              <template #default="{ row }">
                第 {{ row.rowNums.join('、') }} 行
              </template>
            </el-table-column>
          </el-table>
          <div class="duplicate-strategy">
            <span class="duplicate-strategy-label">重复处理方式：</span>
            <el-radio-group v-model="duplicateStrategy">
              <el-radio value="first">
                保留第一条（后续重复跳过）
              </el-radio>
              <el-radio value="last">
                用后一条覆盖前面
              </el-radio>
              <el-radio value="skip">
                跳过所有重复图号
              </el-radio>
            </el-radio-group>
          </div>
          <div class="duplicate-result-tip">
            当前选择：将导入 {{ finalImportItems.length }} 条，跳过文件内重复 {{ skippedInternalCount }} 条。
          </div>
        </div>

        <!-- 有效数据预览 -->
        <div
          v-if="finalImportItems.length > 0"
          class="import-valid-preview"
        >
          <div class="import-preview-label">
            有效数据预览（前5行）：
          </div>
          <el-table
            :data="finalImportItems.slice(0, 5)"
            border
            size="small"
            max-height="200"
          >
            <el-table-column
              v-for="field in IMPORTABLE_FIELDS"
              :key="field.key"
              :prop="field.key"
              :label="field.label"
              min-width="100"
              show-overflow-tooltip
            />
          </el-table>
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
            @click="handleNextToValidate"
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
            :disabled="importErrors.length > 0 || finalImportItems.length === 0"
            @click="handleConfirmImport"
          >
            确认导入（{{ finalImportItems.length }} 行）
          </el-button>
        </template>
      </template>
    </el-dialog>

    <!-- ===== 新增/编辑零件库对话框 ===== -->
    <el-dialog
      v-model="libraryDialogVisible"
      :title="editingLibrary ? '编辑零件库' : '新增零件库'"
      width="480px"
    >
      <el-form
        :model="libraryForm"
        label-width="90px"
      >
        <el-form-item label="库名称">
          <el-input
            v-model="libraryForm.name"
            :disabled="isEditingDefaultLibrary"
            placeholder="请输入库名称"
          />
          <div
            v-if="isEditingDefaultLibrary"
            class="library-form-tip"
          >
            默认库名称不可修改
          </div>
        </el-form-item>
        <el-form-item label="库描述">
          <el-input
            v-model="libraryForm.description"
            type="textarea"
            :rows="2"
            placeholder="可选，用于备注该库用途"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="libraryDialogVisible = false">
          取消
        </el-button>
        <el-button
          type="primary"
          :loading="librarySaving"
          @click="handleSaveLibrary"
        >
          保存
        </el-button>
      </template>
    </el-dialog>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { Search, Plus, Upload, Download, Refresh, Loading, UploadFilled, Edit, Delete } from '@element-plus/icons-vue'
import dayjs from 'dayjs'
import { usePartsStore, type PartConflict } from '@/stores/parts'
import { useModulesStore } from '@/stores/modules'
import { useProjectsStore } from '@/stores/projects'
import { usePartLibrariesStore } from '@/stores/partLibraries'
import type { Part, PartLibrary } from '@/types'
import { DEFAULT_PART_LIBRARY_ID } from '@/types'
import { usePageSize } from '@/composables/usePageSize'
import { usePartCategories } from '@/composables/usePartCategories'
import { parseFile, type ParsedColumn } from '@/utils/importParser'
import { exportToExcel } from '@/utils/excel'
import { notifyDbError } from '@/utils/dbErrorHandler'
import EmptyState from '@/components/common/EmptyState.vue'
import ColumnSettings, { type ColumnConfig } from '@/components/common/ColumnSettings.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'

const router = useRouter()
const partsStore = usePartsStore()
const modulesStore = useModulesStore()
const projectsStore = useProjectsStore()
const partLibrariesStore = usePartLibrariesStore()
const { sortedCategories: partCategories, getCategoryName, getCategoryColor } = usePartCategories()

// ===== 状态记忆（记住上次打开状态） =====
const PARTS_LIST_STATE_KEY = 'parts_list_state'

interface PartsListState {
  keyword: string
  filterPartType: string
  sortField: string
  sortOrder: 'asc' | 'desc'
  currentPage: number
  selectedLibraryId: string
}

function loadSavedState(): Partial<PartsListState> {
  try {
    const saved = localStorage.getItem(PARTS_LIST_STATE_KEY)
    if (saved) {
      return JSON.parse(saved)
    }
  } catch {
    // 忽略解析错误
  }
  return {}
}

function saveState() {
  try {
    const state: PartsListState = {
      keyword: keyword.value,
      filterPartType: filterPartType.value,
      sortField: sortField.value,
      sortOrder: sortOrder.value,
      currentPage: currentPage.value,
      selectedLibraryId: selectedLibraryId.value
    }
    localStorage.setItem(PARTS_LIST_STATE_KEY, JSON.stringify(state))
  } catch {
    // 忽略保存错误
  }
}

const savedState = loadSavedState()

// ===== 搜索 =====
const keyword = ref(savedState.keyword || '')
const filterPartType = ref(savedState.filterPartType || '')
const filterPartCategory = ref('')
const sortField = ref(savedState.sortField || 'updatedAt')
const sortOrder = ref<'asc' | 'desc'>(savedState.sortOrder || 'desc')
const currentPage = ref(savedState.currentPage || 1)
const pageSize = usePageSize('parts_list', 20)
/** 当前选中的零件库 ID；'' 表示"全部库" */
const selectedLibraryId = ref(savedState.selectedLibraryId || '')

// ===== 服务端分页（按需加载，不依赖内存全量数组） =====
const serverItems = ref<Part[]>([])
const serverTotal = ref(0)
const tableLoading = ref(false)

async function loadPage() {
  tableLoading.value = true
  try {
    const { items, total } = await partsStore.getPartsPage(
      currentPage.value,
      pageSize.value,
      {
        keyword: keyword.value,
        category: filterPartCategory.value || undefined,
        sortField: sortField.value,
        sortOrder: sortOrder.value,
        ...(selectedLibraryId.value ? { libraryIds: [selectedLibraryId.value] } : {})
      }
    )
    serverItems.value = items
    serverTotal.value = total
  } catch (e) {
    notifyDbError(e, '加载零件分页')
  } finally {
    tableLoading.value = false
  }
}

// 服务端数据：在当前页上叠加零件类型客户端筛选
const tableData = computed<Part[]>(() => {
  if (!filterPartType.value) return serverItems.value
  return serverItems.value.filter((p) => p.partType === filterPartType.value)
})

// 监听分页/搜索/分类/排序变化，重新加载
watch([currentPage, pageSize, keyword, filterPartCategory, sortField, sortOrder], () => {
  loadPage()
})

// 切换零件库：重置到第1页并重新加载
watch(selectedLibraryId, () => {
  currentPage.value = 1
  loadPage()
})

onMounted(() => {
  loadPage()
})

// 监听状态变化，自动保存
watch([keyword, filterPartType, sortField, sortOrder, currentPage, selectedLibraryId], () => {
  saveState()
}, { deep: true })

// ===== 左侧零件库面板 =====
/** 全部库零件总数 = 内存中所有零件数 */
const totalPartCount = computed(() => partsStore.parts.length)

/** 各库零件数量（computed 缓存，随 partsStore.parts 自动更新） */
const libraryPartCounts = computed<Record<string, number>>(() => {
  const counts: Record<string, number> = {}
  for (const p of partsStore.parts) {
    counts[p.libraryId] = (counts[p.libraryId] || 0) + 1
  }
  return counts
})

function getPartCountOf(libraryId: string): number {
  if (!libraryId) return 0
  return libraryPartCounts.value[libraryId] || 0
}

/** 按库 ID 取库名（表格/选择器展示用） */
function getLibraryName(libraryId?: string): string {
  if (!libraryId) return '—'
  return partLibrariesStore.getById(libraryId)?.name || '—'
}

function selectLibrary(id: string) {
  selectedLibraryId.value = id
}

// ===== 新增/编辑零件库对话框 =====
const libraryDialogVisible = ref(false)
const librarySaving = ref(false)
const editingLibrary = ref<PartLibrary | null>(null)
const libraryForm = reactive({ name: '', description: '' })

/** 编辑默认库时名称不可修改 */
const isEditingDefaultLibrary = computed(
  () => !!editingLibrary.value && editingLibrary.value.id === DEFAULT_PART_LIBRARY_ID
)

function openLibraryDialog(lib?: PartLibrary) {
  editingLibrary.value = lib || null
  libraryForm.name = lib?.name || ''
  libraryForm.description = lib?.description || ''
  libraryDialogVisible.value = true
}

async function handleSaveLibrary() {
  const name = libraryForm.name.trim()
  if (!name && !isEditingDefaultLibrary.value) {
    ElMessage.warning('请输入库名称')
    return
  }
  librarySaving.value = true
  try {
    if (editingLibrary.value) {
      await partLibrariesStore.updateLibrary(editingLibrary.value.id, {
        name: isEditingDefaultLibrary.value ? undefined : name,
        description: libraryForm.description
      })
      ElMessage.success('零件库已更新')
    } else {
      await partLibrariesStore.addLibrary({
        name,
        description: libraryForm.description
      })
      ElMessage.success('零件库已创建')
    }
    libraryDialogVisible.value = false
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '保存失败')
  } finally {
    librarySaving.value = false
  }
}

async function handleDeleteLibrary(lib: PartLibrary) {
  const count = getPartCountOf(lib.id)
  try {
    await ElMessageBox.confirm(
      `确定要删除零件库「${lib.name}」吗？\n该库下的 ${count} 个零件将移到默认库，零件本身不会被删除。`,
      '删除零件库',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
  } catch {
    return
  }
  try {
    const { movedCount } = await partLibrariesStore.deleteLibrary(lib.id)
    // 若当前正在看被删除的库，切回"全部库"
    if (selectedLibraryId.value === lib.id) {
      selectedLibraryId.value = ''
    } else {
      loadPage()
    }
    ElMessage.success(`已删除零件库，${movedCount} 个零件已移到默认库`)
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '删除失败')
  }
}

// ===== 批量操作 =====
const tableRef = ref()
const selectedParts = ref<Part[]>([])
const batchPartType = ref('')
const batchPartCategory = ref('')
const moveTargetLibraryId = ref('')
const batchLoading = ref(false)
const resyncLoading = ref(false)

// ===== 列设置 =====
const defaultColumnConfigs: ColumnConfig[] = [
  { key: 'drawingNo', label: '图号', visible: true, width: 140 },
  { key: 'partType', label: '零件类型', visible: true, width: 100 },
  { key: 'jobNo', label: 'JOB号', visible: true, width: 130 },
  { key: 'chineseDescription', label: '中文描述', visible: true, width: 200 },
  { key: 'englishDescription', label: '英文描述', visible: true, width: 180 },
  { key: 'materialCatalogNo', label: '物料/目录号', visible: true, width: 140 },
  { key: 'assemblyUnit', label: '装配单位', visible: true, width: 90 },
  { key: 'totalAmount', label: '总金额', visible: true, width: 100 },
  { key: 'spareParts', label: '备件', visible: true, width: 80 },
  { key: 'partCategory', label: '零件分类', visible: true, width: 120 },
  { key: 'libraryId', label: '所属库', visible: true, width: 110 },
  { key: 'reserved2', label: '预留2', visible: false, width: 120 },
  { key: 'purchasingBatch', label: '采购批次', visible: false, width: 120 },
  { key: 'remarks', label: '备注', visible: true, width: 180 },
  { key: 'ecnNo', label: 'ECN号', visible: false, width: 110 },
  { key: 'ifKeyParts', label: '是否关键件', visible: false, width: 100 },
  { key: 'updatedAt', label: '更新时间', visible: true, width: 160 }
]

const columnConfigs = ref<ColumnConfig[]>([...defaultColumnConfigs])

/** 可见列（按配置顺序） */
const visibleColumns = computed(() => {
  return columnConfigs.value.filter((c) => c.visible)
})

function handleSelectionChange(selection: Part[]) {
  selectedParts.value = selection
}

function clearSelection() {
  tableRef.value?.clearSelection()
  selectedParts.value = []
  batchPartType.value = ''
  batchPartCategory.value = ''
  moveTargetLibraryId.value = ''
}

async function handleBatchUpdateType() {
  if (selectedParts.value.length === 0) {
    ElMessage.warning('请先选择零件')
    return
  }
  if (!batchPartType.value && batchPartType.value !== '') {
    ElMessage.warning('请选择要修改的类型')
    return
  }

  batchLoading.value = true
  try {
    let successCount = 0
    const newType = batchPartType.value as 'order' | 'assembly' | 'both' | ''
    for (const part of selectedParts.value) {
      try {
        await partsStore.updatePart(part.id, {
          partType: newType === '' ? null : newType
        } as any)
        successCount++
      } catch {
        // 忽略单个失败
      }
    }
    ElMessage.success(`成功修改 ${successCount} 个零件的类型`)
    clearSelection()
    loadPage()
  } finally {
    batchLoading.value = false
  }
}

async function handleBatchUpdateCategory() {
  if (selectedParts.value.length === 0) {
    ElMessage.warning('请先选择零件')
    return
  }
  if (!batchPartCategory.value && batchPartCategory.value !== '') {
    ElMessage.warning('请选择要修改的分类')
    return
  }

  batchLoading.value = true
  try {
    let successCount = 0
    let skippedCount = 0
    const newCategory = batchPartCategory.value
    for (const part of selectedParts.value) {
      if (part.partType !== 'order') {
        skippedCount++
        continue
      }
      try {
        await partsStore.updatePart(part.id, {
          partCategory: newCategory === '' ? null : newCategory
        } as any)
        successCount++
      } catch {
        // 忽略单个失败
      }
    }
    const skipMsg = skippedCount > 0 ? `，跳过 ${skippedCount} 个非下单零件` : ''
    ElMessage.success(`成功修改 ${successCount} 个下单零件的分类${skipMsg}`)
    clearSelection()
    loadPage()
  } finally {
    batchLoading.value = false
  }
}

async function handleMovePartsToLibrary() {
  if (selectedParts.value.length === 0) {
    ElMessage.warning('请先选择零件')
    return
  }
  if (!moveTargetLibraryId.value) {
    ElMessage.warning('请选择目标库')
    return
  }
  batchLoading.value = true
  try {
    const moved = await partsStore.movePartsToLibrary(
      selectedParts.value.map((p) => p.id),
      moveTargetLibraryId.value
    )
    const targetName = partLibrariesStore.getById(moveTargetLibraryId.value)?.name || ''
    ElMessage.success(`已将 ${moved} 个零件移动到「${targetName}」`)
    clearSelection()
    loadPage()
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '移动失败')
  } finally {
    batchLoading.value = false
  }
}

async function handleBatchDelete() {
  if (selectedParts.value.length === 0) {
    ElMessage.warning('请先选择零件')
    return
  }

  // 检查是否有被引用的零件
  const referencedParts: Part[] = []
  for (const part of selectedParts.value) {
    const refs = await partsStore.getPartReferences(part.id)
    if (refs.moduleIds.length > 0 || refs.projectIds.length > 0) {
      referencedParts.push(part)
    }
  }

  if (referencedParts.length > 0) {
    ElMessageBox.confirm(
      `选中的 ${selectedParts.value.length} 个零件中，有 ${referencedParts.length} 个正在被组件或项目引用，删除后引用将失效。是否继续删除？`,
      '批量删除确认',
      {
        confirmButtonText: '继续删除',
        cancelButtonText: '取消',
        type: 'warning'
      }
    ).then(async () => {
      await doBatchDelete()
    }).catch(() => {})
  } else {
    ElMessageBox.confirm(
      `确定要删除选中的 ${selectedParts.value.length} 个零件吗？`,
      '批量删除确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    ).then(async () => {
      await doBatchDelete()
    }).catch(() => {})
  }
}

async function doBatchDelete() {
  batchLoading.value = true
  try {
    let successCount = 0
    for (const part of selectedParts.value) {
      try {
        await partsStore.deletePart(part.id)
        successCount++
      } catch {
        // 忽略单个失败
      }
    }
    ElMessage.success(`成功删除 ${successCount} 个零件`)
    clearSelection()
    loadPage()
  } finally {
    batchLoading.value = false
  }
}

function handleBatchExport() {
  if (selectedParts.value.length === 0) {
    ElMessage.warning('请先选择零件')
    return
  }
  const data = selectedParts.value.map((p, idx) => ({
    序号: idx + 1,
    图号: p.drawingNo || '',
    零件类型: p.partType === 'order' ? '下单零件' : p.partType === 'assembly' ? '模型零件' : p.partType === 'both' ? '两者' : '',
    JOB号: p.jobNo || '',
    中文描述: p.chineseDescription || '',
    英文描述: p.englishDescription || '',
    '物料/目录号': p.materialCatalogNo || '',
    装配单位: p.assemblyUnit || '',
    总金额: p.totalAmount ?? '',
    备件: p.spareParts ?? '',
    零件分类: p.partType === 'order' && p.partCategory ? getCategoryName(p.partCategory) : '',
    预留2: p.reserved2 || '',
    采购批次: p.purchasingBatch || '',
    备注: p.remarks || '',
    ECN号: p.ecnNo || '',
    是否关键件: p.ifKeyParts || '',
    更新时间: formatTime(p.updatedAt)
  }))
  exportToExcel(data, `零件库_选中_${dayjs().format('YYYYMMDD_HHmmss')}`, '零件库')
  ElMessage.success(`已导出 ${data.length} 条零件`)
}

const filteredParts = computed<Part[]>(() => {
  let result = [...partsStore.parts]

  // 关键词搜索
  const kw = keyword.value.trim()
  if (kw) {
    result = partsStore.search(kw)
  }

  // 按零件类型筛选
  if (filterPartType.value) {
    result = result.filter((p) => p.partType === filterPartType.value)
  }

  // 按当前选中的零件库过滤（'' 表示全部库）
  if (selectedLibraryId.value) {
    result = result.filter((p) => p.libraryId === selectedLibraryId.value)
  }

  // 按零件分类筛选（仅下单零件）
  if (filterPartCategory.value) {
    result = result.filter((p) => p.partType === 'order' && p.partCategory === filterPartCategory.value)
  }

  // 排序
  const field = sortField.value
  const order = sortOrder.value
  result.sort((a, b) => {
    const valA = a[field]
    const valB = b[field]
    if (valA === undefined || valA === null) return order === 'asc' ? -1 : 1
    if (valB === undefined || valB === null) return order === 'asc' ? 1 : -1
    if (typeof valA === 'number' && typeof valB === 'number') {
      return order === 'asc' ? valA - valB : valB - valA
    }
    // 自然排序：正确处理包含数字的字符串（如 "2" < "10"）
    const strA = String(valA)
    const strB = String(valB)
    const naturalCompare = (a: string, b: string): number => {
      const regex = /(\d+)|(\D+)/g
      const partsA = a.match(regex) || []
      const partsB = b.match(regex) || []
      const len = Math.min(partsA.length, partsB.length)
      for (let i = 0; i < len; i++) {
        const partA = partsA[i]
        const partB = partsB[i]
        const numA = parseInt(partA, 10)
        const numB = parseInt(partB, 10)
        if (!isNaN(numA) && !isNaN(numB)) {
          if (numA !== numB) return numA - numB
        } else {
          const cmp = partA.toLowerCase().localeCompare(partB.toLowerCase())
          if (cmp !== 0) return cmp
        }
      }
      return partsA.length - partsB.length
    }
    const cmp = naturalCompare(strA, strB)
    return order === 'asc' ? cmp : -cmp
  })

  return result
})

const pagedParts = computed<Part[]>(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filteredParts.value.slice(start, start + pageSize.value)
})

function handleSearch() {
  currentPage.value = 1
}

function handleFilterChange() {
  currentPage.value = 1
}

function handleSortChange() {
  // 排序变化不需要重置页码
}

function handleRefresh() {
  loadPage().then(() => {
    ElMessage.success('零件库已刷新')
  })
}

async function handleResync() {
  try {
    await ElMessageBox.confirm(
      '重新同步将清空现有零件库，并从所有BOM条目中重新提取零件（排除组件/子组件条目）。此操作不可撤销，是否继续？',
      '重新同步零件库',
      {
        confirmButtonText: '继续同步',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
  } catch {
    return
  }

  resyncLoading.value = true
  try {
    const result = await partsStore.resyncPartsLibrary()
    ElMessage.success(`重新同步完成：新建零件 ${result.createdParts} 个，关联 BOM 条目 ${result.linkedItems} 条`)
    currentPage.value = 1
    clearSelection()
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    ElMessage.error(`重新同步失败：${msg}`)
  } finally {
    resyncLoading.value = false
  }
}

// ===== 格式化 =====
function formatTime(v?: string): string {
  if (!v) return '—'
  return dayjs(v).format('YYYY-MM-DD HH:mm')
}

function formatMoney(v?: number): string {
  if (v === undefined || v === null) return '—'
  const n = Number(v)
  if (isNaN(n)) return '—'
  return n.toFixed(2)
}

// 搜索关键词高亮
function highlightKeyword(text: any): string {
  const kw = keyword.value.trim()
  if (!kw || text === undefined || text === null) return text === undefined || text === null ? '—' : String(text)
  const str = String(text)
  // HTML转义
  const escaped = str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
  // 关键词转义（用于正则）
  const escapedKw = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  // 替换关键词（不区分大小写）
  return escaped.replace(new RegExp(escapedKw, 'gi'), (match) => `<span class="search-highlight">${match}</span>`)
}

// ===== 新增/编辑零件 =====
const editDialogVisible = ref(false)
const editFormRef = ref<FormInstance>()
const editingPart = ref<Part | null>(null)

const editForm = reactive<Record<string, any>>({
  drawingNo: '',
  libraryId: '',
  partType: '',
  jobNo: '',
  chineseDescription: '',
  englishDescription: '',
  materialCatalogNo: '',
  assemblyUnit: '',
  totalAmount: undefined,
  spareParts: undefined,
  partCategory: '',
  reserved2: '',
  purchasingBatch: '',
  remarks: '',
  ecnNo: '',
  ifKeyParts: ''
})

const editRules: FormRules = {
  drawingNo: [
    { required: true, message: '请输入图号', trigger: 'blur' }
  ]
}

function openEditDialog(part?: Part) {
  if (part) {
    editingPart.value = part
    for (const key of Object.keys(editForm)) {
      editForm[key] = (part as any)[key] ?? (key === 'totalAmount' || key === 'spareParts' ? undefined : '')
    }
  } else {
    editingPart.value = null
    for (const key of Object.keys(editForm)) {
      editForm[key] = key === 'totalAmount' || key === 'spareParts' ? undefined : ''
    }
    // 新增零件：默认归入当前选中的库；"全部库"时归入默认库
    editForm.libraryId = selectedLibraryId.value || partLibrariesStore.getDefaultLibrary().id
  }
  editDialogVisible.value = true
}

function resetEditForm() {
  editingPart.value = null
  for (const key of Object.keys(editForm)) {
    editForm[key] = key === 'totalAmount' || key === 'spareParts' ? undefined : ''
  }
}

async function handleSavePart() {
  if (!editFormRef.value) return
  try {
    await editFormRef.value.validate()
  } catch {
    return
  }

  // 清理空字符串为 undefined，避免覆盖零件库已有值
  const payload: Record<string, any> = {}
  for (const [k, v] of Object.entries(editForm)) {
    if (v === '' || v === undefined || v === null) continue
    payload[k] = v
  }
  if (payload.totalAmount !== undefined) payload.totalAmount = Number(payload.totalAmount)
  if (payload.spareParts !== undefined) payload.spareParts = Number(payload.spareParts)

  try {
    if (editingPart.value) {
      // 编辑模式：图号不可修改，不存在冲突问题，直接更新
      await partsStore.updatePart(editingPart.value.id, payload)
      ElMessage.success('零件已更新')
      editDialogVisible.value = false
      loadPage()
    } else {
      // 新增模式：先检测与零件库已有零件的冲突
      const conflict = partsStore.detectPartConflict(payload)
      if (!conflict) {
        // 无冲突：直接新增
        await partsStore.addPart(payload as Omit<Part, 'id' | 'createdAt' | 'updatedAt'>)
        ElMessage.success('零件已新增')
        editDialogVisible.value = false
        loadPage()
      } else {
        // 有冲突：弹出冲突对话框，不关闭编辑对话框，等用户处理完再关
        partConflicts.value = [conflict]
        pendingPartSaveData.value = payload
        partConflictSource.value = 'add'
        partConflictAllAction.value = 'overwrite'
        partConflictDialogVisible.value = true
      }
    }
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '保存失败')
  }
}

// ===== 删除 =====
async function handleDelete(part: Part) {
  try {
    await ElMessageBox.confirm(
      `确定要删除零件「${part.drawingNo || part.chineseDescription || '(无图号)'}」吗？`,
      '删除确认',
      { type: 'warning', confirmButtonText: '确定删除', cancelButtonText: '取消' }
    )
  } catch {
    return
  }
  try {
    await partsStore.deletePart(part.id)
    ElMessage.success('删除成功')
    if (serverItems.value.length === 1 && currentPage.value > 1) {
      currentPage.value--
    } else {
      loadPage()
    }
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '删除失败')
  }
}

// ===== 查看引用 =====
const refsDialogVisible = ref(false)
const refsLoading = ref(false)
const refsTarget = ref<Part | null>(null)
const refModules = ref<{ id: string; nameZh: string; drawingNo: string }[]>([])
const refProjects = ref<{ id: string; name: string; jobNo: string }[]>([])

async function openReferencesDialog(part: Part) {
  refsTarget.value = part
  refsDialogVisible.value = true
  refsLoading.value = true
  refModules.value = []
  refProjects.value = []
  try {
    const { moduleIds, projectIds } = await partsStore.getPartReferences(part.id)
    refModules.value = moduleIds
      .map((id) => {
        const m = modulesStore.getModuleById(id)
        return m ? { id: m.id, nameZh: m.nameZh, drawingNo: m.drawingNo } : null
      })
      .filter(Boolean) as { id: string; nameZh: string; drawingNo: string }[]
    refProjects.value = projectIds
      .map((id) => {
        const p = projectsStore.getProjectById(id)
        return p ? { id: p.id, name: p.name, jobNo: p.jobNo } : null
      })
      .filter(Boolean) as { id: string; name: string; jobNo: string }[]
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '查询引用失败')
  } finally {
    refsLoading.value = false
  }
}

function goToModule(moduleId: string) {
  refsDialogVisible.value = false
  router.push(`/module/${moduleId}/edit`)
}

// ===== 批量导入（3步弹窗：选择文件 → 字段映射 → 数据校验+文件内重复处理） =====

/** 可导入的系统字段定义 */
interface ImportableField {
  key: string
  label: string
  required?: boolean
  isNumber?: boolean
}

const IMPORTABLE_FIELDS: ImportableField[] = [
  { key: 'drawingNo', label: '图号', required: true },
  { key: 'jobNo', label: 'JOB号' },
  { key: 'chineseDescription', label: '中文描述' },
  { key: 'englishDescription', label: '英文描述' },
  { key: 'materialCatalogNo', label: '物料/目录号' },
  { key: 'assemblyUnit', label: '装配单位' },
  { key: 'totalAmount', label: '总金额', isNumber: true },
  { key: 'spareParts', label: '备件', isNumber: true },
  { key: 'partCategory', label: '零件分类' },
  { key: 'reserved2', label: '预留2' },
  { key: 'purchasingBatch', label: '采购批次' },
  { key: 'remarks', label: '备注' },
  { key: 'ecnNo', label: 'ECN号' },
  { key: 'ifKeyParts', label: '是否关键件' },
  { key: 'partType', label: '零件类型' }
]

/** 导入弹窗状态 */
const importDialogVisible = ref(false)
const importStep = ref(1)
const importFileName = ref('')
const importTargetLibraryId = ref('')
const importing = ref(false)
const importProgress = ref(0)
const importProgressText = ref('')
const parsedColumns = ref<ParsedColumn[]>([])
const parsedRows = ref<Record<string, any>[]>([])
/** 字段映射：key=系统字段key，value=Excel列的标准化name */
const fieldMapping = reactive<Record<string, string>>({})

/** 行级错误 / 有效行 / 文件内重复组 */
interface ImportRowError {
  rowNum: number
  reason: string
}
interface DuplicateGroup {
  drawingNo: string
  count: number
  rowNums: number[]
}
interface ValidImportItem extends Record<string, any> {
  _rowNum: number
}

const importErrors = ref<ImportRowError[]>([])
const validItems = ref<ValidImportItem[]>([])
const duplicateGroups = ref<DuplicateGroup[]>([])
/** 文件内重复处理策略：first=保留第一条，last=后一条覆盖，skip=跳过所有重复 */
const duplicateStrategy = ref<'first' | 'last' | 'skip'>('first')
/** 文件内重复被跳过的数量（供冲突对话框结果消息一并展示） */
const importInternalSkipped = ref(0)

const importValidCount = computed(() => validItems.value.length)

watch(importDialogVisible, (val) => {
  if (val) {
    for (const field of IMPORTABLE_FIELDS) {
      if (!(field.key in fieldMapping)) fieldMapping[field.key] = ''
    }
  }
})

function triggerImport() {
  // 默认导入到当前选中的库；若选中"全部库"则导入到默认库
  importTargetLibraryId.value = selectedLibraryId.value || DEFAULT_PART_LIBRARY_ID
  importDialogVisible.value = true
}

/**
 * 自动匹配字段映射：
 * - parseFile 已通过 normalizeColumnName 把中文别名标准化为英文字段key（如「图号」→ drawingNo），
 *   因此 col.name 与系统字段 key 直接相等即可命中；
 * - 兜底再用原始 label 与中文标签比较一次。
 */
function autoMatchMapping() {
  for (const field of IMPORTABLE_FIELDS) {
    fieldMapping[field.key] = ''
  }
  for (const col of parsedColumns.value) {
    const byName = IMPORTABLE_FIELDS.find((f) => f.key === col.name)
    if (byName && !fieldMapping[byName.key]) {
      fieldMapping[byName.key] = col.name
      continue
    }
    const byLabel = IMPORTABLE_FIELDS.find((f) => f.label === col.label.trim())
    if (byLabel && !fieldMapping[byLabel.key]) {
      fieldMapping[byLabel.key] = col.name
    }
  }
}

/** 检测两个系统字段是否映射到同一 Excel 列，返回错误信息（无冲突返回 null） */
function findDuplicateMapping(): string | null {
  const used = new Map<string, string>()
  for (const field of IMPORTABLE_FIELDS) {
    const col = fieldMapping[field.key]
    if (!col) continue
    if (used.has(col)) {
      const prevKey = used.get(col)!
      const prevLabel = IMPORTABLE_FIELDS.find((f) => f.key === prevKey)?.label || prevKey
      return `字段「${prevLabel}」和「${field.label}」映射到了同一列，请调整`
    }
    used.set(col, field.key)
  }
  return null
}

/** partType 列值归一化（兼容中文写法） */
function normalizePartType(raw: string): string | undefined {
  const s = raw.trim()
  if (!s) return undefined
  if (['order', 'assembly', 'both'].includes(s)) return s as 'order' | 'assembly' | 'both'
  if (s.includes('两者') || s.includes('都')) return 'both'
  if (s.includes('模型') || s.includes('装配')) return 'assembly'
  if (s.includes('下单')) return 'order'
  return s
}

async function handleFileChange(file: { raw: File; name: string }) {
  const rawFile = file.raw
  importFileName.value = rawFile.name
  try {
    const result = await parseFile(rawFile)
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

/** 步骤2 → 步骤3：校验映射配置并执行行级数据校验 + 文件内重复检测 */
function handleNextToValidate() {
  if (!fieldMapping['drawingNo']) {
    ElMessage.warning('请映射必填字段「图号」')
    return
  }
  const dup = findDuplicateMapping()
  if (dup) {
    ElMessage.warning(dup)
    return
  }
  runValidation()
  duplicateStrategy.value = 'first'
  importStep.value = 3
}

/** 行级数据校验 + 完全空行跳过 + 文件内同图号重复检测 */
function runValidation() {
  importErrors.value = []
  validItems.value = []
  duplicateGroups.value = []

  for (let i = 0; i < parsedRows.value.length; i++) {
    const rowNum = i + 1
    const row = parsedRows.value[i]
    const errors: string[] = []
    const item: Record<string, any> = {}
    let hasAnyValue = false

    for (const field of IMPORTABLE_FIELDS) {
      const colName = fieldMapping[field.key]
      if (!colName) continue
      const rawVal = row[colName]
      const isEmpty = rawVal === undefined || rawVal === null || rawVal === ''
      if (isEmpty) continue
      hasAnyValue = true

      if (field.isNumber) {
        const n = Number(rawVal)
        if (isNaN(n)) {
          errors.push(`「${field.label}」必须为数字`)
        } else {
          item[field.key] = n
        }
      } else if (field.key === 'partType') {
        item[field.key] = normalizePartType(String(rawVal))
      } else {
        item[field.key] = String(rawVal).trim()
      }
    }

    // 完全空行自动跳过（不算错误）
    if (!hasAnyValue) continue

    // 必填校验：图号
    const dn = item.drawingNo != null ? String(item.drawingNo).trim() : ''
    if (!dn) errors.push('图号不能为空')

    if (errors.length > 0) {
      importErrors.value.push({ rowNum, reason: errors.join('；') })
    } else {
      validItems.value.push({ ...item, _rowNum: rowNum })
    }
  }

  // 文件内重复检测：按图号分组，出现次数 > 1 的列为重复
  const groups = new Map<string, number[]>()
  for (const it of validItems.value) {
    const dn = String(it.drawingNo).trim()
    if (!groups.has(dn)) groups.set(dn, [])
    groups.get(dn)!.push(it._rowNum)
  }
  for (const [dn, rowNums] of groups) {
    if (rowNums.length > 1) {
      duplicateGroups.value.push({ drawingNo: dn, count: rowNums.length, rowNums })
    }
  }
}

/** 根据用户选择的重复策略，从有效行中得到最终待导入 items */
const finalImportItems = computed<Omit<Part, 'id' | 'createdAt' | 'updatedAt'>[]>(() => {
  const strip = (it: ValidImportItem): Record<string, any> => {
    const { _rowNum, ...rest } = it
    return rest
  }
  if (duplicateGroups.value.length === 0) {
    return validItems.value.map(strip)
  }
  if (duplicateStrategy.value === 'first') {
    const seen = new Set<string>()
    const result: Record<string, any>[] = []
    for (const it of validItems.value) {
      const dn = String(it.drawingNo).trim()
      if (seen.has(dn)) continue
      seen.add(dn)
      result.push(strip(it))
    }
    return result
  }
  if (duplicateStrategy.value === 'last') {
    // 同一图号保留最后一条，出现顺序按首次出现排列
    const lastMap = new Map<string, Record<string, any>>()
    for (const it of validItems.value) {
      const dn = String(it.drawingNo).trim()
      lastMap.set(dn, strip(it))
    }
    return Array.from(lastMap.values())
  }
  // skip：有重复的图号整体不导入
  const dupSet = new Set(duplicateGroups.value.map((g) => g.drawingNo))
  const result: Record<string, any>[] = []
  for (const it of validItems.value) {
    const dn = String(it.drawingNo).trim()
    if (dupSet.has(dn)) continue
    result.push(strip(it))
  }
  return result
})

/** 文件内重复被跳过的数量 */
const skippedInternalCount = computed(() => validItems.value.length - finalImportItems.value.length)

/** 步骤3：确认导入 */
async function handleConfirmImport() {
  const items = finalImportItems.value
  if (items.length === 0) {
    ElMessage.warning('没有可导入的有效数据')
    return
  }
  importing.value = true
  importInternalSkipped.value = skippedInternalCount.value
  try {
    // 批量检测与零件库已有零件的冲突
    const conflicts = partsStore.detectPartConflictsBatch(items)
    if (conflicts.length === 0) {
      // 无冲突：直接导入
      const { added, updated, skipped } = await partsStore.bulkImport(items, importTargetLibraryId.value)
      const totalSkipped = skipped + importInternalSkipped.value
      if (importInternalSkipped.value > 0) {
        ElMessage.success(`导入完成：新增 ${added} 条，更新 ${updated} 条，跳过 ${totalSkipped} 条（文件内重复 ${importInternalSkipped.value} 条）`)
      } else {
        ElMessage.success(`导入完成：新增 ${added} 条，更新 ${updated} 条`)
      }
      importDialogVisible.value = false
      loadPage()
    } else {
      // 有冲突：关闭导入弹窗，弹出冲突对话框
      partConflicts.value = conflicts
      pendingImportItems.value = items
      partConflictSource.value = 'import'
      partConflictAllAction.value = 'overwrite'
      partConflictDialogVisible.value = true
      importDialogVisible.value = false
    }
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '导入失败')
  } finally {
    importing.value = false
  }
}

/** 关闭弹窗后重置全部导入状态 */
function resetImport() {
  importStep.value = 1
  importFileName.value = ''
  parsedColumns.value = []
  parsedRows.value = []
  importErrors.value = []
  validItems.value = []
  duplicateGroups.value = []
  duplicateStrategy.value = 'first'
  importInternalSkipped.value = 0
  for (const field of IMPORTABLE_FIELDS) {
    fieldMapping[field.key] = ''
  }
}

// ===== 零件查重对比校验（冲突对话框） =====
const partConflictDialogVisible = ref(false)
const partConflicts = ref<PartConflict[]>([])
const partConflictAllAction = ref<'keep' | 'overwrite'>('overwrite')
const partConflictSource = ref<'add' | 'import'>('add')
const pendingPartSaveData = ref<Record<string, any> | null>(null)
const pendingImportItems = ref<Record<string, any>[]>([])

/** 批量设置所有冲突的处理方式 */
function setAllPartConflictAction(action: 'keep' | 'overwrite') {
  partConflictAllAction.value = action
  for (const c of partConflicts.value) {
    c.action = action
  }
}

/** 关闭冲突对话框并清空 pending 数据 */
function resetPartConflictState() {
  partConflictDialogVisible.value = false
  partConflicts.value = []
  pendingPartSaveData.value = null
  pendingImportItems.value = []
  partConflictAllAction.value = 'overwrite'
}

/** 新增零件冲突处理：overwrite 更新已有零件参数，keep 保留库里参数 */
async function applyPartConflictResolution() {
  let overwritten = 0
  let kept = 0
  for (const conflict of partConflicts.value) {
    if (conflict.action === 'overwrite') {
      await partsStore.updatePart(conflict.existingPart.id, conflict.newData)
      overwritten++
    } else {
      kept++
    }
  }
  if (overwritten > 0 && kept > 0) {
    ElMessage.success(`已用新数据覆盖零件库参数，保留 ${kept} 个零件库参数`)
  } else if (overwritten > 0) {
    ElMessage.success('已用新数据覆盖零件库参数')
  } else {
    ElMessage.success('已保留零件库参数')
  }
  editDialogVisible.value = false
  resetPartConflictState()
  loadPage()
}

/** 批量导入冲突处理：分三组（新增 / 覆盖更新 / 跳过）处理，使用批量写入优化性能 */
async function applyImportConflictResolution() {
  // 按图号建立冲突索引
  const conflictMap = new Map<string, PartConflict>()
  for (const c of partConflicts.value) {
    conflictMap.set(c.drawingNo, c)
  }

  const toCreate: Record<string, any>[] = []
  const toUpdate: { item: Record<string, any>; existingId: string }[] = []
  let skipped = 0

  for (const item of pendingImportItems.value) {
    const dn = item.drawingNo != null ? String(item.drawingNo).trim() : ''
    const conflict = dn ? conflictMap.get(dn) : undefined
    if (!conflict) {
      // 无冲突：新增
      toCreate.push(item)
    } else if (conflict.action === 'overwrite') {
      // 覆盖：更新已有零件
      toUpdate.push({ item, existingId: conflict.existingPart.id })
    } else {
      // 保留库里参数：跳过
      skipped++
    }
  }

  // 大数据量优化：分片批量写入 + 进度显示
  const BATCH_SIZE = 2000
  const total = toCreate.length + toUpdate.length
  let added = 0
  let updated = 0

  if (total > 0) {
    importing.value = true
    importProgress.value = 0
    importProgressText.value = `准备导入 ${total} 条数据...`

    // 分片处理新增数据
    for (let i = 0; i < toCreate.length; i += BATCH_SIZE) {
      const batchCreate = toCreate.slice(i, i + BATCH_SIZE)
      const result = await partsStore.bulkImportFast(batchCreate as any, [], importTargetLibraryId.value)
      added += result.added
      importProgress.value = ((added + updated) / total) * 100
      importProgressText.value = `已导入 ${added + updated}/${total} 条（新增 ${added}，更新 ${updated}）`
      // 让出主线程，避免页面卡死
      await new Promise(r => setTimeout(r, 0))
    }

    // 分片处理更新数据
    for (let i = 0; i < toUpdate.length; i += BATCH_SIZE) {
      const batchUpdate = toUpdate.slice(i, i + BATCH_SIZE)
      const result = await partsStore.bulkImportFast([], batchUpdate as any, importTargetLibraryId.value)
      updated += result.updated
      importProgress.value = ((added + updated) / total) * 100
      importProgressText.value = `已导入 ${added + updated}/${total} 条（新增 ${added}，更新 ${updated}）`
      // 让出主线程，避免页面卡死
      await new Promise(r => setTimeout(r, 0))
    }

    importing.value = false
    importProgress.value = 100
    importProgressText.value = '导入完成'
  }

  const internalPart = importInternalSkipped.value > 0 ? `，文件内重复跳过 ${importInternalSkipped.value} 条` : ''
  ElMessage.success(`导入完成：新增 ${added} 条，更新 ${updated} 条，跳过 ${skipped} 条（冲突保留）${internalPart}`)
  importInternalSkipped.value = 0
  resetPartConflictState()
  loadPage()
}

/** 确认按钮：根据来源调用不同的处理函数 */
function handlePartConflictConfirm() {
  if (partConflictSource.value === 'add') {
    applyPartConflictResolution()
  } else {
    applyImportConflictResolution()
  }
}

// ===== 导出 =====
function handleExport() {
  const data = filteredParts.value.map((p, idx) => ({
    序号: idx + 1,
    图号: p.drawingNo || '',
    JOB号: p.jobNo || '',
    中文描述: p.chineseDescription || '',
    英文描述: p.englishDescription || '',
    '物料/目录号': p.materialCatalogNo || '',
    装配单位: p.assemblyUnit || '',
    总金额: p.totalAmount ?? '',
    备件: p.spareParts ?? '',
    零件分类: p.partType === 'order' && p.partCategory ? getCategoryName(p.partCategory) : '',
    预留2: p.reserved2 || '',
    采购批次: p.purchasingBatch || '',
    备注: p.remarks || '',
    ECN号: p.ecnNo || '',
    是否关键件: p.ifKeyParts || '',
    更新时间: formatTime(p.updatedAt)
  }))
  exportToExcel(data, `零件库_${dayjs().format('YYYYMMDD_HHmmss')}`, '零件库')
  ElMessage.success(`已导出 ${data.length} 条零件`)
}
</script>

<style scoped>
/* ===== 页面整体布局：左侧库面板 + 右侧内容区 ===== */
.parts-page-layout {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}

/* ===== 左侧零件库面板 ===== */
.library-panel {
  width: 220px;
  flex-shrink: 0;
  background: #fff;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  padding: 12px;
  position: sticky;
  top: 16px;
  max-height: calc(100vh - 120px);
  overflow-y: auto;
}

.library-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 10px;
  margin-bottom: 8px;
  border-bottom: 1px solid #ebeef5;
}

.library-panel-title {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
}

.library-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.library-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.15s ease;
  position: relative;
}

.library-item:hover {
  background-color: #f5f7fa;
}

.library-item.active {
  background-color: #ecf5ff;
  color: #409eff;
}

.library-item.active .lib-name {
  color: #409eff;
  font-weight: 600;
}

.lib-icon {
  font-size: 16px;
  flex-shrink: 0;
}

.lib-name {
  flex: 1;
  font-size: 13px;
  color: #606266;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.lib-count {
  font-size: 12px;
  color: #909399;
  background: #f5f7fa;
  padding: 1px 8px;
  border-radius: 10px;
  flex-shrink: 0;
  min-width: 28px;
  text-align: center;
}

.library-item.active .lib-count {
  background: #409eff;
  color: #fff;
}

.lib-actions {
  display: none;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
}

.library-item:hover .lib-actions {
  display: flex;
}

.library-item:hover .lib-count {
  display: none;
}

/* ===== 右侧内容区 ===== */
.main-content {
  flex: 1;
  min-width: 0 !important;
}

/* 表格滚动使用Element Plus默认行为，表头表体共享滚动条 */

.import-progress {
  margin-bottom: 16px;
  padding: 16px;
  background: #f0f9ff;
  border: 1px solid #bae7ff;
  border-radius: 4px;
}
.import-progress-text {
  font-size: 14px;
  color: #1890ff;
  margin-bottom: 12px;
  font-weight: 500;
}
.batch-action-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  margin-bottom: 12px;
  background: #ecf5ff;
  border: 1px solid #d9ecff;
  border-radius: 4px;
}
.batch-selected-count {
  font-size: 14px;
  color: #409eff;
  font-weight: 600;
}
.batch-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
.toolbar-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}
.toolbar-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
.pagination-wrapper {
  display: flex;
  align-items: center;
  margin-top: 16px;
}
.pagination-total {
  width: 100px;
  color: var(--text-secondary, #909399);
  font-size: 13px;
  flex-shrink: 0;
}
.pagination-center {
  flex: 1;
  display: flex;
  justify-content: center;
}
.pagination-spacer {
  width: 100px;
  flex-shrink: 0;
}
.row-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}
.table-action-btn {
  opacity: 0.45;
  transition: opacity 0.15s ease;
}
:deep(.el-table__row:hover) .table-action-btn {
  opacity: 1;
}
.refs-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 40px 0;
  color: #909399;
}
.refs-part-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  background: #f5f7fa;
  border-radius: 6px;
  margin-bottom: 8px;
}
.refs-part-no {
  font-weight: 600;
  color: #303133;
}
.refs-part-desc {
  color: #606266;
  font-size: 13px;
}

/* ===== 零件数据冲突确认对话框 ===== */
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

.conflict-diff-count.conflict-diff-equal {
  background: #f0f9eb;
  color: #67c23a;
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
  color: #e6a23c;
  font-weight: 500;
}

/* ===== 批量导入弹窗 ===== */
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
.import-columns-label {
  font-size: 13px;
  color: #606266;
  margin-right: 4px;
  line-height: 24px;
}
.col-tag { margin: 0; }
.import-preview-label {
  font-size: 13px;
  color: #606266;
  font-weight: 600;
  margin: 8px 0;
}
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
.import-errors {
  margin-top: 16px;
}
.import-errors-header {
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: 600;
  color: #e6a23c;
}
.import-duplicates {
  margin-top: 16px;
  padding: 12px;
  background: #fdf6ec;
  border: 1px solid #faecd8;
  border-radius: 6px;
}
.import-duplicates-header {
  font-size: 13px;
  font-weight: 600;
  color: #e6a23c;
  margin-bottom: 8px;
}
.duplicate-strategy {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}
.duplicate-strategy-label {
  font-size: 13px;
  color: #606266;
  font-weight: 600;
}
.duplicate-result-tip {
  margin-top: 8px;
  font-size: 12px;
  color: #909399;
}
.import-valid-preview {
  margin-top: 16px;
}
/* 搜索关键词高亮 */
:deep(.search-highlight) {
  background-color: #fff3cd;
  color: #d4380d;
  padding: 0 2px;
  border-radius: 2px;
  font-weight: 600;
}
</style>
