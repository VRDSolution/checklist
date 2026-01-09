import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react'
import { User, UserRole } from '../types/auth.types'
import { authService } from '../services/auth.service'
import { useAuthStore } from '../store/authStore'

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isAdmin: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  isLoading: boolean
  error: string | null
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const { user: storedUser, setAuth, logout: storeLogout } = useAuthStore()
  const [user, setUser] = useState<User | null>(storedUser)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Sync with store
  useEffect(() => {
    setUser(storedUser)
  }, [storedUser])

  const login = async (email: string, password: string) => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await authService.login({ email, password })
      setAuth(response.user, response.access_token, response.refresh_token)
      setUser(response.user)
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || err.message || 'Erro ao fazer login'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const logout = () => {
    authService.logout().catch(() => {}) // Try to logout on server, but ignore errors
    storeLogout()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      isAdmin: user?.role === UserRole.ADMIN,
      login,
      logout,
      isLoading,
      error
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
