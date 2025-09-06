// // pages/api/analytics.js - Analytics API for School System
// const { getPool, sql } = require('../../lib/database')

// export default async function handler(req, res) {
//   res.setHeader('Access-Control-Allow-Origin', '*')
//   res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
//   res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

//   if (req.method === 'OPTIONS') {
//     res.status(200).end()
//     return
//   }

//   if (req.method !== 'GET') {
//     return res.status(405).json({ error: 'Method not allowed' })
//   }

//   try {
//     const { 
//       type, 
//       school_id, 
//       company_id, 
//       date_from, 
//       date_to,
//       granularity = 'daily' // daily, weekly, monthly
//     } = req.query

//     let result
//     switch (type) {
//       case 'overview':
//         result = await getOverviewAnalytics(school_id, company_id)
//         break
//       case 'attendance':
//         result = await getAttendanceAnalytics(school_id, company_id, date_from, date_to, granularity)
//         break
//       case 'students':
//         result = await getStudentAnalytics(school_id, company_id)
//         break
//       case 'schools':
//         result = await getSchoolAnalytics(company_id)
//         break
//       case 'sync-performance':
//         result = await getSyncPerformanceAnalytics(school_id, company_id)
//         break
//       case 'trends':
//         result = await getTrendAnalytics(school_id, company_id, date_from, date_to)
//         break
//       case 'real-time':
//         result = await getRealTimeAnalytics(school_id, company_id)
//         break
//       default:
//         return res.status(400).json({ 
//           error: 'Invalid analytics type', 
//           available_types: ['overview', 'attendance', 'students', 'schools', 'sync-performance', 'trends', 'real-time']
//         })
//     }

//     res.json({
//       success: true,
//       type: type,
//       filters: {
//         school_id: school_id,
//         company_id: company_id,
//         date_from: date_from,
//         date_to: date_to,
//         granularity: granularity
//       },
//       ...result,
//       timestamp: new Date().toISOString()
//     })

//   } catch (error) {
//     console.error('Analytics API error:', error)
//     res.status(500).json({
//       error: error.message,
//       timestamp: new Date().toISOString()
//     })
//   }
// }

// async function getOverviewAnalytics(schoolId, companyId) {
//   const pool = await getPool()
//   const request = pool.request()
  
//   let schoolFilter = ''
//   if (schoolId) {
//     schoolFilter = 'AND s.SchoolID = @schoolId'
//     request.input('schoolId', sql.Int, parseInt(schoolId))
//   }
//   if (companyId) {
//     schoolFilter += ' AND s.CompanyID = @companyId'
//     request.input('companyId', sql.Int, parseInt(companyId))
//   }

//   const result = await request.query(`
//     SELECT 
//       -- School metrics
//       COUNT(DISTINCT s.SchoolID) as TotalSchools,
//       COUNT(DISTINCT CASE WHEN s.Status = 'Active' THEN s.SchoolID END) as ActiveSchools,
      
//       -- Student metrics
//       COUNT(DISTINCT st.StudentID) as TotalStudents,
//       COUNT(DISTINCT CASE WHEN st.IsActive = 1 THEN st.StudentID END) as ActiveStudents,
      
//       -- Attendance metrics
//       COUNT(DISTINCT CASE WHEN CAST(a.CreatedAt as DATE) = CAST(GETDATE() as DATE) THEN a.AttendanceID END) as TodayAttendance,
//       COUNT(DISTINCT CASE WHEN a.CreatedAt > DATEADD(day, -7, GETDATE()) THEN a.AttendanceID END) as WeekAttendance,
//       COUNT(DISTINCT CASE WHEN a.CreatedAt > DATEADD(day, -30, GETDATE()) THEN a.AttendanceID END) as MonthAttendance,
//       COUNT(DISTINCT a.AttendanceID) as TotalAttendance,
      
//       -- Sync agent metrics
//       COUNT(DISTINCT sas.SchoolID) as TotalSyncAgents,
//       COUNT(DISTINCT CASE WHEN sas.LastHeartbeat > DATEADD(MINUTE, -10, GETDATE()) THEN sas.SchoolID END) as OnlineSyncAgents,
      
//       -- Average metrics
//       AVG(CAST(sas.UptimeHours as FLOAT)) as AvgUptimeHours,
//       AVG(CAST(sas.MemoryUsageMB as FLOAT)) as AvgMemoryUsageMB,
      
//       -- Error rates
//       SUM(sas.TotalErrors) as TotalSyncErrors,
//       SUM(sas.TotalSynced) as TotalSyncedRecords
      
//     FROM Schools s
//     LEFT JOIN Students st ON s.SchoolID = st.SchoolID
//     LEFT JOIN dbo.Attendance a ON st.StudentID = a.StudentID
//     LEFT JOIN SyncAgentStatus sas ON s.SchoolID = sas.SchoolID
//     WHERE 1=1 ${schoolFilter}
//   `)

//   const overview = result.recordset[0]
  
//   return {
//     agents: agents,
//     performance_metrics: {
//       total_agents: agents.length,
//       online_agents: agents.filter(a => a.connection_status === 'Online').length,
//       avg_error_rate: agents.length > 0 ? 
//         Math.round(agents.reduce((sum, a) => sum + a.error_rate, 0) / agents.length * 100) / 100 : 0,
//       avg_syncs_per_hour: agents.length > 0 ? 
//         Math.round(agents.reduce((sum, a) => sum + a.syncs_per_hour, 0) / agents.length * 100) / 100 : 0,
//       total_synced: agents.reduce((sum, a) => sum + a.total_synced, 0),
//       total_errors: agents.reduce((sum, a) => sum + a.total_errors, 0),
//       avg_uptime_hours: agents.length > 0 ? 
//         Math.round(agents.reduce((sum, a) => sum + a.uptime_hours, 0) / agents.length * 100) / 100 : 0
//     },
//     health_distribution: {
//       excellent: agents.filter(a => a.health_score >= 90).length,
//       good: agents.filter(a => a.health_score >= 70 && a.health_score < 90).length,
//       fair: agents.filter(a => a.health_score >= 50 && a.health_score < 70).length,
//       poor: agents.filter(a => a.health_score < 50).length
//     }
//   }
// }

// function calculateHealthScore(agent) {
//   let score = 100
  
//   // Connection status impact
//   if (agent.ConnectionStatus === 'Offline') score -= 50
//   else if (agent.ConnectionStatus === 'Warning') score -= 20
//   else if (agent.ConnectionStatus === 'Never Connected') score -= 70
  
//   // Error rate impact
//   const errorRate = agent.ErrorRate || 0
//   if (errorRate > 10) score -= 30
//   else if (errorRate > 5) score -= 15
//   else if (errorRate > 1) score -= 5
  
//   // Memory usage impact (assuming over 1GB is concerning)
//   const memoryMB = agent.MemoryUsageMB || 0
//   if (memoryMB > 1024) score -= 10
//   else if (memoryMB > 512) score -= 5
  
//   return Math.max(0, Math.min(100, score))
// }

// async function getTrendAnalytics(schoolId, companyId, dateFrom, dateTo) {
//   const pool = await getPool()
//   const request = pool.request()
  
//   const endDate = dateTo ? new Date(dateTo) : new Date()
//   const startDate = dateFrom ? new Date(dateFrom) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7 days ago
  
//   request.input('startDate', sql.DateTime2, startDate)
//   request.input('endDate', sql.DateTime2, endDate)
  
//   let schoolFilter = ''
//   if (schoolId) {
//     schoolFilter = 'AND s.SchoolID = @schoolId'
//     request.input('schoolId', sql.Int, parseInt(schoolId))
//   }
//   if (companyId) {
//     schoolFilter += ' AND s.CompanyID = @companyId'
//     request.input('companyId', sql.Int, parseInt(companyId))
//   }

//   // Daily attendance trends
//   const dailyTrendsResult = await request.query(`
//     SELECT 
//       CAST(a.CreatedAt as DATE) as AttendanceDate,
//       COUNT(*) as DailyAttendance,
//       COUNT(DISTINCT a.StudentID) as UniqueStudents,
//       COUNT(DISTINCT s.SchoolID) as ActiveSchools,
//       AVG(CAST(COUNT(*) as FLOAT)) OVER (
//         ORDER BY CAST(a.CreatedAt as DATE) 
//         ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
//       ) as SevenDayAverage
//     FROM dbo.Attendance a
//     JOIN Students st ON a.StudentID = st.StudentID
//     JOIN Schools s ON st.SchoolID = s.SchoolID
//     WHERE a.CreatedAt BETWEEN @startDate AND @endDate ${schoolFilter}
//     GROUP BY CAST(a.CreatedAt as DATE)
//     ORDER BY AttendanceDate
//   `)

//   // Hourly patterns
//   const hourlyPatternsResult = await request.query(`
//     SELECT 
//       DATEPART(hour, a.CreatedAt) as Hour,
//       COUNT(*) as AttendanceCount,
//       AVG(CAST(COUNT(*) as FLOAT)) OVER () as AvgHourlyAttendance
//     FROM dbo.Attendance a
//     JOIN Students st ON a.StudentID = st.StudentID
//     JOIN Schools s ON st.SchoolID = s.SchoolID
//     WHERE a.CreatedAt BETWEEN @startDate AND @endDate ${schoolFilter}
//     GROUP BY DATEPART(hour, a.CreatedAt)
//     ORDER BY Hour
//   `)

