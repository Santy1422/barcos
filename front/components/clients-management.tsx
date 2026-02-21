"use client"

import { useState, useMemo, useEffect, useCallback } from "react"
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
  Upload,
  CheckCircle,
  Loader2
} from "lucide-react"
import { useAppSelector, useAppDispatch } from "@/lib/hooks"
import { selectCurrentUser } from "@/lib/features/auth/authSlice"
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
import { createApiUrl } from "@/lib/api-config"

interface ClientFormData {
  type: ClientType
  // Campos para cliente natural
  fullName: string
  documentType: "cedula" | "pasaporte"
  documentNumber: string
  // Campos para cliente jurídico
  companyName: string
  name: string
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
  name: "",
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
  editingClient = null,
  module = "ptyss"
}: { 
  isOpen: boolean
  onClose: () => void
  onClientCreated?: (client: Client) => void
  editingClient?: Client | null
  module?: string | string[] // Soporta string único o array de módulos
}) {
  const dispatch = useAppDispatch()
  const allClients = useAppSelector(selectAllClients)
  const currentUser = useAppSelector(selectCurrentUser)
  const { toast } = useToast()
  
  // Verificar permisos para gestionar clientes
  const userRoles = currentUser?.roles || (currentUser?.role ? [currentUser.role] : [])
  const canManageClients = userRoles.includes('administrador') || userRoles.includes('clientes')
  
  // Si no tiene permisos, cerrar el modal y mostrar error
  useEffect(() => {
    if (isOpen && !canManageClients) {
      toast({
        title: "Sin permiso",
        description: "No tienes permiso para gestionar clientes.",
        variant: "destructive"
      })
      onClose()
    }
  }, [isOpen, canManageClients, onClose, toast])
  
  const [formData, setFormData] = useState<ClientFormData>(initialFormData)
  const [existingClient, setExistingClient] = useState<Client | null>(null)
  const [sapCodeChecked, setSapCodeChecked] = useState(false)
  const [isCheckingSap, setIsCheckingSap] = useState(false)

  // Función helper: verificar si estamos creando un cliente nuevo (sin _id real en la DB)
  const isCreatingNewClient = () => {
    return !editingClient || !editingClient._id
  }

  // Función helper: verificar si los campos deben estar deshabilitados
  const shouldDisableFields = () => {
    // Si tenemos un cliente (existe o parcial), los campos están habilitados
    if (editingClient) {
      return false
    }
    
    // Si no hay cliente y no hemos verificado el SAP, deshabilitar campos
    if (!existingClient && !sapCodeChecked) {
      return true
    }
    
    // Los campos están habilitados en todos los demás casos
    return false
  }

  // Función para verificar si existe un cliente con el SAP code ingresado
  const checkSapCode = async (sapCode: string) => {
    if (!sapCode.trim()) {
      setExistingClient(null)
      setSapCodeChecked(false)
      return
    }

    setIsCheckingSap(true)
    
    try {
      // Buscar cliente por SAP code en el backend (sin filtrar por módulo)
      const token = localStorage.getItem('token')
      if (!token) {
        throw new Error('No se encontró token de autenticación')
      }
      
      const normalizedSapCode = sapCode.trim()
      const response = await fetch(createApiUrl(`/api/clients/search/sap-code?sapCode=${encodeURIComponent(normalizedSapCode)}`), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        const found = data.payload?.client || data.client
        
        if (found) {
          setExistingClient(found)
          setSapCodeChecked(true)
          
          // Cargar datos del cliente existente
          setFormData({
            type: found.type,
            fullName: found.type === "natural" ? found.fullName : "",
            documentType: found.type === "natural" ? found.documentType : "cedula",
            documentNumber: found.type === "natural" ? found.documentNumber : "",
            companyName: found.type === "juridico" ? found.companyName : "",
            name: found.type === "juridico" ? found.name || "" : "",
            ruc: found.type === "juridico" ? found.ruc : "",
            contactName: found.type === "juridico" ? found.contactName || "" : "",
            email: found.email || "",
            phone: found.phone || "",
            address: typeof found.address === "string" ? found.address : "",
            sapCode: found.sapCode || ""
          })
          
          const clientModules = (found as any).module || []
          const moduleArray = Array.isArray(module) ? module : [module]
          const isModuleAlreadyAssigned = moduleArray.some((m: string) => clientModules.includes(m))
          
          const moduleNames = moduleArray.map((m: string) => {
            if (m === 'ptyss') return 'PTYSS'
            if (m === 'trucking') return 'Trucking'
            if (m === 'agency') return 'Agency'
            if (m === 'shipchandler') return 'ShipChandler'
            return m
          })
          
          if (!isModuleAlreadyAssigned) {
            toast({
              title: "✅ Cliente encontrado",
              description: `Se agregará el cliente al módulo: ${moduleNames.join(", ")}`,
            })
          } else {
            toast({
              title: "Cliente ya asignado a este módulo",
              description: "Estás editando un cliente que ya está asignado a este módulo.",
            })
          }
        } else {
          // Cliente no encontrado en la respuesta
          setExistingClient(null)
          setSapCodeChecked(true)
          
          const moduleArray = Array.isArray(module) ? module : [module]
          const moduleNames = moduleArray.map((m: string) => {
            if (m === 'ptyss') return 'PTYSS'
            if (m === 'trucking') return 'Trucking'
            if (m === 'agency') return 'Agency'
            if (m === 'shipchandler') return 'ShipChandler'
            return m
          })
          
          toast({
            title: "❌ Cliente no encontrado",
            description: `Se creará un nuevo cliente en el módulo: ${moduleNames.join(", ")}`,
          })
        }
      } else if (response.status === 404) {
        // Cliente no encontrado (404)
        setExistingClient(null)
        setSapCodeChecked(true)
        
        const moduleArray = Array.isArray(module) ? module : [module]
        const moduleNames = moduleArray.map((m: string) => {
          if (m === 'ptyss') return 'PTYSS'
          if (m === 'trucking') return 'Trucking'
          if (m === 'agency') return 'Agency'
          if (m === 'shipchandler') return 'ShipChandler'
          return m
        })
        
        toast({
          title: "❌ Cliente no encontrado",
          description: `Se creará un nuevo cliente en el módulo: ${moduleNames.join(", ")}`,
        })
      } else {
        // Error en la búsqueda
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Error al buscar cliente')
      }
    } catch (error) {
      console.error('Error al buscar cliente por SAP code:', error)
      setExistingClient(null)
      setSapCodeChecked(true)
      
      const moduleArray = Array.isArray(module) ? module : [module]
      const moduleNames = moduleArray.map((m: string) => {
        if (m === 'ptyss') return 'PTYSS'
        if (m === 'trucking') return 'Trucking'
        if (m === 'agency') return 'Agency'
        if (m === 'shipchandler') return 'ShipChandler'
        return m
      })
      
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al buscar cliente. Se creará uno nuevo.",
        variant: "destructive"
      })
    } finally {
      setIsCheckingSap(false)
    }
  }

  // Cargar datos del cliente cuando se abre en modo edición
  useEffect(() => {
    if (editingClient && isOpen) {
      setFormData({
        type: editingClient.type,
        fullName: editingClient.type === "natural" ? editingClient.fullName : "",
        documentType: editingClient.type === "natural" ? editingClient.documentType : "cedula",
        documentNumber: editingClient.type === "natural" ? editingClient.documentNumber : "",
        companyName: editingClient.type === "juridico" ? editingClient.companyName : "",
        name: editingClient.type === "juridico" ? editingClient.name || "" : "",
        ruc: editingClient.type === "juridico" ? editingClient.ruc : "",
        contactName: editingClient.type === "juridico" ? editingClient.contactName || "" : "",
        email: editingClient.email || "",
        phone: editingClient.phone || "",
        address: typeof editingClient.address === "string" ? editingClient.address : "",
        sapCode: editingClient.sapCode || ""
      })
      // Solo setear existingClient si el cliente tiene _id (existe en la base de datos)
      if (editingClient._id) {
        setExistingClient(editingClient)
        setSapCodeChecked(true)
      } else {
        // Cliente nuevo sin _id, no setear existingClient
        setExistingClient(null)
        setSapCodeChecked(false)
        // Si tiene SAP code, buscar automáticamente después de un pequeño delay
        if (editingClient.sapCode && editingClient.sapCode.trim()) {
          // Usar setTimeout para evitar problemas de dependencias
          setTimeout(() => {
            checkSapCode(editingClient.sapCode || "")
          }, 100)
        }
      }
    } else if (!editingClient && isOpen) {
      // Resetear formulario cuando se abre para crear nuevo cliente
      setFormData(initialFormData)
      setExistingClient(null)
      setSapCodeChecked(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingClient, isOpen])

  // Generar ID único
  const generateId = () => `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

  // Manejar envío del formulario
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validar campos requeridos y normalizar SAP code
    const normalizedSapCode = formData.sapCode.trim()
    if (!normalizedSapCode) {
      toast({ 
        title: "Campo requerido", 
        description: "El código SAP del cliente es obligatorio.", 
        variant: "destructive" 
      })
      return
    }

    // Normalizar el SAP code en el formData
    const formDataWithNormalizedSap = {
      ...formData,
      sapCode: normalizedSapCode
    }

    // Si existe un cliente con este SAP, actualizar sus módulos en lugar de crear uno nuevo
    if (existingClient && existingClient.sapCode?.trim().toLowerCase() === normalizedSapCode.toLowerCase()) {
      try {
        const clientModules = (existingClient as any).module || []
        const moduleArray = Array.isArray(module) ? module : [module]
        const updatedModules = [...new Set([...clientModules, ...moduleArray])] // Evitar duplicados
        
        // Usar el ID real del cliente existente
        const clientId = existingClient._id || existingClient.id
        
        // Actualizar el cliente agregando los módulos y actualizando los datos
        await dispatch(updateClientAsync({
          id: clientId,
          ...existingClient,
          module: updatedModules,
          ...(formDataWithNormalizedSap.type === "natural" ? {
            fullName: formDataWithNormalizedSap.fullName,
            documentType: formDataWithNormalizedSap.documentType,
            documentNumber: formDataWithNormalizedSap.documentNumber
          } : {
            companyName: formDataWithNormalizedSap.companyName,
            name: formDataWithNormalizedSap.name,
            ruc: formDataWithNormalizedSap.ruc,
            contactName: formDataWithNormalizedSap.contactName
          }),
          email: formDataWithNormalizedSap.email,
          phone: formDataWithNormalizedSap.phone,
          address: formDataWithNormalizedSap.address,
          sapCode: normalizedSapCode
        } as any)).unwrap()
        
        toast({ 
          title: "Cliente actualizado", 
          description: `Cliente actualizado y agregado al módulo ${moduleArray.join(", ")}.` 
        })
        handleCloseDialog()
        onClientCreated?.(existingClient) // Pasar el cliente actualizado al callback
        return
      } catch (error) {
        toast({ 
          title: "Error", 
          description: "Ocurrió un error al actualizar el cliente.", 
          variant: "destructive" 
        })
        return
      }
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
            sapCode: normalizedSapCode,
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
          // Cliente nuevo o temporal - crear con módulo (convertir a array si es string)
          const moduleArray = Array.isArray(module) ? module : [module]
          await dispatch(createClientAsync({ ...naturalClient, module: moduleArray })).unwrap()
          toast({ title: "Cliente creado", description: "El cliente natural ha sido creado exitosamente." })
          onClientCreated?.(naturalClient)
        }
              } else {
          const juridicalClient: JuridicalClient = {
            id: editingClient?.id || generateId(),
            type: "juridico",
            companyName: formData.companyName,
            name: formData.name,
            ruc: formData.ruc,
            contactName: formData.contactName || undefined,
            email: formData.email,
            phone: formData.phone || undefined,
            address: formData.address || undefined,
            sapCode: normalizedSapCode,
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
          // Cliente nuevo o temporal - crear con módulo (convertir a array si es string)
          const moduleArray = Array.isArray(module) ? module : [module]
          await dispatch(createClientAsync({ ...juridicalClient, module: moduleArray })).unwrap()
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
          {/* Código SAP - PRIMERO */}
          <div className="space-y-2">
            <Label htmlFor="sapCode">Código SAP Cliente *</Label>
            <div className="flex gap-2">
              <Input
                id="sapCode"
                value={formData.sapCode}
                onChange={(e) => {
                  setFormData({...formData, sapCode: e.target.value})
                  setSapCodeChecked(false)
                  setExistingClient(null)
                  // Resetear otros campos
                  if (editingClient === null) {
                    setFormData(prev => ({
                      ...prev,
                      sapCode: e.target.value,
                      fullName: "",
                      documentNumber: "",
                      companyName: "",
                      name: "",
                      ruc: "",
                      email: "",
                      phone: "",
                      address: ""
                    }))
                  }
                }}
                placeholder="Ingresa el código SAP"
                required
                className="flex-1"
              />
              {!(editingClient && editingClient._id) && ( // Mostrar botón de buscar si no está editando un cliente existente
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => checkSapCode(formData.sapCode)}
                  disabled={!formData.sapCode.trim() || isCheckingSap}
                >
                  {isCheckingSap ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Buscando...
                    </>
                  ) : "Buscar"}
                </Button>
              )}
            </div>
            {existingClient && !editingClient?._id && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-blue-600" />
                  <span className="text-sm text-blue-800 font-medium">
                    Cliente encontrado. Al guardar, asociaremos el cliente encontrado en el módulo actual.
                  </span>
                </div>
              </div>
            )}
            {!existingClient && sapCodeChecked && !editingClient && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                <div className="flex items-center space-x-2">
                  <Plus className="h-4 w-4 text-orange-600" />
                  <span className="text-sm text-orange-800 font-medium">
                    Cliente no encontrado. Se creará un nuevo cliente con el codigo SAP ingresado. Por favor completar todos los campos restantes.
                  </span>
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Tipo de Cliente */}
          <div className="space-y-2">
            <Label>Tipo de Cliente</Label>
            <Tabs 
              value={formData.type} 
              onValueChange={(value) => setFormData({...formData, type: value as ClientType})}
            >
              <TabsList className="grid w-full grid-cols-2" disabled={shouldDisableFields()}>
                <TabsTrigger value="natural" className="flex items-center space-x-2" disabled={shouldDisableFields()}>
                  <User className="h-4 w-4" />
                  <span>Natural</span>
                </TabsTrigger>
                <TabsTrigger value="juridico" className="flex items-center space-x-2" disabled={shouldDisableFields()}>
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
                      disabled={shouldDisableFields()}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="documentType">Tipo de Documento *</Label>
                    <Select 
                      value={formData.documentType} 
                      onValueChange={(value) => setFormData({...formData, documentType: value as "cedula" | "pasaporte"})}
                      disabled={shouldDisableFields()}
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
                      disabled={shouldDisableFields()}
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
                      disabled={shouldDisableFields()}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="name">Nombre Corto</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      placeholder="Nombre corto para referencias"
                      disabled={shouldDisableFields()}
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
                      disabled={shouldDisableFields()}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="contactName">Nombre de Contacto</Label>
                    <Input
                      id="contactName"
                      value={formData.contactName}
                      onChange={(e) => setFormData({...formData, contactName: e.target.value})}
                      placeholder="Persona de contacto"
                      disabled={shouldDisableFields()}
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
                disabled={shouldDisableFields()}
              />
            </div>
              
            <div>
              <Label htmlFor="phone">Teléfono</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                placeholder="6001-2345"
                disabled={shouldDisableFields()}
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
                disabled={shouldDisableFields()}
              />
            </div>
          </div>
          
          {/* Botones */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={handleCloseDialog}>
              Cancelar
            </Button>
            <Button type="submit" disabled={(shouldDisableFields() && !existingClient) || !formData.sapCode.trim()}>
              {existingClient ? "Agregar al Cliente Existente" : editingClient ? "Actualizar" : "Crear Cliente"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function ClientsManagement() {
  const dispatch = useAppDispatch()
  const currentUser = useAppSelector(selectCurrentUser)
  const { toast } = useToast()
  
  const allClients = useAppSelector(selectAllClients)
  
  // Mapeo entre módulos del usuario y módulos de clientes
  // Los módulos del usuario son: trucking, shipchandler, agency
  // Los módulos de clientes son: trucking, shipchandler, agency, ptyss
  const moduleMapping: Record<string, string> = {
    'trucking': 'trucking',
    'shipchandler': 'shipchandler',
    'agency': 'agency',
    'ptyss': 'ptyss' // Mantener compatibilidad con ptyss
  }

  // Filtrar clientes por módulos del usuario
  const filteredClientsByModule = useMemo(() => {
    if (!currentUser) {
      return allClients
    }

    // Obtener roles del usuario para verificar permisos
    const userRoles = currentUser.roles || (currentUser.role ? [currentUser.role] : [])
    const isAdmin = userRoles.includes('administrador')
    const isClientesRole = userRoles.includes('clientes')

    // Si es admin o tiene rol "clientes", ver todos los clientes
    if (isAdmin || isClientesRole) {
      return allClients
    }

    // Si no tiene módulos asignados, mostrar todos los clientes
    if (!currentUser.modules || currentUser.modules.length === 0) {
      return allClients
    }

    // Mapear los módulos del usuario a los módulos de los clientes
    const userClientModules = currentUser.modules?.map(m => moduleMapping[m] || m) || []

    // Filtrar por módulos del usuario
    return allClients.filter((client: any) => {
      if (!client.module || !Array.isArray(client.module)) {
        return false // Clientes sin módulo asignado no se muestran
      }

      // Verificar si el cliente tiene al menos uno de los módulos del usuario (mapeados)
      const hasOverlap = client.module.some((clientModule: string) =>
        userClientModules.includes(clientModule)
      )

      return hasOverlap
    })
  }, [allClients, currentUser])
  
  // Calcular estadísticas basadas en clientes filtrados
  const activeClients = useMemo(() => filteredClientsByModule.filter(c => c.isActive), [filteredClientsByModule])
  const naturalClients = useMemo(() => filteredClientsByModule.filter(c => c.type === "natural" && c.isActive), [filteredClientsByModule])
  const juridicalClients = useMemo(() => filteredClientsByModule.filter(c => c.type === "juridico" && c.isActive), [filteredClientsByModule])
  
  const [searchTerm, setSearchTerm] = useState("")
  const [filterType, setFilterType] = useState<"all" | "natural" | "juridico">("all")
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("all")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [formData, setFormData] = useState<ClientFormData>(initialFormData)
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null)
  const [clientToToggle, setClientToToggle] = useState<Client | null>(null)

  // Función helper para cargar clientes según los módulos del usuario
  const loadClientsForUser = useCallback(() => {
    if (!currentUser || !currentUser.modules || currentUser.modules.length === 0) {
      // Si no hay usuario o módulos, cargar todos los clientes
      dispatch(fetchClients())
      return
    }
    
    // Obtener roles del usuario para verificar si es admin
    const userRoles = currentUser.roles || (currentUser.role ? [currentUser.role] : [])
    const isAdmin = userRoles.includes('administrador')
    
    // Si es admin, cargar todos los clientes
    if (isAdmin) {
      dispatch(fetchClients())
      return
    }
    
    // Mapear los módulos del usuario a los módulos de los clientes
    const userClientModules = currentUser.modules?.map(m => moduleMapping[m] || m) || []
    
    // Si el usuario tiene múltiples módulos, cargar clientes de todos ellos
    if (userClientModules.length > 1) {
      dispatch(fetchClients(userClientModules))
    } else if (userClientModules.length === 1) {
      dispatch(fetchClients(userClientModules[0]))
    } else {
      dispatch(fetchClients())
    }
  }, [dispatch, currentUser, moduleMapping])

  // Cargar clientes al montar el componente - Filtrar por módulos del usuario
  useEffect(() => {
    loadClientsForUser()
  }, [loadClientsForUser])

  // Filtrar clientes
  const filteredClients = useMemo(() => {
    // Usar los clientes ya filtrados por módulos
    let filtered = filteredClientsByModule
    
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
            (client as JuridicalClient).name?.toLowerCase().includes(search) ||
            client.ruc.toLowerCase().includes(search) ||
            client.sapCode?.toLowerCase().includes(search) ||
            client.email.toLowerCase().includes(search) ||
            client.contactName?.toLowerCase().includes(search)
          )
        }
      })
    }
    
    return filtered
  }, [filteredClientsByModule, searchTerm, filterType, filterStatus])

  // Eliminar cliente
  const handleDelete = async (clientId: string) => {
    try {
      await dispatch(deleteClientAsync(clientId)).unwrap()
      toast({ title: "Cliente eliminado", description: "El cliente ha sido eliminado." })
      // Recargar clientes después de eliminar
      loadClientsForUser()
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
        loadClientsForUser()
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
          module={
            currentUser?.modules && currentUser.modules.length > 0
              ? (currentUser.modules.length > 1 
                  ? currentUser.modules.map(m => moduleMapping[m] || m)
                  : moduleMapping[currentUser.modules[0]] || currentUser.modules[0])
              : "ptyss"
          }
          onClientCreated={(client) => {
            // Recargar clientes después de crear/editar
            loadClientsForUser()
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
                <p className="text-2xl font-bold">{filteredClientsByModule.length}</p>
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
              Mostrando {filteredClients.length} de {filteredClientsByModule.length} clientes
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
                        {client.type === "juridico" && (client as JuridicalClient).name && (
                          <div className="text-sm text-muted-foreground">
                            Nombre corto: {(client as JuridicalClient).name}
                          </div>
                        )}
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
                        <span className="text-sm font-mono">
                          {client.sapCode || "-"}
                        </span>
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
                                 name: client.type === "juridico" ? client.name : "",
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