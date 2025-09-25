import React from 'react'

export function Header() {
  return (
    <div className="h-12 bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border-b border-gray-200 dark:border-gray-700 draggable-area flex items-center px-20">
      <div className="flex items-center space-x-2">
        <div className="w-6 h-6 bg-launchtime-blue rounded-lg flex items-center justify-center">
          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
          </svg>
        </div>
        <span className="text-lg font-semibold text-gray-800 dark:text-gray-100">LaunchTime</span>
      </div>
    </div>
  )
}