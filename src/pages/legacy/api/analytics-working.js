// pages/api/analytics-working.js
// Working analytics API that uses only existing database columns

const { getPool } = require('../../lib/database')
const {
  getStudentListPaginatedSafe,
  getAttendanceSummaryPaginatedSafe,
  getRealTimeAttendancePaginatedSafe,
  getDashboardStatsOptimizedSafe
} = require('../../lib/analytics-schema-safe')

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const startTime = Date.now()
  
  // Extract pagination parameters
  const limit = req.query.limit ? Math.min(parseInt(req.query.limit), 1000) : 100
  const offset = req.query.offset ? parseInt(req.query.offset) : 0
  const page = req.query.page ? parseInt(req.query.page) : 1
  const actualOffset = page > 1 ? (page - 1) * limit : offset

  // Extract other parameters
  const { type, school_id, date_from, date_to, search } = req.query

  console.log('Working Analytics API called:', {
    type,
    school_id,
    page,
    limit,
    actualOffset,
    search: search ? search.substring(0, 20) + '...' : 'none'
  })

  // Validate required parameters
  if (!type) {
    return res.status(400).json({ 
      error: 'Missing required parameter: type',
      validTypes: ['student-list', 'attendance-summary', 'real-time', 'dashboard-stats']
    })
  }

  if (!school_id && type !== 'health-check') {
    return res.status(400).json({ 
      error: 'Missing required parameter: school_id'
    })
  }

  try {
    const pool = await getPool()
    let result

    switch (type) {
      case 'student-list':
        console.log('Executing schema-safe student list query...')
        
        result = await getStudentListPaginatedSafe(pool, {
          school_id: parseInt(school_id),
          limit,
          offset: actualOffset,
          search: search || ''
        })
        
        return res.json({
          success: true,
          data: result.data,
          queryTime: result.queryTime,
          totalTime: Date.now() - startTime,
          pagination: {
            page: parseInt(page),
            limit: limit,
            offset: actualOffset,
            total: result.total,
            totalPages: Math.ceil(result.total / limit),
            hasMore: (actualOffset + limit) < result.total,
            showing: `${actualOffset + 1}-${Math.min(actualOffset + limit, result.total)} of ${result.total}`
          }
        })

      case 'attendance-summary':
        console.log('Executing schema-safe attendance summary query...')
        
        const fromDate = date_from ? new Date(date_from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        const toDate = date_to ? new Date(date_to) : new Date()
        
        result = await getAttendanceSummaryPaginatedSafe(pool, {
          school_id: parseInt(school_id),
          date_from: fromDate,
          date_to: toDate,
          limit,
          offset: actualOffset
        })
        
        return res.json({
          success: true,
          data: result.data,
          queryTime: result.queryTime,
          totalTime: Date.now() - startTime,
          pagination: {
            page: parseInt(page),
            limit: limit,
            offset: actualOffset,
            total: result.total,
            totalPages: Math.ceil(result.total / limit),
            hasMore: (actualOffset + limit) < result.total,
            showing: `${actualOffset + 1}-${Math.min(actualOffset + limit, result.total)} of ${result.total}`
          }
        })

      case 'real-time':
        console.log('Executing schema-safe real-time attendance query...')
        
        result = await getRealTimeAttendancePaginatedSafe(pool, {
          school_id: parseInt(school_id),
          date_from: date_from ? new Date(date_from) : null,
          date_to: date_to ? new Date(date_to) : null,
          limit,
          offset: actualOffset
        })
        
        return res.json({
          success: true,
          data: result.data,
          queryTime: result.queryTime,
          totalTime: Date.now() - startTime,
          pagination: {
            page: parseInt(page),
            limit: limit,
            offset: actualOffset,
            total: result.total,
            totalPages: Math.ceil(result.total / limit),
            hasMore: (actualOffset + limit) < result.total,
            showing: `${actualOffset + 1}-${Math.min(actualOffset + limit, result.total)} of ${result.total}`
          }
        })

      case 'dashboard-stats':
        console.log('Executing schema-safe dashboard stats query...')
        
        result = await getDashboardStatsOptimizedSafe(pool, {
          school_id: parseInt(school_id),
          date_from: date_from ? new Date(date_from) : null,
          date_to: date_to ? new Date(date_to) : null
        })
        
        return res.json({
          success: true,
          data: result.data,
          queryTime: result.queryTime,
          totalTime: Date.now() - startTime,
          pagination: null // No pagination for stats
        })

      case 'health-check':
        // Simple health check
        const healthResult = await pool.request().query('SELECT 1 as healthy')
        
        return res.json({
          success: true,
          data: { status: 'healthy', connections: 'active' },
          queryTime: Date.now() - startTime,
          totalTime: Date.now() - startTime
        })

      default:
        return res.status(400).json({
          error: 'Invalid analytics type',
          validTypes: ['student-list', 'attendance-summary', 'real-time', 'dashboard-stats', 'health-check']
        })
    }

  } catch (error) {
    const totalTime = Date.now() - startTime
    
    console.error('Working Analytics API Error:', {
      type,
      school_id,
      error: error.message,
      totalTime,
      timestamp: new Date().toISOString()
    })

    // Categorize different types of errors
    let statusCode = 500
    let errorType = 'INTERNAL_ERROR'

    if (error.message.includes('timeout')) {
      statusCode = 504
      errorType = 'TIMEOUT_ERROR'
    } else if (error.message.includes('RESOURCE_SEMAPHORE')) {
      statusCode = 503
      errorType = 'RESOURCE_EXHAUSTION'
    } else if (error.message.includes('Invalid object name') || error.message.includes('Invalid column name')) {
      statusCode = 500
      errorType = 'DATABASE_SCHEMA_ERROR'
    }

    res.status(statusCode).json({
      success: false,
      error: error.message,
      errorType: errorType,
      type: type,
      totalTime: totalTime,
      timestamp: new Date().toISOString(),
      suggestion: getSuggestionForError(errorType)
    })
  }
}

// Helper function to provide suggestions for different error types
function getSuggestionForError(errorType) {
  switch (errorType) {
    case 'TIMEOUT_ERROR':
      return 'Query took too long. Try reducing the date range or using pagination with smaller limits.'
    
    case 'RESOURCE_EXHAUSTION':
      return 'Database is under heavy load. Try again in a few moments or contact system administrator.'
    
    case 'DATABASE_SCHEMA_ERROR':
      return 'Database schema issue detected. This API uses only existing columns.'
    
    default:
      return 'An unexpected error occurred. Please try again or contact support.'
  }
}