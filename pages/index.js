// pages/index.js - Restored with proper ParentDashboard
import { useState, useEffect } from 'react'
import LoginScreen from '../components/LoginScreen'
import ParentDashboard from '../components/ParentDashboard'
import AdminDashboard from '../components/AdminDashboard'
import Header from '../components/Header'

export default function Home() {
  const [currentUser, setCurrentUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = () => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token')
      const userInfo = localStorage.getItem('userInfo')
      
      if (token && userInfo) {
        try {
          setCurrentUser(JSON.parse(userInfo))
        } catch (e) {
          localStorage.removeItem('token')
          localStorage.removeItem('userInfo')
        }
      }
    }
    setLoading(false)
  }

  const handleLogin = (user, token) => {
    setCurrentUser(user)
    if (typeof window !== 'undefined') {
      localStorage.setItem('token', token)
      localStorage.setItem('userInfo', JSON.stringify(user))
    }
  }

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token')
      localStorage.removeItem('userInfo')
    }
    setCurrentUser(null)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading SchoolSync...</p>
        </div>
      </div>
    )
  }

  if (!currentUser) {
    return <LoginScreen onLogin={handleLogin} />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Header user={currentUser} onLogout={handleLogout} />
      {currentUser.user_type === 'admin' ? (
        <AdminDashboard user={currentUser} />
      ) : (
        <ParentDashboard user={currentUser} />
      )}
    </div>
  )
}