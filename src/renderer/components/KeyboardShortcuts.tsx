import React from 'react'

interface KeyboardShortcutsProps {
  onClose: () => void
}

export function KeyboardShortcuts({ onClose }: KeyboardShortcutsProps) {
  const shortcuts = [
    { keys: ['⌘', 'N'], description: 'New Task', windows: ['Ctrl', 'N'] },
    { keys: ['⌘', 'E'], description: 'Edit Selected Task', windows: ['Ctrl', 'E'] },
    { keys: ['⌘', 'Enter'], description: 'Run Selected Task', windows: ['Ctrl', 'Enter'] },
    { keys: ['⌘', 'R'], description: 'Refresh Tasks', windows: ['Ctrl', 'R'] },
    { keys: ['⌘', 'L'], description: 'View All Runs', windows: ['Ctrl', 'L'] },
    { keys: ['⌘', ','], description: 'Settings', windows: ['Ctrl', ','] },
    { keys: ['↑', '↓'], description: 'Navigate Tasks', windows: ['↑', '↓'] },
    { keys: ['Esc'], description: 'Close/Cancel', windows: ['Esc'] },
    { keys: ['?'], description: 'Show Shortcuts', windows: ['?'] },
  ]

  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-claude-gray border border-claude-border rounded-lg shadow-xl max-w-lg w-full mx-4">
        <div className="flex items-center justify-between p-4 border-b border-claude-border">
          <h2 className="text-lg font-mono text-claude-text">Keyboard Shortcuts</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-claude-hover rounded transition-colors"
          >
            <svg className="w-4 h-4 text-claude-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 space-y-2">
          {shortcuts.map((shortcut, i) => (
            <div
              key={i}
              className="flex items-center justify-between p-2 rounded hover:bg-claude-hover transition-colors"
            >
              <div className="flex items-center space-x-2">
                {(isMac ? shortcut.keys : shortcut.windows).map((key, j) => (
                  <React.Fragment key={j}>
                    {j > 0 && <span className="text-xxs text-claude-muted">+</span>}
                    <kbd className="px-2 py-1 bg-claude-dark border border-claude-border rounded text-xs font-mono text-claude-text">
                      {key}
                    </kbd>
                  </React.Fragment>
                ))}
              </div>
              <span className="text-xs text-claude-text">{shortcut.description}</span>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-claude-border">
          <p className="text-xxs text-claude-muted text-center">
            Press <kbd className="px-1 py-0.5 bg-claude-dark border border-claude-border rounded text-xxs">Esc</kbd> to close
          </p>
        </div>
      </div>
    </div>
  )
}