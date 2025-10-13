import { useState, useEffect, useMemo } from 'react';
import { Card } from '../ui/card';

interface AttendanceRecord {
  id: number;
  scanTime: string;
  date?: string;
  status: string;
  statusType?: string;
  statusLabel?: string;
  message?: string;
}

interface ParentAttendanceTabProps {
  attendanceData: AttendanceRecord[];
  studentId: number;
  initialStats?: {  // ✅ Add this
    attendanceRate?: number;
    presentDays?: number;
    lateDays?: number;
    absentDays?: number;
    totalDays?: number;
  };
}

export default function ParentAttendanceTab({ 
  attendanceData, 
  studentId,
  initialStats 
}: ParentAttendanceTabProps) {
  const [viewMode, setViewMode] = useState<'present' | 'absent'>('present');
  const [dateFilter, setDateFilter] = useState<'all' | 'week' | 'month' | 'year'>('all'); // ✅ Default to 'all'
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [statusFilter, setStatusFilter] = useState<'all' | 'late' | 'on-time' | 'early'>('all');

  // Get filtered attendance based on date range
  const filteredByDate = useMemo(() => {
    if (!attendanceData || attendanceData.length === 0) return [];

    const now = new Date();
    return attendanceData.filter(record => {
      const recordDate = new Date(record.scanTime || record.date);
      
      switch (dateFilter) {
        case 'week':
          const weekAgo = new Date(now);
          weekAgo.setDate(weekAgo.getDate() - 7);
          return recordDate >= weekAgo;
        
        case 'month':
          return recordDate.getMonth() === selectedMonth && 
                 recordDate.getFullYear() === selectedYear;
        
        case 'year':
          return recordDate.getFullYear() === selectedYear;
        
        default:
          return true;
      }
    });
  }, [attendanceData, dateFilter, selectedMonth, selectedYear]);

  // Calculate absent days
  const absentDays = useMemo(() => {
    if (!attendanceData || attendanceData.length === 0) return [];

    const now = new Date();
    let startDate: Date;
    let endDate = new Date(now);

    switch (dateFilter) {
      case 'week':
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate = new Date(selectedYear, selectedMonth, 1);
        endDate = new Date(selectedYear, selectedMonth + 1, 0);
        break;
      case 'year':
        startDate = new Date(selectedYear, 0, 1);
        endDate = new Date(selectedYear, 11, 31);
        break;
      default:
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 90);
    }

    if (endDate > now) {
      endDate = now;
    }

    const presentDates = new Set(
      attendanceData.map(record => {
        const date = new Date(record.scanTime || record.date);
        return date.toDateString();
      })
    );

    const absent = [];
    const current = new Date(startDate);

    while (current <= endDate) {
      const dayOfWeek = current.getDay();
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        const dateString = current.toDateString();
        if (!presentDates.has(dateString)) {
          absent.push(new Date(current));
        }
      }
      current.setDate(current.getDate() + 1);
    }

    return absent.sort((a, b) => b.getTime() - a.getTime());
  }, [attendanceData, dateFilter, selectedMonth, selectedYear]);

  const filteredAttendance = useMemo(() => {
    if (statusFilter === 'all') return filteredByDate;
    
    return filteredByDate.filter(record => {
      switch (statusFilter) {
        case 'late':
          return record.statusType === 'late';
        case 'on-time':
          return record.statusType === 'on-time' || record.statusType === 'early-arrival';
        case 'early':
          return record.statusType === 'early-departure';
        default:
          return true;
      }
    });
  }, [filteredByDate, statusFilter]);

  const sortedAttendance = useMemo(() => {
    return [...filteredAttendance].sort((a, b) => {
      const dateA = new Date(a.scanTime || a.date);
      const dateB = new Date(b.scanTime || b.date);
      return dateB.getTime() - dateA.getTime();
    });
  }, [filteredAttendance]);

