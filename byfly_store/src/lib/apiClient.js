export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1').replace(/\/$/, '')

export async function apiRequest(path, options = {}) {
  const headers = { ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }), ...(options.headers || {}) }
  const backendToken = localStorage.getItem('byfly_backend_token')
  const backendUser = JSON.parse(localStorage.getItem('byfly_backend_user') || 'null')
  if (backendToken) headers.Authorization = `Bearer ${backendToken}`
  if (backendUser?.id) { headers['X-User-ID'] = backendUser.id; headers['X-User-Email'] = backendUser.email || '' }
  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers })
  const body = await response.json().catch(() => null)
  if (!response.ok) throw new Error(body?.error || `API request failed (${response.status})`)
  return body
}
