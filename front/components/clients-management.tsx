"use client"

import { useState, useMemo } from "react"
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
  dv: string
  contactName: string
  // Campos comunes
  email: string
  phone: string
  province: string
  district: string
  corregimiento: string
  fullAddress: string
  sapCode: string
}

const initialFormData: ClientFormData = {
  type: "natural",
  fullName: "",
  documentType: "cedula",
  documentNumber: "",
  companyName: "",
  ruc: "",
  dv: "",
  contactName: "",
  email: "",
  phone: "",
  province: "",
  district: "",
  corregimiento: "",
  fullAddress: "",
  sapCode: ""
}

const provinces = [
  "Panamá", "Colón", "Chiriquí", "Veraguas", "Los Santos", 
  "Herrera", "Coclé", "Darién", "Panamá Oeste", "Bocas del Toro"
]

// Componente reutilizable para el modal de clientes
export function ClientModal({ 
  isOpen, 
  onClose, 
  onClientCreated 
}: { 
  isOpen: boolean
  onClose: () => void
  onClientCreated?: (client: Client) => void
}) {
  const dispatch = useAppDispatch()
  const { toast } = useToast()
  
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [formData, setFormData] = useState<ClientFormData>(initialFormData)

  // Generar ID único
  const generateId = () => `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

  // Manejar envío del formulario
  const handleSubmit = (e: React.FormEvent) => {
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
            address: {
              province: formData.province,
              district: formData.district,
              corregimiento: formData.corregimiento,
              fullAddress: formData.fullAddress || undefined
            },
            email: formData.email || undefined,
            phone: formData.phone || undefined,
            sapCode: formData.sapCode,
            createdAt: editingClient?.createdAt || now,
            updatedAt: now,
            isActive: true
          }
        
        if (editingClient) {
          dispatch(updateClient(naturalClient))
          toast({ title: "Cliente actualizado", description: "El cliente natural ha sido actualizado exitosamente." })
        } else {
          dispatch(addClient(naturalClient))
          toast({ title: "Cliente creado", description: "El cliente natural ha sido creado exitosamente." })
          onClientCreated?.(naturalClient)
        }
              } else {
          const juridicalClient: JuridicalClient = {
            id: editingClient?.id || generateId(),
            type: "juridico",
            companyName: formData.companyName,
            ruc: formData.ruc,
            dv: formData.dv,
            fiscalAddress: {
              province: formData.province,
              district: formData.district,
              corregimiento: formData.corregimiento,
              fullAddress: formData.fullAddress || undefined
            },
            email: formData.email,
            phone: formData.phone || undefined,
            contactName: formData.contactName || undefined,
            sapCode: formData.sapCode,
            createdAt: editingClient?.createdAt || now,
            updatedAt: now,
            isActive: true
          }
        
        if (editingClient) {
          dispatch(updateClient(juridicalClient))
          toast({ title: "Cliente actualizado", description: "El cliente jurídico ha sido actualizado exitosamente." })
        } else {
          dispatch(addClient(juridicalClient))
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
    setEditingClient(null)
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
                    <Label htmlFor="dv">Dígito Verificador *</Label>
                    <Input
                      id="dv"
                      value={formData.dv}
                      onChange={(e) => setFormData({...formData, dv: e.target.value})}
                      placeholder="12"
                      required={formData.type === "juridico"}
                    />
                  </div>
                  
                  <div className="col-span-2">
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
          
          <Separator />
          
          {/* Dirección */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">
              {formData.type === "natural" ? "Dirección" : "Dirección Fiscal"}
            </h3>
            
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="province">Provincia *</Label>
                <Select 
                  value={formData.province} 
                  onValueChange={(value) => setFormData({...formData, province: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    {provinces.map(province => (
                      <SelectItem key={province} value={province}>{province}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="district">Distrito *</Label>
                <Input
                  id="district"
                  value={formData.district}
                  onChange={(e) => setFormData({...formData, district: e.target.value})}
                  placeholder="Distrito"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="corregimiento">Corregimiento *</Label>
                <Input
                  id="corregimiento"
                  value={formData.corregimiento}
                  onChange={(e) => setFormData({...formData, corregimiento: e.target.value})}
                  placeholder="Corregimiento"
                  required
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="fullAddress">Dirección Completa</Label>
              <Textarea
                id="fullAddress"
                value={formData.fullAddress}
                onChange={(e) => setFormData({...formData, fullAddress: e.target.value})}
                placeholder="Dirección detallada (opcional)"
                rows={2}
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
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("active")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [formData, setFormData] = useState<ClientFormData>(initialFormData)

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
  const handleDelete = (clientId: string) => {
    dispatch(deleteClient(clientId))
    toast({ title: "Cliente eliminado", description: "El cliente ha sido desactivado." })
  }

  // Cambiar estado del cliente
  const handleToggleStatus = (clientId: string) => {
    dispatch(toggleClientStatus(clientId))
    toast({ title: "Estado cambiado", description: "El estado del cliente ha sido actualizado." })
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
            <Button onClick={() => setFormData(initialFormData)}>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Cliente
            </Button>
          </DialogTrigger>
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
            
            {(searchTerm || filterType !== "all" || filterStatus !== "active") && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  setSearchTerm("")
                  setFilterType("all")
                  setFilterStatus("active")
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
                  <TableHead>Código SAP</TableHead>
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
                    <TableCell colSpan={9} className="text-center py-8">
                      <div className="flex flex-col items-center space-y-2">
                        <Users className="h-8 w-8 text-muted-foreground" />
                        <p className="text-muted-foreground">
                          {searchTerm || filterType !== "all" || filterStatus !== "active" 
                            ? "No se encontraron clientes con los filtros aplicados"
                            : "No hay clientes registrados"}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredClients.map((client: Client) => (
                    <TableRow key={client.id}>
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
                          : `${client.ruc}-${client.dv}`
                        }
                      </TableCell>
                      
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-xs">
                          {client.sapCode}
                        </Badge>
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
                            {client.type === "natural" 
                              ? `${client.address.district}, ${client.address.province}`
                              : `${client.fiscalAddress.district}, ${client.fiscalAddress.province}`
                            }
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
                                                                  //@ts-ignore

                                 documentType: client.type === "natural" ? client.documentType : "DNI",
                                 documentNumber: client.type === "natural" ? client.documentNumber : "",
                                 companyName: client.type === "juridico" ? client.companyName : "",
                                 ruc: client.type === "juridico" ? client.ruc : "",
                                 dv: client.type === "juridico" ? client.dv : "",
                                 contactName: client.type === "juridico" ? client.contactName || "" : "",
                                 email: client.email || "",
                                 phone: client.phone || "",
                                 province: client.type === "natural" ? client.address.province : client.fiscalAddress.province,
                                 district: client.type === "natural" ? client.address.district : client.fiscalAddress.district,
                                 corregimiento: client.type === "natural" ? client.address.corregimiento : client.fiscalAddress.corregimiento,
                                 fullAddress: client.type === "natural" ? client.address.fullAddress || "" : client.fiscalAddress.fullAddress || "",
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
                            onClick={() => handleToggleStatus(client.id)}
                          >
                            <Switch checked={client.isActive} />
                          </Button>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(client.id)}
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