import { useState } from 'react'
import { Card } from '../ui/card'
import { Button } from '../ui/button'
import { apiPost } from '@/lib/api'

interface UploadStudentsTabProps {
  user: any
  onUploadComplete: () => void
}

function UploadStudentsTab({ user, onUploadComplete }: UploadStudentsTabProps) {
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [results, setResults] = useState(null)

  const downloadTemplate = () => {
    const schoolId = user.school_id || user.SchoolID || 2  
    const csvContent = [
      [`# Template for School ID: ${schoolId}`, '', '', '', '', '', ''],
      [`# Generated: ${new Date().toISOString()}`, '', '', '', '', '', ''],
      // Headers
      ['name', 'grade', 'student_code', 'parent_name', 'parent_email', 'parent_phone', 'parent_password'],
      // Example data
      ['John Smith', '10th', 'JS001', 'Mary Smith', 'mary.smith@email.com', '+233244567890', '12345'],
      ['Jane Doe', '9th', 'JD002', 'Robert Doe', 'robert.doe@email.com', '+233244567891', '12345'],
      ['Mike Johnson', '11th', 'MJ003', 'Sarah Johnson', 'sarah.johnson@email.com', '+233244567892', '12345'],
      ['', '', '', '', '', '', ''],
      // Instructions
      ['INSTRUCTIONS:', '', '', '', '', '', ''],
      ['- name: Student full name (required)', '', '', '', '', '', ''],
      ['- grade: Student grade/class', '', '', '', '', '', ''],
      ['- student_code: Unique identifier (optional)', '', '', '', '', '', ''],
      ['- parent_name: Parent/Guardian name (optional)', '', '', '', '', '', ''],
      ['- parent_email: Parent email for notifications', '', '', '', '', '', ''],
      ['- parent_phone: Parent phone number', '', '', '', '', '', ''],
      ['- parent_password: Default "12345", parent can change later', '', '', '', '', '', '']
    ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `student_upload_template_school_${schoolId}_${new Date().toISOString().split('T')[0]}.csv`
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
      formData.append('school_id', user.school_id || user.SchoolID || 2)

      setUploading(true)
      setResults(null)

      try {
        // Note: For FormData, we still need to use fetch directly
        // because our apiPost helper uses JSON
        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData
        })

        const result = await response.json()
        setResults(result)
        
        if (result.success) {
          onUploadComplete()
          alert(`Upload successful! ${result.summary?.students_added || 0} students added, ${result.summary?.students_updated || 0} updated, ${result.summary?.parents_created || 0} parent records created.`)
        }
      } catch (error) {
        console.error('Upload error:', error)
        setResults({ success: false, error: 'Upload failed: Network error' })
      } finally {
        setUploading(false)
      }
    }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-300 shadow-lg">
        <div className="flex items-start">
          <span className="text-4xl mr-4">📤</span>
          <div>
            <h3 className="text-2xl font-extrabold text-gray-900 mb-2">Upload Students with Parent Information</h3>
            <p className="text-sm text-gray-800 font-semibold">
              Bulk upload students and automatically create parent accounts with contact information
            </p>
          </div>
        </div>
      </Card>
      
      {/* Enhanced Template Info */}
      <Card className="p-6 bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-300 shadow-lg">
        <div className="flex items-start mb-4">
          <span className="text-3xl mr-3">📋</span>
          <h4 className="text-xl font-extrabold text-blue-900">Enhanced CSV Template</h4>
        </div>
        <p className="text-sm text-blue-900 mb-4 font-semibold">
          New template includes parent contact information and default passwords. 
          Download the template to ensure your CSV file has the correct format.
        </p>
        
        <div className="bg-white rounded-lg p-4 mb-4 border-2 border-blue-200">
          <p className="font-bold text-blue-900 mb-3">New Features:</p>
          <ul className="space-y-2 text-sm text-blue-800">
            <li className="flex items-start">
              <span className="mr-2">👤</span>
              <span>Parent name, email, and phone number columns</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">🔐</span>
              <span>Default password "12345" for all parents</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">🔓</span>
              <span>Parents can login immediately and change password later</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">⚡</span>
              <span>Automatic parent account creation</span>
            </li>
          </ul>
        </div>
        
        <Button
          onClick={downloadTemplate}
          className="bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white shadow-lg hover:shadow-xl"
        >
          📥 Download Enhanced Template
        </Button>
      </Card>

      {/* Important Notes */}
      <Card className="p-6 bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-yellow-400 shadow-lg">
        <div className="flex items-start mb-4">
          <span className="text-3xl mr-3">⚠️</span>
          <h4 className="text-xl font-extrabold text-yellow-900">Important Notes</h4>
        </div>
        <div className="space-y-3">
          <div className="bg-white rounded-lg p-3 border-2 border-yellow-200">
            <p className="text-sm text-yellow-900">
              <strong className="text-yellow-900">🔐 Default Password:</strong> All parents will get "12345" as default password
            </p>
          </div>
          <div className="bg-white rounded-lg p-3 border-2 border-yellow-200">
            <p className="text-sm text-yellow-900">
              <strong className="text-yellow-900">👤 Parent Login:</strong> Parents can login using their child's full name + "12345"
            </p>
          </div>
          <div className="bg-white rounded-lg p-3 border-2 border-yellow-200">
            <p className="text-sm text-yellow-900">
              <strong className="text-yellow-900">🔄 Password Reset:</strong> Parents can change their password using the "Reset Password" option
            </p>
          </div>
          <div className="bg-white rounded-lg p-3 border-2 border-yellow-200">
            <p className="text-sm text-yellow-900">
              <strong className="text-yellow-900">📧 Contact Info:</strong> Email and phone are optional but recommended for notifications
            </p>
          </div>
        </div>
      </Card>

      {/* Upload Form */}
      <Card className="p-6 bg-gradient-to-br from-indigo-50 to-purple-50 border-2 border-indigo-300 shadow-lg">
        <form onSubmit={handleFileUpload} className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-3">
              📁 Select Enhanced CSV File to Upload
            </label>
            <div className="flex items-center justify-center w-full">
              <label className="flex flex-col items-center justify-center w-full h-40 border-4 border-indigo-300 border-dashed rounded-lg cursor-pointer bg-white hover:bg-indigo-50 transition-all">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <svg className="w-12 h-12 mb-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <p className="mb-2 text-sm text-gray-700 font-bold">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-xs text-gray-500">CSV files with parent information</p>
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
              <Card className="mt-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300">
                <div className="flex items-start">
                  <span className="text-2xl mr-3">✅</span>
                  <div>
                    <p className="text-sm font-bold text-green-900">
                      Selected: <span className="text-green-700">{file.name}</span>
                    </p>
                    <p className="text-xs text-green-700 mt-2">
                      Make sure your CSV includes columns: name, grade, student_code, parent_name, parent_email, parent_phone, parent_password
                    </p>
                  </div>
                </div>
              </Card>
            )}
          </div>

          <Button
            type="submit"
            disabled={!file || uploading}
            className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl py-6 text-lg font-bold"
          >
            {uploading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white inline" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Uploading Students & Parents...
              </>
            ) : (
              '📤 Upload Students & Parent Data'
            )}
          </Button>
        </form>
      </Card>

      {/* Results Section */}
      {results && (
        <Card className={`p-6 border-2 shadow-lg ${
          results.success 
            ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-400' 
            : 'bg-gradient-to-br from-red-50 to-pink-50 border-red-400'
        }`}>
          <div className="flex items-start mb-4">
            <span className="text-3xl mr-3">{results.success ? '✅' : '❌'}</span>
            <h4 className={`text-xl font-extrabold ${results.success ? 'text-green-900' : 'text-red-900'}`}>
              Upload Results
            </h4>
          </div>
                    
          {results.success ? (
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Card className="p-3 bg-white border-2 border-green-200">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">👥 Students Added:</span>
                    <span className="text-2xl font-bold text-green-600">{results.summary?.students_added || 0}</span>
                  </div>
                </Card>
                <Card className="p-3 bg-white border-2 border-blue-200">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">🔄 Students Updated:</span>
                    <span className="text-2xl font-bold text-blue-600">{results.summary?.students_updated || 0}</span>
                  </div>
                </Card>
                <Card className="p-3 bg-white border-2 border-purple-200">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">👨‍👩‍👧 Parents Created:</span>
                    <span className="text-2xl font-bold text-purple-600">{results.summary?.parents_created || 0}</span>
                  </div>
                </Card>
                <Card className="p-3 bg-white border-2 border-indigo-200">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">🔄 Parents Updated:</span>
                    <span className="text-2xl font-bold text-indigo-600">{results.summary?.parents_updated || 0}</span>
                  </div>
                </Card>
                <Card className="p-3 bg-white border-2 border-orange-200 md:col-span-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">🔐 Default Passwords Set:</span>
                    <span className="text-2xl font-bold text-orange-600">{results.summary?.default_passwords_set || 0}</span>
                  </div>
                </Card>
              </div>
              
              {results.warnings && results.warnings.length > 0 && (
                <Card className="p-4 bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-300">
                  <div className="flex items-start">
                    <span className="text-2xl mr-3">⚠️</span>
                    <div className="flex-1">
                      <p className="font-bold text-yellow-900 mb-2">Warnings:</p>
                      <ul className="space-y-1 text-sm text-yellow-800">
                        {results.warnings.map((warning, index) => (
                          <li key={index} className="flex items-start">
                            <span className="mr-2">•</span>
                            <span>{warning}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </Card>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <Card className="p-4 bg-white border-2 border-red-300">
                <p className="text-sm text-red-900">
                  <strong className="text-red-900">Error:</strong> {results.error}
                </p>
              </Card>
              {results.details && (
                <Card className="p-4 bg-white border-2 border-red-300">
                  <p className="font-bold text-red-900 mb-2">Details:</p>
                  <pre className="text-xs bg-red-100 p-3 rounded-lg overflow-x-auto border-2 border-red-200">
                    {results.details}
                  </pre>
                </Card>
              )}
            </div>
          )}
        </Card>
      )}
    </div>
  )
}

export default UploadStudentsTab