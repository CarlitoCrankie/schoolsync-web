// src/pages/AdminDashboard.tsx
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import type { 
  User, 
  Stats, 
  Student, 
  AttendanceRecord, 
  School,
  SchoolTimeSettings,
  Tab,
  AbsentStudent 
} from '../../types/admin';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { useSchoolTheme } from '../../hooks/useSchoolTheme';
import { 
  Users, 
  School as SchoolIcon, 
  ClipboardCheck, 
  Settings, 
  LogOut,
  Upload,
  TrendingUp,
  Activity,
  Database,
  BarChart3,
  Menu,
  X
} from 'lucide-react';
import DashboardTab from '../tabs/DashboardTab';
import StudentsTab from '../tabs/StudentsTab';
import SchoolsNetworkTab from '../tabs/SchoolsNetworkTab';
import AnalyticsTab from '../tabs/AnalyticsTab';
import DatabaseHealthMonitor from '../tabs/DatabaseHealthMonitor';
import UploadStudentsTab from '../tabs/UploadStudentsTab';
import AttendanceTab from '../tabs/AttendanceTab';
import SchoolSettingsTab from '../tabs/SchoolSettingsTab';
import SystemMonitorTab from '../tabs/SystemMonitorTab';
import ThemeManagementTab from '../tabs/ThemeManagementTab';
import diamondLogo from "/school-logos/diamond-logo.jpg";
import {apiGet} from '../../lib/api'

interface AdminDashboardProps {
  user: User;
  onLogout: () => void;
}

