// pages/api/analytics.js - CORRECTED VERSION
const { getPool, sql } = require('../../lib/database')

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { 
      type, 
      school_id, 
      company_id, 
      date_from, 
      date_to,
      granularity = 'daily'
    } = req.query

    let result
    switch (type) {
      case 'overview':
        result = await getOverviewAnalytics(school_id)
        break
      case 'attendance':
        result = await getAttendanceAnalytics(school_id, date_from, date_to, granularity)
        break
      case 'students':
        result = await getStudentAnalytics(school_id)
        break
      case 'schools':
        result = await getSchoolAnalytics()
        break
      case 'sync-performance':
        result = await getSyncPerformanceAnalytics(school_id)
        break
      case 'trends':
        result = await getTrendAnalytics(school_id, date_from, date_to)
        break
      case 'real-time':
        if (req.method === 'GET') {
          const { school_id, company_id, date_from, date_to } = req.query
          
      try {
        const { grade } = req.query; // Extract grade from request
        
        if (company_id) {
          result = await getRealTimeAttendance(null, date_from, date_to, grade)
        } else if (school_id) {
          result = await getRealTimeAttendance(school_id, date_from, date_to, grade)
        } else {
          result = await getRealTimeAttendance(null, date_from, date_to, grade)
        }
      }catch (error) {
            console.error('Real-time attendance error:', error)
            return res.status(500).json({ 
              success: false, 
              error: error.message 
            })
          }
        } else {
          return res.status(405).json({ error: 'Method not allowed for real-time endpoint' })
        }
        break
      default:
        return res.status(400).json({ 
          error: 'Invalid analytics type', 
          available_types: ['overview', 'attendance', 'students', 'schools', 'sync-performance', 'trends', 'real-time']
        })
    }

    res.json({
      success: true,
      type: type,
      filters: {
        school_id: school_id,
        date_from: date_from,
        date_to: date_to,
        granularity: granularity
      },
      ...result,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Analytics API error:', error)
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    })
  }
}

// CORRECTED: getRealTimeAttendance function with proper time settings integration


// // FIXED: getRealTimeAttendance function - Remove BadgeNumber column reference
// async function getRealTimeAttendance(schoolId, dateFrom, dateTo) {
//   const pool = await getPool()
//   const request = pool.request()
  
//   // Handle date range properly
//   let dateFilter = ''
//   if (dateFrom && dateTo) {
//     const startDateTime = dateFrom + 'T00:00:00.000Z'
//     const endDateTime = dateTo + 'T23:59:59.999Z'
    
//     request.input('startDate', sql.DateTime2, new Date(startDateTime))
//     request.input('endDate', sql.DateTime2, new Date(endDateTime))
//     dateFilter = 'AND a.ScanTime BETWEEN @startDate AND @endDate'
//   } else {
//     const defaultStart = new Date(Date.now() - 24 * 60 * 60 * 1000)
//     request.input('defaultStart', sql.DateTime2, defaultStart)
//     dateFilter = 'AND a.ScanTime >= @defaultStart'
//   }
  
//   let schoolFilter = ''
//   if (schoolId) {
//     schoolFilter = 'AND st.SchoolID = @schoolId'
//     request.input('schoolId', sql.Int, parseInt(schoolId))
//   }

//   try {
//     // First, get time settings for the relevant schools - FIXED syntax
//     let timeSettingsMap = {}
//     try {
//       let timeSettingsQuery
//       if (schoolId) {
//         const timeSettingsRequest = pool.request()
//         timeSettingsRequest.input('schoolId', sql.Int, parseInt(schoolId))
//         timeSettingsQuery = await timeSettingsRequest.query(`
//           SELECT 
//             sts.SchoolID,
//             CONVERT(VARCHAR(5), sts.SchoolStartTime, 108) as SchoolStartTime,
//             CONVERT(VARCHAR(5), sts.SchoolEndTime, 108) as SchoolEndTime,
//             CONVERT(VARCHAR(5), sts.LateArrivalTime, 108) as LateArrivalTime,
//             CONVERT(VARCHAR(5), sts.EarlyDepartureTime, 108) as EarlyDepartureTime,
//             sts.Timezone
//           FROM SchoolTimeSettings sts
//           WHERE sts.SchoolID = @schoolId
//         `)
//       } else {
//         timeSettingsQuery = await pool.request().query(`
//           SELECT 
//             sts.SchoolID,
//             CONVERT(VARCHAR(5), sts.SchoolStartTime, 108) as SchoolStartTime,
//             CONVERT(VARCHAR(5), sts.SchoolEndTime, 108) as SchoolEndTime,
//             CONVERT(VARCHAR(5), sts.LateArrivalTime, 108) as LateArrivalTime,
//             CONVERT(VARCHAR(5), sts.EarlyDepartureTime, 108) as EarlyDepartureTime,
//             sts.Timezone
//           FROM SchoolTimeSettings sts
//         `)
//       }

//       timeSettingsQuery.recordset.forEach(settings => {
//         timeSettingsMap[settings.SchoolID] = {
//           school_start_time: settings.SchoolStartTime,
//           school_end_time: settings.SchoolEndTime,
//           late_arrival_time: settings.LateArrivalTime,
//           early_departure_time: settings.EarlyDepartureTime,
//           timezone: settings.Timezone
//         }
//       })
      
//       console.log('Loaded time settings for schools:', Object.keys(timeSettingsMap))
//     } catch (error) {
//       console.warn('Failed to load time settings for analytics:', error.message)
//     }

