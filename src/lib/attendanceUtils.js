// lib/attendanceUtils.js - Enhanced version building on your existing utilities

/**
 * Calculate attendance status based on school time settings
 * @param {string} scanTime - ISO timestamp of when student scanned
 * @param {string} status - 'IN' or 'OUT'
 * @param {Object} timeSettings - School time settings
 * @returns {Object} - Status information
 */
export function calculateAttendanceStatus(scanTime, status, timeSettings) {
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
    // Check-in status
    if (scanTimeOnly <= school_start_time) {
      statusType = 'early-arrival'  // Updated to match frontend expectations
      statusLabel = 'Early Arrival'
      message = `Arrived early at ${scanTimeOnly}`
    } else if (scanTimeOnly <= late_arrival_time) {
      statusType = 'on-time'  // Updated to match frontend expectations
      statusLabel = 'On Time'
      message = `Arrived on time at ${scanTimeOnly}`
    } else {
      statusType = 'late'
      statusLabel = 'Late Arrival'
      message = `Arrived late at ${scanTimeOnly} (after ${late_arrival_time})`
    }
  } else if (status === 'OUT') {
    // Check-out status
    if (scanTimeOnly < early_departure_time) {
      statusType = 'early-departure'  // Updated to match frontend expectations
      statusLabel = 'Early Departure'
      message = `Left early at ${scanTimeOnly} (before ${early_departure_time})`
    } else if (scanTimeOnly < school_end_time) {
      statusType = 'normal-departure'  // Updated to match frontend expectations
      statusLabel = 'Normal Departure'
      message = `Left at ${scanTimeOnly}`
    } else {
      statusType = 'after-hours'  // Updated to match frontend expectations
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

/**
 * Get CSS classes for attendance status badges
 * @param {string} statusType - Type of status (normal, late, early, etc.)
 * @returns {string} - CSS classes
 */
export function getStatusBadgeClasses(statusType) {
  const baseClasses = 'px-2 py-1 rounded-full text-xs font-medium'
  
  switch (statusType) {
    case 'late':
      return `${baseClasses} bg-red-100 text-red-800`
    case 'early-arrival':  // Updated
    case 'early':  // Keep backward compatibility
      return `${baseClasses} bg-blue-100 text-blue-800`
    case 'on-time':  // Added
      return `${baseClasses} bg-green-100 text-green-800`
    case 'early-departure':  // Updated
    case 'early_departure':  // Keep backward compatibility
      return `${baseClasses} bg-orange-100 text-orange-800`
    case 'normal-departure':  // Added
      return `${baseClasses} bg-green-100 text-green-800`
    case 'after-hours':  // Updated
    case 'late_departure':  // Keep backward compatibility
      return `${baseClasses} bg-purple-100 text-purple-800`
    case 'normal':
    default:
      return `${baseClasses} bg-gray-100 text-gray-800`
  }
}

/**
 * Get status icon for attendance status (NEW ADDITION)
 * @param {string} statusType - Type of status
 * @returns {string} - Emoji icon
 */
export function getStatusIcon(statusType) {
  switch (statusType) {
    case 'late':
      return '🔴'
    case 'early-arrival':
    case 'early':
      return '🔵'
    case 'on-time':
      return '🟢'
    case 'early-departure':
    case 'early_departure':
      return '🟠'
    case 'normal-departure':
      return '🟢'
    case 'after-hours':
    case 'late_departure':
      return '🟣'
    case 'normal':
    default:
      return '⚪'
  }
}

/**
 * Format time for display (NEW ADDITION)
 * @param {string} timestamp - ISO timestamp
 * @returns {string} - Formatted time
 */
export function formatTime(timestamp) {
  if (!timestamp) return 'N/A'
  
  const date = new Date(timestamp)
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  })
}

/**
 * Format date for display (NEW ADDITION)
 * @param {string} timestamp - ISO timestamp
 * @returns {string} - Formatted date
 */
