import { useState } from 'react'

export default function NotificationTest() {
  const [testResults, setTestResults] = useState(null)
  const [loading, setLoading] = useState(false)

  const testNotificationForDaniella = async () => {
    setLoading(true)
    try {
      // Test notification data for DANIELLA (ID: 13)
      const response = await fetch('/api/sync-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'test_notification_data',
          data: { studentId: 13, schoolId: 1 }
        })
      })

      const result = await response.json()
      setTestResults(result)
      console.log('DANIELLA Notification Test Results:', result)
    } catch (error) {
      setTestResults({
        success: false,
        error: error.message
      })
    } finally {
      setLoading(false)
    }
  }

  const simulateCheckinForDaniella = async () => {
    setLoading(true)
    try {
      // Simulate fingerprint scan for DANIELLA
      const response = await fetch('/api/sync-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'simulate_checkinout',
          data: { 
            studentId: 13,
            status: 'IN',
            schoolId: 1
          }
        })
      })

      const result = await response.json()
      setTestResults(result)
      console.log('DANIELLA Check-in Simulation Results:', result)
      
      if (result.success) {
        alert('✅ Check-in simulated! This should trigger notifications to parent.')
      }
    } catch (error) {
      setTestResults({
        success: false,
        error: error.message
      })
    } finally {
      setLoading(false)
    }
  }

  const checkParentContactInfo = async () => {
    setLoading(true)
    try {
      // Check parent contact info for DANIELLA
      const response = await fetch('/api/sync-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get_parent_contact',
          data: { studentId: 13 }
        })
      })

      const result = await response.json()
      setTestResults(result)
      console.log('DANIELLA Parent Contact Info:', result)
    } catch (error) {
      setTestResults({
        success: false,
        error: error.message
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">
        🧪 Notification Test for DANIELLA AKU-SIKA ABBIW (ID: 13)
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <button
          onClick={checkParentContactInfo}
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          📞 Check Parent Contact Info
        </button>

        <button
          onClick={testNotificationForDaniella}
          disabled={loading}
          className="bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 disabled:opacity-50"
        >
          📱 Test Notification Content
        </button>

        <button
          onClick={simulateCheckinForDaniella}
          disabled={loading}
          className="bg-purple-600 text-white px-4 py-3 rounded-lg hover:bg-purple-700 disabled:opacity-50"
        >
          👆 Simulate Fingerprint Scan
        </button>
      </div>

      {loading && (
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Testing...</p>
        </div>
      )}

      {testResults && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold text-gray-900 mb-3">Test Results:</h3>
          
          {testResults.success ? (
            <div className="space-y-4">
              {/* Student Data */}
              {testResults.result?.studentData && (
                <div className="p-3 bg-blue-50 rounded border">
                  <h4 className="font-medium text-blue-900">👤 Student Information:</h4>
                  <p><strong>Name:</strong> {testResults.result.studentData.StudentName}</p>
                  <p><strong>Grade:</strong> {testResults.result.studentData.Grade}</p>
                  <p><strong>School ID:</strong> {testResults.result.studentData.SchoolID}</p>
                  <p><strong>Parent Email:</strong> {testResults.result.studentData.ParentEmail || 'Not set'}</p>
                  <p><strong>Parent Phone:</strong> {testResults.result.studentData.ParentPhone || 'Not set'}</p>
                </div>
              )}

              {/* Parent Contact Info */}
              {testResults.result?.parentContact && (
                <div className="p-3 bg-green-50 rounded border">
                  <h4 className="font-medium text-green-900">📞 Parent Contact:</h4>
                  <p><strong>Email:</strong> {testResults.result.parentContact.email || 'Not set'}</p>
                  <p><strong>Phone:</strong> {testResults.result.parentContact.phone || 'Not set'}</p>
                </div>
              )}

              {/* Notification Content */}
              {testResults.result?.notificationContent && (
                <div className="space-y-3">
                  <div className="p-3 bg-yellow-50 rounded border">
                    <h4 className="font-medium text-yellow-900">📧 Email Notification:</h4>
                    <p><strong>To:</strong> {testResults.result.notificationContent.email.to}</p>
                    <p><strong>Subject:</strong> {testResults.result.notificationContent.email.subject}</p>
                    <p><strong>Status:</strong> {testResults.result.notificationContent.email.status}</p>
                    <details className="mt-2">
                      <summary className="cursor-pointer text-sm text-yellow-700">View Email Body</summary>
                      <pre className="text-xs mt-2 whitespace-pre-wrap bg-white p-2 rounded">
                        {testResults.result.notificationContent.email.body}
                      </pre>
                    </details>
                  </div>

                  <div className="p-3 bg-purple-50 rounded border">
                    <h4 className="font-medium text-purple-900">📲 SMS Notification:</h4>
                    <p><strong>To:</strong> {testResults.result.notificationContent.sms.to}</p>
                    <p><strong>Status:</strong> {testResults.result.notificationContent.sms.status}</p>
                    <p><strong>Message:</strong> {testResults.result.notificationContent.sms.message}</p>
                  </div>
                </div>
              )}

              {/* Attendance Record */}
              {testResults.result?.attendanceRecord && (
                <div className="p-3 bg-green-50 rounded border">
                  <h4 className="font-medium text-green-900">✅ Attendance Record Created:</h4>
                  <p><strong>Attendance ID:</strong> {testResults.result.attendanceRecord.AttendanceID}</p>
                  <p><strong>Scan Time:</strong> {new Date(testResults.result.attendanceRecord.ScanTime).toLocaleString()}</p>
                  <p><strong>Status:</strong> {testResults.result.attendanceRecord.Status}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="p-3 bg-red-50 rounded border">
              <h4 className="font-medium text-red-900">❌ Error:</h4>
              <p className="text-red-700">{testResults.error}</p>
            </div>
          )}

          <details className="mt-4">
            <summary className="cursor-pointer text-sm text-gray-600">View Raw Response</summary>
            <pre className="text-xs mt-2 bg-gray-100 p-2 rounded overflow-auto max-h-40">
              {JSON.stringify(testResults, null, 2)}
            </pre>
          </details>
        </div>
      )}

      <div className="mt-8 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-medium text-blue-900 mb-2">🧪 Testing Instructions:</h3>
        <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
          <li><strong>Check Parent Contact Info</strong> - See if DANIELLA has email/phone in database</li>
          <li><strong>Test Notification Content</strong> - Generate notification message content</li>
          <li><strong>Simulate Fingerprint Scan</strong> - Create attendance record + trigger notifications</li>
          <li><strong>Check Parent Login</strong> - Try logging in as DANIELLA's parent to view attendance</li>
        </ol>
      </div>

      <div className="mt-4 p-4 bg-yellow-50 rounded-lg">
        <h3 className="font-medium text-yellow-900 mb-2">⚠️ For Parent Login Test:</h3>
        <div className="text-sm text-yellow-700 space-y-1">
          <p><strong>Username:</strong> DANIELLA AKU-SIKA ABBIW</p>
          <p><strong>Password:</strong> [The password set for this student]</p>
          <p><strong>Note:</strong> If no password is set, use the "Set Password" option first</p>
        </div>
      </div>
    </div>
  )
}