//   // Calculate trends
//   const dailyData = dailyTrendsResult.recordset
//   const trend = calculateTrend(dailyData.map(d => d.DailyAttendance))

//   return {
//     date_range: {
//       from: startDate.toISOString(),
//       to: endDate.toISOString()
//     },
//     daily_trends: dailyData.map(row => ({
//       date: row.AttendanceDate,
//       attendance: row.DailyAttendance || 0,
//       unique_students: row.UniqueStudents || 0,
//       active_schools: row.ActiveSchools || 0,
//       seven_day_average: Math.round((row.SevenDayAverage || 0) * 100) / 100
//     })),
//     hourly_patterns: hourlyPatternsResult.recordset.map(row => ({
//       hour: row.Hour,
//       attendance_count: row.AttendanceCount || 0,
//       vs_average: row.AvgHourlyAttendance ? 
//         Math.round(((row.AttendanceCount / row.AvgHourlyAttendance) * 100) - 100) : 0
//     })),
//     trend_analysis: {
//       overall_trend: trend.direction,
//       trend_percentage: trend.percentage,
//       peak_day: dailyData.length > 0 ? 
//         dailyData.reduce((max, day) => day.DailyAttendance > max.DailyAttendance ? day : max) : null,
//       peak_hour: hourlyPatternsResult.recordset.length > 0 ? 
//         hourlyPatternsResult.recordset.reduce((max, hour) => hour.AttendanceCount > max.AttendanceCount ? hour : max) : null
//     }
//   }
// }

// function calculateTrend(values) {
//   if (values.length < 2) return { direction: 'insufficient_data', percentage: 0 }
  
//   const firstHalf = values.slice(0, Math.floor(values.length / 2))
//   const secondHalf = values.slice(Math.ceil(values.length / 2))
  
//   const firstAvg = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length
//   const secondAvg = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length
  
//   const percentageChange = firstAvg > 0 ? ((secondAvg - firstAvg) / firstAvg) * 100 : 0
  
//   let direction = 'stable'
//   if (Math.abs(percentageChange) > 5) {
//     direction = percentageChange > 0 ? 'increasing' : 'decreasing'
//   }
  
//   return {
//     direction: direction,
//     percentage: Math.round(percentageChange * 100) / 100
//   }
// }

// async function getRealTimeAnalytics(schoolId, companyId) {
//   const pool = await getPool()
//   const request = pool.request()
  
//   let schoolFilter = ''
//   if (schoolId) {
//     schoolFilter = 'AND s.SchoolID = @schoolId'
//     request.input('schoolId', sql.Int, parseInt(schoolId))
//   }
//   if (companyId) {
//     schoolFilter += ' AND s.CompanyID = @companyId'
//     request.input('companyId', sql.Int, parseInt(companyId))
//   }

//   // Current day statistics
//   const todayStatsResult = await request.query(`
//     SELECT 
//       COUNT(*) as TodayAttendance,
//       COUNT(DISTINCT a.StudentID) as TodayUniqueStudents,
//       COUNT(DISTINCT s.SchoolID) as TodayActiveSchools,
//       MAX(a.CreatedAt) as LastAttendanceTime,
//       COUNT(CASE WHEN a.CreatedAt > DATEADD(HOUR, -1, GETDATE()) THEN 1 END) as LastHourAttendance,
//       COUNT(CASE WHEN a.CreatedAt > DATEADD(MINUTE, -10, GETDATE()) THEN 1 END) as Last10MinAttendance
//     FROM dbo.Attendance a
//     JOIN Students st ON a.StudentID = st.StudentID
//     JOIN Schools s ON st.SchoolID = s.SchoolID
//     WHERE CAST(a.CreatedAt as DATE) = CAST(GETDATE() as DATE) ${schoolFilter}
//   `)

//   // Recent activity
//   const recentActivityResult = await request.query(`
//     SELECT TOP 20
//       a.AttendanceID,
//       a.StudentID,
//       st.Name as StudentName,
//       s.SchoolID,
//       s.Name as SchoolName,
//       a.ScanTime,
//       a.Status,
//       a.CreatedAt,
//       DATEDIFF(MINUTE, a.CreatedAt, GETDATE()) as MinutesAgo
//     FROM dbo.Attendance a
//     JOIN Students st ON a.StudentID = st.StudentID
//     JOIN Schools s ON st.SchoolID = s.SchoolID
//     WHERE a.CreatedAt > DATEADD(HOUR, -2, GETDATE()) ${schoolFilter}
//     ORDER BY a.CreatedAt DESC
//   `)

//   // Sync agent status
//   const syncStatusResult = await request.query(`
//     SELECT 
//       COUNT(*) as TotalAgents,
//       COUNT(CASE WHEN sas.LastHeartbeat > DATEADD(MINUTE, -5, GETDATE()) THEN 1 END) as OnlineAgents,
//       COUNT(CASE WHEN sas.LastHeartbeat BETWEEN DATEADD(MINUTE, -10, GETDATE()) AND DATEADD(MINUTE, -5, GETDATE()) THEN 1 END) as WarningAgents,
//       AVG(CAST(sas.MemoryUsageMB as FLOAT)) as AvgMemoryUsage,
//       SUM(sas.TotalSynced) as TotalSyncedToday,
//       SUM(sas.TotalErrors) as TotalErrorsToday
//     FROM SyncAgentStatus sas
//     JOIN Schools s ON sas.SchoolID = s.SchoolID
//     WHERE 1=1 ${schoolFilter}
//   `)

//   const todayStats = todayStatsResult.recordset[0]
//   const syncStats = syncStatusResult.recordset[0]

//   return {
//     current_status: {
//       today_attendance: todayStats.TodayAttendance || 0,
//       unique_students: todayStats.TodayUniqueStudents || 0,
//       active_schools: todayStats.TodayActiveSchools || 0,
//       last_attendance: todayStats.LastAttendanceTime,
//       last_hour_attendance: todayStats.LastHourAttendance || 0,
//       last_10min_attendance: todayStats.Last10MinAttendance || 0
//     },
//     recent_activity: recentActivityResult.recordset.map(row => ({
//       attendance_id: row.AttendanceID,
//       student_id: row.StudentID,
//       student_name: row.StudentName,
//       school_id: row.SchoolID,
//       school_name: row.SchoolName,
//       scan_time: row.ScanTime,
//       status: row.Status,
//       created_at: row.CreatedAt,
//       minutes_ago: row.MinutesAgo
//     })),
//     sync_health: {
//       total_agents: syncStats.TotalAgents || 0,
//       online_agents: syncStats.OnlineAgents || 0,
//       warning_agents: syncStats.WarningAgents || 0,
//       offline_agents: (syncStats.TotalAgents || 0) - (syncStats.OnlineAgents || 0) - (syncStats.WarningAgents || 0),
//       avg_memory_usage_mb: Math.round((syncStats.AvgMemoryUsage || 0) * 100) / 100,
//       total_synced_today: syncStats.TotalSyncedToday || 0,
//       total_errors_today: syncStats.TotalErrorsToday || 0,
//       health_percentage: syncStats.TotalAgents > 0 ? 
//         Math.round((syncStats.OnlineAgents / syncStats.TotalAgents) * 100) : 0
//     },
//     alerts: generateAlerts(todayStats, syncStats)
//   }
// }

// function generateAlerts(todayStats, syncStats) {
//   const alerts = []
  
//   // Low attendance alert
//   if ((todayStats.Last10MinAttendance || 0) === 0 && new Date().getHours() >= 7 && new Date().getHours() <= 17) {
//     alerts.push({
//       level: 'warning',
//       message: 'No attendance recorded in the last 10 minutes during school hours',
//       category: 'attendance'
//     })
//   }
  
//   // Sync agent alerts
//   const totalAgents = syncStats.TotalAgents || 0
//   const onlineAgents = syncStats.OnlineAgents || 0
  
//   if (totalAgents > 0) {
//     const offlinePercentage = ((totalAgents - onlineAgents) / totalAgents) * 100
    
//     if (offlinePercentage > 50) {
//       alerts.push({
//         level: 'critical',
//         message: `${Math.round(offlinePercentage)}% of sync agents are offline`,
//         category: 'sync'
//       })
//     } else if (offlinePercentage > 20) {
//       alerts.push({
//         level: 'warning',
//         message: `${Math.round(offlinePercentage)}% of sync agents are offline`,
//         category: 'sync'
//       })
//     }
//   }
  
//   // Error rate alert
//   const totalSynced = syncStats.TotalSyncedToday || 0
//   const totalErrors = syncStats.TotalErrorsToday || 0
  
//   if (totalSynced + totalErrors > 0) {
//     const errorRate = (totalErrors / (totalSynced + totalErrors)) * 100
    
