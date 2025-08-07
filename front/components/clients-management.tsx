"use client"

import { useState, useMemo, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { 
  Users, 
  Search, 
  Plus,  
  Edit, 
  Trash2, 
  Building, 
  User, 
  Mail, 
  Phone, 
  MapPin,
  Filter,
  Download,
  Upload
} from "lucide-react"
import { useAppSelector, useAppDispatch } from "@/lib/hooks"
import { 
  selectAllClients, 
  selectActiveClients,
  selectNaturalClients,
  selectJuridicalClients,
  addClient,
  updateClient,
  deleteClient,
  toggleClientStatus,
  fetchClients,
  createClientAsync,
  updateClientAsync,
  deleteClientAsync,
  type Client,
  type NaturalClient,
  type JuridicalClient,
  type ClientType
} from "@/lib/features/clients/clientsSlice"
import { useToast } from "@/hooks/use-toast"

interface ClientFormData {
  type: ClientType
  // Campos para cliente natural
  fullName: string
  documentType: "cedula" | "pasaporte"
  documentNumber: string
  // Campos para cliente jurídico
  companyName: string
  ruc: string
  contactName: string
  // Campos comunes
  email: string
  phone: string
  address: string
  sapCode: string
}

const initialFormData: ClientFormData = {
  type: "juridico",
  fullName: "",
  documentType: "cedula",
  documentNumber: "",
  companyName: "",
  ruc: "",
  contactName: "",
  email: "",
  phone: "",
  address: "",
  sapCode: ""
}



// Componente reutilizable para el modal de clientes
export function ClientModal({ 
  isOpen, 
  onClose, 
  onClientCreated,
  editingClient = null
}: { 
  isOpen: boolean
  onClose: () => void
  onClientCreated?: (client: Client) => void
  editingClient?: Client | null
}) {
  const dispatch = useAppDispatch()
  const { toast } = useToast()
  
  const [formData, setFormData] = useState<ClientFormData>(initialFormData)

  // Cargar datos del cliente cuando se abre en modo edición
  useEffect(() => {
    if (editingClient && isOpen) {
      setFormData({
        type: editingClient.type,
        fullName: editingClient.type === "natural" ? editingClient.fullName : "",
        documentType: editingClient.type === "natural" ? editingClient.documentType : "cedula",
        documentNumber: editingClient.type === "natural" ? editingClient.documentNumber : "",
        companyName: editingClient.type === "juridico" ? editingClient.companyName : "",
        ruc: editingClient.type === "juridico" ? editingClient.ruc : "",
        contactName: editingClient.type === "juridico" ? editingClient.contactName || "" : "",
        email: editingClient.email || "",
        phone: editingClient.phone || "",
        address: typeof editingClient.address === "string" ? editingClient.address : "",
        sapCode: editingClient.sapCode || ""
      })
    } else if (!editingClient && isOpen) {
      // Resetear formulario cuando se abre para crear nuevo cliente
      setFormData(initialFormData)
    }
  }, [editingClient, isOpen])

  // Generar ID único
  const generateId = () => `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

  // Manejar envío del formulario
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validar campos requeridos
    if (!formData.sapCode.trim()) {
      toast({ 
        title: "Campo requerido", 
        description: "El código SAP del cliente es obligatorio.", 
        variant: "destructive" 
      })
      return
    }
    
    try {
      const now = new Date().toISOString()
      
              if (formData.type === "natural") {
          const naturalClient: NaturalClient = {
            id: editingClient?.id || generateId(),
            type: "natural",
            fullName: formData.fullName,
            documentType: formData.documentType,
            documentNumber: formData.documentNumber,
            address: formData.address || undefined,
            email: formData.email || undefined,
            phone: formData.phone || undefined,
            sapCode: formData.sapCode,
            createdAt: editingClient?.createdAt || now,
            updatedAt: now,
            isActive: true
          }
        
        if (editingClient && editingClient._id) {
          // Cliente existente con _id válido - actualizar
          await dispatch(updateClientAsync({
            ...naturalClient,
            id: editingClient._id
          })).unwrap()
          toast({ title: "Cliente actualizado", description: "El cliente natural ha sido actualizado exitosamente." })
        } else {
          // Cliente nuevo o temporal - crear
          await dispatch(createClientAsync(naturalClient)).unwrap()
          toast({ title: "Cliente creado", description: "El cliente natural ha sido creado exitosamente." })
          onClientCreated?.(naturalClient)
        }
              } else {
          const juridicalClient: JuridicalClient = {
            id: editingClient?.id || generateId(),
            type: "juridico",
            companyName: formData.companyName,
            ruc: formData.ruc,
            contactName: formData.contactName || undefined,
            email: formData.email,
            phone: formData.phone || undefined,
            address: formData.address || undefined,
            sapCode: formData.sapCode,
            createdAt: editingClient?.createdAt || now,
            updatedAt: now,
            isActive: true
          }
        
        if (editingClient && editingClient._id) {
          // Cliente existente con _id válido - actualizar
          await dispatch(updateClientAsync({
            ...juridicalClient,
            id: editingClient._id
          })).unwrap()
          toast({ title: "Cliente actualizado", description: "El cliente jurídico ha sido actualizado exitosamente." })
        } else {
          // Cliente nuevo o temporal - crear
          await dispatch(createClientAsync(juridicalClient)).unwrap()
          toast({ title: "Cliente creado", description: "El cliente jurídico ha sido creado exitosamente." })
          onClientCreated?.(juridicalClient)
        }
      }
      
      handleCloseDialog()
    } catch (error) {
      toast({ 
        title: "Error", 
        description: "Ocurrió un error al guardar el cliente.", 
        variant: "destructive" 
      })
    }
  }

  // Cerrar diálogo
  const handleCloseDialog = () => {
    setFormData(initialFormData)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingClient ? "Editar Cliente" : "Crear Nuevo Cliente"}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Tipo de Cliente */}
          <div className="space-y-2">
            <Label>Tipo de Cliente</Label>
            <Tabs 
              value={formData.type} 
              onValueChange={(value) => setFormData({...formData, type: value as ClientType})}
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="natural" className="flex items-center space-x-2">
                  <User className="h-4 w-4" />
                  <span>Natural</span>
                </TabsTrigger>
                <TabsTrigger value="juridico" className="flex items-center space-x-2">
                  <Building className="h-4 w-4" />
                  <span>Jurídico</span>
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="natural" className="space-y-4">
                {/* Campos para Cliente Natural */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label htmlFor="fullName">Nombre Completo *</Label>
                    <Input
                      id="fullName"
                      value={formData.fullName}
                      onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                      placeholder="Nombres y apellidos"
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="documentType">Tipo de Documento *</Label>
                    <Select 
                      value={formData.documentType} 
                      onValueChange={(value) => setFormData({...formData, documentType: value as "cedula" | "pasaporte"})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cedula">Cédula</SelectItem>
                        <SelectItem value="pasaporte">Pasaporte</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="documentNumber">Número de Documento *</Label>
                    <Input
                      id="documentNumber"
                      value={formData.documentNumber}
                      onChange={(e) => setFormData({...formData, documentNumber: e.target.value})}
                      placeholder="8-123-456 o PA123456789"
                      required
                    />
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="juridico" className="space-y-4">
                {/* Campos para Cliente Jurídico */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label htmlFor="companyName">Nombre de la Empresa *</Label>
                    <Input
                      id="companyName"
                      value={formData.companyName}
                      onChange={(e) => setFormData({...formData, companyName: e.target.value})}
                      placeholder="Razón social"
                      required={formData.type === "juridico"}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="ruc">RUC *</Label>
                    <Input
                      id="ruc"
                      value={formData.ruc}
                      onChange={(e) => setFormData({...formData, ruc: e.target.value})}
                      placeholder="155678901-2-2020"
                      required={formData.type === "juridico"}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="contactName">Nombre de Contacto</Label>
                    <Input
                      id="contactName"
                      value={formData.contactName}
                      onChange={(e) => setFormData({...formData, contactName: e.target.value})}
                      placeholder="Persona de contacto"
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
          
          <Separator />
          
          {/* Información de Contacto */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Información de Contacto</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="email">Correo Electrónico {formData.type === "juridico" && "*"}</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  placeholder="correo@ejemplo.com"
                  required={formData.type === "juridico"}
                />
              </div>
              
              <div>
                <Label htmlFor="phone">Teléfono</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  placeholder="6001-2345"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="address">Dirección</Label>
              <Textarea
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({...formData, address: e.target.value})}
                placeholder="Dirección completa del cliente"
                rows={3}
              />
            </div>
            
            <div>
              <Label htmlFor="sapCode">Código SAP Cliente *</Label>
              <Input
                id="sapCode"
                value={formData.sapCode}
                onChange={(e) => setFormData({...formData, sapCode: e.target.value})}
                placeholder="Código SAP del cliente"
                required
              />
            </div>
          </div>
          
          {/* Botones */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={handleCloseDialog}>
              Cancelar
            </Button>
            <Button type="submit">
              {editingClient ? "Actualizar" : "Crear"} Cliente
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function ClientsManagement() {
  const dispatch = useAppDispatch()
  const { toast } = useToast()
  
  const allClients = useAppSelector(selectAllClients)
  const activeClients = useAppSelector(selectActiveClients)
  const naturalClients = useAppSelector(selectNaturalClients)
  const juridicalClients = useAppSelector(selectJuridicalClients)
  
  const [searchTerm, setSearchTerm] = useState("")
  const [filterType, setFilterType] = useState<"all" | "natural" | "juridico">("all")
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("all")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [formData, setFormData] = useState<ClientFormData>(initialFormData)
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null)
  const [clientToToggle, setClientToToggle] = useState<Client | null>(null)

  // Cargar clientes al montar el componente
  useEffect(() => {
    dispatch(fetchClients())
  }, [dispatch])

  // Filtrar clientes
  const filteredClients = useMemo(() => {
    let filtered = allClients
    
    // Filtrar por estado
    if (filterStatus === "active") {
      filtered = filtered.filter((client: Client) => client.isActive)
    } else if (filterStatus === "inactive") {
      filtered = filtered.filter((client: Client) => !client.isActive)
    }
    
    // Filtrar por tipo
    if (filterType !== "all") {
      filtered = filtered.filter((client: Client) => client.type === filterType)
    }
    
    // Filtrar por búsqueda
    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      filtered = filtered.filter((client: Client) => {
        if (client.type === "natural") {
          return (
            client.fullName.toLowerCase().includes(search) ||
            client.documentNumber.toLowerCase().includes(search) ||
            client.sapCode?.toLowerCase().includes(search) ||
            client.email?.toLowerCase().includes(search) ||
            client.phone?.toLowerCase().includes(search)
          )
        } else {
          return (
            client.companyName.toLowerCase().includes(search) ||
            client.ruc.toLowerCase().includes(search) ||
            client.sapCode?.toLowerCase().includes(search) ||
            client.email.toLowerCase().includes(search) ||
            client.contactName?.toLowerCase().includes(search)
          )
        }
      })
    }
    
    return filtered
  }, [allClients, searchTerm, filterType, filterStatus])

  // Eliminar cliente
  const handleDelete = async (clientId: string) => {
    try {
      await dispatch(deleteClientAsync(clientId)).unwrap()
      toast({ title: "Cliente eliminado", description: "El cliente ha sido eliminado." })
      // Recargar clientes después de eliminar
      dispatch(fetchClients())
      setClientToDelete(null)
    } catch (error: any) {
      toast({ 
        title: "Error", 
        description: error.message || "Error al eliminar el cliente", 
        variant: "destructive" 
      })
    }
  }

  // Cambiar estado del cliente
  const handleToggleStatus = async (clientId: string) => {
    try {
      const client = allClients.find((c: Client) => (c._id || c.id) === clientId)
      if (client) {
        const clientIdToUse = client._id || client.id || ""
        // Solo enviar el campo isActive para cambiar el estado
        await dispatch(updateClientAsync({
          id: clientIdToUse,
          isActive: !client.isActive
        } as any)).unwrap()
        toast({ title: "Estado cambiado", description: "El estado del cliente ha sido actualizado." })
        // Recargar clientes después de cambiar estado
        dispatch(fetchClients())
        setClientToToggle(null)
      }
    } catch (error: any) {
      toast({ 
        title: "Error", 
        description: error.message || "Error al cambiar el estado del cliente", 
        variant: "destructive" 
      })
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Users className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Gestión de Clientes</h1>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setEditingClient(null)
              setIsDialogOpen(true)
            }}>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Cliente
            </Button>
          </DialogTrigger>
        </Dialog>
        
        {/* Modal de edición */}
        <ClientModal 
          isOpen={isDialogOpen} 
          onClose={() => {
            setIsDialogOpen(false)
            setEditingClient(null)
          }}
          editingClient={editingClient}
          onClientCreated={(client) => {
            // Recargar clientes después de crear/editar
            dispatch(fetchClients())
          }}
        />

        {/* Modal de confirmación para eliminar cliente */}
        <Dialog open={!!clientToDelete} onOpenChange={() => setClientToDelete(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmar eliminación</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p>¿Estás seguro de que quieres eliminar el cliente?</p>
              {clientToDelete && (
                <p className="font-medium mt-2">
                  {clientToDelete.type === "natural" 
                    ? clientToDelete.fullName 
                    : clientToDelete.companyName
                  }
                </p>
              )}
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setClientToDelete(null)}>
                Cancelar
              </Button>
              <Button 
                variant="destructive" 
                onClick={() => {
                  if (clientToDelete) {
                    handleDelete(clientToDelete._id || clientToDelete.id || "")
                  }
                }}
              >
                Eliminar
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Modal de confirmación para cambiar estado */}
        <Dialog open={!!clientToToggle} onOpenChange={() => setClientToToggle(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmar cambio de estado</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p>¿Estás seguro de que quieres cambiar el estado del cliente?</p>
              {clientToToggle && (
                <div className="mt-2">
                  <p className="font-medium">
                    {clientToToggle.type === "natural" 
                      ? clientToToggle.fullName 
                      : clientToToggle.companyName
                    }
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Estado actual: <span className={clientToToggle.isActive ? "text-green-600" : "text-red-600"}>
                      {clientToToggle.isActive ? "Activo" : "Inactivo"}
                    </span>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Nuevo estado: <span className={!clientToToggle.isActive ? "text-green-600" : "text-red-600"}>
                      {!clientToToggle.isActive ? "Activo" : "Inactivo"}
                    </span>
                  </p>
                </div>
              )}
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setClientToToggle(null)}>
                Cancelar
              </Button>
              <Button 
                onClick={() => {
                  if (clientToToggle) {
                    handleToggleStatus(clientToToggle._id || clientToToggle.id || "")
                  }
                }}
              >
                Confirmar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total Clientes</p>
                <p className="text-2xl font-bold">{allClients.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <User className="h-4 w-4 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Naturales</p>
                <p className="text-2xl font-bold">{naturalClients.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Building className="h-4 w-4 text-purple-500" />
              <div>
                <p className="text-sm text-muted-foreground">Jurídicos</p>
                <p className="text-2xl font-bold">{juridicalClients.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-orange-500" />
              <div>
                <p className="text-sm text-muted-foreground">Activos</p>
                <p className="text-2xl font-bold">{activeClients.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros y Búsqueda */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="h-5 w-5" />
            <span>Filtros y Búsqueda</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre, documento, RUC, código SAP, email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={filterType} onValueChange={(value) => setFilterType(value as any)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                <SelectItem value="natural">Natural</SelectItem>
                <SelectItem value="juridico">Jurídico</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={filterStatus} onValueChange={(value) => setFilterStatus(value as any)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Activos</SelectItem>
                <SelectItem value="inactive">Inactivos</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Resumen de filtros */}
          <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Mostrando {filteredClients.length} de {allClients.length} clientes
            </span>
            
            {(searchTerm || filterType !== "all" || filterStatus !== "all") && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  setSearchTerm("")
                  setFilterType("all")
                  setFilterStatus("all")
                }}
              >
                Limpiar filtros
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabla de Clientes */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Clientes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Nombre/Empresa</TableHead>
                  <TableHead>Documento/RUC</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead>Ubicación</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClients.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <div className="flex flex-col items-center space-y-2">
                        <Users className="h-8 w-8 text-muted-foreground" />
                        <p className="text-muted-foreground">
                          {searchTerm || filterType !== "all" || filterStatus !== "all" 
                            ? "No se encontraron clientes con los filtros aplicados"
                            : "No hay clientes registrados"}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredClients.map((client: Client) => (
                    <TableRow key={client._id || client.id}>
                      <TableCell>
                        <Badge variant={client.type === "natural" ? "default" : "secondary"}>
                          {client.type === "natural" ? (
                            <><User className="mr-1 h-3 w-3" />Natural</>
                          ) : (
                            <><Building className="mr-1 h-3 w-3" />Jurídico</>
                          )}
                        </Badge>
                      </TableCell>
                      
                      <TableCell className="font-medium">
                        {client.type === "natural" ? client.fullName : client.companyName}
                        {client.type === "juridico" && client.contactName && (
                          <div className="text-sm text-muted-foreground">
                            Contacto: {client.contactName}
                          </div>
                        )}
                      </TableCell>
                      
                      <TableCell>
                        {client.type === "natural" 
                          ? `${client.documentType.toUpperCase()}: ${client.documentNumber}`
                          : `${client.ruc}`
                        }
                      </TableCell>
                      
                      <TableCell>
                        {client.email && (
                          <div className="flex items-center space-x-1">
                            <Mail className="h-3 w-3" />
                            <span className="text-sm">{client.email}</span>
                          </div>
                        )}
                      </TableCell>
                      
                      <TableCell>
                        {client.phone && (
                          <div className="flex items-center space-x-1">
                            <Phone className="h-3 w-3" />
                            <span className="text-sm">{client.phone}</span>
                          </div>
                        )}
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <MapPin className="h-3 w-3" />
                          <span className="text-sm">
                            {typeof client.address === "string" ? client.address : "Sin dirección"}
                          </span>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <Badge variant={client.isActive ? "default" : "secondary"}>
                          {client.isActive ? "Activo" : "Inactivo"}
                        </Badge>
                      </TableCell>
                      
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                                                         onClick={() => {
                               setEditingClient(client)
                               setFormData({
                                 type: client.type,
                                 fullName: client.type === "natural" ? client.fullName : "",
                                 documentType: client.type === "natural" ? client.documentType : "cedula",
                                 documentNumber: client.type === "natural" ? client.documentNumber : "",
                                 companyName: client.type === "juridico" ? client.companyName : "",
                                 ruc: client.type === "juridico" ? client.ruc : "",
                                 contactName: client.type === "juridico" ? client.contactName || "" : "",
                                 email: client.email || "",
                                 phone: client.phone || "",
                                 address: typeof client.address === "string" ? client.address : "",
                                 sapCode: client.sapCode || ""
                               })
                               setIsDialogOpen(true)
                             }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setClientToToggle(client)}
                          >
                            <Switch checked={client.isActive} />
                          </Button>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setClientToDelete(client)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}