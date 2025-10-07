// src/types/admin.ts

export interface User {
  role: 'company_admin' | 'school_admin' | 'main_admin';
  SchoolID?: number;
  school_id?: number;
  school?: {
    id: number;
    name: string;
  };
  company_id?: number;
  CompanyID?: number;
  username?: string;
  hasCustomTheme?: boolean;  // ADD THIS
  theme?: {                   // ADD THIS
    primary: string;
    secondary: string;
    accent: string;
    logo: string;
  };
}

// Keep all your other interfaces the same...
export interface Stats {
  total_schools?: number;
  total_students?: number;
  active_sync_agents?: number;
  total_sync_agents?: number;
  system_health?: string;
  present_today?: number;
  absent_today?: number;
  students_without_passwords?: number;
  sync_status?: string;
  attendance_rate?: number;
  total_attendance_today?: number;
  sync_health_score?: number;
}

export interface Student {
  id: number;
  student_id?: number;
  name: string;
  grade: string;
  studentCode?: string;
  student_code?: string;
  parentPasswordSet?: boolean;
  parent_password_set?: boolean;
  lastSeen?: string;
  is_active: boolean;
  last_activity?: string;
}

export interface AttendanceRecord {
  id: number;
  attendance_id?: number;
  studentName?: string;
  student_name?: string;
  grade?: string;
  status: string;
  time?: string;
  scan_time?: string;
  scanTime?: string;
  created_at?: string;
  school_name?: string;
  school_id?: number;
  statusLabel?: string;
  statusType?: string;
  message?: string;
}

export interface School {
  id: number;
  school_id?: number;
  SchoolID?: number;
  name: string;
  location?: string;
  status: string;
  students?: {
    total?: number;
    active?: number;
  };
  syncStatus?: string;
  sync_agent?: {
    connection_status?: string;
  };
  machine_id?: string;
}

export interface SchoolTimeSettings {
  late_arrival_time: string;
  early_departure_time: string;
  school_start_time: string;
  school_end_time: string;
  timezone: string;
}

export interface Tab {
  id: string;
  label: string;
  icon: string;
}

export interface AbsentStudent {
  id: number;
  student_id?: number;
  name: string;
  grade: string;
  school_name?: string;
}

export interface AdminDashboardProps {
  user: User;
  onLogout: () => void;
}