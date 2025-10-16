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
  const authLoading = useAppSelector(selectAuthLoading) // Solo loading de autenticación
  const isAuthenticated = useAppSelector(selectIsAuthenticated)
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    // Marcar como hidratado después del primer render
    setIsHydrated(true)
    
    console.log('🔐 AuthProvider - Initial mount, checking auth...')
    
    // Solo verificar token UNA VEZ al montar el componente
    const token = localStorage.getItem('token')
    const storedAuth = localStorage.getItem('isAuthenticated')
    
    console.log('🔐 AuthProvider - localStorage:', { 
      hasToken: !!token, 
      storedAuth,
      isAuthenticated
    })
    
    // Solo verificar si hay token pero NO está autenticado aún
    if (token && storedAuth === 'true' && !isAuthenticated) {
      console.log('🔐 AuthProvider - Dispatching verifyToken...')
      
      // Crear un timeout de seguridad
      const timeoutId = setTimeout(() => {
        console.error('⏱️ AuthProvider - verifyToken timeout, limpiando localStorage')
        localStorage.removeItem('token')
        localStorage.removeItem('isAuthenticated')
        localStorage.removeItem('currentUser')
        window.location.href = '/login'
      }, 10000) // 10 segundos timeout
      
      dispatch(verifyToken())
        .then((result) => {
          clearTimeout(timeoutId)
          console.log('✅ AuthProvider - verifyToken completed:', result)
        })
        .catch((error) => {
          clearTimeout(timeoutId)
          console.error('❌ AuthProvider - verifyToken error:', error)
        })
    }
  }, [dispatch]) // REMOVIDO isAuthenticated de las dependencias para evitar loop

  // Mostrar loading mientras se hidrata
  if (!isHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-sm text-muted-foreground">Cargando aplicación...</p>
        </div>
      </div>
    )
  }

  // Solo mostrar loading cuando realmente está verificando autenticación
  // NO mostrar loading para otras operaciones como fetchAllUsers
  const hasToken = typeof window !== 'undefined' && localStorage.getItem('token')
  if (authLoading && hasToken) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-sm text-muted-foreground">Verificando autenticación...</p>
          <p className="text-xs text-muted-foreground">
            Si esto tarda mucho, presiona F5 para recargar
          </p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}