// // pages/test-dashboard.js - Complete testing dashboard
// import { useState, useEffect } from 'react'

// export default function TestDashboard() {
//   const [testResults, setTestResults] = useState({})
//   const [loading, setLoading] = useState(false)
//   const [activeTest, setActiveTest] = useState('')
//   const [logs, setLogs] = useState([])

//   // Add log entry
//   const addLog = (message, type = 'info') => {
//     const timestamp = new Date().toLocaleTimeString()
//     setLogs(prev => [...prev, { timestamp, message, type }])
//   }

//   // Test API call helper
//   const testAPI = async (operation, table, data = null, id = null) => {
//     setActiveTest(`${operation} ${table}`)
//     addLog(`Starting ${operation} operation on ${table}`, 'info')
    
//     try {
//       const response = await fetch('/api/test-crud', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ operation, table, data, id })
//       })
      
//       const result = await response.json()
      
//       if (result.success) {
//         addLog(`✅ ${operation} ${table} successful`, 'success')
//         return result
//       } else {
//         addLog(`❌ ${operation} ${table} failed: ${result.error}`, 'error')
//         return null
//       }
//     } catch (error) {
//       addLog(`❌ ${operation} ${table} error: ${error.message}`, 'error')
//       return null
//     }
//   }

//   // Test 1: Database Connectivity and Schema
//   const testDatabaseConnectivity = async () => {
//     setLoading(true)
//     addLog('🔍 Testing database connectivity and schema...', 'info')
    
//     const result = await testAPI('TEST_ALL', 'database')
//     if (result) {
//       setTestResults(prev => ({ ...prev, connectivity: result.result }))
//     }
    
//     setLoading(false)
//     setActiveTest('')
//   }

//   // Test 2: CRUD Operations
//   const testCRUDOperations = async () => {
//     setLoading(true)
//     addLog('🔧 Testing CRUD operations...', 'info')
    
//     const crudResults = {}
    
//     // CREATE: Add a test student
//     const createData = {
//       name: `Test Student ${Date.now()}`,
//       schoolId: 1,
//       grade: '10th',
//       parentName: 'Test Parent',
//       parentPhone: '+233123456789',
//       parentEmail: 'test@parent.com'
//     }
    
//     const createResult = await testAPI('CREATE', 'students', createData)
//     if (createResult) {
//       crudResults.create = createResult.result
//       const studentId = createResult.result.created.StudentID
      
//       // READ: Get the created student
//       const readResult = await testAPI('READ', 'students', null, studentId)
//       if (readResult) {
//         crudResults.read = readResult.result
        
//         // UPDATE: Modify the student
//         const updateData = { 
//           name: createData.name + ' (Updated)',
//           grade: '11th',
//           schoolId: 1
//         }
//         const updateResult = await testAPI('UPDATE', 'students', updateData, studentId)
//         if (updateResult) {
//           crudResults.update = updateResult.result
//         }
        
//         // CREATE attendance record
//         const attendanceData = {
//           studentId: studentId,
//           date: new Date().toISOString().split('T')[0],
//           status: 'Present',
//           remarks: 'Test attendance record'
//         }
//         const attendanceResult = await testAPI('CREATE', 'attendance', attendanceData)
//         if (attendanceResult) {
//           crudResults.attendance = attendanceResult.result
//         }
        
//         // DELETE: Remove the test student (soft delete)
//         const deleteResult = await testAPI('DELETE', 'students', null, studentId)
//         if (deleteResult) {
//           crudResults.delete = deleteResult.result
//         }
//       }
//     }
    
//     setTestResults(prev => ({ ...prev, crud: crudResults }))
//     setLoading(false)
//     setActiveTest('')
//   }

//   // Test 3: Sync Agent & Attendance Table
//   const testSyncAgent = async () => {
//     setLoading(true)
//     addLog('🔄 Testing sync agent setup and attendance table...', 'info')
    
//     try {
//       // Check attendance table
//       const attendanceCheck = await fetch('/api/sync-agent', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ action: 'check_attendance_table' })
//       }).then(res => res.json())
      
//       if (attendanceCheck.success) {
//         if (attendanceCheck.result.tableExists) {
//           addLog('✅ Attendance table exists and is properly structured', 'success')
//         } else {
//           addLog('✅ Created Attendance table for sync agent', 'success')
//         }
//         setTestResults(prev => ({ ...prev, attendanceTable: attendanceCheck.result }))
//       }
      
