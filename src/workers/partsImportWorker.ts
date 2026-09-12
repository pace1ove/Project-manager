/**
 * 零件库导入Web Worker
 * 用于处理大数据量（8万条以上）的Excel解析、数据校验和冲突检测，不阻塞主线程。
 *
 * 使用方式：
 * const worker = new Worker(new URL('./partsImportWorker.ts', import.meta.url), { type: 'module' })
 * worker.postMessage({ type: 'parse', file })
 * worker.onmessage = (e) => { ... }
 */

/// <reference lib="webworker" />

import * as XLSX from 'xlsx'

// ===== 类型定义 =====

interface ParsedColumn {
  name: string
  originalName: string
  index: number
}

interface ParseResult {
  columns: ParsedColumn[]
  rows: Record<string, any>[]
  rowCount: number
}

interface ValidateOptions {
  requiredFields: string[]
  drawingNoField: string
}

interface ValidationError {
  rowNum: number
  reason: string
}

interface ValidateResult {
  validRows: Record<string, any>[]
  errors: ValidationError[]
  duplicateGroups: { drawingNo: string; count: number; rowNums: number[] }[]
}

// ===== 消息处理 =====

self.onmessage = async (e: MessageEvent) => {
  const { type, payload } = e.data

  try {
    switch (type) {
      case 'parse':
        await handleParse(payload)
        break
      case 'validate':
        handleValidate(payload)
        break
      case 'detectConflicts':
        handleDetectConflicts(payload)
        break
      default:
        self.postMessage({ type: 'error', error: `未知消息类型: ${type}` })
    }
  } catch (error: any) {
    self.postMessage({ type: 'error', error: error.message || String(error) })
  }
}

// ===== Excel解析 =====

async function handleParse(payload: { file: File }) {
  const { file } = payload

  // 读取文件
  const arrayBuffer = await file.arrayBuffer()

  // 解析Excel
  const workbook = XLSX.read(arrayBuffer, { type: 'array' })
  const firstSheetName = workbook.SheetNames[0]
  const worksheet = workbook.Sheets[firstSheetName]

  // 转换为JSON（保留原始列名）
  const rawData = XLSX.utils.sheet_to_json(worksheet, {
    defval: '',
    raw: false
  }) as Record<string, any>[]

  // 提取列信息
  const columns: ParsedColumn[] = []
  if (rawData.length > 0) {
    Object.keys(rawData[0]).forEach((name, index) => {
      columns.push({
        name: normalizeColumnName(name),
        originalName: name,
        index
      })
    })
  }

  // 标准化行数据（使用标准化列名作为key）
  const rows = rawData.map((row) => {
    const normalizedRow: Record<string, any> = {}
    for (const [key, value] of Object.entries(row)) {
      normalizedRow[normalizeColumnName(key)] = value
    }
    return normalizedRow
  })

  const result: ParseResult = {
    columns,
    rows,
    rowCount: rows.length
  }

  self.postMessage({ type: 'parseComplete', result })
}

// ===== 数据校验 =====

function handleValidate(payload: {
  rows: Record<string, any>[]
  fieldMapping: Record<string, string>
  options: ValidateOptions
}) {
  const { rows, fieldMapping, options } = payload
  const { requiredFields, drawingNoField } = options

  const errors: ValidationError[] = []
  const validRows: Record<string, any>[] = []
  const drawingNoMap = new Map<string, number[]>()

  rows.forEach((row, index) => {
    const rowNum = index + 2 // Excel行号从2开始（第1行是表头）
    const mappedRow: Record<string, any> = {}

    // 应用字段映射
    for (const [systemField, excelColumn] of Object.entries(fieldMapping)) {
      if (excelColumn) {
        mappedRow[systemField] = row[excelColumn]
      }
    }

    // 校验必填字段
    let hasError = false
    for (const field of requiredFields) {
      const value = mappedRow[field]
      if (value === undefined || value === null || String(value).trim() === '') {
        errors.push({
          rowNum,
          reason: `必填字段「${field}」为空`
        })
        hasError = true
      }
    }

    if (hasError) return

    // 记录图号用于重复检测
    const drawingNo = drawingNoField ? String(mappedRow[drawingNoField] || '').trim() : ''
    if (drawingNo) {
      if (!drawingNoMap.has(drawingNo)) {
        drawingNoMap.set(drawingNo, [])
      }
      drawingNoMap.get(drawingNo)!.push(rowNum)
    }

    validRows.push(mappedRow)
  })

  // 检测文件内重复
  const duplicateGroups: { drawingNo: string; count: number; rowNums: number[] }[] = []
  for (const [drawingNo, rowNums] of drawingNoMap) {
    if (rowNums.length > 1) {
      duplicateGroups.push({
        drawingNo,
        count: rowNums.length,
        rowNums
      })
    }
  }

  const result: ValidateResult = {
    validRows,
    errors,
    duplicateGroups
  }

  self.postMessage({ type: 'validateComplete', result })
}

