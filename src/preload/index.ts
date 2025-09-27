import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('runclauderun', {
  claude: {
    checkInstallation: () => ipcRenderer.invoke('claude:check-installation'),
    install: () => ipcRenderer.invoke('claude:install'),
    list: () => ipcRenderer.invoke('claude:list'),
    create: (task: any) => ipcRenderer.invoke('claude:create', task),
    update: (taskId: string, updates: any) => ipcRenderer.invoke('claude:update', taskId, updates),
    delete: (taskId: string) => ipcRenderer.invoke('claude:delete', taskId),
    toggle: (taskId: string, enabled: boolean) => ipcRenderer.invoke('claude:toggle', taskId, enabled),
    run: (taskId: string) => ipcRenderer.invoke('claude:run', taskId),
    getLogs: (taskId: string, runId: string) => ipcRenderer.invoke('claude:get-logs', taskId, runId),
    listSessions: () => ipcRenderer.invoke('claude:list-sessions'),
    listCommands: () => ipcRenderer.invoke('claude:list-commands'),
    isRunActive: (runId: string) => ipcRenderer.invoke('claude:is-run-active', runId),
    getActiveRuns: () => ipcRenderer.invoke('claude:get-active-runs')
  },
  preferences: {
    get: () => ipcRenderer.invoke('preferences:get'),
    set: (key: string, value: any) => ipcRenderer.invoke('preferences:set', key, value)
  },
  dialog: {
    selectFile: () => ipcRenderer.invoke('dialog:select-file'),
    selectDirectory: () => ipcRenderer.invoke('dialog:select-directory')
  },
  system: {
    runAppleScript: (script: string) => ipcRenderer.invoke('system:run-applescript', script),
    openInTerminal: (app: string, workingDir: string, sessionId?: string) => 
      ipcRenderer.invoke('system:open-in-terminal', app, workingDir, sessionId)
  },
  on: (channel: string, callback: (...args: any[]) => void) => {
    const validChannels = [
      'new-task', 'open-preferences', 'focus-task', 'tasks-updated', 'claude-status',
      'run-started', 'log-update', 'run-completed'
    ]
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (_, ...args) => callback(...args))
    }
  },
  off: (channel: string, callback: (...args: any[]) => void) => {
    ipcRenderer.removeListener(channel, callback)
  }
})