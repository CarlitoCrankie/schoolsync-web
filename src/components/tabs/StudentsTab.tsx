import { useState, useEffect } from 'react'
import { Card } from '../ui/card'
import { Button } from '../ui/button'
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api'  

interface StudentsTabProps {
  onRefresh?: () => void
  user: any
}

function StudentsTab({ onRefresh, user }: StudentsTabProps) {
  // STATE MANAGEMENT
  const [students, setStudents] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [selectedGrade, setSelectedGrade] = useState('')
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [modalType, setModalType] = useState('')
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [grades, setGrades] = useState([])
  const [clearFields, setClearFields] = useState({
  email: false,
  phone: false
})
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const [totalStudents, setTotalStudents] = useState(0)
  const [filteredTotal, setFilteredTotal] = useState(0)
  const [pagination, setPagination] = useState({})

  const [studentForm, setStudentForm] = useState({
    name: '',
    grade: '',
    student_code: '',
    parent_password: '',
    parent_email: '',
    parent_phone: '',
    is_active: true
  })

  const [showPasswords, setShowPasswords] = useState({
    addPassword: false,
    editPassword: false
  })

  // Page size options
  const pageSizeOptions = [
    { value: 20, label: '20' },
    { value: 50, label: '50' },
    { value: 100, label: '100' },
    { value: 200, label: '200' },
    { value: 'all', label: 'All' }
  ]

  const togglePasswordVisibility = (field) => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }))
  }

  // Load students from API with pagination
