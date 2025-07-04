"use client"

import { useEffect, useState } from 'react'
import { useAppDispatch, useAppSelector } from '@/lib/hooks'
import { verifyToken, selectAuthLoading, selectIsAuthenticated } from '@/lib/features/auth/authSlice'
import { Loader2 } from 'lucide-react'

interface AuthProviderProps {
  children: React.ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const dispatch = useAppDispatch()
  const isLoading = useAppSelector(selectAuthLoading)
  const isAuthenticated = useAppSelector(selectIsAuthenticated)
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    // Marcar como hidratado después del primer render
    setIsHydrated(true)
    
    console.log('AuthProvider - Current state:', { isAuthenticated, isLoading })
    
    // Verificar token al cargar la aplicación solo si no está autenticado
    if (!isAuthenticated) {
      const token = localStorage.getItem('token')
      const storedAuth = localStorage.getItem('isAuthenticated')
      
      console.log('AuthProvider - Checking localStorage:', { token: !!token, storedAuth })
      
      if (token && storedAuth === 'true') {
        console.log('AuthProvider - Dispatching verifyToken')
        dispatch(verifyToken())
      }
    }
  }, [dispatch, isAuthenticated])

  // Mostrar loading mientras se hidrata o verifica el token
  if (!isHydrated || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-sm text-muted-foreground">
            {!isHydrated ? 'Cargando aplicación...' : 'Verificando autenticación...'}
          </p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}