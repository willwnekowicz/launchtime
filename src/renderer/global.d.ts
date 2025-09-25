interface LaunchTimeAPI {
  launchd: {
    list: () => Promise<any[]>
    create: (task: any) => Promise<any>
    update: (taskId: string, updates: any) => Promise<any>
    delete: (taskId: string) => Promise<any>
    toggle: (taskId: string, enabled: boolean) => Promise<any>
  }
  preferences: {
    get: () => Promise<any>
    set: (key: string, value: any) => Promise<any>
  }
  dialog: {
    selectFile: () => Promise<string | null>
  }
  on: (channel: string, callback: (...args: any[]) => void) => void
  off: (channel: string, callback: (...args: any[]) => void) => void
}

declare global {
  interface Window {
    launchtime: LaunchTimeAPI
  }
}

export {}