//       // In your getRealTimeAttendance function, update the main query:
//       const attendanceResult = await request.query(`
//         SELECT TOP 100
//           a.AttendanceID as attendance_id,
//           a.StudentID as student_id,
//           st.Name as student_name,
//           st.Grade as grade,  -- Add grade information
//           a.ScanTime as scan_time,
//           a.Status as status,
//           a.CreatedAt as created_at,
//           s.Name as school_name,
//           s.SchoolID as school_id
//         FROM dbo.Attendance a
//         INNER JOIN Students st ON a.StudentID = st.StudentID
//         INNER JOIN Schools s ON st.SchoolID = s.SchoolID
//         WHERE 1=1 
//         ${dateFilter}
//         ${schoolFilter}
//         ${req.query.grade ? 'AND st.Grade = @grade' : ''}
//         ORDER BY a.ScanTime DESC, a.CreatedAt DESC
//       `)

//       // Add the grade parameter if provided
//       if (req.query.grade) {
//         request.input('grade', sql.NVarChar(10), req.query.grade)
//       }

//     console.log(`Found ${attendanceResult.recordset.length} attendance records`)

//     // Enhance attendance records with time settings
//     const enhancedAttendance = attendanceResult.recordset.map(record => {
//       const baseRecord = {
//         attendance_id: record.attendance_id,
//         student_id: record.student_id,
//         student_name: record.student_name,
//         scan_time: record.scan_time,
//         status: record.status,
//         created_at: record.created_at,
//         school_name: record.school_name,
//         school_id: record.school_id
//       }

//       // Apply time settings if available for this school
//       const timeSettings = timeSettingsMap[record.school_id]
//       if (timeSettings) {
//         const statusInfo = calculateAttendanceStatusForAPI(
//           record.scan_time,
//           record.status,
//           timeSettings
//         )
        
//         return {
//           ...baseRecord,
//           statusLabel: statusInfo.statusLabel,
//           statusType: statusInfo.statusType,
//           message: statusInfo.message
//         }
//       }

//       return baseRecord
//     })

//     // Get summary stats for the same period
//     const summaryResult = await request.query(`
//       SELECT 
//         COUNT(*) as total_records,
//         COUNT(CASE WHEN a.Status = 'IN' THEN 1 END) as check_ins,
//         COUNT(CASE WHEN a.Status = 'OUT' THEN 1 END) as check_outs,
//         COUNT(DISTINCT a.StudentID) as unique_students,
//         MIN(a.ScanTime) as earliest_scan,
//         MAX(a.ScanTime) as latest_scan
//       FROM dbo.Attendance a
//       INNER JOIN Students st ON a.StudentID = st.StudentID
//       INNER JOIN Schools s ON st.SchoolID = s.SchoolID
//       WHERE 1=1 
//       ${dateFilter}
//       ${schoolFilter}
//     `)

//     const summary = summaryResult.recordset[0]

//     // Calculate enhanced statistics based on the enhanced data
//     const lateArrivals = enhancedAttendance.filter(r => r.statusType === 'late' && r.status === 'IN').length
//     const earlyArrivals = enhancedAttendance.filter(r => r.statusType === 'early-arrival' && r.status === 'IN').length
//     const onTimeArrivals = enhancedAttendance.filter(r => r.statusType === 'on-time' && r.status === 'IN').length
//     const earlyDepartures = enhancedAttendance.filter(r => r.statusType === 'early-departure' && r.status === 'OUT').length

//     console.log(`Enhanced stats - Late: ${lateArrivals}, Early: ${earlyArrivals}, On-time: ${onTimeArrivals}, Early departures: ${earlyDepartures}`)

//     return {
//       current_activity: enhancedAttendance,
//       summary: {
//         total_records: summary.total_records || 0,
//         check_ins: summary.check_ins || 0,
//         check_outs: summary.check_outs || 0,
//         unique_students: summary.unique_students || 0,
//         // Enhanced stats with time settings
//         late_arrivals: lateArrivals,
//         early_arrivals: earlyArrivals,
//         on_time_arrivals: onTimeArrivals,
//         early_departures: earlyDepartures,
//         punctuality_rate: summary.check_ins > 0 ? Math.round((onTimeArrivals / summary.check_ins) * 100) : 0,
//         date_range: {
//           earliest: summary.earliest_scan,
//           latest: summary.latest_scan,
//           requested_from: dateFrom,
//           requested_to: dateTo
//         }
//       },
//       time_settings_applied: Object.keys(timeSettingsMap).length > 0,
//       schools_with_settings: Object.keys(timeSettingsMap).map(Number)
//     }
//   } catch (error) {
//     console.error('Error in getRealTimeAttendance:', error)
//     throw error
//   }
// }

