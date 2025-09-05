// pages/test-daniella.js - Test page for DANIELLA notifications
import Head from 'next/head'
import { useState, useEffect } from 'react'

// Import the DANIELLA test component (you'll need to create this file)
// import DaniellaTestComponent from '../components/DaniellaTestComponent'

// For now, I'll include the component inline
function DaniellaTestComponent() {
  const [testResults, setTestResults] = useState({})
  const [loading, setLoading] = useState(false)
  const [logs, setLogs] = useState([])

  // Add log entry
  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString()
    setLogs(prev => [...prev, { timestamp, message, type }])
  }

  // Clear logs
  const clearLogs = () => {
    setLogs([])
    setTestResults({})
  }

  // Test 1: Sync local contacts to cloud
  const syncLocalContacts = async () => {
    setLoading(true)
    addLog('🔄 Syncing local database contacts to cloud...', 'info')
    
    try {
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'sync_local_contacts'
        })
      })

      const result = await response.json()
      
      if (result.success) {
        addLog(`✅ Contact sync completed: ${result.result.successCount} students synced`, 'success')
        setTestResults(prev => ({ ...prev, contactSync: result.result }))
        
        // Look for DANIELLA specifically
        const daniellaResult = result.result.syncResults.find(r => 
          r.studentName.toUpperCase().includes('DANIELLA')
        )
        if (daniellaResult) {
          addLog(`👤 DANIELLA found: ${daniellaResult.action} - Email: ${daniellaResult.email || 'None'}, Phone: ${daniellaResult.phone || 'None'}`, 'success')
        }
      } else {
        addLog(`❌ Contact sync failed: ${result.error}`, 'error')
      }
    } catch (error) {
      addLog(`❌ Contact sync error: ${error.message}`, 'error')
    } finally {
      setLoading(false)
    }
  }

  // Test 2: Check DANIELLA's current contact info
  const checkDaniellaContact = async () => {
    setLoading(true)
    addLog('👤 Checking DANIELLA\'s contact information...', 'info')
    
    try {
      const response = await fetch('/api/sync-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get_parent_contact',
          data: { studentId: 13 }
        })
      })

      const result = await response.json()
      
      if (result.success) {
        const contact = result.result.parentContact
        addLog(`✅ DANIELLA contact retrieved`, 'success')
        addLog(`📧 Email: ${contact.email || 'Not set'}`, contact.email ? 'success' : 'warning')
        addLog(`📱 Phone: ${contact.phone || 'Not set'}`, contact.phone ? 'success' : 'warning')
        setTestResults(prev => ({ ...prev, daniellaContact: result.result }))
      } else {
        addLog(`❌ Failed to get DANIELLA contact: ${result.error}`, 'error')
      }
    } catch (error) {
      addLog(`❌ Contact check error: ${error.message}`, 'error')
    } finally {
      setLoading(false)
    }
  }

  // Test 3: Set DANIELLA's contact info (if missing)
  const setDaniellaContact = async () => {
    setLoading(true)
    addLog('📝 Setting DANIELLA\'s parent contact info...', 'info')
    
    try {
      const response = await fetch('/api/sync-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_parent_contact',
          data: {
            studentId: 13,
            email: 'carlcrankson966@gmail.com', // Your actual email - you'll receive notifications
            phoneNumber: '+233244123456' // Update to your actual phone number
          }
        })
      })

      const result = await response.json()
      
      if (result.success) {
        addLog(`✅ DANIELLA contact info updated!`, 'success')
        addLog(`📧 Email set: carlcrankson966@gmail.com`, 'success')
        addLog(`📱 Phone set: +233244123456`, 'success')
        setTestResults(prev => ({ ...prev, contactUpdate: result.result }))
      } else {
        addLog(`❌ Failed to update contact: ${result.error}`, 'error')
      }
    } catch (error) {
      addLog(`❌ Contact update error: ${error.message}`, 'error')
    } finally {
      setLoading(false)
    }
  }

  // Test 4: Simulate DANIELLA's fingerprint scan
  const simulateDaniellaFingerprint = async () => {
    setLoading(true)
    addLog('👆 Simulating DANIELLA\'s fingerprint scan...', 'info')
    
    try {
      const response = await fetch('/api/attendance-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'simulate_fingerprint_scan',
          data: {
            studentId: 13,
            schoolId: 1,
            status: 'IN'
          }
        })
      })

      const result = await response.json()
      
      if (result.success) {
        addLog(`✅ Fingerprint scan simulated!`, 'success')
        addLog(`📊 Attendance ID: ${result.result.attendance?.AttendanceID}`, 'info')
        
        const notifications = result.result.notifications
        if (notifications.attempted) {
          addLog(`📧 Email notification: ${notifications.email.sent ? '✅ Sent' : '❌ Failed'}`, notifications.email.sent ? 'success' : 'error')
          addLog(`📱 SMS notification: ${notifications.sms.sent ? '✅ Sent' : '❌ Failed'}`, notifications.sms.sent ? 'success' : 'error')
          
          if (notifications.email.sent) {
            addLog(`💌 Check your email: carlcrankson966@gmail.com`, 'info')
          }
          if (notifications.sms.sent) {
            addLog(`📲 Check your SMS: +233244123456`, 'info')
          }
        } else {
          addLog(`⚠️ No notifications sent - check contact info`, 'warning')
        }
        
        setTestResults(prev => ({ ...prev, fingerprintScan: result.result }))
      } else {
        addLog(`❌ Fingerprint scan failed: ${result.error}`, 'error')
      }
    } catch (error) {
      addLog(`❌ Fingerprint scan error: ${error.message}`, 'error')
    } finally {
      setLoading(false)
    }
  }

  // Test 5: Test notification APIs directly
  const testNotificationAPIs = async () => {
    setLoading(true)
    addLog('🧪 Testing SMS and Email APIs...', 'info')
    
    try {
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'test_notification_apis',
          data: {
            testEmail: 'carlcrankson966@gmail.com', // Your actual email from env
            testPhone: '+233244123456' // Change to your test phone number
          }
        })
      })

      const result = await response.json()
      
      if (result.success) {
        const { testResults, environmentCheck } = result.result
        
        addLog(`✅ API tests completed`, 'success')
        addLog(`📧 Email API: ${environmentCheck.emailConfigured ? 'Configured' : 'Not configured'}`, environmentCheck.emailConfigured ? 'success' : 'warning')
        addLog(`📱 SMS API: ${environmentCheck.smsConfigured ? 'Configured' : 'Not configured'}`, environmentCheck.smsConfigured ? 'success' : 'warning')
        
        if (testResults.email.available && testResults.email.result) {
          addLog(`📧 Test email: ${testResults.email.result.success ? '✅ Sent' : '❌ Failed'}`, testResults.email.result.success ? 'success' : 'error')
          if (!testResults.email.result.success) {
            addLog(`📧 Email error: ${testResults.email.result.error}`, 'error')
          }
        }
        
        if (testResults.sms.available && testResults.sms.result) {
          addLog(`📱 Test SMS: ${testResults.sms.result.success ? '✅ Sent' : '❌ Failed'}`, testResults.sms.result.success ? 'success' : 'error')
          if (!testResults.sms.result.success) {
            addLog(`📱 SMS error: ${testResults.sms.result.error}`, 'error')
          }
        }
        
        setTestResults(prev => ({ ...prev, apiTest: result.result }))
      } else {
        addLog(`❌ API test failed: ${result.error}`, 'error')
      }
    } catch (error) {
      addLog(`❌ API test error: ${error.message}`, 'error')
    } finally {
      setLoading(false)
    }
  }

  // Run all DANIELLA tests in sequence
  const runAllDaniellaTests = async () => {
    clearLogs()
    addLog('🚀 Starting complete DANIELLA notification test sequence...', 'info')
    addLog('👤 Testing for: DANIELLA AKU-SIKA ABBIW (Student ID: 13)', 'info')
    addLog('⚠️ Make sure to update test email/phone in the code to your actual contact info!', 'warning')
    
    await syncLocalContacts()
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    await checkDaniellaContact()
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    await setDaniellaContact()
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    await testNotificationAPIs()
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    await simulateDaniellaFingerprint()
    
    addLog('🎉 DANIELLA test sequence completed!', 'success')
    addLog('💡 Check your email and SMS for test notifications', 'info')
    addLog('🔐 You can now try parent login with: DANIELLA AKU-SIKA ABBIW', 'info')
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-xl shadow-lg p-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            🧪 DANIELLA Notification Test Suite
          </h2>
          <p className="text-gray-600">
            Complete testing for DANIELLA AKU-SIKA ABBIW (ID: 13) notifications
          </p>
        </div>

        {/* Test Control Buttons */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-8">
          <button 
            onClick={syncLocalContacts}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-3 px-4 rounded-lg text-sm transition-colors"
          >
            🔄 Sync Local Contacts
          </button>
          
          <button 
            onClick={checkDaniellaContact}
            disabled={loading}
            className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-medium py-3 px-4 rounded-lg text-sm transition-colors"
          >
            👤 Check DANIELLA
          </button>
          
          <button 
            onClick={setDaniellaContact}
            disabled={loading}
            className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-medium py-3 px-4 rounded-lg text-sm transition-colors"
          >
            📝 Set Contact Info
          </button>
          
          <button 
            onClick={testNotificationAPIs}
            disabled={loading}
            className="bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white font-medium py-3 px-4 rounded-lg text-sm transition-colors"
          >
            🧪 Test APIs
          </button>
          
          <button 
            onClick={simulateDaniellaFingerprint}
            disabled={loading}
            className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-medium py-3 px-4 rounded-lg text-sm transition-colors"
          >
            👆 Simulate Scan
          </button>
          
          <button 
            onClick={runAllDaniellaTests}
            disabled={loading}
            className="bg-pink-600 hover:bg-pink-700 disabled:opacity-50 text-white font-medium py-3 px-4 rounded-lg text-sm transition-colors"
          >
            🚀 Run All Tests
          </button>
        </div>

        {/* Clear Logs Button */}
        <div className="mb-4">
          <button 
            onClick={clearLogs}
            className="bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-lg text-sm transition-colors"
          >
            🗑️ Clear Logs
          </button>
        </div>

        {/* Loading Indicator */}
        {loading && (
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent"></div>
              <span className="text-blue-700 font-medium">Running tests...</span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Live Logs */}
          <div>
            <h3 className="text-lg font-semibold mb-4">🔍 Live Test Logs</h3>
            <div className="bg-gray-900 text-green-400 p-4 rounded-lg h-96 overflow-y-auto font-mono text-sm">
              {logs.map((log, index) => (
                <div key={index} className={`mb-1 ${
                  log.type === 'error' ? 'text-red-400' :
                  log.type === 'success' ? 'text-green-400' :
                  log.type === 'warning' ? 'text-yellow-400' : 'text-gray-300'
                }`}>
                  <span className="text-gray-500">[{log.timestamp}]</span> {log.message}
                </div>
              ))}
              {logs.length === 0 && (
                <div className="text-gray-500">
                  Ready to run DANIELLA tests...<br/>
                  Click "🚀 Run All Tests" to start the complete sequence.
                </div>
              )}
            </div>
          </div>

          {/* Test Results */}
          <div>
            <h3 className="text-lg font-semibold mb-4">📊 Test Results</h3>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              
              {/* Contact Sync Results */}
              {testResults.contactSync && (
                <div className="border rounded-lg p-4 bg-blue-50">
                  <h4 className="font-medium text-blue-900 mb-2">🔄 Contact Sync</h4>
                  <div className="text-sm space-y-1">
                    <p><strong>Total Students:</strong> {testResults.contactSync.totalStudents}</p>
                    <p><strong>Successfully Synced:</strong> <span className="text-green-600">{testResults.contactSync.successCount}</span></p>
                    <p><strong>Errors:</strong> <span className="text-red-600">{testResults.contactSync.errorCount}</span></p>
                  </div>
                </div>
              )}

              {/* DANIELLA Contact Info */}
              {testResults.daniellaContact && (
                <div className="border rounded-lg p-4 bg-green-50">
                  <h4 className="font-medium text-green-900 mb-2">👤 DANIELLA Contact</h4>
                  <div className="text-sm space-y-1">
                    <p><strong>Student:</strong> {testResults.daniellaContact.student.name}</p>
                    <p><strong>Email:</strong> 
                      <span className={testResults.daniellaContact.parentContact.email ? 'text-green-600 ml-1' : 'text-red-600 ml-1'}>
                        {testResults.daniellaContact.parentContact.email || 'Not set'}
                      </span>
                    </p>
                    <p><strong>Phone:</strong> 
                      <span className={testResults.daniellaContact.parentContact.phone ? 'text-green-600 ml-1' : 'text-red-600 ml-1'}>
                        {testResults.daniellaContact.parentContact.phone || 'Not set'}
                      </span>
                    </p>
                  </div>
                </div>
              )}

              {/* API Test Results */}
              {testResults.apiTest && (
                <div className="border rounded-lg p-4 bg-orange-50">
                  <h4 className="font-medium text-orange-900 mb-2">🧪 API Tests</h4>
                  <div className="text-sm space-y-1">
                    <p><strong>Email API:</strong> 
                      <span className={testResults.apiTest.environmentCheck.emailConfigured ? 'text-green-600 ml-1' : 'text-red-600 ml-1'}>
                        {testResults.apiTest.environmentCheck.emailConfigured ? 'Configured' : 'Not configured'}
                      </span>
                    </p>
                    <p><strong>SMS API:</strong> 
                      <span className={testResults.apiTest.environmentCheck.smsConfigured ? 'text-green-600 ml-1' : 'text-red-600 ml-1'}>
                        {testResults.apiTest.environmentCheck.smsConfigured ? 'Configured' : 'Not configured'}
                      </span>
                    </p>
                    {testResults.apiTest.testResults.email?.result && (
                      <p><strong>Test Email:</strong> 
                        <span className={testResults.apiTest.testResults.email.result.success ? 'text-green-600 ml-1' : 'text-red-600 ml-1'}>
                          {testResults.apiTest.testResults.email.result.success ? '✅ Sent' : '❌ Failed'}
                        </span>
                      </p>
                    )}
                    {testResults.apiTest.testResults.sms?.result && (
                      <p><strong>Test SMS:</strong> 
                        <span className={testResults.apiTest.testResults.sms.result.success ? 'text-green-600 ml-1' : 'text-red-600 ml-1'}>
                          {testResults.apiTest.testResults.sms.result.success ? '✅ Sent' : '❌ Failed'}
                        </span>
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Fingerprint Scan Results */}
              {testResults.fingerprintScan && (
                <div className="border rounded-lg p-4 bg-purple-50">
                  <h4 className="font-medium text-purple-900 mb-2">👆 Fingerprint Scan</h4>
                  <div className="text-sm space-y-1">
                    <p><strong>Attendance ID:</strong> {testResults.fingerprintScan.attendance?.AttendanceID}</p>
                    <p><strong>Student:</strong> {testResults.fingerprintScan.student?.StudentName}</p>
                    <p><strong>Email Sent:</strong> 
                      <span className={testResults.fingerprintScan.notifications?.email?.sent ? 'text-green-600 ml-1' : 'text-red-600 ml-1'}>
                        {testResults.fingerprintScan.notifications?.email?.sent ? '✅ Yes' : '❌ No'}
                      </span>
                    </p>
                    <p><strong>SMS Sent:</strong> 
                      <span className={testResults.fingerprintScan.notifications?.sms?.sent ? 'text-green-600 ml-1' : 'text-red-600 ml-1'}>
                        {testResults.fingerprintScan.notifications?.sms?.sent ? '✅ Yes' : '❌ No'}
                      </span>
                    </p>
                  </div>
                </div>
              )}

              {Object.keys(testResults).length === 0 && (
                <div className="text-gray-500 text-center py-8">
                  No test results yet.<br/>
                  Run tests to see results here.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Environment Setup Instructions */}
        <div className="mt-8 p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h3 className="font-medium text-yellow-900 mb-3">✅ Your Environment is Ready!</h3>
          <div className="text-sm text-yellow-700 space-y-2">
            <p><strong>Email configured:</strong> carlcrankson966@gmail.com</p>
            <p><strong>SMS configured:</strong> ZKTIME sender with your API key</p>
            <p><strong>Update your phone number:</strong> Change +233244123456 to your actual number in the code</p>
            <div className="bg-white p-4 rounded border font-mono text-xs mt-3">
              <p><strong>Current test contacts:</strong></p>
              <p>📧 Email: carlcrankson966@gmail.com (✅ Ready)</p>
              <p>📱 Phone: +233244123456 (⚠️ Update to your number)</p>
            </div>
            <p className="text-green-700 font-medium">Your environment variables are properly configured! Just update the phone number and test.</p>
          </div>
        </div>

        {/* Navigation */}
        <div className="mt-8 flex justify-between items-center">
          <a 
            href="/" 
            className="text-indigo-600 hover:text-indigo-700 font-medium text-sm"
          >
            ← Back to Main Application
          </a>
          <a 
            href="/test" 
            className="text-gray-600 hover:text-gray-700 font-medium text-sm"
          >
            Other Tests →
          </a>
        </div>
      </div>
    </div>
  )
}

export default function TestDaniellaPage() {
  return (
    <>
      <Head>
        <title>DANIELLA Test - SchoolSync</title>
        <meta name="description" content="Test DANIELLA AKU-SIKA ABBIW notifications" />
      </Head>
      
      <div className="min-h-screen bg-gray-50">
        <DaniellaTestComponent />
      </div>
    </>
  )
}