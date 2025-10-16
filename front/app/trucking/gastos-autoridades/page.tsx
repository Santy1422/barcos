"use client"

import { TruckingGastosAutoridadesPage } from "@/components/trucking/trucking-gastos-autoridades-page"
import { SectionGuard } from "@/components/section-guard"

export default function GastosAutoridadesPage() {
  return (
    <SectionGuard module="trucking" section="gastos-autoridades">
      <TruckingGastosAutoridadesPage />
    </SectionGuard>
  )
}
