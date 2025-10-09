import { Card } from '../ui/card'
import { Button } from '../ui/button'

interface DashboardTabProps {
  attendance: any[]
  stats: any
  isCompanyAdmin: boolean
  user: any
  setActiveTab: (tab: string) => void
  schoolTimeSettings: any
}

// ✅ Helper function to safely format time
function formatTime(record: any): string {
  try {
    // Try all possible timestamp field names
    const timestamp = record.scan_time || record.scanTime || record.time || 
                     record.created_at || record.createdAt || record.ScanTime || 
                     record.CreatedAt
    
    if (!timestamp) {
      return 'Time not available'
    }
    
    const date = new Date(timestamp)
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      console.warn('Invalid date for record:', record)
      return 'Invalid time'
    }
    
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    })
  } catch (error) {
    console.error('Error formatting time:', error)
    return 'Time error'
  }
}

// ✅ Helper function to safely get student name
function getStudentName(record: any): string {
  return record.student_name || record.studentName || record.StudentName || 'Unknown Student'
}

// ✅ Helper function to safely get school name
function getSchoolName(record: any): string {
  return record.school_name || record.schoolName || record.SchoolName || 'Unknown School'
}

// ✅ Helper function to safely get grade
function getGrade(record: any): string {
  return record.grade || record.Grade || 'Grade N/A'
}

// ✅ Helper function to safely get status
function getStatus(record: any): string {
  return record.status || record.Status || 'IN'
}

