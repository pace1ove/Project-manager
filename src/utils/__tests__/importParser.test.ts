import { describe, it, expect } from 'vitest'
import { normalizeColumnName, COLUMN_ALIAS_MAP } from '@/utils/importParser'

describe('normalizeColumnName 列名映射', () => {
  it('中文列名正确映射到英文字段', () => {
    expect(normalizeColumnName('图号')).toBe('drawingNo')
    expect(normalizeColumnName('数量')).toBe('quantity')
    expect(normalizeColumnName('物料编码')).toBe('materialCatalogNo')
    expect(normalizeColumnName('装配单位')).toBe('assemblyUnit')
    expect(normalizeColumnName('中文描述')).toBe('chineseDescription')
    expect(normalizeColumnName('备注')).toBe('remarks')
  })

  it('英文别名大小写不敏感地映射到英文字段', () => {
    expect(normalizeColumnName('DRAWINGNO')).toBe('drawingNo')
    expect(normalizeColumnName('Qty')).toBe('quantity')
    expect(normalizeColumnName('MaterialCode')).toBe('materialCatalogNo')
    expect(normalizeColumnName('Job No')).toBe('jobNo')
    expect(normalizeColumnName('RESERVED1')).toBe('reserved1')
  })

  it('同义词归并到同一字段（规格/型号 → reserved1，位号 → reserved2）', () => {
    expect(normalizeColumnName('规格')).toBe('reserved1')
    expect(normalizeColumnName('规格型号')).toBe('reserved1')
    expect(normalizeColumnName('型号')).toBe('reserved1')
    expect(normalizeColumnName('位号')).toBe('reserved2')
    expect(normalizeColumnName('零件分类')).toBe('partCategory')
    expect(normalizeColumnName('是否关键件')).toBe('ifKeyParts')
  })

  it('自动去除首尾空格后再映射', () => {
    expect(normalizeColumnName('  数量  ')).toBe('quantity')
    expect(normalizeColumnName(' job no ')).toBe('jobNo')
  })

  it('未识别的列名返回去空格后的原始列名', () => {
    expect(normalizeColumnName('自定义列')).toBe('自定义列')
    expect(normalizeColumnName('  我的备注列  ')).toBe('我的备注列')
  })

  it('别名表覆盖常见 BOM 字段', () => {
    // 抽查关键字段都存在映射
    expect(COLUMN_ALIAS_MAP['图号']).toBe('drawingNo')
    expect(COLUMN_ALIAS_MAP['物料/目录号']).toBe('materialCatalogNo')
    expect(COLUMN_ALIAS_MAP['总金额']).toBe('totalAmount')
    expect(COLUMN_ALIAS_MAP['ECN号']).toBe('ecnNo')
    expect(COLUMN_ALIAS_MAP['采购批次']).toBe('purchasingBatch')
  })
})
