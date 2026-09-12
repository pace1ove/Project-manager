/**
 * Electron API 类型声明
 * 通过preload脚本暴露给渲染进程的API
 */
export interface ElectronAPI {
  // 平台信息
  platform: string
  versions: {
    electron: string
    chrome: string
    node: string
  }

  // 窗口控制
  minimize: () => void
  maximize: () => void
  close: () => void

  // 打开外部链接
  openExternal: (url: string) => void

  // 应用信息
  getAppVersion: () => Promise<string>

  // ==================== 文件保存相关 ====================

  /**
   * 显示保存文件对话框
   */
  showSaveDialog: (options?: {
    defaultPath?: string
    filters?: { name: string; extensions: string[] }[]
  }) => Promise<{
    canceled: boolean
    filePath?: string
  }>

  /**
   * 写入文件
   */
  writeFile: (filePath: string, data: Buffer | string) => Promise<{
    success: boolean
    filePath?: string
    error?: string
  }>

  /**
   * 保存Excel文件（组合对话框和写入）
   */
  saveExcelFile: (options: {
    filename: string
    data: ArrayBuffer | Uint8Array
  }) => Promise<{
    success: boolean
    canceled: boolean
    filePath?: string
    error?: string
  }>

  /**
   * 打开文件所在目录
   */
  openFileInFolder: (filePath: string) => Promise<{
    success: boolean
    error?: string
  }>

  /**
   * 获取用户文档目录路径
   */
  getDocumentsPath: () => Promise<string>

  // ==================== 数据存储路径相关 ====================

  /**
   * 获取当前数据存储路径
   */
  getDataPath: () => Promise<{
    currentPath: string
    defaultPath: string
    isDefault: boolean
  }>

  /**
   * 选择新的数据存储路径（打开文件夹选择对话框）
   */
  selectDataPath: () => Promise<{
    success: boolean
    canceled: boolean
    path?: string
  }>

  /**
   * 保存数据存储路径配置
   */
  saveDataPath: (newPath: string) => Promise<{
    success: boolean
    newPath?: string
    message?: string
    error?: string
  }>

  /**
   * 恢复默认数据存储路径
   */
  resetDataPath: () => Promise<{
    success: boolean
    defaultPath?: string
    message?: string
    error?: string
  }>

  /**
   * 迁移数据到新路径
   */
  migrateData: (targetPath: string) => Promise<{
    success: boolean
    sourcePath?: string
    targetPath?: string
    copiedCount?: number
    message?: string
    error?: string
  }>

  /**
   * 打开数据存储目录
   */
  openDataFolder: () => Promise<{
    success: boolean
    path?: string
    error?: string
  }>

  /**
   * 重启应用
   */
  restartApp: () => Promise<void>
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI
  }
}

export {}
