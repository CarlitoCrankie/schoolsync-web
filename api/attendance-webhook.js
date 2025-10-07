// pages/api/attendance-webhook.js - Auto-trigger notifications on attendance
const { getPool, sql } = require('../../lib/database')

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { action } = req.body

  try {
    let result = {}

    switch (action) {
      case 'process_attendance':
        result = await processAttendanceRecord(req.body.data)
        break
      case 'check_recent_attendance':
        result = await checkRecentAttendance()
        break
      case 'simulate_fingerprint_scan':
        result = await simulateFingerprintScan(req.body.data)
        break
      default:
        return res.status(400).json({ error: 'Invalid action' })
    }

    res.json({
      success: true,
      action,
      result,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Attendance webhook error:', error)
    res.status(500).json({
      success: false,
      error: error.message,
      action,
      timestamp: new Date().toISOString()
    })
  }
}

// Process new attendance record and send notifications
async function processAttendanceRecord(data) {
  try {
    const { studentId, schoolId, status = 'IN', scanTime } = data

    if (!studentId) {
      throw new Error('Student ID is required')
    }

    const pool = await getPool()
    const currentTime = scanTime ? new Date(scanTime) : new Date()

    // Step 1: Insert attendance record
    const attendanceResult = await pool.request()
      .input('schoolId', sql.Int, schoolId || 1)
      .input('studentId', sql.Int, studentId)
      .input('scanTime', sql.DateTime, currentTime)
      .input('status', sql.NVarChar, status)
      .query(`
        INSERT INTO dbo.Attendance (SchoolID, StudentID, ScanTime, Status)
        OUTPUT INSERTED.*
        VALUES (@schoolId, @studentId, @scanTime, @status)
      `)

    const attendanceRecord = attendanceResult.recordset[0]

    // Step 2: Get student and parent contact info
    const studentInfo = await pool.request()
      .input('studentId', sql.Int, studentId)
      .query(`
        SELECT 
          s.StudentID,
          s.Name as StudentName,
          s.Grade,
          s.SchoolID,
          sc.Name as SchoolName,
          p.Name as ParentName,
          p.Email as ParentEmail,
          p.PhoneNumber as ParentPhone
        FROM Students s
        LEFT JOIN Schools sc ON s.SchoolID = sc.SchoolID
        LEFT JOIN Parents p ON s.StudentID = p.StudentID AND p.IsPrimary = 1
        WHERE s.StudentID = @studentId AND s.IsActive = 1
      `)

    if (studentInfo.recordset.length === 0) {
      throw new Error(`Student with ID ${studentId} not found`)
    }

    const student = studentInfo.recordset[0]

    // Step 3: Send notifications if parent contact info exists
    let notificationResults = {
      attempted: false,
      email: { sent: false, error: null },
      sms: { sent: false, error: null }
    }

    if (student.ParentEmail || student.ParentPhone) {
      notificationResults.attempted = true
      
      try {
        // Call the notifications API
        const notificationResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/notifications`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'send_attendance_notification',
            data: {
              studentId,
              attendanceAction: status,
              schoolId: student.SchoolID
            }
          })
        })

        const notificationResult = await notificationResponse.json()
        
        if (notificationResult.success) {
          notificationResults.email = notificationResult.result.notifications.email
          notificationResults.sms = notificationResult.result.notifications.sms
        } else {
          notificationResults.error = notificationResult.error
        }

      } catch (error) {
        notificationResults.error = error.message
      }
    }

    // Step 4: Log the webhook processing
    await pool.request()
      .input('attendanceId', sql.Int, attendanceRecord.AttendanceID)
      .input('processed', sql.Bit, 1)
      .input('notifications', sql.NVarChar, JSON.stringify(notificationResults))
      .query(`
        UPDATE dbo.Attendance 
        SET 
          ProcessedAt = GETDATE(),
          NotificationsSent = @processed,
          NotificationResults = @notifications
        WHERE AttendanceID = @attendanceId
      `)

    return {
      attendanceRecord,
      student,
      notificationResults,
      webhook: {
        processed: true,
        processedAt: new Date().toISOString(),
        triggeredBy: 'attendance-webhook'
      }
    }

  } catch (error) {
    throw new Error(`Process attendance record failed: ${error.message}`)
  }
}

// Check recent attendance records that might not have been processed
async function checkRecentAttendance() {
  try {
    const pool = await getPool()

    // Get recent attendance records from last 24 hours
    const recentAttendance = await pool.request().query(`
      SELECT 
        a.AttendanceID,
        a.StudentID,
        a.ScanTime,
        a.Status,
        a.ProcessedAt,
        a.NotificationsSent,
        s.Name as StudentName,
        p.Email as ParentEmail,
        p.PhoneNumber as ParentPhone
      FROM dbo.Attendance a
      LEFT JOIN Students s ON a.StudentID = s.StudentID
      LEFT JOIN Parents p ON s.StudentID = p.StudentID AND p.IsPrimary = 1
      WHERE a.ScanTime >= DATEADD(hour, -24, GETDATE())
      ORDER BY a.ScanTime DESC
    `)

    const unprocessed = recentAttendance.recordset.filter(record => 
      !record.ProcessedAt && (record.ParentEmail || record.ParentPhone)
    )

    return {
      totalRecent: recentAttendance.recordset.length,
      unprocessed: unprocessed.length,
      recentRecords: recentAttendance.recordset.slice(0, 10),
      unprocessedRecords: unprocessed,
      message: `Found ${unprocessed.length} unprocessed attendance records with parent contact info`
    }

  } catch (error) {
    throw new Error(`Check recent attendance failed: ${error.message}`)
  }
}

// Simulate fingerprint scan (for testing DANIELLA)
async function simulateFingerprintScan(data) {
  try {
    const { studentId, schoolId = 1, status = 'IN' } = data

    if (!studentId) {
      throw new Error('Student ID is required for simulation')
    }

    console.log(`🔄 Simulating fingerprint scan for student ID ${studentId}...`)

    // Step 1: Process the attendance (this will also trigger notifications)
    const processResult = await processAttendanceRecord({
      studentId,
      schoolId,
      status,
      scanTime: new Date().toISOString()
    })

    // Step 2: Additional verification - check if student exists and has contact info
    const pool = await getPool()
    const verificationResult = await pool.request()
      .input('studentId', sql.Int, studentId)
      .query(`
        SELECT 
          s.StudentID,
          s.Name as StudentName,
          s.Grade,
          s.Email as StudentEmail,
          s.PhoneNumber as StudentPhone,
          p.Email as ParentEmail,
          p.PhoneNumber as ParentPhone,
          p.Name as ParentName
        FROM Students s
        LEFT JOIN Parents p ON s.StudentID = p.StudentID
        WHERE s.StudentID = @studentId
      `)

    const studentData = verificationResult.recordset[0]

    return {
      simulation: {
        success: true,
        action: 'Fingerprint scan simulated',
        studentId,
        status,
        timestamp: new Date().toISOString()
      },
      attendance: processResult.attendanceRecord,
      student: studentData,
      notifications: processResult.notificationResults,
      verification: {
        studentExists: !!studentData,
        hasDirectContact: !!(studentData?.StudentEmail || studentData?.StudentPhone),
        hasParentContact: !!(studentData?.ParentEmail || studentData?.ParentPhone),
        canReceiveNotifications: !!(
          studentData?.ParentEmail || 
          studentData?.ParentPhone || 
          studentData?.StudentEmail || 
          studentData?.StudentPhone
        )
      },
      message: `Fingerprint scan simulation completed for ${studentData?.StudentName || 'Unknown Student'}`
    }

  } catch (error) {
    throw new Error(`Simulate fingerprint scan failed: ${error.message}`)
  }
}