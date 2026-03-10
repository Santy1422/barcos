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
    <div className="px-4 pt-4 pb-5 space-y-5">
      {/* Header: Crear servicio + botón Crear nuevo servicio */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-500 flex items-center justify-center">
              <Car className="h-6 w-6 text-white" />
            </div>
            Crear servicio
          </h1>
          <p className="text-muted-foreground mt-1">
            Servicios de transporte de tripulación. Crea nuevos servicios o revisa los existentes.
          </p>
        </div>
        <Button onClick={() => setCreateModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Crear nuevo servicio
        </Button>
      </div>

      {/* Lista de servicios (contenido actual de Registros, sin duplicar header) */}
      <AgencyRecords hideHeader onCreateServiceClick={() => setCreateModalOpen(true)} />

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
