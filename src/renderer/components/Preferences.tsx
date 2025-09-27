import React, { useState, useEffect } from 'react'

interface PreferencesProps {
  onClose: () => void
}

export function Preferences({ onClose }: PreferencesProps) {
  const [startOnLaunch, setStartOnLaunch] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadPreferences()
  }, [])

  const loadPreferences = async () => {
    const prefs = await window.runclauderun.preferences.get()
    setStartOnLaunch(prefs.startOnLaunch)
    setLoading(false)
  }

  const handleStartOnLaunchChange = async (enabled: boolean) => {
    setStartOnLaunch(enabled)
    await window.runclauderun.preferences.set('startOnLaunch', enabled)
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-gray-500">Loading preferences...</div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto p-8">
      <div className="max-w-2xl mx-auto">
        <div className="glass-card p-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
              Preferences
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-6">
            <div className="border-b border-gray-200 dark:border-gray-700 pb-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                General
              </h3>

              <div className="space-y-4">
                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <div className="font-medium text-gray-900 dark:text-gray-100">
                      Launch at Login
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      Automatically start runCLAUDErun when you log in to your Mac
                    </div>
                  </div>
                  <div
                    onClick={() => handleStartOnLaunchChange(!startOnLaunch)}
                    className={`
                      w-12 h-6 rounded-full p-1 transition-colors cursor-pointer
                      ${startOnLaunch ? 'bg-runclauderun-blue' : 'bg-gray-300 dark:bg-gray-600'}
                    `}
                  >
                    <div className={`
                      w-4 h-4 bg-white rounded-full transition-transform
                      ${startOnLaunch ? 'translate-x-6' : 'translate-x-0'}
                    `} />
                  </div>
                </label>
              </div>
            </div>

            <div className="border-b border-gray-200 dark:border-gray-700 pb-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                About runCLAUDErun
              </h3>

              <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
                <div className="flex items-center space-x-2">
                  <div className="w-10 h-10 bg-runclauderun-blue rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <div className="font-medium text-gray-900 dark:text-gray-100">runCLAUDErun</div>
                    <div>Version 1.0.0</div>
                  </div>
                </div>

                <p className="pt-2">
                  runCLAUDErun is a powerful scheduling tool for macOS that makes it easy to manage
                  launchd tasks with a beautiful, intuitive interface.
                </p>

                <div className="pt-2">
                  <p className="font-medium text-gray-900 dark:text-gray-100 mb-1">Keyboard Shortcuts</p>
                  <div className="space-y-1">
                    <div><span className="font-mono">⌘N</span> - Create new task</div>
                    <div><span className="font-mono">⌘,</span> - Open preferences</div>
                    <div><span className="font-mono">⌘Q</span> - Quit runCLAUDErun</div>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                Help & Support
              </h3>

              <div className="space-y-3">
                <button className="text-runclauderun-blue hover:underline text-sm">
                  View Documentation
                </button>
                <br />
                <button className="text-runclauderun-blue hover:underline text-sm">
                  Report an Issue
                </button>
                <br />
                <button className="text-runclauderun-blue hover:underline text-sm">
                  Visit GitHub Repository
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}