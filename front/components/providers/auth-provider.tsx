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
    
    // Verificar token al cargar la aplicación
    const token = localStorage.getItem('token')
    const storedAuth = localStorage.getItem('isAuthenticated')
    
    if (token && storedAuth === 'true') {
      dispatch(verifyToken())
    }
  }, [dispatch])

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