export default function AdminDashboard({ user, onLogout }: AdminDashboardProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState<Stats>({});
  const [students, setStudents] = useState<Student[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [schoolTimeSettings, setSchoolTimeSettings] = useState<SchoolTimeSettings | null>(null);
  
  // Timeout and activity tracking
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const TIMEOUT_DURATION = 30 * 60 * 1000; // 30 minutes
  
  // Activity handlers
  const resetTimeout = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      alert('Session expired due to inactivity. You will be logged out.');
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

  const isCompanyAdmin = user?.role === 'company_admin' || user?.role === 'main_admin';
  const isSchoolAdmin = user?.role === 'school_admin' || !!user?.SchoolID || !!user?.school_id;

  useEffect(() => {
    if (!user) {
      setError('User information not available');
      setLoading(false);
      return;
    }

    if (!isCompanyAdmin && !user.SchoolID && !user.school_id) {
      setError('School ID not found in user data');
      setLoading(false);
      return;
    }

    loadDashboardData();
  }, [user]);

  const availableTabs: Tab[] = isCompanyAdmin ? [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'attendance', label: 'Network', icon: '👥' },
    { id: 'schools', label: 'Schools', icon: '🏫' },
    { id: 'themes', label: 'Themes', icon: '🎨' },
    { id: 'system-monitor', label: 'Monitor', icon: '⚡' },
    { id: 'health-monitor', label: 'DB Health', icon: '🔍' },
    { id: 'analytics', label: 'Analytics', icon: '📈' }
  ] : [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'students', label: 'Students', icon: '👨‍🎓' },
    { id: 'upload', label: 'Upload', icon: '📤' },
    { id: 'attendance', label: 'Attendance', icon: '✅' },
    { id: 'settings', label: 'Settings', icon: '⚙️' }
  ];

  const loadDashboardData = async () => {
    setLoading(true);
    setError('');
    
    try {
      if (isCompanyAdmin) {
        await loadCompanyAdminData();
      } else {
        await loadSchoolAdminData();
      }
    } catch (error: any) {
      console.error('Dashboard loading error:', error);
      setError('Failed to load dashboard data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadCompanyAdminData = async () => {
    try {
        const [overviewData, schoolsData, attendanceData, syncData] = await Promise.all([
          apiGet('/api/analytics?type=overview'),
          apiGet('/api/analytics?type=schools'),
          apiGet('/api/analytics?type=real-time'),
          apiGet('/api/analytics?type=sync-performance')
        ]);

      if (overviewData.success && overviewData.overview) {
        const syncAgents = syncData.success ? syncData.performance_metrics : null;
        const systemHealth = determineSystemHealth(overviewData.overview, syncAgents);
        
        setStats({
          total_schools: overviewData.overview.schools?.total || 0,
          total_students: overviewData.overview.students?.total || 0,
          active_sync_agents: syncAgents?.online_agents || 0,
          total_sync_agents: syncAgents?.total_agents || 0,
          system_health: systemHealth,
          total_attendance_today: overviewData.overview.attendance?.today || 0,
          sync_health_score: syncAgents?.avg_health_score || 0
        });
      }

      if (schoolsData.success && schoolsData.schools) {
        setSchools(schoolsData.schools.map((school: any) => ({
          id: school.SchoolID || school.school_id,
          name: school.name,
          location: school.location,
          status: school.status,
          students: school.students?.total || 0,
          syncStatus: school.sync_agent?.connection_status?.toLowerCase() || 'offline'
        })));
      }

      if (attendanceData.success && attendanceData.current_activity) {
        setAttendance(attendanceData.current_activity.map((record: any) => ({
          id: record.attendance_id,
          student_name: record.student_name,
          scan_time: record.scan_time,
          status: record.status,
          created_at: record.created_at,
          school_name: record.school_name
        })));
      }
    } catch (error) {
      console.error('Error loading company admin data:', error);
      throw error;
    }
  };

  const loadSchoolAdminData = async () => {
    try {
      const schoolId = user?.SchoolID || user?.school_id;
      
      if (!schoolId) {
        throw new Error('School ID not found in user data');
      }
        const apiCalls = [
          apiGet(`/api/analytics?type=overview&school_id=${schoolId}`).catch(() => ({ success: false })),
          apiGet(`/api/students?school_id=${schoolId}&include_stats=true&limit=999999`).catch(() => ({ success: false })),
          apiGet(`/api/analytics?type=real-time&school_id=${schoolId}`).catch(() => ({ success: false })),
        ];

      const [overviewData, studentsData, attendanceData] = await Promise.all(apiCalls);

      let totalStudents = 0;
      let presentToday = 0;
      let withoutPasswords = 0;

      if (studentsData?.success) {
        if (studentsData.totals) {
          totalStudents = studentsData.totals.total_students;
          
          if (Array.isArray(studentsData.data)) {
            withoutPasswords = studentsData.data.filter((s: any) => !s.parent_password_set).length;
            
            setStudents(studentsData.data.map((student: any) => ({
              id: student.student_id,
              name: student.name,
              grade: student.grade,
              studentCode: student.student_code,
              student_code: student.student_code,
              parentPasswordSet: student.parent_password_set,
              parent_password_set: student.parent_password_set,
              lastSeen: student.attendance_stats?.last_attendance,
              is_active: student.is_active !== false
            })));
          }
        } else if (Array.isArray(studentsData.data)) {
          totalStudents = studentsData.data.length;
          withoutPasswords = studentsData.data.filter((s: any) => !s.parent_password_set).length;

          setStudents(studentsData.data.map((student: any) => ({
            id: student.student_id,
            name: student.name,
            grade: student.grade,
            studentCode: student.student_code,
            parentPasswordSet: student.parent_password_set,
            is_active: student.is_active !== false
          })));
        }
      }

      if (attendanceData?.success && Array.isArray(attendanceData.current_activity)) {
        presentToday = overviewData?.overview?.attendance?.today || 0;
        
        const recentCheckIns = attendanceData.current_activity
          .sort((a: any, b: any) => new Date(b.scan_time || b.created_at).getTime() - new Date(a.scan_time || a.created_at).getTime())
          .slice(0, 10);

        setAttendance(recentCheckIns.map((record: any) => ({
          id: record.attendance_id,
          studentName: record.student_name,
          status: record.status,
          time: record.scan_time,
          grade: 'N/A'
        })));
      }

      setStats({
        total_students: totalStudents,
        present_today: presentToday,
        absent_today: Math.max(0, totalStudents - presentToday),
        students_without_passwords: withoutPasswords,
        sync_status: overviewData?.sync_status || 'offline',
        attendance_rate: totalStudents > 0 ? Math.round((presentToday / totalStudents) * 100) : 0
      });
    } catch (error) {
      console.error('Error in loadSchoolAdminData:', error);
      throw error;
    }
  };

  const determineSystemHealth = (overview: any, syncData: any) => {
    let totalAgents = syncData?.total_agents || 0;
    let onlineAgents = syncData?.online_agents || 0;

    if (totalAgents === 0) return 'no_agents';
    if (onlineAgents === 0) return 'error';

    const onlinePercentage = (onlineAgents / totalAgents) * 100;

    if (onlinePercentage >= 60) return 'healthy';
    if (onlinePercentage >= 20) return 'degraded';
    return 'error';
  };

  if (!user) {
return (
      <div className="min-h-screen bg-animated-gradient">
        {/* Grid Pattern */}
        <div className="absolute inset-0 bg-grid-cyan opacity-10 pointer-events-none" />
        <Card className="p-6 text-center">
          <div className="text-red-600 text-4xl mb-2">⚠️</div>
          <p className="text-gray-600">User information not available</p>
          <Button onClick={() => navigate('/login')} className="mt-4">
            Go to Login
          </Button>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-animated-gradient">
        {/* Grid Pattern */}
        <div className="absolute inset-0 bg-grid-cyan opacity-10 pointer-events-none" />
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const handleRefresh = () => {
  loadDashboardData();
};

  return (
    <div className="min-h-screen bg-animated-gradient">
      {/* Grid Pattern */}
      <div className="absolute inset-0 bg-grid-cyan opacity-10 pointer-events-none" />
      {/* Header */}
      <header className="bg-gradient-to-r from-card to-card/80 shadow-lg border-b border-primary/20 sticky top-0 z-50 backdrop-blur-sm relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img 
                src={diamondLogo} 
                alt="Logo"
                className="w-10 h-10 object-contain rounded-lg"
              />
              <div>
                <h1 className="text-2xl font-bold text-white">
                  {isCompanyAdmin ? 'Company Dashboard' : (user.school?.name || 'School Dashboard')}
                </h1>
                <p className="text-sm text-primary font-medium">
                  {isCompanyAdmin 
                    ? 'Diamond Attendance Network' 
                    : 'School Administration'
                  }
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right hidden md:block">
                <p className="text-sm font-semibold text-white">{user.username || 'Admin'}</p>
                <p className="text-xs text-primary capitalize">{user.role?.replace('_', ' ')}</p>
              </div>
              <Button 
                variant="outline" 
                onClick={() => {
                  if (typeof onLogout === 'function') {
                    onLogout();
                  } else {
                    localStorage.clear();
                    window.location.href = '/login';
                  }
                }} 
                size="sm"
                className="border-primary/30 hover:bg-primary/10 hover:border-primary text-white"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {isCompanyAdmin ? (
          <>
            <Card className="p-6 card-glow hover:scale-105 transition-transform">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-400 font-bold mb-2">Schools Network</p>
                  <p className="text-4xl font-extrabold text-white">{stats.total_schools}</p>
                </div>
                <div className="w-16 h-16 rounded-2xl bg-blue-500/20 flex items-center justify-center">
                  <SchoolIcon className="h-8 w-8 text-blue-400" />
                </div>
              </div>
            </Card>
            
            <Card className="p-6 card-glow hover:scale-105 transition-transform">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-400 font-bold mb-2">Total Students</p>
                  <p className="text-4xl font-extrabold text-white">{stats.total_students}</p>
                </div>
                <div className="w-16 h-16 rounded-2xl bg-green-500/20 flex items-center justify-center">
                  <Users className="h-8 w-8 text-green-400" />
                </div>
              </div>
            </Card>
            
            <Card className="p-6 card-glow hover:scale-105 transition-transform">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-400 font-bold mb-2">Active Sync Agents</p>
                  <p className="text-4xl font-extrabold text-white">
                    {stats.active_sync_agents}/{stats.total_sync_agents}
                  </p>
                </div>
                <div className="w-16 h-16 rounded-2xl bg-purple-500/20 flex items-center justify-center">
                  <Activity className="h-8 w-8 text-purple-400" />
                </div>
              </div>
            </Card>
            
            <Card className={`p-6 card-glow hover:scale-105 transition-transform`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold mb-2" style={{
                    color: stats.system_health === 'healthy' ? '#4ade80' : 
                          stats.system_health === 'degraded' ? '#fbbf24' : '#f87171'
                  }}>System Health</p>
                  <p className="text-4xl font-extrabold text-white capitalize">{stats.system_health}</p>
                </div>
                <div 
                  className="w-16 h-16 rounded-2xl flex items-center justify-center"
                  style={{
                    backgroundColor: stats.system_health === 'healthy' ? '#4ade8020' : 
                                    stats.system_health === 'degraded' ? '#fbbf2420' : '#f8717120'
                  }}
                >
                  <TrendingUp className="h-8 w-8" style={{
                    color: stats.system_health === 'healthy' ? '#4ade80' : 
                          stats.system_health === 'degraded' ? '#fbbf24' : '#f87171'
                  }} />
                </div>
              </div>
            </Card>
          </>
        ) : (
            <>
              <Card className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-blue-600 font-medium">Total Students</p>
                    <p className="text-3xl font-bold text-blue-900 mt-2">{stats.total_students}</p>
                  </div>
                  <Users className="h-12 w-12 text-blue-600 opacity-50" />
                </div>
              </Card>
              
              <Card 
                className="p-6 bg-gradient-to-br from-green-50 to-green-100 border-green-200 cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => setActiveTab('attendance')}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-green-600 font-medium">Present Today</p>
                    <p className="text-3xl font-bold text-green-900 mt-2">{stats.present_today}</p>
                    <p className="text-xs text-green-600 hover:text-green-700 mt-1">Click to view →</p>
                  </div>
                  <ClipboardCheck className="h-12 w-12 text-green-600 opacity-50" />
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
                    <p className="text-xs text-red-600 hover:text-red-700 mt-1">Click to view →</p>
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
            </>
          )}
        </div>

        {/* Navigation Tabs */}
        <Card className="mb-8 card-dark-solid">
          {/* Desktop Navigation */}
          <div className="hidden md:block border-b border-primary/20">
            <nav className="flex space-x-8 px-6">
              {availableTabs.map(tab => (
                <button 
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-semibold text-sm transition-colors ${
                    activeTab === tab.id 
                      ? 'border-primary text-primary' 
                      : 'border-transparent text-muted-foreground hover:text-white'
                  }`}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
          
          {/* Mobile Navigation */}
          <div className="md:hidden border-b">
            <div className="px-4 py-3">
              <button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="flex items-center justify-between w-full text-left"
              >
                <div className="flex items-center">
                  <span className="text-lg mr-2">
                    {availableTabs.find(tab => tab.id === activeTab)?.icon}
                  </span>
                  <span className="font-medium text-gray-900">
                    {availableTabs.find(tab => tab.id === activeTab)?.label}
                  </span>
                </div>
                <Menu className="h-5 w-5 text-gray-400" />
              </button>
              
              {showMobileMenu && (
                <div className="mt-3 space-y-1">
                  {availableTabs.map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setActiveTab(tab.id);
                        setShowMobileMenu(false);
                      }}
                      className={`flex items-center w-full text-left px-3 py-2 rounded-md text-sm font-medium ${
                        activeTab === tab.id
                          ? 'bg-indigo-100 text-indigo-700'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                      }`}
                    >
                      <span className="text-lg mr-3">{tab.icon}</span>
                      {tab.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Tab Content */}
        <div className="p-6">
            {activeTab === 'dashboard' && <DashboardTab attendance={attendance} stats={stats} isCompanyAdmin={isCompanyAdmin} user={user} setActiveTab={setActiveTab} schoolTimeSettings={schoolTimeSettings} />}
            {activeTab === 'students' && !isCompanyAdmin && <StudentsTab onRefresh={loadDashboardData} user={user} />}
            {activeTab === 'upload' && !isCompanyAdmin && <UploadStudentsTab user={user} onUploadComplete={loadDashboardData} />}
            {activeTab === 'attendance' && (
            <AttendanceTab 
                attendance={attendance} 
                isCompanyAdmin={isCompanyAdmin} 
                user={user}
                stats={stats}
            />
            )}
            {activeTab === 'settings' && !isCompanyAdmin && <SchoolSettingsTab user={user} />}
            {activeTab === 'system-monitor' && isCompanyAdmin && <SystemMonitorTab companyId={user.company_id} />}
            {activeTab === 'schools' && isCompanyAdmin && <SchoolsNetworkTab companyId={user.company_id} user={user} />}
            {activeTab === 'analytics' && isCompanyAdmin && <AnalyticsTab companyId={user.company_id} />}
            {activeTab === 'themes' && isCompanyAdmin && <ThemeManagementTab companyId={user.company_id} />}
            {activeTab === 'health-monitor' && isCompanyAdmin && <DatabaseHealthMonitor />}
        </div>
        </Card>
      </div>
    </div>
  );
}