//       // Check sync requirements
//       const requirementsCheck = await fetch('/api/sync-agent', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ action: 'check_sync_requirements' })
//       }).then(res => res.json())
      
//       if (requirementsCheck.success) {
//         addLog('📋 Sync agent requirements checked', 'info')
//         setTestResults(prev => ({ ...prev, syncRequirements: requirementsCheck.result }))
//       }
      
//       // Get recent attendance records
//       const recentAttendance = await fetch('/api/sync-agent', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ action: 'get_recent_attendance' })
//       }).then(res => res.json())
      
//       if (recentAttendance.success) {
//         addLog(`📊 Found ${recentAttendance.result.recentRecords.length} recent attendance records`, 'info')
//         setTestResults(prev => ({ ...prev, recentAttendance: recentAttendance.result }))
//       }
//     } catch (error) {
//       addLog(`❌ Sync agent test error: ${error.message}`, 'error')
//     }
    
//     setLoading(false)
//     setActiveTest('')
//   }

//   // Test 4: Create Test Student for Sync Testing
//   const testCreateStudent = async () => {
//     setLoading(true)
//     addLog('👤 Creating test student for sync agent testing...', 'info')
    
//     const testStudentData = {
//       name: `Sync Test Student ${Date.now()}`,
//       schoolId: 1,
//       grade: '10th',
//       parentName: 'Test Parent',
//       phone: '+233123456789', // Ghana phone number
//       email: 'test@example.com'
//     }
    
//     try {
//       const createResult = await fetch('/api/sync-agent', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ 
//           action: 'create_test_student',
//           data: testStudentData
//         })
//       }).then(res => res.json())
      
//       if (createResult.success) {
//         addLog('✅ Test student created successfully', 'success')
//         addLog(`📝 Student ID: ${createResult.result.student.StudentID}`, 'info')
//         addLog('📱 Ready for fingerprint scan simulation', 'info')
//         setTestResults(prev => ({ ...prev, testStudent: createResult.result }))
//       }
//     } catch (error) {
//       addLog(`❌ Test student creation error: ${error.message}`, 'error')
//     }
    
//     setLoading(false)
//     setActiveTest('')
//   }

//   // Test 5: Simulate Fingerprint Check-in/Check-out
//   const testFingerprintScan = async () => {
//     setLoading(true)
//     addLog('👆 Simulating fingerprint scanner check-in...', 'info')
    
//     // First check if we have a test student
//     let studentId = testResults.testStudent?.student?.StudentID
    
//     if (!studentId) {
//       // Get any available student
//       const studentsResult = await testAPI('READ', 'students')
//       if (studentsResult && studentsResult.result.recordset.length > 0) {
//         studentId = studentsResult.result.recordset[0].StudentID
//         addLog(`📋 Using existing student ID: ${studentId}`, 'info')
//       } else {
//         addLog('❌ No students available for testing. Create a test student first.', 'error')
//         setLoading(false)
//         setActiveTest('')
//         return
//       }
//     }
    
//     try {
//       // Simulate check-in
//       const checkinResult = await fetch('/api/sync-agent', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ 
//           action: 'simulate_checkinout',
//           data: { 
//             studentId: studentId,
//             status: 'IN',
//             schoolId: 1
//           }
//         })
//       }).then(res => res.json())
      
//       if (checkinResult.success) {
//         addLog('✅ Fingerprint check-in simulated successfully', 'success')
//         addLog('📱 This should trigger SMS and email notifications', 'info')
//         addLog('🔄 Your sync agent should process this record', 'warning')
//         setTestResults(prev => ({ ...prev, fingerprintScan: checkinResult.result }))
//       }
//     } catch (error) {
//       addLog(`❌ Fingerprint simulation error: ${error.message}`, 'error')
//     }
    
//     setLoading(false)
//     setActiveTest('')
//   }

//   // Test 6: Test Notification Content (Updated)
//   const testNotifications = async () => {
//     setLoading(true)
//     addLog('📱 Testing notification message generation (from Students table)...', 'info')
    
//     // Get student for notification testing
//     let studentId = testResults.testStudent?.student?.StudentID
    
//     if (!studentId) {
//       const studentsResult = await testAPI('READ', 'students')
//       if (studentsResult && studentsResult.result.recordset.length > 0) {
//         studentId = studentsResult.result.recordset[0].StudentID
//       }
//     }
    
