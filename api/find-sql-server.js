// pages/api/find-sql-server.js - Advanced SQL Server discovery
const sql = require('mssql')

// Extended list of possible SQL Server configurations
const possibleConfigs = [
  // Standard formats
  { server: 'localhost\\SQLEXPRESS', name: 'localhost\\SQLEXPRESS' },
  { server: '.\\SQLEXPRESS', name: '.\\SQLEXPRESS' },
  { server: '127.0.0.1\\SQLEXPRESS', name: '127.0.0.1\\SQLEXPRESS' },
  { server: 'localhost', port: 1433, name: 'localhost (default port)' },
  { server: '127.0.0.1', port: 1433, name: '127.0.0.1 (default port)' },
  
  // Alternative instance names
  { server: 'localhost\\MSSQLSERVER', name: 'localhost\\MSSQLSERVER' },
  { server: '.\\MSSQLSERVER', name: '.\\MSSQLSERVER' },
  { server: 'localhost\\SQL2019', name: 'localhost\\SQL2019' },
  { server: 'localhost\\SQL2022', name: 'localhost\\SQL2022' },
  
  // With different ports
  { server: 'localhost', port: 1434, name: 'localhost:1434' },
  { server: 'localhost\\SQLEXPRESS', port: 1433, name: 'localhost\\SQLEXPRESS:1433' },
  
  // Computer name variations (will try to get computer name)
  { server: `${process.env.COMPUTERNAME || 'COMPUTER'}\\SQLEXPRESS`, name: 'Computer Name\\SQLEXPRESS' },
]

export default async function handler(req, res) {
  const results = []
  const { action } = req.body

  try {
    // Add computer name variations if available
    if (process.env.COMPUTERNAME) {
      possibleConfigs.push(
        { server: `${process.env.COMPUTERNAME}\\SQLEXPRESS`, name: `${process.env.COMPUTERNAME}\\SQLEXPRESS` },
        { server: `${process.env.COMPUTERNAME}\\MSSQLSERVER`, name: `${process.env.COMPUTERNAME}\\MSSQLSERVER` }
      )
    }

    for (const configOption of possibleConfigs) {
      try {
        console.log(`Testing: ${configOption.name}`)
        
        const config = {
          server: configOption.server,
          database: process.env.LOCAL_DB || 'master', // Try master first, then specific DB
          user: process.env.DB_USER || '',
          password: process.env.DB_PASSWORD || '',
          port: configOption.port,
          options: {
            encrypt: false,
            trustServerCertificate: true,
            enableArithAbort: true,
            integratedSecurity: !process.env.DB_USER, // Windows Auth if no user
            connectTimeout: 8000,
            requestTimeout: 8000
          }
        }
        
        // Remove undefined port
        if (!config.port) delete config.port
        
        const pool = new sql.ConnectionPool(config)
        await pool.connect()
        
        // Test basic query
        const testResult = await pool.request().query(`
          SELECT 
            @@SERVERNAME as ServerName,
            @@VERSION as Version,
            DB_NAME() as CurrentDatabase
        `)
        
        const serverInfo = testResult.recordset[0]
        
        // Check if our target database exists
        const dbCheck = await pool.request()
          .input('dbname', sql.NVarChar, process.env.LOCAL_DB || 'zktimedb')
          .query(`
            SELECT name FROM sys.databases WHERE name = @dbname
          `)
        
        const targetDbExists = dbCheck.recordset.length > 0
        
        // If target database exists, try to connect to it and check USERINFO table
        let userinfoCheck = { exists: false, count: 0 }
        if (targetDbExists) {
          try {
            await pool.close()
            
            // Reconnect to target database
            const targetConfig = { ...config, database: process.env.LOCAL_DB || 'zktimedb' }
            const targetPool = new sql.ConnectionPool(targetConfig)
            await targetPool.connect()
            
            // Check USERINFO table
            const userinfoResult = await targetPool.request().query(`
              SELECT 
                COUNT(*) as UserCount,
                (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'USERINFO') as TableExists
            `)
            
            userinfoCheck = {
              exists: userinfoResult.recordset[0].TableExists > 0,
              count: userinfoResult.recordset[0].UserCount
            }
            
            // Look for DANIELLA specifically
            let daniellaExists = false
            if (userinfoCheck.exists) {
              const daniellaResult = await targetPool.request()
                .input('name', sql.NVarChar, 'DANIELLA AKU-SIKA ABBIW')
                .query('SELECT COUNT(*) as Found FROM [dbo].[USERINFO] WHERE [NAME] = @name')
              daniellaExists = daniellaResult.recordset[0].Found > 0
            }
            
            userinfoCheck.daniellaExists = daniellaExists
            await targetPool.close()
            
          } catch (dbError) {
            console.log(`Database-specific error for ${configOption.name}:`, dbError.message)
          }
        }
        
        await pool.close()
        
        results.push({
          config: configOption.name,
          server: configOption.server,
          port: configOption.port || 'default',
          success: true,
          serverInfo,
          targetDatabase: {
            name: process.env.LOCAL_DB || 'zktimedb',
            exists: targetDbExists,
            userinfo: userinfoCheck
          }
        })
        
        // If we found a working connection with USERINFO table, we can break
        if (targetDbExists && userinfoCheck.exists) {
          console.log(`✅ Found working connection with USERINFO: ${configOption.name}`)
          break
        }
        
      } catch (error) {
        results.push({
          config: configOption.name,
          server: configOption.server,
          port: configOption.port || 'default',
          success: false,
          error: error.message,
          errorCode: error.code
        })
      }
    }
    
    // Analyze results
    const workingConnections = results.filter(r => r.success)
    const connectionsWithUserInfo = workingConnections.filter(r => r.targetDatabase?.userinfo?.exists)
    const connectionsWithDaniella = connectionsWithUserInfo.filter(r => r.targetDatabase?.userinfo?.daniellaExists)
    
    const recommendation = connectionsWithDaniella.length > 0 
      ? {
          message: `Perfect! Found working connection with DANIELLA:`,
          config: connectionsWithDaniella[0].config,
          envVariable: `LOCAL_HOST=${connectionsWithDaniella[0].server}`,
          daniellaFound: true
        }
      : connectionsWithUserInfo.length > 0
      ? {
          message: `Found working connection with USERINFO table:`,
          config: connectionsWithUserInfo[0].config,
          envVariable: `LOCAL_HOST=${connectionsWithUserInfo[0].server}`,
          daniellaFound: false,
          note: 'DANIELLA not found in USERINFO table'
        }
      : workingConnections.length > 0
      ? {
          message: `Found working SQL Server connection but target database not found:`,
          config: workingConnections[0].config,
          issue: `Database '${process.env.LOCAL_DB || 'zktimedb'}' does not exist`
        }
      : {
          message: 'No working SQL Server connections found',
          possibleIssues: [
            'SQL Server Express not installed',
            'SQL Server Express not running (check Windows Services)',
            'TCP/IP protocol not enabled',
            'Windows Firewall blocking connection',
            'Different SQL Server instance name'
          ]
        }
    
    res.json({
      success: workingConnections.length > 0,
      summary: {
        totalTested: results.length,
        workingConnections: workingConnections.length,
        withUserInfoTable: connectionsWithUserInfo.length,
        withDaniella: connectionsWithDaniella.length
      },
      recommendation,
      allResults: results,
      environment: {
        computerName: process.env.COMPUTERNAME,
        targetDatabase: process.env.LOCAL_DB || 'zktimedb'
      }
    })
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      results
    })
  }
}