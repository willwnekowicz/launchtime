import React from 'react'
import type { LaunchdTask } from '../../shared/types'

interface TaskListProps {
  tasks: LaunchdTask[]
  selectedTask: LaunchdTask | null
  isCreatingNew: boolean
  loading: boolean
  onSelectTask: (task: LaunchdTask) => void
  onNewTask: () => void
  onToggleTask: (taskId: string, enabled: boolean) => void
}

export function TaskList({
  tasks,
  selectedTask,
  isCreatingNew,
  loading,
  onSelectTask,
  onNewTask,
  onToggleTask
}: TaskListProps) {
  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={onNewTask}
          className="w-full btn-primary flex items-center justify-center space-x-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>New Task</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-center text-gray-500">Loading tasks...</div>
        ) : tasks.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            <p className="mb-2">No scheduled tasks yet</p>
            <p className="text-sm">Create your first task to get started</p>
          </div>
        ) : (
          <div className="p-2">
            {tasks.map(task => (
              <div
                key={task.id}
                onClick={() => onSelectTask(task)}
                className={`
                  mb-2 p-3 rounded-lg cursor-pointer transition-all
                  ${selectedTask?.id === task.id && !isCreatingNew
                    ? 'bg-launchtime-blue text-white'
                    : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }
                `}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className={`font-medium truncate ${
                      selectedTask?.id === task.id && !isCreatingNew ? 'text-white' : 'text-gray-900 dark:text-gray-100'
                    }`}>
                      {task.label}
                    </h3>
                    <p className={`text-sm mt-1 truncate ${
                      selectedTask?.id === task.id && !isCreatingNew ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'
                    }`}>
                      {task.command}
                    </p>
                    <div className="flex items-center mt-2 space-x-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        selectedTask?.id === task.id && !isCreatingNew
                          ? 'bg-blue-600 text-blue-100'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                      }`}>
                        {task.schedule.type}
                      </span>
                      {task.schedule.type === 'interval' && (
                        <span className={`text-xs ${
                          selectedTask?.id === task.id && !isCreatingNew ? 'text-blue-100' : 'text-gray-500'
                        }`}>
                          Every {task.schedule.interval} seconds
                        </span>
                      )}
                    </div>
                  </div>
                  <div
                    className="ml-2 non-draggable"
                    onClick={(e) => {
                      e.stopPropagation()
                      onToggleTask(task.id, !task.enabled)
                    }}
                  >
                    <div className={`
                      w-12 h-6 rounded-full p-1 transition-colors cursor-pointer
                      ${task.enabled ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}
                    `}>
                      <div className={`
                        w-4 h-4 bg-white rounded-full transition-transform
                        ${task.enabled ? 'translate-x-6' : 'translate-x-0'}
                      `} />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}