//     if (studentId) {
//       try {
//         const notificationResult = await fetch('/api/sync-agent', {
//           method: 'POST',
//           headers: { 'Content-Type': 'application/json' },
//           body: JSON.stringify({ 
//             action: 'test_notification_data',
//             data: { studentId: studentId, schoolId: 1 }
//           })
//         }).then(res => res.json())
        
//         if (notificationResult.success) {
//           addLog('✅ Notification content generated from Students table', 'success')
//           addLog('📧 Email will be sent to student-attached email', 'info')
//           addLog('📲 SMS will be sent to student-attached phone', 'info')
//           setTestResults(prev => ({ ...prev, notifications: notificationResult.result }))
//         }
//       } catch (error) {
//         addLog(`❌ Notification test error: ${error.message}`, 'error')
//       }
//     } else {
//       addLog('❌ No student available for notification testing', 'error')
//     }
    
//     setLoading(false)
//     setActiveTest('')
//   }

//   // Test 7: Parent Contact Update
//   const testParentContactUpdate = async () => {
//     setLoading(true)
//     addLog('📞 Testing parent contact information update...', 'info')
    
//     // Get student for contact update testing
//     let studentId = testResults.testStudent?.student?.StudentID
    
//     if (!studentId) {
//       const studentsResult = await testAPI('READ', 'students')
//       if (studentsResult && studentsResult.result.recordset.length > 0) {
//         studentId = studentsResult.result.recordset[0].StudentID
//       }
//     }
    
//     if (studentId) {
//       try {
//         const updateData = {
//           studentId: studentId,
//           newEmail: `updated.parent.${Date.now()}@example.com`,
//           newPhone: '+233987654321'
//         }
        
//         addLog(`📋 Updating student ID: ${studentId}`, 'info')
//         addLog(`📧 New email: ${updateData.newEmail}`, 'info')
//         addLog(`📲 New phone: ${updateData.newPhone}`, 'info')
        
//         const contactUpdateResult = await fetch('/api/sync-agent', {
//           method: 'POST',
//           headers: { 'Content-Type': 'application/json' },
//           body: JSON.stringify({ 
//             action: 'update_parent_contact',
//             data: updateData
//           })
//         }).then(res => res.json())
        
//         if (contactUpdateResult.success) {
//           addLog('✅ Parent contact information updated successfully', 'success')
//           addLog(`📊 Updated fields: ${contactUpdateResult.result.updatedFields?.join(', ')}`, 'info')
//           setTestResults(prev => ({ 
//             ...prev, 
//             parentContactUpdate: {
//               ...contactUpdateResult.result,
//               newEmail: updateData.newEmail,
//               newPhone: updateData.newPhone
//             }
//           }))
//         } else {
//           addLog(`❌ Update failed: ${contactUpdateResult.error}`, 'error')
//         }
//       } catch (error) {
//         addLog(`❌ Parent contact update error: ${error.message}`, 'error')
//       }
//     } else {
//       addLog('❌ No student available for contact update testing', 'error')
//     }
    
//     setLoading(false)
//     setActiveTest('')
//   }

//   // Test 8: Check Database Structure
//   const testDatabaseStructure = async () => {
//     setLoading(true)
//     addLog('🗃️ Checking actual database structure...', 'info')
    
//     try {
//       const structureResult = await fetch('/api/sync-agent', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ 
//           action: 'check_database_structure'
//         })
//       }).then(res => res.json())
      
//       if (structureResult.success) {
//         addLog('✅ Database structure analyzed', 'success')
//         addLog(`📊 Students table columns: ${structureResult.result.studentsTable.columns.map(c => c.COLUMN_NAME).join(', ')}`, 'info')
//         addLog(`📊 Parents table columns: ${structureResult.result.parentsTable.columns.map(c => c.COLUMN_NAME).join(', ')}`, 'info')
//         addLog(`📋 Students records: ${structureResult.result.studentsTable.sampleData.length}`, 'info')
//         addLog(`📋 Parents records: ${structureResult.result.parentsTable.sampleData.length}`, 'info')
//         setTestResults(prev => ({ 
//           ...prev, 
//           databaseStructure: structureResult.result
//         }))
//       } else {
//         addLog(`❌ Structure check failed: ${structureResult.error}`, 'error')
//       }
//     } catch (error) {
//       addLog(`❌ Database structure check error: ${error.message}`, 'error')
//     }
    
