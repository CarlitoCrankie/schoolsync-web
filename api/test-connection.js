// // pages/api/test-connection.js - Try multiple connection formats
// const sql = require('mssql')

// // Try different server name formats
// const serverFormats = [
//   'localhost\\SQLEXPRESS',
//   '.\\SQLEXPRESS', 
//   '127.0.0.1\\SQLEXPRESS',
//   'localhost',
//   '.',
//   '127.0.0.1',
//   process.env.LOCAL_HOST // Your current setting
// ].filter(Boolean)

// export default async function handler(req, res) {
//   const results = []
  
//   for (const serverName of serverFormats) {
//     try {
//       console.log(`Testing connection to: ${serverName}`)
      
//       const config = {
//         server: serverName,
//         database: process.env.LOCAL_DB || 'zktimedb',
//         user: process.env.DB_USER || '',
//         password: process.env.DB_PASSWORD || '',
//         options: {
//           encrypt: false,
//           trustServerCertificate: true,
//           enableArithAbort: true,
//           integratedSecurity: !process.env.DB_USER,
//           connectTimeout: 10000, // 10 seconds timeout
//           requestTimeout: 10000
//         }
//       }
      
//       const pool = new sql.ConnectionPool(config)
//       await pool.connect()
      
//       // Test query
//       const result = await pool.request().query(`
//         SELECT 
//           DB_NAME() as DatabaseName,
//           @@SERVERNAME as ServerName,
//           @@VERSION as Version,
//           (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'USERINFO') as UserInfoTableExists
//       `)
      
//       const dbInfo = result.recordset[0]
      
//       // Try to get user count if USERINFO exists
//       let userCount = 0
//       if (dbInfo.UserInfoTableExists > 0) {
//         const userResult = await pool.request().query('SELECT COUNT(*) as UserCount FROM [dbo].[USERINFO]')
//         userCount = userResult.recordset[0].UserCount
//       }
      
//       await pool.close()
      
//       results.push({
//         serverName,
//         success: true,
//         info: {
//           database: dbInfo.DatabaseName,
//           server: dbInfo.ServerName,
//           version: dbInfo.Version.split('\n')[0], // First line of version
//           userInfoExists: dbInfo.UserInfoTableExists > 0,
//           userCount: userCount
//         }
//       })
      
//       // If we found a working connection, break
//       break
      
//     } catch (error) {
//       results.push({
//         serverName,
//         success: false,
//         error: error.message
//       })
//     }
//   }
  
//   const workingConnection = results.find(r => r.success)
  
//   res.json({
//     success: !!workingConnection,
//     workingConnection,
//     allResults: results,
//     recommendation: workingConnection ? {
//       message: `Use this in your .env.local file:`,
//       envVariable: `LOCAL_HOST=${workingConnection.serverName}`
//     } : {
//       message: 'No working connection found. Please check:',
//       checkList: [
//         'Is SQL Server Express installed and running?',
//         'Check Windows Services for "SQL Server (SQLEXPRESS)"',
//         'Try connecting with SSMS first to verify connection',
//         'Check if TCP/IP is enabled in SQL Server Configuration Manager'
//       ]
//     }
//   })
// }

