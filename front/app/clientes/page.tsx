"use client"

import { ClientsManagement } from "@/components/clients-management"
import { useAppSelector } from "@/lib/hooks"
import { selectCurrentUser } from "@/lib/features/auth/authSlice"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Shield } from "lucide-react"

export default function ClientsPage() {
  const currentUser = useAppSelector(selectCurrentUser)
  const router = useRouter()

  useEffect(() => {
    // Solo clientes y administradores pueden acceder
    if (currentUser) {
      const userRoles = currentUser.roles || (currentUser.role ? [currentUser.role] : [])
      const hasAccess = userRoles.some(role => 
        role === 'administrador' || role === 'clientes'
      )
      if (!hasAccess) {
        router.push('/')
      }
    }
  }, [currentUser, router])

  // Si no tiene acceso, mostrar mensaje
  if (currentUser) {
    const userRoles = currentUser.roles || (currentUser.role ? [currentUser.role] : [])
    const hasAccess = userRoles.some(role => 
      role === 'administrador' || role === 'clientes'
    )
    
    if (!hasAccess) {
      return (
        <div className="container mx-auto py-6">
          <Alert variant="destructive">
            <Shield className="h-4 w-4" />
            <AlertDescription>
              No tienes acceso a la gestión de clientes. Solo usuarios con el rol "Administrar Clientes" o administradores pueden acceder.
            </AlertDescription>
          </Alert>
        </div>
      )
    }
  }

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Gestión de Clientes</h1>
        <p className="text-muted-foreground">Administra los clientes del sistema</p>
      </div>
      <ClientsManagement />
    </div>
  )
}