function DashboardTab({ attendance, stats, isCompanyAdmin, user, setActiveTab, schoolTimeSettings }: DashboardTabProps) {
  if (isCompanyAdmin) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Network-wide Activity */}
        <Card className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200">
          <div className="flex items-center mb-4">
            <span className="text-2xl mr-2">🌐</span>
            <h3 className="text-lg font-bold text-gray-900">Network Activity Today</h3>
          </div>
          <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
            {attendance && attendance.length > 0 ? (
              attendance.slice(0, 10).map((record, index) => {
                const status = getStatus(record)
                return (
                  <div key={record.id || record.AttendanceID || index} className="flex items-center justify-between p-4 bg-white rounded-lg border-2 border-blue-100 hover:border-blue-300 transition-all shadow-sm hover:shadow-md">
                    <div>
                      <p className="font-bold text-gray-900">👤 {getStudentName(record)}</p>
                      <p className="text-sm text-gray-600">🏫 {getSchoolName(record)}</p>
                    </div>
                    <div className="text-right">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold shadow-sm ${
                        status === 'IN' 
                          ? 'bg-gradient-to-r from-green-100 to-green-200 text-green-800 border-2 border-green-300' 
                          : 'bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 border-2 border-blue-300'
                      }`}>
                        {status === 'IN' ? '✅ Check In' : '🚪 Check Out'}
                      </span>
                      <p className="text-xs text-gray-500 mt-1">
                        ⏰ {formatTime(record)}
                      </p>
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="text-center py-12 text-gray-500">
                <div className="text-5xl mb-3">📊</div>
                <p className="text-sm font-medium">No network activity today</p>
                <p className="text-xs mt-1">Activity will appear here as schools check in</p>
              </div>
            )}
          </div>
        </Card>

        {/* System Overview */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200">
            <div className="flex items-center mb-4">
              <span className="text-2xl mr-2">⚡</span>
              <h4 className="font-bold text-purple-900">Quick Actions</h4>
            </div>
            <div className="space-y-3">
              <Button 
                onClick={() => setActiveTab('schools')}
                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-md hover:shadow-lg transition-all"
              >
                <span className="mr-2">🏫</span> Add New School
              </Button>
              <Button 
                onClick={() => setActiveTab('analytics')}
                className="w-full bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transition-all"
              >
                <span className="mr-2">📊</span> View All Reports
              </Button>
              <Button 
                onClick={() => setActiveTab('system-monitor')}
                className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white shadow-md hover:shadow-lg transition-all"
              >
                <span className="mr-2">🔧</span> System Health Check
              </Button>
            </div>
          </Card>
          
          {/* Network Status */}
          <Card className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200">
            <div className="flex items-center mb-4">
              <span className="text-2xl mr-2">📡</span>
              <h4 className="font-bold text-green-900">Network Status</h4>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-white rounded-lg border-2 border-green-100">
                <span className="text-sm text-gray-700">🏫 Active Schools:</span>
                <span className="font-bold text-green-600 text-lg">{stats.total_schools || 0}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-white rounded-lg border-2 border-green-100">
                <span className="text-sm text-gray-700">🔄 Sync Agents Running:</span>
                <span className="font-bold text-green-600 text-lg">
                  {stats.active_sync_agents || 0}/{stats.total_sync_agents || 0}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-white rounded-lg border-2 border-green-100">
                <span className="text-sm text-gray-700">📊 Today's Attendance:</span>
                <span className="font-bold text-green-600 text-lg">{stats.total_attendance_today || 0}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-white rounded-lg border-2 border-green-100">
                <span className="text-sm text-gray-700">💚 System Health:</span>
                <span className={`font-bold text-lg ${
                  stats.system_health === 'healthy' ? 'text-green-600' :
                  stats.system_health === 'degraded' ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {stats.system_health === 'healthy' ? '✅' : stats.system_health === 'degraded' ? '⚠️' : '❌'}{' '}
                  {stats.system_health?.charAt(0).toUpperCase() + stats.system_health?.slice(1) || 'Unknown'}
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    )
  }
  
  return (
    <div className="space-y-6">
      {/* Settings Configuration Notice */}
      {!schoolTimeSettings && (
        <Card className="p-6 bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-300">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <span className="text-3xl">⚠️</span>
            </div>
            <div className="ml-4 flex-1">
              <h4 className="text-base font-bold text-yellow-900 mb-2">
                ⚙️ Configure School Time Settings
              </h4>
              <p className="text-sm text-yellow-800 mb-3">
                Set up late arrival and early departure thresholds to automatically track attendance status and get better insights.
              </p>
              <Button 
                onClick={() => setActiveTab('settings')}
                className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white shadow-md hover:shadow-lg transition-all"
              >
                <span className="mr-2">🚀</span> Configure Now
              </Button>
            </div>
          </div>
        </Card>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Check-ins */}
        <Card className="p-6 bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200">
          <div className="flex items-center mb-4">
            <span className="text-2xl mr-2">📋</span>
            <h3 className="text-lg font-bold text-gray-900">Recent Check-ins</h3>
          </div>
          <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
            {attendance && attendance.length > 0 ? (
              attendance.map((record, index) => {
                const status = getStatus(record)
                return (
                  <div key={record.id || record.AttendanceID || index} className="flex items-center justify-between p-4 bg-white rounded-lg border-2 border-blue-100 hover:border-blue-300 transition-all shadow-sm hover:shadow-md">
                    <div>
                      <p className="font-bold text-gray-900">👤 {getStudentName(record)}</p>
                      <p className="text-sm text-gray-600">📚 {getGrade(record)}</p>
                    </div>
                    <div className="text-right">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold shadow-sm ${
                        status === 'IN' 
                          ? 'bg-gradient-to-r from-green-100 to-green-200 text-green-800 border-2 border-green-300' 
                          : 'bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 border-2 border-blue-300'
                      }`}>
                        {status === 'IN' ? '✅ Check In' : '🚪 Check Out'}
                      </span>
                      <p className="text-xs text-gray-500 mt-1">
                        ⏰ {formatTime(record)}
                      </p>
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="text-center py-12 text-gray-500">
                <div className="text-5xl mb-3">📊</div>
                <p className="text-sm font-medium">No check-ins today</p>
                <p className="text-xs mt-1">Student attendance will appear here</p>
              </div>
            )}
          </div>
        </Card>

        {/* System Status */}
        <div className="space-y-4">
          <Card className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200">
            <div className="flex items-center mb-4">
              <span className="text-2xl mr-2">🔧</span>
              <h3 className="text-lg font-bold text-gray-900">System Status</h3>
            </div>
            <div className="space-y-3">
              {/* Database Connection */}
              <div className="flex justify-between items-center p-4 bg-white rounded-lg border-2 border-green-200 shadow-sm">
                <div className="flex items-center">
                  <span className="text-2xl mr-3">💾</span>
                  <div>
                    <p className="font-bold text-green-900">Database Connection</p>
                    <p className="text-sm text-green-600">Connected to AWS RDS</p>
                  </div>
                </div>
                <span className="w-4 h-4 bg-green-500 rounded-full animate-pulse shadow-lg"></span>
              </div>
              
              {/* Sync Agent */}
              <div className={`flex justify-between items-center p-4 rounded-lg border-2 shadow-sm ${
                stats.sync_status === 'online' 
                  ? 'bg-white border-green-200' 
                  : 'bg-white border-red-200'
              }`}>
                <div className="flex items-center">
                  <span className="text-2xl mr-3">{stats.sync_status === 'online' ? '🔄' : '⚠️'}</span>
                  <div>
                    <p className={`font-bold ${stats.sync_status === 'online' ? 'text-green-900' : 'text-red-900'}`}>
                      Sync Agent
                    </p>
                    <p className={`text-sm ${stats.sync_status === 'online' ? 'text-green-600' : 'text-red-600'}`}>
                      {stats.sync_status === 'online' ? 'Online and running' : 'Offline - Check connection'}
                    </p>
                  </div>
                </div>
                <span className={`w-4 h-4 rounded-full shadow-lg ${
                  stats.sync_status === 'online' ? 'bg-green-500 animate-pulse' : 'bg-red-500'
                }`}></span>
              </div>
              
              {/* Parent Notifications */}
              <div className="flex justify-between items-center p-4 bg-white rounded-lg border-2 border-blue-200 shadow-sm">
                <div className="flex items-center">
                  <span className="text-2xl mr-3">📧</span>
                  <div>
                    <p className="font-bold text-blue-900">Parent Notifications</p>
                    <p className="text-sm text-blue-600">Email & SMS configured</p>
                  </div>
                </div>
                <span className="w-4 h-4 bg-blue-500 rounded-full animate-pulse shadow-lg"></span>
              </div>
            </div>
          </Card>

          {/* Quick Stats Card */}
          {stats && (
            <Card className="p-6 bg-gradient-to-br from-indigo-50 to-blue-50 border-2 border-indigo-200">
              <div className="flex items-center mb-4">
                <span className="text-2xl mr-2">📊</span>
                <h3 className="text-lg font-bold text-gray-900">Today's Summary</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center p-3 bg-white rounded-lg border-2 border-green-200">
                  <div className="text-3xl font-bold text-green-600">{stats.present_today || 0}</div>
                  <div className="text-xs text-gray-600 mt-1">✅ Present</div>
                </div>
                <div className="text-center p-3 bg-white rounded-lg border-2 border-red-200">
                  <div className="text-3xl font-bold text-red-600">{stats.absent_today || 0}</div>
                  <div className="text-xs text-gray-600 mt-1">❌ Absent</div>
                </div>
                {stats.late_arrivals !== undefined && (
                  <div className="text-center p-3 bg-white rounded-lg border-2 border-orange-200">
                    <div className="text-3xl font-bold text-orange-600">{stats.late_arrivals || 0}</div>
                    <div className="text-xs text-gray-600 mt-1">⏰ Late</div>
                  </div>
                )}
                {stats.total_students !== undefined && (
                  <div className="text-center p-3 bg-white rounded-lg border-2 border-blue-200">
                    <div className="text-3xl font-bold text-blue-600">{stats.total_students || 0}</div>
                    <div className="text-xs text-gray-600 mt-1">👥 Total</div>
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

export default DashboardTab