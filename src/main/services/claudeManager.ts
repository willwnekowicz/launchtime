import { exec, spawn } from 'child_process'
import type { ChildProcess } from 'child_process'
import { promisify } from 'util'
import { join } from 'path'
import { homedir } from 'os'
import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync } from 'fs'
import { v4 as uuidv4 } from 'uuid'
import { EventEmitter } from 'events'
import { Notification } from 'electron'

const execAsync = promisify(exec)

export interface ClaudeTask {
  id: string
  label: string
  enabled: boolean
  commandType?: 'prompt' | 'existing'
  prompt: string
  existingCommand?: string
  workingDirectory?: string
  sessionId?: string
  useExistingSession: boolean
  sessionOptions?: 'new' | 'reuse' | 'fork'
  initialSessionId?: string
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

export class ClaudeManager extends EventEmitter {
  private runclauderunDir: string
  private logsDir: string
  private metadataFile: string
  private tasks: Map<string, ClaudeTask> = new Map()
  private claudePath: string | null = null
  private nodePath: string | null = null
  private runningProcesses: Map<string, ChildProcess> = new Map()
  private executablesPromise: Promise<void> | null = null

  constructor() {
    super()
    this.runclauderunDir = join(homedir(), '.runclauderun')
    this.logsDir = join(this.runclauderunDir, 'logs')
    this.metadataFile = join(this.runclauderunDir, 'tasks.json')
    
    this.ensureDirectories()
    this.loadTasks()
    // Don't call findExecutables here - it will be called when needed
  }

  private ensureDirectories() {
    if (!existsSync(this.runclauderunDir)) {
      mkdirSync(this.runclauderunDir, { recursive: true })
    }
    if (!existsSync(this.logsDir)) {
      mkdirSync(this.logsDir, { recursive: true })
    }
  }

  private loadTasks() {
    if (existsSync(this.metadataFile)) {
      try {
        const data = JSON.parse(readFileSync(this.metadataFile, 'utf-8'))
        for (const task of data) {
          this.tasks.set(task.id, task)
        }
      } catch (error) {
        console.error('Failed to load tasks:', error)
      }
    }
  }

  private saveTasks() {
    const tasks = Array.from(this.tasks.values())
    writeFileSync(this.metadataFile, JSON.stringify(tasks, null, 2))
  }

  private async findExecutablesInternal() {
    // Set up enhanced PATH with common installation locations
    const commonPaths = [
      '/opt/homebrew/bin',
      '/usr/local/bin',
      '/usr/bin',
      join(homedir(), '.npm-packages/bin'),
      join(homedir(), '.npm/bin'),
      join(homedir(), '.bun/bin')
    ]
    const enhancedPath = commonPaths.join(':') + ':' + (process.env.PATH || '')
    
    try {
      // Find claude path with enhanced PATH (with timeout)
      const { stdout: claudeWhich } = await execAsync('which claude', { 
        env: { ...process.env, PATH: enhancedPath },
        timeout: 5000 // 5 second timeout
      })
      if (claudeWhich) {
        // Get the real path (resolve symlinks)
        const { stdout: realPath } = await execAsync(`realpath ${claudeWhich.trim()}`, {
          timeout: 5000 // 5 second timeout
        })
        this.claudePath = realPath.trim()
        console.log('Found claude at:', this.claudePath)
      }
    } catch (error) {
      console.log('which claude failed, trying known locations...')
      // Try common Claude installation locations
      const possiblePaths = [
        join(homedir(), '.bun/bin/claude'),
        join(homedir(), '.npm-packages/bin/claude'),
        join(homedir(), '.npm/bin/claude'),
        join(homedir(), 'node_modules/@anthropic-ai/claude-code/cli.js'),
        '/opt/homebrew/bin/claude',
        '/usr/local/bin/claude'
      ]
      for (const path of possiblePaths) {
        if (existsSync(path)) {
          // Resolve the actual path if it's a symlink
          try {
            const { stdout: realPath } = await execAsync(`realpath ${path}`, {
              timeout: 5000 // 5 second timeout
            })
            this.claudePath = realPath.trim()
          } catch {
            this.claudePath = path
          }
          console.log('Found claude at known location:', this.claudePath)
          break
        }
      }
    }

    try {
      // Find node path (with timeout)
      const { stdout: nodeWhich } = await execAsync('which node', {
        timeout: 5000 // 5 second timeout
      })
      if (nodeWhich) {
        this.nodePath = nodeWhich.trim()
      }
    } catch {
      // Try common Node locations
      const possibleNodePaths = [
        '/opt/homebrew/bin/node',
        '/usr/local/bin/node',
        '/usr/bin/node'
      ]
      for (const path of possibleNodePaths) {
        if (existsSync(path)) {
          this.nodePath = path
          break
        }
      }
    }
  }

