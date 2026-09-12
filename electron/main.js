const { app, BrowserWindow, Menu, shell, dialog, ipcMain } = require('electron')
const path = require('path')
const fs = require('fs')

// ==================== 数据存储路径配置 ====================

/**
 * 获取应用所在目录（兼容便携版和安装版）
 * 便携版：electron解压到临时目录运行，需用PORTABLE_EXECUTABLE_DIR环境变量获取真实exe目录
 * 安装版：app.getPath('exe')返回安装目录下的exe路径
 */
function getAppDirectory() {
  // 便携版模式下，Electron会设置PORTABLE_EXECUTABLE_DIR环境变量
  if (process.env.PORTABLE_EXECUTABLE_DIR) {
    return process.env.PORTABLE_EXECUTABLE_DIR
  }
  // 安装版或开发环境
  if (app.isPackaged) {
    return path.dirname(app.getPath('exe'))
  }
  return path.join(__dirname, '..')
}

/**
 * 获取配置文件路径（与应用可执行文件同级目录）
 */
function getConfigFilePath() {
  return path.join(getAppDirectory(), 'config.json')
}

/**
 * 获取默认数据存储路径（与运行文件同一目录下的单独文件夹）
 */
function getDefaultDataPath() {
  return path.join(getAppDirectory(), 'BOM管理系统数据')
}

/**
 * 读取配置文件
 */
function readConfig() {
  try {
    const configPath = getConfigFilePath()
    if (fs.existsSync(configPath)) {
      const content = fs.readFileSync(configPath, 'utf-8')
      return JSON.parse(content)
    }
  } catch (error) {
    console.error('读取配置文件失败:', error.message)
  }
  return {}
}

/**
 * 写入配置文件
 */
function writeConfig(config) {
  try {
    const configPath = getConfigFilePath()
    const dir = path.dirname(configPath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8')
    return true
  } catch (error) {
    console.error('写入配置文件失败:', error.message)
    return false
  }
}

/**
 * 在app ready之前设置用户数据目录
 */
const config = readConfig()
let dataPath = config.dataPath || getDefaultDataPath()

// 确保数据目录存在且可写，如果不可写则回退到默认用户目录
function ensureWritableDirectory(targetPath) {
  try {
    if (!fs.existsSync(targetPath)) {
      fs.mkdirSync(targetPath, { recursive: true })
    }
    // 测试是否可写
    const testFile = path.join(targetPath, '.write_test')
    fs.writeFileSync(testFile, 'test')
    fs.unlinkSync(testFile)
    return true
  } catch (error) {
    console.warn('目录不可写，将回退到默认用户目录:', targetPath, error.message)
    return false
  }
}

// 如果自定义路径或默认路径不可写，回退到Electron默认的userData目录
if (!ensureWritableDirectory(dataPath)) {
  // 使用Electron默认的用户数据目录（在用户目录下）
  dataPath = app.getPath('userData')
  console.log('已回退到默认用户数据目录:', dataPath)
}

// 设置用户数据目录（必须在app ready之前调用）
try {
  app.setPath('userData', dataPath)
  console.log('用户数据目录已设置为:', dataPath)
} catch (error) {
  console.error('设置用户数据目录失败，使用默认目录:', error.message)
}

// 单实例锁
const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    const win = BrowserWindow.getAllWindows()[0]
    if (win) {
      if (win.isMinimized()) win.restore()
      win.focus()
    }
  })
}

