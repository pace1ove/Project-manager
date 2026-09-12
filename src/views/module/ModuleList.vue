<template>
  <div class="module-list">
    <PageBreadcrumb />
    <!-- 查询条件 -->
    <el-card
      class="search-card"
      shadow="never"
    >
      <el-form
        :inline="true"
        :model="searchForm"
        label-position="right"
        @submit.prevent
      >
        <el-form-item label="关键词">
          <el-input
            v-model="searchForm.keyword"
            placeholder="图号 / 中文名 / 英文名"
            clearable
            style="width: 220px"
            @keyup.enter="handleSearch"
          />
        </el-form-item>
        <el-form-item label="所属设备">
          <el-select
            v-model="searchForm.equipmentId"
            placeholder="全部设备"
            clearable
            style="width: 180px"
          >
            <el-option
              v-for="eq in equipmentStore.equipments"
              :key="eq.id"
              :label="eq.name"
              :value="eq.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="标签">
          <el-select
            v-model="searchForm.tagIds"
            placeholder="全部标签"
            multiple
            clearable
            style="width: 220px"
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
        <el-form-item>
          <AdvancedFilter
            v-model="filterConditions"
            v-model:logic="filterLogic"
            :fields="filterFields"
            storage-key="module_list"
            @filter="handleAdvancedFilter"
            @reset="handleAdvancedReset"
          />
        </el-form-item>
        <el-form-item>
          <el-button
            type="primary"
            @click="handleSearch"
          >
            查询
          </el-button>
          <el-button @click="handleReset">
            重置
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 操作栏 + 表格 -->
    <el-card
      ref="tableContainerRef"
      class="table-card"
      shadow="never"
    >
      <div class="toolbar">
        <el-button
          type="primary"
          @click="router.push('/module/new')"
        >
          <el-icon><Plus /></el-icon>新建组件
        </el-button>
        <el-button @click="handleExport">
          <el-icon><Download /></el-icon>导出Excel
        </el-button>
        <el-button
          type="success"
          @click="importDialogVisible = true"
        >
          <el-icon><UploadFilled /></el-icon>批量导入
        </el-button>
        <span class="total-text">共 {{ filteredModules.length }} 条</span>
        <div class="toolbar-right">
          <ColumnSettings
            v-model="columnConfigs"
            storage-key="module_list"
          />
        </div>
      </div>

      <SkeletonScreen
        :loading="loading"
        :rows="5"
      >
        <el-table
          ref="tableRef"
          :data="pagedModules"
          stripe
          border
          style="width: 100%"
          @selection-change="handleSelectionChange"
          @header-dragend="handleHeaderDragEnd"
        >
          <el-table-column
            type="selection"
            width="55"
            align="center"
          />

          <el-table-column
            v-for="col in visibleColumns"
            :key="col.key"
            :column-key="col.key"
            :prop="col.prop"
            :label="col.label"
            :width="getColumnWidth(col)"
            :min-width="col.minWidth"
            :fixed="col.fixed"
            show-overflow-tooltip
          >
            <template #default="{ row }">
              <!-- 图号：模块树层级展示 -->
              <template v-if="col.key === 'drawingNo'">
                <span
                  :style="{ paddingLeft: (moduleDepthMap.get(row.id) || 0) * 20 + 'px' }"
                  class="module-tree-cell"
                >
                  <span
                    v-if="treeHasChildren(row.id)"
                    class="tree-toggle"
                    @click.stop="treeToggleCollapse(row.id)"
                  >
                    {{ treeIsCollapsed(row.id) ? '▶' : '▼' }}
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

              <!-- 所属设备：可点击跳转 -->
              <template v-else-if="col.key === 'equipmentName'">
                <span
                  class="equipment-link"
                  @click="goToEquipment(row.equipmentId)"
                >
                  {{ getEquipmentName(row.equipmentId) }}
                </span>
              </template>

              <!-- 所属配置 -->
              <template v-else-if="col.key === 'configurationIds'">
                <el-tooltip
                  v-if="row.configurationIds.length > 2"
                  :content="getConfigurationNames(row.configurationIds).join('、')"
                  placement="top"
                >
                  <div class="config-tags">
                    <el-tag
                      v-for="cfgId in row.configurationIds.slice(0, 2)"
                      :key="cfgId"
                      size="small"
                      type="info"
                      effect="plain"
                      class="cfg-tag"
                    >
                      {{ getConfigurationName(cfgId) }}
                    </el-tag>
                    <el-tag
                      size="small"
                      type="info"
                      effect="plain"
                    >
                      +{{ row.configurationIds.length - 2 }}
                    </el-tag>
                  </div>
                </el-tooltip>
                <div
                  v-else
                  class="config-tags"
                >
                  <el-tag
                    v-for="cfgId in row.configurationIds"
                    :key="cfgId"
                    size="small"
                    type="info"
                    effect="plain"
                    class="cfg-tag"
                  >
                    {{ getConfigurationName(cfgId) }}
                  </el-tag>
                </div>
              </template>

              <!-- 标签：彩色 -->
              <template v-else-if="col.key === 'tags'">
                <el-tag
                  v-for="tagId in row.tags"
                  :key="tagId"
                  size="small"
                  :style="{ backgroundColor: getTagColor(tagId) + '20', borderColor: getTagColor(tagId), color: getTagColor(tagId) }"
                  class="tag-item"
                >
                  {{ getTagName(tagId) }}
                </el-tag>
              </template>

              <!-- BOM条目数 -->
              <template v-else-if="col.key === 'bomCount'">
                <el-tooltip
                  placement="top"
                  :disabled="bomLoading"
                >
                  <template #content>
                    <div>装配：{{ getBomTypeCount(row.id, 'assembly') }} 条</div>
                    <div>下单：{{ getBomTypeCount(row.id, 'order') }} 条</div>
                    <div>两者：{{ getBomTypeCount(row.id, 'both') }} 条</div>
                  </template>
                  <span class="bom-count">{{ bomLoading ? '...' : (bomItemsMap.get(row.id)?.length ?? 0) }}</span>
                </el-tooltip>
              </template>

              <!-- 更新时间 -->
              <template v-else-if="col.key === 'updatedAt'">
                {{ formatDate(row.updatedAt) }}
              </template>

              <!-- 默认：直接显示属性 -->
              <template v-else>
                {{ row[col.prop ?? col.key] }}
              </template>
            </template>
          </el-table-column>

          <el-table-column
            label="操作"
            width="180"
            fixed="right"
          >
            <template #default="{ row }">
              <div class="row-actions">
                <el-button
                  link
                  type="primary"
                  class="table-action-btn"
                  @click="router.push(`/module/${row.id}/edit`)"
                >
                  编辑
                </el-button>
                <el-button
                  link
                  type="success"
                  class="table-action-btn"
                  @click="handleCopy(row)"
                >
                  复制
                </el-button>
                <el-button
                  link
                  type="danger"
                  class="table-action-btn danger"
                  @click="handleDelete(row)"
                >
                  删除
                </el-button>
              </div>
            </template>
          </el-table-column>

          <template #empty>
            <EmptyState
              :variant="hasActiveSearch ? 'no-results' : 'empty'"
              :title="hasActiveSearch ? '没有找到匹配的数据' : '暂无组件数据'"
              :description="hasActiveSearch ? '请尝试调整搜索条件或筛选器' : '点击下方按钮创建组件'"
              :action-text="hasActiveSearch ? '' : '新建组件'"
              @action="router.push('/module/new')"
            />
          </template>
        </el-table>
      </SkeletonScreen>

      <div class="pagination-wrapper">
        <span class="pagination-total">共 {{ filteredModules.length }} 条</span>
        <div class="pagination-center">
          <el-pagination
            v-model:current-page="currentPage"
            v-model:page-size="pageSize"
            :page-sizes="[10, 20, 50, 100]"
            :total="filteredModules.length"
            layout="sizes, prev, pager, next, jumper"
            background
            @current-change="handlePageChange"
          />
        </div>
        <span class="pagination-spacer" />
      </div>
    </el-card>

    <!-- 批量操作浮动栏 -->
    <BatchActionBar
      :visible="selectedModules.length > 0"
      :selected-count="selectedModules.length"
      :total-count="filteredModules.length"
      :actions="batchActions"
      @action="handleBatchAction"
      @clear="clearSelection"
    />

    <!-- 批量添加标签对话框 -->
    <el-dialog
      v-model="batchTagDialogVisible"
      title="批量添加标签"
      width="480px"
    >
      <el-form label-width="80px">
        <el-form-item label="选择标签">
          <el-select
            v-model="batchTagIds"
            multiple
            placeholder="请选择要添加的标签"
            style="width: 100%"
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
        <el-form-item label="应用到">
          <el-text type="info">
            已选中 {{ selectedModules.length }} 个组件
          </el-text>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="batchTagDialogVisible = false">
          取消
        </el-button>
        <el-button
          type="primary"
          @click="handleBatchAddTag"
        >
          确定添加
        </el-button>
      </template>
    </el-dialog>

    <!-- 批量导入对话框 -->
    <el-dialog
      v-model="importDialogVisible"
      title="批量导入组件"
      width="820px"
      :close-on-click-modal="false"
      @close="resetImportState"
    >
      <!-- 步骤1：下载模板 -->
      <el-alert
        type="info"
        :closable="false"
        class="import-step"
      >
        <template #title>
          步骤1：下载模板
        </template>
        <div class="step-desc">
          请先下载模板，按照格式填写组件信息和BOM明细。
        </div>
        <el-button
          type="primary"
          size="small"
          style="margin-top: 8px"
          @click="handleDownloadTemplate"
        >
          <el-icon><Download /></el-icon>下载模板
        </el-button>
      </el-alert>

      <!-- 步骤2：上传文件 -->
      <el-alert
        type="info"
        :closable="false"
        class="import-step"
      >
        <template #title>
          步骤2：上传文件
        </template>
        <el-upload
          drag
          :auto-upload="false"
          :show-file-list="false"
          :on-change="handleFileChange"
          accept=".xlsx,.xls"
          class="import-upload"
        >
          <el-icon class="el-icon--upload">
            <UploadFilled />
          </el-icon>
          <div class="el-upload__text">
            将文件拖到此处，或<em>点击上传</em>
          </div>
          <template #tip>
            <div class="el-upload__tip">
              仅支持 .xlsx / .xls 格式文件
            </div>
          </template>
        </el-upload>
        <div
          v-if="selectedFileName"
          class="selected-file"
        >
          已选择文件：<strong>{{ selectedFileName }}</strong>
        </div>
      </el-alert>

      <!-- 步骤2.5：字段映射 -->
      <div v-if="importState === 'mapping'">
        <el-alert
          type="info"
          :closable="false"
          class="import-step"
        >
          <template #title>
            步骤3：确认BOM明细字段映射
          </template>
          <div class="step-desc">
            识别到 {{ bomRawData.headers.length }} 列、{{ bomRawData.rows.length }} 行BOM数据。请将Excel列映射到BOM模板字段，未映射的列将被忽略。
          </div>
        </el-alert>

        <div class="import-columns">
          <span class="import-columns-label">识别列名：</span>
          <el-tag
            v-for="col in bomRawData.headers"
            :key="col"
            size="small"
            class="col-tag"
          >
            {{ col }}
          </el-tag>
        </div>

        <el-table
          :data="bomRawData.rows.slice(0, 5)"
          border
          size="small"
          style="margin: 12px 0"
          max-height="200"
        >
          <el-table-column
            v-for="col in bomRawData.headers"
            :key="col"
            :prop="col"
            :label="col"
            min-width="100"
            show-overflow-tooltip
          />
        </el-table>
        <div
          v-if="bomRawData.rows.length > 5"
          class="preview-more"
        >
          ...共 {{ bomRawData.rows.length }} 行，仅预览前5行
        </div>

        <el-divider content-position="left">
          字段映射
        </el-divider>
        <el-form
          label-width="110px"
          size="default"
        >
          <el-form-item
            v-for="field in mappableBomFields"
            :key="field.key"
            :label="field.label"
            :required="BOM_REQUIRED_KEYS.includes(field.key)"
          >
            <el-select
              v-model="fieldMapping[field.key]"
              placeholder="不导入"
              clearable
              style="width: 100%"
            >
              <el-option
                v-for="col in bomRawData.headers"
                :key="col"
                :label="col"
                :value="col"
              />
            </el-select>
          </el-form-item>
        </el-form>
      </div>

      <!-- 步骤3：校验结果 -->
      <div v-if="importState === 'hasErrors' || importState === 'validated'">
        <el-alert
          v-if="importState === 'hasErrors'"
          type="error"
          :closable="false"
          class="import-step"
        >
          <template #title>
            校验未通过（共 {{ importErrors.length }} 个错误）
          </template>
          <div class="step-desc">
            请修正以下错误后重新上传文件。
          </div>
        </el-alert>
        <el-alert
          v-else
          type="success"
          :closable="false"
          class="import-step"
        >
          <template #title>
            校验通过
          </template>
          <div class="step-desc">
            将导入 <strong>{{ validModules.length }}</strong> 个组件、
            <strong>{{ validBomItems.length }}</strong> 条BOM明细。
          </div>
        </el-alert>

        <!-- 缺失配置提示（自动创建） -->
        <div
          v-if="missingConfigurations.length > 0"
          class="missing-config-section"
        >
          <el-alert
            type="warning"
            :closable="false"
            class="import-step"
          >
            <template #title>
              检测到 {{ missingConfigurations.length }} 个配置在设备中不存在
            </template>
            <div class="step-desc">
              以下配置将在导入时自动创建，并关联到对应设备。
            </div>
          </el-alert>

          <el-table
            :data="missingConfigurations"
            border
            size="small"
            style="margin-top: 12px"
            max-height="200"
          >
            <el-table-column
              prop="equipmentModel"
              label="所属设备型号"
              width="160"
            />
            <el-table-column
              prop="configName"
              label="配置名称"
              width="160"
            />
            <el-table-column
              prop="moduleCount"
              label="关联模块数"
              width="100"
              align="center"
            />
          </el-table>

          <div class="missing-config-action" style="margin-top: 12px">
            <el-checkbox v-model="autoCreateConfigurations">
              自动创建以上配置（取消则不导入关联这些配置的模块）
            </el-checkbox>
          </div>
        </div>

        <!-- 错误列表 -->
        <el-table
          v-if="importState === 'hasErrors'"
          :data="importErrors"
          max-height="280"
          border
          size="small"
          style="margin-top: 12px"
        >
          <el-table-column
            prop="sheet"
            label="Sheet"
            width="110"
          />
          <el-table-column
            prop="row"
            label="行号"
            width="70"
            align="center"
          />
          <el-table-column
            prop="message"
            label="错误描述"
          />
        </el-table>

        <!-- 预览区域 -->
        <div
          v-if="importState === 'validated'"
          style="margin-top: 12px"
        >
          <div class="preview-title">
            组件预览
          </div>
          <el-table
            :data="previewModules"
            border
            size="small"
            max-height="280"
          >
            <el-table-column
              prop="drawingNo"
              label="图号"
              width="140"
            />
            <el-table-column
              prop="nameZh"
              label="中文名称"
              width="140"
            />
            <el-table-column
              prop="equipmentModel"
              label="所属设备"
              width="130"
            />
            <el-table-column
              prop="configCount"
              label="配置数"
              width="70"
              align="center"
            />
            <el-table-column
              prop="bomCount"
              label="BOM条目数"
              width="90"
              align="center"
            />
            <el-table-column
              prop="parentDrawingNo"
              label="父组件图号"
              width="140"
            />
          </el-table>
        </div>
      </div>

      <template #footer>
        <el-button @click="importDialogVisible = false">
          取消
        </el-button>
        <el-button
          v-if="importState === 'mapping'"
          type="primary"
          @click="handleConfirmMapping"
        >
          确认映射并校验
        </el-button>
        <el-button
          v-else
          type="primary"
          :disabled="importState !== 'validated'"
          :loading="importState === 'importing'"
          @click="handleConfirmImport"
        >
          确认导入
        </el-button>
      </template>
    </el-dialog>

    <!-- ===== BOM明细冲突解决对话框 ===== -->
    <el-dialog
      v-model="bomConflictDialogVisible"
      title="BOM明细冲突确认"
      width="960px"
      :close-on-click-modal="false"
    >
      <div class="bom-conflict-intro">
        <el-alert
          type="warning"
          :closable="false"
          :title="`检测到 ${bomConflicts.length} 条BOM明细与系统已有数据冲突，请选择处理方式`"
        />
      </div>

      <div class="bom-conflict-toolbar">
        <span class="bom-conflict-count">共 {{ bomConflicts.length }} 个冲突</span>
        <div class="bom-conflict-actions">
          <el-button
            size="small"
            :type="bomConflictAllAction === 'keep' ? 'primary' : ''"
            @click="setAllBomConflictAction('keep')"
          >
            全部保留库里参数(数量用新的)
          </el-button>
          <el-button
            size="small"
            :type="bomConflictAllAction === 'overwrite' ? 'primary' : ''"
            @click="setAllBomConflictAction('overwrite')"
          >
            全部用新数据覆盖
          </el-button>
        </div>
      </div>

      <div class="bom-conflict-list">
        <div
          v-for="(conflict, idx) in bomConflicts"
          :key="`${conflict.conflictKey}-${conflict.conflictValue}-${idx}`"
          class="bom-conflict-item"
        >
          <div class="bom-conflict-header">
            <span class="bom-conflict-index">{{ idx + 1 }}.</span>
            <span class="bom-conflict-key">{{ conflict.conflictKey }}：{{ conflict.conflictValue }}</span>
            <span class="bom-conflict-modules">
              已有组件：{{ conflict.oldModuleDrawingNo }} → 导入组件：{{ conflict.newModuleDrawingNo }}
            </span>
            <span
              v-if="conflict.diffs.length > 0"
              class="bom-conflict-diff-count"
            >{{ conflict.diffs.length }} 个字段不一致</span>
            <span
              v-else
              class="bom-conflict-diff-count same"
            >数据完全一致</span>
            <div class="bom-conflict-action-select">
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
          <div
            v-if="conflict.diffs.length > 0"
            class="bom-conflict-diff-table"
          >
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
        <el-button @click="bomConflictDialogVisible = false">
          取消
        </el-button>
        <el-button
          type="primary"
          @click="applyBomConflictResolution"
        >
          确认并导入
        </el-button>
      </template>
    </el-dialog>

    <!-- ===== 零件库冲突确认对话框 ===== -->
    <el-dialog
      v-model="partConflictDialogVisible"
      title="零件库冲突确认"
      width="960px"
      :close-on-click-modal="false"
    >
      <div class="bom-conflict-intro">
        <el-alert
          type="warning"
          :closable="false"
          :title="`检测到 ${partConflicts.length} 个零件已存在于零件库中，请选择处理方式`"
        />
      </div>

      <div class="bom-conflict-toolbar">
        <span class="bom-conflict-count">共 {{ partConflicts.length }} 个冲突</span>
        <div class="bom-conflict-actions">
          <el-button
            size="small"
            :type="partConflictAllAction === 'keep' ? 'primary' : ''"
            @click="setAllPartConflictAction('keep')"
          >
            全部保留库里参数(数量用新的)
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

      <div class="bom-conflict-list">
        <div
          v-for="(conflict, idx) in partConflicts"
          :key="`${conflict.drawingNo}-${idx}`"
          class="bom-conflict-item"
        >
          <div class="bom-conflict-header">
            <span class="bom-conflict-index">{{ idx + 1 }}.</span>
            <span class="bom-conflict-key">图号：{{ conflict.drawingNo }}</span>
            <span
              v-if="conflict.diffs.length > 0"
              class="bom-conflict-diff-count"
            >{{ conflict.diffs.length }} 个字段不一致</span>
            <span
              v-else
              class="bom-conflict-diff-count same"
            >数据完全一致</span>
            <div class="bom-conflict-action-select">
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
          <div
            v-if="conflict.diffs.length > 0"
            class="bom-conflict-diff-table"
          >
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
        <el-button @click="partConflictDialogVisible = false">
          取消
        </el-button>
        <el-button
          type="primary"
          @click="applyPartConflictResolution"
        >
          确认并导入
        </el-button>
      </template>
    </el-dialog>

    <!-- 组件删除（子组件策略 + 引用保护）对话框 -->
    <CascadeDeleteDialog
      v-model="cascadeDialogVisible"
      title="删除组件"
      :entity-name="cascadeTargets.length > 1 ? `选中的 ${cascadeTargets.length} 个组件` : (cascadeTargets[0]?.name || '')"
      :references="cascadeReferences"
      :options="cascadeOptions"
      :default-value="cascadeDefaultValue"
      :loading="cascadeLoading"
      @confirm="onModuleCascadeConfirm"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch, toRef } from 'vue'
