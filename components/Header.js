// FILE: components/Header.js
import { useState } from 'react'

export default function Header({ user, onLogout }) {
  const [showMobileMenu, setShowMobileMenu] = useState(false)

  const getDisplayName = () => {
    if (user.user_type === 'parent') {
      return `${user.parent_name || 'Parent'} (${user.student_name})`
    }
    return user.username
  }

  const getShortDisplayName = () => {
    if (user.user_type === 'parent') {
      return user.parent_name || 'Parent'
    }
    return user.username
  }

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Desktop Header */}
        <div className="hidden md:flex justify-between items-center py-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">🏫</span>
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">SchoolSync</h1>
              <p className="text-xs text-gray-500">Multi-School System</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span className="text-sm text-gray-600">Connected</span>
            </div>
            <span className="text-sm text-gray-600">{getDisplayName()}</span>
            <button 
              onClick={onLogout}
              className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-md text-sm transition-colors"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Mobile Header */}
        <div className="md:hidden">
          {/* Top row - always visible */}
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">🏫</span>
              </div>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">SchoolSync</h1>
              </div>
            </div>
            
            {/* Mobile menu button */}
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              aria-label="Toggle menu"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {showMobileMenu ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>

          {/* Mobile menu dropdown */}
          {showMobileMenu && (
            <div className="border-t border-gray-200 pb-3">
              <div className="px-2 pt-3 space-y-3">
                {/* User info */}
                <div className="flex items-center space-x-3 px-3 py-2 bg-gray-50 rounded-lg">
                  <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                    <span className="text-gray-600 text-sm">
                      {user.user_type === 'parent' ? '👤' : '👨‍💼'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {getShortDisplayName()}
                    </p>
                    <p className="text-xs text-gray-500">
                      {user.user_type === 'parent' ? `Parent of ${user.student_name}` : 'Administrator'}
                    </p>
                  </div>
                </div>

                {/* Connection status */}
                <div className="flex items-center justify-center space-x-2 px-3 py-2 bg-green-50 rounded-lg">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  <span className="text-sm text-green-700 font-medium">Connected</span>
                </div>

                {/* Logout button */}
                <button 
                  onClick={() => {
                    setShowMobileMenu(false)
                    onLogout()
                  }}
                  className="w-full bg-red-500 hover:bg-red-600 text-white px-4 py-3 rounded-lg text-sm font-medium transition-colors"
                >
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}