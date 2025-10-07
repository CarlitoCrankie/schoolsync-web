import { useState, useEffect } from 'react'
import { Card } from '../ui/card'
import { Button } from '../ui/button'

interface SchoolsNetworkTabProps {
  companyId?: string
  user: any
}

function SchoolsNetworkTab({ companyId, user }: SchoolsNetworkTabProps) {
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
  
  const [showPasswords, setShowPasswords] = useState({
    adminPassword: false
  })

  const togglePasswordVisibility = (field) => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }))
  }

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
    setShowPasswords({ adminPassword: false })
    setError('')
  }

  if (loading) {
    return (
      <Card className="p-12 bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200">
        <div className="flex flex-col items-center justify-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200"></div>
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-indigo-600 absolute top-0 left-0"></div>
          </div>
          <p className="mt-6 text-lg font-medium text-gray-700">🏫 Loading schools network...</p>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div className="flex items-start">
            <span className="text-4xl mr-4">🌐</span>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Schools Network Management</h2>
              <p className="text-sm text-gray-600 mt-1">Manage all schools in your network</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button 
              onClick={fetchSchoolsData}
              disabled={actionLoading}
              variant="outline"
              className="border-2 border-gray-400 hover:bg-gray-100 shadow-md"
            >
              🔄 Refresh
            </Button>
            <Button 
              onClick={() => setShowAddModal(true)}
              disabled={actionLoading}
              className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl"
            >
              ➕ Add New School
            </Button>
          </div>
        </div>
      </Card>

      {/* Network Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200">
          <h3 className="text-xs font-bold text-gray-600 mb-2">🏫 Total Schools</h3>
          <p className="text-3xl font-bold text-blue-600">{schools.length}</p>
        </Card>
        <Card className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200">
          <h3 className="text-xs font-bold text-gray-600 mb-2">✅ Active</h3>
          <p className="text-3xl font-bold text-green-600">
            {schools.filter(s => s.status === 'active').length}
          </p>
        </Card>
        <Card className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200">
          <h3 className="text-xs font-bold text-gray-600 mb-2">🟢 Online</h3>
          <p className="text-3xl font-bold text-purple-600">
            {schools.filter(s => s.sync_agent?.connection_status === 'Online').length}
          </p>
        </Card>
        <Card className="p-4 bg-gradient-to-br from-red-50 to-pink-50 border-2 border-red-200">
          <h3 className="text-xs font-bold text-gray-600 mb-2">❌ Inactive</h3>
          <p className="text-3xl font-bold text-red-600">
            {schools.filter(s => s.status === 'inactive').length}
          </p>
        </Card>
      </div>

      {/* Schools Table */}
      <Card className="overflow-hidden border-2 border-indigo-200">
        <div className="p-6 bg-gradient-to-r from-indigo-50 to-purple-50 border-b-2 border-indigo-200">
          <div className="flex items-center">
            <span className="text-2xl mr-3">📋</span>
            <h3 className="text-lg font-bold text-gray-900">Schools List</h3>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gradient-to-r from-indigo-500 to-purple-600">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">🏫 School</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider hidden sm:table-cell">📍 Location</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider hidden sm:table-cell">👥 Students</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">📊 Status</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">⚙️ Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {schools.length > 0 ? schools.map((school) => (
                <tr key={school.school_id} className={`transition-colors ${school.status === 'inactive' ? 'bg-gray-50' : 'hover:bg-indigo-50'}`}>
                  <td className="px-6 py-4">
                    <div className="text-sm font-bold text-gray-900">{school.name}</div>
                    <div className="text-xs text-gray-500">ID: {school.school_id}</div>
                    <div className="text-xs text-gray-500 sm:hidden">
                      {school.location} • {school.students?.active || 0}/{school.students?.total || 0} students
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 hidden sm:table-cell">
                    {school.location}
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-gray-900 hidden sm:table-cell">
                    <span className="text-green-600">{school.students?.active || 0}</span>
                    <span className="text-gray-400">/</span>
                    <span className="text-blue-600">{school.students?.total || 0}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-2">
                      <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold border-2 ${
                        school.status === 'active' 
                          ? 'bg-green-100 text-green-800 border-green-300' 
                          : 'bg-red-100 text-red-800 border-red-300'
                      }`}>
                        {school.status === 'active' ? '✅ Active' : '❌ Inactive'}
                      </span>
                      <div>
                        <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold border-2 ${
                          school.sync_agent?.connection_status === 'Online' 
                            ? 'bg-green-100 text-green-800 border-green-300' :
                          school.sync_agent?.connection_status === 'Warning' 
                            ? 'bg-yellow-100 text-yellow-800 border-yellow-300' :
                          'bg-red-100 text-red-800 border-red-300'
                        }`}>
                          {school.sync_agent?.connection_status === 'Online' ? '🟢 Online' :
                           school.sync_agent?.connection_status === 'Warning' ? '⚠️ Warning' :
                           '🔴 Offline'}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-2">
                      <button 
                        onClick={() => openEditModal(school)}
                        disabled={actionLoading}
                        className="text-blue-600 hover:text-blue-900 disabled:opacity-50 text-xs font-bold"
                      >
                        ✏️ Edit
                      </button>
                      {school.status === 'active' ? (
                        <button 
                          onClick={() => handleDisableSchool(school.school_id, school.name)}
                          disabled={actionLoading}
                          className="text-orange-600 hover:text-orange-900 disabled:opacity-50 text-xs font-bold"
                        >
                          ⏸️ Disable
                        </button>
                      ) : (
                        <button 
                          onClick={() => handleEnableSchool(school.school_id, school.name)}
                          disabled={actionLoading}
                          className="text-green-600 hover:text-green-900 disabled:opacity-50 text-xs font-bold"
                        >
                          ▶️ Enable
                        </button>
                      )}
                      <button 
                        onClick={() => openDeleteModal(school)}
                        disabled={actionLoading}
                        className="text-red-600 hover:text-red-900 disabled:opacity-50 text-xs font-bold"
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                    <div className="text-5xl mb-3">🏫</div>
                    <p className="font-medium">No schools found</p>
                    <p className="text-sm mt-2">Click "Add New School" to get started</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add School Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto border-4 border-blue-300 shadow-2xl">
            <div className="p-6">
              <div className="flex items-center mb-6 pb-4 border-b-2 border-blue-200">
                <span className="text-3xl mr-3">➕</span>
                <h3 className="text-2xl font-bold text-gray-900">Add New School</h3>
              </div>
              
              {error && (
                <Card className="mb-4 p-4 bg-gradient-to-r from-red-50 to-pink-50 border-2 border-red-300">
                  <div className="flex items-center">
                    <span className="text-2xl mr-3">❌</span>
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </Card>
              )}
              
              <div className="space-y-6">
                <Card className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200">
                  <h4 className="font-bold text-blue-900 mb-4">🏫 School Information</h4>
                  <div className="space-y-3">
                    <input
                      type="text"
                      placeholder="School Name *"
                      value={newSchool.name}
                      onChange={(e) => setNewSchool({...newSchool, name: e.target.value})}
                      className="w-full px-4 py-3 border-2 border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm"
                      required
                    />
                    <input
                      type="text"
                      placeholder="Location *"
                      value={newSchool.location}
                      onChange={(e) => setNewSchool({...newSchool, location: e.target.value})}
                      className="w-full px-4 py-3 border-2 border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm"
                      required
                    />
                    <input
                      type="text"
                      placeholder="Machine ID (optional)"
                      value={newSchool.machineId}
                      onChange={(e) => setNewSchool({...newSchool, machineId: e.target.value})}
                      className="w-full px-4 py-3 border-2 border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm"
                    />
                  </div>
                </Card>

                <Card className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200">
                  <h4 className="font-bold text-purple-900 mb-4">👤 Admin Account</h4>
                  <div className="space-y-3">
                    <input
                      type="text"
                      placeholder="Admin Username (auto-generates if empty)"
                      value={newSchool.adminUsername}
                      onChange={(e) => setNewSchool({...newSchool, adminUsername: e.target.value})}
                      className="w-full px-4 py-3 border-2 border-purple-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white shadow-sm"
                    />
                    <div className="relative">
                      <input
                        type={showPasswords.adminPassword ? "text" : "password"}
                        placeholder="Admin Password (auto-generates if empty)"
                        value={newSchool.adminPassword}
                        onChange={(e) => setNewSchool({...newSchool, adminPassword: e.target.value})}
                        className="w-full px-4 py-3 pr-12 border-2 border-purple-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white shadow-sm"
                      />
                      <button
                        type="button"
                        onClick={() => togglePasswordVisibility('adminPassword')}
                        className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-400 hover:text-gray-600"
                      >
                        {showPasswords.adminPassword ? '👁️' : '🔒'}
                      </button>
                    </div>
                    <input
                      type="email"
                      placeholder="Admin Email (optional)"
                      value={newSchool.adminEmail}
                      onChange={(e) => setNewSchool({...newSchool, adminEmail: e.target.value})}
                      className="w-full px-4 py-3 border-2 border-purple-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white shadow-sm"
                    />
                  </div>
                  <Card className="mt-3 p-3 bg-white border-2 border-purple-200">
                    <p className="text-xs text-purple-700">
                      💡 If username or password are left empty, they will be auto-generated and shown after creation.
                    </p>
                  </Card>
                </Card>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 mt-6 pt-6 border-t-2 border-blue-200">
                <Button
                  onClick={closeModals}
                  variant="outline"
                  className="flex-1 border-2 border-gray-400 hover:bg-gray-100 py-6"
                  disabled={actionLoading}
                >
                  ✕ Cancel
                </Button>
                <Button
                  onClick={handleCreateSchool}
                  disabled={actionLoading || !newSchool.name || !newSchool.location}
                  className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg py-6"
                >
                  {actionLoading ? '⏳ Creating...' : '➕ Create School'}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Edit School Modal */}
      {showEditModal && editingSchool && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl mx-4 border-4 border-green-300 shadow-2xl">
            <div className="p-6">
              <div className="flex items-center mb-6 pb-4 border-b-2 border-green-200">
                <span className="text-3xl mr-3">✏️</span>
                <h3 className="text-2xl font-bold text-gray-900">Edit School: {editingSchool.name}</h3>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">🏫 School Name</label>
                  <input
                    type="text"
                    value={schoolForm.name}
                    onChange={(e) => setSchoolForm({...schoolForm, name: e.target.value})}
                    className="w-full px-4 py-3 border-2 border-green-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white shadow-sm"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">📍 Location</label>
                  <input
                    type="text"
                    value={schoolForm.location}
                    onChange={(e) => setSchoolForm({...schoolForm, location: e.target.value})}
                    className="w-full px-4 py-3 border-2 border-green-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white shadow-sm"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">🖥️ Machine ID</label>
                  <input
                    type="text"
                    value={schoolForm.machineId}
                    onChange={(e) => setSchoolForm({...schoolForm, machineId: e.target.value})}
                    className="w-full px-4 py-3 border-2 border-green-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white shadow-sm"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">📊 Status</label>
                  <select
                    value={schoolForm.status}
                    onChange={(e) => setSchoolForm({...schoolForm, status: e.target.value})}
                    className="w-full px-4 py-3 border-2 border-green-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white shadow-sm"
                  >
                    <option value="active">✅ Active</option>
                    <option value="inactive">❌ Inactive</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 mt-6 pt-6 border-t-2 border-green-200">
                <Button
                  onClick={closeModals}
                  variant="outline"
                  className="flex-1 border-2 border-gray-400 hover:bg-gray-100 py-6"
                  disabled={actionLoading}
                >
                  ✕ Cancel
                </Button>
                <Button
                  onClick={handleEditSchool}
                  disabled={actionLoading || !schoolForm.name || !schoolForm.location}
                  className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg py-6"
                >
                  {actionLoading ? '⏳ Saving...' : '💾 Save Changes'}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && schoolToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl mx-4 border-4 border-red-300 shadow-2xl">
            <div className="p-6">
              <div className="text-center mb-6">
                <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
                  <span className="text-4xl">⚠️</span>
                </div>
                <h3 className="text-2xl font-bold text-gray-900">Delete School</h3>
                <p className="text-sm text-gray-600 mt-2">
                  This action cannot be undone. Choose how to proceed:
                </p>
              </div>

              <Card className="p-4 bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-300 mb-4">
                <h4 className="font-bold text-yellow-900 mb-3">🏫 School: {schoolToDelete.name}</h4>
                <div className="text-sm text-yellow-800 space-y-1">
                  <div>📍 Location: {schoolToDelete.location}</div>
                  <div>👥 Students: {schoolToDelete.students?.total || 0}</div>
                  <div>📊 Status: {schoolToDelete.status}</div>
                </div>
              </Card>

              <div className="space-y-3 mb-6">
                <Card className="p-4 bg-gradient-to-r from-orange-50 to-yellow-50 border-2 border-orange-300">
                  <h5 className="font-bold text-orange-900 text-sm mb-2">⏸️ Soft Delete (Recommended)</h5>
                  <p className="text-xs text-orange-800">
                    Deactivates the school and admin users. Preserves all data for historical records.
                  </p>
                </Card>
                
                <Card className="p-4 bg-gradient-to-r from-red-50 to-pink-50 border-2 border-red-300">
                  <h5 className="font-bold text-red-900 text-sm mb-2">🗑️ Permanent Delete (Destructive)</h5>
                  <p className="text-xs text-red-800">
                    Completely removes school, students, attendance records, and all related data from the database. This cannot be undone!
                  </p>
                </Card>
              </div>

              <div className="flex flex-col gap-3">
                <Button
                  onClick={() => handleDeleteSchool(false)}
                  disabled={actionLoading}
                  className="w-full bg-gradient-to-r from-orange-500 to-yellow-600 hover:from-orange-600 hover:to-yellow-700 text-white shadow-lg py-6"
                >
                  {actionLoading ? '⏳ Processing...' : '⏸️ Soft Delete (Deactivate)'}
                </Button>
                
                <Button
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
                  className="w-full bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white shadow-lg py-6"
                >
                  {actionLoading ? '⏳ Deleting...' : '🗑️ Permanent Delete (All Data)'}
                </Button>
                
                <Button
                  onClick={closeModals}
                  disabled={actionLoading}
                  variant="outline"
                  className="w-full border-2 border-gray-400 hover:bg-gray-100 py-6"
                >
                  ✕ Cancel
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Admin Credentials Display Modal */}
      {showCredentialsModal && createdSchoolCredentials && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl mx-4 border-4 border-green-300 shadow-2xl">
            <div className="p-6">
              <div className="text-center mb-6">
                <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
                  <span className="text-4xl">✅</span>
                </div>
                <h3 className="text-2xl font-bold text-gray-900">School Created Successfully!</h3>
                <p className="text-sm text-gray-600 mt-2">
                  The school has been created with an admin account. Please save these credentials securely.
                </p>
              </div>

              <Card className="p-6 bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-yellow-300 mb-4">
                <h4 className="font-bold text-yellow-900 mb-4 text-lg">🔐 Admin Login Credentials</h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-white rounded-lg border-2 border-yellow-200">
                    <span className="font-bold text-yellow-800">👤 Username:</span>
                    <span className="font-mono font-bold text-gray-900 px-3 py-1 bg-gray-100 rounded border-2 border-gray-300">
                      {createdSchoolCredentials.username}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-white rounded-lg border-2 border-yellow-200">
                    <span className="font-bold text-yellow-800">🔑 Password:</span>
                    <span className="font-mono font-bold text-gray-900 px-3 py-1 bg-gray-100 rounded border-2 border-gray-300">
                      {createdSchoolCredentials.password}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-white rounded-lg border-2 border-yellow-200">
                    <span className="font-bold text-yellow-800">🏫 School ID:</span>
                    <span className="font-mono font-bold text-gray-900 px-3 py-1 bg-gray-100 rounded border-2 border-gray-300">
                      {createdSchoolCredentials.school_id}
                    </span>
                  </div>
                  {createdSchoolCredentials.email && (
                    <div className="flex justify-between items-center p-3 bg-white rounded-lg border-2 border-yellow-200">
                      <span className="font-bold text-yellow-800">📧 Email:</span>
                      <span className="font-mono font-bold text-gray-900 px-3 py-1 bg-gray-100 rounded border-2 border-gray-300">
                        {createdSchoolCredentials.email}
                      </span>
                    </div>
                  )}
                </div>
              </Card>

              <Card className="p-4 bg-gradient-to-r from-red-50 to-pink-50 border-2 border-red-300 mb-6">
                <div className="flex items-start">
                  <span className="text-2xl mr-3">⚠️</span>
                  <p className="text-sm text-red-800">
                    <strong>Important:</strong> Save these credentials immediately. They will not be shown again. 
                    Share them securely with the school administrator.
                  </p>
                </div>
              </Card>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button
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
                  className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg py-6"
                >
                  📋 Copy to Clipboard
                </Button>
                <Button
                  onClick={() => {
                    setShowCredentialsModal(false)
                    setCreatedSchoolCredentials(null)
                  }}
                  variant="outline"
                  className="flex-1 border-2 border-gray-400 hover:bg-gray-100 py-6"
                >
                  ✕ Close
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}

export default SchoolsNetworkTab