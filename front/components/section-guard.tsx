"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAppSelector } from "@/lib/hooks"
import { selectCurrentUser, hasSectionAccess, type UserModule } from "@/lib/features/auth/authSlice"
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
      router.push('/login')
      return
    }
    
    // Si el usuario no tiene acceso a la sección, redirigir al dashboard
    if (!hasSectionAccess(currentUser, module, section)) {
      router.push('/')
    }
  }, [currentUser, module, section, router])
  
  // Si no hay usuario o no tiene acceso, mostrar mensaje
  if (!currentUser || !hasSectionAccess(currentUser, module, section)) {
    return fallback || (
      <div className="container mx-auto py-6">
        <Alert variant="destructive">
          <Shield className="h-4 w-4" />
          <AlertDescription>
            No tienes acceso a esta sección. Tu rol solo permite acceso a ciertas funciones del módulo.
          </AlertDescription>
        </Alert>
      </div>
    )
  }
  
  return <>{children}</>
}

