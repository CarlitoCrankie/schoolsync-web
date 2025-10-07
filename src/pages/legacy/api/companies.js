// pages/api/companies.js - Companies CRUD API
const { getPool, sql } = require('../../lib/database')

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  try {
    switch (req.method) {
      case 'GET':
        return await handleGet(req, res)
      case 'POST':
        return await handlePost(req, res)
      case 'PUT':
        return await handlePut(req, res)
      case 'DELETE':
        return await handleDelete(req, res)
      default:
        return res.status(405).json({ error: 'Method not allowed' })
    }
  } catch (error) {
    console.error('Companies API error:', error)
    res.status(500).json({
      error: error.message,
      timestamp: new Date().toISOString()
    })
  }
}

async function handleGet(req, res) {
  const { company_id, include_stats, search } = req.query
  const pool = await getPool()

  let query = `
    SELECT 
      c.CompanyID,
      c.Name as CompanyName,
      c.CreatedAt
  `
  
  if (include_stats === 'true') {
    query += `,
      (SELECT COUNT(*) FROM Schools s WHERE s.CompanyID = c.CompanyID) as TotalSchools,
      (SELECT COUNT(*) FROM Students st JOIN Schools s ON st.SchoolID = s.SchoolID WHERE s.CompanyID = c.CompanyID) as TotalStudents,
      (SELECT COUNT(*) FROM Students st JOIN Schools s ON st.SchoolID = s.SchoolID WHERE s.CompanyID = c.CompanyID AND st.IsActive = 1) as ActiveStudents,
      (SELECT COUNT(*) FROM dbo.Attendance a JOIN Schools s ON a.SchoolID = s.SchoolID WHERE s.CompanyID = c.CompanyID AND CAST(a.CreatedAt as DATE) = CAST(GETDATE() as DATE)) as TodayAttendance,
      (SELECT COUNT(*) FROM dbo.Attendance a JOIN Schools s ON a.SchoolID = s.SchoolID WHERE s.CompanyID = c.CompanyID AND a.CreatedAt > DATEADD(day, -7, GETDATE())) as WeekAttendance,
      (SELECT COUNT(*) FROM dbo.Attendance a JOIN Schools s ON a.SchoolID = s.SchoolID WHERE s.CompanyID = c.CompanyID AND a.CreatedAt > DATEADD(day, -30, GETDATE())) as MonthAttendance,
      (SELECT COUNT(*) FROM SyncAgentStatus sas JOIN Schools s ON sas.SchoolID = s.SchoolID WHERE s.CompanyID = c.CompanyID) as TotalSyncAgents,
      (SELECT COUNT(*) FROM SyncAgentStatus sas JOIN Schools s ON sas.SchoolID = s.SchoolID WHERE s.CompanyID = c.CompanyID AND sas.LastHeartbeat > DATEADD(MINUTE, -10, GETDATE())) as OnlineSyncAgents
    `
  }
  
  query += ` FROM Companies c`
  
  const conditions = []
  const request = pool.request()
  
  if (company_id) {
    conditions.push('c.CompanyID = @companyId')
    request.input('companyId', sql.Int, parseInt(company_id))
  }
  
  if (search) {
    conditions.push('c.Name LIKE @search')
    request.input('search', sql.NVarChar, `%${search}%`)
  }
  
  if (conditions.length > 0) {
    query += ` WHERE ${conditions.join(' AND ')}`
  }
  
  query += ` ORDER BY c.Name`
  
  const result = await request.query(query)
  
  const companies = result.recordset.map(company => ({
    company_id: company.CompanyID,
    name: company.CompanyName,
    created_at: company.CreatedAt,
    ...(include_stats === 'true' && {
      stats: {
        total_schools: company.TotalSchools || 0,
        total_students: company.TotalStudents || 0,
        active_students: company.ActiveStudents || 0,
        today_attendance: company.TodayAttendance || 0,
        week_attendance: company.WeekAttendance || 0,
        month_attendance: company.MonthAttendance || 0,
        total_sync_agents: company.TotalSyncAgents || 0,
        online_sync_agents: company.OnlineSyncAgents || 0,
        offline_sync_agents: (company.TotalSyncAgents || 0) - (company.OnlineSyncAgents || 0)
      }
    })
  }))

  res.json({
    success: true,
    data: company_id ? companies[0] : companies,
    total: companies.length,
    timestamp: new Date().toISOString()
  })
}

async function handlePost(req, res) {
  const { name } = req.body
  
  if (!name) {
    return res.status(400).json({ error: 'Company name is required' })
  }

  const pool = await getPool()
  
  // Check if company name already exists
  const nameCheck = await pool.request()
    .input('name', sql.NVarChar, name)
    .query('SELECT CompanyID FROM Companies WHERE Name = @name')
    
  if (nameCheck.recordset.length > 0) {
    return res.status(400).json({ error: 'Company name already exists' })
  }
  
  const result = await pool.request()
    .input('name', sql.NVarChar, name)
    .query(`
      INSERT INTO Companies (Name, CreatedAt)
      OUTPUT INSERTED.*
      VALUES (@name, GETDATE())
    `)

  const newCompany = result.recordset[0]

  res.status(201).json({
    success: true,
    data: {
      company_id: newCompany.CompanyID,
      name: newCompany.Name,
      created_at: newCompany.CreatedAt
    },
    message: 'Company created successfully',
    timestamp: new Date().toISOString()
  })
}