//     if (errorRate > 10) {
//       alerts.push({
//         level: 'critical',
//         message: `High sync error rate: ${Math.round(errorRate)}%`,
//         category: 'sync'
//       })
//     } else if (errorRate > 5) {
//       alerts.push({
//         level: 'warning',
//         message: `Elevated sync error rate: ${Math.round(errorRate)}%`,
//         category: 'sync'
//       })
//     }
//   }
  
//   return alerts
// }

// // Additional helper functions for analytics

// async function getAttendanceHeatmap(schoolId, companyId, dateFrom, dateTo) {
//   const pool = await getPool()
//   const request = pool.request()
  
//   const endDate = dateTo ? new Date(dateTo) : new Date()
//   const startDate = dateFrom ? new Date(dateFrom) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  
//   request.input('startDate', sql.DateTime2, startDate)
//   request.input('endDate', sql.DateTime2, endDate)
  
//   let schoolFilter = ''
//   if (schoolId) {
//     schoolFilter = 'AND s.SchoolID = @schoolId'
//     request.input('schoolId', sql.Int, parseInt(schoolId))
//   }
//   if (companyId) {
//     schoolFilter += ' AND s.CompanyID = @companyId'
//     request.input('companyId', sql.Int, parseInt(companyId))
//   }

//   const heatmapResult = await request.query(`
//     SELECT 
//       DATEPART(hour, a.CreatedAt) as Hour,
//       DATEPART(weekday, a.CreatedAt) as DayOfWeek,
//       COUNT(*) as AttendanceCount
//     FROM dbo.Attendance a
//     JOIN Students st ON a.StudentID = st.StudentID
//     JOIN Schools s ON st.SchoolID = s.SchoolID
//     WHERE a.CreatedAt BETWEEN @startDate AND @endDate ${schoolFilter}
//     GROUP BY DATEPART(hour, a.CreatedAt), DATEPART(weekday, a.CreatedAt)
//     ORDER BY DayOfWeek, Hour
//   `)

//   return heatmapResult.recordset.map(row => ({
//     hour: row.Hour,
//     day_of_week: row.DayOfWeek, // 1=Sunday, 2=Monday, etc.
//     attendance_count: row.AttendanceCount || 0
//   }))
// }

// async function getStudentEngagementMetrics(schoolId, companyId) {
//   const pool = await getPool()
//   const request = pool.request()
  
//   let schoolFilter = ''
//   if (schoolId) {
//     schoolFilter = 'AND s.SchoolID = @schoolId'
//     request.input('schoolId', sql.Int, parseInt(schoolId))
//   }
//   if (companyId) {
//     schoolFilter += ' AND s.CompanyID = @companyId'
//     request.input('companyId', sql.Int, parseInt(companyId))
//   }

//   const engagementResult = await request.query(`
//     SELECT 
//       st.StudentID,
//       st.Name as StudentName,
//       s.Name as SchoolName,
//       st.Grade,
//       COUNT(a.AttendanceID) as TotalAttendance,
//       COUNT(DISTINCT CAST(a.CreatedAt as DATE)) as DaysAttended,
//       MAX(a.CreatedAt) as LastAttendance,
//       MIN(a.CreatedAt) as FirstAttendance,
//       DATEDIFF(DAY, MIN(a.CreatedAt), MAX(a.CreatedAt)) + 1 as AttendancePeriodDays,
//       CASE 
//         WHEN DATEDIFF(DAY, MIN(a.CreatedAt), MAX(a.CreatedAt)) + 1 > 0
//         THEN CAST(COUNT(DISTINCT CAST(a.CreatedAt as DATE)) as FLOAT) / (DATEDIFF(DAY, MIN(a.CreatedAt), MAX(a.CreatedAt)) + 1) * 100
//         ELSE 0
//       END as AttendanceRate,
//       CASE 
//         WHEN COUNT(a.AttendanceID) = 0 THEN 'No Activity'
//         WHEN COUNT(DISTINCT CAST(a.CreatedAt as DATE)) >= 20 THEN 'Highly Engaged'
//         WHEN COUNT(DISTINCT CAST(a.CreatedAt as DATE)) >= 10 THEN 'Moderately Engaged'
//         WHEN COUNT(DISTINCT CAST(a.CreatedAt as DATE)) >= 5 THEN 'Low Engagement'
//         ELSE 'Very Low Engagement'
//       END as EngagementLevel
//     FROM Students st
//     JOIN Schools s ON st.SchoolID = s.SchoolID
//     LEFT JOIN dbo.Attendance a ON st.StudentID = a.StudentID AND a.CreatedAt > DATEADD(DAY, -30, GETDATE())
//     WHERE st.IsActive = 1 ${schoolFilter}
//     GROUP BY st.StudentID, st.Name, s.Name, st.Grade
//     ORDER BY TotalAttendance DESC, AttendanceRate DESC
//   `)

//   return {
//     student_engagement: engagementResult.recordset.map(row => ({
//       student_id: row.StudentID,
//       name: row.StudentName,
//       school: row.SchoolName,
//       grade: row.Grade,
//       total_attendance: row.TotalAttendance || 0,
//       days_attended: row.DaysAttended || 0,
//       attendance_rate: Math.round((row.AttendanceRate || 0) * 100) / 100,
//       engagement_level: row.EngagementLevel,
//       last_attendance: row.LastAttendance,
//       first_attendance: row.FirstAttendance
//     })),
//     engagement_summary: {
//       highly_engaged: engagementResult.recordset.filter(r => r.EngagementLevel === 'Highly Engaged').length,
//       moderately_engaged: engagementResult.recordset.filter(r => r.EngagementLevel === 'Moderately Engaged').length,
//       low_engagement: engagementResult.recordset.filter(r => r.EngagementLevel === 'Low Engagement').length,
//       very_low_engagement: engagementResult.recordset.filter(r => r.EngagementLevel === 'Very Low Engagement').length,
//       no_activity: engagementResult.recordset.filter(r => r.EngagementLevel === 'No Activity').length
//     }
//   }
// }

// async function getComparisonAnalytics(schoolId, companyId, compareWith = 'peer_average') {
//   const pool = await getPool()
//   const request = pool.request()
  
//   if (schoolId) {
//     request.input('schoolId', sql.Int, parseInt(schoolId))
//   }
//   if (companyId) {
//     request.input('companyId', sql.Int, parseInt(companyId))
//   }

//   // Get current school/company metrics
//   const currentMetricsQuery = schoolId ? `
//     SELECT 
//       s.SchoolID,
//       s.Name as SchoolName,
//       COUNT(DISTINCT st.StudentID) as TotalStudents,
//       COUNT(DISTINCT CASE WHEN st.IsActive = 1 THEN st.StudentID END) as ActiveStudents,
//       COUNT(a.AttendanceID) as TotalAttendance,
//       COUNT(CASE WHEN a.CreatedAt > DATEADD(day, -30, GETDATE()) THEN a.AttendanceID END) as MonthAttendance,
//       COUNT(CASE WHEN CAST(a.CreatedAt as DATE) = CAST(GETDATE() as DATE) THEN a.AttendanceID END) as TodayAttendance,
//       CASE 
//         WHEN COUNT(DISTINCT st.StudentID) > 0 
//         THEN CAST(COUNT(a.AttendanceID) as FLOAT) / COUNT(DISTINCT st.StudentID)
//         ELSE 0 
//       END as AttendancePerStudent
//     FROM Schools s
//     LEFT JOIN Students st ON s.SchoolID = st.SchoolID
//     LEFT JOIN dbo.Attendance a ON st.StudentID = a.StudentID
//     WHERE s.SchoolID = @schoolId
//     GROUP BY s.SchoolID, s.Name
//   ` : `
//     SELECT 
//       c.CompanyID,
//       c.Name as CompanyName,
//       COUNT(DISTINCT s.SchoolID) as TotalSchools,
//       COUNT(DISTINCT st.StudentID) as TotalStudents,
//       COUNT(DISTINCT CASE WHEN st.IsActive = 1 THEN st.StudentID END) as ActiveStudents,
//       COUNT(a.AttendanceID) as TotalAttendance,
//       COUNT(CASE WHEN a.CreatedAt > DATEADD(day, -30, GETDATE()) THEN a.AttendanceID END) as MonthAttendance,
//       COUNT(CASE WHEN CAST(a.CreatedAt as DATE) = CAST(GETDATE() as DATE) THEN a.AttendanceID END) as TodayAttendance,
//       CASE 
//         WHEN COUNT(DISTINCT st.StudentID) > 0 
//         THEN CAST(COUNT(a.AttendanceID) as FLOAT) / COUNT(DISTINCT st.StudentID)
//         ELSE 0 
//       END as AttendancePerStudent
//     FROM Companies c
//     LEFT JOIN Schools s ON c.CompanyID = s.CompanyID
//     LEFT JOIN Students st ON s.SchoolID = st.SchoolID
//     LEFT JOIN dbo.Attendance a ON st.StudentID = a.StudentID
//     WHERE c.CompanyID = @companyId
//     GROUP BY c.CompanyID, c.Name
//   `

//   const currentResult = await request.query(currentMetricsQuery)
//   const currentMetrics = currentResult.recordset[0]