const loadStudents = async (page = 1, limit = pageSize, searchTerm = '', gradeFilter = '', statusFilter = 'all') => {
  setLoading(true)
  try {
    const schoolId = user?.SchoolID || user?.school_id
    
    const params = new URLSearchParams({
      school_id: schoolId,
      page: page.toString(),
      limit: limit === 'all' ? '999999' : limit.toString(),
      include_stats: 'false'
    })
    
    if (searchTerm.trim()) {
      params.append('search', searchTerm.trim())
    }
    
    if (gradeFilter) {
      params.append('grade', gradeFilter)
    }
    
    // ✅ Handle active/inactive filters (sent to backend)
    if (statusFilter === 'active') {
      params.append('active_only', 'true')
      console.log('🔵 Frontend sending: active_only=true')
    } else if (statusFilter === 'inactive') {
      params.append('active_only', 'false')
      console.log('🔴 Frontend sending: active_only=false')
    } else {
      console.log('⚪ Frontend sending: no active_only filter')
    }

    console.log('📤 API Call:', `/api/students?${params.toString()}`)

    console.log('Loading students with params:', params.toString())
    
    const data = await apiGet(`/api/students?${params}`)
    
    if (data.success) {
      let studentsData = data.data || data.students || []
      
      // ✅ DEBUG: Log first student to see actual field names
      if (studentsData.length > 0) {
        console.log('=== FIRST STUDENT SAMPLE ===')
        console.log('Full student object:', studentsData[0])
        console.log('Field checks:', {
          'parent_password_set': studentsData[0].parent_password_set,
          'parentPasswordSet': studentsData[0].parentPasswordSet,
          'ParentPasswordSet': studentsData[0].ParentPasswordSet,
          'parent_password_hash': studentsData[0].parent_password_hash,
          'ParentID': studentsData[0].ParentID
        })
      }
      
      console.log(`Total students before filter: ${studentsData.length}, Filter: ${statusFilter}`)
      
      // ✅ CLIENT-SIDE FILTER for parent password status
      if (statusFilter === 'with_password') {
        const before = studentsData.length
        studentsData = studentsData.filter((s: any) => {
          // Check all possible field names
          const hasPassword = s.ParentPasswordSet || s.parent_password_set || s.parentPasswordSet
          return hasPassword === true || hasPassword === 1
        })
        console.log(`WITH PASSWORD: Before=${before}, After=${studentsData.length}`)
      } else if (statusFilter === 'without_password') {
        const before = studentsData.length
        studentsData = studentsData.filter((s: any) => {
          // Check all possible field names
          const hasPassword = s.ParentPasswordSet || s.parent_password_set || s.parentPasswordSet
          return !hasPassword || hasPassword === false || hasPassword === 0
        })
        console.log(`WITHOUT PASSWORD: Before=${before}, After=${studentsData.length}`)
        
        // ✅ Log each student to see why they're included/excluded
        if (studentsData.length === 0 && before > 0) {
          console.log('❌ All students filtered out! Checking first 3 students:')
          const allStudents = data.data || data.students || []
          allStudents.slice(0, 3).forEach((s: any) => {
            console.log(`Student: ${s.name}, ParentPasswordSet: ${s.ParentPasswordSet}, parent_password_set: ${s.parent_password_set}`)
          })
        }
      }
      
      setStudents(studentsData)
      
      // ✅ Use correct totals
      const filteredCount = studentsData.length
      setTotalStudents(data.totals?.total_students || data.total || filteredCount)
      setFilteredTotal(filteredCount)
      
      // ✅ Adjust pagination
      const adjustedPagination = {
        ...data.pagination,
        total_records: filteredCount,
        showing_range: {
          from: 1,
          to: filteredCount,
          of: filteredCount
        }
      }
      setPagination(adjustedPagination)
      
      console.log('Students loaded and filtered:', {
        page,
        limit,
        total: data.totals?.total_students,
        filtered: filteredCount,
        returned: studentsData.length,
        filter: statusFilter
      })
    } else {
      console.error('Failed to load students:', data.error)
      setStudents([])
    }
  } catch (error) {
    console.error('Error loading students:', error)
    setStudents([])
  } finally {
    setLoading(false)
  }
}

  // Load grades separately for filter dropdown
  const loadGrades = async () => {
    try {
      const schoolId = user?.SchoolID || user?.school_id
      const data = await apiGet(`/api/students?type=grades&school_id=${schoolId}`)  // ✅ Use apiGet
      
      if (data.success && data.grades) {
        const uniqueGrades = [...new Set(data.grades)].sort((a, b) => {
          const numA = parseInt(a)
          const numB = parseInt(b)
          if (!isNaN(numA) && !isNaN(numB)) {
            return numA - numB
          }
          return String(a).localeCompare(String(b))
        })
        setGrades(uniqueGrades)
      }
    } catch (error) {
      console.error('Error loading grades:', error)
    }
  }

  // Handle search with server-side filtering
  const handleSearchChange = (value) => {
    setSearchTerm(value)
    setCurrentPage(1)
    
    clearTimeout(window.searchTimeout)
    window.searchTimeout = setTimeout(() => {
      loadStudents(1, pageSize, value, selectedGrade, filterStatus)
    }, 500)
  }

  // Handle filter changes with server-side filtering
  const handleGradeChange = (value) => {
    setSelectedGrade(value)
    setCurrentPage(1)
    loadStudents(1, pageSize, searchTerm, value, filterStatus)
  }

  const handleStatusChange = (value) => {
    setFilterStatus(value)
    setCurrentPage(1)
    loadStudents(1, pageSize, searchTerm, selectedGrade, value)
  }

  // Handle page size change
  const handlePageSizeChange = (newPageSize) => {
    setPageSize(newPageSize)
    setCurrentPage(1)
    loadStudents(1, newPageSize, searchTerm, selectedGrade, filterStatus)
  }

  // Handle page change
  const handlePageChange = (newPage) => {
    setCurrentPage(newPage)
    loadStudents(newPage, pageSize, searchTerm, selectedGrade, filterStatus)
  }

  // Refresh function
  const handleRefresh = () => {
    loadStudents(currentPage, pageSize, searchTerm, selectedGrade, filterStatus)
    if (onRefresh) onRefresh()
  }

  // Load initial data
  useEffect(() => {
    loadStudents(1, pageSize)
    loadGrades()
  }, [])

  const filteredStudents = students

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
    setClearFields({ email: false, phone: false }) // ✅ MUST reset clearFields
    
    if (type === 'edit' && student) {
      setStudentForm({
        name: student.name || '',
        grade: student.grade || '',
        student_code: student.student_code || student.studentCode || '',
        parent_password: '', // Always blank (security)
        parent_email: student.parent_email || '', // ✅ Pre-fill
        parent_phone: student.parent_phone || '', // ✅ Pre-fill
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
    setClearFields({ email: false, phone: false }) // ✅ Reset clearFields
    setShowPasswords({
      addPassword: false,
      editPassword: false
    })
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
      let result
      
      if (modalType === 'add') {
        result = await apiPost('/api/students', {
          name: studentForm.name.trim(),
          grade: studentForm.grade,
          student_code: studentForm.student_code,
          school_id: user.school_id || user.SchoolID,
          is_active: studentForm.is_active
        })
        
        if (result.success && studentForm.parent_password && studentForm.parent_password.trim()) {
          await apiPost('/api/auth', {
            action: 'set_password',
            student_id: result.data.student_id,
            school_id: user.school_id || user.SchoolID,
            new_password: studentForm.parent_password
          })
        }
        
        if (result.success && (studentForm.parent_email?.trim() || studentForm.parent_phone?.trim())) {
          await apiPost('/api/auth', {
            action: 'update_parent_contact',
            student_id: result.data.student_id,
            parent_email: studentForm.parent_email?.trim() || null,
            parent_phone: studentForm.parent_phone?.trim() || null
          })
        }
        
      } else if (modalType === 'edit') {
        const updateData = {
          name: studentForm.name.trim(),
          grade: studentForm.grade,
          student_code: studentForm.student_code,
          is_active: studentForm.is_active
        }

        // ✅ ALWAYS include email/phone to allow clearing
        updateData.parent_email = clearFields.email 
          ? null 
          : (studentForm.parent_email?.trim() || null)
        
        updateData.parent_phone = clearFields.phone 
          ? null 
          : (studentForm.parent_phone?.trim() || null)

        result = await apiPut(
          `/api/students?student_id=${selectedStudent.id || selectedStudent.student_id}`, 
          updateData
        )
        
        if (result.success && studentForm.parent_password && studentForm.parent_password.trim()) {
          await apiPost('/api/auth', {
            action: 'set_password',
            student_id: selectedStudent.id || selectedStudent.student_id,
            school_id: user.school_id || user.SchoolID,
            new_password: studentForm.parent_password
          })
        }
      }
      
      if (result.success) {
        closeModal()
        handleRefresh()
        alert(modalType === 'add' ? '✅ Student added successfully!' : '✅ Student updated successfully!')
      }
    } catch (error) {
      console.error(`${modalType} student error:`, error)
      alert(`❌ Failed to ${modalType} student`)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (force = false) => {
    setLoading(true)
    
    try {
      const result = await apiDelete(`/api/students?student_id=${selectedStudent.id || selectedStudent.student_id}`, { force_delete: force })  // ✅ Use apiDelete
      
      if (result.success) {
        closeModal()
        handleRefresh()
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
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-6 bg-gradient-to-br from-indigo-50 to-purple-50 border-2 border-indigo-300 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <div className="flex items-center mb-2">
              <span className="text-3xl mr-3">👥</span>
              <h3 className="text-2xl font-extrabold text-gray-900">Student Management</h3>
            </div>
            <p className="text-gray-700 text-sm ml-11 font-semibold">
              {filteredTotal !== totalStudents ? (
                <>
                  📊 Showing <span className="font-bold">{pagination.showing_range?.from || 1}-{pagination.showing_range?.to || students.length}</span> 
                  of <span className="font-bold text-blue-600">{filteredTotal} filtered</span> results (<span className="font-bold">{totalStudents} total</span> students)
                </>
              ) : (
                <>
                  📊 Showing <span className="font-bold">{pagination.showing_range?.from || 1}-{pagination.showing_range?.to || students.length}</span> 
                  of <span className="font-bold text-blue-600">{totalStudents}</span> students
                </>
              )}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button 
              onClick={handleRefresh} 
              disabled={loading}
              variant="outline"
              className="border-2 border-gray-400 hover:bg-gray-100 shadow-md"
            >
              {loading ? '🔄 Loading...' : '🔄 Refresh'}
            </Button>
            <Button 
              onClick={() => openModal('add')}
              className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl"
            >
              ➕ Add Student
            </Button>
          </div>
        </div>
      </Card>

      {/* Filters and Pagination Controls */}
      <Card className="p-6 bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-300 shadow-lg">
        <div className="space-y-4">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <label className="block text-sm font-extrabold text-gray-900 mb-2">
                🔍 Search Students
              </label>
              <input
                type="text"
                placeholder="Search by name or student code..."
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full px-4 py-2 border-2 border-blue-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white shadow-sm font-medium text-gray-900"
              />
            </div>
            
            {/* Grade Filter */}
            <div className="w-full lg:w-48">
              <label className="block text-sm font-extrabold text-gray-900 mb-2">
                📚 Grade
              </label>
              <select
                value={selectedGrade}
                onChange={(e) => handleGradeChange(e.target.value)}
                className="w-full px-4 py-2 border-2 border-blue-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white shadow-sm font-bold text-gray-900"
              >
                <option value="">All Grades</option>
                {grades.map((grade) => (
                  <option key={grade} value={grade}>
                    Grade {grade}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Status Filter */}
            <div className="w-full lg:w-64">
              <label className="block text-sm font-extrabold text-gray-900 mb-2">
                📊 Status
              </label>
              <select
                value={filterStatus}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="w-full px-4 py-2 border-2 border-blue-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white shadow-sm font-bold text-gray-900"
              >
                <option value="all">All Students</option>
                <option value="active">Active Students</option>
                <option value="inactive">Inactive Students</option>
                <option value="with_password">With Parent Password</option>
                <option value="without_password">Need Parent Setup</option>
              </select>
            </div>
          </div>

          {/* Pagination Controls */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 border-t-2 border-blue-200">
            <div className="flex items-center gap-2">
              <label className="text-sm font-bold text-gray-700">📄 Items per page:</label>
              <select 
                value={pageSize} 
                onChange={(e) => handlePageSizeChange(e.target.value)}
                className="px-3 py-1 border-2 border-blue-300 rounded-lg text-gray-700 bg-white"
              >
                {pageSizeOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {pageSize !== 'all' && pagination.total_pages > 1 && (
              <div className="flex items-center gap-2">
                <Button 
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={!pagination.has_previous || loading}
                  variant="outline"
                  size="sm"
                  className="border-2 border-blue-300"
                >
                  ← Previous
                </Button>
                
                <span className="text-sm font-medium text-gray-700 px-3 py-1 bg-white rounded-lg border-2 border-blue-300">
                  Page {currentPage} of {pagination.total_pages}
                </span>
                
                <Button 
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={!pagination.has_more || loading}
                  variant="outline"
                  size="sm"
                  className="border-2 border-blue-300"
                >
                  Next →
                </Button>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Students Table */}
      <Card className="overflow-hidden border-2 border-indigo-300 shadow-lg bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gradient-to-r from-indigo-500 to-purple-600">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">
                  👤 Student
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">
                  📚 Grade
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider hidden sm:table-cell">
                  🆔 Student Code
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">
                  📊 Status
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">
                  ⚙️ Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center justify-center">
                      <div className="relative">
                        <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-200"></div>
                        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-indigo-600 absolute top-0 left-0"></div>
                      </div>
                      <p className="mt-4 font-medium">Loading students...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredStudents.length > 0 ? filteredStudents.map((student) => (
                <tr key={student.id || student.student_id} className="hover:bg-indigo-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="text-sm font-bold text-gray-900">{student.name}</div>
                    <div className="text-xs text-gray-500">ID: {student.id || student.student_id}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex px-3 py-1 text-xs font-bold rounded-full bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 border-2 border-blue-300">
                      {student.grade || 'N/A'}
                    </span>
                    <div className="mt-2">
                      {(() => {
                        // ✅ Check all possible field names
                        const hasPassword = student.ParentPasswordSet || student.parent_password_set || student.parentPasswordSet
                        const hasParent = hasPassword === true || hasPassword === 1
                        
                        return (
                          <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                            hasParent ? 
                            'bg-green-100 text-green-800 border-2 border-green-300' : 
                            'bg-yellow-100 text-yellow-800 border-2 border-yellow-300'
                          }`}>
                            {hasParent ? '✅ Parent OK' : '⚠️ Setup needed'}
                          </span>
                        )
                      })()}
                    </div>
                  </td>
                  <td className="px-6 py-4 hidden sm:table-cell">
                    <div className="text-sm font-mono font-bold text-gray-900 bg-gray-100 px-2 py-1 rounded border-2 border-gray-300 inline-block">
                      {student.studentCode || student.student_code || 'Not set'}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold border-2 ${
                      student.is_active !== false 
                        ? 'bg-green-100 text-green-800 border-green-300' 
                        : 'bg-gray-100 text-gray-800 border-gray-300'
                    }`}>
                      {student.is_active !== false ? '✅ Active' : '❌ Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col sm:flex-row gap-2">
                      <button 
                        onClick={() => openModal('view', student)}
                        className="text-blue-600 hover:text-blue-900 font-bold text-xs sm:text-sm"
                        disabled={loading}
                      >
                        👁️ View
                      </button>
                      <button 
                        onClick={() => openModal('edit', student)}
                        className="text-indigo-600 hover:text-indigo-900 font-bold text-xs sm:text-sm"
                        disabled={loading}
                      >
                        ✏️ Edit
                      </button>
                      <button 
                        onClick={() => openModal('delete', student)}
                        className="text-red-600 hover:text-red-900 font-bold text-xs sm:text-sm"
                        disabled={loading}
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                    <div className="text-5xl mb-3">📭</div>
                    <p className="font-medium">
                      {searchTerm || selectedGrade || filterStatus !== 'all' ? 
                        'No students match your filters' : 'No students found'}
                    </p>
                    <p className="text-sm mt-2">Try adjusting your search or filters</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Footer Pagination */}
      {pageSize !== 'all' && pagination.total_pages > 1 && !loading && (
        <Card className="p-4 bg-gradient-to-r from-gray-50 to-gray-100 border-2 border-gray-200">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="text-sm text-gray-700">
              📊 Showing <span className="font-bold">{pagination.showing_range?.from || 1}</span> to <span className="font-bold">{pagination.showing_range?.to || students.length}</span> 
              of <span className="font-bold text-blue-600">{filteredTotal}</span> results
            </div>
            
            <div className="flex items-center gap-2">
              <Button 
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={!pagination.has_previous}
                variant="outline"
                size="sm"
              >
                ← Previous
              </Button>
              
              <span className="text-sm font-medium text-gray-700 px-3 py-1 bg-white rounded-lg border-2 border-gray-300">
                {currentPage} of {pagination.total_pages}
              </span>
              
              <Button 
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={!pagination.has_more}
                variant="outline"
                size="sm"
              >
                Next →
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto border-4 border-indigo-300 shadow-2xl">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6 pb-4 border-b-2 border-indigo-200">
                <h4 className="text-2xl font-bold text-gray-900">
                  {modalType === 'add' && '➕ Add New Student'}
                  {modalType === 'edit' && '✏️ Edit Student'}
                  {modalType === 'delete' && '🗑️ Delete Student'}
                  {modalType === 'view' && '👁️ Student Details'}
                </h4>
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
                >
                  ✕
                </button>
              </div>

              {/* Modal Content */}
              {(modalType === 'add' || modalType === 'edit') && (
                <form onSubmit={handleSave} className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      👤 Student Name *
                    </label>
                    <input
                      type="text"
                      value={studentForm.name}
                      onChange={(e) => setStudentForm({...studentForm, name: e.target.value})}
                      className="w-full px-4 py-3 text-sm text-gray-900 border-2 border-indigo-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white shadow-sm"
                      placeholder="Enter full name"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      📚 Grade
                    </label>
                    <input
                      type="text"
                      value={studentForm.grade}
                      onChange={(e) => setStudentForm({...studentForm, grade: e.target.value})}
                      className="w-full px-4 py-3 text-sm text-gray-900 border-2 border-indigo-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white shadow-sm"
                      placeholder="e.g., 10th, Grade 5"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      🆔 Student Code
                    </label>
                    <input
                      type="text"
                      value={studentForm.student_code}
                      onChange={(e) => setStudentForm({...studentForm, student_code: e.target.value})}
                      className="w-full px-4 py-3 text-sm text-gray-900 border-2 border-indigo-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white shadow-sm font-mono"
                      placeholder="Optional unique code"
                    />
                  </div>

                  {/* Password field */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      🔐 Parent Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPasswords[modalType === 'add' ? 'addPassword' : 'editPassword'] ? "text" : "password"}
                        value={studentForm.parent_password}
                        onChange={(e) => setStudentForm({...studentForm, parent_password: e.target.value})}
                        className="w-full px-4 py-3 pr-12 text-sm text-gray-900 border-2 border-indigo-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white shadow-sm"
                        placeholder={modalType === 'edit' ? 'Leave blank to keep current' : 'Optional'}
                      />
                      <button
                        type="button"
                        onClick={() => togglePasswordVisibility(modalType === 'add' ? 'addPassword' : 'editPassword')}
                        className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-400 hover:text-gray-600"
                      >
                        {showPasswords[modalType === 'add' ? 'addPassword' : 'editPassword'] ? '👁️' : '🔒'}
                      </button>
                    </div>
                    {modalType === 'edit' && (
                      <p className="text-xs text-gray-500 mt-1">
                        Leave blank to keep current password
                      </p>
                    )}
                  </div>

                  {/* Email field with Remove checkbox */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      📧 Parent Email
                    </label>
                    <input
                      type="email"
                      value={studentForm.parent_email}
                      onChange={(e) => {
                        setStudentForm({...studentForm, parent_email: e.target.value})
                        if (e.target.value.trim()) {
                          setClearFields(prev => ({...prev, email: false}))
                        }
                      }}
                      disabled={modalType === 'edit' && clearFields.email}
                      className="w-full px-4 py-3 text-sm text-gray-900 border-2 border-indigo-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white shadow-sm disabled:bg-gray-100 disabled:text-gray-500"
                      placeholder="parent@example.com"
                    />
                    
                    {modalType === 'edit' && studentForm.parent_email && (
                      <div className="flex items-center mt-2 p-2 bg-red-50 rounded-lg border border-red-200">
                        <input
                          type="checkbox"
                          id="clearEmail"
                          checked={clearFields.email}
                          onChange={(e) => {
                            setClearFields(prev => ({...prev, email: e.target.checked}))
                            if (e.target.checked) {
                              setStudentForm({...studentForm, parent_email: ''})
                            }
                          }}
                          className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                        />
                        <label htmlFor="clearEmail" className="ml-2 block text-sm text-red-700 font-medium">
                          🗑️ Remove email (parent won't receive email notifications)
                        </label>
                      </div>
                    )}
                    
                    <p className="text-xs text-gray-500 mt-1">
                      {modalType === 'edit' 
                        ? 'Update to change email or check "Remove" to stop email notifications'
                        : 'Email for attendance notifications'}
                    </p>
                  </div>

                  {/* Phone field with Remove checkbox */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      📱 Parent Phone
                    </label>
                    <input
                      type="tel"
                      value={studentForm.parent_phone}
                      onChange={(e) => {
                        setStudentForm({...studentForm, parent_phone: e.target.value})
                        if (e.target.value.trim()) {
                          setClearFields(prev => ({...prev, phone: false}))
                        }
                      }}
                      disabled={modalType === 'edit' && clearFields.phone}
                      className="w-full px-4 py-3 text-sm text-gray-900 border-2 border-indigo-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white shadow-sm disabled:bg-gray-100 disabled:text-gray-500"
                      placeholder="+233123456789"
                    />
                    
                    {modalType === 'edit' && studentForm.parent_phone && (
                      <div className="flex items-center mt-2 p-2 bg-red-50 rounded-lg border border-red-200">
                        <input
                          type="checkbox"
                          id="clearPhone"
                          checked={clearFields.phone}
                          onChange={(e) => {
                            setClearFields(prev => ({...prev, phone: e.target.checked}))
                            if (e.target.checked) {
                              setStudentForm({...studentForm, parent_phone: ''})
                            }
                          }}
                          className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                        />
                        <label htmlFor="clearPhone" className="ml-2 block text-sm text-red-700 font-medium">
                          🗑️ Remove phone (parent won't receive SMS notifications)
                        </label>
                      </div>
                    )}
                    
                    <p className="text-xs text-gray-500 mt-1">
                      {modalType === 'edit'
                        ? 'Update to change phone or check "Remove" to stop SMS notifications'
                        : 'Phone for SMS notifications'}
                    </p>
                  </div>

                  {/* Active checkbox */}
                  <div className="flex items-center p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border-2 border-green-200">
                    <input
                      type="checkbox"
                      checked={studentForm.is_active}
                      onChange={(e) => setStudentForm({...studentForm, is_active: e.target.checked})}
                      className="h-5 w-5 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                    />
                    <label className="ml-3 block text-sm font-bold text-gray-900">✅ Active Student</label>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t-2 border-indigo-200">
                    <Button
                      type="submit"
                      disabled={loading}
                      className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg py-6"
                    >
                      {loading ? (modalType === 'add' ? '➕ Adding...' : '✏️ Updating...') : (modalType === 'add' ? '➕ Add Student' : '✏️ Update Student')}
                    </Button>
                    <Button
                      type="button"
                      onClick={closeModal}
                      disabled={loading}
                      variant="outline"
                      className="flex-1 border-2 border-gray-400 hover:bg-gray-100 py-6"
                    >
                      ✕ Cancel
                    </Button>
                  </div>
                </form>
              )}

              {modalType === 'view' && selectedStudent && (
                <div className="space-y-4">
                  <Card className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200">
                    <p className="text-sm"><strong className="text-gray-700">👤 Name:</strong> <span className="text-gray-900 font-medium">{selectedStudent.name}</span></p>
                  </Card>
                  <Card className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200">
                    <p className="text-sm"><strong className="text-gray-700">🆔 Student ID:</strong> <span className="text-gray-900 font-medium font-mono">{selectedStudent.id || selectedStudent.student_id}</span></p>
                  </Card>
                  <Card className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200">
                    <p className="text-sm"><strong className="text-gray-700">📚 Grade:</strong> <span className="text-gray-900 font-medium">{selectedStudent.grade || 'Not set'}</span></p>
                  </Card>
                  <Card className="p-4 bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-200">
                    <p className="text-sm"><strong className="text-gray-700">🔢 Student Code:</strong> <span className="text-gray-900 font-medium font-mono">{selectedStudent.student_code || selectedStudent.studentCode || 'Not set'}</span></p>
                  </Card>
                  <Card className="p-4 bg-gradient-to-r from-indigo-50 to-blue-50 border-2 border-indigo-200">
                    <p className="text-sm"><strong className="text-gray-700">📊 Status:</strong> <span className={`font-bold ${selectedStudent.is_active !== false ? 'text-green-600' : 'text-gray-600'}`}>{selectedStudent.is_active !== false ? '✅ Active' : '❌ Inactive'}</span></p>
                  </Card>
                  <Card className="p-4 bg-gradient-to-r from-pink-50 to-red-50 border-2 border-pink-200">
                    <p className="text-sm"><strong className="text-gray-700">🔐 Parent Password:</strong> <span className={`font-bold ${(selectedStudent.parentPasswordSet || selectedStudent.parent_password_set) ? 'text-green-600' : 'text-yellow-600'}`}>{(selectedStudent.parentPasswordSet || selectedStudent.parent_password_set) ? '✅ Set' : '⚠️ Not set'}</span></p>
                  </Card>
                  <Card className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200">
                    <p className="text-sm"><strong className="text-gray-700">📧 Parent Email:</strong> <span className="text-gray-900 font-medium">{selectedStudent.parent_email || 'Not provided'}</span></p>
                    </Card>
                    <Card className="p-4 bg-gradient-to-r from-cyan-50 to-blue-50 border-2 border-cyan-200">
                    <p className="text-sm"><strong className="text-gray-700">📱 Parent Phone:</strong> <span className="text-gray-900 font-medium">{selectedStudent.parent_phone || 'Not provided'}</span></p>
                    </Card>
                  <Card className="p-4 bg-gradient-to-r from-cyan-50 to-blue-50 border-2 border-cyan-200">
                    <p className="text-sm"><strong className="text-gray-700">⏰ Last Activity:</strong> <span className="text-gray-900 font-medium">{
                      selectedStudent.last_activity 
                        ? new Date(selectedStudent.last_activity).toLocaleString()
                        : 'No activity'
                    }</span></p>
                  </Card>
                  <div className="flex justify-end pt-4 border-t-2 border-indigo-200">
                    <Button
                      onClick={closeModal}
                      variant="outline"
                      className="border-2 border-gray-400 hover:bg-gray-100"
                    >
                      ✕ Close
                    </Button>
                  </div>
                </div>
              )}

              {modalType === 'delete' && selectedStudent && (
                <div className="space-y-4">
                  <Card className="p-4 bg-gradient-to-r from-red-50 to-pink-50 border-2 border-red-200">
                    <p className="text-gray-700">
                      Are you sure you want to delete <strong className="text-red-600">{selectedStudent.name}</strong>?
                    </p>
                  </Card>
                  
                  <Card className="p-4 bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-300">
                    <div className="flex items-start">
                      <span className="text-3xl mr-3">⚠️</span>
                      <div>
                        <h3 className="text-sm font-bold text-yellow-900 mb-2">
                          This student may have related data
                        </h3>
                        <p className="text-sm text-yellow-800">
                          This student might have attendance records, parent accounts, or other related data that will affect the deletion process.
                        </p>
                      </div>
                    </div>
                  </Card>

                  <div className="space-y-3">
                    <Card className="p-4 bg-gradient-to-r from-blue-50 to-cyan-50 border-2 border-blue-300">
                      <h4 className="text-sm font-bold text-blue-900 mb-2">✅ Recommended: Deactivate Student</h4>
                      <p className="text-sm text-blue-800 mb-3">
                        Marks the student as inactive but keeps all attendance records and related data. 
                        The student won't appear in active lists but data is preserved for reports.
                      </p>
                      <Button
                        onClick={() => handleDelete(false)}
                        className="w-full bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white shadow-md"
                        disabled={loading}
                      >
                        {loading ? '⏳ Processing...' : '✅ Deactivate Student (Recommended)'}
                      </Button>
                    </Card>

                    <Card className="p-4 bg-gradient-to-r from-red-50 to-pink-50 border-2 border-red-300">
                      <h4 className="text-sm font-bold text-red-900 mb-2">⚠️ Permanent Deletion</h4>
                      <p className="text-sm text-red-800 mb-3">
                        <strong>Warning:</strong> This will permanently delete the student AND all related data including:
                      </p>
                      <ul className="text-sm text-red-800 mb-3 ml-4 list-disc">
                        <li>All attendance records</li>
                        <li>Parent accounts and logins</li>
                        <li>Historical data for reports</li>
                      </ul>
                      <p className="text-xs text-red-700 font-bold mb-3">
                        ⛔ This action cannot be undone!
                      </p>
                      <Button
                        onClick={() => handleDelete(true)}
                        className="w-full bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white shadow-md"
                        disabled={loading}
                      >
                        {loading ? '⏳ Processing...' : '⛔ Permanently Delete All Data'}
                      </Button>
                    </Card>
                  </div>

                  <div className="pt-4 border-t-2 border-gray-200">
                    <Button
                      onClick={closeModal}
                      variant="outline"
                      className="w-full border-2 border-gray-400 hover:bg-gray-100"
                      disabled={loading}
                    >
                      ✕ Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}

export default StudentsTab