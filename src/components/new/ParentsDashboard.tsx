import { useState, useEffect, useRef } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Building2, Calendar, Clock, User, LogOut } from 'lucide-react';
import ParentAttendanceTab from '../tabs/ParentAttendanceTab';
import { apiPost } from '@/lib/api';

interface User {
  student_id: number;
  student_name: string;
  parent_name?: string;
  school: {
    id: number;
    name: string;
  };
  contact?: {
    email?: string;
    phone?: string;
    hasContact?: boolean;
  };
  hasCustomTheme?: boolean;
  theme?: {
    primary: string;
    secondary: string;
    accent: string;
    logo: string;
  };
}

interface AttendanceRecord {
  id: number;
  scanTime?: string;
  date?: string;
  status: string;
  message?: string;
  statusType?: string;
  statusLabel?: string;
}

interface Stats {
  totalDays?: number;
  presentDays?: number;
  lateDays?: number;
  absentDays?: number;
  attendanceRate?: number;
}

interface ParentDashboardProps {
  user: User;
  onLogout: () => void;
}

export default function ParentDashboard({ user, onLogout }: ParentDashboardProps) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([]);
  const [stats, setStats] = useState<Stats>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const TIMEOUT_DURATION = 30 * 60 * 1000;

  const resetTimeout = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      alert('Session expired due to inactivity.');
      onLogout();
    }, TIMEOUT_DURATION);
  };

  useEffect(() => {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    const handleActivity = () => resetTimeout();

    events.forEach(event => {
      document.addEventListener(event, handleActivity, true);
    });

    resetTimeout();

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      events.forEach(event => {
        document.removeEventListener(event, handleActivity, true);
      });
    };
  }, []);

  useEffect(() => {
    loadParentData();
  }, [user]);

  const loadParentData = async () => {
    setLoading(true);
    setError('');

    try {
      const studentId = user.student_id;
      const schoolId = user.school.id;

      console.log('📊 Loading parent dashboard data:', { studentId, schoolId });

      // ✅ Request full year of data (365 days)
      const result = await apiPost('/api/attendance', {
        action: 'get_student_attendance',
        student_id: studentId,
        school_id: schoolId,
        limit: 999999,  // Get all records
        days: 365       // Full year
      });

      console.log('📥 Backend API Response:', {
        success: result.success,
        stats: result.stats,
        recordCount: result.attendance?.length
      });

      if (result.success) {
        const backendStats = result.stats || {};
        
        // ✅ Map backend stats to component state
        setStats({
          attendanceRate: backendStats.attendanceRate || 0,
          presentDays: backendStats.presentDays || 0,
          lateDays: backendStats.lateDays || 0,
          absentDays: backendStats.absentDays || 0,
          totalDays: backendStats.expectedSchoolDays || 0
        });

        setAttendanceData(result.attendance || []);

        console.log('✅ Dashboard loaded:', {
          topCards: {
            attendanceRate: backendStats.attendanceRate,
            presentDays: backendStats.presentDays,
            lateDays: backendStats.lateDays,
            absentDays: backendStats.absentDays
          },
          recordsLoaded: result.attendance?.length || 0
        });
      } else {
        console.warn('⚠️ API returned success=false');
        loadMockData();
      }
    } catch (error) {
      console.error('❌ Failed to load parent data:', error);
      setError('Failed to load attendance data');
      loadMockData();
    } finally {
      setLoading(false);
    }
  };

  const loadMockData = () => {
    console.log('📝 Loading mock data');
    
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const mockAttendance: AttendanceRecord[] = [
      { 
        id: 1, 
        scanTime: today.toISOString(), 
        status: 'IN', 
        date: today.toISOString().split('T')[0],
        statusType: 'on-time',
        statusLabel: 'On Time',
        message: 'Arrived on time'
      },
      { 
        id: 2, 
        scanTime: yesterday.toISOString(), 
        status: 'IN', 
        date: yesterday.toISOString().split('T')[0],
        statusType: 'on-time',
        statusLabel: 'On Time',
        message: 'Arrived on time'
      }
    ];

    setAttendanceData(mockAttendance);
    setStats({
      totalDays: 2,
      presentDays: 2,
      lateDays: 0,
      absentDays: 0,
      attendanceRate: 100
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading attendance data...</p>
        </div>
      </div>
    );
  }

  // ✅ Add error display
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="p-8 max-w-md">
          <div className="text-center">
            <div className="text-6xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Unable to Load Data</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <Button onClick={loadParentData}>
              Try Again
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Get theme colors
  const primaryColor = user?.theme?.primary || '#4f46e5';
  const secondaryColor = user?.theme?.secondary || '#dc2626';
  const logoUrl = user?.theme?.logo;
  const schoolName = user.school?.name || 'School';

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Custom Header with School Branding */}
      <header className="bg-white shadow-sm border-b border-indigo-100 sticky top-0 z-50 backdrop-blur-sm bg-white/90">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {logoUrl ? (
                <img 
                  src={logoUrl} 
                  alt={schoolName}
                  className="w-10 h-10 object-contain rounded-lg shadow-sm"
                />
              ) : (
                <div 
                  className="w-10 h-10 rounded-lg flex items-center justify-center shadow-sm"
                  style={{ backgroundColor: primaryColor }}
                >
                  <Building2 className="h-6 w-6 text-white" />
                </div>
              )}
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{schoolName}</h1>
                <p className="text-sm text-indigo-600 font-medium">Parent Portal</p>
              </div>
            </div>
            <Button 
              variant="outline" 
              onClick={onLogout} 
              size="sm"
              className="border-indigo-200 hover:bg-indigo-50 hover:border-indigo-300 text-indigo-700"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900">
            Welcome, {user.parent_name || 'Parent'}!
          </h2>
          <p className="text-indigo-600 font-medium text-lg">
            Viewing attendance for <span className="font-bold">{user.student_name}</span>
          </p>
        </div>

        {/* Stats Cards with Custom Colors */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card 
            className="p-6 border-2 shadow-lg hover:shadow-xl transition-shadow bg-white"
            style={{ 
              borderColor: `${primaryColor}50`
            }}
          >
            <div className="flex items-center">
              <div 
                className="w-12 h-12 rounded-lg flex items-center justify-center mr-4" 
                style={{ backgroundColor: `${primaryColor}15` }}
              >
                <span className="text-2xl" style={{ color: primaryColor }}>📊</span>
              </div>
              <div>
                <p className="text-sm font-bold text-gray-700">Attendance Rate</p>
                <p className="text-3xl font-extrabold" style={{ color: primaryColor }}>
                  {stats.attendanceRate || 0}%
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-white border-2 border-green-300 shadow-lg hover:shadow-xl transition-shadow">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mr-4">
                <span className="text-2xl text-green-600">✅</span>
              </div>
              <div>
                <p className="text-sm text-green-700 font-bold">Present Days</p>
                <p className="text-3xl font-extrabold text-green-700">{stats.presentDays || 0}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-white border-2 border-amber-300 shadow-lg hover:shadow-xl transition-shadow">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center mr-4">
                <span className="text-2xl text-amber-600">⏰</span>
              </div>
              <div>
                <p className="text-sm text-amber-700 font-bold">Late Days</p>
                <p className="text-3xl font-extrabold text-amber-700">{stats.lateDays || 0}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-white border-2 border-red-300 shadow-lg hover:shadow-xl transition-shadow">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mr-4">
                <span className="text-2xl text-red-600">❌</span>
              </div>
              <div>
                <p className="text-sm text-red-700 font-bold">Absent Days</p>
                <p className="text-3xl font-extrabold text-red-700">{stats.absentDays || 0}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Navigation Tabs */}
        <Card className="mb-8 shadow-lg bg-white">
          <div className="border-b border-indigo-100">
            <nav className="flex space-x-8 px-6">
              {['dashboard', 'attendance', 'contact'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className="py-4 px-1 border-b-2 font-semibold text-sm transition-colors capitalize"
                  style={{
                    borderColor: activeTab === tab ? primaryColor : 'transparent',
                    color: activeTab === tab ? primaryColor : '#6b7280'
                  }}
                >
                  {tab === 'dashboard' && '📊 Recent Activity'}
                  {tab === 'attendance' && '📅 History'}
                  {tab === 'contact' && '📞 Contact'}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'dashboard' && (
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-6">
                  <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${primaryColor}15` }}
                  >
                    <span className="text-2xl">📊</span>
                  </div>
                  <h3 className="text-2xl font-extrabold text-gray-900">Recent Activity</h3>
                </div>
                
                {attendanceData && attendanceData.length > 0 ? (
                  <div className="space-y-3">
                    {attendanceData.slice(0, 5).map((record, index) => (
                      <Card 
                        key={index} 
                        className="p-5 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-indigo-200 hover:border-indigo-400 hover:shadow-lg transition-all"
                      >
                        <div className="flex justify-between items-center">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Calendar className="h-5 w-5 text-indigo-600" />
                              <p className="font-extrabold text-gray-900 text-lg">
                                {new Date(record.scanTime || record.date).toLocaleDateString('en-US', {
                                  weekday: 'long',
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric'
                                })}
                              </p>
                            </div>
                            {record.scanTime && (
                              <div className="flex items-center gap-2 ml-7">
                                <Clock className="h-4 w-4 text-gray-600" />
                                <p className="text-sm text-gray-700 font-semibold">
                                  {record.status === 'IN' ? 'Check-in' : 'Check-out'}: {new Date(record.scanTime).toLocaleTimeString('en-US', {
                                    hour: 'numeric',
                                    minute: '2-digit',
                                    hour12: true
                                  })}
                                </p>
                              </div>
                            )}
                            {record.message && (
                              <p className="text-sm text-gray-600 mt-2 ml-7 italic">{record.message}</p>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <span className={`px-4 py-2 rounded-full text-sm font-extrabold border-2 shadow-sm ${
                              record.status === 'IN' 
                                ? 'bg-green-100 text-green-800 border-green-300' 
                                : 'bg-blue-100 text-blue-800 border-blue-300'
                            }`}>
                              {record.status === 'IN' ? '✅ Check In' : '🚪 Check Out'}
                            </span>
                            {record.statusLabel && (
                              <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                                record.statusType === 'late' 
                                  ? 'bg-red-100 text-red-700 border-red-300' 
                                  : record.statusType === 'on-time' 
                                    ? 'bg-green-100 text-green-700 border-green-300'
                                    : 'bg-gray-100 text-gray-700 border-gray-300'
                              }`}>
                                {record.statusLabel}
                              </span>
                            )}
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card className="p-12 bg-gradient-to-br from-gray-50 to-blue-50 border-2 border-gray-300">
                    <div className="text-center">
                      <div className="text-6xl mb-4">📭</div>
                      <h4 className="text-xl font-extrabold text-gray-900 mb-2">No Recent Activity</h4>
                      <p className="text-gray-600 font-semibold">
                        Attendance records will appear here when your child checks in or out.
                      </p>
                    </div>
                  </Card>
                )}
              </div>
            )}

            {activeTab === 'attendance' && (
              <ParentAttendanceTab 
                attendanceData={attendanceData}
                studentId={user.student_id}
                initialStats={stats}
              />
            )}

            {activeTab === 'contact' && (
              <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center gap-3 mb-6">
                  <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${primaryColor}15` }}
                  >
                    <span className="text-2xl">📞</span>
                  </div>
                  <h3 className="text-2xl font-extrabold text-gray-900">Contact Information</h3>
                </div>

                {/* Your Contact Info Card */}
                <Card className="p-6 bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-300 shadow-lg">
                  <div className="flex items-center gap-3 mb-6">
                    <User className="h-6 w-6 text-blue-600" />
                    <h4 className="text-xl font-extrabold text-blue-900">Your Contact Information</h4>
                  </div>
                  <div className="space-y-3">
                    <Card className="p-4 bg-white border-2 border-blue-200 shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <span className="text-xl">📧</span>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-extrabold text-gray-700">Email Address</p>
                          <p className="text-gray-900 font-semibold text-lg">{user.contact?.email || 'Not provided'}</p>
                        </div>
                      </div>
                    </Card>
                    
                    <Card className="p-4 bg-white border-2 border-blue-200 shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <span className="text-xl">📱</span>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-extrabold text-gray-700">Phone Number</p>
                          <p className="text-gray-900 font-semibold text-lg">{user.contact?.phone || 'Not provided'}</p>
                        </div>
                      </div>
                    </Card>
                  </div>
                  
                  <Card className="mt-6 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-300 shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                        <span className="text-lg">💡</span>
                      </div>
                      <div>
                        <p className="font-extrabold text-yellow-900 mb-2">Need to Update Your Information?</p>
                        <p className="text-sm text-yellow-800 font-semibold">
                          Please contact <span className="font-extrabold" style={{ color: primaryColor }}>{schoolName}</span> directly. 
                          The school will update your contact details to ensure you receive all attendance notifications via email and SMS.
                        </p>
                      </div>
                    </div>
                  </Card>
                </Card>

                {/* School Contact Card */}
                <Card className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-300 shadow-lg">
                  <div className="flex items-center gap-3 mb-6">
                    <Building2 className="h-6 w-6 text-purple-600" />
                    <h4 className="text-xl font-extrabold text-purple-900">School Contact</h4>
                  </div>
                  
                  <div className="space-y-4">
                    <Card className="p-4 bg-white border-2 border-purple-200 shadow-sm">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-12 h-12 rounded-lg flex items-center justify-center shadow-sm"
                          style={{ backgroundColor: `${primaryColor}15` }}
                        >
                          {logoUrl ? (
                            <img 
                              src={logoUrl} 
                              alt={schoolName}
                              className="w-10 h-10 object-contain rounded"
                            />
                          ) : (
                            <Building2 className="h-6 w-6" style={{ color: primaryColor }} />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-extrabold text-gray-700">School Name</p>
                          <p className="text-gray-900 font-extrabold text-xl" style={{ color: primaryColor }}>
                            {schoolName}
                          </p>
                        </div>
                      </div>
                    </Card>
                    
                    <Card className="p-4 bg-purple-50 border-2 border-purple-200">
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">📍</span>
                        <div>
                          <p className="text-sm text-purple-700 font-semibold">
                            Contact your school's administration office for any questions, updates, or concerns regarding your child's attendance.
                          </p>
                        </div>
                      </div>
                    </Card>
                  </div>
                </Card>

                {/* Quick Links Card */}
                <Card className="p-6 bg-gradient-to-br from-indigo-50 to-blue-50 border-2 border-indigo-300 shadow-lg">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-2xl">⚡</span>
                    <h4 className="text-xl font-extrabold text-indigo-900">Quick Actions</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Card 
                      className="p-4 bg-white border-2 border-indigo-200 hover:border-indigo-400 hover:shadow-md transition-all cursor-pointer"
                      onClick={() => setActiveTab('attendance')}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                          <span className="text-xl">📅</span>
                        </div>
                        <div>
                          <p className="font-extrabold text-indigo-900">View Full History</p>
                          <p className="text-xs text-indigo-700">Check all attendance records</p>
                        </div>
                      </div>
                    </Card>
                  </div>
                </Card>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}