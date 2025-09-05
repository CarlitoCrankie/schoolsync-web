// api/health.js - Health check endpoint with robust connection testing
const sql = require('mssql')

// Use the same robust configuration as auth.js
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
    cancelTimeout: 5000,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
    acquireTimeoutMillis: 20000,
    createTimeoutMillis: 20000,
    destroyTimeoutMillis: 5000,
    reapIntervalMillis: 1000,
    createRetryIntervalMillis: 2000,
  },
}

// Global connection pool (shared with auth.js)
let pool = null
let isConnecting = false

const retryWithBackoff = async (fn, maxRetries = 3, baseDelay = 1000) => {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      console.log(`Health check attempt ${attempt + 1} failed:`, error.message)
      
      if (attempt === maxRetries - 1) {
        throw error
      }
      
      const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
}

const getDbPool = async () => {
  if (pool && pool.connected) {
    return pool
  }
  
  if (isConnecting) {
    while (isConnecting) {
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    if (pool && pool.connected) {
      return pool
    }
  }
  
  isConnecting = true
  
  try {
    if (pool) {
      try {
        await pool.close()
      } catch (error) {
        console.log('Error closing existing pool:', error.message)
      }
      pool = null
    }
    
    console.log('Creating database connection pool for health check...')
    pool = new sql.ConnectionPool(config)
    
    pool.on('error', (error) => {
      console.error('Database pool error:', error)
      pool = null
    })
    
    await retryWithBackoff(async () => {
      await pool.connect()
    })
    
    console.log('Health check database pool established')
    return pool
    
  } catch (error) {
    console.error('Failed to create health check pool:', error)
    pool = null
    throw error
  } finally {
    isConnecting = false
  }
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

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const startTime = Date.now()

  try {
    // Test database connection
    const currentPool = await getDbPool()
    
    // Run comprehensive health checks
    const healthChecks = await Promise.all([
      // Basic connectivity test
      currentPool.request().query('SELECT GETDATE() as CurrentTime'),
      
      // Database version check
      currentPool.request().query('SELECT @@VERSION as SqlVersion'),
      
      // Test main tables exist
      currentPool.request().query(`
        SELECT COUNT(*) as TableCount 
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_TYPE = 'BASE TABLE'
      `),
      
      // Check if core tables exist
      currentPool.request().query(`
        SELECT 
          CASE WHEN EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Users') THEN 1 ELSE 0 END as UsersTable,
          CASE WHEN EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Students') THEN 1 ELSE 0 END as StudentsTable,
          CASE WHEN EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Schools') THEN 1 ELSE 0 END as SchoolsTable
      `)
    ])
    
    const responseTime = Date.now() - startTime
    
    const basicInfo = healthChecks[0].recordset[0]
    const versionInfo = healthChecks[1].recordset[0]
    const tableCount = healthChecks[2].recordset[0]
    const coreTablesInfo = healthChecks[3].recordset[0]
    
    // Check environment variables
    const envCheck = {
      RDS_SERVER: !!process.env.RDS_SERVER,
      RDS_DB: !!process.env.RDS_DB,
      RDS_USER: !!process.env.RDS_USER,
      RDS_PASSWORD: !!process.env.RDS_PASSWORD,
      JWT_SECRET_KEY: !!process.env.JWT_SECRET_KEY
    }
    
    const allEnvVarsSet = Object.values(envCheck).every(Boolean)
    
    res.status(200).json({
      status: 'healthy',
      timestamp: basicInfo.CurrentTime,
      database: {
        status: 'connected',
        server: process.env.RDS_SERVER,
        database: process.env.RDS_DB,
        version: versionInfo.SqlVersion.split('\n')[0],
        total_tables: tableCount.TableCount,
        core_tables: {
          users: !!coreTablesInfo.UsersTable,
          students: !!coreTablesInfo.StudentsTable,
          schools: !!coreTablesInfo.SchoolsTable
        }
      },
      environment: {
        node_env: process.env.NODE_ENV || 'development',
        all_env_vars_set: allEnvVarsSet,
        env_status: envCheck
      },
      performance: {
        response_time_ms: responseTime,
        pool_status: {
          connected: currentPool.connected,
          connecting: currentPool.connecting
        }
      },
      message: 'School attendance system is operational'
    })
    
  } catch (error) {
    console.error('Health check failed:', error)
    
    const responseTime = Date.now() - startTime
    
    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      database: {
        status: 'disconnected',
        server: process.env.RDS_SERVER || 'not_configured',
        database: process.env.RDS_DB || 'not_configured'
      },
      error: {
        message: error.message,
        code: error.code,
        type: error.constructor.name
      },
      performance: {
        response_time_ms: responseTime
      },
      troubleshooting: {
        check_environment_variables: !process.env.RDS_SERVER || !process.env.RDS_DB,
        check_network_connectivity: error.code === 'ESOCKET' || error.code === 'EBUSY',
        check_credentials: error.message.includes('login') || error.message.includes('authentication'),
        check_database_exists: error.message.includes('database') && error.message.includes('not exist')
      }
    })
  }
}