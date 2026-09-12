import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Tag } from '@/types'
import { db } from '@/db/index'
import { generateId, deepClone } from '@/utils/storage'
import { useModulesStore } from '@/stores/modules'

export const useTagsStore = defineStore('tags', () => {
  const tags = ref<Tag[]>([])

  async function initialize() {
    tags.value = await db.tags.toArray()
  }

  // addTag 保持同步返回（视图兼容），DB写入为fire-and-forget
  function addTag(data: Omit<Tag, 'id'>) {
    const item: Tag = { ...data, id: generateId('tag') }
    db.tags.add(item).catch(console.error)
    tags.value.push(item)
    return item
  }

  async function updateTag(id: string, data: Partial<Tag>) {
    const idx = tags.value.findIndex((t) => t.id === id)
    if (idx !== -1) {
      const updated = { ...tags.value[idx], ...data }
      await db.tags.put(deepClone(updated))
      tags.value[idx] = updated
    }
  }

  async function deleteTag(id: string) {
    // 清理所有模块中对该标签的引用
    const modulesStore = useModulesStore()
    for (const m of modulesStore.modules) {
      if (Array.isArray(m.tags) && m.tags.includes(id)) {
        m.tags = m.tags.filter((tid) => tid !== id)
        await db.modules.put(deepClone(m))
      }
    }
    await db.tags.delete(id)
    tags.value = tags.value.filter((t) => t.id !== id)
  }

  function getTagById(id: string): Tag | undefined {
    return tags.value.find((t) => t.id === id)
  }

  async function resetToMock() {
    tags.value = await db.tags.toArray()
  }

  return { tags, initialize, addTag, updateTag, deleteTag, getTagById, resetToMock }
})
