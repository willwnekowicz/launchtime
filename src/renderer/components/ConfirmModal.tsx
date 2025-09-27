import React from 'react'

interface ConfirmModalProps {
  isOpen: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  onConfirm: () => void
  onCancel: () => void
  variant?: 'danger' | 'warning' | 'info'
}

export function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  variant = 'danger'
}: ConfirmModalProps) {
  if (!isOpen) return null

  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return 'bg-claude-error hover:bg-red-600'
      case 'warning':
        return 'bg-claude-warning hover:bg-yellow-600'
      case 'info':
      default:
        return 'bg-claude-orange hover:bg-claude-accent'
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
      />
      
      {/* Modal */}
      <div className="relative bg-claude-gray border border-claude-border rounded-lg shadow-2xl w-full max-w-md mx-4 animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="p-4 border-b border-claude-border">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-claude-orange rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">C</span>
            </div>
            <h3 className="text-sm font-mono text-claude-text">{title}</h3>
          </div>
        </div>
        
        {/* Body */}
        <div className="p-6">
          <p className="text-xs font-mono text-claude-text">{message}</p>
        </div>
        
        {/* Footer */}
        <div className="p-4 border-t border-claude-border flex items-center justify-end space-x-2">
          <button
            onClick={onCancel}
            className="px-4 py-1.5 bg-claude-hover hover:bg-claude-border text-claude-text font-mono text-xs rounded transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-1.5 text-white font-mono text-xs rounded transition-colors ${getVariantStyles()}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}