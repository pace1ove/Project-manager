import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { ProjectType } from '@/types'
import { db } from '@/db/index'
import { generateId, deepClone } from '@/utils/storage'
import { useProjectsStore } from '@/stores/projects'

export const useProjectTypesStore = defineStore('projectTypes', () => {
  const projectTypes = ref<ProjectType[]>([])

  async function initialize() {
    projectTypes.value = await db.projectTypes.toArray()
  }

  async function addProjectType(data: Omit<ProjectType, 'id'>) {
    const item: ProjectType = { ...data, id: generateId('pt') }
    await db.projectTypes.add(item)
    projectTypes.value.push(item)
    return item
  }

  async function updateProjectType(id: string, data: Partial<ProjectType>) {
    const idx = projectTypes.value.findIndex((t) => t.id === id)
    if (idx !== -1) {
      const updated = { ...projectTypes.value[idx], ...data }
      await db.projectTypes.put(deepClone(updated))
      projectTypes.value[idx] = updated
    }
  }

  async function deleteProjectType(id: string) {
    // 清理所有项目中对该项目类型的引用
    const projectsStore = useProjectsStore()
    for (const p of projectsStore.projects) {
      if (p.projectTypeId === id) {
        p.projectTypeId = undefined
        await db.projects.put(deepClone(p))
      }
    }
    await db.projectTypes.delete(id)
    projectTypes.value = projectTypes.value.filter((t) => t.id !== id)
  }

  async function resetToMock() {
    projectTypes.value = await db.projectTypes.toArray()
  }

  return { projectTypes, initialize, addProjectType, updateProjectType, deleteProjectType, resetToMock }
})
