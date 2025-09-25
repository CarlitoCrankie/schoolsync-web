// // pages/api/maintenance.js
// const { getPool, sql } = require('../../lib/database')

// export default async function handler(req, res) {
//   if (req.method !== 'POST') {
//     return res.status(405).json({ error: 'Method not allowed' })
//   }

//   const { action, auth_key } = req.body

//   // Simple auth check
//   if (auth_key !== process.env.MAINTENANCE_KEY) {
//     return res.status(401).json({ error: 'Unauthorized' })
//   }

//   try {
//     switch (action) {
//       case 'archive_attendance':
//         return await handleArchiveAttendance(req, res)
//       case 'get_archive_stats':
//         return await handleGetArchiveStats(req, res)
//       default:
//         return res.status(400).json({ error: 'Invalid action' })
//     }
//   } catch (error) {
//     console.error('Maintenance API error:', error)
//     res.status(500).json({ error: error.message })
//   }
// }

// async function handleArchiveAttendance(req, res) {
//   const pool = await getPool()
  
//   try {
//     console.log('Starting attendance archival process...')
    
//     // Execute the archive procedure
//     const result = await pool.request().execute('sp_ArchiveOldAttendance')
    
//     res.json({
//       success: true,
//       message: 'Attendance archival completed successfully',
//       timestamp: new Date().toISOString()
//     })
    
//   } catch (error) {
//     console.error('Archive error:', error)
//     throw error
//   }
// }

// async function handleGetArchiveStats(req, res) {
//   const pool = await getPool()
  
//   try {
//     const stats = await pool.request().query(`
//       SELECT 
//         (SELECT COUNT(*) FROM Attendance) as ActiveRecords,
//         (SELECT COUNT(*) FROM Attendance_Archive) as ArchivedRecords,
//         (SELECT MIN(CreatedAt) FROM Attendance) as OldestActiveRecord,
//         (SELECT MAX(CreatedAt) FROM Attendance_Archive) as NewestArchivedRecord,
//         (SELECT 
//           CAST(SUM(CAST(row_count AS BIGINT) * 8) / 1024.0 / 1024.0 AS DECIMAL(10,2))
//           FROM sys.dm_db_partition_stats 
//           WHERE object_id = OBJECT_ID('Attendance')
//         ) as ActiveTableSizeMB,
//         (SELECT 
//           CAST(SUM(CAST(row_count AS BIGINT) * 8) / 1024.0 / 1024.0 AS DECIMAL(10,2))
//           FROM sys.dm_db_partition_stats 
//           WHERE object_id = OBJECT_ID('Attendance_Archive')
//         ) as ArchiveTableSizeMB
//     `)
    
//     res.json({
//       success: true,
//       stats: stats.recordset[0],
//       timestamp: new Date().toISOString()
//     })
    
//   } catch (error) {
//     console.error('Stats error:', error)
//     throw error
//   }
// }

require('dotenv').config()

// scripts/database-maintenance.js - CRITICAL: Database maintenance and monitoring script
const { executeQuery, getPoolStatus, monitorConnectionHealth, cleanupIdleConnections } = require('../lib/database')

const MAINTENANCE_KEY = process.env.MAINTENANCE_KEY

