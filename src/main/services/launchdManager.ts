import { exec } from 'child_process'
import { promises as fs } from 'fs'
import { join } from 'path'
import { homedir } from 'os'
import { promisify } from 'util'
import { v4 as uuidv4 } from 'uuid'
import { PlistBuilder } from './plistBuilder'
import type { LaunchdTask, Schedule } from '../../shared/types'

const execAsync = promisify(exec)

export class LaunchdManager {
  private launchAgentsDir: string

  constructor() {
    this.launchAgentsDir = join(homedir(), 'Library', 'LaunchAgents')
  }

  async getAllTasks(): Promise<LaunchdTask[]> {
    try {
      await fs.access(this.launchAgentsDir)
    } catch {
      await fs.mkdir(this.launchAgentsDir, { recursive: true })
      return []
    }

    const files = await fs.readdir(this.launchAgentsDir)
    const launchtimeTasks: LaunchdTask[] = []

    for (const file of files) {
      if (file.startsWith('com.runclauderun.') && file.endsWith('.plist')) {
        const filePath = join(this.launchAgentsDir, file)
        const content = await fs.readFile(filePath, 'utf-8')

        const task = this.parsePlistToTask(file, content)
        if (task) {
          task.enabled = await this.isTaskLoaded(file.replace('.plist', ''))
          launchtimeTasks.push(task)
        }
      }
    }

    return launchtimeTasks
  }

  async createTask(task: Omit<LaunchdTask, 'id' | 'enabled'>): Promise<LaunchdTask> {
    const taskId = `com.runclauderun.${uuidv4()}`
    const plistPath = join(this.launchAgentsDir, `${taskId}.plist`)

    const plistBuilder = new PlistBuilder()
    const plistContent = plistBuilder.build({
      ...task,
      id: taskId
    })

    await fs.writeFile(plistPath, plistContent, 'utf-8')

    if (task.schedule.enabled) {
      await this.loadTask(taskId)
    }

    return {
      ...task,
      id: taskId,
      enabled: task.schedule.enabled
    }
  }

  async updateTask(taskId: string, updates: Partial<LaunchdTask>): Promise<LaunchdTask> {
    const tasks = await this.getAllTasks()
    const existingTask = tasks.find(t => t.id === taskId)

    if (!existingTask) {
      throw new Error('Task not found')
    }

    const wasLoaded = await this.isTaskLoaded(taskId)
    if (wasLoaded) {
      await this.unloadTask(taskId)
    }

    const updatedTask = { ...existingTask, ...updates }
    const plistPath = join(this.launchAgentsDir, `${taskId}.plist`)

    const plistBuilder = new PlistBuilder()
    const plistContent = plistBuilder.build(updatedTask)

    await fs.writeFile(plistPath, plistContent, 'utf-8')

    if (updatedTask.schedule.enabled) {
      await this.loadTask(taskId)
    }

    return updatedTask
  }

  async deleteTask(taskId: string): Promise<void> {
    const isLoaded = await this.isTaskLoaded(taskId)
    if (isLoaded) {
      await this.unloadTask(taskId)
    }

    const plistPath = join(this.launchAgentsDir, `${taskId}.plist`)
    await fs.unlink(plistPath)
  }

  async toggleTask(taskId: string, enabled: boolean): Promise<LaunchdTask> {
    const tasks = await this.getAllTasks()
    const task = tasks.find(t => t.id === taskId)

    if (!task) {
      throw new Error('Task not found')
    }

    if (enabled) {
      await this.loadTask(taskId)
    } else {
      await this.unloadTask(taskId)
    }

    task.enabled = enabled
    task.schedule.enabled = enabled

    return await this.updateTask(taskId, task)
  }

