"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Settings2, Plus, Edit, Trash2, Ship, Anchor, Wrench, MapPin } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useAppSelector, useAppDispatch } from "@/lib/hooks"
import { 
  selectAllNavieras, 
  selectNavieraLoading,
  selectNavieraError,
  fetchNavieras,
  createNavieraAsync,
  updateNavieraAsync,
  deleteNavieraAsync,
  clearError,
  type Naviera
} from "@/lib/features/naviera/navieraSlice"
import {
  fetchPTYSSRoutes,
  createPTYSSRoute,
  updatePTYSSRoute,
  deletePTYSSRoute,
  selectPTYSSRoutes,
  selectPTYSSRoutesLoading,
  selectPTYSSRoutesError,
  type PTYSSRoute,
  type PTYSSRouteInput,
} from "@/lib/features/ptyssRoutes/ptyssRoutesSlice"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { ServicesManagement } from '@/components/services-management'
import { LocalServicesManagement } from '@/components/local-services-management'
import { PTYSSLocalRoutes } from './ptyss-local-routes'

export function PTYSSConfig() {
  const dispatch = useAppDispatch()
  const { toast } = useToast()
  
  const navieras = useAppSelector(selectAllNavieras)
  const loading = useAppSelector(selectNavieraLoading)
  const error = useAppSelector(selectNavieraError)
  
  // PTYSS Routes state
  const routes = useAppSelector(selectPTYSSRoutes)
  const routesLoading = useAppSelector(selectPTYSSRoutesLoading)
  const routesError = useAppSelector(selectPTYSSRoutesError)
  
  const [showAddNavieraForm, setShowAddNavieraForm] = useState(false)
  const [navieraToDelete, setNavieraToDelete] = useState<Naviera | null>(null)
  const [activeTab, setActiveTab] = useState<'navieras' | 'routes' | 'localRoutes' | 'services' | 'localServices'>('navieras')

  // PTYSS Routes form state
  const [showAddRouteForm, setShowAddRouteForm] = useState(false)
  const [routeToDelete, setRouteToDelete] = useState<PTYSSRoute | null>(null)
  const [editingRoute, setEditingRoute] = useState<PTYSSRoute | null>(null)
  const [newRoute, setNewRoute] = useState<PTYSSRouteInput>({
    from: "",
    to: "",
    containerType: "",
    routeType: "single",
    price: 0
  })

  // Cargar navieras al montar el componente
  useEffect(() => {
    dispatch(fetchNavieras())
  }, [dispatch])

  // Cargar rutas al montar el componente
  useEffect(() => {
    dispatch(fetchPTYSSRoutes())
  }, [dispatch])

  // Limpiar errores cuando cambie el tab
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

  // Mostrar error de rutas si existe
  useEffect(() => {
    if (routesError) {
      toast({
        title: "Error",
        description: routesError,
        variant: "destructive",
      })
    }
  }, [routesError, toast])

  const [newNaviera, setNewNaviera] = useState({
    name: "",
    code: ""
  })

  const handleAddNaviera = async () => {
    if (!newNaviera.name || !newNaviera.code) {
      toast({
        title: "Error",
        description: "Completa todos los campos obligatorios",
        variant: "destructive"
      })
      return
    }

    try {
      await dispatch(createNavieraAsync({
        name: newNaviera.name,
        code: newNaviera.code
      })).unwrap()
      
      setNewNaviera({
        name: "",
        code: ""
      })
      setShowAddNavieraForm(false)

      toast({
        title: "Naviera agregada",
        description: "La nueva naviera ha sido configurada correctamente",
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Error al crear la naviera",
        variant: "destructive"
      })
    }
  }

  const handleDeleteNaviera = async (navieraId: string) => {
    try {
      await dispatch(deleteNavieraAsync(navieraId)).unwrap()
      toast({
        title: "Naviera eliminada",
        description: "La naviera ha sido eliminada del sistema",
      })
      setNavieraToDelete(null)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Error al eliminar la naviera",
        variant: "destructive"
      })
    }
  }

  const handleToggleNavieraStatus = async (naviera: Naviera) => {
    try {
      await dispatch(updateNavieraAsync({
        id: naviera._id,
        navieraData: { isActive: !naviera.isActive }
      })).unwrap()
      
      toast({
        title: "Estado actualizado",
        description: `La naviera ${naviera.name} ha sido ${!naviera.isActive ? 'activada' : 'desactivada'}`,
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Error al actualizar el estado de la naviera",
        variant: "destructive"
      })
    }
  }

  // PTYSS Routes handlers
  const handleAddRoute = async () => {
    if (!newRoute.from || !newRoute.to || !newRoute.containerType || !newRoute.routeType || newRoute.price <= 0) {
      toast({
        title: "Error",
        description: "Completa todos los campos obligatorios",
        variant: "destructive"
      })
      return
    }

    try {
      await dispatch(createPTYSSRoute(newRoute)).unwrap()
      
      setNewRoute({
        from: "",
        to: "",
        containerType: "",
        routeType: "single",
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
    if (!editingRoute || !newRoute.from || !newRoute.to || !newRoute.containerType || !newRoute.routeType || newRoute.price <= 0) {
      toast({
        title: "Error",
        description: "Completa todos los campos obligatorios",
        variant: "destructive"
      })
      return
    }

    try {
      await dispatch(updatePTYSSRoute({ id: editingRoute._id, routeData: newRoute })).unwrap()
      
      setNewRoute({
        from: "",
        to: "",
        containerType: "",
        routeType: "single",
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
      await dispatch(deletePTYSSRoute(routeId)).unwrap()
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

  const handleEditRouteClick = (route: PTYSSRoute) => {
    setEditingRoute(route)
    setNewRoute({
      from: route.from,
      to: route.to,
      containerType: route.containerType,
      routeType: route.routeType,
      price: route.price
    })
  }

  const handleCancelEdit = () => {
    setEditingRoute(null)
    setNewRoute({
      from: "",
      to: "",
      containerType: "",
      routeType: "single",
      price: 0
    })
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            Configuración PTYSS
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-2">
            <Button
              variant={activeTab === 'navieras' ? "default" : "outline"}
              className={activeTab === 'navieras' ? "bg-blue-600 hover:bg-blue-700" : ""}
              onClick={() => setActiveTab('navieras')}
            >
              <Ship className="h-4 w-4 mr-2" />
              Navieras
            </Button>
            <Button
              variant={activeTab === 'routes' ? "default" : "outline"}
              className={activeTab === 'routes' ? "bg-blue-600 hover:bg-blue-700" : ""}
              onClick={() => setActiveTab('routes')}
            >
              <MapPin className="h-4 w-4 mr-2" />
              Rutas Trasiego
            </Button>
            <Button
              variant={activeTab === 'localRoutes' ? "default" : "outline"}
              className={activeTab === 'localRoutes' ? "bg-blue-600 hover:bg-blue-700" : ""}
              onClick={() => setActiveTab('localRoutes')}
            >
              <MapPin className="h-4 w-4 mr-2" />
              Rutas Local
            </Button>
            <Button
              variant={activeTab === 'services' ? "default" : "outline"}
              className={activeTab === 'services' ? "bg-blue-600 hover:bg-blue-700" : ""}
              onClick={() => setActiveTab('services')}
            >
              <Wrench className="h-4 w-4 mr-2" />
              Servicios Adicionales
            </Button>
            <Button
              variant={activeTab === 'localServices' ? "default" : "outline"}
              className={activeTab === 'localServices' ? "bg-blue-600 hover:bg-blue-700" : ""}
              onClick={() => setActiveTab('localServices')}
            >
              <Wrench className="h-4 w-4 mr-2" />
              Servicios Locales
            </Button>
          </div>
        </CardContent>
      </Card>

      {activeTab === 'navieras' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Gestión de Navieras</CardTitle>
              <Button onClick={() => setShowAddNavieraForm(!showAddNavieraForm)}>
                <Plus className="h-4 w-4 mr-2" />
                Agregar Naviera
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {showAddNavieraForm && (
              <Card className="border-dashed">
                <CardHeader>
                  <CardTitle className="text-lg">Nueva Naviera</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="naviera-name">Nombre de la Naviera *</Label>
                      <Input
                        id="naviera-name"
                        value={newNaviera.name}
                        onChange={(e) => setNewNaviera({...newNaviera, name: e.target.value})}
                        placeholder="MSC Mediterranean Shipping Company"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="naviera-code">Código *</Label>
                      <Input
                        id="naviera-code"
                        value={newNaviera.code}
                        onChange={(e) => setNewNaviera({...newNaviera, code: e.target.value})}
                        placeholder="MSC"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleAddNaviera} disabled={loading}>
                      <Plus className="h-4 w-4 mr-2" />
                      {loading ? "Agregando..." : "Agregar Naviera"}
                    </Button>
                    <Button variant="outline" onClick={() => setShowAddNavieraForm(false)}>
                      Cancelar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading && navieras.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8">
                        <div className="flex items-center justify-center space-x-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                          <span>Cargando navieras...</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : navieras.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        No hay navieras registradas
                      </TableCell>
                    </TableRow>
                  ) : (
                    navieras.map((naviera) => (
                      <TableRow key={naviera._id}>
                        <TableCell className="font-medium">{naviera.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{naviera.code}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={naviera.isActive ? "default" : "secondary"}>
                            {naviera.isActive ? "Activa" : "Inactiva"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleToggleNavieraStatus(naviera)}
                              disabled={loading}
                            >
                              {naviera.isActive ? "Desactivar" : "Activar"}
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => setNavieraToDelete(naviera)}
                              disabled={loading}
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
          </CardContent>
        </Card>
      )}

      {activeTab === 'routes' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Gestión de Rutas Trasiego PTYSS</CardTitle>
              <Button onClick={() => setShowAddRouteForm(!showAddRouteForm)}>
                <Plus className="h-4 w-4 mr-2" />
                Agregar Ruta
              </Button>
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
                      <Label htmlFor="route-name">Nombre de la Ruta *</Label>
                      <Input
                        id="route-name"
                        value={newRoute.from && newRoute.to ? `${newRoute.from}/${newRoute.to}` : ""}
                        placeholder="Se genera automáticamente"
                        disabled
                        className="bg-gray-50"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="route-from">Origen *</Label>
                      <Input
                        id="route-from"
                        value={newRoute.from}
                        onChange={(e) => setNewRoute({...newRoute, from: e.target.value})}
                        placeholder="Balboa"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="route-to">Destino *</Label>
                      <Input
                        id="route-to"
                        value={newRoute.to}
                        onChange={(e) => setNewRoute({...newRoute, to: e.target.value})}
                        placeholder="Cristóbal"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="route-container-type">Tipo de Contenedor *</Label>
                      <Select value={newRoute.containerType} onValueChange={(value) => setNewRoute({...newRoute, containerType: value})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="DV">DV - Dry Van</SelectItem>
                          <SelectItem value="HC">HC - High Cube</SelectItem>
                          <SelectItem value="RE">RE - Reefer</SelectItem>
                          <SelectItem value="TK">TK - Tank</SelectItem>
                          <SelectItem value="FL">FL - Flat Rack</SelectItem>
                          <SelectItem value="OS">OS - Open Side</SelectItem>
                          <SelectItem value="OT">OT - Open Top</SelectItem>
                          <SelectItem value="HR">HR - Hard Top</SelectItem>
                          <SelectItem value="PL">PL - Platform</SelectItem>
                          <SelectItem value="BV">BV - Bulk</SelectItem>
                          <SelectItem value="VE">VE - Ventilated</SelectItem>
                          <SelectItem value="PW">PW - Pallet Wide</SelectItem>
                          <SelectItem value="HT">HT - Hard Top</SelectItem>
                          <SelectItem value="IS">IS - Insulated</SelectItem>
                          <SelectItem value="XX">XX - Special</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="route-route-type">Tipo de Ruta *</Label>
                      <Select value={newRoute.routeType} onValueChange={(value) => setNewRoute({...newRoute, routeType: value as "single" | "RT"})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar tipo de ruta" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="single">Single - Viaje único</SelectItem>
                          <SelectItem value="RT">RT - Round Trip</SelectItem>
                        </SelectContent>
                      </Select>
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
                    <Button onClick={editingRoute ? handleEditRoute : handleAddRoute} disabled={routesLoading}>
                      <Plus className="h-4 w-4 mr-2" />
                      {routesLoading ? "Guardando..." : (editingRoute ? "Actualizar Ruta" : "Agregar Ruta")}
                    </Button>
                    <Button variant="outline" onClick={editingRoute ? handleCancelEdit : () => setShowAddRouteForm(false)}>
                      Cancelar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Origen</TableHead>
                    <TableHead>Destino</TableHead>
                    <TableHead>Tipo Contenedor</TableHead>
                    <TableHead>Tipo Ruta</TableHead>
                    <TableHead>Precio</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {routesLoading && routes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        <div className="flex items-center justify-center space-x-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                          <span>Cargando rutas...</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : routes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No hay rutas registradas
                      </TableCell>
                    </TableRow>
                  ) : (
                    routes.map((route) => (
                      <TableRow key={route._id}>
                        <TableCell className="font-medium">{route.name}</TableCell>
                        <TableCell>{route.from}</TableCell>
                        <TableCell>{route.to}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{route.containerType}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={route.routeType === "RT" ? "default" : "secondary"}>
                            {route.routeType === "RT" ? "Round Trip" : "Single"}
                          </Badge>
                        </TableCell>
                        <TableCell>${route.price.toFixed(2)}</TableCell>
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
          </CardContent>
        </Card>
      )}

      {activeTab === 'localRoutes' && (
        <PTYSSLocalRoutes />
      )}

      {activeTab === 'services' && (
        <ServicesManagement 
          module="ptyss" 
          title="Gestión de Servicios Adicionales PTYSS" 
        />
      )}

      {activeTab === 'localServices' && (
        <LocalServicesManagement 
          module="ptyss" 
          title="Gestión de Servicios Locales PTYSS" 
        />
      )}

      {/* Modal de confirmación para eliminar naviera */}
      <Dialog open={!!navieraToDelete} onOpenChange={() => setNavieraToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar eliminación</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>¿Estás seguro de que quieres eliminar la naviera?</p>
            {navieraToDelete && (
              <p className="font-medium mt-2">
                {navieraToDelete.name} ({navieraToDelete.code})
              </p>
            )}
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setNavieraToDelete(null)}>
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => {
                if (navieraToDelete) {
                  handleDeleteNaviera(navieraToDelete._id)
                }
              }}
              disabled={loading}
            >
              Eliminar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
                {routeToDelete.name} ({routeToDelete.from} → {routeToDelete.to})
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
              disabled={routesLoading}
            >
              Eliminar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
} 