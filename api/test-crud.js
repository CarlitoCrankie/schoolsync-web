// pages/api/test-crud.js - Basic testing API
const sql = require('mssql')

const config = {
  server: process.env.RDS_SERVER,
  database: process.env.RDS_DB,
  user: process.env.RDS_USER,
  password: process.env.RDS_PASSWORD,
  options: {
    encrypt: true,
    trustServerCertificate: true,
    enableArithAbort: true,
    connectTimeout: 30000,
    requestTimeout: 30000,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
}

let pool = null

const getPool = async () => {
  if (!pool || !pool.connected) {
    pool = new sql.ConnectionPool(config)
    await pool.connect()
  }
  return pool
}

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  const { operation, table, data, id } = req.method === 'GET' ? req.query : req.body

  try {
    const currentPool = await getPool()
    let result = {}

    switch (operation) {
      case 'TEST_ALL':
        result = await handleTestAll(currentPool)
        break
      case 'CREATE':
        result = await handleCreate(currentPool, table, data)
        break
      case 'READ':
        result = await handleRead(currentPool, table, id)
        break
      case 'UPDATE':
        result = await handleUpdate(currentPool, table, id, data)
        break
      case 'DELETE':
        result = await handleDelete(currentPool, table, id)
        break
      default:
        return res.status(400).json({ error: 'Invalid operation. Use: CREATE, READ, UPDATE, DELETE, TEST_ALL' })
    }

    res.status(200).json({
      success: true,
      operation,
      table,
      timestamp: new Date().toISOString(),
      result
    })

  } catch (error) {
    console.error('CRUD Test Error:', error)
    res.status(500).json({
      success: false,
      error: error.message,
      operation,
      table,
      timestamp: new Date().toISOString()
    })
  }
}