//   // Get peer averages
//   const peerAveragesQuery = schoolId ? `
//     SELECT 
//       AVG(CAST(SchoolMetrics.TotalStudents as FLOAT)) as AvgTotalStudents,
//       AVG(CAST(SchoolMetrics.ActiveStudents as FLOAT)) as AvgActiveStudents,
//       AVG(CAST(SchoolMetrics.TotalAttendance as FLOAT)) as AvgTotalAttendance,
//       AVG(CAST(SchoolMetrics.MonthAttendance as FLOAT)) as AvgMonthAttendance,
//       AVG(CAST(SchoolMetrics.AttendancePerStudent as FLOAT)) as AvgAttendancePerStudent
//     FROM (
//       SELECT 
//         s.SchoolID,
//         COUNT(DISTINCT st.StudentID) as TotalStudents,
//         COUNT(DISTINCT CASE WHEN st.IsActive = 1 THEN st.StudentID END) as ActiveStudents,
//         COUNT(a.AttendanceID) as TotalAttendance,
//         COUNT(CASE WHEN a.CreatedAt > DATEADD(day, -30, GETDATE()) THEN a.AttendanceID END) as MonthAttendance,
//         CASE 
//           WHEN COUNT(DISTINCT st.StudentID) > 0 
//           THEN CAST(COUNT(a.AttendanceID) as FLOAT) / COUNT(DISTINCT st.StudentID)
//           ELSE 0 
//         END as AttendancePerStudent
//       FROM Schools s
//       LEFT JOIN Students st ON s.SchoolID = st.SchoolID
//       LEFT JOIN dbo.Attendance a ON st.StudentID = a.StudentID
//       WHERE s.SchoolID != @schoolId
//       GROUP BY s.SchoolID
//     ) as SchoolMetrics
//   ` : `
//     SELECT 
//       AVG(CAST(CompanyMetrics.TotalSchools as FLOAT)) as AvgTotalSchools,
//       AVG(CAST(CompanyMetrics.TotalStudents as FLOAT)) as AvgTotalStudents,
//       AVG(CAST(CompanyMetrics.ActiveStudents as FLOAT)) as AvgActiveStudents,
//       AVG(CAST(CompanyMetrics.TotalAttendance as FLOAT)) as AvgTotalAttendance,
//       AVG(CAST(CompanyMetrics.AttendancePerStudent as FLOAT)) as AvgAttendancePerStudent
//     FROM (
//       SELECT 
//         c.CompanyID,
//         COUNT(DISTINCT s.SchoolID) as TotalSchools,
//         COUNT(DISTINCT st.StudentID) as TotalStudents,
//         COUNT(DISTINCT CASE WHEN st.IsActive = 1 THEN st.StudentID END) as ActiveStudents,
//         COUNT(a.AttendanceID) as TotalAttendance,
//         CASE 
//           WHEN COUNT(DISTINCT st.StudentID) > 0 
//           THEN CAST(COUNT(a.AttendanceID) as FLOAT) / COUNT(DISTINCT st.StudentID)
//           ELSE 0 
//         END as AttendancePerStudent
//       FROM Companies c
//       LEFT JOIN Schools s ON c.CompanyID = s.CompanyID
//       LEFT JOIN Students st ON s.SchoolID = st.SchoolID
//       LEFT JOIN dbo.Attendance a ON st.StudentID = a.StudentID
//       WHERE c.CompanyID != @companyId
//       GROUP BY c.CompanyID
//     ) as CompanyMetrics
//   `

//   const peerResult = await request.query(peerAveragesQuery)
//   const peerAverages = peerResult.recordset[0]

//   return {
//     current_entity: schoolId ? {
//       school_id: currentMetrics.SchoolID,
//       school_name: currentMetrics.SchoolName,
//       metrics: {
//         total_students: currentMetrics.TotalStudents || 0,
//         active_students: currentMetrics.ActiveStudents || 0,
//         total_attendance: currentMetrics.TotalAttendance || 0,
//         month_attendance: currentMetrics.MonthAttendance || 0,
//         today_attendance: currentMetrics.TodayAttendance || 0,
//         attendance_per_student: Math.round((currentMetrics.AttendancePerStudent || 0) * 100) / 100
//       }
//     } : {
//       company_id: currentMetrics.CompanyID,
//       company_name: currentMetrics.CompanyName,
//       metrics: {
//         total_schools: currentMetrics.TotalSchools || 0,
//         total_students: currentMetrics.TotalStudents || 0,
//         active_students: currentMetrics.ActiveStudents || 0,
//         total_attendance: currentMetrics.TotalAttendance || 0,
//         month_attendance: currentMetrics.MonthAttendance || 0,
//         today_attendance: currentMetrics.TodayAttendance || 0,
//         attendance_per_student: Math.round((currentMetrics.AttendancePerStudent || 0) * 100) / 100
//       }
//     },
//     peer_averages: {
//       avg_total_students: Math.round((peerAverages.AvgTotalStudents || 0) * 100) / 100,
//       avg_active_students: Math.round((peerAverages.AvgActiveStudents || 0) * 100) / 100,
//       avg_total_attendance: Math.round((peerAverages.AvgTotalAttendance || 0) * 100) / 100,
//       avg_month_attendance: Math.round((peerAverages.AvgMonthAttendance || 0) * 100) / 100,
//       avg_attendance_per_student: Math.round((peerAverages.AvgAttendancePerStudent || 0) * 100) / 100,
//       ...(peerAverages.AvgTotalSchools && { avg_total_schools: Math.round((peerAverages.AvgTotalSchools || 0) * 100) / 100 })
//     },
//     comparisons: {
//       students_vs_peer: calculatePercentageDifference(currentMetrics.TotalStudents, peerAverages.AvgTotalStudents),
//       attendance_vs_peer: calculatePercentageDifference(currentMetrics.TotalAttendance, peerAverages.AvgTotalAttendance),
//       attendance_per_student_vs_peer: calculatePercentageDifference(currentMetrics.AttendancePerStudent, peerAverages.AvgAttendancePerStudent),
//       performance_ranking: determinePerformanceRanking(currentMetrics, peerAverages)
//     }
//   }
// }

// function calculatePercentageDifference(current, average) {
//   if (!average || average === 0) return { difference: 0, status: 'no_data' }
  
//   const percentageDiff = ((current - average) / average) * 100
//   let status = 'average'
  
//   if (percentageDiff > 20) status = 'excellent'
//   else if (percentageDiff > 5) status = 'above_average'
//   else if (percentageDiff < -20) status = 'poor'
//   else if (percentageDiff < -5) status = 'below_average'
  
//   return {
//     difference: Math.round(percentageDiff * 100) / 100,
//     status: status
//   }
// }

// function determinePerformanceRanking(current, peer) {
//   let score = 0
//   let maxScore = 0
  
//   // Students score
//   if (peer.AvgTotalStudents && peer.AvgTotalStudents > 0) {
//     maxScore += 1
//     if ((current.TotalStudents || 0) >= peer.AvgTotalStudents) score += 1
//   }
  
//   // Attendance per student score
//   if (peer.AvgAttendancePerStudent && peer.AvgAttendancePerStudent > 0) {
//     maxScore += 2 // Weight this more heavily
//     if ((current.AttendancePerStudent || 0) >= peer.AvgAttendancePerStudent * 1.1) score += 2
//     else if ((current.AttendancePerStudent || 0) >= peer.AvgAttendancePerStudent) score += 1
//   }
  
//   // Total attendance score
//   if (peer.AvgTotalAttendance && peer.AvgTotalAttendance > 0) {
//     maxScore += 1
//     if ((current.TotalAttendance || 0) >= peer.AvgTotalAttendance) score += 1
//   }
  
//   if (maxScore === 0) return 'insufficient_data'
  
//   const percentage = (score / maxScore) * 100
  
//   if (percentage >= 80) return 'top_performer'
//   else if (percentage >= 60) return 'above_average'
//   else if (percentage >= 40) return 'average'
//   else if (percentage >= 20) return 'below_average'
//   else return 'needs_improvement'
// }

// // Export additional analytics functions for potential standalone use
// module.exports = {
//   handler: handler, // Main export for Next.js API route
//   getOverviewAnalytics,
//   getAttendanceAnalytics,
//   getStudentAnalytics,
//   getSchoolAnalytics,
//   getSyncPerformanceAnalytics,
//   getTrendAnalytics,
//   getRealTimeAnalytics,
//   getAttendanceHeatmap,
//   getStudentEngagementMetrics,
//   getComparisonAnalytics,
//   calculateTrend,
//   generateAlerts,
//   calculatePercentageDifference,
//   determinePerformanceRanking,
//   calculateHealthScore
// }overview: {
//       schools: {
//         total: overview.TotalSchools || 0,
//         active: overview.ActiveSchools || 0,
//         inactive: (overview.TotalSchools || 0) - (overview.ActiveSchools || 0)
//       },
//       students: {
//         total: overview.TotalStudents || 0,
//         active: overview.ActiveStudents || 0,
//         inactive: (overview.TotalStudents || 0) - (overview.ActiveStudents || 0)
//       },
//       attendance: {
//         today: overview.TodayAttendance || 0,
//         week: overview.WeekAttendance || 0,
//         month: overview.MonthAttendance || 0,
//         total: overview.TotalAttendance || 0
//       },
//       sync_agents: {
//         total: overview.TotalSyncAgents || 0,
//         online: overview.OnlineSyncAgents || 0,
//         offline: (overview.TotalSyncAgents || 0) - (overview.OnlineSyncAgents || 0),
//         avg_uptime_hours: Math.round((overview.AvgUptimeHours || 0) * 100) / 100,
//         avg_memory_mb: Math.round((overview.AvgMemoryUsageMB || 0) * 100) / 100
//       },
//       performance: {
//         total_synced: overview.TotalSyncedRecords || 0,
//         total_errors: overview.TotalSyncErrors || 0,
//         error_rate: overview.TotalSyncedRecords > 0 ? 
//           Math.round((overview.TotalSyncErrors / (overview.TotalSyncedRecords + overview.TotalSyncErrors)) * 10000) / 100 : 0
//       }
//     }
//   }
// }