// pages/api/test-local-fixed.js - Connection matching your sync agent
const sql = require('mssql')

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    console.log('Testing connection with sync agent format...')
    
    // Match your sync agent's exact configuration
    const config = {
      server: '(local)\SQLEXPRESS', // Exactly as your sync agent uses
      database: 'zktimedb',
      user: '', // Empty for Windows Authentication
      password: '', // Empty for Windows Authentication
      options: {
        encrypt: false, // Local connection, no encryption
        trustServerCertificate: true,
        enableArithAbort: true,
        integratedSecurity: true, // Force Windows Authentication
        connectTimeout: 15000, // 15 seconds (longer timeout)
        requestTimeout: 15000,
        instanceName: 'SQLEXPRESS' // Explicitly specify instance
      },
      pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
      }
    }
    
    console.log('Connection config:', {
      server: config.server,
      database: config.database,
      integratedSecurity: config.options.integratedSecurity,
      instanceName: config.options.instanceName
    })
    
    // Create connection pool
    const pool = new sql.ConnectionPool(config)
    
    // Connect with detailed logging
    console.log('Attempting to connect...')
    await pool.connect()
    console.log('✅ Connected successfully!')
    
    // Test basic server info
    const serverTest = await pool.request().query(`
      SELECT 
        @@SERVERNAME as ServerName,
        @@VERSION as Version,
        DB_NAME() as DatabaseName,
        SYSTEM_USER as WindowsUser
    `)
    
    const serverInfo = serverTest.recordset[0]
    console.log('Server info:', serverInfo)
    
    // Test USERINFO table
    const userinfoTest = await pool.request().query(`
      SELECT 
        COUNT(*) as TotalUsers,
        (SELECT TOP 1 [NAME] FROM [dbo].[USERINFO] WHERE [NAME] IS NOT NULL ORDER BY [NAME]) as FirstUser
      FROM [dbo].[USERINFO]
    `)
    
    const userinfoInfo = userinfoTest.recordset[0]
    console.log('USERINFO info:', userinfoInfo)
    
    // Look for DANIELLA specifically
    const daniellaTest = await pool.request()
      .input('name', sql.NVarChar, 'DANIELLA AKU-SIKA ABBIW')
      .query(`
        SELECT 
          [USERID],
          [NAME], 
          [Email],
          [Phone],
          [OPHONE],
          [FPHONE],
          [BADGENUMBER]
        FROM [dbo].[USERINFO] 
        WHERE [NAME] = @name
      `)
    
    const daniellaInfo = daniellaTest.recordset[0]
    console.log('DANIELLA info:', daniellaInfo)
    
    // Get sample users with contact info
    const contactUsersTest = await pool.request().query(`
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
    
    const contactUsers = contactUsersTest.recordset
    console.log('Users with contact info:', contactUsers.length)
    
    await pool.close()
    console.log('Connection closed successfully')
    
    res.json({
      success: true,
      message: 'Local database connection successful (matching sync agent)',
      connectionDetails: {
        server: config.server,
        database: config.database,
        authenticationType: 'Windows Authentication',
        instanceName: 'SQLEXPRESS'
      },
      serverInfo,
      database: {
        name: serverInfo.DatabaseName,
        totalUsers: userinfoInfo.TotalUsers,
        firstUser: userinfoInfo.FirstUser,
        usersWithContact: contactUsers.length
      },
      daniella: {
        found: !!daniellaInfo,
        data: daniellaInfo || null,
        contactInfo: daniellaInfo ? {
          email: daniellaInfo.Email,
          phone: daniellaInfo.Phone || daniellaInfo.OPHONE || daniellaInfo.FPHONE,
          hasContact: !!(daniellaInfo.Email || daniellaInfo.Phone || daniellaInfo.OPHONE || daniellaInfo.FPHONE)
        } : null
      },
      sampleUsers: contactUsers.map(user => ({
        userid: user.USERID,
        name: user.NAME,
        email: user.Email,
        bestPhone: user.Phone || user.OPHONE || user.FPHONE
      }))
    })
    
  } catch (error) {
    console.error('Connection error details:', {
      message: error.message,
      code: error.code,
      originalError: error.originalError,
      stack: error.stack
    })
    
    res.status(500).json({
      success: false,
      error: error.message,
      errorCode: error.code,
      connectionAttempt: {
        server: '(local)\\SQLEXPRESS',
        database: 'zktimedb',
        authType: 'Windows Authentication'
      },
      troubleshooting: {
        syncAgentWorks: 'Your sync agent connects successfully',
        possibleCauses: [
          'Node.js mssql package handles (local) differently than Python',
          'Different authentication methods between Node.js and Python',
          'Connection timeout or configuration differences'
        ],
        nextSteps: [
          'Check if Node.js process runs under different Windows user',
          'Try alternative server name formats',
          'Verify SQL Server allows connections from Node.js processes'
        ]
      }
    })
  }
}