// ===== 冲突检测 =====

function handleDetectConflicts(payload: {
  items: Record<string, any>[]
  existingPartsMap: Record<string, any> // 图号 -> 零件
  fieldLabels: Record<string, string>
}) {
  const { items, existingPartsMap, fieldLabels } = payload

  const conflicts: {
    drawingNo: string
    existingPart: any
    newData: Record<string, any>
    diffs: { key: string; label: string; oldValue: any; newValue: any }[]
    action: string
  }[] = []

  const seenDrawingNos = new Set<string>()

  for (const item of items) {
    const drawingNo = item.drawingNo != null ? String(item.drawingNo).trim() : ''
    if (!drawingNo) continue
    if (seenDrawingNos.has(drawingNo)) continue

    const existing = existingPartsMap[drawingNo]
    if (!existing) continue

    seenDrawingNos.add(drawingNo)

    // 对比所有零件参数字段
    const diffs: { key: string; label: string; oldValue: any; newValue: any }[] = []
    for (const [key, label] of Object.entries(fieldLabels)) {
      if (key === 'drawingNo') continue
      const oldVal = (existing as any)[key]
      const newVal = item[key]
      const oldStr = oldVal !== undefined && oldVal !== null ? String(oldVal).trim() : ''
      const newStr = newVal !== undefined && newVal !== null ? String(newVal).trim() : ''
      if (oldStr !== newStr) {
        diffs.push({ key, label, oldValue: oldVal, newValue: newVal })
      }
    }

    conflicts.push({
      drawingNo,
      existingPart: existing,
      newData: { ...item },
      diffs,
      action: 'overwrite'
    })
  }

  self.postMessage({ type: 'detectConflictsComplete', result: conflicts })
}

// ===== 工具函数 =====

/**
 * 标准化列名：去除空格、统一大小写、常见别名映射
 */
function normalizeColumnName(name: string): string {
  if (!name) return ''
  let normalized = String(name).trim()

  // 常见别名映射
  const aliasMap: Record<string, string> = {
    '图号': 'drawingNo',
    '零件图号': 'drawingNo',
    '物料编码': 'materialCode',
    '物料编号': 'materialCode',
    '物料名称': 'materialName',
    '中文描述': 'chineseDescription',
    '中文名称': 'chineseDescription',
    '英文描述': 'englishDescription',
    '英文名称': 'englishDescription',
    '规格型号': 'spec',
    '规格': 'spec',
    '型号': 'spec',
    '单位': 'unit',
    '数量': 'qty',
    '位号': 'position',
    '类型': 'type',
    '备注': 'remarks',
    '备注说明': 'remarks',
    '零件类型': 'partType',
    '零件分类': 'partCategory',
    '物料目录号': 'materialCatalogNo',
    '目录号': 'materialCatalogNo',
    '装配单位': 'assemblyUnit',
    '总金额': 'totalAmount',
    '备件': 'spareParts',
    '采购批次': 'purchasingBatch',
    'ECN号': 'ecnNo',
    '是否关键件': 'ifKeyParts',
    'JOB号': 'jobNo'
  }

  if (aliasMap[normalized]) {
    return aliasMap[normalized]
  }

  // 转换为camelCase（英文列名）
  normalized = normalized
    .replace(/[\s_-]+(.)/g, (_, c) => c.toUpperCase())
    .replace(/^(.)/, (_, c) => c.toLowerCase())

  return normalized
}
