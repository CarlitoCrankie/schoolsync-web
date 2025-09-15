// pages/api/maintenance.js
const { getPool, sql } = require('../../lib/database')

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { action, auth_key } = req.body

  // Simple auth check
  if (auth_key !== process.env.MAINTENANCE_KEY) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    switch (action) {
      case 'archive_attendance':
        return await handleArchiveAttendance(req, res)
      case 'get_archive_stats':
        return await handleGetArchiveStats(req, res)
      default:
        return res.status(400).json({ error: 'Invalid action' })
    }
  } catch (error) {
    console.error('Maintenance API error:', error)
    res.status(500).json({ error: error.message })
  }
}

async function handleArchiveAttendance(req, res) {
  const pool = await getPool()
  
  try {
    console.log('Starting attendance archival process...')
    
    // Execute the archive procedure
    const result = await pool.request().execute('sp_ArchiveOldAttendance')
    
    res.json({
      success: true,
      message: 'Attendance archival completed successfully',
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('Archive error:', error)
    throw error
  }
}

async function handleGetArchiveStats(req, res) {
  const pool = await getPool()
  
  try {
    const stats = await pool.request().query(`
      SELECT 
        (SELECT COUNT(*) FROM Attendance) as ActiveRecords,
        (SELECT COUNT(*) FROM Attendance_Archive) as ArchivedRecords,
        (SELECT MIN(CreatedAt) FROM Attendance) as OldestActiveRecord,
        (SELECT MAX(CreatedAt) FROM Attendance_Archive) as NewestArchivedRecord,
        (SELECT 
          CAST(SUM(CAST(row_count AS BIGINT) * 8) / 1024.0 / 1024.0 AS DECIMAL(10,2))
          FROM sys.dm_db_partition_stats 
          WHERE object_id = OBJECT_ID('Attendance')
        ) as ActiveTableSizeMB,
        (SELECT 
          CAST(SUM(CAST(row_count AS BIGINT) * 8) / 1024.0 / 1024.0 AS DECIMAL(10,2))
          FROM sys.dm_db_partition_stats 
          WHERE object_id = OBJECT_ID('Attendance_Archive')
        ) as ArchiveTableSizeMB
    `)
    
    res.json({
      success: true,
      stats: stats.recordset[0],
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('Stats error:', error)
    throw error
  }
}