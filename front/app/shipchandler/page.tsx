"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAppSelector } from "@/lib/hooks"
import { selectCurrentUser, hasSectionAccess, hasModuleAccess } from "@/lib/features/auth/authSlice"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Shield, Loader2 } from "lucide-react"

export default function ShipChandlerPage() {
  const router = useRouter()
  const currentUser = useAppSelector(selectCurrentUser)

  useEffect(() => {
    if (!currentUser) {
      router.push('/login')
      return
    }

    // Verificar acceso al módulo
    if (!hasModuleAccess(currentUser, "shipchandler")) {
      router.push('/')
      return
    }

    // Redirigir a la primera sección disponible según los permisos del usuario
    const sections = [
      { section: "prefactura", path: "/shipchandler/prefactura" },
      { section: "records", path: "/shipchandler/invoice" },
      { section: "upload", path: "/shipchandler/upload" },
    ]

    // Buscar la primera sección a la que el usuario tenga acceso
    for (const { section, path } of sections) {
      if (hasSectionAccess(currentUser, "shipchandler", section)) {
        router.push(path)
        return
      }
    }

    // Si no tiene acceso a ninguna sección, redirigir al dashboard
    router.push('/')
  }, [currentUser, router])

  // Mostrar mensaje de carga mientras redirige
  return (
    <div className="container mx-auto py-6">
      <Alert>
        <Loader2 className="h-4 w-4 animate-spin" />
        <AlertDescription>
          Redirigiendo a tu sección disponible...
        </AlertDescription>
      </Alert>
    </div>
  )
}

