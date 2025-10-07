// pages/api/schools/index.js
const { getPool, sql } = require('../../../lib/database');

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const pool = await getPool();
    const request = pool.request();

    const result = await request.query(`
      SELECT 
        s.SchoolID as id,
        s.Name as name,
        s.Location as location,
        s.Status as status,
        CASE WHEN st.ThemeID IS NOT NULL THEN 1 ELSE 0 END as has_theme
      FROM Schools s
      LEFT JOIN SchoolThemes st ON s.SchoolID = st.SchoolID
      WHERE s.Status = 'active'
      ORDER BY s.Name
    `);

    return res.status(200).json({
      success: true,
      schools: result.recordset
    });
  } catch (error) {
    console.error('Error fetching schools:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch schools'
    });
  }
}