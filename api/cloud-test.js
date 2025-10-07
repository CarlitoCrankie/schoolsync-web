// pages/api/cloud-test.js - Test cloud database and create DANIELLA manually
const { getPool, sql } = require('../../lib/database')

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { action } = req.body

  try {
    const pool = await getPool()
    let result = {}

    switch (action) {
      case 'test_cloud_connection':
        result = await testCloudConnection(pool)
        break
      case 'create_daniella_manually':
        result = await createDaniellaManually(pool)
        break
      case 'list_students':
        result = await listStudents(pool)
        break
      case 'test_notifications_daniella':
        result = await testNotificationsDaniella(pool)
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
    console.error('Cloud test error:', error)
    res.status(500).json({
      success: false,
      error: error.message,
      action,
      timestamp: new Date().toISOString()
    })
  }
}

async function testCloudConnection(pool) {
  try {
    // Test cloud database connection
    const result = await pool.request().query(`
      SELECT 
        DB_NAME() as DatabaseName,
        @@SERVERNAME as ServerName,
        (SELECT COUNT(*) FROM Students) as StudentCount,
        (SELECT COUNT(*) FROM Parents) as ParentCount,
        (SELECT COUNT(*) FROM Schools) as SchoolCount
    `)

    const dbInfo = result.recordset[0]

    // Check if DANIELLA already exists
    const daniellaCheck = await pool.request()
      .input('name', sql.NVarChar, 'DANIELLA AKU-SIKA ABBIW')
      .input('schoolId', sql.Int, process.env.SCHOOL_ID || 2)
      .query(`
        SELECT s.StudentID, s.Name, p.Email, p.PhoneNumber
        FROM Students s
        LEFT JOIN Parents p ON s.StudentID = p.StudentID
        WHERE s.Name = @name AND s.SchoolID = @schoolId
      `)

    return {
      cloudConnection: 'Success',
      database: dbInfo.DatabaseName,
      server: dbInfo.ServerName,
      counts: {
        students: dbInfo.StudentCount,
        parents: dbInfo.ParentCount,
        schools: dbInfo.SchoolCount
      },
      daniella: {
        exists: daniellaCheck.recordset.length > 0,
        data: daniellaCheck.recordset[0] || null
      }
    }

  } catch (error) {
    throw new Error(`Cloud connection test failed: ${error.message}`)
  }
}

