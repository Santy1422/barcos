"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Car, Plus } from "lucide-react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { AgencyRecords } from "@/components/agency/agency-records"
import { AgencyServices } from "@/components/agency/agency-services"

export function AgencyServicesUnified() {
  const [createModalOpen, setCreateModalOpen] = useState(false)

  return (
    <div className="w-full max-w-full min-w-0 px-4 pt-4 pb-5 space-y-5">
      {/* Header: Crear servicio (el botón Crear nuevo servicio está dentro de la lista, en el CardHeader de Services) */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-blue-500 flex items-center justify-center shrink-0">
          <Car className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Crear servicio</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">
            Servicios de transporte de tripulación. Crea nuevos servicios o revisa los existentes.
          </p>
        </div>
      </div>

      {/* Lista de servicios: contenedor con scroll horizontal para que no desborde el ancho de pantalla */}
      <div className="w-full max-w-full min-w-0 overflow-x-auto">
        <AgencyRecords hideHeader onCreateServiceClick={() => setCreateModalOpen(true)} />
      </div>

      {/* Modal con el Service Request Form (contenido actual de Crear Servicios) */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-6 pt-0">
          <AgencyServices
            embeddedInModal
            onSuccess={() => setCreateModalOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
