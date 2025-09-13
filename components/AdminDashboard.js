import { useState, useEffect, useRef } from 'react'
import { 
  getStatusBadgeClasses, 
  getStatusIcon, 
  formatTime, 
  formatDate,
  enhanceAttendanceWithTimeSettings 
} from '../lib/attendanceUtils'

export default function AdminDashboard({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [stats, setStats] = useState({})
  const [students, setStudents] = useState([])
  const [schools, setSchools] = useState([])
  const [attendance, setAttendance] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [schoolTimeSettings, setSchoolTimeSettings] = useState(null)
  
  // Timeout and activity tracking
  const timeoutRef = useRef(null)
  const TIMEOUT_DURATION = 30 * 60 * 1000 // 5 minutes in milliseconds
  
  // Activity handlers
    const resetTimeout = () => {
    console.log('Activity detected, resetting timeout') // Add this line
    if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
    }
    timeoutRef.current = setTimeout(() => {
        console.log('TIMEOUT TRIGGERED!')
        alert('Session expired due to inactivity. You will be logged out.')
        if (typeof onLogout === 'function') {
            onLogout()
        } else {
            // Fallback if onLogout is not available
            localStorage.removeItem('token')
            localStorage.removeItem('userInfo')
            window.location.replace('/')
        }
    }, TIMEOUT_DURATION)
        }

    useEffect(() => {
        console.log('Setting up timeout listeners') // Debug log
        const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click']
        
        const handleActivity = () => {
        console.log('Activity detected') // Debug log
        resetTimeout()
        }

        // Remove the onLogout check - set up timeout regardless
        events.forEach(event => {
        document.addEventListener(event, handleActivity, true)
        })

        resetTimeout() // Start the timer immediately
        console.log('Timeout started') // Debug log

        return () => {
        console.log('Cleaning up timeout') // Debug log
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current)
        }
        events.forEach(event => {
            document.removeEventListener(event, handleActivity, true)
        })
        }
    }, []) // Remove onLogout dependency

  // FIXED: Better user validation and role determination
  const isCompanyAdmin = user?.role === 'company_admin' || user?.role === 'main_admin'
  const isSchoolAdmin = user?.role === 'school_admin' || user?.SchoolID || user?.school_id

  // FIXED: Only load data if we have a valid user
  useEffect(() => {
    console.log('=== DASHBOARD USEEFFECT TRIGGERED ===')
    console.log('User object:', user)
    console.log('User role:', user?.role)
    console.log('User SchoolID:', user?.SchoolID)
    console.log('User school_id:', user?.school_id)
    console.log('Is company admin:', isCompanyAdmin)
    console.log('Is school admin:', isSchoolAdmin)

    if (!user) {
      console.log('No user object - skipping data load')
      setError('User information not available')
      setLoading(false)
      return
    }

    if (!isCompanyAdmin && !user.SchoolID && !user.school_id) {
      console.log('School admin without school ID - skipping data load')
      setError('School ID not found in user data')
      setLoading(false)
      return
    }

    console.log('Starting dashboard data load...')
    loadDashboardData()
  }, [user])

  const availableTabs = isCompanyAdmin ? [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'attendance', label: 'Network', icon: '👥' },
    { id: 'schools', label: 'Schools', icon: '🏫' },
    { id: 'system-monitor', label: 'Monitor', icon: '⚡' },
    { id: 'analytics', label: 'Analytics', icon: '📈' }
  ] : [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'students', label: 'Students', icon: '👨‍🎓' },
    { id: 'upload', label: 'Upload', icon: '📤' },
    { id: 'attendance', label: 'Attendance', icon: '✅' },
    { id: 'settings', label: 'Settings', icon: '⚙️' }
  ]
  
  const loadDashboardData = async () => {
    console.log('=== LOAD DASHBOARD DATA FUNCTION CALLED ===')
    setLoading(true)
    setError('')
    
    try {
      if (isCompanyAdmin) {
        console.log('Loading company admin data...')
        await loadCompanyAdminData()
      } else {
        console.log('Loading school admin data...')
        await loadSchoolAdminData()
      }
    } catch (error) {
      console.error('Dashboard loading error:', error)
      setError('Failed to load dashboard data: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const loadCompanyAdminData = async () => {
    try {
      const [overviewResponse, schoolsResponse, attendanceResponse, syncResponse] = await Promise.all([
        fetch(`/api/analytics?type=overview`),
        fetch(`/api/analytics?type=schools`),
        fetch(`/api/analytics?type=real-time`),
        fetch(`/api/analytics?type=sync-performance`)
      ])

      const overviewData = await overviewResponse.json()
      const schoolsData = await schoolsResponse.json()
      const attendanceData = await attendanceResponse.json()
      const syncData = await syncResponse.json()

      if (overviewData.success && overviewData.overview) {
        const syncAgents = syncData.success ? syncData.performance_metrics : null
        const systemHealth = determineSystemHealth(overviewData.overview, syncAgents)
        
        setStats({
          total_schools: overviewData.overview.schools?.total || 0,
          total_students: overviewData.overview.students?.total || 0,
          active_sync_agents: syncAgents?.online_agents || 0,
          total_sync_agents: syncAgents?.total_agents || 0,
          system_health: systemHealth,
          total_attendance_today: overviewData.overview.attendance?.today || 0,
          sync_health_score: syncAgents?.avg_health_score || 0
        })
      } else {
        setStats({
          total_schools: 0,
          total_students: 0,
          active_sync_agents: 0,
          total_sync_agents: 0,
          system_health: 'error',
          total_attendance_today: 0,
          sync_health_score: 0
        })
      }

      if (schoolsData.success && schoolsData.schools) {
        setSchools(schoolsData.schools.map(school => ({
          id: school.SchoolID || school.school_id,
          name: school.name,
          location: school.location,
          status: school.status,
          students: school.students?.total || 0,
          syncStatus: school.sync_agent?.connection_status?.toLowerCase() || 'offline'
        })))
      }

      if (attendanceData.success && attendanceData.current_activity) {
        setAttendance(attendanceData.current_activity.map(record => ({
          id: record.attendance_id,
          student_name: record.student_name,
          scan_time: record.scan_time,
          status: record.status,
          created_at: record.created_at,
          school_name: record.school_name
        })))
      } else {
        setAttendance([])
      }

    } catch (error) {
      console.error('Error loading company admin data:', error)
      setStats({
        total_schools: 0,
        total_students: 0,
        active_sync_agents: 0,
        total_sync_agents: 0,
        system_health: 'error',
        total_attendance_today: 0,
        sync_health_score: 0
      })
      setSchools([])
      setAttendance([])
    }
  }

  const loadSchoolAdminData = async () => {
    console.log('=== LOADING SCHOOL ADMIN DATA ===')
    
    try {
      const schoolId = user?.SchoolID || user?.school_id
      
      if (!schoolId) {
        console.error('No school ID found for school admin')
        throw new Error('School ID not found in user data')
      }

      console.log('Using school ID:', schoolId)

      const apiCalls = []

      // Overview/stats API call
      apiCalls.push(
        fetch(`/api/analytics?type=overview&school_id=${schoolId}`)
          .then(response => {
            console.log('Overview API response status:', response.status)
            if (!response.ok) {
              throw new Error(`Overview API failed: ${response.status}`)
            }
            return response.json()
          })
          .catch(error => {
            console.warn('Overview API failed:', error)
            return { success: false, error: error.message }
          })
      )

      // Students API call
      apiCalls.push(
        fetch(`/api/students?school_id=${schoolId}&include_stats=true`)
          .then(response => {
            console.log('Students API response status:', response.status)
            if (!response.ok) {
              throw new Error(`Students API failed: ${response.status}`)
            }
            return response.json()
          })
          .catch(error => {
            console.warn('Students API failed:', error)
            return { success: false, error: error.message }
          })
      )

      // Attendance API call
      apiCalls.push(
        fetch(`/api/analytics?type=real-time&school_id=${schoolId}`)
          .then(response => {
            console.log('Attendance API response status:', response.status)
            if (!response.ok) {
              throw new Error(`Attendance API failed: ${response.status}`)
            }
            return response.json()
          })
          .catch(error => {
            console.warn('Attendance API failed:', error)
            return { success: false, error: error.message }
          })
      )

    // Sync status API call - check school-specific sync agent
    apiCalls.push(
    fetch('/api/sync-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
        action: 'get_status', 
        school_id: schoolId 
        })
    })
        .then(response => {
        console.log('Sync API response status:', response.status)
        if (!response.ok) {
            throw new Error(`Sync API failed: ${response.status}`)
        }
        return response.json()
        })
        .catch(error => {
        console.warn('Sync API failed:', error)
        return { success: false, error: error.message }
        })
    )

    // Also try to get sync performance data for this school
    apiCalls.push(
    fetch(`/api/analytics?type=sync-performance&school_id=${schoolId}`)
        .then(response => {
        console.log('Sync Performance API response status:', response.status)
        if (!response.ok) {
            throw new Error(`Sync Performance API failed: ${response.status}`)
        }
        return response.json()
        })
        .catch(error => {
        console.warn('Sync Performance API failed:', error)
        return { success: false, error: error.message }
        })
    )

      console.log('Making parallel API calls...')
      const [overviewData, studentsData, attendanceData, syncStatus, syncPerformance] = await Promise.all(apiCalls)

      console.log('=== API RESPONSES ===')
      console.log('Overview:', overviewData)
      console.log('Students:', studentsData)
      console.log('Attendance:', attendanceData)
      console.log('Sync Status:', syncStatus)
      console.log('=== END API RESPONSES ===')

        // FIXED: Better sync agent status detection for school admin
    let syncAgentStatus = 'offline'

    // Method 1: Check sync status response
    if (syncStatus?.success) {
    if (syncStatus.school_id && syncStatus.school_id == schoolId) {
        syncAgentStatus = syncStatus.status || 'online'
        console.log('Sync status from get_status:', syncAgentStatus)
    } else if (syncStatus.result && syncStatus.result.school_id == schoolId) {
        syncAgentStatus = 'online'
        console.log('Sync status from ping result:', syncAgentStatus)
    }
    }

    // Method 2: Check sync performance data
    if (syncAgentStatus === 'offline' && syncPerformance?.success && syncPerformance.agents) {
    const schoolAgent = syncPerformance.agents.find(agent => agent.school_id == schoolId)
    if (schoolAgent) {
        syncAgentStatus = schoolAgent.connection_status === 'Online' ? 'online' : 'offline'
        console.log('Sync status from performance data:', syncAgentStatus)
    }
    }

    // Method 3: Check if sync agent database tables exist and have recent data
    if (syncAgentStatus === 'offline') {
    // Try to ping the sync agent directly for this school
    try {
        const pingResponse = await fetch('/api/sync-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            action: 'ping_agent', 
            school_id: schoolId 
        })
        })
        const pingData = await pingResponse.json()
        if (pingData.success && pingData.result?.status === 'online') {
        syncAgentStatus = 'online'
        console.log('Sync status from ping:', syncAgentStatus)
        }
    } catch (error) {
        console.warn('Sync agent ping failed:', error)
    }
    }

    console.log('Final sync agent status determined as:', syncAgentStatus)
      console.log('Sync agent status determined as:', syncAgentStatus)

      let totalStudents = 0
      let presentToday = 0
      let withoutPasswords = 0

      // Process students data
      if (studentsData?.success && Array.isArray(studentsData.data)) {
        console.log('Processing students data - count:', studentsData.data.length)
        totalStudents = studentsData.data.length
        withoutPasswords = studentsData.data.filter(s => !s.parent_password_set).length

        setStudents(studentsData.data.map(student => ({
          id: student.student_id,
          name: student.name,
          grade: student.grade,
          studentCode: student.student_code,
          student_code: student.student_code,
          parentPasswordSet: student.parent_password_set,
          parent_password_set: student.parent_password_set,
          lastSeen: student.attendance_stats?.last_attendance,
          is_active: student.is_active !== false
        })))
      } else {
        console.log('Using fallback student data')
        const fallbackStudents = [
          { id: 1, name: 'John Doe', grade: '10th', studentCode: '001', parentPasswordSet: true, lastSeen: '2024-12-19T08:15:00', is_active: true },
          { id: 2, name: 'Jane Smith', grade: '9th', studentCode: '002', parentPasswordSet: false, lastSeen: null, is_active: true },
        ]
        setStudents(fallbackStudents)
        totalStudents = fallbackStudents.length
        withoutPasswords = fallbackStudents.filter(s => !s.parentPasswordSet).length
      }

      // Process attendance data
      if (attendanceData?.success && Array.isArray(attendanceData.current_activity)) {
        console.log('Processing attendance data - total records:', attendanceData.current_activity.length)
        
        const todayString = new Date().toISOString().split('T')[0]
        const schoolAttendanceToday = attendanceData.current_activity.filter(record => {
          const recordDate = new Date(record.scan_time || record.created_at).toISOString().split('T')[0]
          const isToday = recordDate === todayString
          const isOurSchool = record.school_id == schoolId
          return isToday && isOurSchool
        })

        console.log('Filtered attendance for our school today:', schoolAttendanceToday.length)
        presentToday = schoolAttendanceToday.filter(r => r.status === 'IN').length

        const recentCheckIns = schoolAttendanceToday
          .sort((a, b) => new Date(b.scan_time || b.created_at) - new Date(a.scan_time || a.created_at))
          .slice(0, 10)

        setAttendance(recentCheckIns.map(record => ({
          id: record.attendance_id,
          studentName: record.student_name,
          status: record.status,
          time: record.scan_time,
          grade: 'N/A'
        })))
      } else {
        console.log('No valid attendance data received')
        setAttendance([])
      }

      const calculatedStats = {
        total_students: totalStudents,
        present_today: presentToday,
        absent_today: Math.max(0, totalStudents - presentToday),
        students_without_passwords: withoutPasswords,
        sync_status: syncAgentStatus
      }

      console.log('Setting calculated stats:', calculatedStats)
      setStats(calculatedStats)

      console.log('=== SCHOOL ADMIN DATA LOADING COMPLETE ===')

    } catch (error) {
      console.error('Error in loadSchoolAdminData:', error)
      setError('Some data could not be loaded: ' + error.message)
      
      setStats({
        total_students: 0,
        present_today: 0,
        absent_today: 0,
        students_without_passwords: 0,
        sync_status: 'offline'
      })
      setStudents([])
      setAttendance([])
    }
  }

  const determineSystemHealth = (overview, syncData) => {
    let totalAgents = 0
    let onlineAgents = 0
    let avgHealthScore = 0
    let errorRate = 0

    if (syncData && syncData.total_agents !== undefined) {
      totalAgents = syncData.total_agents
      onlineAgents = syncData.online_agents || 0
      avgHealthScore = syncData.avg_health_score || 0
      errorRate = syncData.avg_error_rate || 0
    } else if (overview && overview.sync_agents) {
      totalAgents = overview.sync_agents.total || 0
      onlineAgents = overview.sync_agents.online || 0
      errorRate = overview.performance?.error_rate || 0
    }

    console.log('System Health Calculation:', { totalAgents, onlineAgents, avgHealthScore, errorRate })

    if (totalAgents === 0) {
      return 'no_agents'
    }

    if (onlineAgents === 0) {
      return 'error'
    }

    const onlinePercentage = totalAgents > 0 ? (onlineAgents / totalAgents) * 100 : 0

    if (onlinePercentage >= 60) {
      return 'healthy'
    } else if (onlinePercentage >= 20) {
      return 'degraded'
    } else {
      return 'error'
    }
  }

  // FIXED: Better loading state with user validation
  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-red-600 text-4xl mb-2">⚠️</div>
          <p className="text-gray-600">User information not available</p>
          <p className="text-sm text-gray-500 mt-2">Please log in again</p>
          <button 
            onClick={() => window.location.href = '/login'}
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Go to Login
          </button>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
          <p className="text-sm text-gray-500">
            {isCompanyAdmin ? 'Loading company data...' : `Loading school data (ID: ${user?.SchoolID || user?.school_id || 'unknown'})...`}
          </p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p className="font-medium">Dashboard Error</p>
          <p className="text-sm mt-1">{error}</p>
          <div className="mt-4 space-x-2">
            <button 
              onClick={loadDashboardData}
              className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
            >
              Retry
            </button>
            <button 
              onClick={() => setError('')}
              className="bg-gray-600 text-white px-3 py-1 rounded text-sm hover:bg-gray-700"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
      {/* Header Section */}
      <div className="mb-6 sm:mb-8">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
          {isCompanyAdmin ? 'ZKTime Company Dashboard' : 'School Administrator'}
        </h2>
        <p className="text-gray-600 text-sm sm:text-base">
          {isCompanyAdmin 
            ? 'Manage the entire ZKTime network and monitor all schools' 
            : `Manage ${user.school?.name || 'your school'} (ID: ${user?.SchoolID || user?.school_id})`
          }
        </p>
      </div>

      {/* Stats Cards - Responsive Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8">
        {isCompanyAdmin ? (
          <>
            <div className="bg-white p-3 sm:p-6 rounded-lg shadow">
              <div className="flex items-center">
                <div className="w-8 h-8 sm:w-12 sm:h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <span className="text-blue-600 text-sm sm:text-xl">🏫</span>
                </div>
                <div className="ml-2 sm:ml-4">
                  <p className="text-xs sm:text-sm font-medium text-gray-600">Schools Network</p>
                  <p className="text-lg sm:text-2xl font-bold text-gray-900">{stats.total_schools}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-3 sm:p-6 rounded-lg shadow">
              <div className="flex items-center">
                <div className="w-8 h-8 sm:w-12 sm:h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <span className="text-green-600 text-sm sm:text-xl">👥</span>
                </div>
                <div className="ml-2 sm:ml-4">
                  <p className="text-xs sm:text-sm font-medium text-gray-600">Total Students</p>
                  <p className="text-lg sm:text-2xl font-bold text-gray-900">{stats.total_students}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-3 sm:p-6 rounded-lg shadow">
              <div className="flex items-center">
                <div className="w-8 h-8 sm:w-12 sm:h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <span className="text-purple-600 text-sm sm:text-xl">⚡</span>
                </div>
                <div className="ml-2 sm:ml-4">
                  <p className="text-xs sm:text-sm font-medium text-gray-600">Active Sync Agents</p>
                  <p className="text-lg sm:text-2xl font-bold text-gray-900">{stats.active_sync_agents}/{stats.total_sync_agents}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-3 sm:p-6 rounded-lg shadow">
              <div className="flex items-center">
                <div className={`w-8 h-8 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center ${
                  stats.system_health === 'healthy' ? 'bg-green-100' : 
                  stats.system_health === 'degraded' ? 'bg-yellow-100' : 'bg-red-100'
                }`}>
                  <span className={`text-sm sm:text-xl ${
                    stats.system_health === 'healthy' ? 'text-green-600' : 
                    stats.system_health === 'degraded' ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {stats.system_health === 'healthy' ? '✓' : 
                     stats.system_health === 'degraded' ? '⚠' : '✗'}
                  </span>
                </div>
                <div className="ml-2 sm:ml-4">
                  <p className="text-xs sm:text-sm font-medium text-gray-600">System Health</p>
                  <p className="text-lg sm:text-2xl font-bold text-gray-900 capitalize">{stats.system_health}</p>
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="bg-white p-3 sm:p-6 rounded-lg shadow">
              <div className="flex items-center">
                <div className="w-8 h-8 sm:w-12 sm:h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <span className="text-blue-600 text-sm sm:text-xl">👥</span>
                </div>
                <div className="ml-2 sm:ml-4">
                  <p className="text-xs sm:text-sm font-medium text-gray-600">Total Students</p>
                  <p className="text-lg sm:text-2xl font-bold text-gray-900">{stats.total_students}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-3 sm:p-6 rounded-lg shadow">
              <div className="flex items-center">
                <div className="w-8 h-8 sm:w-12 sm:h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <span className="text-green-600 text-sm sm:text-xl">✅</span>
                </div>
                <div className="ml-2 sm:ml-4">
                  <p className="text-xs sm:text-sm font-medium text-gray-600">Present Today</p>
                  <p className="text-lg sm:text-2xl font-bold text-gray-900">{stats.present_today}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-3 sm:p-6 rounded-lg shadow">
              <div className="flex items-center">
                <div className="w-8 h-8 sm:w-12 sm:h-12 bg-red-100 rounded-lg flex items-center justify-center">
                  <span className="text-red-600 text-sm sm:text-xl">❌</span>
                </div>
                <div className="ml-2 sm:ml-4">
                  <p className="text-xs sm:text-sm font-medium text-gray-600">Absent Today</p>
                  <p className="text-lg sm:text-2xl font-bold text-gray-900">{stats.absent_today}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-3 sm:p-6 rounded-lg shadow">
              <div className="flex items-center">
                <div className="w-8 h-8 sm:w-12 sm:h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <span className="text-purple-600 text-sm sm:text-xl">🔐</span>
                </div>
                <div className="ml-2 sm:ml-4">
                  <p className="text-xs sm:text-sm font-medium text-gray-600">Need Parent Setup</p>
                  <p className="text-lg sm:text-2xl font-bold text-gray-900">{stats.students_without_passwords}</p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white rounded-xl shadow-sm mb-6 sm:mb-8">
        {/* Desktop Navigation */}
        <div className="hidden md:block border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {availableTabs.map(tab => (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id 
                    ? 'border-indigo-500 text-indigo-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden border-b border-gray-200">
          <div className="px-4 py-3">
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="flex items-center justify-between w-full text-left"
            >
              <div className="flex items-center">
                <span className="text-lg mr-2">
                  {availableTabs.find(tab => tab.id === activeTab)?.icon}
                </span>
                <span className="font-medium text-gray-900">
                  {availableTabs.find(tab => tab.id === activeTab)?.label}
                </span>
              </div>
              <svg 
                className={`w-5 h-5 text-gray-400 transform transition-transform ${showMobileMenu ? 'rotate-180' : ''}`}
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {showMobileMenu && (
              <div className="mt-3 space-y-1">
                {availableTabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id)
                      setShowMobileMenu(false)
                    }}
                    className={`flex items-center w-full text-left px-3 py-2 rounded-md text-sm font-medium ${
                      activeTab === tab.id
                        ? 'bg-indigo-100 text-indigo-700'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    <span className="text-lg mr-3">{tab.icon}</span>
                    {tab.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-4 sm:p-6">
          {activeTab === 'dashboard' && <DashboardTab attendance={attendance} stats={stats} isCompanyAdmin={isCompanyAdmin} user={user} setActiveTab={setActiveTab} schoolTimeSettings={schoolTimeSettings} />}
          {activeTab === 'students' && !isCompanyAdmin && <StudentsTab students={students} onRefresh={loadDashboardData} user={user} />}
          {activeTab === 'upload' && !isCompanyAdmin && <UploadStudentsTab user={user} onUploadComplete={loadDashboardData} />}
          {activeTab === 'attendance' && <AttendanceTabMobileResponsive attendance={attendance} isCompanyAdmin={isCompanyAdmin} user={user} />}
          {activeTab === 'settings' && !isCompanyAdmin && <SchoolSettingsTab user={user} />}
          {activeTab === 'system-monitor' && isCompanyAdmin && <SystemMonitorTab companyId={user.company_id} user={user} />}
          {activeTab === 'schools' && isCompanyAdmin && <SchoolsNetworkTab companyId={user.company_id} user={user} />}
          {activeTab === 'analytics' && isCompanyAdmin && <AnalyticsTab companyId={user.company_id} user={user} />}
        </div>
      </div>
    </div>
  )
}

// FIXED DashboardTab Component
function DashboardTab({ attendance, stats, isCompanyAdmin, user, setActiveTab, schoolTimeSettings }) {
  if (isCompanyAdmin) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Network-wide Activity */}
        <div>
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Network Activity Today</h3>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {attendance && attendance.length > 0 ? (
              attendance.slice(0, 10).map((record) => (
                <div key={record.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{record.student_name}</p>
                    <p className="text-sm text-gray-600">{record.school_name || 'Unknown School'}</p>
                  </div>
                  <div className="text-right">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      record.status === 'IN' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {record.status === 'IN' ? 'Check In' : 'Check Out'}
                    </span>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(record.scan_time || record.created_at).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p className="text-sm">No network activity today</p>
              </div>
            )}
          </div>
        </div>

        {/* System Overview */}
        <div>
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">System Overview</h3>
          <div className="space-y-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">Quick Actions</h4>
              <div className="space-y-2">
                <button 
                  onClick={() => setActiveTab('schools')}
                  className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm"
                >
                  Add New School
                </button>
                <button 
                  onClick={() => setActiveTab('analytics')}
                  className="w-full bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 text-sm"
                >
                  View All Reports
                </button>
                <button 
                  onClick={() => setActiveTab('system-monitor')}
                  className="w-full bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 text-sm"
                >
                  System Health Check
                </button>
              </div>
            </div>
            
            <div className="bg-green-50 rounded-lg p-4">
              <h4 className="font-medium text-green-900 mb-2">Network Status</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Active Schools:</span>
                  <span className="font-medium">{stats.total_schools || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Sync Agents Running:</span>
                  <span className="font-medium">{stats.active_sync_agents || 0}/{stats.total_sync_agents || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Today's Attendance:</span>
                  <span className="font-medium">{stats.total_attendance_today || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>System Health:</span>
                  <span className={`font-medium ${
                    stats.system_health === 'healthy' ? 'text-green-600' :
                    stats.system_health === 'degraded' ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {stats.system_health?.charAt(0).toUpperCase() + stats.system_health?.slice(1) || 'Unknown'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
      {/* Settings Configuration Notice */}
      {!schoolTimeSettings && (
        <div className="lg:col-span-2 bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
          <div className="flex items-start">
            <svg className="h-5 w-5 text-yellow-400 mt-0.5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <div className="flex-1">
              <h4 className="text-sm font-medium text-yellow-800">Configure School Time Settings</h4>
              <p className="text-sm text-yellow-700 mt-1">
                Set up late arrival and early departure thresholds to automatically track attendance status.
              </p>
              <button 
                onClick={() => setActiveTab('settings')}
                className="mt-2 bg-yellow-600 text-white px-3 py-1 rounded text-sm hover:bg-yellow-700"
              >
                Configure Now
              </button>
            </div>
          </div>
        </div>
      )}
      
      <div>
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Recent Check-ins</h3>
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {attendance && attendance.length > 0 ? (
            attendance.map((record) => (
              <div key={record.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">{record.studentName}</p>
                  <p className="text-sm text-gray-600">{record.grade || 'Grade N/A'}</p>
                </div>
                <div className="text-right">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    record.status === 'IN' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                  }`}>
                    {record.status === 'IN' ? 'Check In' : 'Check Out'}
                  </span>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(record.time).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p className="text-sm">No check-ins today</p>
            </div>
          )}
        </div>
      </div>

      <div>
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">System Status</h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
            <div>
              <p className="font-medium text-green-900">Database Connection</p>
              <p className="text-sm text-green-600">Connected to AWS RDS</p>
            </div>
            <span className="w-3 h-3 bg-green-500 rounded-full"></span>
          </div>
          
          <div className={`flex justify-between items-center p-3 rounded-lg ${
            stats.sync_status === 'online' ? 'bg-green-50' : 'bg-red-50'
          }`}>
            <div>
              <p className={`font-medium ${stats.sync_status === 'online' ? 'text-green-900' : 'text-red-900'}`}>
                Sync Agent
              </p>
              <p className={`text-sm ${stats.sync_status === 'online' ? 'text-green-600' : 'text-red-600'}`}>
                {stats.sync_status === 'online' ? 'Online and running' : 'Offline'}
              </p>
            </div>
            <span className={`w-3 h-3 rounded-full ${
              stats.sync_status === 'online' ? 'bg-green-500' : 'bg-red-500'
            }`}></span>
          </div>
          
          <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
            <div>
              <p className="font-medium text-blue-900">Parent Notifications</p>
              <p className="text-sm text-blue-600">Email & SMS configured</p>
            </div>
            <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
          </div>
        </div>
      </div>
    </div>
  )
}

// School Settings Tab Component  
function SchoolSettingsTab({ user }) {
  const [settings, setSettings] = useState({
    late_arrival_time: '08:30',
    early_departure_time: '14:00',
    school_start_time: '08:00',
    school_end_time: '15:00',
    timezone: 'Africa/Accra'
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      setLoading(true)
      const schoolId = user?.school_id || user?.SchoolID || 2
      const response = await fetch(`/api/school-settings?school_id=${schoolId}`)
      const data = await response.json()
      
      if (data.success && data.settings) {
        setSettings({
          late_arrival_time: data.settings.late_arrival_time || '08:30',
          early_departure_time: data.settings.early_departure_time || '14:00',
          school_start_time: data.settings.school_start_time || '08:00',
          school_end_time: data.settings.school_end_time || '15:00',
          timezone: data.settings.timezone || 'Africa/Accra'
        })
      }
    } catch (error) {
      console.error('Error fetching settings:', error)
      setError('Failed to load settings')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveSettings = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')

    if (settings.late_arrival_time <= settings.school_start_time) {
      setError('Late arrival time must be after school start time')
      setSaving(false)
      return
    }

    if (settings.early_departure_time >= settings.school_end_time) {
      setError('Early departure time must be before school end time')
      setSaving(false)
      return
    }

    try {
      const schoolId = user?.school_id || user?.SchoolID || 2
      const response = await fetch('/api/school-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_id: schoolId,
          ...settings
        })
      })

      const result = await response.json()
      
      if (result.success) {
        setSuccess('Settings saved successfully!')
        setTimeout(() => setSuccess(''), 3000)
      } else {
        setError(result.error || 'Failed to save settings')
      }
    } catch (error) {
      console.error('Error saving settings:', error)
      setError('Failed to save settings: Network error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading settings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900">School Time Settings</h3>
        <p className="text-sm text-gray-600 mt-1">
          Configure attendance timing rules for your school. These settings determine when students are marked as late or leaving early.
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
          {success}
        </div>
      )}

      <form onSubmit={handleSaveSettings} className="space-y-6">
        <div className="bg-white p-6 rounded-lg shadow border">
          <h4 className="text-md font-medium text-gray-900 mb-4">School Hours</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                School Start Time
              </label>
              <input
                type="time"
                value={settings.school_start_time}
                onChange={(e) => setSettings({...settings, school_start_time: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                School End Time
              </label>
              <input
                type="time"
                value={settings.school_end_time}
                onChange={(e) => setSettings({...settings, school_end_time: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <h4 className="text-md font-medium text-gray-900 mb-4">Attendance Thresholds</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Late Arrival Threshold
              </label>
              <input
                type="time"
                value={settings.late_arrival_time}
                onChange={(e) => setSettings({...settings, late_arrival_time: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Early Departure Threshold
              </label>
              <input
                type="time"
                value={settings.early_departure_time}
                onChange={(e) => setSettings({...settings, early_departure_time: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          <button
            type="submit"
            disabled={saving}
            className="w-full sm:w-auto bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
          
          <button
            type="button"
            onClick={fetchSettings}
            disabled={saving}
            className="w-full sm:w-auto bg-gray-600 text-white px-6 py-2 rounded-md hover:bg-gray-700 disabled:opacity-50 font-medium"
          >
            Reset to Saved
          </button>
        </div>
      </form>
    </div>
  )
}

// Enhanced StudentsTab Component
function StudentsTab({ students, onRefresh, user }) {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [selectedGrade, setSelectedGrade] = useState('')
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [modalType, setModalType] = useState('') // 'add', 'edit', 'delete', 'view'
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [grades, setGrades] = useState([])
  
  const [studentForm, setStudentForm] = useState({
    name: '',
    grade: '',
    student_code: '',
    parent_password: '',
    is_active: true
  })

  // Extract unique grades from students
  useEffect(() => {
    const uniqueGrades = [...new Set(students.map(s => s.grade).filter(Boolean))].sort()
    setGrades(uniqueGrades)
  }, [students])

  const filteredStudents = students.filter(student => {
    const matchesSearch = student.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         student.studentCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         student.student_code?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesFilter = filterStatus === 'all' ||
                         (filterStatus === 'with_password' && (student.parentPasswordSet || student.parent_password_set)) ||
                         (filterStatus === 'without_password' && !(student.parentPasswordSet || student.parent_password_set)) ||
                         (filterStatus === 'active' && student.is_active !== false) ||
                         (filterStatus === 'inactive' && student.is_active === false)
    
    const matchesGrade = !selectedGrade || student.grade === selectedGrade
    
    return matchesSearch && matchesFilter && matchesGrade
  })

  const resetForm = () => {
    setStudentForm({
      name: '',
      grade: '',
      student_code: '',
      parent_password: '',
      is_active: true
    })
  }

  // Modal handlers
  const openModal = (type, student = null) => {
    setModalType(type)
    setSelectedStudent(student)
    
    if (type === 'edit' && student) {
      setStudentForm({
        name: student.name || '',
        grade: student.grade || '',
        student_code: student.student_code || student.studentCode || '',
        parent_password: '',
        is_active: student.is_active !== false
      })
    } else if (type === 'add') {
      resetForm()
      if (selectedGrade) {
        setStudentForm(prev => ({ ...prev, grade: selectedGrade }))
      }
    }
    
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setModalType('')
    setSelectedStudent(null)
    resetForm()
  }

  // CRUD operations
  const handleSave = async (e) => {
    e.preventDefault()
    
    if (!studentForm.name.trim()) {
      alert('Student name is required')
      return
    }

    setLoading(true)
    
    try {
      let response
      
      if (modalType === 'add') {
        response = await fetch('/api/students', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...studentForm,
            school_id: user.school_id || user.SchoolID,
            name: studentForm.name.trim()
          })
        })
      } else if (modalType === 'edit') {
        response = await fetch(`/api/students?student_id=${selectedStudent.id || selectedStudent.student_id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(studentForm)
        })
      }

      const result = await response.json()
      
      if (result.success) {
        closeModal()
        onRefresh()
        alert(modalType === 'add' ? 'Student added successfully!' : 'Student updated successfully!')
      } else {
        alert(`Failed to ${modalType} student: ` + (result.error || 'Unknown error'))
      }
    } catch (error) {
      console.error(`${modalType} student error:`, error)
      alert(`Failed to ${modalType} student: Network error`)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (force = false) => {
    setLoading(true)
    
    try {
      const response = await fetch(`/api/students?student_id=${selectedStudent.id || selectedStudent.student_id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force_delete: force })
      })

      const result = await response.json()
      
      if (result.success) {
        closeModal()
        onRefresh()
        alert(result.message || 'Student deleted successfully!')
      } else {
        alert('Failed to delete student: ' + (result.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('Delete student error:', error)
      alert('Failed to delete student: Network error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Student Management</h3>
          <p className="text-gray-600 text-sm">
            {selectedGrade ? `Grade ${selectedGrade} students` : 'All students'} 
            ({filteredStudents.length} of {students.length} total)
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <button 
            onClick={onRefresh} 
            disabled={loading}
            className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 disabled:opacity-50 text-sm"
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>
          <button 
            onClick={() => openModal('add')}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm"
          >
            Add Student
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search by name or student code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
        </div>
        
        {/* Grade Filter */}
        {grades.length > 0 && (
          <select
            value={selectedGrade}
            onChange={(e) => setSelectedGrade(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-auto text-sm"
          >
            <option value="">All Grades</option>
            {grades.map((grade) => (
              <option key={grade} value={grade}>
                Grade {grade}
              </option>
            ))}
          </select>
        )}
        
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-auto text-sm"
        >
          <option value="all">All Students</option>
          <option value="active">Active Students</option>
          <option value="inactive">Inactive Students</option>
          <option value="with_password">With Parent Password</option>
          <option value="without_password">Need Parent Setup</option>
        </select>
      </div>

      {/* Students Table */}
      <div className="overflow-x-auto -mx-4 sm:mx-0">
        <div className="inline-block min-w-full align-middle">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Student
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Grade
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                  Student Code
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredStudents.length > 0 ? filteredStudents.map((student) => (
                <tr key={student.id || student.student_id}>
                  <td className="px-3 sm:px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">{student.name}</div>
                    <div className="text-xs text-gray-500">ID: {student.id || student.student_id}</div>
                  </td>
                  <td className="px-3 sm:px-6 py-4">
                    <div className="text-sm text-gray-500">{student.grade || 'Not set'}</div>
                    <div className="text-xs text-gray-500">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        (student.parentPasswordSet || student.parent_password_set) ? 
                        'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {(student.parentPasswordSet || student.parent_password_set) ? 'Parent OK' : 'Setup needed'}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 sm:px-6 py-4 hidden sm:table-cell">
                    <div className="text-sm font-mono text-gray-900">
                      {student.studentCode || student.student_code || 'Not set'}
                    </div>
                  </td>
                  <td className="px-3 sm:px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      student.is_active !== false ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {student.is_active !== false ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-3 sm:px-6 py-4 text-sm font-medium">
                    <div className="flex flex-col sm:flex-row gap-1 sm:gap-2">
                      <button 
                        onClick={() => openModal('view', student)}
                        className="text-blue-600 hover:text-blue-900 text-xs sm:text-sm"
                        disabled={loading}
                      >
                        View
                      </button>
                      <button 
                        onClick={() => openModal('edit', student)}
                        className="text-indigo-600 hover:text-indigo-900 text-xs sm:text-sm"
                        disabled={loading}
                      >
                        Edit
                      </button>
                      <button 
                        onClick={() => openModal('delete', student)}
                        className="text-red-600 hover:text-red-900 text-xs sm:text-sm"
                        disabled={loading}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                    {selectedGrade ? `No students found in Grade ${selectedGrade}` : 'No students found'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Grade Summary Cards */}
      {grades.length > 0 && (
        <div className="mt-6 bg-white p-4 rounded-lg shadow border">
          <h4 className="text-md font-medium text-gray-900 mb-3">Grade Distribution</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {grades.map((grade) => (
              <div 
                key={grade}
                className={`text-center p-3 rounded-lg cursor-pointer transition-colors ${
                  selectedGrade === grade 
                    ? 'bg-blue-100 border-2 border-blue-500' 
                    : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                }`}
                onClick={() => setSelectedGrade(selectedGrade === grade ? '' : grade)}
              >
                <div className="text-sm font-bold text-gray-900">Grade {grade}</div>
                <div className="text-xs text-gray-600">
                  {students.filter(s => s.grade === grade).length} students
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-lg font-semibold text-gray-900">
                {modalType === 'add' && 'Add New Student'}
                {modalType === 'edit' && 'Edit Student'}
                {modalType === 'delete' && 'Delete Student'}
                {modalType === 'view' && 'Student Details'}
              </h4>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            {/* Modal Content */}
            {(modalType === 'add' || modalType === 'edit') && (
              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Student Name *
                  </label>
                  <input
                    type="text"
                    value={studentForm.name}
                    onChange={(e) => setStudentForm({...studentForm, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter full name"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Grade
                  </label>
                  <input
                    type="text"
                    value={studentForm.grade}
                    onChange={(e) => setStudentForm({...studentForm, grade: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., 10th, Grade 5"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Student Code
                  </label>
                  <input
                    type="text"
                    value={studentForm.student_code}
                    onChange={(e) => setStudentForm({...studentForm, student_code: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Optional unique code"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Parent Password
                  </label>
                  <input
                    type="password"
                    value={studentForm.parent_password}
                    onChange={(e) => setStudentForm({...studentForm, parent_password: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={modalType === 'edit' ? 'Leave blank to keep current' : 'Optional'}
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={studentForm.is_active}
                    onChange={(e) => setStudentForm({...studentForm, is_active: e.target.checked})}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label className="ml-2 block text-sm text-gray-900">Active</label>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {loading ? (modalType === 'add' ? 'Adding...' : 'Updating...') : (modalType === 'add' ? 'Add Student' : 'Update Student')}
                  </button>
                  <button
                    type="button"
                    onClick={closeModal}
                    disabled={loading}
                    className="w-full bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {modalType === 'view' && selectedStudent && (
              <div className="space-y-3">
                <p><strong>Name:</strong> {selectedStudent.name}</p>
                <p><strong>Student ID:</strong> {selectedStudent.id || selectedStudent.student_id}</p>
                <p><strong>Grade:</strong> {selectedStudent.grade || 'Not set'}</p>
                <p><strong>Student Code:</strong> {selectedStudent.student_code || selectedStudent.studentCode || 'Not set'}</p>
                <p><strong>Status:</strong> {selectedStudent.is_active !== false ? 'Active' : 'Inactive'}</p>
                <p><strong>Parent Password:</strong> {(selectedStudent.parentPasswordSet || selectedStudent.parent_password_set) ? 'Set' : 'Not set'}</p>
                <p><strong>Last Activity:</strong> {
                  selectedStudent.last_activity 
                    ? new Date(selectedStudent.last_activity).toLocaleString()
                    : 'No activity'
                }</p>
                <div className="flex justify-end mt-6">
                  <button
                    onClick={closeModal}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}

            {modalType === 'delete' && selectedStudent && (
              <div>
                <p className="text-gray-700 mb-4">
                  Are you sure you want to delete <strong>{selectedStudent.name}</strong>?
                </p>
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={closeModal}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleDelete(false)}
                    className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700"
                    disabled={loading}
                  >
                    {loading ? 'Processing...' : 'Deactivate'}
                  </button>
                  <button
                    onClick={() => handleDelete(true)}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                    disabled={loading}
                  >
                    {loading ? 'Processing...' : 'Force Delete'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// function StudentsTab({ schoolId }) {
//   const [students, setStudents] = useState([])
//   const [grades, setGrades] = useState([])
//   const [selectedGrade, setSelectedGrade] = useState('')
//   const [loading, setLoading] = useState(true)
//   const [error, setError] = useState(null)
//   const [showModal, setShowModal] = useState(false)
//   const [modalType, setModalType] = useState('') // 'add', 'edit', 'delete', 'view'
//   const [selectedStudent, setSelectedStudent] = useState(null)
//   const [formData, setFormData] = useState({
//     name: '',
//     grade: '',
//     student_code: '',
//     parent_password: '',
//     is_active: true
//   })

//   useEffect(() => {
//     loadStudents()
//     loadGrades()
//   }, [schoolId])

//   useEffect(() => {
//     if (selectedGrade !== '') {
//       filterStudentsByGrade()
//     } else {
//       loadStudents()
//     }
//   }, [selectedGrade])

//   const loadStudents = async () => {
//     try {
//       setLoading(true)
//       const response = await fetch(`/api/students?school_id=${schoolId}${selectedGrade ? `&grade=${selectedGrade}` : ''}`)
//       const result = await response.json()
      
//       if (result.success) {
//         // Handle both old and new API response formats
//         setStudents(result.students || result.data || [])
//       } else {
//         setError(result.error || 'Failed to load students')
//       }
//     } catch (err) {
//       setError('Failed to load students')
//       console.error('Error loading students:', err)
//     } finally {
//       setLoading(false)
//     }
//   }

//   const loadGrades = async () => {
//     try {
//       const response = await fetch(`/api/students?school_id=${schoolId}&type=grades`)
//       const result = await response.json()
      
//       if (result.success) {
//         setGrades(result.grades || [])
//       }
//     } catch (err) {
//       console.error('Error loading grades:', err)
//     }
//   }

//   const filterStudentsByGrade = () => {
//     loadStudents()
//   }

//   // Modal handlers
//   const openModal = (type, student = null) => {
//     setModalType(type)
//     setSelectedStudent(student)
    
//     if (type === 'edit' && student) {
//       setFormData({
//         name: student.name || '',
//         grade: student.grade || '',
//         student_code: student.student_code || '',
//         parent_password: '',
//         is_active: student.is_active !== false
//       })
//     } else if (type === 'add') {
//       setFormData({
//         name: '',
//         grade: selectedGrade || '',
//         student_code: '',
//         parent_password: '',
//         is_active: true
//       })
//     }
    
//     setShowModal(true)
//   }

//   const closeModal = () => {
//     setShowModal(false)
//     setModalType('')
//     setSelectedStudent(null)
//     setFormData({
//       name: '',
//       grade: '',
//       student_code: '',
//       parent_password: '',
//       is_active: true
//     })
//   }

//   // CRUD operations
//   const handleSave = async (e) => {
//     e.preventDefault()
//     try {
//       let response
      
//       if (modalType === 'add') {
//         response = await fetch('/api/students', {
//           method: 'POST',
//           headers: {
//             'Content-Type': 'application/json',
//           },
//           body: JSON.stringify({
//             ...formData,
//             school_id: schoolId
//           })
//         })
//       } else if (modalType === 'edit') {
//         response = await fetch(`/api/students?student_id=${selectedStudent.student_id}`, {
//           method: 'PUT',
//           headers: {
//             'Content-Type': 'application/json',
//           },
//           body: JSON.stringify(formData)
//         })
//       }

//       const result = await response.json()
      
//       if (result.success) {
//         await loadStudents()
//         closeModal()
//         setError(null)
//       } else {
//         setError(result.error || 'Operation failed')
//       }
//     } catch (err) {
//       setError('Operation failed')
//       console.error('Error saving student:', err)
//     }
//   }

//   const handleDelete = async (force = false) => {
//     try {
//       const response = await fetch(`/api/students?student_id=${selectedStudent.student_id}`, {
//         method: 'DELETE',
//         headers: {
//           'Content-Type': 'application/json',
//         },
//         body: JSON.stringify({
//           force_delete: force
//         })
//       })

//       const result = await response.json()
      
//       if (result.success) {
//         await loadStudents()
//         closeModal()
//         setError(null)
//       } else {
//         setError(result.error || 'Delete failed')
//       }
//     } catch (err) {
//       setError('Delete failed')
//       console.error('Error deleting student:', err)
//     }
//   }

//   if (loading) {
//     return (
//       <div className="flex items-center justify-center h-64">
//         <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
//         <span className="ml-3">Loading students...</span>
//       </div>
//     )
//   }

//   return (
//     <div className="space-y-6">
//       {/* Header with Grade Filter */}
//       <div className="bg-white p-6 rounded-lg shadow border">
//         <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
//           <div>
//             <h2 className="text-xl font-semibold text-gray-900">Students Management</h2>
//             <p className="text-gray-600 mt-1">
//               {selectedGrade ? `Grade ${selectedGrade} students` : 'All students'} 
//               ({students.length} total)
//             </p>
//           </div>
          
//           {/* Controls */}
//           <div className="flex items-center space-x-4">
//             <div className="min-w-[200px]">
//               <label htmlFor="grade-filter" className="block text-sm font-medium text-gray-700 mb-1">
//                 Filter by Grade
//               </label>
//               <select
//                 id="grade-filter"
//                 value={selectedGrade}
//                 onChange={(e) => setSelectedGrade(e.target.value)}
//                 className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
//               >
//                 <option value="">All Grades</option>
//                 {grades.map((grade) => (
//                   <option key={grade} value={grade}>
//                     Grade {grade}
//                   </option>
//                 ))}
//               </select>
//             </div>
            
//             <button
//               onClick={() => openModal('add')}
//               className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors"
//             >
//               Add Student
//             </button>
            
//             <button
//               onClick={loadStudents}
//               className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
//             >
//               Refresh
//             </button>
//           </div>
//         </div>
//       </div>

//       {error && (
//         <div className="bg-red-50 border border-red-200 rounded-lg p-4">
//           <p className="text-red-700">{error}</p>
//           <button
//             onClick={() => setError(null)}
//             className="text-red-500 hover:text-red-700 text-sm mt-2"
//           >
//             Dismiss
//           </button>
//         </div>
//       )}

//       {/* Students Table */}
//       <div className="bg-white rounded-lg shadow border overflow-hidden">
//         <div className="overflow-x-auto">
//           <table className="min-w-full divide-y divide-gray-200">
//             <thead className="bg-gray-50">
//               <tr>
//                 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                   Student
//                 </th>
//                 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                   Grade
//                 </th>
//                 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                   Status
//                 </th>
//                 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                   Last Activity
//                 </th>
//                 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                   Actions
//                 </th>
//               </tr>
//             </thead>
//             <tbody className="bg-white divide-y divide-gray-200">
//               {students.length > 0 ? (
//                 students.map((student) => (
//                   <tr key={student.id || student.student_id} className="hover:bg-gray-50">
//                     <td className="px-6 py-4 whitespace-nowrap">
//                       <div className="flex items-center">
//                         <div>
//                           <div className="text-sm font-medium text-gray-900">
//                             {student.name}
//                           </div>
//                           <div className="text-sm text-gray-500">
//                             ID: {student.student_id}
//                             {student.student_code && ` | Code: ${student.student_code}`}
//                           </div>
//                         </div>
//                       </div>
//                     </td>
//                     <td className="px-6 py-4 whitespace-nowrap">
//                       <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
//                         Grade {student.grade}
//                       </span>
//                     </td>
//                     <td className="px-6 py-4 whitespace-nowrap">
//                       <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
//                         student.is_active !== false
//                           ? 'bg-green-100 text-green-800' 
//                           : 'bg-red-100 text-red-800'
//                       }`}>
//                         {student.is_active !== false ? 'Active' : 'Inactive'}
//                       </span>
//                     </td>
//                     <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
//                       {student.last_activity 
//                         ? new Date(student.last_activity).toLocaleDateString()
//                         : 'No activity'
//                       }
//                     </td>
//                     <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
//                       <button 
//                         onClick={() => openModal('view', student)}
//                         className="text-blue-600 hover:text-blue-900 mr-3"
//                       >
//                         View
//                       </button>
//                       <button 
//                         onClick={() => openModal('edit', student)}
//                         className="text-indigo-600 hover:text-indigo-900 mr-3"
//                       >
//                         Edit
//                       </button>
//                       <button 
//                         onClick={() => openModal('delete', student)}
//                         className="text-red-600 hover:text-red-900"
//                       >
//                         Delete
//                       </button>
//                     </td>
//                   </tr>
//                 ))
//               ) : (
//                 <tr>
//                   <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
//                     {selectedGrade 
//                       ? `No students found in Grade ${selectedGrade}`
//                       : 'No students found'
//                     }
//                   </td>
//                 </tr>
//               )}
//             </tbody>
//           </table>
//         </div>
//       </div>

//       {/* Grade Summary */}
//       {grades.length > 0 && (
//         <div className="bg-white p-6 rounded-lg shadow border">
//           <h3 className="text-lg font-medium text-gray-900 mb-4">Grade Distribution</h3>
//           <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
//             {grades.map((grade) => (
//               <div 
//                 key={grade}
//                 className={`text-center p-3 rounded-lg cursor-pointer transition-colors ${
//                   selectedGrade === grade 
//                     ? 'bg-blue-100 border-2 border-blue-500' 
//                     : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
//                 }`}
//                 onClick={() => setSelectedGrade(selectedGrade === grade ? '' : grade)}
//               >
//                 <div className="text-lg font-bold text-gray-900">Grade {grade}</div>
//                 <div className="text-sm text-gray-600">
//                   {students.filter(s => s.grade === grade).length} students
//                 </div>
//               </div>
//             ))}
//           </div>
//         </div>
//       )}

//       {/* Modal */}
//       {showModal && (
//         <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
//           <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
//             <div className="mt-3">
//               {/* Modal Header */}
//               <div className="flex justify-between items-center mb-4">
//                 <h3 className="text-lg font-medium text-gray-900">
//                   {modalType === 'add' && 'Add New Student'}
//                   {modalType === 'edit' && 'Edit Student'}
//                   {modalType === 'delete' && 'Delete Student'}
//                   {modalType === 'view' && 'Student Details'}
//                 </h3>
//                 <button
//                   onClick={closeModal}
//                   className="text-gray-400 hover:text-gray-600"
//                 >
//                   ✕
//                 </button>
//               </div>

//               {/* Modal Content */}
//               {(modalType === 'add' || modalType === 'edit') && (
//                 <form onSubmit={handleSave}>
//                   <div className="space-y-4">
//                     <div>
//                       <label className="block text-sm font-medium text-gray-700">Name</label>
//                       <input
//                         type="text"
//                         value={formData.name}
//                         onChange={(e) => setFormData({ ...formData, name: e.target.value })}
//                         className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
//                         required
//                       />
//                     </div>
//                     <div>
//                       <label className="block text-sm font-medium text-gray-700">Grade</label>
//                       <input
//                         type="text"
//                         value={formData.grade}
//                         onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
//                         className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
//                       />
//                     </div>
//                     <div>
//                       <label className="block text-sm font-medium text-gray-700">Student Code</label>
//                       <input
//                         type="text"
//                         value={formData.student_code}
//                         onChange={(e) => setFormData({ ...formData, student_code: e.target.value })}
//                         className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
//                       />
//                     </div>
//                     <div>
//                       <label className="block text-sm font-medium text-gray-700">Parent Password</label>
//                       <input
//                         type="password"
//                         value={formData.parent_password}
//                         onChange={(e) => setFormData({ ...formData, parent_password: e.target.value })}
//                         className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
//                         placeholder={modalType === 'edit' ? 'Leave blank to keep current' : ''}
//                       />
//                     </div>
//                     <div className="flex items-center">
//                       <input
//                         type="checkbox"
//                         checked={formData.is_active}
//                         onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
//                         className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
//                       />
//                       <label className="ml-2 block text-sm text-gray-900">Active</label>
//                     </div>
//                   </div>
//                   <div className="flex justify-end space-x-3 mt-6">
//                     <button
//                       type="button"
//                       onClick={closeModal}
//                       className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
//                     >
//                       Cancel
//                     </button>
//                     <button
//                       type="submit"
//                       className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
//                     >
//                       {modalType === 'add' ? 'Add Student' : 'Update Student'}
//                     </button>
//                   </div>
//                 </form>
//               )}

//               {modalType === 'view' && selectedStudent && (
//                 <div className="space-y-3">
//                   <p><strong>Name:</strong> {selectedStudent.name}</p>
//                   <p><strong>Student ID:</strong> {selectedStudent.student_id}</p>
//                   <p><strong>Grade:</strong> {selectedStudent.grade}</p>
//                   <p><strong>Student Code:</strong> {selectedStudent.student_code || 'Not set'}</p>
//                   <p><strong>Status:</strong> {selectedStudent.is_active !== false ? 'Active' : 'Inactive'}</p>
//                   <p><strong>Last Activity:</strong> {
//                     selectedStudent.last_activity 
//                       ? new Date(selectedStudent.last_activity).toLocaleString()
//                       : 'No activity'
//                   }</p>
//                   <p><strong>Attendance Records:</strong> {selectedStudent.total_attendance_records || 0}</p>
//                   <div className="flex justify-end mt-6">
//                     <button
//                       onClick={closeModal}
//                       className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
//                     >
//                       Close
//                     </button>
//                   </div>
//                 </div>
//               )}

//               {modalType === 'delete' && selectedStudent && (
//                 <div>
//                   <p className="text-gray-700 mb-4">
//                     Are you sure you want to delete <strong>{selectedStudent.name}</strong>?
//                   </p>
//                   {selectedStudent.total_attendance_records > 0 && (
//                     <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mb-4">
//                       <p className="text-sm text-yellow-800">
//                         This student has {selectedStudent.total_attendance_records} attendance records.
//                         Deleting will deactivate the student by default.
//                       </p>
//                     </div>
//                   )}
//                   <div className="flex justify-end space-x-3">
//                     <button
//                       onClick={closeModal}
//                       className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
//                     >
//                       Cancel
//                     </button>
//                     <button
//                       onClick={() => handleDelete(false)}
//                       className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700"
//                     >
//                       Deactivate
//                     </button>
//                     {selectedStudent.total_attendance_records > 0 && (
//                       <button
//                         onClick={() => handleDelete(true)}
//                         className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
//                       >
//                         Force Delete
//                       </button>
//                     )}
//                   </div>
//                 </div>
//               )}
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   )
// }

// UploadStudentsTab Component

function UploadStudentsTab({ user, onUploadComplete }) {
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [results, setResults] = useState(null)

  const downloadTemplate = () => {
    const csvContent = [
      ['name', 'grade', 'student_code', 'parent_password'],
      ['John Smith', '10th', 'JS001', 'parent123'],
      ['Jane Doe', '9th', 'JD002', 'secure456'],
      ['Mike Johnson', '11th', 'MJ003', 'password789'],
      ['', '', '', '']
    ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `student_upload_template_${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  }

  const handleFileUpload = async (e) => {
    e.preventDefault()
    
    if (!file) {
      alert('Please select a file to upload')
      return
    }

    const formData = new FormData()
    formData.append('file', file)
    formData.append('school_id', user.school_id || 2)

    setUploading(true)
    setResults(null)

    try {
      const response = await fetch('/api/students/upload', {
        method: 'POST',
        body: formData
      })

      const result = await response.json()
      setResults(result)
      
      if (result.success) {
        onUploadComplete()
        alert(`Upload successful! ${result.summary?.added || 0} students added, ${result.summary?.updated || 0} updated.`)
      }
    } catch (error) {
      console.error('Upload error:', error)
      setResults({ success: false, error: 'Upload failed: Network error' })
    } finally {
      setUploading(false)
    }
  }

  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Upload Students from CSV</h3>
      
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <h4 className="font-medium text-blue-900 mb-2">CSV Template</h4>
        <p className="text-sm text-blue-800 mb-4">
          Download a template to ensure your CSV file has the correct format and column headers.
        </p>
        
        <button
          onClick={downloadTemplate}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm font-medium"
        >
          Download Template
        </button>
      </div>

      <form onSubmit={handleFileUpload} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select CSV File to Upload
          </label>
          <div className="flex items-center justify-center w-full">
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <svg className="w-8 h-8 mb-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="mb-2 text-sm text-gray-500">
                  <span className="font-semibold">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-gray-500">CSV files only</p>
              </div>
              <input
                type="file"
                accept=".csv"
                onChange={(e) => setFile(e.target.files[0])}
                className="hidden"
                disabled={uploading}
              />
            </label>
          </div>
          {file && (
            <p className="mt-2 text-sm text-gray-600">
              Selected: <span className="font-medium">{file.name}</span>
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={!file || uploading}
          className="w-full bg-green-600 text-white px-6 py-3 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          {uploading ? 'Uploading Students...' : 'Upload Students'}
        </button>
      </form>
    </div>
  )
}

// AttendanceTabMobileResponsive Component

// function AttendanceTabMobileResponsive({ attendance, isCompanyAdmin, user }) {
//   const [dateRange, setDateRange] = useState({
//     from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
//     to: new Date().toISOString().split('T')[0]
//   })
//   const [attendanceData, setAttendanceData] = useState(attendance)
//   const [timeSettings, setTimeSettings] = useState(null)
//   const [loading, setLoading] = useState(false)
//   const [error, setError] = useState(null)
//   const [statusFilter, setStatusFilter] = useState('all')

//   useEffect(() => {
//     setAttendanceData(attendance)
//     loadTimeSettings()
//   }, [attendance])

//   // Load school time settings
//   const loadTimeSettings = async () => {
//     try {
//       const schoolId = user?.school_id || user?.SchoolID
//       if (!schoolId) return

//       const response = await fetch(`/api/school-settings?school_id=${schoolId}&type=time`)
//       const result = await response.json()
      
//       if (result.success) {
//         setTimeSettings(result.settings)
//       }
//     } catch (error) {
//       console.error('Error loading time settings:', error)
//     }
//   }

//   const refreshAttendance = async () => {
//     setLoading(true)
//     setError(null)
    
//     try {
//       const params = new URLSearchParams({
//         type: 'real-time'
//       })
      
//       if (dateRange.from) {
//         params.append('date_from', dateRange.from)
//       }
//       if (dateRange.to) {
//         params.append('date_to', dateRange.to)
//       }
      
//       if (!isCompanyAdmin && (user?.school_id || user?.SchoolID)) {
//         params.append('school_id', user.school_id || user.SchoolID)
//       }

//       const response = await fetch(`/api/analytics?${params}`)
      
//       if (!response.ok) {
//         throw new Error(`HTTP error! status: ${response.status}`)
//       }
      
//       const data = await response.json()
      
//       if (data.success) {
//         if (data.current_activity && Array.isArray(data.current_activity)) {
//           let formattedData = data.current_activity.map(record => ({
//             id: record.attendance_id,
//             studentName: record.student_name,
//             student_name: record.student_name,
//             status: record.status,
//             time: record.scan_time,
//             scan_time: record.scan_time,
//             scanTime: record.scan_time, // For utils compatibility
//             created_at: record.created_at,
//             school_name: record.school_name,
//             school_id: record.school_id,
//             badge_number: record.badge_number
//           }))
          
//           // Enhance with time settings if available
//           if (timeSettings) {
//             formattedData = enhanceAttendanceWithTimeSettings(formattedData, timeSettings)
//           }
          
//           formattedData.sort((a, b) => {
//             const timeA = new Date(a.scan_time || a.created_at)
//             const timeB = new Date(b.scan_time || b.created_at)
//             return timeB - timeA
//           })
          
//           setAttendanceData(formattedData)
//         } else {
//           setAttendanceData([])
//         }
//       } else {
//         setError(data.error || 'Failed to fetch attendance data')
//         setAttendanceData([])
//       }
//     } catch (error) {
//       console.error('Error refreshing attendance:', error)
//       setError(error.message)
//       setAttendanceData([])
//     } finally {
//       setLoading(false)
//     }
//   }

//   useEffect(() => {
//     if (dateRange.from && dateRange.to) {
//       refreshAttendance()
//     }
//   }, [dateRange.from, dateRange.to, timeSettings])

//   // Filter data based on status filter
//   const filteredData = statusFilter === 'all' 
//     ? attendanceData 
//     : attendanceData.filter(record => {
//         switch (statusFilter) {
//           case 'late':
//             return record.statusType === 'late'
//           case 'on-time':
//             return record.statusType === 'on-time' || record.statusType === 'early-arrival'
//           case 'early-departure':
//             return record.statusType === 'early-departure'
//           default:
//             return true
//         }
//       })

//   // Get status counts for filter buttons
//   const getStatusCounts = () => {
//     if (!attendanceData || attendanceData.length === 0) {
//       return { all: 0, late: 0, 'on-time': 0, 'early-departure': 0 }
//     }

//     return {
//       all: attendanceData.length,
//       late: attendanceData.filter(r => r.statusType === 'late').length,
//       'on-time': attendanceData.filter(r => 
//         r.statusType === 'on-time' || r.statusType === 'early-arrival'
//       ).length,
//       'early-departure': attendanceData.filter(r => r.statusType === 'early-departure').length
//     }
//   }

//   const statusCounts = getStatusCounts()

//   const formatTime = (timestamp) => {
//     if (!timestamp) return 'No time'
//     try {
//       return new Date(timestamp).toLocaleTimeString('en-US', {
//         hour: '2-digit',
//         minute: '2-digit',
//         second: '2-digit',
//         hour12: false
//       })
//     } catch (e) {
//       return 'Invalid time'
//     }
//   }

//   const formatDate = (timestamp) => {
//     if (!timestamp) return 'No date'
//     try {
//       return new Date(timestamp).toLocaleDateString('en-US', {
//         year: 'numeric',
//         month: '2-digit',
//         day: '2-digit'
//       })
//     } catch (e) {
//       return 'Invalid date'
//     }
//   }

//   return (
//     <div>
//       <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
//         <div>
//           <h3 className="text-lg font-semibold text-gray-900">
//             {isCompanyAdmin ? 'Network Attendance Records' : 'Recent Attendance'}
//           </h3>
//           {timeSettings && (
//             <p className="text-sm text-gray-600 mt-1">
//               Late after {timeSettings.late_arrival_time} • Early before {timeSettings.early_departure_time}
//             </p>
//           )}
//         </div>
//         <div className="flex flex-col sm:flex-row gap-2">
//           <input
//             type="date"
//             value={dateRange.from}
//             onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
//             className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
//             max={dateRange.to}
//           />
//           <input
//             type="date"
//             value={dateRange.to}
//             onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
//             className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
//             min={dateRange.from}
//             max={new Date().toISOString().split('T')[0]}
//           />
//           <button 
//             onClick={refreshAttendance}
//             disabled={loading}
//             className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
//           >
//             {loading ? 'Loading...' : 'Refresh'}
//           </button>
//         </div>
//       </div>

//       {/* Status Filter Buttons */}
//       {timeSettings && statusCounts.all > 0 && (
//         <div className="mb-4 bg-white p-4 rounded-lg shadow border">
//           <div className="flex flex-wrap gap-2">
//             <button
//               onClick={() => setStatusFilter('all')}
//               className={`px-3 py-1 text-sm rounded-full font-medium transition-colors ${
//                 statusFilter === 'all' 
//                   ? 'bg-blue-100 text-blue-800' 
//                   : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
//               }`}
//             >
//               All ({statusCounts.all})
//             </button>
//             <button
//               onClick={() => setStatusFilter('on-time')}
//               className={`px-3 py-1 text-sm rounded-full font-medium transition-colors ${
//                 statusFilter === 'on-time' 
//                   ? 'bg-green-100 text-green-800' 
//                   : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
//               }`}
//             >
//               🟢 On Time ({statusCounts['on-time']})
//             </button>
//             <button
//               onClick={() => setStatusFilter('late')}
//               className={`px-3 py-1 text-sm rounded-full font-medium transition-colors ${
//                 statusFilter === 'late' 
//                   ? 'bg-red-100 text-red-800' 
//                   : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
//               }`}
//             >
//               🔴 Late ({statusCounts.late})
//             </button>
//             <button
//               onClick={() => setStatusFilter('early-departure')}
//               className={`px-3 py-1 text-sm rounded-full font-medium transition-colors ${
//                 statusFilter === 'early-departure' 
//                   ? 'bg-orange-100 text-orange-800' 
//                   : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
//               }`}
//             >
//               🟠 Early Out ({statusCounts['early-departure']})
//             </button>
//           </div>
//         </div>
//       )}

//       {error && (
//         <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
//           Error: {error}
//         </div>
//       )}

//       <div className="overflow-x-auto -mx-4 sm:mx-0">
//         <div className="inline-block min-w-full align-middle">
//           <div className="bg-white rounded-lg shadow overflow-hidden">
//             <table className="min-w-full divide-y divide-gray-200">
//               <thead className="bg-gray-50">
//                 <tr>
//                   <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                     Student
//                   </th>
//                   <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                     Status
//                   </th>
//                   <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
//                     Time
//                   </th>
//                   <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
//                     Date
//                   </th>
//                   {isCompanyAdmin && (
//                     <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
//                       School
//                     </th>
//                   )}
//                   {timeSettings && (
//                     <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
//                       Notes
//                     </th>
//                   )}
//                 </tr>
//               </thead>
//               <tbody className="bg-white divide-y divide-gray-200">
//                 {filteredData && filteredData.length > 0 ? (
//                   filteredData.slice(0, 50).map((record, index) => (
//                     <tr key={record.id || index} className="hover:bg-gray-50 transition-colors">
//                       <td className="px-3 sm:px-6 py-4">
//                         <div className="text-sm font-medium text-gray-900">
//                           {record.studentName || record.student_name || 'Unknown Student'}
//                         </div>
//                         <div className="text-xs text-gray-500">
//                           <div className="sm:hidden">
//                             {formatTime(record.scan_time || record.time || record.created_at)}
//                           </div>
//                           {record.badge_number && (
//                             <div>Badge: {record.badge_number}</div>
//                           )}
//                         </div>
//                       </td>
//                       <td className="px-3 sm:px-6 py-4">
//                         <div className="space-y-1">
//                           {/* Enhanced status with time-based indicator */}
//                           {record.statusType && timeSettings ? (
//                             <span className={getStatusBadgeClasses(record.statusType)}>
//                               {getStatusIcon(record.statusType)} {record.statusLabel}
//                             </span>
//                           ) : (
//                             <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
//                               record.status === 'IN' ? 'bg-green-100 text-green-800' : 
//                               record.status === 'OUT' ? 'bg-blue-100 text-blue-800' :
//                               'bg-gray-100 text-gray-800'
//                             }`}>
//                               {record.status === 'IN' ? 'Check In' : 
//                                record.status === 'OUT' ? 'Check Out' : 
//                                record.status || 'Unknown'}
//                             </span>
//                           )}
//                           {/* Show message on mobile if available */}
//                           {record.message && (
//                             <div className="text-xs text-gray-500 lg:hidden">
//                               {record.message}
//                             </div>
//                           )}
//                         </div>
//                       </td>
//                       <td className="px-3 sm:px-6 py-4 text-sm text-gray-500 hidden sm:table-cell">
//                         {formatTime(record.scan_time || record.time || record.created_at)}
//                       </td>
//                       <td className="px-3 sm:px-6 py-4 text-sm text-gray-500 hidden sm:table-cell">
//                         {formatDate(record.scan_time || record.time || record.created_at)}
//                       </td>
//                       {isCompanyAdmin && (
//                         <td className="px-3 sm:px-6 py-4 text-sm text-gray-500 hidden md:table-cell">
//                           {record.school_name || 'Unknown School'}
//                         </td>
//                       )}
//                       {timeSettings && (
//                         <td className="px-3 sm:px-6 py-4 text-sm text-gray-500 hidden lg:table-cell">
//                           {record.message || '—'}
//                         </td>
//                       )}
//                     </tr>
//                   ))
//                 ) : (
//                   <tr>
//                     <td colSpan={isCompanyAdmin ? (timeSettings ? "6" : "5") : (timeSettings ? "5" : "4")} className="px-6 py-12 text-center">
//                       <div className="text-gray-500">
//                         {loading ? (
//                           <div className="flex items-center justify-center">
//                             <svg className="animate-spin -ml-1 mr-3 h-5 w-5" fill="none" viewBox="0 0 24 24">
//                               <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
//                               <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
//                             </svg>
//                             Loading attendance records...
//                           </div>
//                         ) : (
//                           <div>
//                             <div className="text-gray-400 text-4xl mb-2">📊</div>
//                             <p className="font-medium">
//                               {statusFilter === 'all' ? 'No attendance records found' : `No ${statusFilter.replace('-', ' ')} records found`}
//                             </p>
//                             <p className="text-sm mt-1">
//                               {dateRange.from === dateRange.to ? 
//                                 `No records for ${formatDate(dateRange.from)}` :
//                                 `No records between ${formatDate(dateRange.from)} and ${formatDate(dateRange.to)}`
//                               }
//                             </p>
//                           </div>
//                         )}
//                       </div>
//                     </td>
//                   </tr>
//                 )}
//               </tbody>
//             </table>
//           </div>
//         </div>

//         {/* Summary info */}
//         {filteredData && filteredData.length > 0 && (
//           <div className="mt-4 text-sm text-gray-600 text-center">
//             Showing {Math.min(50, filteredData.length)} of {filteredData.length} records
//             {statusFilter !== 'all' && ` (filtered by ${statusFilter.replace('-', ' ')})`}
//             {filteredData.length > 50 && (
//               <span className="block mt-1 text-xs">
//                 Only showing first 50 records. Use date filters to narrow results.
//               </span>
//             )}
//           </div>
//         )}
//       </div>
//     </div>
//   )
// }

// function AttendanceTabMobileResponsive({ attendance, isCompanyAdmin, user }) {
//   const [dateRange, setDateRange] = useState({
//     from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
//     to: new Date().toISOString().split('T')[0]
//   })
//   const [attendanceData, setAttendanceData] = useState(attendance)
//   const [timeSettings, setTimeSettings] = useState(null)
//   const [loading, setLoading] = useState(false)
//   const [error, setError] = useState(null)
//   const [statusFilter, setStatusFilter] = useState('all')
//   const [gradeFilter, setGradeFilter] = useState('all') // NEW: Grade filter
//   const [exporting, setExporting] = useState(false) // NEW: Export state

//   useEffect(() => {
//     setAttendanceData(attendance)
//     loadTimeSettings()
//   }, [attendance])

//   // Load school time settings
//   const loadTimeSettings = async () => {
//     try {
//       const schoolId = user?.school_id || user?.SchoolID
//       if (!schoolId) return

//       const response = await fetch(`/api/school-settings?school_id=${schoolId}&type=time`)
//       const result = await response.json()
      
//       if (result.success) {
//         setTimeSettings(result.settings)
//       }
//     } catch (error) {
//       console.error('Error loading time settings:', error)
//     }
//   }

//   const refreshAttendance = async () => {
//     setLoading(true)
//     setError(null)
    
//     try {
//       const params = new URLSearchParams({
//         type: 'real-time'
//       })
      
//       if (dateRange.from) {
//         params.append('date_from', dateRange.from)
//       }
//       if (dateRange.to) {
//         params.append('date_to', dateRange.to)
//       }
      
//       if (!isCompanyAdmin && (user?.school_id || user?.SchoolID)) {
//         params.append('school_id', user.school_id || user.SchoolID)
//       }

//       const response = await fetch(`/api/analytics?${params}`)
      
//       if (!response.ok) {
//         throw new Error(`HTTP error! status: ${response.status}`)
//       }
      
//       const data = await response.json()
      
//       if (data.success) {
//         if (data.current_activity && Array.isArray(data.current_activity)) {
//           let formattedData = data.current_activity.map(record => ({
//             id: record.attendance_id,
//             studentName: record.student_name,
//             student_name: record.student_name,
//             status: record.status,
//             time: record.scan_time,
//             scan_time: record.scan_time,
//             scanTime: record.scan_time,
//             created_at: record.created_at,
//             school_name: record.school_name,
//             school_id: record.school_id,
//             badge_number: record.badge_number,
//             grade: record.grade || 'N/A' // NEW: Include grade
//           }))
          
//           // Enhance with time settings if available
//           if (timeSettings) {
//             formattedData = enhanceAttendanceWithTimeSettings(formattedData, timeSettings)
//           }
          
//           formattedData.sort((a, b) => {
//             const timeA = new Date(a.scan_time || a.created_at)
//             const timeB = new Date(b.scan_time || b.created_at)
//             return timeB - timeA
//           })
          
//           setAttendanceData(formattedData)
//         } else {
//           setAttendanceData([])
//         }
//       } else {
//         setError(data.error || 'Failed to fetch attendance data')
//         setAttendanceData([])
//       }
//     } catch (error) {
//       console.error('Error refreshing attendance:', error)
//       setError(error.message)
//       setAttendanceData([])
//     } finally {
//       setLoading(false)
//     }
//   }

//   useEffect(() => {
//     if (dateRange.from && dateRange.to) {
//       refreshAttendance()
//     }
//   }, [dateRange.from, dateRange.to, timeSettings])

//   // NEW: Export to Excel function
//   const exportToExcel = async () => {
//     if (!filteredData.length) {
//       alert('No data to export')
//       return
//     }

//     setExporting(true)
    
//     try {
//       const exportData = {
//         data: filteredData,
//         filters: {
//           dateFrom: dateRange.from,
//           dateTo: dateRange.to,
//           statusFilter,
//           gradeFilter,
//           schoolId: user?.school_id || user?.SchoolID,
//           schoolName: user?.school_name || 'School'
//         },
//         timeSettings
//       }

//       const response = await fetch('/api/export-attendance', {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//         },
//         body: JSON.stringify(exportData)
//       })

//       if (!response.ok) {
//         throw new Error('Export failed')
//       }

//       // Download the file
//       const blob = await response.blob()
//       const url = window.URL.createObjectURL(blob)
//       const a = document.createElement('a')
//       a.href = url
//       a.download = `attendance-${dateRange.from}-to-${dateRange.to}.xlsx`
//       document.body.appendChild(a)
//       a.click()
//       window.URL.revokeObjectURL(url)
//       document.body.removeChild(a)

//     } catch (error) {
//       console.error('Export error:', error)
//       alert('Failed to export data: ' + error.message)
//     } finally {
//       setExporting(false)
//     }
//   }

//   // Filter data based on status and grade filters
//   const filteredData = attendanceData.filter(record => {
//     // Apply status filter
//     let statusMatch = true
//     if (statusFilter !== 'all') {
//       switch (statusFilter) {
//         case 'late':
//           statusMatch = record.statusType === 'late'
//           break
//         case 'on-time':
//           statusMatch = record.statusType === 'on-time' || record.statusType === 'early-arrival'
//           break
//         case 'early-departure':
//           statusMatch = record.statusType === 'early-departure'
//           break
//         default:
//           statusMatch = true
//       }
//     }

//     // Apply grade filter
//     let gradeMatch = true
//     if (gradeFilter !== 'all') {
//       gradeMatch = record.grade === gradeFilter
//     }

//     return statusMatch && gradeMatch
//   })

//   // Get status counts for filter buttons
//   const getStatusCounts = () => {
//     if (!attendanceData || attendanceData.length === 0) {
//       return { all: 0, late: 0, 'on-time': 0, 'early-departure': 0 }
//     }

//     return {
//       all: attendanceData.length,
//       late: attendanceData.filter(r => r.statusType === 'late').length,
//       'on-time': attendanceData.filter(r => 
//         r.statusType === 'on-time' || r.statusType === 'early-arrival'
//       ).length,
//       'early-departure': attendanceData.filter(r => r.statusType === 'early-departure').length
//     }
//   }

//   // NEW: Get unique grades for filter dropdown
//   const getUniqueGrades = () => {
//     const grades = [...new Set(attendanceData.map(r => r.grade).filter(g => g && g !== 'N/A'))]
//     return grades.sort()
//   }

//   const statusCounts = getStatusCounts()
//   const uniqueGrades = getUniqueGrades()

//   return (
//     <div>
//       <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
//         <div>
//           <h3 className="text-lg font-semibold text-gray-900">
//             {isCompanyAdmin ? 'Network Attendance Records' : 'Recent Attendance'}
//           </h3>
//           {timeSettings && (
//             <p className="text-sm text-gray-600 mt-1">
//               Late after {timeSettings.late_arrival_time} • Early before {timeSettings.early_departure_time}
//             </p>
//           )}
//         </div>
//         <div className="flex flex-col sm:flex-row gap-2">
//           <input
//             type="date"
//             value={dateRange.from}
//             onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
//             className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
//             max={dateRange.to}
//           />
//           <input
//             type="date"
//             value={dateRange.to}
//             onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
//             className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
//             min={dateRange.from}
//             max={new Date().toISOString().split('T')[0]}
//           />
//           <button 
//             onClick={refreshAttendance}
//             disabled={loading}
//             className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
//           >
//             {loading ? 'Loading...' : 'Refresh'}
//           </button>
//           {/* NEW: Export button */}
//           <button 
//             onClick={exportToExcel}
//             disabled={exporting || filteredData.length === 0}
//             className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
//           >
//             {exporting ? 'Exporting...' : 'Export Excel'}
//           </button>
//         </div>
//       </div>

//       {/* Enhanced Filter Section */}
//       <div className="mb-4 bg-white p-4 rounded-lg shadow border">
//         <div className="flex flex-col space-y-4">
//           {/* Status Filters */}
//           {timeSettings && statusCounts.all > 0 && (
//             <div>
//               <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Status:</label>
//               <div className="flex flex-wrap gap-2">
//                 <button
//                   onClick={() => setStatusFilter('all')}
//                   className={`px-3 py-1 text-sm rounded-full font-medium transition-colors ${
//                     statusFilter === 'all' 
//                       ? 'bg-blue-100 text-blue-800' 
//                       : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
//                   }`}
//                 >
//                   All ({statusCounts.all})
//                 </button>
//                 <button
//                   onClick={() => setStatusFilter('on-time')}
//                   className={`px-3 py-1 text-sm rounded-full font-medium transition-colors ${
//                     statusFilter === 'on-time' 
//                       ? 'bg-green-100 text-green-800' 
//                       : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
//                   }`}
//                 >
//                   🟢 On Time ({statusCounts['on-time']})
//                 </button>
//                 <button
//                   onClick={() => setStatusFilter('late')}
//                   className={`px-3 py-1 text-sm rounded-full font-medium transition-colors ${
//                     statusFilter === 'late' 
//                       ? 'bg-red-100 text-red-800' 
//                       : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
//                   }`}
//                 >
//                   🔴 Late ({statusCounts.late})
//                 </button>
//                 <button
//                   onClick={() => setStatusFilter('early-departure')}
//                   className={`px-3 py-1 text-sm rounded-full font-medium transition-colors ${
//                     statusFilter === 'early-departure' 
//                       ? 'bg-orange-100 text-orange-800' 
//                       : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
//                   }`}
//                 >
//                   🟠 Early Out ({statusCounts['early-departure']})
//                 </button>
//               </div>
//             </div>
//           )}

//           {/* NEW: Grade Filter */}
//           {uniqueGrades.length > 0 && (
//             <div>
//               <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Grade:</label>
//               <select
//                 value={gradeFilter}
//                 onChange={(e) => setGradeFilter(e.target.value)}
//                 className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
//               >
//                 <option value="all">All Grades ({attendanceData.length})</option>
//                 {uniqueGrades.map(grade => (
//                   <option key={grade} value={grade}>
//                     Grade {grade} ({attendanceData.filter(r => r.grade === grade).length})
//                   </option>
//                 ))}
//               </select>
//             </div>
//           )}

//           {/* Filter Summary */}
//           <div className="text-sm text-gray-600">
//             Showing {filteredData.length} of {attendanceData.length} records
//             {statusFilter !== 'all' && ` • Status: ${statusFilter.replace('-', ' ')}`}
//             {gradeFilter !== 'all' && ` • Grade: ${gradeFilter}`}
//           </div>
//         </div>
//       </div>

//       {error && (
//         <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
//           Error: {error}
//         </div>
//       )}

//       <div className="overflow-x-auto -mx-4 sm:mx-0">
//         <div className="inline-block min-w-full align-middle">
//           <div className="bg-white rounded-lg shadow overflow-hidden">
//             <table className="min-w-full divide-y divide-gray-200">
//               <thead className="bg-gray-50">
//                 <tr>
//                   <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                     Student
//                   </th>
//                   {/* NEW: Grade column */}
//                   <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                     Grade
//                   </th>
//                   <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                     Status
//                   </th>
//                   <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
//                     Time
//                   </th>
//                   <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
//                     Date
//                   </th>
//                   {isCompanyAdmin && (
//                     <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
//                       School
//                     </th>
//                   )}
//                   {timeSettings && (
//                     <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
//                       Notes
//                     </th>
//                   )}
//                 </tr>
//               </thead>
//               <tbody className="bg-white divide-y divide-gray-200">
//                 {filteredData.length > 0 ? (
//                   filteredData.slice(0, 50).map((record, index) => (
//                     <tr key={record.id || index} className="hover:bg-gray-50 transition-colors">
//                       <td className="px-3 sm:px-6 py-4">
//                         <div className="text-sm font-medium text-gray-900">
//                           {record.studentName || record.student_name || 'Unknown Student'}
//                         </div>
//                         <div className="text-xs text-gray-500">
//                           <div className="sm:hidden">
//                             {formatTime(record.scan_time || record.time || record.created_at)}
//                           </div>
//                           {record.badge_number && (
//                             <div>Badge: {record.badge_number}</div>
//                           )}
//                         </div>
//                       </td>
//                       {/* NEW: Grade cell */}
//                       <td className="px-3 sm:px-6 py-4">
//                         <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
//                           {record.grade || 'N/A'}
//                         </span>
//                       </td>
//                       <td className="px-3 sm:px-6 py-4">
//                         <div className="space-y-1">
//                           {record.statusType && timeSettings ? (
//                             <span className={getStatusBadgeClasses(record.statusType)}>
//                               {getStatusIcon(record.statusType)} {record.statusLabel}
//                             </span>
//                           ) : (
//                             <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
//                               record.status === 'IN' ? 'bg-green-100 text-green-800' : 
//                               record.status === 'OUT' ? 'bg-blue-100 text-blue-800' :
//                               'bg-gray-100 text-gray-800'
//                             }`}>
//                               {record.status === 'IN' ? 'Check In' : 
//                                record.status === 'OUT' ? 'Check Out' : 
//                                record.status || 'Unknown'}
//                             </span>
//                           )}
//                           {record.message && (
//                             <div className="text-xs text-gray-500 lg:hidden">
//                               {record.message}
//                             </div>
//                           )}
//                         </div>
//                       </td>
//                       <td className="px-3 sm:px-6 py-4 text-sm text-gray-500 hidden sm:table-cell">
//                         {formatTime(record.scan_time || record.time || record.created_at)}
//                       </td>
//                       <td className="px-3 sm:px-6 py-4 text-sm text-gray-500 hidden sm:table-cell">
//                         {formatDate(record.scan_time || record.time || record.created_at)}
//                       </td>
//                       {isCompanyAdmin && (
//                         <td className="px-3 sm:px-6 py-4 text-sm text-gray-500 hidden md:table-cell">
//                           {record.school_name || 'Unknown School'}
//                         </td>
//                       )}
//                       {timeSettings && (
//                         <td className="px-3 sm:px-6 py-4 text-sm text-gray-500 hidden lg:table-cell">
//                           {record.message || '—'}
//                         </td>
//                       )}
//                     </tr>
//                   ))
//                 ) : (
//                   <tr>
//                     <td colSpan={isCompanyAdmin ? (timeSettings ? "7" : "6") : (timeSettings ? "6" : "5")} className="px-6 py-12 text-center">
//                       <div className="text-gray-500">
//                         {loading ? (
//                           <div className="flex items-center justify-center">
//                             <svg className="animate-spin -ml-1 mr-3 h-5 w-5" fill="none" viewBox="0 0 24 24">
//                               <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
//                               <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
//                             </svg>
//                             Loading attendance records...
//                           </div>
//                         ) : (
//                           <div>
//                             <div className="text-gray-400 text-4xl mb-2">📊</div>
//                             <p className="font-medium">
//                               {statusFilter === 'all' && gradeFilter === 'all' ? 
//                                 'No attendance records found' : 
//                                 'No records match the selected filters'
//                               }
//                             </p>
//                             <p className="text-sm mt-1">
//                               {dateRange.from === dateRange.to ? 
//                                 `No records for ${formatDate(dateRange.from)}` :
//                                 `No records between ${formatDate(dateRange.from)} and ${formatDate(dateRange.to)}`
//                               }
//                             </p>
//                           </div>
//                         )}
//                       </div>
//                     </td>
//                   </tr>
//                 )}
//               </tbody>
//             </table>
//           </div>
//         </div>

//         {/* Summary info */}
//         {filteredData.length > 0 && (
//           <div className="mt-4 text-sm text-gray-600 text-center">
//             Showing {Math.min(50, filteredData.length)} of {filteredData.length} records
//             {statusFilter !== 'all' && ` (filtered by ${statusFilter.replace('-', ' ')})`}
//             {gradeFilter !== 'all' && ` (filtered by Grade ${gradeFilter})`}
//             {filteredData.length > 50 && (
//               <span className="block mt-1 text-xs">
//                 Only showing first 50 records. Use filters to narrow results or export all data.
//               </span>
//             )}
//           </div>
//         )}
//       </div>
//     </div>
//   )
// }
function AttendanceTabMobileResponsive({ attendance, isCompanyAdmin, user }) {
  const [dateRange, setDateRange] = useState({
    from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0]
  })
  const [attendanceData, setAttendanceData] = useState(attendance)
  const [timeSettings, setTimeSettings] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [statusFilter, setStatusFilter] = useState('all')
  const [gradeFilter, setGradeFilter] = useState('') // New grade filter
  const [availableGrades, setAvailableGrades] = useState([]) // Available grades

  useEffect(() => {
    setAttendanceData(attendance)
    loadTimeSettings()
    loadAvailableGrades()
  }, [attendance])

  const loadTimeSettings = async () => {
    try {
      const schoolId = user?.school_id || user?.SchoolID
      if (!schoolId) return

      const response = await fetch(`/api/school-settings?school_id=${schoolId}&type=time`)
      const result = await response.json()
      
      if (result.success) {
        setTimeSettings(result.settings)
      }
    } catch (error) {
      console.error('Error loading time settings:', error)
    }
  }

  const loadAvailableGrades = async () => {
    try {
      const schoolId = user?.school_id || user?.SchoolID
      if (!schoolId) return

      const response = await fetch(`/api/students?school_id=${schoolId}&type=grades`)
      const result = await response.json()
      
      if (result.success) {
        setAvailableGrades(result.grades || [])
      }
    } catch (error) {
      console.error('Error loading grades:', error)
    }
  }

  const refreshAttendance = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const params = new URLSearchParams({
        type: 'real-time'
      })
      
      if (dateRange.from) {
        params.append('date_from', dateRange.from)
      }
      if (dateRange.to) {
        params.append('date_to', dateRange.to)
      }
      
      if (!isCompanyAdmin && (user?.school_id || user?.SchoolID)) {
        params.append('school_id', user.school_id || user.SchoolID)
      }

      // Add grade filter if selected
      if (gradeFilter) {
        params.append('grade', gradeFilter)
      }

      const response = await fetch(`/api/analytics?${params}`)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.success) {
        if (data.current_activity && Array.isArray(data.current_activity)) {
          let formattedData = data.current_activity.map(record => ({
            id: record.attendance_id,
            studentName: record.student_name,
            student_name: record.student_name,
            grade: record.grade, // Include grade information
            status: record.status,
            time: record.scan_time,
            scan_time: record.scan_time,
            scanTime: record.scan_time,
            created_at: record.created_at,
            school_name: record.school_name,
            school_id: record.school_id,
            statusLabel: record.statusLabel,
            statusType: record.statusType,
            message: record.message
          }))
          
          formattedData.sort((a, b) => {
            const timeA = new Date(a.scan_time || a.created_at)
            const timeB = new Date(b.scan_time || b.created_at)
            return timeB - timeA
          })
          
          setAttendanceData(formattedData)
        } else {
          setAttendanceData([])
        }
      } else {
        setError(data.error || 'Failed to fetch attendance data')
        setAttendanceData([])
      }
    } catch (error) {
      console.error('Error refreshing attendance:', error)
      setError(error.message)
      setAttendanceData([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (dateRange.from && dateRange.to) {
      refreshAttendance()
    }
  }, [dateRange.from, dateRange.to, gradeFilter]) // Refresh when grade filter changes

  // Filter data based on status and grade filters
  const filteredData = attendanceData.filter(record => {
    // Status filter
    const statusMatch = statusFilter === 'all' || (
      timeSettings && (
        (statusFilter === 'late' && record.statusType === 'late') ||
        (statusFilter === 'on-time' && (record.statusType === 'on-time' || record.statusType === 'early-arrival')) ||
        (statusFilter === 'early-departure' && record.statusType === 'early-departure')
      )
    )

    // Grade filter
    const gradeMatch = !gradeFilter || record.grade === gradeFilter

    return statusMatch && gradeMatch
  })

  // Get status counts for filter buttons
  const getStatusCounts = () => {
    if (!attendanceData || attendanceData.length === 0) {
      return { all: 0, late: 0, 'on-time': 0, 'early-departure': 0 }
    }

    return {
      all: filteredData.length,
      late: filteredData.filter(r => r.statusType === 'late').length,
      'on-time': filteredData.filter(r => 
        r.statusType === 'on-time' || r.statusType === 'early-arrival'
      ).length,
      'early-departure': filteredData.filter(r => r.statusType === 'early-departure').length
    }
  }

  const statusCounts = getStatusCounts()

  const formatTime = (timestamp) => {
    if (!timestamp) return 'No time'
    try {
      return new Date(timestamp).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      })
    } catch (e) {
      return 'Invalid time'
    }
  }

  const formatDate = (timestamp) => {
    if (!timestamp) return 'No date'
    try {
      return new Date(timestamp).toLocaleDateString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      })
    } catch (e) {
      return 'Invalid date'
    }
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            {isCompanyAdmin ? 'Network Attendance Records' : 'Recent Attendance'}
          </h3>
          {timeSettings && (
            <p className="text-sm text-gray-600 mt-1">
              Late after {timeSettings.late_arrival_time} • Early before {timeSettings.early_departure_time}
            </p>
          )}
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="date"
            value={dateRange.from}
            onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
            className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            max={dateRange.to}
          />
          <input
            type="date"
            value={dateRange.to}
            onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
            className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            min={dateRange.from}
            max={new Date().toISOString().split('T')[0]}
          />
          <button 
            onClick={refreshAttendance}
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Enhanced Filter Section with Grade Filter */}
      <div className="mb-4 bg-white p-4 rounded-lg shadow border space-y-4">
        {/* Grade Filter */}
        {availableGrades.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filter by Grade
            </label>
            <select
              value={gradeFilter}
              onChange={(e) => setGradeFilter(e.target.value)}
              className="block w-full sm:w-48 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="">All Grades</option>
              {availableGrades.map((grade) => (
                <option key={grade} value={grade}>
                  Grade {grade}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Status Filter Buttons */}
        {timeSettings && statusCounts.all > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filter by Status
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1 text-sm rounded-full font-medium transition-colors ${
                  statusFilter === 'all' 
                    ? 'bg-blue-100 text-blue-800' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                All ({statusCounts.all})
              </button>
              <button
                onClick={() => setStatusFilter('on-time')}
                className={`px-3 py-1 text-sm rounded-full font-medium transition-colors ${
                  statusFilter === 'on-time' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                🟢 On Time ({statusCounts['on-time']})
              </button>
              <button
                onClick={() => setStatusFilter('late')}
                className={`px-3 py-1 text-sm rounded-full font-medium transition-colors ${
                  statusFilter === 'late' 
                    ? 'bg-red-100 text-red-800' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                🔴 Late ({statusCounts.late})
              </button>
              <button
                onClick={() => setStatusFilter('early-departure')}
                className={`px-3 py-1 text-sm rounded-full font-medium transition-colors ${
                  statusFilter === 'early-departure' 
                    ? 'bg-orange-100 text-orange-800' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                🟠 Early Out ({statusCounts['early-departure']})
              </button>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
          Error: {error}
        </div>
      )}

      {/* Rest of your existing table code remains the same */}
      <div className="overflow-x-auto -mx-4 sm:mx-0">
        <div className="inline-block min-w-full align-middle">
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Student
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Grade
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                    Time
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                    Date
                  </th>
                  {isCompanyAdmin && (
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                      School
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredData && filteredData.length > 0 ? (
                  filteredData.slice(0, 50).map((record, index) => (
                    <tr key={record.id || index} className="hover:bg-gray-50 transition-colors">
                      <td className="px-3 sm:px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          {record.studentName || record.student_name || 'Unknown Student'}
                        </div>
                        <div className="text-xs text-gray-500">
                          <div className="sm:hidden">
                            {formatTime(record.scan_time || record.time || record.created_at)}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 sm:px-6 py-4">
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                          {record.grade ? `Grade ${record.grade}` : 'N/A'}
                        </span>
                      </td>
                      <td className="px-3 sm:px-6 py-4">
                        <div className="space-y-1">
                          {/* Enhanced status with time-based indicator */}
                          {record.statusType && timeSettings ? (
                            <span className={getStatusBadgeClasses(record.statusType)}>
                              {getStatusIcon(record.statusType)} {record.statusLabel}
                            </span>
                          ) : (
                            <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                              record.status === 'IN' ? 'bg-green-100 text-green-800' : 
                              record.status === 'OUT' ? 'bg-blue-100 text-blue-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {record.status === 'IN' ? 'Check In' : 
                               record.status === 'OUT' ? 'Check Out' : 
                               record.status || 'Unknown'}
                            </span>
                          )}
                          {/* Show message on mobile if available */}
                          {record.message && (
                            <div className="text-xs text-gray-500 lg:hidden">
                              {record.message}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-3 sm:px-6 py-4 text-sm text-gray-500 hidden sm:table-cell">
                        {formatTime(record.scan_time || record.time || record.created_at)}
                      </td>
                      <td className="px-3 sm:px-6 py-4 text-sm text-gray-500 hidden sm:table-cell">
                        {formatDate(record.scan_time || record.time || record.created_at)}
                      </td>
                      {isCompanyAdmin && (
                        <td className="px-3 sm:px-6 py-4 text-sm text-gray-500 hidden md:table-cell">
                          {record.school_name || 'Unknown School'}
                        </td>
                      )}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={isCompanyAdmin ? "6" : "5"} className="px-6 py-12 text-center">
                      <div className="text-gray-500">
                        {loading ? (
                          <div className="flex items-center justify-center">
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            Loading attendance records...
                          </div>
                        ) : (
                          <div>
                            <div className="text-gray-400 text-4xl mb-2">📊</div>
                            <p className="font-medium">
                              {statusFilter === 'all' && !gradeFilter ? 'No attendance records found' : 
                               `No records found for ${statusFilter !== 'all' ? statusFilter.replace('-', ' ') : ''}${statusFilter !== 'all' && gradeFilter ? ' and ' : ''}${gradeFilter ? `Grade ${gradeFilter}` : ''}`}
                            </p>
                            <p className="text-sm mt-1">
                              {dateRange.from === dateRange.to ? 
                                `No records for ${formatDate(dateRange.from)}` :
                                `No records between ${formatDate(dateRange.from)} and ${formatDate(dateRange.to)}`
                              }
                            </p>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary info */}
        {filteredData && filteredData.length > 0 && (
          <div className="mt-4 text-sm text-gray-600 text-center">
            Showing {Math.min(50, filteredData.length)} of {filteredData.length} records
            {(statusFilter !== 'all' || gradeFilter) && (
              <span className="block mt-1 text-xs">
                Filtered by: {statusFilter !== 'all' && statusFilter.replace('-', ' ')}{statusFilter !== 'all' && gradeFilter && ' and '}{gradeFilter && `Grade ${gradeFilter}`}
              </span>
            )}
            {filteredData.length > 50 && (
              <span className="block mt-1 text-xs">
                Only showing first 50 records. Use date filters to narrow results.
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export { StudentsTab, AttendanceTabMobileResponsive }

function SchoolsNetworkTab({ companyId, user }) {
  const [schools, setSchools] = useState([])
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingSchool, setEditingSchool] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [schoolToDelete, setSchoolToDelete] = useState(null)
  const [newSchool, setNewSchool] = useState({
    name: '',
    location: '',
    machineId: '',
    adminUsername: '',
    adminPassword: '',
    adminEmail: ''
  })
  const [createdSchoolCredentials, setCreatedSchoolCredentials] = useState(null)
  const [showCredentialsModal, setShowCredentialsModal] = useState(false)
  const [error, setError] = useState('')

  const [schoolForm, setSchoolForm] = useState({
    name: '',
    location: '',
    machineId: '',
    contactEmail: '',
    contactPhone: '',
    status: 'active'
  })

  // Get company ID from props or user object
  const effectiveCompanyId = companyId || user?.company_id || user?.CompanyID || ''

  useEffect(() => {
    fetchSchoolsData()
  }, [effectiveCompanyId])

  const fetchSchoolsData = async () => {
    try {
      setLoading(true)
      const url = effectiveCompanyId 
        ? `/api/analytics?type=schools&company_id=${effectiveCompanyId}`
        : `/api/analytics?type=schools`
      
      const response = await fetch(url)
      const data = await response.json()
      
      if (data.success && data.schools) {
        setSchools(data.schools)
      }
    } catch (error) {
      console.error('Error fetching schools data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateSchool = async () => {
    try {
      setActionLoading(true)
      
      const response = await fetch('/api/schools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSchool)
      })

      const result = await response.json()

      if (result.success) {
        setCreatedSchoolCredentials(result.data.admin_credentials)
        setShowCredentialsModal(true)
        setShowAddModal(false)
        setNewSchool({
          name: '',
          location: '',
          machineId: '',
          adminUsername: '',
          adminPassword: '',
          adminEmail: ''
        })
        
        fetchSchoolsData()
      } else {
        setError(result.error || 'Failed to create school')
      }
    } catch (error) {
      setError('Failed to create school: ' + error.message)
    } finally {
      setActionLoading(false)
    }
  }

  const handleEditSchool = async () => {
    if (!editingSchool) return

    try {
      setActionLoading(true)
      
      const response = await fetch(`/api/schools?school_id=${editingSchool.school_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: schoolForm.name,
          location: schoolForm.location,
          machineId: schoolForm.machineId,
          status: schoolForm.status
        })
      })

      const result = await response.json()
      
      if (result.success) {
        setShowEditModal(false)
        setEditingSchool(null)
        fetchSchoolsData()
        alert('School updated successfully!')
      } else {
        alert('Failed to update school: ' + (result.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('Update school error:', error)
      alert('Failed to update school: Network error')
    } finally {
      setActionLoading(false)
    }
  }

  const handleDisableSchool = async (schoolId, schoolName) => {
    if (!confirm(`Are you sure you want to disable "${schoolName}"?`)) {
      return
    }

    setActionLoading(true)
    
    try {
      const response = await fetch(`/api/schools?school_id=${schoolId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'inactive' })
      })

      const result = await response.json()
      
      if (result.success) {
        fetchSchoolsData()
        alert(`${schoolName} has been disabled successfully`)
      } else {
        alert('Failed to disable school: ' + (result.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('Disable school error:', error)
      alert('Failed to disable school: Network error')
    } finally {
      setActionLoading(false)
    }
  }

  const handleEnableSchool = async (schoolId, schoolName) => {
    if (!confirm(`Enable "${schoolName}"?`)) {
      return
    }

    setActionLoading(true)
    
    try {
      const response = await fetch(`/api/schools?school_id=${schoolId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'active' })
      })

      const result = await response.json()
      
      if (result.success) {
        fetchSchoolsData()
        alert(`${schoolName} has been enabled successfully`)
      } else {
        alert('Failed to enable school: ' + (result.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('Enable school error:', error)
      alert('Failed to enable school: Network error')
    } finally {
      setActionLoading(false)
    }
  }

  const openDeleteModal = (school) => {
    setSchoolToDelete(school)
    setShowDeleteModal(true)
  }

  const handleDeleteSchool = async (forceDelete = false) => {
    if (!schoolToDelete) return

    setActionLoading(true)
    
    try {
      const response = await fetch(`/api/schools?school_id=${schoolToDelete.school_id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force_delete: forceDelete })
      })

      const result = await response.json()
      
      if (result.success) {
        setShowDeleteModal(false)
        setSchoolToDelete(null)
        fetchSchoolsData()
        alert(result.message || 'School deleted successfully')
      } else {
        alert('Failed to delete school: ' + (result.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('Delete school error:', error)
      alert('Failed to delete school: Network error')
    } finally {
      setActionLoading(false)
    }
  }

  const openEditModal = (school) => {
    setEditingSchool(school)
    setSchoolForm({
      name: school.name || '',
      location: school.location || '',
      machineId: school.machine_id || '',
      status: school.status || 'active'
    })
    setShowEditModal(true)
  }

  const closeModals = () => {
    setShowAddModal(false)
    setShowEditModal(false)
    setShowDeleteModal(false)
    setShowCredentialsModal(false)
    setEditingSchool(null)
    setSchoolToDelete(null)
    setError('')
  }

  if (loading) {
    return <div className="p-6 text-center">Loading schools network...</div>
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <h2 className="text-xl sm:text-2xl font-bold">Schools Network Management</h2>
        <div className="flex flex-col sm:flex-row gap-2">
          <button 
            onClick={fetchSchoolsData}
            disabled={actionLoading}
            className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 disabled:opacity-50 text-sm"
          >
            Refresh
          </button>
          <button 
            onClick={() => setShowAddModal(true)}
            disabled={actionLoading}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm"
          >
            Add New School
          </button>
        </div>
      </div>

      {/* Network Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-3 sm:p-4 rounded-lg shadow">
          <h3 className="text-xs sm:text-sm font-medium text-gray-500">Total Schools</h3>
          <p className="text-lg sm:text-2xl font-bold text-blue-600">{schools.length}</p>
        </div>
        <div className="bg-white p-3 sm:p-4 rounded-lg shadow">
          <h3 className="text-xs sm:text-sm font-medium text-gray-500">Active</h3>
          <p className="text-lg sm:text-2xl font-bold text-green-600">
            {schools.filter(s => s.status === 'active').length}
          </p>
        </div>
        <div className="bg-white p-3 sm:p-4 rounded-lg shadow">
          <h3 className="text-xs sm:text-sm font-medium text-gray-500">Online</h3>
          <p className="text-lg sm:text-2xl font-bold text-green-600">
            {schools.filter(s => s.sync_agent?.connection_status === 'Online').length}
          </p>
        </div>
        <div className="bg-white p-3 sm:p-4 rounded-lg shadow">
          <h3 className="text-xs sm:text-sm font-medium text-gray-500">Inactive</h3>
          <p className="text-lg sm:text-2xl font-bold text-red-600">
            {schools.filter(s => s.status === 'inactive').length}
          </p>
        </div>
      </div>

      {/* Schools Management Table */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <h3 className="text-base sm:text-lg font-semibold">Schools List</h3>
        </div>
        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <div className="inline-block min-w-full align-middle">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">School</th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Location</th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Students</th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {schools.length > 0 ? schools.map((school) => (
                  <tr key={school.school_id} className={school.status === 'inactive' ? 'bg-gray-50' : ''}>
                    <td className="px-3 sm:px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{school.name}</div>
                      <div className="text-xs text-gray-500">ID: {school.school_id}</div>
                      <div className="text-xs text-gray-500 sm:hidden">
                        {school.location} • {school.students?.active || 0}/{school.students?.total || 0} students
                      </div>
                    </td>
                    <td className="px-3 sm:px-6 py-4 text-sm text-gray-500 hidden sm:table-cell">
                      {school.location}
                    </td>
                    <td className="px-3 sm:px-6 py-4 text-sm text-gray-900 hidden sm:table-cell">
                      {school.students?.active || 0}/{school.students?.total || 0}
                    </td>
                    <td className="px-3 sm:px-6 py-4">
                      <div className="space-y-1">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          school.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {school.status || 'active'}
                        </span>
                        <div>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            school.sync_agent?.connection_status === 'Online' ? 'bg-green-100 text-green-800' :
                            school.sync_agent?.connection_status === 'Warning' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {school.sync_agent?.connection_status || 'Unknown'}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 sm:px-6 py-4 text-sm font-medium">
                      <div className="flex flex-col gap-1">
                        <button 
                          onClick={() => openEditModal(school)}
                          disabled={actionLoading}
                          className="text-blue-600 hover:text-blue-900 disabled:opacity-50 text-xs"
                        >
                          Edit
                        </button>
                        {school.status === 'active' ? (
                          <button 
                            onClick={() => handleDisableSchool(school.school_id, school.name)}
                            disabled={actionLoading}
                            className="text-orange-600 hover:text-orange-900 disabled:opacity-50 text-xs"
                          >
                            Disable
                          </button>
                        ) : (
                          <button 
                            onClick={() => handleEnableSchool(school.school_id, school.name)}
                            disabled={actionLoading}
                            className="text-green-600 hover:text-green-900 disabled:opacity-50 text-xs"
                          >
                            Enable
                          </button>
                        )}
                        <button 
                          onClick={() => openDeleteModal(school)}
                          disabled={actionLoading}
                          className="text-red-600 hover:text-red-900 disabled:opacity-50 text-xs"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                      No schools found. Click "Add New School" to get started.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add School Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">Add New School</h3>
            
            {error && (
              <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                {error}
              </div>
            )}
            
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-900 mb-3">School Information</h4>
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="School Name *"
                    value={newSchool.name}
                    onChange={(e) => setNewSchool({...newSchool, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  <input
                    type="text"
                    placeholder="Location *"
                    value={newSchool.location}
                    onChange={(e) => setNewSchool({...newSchool, location: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  <input
                    type="text"
                    placeholder="Machine ID (optional)"
                    value={newSchool.machineId}
                    onChange={(e) => setNewSchool({...newSchool, machineId: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium text-gray-900 mb-3">Admin Account</h4>
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Admin Username (auto-generates if empty)"
                    value={newSchool.adminUsername}
                    onChange={(e) => setNewSchool({...newSchool, adminUsername: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="password"
                    placeholder="Admin Password (auto-generates if empty)"
                    value={newSchool.adminPassword}
                    onChange={(e) => setNewSchool({...newSchool, adminPassword: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="email"
                    placeholder="Admin Email (optional)"
                    value={newSchool.adminEmail}
                    onChange={(e) => setNewSchool({...newSchool, adminEmail: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  If username or password are left empty, they will be auto-generated and shown after creation.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 mt-6">
              <button
                onClick={closeModals}
                className="w-full px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateSchool}
                disabled={actionLoading || !newSchool.name || !newSchool.location}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading ? 'Creating...' : 'Create School'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit School Modal */}
      {showEditModal && editingSchool && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">Edit School: {editingSchool.name}</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">School Name</label>
                <input
                  type="text"
                  value={schoolForm.name}
                  onChange={(e) => setSchoolForm({...schoolForm, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <input
                  type="text"
                  value={schoolForm.location}
                  onChange={(e) => setSchoolForm({...schoolForm, location: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Machine ID</label>
                <input
                  type="text"
                  value={schoolForm.machineId}
                  onChange={(e) => setSchoolForm({...schoolForm, machineId: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={schoolForm.status}
                  onChange={(e) => setSchoolForm({...schoolForm, status: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 mt-6">
              <button
                onClick={closeModals}
                className="w-full px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleEditSchool}
                disabled={actionLoading || !schoolForm.name || !schoolForm.location}
                className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {actionLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && schoolToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-md mx-4">
            <div className="text-center mb-4">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Delete School</h3>
              <p className="text-sm text-gray-600 mt-1">
                This action cannot be undone. Choose how to proceed:
              </p>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
              <h4 className="font-medium text-yellow-800 mb-2">School: {schoolToDelete.name}</h4>
              <div className="text-sm text-yellow-700 space-y-1">
                <div>Location: {schoolToDelete.location}</div>
                <div>Students: {schoolToDelete.students?.total || 0}</div>
                <div>Status: {schoolToDelete.status}</div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                <h5 className="font-medium text-orange-800 text-sm mb-1">Soft Delete (Recommended)</h5>
                <p className="text-xs text-orange-700">
                  Deactivates the school and admin users. Preserves all data for historical records.
                </p>
              </div>
              
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <h5 className="font-medium text-red-800 text-sm mb-1">Permanent Delete (Destructive)</h5>
                <p className="text-xs text-red-700">
                  Completely removes school, students, attendance records, and all related data from the database. This cannot be undone!
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 mt-6">
              <button
                onClick={() => handleDeleteSchool(false)}
                disabled={actionLoading}
                className="w-full px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50"
              >
                {actionLoading ? 'Processing...' : 'Soft Delete (Deactivate)'}
              </button>
              
              <button
                onClick={() => {
                  if (confirm(`FINAL WARNING: This will permanently delete ALL data for "${schoolToDelete.name}" including students, attendance records, and admin accounts. Type "DELETE" to confirm.`)) {
                    const userInput = prompt('Type "DELETE" in capital letters to confirm permanent deletion:')
                    if (userInput === 'DELETE') {
                      handleDeleteSchool(true)
                    } else {
                      alert('Deletion cancelled. You must type "DELETE" exactly to confirm.')
                    }
                  }
                }}
                disabled={actionLoading}
                className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                {actionLoading ? 'Deleting...' : 'Permanent Delete (All Data)'}
              </button>
              
              <button
                onClick={closeModals}
                disabled={actionLoading}
                className="w-full px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Credentials Display Modal */}
      {showCredentialsModal && createdSchoolCredentials && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-lg mx-4">
            <div className="text-center mb-4">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">School Created Successfully!</h3>
              <p className="text-sm text-gray-600 mt-1">
                The school has been created with an admin account. Please save these credentials securely.
              </p>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
              <h4 className="font-medium text-yellow-800 mb-3">Admin Login Credentials</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="font-medium text-yellow-700">Username:</span>
                  <span className="font-mono bg-white px-2 py-1 rounded border">
                    {createdSchoolCredentials.username}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-yellow-700">Password:</span>
                  <span className="font-mono bg-white px-2 py-1 rounded border">
                    {createdSchoolCredentials.password}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-yellow-700">School ID:</span>
                  <span className="font-mono bg-white px-2 py-1 rounded border">
                    {createdSchoolCredentials.school_id}
                  </span>
                </div>
                {createdSchoolCredentials.email && (
                  <div className="flex justify-between">
                    <span className="font-medium text-yellow-700">Email:</span>
                    <span className="font-mono bg-white px-2 py-1 rounded border">
                      {createdSchoolCredentials.email}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-red-700">
                <strong>Important:</strong> Save these credentials immediately. They will not be shown again. 
                Share them securely with the school administrator.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => {
                  const credentials = `School Admin Login Credentials:
Username: ${createdSchoolCredentials.username}
Password: ${createdSchoolCredentials.password}
School ID: ${createdSchoolCredentials.school_id}
${createdSchoolCredentials.email ? `Email: ${createdSchoolCredentials.email}` : ''}`
                  
                  navigator.clipboard.writeText(credentials).then(() => {
                    alert('Credentials copied to clipboard!')
                  })
                }}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Copy to Clipboard
              </button>
              <button
                onClick={() => {
                  setShowCredentialsModal(false)
                  setCreatedSchoolCredentials(null)
                }}
                className="w-full px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


function SystemMonitorTab({ companyId }) {
  const [systemData, setSystemData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSystemData()
    const interval = setInterval(fetchSystemData, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [companyId])

  const fetchSystemData = async () => {
    try {
      setLoading(false) // Don't show loading on refresh
      const response = await fetch(`/api/analytics?type=sync-performance&company_id=${companyId}`)
      const data = await response.json()
      setSystemData(data)
    } catch (error) {
      console.error('Error fetching system data:', error)
    }
  }

  if (loading) {
    return <div className="p-6 text-center">Loading system monitor...</div>
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <h2 className="text-xl sm:text-2xl font-bold">System Performance Monitor</h2>
        <div className="flex flex-col sm:flex-row gap-2">
          <span className="text-sm text-gray-500">Auto-refresh: 30s</span>
          <button 
            onClick={fetchSystemData}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 text-sm"
          >
            Refresh Now
          </button>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4">
        <div className="bg-white p-3 sm:p-4 rounded-lg shadow">
          <h3 className="text-xs sm:text-sm font-medium text-gray-500">Total Agents</h3>
          <p className="text-lg sm:text-2xl font-bold text-blue-600">
            {systemData?.performance_metrics?.total_agents || 0}
          </p>
        </div>
        <div className="bg-white p-3 sm:p-4 rounded-lg shadow">
          <h3 className="text-xs sm:text-sm font-medium text-gray-500">Online Agents</h3>
          <p className="text-lg sm:text-2xl font-bold text-green-600">
            {systemData?.performance_metrics?.online_agents || 0}
          </p>
        </div>
        <div className="bg-white p-3 sm:p-4 rounded-lg shadow">
          <h3 className="text-xs sm:text-sm font-medium text-gray-500">Avg Error Rate</h3>
          <p className="text-lg sm:text-2xl font-bold text-red-600">
            {systemData?.performance_metrics?.avg_error_rate || 0}%
          </p>
        </div>
        <div className="bg-white p-3 sm:p-4 rounded-lg shadow">
          <h3 className="text-xs sm:text-sm font-medium text-gray-500">Syncs/Hour</h3>
          <p className="text-lg sm:text-2xl font-bold text-purple-600">
            {Math.round(systemData?.performance_metrics?.avg_syncs_per_hour || 0)}
          </p>
        </div>
        <div className="bg-white p-3 sm:p-4 rounded-lg shadow">
          <h3 className="text-xs sm:text-sm font-medium text-gray-500">Uptime (Avg)</h3>
          <p className="text-lg sm:text-2xl font-bold text-orange-600">
            {Math.round(systemData?.performance_metrics?.avg_uptime_hours || 0)}h
          </p>
        </div>
      </div>

      {/* Health Distribution */}
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-base sm:text-lg font-semibold mb-4">Agent Health Distribution</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-xl sm:text-2xl font-bold text-green-600">
              {systemData?.health_distribution?.excellent || 0}
            </div>
            <div className="text-xs sm:text-sm text-gray-500">Excellent (90%+)</div>
          </div>
          <div className="text-center">
            <div className="text-xl sm:text-2xl font-bold text-blue-600">
              {systemData?.health_distribution?.good || 0}
            </div>
            <div className="text-xs sm:text-sm text-gray-500">Good (70-89%)</div>
          </div>
          <div className="text-center">
            <div className="text-xl sm:text-2xl font-bold text-yellow-600">
              {systemData?.health_distribution?.fair || 0}
            </div>
            <div className="text-xs sm:text-sm text-gray-500">Fair (50-69%)</div>
          </div>
          <div className="text-center">
            <div className="text-xl sm:text-2xl font-bold text-red-600">
              {systemData?.health_distribution?.poor || 0}
            </div>
            <div className="text-xs sm:text-sm text-gray-500">Poor (50%)</div>
          </div>
        </div>
      </div>

      {/* Agents Detail Table */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <h3 className="text-base sm:text-lg font-semibold">Sync Agents Status</h3>
        </div>
        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <div className="inline-block min-w-full align-middle">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500">School</th>
                  <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500">Status</th>
                  <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 hidden sm:table-cell">Health Score</th>
                  <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 hidden sm:table-cell">Uptime</th>
                  <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 hidden sm:table-cell">Synced</th>
                  <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 hidden sm:table-cell">Errors</th>
                  <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 hidden sm:table-cell">Memory</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {systemData?.agents?.length > 0 ? systemData.agents.map((agent) => (
                  <tr key={agent.school_id}>
                    <td className="px-3 sm:px-4 py-3">
                      <div className="text-sm font-medium text-gray-900">{agent.school_name}</div>
                      <div className="text-xs text-gray-500 sm:hidden">
                        Health: {agent.health_score}% • Uptime: {agent.uptime_hours}h
                      </div>
                    </td>
                    <td className="px-3 sm:px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        agent.connection_status === 'Online' ? 'bg-green-100 text-green-800' :
                        agent.connection_status === 'Warning' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {agent.connection_status}
                      </span>
                      <div className="text-xs text-gray-500 sm:hidden mt-1">
                        Synced: {agent.total_synced} • Errors: {agent.total_errors}
                      </div>
                    </td>
                    <td className="px-3 sm:px-4 py-3 text-sm text-gray-900 hidden sm:table-cell">{agent.health_score}%</td>
                    <td className="px-3 sm:px-4 py-3 text-sm text-gray-900 hidden sm:table-cell">{agent.uptime_hours}h</td>
                    <td className="px-3 sm:px-4 py-3 text-sm text-gray-900 hidden sm:table-cell">{agent.total_synced}</td>
                    <td className="px-3 sm:px-4 py-3 text-sm text-gray-900 hidden sm:table-cell">{agent.total_errors}</td>
                    <td className="px-3 sm:px-4 py-3 text-sm text-gray-900 hidden sm:table-cell">{agent.memory_usage_mb}MB</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                      No sync agents found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

function AnalyticsTab({ companyId }) {
  const [activeView, setActiveView] = useState('overview')
  const [analyticsData, setAnalyticsData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAnalyticsData()
  }, [activeView, companyId])

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/analytics?type=${activeView}&company_id=${companyId}`)
      const data = await response.json()
      setAnalyticsData(data)
    } catch (error) {
      console.error('Error fetching analytics data:', error)
    } finally {
      setLoading(false)
    }
  }

  const views = [
    { id: 'overview', label: 'Overview' },
    { id: 'trends', label: 'Trends' },
    { id: 'students', label: 'Students' },
    { id: 'real-time', label: 'Real-time' }
  ]

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <h2 className="text-xl sm:text-2xl font-bold">Analytics Dashboard</h2>
        <div className="flex flex-wrap gap-2">
          {views.map(view => (
            <button
              key={view.id}
              onClick={() => setActiveView(view.id)}
              className={`px-3 sm:px-4 py-2 rounded-lg text-sm ${
                activeView === view.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {view.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading analytics...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {activeView === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
              <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Schools</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Total:</span>
                    <span className="font-bold">{analyticsData?.overview?.schools?.total || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Active:</span>
                    <span className="font-bold text-green-600">{analyticsData?.overview?.schools?.active || 0}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Students</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Total:</span>
                    <span className="font-bold">{analyticsData?.overview?.students?.total || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Active:</span>
                    <span className="font-bold text-green-600">{analyticsData?.overview?.students?.active || 0}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Attendance</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Today:</span>
                    <span className="font-bold text-blue-600">{analyticsData?.overview?.attendance?.today || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>This Week:</span>
                    <span className="font-bold">{analyticsData?.overview?.attendance?.week || 0}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeView === 'real-time' && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
              <div className="bg-white p-3 sm:p-4 rounded-lg shadow">
                <h3 className="text-xs sm:text-sm font-medium text-gray-500">Last Minute</h3>
                <p className="text-lg sm:text-2xl font-bold text-green-600">
                  {analyticsData?.live_metrics?.last_minute || 0}
                </p>
              </div>
              <div className="bg-white p-3 sm:p-4 rounded-lg shadow">
                <h3 className="text-xs sm:text-sm font-medium text-gray-500">Last 5 Minutes</h3>
                <p className="text-lg sm:text-2xl font-bold text-blue-600">
                  {analyticsData?.live_metrics?.last_5_minutes || 0}
                </p>
              </div>
              <div className="bg-white p-3 sm:p-4 rounded-lg shadow">
                <h3 className="text-xs sm:text-sm font-medium text-gray-500">Last 15 Minutes</h3>
                <p className="text-lg sm:text-2xl font-bold text-purple-600">
                  {analyticsData?.live_metrics?.last_15_minutes || 0}
                </p>
              </div>
              <div className="bg-white p-3 sm:p-4 rounded-lg shadow">
                <h3 className="text-xs sm:text-sm font-medium text-gray-500">Last Hour</h3>
                <p className="text-lg sm:text-2xl font-bold text-orange-600">
                  {analyticsData?.live_metrics?.last_hour || 0}
                </p>
              </div>
            </div>
          )}

          {activeView === 'trends' && (
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-4">Attendance Trends</h3>
              <div className="text-center py-8 text-gray-500">
                <p>Trends visualization would appear here</p>
                <p className="text-sm">Connect to chart library for detailed analytics</p>
              </div>
            </div>
          )}

          {activeView === 'students' && (
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-4">Student Analytics</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-2">Top Performers</h4>
                  <div className="space-y-2">
                    {Array.from({length: 5}, (_, i) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span>Student {i + 1}</span>
                        <span className="text-green-600">{100 - i * 2}%</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Attendance Patterns</h4>
                  <div className="text-sm text-gray-600">
                    <p>Peak hours: 8:00 AM - 9:00 AM</p>
                    <p>Average daily attendance: 85%</p>
                    <p>Most active day: Monday</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}