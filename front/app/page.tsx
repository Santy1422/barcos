"use client"

import { DashboardPage } from "@/components/dashboard-page"
import { useAppSelector } from "@/lib/hooks"
import { selectCurrentUser, canSeeDashboard, type UserRole } from "@/lib/features/auth/authSlice"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Shield } from "lucide-react"

export default function Home() {
  const currentUser = useAppSelector(selectCurrentUser)
  const router = useRouter()

  useEffect(() => {
    // Si no tiene acceso al dashboard, redirigir al primer módulo disponible
    if (currentUser && !canSeeDashboard(currentUser)) {
      // Redirigir al primer módulo que tenga asignado
      if (currentUser.modules && currentUser.modules.length > 0) {
        const firstModule = currentUser.modules[0]
        const moduleRoutes = {
          'trucking': '/trucking',
          'shipchandler': '/ptyss',
          'agency': '/agency'
        }
        router.push(moduleRoutes[firstModule] || '/login')
      } else {
        // Verificar si tiene rol de facturación (soportar roles múltiples)
        const userRoles: UserRole[] = currentUser.roles || (currentUser.role ? [currentUser.role] : [])
        if (userRoles.includes('facturacion')) {
          // Si es facturación sin módulos, ir a clientes
          router.push('/clientes')
        }
      }
    }
  }, [currentUser, router])

  // Si no tiene acceso, mostrar mensaje breve antes de redirigir
  if (!currentUser || !canSeeDashboard(currentUser)) {
    return (
      <div className="container mx-auto py-6">
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            Redirigiendo a tu módulo asignado...
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return <DashboardPage />
}