let mainWindow = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 800,
    title: 'BOM管理系统',
    icon: path.join(__dirname, '../public/icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  })

  // 加载策略：优先加载打包后的dist/index.html，开发环境可设ELECTRON_DEV=1强制用localhost
  const distPath = path.join(__dirname, '../dist/index.html')
  const fs = require('fs')
  const useDevServer = process.env.ELECTRON_DEV === '1' || !fs.existsSync(distPath)

  if (useDevServer) {
    // 尝试连接常见的Vite端口
    const ports = [5173, 5174, 5175, 5176]
    mainWindow.loadURL(`http://localhost:${ports[0]}`)
    // 开发环境打开DevTools
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    mainWindow.loadFile(distPath)
  }

  // 外部链接在浏览器中打开
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// 创建应用菜单
function createMenu() {
  const template = [
    {
      label: '文件',
      submenu: [
        { role: 'reload', label: '重新加载' },
        { role: 'forceReload', label: '强制重新加载' },
        { type: 'separator' },
        { role: 'close', label: '关闭' }
      ]
    },
    {
      label: '编辑',
      submenu: [
        { role: 'undo', label: '撤销' },
        { role: 'redo', label: '重做' },
        { type: 'separator' },
        { role: 'cut', label: '剪切' },
        { role: 'copy', label: '复制' },
        { role: 'paste', label: '粘贴' },
        { role: 'selectAll', label: '全选' }
      ]
    },
    {
      label: '视图',
      submenu: [
        { role: 'resetZoom', label: '重置缩放' },
        { role: 'zoomIn', label: '放大' },
        { role: 'zoomOut', label: '缩小' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: '全屏' },
        { role: 'toggleDevTools', label: '开发者工具' }
      ]
    },
    {
      label: '窗口',
      submenu: [
        { role: 'minimize', label: '最小化' },
        { role: 'zoom', label: '缩放' },
        { role: 'close', label: '关闭窗口' }
      ]
    },
    {
      label: '帮助',
      submenu: [
        {
          label: '关于',
          click: () => {
            const { dialog } = require('electron')
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: '关于',
              message: 'BOM管理系统',
              detail: `版本: ${app.getVersion()}\n设备-模块-项目三层BOM管理系统\n技术栈: Vue3 + TypeScript + Element Plus + IndexedDB`
            })
          }
        }
      ]
    }
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

app.whenReady().then(() => {
  createWindow()
  createMenu()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// ==================== 文件保存IPC ====================

/**
 * 已授权的写入路径集合（模块级）
 * 用户通过 showSaveDialog 确认选择的路径会被加入此集合，
 * 后续 write-file 可写入这些路径及其子目录。
 * @type {Set<string>}
 */
const authorizedWritePaths = new Set()

/**
 * 判断 resolvedPath 是否位于 basePath 之内（含同一路径）
 * Windows 下做大小写不敏感比较
 * @param {string} resolvedPath - 已 path.resolve 规范化的路径
 * @param {string} basePath - 基准目录
 * @returns {boolean}
 */
function isPathWithinBase(resolvedPath, basePath) {
  if (!basePath) return false
  const base = path.resolve(basePath)
  if (resolvedPath === base) return true
  const sep = path.sep
  if (process.platform === 'win32') {
    return resolvedPath.toLowerCase().startsWith((base + sep).toLowerCase())
  }
  return resolvedPath.startsWith(base + sep)
}

/**
 * 校验写入路径是否在允许的范围内
 * 允许：用户对话框授权路径、userData、documents、downloads 及其子目录
 * 禁止：系统目录、应用安装目录、路径穿越(..)
 * @param {string} filePath - 待校验的文件路径
 * @returns {boolean}
 */
function isPathAllowed(filePath) {
  if (!filePath || typeof filePath !== 'string') return false

  // 规范化路径
  const resolved = path.resolve(filePath)

  // 禁止路径穿越
  if (resolved.split(path.sep).includes('..')) return false

  // 禁止系统目录
  const systemRoots = process.platform === 'win32'
    ? ['C:\\Windows', 'C:\\Program Files', 'C:\\Program Files (x86)']
    : ['/boot', '/etc', '/usr']
  for (const sys of systemRoots) {
    if (resolved.toLowerCase().startsWith(sys.toLowerCase())) return false
  }

  // 禁止应用安装目录
  const appDir = getAppDirectory()
  if (isPathWithinBase(resolved, appDir)) return false

  // 允许：应用数据目录 userData 及其子目录
  try {
    if (isPathWithinBase(resolved, app.getPath('userData'))) return true
  } catch (e) { /* ignore */ }

  // 允许：用户文档目录 documents 及其子目录
  try {
    if (isPathWithinBase(resolved, app.getPath('documents'))) return true
  } catch (e) { /* ignore */ }

  // 允许：下载目录 downloads 及其子目录
  try {
    if (isPathWithinBase(resolved, app.getPath('downloads'))) return true
  } catch (e) { /* ignore */ }

  // 允许：用户通过保存对话框授权过的路径及其子目录
  for (const authPath of authorizedWritePaths) {
    if (isPathWithinBase(resolved, authPath)) return true
  }

  return false
}

/**
 * 保存文件对话框
 * @param {Object} options - 保存选项
 * @param {string} options.defaultPath - 默认文件名
 * @param {string} options.filters - 文件过滤器
 * @returns {Promise<Object>} - 返回保存路径和取消状态
 */
ipcMain.handle('save-file-dialog', async (event, options = {}) => {
  const { defaultPath = 'export.xlsx', filters } = options
  const result = await dialog.showSaveDialog(mainWindow, {
    title: '保存文件',
    defaultPath: defaultPath,
    filters: filters || [
      { name: 'Excel文件', extensions: ['xlsx'] },
      { name: '所有文件', extensions: ['*'] }
    ]
  })
  // 用户确认选择后，将该路径加入已授权写入白名单
  if (!result.canceled && result.filePath) {
    authorizedWritePaths.add(result.filePath)
  }
  return result
})

/**
 * 写入文件
 * @param {string} filePath - 文件路径
 * @param {Buffer|string} data - 文件数据
 * @returns {Promise<boolean>} - 是否成功
 */
ipcMain.handle('write-file', async (event, filePath, data) => {
  try {
    // 路径白名单校验
    if (!isPathAllowed(filePath)) {
      return { success: false, error: '路径不在允许的写入范围内' }
    }
    // 确保目录存在
    const dir = path.dirname(filePath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    fs.writeFileSync(filePath, data)
    return { success: true, filePath }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

/**
 * 保存Excel文件（组合对话框和写入）
 * @param {Object} options - 保存选项
 * @param {string} options.filename - 默认文件名
 * @param {ArrayBuffer} options.data - Excel文件数据
 * @returns {Promise<Object>} - 保存结果
 */
ipcMain.handle('save-excel-file', async (event, options = {}) => {
  const { filename = 'export.xlsx', data } = options
  try {
    // 显示保存对话框
    const dialogResult = await dialog.showSaveDialog(mainWindow, {
      title: '导出Excel',
      defaultPath: filename,
      filters: [
        { name: 'Excel文件', extensions: ['xlsx'] },
        { name: '所有文件', extensions: ['*'] }
      ]
    })

    if (dialogResult.canceled || !dialogResult.filePath) {
      return { success: false, canceled: true }
    }

    // 确保文件扩展名正确
    let filePath = dialogResult.filePath
    if (!filePath.toLowerCase().endsWith('.xlsx')) {
      filePath += '.xlsx'
    }

    // 用户确认选择后，将该路径加入已授权写入白名单
    authorizedWritePaths.add(filePath)

    // 写入文件
    fs.writeFileSync(filePath, Buffer.from(data))

    return { success: true, filePath, canceled: false }
  } catch (error) {
    return { success: false, error: error.message, canceled: false }
  }
})

/**
 * 打开文件所在目录
 * @param {string} filePath - 文件路径
 */
ipcMain.handle('open-file-in-folder', async (event, filePath) => {
  try {
    shell.showItemInFolder(filePath)
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

/**
 * 获取用户文档目录路径
 */
ipcMain.handle('get-documents-path', async () => {
  return app.getPath('documents')
})

// ==================== 数据存储路径IPC ====================

/**
 * 获取当前数据存储路径
 */
ipcMain.handle('get-data-path', async () => {
  return {
    currentPath: app.getPath('userData'),
    defaultPath: getDefaultDataPath(),
    isDefault: app.getPath('userData') === getDefaultDataPath()
  }
})

/**
 * 选择新的数据存储路径（打开文件夹选择对话框）
 */
ipcMain.handle('select-data-path', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: '选择数据存储目录',
    properties: ['openDirectory', 'createDirectory'],
    buttonLabel: '选择此目录'
  })

  if (result.canceled || result.filePaths.length === 0) {
    return { success: false, canceled: true }
  }

  const selectedPath = result.filePaths[0]
  return { success: true, canceled: false, path: selectedPath }
})

/**
 * 保存数据存储路径配置
 * @param {string} newPath - 新的数据存储路径
 */
ipcMain.handle('save-data-path', async (event, newPath) => {
  try {
    if (!newPath || typeof newPath !== 'string') {
      return { success: false, error: '路径不能为空' }
    }

    // 确保目录存在
    if (!fs.existsSync(newPath)) {
      fs.mkdirSync(newPath, { recursive: true })
    }

    // 读取当前配置并更新
    const currentConfig = readConfig()
    currentConfig.dataPath = newPath
    const saved = writeConfig(currentConfig)

    if (!saved) {
      return { success: false, error: '保存配置文件失败' }
    }

    return {
      success: true,
      newPath: newPath,
      message: '数据存储路径已保存，重启应用后生效'
    }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

/**
 * 恢复默认数据存储路径
 */
ipcMain.handle('reset-data-path', async () => {
  try {
    const defaultPath = getDefaultDataPath()

    // 确保默认目录存在
    if (!fs.existsSync(defaultPath)) {
      fs.mkdirSync(defaultPath, { recursive: true })
    }

    // 读取当前配置并删除dataPath字段
    const currentConfig = readConfig()
    delete currentConfig.dataPath
    const saved = writeConfig(currentConfig)

    if (!saved) {
      return { success: false, error: '保存配置文件失败' }
    }

    return {
      success: true,
      defaultPath: defaultPath,
      message: '已恢复默认数据存储路径，重启应用后生效'
    }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

/**
 * 迁移数据到新路径
 * @param {string} targetPath - 目标路径
 */
ipcMain.handle('migrate-data', async (event, targetPath) => {
  try {
    const sourcePath = app.getPath('userData')

    if (!targetPath || typeof targetPath !== 'string') {
      return { success: false, error: '目标路径不能为空' }
    }

    if (sourcePath === targetPath) {
      return { success: false, error: '目标路径与当前路径相同' }
    }

    // 确保目标目录存在
    if (!fs.existsSync(targetPath)) {
      fs.mkdirSync(targetPath, { recursive: true })
    }

    // 复制所有文件和子目录
    const items = fs.readdirSync(sourcePath, { withFileTypes: true })
    let copiedCount = 0

    for (const item of items) {
      const sourceItem = path.join(sourcePath, item.name)
      const targetItem = path.join(targetPath, item.name)

      // 跳过锁定的文件（如SingletonCookie、SingletonLock等）
      if (item.name.startsWith('Singleton')) {
        continue
      }

      try {
        if (item.isDirectory()) {
          // 递归复制目录
          copyDirectory(sourceItem, targetItem)
        } else {
          // 复制文件
          fs.copyFileSync(sourceItem, targetItem)
        }
        copiedCount++
      } catch (copyError) {
        console.error(`复制 ${item.name} 失败:`, copyError.message)
        // 继续复制其他文件
      }
    }

    return {
      success: true,
      sourcePath: sourcePath,
      targetPath: targetPath,
      copiedCount: copiedCount,
      message: `已迁移 ${copiedCount} 个文件/目录到新路径`
    }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

/**
 * 递归复制目录
 */
function copyDirectory(source, target) {
  if (!fs.existsSync(target)) {
    fs.mkdirSync(target, { recursive: true })
  }

  const items = fs.readdirSync(source, { withFileTypes: true })
  for (const item of items) {
    const sourceItem = path.join(source, item.name)
    const targetItem = path.join(target, item.name)

    if (item.isDirectory()) {
      copyDirectory(sourceItem, targetItem)
    } else {
      fs.copyFileSync(sourceItem, targetItem)
    }
  }
}

/**
 * 打开数据存储目录
 */
ipcMain.handle('open-data-folder', async () => {
  try {
    const dataPath = app.getPath('userData')
    shell.openPath(dataPath)
    return { success: true, path: dataPath }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

/**
 * 重启应用
 */
ipcMain.handle('restart-app', async () => {
  app.relaunch()
  app.exit(0)
})