// async function getAttendanceAnalytics(schoolId, companyId, dateFrom, dateTo, granularity) {
//   const pool = await getPool()
//   const request = pool.request()
  
//   // Set default date range if not provided
//   const endDate = dateTo ? new Date(dateTo) : new Date()
//   const startDate = dateFrom ? new Date(dateFrom) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 30 days ago
  
//   request.input('startDate', sql.DateTime2, startDate)
//   request.input('endDate', sql.DateTime2, endDate)
  
//   let schoolFilter = ''
//   if (schoolId) {
//     schoolFilter = 'AND s.SchoolID = @schoolId'
//     request.input('schoolId', sql.Int, parseInt(schoolId))
//   }
//   if (companyId) {
//     schoolFilter += ' AND s.CompanyID = @companyId'
//     request.input('companyId', sql.Int, parseInt(companyId))
//   }
  
//   let dateGrouping = ''
//   switch (granularity) {
//     case 'hourly':
//       dateGrouping = "FORMAT(a.CreatedAt, 'yyyy-MM-dd HH') + ':00'"
//       break
//     case 'weekly':
//       dateGrouping = "DATEPART(year, a.CreatedAt) * 100 + DATEPART(week, a.CreatedAt)"
//       break
//     case 'monthly':
//       dateGrouping = "FORMAT(a.CreatedAt, 'yyyy-MM')"
//       break
//     default: // daily
//       dateGrouping = "FORMAT(a.CreatedAt, 'yyyy-MM-dd')"
//   }

//   const timeSeriesResult = await request.query(`
//     SELECT 
//       ${dateGrouping} as TimePeriod,
//       COUNT(*) as AttendanceCount,
//       COUNT(DISTINCT a.StudentID) as UniqueStudents,
//       COUNT(DISTINCT s.SchoolID) as ActiveSchools
//     FROM dbo.Attendance a
//     JOIN Students st ON a.StudentID = st.StudentID
//     JOIN Schools s ON st.SchoolID = s.SchoolID
//     WHERE a.CreatedAt BETWEEN @startDate AND @endDate
//     ${schoolFilter}
//     GROUP BY ${dateGrouping}
//     ORDER BY TimePeriod
//   `)

//   // Get attendance by school
//   const schoolBreakdownResult = await request.query(`
//     SELECT 
//       s.SchoolID,
//       s.Name as SchoolName,
//       s.Location,
//       COUNT(a.AttendanceID) as AttendanceCount,
//       COUNT(DISTINCT a.StudentID) as UniqueStudents,
//       AVG(CAST(COUNT(a.AttendanceID) as FLOAT)) OVER() as AvgAttendancePerSchool
//     FROM Schools s
//     LEFT JOIN Students st ON s.SchoolID = st.SchoolID
//     LEFT JOIN dbo.Attendance a ON st.StudentID = a.StudentID AND a.CreatedAt BETWEEN @startDate AND @endDate
//     WHERE 1=1 ${schoolFilter}
//     GROUP BY s.SchoolID, s.Name, s.Location
//     HAVING COUNT(a.AttendanceID) > 0
//     ORDER BY AttendanceCount DESC
//   `)

//   return {
//     date_range: {
//       from: startDate.toISOString(),
//       to: endDate.toISOString(),
//       granularity: granularity
//     },
//     time_series: timeSeriesResult.recordset.map(row => ({
//       period: row.TimePeriod,
//       attendance_count: row.AttendanceCount || 0,
//       unique_students: row.UniqueStudents || 0,
//       active_schools: row.ActiveSchools || 0
//     })),
//     school_breakdown: schoolBreakdownResult.recordset.map(row => ({
//       school_id: row.SchoolID,
//       school_name: row.SchoolName,
//       location: row.Location,
//       attendance_count: row.AttendanceCount || 0,
//       unique_students: row.UniqueStudents || 0,
//       performance_vs_avg: row.AttendanceCount && row.AvgAttendancePerSchool ? 
//         Math.round(((row.AttendanceCount / row.AvgAttendancePerSchool) * 100) - 100) : 0
//     })),
//     summary: {
//       total_attendance: timeSeriesResult.recordset.reduce((sum, row) => sum + (row.AttendanceCount || 0), 0),
//       total_unique_students: Math.max(...timeSeriesResult.recordset.map(row => row.UniqueStudents || 0), 0),
//       avg_daily_attendance: granularity === 'daily' ? 
//         Math.round(timeSeriesResult.recordset.reduce((sum, row) => sum + (row.AttendanceCount || 0), 0) / Math.max(timeSeriesResult.recordset.length, 1)) : null
//     }
//   }
// }

// async function getStudentAnalytics(schoolId, companyId) {
//   const pool = await getPool()
//   const request = pool.request()
  
//   let schoolFilter = ''
//   if (schoolId) {
//     schoolFilter = 'AND s.SchoolID = @schoolId'
//     request.input('schoolId', sql.Int, parseInt(schoolId))
//   }
//   if (companyId) {
//     schoolFilter += ' AND s.CompanyID = @companyId'
//     request.input('companyId', sql.Int, parseInt(companyId))
//   }

//   // Student distribution by grade
//   const gradeResult = await request.query(`
//     SELECT 
//       st.Grade,
//       COUNT(*) as StudentCount,
//       COUNT(CASE WHEN st.IsActive = 1 THEN 1 END) as ActiveStudents,
//       COUNT(CASE WHEN st.ParentPasswordSet = 1 THEN 1 END) as StudentsWithParentAccess,
//       AVG(CAST((
//         SELECT COUNT(*) FROM dbo.Attendance a 
//         WHERE a.StudentID = st.StudentID 
//         AND a.CreatedAt > DATEADD(day, -30, GETDATE())
//       ) as FLOAT)) as AvgMonthlyAttendance
//     FROM Students st
//     JOIN Schools s ON st.SchoolID = s.SchoolID
//     WHERE st.Grade IS NOT NULL ${schoolFilter}
//     GROUP BY st.Grade
//     ORDER BY st.Grade
//   `)

//   // Top attending students
//   const topStudentsResult = await request.query(`
//     SELECT TOP 10
//       st.StudentID,
//       st.Name as StudentName,
//       s.Name as SchoolName,
//       st.Grade,
//       COUNT(a.AttendanceID) as AttendanceCount,
//       MAX(a.CreatedAt) as LastAttendance
//     FROM Students st
//     JOIN Schools s ON st.SchoolID = s.SchoolID
//     LEFT JOIN dbo.Attendance a ON st.StudentID = a.StudentID AND a.CreatedAt > DATEADD(day, -30, GETDATE())
//     WHERE st.IsActive = 1 ${schoolFilter}
//     GROUP BY st.StudentID, st.Name, s.Name, st.Grade
//     HAVING COUNT(a.AttendanceID) > 0
//     ORDER BY AttendanceCount DESC
//   `)

//   return {
//     grade_distribution: gradeResult.recordset.map(row => ({
//       grade: row.Grade,
//       total_students: row.StudentCount || 0,
//       active_students: row.ActiveStudents || 0,
//       parent_access_enabled: row.StudentsWithParentAccess || 0,
//       avg_monthly_attendance: Math.round((row.AvgMonthlyAttendance || 0) * 100) / 100
//     })),
//     top_students: topStudentsResult.recordset.map(row => ({
//       student_id: row.StudentID,
//       name: row.StudentName,
//       school: row.SchoolName,
//       grade: row.Grade,
//       monthly_attendance: row.AttendanceCount || 0,
//       last_attendance: row.LastAttendance
//     })),
//     totals: {
//       total_grades: gradeResult.recordset.length,
//       total_students: gradeResult.recordset.reduce((sum, row) => sum + (row.StudentCount || 0), 0),
//       active_students: gradeResult.recordset.reduce((sum, row) => sum + (row.ActiveStudents || 0), 0)
//     }
//   }
// }

// async function getSchoolAnalytics(companyId) {
//   const pool = await getPool()
//   const request = pool.request()
  
//   let companyFilter = ''
//   if (companyId) {
//     companyFilter = 'AND s.CompanyID = @companyId'
//     request.input('companyId', sql.Int, parseInt(companyId))
//   }

