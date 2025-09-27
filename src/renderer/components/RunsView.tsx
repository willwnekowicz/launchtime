import React, { useState, useEffect, useRef } from 'react'
import type { ClaudeTask } from '../types'

interface RunsViewProps {
  tasks: ClaudeTask[]
  selectedTask?: ClaudeTask | null
  onClose: () => void
  onRefresh?: () => void
  onRunTask?: (task: ClaudeTask) => void
  onEditTask?: (task: ClaudeTask) => void
  onDeleteTask?: (task: ClaudeTask) => void
}

interface RunEntry {
  type: 'past' | 'upcoming'
  task: ClaudeTask
  run?: any
  upcomingTime?: Date
  taskLabel: string
}

export function RunsView({ tasks, selectedTask: initialSelectedTask, onClose, onRefresh, onRunTask, onEditTask, onDeleteTask }: RunsViewProps) {
  const [selectedRun, setSelectedRun] = useState<{
    task: ClaudeTask
    runId: string
  } | null>(null)
  const [logs, setLogs] = useState<{ stdout: string; stderr: string } | null>(null)
  const [loadingLogs, setLoadingLogs] = useState(false)
  const [activeRuns, setActiveRuns] = useState<string[]>([])
  const [sortBy, setSortBy] = useState<'time' | 'task' | 'status' | 'tokens'>('time')
  const [filterStatuses, setFilterStatuses] = useState<Set<string>>(new Set(['success', 'failed', 'running', 'upcoming']))
  const [showStatusDropdown, setShowStatusDropdown] = useState(false)
  const [selectedTerminal, setSelectedTerminal] = useState<string>('iTerm')
  const [showTerminalMenu, setShowTerminalMenu] = useState(false)
  const [settings, setSettings] = useState<any>(null)
  const [selectedTab, setSelectedTab] = useState<'output' | 'raw' | 'stderr'>('output')
  const [parsedMessages, setParsedMessages] = useState<any[]>([])
  const [isLive, setIsLive] = useState(false)
  const [autoScroll, setAutoScroll] = useState(true)
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [copiedSessionId, setCopiedSessionId] = useState(false)
  const logsEndRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadActiveRuns()
    loadSettings()

    // Listen for run status changes
    const handleRunStarted = (data: any) => {
      setActiveRuns(prev => [...prev, data.runId])
      if (onRefresh) onRefresh()
    }

    const handleRunCompleted = (data: any) => {
      setActiveRuns(prev => prev.filter(id => id !== data.runId))
      if (onRefresh) onRefresh()
      setIsLive(false)
    }

    const handleLogUpdate = (data: any) => {
      if (selectedRun?.runId === data.runId) {
        setLogs(prev => {
          if (!prev) return { stdout: '', stderr: '' }
          return {
            ...prev,
            [data.type]: prev[data.type as 'stdout' | 'stderr'] + data.data
          }
        })

        // Parse JSON messages if available
        if (data.json) {
          setParsedMessages(prev => [...prev, data.json])
          
          // Extract session ID immediately when we see it
          if (data.json.type === 'session' || data.json.session_id) {
            const sessionId = data.json.session_id || data.json.id
            setCurrentSessionId(sessionId)
          }
        }
        
        // Auto-scroll to bottom if enabled
        if (autoScroll) {
          setTimeout(() => {
            logsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
          }, 100)
        }
      }
    }

    window.runclauderun.on('run-started', handleRunStarted)
    window.runclauderun.on('run-completed', handleRunCompleted)
    window.runclauderun.on('log-update', handleLogUpdate)

    return () => {
      window.runclauderun.off('run-started', handleRunStarted)
      window.runclauderun.off('run-completed', handleRunCompleted)
      window.runclauderun.off('log-update', handleLogUpdate)
    }
  }, [selectedRun, onRefresh, autoScroll])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowTerminalMenu(false)
      }
      // Also close status dropdown when clicking outside
      if (!(event.target as Element).closest('.status-dropdown')) {
        setShowStatusDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const loadSettings = async () => {
    const prefs = await window.runclauderun.preferences.get()
    setSettings(prefs)
    if (prefs?.advanced?.defaultTerminal) {
      setSelectedTerminal(prefs.advanced.defaultTerminal)
    }
  }

  const loadActiveRuns = async () => {
    const active = await window.runclauderun.claude.getActiveRuns()
    setActiveRuns(active)
  }

  const getStatusColor = (runId: string, exitCode?: number) => {
    if (activeRuns.includes(runId)) return 'text-green-500' // Live/Running
    if (exitCode === undefined) return 'text-yellow-400' // Running (not live)
    if (exitCode === 0) return 'text-claude-success'
    return 'text-claude-error'
  }

  const getStatusText = (runId: string, exitCode?: number) => {
    if (activeRuns.includes(runId)) return 'Live'
    if (exitCode === undefined) return 'Running'
    if (exitCode === 0) return 'Success'
    return `Failed (${exitCode})`
  }

  const handleStatusFilterChange = (status: string) => {
    const newStatuses = new Set(filterStatuses)
    if (newStatuses.has(status)) {
      newStatuses.delete(status)
    } else {
      newStatuses.add(status)
    }
    setFilterStatuses(newStatuses)
  }

  const checkIfLive = async () => {
    if (!selectedRun) return
    const active = await window.runclauderun.claude.isRunActive(selectedRun.runId)
    setIsLive(active)
  }

  const parseLogMessages = (stdout: string): any[] => {
    if (!stdout) return []
    
    const lines = stdout.split('\n')
    
    // Extract JSON objects that contain message structures
    const jsonMessages = lines
      .filter(line => line.trim().startsWith('{'))
      .map(line => {
        try {
          return JSON.parse(line.trim())
        } catch {
          return null
        }
      })
      .filter(Boolean)
      .filter(obj => obj.message && obj.message.role && obj.message.content)
      .map(obj => ({
        role: obj.message.role,
        content: Array.isArray(obj.message.content) 
          ? obj.message.content.map(c => c.text || c.content || '').join('\n')
          : obj.message.content
      }))
    
    // If no JSON messages found, fall back to formatted log parsing
    if (jsonMessages.length === 0) {
      const formattedMessages = lines
        .filter(line => /\[(USER|ASSISTANT|TOOL USE|TOOL RESULT|SESSION|USAGE|ERROR)\]:/.test(line))
        .reduce((acc, line) => {
          if (line.includes('[USER]:')) {
            const content = line.substring(line.indexOf('[USER]:') + 7).trim()
            acc.push({ role: 'user', content })
          } else if (line.includes('[ASSISTANT]:')) {
            const content = line.substring(line.indexOf('[ASSISTANT]:') + 12).trim()
            acc.push({ role: 'assistant', content })
          } else if (line.includes('[TOOL USE]:')) {
            const content = line.substring(line.indexOf('[TOOL USE]:') + 11).trim()
            acc.push({ type: 'tool_use', name: content.split('-')[0].trim(), content })
          } else if (line.includes('[TOOL RESULT]:')) {
            const content = line.substring(line.indexOf('[TOOL RESULT]:') + 14).trim()
            acc.push({ type: 'tool_result', content })
          } else if (line.includes('[SESSION]:')) {
            const match = line.match(/ID:\s*([^\s]+)/)
            if (match) {
              setCurrentSessionId(match[1])
              acc.push({ type: 'session', session_id: match[1] })
            }
          } else if (line.includes('[USAGE]:')) {
            const content = line.substring(line.indexOf('[USAGE]:') + 8).trim()
            acc.push({ type: 'usage', content })
          } else if (line.includes('[ERROR]:')) {
            const content = line.substring(line.indexOf('[ERROR]:') + 8).trim()
            acc.push({ type: 'error', content })
          }
          return acc
        }, [] as any[])
      
      return formattedMessages
    }
    
    return jsonMessages
  }

  const calculateUpcomingRuns = (task: ClaudeTask, limit = 3): Date[] => {
    if (!task.enabled || task.schedule.type === 'manual') return []
    
    const now = new Date()
    const runs: Date[] = []
    
    switch (task.schedule.type) {
      case 'interval':
        if (task.schedule.interval) {
          const intervalSeconds = (task.schedule.interval.seconds || 0) + 
                                 (task.schedule.interval.minutes || 0) * 60 + 
                                 (task.schedule.interval.hours || 0) * 3600
          
          if (intervalSeconds > 0) {
            const intervalMs = intervalSeconds * 1000
            
            // Calculate from last run if available, otherwise from now
            let baseTime = now.getTime()
            if (task.runHistory && task.runHistory.length > 0) {
              // Find the most recent run
              const lastRun = task.runHistory.sort((a, b) => 
                new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
              )[0]
              const lastRunTime = new Date(lastRun.startTime).getTime()
              
              // Calculate next run time from last run
              const timeSinceLastRun = now.getTime() - lastRunTime
              const intervalsPassed = Math.floor(timeSinceLastRun / intervalMs)
              baseTime = lastRunTime + (intervalsPassed + 1) * intervalMs
            }
            
            for (let i = 0; i < limit; i++) {
              runs.push(new Date(baseTime + intervalMs * i))
            }
          }
        }
        break
      
      case 'calendar':
        if (task.schedule.calendar) {
          const { hour = 0, minute = 0 } = task.schedule.calendar
          
          // Create a date for today at the scheduled time
          const today = new Date()
          today.setHours(hour, minute, 0, 0)
          
          // If today's scheduled time has passed, start from tomorrow
          let nextRun = new Date(today)
          if (today <= now) {
            nextRun.setDate(nextRun.getDate() + 1)
          }
          
          // Generate the next 'limit' occurrences
          for (let i = 0; i < limit; i++) {
            runs.push(new Date(nextRun))
            nextRun.setDate(nextRun.getDate() + 1)
          }
        }
        break
      
      case 'startup':
        // Startup tasks don't have predictable upcoming times
        break
        
      case 'file-watch':
        // File watch tasks are event-driven, no predictable schedule
        break
    }
    
    return runs
  }

  // Create combined runs list (past + upcoming)
  let allRuns: RunEntry[] = []

  // Add past runs
  tasks.forEach(task => {
    (task.runHistory || []).forEach(run => {
      allRuns.push({
        type: 'past',
        task,
        run,
        taskLabel: task.label
      })
    })
  })

  // Add upcoming runs
  tasks.forEach(task => {
    if (task.enabled && task.schedule.type !== 'manual') {
      const upcomingTimes = calculateUpcomingRuns(task, 3)
      upcomingTimes.forEach(time => {
        allRuns.push({
          type: 'upcoming',
          task,
          upcomingTime: time,
          taskLabel: task.label
        })
      })
    }
  })
  
  // Apply task filter (only show runs for the selected task if one is provided)
  if (initialSelectedTask) {
    allRuns = allRuns.filter(r => r.task.id === initialSelectedTask.id)
  }
  
  // Apply status filters
  allRuns = allRuns.filter(entry => {
    if (entry.type === 'upcoming') {
      return filterStatuses.has('upcoming')
    } else {
      const run = entry.run!
      const isActive = activeRuns.includes(run.id)
      
      if (isActive && filterStatuses.has('running')) return true
      if (!isActive && run.exitCode === 0 && filterStatuses.has('success')) return true
      if (!isActive && run.exitCode !== undefined && run.exitCode !== 0 && filterStatuses.has('failed')) return true
      
      return false
    }
  })
  
  // Apply sorting
  allRuns.sort((a, b) => {
    // Upcoming runs always come first
    if (a.type === 'upcoming' && b.type !== 'upcoming') return -1
    if (a.type !== 'upcoming' && b.type === 'upcoming') return 1
    
    // If both are upcoming, sort by time (furthest future first)
    if (a.type === 'upcoming' && b.type === 'upcoming') {
      return b.upcomingTime!.getTime() - a.upcomingTime!.getTime()
    }
    
    // Otherwise apply normal sorting for past runs
    switch (sortBy) {
      case 'task':
        return a.taskLabel.localeCompare(b.taskLabel)
      case 'status':
        const aStatus = getStatusText(a.run!.id, a.run!.exitCode)
        const bStatus = getStatusText(b.run!.id, b.run!.exitCode)
        return aStatus.localeCompare(bStatus)
      case 'tokens':
        const aTokens = (a.run!.tokenUsage?.outputTokens || 0) + (a.run!.tokenUsage?.inputTokens || 0)
        const bTokens = (b.run!.tokenUsage?.outputTokens || 0) + (b.run!.tokenUsage?.inputTokens || 0)
        return bTokens - aTokens
      case 'time':
      default:
        return new Date(b.run!.startTime).getTime() - new Date(a.run!.startTime).getTime()
    }
  })

  const loadLogs = async (task: ClaudeTask, runId: string) => {
    setLoadingLogs(true)
    setSelectedRun({ task, runId })
    try {
      const result = await window.runclauderun.claude.getLogs(task.id, runId)
      if (result.success && result.data) {
        setLogs(result.data)
        
        // Parse JSON messages from the stdout log
        if (result.data.stdout) {
          const messages = parseLogMessages(result.data.stdout)
          setParsedMessages(messages)
        }
      }
      
      // Check if this run is live
      await checkIfLive()
    } catch (error) {
      console.error('Failed to load logs:', error)
    } finally {
      setLoadingLogs(false)
    }
  }

  const openInTerminal = async (terminal?: string) => {
    if (!selectedRun) return
    const run = allRuns.find(r => r.type === 'past' && r.run?.id === selectedRun.runId)
    if (run?.run?.sessionId) {
      const workingDir = run.task.workingDirectory || '~'
      const app = terminal || selectedTerminal
      await window.runclauderun.system?.openInTerminal(app, workingDir, run.run.sessionId)
    }
  }

  // Get the selected task for task details panel
  const selectedTaskForDetails = initialSelectedTask || (tasks.length === 1 ? tasks[0] : null)

  return (
    <div className="h-full flex flex-col bg-claude-darker">
      {/* Three Column Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Task Column - only show when a specific task is selected */}
        {initialSelectedTask && (
        <div className="w-80 border-r border-claude-border bg-claude-gray flex flex-col">
          {/* Task Column Header - match height with other headers */}
          <div className="h-10 px-3 flex items-center border-b border-claude-border bg-claude-dark">
            <h4 className="text-sm font-mono text-claude-text font-medium">Task</h4>
          </div>
          
          {/* Action Buttons - match height with Runs filters */}
          {selectedTaskForDetails && (
            <div className="px-3 py-2 bg-claude-gray border-b border-claude-border flex items-center">
              {onRunTask && (
                <button
                  onClick={() => onRunTask(selectedTaskForDetails)}
                  className="p-1 hover:bg-claude-hover text-claude-text rounded transition-colors"
                  title="Run Now"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </button>
              )}
              {onEditTask && (
                <button
                  onClick={() => onEditTask(selectedTaskForDetails)}
                  className="p-1 hover:bg-claude-hover text-claude-text rounded transition-colors ml-1"
                  title="Edit Task"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
              )}
              {onDeleteTask && (
                <button
                  onClick={() => onDeleteTask(selectedTaskForDetails)}
                  className="p-1 hover:bg-claude-hover text-claude-muted hover:text-claude-error rounded transition-colors ml-auto"
                  title="Delete Task"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
            </div>
          )}
          
          {/* Task Details */}
          <div className="flex-1 overflow-y-auto">
            {selectedTaskForDetails ? (
              <div className="p-3">
                <div className="mb-4">
                  <h5 className="text-sm font-mono text-claude-text mb-2">{selectedTaskForDetails.label}</h5>
                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="text-claude-muted font-mono">Status:</span>
                      <span className={`ml-2 ${selectedTaskForDetails.enabled ? 'text-claude-success' : 'text-claude-muted'}`}>
                        {selectedTaskForDetails.enabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                    <div>
                      <span className="text-claude-muted font-mono">Schedule:</span>
                      <span className="ml-2 text-claude-text capitalize">{selectedTaskForDetails.schedule.type}</span>
                    </div>
                    {selectedTaskForDetails.workingDirectory && (
                      <div>
                        <span className="text-claude-muted font-mono">Working Dir:</span>
                        <span className="ml-2 text-claude-text text-xs break-all">{selectedTaskForDetails.workingDirectory}</span>
                      </div>
                    )}
                    <div>
                      <span className="text-claude-muted font-mono">Command Type:</span>
                      <span className="ml-2 text-claude-text capitalize">{selectedTaskForDetails.commandType}</span>
                    </div>
                    {selectedTaskForDetails.commandType === 'prompt' && (
                      <div>
                        <span className="text-claude-muted font-mono">Prompt:</span>
                        <div className="mt-1 p-2 bg-claude-dark rounded text-xs text-claude-text whitespace-pre-wrap break-words max-h-32 overflow-y-auto">
                          {selectedTaskForDetails.prompt}
                        </div>
                      </div>
                    )}
                    {selectedTaskForDetails.commandType === 'existing' && selectedTaskForDetails.existingCommand && (
                      <div>
                        <span className="text-claude-muted font-mono">Command:</span>
                        <div className="mt-1 p-2 bg-claude-dark rounded text-xs font-mono text-claude-text break-all">
                          {selectedTaskForDetails.existingCommand}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 text-center text-xs text-claude-muted">
                No task selected
              </div>
            )}
          </div>
        </div>
        )}

        {/* Runs Column - narrower to give more space to Logs */}
        <div className="w-72 border-r border-claude-border bg-claude-gray flex flex-col">
          {/* Runs Column Header - consistent height with others */}
          <div className="h-10 px-3 flex items-center border-b border-claude-border bg-claude-dark">
            <h4 className="text-sm font-mono text-claude-text font-medium">Runs</h4>
          </div>
          <div>
            
            {/* Filters section below header */}
            <div className="px-3 py-2 bg-claude-gray border-b border-claude-border flex items-center space-x-2">
              {/* Status Filter Dropdown */}
              <div className="relative status-dropdown">
                <button
                  onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                  className="flex items-center space-x-1 px-2 py-1 bg-claude-border hover:bg-claude-hover rounded text-xs font-mono text-claude-text transition-colors"
                  title="Filter by status"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.707A1 1 0 013 7V4z" />
                  </svg>
                  <span>Status</span>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {showStatusDropdown && (
                  <div className="absolute top-full left-0 mt-1 bg-claude-gray border border-claude-border rounded shadow-lg z-10 min-w-32">
                    {['success', 'failed', 'running', 'upcoming'].map(status => (
                      <button
                        key={status}
                        onClick={() => handleStatusFilterChange(status)}
                        className={`block w-full text-left px-3 py-2 text-xs font-mono hover:bg-claude-hover transition-colors ${
                          filterStatuses.has(status) ? 'text-claude-accent' : 'text-claude-text'
                        }`}
                      >
                        <span className="mr-2">{filterStatuses.has(status) ? '✓' : ' '}</span>
                        <span className="capitalize">{status}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Sort By Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setSortBy(sortBy === 'time' ? 'task' : sortBy === 'task' ? 'status' : sortBy === 'status' ? 'tokens' : 'time')}
                  className="flex items-center space-x-1 px-2 py-1 bg-claude-border hover:bg-claude-hover rounded text-xs font-mono text-claude-text transition-colors"
                  title="Sort runs"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                  </svg>
                  <span className="capitalize">{sortBy}</span>
                </button>
              </div>
            </div>
          </div>
          
          {/* Runs List */}
          <div className="flex-1 overflow-y-auto">
            {allRuns.length === 0 ? (
              <div className="p-4 text-center text-xs text-claude-muted">
                No runs match the current filters.
              </div>
            ) : (
              <div className="py-1">
                {allRuns.map((entry, index) => (
                  <div
                    key={entry.type === 'past' ? `${entry.task.id}-${entry.run!.id}` : `upcoming-${entry.task.id}-${index}`}
                    onClick={() => entry.type === 'past' && loadLogs(entry.task, entry.run!.id)}
                    className={`px-3 py-2 transition-colors ${
                      entry.type === 'past' 
                        ? `cursor-pointer hover:bg-claude-hover ${selectedRun?.runId === entry.run!.id ? 'bg-claude-hover' : ''}` 
                        : 'bg-claude-darker border-l-2 border-claude-warning'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-mono text-claude-text truncate">
                          {entry.taskLabel}
                          {entry.type === 'upcoming' && (
                            <span className="ml-2 text-xxs text-claude-warning">UPCOMING</span>
                          )}
                        </div>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="text-xxs text-claude-muted">
                            {entry.type === 'upcoming' 
                              ? entry.upcomingTime!.toLocaleString()
                              : new Date(entry.run!.startTime).toLocaleString()
                            }
                          </span>
                          {entry.type === 'past' && (
                            <span className={`text-xxs ${getStatusColor(entry.run!.id, entry.run!.exitCode)}`}>
                              {getStatusText(entry.run!.id, entry.run!.exitCode)}
                            </span>
                          )}
                        </div>
                        {entry.type === 'past' && entry.run!.tokenUsage && (
                          <div className="text-xxs text-claude-accent mt-1">
                            <svg className="w-3 h-3 inline mr-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                            {entry.run!.tokenUsage.inputTokens || 0} in / {entry.run!.tokenUsage.outputTokens || 0} out
                            {(entry.run!.tokenUsage.cacheReadInputTokens || 0) > 0 && (
                              <span className="text-claude-success ml-1">
                                (cache: {entry.run!.tokenUsage.cacheReadInputTokens})
                              </span>
                            )}
                          </div>
                        )}
                        {entry.type === 'past' && entry.run!.endTime && (
                          <div className="text-xxs text-claude-muted mt-0.5">
                            Duration: {Math.round((new Date(entry.run!.endTime).getTime() - new Date(entry.run!.startTime).getTime()) / 1000)}s
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Logs Column */}
        <div className="flex-1 flex flex-col bg-claude-darker">
          {/* Logs Column Header - consistent height */}
          <div className="h-10 px-3 flex items-center justify-between border-b border-claude-border bg-claude-dark">
            <h4 className="text-sm font-mono text-claude-text font-medium">Logs</h4>
            {/* Open Session Button */}
            {(currentSessionId || (selectedRun && allRuns.find(r => r.type === 'past' && r.run?.id === selectedRun.runId)?.run?.sessionId)) && (
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setShowTerminalMenu(!showTerminalMenu)}
                  className="flex items-center space-x-1 px-2 py-1 text-xxs font-mono bg-claude-accent hover:bg-claude-info text-white rounded transition-colors"
                >
                  <span>Open Session</span>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {showTerminalMenu && (
                  <div className="absolute right-0 mt-2 bg-claude-gray border border-claude-border rounded shadow-lg z-10">
                    {['iTerm', 'Terminal'].map(app => (
                      <button
                        key={app}
                        onClick={async () => {
                          setSelectedTerminal(app)
                          setShowTerminalMenu(false)
                          await openInTerminal(app)
                        }}
                        className="block w-full text-left px-3 py-1.5 text-xs font-mono text-claude-text hover:bg-claude-hover transition-colors whitespace-nowrap"
                      >
                        {app}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {selectedRun ? (
            <>
              {/* Run Info */}
              <div className="px-3 py-2 border-b border-claude-border bg-claude-gray">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="text-xs font-mono text-claude-text">
                      {selectedRun.task.label} - {new Date(
                        allRuns.find(r => r.type === 'past' && r.run?.id === selectedRun.runId)?.run?.startTime || ''
                      ).toLocaleString()}
                    </div>
                    {isLive && (
                      <div className="flex items-center space-x-1">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                        <span className="text-xxs text-green-500 font-mono">LIVE</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    {isLive && (
                      <button
                        onClick={() => setAutoScroll(!autoScroll)}
                        className={`px-2 py-1 text-xs font-mono rounded transition-colors ${
                          autoScroll 
                            ? 'bg-claude-accent text-white' 
                            : 'bg-claude-hover text-claude-text hover:bg-claude-border'
                        }`}
                        title={autoScroll ? 'Auto-scroll enabled' : 'Auto-scroll disabled'}
                      >
                        Auto-scroll
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Output Tabs */}
              <div className="flex border-b border-claude-border bg-claude-gray">
                <button
                  onClick={() => setSelectedTab('output')}
                  className={`px-4 py-1.5 text-xs font-mono transition-colors ${
                    selectedTab === 'output' 
                      ? 'bg-claude-dark text-claude-text border-b-2 border-claude-accent' 
                      : 'text-claude-muted hover:text-claude-text'
                  }`}
                >
                  Output
                </button>
                <button
                  onClick={() => setSelectedTab('raw')}
                  className={`px-4 py-1.5 text-xs font-mono transition-colors ${
                    selectedTab === 'raw' 
                      ? 'bg-claude-dark text-claude-text border-b-2 border-claude-accent' 
                      : 'text-claude-muted hover:text-claude-text'
                  }`}
                >
                  Raw Output
                </button>
                <button
                  onClick={() => setSelectedTab('stderr')}
                  className={`px-4 py-1.5 text-xs font-mono transition-colors ${
                    selectedTab === 'stderr' 
                      ? 'bg-claude-dark text-claude-text border-b-2 border-claude-accent' 
                      : 'text-claude-muted hover:text-claude-text'
                  }`}
                >
                  Errors
                </button>
              </div>

              <div className="flex-1 overflow-auto bg-black p-3">
                {loadingLogs ? (
                  <div className="text-xs text-claude-muted">Loading logs...</div>
                ) : logs ? (
                  <>
                    {selectedTab === 'output' ? (
                      <div className="space-y-3">
                        {parsedMessages.length === 0 && !isLive ? (
                          <div className="text-xs text-claude-muted">No messages</div>
                        ) : (
                          parsedMessages.map((msg, i) => (
                            <div key={i} className="border-l-2 border-claude-border pl-3">
                              {msg.role === 'user' && (
                                <div>
                                  <div className="text-xxs text-claude-info font-mono mb-1">USER</div>
                                  <div className="text-xs text-claude-text whitespace-pre-wrap">{msg.content}</div>
                                </div>
                              )}
                              {msg.role === 'assistant' && (
                                <div>
                                  <div className="text-xxs text-claude-accent font-mono mb-1">ASSISTANT</div>
                                  <div className="text-xs text-claude-text whitespace-pre-wrap">{msg.content}</div>
                                </div>
                              )}
                              {msg.type === 'tool_use' && (
                                <div>
                                  <div className="text-xxs text-claude-warning font-mono mb-1">TOOL USE{msg.name ? `: ${msg.name}` : ''}</div>
                                  <div className="text-xs text-claude-muted whitespace-pre-wrap">
                                    {typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.input || msg.arguments || msg.content, null, 2)}
                                  </div>
                                </div>
                              )}
                              {msg.type === 'tool_result' && (
                                <div>
                                  <div className="text-xxs text-claude-success font-mono mb-1">TOOL RESULT</div>
                                  <div className="text-xs text-claude-muted whitespace-pre-wrap">
                                    {msg.content || msg.output || msg.result}
                                  </div>
                                </div>
                              )}
                              {msg.type === 'session' && (
                                <div>
                                  <div className="text-xxs text-claude-purple font-mono mb-1">SESSION</div>
                                  <div className="text-xs text-claude-muted">ID: {msg.session_id}</div>
                                </div>
                              )}
                              {msg.type === 'usage' && (
                                <div>
                                  <div className="text-xxs text-claude-teal font-mono mb-1">USAGE</div>
                                  <div className="text-xs text-claude-muted">{msg.content}</div>
                                </div>
                              )}
                              {msg.type === 'error' && (
                                <div>
                                  <div className="text-xxs text-claude-error font-mono mb-1">ERROR</div>
                                  <div className="text-xs text-claude-error">{msg.content}</div>
                                </div>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    ) : selectedTab === 'raw' ? (
                      <pre className="text-xs font-mono text-green-400 whitespace-pre-wrap">
                        {logs.stdout || (isLive ? 'Waiting for output...' : 'No output')}
                      </pre>
                    ) : (
                      <pre className="text-xs font-mono text-red-400 whitespace-pre-wrap">
                        {logs.stderr || (isLive ? 'No errors yet...' : 'No errors')}
                      </pre>
                    )}
                    <div ref={logsEndRef} />
                  </>
                ) : (
                  <div className="text-xs text-claude-muted">No logs available</div>
                )}
              </div>

              <div className="p-2 border-t border-claude-border bg-claude-gray">
                <div className="flex items-center justify-between text-xxs text-claude-muted">
                  <div className="flex items-center space-x-1">
                    <span>Session ID:</span>
                    <button
                      onClick={async () => {
                        const sessionId = currentSessionId || allRuns.find(r => r.type === 'past' && r.run?.id === selectedRun.runId)?.run?.sessionId
                        if (sessionId && sessionId !== 'N/A') {
                          await navigator.clipboard.writeText(sessionId)
                          setCopiedSessionId(true)
                          setTimeout(() => setCopiedSessionId(false), 2000)
                        }
                      }}
                      className="font-mono text-claude-muted hover:text-claude-text cursor-pointer transition-colors relative"
                      title="Click to copy"
                    >
                      {copiedSessionId ? (
                        <span className="text-claude-muted">Copied!</span>
                      ) : (
                        currentSessionId || allRuns.find(r => r.type === 'past' && r.run?.id === selectedRun.runId)?.run?.sessionId || 'N/A'
                      )}
                    </button>
                  </div>
                  <span>Status: {isLive ? 'Running' : `Exit Code: ${allRuns.find(r => r.type === 'past' && r.run?.id === selectedRun.runId)?.run?.exitCode ?? 'Unknown'}`}</span>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-xs text-claude-muted">Select a run to view logs</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}