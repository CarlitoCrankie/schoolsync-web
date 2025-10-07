// pages/api/notifications.js - Simplified version for debugging
const { getPool, sql } = require('../../lib/database')

export default async function handler(req, res) {
  console.log('Notifications API called with:', req.method, req.body)
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { action } = req.body

  try {
    let result = {}

    switch (action) {
      case 'sync_local_contacts':
        result = await syncLocalContactsToCloud()
        break
      case 'test_notification_apis':
        result = await testNotificationAPIs(req.body.data)
        break
      default:
        return res.status(400).json({ error: 'Invalid action' })
    }

    res.json({
      success: true,
      action,
      result,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Notification API error:', error)
    res.status(500).json({
      success: false,
      error: error.message,
      action,
      timestamp: new Date().toISOString()
    })
  }
}

// Simple test function first
async function testNotificationAPIs(data) {
  const { testEmail, testPhone } = data

  return {
    testResults: {
      email: { 
        available: !!(process.env.SMTP_USER && process.env.SMTP_PASSWORD),
        message: 'Email API would be tested here'
      },
      sms: { 
        available: !!process.env.SMS_API_KEY,
        message: 'SMS API would be tested here'
      }
    },
    environmentCheck: {
      emailConfigured: !!(process.env.SMTP_USER && process.env.SMTP_PASSWORD),
      smsConfigured: !!process.env.SMS_API_KEY,
      env: {
        SMTP_USER: process.env.SMTP_USER ? 'Set' : 'Missing',
        SMTP_PASSWORD: process.env.SMTP_PASSWORD ? 'Set' : 'Missing',
        SMS_API_KEY: process.env.SMS_API_KEY ? 'Set' : 'Missing',
        SMS_SENDER_ID: process.env.SMS_SENDER_ID || 'Default'
      }
    }
  }
}

// Simple sync function for testing
async function syncLocalContactsToCloud() {
  try {
    const pool = await getPool()

    // Check if we can connect to database
    const testQuery = await pool.request().query('SELECT COUNT(*) as StudentCount FROM Students WHERE IsActive = 1')
    
    return {
      totalStudents: testQuery.recordset[0].StudentCount,
      successCount: 0,
      errorCount: 0,
      message: 'Database connection successful - sync function simplified for testing',
      syncResults: []
    }

  } catch (error) {
    console.error('Database error:', error)
    throw new Error(`Database connection failed: ${error.message}`)
  }
}