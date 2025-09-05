// pages/api/students.js - Students CRUD API
const { getPool, sql } = require('../../lib/database')
const bcrypt = require('bcrypt')

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  try {
    switch (req.method) {
      case 'GET':
        return await handleGet(req, res)
      case 'POST':
        return await handlePost(req, res)
      case 'PUT':
        return await handlePut(req, res)
      case 'DELETE':
        return await handleDelete(req, res)
      default:
        return res.status(405).json({ error: 'Method not allowed' })
    }
  } catch (error) {
    console.error('Students API error:', error)
    res.status(500).json({
      error: error.message,
      timestamp: new Date().toISOString()
    })
  }
}

async function handleGet(req, res) {
  const { student_id, school_id, include_stats, search, grade, active_only } = req.query
  const pool = await getPool()

  let query = `
    SELECT 
      st.StudentID,
      st.Name as StudentName,
      st.SchoolID,
      s.Name as SchoolName,
      st.Grade,
      st.StudentCode,
      st.ParentPasswordSet,
      st.IsActive,
      st.CreatedAt,
      st.LastLoginAt
  `
  
  if (include_stats === 'true') {
    query += `,
      (SELECT COUNT(*) FROM dbo.Attendance a WHERE a.StudentID = st.StudentID AND CAST(a.CreatedAt as DATE) = CAST(GETDATE() as DATE)) as TodayAttendance,
      (SELECT COUNT(*) FROM dbo.Attendance a WHERE a.StudentID = st.StudentID AND a.CreatedAt > DATEADD(day, -7, GETDATE())) as WeekAttendance,
      (SELECT COUNT(*) FROM dbo.Attendance a WHERE a.StudentID = st.StudentID AND a.CreatedAt > DATEADD(day, -30, GETDATE())) as MonthAttendance,
      (SELECT MAX(a.CreatedAt) FROM dbo.Attendance a WHERE a.StudentID = st.StudentID) as LastAttendance,
      (SELECT TOP 1 a.Status FROM dbo.Attendance a WHERE a.StudentID = st.StudentID ORDER BY a.CreatedAt DESC) as LastAttendanceStatus,
      (SELECT COUNT(*) FROM dbo.Attendance a WHERE a.StudentID = st.StudentID) as TotalAttendance
    `
  }
  
  query += `
    FROM Students st
    LEFT JOIN Schools s ON st.SchoolID = s.SchoolID
  `
  
  const conditions = []
  const request = pool.request()
  
  if (student_id) {
    conditions.push('st.StudentID = @studentId')
    request.input('studentId', sql.Int, parseInt(student_id))
  }
  
  if (school_id) {
    conditions.push('st.SchoolID = @schoolId')
    request.input('schoolId', sql.Int, parseInt(school_id))
  }
  
  if (search) {
    conditions.push('(st.Name LIKE @search OR st.StudentCode LIKE @search)')
    request.input('search', sql.NVarChar, `%${search}%`)
  }
  
  if (grade) {
    conditions.push('st.Grade = @grade')
    request.input('grade', sql.NVarChar, grade)
  }
  
  if (active_only === 'true') {
    conditions.push('st.IsActive = 1')
  }
  
  if (conditions.length > 0) {
    query += ` WHERE ${conditions.join(' AND ')}`
  }
  
  query += ` ORDER BY st.Name, st.Grade`
  
  const result = await request.query(query)
  
  const students = result.recordset.map(student => ({
    student_id: student.StudentID,
    name: student.StudentName,
    school_id: student.SchoolID,
    school_name: student.SchoolName,
    grade: student.Grade,
    student_code: student.StudentCode,
    parent_password_set: student.ParentPasswordSet || false,
    is_active: student.IsActive || false,
    created_at: student.CreatedAt,
    last_login_at: student.LastLoginAt,
    ...(include_stats === 'true' && {
      attendance_stats: {
        today: student.TodayAttendance || 0,
        week: student.WeekAttendance || 0,
        month: student.MonthAttendance || 0,
        total: student.TotalAttendance || 0,
        last_attendance: student.LastAttendance,
        last_status: student.LastAttendanceStatus
      }
    })
  }))

  res.json({
    success: true,
    data: student_id ? students[0] : students,
    total: students.length,
    timestamp: new Date().toISOString()
  })
}

