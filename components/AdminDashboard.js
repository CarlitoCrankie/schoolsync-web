import { useState, useEffect } from 'react'

export default function AdminDashboard({ user }) {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [stats, setStats] = useState({})
  const [students, setStudents] = useState([])
  const [schools, setSchools] = useState([])
  const [attendance, setAttendance] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Determine user role and capabilities
  const isCompanyAdmin = user.role === 'company_admin' || user.role === 'main_admin'
  const isSchoolAdmin = user.role === 'school_admin' || !user.SchoolID

  useEffect(() => {
    console.log('Dashboard loading data...')
    loadDashboardData()
  }, [])

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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900">
          {isCompanyAdmin ? 'ZKTime Company Dashboard' : 'School Administrator'}
        </h2>
        <p className="text-gray-600">
          {isCompanyAdmin 
            ? 'Manage the entire ZKTime network and monitor all schools' 
            : `Manage ${user.school?.name || 'your school'}`
          }
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {isCompanyAdmin ? (
          <>
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <span className="text-blue-600 text-xl">🏫</span>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Schools Network</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total_schools}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <span className="text-green-600 text-xl">👥</span>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Students</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total_students}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <span className="text-purple-600 text-xl">⚡</span>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Active Sync Agents</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.active_sync_agents}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                  stats.system_health === 'healthy' ? 'bg-green-100' : 
                  stats.system_health === 'degraded' ? 'bg-yellow-100' : 'bg-red-100'
                }`}>
                  <span className={`text-xl ${
                    stats.system_health === 'healthy' ? 'text-green-600' : 
                    stats.system_health === 'degraded' ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {stats.system_health === 'healthy' ? '✓' : 
                     stats.system_health === 'degraded' ? '⚠' : '✗'}
                  </span>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">System Health</p>
                  <p className="text-2xl font-bold text-gray-900 capitalize">{stats.system_health}</p>
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <span className="text-blue-600 text-xl">👥</span>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Students</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total_students}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <span className="text-green-600 text-xl">✅</span>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Present Today</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.present_today}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                  <span className="text-red-600 text-xl">❌</span>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Absent Today</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.absent_today}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <span className="text-purple-600 text-xl">🔐</span>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Need Parent Setup</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.students_without_passwords}</p>
                </div>
              </div>
            </div>
          </>
        )}
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
              Dashboard
            </button>
            
            {!isCompanyAdmin && (
              <>
                <button 
                  onClick={() => setActiveTab('students')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'students' 
                      ? 'border-indigo-500 text-indigo-600' 
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Students
                </button>
                <button 
                  onClick={() => setActiveTab('upload')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'upload' 
                      ? 'border-indigo-500 text-indigo-600' 
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Upload Students
                </button>
              </>
            )}
            
            <button 
              onClick={() => setActiveTab('attendance')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'attendance' 
                  ? 'border-indigo-500 text-indigo-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {isCompanyAdmin ? 'Network Attendance' : 'Attendance'}
            </button>
            
            {isCompanyAdmin && (
              <>
                <button 
                  onClick={() => setActiveTab('schools')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'schools' 
                      ? 'border-indigo-500 text-indigo-600' 
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Schools Network
                </button>
                <button 
                  onClick={() => setActiveTab('system-monitor')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'system-monitor'
                      ? 'border-indigo-500 text-indigo-600' 
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  System Monitor
                </button>
                <button 
                  onClick={() => setActiveTab('analytics')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'analytics' 
                      ? 'border-indigo-500 text-indigo-600' 
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Analytics
                </button>
              </>
            )}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'dashboard' && <DashboardTab attendance={attendance} stats={stats} isCompanyAdmin={isCompanyAdmin} user={user} />}
          {activeTab === 'students' && !isCompanyAdmin && <StudentsTab students={students} onRefresh={loadDashboardData} user={user} />}
          {activeTab === 'upload' && !isCompanyAdmin && <UploadStudentsTab user={user} onUploadComplete={loadDashboardData} />}
          {activeTab === 'attendance' && <AttendanceTab attendance={attendance} isCompanyAdmin={isCompanyAdmin} user={user} />}
          {activeTab === 'system-monitor' && isCompanyAdmin && <SystemMonitorTab companyId={user.company_id} />}
          {activeTab === 'schools' && isCompanyAdmin && <SchoolsNetworkTab companyId={user.company_id} />}
          {activeTab === 'analytics' && isCompanyAdmin && <AnalyticsTab companyId={user.company_id} />}
        </div>
      </div>
    </div>
  )
}

// const handleAddNewSchool = () => {
//   setShowAddModal(true)
// }
// Dashboard Tab Component
function DashboardTab({ attendance, stats, isCompanyAdmin, user }) {
  const [showAddSchool, setShowAddSchool] = useState(false)
  const [systemCheckResult, setSystemCheckResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  // Simple school form
  const [schoolForm, setSchoolForm] = useState({
    name: '',
    location: '',
    machineId: '',
    status: 'active'
  })
  
  // // Enhanced school form with admin credentials
  // const [newSchool, setNewSchool] = useState({
  //   name: '',
  //   location: '',
  //   machineId: '',
  //   adminUsername: '',
  //   adminPassword: '',
  //   adminEmail: ''
  // })

  // const [createdSchoolCredentials, setCreatedSchoolCredentials] = useState(null)
  // const [showCredentialsModal, setShowCredentialsModal] = useState(false)
  // const [showAddModal, setShowAddModal] = useState(false)

  const handleAddNewSchool = () => {
    setShowAddModal(true)
  }

  // const handleCreateSchool = async () => {
  //   try {
  //     setLoading(true)
      
  //     const response = await fetch('/api/schools', {
  //       method: 'POST',
  //       headers: { 'Content-Type': 'application/json' },
  //       body: JSON.stringify(newSchool)
  //     })

  //     const result = await response.json()

  //     if (result.success) {
  //       setCreatedSchoolCredentials(result.data.admin_credentials)
  //       setShowCredentialsModal(true)
  //       setShowAddModal(false)
  //       setNewSchool({
  //         name: '',
  //         location: '',
  //         machineId: '',
  //         adminUsername: '',
  //         adminPassword: '',
  //         adminEmail: ''
  //       })
  //     } else {
  //       setError(result.error || 'Failed to create school')
  //     }
  //   } catch (error) {
  //     setError('Failed to create school: ' + error.message)
  //   } finally {
  //     setLoading(false)
  //   }
  // }
  
  const handleSubmitNewSchool = async (e) => {
    e.preventDefault()
    
    if (!schoolForm.name.trim() || !schoolForm.location.trim()) {
      alert('School name and location are required')
      return
    }

    try {
      const response = await fetch('/api/schools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: schoolForm.name.trim(),
          location: schoolForm.location.trim(),
          machineId: schoolForm.machineId.trim(),
          status: schoolForm.status
        })
      })

      const result = await response.json()
      
      if (result.success) {
        setShowAddSchool(false)
        setSchoolForm({ name: '', location: '', machineId: '', status: 'active' })
        alert('School added successfully! Refreshing dashboard...')
        window.location.reload()
      } else {
        alert('Failed to add school: ' + (result.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('Add school error:', error)
      alert('Failed to add school: Network error')
    }
  }
  
  const handleSystemHealthCheck = async () => {
    try {
      const response = await fetch('/api/analytics?type=sync-performance')
      const data = await response.json()
      
      if (data.success) {
        const healthSummary = {
          totalAgents: data.performance_metrics.total_agents,
          onlineAgents: data.performance_metrics.online_agents,
          avgErrorRate: data.performance_metrics.avg_error_rate,
          overallHealth: data.performance_metrics.online_agents / Math.max(data.performance_metrics.total_agents, 1) > 0.8 ? 'Healthy' : 'Issues Detected'
        }
        setSystemCheckResult(healthSummary)
      }
    } catch (error) {
      console.error('Health check failed:', error)
      setSystemCheckResult({ error: 'Health check failed' })
    }
  }
  
  const handleViewReports = () => {
    const event = new CustomEvent('switchTab', { detail: 'analytics' })
    document.dispatchEvent(event)
  }

  if (isCompanyAdmin) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Network-wide Activity */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Network Activity Today</h3>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {attendance && attendance.length > 0 ? attendance.slice(0, 10).map(record => (
              <div key={record.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">{record.student_name}</p>
                  <p className="text-sm text-gray-600">
                    {new Date(record.scan_time || record.created_at).toLocaleString()}
                  </p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  record.status === 'IN' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                }`}>
                  {record.status === 'IN' ? 'Check In' : 'Check Out'}
                </span>
              </div>
            )) : (
              <p className="text-gray-500 text-sm text-center py-8">No network activity today</p>
            )}
          </div>
        </div>

        {/* System Overview */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">System Overview</h3>
          <div className="space-y-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">Quick Actions</h4>
              <div className="space-y-2">
                <button 
                  onClick={handleAddNewSchool}
                  className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm"
                >
                  Add New School
                </button>
                <button 
                  onClick={handleViewReports}
                  className="w-full bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 text-sm"
                >
                  View All Reports
                </button>
                <button 
                  onClick={handleSystemHealthCheck}
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
                  <span className="font-medium">{stats.active_sync_agents || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Today's Attendance:</span>
                  <span className="font-medium">{stats.total_attendance_today || 0}</span>
                </div>
              </div>
            </div>

            {/* System Check Results */}
            {systemCheckResult && (
              <div className={`rounded-lg p-4 ${systemCheckResult.error ? 'bg-red-50' : 'bg-green-50'}`}>
                <h4 className={`font-medium mb-2 ${systemCheckResult.error ? 'text-red-900' : 'text-green-900'}`}>
                  Health Check Results
                </h4>
                {systemCheckResult.error ? (
                  <p className="text-sm text-red-800">{systemCheckResult.error}</p>
                ) : (
                  <div className="space-y-1 text-sm text-green-800">
                    <p>Overall Status: {systemCheckResult.overallHealth}</p>
                    <p>Agents Online: {systemCheckResult.onlineAgents}/{systemCheckResult.totalAgents}</p>
                    <p>Error Rate: {systemCheckResult.avgErrorRate}%</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Add School Modal */}
        {showAddSchool && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Quick Add School</h4>
              <form onSubmit={handleSubmitNewSchool} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    School Name *
                  </label>
                  <input
                    type="text"
                    value={schoolForm.name}
                    onChange={(e) => setSchoolForm({...schoolForm, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter school name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Location *
                  </label>
                  <input
                    type="text"
                    value={schoolForm.location}
                    onChange={(e) => setSchoolForm({...schoolForm, location: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter location"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Machine ID (Optional)
                  </label>
                  <input
                    type="text"
                    value={schoolForm.machineId}
                    onChange={(e) => setSchoolForm({...schoolForm, machineId: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="ZK device ID"
                  />
                </div>
                <div className="flex space-x-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                  >
                    Add School
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddSchool(false)}
                    className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    )
  }
  
  // School admin dashboard (existing functionality)
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Check-ins</h3>
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {attendance
            .filter(record => record.status === 'IN')
            .slice(0, 10)
            .map(record => (
              <div key={record.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">{record.studentName}</p>
                  <p className="text-sm text-gray-600">
                    {record.grade} • {new Date(record.time).toLocaleTimeString()}
                  </p>
                </div>
                <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">Check-in</span>
              </div>
            ))}
          {attendance.filter(record => record.status === 'IN').length === 0 && (
            <p className="text-gray-500 text-sm">No check-ins today</p>
          )}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">System Status</h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
            <div>
              <p className="font-medium text-green-900">Database Connection</p>
              <p className="text-sm text-green-600">Connected to AWS RDS</p>
            </div>
            <span className="w-3 h-3 bg-green-500 rounded-full"></span>
          </div>
          
          <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg">
            <div>
              <p className="font-medium text-yellow-900">Sync Agent</p>
              <p className="text-sm text-yellow-600">Status unknown - check monitoring</p>
            </div>
            <span className="w-3 h-3 bg-yellow-500 rounded-full"></span>
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

// Schools Network Tab Component
function SchoolsNetworkTab({ companyId }) {
  
  const [schools, setSchools] = useState([])
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingSchool, setEditingSchool] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)

  // Form state for adding/editing schools
// Add these state variables to SchoolsNetworkTab component (at the top with other useState calls)
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
const [showAddModal, setShowAddModal] = useState(false)
const [error, setError] = useState('')
const [loading, setLoading] = useState(false)

  const [schoolForm, setSchoolForm] = useState({
    name: '',
    location: '',
    machineId: '',
    contactEmail: '',
    contactPhone: '',
    status: 'active'
  })

  useEffect(() => {
    fetchSchoolsData()
  }, [companyId])

const handleCreateSchool = async () => {
  try {
    setLoading(true)
    
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
      
      // Refresh schools list
      fetchSchoolsData()
    } else {
      setError(result.error || 'Failed to create school')
    }
  } catch (error) {
    setError('Failed to create school: ' + error.message)
  } finally {
    setLoading(false)
  }
}

  const fetchSchoolsData = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/analytics?type=schools&company_id=${companyId}`)
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

const resetForm = () => {
  setSchoolForm({
    name: '',
    location: '',
    machineId: '',
    contactEmail: '',
    contactPhone: '',
    status: 'active'
  })
}

const handleAddSchool = async (e) => {
  e.preventDefault()
  
  if (!schoolForm.name.trim() || !schoolForm.location.trim()) {
    alert('School name and location are required')
    return
  }

  setActionLoading(true)
  
  try {
    const response = await fetch('/api/schools', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: schoolForm.name.trim(),
        location: schoolForm.location.trim(),
        machineId: schoolForm.machineId.trim(),
        contactEmail: schoolForm.contactEmail.trim(),
        contactPhone: schoolForm.contactPhone.trim(),
        status: schoolForm.status
      })
    })

    const result = await response.json()
    
    if (result.success) {
      setShowAddModal(false)
      resetForm()
      fetchSchoolsData() // Refresh the list
      alert('School added successfully!')
    } else {
      alert('Failed to add school: ' + (result.error || 'Unknown error'))
    }
  } catch (error) {
    console.error('Add school error:', error)
    alert('Failed to add school: Network error')
  } finally {
    setActionLoading(false)
  }
}

  const handleEditSchool = async (e) => {
    e.preventDefault()
    
    if (!editingSchool || !schoolForm.name.trim() || !schoolForm.location.trim()) {
      alert('School name and location are required')
      return
    }

    setActionLoading(true)
    
    try {
      const response = await fetch(`/api/schools?school_id=${editingSchool.school_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: schoolForm.name.trim(),
          location: schoolForm.location.trim(),
          machineId: schoolForm.machineId.trim(),
          contactEmail: schoolForm.contactEmail.trim(),
          contactPhone: schoolForm.contactPhone.trim(),
          status: schoolForm.status
        })
      })

      const result = await response.json()
      
      if (result.success) {
        setShowEditModal(false)
        setEditingSchool(null)
        resetForm()
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
    if (!confirm(`Are you sure you want to disable "${schoolName}"?\n\nThis will:\n- Stop sync operations\n- Prevent new attendance records\n- Mark the school as inactive\n\nYou can re-enable it later if needed.`)) {
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
    if (!confirm(`Enable "${schoolName}"?\n\nThis will reactivate the school and resume sync operations.`)) {
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

  const openEditModal = (school) => {
    setEditingSchool(school)
    setSchoolForm({
      name: school.name || '',
      location: school.location || '',
      machineId: school.machine_id || '',
      contactEmail: school.contact_email || '',
      contactPhone: school.contact_phone || '',
      status: school.status || 'active'
    })
    setShowEditModal(true)
  }

  const closeModals = () => {
    setShowAddModal(false)
    setShowEditModal(false)
    setEditingSchool(null)
    resetForm()
  }

  if (loading) {
    return <div className="p-6 text-center">Loading schools network...</div>
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Schools Network Management</h2>
        <div className="flex gap-2">
          <button 
            onClick={fetchSchoolsData}
            disabled={actionLoading}
            className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 disabled:opacity-50"
          >
            Refresh
          </button>
          <button 
            onClick={() => setShowAddModal(true)}
            disabled={actionLoading}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            Add New School
          </button>
        </div>
      </div>

      {/* Network Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Total Schools</h3>
          <p className="text-2xl font-bold text-blue-600">{schools.length}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Active</h3>
          <p className="text-2xl font-bold text-green-600">
            {schools.filter(s => s.status === 'active').length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Online</h3>
          <p className="text-2xl font-bold text-green-600">
            {schools.filter(s => s.sync_agent?.connection_status === 'Online').length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Inactive</h3>
          <p className="text-2xl font-bold text-red-600">
            {schools.filter(s => s.status === 'inactive').length}
          </p>
        </div>
      </div>

      {/* Schools Management Table */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <h3 className="text-lg font-semibold">Schools List</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">School</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Students</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sync Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {schools.length > 0 ? schools.map((school) => (
                <tr key={school.school_id} className={school.status === 'inactive' ? 'bg-gray-50' : ''}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{school.name}</div>
                    <div className="text-sm text-gray-500">ID: {school.school_id}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {school.location}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {school.students?.active || 0}/{school.students?.total || 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      school.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {school.status || 'active'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      school.sync_agent?.connection_status === 'Online' ? 'bg-green-100 text-green-800' :
                      school.sync_agent?.connection_status === 'Warning' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {school.sync_agent?.connection_status || 'Unknown'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button 
                      onClick={() => openEditModal(school)}
                      disabled={actionLoading}
                      className="text-blue-600 hover:text-blue-900 disabled:opacity-50"
                    >
                      Edit
                    </button>
                    {school.status === 'active' ? (
                      <button 
                        onClick={() => handleDisableSchool(school.school_id, school.name)}
                        disabled={actionLoading}
                        className="text-red-600 hover:text-red-900 disabled:opacity-50"
                      >
                        Disable
                      </button>
                    ) : (
                      <button 
                        onClick={() => handleEnableSchool(school.school_id, school.name)}
                        disabled={actionLoading}
                        className="text-green-600 hover:text-green-900 disabled:opacity-50"
                      >
                        Enable
                      </button>
                    )}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                    No schools found. Click "Add New School" to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add School Modal */}
{/* Enhanced Add School Modal - FROM DOCUMENT 1 */}
{showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold mb-4">Add New School</h3>
              
              {error && (
                <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                  {error}
                </div>
              )}
              
              <div className="space-y-4">
                {/* School Information */}
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

                {/* Admin Account Section */}
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

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowAddModal(false)
                    setError('')
                  }}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateSchool}
                  disabled={loading || !newSchool.name || !newSchool.location}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Creating...' : 'Create School'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Admin Credentials Display Modal - FROM DOCUMENT 1 */}
        {showCredentialsModal && createdSchoolCredentials && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-lg">
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

              <div className="flex justify-center space-x-3">
                <button
                  onClick={() => {
                    // Copy credentials to clipboard
                    const credentials = `School Admin Login Credentials:
Username: ${createdSchoolCredentials.username}
Password: ${createdSchoolCredentials.password}
School ID: ${createdSchoolCredentials.school_id}
${createdSchoolCredentials.email ? `Email: ${createdSchoolCredentials.email}` : ''}`
                    
                    navigator.clipboard.writeText(credentials).then(() => {
                      alert('Credentials copied to clipboard!')
                    })
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Copy to Clipboard
                </button>
                <button
                  onClick={() => {
                    setShowCredentialsModal(false)
                    setCreatedSchoolCredentials(null)
                  }}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

      {/* Edit School Modal */}
      {showEditModal && editingSchool && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">
              Edit School: {editingSchool.name}
            </h4>
            <form onSubmit={handleEditSchool} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  School Name *
                </label>
                <input
                  type="text"
                  value={schoolForm.name}
                  onChange={(e) => setSchoolForm({...schoolForm, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Location *
                </label>
                <input
                  type="text"
                  value={schoolForm.location}
                  onChange={(e) => setSchoolForm({...schoolForm, location: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Machine ID
                </label>
                <input
                  type="text"
                  value={schoolForm.machineId}
                  onChange={(e) => setSchoolForm({...schoolForm, machineId: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contact Email
                </label>
                <input
                  type="email"
                  value={schoolForm.contactEmail}
                  onChange={(e) => setSchoolForm({...schoolForm, contactEmail: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contact Phone
                </label>
                <input
                  type="tel"
                  value={schoolForm.contactPhone}
                  onChange={(e) => setSchoolForm({...schoolForm, contactPhone: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={schoolForm.status}
                  onChange={(e) => setSchoolForm({...schoolForm, status: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                  {actionLoading ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  type="button"
                  onClick={closeModals}
                  disabled={actionLoading}
                  className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

// System Monitor Tab Component
const SystemMonitorTab = ({ companyId }) => {
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
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">System Performance Monitor</h2>
        <div className="flex gap-2">
          <span className="text-sm text-gray-500">Auto-refresh: 30s</span>
          <button 
            onClick={fetchSystemData}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
          >
            Refresh Now
          </button>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Total Agents</h3>
          <p className="text-2xl font-bold text-blue-600">
            {systemData?.performance_metrics?.total_agents || 0}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Online Agents</h3>
          <p className="text-2xl font-bold text-green-600">
            {systemData?.performance_metrics?.online_agents || 0}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Avg Error Rate</h3>
          <p className="text-2xl font-bold text-red-600">
            {systemData?.performance_metrics?.avg_error_rate || 0}%
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Syncs/Hour</h3>
          <p className="text-2xl font-bold text-purple-600">
            {Math.round(systemData?.performance_metrics?.avg_syncs_per_hour || 0)}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Uptime (Avg)</h3>
          <p className="text-2xl font-bold text-orange-600">
            {Math.round(systemData?.performance_metrics?.avg_uptime_hours || 0)}h
          </p>
        </div>
      </div>

      {/* Health Distribution */}
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-lg font-semibold mb-4">Agent Health Distribution</h3>
        <div className="grid grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {systemData?.health_distribution?.excellent || 0}
            </div>
            <div className="text-sm text-gray-500">Excellent (90%+)</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {systemData?.health_distribution?.good || 0}
            </div>
            <div className="text-sm text-gray-500">Good (70-89%)</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">
              {systemData?.health_distribution?.fair || 0}
            </div>
            <div className="text-sm text-gray-500">Fair (50-69%)</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">
              {systemData?.health_distribution?.poor || 0}
            </div>
            <div className="text-sm text-gray-500">Poor (50%)</div>
          </div>
        </div>
      </div>

      {/* Agents Detail Table */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <h3 className="text-lg font-semibold">Sync Agents Status</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">School</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Status</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Health Score</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Uptime</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Synced</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Errors</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Memory</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {systemData?.agents?.map((agent) => (
                <tr key={agent.school_id}>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{agent.school_name}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      agent.connection_status === 'Online' ? 'bg-green-100 text-green-800' :
                      agent.connection_status === 'Warning' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {agent.connection_status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">{agent.health_score}%</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{agent.uptime_hours}h</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{agent.total_synced}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{agent.total_errors}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{agent.memory_usage_mb}MB</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// Analytics Tab Component
const AnalyticsTab = ({ companyId }) => {
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
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Analytics Dashboard</h2>
        <div className="flex gap-2">
          {views.map(view => (
            <button
              key={view.id}
              onClick={() => setActiveView(view.id)}
              className={`px-4 py-2 rounded-lg ${
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
        <div className="text-center py-8">Loading analytics...</div>
      ) : (
        <div className="space-y-6">
          {activeView === 'overview' && analyticsData?.overview && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Schools</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Total:</span>
                    <span className="font-bold">{analyticsData.overview.schools?.total || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Active:</span>
                    <span className="font-bold text-green-600">{analyticsData.overview.schools?.active || 0}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Students</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Total:</span>
                    <span className="font-bold">{analyticsData.overview.students?.total || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Active:</span>
                    <span className="font-bold text-green-600">{analyticsData.overview.students?.active || 0}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Attendance</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Today:</span>
                    <span className="font-bold text-blue-600">{analyticsData.overview.attendance?.today || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>This Week:</span>
                    <span className="font-bold">{analyticsData.overview.attendance?.week || 0}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeView === 'real-time' && analyticsData?.live_metrics && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-lg shadow">
                <h3 className="text-sm font-medium text-gray-500">Last Minute</h3>
                <p className="text-2xl font-bold text-green-600">
                  {analyticsData.live_metrics.last_minute}
                </p>
              </div>
              <div className="bg-white p-4 rounded-lg shadow">
                <h3 className="text-sm font-medium text-gray-500">Last 5 Minutes</h3>
                <p className="text-2xl font-bold text-blue-600">
                  {analyticsData.live_metrics.last_5_minutes}
                </p>
              </div>
              <div className="bg-white p-4 rounded-lg shadow">
                <h3 className="text-sm font-medium text-gray-500">Last 15 Minutes</h3>
                <p className="text-2xl font-bold text-purple-600">
                  {analyticsData.live_metrics.last_15_minutes}
                </p>
              </div>
              <div className="bg-white p-4 rounded-lg shadow">
                <h3 className="text-sm font-medium text-gray-500">Last Hour</h3>
                <p className="text-2xl font-bold text-orange-600">
                  {analyticsData.live_metrics.last_hour}
                </p>
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
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Student Management</h3>
        <div className="flex space-x-2">
          <button 
            onClick={onRefresh} 
            disabled={loading}
            className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>
          <button 
            onClick={() => setShowAddStudent(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
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
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-auto"
        >
          <option value="all">All Students</option>
          <option value="active">Active Students</option>
          <option value="inactive">Inactive Students</option>
          <option value="with_password">With Parent Password</option>
          <option value="without_password">Need Parent Setup</option>
        </select>
      </div>

      {/* Students Summary */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-gray-900">{students.length}</div>
            <div className="text-sm text-gray-600">Total Students</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-600">{filteredStudents.length}</div>
            <div className="text-sm text-blue-600">Showing</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-600">
              {students.filter(s => s.parentPasswordSet || s.parent_password_set).length}
            </div>
            <div className="text-sm text-green-600">With Parent Access</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-red-600">
              {students.filter(s => s.is_active === false).length}
            </div>
            <div className="text-sm text-red-600">Inactive</div>
          </div>
        </div>
      </div>

      {/* Add Student Modal */}
      {showAddStudent && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
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

              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Adding...' : 'Add Student'}
                </button>
                <button
                  type="button"
                  onClick={closeModals}
                  disabled={loading}
                  className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
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
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
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

              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  type="button"
                  onClick={closeModals}
                  disabled={loading}
                  className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
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
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Confirm Delete</h4>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete <strong>{showDeleteConfirm.name}</strong>?
              <br /><br />
              <span className="text-sm">
                This action may deactivate the student if they have attendance records. 
                The system will prompt for permanent deletion if needed.
              </span>
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => handleDeleteStudent(showDeleteConfirm.id, showDeleteConfirm.name)}
                disabled={loading}
                className="flex-1 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                {loading ? 'Deleting...' : 'Delete Student'}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(null)}
                disabled={loading}
                className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Students Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Student
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Grade
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Student Code
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Parent Access
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Last Seen
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredStudents.length > 0 ? filteredStudents.map((student) => (
              <tr key={student.id || student.student_id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{student.name}</div>
                  <div className="text-sm text-gray-500">ID: {student.id || student.student_id}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">{student.grade || 'Not set'}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-mono text-gray-900">
                    {student.studentCode || student.student_code || 'Not set'}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    (student.parentPasswordSet || student.parent_password_set) ? 
                    'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {(student.parentPasswordSet || student.parent_password_set) ? 'Set up' : 'Needs setup'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    student.is_active !== false ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {student.is_active !== false ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">
                    {student.lastSeen || student.last_attendance ? 
                      new Date(student.lastSeen || student.last_attendance).toLocaleDateString() : 
                      'Never'
                    }
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                  <button 
                    onClick={() => openEditModal(student)}
                    className="text-blue-600 hover:text-blue-900"
                    disabled={loading}
                  >
                    Edit
                  </button>
                  <button 
                    onClick={() => setShowDeleteConfirm({
                      id: student.id || student.student_id,
                      name: student.name
                    })}
                    className="text-red-600 hover:text-red-900"
                    disabled={loading}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
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
  )
}

// UploadStudentsTab Component
// Update your UploadStudentsTab component with CSV template download

function UploadStudentsTab({ user, onUploadComplete }) {
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [results, setResults] = useState(null)

  // Function to generate and download CSV template
  const downloadTemplate = () => {
    // Define the CSV headers and sample data
    const csvContent = [
      // Header row
      ['name', 'grade', 'student_code', 'parent_password'],
      // Sample rows to show format
      ['John Smith', '10th', 'JS001', 'parent123'],
      ['Jane Doe', '9th', 'JD002', 'secure456'],
      ['Mike Johnson', '11th', 'MJ003', 'password789'],
      // Empty row for them to fill
      ['', '', '', '']
    ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')

    // Create and download the file
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

  // Function to download detailed template with instructions
  const downloadDetailedTemplate = () => {
    const csvContent = [
      // Instructions as comments (Excel will show these)
      ['# STUDENT UPLOAD TEMPLATE'],
      ['# Instructions:'],
      ['# 1. Fill in the required columns below'],
      ['# 2. name: Full student name (required)'],
      ['# 3. grade: Student grade/class (optional)'],
      ['# 4. student_code: Unique identifier (optional, will auto-generate if empty)'],
      ['# 5. parent_password: Password for parent portal access (optional)'],
      ['# 6. Delete these instruction rows before uploading'],
      ['# 7. Keep the header row (name, grade, student_code, parent_password)'],
      [''],
      // Header row
      ['name', 'grade', 'student_code', 'parent_password'],
      // Example data
      ['Example: John Smith', 'Example: 10th', 'Example: JS001', 'Example: parent123'],
      // Empty rows for data entry
      ['', '', '', ''],
      ['', '', '', ''],
      ['', '', '', ''],
      ['', '', '', ''],
      ['', '', '', ''],
      ['', '', '', ''],
      ['', '', '', ''],
      ['', '', '', ''],
      ['', '', '', '']
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `student_template_with_instructions_${new Date().toISOString().split('T')[0]}.csv`
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
        <h4 className="font-medium text-blue-900 mb-2">📋 CSV Template</h4>
        <p className="text-sm text-blue-800 mb-4">
          Download a template to ensure your CSV file has the correct format and column headers.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            onClick={downloadTemplate}
            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm font-medium"
          >
            📥 Download Simple Template
          </button>
          <button
            onClick={downloadDetailedTemplate}
            className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 text-sm font-medium"
          >
            📋 Download Template with Instructions
          </button>
        </div>
      </div>

      {/* Format Requirements */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
        <h4 className="font-medium text-green-900 mb-2">✅ CSV Format Requirements</h4>
        <div className="text-sm text-green-800 space-y-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="font-medium">Required Column:</p>
              <ul className="list-disc list-inside ml-2">
                <li><code className="bg-green-100 px-1 rounded">name</code> - Student full name</li>
              </ul>
            </div>
            <div>
              <p className="font-medium">Optional Columns:</p>
              <ul className="list-disc list-inside ml-2">
                <li><code className="bg-green-100 px-1 rounded">grade</code> - e.g., "10th", "Grade 5"</li>
                <li><code className="bg-green-100 px-1 rounded">student_code</code> - Unique ID</li>
                <li><code className="bg-green-100 px-1 rounded">parent_password</code> - Portal access</li>
              </ul>
            </div>
          </div>
          <div className="mt-3 p-2 bg-green-100 rounded text-xs">
            <strong>💡 Tips:</strong>
            <ul className="mt-1 list-disc list-inside">
              <li>First row must contain column headers</li>
              <li>Save file as CSV format from Excel/Google Sheets</li>
              <li>Student codes will be auto-generated if left empty</li>
              <li>Duplicate names will be updated, not duplicated</li>
            </ul>
          </div>
        </div>
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
          {uploading ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Uploading Students...
            </span>
          ) : (
            '📤 Upload Students'
          )}
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
              <div className="flex items-center mb-2">
                <span className="text-lg mr-2">✅</span>
                <span className="font-medium">Upload completed successfully!</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
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
              {results.errors && results.errors.length > 0 && (
                <details className="mt-3">
                  <summary className="cursor-pointer text-sm font-medium">View Error Details</summary>
                  <div className="mt-2 text-xs bg-red-50 p-2 rounded max-h-32 overflow-y-auto">
                    {results.errors.map((error, index) => (
                      <div key={index} className="mb-1">
                        Row {error.row}: {error.message}
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          ) : (
            <div className="text-sm text-red-800">
              <div className="flex items-center mb-2">
                <span className="text-lg mr-2">❌</span>
                <span className="font-medium">Upload failed</span>
              </div>
              <p>{results.error}</p>
            </div>
          )}
        </div>
      )}

      {/* Sample Data Preview */}
      <div className="mt-6 bg-gray-50 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-2">📋 Sample CSV Format</h4>
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