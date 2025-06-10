"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Truck, Save, Plus, Edit, Trash2, MapPin, DollarSign, Clock } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "@/hooks/use-toast"

export function TruckingConfig() {
  const [autoCalculateRates, setAutoCalculateRates] = useState(true)
  const [requireDriverSignature, setRequireDriverSignature] = useState(true)
  const [enableGPSTracking, setEnableGPSTracking] = useState(false)
  const [autoGenerateInvoice, setAutoGenerateInvoice] = useState(true)
  const [showNewRouteDialog, setShowNewRouteDialog] = useState(false)
  const [showNewContainerDialog, setShowNewContainerDialog] = useState(false)
  const [showNewDriverDialog, setShowNewDriverDialog] = useState(false)
  const [editingItem, setEditingItem] = useState<any>(null)
  const [editDialogType, setEditDialogType] = useState<"route" | "container" | "driver" | null>(null)

  const [routes, setRoutes] = useState([
    { id: "1", from: "MIT", to: "PSA", distance: "15 km", baseRate: 120, currency: "USD" },
    { id: "2", from: "PSA", to: "BLB", distance: "22 km", baseRate: 180, currency: "USD" },
    { id: "3", from: "CCT", to: "MIT", distance: "18 km", baseRate: 150, currency: "USD" },
    { id: "4", from: "BLB", to: "CCT", distance: "25 km", baseRate: 200, currency: "USD" },
  ])

  const [containerTypes, setContainerTypes] = useState([
    { id: "1", type: "20'", description: "Contenedor 20 pies", multiplier: 1.0, active: true },
    { id: "2", type: "40'", description: "Contenedor 40 pies", multiplier: 1.5, active: true },
    { id: "3", type: "45'", description: "Contenedor 45 pies", multiplier: 1.8, active: true },
    { id: "4", type: "20' HC", description: "Contenedor 20 pies High Cube", multiplier: 1.2, active: false },
  ])

  const [drivers, setDrivers] = useState([
    { id: "1", name: "Luis Matos", license: "LIC001", phone: "+507 6123-4567", status: "Activo", rating: 4.8 },
    { id: "2", name: "Carlos Rodríguez", license: "LIC002", phone: "+507 6234-5678", status: "Activo", rating: 4.6 },
    { id: "3", name: "Miguel Santos", license: "LIC003", phone: "+507 6345-6789", status: "Inactivo", rating: 4.2 },
  ])

  // Form states
  const [newRoute, setNewRoute] = useState({
    from: "",
    to: "",
    distance: "",
    baseRate: "",
    currency: "USD",
  })

  const [newContainer, setNewContainer] = useState({
    type: "",
    description: "",
    multiplier: "",
    active: true,
  })

  const [newDriver, setNewDriver] = useState({
    name: "",
    license: "",
    phone: "",
    status: "Activo",
    rating: "4.5",
  })

  const handleSaveConfig = () => {
    toast({
      title: "Configuración guardada",
      description: "Los cambios han sido guardados exitosamente.",
    })
  }

  const handleAddRoute = () => {
    if (newRoute.from && newRoute.to && newRoute.distance && newRoute.baseRate) {
      const id = (routes.length + 1).toString()
      setRoutes([...routes, { id, ...newRoute, baseRate: Number(newRoute.baseRate) }])
      setNewRoute({ from: "", to: "", distance: "", baseRate: "", currency: "USD" })
      setShowNewRouteDialog(false)
      toast({
        title: "Ruta agregada",
        description: `Ruta ${newRoute.from} - ${newRoute.to} agregada exitosamente.`,
      })
    }
  }

  const handleAddContainer = () => {
    if (newContainer.type && newContainer.description && newContainer.multiplier) {
      const id = (containerTypes.length + 1).toString()
      setContainerTypes([
        ...containerTypes,
        {
          id,
          ...newContainer,
          multiplier: Number(newContainer.multiplier),
          active: newContainer.active,
        },
      ])
      setNewContainer({ type: "", description: "", multiplier: "", active: true })
      setShowNewContainerDialog(false)
      toast({
        title: "Tipo de contenedor agregado",
        description: `Tipo de contenedor ${newContainer.type} agregado exitosamente.`,
      })
    }
  }

  const handleAddDriver = () => {
    if (newDriver.name && newDriver.license && newDriver.phone) {
      const id = (drivers.length + 1).toString()
      setDrivers([
        ...drivers,
        {
          id,
          ...newDriver,
          rating: Number(newDriver.rating),
        },
      ])
      setNewDriver({ name: "", license: "", phone: "", status: "Activo", rating: "4.5" })
      setShowNewDriverDialog(false)
      toast({
        title: "Driver agregado",
        description: `Driver ${newDriver.name} agregado exitosamente.`,
      })
    }
  }

  const handleEditItem = () => {
    if (editDialogType === "route" && editingItem) {
      setRoutes(
        routes.map((route) =>
          route.id === editingItem.id ? { ...editingItem, baseRate: Number(editingItem.baseRate) } : route,
        ),
      )
      toast({
        title: "Ruta actualizada",
        description: `Ruta ${editingItem.from} - ${editingItem.to} actualizada exitosamente.`,
      })
    } else if (editDialogType === "container" && editingItem) {
      setContainerTypes(
        containerTypes.map((container) =>
          container.id === editingItem.id ? { ...editingItem, multiplier: Number(editingItem.multiplier) } : container,
        ),
      )
      toast({
        title: "Tipo de contenedor actualizado",
        description: `Tipo de contenedor ${editingItem.type} actualizado exitosamente.`,
      })
    } else if (editDialogType === "driver" && editingItem) {
      setDrivers(
        drivers.map((driver) =>
          driver.id === editingItem.id ? { ...editingItem, rating: Number(editingItem.rating) } : driver,
        ),
      )
      toast({
        title: "Driver actualizado",
        description: `Driver ${editingItem.name} actualizado exitosamente.`,
      })
    }
    setEditingItem(null)
    setEditDialogType(null)
  }

  const handleDeleteItem = (type: "route" | "container" | "driver", id: string) => {
    if (type === "route") {
      setRoutes(routes.filter((route) => route.id !== id))
      toast({
        title: "Ruta eliminada",
        description: "La ruta ha sido eliminada exitosamente.",
      })
    } else if (type === "container") {
      setContainerTypes(containerTypes.filter((container) => container.id !== id))
      toast({
        title: "Tipo de contenedor eliminado",
        description: "El tipo de contenedor ha sido eliminado exitosamente.",
      })
    } else if (type === "driver") {
      setDrivers(drivers.filter((driver) => driver.id !== id))
      toast({
        title: "Driver eliminado",
        description: "El driver ha sido eliminado exitosamente.",
      })
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-blue-500 flex items-center justify-center">
          <Truck className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Configuración - Trucking</h1>
          <p className="text-muted-foreground">Configuración específica para servicios de transporte terrestre</p>
        </div>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 md:w-auto md:inline-grid">
          <TabsTrigger value="general">
            <Truck className="h-4 w-4 mr-2" />
            General
          </TabsTrigger>
          <TabsTrigger value="routes">
            <MapPin className="h-4 w-4 mr-2" />
            Rutas
          </TabsTrigger>
          <TabsTrigger value="rates">
            <DollarSign className="h-4 w-4 mr-2" />
            Tarifas
          </TabsTrigger>
          <TabsTrigger value="drivers">
            <Clock className="h-4 w-4 mr-2" />
            Drivers
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Configuración General de Trucking</CardTitle>
              <CardDescription>Ajustes generales para servicios de transporte terrestre</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="auto-calculate">Cálculo Automático de Tarifas</Label>
                    <p className="text-sm text-muted-foreground">
                      Calcular automáticamente las tarifas basadas en distancia y tipo de contenedor
                    </p>
                  </div>
                  <Switch id="auto-calculate" checked={autoCalculateRates} onCheckedChange={setAutoCalculateRates} />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="driver-signature">Firma del Driver Requerida</Label>
                    <p className="text-sm text-muted-foreground">
                      Requerir firma digital del driver al completar servicio
                    </p>
                  </div>
                  <Switch
                    id="driver-signature"
                    checked={requireDriverSignature}
                    onCheckedChange={setRequireDriverSignature}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="gps-tracking">Seguimiento GPS</Label>
                    <p className="text-sm text-muted-foreground">
                      Activar seguimiento GPS en tiempo real de los vehículos
                    </p>
                  </div>
                  <Switch id="gps-tracking" checked={enableGPSTracking} onCheckedChange={setEnableGPSTracking} />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="auto-invoice">Generación Automática de Facturas</Label>
                    <p className="text-sm text-muted-foreground">
                      Generar facturas automáticamente al completar servicios
                    </p>
                  </div>
                  <Switch id="auto-invoice" checked={autoGenerateInvoice} onCheckedChange={setAutoGenerateInvoice} />
                </div>
                <Separator />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="default-currency">Moneda Predeterminada</Label>
                    <Select defaultValue="USD">
                      <SelectTrigger id="default-currency">
                        <SelectValue placeholder="Seleccionar moneda" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD - Dólar Estadounidense</SelectItem>
                        <SelectItem value="PAB">PAB - Balboa Panameño</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="invoice-prefix">Prefijo de Factura</Label>
                    <Input id="invoice-prefix" defaultValue="TRK-" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="max-wait-time">Tiempo Máximo de Espera (horas)</Label>
                    <Input id="max-wait-time" type="number" defaultValue="2" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="overtime-rate">Tarifa por Hora Extra (%)</Label>
                    <Input id="overtime-rate" type="number" defaultValue="50" />
                  </div>
                </div>
              </div>
              <Button onClick={handleSaveConfig}>
                <Save className="mr-2 h-4 w-4" />
                Guardar Configuración
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="routes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Gestión de Rutas</CardTitle>
              <CardDescription>Configurar rutas disponibles y sus tarifas base</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-end">
                <Button onClick={() => setShowNewRouteDialog(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Nueva Ruta
                </Button>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Desde</TableHead>
                    <TableHead>Hacia</TableHead>
                    <TableHead>Distancia</TableHead>
                    <TableHead>Tarifa Base</TableHead>
                    <TableHead>Moneda</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {routes.map((route) => (
                    <TableRow key={route.id}>
                      <TableCell className="font-medium">{route.from}</TableCell>
                      <TableCell>{route.to}</TableCell>
                      <TableCell>{route.distance}</TableCell>
                      <TableCell>${route.baseRate}</TableCell>
                      <TableCell>{route.currency}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingItem(route)
                              setEditDialogType("route")
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteItem("route", route.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rates" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Tipos de Contenedor y Multiplicadores</CardTitle>
              <CardDescription>Configurar tipos de contenedor y sus multiplicadores de tarifa</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-end">
                <Button onClick={() => setShowNewContainerDialog(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Nuevo Tipo
                </Button>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Multiplicador</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {containerTypes.map((container) => (
                    <TableRow key={container.id}>
                      <TableCell className="font-medium">{container.type}</TableCell>
                      <TableCell>{container.description}</TableCell>
                      <TableCell>{container.multiplier}x</TableCell>
                      <TableCell>
                        <Badge variant={container.active ? "success" : "secondary"}>
                          {container.active ? "Activo" : "Inactivo"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingItem(container)
                              setEditDialogType("container")
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteItem("container", container.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Configuración de Tarifas Especiales</CardTitle>
              <CardDescription>Configurar tarifas especiales por cliente o tipo de servicio</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="weekend-surcharge">Recargo Fin de Semana (%)</Label>
                  <Input id="weekend-surcharge" type="number" defaultValue="25" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="night-surcharge">Recargo Nocturno (%)</Label>
                  <Input id="night-surcharge" type="number" defaultValue="30" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="holiday-surcharge">Recargo Feriados (%)</Label>
                  <Input id="holiday-surcharge" type="number" defaultValue="50" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="express-surcharge">Recargo Servicio Express (%)</Label>
                  <Input id="express-surcharge" type="number" defaultValue="40" />
                </div>
              </div>
              <Button onClick={handleSaveConfig}>
                <Save className="mr-2 h-4 w-4" />
                Guardar Tarifas
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="drivers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Gestión de Drivers</CardTitle>
              <CardDescription>Administrar drivers y sus datos</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-end">
                <Button onClick={() => setShowNewDriverDialog(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Nuevo Driver
                </Button>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Licencia</TableHead>
                    <TableHead>Teléfono</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {drivers.map((driver) => (
                    <TableRow key={driver.id}>
                      <TableCell className="font-medium">{driver.name}</TableCell>
                      <TableCell>{driver.license}</TableCell>
                      <TableCell>{driver.phone}</TableCell>
                      <TableCell>
                        <Badge variant={driver.status === "Activo" ? "success" : "secondary"}>{driver.status}</Badge>
                      </TableCell>
                      <TableCell>⭐ {driver.rating}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingItem(driver)
                              setEditDialogType("driver")
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteItem("driver", driver.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal para nueva ruta */}
      <Dialog open={showNewRouteDialog} onOpenChange={setShowNewRouteDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Agregar Nueva Ruta</DialogTitle>
            <DialogDescription>Complete los detalles para agregar una nueva ruta.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="from" className="text-right">
                Desde
              </Label>
              <Input
                id="from"
                value={newRoute.from}
                onChange={(e) => setNewRoute({ ...newRoute, from: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="to" className="text-right">
                Hacia
              </Label>
              <Input
                id="to"
                value={newRoute.to}
                onChange={(e) => setNewRoute({ ...newRoute, to: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="distance" className="text-right">
                Distancia
              </Label>
              <Input
                id="distance"
                value={newRoute.distance}
                onChange={(e) => setNewRoute({ ...newRoute, distance: e.target.value })}
                className="col-span-3"
                placeholder="ej. 15 km"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="baseRate" className="text-right">
                Tarifa Base
              </Label>
              <Input
                id="baseRate"
                type="number"
                value={newRoute.baseRate}
                onChange={(e) => setNewRoute({ ...newRoute, baseRate: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="currency" className="text-right">
                Moneda
              </Label>
              <Select
                value={newRoute.currency}
                onValueChange={(value) => setNewRoute({ ...newRoute, currency: value })}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Seleccionar moneda" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD - Dólar Estadounidense</SelectItem>
                  <SelectItem value="PAB">PAB - Balboa Panameño</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewRouteDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddRoute}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal para nuevo tipo de contenedor */}
      <Dialog open={showNewContainerDialog} onOpenChange={setShowNewContainerDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Agregar Nuevo Tipo de Contenedor</DialogTitle>
            <DialogDescription>Complete los detalles para agregar un nuevo tipo de contenedor.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="type" className="text-right">
                Tipo
              </Label>
              <Input
                id="type"
                value={newContainer.type}
                onChange={(e) => setNewContainer({ ...newContainer, type: e.target.value })}
                className="col-span-3"
                placeholder="ej. 20'"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">
                Descripción
              </Label>
              <Input
                id="description"
                value={newContainer.description}
                onChange={(e) => setNewContainer({ ...newContainer, description: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="multiplier" className="text-right">
                Multiplicador
              </Label>
              <Input
                id="multiplier"
                type="number"
                step="0.1"
                value={newContainer.multiplier}
                onChange={(e) => setNewContainer({ ...newContainer, multiplier: e.target.value })}
                className="col-span-3"
                placeholder="ej. 1.5"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="active" className="text-right">
                Activo
              </Label>
              <div className="flex items-center space-x-2 col-span-3">
                <Switch
                  id="active"
                  checked={newContainer.active}
                  onCheckedChange={(checked) => setNewContainer({ ...newContainer, active: checked })}
                />
                <Label htmlFor="active">{newContainer.active ? "Activo" : "Inactivo"}</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewContainerDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddContainer}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal para nuevo driver */}
      <Dialog open={showNewDriverDialog} onOpenChange={setShowNewDriverDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Agregar Nuevo Driver</DialogTitle>
            <DialogDescription>Complete los detalles para agregar un nuevo driver.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Nombre
              </Label>
              <Input
                id="name"
                value={newDriver.name}
                onChange={(e) => setNewDriver({ ...newDriver, name: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="license" className="text-right">
                Licencia
              </Label>
              <Input
                id="license"
                value={newDriver.license}
                onChange={(e) => setNewDriver({ ...newDriver, license: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="phone" className="text-right">
                Teléfono
              </Label>
              <Input
                id="phone"
                value={newDriver.phone}
                onChange={(e) => setNewDriver({ ...newDriver, phone: e.target.value })}
                className="col-span-3"
                placeholder="ej. +507 6123-4567"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="status" className="text-right">
                Estado
              </Label>
              <Select value={newDriver.status} onValueChange={(value) => setNewDriver({ ...newDriver, status: value })}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Seleccionar estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Activo">Activo</SelectItem>
                  <SelectItem value="Inactivo">Inactivo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="rating" className="text-right">
                Rating
              </Label>
              <Input
                id="rating"
                type="number"
                step="0.1"
                min="1"
                max="5"
                value={newDriver.rating}
                onChange={(e) => setNewDriver({ ...newDriver, rating: e.target.value })}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewDriverDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddDriver}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal para editar ruta */}
      <Dialog
        open={editDialogType === "route" && !!editingItem}
        onOpenChange={() => {
          if (editDialogType === "route") {
            setEditingItem(null)
            setEditDialogType(null)
          }
        }}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Editar Ruta</DialogTitle>
            <DialogDescription>Modifique los detalles de la ruta.</DialogDescription>
          </DialogHeader>
          {editingItem && editDialogType === "route" && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-from" className="text-right">
                  Desde
                </Label>
                <Input
                  id="edit-from"
                  value={editingItem.from}
                  onChange={(e) => setEditingItem({ ...editingItem, from: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-to" className="text-right">
                  Hacia
                </Label>
                <Input
                  id="edit-to"
                  value={editingItem.to}
                  onChange={(e) => setEditingItem({ ...editingItem, to: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-distance" className="text-right">
                  Distancia
                </Label>
                <Input
                  id="edit-distance"
                  value={editingItem.distance}
                  onChange={(e) => setEditingItem({ ...editingItem, distance: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-baseRate" className="text-right">
                  Tarifa Base
                </Label>
                <Input
                  id="edit-baseRate"
                  type="number"
                  value={editingItem.baseRate}
                  onChange={(e) => setEditingItem({ ...editingItem, baseRate: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-currency" className="text-right">
                  Moneda
                </Label>
                <Select
                  value={editingItem.currency}
                  onValueChange={(value) => setEditingItem({ ...editingItem, currency: value })}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Seleccionar moneda" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD - Dólar Estadounidense</SelectItem>
                    <SelectItem value="PAB">PAB - Balboa Panameño</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditingItem(null)
                setEditDialogType(null)
              }}
            >
              Cancelar
            </Button>
            <Button onClick={handleEditItem}>Guardar Cambios</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal para editar tipo de contenedor */}
      <Dialog
        open={editDialogType === "container" && !!editingItem}
        onOpenChange={() => {
          if (editDialogType === "container") {
            setEditingItem(null)
            setEditDialogType(null)
          }
        }}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Editar Tipo de Contenedor</DialogTitle>
            <DialogDescription>Modifique los detalles del tipo de contenedor.</DialogDescription>
          </DialogHeader>
          {editingItem && editDialogType === "container" && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-type" className="text-right">
                  Tipo
                </Label>
                <Input
                  id="edit-type"
                  value={editingItem.type}
                  onChange={(e) => setEditingItem({ ...editingItem, type: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-description" className="text-right">
                  Descripción
                </Label>
                <Input
                  id="edit-description"
                  value={editingItem.description}
                  onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-multiplier" className="text-right">
                  Multiplicador
                </Label>
                <Input
                  id="edit-multiplier"
                  type="number"
                  step="0.1"
                  value={editingItem.multiplier}
                  onChange={(e) => setEditingItem({ ...editingItem, multiplier: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-active" className="text-right">
                  Activo
                </Label>
                <div className="flex items-center space-x-2 col-span-3">
                  <Switch
                    id="edit-active"
                    checked={editingItem.active}
                    onCheckedChange={(checked) => setEditingItem({ ...editingItem, active: checked })}
                  />
                  <Label htmlFor="edit-active">{editingItem.active ? "Activo" : "Inactivo"}</Label>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditingItem(null)
                setEditDialogType(null)
              }}
            >
              Cancelar
            </Button>
            <Button onClick={handleEditItem}>Guardar Cambios</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal para editar driver */}
      <Dialog
        open={editDialogType === "driver" && !!editingItem}
        onOpenChange={() => {
          if (editDialogType === "driver") {
            setEditingItem(null)
            setEditDialogType(null)
          }
        }}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Editar Driver</DialogTitle>
            <DialogDescription>Modifique los detalles del driver.</DialogDescription>
          </DialogHeader>
          {editingItem && editDialogType === "driver" && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-name" className="text-right">
                  Nombre
                </Label>
                <Input
                  id="edit-name"
                  value={editingItem.name}
                  onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-license" className="text-right">
                  Licencia
                </Label>
                <Input
                  id="edit-license"
                  value={editingItem.license}
                  onChange={(e) => setEditingItem({ ...editingItem, license: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-phone" className="text-right">
                  Teléfono
                </Label>
                <Input
                  id="edit-phone"
                  value={editingItem.phone}
                  onChange={(e) => setEditingItem({ ...editingItem, phone: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-status" className="text-right">
                  Estado
                </Label>
                <Select
                  value={editingItem.status}
                  onValueChange={(value) => setEditingItem({ ...editingItem, status: value })}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Seleccionar estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Activo">Activo</SelectItem>
                    <SelectItem value="Inactivo">Inactivo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-rating" className="text-right">
                  Rating
                </Label>
                <Input
                  id="edit-rating"
                  type="number"
                  step="0.1"
                  min="1"
                  max="5"
                  value={editingItem.rating}
                  onChange={(e) => setEditingItem({ ...editingItem, rating: e.target.value })}
                  className="col-span-3"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditingItem(null)
                setEditDialogType(null)
              }}
            >
              Cancelar
            </Button>
            <Button onClick={handleEditItem}>Guardar Cambios</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
