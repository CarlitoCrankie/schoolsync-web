const sql = require('mssql')
const crypto = require('crypto')
const jwt = require('jsonwebtoken')

const config = {
  server: process.env.RDS_SERVER,
  database: process.env.RDS_DB,
  user: process.env.RDS_USER,
  password: process.env.RDS_PASSWORD,
  options: {
    encrypt: true,
    trustServerCertificate: true,
    requestTimeout: 30000,
    connectionTimeout: 30000,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
}

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex')
}

function generateToken(userData) {
  return jwt.sign(userData, process.env.JWT_SECRET_KEY || 'fallback-secret', { expiresIn: '24h' })
}

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true)
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT')
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization')

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { action, username, password, student_name, school_id, new_password } = req.body

  try {
    const pool = await sql.connect(config)

    if (action === 'login') {
      return await handleLogin(pool, username, password, res)
    } else if (action === 'check_password_status') {
      return await handleCheckPasswordStatus(pool, student_name, school_id, res)
    } else if (action === 'set_password') {
      return await handleSetPassword(pool, student_name, school_id, new_password, res)
    }

    await pool.close()
    return res.status(400).json({ error: 'Invalid action' })

  } catch (error) {
    console.error('Auth error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

async function handleLogin(pool, username, password, res) {
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' })
  }

  // Try admin login first
  const adminResult = await pool.request()
    .input('username', sql.NVarChar, username)
    .query(`
      SELECT u.UserID, u.Username, u.PasswordHash, u.Role, u.SchoolID, s.Name as SchoolName
      FROM Users u
      LEFT JOIN Schools s ON u.SchoolID = s.SchoolID
      WHERE u.Username = @username AND u.IsActive = 1
    `)

  if (adminResult.recordset.length > 0) {
    const user = adminResult.recordset[0]
    const hashedInput = hashPassword(password)
    
    if (hashedInput === user.PasswordHash) {
      const token = generateToken({
        user_id: user.UserID,
        username: user.Username,
        role: user.Role,
        school_id: user.SchoolID,
        user_type: 'admin'
      })

      await pool.close()
      return res.json({
        token,
        user: {
          id: user.UserID,
          username: user.Username,
          role: user.Role,
          user_type: 'admin',
          school: user.SchoolID ? {
            id: user.SchoolID,
            name: user.SchoolName
          } : null
        }
      })
    }
  }

  // Try parent login
  const parentResult = await pool.request()
    .input('studentName', sql.NVarChar, username)
    .input('passwordHash', sql.NVarChar, hashPassword(password))
    .query(`
      SELECT 
        s.StudentID,
        s.Name as StudentName,
        s.SchoolID,
        sc.Name as SchoolName,
        s.Grade,
        p.Name as ParentName,
        p.PhoneNumber,
        p.Email
      FROM Students s
      JOIN Schools sc ON s.SchoolID = sc.SchoolID
      LEFT JOIN Parents p ON s.StudentID = p.StudentID AND p.IsPrimary = 1
      WHERE s.Name = @studentName 
      AND s.ParentPasswordHash = @passwordHash 
      AND s.ParentPasswordSet = 1 
      AND s.IsActive = 1
    `)

  if (parentResult.recordset.length > 0) {
    const user = parentResult.recordset[0]
    
    // Update last login
    await pool.request()
      .input('studentName', sql.NVarChar, username)
      .input('passwordHash', sql.NVarChar, hashPassword(password))
      .query(`
        UPDATE Students 
        SET LastLoginAt = GETDATE()
        WHERE Name = @studentName AND ParentPasswordHash = @passwordHash
      `)

    const token = generateToken({
      student_id: user.StudentID,
      student_name: user.StudentName,
      school_id: user.SchoolID,
      parent_name: user.ParentName,
      role: 'parent',
      user_type: 'parent'
    })

    await pool.close()
    return res.json({
      token,
      user: {
        student_id: user.StudentID,
        student_name: user.StudentName,
        parent_name: user.ParentName,
        role: 'parent',
        user_type: 'parent',
        school: {
          id: user.SchoolID,
          name: user.SchoolName
        }
      }
    })
  }

  await pool.close()
  return res.status(401).json({ error: 'Invalid credentials' })
}

async function handleCheckPasswordStatus(pool, student_name, school_id, res) {
  if (!student_name || !school_id) {
    return res.status(400).json({ error: 'Student name and school ID required' })
  }

  const result = await pool.request()
    .input('studentName', sql.NVarChar, student_name)
    .input('schoolId', sql.Int, school_id)
    .query(`
      SELECT ParentPasswordSet, Grade, 
             (SELECT Name FROM Schools WHERE SchoolID = s.SchoolID) as SchoolName
      FROM Students s 
      WHERE Name = @studentName AND SchoolID = @schoolId AND IsActive = 1
    `)

  await pool.close()

  if (result.recordset.length === 0) {
    return res.status(404).json({ error: 'Student not found' })
  }

  const student = result.recordset[0]
  return res.json({
    password_set: Boolean(student.ParentPasswordSet),
    student_name,
    grade: student.Grade,
    school_name: student.SchoolName
  })
}

async function handleSetPassword(pool, student_name, school_id, new_password, res) {
  if (!student_name || !school_id || !new_password) {
    return res.status(400).json({ error: 'All fields required' })
  }

  if (new_password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' })
  }

  const result = await pool.request()
    .input('studentName', sql.NVarChar, student_name)
    .input('schoolId', sql.Int, school_id)
    .input('passwordHash', sql.NVarChar, hashPassword(new_password))
    .query(`
      UPDATE Students 
      SET ParentPasswordHash = @passwordHash, ParentPasswordSet = 1
      WHERE Name = @studentName AND SchoolID = @schoolId AND IsActive = 1
    `)

  await pool.close()

  if (result.rowsAffected[0] === 0) {
    return res.status(404).json({ error: 'Student not found or password already set' })
  }

  return res.json({ message: 'Password set successfully' })
}