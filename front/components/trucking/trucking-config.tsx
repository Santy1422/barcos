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
import { Separator } from "@/components/ui/separator"
import { Truck, Save, Plus, Edit, Trash2, MapPin, Clock, Settings } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "@/hooks/use-toast"
import { useAppDispatch, useAppSelector } from "@/lib/hooks"
import {
  addDriver,
  updateDriver,
  deleteDriver,
  addVehicle,
  updateVehicle,
  deleteVehicle,
  addRoute,
  updateRoute,
  deleteRoute,
  addCustomField,
  updateCustomField,
  deleteCustomField,
  selectTruckingDrivers,
  selectTruckingVehicles,
  selectTruckingRoutes,
  selectModuleCustomFields,
  type Driver,
  type Vehicle,
  type Route,
  type CustomFieldConfig,
  type CustomFieldType,
} from "@/lib/features/config/configSlice"

export function TruckingConfig() {
  const dispatch = useAppDispatch()
  const drivers = useAppSelector(selectTruckingDrivers)
  const vehicles = useAppSelector(selectTruckingVehicles)
  const routes = useAppSelector(selectTruckingRoutes)
  const truckingCustomFields = useAppSelector((state) => selectModuleCustomFields(state, "trucking"))

  // General settings (still local state for now, could be moved to Redux configSlice if needed)
  const [autoCalculateRates, setAutoCalculateRates] = useState(true)
  const [requireDriverSignature, setRequireDriverSignature] = useState(true)
  const [enableGPSTracking, setEnableGPSTracking] = useState(false)
  const [autoGenerateInvoice, setAutoGenerateInvoice] = useState(true)
  const [defaultCurrency, setDefaultCurrency] = useState("USD")
  const [invoicePrefix, setInvoicePrefix] = useState("TRK-")
  const [maxWaitTime, setMaxWaitTime] = useState(2)
  const [overtimeRate, setOvertimeRate] = useState(50)
  const [weekendSurcharge, setWeekendSurcharge] = useState(25)
  const [nightSurcharge, setNightSurcharge] = useState(30)
  const [holidaySurcharge, setHolidaySurcharge] = useState(50)
  const [expressSurcharge, setExpressSurcharge] = useState(40)

  // Dialog states
  const [showNewRouteDialog, setShowNewRouteDialog] = useState(false)
  const [showNewVehicleDialog, setShowNewVehicleDialog] = useState(false)
  const [showNewDriverDialog, setShowNewDriverDialog] = useState(false)
  const [showNewCustomFieldDialog, setShowNewCustomFieldDialog] = useState(false)

  const [editingItem, setEditingItem] = useState<any>(null)
  const [editDialogType, setEditDialogType] = useState<"route" | "vehicle" | "driver" | "customField" | null>(null)

  // Form states for new items
  const [newRoute, setNewRoute] = useState<Omit<Route, "id">>({
    name: "",
    origin: "",
    destination: "",
    distance: 0,
  })
  const [newVehicle, setNewVehicle] = useState<Omit<Vehicle, "id">>({
    plate: "",
    model: "",
    capacity: "",
  })
  const [newDriver, setNewDriver] = useState<Omit<Driver, "id">>({
    name: "",
    license: "",
    contact: "",
  })
  const [newCustomField, setNewCustomField] = useState<Omit<CustomFieldConfig, "id" | "module">>({
    label: "",
    type: "text",
    options: [],
  })

  const handleSaveGeneralConfig = () => {
    toast({
      title: "Configuración General Guardada",
      description: "Los ajustes generales han sido guardados exitosamente.",
    })
    // In a real app, you'd dispatch actions to save these to Redux or a backend
  }

  const handleAddRoute = () => {
    if (newRoute.name && newRoute.origin && newRoute.destination && newRoute.distance > 0) {
      dispatch(addRoute({ id: `route-${Date.now()}`, ...newRoute }))
      setNewRoute({ name: "", origin: "", destination: "", distance: 0 })
      setShowNewRouteDialog(false)
      toast({ title: "Ruta Agregada", description: `Ruta '${newRoute.name}' agregada exitosamente.` })
    } else {
      toast({ title: "Error", description: "Complete todos los campos de la ruta.", variant: "destructive" })
    }
  }

  const handleAddVehicle = () => {
    if (newVehicle.plate && newVehicle.model && newVehicle.capacity) {
      dispatch(addVehicle({ id: `vehicle-${Date.now()}`, ...newVehicle }))
      setNewVehicle({ plate: "", model: "", capacity: "" })
      setShowNewVehicleDialog(false)
      toast({ title: "Vehículo Agregado", description: `Vehículo '${newVehicle.plate}' agregado exitosamente.` })
    } else {
      toast({ title: "Error", description: "Complete todos los campos del vehículo.", variant: "destructive" })
    }
  }

  const handleAddDriver = () => {
    if (newDriver.name && newDriver.license && newDriver.contact) {
      dispatch(addDriver({ id: `driver-${Date.now()}`, ...newDriver }))
      setNewDriver({ name: "", license: "", contact: "" })
      setShowNewDriverDialog(false)
      toast({ title: "Driver Agregado", description: `Driver '${newDriver.name}' agregado exitosamente.` })
    } else {
      toast({ title: "Error", description: "Complete todos los campos del driver.", variant: "destructive" })
    }
  }

  const handleAddCustomField = () => {
    if (newCustomField.label && newCustomField.type) {
      dispatch(addCustomField({ id: `trucking-cf-${Date.now()}`, module: "trucking", ...newCustomField }))
      setNewCustomField({ label: "", type: "text", options: [] })
      setShowNewCustomFieldDialog(false)
      toast({ title: "Campo Personalizado Agregado", description: `Campo '${newCustomField.label}' agregado.` })
    } else {
      toast({
        title: "Error",
        description: "Complete todos los campos del campo personalizado.",
        variant: "destructive",
      })
    }
  }

  const handleEditItem = () => {
    if (!editingItem) return

    if (editDialogType === "route") {
      dispatch(updateRoute(editingItem))
      toast({ title: "Ruta Actualizada", description: `Ruta '${editingItem.name}' actualizada.` })
    } else if (editDialogType === "vehicle") {
      dispatch(updateVehicle(editingItem))
      toast({ title: "Vehículo Actualizado", description: `Vehículo '${editingItem.plate}' actualizado.` })
    } else if (editDialogType === "driver") {
      dispatch(updateDriver(editingItem))
      toast({ title: "Driver Actualizado", description: `Driver '${editingItem.name}' actualizado.` })
    } else if (editDialogType === "customField") {
      dispatch(updateCustomField(editingItem))
      toast({ title: "Campo Personalizado Actualizado", description: `Campo '${editingItem.label}' actualizado.` })
    }
    setEditingItem(null)
    setEditDialogType(null)
  }

  const handleDeleteItem = (type: "route" | "vehicle" | "driver" | "customField", id: string) => {
    if (type === "route") {
      dispatch(deleteRoute(id))
      toast({ title: "Ruta Eliminada", description: "La ruta ha sido eliminada." })
    } else if (type === "vehicle") {
      dispatch(deleteVehicle(id))
      toast({ title: "Vehículo Eliminado", description: "El vehículo ha sido eliminado." })
    } else if (type === "driver") {
      dispatch(deleteDriver(id))
      toast({ title: "Driver Eliminado", description: "El driver ha sido eliminado." })
    } else if (type === "customField") {
      dispatch(deleteCustomField(id))
      toast({ title: "Campo Personalizado Eliminado", description: "El campo personalizado ha sido eliminado." })
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
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 md:w-auto md:inline-grid">
          <TabsTrigger value="general">
            <Settings className="h-4 w-4 mr-2" />
            General
          </TabsTrigger>
          <TabsTrigger value="routes">
            <MapPin className="h-4 w-4 mr-2" />
            Rutas
          </TabsTrigger>
          <TabsTrigger value="vehicles">
            <Truck className="h-4 w-4 mr-2" />
            Vehículos
          </TabsTrigger>
          <TabsTrigger value="drivers">
            <Clock className="h-4 w-4 mr-2" />
            Drivers
          </TabsTrigger>
          <TabsTrigger value="custom-fields">
            <Plus className="h-4 w-4 mr-2" />
            Campos Personalizados
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
                    <Select value={defaultCurrency} onValueChange={setDefaultCurrency}>
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
                    <Input
                      id="invoice-prefix"
                      value={invoicePrefix}
                      onChange={(e) => setInvoicePrefix(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="max-wait-time">Tiempo Máximo de Espera (horas)</Label>
                    <Input
                      id="max-wait-time"
                      type="number"
                      value={maxWaitTime}
                      onChange={(e) => setMaxWaitTime(Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="overtime-rate">Tarifa por Hora Extra (%)</Label>
                    <Input
                      id="overtime-rate"
                      type="number"
                      value={overtimeRate}
                      onChange={(e) => setOvertimeRate(Number(e.target.value))}
                    />
                  </div>
                </div>
              </div>
              <Button onClick={handleSaveGeneralConfig}>
                <Save className="mr-2 h-4 w-4" />
                Guardar Configuración
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Configuración de Tarifas Especiales</CardTitle>
              <CardDescription>Configurar recargos por condiciones especiales.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="weekend-surcharge">Recargo Fin de Semana (%)</Label>
                  <Input
                    id="weekend-surcharge"
                    type="number"
                    value={weekendSurcharge}
                    onChange={(e) => setWeekendSurcharge(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="night-surcharge">Recargo Nocturno (%)</Label>
                  <Input
                    id="night-surcharge"
                    type="number"
                    value={nightSurcharge}
                    onChange={(e) => setNightSurcharge(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="holiday-surcharge">Recargo Feriados (%)</Label>
                  <Input
                    id="holiday-surcharge"
                    type="number"
                    value={holidaySurcharge}
                    onChange={(e) => setHolidaySurcharge(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="express-surcharge">Recargo Servicio Express (%)</Label>
                  <Input
                    id="express-surcharge"
                    type="number"
                    value={expressSurcharge}
                    onChange={(e) => setExpressSurcharge(Number(e.target.value))}
                  />
                </div>
              </div>
              <Button onClick={handleSaveGeneralConfig}>
                <Save className="mr-2 h-4 w-4" />
                Guardar Tarifas Especiales
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="routes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Gestión de Rutas</CardTitle>
              <CardDescription>Configurar rutas disponibles y sus distancias.</CardDescription>
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
                    <TableHead>Nombre</TableHead>
                    <TableHead>Origen</TableHead>
                    <TableHead>Destino</TableHead>
                    <TableHead>Distancia (km)</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {routes.map((route) => (
                    <TableRow key={route.id}>
                      <TableCell className="font-medium">{route.name}</TableCell>
                      <TableCell>{route.origin}</TableCell>
                      <TableCell>{route.destination}</TableCell>
                      <TableCell>{route.distance} km</TableCell>
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

        <TabsContent value="vehicles" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Gestión de Vehículos</CardTitle>
              <CardDescription>Administrar la flota de vehículos de transporte.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-end">
                <Button onClick={() => setShowNewVehicleDialog(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Nuevo Vehículo
                </Button>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Placa</TableHead>
                    <TableHead>Modelo</TableHead>
                    <TableHead>Capacidad</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vehicles.map((vehicle) => (
                    <TableRow key={vehicle.id}>
                      <TableCell className="font-medium">{vehicle.plate}</TableCell>
                      <TableCell>{vehicle.model}</TableCell>
                      <TableCell>{vehicle.capacity}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingItem(vehicle)
                              setEditDialogType("vehicle")
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteItem("vehicle", vehicle.id)}>
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

        <TabsContent value="drivers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Gestión de Drivers</CardTitle>
              <CardDescription>Administrar drivers y sus datos de contacto.</CardDescription>
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
                    <TableHead>Contacto</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {drivers.map((driver) => (
                    <TableRow key={driver.id}>
                      <TableCell className="font-medium">{driver.name}</TableCell>
                      <TableCell>{driver.license}</TableCell>
                      <TableCell>{driver.contact}</TableCell>
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

        <TabsContent value="custom-fields" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Campos Personalizados - Trucking</CardTitle>
              <CardDescription>Define campos adicionales para registros y facturas de Trucking.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-end">
                <Button onClick={() => setShowNewCustomFieldDialog(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Nuevo Campo
                </Button>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Etiqueta</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Opciones</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {truckingCustomFields.map((field) => (
                    <TableRow key={field.id}>
                      <TableCell className="font-medium">{field.label}</TableCell>
                      <TableCell>{field.type}</TableCell>
                      <TableCell>{field.options?.join(", ") || "-"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingItem(field)
                              setEditDialogType("customField")
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteItem("customField", field.id)}>
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

      {/* Modals for Add/Edit */}
      {/* New Route Dialog */}
      <Dialog open={showNewRouteDialog} onOpenChange={setShowNewRouteDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Agregar Nueva Ruta</DialogTitle>
            <DialogDescription>Complete los detalles para agregar una nueva ruta.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="new-route-name" className="text-right">
                Nombre
              </Label>
              <Input
                id="new-route-name"
                value={newRoute.name}
                onChange={(e) => setNewRoute({ ...newRoute, name: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="new-route-origin" className="text-right">
                Origen
              </Label>
              <Input
                id="new-route-origin"
                value={newRoute.origin}
                onChange={(e) => setNewRoute({ ...newRoute, origin: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="new-route-destination" className="text-right">
                Destino
              </Label>
              <Input
                id="new-route-destination"
                value={newRoute.destination}
                onChange={(e) => setNewRoute({ ...newRoute, destination: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="new-route-distance" className="text-right">
                Distancia (km)
              </Label>
              <Input
                id="new-route-distance"
                type="number"
                value={newRoute.distance}
                onChange={(e) => setNewRoute({ ...newRoute, distance: Number(e.target.value) })}
                className="col-span-3"
              />
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

      {/* New Vehicle Dialog */}
      <Dialog open={showNewVehicleDialog} onOpenChange={setShowNewVehicleDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Agregar Nuevo Vehículo</DialogTitle>
            <DialogDescription>Complete los detalles para agregar un nuevo vehículo.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="new-vehicle-plate" className="text-right">
                Placa
              </Label>
              <Input
                id="new-vehicle-plate"
                value={newVehicle.plate}
                onChange={(e) => setNewVehicle({ ...newVehicle, plate: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="new-vehicle-model" className="text-right">
                Modelo
              </Label>
              <Input
                id="new-vehicle-model"
                value={newVehicle.model}
                onChange={(e) => setNewVehicle({ ...newVehicle, model: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="new-vehicle-capacity" className="text-right">
                Capacidad
              </Label>
              <Input
                id="new-vehicle-capacity"
                value={newVehicle.capacity}
                onChange={(e) => setNewVehicle({ ...newVehicle, capacity: e.target.value })}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewVehicleDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddVehicle}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Driver Dialog */}
      <Dialog open={showNewDriverDialog} onOpenChange={setShowNewDriverDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Agregar Nuevo Driver</DialogTitle>
            <DialogDescription>Complete los detalles para agregar un nuevo driver.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="new-driver-name" className="text-right">
                Nombre
              </Label>
              <Input
                id="new-driver-name"
                value={newDriver.name}
                onChange={(e) => setNewDriver({ ...newDriver, name: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="new-driver-license" className="text-right">
                Licencia
              </Label>
              <Input
                id="new-driver-license"
                value={newDriver.license}
                onChange={(e) => setNewDriver({ ...newDriver, license: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="new-driver-contact" className="text-right">
                Contacto
              </Label>
              <Input
                id="new-driver-contact"
                value={newDriver.contact}
                onChange={(e) => setNewDriver({ ...newDriver, contact: e.target.value })}
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

      {/* New Custom Field Dialog */}
      <Dialog open={showNewCustomFieldDialog} onOpenChange={setShowNewCustomFieldDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Agregar Campo Personalizado</DialogTitle>
            <DialogDescription>Define un nuevo campo para el módulo de Trucking.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="new-cf-label" className="text-right">
                Etiqueta
              </Label>
              <Input
                id="new-cf-label"
                value={newCustomField.label}
                onChange={(e) => setNewCustomField({ ...newCustomField, label: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="new-cf-type" className="text-right">
                Tipo
              </Label>
              <Select
                value={newCustomField.type}
                onValueChange={(value: CustomFieldType) => setNewCustomField({ ...newCustomField, type: value })}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Seleccionar tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Texto</SelectItem>
                  <SelectItem value="number">Número</SelectItem>
                  <SelectItem value="date">Fecha</SelectItem>
                  <SelectItem value="select">Selección (Dropdown)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {newCustomField.type === "select" && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="new-cf-options" className="text-right">
                  Opciones (separadas por coma)
                </Label>
                <Input
                  id="new-cf-options"
                  value={newCustomField.options?.join(", ") || ""}
                  onChange={(e) =>
                    setNewCustomField({ ...newCustomField, options: e.target.value.split(",").map((s) => s.trim()) })
                  }
                  className="col-span-3"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewCustomFieldDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddCustomField}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Item Dialog (Generic) */}
      <Dialog
        open={!!editingItem && !!editDialogType}
        onOpenChange={() => {
          setEditingItem(null)
          setEditDialogType(null)
        }}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              Editar{" "}
              {editDialogType === "route"
                ? "Ruta"
                : editDialogType === "vehicle"
                  ? "Vehículo"
                  : editDialogType === "driver"
                    ? "Driver"
                    : "Campo Personalizado"}
            </DialogTitle>
            <DialogDescription>Modifique los detalles del elemento.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {editDialogType === "route" && editingItem && (
              <>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-route-name" className="text-right">
                    Nombre
                  </Label>
                  <Input
                    id="edit-route-name"
                    value={editingItem.name}
                    onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-route-origin" className="text-right">
                    Origen
                  </Label>
                  <Input
                    id="edit-route-origin"
                    value={editingItem.origin}
                    onChange={(e) => setEditingItem({ ...editingItem, origin: e.target.value })}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-route-destination" className="text-right">
                    Destino
                  </Label>
                  <Input
                    id="edit-route-destination"
                    value={editingItem.destination}
                    onChange={(e) => setEditingItem({ ...editingItem, destination: e.target.value })}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-route-distance" className="text-right">
                    Distancia (km)
                  </Label>
                  <Input
                    id="edit-route-distance"
                    type="number"
                    value={editingItem.distance}
                    onChange={(e) => setEditingItem({ ...editingItem, distance: Number(e.target.value) })}
                    className="col-span-3"
                  />
                </div>
              </>
            )}
            {editDialogType === "vehicle" && editingItem && (
              <>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-vehicle-plate" className="text-right">
                    Placa
                  </Label>
                  <Input
                    id="edit-vehicle-plate"
                    value={editingItem.plate}
                    onChange={(e) => setEditingItem({ ...editingItem, plate: e.target.value })}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-vehicle-model" className="text-right">
                    Modelo
                  </Label>
                  <Input
                    id="edit-vehicle-model"
                    value={editingItem.model}
                    onChange={(e) => setEditingItem({ ...editingItem, model: e.target.value })}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-vehicle-capacity" className="text-right">
                    Capacidad
                  </Label>
                  <Input
                    id="edit-vehicle-capacity"
                    value={editingItem.capacity}
                    onChange={(e) => setEditingItem({ ...editingItem, capacity: e.target.value })}
                    className="col-span-3"
                  />
                </div>
              </>
            )}
            {editDialogType === "driver" && editingItem && (
              <>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-driver-name" className="text-right">
                    Nombre
                  </Label>
                  <Input
                    id="edit-driver-name"
                    value={editingItem.name}
                    onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-driver-license" className="text-right">
                    Licencia
                  </Label>
                  <Input
                    id="edit-driver-license"
                    value={editingItem.license}
                    onChange={(e) => setEditingItem({ ...editingItem, license: e.target.value })}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-driver-contact" className="text-right">
                    Contacto
                  </Label>
                  <Input
                    id="edit-driver-contact"
                    value={editingItem.contact}
                    onChange={(e) => setEditingItem({ ...editingItem, contact: e.target.value })}
                    className="col-span-3"
                  />
                </div>
              </>
            )}
            {editDialogType === "customField" && editingItem && (
              <>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-cf-label" className="text-right">
                    Etiqueta
                  </Label>
                  <Input
                    id="edit-cf-label"
                    value={editingItem.label}
                    onChange={(e) => setEditingItem({ ...editingItem, label: e.target.value })}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-cf-type" className="text-right">
                    Tipo
                  </Label>
                  <Select
                    value={editingItem.type}
                    onValueChange={(value: CustomFieldType) => setEditingItem({ ...editingItem, type: value })}
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Seleccionar tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text">Texto</SelectItem>
                      <SelectItem value="number">Número</SelectItem>
                      <SelectItem value="date">Fecha</SelectItem>
                      <SelectItem value="select">Selección (Dropdown)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {editingItem.type === "select" && (
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-cf-options" className="text-right">
                      Opciones (separadas por coma)
                    </Label>
                    <Input
                      id="edit-cf-options"
                      value={editingItem.options?.join(", ") || ""}
                      onChange={(e) =>
                        setEditingItem({ ...editingItem, options: e.target.value.split(",").map((s) => s.trim()) })
                      }
                      className="col-span-3"
                    />
                  </div>
                )}
              </>
            )}
          </div>
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