//     setLoading(false)
//     setActiveTest('')
//   }

//   // Run all tests
//   const runAllTests = async () => {
//     setLogs([])
//     addLog('🚀 Starting comprehensive sync agent integration test...', 'info')
//     addLog('🔧 Testing complete flow with correct database structure', 'info')
    
//     await testDatabaseConnectivity()
//     await testDatabaseStructure()
//     await testCRUDOperations()
//     await testSyncAgent()
//     await testCreateStudent()
//     await testFingerprintScan()
//     await testNotifications()
//     await testParentContactUpdate()
    
//     addLog('✅ All integration tests completed!', 'success')
//     addLog('📋 Review results below for sync agent status', 'info')
//     addLog('🔍 Check your sync agent logs and local database', 'warning')
//     addLog('📞 Parent contact management tested with correct table structure', 'success')
//   }

//   return (
//     <div className="min-h-screen bg-gray-50 py-8">
//       <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
//         {/* Header */}
//         <div className="mb-8">
//           <h1 className="text-3xl font-bold text-gray-900">Sync Agent Integration Test Dashboard</h1>
//           <p className="text-gray-600">Test complete data flow: Fingerprint Scanner → Local DB → Sync Agent → Cloud DB → SMS/Email</p>
//         </div>

//         {/* Test Controls */}
//         <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
//           <h2 className="text-xl font-semibold mb-4">Test Controls</h2>
//           <div className="grid grid-cols-2 md:grid-cols-8 gap-2">
//             <button 
//               onClick={testDatabaseConnectivity}
//               disabled={loading}
//               className="btn-primary disabled:opacity-50 text-xs"
//             >
//               🔍 Database
//             </button>
//             <button 
//               onClick={testCRUDOperations}
//               disabled={loading}
//               className="btn-primary disabled:opacity-50 text-xs"
//             >
//               🔧 CRUD
//             </button>
//             <button 
//               onClick={testSyncAgent}
//               disabled={loading}
//               className="btn-primary disabled:opacity-50 text-xs"
//             >
//               🔄 Sync Setup
//             </button>
//             <button 
//               onClick={testCreateStudent}
//               disabled={loading}
//               className="btn-primary disabled:opacity-50 text-xs"
//             >
//               👤 Student
//             </button>
//             <button 
//               onClick={testFingerprintScan}
//               disabled={loading}
//               className="btn-primary disabled:opacity-50 text-xs"
//             >
//               👆 Fingerprint
//             </button>
//             <button 
//               onClick={testNotifications}
//               disabled={loading}
//               className="btn-primary disabled:opacity-50 text-xs"
//             >
//               📱 Notifications
//             </button>
//             <button 
//               onClick={testDatabaseStructure}
//               disabled={loading}
//               className="btn-primary disabled:opacity-50 text-xs"
//             >
//               🗃️ DB Structure
//             </button>
//             <button 
//               onClick={testParentContactUpdate}
//               disabled={loading}
//               className="btn-primary disabled:opacity-50 text-xs"
//             >
//               📞 Contact Update
//             </button>
//           </div>
//           <div className="mt-4">
//             <button 
//               onClick={runAllTests}
//               disabled={loading}
//               className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-medium py-2 px-4 rounded-lg text-xs"
//             >
//               🚀 Run All Tests
//             </button>
//           </div>
          
//           {activeTest && (
//             <div className="mt-4 p-3 bg-blue-50 rounded-lg">
//               <p className="text-blue-700">Currently running: <strong>{activeTest}</strong></p>
//             </div>
//           )}
//         </div>

//         {/* Test Results */}
//         <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
//           {/* Live Logs */}
//           <div className="bg-white rounded-xl shadow-sm p-6">
//             <h3 className="text-lg font-semibold mb-4">Live Test Logs</h3>
//             <div className="bg-gray-900 text-green-400 p-4 rounded-lg h-96 overflow-y-auto font-mono text-sm">
//               {logs.map((log, index) => (
//                 <div key={index} className={`mb-1 ${
//                   log.type === 'error' ? 'text-red-400' :
//                   log.type === 'success' ? 'text-green-400' :
//                   log.type === 'warning' ? 'text-yellow-400' : 'text-gray-300'
//                 }`}>
//                   <span className="text-gray-500">[{log.timestamp}]</span> {log.message}
//                 </div>
//               ))}
//               {logs.length === 0 && (
//                 <div className="text-gray-500">No test logs yet. Run a test to see results...</div>
//               )}
//             </div>
//           </div>

