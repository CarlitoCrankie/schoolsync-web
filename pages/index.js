// pages/index.js - Fixed with proper token validation and logout handling
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
          // Validate token expiration
          const payload = JSON.parse(atob(token.split('.')[1]))
          const currentTime = Date.now() / 1000
          
          if (payload.exp && payload.exp < currentTime) {
            console.log('Token expired, clearing auth state')
            clearAuthData()
            setLoading(false)
            return
          }
          
          // Token is valid, restore user state
          setCurrentUser(JSON.parse(userInfo))
        } catch (e) {
          console.log('Invalid token or user data, clearing auth state')
          clearAuthData()
        }
      }
    }
    setLoading(false)
  }

  const clearAuthData = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token')
      localStorage.removeItem('userInfo')
      sessionStorage.removeItem('token')
      sessionStorage.removeItem('userInfo')
    }
  }

  const handleLogin = (user, token) => {
    setCurrentUser(user)
    if (typeof window !== 'undefined') {
      localStorage.setItem('token', token)
      localStorage.setItem('userInfo', JSON.stringify(user))
    }
  }

  const handleLogout = () => {
    console.log('Logout initiated')
    clearAuthData()
    setCurrentUser(null)
    
    // Force a hard redirect to ensure clean state
    setTimeout(() => {
      if (typeof window !== 'undefined') {
        window.location.replace('/')
      }
    }, 100)
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
        <AdminDashboard user={currentUser} onLogout={handleLogout} />
      ) : (
        <ParentDashboard user={currentUser} onLogout={handleLogout} />
      )}
    </div>
  )
}