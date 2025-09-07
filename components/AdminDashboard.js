import { useState, useEffect } from 'react'

export default function AdminDashboard({ user }) {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [stats, setStats] = useState({})
  const [students, setStudents] = useState([])
  const [schools, setSchools] = useState([])
  const [attendance, setAttendance] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showMobileMenu, setShowMobileMenu] = useState(false)

      // Available tabs based on user role


  // Determine user role and capabilities
  const isCompanyAdmin = user.role === 'company_admin' || user.role === 'main_admin'
  const isSchoolAdmin = user.role === 'school_admin' || !user.SchoolID

  useEffect(() => {
    console.log('Dashboard loading data...')
    loadDashboardData()
  }, [])

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
    { id: 'attendance', label: 'Attendance', icon: '✅' }
  ]
  
  const loadDashboardData = async () => {
    setLoading(true)
    setError('')
    
    try {
      if (isCompanyAdmin) {
        await loadCompanyAdminData()
      } else {
        await loadSchoolAdminData()
      }
    } catch (error) {
      setError('Failed to load dashboard data')
      console.error('Dashboard loading error:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadCompanyAdminData = async () => {
    try {
      const [overviewResponse, schoolsResponse, attendanceResponse] = await Promise.all([
        fetch(`/api/analytics?type=overview`),
        fetch(`/api/analytics?type=schools`),
        fetch(`/api/analytics?type=real-time`)
      ])

      const overviewData = await overviewResponse.json()
      const schoolsData = await schoolsResponse.json()
      const attendanceData = await attendanceResponse.json()

      if (overviewData.success && overviewData.overview) {
        setStats({
          total_schools: overviewData.overview.schools.total,
          total_students: overviewData.overview.students.total,
          active_sync_agents: overviewData.overview.sync_agents.online,
          system_health: determineSystemHealth(overviewData.overview),
          total_attendance_today: overviewData.overview.attendance.today
        })
      } else {
        setStats({
          total_schools: 0,
          total_students: 0,
          active_sync_agents: 0,
          system_health: 'error',
          total_attendance_today: 0
        })
      }

      if (schoolsData.success && schoolsData.schools) {
        setSchools(schoolsData.schools.map(school => ({
          id: school.SchoolID,
          name: school.name,
          location: school.location,
          status: school.status,
          students: school.students.total,
          syncStatus: school.sync_agent.connection_status.toLowerCase()
        })))
      }

      if (attendanceData.success && attendanceData.current_activity) {
        setAttendance(attendanceData.current_activity.map(record => ({
          id: record.attendance_id,
          student_name: record.student_name,
          scan_time: record.scan_time,
          status: record.status,
          created_at: record.created_at
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
        system_health: 'error',
        total_attendance_today: 0
      })
      setSchools([])
      setAttendance([])
    }
  }

  const loadSchoolAdminData = async () => {
    try {
      console.log('AdminDashboard user object:', user)
      console.log('User school_id:', user.SchoolID)
      console.log('User role:', user.role)

      const schoolId = user.SchoolID || user.school_id || 2
      console.log('Using schoolId for data loading:', schoolId)

      const [overviewResponse, studentsResponse, attendanceResponse] = await Promise.all([
        fetch(`/api/analytics?type=overview&school_id=${schoolId}`).catch(() =>
          fetch('/api/sync-agent', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'check_database_structure' })
          })
        ),
        fetch(`/api/students?school_id=${schoolId}&include_stats=true`).catch(() =>
          fetch('/api/sync-agent', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'check_sync_requirements' })
          })
        ),
        fetch(`/api/analytics?type=real-time&school_id=${schoolId}`).catch(() =>
          fetch('/api/sync-agent', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'get_recent_attendance' })
          })
        )
      ])

      const overviewData = await overviewResponse.json()
      const studentsData = await studentsResponse.json()
      const attendanceData = await attendanceResponse.json()

      if (overviewData.success && overviewData.overview) {
        setStats({
          total_students: overviewData.overview.students?.total || 0,
          present_today: overviewData.overview.attendance?.today || 0,
          absent_today: Math.max(0, (overviewData.overview.students?.total || 0) - (overviewData.overview.attendance?.today || 0)),
          students_without_passwords: 0
        })
      } else {
        setStats({
          total_students: studentsData.success ? studentsData.result?.dataAvailable?.StudentCount || 0 : 0,
          present_today: attendanceData.success ? attendanceData.result?.recentRecords?.filter(r => r.Status === 'IN').length || 0 : 0,
          absent_today: 0,
          students_without_passwords: 0
        })
      }

      if (studentsData.success && studentsData.data) {
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
        
        const withoutPasswords = studentsData.data.filter(s => !s.parent_password_set).length
        setStats(prev => ({...prev, students_without_passwords: withoutPasswords}))
      } else {
        setStudents([
          { id: 1, name: 'John Doe', grade: '10th', studentCode: '001', parentPasswordSet: true, lastSeen: '2024-12-19T08:15:00', is_active: true },
          { id: 2, name: 'Jane Smith', grade: '9th', studentCode: '002', parentPasswordSet: false, lastSeen: null, is_active: true },
          { id: 13, name: 'DANIELLA AKU-SIKA ABBIW', grade: '11th', studentCode: '013', parentPasswordSet: true, lastSeen: '2025-08-26T02:47:21', is_active: true },
        ])
      }

      if (attendanceData.success) {
        if (attendanceData.current_activity) {
          setAttendance(attendanceData.current_activity.map(record => ({
            id: record.attendance_id,
            studentName: record.student_name,
            status: record.status,
            time: record.scan_time,
            grade: 'N/A'
          })))
        } else if (attendanceData.result?.recentRecords) {
          setAttendance(attendanceData.result.recentRecords.map(record => ({
            id: record.AttendanceID,
            studentName: record.StudentName,
            status: record.Status,
            time: record.ScanTime,
            grade: '10th'
          })))
        }
      }

    } catch (error) {
      console.error('Error loading school admin data:', error)
      loadFallbackSchoolData()
    }
  }

  const loadFallbackSchoolData = async () => {
    try {
      const [statsResponse, studentsResponse, attendanceResponse] = await Promise.all([
        fetch('/api/sync-agent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'check_database_structure' })
        }),
        fetch('/api/sync-agent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'check_sync_requirements' })
        }),
        fetch('/api/sync-agent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'get_recent_attendance' })
        })
      ])

      const statsData = await statsResponse.json()
      const studentsData = await studentsResponse.json()
      const attendanceData = await attendanceResponse.json()

      setStats({
        total_students: studentsData.success ? studentsData.result.dataAvailable?.StudentCount || 0 : 0,
        present_today: attendanceData.success ? attendanceData.result.recentRecords?.filter(r => r.Status === 'IN').length || 0 : 0,
        absent_today: 0,
        students_without_passwords: 0
      })

      if (attendanceData.success) {
        setAttendance(attendanceData.result.recentRecords?.map(record => ({
          id: record.AttendanceID,
          studentName: record.StudentName,
          status: record.Status,
          time: record.ScanTime,
          grade: '10th'
        })) || [])
      }

      setStudents([
        { id: 1, name: 'John Doe', grade: '10th', studentCode: '001', parentPasswordSet: true, lastSeen: '2024-12-19T08:15:00' },
        { id: 2, name: 'Jane Smith', grade: '9th', studentCode: '002', parentPasswordSet: false, lastSeen: null },
        { id: 13, name: 'DANIELLA AKU-SIKA ABBIW', grade: '11th', studentCode: '013', parentPasswordSet: true, lastSeen: '2025-08-26T02:47:21' },
      ])
    } catch (error) {
      console.error('Fallback data loading failed:', error)
    }
  }

  const determineSystemHealth = (overview) => {
    if (!overview || !overview.sync_agents) return 'unknown'
    
    const totalAgents = overview.sync_agents.total
    const onlineAgents = overview.sync_agents.online
    const errorRate = overview.performance?.error_rate || 0
    
    if (totalAgents === 0) return 'no_agents'
    
    const onlinePercentage = (onlineAgents / totalAgents) * 100
    
    if (onlinePercentage >= 80 && errorRate < 5) return 'healthy'
    if (onlinePercentage >= 60 && errorRate < 10) return 'degraded'
    return 'error'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
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
            onClick={loadDashboardData}
            className="ml-4 bg-red-600 text-white px-3 py-1 rounded text-sm"
          >
            Retry
          </button>
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
            : `Manage ${user.school?.name || 'your school'}`
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
                  <p className="text-lg sm:text-2xl font-bold text-gray-900">{stats.active_sync_agents}</p>
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
          {activeTab === 'dashboard' && <DashboardTab attendance={attendance} stats={stats} isCompanyAdmin={isCompanyAdmin} user={user} />}
          {/* {activeTab === 'students' && !isCompanyAdmin && <div className="text-center py-8 text-gray-500">Students tab content would go here</div>} */}
          {activeTab === 'students' && !isCompanyAdmin && <StudentsTab students={students} onRefresh={loadDashboardData} user={user} />}
          {/* {activeTab === 'upload' && !isCompanyAdmin && <div className="text-center py-8 text-gray-500">Upload tab content would go here</div>} */}
          {activeTab === 'upload' && !isCompanyAdmin && <UploadStudentsTab user={user} onUploadComplete={loadDashboardData} />}
          {/* {activeTab === 'attendance' && <div className="text-center py-8 text-gray-500">Attendance tab content would go here</div>} */}
          {activeTab === 'attendance' && <AttendanceTabMobileResponsive attendance={attendance} isCompanyAdmin={isCompanyAdmin} user={user} />}
          {activeTab === 'system-monitor' && isCompanyAdmin && <SystemMonitorTab companyId={user.company_id} user={user} />}
          {activeTab === 'schools' && isCompanyAdmin && <SchoolsNetworkTab companyId={user.company_id} user={user} />}
          {activeTab === 'analytics' && isCompanyAdmin && <AnalyticsTab companyId={user.company_id} user={user} />}
          {/* {activeTab === 'system-monitor' && isCompanyAdmin && <SystemMonitorTab />}
          {activeTab === 'schools' && isCompanyAdmin && <SchoolsNetworkTab />}
          {activeTab === 'analytics' && isCompanyAdmin && <AnalyticsTab />} */}
        </div>
      </div>
    </div>
  )
}