export function formatDate(timestamp) {
  if (!timestamp) return 'N/A'
  
  const date = new Date(timestamp)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

/**
 * Get status summary for multiple records (NEW ADDITION - for dashboard stats)
 * @param {Array} attendanceRecords - Array of attendance records
 * @returns {Object} - Status summary
 */
export function getStatusSummary(attendanceRecords) {
  const summary = {
    total: attendanceRecords.length,
    on_time: 0,
    late: 0,
    early_departure: 0,
    punctuality_rate: 0
  }
  
  attendanceRecords.forEach(record => {
    switch (record.statusType) {
      case 'on-time':
        summary.on_time++
        break
      case 'late':
        summary.late++
        break
      case 'early-departure':
      case 'early_departure':
        summary.early_departure++
        break
    }
  })
  
  // Calculate punctuality rate (on-time check-ins)
  const checkIns = attendanceRecords.filter(r => r.status === 'IN')
  if (checkIns.length > 0) {
    summary.punctuality_rate = Math.round((summary.on_time / checkIns.length) * 100)
  }
  
  return summary
}

/**
 * Calculate daily attendance summary for a student
 * @param {Array} attendanceRecords - Array of attendance records for the day
 * @param {Object} timeSettings - School time settings
 * @returns {Object} - Daily summary
 */
export function calculateDailyAttendanceSummary(attendanceRecords, timeSettings) {
  if (!attendanceRecords || attendanceRecords.length === 0) {
    return {
      present: false,
      checkInTime: null,
      checkOutTime: null,
      arrivalStatus: null,
      departureStatus: null,
      totalTime: null
    }
  }

  const checkIns = attendanceRecords.filter(r => r.status === 'IN')
  const checkOuts = attendanceRecords.filter(r => r.status === 'OUT')
  
  const firstCheckIn = checkIns.length > 0 ? checkIns[0] : null
  const lastCheckOut = checkOuts.length > 0 ? checkOuts[checkOuts.length - 1] : null

  let arrivalStatus = null
  let departureStatus = null

  if (firstCheckIn) {
    arrivalStatus = calculateAttendanceStatus(firstCheckIn.scanTime || firstCheckIn.time, 'IN', timeSettings)
  }

  if (lastCheckOut) {
    departureStatus = calculateAttendanceStatus(lastCheckOut.scanTime || lastCheckOut.time, 'OUT', timeSettings)
  }

  // Calculate total time if both check-in and check-out exist
  let totalTime = null
  if (firstCheckIn && lastCheckOut) {
    const checkInTime = new Date(firstCheckIn.scanTime || firstCheckIn.time)
    const checkOutTime = new Date(lastCheckOut.scanTime || lastCheckOut.time)
    const diffMs = checkOutTime - checkInTime
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
    totalTime = `${diffHours}h ${diffMinutes}m`
  }

  return {
    present: checkIns.length > 0,
    checkInTime: firstCheckIn ? (firstCheckIn.scanTime || firstCheckIn.time) : null,
    checkOutTime: lastCheckOut ? (lastCheckOut.scanTime || lastCheckOut.time) : null,
    arrivalStatus,
    departureStatus,
    totalTime,
    totalCheckIns: checkIns.length,
    totalCheckOuts: checkOuts.length
  }
}

/**
 * Apply time settings to attendance records
 * @param {Array} attendanceRecords - Raw attendance records
 * @param {Object} timeSettings - School time settings
 * @returns {Array} - Enhanced attendance records with status info
 */
export function enhanceAttendanceWithTimeSettings(attendanceRecords, timeSettings) {
  if (!attendanceRecords || !Array.isArray(attendanceRecords)) {
    return []
  }

  return attendanceRecords.map(record => {
    const statusInfo = calculateAttendanceStatus(
      record.scan_time || record.scanTime || record.time || record.created_at,
      record.status,
      timeSettings
    )

    return {
      ...record,
      statusLabel: statusInfo.statusLabel,
      statusType: statusInfo.statusType,
      message: statusInfo.message,
      enhancedScanTime: statusInfo.scanTime
    }
  })
}

/**
 * Helper function to get minutes difference between two times (NEW ADDITION)
 * @param {string} time1 - HH:MM format
 * @param {string} time2 - HH:MM format
 * @returns {number} - Minutes difference
 */
export function getMinutesDifference(time1, time2) {
  const [h1, m1] = time1.split(':').map(Number)
  const [h2, m2] = time2.split(':').map(Number)
  return Math.abs((h2 * 60 + m2) - (h1 * 60 + m1))
}