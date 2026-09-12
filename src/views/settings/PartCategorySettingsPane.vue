<template>
  <div class="action-bar">
    <el-button
      type="primary"
      @click="openPartCategoryDialog()"
    >
      <el-icon style="margin-right: 4px">
        <Plus />
      </el-icon>
      新增分类
    </el-button>
    <el-button @click="handleResetPartCategories">
      <el-icon style="margin-right: 4px">
        <RefreshLeft />
      </el-icon>
      恢复默认
    </el-button>
  </div>
  <el-table
    :data="sortedPartCategories"
    stripe
    style="width: 100%"
  >
    <el-table-column
      label="排序"
      width="80"
      align="center"
    >
      <template #default="{ row }">
        {{ row.sortOrder }}
      </template>
    </el-table-column>
    <el-table-column
      label="分类名称"
      min-width="200"
    >
      <template #default="{ row }">
        <el-tag
          :color="row.color"
          style="color: #fff; border: none"
        >
          {{ row.name }}
        </el-tag>
      </template>
    </el-table-column>
    <el-table-column
      label="颜色"
      width="120"
      align="center"
    >
      <template #default="{ row }">
        <span class="color-dot-wrapper">
          <span
            class="color-dot"
            :style="{ background: row.color || '#909399' }"
          />
          <span class="color-text">{{ row.color || '#909399' }}</span>
        </span>
      </template>
    </el-table-column>
    <el-table-column
      label="操作"
      width="160"
      align="center"
    >
      <template #default="{ row }">
        <el-button
          type="primary"
          link
          @click="openPartCategoryDialog(row)"
        >
          编辑
        </el-button>
        <el-button
          type="danger"
          link
          @click="handleDeletePartCategory(row)"
        >
          删除
        </el-button>
      </template>
    </el-table-column>
    <template #empty>
      <EmptyState
        title="暂无零件分类"
        description="点击上方「新增分类」按钮创建第一个分类"
        variant="empty"
        action-text="新增分类"
        @action="openPartCategoryDialog()"
      />
    </template>
  </el-table>

  <!-- 零件分类新增/编辑弹窗 -->
  <el-dialog
    v-model="partCategoryDialogVisible"
    :title="partCategoryForm.id ? '编辑零件分类' : '新增零件分类'"
    width="480px"
  >
    <el-form
      ref="partCategoryFormRef"
      :model="partCategoryForm"
      :rules="partCategoryRules"
      label-width="80px"
    >
      <el-form-item
        label="分类名称"
        prop="name"
      >
        <el-input
          v-model="partCategoryForm.name"
          placeholder="请输入分类名称，如 85零件"
        />
      </el-form-item>
      <el-form-item
        label="颜色"
        prop="color"
      >
        <el-color-picker v-model="partCategoryForm.color" />
      </el-form-item>
      <el-form-item
        label="排序"
        prop="sortOrder"
      >
        <el-input-number
          v-model="partCategoryForm.sortOrder"
          :min="1"
          :max="999"
        />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="partCategoryDialogVisible = false">
        取消
      </el-button>
      <el-button
        type="primary"
        :loading="partCategorySaving"
        @click="handleSavePartCategory"
      >
        确定
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { Plus, RefreshLeft } from '@element-plus/icons-vue'
import { usePartCategories, type PartCategory } from '@/composables/usePartCategories'
import EmptyState from '@/components/common/EmptyState.vue'

// ===== 零件分类管理 =====
const { sortedCategories: sortedPartCategories, addCategory, updateCategory, deleteCategory, resetToDefaults } = usePartCategories()

const partCategoryDialogVisible = ref(false)
const partCategoryFormRef = ref<FormInstance>()
const partCategoryForm = ref<Partial<PartCategory>>({ name: '', color: '#409eff', sortOrder: 1 })
const partCategorySaving = ref(false)

const partCategoryRules: FormRules = {
  name: [{ required: true, message: '请输入分类名称', trigger: 'blur' }]
}

function openPartCategoryDialog(row?: PartCategory) {
  if (row) {
    partCategoryForm.value = { id: row.id, name: row.name, color: row.color || '#409eff', sortOrder: row.sortOrder }
  } else {
    const maxOrder = sortedPartCategories.value.reduce((m, c) => Math.max(m, c.sortOrder), 0)
    partCategoryForm.value = { name: '', color: '#409eff', sortOrder: maxOrder + 1 }
  }
  partCategoryDialogVisible.value = true
}

async function handleSavePartCategory() {
  if (!partCategoryFormRef.value) return
  try {
    await partCategoryFormRef.value.validate()
  } catch {
    return
  }
  partCategorySaving.value = true
  try {
    if (partCategoryForm.value.id) {
      updateCategory(partCategoryForm.value.id, {
        name: partCategoryForm.value.name!,
        color: partCategoryForm.value.color,
        sortOrder: partCategoryForm.value.sortOrder
      })
      ElMessage.success('零件分类更新成功')
    } else {
      addCategory({
        name: partCategoryForm.value.name!,
        color: partCategoryForm.value.color,
        sortOrder: partCategoryForm.value.sortOrder
      })
      ElMessage.success('零件分类新增成功')
    }
    partCategoryDialogVisible.value = false
  } finally {
    partCategorySaving.value = false
  }
}

function handleDeletePartCategory(row: PartCategory) {
  ElMessageBox.confirm(`确定要删除零件分类"${row.name}"吗？\n\n已使用该分类的零件将保留分类ID但显示为原始ID。`, '删除确认', {
    confirmButtonText: '确定删除',
    cancelButtonText: '取消',
    type: 'warning',
    confirmButtonClass: 'el-button--danger'
  })
    .then(() => {
      deleteCategory(row.id)
      ElMessage.success('零件分类删除成功')
    })
    .catch(() => {})
}

function handleResetPartCategories() {
  ElMessageBox.confirm('确定要恢复默认零件分类吗？当前自定义分类将被覆盖。', '恢复默认确认', {
    confirmButtonText: '恢复默认',
    cancelButtonText: '取消',
    type: 'warning'
  })
    .then(() => {
      resetToDefaults()
      ElMessage.success('已恢复默认零件分类')
    })
    .catch(() => {})
}
</script>

<style scoped>
.action-bar {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
}

.color-dot-wrapper {
  display: flex;
  align-items: center;
}

.color-dot {
  display: inline-block;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 1px solid #e4e7ed;
  flex-shrink: 0;
}

.color-text {
  margin-left: 8px;
  color: #909399;
  font-size: 12px;
}
</style>
