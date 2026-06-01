import { createContext, useContext, useState, useEffect } from 'react'
import { authAPI } from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [loading, setLoading] = useState(true)

  // Écoute l'événement d'expiration de session émis par l'intercepteur Axios
  useEffect(() => {
    const handleExpired = () => {
      setUser(null)
      // Le redirect est géré dans api.js après 1.5s
    }
    window.addEventListener('auth:expired', handleExpired)
    return () => window.removeEventListener('auth:expired', handleExpired)
  }, [])

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (token) {
      authAPI.me()
        .then(({ data }) => setUser(data))
        .catch(() => localStorage.clear())
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const login = async (email, password) => {
    const { data } = await authAPI.login({ email, password })
    localStorage.setItem('access_token',  data.access)
    localStorage.setItem('refresh_token', data.refresh)
    setUser(data.user)
    return data.user
  }

  const logout = async () => {
    try { await authAPI.logout({ refresh: localStorage.getItem('refresh_token') }) } catch {}
    localStorage.clear()
    setUser(null)
  }

  const isAdmin      = () => user?.role === 'ADMIN'
  const isArchiviste = () => user?.role === 'ARCHIVISTE'
  const canWrite     = () => ['ADMIN', 'ARCHIVISTE'].includes(user?.role)

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAdmin, isArchiviste, canWrite }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
