"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAppSelector } from "@/lib/hooks"
import { selectCurrentUser, hasModuleAccess, type UserModule } from "@/lib/features/auth/authSlice"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Shield } from "lucide-react"

interface ModuleGuardProps {
  children: React.ReactNode
  requiredModule: UserModule
  fallback?: React.ReactNode
}

export function ModuleGuard({ children, requiredModule, fallback }: ModuleGuardProps) {
  const router = useRouter()
  const currentUser = useAppSelector(selectCurrentUser)
  
  useEffect(() => {
    // Si el usuario no está autenticado, redirigir al login
    if (!currentUser) {
      router.push('/login')
      return
    }
    
    // Si el usuario no tiene acceso al módulo, redirigir al dashboard
    if (!hasModuleAccess(currentUser, requiredModule)) {
      router.push('/')
    }
  }, [currentUser, requiredModule, router])
  
  // Si no hay usuario o no tiene acceso, mostrar mensaje
  if (!currentUser || !hasModuleAccess(currentUser, requiredModule)) {
    return fallback || (
      <div className="container mx-auto py-6">
        <Alert variant="destructive">
          <Shield className="h-4 w-4" />
          <AlertDescription>
            No tienes acceso a este módulo. Por favor, contacta al administrador para solicitar permisos.
          </AlertDescription>
        </Alert>
      </div>
    )
  }
  
  return <>{children}</>
}

