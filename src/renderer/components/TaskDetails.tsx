import React, { useState } from 'react'
import type { ClaudeTask } from '../types'

interface TaskDetailsProps {
  task: ClaudeTask
  onEdit: () => void
  onDelete: () => void
  onRun: () => void
  onViewLogs: (runId: string) => void
}

export function TaskDetails({ task, onEdit, onDelete, onRun, onViewLogs }: TaskDetailsProps) {
  const [showRuns, setShowRuns] = useState(false)
  
  const calculateUpcomingRuns = (schedule: ClaudeTask['schedule'], count = 3): Date[] => {
    const runs: Date[] = []
    const now = new Date()
    
    switch (schedule.type) {
      case 'interval':
        if (schedule.interval) {
          const intervalMs = 
            ((schedule.interval.hours || 0) * 3600 +
             (schedule.interval.minutes || 0) * 60 +
             (schedule.interval.seconds || 0)) * 1000
          
          if (intervalMs > 0) {
            for (let i = 1; i <= count; i++) {
              runs.push(new Date(now.getTime() + intervalMs * i))
            }
          }
        }
        break
      
      case 'calendar':
        if (schedule.calendar) {
          const hour = schedule.calendar.hour || 0
          const minute = schedule.calendar.minute || 0
          
          for (let i = 0; i < count; i++) {
            const nextRun = new Date()
            nextRun.setDate(nextRun.getDate() + i)
            nextRun.setHours(hour, minute, 0, 0)
            
            if (nextRun > now) {
              runs.push(nextRun)
            } else if (i === 0) {
              // If today's run has passed, add tomorrow's
              nextRun.setDate(nextRun.getDate() + 1)
              runs.push(nextRun)
            }
          }
        }
        break
      
      case 'startup':
        runs.push(new Date(now.getTime() + 60000)) // Next system startup (approximation)
        break
    }
    
    return runs.slice(0, count)
  }
  
  const formatSchedule = (schedule: ClaudeTask['schedule']) => {
    switch (schedule.type) {
      case 'manual':
        return 'Manual'
      case 'interval':
        if (schedule.interval) {
          const parts = []
          if (schedule.interval.hours) parts.push(`${schedule.interval.hours}h`)
          if (schedule.interval.minutes) parts.push(`${schedule.interval.minutes}m`)
          if (schedule.interval.seconds) parts.push(`${schedule.interval.seconds}s`)
          return `Every ${parts.join(' ')}`
        }
        return 'Interval'
      case 'calendar':
        if (schedule.calendar) {
          return `At ${schedule.calendar.hour || 0}:${String(schedule.calendar.minute || 0).padStart(2, '0')}`
        }
        return 'Calendar'
      case 'startup':
        return 'On Startup'
      case 'file-watch':
        return 'File Watch'
      default:
        return 'Unknown'
    }
  }

  const formatFlags = (flags: ClaudeTask['flags']) => {
    const activeFlags = []
    if (flags.model) activeFlags.push(`Model: ${flags.model}`)
    if (flags.permissionMode && flags.permissionMode !== 'default') {
      activeFlags.push(`Permission: ${flags.permissionMode}`)
    }
    if (flags.dangerouslySkipPermissions) activeFlags.push('Skip Permissions')
    if (flags.verbose) activeFlags.push('Verbose')
    if (flags.debug) activeFlags.push('Debug')
    return activeFlags
  }

  const recentRuns = (task.runHistory || []).slice(0, 5).sort((a, b) => 
    new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
  )

  return (
    <div className="h-full flex flex-col bg-claude-darker">
      {/* Header */}
      <div className="border-b border-claude-border bg-claude-gray p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <h2 className="text-lg font-mono text-claude-text">{task.label}</h2>
            <span className={`px-2 py-0.5 text-xs font-mono rounded ${
              task.enabled ? 'bg-green-900 text-green-400' : 'bg-red-900 text-red-400'
            }`}>
              {task.enabled ? 'Active' : 'Inactive'}
            </span>
            <span className="px-2 py-0.5 text-xs font-mono rounded bg-claude-hover text-claude-muted">
              {formatSchedule(task.schedule)}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={onRun}
              className="px-3 py-1 bg-green-900 hover:bg-green-800 text-green-400 font-mono text-xs rounded transition-colors"
            >
              Run Now
            </button>
            <button
              onClick={onEdit}
              className="px-3 py-1 bg-claude-orange hover:bg-claude-accent text-white font-mono text-xs rounded transition-colors"
            >
              Edit
            </button>
            <button
              onClick={onDelete}
              className="px-3 py-1 bg-red-900 hover:bg-red-800 text-red-400 font-mono text-xs rounded transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {/* Prompt/Command */}
        <div className="mb-6">
          <h3 className="text-xs font-mono text-claude-muted mb-2">PROMPT</h3>
          <div className="bg-claude-gray rounded p-3 border border-claude-border">
            <pre className="text-xs font-mono text-claude-text whitespace-pre-wrap">
              {task.prompt}
            </pre>
          </div>
        </div>

        {/* Configuration */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {/* Working Directory */}
          {task.workingDirectory && (
            <div>
              <h3 className="text-xs font-mono text-claude-muted mb-2">WORKING DIRECTORY</h3>
              <div className="bg-claude-gray rounded p-2 border border-claude-border">
                <span className="text-xs font-mono text-claude-text">{task.workingDirectory}</span>
              </div>
            </div>
          )}

          {/* Session */}
          {task.useExistingSession && task.sessionId && (
            <div>
              <h3 className="text-xs font-mono text-claude-muted mb-2">SESSION</h3>
              <div className="bg-claude-gray rounded p-2 border border-claude-border">
                <span className="text-xs font-mono text-claude-text">{task.sessionId}</span>
              </div>
            </div>
          )}

          {/* Flags */}
          {formatFlags(task.flags).length > 0 && (
            <div className="col-span-2">
              <h3 className="text-xs font-mono text-claude-muted mb-2">FLAGS</h3>
              <div className="flex flex-wrap gap-2">
                {formatFlags(task.flags).map((flag, i) => (
                  <span key={i} className="px-2 py-1 bg-claude-gray rounded text-xs font-mono text-claude-text border border-claude-border">
                    {flag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Environment Variables */}
          {task.environment && Object.keys(task.environment).length > 0 && (
            <div className="col-span-2">
              <h3 className="text-xs font-mono text-claude-muted mb-2">ENVIRONMENT VARIABLES</h3>
              <div className="bg-claude-gray rounded p-2 border border-claude-border">
                {Object.entries(task.environment).map(([key, value]) => (
                  <div key={key} className="text-xs font-mono text-claude-text">
                    <span className="text-claude-orange">{key}</span>=<span className="text-green-400">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Upcoming Runs */}
        {task.schedule.type !== 'manual' && task.enabled && (
          <div className="mb-6">
            <h3 className="text-xs font-mono text-claude-muted mb-2">UPCOMING RUNS</h3>
            <div className="bg-claude-gray rounded p-3 border border-claude-border">
              {calculateUpcomingRuns(task.schedule).length > 0 ? (
                <div className="space-y-1">
                  {calculateUpcomingRuns(task.schedule).map((date, i) => (
                    <div key={i} className="flex items-center space-x-2">
                      <span className="text-xxs text-claude-accent">→</span>
                      <span className="text-xs font-mono text-claude-text">
                        {date.toLocaleString()}
                      </span>
                      <span className="text-xxs text-claude-muted">
                        (in {Math.round((date.getTime() - Date.now()) / 60000)} min)
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs font-mono text-claude-muted">Schedule not configured</p>
              )}
            </div>
          </div>
        )}

        {/* Recent Runs */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-mono text-claude-muted">RECENT RUNS</h3>
            {task.runHistory && task.runHistory.length > 5 && (
              <button
                onClick={() => setShowRuns(!showRuns)}
                className="text-xs font-mono text-claude-orange hover:text-claude-accent transition-colors"
              >
                {showRuns ? 'Show Less' : `Show All (${task.runHistory.length})`}
              </button>
            )}
          </div>
          
          {recentRuns.length === 0 ? (
            <div className="bg-claude-gray rounded p-3 border border-claude-border">
              <p className="text-xs font-mono text-claude-muted text-center">No runs yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {(showRuns ? task.runHistory || [] : recentRuns).map(run => (
                <div
                  key={run.id}
                  onClick={() => onViewLogs(run.id)}
                  className="bg-claude-gray rounded p-3 border border-claude-border hover:bg-claude-hover cursor-pointer transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span className={`inline-block w-2 h-2 rounded-full ${
                        run.exitCode === undefined ? 'bg-yellow-400' : 
                        run.exitCode === 0 ? 'bg-green-400' : 'bg-red-400'
                      }`} />
                      <span className="text-xs font-mono text-claude-text">
                        {new Date(run.startTime).toLocaleString()}
                      </span>
                      {run.endTime && (
                        <span className="text-xxs font-mono text-claude-muted">
                          ({Math.round((new Date(run.endTime).getTime() - new Date(run.startTime).getTime()) / 1000)}s)
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-mono text-claude-orange hover:text-claude-accent">
                      View Logs →
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}