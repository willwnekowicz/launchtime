import React, { useState, useEffect } from 'react'
import { ScheduleBuilder } from './ScheduleBuilder'
import type { LaunchdTask, Schedule } from '../../shared/types'

interface TaskEditorProps {
  task: LaunchdTask | null
  isNew: boolean
  onSave: (task: any) => void
  onDelete?: () => void
  onCancel: () => void
}

export function TaskEditor({ task, isNew, onSave, onDelete, onCancel }: TaskEditorProps) {
  const [formData, setFormData] = useState({
    label: '',
    command: '',
    schedule: {
      type: 'manual',
      enabled: false
    } as Schedule,
    workingDirectory: '',
    environmentVariables: {} as Record<string, string>,
    standardOutPath: '',
    standardErrorPath: ''
  })

  const [envVarInput, setEnvVarInput] = useState({ key: '', value: '' })
  const [showAdvanced, setShowAdvanced] = useState(false)

  useEffect(() => {
    if (task) {
      setFormData({
        label: task.label,
        command: task.command,
        schedule: task.schedule,
        workingDirectory: task.workingDirectory || '',
        environmentVariables: task.environmentVariables || {},
        standardOutPath: task.standardOutPath || '',
        standardErrorPath: task.standardErrorPath || ''
      })
      setShowAdvanced(
        !!task.workingDirectory ||
        !!task.standardOutPath ||
        !!task.standardErrorPath ||
        (task.environmentVariables && Object.keys(task.environmentVariables).length > 0)
      )
    } else {
      setFormData({
        label: '',
        command: '',
        schedule: { type: 'manual', enabled: false },
        workingDirectory: '',
        environmentVariables: {},
        standardOutPath: '',
        standardErrorPath: ''
      })
      setShowAdvanced(false)
    }
  }, [task])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.label || !formData.command) {
      alert('Please provide both a label and command')
      return
    }
    onSave(formData)
  }

  const handleSelectFile = async () => {
    const filePath = await window.runclauderun.dialog.selectFile()
    if (filePath) {
      setFormData({ ...formData, command: filePath })
    }
  }

  const addEnvironmentVariable = () => {
    if (envVarInput.key && envVarInput.value) {
      setFormData({
        ...formData,
        environmentVariables: {
          ...formData.environmentVariables,
          [envVarInput.key]: envVarInput.value
        }
      })
      setEnvVarInput({ key: '', value: '' })
    }
  }

  const removeEnvironmentVariable = (key: string) => {
    const { [key]: _, ...rest } = formData.environmentVariables
    setFormData({ ...formData, environmentVariables: rest })
  }

  return (
    <div className="h-full overflow-y-auto p-8">
      <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
        <div className="glass-card p-8">
          <h2 className="text-2xl font-semibold mb-6 text-gray-900 dark:text-gray-100">
            {isNew ? 'Create New Task' : 'Edit Task'}
          </h2>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Task Name
              </label>
              <input
                type="text"
                value={formData.label}
                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                className="input-field"
                placeholder="My Scheduled Task"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Command to Execute
              </label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={formData.command}
                  onChange={(e) => setFormData({ ...formData, command: e.target.value })}
                  className="input-field flex-1"
                  placeholder="/usr/bin/python3 /path/to/script.py"
                  required
                />
                <button
                  type="button"
                  onClick={handleSelectFile}
                  className="btn-secondary"
                >
                  Browse...
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Enter the full path to your script or executable
              </p>
            </div>

            <ScheduleBuilder
              schedule={formData.schedule}
              onChange={(schedule) => setFormData({ ...formData, schedule })}
            />

            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
              >
                <svg
                  className={`w-4 h-4 mr-2 transition-transform ${showAdvanced ? 'rotate-90' : ''}`}
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
                Advanced Options
              </button>

              {showAdvanced && (
                <div className="mt-4 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Working Directory
                    </label>
                    <input
                      type="text"
                      value={formData.workingDirectory}
                      onChange={(e) => setFormData({ ...formData, workingDirectory: e.target.value })}
                      className="input-field"
                      placeholder="/Users/username/projects"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Standard Output Path
                    </label>
                    <input
                      type="text"
                      value={formData.standardOutPath}
                      onChange={(e) => setFormData({ ...formData, standardOutPath: e.target.value })}
                      className="input-field"
                      placeholder="/tmp/task-output.log"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Standard Error Path
                    </label>
                    <input
                      type="text"
                      value={formData.standardErrorPath}
                      onChange={(e) => setFormData({ ...formData, standardErrorPath: e.target.value })}
                      className="input-field"
                      placeholder="/tmp/task-error.log"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Environment Variables
                    </label>
                    <div className="space-y-2">
                      {Object.entries(formData.environmentVariables).map(([key, value]) => (
                        <div key={key} className="flex items-center space-x-2">
                          <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded text-sm">
                            {key}={value}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeEnvironmentVariable(key)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                          </button>
                        </div>
                      ))}
                      <div className="flex space-x-2">
                        <input
                          type="text"
                          value={envVarInput.key}
                          onChange={(e) => setEnvVarInput({ ...envVarInput, key: e.target.value })}
                          className="input-field flex-1"
                          placeholder="KEY"
                        />
                        <input
                          type="text"
                          value={envVarInput.value}
                          onChange={(e) => setEnvVarInput({ ...envVarInput, value: e.target.value })}
                          className="input-field flex-1"
                          placeholder="value"
                        />
                        <button
                          type="button"
                          onClick={addEnvironmentVariable}
                          className="btn-secondary"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-between mt-8">
            <div>
              {!isNew && onDelete && (
                <button
                  type="button"
                  onClick={onDelete}
                  className="px-4 py-2 text-red-600 hover:text-red-700 font-medium"
                >
                  Delete Task
                </button>
              )}
            </div>
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={onCancel}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary"
              >
                {isNew ? 'Create Task' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}