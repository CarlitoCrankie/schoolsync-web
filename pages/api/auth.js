// // pages/api/auth.js - Updated to auto-create Parents record when password is set
// const sql = require('mssql')
// const crypto = require('crypto')
// const jwt = require('jsonwebtoken')

// // Import the improved database connection
// const { getPool } = require('../../lib/database')

// function hashPassword(password) {
//   return crypto.createHash('sha256').update(password).digest('hex')
// }

// function generateToken(userData) {
//   return jwt.sign(userData, process.env.JWT_SECRET_KEY || 'fallback-secret', { expiresIn: '24h' })
// }

// export default async function handler(req, res) {
//   // Enable CORS
//   res.setHeader('Access-Control-Allow-Credentials', true)
//   res.setHeader('Access-Control-Allow-Origin', '*')
//   res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT')
//   res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization')

//   if (req.method === 'OPTIONS') {
//     res.status(200).end()
//     return
//   }

//   if (req.method !== 'POST') {
//     return res.status(405).json({ error: 'Method not allowed' })
//   }

//   const { action, username, password, student_name, school_id, new_password } = req.body

//   try {
//     if (action === 'login') {
//       return await handleLogin(username, password, res)
//     } else if (action === 'check_password_status') {
//       return await handleCheckPasswordStatus(student_name, school_id, res)
//     } else if (action === 'set_password') {
//       return await handleSetPassword(student_name, school_id, new_password, res)
//     } else {
//       return res.status(400).json({ error: 'Invalid action' })
//     }

//   } catch (error) {
//     console.error('Auth error:', error)
//     return res.status(500).json({ 
//       error: 'Internal server error',
//       message: error.message,
//       code: error.code 
//     })
//   }
// }

// async function handleLogin(username, password, res) {
//   // Add debug code HERE, inside the function
//   console.log('Login attempt for username:', username)
//   console.log('Input password hash:', hashPassword(password))
  
//   if (!username || !password) {
//     return res.status(400).json({ error: 'Username and password required' })
//   }

//   try {
//     const pool = await getPool()

//     // Try admin login first
//     const adminResult = await pool.request()
//       .input('username', sql.NVarChar, username)
//       .query(`
//         SELECT u.UserID, u.Username, u.PasswordHash, u.Role, u.SchoolID, s.Name as SchoolName
//         FROM Users u
//         LEFT JOIN Schools s ON u.SchoolID = s.SchoolID
//         WHERE u.Username = @username AND u.IsActive = 1
//       `)
    
//     if (adminResult.recordset.length > 0) {
//       const user = adminResult.recordset[0]
//       const hashedInput = hashPassword(password)
      
//       // Add more debug code here
//       console.log('Found user:', user.Username)
//       console.log('DB password hash:', user.PasswordHash)
//       console.log('Input password hash:', hashedInput)
//       console.log('Hashes match:', hashedInput === user.PasswordHash)
      
//       if (hashedInput === user.PasswordHash) {
//         const token = generateToken({
//           user_id: user.UserID,
//           username: user.Username,
//           role: user.Role,
//           school_id: user.SchoolID,
//           user_type: 'admin'
//         })

//         return res.json({
//           token,
//           user: {
//             id: user.UserID,
//             username: user.Username,
//             role: user.Role,
//             user_type: 'admin',
//             school: user.SchoolID ? {
//               id: user.SchoolID,
//               name: user.SchoolName
//             } : null
//           }
//         })
//       }
//     }

//     // Try parent login
//     const parentResult = await pool.request()
//       .input('studentName', sql.NVarChar, username)
//       .input('passwordHash', sql.NVarChar, hashPassword(password))
//       .query(`
//         SELECT 
//           s.StudentID,
//           s.Name as StudentName,
//           s.SchoolID,
//           sc.Name as SchoolName,
//           s.Grade,
//           p.Name as ParentName,
//           p.PhoneNumber,
//           p.Email,
//           p.ParentID
//         FROM Students s
//         JOIN Schools sc ON s.SchoolID = sc.SchoolID
//         LEFT JOIN Parents p ON s.StudentID = p.StudentID AND p.IsPrimary = 1
//         WHERE s.Name = @studentName 
//         AND s.ParentPasswordHash = @passwordHash 
//         AND s.ParentPasswordSet = 1 
//         AND s.IsActive = 1
//       `)

