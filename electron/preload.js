const { contextBridge, ipcRenderer } = require('electron')

// 暴露安全的API给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 平台信息
  platform: process.platform,
  versions: {
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node
  },

  // 窗口控制
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),

  // 打开外部链接
  openExternal: (url) => ipcRenderer.send('open-external', url),

  // 应用信息
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),

  // ==================== 文件保存相关 ====================

  /**
   * 显示保存文件对话框
   * @param {Object} options - 保存选项
   * @returns {Promise<Object>} - 返回保存路径和取消状态
   */
  showSaveDialog: (options) => ipcRenderer.invoke('save-file-dialog', options),

  /**
   * 写入文件
   * @param {string} filePath - 文件路径
   * @param {Buffer|string} data - 文件数据
   * @returns {Promise<Object>} - 写入结果
   */
  writeFile: (filePath, data) => ipcRenderer.invoke('write-file', filePath, data),

  /**
   * 保存Excel文件（组合对话框和写入）
   * @param {Object} options - 保存选项 { filename, data }
   * @returns {Promise<Object>} - 保存结果
   */
  saveExcelFile: (options) => ipcRenderer.invoke('save-excel-file', options),

  /**
   * 打开文件所在目录
   * @param {string} filePath - 文件路径
   * @returns {Promise<Object>}
   */
  openFileInFolder: (filePath) => ipcRenderer.invoke('open-file-in-folder', filePath),

  /**
   * 获取用户文档目录路径
   * @returns {Promise<string>}
   */
  getDocumentsPath: () => ipcRenderer.invoke('get-documents-path'),

  // ==================== 数据存储路径相关 ====================

  /**
   * 获取当前数据存储路径
   * @returns {Promise<{currentPath: string, defaultPath: string, isDefault: boolean}>}
   */
  getDataPath: () => ipcRenderer.invoke('get-data-path'),

  /**
   * 选择新的数据存储路径（打开文件夹选择对话框）
   * @returns {Promise<{success: boolean, canceled: boolean, path?: string}>}
   */
  selectDataPath: () => ipcRenderer.invoke('select-data-path'),

  /**
   * 保存数据存储路径配置
   * @param {string} newPath - 新的数据存储路径
   * @returns {Promise<{success: boolean, newPath?: string, message?: string, error?: string}>}
   */
  saveDataPath: (newPath) => ipcRenderer.invoke('save-data-path', newPath),

  /**
   * 恢复默认数据存储路径
   * @returns {Promise<{success: boolean, defaultPath?: string, message?: string, error?: string}>}
   */
  resetDataPath: () => ipcRenderer.invoke('reset-data-path'),

  /**
   * 迁移数据到新路径
   * @param {string} targetPath - 目标路径
   * @returns {Promise<{success: boolean, sourcePath?: string, targetPath?: string, copiedCount?: number, message?: string, error?: string}>}
   */
  migrateData: (targetPath) => ipcRenderer.invoke('migrate-data', targetPath),

  /**
   * 打开数据存储目录
   * @returns {Promise<{success: boolean, path?: string, error?: string}>}
   */
  openDataFolder: () => ipcRenderer.invoke('open-data-folder'),

  /**
   * 重启应用
   * @returns {Promise<void>}
   */
  restartApp: () => ipcRenderer.invoke('restart-app')
})