async function getRealTimeAttendance(schoolId, dateFrom, dateTo, grade = null) {
  const pool = await getPool()
  const request = pool.request()
  
  // Handle date range properly
  let dateFilter = ''
  if (dateFrom && dateTo) {
    const startDateTime = dateFrom + 'T00:00:00.000Z'
    const endDateTime = dateTo + 'T23:59:59.999Z'
    
    request.input('startDate', sql.DateTime2, new Date(startDateTime))
    request.input('endDate', sql.DateTime2, new Date(endDateTime))
    dateFilter = 'AND a.ScanTime BETWEEN @startDate AND @endDate'
  } else {
    const defaultStart = new Date(Date.now() - 24 * 60 * 60 * 1000)
    request.input('defaultStart', sql.DateTime2, defaultStart)
    dateFilter = 'AND a.ScanTime >= @defaultStart'
  }
  
  let schoolFilter = ''
  if (schoolId) {
    schoolFilter = 'AND st.SchoolID = @schoolId'
    request.input('schoolId', sql.Int, parseInt(schoolId))
  }

  // Add grade filter
  let gradeFilter = ''
  if (grade) {
    gradeFilter = 'AND st.Grade = @grade'
    request.input('grade', sql.NVarChar(10), grade)
  }

  try {
    // First, get time settings for the relevant schools - FIXED syntax
    let timeSettingsMap = {}
    try {
      let timeSettingsQuery
      if (schoolId) {
        const timeSettingsRequest = pool.request()
        timeSettingsRequest.input('schoolId', sql.Int, parseInt(schoolId))
        timeSettingsQuery = await timeSettingsRequest.query(`
          SELECT 
            sts.SchoolID,
            CONVERT(VARCHAR(5), sts.SchoolStartTime, 108) as SchoolStartTime,
            CONVERT(VARCHAR(5), sts.SchoolEndTime, 108) as SchoolEndTime,
            CONVERT(VARCHAR(5), sts.LateArrivalTime, 108) as LateArrivalTime,
            CONVERT(VARCHAR(5), sts.EarlyDepartureTime, 108) as EarlyDepartureTime,
            sts.Timezone
          FROM SchoolTimeSettings sts
          WHERE sts.SchoolID = @schoolId
        `)
      } else {
        timeSettingsQuery = await pool.request().query(`
          SELECT 
            sts.SchoolID,
            CONVERT(VARCHAR(5), sts.SchoolStartTime, 108) as SchoolStartTime,
            CONVERT(VARCHAR(5), sts.SchoolEndTime, 108) as SchoolEndTime,
            CONVERT(VARCHAR(5), sts.LateArrivalTime, 108) as LateArrivalTime,
            CONVERT(VARCHAR(5), sts.EarlyDepartureTime, 108) as EarlyDepartureTime,
            sts.Timezone
          FROM SchoolTimeSettings sts
        `)
      }

      timeSettingsQuery.recordset.forEach(settings => {
        timeSettingsMap[settings.SchoolID] = {
          school_start_time: settings.SchoolStartTime,
          school_end_time: settings.SchoolEndTime,
          late_arrival_time: settings.LateArrivalTime,
          early_departure_time: settings.EarlyDepartureTime,
          timezone: settings.Timezone
        }
      })
      
      console.log('Loaded time settings for schools:', Object.keys(timeSettingsMap))
    } catch (error) {
      console.warn('Failed to load time settings for analytics:', error.message)
    }

    // Main query with proper filters
    const attendanceResult = await request.query(`
      SELECT TOP 100
        a.AttendanceID as attendance_id,
        a.StudentID as student_id,
        st.Name as student_name,
        st.Grade as grade,
        a.ScanTime as scan_time,
        a.Status as status,
        a.CreatedAt as created_at,
        s.Name as school_name,
        s.SchoolID as school_id
      FROM dbo.Attendance a
      INNER JOIN Students st ON a.StudentID = st.StudentID
      INNER JOIN Schools s ON st.SchoolID = s.SchoolID
      WHERE 1=1 
      ${dateFilter}
      ${schoolFilter}
      ${gradeFilter}
      ORDER BY a.ScanTime DESC, a.CreatedAt DESC
    `)

    console.log(`Found ${attendanceResult.recordset.length} attendance records`)

    // Enhance attendance records with time settings
    const enhancedAttendance = attendanceResult.recordset.map(record => {
      const baseRecord = {
        attendance_id: record.attendance_id,
        student_id: record.student_id,
        student_name: record.student_name,
        grade: record.grade, // Include grade in response
        scan_time: record.scan_time,
        status: record.status,
        created_at: record.created_at,
        school_name: record.school_name,
        school_id: record.school_id
      }

      // Apply time settings if available for this school
      const timeSettings = timeSettingsMap[record.school_id]
      if (timeSettings) {
        const statusInfo = calculateAttendanceStatusForAPI(
          record.scan_time,
          record.status,
          timeSettings
        )
        
        return {
          ...baseRecord,
          statusLabel: statusInfo.statusLabel,
          statusType: statusInfo.statusType,
          message: statusInfo.message
        }
      }

      return baseRecord
    })

    // Get summary stats for the same period
    const summaryResult = await request.query(`
      SELECT 
        COUNT(*) as total_records,
        COUNT(CASE WHEN a.Status = 'IN' THEN 1 END) as check_ins,
        COUNT(CASE WHEN a.Status = 'OUT' THEN 1 END) as check_outs,
        COUNT(DISTINCT a.StudentID) as unique_students,
        MIN(a.ScanTime) as earliest_scan,
        MAX(a.ScanTime) as latest_scan
      FROM dbo.Attendance a
      INNER JOIN Students st ON a.StudentID = st.StudentID
      INNER JOIN Schools s ON st.SchoolID = s.SchoolID
      WHERE 1=1 
      ${dateFilter}
      ${schoolFilter}
      ${gradeFilter}
    `)

    const summary = summaryResult.recordset[0]

    // Calculate enhanced statistics based on the enhanced data
    const lateArrivals = enhancedAttendance.filter(r => r.statusType === 'late' && r.status === 'IN').length
    const earlyArrivals = enhancedAttendance.filter(r => r.statusType === 'early-arrival' && r.status === 'IN').length
    const onTimeArrivals = enhancedAttendance.filter(r => r.statusType === 'on-time' && r.status === 'IN').length
    const earlyDepartures = enhancedAttendance.filter(r => r.statusType === 'early-departure' && r.status === 'OUT').length

    console.log(`Enhanced stats - Late: ${lateArrivals}, Early: ${earlyArrivals}, On-time: ${onTimeArrivals}, Early departures: ${earlyDepartures}`)

    return {
      current_activity: enhancedAttendance,
      summary: {
        total_records: summary.total_records || 0,
        check_ins: summary.check_ins || 0,
        check_outs: summary.check_outs || 0,
        unique_students: summary.unique_students || 0,
        // Enhanced stats with time settings
        late_arrivals: lateArrivals,
        early_arrivals: earlyArrivals,
        on_time_arrivals: onTimeArrivals,
        early_departures: earlyDepartures,
        punctuality_rate: summary.check_ins > 0 ? Math.round((onTimeArrivals / summary.check_ins) * 100) : 0,
        date_range: {
          earliest: summary.earliest_scan,
          latest: summary.latest_scan,
          requested_from: dateFrom,
          requested_to: dateTo
        }
      },
      time_settings_applied: Object.keys(timeSettingsMap).length > 0,
      schools_with_settings: Object.keys(timeSettingsMap).map(Number),
      filters_applied: {
        school_id: schoolId,
        date_from: dateFrom,
        date_to: dateTo,
        grade: grade
      }
    }
  } catch (error) {
    console.error('Error in getRealTimeAttendance:', error)
    throw error
  }
}

