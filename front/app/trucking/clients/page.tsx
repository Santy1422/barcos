import { ClientsManagement } from "@/components/clients-management"

export default function TruckingClientsPage() {
  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <div className="flex items-center space-x-2 text-sm text-muted-foreground mb-2">
          <span>Trucking</span>
          <span>/</span>
          <span>Clientes</span>
        </div>
        <h1 className="text-3xl font-bold">Gestión de Clientes - Trucking</h1>
        <p className="text-muted-foreground">
          Administra los clientes para el módulo de servicios de transporte terrestre.
        </p>
      </div>
      
      <ClientsManagement />
    </div>
  )
}