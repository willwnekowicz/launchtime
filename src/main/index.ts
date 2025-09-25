import { app, BrowserWindow, ipcMain, Menu, Tray, dialog } from 'electron'
import { join } from 'path'
import { LaunchdManager } from './services/launchdManager'
import { createAppMenu } from './menu'
import { Store } from './store'

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
const launchdManager = new LaunchdManager()
const store = new Store()

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: join(__dirname, '../preload/index.cjs'),
      contextIsolation: true,
      nodeIntegration: false
    },
    icon: join(__dirname, '../../resources/icon.png')
  })

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  createAppMenu()
}

app.whenReady().then(() => {
  createWindow()
  setupTray()
  registerIpcHandlers()

  const startOnLaunch = store.get('startOnLaunch', false)
  if (startOnLaunch) {
    launchdManager.enableStartOnLaunch()
  }

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

function setupTray() {
  tray = new Tray(join(__dirname, '../../resources/tray-icon.png'))

  const updateTrayMenu = async () => {
    const tasks = await launchdManager.getAllTasks()
    const menuItems = tasks.map(task => ({
      label: task.label,
      sublabel: task.enabled ? 'Active' : 'Inactive',
      click: () => {
        if (mainWindow) {
          mainWindow.show()
          mainWindow.webContents.send('focus-task', task.id)
        }
      }
    }))

    const contextMenu = Menu.buildFromTemplate([
      { label: 'LaunchTime', enabled: false },
      { type: 'separator' },
      ...menuItems,
      { type: 'separator' },
      { label: 'Open LaunchTime', click: () => mainWindow?.show() },
      { label: 'Preferences...', click: () => mainWindow?.webContents.send('open-preferences') },
      { type: 'separator' },
      { label: 'Quit', click: () => app.quit() }
    ])

    tray?.setContextMenu(contextMenu)
  }

  tray.setToolTip('LaunchTime - Schedule Commands')
  updateTrayMenu()

  ipcMain.on('tasks-updated', updateTrayMenu)
}

function registerIpcHandlers() {
  ipcMain.handle('launchd:list', async () => {
    return await launchdManager.getAllTasks()
  })

  ipcMain.handle('launchd:create', async (_, task) => {
    try {
      const result = await launchdManager.createTask(task)
      mainWindow?.webContents.send('tasks-updated')
      return { success: true, data: result }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('launchd:update', async (_, taskId, updates) => {
    try {
      const result = await launchdManager.updateTask(taskId, updates)
      mainWindow?.webContents.send('tasks-updated')
      return { success: true, data: result }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('launchd:delete', async (_, taskId) => {
    try {
      await launchdManager.deleteTask(taskId)
      mainWindow?.webContents.send('tasks-updated')
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('launchd:toggle', async (_, taskId, enabled) => {
    try {
      const result = await launchdManager.toggleTask(taskId, enabled)
      mainWindow?.webContents.send('tasks-updated')
      return { success: true, data: result }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('preferences:get', async () => {
    return {
      startOnLaunch: store.get('startOnLaunch', false)
    }
  })

  ipcMain.handle('preferences:set', async (_, key, value) => {
    store.set(key, value)

    if (key === 'startOnLaunch') {
      if (value) {
        await launchdManager.enableStartOnLaunch()
      } else {
        await launchdManager.disableStartOnLaunch()
      }
    }

    return { success: true }
  })

  ipcMain.handle('dialog:select-file', async () => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      properties: ['openFile'],
      filters: [
        { name: 'Executables', extensions: ['sh', 'command', 'app'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    })

    return result.canceled ? null : result.filePaths[0]
  })
}