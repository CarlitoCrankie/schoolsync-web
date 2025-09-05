// lib/database.js - Fixed database connection management
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
    connectTimeout: 60000,     // Increased to 60 seconds
    requestTimeout: 60000,     // Increased to 60 seconds
    cancelTimeout: 30000
  },
  pool: {
    max: 20,                   // Maximum connections in pool
    min: 2,                    // Minimum connections
    idleTimeoutMillis: 300000, // 5 minutes
    acquireTimeoutMillis: 60000 // 1 minute to acquire connection
    // Removed unsupported options:
    // evictionRunIntervalMillis, createTimeoutMillis, destroyTimeoutMillis, 
    // reapIntervalMillis, createRetryIntervalMillis
  }
}

let pool = null
let isConnecting = false
let keepAliveInterval = null

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
    
    if (pool) {
      try {
        await pool.close()
      } catch (err) {
        console.log('Error closing existing pool:', err.message)
      }
    }

    pool = new sql.ConnectionPool(config)
    
    // Add connection event handlers
    pool.on('connect', () => {
      console.log('Database connected successfully')
      startKeepAlive()
    })
    
    pool.on('error', (err) => {
      console.error('Database pool error:', err)
      pool = null
      stopKeepAlive()
    })

    await pool.connect()
    return pool
    
  } catch (error) {
    console.error('Database connection failed:', error)
    pool = null
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
    // Test connection with a simple query
    await pool.request().query('SELECT 1')
    return pool
  } catch (error) {
    console.log('Connection test failed, reconnecting...', error.message)
    return await createPool()
  }
}

// Keep-alive mechanism to prevent connection timeouts
const startKeepAlive = () => {
  if (keepAliveInterval) {
    clearInterval(keepAliveInterval)
  }
  
  keepAliveInterval = setInterval(async () => {
    try {
      if (pool && pool.connected) {
        await pool.request().query('SELECT 1 as keepalive')
        console.log('Database keep-alive ping successful')
      }
    } catch (error) {
      console.log('Keep-alive ping failed:', error.message)
      // Don't reset pool here, let getPool handle reconnection
    }
  }, 240000) // Ping every 4 minutes
}

const stopKeepAlive = () => {
  if (keepAliveInterval) {
    clearInterval(keepAliveInterval)
    keepAliveInterval = null
  }
}

// Graceful shutdown
const closePool = async () => {
  stopKeepAlive()
  if (pool) {
    try {
      await pool.close()
      console.log('Database pool closed gracefully')
    } catch (error) {
      console.error('Error closing database pool:', error)
    }
    pool = null
  }
}

// Handle process termination
process.on('SIGINT', closePool)
process.on('SIGTERM', closePool)
process.on('exit', closePool)

module.exports = {
  getPool,
  closePool,
  sql
}