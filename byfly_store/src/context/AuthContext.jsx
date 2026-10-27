import { createContext, useContext, useEffect, useState } from 'react'
import { isInternalAuthEmail, visibleAccountEmail } from '../lib/accountIdentity'
import { apiRequest } from '../lib/apiClient'
import { signOutFirebase } from '../lib/firebaseClient'

const AuthContext = createContext({})

const clearBackendSession = () => {
  localStorage.removeItem('byfly_backend_token')
  localStorage.removeItem('byfly_backend_user')
}

const saveBackendSession = (result) => {
  clearBackendSession()
  localStorage.setItem('byfly_backend_token', result.token)
  localStorage.setItem('byfly_backend_user', JSON.stringify(result.user))
}

const cacheBasicUser = (user) => {
  if (!user?.id) return
  try {
    localStorage.setItem(`monimala_user_${user.id}`, JSON.stringify({
      id: user.id,
      name: user.user_metadata?.name || user.name || '',
      email: visibleAccountEmail(user),
    }))
  } catch (error) {
    console.warn('Unable to cache user details in this browser.', error)
  }
}

export const useAuth = () => useContext(AuthContext)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [profileSummary, setProfileSummary] = useState(null)
  const [profileLoading, setProfileLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    const initialize = async () => {
      // Clear the old wholesale/customer session once after this backend cutover.
      // The marker prevents users from being logged out again on every refresh.
      if (!localStorage.getItem('byfly_auth_reset_v1')) {
        localStorage.removeItem('byfly_backend_user')
        localStorage.removeItem('byfly_backend_token')
        Object.keys(localStorage).filter((key) => key.startsWith('monimala_user_')).forEach((key) => localStorage.removeItem(key))
        localStorage.setItem('byfly_auth_reset_v1', '1')
      }

      const backendUser = localStorage.getItem('byfly_backend_user')
      const backendToken = localStorage.getItem('byfly_backend_token')
      if (backendUser && backendToken) {
        try { setUser(JSON.parse(backendUser)); setLoading(false); return } catch { localStorage.removeItem('byfly_backend_user'); localStorage.removeItem('byfly_backend_token') }
      }
      if (cancelled) return
      setUser(null)
      setLoading(false)
    }
    initialize().catch(() => { if (!cancelled) { setUser(null); setLoading(false) } })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    const invalidateSession = () => {
      setUser(null)
      setProfileSummary(null)
      setProfileLoading(false)
    }
    window.addEventListener('byfly-auth-invalid', invalidateSession)
    return () => window.removeEventListener('byfly-auth-invalid', invalidateSession)
  }, [])

  useEffect(() => {
    const syncSession = (event) => {
      if (event.key === 'byfly_backend_token' || event.key === 'byfly_backend_user') {
        const token = localStorage.getItem('byfly_backend_token')
        const storedUser = localStorage.getItem('byfly_backend_user')
        if (!token || !storedUser) {
          setUser(null)
          setProfileSummary(null)
          return
        }
        try { setUser(JSON.parse(storedUser)) } catch { setUser(null) }
      }
    }
    window.addEventListener('storage', syncSession)
    return () => window.removeEventListener('storage', syncSession)
  }, [])

  useEffect(() => {
    if (!user?.id) {
      setProfileSummary(null)
      setProfileLoading(false)
      return
    }

    let cancelled = false
    setProfileLoading(true)
    const cacheKey = `monimala_user_${user.id}`
    let cached = {}
    try {
      cached = JSON.parse(localStorage.getItem(cacheKey) || '{}')
    } catch {
      cached = {}
    }

    const summary = {
      id: user.id,
      email: visibleAccountEmail(user) || (isInternalAuthEmail(cached.email) ? '' : cached.email) || '',
      name: user.user_metadata?.name || cached.name || '',
      is_wholesaler: false,
      wholesale_enabled: false,
      is_admin: false,
      business_name: '',
    }
    setProfileSummary(summary)
    cacheBasicUser({ ...user, user_metadata: { ...user.user_metadata, name: summary.name } })

    {
      apiRequest('/me')
        .then((data) => {
          if (cancelled) return
          const hydrated = {
            ...summary,
            ...(data || {}),
            name: data?.name || summary.name,
            email: (isInternalAuthEmail(data?.email) ? '' : data?.email) || summary.email,
            is_admin: data?.is_admin === true,
            role: data?.role || user.role || '',
            is_wholesaler: Boolean(data?.is_wholesaler),
            wholesale_enabled: Boolean(data?.wholesale_enabled),
            business_name: data?.business_name || '',
          }
          setProfileSummary(hydrated)
          try {
            localStorage.setItem(cacheKey, JSON.stringify(hydrated))
          } catch (cacheError) {
            console.warn('Unable to cache user details in this browser.', cacheError)
          }
        })
        .catch((error) => { if (error.message !== 'authentication required') console.warn('Unable to load the account profile.', error) })
        .finally(() => { if (!cancelled) setProfileLoading(false) })
    }

    return () => { cancelled = true }
  }, [user?.id])

  const signIn = async (email, password) => {
    clearBackendSession()
    setUser(null)
    setProfileSummary(null)
    const result = await apiRequest('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) })
    saveBackendSession(result)
    setUser(result.user)
    return result
  }

  const sendLoginOtp = async () => { throw new Error('OTP login is no longer available. Use email and password.') }

  const verifyLoginOtp = async () => { throw new Error('OTP login is no longer available. Use email and password.') }

  const signUp = async (email, password, metadata) => {
    clearBackendSession()
    setUser(null)
    setProfileSummary(null)
    const result = await apiRequest('/auth/register', { method: 'POST', body: JSON.stringify({ email, password, name: metadata?.name || '' }) })
    saveBackendSession(result)
    setUser(result.user)
    return result
  }

  const signInWithFirebaseToken = async (idToken, name = '') => {
    clearBackendSession()
    setUser(null)
    setProfileSummary(null)
    const result = await apiRequest('/auth/firebase', { method: 'POST', body: JSON.stringify({ id_token: idToken, name }) })
    saveBackendSession(result)
    setUser(result.user)
    return result
  }

  const signOut = async () => {
    clearBackendSession()
    setUser(null)
    setProfileSummary(null)
    await signOutFirebase()
  }

  const isAdmin = user?.role === 'superadmin' || user?.role === 'admin' || profileSummary?.role === 'superadmin' || profileSummary?.role === 'admin' || Boolean(profileSummary?.is_admin)

  return (
    <AuthContext.Provider value={{ user, loading: loading || profileLoading, profileSummary, signIn, signInWithFirebaseToken, sendLoginOtp, verifyLoginOtp, signUp, signOut, isAdmin }}>
      {children}
    </AuthContext.Provider>
  )
}
