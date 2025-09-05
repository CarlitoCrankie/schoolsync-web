// pages/api/local-sync.js - Sync from local USERINFO to cloud Students/Parents
const sql = require('mssql')

// Local database configuration (SQL Server Express)
const localConfig = {
  server: process.env.LOCAL_HOST, // (local)\SQLEXPRESS
  database: process.env.LOCAL_DB, // zktimedb
  user: process.env.DB_USER || '',
  password: process.env.DB_PASSWORD || '',
  options: {
    encrypt: false, // Set to false for local SQL Server Express
    trustServerCertificate: true,
    enableArithAbort: true
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
}

// Cloud database configuration (AWS RDS)
const cloudConfig = {
  server: process.env.RDS_SERVER,
  database: process.env.RDS_DB,
  user: process.env.RDS_USER,
  password: process.env.RDS_PASSWORD,
  options: {
    encrypt: true,
    trustServerCertificate: true,
    enableArithAbort: true
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
}

let localPool = null
let cloudPool = null

const getLocalPool = async () => {
  if (!localPool || !localPool.connected) {
    localPool = new sql.ConnectionPool(localConfig)
    await localPool.connect()
    console.log('Connected to local database (zktimedb)')
  }
  return localPool
}

const getCloudPool = async () => {
  if (!cloudPool || !cloudPool.connected) {
    cloudPool = new sql.ConnectionPool(cloudConfig)
    await cloudPool.connect()
    console.log('Connected to cloud database (SchoolApp)')
  }
  return cloudPool
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { action } = req.body

  try {
    let result = {}

    switch (action) {
      case 'get_daniella_local':
        result = await getDaniellaFromLocal()
        break
      case 'sync_daniella_to_cloud':
        result = await syncDaniellaToCloud(req.body.data)
        break
      case 'get_all_userinfo':
        result = await getAllUserInfoWithContacts()
        break
      case 'sync_all_to_cloud':
        result = await syncAllUsersToCloud()
        break
      case 'test_local_connection':
        result = await testLocalConnection()
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
    console.error('Local sync API error:', error)
    res.status(500).json({
      success: false,
      error: error.message,
      action,
      timestamp: new Date().toISOString()
    })
  }
}

// Test local database connection
async function testLocalConnection() {
  try {
    const localPool = await getLocalPool()
    
    const testQuery = await localPool.request().query(`
      SELECT COUNT(*) as UserCount FROM [dbo].[USERINFO]
    `)
    
    const sampleUsers = await localPool.request().query(`
      SELECT TOP 3 [USERID], [NAME], [Email], [Phone] 
      FROM [dbo].[USERINFO] 
      WHERE [NAME] IS NOT NULL
      ORDER BY [NAME]
    `)

    return {
      connected: true,
      totalUsers: testQuery.recordset[0].UserCount,
      sampleUsers: sampleUsers.recordset,
      message: 'Local database connection successful'
    }

  } catch (error) {
    throw new Error(`Local database connection failed: ${error.message}`)
  }
}

// Get DANIELLA specifically from local database
async function getDaniellaFromLocal() {
  try {
    const localPool = await getLocalPool()
    
    const daniellaQuery = await localPool.request()
      .input('name', sql.NVarChar, 'DANIELLA AKU-SIKA ABBIW')
      .query(`
        SELECT 
          [USERID],
          [BADGENUMBER],
          [NAME],
          [Email],
          [Phone],
          [OPHONE],
          [FPHONE],
          [GENDER],
          [TITLE]
        FROM [dbo].[USERINFO] 
        WHERE [NAME] = @name
      `)

    if (daniellaQuery.recordset.length === 0) {
      throw new Error('DANIELLA AKU-SIKA ABBIW not found in local database')
    }

    const daniella = daniellaQuery.recordset[0]
    
    // Check what contact info is available
    const contactInfo = {
      email: daniella.Email,
      phone: daniella.Phone,
      ophone: daniella.OPHONE,
      fphone: daniella.FPHONE,
      bestPhone: daniella.Phone || daniella.OPHONE || daniella.FPHONE,
      hasContactInfo: !!(daniella.Email || daniella.Phone || daniella.OPHONE || daniella.FPHONE)
    }

    return {
      localUser: daniella,
      contactInfo,
      message: `DANIELLA found in local database with ${contactInfo.hasContactInfo ? 'contact info' : 'no contact info'}`
    }

  } catch (error) {
    throw new Error(`Get DANIELLA from local failed: ${error.message}`)
  }
}

// Sync DANIELLA from local to cloud database
async function syncDaniellaToCloud(data) {
  try {
    const localPool = await getLocalPool()
    const cloudPool = await getCloudPool()

    // Get DANIELLA from local database
    const daniellaLocal = await localPool.request()
      .input('name', sql.NVarChar, 'DANIELLA AKU-SIKA ABBIW')
      .query(`
        SELECT 
          [USERID],
          [BADGENUMBER],
          [NAME],
          [Email],
          [Phone],
          [OPHONE],
          [FPHONE],
          [GENDER]
        FROM [dbo].[USERINFO] 
        WHERE [NAME] = @name
      `)

    if (daniellaLocal.recordset.length === 0) {
      throw new Error('DANIELLA not found in local database')
    }

    const localUser = daniellaLocal.recordset[0]
    const schoolId = process.env.SCHOOL_ID || 2

    // Check if DANIELLA already exists in cloud as student
    const existingStudent = await cloudPool.request()
      .input('name', sql.NVarChar, localUser.NAME)
      .input('schoolId', sql.Int, schoolId)
      .query(`
        SELECT StudentID FROM Students 
        WHERE Name = @name AND SchoolID = @schoolId
      `)

    let studentId
    if (existingStudent.recordset.length === 0) {
      // Create new student record in cloud
      const newStudent = await cloudPool.request()
        .input('name', sql.NVarChar, localUser.NAME)
        .input('schoolId', sql.Int, schoolId)
        .input('badgeNumber', sql.NVarChar, localUser.BADGENUMBER)
        .input('grade', sql.NVarChar, 'Not specified')
        .query(`
          INSERT INTO Students (Name, SchoolID, Grade, StudentCode, IsActive)
          OUTPUT INSERTED.StudentID
          VALUES (@name, @schoolId, @grade, @badgeNumber, 1)
        `)
      
      studentId = newStudent.recordset[0].StudentID
    } else {
      studentId = existingStudent.recordset[0].StudentID
    }

    // Now create/update parent contact info
    const bestEmail = localUser.Email || data?.parentEmail || 'carlcrankson966@gmail.com'
    const bestPhone = localUser.Phone || localUser.OPHONE || localUser.FPHONE || data?.parentPhone || '+233244123456'

    // Check if parent record exists
    const existingParent = await cloudPool.request()
      .input('studentId', sql.Int, studentId)
      .query('SELECT * FROM Parents WHERE StudentID = @studentId')

    let parentResult
    if (existingParent.recordset.length === 0) {
      // Create new parent record
      parentResult = await cloudPool.request()
        .input('studentId', sql.Int, studentId)
        .input('name', sql.NVarChar, 'Parent/Guardian')
        .input('email', sql.NVarChar, bestEmail)
        .input('phone', sql.NVarChar, bestPhone)
        .query(`
          INSERT INTO Parents (StudentID, Name, Email, PhoneNumber, IsPrimary)
          OUTPUT INSERTED.*
          VALUES (@studentId, @name, @email, @phone, 1)
        `)
    } else {
      // Update existing parent record
      parentResult = await cloudPool.request()
        .input('studentId', sql.Int, studentId)
        .input('email', sql.NVarChar, bestEmail)
        .input('phone', sql.NVarChar, bestPhone)
        .query(`
          UPDATE Parents 
          SET Email = @email, PhoneNumber = @phone
          OUTPUT INSERTED.*
          WHERE StudentID = @studentId
        `)
    }

    return {
      localUser,
      studentId,
      parent: parentResult.recordset[0],
      sync: {
        studentCreated: existingStudent.recordset.length === 0,
        parentCreated: existingParent.recordset.length === 0,
        email: bestEmail,
        phone: bestPhone
      },
      message: `DANIELLA synced successfully from local to cloud database`
    }

  } catch (error) {
    throw new Error(`Sync DANIELLA to cloud failed: ${error.message}`)
  }
}

// Get all users with contact info from local database
async function getAllUserInfoWithContacts() {
  try {
    const localPool = await getLocalPool()
    
    const usersWithContacts = await localPool.request().query(`
      SELECT 
        [USERID],
        [BADGENUMBER],
        [NAME],
        [Email],
        [Phone],
        [OPHONE],
        [FPHONE],
        [GENDER]
      FROM [dbo].[USERINFO] 
      WHERE [NAME] IS NOT NULL 
      AND ([Email] IS NOT NULL OR [Phone] IS NOT NULL OR [OPHONE] IS NOT NULL OR [FPHONE] IS NOT NULL)
      ORDER BY [NAME]
    `)

    const processedUsers = usersWithContacts.recordset.map(user => ({
      ...user,
      bestPhone: user.Phone || user.OPHONE || user.FPHONE,
      hasEmail: !!user.Email,
      hasPhone: !!(user.Phone || user.OPHONE || user.FPHONE),
      contactScore: (user.Email ? 1 : 0) + (user.Phone || user.OPHONE || user.FPHONE ? 1 : 0)
    }))

    return {
      totalUsers: processedUsers.length,
      usersWithEmail: processedUsers.filter(u => u.hasEmail).length,
      usersWithPhone: processedUsers.filter(u => u.hasPhone).length,
      users: processedUsers.slice(0, 10), // First 10 users
      daniella: processedUsers.find(u => u.NAME?.toUpperCase().includes('DANIELLA')),
      message: `Found ${processedUsers.length} users with contact information in local database`
    }

  } catch (error) {
    throw new Error(`Get all userinfo failed: ${error.message}`)
  }
}

// Sync all users with contact info to cloud
async function syncAllUsersToCloud() {
  try {
    const localPool = await getLocalPool()
    const cloudPool = await getCloudPool()
    const schoolId = process.env.SCHOOL_ID || 2

    // Get all users with contact info from local
    const usersWithContacts = await localPool.request().query(`
      SELECT TOP 20
        [USERID],
        [BADGENUMBER],
        [NAME],
        [Email],
        [Phone],
        [OPHONE],
        [FPHONE]
      FROM [dbo].[USERINFO] 
      WHERE [NAME] IS NOT NULL 
      AND ([Email] IS NOT NULL OR [Phone] IS NOT NULL OR [OPHONE] IS NOT NULL OR [FPHONE] IS NOT NULL)
      ORDER BY [NAME]
    `)

    const syncResults = []
    let successCount = 0
    let errorCount = 0

    for (const user of usersWithContacts.recordset) {
      try {
        const bestEmail = user.Email
        const bestPhone = user.Phone || user.OPHONE || user.FPHONE

        // Create/find student
        let studentResult = await cloudPool.request()
          .input('name', sql.NVarChar, user.NAME)
          .input('schoolId', sql.Int, schoolId)
          .query('SELECT StudentID FROM Students WHERE Name = @name AND SchoolID = @schoolId')

        let studentId
        if (studentResult.recordset.length === 0) {
          const newStudent = await cloudPool.request()
            .input('name', sql.NVarChar, user.NAME)
            .input('schoolId', sql.Int, schoolId)
            .input('badgeNumber', sql.NVarChar, user.BADGENUMBER)
            .query(`
              INSERT INTO Students (Name, SchoolID, Grade, StudentCode, IsActive)
              OUTPUT INSERTED.StudentID
              VALUES (@name, @schoolId, 'Not specified', @badgeNumber, 1)
            `)
          studentId = newStudent.recordset[0].StudentID
        } else {
          studentId = studentResult.recordset[0].StudentID
        }

        // Create/update parent
        const existingParent = await cloudPool.request()
          .input('studentId', sql.Int, studentId)
          .query('SELECT ParentID FROM Parents WHERE StudentID = @studentId')

        if (existingParent.recordset.length === 0) {
          await cloudPool.request()
            .input('studentId', sql.Int, studentId)
            .input('email', sql.NVarChar, bestEmail)
            .input('phone', sql.NVarChar, bestPhone)
            .query(`
              INSERT INTO Parents (StudentID, Name, Email, PhoneNumber, IsPrimary)
              VALUES (@studentId, 'Parent/Guardian', @email, @phone, 1)
            `)
        }

        syncResults.push({
          localUserId: user.USERID,
          name: user.NAME,
          studentId,
          email: bestEmail,
          phone: bestPhone,
          success: true
        })
        successCount++

      } catch (error) {
        syncResults.push({
          localUserId: user.USERID,
          name: user.NAME,
          error: error.message,
          success: false
        })
        errorCount++
      }
    }

    return {
      totalProcessed: usersWithContacts.recordset.length,
      successCount,
      errorCount,
      syncResults,
      message: `Synced ${successCount} users from local to cloud database`
    }

  } catch (error) {
    throw new Error(`Sync all users failed: ${error.message}`)
  }
}

// Cleanup connections on process exit
process.on('exit', () => {
  if (localPool) localPool.close()
  if (cloudPool) cloudPool.close()
})