// Test all operations
async function handleTestAll(pool) {
  const results = {}

  try {
    // Test database connectivity
    const connectTest = await pool.request().query('SELECT GETDATE() as CurrentTime, @@SERVERNAME as ServerName')
    results.connectivity = {
      status: 'success',
      server: connectTest.recordset[0].ServerName,
      time: connectTest.recordset[0].CurrentTime
    }

    // Test table existence
    const tableCheck = await pool.request().query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_TYPE = 'BASE TABLE'
      AND TABLE_NAME IN ('Students', 'StudentAttendance', 'Schools', 'Users', 'Parents')
    `)
    results.tables = {
      available: tableCheck.recordset.map(row => row.TABLE_NAME),
      expected: ['Students', 'StudentAttendance', 'Schools', 'Users', 'Parents']
    }

    // Test record counts
    const counts = await pool.request().query(`
      SELECT 
        'Students' as TableName, COUNT(*) as RecordCount FROM Students WHERE IsActive = 1
      UNION ALL
      SELECT 'Users', COUNT(*) FROM Users WHERE IsActive = 1
      UNION ALL
      SELECT 'Schools', COUNT(*) FROM Schools
    `)
    results.recordCounts = counts.recordset

    results.overallStatus = 'success'

  } catch (error) {
    results.error = error.message
    results.overallStatus = 'failed'
  }

  return results
}

// CREATE operation - Fixed to handle School foreign key constraint
async function handleCreate(pool, table, data) {
  switch (table) {
    case 'students':
      // First, ensure we have a valid school
      let schoolId = data.schoolId || 1
      
      // Check if school exists, or get any existing school
      const schoolCheck = await pool.request()
        .input('schoolId', sql.Int, schoolId)
        .query(`
          SELECT COUNT(*) as SchoolExists FROM Schools WHERE SchoolID = @schoolId
          UNION ALL
          SELECT TOP 1 SchoolID as SchoolExists FROM Schools
        `)
      
      if (schoolCheck.recordset[0].SchoolExists === 0) {
        // Check if any schools exist
        const anySchool = await pool.request().query('SELECT TOP 1 SchoolID FROM Schools')
        
        if (anySchool.recordset.length > 0) {
          // Use existing school
          schoolId = anySchool.recordset[0].SchoolID
        } else {
          // Create a test school with unique name
          const schoolResult = await pool.request()
            .input('schoolName', sql.NVarChar, `Test School ${Date.now()}`)
            .query(`
              INSERT INTO Schools (Name) 
              OUTPUT INSERTED.SchoolID
              VALUES (@schoolName)
            `)
          schoolId = schoolResult.recordset[0].SchoolID
        }
      }
      
      // Now create the student with valid schoolId
      const createResult = await pool.request()
        .input('name', sql.NVarChar, data.name)
        .input('schoolId', sql.Int, schoolId)
        .input('grade', sql.NVarChar, data.grade)
        .query(`
          INSERT INTO Students (Name, SchoolID, Grade, IsActive)
          OUTPUT INSERTED.*
          VALUES (@name, @schoolId, @grade, 1)
        `)
      
      // Also create parent record if provided
      if (data.parentName && createResult.recordset[0]) {
        const studentId = createResult.recordset[0].StudentID
        try {
          await pool.request()
            .input('studentId', sql.Int, studentId)
            .input('parentName', sql.NVarChar, data.parentName)
            .input('parentPhone', sql.NVarChar, data.parentPhone)
            .input('parentEmail', sql.NVarChar, data.parentEmail)
            .query(`
              INSERT INTO Parents (StudentID, Name, PhoneNumber, Email, IsPrimary)
              VALUES (@studentId, @parentName, @parentPhone, @parentEmail, 1)
            `)
        } catch (parentError) {
          console.log('Parent creation failed (table might not exist):', parentError.message)
        }
      }
      
      return { 
        created: createResult.recordset[0], 
        parentAdded: !!data.parentName,
        schoolCreated: schoolCheck.recordset[0].SchoolExists === 0,
        usedSchoolId: schoolId
      }

    case 'attendance':
      // First check what attendance table exists
      const attendanceTables = await pool.request().query(`
        SELECT TABLE_NAME 
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_NAME LIKE '%Attendance%' OR TABLE_NAME LIKE '%attendance%'
      `)
      
      let tableName = 'StudentAttendance'
      
      if (attendanceTables.recordset.length === 0) {
        // No attendance table exists, create one for testing
        try {
          await pool.request().query(`
            CREATE TABLE StudentAttendance (
              AttendanceID INT IDENTITY(1,1) PRIMARY KEY,
              StudentID INT NOT NULL,
              AttendanceDate DATE NOT NULL,
              Status NVARCHAR(20) NOT NULL,
              Remarks NVARCHAR(500),
              CreatedAt DATETIME DEFAULT GETDATE(),
              FOREIGN KEY (StudentID) REFERENCES Students(StudentID)
            )
          `)
        } catch (createError) {
          return {
            created: null,
            error: createError.message,
            message: 'Failed to create StudentAttendance table'
          }
        }
      } else {
        // Use the first attendance table found
        tableName = attendanceTables.recordset[0].TABLE_NAME
      }
      
      // Create attendance record
      try {
        return await pool.request()
          .input('studentId', sql.Int, data.studentId)
          .input('date', sql.Date, data.date || new Date().toISOString().split('T')[0])
          .input('status', sql.NVarChar, data.status)
          .input('remarks', sql.NVarChar, data.remarks || null)
          .query(`
            INSERT INTO ${tableName} (StudentID, AttendanceDate, Status, Remarks)
            OUTPUT INSERTED.*
            VALUES (@studentId, @date, @status, @remarks)
          `)
      } catch (insertError) {
        // If insert fails, let's see what columns actually exist
        const columnCheck = await pool.request().query(`
          SELECT COLUMN_NAME 
          FROM INFORMATION_SCHEMA.COLUMNS 
          WHERE TABLE_NAME = '${tableName}'
          ORDER BY ORDINAL_POSITION
        `)
        
        return {
          created: null,
          error: insertError.message,
          availableColumns: columnCheck.recordset.map(c => c.COLUMN_NAME),
          tableName: tableName,
          message: 'Insert failed - check column names'
        }
      }

    default:
      throw new Error(`CREATE not implemented for table: ${table}`)
  }
}

// READ operation
async function handleRead(pool, table, id) {
  switch (table) {
    case 'students':
      if (id) {
        return await pool.request()
          .input('studentId', sql.Int, id)
          .query(`
            SELECT 
              s.*,
              p.Name as ParentName,
              p.PhoneNumber as ParentPhone,
              p.Email as ParentEmail
            FROM Students s
            LEFT JOIN Parents p ON s.StudentID = p.StudentID AND p.IsPrimary = 1
            WHERE s.StudentID = @studentId
          `)
      } else {
        return await pool.request().query(`
          SELECT TOP 10
            s.StudentID,
            s.Name,
            s.Grade,
            s.SchoolID,
            s.IsActive,
            p.Name as ParentName
          FROM Students s
          LEFT JOIN Parents p ON s.StudentID = p.StudentID AND p.IsPrimary = 1
          ORDER BY s.StudentID DESC
        `)
      }

    default:
      throw new Error(`READ not implemented for table: ${table}`)
  }
}

// UPDATE operation - Fixed to handle School foreign key constraint
async function handleUpdate(pool, table, id, data) {
  switch (table) {
    case 'students':
      // Get the current student's school ID to avoid foreign key issues
      const currentStudent = await pool.request()
        .input('studentId', sql.Int, id)
        .query('SELECT SchoolID FROM Students WHERE StudentID = @studentId')
      
      const schoolId = currentStudent.recordset[0]?.SchoolID || data.schoolId
      
      return await pool.request()
        .input('studentId', sql.Int, id)
        .input('name', sql.NVarChar, data.name)
        .input('grade', sql.NVarChar, data.grade)
        .input('schoolId', sql.Int, schoolId) // Use existing school ID
        .query(`
          UPDATE Students 
          SET Name = @name, Grade = @grade, SchoolID = @schoolId
          OUTPUT INSERTED.*
          WHERE StudentID = @studentId
        `)

    default:
      throw new Error(`UPDATE not implemented for table: ${table}`)
  }
}

// DELETE operation - Fixed for your database schema
async function handleDelete(pool, table, id) {
  switch (table) {
    case 'students':
      return await pool.request()
        .input('studentId', sql.Int, id)
        .query(`
          UPDATE Students 
          SET IsActive = 0
          OUTPUT INSERTED.*
          WHERE StudentID = @studentId
        `)

    default:
      throw new Error(`DELETE not implemented for table: ${table}`)
  }
}