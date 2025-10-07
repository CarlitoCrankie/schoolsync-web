// pages/api/export-attendance.js - Excel Export API
const ExcelJS = require('exceljs')

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { data, filters, timeSettings } = req.body

    // Create new workbook and worksheet
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('Attendance Report')

    // Set worksheet properties
    worksheet.properties.defaultRowHeight = 20

    // Add header information
    worksheet.addRow(['Attendance Report'])
    worksheet.addRow([`School: ${filters.schoolName}`])
    worksheet.addRow([`Date Range: ${filters.dateFrom} to ${filters.dateTo}`])
    worksheet.addRow([`Generated: ${new Date().toLocaleString()}`])
    
    if (filters.statusFilter !== 'all') {
      worksheet.addRow([`Status Filter: ${filters.statusFilter}`])
    }
    if (filters.gradeFilter !== 'all') {
      worksheet.addRow([`Grade Filter: ${filters.gradeFilter}`])
    }

    // Add school time settings if available
    if (timeSettings) {
      worksheet.addRow([])
      worksheet.addRow(['School Time Settings:'])
      worksheet.addRow([`School Hours: ${timeSettings.school_start_time} - ${timeSettings.school_end_time}`])
      worksheet.addRow([`Late Threshold: ${timeSettings.late_arrival_time}`])
      worksheet.addRow([`Early Departure: ${timeSettings.early_departure_time}`])
    }

    // Add empty row before data
    worksheet.addRow([])

    // Define columns
    const columns = [
      { header: 'Student Name', key: 'studentName', width: 25 },
      { header: 'Grade', key: 'grade', width: 10 },
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Time', key: 'time', width: 12 },
      { header: 'Action', key: 'action', width: 12 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Notes', key: 'notes', width: 30 }
    ]

    worksheet.columns = columns

    // Style the header row
    const headerRow = worksheet.getRow(worksheet.rowCount)
    headerRow.font = { bold: true, size: 12 }
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE6F2FF' }
    }

    // Add data rows
    data.forEach(record => {
      const row = worksheet.addRow({
        studentName: record.student_name || record.studentName,
        grade: record.grade || 'N/A',
        date: new Date(record.scan_time || record.scanTime).toLocaleDateString(),
        time: new Date(record.scan_time || record.scanTime).toLocaleTimeString(),
        action: record.status === 'IN' ? 'Check In' : 'Check Out',
        status: record.statusLabel || (record.status === 'IN' ? 'Check In' : 'Check Out'),
        notes: record.message || ''
      })

      // Color code rows based on status
      if (record.statusType) {
        let fillColor = 'FFFFFFFF' // White default
        
        switch (record.statusType) {
          case 'late':
            fillColor = 'FFFFEAEA' // Light red
            break
          case 'early-arrival':
            fillColor = 'FFEAF4FF' // Light blue
            break
          case 'on-time':
            fillColor = 'FFEAFAF1' // Light green
            break
          case 'early-departure':
            fillColor = 'FFFFF4E6' // Light orange
            break
          case 'after-hours':
            fillColor = 'FFF3E8FF' // Light purple
            break
        }

        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: fillColor }
        }
      }
    })

    // Add borders to all cells
    worksheet.eachRow((row, rowNumber) => {
      row.eachCell((cell, colNumber) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        }
      })
    })

    // Add summary at the end
    worksheet.addRow([])
    worksheet.addRow(['Summary:'])
    worksheet.addRow([`Total Records: ${data.length}`])
    
    if (timeSettings) {
      const lateCount = data.filter(r => r.statusType === 'late').length
      const onTimeCount = data.filter(r => r.statusType === 'on-time' || r.statusType === 'early-arrival').length
      const earlyDepartureCount = data.filter(r => r.statusType === 'early-departure').length
      
      worksheet.addRow([`On Time: ${onTimeCount}`])
      worksheet.addRow([`Late Arrivals: ${lateCount}`])
      worksheet.addRow([`Early Departures: ${earlyDepartureCount}`])
      
      // Grade breakdown
      const gradeBreakdown = {}
      data.forEach(record => {
        const grade = record.grade || 'N/A'
        gradeBreakdown[grade] = (gradeBreakdown[grade] || 0) + 1
      })
      
      worksheet.addRow([])
      worksheet.addRow(['Grade Breakdown:'])
      Object.entries(gradeBreakdown).forEach(([grade, count]) => {
        worksheet.addRow([`Grade ${grade}: ${count} records`])
      })
    }

    // Set response headers for file download
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', `attachment; filename="attendance-${filters.dateFrom}-to-${filters.dateTo}.xlsx"`)

    // Write to response
    await workbook.xlsx.write(res)
    res.end()

  } catch (error) {
    console.error('Export error:', error)
    res.status(500).json({ error: 'Failed to generate Excel file: ' + error.message })
  }
}