//           {/* Test Results Summary */}
//           <div className="bg-white rounded-xl shadow-sm p-6">
//             <h3 className="text-lg font-semibold mb-4">Test Results Summary</h3>
//             <div className="space-y-4 max-h-96 overflow-y-auto">
              
//               {/* Database Connectivity */}
//               {testResults.connectivity && (
//                 <div className="border rounded-lg p-4">
//                   <h4 className="font-medium text-gray-900 mb-2">🔍 Database Connectivity</h4>
//                   <div className="text-sm space-y-1">
//                     <p><strong>Status:</strong> <span className="text-green-600">{testResults.connectivity.overallStatus}</span></p>
//                     <p><strong>Tables Available:</strong> {testResults.connectivity.tables?.available?.join(', ')}</p>
//                     <p><strong>Records:</strong> {testResults.connectivity.recordCounts?.map(r => `${r.TableName}: ${r.RecordCount}`).join(', ')}</p>
//                   </div>
//                 </div>
//               )}

//               {/* Database Structure */}
//               {testResults.databaseStructure && (
//                 <div className="border rounded-lg p-4">
//                   <h4 className="font-medium text-gray-900 mb-2">🗃️ Database Structure</h4>
//                   <div className="text-sm space-y-1">
//                     <p><strong>Students Columns:</strong> {testResults.databaseStructure.studentsTable.columns.map(c => c.COLUMN_NAME).join(', ')}</p>
//                     <p><strong>Parents Columns:</strong> {testResults.databaseStructure.parentsTable.columns.map(c => c.COLUMN_NAME).join(', ')}</p>
//                   </div>
//                 </div>
//               )}

//               {/* CRUD Operations */}
//               {testResults.crud && (
//                 <div className="border rounded-lg p-4">
//                   <h4 className="font-medium text-gray-900 mb-2">🔧 CRUD Operations</h4>
//                   <div className="text-sm space-y-1">
//                     <p><strong>Create:</strong> <span className="text-green-600">{testResults.crud.create ? '✅ Success' : '❌ Failed'}</span></p>
//                     <p><strong>Read:</strong> <span className="text-green-600">{testResults.crud.read ? '✅ Success' : '❌ Failed'}</span></p>
//                     <p><strong>Update:</strong> <span className="text-green-600">{testResults.crud.update ? '✅ Success' : '❌ Failed'}</span></p>
//                     <p><strong>Delete:</strong> <span className="text-green-600">{testResults.crud.delete ? '✅ Success' : '❌ Failed'}</span></p>
//                   </div>
//                 </div>
//               )}

//               {/* Sync Agent Status */}
//               {testResults.attendanceTable && (
//                 <div className="border rounded-lg p-4">
//                   <h4 className="font-medium text-gray-900 mb-2">🔄 Sync Agent Setup</h4>
//                   <div className="text-sm space-y-1">
//                     <p><strong>Attendance Table:</strong> <span className="text-green-600">✅ Ready</span></p>
//                     <p><strong>Unique Index:</strong> <span className="text-green-600">{testResults.attendanceTable.uniqueIndexExists ? '✅ Present' : '⚠️ Missing'}</span></p>
//                     <p><strong>Recent Records:</strong> {testResults.attendanceTable.recentRecords?.length || 0}</p>
//                   </div>
//                 </div>
//               )}

//               {/* Test Student */}
//               {testResults.testStudent && (
//                 <div className="border rounded-lg p-4">
//                   <h4 className="font-medium text-gray-900 mb-2">👤 Test Student</h4>
//                   <div className="text-sm space-y-1">
//                     <p><strong>Student ID:</strong> {testResults.testStudent.student.StudentID}</p>
//                     <p><strong>Name:</strong> {testResults.testStudent.student.Name}</p>
//                     <p><strong>Parent Phone:</strong> {testResults.testStudent.parent?.PhoneNumber}</p>
//                     <p><strong>Parent Email:</strong> {testResults.testStudent.parent?.Email}</p>
//                   </div>
//                 </div>
//               )}