async function runHealthCheck() {
  console.log('\n=== DATABASE HEALTH CHECK ===')
  
  try {
    const poolStatus = getPoolStatus()
    console.log('Pool Status:', JSON.stringify(poolStatus, null, 2))
    
    const healthResult = await monitorConnectionHealth()
    console.log('Health Check Result:', healthResult ? 'PASSED' : 'FAILED')
    
    // Get detailed connection statistics
    const stats = await executeQuery(`
      SELECT 
        COUNT(*) as total_connections,
        SUM(CASE WHEN program_name LIKE '%node%' THEN 1 ELSE 0 END) as node_connections,
        SUM(CASE WHEN last_request_end_time < DATEADD(MINUTE, -5, GETDATE()) THEN 1 ELSE 0 END) as idle_5min,
        SUM(CASE WHEN last_request_end_time < DATEADD(MINUTE, -15, GETDATE()) THEN 1 ELSE 0 END) as idle_15min,
        SUM(CASE WHEN last_request_end_time < DATEADD(MINUTE, -30, GETDATE()) THEN 1 ELSE 0 END) as idle_30min,
        MAX(last_request_end_time) as last_activity
      FROM sys.dm_exec_sessions 
      WHERE is_user_process = 1
    `, {}, 15000)
    
    console.log('Connection Statistics:', JSON.stringify(stats.recordset[0], null, 2))
    
    return healthResult
    
  } catch (error) {
    console.error('Health check failed:', error.message)
    return false
  }
}

async function runConnectionCleanup() {
  console.log('\n=== CONNECTION CLEANUP ===')
  
  try {
    // Show connections before cleanup
    const beforeStats = await executeQuery(`
      SELECT 
        session_id,
        login_name,
        program_name,
        last_request_end_time,
        DATEDIFF(MINUTE, last_request_end_time, GETDATE()) as idle_minutes,
        status
      FROM sys.dm_exec_sessions 
      WHERE is_user_process = 1 
        AND program_name LIKE '%node%'
        AND last_request_end_time < DATEADD(MINUTE, -30, GETDATE())
      ORDER BY last_request_end_time ASC
    `, {}, 20000)
    
    console.log(`Found ${beforeStats.recordset.length} old idle connections`)
    
    if (beforeStats.recordset.length > 0) {
      console.log('Old connections:')
      beforeStats.recordset.forEach(conn => {
        console.log(`  Session ${conn.session_id}: ${conn.login_name} - idle ${conn.idle_minutes}min (${conn.status})`)
      })
      
      await cleanupIdleConnections()
      console.log('Cleanup completed')
    } else {
      console.log('No old connections found - cleanup not needed')
    }
    
    return true
    
  } catch (error) {
    console.error('Connection cleanup failed:', error.message)
    return false
  }
}

async function runPerformanceAnalysis() {
  console.log('\n=== PERFORMANCE ANALYSIS ===')
  
  try {
    // Check for blocking queries
    const blockingQueries = await executeQuery(`
      SELECT 
        r.session_id,
        r.request_id, 
        r.blocking_session_id,
        r.wait_type,
        r.wait_time,
        r.cpu_time,
        r.logical_reads,
        r.writes,
        t.text as query_text
      FROM sys.dm_exec_requests r
      CROSS APPLY sys.dm_exec_sql_text(r.sql_handle) t
      WHERE r.session_id > 50
        AND r.blocking_session_id IS NOT NULL
    `, {}, 15000)
    
    if (blockingQueries.recordset.length > 0) {
      console.log('BLOCKING QUERIES DETECTED:')
      blockingQueries.recordset.forEach(query => {
        console.log(`  Session ${query.session_id} blocked by ${query.blocking_session_id}`)
        console.log(`  Wait: ${query.wait_type} (${query.wait_time}ms)`)
        console.log(`  Query: ${query.query_text.substring(0, 100)}...`)
      })
    } else {
      console.log('No blocking queries detected')
    }
    
    // Check for expensive queries
    const expensiveQueries = await executeQuery(`
      SELECT TOP 10
        qs.execution_count,
        qs.total_elapsed_time / 1000 as total_elapsed_time_ms,
        qs.avg_elapsed_time / 1000 as avg_elapsed_time_ms,
        qs.total_logical_reads,
        qs.avg_logical_reads,
        t.text as query_text
      FROM sys.dm_exec_query_stats qs
      CROSS APPLY sys.dm_exec_sql_text(qs.sql_handle) t
      WHERE qs.avg_elapsed_time > 1000000  -- > 1 second average
      ORDER BY qs.avg_elapsed_time DESC
    `, {}, 20000)
    
    if (expensiveQueries.recordset.length > 0) {
      console.log('\nTOP EXPENSIVE QUERIES:')
      expensiveQueries.recordset.forEach((query, index) => {
        console.log(`  ${index + 1}. Avg: ${Math.round(query.avg_elapsed_time_ms)}ms, Executions: ${query.execution_count}`)
        console.log(`     Query: ${query.query_text.substring(0, 100)}...`)
      })
    }
    
    return true
    
  } catch (error) {
    console.error('Performance analysis failed:', error.message)
    return false
  }
}

