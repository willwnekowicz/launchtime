import React, { useState, useEffect, useRef } from 'react'
import type { ClaudeTask } from '../types'

interface LogViewerProps {
  task: ClaudeTask
  runId: string
  onClose: () => void
  onSelectRun: (runId: string) => void
  onBack?: () => void
}

export function LogViewer({ task, runId, onClose, onSelectRun, onBack }: LogViewerProps) {
  const [logs, setLogs] = useState<{ stdout: string; stderr: string } | null>(null)
  const [parsedMessages, setParsedMessages] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTab, setSelectedTab] = useState<'output' | 'raw' | 'stderr'>('output')
  const [isLive, setIsLive] = useState(false)
  const [autoScroll, setAutoScroll] = useState(true)
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [selectedTerminal, setSelectedTerminal] = useState<string>('iTerm')
  const [showTerminalMenu, setShowTerminalMenu] = useState(false)
  const [settings, setSettings] = useState<any>(null)
  const logsEndRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadLogs()
    checkIfLive()
    loadSettings()
  }, [runId])

  const loadSettings = async () => {
    const prefs = await window.runclauderun.preferences.get()
    setSettings(prefs)
    if (prefs?.advanced?.defaultTerminal) {
      setSelectedTerminal(prefs.advanced.defaultTerminal)
    }
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowTerminalMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (!isLive) return

    // Set up live log streaming
    const handleLogUpdate = (data: any) => {
      if (data.runId === runId) {
        setLogs(prev => {
          if (!prev) return { stdout: '', stderr: '' }
          return {
            ...prev,
            [data.type]: prev[data.type as 'stdout' | 'stderr'] + data.data
          }
        })
        
        // Parse JSON messages if available
        if (data.json) {
          setParsedMessages(prev => [...prev, data.json])
          
          // Extract session ID immediately when we see it
          if (data.json.type === 'session' || data.json.session_id) {
            const sessionId = data.json.session_id || data.json.id
            setCurrentSessionId(sessionId)
          }
        }
        
        // Auto-scroll to bottom if enabled
        if (autoScroll) {
          setTimeout(() => {
            logsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
          }, 100)
        }
      }
    }

    const handleRunCompleted = (data: any) => {
      if (data.runId === runId) {
        setIsLive(false)
        // Reload logs to get the final state
        loadLogs()
      }
    }

    window.runclauderun.on('log-update', handleLogUpdate)
    window.runclauderun.on('run-completed', handleRunCompleted)

    return () => {
      window.runclauderun.off('log-update', handleLogUpdate)
      window.runclauderun.off('run-completed', handleRunCompleted)
    }
  }, [runId, isLive, autoScroll])

  const loadLogs = async () => {
    setLoading(true)
    try {
      const result = await window.runclauderun.claude.getLogs(task.id, runId)
      if (result.success && result.data) {
        setLogs(result.data)
        
        // Parse JSON messages from the stdout log
        if (result.data.stdout) {
          const messages: any[] = []
          const lines = result.data.stdout.split('\n')
          let currentAssistant: any = null
          
          for (const line of lines) {
            // Skip metadata lines
            if (line.startsWith('[COMMAND]:') || line.startsWith('[WORKING DIR]:') || line.startsWith('[TIMESTAMP]:')) {
              continue
            }
            
            // Try to extract JSON from formatted log lines
            if (line.includes('[USER]:') || line.includes('[ASSISTANT]:') || 
                line.includes('[TOOL USE]:') || line.includes('[TOOL RESULT]:') ||
                line.includes('[SESSION]:') || line.includes('[USAGE]:') ||
                line.includes('[ERROR]:')) {
              // These are already formatted, extract content
              if (line.includes('[USER]:')) {
                currentAssistant = null
                const content = line.substring(line.indexOf('[USER]:') + 7).trim()
                messages.push({ role: 'user', content })
              } else if (line.includes('[ASSISTANT]:')) {
                const content = line.substring(line.indexOf('[ASSISTANT]:') + 12).trim()
                if (currentAssistant) {
                  // Continue previous assistant message
                  currentAssistant.content += '\n' + content
                } else {
                  currentAssistant = { role: 'assistant', content }
                  messages.push(currentAssistant)
                }
              } else if (line.includes('[TOOL USE]:')) {
                currentAssistant = null
                const content = line.substring(line.indexOf('[TOOL USE]:') + 11).trim()
                messages.push({ type: 'tool_use', name: content.split('-')[0].trim(), content })
              } else if (line.includes('[TOOL RESULT]:')) {
                currentAssistant = null
                const content = line.substring(line.indexOf('[TOOL RESULT]:') + 14).trim()
                messages.push({ type: 'tool_result', content })
              } else if (line.includes('[SESSION]:')) {
                currentAssistant = null
                const match = line.match(/ID:\s*([^\s]+)/)
                if (match) {
                  setCurrentSessionId(match[1])
                  messages.push({ type: 'session', session_id: match[1] })
                }
              } else if (line.includes('[USAGE]:')) {
                currentAssistant = null
                const content = line.substring(line.indexOf('[USAGE]:') + 8).trim()
                messages.push({ type: 'usage', content })
              } else if (line.includes('[ERROR]:')) {
                currentAssistant = null
                const content = line.substring(line.indexOf('[ERROR]:') + 8).trim()
                messages.push({ type: 'error', content })
              }
            } else if (currentAssistant && line.trim() && !line.trim().startsWith('{')) {
              // Continue assistant message if it's not JSON
              currentAssistant.content += '\n' + line
            }
          }
          
          setParsedMessages(messages)
        }
      }
    } catch (error) {
      console.error('Failed to load logs:', error)
    } finally {
      setLoading(false)
    }
  }

  const checkIfLive = async () => {
    const active = await window.runclauderun.claude.isRunActive(runId)
    setIsLive(active)
  }

  const selectedRun = task.runHistory?.find(r => r.id === runId)

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-3 border-b border-claude-border bg-claude-gray">
        <div className="flex items-center space-x-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-1 hover:bg-claude-border rounded transition-colors"
              title="Back to Task Details"
            >
              <svg className="w-4 h-4 text-claude-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          <h3 className="text-sm font-mono text-claude-text">{task.label} - Logs</h3>
          {selectedRun && (
            <span className="text-xxs text-claude-muted">
              {new Date(selectedRun.startTime).toLocaleString()}
            </span>
          )}
          {isLive && (
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-xxs text-green-500 font-mono">LIVE</span>
            </div>
          )}
        </div>
        <div className="flex items-center space-x-2">
          {currentSessionId && (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setShowTerminalMenu(!showTerminalMenu)}
                className="flex items-center space-x-1 px-2 py-1 text-xs font-mono bg-claude-accent hover:bg-claude-info text-white rounded transition-colors"
              >
                <span>Open Session</span>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {showTerminalMenu && (
                <div className="absolute right-0 mt-1 bg-claude-gray border border-claude-border rounded shadow-lg z-10">
                  {['iTerm', 'Terminal', 'Warp', 'Cursor', 'VSCode', 'Zed', 'Windsurf', 'PyCharm', 'WebStorm', 'Xcode'].map(app => (
                    <button
                      key={app}
                      onClick={async () => {
                        setSelectedTerminal(app)
                        setShowTerminalMenu(false)
                        const workingDir = task.workingDirectory || '~'
                        await window.runclauderun.system?.openInTerminal(app, workingDir, currentSessionId)
                      }}
                      className="block w-full text-left px-3 py-1.5 text-xs font-mono text-claude-text hover:bg-claude-hover transition-colors"
                    >
                      {app}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          {isLive && (
            <button
              onClick={() => setAutoScroll(!autoScroll)}
              className={`px-2 py-1 text-xs font-mono rounded transition-colors ${
                autoScroll 
                  ? 'bg-claude-accent text-white' 
                  : 'bg-claude-hover text-claude-text hover:bg-claude-border'
              }`}
              title={autoScroll ? 'Auto-scroll enabled' : 'Auto-scroll disabled'}
            >
              Auto-scroll
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1 hover:bg-claude-border rounded transition-colors"
          >
            <svg className="w-4 h-4 text-claude-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {task.runHistory && task.runHistory.length > 1 && (
        <div className="p-2 border-b border-claude-border bg-claude-gray">
          <select
            value={runId}
            onChange={(e) => onSelectRun(e.target.value)}
            className="px-2 py-1 bg-claude-dark border border-claude-border rounded text-xs font-mono text-claude-text"
          >
            {task.runHistory
              .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
              .map(run => (
                <option key={run.id} value={run.id}>
                  {new Date(run.startTime).toLocaleString()}
                  {run.exitCode !== undefined && ` (Exit: ${run.exitCode})`}
                </option>
              ))}
          </select>
        </div>
      )}

      <div className="flex border-b border-claude-border bg-claude-gray">
        <button
          onClick={() => setSelectedTab('output')}
          className={`px-4 py-1.5 text-xs font-mono transition-colors ${
            selectedTab === 'output' 
              ? 'bg-claude-dark text-claude-text border-b-2 border-claude-accent' 
              : 'text-claude-muted hover:text-claude-text'
          }`}
        >
          Output
        </button>
        <button
          onClick={() => setSelectedTab('raw')}
          className={`px-4 py-1.5 text-xs font-mono transition-colors ${
            selectedTab === 'raw' 
              ? 'bg-claude-dark text-claude-text border-b-2 border-claude-accent' 
              : 'text-claude-muted hover:text-claude-text'
          }`}
        >
          Raw Output
        </button>
        <button
          onClick={() => setSelectedTab('stderr')}
          className={`px-4 py-1.5 text-xs font-mono transition-colors ${
            selectedTab === 'stderr' 
              ? 'bg-claude-dark text-claude-text border-b-2 border-claude-accent' 
              : 'text-claude-muted hover:text-claude-text'
          }`}
        >
          Errors
        </button>
      </div>

      <div className="flex-1 overflow-auto bg-black p-3">
        {loading ? (
          <div className="text-xs text-claude-muted">Loading logs...</div>
        ) : logs ? (
          <>
            {selectedTab === 'output' ? (
              <div className="space-y-3">
                {parsedMessages.length === 0 && !isLive ? (
                  <div className="text-xs text-claude-muted">No messages</div>
                ) : (
                  parsedMessages.map((msg, i) => (
                    <div key={i} className="border-l-2 border-claude-border pl-3">
                      {msg.role === 'user' && (
                        <div>
                          <div className="text-xxs text-claude-info font-mono mb-1">USER</div>
                          <div className="text-xs text-claude-text whitespace-pre-wrap">{msg.content}</div>
                        </div>
                      )}
                      {msg.role === 'assistant' && (
                        <div>
                          <div className="text-xxs text-claude-accent font-mono mb-1">ASSISTANT</div>
                          <div className="text-xs text-claude-text whitespace-pre-wrap">{msg.content}</div>
                        </div>
                      )}
                      {msg.type === 'tool_use' && (
                        <div>
                          <div className="text-xxs text-claude-warning font-mono mb-1">TOOL USE{msg.name ? `: ${msg.name}` : ''}</div>
                          <div className="text-xs text-claude-muted whitespace-pre-wrap">
                            {typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.input || msg.arguments || msg.content, null, 2)}
                          </div>
                        </div>
                      )}
                      {msg.type === 'tool_result' && (
                        <div>
                          <div className="text-xxs text-claude-success font-mono mb-1">TOOL RESULT</div>
                          <div className="text-xs text-claude-muted whitespace-pre-wrap">
                            {msg.content || msg.output || msg.result}
                          </div>
                        </div>
                      )}
                      {msg.type === 'session' && (
                        <div>
                          <div className="text-xxs text-claude-purple font-mono mb-1">SESSION</div>
                          <div className="text-xs text-claude-muted">ID: {msg.session_id}</div>
                        </div>
                      )}
                      {msg.type === 'usage' && (
                        <div>
                          <div className="text-xxs text-claude-teal font-mono mb-1">USAGE</div>
                          <div className="text-xs text-claude-muted">{msg.content}</div>
                        </div>
                      )}
                      {msg.type === 'error' && (
                        <div>
                          <div className="text-xxs text-claude-error font-mono mb-1">ERROR</div>
                          <div className="text-xs text-claude-error">{msg.content}</div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            ) : selectedTab === 'raw' ? (
              <pre className="text-xs font-mono text-green-400 whitespace-pre-wrap">
                {logs.stdout || (isLive ? 'Waiting for output...' : 'No output')}
              </pre>
            ) : (
              <pre className="text-xs font-mono text-red-400 whitespace-pre-wrap">
                {logs.stderr || (isLive ? 'No errors yet...' : 'No errors')}
              </pre>
            )}
            <div ref={logsEndRef} />
          </>
        ) : (
          <div className="text-xs text-claude-muted">No logs available</div>
        )}
      </div>

      <div className="p-2 border-t border-claude-border bg-claude-gray">
        <div className="flex items-center justify-between text-xxs text-claude-muted">
          <span>Session ID: {currentSessionId || selectedRun?.sessionId || 'N/A'}</span>
          <span>Status: {isLive ? '🟢 Running' : `Exit Code: ${selectedRun?.exitCode ?? 'Unknown'}`}</span>
        </div>
      </div>
    </div>
  )
}