//   const schoolsResult = await request.query(`
//     SELECT 
//       s.SchoolID,
//       s.Name as SchoolName,
//       s.Location,
//       s.Status as SchoolStatus,
//       COUNT(DISTINCT st.StudentID) as TotalStudents,
//       COUNT(DISTINCT CASE WHEN st.IsActive = 1 THEN st.StudentID END) as ActiveStudents,
//       COUNT(DISTINCT a.AttendanceID) as TotalAttendance,
//       COUNT(DISTINCT CASE WHEN CAST(a.CreatedAt as DATE) = CAST(GETDATE() as DATE) THEN a.AttendanceID END) as TodayAttendance,
//       MAX(a.CreatedAt) as LastAttendanceRecord,
//       sas.Status as SyncStatus,
//       sas.LastHeartbeat,
//       CASE 
//         WHEN sas.LastHeartbeat > DATEADD(MINUTE, -10, GETDATE()) THEN 'Online'
//         WHEN sas.LastHeartbeat > DATEADD(MINUTE, -30, GETDATE()) THEN 'Warning'  
//         WHEN sas.LastHeartbeat IS NULL THEN 'Never Connected'
//         ELSE 'Offline'
//       END as SyncConnectionStatus,
//       sas.TotalSynced,
//       sas.TotalErrors
//     FROM Schools s
//     LEFT JOIN Students st ON s.SchoolID = st.SchoolID
//     LEFT JOIN dbo.Attendance a ON st.StudentID = a.StudentID
//     LEFT JOIN SyncAgentStatus sas ON s.SchoolID = sas.SchoolID
//     WHERE 1=1 ${companyFilter}
//     GROUP BY s.SchoolID, s.Name, s.Location, s.Status, sas.Status, sas.LastHeartbeat, sas.TotalSynced, sas.TotalErrors
//     ORDER BY TotalAttendance DESC, s.Name
//   `)

//   return {
//     schools: schoolsResult.recordset.map(row => ({
//       school_id: row.SchoolID,
//       name: row.SchoolName,
//       location: row.Location,
//       status: row.SchoolStatus,
//       students: {
//         total: row.TotalStudents || 0,
//         active: row.ActiveStudents || 0,
//         inactive: (row.TotalStudents || 0) - (row.ActiveStudents || 0)
//       },
//       attendance: {
//         total: row.TotalAttendance || 0,
//         today: row.TodayAttendance || 0,
//         last_record: row.LastAttendanceRecord
//       },
//       sync_agent: {
//         status: row.SyncStatus,
//         connection_status: row.SyncConnectionStatus,
//         last_heartbeat: row.LastHeartbeat,
//         total_synced: row.TotalSynced || 0,
//         total_errors: row.TotalErrors || 0,
//         health_score: row.TotalSynced > 0 ? 
//           Math.round((1 - (row.TotalErrors / (row.TotalSynced + row.TotalErrors))) * 100) : 100
//       }
//     })),
//     summary: {
//       total_schools: schoolsResult.recordset.length,
//       active_schools: schoolsResult.recordset.filter(row => row.SchoolStatus === 'Active').length,
//       schools_with_sync: schoolsResult.recordset.filter(row => row.SyncStatus).length,
//       schools_online: schoolsResult.recordset.filter(row => row.SyncConnectionStatus === 'Online').length
//     }
//   }
// }

// async function getSyncPerformanceAnalytics(schoolId, companyId) {
//   const pool = await getPool()
//   const request = pool.request()
  
//   let schoolFilter = ''
//   if (schoolId) {
//     schoolFilter = 'AND s.SchoolID = @schoolId'
//     request.input('schoolId', sql.Int, parseInt(schoolId))
//   }
//   if (companyId) {
//     schoolFilter += ' AND s.CompanyID = @companyId'
//     request.input('companyId', sql.Int, parseInt(companyId))
//   }

//   const performanceResult = await request.query(`
//     SELECT 
//       s.SchoolID,
//       s.Name as SchoolName,
//       sas.Status,
//       sas.LastHeartbeat,
//       sas.StartupTime,
//       sas.UptimeHours,
//       sas.TotalSynced,
//       sas.TotalErrors,
//       sas.MemoryUsageMB,
//       sas.ProcessID,
//       CASE 
//         WHEN sas.LastHeartbeat > DATEADD(MINUTE, -10, GETDATE()) THEN 'Online'
//         WHEN sas.LastHeartbeat > DATEADD(MINUTE, -30, GETDATE()) THEN 'Warning'  
//         WHEN sas.LastHeartbeat IS NULL THEN 'Never Connected'
//         ELSE 'Offline'
//       END as ConnectionStatus,
//       DATEDIFF(MINUTE, sas.LastHeartbeat, GETDATE()) as MinutesSinceLastSeen,
//       CASE 
//         WHEN sas.TotalSynced + sas.TotalErrors > 0 
//         THEN CAST((sas.TotalErrors * 100.0 / (sas.TotalSynced + sas.TotalErrors)) AS DECIMAL(5,2))
//         ELSE 0 
//       END as ErrorRate,
//       CASE 
//         WHEN sas.UptimeHours > 0 AND sas.TotalSynced > 0
//         THEN CAST((sas.TotalSynced / sas.UptimeHours) AS DECIMAL(10,2))
//         ELSE 0
//       END as SyncsPerHour
//     FROM Schools s
//     LEFT JOIN SyncAgentStatus sas ON s.SchoolID = sas.SchoolID
//     WHERE sas.SchoolID IS NOT NULL ${schoolFilter}
//     ORDER BY sas.TotalSynced DESC
//   `)

//   const agents = performanceResult.recordset.map(row => ({
//     school_id: row.SchoolID,
//     school_name: row.SchoolName,
//     status: row.Status,
//     connection_status: row.ConnectionStatus,
//     uptime_hours: row.UptimeHours || 0,
//     total_synced: row.TotalSynced || 0,
//     total_errors: row.TotalErrors || 0,
//     error_rate: row.ErrorRate || 0,
//     syncs_per_hour: row.SyncsPerHour || 0,
//     memory_usage_mb: row.MemoryUsageMB || 0,
//     minutes_since_heartbeat: row.MinutesSinceLastSeen,
//     health_score: calculateHealthScore(row)
//   }))

// // Complete the return statement for getSyncPerformanceAnalytics function in analytics.js

//   return {
//     agents: agents,
//     performance_metrics: {
//       total_agents: agents.length,
//       online_agents: agents.filter(a => a.connection_status === 'Online').length,
//       avg_error_rate: agents.length > 0 ? 
//         Math.round(agents.reduce((sum, a) => sum + a.error_rate, 0) / agents.length * 100) / 100 : 0,
//       avg_syncs_per_hour: agents.length > 0 ? 
//         Math.round(agents.reduce((sum, a) => sum + a.syncs_per_hour, 0) / agents.length * 100) / 100 : 0,
//       total_synced: agents.reduce((sum, a) => sum + a.total_synced, 0),
//       total_errors: agents.reduce((sum, a) => sum + a.total_errors, 0),
//       avg_uptime_hours: agents.length > 0 ? 
//         Math.round(agents.reduce((sum, a) => sum + a.uptime_hours, 0) / agents.length * 100) / 100 : 0
//     },
//     health_distribution: {
//       excellent: agents.filter(a => a.health_score >= 90).length,
//       good: agents.filter(a => a.health_score >= 70 && a.health_score < 90).length,
//       fair: agents.filter(a => a.health_score >= 50 && a.health_score < 70).length,
//       poor: agents.filter(a => a.health_score < 50).length
//     }
//   }

// // Also need to fix the getOverviewAnalytics function - it has the wrong return structure
// // Here's the corrected getOverviewAnalytics function:

// async function getOverviewAnalytics(schoolId, companyId) {
//   const pool = await getPool()
//   const request = pool.request()
  
//   let schoolFilter = ''
//   if (schoolId) {
//     schoolFilter = 'AND s.SchoolID = @schoolId'
//     request.input('schoolId', sql.Int, parseInt(schoolId))
//   }
//   if (companyId) {
//     schoolFilter += ' AND s.CompanyID = @companyId'
//     request.input('companyId', sql.Int, parseInt(companyId))
//   }

//   const result = await request.query(`
//     SELECT 
//       -- School metrics
//       COUNT(DISTINCT s.SchoolID) as TotalSchools,
//       COUNT(DISTINCT CASE WHEN s.Status = 'Active' THEN s.SchoolID END) as ActiveSchools,
      
//       -- Student metrics
//       COUNT(DISTINCT st.StudentID) as TotalStudents,
//       COUNT(DISTINCT CASE WHEN st.IsActive = 1 THEN st.StudentID END) as ActiveStudents,
      
//       -- Attendance metrics
//       COUNT(DISTINCT CASE WHEN CAST(a.CreatedAt as DATE) = CAST(GETDATE() as DATE) THEN a.AttendanceID END) as TodayAttendance,
//       COUNT(DISTINCT CASE WHEN a.CreatedAt > DATEADD(day, -7, GETDATE()) THEN a.AttendanceID END) as WeekAttendance,
//       COUNT(DISTINCT CASE WHEN a.CreatedAt > DATEADD(day, -30, GETDATE()) THEN a.AttendanceID END) as MonthAttendance,
//       COUNT(DISTINCT a.AttendanceID) as TotalAttendance,
      
