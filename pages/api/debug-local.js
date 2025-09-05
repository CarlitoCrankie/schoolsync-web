// pages/api/debug-local.js - Simple debug version
const sql = require('mssql')

// Your local database configuration
const localConfig = {
  server: process.env.LOCAL_HOST || '(local)\\SQLEXPRESS',
  database: process.env.LOCAL_DB || 'zktimedb', 
  user: process.env.DB_USER || '',
  password: process.env.DB_PASSWORD || '',
  options: {
    encrypt: false, // Local SQL Server usually doesn't use encryption
    trustServerCertificate: true,
    enableArithAbort: true,
    integratedSecurity: !process.env.DB_USER // Use Windows auth if no user specified
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    console.log('Attempting to connect to local database with config:')
    console.log('Server:', localConfig.server)
    console.log('Database:', localConfig.database)
    console.log('User:', localConfig.user || 'Windows Authentication')
    
    // Create connection
    const pool = new sql.ConnectionPool(localConfig)
    await pool.connect()
    
    console.log('✅ Connected to local database!')
    
    // Test query - get total users
    const totalUsers = await pool.request().query(`
      SELECT COUNT(*) as UserCount FROM [dbo].[USERINFO]
    `)
    
    console.log('Total users found:', totalUsers.recordset[0].UserCount)
    
    // Look for DANIELLA
    const daniellaQuery = await pool.request()
      .input('name', sql.NVarChar, 'DANIELLA AKU-SIKA ABBIW')
      .query(`
        SELECT 
          [USERID],
          [NAME],
          [Email],
          [Phone],
          [OPHONE],
          [FPHONE]
        FROM [dbo].[USERINFO] 
        WHERE [NAME] = @name
      `)
    
    // Get users with contact info
    const usersWithContacts = await pool.request().query(`
      SELECT TOP 5
        [USERID],
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
    
    await pool.close()
    
    res.json({
      success: true,
      connection: 'Local database connected successfully',
      config: {
        server: localConfig.server,
        database: localConfig.database,
        user: localConfig.user || 'Windows Auth',
        integratedSecurity: localConfig.options.integratedSecurity
      },
      results: {
        totalUsers: totalUsers.recordset[0].UserCount,
        daniellaFound: daniellaQuery.recordset.length > 0,
        daniellaData: daniellaQuery.recordset[0] || null,
        usersWithContacts: usersWithContacts.recordset.length,
        sampleUsers: usersWithContacts.recordset
      }
    })
    
  } catch (error) {
    console.error('Local database connection error:', error)
    
    res.status(500).json({
      success: false,
      error: error.message,
      config: {
        server: process.env.LOCAL_HOST || '(local)\\SQLEXPRESS',
        database: process.env.LOCAL_DB || 'zktimedb',
        user: process.env.DB_USER || 'Windows Auth'
      },
      troubleshooting: {
        possibleIssues: [
          'SQL Server Express not running',
          'Windows Authentication vs SQL Server Authentication',
          'Database name incorrect',
          'Network protocols not enabled'
        ],
        checkThese: [
          'Is SQL Server running? Check services.msc',
          'Can you connect with SSMS using the same credentials?',
          'Are TCP/IP and Named Pipes enabled in SQL Configuration Manager?'
        ]
      }
    })
  }
}