"use client"

import { useEffect, useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Settings2, Plus, Edit, Trash2, Ship, MapPin, Wrench, Search, DollarSign, Upload } from "lucide-react"
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
  selectTruckingRoutesPagination,
  selectTruckingRoutesFilters,
  setFilters,
  setPage,
  type TruckingRoute,
  type TruckingRouteInput,
} from "@/lib/features/truckingRoutes/truckingRoutesSlice"

import { ServicesManagement } from "@/components/services-management"
import {
  fetchContainerTypes,
  createContainerType,
  updateContainerType,
  deleteContainerType,
  selectAllContainerTypes,
  selectContainerTypesLoading,
  selectContainerTypesError,
  selectContainerTypesCreating,
  selectContainerTypesUpdating,
  selectContainerTypesDeleting,
  type ContainerType,
  type ContainerTypeInput,
} from "@/lib/features/containerTypes/containerTypesSlice"

import {
  fetchServices,
  selectAllServices,
  selectServicesLoading,
  updateServiceAsync,
  type Service,
} from "@/lib/features/services/servicesSlice"

import { PriceImporter } from "./price-importer"
import { Pagination } from "@/components/ui/pagination"

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
  const pagination = useAppSelector(selectTruckingRoutesPagination)
  const filters = useAppSelector(selectTruckingRoutesFilters)

  // Container Types
  const containerTypes = useAppSelector(selectAllContainerTypes)
  const containerTypesLoading = useAppSelector(selectContainerTypesLoading)
  const containerTypesError = useAppSelector(selectContainerTypesError)
  const containerTypesCreating = useAppSelector(selectContainerTypesCreating)
  const containerTypesUpdating = useAppSelector(selectContainerTypesUpdating)
  const containerTypesDeleting = useAppSelector(selectContainerTypesDeleting)

  // Impuestos PTG
  const services = useAppSelector(selectAllServices)
  const servicesLoading = useAppSelector(selectServicesLoading)

  const [activeTab, setActiveTab] = useState<"navieras" | "routes" | "services" | "containers">("navieras")

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
    containerType: "",
    routeType: "SINGLE",
    price: 0,
    status: "FULL",
    cliente: "",
    routeArea: "",
    sizeContenedor: "",
  })

  // Handlers para filtros
  const handleFilterChange = (newFilters: Partial<typeof filters>) => {
    dispatch(setFilters(newFilters))
  }

  const handlePageChange = (page: number) => {
    dispatch(setPage(page))
    dispatch(fetchTruckingRoutes({ 
      page, 
      limit: 50,
      ...filters
    }))
  }

  // Form: Container Type
  const [showAddContainerTypeForm, setShowAddContainerTypeForm] = useState(false)
  const [containerTypeToDelete, setContainerTypeToDelete] = useState<ContainerType | null>(null)
  const [editingContainerType, setEditingContainerType] = useState<ContainerType | null>(null)
  const [newContainerType, setNewContainerType] = useState<ContainerTypeInput>({
    code: "",
    name: "",
    category: "DRY",
    sapCode: "",
    description: "",
    isActive: true,
  })
  const [containerTypeFilters, setContainerTypeFilters] = useState({
    category: "all" as "all" | "DRY" | "REEFE",
    isActive: "all" as "all" | "true" | "false"
  })

  // Form: Impuestos PTG
  const [editingTax, setEditingTax] = useState<Service | null>(null)
  const [taxPrice, setTaxPrice] = useState<number>(0)

  // Importador de precios
  const [showPriceImporter, setShowPriceImporter] = useState(false)

  // Load data
  useEffect(() => {
    dispatch(fetchNavieras())
    dispatch(fetchTruckingRoutes({ page: 1, limit: 50 }))
    dispatch(fetchContainerTypes())
    dispatch(fetchServices())
  }, [dispatch])

  // Cargar rutas cuando cambien los filtros
  useEffect(() => {
    dispatch(fetchTruckingRoutes({ 
      page: 1, 
      limit: 50,
      ...filters
    }))
  }, [dispatch, filters])

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

  useEffect(() => {
    if (containerTypesError) {
      toast({ title: "Error", description: containerTypesError, variant: "destructive" })
    }
  }, [containerTypesError, toast])

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
    if (!newRoute.origin || !newRoute.destination || !newRoute.containerType || !newRoute.routeType || newRoute.price <= 0 || !newRoute.status || !newRoute.cliente || !newRoute.routeArea || !newRoute.sizeContenedor) {
      toast({ title: "Error", description: "Completa todos los campos obligatorios", variant: "destructive" })
      return
    }
    // Autogenerar nombre
    const name = `${newRoute.origin}/${newRoute.destination}`
    try {
      await dispatch(createTruckingRoute({ ...newRoute, name })).unwrap()
      setNewRoute({ name: "", origin: "", destination: "", containerType: "", routeType: "SINGLE", price: 0, status: "FULL", cliente: "", routeArea: "", sizeContenedor: "" })
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
      status: newRoute.status,
      cliente: newRoute.cliente,
      routeArea: newRoute.routeArea,
      sizeContenedor: newRoute.sizeContenedor,
    }
    if (!routeData.origin || !routeData.destination || !routeData.containerType || !routeData.routeType || routeData.price <= 0 || !routeData.status || !routeData.cliente || !routeData.routeArea || !routeData.sizeContenedor) {
      toast({ title: "Error", description: "Completa todos los campos obligatorios", variant: "destructive" })
      return
    }
    try {
      await dispatch(updateTruckingRoute({ id: editingRoute._id, routeData })).unwrap()
      setNewRoute({ name: "", origin: "", destination: "", containerType: "", routeType: "SINGLE", price: 0, status: "FULL", cliente: "", routeArea: "", sizeContenedor: "" })
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
      status: route.status,
      cliente: route.cliente,
      routeArea: route.routeArea,
      sizeContenedor: route.sizeContenedor,
    })
  }

  const handleCancelEditRoute = () => {
    setEditingRoute(null)
    setNewRoute({ name: "", origin: "", destination: "", containerType: "", routeType: "SINGLE", price: 0, status: "FULL", cliente: "", routeArea: "", sizeContenedor: "" })
  }

  // Container Types handlers
  const handleAddContainerType = async () => {
    if (!newContainerType.code || !newContainerType.name || !newContainerType.category || !newContainerType.sapCode) {
      toast({ title: "Error", description: "Completa todos los campos obligatorios", variant: "destructive" })
      return
    }
    try {
      await dispatch(createContainerType(newContainerType)).unwrap()
      setNewContainerType({ code: "", name: "", category: "DRY", sapCode: "", description: "", isActive: true })
      setShowAddContainerTypeForm(false)
      toast({ title: "Tipo de contenedor agregado", description: "El nuevo tipo de contenedor ha sido configurado correctamente" })
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Error al crear el tipo de contenedor", variant: "destructive" })
    }
  }

  const handleEditContainerType = async () => {
    if (!editingContainerType) return
    if (!newContainerType.code || !newContainerType.name || !newContainerType.category || !newContainerType.sapCode) {
      toast({ title: "Error", description: "Completa todos los campos obligatorios", variant: "destructive" })
      return
    }
    try {
      await dispatch(updateContainerType({ id: editingContainerType._id, containerTypeData: newContainerType })).unwrap()
      setNewContainerType({ code: "", name: "", category: "DRY", sapCode: "", description: "", isActive: true })
      setEditingContainerType(null)
      toast({ title: "Tipo de contenedor actualizado", description: "El tipo de contenedor ha sido actualizado correctamente" })
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Error al actualizar el tipo de contenedor", variant: "destructive" })
    }
  }

  const handleDeleteContainerType = async (containerTypeId: string) => {
    try {
      await dispatch(deleteContainerType(containerTypeId)).unwrap()
      toast({ title: "Tipo de contenedor eliminado", description: "El tipo de contenedor ha sido eliminado del sistema" })
      setContainerTypeToDelete(null)
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Error al eliminar el tipo de contenedor", variant: "destructive" })
    }
  }

  const handleEditContainerTypeClick = (containerType: ContainerType) => {
    setEditingContainerType(containerType)
    setNewContainerType({
      code: containerType.code,
      name: containerType.name,
      category: containerType.category,
      sapCode: containerType.sapCode,
      description: containerType.description || "",
      isActive: containerType.isActive,
    })
  }

  const handleCancelEditContainerType = () => {
    setEditingContainerType(null)
    setNewContainerType({ code: "", name: "", category: "DRY", sapCode: "", description: "", isActive: true })
  }

  const handleToggleContainerTypeStatus = async (containerType: ContainerType) => {
    try {
      await dispatch(updateContainerType({ 
        id: containerType._id, 
        containerTypeData: { ...containerType, isActive: !containerType.isActive } 
      })).unwrap()
      toast({ title: "Estado actualizado", description: `El tipo de contenedor ${containerType.name} ha sido ${!containerType.isActive ? "activado" : "desactivado"}` })
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Error al actualizar el estado del tipo de contenedor", variant: "destructive" })
    }
  }

  const handleContainerTypeFiltersChange = (filters: typeof containerTypeFilters) => {
    setContainerTypeFilters(filters)
    dispatch(fetchContainerTypes(filters))
  }

  // Funciones para manejar impuestos PTG
  const handleEditTaxClick = (tax: Service) => {
    setEditingTax(tax)
    setTaxPrice(tax.price || 0) // El precio se maneja a través del campo price del servicio
    
    // Hacer scroll hacia el formulario de edición
    setTimeout(() => {
      const formElement = document.getElementById('tax-edit-form')
      if (formElement) {
        formElement.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start',
          inline: 'nearest'
        })
      } else {
        // Fallback: scroll hacia abajo si no se encuentra el elemento
        window.scrollTo({
          top: document.documentElement.scrollHeight,
          behavior: 'smooth'
        })
      }
    }, 100)
  }

  const handleCancelEditTax = () => {
    setEditingTax(null)
    setTaxPrice(0)
    
    // Hacer scroll hacia arriba para volver a la vista de los impuestos
    setTimeout(() => {
      const taxesSection = document.querySelector('[data-section="ptg-taxes"]')
      if (taxesSection) {
        taxesSection.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start'
        })
      }
    }, 100)
  }

  const handleUpdateTaxPrice = async () => {
    if (!editingTax || taxPrice <= 0) {
      toast({ title: "Error", description: "Ingresa un precio válido", variant: "destructive" })
      return
    }

    try {
      await dispatch(updateServiceAsync({
        id: editingTax._id,
        serviceData: {
          price: taxPrice
        }
      })).unwrap()
      
      toast({ title: "Precio actualizado", description: `El precio del impuesto ${editingTax.name} ha sido actualizado a $${taxPrice.toFixed(2)}` })
      setEditingTax(null)
      setTaxPrice(0)
      dispatch(fetchServices()) // Recargar servicios
      
      // Hacer scroll hacia arriba para volver a la vista de los impuestos
      setTimeout(() => {
        const taxesSection = document.querySelector('[data-section="ptg-taxes"]')
        if (taxesSection) {
          taxesSection.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start'
          })
        }
      }, 100)
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Error al actualizar el precio del impuesto", variant: "destructive" })
    }
  }

  // Handler para importación de precios
  const handleImportPrices = async (routes: any[], onProgress?: (progress: number, status: string) => void, overwriteDuplicates: boolean = false) => {
    try {
      const token = localStorage.getItem('token')
      
      if (!token) {
        throw new Error('No se encontró token de autenticación')
      }

      const totalRoutes = routes.length
      const BATCH_SIZE = 500
      const results = {
        success: 0,
        duplicates: 0,
        errors: 0,
        errorsList: [] as string[]
      }

      onProgress?.(0, 'Iniciando importación...')

      for (let i = 0; i < routes.length; i += BATCH_SIZE) {
        const batch = routes.slice(i, i + BATCH_SIZE)
        const currentBatch = Math.floor(i / BATCH_SIZE) + 1
        const totalBatches = Math.ceil(totalRoutes / BATCH_SIZE)
        
        onProgress?.(
          Math.round((i / totalRoutes) * 100), 
          `Procesando lote ${currentBatch}/${totalBatches} (${batch.length} rutas)...`
        )
        
        try {
          const response = await fetch('/api/trucking-routes/import', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ routes: batch, overwriteDuplicates })
          })

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            throw new Error(errorData.payload?.message || `Error ${response.status}: ${response.statusText}`)
          }

          const data = await response.json()
          
          // Acumular resultados
          results.success += data.payload.data.success
          results.duplicates += data.payload.data.duplicates
          results.errors += data.payload.data.errors
          results.errorsList.push(...(data.payload.data.errorsList || []))

        } catch (error) {
          console.error(`Error procesando lote ${currentBatch}:`, error)
          results.errors += batch.length
          results.errorsList.push(`Error en lote ${currentBatch}: ${error instanceof Error ? error.message : 'Error desconocido'}`)
        }

        // Pequeña pausa para no sobrecargar el servidor
        await new Promise(resolve => setTimeout(resolve, 100))
      }

      onProgress?.(100, 'Finalizando importación...')

      // Mostrar resultados finales
      toast({ 
        title: "Importación completada", 
        description: `${results.success} rutas importadas, ${results.duplicates} duplicadas, ${results.errors} errores` 
      })

      // Recargar las rutas
      dispatch(fetchTruckingRoutes())

    } catch (error) {
      console.error('Error en importación de precios:', error)
      onProgress?.(0, 'Error en la importación')
      toast({ 
        title: "Error", 
        description: error instanceof Error ? error.message : "Error al importar las rutas", 
        variant: "destructive" 
      })
    }
  }

  // Obtener impuestos PTG (Customs y Administration Fee)
  const ptgTaxes = useMemo(() => {
    return services.filter(service => 
      service.module === 'trucking' && 
      (service.name === 'Aduana' || service.name === 'Administration Fee')
    )
  }, [services])


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
            <Button
              variant={activeTab === "containers" ? "default" : "outline"}
              className={activeTab === "containers" ? "bg-blue-600 hover:bg-blue-700" : ""}
              onClick={() => setActiveTab("containers")}
            >
              <Ship className="h-4 w-4 mr-2" />
              Tipos de Contenedores
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
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowPriceImporter(true)}>
                  <Upload className="h-4 w-4 mr-2" />
                  Importar Precios
                </Button>
                <Button onClick={() => setShowAddRouteForm(!showAddRouteForm)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar Ruta
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
                {/* Filtros de búsqueda */}
            <Card className="border-dashed bg-gray-50">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  Buscar y Filtrar Rutas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Búsqueda por texto */}
                  <div className="space-y-2">
                    <Label htmlFor="route-search">Buscar</Label>
                    <Input
                      id="route-search"
                      placeholder="Nombre, origen o destino..."
                      value={filters.search}
                      onChange={(e) => handleFilterChange({ search: e.target.value })}
                    />
                  </div>
                  
                  {/* Filtro por tipo de contenedor */}
                  <div className="space-y-2">
                    <Label>Tipo de Contenedor</Label>
                    <Select 
                      value={filters.containerType} 
                      onValueChange={(value) => handleFilterChange({ containerType: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos los tipos</SelectItem>
                        {containerTypes
                          .filter(ct => ct.isActive)
                          .sort((a, b) => a.code.localeCompare(b.code))
                          .map(containerType => (
                            <SelectItem key={containerType.code} value={containerType.code}>
                              {containerType.code} - {containerType.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Filtro por tipo de ruta */}
                  <div className="space-y-2">
                    <Label>Tipo de Ruta</Label>
                    <Select 
                      value={filters.routeType} 
                      onValueChange={(value) => handleFilterChange({ routeType: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos los tipos</SelectItem>
                        <SelectItem value="SINGLE">Single</SelectItem>
                        <SelectItem value="RT">Round Trip</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Filtro por estado */}
                  <div className="space-y-2">
                    <Label>Estado</Label>
                    <Select 
                      value={filters.status} 
                      onValueChange={(value) => handleFilterChange({ status: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos los estados</SelectItem>
                        <SelectItem value="FULL">Full</SelectItem>
                        <SelectItem value="EMPTY">Empty</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                {/* Botón para limpiar filtros */}
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>
                      {pagination ? `${pagination.totalItems} rutas totales` : `${routes.length} rutas mostradas`}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

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
                      <Input id="route-origin" value={newRoute.origin} onChange={(e) => setNewRoute({ ...newRoute, origin: e.target.value.toUpperCase() })} placeholder="PSA" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="route-destination">Destino *</Label>
                      <Input id="route-destination" value={newRoute.destination} onChange={(e) => setNewRoute({ ...newRoute, destination: e.target.value.toUpperCase() })} placeholder="BLB" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="route-container-type">Tipo de Contenedor *</Label>
                      <Input id="route-container-type" value={newRoute.containerType} onChange={(e) => setNewRoute({ ...newRoute, containerType: e.target.value.toUpperCase() })} placeholder="CA, CT, DV, FL, etc." />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="route-route-type">Tipo de Ruta *</Label>
                      <Select value={newRoute.routeType} onValueChange={(value) => setNewRoute({ ...newRoute, routeType: value as "SINGLE" | "RT" })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar tipo de ruta" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="SINGLE">Single - Viaje único</SelectItem>
                          <SelectItem value="RT">RT - Round Trip</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="route-price">Precio *</Label>
                      <Input id="route-price" type="number" value={newRoute.price} onChange={(e) => setNewRoute({ ...newRoute, price: parseFloat(e.target.value) || 0 })} placeholder="265.00" min="0" step="0.01" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="route-status">Estado *</Label>
                      <Select value={newRoute.status} onValueChange={(value) => setNewRoute({ ...newRoute, status: value as "FULL" | "EMPTY" })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar estado" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="FULL">Full</SelectItem>
                          <SelectItem value="EMPTY">Empty</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="route-cliente">Cliente *</Label>
                      <Input id="route-cliente" value={newRoute.cliente} onChange={(e) => setNewRoute({ ...newRoute, cliente: e.target.value.toUpperCase() })} placeholder="MSC" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="route-area">Área de Ruta *</Label>
                      <Input id="route-area" value={newRoute.routeArea} onChange={(e) => setNewRoute({ ...newRoute, routeArea: e.target.value.toUpperCase() })} placeholder="PACIFIC, NORTH, SOUTH, ATLANTIC" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="route-size">Tamaño del Contenedor *</Label>
                      <Input id="route-size" value={newRoute.sizeContenedor} onChange={(e) => setNewRoute({ ...newRoute, sizeContenedor: e.target.value })} placeholder="20, 40, 45" />
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
              {/* Indicador de filtros activos */}
              {(filters.search || filters.containerType !== "all" || filters.routeType !== "all" || filters.status !== "all") && (
                <div className="bg-blue-50 border-b border-blue-200 p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-blue-700">
                      <Search className="h-4 w-4" />
                      <span>Filtros activos:</span>
                      {filters.search && (
                        <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                          Búsqueda: "{filters.search}"
                        </Badge>
                      )}
                      {filters.containerType !== "all" && (
                        <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                          Contenedor: {filters.containerType}
                        </Badge>
                      )}
                      {filters.routeType !== "all" && (
                        <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                          Ruta: {filters.routeType === "RT" ? "Round Trip" : "Single"}
                        </Badge>
                      )}
                      {filters.status !== "all" && (
                        <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                          Estado: {filters.status}
                        </Badge>
                      )}
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleFilterChange({
                        search: "",
                        containerType: "all",
                        routeType: "all",
                        status: "all"
                      })}
                      className="text-blue-700 border-blue-300 hover:bg-blue-100"
                    >
                      Limpiar Filtros
                    </Button>
                  </div>
                </div>
              )}
              
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Origen</TableHead>
                    <TableHead>Destino</TableHead>
                    <TableHead>Tipo Contenedor</TableHead>
                    <TableHead>Tamaño</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Área</TableHead>
                    <TableHead>Tipo Ruta</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Precio</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {routesLoading ? (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center py-8">
                        <div className="flex items-center justify-center space-x-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                          <span>Cargando rutas...</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : routes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
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
                          <Badge variant="outline">{route.containerType}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{route.sizeContenedor}</Badge>
                        </TableCell>
                        <TableCell>{route.cliente}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-blue-100 text-blue-800">{route.routeArea}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={route.routeType === "RT" ? "default" : "secondary"}>{route.routeType === "RT" ? "Round Trip" : "Single"}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={route.status === "FULL" ? "default" : "secondary"}>{route.status}</Badge>
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
              
              {/* Paginación */}
              {pagination && pagination.totalPages > 1 && (
                <div className="border-t p-4">
                  <Pagination
                    currentPage={pagination.currentPage}
                    totalPages={pagination.totalPages}
                    onPageChange={handlePageChange}
                    hasNextPage={pagination.hasNextPage}
                    hasPrevPage={pagination.hasPrevPage}
                    totalItems={pagination.totalItems}
                    itemsPerPage={pagination.itemsPerPage}
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === "services" && (
        <div className="space-y-6">
          {/* Gestión de Servicios PTG */}
          <ServicesManagement module="trucking" title="Gestión de Servicios PTG" />
          
          {/* Gestión de Impuestos PTG */}
          <Card data-section="ptg-taxes">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Gestión de Impuestos PTG
              </CardTitle>
              <CardDescription className="text-sm pt-2  ">
                Configuración de impuestos fijos PTG
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {servicesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                    <span>Cargando impuestos...</span>
                  </div>
                </div>
              ) : ptgTaxes.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <DollarSign className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-lg font-medium">No hay impuestos configurados</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {ptgTaxes.map((tax) => (
                    <Card key={tax._id} className="border-l-4 border-l-blue-500">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                                {tax.name}
                              </Badge>
                              <Badge variant={tax.isActive ? "default" : "secondary"}>
                                {tax.isActive ? "Activo" : "Inactivo"}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">
                              {tax.description || "Sin descripción"}
                            </p>
                                                         <div className="text-lg font-semibold text-green-600">
                               Precio actual: ${tax.price || 0}
                             </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              onClick={() => handleEditTaxClick(tax)}
                              disabled={!tax.isActive}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Modificar Precio
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Formulario de edición de precio */}
              {editingTax && (
                <Card 
                  id="tax-edit-form" 
                  className="border-dashed border-blue-300 bg-blue-50 animate-in slide-in-from-bottom-2 duration-300"
                >
                  <CardHeader>
                    <CardTitle className="text-lg text-blue-900">
                      Modificar Precio - {editingTax.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="tax-price" className="text-blue-900">Nuevo Precio *</Label>
                        <Input
                          id="tax-price"
                          type="number"
                          value={taxPrice === 0 ? "" : taxPrice}
                          onChange={(e) => setTaxPrice(parseFloat(e.target.value) || 0)}
                          placeholder="0.00"
                          min="0"
                          step="0.01"
                          className="border-blue-300 focus:border-blue-500 focus:ring-blue-500"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-blue-900">Precio Actual</Label>
                                               <div className="text-lg font-semibold text-blue-900 bg-white p-3 rounded-md border border-blue-200">
                         ${editingTax.price || 0}
                       </div>
                      </div>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button 
                        onClick={handleUpdateTaxPrice}
                        disabled={taxPrice <= 0}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Actualizar Precio
                      </Button>
                      <Button variant="outline" onClick={handleCancelEditTax}>
                        Cancelar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </div>
      )}



      {activeTab === "containers" && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Gestión de Tipos de Contenedores</CardTitle>
              <Button onClick={() => setShowAddContainerTypeForm(!showAddContainerTypeForm)}>
                <Plus className="h-4 w-4 mr-2" />
                Agregar Tipo de Contenedor
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Filtros */}
            <div className="flex flex-wrap gap-4 p-4 bg-gray-50 rounded-lg">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Categoría:</Label>
                <Select 
                  value={containerTypeFilters.category} 
                  onValueChange={(value) => handleContainerTypeFiltersChange({ ...containerTypeFilters, category: value as any })}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las categorías</SelectItem>
                    <SelectItem value="DRY">Dry</SelectItem>
                    <SelectItem value="REEFE">Reefer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Estado:</Label>
                <Select 
                  value={containerTypeFilters.isActive} 
                  onValueChange={(value) => handleContainerTypeFiltersChange({ ...containerTypeFilters, isActive: value as any })}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los estados</SelectItem>
                    <SelectItem value="true">Activos</SelectItem>
                    <SelectItem value="false">Inactivos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Formulario de agregar/editar */}
            {(showAddContainerTypeForm || editingContainerType) && (
              <Card className="border-dashed">
                <CardHeader>
                  <CardTitle className="text-lg">{editingContainerType ? "Editar Tipo de Contenedor" : "Nuevo Tipo de Contenedor"}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="container-type-code">Código *</Label>
                      <Input
                        id="container-type-code"
                        value={newContainerType.code}
                        onChange={(e) => setNewContainerType({ ...newContainerType, code: e.target.value.toUpperCase() })}
                        placeholder="BB, BH, BV, DV, FL, etc."
                        maxLength={2}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="container-type-name">Nombre *</Label>
                      <Input
                        id="container-type-name"
                        value={newContainerType.name}
                        onChange={(e) => setNewContainerType({ ...newContainerType, name: e.target.value })}
                        placeholder="Swap Body High, Bulk van, Dry van, etc."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="container-type-sap-code">Código SAP *</Label>
                      <Input
                        id="container-type-sap-code"
                        value={newContainerType.sapCode}
                        onChange={(e) => setNewContainerType({ ...newContainerType, sapCode: e.target.value.toUpperCase() })}
                        placeholder="RE, DV, FL, TK, etc."
                        maxLength={2}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="container-type-category">Categoría *</Label>
                      <Select 
                        value={newContainerType.category} 
                        onValueChange={(value) => setNewContainerType({ ...newContainerType, category: value as any })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="DRY">Dry</SelectItem>
                          <SelectItem value="REEFE">Reefer</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="container-type-description">Descripción</Label>
                      <Input
                        id="container-type-description"
                        value={newContainerType.description}
                        onChange={(e) => setNewContainerType({ ...newContainerType, description: e.target.value })}
                        placeholder="Descripción opcional del tipo de contenedor"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={editingContainerType ? handleEditContainerType : handleAddContainerType} disabled={containerTypesCreating || containerTypesUpdating}>
                      <Plus className="h-4 w-4 mr-2" />
                      {containerTypesCreating || containerTypesUpdating ? "Guardando..." : editingContainerType ? "Actualizar Tipo de Contenedor" : "Agregar Tipo de Contenedor"}
                    </Button>
                    <Button variant="outline" onClick={editingContainerType ? handleCancelEditContainerType : () => setShowAddContainerTypeForm(false)}>
                      Cancelar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Tabla de tipos de contenedores */}
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Código SAP</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {containerTypesLoading && containerTypes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        <div className="flex items-center justify-center space-x-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                          <span>Cargando tipos de contenedores...</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : containerTypes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No hay tipos de contenedores registrados
                      </TableCell>
                    </TableRow>
                  ) : (
                    containerTypes.map((containerType: ContainerType) => (
                      <TableRow key={containerType._id}>
                        <TableCell className="font-mono font-medium">
                          <Badge variant="outline">{containerType.code}</Badge>
                        </TableCell>
                        <TableCell className="font-medium">{containerType.name}</TableCell>
                        <TableCell className="font-mono font-medium">
                          <Badge variant="outline" className="bg-blue-100 text-blue-800">
                            {containerType.sapCode}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{containerType.category}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {containerType.description || "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={containerType.isActive ? "default" : "secondary"}>
                            {containerType.isActive ? "Activo" : "Inactivo"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => handleToggleContainerTypeStatus(containerType)} disabled={containerTypesUpdating}>
                              {containerType.isActive ? "Desactivar" : "Activar"}
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleEditContainerTypeClick(containerType)}>
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setContainerTypeToDelete(containerType)}>
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

      {/* Importador de precios */}
      {showPriceImporter && (
        <PriceImporter
          onImport={handleImportPrices}
          onClose={() => setShowPriceImporter(false)}
        />
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

      {/* Delete Container Type */}
      <DialogLike open={!!containerTypeToDelete} onOpenChange={() => setContainerTypeToDelete(null)}>
        <DialogCard>
          <CardHeader>
            <CardTitle>Confirmar eliminación</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="py-2">
              <p>¿Estás seguro de que quieres eliminar el tipo de contenedor?</p>
              {containerTypeToDelete && (
                <p className="font-medium mt-2">{containerTypeToDelete.name} ({containerTypeToDelete.code})</p>
              )}
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setContainerTypeToDelete(null)}>Cancelar</Button>
              <Button variant="destructive" onClick={() => containerTypeToDelete && handleDeleteContainerType(containerTypeToDelete._id)} disabled={containerTypesDeleting}>Eliminar</Button>
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


