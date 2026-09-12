import { describe, it, expect } from 'vitest'
import {
  generateOrderBom,
  getOrderItemCount,
  getAssemblyItemCount
} from '@/utils/bomGenerator'
import type { Module, BomItem, SelectedModule } from '@/types'

let itemSeq = 0

/** 构造一个 BOM 条目，可覆盖任意字段 */
function makeBomItem(partial: Partial<BomItem> = {}): BomItem {
  itemSeq += 1
  return {
    id: `item_${itemSeq}`,
    quantity: 1,
    type: 'order',
    source: 'manual',
    sortOrder: itemSeq,
    ...partial
  }
}

/** 构造一个 Module（业务逻辑不再读取内嵌 bom，bom 字段仅为满足类型） */
function makeModule(partial: Partial<Module> & { id: string }): Module {
  const { id, ...rest } = partial
  return {
    drawingNo: `${id}-ASM`,
    nameZh: id,
    equipmentId: 'eq1',
    configurationIds: [],
    tags: [],
    childModuleIds: [],
    bom: { moduleId: id, items: [] },
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    ...rest,
    id
  }
}

describe('generateOrderBom', () => {
  it('生成模块本身条目，并按模块数量倍乘下单物料数量', () => {
    const m1 = makeModule({ id: 'm1', drawingNo: 'DWG-M1' })
    const bomMap = new Map<string, BomItem[]>([
      ['m1', [
        makeBomItem({ materialCatalogNo: 'MAT-001', quantity: 3, type: 'order', sortOrder: 1, chineseDescription: '螺丝' }),
        makeBomItem({ materialCatalogNo: 'MAT-002', quantity: 5, type: 'both', sortOrder: 2, chineseDescription: '螺母' })
      ]]
    ])

    const result = generateOrderBom([{ moduleId: 'm1', quantity: 2 }], [m1], bomMap)

    // 模块本身 1 条 + 物料 2 条 = 3 条
    expect(result.items.length).toBe(3)
    expect(result.items.find((i) => i.materialCatalogNo === 'MAT-001')?.quantity).toBe(6)
    expect(result.items.find((i) => i.materialCatalogNo === 'MAT-002')?.quantity).toBe(10)

    // 模块本身条目：数量=选中数量，备注为“组件本身”
    const self = result.items.find((i) => i.isModuleItem)
    expect(self?.quantity).toBe(2)
    expect(self?.remarks).toBe('组件本身')
  })

  it('跳过数量为 0 或负数的 BOM 条目并记录警告', () => {
    const m1 = makeModule({ id: 'm1' })
    const bomMap = new Map<string, BomItem[]>([
      ['m1', [
        makeBomItem({ materialCatalogNo: 'MAT-OK', quantity: 4, type: 'order', sortOrder: 1 }),
        makeBomItem({ materialCatalogNo: 'MAT-ZERO', quantity: 0, type: 'order', sortOrder: 2 }),
        makeBomItem({ materialCatalogNo: 'MAT-NEG', quantity: -3, type: 'order', sortOrder: 3 })
      ]]
    ])

    const result = generateOrderBom([{ moduleId: 'm1', quantity: 1 }], [m1], bomMap)

    expect(result.logs.skipped).toBe(2)
    expect(result.logs.warnings.length).toBe(2)
    expect(result.items.some((i) => i.materialCatalogNo === 'MAT-ZERO')).toBe(false)
    expect(result.items.some((i) => i.materialCatalogNo === 'MAT-NEG')).toBe(false)
    expect(result.items.find((i) => i.materialCatalogNo === 'MAT-OK')?.quantity).toBe(4)
  })

  it('多模块同一物料编码合并累加数量，并记录多个来源模块', () => {
    const m1 = makeModule({ id: 'm1' })
    const m2 = makeModule({ id: 'm2' })
    const bomMap = new Map<string, BomItem[]>([
      ['m1', [makeBomItem({ materialCatalogNo: 'MAT-X', quantity: 2, type: 'order', sortOrder: 1 })]],
      ['m2', [makeBomItem({ materialCatalogNo: 'MAT-X', quantity: 3, type: 'order', sortOrder: 1 })]]
    ])

    const selected: SelectedModule[] = [
      { moduleId: 'm1', quantity: 2 },
      { moduleId: 'm2', quantity: 3 }
    ]
    const result = generateOrderBom(selected, [m1, m2], bomMap)

    const matX = result.items.filter((i) => i.materialCatalogNo === 'MAT-X')
    expect(matX.length).toBe(1)
    // (2*2) + (3*3) = 13
    expect(matX[0].quantity).toBe(13)
    expect(matX[0].sourceModuleIds).toEqual(expect.arrayContaining(['m1', 'm2']))
    expect(result.logs.merged).toBe(1)
  })

  it('忽略 type 为 assembly 的装配类条目', () => {
    const m1 = makeModule({ id: 'm1' })
    const bomMap = new Map<string, BomItem[]>([
      ['m1', [
        makeBomItem({ materialCatalogNo: 'MAT-A', quantity: 1, type: 'assembly', sortOrder: 1 }),
        makeBomItem({ materialCatalogNo: 'MAT-O', quantity: 2, type: 'order', sortOrder: 2 })
      ]]
    ])

    const result = generateOrderBom([{ moduleId: 'm1', quantity: 1 }], [m1], bomMap)

    expect(result.items.some((i) => i.materialCatalogNo === 'MAT-A')).toBe(false)
    expect(result.items.some((i) => i.materialCatalogNo === 'MAT-O')).toBe(true)
  })

  it('递归把子模块作为“子组件”条目加入下单 BOM', () => {
    const c1 = makeModule({ id: 'c1', drawingNo: 'DWG-C1' })
    const p1 = makeModule({ id: 'p1', childModuleIds: ['c1'] })
    const bomMap = new Map<string, BomItem[]>()

    const result = generateOrderBom([{ moduleId: 'p1', quantity: 1 }], [p1, c1], bomMap)

    // 父模块本身 + 子模块 c1 = 2 条
    expect(result.items.length).toBe(2)
    const child = result.items.find((i) => i.remarks === '子组件')
    expect(child?.chineseDescription).toBe('c1')
  })

  it('getOrderItemCount / getAssemblyItemCount 按类型统计条目数', () => {
    const items: BomItem[] = [
      makeBomItem({ type: 'order', sortOrder: 1 }),
      makeBomItem({ type: 'assembly', sortOrder: 2 }),
      makeBomItem({ type: 'both', sortOrder: 3 })
    ]

    expect(getOrderItemCount(items)).toBe(2) // order + both
    expect(getAssemblyItemCount(items)).toBe(2) // assembly + both
    expect(getOrderItemCount(null)).toBe(0)
    expect(getAssemblyItemCount(undefined)).toBe(0)
  })
})
