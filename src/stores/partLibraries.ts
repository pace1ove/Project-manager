import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { PartLibrary } from '@/types'
import { DEFAULT_PART_LIBRARY_ID } from '@/types'
import { db } from '@/db/index'
import { generateId, deepClone } from '@/utils/storage'
import { usePartsStore } from './parts'

/**
 * 零件库（多库）Store。
 * 支持创建多个零件库（如标准件库、外购件库、自制件库），图号仍全局唯一，不做权限隔离。
 * 删除库时不删除零件，而是将其下零件移到默认库（default-lib）。
 */
export const usePartLibrariesStore = defineStore('partLibraries', () => {
  const libraries = ref<PartLibrary[]>([])

  /** 从 db.partLibraries 加载所有库到内存，按 sortOrder 排序 */
  async function initialize() {
    const all = await db.partLibraries.toArray()
    all.sort((a, b) => a.sortOrder - b.sortOrder)
    libraries.value = all
  }

  function getAll(): PartLibrary[] {
    return libraries.value
  }

  function getById(id: string): PartLibrary | undefined {
    if (!id) return undefined
    return libraries.value.find((l) => l.id === id)
  }

  /** 按库名查找（全局唯一校验用，trim 后不区分大小写比较） */
  function getByName(name: string): PartLibrary | undefined {
    const target = name.trim().toLowerCase()
    if (!target) return undefined
    return libraries.value.find((l) => l.name.trim().toLowerCase() === target)
  }

  /** 返回默认库（id='default-lib'） */
  function getDefaultLibrary(): PartLibrary {
    const lib = libraries.value.find((l) => l.id === DEFAULT_PART_LIBRARY_ID)
    if (!lib) {
      throw new Error('默认零件库不存在，请检查数据库迁移')
    }
    return lib
  }

  /** 统计指定库下的零件数量（从 partsStore 内存统计） */
  function getPartCount(libraryId: string): number {
    if (!libraryId) return 0
    const partsStore = usePartsStore()
    return partsStore.parts.filter((p) => p.libraryId === libraryId).length
  }

  /** 新增零件库：校验库名非空且全局唯一，sortOrder 自动递增 */
  async function addLibrary(data: { name: string; description?: string }): Promise<PartLibrary> {
    const name = data.name.trim()
    if (!name) {
      throw new Error('库名不能为空')
    }
    if (getByName(name)) {
      throw new Error(`库名「${name}」已存在`)
    }
    const now = new Date().toISOString()
    const maxSort = libraries.value.reduce((max, l) => Math.max(max, l.sortOrder), 0)
    const lib: PartLibrary = {
      id: generateId('lib'),
      name,
      description: data.description?.trim() || undefined,
      sortOrder: maxSort + 1,
      createdAt: now,
      updatedAt: now
    }
    await db.partLibraries.add(deepClone(lib))
    libraries.value.push(lib)
    libraries.value.sort((a, b) => a.sortOrder - b.sortOrder)
    return lib
  }

  /** 更新零件库：默认库不可改名，新名称需全局唯一 */
  async function updateLibrary(
    id: string,
    data: { name?: string; description?: string }
  ): Promise<void> {
    const idx = libraries.value.findIndex((l) => l.id === id)
    if (idx === -1) {
      throw new Error('零件库不存在')
    }
    const lib = libraries.value[idx]

    if (data.name !== undefined && data.name.trim()) {
      if (id === DEFAULT_PART_LIBRARY_ID) {
        throw new Error('默认库不允许修改名称')
      }
      const newName = data.name.trim()
      const dup = getByName(newName)
      if (dup && dup.id !== id) {
        throw new Error(`库名「${newName}」已存在`)
      }
      lib.name = newName
    }

    if (data.description !== undefined) {
      lib.description = data.description.trim() || undefined
    }

    lib.updatedAt = new Date().toISOString()
    await db.partLibraries.put(deepClone(lib))
  }

  /**
   * 删除零件库：默认库不可删除；
   * 该库下所有零件移到默认库（Dexie 批量更新），不删除零件本身。
   * @returns movedCount 被移动到默认库的零件数量
   */
  async function deleteLibrary(id: string): Promise<{ movedCount: number }> {
    if (id === DEFAULT_PART_LIBRARY_ID) {
      throw new Error('默认库不可删除')
    }
    if (!getById(id)) {
      throw new Error('零件库不存在')
    }

    // 将该库下所有零件的 libraryId 批量改为默认库（Dexie 批量更新，返回受影响条数）
    const movedCount = await db.parts
      .where('libraryId')
      .equals(id)
      .modify((p) => {
        p.libraryId = DEFAULT_PART_LIBRARY_ID
      })

    // 同步刷新 partsStore 内存中的零件归属
    const partsStore = usePartsStore()
    for (const p of partsStore.parts) {
      if (p.libraryId === id) {
        p.libraryId = DEFAULT_PART_LIBRARY_ID
      }
    }

    // 删除库记录
    await db.partLibraries.delete(id)
    libraries.value = libraries.value.filter((l) => l.id !== id)

    return { movedCount }
  }

  return {
    libraries,
    initialize,
    getAll,
    getById,
    getByName,
    getDefaultLibrary,
    getPartCount,
    addLibrary,
    updateLibrary,
    deleteLibrary
  }
})