//               {/* Fingerprint Scan */}
//               {testResults.fingerprintScan && (
//                 <div className="border rounded-lg p-4">
//                   <h4 className="font-medium text-gray-900 mb-2">👆 Fingerprint Simulation</h4>
//                   <div className="text-sm space-y-1">
//                     <p><strong>Status:</strong> <span className="text-green-600">✅ Check-in simulated</span></p>
//                     <p><strong>Student:</strong> {testResults.fingerprintScan.studentInfo?.StudentName}</p>
//                     <p><strong>Scan Time:</strong> {new Date(testResults.fingerprintScan.simulationDetails?.scanTime).toLocaleString()}</p>
//                   </div>
//                 </div>
//               )}

//               {/* Notifications */}
//               {testResults.notifications && (
//                 <div className="border rounded-lg p-4">
//                   <h4 className="font-medium text-gray-900 mb-2">📱 Notifications</h4>
//                   <div className="text-sm space-y-1">
//                     <p><strong>Status:</strong> <span className="text-green-600">✅ Content generated</span></p>
//                     <p><strong>SMS Ready:</strong> <span className="text-green-600">✅ Yes</span></p>
//                     <p><strong>Email Ready:</strong> <span className="text-green-600">✅ Yes</span></p>
//                   </div>
//                 </div>
//               )}

//               {/* Parent Contact Update */}
//               {testResults.parentContactUpdate && (
//                 <div className="border rounded-lg p-4">
//                   <h4 className="font-medium text-gray-900 mb-2">📞 Parent Contact Update</h4>
//                   <div className="text-sm space-y-1">
//                     <p><strong>Status:</strong> <span className="text-green-600">✅ Successfully updated</span></p>
//                     <p><strong>New Email:</strong> {testResults.parentContactUpdate.newEmail}</p>
//                     <p><strong>New Phone:</strong> {testResults.parentContactUpdate.newPhone}</p>
//                     <p><strong>Database:</strong> Parents table (separate from Students)</p>
//                   </div>
//                 </div>
//               )}

//               {Object.keys(testResults).length === 0 && (
//                 <div className="text-gray-500 text-center py-8">
//                   No test results yet. Run tests to see results here.
//                 </div>
//               )}
//             </div>
//           </div>
//         </div>

//         {/* Navigation */}
//         <div className="mt-8 text-center">
//           <a 
//             href="/" 
//             className="text-indigo-600 hover:text-indigo-700 font-medium"
//           >
//             ← Back to Main Application
//           </a>
//         </div>
//       </div>
//     </div>
//   )
// }
// pages/test-dashboard.js - Updated with DANIELLA notification test
// pages/test-dashboard.js - Updated with DANIELLA notification test
import { useState, useEffect, useRef } from 'react'

