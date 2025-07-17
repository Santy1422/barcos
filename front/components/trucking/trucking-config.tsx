"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Separator } from "@/components/ui/separator"
import { Truck, Save, Plus, Edit, Trash2, MapPin, Clock, Settings, Settings2 } from "lucide-react"
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
  addCustomField,
  updateCustomField,
  deleteCustomField,
  selectTruckingDrivers,
  selectTruckingVehicles,
  selectModuleCustomFields,
  type Driver,
  type Vehicle,
  type CustomFieldConfig,
  type CustomFieldType,
} from "@/lib/features/config/configSlice"
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
import { selectCurrentUser } from "@/lib/features/auth/authSlice"
import { ServicesManagement } from '@/components/services-management'

export function TruckingConfig() {
  const dispatch = useAppDispatch()
  const drivers = useAppSelector(selectTruckingDrivers)
  const vehicles = useAppSelector(selectTruckingVehicles)
  const routes = useAppSelector(selectTruckingRoutes)
  const routesLoading = useAppSelector(selectTruckingRoutesLoading)
  const routesError = useAppSelector(selectTruckingRoutesError)
  const truckingCustomFields = useAppSelector((state) => selectModuleCustomFields(state, "trucking"))
  const user = useAppSelector(selectCurrentUser)

  // Cargar rutas al montar el componente solo si el usuario está autenticado
  useEffect(() => {
    if (user) {
      dispatch(fetchTruckingRoutes())
    }
  }, [dispatch, user])

  // Mostrar error si existe
  useEffect(() => {
    if (routesError) {
      toast({
        title: "Error",
        description: routesError,
        variant: "destructive",
      })
    }
  }, [routesError])

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
  const [newRoute, setNewRoute] = useState<TruckingRouteInput>({
    name: "",
    origin: "",
    destination: "",
    containerType: "normal",
    routeType: "single",
    price: 0,
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

  // Autocomplete functions
  const handleOriginChange = (value: string) => {
    const upperValue = value.toUpperCase()
    
    // Update name automatically when origin or destination changes
    const newName = upperValue && newRoute.destination ? `${upperValue}/${newRoute.destination}` : ""
    
    setNewRoute({ 
      ...newRoute, 
      origin: upperValue,
      name: newName
    })
  }

  const handleDestinationChange = (value: string) => {
    const upperValue = value.toUpperCase()
    
    // Update name automatically when origin or destination changes
    const newName = newRoute.origin && upperValue ? `${newRoute.origin}/${upperValue}` : ""
    
    setNewRoute({ 
      ...newRoute, 
      destination: upperValue,
      name: newName
    })
  }

  const handleSaveGeneralConfig = () => {
    toast({
      title: "Configuración General Guardada",
      description: "Los ajustes generales han sido guardados exitosamente.",
    })
    // In a real app, you'd dispatch actions to save these to Redux or a backend
  }

  const handleAddRoute = () => {
    if (newRoute.name && newRoute.origin && newRoute.destination && newRoute.price > 0) {
      dispatch(createTruckingRoute(newRoute))
      setNewRoute({ name: "", origin: "", destination: "", containerType: "normal", routeType: "single", price: 0 })
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
      const routeData: TruckingRouteInput = {
        name: editingItem.name,
        origin: editingItem.origin,
        destination: editingItem.destination,
        containerType: editingItem.containerType,
        routeType: editingItem.routeType,
        price: editingItem.price,
      }
      dispatch(updateTruckingRoute({ id: editingItem._id, routeData }))
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

  // Edit autocomplete functions
  const handleEditOriginChange = (value: string) => {
    const upperValue = value.toUpperCase()
    
    // Update name automatically when origin or destination changes
    const newName = upperValue && editingItem.destination ? `${upperValue}/${editingItem.destination}` : ""
    
    setEditingItem({ 
      ...editingItem, 
      origin: upperValue,
      name: newName
    })
  }

  const handleEditDestinationChange = (value: string) => {
    const upperValue = value.toUpperCase()
    
    // Update name automatically when origin or destination changes
    const newName = editingItem.origin && upperValue ? `${editingItem.origin}/${upperValue}` : ""
    
    setEditingItem({ 
      ...editingItem, 
      destination: upperValue,
      name: newName
    })
  }

  const handleDeleteItem = (type: "route" | "vehicle" | "driver" | "customField", id: string) => {
    if (type === "route") {
      dispatch(deleteTruckingRoute(id))
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

  useEffect(() => {
    if (showNewRouteDialog) {
      setNewRoute({
        name: "",
        origin: "",
        destination: "",
        containerType: "normal",
        routeType: "single",
        price: 0,
      })
    }
  }, [showNewRouteDialog])

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
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-6 md:w-auto md:inline-grid">
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
          <TabsTrigger value="services">
            <Settings2 className="h-4 w-4 mr-2" />
            Servicios Adicionales
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
              {!user ? (
                <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground gap-4">
                  <MapPin className="w-12 h-12 mx-auto mb-2 opacity-40" />
                  <div className="text-lg font-semibold">Usuario no autenticado</div>
                  <div className="text-sm">Debe iniciar sesión para gestionar las rutas.</div>
                </div>
              ) : (
                <>
                  <div className="flex justify-end">
                    <Button onClick={() => setShowNewRouteDialog(true)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Nueva Ruta
                    </Button>
                  </div>
                  {routes.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground gap-4">
                      <MapPin className="w-12 h-12 mx-auto mb-2 opacity-40" />
                      <div className="text-lg font-semibold">
                        {routesLoading ? "Cargando rutas..." : "No hay rutas creadas"}
                      </div>
                      <div className="text-sm">
                        {routesLoading ? "Obteniendo datos del servidor..." : "Comienza creando tu primera ruta para verlas aquí."}
                      </div>
                      {!routesLoading && (
                        <Button variant="outline" onClick={() => setShowNewRouteDialog(true)}>
                          <Plus className="mr-2 h-4 w-4" /> Crear Ruta
                        </Button>
                      )}
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nombre</TableHead>
                          <TableHead>Origen</TableHead>
                          <TableHead>Destino</TableHead>
                          <TableHead>Tipo Contenedor</TableHead>
                          <TableHead>Tipo Ruta</TableHead>
                          <TableHead>Precio</TableHead>
                          <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {routes.map((route) => (
                          <TableRow key={route._id}>
                            <TableCell className="font-medium">{route.name}</TableCell>
                            <TableCell>{route.origin}</TableCell>
                            <TableCell>{route.destination}</TableCell>
                            <TableCell>{route.containerType === "refrigerated" ? "Refrigerado" : "Normal"}</TableCell>
                            <TableCell>{route.routeType === "RT" ? "RT" : "Simple"}</TableCell>
                            <TableCell>${route.price}</TableCell>
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
                                <Button variant="ghost" size="sm" onClick={() => handleDeleteItem("route", route._id)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </>
              )}
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

        <TabsContent value="services" className="space-y-4">
          <ServicesManagement 
            module="trucking" 
            title="Gestión de Servicios Adicionales Trucking" 
          />
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
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="new-route-name" className="text-right pt-3">
                Nombre
              </Label>
              <div className="col-span-3 flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <Input
                    id="new-route-origin-input"
                    value={newRoute.origin}
                    onChange={(e) => handleOriginChange(e.target.value)}
                    placeholder="PTY"
                    className="flex-1"
                  />
                  <span className="text-lg font-semibold text-muted-foreground">/</span>
                  <Input
                    id="new-route-destination-input"
                    value={newRoute.destination}
                    onChange={(e) => handleDestinationChange(e.target.value)}
                    placeholder="COL"
                    className="flex-1"
                  />
                </div>
                <div className="flex justify-between text-sm text-muted-foreground my-4 min-h-[2rem] border-t border-muted pt-3 mt-6">
                  <span>Origen: <span className="font-medium text-foreground">{newRoute.origin || <span className='opacity-50'>---</span>}</span></span>
                  <span>Destino: <span className="font-medium text-foreground">{newRoute.destination || <span className='opacity-50'>---</span>}</span></span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="new-route-container-type" className="text-right">
                Tipo de Contenedor
              </Label>
              <Select
                value={newRoute.containerType}
                onValueChange={(value: "normal" | "refrigerated") => setNewRoute({ ...newRoute, containerType: value })}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Seleccionar tipo de contenedor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="refrigerated">Refrigerado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="new-route-route-type" className="text-right">
                Tipo de Ruta
              </Label>
              <Select
                value={newRoute.routeType}
                onValueChange={(value: "single" | "RT") => setNewRoute({ ...newRoute, routeType: value })}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Seleccionar tipo de ruta" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">Simple</SelectItem>
                  <SelectItem value="RT">RT</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="new-route-price" className="text-right">
                Precio
              </Label>
              <div className="col-span-3 flex items-center gap-2">
                <Input
                  id="new-route-price"
                  type="text"
                  inputMode="decimal"
                  pattern="[0-9.]*"
                  value={newRoute.price === 0 ? '' : newRoute.price}
                  placeholder=""
                  onChange={(e) => {
                    let val = e.target.value.replace(/[^0-9.]/g, '');
                    // Only allow one decimal point
                    val = val.replace(/(\..*)\./g, '$1');
                    setNewRoute({ ...newRoute, price: val === '' ? 0 : Number(val) });
                  }}
                  className="col-span-3"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewRouteDialog(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleAddRoute} 
              disabled={
                routesLoading ||
                !newRoute.origin ||
                !newRoute.destination ||
                !newRoute.containerType ||
                !newRoute.routeType ||
                !newRoute.price ||
                newRoute.price <= 0
              }
            >
              {routesLoading ? "Guardando..." : "Guardar"}
            </Button>
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
                <div className="grid grid-cols-4 items-start gap-4">
                  <Label htmlFor="edit-route-name" className="text-right pt-3">
                    Nombre
                  </Label>
                  <div className="col-span-3 flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <Input
                        id="edit-route-origin-input"
                        value={editingItem.origin}
                        onChange={(e) => handleEditOriginChange(e.target.value)}
                        placeholder="PTY"
                        className="flex-1"
                      />
                      <span className="text-lg font-semibold text-muted-foreground">/</span>
                      <Input
                        id="edit-route-destination-input"
                        value={editingItem.destination}
                        onChange={(e) => handleEditDestinationChange(e.target.value)}
                        placeholder="COL"
                        className="flex-1"
                      />
                    </div>
                    <div className="flex justify-between text-sm text-muted-foreground my-4 min-h-[2rem] border-t border-muted pt-3 mt-6">
                      <span>Origen: <span className="font-medium text-foreground">{editingItem.origin || <span className='opacity-50'>---</span>}</span></span>
                      <span>Destino: <span className="font-medium text-foreground">{editingItem.destination || <span className='opacity-50'>---</span>}</span></span>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-route-container-type" className="text-right">
                    Tipo de Contenedor
                  </Label>
                  <Select
                    value={editingItem.containerType}
                    onValueChange={(value: "normal" | "refrigerated") => setEditingItem({ ...editingItem, containerType: value })}
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Seleccionar tipo de contenedor" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="refrigerated">Refrigerado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-route-route-type" className="text-right">
                    Tipo de Ruta
                  </Label>
                  <Select
                    value={editingItem.routeType}
                    onValueChange={(value: "single" | "RT") => setEditingItem({ ...editingItem, routeType: value })}
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Seleccionar tipo de ruta" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="single">Simple</SelectItem>
                      <SelectItem value="RT">RT</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-route-price" className="text-right">
                    Precio
                  </Label>
                  <div className="col-span-3 flex items-center gap-2">
                    <Input
                      id="edit-route-price"
                      type="text"
                      inputMode="decimal"
                      pattern="[0-9.]*"
                      value={editingItem.price === 0 ? '' : editingItem.price}
                      placeholder=""
                      onChange={(e) => {
                        let val = e.target.value.replace(/[^0-9.]/g, '');
                        // Only allow one decimal point
                        val = val.replace(/(\..*)\./g, '$1');
                        setEditingItem({ ...editingItem, price: val === '' ? 0 : Number(val) });
                      }}
                      className="flex-1"
                    />
                  </div>
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
            <Button 
              onClick={handleEditItem}
              disabled={routesLoading}
            >
              {routesLoading ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
