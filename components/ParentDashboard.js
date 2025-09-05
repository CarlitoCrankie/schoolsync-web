// components/ParentDashboard.js - Updated with contact info flow
import { useState, useEffect } from 'react'
import ParentContactManager from './ParentContactManager'

export default function ParentDashboard({ user }) {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [attendanceData, setAttendanceData] = useState([])
  const [stats, setStats] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showContactUpdate, setShowContactUpdate] = useState(false) // MISSING IN YOUR CODE
  const [contactJustUpdated, setContactJustUpdated] = useState(false)

  useEffect(() => {
    loadParentData()
  }, [user])

  const loadMockData = () => {
    const mockAttendance = [
      { 
        id: 1, 
        scanTime: '2025-08-26T08:15:00', 
        status: 'IN',
        date: '2025-08-26'
      },
      { 
        id: 2, 
        scanTime: '2025-08-25T08:10:00', 
        status: 'IN',
        date: '2025-08-25'
      }
    ]
    
    setAttendanceData(mockAttendance)
    setStats({
      totalDays: mockAttendance.length,
      presentDays: mockAttendance.length,
      lateDays: 0,
      absentDays: 0,
      attendanceRate: 100
    })
  }

  const loadParentData = async () => {
    setLoading(true)
    setError('')
    
    try {
      // Only check contact status if contact wasn't just updated
      if (!contactJustUpdated) {
        const contactResponse = await fetch('/api/sync-agent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'get_parent_contact',
            data: { studentId: user.student_id }
          })
        })

        if (contactResponse.ok) {
          const contactResult = await contactResponse.json()
          if (contactResult.success) {
            const hasContact = contactResult.result.parentContact.hasContact
            
            // Show contact update screen only if no contact info exists
            if (!hasContact) {
              setShowContactUpdate(true)
              setLoading(false)
              return // Don't load attendance data yet
            }
          }
        }
      }

      // Load attendance data
      const response = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get_student_attendance',
          student_id: user.student_id,
          school_id: user.school.id
        })
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          setAttendanceData(result.attendance || [])
          setStats(result.stats || {})
        } else {
          loadMockData()
        }
      } else {
        loadMockData()
      }
      
    } catch (error) {
      console.error('Failed to load parent data:', error)
      loadMockData()
    } finally {
      setLoading(false)
    }
  }

  const handleContactUpdateComplete = () => {
    setShowContactUpdate(false)
    setContactJustUpdated(true) // Prevent re-checking contact status
    
    // Load attendance data directly without checking contact status again
    loadAttendanceDataOnly()
  }

  const loadAttendanceDataOnly = async () => {
    setLoading(true)
    
    try {
      const response = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get_student_attendance',
          student_id: user.student_id,
          school_id: user.school.id
        })
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          setAttendanceData(result.attendance || [])
          setStats(result.stats || {})
        } else {
          loadMockData()
        }
      } else {
        loadMockData()
      }
    } catch (error) {
      console.error('Failed to load attendance data:', error)
      loadMockData()
    } finally {
      setLoading(false)
    }
  }

  // Show contact update screen if parent needs to set contact info
  if (showContactUpdate) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome to {user.school?.name}!
          </h2>
          <p className="text-lg text-gray-600">
            Hi {user.parent_name || 'Parent'}, please provide your contact information to receive attendance notifications for {user.student_name}.
          </p>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-yellow-400 text-xl">⚠️</span>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                Contact Information Required
              </h3>
              <p className="mt-1 text-sm text-yellow-700">
                To receive SMS and email notifications when {user.student_name} checks in or out, please provide at least one contact method below.
              </p>
            </div>
          </div>
        </div>

        <ParentContactManager 
          user={user} 
          onComplete={handleContactUpdateComplete}
          isRequired={true}
        />
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading attendance data...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
          <button 
            onClick={loadParentData}
            className="ml-4 bg-red-600 text-white px-3 py-1 rounded text-sm"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Welcome Section */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900">
          Welcome, {user.parent_name || 'Parent'}!
        </h2>
        <p className="text-gray-600">
          Viewing attendance for {user.student_name} at {user.school?.name}
        </p>
        
        {/* Contact Status Alert */}
        {user.contact && !user.contact.hasContact && (
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <span className="text-blue-400 text-xl">ℹ️</span>
              </div>
              <div className="ml-3">
                <p className="text-sm text-blue-700">
                  You haven't provided contact information yet. 
                  <button 
                    onClick={() => setActiveTab('contact')}
                    className="ml-2 text-blue-600 underline hover:text-blue-800"
                  >
                    Click here to add your email or phone number
                  </button>
                  to receive attendance notifications.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="card">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <span className="text-blue-600 text-xl">📊</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Attendance Rate</p>
              <p className="text-2xl font-bold text-gray-900">{stats.attendanceRate || 0}%</p>
            </div>
          </div>
        </div>
        
        <div className="card">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <span className="text-green-600 text-xl">✅</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Present Days</p>
              <p className="text-2xl font-bold text-gray-900">{stats.presentDays || 0}</p>
            </div>
          </div>
        </div>
        
        <div className="card">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <span className="text-yellow-600 text-xl">⏰</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Late Days</p>
              <p className="text-2xl font-bold text-gray-900">{stats.lateDays || 0}</p>
            </div>
          </div>
        </div>
        
        <div className="card">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <span className="text-red-600 text-xl">❌</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Absent Days</p>
              <p className="text-2xl font-bold text-gray-900">{stats.absentDays || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white rounded-xl shadow-sm mb-8">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            <button 
              onClick={() => setActiveTab('dashboard')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'dashboard' 
                  ? 'border-indigo-500 text-indigo-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Recent Activity
            </button>
            <button 
              onClick={() => setActiveTab('attendance')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'attendance' 
                  ? 'border-indigo-500 text-indigo-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Attendance History
            </button>
            <button 
              onClick={() => setActiveTab('contact')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'contact' 
                  ? 'border-indigo-500 text-indigo-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Contact & Settings
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'dashboard' && <DashboardTab attendanceData={attendanceData} user={user} />}
          {activeTab === 'attendance' && <AttendanceTab attendanceData={attendanceData} />}
          {activeTab === 'contact' && <ContactTab user={user} />}
        </div>
      </div>
    </div>
  )
}

// Dashboard Tab Component
function DashboardTab({ attendanceData, user }) {
  const recentAttendance = attendanceData.slice(0, 5)
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Recent Attendance */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Attendance</h3>
        <div className="space-y-3">
          {recentAttendance.length > 0 ? recentAttendance.map((record, index) => (
            <div key={record.id || index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">
                  {new Date(record.scanTime || record.date).toLocaleDateString()}
                </p>
                <p className="text-sm text-gray-600">
                  {record.scanTime ? 
                    `${record.status === 'IN' ? 'Check-in' : 'Check-out'}: ${new Date(record.scanTime).toLocaleTimeString()}` :
                    'No scan time recorded'
                  }
                </p>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                record.status === 'IN' ? 'bg-green-100 text-green-800' :
                record.status === 'OUT' ? 'bg-blue-100 text-blue-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {record.status === 'IN' ? 'Check In' : 
                 record.status === 'OUT' ? 'Check Out' : 
                 record.status || 'Unknown'}
              </span>
            </div>
          )) : (
            <div className="text-center py-8 text-gray-500">
              <p>No recent attendance records found</p>
              <p className="text-sm">Check-ins will appear here when {user.student_name} uses the fingerprint scanner</p>
            </div>
          )}
        </div>
      </div>

      {/* Student Info */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Student Information</h3>
        <div className="space-y-3">
          <div className="p-3 bg-blue-50 rounded-lg">
            <p className="font-medium text-blue-900">Student Name</p>
            <p className="text-blue-700">{user.student_name}</p>
          </div>
          
          <div className="p-3 bg-green-50 rounded-lg">
            <p className="font-medium text-green-900">School</p>
            <p className="text-green-700">{user.school?.name || 'Unknown School'}</p>
          </div>
          
          <div className="p-3 bg-purple-50 rounded-lg">
            <p className="font-medium text-purple-900">Parent</p>
            <p className="text-purple-700">{user.parent_name || 'Parent/Guardian'}</p>
          </div>

          <div className="p-3 bg-indigo-50 rounded-lg">
            <p className="font-medium text-indigo-900">Student ID</p>
            <p className="text-indigo-700">{user.student_id}</p>
          </div>

          {/* Contact Status */}
          <div className={`p-3 rounded-lg ${
            user.contact?.hasContact ? 'bg-green-50' : 'bg-yellow-50'
          }`}>
            <p className={`font-medium ${
              user.contact?.hasContact ? 'text-green-900' : 'text-yellow-900'
            }`}>
              Notification Status
            </p>
            <p className={`text-sm ${
              user.contact?.hasContact ? 'text-green-700' : 'text-yellow-700'
            }`}>
              {user.contact?.hasContact ? 
                'Notifications enabled' : 
                'Contact info needed for notifications'
              }
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// Attendance Tab Component
// Updated Attendance Tab Component with sorting
function AttendanceTab({ attendanceData }) {
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'desc' })
  const [sortedData, setSortedData] = useState([])

  useEffect(() => {
    // Default sort by date (newest first)
    if (attendanceData.length > 0) {
      const sorted = [...attendanceData].sort((a, b) => {
        const dateA = new Date(a.scanTime || a.date)
        const dateB = new Date(b.scanTime || b.date)
        return dateB - dateA // Newest first
      })
      setSortedData(sorted)
      setSortConfig({ key: 'date', direction: 'desc' })
    }
  }, [attendanceData])

  const handleSort = (key) => {
    let direction = 'asc'
    
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc'
    }

    const sorted = [...attendanceData].sort((a, b) => {
      let aValue, bValue

      switch (key) {
        case 'date':
          aValue = new Date(a.scanTime || a.date)
          bValue = new Date(b.scanTime || b.date)
          break
        case 'status':
          aValue = a.status || ''
          bValue = b.status || ''
          break
        case 'time':
          if (a.scanTime && b.scanTime) {
            aValue = new Date(a.scanTime)
            bValue = new Date(b.scanTime)
          } else {
            aValue = a.scanTime ? new Date(a.scanTime) : new Date(0)
            bValue = b.scanTime ? new Date(b.scanTime) : new Date(0)
          }
          break
        default:
          return 0
      }

      if (aValue < bValue) {
        return direction === 'asc' ? -1 : 1
      }
      if (aValue > bValue) {
        return direction === 'asc' ? 1 : -1
      }
      return 0
    })

    setSortedData(sorted)
    setSortConfig({ key, direction })
  }

  const getSortIcon = (columnKey) => {
    if (sortConfig.key !== columnKey) {
      return (
        <span className="ml-1 text-gray-400">
          <svg className="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
          </svg>
        </span>
      )
    }
    
    return (
      <span className="ml-1 text-indigo-600">
        {sortConfig.direction === 'asc' ? (
          <svg className="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
        ) : (
          <svg className="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </span>
    )
  }

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'IN':
        return 'bg-green-100 text-green-800'
      case 'OUT':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status) => {
    switch (status) {
      case 'IN':
        return 'Check In'
      case 'OUT':
        return 'Check Out'
      default:
        return status || 'Unknown'
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Attendance History</h3>
        
        {sortedData.length > 0 && (
          <div className="text-sm text-gray-500">
            {sortedData.length} record{sortedData.length !== 1 ? 's' : ''} 
            {sortConfig.key && (
              <span className="ml-2">
                • Sorted by {sortConfig.key} ({sortConfig.direction === 'asc' ? 'oldest first' : 'newest first'})
              </span>
            )}
          </div>
        )}
      </div>

      {sortedData.length > 0 ? (
        <div className="overflow-x-auto bg-white rounded-lg shadow">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort('date')}
                >
                  <div className="flex items-center">
                    Date
                    {getSortIcon('date')}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort('status')}
                >
                  <div className="flex items-center">
                    Action
                    {getSortIcon('status')}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort('time')}
                >
                  <div className="flex items-center">
                    Time
                    {getSortIcon('time')}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedData.map((record, index) => (
                <tr key={record.id || index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 font-medium">
                      {new Date(record.scanTime || record.date).toLocaleDateString('en-US', {
                        weekday: 'short',
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(record.status)}`}>
                      {getStatusText(record.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {record.scanTime ? (
                      <div>
                        <div className="font-medium">
                          {new Date(record.scanTime).toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true
                          })}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(record.scanTime).toLocaleTimeString('en-US', {
                            hour12: false
                          })}
                        </div>
                      </div>
                    ) : (
                      <span className="text-gray-400">No time recorded</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <div className="text-gray-400 text-4xl mb-4">📊</div>
          <h4 className="text-lg font-medium text-gray-900 mb-2">No attendance records found</h4>
          <p className="text-gray-500">
            Records will appear here when your child uses the fingerprint scanner
          </p>
        </div>
      )}
    </div>
  )
}

// Updated Contact Tab Component with ParentContactManager
function ContactTab({ user }) {
  return (
    <div className="space-y-6">
      {/* Contact Update Component */}
      <ParentContactManager user={user} />
      
      {/* School Contact Info */}
      <div className="bg-blue-50 rounded-lg p-6">
        <h4 className="text-lg font-semibold text-blue-900 mb-4">School Contact Information</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="font-medium text-blue-900">School Name</p>
            <p className="text-blue-700">{user.school?.name || 'Unknown School'}</p>
            <p className="text-sm text-blue-600 mt-1">School ID: {user.school?.id}</p>
          </div>
          
          <div>
            <p className="font-medium text-blue-900">Contact School</p>
            <div className="space-y-2 text-blue-700">
              <p>Phone: Contact your school directly</p>
              <p>Email: Contact your school directly</p>
              <p>Office: Main Administration Office</p>
            </div>
          </div>
        </div>
        
        <div className="mt-4 pt-4 border-t border-blue-200">
          <p className="text-sm text-blue-600">
            For questions about attendance records or system issues, please contact your school's administration office.
          </p>
        </div>
      </div>
    </div>
  )
}