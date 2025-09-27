import React, { useState, useEffect } from 'react'
import type { ClaudeTask } from '../types'

interface ClaudeTaskEditorProps {
  task: ClaudeTask | null
  isNew: boolean
  onSave: (task: Omit<ClaudeTask, 'id' | 'runHistory'>) => void
  onDelete?: () => void
  onCancel: () => void
}

export function ClaudeTaskEditor({ task, isNew, onSave, onDelete, onCancel }: ClaudeTaskEditorProps) {
  const [label, setLabel] = useState('')
  const [commandType, setCommandType] = useState<'prompt' | 'existing'>('prompt')
  const [prompt, setPrompt] = useState('')
  const [existingCommand, setExistingCommand] = useState('')
  const [availableCommands, setAvailableCommands] = useState<string[]>([])  
  const [workingDirectory, setWorkingDirectory] = useState('')
  const [sessionOptions, setSessionOptions] = useState<'new' | 'reuse' | 'fork'>('new')
  const [initialSessionId, setInitialSessionId] = useState('')
  const [availableSessions, setAvailableSessions] = useState<string[]>([])
  const [scheduleType, setScheduleType] = useState<ClaudeTask['schedule']['type']>('manual')
  const [interval, setInterval] = useState({ hours: 0, minutes: 0, seconds: 0 })
  const [calendarTime, setCalendarTime] = useState('09:00')
  const [calendarDays, setCalendarDays] = useState<number[]>([])
  const [watchPaths, setWatchPaths] = useState<string[]>([])
  const [showAdvanced, setShowAdvanced] = useState(false)
  
  // Claude flags
  const [permissionMode, setPermissionMode] = useState<string>('default')
  const [model, setModel] = useState<string>('sonnet')
  const [outputFormat, setOutputFormat] = useState<string>('text')
  const [verbose, setVerbose] = useState(false)
  const [debug, setDebug] = useState(false)
  const [allowedTools, setAllowedTools] = useState<string[]>([])
  const [disallowedTools, setDisallowedTools] = useState<string[]>([])
  const [addDir, setAddDir] = useState<string[]>([])
  const [notifications, setNotifications] = useState<'start' | 'end' | 'both' | 'none'>('both')

  useEffect(() => {
    loadSessions()
    loadCommands()
    if (task) {
      setLabel(task.label)
      setCommandType(task.commandType || 'prompt')
      setPrompt(task.prompt)
      setExistingCommand(task.existingCommand || '')
      setWorkingDirectory(task.workingDirectory || '')
      setSessionOptions(task.sessionOptions || 'new')
      setInitialSessionId(task.initialSessionId || '')
      setScheduleType(task.schedule.type)
      setInterval(task.schedule.interval || { hours: 0, minutes: 0, seconds: 0 })
      
      if (task.schedule.calendar) {
        const hour = task.schedule.calendar.hour || 0
        const minute = task.schedule.calendar.minute || 0
        setCalendarTime(`${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`)
      }
      
      setWatchPaths(task.schedule.watchPaths || [])
      
      // Determine permission mode from flags
      if (task.flags.dangerouslySkipPermissions) {
        setPermissionMode('dangerouslySkipPermissions')
      } else {
        setPermissionMode(task.flags.permissionMode || 'default')
      }
      
      setModel(task.flags.model || 'sonnet')
      setOutputFormat(task.flags.outputFormat || 'text')
      setVerbose(task.flags.verbose || false)
      setDebug(task.flags.debug ? true : false)
      setAllowedTools(task.flags.allowedTools || [])
      setDisallowedTools(task.flags.disallowedTools || [])
      setAddDir(task.flags.addDir || [])
      setNotifications(task.notifications || 'both')
    }
  }, [task])

  const loadSessions = async () => {
    try {
      const result = await window.runclauderun.claude.listSessions()
      if (result.success && result.data) {
        setAvailableSessions(result.data)
      }
    } catch (error) {
      console.error('Failed to load sessions:', error)
    }
  }

  const loadCommands = async () => {
    try {
      const result = await window.runclauderun.claude.listCommands()
      if (result.success && result.data) {
        setAvailableCommands(result.data)
      }
    } catch (error) {
      console.error('Failed to load commands:', error)
    }
  }

  const handleSave = () => {
    if (!label || (commandType === 'prompt' ? !prompt : !existingCommand)) {
      alert('Please provide a task name and ' + (commandType === 'prompt' ? 'prompt' : 'command'))
      return
    }

    // Parse calendar time
    let calendar = undefined
    if (scheduleType === 'calendar' && calendarTime) {
      const [hourStr, minuteStr] = calendarTime.split(':')
      calendar = {
        hour: parseInt(hourStr) || 0,
        minute: parseInt(minuteStr) || 0
      }
    }

    const newTask: Omit<ClaudeTask, 'id' | 'runHistory'> = {
      label,
      commandType,
      prompt: commandType === 'prompt' ? prompt : '',
      existingCommand: commandType === 'existing' ? existingCommand : undefined,
      enabled: true,
      workingDirectory: workingDirectory || undefined,
      sessionOptions,
      initialSessionId: sessionOptions !== 'new' ? initialSessionId : undefined,
      sessionId: undefined,
      useExistingSession: false,
      flags: {
        print: true, // Always non-interactive for scheduled tasks
        permissionMode: permissionMode === 'dangerouslySkipPermissions' ? undefined : permissionMode as any,
        dangerouslySkipPermissions: permissionMode === 'dangerouslySkipPermissions',
        model,
        outputFormat: outputFormat as any,
        verbose,
        debug,
        allowedTools: allowedTools.filter(t => t),
        disallowedTools: disallowedTools.filter(t => t),
        addDir: addDir.filter(d => d)
      },
      schedule: {
        type: scheduleType,
        interval: scheduleType === 'interval' ? interval : undefined,
        calendar: scheduleType === 'calendar' ? calendar : undefined,
        watchPaths: scheduleType === 'file-watch' ? watchPaths : undefined
      },
      notifications
    }

    onSave(newTask)
  }

  const handleSelectDirectory = async () => {
    const path = await window.runclauderun.dialog.selectDirectory()
    if (path) {
      setWorkingDirectory(path)
    }
  }

  const weekDays = [
    { value: 0, label: 'Sun' },
    { value: 1, label: 'Mon' },
    { value: 2, label: 'Tue' },
    { value: 3, label: 'Wed' },
    { value: 4, label: 'Thu' },
    { value: 5, label: 'Fri' },
    { value: 6, label: 'Sat' }
  ]

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6 max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-mono text-claude-text">
            {isNew ? 'New Claude Task' : 'Edit Claude Task'}
          </h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={onCancel}
              className="px-3 py-1 text-xs font-mono text-claude-muted hover:text-claude-text transition-colors"
            >
              Cancel
            </button>
            {onDelete && (
              <button
                onClick={onDelete}
                className="px-3 py-1 text-xs font-mono text-claude-error hover:text-red-300 transition-colors"
              >
                Delete
              </button>
            )}
            <button
              onClick={handleSave}
              className="px-4 py-1 bg-claude-accent hover:bg-claude-info text-white font-mono text-xs rounded transition-colors"
            >
              Save Task
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-mono text-claude-text mb-1">Task Name</label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="w-full px-3 py-1.5 bg-claude-gray border border-claude-border rounded text-xs font-mono text-claude-text focus:border-claude-orange focus:outline-none"
              placeholder="e.g., Daily Report Generation"
            />
          </div>

          <div>
            <div className="flex items-center space-x-4 mb-2">
              <label className="text-xs font-mono text-claude-text">Input Type:</label>
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  checked={commandType === 'prompt'}
                  onChange={() => setCommandType('prompt')}
                  className="w-3 h-3"
                />
                <span className="text-xs font-mono text-claude-text">Claude Prompt</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  checked={commandType === 'existing'}
                  onChange={() => setCommandType('existing')}
                  className="w-3 h-3"
                />
                <span className="text-xs font-mono text-claude-text">Existing Command</span>
              </label>
            </div>
            
            {commandType === 'prompt' ? (
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="w-full px-3 py-1.5 bg-claude-gray border border-claude-border rounded text-xs font-mono text-claude-text focus:border-claude-accent focus:outline-none resize-none"
                rows={4}
                placeholder="Enter the prompt for Claude to execute..."
              />
            ) : (
              <select
                value={existingCommand}
                onChange={(e) => setExistingCommand(e.target.value)}
                className="w-full px-3 py-1.5 bg-claude-gray border border-claude-border rounded text-xs font-mono text-claude-text focus:border-claude-accent focus:outline-none"
              >
                <option value="">Select a command...</option>
                {availableCommands.map(cmd => (
                  <option key={cmd} value={cmd}>{cmd}</option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="block text-xs font-mono text-claude-text mb-1">Working Directory</label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={workingDirectory}
                onChange={(e) => setWorkingDirectory(e.target.value)}
                className="flex-1 px-3 py-1.5 bg-claude-gray border border-claude-border rounded text-xs font-mono text-claude-text focus:border-claude-orange focus:outline-none"
                placeholder="Optional: /path/to/project"
              />
              <button
                onClick={handleSelectDirectory}
                className="px-3 py-1.5 bg-claude-hover border border-claude-border rounded text-xs font-mono text-claude-text hover:bg-claude-border transition-colors"
              >
                Select Folder
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono text-claude-text mb-1">Notifications</label>
            <select
              value={notifications}
              onChange={(e) => setNotifications(e.target.value as 'start' | 'end' | 'both' | 'none')}
              className="w-full px-3 py-1.5 bg-claude-gray border border-claude-border rounded text-xs font-mono text-claude-text focus:border-claude-orange focus:outline-none"
            >
              <option value="both">Start & End</option>
              <option value="start">Start Only</option>
              <option value="end">End Only</option>
              <option value="none">None</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-mono text-claude-text mb-1">Schedule Type</label>
            <select
              value={scheduleType}
              onChange={(e) => setScheduleType(e.target.value as any)}
              className="w-full px-3 py-1.5 bg-claude-gray border border-claude-border rounded text-xs font-mono text-claude-text focus:border-claude-orange focus:outline-none"
            >
              <option value="manual">Manual (Run on demand)</option>
              <option value="interval">Interval</option>
              <option value="calendar">Daily at specific time</option>
              <option value="startup">On Startup</option>
              <option value="file-watch">File Watch</option>
            </select>
          </div>

          {scheduleType === 'interval' && (
            <div className="flex space-x-2">
              <div className="flex-1">
                <label className="block text-xxs font-mono text-claude-muted mb-1">Hours</label>
                <input
                  type="number"
                  value={interval.hours}
                  onChange={(e) => setInterval({ ...interval, hours: parseInt(e.target.value) || 0 })}
                  className="w-full px-2 py-1 bg-claude-gray border border-claude-border rounded text-xs font-mono text-claude-text"
                  min="0"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xxs font-mono text-claude-muted mb-1">Minutes</label>
                <input
                  type="number"
                  value={interval.minutes}
                  onChange={(e) => setInterval({ ...interval, minutes: parseInt(e.target.value) || 0 })}
                  className="w-full px-2 py-1 bg-claude-gray border border-claude-border rounded text-xs font-mono text-claude-text"
                  min="0"
                  max="59"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xxs font-mono text-claude-muted mb-1">Seconds</label>
                <input
                  type="number"
                  value={interval.seconds}
                  onChange={(e) => setInterval({ ...interval, seconds: parseInt(e.target.value) || 0 })}
                  className="w-full px-2 py-1 bg-claude-gray border border-claude-border rounded text-xs font-mono text-claude-text"
                  min="0"
                  max="59"
                />
              </div>
            </div>
          )}

          {scheduleType === 'calendar' && (
            <div>
              <label className="block text-xxs font-mono text-claude-muted mb-1">Run daily at:</label>
              <input
                type="time"
                value={calendarTime}
                onChange={(e) => setCalendarTime(e.target.value)}
                className="w-full px-3 py-1.5 bg-claude-gray border border-claude-border rounded text-xs font-mono text-claude-text focus:border-claude-orange focus:outline-none"
              />
            </div>
          )}

          <div className="space-y-2">
            <div>
              <label className="block text-xs font-mono text-claude-text mb-1">Claude Model</label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full px-3 py-1.5 bg-claude-gray border border-claude-border rounded text-xs font-mono text-claude-text focus:border-claude-orange focus:outline-none"
              >
                <option value="sonnet">Sonnet (default)</option>
                <option value="opus">Opus</option>
                <option value="haiku">Haiku</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-mono text-claude-text mb-1">Permission Mode</label>
              <select
                value={permissionMode}
                onChange={(e) => setPermissionMode(e.target.value)}
                className="w-full px-3 py-1.5 bg-claude-gray border border-claude-border rounded text-xs font-mono text-claude-text focus:border-claude-orange focus:outline-none"
              >
                <option value="default">Default</option>
                <option value="plan">Plan Only</option>
                <option value="acceptEdits">Accept Edits</option>
                <option value="bypassPermissions">Bypass Permissions</option>
                <option value="dangerouslySkipPermissions">⚠️ Dangerously Skip All Permissions</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-mono text-claude-text mb-1">Session Options</label>
              <select
                value={sessionOptions}
                onChange={(e) => setSessionOptions(e.target.value as 'new' | 'reuse' | 'fork')}
                className="w-full px-3 py-1.5 bg-claude-gray border border-claude-border rounded text-xs font-mono text-claude-text focus:border-claude-accent focus:outline-none"
              >
                <option value="new">New session per run</option>
                <option value="reuse">Reuse existing session</option>
                <option value="fork">Fork from session</option>
              </select>
            </div>

            {(sessionOptions === 'reuse' || sessionOptions === 'fork') && (
              <div>
                <label className="block text-xxs font-mono text-claude-muted mb-1">Initial Session ID</label>
                {availableSessions.length > 0 ? (
                  <select
                    value={initialSessionId}
                    onChange={(e) => setInitialSessionId(e.target.value)}
                    className="w-full px-3 py-1.5 bg-claude-gray border border-claude-border rounded text-xs font-mono text-claude-text focus:border-claude-accent focus:outline-none"
                  >
                    <option value="">Select a session...</option>
                    {availableSessions.map(sessionId => (
                      <option key={sessionId} value={sessionId}>
                        {sessionId}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={initialSessionId}
                    onChange={(e) => setInitialSessionId(e.target.value)}
                    className="w-full px-3 py-1.5 bg-claude-gray border border-claude-border rounded text-xs font-mono text-claude-text focus:border-claude-accent focus:outline-none"
                    placeholder="Enter Claude session ID..."
                  />
                )}
              </div>
            )}
          </div>

          <div>
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-xs font-mono text-claude-accent hover:text-claude-orange transition-colors"
            >
              {showAdvanced ? '▼' : '▶'} Advanced Options
            </button>
            
            {showAdvanced && (
              <div className="mt-3 p-3 bg-claude-gray rounded border border-claude-border space-y-3">
                <div>
                  <label className="block text-xxs font-mono text-claude-muted mb-1">Output Format</label>
                  <select
                    value={outputFormat}
                    onChange={(e) => setOutputFormat(e.target.value)}
                    className="w-full px-2 py-1 bg-claude-darker border border-claude-border rounded text-xs font-mono text-claude-text"
                  >
                    <option value="text">Text</option>
                    <option value="json">JSON</option>
                    <option value="stream-json">Stream JSON</option>
                  </select>
                </div>

                <div className="flex items-center space-x-4">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={verbose}
                      onChange={(e) => setVerbose(e.target.checked)}
                      className="w-3 h-3 rounded border-claude-border bg-claude-dark"
                    />
                    <span className="text-xs font-mono text-claude-text">Verbose</span>
                  </label>

                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={debug}
                      onChange={(e) => setDebug(e.target.checked)}
                      className="w-3 h-3 rounded border-claude-border bg-claude-dark"
                    />
                    <span className="text-xs font-mono text-claude-text">Debug</span>
                  </label>
                </div>

                <div>
                  <label className="block text-xxs font-mono text-claude-muted mb-1">
                    Additional Directories (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={addDir.join(', ')}
                    onChange={(e) => setAddDir(e.target.value.split(',').map(d => d.trim()))}
                    className="w-full px-2 py-1 bg-claude-darker border border-claude-border rounded text-xs font-mono text-claude-text"
                    placeholder="/path/to/dir1, /path/to/dir2"
                  />
                </div>

                <div>
                  <label className="block text-xxs font-mono text-claude-muted mb-1">
                    Allowed Tools (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={allowedTools.join(', ')}
                    onChange={(e) => setAllowedTools(e.target.value.split(',').map(t => t.trim()))}
                    className="w-full px-2 py-1 bg-claude-darker border border-claude-border rounded text-xs font-mono text-claude-text"
                    placeholder="Bash, Edit, Read"
                  />
                </div>

                <div>
                  <label className="block text-xxs font-mono text-claude-muted mb-1">
                    Disallowed Tools (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={disallowedTools.join(', ')}
                    onChange={(e) => setDisallowedTools(e.target.value.split(',').map(t => t.trim()))}
                    className="w-full px-2 py-1 bg-claude-darker border border-claude-border rounded text-xs font-mono text-claude-text"
                    placeholder="Bash(git:*), Edit"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}