  async enableStartOnLaunch(): Promise<void> {
    const loginItemPlist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.launchtime.app</string>
    <key>ProgramArguments</key>
    <array>
        <string>/Applications/LaunchTime.app/Contents/MacOS/LaunchTime</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <false/>
</dict>
</plist>`

    const plistPath = join(this.launchAgentsDir, 'com.launchtime.app.plist')
    await fs.writeFile(plistPath, loginItemPlist, 'utf-8')
    await this.loadTask('com.launchtime.app')
  }

  async disableStartOnLaunch(): Promise<void> {
    const isLoaded = await this.isTaskLoaded('com.launchtime.app')
    if (isLoaded) {
      await this.unloadTask('com.launchtime.app')
    }

    const plistPath = join(this.launchAgentsDir, 'com.launchtime.app.plist')
    try {
      await fs.unlink(plistPath)
    } catch {}
  }

  private async isTaskLoaded(taskId: string): Promise<boolean> {
    try {
      const { stdout } = await execAsync(`launchctl list | grep ${taskId}`)
      return stdout.trim().length > 0
    } catch {
      return false
    }
  }

  private async loadTask(taskId: string): Promise<void> {
    const plistPath = join(this.launchAgentsDir, `${taskId}.plist`)
    await execAsync(`launchctl load "${plistPath}"`)
  }

  private async unloadTask(taskId: string): Promise<void> {
    const plistPath = join(this.launchAgentsDir, `${taskId}.plist`)
    await execAsync(`launchctl unload "${plistPath}"`)
  }

  private parsePlistToTask(filename: string, content: string): LaunchdTask | null {
    try {
      const labelMatch = content.match(/<key>Label<\/key>\s*<string>(.*?)<\/string>/)
      const commandMatch = content.match(/<key>ProgramArguments<\/key>\s*<array>([\s\S]*?)<\/array>/)

      if (!labelMatch || !commandMatch) return null

      const taskId = labelMatch[1]
      if (!taskId.startsWith('com.launchtime.')) return null

      const commandArgs = commandMatch[1].match(/<string>(.*?)<\/string>/g)
        ?.map(s => s.replace(/<\/?string>/g, '')) || []

      const schedule = this.parseScheduleFromPlist(content)

      const task: LaunchdTask = {
        id: taskId,
        label: content.match(/<key>UserLabel<\/key>\s*<string>(.*?)<\/string>/)?.[1] || 'Unnamed Task',
        command: commandArgs.join(' '),
        schedule,
        enabled: false,
        workingDirectory: content.match(/<key>WorkingDirectory<\/key>\s*<string>(.*?)<\/string>/)?.[1],
        environmentVariables: this.parseEnvVarsFromPlist(content),
        standardOutPath: content.match(/<key>StandardOutPath<\/key>\s*<string>(.*?)<\/string>/)?.[1],
        standardErrorPath: content.match(/<key>StandardErrorPath<\/key>\s*<string>(.*?)<\/string>/)?.[1]
      }

      return task
    } catch (error) {
      console.error('Error parsing plist:', error)
      return null
    }
  }

  private parseScheduleFromPlist(content: string): Schedule {
    const schedule: Schedule = {
      type: 'manual',
      enabled: true
    }

    if (content.includes('<key>StartInterval</key>')) {
      const intervalMatch = content.match(/<key>StartInterval<\/key>\s*<integer>(\d+)<\/integer>/)
      if (intervalMatch) {
        schedule.type = 'interval'
        schedule.interval = parseInt(intervalMatch[1])
      }
    } else if (content.includes('<key>StartCalendarInterval</key>')) {
      schedule.type = 'calendar'
      const calendarMatch = content.match(/<key>StartCalendarInterval<\/key>\s*<dict>([\s\S]*?)<\/dict>/)
      if (calendarMatch) {
        const calendarContent = calendarMatch[1]
        schedule.calendar = {
          minute: this.parseIntFromPlist(calendarContent, 'Minute'),
          hour: this.parseIntFromPlist(calendarContent, 'Hour'),
          day: this.parseIntFromPlist(calendarContent, 'Day'),
          weekday: this.parseIntFromPlist(calendarContent, 'Weekday'),
          month: this.parseIntFromPlist(calendarContent, 'Month')
        }
      }
    } else if (content.includes('<key>WatchPaths</key>')) {
      schedule.type = 'watchPath'
      const pathsMatch = content.match(/<key>WatchPaths<\/key>\s*<array>([\s\S]*?)<\/array>/)
      if (pathsMatch) {
        schedule.watchPaths = pathsMatch[1].match(/<string>(.*?)<\/string>/g)
          ?.map(s => s.replace(/<\/?string>/g, '')) || []
      }
    } else if (content.includes('<key>RunAtLoad</key>')) {
      schedule.type = 'startup'
    }

    return schedule
  }

  private parseIntFromPlist(content: string, key: string): number | undefined {
    const match = content.match(new RegExp(`<key>${key}<\/key>\\s*<integer>(\\d+)<\/integer>`))
    return match ? parseInt(match[1]) : undefined
  }

  private parseEnvVarsFromPlist(content: string): Record<string, string> | undefined {
    const envMatch = content.match(/<key>EnvironmentVariables<\/key>\s*<dict>([\s\S]*?)<\/dict>/)
    if (!envMatch) return undefined

    const envContent = envMatch[1]
    const vars: Record<string, string> = {}
    const matches = envContent.matchAll(/<key>(.*?)<\/key>\s*<string>(.*?)<\/string>/g)

    for (const match of matches) {
      vars[match[1]] = match[2]
    }

    return Object.keys(vars).length > 0 ? vars : undefined
  }
}