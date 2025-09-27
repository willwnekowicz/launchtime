import React from 'react'
import type { Schedule } from '../../shared/types'

interface ScheduleBuilderProps {
  schedule: Schedule
  onChange: (schedule: Schedule) => void
}

export function ScheduleBuilder({ schedule, onChange }: ScheduleBuilderProps) {
  const handleTypeChange = (type: Schedule['type']) => {
    const newSchedule: Schedule = { type, enabled: schedule.enabled }

    switch (type) {
      case 'interval':
        newSchedule.interval = 3600
        break
      case 'calendar':
        newSchedule.calendar = { hour: 9, minute: 0 }
        break
      case 'watchPath':
        newSchedule.watchPaths = []
        break
    }

    onChange(newSchedule)
  }

  const scheduleTypes = [
    { value: 'manual', label: 'Manual', description: 'Run only when manually triggered' },
    { value: 'interval', label: 'Interval', description: 'Run at regular intervals' },
    { value: 'calendar', label: 'Calendar', description: 'Run at specific times' },
    { value: 'startup', label: 'Startup', description: 'Run when system starts' },
    { value: 'watchPath', label: 'File Watch', description: 'Run when files change' }
  ]

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Schedule Type
        </label>
        <div className="grid grid-cols-2 gap-3">
          {scheduleTypes.map(({ value, label, description }) => (
            <button
              key={value}
              type="button"
              onClick={() => handleTypeChange(value as Schedule['type'])}
              className={`
                p-3 rounded-lg border text-left transition-all
                ${schedule.type === value
                  ? 'border-runclauderun-blue bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                }
              `}
            >
              <div className="font-medium text-gray-900 dark:text-gray-100">{label}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{description}</div>
            </button>
          ))}
        </div>
      </div>

      {schedule.type === 'interval' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Run Every
          </label>
          <div className="flex items-center space-x-2">
            <input
              type="number"
              min="1"
              value={(schedule.interval || 3600) / 60}
              onChange={(e) => onChange({
                ...schedule,
                interval: parseInt(e.target.value) * 60
              })}
              className="input-field w-32"
            />
            <span className="text-gray-600 dark:text-gray-400">minutes</span>
            <span className="text-xs text-gray-500">({schedule.interval || 3600} seconds)</span>
          </div>
        </div>
      )}

      {schedule.type === 'calendar' && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Hour (0-23)
              </label>
              <input
                type="number"
                min="0"
                max="23"
                value={schedule.calendar?.hour ?? ''}
                onChange={(e) => onChange({
                  ...schedule,
                  calendar: {
                    ...schedule.calendar,
                    hour: e.target.value ? parseInt(e.target.value) : undefined
                  }
                })}
                className="input-field"
                placeholder="Any"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Minute (0-59)
              </label>
              <input
                type="number"
                min="0"
                max="59"
                value={schedule.calendar?.minute ?? ''}
                onChange={(e) => onChange({
                  ...schedule,
                  calendar: {
                    ...schedule.calendar,
                    minute: e.target.value ? parseInt(e.target.value) : undefined
                  }
                })}
                className="input-field"
                placeholder="Any"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Day (1-31)
              </label>
              <input
                type="number"
                min="1"
                max="31"
                value={schedule.calendar?.day ?? ''}
                onChange={(e) => onChange({
                  ...schedule,
                  calendar: {
                    ...schedule.calendar,
                    day: e.target.value ? parseInt(e.target.value) : undefined
                  }
                })}
                className="input-field"
                placeholder="Any"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Weekday (0-6)
              </label>
              <select
                value={schedule.calendar?.weekday ?? ''}
                onChange={(e) => onChange({
                  ...schedule,
                  calendar: {
                    ...schedule.calendar,
                    weekday: e.target.value ? parseInt(e.target.value) : undefined
                  }
                })}
                className="input-field"
              >
                <option value="">Any</option>
                <option value="0">Sunday</option>
                <option value="1">Monday</option>
                <option value="2">Tuesday</option>
                <option value="3">Wednesday</option>
                <option value="4">Thursday</option>
                <option value="5">Friday</option>
                <option value="6">Saturday</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Month (1-12)
              </label>
              <select
                value={schedule.calendar?.month ?? ''}
                onChange={(e) => onChange({
                  ...schedule,
                  calendar: {
                    ...schedule.calendar,
                    month: e.target.value ? parseInt(e.target.value) : undefined
                  }
                })}
                className="input-field"
              >
                <option value="">Any</option>
                <option value="1">January</option>
                <option value="2">February</option>
                <option value="3">March</option>
                <option value="4">April</option>
                <option value="5">May</option>
                <option value="6">June</option>
                <option value="7">July</option>
                <option value="8">August</option>
                <option value="9">September</option>
                <option value="10">October</option>
                <option value="11">November</option>
                <option value="12">December</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {schedule.type === 'watchPath' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Paths to Watch
          </label>
          <div className="space-y-2">
            {(schedule.watchPaths || []).map((path, index) => (
              <div key={index} className="flex items-center space-x-2">
                <input
                  type="text"
                  value={path}
                  onChange={(e) => {
                    const paths = [...(schedule.watchPaths || [])]
                    paths[index] = e.target.value
                    onChange({ ...schedule, watchPaths: paths })
                  }}
                  className="input-field flex-1"
                  placeholder="/path/to/watch"
                />
                <button
                  type="button"
                  onClick={() => {
                    const paths = [...(schedule.watchPaths || [])]
                    paths.splice(index, 1)
                    onChange({ ...schedule, watchPaths: paths })
                  }}
                  className="text-red-500 hover:text-red-700"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => {
                const paths = [...(schedule.watchPaths || []), '']
                onChange({ ...schedule, watchPaths: paths })
              }}
              className="btn-secondary text-sm"
            >
              Add Path
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center space-x-3">
        <label className="flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={schedule.enabled}
            onChange={(e) => onChange({ ...schedule, enabled: e.target.checked })}
            className="mr-2 w-4 h-4 text-runclauderun-blue rounded focus:ring-runclauderun-blue"
          />
          <span className="text-sm text-gray-700 dark:text-gray-300">
            Enable schedule immediately after saving
          </span>
        </label>
      </div>
    </div>
  )
}