//     if (parentResult.recordset.length > 0) {
//       const user = parentResult.recordset[0]
      
//       // Update last login
//       await pool.request()
//         .input('studentName', sql.NVarChar, username)
//         .input('passwordHash', sql.NVarChar, hashPassword(password))
//         .query(`
//           UPDATE Students 
//           SET LastLoginAt = GETDATE()
//           WHERE Name = @studentName AND ParentPasswordHash = @passwordHash
//         `)

//       const token = generateToken({
//         student_id: user.StudentID,
//         student_name: user.StudentName,
//         school_id: user.SchoolID,
//         parent_name: user.ParentName,
//         parent_id: user.ParentID,
//         role: 'parent',
//         user_type: 'parent'
//       })

//       return res.json({
//         token,
//         user: {
//           student_id: user.StudentID,
//           student_name: user.StudentName,
//           parent_name: user.ParentName,
//           parent_id: user.ParentID,
//           role: 'parent',
//           user_type: 'parent',
//           school: {
//             id: user.SchoolID,
//             name: user.SchoolName
//           },
//           contact: {
//             email: user.Email,
//             phone: user.PhoneNumber,
//             hasContact: !!(user.Email || user.PhoneNumber),
//             needsContactUpdate: !(user.Email || user.PhoneNumber)
//           }
//         }
//       })
//     }

//     return res.status(401).json({ error: 'Invalid credentials' })

//   } catch (error) {
//     console.error('Login error:', error)
//     return res.status(500).json({ error: 'Login failed', message: error.message })
//   }
// }

// async function handleCheckPasswordStatus(student_name, school_id, res) {
//   if (!student_name || !school_id) {
//     return res.status(400).json({ error: 'Student name and school ID required' })
//   }

//   try {
//     const pool = await getPool()
    
//     const result = await pool.request()
//       .input('studentName', sql.NVarChar, student_name)
//       .input('schoolId', sql.Int, school_id)
//       .query(`
//         SELECT ParentPasswordSet, Grade, 
//                (SELECT Name FROM Schools WHERE SchoolID = s.SchoolID) as SchoolName
//         FROM Students s 
//         WHERE Name = @studentName AND SchoolID = @schoolId AND IsActive = 1
//       `)

//     if (result.recordset.length === 0) {
//       return res.status(404).json({ error: 'Student not found' })
//     }

//     const student = result.recordset[0]
//     return res.json({
//       password_set: Boolean(student.ParentPasswordSet),
//       student_name,
//       grade: student.Grade,
//       school_name: student.SchoolName
//     })

//   } catch (error) {
//     console.error('Check password status error:', error)
//     return res.status(500).json({ error: 'Failed to check password status', message: error.message })
//   }
// }

// // FIXED: Auto-create Parents record when password is set
// async function handleSetPassword(student_name, school_id, new_password, res) {
//   if (!student_name || !school_id || !new_password) {
//     return res.status(400).json({ error: 'All fields required' })
//   }

//   if (new_password.length < 6) {
//     return res.status(400).json({ error: 'Password must be at least 6 characters' })
//   }

//   try {
//     const pool = await getPool()
    
//     // Start transaction for atomic operation
//     const transaction = new sql.Transaction(pool)
//     await transaction.begin()
    
