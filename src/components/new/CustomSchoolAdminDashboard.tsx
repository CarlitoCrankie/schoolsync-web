// src/pages/CustomSchoolAdminDashboard.tsx
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import type { 
  User, 
  Stats, 
  Student, 
  AttendanceRecord,
  SchoolTimeSettings
} from '../../types/admin';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { 
  Users, 
  Building2,
  ClipboardCheck, 
  Settings, 
  LogOut,
  Upload,
  Menu,
  X
} from 'lucide-react';
import DashboardTab from '../../components/tabs/DashboardTab';
import StudentsTab from '../../components/tabs/StudentsTab';
import UploadStudentsTab from '../../components/tabs/UploadStudentsTab';
import AttendanceTab from '../../components/tabs/AttendanceTab';
import SchoolSettingsTab from '../../components/tabs/SchoolSettingsTab';
import { apiGet } from '@/lib/api';

interface CustomSchoolAdminDashboardProps {
  user: User;
  onLogout: () => void;
}

export default function CustomSchoolAdminDashboard({ user, onLogout }: CustomSchoolAdminDashboardProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState<Stats>({});
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [schoolTimeSettings, setSchoolTimeSettings] = useState<SchoolTimeSettings | null>(null);
  
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
    loadDashboardData();
  }, [user]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const schoolId = user?.SchoolID || user?.school_id;
      
      const [overviewData, studentsData, attendanceData] = await Promise.all([
        apiGet(`/api/analytics?type=overview&school_id=${schoolId}`),
        apiGet(`/api/students?school_id=${schoolId}&include_stats=true&limit=999999`),
        apiGet(`/api/analytics?type=real-time&school_id=${schoolId}`)
      ]);

      let totalStudents = studentsData?.totals?.total_students || studentsData?.data?.length || 0;
      let presentToday = overviewData?.overview?.attendance?.today || 0;
      // ✅ Debug and fix parent password counting
      console.log('=== DASHBOARD STUDENT SAMPLE ===')
      if (studentsData?.data?.length > 0) {
        console.log('First student:', studentsData.data[0])
        console.log('ParentPasswordSet field:', studentsData.data[0].ParentPasswordSet)
        console.log('parent_password_set field:', studentsData.data[0].parent_password_set)
      }

      let withoutPasswords = studentsData?.data?.filter((s: any) => {
        // Check all possible field names (backend uses PascalCase from SQL)
        const hasPassword = s.ParentPasswordSet || s.parent_password_set || s.parentPasswordSet
        const needsSetup = !hasPassword || hasPassword === false || hasPassword === 0
        return needsSetup
      }).length || 0;

      console.log('Dashboard stats:', {
        totalStudents,
        withoutPasswords,
        allStudents: studentsData?.data?.length
      })
      if (studentsData?.data) {
        setStudents(studentsData.data);
      }

      if (attendanceData?.current_activity) {
        setAttendance(attendanceData.current_activity.slice(0, 10));
      }

      setStats({
      total_students: totalStudents,
      present_today: presentToday,
      absent_today: Math.max(0, totalStudents - presentToday),
      students_without_passwords: withoutPasswords,
      attendance_rate: totalStudents > 0 ? Math.round((presentToday / totalStudents) * 100) : 0,
      sync_status: overviewData?.sync_status || 'offline',  // ← ADD THIS
      sync_last_heartbeat: overviewData?.sync_last_heartbeat  // ← ADD THIS
    });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'students', label: 'Students', icon: '👨‍🎓' },
    { id: 'upload', label: 'Upload', icon: '📤' },
    { id: 'attendance', label: 'Attendance', icon: '✅' },
    { id: 'settings', label: 'Settings', icon: '⚙️' }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Get theme from user object
  const primaryColor = user?.theme?.primary || '#1e40af';
  const secondaryColor = user?.theme?.secondary || '#dc2626';
  const accentColor = user?.theme?.accent || '#eff6ff';
  const logoUrl = user?.theme?.logo;
  const schoolName = user.school?.name || 'School Administration';

  return (
    <div className="min-h-screen bg-gray-50">
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
                <p className="text-sm text-gray-600">Admin Dashboard</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right hidden md:block">
                <p className="text-sm font-medium text-gray-900">{user.username || 'Admin'}</p>
                <p className="text-xs text-gray-600 capitalize">{user.role?.replace('_', ' ')}</p>
              </div>
              <Button variant="outline" onClick={onLogout} size="sm">
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Grid with Custom Colors */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card 
            className="p-6 border-2"
            style={{ 
              backgroundColor: `${primaryColor}15`,
              borderColor: `${primaryColor}50`
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium" style={{ color: primaryColor }}>
                  Total Students
                </p>
                <p className="text-3xl font-bold mt-2" style={{ color: primaryColor }}>
                  {stats.total_students}
                </p>
              </div>
              <Users className="h-12 w-12 opacity-50" style={{ color: primaryColor }} />
            </div>
          </Card>
          
          <Card 
            className="p-6 cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => setActiveTab('attendance')}
            style={{
              backgroundColor: `${secondaryColor}15`,
              borderColor: `${secondaryColor}50`,
              borderWidth: '2px'
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium" style={{ color: secondaryColor }}>Present Today</p>
                <p className="text-3xl font-bold mt-2" style={{ color: secondaryColor }}>{stats.present_today}</p>
                <p className="text-xs mt-1" style={{ color: secondaryColor }}>Click to view →</p>
              </div>
              <ClipboardCheck className="h-12 w-12 opacity-50" style={{ color: secondaryColor }} />
            </div>
          </Card>
          
          <Card 
            className="p-6 bg-gradient-to-br from-red-50 to-red-100 border-red-200 cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => setActiveTab('attendance')}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-600 font-medium">Absent Today</p>
                <p className="text-3xl font-bold text-red-900 mt-2">{stats.absent_today}</p>
                <p className="text-xs text-red-600 mt-1">Click to view →</p>
              </div>
              <X className="h-12 w-12 text-red-600 opacity-50" />
            </div>
          </Card>
          
          <Card className="p-6 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600 font-medium">Need Setup</p>
                <p className="text-3xl font-bold text-purple-900 mt-2">{stats.students_without_passwords}</p>
              </div>
              <Settings className="h-12 w-12 text-purple-600 opacity-50" />
            </div>
          </Card>
        </div>

        {/* Navigation Tabs */}
        <Card className="mb-8">
          <div className="hidden md:block border-b">
            <nav className="flex space-x-8 px-6">
              {tabs.map(tab => (
                <button 
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="py-4 px-1 border-b-2 font-medium text-sm transition-colors"
                  style={{
                    borderColor: activeTab === tab.id ? primaryColor : 'transparent',
                    color: activeTab === tab.id ? primaryColor : '#6b7280'
                  }}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="md:hidden border-b">
            <div className="px-4 py-3">
              <button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="flex items-center justify-between w-full"
              >
                <div className="flex items-center">
                  <span className="text-lg mr-2">
                    {tabs.find(tab => tab.id === activeTab)?.icon}
                  </span>
                  <span className="font-medium text-gray-900">
                    {tabs.find(tab => tab.id === activeTab)?.label}
                  </span>
                </div>
                <Menu className="h-5 w-5 text-gray-400" />
              </button>
              
              {showMobileMenu && (
                <div className="mt-3 space-y-1">
                  {tabs.map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setActiveTab(tab.id);
                        setShowMobileMenu(false);
                      }}
                      className="flex items-center w-full text-left px-3 py-2 rounded-md text-sm font-medium text-gray-600 hover:bg-gray-50"
                    >
                      <span className="text-lg mr-3">{tab.icon}</span>
                      {tab.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="p-6">
            {activeTab === 'dashboard' && (
              <DashboardTab 
                attendance={attendance} 
                stats={stats} 
                isCompanyAdmin={false} 
                user={user} 
                setActiveTab={setActiveTab}
                schoolTimeSettings={schoolTimeSettings}
              />
            )}
            {activeTab === 'students' && (
              <StudentsTab onRefresh={loadDashboardData} user={user} />
            )}
            {activeTab === 'upload' && (
              <UploadStudentsTab user={user} onUploadComplete={loadDashboardData} />
            )}
            {activeTab === 'attendance' && (
              <AttendanceTab 
                attendance={attendance} 
                isCompanyAdmin={false} 
                user={user}
                stats={stats}
              />
            )}
            {activeTab === 'settings' && (
              <SchoolSettingsTab user={user} />
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}