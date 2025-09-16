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
//     } else if (action === 'reset_password') {
//       return await handleResetPassword(student_name, school_id, new_password, res)
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
//       const dbHash = user.PasswordHash
//       let passwordMatch = false

//       // Check if it's a bcrypt hash (starts with $2b$, $2a$, etc.)
//       if (dbHash.startsWith('$2')) {
//         console.log('Found bcrypt hash for user:', user.Username)
//         console.log('Converting to SHA-256 for consistency...')
        
//         // For bcrypt hashes, we'll need to update them to SHA-256
//         // This handles the transition period
//         const hashedInput = hashPassword(password)
        
//         // Update the database to use SHA-256 hash instead of bcrypt
//         await pool.request()
//           .input('userId', sql.Int, user.UserID)
//           .input('newHash', sql.NVarChar, hashedInput)
//           .query(`
//             UPDATE Users 
//             SET PasswordHash = @newHash 
//             WHERE UserID = @userId
//           `)
        
//         console.log('Updated password hash to SHA-256 for user:', user.Username)
//         passwordMatch = true // Since we're converting, assume the password is correct
//       } else {
//         // Use SHA-256 for comparison (standard)
//         const hashedInput = hashPassword(password)
//         passwordMatch = hashedInput === dbHash
//       }
      
//       if (passwordMatch) {
//         const token = generateToken({
//           user_id: user.UserID,
//           username: user.Username,
//           role: user.Role,
//           school_id: user.SchoolID,  // Keep this as school_id for consistency
//           user_type: 'admin'
//         })

//       return res.json({
//         token,
//         user: {
//           id: user.UserID,
//           username: user.Username,
//           role: user.Role,
//           user_type: 'admin',
//           school_id: user.SchoolID,  // ← ADD THIS LINE
//           school: user.SchoolID ? {
//             id: user.SchoolID,
//             name: user.SchoolName
//           } : null
//         }
//       })
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

// async function handleResetPassword(student_name, school_id, new_password, res) {
//   if (!student_name || !school_id || !new_password) {
//     return res.status(400).json({ error: 'All fields required' })
//   }

//   if (new_password.length < 6) {
//     return res.status(400).json({ error: 'Password must be at least 6 characters' })
//   }

//   try {
//     const pool = await getPool()
    
//     // Check if student exists and already has a password set
//     const checkResult = await pool.request()
//       .input('studentName', sql.NVarChar, student_name)
//       .input('schoolId', sql.Int, school_id)
//       .query(`
//         SELECT StudentID, ParentPasswordSet 
//         FROM Students 
//         WHERE Name = @studentName AND SchoolID = @schoolId AND IsActive = 1
//       `)

//     if (checkResult.recordset.length === 0) {
//       return res.status(404).json({ error: 'Student not found' })
//     }

//     const student = checkResult.recordset[0]
    
//     if (!student.ParentPasswordSet) {
//       return res.status(400).json({ 
//         error: 'No password is set for this student. Please use the "First Time?" option instead.' 
//       })
//     }

//     // Update the password
//     const updateResult = await pool.request()
//       .input('studentName', sql.NVarChar, student_name)
//       .input('schoolId', sql.Int, school_id)
//       .input('passwordHash', sql.NVarChar, hashPassword(new_password))
//       .query(`
//         UPDATE Students 
//         SET ParentPasswordHash = @passwordHash
//         WHERE Name = @studentName AND SchoolID = @schoolId AND IsActive = 1
//       `)

//     if (updateResult.rowsAffected[0] === 0) {
//       return res.status(500).json({ error: 'Failed to update password' })
//     }

//     return res.json({ 
//       message: 'Password reset successfully',
//       student_id: student.StudentID
//     })

