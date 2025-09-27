import React from 'react'

interface HeaderProps {
  version?: string
}

export function Header({ version }: HeaderProps) {
  return (
    <div className="h-10 bg-claude-gray border-b border-claude-border draggable-area">
      {/* Empty header for window dragging */}
    </div>
  )
}