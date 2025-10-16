"use client"

import { HistoryPage } from "@/components/history-page"
import { AuthGuard } from "@/components/auth-guard"

export default function HistorialPage() {
  return (
    <AuthGuard requiredRole="administrador">
      <HistoryPage />
    </AuthGuard>
  )
}
