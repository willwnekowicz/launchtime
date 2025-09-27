export interface ClaudeTask {
  id: string
  label: string
  enabled: boolean
  commandType: 'prompt' | 'existing'
  prompt: string
  existingCommand?: string
  workingDirectory?: string
  sessionId?: string
  sessionOptions?: 'new' | 'reuse' | 'fork'
  initialSessionId?: string
  useExistingSession: boolean
  flags: {
    print: boolean
    dangerouslySkipPermissions?: boolean
    permissionMode?: 'acceptEdits' | 'bypassPermissions' | 'default' | 'plan'
    outputFormat?: 'text' | 'json' | 'stream-json'
    model?: 'sonnet' | 'opus' | 'haiku' | string
    fallbackModel?: string
    allowedTools?: string[]
    disallowedTools?: string[]
    addDir?: string[]
    verbose?: boolean
    debug?: boolean | string
  }
  schedule: {
    type: 'manual' | 'interval' | 'calendar' | 'startup' | 'file-watch'
    interval?: { seconds?: number; minutes?: number; hours?: number }
    calendar?: { minute?: number; hour?: number; weekday?: number; day?: number; month?: number }
    watchPaths?: string[]
  }
  environment?: Record<string, string>
  logPath?: string
  errorLogPath?: string
  notifications?: 'start' | 'end' | 'both' | 'none'
  runHistory?: Array<{
    id: string
    startTime: Date
    endTime?: Date
    exitCode?: number
    sessionId?: string
    logFile?: string
    tokenUsage?: {
      inputTokens?: number
      outputTokens?: number
      cacheCreationInputTokens?: number
      cacheReadInputTokens?: number
    }
  }>
}