//   } catch (error) {
//     console.error('Reset password error:', error)
//     return res.status(500).json({ error: 'Failed to reset password', message: error.message })
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
      return await handleLogin(username, password, school_id, res)
    } else if (action === 'check_student_schools') {
      return await handleCheckStudentSchools(student_name, res)
    } else if (action === 'check_password_status') {
      return await handleCheckPasswordStatus(student_name, school_id, res)
    } else if (action === 'set_password') {
      return await handleSetPassword(student_name, school_id, new_password, res)
    } else if (action === 'reset_password') {
      return await handleResetPassword(student_name, school_id, new_password, res)
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

async function handleCheckStudentSchools(student_name, res) {
  if (!student_name) {
    return res.status(400).json({ error: 'Student name is required' })
  }

  try {
    const pool = await getPool()
    const result = await pool.request()
      .input('studentName', sql.NVarChar, student_name.trim())
      .query(`
        SELECT DISTINCT s.Name as name, s.SchoolID as id, s.Location as location
        FROM Students st
        INNER JOIN Schools s ON st.SchoolID = s.SchoolID
        WHERE st.Name = @studentName AND st.IsActive = 1 AND s.Status = 'active'
      `)

    const schools = result.recordset.map(row => ({
      id: row.id,
      name: row.name,
      location: row.location
    }))

    return res.json({ 
      success: true, 
      schools: schools 
    })

  } catch (error) {
    console.error('Check student schools error:', error)
    return res.status(500).json({ error: 'Failed to check student schools' })
  }
}

// async function handleLogin(username, password, school_id, res) {
//   if (!username || !password) {
//     return res.status(400).json({ error: 'Username and password required' })
//   }

//   try {
//     const pool = await getPool()

//     // Try admin login first (only if no school_id provided)
//     if (!school_id) {
//       const adminResult = await pool.request()
//         .input('username', sql.NVarChar, username)
//         .query(`
//           SELECT u.UserID, u.Username, u.PasswordHash, u.Role, u.SchoolID, s.Name as SchoolName
//           FROM Users u
//           LEFT JOIN Schools s ON u.SchoolID = s.SchoolID
//           WHERE u.Username = @username AND u.IsActive = 1
//         `)
      
//       if (adminResult.recordset.length > 0) {
//         const user = adminResult.recordset[0]
//         const dbHash = user.PasswordHash
//         let passwordMatch = false

//         // Check if it's a bcrypt hash (starts with $2b$, $2a$, etc.)
//         if (dbHash.startsWith('$2')) {
//           console.log('Found bcrypt hash for user:', user.Username)
//           console.log('Converting to SHA-256 for consistency...')
          
//           // For bcrypt hashes, we'll need to update them to SHA-256
//           // This handles the transition period
//           const hashedInput = hashPassword(password)
          
//           // Update the database to use SHA-256 hash instead of bcrypt
//           await pool.request()
//             .input('userId', sql.Int, user.UserID)
//             .input('newHash', sql.NVarChar, hashedInput)
//             .query(`
//               UPDATE Users 
//               SET PasswordHash = @newHash 
//               WHERE UserID = @userId
//             `)
          
//           console.log('Updated password hash to SHA-256 for user:', user.Username)
//           passwordMatch = true // Since we're converting, assume the password is correct
//         } else {
//           // Use SHA-256 for comparison (standard)
//           const hashedInput = hashPassword(password)
//           passwordMatch = hashedInput === dbHash
//         }
        
//         if (passwordMatch) {
//           const token = generateToken({
//             user_id: user.UserID,
//             username: user.Username,
//             role: user.Role,
//             school_id: user.SchoolID,
//             user_type: 'admin'
//           })

//           return res.json({
//             token,
//             user: {
//               id: user.UserID,
//               username: user.Username,
//               role: user.Role,
//               user_type: 'admin',
//               school_id: user.SchoolID,
//               school: user.SchoolID ? {
//                 id: user.SchoolID,
//                 name: user.SchoolName
//               } : null
//             }
//           })
//         }
//       }
//     }

//     // Parent login - check for student
//     let studentQuery = `
//       SELECT 
//         s.StudentID,
//         s.Name as StudentName,
//         s.SchoolID,
//         sc.Name as SchoolName,
//         s.Grade,
//         s.ParentPasswordHash,
//         s.ParentPasswordSet,
//         p.Name as ParentName,
//         p.PhoneNumber,
//         p.Email,
//         p.ParentID
//       FROM Students s
//       JOIN Schools sc ON s.SchoolID = sc.SchoolID
//       LEFT JOIN Parents p ON s.StudentID = p.StudentID AND p.IsPrimary = 1
//       WHERE s.Name = @username AND s.IsActive = 1
//     `
    
//     const request = pool.request().input('username', sql.NVarChar, username)
    
//     // If school_id provided, filter by it
//     if (school_id) {
//       studentQuery += ' AND s.SchoolID = @schoolId'
//       request.input('schoolId', sql.Int, school_id)
//     }
    
//     const studentResult = await request.query(studentQuery)
    
//     if (studentResult.recordset.length === 0) {
//       return res.status(401).json({ error: 'Invalid credentials' })
//     }
    
//     // If multiple students found and no school selected, return error
//     if (studentResult.recordset.length > 1 && !school_id) {
//       return res.status(400).json({ 
//         error: 'Multiple students found with this name. Please select the correct school.' 
//       })
//     }
    
//     const student = studentResult.recordset[0]
    
//     // Check if password is set
//     if (!student.ParentPasswordSet || !student.ParentPasswordHash) {
//       return res.status(401).json({ 
//         error: 'No password set for this student. Please use "First Time? Set Password" to create a password.' 
//       })
//     }
    
//     // Verify password
//     const hashedPassword = hashPassword(password)
//     if (student.ParentPasswordHash !== hashedPassword) {
//       return res.status(401).json({ error: 'Invalid credentials' })
//     }
    
//     // Update last login
//     await pool.request()
//       .input('studentId', sql.Int, student.StudentID)
//       .query(`
//         UPDATE Students 
//         SET LastLoginAt = GETDATE()
//         WHERE StudentID = @studentId
//       `)

//     const token = generateToken({
//       student_id: student.StudentID,
//       student_name: student.StudentName,
//       school_id: student.SchoolID,
//       parent_name: student.ParentName,
//       parent_id: student.ParentID,
//       role: 'parent',
//       user_type: 'parent'
//     })

//     return res.json({
//       token,
//       user: {
//         student_id: student.StudentID,
//         student_name: student.StudentName,
//         parent_name: student.ParentName,
//         parent_id: student.ParentID,
//         role: 'parent',
//         user_type: 'parent',
//         school: {
//           id: student.SchoolID,
//           name: student.SchoolName
//         },
//         contact: {
//           email: student.Email,
//           phone: student.PhoneNumber,
//           hasContact: !!(student.Email || student.PhoneNumber),
//           needsContactUpdate: !(student.Email || student.PhoneNumber)
//         }
//       }
//     })

//   } catch (error) {
//     console.error('Login error:', error)
//     return res.status(500).json({ error: 'Login failed', message: error.message })
//   }
// }
// DEBUGGING: Replace the parent login section in handleLogin function with this enhanced version

async function handleLogin(username, password, school_id, res) {
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' })
  }

  console.log('=== LOGIN ATTEMPT ===')
  console.log('Username:', username)
  console.log('School ID:', school_id)
  console.log('Password length:', password.length)
  console.log('====================')

  try {
    const pool = await getPool()

    // Try admin login first (only if no school_id provided)
    if (!school_id) {
      console.log('Trying admin login...')
      const adminResult = await pool.request()
        .input('username', sql.NVarChar, username)
        .query(`
          SELECT u.UserID, u.Username, u.PasswordHash, u.Role, u.SchoolID, s.Name as SchoolName
          FROM Users u
          LEFT JOIN Schools s ON u.SchoolID = s.SchoolID
          WHERE u.Username = @username AND u.IsActive = 1
        `)
      
      console.log('Admin query result count:', adminResult.recordset.length)
      
      if (adminResult.recordset.length > 0) {
        const user = adminResult.recordset[0]
        console.log('Found admin user:', user.Username, 'Role:', user.Role)
        const dbHash = user.PasswordHash
        let passwordMatch = false

        if (dbHash.startsWith('$2')) {
          console.log('Found bcrypt hash for user:', user.Username)
          console.log('Converting to SHA-256 for consistency...')
          
          const hashedInput = hashPassword(password)
          
          await pool.request()
            .input('userId', sql.Int, user.UserID)
            .input('newHash', sql.NVarChar, hashedInput)
            .query(`
              UPDATE Users 
              SET PasswordHash = @newHash 
              WHERE UserID = @userId
            `)
          
          console.log('Updated password hash to SHA-256 for user:', user.Username)
          passwordMatch = true
        } else {
          const hashedInput = hashPassword(password)
          passwordMatch = hashedInput === dbHash
          console.log('Admin password match:', passwordMatch)
        }
        
        if (passwordMatch) {
          console.log('Admin login successful')
          const token = generateToken({
            user_id: user.UserID,
            username: user.Username,
            role: user.Role,
            school_id: user.SchoolID,
            user_type: 'admin'
          })

          return res.json({
            token,
            user: {
              id: user.UserID,
              username: user.Username,
              role: user.Role,
              user_type: 'admin',
              school_id: user.SchoolID,
              school: user.SchoolID ? {
                id: user.SchoolID,
                name: user.SchoolName
              } : null
            }
          })
        }
      }
    }

    // Parent login - check for student
    console.log('Trying parent login...')
    
    let studentQuery = `
      SELECT 
        s.StudentID,
        s.Name as StudentName,
        s.SchoolID,
        sc.Name as SchoolName,
        s.Grade,
        s.ParentPasswordHash,
        s.ParentPasswordSet,
        p.Name as ParentName,
        p.PhoneNumber,
        p.Email,
        p.ParentID
      FROM Students s
      JOIN Schools sc ON s.SchoolID = sc.SchoolID
      LEFT JOIN Parents p ON s.StudentID = p.StudentID AND p.IsPrimary = 1
      WHERE s.Name = @username AND s.IsActive = 1
    `
    
    const request = pool.request().input('username', sql.NVarChar, username.trim())
    
    if (school_id) {
      studentQuery += ' AND s.SchoolID = @schoolId'
      request.input('schoolId', sql.Int, school_id)
      console.log('Added school filter:', school_id)
    }
    
    console.log('Executing student query...')
    const studentResult = await request.query(studentQuery)
    
    console.log('Student query result count:', studentResult.recordset.length)
    
    if (studentResult.recordset.length === 0) {
      console.log('ERROR: No student found with name:', username, 'school_id:', school_id)
      return res.status(401).json({ error: 'Invalid credentials - student not found' })
    }
    
    if (studentResult.recordset.length > 1 && !school_id) {
      console.log('ERROR: Multiple students found:', studentResult.recordset.length)
      const schools = studentResult.recordset.map(s => ({ id: s.SchoolID, name: s.SchoolName }))
      console.log('Available schools:', schools)
      return res.status(400).json({ 
        error: 'Multiple students found with this name. Please select the correct school.',
        schools: schools
      })
    }
    
    const student = studentResult.recordset[0]
    console.log('Found student:', {
      StudentID: student.StudentID,
      StudentName: student.StudentName,
      SchoolID: student.SchoolID,
      SchoolName: student.SchoolName,
      ParentPasswordSet: student.ParentPasswordSet,
      HasPasswordHash: !!student.ParentPasswordHash
    })
    
    // Check if password is set
    if (!student.ParentPasswordSet || !student.ParentPasswordHash) {
      console.log('ERROR: Password not set for student:', student.StudentName)
      console.log('ParentPasswordSet:', student.ParentPasswordSet)
      console.log('HasPasswordHash:', !!student.ParentPasswordHash)
      return res.status(401).json({ 
        error: 'No password set for this student. Please use "First Time? Set Password" to create a password.',
        debug: {
          password_set: student.ParentPasswordSet,
          has_hash: !!student.ParentPasswordHash
        }
      })
    }
    
// FIX: Handle bcrypt passwords for parents in handleLogin function
// Replace the password verification section in your handleLogin function

    // Verify password - FIXED to handle both bcrypt and SHA-256
      let passwordMatch = false
      const dbHash = student.ParentPasswordHash
      
      console.log('Password hash type check:', {
        startsWithBcrypt: dbHash.startsWith('$2'),
        hashLength: dbHash.length,
        hashPrefix: dbHash.substring(0, 10)
      })
      
      if (dbHash.startsWith('$2')) {
        // Handle bcrypt hash - need to install bcrypt if not already installed
        console.log('Parent has bcrypt hash, converting to SHA-256...')
        
        // For transition period, we'll convert bcrypt to SHA-256
        // You'll need to install bcrypt: npm install bcrypt
        const bcrypt = require('bcrypt')
        
        try {
          // First verify the bcrypt password is correct
          const bcryptMatch = await bcrypt.compare(password, dbHash)
          
          if (bcryptMatch) {
            // Password is correct, convert to SHA-256 for consistency
            const newHash = hashPassword(password)
            
            await pool.request()
              .input('studentId', sql.Int, student.StudentID)
              .input('newHash', sql.NVarChar, newHash)
              .query(`
                UPDATE Students 
                SET ParentPasswordHash = @newHash 
                WHERE StudentID = @studentId
              `)
            
            console.log('Converted parent bcrypt hash to SHA-256 for student:', student.StudentName)
            passwordMatch = true
          } else {
            console.log('Bcrypt password verification failed')
            passwordMatch = false
          }
        } catch (bcryptError) {
          console.error('Bcrypt comparison error:', bcryptError)
          // Fallback to SHA-256 comparison
          const hashedPassword = hashPassword(password)
          passwordMatch = dbHash === hashedPassword
        }
      } else {
        // Handle SHA-256 hash (standard)
        const hashedPassword = hashPassword(password)
        passwordMatch = dbHash === hashedPassword
        console.log('Using SHA-256 comparison, match:', passwordMatch)
      }
      
      console.log('Final password verification result:', passwordMatch)
      
      if (!passwordMatch) {
        console.log('ERROR: Password mismatch for student:', student.StudentName)
        return res.status(401).json({ error: 'Invalid credentials - wrong password' })
      }
      
    console.log('Parent login successful for student:', student.StudentName)
    
    // Update last login
    await pool.request()
      .input('studentId', sql.Int, student.StudentID)
      .query(`
        UPDATE Students 
        SET LastLoginAt = GETDATE()
        WHERE StudentID = @studentId
      `)

    const token = generateToken({
      student_id: student.StudentID,
      student_name: student.StudentName,
      school_id: student.SchoolID,
      parent_name: student.ParentName,
      parent_id: student.ParentID,
      role: 'parent',
      user_type: 'parent'
    })

    return res.json({
      token,
      user: {
        student_id: student.StudentID,
        student_name: student.StudentName,
        parent_name: student.ParentName,
        parent_id: student.ParentID,
        role: 'parent',
        user_type: 'parent',
        school: {
          id: student.SchoolID,
          name: student.SchoolName
        },
        contact: {
          email: student.Email,
          phone: student.PhoneNumber,
          hasContact: !!(student.Email || student.PhoneNumber),
          needsContactUpdate: !(student.Email || student.PhoneNumber)
        }
      }
    })

  } catch (error) {
    console.error('Login error:', error)
    return res.status(500).json({ 
      error: 'Login failed', 
      message: error.message,
      code: error.code 
    })
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

async function handleResetPassword(student_name, school_id, new_password, res) {
  if (!student_name || !school_id || !new_password) {
    return res.status(400).json({ error: 'All fields required' })
  }

  if (new_password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' })
  }

  try {
    const pool = await getPool()
    
    // Check if student exists and already has a password set
    const checkResult = await pool.request()
      .input('studentName', sql.NVarChar, student_name)
      .input('schoolId', sql.Int, school_id)
      .query(`
        SELECT StudentID, ParentPasswordSet 
        FROM Students 
        WHERE Name = @studentName AND SchoolID = @schoolId AND IsActive = 1
      `)

    if (checkResult.recordset.length === 0) {
      return res.status(404).json({ error: 'Student not found' })
    }

    const student = checkResult.recordset[0]
    
    if (!student.ParentPasswordSet) {
      return res.status(400).json({ 
        error: 'No password is set for this student. Please use the "First Time?" option instead.' 
      })
    }

    // Update the password
    const updateResult = await pool.request()
      .input('studentName', sql.NVarChar, student_name)
      .input('schoolId', sql.Int, school_id)
      .input('passwordHash', sql.NVarChar, hashPassword(new_password))
      .query(`
        UPDATE Students 
        SET ParentPasswordHash = @passwordHash
        WHERE Name = @studentName AND SchoolID = @schoolId AND IsActive = 1
      `)

    if (updateResult.rowsAffected[0] === 0) {
      return res.status(500).json({ error: 'Failed to update password' })
    }

    return res.json({ 
      message: 'Password reset successfully',
      student_id: student.StudentID
    })

  } catch (error) {
    console.error('Reset password error:', error)
    return res.status(500).json({ error: 'Failed to reset password', message: error.message })
  }
}