function DashboardTab({ attendance, stats, isCompanyAdmin, user }) {
  if (isCompanyAdmin) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Network-wide Activity */}
        <div>
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Network Activity Today</h3>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            <div className="text-center py-8 text-gray-500">
              <p className="text-sm">No network activity today</p>
            </div>
          </div>
        </div>

        {/* System Overview */}
        <div>
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">System Overview</h3>
          <div className="space-y-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">Quick Actions</h4>
              <div className="space-y-2">
                <button className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm">
                  Add New School
                </button>
                <button className="w-full bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 text-sm">
                  View All Reports
                </button>
                <button className="w-full bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 text-sm">
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
                  <span className="font-medium">{stats.active_sync_agents || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Today's Attendance:</span>
                  <span className="font-medium">{stats.total_attendance_today || 0}</span>
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
      <div>
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Recent Check-ins</h3>
        <div className="space-y-3 max-h-64 overflow-y-auto">
          <div className="text-center py-8 text-gray-500">
            <p className="text-sm">No check-ins today</p>
          </div>
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
          
          <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
            <div>
              <p className="font-medium text-red-900">Sync Agent</p>
              <p className="text-sm text-red-600">Offline</p>
            </div>
            <span className="w-3 h-3 bg-red-500 rounded-full"></span>
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

// Network Attendance Tab Component
function AttendanceTab({ attendance, isCompanyAdmin, user }) {
  const [dateRange, setDateRange] = useState({
    from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0]
  })
  const [attendanceData, setAttendanceData] = useState(attendance) // Initialize with prop data
  const [loading, setLoading] = useState(false)

  // Update local state when prop changes
  useEffect(() => {
    setAttendanceData(attendance)
  }, [attendance])

  const refreshAttendance = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        type: 'real-time',
        date_from: dateRange.from,
        date_to: dateRange.to
      })
      
      if (isCompanyAdmin && user.company_id) {
        params.append('company_id', user.company_id)
      } else if (user.school_id) {
        params.append('school_id', user.school_id)
      }

      const response = await fetch(`/api/analytics?${params}`)
      const data = await response.json()
      
      if (data.success && data.current_activity) {
        const formattedData = data.current_activity.map(record => ({
          id: record.attendance_id,
          studentName: record.student_name,
          student_name: record.student_name,
          status: record.status,
          time: record.scan_time,
          scan_time: record.scan_time,
          created_at: record.created_at
        }))
        setAttendanceData(formattedData)
      }
    } catch (error) {
      console.error('Error refreshing attendance:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold text-gray-900">
          {isCompanyAdmin ? 'Network Attendance Records' : 'Recent Attendance'}
        </h3>
        <div className="flex gap-4">
          <input
            type="date"
            value={dateRange.from}
            onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
            className="border rounded px-3 py-2"
          />
          <input
            type="date"
            value={dateRange.to}
            onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
            className="border rounded px-3 py-2"
          />
          <button 
            onClick={refreshAttendance}
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Student
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Time
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {attendanceData && attendanceData.length > 0 ? (
              attendanceData.slice(0, 50).map((record) => (
                <tr key={record.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {record.studentName || record.student_name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      record.status === 'IN' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {record.status === 'IN' ? 'Check In' : 'Check Out'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(record.time || record.scan_time || record.created_at).toLocaleTimeString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(record.time || record.scan_time || record.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="4" className="px-6 py-8 text-center text-gray-500">
                  {loading ? 'Loading...' : 'No attendance records found for the selected period'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}



// function SchoolsNetworkTab({ companyId, user }) {
//   const [schools, setSchools] = useState([])
//   const [showEditModal, setShowEditModal] = useState(false)
//   const [editingSchool, setEditingSchool] = useState(null)
//   const [actionLoading, setActionLoading] = useState(false)
//   const [loading, setLoading] = useState(false)
//   const [showAddModal, setShowAddModal] = useState(false)
//   const [newSchool, setNewSchool] = useState({
//     name: '',
//     location: '',
//     machineId: '',
//     adminUsername: '',
//     adminPassword: '',
//     adminEmail: ''
//   })
//   const [createdSchoolCredentials, setCreatedSchoolCredentials] = useState(null)
//   const [showCredentialsModal, setShowCredentialsModal] = useState(false)
//   const [error, setError] = useState('')

//   const [schoolForm, setSchoolForm] = useState({
//     name: '',
//     location: '',
//     machineId: '',
//     contactEmail: '',
//     contactPhone: '',
//     status: 'active'
//   })

//   // Get company ID from props or user object
//   const effectiveCompanyId = companyId || user?.company_id || user?.CompanyID || ''

//   useEffect(() => {
//     fetchSchoolsData()
//   }, [effectiveCompanyId])

//   const fetchSchoolsData = async () => {
//     try {
//       setLoading(true)
//       const url = effectiveCompanyId 
//         ? `/api/analytics?type=schools&company_id=${effectiveCompanyId}`
//         : `/api/analytics?type=schools`
      
//       const response = await fetch(url)
//       const data = await response.json()
      
//       if (data.success && data.schools) {
//         setSchools(data.schools)
//       }
//     } catch (error) {
//       console.error('Error fetching schools data:', error)
//     } finally {
//       setLoading(false)
//     }
//   }

//   const handleCreateSchool = async () => {
//     try {
//       setActionLoading(true)
      
//       const response = await fetch('/api/schools', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify(newSchool)
//       })

//       const result = await response.json()

//       if (result.success) {
//         setCreatedSchoolCredentials(result.data.admin_credentials)
//         setShowCredentialsModal(true)
//         setShowAddModal(false)
//         setNewSchool({
//           name: '',
//           location: '',
//           machineId: '',
//           adminUsername: '',
//           adminPassword: '',
//           adminEmail: ''
//         })
        
//         fetchSchoolsData()
//       } else {
//         setError(result.error || 'Failed to create school')
//       }
//     } catch (error) {
//       setError('Failed to create school: ' + error.message)
//     } finally {
//       setActionLoading(false)
//     }
//   }

//   const handleDisableSchool = async (schoolId, schoolName) => {
//     if (!confirm(`Are you sure you want to disable "${schoolName}"?`)) {
//       return
//     }

//     setActionLoading(true)
    
//     try {
//       const response = await fetch(`/api/schools?school_id=${schoolId}`, {
//         method: 'PUT',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ status: 'inactive' })
//       })

//       const result = await response.json()
      
//       if (result.success) {
//         fetchSchoolsData()
//         alert(`${schoolName} has been disabled successfully`)
//       } else {
//         alert('Failed to disable school: ' + (result.error || 'Unknown error'))
//       }
//     } catch (error) {
//       console.error('Disable school error:', error)
//       alert('Failed to disable school: Network error')
//     } finally {
//       setActionLoading(false)
//     }
//   }

//   const handleEnableSchool = async (schoolId, schoolName) => {
//     if (!confirm(`Enable "${schoolName}"?`)) {
//       return
//     }

//     setActionLoading(true)
    
//     try {
//       const response = await fetch(`/api/schools?school_id=${schoolId}`, {
//         method: 'PUT',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ status: 'active' })
//       })

//       const result = await response.json()
      
//       if (result.success) {
//         fetchSchoolsData()
//         alert(`${schoolName} has been enabled successfully`)
//       } else {
//         alert('Failed to enable school: ' + (result.error || 'Unknown error'))
//       }
//     } catch (error) {
//       console.error('Enable school error:', error)
//       alert('Failed to enable school: Network error')
//     } finally {
//       setActionLoading(false)
//     }
//   }

//   if (loading) {
//     return <div className="p-6 text-center">Loading schools network...</div>
//   }

//   return (
//     <div className="space-y-4 sm:space-y-6">
//       <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
//         <h2 className="text-xl sm:text-2xl font-bold">Schools Network Management</h2>
//         <div className="flex flex-col sm:flex-row gap-2">
//           <button 
//             onClick={fetchSchoolsData}
//             disabled={actionLoading}
//             className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 disabled:opacity-50 text-sm"
//           >
//             Refresh
//           </button>
//           <button 
//             onClick={() => setShowAddModal(true)}
//             disabled={actionLoading}
//             className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm"
//           >
//             Add New School
//           </button>
//         </div>
//       </div>

//       {/* Network Summary */}
//       <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
//         <div className="bg-white p-3 sm:p-4 rounded-lg shadow">
//           <h3 className="text-xs sm:text-sm font-medium text-gray-500">Total Schools</h3>
//           <p className="text-lg sm:text-2xl font-bold text-blue-600">{schools.length}</p>
//         </div>
//         <div className="bg-white p-3 sm:p-4 rounded-lg shadow">
//           <h3 className="text-xs sm:text-sm font-medium text-gray-500">Active</h3>
//           <p className="text-lg sm:text-2xl font-bold text-green-600">
//             {schools.filter(s => s.status === 'active').length}
//           </p>
//         </div>
//         <div className="bg-white p-3 sm:p-4 rounded-lg shadow">
//           <h3 className="text-xs sm:text-sm font-medium text-gray-500">Online</h3>
//           <p className="text-lg sm:text-2xl font-bold text-green-600">
//             {schools.filter(s => s.sync_agent?.connection_status === 'Online').length}
//           </p>
//         </div>
//         <div className="bg-white p-3 sm:p-4 rounded-lg shadow">
//           <h3 className="text-xs sm:text-sm font-medium text-gray-500">Inactive</h3>
//           <p className="text-lg sm:text-2xl font-bold text-red-600">
//             {schools.filter(s => s.status === 'inactive').length}
//           </p>
//         </div>
//       </div>

//       {/* Schools Management Table */}
//       <div className="bg-white rounded-lg shadow">
//         <div className="p-4 border-b">
//           <h3 className="text-base sm:text-lg font-semibold">Schools List</h3>
//         </div>
//         <div className="overflow-x-auto -mx-4 sm:mx-0">
//           <div className="inline-block min-w-full align-middle">
//             <table className="min-w-full">
//               <thead className="bg-gray-50">
//                 <tr>
//                   <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">School</th>
//                   <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Location</th>
//                   <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Students</th>
//                   <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
//                   <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
//                 </tr>
//               </thead>
//               <tbody className="bg-white divide-y divide-gray-200">
//                 {schools.length > 0 ? schools.map((school) => (
//                   <tr key={school.school_id} className={school.status === 'inactive' ? 'bg-gray-50' : ''}>
//                     <td className="px-3 sm:px-6 py-4">
//                       <div className="text-sm font-medium text-gray-900">{school.name}</div>
//                       <div className="text-xs text-gray-500">ID: {school.school_id}</div>
//                       <div className="text-xs text-gray-500 sm:hidden">
//                         {school.location} • {school.students?.active || 0}/{school.students?.total || 0} students
//                       </div>
//                     </td>
//                     <td className="px-3 sm:px-6 py-4 text-sm text-gray-500 hidden sm:table-cell">
//                       {school.location}
//                     </td>
//                     <td className="px-3 sm:px-6 py-4 text-sm text-gray-900 hidden sm:table-cell">
//                       {school.students?.active || 0}/{school.students?.total || 0}
//                     </td>
//                     <td className="px-3 sm:px-6 py-4">
//                       <div className="space-y-1">
//                         <span className={`px-2 py-1 rounded-full text-xs font-medium ${
//                           school.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
//                         }`}>
//                           {school.status || 'active'}
//                         </span>
//                         <div>
//                           <span className={`px-2 py-1 rounded-full text-xs font-medium ${
//                             school.sync_agent?.connection_status === 'Online' ? 'bg-green-100 text-green-800' :
//                             school.sync_agent?.connection_status === 'Warning' ? 'bg-yellow-100 text-yellow-800' :
//                             'bg-red-100 text-red-800'
//                           }`}>
//                             {school.sync_agent?.connection_status || 'Unknown'}
//                           </span>
//                         </div>
//                       </div>
//                     </td>
//                     <td className="px-3 sm:px-6 py-4 text-sm font-medium">
//                       <div className="flex flex-col gap-1">
//                         <button 
//                           onClick={() => {/* Edit functionality */}}
//                           disabled={actionLoading}
//                           className="text-blue-600 hover:text-blue-900 disabled:opacity-50 text-xs"
//                         >
//                           Edit
//                         </button>
//                         {school.status === 'active' ? (
//                           <button 
//                             onClick={() => handleDisableSchool(school.school_id, school.name)}
//                             disabled={actionLoading}
//                             className="text-red-600 hover:text-red-900 disabled:opacity-50 text-xs"
//                           >
//                             Disable
//                           </button>
//                         ) : (
//                           <button 
//                             onClick={() => handleEnableSchool(school.school_id, school.name)}
//                             disabled={actionLoading}
//                             className="text-green-600 hover:text-green-900 disabled:opacity-50 text-xs"
//                           >
//                             Enable
//                           </button>
//                         )}
//                       </div>
//                     </td>
//                   </tr>
//                 )) : (
//                   <tr>
//                     <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
//                       No schools found. Click "Add New School" to get started.
//                     </td>
//                   </tr>
//                 )}
//               </tbody>
//             </table>
//           </div>
//         </div>
//       </div>

//       {/* Add School Modal */}
//       {showAddModal && (
//         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
//           <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-md mx-4">
//             <h3 className="text-lg font-semibold mb-4">Add New School</h3>
            
//             {error && (
//               <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
//                 {error}
//               </div>
//             )}
            
//             <div className="space-y-4">
//               {/* School Information */}
//               <div>
//                 <h4 className="font-medium text-gray-900 mb-3">School Information</h4>
//                 <div className="space-y-3">
//                   <input
//                     type="text"
//                     placeholder="School Name *"
//                     value={newSchool.name}
//                     onChange={(e) => setNewSchool({...newSchool, name: e.target.value})}
//                     className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//                     required
//                   />
//                   <input
//                     type="text"
//                     placeholder="Location *"
//                     value={newSchool.location}
//                     onChange={(e) => setNewSchool({...newSchool, location: e.target.value})}
//                     className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//                     required
//                   />
//                   <input
//                     type="text"
//                     placeholder="Machine ID (optional)"
//                     value={newSchool.machineId}
//                     onChange={(e) => setNewSchool({...newSchool, machineId: e.target.value})}
//                     className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//                   />
//                 </div>
//               </div>

//               {/* Admin Account Section */}
//               <div className="border-t pt-4">
//                 <h4 className="font-medium text-gray-900 mb-3">Admin Account</h4>
//                 <div className="space-y-3">
//                   <input
//                     type="text"
//                     placeholder="Admin Username (auto-generates if empty)"
//                     value={newSchool.adminUsername}
//                     onChange={(e) => setNewSchool({...newSchool, adminUsername: e.target.value})}
//                     className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//                   />
//                   <input
//                     type="password"
//                     placeholder="Admin Password (auto-generates if empty)"
//                     value={newSchool.adminPassword}
//                     onChange={(e) => setNewSchool({...newSchool, adminPassword: e.target.value})}
//                     className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//                   />
//                   <input
//                     type="email"
//                     placeholder="Admin Email (optional)"
//                     value={newSchool.adminEmail}
//                     onChange={(e) => setNewSchool({...newSchool, adminEmail: e.target.value})}
//                     className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//                   />
//                 </div>
//                 <p className="text-xs text-gray-500 mt-2">
//                   If username or password are left empty, they will be auto-generated and shown after creation.
//                 </p>
//               </div>
//             </div>

//             <div className="flex flex-col sm:flex-row gap-3 mt-6">
//               <button
//                 onClick={() => {
//                   setShowAddModal(false)
//                   setError('')
//                 }}
//                 className="w-full px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
//                 disabled={actionLoading}
//               >
//                 Cancel
//               </button>
//               <button
//                 onClick={handleCreateSchool}
//                 disabled={actionLoading || !newSchool.name || !newSchool.location}
//                 className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
//               >
//                 {actionLoading ? 'Creating...' : 'Create School'}
//               </button>
//             </div>
//           </div>
//         </div>
//       )}

//       {/* Admin Credentials Display Modal */}
//       {showCredentialsModal && createdSchoolCredentials && (
//         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
//           <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-lg mx-4">
//             <div className="text-center mb-4">
//               <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
//                 <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
//                 </svg>
//               </div>
//               <h3 className="text-lg font-semibold text-gray-900">School Created Successfully!</h3>
//               <p className="text-sm text-gray-600 mt-1">
//                 The school has been created with an admin account. Please save these credentials securely.
//               </p>
//             </div>

//             <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
//               <h4 className="font-medium text-yellow-800 mb-3">Admin Login Credentials</h4>
//               <div className="space-y-2 text-sm">
//                 <div className="flex justify-between">
//                   <span className="font-medium text-yellow-700">Username:</span>
//                   <span className="font-mono bg-white px-2 py-1 rounded border">
//                     {createdSchoolCredentials.username}
//                   </span>
//                 </div>
//                 <div className="flex justify-between">
//                   <span className="font-medium text-yellow-700">Password:</span>
//                   <span className="font-mono bg-white px-2 py-1 rounded border">
//                     {createdSchoolCredentials.password}
//                   </span>
//                 </div>
//                 <div className="flex justify-between">
//                   <span className="font-medium text-yellow-700">School ID:</span>
//                   <span className="font-mono bg-white px-2 py-1 rounded border">
//                     {createdSchoolCredentials.school_id}
//                   </span>
//                 </div>
//                 {createdSchoolCredentials.email && (
//                   <div className="flex justify-between">
//                     <span className="font-medium text-yellow-700">Email:</span>
//                     <span className="font-mono bg-white px-2 py-1 rounded border">
//                       {createdSchoolCredentials.email}
//                     </span>
//                   </div>
//                 )}
//               </div>
//             </div>

//             <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
//               <p className="text-sm text-red-700">
//                 <strong>Important:</strong> Save these credentials immediately. They will not be shown again. 
//                 Share them securely with the school administrator.
//               </p>
//             </div>

//             <div className="flex flex-col sm:flex-row gap-3">
//               <button
//                 onClick={() => {
//                   const credentials = `School Admin Login Credentials:
// Username: ${createdSchoolCredentials.username}
// Password: ${createdSchoolCredentials.password}
// School ID: ${createdSchoolCredentials.school_id}
// ${createdSchoolCredentials.email ? `Email: ${createdSchoolCredentials.email}` : ''}`
                  
//                   navigator.clipboard.writeText(credentials).then(() => {
//                     alert('Credentials copied to clipboard!')
//                   })
//                 }}
//                 className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
//               >
//                 Copy to Clipboard
//               </button>
//               <button
//                 onClick={() => {
//                   setShowCredentialsModal(false)
//                   setCreatedSchoolCredentials(null)
//                 }}
//                 className="w-full px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
//               >
//                 Close
//               </button>
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   )
// }
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

// Update your main dashboard component to include these tabs
// Add this to your existing dashboard render logic:

const renderActiveTab = () => {
  switch (activeTab) {
    case 'dashboard':
      return <DashboardOverview />
    case 'network-attendance':
      return <NetworkAttendanceTab companyId={companyId} />
    case 'schools-network':
      return <SchoolsNetworkTab companyId={companyId} />
    case 'system-monitor':
      return <SystemMonitorTab companyId={companyId} />
    case 'analytics':
      return <AnalyticsTab companyId={companyId} />
    default:
      return <DashboardOverview />
  }
}

// Complete StudentsTab Component - Place this inside AdminDashboard.js
// This replaces the existing StudentsTab function

function StudentsTab({ students, onRefresh, user }) {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [loading, setLoading] = useState(false)
  const [showAddStudent, setShowAddStudent] = useState(false)
  const [editingStudent, setEditingStudent] = useState(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null)
  
  // Form state for adding/editing students
  const [studentForm, setStudentForm] = useState({
    name: '',
    grade: '',
    student_code: '',
    parent_password: '',
    is_active: true
  })

  const filteredStudents = students.filter(student => {
    const matchesSearch = student.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         student.studentCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         student.student_code?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFilter = filterStatus === 'all' ||
                         (filterStatus === 'with_password' && student.parentPasswordSet) ||
                         (filterStatus === 'without_password' && !student.parentPasswordSet) ||
                         (filterStatus === 'active' && student.is_active !== false) ||
                         (filterStatus === 'inactive' && student.is_active === false)
    return matchesSearch && matchesFilter
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

  const handleAddStudent = async (e) => {
    e.preventDefault()
    
    if (!studentForm.name.trim()) {
      alert('Student name is required')
      return
    }

    setLoading(true)
    
    try {
      const response = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...studentForm,
          school_id: user.school_id || 2,
          name: studentForm.name.trim()
        })
      })

      const result = await response.json()
      
      if (result.success) {
        setShowAddStudent(false)
        resetForm()
        onRefresh()
        alert('Student added successfully!')
      } else {
        alert('Failed to add student: ' + (result.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('Add student error:', error)
      alert('Failed to add student: Network error')
    } finally {
      setLoading(false)
    }
  }

  const handleEditStudent = async (e) => {
    e.preventDefault()
    
    if (!editingStudent || !studentForm.name.trim()) {
      alert('Student name is required')
      return
    }

    setLoading(true)
    
    try {
      const updateData = {}
      
      // Only include fields that have been changed
      if (studentForm.name !== editingStudent.name) {
        updateData.name = studentForm.name.trim()
      }
      if (studentForm.grade !== (editingStudent.grade || '')) {
        updateData.grade = studentForm.grade
      }
      if (studentForm.student_code !== (editingStudent.studentCode || editingStudent.student_code || '')) {
        updateData.student_code = studentForm.student_code
      }
      if (studentForm.parent_password) {
        updateData.parent_password = studentForm.parent_password
      }
      if (studentForm.is_active !== (editingStudent.is_active !== false)) {
        updateData.is_active = studentForm.is_active
      }

      if (Object.keys(updateData).length === 0) {
        alert('No changes to save')
        setEditingStudent(null)
        resetForm()
        return
      }

      const response = await fetch(`/api/students?student_id=${editingStudent.id || editingStudent.student_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      })

      const result = await response.json()
      
      if (result.success) {
        setEditingStudent(null)
        resetForm()
        onRefresh()
        alert('Student updated successfully!')
      } else {
        alert('Failed to update student: ' + (result.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('Update student error:', error)
      alert('Failed to update student: Network error')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteStudent = async (studentId, studentName, forceDelete = false) => {
    setLoading(true)
    
    try {
      const response = await fetch(`/api/students?student_id=${studentId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force_delete: forceDelete })
      })

      const result = await response.json()
      
      if (result.success) {
        setShowDeleteConfirm(null)
        onRefresh()
        alert(`${result.message || 'Student deleted successfully'}`)
      } else {
        // If soft delete happened, ask if they want to force delete
        if (result.action === 'soft_delete' && result.note) {
          const confirmForce = confirm(`${result.message}\n\n${result.note}\n\nDo you want to permanently delete all data?`)
          if (confirmForce) {
            await handleDeleteStudent(studentId, studentName, true)
          } else {
            setShowDeleteConfirm(null)
            onRefresh() // Refresh to show the deactivated status
          }
        } else {
          alert('Failed to delete student: ' + (result.error || 'Unknown error'))
        }
      }
    } catch (error) {
      console.error('Delete student error:', error)
      alert('Failed to delete student: Network error')
    } finally {
      setLoading(false)
    }
  }

  const openEditModal = (student) => {
    setEditingStudent(student)
    setStudentForm({
      name: student.name || '',
      grade: student.grade || '',
      student_code: student.studentCode || student.student_code || '',
      parent_password: '', // Don't pre-fill password for security
      is_active: student.is_active !== false
    })
  }

  const closeModals = () => {
    setShowAddStudent(false)
    setEditingStudent(null)
    setShowDeleteConfirm(null)
    resetForm()
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Student Management</h3>
        <div className="flex flex-col sm:flex-row gap-2">
          <button 
            onClick={onRefresh} 
            disabled={loading}
            className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 disabled:opacity-50 text-sm"
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>
          <button 
            onClick={() => setShowAddStudent(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm"
          >
            Add Student
          </button>
        </div>
      </div>

      {/* Search and Filter Controls */}
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

      {/* Students Summary */}
      <div className="mb-6 p-3 sm:p-4 bg-gray-50 rounded-lg">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-xl sm:text-2xl font-bold text-gray-900">{students.length}</div>
            <div className="text-xs sm:text-sm text-gray-600">Total Students</div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-bold text-blue-600">{filteredStudents.length}</div>
            <div className="text-xs sm:text-sm text-blue-600">Showing</div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-bold text-green-600">
              {students.filter(s => s.parentPasswordSet || s.parent_password_set).length}
            </div>
            <div className="text-xs sm:text-sm text-green-600">With Parent Access</div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-bold text-red-600">
              {students.filter(s => s.is_active === false).length}
            </div>
            <div className="text-xs sm:text-sm text-red-600">Inactive</div>
          </div>
        </div>
      </div>

      {/* Mobile-friendly table wrapper */}
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
                    <div className="text-xs text-gray-500 sm:hidden">
                      Code: {student.studentCode || student.student_code || 'Not set'}
                    </div>
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
                        onClick={() => openEditModal(student)}
                        className="text-blue-600 hover:text-blue-900 text-xs sm:text-sm"
                        disabled={loading}
                      >
                        Edit
                      </button>
                      <button 
                        onClick={() => setShowDeleteConfirm({
                          id: student.id || student.student_id,
                          name: student.name
                        })}
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
                    {searchTerm || filterStatus !== 'all' ? 
                      'No students match your search criteria' : 
                      'No students found. Click "Add Student" to get started.'
                    }
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Student Modal */}
      {showAddStudent && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-md mx-4">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Add New Student</h4>
            <form onSubmit={handleAddStudent} className="space-y-4">
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
                  placeholder="Set parent portal password"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Leave empty to set up later
                </p>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={studentForm.is_active}
                  onChange={(e) => setStudentForm({...studentForm, is_active: e.target.checked})}
                  className="mr-2"
                />
                <label htmlFor="isActive" className="text-sm text-gray-700">
                  Active student
                </label>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Adding...' : 'Add Student'}
                </button>
                <button
                  type="button"
                  onClick={closeModals}
                  disabled={loading}
                  className="w-full bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Student Modal */}
      {editingStudent && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-md mx-4">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">
              Edit Student: {editingStudent.name}
            </h4>
            <form onSubmit={handleEditStudent} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Student Name *
                </label>
                <input
                  type="text"
                  value={studentForm.name}
                  onChange={(e) => setStudentForm({...studentForm, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New Parent Password
                </label>
                <input
                  type="password"
                  value={studentForm.parent_password}
                  onChange={(e) => setStudentForm({...studentForm, parent_password: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Leave empty to keep current"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="editIsActive"
                  checked={studentForm.is_active}
                  onChange={(e) => setStudentForm({...studentForm, is_active: e.target.checked})}
                  className="mr-2"
                />
                <label htmlFor="editIsActive" className="text-sm text-gray-700">
                  Active student
                </label>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  type="button"
                  onClick={closeModals}
                  disabled={loading}
                  className="w-full bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-md mx-4">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Confirm Delete</h4>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete <strong>{showDeleteConfirm.name}</strong>?
              <br /><br />
              <span className="text-sm">
                This action may deactivate the student if they have attendance records. 
                The system will prompt for permanent deletion if needed.
              </span>
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => handleDeleteStudent(showDeleteConfirm.id, showDeleteConfirm.name)}
                disabled={loading}
                className="w-full bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                {loading ? 'Deleting...' : 'Delete Student'}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(null)}
                disabled={loading}
                className="w-full bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// UploadStudentsTab Component

function UploadStudentsTab({ user, onUploadComplete }) {
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [results, setResults] = useState(null)

  // Function to generate and download CSV template
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
      
      {/* CSV Template Download Section */}
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

      {/* File Upload Form */}
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

      {/* Upload Results */}
      {results && (
        <div className={`mt-6 p-4 rounded-lg ${results.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
          <h4 className={`font-medium mb-2 ${results.success ? 'text-green-900' : 'text-red-900'}`}>
            Upload Results
          </h4>
          {results.success ? (
            <div className="text-sm text-green-800">
              <p className="font-medium">Upload completed successfully!</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center mt-3">
                <div className="bg-green-100 p-2 rounded">
                  <div className="text-xl font-bold">{results.summary?.total || 0}</div>
                  <div className="text-xs">Total Processed</div>
                </div>
                <div className="bg-blue-100 p-2 rounded">
                  <div className="text-xl font-bold text-blue-600">{results.summary?.added || 0}</div>
                  <div className="text-xs">New Students</div>
                </div>
                <div className="bg-yellow-100 p-2 rounded">
                  <div className="text-xl font-bold text-yellow-600">{results.summary?.updated || 0}</div>
                  <div className="text-xs">Updated</div>
                </div>
                <div className="bg-red-100 p-2 rounded">
                  <div className="text-xl font-bold text-red-600">{results.summary?.errors || 0}</div>
                  <div className="text-xs">Errors</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-sm text-red-800">
              <p className="font-medium">Upload failed</p>
              <p>{results.error}</p>
            </div>
          )}
        </div>
      )}

      {/* Sample Data Preview */}
      <div className="mt-6 bg-gray-50 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-2">Sample CSV Format</h4>
        <div className="text-xs font-mono bg-white p-3 rounded border overflow-x-auto">
          <div className="text-green-600">name,grade,student_code,parent_password</div>
          <div>John Smith,10th,JS001,parent123</div>
          <div>Jane Doe,9th,JD002,secure456</div>
          <div>Mike Johnson,11th,MJ003,password789</div>
        </div>
      </div>
    </div>
  )
}

function AttendanceTabMobileResponsive({ attendance, isCompanyAdmin, user }) {
  const [dateRange, setDateRange] = useState({
    from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0]
  })
  const [attendanceData, setAttendanceData] = useState(attendance)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    setAttendanceData(attendance)
  }, [attendance])

  const refreshAttendance = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const params = new URLSearchParams({
        type: 'real-time'
      })
      
      // Always add date range for better filtering
      if (dateRange.from) {
        params.append('date_from', dateRange.from)
      }
      if (dateRange.to) {
        params.append('date_to', dateRange.to)
      }
      
      // Add school_id for school admins only
      if (!isCompanyAdmin && (user?.school_id || user?.SchoolID)) {
        params.append('school_id', user.school_id || user.SchoolID)
      }

      console.log('Fetching attendance with params:', params.toString())

      const response = await fetch(`/api/analytics?${params}`)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      
      console.log('API Response:', data)
      
      if (data.success) {
        if (data.current_activity && Array.isArray(data.current_activity)) {
          const formattedData = data.current_activity.map(record => ({
            id: record.attendance_id,
            studentName: record.student_name,
            student_name: record.student_name,
            status: record.status,
            time: record.scan_time,
            scan_time: record.scan_time,
            created_at: record.created_at,
            school_name: record.school_name,
            school_id: record.school_id
          }))
          
          // Sort by scan_time descending (most recent first)
          formattedData.sort((a, b) => {
            const timeA = new Date(a.scan_time || a.created_at)
            const timeB = new Date(b.scan_time || b.created_at)
            return timeB - timeA
          })
          
          setAttendanceData(formattedData)
        } else {
          console.warn('No current_activity array in response')
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

  // Auto-refresh when date range changes
  useEffect(() => {
    if (dateRange.from && dateRange.to) {
      refreshAttendance()
    }
  }, [dateRange.from, dateRange.to])

  // Helper function to format time consistently
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

  // Helper function to format date consistently
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
        <h3 className="text-lg font-semibold text-gray-900">
          {isCompanyAdmin ? 'Network Attendance Records' : 'Recent Attendance'}
        </h3>
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
            {loading ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Loading...
              </span>
            ) : (
              'Refresh'
            )}
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
          Error: {error}
        </div>
      )}

      {/* Debug info - remove in production */}
      <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm">
        <p><strong>Debug Info:</strong></p>
        <p>User ID: {(user?.school_id || user?.SchoolID) || 'Not found'}</p>
        <p>Is Company Admin: {isCompanyAdmin ? 'Yes' : 'No'}</p>
        <p>Date Range: {dateRange.from} to {dateRange.to}</p>
        <p>Records Found: {attendanceData?.length || 0}</p>
      </div>

      {/* Attendance Summary */}
      {attendanceData && attendanceData.length > 0 && (
        <div className="mb-6 p-3 sm:p-4 bg-gray-50 rounded-lg">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-xl sm:text-2xl font-bold text-gray-900">{attendanceData.length}</div>
              <div className="text-xs sm:text-sm text-gray-600">Total Records</div>
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-bold text-green-600">
                {attendanceData.filter(r => r.status === 'IN').length}
              </div>
              <div className="text-xs sm:text-sm text-green-600">Check Ins</div>
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-bold text-blue-600">
                {attendanceData.filter(r => r.status === 'OUT').length}
              </div>
              <div className="text-xs sm:text-sm text-blue-600">Check Outs</div>
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-bold text-purple-600">
                {new Set(attendanceData.map(r => r.studentName || r.student_name)).size}
              </div>
              <div className="text-xs sm:text-sm text-purple-600">Unique Students</div>
            </div>
          </div>
        </div>
      )}

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
                {attendanceData && attendanceData.length > 0 ? (
                  attendanceData.slice(0, 50).map((record, index) => (
                    <tr key={record.id || index} className="hover:bg-gray-50 transition-colors">
                      <td className="px-3 sm:px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          {record.studentName || record.student_name || 'Unknown Student'}
                        </div>
                        <div className="text-xs text-gray-500 sm:hidden">
                          {formatTime(record.scan_time || record.time || record.created_at)}
                        </div>
                      </td>
                      <td className="px-3 sm:px-6 py-4">
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                          record.status === 'IN' ? 'bg-green-100 text-green-800' : 
                          record.status === 'OUT' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {record.status === 'IN' ? 'Check In' : 
                           record.status === 'OUT' ? 'Check Out' : 
                           record.status || 'Unknown'}
                        </span>
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
                    <td colSpan={isCompanyAdmin ? "5" : "4"} className="px-6 py-12 text-center">
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
                            <p className="font-medium">No attendance records found</p>
                            <p className="text-sm mt-1">
                              {dateRange.from === dateRange.to ? 
                                `No records for ${formatDate(dateRange.from)}` :
                                `No records between ${formatDate(dateRange.from)} and ${formatDate(dateRange.to)}`
                              }
                            </p>
                            <p className="text-xs mt-2 text-gray-400">
                              Try expanding the date range or check if attendance data exists in your system.
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
      </div>

      {/* Records Info */}
      {attendanceData && attendanceData.length > 50 && (
        <div className="mt-4 text-center text-sm text-gray-500">
          Showing first 50 of {attendanceData.length} records. 
          <span className="ml-1">Use date filters to narrow results.</span>
        </div>
      )}
    </div>
  )
}