  private async findExecutables(): Promise<void> {
    // Memoize the executable finding process to ensure it only runs once
    if (!this.executablesPromise) {
      this.executablesPromise = this.findExecutablesInternal()
    }
    return this.executablesPromise
  }

  async checkClaudeInstallation(): Promise<{ installed: boolean; version?: string }> {
    // Ensure executables are found (will only run once due to memoization)
    await this.findExecutables()
    
    try {
      if (this.claudePath) {
        // We found claude, check its version
        let stdout: string
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout
        
        try {
          if (this.claudePath.endsWith('.js') && this.nodePath) {
            // It's a Node.js script - use spawn for better control
            stdout = await new Promise((resolve, reject) => {
              const child = spawn(this.nodePath!, [this.claudePath!, '--version'], {
                signal: controller.signal,
                timeout: 5000
              })
              
              let output = ''
              child.stdout.on('data', (data) => {
                output += data.toString()
              })
              
              child.on('close', (code) => {
                clearTimeout(timeoutId)
                if (code === 0) {
                  resolve(output)
                } else {
                  reject(new Error(`Process exited with code ${code}`))
                }
              })
              
              child.on('error', (err) => {
                clearTimeout(timeoutId)
                reject(err)
              })
            })
          } else {
            // It's a binary or shell script
            stdout = await new Promise((resolve, reject) => {
              const child = spawn(this.claudePath!, ['--version'], {
                signal: controller.signal,
                timeout: 5000
              })
              
              let output = ''
              child.stdout.on('data', (data) => {
                output += data.toString()
              })
              
              child.on('close', (code) => {
                clearTimeout(timeoutId)
                if (code === 0) {
                  resolve(output)
                } else {
                  reject(new Error(`Process exited with code ${code}`))
                }
              })
              
              child.on('error', (err) => {
                clearTimeout(timeoutId)
                reject(err)
              })
            })
          }
          
          clearTimeout(timeoutId)
          const version = stdout.trim()
          console.log('Claude version:', version)
          return { installed: true, version }
        } catch (versionError: any) {
          clearTimeout(timeoutId)
          // Version check failed, but claude might still be installed
          // Check if the file exists as a fallback
          if (existsSync(this.claudePath)) {
            console.warn('Claude found but version check failed:', versionError.message)
            return { installed: true, version: 'unknown' }
          }
          throw versionError
        }
      } else {
        // No claude found after thorough search
        console.log('Claude not found')
        return { installed: false }
      }
    } catch (error: any) {
      console.error('Error checking Claude installation:', error.message)
      // Check if it's a timeout or SIGINT error
      if (error.code === 'SIGINT' || error.message?.includes('SIGINT')) {
        console.warn('Claude check was interrupted - app may be shutting down')
      }
      return { installed: false }
    }
  }