// CORRECTED: Enhanced function to calculate attendance status - matches your frontend expectations
function calculateAttendanceStatusForAPI(scanTime, status, timeSettings) {
  if (!scanTime || !status || !timeSettings) {
    return {
      status: status,
      statusLabel: status === 'IN' ? 'Check In' : 'Check Out',
      statusType: 'normal',
      message: null,
      scanTime: scanTime ? new Date(scanTime).toTimeString().substr(0, 5) : null
    }
  }

  const scanDateTime = new Date(scanTime)
  const scanTimeOnly = scanDateTime.toTimeString().substr(0, 5) // HH:MM format
  
  const {
    school_start_time = '08:00',
    school_end_time = '15:00',
    late_arrival_time = '08:30',
    early_departure_time = '14:00'
  } = timeSettings

  let statusType = 'normal'
  let statusLabel = status === 'IN' ? 'Check In' : 'Check Out'
  let message = null

  if (status === 'IN') {
    // Check-in status - CORRECTED to match frontend expectations
    if (scanTimeOnly <= school_start_time) {
      statusType = 'early-arrival'  // CORRECTED: matches frontend
      statusLabel = 'Early Arrival'
      message = `Arrived early at ${scanTimeOnly}`
    } else if (scanTimeOnly <= late_arrival_time) {
      statusType = 'on-time'  // CORRECTED: matches frontend
      statusLabel = 'On Time'
      message = `Arrived on time at ${scanTimeOnly}`
    } else {
      statusType = 'late'
      statusLabel = 'Late Arrival'
      message = `Arrived late at ${scanTimeOnly} (after ${late_arrival_time})`
    }
  } else if (status === 'OUT') {
    // Check-out status - CORRECTED to match frontend expectations
    if (scanTimeOnly < early_departure_time) {
      statusType = 'early-departure'  // CORRECTED: matches frontend
      statusLabel = 'Early Departure'
      message = `Left early at ${scanTimeOnly} (before ${early_departure_time})`
    } else if (scanTimeOnly < school_end_time) {
      statusType = 'normal-departure'  // CORRECTED: matches frontend
      statusLabel = 'Normal Departure'
      message = `Left at ${scanTimeOnly}`
    } else {
      statusType = 'after-hours'  // CORRECTED: matches frontend
      statusLabel = 'After Hours'
      message = `Left after school hours at ${scanTimeOnly}`
    }
  }

  return {
    status,
    statusLabel,
    statusType,
    message,
    scanTime: scanTimeOnly
  }
}


// FIXED: formatTimeFromSQL function in your analytics.js
function formatTimeFromSQL(sqlTime) {
  if (!sqlTime) return null
  
  // Handle different SQL time formats
  let timeStr
  
  if (sqlTime instanceof Date) {
    // If it's a Date object, extract just the time portion
    const hours = sqlTime.getHours().toString().padStart(2, '0')
    const minutes = sqlTime.getMinutes().toString().padStart(2, '0')
    return `${hours}:${minutes}`
  } else if (typeof sqlTime === 'string') {
    // If it's already a string, parse it
    if (sqlTime.includes('T')) {
      // ISO format with date and time
      const date = new Date(sqlTime)
      const hours = date.getHours().toString().padStart(2, '0')
      const minutes = date.getMinutes().toString().padStart(2, '0')
      return `${hours}:${minutes}`
    } else if (sqlTime.includes(':')) {
      // Already in HH:MM or HH:MM:SS format
      const timeParts = sqlTime.split(':')
      if (timeParts.length >= 2) {
        const hours = timeParts[0].padStart(2, '0')
        const minutes = timeParts[1].padStart(2, '0')
        return `${hours}:${minutes}`
      }
    }
    return sqlTime
  } else {
    // Try to convert to string and extract time
    timeStr = sqlTime.toString()
    if (timeStr.includes(':')) {
      const timeParts = timeStr.split(':')
      if (timeParts.length >= 2) {
        const hours = timeParts[0].padStart(2, '0')
        const minutes = timeParts[1].padStart(2, '0')
        return `${hours}:${minutes}`
      }
    }
    return timeStr
  }
}

