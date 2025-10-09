// src/components/new/LoginFlow.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Eye, EyeOff, AlertCircle, ArrowLeft, Home } from 'lucide-react';
import companyLogo from "/school-logos/diamond-logo.jpg";
import { apiPost } from "@/lib/api.ts";

interface LoginFlowProps {
  onLogin: (user: any, token: string) => void;
}

export default function LoginFlow({ onLogin }: LoginFlowProps) {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError('');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.username || !formData.password) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const isStudentId = /^\d+$/.test(formData.username);

      const loginData = {
        action: 'login',
        username: formData.username,
        password: formData.password,
        is_student_id: isStudentId,
      };

      const data = await apiPost('/api/auth', loginData);

      console.log('Login successful, user data:', data.user);

      if (typeof onLogin === 'function') {
        onLogin(data.user, data.token);
      } else {
        console.error('onLogin is not a function!', typeof onLogin);
      }

      if (data.user.user_type === 'admin') {
        if (data.user.role === 'school_admin' && data.user.hasCustomTheme) {
          console.log('Navigating to custom dashboard');
          navigate('/custom-admin-dashboard');
        } else {
          console.log('Navigating to standard admin dashboard');
          navigate('/admin-dashboard');
        }
      } else if (data.user.user_type === 'parent') {
        console.log('Navigating to parent dashboard');
        navigate('/parent-dashboard');
      }
      
    } catch (error: any) {
      console.error('Login error:', error);
      setError(error.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 relative">
      {/* Back to Home Button - Top Left */}
      <button
        onClick={() => navigate('/')}
        className="absolute top-6 left-6 flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 bg-white/80 hover:bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-200 group"
      >
        <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
        <span className="font-medium">Back to Home</span>
      </button>

      <Card className="max-w-md w-full p-8 shadow-xl">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <img 
            src={companyLogo} 
            alt="Company Logo"
            className="w-24 h-24 object-contain mx-auto mb-4"
          />
          <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-600 to-purple-600 bg-clip-text text-transparent">
            Diamond Attendance
          </h1>
          <p className="text-gray-600 mt-2">Sign in to your account</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <Label htmlFor="username" className="text-gray-700">
              Username or Student ID
            </Label>
            <p className="text-xs text-gray-500 mt-1 mb-2">
              Staff: Enter your username | Parents: Enter student ID
            </p>
            <Input
              id="username"
              name="username"
              type="text"
              value={formData.username}
              onChange={handleInputChange}
              placeholder="Username or Student ID"
              disabled={loading}
              className="mt-1"
              required
            />
          </div>

          <div>
            <Label htmlFor="password" className="text-gray-700">
              Password
            </Label>
            <div className="relative mt-1">
              <Input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={handleInputChange}
                placeholder="Enter your password"
                disabled={loading}
                className="pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                disabled={loading}
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Signing in...
              </span>
            ) : (
              'Sign In'
            )}
          </Button>
        </form>

        {/* Help Text */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-600">
            <strong>Need help?</strong> Contact your school administrator for password assistance or student ID information.
          </p>
        </div>

        {/* Back to Home Link - Bottom (Alternative/Mobile) */}
        <button
          onClick={() => navigate('/')}
          className="mt-6 w-full flex items-center justify-center gap-2 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors md:hidden"
        >
          <Home className="h-4 w-4" />
          <span>Return to Homepage</span>
        </button>
      </Card>
    </div>
  );
}