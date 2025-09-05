// pages/api/attendance.js - API for parent attendance data
const { getPool, sql } = require('../../lib/database')

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { action, student_id, school_id, limit = 50, days = 30 } = req.body

  try {
    const pool = await getPool()
    let result = {}

    switch (action) {
      case 'get_student_attendance':
        result = await getStudentAttendance(pool, student_id, school_id, limit, days)
        break
      case 'get_attendance_stats':
        result = await getAttendanceStats(pool, student_id, school_id, days)
        break
      case 'get_recent_activity':
        result = await getRecentActivity(pool, student_id, school_id, 10)
        break
      default:
        return res.status(400).json({ error: 'Invalid action' })
    }

    res.status(200).json({
      success: true,
      action,
      timestamp: new Date().toISOString(),
      ...result
    })

  } catch (error) {
    console.error('Attendance API Error:', error)
    res.status(500).json({
      success: false,
      error: error.message,
      action,
      timestamp: new Date().toISOString()
    })
  }
}

// Get student attendance records
async function getStudentAttendance(pool, studentId, schoolId, limit, days) {
  try {
    if (!studentId) {
      throw new Error('Student ID is required')
    }

    // Get attendance records for the specified period
    const attendanceQuery = await pool.request()
      .input('studentId', sql.Int, studentId)
      .input('schoolId', sql.Int, schoolId || 2)
      .input('limit', sql.Int, limit)
      .input('days', sql.Int, days)
      .query(`
        SELECT TOP (@limit)
          a.AttendanceID,
          a.StudentID,
          a.ScanTime,
          a.Status,
          a.CreatedAt,
          s.Name as StudentName,
          s.Grade
        FROM dbo.Attendance a
        LEFT JOIN Students s ON a.StudentID = s.StudentID
        WHERE a.StudentID = @studentId 
        AND a.SchoolID = @schoolId
        AND a.ScanTime >= DATEADD(day, -@days, GETDATE())
        ORDER BY a.ScanTime DESC
      `)

    // Process attendance data for parent dashboard format
    const attendanceRecords = attendanceQuery.recordset.map(record => ({
      id: record.AttendanceID,
      date: record.ScanTime.toISOString().split('T')[0], // YYYY-MM-DD format
      scanTime: record.ScanTime.toISOString(),
      status: record.Status,
      studentName: record.StudentName,
      grade: record.Grade
    }))

    // Calculate basic stats
    const stats = calculateAttendanceStats(attendanceRecords, days)

    return {
      attendance: attendanceRecords,
      stats,
      student: attendanceRecords.length > 0 ? {
        name: attendanceRecords[0].studentName,
        grade: attendanceRecords[0].grade
      } : null,
      period: {
        days,
        from: new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        to: new Date().toISOString().split('T')[0]
      }
    }

  } catch (error) {
    throw new Error(`Get student attendance failed: ${error.message}`)
  }
}

// Get attendance statistics
async function getAttendanceStats(pool, studentId, schoolId, days) {
  try {
    if (!studentId) {
      throw new Error('Student ID is required')
    }

    // Get attendance data for stats calculation
    const statsQuery = await pool.request()
      .input('studentId', sql.Int, studentId)
      .input('schoolId', sql.Int, schoolId || 2)
      .input('days', sql.Int, days)
      .query(`
        SELECT 
          a.ScanTime,
          a.Status,
          CAST(a.ScanTime as DATE) as AttendanceDate
        FROM dbo.Attendance a
        WHERE a.StudentID = @studentId 
        AND a.SchoolID = @schoolId
        AND a.ScanTime >= DATEADD(day, -@days, GETDATE())
        ORDER BY a.ScanTime DESC
      `)

    const records = statsQuery.recordset.map(record => ({
      date: record.AttendanceDate,
      scanTime: record.ScanTime,
      status: record.Status
    }))

    return {
      stats: calculateAttendanceStats(records, days),
      totalRecords: records.length,
      period: days
    }

  } catch (error) {
    throw new Error(`Get attendance stats failed: ${error.message}`)
  }
}

// Get recent activity (last few check-ins/outs)
async function getRecentActivity(pool, studentId, schoolId, limit) {
  try {
    if (!studentId) {
      throw new Error('Student ID is required')
    }

    const recentQuery = await pool.request()
      .input('studentId', sql.Int, studentId)
      .input('schoolId', sql.Int, schoolId || 2)
      .input('limit', sql.Int, limit)
      .query(`
        SELECT TOP (@limit)
          a.AttendanceID,
          a.ScanTime,
          a.Status,
          a.CreatedAt
        FROM dbo.Attendance a
        WHERE a.StudentID = @studentId 
        AND a.SchoolID = @schoolId
        ORDER BY a.ScanTime DESC
      `)

    const recentActivity = recentQuery.recordset.map(record => ({
      id: record.AttendanceID,
      scanTime: record.ScanTime.toISOString(),
      status: record.Status,
      createdAt: record.CreatedAt.toISOString(),
      displayText: `${record.Status === 'IN' ? 'Checked in' : 'Checked out'} at ${record.ScanTime.toLocaleTimeString()}`
    }))

    return {
      recentActivity,
      count: recentActivity.length
    }

  } catch (error) {
    throw new Error(`Get recent activity failed: ${error.message}`)
  }
}

// Helper function to calculate attendance statistics
function calculateAttendanceStats(records, periodDays) {
  if (!records || records.length === 0) {
    return {
      totalDays: periodDays,
      presentDays: 0,
      lateDays: 0,
      absentDays: periodDays,
      attendanceRate: 0,
      checkIns: 0,
      checkOuts: 0
    }
  }

  // Group records by date to determine daily attendance
  const dailyAttendance = {}
  let checkIns = 0
  let checkOuts = 0

  records.forEach(record => {
    const date = record.date || record.scanTime.split('T')[0]
    
    if (!dailyAttendance[date]) {
      dailyAttendance[date] = { hasCheckIn: false, hasCheckOut: false, records: [] }
    }
    
    dailyAttendance[date].records.push(record)
    
    if (record.status === 'IN') {
      dailyAttendance[date].hasCheckIn = true
      checkIns++
    } else if (record.status === 'OUT') {
      dailyAttendance[date].hasCheckOut = true
      checkOuts++
    }
  })

  // Calculate attendance stats
  const uniqueDatesWithActivity = Object.keys(dailyAttendance).length
  const presentDays = Object.values(dailyAttendance).filter(day => day.hasCheckIn).length
  
  // For simplicity, we'll consider any day with a check-in as present
  // In a more sophisticated system, you might have business rules for late arrivals
  const lateDays = 0 // Could be calculated based on check-in times vs school start time
  const absentDays = Math.max(0, periodDays - presentDays)
  const attendanceRate = periodDays > 0 ? ((presentDays / periodDays) * 100) : 0

  return {
    totalDays: periodDays,
    presentDays,
    lateDays,
    absentDays,
    attendanceRate: Math.round(attendanceRate * 10) / 10, // Round to 1 decimal place
    checkIns,
    checkOuts,
    activeDays: uniqueDatesWithActivity,
    lastActivity: records.length > 0 ? records[0].scanTime : null
  }
}