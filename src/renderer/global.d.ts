interface RunClaudeRunAPI {
  claude: {
    checkInstallation: () => Promise<{ installed: boolean; version?: string }>
    install: () => Promise<{ success: boolean; error?: string }>
    list: () => Promise<any[]>
    create: (task: any) => Promise<any>
    update: (taskId: string, updates: any) => Promise<any>
    delete: (taskId: string) => Promise<any>
    toggle: (taskId: string, enabled: boolean) => Promise<any>
    run: (taskId: string) => Promise<{ success: boolean; runId?: string; error?: string }>
    getLogs: (taskId: string, runId: string) => Promise<{ success: boolean; data?: { stdout: string; stderr: string }; error?: string }>
    listSessions: () => Promise<{ success: boolean; data?: any[]; error?: string }>
    listCommands: () => Promise<{ success: boolean; data?: string[]; error?: string }>
    isRunActive: (runId: string) => Promise<boolean>
    getActiveRuns: () => Promise<string[]>
  }
  preferences: {
    get: () => Promise<any>
    set: (key: string, value: any) => Promise<any>
  }
  dialog: {
    selectFile: () => Promise<string | null>
    selectDirectory: () => Promise<string | null>
  }
  system?: {
    runAppleScript: (script: string) => Promise<{ success: boolean; data?: string; error?: string }>
    openInTerminal: (app: string, workingDir: string, sessionId?: string) => Promise<{ success: boolean; data?: string; error?: string }>
  }
  on: (channel: string, callback: (...args: any[]) => void) => void
  off: (channel: string, callback: (...args: any[]) => void) => void
}

declare global {
  interface Window {
    runclauderun: RunClaudeRunAPI
  }
}

export {}