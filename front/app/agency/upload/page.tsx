"use client"

import { AgencyUpload } from "@/components/agency/agency-upload"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function AgencyUploadPage() {
  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Carga de Servicios Agency</h1>
        <p className="text-muted-foreground mt-2">
          Importe servicios de transporte de tripulación desde Excel o ingrese registros manualmente
        </p>
      </div>
      
      <AgencyUpload />
    </div>
  )
}