export default function TestDashboard() {
  const [testResults, setTestResults] = useState({})
  const [loading, setLoading] = useState(false)
  const [activeTest, setActiveTest] = useState('')
  const [logs, setLogs] = useState([])

  // Add log entry
  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString()
    setLogs(prev => [...prev, { timestamp, message, type }])
  }

  // Test API call helper
  const testAPI = async (operation, table, data = null, id = null) => {
    setActiveTest(`${operation} ${table}`)
    addLog(`Starting ${operation} operation on ${table}`, 'info')
    
    try {
      const response = await fetch('/api/test-crud', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operation, table, data, id })
      })
      
      const result = await response.json()
      
      if (result.success) {
        addLog(`✅ ${operation} ${table} successful`, 'success')
        return result
      } else {
        addLog(`❌ ${operation} ${table} failed: ${result.error}`, 'error')
        return null
      }
    } catch (error) {
      addLog(`❌ ${operation} ${table} error: ${error.message}`, 'error')
      return null
    }
  }

  // DANIELLA Notification Tests
  const testDaniellaContactInfo = async () => {
    setLoading(true)
    addLog('📞 Checking DANIELLA\'s parent contact info...', 'info')
    
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
        addLog('✅ DANIELLA contact info retrieved', 'success')
        addLog(`📧 Email: ${result.result.parentContact.email || 'Not set'}`, 'info')
        addLog(`📱 Phone: ${result.result.parentContact.phone || 'Not set'}`, 'info')
        setTestResults(prev => ({ ...prev, daniellaContact: result.result }))
      } else {
        addLog(`❌ Failed to get DANIELLA contact: ${result.error}`, 'error')
      }
    } catch (error) {
      addLog(`❌ Contact info error: ${error.message}`, 'error')
    } finally {
      setLoading(false)
      setActiveTest('')
    }
  }

  const testDaniellaNotifications = async () => {
    setLoading(true)
    addLog('📱 Testing DANIELLA notification content generation...', 'info')
    
    try {
      const response = await fetch('/api/sync-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'test_notification_data',
          data: { studentId: 13, schoolId: 1 }
        })
      })

      const result = await response.json()
      
      if (result.success) {
        addLog('✅ DANIELLA notification content generated', 'success')
        addLog(`📧 Email status: ${result.result.notificationContent.email.status}`, 'info')
        addLog(`📲 SMS status: ${result.result.notificationContent.sms.status}`, 'info')
        setTestResults(prev => ({ ...prev, daniellaNotifications: result.result }))
      } else {
        addLog(`❌ Notification test failed: ${result.error}`, 'error')
      }
    } catch (error) {
      addLog(`❌ Notification error: ${error.message}`, 'error')
    } finally {
      setLoading(false)
      setActiveTest('')
    }
  }

  const simulateDaniellaCheckin = async () => {
    setLoading(true)
    addLog('👆 Simulating DANIELLA fingerprint check-in...', 'info')
    
    try {
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
      
      if (result.success) {
        addLog('✅ DANIELLA check-in simulated successfully!', 'success')
        addLog('📱 This should trigger SMS and email notifications', 'warning')
        addLog(`📊 Attendance ID: ${result.result.attendanceRecord?.AttendanceID}`, 'info')
        setTestResults(prev => ({ ...prev, daniellaCheckin: result.result }))
      } else {
        addLog(`❌ Check-in simulation failed: ${result.error}`, 'error')
      }
    } catch (error) {
      addLog(`❌ Check-in simulation error: ${error.message}`, 'error')
    } finally {
      setLoading(false)
      setActiveTest('')
    }
  }

  // Other existing test functions...
  const testDatabaseConnectivity = async () => {
    setLoading(true)
    addLog('🔍 Testing database connectivity and schema...', 'info')
    
    const result = await testAPI('TEST_ALL', 'database')
    if (result) {
      setTestResults(prev => ({ ...prev, connectivity: result.result }))
    }
    
    setLoading(false)
    setActiveTest('')
  }

  const runDaniellaTests = async () => {
    setLogs([])
    addLog('🧪 Starting DANIELLA notification tests...', 'info')
    addLog('👤 Testing for: DANIELLA AKU-SIKA ABBIW (ID: 13)', 'info')
    
    await testDaniellaContactInfo()
    await testDaniellaNotifications()
    await simulateDaniellaCheckin()
    
    addLog('✅ DANIELLA tests completed!', 'success')
    addLog('📋 Check results below and try parent login', 'warning')
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Test Dashboard</h1>
          <p className="text-gray-600">Test system functionality and DANIELLA's notifications</p>
        </div>

        {/* DANIELLA Test Section */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4 text-purple-900">
            🧪 DANIELLA AKU-SIKA ABBIW Notification Tests
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <button 
              onClick={testDaniellaContactInfo}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-2 px-4 rounded-lg text-sm"
            >
              📞 Check Contact Info
            </button>
            <button 
              onClick={testDaniellaNotifications}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-medium py-2 px-4 rounded-lg text-sm"
            >
              📱 Test Notifications
            </button>
            <button 
              onClick={simulateDaniellaCheckin}
              disabled={loading}
              className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-medium py-2 px-4 rounded-lg text-sm"
            >
              👆 Simulate Check-in
            </button>
            <button 
              onClick={runDaniellaTests}
              disabled={loading}
              className="bg-pink-600 hover:bg-pink-700 disabled:opacity-50 text-white font-medium py-2 px-4 rounded-lg text-sm"
            >
              🚀 Run All DANIELLA Tests
            </button>
          </div>
          
          {activeTest && (
            <div className="mt-4 p-3 bg-purple-50 rounded-lg">
              <p className="text-purple-700">Currently running: <strong>{activeTest}</strong></p>
            </div>
          )}
        </div>

        {/* Regular Test Controls */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Regular System Tests</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <button 
              onClick={testDatabaseConnectivity}
              disabled={loading}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium py-2 px-4 rounded-lg text-xs"
            >
              🔍 Database
            </button>
            {/* Add other buttons as needed */}
          </div>
        </div>

        {/* Test Results */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Live Logs */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold mb-4">Live Test Logs</h3>
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
                <div className="text-gray-500">No test logs yet. Run DANIELLA tests to see results...</div>
              )}
            </div>
          </div>

          {/* Test Results Summary */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold mb-4">Test Results Summary</h3>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              
              {/* DANIELLA Contact Info */}
              {testResults.daniellaContact && (
                <div className="border rounded-lg p-4 bg-blue-50">
                  <h4 className="font-medium text-blue-900 mb-2">📞 DANIELLA Contact Info</h4>
                  <div className="text-sm space-y-1">
                    <p><strong>Student:</strong> {testResults.daniellaContact.student.name}</p>
                    <p><strong>Grade:</strong> {testResults.daniellaContact.student.grade}</p>
                    <p><strong>Email:</strong> <span className={testResults.daniellaContact.parentContact.email ? 'text-green-600' : 'text-red-600'}>
                      {testResults.daniellaContact.parentContact.email || 'Not set'}
                    </span></p>
                    <p><strong>Phone:</strong> <span className={testResults.daniellaContact.parentContact.phone ? 'text-green-600' : 'text-red-600'}>
                      {testResults.daniellaContact.parentContact.phone || 'Not set'}
                    </span></p>
                  </div>
                </div>
              )}

              {/* DANIELLA Notifications */}
              {testResults.daniellaNotifications && (
                <div className="border rounded-lg p-4 bg-green-50">
                  <h4 className="font-medium text-green-900 mb-2">📱 DANIELLA Notifications</h4>
                  <div className="text-sm space-y-2">
                    <div>
                      <p><strong>Email Status:</strong> <span className={testResults.daniellaNotifications.notificationContent?.email.status === 'Ready to send' ? 'text-green-600' : 'text-red-600'}>
                        {testResults.daniellaNotifications.notificationContent?.email.status}
                      </span></p>
                      <p><strong>Email To:</strong> {testResults.daniellaNotifications.notificationContent?.email.to || 'N/A'}</p>
                    </div>
                    <div>
                      <p><strong>SMS Status:</strong> <span className={testResults.daniellaNotifications.notificationContent?.sms.status === 'Ready to send' ? 'text-green-600' : 'text-red-600'}>
                        {testResults.daniellaNotifications.notificationContent?.sms.status}
                      </span></p>
                      <p><strong>SMS To:</strong> {testResults.daniellaNotifications.notificationContent?.sms.to || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* DANIELLA Check-in */}
              {testResults.daniellaCheckin && (
                <div className="border rounded-lg p-4 bg-purple-50">
                  <h4 className="font-medium text-purple-900 mb-2">👆 DANIELLA Check-in</h4>
                  <div className="text-sm space-y-1">
                    <p><strong>Status:</strong> <span className="text-green-600">✅ Check-in simulated</span></p>
                    <p><strong>Attendance ID:</strong> {testResults.daniellaCheckin.attendanceRecord?.AttendanceID}</p>
                    <p><strong>Scan Time:</strong> {new Date(testResults.daniellaCheckin.simulationDetails?.scanTime).toLocaleString()}</p>
                    <p><strong>Student:</strong> {testResults.daniellaCheckin.studentInfo?.StudentName || 'DANIELLA AKU-SIKA ABBIW'}</p>
                  </div>
                </div>
              )}

              {Object.keys(testResults).length === 0 && (
                <div className="text-gray-500 text-center py-8">
                  No test results yet. Run DANIELLA tests to see results here.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Parent Login Instructions */}
        <div className="mt-8 p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h3 className="font-medium text-yellow-900 mb-3">🔐 Test Parent Login</h3>
          <div className="text-sm text-yellow-700 space-y-2">
            <p>After running the tests above, try logging in as DANIELLA's parent:</p>
            <div className="bg-white p-3 rounded border">
              <p><strong>Username:</strong> <code>DANIELLA AKU-SIKA ABBIW</code></p>
              <p><strong>Password:</strong> [Use existing password or set one first]</p>
            </div>
            <p>Go to: <a href="/" className="text-blue-600 hover:text-blue-800 underline">Main Login Page</a></p>
          </div>
        </div>

        {/* Navigation */}
        <div className="mt-8 text-center">
          <a 
            href="/" 
            className="text-indigo-600 hover:text-indigo-700 font-medium"
          >
            ← Back to Main Application
          </a>
        </div>
      </div>
    </div>
  )
}