import { usePageSize } from '@/composables/usePageSize'
import { useDebounceRef } from '@/composables/useDebounce'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Download, UploadFilled, CollectionTag, CopyDocument, Delete } from '@element-plus/icons-vue'
import dayjs from 'dayjs'
import { useModulesStore } from '@/stores/modules'
import { useEquipmentStore } from '@/stores/equipment'
import { useTagsStore } from '@/stores/tags'
import { useBomTemplatesStore } from '@/stores/bomTemplates'
import { usePartsStore } from '@/stores/parts'
import type { PartConflict } from '@/stores/parts'
import { exportToExcel, isElectronEnvironment } from '@/utils/excel'
import {
  downloadTemplate,
  parseImportFileRaw,
  applyBomFieldMapping,
  validateImportData,
  executeImport,
  type ValidModule,
  type ValidBomItem,
  type ImportError,
  type RawBomSheetData,
  type MissingConfiguration
} from '@/utils/batchImport'
import type { Module, BomItem, BomTemplateField } from '@/types'
import { useModuleTree } from '@/composables/useModuleTree'
import ColumnSettings from '@/components/common/ColumnSettings.vue'
import type { ColumnConfig } from '@/components/common/ColumnSettings.vue'
import AdvancedFilter from '@/components/common/AdvancedFilter.vue'
import type { FilterCondition, FilterField } from '@/components/common/AdvancedFilter.vue'
import BatchActionBar from '@/components/common/BatchActionBar.vue'
import type { BatchAction } from '@/components/common/BatchActionBar.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import SkeletonScreen from '@/components/common/SkeletonScreen.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import CascadeDeleteDialog, {
  type CascadeRefItem,
  type CascadeOption
} from '@/components/common/CascadeDeleteDialog.vue'