async function handlePut(req, res) {
  const { company_id } = req.query
  const { name } = req.body
  
  if (!company_id) {
    return res.status(400).json({ error: 'Company ID is required' })
  }
  
  if (!name) {
    return res.status(400).json({ error: 'Company name is required' })
  }

  const pool = await getPool()
  
  // Check if company exists
  const existingCompany = await pool.request()
    .input('companyId', sql.Int, parseInt(company_id))
    .query('SELECT CompanyID, Name FROM Companies WHERE CompanyID = @companyId')
    
  if (existingCompany.recordset.length === 0) {
    return res.status(404).json({ error: 'Company not found' })
  }

  // Check if new name already exists (for different company)
  const nameCheck = await pool.request()
    .input('name', sql.NVarChar, name)
    .input('companyId', sql.Int, parseInt(company_id))
    .query('SELECT CompanyID FROM Companies WHERE Name = @name AND CompanyID != @companyId')
    
  if (nameCheck.recordset.length > 0) {
    return res.status(400).json({ error: 'Company name already exists' })
  }
  
  const result = await pool.request()
    .input('companyId', sql.Int, parseInt(company_id))
    .input('name', sql.NVarChar, name)
    .query(`
      UPDATE Companies 
      SET Name = @name
      OUTPUT INSERTED.*
      WHERE CompanyID = @companyId
    `)

  const updatedCompany = result.recordset[0]

  res.json({
    success: true,
    data: {
      company_id: updatedCompany.CompanyID,
      name: updatedCompany.Name,
      created_at: updatedCompany.CreatedAt
    },
    message: 'Company updated successfully',
    timestamp: new Date().toISOString()
  })
}

async function handleDelete(req, res) {
  const { company_id } = req.query
  const { force_delete } = req.body
  
  if (!company_id) {
    return res.status(400).json({ error: 'Company ID is required' })
  }

  const pool = await getPool()
  
  // Check if company exists and get related data count
  const companyCheck = await pool.request()
    .input('companyId', sql.Int, parseInt(company_id))
    .query(`
      SELECT 
        c.CompanyID, 
        c.Name,
        (SELECT COUNT(*) FROM Schools s WHERE s.CompanyID = c.CompanyID) as SchoolCount,
        (SELECT COUNT(*) FROM Students st JOIN Schools s ON st.SchoolID = s.SchoolID WHERE s.CompanyID = c.CompanyID) as StudentCount,
        (SELECT COUNT(*) FROM dbo.Attendance a JOIN Schools s ON a.SchoolID = s.SchoolID WHERE s.CompanyID = c.CompanyID) as AttendanceCount
      FROM Companies c 
      WHERE c.CompanyID = @companyId
    `)
    
  if (companyCheck.recordset.length === 0) {
    return res.status(404).json({ error: 'Company not found' })
  }

  const company = companyCheck.recordset[0]
  
  // Prevent deletion if there are related records (unless force delete)
  if ((company.SchoolCount > 0 || company.StudentCount > 0 || company.AttendanceCount > 0) && !force_delete) {
    return res.status(400).json({
      error: 'Cannot delete company with related data',
      message: `Company "${company.Name}" has ${company.SchoolCount} schools, ${company.StudentCount} students, and ${company.AttendanceCount} attendance records`,
      note: 'Use force_delete: true to cascade delete all related data',
      related_data: {
        schools: company.SchoolCount,
        students: company.StudentCount,
        attendance_records: company.AttendanceCount
      }
    })
  }

  // Force delete - cascade delete all related data
  if (force_delete) {
    const transaction = pool.transaction()
    
    try {
      await transaction.begin()
      
      // Delete attendance records
      await transaction.request()
        .input('companyId', sql.Int, parseInt(company_id))
        .query(`
          DELETE a FROM dbo.Attendance a 
          JOIN Schools s ON a.SchoolID = s.SchoolID 
          WHERE s.CompanyID = @companyId
        `)
      
      // Delete sync agent status
      await transaction.request()
        .input('companyId', sql.Int, parseInt(company_id))
        .query(`
          DELETE sas FROM SyncAgentStatus sas
          JOIN Schools s ON sas.SchoolID = s.SchoolID 
          WHERE s.CompanyID = @companyId
        `)
      
      // Delete students
      await transaction.request()
        .input('companyId', sql.Int, parseInt(company_id))
        .query(`
          DELETE st FROM Students st 
          JOIN Schools s ON st.SchoolID = s.SchoolID 
          WHERE s.CompanyID = @companyId
        `)
      
      // Delete schools
      await transaction.request()
        .input('companyId', sql.Int, parseInt(company_id))
        .query('DELETE FROM Schools WHERE CompanyID = @companyId')
      
      // Delete company
      await transaction.request()
        .input('companyId', sql.Int, parseInt(company_id))
        .query('DELETE FROM Companies WHERE CompanyID = @companyId')
      
      await transaction.commit()
      
      return res.json({
        success: true,
        message: `Company "${company.Name}" and all related data deleted permanently`,
        action: 'cascade_delete',
        deleted_data: {
          schools: company.SchoolCount,
          students: company.StudentCount,
          attendance_records: company.AttendanceCount
        },
        timestamp: new Date().toISOString()
      })
      
    } catch (error) {
      await transaction.rollback()
      throw error
    }
  }

  // Simple delete (no related data)
  await pool.request()
    .input('companyId', sql.Int, parseInt(company_id))
    .query('DELETE FROM Companies WHERE CompanyID = @companyId')

  res.json({
    success: true,
    message: `Company "${company.Name}" deleted permanently`,
    action: 'simple_delete',
    timestamp: new Date().toISOString()
  })
}