// lib/analytics-schema-safe.js
// Schema-safe analytics functions that work with your existing database structure

const sql = require('mssql')

// Schema-safe paginated queries that only use columns we know exist
async function getStudentListPaginatedSafe(pool, { school_id, limit, offset, search = '' }) {
  try {
    const startTime = Date.now()
    
    // Build search condition - only use Name and Grade (columns we know exist)
    const searchCondition = search ? 
      `AND (s.Name LIKE @search OR s.Grade LIKE @search)` : ''
    
    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total_students
      FROM Students s
      WHERE s.SchoolID = @schoolId
        AND s.IsActive = 1
        ${searchCondition}
    `
    
    const countRequest = pool.request()
      .input('schoolId', sql.Int, school_id)
    
    if (search) {
      countRequest.input('search', sql.NVarChar, `%${search}%`)
    }
    
    const countResult = await countRequest.query(countQuery)
    const total = countResult.recordset[0].total_students
    
    // Get paginated student data with recent attendance - SAFE COLUMNS ONLY
    const dataQuery = `
      SELECT 
        s.StudentID,
        s.Name,
        s.Grade,
        -- Get today's attendance status
        CASE 
          WHEN todayAtt.Status IS NOT NULL THEN todayAtt.Status
          ELSE 'ABSENT'
        END as TodayStatus,
        todayAtt.ScanTime as TodayLastScan,
        -- Get last 7 days attendance count
        ISNULL(recent.DaysPresent, 0) as RecentDaysPresent
      FROM Students s
      LEFT JOIN (
        SELECT StudentID, Status, ScanTime,
               ROW_NUMBER() OVER (PARTITION BY StudentID ORDER BY ScanTime DESC) as rn
        FROM Attendance 
        WHERE CAST(ScanTime AS DATE) = CAST(GETDATE() AS DATE)
      ) todayAtt ON s.StudentID = todayAtt.StudentID AND todayAtt.rn = 1
      LEFT JOIN (
        SELECT 
          StudentID, 
          COUNT(DISTINCT CAST(ScanTime AS DATE)) as DaysPresent
        FROM Attendance
        WHERE ScanTime >= DATEADD(DAY, -7, GETDATE())
        GROUP BY StudentID
      ) recent ON s.StudentID = recent.StudentID
      WHERE s.SchoolID = @schoolId
        AND s.IsActive = 1
        ${searchCondition}
      ORDER BY s.Name
      OFFSET @offset ROWS
      FETCH NEXT @limit ROWS ONLY
      OPTION (MAXDOP 1)
    `
    
    const dataRequest = pool.request()
      .input('schoolId', sql.Int, school_id)
      .input('offset', sql.Int, offset)
      .input('limit', sql.Int, limit)
    
    if (search) {
      dataRequest.input('search', sql.NVarChar, `%${search}%`)
    }
    
    const dataResult = await dataRequest.query(dataQuery)
    
    const queryTime = Date.now() - startTime
    console.log(`Schema-safe student list: ${queryTime}ms (${dataResult.recordset.length} rows)`)
    
    return {
      data: dataResult.recordset,
      total: total,
      queryTime: queryTime
    }
    
  } catch (error) {
    console.error('Schema-safe student list error:', error)
    throw error
  }
}

// Schema-safe attendance summary
async function getAttendanceSummaryPaginatedSafe(pool, { school_id, date_from, date_to, limit, offset }) {
  try {
    const startTime = Date.now()
    
    // Get total count first
    const countQuery = `
      SELECT COUNT(DISTINCT a.StudentID) as total_students
      FROM Attendance a
      INNER JOIN Students s ON a.StudentID = s.StudentID
      WHERE s.SchoolID = @schoolId
        AND a.ScanTime >= @dateFrom 
        AND a.ScanTime <= @dateTo
        AND s.IsActive = 1
    `
    
    const countResult = await pool.request()
      .input('schoolId', sql.Int, school_id)
      .input('dateFrom', sql.DateTime, date_from)
      .input('dateTo', sql.DateTime, date_to)
      .query(countQuery)
    
    const total = countResult.recordset[0].total_students
    
    // Get paginated data - SAFE COLUMNS ONLY
    const dataQuery = `
      SELECT 
        s.StudentID,
        s.Name as StudentName,
        s.Grade,
        COUNT(CASE WHEN a.Status = 'IN' THEN 1 END) as CheckIns,
        COUNT(CASE WHEN a.Status = 'OUT' THEN 1 END) as CheckOuts,
        MAX(CASE WHEN a.Status = 'IN' THEN a.ScanTime END) as LastCheckIn,
        MAX(CASE WHEN a.Status = 'OUT' THEN a.ScanTime END) as LastCheckOut,
        COUNT(DISTINCT CAST(a.ScanTime AS DATE)) as DaysPresent
      FROM Students s
      LEFT JOIN Attendance a ON s.StudentID = a.StudentID 
        AND a.ScanTime >= @dateFrom 
        AND a.ScanTime <= @dateTo
      WHERE s.SchoolID = @schoolId
        AND s.IsActive = 1
      GROUP BY s.StudentID, s.Name, s.Grade
      ORDER BY s.Name
      OFFSET @offset ROWS
      FETCH NEXT @limit ROWS ONLY
      OPTION (MAXDOP 1)
    `
    
    const dataResult = await pool.request()
      .input('schoolId', sql.Int, school_id)
      .input('dateFrom', sql.DateTime, date_from)
      .input('dateTo', sql.DateTime, date_to)
      .input('offset', sql.Int, offset)
      .input('limit', sql.Int, limit)
      .query(dataQuery)
    
    const queryTime = Date.now() - startTime
    console.log(`Schema-safe attendance summary: ${queryTime}ms (${dataResult.recordset.length} rows)`)
    
    return {
      data: dataResult.recordset,
      total: total,
      queryTime: queryTime
    }
    
  } catch (error) {
    console.error('Schema-safe attendance summary error:', error)
    throw error
  }
}

// Schema-safe real-time attendance (using existing working query)
async function getRealTimeAttendancePaginatedSafe(pool, { school_id, date_from, date_to, limit, offset }) {
  try {
    const startTime = Date.now()
    
    // Default to last 24 hours if no dates provided
    const fromDate = date_from || new Date(Date.now() - 24 * 60 * 60 * 1000)
    const toDate = date_to || new Date()
    
    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total_records
      FROM Attendance a
      INNER JOIN Students s ON a.StudentID = s.StudentID
      WHERE s.SchoolID = @schoolId
        AND a.ScanTime >= @dateFrom
        AND a.ScanTime <= @dateTo
        AND s.IsActive = 1
    `
    
    const countResult = await pool.request()
      .input('schoolId', sql.Int, school_id)
      .input('dateFrom', sql.DateTime, fromDate)
      .input('dateTo', sql.DateTime, toDate)
      .query(countQuery)
    
    const total = countResult.recordset[0].total_records
    
    // Get paginated real-time data - Using your actual column names
    const dataQuery = `
      SELECT 
        a.AttendanceID,
        a.StudentID,
        s.Name as StudentName,
        s.Grade,
        s.StudentCode,
        a.Status,
        a.ScanTime,
        a.CreatedAt
      FROM Attendance a
      INNER JOIN Students s ON a.StudentID = s.StudentID
      WHERE s.SchoolID = @schoolId
        AND a.ScanTime >= @dateFrom
        AND a.ScanTime <= @dateTo
        AND s.IsActive = 1
      ORDER BY a.ScanTime DESC
      OFFSET @offset ROWS
      FETCH NEXT @limit ROWS ONLY
      OPTION (MAXDOP 1)
    `
    
    const dataResult = await pool.request()
      .input('schoolId', sql.Int, school_id)
      .input('dateFrom', sql.DateTime, fromDate)
      .input('dateTo', sql.DateTime, toDate)
      .input('offset', sql.Int, offset)
      .input('limit', sql.Int, limit)
      .query(dataQuery)
    
    const queryTime = Date.now() - startTime
    console.log(`Schema-safe real-time attendance: ${queryTime}ms (${dataResult.recordset.length} rows)`)
    
    return {
      data: dataResult.recordset,
      total: total,
      queryTime: queryTime
    }
    
  } catch (error) {
    console.error('Schema-safe real-time attendance error:', error)
    throw error
  }
}

