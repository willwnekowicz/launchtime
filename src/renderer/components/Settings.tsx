import React, { useState, useEffect } from 'react'

interface SettingsProps {
  onClose: () => void
}

export interface AppSettings {
  startOnLaunch: boolean
  notifications: {
    enabled: boolean
    onTaskStart: boolean
    onTaskEnd: boolean
    showErrors: boolean
  }
  appearance: {
    compactMode: boolean
    showTokenUsage: boolean
  }
  advanced: {
    defaultWorkingDirectory?: string
    defaultModel?: string
    defaultTerminal?: string
    autoScrollLogs: boolean
  }
}

export function Settings({ onClose }: SettingsProps) {
  const [settings, setSettings] = useState<AppSettings>({
    startOnLaunch: false,
    notifications: {
      enabled: true,
      onTaskStart: true,
      onTaskEnd: true,
      showErrors: true
    },
    appearance: {
      compactMode: false,
      showTokenUsage: true
    },
    advanced: {
      defaultTerminal: 'iTerm',
      autoScrollLogs: true
    }
  })

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    const prefs = await window.runclauderun.preferences.get()
    if (prefs) {
      setSettings(prev => ({ ...prev, ...prefs }))
    }
  }

  const saveSetting = async (key: string, value: any) => {
    await window.runclauderun.preferences.set(key, value)
    setSettings(prev => ({
      ...prev,
      [key]: value
    }))
  }

  const saveNestedSetting = async (category: string, key: string, value: any) => {
    const updatedCategory = {
      ...settings[category as keyof AppSettings],
      [key]: value
    }
    await window.runclauderun.preferences.set(category, updatedCategory)
    setSettings(prev => ({
      ...prev,
      [category]: updatedCategory
    }))
  }

  return (
    <div className="h-full flex flex-col bg-claude-darker">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-claude-border bg-claude-gray">
        <h2 className="text-lg font-mono text-claude-text">Settings</h2>
        <button
          onClick={onClose}
          className="p-1 hover:bg-claude-border rounded transition-colors"
        >
          <svg className="w-4 h-4 text-claude-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl space-y-6">
          {/* General Settings */}
          <div>
            <h3 className="text-sm font-mono text-claude-text mb-4">General</h3>
            <div className="space-y-3">
              <label className="flex items-center justify-between p-3 bg-claude-gray rounded border border-claude-border hover:bg-claude-hover transition-colors">
                <div>
                  <div className="text-xs font-mono text-claude-text">Launch at Login</div>
                  <div className="text-xxs text-claude-muted mt-1">Start runCLAUDErun when you log in to your Mac</div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.startOnLaunch}
                  onChange={(e) => saveSetting('startOnLaunch', e.target.checked)}
                  className="w-4 h-4 rounded border-claude-border bg-claude-dark"
                />
              </label>
            </div>
          </div>

          {/* Notifications */}
          <div>
            <h3 className="text-sm font-mono text-claude-text mb-4">Notifications</h3>
            <div className="space-y-3">
              <label className="flex items-center justify-between p-3 bg-claude-gray rounded border border-claude-border hover:bg-claude-hover transition-colors">
                <div>
                  <div className="text-xs font-mono text-claude-text">Enable Notifications</div>
                  <div className="text-xxs text-claude-muted mt-1">Show desktop notifications for task events</div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.notifications.enabled}
                  onChange={(e) => saveNestedSetting('notifications', 'enabled', e.target.checked)}
                  className="w-4 h-4 rounded border-claude-border bg-claude-dark"
                />
              </label>

              {settings.notifications.enabled && (
                <>
                  <label className="flex items-center justify-between p-3 bg-claude-gray rounded border border-claude-border hover:bg-claude-hover transition-colors ml-6">
                    <div>
                      <div className="text-xs font-mono text-claude-text">Task Start</div>
                      <div className="text-xxs text-claude-muted mt-1">Notify when a task begins running</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.notifications.onTaskStart}
                      onChange={(e) => saveNestedSetting('notifications', 'onTaskStart', e.target.checked)}
                      className="w-4 h-4 rounded border-claude-border bg-claude-dark"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 bg-claude-gray rounded border border-claude-border hover:bg-claude-hover transition-colors ml-6">
                    <div>
                      <div className="text-xs font-mono text-claude-text">Task End</div>
                      <div className="text-xxs text-claude-muted mt-1">Notify when a task completes</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.notifications.onTaskEnd}
                      onChange={(e) => saveNestedSetting('notifications', 'onTaskEnd', e.target.checked)}
                      className="w-4 h-4 rounded border-claude-border bg-claude-dark"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 bg-claude-gray rounded border border-claude-border hover:bg-claude-hover transition-colors ml-6">
                    <div>
                      <div className="text-xs font-mono text-claude-text">Show Errors</div>
                      <div className="text-xxs text-claude-muted mt-1">Notify when a task fails with an error</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.notifications.showErrors}
                      onChange={(e) => saveNestedSetting('notifications', 'showErrors', e.target.checked)}
                      className="w-4 h-4 rounded border-claude-border bg-claude-dark"
                    />
                  </label>
                </>
              )}
            </div>
          </div>

          {/* Appearance */}
          <div>
            <h3 className="text-sm font-mono text-claude-text mb-4">Appearance</h3>
            <div className="space-y-3">
              <label className="flex items-center justify-between p-3 bg-claude-gray rounded border border-claude-border hover:bg-claude-hover transition-colors">
                <div>
                  <div className="text-xs font-mono text-claude-text">Compact Mode</div>
                  <div className="text-xxs text-claude-muted mt-1">Reduce spacing and padding in the UI</div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.appearance.compactMode}
                  onChange={(e) => saveNestedSetting('appearance', 'compactMode', e.target.checked)}
                  className="w-4 h-4 rounded border-claude-border bg-claude-dark"
                />
              </label>

              <label className="flex items-center justify-between p-3 bg-claude-gray rounded border border-claude-border hover:bg-claude-hover transition-colors">
                <div>
                  <div className="text-xs font-mono text-claude-text">Show Token Usage</div>
                  <div className="text-xxs text-claude-muted mt-1">Display token consumption in run details</div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.appearance.showTokenUsage}
                  onChange={(e) => saveNestedSetting('appearance', 'showTokenUsage', e.target.checked)}
                  className="w-4 h-4 rounded border-claude-border bg-claude-dark"
                />
              </label>
            </div>
          </div>

          {/* Advanced */}
          <div>
            <h3 className="text-sm font-mono text-claude-text mb-4">Advanced</h3>
            <div className="space-y-3">
              <div className="p-3 bg-claude-gray rounded border border-claude-border">
                <label className="block text-xs font-mono text-claude-text mb-2">Default Working Directory</label>
                <input
                  type="text"
                  value={settings.advanced.defaultWorkingDirectory || ''}
                  onChange={(e) => saveNestedSetting('advanced', 'defaultWorkingDirectory', e.target.value)}
                  placeholder="~/Projects"
                  className="w-full px-3 py-1.5 bg-claude-dark border border-claude-border rounded text-xs font-mono text-claude-text focus:border-claude-accent focus:outline-none"
                />
              </div>

              <div className="p-3 bg-claude-gray rounded border border-claude-border">
                <label className="block text-xs font-mono text-claude-text mb-2">Default Model</label>
                <select
                  value={settings.advanced.defaultModel || 'sonnet'}
                  onChange={(e) => saveNestedSetting('advanced', 'defaultModel', e.target.value)}
                  className="w-full px-3 py-1.5 bg-claude-dark border border-claude-border rounded text-xs font-mono text-claude-text focus:border-claude-accent focus:outline-none"
                >
                  <option value="sonnet">Sonnet</option>
                  <option value="opus">Opus</option>
                  <option value="haiku">Haiku</option>
                </select>
              </div>

              <label className="flex items-center justify-between p-3 bg-claude-gray rounded border border-claude-border hover:bg-claude-hover transition-colors">
                <div>
                  <div className="text-xs font-mono text-claude-text">Auto-scroll Logs</div>
                  <div className="text-xxs text-claude-muted mt-1">Automatically scroll to bottom of logs during live viewing</div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.advanced.autoScrollLogs}
                  onChange={(e) => saveNestedSetting('advanced', 'autoScrollLogs', e.target.checked)}
                  className="w-4 h-4 rounded border-claude-border bg-claude-dark"
                />
              </label>

              <div className="p-3 bg-claude-gray rounded border border-claude-border">
                <label className="block text-xs font-mono text-claude-text mb-2">Default Terminal/IDE</label>
                <select
                  value={settings.advanced.defaultTerminal || 'iTerm'}
                  onChange={(e) => saveNestedSetting('advanced', 'defaultTerminal', e.target.value)}
                  className="w-full px-3 py-1.5 bg-claude-dark border border-claude-border rounded text-xs font-mono text-claude-text focus:border-claude-accent focus:outline-none"
                >
                  <option value="iTerm">iTerm</option>
                  <option value="Terminal">Terminal</option>
                  <option value="Warp">Warp</option>
                  <option value="Cursor">Cursor</option>
                  <option value="VSCode">VSCode</option>
                  <option value="Zed">Zed</option>
                  <option value="Windsurf">Windsurf</option>
                  <option value="PyCharm">PyCharm</option>
                  <option value="WebStorm">WebStorm</option>
                  <option value="Xcode">Xcode</option>
                </select>
                <p className="text-xxs text-claude-muted mt-1">Choose which application to use when opening Claude sessions</p>
              </div>
            </div>
          </div>

          {/* About */}
          <div className="pt-6 border-t border-claude-border">
            <div className="text-center">
              <h3 className="text-sm font-mono text-claude-text mb-2">runCLAUDErun</h3>
              <p className="text-xs text-claude-muted mb-4">Version 1.0.0</p>
              <p className="text-xxs text-claude-muted">
                A professional scheduler for Claude CLI commands on macOS
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}