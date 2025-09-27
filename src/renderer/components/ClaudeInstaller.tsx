import React, { useState } from 'react'

interface ClaudeInstallerProps {
  onInstallComplete: () => void
}

export function ClaudeInstaller({ onInstallComplete }: ClaudeInstallerProps) {
  const [installing, setInstalling] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleInstall = async () => {
    setInstalling(true)
    setError(null)
    
    try {
      const result = await window.runclauderun.claude.install()
      if (result.success) {
        onInstallComplete()
      } else {
        setError(result.error || 'Installation failed')
      }
    } catch (err: any) {
      setError(err.message || 'Installation failed')
    } finally {
      setInstalling(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
      <div className="max-w-md w-full mx-auto p-6 bg-claude-gray rounded-lg border border-claude-border">
        <div className="text-center">
          <div className="text-5xl mb-4">🤖</div>
          <h2 className="text-xl font-mono text-claude-text mb-2">Claude CLI Not Found</h2>
          <p className="text-xs text-claude-muted mb-6">
            runCLAUDErun requires the Claude CLI to be installed on your system.
          </p>
          
          {error && (
            <div className="mb-4 p-3 bg-red-900/20 border border-red-500/30 rounded text-xs text-red-400">
              {error}
            </div>
          )}
          
          <button
            onClick={handleInstall}
            disabled={installing}
            className="px-6 py-2 bg-claude-orange hover:bg-claude-accent disabled:bg-claude-border text-white font-mono text-xs rounded transition-colors disabled:cursor-not-allowed"
          >
            {installing ? 'Installing...' : 'Install Claude CLI'}
          </button>
          
          <div className="mt-6 p-3 bg-claude-darker rounded border border-claude-border">
            <p className="text-xxs text-claude-muted mb-2">Manual Installation:</p>
            <code className="text-xxs text-claude-text font-mono block bg-black/50 p-2 rounded">
              npm install -g @anthropic/claude-cli
            </code>
          </div>
        </div>
      </div>
    </div>
  )
}