import { ClientsManagement } from "@/components/clients-management"

export default function AgencyClientsPage() {
  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <div className="flex items-center space-x-2 text-sm text-muted-foreground mb-2">
          <span>Agency</span>
          <span>/</span>
          <span>Clientes</span>
        </div>
        <h1 className="text-3xl font-bold">Gestión de Clientes - Agency</h1>
        <p className="text-muted-foreground">
          Administra los clientes para el módulo de servicios de agencia marítima.
        </p>
      </div>
      
      <ClientsManagement />
    </div>
  )
}