const router = useRouter()
const modulesStore = useModulesStore()
const equipmentStore = useEquipmentStore()
const tagsStore = useTagsStore()
const bomTemplatesStore = useBomTemplatesStore()
const partsStore = usePartsStore()

// ===== 加载状态（骨架屏） =====
const loading = ref(true)
onMounted(() => {
  setTimeout(() => {
    loading.value = false
  }, 300)
})

const searchForm = reactive({
  keyword: '',
  equipmentId: '',
  tagIds: [] as string[]
})

// 搜索关键词防抖（300ms），大数据量列表避免每次按键都全量过滤
const debouncedKeyword = useDebounceRef(toRef(searchForm, 'keyword'), 300)

const currentPage = ref(1)
const pageSize = usePageSize('module_list', 20)
const tableContainerRef = ref<HTMLElement | null>(null)

// ===== 高级筛选 =====
const filterConditions = ref<FilterCondition[]>([])
const filterLogic = ref<'AND' | 'OR'>('AND')
const filterFields: FilterField[] = [
  { key: 'drawingNo', label: '图号', type: 'text' },
  { key: 'nameZh', label: '中文名', type: 'text' },
  { key: 'nameEn', label: '英文名', type: 'text' },
  { key: 'equipmentName', label: '所属设备', type: 'text' },
  { key: 'createdAt', label: '创建时间', type: 'date' },
  { key: 'updatedAt', label: '更新时间', type: 'date' }
]

function handleAdvancedFilter() {
  currentPage.value = 1
}

function handleAdvancedReset() {
  filterConditions.value = []
  filterLogic.value = 'AND'
  currentPage.value = 1
}

// ===== 列设置 =====
interface TableColumnConfig extends ColumnConfig {
  prop?: string
  minWidth?: number
  fixed?: string | boolean
}

const defaultColumns: TableColumnConfig[] = [
  { key: 'drawingNo', label: '图号', prop: 'drawingNo', visible: true, width: 200, fixed: 'left' },
  { key: 'nameZh', label: '中文名', prop: 'nameZh', visible: true, width: 160 },
  { key: 'nameEn', label: '英文名', prop: 'nameEn', visible: true, width: 180 },
  { key: 'equipmentName', label: '所属设备', visible: true, width: 140 },
  { key: 'configurationIds', label: '所属配置', visible: true, minWidth: 180 },
  { key: 'tags', label: '标签', visible: true, width: 180 },
  { key: 'bomCount', label: 'BOM条目数', visible: true, width: 120 },
  { key: 'updatedAt', label: '更新时间', visible: true, width: 170 }
]

const columnConfigs = ref<TableColumnConfig[]>(defaultColumns.map((c) => ({ ...c })))

const visibleColumns = computed<TableColumnConfig[]>(() => {
  return columnConfigs.value.filter((c) => c.visible)
})

