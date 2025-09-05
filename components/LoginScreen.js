import { useState } from 'react'

export default function LoginScreen({ onLogin }) {
  const [currentView, setCurrentView] = useState('login') // 'login', 'set-password'
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  })
  const [passwordSetup, setPasswordSetup] = useState({
    student_name: '',
    school_id: '1',
    new_password: '',
    confirm_password: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
    setError('')
  }

  const handlePasswordSetupChange = (e) => {
    setPasswordSetup({
      ...passwordSetup,
      [e.target.name]: e.target.value
    })
    setError('')
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    
    if (!formData.username || !formData.password) {
      setError('Please fill in all required fields')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'login',
          username: formData.username,
          password: formData.password
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Login failed')
      }

      onLogin(data.user, data.token)
    } catch (error) {
      if (error.message.includes('Invalid credentials')) {
        setError('Invalid username or password. If you\'re a parent, make sure you\'ve set up your password first.')
      } else {
        setError(error.message || 'Login failed')
      }
    } finally {
      setLoading(false)
    }
  }

  const checkPasswordStatus = async () => {
    if (!passwordSetup.student_name || !passwordSetup.school_id) {
      setError('Please enter student name and select school')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'check_password_status',
          student_name: passwordSetup.student_name,
          school_id: parseInt(passwordSetup.school_id)
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Student not found')
      }
      
      if (data.password_set) {
        setError('Password already set for this student. Please use the login form.')
      } else {
        setMessage(`Student found: ${data.student_name} (${data.grade}) at ${data.school_name}. You can now set a password.`)
      }
    } catch (error) {
      setError(error.message || 'Student not found')
    } finally {
      setLoading(false)
    }
  }

  const handleSetPassword = async (e) => {
    e.preventDefault()

    if (!passwordSetup.student_name || !passwordSetup.school_id || 
        !passwordSetup.new_password || !passwordSetup.confirm_password) {
      setError('Please fill in all fields')
      return
    }

    if (passwordSetup.new_password !== passwordSetup.confirm_password) {
      setError('Passwords do not match')
      return
    }

    if (passwordSetup.new_password.length < 6) {
      setError('Password must be at least 6 characters long')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'set_password',
          student_name: passwordSetup.student_name,
          school_id: parseInt(passwordSetup.school_id),
          new_password: passwordSetup.new_password
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to set password')
      }
      
      setMessage('Password set successfully! You can now login with your child\'s name and the password you just created.')
      setCurrentView('login')
      setFormData({ ...formData, username: passwordSetup.student_name })
      setPasswordSetup({
        student_name: '',
        school_id: '1',
        new_password: '',
        confirm_password: ''
      })
    } catch (error) {
      setError(error.message || 'Failed to set password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-indigo-600 rounded-xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-2xl">🏫</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">SchoolSync</h1>
          <p className="text-gray-600">Multi-School Attendance System</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        {message && (
          <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
            {message}
          </div>
        )}

        <div className="mb-4">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setCurrentView('login')}
              className={`flex-1 py-2 px-1 text-sm font-medium border-b-2 ${
                currentView === 'login'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Login
            </button>
            <button
              onClick={() => setCurrentView('set-password')}
              className={`flex-1 py-2 px-1 text-sm font-medium border-b-2 ${
                currentView === 'set-password'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              First Time? Set Password
            </button>
          </div>
        </div>

        {currentView === 'login' ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Username
                <span className="text-gray-400 text-xs ml-1">(Admin username or Child's full name for parents)</span>
              </label>
              <input 
                type="text" 
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                className="input-field"
                placeholder="Enter username or child's name"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
              <input 
                type="password" 
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                className="input-field"
                placeholder="Enter password"
                disabled={loading}
              />
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full btn-primary disabled:bg-indigo-400"
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleSetPassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Child's Full Name
              </label>
              <input 
                type="text" 
                name="student_name"
                value={passwordSetup.student_name}
                onChange={handlePasswordSetupChange}
                className="input-field"
                placeholder="Enter your child's full name exactly as registered"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">School</label>
              <select 
                name="school_id"
                value={passwordSetup.school_id}
                onChange={handlePasswordSetupChange}
                className="input-field"
                disabled={loading}
              >
                <option value="1">School 1</option>
                <option value="2">School 2</option>
                <option value="3">School 3</option>
              </select>
            </div>

            <div className="flex space-x-2">
              <button 
                type="button"
                onClick={checkPasswordStatus}
                disabled={loading || !passwordSetup.student_name || !passwordSetup.school_id}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-2 px-4 rounded-md font-medium transition-colors"
              >
                Check Student
              </button>
            </div>

            {message && (
            <>
                <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    New Password
                </label>
                <input 
                    type="password" 
                    name="new_password"
                    value={passwordSetup.new_password}
                    onChange={handlePasswordSetupChange}
                    className="input-field"
                    placeholder="Enter new password (6+ characters)"
                    disabled={loading}
                    minLength="6"
                />
                </div>

                <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Confirm Password
                </label>
                <input 
                    type="password" 
                    name="confirm_password"
                    value={passwordSetup.confirm_password}
                    onChange={handlePasswordSetupChange}
                    className="input-field"
                    placeholder="Confirm your password"
                    disabled={loading}
                    minLength="6"
                />
                </div>

                <button 
                type="submit"
                disabled={loading}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white py-2 px-4 rounded-md font-medium transition-colors"
                >
                {loading ? 'Setting Password...' : 'Set Password'}
                </button>
            </>
            )}
          </form>
        )}

        <div className="mt-6 text-xs text-gray-500 space-y-1">
          <p><strong>Instructions:</strong></p>
          <p><strong>Parents:</strong> First time? Use "Set Password" tab with your child's exact name.</p>
          <p><strong>Staff:</strong> Use your admin username and password.</p>
          <p><strong>Demo Admin:</strong> mainadmin / admin123</p>
        </div>
      </div>
    </div>
  )
}