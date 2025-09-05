// pages/api/debug-env.js - Check if .env.local is being read
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Read all relevant environment variables
    const envVars = {
      // Local database variables
      LOCAL_HOST: process.env.LOCAL_HOST,
      LOCAL_DB: process.env.LOCAL_DB, 
      DB_USER: process.env.DB_USER,
      DB_PASSWORD: process.env.DB_PASSWORD ? '***SET***' : undefined,
      
      // Cloud database variables  
      RDS_SERVER: process.env.RDS_SERVER,
      RDS_DB: process.env.RDS_DB,
      RDS_USER: process.env.RDS_USER,
      RDS_PASSWORD: process.env.RDS_PASSWORD ? '***SET***' : undefined,
      
      // Other variables
      SCHOOL_ID: process.env.SCHOOL_ID,
      SMTP_USER: process.env.SMTP_USER,
      SMTP_PASSWORD: process.env.SMTP_PASSWORD ? '***SET***' : undefined,
      SMS_API_KEY: process.env.SMS_API_KEY ? '***SET***' : undefined,
      SMS_SENDER_ID: process.env.SMS_SENDER_ID,
      JWT_SECRET_KEY: process.env.JWT_SECRET_KEY ? '***SET***' : undefined,
      
      // Next.js environment info
      NODE_ENV: process.env.NODE_ENV,
      NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL
    }

    // Check which variables are missing
    const missingVars = []
    const setVars = []
    const emptyVars = []

    Object.entries(envVars).forEach(([key, value]) => {
      if (value === undefined) {
        missingVars.push(key)
      } else if (value === '' || value === null) {
        emptyVars.push(key)
      } else {
        setVars.push(key)
      }
    })

    // Check if .env.local file exists (indirectly)
    const hasLocalEnvVars = !!(process.env.LOCAL_HOST || process.env.LOCAL_DB)
    
    // Analyze local database configuration specifically
    const localDbAnalysis = {
      LOCAL_HOST: {
        value: process.env.LOCAL_HOST,
        issue: !process.env.LOCAL_HOST ? 'Not set' : 
               process.env.LOCAL_HOST.includes('(local)') ? 'Uses (local) - try localhost\\SQLEXPRESS' : 'OK'
      },
      LOCAL_DB: {
        value: process.env.LOCAL_DB,
        issue: !process.env.LOCAL_DB ? 'Not set' : 'OK'
      },
      DB_USER: {
        value: process.env.DB_USER || 'Empty (Windows Auth)',
        issue: 'OK - Empty means Windows Authentication'
      },
      DB_PASSWORD: {
        value: process.env.DB_PASSWORD || 'Empty (Windows Auth)', 
        issue: 'OK - Empty means Windows Authentication'
      }
    }

    // Test different local host formats
    const suggestedFormats = [
      'localhost\\SQLEXPRESS',
      '.\\SQLEXPRESS',
      '127.0.0.1\\SQLEXPRESS',
      'YOUR-COMPUTER-NAME\\SQLEXPRESS'
    ]

    res.json({
      success: true,
      environment: {
        nodeEnv: process.env.NODE_ENV,
        platform: process.platform,
        hasLocalEnvFile: hasLocalEnvVars
      },
      variables: {
        all: envVars,
        set: setVars,
        missing: missingVars,
        empty: emptyVars
      },
      localDatabase: {
        analysis: localDbAnalysis,
        currentValue: process.env.LOCAL_HOST,
        suggestedFormats,
        recommendation: process.env.LOCAL_HOST ? 
          `Try changing LOCAL_HOST from "${process.env.LOCAL_HOST}" to "localhost\\SQLEXPRESS"` :
          'LOCAL_HOST is not set in .env.local'
      },
      troubleshooting: {
        envFileLocation: 'Should be in project root: .env.local',
        commonIssues: [
          '.env.local file not in project root',
          'File named incorrectly (should be .env.local, not .env)',
          'Server not restarted after changing .env.local',
          'SQL Server Express not running',
          'Incorrect server name format'
        ],
        nextSteps: [
          '1. Verify .env.local exists in project root',
          '2. Check file contents match expected format', 
          '3. Restart development server (npm run dev)',
          '4. Test with suggested LOCAL_HOST formats'
        ]
      }
    })

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Error reading environment variables'
    })
  }
}