// ===== 列宽记忆 =====
const COL_WIDTH_KEY = 'bom_col_width_module_list'
const columnWidths = ref<Record<string, number>>({})

function loadColumnWidths() {
  try {
    const raw = localStorage.getItem(COL_WIDTH_KEY)
    if (raw) columnWidths.value = JSON.parse(raw)
  } catch {
    // ignore
  }
}

function saveColumnWidths() {
  try {
    localStorage.setItem(COL_WIDTH_KEY, JSON.stringify(columnWidths.value))
  } catch {
    // ignore
  }
}

function handleHeaderDragEnd(newWidth: number, _oldWidth: number, column: { columnKey?: string }) {
  if (column.columnKey) {
    columnWidths.value[column.columnKey] = newWidth
    saveColumnWidths()
  }
}

function getColumnWidth(col: TableColumnConfig): number | undefined {
  return columnWidths.value[col.key] ?? col.width
}

onMounted(() => {
  loadColumnWidths()
})

// ===== BOM条目数（异步加载，BOM已独立存储到IndexedDB） =====
const bomItemsMap = ref<Map<string, BomItem[]>>(new Map())
const bomLoading = ref(false)

async function loadAllBomItems() {
  if (modulesStore.modules.length === 0) {
    bomItemsMap.value = new Map()
    return
  }
  bomLoading.value = true
  try {
    const results = await Promise.all(
      modulesStore.modules.map(async (m) => ({
        moduleId: m.id,
        items: await modulesStore.getBomItems(m.id)
      }))
    )
    const map = new Map<string, BomItem[]>()
    results.forEach((r) => map.set(r.moduleId, r.items))
    bomItemsMap.value = map
  } finally {
    bomLoading.value = false
  }
}

onMounted(() => {
  loadAllBomItems()
})

watch(
  () => modulesStore.modules.length,
  () => {
    loadAllBomItems()
  }
)

// ===== 高级筛选求值 =====
const filterFieldTypeMap = computed(() => new Map(filterFields.map((f) => [f.key, f.type])))

function getFilterFieldValue(row: Module, field: string): unknown {
  switch (field) {
    case 'equipmentName':
      return getEquipmentName(row.equipmentId)
    case 'bomCount':
      return bomItemsMap.value.get(row.id)?.length ?? 0
    default:
      return (row as unknown as Record<string, unknown>)[field]
  }
}

function evalCondition(row: Module, cond: FilterCondition): boolean {
  const fieldType = filterFieldTypeMap.value.get(cond.field) || 'text'
  const raw = getFilterFieldValue(row, cond.field)
  const strVal = String(raw ?? '')

  if (cond.operator === 'between') {
    const num = fieldType === 'date' ? dayjs(raw as string).valueOf() : Number(raw)
    return num >= (cond.valueMin ?? -Infinity) && num <= (cond.valueMax ?? Infinity)
  }

  if (fieldType === 'date') {
    const t1 = dayjs(raw as string).valueOf()
    const t2 = dayjs(String(cond.value)).valueOf()
    switch (cond.operator) {
      case '=':
        return dayjs(raw as string).format('YYYY-MM-DD') === String(cond.value)
      case '!=':
        return dayjs(raw as string).format('YYYY-MM-DD') !== String(cond.value)
      case '>':
        return t1 > t2
      case '<':
        return t1 < t2
      case '>=':
        return t1 >= t2
      case '<=':
        return t1 <= t2
    }
  }

  switch (cond.operator) {
    case '=':
      return strVal === String(cond.value)
    case '!=':
      return strVal !== String(cond.value)
    case 'contains':
      return strVal.toLowerCase().includes(String(cond.value).toLowerCase())
    case 'startsWith':
      return strVal.toLowerCase().startsWith(String(cond.value).toLowerCase())
    case '>':
      return Number(raw) > Number(cond.value)
    case '<':
      return Number(raw) < Number(cond.value)
    case '>=':
      return Number(raw) >= Number(cond.value)
    case '<=':
      return Number(raw) <= Number(cond.value)
    default:
      return true
  }
}

function applyAdvancedFilters(items: Module[]): Module[] {
  if (filterConditions.value.length === 0) return items
  return items.filter((item) => {
    const results = filterConditions.value.map((cond) => evalCondition(item, cond))
    return filterLogic.value === 'AND' ? results.every(Boolean) : results.some(Boolean)
  })
}

const filteredModules = computed(() => {
  let filtered = modulesStore.modules.filter((m) => {
    if (debouncedKeyword.value) {
      const kw = debouncedKeyword.value.toLowerCase()
      const match =
        m.drawingNo.toLowerCase().includes(kw) ||
        m.nameZh.toLowerCase().includes(kw) ||
        (m.nameEn || '').toLowerCase().includes(kw)
      if (!match) return false
    }
    if (searchForm.equipmentId && m.equipmentId !== searchForm.equipmentId) return false
    if (searchForm.tagIds.length > 0 && !searchForm.tagIds.every((t) => m.tags.includes(t))) return false
    return true
  })
  filtered = applyAdvancedFilters(filtered)
  // 按层级排序（父模块在前，子模块在后）
  return sortModulesByHierarchy(filtered)
})

const hasActiveSearch = computed(() => {
  return !!(
    searchForm.keyword ||
    searchForm.equipmentId ||
    searchForm.tagIds.length > 0 ||
    filterConditions.value.length > 0
  )
})

// 模块树折叠管理
const {
  hasChildren: treeHasChildren,
  isCollapsed: treeIsCollapsed,
  toggleCollapse: treeToggleCollapse,
  expandAll: treeExpandAll,
  collapseAll: treeCollapseAll,
  filteredModules: treeFilteredModules
} = useModuleTree(() => filteredModules.value)

