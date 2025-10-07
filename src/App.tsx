import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Landing from './pages/Landing';
import NotFound from './pages/NotFound';
import AdminDashboard from './components/new/AdminDashboard';
import ParentDashboard from './components/new/ParentsDashboard';
import CustomSchoolAdminDashboard from './components/new/CustomSchoolAdminDashboard';
import LoginFlow from './components/new/LoginFlow';

interface User {
  id?: number;
  user_id?: number;
  username?: string;
  role: string;
  user_type: 'admin' | 'parent';
  school_id?: number;
  SchoolID?: number;
  school?: {
    id: number;
    name: string;
  };
  student_id?: number;
  student_name?: string;
  parent_name?: string;
  hasCustomTheme?: boolean;
  theme?: {
    primary: string;
    secondary: string;
    accent: string;
    logo: string;
  };
  contact?: {
    email?: string;
    phone?: string;
    hasContact?: boolean;
  };
}

const INACTIVITY_TIMEOUT = 30 * 60 * 1000;

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    let inactivityTimer: NodeJS.Timeout;

    const resetTimer = () => {
      clearTimeout(inactivityTimer);
      localStorage.setItem('lastActivity', Date.now().toString());
      
      inactivityTimer = setTimeout(() => {
        handleLogout();
        alert('Your session has expired due to inactivity. Please log in again.');
      }, INACTIVITY_TIMEOUT);
    };

    const lastActivity = localStorage.getItem('lastActivity');
    if (lastActivity) {
      const timeSinceActivity = Date.now() - parseInt(lastActivity);
      if (timeSinceActivity > INACTIVITY_TIMEOUT) {
        handleLogout();
        alert('Your session has expired. Please log in again.');
        return;
      }
    }

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    events.forEach(event => document.addEventListener(event, resetTimer));
    resetTimer();

    return () => {
      clearTimeout(inactivityTimer);
      events.forEach(event => document.removeEventListener(event, resetTimer));
    };
  }, [user]);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.error('Error parsing stored user:', error);
        localStorage.clear();
      }
    }
    setLoading(false);
  }, []);

  const handleLogin = (userData: User, userToken: string) => {
    console.log('App.handleLogin called with:', userData);
    setUser(userData);
    setToken(userToken);
    localStorage.setItem('token', userToken);
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('lastActivity', Date.now().toString());
  };

  const handleLogout = () => {
    setUser(null);
    setToken(null);
    localStorage.clear();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route 
          path="/login" 
          element={
            user ? (
              user.user_type === 'admin' && user.role === 'school_admin' && user.hasCustomTheme ? (
                <Navigate to="/custom-admin-dashboard" replace />
              ) : user.user_type === 'admin' ? (
                <Navigate to="/admin-dashboard" replace />
              ) : (
                <Navigate to="/parent-dashboard" replace />
              )
            ) : (
              <LoginFlow onLogin={handleLogin} />
            )
          }
        />
        <Route 
          path="/admin-dashboard" 
          element={
            user && user.user_type === 'admin' ? (
              <AdminDashboard user={user} onLogout={handleLogout} />
            ) : (
              <Navigate to="/login" replace />
            )
          } 
        />
        <Route 
          path="/custom-admin-dashboard" 
          element={
            user && user.user_type === 'admin' && user.hasCustomTheme ? (
              <CustomSchoolAdminDashboard user={user} onLogout={handleLogout} />
            ) : user && user.user_type === 'admin' ? (
              <Navigate to="/admin-dashboard" replace />
            ) : (
              <Navigate to="/login" replace />
            )
          } 
        />
        <Route 
          path="/parent-dashboard" 
          element={
            user && user.user_type === 'parent' ? (
              <ParentDashboard user={user} onLogout={handleLogout} />
            ) : (
              <Navigate to="/login" replace />
            )
          } 
        />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;