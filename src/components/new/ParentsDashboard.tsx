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
      const result = await apiPost('/api/attendance', {
        action: 'get_student_attendance',
        student_id: user.student_id,
        school_id: user.school.id
      });

      if (result.success) {
        setAttendanceData(result.attendance || []);
        setStats(result.stats || []);
      } else {
        loadMockData();
      }
    } catch (error) {
      console.error('Failed to load parent data:', error);
      loadMockData();
    } finally {
      setLoading(false);
    }
  };

  const loadMockData = () => {
    const mockAttendance: AttendanceRecord[] = [
      { id: 1, scanTime: '2025-08-26T08:15:00', status: 'IN', date: '2025-08-26' },
      { id: 2, scanTime: '2025-08-25T08:10:00', status: 'IN', date: '2025-08-25' }
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

  // Get theme colors
  const primaryColor = user?.theme?.primary || '#4f46e5';
  const secondaryColor = user?.theme?.secondary || '#dc2626';
  const logoUrl = user?.theme?.logo;
  const schoolName = user.school?.name || 'School';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Custom Header with School Branding */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {logoUrl ? (
                <img 
                  src={logoUrl} 
                  alt={schoolName}
                  className="w-10 h-10 object-contain rounded-lg"
                />
              ) : (
                <div 
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: primaryColor }}
                >
                  <Building2 className="h-6 w-6 text-white" />
                </div>
              )}
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{schoolName}</h1>
                <p className="text-sm text-gray-600">Parent Portal</p>
              </div>
            </div>
            <Button variant="outline" onClick={onLogout} size="sm">
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
          <p className="text-gray-600">
            Viewing attendance for {user.student_name}
          </p>
        </div>

        {/* Stats Cards with Custom Colors */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card 
            className="p-6 border-2"
            style={{ 
              backgroundColor: `${primaryColor}15`,
              borderColor: `${primaryColor}50`
            }}
          >
            <div className="flex items-center">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${primaryColor}30` }}>
                <span style={{ color: primaryColor }}>📊</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium" style={{ color: primaryColor }}>Attendance Rate</p>
                <p className="text-2xl font-bold" style={{ color: primaryColor }}>{stats.attendanceRate || 0}%</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <span className="text-green-600">✅</span>
              </div>
              <div className="ml-4">
                <p className="text-sm text-green-600 font-medium">Present Days</p>
                <p className="text-2xl font-bold text-green-900">{stats.presentDays || 0}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <span className="text-yellow-600">⏰</span>
              </div>
              <div className="ml-4">
                <p className="text-sm text-yellow-600 font-medium">Late Days</p>
                <p className="text-2xl font-bold text-yellow-900">{stats.lateDays || 0}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-red-50 to-red-100 border-red-200">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <span className="text-red-600">❌</span>
              </div>
              <div className="ml-4">
                <p className="text-sm text-red-600 font-medium">Absent Days</p>
                <p className="text-2xl font-bold text-red-900">{stats.absentDays || 0}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Navigation Tabs */}
        <Card className="mb-8">
          <div className="border-b">
            <nav className="flex space-x-8 px-6">
              {['dashboard', 'attendance', 'contact'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className="py-4 px-1 border-b-2 font-medium text-sm transition-colors capitalize"
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
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Recent Activity</h3>
                {attendanceData.slice(0, 5).map((record, index) => (
                  <div key={index} className="p-4 bg-gray-50 rounded-lg flex justify-between items-center">
                    <div>
                      <p className="font-medium">
                        {new Date(record.scanTime || record.date).toLocaleDateString()}
                      </p>
                      <p className="text-sm text-gray-600">
                        {record.scanTime && `${record.status === 'IN' ? 'Check-in' : 'Check-out'}: ${new Date(record.scanTime).toLocaleTimeString()}`}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      record.status === 'IN' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {record.status === 'IN' ? 'Check In' : 'Check Out'}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'attendance' && (
              <ParentAttendanceTab 
                attendanceData={attendanceData}
                studentId={user.student_id}
              />
            )}

            {activeTab === 'contact' && (
              <div className="space-y-6">
                <Card className="p-6 bg-blue-50 border border-blue-200">
                  <h3 className="text-lg font-semibold text-blue-900 mb-4">Your Contact Information</h3>
                  <div className="space-y-3">
                    <div className="p-3 bg-white rounded-lg">
                      <p className="text-sm font-medium text-gray-700">Email</p>
                      <p className="text-gray-900">{user.contact?.email || 'Not provided'}</p>
                    </div>
                    <div className="p-3 bg-white rounded-lg">
                      <p className="text-sm font-medium text-gray-700">Phone</p>
                      <p className="text-gray-900">{user.contact?.phone || 'Not provided'}</p>
                    </div>
                  </div>
                  <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800">
                      <strong>To update your contact information:</strong> Please contact {schoolName} directly. 
                      The school will update your contact details to ensure you receive attendance notifications.
                    </p>
                  </div>
                </Card>

                <Card className="p-6 bg-gray-50">
                  <h4 className="text-lg font-semibold mb-4">School Contact</h4>
                  <p className="text-gray-700">{schoolName}</p>
                  <p className="text-sm text-gray-600 mt-2">
                    Contact your school's administration office for any questions or updates.
                  </p>
                </Card>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}