// Keep your existing functions unchanged - they work fine
// async function getOverviewAnalytics(schoolId) {
//   const pool = await getPool()
//   const request = pool.request()
  
//   let schoolFilter = ''
//   if (schoolId) {
//     schoolFilter = 'AND s.SchoolID = @schoolId'
//     request.input('schoolId', sql.Int, parseInt(schoolId))
//   }

//   try {
//     const overviewResult = await request.query(`
//       SELECT 
//         COUNT(DISTINCT s.SchoolID) as TotalSchools,
//         COUNT(DISTINCT CASE WHEN s.Status = 'active' THEN s.SchoolID END) as ActiveSchools,
//         COUNT(DISTINCT st.StudentID) as TotalStudents,
//         COUNT(DISTINCT CASE WHEN st.IsActive = 1 THEN st.StudentID END) as ActiveStudents,
//         COUNT(CASE WHEN CAST(a.CreatedAt as DATE) = CAST(GETDATE() as DATE) THEN a.AttendanceID END) as TodayAttendance,
//         COUNT(CASE WHEN a.CreatedAt > DATEADD(day, -7, GETDATE()) THEN a.AttendanceID END) as WeekAttendance,
//         COUNT(CASE WHEN a.CreatedAt > DATEADD(day, -30, GETDATE()) THEN a.AttendanceID END) as MonthAttendance
//       FROM Schools s
//       LEFT JOIN Students st ON s.SchoolID = st.SchoolID
//       LEFT JOIN dbo.Attendance a ON st.StudentID = a.StudentID
//       WHERE 1=1 ${schoolFilter}
//     `)

//     const syncResult = await request.query(`
//       SELECT 
//         COUNT(DISTINCT sas.SchoolID) as TotalAgents,
//         COUNT(CASE WHEN sas.LastHeartbeat > DATEADD(MINUTE, -10, GETDATE()) THEN 1 END) as OnlineAgents,
//         COUNT(CASE WHEN sas.LastHeartbeat BETWEEN DATEADD(MINUTE, -30, GETDATE()) AND DATEADD(MINUTE, -10, GETDATE()) THEN 1 END) as WarningAgents,
//         SUM(ISNULL(sas.TotalSynced, 0)) as TotalSynced,
//         SUM(ISNULL(sas.TotalErrors, 0)) as TotalErrors
//       FROM SyncAgentStatus sas
//       WHERE EXISTS (SELECT 1 FROM Schools s WHERE s.SchoolID = sas.SchoolID ${schoolFilter.replace('AND s.', 'AND ')})
//     `)

//     const activityResult = await request.query(`
//       SELECT TOP 20
//         a.AttendanceID,
//         a.StudentID,
//         st.Name as StudentName,
//         s.SchoolID,
//         s.Name as SchoolName,
//         a.ScanTime,
//         a.Status,
//         a.CreatedAt,
//         DATEDIFF(MINUTE, a.CreatedAt, GETDATE()) as MinutesAgo
//       FROM dbo.Attendance a
//       JOIN Students st ON a.StudentID = st.StudentID
//       JOIN Schools s ON st.SchoolID = s.SchoolID
//       WHERE a.CreatedAt > DATEADD(HOUR, -4, GETDATE()) ${schoolFilter}
//       ORDER BY a.CreatedAt DESC
//     `)

//     const overview = overviewResult.recordset[0]
//     const syncStats = syncResult.recordset[0]

