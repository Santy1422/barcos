"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAppSelector } from "@/lib/hooks"
import { selectCurrentUser, hasSectionAccess, hasModuleAccess, type UserModule } from "@/lib/features/auth/authSlice"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Shield } from "lucide-react"

interface SectionGuardProps {
  children: React.ReactNode
  module: UserModule
  section: string
  fallback?: React.ReactNode
}

export function SectionGuard({ children, module, section, fallback }: SectionGuardProps) {
  const router = useRouter()
  const currentUser = useAppSelector(selectCurrentUser)
  
  useEffect(() => {
    // Si el usuario no está autenticado, redirigir al login
    if (!currentUser) {
      console.log("🔒 SectionGuard: Usuario no autenticado, redirigiendo a login")
      router.push('/login')
      return
    }
    
    // Debug: Log información del usuario y permisos
    const userRoles = currentUser.roles || (currentUser.role ? [currentUser.role] : [])
    const userModules = currentUser.modules || []
    const hasModule = hasModuleAccess(currentUser, module)
    const hasSection = hasSectionAccess(currentUser, module, section)
    
    console.log("🔒 SectionGuard - Verificación de acceso:", {
      module,
      section,
      userEmail: currentUser.email,
      userRoles,
      userModules,
      hasModuleAccess: hasModule,
      hasSectionAccess: hasSection
    })
    
    // Si el usuario no tiene acceso a la sección, redirigir al dashboard
    if (!hasSection) {
      console.warn("🔒 SectionGuard: Usuario sin acceso a la sección, redirigiendo al dashboard")
      router.push('/')
    }
  }, [currentUser, module, section, router])
  
  // Si no hay usuario o no tiene acceso, mostrar mensaje
  if (!currentUser) {
    return fallback || (
      <div className="container mx-auto py-6">
        <Alert variant="destructive">
          <Shield className="h-4 w-4" />
          <AlertDescription>
            No estás autenticado. Por favor, inicia sesión.
          </AlertDescription>
        </Alert>
      </div>
    )
  }
  
  const hasModule = hasModuleAccess(currentUser, module)
  const hasSection = hasSectionAccess(currentUser, module, section)
  const userRoles = currentUser.roles || (currentUser.role ? [currentUser.role] : [])
  const userModules = currentUser.modules || []
  
  if (!hasModule) {
    return fallback || (
      <div className="container mx-auto py-6">
        <Alert variant="destructive">
          <Shield className="h-4 w-4" />
          <AlertDescription>
            No tienes acceso al módulo {module}. Tu cuenta tiene acceso a: {userModules.length > 0 ? userModules.join(', ') : 'ningún módulo'}.
            {userRoles.length > 0 && ` Tus roles: ${userRoles.join(', ')}.`}
          </AlertDescription>
        </Alert>
      </div>
    )
  }
  
  if (!hasSection) {
    return fallback || (
      <div className="container mx-auto py-6">
        <Alert variant="destructive">
          <Shield className="h-4 w-4" />
          <AlertDescription>
            No tienes acceso a la sección "{section}" del módulo {module}. 
            {userRoles.length > 0 && ` Tu rol (${userRoles.join(', ')}) no tiene permisos para esta sección.`}
            Contacta al administrador si necesitas acceso.
          </AlertDescription>
        </Alert>
      </div>
    )
  }
  
  return <>{children}</>
}

