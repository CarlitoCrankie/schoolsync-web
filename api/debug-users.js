// pages/api/debug-users.js - Temporary file to check database contents
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
    max: 5,
    min: 0,
    idleTimeoutMillis: 30000,
  },
}

let pool = null

const getPool = async () => {
  if (!pool) {
    pool = new sql.ConnectionPool(config)
    await pool.connect()
  }
  return pool
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const currentPool = await getPool()
    
    // Check if Users table exists and get sample data
    const usersCheck = await currentPool.request().query(`
      SELECT TOP 10 
        UserID, 
        Username, 
        Role, 
        SchoolID, 
        IsActive,
        CASE 
          WHEN PasswordHash IS NOT NULL THEN 'Has Password' 
          ELSE 'No Password' 
        END as PasswordStatus
      FROM Users
      ORDER BY UserID
    `)

    // Also check Students table for parent logins
    const studentsCheck = await currentPool.request().query(`
      SELECT TOP 5
        StudentID,
        Name,
        SchoolID,
        Grade,
        ParentPasswordSet,
        CASE 
          WHEN ParentPasswordHash IS NOT NULL THEN 'Has Password' 
          ELSE 'No Password' 
        END as ParentPasswordStatus
      FROM Students
      WHERE IsActive = 1
      ORDER BY StudentID
    `)

    // Check Schools table
    const schoolsCheck = await currentPool.request().query(`
      SELECT SchoolID, Name 
      FROM Schools
      ORDER BY SchoolID
    `)

    res.status(200).json({
      database_info: {
        server: process.env.RDS_SERVER,
        database: process.env.RDS_DB
      },
      users: {
        count: usersCheck.recordset.length,
        sample_users: usersCheck.recordset
      },
      students: {
        count: studentsCheck.recordset.length,
        sample_students: studentsCheck.recordset
      },
      schools: {
        count: schoolsCheck.recordset.length,
        schools: schoolsCheck.recordset
      },
      usage_info: {
        admin_login: "Use any username from 'users' table above",
        parent_login: "Use student name from 'students' table where ParentPasswordSet = 1",
        note: "DELETE this debug file after checking!"
      }
    })

  } catch (error) {
    console.error('Debug users error:', error)
    
    res.status(500).json({
      error: error.message,
      hint: "Tables might not exist yet. Check if database is properly set up.",
      tables_to_create: [
        "Users (for admin login)",
        "Students (for parent login)", 
        "Schools (for school info)"
      ]
    })
  }
}