// Schema-safe dashboard stats (using your working query)
async function getDashboardStatsOptimizedSafe(pool, { school_id, date_from, date_to }) {
  try {
    const startTime = Date.now()
    
    const query = `
      SELECT 
        COUNT(DISTINCT s.StudentID) as TotalStudents,
        COUNT(DISTINCT CASE 
          WHEN CAST(a.ScanTime AS DATE) = CAST(GETDATE() AS DATE) 
          THEN a.StudentID 
        END) as PresentToday,
        COUNT(DISTINCT CASE 
          WHEN a.Status = 'IN' AND CAST(a.ScanTime AS DATE) = CAST(GETDATE() AS DATE)
          AND CAST(a.ScanTime AS TIME) > '08:30:00'
          THEN a.StudentID 
        END) as LateToday,
        COUNT(DISTINCT CASE 
          WHEN CAST(a.ScanTime AS DATE) >= CAST(DATEADD(DAY, -7, GETDATE()) AS DATE)
          THEN a.StudentID 
        END) as ActiveThisWeek
      FROM Students s
      LEFT JOIN Attendance a ON s.StudentID = a.StudentID
        AND a.ScanTime >= COALESCE(@dateFrom, DATEADD(DAY, -30, GETDATE()))
        AND a.ScanTime <= COALESCE(@dateTo, GETDATE())
      WHERE s.SchoolID = @schoolId
        AND s.IsActive = 1
      OPTION (MAXDOP 1)
    `
    
    const result = await pool.request()
      .input('schoolId', sql.Int, school_id)
      .input('dateFrom', sql.DateTime, date_from)
      .input('dateTo', sql.DateTime, date_to)
      .query(query)
    
    const queryTime = Date.now() - startTime
    console.log(`Schema-safe dashboard stats: ${queryTime}ms`)
    
    return {
      data: result.recordset[0],
      queryTime: queryTime
    }
    
  } catch (error) {
    console.error('Schema-safe dashboard stats error:', error)
    throw error
  }
}

module.exports = {
  getStudentListPaginatedSafe,
  getAttendanceSummaryPaginatedSafe,
  getRealTimeAttendancePaginatedSafe,
  getDashboardStatsOptimizedSafe
}