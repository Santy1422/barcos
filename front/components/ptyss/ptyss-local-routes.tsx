"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Edit, Trash2, Users, MapPin, DollarSign } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useAppSelector, useAppDispatch } from "@/lib/hooks"
import { 
  selectPTYSSLocalRoutes,
  selectPTYSSLocalRoutesLoading,
  selectPTYSSLocalRoutesError,
  selectPTYSSLocalRoutesByClient,
  fetchPTYSSLocalRoutes,
  createPTYSSLocalRoute,
  updatePTYSSLocalRoute,
  deletePTYSSLocalRoute,
  clearError,
  type PTYSSLocalRoute,
  type PTYSSLocalRouteInput,
} from "@/lib/features/ptyssLocalRoutes/ptyssLocalRoutesSlice"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'


export function PTYSSLocalRoutes() {
  const dispatch = useAppDispatch()
  const { toast } = useToast()
  
  const routes = useAppSelector(selectPTYSSLocalRoutes) || []
  const loading = useAppSelector(selectPTYSSLocalRoutesLoading) || false
  const error = useAppSelector(selectPTYSSLocalRoutesError) || null
  const routesByClient = useAppSelector(selectPTYSSLocalRoutesByClient) || {}
  

  
  const [showAddRouteForm, setShowAddRouteForm] = useState(false)
  const [routeToDelete, setRouteToDelete] = useState<PTYSSLocalRoute | null>(null)
  const [editingRoute, setEditingRoute] = useState<PTYSSLocalRoute | null>(null)
  const [selectedClient, setSelectedClient] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [newRoute, setNewRoute] = useState<PTYSSLocalRouteInput>({
    clientName: '',
    from: "",
    to: "",
    price: 0
  })

  // Cargar rutas al montar el componente
  useEffect(() => {
    dispatch(fetchPTYSSLocalRoutes())
  }, [dispatch])

  // Inicializar cliente seleccionado cuando se cargan los datos
  useEffect(() => {
    if (routes.length > 0 && !selectedClient) {
      const firstClient = getUniqueClients()[0]
      setSelectedClient(firstClient)
      setNewRoute(prev => ({ ...prev, clientName: firstClient }))
    }
  }, [routes, selectedClient])

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

  // Obtener clientes únicos de las rutas existentes
  const getUniqueClients = () => {
    return [...new Set(routes.map(route => route.clientName))].sort()
  }

  // Obtener orígenes únicos de las rutas existentes
  const getUniqueOrigins = () => {
    return [...new Set(routes.map(route => route.from))].sort()
  }

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

  const handleAddRoute = async () => {
    if (!newRoute.clientName || !newRoute.from || !newRoute.to || newRoute.price <= 0) {
      toast({
        title: "Error",
        description: "Completa todos los campos obligatorios",
        variant: "destructive"
      })
      return
    }

    try {
      await dispatch(createPTYSSLocalRoute(newRoute)).unwrap()
      
      setNewRoute({
        clientName: selectedClient,
        from: "",
        to: "",
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
    if (!editingRoute || !newRoute.clientName || !newRoute.from || !newRoute.to || newRoute.price <= 0) {
      toast({
        title: "Error",
        description: "Completa todos los campos obligatorios",
        variant: "destructive"
      })
      return
    }

    try {
      await dispatch(updatePTYSSLocalRoute({ id: editingRoute._id, routeData: newRoute })).unwrap()
      
      setNewRoute({
        clientName: selectedClient,
        from: "",
        to: "",
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
      price: route.price
    })
    setSelectedClient(route.clientName)
  }

  const handleCancelEdit = () => {
    setEditingRoute(null)
    setNewRoute({
      clientName: selectedClient,
      from: "",
      to: "",
      price: 0
    })
  }

  const handleClientChange = (client: string) => {
    setSelectedClient(client)
    setNewRoute(prev => ({ ...prev, clientName: client }))
  }



  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Gestión de Rutas Local PTYSS
              </CardTitle>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Total de rutas:</span>
                <Badge variant="outline">{routes.length}</Badge>
                <span>•</span>
                <span>Clientes:</span>
                <Badge variant="outline">{getUniqueClients().length}</Badge>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative">
                <Input
                  placeholder="Buscar rutas por origen o destino..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-64"
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
                    <Label htmlFor="route-client">Cliente *</Label>
                    <Select value={newRoute.clientName} onValueChange={handleClientChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar cliente" />
                      </SelectTrigger>
                      <SelectContent>
                        {getUniqueClients().map(client => (
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
                    <Label htmlFor="route-price">Precio *</Label>
                    <Input
                      id="route-price"
                      type="number"
                      value={newRoute.price}
                      onChange={(e) => setNewRoute({...newRoute, price: parseFloat(e.target.value) || 0})}
                      placeholder="250.00"
                      min="0"
                      step="0.01"
                    />
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
                      price: 0
                    })
                  }}>
                    Cancelar
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <Tabs defaultValue={getUniqueClients()[0] || "cliente 1"} className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              {getUniqueClients().map(client => {
                const totalRoutes = routesByClient[client]?.length || 0
                const filteredRoutes = getFilteredRoutesByClient(client).length
                const showCount = searchTerm ? filteredRoutes : totalRoutes
                
                return (
                  <TabsTrigger key={client} value={client} className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    <span>{client}</span>
                    <Badge variant="secondary" className="ml-1">
                      {showCount}
                    </Badge>
                  </TabsTrigger>
                )
              })}
            </TabsList>
            
            {getUniqueClients().map(client => (
              <TabsContent key={client} value={client} className="space-y-4">
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
                              <div className="flex items-center gap-1">
                                <DollarSign className="h-3 w-3" />
                                {route.price.toFixed(2)}
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