async function handlePost(req, res) {
  const { name, school_id, grade, student_code, parent_password, is_active = true } = req.body
  
  if (!name || !school_id) {
    return res.status(400).json({ error: 'Name and school_id are required' })
  }

  const pool = await getPool()
  
  // Check if school exists
  const schoolCheck = await pool.request()
    .input('schoolId', sql.Int, parseInt(school_id))
    .query('SELECT SchoolID FROM Schools WHERE SchoolID = @schoolId')
    
  if (schoolCheck.recordset.length === 0) {
    return res.status(400).json({ error: 'School not found' })
  }
  
  // Check if student code is unique within school
  if (student_code) {
    const codeCheck = await pool.request()
      .input('studentCode', sql.NVarChar, student_code)
      .input('schoolId', sql.Int, parseInt(school_id))
      .query('SELECT StudentID FROM Students WHERE StudentCode = @studentCode AND SchoolID = @schoolId')
      
    if (codeCheck.recordset.length > 0) {
      return res.status(400).json({ error: 'Student code already exists in this school' })
    }
  }
  
  // Hash parent password if provided
  let hashedPassword = null
  let passwordSet = false
  if (parent_password) {
    hashedPassword = await bcrypt.hash(parent_password, 10)
    passwordSet = true
  }
  
  const result = await pool.request()
    .input('name', sql.NVarChar, name)
    .input('schoolId', sql.Int, parseInt(school_id))
    .input('grade', sql.NVarChar, grade)
    .input('studentCode', sql.NVarChar, student_code)
    .input('parentPasswordHash', sql.NVarChar, hashedPassword)
    .input('parentPasswordSet', sql.Bit, passwordSet)
    .input('isActive', sql.Bit, is_active)
    .query(`
      INSERT INTO Students (Name, SchoolID, Grade, StudentCode, ParentPasswordHash, ParentPasswordSet, IsActive, CreatedAt)
      OUTPUT INSERTED.*
      VALUES (@name, @schoolId, @grade, @studentCode, @parentPasswordHash, @parentPasswordSet, @isActive, GETDATE())
    `)

  const newStudent = result.recordset[0]

  res.status(201).json({
    success: true,
    data: {
      student_id: newStudent.StudentID,
      name: newStudent.Name,
      school_id: newStudent.SchoolID,
      grade: newStudent.Grade,
      student_code: newStudent.StudentCode,
      parent_password_set: newStudent.ParentPasswordSet,
      is_active: newStudent.IsActive,
      created_at: newStudent.CreatedAt
    },
    message: 'Student created successfully',
    timestamp: new Date().toISOString()
  })
}

