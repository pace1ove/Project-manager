import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { BomTemplateField, BomTemplateType } from '@/types'
import { db } from '@/db/index'
import { generateId, deepClone } from '@/utils/storage'
import { mockBomTemplates } from '@/mock/bomTemplates'
import {
  addBomFieldToExisting,
  clearBomFieldKey,
  renameBomFieldKey,
  type MigrationProgress
} from '@/utils/bomMigration'

export const useBomTemplatesStore = defineStore('bomTemplates', () => {
  const fields = ref<BomTemplateField[]>([])

  /** 数据迁移进度状态（供设置页展示进度条） */
  const migrationState = ref<{
    active: boolean
    percent: number
    message: string
  }>({ active: false, percent: 0, message: '' })

  async function initialize() {
    fields.value = await db.bomTemplates.toArray()
  }

  function setMigrationProgress(p: MigrationProgress) {
    migrationState.value.active = true
    migrationState.value.message = `正在迁移 ${p.table}（${p.processed}/${p.total}）`
    migrationState.value.percent = p.total > 0 ? Math.round((p.processed / p.total) * 100) : 100
  }

  function finishMigration(message: string) {
    migrationState.value.active = false
    migrationState.value.percent = 100
    migrationState.value.message = message
    // 2 秒后清空提示
    setTimeout(() => {
      if (!migrationState.value.active) {
        migrationState.value.message = ''
        migrationState.value.percent = 0
      }
    }, 2000)
  }

  /**
   * 更新字段（按 key + templateType 定位）
   * templateType 可选，不传时匹配第一个 key 相同的字段（向后兼容）
   */
  async function updateField(
    key: string,
    data: Partial<BomTemplateField>,
    templateType?: BomTemplateType
  ) {
    const idx = fields.value.findIndex(
      (f) => f.key === key && (!templateType || f.templateType === templateType)
    )
    if (idx !== -1) {
      const updated = { ...fields.value[idx], ...data }
      await db.bomTemplates.put(deepClone(updated))
      fields.value[idx] = updated
    }
  }

  /**
   * 新增字段
   * @param field 字段数据（不含 id、sortOrder、templateType）
   * @param templateType 模板类型，默认 'module'
   */
  function addField(
    field: Omit<BomTemplateField, 'id' | 'sortOrder' | 'templateType'> & { sortOrder?: number },
    templateType: BomTemplateType = 'module'
  ) {
    const typeFields = fields.value.filter((f) => f.templateType === templateType)
    if (typeFields.some((f) => f.key === field.key)) {
      return false
    }
    const maxSort = typeFields.length > 0 ? Math.max(...typeFields.map((f) => f.sortOrder)) : 0
    const newField: BomTemplateField = {
      ...field,
      templateType,
      id: generateId('btf'),
      sortOrder: field.sortOrder ?? maxSort + 1
    }
    db.bomTemplates.add(newField).catch(console.error)
    fields.value.push(newField)

    // 新增字段后，现有 BOM 数据自动补充该字段（值为 defaultValue 或空）
    addBomFieldToExisting(newField.key, newField.defaultValue, newField.templateType, setMigrationProgress)
      .then(({ addedCount }) => {
        finishMigration(`已为现有 ${addedCount} 条 BOM 数据补充字段「${newField.label}」`)
      })
      .catch((e) => {
        console.error('新增字段数据补充失败:', e)
        finishMigration('字段补充失败')
      })

    return true
  }

  /**
   * 按 id 删除字段（不同模板类型可有相同 key，故用 id 精确定位）
   * 删除后在同类型内重新排序
   */
  async function deleteField(id: string) {
    const field = fields.value.find((f) => f.id === id)
    if (!field) return
    await db.bomTemplates.delete(id)
    fields.value = fields.value.filter((f) => f.id !== id)
    // 在同类型内重新排序并持久化
    const typeFields = fields.value
      .filter((f) => f.templateType === field.templateType)
      .sort((a, b) => a.sortOrder - b.sortOrder)
    typeFields.forEach((f, idx) => {
      f.sortOrder = idx + 1
    })
    if (typeFields.length > 0) {
      await db.bomTemplates.bulkPut(deepClone(typeFields))
    }
  }

  /**
   * 检查 key 在指定模板类型内是否唯一
   */
  function isKeyUnique(
    key: string,
    excludeKey?: string,
    templateType?: BomTemplateType
  ): boolean {
    return !fields.value.some(
      (f) =>
        f.key === key &&
        f.key !== excludeKey &&
        (!templateType || f.templateType === templateType)
    )
  }

  /**
   * 返回指定模板类型的所有字段（按 sortOrder 排序）
   */
  function getFieldsByType(templateType: BomTemplateType): BomTemplateField[] {
    return fields.value
      .filter((f) => f.templateType === templateType)
      .sort((a, b) => a.sortOrder - b.sortOrder)
  }

  /**
   * 返回指定模板类型的可见字段（按 sortOrder 排序）
   */
  function getVisibleFieldsByType(templateType: BomTemplateType): BomTemplateField[] {
    return fields.value
      .filter((f) => f.templateType === templateType && f.visible)
      .sort((a, b) => a.sortOrder - b.sortOrder)
  }

  /**
   * 向后兼容：默认返回 module 类型的可见字段
   */
  function getVisibleFields(): BomTemplateField[] {
    return getVisibleFieldsByType('module')
  }

  function getRequiredFields(): BomTemplateField[] {
    return fields.value.filter((f) => f.required)
  }

  /**
   * 重置为默认模板
   * @param templateType 可选，指定时只重置该类型；不指定时重置所有类型
   */
  async function resetToMock(templateType?: BomTemplateType) {
    if (templateType) {
      // 只删除指定类型的字段
      const typeFields = fields.value.filter((f) => f.templateType === templateType)
      if (typeFields.length > 0) {
        await db.bomTemplates.bulkDelete(typeFields.map((f) => f.id))
      }
      // 插入该类型的默认字段
      const mockForType = mockBomTemplates.filter((f) => f.templateType === templateType)
      await db.bomTemplates.bulkPut(deepClone(mockForType))
    } else {
      // 重置所有类型
      await db.bomTemplates.clear()
      await db.bomTemplates.bulkPut(deepClone(mockBomTemplates))
    }
    fields.value = await db.bomTemplates.toArray()
  }

  /**
   * 字段重命名数据迁移：由 Settings 弹窗在用户勾选"迁移数据"后调用
   */
  async function renameFieldInData(
    oldKey: string,
    newKey: string,
    templateType: BomTemplateType
  ): Promise<number> {
    const { renamedCount } = await renameBomFieldKey(oldKey, newKey, templateType, setMigrationProgress)
    finishMigration(`已迁移 ${renamedCount} 条 BOM 数据的字段「${oldKey}」→「${newKey}」`)
    return renamedCount
  }

  /**
   * 字段删除数据迁移：清除所有 BOM 数据中的该字段值
   */
  async function clearFieldInData(key: string, templateType: BomTemplateType): Promise<number> {
    const { clearedCount } = await clearBomFieldKey(key, templateType, setMigrationProgress)
    finishMigration(`已从 ${clearedCount} 条 BOM 数据中清除字段「${key}」`)
    return clearedCount
  }

  return {
    fields,
    migrationState,
    initialize,
    updateField,
    addField,
    deleteField,
    renameFieldInData,
    clearFieldInData,
    isKeyUnique,
    getFieldsByType,
    getVisibleFieldsByType,
    getVisibleFields,
    getRequiredFields,
    resetToMock
  }
})
