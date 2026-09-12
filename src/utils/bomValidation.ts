import type { BomTemplateField } from '@/types'

/**
 * BOM 条目校验工具
 *
 * 统一手动创建和批量导入的校验规则。
 */

/** 单字段校验结果 */
export interface BomFieldValidation {
  field: string
  label: string
  valid: boolean
  message: string
}

/** BOM 行校验结果 */
export interface BomRowValidation {
  row: number
  valid: boolean
  errors: BomFieldValidation[]
}

/** 完整校验结果 */
export interface BomValidationSummary {
  totalRows: number
  validRows: number
  errorRows: number
  errors: BomRowValidation[]
  /** 所有错误的扁平化列表（用于汇总显示） */
  allErrors: BomFieldValidation[]
}

/**
 * 从模板字段获取必填字段配置
 */
function getRequiredFields(fields: BomTemplateField[] | undefined): { key: string; label: string }[] {
  if (!fields || fields.length === 0) {
    // 默认必填字段
    return [
      { key: 'chineseDescription', label: '中文描述' },
      { key: 'quantity', label: '数量' }
    ]
  }
  return fields
    .filter((f) => f.required && f.visible)
    .map((f) => ({ key: f.key, label: f.label }))
}

/**
 * 校验单个 BOM 行
 *
 * @param row BOM 行数据（普通对象）
 * @param rowIndex 行号（从1开始）
 * @param templateFields 模板字段配置（用于动态获取 required 字段）
 * @returns 行校验结果
 */
export function validateBomRow(
  row: Record<string, any>,
  rowIndex: number,
  templateFields?: BomTemplateField[]
): BomRowValidation {
  const errors: BomFieldValidation[] = []
  const requiredFields = getRequiredFields(templateFields)

  for (const field of requiredFields) {
    const value = row[field.key]

    // 检查必填
    if (value === undefined || value === null || String(value).trim() === '') {
      errors.push({
        field: field.key,
        label: field.label,
        valid: false,
        message: `${field.label}为必填项`
      })
      continue
    }

    // 数量特殊校验：必须为正数
    if (field.key === 'quantity') {
      const num = Number(value)
      if (isNaN(num)) {
        errors.push({
          field: field.key,
          label: field.label,
          valid: false,
          message: `${field.label}「${value}」不是有效数字`
        })
      } else if (num <= 0) {
        errors.push({
          field: field.key,
          label: field.label,
          valid: false,
          message: `${field.label}必须大于0`
        })
      }
    }
  }

  return {
    row: rowIndex,
    valid: errors.length === 0,
    errors
  }
}

/**
 * 校验 BOM 行数组
 *
 * @param rows BOM 行数组
 * @param templateFields 模板字段配置
 * @returns 完整校验汇总
 */
export function validateBomRows(
  rows: Record<string, any>[],
  templateFields?: BomTemplateField[]
): BomValidationSummary {
  const results: BomRowValidation[] = rows.map((row, idx) =>
    validateBomRow(row, idx + 1, templateFields)
  )

  const allErrors: BomFieldValidation[] = []
  for (const result of results) {
    if (!result.valid) {
      allErrors.push(...result.errors)
    }
  }

  return {
    totalRows: rows.length,
    validRows: results.filter((r) => r.valid).length,
    errorRows: results.filter((r) => !r.valid).length,
    errors: results.filter((r) => !r.valid),
    allErrors
  }
}

/**
 * 行内编辑时校验单个字段
 *
 * @param field 字段 key
 * @param value 字段值
 * @param templateFields 模板字段配置
 * @returns 错误消息，空字符串表示通过
 */
export function validateBomField(
  field: string,
  value: any,
  templateFields?: BomTemplateField[]
): string {
  const requiredFields = getRequiredFields(templateFields)
  const fieldConfig = requiredFields.find((f) => f.key === field)

  if (!fieldConfig) return ''

  // 必填检查
  if (value === undefined || value === null || String(value).trim() === '') {
    return `${fieldConfig.label}为必填项`
  }

  // 数量正数检查
  if (field === 'quantity') {
    const num = Number(value)
    if (isNaN(num)) return `${fieldConfig.label}不是有效数字`
    if (num <= 0) return `${fieldConfig.label}必须大于0`
  }

  return ''
}

/**
 * 获取图号格式校验正则（从 localStorage 读取，默认不限制）
 */
export function getDrawingNoPattern(): RegExp | null {
  try {
    const saved = localStorage.getItem('bom-manager-drawingno-pattern')
    if (saved && saved.trim()) {
      return new RegExp(saved)
    }
  } catch {
    // 忽略无效正则
  }
  return null
}

/**
 * 设置图号格式校验正则
 */
export function setDrawingNoPattern(pattern: string): void {
  if (pattern && pattern.trim()) {
    localStorage.setItem('bom-manager-drawingno-pattern', pattern.trim())
  } else {
    localStorage.removeItem('bom-manager-drawingno-pattern')
  }
}

/**
 * 校验图号格式
 */
export function validateDrawingNoFormat(drawingNo: string): string {
  const pattern = getDrawingNoPattern()
  if (!pattern || !drawingNo) return ''
  if (!pattern.test(drawingNo)) {
    return `图号格式不符合要求（正则: ${pattern.source}）`
  }
  return ''
}
