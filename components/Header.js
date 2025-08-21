// FILE: components/Header.js
export default function Header({ user, onLogout }) {
  const getDisplayName = () => {
    if (user.user_type === 'parent') {
      return `${user.parent_name || 'Parent'} (${user.student_name})`
    }
    return user.username
  }

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
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
      </div>
    </header>
  )
}