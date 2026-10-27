export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/$/, '')

export async function apiRequest(path, options = {}) {
  if (!API_BASE_URL) throw new Error('VITE_API_BASE_URL is not configured in the web store .env file')
  const headers = { ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }), ...(options.headers || {}) }
  const backendToken = localStorage.getItem('byfly_backend_token')
  const backendUser = JSON.parse(localStorage.getItem('byfly_backend_user') || 'null')
  if (backendToken) headers.Authorization = `Bearer ${backendToken}`
  if (backendUser?.id) { headers['X-User-ID'] = backendUser.id; headers['X-User-Email'] = backendUser.email || '' }
  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers })
  const body = await response.json().catch(() => null)
  if (response.status === 401) {
    localStorage.removeItem('byfly_backend_token')
    localStorage.removeItem('byfly_backend_user')
    window.dispatchEvent(new Event('byfly-auth-invalid'))
  }
  if (!response.ok) throw new Error(body?.error || `API request failed (${response.status})`)
  return body
}
