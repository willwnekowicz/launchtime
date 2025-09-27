import React, { useState } from 'react'
import { ConfirmModal } from './ConfirmModal'
import type { ClaudeTask } from '../types'
import logoSvg from '../../../resources/icons/runCLAUDErun_logo.svg'

interface TaskListProps {
  tasks: ClaudeTask[]
  selectedTask: ClaudeTask | null
  isCreatingNew: boolean
  loading: boolean
  compactMode?: boolean
  onSelectTask: (task: ClaudeTask) => void
  onNewTask: () => void
  onToggleTask: (taskId: string, enabled: boolean) => void
  onRunTask: (taskId: string) => void
  onViewLogs: (task: ClaudeTask, runId?: string) => void
  onDeleteTask?: (taskId: string) => void
}

export function TaskList({
  tasks,
  selectedTask,
  isCreatingNew,
  loading,
  compactMode = false,
  onSelectTask,
  onNewTask,
  onToggleTask,
  onRunTask,
  onViewLogs,
  onDeleteTask
}: TaskListProps) {
  const [hoveredRun, setHoveredRun] = useState<{ taskId: string, runId: string } | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; task: ClaudeTask | null }>({ isOpen: false, task: null })

  const getRunIndicatorColor = (exitCode?: number) => {
    if (exitCode === undefined) return 'bg-yellow-400' // Running
    if (exitCode === 0) return 'bg-claude-success'
    return 'bg-claude-error'
  }

  const getLastRuns = (task: ClaudeTask, limit = 5) => {
    if (!task.runHistory || task.runHistory.length === 0) return []
    return task.runHistory
      .slice()
      .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
      .slice(0, limit)
  }

  return (
    <div className="h-full flex flex-col relative">
      {/* Header with logo and title */}
      <div className="h-10 px-3 flex items-center border-b border-claude-border bg-claude-gray">
        <div className="flex items-center space-x-2">
          <img src={logoSvg} alt="runCLAUDErun" className="w-6 h-6 brightness-0 invert" />
          <span className="text-sm font-mono text-claude-text">runCLAUDErun</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-center text-xs text-claude-muted">Loading tasks...</div>
        ) : tasks.length === 0 ? (
          <div className="p-4 text-center text-xs text-claude-muted">
            No tasks yet. Create your first Claude task!
          </div>
        ) : (
          <div className="py-1">
            {tasks.map(task => {
              const lastRuns = getLastRuns(task)
              return (
                <div
                  key={task.id}
                  className={`group px-2 ${compactMode ? 'py-0.5' : 'py-1.5'} cursor-pointer hover:bg-claude-hover transition-colors ${
                    selectedTask?.id === task.id && !isCreatingNew ? 'bg-claude-hover' : ''
                  }`}
                  onClick={() => onSelectTask(task)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-1.5">
                        <div className="relative group/toggle">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              onToggleTask(task.id, !task.enabled)
                            }}
                            className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors ${
                              task.enabled ? 'bg-green-500' : 'bg-gray-400'
                            }`}
                          >
                            <span
                              className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                                task.enabled ? 'translate-x-3.5' : 'translate-x-0.5'
                              }`}
                            />
                          </button>
                          <div className="absolute left-0 top-5 z-10 hidden group-hover/toggle:block bg-claude-dark border border-claude-border rounded p-1 text-xxs text-claude-muted whitespace-nowrap">
                            {task.enabled ? 'Scheduled - Click to disable' : 'Disabled - Click to enable'}
                          </div>
                        </div>
                        <span className="text-xs font-mono text-claude-text truncate">
                          {task.label}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2 mt-0.5">
                        <span className="text-xxs text-claude-muted">
                          {task.schedule.type === 'manual' && 'Manual'}
                          {task.schedule.type === 'interval' && `Every ${formatInterval(task.schedule.interval)}`}
                          {task.schedule.type === 'calendar' && 'Daily'}
                          {task.schedule.type === 'startup' && 'On Startup'}
                          {task.schedule.type === 'file-watch' && 'File Watch'}
                        </span>
                        {task.flags.model && (
                          <span className="text-xxs text-claude-accent">{task.flags.model}</span>
                        )}
                      </div>
                      
                      {/* Run indicators - always reserve space */}
                      <div className="flex items-center space-x-1 mt-1 h-4">
                        {lastRuns.length > 0 ? (
                          <>
                            <span className="text-xxs text-claude-muted mr-1">Recent:</span>
                            {lastRuns.map((run, idx) => (
                              <div
                                key={run.id}
                                className="relative group/run"
                                onMouseEnter={() => setHoveredRun({ taskId: task.id, runId: run.id })}
                                onMouseLeave={() => setHoveredRun(null)}
                              >
                                <div className={`w-2 h-2 rounded-full ${getRunIndicatorColor(run.exitCode)}`} />
                                {hoveredRun?.taskId === task.id && hoveredRun?.runId === run.id && (
                                  <div className="absolute bottom-3 left-0 z-20 bg-claude-dark border border-claude-border rounded p-2 text-xxs text-claude-text whitespace-nowrap">
                                    <div>{new Date(run.startTime).toLocaleString()}</div>
                                    <div>Status: {run.exitCode === undefined ? 'Running' : run.exitCode === 0 ? 'Success' : `Failed (${run.exitCode})`}</div>
                                    {run.endTime && (
                                      <div>Duration: {Math.round((new Date(run.endTime).getTime() - new Date(run.startTime).getTime()) / 1000)}s</div>
                                    )}
                                  </div>
                                )}
                              </div>
                            ))}
                          </>
                        ) : (
                          <span className="text-xxs text-claude-muted italic">No runs yet</span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onRunTask(task.id)
                        }}
                        className="p-1 hover:bg-claude-border rounded transition-colors"
                        title="Run Now"
                      >
                        <svg className="w-3 h-3 text-claude-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          if (task.runHistory && task.runHistory.length > 0) {
                            const lastRun = task.runHistory[task.runHistory.length - 1]
                            onViewLogs(task, lastRun.id)
                          }
                        }}
                        className="p-1 hover:bg-claude-border rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="View Last Run Log"
                        disabled={!task.runHistory || task.runHistory.length === 0}
                      >
                        <svg className="w-3 h-3 text-claude-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </button>
                      {onDeleteTask && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setDeleteConfirm({ isOpen: true, task })
                          }}
                          className="p-1 hover:bg-claude-error/20 rounded transition-colors"
                          title="Delete Task"
                        >
                          <svg className="w-3 h-3 text-claude-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
      
      {/* Floating New Task Button */}
      <button
        onClick={onNewTask}
        className="absolute bottom-4 right-4 w-10 h-10 bg-claude-accent hover:bg-claude-orange text-white rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-110 z-10"
        title="New Claude Task (⌘N)"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
        </svg>
      </button>
      
      {/* Delete confirmation modal */}
      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        title="Delete Task"
        message={`Delete task "${deleteConfirm.task?.label}" and all its run history? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        onConfirm={() => {
          if (deleteConfirm.task && onDeleteTask) {
            onDeleteTask(deleteConfirm.task.id)
          }
          setDeleteConfirm({ isOpen: false, task: null })
        }}
        onCancel={() => setDeleteConfirm({ isOpen: false, task: null })}
      />
    </div>
  )
}

function formatInterval(interval?: { seconds?: number; minutes?: number; hours?: number }): string {
  if (!interval) return 'interval'
  
  const parts = []
  if (interval.hours) parts.push(`${interval.hours}h`)
  if (interval.minutes) parts.push(`${interval.minutes}m`)
  if (interval.seconds) parts.push(`${interval.seconds}s`)
  
  return parts.join(' ') || 'interval'
}