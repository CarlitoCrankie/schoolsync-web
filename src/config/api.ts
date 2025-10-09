// src/config/api.ts
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Helper function for API calls
export async function apiCall(endpoint: string, options: RequestInit = {}) {
  const url = `${API_URL}${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.statusText}`);
  }

  return response.json();
}