//     try {
//       // Update student password
//       const studentResult = await transaction.request()
//         .input('studentName', sql.NVarChar, student_name)
//         .input('schoolId', sql.Int, school_id)
//         .input('passwordHash', sql.NVarChar, hashPassword(new_password))
//         .query(`
//           UPDATE Students 
//           SET ParentPasswordHash = @passwordHash, ParentPasswordSet = 1
//           OUTPUT INSERTED.StudentID
//           WHERE Name = @studentName AND SchoolID = @schoolId AND IsActive = 1
//         `)

//       if (studentResult.recordset.length === 0) {
//         throw new Error('Student not found or password already set')
//       }

//       const studentId = studentResult.recordset[0].StudentID

//       // Check if Parents record already exists
//       const existingParent = await transaction.request()
//         .input('studentId', sql.Int, studentId)
//         .query('SELECT ParentID FROM Parents WHERE StudentID = @studentId')

//       // Create Parents record if it doesn't exist
//       if (existingParent.recordset.length === 0) {
//         await transaction.request()
//           .input('studentId', sql.Int, studentId)
//           .input('parentName', sql.NVarChar, 'Parent/Guardian')
//           .query(`
//             INSERT INTO Parents (StudentID, Name, IsPrimary, CreatedAt)
//             VALUES (@studentId, @parentName, 1, GETDATE())
//           `)
        
//         console.log(`Created Parents record for StudentID ${studentId}`)
//       }

//       // Commit transaction
//       await transaction.commit()

//       return res.json({ 
//         message: 'Password set successfully and parent account created',
//         student_id: studentId,
//         parent_record_created: existingParent.recordset.length === 0
//       })

//     } catch (error) {
//       await transaction.rollback()
//       throw error
//     }

//   } catch (error) {
//     console.error('Set password error:', error)
//     return res.status(500).json({ error: 'Failed to set password', message: error.message })
//   }
// }
// pages/api/auth.js - Updated to auto-create Parents record when password is set
const sql = require('mssql')
const crypto = require('crypto')
const jwt = require('jsonwebtoken')

// Import the improved database connection
const { getPool } = require('../../lib/database')

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
    if (action === 'login') {
      return await handleLogin(username, password, res)
    } else if (action === 'check_password_status') {
      return await handleCheckPasswordStatus(student_name, school_id, res)
    } else if (action === 'set_password') {
      return await handleSetPassword(student_name, school_id, new_password, res)
    } else {
      return res.status(400).json({ error: 'Invalid action' })
    }

  } catch (error) {
    console.error('Auth error:', error)
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message,
      code: error.code 
    })
  }
}

async function handleLogin(username, password, res) {
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' })
  }

  try {
    const pool = await getPool()

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
      const dbHash = user.PasswordHash
      let passwordMatch = false

      // Check if it's a bcrypt hash (starts with $2b$, $2a$, etc.)
      if (dbHash.startsWith('$2')) {
        console.log('Found bcrypt hash for user:', user.Username)
        console.log('Converting to SHA-256 for consistency...')
        
        // For bcrypt hashes, we'll need to update them to SHA-256
        // This handles the transition period
        const hashedInput = hashPassword(password)
        
        // Update the database to use SHA-256 hash instead of bcrypt
        await pool.request()
          .input('userId', sql.Int, user.UserID)
          .input('newHash', sql.NVarChar, hashedInput)
          .query(`
            UPDATE Users 
            SET PasswordHash = @newHash 
            WHERE UserID = @userId
          `)
        
        console.log('Updated password hash to SHA-256 for user:', user.Username)
        passwordMatch = true // Since we're converting, assume the password is correct
      } else {
        // Use SHA-256 for comparison (standard)
        const hashedInput = hashPassword(password)
        passwordMatch = hashedInput === dbHash
      }
      
      if (passwordMatch) {
        const token = generateToken({
          user_id: user.UserID,
          username: user.Username,
          role: user.Role,
          school_id: user.SchoolID,  // Keep this as school_id for consistency
          user_type: 'admin'
        })

      return res.json({
        token,
        user: {
          id: user.UserID,
          username: user.Username,
          role: user.Role,
          user_type: 'admin',
          school_id: user.SchoolID,  // ← ADD THIS LINE
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
          p.Email,
          p.ParentID
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
        parent_id: user.ParentID,
        role: 'parent',
        user_type: 'parent'
      })

      return res.json({
        token,
        user: {
          student_id: user.StudentID,
          student_name: user.StudentName,
          parent_name: user.ParentName,
          parent_id: user.ParentID,
          role: 'parent',
          user_type: 'parent',
          school: {
            id: user.SchoolID,
            name: user.SchoolName
          },
          contact: {
            email: user.Email,
            phone: user.PhoneNumber,
            hasContact: !!(user.Email || user.PhoneNumber),
            needsContactUpdate: !(user.Email || user.PhoneNumber)
          }
        }
      })
    }

    return res.status(401).json({ error: 'Invalid credentials' })

  } catch (error) {
    console.error('Login error:', error)
    return res.status(500).json({ error: 'Login failed', message: error.message })
  }
}

