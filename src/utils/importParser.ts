import * as XLSX from 'xlsx'

export interface ParsedColumn {
  name: string
  label: string
  type: 'text' | 'number'
}

export interface ParsedFileResult {
  columns: ParsedColumn[]
  rows: Record<string, any>[]
}

/**
 * 常见列名别名映射（用于自动识别BOM字段）
 */
export const COLUMN_ALIAS_MAP: Record<string, string> = {
  '图号': 'drawingNo', 'drawingno': 'drawingNo', 'drawing no': 'drawingNo',
  'JOB号': 'jobNo', 'jobno': 'jobNo', 'job no': 'jobNo',
  '中文描述': 'chineseDescription', 'chinesedescription': 'chineseDescription',
  '物料名称': 'chineseDescription', '名称': 'chineseDescription', 'name': 'chineseDescription', 'materialname': 'chineseDescription',
  '英文描述': 'englishDescription', 'englishdescription': 'englishDescription',
  '物料/目录号': 'materialCatalogNo', '物料目录号': 'materialCatalogNo',
  '物料编码': 'materialCatalogNo', '编码': 'materialCatalogNo', 'code': 'materialCatalogNo', 'materialcode': 'materialCatalogNo', '物料号': 'materialCatalogNo', 'materialcatalognumber': 'materialCatalogNo',
  '装配单位': 'assemblyUnit', '单位': 'assemblyUnit', 'unit': 'assemblyUnit', 'assemblyunit': 'assemblyUnit',
  '数量': 'quantity', 'qty': 'quantity', 'quantity': 'quantity', '用量': 'quantity',
  '总金额': 'totalAmount', 'totalamount': 'totalAmount',
  '备件': 'spareParts', 'spareparts': 'spareParts',
  '预留1': 'reserved1', 'reserved1': 'reserved1',
  '零件分类': 'partCategory', 'partcategory': 'partCategory', 'partCategory': 'partCategory',
  '预留2': 'reserved2', 'reserved2': 'reserved2',
  '采购批次': 'purchasingBatch', 'purchasingbatch': 'purchasingBatch',
  '备注': 'remarks', 'remarks': 'remarks', 'remark': 'remarks', 'note': 'remarks', 'comment': 'remarks',
  'ECN号': 'ecnNo', 'ecnno': 'ecnNo', 'ecn no': 'ecnNo',
  '是否关键件': 'ifKeyParts', 'ifkeyparts': 'ifKeyParts',
  '规格': 'reserved1', '规格型号': 'reserved1', '型号': 'reserved1', 'spec': 'reserved1', 'specification': 'reserved1',
  '位号': 'reserved2', 'position': 'reserved2', '位号标记': 'reserved2',
  '类型': 'type', 'type': 'type', 'bom类型': 'type'
}

/**
 * 标准化列名
 */
export function normalizeColumnName(raw: string): string {
  const key = raw.trim().toLowerCase()
  return COLUMN_ALIAS_MAP[key] || raw.trim()
}

/**
 * 解析Excel文件
 */
export function parseExcelFile(file: File): Promise<ParsedFileResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: '' }) as any[][]
        if (jsonData.length < 1) { reject(new Error('文件为空')); return }
        resolve(parseTableData(jsonData))
      } catch (err) { reject(err) }
    }
    reader.onerror = () => reject(new Error('文件读取失败'))
    reader.readAsArrayBuffer(file)
  })
}

/**
 * 解析CSV文件
 */
export function parseCsvFile(file: File): Promise<ParsedFileResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string
        const lines = parseCsvText(text)
        if (lines.length < 1) { reject(new Error('文件为空')); return }
        resolve(parseTableData(lines))
      } catch (err) { reject(err) }
    }
    reader.onerror = () => reject(new Error('文件读取失败'))
    reader.readAsText(file, 'UTF-8')
  })
}

function parseCsvText(text: string): string[][] {
  const lines: string[][] = []
  let currentLine: string[] = []
  let currentField = ''
  let inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    const nextChar = text[i + 1]
    if (inQuotes) {
      if (char === '"' && nextChar === '"') { currentField += '"'; i++ }
      else if (char === '"') { inQuotes = false }
      else { currentField += char }
    } else {
      if (char === '"') { inQuotes = true }
      else if (char === ',') { currentLine.push(currentField.trim()); currentField = '' }
      else if (char === '\n' || char === '\r') {
        if (char === '\r' && nextChar === '\n') i++
        currentLine.push(currentField.trim())
        if (currentLine.some((f) => f !== '')) lines.push(currentLine)
        currentLine = []; currentField = ''
      } else { currentField += char }
    }
  }
  if (currentField.trim() || currentLine.length > 0) {
    currentLine.push(currentField.trim())
    if (currentLine.some((f) => f !== '')) lines.push(currentLine)
  }
  return lines
}

function parseTableData(tableData: any[][]): ParsedFileResult {
  const headerRow = tableData[0]
  const dataRows = tableData.slice(1)
  const columns: ParsedColumn[] = headerRow.map((header, index) => {
    const rawName = String(header || `列${index + 1}`).trim()
    const normalizedName = normalizeColumnName(rawName)
    const colData = dataRows.map((row) => row[index]).filter((v) => v !== '' && v !== undefined && v !== null)
    let type: ParsedColumn['type'] = 'text'
    if (colData.length > 0 && colData.every((v) => !isNaN(Number(v)) && v !== '')) type = 'number'
    return { name: normalizedName, label: rawName, type }
  })
  const rows: Record<string, any>[] = dataRows
    .filter((row) => row.some((cell) => cell !== '' && cell !== undefined && cell !== null))
    .map((row) => {
      const rowData: Record<string, any> = {}
      columns.forEach((col, idx) => {
        const value = row[idx]
        rowData[col.name] = col.type === 'number' ? (value === '' ? '' : Number(value)) : String(value || '')
      })
      return rowData
    })
  return { columns, rows }
}

/**
 * 自动检测文件类型并解析
 */
export async function parseFile(file: File): Promise<ParsedFileResult> {
  const ext = file.name.split('.').pop()?.toLowerCase()
  if (ext === 'csv') return parseCsvFile(file)
  if (ext === 'xlsx' || ext === 'xls') return parseExcelFile(file)
  throw new Error(`不支持的文件格式: .${ext}，请上传 .xlsx / .xls / .csv 文件`)
}
