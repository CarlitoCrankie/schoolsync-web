const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

console.log('🔗 API URL:', API_URL);

async function handleResponse(response: Response) {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Network error' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }
  return response.json();
}

export async function apiGet(endpoint: string) {
  const response = await fetch(`${API_URL}${endpoint}`);
  return handleResponse(response);
}

export async function apiPost(endpoint: string, data: any) {
  const response = await fetch(`${API_URL}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return handleResponse(response);
}

export async function apiPut(endpoint: string, data: any) {
  const response = await fetch(`${API_URL}${endpoint}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return handleResponse(response);
}

export async function apiDelete(endpoint: string, data: any = null) {
  const options: RequestInit = {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' }
  };
  
  if (data) {
    options.body = JSON.stringify(data);
  }
  
  const response = await fetch(`${API_URL}${endpoint}`, options);
  return handleResponse(response);
}