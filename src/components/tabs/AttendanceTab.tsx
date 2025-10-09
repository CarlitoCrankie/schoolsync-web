import { useState, useEffect } from 'react'
import { Card } from '../ui/card'
import { Button } from '../ui/button'
import { apiGet, apiPost } from '@/lib/api'

interface AttendanceTabProps {
  attendance: any[]
  isCompanyAdmin: boolean
  user: any
  stats: any
}

function AttendanceTab({ attendance, isCompanyAdmin, user, stats }: AttendanceTabProps) {
  const [dateRange, setDateRange] = useState({
    from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0]
  })
  const [attendanceData, setAttendanceData] = useState(attendance)
  const [timeSettings, setTimeSettings] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [statusFilter, setStatusFilter] = useState('all')
  const [gradeFilter, setGradeFilter] = useState('')
  const [availableGrades, setAvailableGrades] = useState([])
  const [exporting, setExporting] = useState(false)
  const [attendanceFilter, setAttendanceFilter] = useState('present')
  const [absentStudents, setAbsentStudents] = useState([])
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const [totalRecords, setTotalRecords] = useState(0)
  const [paginationInfo, setPaginationInfo] = useState({})
  
  // Search-related state
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState(null)
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchError, setSearchError] = useState(null)
  const [showSearch, setShowSearch] = useState(false)

  useEffect(() => {
    setAttendanceData(attendance)
    loadTimeSettings()
    loadAvailableGrades()
    if (!isCompanyAdmin) {
      loadAbsentStudents()
    }
  }, [attendance])

  // Page size options
  const pageSizeOptions = [
    { value: 20, label: '20' },
    { value: 50, label: '50' },
    { value: 100, label: '100' },
    { value: 200, label: '200' },
    { value: 'all', label: 'All' }
  ]

  // Excel Export Function
  const exportToExcel = async () => {
    if (!filteredData.length) {
      alert('No data to export')
      return
    }

    setExporting(true)
    
    try {
      // Prepare the data for export
      const exportData = filteredData.map(record => ({
        'Student Name': record.studentName || record.student_name || 'Unknown Student',
        'Grade': record.grade || 'N/A',
        'Status': record.status === 'IN' ? 'Check In' : record.status === 'OUT' ? 'Check Out' : record.status || 'Unknown',
        'Enhanced Status': record.statusLabel || (record.status === 'IN' ? 'Check In' : 'Check Out'),
        'Date': formatDate(record.scan_time || record.time || record.created_at),
        'Time': formatTime(record.scan_time || record.time || record.created_at),
        'School': record.school_name || (isCompanyAdmin ? 'Unknown School' : user?.school?.name || 'School'),
        'Notes': record.message || '',
        'Raw Timestamp': record.scan_time || record.time || record.created_at
      }))

      // Create filename with current filters
      const now = new Date()
      const timestamp = now.toISOString().split('T')[0]
      let filename = `attendance-report-${timestamp}`
      
      // Add filter info to filename
      if (statusFilter !== 'all') {
        filename += `-${statusFilter}`
      }
      if (gradeFilter) {
        filename += `-grade-${gradeFilter}`
      }
      if (dateRange.from === dateRange.to) {
        filename += `-${dateRange.from}`
      } else {
        filename += `-${dateRange.from}-to-${dateRange.to}`
      }

      // Create Excel content using CSV format that Excel can read
      const headers = Object.keys(exportData[0])
      const csvContent = [
        // Add title rows
        [`Attendance Report - ${isCosmpanyAdmin ? 'Network Wide' : user?.school?.name || 'School'}`],
        [`Generated: ${now.toLocaleString()}`],
        [`Date Range: ${dateRange.from} to ${dateRange.to}`],
        [`Filters: Status=${statusFilter}, Grade=${gradeFilter || 'All'}`],
        [`Total Records: ${filteredData.length}`],
        [], // Empty row
        headers, // Column headers
        ...exportData.map(row => headers.map(header => row[header] || ''))
      ].map(row => 
        row.map(cell => 
          typeof cell === 'string' && (cell.includes(',') || cell.includes('"') || cell.includes('\n'))
            ? `"${cell.replace(/"/g, '""')}"` 
            : cell
        ).join(',')
      ).join('\n')

      // Create and download the file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `${filename}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      // Show success message
      alert(`Exported ${filteredData.length} attendance records to ${filename}.csv`)

    } catch (error) {
      console.error('Export error:', error)
      alert('Failed to export attendance data. Please try again.')
    } finally {
      setExporting(false)
    }
  }

  const loadTimeSettings = async () => {
    try {
      const schoolId = user?.school_id || user?.SchoolID
      if (!schoolId) return

      const result = await apiGet(`/api/school-settings?school_id=${schoolId}&type=time`)

      if (result.success) {
        setTimeSettings(result.settings)
      }
    } catch (error) {
      console.error('Error loading time settings:', error)
    }
  }

  // Add this function in AttendanceTab
  const loadAbsentStudents = async () => {
    if (isCompanyAdmin) return
    
    try {
      const schoolId = user?.school_id || user?.SchoolID
      if (!schoolId) return

    const result = await apiPost('/api/students', {
      action: 'get_absent_students',
      school_id: schoolId,
      date: dateRange.to || new Date().toISOString().split('T')[0]
    })

    if (result.success) {
      setAbsentStudents(result.absent_students || [])
    }    } catch (error) {
          console.error('Error loading absent students:', error)
          // Fallback: calculate absent students from existing data
          calculateAbsentStudents()
        }
      }

  // Add this fallback calculation function
  const calculateAbsentStudents = async () => {
    try {
      const schoolId = user?.school_id || user?.SchoolID
      if (!schoolId) return

      // Get all active students
      const studentsResult = await apiGet(`/api/students?school_id=${schoolId}&active_only=true`)
      if (!studentsResult.success) return

      const allStudents = studentsResult.data || []
      
      // Get unique student IDs who were present today
      const presentStudentIds = new Set(
        attendanceData
          .filter(record => {
            const recordDate = new Date(record.scan_time || record.time || record.created_at).toDateString()
            const today = new Date().toDateString()
            return recordDate === today
          })
          .map(record => record.student_id)
      )

      // Students who are not in the present list are absent
      const absentStudentsList = allStudents.filter(student => 
        !presentStudentIds.has(student.student_id || student.id)
      )

      setAbsentStudents(absentStudentsList)
    } catch (error) {
      console.error('Error calculating absent students:', error)
    }
  }

  const loadAvailableGrades = async () => {
    try {
      const schoolId = user?.school_id || user?.SchoolID
      if (!schoolId) return

      const result = await apiGet(`/api/students?school_id=${schoolId}&type=grades`)

      if (result.success) {
        setAvailableGrades(result.grades || [])
      }
    } catch (error) {
      console.error('Error loading grades:', error)
    }
  }

  // Search function
  const searchStudent = async () => {
    if (!searchQuery.trim()) {
      setSearchError('Please enter a student name or student code')
      return
    }

    setSearchLoading(true)
    setSearchError(null)
    setSearchResults(null)

    try {
      const schoolId = user?.school_id || user?.SchoolID

      const result = await apiPost('/api/students', {
        action: 'search_student_attendance',
        query: searchQuery.trim(),
        date_from: dateRange.from,
        date_to: dateRange.to,
        school_id: !isCompanyAdmin ? schoolId : undefined
      })

      if (result.success) {
        setSearchResults(result.data)
        setShowSearch(true)
      } else {
        setSearchError(result.error || 'Student not found')
      }
    } catch (error) {
      console.error('Search error:', error)
      setSearchError('Failed to search student. Please try again.')
    } finally {
      setSearchLoading(false)
    }
  }

  // Clear search results
  const clearSearch = () => {
    setSearchQuery('')
    setSearchResults(null)
    setSearchError(null)
    setShowSearch(false)
  }

  // Handle page size change
  const handlePageSizeChange = (newPageSize) => {
    setPageSize(newPageSize)
    setCurrentPage(1)
  }

  // Handle page change
  const handlePageChange = (newPage) => {
    setCurrentPage(newPage)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Reset to page 1 when filters change
  const resetPagination = () => {
    setCurrentPage(1)
  }

  const handleAttendanceFilterChange = (value) => {
    setAttendanceFilter(value)
    resetPagination()
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

      if (gradeFilter && gradeFilter.trim() !== '') {
        // URL encode the grade value to handle spaces and special characters
        const encodedGrade = encodeURIComponent(gradeFilter.trim())
        params.append('grade', encodedGrade)
        console.log('Adding grade filter:', gradeFilter, '-> encoded:', encodedGrade)
      }

      const data = await apiGet(`/api/analytics?${params}`)

      if (data.success) {
          if (data.current_activity && Array.isArray(data.current_activity)) {
          let formattedData = data.current_activity.map(record => ({
            id: record.attendance_id,
            studentName: record.student_name,
            student_name: record.student_name,
            grade: record.grade,
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
  }, [dateRange.from, dateRange.to, gradeFilter])

  // First, filter the data
  const allFilteredData = attendanceFilter === 'present' 
    ? attendanceData.filter(record => {
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
    : absentStudents.filter(student => {
        // Grade filter for absent students
        const gradeMatch = !gradeFilter || student.grade === gradeFilter
        return gradeMatch
      })

  // Then apply pagination
  const totalRecordsCount = allFilteredData.length
  const startIndex = pageSize === 'all' ? 0 : (currentPage - 1) * pageSize
  const endIndex = pageSize === 'all' ? totalRecordsCount : startIndex + parseInt(pageSize)
  const filteredData = pageSize === 'all' ? allFilteredData : allFilteredData.slice(startIndex, endIndex)

  // Calculate pagination info
  const totalPages = pageSize === 'all' ? 1 : Math.ceil(totalRecordsCount / pageSize)
  const hasPrevious = currentPage > 1
  const hasMore = currentPage < totalPages

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

  // Utility functions for status badges
  const getStatusBadgeClasses = (statusType) => {
    switch (statusType) {
      case 'late':
        return 'inline-flex px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800'
      case 'on-time':
      case 'early-arrival':
        return 'inline-flex px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800'
      case 'early-departure':
        return 'inline-flex px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800'
      default:
        return 'inline-flex px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (statusType) => {
    switch (statusType) {
      case 'late':
        return '🔴'
      case 'on-time':
      case 'early-arrival':
        return '🟢'
      case 'early-departure':
        return '🟠'
      default:
        return '⚪'
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
    <div className="space-y-6">
      {/* Header Section */}
      <Card className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
          <div>
            <h3 className="text-xl font-bold text-gray-900">
              {showSearch ? '🔍 Student Search Results' : (isCompanyAdmin ? '🌐 Network Attendance Records' : '📊 Recent Attendance')}
            </h3>
            {timeSettings && !showSearch && (
              <p className="text-sm text-gray-600 mt-1">
                ⏰ Late after {timeSettings.late_arrival_time} • Early before {timeSettings.early_departure_time}
              </p>
            )}
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2">
            {!showSearch && (
              <>
                <input
                  type="date"
                  value={dateRange.from}
                  onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
                  className="border-2 border-blue-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  max={dateRange.to}
                />
                <input
                  type="date"
                  value={dateRange.to}
                  onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
                  className="border-2 border-blue-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  min={dateRange.from}
                  max={new Date().toISOString().split('T')[0]}
                />
                <Button 
                  onClick={refreshAttendance}
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-700 text-white shadow-md"
                >
                  {loading ? '🔄 Loading...' : '🔄 Refresh'}
                </Button>
                <Button 
                  onClick={exportToExcel}
                  disabled={exporting || filteredData.length === 0}
                  className="bg-green-600 hover:bg-green-700 text-white shadow-md"
                >
                  {exporting ? '📤 Exporting...' : '📊 Export Excel'}
                </Button>
              </>
            )}
            <Button 
              onClick={() => setShowSearch(!showSearch)}
              className="bg-purple-600 hover:bg-purple-700 text-white shadow-md"
            >
              {showSearch ? '← Back to Overview' : '🔍 Search Student'}
            </Button>
          </div>
        </div>
      </Card>

      {/* Search Section */}
      {showSearch && (
        <Card className="p-6 border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50">
          <h4 className="text-lg font-bold text-gray-900 mb-4">🔍 Search Student Attendance</h4>
          
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Student Name or Student Code
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Enter student name or student code..."
                className="w-full px-4 py-2 border-2 border-purple-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                onKeyPress={(e) => e.key === 'Enter' && searchStudent()}
              />
            </div>
            <div className="flex gap-2 items-end">
              <Button
                onClick={searchStudent}
                disabled={searchLoading || !searchQuery.trim()}
                className="bg-blue-600 hover:bg-blue-700 text-white shadow-md"
              >
                {searchLoading ? '🔍 Searching...' : '🔍 Search'}
              </Button>
              {(searchResults || searchError) && (
                <Button
                  onClick={clearSearch}
                  variant="outline"
                  className="border-gray-300 hover:bg-gray-100"
                >
                  ✕ Clear
                </Button>
              )}
            </div>
          </div>
          
          <div className="text-sm text-gray-600">
            📅 Search date range: {formatDate(dateRange.from)} to {formatDate(dateRange.to)}
          </div>
        </Card>
      )}

      {/* Search Error */}
      {searchError && (
        <Card className="p-4 bg-red-50 border-2 border-red-200">
          <div className="flex items-center">
            <span className="text-2xl mr-3">⚠️</span>
            <p className="text-sm text-red-700">{searchError}</p>
          </div>
        </Card>
      )}

      {/* Search Results */}
      {showSearch && searchResults && (
        <Card className="overflow-hidden border-purple-200">
          {/* Student Info Header */}
          <div className="bg-gradient-to-r from-purple-100 to-blue-100 px-6 py-4 border-b-2 border-purple-200">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
              <div>
                <h4 className="text-lg font-bold text-gray-900">
                  👤 {searchResults.student?.name || 'Unknown Student'}
                </h4>
                <div className="flex flex-wrap gap-4 text-sm text-gray-600 mt-1">
                  {searchResults.student?.student_code && (
                    <span>🆔 Code: <span className="font-medium">{searchResults.student.student_code}</span></span>
                  )}
                  {searchResults.student?.grade && (
                    <span>📚 Grade: <span className="font-medium">{searchResults.student.grade}</span></span>
                  )}
                  {searchResults.student?.school_name && (
                    <span>🏫 School: <span className="font-medium">{searchResults.student.school_name}</span></span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Attendance Summary */}
          {searchResults.summary && (
            <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-cyan-50 border-b-2 border-blue-200">
              <h5 className="text-sm font-bold text-gray-700 mb-3">📊 Attendance Summary</h5>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="text-center bg-white rounded-lg p-3 border-2 border-green-200">
                  <div className="text-2xl font-bold text-green-600">{searchResults.summary.present_days || 0}</div>
                  <div className="text-xs text-gray-600 mt-1">✅ Present Days</div>
                </div>
                <div className="text-center bg-white rounded-lg p-3 border-2 border-red-200">
                  <div className="text-2xl font-bold text-red-600">{searchResults.summary.absent_days || 0}</div>
                  <div className="text-xs text-gray-600 mt-1">❌ Absent Days</div>
                </div>
                <div className="text-center bg-white rounded-lg p-3 border-2 border-orange-200">
                  <div className="text-2xl font-bold text-orange-600">{searchResults.summary.late_arrivals || 0}</div>
                  <div className="text-xs text-gray-600 mt-1">⏰ Late Arrivals</div>
                </div>
                <div className="text-center bg-white rounded-lg p-3 border-2 border-blue-200">
                  <div className="text-2xl font-bold text-blue-600">
                    {searchResults.summary.attendance_rate ? `${searchResults.summary.attendance_rate}%` : 'N/A'}
                  </div>
                  <div className="text-xs text-gray-600 mt-1">📈 Attendance Rate</div>
                </div>
              </div>
            </div>
          )}

          {/* Detailed Records */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">📅 Date</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">⏰ Time</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">📊 Status</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">🏷️ Type</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">📝 Notes</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {searchResults.records && searchResults.records.length > 0 ? (
                  searchResults.records.map((record, index) => (
                    <tr key={record.id || index} className="hover:bg-blue-50 transition-colors">
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {formatDate(record.scan_time || record.date)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {record.scan_time ? formatTime(record.scan_time) : '-'}
                      </td>
                      <td className="px-6 py-4">
                        {record.statusType && timeSettings ? (
                          <span className={getStatusBadgeClasses(record.statusType)}>
                            {getStatusIcon(record.statusType)} {record.statusLabel}
                          </span>
                        ) : (
                          <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                            record.status === 'IN' ? 'bg-green-100 text-green-800' : 
                            record.status === 'OUT' ? 'bg-blue-100 text-blue-800' :
                            record.status === 'ABSENT' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {record.status === 'IN' ? 'Check In' : 
                             record.status === 'OUT' ? 'Check Out' : 
                             record.status === 'ABSENT' ? 'Absent' :
                             record.status || 'Unknown'}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {record.type || (record.status === 'IN' ? 'Arrival' : record.status === 'OUT' ? 'Departure' : '-')}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {record.message || record.notes || '-'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center">
                      <div className="text-gray-500">
                        <div className="text-4xl mb-2">📅</div>
                        <p className="font-medium">No attendance records found</p>
                        <p className="text-sm mt-1">
                          No records between {formatDate(dateRange.from)} and {formatDate(dateRange.to)}
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Overview Content (only show when not searching) */}
      {!showSearch && (
        <>
          {/* Enhanced Filter Section */}
          <Card className="p-6 border-blue-200 bg-gradient-to-br from-blue-50 to-cyan-50">
            <div className="space-y-4">
              {/* Grade Filter */}
              {availableGrades.length > 0 && (
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    📚 Filter by Grade
                  </label>
                  <select
                    value={gradeFilter}
                    onChange={(e) => setGradeFilter(e.target.value)}
                    className="block w-full sm:w-48 px-3 py-2 border-2 border-blue-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                  >
                    <option value="">All Grades</option>
                    {availableGrades.map((grade) => (
                      <option key={grade} value={grade}>
                        {grade}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Present/Absent Filter - Only for school admins */}
              {!isCompanyAdmin && (
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    👥 View Students
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => {
                        setAttendanceFilter('present')
                        setStatusFilter('all')
                      }}
                      className={`px-4 py-2 text-sm rounded-lg font-medium transition-all shadow-md ${
                        attendanceFilter === 'present' 
                          ? 'bg-green-500 text-white border-2 border-green-600 scale-105' 
                          : 'bg-white text-gray-600 border-2 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      ✅ Present Today ({stats?.present_today || 0})
                    </button>
                    <button
                      onClick={() => setAttendanceFilter('absent')}
                      className={`px-4 py-2 text-sm rounded-lg font-medium transition-all shadow-md ${
                        attendanceFilter === 'absent' 
                          ? 'bg-red-500 text-white border-2 border-red-600 scale-105' 
                          : 'bg-white text-gray-600 border-2 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      ❌ Absent Today ({absentStudents.length})
                    </button>
                  </div>
                </div>
              )}

              {/* Status Filter Buttons */}
              {timeSettings && statusCounts.all > 0 && (
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    🎯 Filter by Status
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setStatusFilter('all')}
                      className={`px-3 py-2 text-sm rounded-lg font-medium transition-all shadow-md ${
                        statusFilter === 'all' 
                          ? 'bg-blue-500 text-white border-2 border-blue-600 scale-105' 
                          : 'bg-white text-gray-600 border-2 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      📊 All ({statusCounts.all})
                    </button>
                    <button
                      onClick={() => setStatusFilter('on-time')}
                      className={`px-3 py-2 text-sm rounded-lg font-medium transition-all shadow-md ${
                        statusFilter === 'on-time' 
                          ? 'bg-green-500 text-white border-2 border-green-600 scale-105' 
                          : 'bg-white text-gray-600 border-2 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      🟢 On Time ({statusCounts['on-time']})
                    </button>
                    <button
                      onClick={() => setStatusFilter('late')}
                      className={`px-3 py-2 text-sm rounded-lg font-medium transition-all shadow-md ${
                        statusFilter === 'late' 
                          ? 'bg-red-500 text-white border-2 border-red-600 scale-105' 
                          : 'bg-white text-gray-600 border-2 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      🔴 Late ({statusCounts.late})
                    </button>
                    <button
                      onClick={() => setStatusFilter('early-departure')}
                      className={`px-3 py-2 text-sm rounded-lg font-medium transition-all shadow-md ${
                        statusFilter === 'early-departure' 
                          ? 'bg-orange-500 text-white border-2 border-orange-600 scale-105' 
                          : 'bg-white text-gray-600 border-2 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      🟠 Early Out ({statusCounts['early-departure']})
                    </button>
                  </div>
                </div>
              )}

              {/* Export Summary */}
              {filteredData.length > 0 && (
                <div className="text-sm text-gray-600 border-t-2 border-blue-200 pt-3">
                  📤 Ready to export: <span className="font-bold">{filteredData.length} records</span>
                  {statusFilter !== 'all' && ` (filtered by ${statusFilter.replace('-', ' ')})`}
                  {gradeFilter && ` (Grade ${gradeFilter})`}
                  {dateRange.from === dateRange.to 
                    ? ` for ${formatDate(dateRange.from)}`
                    : ` from ${formatDate(dateRange.from)} to ${formatDate(dateRange.to)}`
                  }
                </div>
              )}
            </div>
          </Card>

          {error && (
            <Card className="p-4 bg-red-50 border-2 border-red-200">
              <div className="flex items-center">
                <span className="text-2xl mr-3">⚠️</span>
                <p className="text-sm text-red-700">Error: {error}</p>
              </div>
            </Card>
          )}

          {/* Pagination Controls */}
          <Card className="p-4 bg-gradient-to-r from-gray-50 to-gray-100 border-gray-200">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm font-bold text-gray-700">📄 Items per page:</label>
                <select 
                  value={pageSize} 
                  onChange={(e) => handlePageSizeChange(e.target.value)}
                  className="px-3 py-1 border-2 border-gray-300 rounded-lg text-sm bg-white"
                >
                  {pageSizeOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Page navigation - only show if not showing all */}
              {pageSize !== 'all' && totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <Button 
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={!hasPrevious || loading}
                    variant="outline"
                    size="sm"
                    className="border-gray-300"
                  >
                    ← Previous
                  </Button>
                  
                  <span className="text-sm font-medium text-gray-700 px-3 py-1 bg-white rounded-lg border-2 border-gray-300">
                    Page {currentPage} of {totalPages}
                  </span>
                  
                  <Button 
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={!hasMore || loading}
                    variant="outline"
                    size="sm"
                    className="border-gray-300"
                  >
                    Next →
                  </Button>
                </div>
              )}
            </div>
          </Card>

          {/* Attendance Table */}
          <Card className="overflow-hidden border-blue-200">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gradient-to-r from-blue-500 to-indigo-600">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">
                      👤 Student
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">
                      📚 Grade
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">
                      📊 Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider hidden sm:table-cell">
                      ⏰ Time
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider hidden sm:table-cell">
                      📅 Date
                    </th>
                    {isCompanyAdmin && (
                      <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider hidden md:table-cell">
                        🏫 School
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredData && filteredData.length > 0 ? (
                    filteredData.map((record, index) => (
                      <tr key={record.id || record.student_id || record.attendance_id || index} className="hover:bg-blue-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">
                            {attendanceFilter === 'present' 
                              ? (record.studentName || record.student_name || 'Unknown Student')
                              : (record.name || 'Unknown Student')
                            }
                          </div>
                          <div className="text-xs text-gray-500">
                            {attendanceFilter === 'present' ? (
                              <div className="sm:hidden">
                                ⏰ {formatTime(record.scan_time || record.time || record.created_at)}
                              </div>
                            ) : (
                              <span className="text-red-600">❌ No attendance today</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex px-3 py-1 text-xs font-bold rounded-full bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 border-2 border-blue-300">
                            {(attendanceFilter === 'present' ? record.grade : record.grade) 
                              ? `${attendanceFilter === 'present' ? record.grade : record.grade}` 
                              : 'N/A'
                            }
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {attendanceFilter === 'present' ? (
                            <div className="space-y-1">
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
                              {record.message && (
                                <div className="text-xs text-gray-500 lg:hidden">
                                  {record.message}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              ❌ Absent
                            </span>
                          )}
                        </td>
                        {attendanceFilter === 'present' && (
                          <>
                            <td className="px-6 py-4 text-sm text-gray-500 hidden sm:table-cell">
                              {formatTime(record.scan_time || record.time || record.created_at)}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500 hidden sm:table-cell">
                              {formatDate(record.scan_time || record.time || record.created_at)}
                            </td>
                          </>
                        )}
                        {isCompanyAdmin && (
                          <td className="px-6 py-4 text-sm text-gray-500 hidden md:table-cell">
                            {attendanceFilter === 'present' 
                              ? (record.school_name || 'Unknown School')
                              : (record.school_name || 'Unknown School')
                            }
                          </td>
                        )}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={
                        isCompanyAdmin 
                          ? (attendanceFilter === 'present' ? "6" : "4")
                          : (attendanceFilter === 'present' ? "5" : "3")
                      } className="px-6 py-12 text-center">
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
                              <div className="text-4xl mb-2">📊</div>
                              <p className="font-medium">
                                {attendanceFilter === 'absent' 
                                  ? `No absent students found${gradeFilter ? ` in Grade ${gradeFilter}` : ''}`
                                  : (statusFilter === 'all' && !gradeFilter ? 'No attendance records found' : 
                                     `No records found for ${statusFilter !== 'all' ? statusFilter.replace('-', ' ') : ''}${statusFilter !== 'all' && gradeFilter ? ' and ' : ''}${gradeFilter ? `Grade ${gradeFilter}` : ''}`
                                    )
                                }
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
          </Card>

          {/* Footer Summary */}
          {filteredData && filteredData.length > 0 && (
            <Card className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
              <div className="text-center">
                <div className="text-sm text-gray-700">
                  📊 Showing <span className="font-bold">{startIndex + 1}</span> to <span className="font-bold">{Math.min(endIndex, totalRecordsCount)}</span> of <span className="font-bold">{totalRecordsCount}</span> {attendanceFilter} records
                  {(statusFilter !== 'all' || gradeFilter) && (
                    <span className="block mt-1 text-xs text-gray-600">
                      🎯 Filtered by: {statusFilter !== 'all' && statusFilter.replace('-', ' ')}{statusFilter !== 'all' && gradeFilter && ' and '}{gradeFilter && `Grade ${gradeFilter}`}
                    </span>
                  )}
                </div>
                
                {/* Bottom pagination controls for convenience */}
                {pageSize !== 'all' && totalPages > 1 && (
                  <div className="flex justify-center items-center gap-2 mt-3">
                    <Button 
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={!hasPrevious}
                      variant="outline"
                      size="sm"
                    >
                      ← Previous
                    </Button>
                    
                    <span className="text-sm font-medium text-gray-700 px-3 py-1 bg-white rounded-lg border-2 border-gray-300">
                      {currentPage} of {totalPages}
                    </span>
                    
                    <Button 
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={!hasMore}
                      variant="outline"
                      size="sm"
                    >
                      Next →
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  )
}

export default AttendanceTab