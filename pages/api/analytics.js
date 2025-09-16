/**
 * The code defines an optimized API handler for analytics with database performance improvements and
 * various functions for retrieving different types of analytics data.
 * @param schoolId - The `schoolId` parameter is used to identify a specific school within the
 * analytics data. It is typically an integer value that corresponds to a unique identifier for a
 * school in the database. This parameter is often used to filter analytics results based on a specific
 * school, allowing you to retrieve data specific to that
 * @returns The code snippet provided is an optimized version of an API handler for analytics data. It
 * includes functions for handling various types of analytics queries such as overview, attendance,
 * students, schools, sync performance, trends, and real-time data.
 */
// pages/api/analytics.js - OPTIMIZED VERSION with Database Performance Improvements
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

  const startTime = Date.now()

  try {
    const { 
      type, 
      school_id, 
      company_id, 
      date_from, 
      date_to,
      granularity = 'daily',
      limit = 100,
      offset = 0,
      page = 1
    } = req.query

    console.log('Optimized Analytics API called:', {
      type,
      school_id,
      timestamp: new Date().toISOString()
    })

    let result
    switch (type) {
      case 'overview':
        result = await getOverviewAnalyticsOptimized(school_id)
        break
      case 'attendance':
        result = await getAttendanceAnalytics(school_id, date_from, date_to, granularity)
        break
      case 'students':
        result = await getStudentAnalytics(school_id)
        break
      case 'schools':
        result = await getSchoolAnalyticsOptimized()
        break
      case 'sync-performance':
        result = await getSyncPerformanceAnalytics(school_id)
        break
      case 'trends':
        result = await getTrendAnalytics(school_id, date_from, date_to)
        break
      case 'real-time':
        if (req.method === 'GET') {
          const { school_id, company_id, date_from, date_to, grade } = req.query
          
          try {
            if (company_id) {
              result = await getRealTimeAttendanceOptimized(null, date_from, date_to, grade)
            } else if (school_id) {
              result = await getRealTimeAttendanceOptimized(school_id, date_from, date_to, grade)
            } else {
              result = await getRealTimeAttendanceOptimized(null, date_from, date_to, grade)
            }
          } catch (error) {
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

    const totalTime = Date.now() - startTime

    // Log slow queries
    if (totalTime > 5000) {
      console.warn(`SLOW QUERY WARNING: ${type} took ${totalTime}ms`)
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
      queryTime: totalTime,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    const totalTime = Date.now() - startTime
    console.error('Optimized Analytics API error:', {
      error: error.message,
      totalTime,
      timestamp: new Date().toISOString()
    })
    
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
      queryTime: totalTime
    })
  }
}

// OPTIMIZED: Overview Analytics with timeout protection and memory-efficient queries

async function getOverviewAnalyticsOptimized(schoolId) {
  const pool = await getPool()
  const startTime = Date.now()
  
  try {
    const request = pool.request()
    request.timeout = 30000 // 30 second timeout
    
    let schoolFilter = ''
    if (schoolId) {
      schoolFilter = 'AND s.SchoolID = @schoolId'
      request.input('schoolId', sql.Int, parseInt(schoolId))
    }

    // FIXED: Use separate queries to ensure accurate unique student counts
    
    // 1. Get basic school and student counts
    const basicStatsResult = await request.query(`
      SELECT 
        COUNT(DISTINCT s.SchoolID) as TotalSchools,
        COUNT(DISTINCT CASE WHEN s.Status = 'active' THEN s.SchoolID END) as ActiveSchools,
        COUNT(DISTINCT st.StudentID) as TotalStudents,
        COUNT(DISTINCT CASE WHEN st.IsActive = 1 THEN st.StudentID END) as ActiveStudents
      FROM Schools s
      LEFT JOIN Students st ON s.SchoolID = st.SchoolID
      WHERE 1=1 ${schoolFilter}
      OPTION (MAXDOP 1)
    `)

    // 2. FIXED: Get unique students present today with separate query
    const todayPresentResult = await request.query(`
      WITH TodayFirstCheckins AS (
        SELECT DISTINCT
          a.StudentID,
          MIN(a.ScanTime) as FirstCheckin,
          CAST(MIN(a.ScanTime) as TIME) as FirstCheckinTime
        FROM Attendance a
        INNER JOIN Students st ON a.StudentID = st.StudentID
        INNER JOIN Schools s ON st.SchoolID = s.SchoolID
        WHERE CAST(a.ScanTime as DATE) = CAST(GETDATE() as DATE)
        AND a.Status = 'IN'
        AND st.IsActive = 1
        ${schoolFilter}
        GROUP BY a.StudentID
      )
      SELECT 
        COUNT(*) as TodayPresentStudents,
        COUNT(CASE WHEN FirstCheckinTime > '08:30:00' THEN 1 END) as TodayLateStudents
      FROM TodayFirstCheckins
      OPTION (MAXDOP 1)
    `)

    // 3. Get attendance record counts for monitoring
    const attendanceCountsResult = await request.query(`
      SELECT 
        COUNT(CASE WHEN CAST(a.ScanTime as DATE) = CAST(GETDATE() as DATE) THEN a.AttendanceID END) as TodayAttendanceRecords,
        COUNT(CASE WHEN a.ScanTime > DATEADD(day, -7, GETDATE()) THEN a.AttendanceID END) as WeekAttendance,
        COUNT(CASE WHEN a.ScanTime > DATEADD(day, -30, GETDATE()) THEN a.AttendanceID END) as MonthAttendance
      FROM Attendance a WITH (NOLOCK)
      INNER JOIN Students st ON a.StudentID = st.StudentID
      INNER JOIN Schools s ON st.SchoolID = s.SchoolID
      WHERE 1=1 ${schoolFilter}
      OPTION (MAXDOP 1)
    `)

    // 4. Get sync agent status
    const syncResult = await request.query(`
      SELECT 
        COUNT(DISTINCT sas.SchoolID) as TotalAgents,
        COUNT(CASE WHEN sas.LastHeartbeat > DATEADD(MINUTE, -10, GETDATE()) THEN 1 END) as OnlineAgents,
        COUNT(CASE WHEN sas.LastHeartbeat BETWEEN DATEADD(MINUTE, -30, GETDATE()) AND DATEADD(MINUTE, -10, GETDATE()) THEN 1 END) as WarningAgents,
        SUM(ISNULL(sas.TotalSynced, 0)) as TotalSynced,
        SUM(ISNULL(sas.TotalErrors, 0)) as TotalErrors
      FROM SyncAgentStatus sas
      WHERE EXISTS (SELECT 1 FROM Schools s WHERE s.SchoolID = sas.SchoolID ${schoolFilter.replace('AND s.', 'AND ')})
      OPTION (MAXDOP 1)
    `)

    // 5. Get recent activity (limited)
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
      FROM Attendance a WITH (NOLOCK)
      JOIN Students st ON a.StudentID = st.StudentID
      JOIN Schools s ON st.SchoolID = s.SchoolID
      WHERE a.ScanTime > DATEADD(HOUR, -4, GETDATE()) ${schoolFilter}
      ORDER BY a.ScanTime DESC
      OPTION (MAXDOP 1)
    `)

    // Combine results
    const basicStats = basicStatsResult.recordset[0]
    const todayStats = todayPresentResult.recordset[0]
    const attendanceCounts = attendanceCountsResult.recordset[0]
    const syncStats = syncResult.recordset[0]
    
    // Calculate derived metrics
    const totalActiveStudents = basicStats.ActiveStudents || 0
    const presentToday = todayStats.TodayPresentStudents || 0
    const absentToday = Math.max(0, totalActiveStudents - presentToday)

    const queryTime = Date.now() - startTime
    console.log(`FIXED Overview analytics completed in ${queryTime}ms`)
    console.log(`Present today: ${presentToday} unique students out of ${totalActiveStudents} active students`)

    return {
      overview: {
        schools: {
          total: basicStats.TotalSchools || 0,
          active: basicStats.ActiveSchools || 0,
          inactive: (basicStats.TotalSchools || 0) - (basicStats.ActiveSchools || 0)
        },
        students: {
          total: basicStats.TotalStudents || 0,
          active: totalActiveStudents,
          inactive: (basicStats.TotalStudents || 0) - totalActiveStudents
        },
        attendance: {
          // FIXED: Now correctly shows unique students present today
          today: presentToday,
          absent_today: absentToday,
          late_today: todayStats.TodayLateStudents || 0,
          week: attendanceCounts.WeekAttendance || 0,
          month: attendanceCounts.MonthAttendance || 0,
          // Debug information
          today_records: attendanceCounts.TodayAttendanceRecords || 0,
          attendance_rate: totalActiveStudents > 0 ? Math.round((presentToday / totalActiveStudents) * 100) : 0
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
      })),
      debug_info: {
        query_type: 'fixed_unique_count',
        total_active_students: totalActiveStudents,
        unique_present_today: presentToday,
        attendance_records_today: attendanceCounts.TodayAttendanceRecords,
        calculation_method: 'CTE with MIN() to get first check-in per student'
      }
    }
  } catch (error) {
    console.error('Error in FIXED getOverviewAnalyticsOptimized:', error)
    throw error
  }
}

// OPTIMIZED: Real-time attendance with memory management
// async function getRealTimeAttendanceOptimized(schoolId, dateFrom, dateTo, grade = null) {
//   const pool = await getPool()
//   const startTime = Date.now()
  
//   try {
//     const request = pool.request()
//     request.timeout = 45000 // 45 second timeout
    
//     // Handle date range properly
//     let dateFilter = ''
//     if (dateFrom && dateTo) {
//       const startDateTime = dateFrom + 'T00:00:00.000Z'
//       const endDateTime = dateTo + 'T23:59:59.999Z'
      
//       request.input('startDate', sql.DateTime2, new Date(startDateTime))
//       request.input('endDate', sql.DateTime2, new Date(endDateTime))
//       dateFilter = 'AND a.ScanTime BETWEEN @startDate AND @endDate'
//     } else {
//       const defaultStart = new Date(Date.now() - 24 * 60 * 60 * 1000)
//       request.input('defaultStart', sql.DateTime2, defaultStart)
//       dateFilter = 'AND a.ScanTime >= @defaultStart'
//     }
    
//     let schoolFilter = ''
//     if (schoolId) {
//       schoolFilter = 'AND st.SchoolID = @schoolId'
//       request.input('schoolId', sql.Int, parseInt(schoolId))
//     }

//     let gradeFilter = ''
//     if (grade) {
//       gradeFilter = 'AND st.Grade = @grade'
//       request.input('grade', sql.NVarChar(10), grade)
//     }

//     // Get time settings (lightweight query)
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
//     } catch (error) {
//       console.warn('Failed to load time settings for analytics:', error.message)
//     }

//     // OPTIMIZED: Limited attendance query with index hints
//     const attendanceResult = await request.query(`
//       SELECT TOP 100
//         a.AttendanceID as attendance_id,
//         a.StudentID as student_id,
//         st.Name as student_name,
//         st.Grade as grade,
//         a.ScanTime as scan_time,
//         a.Status as status,
//         a.CreatedAt as created_at,
//         s.Name as school_name,
//         s.SchoolID as school_id
//       FROM Attendance a WITH (NOLOCK)
//       INNER JOIN Students st ON a.StudentID = st.StudentID
//       INNER JOIN Schools s ON st.SchoolID = s.SchoolID
//       WHERE 1=1 
//       ${dateFilter}
//       ${schoolFilter}
//       ${gradeFilter}
//       ORDER BY a.ScanTime DESC, a.CreatedAt DESC
//       OPTION (MAXDOP 1)
//     `)

//     // Enhance attendance records with time settings
//     const enhancedAttendance = attendanceResult.recordset.map(record => {
//       const baseRecord = {
//         attendance_id: record.attendance_id,
//         student_id: record.student_id,
//         student_name: record.student_name,
//         grade: record.grade,
//         scan_time: record.scan_time,
//         status: record.status,
//         created_at: record.created_at,
//         school_name: record.school_name,
//         school_id: record.school_id
//       }

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

//     // OPTIMIZED: Lightweight summary query
//     const summaryResult = await request.query(`
//       SELECT 
//         COUNT(*) as total_records,
//         COUNT(CASE WHEN a.Status = 'IN' THEN 1 END) as check_ins,
//         COUNT(CASE WHEN a.Status = 'OUT' THEN 1 END) as check_outs,
//         COUNT(DISTINCT a.StudentID) as unique_students,
//         MIN(a.ScanTime) as earliest_scan,
//         MAX(a.ScanTime) as latest_scan
//       FROM Attendance a WITH (NOLOCK)
//       INNER JOIN Students st ON a.StudentID = st.StudentID
//       INNER JOIN Schools s ON st.SchoolID = s.SchoolID
//       WHERE 1=1 
//       ${dateFilter}
//       ${schoolFilter}
//       ${gradeFilter}
//       OPTION (MAXDOP 1)
//     `)

//     const summary = summaryResult.recordset[0]
//     const lateArrivals = enhancedAttendance.filter(r => r.statusType === 'late' && r.status === 'IN').length
//     const earlyArrivals = enhancedAttendance.filter(r => r.statusType === 'early-arrival' && r.status === 'IN').length
//     const onTimeArrivals = enhancedAttendance.filter(r => r.statusType === 'on-time' && r.status === 'IN').length
//     const earlyDepartures = enhancedAttendance.filter(r => r.statusType === 'early-departure' && r.status === 'OUT').length

//     const queryTime = Date.now() - startTime
//     console.log(`Real-time attendance completed in ${queryTime}ms`)

//     return {
//       current_activity: enhancedAttendance,
//       summary: {
//         total_records: summary.total_records || 0,
//         check_ins: summary.check_ins || 0,
//         check_outs: summary.check_outs || 0,
//         unique_students: summary.unique_students || 0,
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
//       schools_with_settings: Object.keys(timeSettingsMap).map(Number),
//       filters_applied: {
//         school_id: schoolId,
//         date_from: dateFrom,
//         date_to: dateTo,
//         grade: grade
//       }
//     }
//   } catch (error) {
//     console.error('Error in getRealTimeAttendanceOptimized:', error)
//     throw error
//   }
// }
async function getRealTimeAttendanceOptimized(schoolId, dateFrom, dateTo, grade = null) {
  const pool = await getPool()
  const startTime = Date.now()
  
  try {
    const request = pool.request()
    request.timeout = 45000 // 45 second timeout
    
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

    // FIXED: Proper grade parameter handling with correct data type and length
    let gradeFilter = ''
    if (grade && grade.trim() !== '') {
      // URL decode the grade value
      const decodedGrade = decodeURIComponent(grade.trim())
      console.log('Processing grade filter:', decodedGrade)
      
      // FIXED: Use NVarChar with sufficient length (50 characters) and proper validation
      if (decodedGrade.length <= 50) {
        gradeFilter = 'AND st.Grade = @grade'
        request.input('grade', sql.NVarChar(50), decodedGrade)
      } else {
        console.warn('Grade value too long, ignoring filter:', decodedGrade)
        // Don't add the filter if grade is too long
      }
    }

    // Get time settings (lightweight query) - keep existing code
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
    } catch (error) {
      console.warn('Failed to load time settings for analytics:', error.message)
    }

    // FIXED: Updated attendance query with better error handling
    console.log('Executing attendance query with filters:', { dateFilter, schoolFilter, gradeFilter })
    
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
      FROM Attendance a WITH (NOLOCK)
      INNER JOIN Students st ON a.StudentID = st.StudentID
      INNER JOIN Schools s ON st.SchoolID = s.SchoolID
      WHERE 1=1 
      ${dateFilter}
      ${schoolFilter}
      ${gradeFilter}
      ORDER BY a.ScanTime DESC, a.CreatedAt DESC
      OPTION (MAXDOP 1)
    `)

    // Rest of the function remains the same...
    // Enhance attendance records with time settings
    const enhancedAttendance = attendanceResult.recordset.map(record => {
      const baseRecord = {
        attendance_id: record.attendance_id,
        student_id: record.student_id,
        student_name: record.student_name,
        grade: record.grade,
        scan_time: record.scan_time,
        status: record.status,
        created_at: record.created_at,
        school_name: record.school_name,
        school_id: record.school_id
      }

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

    // FIXED: Updated summary query with same parameter handling
    const summaryResult = await request.query(`
      SELECT 
        COUNT(*) as total_records,
        COUNT(CASE WHEN a.Status = 'IN' THEN 1 END) as check_ins,
        COUNT(CASE WHEN a.Status = 'OUT' THEN 1 END) as check_outs,
        COUNT(DISTINCT a.StudentID) as unique_students,
        MIN(a.ScanTime) as earliest_scan,
        MAX(a.ScanTime) as latest_scan
      FROM Attendance a WITH (NOLOCK)
      INNER JOIN Students st ON a.StudentID = st.StudentID
      INNER JOIN Schools s ON st.SchoolID = s.SchoolID
      WHERE 1=1 
      ${dateFilter}
      ${schoolFilter}
      ${gradeFilter}
      OPTION (MAXDOP 1)
    `)

    const summary = summaryResult.recordset[0]
    const lateArrivals = enhancedAttendance.filter(r => r.statusType === 'late' && r.status === 'IN').length
    const earlyArrivals = enhancedAttendance.filter(r => r.statusType === 'early-arrival' && r.status === 'IN').length
    const onTimeArrivals = enhancedAttendance.filter(r => r.statusType === 'on-time' && r.status === 'IN').length
    const earlyDepartures = enhancedAttendance.filter(r => r.statusType === 'early-departure' && r.status === 'OUT').length

    const queryTime = Date.now() - startTime
    console.log(`Real-time attendance completed in ${queryTime}ms`)

    return {
      current_activity: enhancedAttendance,
      summary: {
        total_records: summary.total_records || 0,
        check_ins: summary.check_ins || 0,
        check_outs: summary.check_outs || 0,
        unique_students: summary.unique_students || 0,
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
        grade: grade ? decodeURIComponent(grade) : null
      }
    }
  } catch (error) {
    console.error('Error in getRealTimeAttendanceOptimized:', error)
    throw error
  }
}

// ADDITIONAL FIX: Also update the loadAvailableGrades function if it has similar issues
async function loadAvailableGradesFixed(user) {
  try {
    const schoolId = user?.school_id || user?.SchoolID
    if (!schoolId) return []

    const pool = await getPool()
    const request = pool.request()
    request.input('schoolId', sql.Int, parseInt(schoolId))
    
    // FIXED: Ensure Grade column can handle longer values
    const response = await request.query(`
      SELECT DISTINCT st.Grade
      FROM Students st 
      WHERE st.SchoolID = @schoolId 
      AND st.Grade IS NOT NULL 
      AND st.Grade != ''
      AND st.IsActive = 1
      ORDER BY st.Grade
    `)
    
    return response.recordset.map(row => row.Grade)
  } catch (error) {
    console.error('Error loading grades:', error)
    return []
  }
}

// OPTIMIZED: Schools analytics with connection pooling
async function getSchoolAnalyticsOptimized() {
  const pool = await getPool()
  const startTime = Date.now()
  
  try {
    const request = pool.request()
    request.timeout = 30000

    const schoolsResult = await request.query(`
      SELECT 
        s.SchoolID,
        s.Name as SchoolName,
        ISNULL(s.Location, 'Not specified') as Location,
        ISNULL(s.Status, 'active') as SchoolStatus,
        COUNT(DISTINCT st.StudentID) as TotalStudents,
        COUNT(DISTINCT CASE WHEN st.IsActive = 1 THEN st.StudentID END) as ActiveStudents,
        -- OPTIMIZED: Limit attendance aggregation
        COUNT(CASE WHEN a.ScanTime >= DATEADD(DAY, -30, GETDATE()) THEN a.AttendanceID END) as RecentAttendance,
        COUNT(CASE WHEN CAST(a.ScanTime as DATE) = CAST(GETDATE() as DATE) THEN a.AttendanceID END) as TodayAttendance,
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
      LEFT JOIN (
        -- OPTIMIZED: Limit attendance data to recent records only
        SELECT StudentID, ScanTime, CreatedAt, AttendanceID
        FROM Attendance WITH (NOLOCK)
        WHERE ScanTime >= DATEADD(DAY, -30, GETDATE())
      ) a ON st.StudentID = a.StudentID
      LEFT JOIN SyncAgentStatus sas ON s.SchoolID = sas.SchoolID
      GROUP BY s.SchoolID, s.Name, s.Location, s.Status, sas.Status, sas.LastHeartbeat, sas.TotalSynced, sas.TotalErrors
      ORDER BY s.Name
      OPTION (MAXDOP 1)
    `)

    const queryTime = Date.now() - startTime
    console.log(`Schools analytics completed in ${queryTime}ms`)

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
          total: row.RecentAttendance || 0,
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
    console.error('Error in getSchoolAnalyticsOptimized:', error)
    throw error
  }
}

// Enhanced function to calculate attendance status
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
  const scanTimeOnly = scanDateTime.toTimeString().substr(0, 5)
  
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
    if (scanTimeOnly <= school_start_time) {
      statusType = 'early-arrival'
      statusLabel = 'Early Arrival'
      message = `Arrived early at ${scanTimeOnly}`
    } else if (scanTimeOnly <= late_arrival_time) {
      statusType = 'on-time'
      statusLabel = 'On Time'
      message = `Arrived on time at ${scanTimeOnly}`
    } else {
      statusType = 'late'
      statusLabel = 'Late Arrival'
      message = `Arrived late at ${scanTimeOnly} (after ${late_arrival_time})`
    }
  } else if (status === 'OUT') {
    if (scanTimeOnly < early_departure_time) {
      statusType = 'early-departure'
      statusLabel = 'Early Departure'
      message = `Left early at ${scanTimeOnly} (before ${early_departure_time})`
    } else if (scanTimeOnly < school_end_time) {
      statusType = 'normal-departure'
      statusLabel = 'Normal Departure'
      message = `Left at ${scanTimeOnly}`
    } else {
      statusType = 'after-hours'
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

// Keep your existing functions for other analytics types (these are lightweight)
async function getAttendanceAnalytics(schoolId, dateFrom, dateTo, granularity) {
  const pool = await getPool()
  const request = pool.request()
  request.timeout = 30000
  
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
      LEFT JOIN Attendance a WITH (NOLOCK) ON st.StudentID = a.StudentID 
        AND a.ScanTime BETWEEN @startDate AND @endDate
      WHERE 1=1 ${schoolFilter}
      GROUP BY s.SchoolID, s.Name, s.Location
      ORDER BY AttendanceCount DESC
      OPTION (MAXDOP 1)
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

async function getSyncPerformanceAnalytics(schoolId) {
  const pool = await getPool()
  const request = pool.request()
  request.timeout = 15000
  
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
      OPTION (MAXDOP 1)
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

// Lightweight placeholder functions (these don't need optimization - they return minimal data)
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