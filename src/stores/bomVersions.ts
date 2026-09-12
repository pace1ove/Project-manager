import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { BomVersion } from '@/types'
import { db } from '@/db/index'
import { generateId, deepClone } from '@/utils/storage'
import { diffBomRows, type BomRowDiff } from '@/utils/diff'

/**
 * BOM 版本管理 Store
 * 支持组件 BOM / 项目下单 BOM 的版本快照、列表、删除、回滚与差异对比
 */
export const useBomVersionsStore = defineStore('bomVersions', () => {
  const versions = ref<BomVersion[]>([])

  async function initialize() {
    versions.value = await db.bomVersions.toArray()
  }

  /** 生成下一个版本号：v1, v2 ... */
  async function nextVersionNo(targetType: 'module' | 'project', targetId: string): Promise<string> {
    const all = await db.bomVersions.where('targetId').equals(targetId).toArray()
    const list = all.filter((v) => v.targetType === targetType)
    const maxNo = list.reduce((max, v) => {
      const m = /^v(\d+)$/.exec(v.versionNo)
      return m ? Math.max(max, parseInt(m[1], 10)) : max
    }, 0)
    return `v${maxNo + 1}`
  }

  /**
   * 创建版本快照
   * @param items BOM 数据（会被深拷贝存储）
   * @param description 版本说明
   * @param versionNo 可选，用户自定义版本号；缺省自动递增
   */
  async function createVersion(
    targetType: 'module' | 'project',
    targetId: string,
    items: any[],
    description: string,
    versionNo?: string
  ): Promise<BomVersion> {
    const no = versionNo && versionNo.trim() ? versionNo.trim() : await nextVersionNo(targetType, targetId)
    const record: BomVersion = {
      id: generateId('bv'),
      targetType,
      targetId,
      versionNo: no,
      description: description || `${no} 快照`,
      createdAt: new Date().toISOString(),
      createdBy: 'admin',
      items: deepClone(items || [])
    }
    await db.bomVersions.add(record)
    versions.value.push(record)
    return record
  }

  /** 获取指定目标的所有版本（按创建时间倒序） */
  async function getVersions(targetType: 'module' | 'project', targetId: string): Promise<BomVersion[]> {
    const list = await db.bomVersions.where('targetId').equals(targetId).toArray()
    return list
      .filter((v) => v.targetType === targetType)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }

  async function getVersion(id: string): Promise<BomVersion | undefined> {
    return await db.bomVersions.get(id)
  }

  async function deleteVersion(id: string) {
    await db.bomVersions.delete(id)
    versions.value = versions.value.filter((v) => v.id !== id)
  }

  /**
   * 回滚到指定版本：返回该版本的 items，由调用方负责写回当前 BOM。
   * （当前版本应在调用前由调用方先 createVersion 保存，防止丢失）
   */
  async function rollbackToVersion(versionId: string): Promise<any[] | undefined> {
    const v = await getVersion(versionId)
    if (!v) return undefined
    return deepClone(v.items)
  }

  /**
   * 对比两个版本 BOM，返回行级 diff 结果
   */
  async function compareVersions(versionId1: string, versionId2: string): Promise<{
    v1?: BomVersion
    v2?: BomVersion
    diffs: BomRowDiff[]
  }> {
    const v1 = await getVersion(versionId1)
    const v2 = await getVersion(versionId2)
    const diffs = diffBomRows(v1?.items || [], v2?.items || [])
    return { v1, v2, diffs }
  }

  /**
   * 跨类型对比：任意两组 BOM 数据对比（例如 组件BOM vs 项目下单BOM）
   */
  function compareRawItems(beforeItems: any[], afterItems: any[]): BomRowDiff[] {
    return diffBomRows(beforeItems || [], afterItems || [])
  }

  async function resetToMock() {
    await initialize()
  }

  return {
    versions,
    initialize,
    createVersion,
    getVersions,
    getVersion,
    deleteVersion,
    rollbackToVersion,
    compareVersions,
    compareRawItems,
    resetToMock
  }
})
