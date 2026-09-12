<template>
  <div class="action-bar">
    <el-input
      v-model="tagSearchKeyword"
      placeholder="搜索标签名称..."
      clearable
      prefix-icon="Search"
      style="width: 200px; margin-right: 12px"
    />
    <el-button
      type="primary"
      @click="openTagDialog()"
    >
      <el-icon style="margin-right: 4px">
        <Plus />
      </el-icon>
      新增标签
    </el-button>
  </div>
  <el-table
    :data="filteredTags"
    stripe
    style="width: 100%"
  >
    <el-table-column
      prop="name"
      label="标签名称"
      min-width="200"
    />
    <el-table-column
      label="颜色预览"
      width="180"
    >
      <template #default="{ row }">
        <span class="color-dot-wrapper">
          <span
            class="color-dot"
            :style="{ background: row.color || '#409eff' }"
          />
          <span class="color-text">{{ row.color || '#409eff' }}</span>
        </span>
      </template>
    </el-table-column>
    <el-table-column
      label="关联模块数"
      width="120"
      align="center"
    >
      <template #default="{ row }">
        <el-tag
          size="small"
          :type="getTagModuleCount(row.id) > 0 ? 'primary' : 'info'"
        >
          {{ getTagModuleCount(row.id) }}
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
          @click="openTagDialog(row)"
        >
          编辑
        </el-button>
        <el-button
          type="danger"
          link
          @click="handleDeleteTag(row)"
        >
          删除
        </el-button>
      </template>
    </el-table-column>
    <template #empty>
      <EmptyState
        title="暂无标签"
        description="点击上方「新增标签」按钮创建第一个标签"
        variant="empty"
        action-text="新增标签"
        @action="openTagDialog()"
      />
    </template>
  </el-table>

  <!-- 标签新增/编辑弹窗 -->
  <el-dialog
    v-model="tagDialogVisible"
    :title="tagForm.id ? '编辑标签' : '新增标签'"
    width="480px"
  >
    <el-form
      ref="tagFormRef"
      :model="tagForm"
      :rules="tagRules"
      label-width="80px"
    >
      <el-form-item
        label="标签名称"
        prop="name"
      >
        <el-input
          v-model="tagForm.name"
          placeholder="请输入标签名称"
        />
      </el-form-item>
      <el-form-item
        label="颜色"
        prop="color"
      >
        <el-color-picker v-model="tagForm.color" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="tagDialogVisible = false">
        取消
      </el-button>
      <el-button
        type="primary"
        :loading="tagSaving"
        @click="handleSaveTag"
      >
        确定
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { useTagsStore } from '@/stores/tags'
import { useModulesStore } from '@/stores/modules'
import { notifyDbError } from '@/utils/dbErrorHandler'
import type { Tag } from '@/types'
import EmptyState from '@/components/common/EmptyState.vue'

const tagsStore = useTagsStore()
const modulesStore = useModulesStore()

// ===== 搜索 =====
const tagSearchKeyword = ref('')

const filteredTags = computed(() => {
  if (!tagSearchKeyword.value.trim()) return tagsStore.tags
  const kw = tagSearchKeyword.value.toLowerCase()
  return tagsStore.tags.filter((t) => t.name.toLowerCase().includes(kw))
})

// ===== 标签关联模块数 =====
function getTagModuleCount(tagId: string): number {
  return modulesStore.modules.filter((m) => m.tags && m.tags.includes(tagId)).length
}

// ===== 标签管理 =====
const tagDialogVisible = ref(false)
const tagFormRef = ref<FormInstance>()
const tagForm = ref<Partial<Tag>>({ name: '', color: '#409eff' })
const tagSaving = ref(false)

const tagRules: FormRules = {
  name: [{ required: true, message: '请输入标签名称', trigger: 'blur' }]
}

function openTagDialog(row?: Tag) {
  if (row) {
    tagForm.value = { id: row.id, name: row.name, color: row.color || '#409eff' }
  } else {
    tagForm.value = { name: '', color: '#409eff' }
  }
  tagDialogVisible.value = true
}

async function handleSaveTag() {
  if (!tagFormRef.value) return
  try {
    await tagFormRef.value.validate()
  } catch {
    return
  }
  tagSaving.value = true
  try {
    if (tagForm.value.id) {
      tagsStore.updateTag(tagForm.value.id, { name: tagForm.value.name!, color: tagForm.value.color })
      ElMessage.success('标签更新成功')
    } else {
      tagsStore.addTag({ name: tagForm.value.name!, color: tagForm.value.color })
      ElMessage.success('标签新增成功')
    }
    tagDialogVisible.value = false
  } finally {
    tagSaving.value = false
  }
}

function handleDeleteTag(row: Tag) {
  const moduleCount = getTagModuleCount(row.id)
  const extraMsg = moduleCount > 0 ? `\n\n该标签关联了 ${moduleCount} 个模块，删除后将自动解除所有关联。` : ''
  ElMessageBox.confirm(`确定要删除标签"${row.name}"吗？${extraMsg}`, '删除确认', {
    confirmButtonText: '确定删除',
    cancelButtonText: '取消',
    type: 'warning',
    confirmButtonClass: 'el-button--danger'
  })
    .then(async () => {
      try {
        await tagsStore.deleteTag(row.id)
        ElMessage.success('标签删除成功')
      } catch (err) {
        notifyDbError(err, '删除标签')
        ElMessage.error('删除标签失败，请重试')
      }
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
