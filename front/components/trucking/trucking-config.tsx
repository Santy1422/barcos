"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Settings2, Plus, Edit, Trash2, Ship, MapPin, Wrench } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useAppDispatch, useAppSelector } from "@/lib/hooks"

import {
  selectAllNavieras,
  selectNavieraLoading,
  selectNavieraError,
  fetchNavieras,
  createNavieraAsync,
  updateNavieraAsync,
  deleteNavieraAsync,
  clearError as clearNavieraError,
  type Naviera,
} from "@/lib/features/naviera/navieraSlice"

import {
  fetchTruckingRoutes,
  createTruckingRoute,
  updateTruckingRoute,
  deleteTruckingRoute,
  selectTruckingRoutes,
  selectTruckingRoutesLoading,
  selectTruckingRoutesError,
  type TruckingRoute,
  type TruckingRouteInput,
} from "@/lib/features/truckingRoutes/truckingRoutesSlice"

import { ServicesManagement } from "@/components/services-management"

export function TruckingConfig() {
  const dispatch = useAppDispatch()
  const { toast } = useToast()

  // Navieras state
  const navieras = useAppSelector(selectAllNavieras)
  const navierasLoading = useAppSelector(selectNavieraLoading)
  const navierasError = useAppSelector(selectNavieraError)

  // Rutas Trucking (PTG)
  const routes = useAppSelector(selectTruckingRoutes)
  const routesLoading = useAppSelector(selectTruckingRoutesLoading)
  const routesError = useAppSelector(selectTruckingRoutesError)

  const [activeTab, setActiveTab] = useState<"navieras" | "routes" | "services">("navieras")

  // Form: Naviera
  const [showAddNavieraForm, setShowAddNavieraForm] = useState(false)
  const [navieraToDelete, setNavieraToDelete] = useState<Naviera | null>(null)
  const [newNaviera, setNewNaviera] = useState({ name: "", code: "" })

  // Form: Ruta
  const [showAddRouteForm, setShowAddRouteForm] = useState(false)
  const [routeToDelete, setRouteToDelete] = useState<TruckingRoute | null>(null)
  const [editingRoute, setEditingRoute] = useState<TruckingRoute | null>(null)
  const [newRoute, setNewRoute] = useState<TruckingRouteInput>({
    name: "",
    origin: "",
    destination: "",
    containerType: "normal",
    routeType: "single",
    price: 0,
  })

  // Load data
  useEffect(() => {
    dispatch(fetchNavieras())
    dispatch(fetchTruckingRoutes())
  }, [dispatch])

  // Errors
  useEffect(() => {
    if (navierasError) {
      toast({ title: "Error", description: navierasError, variant: "destructive" })
    }
  }, [navierasError, toast])

  useEffect(() => {
    if (routesError) {
      toast({ title: "Error", description: routesError, variant: "destructive" })
    }
  }, [routesError, toast])

  // Navieras handlers
  const handleAddNaviera = async () => {
    if (!newNaviera.name || !newNaviera.code) {
      toast({ title: "Error", description: "Completa todos los campos obligatorios", variant: "destructive" })
      return
    }
    try {
      await dispatch(createNavieraAsync({ name: newNaviera.name, code: newNaviera.code })).unwrap()
      setNewNaviera({ name: "", code: "" })
      setShowAddNavieraForm(false)
      toast({ title: "Naviera agregada", description: "La nueva naviera ha sido configurada correctamente" })
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Error al crear la naviera", variant: "destructive" })
    }
  }

  const handleDeleteNaviera = async (navieraId: string) => {
    try {
      await dispatch(deleteNavieraAsync(navieraId)).unwrap()
      toast({ title: "Naviera eliminada", description: "La naviera ha sido eliminada del sistema" })
      setNavieraToDelete(null)
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Error al eliminar la naviera", variant: "destructive" })
    }
  }

  const handleToggleNavieraStatus = async (naviera: Naviera) => {
    try {
      await dispatch(updateNavieraAsync({ id: naviera._id, navieraData: { isActive: !naviera.isActive } })).unwrap()
      toast({ title: "Estado actualizado", description: `La naviera ${naviera.name} ha sido ${!naviera.isActive ? "activada" : "desactivada"}` })
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Error al actualizar el estado de la naviera", variant: "destructive" })
    }
  }

  // Routes handlers
  const handleAddRoute = async () => {
    if (!newRoute.origin || !newRoute.destination || !newRoute.containerType || !newRoute.routeType || newRoute.price <= 0) {
      toast({ title: "Error", description: "Completa todos los campos obligatorios", variant: "destructive" })
      return
    }
    // Autogenerar nombre
    const name = `${newRoute.origin}/${newRoute.destination}`
    try {
      await dispatch(createTruckingRoute({ ...newRoute, name })).unwrap()
      setNewRoute({ name: "", origin: "", destination: "", containerType: "normal", routeType: "single", price: 0 })
      setShowAddRouteForm(false)
      toast({ title: "Ruta agregada", description: "La nueva ruta ha sido configurada correctamente" })
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Error al crear la ruta", variant: "destructive" })
    }
  }

  const handleEditRoute = async () => {
    if (!editingRoute) return
    const routeData: TruckingRouteInput = {
      name: `${newRoute.origin}/${newRoute.destination}`,
      origin: newRoute.origin,
      destination: newRoute.destination,
      containerType: newRoute.containerType,
      routeType: newRoute.routeType,
      price: newRoute.price,
    }
    if (!routeData.origin || !routeData.destination || !routeData.containerType || !routeData.routeType || routeData.price <= 0) {
      toast({ title: "Error", description: "Completa todos los campos obligatorios", variant: "destructive" })
      return
    }
    try {
      await dispatch(updateTruckingRoute({ id: editingRoute._id, routeData })).unwrap()
      setNewRoute({ name: "", origin: "", destination: "", containerType: "normal", routeType: "single", price: 0 })
      setEditingRoute(null)
      toast({ title: "Ruta actualizada", description: "La ruta ha sido actualizada correctamente" })
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Error al actualizar la ruta", variant: "destructive" })
    }
  }

  const handleDeleteRoute = async (routeId: string) => {
    try {
      await dispatch(deleteTruckingRoute(routeId)).unwrap()
      toast({ title: "Ruta eliminada", description: "La ruta ha sido eliminada del sistema" })
      setRouteToDelete(null)
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Error al eliminar la ruta", variant: "destructive" })
    }
  }

  const handleEditRouteClick = (route: TruckingRoute) => {
    setEditingRoute(route)
    setNewRoute({
      name: route.name,
      origin: route.origin,
      destination: route.destination,
      containerType: route.containerType,
      routeType: route.routeType,
      price: route.price,
    })
  }

  const handleCancelEditRoute = () => {
    setEditingRoute(null)
    setNewRoute({ name: "", origin: "", destination: "", containerType: "normal", routeType: "single", price: 0 })
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            Configuración PTG (Trucking)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-2">
            <Button
              variant={activeTab === "navieras" ? "default" : "outline"}
              className={activeTab === "navieras" ? "bg-blue-600 hover:bg-blue-700" : ""}
              onClick={() => setActiveTab("navieras")}
            >
              <Ship className="h-4 w-4 mr-2" />
              Navieras
            </Button>
            <Button
              variant={activeTab === "routes" ? "default" : "outline"}
              className={activeTab === "routes" ? "bg-blue-600 hover:bg-blue-700" : ""}
              onClick={() => setActiveTab("routes")}
            >
              <MapPin className="h-4 w-4 mr-2" />
              Rutas PTG
            </Button>
            <Button
              variant={activeTab === "services" ? "default" : "outline"}
              className={activeTab === "services" ? "bg-blue-600 hover:bg-blue-700" : ""}
              onClick={() => setActiveTab("services")}
            >
              <Wrench className="h-4 w-4 mr-2" />
              Servicios PTG
            </Button>
          </div>
        </CardContent>
      </Card>

      {activeTab === "navieras" && (
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
                        onChange={(e) => setNewNaviera({ ...newNaviera, name: e.target.value })}
                        placeholder="MSC Mediterranean Shipping Company"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="naviera-code">Código *</Label>
                      <Input
                        id="naviera-code"
                        value={newNaviera.code}
                        onChange={(e) => setNewNaviera({ ...newNaviera, code: e.target.value })}
                        placeholder="MSC"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleAddNaviera} disabled={navierasLoading}>
                      <Plus className="h-4 w-4 mr-2" />
                      {navierasLoading ? "Agregando..." : "Agregar Naviera"}
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
                  {navierasLoading && navieras.length === 0 ? (
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
                            <Button size="sm" variant="outline" onClick={() => handleToggleNavieraStatus(naviera)} disabled={navierasLoading}>
                              {naviera.isActive ? "Desactivar" : "Activar"}
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setNavieraToDelete(naviera)} disabled={navierasLoading}>
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

      {activeTab === "routes" && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Gestión de Rutas PTG</CardTitle>
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
                  <CardTitle className="text-lg">{editingRoute ? "Editar Ruta" : "Nueva Ruta"}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Nombre de la Ruta *</Label>
                      <Input value={newRoute.origin && newRoute.destination ? `${newRoute.origin}/${newRoute.destination}` : ""} placeholder="Se genera automáticamente" disabled className="bg-gray-50" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="route-origin">Origen *</Label>
                      <Input id="route-origin" value={newRoute.origin} onChange={(e) => setNewRoute({ ...newRoute, origin: e.target.value.toUpperCase() })} placeholder="PTY" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="route-destination">Destino *</Label>
                      <Input id="route-destination" value={newRoute.destination} onChange={(e) => setNewRoute({ ...newRoute, destination: e.target.value.toUpperCase() })} placeholder="COL" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="route-container-type">Tipo de Contenedor *</Label>
                      <Select value={newRoute.containerType} onValueChange={(value) => setNewRoute({ ...newRoute, containerType: value as "normal" | "refrigerated" })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="normal">Normal</SelectItem>
                          <SelectItem value="refrigerated">Refrigerado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="route-route-type">Tipo de Ruta *</Label>
                      <Select value={newRoute.routeType} onValueChange={(value) => setNewRoute({ ...newRoute, routeType: value as "single" | "RT" })}>
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
                      <Input id="route-price" type="number" value={newRoute.price} onChange={(e) => setNewRoute({ ...newRoute, price: parseFloat(e.target.value) || 0 })} placeholder="250.00" min="0" step="0.01" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={editingRoute ? handleEditRoute : handleAddRoute} disabled={routesLoading}>
                      <Plus className="h-4 w-4 mr-2" />
                      {routesLoading ? "Guardando..." : editingRoute ? "Actualizar Ruta" : "Agregar Ruta"}
                    </Button>
                    <Button variant="outline" onClick={editingRoute ? handleCancelEditRoute : () => setShowAddRouteForm(false)}>
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
                        <TableCell>{route.origin}</TableCell>
                        <TableCell>{route.destination}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{route.containerType === "refrigerated" ? "Refrigerado" : "Normal"}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={route.routeType === "RT" ? "default" : "secondary"}>{route.routeType === "RT" ? "Round Trip" : "Single"}</Badge>
                        </TableCell>
                        <TableCell>${route.price.toFixed(2)}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => handleEditRouteClick(route)}>
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setRouteToDelete(route)}>
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

      {activeTab === "services" && (
        <ServicesManagement module="trucking" title="Gestión de Servicios PTG" />
      )}

      {/* Dialogs */}
      {/* Delete Naviera */}
      <DialogLike open={!!navieraToDelete} onOpenChange={() => setNavieraToDelete(null)}>
        <DialogCard>
          <CardHeader>
            <CardTitle>Confirmar eliminación</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="py-2">
              <p>¿Estás seguro de que quieres eliminar la naviera?</p>
              {navieraToDelete && (
                <p className="font-medium mt-2">{navieraToDelete.name} ({navieraToDelete.code})</p>
              )}
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setNavieraToDelete(null)}>Cancelar</Button>
              <Button variant="destructive" onClick={() => navieraToDelete && handleDeleteNaviera(navieraToDelete._id)} disabled={navierasLoading}>Eliminar</Button>
            </div>
          </CardContent>
        </DialogCard>
      </DialogLike>

      {/* Delete Route */}
      <DialogLike open={!!routeToDelete} onOpenChange={() => setRouteToDelete(null)}>
        <DialogCard>
          <CardHeader>
            <CardTitle>Confirmar eliminación</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="py-2">
              <p>¿Estás seguro de que quieres eliminar la ruta?</p>
              {routeToDelete && (
                <p className="font-medium mt-2">{routeToDelete.name} ({routeToDelete.origin} → {routeToDelete.destination})</p>
              )}
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setRouteToDelete(null)}>Cancelar</Button>
              <Button variant="destructive" onClick={() => routeToDelete && handleDeleteRoute(routeToDelete._id)} disabled={routesLoading}>Eliminar</Button>
            </div>
          </CardContent>
        </DialogCard>
      </DialogLike>
    </div>
  )
}

// Lightweight Dialog wrappers using Card primitives to avoid importing full Dialog here
function DialogLike({ open, onOpenChange, children }: { open: boolean; onOpenChange: (open: boolean) => void; children: React.ReactNode }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => onOpenChange(false)}>
      <div className="mx-4 w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  )
}

function DialogCard({ children }: { children: React.ReactNode }) {
  return (
    <Card className="shadow-2xl">
      {children}
    </Card>
  )
}