  async installClaude(): Promise<{ success: boolean; error?: string }> {
    try {
      await execAsync('npm install -g @anthropic/claude-cli')
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  formatClaudeJsonOutput(json: any): string {
    // Format different types of Claude JSON output for better readability
    if (json.type === 'message' || json.content) {
      if (json.role === 'user') {
        return `[USER]: ${json.content || ''}`
      } else if (json.role === 'assistant') {
        return `[ASSISTANT]: ${json.content || ''}`
      } else if (json.content) {
        return json.content
      }
    }
    
    if (json.type === 'tool_use' || json.tool_name) {
      return `[TOOL USE]: ${json.tool_name || json.name} - ${JSON.stringify(json.input || json.arguments || {}, null, 2)}`
    }
    
    if (json.type === 'tool_result') {
      return `[TOOL RESULT]: ${json.output || json.result || ''}`
    }
    
    if (json.type === 'session') {
      return `[SESSION]: ID: ${json.session_id || json.id}`
    }
    
    if (json.type === 'usage' || json.usage) {
      const usage = json.usage || json
      return `[USAGE]: Input: ${usage.input_tokens || 0}, Output: ${usage.output_tokens || 0}, Cache: ${usage.cache_creation_input_tokens || 0}/${usage.cache_read_input_tokens || 0}`
    }
    
    if (json.type === 'error') {
      return `[ERROR]: ${json.message || json.error || ''}`
    }
    
    // Default: return formatted JSON
    return JSON.stringify(json, null, 2)
  }

  buildClaudeCommand(task: ClaudeTask, asArray: boolean = false): string | string[] {
    // If it's an existing command, just return it as-is
    if (task.commandType === 'existing' && task.existingCommand) {
      if (asArray) {
        // Parse the existing command into array format
        return task.existingCommand.split(' ')
      }
      // For shell command, check if we need to use Node.js
      if (this.claudePath && this.claudePath.endsWith('.js') && this.nodePath) {
        return `${this.nodePath} ${this.claudePath} ${task.existingCommand.replace('claude ', '')}`
      } else {
        const claudeCmd = this.claudePath || 'claude'
        return task.existingCommand.replace('claude', claudeCmd)
      }
    }

    // Build a claude run command with flags
    const args: string[] = []
    const flags = task.flags

    // Non-interactive mode by default
    args.push('--print')
    
    // Always use stream-json format with verbose (required for stream-json with --print)
    args.push('--output-format', 'stream-json')
    args.push('--include-partial-messages')
    args.push('--verbose')

    if (flags.dangerouslySkipPermissions) {
      args.push('--dangerously-skip-permissions')
    }

    if (flags.permissionMode) {
      args.push('--permission-mode', flags.permissionMode)
    }

    if (flags.model) {
      args.push('--model', flags.model)
    }

    if (flags.fallbackModel) {
      args.push('--fallback-model', flags.fallbackModel)
    }

    // Note: --verbose is always added above for stream-json output
    // No need to check flags.verbose

    if (flags.debug) {
      args.push('--debug')
      if (typeof flags.debug === 'string') {
        args.push(flags.debug)
      }
    }

    if (flags.allowedTools && flags.allowedTools.length > 0) {
      args.push('--allowed-tools', ...flags.allowedTools)
    }

    if (flags.disallowedTools && flags.disallowedTools.length > 0) {
      args.push('--disallowed-tools', ...flags.disallowedTools)
    }

    if (flags.addDir && flags.addDir.length > 0) {
      args.push('--add-dir', ...flags.addDir)
    }

    // Handle session options
    if (task.sessionOptions === 'reuse' && task.initialSessionId) {
      args.push('--resume', task.initialSessionId)
    } else if (task.sessionOptions === 'fork' && task.initialSessionId) {
      args.push('--fork', task.initialSessionId)
    }
    // 'new' is the default, no flag needed

    if (asArray) {
      // Add the prompt to array args
      args.push(task.prompt)
      return args
    }

    // For shell command, properly quote the prompt
    const quotedPrompt = task.prompt.includes('"') ? `'${task.prompt}'` : `"${task.prompt}"`
    
    // Build the shell command
    if (this.claudePath && this.claudePath.endsWith('.js') && this.nodePath) {
      // Use Node.js to run the Claude JavaScript file
      return `${this.nodePath} ${this.claudePath} ${args.join(' ')} ${quotedPrompt} 2>&1`
    } else {
      // Use Claude directly or fallback to 'claude' command
      const claudeCmd = this.claudePath || 'claude'
      return `${claudeCmd} ${args.join(' ')} ${quotedPrompt} 2>&1`
    }
  }

  async createTask(task: Omit<ClaudeTask, 'id' | 'runHistory'>): Promise<ClaudeTask> {
    const newTask: ClaudeTask = {
      ...task,
      id: uuidv4(),
      runHistory: []
    }

    // Set default log paths
    if (!newTask.logPath) {
      newTask.logPath = join(this.logsDir, `${newTask.id}.log`)
    }
    if (!newTask.errorLogPath) {
      newTask.errorLogPath = join(this.logsDir, `${newTask.id}.error.log`)
    }

    this.tasks.set(newTask.id, newTask)
    this.saveTasks()
    
    // Create launchd plist if not manual
    if (task.schedule.type !== 'manual') {
      await this.createLaunchdPlist(newTask)
    }

    return newTask
  }

  async updateTask(taskId: string, updates: Partial<ClaudeTask>): Promise<ClaudeTask> {
    const task = this.tasks.get(taskId)
    if (!task) {
      throw new Error(`Task ${taskId} not found`)
    }

    const updatedTask = { ...task, ...updates }
    this.tasks.set(taskId, updatedTask)
    this.saveTasks()

    // Update launchd plist
    if (updatedTask.schedule.type !== 'manual') {
      await this.createLaunchdPlist(updatedTask)
    }

    return updatedTask
  }

  async deleteTask(taskId: string): Promise<void> {
    const task = this.tasks.get(taskId)
    if (!task) {
      throw new Error(`Task ${taskId} not found`)
    }

    // Remove launchd plist
    await this.removeLaunchdPlist(taskId)
    
    this.tasks.delete(taskId)
    this.saveTasks()
  }

  async toggleTask(taskId: string, enabled: boolean): Promise<ClaudeTask> {
    const task = this.tasks.get(taskId)
    if (!task) {
      throw new Error(`Task ${taskId} not found`)
    }

    task.enabled = enabled
    this.tasks.set(taskId, task)
    this.saveTasks()

    if (task.schedule.type !== 'manual') {
      if (enabled) {
        await execAsync(`launchctl load ~/Library/LaunchAgents/com.runclauderun.${taskId}.plist`)
      } else {
        await execAsync(`launchctl unload ~/Library/LaunchAgents/com.runclauderun.${taskId}.plist`)
      }
    }

    return task
  }

  async getAllTasks(): Promise<ClaudeTask[]> {
    return Array.from(this.tasks.values())
  }

  async listSessions(): Promise<any[]> {
    try {
      // Try to get sessions from Claude's internal storage
      const sessionFile = join(homedir(), '.claude', 'sessions.json')
      if (existsSync(sessionFile)) {
        const sessions = JSON.parse(readFileSync(sessionFile, 'utf-8'))
        return Array.isArray(sessions) ? sessions : []
      }
      
      // Fallback: return empty array if no sessions found
      return []
    } catch (error) {
      console.error('Failed to list Claude sessions:', error)
      return []
    }
  }

  async runTask(taskId: string): Promise<{ success: boolean; runId: string; error?: string }> {
    const task = this.tasks.get(taskId)
    if (!task) {
      throw new Error(`Task ${taskId} not found`)
    }

    const runId = uuidv4()
    const logFile = join(this.logsDir, `${taskId}_${runId}.log`)
    const errorLogFile = join(this.logsDir, `${taskId}_${runId}.error.log`)

    const runEntry = {
      id: runId,
      startTime: new Date(),
      sessionId: task.sessionId,
      logFile
    }

    if (!task.runHistory) {
      task.runHistory = []
    }
    task.runHistory.push(runEntry)
    this.saveTasks() // Save immediately after adding the run entry
    
    // Emit event that a new run has started
    this.emit('run-started', { taskId, runId, task })
    
    // Send notification if enabled
    this.sendNotification('task-start', task)

    try {
      const command = this.buildClaudeCommand(task, false) as string
      console.log('Running command:', command)
      console.log('Working directory:', task.workingDirectory || homedir())
      
      // Ensure PATH includes common locations for Node and Claude
      const enhancedPath = `/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:${homedir()}/.bun/bin:${process.env.PATH || ''}`
      
      // Create empty log files to ensure they exist
      writeFileSync(logFile, '')
      writeFileSync(errorLogFile, '')
      
      return new Promise((resolve) => {
        // Log the exact command being run
        appendFileSync(logFile, `[COMMAND]: ${command}\n`)
        appendFileSync(logFile, `[WORKING DIR]: ${task.workingDirectory || homedir()}\n`)
        appendFileSync(logFile, `[TIMESTAMP]: ${new Date().toISOString()}\n\n`)
        
        const proc = spawn(command, {
          shell: true,
          cwd: task.workingDirectory || homedir(),
          env: { 
            ...process.env, 
            ...task.environment,
            PATH: enhancedPath,
            // Force output to be unbuffered
            PYTHONUNBUFFERED: '1',
            NODE_OPTIONS: '--no-warnings'
          },
          stdio: ['ignore', 'pipe', 'pipe'] // Explicitly set stdio
        })
        
        // Store the running process
        this.runningProcesses.set(runId, proc)

        let stdoutData = ''
        let stderrData = ''
        let sessionId: string | undefined
        let tokenUsage: any = {}
        let jsonBuffer = ''

        // Check if stdout exists
        if (!proc.stdout) {
          console.error('Process stdout is null')
          appendFileSync(logFile, '[ERROR]: Process stdout is null\n')
        } else {
          proc.stdout.on('data', (data) => {
          const chunk = data.toString()
          stdoutData += chunk
          
          // Try to parse JSON stream to extract session ID
          jsonBuffer += chunk
          const lines = jsonBuffer.split('\n')
          jsonBuffer = lines.pop() || '' // Keep the incomplete line
          
          for (const line of lines) {
            if (line.trim()) {
              try {
                const json = JSON.parse(line)
                
                // Extract session ID from Claude's JSON output
                if (json.type === 'session' || json.session_id) {
                  sessionId = json.session_id || json.id
                  // Update the run entry with the session ID
                  const runEntryIndex = task.runHistory!.findIndex(r => r.id === runId)
                  if (runEntryIndex !== -1) {
                    task.runHistory![runEntryIndex].sessionId = sessionId
                    this.saveTasks()
                  }
                }
                
                // Extract token usage
                if (json.type === 'usage' || json.usage) {
                  const usage = json.usage || json
                  tokenUsage = {
                    inputTokens: (tokenUsage.inputTokens || 0) + (usage.input_tokens || 0),
                    outputTokens: (tokenUsage.outputTokens || 0) + (usage.output_tokens || 0),
                    cacheCreationInputTokens: (tokenUsage.cacheCreationInputTokens || 0) + (usage.cache_creation_input_tokens || 0),
                    cacheReadInputTokens: (tokenUsage.cacheReadInputTokens || 0) + (usage.cache_read_input_tokens || 0)
                  }
                  // Update the run entry with token usage
                  const runEntryIndex = task.runHistory!.findIndex(r => r.id === runId)
                  if (runEntryIndex !== -1) {
                    task.runHistory![runEntryIndex].tokenUsage = tokenUsage
                    this.saveTasks()
                  }
                }
                
                // Format the JSON for better readability in logs
                const formatted = this.formatClaudeJsonOutput(json)
                appendFileSync(logFile, formatted + '\n')
                
                // Emit formatted output
                this.emit('log-update', {
                  taskId,
                  runId,
                  type: 'stdout',
                  data: formatted + '\n',
                  json: json
                })
              } catch {
                // Not JSON, append as-is
                appendFileSync(logFile, line + '\n')
                this.emit('log-update', {
                  taskId,
                  runId,
                  type: 'stdout',
                  data: line + '\n'
                })
              }
            }
          }
        })}

        // Check if stderr exists
        if (!proc.stderr) {
          console.error('Process stderr is null')
          appendFileSync(errorLogFile, '[ERROR]: Process stderr is null\n')
        } else {
          proc.stderr.on('data', (data) => {
          const chunk = data.toString()
          stderrData += chunk
          appendFileSync(errorLogFile, chunk)
          
          // Emit real-time log update
          this.emit('log-update', {
            taskId,
            runId,
            type: 'stderr',
            data: chunk
          })
        })}

        proc.on('error', (err) => {
          console.error(`Process error for task ${taskId}:`, err)
          appendFileSync(errorLogFile, `[PROCESS ERROR]: ${err.message}\n`)
          
          // Don't resolve here, wait for 'close' event
        })
        
        proc.on('close', (code, signal) => {
          // Remove from running processes
          this.runningProcesses.delete(runId)
          
          const runEntryIndex = task.runHistory!.findIndex(r => r.id === runId)
          if (runEntryIndex !== -1) {
            task.runHistory![runEntryIndex].endTime = new Date()
            task.runHistory![runEntryIndex].exitCode = code || 0
          }
          
          this.saveTasks()
          
          // Emit event that the run has completed
          this.emit('run-completed', {
            taskId,
            runId,
            exitCode: code || 0
          })
          
          // Send notification if enabled
          this.sendNotification('task-end', task, code || 0)
          
          // Handle different exit scenarios
          if (signal === 'SIGINT' || signal === 'SIGTERM') {
            console.log(`Task ${taskId} was interrupted (${signal})`)
            resolve({
              success: false,
              runId,
              error: `Process was interrupted (${signal})`
            })
          } else if (code === 0) {
            resolve({
              success: true,
              runId
            })
          } else {
            resolve({
              success: false,
              runId,
              error: `Process exited with code ${code}`
            })
          }
        })
      })
    } catch (error: any) {
      return { success: false, runId, error: error.message }
    }
  }

  async getRunLogs(taskId: string, runId: string): Promise<{ stdout: string; stderr: string }> {
    const task = this.tasks.get(taskId)
    if (!task) {
      throw new Error(`Task ${taskId} not found`)
    }

    const run = task.runHistory?.find(r => r.id === runId)
    if (!run || !run.logFile) {
      throw new Error(`Run ${runId} not found`)
    }

    const logFile = run.logFile
    const errorLogFile = logFile.replace('.log', '.error.log')

    const stdout = existsSync(logFile) ? readFileSync(logFile, 'utf-8') : ''
    const stderr = existsSync(errorLogFile) ? readFileSync(errorLogFile, 'utf-8') : ''

    return { stdout, stderr }
  }

  isRunActive(runId: string): boolean {
    return this.runningProcesses.has(runId)
  }

  getActiveRuns(): string[] {
    return Array.from(this.runningProcesses.keys())
  }

  private sendNotification(type: 'task-start' | 'task-end', task: ClaudeTask, exitCode?: number) {
    // Check task's notification setting
    const notifSetting = task.notifications || 'both'
    
    if (notifSetting === 'none') return
    if (type === 'task-start' && notifSetting === 'end') return
    if (type === 'task-end' && notifSetting === 'start') return
    
    if (type === 'task-start') {
      const notification = new Notification({
        title: 'Task Started',
        body: `${task.label} is now running`,
        icon: join(__dirname, '../../resources/icon.png'),
        silent: false
      })
      notification.show()
    } else if (type === 'task-end') {
      const success = exitCode === 0
      const notification = new Notification({
        title: success ? 'Task Completed' : 'Task Failed',
        body: `${task.label} ${success ? 'completed successfully' : `failed with exit code ${exitCode}`}`,
        icon: join(__dirname, '../../resources/icon.png'),
        silent: false
      })
      notification.show()
    }
  }

  async listClaudeCommands(): Promise<string[]> {
    // List available Claude CLI commands
    return [
      'claude run',
      'claude config',
      'claude init', 
      'claude history',
      'claude sessions',
      'claude session view',
      'claude session delete',
      'claude help',
      'claude version',
      'claude update'
    ]
  }

  async listClaudeSessions(): Promise<string[]> {
    try {
      const claudeCmd = this.claudePath || 'claude'
      let command: string
      
      if (this.claudePath && this.claudePath.endsWith('.js') && this.nodePath) {
        command = `${this.nodePath} ${this.claudePath} sessions --format json`
      } else {
        command = `${claudeCmd} sessions --format json`
      }
      
      const { stdout } = await execAsync(command)
      const sessions = JSON.parse(stdout)
      
      // Extract session IDs from the response
      if (Array.isArray(sessions)) {
        return sessions.map(s => s.id || s.session_id).filter(Boolean)
      }
      return []
    } catch {
      return []
    }
  }

  private async createLaunchdPlist(task: ClaudeTask): Promise<void> {
    const plistPath = join(homedir(), 'Library', 'LaunchAgents', `com.runclauderun.${task.id}.plist`)
    
    // If we have a Node path and Claude is a .js file, use Node to run it directly
    let programArgs: string[]
    if (this.claudePath && this.claudePath.endsWith('.js') && this.nodePath) {
      // Run Claude JS file directly with Node
      const claudeArgs = this.buildClaudeCommand(task, true) as string[]
      programArgs = [
        this.nodePath,
        this.claudePath,
        ...claudeArgs
      ]
    } else {
      // Fall back to shell execution with PATH
      const command = this.buildClaudeCommand(task, false) as string
      programArgs = [
        '/bin/sh',
        '-c',
        command
      ]
    }

    // Escape special XML characters in arguments
    const programArgsXml = programArgs.map(arg => {
      const escaped = arg
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;')
      return `        <string>${escaped}</string>`
    }).join('\n')

    const plist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.runclauderun.${task.id}</string>
    <key>ProgramArguments</key>
    <array>
${programArgsXml}
    </array>
    ${task.workingDirectory ? `<key>WorkingDirectory</key>
    <string>${task.workingDirectory}</string>` : ''}
    <key>StandardOutPath</key>
    <string>${task.logPath}</string>
    <key>StandardErrorPath</key>
    <string>${task.errorLogPath}</string>
    ${this.buildSchedulePlist(task.schedule)}
    ${this.buildEnvironmentPlist({...task.environment, PATH: `/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:${homedir()}/.bun/bin`})}
    <key>RunAtLoad</key>
    <${task.schedule.type === 'startup' ? 'true' : 'false'}/>
</dict>
</plist>`

    writeFileSync(plistPath, plist)
    
    if (task.enabled) {
      await execAsync(`launchctl load ${plistPath}`)
    }
  }

  private buildSchedulePlist(schedule: ClaudeTask['schedule']): string {
    switch (schedule.type) {
      case 'interval':
        if (schedule.interval) {
          const totalSeconds = (schedule.interval.seconds || 0) + 
                              (schedule.interval.minutes || 0) * 60 + 
                              (schedule.interval.hours || 0) * 3600
          return `<key>StartInterval</key>
    <integer>${totalSeconds}</integer>`
        }
        break
      case 'calendar':
        if (schedule.calendar) {
          const calendarInterval = Object.entries(schedule.calendar)
            .map(([key, value]) => `        <key>${key.charAt(0).toUpperCase() + key.slice(1)}</key>
        <integer>${value}</integer>`)
            .join('\n')
          return `<key>StartCalendarInterval</key>
    <dict>
${calendarInterval}
    </dict>`
        }
        break
      case 'file-watch':
        if (schedule.watchPaths) {
          const paths = schedule.watchPaths.map(p => `        <string>${p}</string>`).join('\n')
          return `<key>WatchPaths</key>
    <array>
${paths}
    </array>`
        }
        break
    }
    return ''
  }

  private buildEnvironmentPlist(env: Record<string, string>): string {
    const entries = Object.entries(env)
      .map(([key, value]) => `        <key>${key}</key>
        <string>${value}</string>`)
      .join('\n')
    return `<key>EnvironmentVariables</key>
    <dict>
${entries}
    </dict>`
  }

  private async removeLaunchdPlist(taskId: string): Promise<void> {
    const plistPath = join(homedir(), 'Library', 'LaunchAgents', `com.runclauderun.${taskId}.plist`)
    
    if (existsSync(plistPath)) {
      try {
        await execAsync(`launchctl unload ${plistPath}`)
      } catch {
        // Ignore errors if not loaded
      }
      await execAsync(`rm ${plistPath}`)
    }
  }
  
  async stopTask(runId: string): Promise<void> {
    const proc = this.runningProcesses.get(runId)
    if (proc) {
      console.log(`Stopping task with run ID ${runId}`)
      // Send SIGTERM first for graceful shutdown
      proc.kill('SIGTERM')
      
      // Give it 5 seconds to terminate gracefully
      setTimeout(() => {
        if (!proc.killed) {
          console.log(`Force killing task with run ID ${runId}`)
          proc.kill('SIGKILL')
        }
      }, 5000)
    }
  }
  
  async stopAllTasks(): Promise<void> {
    console.log('Stopping all running tasks...')
    const promises: Promise<void>[] = []
    
    for (const [runId] of this.runningProcesses) {
      promises.push(this.stopTask(runId))
    }
    
    await Promise.all(promises)
    
    // Wait a bit for processes to fully terminate
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
  
  async cleanup(): Promise<void> {
    console.log('Cleaning up Claude manager...')
    await this.stopAllTasks()
    this.saveTasks()
  }
}