//       -- Sync agent metrics
//       COUNT(DISTINCT sas.SchoolID) as TotalSyncAgents,
//       COUNT(DISTINCT CASE WHEN sas.LastHeartbeat > DATEADD(MINUTE, -10, GETDATE()) THEN sas.SchoolID END) as OnlineSyncAgents,
      
//       -- Average metrics
//       AVG(CAST(sas.UptimeHours as FLOAT)) as AvgUptimeHours,
//       AVG(CAST(sas.MemoryUsageMB as FLOAT)) as AvgMemoryUsageMB,
      
//       -- Error rates
//       SUM(sas.TotalErrors) as TotalSyncErrors,
//       SUM(sas.TotalSynced) as TotalSyncedRecords
      
//     FROM Schools s
//     LEFT JOIN Students st ON s.SchoolID = st.SchoolID
//     LEFT JOIN dbo.Attendance a ON st.StudentID = a.StudentID
//     LEFT JOIN SyncAgentStatus sas ON s.SchoolID = sas.SchoolID
//     WHERE 1=1 ${schoolFilter}
//   `)

//   const overview = result.recordset[0]
  
//   return {
//     overview: {
//       schools: {
//         total: overview.TotalSchools || 0,
//         active: overview.ActiveSchools || 0,
//         inactive: (overview.TotalSchools || 0) - (overview.ActiveSchools || 0)
//       },
//       students: {
//         total: overview.TotalStudents || 0,
//         active: overview.ActiveStudents || 0,
//         inactive: (overview.TotalStudents || 0) - (overview.ActiveStudents || 0)
//       },
//       attendance: {
//         today: overview.TodayAttendance || 0,
//         week: overview.WeekAttendance || 0,
//         month: overview.MonthAttendance || 0,
//         total: overview.TotalAttendance || 0
//       },
//       sync_agents: {
//         total: overview.TotalSyncAgents || 0,
//         online: overview.OnlineSyncAgents || 0,
//         offline: (overview.TotalSyncAgents || 0) - (overview.OnlineSyncAgents || 0),
//         avg_uptime_hours: Math.round((overview.AvgUptimeHours || 0) * 100) / 100,
//         avg_memory_mb: Math.round((overview.AvgMemoryUsageMB || 0) * 100) / 100
//       },
//       performance: {
//         total_synced: overview.TotalSyncedRecords || 0,
//         total_errors: overview.TotalSyncErrors || 0,
//         error_rate: overview.TotalSyncedRecords > 0 ? 
//           Math.round((overview.TotalSyncErrors / (overview.TotalSyncedRecords + overview.TotalSyncErrors)) * 10000) / 100 : 0
//       }
//     }
//   }
// }
// pages/api/analytics.js - Analytics API for School System (FIXED)
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
      company_id, // We'll ignore this since your DB doesn't use it
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
            if (company_id) {
              // Company admin - get all schools
              result = await getRealTimeAttendance(null, date_from, date_to)
            } else if (school_id) {
              // School admin - get specific school
              result = await getRealTimeAttendance(school_id, date_from, date_to)
            } else {
              // If no filters, get recent activity (last 24 hours)
              result = await getRealTimeAttendance(null, date_from, date_to)
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

// Overview Analytics - matches your actual database structure
async function getOverviewAnalytics(schoolId) {
  const pool = await getPool()
  const request = pool.request()
  
  let schoolFilter = ''
  if (schoolId) {
    schoolFilter = 'AND s.SchoolID = @schoolId'
    request.input('schoolId', sql.Int, parseInt(schoolId))
  }

  try {
    // Get basic overview statistics from your actual tables
    const overviewResult = await request.query(`
      SELECT 
        COUNT(DISTINCT s.SchoolID) as TotalSchools,
        COUNT(DISTINCT CASE WHEN s.Status = 'active' THEN s.SchoolID END) as ActiveSchools,
        COUNT(DISTINCT st.StudentID) as TotalStudents,
        COUNT(DISTINCT CASE WHEN st.IsActive = 1 THEN st.StudentID END) as ActiveStudents,
        COUNT(CASE WHEN CAST(a.CreatedAt as DATE) = CAST(GETDATE() as DATE) THEN a.AttendanceID END) as TodayAttendance,
        COUNT(CASE WHEN a.CreatedAt > DATEADD(day, -7, GETDATE()) THEN a.AttendanceID END) as WeekAttendance,
        COUNT(CASE WHEN a.CreatedAt > DATEADD(day, -30, GETDATE()) THEN a.AttendanceID END) as MonthAttendance
      FROM Schools s
      LEFT JOIN Students st ON s.SchoolID = st.SchoolID
      LEFT JOIN dbo.Attendance a ON st.StudentID = a.StudentID
      WHERE 1=1 ${schoolFilter}
    `)

    // Get sync agent status from your SyncAgentStatus table
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

    // Get recent activity from your attendance table
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

    const overview = overviewResult.recordset[0]
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
          today: overview.TodayAttendance || 0,
          week: overview.WeekAttendance || 0,
          month: overview.MonthAttendance || 0
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

// Real-time Analytics
// async function getRealTimeAnalytics(schoolId) {
//   const pool = await getPool()
//   const request = pool.request()
  
//   let schoolFilter = ''
//   if (schoolId) {
//     schoolFilter = 'AND s.SchoolID = @schoolId'
//     request.input('schoolId', sql.Int, parseInt(schoolId))
//   }

//   try {
//     // Current activity (last 2 hours)
//     const activityResult = await request.query(`
//       SELECT TOP 50
//         a.AttendanceID,
//         a.StudentID,
//         st.Name as StudentName,
//         s.SchoolID,
//         s.Name as SchoolName,
//         a.ScanTime,
//         a.Status,
//         a.CreatedAt,
//         DATEDIFF(SECOND, a.CreatedAt, GETDATE()) as SecondsAgo
//       FROM dbo.Attendance a
//       JOIN Students st ON a.StudentID = st.StudentID
//       JOIN Schools s ON st.SchoolID = s.SchoolID
//       WHERE a.CreatedAt > DATEADD(HOUR, -2, GETDATE()) ${schoolFilter}
//       ORDER BY a.CreatedAt DESC
//     `)

//     // Live metrics
//     const metricsResult = await request.query(`
//       SELECT 
//         COUNT(CASE WHEN a.CreatedAt > DATEADD(MINUTE, -1, GETDATE()) THEN 1 END) as LastMinute,
//         COUNT(CASE WHEN a.CreatedAt > DATEADD(MINUTE, -5, GETDATE()) THEN 1 END) as Last5Minutes,
//         COUNT(CASE WHEN a.CreatedAt > DATEADD(MINUTE, -15, GETDATE()) THEN 1 END) as Last15Minutes,
//         COUNT(CASE WHEN a.CreatedAt > DATEADD(HOUR, -1, GETDATE()) THEN 1 END) as LastHour,
//         COUNT(DISTINCT CASE WHEN a.CreatedAt > DATEADD(MINUTE, -15, GETDATE()) THEN a.StudentID END) as ActiveStudents15Min
//       FROM dbo.Attendance a
//       JOIN Students st ON a.StudentID = st.StudentID
//       JOIN Schools s ON st.SchoolID = s.SchoolID
//       WHERE a.CreatedAt > DATEADD(HOUR, -1, GETDATE()) ${schoolFilter}
//     `)

//     const metrics = metricsResult.recordset[0]

//     return {
//       current_activity: activityResult.recordset.map(row => ({
//         attendance_id: row.AttendanceID,
//         student_id: row.StudentID,
//         student_name: row.StudentName,
//         school_id: row.SchoolID,
//         school_name: row.SchoolName,
//         scan_time: row.ScanTime,
//         status: row.Status,
//         created_at: row.CreatedAt,
//         seconds_ago: row.SecondsAgo,
//         is_recent: row.SecondsAgo < 300 // Less than 5 minutes ago
//       })),
//       live_metrics: {
//         last_minute: metrics.LastMinute || 0,
//         last_5_minutes: metrics.Last5Minutes || 0,
//         last_15_minutes: metrics.Last15Minutes || 0,
//         last_hour: metrics.LastHour || 0,
//         active_students_15min: metrics.ActiveStudents15Min || 0
//       }
//     }
//   } catch (error) {
//     console.error('Error in getRealTimeAnalytics:', error)
//     throw error
//   }
// }
async function getRealTimeAnalytics(schoolId, dateFrom, dateTo) {
  const pool = await getPool()
  const request = pool.request()
  
  // Use provided dates or default to last 2 hours
  const endDate = dateTo ? new Date(dateTo + 'T23:59:59') : new Date()
  const startDate = dateFrom ? new Date(dateFrom + 'T00:00:00') : new Date(Date.now() - 2 * 60 * 60 * 1000)
  
  request.input('startDate', sql.DateTime2, startDate)
  request.input('endDate', sql.DateTime2, endDate)
  
  let schoolFilter = ''
  if (schoolId) {
    schoolFilter = 'AND s.SchoolID = @schoolId'
    request.input('schoolId', sql.Int, parseInt(schoolId))
  }

  try {
    // Current activity for the specified date range
    const activityResult = await request.query(`
      SELECT TOP 50
        a.AttendanceID,
        a.StudentID,
        st.Name as StudentName,
        s.SchoolID,
        s.Name as SchoolName,
        a.ScanTime,
        a.Status,
        a.CreatedAt,
        DATEDIFF(SECOND, a.CreatedAt, GETDATE()) as SecondsAgo
      FROM dbo.Attendance a
      JOIN Students st ON a.StudentID = st.StudentID
      JOIN Schools s ON st.SchoolID = s.SchoolID
      WHERE a.ScanTime BETWEEN @startDate AND @endDate ${schoolFilter}
      ORDER BY a.ScanTime DESC
    `)

    // Live metrics (keep as last hour for real-time feel)
    const metricsResult = await request.query(`
      SELECT 
        COUNT(CASE WHEN a.CreatedAt > DATEADD(MINUTE, -1, GETDATE()) THEN 1 END) as LastMinute,
        COUNT(CASE WHEN a.CreatedAt > DATEADD(MINUTE, -5, GETDATE()) THEN 1 END) as Last5Minutes,
        COUNT(CASE WHEN a.CreatedAt > DATEADD(MINUTE, -15, GETDATE()) THEN 1 END) as Last15Minutes,
        COUNT(CASE WHEN a.CreatedAt > DATEADD(HOUR, -1, GETDATE()) THEN 1 END) as LastHour,
        COUNT(DISTINCT CASE WHEN a.CreatedAt > DATEADD(MINUTE, -15, GETDATE()) THEN a.StudentID END) as ActiveStudents15Min
      FROM dbo.Attendance a
      JOIN Students st ON a.StudentID = st.StudentID
      JOIN Schools s ON st.SchoolID = s.SchoolID
      WHERE a.CreatedAt > DATEADD(HOUR, -1, GETDATE()) ${schoolFilter}
    `)

    const metrics = metricsResult.recordset[0]

    return {
      current_activity: activityResult.recordset.map(row => ({
        attendance_id: row.AttendanceID,
        student_id: row.StudentID,
        student_name: row.StudentName,
        school_id: row.SchoolID,
        school_name: row.SchoolName,
        scan_time: row.ScanTime,
        status: row.Status,
        created_at: row.CreatedAt,
        seconds_ago: row.SecondsAgo,
        is_recent: row.SecondsAgo < 300
      })),
      live_metrics: {
        last_minute: metrics.LastMinute || 0,
        last_5_minutes: metrics.Last5Minutes || 0,
        last_15_minutes: metrics.Last15Minutes || 0,
        last_hour: metrics.LastHour || 0,
        active_students_15min: metrics.ActiveStudents15Min || 0
      }
    }
  } catch (error) {
    console.error('Error in getRealTimeAnalytics:', error)
    throw error
  }
}

// Attendance Analytics
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
    // School breakdown
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
        performance_vs_avg: 0 // Simplified for now
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

// Add this function to your analytics.js file
// async function getRealTimeAttendance(schoolId, dateFrom, dateTo) {
//   const pool = await getPool()
//   const request = pool.request()
  
//   const endDate = dateTo ? new Date(dateTo + 'T23:59:59') : new Date()
//   const startDate = dateFrom ? new Date(dateFrom + 'T00:00:00') : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  
//   request.input('startDate', sql.DateTime2, startDate)
//   request.input('endDate', sql.DateTime2, endDate)
  
//   let schoolFilter = ''
//   if (schoolId) {
//     schoolFilter = 'AND a.SchoolID = @schoolId'
//     request.input('schoolId', sql.Int, parseInt(schoolId))
//   }

//   try {
//     const attendanceResult = await request.query(`
//       SELECT TOP 100
//         a.AttendanceID as attendance_id,
//         a.StudentID as student_id,
//         s.Name as student_name,
//         a.ScanTime as scan_time,
//         a.Status as status,
//         a.CreatedAt as created_at,
//         sch.Name as school_name
//       FROM dbo.Attendance a
//       LEFT JOIN Students s ON a.StudentID = s.StudentID
//       LEFT JOIN Schools sch ON a.SchoolID = sch.SchoolID
//       WHERE a.ScanTime BETWEEN @startDate AND @endDate
//       ${schoolFilter}
//       ORDER BY a.ScanTime DESC
//     `)

//     return {
//       current_activity: attendanceResult.recordset.map(record => ({
//         attendance_id: record.attendance_id,
//         student_id: record.student_id,
//         student_name: record.student_name,
//         scan_time: record.scan_time,
//         status: record.status,
//         created_at: record.created_at,
//         school_name: record.school_name
//       })),
//       total_records: attendanceResult.recordset.length,
//       date_range: {
//         from: startDate.toISOString(),
//         to: endDate.toISOString()
//       }
//     }
//   } catch (error) {
//     console.error('Error in getRealTimeAttendance:', error)
//     throw error
//   }
// }
// Add this function to your analytics.js file
// async function getRealTimeAttendance(schoolId, dateFrom, dateTo) {
//   const pool = await getPool()
//   const request = pool.request()
  
//   const endDate = dateTo ? new Date(dateTo + 'T23:59:59') : new Date()
//   const startDate = dateFrom ? new Date(dateFrom + 'T00:00:00') : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  
//   request.input('startDate', sql.DateTime2, startDate)
//   request.input('endDate', sql.DateTime2, endDate)
  
//   let schoolFilter = ''
//   if (schoolId) {
//     schoolFilter = 'AND a.SchoolID = @schoolId'
//     request.input('schoolId', sql.Int, parseInt(schoolId))
//   }

//   try {
//     const attendanceResult = await request.query(`
//       SELECT TOP 100
//         a.AttendanceID as attendance_id,
//         a.StudentID as student_id,
//         s.Name as student_name,
//         a.ScanTime as scan_time,
//         a.Status as status,
//         a.CreatedAt as created_at,
//         sch.Name as school_name
//       FROM dbo.Attendance a
//       LEFT JOIN Students s ON a.StudentID = s.StudentID
//       LEFT JOIN Schools sch ON a.SchoolID = sch.SchoolID
//       WHERE a.ScanTime BETWEEN @startDate AND @endDate
//       ${schoolFilter}
//       ORDER BY a.ScanTime DESC
//     `)

//     return {
//       current_activity: attendanceResult.recordset.map(record => ({
//         attendance_id: record.attendance_id,
//         student_id: record.student_id,
//         student_name: record.student_name,
//         scan_time: record.scan_time,
//         status: record.status,
//         created_at: record.created_at,
//         school_name: record.school_name
//       })),
//       total_records: attendanceResult.recordset.length
//     }
//   } catch (error) {
//     console.error('Error in getRealTimeAttendance:', error)
//     throw error
//   }
// }
async function getRealTimeAttendance(schoolId, dateFrom, dateTo) {
  const pool = await getPool()
  const request = pool.request()
  
  // Handle date range properly
  let dateFilter = ''
  if (dateFrom && dateTo) {
    // Convert to proper SQL datetime format
    const startDateTime = dateFrom + 'T00:00:00.000Z'
    const endDateTime = dateTo + 'T23:59:59.999Z'
    
    request.input('startDate', sql.DateTime2, new Date(startDateTime))
    request.input('endDate', sql.DateTime2, new Date(endDateTime))
    dateFilter = 'AND a.ScanTime BETWEEN @startDate AND @endDate'
  } else {
    // Default to last 24 hours if no date range provided
    const defaultStart = new Date(Date.now() - 24 * 60 * 60 * 1000)
    request.input('defaultStart', sql.DateTime2, defaultStart)
    dateFilter = 'AND a.ScanTime >= @defaultStart'
  }
  
  let schoolFilter = ''
  if (schoolId) {
    schoolFilter = 'AND st.SchoolID = @schoolId'
    request.input('schoolId', sql.Int, parseInt(schoolId))
  }

  try {
    // Get attendance records with proper joins and sorting
    const attendanceResult = await request.query(`
      SELECT TOP 100
        a.AttendanceID as attendance_id,
        a.StudentID as student_id,
        st.Name as student_name,
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
      ORDER BY a.ScanTime DESC, a.CreatedAt DESC
    `)

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
    `)

    const summary = summaryResult.recordset[0]

    return {
      current_activity: attendanceResult.recordset.map(record => ({
        attendance_id: record.attendance_id,
        student_id: record.student_id,
        student_name: record.student_name,
        scan_time: record.scan_time,
        status: record.status,
        created_at: record.created_at,
        school_name: record.school_name,
        school_id: record.school_id
      })),
      summary: {
        total_records: summary.total_records || 0,
        check_ins: summary.check_ins || 0,
        check_outs: summary.check_outs || 0,
        unique_students: summary.unique_students || 0,
        date_range: {
          earliest: summary.earliest_scan,
          latest: summary.latest_scan,
          requested_from: dateFrom,
          requested_to: dateTo
        }
      }
    }
  } catch (error) {
    console.error('Error in getRealTimeAttendance:', error)
    throw error
  }
}

// Schools Analytics - no CompanyID needed
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

// Sync Performance Analytics
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

// Simple implementations for remaining functions
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