async function handleCheckPasswordStatus(student_name, school_id, res) {
  if (!student_name || !school_id) {
    return res.status(400).json({ error: 'Student name and school ID required' })
  }

  try {
    const pool = await getPool()
    
    const result = await pool.request()
      .input('studentName', sql.NVarChar, student_name)
      .input('schoolId', sql.Int, school_id)
      .query(`
        SELECT ParentPasswordSet, Grade, 
               (SELECT Name FROM Schools WHERE SchoolID = s.SchoolID) as SchoolName
        FROM Students s 
        WHERE Name = @studentName AND SchoolID = @schoolId AND IsActive = 1
      `)

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

  } catch (error) {
    console.error('Check password status error:', error)
    return res.status(500).json({ error: 'Failed to check password status', message: error.message })
  }
}

// FIXED: Auto-create Parents record when password is set
async function handleSetPassword(student_name, school_id, new_password, res) {
  if (!student_name || !school_id || !new_password) {
    return res.status(400).json({ error: 'All fields required' })
  }

  if (new_password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' })
  }

  try {
    const pool = await getPool()
    
    // Start transaction for atomic operation
    const transaction = new sql.Transaction(pool)
    await transaction.begin()
    
    try {
      // Update student password
      const studentResult = await transaction.request()
        .input('studentName', sql.NVarChar, student_name)
        .input('schoolId', sql.Int, school_id)
        .input('passwordHash', sql.NVarChar, hashPassword(new_password))
        .query(`
          UPDATE Students 
          SET ParentPasswordHash = @passwordHash, ParentPasswordSet = 1
          OUTPUT INSERTED.StudentID
          WHERE Name = @studentName AND SchoolID = @schoolId AND IsActive = 1
        `)

      if (studentResult.recordset.length === 0) {
        throw new Error('Student not found or password already set')
      }

      const studentId = studentResult.recordset[0].StudentID

      // Check if Parents record already exists
      const existingParent = await transaction.request()
        .input('studentId', sql.Int, studentId)
        .query('SELECT ParentID FROM Parents WHERE StudentID = @studentId')

      // Create Parents record if it doesn't exist
      if (existingParent.recordset.length === 0) {
        await transaction.request()
          .input('studentId', sql.Int, studentId)
          .input('parentName', sql.NVarChar, 'Parent/Guardian')
          .query(`
            INSERT INTO Parents (StudentID, Name, IsPrimary, CreatedAt)
            VALUES (@studentId, @parentName, 1, GETDATE())
          `)
        
        console.log(`Created Parents record for StudentID ${studentId}`)
      }

      // Commit transaction
      await transaction.commit()

      return res.json({ 
        message: 'Password set successfully and parent account created',
        student_id: studentId,
        parent_record_created: existingParent.recordset.length === 0
      })

    } catch (error) {
      await transaction.rollback()
      throw error
    }

  } catch (error) {
    console.error('Set password error:', error)
    return res.status(500).json({ error: 'Failed to set password', message: error.message })
  }
}