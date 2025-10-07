// src/hooks/useSchoolTheme.ts
import { useState, useEffect } from 'react';

export interface SchoolTheme {
  school_id: number;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  logo_url?: string;
  school_name: string;
}

const DEFAULT_THEME: SchoolTheme = {
  school_id: 0,
  primary_color: '#0EA5E9', // Cyan
  secondary_color: '#8B5CF6', // Purple
  accent_color: '#FFFFFF',
  school_name: 'School'
};

// Predefined themes for specific schools
const SCHOOL_THEMES: Record<number, Partial<SchoolTheme>> = {
  // Peculiar School (example)
  34: {
    primary_color: '#0000FF', // Blue
    secondary_color: '#FF0000', // Red
    accent_color: '#FFFFFF', // White
  },
  // Add more schools here as needed
};

export function useSchoolTheme(schoolId?: number) {
  const [theme, setTheme] = useState<SchoolTheme>(DEFAULT_THEME);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTheme = async () => {
      if (!schoolId) {
        setTheme(DEFAULT_THEME);
        setLoading(false);
        return;
      }

      try {
        // Get API URL from environment
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        
        // First, check if there's a predefined theme
        const predefinedTheme = SCHOOL_THEMES[schoolId];

        // Then, try to fetch from API
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/api/schools/${schoolId}/theme`, {
          headers: {
            'Authorization': token ? `Bearer ${token}` : ''
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          setTheme({
            ...DEFAULT_THEME,
            ...predefinedTheme,
            ...data.theme,
            school_id: schoolId
          });
        } else {
          // Use predefined theme or default
          setTheme({
            ...DEFAULT_THEME,
            ...predefinedTheme,
            school_id: schoolId
          });
        }
      } catch (error) {
        console.error('Error loading theme:', error);
        // Use predefined theme or default on error
        const predefinedTheme = SCHOOL_THEMES[schoolId];
        setTheme({
          ...DEFAULT_THEME,
          ...predefinedTheme,
          school_id: schoolId
        });
      } finally {
        setLoading(false);
      }
    };

    loadTheme();
  }, [schoolId]);

  // Apply theme to CSS variables
  useEffect(() => {
    if (!loading) {
      document.documentElement.style.setProperty('--school-primary', theme.primary_color);
      document.documentElement.style.setProperty('--school-secondary', theme.secondary_color);
      document.documentElement.style.setProperty('--school-accent', theme.accent_color);
    }
  }, [theme, loading]);

  const updateTheme = async (updates: Partial<SchoolTheme>) => {
    if (!schoolId) return;

    try {
      const response = await fetch(`/api/schools/${schoolId}/theme`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        const data = await response.json();
        setTheme({
          ...theme,
          ...updates
        });
        return { success: true, data };
      } else {
        return { success: false, error: 'Failed to update theme' };
      }
    } catch (error) {
      console.error('Error updating theme:', error);
      return { success: false, error: 'Network error' };
    }
  };

  const resetTheme = () => {
    const predefinedTheme = schoolId ? SCHOOL_THEMES[schoolId] : null;
    setTheme({
      ...DEFAULT_THEME,
      ...predefinedTheme,
      school_id: schoolId || 0
    });
  };

  return {
    theme,
    loading,
    updateTheme,
    resetTheme
  };
}

// Helper function to generate contrasting text color
export function getContrastColor(hexColor: string): string {
  // Remove # if present
  const hex = hexColor.replace('#', '');
  
  // Convert to RGB
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  // Return black or white based on luminance
  return luminance > 0.5 ? '#000000' : '#FFFFFF';
}

// Helper function to lighten/darken a color
export function adjustColorBrightness(hexColor: string, percent: number): string {
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);

  const adjust = (value: number) => {
    const adjusted = Math.round(value + (255 - value) * percent);
    return Math.max(0, Math.min(255, adjusted));
  };

  const newR = adjust(r).toString(16).padStart(2, '0');
  const newG = adjust(g).toString(16).padStart(2, '0');
  const newB = adjust(b).toString(16).padStart(2, '0');

  return `#${newR}${newG}${newB}`;
}