//     return {
//       overview: {
//         schools: {
//           total: overview.TotalSchools || 0,
//           active: overview.ActiveSchools || 0,
//           inactive: (overview.TotalSchools || 0) - (overview.ActiveSchools || 0)
//         },
//         students: {
//           total: overview.TotalStudents || 0,
//           active: overview.ActiveStudents || 0,
//           inactive: (overview.TotalStudents || 0) - (overview.ActiveStudents || 0)
//         },
//         attendance: {
//           today: overview.TodayAttendance || 0,
//           week: overview.WeekAttendance || 0,
//           month: overview.MonthAttendance || 0
//         },
//         sync_agents: {
//           total: syncStats.TotalAgents || 0,
//           online: syncStats.OnlineAgents || 0,
//           warning: syncStats.WarningAgents || 0,
//           offline: (syncStats.TotalAgents || 0) - (syncStats.OnlineAgents || 0) - (syncStats.WarningAgents || 0)
//         },
//         performance: {
//           total_synced: syncStats.TotalSynced || 0,
//           total_errors: syncStats.TotalErrors || 0,
//           error_rate: (syncStats.TotalSynced + syncStats.TotalErrors) > 0 ? 
//             Math.round((syncStats.TotalErrors / (syncStats.TotalSynced + syncStats.TotalErrors)) * 100) : 0
//         }
//       },
//       current_activity: activityResult.recordset.map(row => ({
//         attendance_id: row.AttendanceID,
//         student_id: row.StudentID,
//         student_name: row.StudentName,
//         school_id: row.SchoolID,
//         school_name: row.SchoolName,
//         scan_time: row.ScanTime,
//         status: row.Status,
//         created_at: row.CreatedAt,
//         minutes_ago: row.MinutesAgo
//       }))
//     }
//   } catch (error) {
//     console.error('Error in getOverviewAnalytics:', error)
//     throw error
//   }
// }
// FIXED: getOverviewAnalytics function in analytics.js
async function getOverviewAnalytics(schoolId) {
  const pool = await getPool()
  const request = pool.request()
  
  let schoolFilter = ''
  if (schoolId) {
    schoolFilter = 'AND s.SchoolID = @schoolId'
    request.input('schoolId', sql.Int, parseInt(schoolId))
  }

  try {
    // FIXED: Count unique students, not attendance records
    const overviewResult = await request.query(`
      SELECT 
        COUNT(DISTINCT s.SchoolID) as TotalSchools,
        COUNT(DISTINCT CASE WHEN s.Status = 'active' THEN s.SchoolID END) as ActiveSchools,
        COUNT(DISTINCT st.StudentID) as TotalStudents,
        COUNT(DISTINCT CASE WHEN st.IsActive = 1 THEN st.StudentID END) as ActiveStudents,
        -- FIXED: Count unique students who checked in today (not total check-ins)
        COUNT(DISTINCT CASE WHEN CAST(a.ScanTime as DATE) = CAST(GETDATE() as DATE) AND a.Status = 'IN' THEN a.StudentID END) as TodayPresentStudents,
        -- Total attendance records for reference
        COUNT(CASE WHEN CAST(a.CreatedAt as DATE) = CAST(GETDATE() as DATE) THEN a.AttendanceID END) as TodayAttendanceRecords,
        COUNT(CASE WHEN a.CreatedAt > DATEADD(day, -7, GETDATE()) THEN a.AttendanceID END) as WeekAttendance,
        COUNT(CASE WHEN a.CreatedAt > DATEADD(day, -30, GETDATE()) THEN a.AttendanceID END) as MonthAttendance
      FROM Schools s
      LEFT JOIN Students st ON s.SchoolID = st.SchoolID
      LEFT JOIN dbo.Attendance a ON st.StudentID = a.StudentID
      WHERE 1=1 ${schoolFilter}
    `)

    // Calculate absent students
    const overview = overviewResult.recordset[0]
    const totalActiveStudents = overview.ActiveStudents || 0
    const presentToday = overview.TodayPresentStudents || 0
    const absentToday = Math.max(0, totalActiveStudents - presentToday)

    // Get sync agent status (keep existing code)
    const syncResult = await request.query(`
      SELECT 
        COUNT(DISTINCT sas.SchoolID) as TotalAgents,
        COUNT(CASE WHEN sas.LastHeartbeat > DATEADD(MINUTE, -10, GETDATE()) THEN 1 END) as OnlineAgents,
        COUNT(CASE WHEN sas.LastHeartbeat BETWEEN DATEADD(MINUTE, -30, GETDATE()) AND DATEADD(MINUTE, -10, GETDATE()) THEN 1 END) as WarningAgents,
        SUM(ISNULL(sas.TotalSynced, 0)) as TotalSynced,
        SUM(ISNULL(sas.TotalErrors, 0)) as TotalErrors
      FROM SyncAgentStatus sas
      WHERE EXISTS (SELECT 1 FROM Schools s WHERE s.SchoolID = sas.SchoolID ${schoolFilter.replace('AND s.', 'AND ')})
    `)

    // Get recent activity (keep existing code)
    const activityResult = await request.query(`
      SELECT TOP 20
        a.AttendanceID,
        a.StudentID,
        st.Name as StudentName,
        s.SchoolID,
        s.Name as SchoolName,
        a.ScanTime,
        a.Status,
        a.CreatedAt,
        DATEDIFF(MINUTE, a.CreatedAt, GETDATE()) as MinutesAgo
      FROM dbo.Attendance a
      JOIN Students st ON a.StudentID = st.StudentID
      JOIN Schools s ON st.SchoolID = s.SchoolID
      WHERE a.CreatedAt > DATEADD(HOUR, -4, GETDATE()) ${schoolFilter}
      ORDER BY a.CreatedAt DESC
    `)

    const syncStats = syncResult.recordset[0]

    return {
      overview: {
        schools: {
          total: overview.TotalSchools || 0,
          active: overview.ActiveSchools || 0,
          inactive: (overview.TotalSchools || 0) - (overview.ActiveSchools || 0)
        },
        students: {
          total: overview.TotalStudents || 0,
          active: overview.ActiveStudents || 0,
          inactive: (overview.TotalStudents || 0) - (overview.ActiveStudents || 0)
        },
        attendance: {
          // FIXED: Now shows unique students, not total records
          today: presentToday,
          absent_today: absentToday,
          week: overview.WeekAttendance || 0,
          month: overview.MonthAttendance || 0,
          // Add for debugging
          today_records: overview.TodayAttendanceRecords || 0
        },
        sync_agents: {
          total: syncStats.TotalAgents || 0,
          online: syncStats.OnlineAgents || 0,
          warning: syncStats.WarningAgents || 0,
          offline: (syncStats.TotalAgents || 0) - (syncStats.OnlineAgents || 0) - (syncStats.WarningAgents || 0)
        },
        performance: {
          total_synced: syncStats.TotalSynced || 0,
          total_errors: syncStats.TotalErrors || 0,
          error_rate: (syncStats.TotalSynced + syncStats.TotalErrors) > 0 ? 
            Math.round((syncStats.TotalErrors / (syncStats.TotalSynced + syncStats.TotalErrors)) * 100) : 0
        }
      },
      current_activity: activityResult.recordset.map(row => ({
        attendance_id: row.AttendanceID,
        student_id: row.StudentID,
        student_name: row.StudentName,
        school_id: row.SchoolID,
        school_name: row.SchoolName,
        scan_time: row.ScanTime,
        status: row.Status,
        created_at: row.CreatedAt,
        minutes_ago: row.MinutesAgo
      }))
    }
  } catch (error) {
    console.error('Error in getOverviewAnalytics:', error)
    throw error
  }
}