async function runDiskSpaceCheck() {
  console.log('\n=== DISK SPACE CHECK ===')
  
  try {
    const diskUsage = await executeQuery(`
      SELECT 
        DB_NAME() as database_name,
        SUM(CASE WHEN type = 0 THEN size END) * 8.0 / 1024 as data_size_mb,
        SUM(CASE WHEN type = 1 THEN size END) * 8.0 / 1024 as log_size_mb,
        SUM(size) * 8.0 / 1024 as total_size_mb
      FROM sys.database_files
    `, {}, 10000)
    
    const usage = diskUsage.recordset[0]
    console.log('Database Size:')
    console.log(`  Data: ${Math.round(usage.data_size_mb || 0)} MB`)
    console.log(`  Log: ${Math.round(usage.log_size_mb || 0)} MB`)
    console.log(`  Total: ${Math.round(usage.total_size_mb || 0)} MB`)
    
    // Check table sizes
    const tableSizes = await executeQuery(`
      SELECT TOP 10
        t.name as table_name,
        SUM(s.used_page_count) * 8.0 / 1024 as size_mb,
        SUM(s.row_count) as row_count
      FROM sys.tables t
      INNER JOIN sys.dm_db_partition_stats s ON s.object_id = t.object_id
      GROUP BY t.name
      ORDER BY SUM(s.used_page_count) DESC
    `, {}, 15000)
    
    console.log('\nLargest Tables:')
    tableSizes.recordset.forEach(table => {
      console.log(`  ${table.table_name}: ${Math.round(table.size_mb)} MB (${table.row_count.toLocaleString()} rows)`)
    })
    
    return true
    
  } catch (error) {
    console.error('Disk space check failed:', error.message)
    return false
  }
}

async function main() {
  const command = process.argv[2]
  
  console.log('='.repeat(50))
  console.log('DATABASE MAINTENANCE TOOL')
  console.log('='.repeat(50))
  
  try {
    switch (command) {
      case 'health':
        await runHealthCheck()
        break
        
      case 'cleanup':
        await runConnectionCleanup()
        break
        
      case 'performance':
        await runPerformanceAnalysis()
        break
        
      case 'disk':
        await runDiskSpaceCheck()
        break
        
      case 'full':
        console.log('Running full maintenance check...')
        await runHealthCheck()
        await runConnectionCleanup()
        await runPerformanceAnalysis()
        await runDiskSpaceCheck()
        break
        
      default:
        console.log('Available commands:')
        console.log('  node scripts/database-maintenance.js health      - Check database health')
        console.log('  node scripts/database-maintenance.js cleanup     - Clean up idle connections')
        console.log('  node scripts/database-maintenance.js performance - Analyze query performance')
        console.log('  node scripts/database-maintenance.js disk        - Check disk usage')
        console.log('  node scripts/database-maintenance.js full        - Run all checks')
        break
    }
    
    console.log('\nMaintenance completed successfully')
    process.exit(0)
    
  } catch (error) {
    console.error('Maintenance script failed:', error)
    process.exit(1)
  }
}

// Run if called directly
if (require.main === module) {
  main()
}

module.exports = {
  runHealthCheck,
  runConnectionCleanup,
  runPerformanceAnalysis,
  runDiskSpaceCheck
}