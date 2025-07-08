import { ClientsManagement } from "@/components/clients-management"

export default function ClientsPage() {
  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Gestión de Clientes</h1>
        <p className="text-muted-foreground">Administra los clientes del sistema</p>
      </div>
      <ClientsManagement />
    </div>
  )
}