async function createDaniellaManually(pool) {
  try {
    const schoolId = process.env.SCHOOL_ID || 2
    const studentName = 'DANIELLA AKU-SIKA ABBIW'
    const parentEmail = 'carlcrankson966@gmail.com'
    const parentPhone = '+233244123456'

    // Check if student already exists
    const existingStudent = await pool.request()
      .input('name', sql.NVarChar, studentName)
      .input('schoolId', sql.Int, schoolId)
      .query('SELECT StudentID FROM Students WHERE Name = @name AND SchoolID = @schoolId')

    let studentId
    let studentCreated = false

    if (existingStudent.recordset.length === 0) {
      // Create student
      const newStudent = await pool.request()
        .input('name', sql.NVarChar, studentName)
        .input('schoolId', sql.Int, schoolId)
        .input('grade', sql.NVarChar, 'SHS 1')
        .input('studentCode', sql.NVarChar, 'DANIELLA001')
        .query(`
          INSERT INTO Students (Name, SchoolID, Grade, StudentCode, IsActive)
          OUTPUT INSERTED.StudentID
          VALUES (@name, @schoolId, @grade, @studentCode, 1)
        `)
      
      studentId = newStudent.recordset[0].StudentID
      studentCreated = true
    } else {
      studentId = existingStudent.recordset[0].StudentID
    }

    // Check if parent already exists
    const existingParent = await pool.request()
      .input('studentId', sql.Int, studentId)
      .query('SELECT ParentID FROM Parents WHERE StudentID = @studentId')

    let parentCreated = false
    if (existingParent.recordset.length === 0) {
      // Create parent
      await pool.request()
        .input('studentId', sql.Int, studentId)
        .input('name', sql.NVarChar, 'DANIELLA Parent')
        .input('email', sql.NVarChar, parentEmail)
        .input('phone', sql.NVarChar, parentPhone)
        .query(`
          INSERT INTO Parents (StudentID, Name, Email, PhoneNumber, IsPrimary)
          VALUES (@studentId, @name, @email, @phone, 1)
        `)
      parentCreated = true
    } else {
      // Update existing parent
      await pool.request()
        .input('studentId', sql.Int, studentId)
        .input('email', sql.NVarChar, parentEmail)
        .input('phone', sql.NVarChar, parentPhone)
        .query(`
          UPDATE Parents 
          SET Email = @email, PhoneNumber = @phone
          WHERE StudentID = @studentId
        `)
    }

    // Get final result
    const finalResult = await pool.request()
      .input('studentId', sql.Int, studentId)
      .query(`
        SELECT 
          s.StudentID,
          s.Name as StudentName,
          s.Grade,
          s.StudentCode,
          p.Name as ParentName,
          p.Email as ParentEmail,
          p.PhoneNumber as ParentPhone
        FROM Students s
        LEFT JOIN Parents p ON s.StudentID = p.StudentID
        WHERE s.StudentID = @studentId
      `)

    return {
      studentId,
      studentCreated,
      parentCreated: parentCreated,
      daniella: finalResult.recordset[0],
      message: `DANIELLA ${studentCreated ? 'created' : 'updated'} successfully in cloud database`,
      readyForNotifications: true
    }

  } catch (error) {
    throw new Error(`Create DANIELLA manually failed: ${error.message}`)
  }
}

async function listStudents(pool) {
  try {
    const students = await pool.request().query(`
      SELECT TOP 10
        s.StudentID,
        s.Name,
        s.Grade,
        s.StudentCode,
        p.Email,
        p.PhoneNumber,
        CASE WHEN p.Email IS NOT NULL OR p.PhoneNumber IS NOT NULL THEN 1 ELSE 0 END as HasContact
      FROM Students s
      LEFT JOIN Parents p ON s.StudentID = p.StudentID
      WHERE s.IsActive = 1
      ORDER BY s.Name
    `)

    const summary = {
      totalStudents: students.recordset.length,
      withContact: students.recordset.filter(s => s.HasContact).length,
      withoutContact: students.recordset.filter(s => !s.HasContact).length
    }

    return {
      students: students.recordset,
      summary,
      daniella: students.recordset.find(s => s.Name.includes('DANIELLA'))
    }

  } catch (error) {
    throw new Error(`List students failed: ${error.message}`)
  }
}

async function testNotificationsDaniella(pool) {
  try {
    // Find DANIELLA
    const daniella = await pool.request()
      .input('name', sql.NVarChar, 'DANIELLA AKU-SIKA ABBIW')
      .query(`
        SELECT 
          s.StudentID,
          s.Name,
          p.Email,
          p.PhoneNumber
        FROM Students s
        LEFT JOIN Parents p ON s.StudentID = p.StudentID
        WHERE s.Name = @name
      `)

    if (daniella.recordset.length === 0) {
      throw new Error('DANIELLA not found. Create her first.')
    }

    const student = daniella.recordset[0]

    // Call the notifications API
    const notificationResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/notifications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'send_attendance_notification',
        data: {
          studentId: student.StudentID,
          attendanceAction: 'IN',
          schoolId: process.env.SCHOOL_ID || 2
        }
      })
    })

    const notificationResult = await notificationResponse.json()

    return {
      student,
      notificationTest: notificationResult,
      message: 'DANIELLA notification test completed'
    }

  } catch (error) {
    throw new Error(`Test notifications failed: ${error.message}`)
  }
}