// Keep all your other existing functions - they're working fine
async function getAttendanceAnalytics(schoolId, dateFrom, dateTo, granularity) {
  const pool = await getPool()
  const request = pool.request()
  
  const endDate = dateTo ? new Date(dateTo) : new Date()
  const startDate = dateFrom ? new Date(dateFrom) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  
  request.input('startDate', sql.DateTime2, startDate)
  request.input('endDate', sql.DateTime2, endDate)
  
  let schoolFilter = ''
  if (schoolId) {
    schoolFilter = 'AND s.SchoolID = @schoolId'
    request.input('schoolId', sql.Int, parseInt(schoolId))
  }

  try {
    const schoolBreakdownResult = await request.query(`
      SELECT 
        s.SchoolID,
        s.Name as SchoolName,
        ISNULL(s.Location, 'Not specified') as Location,
        COUNT(a.AttendanceID) as AttendanceCount,
        COUNT(DISTINCT a.StudentID) as UniqueStudents
      FROM Schools s
      LEFT JOIN Students st ON s.SchoolID = st.SchoolID
      LEFT JOIN dbo.Attendance a ON st.StudentID = a.StudentID 
        AND a.CreatedAt BETWEEN @startDate AND @endDate
      WHERE 1=1 ${schoolFilter}
      GROUP BY s.SchoolID, s.Name, s.Location
      ORDER BY AttendanceCount DESC
    `)

    const totalAttendance = schoolBreakdownResult.recordset.reduce((sum, row) => sum + (row.AttendanceCount || 0), 0)
    const totalUniqueStudents = Math.max(...schoolBreakdownResult.recordset.map(row => row.UniqueStudents || 0), 0)

    return {
      date_range: {
        from: startDate.toISOString(),
        to: endDate.toISOString(),
        granularity: granularity
      },
      school_breakdown: schoolBreakdownResult.recordset.map(row => ({
        school_id: row.SchoolID,
        school_name: row.SchoolName,
        location: row.Location,
        attendance_count: row.AttendanceCount || 0,
        unique_students: row.UniqueStudents || 0,
        performance_vs_avg: 0
      })),
      summary: {
        total_attendance: totalAttendance,
        total_unique_students: totalUniqueStudents,
        avg_daily_attendance: Math.round(totalAttendance / Math.max(1, Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24))))
      }
    }
  } catch (error) {
    console.error('Error in getAttendanceAnalytics:', error)
    throw error
  }
}

async function getSchoolAnalytics() {
  const pool = await getPool()
  const request = pool.request()

  try {
    const schoolsResult = await request.query(`
      SELECT 
        s.SchoolID,
        s.Name as SchoolName,
        ISNULL(s.Location, 'Not specified') as Location,
        ISNULL(s.Status, 'active') as SchoolStatus,
        COUNT(DISTINCT st.StudentID) as TotalStudents,
        COUNT(DISTINCT CASE WHEN st.IsActive = 1 THEN st.StudentID END) as ActiveStudents,
        COUNT(a.AttendanceID) as TotalAttendance,
        COUNT(CASE WHEN CAST(a.CreatedAt as DATE) = CAST(GETDATE() as DATE) THEN a.AttendanceID END) as TodayAttendance,
        MAX(a.CreatedAt) as LastAttendanceRecord,
        sas.Status as SyncStatus,
        sas.LastHeartbeat,
        CASE 
          WHEN sas.LastHeartbeat > DATEADD(MINUTE, -10, GETDATE()) THEN 'Online'
          WHEN sas.LastHeartbeat > DATEADD(MINUTE, -30, GETDATE()) THEN 'Warning'  
          WHEN sas.LastHeartbeat IS NULL THEN 'Unknown'
          ELSE 'Offline'
        END as SyncConnectionStatus,
        ISNULL(sas.TotalSynced, 0) as TotalSynced,
        ISNULL(sas.TotalErrors, 0) as TotalErrors
      FROM Schools s
      LEFT JOIN Students st ON s.SchoolID = st.SchoolID
      LEFT JOIN dbo.Attendance a ON st.StudentID = a.StudentID
      LEFT JOIN SyncAgentStatus sas ON s.SchoolID = sas.SchoolID
      GROUP BY s.SchoolID, s.Name, s.Location, s.Status, sas.Status, sas.LastHeartbeat, sas.TotalSynced, sas.TotalErrors
      ORDER BY s.Name
    `)

    return {
      schools: schoolsResult.recordset.map(row => ({
        school_id: row.SchoolID,
        name: row.SchoolName,
        location: row.Location,
        status: row.SchoolStatus,
        students: {
          total: row.TotalStudents || 0,
          active: row.ActiveStudents || 0,
          inactive: (row.TotalStudents || 0) - (row.ActiveStudents || 0)
        },
        attendance: {
          total: row.TotalAttendance || 0,
          today: row.TodayAttendance || 0,
          last_record: row.LastAttendanceRecord
        },
        sync_agent: {
          status: row.SyncStatus,
          connection_status: row.SyncConnectionStatus,
          last_heartbeat: row.LastHeartbeat,
          total_synced: row.TotalSynced,
          total_errors: row.TotalErrors,
          health_score: row.TotalSynced > 0 ? 
            Math.round((1 - (row.TotalErrors / (row.TotalSynced + row.TotalErrors))) * 100) : 100
        }
      })),
      summary: {
        total_schools: schoolsResult.recordset.length,
        active_schools: schoolsResult.recordset.filter(row => row.SchoolStatus === 'active').length,
        schools_online: schoolsResult.recordset.filter(row => row.SyncConnectionStatus === 'Online').length
      }
    }
  } catch (error) {
    console.error('Error in getSchoolAnalytics:', error)
    throw error
  }
}