async function handlePut(req, res) {
  const { student_id } = req.query
  const { name, grade, student_code, parent_password, is_active } = req.body
  
  if (!student_id) {
    return res.status(400).json({ error: 'Student ID is required' })
  }

  const pool = await getPool()
  
  // Check if student exists
  const existingStudent = await pool.request()
    .input('studentId', sql.Int, parseInt(student_id))
    .query('SELECT StudentID, SchoolID FROM Students WHERE StudentID = @studentId')
    
  if (existingStudent.recordset.length === 0) {
    return res.status(404).json({ error: 'Student not found' })
  }

  // Check student code uniqueness if updating
  if (student_code) {
    const codeCheck = await pool.request()
      .input('studentCode', sql.NVarChar, student_code)
      .input('schoolId', sql.Int, existingStudent.recordset[0].SchoolID)
      .input('studentId', sql.Int, parseInt(student_id))
      .query('SELECT StudentID FROM Students WHERE StudentCode = @studentCode AND SchoolID = @schoolId AND StudentID != @studentId')
      
    if (codeCheck.recordset.length > 0) {
      return res.status(400).json({ error: 'Student code already exists in this school' })
    }
  }

  // Build dynamic update query
  const updates = []
  const request = pool.request()
  request.input('studentId', sql.Int, parseInt(student_id))
  
  if (name) {
    updates.push('Name = @name')
    request.input('name', sql.NVarChar, name)
  }
  if (grade) {
    updates.push('Grade = @grade')
    request.input('grade', sql.NVarChar, grade)
  }
  if (student_code !== undefined) {
    updates.push('StudentCode = @studentCode')
    request.input('studentCode', sql.NVarChar, student_code)
  }
  if (parent_password) {
    const hashedPassword = await bcrypt.hash(parent_password, 10)
    updates.push('ParentPasswordHash = @parentPasswordHash')
    updates.push('ParentPasswordSet = 1')
    request.input('parentPasswordHash', sql.NVarChar, hashedPassword)
  }
  if (is_active !== undefined) {
    updates.push('IsActive = @isActive')
    request.input('isActive', sql.Bit, is_active)
  }
  
  if (updates.length === 0) {
    return res.status(400).json({ error: 'No fields to update' })
  }
  
  const result = await request.query(`
    UPDATE Students 
    SET ${updates.join(', ')}
    OUTPUT INSERTED.*
    WHERE StudentID = @studentId
  `)

  const updatedStudent = result.recordset[0]

  res.json({
    success: true,
    data: {
      student_id: updatedStudent.StudentID,
      name: updatedStudent.Name,
      school_id: updatedStudent.SchoolID,
      grade: updatedStudent.Grade,
      student_code: updatedStudent.StudentCode,
      parent_password_set: updatedStudent.ParentPasswordSet,
      is_active: updatedStudent.IsActive,
      created_at: updatedStudent.CreatedAt,
      last_login_at: updatedStudent.LastLoginAt
    },
    message: 'Student updated successfully',
    timestamp: new Date().toISOString()
  })
}

async function handleDelete(req, res) {
  const { student_id } = req.query
  const { force_delete } = req.body // Allow force delete via body
  
  if (!student_id) {
    return res.status(400).json({ error: 'Student ID is required' })
  }

  const pool = await getPool()
  
  // Check if student exists and get related data count
  const studentCheck = await pool.request()
    .input('studentId', sql.Int, parseInt(student_id))
    .query(`
      SELECT 
        st.StudentID, 
        st.Name,
        (SELECT COUNT(*) FROM dbo.Attendance a WHERE a.StudentID = st.StudentID) as AttendanceCount
      FROM Students st 
      WHERE st.StudentID = @studentId
    `)
    
  if (studentCheck.recordset.length === 0) {
    return res.status(404).json({ error: 'Student not found' })
  }

  const student = studentCheck.recordset[0]
  
  // Soft delete if there are attendance records (unless force delete)
  if (student.AttendanceCount > 0 && !force_delete) {
    const result = await pool.request()
      .input('studentId', sql.Int, parseInt(student_id))
      .query(`
        UPDATE Students 
        SET IsActive = 0
        OUTPUT INSERTED.*
        WHERE StudentID = @studentId
      `)

    return res.json({
      success: true,
      message: `Student "${student.Name}" deactivated (has ${student.AttendanceCount} attendance records)`,
      action: 'soft_delete',
      note: 'Use force_delete: true to permanently delete',
      timestamp: new Date().toISOString()
    })
  }

  // Hard delete
  if (force_delete && student.AttendanceCount > 0) {
    // Delete attendance records first
    await pool.request()
      .input('studentId', sql.Int, parseInt(student_id))
      .query('DELETE FROM dbo.Attendance WHERE StudentID = @studentId')
  }

  await pool.request()
    .input('studentId', sql.Int, parseInt(student_id))
    .query('DELETE FROM Students WHERE StudentID = @studentId')

  res.json({
    success: true,
    message: `Student "${student.Name}" deleted permanently`,
    action: 'hard_delete',
    attendance_records_deleted: student.AttendanceCount,
    timestamp: new Date().toISOString()
  })
}