const stats = useMemo(() => {
  // ✅ ALWAYS use backend stats if filter matches what backend provides
  // Backend provides 365 days of data, so "all" and "year" (current year) should match
  if (dateFilter === 'all' && initialStats) {
    console.log('📊 Using backend stats (All Time):', initialStats);
    return {
      totalSchoolDays: initialStats.totalDays || 0,
      presentDays: initialStats.presentDays || 0,
      absentDays: initialStats.absentDays || 0,
      attendanceRate: initialStats.attendanceRate || 0,
      lateCount: initialStats.lateDays || 0
    };
  }

  // For "This Year" with current year, use backend stats too
  const currentYear = new Date().getFullYear();
  if (dateFilter === 'year' && selectedYear === currentYear && initialStats) {
    console.log('📊 Using backend stats (This Year = Current Year):', initialStats);
    return {
      totalSchoolDays: initialStats.totalDays || 0,
      presentDays: initialStats.presentDays || 0,
      absentDays: initialStats.absentDays || 0,
      attendanceRate: initialStats.attendanceRate || 0,
      lateCount: initialStats.lateDays || 0
    };
  }

  // For other filters (week, month, or past years), calculate from filtered data
  console.log('📊 Calculating stats from filtered data:', {
    filter: dateFilter,
    selectedYear,
    currentYear,
    filteredRecords: filteredByDate.length,
    absentDaysCount: absentDays.length
  });

  // ✅ Count unique DAYS, not records
  const uniquePresentDays = new Set(
    filteredByDate.map(r => new Date(r.scanTime || r.date).toDateString())
  ).size;

  const absentCount = absentDays.length;
  const totalSchoolDays = uniquePresentDays + absentCount;
  const attendanceRate = totalSchoolDays > 0 
    ? Math.round((uniquePresentDays / totalSchoolDays) * 100) 
    : 0;

  // ✅ Count unique days with late arrivals, not total late records
  const uniqueLateDays = new Set(
    filteredByDate
      .filter(r => r.statusType === 'late')
      .map(r => new Date(r.scanTime || r.date).toDateString())
  ).size;

  return {
    totalSchoolDays,
    presentDays: uniquePresentDays,
    absentDays: absentCount,
    attendanceRate,
    lateCount: uniqueLateDays
  };
}, [filteredByDate, absentDays, dateFilter, selectedYear, initialStats]);

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const earliestYear = attendanceData.length > 0 
      ? new Date(Math.min(...attendanceData.map(r => new Date(r.scanTime || r.date).getTime()))).getFullYear()
      : currentYear;
    
    const yearList = [];
    for (let year = currentYear; year >= earliestYear; year--) {
      yearList.push(year);
    }
    return yearList;
  }, [attendanceData]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Attendance History</h2>
          <p className="text-gray-600 mt-1">Track present and absent days with detailed filtering</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200">
          <div className="text-3xl font-bold text-blue-900">{stats.attendanceRate}%</div>
          <div className="text-sm text-blue-700 font-medium mt-1">Attendance Rate</div>
        </Card>
        <Card className="p-4 bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200">
          <div className="text-3xl font-bold text-green-900">{stats.presentDays}</div>
          <div className="text-sm text-green-700 font-medium mt-1">Present Days</div>
        </Card>
        <Card className="p-4 bg-gradient-to-br from-red-50 to-red-100 border-2 border-red-200">
          <div className="text-3xl font-bold text-red-900">{stats.absentDays}</div>
          <div className="text-sm text-red-700 font-medium mt-1">Absent Days</div>
        </Card>
        <Card className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 border-2 border-orange-200">
          <div className="text-3xl font-bold text-orange-900">{stats.lateCount}</div>
          <div className="text-sm text-orange-700 font-medium mt-1">Late Arrivals</div>
        </Card>
      </div>

      {/* Filters Section */}
      <Card className="p-6">
        <div className="space-y-4">
          {/* View Mode Toggle */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">View Mode</label>
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode('present')}
                className={`flex-1 px-4 py-3 rounded-lg font-bold transition-all ${
                  viewMode === 'present'
                    ? 'bg-green-500 text-white shadow-lg scale-105'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Present Days ({stats.presentDays})
              </button>
              <button
                onClick={() => setViewMode('absent')}
                className={`flex-1 px-4 py-3 rounded-lg font-bold transition-all ${
                  viewMode === 'absent'
                    ? 'bg-red-500 text-white shadow-lg scale-105'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Absent Days ({stats.absentDays})
              </button>
            </div>
          </div>

          {/* Date Range Filter */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Time Period</label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setDateFilter('week')}
                className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${
                  dateFilter === 'week'
                    ? 'bg-indigo-600 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Last 7 Days
              </button>
              <button
                onClick={() => setDateFilter('month')}
                className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${
                  dateFilter === 'month'
                    ? 'bg-indigo-600 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                This Month
              </button>
              <button
                onClick={() => setDateFilter('year')}
                className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${
                  dateFilter === 'year'
                    ? 'bg-indigo-600 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                This Year
              </button>
              <button
                onClick={() => setDateFilter('all')}
                className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${
                  dateFilter === 'all'
                    ? 'bg-indigo-600 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                All Time
              </button>
            </div>
          </div>

          {/* Month/Year Selectors */}
          {(dateFilter === 'month' || dateFilter === 'year') && (
            <div className="flex gap-4">
              {dateFilter === 'month' && (
                <div className="flex-1">
                  <label className="block text-sm font-bold text-gray-700 mb-1">Month</label>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {months.map((month, index) => (
                      <option key={index} value={index}>{month}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="flex-1">
                <label className="block text-sm font-bold text-gray-700 mb-1">Year</label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {years.map((year) => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Status Filter (only for present days) */}
          {viewMode === 'present' && (
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Filter by Status</label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setStatusFilter('all')}
                  className={`px-4 py-2 rounded-full text-sm font-bold ${
                    statusFilter === 'all' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setStatusFilter('on-time')}
                  className={`px-4 py-2 rounded-full text-sm font-bold ${
                    statusFilter === 'on-time' ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  On Time
                </button>
                <button
                  onClick={() => setStatusFilter('late')}
                  className={`px-4 py-2 rounded-full text-sm font-bold ${
                    statusFilter === 'late' ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  Late
                </button>
                <button
                  onClick={() => setStatusFilter('early')}
                  className={`px-4 py-2 rounded-full text-sm font-bold ${
                    statusFilter === 'early' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  Early Out
                </button>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Content Area */}
      <Card className="p-6">
        {viewMode === 'present' ? (
          sortedAttendance.length > 0 ? (
            <div className="space-y-3">
              {(() => {
                // ✅ Group records by day
                const dayGroups = new Map();
                
                sortedAttendance.forEach(record => {
                  const date = new Date(record.scanTime || record.date);
                  const dayKey = date.toDateString();
                  
                  if (!dayGroups.has(dayKey)) {
                    dayGroups.set(dayKey, {
                      date: date,
                      checkIns: [],
                      checkOuts: [],
                      allRecords: []
                    });
                  }
                  
                  const dayData = dayGroups.get(dayKey);
                  dayData.allRecords.push(record);
                  
                  if (record.status === 'IN') {
                    dayData.checkIns.push(record);
                  } else if (record.status === 'OUT') {
                    dayData.checkOuts.push(record);
                  }
                });
                
                // Convert to array and render
                return Array.from(dayGroups.values()).map((dayData, index) => {
                  const date = dayData.date;
                  const hasMultipleCheckIns = dayData.checkIns.length > 1;
                  const hasMultipleCheckOuts = dayData.checkOuts.length > 1;
                  
                  // Get the primary status (from first check-in, or first record)
                  const primaryRecord = dayData.checkIns[0] || dayData.allRecords[0];
                  
                  return (
                    <div key={index} className="p-4 bg-gray-50 rounded-lg border-2 border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition-all">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-bold text-gray-900 text-lg">
                            {date.toLocaleDateString('en-US', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </div>
                          
                          {/* Show all check-in times */}
                          {dayData.checkIns.length > 0 && (
                            <div className="text-sm text-gray-600 mt-2">
                              <span className="font-medium text-blue-700">Check In{dayData.checkIns.length > 1 ? 's' : ''}:</span>
                              <div className="ml-2 space-y-1">
                                {dayData.checkIns.map((record, i) => (
                                  <div key={i} className="flex items-center gap-2">
                                    <span className="font-mono">
                                      {new Date(record.scanTime || record.date).toLocaleTimeString('en-US', {
                                        hour: 'numeric',
                                        minute: '2-digit',
                                        hour12: true
                                      })}
                                    </span>
                                    {record.statusType && (
                                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                                        record.statusType === 'late' ? 'bg-red-100 text-red-700' :
                                        'bg-green-100 text-green-700'
                                      }`}>
                                        {record.statusLabel || record.statusType}
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Show all check-out times */}
                          {dayData.checkOuts.length > 0 && (
                            <div className="text-sm text-gray-600 mt-2">
                              <span className="font-medium text-purple-700">Check Out{dayData.checkOuts.length > 1 ? 's' : ''}:</span>
                              <div className="ml-2 space-y-1">
                                {dayData.checkOuts.map((record, i) => (
                                  <div key={i} className="font-mono">
                                    {new Date(record.scanTime || record.date).toLocaleTimeString('en-US', {
                                      hour: 'numeric',
                                      minute: '2-digit',
                                      hour12: true
                                    })}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {primaryRecord.message && (
                            <div className="text-xs text-gray-500 mt-2 italic">{primaryRecord.message}</div>
                          )}
                          
                          {/* Warning for unusual patterns */}
                          {(hasMultipleCheckIns || hasMultipleCheckOuts) && (
                            <div className="mt-2 text-xs text-orange-600 font-medium">
                              ⚠️ Multiple {hasMultipleCheckIns ? 'check-ins' : 'check-outs'} recorded
                            </div>
                          )}
                        </div>
                        
                        <div className="flex flex-col items-end gap-2">
                          {primaryRecord.statusType && (
                            <span className={`px-4 py-2 rounded-full text-sm font-bold border-2 ${
                              primaryRecord.statusType === 'late' ? 'bg-red-100 text-red-800 border-red-300' :
                              primaryRecord.statusType === 'on-time' ? 'bg-green-100 text-green-800 border-green-300' :
                              primaryRecord.statusType === 'early-departure' ? 'bg-orange-100 text-orange-800 border-orange-300' :
                              'bg-gray-100 text-gray-800 border-gray-300'
                            }`}>
                              {primaryRecord.statusLabel || primaryRecord.statusType}
                            </span>
                          )}
                          
                          {/* Summary badge */}
                          <div className="text-xs text-gray-500 bg-white px-3 py-1 rounded-full border">
                            {dayData.checkIns.length} IN • {dayData.checkOuts.length} OUT
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
              ) : (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">✓</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">No Records Found</h3>
              <p className="text-gray-600">No attendance records for the selected period</p>
            </div>
          )
        ) : (
          absentDays.length > 0 ? (
            <div className="space-y-3">
              {absentDays.map((date, index) => (
                <div key={index} className="p-4 bg-red-50 rounded-lg border-2 border-red-200 hover:border-red-300 transition-all">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-bold text-gray-900 text-lg">
                        {date.toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </div>
                      <div className="text-sm text-gray-600 mt-1 font-medium">No attendance recorded</div>
                    </div>
                    <span className="px-4 py-2 rounded-full text-sm font-bold bg-red-100 text-red-800 border-2 border-red-300">
                      Absent
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">🎉</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Perfect Attendance!</h3>
              <p className="text-gray-600">No absent days for the selected period</p>
            </div>
          )
        )}
      </Card>
    </div>
  );
}