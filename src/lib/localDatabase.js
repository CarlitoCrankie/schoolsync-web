// lib/localDatabase.js - Connection to your local ZKTime database
const sql = require('mssql')

const localConfig = {
  server: process.env.LOCAL_HOST || '(local)\\SQLEXPRESS',
  database: process.env.LOCAL_DB || 'zktimedb',
  user: process.env.DB_USER || '', // Empty as per your config
  password: process.env.DB_PASSWORD || '', // Empty as per your config
  options: {
    encrypt: false, // Local connection
    trustServerCertificate: true,
    enableArithAbort: true,
    instanceName: 'SQLEXPRESS' // Specify the instance
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
}

let localPool = null

async function getLocalPool() {
  if (!localPool) {
    try {
      console.log('Connecting to local ZKTime database...')
      localPool = await new sql.ConnectionPool(localConfig).connect()
      console.log('Local database connected successfully')
    } catch (error) {
      console.error('Local database connection failed:', error)
      throw new Error(`Local DB connection failed: ${error.message}`)
    }
  }
  return localPool
}

// Close connection gracefully
async function closeLocalPool() {
  if (localPool) {
    await localPool.close()
    localPool = null
  }
}

module.exports = { 
  getLocalPool, 
  closeLocalPool, 
  sql 
}