import React, { useState, useEffect } from 'react'
import { TaskList } from './components/TaskList'
import { TaskEditor } from './components/TaskEditor'
import { Preferences } from './components/Preferences'
import { Header } from './components/Header'
import type { LaunchdTask } from '../shared/types'

export function App() {
  const [tasks, setTasks] = useState<LaunchdTask[]>([])
  const [selectedTask, setSelectedTask] = useState<LaunchdTask | null>(null)
  const [isCreatingNew, setIsCreatingNew] = useState(false)
  const [showPreferences, setShowPreferences] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadTasks()

    if (window.launchtime) {
      window.launchtime.on('new-task', () => {
        setIsCreatingNew(true)
        setSelectedTask(null)
      })

      window.launchtime.on('open-preferences', () => {
        setShowPreferences(true)
      })

      window.launchtime.on('focus-task', (taskId: string) => {
        const task = tasks.find(t => t.id === taskId)
        if (task) {
          setSelectedTask(task)
          setIsCreatingNew(false)
        }
      })

      window.launchtime.on('tasks-updated', () => {
        loadTasks()
      })
    }
  }, [])

  const loadTasks = async () => {
    setLoading(true)
    try {
      if (!window.launchtime || !window.launchtime.launchd) {
        setLoading(false)
        return
      }
      const loadedTasks = await window.launchtime.launchd.list()
      setTasks(loadedTasks)
    } catch (error) {
      console.error('Failed to load tasks:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateTask = async (task: Omit<LaunchdTask, 'id' | 'enabled'>) => {
    const result = await window.launchtime.launchd.create(task)
    if (result.success) {
      await loadTasks()
      setIsCreatingNew(false)
      setSelectedTask(result.data)
    } else {
      alert(`Failed to create task: ${result.error}`)
    }
  }

  const handleUpdateTask = async (taskId: string, updates: Partial<LaunchdTask>) => {
    const result = await window.launchtime.launchd.update(taskId, updates)
    if (result.success) {
      await loadTasks()
      setSelectedTask(result.data)
    } else {
      alert(`Failed to update task: ${result.error}`)
    }
  }

  const handleDeleteTask = async (taskId: string) => {
    if (confirm('Are you sure you want to delete this task?')) {
      const result = await window.launchtime.launchd.delete(taskId)
      if (result.success) {
        await loadTasks()
        setSelectedTask(null)
        setIsCreatingNew(false)
      } else {
        alert(`Failed to delete task: ${result.error}`)
      }
    }
  }

  const handleToggleTask = async (taskId: string, enabled: boolean) => {
    const result = await window.launchtime.launchd.toggle(taskId, enabled)
    if (result.success) {
      await loadTasks()
      if (selectedTask?.id === taskId) {
        setSelectedTask(result.data)
      }
    } else {
      alert(`Failed to toggle task: ${result.error}`)
    }
  }

  if (showPreferences) {
    return (
      <div className="h-screen flex flex-col bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <Header />
        <Preferences onClose={() => setShowPreferences(false)} />
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <Header />

      <div className="flex-1 flex overflow-hidden">
        <div className="w-80 border-r border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 backdrop-blur">
          <TaskList
            tasks={tasks}
            selectedTask={selectedTask}
            isCreatingNew={isCreatingNew}
            loading={loading}
            onSelectTask={(task) => {
              setSelectedTask(task)
              setIsCreatingNew(false)
            }}
            onNewTask={() => {
              setIsCreatingNew(true)
              setSelectedTask(null)
            }}
            onToggleTask={handleToggleTask}
          />
        </div>

        <div className="flex-1 overflow-auto">
          {(selectedTask || isCreatingNew) ? (
            <TaskEditor
              task={selectedTask}
              isNew={isCreatingNew}
              onSave={isCreatingNew ? handleCreateTask : (task) => handleUpdateTask(selectedTask!.id, task)}
              onDelete={selectedTask ? () => handleDeleteTask(selectedTask.id) : undefined}
              onCancel={() => {
                setSelectedTask(null)
                setIsCreatingNew(false)
              }}
            />
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <h2 className="text-2xl font-light text-gray-400 mb-4">No Task Selected</h2>
                <button
                  onClick={() => setIsCreatingNew(true)}
                  className="btn-primary"
                >
                  Create Your First Task
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}