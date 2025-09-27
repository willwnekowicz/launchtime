import { app, BrowserWindow, ipcMain, Menu, Tray, dialog } from 'electron'
import { join } from 'path'
import { homedir } from 'os'
import { exec } from 'child_process'
import { ClaudeManager } from './services/claudeManager'
import { createAppMenu } from './menu'
import { Store } from './store'

// Terminal/IDE script generation
async function getTerminalScript(app: string, workingDir: string, sessionId?: string) {
  const resumeCmd = sessionId ? `claude --resume ${sessionId}` : ''
  
  switch (app) {
    case 'iTerm':
      return {
        type: 'applescript',
        content: `
          tell application "iTerm"
            create window with default profile
            tell current session of current window
              write text "cd \\"${workingDir}\\""
              ${resumeCmd ? `write text "${resumeCmd}"` : ''}
            end tell
          end tell
        `
      }
    
    case 'Terminal':
      return {
        type: 'applescript',
        content: `
          tell application "Terminal"
            do script "cd \\"${workingDir}\\"${resumeCmd ? ` && ${resumeCmd}` : ''}"
            activate
          end tell
        `
      }
    
    case 'Warp':
      return {
        type: 'applescript',
        content: `
          tell application "Warp"
            activate
            tell application "System Events"
              keystroke "t" using command down
              delay 0.5
              keystroke "cd \\"${workingDir}\\""
              key code 36
              ${resumeCmd ? `
                keystroke "${resumeCmd}"
                key code 36
              ` : ''}
            end tell
          end tell
        `
      }
    
    case 'Cursor':
      return {
        type: 'shell',
        content: `open -a "Cursor" "${workingDir}"`
      }
    
    case 'VSCode':
      return {
        type: 'shell',
        content: `code "${workingDir}"`
      }
    
    case 'Zed':
      return {
        type: 'shell',
        content: `open -a "Zed" "${workingDir}"`
      }
    
    case 'Windsurf':
      return {
        type: 'shell',
        content: `open -a "Windsurf" "${workingDir}"`
      }
    
    case 'PyCharm':
      return {
        type: 'shell',
        content: `open -a "PyCharm" "${workingDir}"`
      }
    
    case 'WebStorm':
      return {
        type: 'shell',
        content: `open -a "WebStorm" "${workingDir}"`
      }
    
    case 'Xcode':
      return {
        type: 'shell',
        content: `open -a "Xcode" "${workingDir}"`
      }
    
    default:
      throw new Error(`Unsupported terminal/IDE: ${app}`)
  }
}

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
const claudeManager = new ClaudeManager()
const store = new Store()

// Set up event relays from ClaudeManager to renderer
claudeManager.on('run-started', (data) => {
  mainWindow?.webContents.send('run-started', data)
})

claudeManager.on('log-update', (data) => {
  mainWindow?.webContents.send('log-update', data)
})

claudeManager.on('run-completed', (data) => {
  mainWindow?.webContents.send('run-completed', data)
})

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'runCLAUDErun',
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#1a1a1a',
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

