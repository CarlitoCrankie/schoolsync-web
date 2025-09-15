// // lib/database.js - Fixed database connection management
// const sql = require('mssql')

// const config = {
//   server: process.env.RDS_SERVER,
//   database: process.env.RDS_DB,
//   user: process.env.RDS_USER,
//   password: process.env.RDS_PASSWORD,
//   options: {
//     encrypt: true,
//     trustServerCertificate: true,
//     enableArithAbort: true,
//     connectTimeout: 60000,     // Increased to 60 seconds
//     requestTimeout: 60000,     // Increased to 60 seconds
//     cancelTimeout: 30000
//   },
//   pool: {
//     max: 20,                   // Maximum connections in pool
//     min: 2,                    // Minimum connections
//     idleTimeoutMillis: 300000, // 5 minutes
//     acquireTimeoutMillis: 60000 // 1 minute to acquire connection
//     // Removed unsupported options:
//     // evictionRunIntervalMillis, createTimeoutMillis, destroyTimeoutMillis, 
//     // reapIntervalMillis, createRetryIntervalMillis
//   }
// }

// let pool = null
// let isConnecting = false
// let keepAliveInterval = null

// const createPool = async () => {
//   if (isConnecting) {
//     // Wait for existing connection attempt
//     while (isConnecting) {
//       await new Promise(resolve => setTimeout(resolve, 100))
//     }
//     return pool
//   }

//   try {
//     isConnecting = true
    
//     if (pool) {
//       try {
//         await pool.close()
//       } catch (err) {
//         console.log('Error closing existing pool:', err.message)
//       }
//     }

//     pool = new sql.ConnectionPool(config)
    
//     // Add connection event handlers
//     pool.on('connect', () => {
//       console.log('Database connected successfully')
//       startKeepAlive()
//     })
    
//     pool.on('error', (err) => {
//       console.error('Database pool error:', err)
//       pool = null
//       stopKeepAlive()
//     })

//     await pool.connect()
//     return pool
    
//   } catch (error) {
//     console.error('Database connection failed:', error)
//     pool = null
//     throw error
//   } finally {
//     isConnecting = false
//   }
// }

// const getPool = async () => {
//   if (!pool || !pool.connected || pool.connecting) {
//     console.log('Creating new database connection...')
//     return await createPool()
//   }
  
//   try {
//     // Test connection with a simple query
//     await pool.request().query('SELECT 1')
//     return pool
//   } catch (error) {
//     console.log('Connection test failed, reconnecting...', error.message)
//     return await createPool()
//   }
// }

// // Keep-alive mechanism to prevent connection timeouts
// const startKeepAlive = () => {
//   if (keepAliveInterval) {
//     clearInterval(keepAliveInterval)
//   }
  
//   keepAliveInterval = setInterval(async () => {
//     try {
//       if (pool && pool.connected) {
//         await pool.request().query('SELECT 1 as keepalive')
//         console.log('Database keep-alive ping successful')
//       }
//     } catch (error) {
//       console.log('Keep-alive ping failed:', error.message)
//       // Don't reset pool here, let getPool handle reconnection
//     }
//   }, 240000) // Ping every 4 minutes
// }

// const stopKeepAlive = () => {
//   if (keepAliveInterval) {
//     clearInterval(keepAliveInterval)
//     keepAliveInterval = null
//   }
// }

// // Graceful shutdown
// const closePool = async () => {
//   stopKeepAlive()
//   if (pool) {
//     try {
//       await pool.close()
//       console.log('Database pool closed gracefully')
//     } catch (error) {
//       console.error('Error closing database pool:', error)
//     }
//     pool = null
//   }
// }

// // Handle process termination
// process.on('SIGINT', closePool)
// process.on('SIGTERM', closePool)
// process.on('exit', closePool)

// module.exports = {
//   getPool,
//   closePool,
//   sql
// }

// lib/database.js - Optimized database connection management
// lib/database.js - Optimized for 12,000+ concurrent users
// lib/database.js - Fixed configuration
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
    requestTimeout: 45000,
    cancelTimeout: 5000,
    packetSize: 4096,
    connectionIsolationLevel: sql.ISOLATION_LEVEL.READ_COMMITTED
  },
  pool: {
    max: 25,
    min: 5,
    idleTimeoutMillis: 120000,
    acquireTimeoutMillis: 30000
    // REMOVED: testOnBorrow, evictionRunIntervalMillis (not supported)
  }
}

let pool = null
let isConnecting = false
let keepAliveInterval = null
let connectionRetries = 0
const MAX_RETRIES = 3

const createPool = async () => {
  if (isConnecting) {
    while (isConnecting) {
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    return pool
  }

  try {
    isConnecting = true
    
    if (pool) {
      try {
        await pool.close()
        console.log('Closed existing pool')
      } catch (err) {
        console.log('Error closing existing pool:', err.message)
      }
      pool = null
    }

    console.log('Creating optimized database pool...')
    pool = new sql.ConnectionPool(config)
    
    pool.on('connect', () => {
      console.log('Database pool connected successfully')
      connectionRetries = 0
      startKeepAlive()
    })
    
    pool.on('error', (err) => {
      console.error('Database pool error:', err)
      stopKeepAlive()
      pool = null
    })

    await pool.connect()
    return pool
    
  } catch (error) {
    console.error('Database connection failed:', error)
    pool = null
    connectionRetries++
    
    if (connectionRetries < MAX_RETRIES) {
      const delay = Math.pow(2, connectionRetries) * 1000
      console.log(`Retrying connection in ${delay}ms (attempt ${connectionRetries}/${MAX_RETRIES})`)
      await new Promise(resolve => setTimeout(resolve, delay))
      return await createPool()
    }
    
    throw error
  } finally {
    isConnecting = false
  }
}

const getPool = async () => {
  if (!pool || !pool.connected || pool.connecting) {
    console.log('Creating new database connection...')
    return await createPool()
  }
  
  try {
    const testRequest = pool.request()
    testRequest.timeout = 5000
    await testRequest.query('SELECT 1')
    return pool
  } catch (error) {
    console.log('Connection test failed, reconnecting...', error.message)
    stopKeepAlive()
    pool = null
    return await createPool()
  }
}

const startKeepAlive = () => {
  if (keepAliveInterval) {
    clearInterval(keepAliveInterval)
  }
  
  keepAliveInterval = setInterval(async () => {
    try {
      if (pool && pool.connected && !pool.connecting) {
        const request = pool.request()
        request.timeout = 5000
        await request.query('SELECT 1 as keepalive')
        console.log('Database keep-alive successful')
      }
    } catch (error) {
      console.log('Keep-alive failed:', error.message)
      if (pool) {
        stopKeepAlive()
        pool = null
      }
    }
  }, 90000)
}

const stopKeepAlive = () => {
  if (keepAliveInterval) {
    clearInterval(keepAliveInterval)
    keepAliveInterval = null
  }
}

const closePool = async () => {
  console.log('Closing database pool...')
  stopKeepAlive()
  
  if (pool) {
    try {
      await new Promise(resolve => setTimeout(resolve, 2000))
      await pool.close()
      console.log('Database pool closed gracefully')
    } catch (error) {
      console.error('Error closing database pool:', error)
    }
    pool = null
  }
}

process.on('SIGINT', async () => {
  console.log('SIGINT received, closing database...')
  await closePool()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing database...')
  await closePool()
  process.exit(0)
})

module.exports = {
  getPool,
  closePool,
  sql
}