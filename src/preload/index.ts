import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('launchtime', {
  launchd: {
    list: () => ipcRenderer.invoke('launchd:list'),
    create: (task: any) => ipcRenderer.invoke('launchd:create', task),
    update: (taskId: string, updates: any) => ipcRenderer.invoke('launchd:update', taskId, updates),
    delete: (taskId: string) => ipcRenderer.invoke('launchd:delete', taskId),
    toggle: (taskId: string, enabled: boolean) => ipcRenderer.invoke('launchd:toggle', taskId, enabled)
  },
  preferences: {
    get: () => ipcRenderer.invoke('preferences:get'),
    set: (key: string, value: any) => ipcRenderer.invoke('preferences:set', key, value)
  },
  dialog: {
    selectFile: () => ipcRenderer.invoke('dialog:select-file')
  },
  on: (channel: string, callback: (...args: any[]) => void) => {
    const validChannels = ['new-task', 'open-preferences', 'focus-task', 'tasks-updated']
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (_, ...args) => callback(...args))
    }
  },
  off: (channel: string, callback: (...args: any[]) => void) => {
    ipcRenderer.removeListener(channel, callback)
  }
})