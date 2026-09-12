import * as XLSX from 'xlsx'
import { ElMessage } from 'element-plus'

/**
 * 检测是否在Electron环境中运行
 */
export function isElectronEnvironment(): boolean {
  return !!window.electronAPI
}

/**
 * 导出数据为Excel文件
 * - 浏览器环境：触发浏览器下载
 * - Electron环境：弹出保存对话框，用户选择保存位置
 */
export function exportToExcel(
  data: Record<string, any>[],
  filename: string,
  sheetName = 'Sheet1'
): void {
  const worksheet = XLSX.utils.json_to_sheet(data)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)

  if (isElectronEnvironment()) {
    // Electron环境：使用主进程的文件保存API
    exportToElectron(workbook, filename)
  } else {
    // 浏览器环境：触发浏览器下载
    XLSX.writeFile(workbook, `${filename}.xlsx`)
  }
}

/**
 * Electron环境下导出Excel文件
 * 弹出保存对话框，用户选择保存位置后写入文件
 */
async function exportToElectron(workbook: XLSX.WorkBook, filename: string): Promise<void> {
  try {
    // 生成Excel文件的ArrayBuffer
    const excelBuffer = XLSX.write(workbook, {
      bookType: 'xlsx',
      type: 'array'
    })

    // 调用Electron主进程的保存API
    const result = await window.electronAPI!.saveExcelFile({
      filename: `${filename}.xlsx`,
      data: excelBuffer
    })

    if (result.canceled) {
      // 用户取消保存
      return
    }

    if (result.success) {
      ElMessage.success(`导出成功：${result.filePath}`)
      // 可选：打开文件所在目录
      // window.electronAPI?.openFileInFolder(result.filePath)
    } else {
      ElMessage.error(`导出失败：${result.error || '未知错误'}`)
    }
  } catch (error) {
    console.error('Electron导出Excel失败:', error)
    const msg = error instanceof Error ? error.message : String(error)
    ElMessage.error(`导出失败：${msg || '未知错误'}`)
  }
}

/**
 * 导出BOM明细行为Excel
 */
export function exportBomLines(
  lines: { materialCatalogNo?: string; chineseDescription: string; englishDescription?: string; assemblyUnit?: string; quantity: number; reserved1?: string; reserved2?: string; remarks?: string }[],
  filename: string
): void {
  const data = lines.map((line, idx) => ({
    序号: idx + 1,
    图号: line.materialCatalogNo || '',
    中文描述: line.chineseDescription,
    英文描述: line.englishDescription || '',
    装配单位: line.assemblyUnit || '',
    数量: line.quantity,
    预留1: line.reserved1 || '',
    预留2: line.reserved2 || '',
    备注: line.remarks || ''
  }))
  exportToExcel(data, filename, 'BOM明细')
}
