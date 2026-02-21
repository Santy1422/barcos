"use client"

import { AnalyticsDashboard } from "@/components/analytics/analytics-dashboard"
import { useAppSelector } from "@/lib/hooks"
import { selectCurrentUser, type UserRole } from "@/lib/features/auth/authSlice"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Shield } from "lucide-react"

export default function AnalyticsPage() {
  const currentUser = useAppSelector(selectCurrentUser)
  const router = useRouter()

  // Check if user has analytics access
  const hasAnalyticsAccess = () => {
    if (!currentUser) return false
    const userRoles: UserRole[] = currentUser.roles || (currentUser.role ? [currentUser.role] : [])
    return userRoles.some(role =>
      ['administrador', 'analytics', 'facturacion'].includes(role)
    )
  }

  useEffect(() => {
    if (currentUser && !hasAnalyticsAccess()) {
      router.push('/')
    }
  }, [currentUser, router])

  if (!currentUser || !hasAnalyticsAccess()) {
    return (
      <div className="container mx-auto py-6">
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            No tienes acceso a esta sección. Redirigiendo...
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 px-4">
      <AnalyticsDashboard />
    </div>
  )
}
