"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Edit, Trash2, Users, MapPin, DollarSign, Link, UserCheck, Building2, User, FolderPlus, X } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useAppSelector, useAppDispatch } from "@/lib/hooks"
import { 
  selectPTYSSLocalRoutes,
  selectPTYSSLocalRoutesLoading,
  selectPTYSSLocalRoutesError,
  selectPTYSSLocalRoutesByClient,
  selectClientAssociations,
  selectSchemaSummary,
  selectAllAvailableSchemas,
  fetchPTYSSLocalRoutes,
  fetchSchemaSummary,
  createPTYSSLocalRoute,
  updatePTYSSLocalRoute,
  deletePTYSSLocalRoute,
  associateClientToRouteSet,
  disassociateClientFromRouteSet,
  createRouteSchema,
  deleteRouteSchema,
  clearError,
  getRealClientName,
  type PTYSSLocalRoute,
  type PTYSSLocalRouteInput,
  type RealClient,
  type AssociateClientInput,
  type DisassociateClientInput,
  type CreateSchemaInput,
} from "@/lib/features/ptyssLocalRoutes/ptyssLocalRoutesSlice"
import { selectAllClients, fetchClients, type Client } from "@/lib/features/clients/clientsSlice"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'


export function PTYSSLocalRoutes() {
  const dispatch = useAppDispatch()
  const { toast } = useToast()
  
  const routes = useAppSelector(selectPTYSSLocalRoutes) || []
  const loading = useAppSelector(selectPTYSSLocalRoutesLoading) || false
  const error = useAppSelector(selectPTYSSLocalRoutesError) || null
  const routesByClient = useAppSelector(selectPTYSSLocalRoutesByClient) || {}
  const clientAssociations = useAppSelector(selectClientAssociations) || {}
  const schemaSummary = useAppSelector(selectSchemaSummary)
  const availableSchemas = useAppSelector(selectAllAvailableSchemas) || []
  
  // Clientes reales del sistema
  const realClients = useAppSelector(selectAllClients) || []

  const [showAddRouteForm, setShowAddRouteForm] = useState(false)
  const [routeToDelete, setRouteToDelete] = useState<PTYSSLocalRoute | null>(null)
  const [editingRoute, setEditingRoute] = useState<PTYSSLocalRoute | null>(null)
  const [selectedClient, setSelectedClient] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [newRoute, setNewRoute] = useState<PTYSSLocalRouteInput>({
    clientName: '',
    from: "",
    to: "",
    priceRegular: 0,
    priceReefer: 0,
    price: 0 // Campo legacy para compatibilidad
  })

  // Estados para asociación de clientes
  const [showAssociateForm, setShowAssociateForm] = useState(false)
  const [clientToAssociate, setClientToAssociate] = useState<string>('')
  const [selectedRealClient, setSelectedRealClient] = useState<string>('')

  // Estados para desasociación de clientes
  const [showDisassociateForm, setShowDisassociateForm] = useState(false)
  const [clientToDisassociate, setClientToDisassociate] = useState<string>('')

  // Estados para gestión de esquemas
  const [showCreateSchemaForm, setShowCreateSchemaForm] = useState(false)
  const [newSchemaName, setNewSchemaName] = useState<string>('')
  const [schemaToDelete, setSchemaToDelete] = useState<string>('')

  // Cargar datos al montar el componente
  useEffect(() => {
    dispatch(fetchPTYSSLocalRoutes())
    dispatch(fetchSchemaSummary())
    dispatch(fetchClients())
  }, [dispatch])

  // Inicializar cliente seleccionado cuando se cargan los datos
  useEffect(() => {
    if (availableSchemas.length > 0 && !selectedClient) {
      const firstClient = availableSchemas[0]
      setSelectedClient(firstClient)
      setNewRoute(prev => ({ ...prev, clientName: firstClient }))
    }
  }, [availableSchemas, selectedClient])

  // Limpiar errores cuando cambie
  useEffect(() => {
    if (error) {
      toast({
        title: "Error",
        description: error,
        variant: "destructive"
      })
      dispatch(clearError())
    }
  }, [error, toast, dispatch])

  // Filtrar destinos basados en el origen seleccionado usando datos del backend
  const getDestinationsForOrigin = (origin: string) => {
    return routes
      .filter(route => route.from === origin)
      .map(route => route.to)
      .filter((to, index, arr) => arr.indexOf(to) === index) // Eliminar duplicados
      .sort()
  }

  // Filtrar rutas por término de búsqueda
  const getFilteredRoutesByClient = (clientName: string) => {
    const clientRoutes = routesByClient[clientName] || []
    if (!searchTerm.trim()) return clientRoutes
    
    return clientRoutes.filter(route => 
      route.from.toLowerCase().includes(searchTerm.toLowerCase()) ||
      route.to.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }

  // Obtener clientes reales disponibles para asociar (que no estén ya asociados)
  const getAvailableRealClients = () => {
    const associatedClientIds = Object.values(clientAssociations)
      .filter(client => client !== null)
      .map(client => client?._id)
    
    return realClients.filter(client => 
      client.isActive && !associatedClientIds.includes(client._id)
    )
  }

  // Obtener esquemas de rutas sin asociar
  const getUnassociatedRouteSets = () => {
    return availableSchemas.filter(clientName => !clientAssociations[clientName])
  }

  // Obtener esquemas de rutas asociados
  const getAssociatedRouteSets = () => {
    return availableSchemas.filter(clientName => !!clientAssociations[clientName])
  }

  // Obtener esquemas que no están asociados (pueden tener rutas o estar vacíos)
  const getDeletableSchemas = () => {
    return availableSchemas.filter(schemaName => {
      const isNotAssociated = !clientAssociations[schemaName]
      return isNotAssociated
    })
  }

  const handleCreateSchema = async () => {
    if (!newSchemaName.trim()) {
      toast({
        title: "Error",
        description: "El nombre del esquema es requerido",
        variant: "destructive"
      })
      return
    }

    if (newSchemaName.trim().length < 3) {
      toast({
        title: "Error",
        description: "El nombre del esquema debe tener al menos 3 caracteres",
        variant: "destructive"
      })
      return
    }

    try {
      await dispatch(createRouteSchema({ schemaName: newSchemaName.trim() })).unwrap()
      
      setNewSchemaName('')
      setShowCreateSchemaForm(false)
      
      // Refrescar datos para mostrar el nuevo esquema
      await dispatch(fetchSchemaSummary())
      await dispatch(fetchPTYSSLocalRoutes())

      toast({
        title: "Esquema creado",
        description: `El esquema "${newSchemaName.trim()}" ha sido creado exitosamente`,
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Error al crear el esquema",
        variant: "destructive"
      })
    }
  }

  const handleDeleteSchema = async (schemaName: string) => {
    try {
      await dispatch(deleteRouteSchema(schemaName)).unwrap()
      
      setSchemaToDelete('')
      
      // Refrescar datos después de eliminar
      await dispatch(fetchSchemaSummary())
      await dispatch(fetchPTYSSLocalRoutes())
      
      // Si el esquema eliminado era el seleccionado, cambiar al primero disponible
      if (selectedClient === schemaName) {
        const remainingSchemas = availableSchemas.filter(name => name !== schemaName)
        if (remainingSchemas.length > 0) {
          setSelectedClient(remainingSchemas[0])
          setNewRoute(prev => ({ ...prev, clientName: remainingSchemas[0] }))
        } else {
          setSelectedClient('')
          setNewRoute(prev => ({ ...prev, clientName: '' }))
        }
      }

      toast({
        title: "Esquema eliminado",
        description: `El esquema "${schemaName}" ha sido eliminado del sistema`,
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Error al eliminar el esquema",
        variant: "destructive"
      })
    }
  }

  const handleAddRoute = async () => {
    if (!newRoute.clientName || !newRoute.from || !newRoute.to || newRoute.priceRegular <= 0 || newRoute.priceReefer <= 0) {
      toast({
        title: "Error",
        description: "Completa todos los campos obligatorios. Los precios deben ser mayores a 0.",
        variant: "destructive"
      })
      return
    }

    try {
      // Obtener el cliente real asociado al esquema seleccionado
      const associatedClient = clientAssociations[selectedClient]
      const realClientId = associatedClient?._id || undefined
      
      // Crear la ruta incluyendo el realClientId si existe
      const routeToCreate = {
        ...newRoute,
        realClientId
      }
      
      await dispatch(createPTYSSLocalRoute(routeToCreate)).unwrap()
      
      // Refrescar las rutas para mostrar la nueva ruta
      await dispatch(fetchPTYSSLocalRoutes())
      
      setNewRoute({
        clientName: selectedClient,
        from: "",
        to: "",
        priceRegular: 0,
        priceReefer: 0,
        price: 0
      })
      setShowAddRouteForm(false)

      toast({
        title: "Ruta agregada",
        description: "La nueva ruta ha sido configurada correctamente",
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Error al crear la ruta",
        variant: "destructive"
      })
    }
  }

  const handleEditRoute = async () => {
    if (!editingRoute || !newRoute.clientName || !newRoute.from || !newRoute.to || newRoute.priceRegular <= 0 || newRoute.priceReefer <= 0) {
      toast({
        title: "Error",
        description: "Completa todos los campos obligatorios. Los precios deben ser mayores a 0.",
        variant: "destructive"
      })
      return
    }

    try {
      // Obtener el cliente real asociado al esquema seleccionado
      const associatedClient = clientAssociations[selectedClient]
      const realClientId = associatedClient?._id || undefined
      
      // Actualizar la ruta incluyendo el realClientId si existe
      const routeToUpdate = {
        ...newRoute,
        realClientId
      }
      
      await dispatch(updatePTYSSLocalRoute({ id: editingRoute._id, routeData: routeToUpdate })).unwrap()
      
      // Refrescar las rutas para mostrar los cambios
      await dispatch(fetchPTYSSLocalRoutes())
      
      setNewRoute({
        clientName: selectedClient,
        from: "",
        to: "",
        priceRegular: 0,
        priceReefer: 0,
        price: 0
      })
      setEditingRoute(null)

      toast({
        title: "Ruta actualizada",
        description: "La ruta ha sido actualizada correctamente",
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Error al actualizar la ruta",
        variant: "destructive"
      })
    }
  }

  const handleDeleteRoute = async (routeId: string) => {
    try {
      await dispatch(deletePTYSSLocalRoute(routeId)).unwrap()
      
      // Refrescar las rutas para actualizar la lista
      await dispatch(fetchPTYSSLocalRoutes())
      
      toast({
        title: "Ruta eliminada",
        description: "La ruta ha sido eliminada del sistema",
      })
      setRouteToDelete(null)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Error al eliminar la ruta",
        variant: "destructive"
      })
    }
  }

  const handleEditRouteClick = (route: PTYSSLocalRoute) => {
    setEditingRoute(route)
    setNewRoute({
      clientName: route.clientName,
      from: route.from,
      to: route.to,
      priceRegular: route.priceRegular || route.price || 0,
      priceReefer: route.priceReefer || route.price || 0,
      price: route.price || 0
    })
    setSelectedClient(route.clientName)
  }

  const handleCancelEdit = () => {
    setEditingRoute(null)
    setNewRoute({
      clientName: selectedClient,
      from: "",
      to: "",
      priceRegular: 0,
      priceReefer: 0,
      price: 0
    })
  }

  const handleClientChange = (client: string) => {
    setSelectedClient(client)
    setNewRoute(prev => ({ ...prev, clientName: client }))
  }

  const handleAssociateClient = async () => {
    if (!clientToAssociate || !selectedRealClient) {
      toast({
        title: "Error",
        description: "Selecciona tanto el esquema de rutas como el cliente real",
        variant: "destructive"
      })
      return
    }

    try {
      await dispatch(associateClientToRouteSet({
        clientName: clientToAssociate,
        realClientId: selectedRealClient
      })).unwrap()

      setShowAssociateForm(false)
      setClientToAssociate('')
      setSelectedRealClient('')

      toast({
        title: "Asociación exitosa",
        description: "El esquema de rutas ha sido asociado al cliente real",
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Error al asociar cliente",
        variant: "destructive"
      })
    }
  }

  const handleDisassociateClient = async () => {
    if (!clientToDisassociate) {
      toast({
        title: "Error",
        description: "Selecciona el esquema de rutas a desasociar",
        variant: "destructive"
      })
      return
    }

    try {
      await dispatch(disassociateClientFromRouteSet({
        clientName: clientToDisassociate
      })).unwrap()

      setShowDisassociateForm(false)
      setClientToDisassociate('')

      toast({
        title: "Desasociación exitosa",
        description: "El esquema de rutas ha sido desasociado del cliente real",
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Error al desasociar cliente",
        variant: "destructive"
      })
    }
  }

  const getRealClientDisplayName = (client: Client): string => {
    return client.type === 'natural' ? (client.fullName || '') : (client.companyName || '')
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="space-y-4">
          {/* Título principal */}
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Gestión de Rutas Local PTYSS
          </CardTitle>
          
          {/* Línea de resumen de estadísticas */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground bg-muted/30 px-4 py-3 rounded-lg">
            <div className="flex items-center gap-2">
              <span>Total de rutas:</span>
              <Badge variant="outline">{routes.length}</Badge>
            </div>
            <span>•</span>
            <div className="flex items-center gap-2">
              <span>Esquemas:</span>
              <Badge variant="outline">{availableSchemas.length}</Badge>
            </div>
            <span>•</span>
            <div className="flex items-center gap-2">
              <span>Asociados:</span>
              <Badge variant="secondary">{Object.values(clientAssociations).filter(c => c !== null).length}</Badge>
            </div>
          </div>

          {/* Línea de búsqueda y botones de acción */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-2">
            {/* Búsqueda */}
            <div className="relative flex-1 max-w-md">
              <Input
                placeholder="Buscar rutas por origen o destino..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
              {searchTerm && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                >
                  ×
                </Button>
              )}
            </div>

            {/* Botones de acción */}
            <div className="flex items-center gap-2 flex-wrap sm:gap-3">
              
              {/* Botón crear esquema */}
              <Dialog open={showCreateSchemaForm} onOpenChange={setShowCreateSchemaForm}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="flex items-center gap-2">
                    <FolderPlus className="h-4 w-4" />
                    Crear Esquema
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Crear Nuevo Esquema de Rutas</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label>Nombre del esquema</Label>
                      <Input
                        placeholder="ej: Cliente VIP, Rutas Express, etc."
                        value={newSchemaName}
                        onChange={(e) => setNewSchemaName(e.target.value)}
                      />
                      <p className="text-sm text-muted-foreground">
                        El nombre debe tener al menos 3 caracteres
                      </p>
                    </div>
                    
                    <div className="flex justify-end gap-2 pt-4">
                      <Button variant="outline" onClick={() => setShowCreateSchemaForm(false)}>
                        Cancelar
                      </Button>
                      <Button onClick={handleCreateSchema} disabled={loading}>
                        Crear Esquema
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              {/* Botón eliminar esquema */}
              {getDeletableSchemas().length > 0 && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex items-center gap-2 text-red-600 hover:text-red-700"
                  onClick={() => setSchemaToDelete('__MODAL_OPEN__')}
                >
                  <Trash2 className="h-4 w-4" />
                  Eliminar Esquema
                </Button>
              )}

              {/* Modal de eliminar esquema */}
              <Dialog 
                open={!!schemaToDelete} 
                onOpenChange={(open) => {
                  if (!open) setSchemaToDelete('')
                }}
              >
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Eliminar Esquema de Rutas</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label>Esquema a eliminar</Label>
                      <Select 
                        value={schemaToDelete === '__MODAL_OPEN__' ? '' : schemaToDelete} 
                        onValueChange={setSchemaToDelete}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar esquema" />
                        </SelectTrigger>
                        <SelectContent>
                          {getDeletableSchemas().length > 0 ? (
                            getDeletableSchemas().map(schemaName => {
                              // Contar rutas reales (excluyendo placeholders)
                              const realRouteCount = routesByClient[schemaName]?.length || 0
                              // Si no hay rutas reales, verificar si existe en el sistema (placeholder)
                              const hasPlaceholder = routes.some(r => r.clientName === schemaName)
                              const displayCount = realRouteCount > 0 ? realRouteCount : (hasPlaceholder ? 0 : 0)
                              
                              return (
                                <SelectItem key={schemaName} value={schemaName}>
                                  {schemaName} ({displayCount} rutas)
                                </SelectItem>
                              )
                            })
                          ) : (
                            <SelectItem value="__NONE__" disabled>
                              No hay esquemas eliminables disponibles
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      <p className="text-sm text-red-600">
                        ⚠️ Esta acción eliminará todas las rutas del esquema y no se puede deshacer
                      </p>
                    </div>
                    
                    <div className="flex justify-end gap-2 pt-4">
                      <Button variant="outline" onClick={() => setSchemaToDelete('')}>
                        Cancelar
                      </Button>
                      <Button 
                        variant="destructive" 
                        onClick={() => {
                          if (schemaToDelete && !schemaToDelete.startsWith('__')) {
                            handleDeleteSchema(schemaToDelete)
                          }
                        }}
                        disabled={loading || !schemaToDelete || schemaToDelete.startsWith('__')}
                      >
                        Eliminar Esquema
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              {/* Botón desasociar cliente */}
              {getAssociatedRouteSets().length > 0 && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex items-center gap-2 text-orange-600 hover:text-orange-700"
                  onClick={() => setShowDisassociateForm(true)}
                >
                  <Link className="h-4 w-4" />
                  Desasociar Cliente
                </Button>
              )}
              
              <Dialog open={showAssociateForm} onOpenChange={setShowAssociateForm}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="flex items-center gap-2">
                    <Link className="h-4 w-4" />
                    Asociar Cliente
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Asociar Cliente Real a Esquema de Rutas</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label>Esquema de rutas a asociar</Label>
                      <Select value={clientToAssociate} onValueChange={setClientToAssociate}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar esquema de rutas" />
                        </SelectTrigger>
                        <SelectContent>
                          {getUnassociatedRouteSets().map(clientName => (
                            <SelectItem key={clientName} value={clientName}>
                              {clientName} ({routesByClient[clientName]?.length || 0} rutas)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Cliente real del sistema</Label>
                      <Select value={selectedRealClient} onValueChange={setSelectedRealClient}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar cliente real" />
                        </SelectTrigger>
                        <SelectContent>
                          {getAvailableRealClients().map(client => (
                            <SelectItem key={client._id} value={client._id}>
                              <div className="flex items-center gap-2">
                                {client.type === 'natural' ? (
                                  <User className="h-4 w-4" />
                                ) : (
                                  <Building2 className="h-4 w-4" />
                                )}
                                <span>{getRealClientDisplayName(client)}</span>
                                <Badge variant="outline" className="ml-2">
                                  {client.sapCode}
                                </Badge>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="flex justify-end gap-2 pt-4">
                      <Button variant="outline" onClick={() => setShowAssociateForm(false)}>
                        Cancelar
                      </Button>
                      <Button onClick={handleAssociateClient} disabled={loading}>
                        Asociar Cliente
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              {/* Modal para desasociar cliente */}
              <Dialog open={showDisassociateForm} onOpenChange={setShowDisassociateForm}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Desasociar Cliente de Esquema de Rutas</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label>Esquema de rutas a desasociar</Label>
                      <Select value={clientToDisassociate} onValueChange={setClientToDisassociate}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar esquema asociado" />
                        </SelectTrigger>
                        <SelectContent>
                          {getAssociatedRouteSets().map(clientName => (
                            <SelectItem key={clientName} value={clientName}>
                              <div className="flex items-center gap-2">
                                <span>{clientName}</span>
                                <span className="text-sm text-muted-foreground">
                                  → {getRealClientName(clientAssociations[clientName]!)}
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-sm text-orange-600">
                        ⚠️ Esta acción eliminará la asociación entre el esquema y el cliente real
                      </p>
                    </div>
                    
                    <div className="flex justify-end gap-2 pt-4">
                      <Button variant="outline" onClick={() => setShowDisassociateForm(false)}>
                        Cancelar
                      </Button>
                      <Button 
                        variant="destructive"
                        onClick={handleDisassociateClient} 
                        disabled={loading}
                      >
                        Desasociar Cliente
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              <Button onClick={() => setShowAddRouteForm(!showAddRouteForm)}>
                <Plus className="h-4 w-4 mr-2" />
                Agregar Ruta
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {(showAddRouteForm || editingRoute) && (
            <Card className="border-dashed">
              <CardHeader>
                <CardTitle className="text-lg">
                  {editingRoute ? "Editar Ruta" : "Nueva Ruta"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="route-client">Esquema *</Label>
                    <Select value={newRoute.clientName} onValueChange={handleClientChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar esquema" />
                      </SelectTrigger>
                                              <SelectContent>
                          {availableSchemas.map(client => (
                            <SelectItem key={client} value={client}>
                              {client}
                            </SelectItem>
                          ))}
                        </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="route-origin">Origen *</Label>
                    <Input
                      id="route-origin"
                      value={newRoute.from}
                      onChange={(e) => setNewRoute({...newRoute, from: e.target.value})}
                      placeholder="Ej: COLON, PSA, BLB, MIT"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="route-destination">Destino *</Label>
                    <Input
                      id="route-destination"
                      value={newRoute.to}
                      onChange={(e) => setNewRoute({...newRoute, to: e.target.value})}
                      placeholder="Ej: PANAMA, TOCUMEN, DAVID"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="route-price-regular">Precio Regular (DV/HC) *</Label>
                    <Input
                      id="route-price-regular"
                      type="number"
                      value={newRoute.priceRegular}
                      onChange={(e) => setNewRoute({...newRoute, priceRegular: parseFloat(e.target.value) || 0})}
                      placeholder="250.00"
                      min="0"
                      step="0.01"
                    />
                    <p className="text-xs text-muted-foreground">Para contenedores Dry Van y High Cube</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="route-price-reefer">Precio Reefer (RE) *</Label>
                    <Input
                      id="route-price-reefer"
                      type="number"
                      value={newRoute.priceReefer}
                      onChange={(e) => setNewRoute({...newRoute, priceReefer: parseFloat(e.target.value) || 0})}
                      placeholder="300.00"
                      min="0"
                      step="0.01"
                    />
                    <p className="text-xs text-muted-foreground">Para contenedores refrigerados</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={editingRoute ? handleEditRoute : handleAddRoute} disabled={loading}>
                    <Plus className="h-4 w-4 mr-2" />
                    {loading ? "Guardando..." : (editingRoute ? "Actualizar Ruta" : "Agregar Ruta")}
                  </Button>
                  <Button variant="outline" onClick={editingRoute ? handleCancelEdit : () => {
                    setShowAddRouteForm(false)
                    setNewRoute({
                      clientName: selectedClient,
                      from: "",
                      to: "",
                      priceRegular: 0,
                      priceReefer: 0,
                      price: 0
                    })
                  }}>
                    Cancelar
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {availableSchemas.length > 0 ? (
            <Tabs 
              value={selectedClient || availableSchemas[0]} 
              onValueChange={handleClientChange}
              className="w-full"
            >
              <TabsList className="grid w-full h-auto" style={{ gridTemplateColumns: `repeat(${Math.min(availableSchemas.length, 6)}, 1fr)` }}>
                {availableSchemas.map(client => {
                  const totalRoutes = routesByClient[client]?.length || 0
                  const filteredRoutes = getFilteredRoutesByClient(client).length
                  const showCount = searchTerm ? filteredRoutes : totalRoutes
                  const associatedClient = clientAssociations[client]
                  
                  return (
                    <TabsTrigger 
                      key={client} 
                      value={client} 
                      className="flex flex-col items-center gap-1 h-auto py-3 px-2 relative"
                    >
                      {/* Indicador de asociación */}
                      {associatedClient && (
                        <div className="absolute -top-1 -right-1">
                          <UserCheck className="h-3 w-3 text-green-600 bg-white rounded-full" />
                        </div>
                      )}
                      
                      {/* Contenido principal del tab */}
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        <span className="font-medium text-xs">{client}</span>
                      </div>
                      
                      {/* Información adicional */}
                      <div className="flex flex-col items-center gap-1 text-xs">
                        <Badge variant="secondary" className="text-xs min-w-8">
                          {showCount}
                        </Badge>
                        {associatedClient && (
                          <div className="text-xs text-green-600 font-medium max-w-20 truncate">
                            {getRealClientName(associatedClient)}
                          </div>
                        )}
                      </div>
                    </TabsTrigger>
                  )
                })}
              </TabsList>
              
              {availableSchemas.map(client => (
                <TabsContent key={client} value={client} className="space-y-4 mt-6">
                  {/* Información del cliente asociado */}
                  {clientAssociations[client] && (
                    <Card className="bg-green-50 border-green-200">
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <UserCheck className="h-5 w-5 text-green-600 mt-0.5" />
                            <div className="space-y-1">
                              <h4 className="font-medium text-green-800">
                                Cliente asociado: {getRealClientName(clientAssociations[client]!)}
                              </h4>
                              <div className="text-sm text-green-600 space-y-0.5">
                                <div>SAP: {clientAssociations[client]!.sapCode}</div>
                                <div>Email: {clientAssociations[client]!.email}</div>
                              </div>
                            </div>
                          </div>
                          <Badge variant="outline" className="bg-green-100 text-green-800 shrink-0">
                            {clientAssociations[client]!.type === 'natural' ? 'Natural' : 'Jurídico'}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {searchTerm && (
                    <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-md">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-blue-700">
                          🔍 Búsqueda activa: "{searchTerm}"
                        </span>
                        <Badge variant="outline" className="text-blue-700">
                          {getFilteredRoutesByClient(client).length} de {routesByClient[client]?.length || 0} rutas
                        </Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSearchTerm('')}
                        className="text-blue-700 hover:text-blue-800"
                      >
                        Limpiar búsqueda
                      </Button>
                    </div>
                  )}
                  
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Origen</TableHead>
                          <TableHead>Destino</TableHead>
                          <TableHead>Precio</TableHead>
                          <TableHead>Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {loading && (!routesByClient[client] || routesByClient[client]?.length === 0) ? (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center py-8">
                              <div className="flex items-center justify-center space-x-2">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                                <span>Cargando rutas...</span>
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : (!routesByClient[client] || routesByClient[client]?.length === 0) ? (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                              No hay rutas registradas para {client}
                            </TableCell>
                          </TableRow>
                        ) : getFilteredRoutesByClient(client).length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                              {searchTerm ? `No se encontraron rutas que coincidan con "${searchTerm}"` : `No hay rutas registradas para ${client}`}
                            </TableCell>
                          </TableRow>
                        ) : (
                          getFilteredRoutesByClient(client).map((route) => (
                            <TableRow key={route._id}>
                              <TableCell className="font-medium">{route.from}</TableCell>
                              <TableCell>{route.to}</TableCell>
                              <TableCell>
                                <div className="flex flex-col gap-1">
                                  <div className="flex items-center gap-1">
                                    <DollarSign className="h-3 w-3" />
                                    {(route.priceRegular || route.price || 0).toFixed(2)}
                                    <Badge variant="outline" className="text-xs">Regular</Badge>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <DollarSign className="h-3 w-3" />
                                    {(route.priceReefer || route.price || 0).toFixed(2)}
                                    <Badge variant="outline" className="text-xs">Reefer</Badge>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-2">
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => handleEditRouteClick(route)}
                                  >
                                    <Edit className="h-3 w-3" />
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    onClick={() => setRouteToDelete(route)}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          ) : (
            <Card>
              <CardContent className="py-12">
                <div className="text-center space-y-4">
                  <FolderPlus className="h-12 w-12 mx-auto text-muted-foreground" />
                  <div>
                    <h3 className="text-lg font-medium">No hay esquemas de rutas</h3>
                    <p className="text-muted-foreground">
                      Crea tu primer esquema de rutas para comenzar a gestionar rutas locales
                    </p>
                  </div>
                  <Button onClick={() => setShowCreateSchemaForm(true)}>
                    <FolderPlus className="h-4 w-4 mr-2" />
                    Crear Primer Esquema
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      {/* Modal de confirmación para eliminar ruta */}
      <Dialog open={!!routeToDelete} onOpenChange={() => setRouteToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar eliminación</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>¿Estás seguro de que quieres eliminar la ruta?</p>
            {routeToDelete && (
              <p className="font-medium mt-2">
                {routeToDelete.clientName}: {routeToDelete.from} → {routeToDelete.to}
              </p>
            )}
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setRouteToDelete(null)}>
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => {
                if (routeToDelete) {
                  handleDeleteRoute(routeToDelete._id)
                }
              }}
              disabled={loading}
            >
              Eliminar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
} 