// 模块深度映射（用于缩进显示）
const moduleDepthMap = computed<Map<string, number>>(() => {
  const modules = modulesStore.modules
  const moduleMap = new Map(modules.map((m) => [m.id, m]))
  const depthMap = new Map<string, number>()
  const visited = new Set<string>()

  function calcDepth(moduleId: string): number {
    if (depthMap.has(moduleId)) return depthMap.get(moduleId)!
    if (visited.has(moduleId)) return 0 // 防止循环引用
    visited.add(moduleId)
    const m = moduleMap.get(moduleId)
    const parentIds = m?.parentModuleIds || []
    // 找到第一个存在的父模块，计算深度
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

// 按层级排序模块（深度优先遍历）
function sortModulesByHierarchy(modules: Module[]): Module[] {
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

  // 先遍历根模块（没有任何存在的父模块的模块）
  const rootModules = modules.filter((m) => {
    const parentIds = m.parentModuleIds || []
    return parentIds.length === 0 || !parentIds.some(pid => moduleMap.has(pid))
  })
  for (const m of rootModules) {
    traverse(m.id)
  }
  // 处理可能遗漏的模块
  for (const m of modules) {
    if (!visited.has(m.id)) {
      traverse(m.id)
    }
  }
  return result
}

const pagedModules = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return treeFilteredModules.value.slice(start, start + pageSize.value)
})

function handleSearch() {
  currentPage.value = 1
}

function handleReset() {
  searchForm.keyword = ''
  searchForm.equipmentId = ''
  searchForm.tagIds = []
  filterConditions.value = []
  filterLogic.value = 'AND'
  currentPage.value = 1
}

function handlePageChange(page: number) {
  currentPage.value = page
  tableContainerRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function goToEquipment(equipmentId: string) {
  router.push(`/equipment/${equipmentId}/edit`)
}

function getEquipmentName(id: string): string {
  return equipmentStore.equipments.find((e) => e.id === id)?.name || '-'
}

function getConfigurationName(id: string): string {
  return equipmentStore.configurations.find((c) => c.id === id)?.name || '-'
}

function getConfigurationNames(ids: string[]): string[] {
  return ids.map(getConfigurationName)
}

function getTagName(id: string): string {
  return tagsStore.tags.find((t) => t.id === id)?.name || '-'
}

function getTagColor(id: string): string {
  return tagsStore.tags.find((t) => t.id === id)?.color || '#909399'
}

function getBomTypeCount(moduleId: string, type: 'assembly' | 'order' | 'both'): number {
  const items = bomItemsMap.value.get(moduleId)
  if (!items) return 0
  return items.filter((i) => i.type === type).length
}

function formatDate(iso: string): string {
  return dayjs(iso).format('YYYY-MM-DD HH:mm')
}

async function handleCopy(row: Module) {
  // 如果有子组件，询问是否一起复制
  let copyChildren = false
  if (row.childModuleIds && row.childModuleIds.length > 0) {
    try {
      await ElMessageBox.confirm(
        `该组件包含 ${row.childModuleIds.length} 个子组件。是否同时复制子组件？\n\n「确定」= 递归复制整个子树；「取消」= 仅复制当前组件（不含子组件）`,
        '复制选项',
        { confirmButtonText: '复制子组件', cancelButtonText: '仅复制当前组件', type: 'info' }
      )
      copyChildren = true
    } catch {
      copyChildren = false
    }
  }
  const copy = modulesStore.copyModule(row.id, { copyChildren })
  if (copy) {
    ElMessage.success(`已复制组件：${copy.nameZh}`)
    router.push(`/module/${copy.id}/edit`)
  } else {
    ElMessage.error('复制失败')
  }
}

// ===== 删除（引用检查 + 子组件策略对话框） =====
const cascadeDialogVisible = ref(false)
const cascadeLoading = ref(false)
const cascadeTargets = ref<{ id: string; name: string }[]>([])
const cascadeReferences = ref<CascadeRefItem[]>([])
const cascadeOptions = ref<CascadeOption[]>([])
const cascadeDefaultValue = ref('')

async function buildModuleCascadeOptions(id: string): Promise<CascadeOption[]> {
  const refs = await modulesStore.getModuleReferences(id)
  cascadeReferences.value = [
    { label: '子组件', count: refs.childCount },
    { label: 'BOM条目', count: refs.bomItemCount },
    { label: '被配置引用', count: refs.referencedByConfigCount },
    { label: '被项目引用', count: refs.referencedByProjectCount }
  ]
  const hasChildren = refs.childCount > 0
  const hasRefs = refs.referencedByConfigCount > 0 || refs.referencedByProjectCount > 0

  if (!hasChildren && !hasRefs) {
    cascadeDefaultValue.value = 'direct'
    return [{ value: 'direct', label: '直接删除', description: '该组件无关联引用，组件及其 BOM 条目将被删除。' }]
  }
  if (hasChildren && !hasRefs) {
    cascadeDefaultValue.value = 'promote'
    return [
      {
        value: 'promote',
        label: `子组件提升为顶层（共 ${refs.childCount} 个）`,
        type: 'primary',
        description: '推荐：子组件脱离本组件成为顶层组件，仅删除本组件及其 BOM 条目。'
      },
      {
        value: 'cascade',
        label: '一并删除子组件（递归删除子树）',
        type: 'danger',
        description: `危险：连同 ${refs.childCount} 个子组件及其全部 BOM 条目一并删除，不可恢复。`
      }
    ]
  }
  if (!hasChildren && hasRefs) {
    cascadeDefaultValue.value = 'force'
    const refNames = [...refs.referencedByConfigNames, ...refs.referencedByProjectNames].join('、')
    return [
      {
        value: 'force',
        label: '强制删除',
        type: 'danger',
        description: `引用处（${refNames}）将保留该组件 ID 并显示"已删除"标记。`
      },
      { value: 'cancel', label: '取消删除', description: '不执行删除。' }
    ]
  }
  // 既有子组件又被引用
  cascadeDefaultValue.value = 'promote+force'
  const refNames = [...refs.referencedByConfigNames, ...refs.referencedByProjectNames].join('、')
  return [
    {
      value: 'promote+force',
      label: `子组件提升为顶层 + 强制删除`,
      type: 'primary',
      description: `推荐：${refs.childCount} 个子组件提升为顶层；引用处（${refNames}）显示"已删除"。`
    },
    {
      value: 'cascade+force',
      label: `递归删除子树 + 强制删除`,
      type: 'danger',
      description: `危险：连同子组件全部删除；引用处（${refNames}）显示"已删除"。`
    },
    { value: 'cancel', label: '取消删除', description: '不执行删除。' }
  ]
}

async function openModuleCascadeDialog(targets: { id: string; name: string }[]) {
  cascadeTargets.value = targets
  cascadeOptions.value = await buildModuleCascadeOptions(targets[0].id)
  cascadeDialogVisible.value = true
}

async function onModuleCascadeConfirm(action: string) {
  if (action === 'cancel') {
    cascadeDialogVisible.value = false
    return
  }
  cascadeLoading.value = true
  try {
    for (const t of cascadeTargets.value) {
      // 批量删除时逐个重新判定引用情况
      const refs = await modulesStore.getModuleReferences(t.id)
      const hasRefs = refs.referencedByConfigCount > 0 || refs.referencedByProjectCount > 0
      let strategy: 'promote' | 'cascade' = 'promote'
      let forceRef = false
      if (action === 'direct') {
        strategy = refs.childCount > 0 ? 'promote' : 'cascade'
      } else if (action === 'promote' || action === 'promote+force') {
        strategy = 'promote'
        forceRef = hasRefs
      } else if (action === 'cascade' || action === 'cascade+force') {
        strategy = 'cascade'
        forceRef = hasRefs
      } else if (action === 'force') {
        strategy = refs.childCount > 0 ? 'promote' : 'cascade'
        forceRef = true
      }
      await modulesStore.deleteModule(t.id, { strategy, forceRef })
    }
    ElMessage.success(cascadeTargets.value.length > 1
      ? `成功删除 ${cascadeTargets.value.length} 个组件`
      : '删除成功')
    cascadeDialogVisible.value = false
    clearSelection()
    if (pagedModules.value.length === 0 && currentPage.value > 1) {
      currentPage.value--
    }
  } finally {
    cascadeLoading.value = false
  }
}

async function handleDelete(row: Module) {
  await openModuleCascadeDialog([{ id: row.id, name: row.nameZh }])
}

function handleExport() {
  const data = filteredModules.value.map((m, idx) => ({
    序号: idx + 1,
    图号: m.drawingNo,
    中文名: m.nameZh,
    英文名: m.nameEn || '',
    所属设备: getEquipmentName(m.equipmentId),
    所属配置: getConfigurationNames(m.configurationIds).join('、'),
    标签: m.tags.map(getTagName).join('、'),
    BOM条目数: bomItemsMap.value.get(m.id)?.length ?? 0,
    备注: m.remark || '',
    更新时间: formatDate(m.updatedAt)
  }))
  exportToExcel(data, `组件列表_${dayjs().format('YYYYMMDD_HHmmss')}`, '组件列表')
  if (!isElectronEnvironment()) {
    ElMessage.success('导出成功')
  }
}

// ==================== 批量操作 ====================
const selectedModules = ref<Module[]>([])
const tableRef = ref<{ clearSelection: () => void; toggleAllSelection: () => void } | null>(null)
const batchTagDialogVisible = ref(false)
const batchTagIds = ref<string[]>([])

const batchActions: BatchAction[] = [
  { key: 'export', label: '批量导出', type: 'primary', icon: 'Download' },
  { key: 'addTag', label: '批量添加标签', type: 'success', icon: 'CollectionTag' },
  { key: 'copy', label: '批量复制', type: 'warning', icon: 'CopyDocument' },
  { key: 'delete', label: '批量删除', type: 'danger', icon: 'Delete' }
]

function handleSelectionChange(selection: Module[]) {
  selectedModules.value = selection
}

function clearSelection() {
  selectedModules.value = []
  tableRef.value?.clearSelection()
}

async function handleBatchAction(key: string) {
  switch (key) {
    case 'export':
      handleBatchExport()
      break
    case 'addTag':
      batchTagIds.value = []
      batchTagDialogVisible.value = true
      break
    case 'copy':
      await handleBatchCopy()
      break
    case 'delete':
      await handleBatchDelete()
      break
  }
}

function handleBatchExport() {
  const data = selectedModules.value.map((m, idx) => ({
    序号: idx + 1,
    图号: m.drawingNo,
    中文名: m.nameZh,
    英文名: m.nameEn || '',
    所属设备: getEquipmentName(m.equipmentId),
    所属配置: getConfigurationNames(m.configurationIds).join('、'),
    标签: m.tags.map(getTagName).join('、'),
    BOM条目数: bomItemsMap.value.get(m.id)?.length ?? 0,
    备注: m.remark || '',
    更新时间: formatDate(m.updatedAt)
  }))
  exportToExcel(data, `组件批量导出_${dayjs().format('YYYYMMDD_HHmmss')}`, '组件列表')
  ElMessage.success(`已导出 ${selectedModules.value.length} 个组件`)
}

async function handleBatchCopy() {
  try {
    await ElMessageBox.confirm(
      `确定复制选中的 ${selectedModules.value.length} 个组件吗？复制后的组件图号会添加后缀。`,
      '批量复制确认',
      { type: 'warning', confirmButtonText: '复制', cancelButtonText: '取消' }
    )
    let successCount = 0
    for (const mod of selectedModules.value) {
      const newMod = modulesStore.copyModule(mod.id)
      if (newMod) successCount++
    }
    ElMessage.success(`成功复制 ${successCount} 个组件`)
    clearSelection()
  } catch {
    // 用户取消
  }
}

async function handleBatchDelete() {
  if (selectedModules.value.length === 0) return
  await openModuleCascadeDialog(selectedModules.value.map((m) => ({ id: m.id, name: m.nameZh })))
}

async function handleBatchAddTag() {
  if (batchTagIds.value.length === 0) {
    ElMessage.warning('请选择要添加的标签')
    return
  }
  let successCount = 0
  for (const mod of selectedModules.value) {
    const newTags = [...new Set([...mod.tags, ...batchTagIds.value])]
    modulesStore.updateModule(mod.id, { tags: newTags }, `批量添加标签: ${batchTagIds.value.map(getTagName).join('、')}`)
    successCount++
  }
  ElMessage.success(`已为 ${successCount} 个组件添加标签`)
  batchTagDialogVisible.value = false
  batchTagIds.value = []
  clearSelection()
}

// ==================== 批量导入 ====================
type ImportState = 'idle' | 'validating' | 'mapping' | 'hasErrors' | 'validated' | 'importing'

const importDialogVisible = ref(false)
const importState = ref<ImportState>('idle')
const selectedFileName = ref('')
const importErrors = ref<ImportError[]>([])
const validModules = ref<ValidModule[]>([])
const validBomItems = ref<ValidBomItem[]>([])
const missingConfigurations = ref<MissingConfiguration[]>([])
const autoCreateConfigurations = ref(true)

/** BOM明细冲突检测相关状态 */
interface BomFieldDiff {
  key: string
  label: string
  oldValue: any
  newValue: any
}

interface BomConflict {
  conflictKey: string  // 冲突字段：图号/物料目录号
  conflictValue: string  // 冲突值
  oldModuleDrawingNo: string  // 已有明细所属组件图号
  oldItem: Record<string, any>  // 已有明细
  newModuleDrawingNo: string  // 新导入明细所属组件图号
  newItem: Record<string, any>  // 新导入明细
  diffs: BomFieldDiff[]  // 字段差异
  action: 'overwrite' | 'keep'  // 用户选择：覆盖/保留参数更新数量
}

const bomConflictDialogVisible = ref(false)
const bomConflicts = ref<BomConflict[]>([])
const bomConflictAllAction = ref<'overwrite' | 'keep'>('keep')

/** 零件库冲突相关状态 */
const partConflictDialogVisible = ref(false)
const partConflicts = ref<PartConflict[]>([])
const partConflictAllAction = ref<'keep' | 'overwrite'>('keep')

// ===== 字段映射相关状态 =====
const bomRawData = ref<RawBomSheetData>({ headers: [], rows: [] })
const parsedModules = ref<Record<string, unknown>[]>([])
const fieldMapping = reactive<Record<string, string>>({})

/** 可映射的BOM字段列表：关联组件图号（关联用）+ import模板可见字段 */
const mappableBomFields = computed<BomTemplateField[]>(() => {
  const importFields = bomTemplatesStore.getVisibleFieldsByType('import')
  const moduleDrawingNoField: BomTemplateField = {
    id: '_special_moduleDrawingNo',
    key: 'moduleDrawingNo',
    label: '关联组件图号',
    fieldType: 'text',
    required: true,
    visible: true,
    sortOrder: 0,
    templateType: 'import'
  }
  return [moduleDrawingNoField, ...importFields]
})

/** BOM必填字段key列表 */
const BOM_REQUIRED_KEYS = ['moduleDrawingNo', 'chineseDescription', 'quantity', 'type']

const previewModules = computed(() => {
  return validModules.value.map((m) => ({
    drawingNo: m.drawingNo,
    nameZh: m.nameZh,
    equipmentModel: m.equipmentModel,
    configCount: m.configNames.length,
    bomCount: validBomItems.value.filter((b) => b.drawingNo === m.drawingNo).length,
    parentDrawingNo: m.parentDrawingNos && m.parentDrawingNos.length > 0 ? m.parentDrawingNos.join(', ') : '-'
  }))
})

function handleDownloadTemplate() {
  try {
    // 获取批量导入模板的可见字段，用于动态生成模板
    const bomFields = bomTemplatesStore.getVisibleFieldsByType('import')
    downloadTemplate(bomFields)
    ElMessage.success('模板下载成功')
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    ElMessage.error(`模板下载失败：${msg}`)
  }
}

async function handleFileChange(file: { name: string; raw: File }) {
  if (!file || !file.raw) return
  selectedFileName.value = file.name
  importState.value = 'validating'
  importErrors.value = []
  validModules.value = []
  validBomItems.value = []
  try {
    // 原始解析：组件信息固定映射，BOM明细保留原始表头+行
    const parsed = await parseImportFileRaw(file.raw)
    if (parsed.modules.length === 0 && parsed.bom.rows.length === 0) {
      importState.value = 'idle'
      ElMessage.warning('文件中未解析到有效数据，请检查模板格式')
      return
    }
    bomRawData.value = parsed.bom
    parsedModules.value = parsed.modules
    // 初始化字段映射并自动匹配
    initFieldMapping()
    autoMatchMapping()
    importState.value = 'mapping'
  } catch (err) {
    importState.value = 'idle'
    selectedFileName.value = ''
    const msg = err instanceof Error ? err.message : String(err)
    ElMessage.error(`文件解析失败：${msg}`)
  }
}

/** 初始化字段映射对象（所有可映射字段置空） */
function initFieldMapping() {
  for (const key of Object.keys(fieldMapping)) {
    delete fieldMapping[key]
  }
  for (const field of mappableBomFields.value) {
    fieldMapping[field.key] = ''
  }
}

/** 自动匹配：Excel列名与模板字段label相同（或常见别名）的自动映射 */
function autoMatchMapping() {
  const headers = bomRawData.value.headers
  for (const field of mappableBomFields.value) {
    // 精确匹配 label
    let matched = headers.find((h) => h === field.label)
    // 常见别名匹配
    if (!matched) {
      const aliases = getColumnAliases(field.key)
      matched = headers.find((h) => aliases.includes(h))
    }
    if (matched && !Object.values(fieldMapping).includes(matched)) {
      fieldMapping[field.key] = matched
    }
  }
}

/** 字段key的常见列名别名 */
function getColumnAliases(key: string): string[] {
  const aliasMap: Record<string, string[]> = {
    moduleDrawingNo: ['关联组件图号', '组件图号', '模块图号', '所属组件图号'],
    drawingNo: ['图号', '物料图号', '零件图号'],
    jobNo: ['JOB号', '工单号'],
    chineseDescription: ['中文描述', '物料名称', '名称', '中文名称'],
    englishDescription: ['英文描述', '英文名'],
    materialCatalogNo: ['物料/目录号', '物料目录号', '物料编码', '物料号'],
    assemblyUnit: ['装配单位', '单位'],
    quantity: ['数量', 'Qty', 'qty'],
    totalAmount: ['总金额', '金额'],
    spareParts: ['备件'],
    reserved1: ['预留1', '规格', '规格型号'],
    reserved2: ['预留2', '位号'],
    purchasingBatch: ['采购批次'],
    remarks: ['备注', '说明'],
    ecnNo: ['ECN号', 'ECN'],
    ifKeyParts: ['是否关键件', '关键件'],
    type: ['类型', 'BOM类型']
  }
  return aliasMap[key] || []
}

/** 确认字段映射，应用映射并执行校验 */
async function handleConfirmMapping() {
  // 检查必填字段是否都已映射
  const unmappedRequired = BOM_REQUIRED_KEYS.filter((k) => !fieldMapping[k])
  if (unmappedRequired.length > 0) {
    const labels = unmappedRequired
      .map((k) => mappableBomFields.value.find((f) => f.key === k)?.label || k)
      .join('、')
    ElMessage.warning(`请先映射必填字段：${labels}`)
    return
  }
  importState.value = 'validating'
  try {
    // 应用字段映射，然后执行校验
    const mappedBomItems = applyBomFieldMapping(bomRawData.value, fieldMapping)
    const parsedData = { modules: parsedModules.value, bomItems: mappedBomItems }
    const importFields = bomTemplatesStore.getVisibleFieldsByType('import')
    const result = validateImportData(parsedData, equipmentStore, modulesStore, tagsStore, importFields)
    importErrors.value = result.errors
    validModules.value = result.validModules
    validBomItems.value = result.validBomItems
    missingConfigurations.value = result.missingConfigurations || []
    autoCreateConfigurations.value = true
    if (result.errors.length > 0) {
      importState.value = 'hasErrors'
      ElMessage.warning(`校验发现 ${result.errors.length} 个错误`)
    } else {
      importState.value = 'validated'
      ElMessage.success('校验通过')
    }
  } catch (err) {
    importState.value = 'mapping'
    const msg = err instanceof Error ? err.message : String(err)
    ElMessage.error(`校验失败：${msg}`)
  }
}

/** 检测导入BOM明细与系统已有明细的冲突 */
async function detectBomConflicts(): Promise<BomConflict[]> {
  const conflicts: BomConflict[] = []
  const fieldLabels: Record<string, string> = {}
  for (const field of bomTemplatesStore.getVisibleFieldsByType('import')) {
    fieldLabels[field.key] = field.label
  }
  fieldLabels['drawingNo'] = '图号'
  fieldLabels['materialCatalogNo'] = '物料/目录号'

  // 获取系统中所有组件的BOM明细
  const allExistingBomItems: Array<{ moduleDrawingNo: string; item: Record<string, any> }> = []
  for (const mod of modulesStore.modules) {
    try {
      const items = await modulesStore.getBomItems(mod.id)
      for (const item of items) {
        allExistingBomItems.push({ moduleDrawingNo: mod.drawingNo, item: item as Record<string, any> })
      }
    } catch {
      // 忽略获取失败的组件
    }
  }

  // 需要校核的唯一字段：图号、物料/目录号
  const uniqueFields = [
    { key: 'drawingNo', label: '图号' },
    { key: 'materialCatalogNo', label: '物料/目录号' }
  ]

  for (const newItem of validBomItems.value) {
    for (const uniqueField of uniqueFields) {
      const fieldValue = String(newItem[uniqueField.key] || '').trim()
      if (!fieldValue) continue

      // 在已有明细中查找同字段值的条目
      for (const existing of allExistingBomItems) {
        const existingValue = String(existing.item[uniqueField.key] || '').trim()
        if (existingValue !== fieldValue) continue

        // 对比所有可见字段，找出差异
        const diffs: BomFieldDiff[] = []
        for (const field of bomTemplatesStore.getVisibleFieldsByType('import')) {
          if (['type', 'source', 'sortOrder'].includes(field.key)) continue
          const oldVal = existing.item[field.key]
          const newVal = newItem[field.key]
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

        conflicts.push({
          conflictKey: uniqueField.label,
          conflictValue: fieldValue,
          oldModuleDrawingNo: existing.moduleDrawingNo,
          oldItem: existing.item,
          newModuleDrawingNo: String(newItem.moduleDrawingNo || ''),
          newItem: newItem as Record<string, any>,
          diffs,
          action: 'keep'
        })
        break // 找到一个冲突就够了，避免重复
      }
    }
  }

  return conflicts
}

/** 从BOM条目构建零件参数（type→partType映射，排除BOM特有字段） */
function buildPartDataFromBomItem(item: ValidBomItem): Record<string, any> {
  const excludeKeys = new Set(['quantity', 'type', 'source', 'sortOrder', 'moduleDrawingNo', 'row', '_row'])
  const result: Record<string, any> = {}
  for (const [key, value] of Object.entries(item)) {
    if (excludeKeys.has(key)) continue
    if (value === undefined || value === '') continue
    result[key] = value
  }
  if (item.type) {
    result.partType = item.type
  }
  return result
}

/** 检测BOM明细中的零件与零件库的冲突（按图号） */
function detectPartsLibraryConflicts(): PartConflict[] {
  const partDataList: Record<string, any>[] = []
  for (const item of validBomItems.value) {
    const partData = buildPartDataFromBomItem(item)
    partDataList.push(partData)
  }
  return partsStore.detectPartConflictsBatch(partDataList)
}

async function handleConfirmImport() {
  if (importState.value !== 'validated') return

  // 先检测BOM明细冲突
  const conflicts = await detectBomConflicts()
  if (conflicts.length > 0) {
    bomConflicts.value = conflicts
    bomConflictAllAction.value = 'keep'
    bomConflictDialogVisible.value = true
    return
  }

  // 检测零件库冲突
  const partConflictsResult = detectPartsLibraryConflicts()
  if (partConflictsResult.length > 0) {
    partConflicts.value = partConflictsResult
    partConflictAllAction.value = 'keep'
    partConflictDialogVisible.value = true
    return
  }

  // 无冲突，直接导入
  await doExecuteImport()
}

/** 执行实际导入 */
async function doExecuteImport() {
  importState.value = 'importing'
  try {
    // 如果用户选择不自动创建配置，则过滤掉关联缺失配置的模块
    let modulesToImport = validModules.value
    if (!autoCreateConfigurations.value && missingConfigurations.value.length > 0) {
      const missingConfigNames = new Set(missingConfigurations.value.map(c => c.configName))
      modulesToImport = validModules.value.filter(m => {
        return !m.configNames.some(cn => missingConfigNames.has(cn))
      })
      const skippedCount = validModules.value.length - modulesToImport.length
      if (skippedCount > 0) {
        ElMessage.info(`已跳过 ${skippedCount} 个关联不存在配置的模块`)
      }
    }

    const result = await executeImport(
      { validModules: modulesToImport, validBomItems: validBomItems.value, missingConfigurations: missingConfigurations.value },
      equipmentStore,
      modulesStore,
      tagsStore,
      partsStore,
      undefined,
      autoCreateConfigurations.value
    )
    ElMessage.success(buildImportResultMessage(result))
    importDialogVisible.value = false
    resetImportState()
  } catch (err) {
    importState.value = 'validated'
    const msg = err instanceof Error ? err.message : String(err)
    ElMessage.error(`导入失败：${msg}`)
  }
}

/** 构建导入结果提示消息（含零件统计和配置创建统计） */
function buildImportResultMessage(result: { moduleCount: number; bomItemCount: number; partsAdded?: number; partsUpdated?: number; partsKept?: number; createdConfigCount?: number }): string {
  let msg = `成功导入 ${result.moduleCount} 个组件、${result.bomItemCount} 条BOM明细`
  const partsParts: string[] = []
  if (result.partsAdded) partsParts.push(`新增 ${result.partsAdded} 个`)
  if (result.partsUpdated) partsParts.push(`更新 ${result.partsUpdated} 个`)
  if (result.partsKept) partsParts.push(`保留 ${result.partsKept} 个`)
  if (partsParts.length > 0) {
    msg += `；零件库：${partsParts.join('、')}`
  }
  if (result.createdConfigCount && result.createdConfigCount > 0) {
    msg += `；自动创建 ${result.createdConfigCount} 个配置`
  }
  return msg
}

/** 应用BOM冲突解决，执行导入 */
async function applyBomConflictResolution() {
  const keepConflicts = bomConflicts.value.filter((c) => c.action === 'keep')
  const overwriteConflicts = bomConflicts.value.filter((c) => c.action === 'overwrite')

  // 处理覆盖冲突：用新导入的参数覆盖已有明细
  for (const conflict of overwriteConflicts) {
    try {
      // 找到已有明细所属的组件
      const oldModule = modulesStore.modules.find((m) => m.drawingNo === conflict.oldModuleDrawingNo)
      if (!oldModule) continue

      // 找到已有明细
      const oldItems = await modulesStore.getBomItems(oldModule.id)
      const oldItem = oldItems.find((item) => {
        if (conflict.conflictKey === '图号') {
          return String(item.drawingNo || '').trim() === conflict.conflictValue
        } else {
          return String(item.materialCatalogNo || '').trim() === conflict.conflictValue
        }
      })
      if (!oldItem) continue

      // 用新导入的参数覆盖已有明细
      const updateData: Record<string, any> = {}
      for (const field of bomTemplatesStore.getVisibleFieldsByType('import')) {
        if (['type', 'source', 'sortOrder'].includes(field.key)) continue
        if (conflict.newItem[field.key] !== undefined) {
          updateData[field.key] = conflict.newItem[field.key]
        }
      }
      await modulesStore.updateBomItem(oldModule.id, oldItem.id, updateData)
    } catch {
      // 忽略更新失败的明细
    }
  }

  // 处理保留冲突：保留已有参数，数量用新导入的数量
  for (const conflict of keepConflicts) {
    try {
      const oldModule = modulesStore.modules.find((m) => m.drawingNo === conflict.oldModuleDrawingNo)
      if (!oldModule) continue

      const oldItems = await modulesStore.getBomItems(oldModule.id)
      const oldItem = oldItems.find((item) => {
        if (conflict.conflictKey === '图号') {
          return String(item.drawingNo || '').trim() === conflict.conflictValue
        } else {
          return String(item.materialCatalogNo || '').trim() === conflict.conflictValue
        }
      })
      if (!oldItem) continue

      // 只更新数量
      if (conflict.newItem.quantity !== undefined && conflict.newItem.quantity !== null && conflict.newItem.quantity !== '') {
        await modulesStore.updateBomItem(oldModule.id, oldItem.id, { quantity: Number(conflict.newItem.quantity) })
      }
    } catch {
      // 忽略更新失败的明细
    }
  }

  // 过滤掉有冲突的BOM明细（已经处理过了），只导入无冲突的
  const conflictValues = new Set(bomConflicts.value.map((c) => `${c.conflictKey}:${c.conflictValue}`))
  const filteredBomItems = validBomItems.value.filter((item) => {
    const drawingNo = String(item.drawingNo || '').trim()
    const materialCatalogNo = String(item.materialCatalogNo || '').trim()
    return !conflictValues.has(`图号:${drawingNo}`) && !conflictValues.has(`物料/目录号:${materialCatalogNo}`)
  })

  // 更新 validBomItems 为过滤后的列表（后续零件冲突检测和导入都用它）
  validBomItems.value = filteredBomItems

  // 关闭BOM冲突对话框
  bomConflictDialogVisible.value = false

  // 检测零件库冲突（基于过滤后的BOM条目）
  const partConflictsResult = detectPartsLibraryConflicts()
  if (partConflictsResult.length > 0) {
    partConflicts.value = partConflictsResult
    partConflictAllAction.value = 'keep'
    partConflictDialogVisible.value = true
    return
  }

  // 执行导入（只导入无冲突的组件和BOM明细）
  importState.value = 'importing'
  try {
    // 如果用户选择不自动创建配置，则过滤掉关联缺失配置的模块
    let modulesToImport = validModules.value
    if (!autoCreateConfigurations.value && missingConfigurations.value.length > 0) {
      const missingConfigNames = new Set(missingConfigurations.value.map(c => c.configName))
      modulesToImport = validModules.value.filter(m => {
        return !m.configNames.some(cn => missingConfigNames.has(cn))
      })
    }

    const result = await executeImport(
      { validModules: modulesToImport, validBomItems: filteredBomItems, missingConfigurations: missingConfigurations.value },
      equipmentStore,
      modulesStore,
      tagsStore,
      partsStore,
      undefined,
      autoCreateConfigurations.value
    )
    const overwriteCount = overwriteConflicts.length
    const keepCount = keepConflicts.length
    let msg = buildImportResultMessage(result)
    if (overwriteCount > 0) {
      msg += `，覆盖 ${overwriteCount} 条已有明细`
    }
    if (keepCount > 0) {
      msg += `，保留参数更新数量 ${keepCount} 条`
    }
    ElMessage.success(msg)
    importDialogVisible.value = false
    resetImportState()
  } catch (err) {
    importState.value = 'validated'
    const msg = err instanceof Error ? err.message : String(err)
    ElMessage.error(`导入失败：${msg}`)
  }
}

/** 应用零件库冲突解决，执行导入 */
async function applyPartConflictResolution() {
  partConflictDialogVisible.value = false
  importState.value = 'importing'
  try {
    // 如果用户选择不自动创建配置，则过滤掉关联缺失配置的模块
    let modulesToImport = validModules.value
    if (!autoCreateConfigurations.value && missingConfigurations.value.length > 0) {
      const missingConfigNames = new Set(missingConfigurations.value.map(c => c.configName))
      modulesToImport = validModules.value.filter(m => {
        return !m.configNames.some(cn => missingConfigNames.has(cn))
      })
    }

    const result = await executeImport(
      { validModules: modulesToImport, validBomItems: validBomItems.value, missingConfigurations: missingConfigurations.value },
      equipmentStore,
      modulesStore,
      tagsStore,
      partsStore,
      partConflicts.value,
      autoCreateConfigurations.value
    )
    ElMessage.success(buildImportResultMessage(result))
    importDialogVisible.value = false
    resetImportState()
  } catch (err) {
    importState.value = 'validated'
    const msg = err instanceof Error ? err.message : String(err)
    ElMessage.error(`导入失败：${msg}`)
  }
}

/** 批量设置零件库冲突处理方式 */
function setAllPartConflictAction(action: 'keep' | 'overwrite') {
  partConflictAllAction.value = action
  for (const conflict of partConflicts.value) {
    conflict.action = action
  }
}

/** 批量设置BOM冲突处理方式 */
function setAllBomConflictAction(action: 'overwrite' | 'keep') {
  bomConflictAllAction.value = action
  for (const conflict of bomConflicts.value) {
    conflict.action = action
  }
}

function resetImportState() {
  importState.value = 'idle'
  selectedFileName.value = ''
  importErrors.value = []
  validModules.value = []
  validBomItems.value = []
  missingConfigurations.value = []
  autoCreateConfigurations.value = true
  bomRawData.value = { headers: [], rows: [] }
  parsedModules.value = []
  partConflicts.value = []
  partConflictDialogVisible.value = false
  for (const key of Object.keys(fieldMapping)) {
    delete fieldMapping[key]
  }
}
</script>

<style scoped>
.module-list {
  padding: 16px;
}

/* ===== BOM明细冲突解决对话框 ===== */
.bom-conflict-intro {
  margin-bottom: 16px;
}

.bom-conflict-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding: 8px 12px;
  background: #f5f7fa;
  border-radius: 4px;
}

.bom-conflict-count {
  font-size: 13px;
  color: #606266;
  font-weight: 600;
}

.bom-conflict-actions {
  display: flex;
  gap: 8px;
}

.bom-conflict-list {
  max-height: 400px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.bom-conflict-item {
  border: 1px solid #ebeef5;
  border-radius: 6px;
  overflow: hidden;
}

.bom-conflict-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  background: #fdf6ec;
  border-bottom: 1px solid #faecd8;
  flex-wrap: wrap;
}

.bom-conflict-index {
  font-weight: 600;
  color: #e6a23c;
}

.bom-conflict-key {
  font-weight: 600;
  color: #303133;
  font-size: 14px;
}

.bom-conflict-modules {
  font-size: 12px;
  color: #909399;
}

.bom-conflict-diff-count {
  font-size: 12px;
  color: #e6a23c;
  background: #fdf6ec;
  padding: 2px 8px;
  border-radius: 10px;
}

.bom-conflict-diff-count.same {
  color: #67c23a;
  background: #f0f9eb;
}

.bom-conflict-action-select {
  margin-left: auto;
}

.bom-conflict-diff-table {
  padding: 0;
}

.old-value {
  color: #909399;
}

.new-value {
  color: #409eff;
  font-weight: 500;
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

.search-card {
  margin-bottom: 16px;
}
.table-card {
  margin-bottom: 16px;
}
.toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}
.toolbar-right {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 8px;
}
.total-text {
  color: #909399;
  font-size: 13px;
}
.config-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.cfg-tag {
  max-width: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
}
.tag-item {
  margin-right: 4px;
  margin-bottom: 2px;
}
.bom-count {
  font-weight: 600;
  color: #409eff;
  cursor: help;
}
.equipment-link {
  cursor: pointer;
  color: var(--color-primary, #409eff);
}
.equipment-link:hover {
  text-decoration: underline;
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
  transition: opacity var(--transition-fast, 0.15s ease);
}
:deep(.el-table__row:hover) .table-action-btn {
  opacity: 1;
}
.import-step {
  margin-bottom: 12px;
}
.step-desc {
  font-size: 13px;
  color: #606266;
  margin-top: 4px;
}
.import-upload {
  margin-top: 8px;
}
.selected-file {
  margin-top: 8px;
  font-size: 13px;
  color: #606266;
}
.preview-title {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 8px;
  color: #303133;
}

.import-columns {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
}

.import-columns-label {
  font-size: 13px;
  color: #606266;
  margin-right: 4px;
}

.col-tag {
  margin: 2px 0;
}

.preview-more {
  font-size: 12px;
  color: #909399;
  text-align: center;
  margin-top: -4px;
  margin-bottom: 8px;
}
</style>
