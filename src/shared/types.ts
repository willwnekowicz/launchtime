export interface LaunchdTask {
  id: string
  label: string
  command: string
  schedule: Schedule
  enabled: boolean
  workingDirectory?: string
  environmentVariables?: Record<string, string>
  standardOutPath?: string
  standardErrorPath?: string
  createdAt?: Date
  lastRunAt?: Date
  nextRunAt?: Date
}

export interface Schedule {
  type: 'interval' | 'calendar' | 'startup' | 'watchPath' | 'manual'
  enabled: boolean
  interval?: number
  calendar?: CalendarInterval
  watchPaths?: string[]
}

export interface CalendarInterval {
  minute?: number
  hour?: number
  day?: number
  weekday?: number
  month?: number
}

export interface Preferences {
  startOnLaunch: boolean
  theme?: 'light' | 'dark' | 'auto'
  showInMenuBar?: boolean
  notifications?: boolean
}