async function getSyncPerformanceAnalytics(schoolId) {
  const pool = await getPool()
  const request = pool.request()
  
  let schoolFilter = ''
  if (schoolId) {
    schoolFilter = 'AND s.SchoolID = @schoolId'
    request.input('schoolId', sql.Int, parseInt(schoolId))
  }

  try {
    const performanceResult = await request.query(`
      SELECT 
        s.SchoolID,
        s.Name as SchoolName,
        ISNULL(sas.Status, 'stopped') as Status,
        sas.LastHeartbeat,
        ISNULL(sas.UptimeHours, 0) as UptimeHours,
        ISNULL(sas.TotalSynced, 0) as TotalSynced,
        ISNULL(sas.TotalErrors, 0) as TotalErrors,
        ISNULL(sas.MemoryUsageMB, 0) as MemoryUsageMB,
        CASE 
          WHEN sas.LastHeartbeat > DATEADD(MINUTE, -10, GETDATE()) THEN 'Online'
          WHEN sas.LastHeartbeat > DATEADD(MINUTE, -30, GETDATE()) THEN 'Warning'  
          WHEN sas.LastHeartbeat IS NULL THEN 'Unknown'
          ELSE 'Offline'
        END as ConnectionStatus,
        CASE 
          WHEN sas.TotalSynced + sas.TotalErrors > 0 
          THEN ROUND((sas.TotalErrors * 100.0 / (sas.TotalSynced + sas.TotalErrors)), 2)
          ELSE 0 
        END as ErrorRate
      FROM Schools s
      LEFT JOIN SyncAgentStatus sas ON s.SchoolID = sas.SchoolID
      WHERE 1=1 ${schoolFilter}
      ORDER BY s.Name
    `)

    const agents = performanceResult.recordset.map(row => ({
      school_id: row.SchoolID,
      school_name: row.SchoolName,
      status: row.Status,
      connection_status: row.ConnectionStatus,
      uptime_hours: row.UptimeHours,
      total_synced: row.TotalSynced,
      total_errors: row.TotalErrors,
      error_rate: row.ErrorRate,
      memory_usage_mb: row.MemoryUsageMB,
      health_score: calculateHealthScore(row)
    }))

    return {
      agents: agents,
      performance_metrics: {
        total_agents: agents.length,
        online_agents: agents.filter(a => a.connection_status === 'Online').length,
        avg_error_rate: agents.length > 0 ? 
          Math.round(agents.reduce((sum, a) => sum + a.error_rate, 0) / agents.length * 100) / 100 : 0,
        total_synced: agents.reduce((sum, a) => sum + a.total_synced, 0),
        total_errors: agents.reduce((sum, a) => sum + a.total_errors, 0),
        avg_uptime_hours: agents.length > 0 ? 
          Math.round(agents.reduce((sum, a) => sum + a.uptime_hours, 0) / agents.length * 100) / 100 : 0
      },
      health_distribution: {
        excellent: agents.filter(a => a.health_score >= 90).length,
        good: agents.filter(a => a.health_score >= 70 && a.health_score < 90).length,
        fair: agents.filter(a => a.health_score >= 50 && a.health_score < 70).length,
        poor: agents.filter(a => a.health_score < 50).length
      }
    }
  } catch (error) {
    console.error('Error in getSyncPerformanceAnalytics:', error)
    throw error
  }
}

async function getStudentAnalytics(schoolId) {
  try {
    return {
      grade_distribution: [],
      top_students: [],
      totals: {
        total_grades: 0,
        total_students: 0,
        active_students: 0
      }
    }
  } catch (error) {
    console.error('Error in getStudentAnalytics:', error)
    throw error
  }
}

async function getTrendAnalytics(schoolId, dateFrom, dateTo) {
  try {
    return {
      date_range: {
        from: dateFrom || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        to: dateTo || new Date().toISOString()
      },
      daily_trends: [],
      hourly_patterns: [],
      trend_analysis: {
        overall_trend: 'stable',
        trend_percentage: 0
      }
    }
  } catch (error) {
    console.error('Error in getTrendAnalytics:', error)
    throw error
  }
}

// Helper function to calculate health score
function calculateHealthScore(agent) {
  let score = 100
  
  if (agent.ConnectionStatus === 'Offline') score -= 50
  else if (agent.ConnectionStatus === 'Warning') score -= 20
  else if (agent.ConnectionStatus === 'Unknown') score -= 30
  
  const errorRate = agent.ErrorRate || 0
  if (errorRate > 10) score -= 30
  else if (errorRate > 5) score -= 15
  else if (errorRate > 1) score -= 5
  
  return Math.max(0, Math.min(100, score))
}