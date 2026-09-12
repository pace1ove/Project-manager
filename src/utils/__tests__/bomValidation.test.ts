import { describe, it, expect } from 'vitest'
import {
  validateBomRow,
  validateBomRows,
  validateBomField
} from '@/utils/bomValidation'
import type { BomTemplateField } from '@/types'

describe('validateBomRow 单行校验（默认必填：中文描述、数量）', () => {
  it('合法行：中文描述存在且数量为正数，校验通过', () => {
    const result = validateBomRow({ chineseDescription: '电缆', quantity: 10 }, 1)
    expect(result.valid).toBe(true)
    expect(result.errors.length).toBe(0)
  })

  it('缺失中文描述时报必填错误', () => {
    const result = validateBomRow({ quantity: 5 }, 2)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.field === 'chineseDescription' && e.message.includes('必填'))).toBe(true)
  })

  it('数量为 0 时报“必须大于0”', () => {
    const result = validateBomRow({ chineseDescription: '电缆', quantity: 0 }, 3)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.field === 'quantity' && e.message.includes('必须大于0'))).toBe(true)
  })

  it('数量为负数时报“必须大于0”', () => {
    const result = validateBomRow({ chineseDescription: '电缆', quantity: -5 }, 4)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.field === 'quantity' && e.message.includes('必须大于0'))).toBe(true)
  })

  it('数量为非数字时报“不是有效数字”', () => {
    const result = validateBomRow({ chineseDescription: '电缆', quantity: 'abc' }, 5)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.field === 'quantity' && e.message.includes('不是有效数字'))).toBe(true)
  })

  it('数量为带空格的空串时按必填处理', () => {
    const result = validateBomRow({ chineseDescription: '电缆', quantity: '   ' }, 6)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.field === 'quantity')).toBe(true)
  })
})

describe('validateBomRows 批量汇总', () => {
  it('统计总行数、有效行数、错误行数并扁平化错误', () => {
    const rows = [
      { chineseDescription: 'A', quantity: 1 }, // 有效
      { chineseDescription: 'B', quantity: 0 }, // 数量非法
      { quantity: 3 } // 缺中文描述
    ]
    const summary = validateBomRows(rows)
    expect(summary.totalRows).toBe(3)
    expect(summary.validRows).toBe(1)
    expect(summary.errorRows).toBe(2)
    expect(summary.errors.length).toBe(2)
    expect(summary.allErrors.length).toBe(2)
  })

  it('全部合法时 errorRows 为 0', () => {
    const summary = validateBomRows([
      { chineseDescription: 'A', quantity: 1 },
      { chineseDescription: 'B', quantity: 2 }
    ])
    expect(summary.errorRows).toBe(0)
    expect(summary.allErrors.length).toBe(0)
  })
})

describe('validateBomField 单字段校验', () => {
  it('合法数量返回空字符串（通过）', () => {
    expect(validateBomField('quantity', 10)).toBe('')
    expect(validateBomField('chineseDescription', '电缆')).toBe('')
  })

  it('数量非法返回对应错误消息', () => {
    expect(validateBomField('quantity', 0)).toContain('必须大于0')
    expect(validateBomField('quantity', 'xyz')).toContain('不是有效数字')
  })

  it('非必填字段或不存在的字段返回空字符串', () => {
    expect(validateBomField('remarks', '随便填')).toBe('')
    expect(validateBomField('materialCatalogNo', '')).toBe('')
  })

  it('使用自定义模板字段配置时按其必填规则校验', () => {
    const tpl: BomTemplateField[] = [
      { id: 'f1', key: 'drawingNo', label: '图号', fieldType: 'text', required: true, visible: true, sortOrder: 1, templateType: 'module' }
    ]
    expect(validateBomField('drawingNo', '', tpl)).toContain('图号为必填项')
    expect(validateBomField('drawingNo', 'DWG-001', tpl)).toBe('')
  })
})
