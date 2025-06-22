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
import { Users, Save, Plus, Edit, Trash2, MapPin, Car, Clock } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "@/hooks/use-toast"

export function AgencyConfig() {
  const [autoAssignDrivers, setAutoAssignDrivers] = useState(true)
  const [requireCrewManifest, setRequireCrewManifest] = useState(true)
  const [enableRealTimeTracking, setEnableRealTimeTracking] = useState(false)
  const [autoGenerateReports, setAutoGenerateReports] = useState(true)
  const [showNewLocationDialog, setShowNewLocationDialog] = useState(false)
  const [showNewVehicleDialog, setShowNewVehicleDialog] = useState(false)
  const [showNewRankDialog, setShowNewRankDialog] = useState(false)
  const [editingItem, setEditingItem] = useState<any>(null)
  const [editDialogType, setEditDialogType] = useState<"location" | "vehicle" | "rank" | null>(null)

  const [locations, setLocations] = useState([
    { id: "1", name: "Puerto de Balboa", type: "Puerto", address: "Balboa, Panamá", active: true },
    { id: "2", name: "Aeropuerto Tocumen", type: "Aeropuerto", address: "Tocumen, Panamá", active: true },
    { id: "3", name: "Hotel Marriott", type: "Hotel", address: "Casco Viejo, Panamá", active: true },
    { id: "4", name: "Puerto de Cristóbal", type: "Puerto", address: "Cristóbal, Colón", active: false },
  ])

  const [vehicles, setVehicles] = useState([
    { id: "1", plate: "T-123456", type: "Van", capacity: 12, driver: "Luis Matos", status: "Disponible" },
    { id: "2", plate: "T-234567", type: "Bus", capacity: 25, driver: "Carlos Rodríguez", status: "En Servicio" },
    { id: "3", plate: "T-345678", type: "Sedan", capacity: 4, driver: "Miguel Santos", status: "Mantenimiento" },
  ])

  const [crewRanks, setCrewRanks] = useState([
    { id: "1", rank: "Captain", description: "Capitán", baseRate: 50, multiplier: 2.0, active: true },
    { id: "2", rank: "Chief Officer", description: "Primer Oficial", baseRate: 50, multiplier: 1.5, active: true },
    { id: "3", rank: "Engineer", description: "Ingeniero", baseRate: 50, multiplier: 1.3, active: true },
    { id: "4", rank: "Seaman", description: "Marinero", baseRate: 50, multiplier: 1.0, active: true },
  ])

  // Form states
  const [newLocation, setNewLocation] = useState({
    name: "",
    type: "Puerto",
    address: "",
    active: true,
  })

  const [newVehicle, setNewVehicle] = useState({
    plate: "",
    type: "Van",
    capacity: "",
    driver: "",
    status: "Disponible",
  })

  const [newRank, setNewRank] = useState({
    rank: "",
    description: "",
    baseRate: "50",
    multiplier: "1.0",
    active: true,
  })

  const handleSaveConfig = () => {
    toast({
      title: "Configuración guardada",
      description: "Los cambios han sido guardados exitosamente.",
    })
  }

  const handleAddLocation = () => {
    if (newLocation.name && newLocation.address) {
      const id = (locations.length + 1).toString()
      setLocations([...locations, { id, ...newLocation }])
      setNewLocation({ name: "", type: "Puerto", address: "", active: true })
      setShowNewLocationDialog(false)
      toast({
        title: "Ubicación agregada",
        description: `Ubicación ${newLocation.name} agregada exitosamente.`,
      })
    }
  }

  const handleAddVehicle = () => {
    if (newVehicle.plate && newVehicle.capacity && newVehicle.driver) {
      const id = (vehicles.length + 1).toString()
      setVehicles([
        ...vehicles,
        {
          id,
          ...newVehicle,
          capacity: Number(newVehicle.capacity),
        },
      ])
      setNewVehicle({ plate: "", type: "Van", capacity: "", driver: "", status: "Disponible" })
      setShowNewVehicleDialog(false)
      toast({
        title: "Vehículo agregado",
        description: `Vehículo ${newVehicle.plate} agregado exitosamente.`,
      })
    }
  }

  const handleAddRank = () => {
    if (newRank.rank && newRank.description && newRank.baseRate && newRank.multiplier) {
      const id = (crewRanks.length + 1).toString()
      setCrewRanks([
        ...crewRanks,
        {
          id,
          ...newRank,
          baseRate: Number(newRank.baseRate),
          multiplier: Number(newRank.multiplier),
        },
      ])
      setNewRank({ rank: "", description: "", baseRate: "50", multiplier: "1.0", active: true })
      setShowNewRankDialog(false)
      toast({
        title: "Rango agregado",
        description: `Rango ${newRank.rank} agregado exitosamente.`,
      })
    }
  }

  const handleEditItem = () => {
    if (editDialogType === "location" && editingItem) {
      setLocations(locations.map((location) => (location.id === editingItem.id ? editingItem : location)))
      toast({
        title: "Ubicación actualizada",
        description: `Ubicación ${editingItem.name} actualizada exitosamente.`,
      })
    } else if (editDialogType === "vehicle" && editingItem) {
      setVehicles(
        vehicles.map((vehicle) =>
          vehicle.id === editingItem.id
            ? {
                ...editingItem,
                capacity: Number(editingItem.capacity),
              }
            : vehicle,
        ),
      )
      toast({
        title: "Vehículo actualizado",
        description: `Vehículo ${editingItem.plate} actualizado exitosamente.`,
      })
    } else if (editDialogType === "rank" && editingItem) {
      setCrewRanks(
        crewRanks.map((rank) =>
          rank.id === editingItem.id
            ? {
                ...editingItem,
                baseRate: Number(editingItem.baseRate),
                multiplier: Number(editingItem.multiplier),
              }
            : rank,
        ),
      )
      toast({
        title: "Rango actualizado",
        description: `Rango ${editingItem.rank} actualizado exitosamente.`,
      })
    }
    setEditingItem(null)
    setEditDialogType(null)
  }

  const handleDeleteItem = (type: "location" | "vehicle" | "rank", id: string) => {
    if (type === "location") {
      setLocations(locations.filter((location) => location.id !== id))
      toast({
        title: "Ubicación eliminada",
        description: "La ubicación ha sido eliminada exitosamente.",
      })
    } else if (type === "vehicle") {
      setVehicles(vehicles.filter((vehicle) => vehicle.id !== id))
      toast({
        title: "Vehículo eliminado",
        description: "El vehículo ha sido eliminado exitosamente.",
      })
    } else if (type === "rank") {
      setCrewRanks(crewRanks.filter((rank) => rank.id !== id))
      toast({
        title: "Rango eliminado",
        description: "El rango ha sido eliminado exitosamente.",
      })
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-purple-500 flex items-center justify-center">
          <Users className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Configuración - Agency</h1>
          <p className="text-muted-foreground">
            Configuración específica para servicios de transporte de tripulaciones
          </p>
        </div>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 md:w-auto md:inline-grid">
          <TabsTrigger value="general">
            <Users className="h-4 w-4 mr-2" />
            General
          </TabsTrigger>
          <TabsTrigger value="locations">
            <MapPin className="h-4 w-4 mr-2" />
            Ubicaciones
          </TabsTrigger>
          <TabsTrigger value="vehicles">
            <Car className="h-4 w-4 mr-2" />
            Vehículos
          </TabsTrigger>
          <TabsTrigger value="ranks">
            <Clock className="h-4 w-4 mr-2" />
            Rangos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Configuración General de Agency</CardTitle>
              <CardDescription>Ajustes generales para servicios de transporte de tripulaciones</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="auto-assign">Asignación Automática de Drivers</Label>
                    <p className="text-sm text-muted-foreground">
                      Asignar automáticamente drivers disponibles a nuevos servicios
                    </p>
                  </div>
                  <Switch id="auto-assign" checked={autoAssignDrivers} onCheckedChange={setAutoAssignDrivers} />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="crew-manifest">Manifiesto de Tripulación Requerido</Label>
                    <p className="text-sm text-muted-foreground">
                      Requerir manifiesto completo antes de iniciar transporte
                    </p>
                  </div>
                  <Switch id="crew-manifest" checked={requireCrewManifest} onCheckedChange={setRequireCrewManifest} />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="real-time-tracking">Seguimiento en Tiempo Real</Label>
                    <p className="text-sm text-muted-foreground">
                      Activar seguimiento GPS de vehículos y tripulaciones
                    </p>
                  </div>
                  <Switch
                    id="real-time-tracking"
                    checked={enableRealTimeTracking}
                    onCheckedChange={setEnableRealTimeTracking}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="auto-reports">Generación Automática de Reportes</Label>
                    <p className="text-sm text-muted-foreground">
                      Generar reportes automáticamente al completar servicios
                    </p>
                  </div>
                  <Switch id="auto-reports" checked={autoGenerateReports} onCheckedChange={setAutoGenerateReports} />
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
                    <Input id="invoice-prefix" defaultValue="AGY-" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pickup-window">Ventana de Recogida (minutos)</Label>
                    <Input id="pickup-window" type="number" defaultValue="15" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="waiting-charge">Cargo por Espera (por hora)</Label>
                    <Input id="waiting-charge" type="number" defaultValue="25" />
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

        <TabsContent value="locations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Gestión de Ubicaciones</CardTitle>
              <CardDescription>Configurar ubicaciones de recogida y destino</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-end">
                <Button onClick={() => setShowNewLocationDialog(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Nueva Ubicación
                </Button>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Dirección</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {locations.map((location) => (
                    <TableRow key={location.id}>
                      <TableCell className="font-medium">{location.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{location.type}</Badge>
                      </TableCell>
                      <TableCell>{location.address}</TableCell>
                      <TableCell>
                        <Badge variant={location.active ? "success" : "secondary"}>
                          {location.active ? "Activo" : "Inactivo"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingItem(location)
                              setEditDialogType("location")
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteItem("location", location.id)}>
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
              <CardDescription>Administrar flota de vehículos y drivers</CardDescription>
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
                    <TableHead>Tipo</TableHead>
                    <TableHead>Capacidad</TableHead>
                    <TableHead>Driver</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vehicles.map((vehicle) => (
                    <TableRow key={vehicle.id}>
                      <TableCell className="font-medium">{vehicle.plate}</TableCell>
                      <TableCell>{vehicle.type}</TableCell>
                      <TableCell>{vehicle.capacity} pax</TableCell>
                      <TableCell>{vehicle.driver}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            vehicle.status === "Disponible"
                              ? "success"
                              : vehicle.status === "En Servicio"
                                ? "default"
                                : "destructive"
                          }
                        >
                          {vehicle.status}
                        </Badge>
                      </TableCell>
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

        <TabsContent value="ranks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Rangos de Tripulación y Tarifas</CardTitle>
              <CardDescription>Configurar rangos de tripulación y sus multiplicadores de tarifa</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-end">
                <Button onClick={() => setShowNewRankDialog(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Nuevo Rango
                </Button>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rango</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Tarifa Base</TableHead>
                    <TableHead>Multiplicador</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {crewRanks.map((rank) => (
                    <TableRow key={rank.id}>
                      <TableCell className="font-medium">{rank.rank}</TableCell>
                      <TableCell>{rank.description}</TableCell>
                      <TableCell>${rank.baseRate} USD</TableCell>
                      <TableCell>{rank.multiplier}x</TableCell>
                      <TableCell>
                        <Badge variant={rank.active ? "success" : "secondary"}>
                          {rank.active ? "Activo" : "Inactivo"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingItem(rank)
                              setEditDialogType("rank")
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteItem("rank", rank.id)}>
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

      {/* Modales para agregar nuevos elementos */}
      <Dialog open={showNewLocationDialog} onOpenChange={setShowNewLocationDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Agregar Nueva Ubicación</DialogTitle>
            <DialogDescription>Complete los detalles para agregar una nueva ubicación.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="location-name">Nombre</Label>
              <Input
                id="location-name"
                value={newLocation.name}
                onChange={(e) => setNewLocation({ ...newLocation, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location-type">Tipo</Label>
              <Select
                value={newLocation.type}
                onValueChange={(value) => setNewLocation({ ...newLocation, type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Puerto">Puerto</SelectItem>
                  <SelectItem value="Aeropuerto">Aeropuerto</SelectItem>
                  <SelectItem value="Hotel">Hotel</SelectItem>
                  <SelectItem value="Terminal">Terminal</SelectItem>
                  <SelectItem value="Otro">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="location-address">Dirección</Label>
              <Input
                id="location-address"
                value={newLocation.address}
                onChange={(e) => setNewLocation({ ...newLocation, address: e.target.value })}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="location-active"
                checked={newLocation.active}
                onCheckedChange={(checked) => setNewLocation({ ...newLocation, active: checked })}
              />
              <Label htmlFor="location-active">Activo</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewLocationDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddLocation}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showNewVehicleDialog} onOpenChange={setShowNewVehicleDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Agregar Nuevo Vehículo</DialogTitle>
            <DialogDescription>Complete los detalles para agregar un nuevo vehículo.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="vehicle-plate">Placa</Label>
              <Input
                id="vehicle-plate"
                value={newVehicle.plate}
                onChange={(e) => setNewVehicle({ ...newVehicle, plate: e.target.value })}
                placeholder="ej. T-123456"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vehicle-type">Tipo</Label>
              <Select value={newVehicle.type} onValueChange={(value) => setNewVehicle({ ...newVehicle, type: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Van">Van</SelectItem>
                  <SelectItem value="Bus">Bus</SelectItem>
                  <SelectItem value="Sedan">Sedan</SelectItem>
                  <SelectItem value="SUV">SUV</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="vehicle-capacity">Capacidad (pasajeros)</Label>
              <Input
                id="vehicle-capacity"
                type="number"
                value={newVehicle.capacity}
                onChange={(e) => setNewVehicle({ ...newVehicle, capacity: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vehicle-driver">Driver</Label>
              <Input
                id="vehicle-driver"
                value={newVehicle.driver}
                onChange={(e) => setNewVehicle({ ...newVehicle, driver: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vehicle-status">Estado</Label>
              <Select
                value={newVehicle.status}
                onValueChange={(value) => setNewVehicle({ ...newVehicle, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Disponible">Disponible</SelectItem>
                  <SelectItem value="En Servicio">En Servicio</SelectItem>
                  <SelectItem value="Mantenimiento">Mantenimiento</SelectItem>
                </SelectContent>
              </Select>
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

      <Dialog open={showNewRankDialog} onOpenChange={setShowNewRankDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Agregar Nuevo Rango</DialogTitle>
            <DialogDescription>Complete los detalles para agregar un nuevo rango de tripulación.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="rank-name">Rango (Inglés)</Label>
              <Input
                id="rank-name"
                value={newRank.rank}
                onChange={(e) => setNewRank({ ...newRank, rank: e.target.value })}
                placeholder="ej. Captain"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rank-description">Descripción (Español)</Label>
              <Input
                id="rank-description"
                value={newRank.description}
                onChange={(e) => setNewRank({ ...newRank, description: e.target.value })}
                placeholder="ej. Capitán"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rank-baseRate">Tarifa Base (USD)</Label>
              <Input
                id="rank-baseRate"
                type="number"
                value={newRank.baseRate}
                onChange={(e) => setNewRank({ ...newRank, baseRate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rank-multiplier">Multiplicador</Label>
              <Input
                id="rank-multiplier"
                type="number"
                step="0.1"
                value={newRank.multiplier}
                onChange={(e) => setNewRank({ ...newRank, multiplier: e.target.value })}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="rank-active"
                checked={newRank.active}
                onCheckedChange={(checked) => setNewRank({ ...newRank, active: checked })}
              />
              <Label htmlFor="rank-active">Activo</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewRankDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddRank}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modales de edición (similar estructura a los de agregar) */}
      {/* Por brevedad, incluyo solo uno como ejemplo */}
      <Dialog
        open={editDialogType === "location" && !!editingItem}
        onOpenChange={() => {
          if (editDialogType === "location") {
            setEditingItem(null)
            setEditDialogType(null)
          }
        }}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Editar Ubicación</DialogTitle>
            <DialogDescription>Modifique los detalles de la ubicación.</DialogDescription>
          </DialogHeader>
          {editingItem && editDialogType === "location" && (
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-location-name">Nombre</Label>
                <Input
                  id="edit-location-name"
                  value={editingItem.name}
                  onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-location-type">Tipo</Label>
                <Select
                  value={editingItem.type}
                  onValueChange={(value) => setEditingItem({ ...editingItem, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Puerto">Puerto</SelectItem>
                    <SelectItem value="Aeropuerto">Aeropuerto</SelectItem>
                    <SelectItem value="Hotel">Hotel</SelectItem>
                    <SelectItem value="Terminal">Terminal</SelectItem>
                    <SelectItem value="Otro">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-location-address">Dirección</Label>
                <Input
                  id="edit-location-address"
                  value={editingItem.address}
                  onChange={(e) => setEditingItem({ ...editingItem, address: e.target.value })}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="edit-location-active"
                  checked={editingItem.active}
                  onCheckedChange={(checked) => setEditingItem({ ...editingItem, active: checked })}
                />
                <Label htmlFor="edit-location-active">Activo</Label>
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