app.whenReady().then(async () => {
  createWindow()
  setupTray()
  registerIpcHandlers()

  // Check Claude installation on startup
  const claudeStatus = await claudeManager.checkClaudeInstallation()
  if (mainWindow) {
    mainWindow.webContents.on('did-finish-load', () => {
      mainWindow?.webContents.send('claude-status', claudeStatus)
    })
  }

  const startOnLaunch = store.get('startOnLaunch', false)
  if (startOnLaunch) {
    // TODO: Implement auto-start for runCLAUDErun
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('before-quit', async (event) => {
  console.log('App is quitting, cleaning up...')
  event.preventDefault()
  
  try {
    await claudeManager.cleanup()
  } catch (error) {
    console.error('Error during cleanup:', error)
  }
  
  app.exit(0)
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

function setupTray() {
  tray = new Tray(join(__dirname, '../../resources/tray-icon.png'))

  const updateTrayMenu = async () => {
    const tasks = await claudeManager.getAllTasks()
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
      { label: 'runCLAUDErun', enabled: false },
      { type: 'separator' },
      ...menuItems,
      { type: 'separator' },
      { label: 'Open runCLAUDErun', click: () => mainWindow?.show() },
      { label: 'Preferences...', click: () => mainWindow?.webContents.send('open-preferences') },
      { type: 'separator' },
      { label: 'Quit', click: () => app.quit() }
    ])

    tray?.setContextMenu(contextMenu)
  }

  tray.setToolTip('runCLAUDErun - Schedule Claude Commands')
  updateTrayMenu()

  ipcMain.on('tasks-updated', updateTrayMenu)
}

function registerIpcHandlers() {
  ipcMain.handle('claude:check-installation', async () => {
    return await claudeManager.checkClaudeInstallation()
  })

  ipcMain.handle('claude:install', async () => {
    return await claudeManager.installClaude()
  })

  ipcMain.handle('claude:list', async () => {
    return await claudeManager.getAllTasks()
  })

  ipcMain.handle('claude:create', async (_, task) => {
    try {
      const result = await claudeManager.createTask(task)
      mainWindow?.webContents.send('tasks-updated')
      return { success: true, data: result }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('claude:update', async (_, taskId, updates) => {
    try {
      const result = await claudeManager.updateTask(taskId, updates)
      mainWindow?.webContents.send('tasks-updated')
      return { success: true, data: result }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('claude:delete', async (_, taskId) => {
    try {
      await claudeManager.deleteTask(taskId)
      mainWindow?.webContents.send('tasks-updated')
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('claude:toggle', async (_, taskId, enabled) => {
    try {
      const result = await claudeManager.toggleTask(taskId, enabled)
      mainWindow?.webContents.send('tasks-updated')
      return { success: true, data: result }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('claude:run', async (_, taskId) => {
    try {
      const result = await claudeManager.runTask(taskId)
      return result
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('claude:get-logs', async (_, taskId, runId) => {
    try {
      const logs = await claudeManager.getRunLogs(taskId, runId)
      return { success: true, data: logs }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('claude:is-run-active', async (_, runId) => {
    return claudeManager.isRunActive(runId)
  })

  ipcMain.handle('claude:get-active-runs', async () => {
    return claudeManager.getActiveRuns()
  })

  ipcMain.handle('preferences:get', async () => {
    return store.getAll()
  })

  ipcMain.handle('preferences:set', async (_, key, value) => {
    store.set(key, value)

    if (key === 'startOnLaunch') {
      // TODO: Implement auto-start for runCLAUDErun
    }

    return { success: true }
  })

  ipcMain.handle('dialog:select-file', async () => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      properties: ['openFile'],
      filters: [
        { name: 'All Files', extensions: ['*'] }
      ]
    })

    return result.canceled ? null : result.filePaths[0]
  })

  ipcMain.handle('dialog:select-directory', async () => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      properties: ['openDirectory', 'createDirectory'],
      buttonLabel: 'Select Folder'
    })

    return result.canceled ? null : result.filePaths[0]
  })

  ipcMain.handle('claude:list-sessions', async () => {
    try {
      const sessions = await claudeManager.listClaudeSessions()
      return { success: true, data: sessions }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('claude:list-commands', async () => {
    try {
      const commands = await claudeManager.listClaudeCommands()
      return { success: true, data: commands }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('system:run-applescript', async (_, script) => {
    return new Promise((resolve) => {
      exec(`osascript -e '${script.replace(/'/g, "'\\''")}' `, (error, stdout) => {
        if (error) {
          resolve({ success: false, error: error.message })
        } else {
          resolve({ success: true, data: stdout })
        }
      })
    })
  })

  ipcMain.handle('system:open-in-terminal', async (_, app, workingDir, sessionId) => {
    try {
      // Expand ~ to home directory
      if (workingDir.startsWith('~')) {
        workingDir = workingDir.replace('~', homedir())
      }
      const script = await getTerminalScript(app, workingDir, sessionId)
      if (script.type === 'applescript') {
        return new Promise((resolve) => {
          exec(`osascript -e '${script.content.replace(/'/g, "'\\''")}' `, (error, stdout) => {
            if (error) {
              resolve({ success: false, error: error.message })
            } else {
              resolve({ success: true, data: stdout })
            }
          })
        })
      } else {
        // For shell commands
        return new Promise((resolve) => {
          exec(script.content, (error) => {
            if (error) {
              resolve({ success: false, error: error.message })
            } else {
              resolve({ success: true })
            }
          })
        })
      }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })
}