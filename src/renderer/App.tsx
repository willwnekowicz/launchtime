import React, { useState, useEffect } from 'react'
import { ClaudeInstaller } from './components/ClaudeInstaller'
import { TaskList } from './components/TaskList'
import { ClaudeTaskEditor } from './components/ClaudeTaskEditor'
import { RunsView } from './components/RunsView'
import { Header } from './components/Header'
import { Settings } from './components/Settings'
import { KeyboardShortcuts } from './components/KeyboardShortcuts'
import type { ClaudeTask } from './types'

export function App() {
  const [claudeInstalled, setClaudeInstalled] = useState<boolean | null>(null)
  const [claudeVersion, setClaudeVersion] = useState<string | undefined>()
  const [tasks, setTasks] = useState<ClaudeTask[]>([])
  const [selectedTask, setSelectedTask] = useState<ClaudeTask | null>(null)
  const [isCreatingNew, setIsCreatingNew] = useState(false)
  const [showAllRuns, setShowAllRuns] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [showLogs, setShowLogs] = useState(false)
  const [selectedRunId, setSelectedRunId] = useState<string | undefined>()
  const [loading, setLoading] = useState(true)
  const [compactMode, setCompactMode] = useState(false)

  // Initial setup effect - runs once on mount
  useEffect(() => {
    document.documentElement.classList.add('dark')
    checkClaudeInstallation()
    loadTasks()
    loadSettings()
  }, [])

  // Keyboard shortcuts effect - separate to avoid re-running initial setup
  useEffect(() => {
    // Set up keyboard shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + N: New Task
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault()
        setIsCreatingNew(true)
        setSelectedTask(null)
        setShowLogs(false)
        setShowAllRuns(false)
        setShowSettings(false)
      }
      
      // Cmd/Ctrl + R: Refresh/Reload tasks
      if ((e.metaKey || e.ctrlKey) && e.key === 'r') {
        e.preventDefault()
        loadTasks()
      }
      
      // Cmd/Ctrl + L: Show all runs/logs
      if ((e.metaKey || e.ctrlKey) && e.key === 'l') {
        e.preventDefault()
        setShowAllRuns(true)
        setShowSettings(false)
      }
      
      // Cmd/Ctrl + ,: Settings
      if ((e.metaKey || e.ctrlKey) && e.key === ',') {
        e.preventDefault()
        setShowSettings(true)
        setShowAllRuns(false)
      }
      
      // Cmd/Ctrl + E: Edit selected task (deprecated - always in edit mode)
      if ((e.metaKey || e.ctrlKey) && e.key === 'e' && selectedTask) {
        e.preventDefault()
        // Task is already in edit mode when selected
      }
      
      // Cmd/Ctrl + Enter: Run selected task
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && selectedTask) {
        e.preventDefault()
        handleRunTask(selectedTask.id)
      }
      
      // Escape: Close modals/editors
      if (e.key === 'Escape') {
        if (showShortcuts) {
          setShowShortcuts(false)
        } else if (showSettings) {
          setShowSettings(false)
        } else if (showAllRuns) {
          setShowAllRuns(false)
        } else if (showLogs) {
          setShowLogs(false)
        } else if (isCreatingNew) {
          setIsCreatingNew(false)
        } else if (selectedTask) {
          setSelectedTask(null)
        }
      }
      
      // Arrow keys for task navigation (when not in input)
      if (!isCreatingNew && !showSettings && !selectedTask) {
        if (e.key === 'ArrowDown') {
          e.preventDefault()
          const currentIndex = tasks.findIndex(t => t.id === selectedTask?.id)
          if (currentIndex < tasks.length - 1) {
            const nextTask = tasks[currentIndex + 1]
            setSelectedTask(nextTask)
            setShowLogs(false)
          } else if (currentIndex === -1 && tasks.length > 0) {
            setSelectedTask(tasks[0])
            setShowLogs(false)
          }
        }
        
        if (e.key === 'ArrowUp') {
          e.preventDefault()
          const currentIndex = tasks.findIndex(t => t.id === selectedTask?.id)
          if (currentIndex > 0) {
            const prevTask = tasks[currentIndex - 1]
            setSelectedTask(prevTask)
            setShowLogs(false)
          }
        }
      }
      
      // Cmd/Ctrl + ? or just ?: Show keyboard shortcuts
      if (((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === '/') || 
          ((e.metaKey || e.ctrlKey) && e.key === '?') ||
          (e.key === '?' && !isCreatingNew && !selectedTask)) {
        e.preventDefault()
        setShowShortcuts(true)
      }
      
      // Cmd/Ctrl + K: Quick search (future feature placeholder)
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        // TODO: Implement quick search
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [selectedTask, tasks, isCreatingNew, showSettings, showAllRuns, showShortcuts])

  // IPC event listeners effect - runs once on mount
  useEffect(() => {
    if (window.runclauderun) {
      const handleNewTask = () => {
        setIsCreatingNew(true)
        setSelectedTask(null)
        setShowLogs(false)
      }

      const handleTasksUpdated = () => {
        loadTasks()
      }

      const handleClaudeStatus = (status: { installed: boolean; version?: string }) => {
        setClaudeInstalled(status.installed)
        setClaudeVersion(status.version)
      }

      const handleRunStarted = (data: { taskId: string; runId: string; task: ClaudeTask }) => {
        // Update the task in our state with the new run
        setTasks(prevTasks => {
          const updatedTasks = [...prevTasks]
          const taskIndex = updatedTasks.findIndex(t => t.id === data.taskId)
          if (taskIndex !== -1) {
            updatedTasks[taskIndex] = data.task
          }
          return updatedTasks
        })
        
        // Switch to live log view
        setSelectedTask(data.task)
        setSelectedRunId(data.runId)
        setShowLogs(true)
        setIsCreatingNew(false)
        setShowAllRuns(false)
      }

      window.runclauderun.on('new-task', handleNewTask)
      window.runclauderun.on('tasks-updated', handleTasksUpdated)
      window.runclauderun.on('claude-status', handleClaudeStatus)
      window.runclauderun.on('run-started', handleRunStarted)

      // Cleanup function to remove listeners
      return () => {
        window.runclauderun.off('new-task', handleNewTask)
        window.runclauderun.off('tasks-updated', handleTasksUpdated)
        window.runclauderun.off('claude-status', handleClaudeStatus)
        window.runclauderun.off('run-started', handleRunStarted)
      }
    }
  }, [])

  const checkClaudeInstallation = async () => {
    try {
      const status = await window.runclauderun.claude.checkInstallation()
      setClaudeInstalled(status.installed)
      setClaudeVersion(status.version)
    } catch (error) {
      console.error('Failed to check Claude installation:', error)
      setClaudeInstalled(false)
    }
  }

  const loadTasks = async () => {
    setLoading(true)
    try {
      const loadedTasks = await window.runclauderun.claude.list()
      setTasks(loadedTasks)
    } catch (error) {
      console.error('Failed to load tasks:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadSettings = async () => {
    try {
      const prefs = await window.runclauderun.preferences.get()
      if (prefs?.appearance?.compactMode) {
        setCompactMode(prefs.appearance.compactMode)
      }
    } catch (error) {
      console.error('Failed to load settings:', error)
    }
  }

  const handleInstallComplete = () => {
    setClaudeInstalled(true)
    checkClaudeInstallation()
  }

  const handleCreateTask = async (task: Omit<ClaudeTask, 'id' | 'runHistory'>) => {
    const result = await window.runclauderun.claude.create(task)
    if (result.success) {
      await loadTasks()
      setIsCreatingNew(false)
      setSelectedTask(result.data) // Show the newly created task
    } else {
      alert(`Failed to create task: ${result.error}`)
    }
  }

  const handleUpdateTask = async (taskId: string, updates: Partial<ClaudeTask>) => {
    const result = await window.runclauderun.claude.update(taskId, updates)
    if (result.success) {
      await loadTasks()
      setSelectedTask(result.data) // Show the updated task
    } else {
      alert(`Failed to update task: ${result.error}`)
    }
  }

  const handleDeleteTask = async (taskId: string) => {
    const result = await window.runclauderun.claude.delete(taskId)
    if (result.success) {
      await loadTasks()
      setSelectedTask(null)
      setIsCreatingNew(false)
    } else {
      alert(`Failed to delete task: ${result.error}`)
    }
  }

  const handleToggleTask = async (taskId: string, enabled: boolean) => {
    const result = await window.runclauderun.claude.toggle(taskId, enabled)
    if (result.success) {
      await loadTasks()
      if (selectedTask?.id === taskId) {
        setSelectedTask(result.data)
      }
    } else {
      alert(`Failed to toggle task: ${result.error}`)
    }
  }

  const handleRunTask = async (taskId: string) => {
    const result = await window.runclauderun.claude.run(taskId)
    if (result.success && result.runId) {
      await loadTasks()
      const task = tasks.find(t => t.id === taskId)
      if (task) {
        setSelectedTask(task)
      }
    } else {
      alert(`Failed to run task: ${result.error}`)
    }
  }

  const handleViewLogs = (task: ClaudeTask, runId?: string) => {
    // Open the runs view for this task
    setSelectedTask(task)
    setIsCreatingNew(false)
    setShowAllRuns(false)
  }

  if (claudeInstalled === false) {
    return (
      <div className="h-screen bg-claude-dark">
        <Header />
        <ClaudeInstaller onInstallComplete={handleInstallComplete} />
      </div>
    )
  }

  if (claudeInstalled === null) {
    return (
      <div className="h-screen bg-claude-dark flex items-center justify-center">
        <div className="text-claude-text">Checking Claude installation...</div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-claude-dark">
      <Header />
      
      {/* Keyboard Shortcuts Modal */}
      {showShortcuts && (
        <KeyboardShortcuts onClose={() => setShowShortcuts(false)} />
      )}
      
      <div className="flex-1 flex overflow-hidden">
        {/* Tasks Sidebar */}
        <div className="w-72 border-r border-claude-border bg-claude-gray flex flex-col">
          <TaskList
            tasks={tasks}
            selectedTask={selectedTask}
            isCreatingNew={isCreatingNew}
            loading={loading}
            compactMode={compactMode}
            onSelectTask={(task) => {
              setSelectedTask(task)
              setIsCreatingNew(false)
              setShowAllRuns(false)
            }}
            onNewTask={() => {
              setIsCreatingNew(true)
              setSelectedTask(null)
              setShowAllRuns(false)
            }}
            onToggleTask={handleToggleTask}
            onRunTask={handleRunTask}
            onViewLogs={handleViewLogs}
            onDeleteTask={handleDeleteTask}
          />
          
          {/* Footer with version and runs button */}
          <div className="p-2 border-t border-claude-border bg-claude-gray">
            <button
              onClick={() => {
                setShowAllRuns(true)
                setSelectedTask(null)
              }}
              className="w-full px-2 py-1 bg-claude-hover hover:bg-claude-border text-claude-text font-mono text-xs rounded transition-colors mb-1"
            >
              View All Runs
            </button>
            <button
              onClick={() => setShowSettings(true)}
              className="w-full px-2 py-1 bg-claude-hover hover:bg-claude-border text-claude-text font-mono text-xs rounded transition-colors mb-1"
            >
              Settings
            </button>
            <div className="text-xxs text-claude-muted text-center">
              {claudeVersion && `Claude ${claudeVersion}`}
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-hidden">
          {showSettings ? (
            <Settings
              onClose={() => {
                setShowSettings(false)
                loadSettings()
              }}
            />
          ) : isCreatingNew ? (
            <ClaudeTaskEditor
              task={null}
              isNew={true}
              onSave={handleCreateTask}
              onCancel={() => {
                setIsCreatingNew(false)
              }}
            />
          ) : (
            <RunsView
              tasks={tasks}
              selectedTask={showAllRuns ? null : selectedTask}
              onClose={() => {
                setShowAllRuns(false)
                setSelectedTask(null)
              }}
              onRefresh={loadTasks}
              onRunTask={(task) => handleRunTask(task.id)}
              onEditTask={(task) => {
                // TODO: Implement edit
                window.alert('Edit functionality to be implemented')
              }}
              onDeleteTask={(task) => handleDeleteTask(task.id)}
            />
          )}
        </div>
      </div>
    </div>
  )
}