import { useState, useEffect } from 'react'
import { Card } from '../ui/card'
import { Button } from '../ui/button'
import { apiGet, apiPost } from '@/lib/api'

interface AttendanceTabProps {
  attendance: any[]
  isCompanyAdmin: boolean
  user: any
  stats: any
}

function AttendanceTab({ attendance, isCompanyAdmin, user, stats }: AttendanceTabProps) {
  const [dateRange, setDateRange] = useState({
    from: new Date().toISOString().split('T')[0],  // ✅ Default to today
    to: new Date().toISOString().split('T')[0]     // ✅ Default to today
  })
  const [attendanceData, setAttendanceData] = useState(attendance)
  const [timeSettings, setTimeSettings] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [statusFilter, setStatusFilter] = useState('all')
  const [gradeFilter, setGradeFilter] = useState('')
  const [availableGrades, setAvailableGrades] = useState([])
  const [exporting, setExporting] = useState(false)
  const [attendanceFilter, setAttendanceFilter] = useState('present')
  const [absentStudents, setAbsentStudents] = useState([])
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const [totalRecords, setTotalRecords] = useState(0)
  const [paginationInfo, setPaginationInfo] = useState({})
  
  // Search-related state
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState(null)
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchError, setSearchError] = useState(null)
  const [showSearch, setShowSearch] = useState(false)

  useEffect(() => {
    const initializeData = async () => {
      setAttendanceData(attendance);
      await loadTimeSettings();
      await loadAvailableGrades();
    };
    
    initializeData();
  }, [attendance])

  // Page size options
  const pageSizeOptions = [
    { value: 20, label: '20' },
    { value: 50, label: '50' },
    { value: 100, label: '100' },
    { value: 200, label: '200' },
    { value: 'all', label: 'All' }
  ]

  // Excel Export Function// Excel Export Function
  const exportToExcel = async () => {
    // ✅ Use allFilteredData instead of filteredData
    if (!allFilteredData.length) {
      alert('No data to export')
      return
    }

    setExporting(true)
    
    try {
      let exportData;
      
      // ✅ Helper function to calculate weekdays
      function calculateWeekdays(start, end) {
        let count = 0;
        const current = new Date(start);
        const endDate = new Date(end);
        
        while (current <= endDate) {
          const dayOfWeek = current.getDay();
          if (dayOfWeek >= 1 && dayOfWeek <= 5) { // Monday to Friday
            count++;
          }
          current.setDate(current.getDate() + 1);
        }
        
        return count;
      }
      
      // ✅ Handle different export formats for present vs absent
      if (attendanceFilter === 'present') {
        // For present students - group by student AND day for detailed tracking
        const studentDayMap = new Map();
        
        allFilteredData.forEach(record => {
          const studentName = record.studentName || record.student_name || 'Unknown Student';
          const grade = record.grade || 'N/A';
          const studentId = record.student_id || record.StudentID;
          const date = new Date(record.scan_time || record.time || record.created_at);
          const dateKey = date.toDateString();
          const key = `${studentId}-${dateKey}`;
          
          if (!studentDayMap.has(key)) {
            studentDayMap.set(key, {
              name: studentName,
              grade: grade,
              studentId: studentId,
              date: dateKey,
              checkIns: [],
              checkOuts: [],
              statusType: record.statusType,
              statusLabel: record.statusLabel
            });
          }
          
          const data = studentDayMap.get(key);
          
          // Track all check-in and check-out times
          if (record.status === 'IN') {
            data.checkIns.push(formatTime(record.scan_time || record.time || record.created_at));
          } else if (record.status === 'OUT') {
            data.checkOuts.push(formatTime(record.scan_time || record.time || record.created_at));
          }
        });
        
        // Convert to export format with detailed check-in/check-out info
        exportData = Array.from(studentDayMap.values()).map(day => {
          const hasCheckOut = day.checkOuts.length > 0;
          const isIncomplete = day.checkIns.length > 0 && !hasCheckOut;
          const multipleCheckIns = day.checkIns.length > 1;
          const multipleCheckOuts = day.checkOuts.length > 1;
          
          // Create notes about unusual patterns
          let notes = [];
          if (isIncomplete) notes.push('⚠️ No checkout recorded');
          if (multipleCheckIns) notes.push(`${day.checkIns.length} check-ins (possible duplicates)`);
          if (multipleCheckOuts) notes.push(`${day.checkOuts.length} check-outs (possible duplicates)`);
          
          return {
            'Student Name': day.name,
            'Grade': day.grade,
            'Date': formatDate(day.date),
            'Check-Ins': day.checkIns.join(', ') || 'None',
            'Check-Outs': day.checkOuts.join(', ') || 'None',
            'Total Check-Ins': day.checkIns.length,
            'Total Check-Outs': day.checkOuts.length,
            'Completion Status': isIncomplete ? '⚠️ Incomplete (No checkout)' : '✅ Complete',
            'Attendance Status': day.statusLabel || 'Present',
            'Notes': notes.join(' • ') || 'Normal'
          };
        });
        
        // Sort by date then by student name
        exportData.sort((a, b) => {
          const dateCompare = new Date(b.Date) - new Date(a.Date);
          if (dateCompare !== 0) return dateCompare;
          return a['Student Name'].localeCompare(b['Student Name']);
        });
        
      } else {
        // For absent students
        const startDate = new Date(dateRange.from);
        const endDate = new Date(dateRange.to);
        const totalWeekdays = calculateWeekdays(startDate, endDate);
        
        exportData = allFilteredData.map(student => ({
          'Student Name': student.name || 'Unknown Student',
          'Grade': student.grade || 'N/A',
          'Date Range': `${formatDate(dateRange.from)} to ${formatDate(dateRange.to)}`,
          'Total Weekdays': totalWeekdays,
          'Present Days': 0,
          'Absent Days': totalWeekdays,
          'Attendance Rate': '0%',
          'Status': '❌ No attendance recorded'
        }));
      }

      // Create filename with current filters
      const now = new Date();
      const timestamp = now.toISOString().split('T')[0];
      let filename = `attendance-${attendanceFilter}-${timestamp}`;
      
      if (statusFilter !== 'all') {
        filename += `-${statusFilter}`;
      }
      if (gradeFilter) {
        filename += `-grade-${gradeFilter}`;
      }

      // Create Excel content using CSV format
      const headers = Object.keys(exportData[0]);
      const csvContent = [
        // Add title rows
        [`Attendance Report - ${attendanceFilter.charAt(0).toUpperCase() + attendanceFilter.slice(1)} Students`],
        [`School: ${isCompanyAdmin ? 'Network Wide' : user?.school?.name || 'School'}`],
        [`Generated: ${now.toLocaleString()}`],
        [`Date Range: ${dateRange.from} to ${dateRange.to}`],
        [`Filters: ${attendanceFilter.toUpperCase()}, Status=${statusFilter}, Grade=${gradeFilter || 'All'}`],
        [`Total Records: ${exportData.length} ${attendanceFilter === 'present' ? 'student-day records' : 'students'}`],
        [], // Empty row
        headers, // Column headers
        ...exportData.map(row => headers.map(header => {
          const cell = row[header];
          return cell !== undefined && cell !== null ? cell.toString() : '';
        }))
      ].map(row => 
        row.map(cell => 
          typeof cell === 'string' && (cell.includes(',') || cell.includes('"') || cell.includes('\n'))
            ? `"${cell.replace(/"/g, '""')}"` 
            : cell
        ).join(',')
      ).join('\n');

      // Create and download the file
      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `${filename}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      // Show success message with details
      const uniqueStudents = attendanceFilter === 'present' 
        ? new Set(exportData.map(row => row['Student Name'])).size
        : exportData.length;
      
      const message = attendanceFilter === 'present'
        ? `✅ Exported ${exportData.length} student-day records (${uniqueStudents} unique students) to ${filename}.csv`
        : `✅ Exported ${exportData.length} absent students to ${filename}.csv`;
      
      alert(message);

    } catch (error) {
      console.error('Export error:', error);
      alert('❌ Failed to export attendance data. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const loadTimeSettings = async () => {
    try {
      const schoolId = user?.school_id || user?.SchoolID
      if (!schoolId) return

      const result = await apiGet(`/api/school-settings?school_id=${schoolId}&type=time`)

      if (result.success) {
        setTimeSettings(result.settings)
      }
    } catch (error) {
      console.error('Error loading time settings:', error)
    }
  }

  // Add this function in AttendanceTab
  const loadAbsentStudents = async (freshAttendanceData = null) => {
    if (isCompanyAdmin) return
    
    try {
      const schoolId = user?.school_id || user?.SchoolID
      if (!schoolId) return

      console.log('📊 Loading absent students for date range:', dateRange);

      // ✅ Use fresh data if provided, otherwise use state
      const dataToUse = freshAttendanceData || attendanceData;
      
      console.log('📦 Using attendance data length:', dataToUse.length);

      // ✅ ALWAYS calculate locally with fresh data
      calculateAbsentStudents(dataToUse)
      
    } catch (error) {
      console.error('Error loading absent students:', error)
      calculateAbsentStudents(freshAttendanceData || attendanceData)
    }
  }

  // Update fallback calculation function to accept data parameter
  const calculateAbsentStudents = async (attendanceDataToUse) => {
    try {
      const schoolId = user?.school_id || user?.SchoolID
      if (!schoolId) return

      console.log('🔄 Calculating absent students locally for date range:', dateRange);
      console.log('📦 Attendance data to process:', attendanceDataToUse.length, 'records');

      // Get all active students
      const studentsResult = await apiGet(`/api/students?school_id=${schoolId}&active_only=true&limit=999999`)
      if (!studentsResult.success) return

      // ✅ Filter out any invalid or duplicate students from API response
      const allStudents = (studentsResult.data || []).filter((student, index, self) => {
        const studentId = student.student_id || student.id;
        return (
          studentId && // Has valid ID
          student.name && // Has name
          self.findIndex(s => (s.student_id || s.id) === studentId) === index // First occurrence (dedupe)
        );
      });
      
      console.log(`👥 Total active students in school: ${allStudents.length} (after filtering)`);
      
      // ✅ Get unique student IDs who have ANY attendance (IN or OUT) in the date range
      const presentStudentIds = new Set();
      
      // ✅ FIX: Use UTC dates consistently
      const rangeStart = new Date(dateRange.from + 'T00:00:00.000Z');
      const rangeEnd = new Date(dateRange.to + 'T23:59:59.999Z');
      
      console.log('📅 Date range (UTC):', {
        from: rangeStart.toISOString(),
        to: rangeEnd.toISOString()
      });
      
      attendanceDataToUse.forEach(record => {
        const recordDate = new Date(record.scan_time || record.time || record.created_at);
        
        // ✅ Count ANY status (IN or OUT) as present
        const hasAttendance = recordDate >= rangeStart && recordDate <= rangeEnd;
        
        if (hasAttendance) {
          const studentId = record.student_id || record.StudentID;
          if (studentId) {
            presentStudentIds.add(studentId);
            
            // Debug specific student
            const studentName = record.studentName || record.student_name;
            if (studentName?.includes('NANA AKUA') || studentName?.includes('Mduho')) {
              console.log('🔍 Found student in attendance:', {
                studentId,
                studentName,
                status: record.status,
                scanTime: record.scan_time,
                recordDate: recordDate.toISOString(),
                inDateRange: hasAttendance
              });
            }
          }
        }
      });

      console.log(`✅ Students with ANY attendance (IN or OUT) in range: ${presentStudentIds.size}`);
      console.log('Present student IDs sample:', Array.from(presentStudentIds).slice(0, 10));

      // ✅ Students who have NO attendance (neither IN nor OUT) in the date range are absent
      const absentStudentsList = allStudents.filter(student => {
        const studentId = student.student_id || student.id;
        const isAbsent = !presentStudentIds.has(studentId);
        
        // Debug specific students
        if (student.name?.includes('NANA AKUA') || student.name?.includes('Mduho')) {
          console.log('🔍 Checking student in absent filter:', {
            studentId,
            name: student.name,
            isPresentInSet: presentStudentIds.has(studentId),
            isAbsent
          });
        }
        
        return isAbsent;
      });

      console.log(`❌ Students with NO attendance in range: ${absentStudentsList.length}`);
      console.log('Sample absent students:', absentStudentsList.slice(0, 5).map(s => s.name));
      
      // Verification check
      const expectedAbsent = allStudents.length - presentStudentIds.size;
      if (absentStudentsList.length !== expectedAbsent) {
        console.error('⚠️ MISMATCH in absent calculation!', {
          totalStudents: allStudents.length,
          presentStudents: presentStudentIds.size,
          expectedAbsent,
          actualAbsent: absentStudentsList.length
        });
      }
      
      // ✅ Check for duplicates and deduplicate
      const studentIds = absentStudentsList.map(s => s.student_id || s.id);
      const uniqueIds = new Set(studentIds);
      
      if (studentIds.length !== uniqueIds.size) {
        const duplicateIds = studentIds.filter((id, index) => studentIds.indexOf(id) !== index);
        const duplicateStudents = absentStudentsList.filter(s => 
          duplicateIds.includes(s.student_id || s.id)
        );
        
        console.error('⚠️ DUPLICATE STUDENTS IN ABSENT LIST!', {
          total: studentIds.length,
          unique: uniqueIds.size,
          duplicateIds,
          duplicateStudents: duplicateStudents.map(s => ({
            id: s.student_id || s.id,
            name: s.name,
            grade: s.grade
          }))
        });
      }
      
      // ✅ DEDUPLICATE before setting state
      const uniqueAbsentStudents = Array.from(
        new Map(
          absentStudentsList.map(student => [
            student.student_id || student.id, 
            student
          ])
        ).values()
      );
      
      console.log(`✅ Final absent count after deduplication: ${uniqueAbsentStudents.length}`);
      
      setAbsentStudents(uniqueAbsentStudents) // ✅ Use deduplicated list
      
    } catch (error) {
      console.error('Error calculating absent students:', error)
    }
  }


  const loadAvailableGrades = async () => {
    try {
      const schoolId = user?.school_id || user?.SchoolID
      if (!schoolId) return

      const result = await apiGet(`/api/students?school_id=${schoolId}&type=grades`)

      if (result.success) {
        setAvailableGrades(result.grades || [])
      }
    } catch (error) {
      console.error('Error loading grades:', error)
    }
  }

  // Search function
  const searchStudent = async () => {
    if (!searchQuery.trim()) {
      setSearchError('Please enter a student name or student code')
      return
    }

    setSearchLoading(true)
    setSearchError(null)
    setSearchResults(null)

    try {
      const schoolId = user?.school_id || user?.SchoolID

      const result = await apiPost('/api/students', {
        action: 'search_student_attendance',
        query: searchQuery.trim(),
        date_from: dateRange.from,
        date_to: dateRange.to,
        school_id: !isCompanyAdmin ? schoolId : undefined
      })

      if (result.success) {
        setSearchResults(result.data)
        setShowSearch(true)
      } else {
        setSearchError(result.error || 'Student not found')
      }
    } catch (error) {
      console.error('Search error:', error)
      setSearchError('Failed to search student. Please try again.')
    } finally {
      setSearchLoading(false)
    }
  }

  // Clear search results
  const clearSearch = () => {
    setSearchQuery('')
    setSearchResults(null)
    setSearchError(null)
    setShowSearch(false)
  }

  // Handle page size change
  const handlePageSizeChange = (newPageSize) => {
    setPageSize(newPageSize)
    setCurrentPage(1)
  }

  // Handle page change
  const handlePageChange = (newPage) => {
    setCurrentPage(newPage)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Reset to page 1 when filters change
  const resetPagination = () => {
    setCurrentPage(1)
  }

  const handleAttendanceFilterChange = (value) => {
    setAttendanceFilter(value)
    resetPagination()
  }

  const refreshAttendance = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const params = new URLSearchParams({
        type: 'real-time',
        limit: '999999'
      })
      
      if (dateRange.from) {
        params.append('date_from', dateRange.from)
      }
      if (dateRange.to) {
        params.append('date_to', dateRange.to)
      }
      
      if (!isCompanyAdmin && (user?.school_id || user?.SchoolID)) {
        params.append('school_id', user.school_id || user.SchoolID)
      }

      if (gradeFilter && gradeFilter.trim() !== '') {
        const encodedGrade = encodeURIComponent(gradeFilter.trim())
        params.append('grade', encodedGrade)
        console.log('Adding grade filter:', gradeFilter, '-> encoded:', encodedGrade)
      }

      console.log('🔄 Fetching attendance with params:', params.toString());

      const data = await apiGet(`/api/analytics?${params}`)

      if (data.success) {
        if (data.current_activity && Array.isArray(data.current_activity)) {
          console.log(`✅ Loaded ${data.current_activity.length} attendance records`);
          
          let formattedData = data.current_activity.map(record => ({
            id: record.attendance_id,
            student_id: record.student_id,
            StudentID: record.student_id,
            studentName: record.student_name,
            student_name: record.student_name,
            grade: record.grade,
            status: record.status,
            time: record.scan_time,
            scan_time: record.scan_time,
            scanTime: record.scan_time,
            created_at: record.created_at,
            school_name: record.school_name,
            school_id: record.school_id,
            statusLabel: record.statusLabel,
            statusType: record.statusType,
            message: record.message
          }))
          
          formattedData.sort((a, b) => {
            const timeA = new Date(a.scan_time || a.created_at)
            const timeB = new Date(b.scan_time || b.created_at)
            return timeB - timeA
          })
          
          setAttendanceData(formattedData)
          
          // ✅ Calculate absent students with FRESH data immediately
          if (!isCompanyAdmin && formattedData.length > 0) {
            console.log('🔄 Calculating absent students with fresh data...');
            setTimeout(() => {
              loadAbsentStudents(formattedData); // Pass fresh data
            }, 100);
          }
        } else {
          setAttendanceData([])
          if (!isCompanyAdmin) {
            setTimeout(() => {
              loadAbsentStudents([]); // Pass empty array
            }, 100);
          }
        }
      } else {
        setError(data.error || 'Failed to fetch attendance data')
        setAttendanceData([])
      }
    } catch (error) {
      console.error('Error refreshing attendance:', error)
      setError(error.message)
      setAttendanceData([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (dateRange.from && dateRange.to) {
      // Just refresh attendance - it handles absent calculation internally
      refreshAttendance();
    }
  }, [dateRange.from, dateRange.to, gradeFilter])

  // ✅ Process attendance records to get detailed daily stats per student
  const processDailyAttendance = (records) => {
    const dailyStats = new Map();
    
    records.forEach(record => {
      const studentId = record.student_id || record.StudentID;
      const date = new Date(record.scan_time || record.created_at).toDateString();
      const key = `${studentId}-${date}`;
      
      if (!dailyStats.has(key)) {
        dailyStats.set(key, {
          student_id: studentId,
          student_name: record.studentName || record.student_name,
          grade: record.grade,
          date: date,
          checkIns: [],
          checkOuts: [],
          records: []
        });
      }
      
      const dayStats = dailyStats.get(key);
      dayStats.records.push(record);
      
      if (record.status === 'IN') {
        dayStats.checkIns.push(record.scan_time || record.created_at);
      } else if (record.status === 'OUT') {
        dayStats.checkOuts.push(record.scan_time || record.created_at);
      }
    });
    
    return dailyStats;
  };

  // Process all attendance data
    const dailyAttendanceMap = processDailyAttendance(attendanceData);

    // First, filter the data
    const allFilteredData = attendanceFilter === 'present' 
      ? attendanceData.filter(record => {
          // Status filter
          let statusMatch = false;
          
          if (statusFilter === 'all') {
            statusMatch = true;
          } else if (timeSettings && record.statusType) {
            // ✅ More comprehensive status matching
            switch (statusFilter) {
              case 'late':
                statusMatch = record.statusType === 'late';
                break;
              case 'on-time':
                statusMatch = ['on-time', 'early-arrival', 'normal-departure'].includes(record.statusType);
                break;
              case 'early-departure':
                statusMatch = record.statusType === 'early-departure';
                break;
              default:
                statusMatch = false;
            }
          } else if (!timeSettings) {
            // If no time settings, only 'all' filter works
            statusMatch = statusFilter === 'all';
          }

          // Grade filter
          const gradeMatch = !gradeFilter || record.grade === gradeFilter

          return statusMatch && gradeMatch
        })
      : absentStudents.filter(student => {
          const gradeMatch = !gradeFilter || student.grade === gradeFilter
          return gradeMatch
        })
        
    // ✅ Calculate present/absent counts - ALWAYS calculate both, regardless of active tab
    const presentCount = (() => {
      // Get unique students who have ANY record (check-in OR check-out) in the date range
      const uniqueStudents = new Set(
        attendanceData
          .filter(record => {
            const gradeMatch = !gradeFilter || record.grade === gradeFilter;
            return gradeMatch;
          })
          .map(record => record.student_id || record.StudentID)
          .filter(id => id) // Remove undefined
      );
      
      console.log('📊 Present Count Calculation:', {
        totalRecords: attendanceData.length,
        uniqueStudents: uniqueStudents.size,
        gradeFilter,
        dateRange,
        currentTab: attendanceFilter
      });
      
      return uniqueStudents.size;
    })();

    const absentCount = (() => {
      // Filter absent students by grade
      const filtered = absentStudents.filter(student => {
        const gradeMatch = !gradeFilter || student.grade === gradeFilter;
        return gradeMatch;
      });
      
      console.log('📊 Absent Count Calculation:', {
        totalAbsent: absentStudents.length,
        afterGradeFilter: filtered.length,
        gradeFilter,
        dateRange,
        currentTab: attendanceFilter
      });
      
      return filtered.length;
    })();

// ✅ Verification: Present + Absent should equal total students (when no grade filter)
if (!gradeFilter) {
  const calculatedTotal = presentCount + absentCount;
  console.log('🔍 Count Verification:', {
    present: presentCount,
    absent: absentCount,
    sum: calculatedTotal,
    shouldMatch: 'Total students in top card'
  });
  
  if (Math.abs(calculatedTotal - (presentCount + absentCount)) > 0) {
    console.warn('⚠️ Count mismatch detected!');
  }
}

    // ✅ Check if viewing today or different date
    const isViewingToday = dateRange.to === new Date().toISOString().split('T')[0];
    const isViewingSingleDay = dateRange.from === dateRange.to;

    // ✅ Dynamic labels based on date selection
    const presentLabel = isViewingToday 
      ? '✅ Present Today' 
      : isViewingSingleDay 
        ? `✅ Present (${dateRange.to})`
        : `✅ Present (${dateRange.from} to ${dateRange.to})`;

    const absentLabel = isViewingToday 
      ? '❌ Absent Today' 
      : isViewingSingleDay 
        ? `❌ Absent (${dateRange.to})`
        : `❌ Absent (${dateRange.from} to ${dateRange.to})`;

    console.log('📊 Final Counts:', {
      present: presentCount,
      absent: absentCount,
      totalStudents: presentCount + absentCount,
      isViewingToday,
      isViewingSingleDay
    });

    // Then apply pagination - BUT FIRST GROUP BY STUDENT-DAY
  const groupedData = attendanceFilter === 'present' 
    ? (() => {
        const studentDayMap = new Map();
        
        allFilteredData.forEach(record => {
          const studentId = record.student_id || record.StudentID;
          const date = new Date(record.scan_time || record.created_at).toDateString();
          const key = `${studentId}-${date}`;
          
          if (!studentDayMap.has(key)) {
            studentDayMap.set(key, {
              ...record, // Keep all record properties
              allRecords: [], // Store all records for this student-day
              checkIns: [],
              checkOuts: []
            });
          }
          
          const dayData = studentDayMap.get(key);
          dayData.allRecords.push(record);
          
          if (record.status === 'IN') {
            dayData.checkIns.push(record);
          } else if (record.status === 'OUT') {
            dayData.checkOuts.push(record);
          }
        });
        
        return Array.from(studentDayMap.values());
      })()
    : allFilteredData; // For absent students, no grouping needed

  const totalRecordsCount = groupedData.length
  const startIndex = pageSize === 'all' ? 0 : (currentPage - 1) * pageSize
  const endIndex = pageSize === 'all' ? totalRecordsCount : startIndex + parseInt(pageSize)
  const filteredData = pageSize === 'all' ? groupedData : groupedData.slice(startIndex, endIndex)

  // Calculate pagination info
  const totalPages = pageSize === 'all' ? 1 : Math.ceil(totalRecordsCount / pageSize)
  const hasPrevious = currentPage > 1
  const hasMore = currentPage < totalPages

  // Get status counts for filter buttons
  const getStatusCounts = () => {
    if (!attendanceData || attendanceData.length === 0) {
      return { all: 0, late: 0, 'on-time': 0, 'early-departure': 0 }
    }

    // ✅ Filter out records without statusType for specific counts
    const recordsWithStatus = attendanceData.filter(r => 
      r.statusType && 
      timeSettings &&
      ['late', 'on-time', 'early-arrival', 'early-departure', 'normal-departure'].includes(r.statusType)
    );

    return {
      all: attendanceData.length, // All records (including after-hours)
      late: recordsWithStatus.filter(r => r.statusType === 'late').length,
      'on-time': recordsWithStatus.filter(r => 
        ['on-time', 'early-arrival', 'normal-departure'].includes(r.statusType)
      ).length,
      'early-departure': recordsWithStatus.filter(r => r.statusType === 'early-departure').length
    }
  }

  // Utility functions for status badges
  const getStatusBadgeClasses = (statusType) => {
    switch (statusType) {
      case 'late':
        return 'inline-flex px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800'
      case 'on-time':
      case 'early-arrival':
        return 'inline-flex px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800'
      case 'early-departure':
        return 'inline-flex px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800'
      default:
        return 'inline-flex px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (statusType) => {
    switch (statusType) {
      case 'late':
        return '🔴'
      case 'on-time':
      case 'early-arrival':
        return '🟢'
      case 'early-departure':
        return '🟠'
      default:
        return '⚪'
    }
  }

  const statusCounts = getStatusCounts()

  const formatTime = (timestamp) => {
    if (!timestamp) return 'No time'
    try {
      return new Date(timestamp).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      })
    } catch (e) {
      return 'Invalid time'
    }
  }

  const formatDate = (timestamp) => {
    if (!timestamp) return 'No date'
    try {
      return new Date(timestamp).toLocaleDateString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      })
    } catch (e) {
      return 'Invalid date'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <Card className="p-6 bg-white border-2 border-blue-300 shadow-lg">
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
          <div>
            <h3 className="text-xl font-bold text-gray-900">
              {showSearch ? '🔍 Student Search Results' : (isCompanyAdmin ? '🌐 Network Attendance Records' : '📊 Recent Attendance')}
            </h3>
            {timeSettings && !showSearch && (
              <p className="text-sm text-gray-600 mt-1">
                ⏰ Late after {timeSettings.late_arrival_time} • Early before {timeSettings.early_departure_time}
              </p>
            )}
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2">
            {!showSearch && (
              <>
                <input
                  type="date"
                  value={dateRange.from}
                  onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
                  className="border-2 border-blue-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  max={dateRange.to}
                />
                <input
                  type="date"
                  value={dateRange.to}
                  onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
                  className="border-2 border-blue-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  min={dateRange.from}
                  max={new Date().toISOString().split('T')[0]}
                />
                <Button 
                  onClick={refreshAttendance}
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-700 text-white shadow-md"
                >
                  {loading ? '🔄 Loading...' : '🔄 Refresh'}
                </Button>
                <Button 
                  onClick={exportToExcel}
                  disabled={exporting || allFilteredData.length === 0}
                  className="bg-green-600 hover:bg-green-700 text-white shadow-md"
                >
                  {exporting ? '📤 Exporting...' : '📊 Export Excel'}
                </Button>
              </>
            )}
            <Button 
              onClick={() => setShowSearch(!showSearch)}
              className="bg-purple-600 hover:bg-purple-700 text-white shadow-md"
            >
              {showSearch ? '← Back to Overview' : '🔍 Search Student'}
            </Button>
          </div>
        </div>
      </Card>

      {/* Search Section */}
      {showSearch && (
        <Card className="p-6 border-2 border-indigo-300 bg-gradient-to-br from-indigo-50 to-blue-50 shadow-lg">
          <h4 className="text-lg font-bold text-gray-900 mb-4">🔍 Search Student Attendance</h4>
          
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Student Name or Student Code
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Enter student name or student code..."
                className="w-full px-4 py-2 text-gray-700 border-2 border-purple-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                onKeyPress={(e) => e.key === 'Enter' && searchStudent()}
              />
            </div>
            <div className="flex gap-2 items-end">
              <Button
                onClick={searchStudent}
                disabled={searchLoading || !searchQuery.trim()}
                className="bg-blue-600 hover:bg-blue-700 text-white shadow-md"
              >
                {searchLoading ? '🔍 Searching...' : '🔍 Search'}
              </Button>
              {(searchResults || searchError) && (
                <Button
                  onClick={clearSearch}
                  variant="outline"
                  className="border-gray-300 hover:bg-gray-100"
                >
                  ✕ Clear
                </Button>
              )}
            </div>
          </div>
          
          <div className="text-sm text-gray-600">
            📅 Search date range: {formatDate(dateRange.from)} to {formatDate(dateRange.to)}
          </div>
        </Card>
      )}

      {/* Search Error */}
      {searchError && (
        <Card className="p-4 bg-red-50 border-2 border-red-200">
          <div className="flex items-center">
            <span className="text-2xl mr-3">⚠️</span>
            <p className="text-sm text-red-700">{searchError}</p>
          </div>
        </Card>
      )}

      {/* Search Results */}
      {showSearch && searchResults && (
        <Card className="overflow-hidden border-purple-200">
          {/* Student Info Header */}
          <div className="bg-gradient-to-r from-purple-100 to-blue-100 px-6 py-4 border-b-2 border-purple-200">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
              <div>
                <h4 className="text-lg font-bold text-gray-900">
                  👤 {searchResults.student?.name || 'Unknown Student'}
                </h4>
                <div className="flex flex-wrap gap-4 text-sm text-gray-600 mt-1">
                  {searchResults.student?.student_code && (
                    <span>🆔 Code: <span className="font-medium">{searchResults.student.student_code}</span></span>
                  )}
                  {searchResults.student?.grade && (
                    <span>📚 Grade: <span className="font-medium">{searchResults.student.grade}</span></span>
                  )}
                  {searchResults.student?.school_name && (
                    <span>🏫 School: <span className="font-medium">{searchResults.student.school_name}</span></span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Attendance Summary */}
          {searchResults.summary && (
            <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-cyan-50 border-b-2 border-blue-200">
              <h5 className="text-sm font-bold text-gray-700 mb-3">📊 Attendance Summary</h5>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="text-center bg-white rounded-lg p-3 border-2 border-green-200">
                  <div className="text-2xl font-bold text-green-600">{searchResults.summary.present_days || 0}</div>
                  <div className="text-xs text-gray-600 mt-1">✅ Present Days</div>
                </div>
                <div className="text-center bg-white rounded-lg p-3 border-2 border-red-200">
                  <div className="text-2xl font-bold text-red-600">{searchResults.summary.absent_days || 0}</div>
                  <div className="text-xs text-gray-600 mt-1">❌ Absent Days</div>
                </div>
                <div className="text-center bg-white rounded-lg p-3 border-2 border-orange-200">
                  <div className="text-2xl font-bold text-orange-600">{searchResults.summary.late_arrivals || 0}</div>
                  <div className="text-xs text-gray-600 mt-1">⏰ Late Arrivals</div>
                </div>
                <div className="text-center bg-white rounded-lg p-3 border-2 border-blue-200">
                  <div className="text-2xl font-bold text-blue-600">
                    {searchResults.summary.attendance_rate ? `${searchResults.summary.attendance_rate}%` : 'N/A'}
                  </div>
                  <div className="text-xs text-gray-600 mt-1">📈 Attendance Rate</div>
                </div>
              </div>
            </div>
          )}

          {/* Detailed Records */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">📅 Date</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">⏰ Time</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">📊 Status</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">🏷️ Type</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">📝 Notes</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {searchResults.records && searchResults.records.length > 0 ? (
                  searchResults.records.map((record, index) => (
                    <tr key={record.id || index} className="hover:bg-blue-50 transition-colors">
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {formatDate(record.scan_time || record.date)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {record.scan_time ? formatTime(record.scan_time) : '-'}
                      </td>
                      <td className="px-6 py-4">
                        {record.statusType && timeSettings ? (
                          <span className={getStatusBadgeClasses(record.statusType)}>
                            {getStatusIcon(record.statusType)} {record.statusLabel}
                          </span>
                        ) : (
                          <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                            record.status === 'IN' ? 'bg-green-100 text-green-800' : 
                            record.status === 'OUT' ? 'bg-blue-100 text-blue-800' :
                            record.status === 'ABSENT' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {record.status === 'IN' ? 'Check In' : 
                             record.status === 'OUT' ? 'Check Out' : 
                             record.status === 'ABSENT' ? 'Absent' :
                             record.status || 'Unknown'}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {record.type || (record.status === 'IN' ? 'Arrival' : record.status === 'OUT' ? 'Departure' : '-')}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {record.message || record.notes || '-'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center">
                      <div className="text-gray-500">
                        <div className="text-4xl mb-2">📅</div>
                        <p className="font-medium">No attendance records found</p>
                        <p className="text-sm mt-1">
                          No records between {formatDate(dateRange.from)} and {formatDate(dateRange.to)}
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Overview Content (only show when not searching) */}
      {!showSearch && (
        <>
          {/* Enhanced Filter Section */}
          <Card className="p-6 border-blue-200 bg-gradient-to-br from-blue-50 to-cyan-50">
            <div className="space-y-4">
              {/* Grade Filter */}
              {availableGrades.length > 0 && (
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    📚 Filter by Grade
                  </label>
                  <select
                    value={gradeFilter}
                    onChange={(e) => setGradeFilter(e.target.value)}
                    className="block w-full sm:w-48 px-3 py-2 text-gray-700 border-2 border-blue-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                  >
                    <option value="">All Grades</option>
                    {availableGrades.map((grade) => (
                      <option key={grade} value={grade}>
                        {grade}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Present/Absent Filter - Only for school admins */}
              {!isCompanyAdmin && (
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    👥 View Students
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => {
                        setAttendanceFilter('present')
                        setStatusFilter('all')
                        resetPagination()
                      }}
                      className={`px-4 py-2 text-sm rounded-lg font-medium transition-all shadow-md ${
                        attendanceFilter === 'present' 
                          ? 'bg-green-500 text-white border-2 border-green-600 scale-105' 
                          : 'bg-white text-gray-600 border-2 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {presentLabel} ({presentCount})
                    </button>
                    <button
                      onClick={() => {
                        setAttendanceFilter('absent')
                        resetPagination()
                      }}
                      className={`px-4 py-2 text-sm rounded-lg font-medium transition-all shadow-md ${
                        attendanceFilter === 'absent' 
                          ? 'bg-red-500 text-white border-2 border-red-600 scale-105' 
                          : 'bg-white text-gray-600 border-2 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {absentLabel} ({absentCount})
                    </button>
                  </div>
                  
                  {/* ✅ Show date range info when not viewing today */}
                  {!isViewingToday && (
                    <div className="mt-2 text-xs text-gray-600 bg-blue-50 px-3 py-2 rounded-lg border border-blue-200">
                      📅 Viewing data for: {isViewingSingleDay 
                        ? formatDate(dateRange.to) 
                        : `${formatDate(dateRange.from)} to ${formatDate(dateRange.to)}`
                      }
                    </div>
                  )}
                </div>
              )}

              {/* Status Filter Buttons */}
              {timeSettings && statusCounts.all > 0 && (
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    🎯 Filter by Status
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setStatusFilter('all')}
                      className={`px-3 py-2 text-sm rounded-lg font-medium transition-all shadow-md ${
                        statusFilter === 'all' 
                          ? 'bg-blue-500 text-white border-2 border-blue-600 scale-105' 
                          : 'bg-white text-gray-600 border-2 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      📊 All ({statusCounts.all})
                    </button>
                    <button
                      onClick={() => setStatusFilter('on-time')}
                      className={`px-3 py-2 text-sm rounded-lg font-medium transition-all shadow-md ${
                        statusFilter === 'on-time' 
                          ? 'bg-green-500 text-white border-2 border-green-600 scale-105' 
                          : 'bg-white text-gray-600 border-2 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      🟢 On Time ({statusCounts['on-time']})
                    </button>
                    <button
                      onClick={() => setStatusFilter('late')}
                      className={`px-3 py-2 text-sm rounded-lg font-medium transition-all shadow-md ${
                        statusFilter === 'late' 
                          ? 'bg-red-500 text-white border-2 border-red-600 scale-105' 
                          : 'bg-white text-gray-600 border-2 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      🔴 Late ({statusCounts.late})
                    </button>
                    <button
                      onClick={() => setStatusFilter('early-departure')}
                      className={`px-3 py-2 text-sm rounded-lg font-medium transition-all shadow-md ${
                        statusFilter === 'early-departure' 
                          ? 'bg-orange-500 text-white border-2 border-orange-600 scale-105' 
                          : 'bg-white text-gray-600 border-2 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      🟠 Early Out ({statusCounts['early-departure']})
                    </button>
                  </div>
                </div>
              )}

              {/* Export Summary */}
              {allFilteredData.length > 0 && (
                <div className="text-sm text-gray-600 border-t-2 border-blue-200 pt-3">
                  📤 Ready to export: 
                  {attendanceFilter === 'present' ? (
                    <>
                      <span className="font-bold"> {presentCount} unique students</span> 
                      <span className="text-xs"> ({allFilteredData.length} {statusFilter === 'all' ? 'attendance records' : `${statusFilter} records`})</span>
                    </>
                  ) : (
                    <span className="font-bold"> {absentCount} absent students</span>
                  )}
                  {statusFilter !== 'all' && ` • ${statusFilter.replace('-', ' ')} only`}
                  {gradeFilter && ` • Grade ${gradeFilter}`}
                  {dateRange.from === dateRange.to 
                    ? ` • ${formatDate(dateRange.from)}`
                    : ` • ${formatDate(dateRange.from)} to ${formatDate(dateRange.to)}`
                  }
                </div>
              )}
            </div>
          </Card>

          {error && (
            <Card className="p-4 bg-red-50 border-2 border-red-200">
              <div className="flex items-center">
                <span className="text-2xl mr-3">⚠️</span>
                <p className="text-sm text-red-700">Error: {error}</p>
              </div>
            </Card>
          )}

          {/* Pagination Controls */}
            <Card className="p-4 bg-white border-2 border-gray-300 shadow-md">
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm font-bold text-gray-700">📄 Items per page:</label>
                <select 
                  value={pageSize} 
                  onChange={(e) => handlePageSizeChange(e.target.value)}
                  className="px-3 py-1 border-2 text-gray-700 border-gray-300 rounded-lg text-sm bg-white"
                >
                  {pageSizeOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Page navigation - only show if not showing all */}
              {pageSize !== 'all' && totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <Button 
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={!hasPrevious || loading}
                    variant="outline"
                    size="sm"
                    className="border-gray-300"
                  >
                    ← Previous
                  </Button>
                  
                  <span className="text-sm font-medium text-gray-700 px-3 py-1 bg-white rounded-lg border-2 border-gray-300">
                    Page {currentPage} of {totalPages}
                  </span>
                  
                  <Button 
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={!hasMore || loading}
                    variant="outline"
                    size="sm"
                    className="border-gray-300"
                  >
                    Next →
                  </Button>
                </div>
              )}
            </div>
          </Card>

          {/* Attendance Table */}
          <Card className="overflow-hidden border-2 border-blue-300 shadow-lg bg-white">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gradient-to-r from-blue-500 to-indigo-600">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">
                      👤 Student
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">
                      📚 Grade
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">
                      📊 Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider hidden sm:table-cell">
                      {attendanceFilter === 'present' ? '⏰ Check In/Out Times' : '📅 Date Range'}
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider hidden sm:table-cell">
                      {attendanceFilter === 'present' ? '📅 Date' : '📊 Days Absent'}
                    </th>
                    {isCompanyAdmin && (
                      <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider hidden md:table-cell">
                        🏫 School
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredData && filteredData.length > 0 ? (
                    filteredData.map((record, index) => {
                      // ✅ Calculate daily stats for this record
                      const recordDate = new Date(record.scan_time || record.created_at).toDateString();
                      const dayKey = `${record.student_id || record.StudentID}-${recordDate}`;
                      const dayStats = dailyAttendanceMap.get(dayKey) || {
                        checkIns: [],
                        checkOuts: []
                      };
                      
                      const hasCheckIn = dayStats.checkIns.length > 0;
                      const hasCheckOut = dayStats.checkOuts.length > 0;
                      const isIncomplete = hasCheckIn && !hasCheckOut;
                      
                      return (
                        <tr key={record.id || record.student_id || record.attendance_id || index} className="hover:bg-blue-50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-gray-900">
                              {attendanceFilter === 'present' 
                                ? (record.studentName || record.student_name || 'Unknown Student')
                                : (record.name || 'Unknown Student')
                              }
                            </div>
                            <div className="text-xs text-gray-500">
                              {attendanceFilter === 'present' ? (
                                <>
                                  <div className="sm:hidden">
                                    ⏰ {formatTime(record.scan_time || record.time || record.created_at)}
                                  </div>
                                  <div className="mt-1">
                                    <span className="text-blue-600">✓ {dayStats.checkIns.length} IN</span>
                                    {' • '}
                                    <span className="text-purple-600">✓ {dayStats.checkOuts.length} OUT</span>
                                    {isIncomplete && (
                                      <span className="ml-2 text-orange-600 font-medium">⚠️ No checkout</span>
                                    )}
                                  </div>
                                </>
                              ) : (
                                <span className="text-red-600">❌ No attendance in range</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex px-3 py-1 text-xs font-bold rounded-full bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 border-2 border-blue-300">
                              {record.grade || 'N/A'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            {attendanceFilter === 'present' ? (
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  {record.statusType && timeSettings ? (
                                    <span className={getStatusBadgeClasses(record.statusType)}>
                                      {getStatusIcon(record.statusType)} {record.statusLabel}
                                    </span>
                                  ) : (
                                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                                      record.status === 'IN' ? 'bg-green-100 text-green-800' : 
                                      record.status === 'OUT' ? 'bg-blue-100 text-blue-800' :
                                      'bg-gray-100 text-gray-800'
                                    }`}>
                                      {record.status === 'IN' ? 'Check In' : 
                                      record.status === 'OUT' ? 'Check Out' : 
                                      record.status || 'Unknown'}
                                    </span>
                                  )}
                                  {isIncomplete && (
                                    <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 border border-orange-300">
                                      ⚠️ Incomplete
                                    </span>
                                  )}
                                </div>
                                {record.message && (
                                  <div className="text-xs text-gray-500 lg:hidden">
                                    {record.message}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                ❌ Absent
                              </span>
                            )}
                          </td>
                          {/* ✅ Show check-in/check-out details */}
                          <td className="px-6 py-4 text-sm text-gray-500 hidden sm:table-cell">
                            {attendanceFilter === 'present' ? (
                              <div className="space-y-1">
                                {dayStats.checkIns.length > 0 && (
                                  <div className="text-blue-600">
                                    <span className="font-medium">IN:</span> {dayStats.checkIns.map(time => formatTime(time)).join(', ')}
                                  </div>
                                )}
                                {dayStats.checkOuts.length > 0 && (
                                  <div className="text-purple-600">
                                    <span className="font-medium">OUT:</span> {dayStats.checkOuts.map(time => formatTime(time)).join(', ')}
                                  </div>
                                )}
                                {isIncomplete && (
                                  <div className="text-orange-600 text-xs font-medium">⚠️ No checkout recorded</div>
                                )}
                              </div>
                            ) : (
                              `${formatDate(dateRange.from)} to ${formatDate(dateRange.to)}`
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500 hidden sm:table-cell">
                            {attendanceFilter === 'present' 
                              ? formatDate(record.scan_time || record.time || record.created_at)
                              : (() => {
                                  // Calculate weekdays in range
                                  const start = new Date(dateRange.from);
                                  const end = new Date(dateRange.to);
                                  let days = 0;
                                  const current = new Date(start);
                                  while (current <= end) {
                                    const dayOfWeek = current.getDay();
                                    if (dayOfWeek >= 1 && dayOfWeek <= 5) days++;
                                    current.setDate(current.getDate() + 1);
                                  }
                                  return `${days} days`;
                                })()
                            }
                          </td>
                          {isCompanyAdmin && (
                            <td className="px-6 py-4 text-sm text-gray-500 hidden md:table-cell">
                              {record.school_name || 'Unknown School'}
                            </td>
                          )}
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={
                        isCompanyAdmin 
                          ? (attendanceFilter === 'present' ? "6" : "4")
                          : (attendanceFilter === 'present' ? "5" : "3")
                      } className="px-6 py-12 text-center">
                        <div className="text-gray-500">
                          {loading ? (
                            <div className="flex items-center justify-center">
                              <svg className="animate-spin -ml-1 mr-3 h-5 w-5" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                              </svg>
                              Loading attendance records...
                            </div>
                          ) : (
                            <div>
                              <div className="text-4xl mb-2">📊</div>
                              <p className="font-medium">
                                {attendanceFilter === 'absent' 
                                  ? `No absent students found${gradeFilter ? ` in Grade ${gradeFilter}` : ''}`
                                  : (statusFilter === 'all' && !gradeFilter ? 'No attendance records found' : 
                                    `No records found for ${statusFilter !== 'all' ? statusFilter.replace('-', ' ') : ''}${statusFilter !== 'all' && gradeFilter ? ' and ' : ''}${gradeFilter ? `Grade ${gradeFilter}` : ''}`
                                    )
                                }
                              </p>
                              <p className="text-sm mt-1">
                                {dateRange.from === dateRange.to ? 
                                  `No records for ${formatDate(dateRange.from)}` :
                                  `No records between ${formatDate(dateRange.from)} and ${formatDate(dateRange.to)}`
                                }
                              </p>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Footer Summary */}
          {allFilteredData && allFilteredData.length > 0 && (
            <Card className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
              <div className="text-center">
                <div className="text-sm text-gray-700">
                  📊 Showing <span className="font-bold">{startIndex + 1}</span> to <span className="font-bold">{Math.min(endIndex, totalRecordsCount)}</span> of <span className="font-bold">{totalRecordsCount}</span> {attendanceFilter} records
                  {(statusFilter !== 'all' || gradeFilter) && (
                    <span className="block mt-1 text-xs text-gray-600">
                      🎯 Filtered by: {statusFilter !== 'all' && statusFilter.replace('-', ' ')}{statusFilter !== 'all' && gradeFilter && ' and '}{gradeFilter && `Grade ${gradeFilter}`}
                    </span>
                  )}
                </div>
                
                {/* Bottom pagination controls for convenience */}
                {pageSize !== 'all' && totalPages > 1 && (
                  <div className="flex justify-center items-center gap-2 mt-3">
                    <Button 
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={!hasPrevious}
                      variant="outline"
                      size="sm"
                    >
                      ← Previous
                    </Button>
                    
                    <span className="text-sm font-medium text-gray-700 px-3 py-1 bg-white rounded-lg border-2 border-gray-300">
                      {currentPage} of {totalPages}
                    </span>
                    
                    <Button 
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={!hasMore}
                      variant="outline"
                      size="sm"
                    >
                      Next →
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  )
}

export default AttendanceTab