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
// lib/database.js - Optimized database connection management
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
    connectTimeout: 60000,     // 60 seconds for connection
    requestTimeout: 120000,    // 2 minutes for slow queries (increased)
    cancelTimeout: 5000        // 5 seconds for cancellation
  },
  pool: {
    max: 8,                    // Reduced max connections
    min: 1,                    // Minimum connections
    idleTimeoutMillis: 300000, // 5 minutes idle timeout
    acquireTimeoutMillis: 60000 // 1 minute to acquire connection
  }
}

let pool = null
let isConnecting = false
let keepAliveInterval = null
let connectionRetries = 0
const MAX_RETRIES = 3

const createPool = async () => {
  if (isConnecting) {
    // Wait for existing connection attempt
    while (isConnecting) {
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    return pool
  }

  try {
    isConnecting = true
    
    // Close existing pool properly
    if (pool) {
      try {
        await pool.close()
        console.log('Closed existing pool')
      } catch (err) {
        console.log('Error closing existing pool:', err.message)
      }
      pool = null
    }

    console.log('Creating new database pool...')
    pool = new sql.ConnectionPool(config)
    
    // Add connection event handlers
    pool.on('connect', () => {
      console.log('Database pool connected successfully')
      connectionRetries = 0 // Reset retry counter on success
      startKeepAlive()
    })
    
    pool.on('error', (err) => {
      console.error('Database pool error:', err)
      stopKeepAlive()
      // Mark pool as invalid on error
      pool = null
    })

    await pool.connect()
    console.log('Pool connection established')
    return pool
    
  } catch (error) {
    console.error('Database connection failed:', error)
    pool = null
    connectionRetries++
    
    // Add exponential backoff for retries
    if (connectionRetries < MAX_RETRIES) {
      const delay = Math.pow(2, connectionRetries) * 1000 // 2s, 4s, 8s
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
  // If no pool exists or pool is in bad state
  if (!pool || !pool.connected || pool.connecting) {
    console.log('Creating new database connection...')
    return await createPool()
  }
  
  try {
    // Quick connection test with short timeout
    const testRequest = pool.request()
    testRequest.timeout = 5000 // 5 second timeout for test
    await testRequest.query('SELECT 1')
    return pool
  } catch (error) {
    console.log('Connection test failed, reconnecting...', error.message)
    stopKeepAlive()
    pool = null
    return await createPool()
  }
}

// Enhanced query execution with timeout and logging
const executeQueryWithTimeout = async (query, inputs = [], timeoutMs = 60000) => {
  const startTime = Date.now()
  console.log(`Executing query with ${timeoutMs}ms timeout`)
  
  try {
    const pool = await getPool()
    const request = pool.request()
    
    // Set query timeout
    request.timeout = timeoutMs
    
    // Add inputs if provided
    if (inputs && inputs.length > 0) {
      inputs.forEach(input => {
        request.input(input.name, input.type, input.value)
      })
    }
    
    const result = await request.query(query)
    const executionTime = Date.now() - startTime
    
    console.log(`Query completed in ${executionTime}ms`)
    
    // Log slow queries for optimization
    if (executionTime > 5000) {
      console.warn(`SLOW QUERY WARNING: Query took ${executionTime}ms`)
      console.warn(`Query: ${query.substring(0, 200)}...`)
    }
    
    return result
  } catch (error) {
    const executionTime = Date.now() - startTime
    console.error(`Query failed after ${executionTime}ms:`, error.message)
    
    // If timeout error, suggest query optimization
    if (error.code === 'ETIMEOUT') {
      console.error('TIMEOUT: Consider optimizing this query or adding indexes')
    }
    
    throw error
  }
}

// Keep-alive mechanism with error handling
const startKeepAlive = () => {
  if (keepAliveInterval) {
    clearInterval(keepAliveInterval)
  }
  
  keepAliveInterval = setInterval(async () => {
    try {
      if (pool && pool.connected && !pool.connecting) {
        const request = pool.request()
        request.timeout = 5000 // 5 second timeout for keep-alive
        await request.query('SELECT 1 as keepalive')
        console.log('Database keep-alive successful')
      }
    } catch (error) {
      console.log('Keep-alive failed:', error.message)
      // Mark pool as invalid on keep-alive failure
      if (pool) {
        stopKeepAlive()
        pool = null
      }
    }
  }, 120000) // Ping every 2 minutes
}

const stopKeepAlive = () => {
  if (keepAliveInterval) {
    clearInterval(keepAliveInterval)
    keepAliveInterval = null
    console.log('Keep-alive stopped')
  }
}

// Enhanced health check function
const checkHealth = async () => {
  try {
    const startTime = Date.now()
    const currentPool = await getPool()
    
    const result = await currentPool.request()
      .query('SELECT @@VERSION as version, GETDATE() as current_time')
    
    const responseTime = Date.now() - startTime
    
    return {
      healthy: true,
      connected: currentPool.connected,
      responseTime: responseTime,
      timestamp: new Date().toISOString(),
      version: result.recordset[0].version,
      server_time: result.recordset[0].current_time
    }
  } catch (error) {
    return {
      healthy: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }
  }
}

// Enhanced graceful shutdown
const closePool = async () => {
  console.log('Closing database pool...')
  stopKeepAlive()
  
  if (pool) {
    try {
      // Give ongoing requests time to complete
      await new Promise(resolve => setTimeout(resolve, 2000))
      await pool.close()
      console.log('Database pool closed gracefully')
    } catch (error) {
      console.error('Error closing database pool:', error)
    }
    pool = null
  }
}

// Performance monitoring
const getPoolStats = () => {
  if (pool && pool.pool) {
    return {
      totalConnections: pool.pool.totalCount,
      idleConnections: pool.pool.idleCount,
      activeConnections: pool.pool.totalCount - pool.pool.idleCount,
      waitingClients: pool.pool.waitingCount
    }
  }
  return { status: 'No active pool' }
}

// Handle process termination gracefully
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

// Handle uncaught exceptions
process.on('uncaughtException', async (error) => {
  console.error('Uncaught exception:', error)
  await closePool()
  process.exit(1)
})

process.on('unhandledRejection', async (reason, promise) => {
  console.error('Unhandled rejection at:', promise, 'reason:', reason)
  await closePool()
  process.exit(1)
})

module.exports = {
  getPool,
  closePool,
  checkHealth,
  executeQueryWithTimeout,
  getPoolStats,
  sql
}