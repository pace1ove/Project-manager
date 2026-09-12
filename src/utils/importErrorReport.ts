import * as XLSX from 'xlsx'

/**
 * 导入错误报告工具
 *
 * 提供结构化的导入错误信息和 Excel 导出功能。
 */

/** 详细的导入错误 */
export interface DetailedImportError {
  /** 行号（从1开始，包含表头行） */
  row: number
  /** 列名（字段 key 或中文列名） */
  column: string
  /** 原始值 */
  value: any
  /** 错误原因 */
  reason: string
  /** 建议操作 */
  suggestion: string
  /** 所属 Sheet（可选） */
  sheet?: string
}

/** 导入错误报告 */
export interface ImportErrorReport {
  /** 总错误数 */
  totalErrors: number
  /** 错误详情列表 */
  errors: DetailedImportError[]
  /** 成功行数 */
  successCount: number
  /** 总行数 */
  totalRows: number
}

/**
 * 将旧格式 ImportError 转换为详细错误
 */
export function convertLegacyError(
  legacyError: { sheet: string; row: number; message: string },
  column = '',
  value: any = ''
): DetailedImportError {
  return {
    row: legacyError.row,
    column: column || extractColumnFromMessage(legacyError.message),
    value,
    reason: legacyError.message,
    suggestion: getSuggestion(legacyError.message),
    sheet: legacyError.sheet
  }
}

/** 从错误消息中提取列名 */
function extractColumnFromMessage(message: string): string {
  // 尝试从消息中提取字段名，如 "中文描述必填" → "中文描述"
  const match = message.match(/^(.+?)(必填|已存在|重复|无效|不是|为|必须)/)
  if (match) return match[1]
  // 提取引号中的内容
  const quoted = message.match(/[「『](.+?)[」』]/)
  if (quoted) return quoted[1]
  return ''
}

/** 根据错误消息生成建议操作 */
function getSuggestion(message: string): string {
  if (message.includes('必填') || message.includes('required')) {
    return '请填写该字段后重新导入'
  }
  if (message.includes('重复') || message.includes('已存在')) {
    return '请修改为不重复的值'
  }
  if (message.includes('不存在')) {
    return '请先在系统中创建对应记录'
  }
  if (message.includes('无效') || message.includes('不是')) {
    return '请检查数据格式是否正确'
  }
  if (message.includes('循环')) {
    return '请调整层级关系避免循环引用'
  }
  return '请修正后重新导入'
}

/**
 * 生成错误报告
 */
export function generateErrorReport(
  errors: DetailedImportError[],
  totalRows: number,
  successCount: number
): ImportErrorReport {
  return {
    totalErrors: errors.length,
    errors,
    successCount,
    totalRows
  }
}

/**
 * 导出错误报告为 Excel 文件
 *
 * @param report 错误报告
 * @param filename 文件名（不含扩展名）
 */
export function exportErrorReportToExcel(report: ImportErrorReport, filename = '导入错误报告'): void {
  const workbook = XLSX.utils.book_new()

  // Sheet1: 错误明细
  const errorData = [
    ['行号', 'Sheet', '列名', '原始值', '错误原因', '建议操作'],
    ...report.errors.map((e) => [
      e.row,
      e.sheet || '',
      e.column,
      String(e.value ?? ''),
      e.reason,
      e.suggestion
    ])
  ]
  const errorWs = XLSX.utils.aoa_to_sheet(errorData)
  errorWs['!cols'] = [
    { wch: 8 }, { wch: 12 }, { wch: 16 }, { wch: 20 }, { wch: 40 }, { wch: 28 }
  ]
  XLSX.utils.book_append_sheet(workbook, errorWs, '错误明细')

  // Sheet2: 汇总
  const summaryData = [
    ['导入错误报告汇总'],
    [],
    ['总行数', report.totalRows],
    ['成功行数', report.successCount],
    ['错误数', report.totalErrors],
    ['生成时间', new Date().toLocaleString('zh-CN')]
  ]
  const summaryWs = XLSX.utils.aoa_to_sheet(summaryData)
  summaryWs['!cols'] = [{ wch: 16 }, { wch: 30 }]
  XLSX.utils.book_append_sheet(workbook, summaryWs, '汇总')

  // 下载文件
  XLSX.writeFile(workbook, `${filename}.xlsx`)
}
