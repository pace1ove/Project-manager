<template>
  <div class="action-bar">
    <el-input
      v-model="projectTypeSearchKeyword"
      placeholder="搜索类型名称..."
      clearable
      prefix-icon="Search"
      style="width: 200px; margin-right: 12px"
    />
    <el-button
      type="primary"
      @click="openProjectTypeDialog()"
    >
      <el-icon style="margin-right: 4px">
        <Plus />
      </el-icon>
      新增项目类型
    </el-button>
  </div>
  <el-table
    :data="filteredProjectTypes"
    stripe
    style="width: 100%"
  >
    <el-table-column
      prop="name"
      label="类型名称"
      min-width="300"
    />
    <el-table-column
      label="关联项目数"
      width="120"
      align="center"
    >
      <template #default="{ row }">
        <el-tag
          size="small"
          :type="getProjectTypeCount(row.id) > 0 ? 'primary' : 'info'"
        >
          {{ getProjectTypeCount(row.id) }}
        </el-tag>
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
          @click="openProjectTypeDialog(row)"
        >
          编辑
        </el-button>
        <el-button
          type="danger"
          link
          @click="handleDeleteProjectType(row)"
        >
          删除
        </el-button>
      </template>
    </el-table-column>
    <template #empty>
      <EmptyState
        title="暂无项目类型"
        description="点击上方「新增项目类型」按钮创建第一个类型"
        variant="empty"
        action-text="新增项目类型"
        @action="openProjectTypeDialog()"
      />
    </template>
  </el-table>

  <!-- 项目类型新增/编辑弹窗 -->
  <el-dialog
    v-model="projectTypeDialogVisible"
    :title="projectTypeForm.id ? '编辑项目类型' : '新增项目类型'"
    width="480px"
  >
    <el-form
      ref="projectTypeFormRef"
      :model="projectTypeForm"
      :rules="projectTypeRules"
      label-width="80px"
    >
      <el-form-item
        label="类型名称"
        prop="name"
      >
        <el-input
          v-model="projectTypeForm.name"
          placeholder="请输入类型名称"
        />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="projectTypeDialogVisible = false">
        取消
      </el-button>
      <el-button
        type="primary"
        :loading="projectTypeSaving"
        @click="handleSaveProjectType"
      >
        确定
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { Plus, Search } from '@element-plus/icons-vue'
import { useProjectTypesStore } from '@/stores/projectTypes'
import { useProjectsStore } from '@/stores/projects'
import type { ProjectType } from '@/types'
import EmptyState from '@/components/common/EmptyState.vue'

const projectTypesStore = useProjectTypesStore()
const projectsStore = useProjectsStore()

// ===== 搜索 =====
const projectTypeSearchKeyword = ref('')

const filteredProjectTypes = computed(() => {
  if (!projectTypeSearchKeyword.value.trim()) return projectTypesStore.projectTypes
  const kw = projectTypeSearchKeyword.value.toLowerCase()
  return projectTypesStore.projectTypes.filter((pt) => pt.name.toLowerCase().includes(kw))
})

// ===== 项目类型关联项目数 =====
function getProjectTypeCount(typeId: string): number {
  return projectsStore.projects.filter((p) => p.projectTypeId === typeId).length
}

// ===== 项目类型管理 =====
const projectTypeDialogVisible = ref(false)
const projectTypeFormRef = ref<FormInstance>()
const projectTypeForm = ref<Partial<ProjectType>>({ name: '' })
const projectTypeSaving = ref(false)

const projectTypeRules: FormRules = {
  name: [{ required: true, message: '请输入类型名称', trigger: 'blur' }]
}

function openProjectTypeDialog(row?: ProjectType) {
  if (row) {
    projectTypeForm.value = { id: row.id, name: row.name }
  } else {
    projectTypeForm.value = { name: '' }
  }
  projectTypeDialogVisible.value = true
}

async function handleSaveProjectType() {
  if (!projectTypeFormRef.value) return
  try {
    await projectTypeFormRef.value.validate()
  } catch {
    return
  }
  projectTypeSaving.value = true
  try {
    if (projectTypeForm.value.id) {
      projectTypesStore.updateProjectType(projectTypeForm.value.id, { name: projectTypeForm.value.name! })
      ElMessage.success('项目类型更新成功')
    } else {
      projectTypesStore.addProjectType({ name: projectTypeForm.value.name! })
      ElMessage.success('项目类型新增成功')
    }
    projectTypeDialogVisible.value = false
  } finally {
    projectTypeSaving.value = false
  }
}

function handleDeleteProjectType(row: ProjectType) {
  const projCount = getProjectTypeCount(row.id)
  const extraMsg = projCount > 0 ? `\n\n该类型关联了 ${projCount} 个项目，删除后项目的类型将变为未设置。` : ''
  ElMessageBox.confirm(`确定要删除项目类型"${row.name}"吗？${extraMsg}`, '删除确认', {
    confirmButtonText: '确定删除',
    cancelButtonText: '取消',
    type: 'warning',
    confirmButtonClass: 'el-button--danger'
  })
    .then(() => {
      projectTypesStore.deleteProjectType(row.id)
      ElMessage.success('项目类型删除成功')
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
</style>
