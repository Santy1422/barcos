"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
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
  importPTYSSRoutes,
  selectPTYSSRoutes,
  selectPTYSSRoutesLoading,
  selectPTYSSRoutesError,
  selectPTYSSRoutesPagination,
  selectPTYSSRoutesFilters,
  setFilters,
  setPage,
  type PTYSSRoute,
  type PTYSSRouteInput,
} from "@/lib/features/ptyssRoutes/ptyssRoutesSlice"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { ServicesManagement } from '@/components/services-management'
import { PTYSSLocalRoutes } from './ptyss-local-routes'
import {
  selectAllLocalServices as selectAllAdditionalServices,
  selectLocalServicesLoading as selectAdditionalServicesLoading,
  fetchLocalServices as fetchAdditionalServices,
  createLocalServiceAsync,
  updateLocalServiceAsync,
  deleteLocalServiceAsync,
  clearError as clearAdditionalServicesError,
  type LocalService as AdditionalService,
} from "@/lib/features/localServices/localServicesSlice"

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
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Loader2, Search, Upload, RefreshCw } from "lucide-react"
import { PTYSSPriceImporter } from "./ptyss-price-importer"
import { Pagination } from "@/components/ui/pagination"

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
  const routesPagination = useAppSelector(selectPTYSSRoutesPagination)
  const routesFilters = useAppSelector(selectPTYSSRoutesFilters)

  // Additional Services state (servicios adicionales)
  const additionalServices = useAppSelector(selectAllAdditionalServices)
  const additionalServicesLoading = useAppSelector(selectAdditionalServicesLoading)
  
  // Container Types state
  const containerTypes = useAppSelector(selectAllContainerTypes)
  const containerTypesLoading = useAppSelector(selectContainerTypesLoading)
  const containerTypesError = useAppSelector(selectContainerTypesError)
  const containerTypesCreating = useAppSelector(selectContainerTypesCreating)
  const containerTypesUpdating = useAppSelector(selectContainerTypesUpdating)
  const containerTypesDeleting = useAppSelector(selectContainerTypesDeleting)
  
  // Local Services state (servicios locales fijos)
  const [localServices, setLocalServices] = useState<AdditionalService[]>([])
  const [localServicesLoading, setLocalServicesLoading] = useState(false)
  
  const [showAddNavieraForm, setShowAddNavieraForm] = useState(false)
  const [navieraToDelete, setNavieraToDelete] = useState<Naviera | null>(null)
  const [activeTab, setActiveTab] = useState<'navieras' | 'routes' | 'localRoutes' | 'services' | 'localServices' | 'containers'>('navieras')

  // PTYSS Routes form state
  const [showAddRouteForm, setShowAddRouteForm] = useState(false)
  const [routeToDelete, setRouteToDelete] = useState<PTYSSRoute | null>(null)
  const [editingRoute, setEditingRoute] = useState<PTYSSRoute | null>(null)
  const [newRoute, setNewRoute] = useState<PTYSSRouteInput>({
    from: "",
    to: "",
    containerType: "",
    routeType: "single",
    price: 0,
    status: "FULL",
    cliente: "",
    routeArea: ""
  })
  
  // Paginación local para la tabla de rutas (renderizado en frontend)
  const [routesCurrentPage, setRoutesCurrentPage] = useState(1)
  const routesPerPage = 50 // Mostrar 50 rutas por página en la tabla

  // Estado para servicios adicionales
  const [showAddServiceForm, setShowAddServiceForm] = useState(false)
  const [editingAdditionalService, setEditingAdditionalService] = useState<AdditionalService | null>(null)
  const [newAdditionalService, setNewAdditionalService] = useState({
    name: "",
    description: "",
    price: 10
  })

  // Estado para servicios locales fijos
  const [editingLocalService, setEditingLocalService] = useState<string | null>(null)
  const [localServicePrices, setLocalServicePrices] = useState({
    CLG097: 10,
    TRK163: 10,
    TRK179: 10,
    SLR168: 10
  })

  // Importador de precios
  const [showPriceImporter, setShowPriceImporter] = useState(false)

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

  // Cargar navieras al montar el componente
  useEffect(() => {
    dispatch(fetchNavieras())
  }, [dispatch])

  // Cargar rutas al montar el componente con límite aumentado para manejar hasta 5000 rutas
  useEffect(() => {
    console.log('🔄 PTYSS Config - Cargando rutas al montar componente')
    dispatch(fetchPTYSSRoutes({ page: 1, limit: 5000 })) // Aumentado para manejar hasta 5000 rutas
  }, [dispatch])

  // Cargar rutas cuando cambien los filtros
  useEffect(() => {
    dispatch(fetchPTYSSRoutes({ 
      page: 1, 
      limit: 5000, // Aumentado para manejar hasta 5000 rutas
      ...routesFilters
    }))
  }, [dispatch, routesFilters])

  // Cargar servicios adicionales al montar el componente
  useEffect(() => {
    dispatch(fetchAdditionalServices('ptyss'))
  }, [dispatch])

  // Cargar tipos de contenedores al montar el componente
  useEffect(() => {
    dispatch(fetchContainerTypes())
  }, [dispatch])

  // Cargar servicios locales fijos
  useEffect(() => {
    const fetchLocalServices = async () => {
      setLocalServicesLoading(true)
      try {
        const token = localStorage.getItem('token')
        console.log('🔍 Fetching local services...')
        console.log('🔍 Token:', token ? 'Present' : 'Missing')
        
        const response = await fetch('http://localhost:8080/api/local-services', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })
        
        console.log('🔍 Response status:', response.status)
        
        if (response.ok) {
          const data = await response.json()
          console.log('🔍 Response data:', data)
          
          const services = data.data?.services || []
          console.log('🔍 All services:', services)
          
          // Filtrar solo los servicios locales fijos
          const fixedServices = services.filter((service: any) => 
            ['CLG097', 'TRK163', 'TRK179', 'SLR168'].includes(service.code)
          )
          console.log('🔍 Fixed services found:', fixedServices)
          
          setLocalServices(fixedServices)
          console.log('🔍 Local services state updated:', fixedServices)
        } else {
          console.error('🔍 Response not ok:', response.status, response.statusText)
          const errorText = await response.text()
          console.error('🔍 Error response:', errorText)
        }
      } catch (error) {
        console.error('🔍 Error loading local services:', error)
      } finally {
        setLocalServicesLoading(false)
      }
    }
    
    fetchLocalServices()
  }, [])

  // Cargar precios de servicios locales fijos cuando se carguen los servicios locales
  useEffect(() => {
    if (localServices.length > 0) {
      const newPrices = { ...localServicePrices }
      
      // Buscar y actualizar precios de servicios locales fijos
      localServices.forEach((service: any) => {
        if (service.code === 'CLG097' || service.code === 'TRK163' || service.code === 'TRK179' || service.code === 'SLR168') {
          newPrices[service.code as keyof typeof localServicePrices] = service.price || 10
        }
      })
      
      setLocalServicePrices(newPrices)
    }
  }, [localServices])

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

  // Mostrar error de tipos de contenedores si existe
  useEffect(() => {
    if (containerTypesError) {
      toast({
        title: "Error",
        description: containerTypesError,
        variant: "destructive",
      })
    }
  }, [containerTypesError, toast])

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
    if (!newRoute.from || !newRoute.to || !newRoute.containerType || !newRoute.routeType || newRoute.price <= 0 || !newRoute.status || !newRoute.cliente || !newRoute.routeArea) {
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
        price: 0,
        status: "FULL",
        cliente: "",
        routeArea: ""
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
    if (!editingRoute || !newRoute.from || !newRoute.to || !newRoute.containerType || !newRoute.routeType || newRoute.price <= 0 || !newRoute.status || !newRoute.cliente || !newRoute.routeArea) {
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
        price: 0,
        status: "FULL",
        cliente: "",
        routeArea: ""
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
      price: route.price,
      status: route.status,
      cliente: route.cliente,
      routeArea: route.routeArea
    })
  }

  const handleCancelEdit = () => {
    setEditingRoute(null)
    setNewRoute({
      from: "",
      to: "",
      containerType: "",
      routeType: "single",
      price: 0,
      status: "FULL",
      cliente: "",
      routeArea: ""
    })
  }

  // Funciones para servicios adicionales
  const handleEditAdditionalService = (service: AdditionalService) => {
    setEditingAdditionalService(service)
    setNewAdditionalService({
      name: service.name,
      description: service.description,
      price: service.price || 0
    })
    setShowAddServiceForm(true)
  }

  const handleDeleteAdditionalService = async (serviceId: string) => {
    try {
      await dispatch(deleteLocalServiceAsync(serviceId)).unwrap()
      toast({
        title: "Servicio eliminado",
        description: "El servicio adicional ha sido eliminado exitosamente",
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Error al eliminar el servicio",
        variant: "destructive"
      })
    }
  }

  const handleAddAdditionalService = async () => {
    if (!newAdditionalService.name || !newAdditionalService.description || newAdditionalService.price < 0) {
      toast({
        title: "Error",
        description: "Completa todos los campos obligatorios. El precio debe ser mayor o igual a 0.",
        variant: "destructive"
      })
      return
    }

    try {
      if (editingAdditionalService) {
        // Actualizar servicio existente
        await dispatch(updateLocalServiceAsync({
          id: editingAdditionalService._id,
          serviceData: {
            name: newAdditionalService.name,
            description: newAdditionalService.description,
            price: newAdditionalService.price
          }
        })).unwrap()
        
        toast({
          title: "Servicio actualizado",
          description: "El servicio adicional ha sido actualizado exitosamente",
        })
      } else {
        // Crear nuevo servicio
        await dispatch(createLocalServiceAsync({
          name: newAdditionalService.name,
          description: newAdditionalService.description,
          price: newAdditionalService.price,
          module: 'ptyss'
        })).unwrap()
        
        toast({
          title: "Servicio agregado",
          description: "El nuevo servicio adicional ha sido configurado correctamente",
        })
      }
      
      setNewAdditionalService({
        name: "",
        description: "",
        price: 10
      })
      setEditingAdditionalService(null)
      setShowAddServiceForm(false)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Error al guardar el servicio",
        variant: "destructive"
      })
    }
  }

  const handleCancelAddService = () => {
    setNewAdditionalService({
      name: "",
      description: "",
      price: 10
    })
    setEditingAdditionalService(null)
    setShowAddServiceForm(false)
  }

  // Funciones para servicios locales fijos
  const handleEditLocalService = (serviceCode: string) => {
    setEditingLocalService(serviceCode)
  }

  const handleSaveLocalService = async (serviceCode: string) => {
    const newPrice = localServicePrices[serviceCode as keyof typeof localServicePrices]
    
    if (newPrice < 0) {
      toast({
        title: "Error",
        description: "El precio debe ser mayor o igual a 0.",
        variant: "destructive"
      })
      return
    }

    try {
      // Buscar el servicio en la base de datos por código
      let serviceToUpdate = localServices.find((service: any) => service.code === serviceCode)
      
      console.log('🔍 Buscando servicio por código:', serviceCode)
      console.log('🔍 Servicios locales disponibles:', localServices.map((s: any) => ({ code: s.code, name: s.name, price: s.price })))
      console.log('🔍 Servicio encontrado en localServices:', serviceToUpdate)
      
      // Si no se encuentra en localServices, buscar en additionalServices como fallback
      if (!serviceToUpdate) {
        serviceToUpdate = additionalServices.find((service: AdditionalService) => service.name === serviceCode)
        console.log('🔍 Servicios adicionales disponibles:', additionalServices.map((s: AdditionalService) => ({ name: s.name, price: s.price })))
        console.log('🔍 Servicio encontrado en additionalServices:', serviceToUpdate)
      }
      
      // Si aún no se encuentra, buscar por cualquier campo que contenga el código
      if (!serviceToUpdate) {
        serviceToUpdate = localServices.find((service: any) => 
          service.code === serviceCode || 
          service.name === serviceCode ||
          service.description?.includes(serviceCode) ||
          service._id === serviceCode
        )
        console.log('🔍 Búsqueda ampliada en localServices:', serviceToUpdate)
      }
      
      if (!serviceToUpdate) {
        serviceToUpdate = additionalServices.find((service: AdditionalService) => 
          service.name === serviceCode || 
          service.description?.includes(serviceCode) ||
          service._id === serviceCode
        )
        console.log('🔍 Búsqueda ampliada en additionalServices:', serviceToUpdate)
      }
      
      if (serviceToUpdate) {
        await dispatch(updateLocalServiceAsync({
          id: serviceToUpdate._id,
          serviceData: {
            price: newPrice
          }
        })).unwrap()
        
        // Actualizar el estado local después de guardar
        setLocalServices(prev => {
          const updatedServices = prev.map(service =>
            service._id === serviceToUpdate._id
              ? { ...service, price: newPrice }
              : service
          )

          const hasChanges = updatedServices.some((service, index) => service !== prev[index])
          return hasChanges ? updatedServices : prev
        })
        
        toast({
          title: "Precio actualizado",
          description: `El precio del servicio ${serviceCode} ha sido actualizado exitosamente`,
        })
      } else {
        toast({
          title: "Error",
          description: `No se encontró el servicio ${serviceCode} en la base de datos. Verifica que el servicio esté configurado correctamente.`,
          variant: "destructive"
        })
      }
      
      setEditingLocalService(null)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Error al actualizar el precio del servicio",
        variant: "destructive"
      })
    }
  }

  const handleCancelEditLocalService = () => {
    setEditingLocalService(null)
  }

  // Container Types handlers
  const handleAddContainerType = async () => {
    if (!newContainerType.code || !newContainerType.name || !newContainerType.category || !newContainerType.sapCode) {
      toast({
        title: "Error",
        description: "Completa todos los campos obligatorios",
        variant: "destructive"
      })
      return
    }
    try {
      await dispatch(createContainerType(newContainerType)).unwrap()
      setNewContainerType({ code: "", name: "", category: "DRY", sapCode: "", description: "", isActive: true })
      setShowAddContainerTypeForm(false)
      toast({
        title: "Tipo de contenedor agregado",
        description: "El nuevo tipo de contenedor ha sido configurado correctamente",
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Error al crear el tipo de contenedor",
        variant: "destructive"
      })
    }
  }

  const handleEditContainerType = async () => {
    if (!editingContainerType) return
    if (!newContainerType.code || !newContainerType.name || !newContainerType.category || !newContainerType.sapCode) {
      toast({
        title: "Error",
        description: "Completa todos los campos obligatorios",
        variant: "destructive"
      })
      return
    }
    try {
      await dispatch(updateContainerType({ id: editingContainerType._id, containerTypeData: newContainerType })).unwrap()
      setNewContainerType({ code: "", name: "", category: "DRY", sapCode: "", description: "", isActive: true })
      setEditingContainerType(null)
      toast({
        title: "Tipo de contenedor actualizado",
        description: "El tipo de contenedor ha sido actualizado correctamente",
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Error al actualizar el tipo de contenedor",
        variant: "destructive"
      })
    }
  }

  const handleDeleteContainerType = async (containerTypeId: string) => {
    try {
      await dispatch(deleteContainerType(containerTypeId)).unwrap()
      toast({
        title: "Tipo de contenedor eliminado",
        description: "El tipo de contenedor ha sido eliminado del sistema",
      })
      setContainerTypeToDelete(null)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Error al eliminar el tipo de contenedor",
        variant: "destructive"
      })
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
      toast({
        title: "Estado actualizado",
        description: `El tipo de contenedor ${containerType.name} ha sido ${!containerType.isActive ? "activado" : "desactivado"}`,
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Error al actualizar el estado del tipo de contenedor",
        variant: "destructive"
      })
    }
  }

  const handleContainerTypeFiltersChange = (filters: typeof containerTypeFilters) => {
    setContainerTypeFilters(filters)
    dispatch(fetchContainerTypes())
  }

  // Calcular rutas paginadas para la tabla (paginación en frontend)
  const paginatedRoutes = useMemo(() => {
    const startIndex = (routesCurrentPage - 1) * routesPerPage
    const endIndex = startIndex + routesPerPage
    return routes.slice(startIndex, endIndex)
  }, [routes, routesCurrentPage, routesPerPage])

  const totalRoutesPages = Math.ceil(routes.length / routesPerPage)

  // Resetear página cuando cambien los filtros o las rutas
  useEffect(() => {
    setRoutesCurrentPage(1)
  }, [routesFilters, routes.length])

  // Handlers para filtros de rutas
  const handleRouteFilterChange = (newFilters: Partial<typeof routesFilters>) => {
    dispatch(setFilters(newFilters))
  }

  const handleRoutePageChange = (page: number) => {
    dispatch(setPage(page))
    dispatch(fetchPTYSSRoutes({ 
      page, 
      limit: 5000, // Aumentado para manejar hasta 5000 rutas
      ...routesFilters
    }))
  }

  const handleRefreshRoutes = () => {
    dispatch(fetchPTYSSRoutes({ 
      page: 1, 
      limit: 5000, // Aumentado para manejar hasta 5000 rutas
      ...routesFilters
    }))
    toast({
      title: "Rutas actualizadas",
      description: "La lista de rutas ha sido actualizada correctamente",
    })
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
          const response = await fetch('/api/ptyss-routes/import', {
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
      dispatch(fetchPTYSSRoutes({ page: 1, limit: 50 }))

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
              Servicios Trasiego
            </Button>
            <Button
              variant={activeTab === 'localServices' ? "default" : "outline"}
              className={activeTab === 'localServices' ? "bg-blue-600 hover:bg-blue-700" : ""}
              onClick={() => setActiveTab('localServices')}
            >
              <Wrench className="h-4 w-4 mr-2" />
              Servicios Locales
            </Button>
            <Button
              variant={activeTab === 'containers' ? "default" : "outline"}
              className={activeTab === 'containers' ? "bg-blue-600 hover:bg-blue-700" : ""}
              onClick={() => setActiveTab('containers')}
            >
              <Ship className="h-4 w-4 mr-2" />
              Tipos de Contenedores
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
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleRefreshRoutes} disabled={routesLoading}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${routesLoading ? 'animate-spin' : ''}`} />
                  Refrescar
                </Button>
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                  {/* Búsqueda por texto */}
                  <div className="space-y-2">
                    <Label htmlFor="route-search">Buscar</Label>
                    <Input
                      id="route-search"
                      placeholder="Nombre, origen o destino..."
                      value={routesFilters.search}
                      onChange={(e) => handleRouteFilterChange({ search: e.target.value })}
                    />
                  </div>
                  
                  {/* Filtro por tipo de contenedor */}
                  <div className="space-y-2">
                    <Label>Tipo de Contenedor</Label>
                    <Select 
                      value={routesFilters.containerType} 
                      onValueChange={(value) => handleRouteFilterChange({ containerType: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos los tipos</SelectItem>
                        {containerTypes
                          .filter((ct: any) => ct.isActive)
                          .sort((a: any, b: any) => a.code.localeCompare(b.code))
                          .map((containerType: any) => (
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
                      value={routesFilters.routeType} 
                      onValueChange={(value) => handleRouteFilterChange({ routeType: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos los tipos</SelectItem>
                        <SelectItem value="single">Single</SelectItem>
                        <SelectItem value="RT">Round Trip</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Filtro por estado */}
                  <div className="space-y-2">
                    <Label>Estado</Label>
                    <Select 
                      value={routesFilters.status} 
                      onValueChange={(value) => handleRouteFilterChange({ status: value })}
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

                  {/* Filtro por cliente */}
                  <div className="space-y-2">
                    <Label>Cliente</Label>
                    <Input
                      placeholder="Código del cliente..."
                      value={routesFilters.cliente}
                      onChange={(e) => handleRouteFilterChange({ cliente: e.target.value })}
                    />
                  </div>

                  {/* Filtro por área de ruta */}
                  <div className="space-y-2">
                    <Label>Área de Ruta</Label>
                    <Select 
                      value={routesFilters.routeArea} 
                      onValueChange={(value) => handleRouteFilterChange({ routeArea: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas las áreas</SelectItem>
                        <SelectItem value="PACIFIC">PACIFIC</SelectItem>
                        <SelectItem value="NORTH">NORTH</SelectItem>
                        <SelectItem value="SOUTH">SOUTH</SelectItem>
                        <SelectItem value="ATLANTIC">ATLANTIC</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                {/* Botón para limpiar filtros */}
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>
                      {routesPagination ? `${routesPagination.totalItems} rutas totales` : `${routes.length} rutas mostradas`}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
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
                        onChange={(e) => setNewRoute({...newRoute, from: e.target.value.toUpperCase()})}
                        placeholder="Balboa"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="route-to">Destino *</Label>
                      <Input
                        id="route-to"
                        value={newRoute.to}
                        onChange={(e) => setNewRoute({...newRoute, to: e.target.value.toUpperCase()})}
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
                          {containerTypes
                            .filter((ct: any) => ct.isActive)
                            .sort((a: any, b: any) => a.code.localeCompare(b.code))
                            .map((containerType: any) => (
                              <SelectItem key={containerType.code} value={containerType.code}>
                                {containerType.code} - {containerType.name}
                              </SelectItem>
                            ))}
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
                    <div className="space-y-2">
                      <Label htmlFor="route-status">Estado *</Label>
                      <Select value={newRoute.status} onValueChange={(value) => setNewRoute({...newRoute, status: value as "FULL" | "EMPTY"})}>
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
                      <Input
                        id="route-cliente"
                        value={newRoute.cliente}
                        onChange={(e) => setNewRoute({...newRoute, cliente: e.target.value})}
                        placeholder="Código del cliente"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="route-area">Área de Ruta *</Label>
                      <Select value={newRoute.routeArea} onValueChange={(value) => setNewRoute({...newRoute, routeArea: value})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar área de ruta" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PACIFIC">PACIFIC</SelectItem>
                          <SelectItem value="NORTH">NORTH</SelectItem>
                          <SelectItem value="SOUTH">SOUTH</SelectItem>
                          <SelectItem value="ATLANTIC">ATLANTIC</SelectItem>
                        </SelectContent>
                      </Select>
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
              {/* Indicador de filtros activos */}
              {(routesFilters.search || routesFilters.containerType !== "all" || routesFilters.routeType !== "all" || routesFilters.status !== "all" || routesFilters.cliente !== "all" || routesFilters.routeArea !== "all") && (
                <div className="bg-blue-50 border-b border-blue-200 p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-blue-700">
                      <Search className="h-4 w-4" />
                      <span>Filtros activos:</span>
                      {routesFilters.search && (
                        <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                          Búsqueda: "{routesFilters.search}"
                        </Badge>
                      )}
                      {routesFilters.containerType !== "all" && (
                        <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                          Contenedor: {routesFilters.containerType}
                        </Badge>
                      )}
                      {routesFilters.routeType !== "all" && (
                        <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                          Ruta: {routesFilters.routeType === "RT" ? "Round Trip" : "Single"}
                        </Badge>
                      )}
                      {routesFilters.status !== "all" && (
                        <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                          Estado: {routesFilters.status}
                        </Badge>
                      )}
                      {routesFilters.cliente !== "all" && (
                        <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                          Cliente: {routesFilters.cliente}
                        </Badge>
                      )}
                      {routesFilters.routeArea !== "all" && (
                        <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                          Área: {routesFilters.routeArea}
                        </Badge>
                      )}
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleRouteFilterChange({
                        search: "",
                        containerType: "all",
                        routeType: "all",
                        status: "all",
                        cliente: "all",
                        routeArea: "all"
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
                    <TableHead>Tipo Ruta</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Área</TableHead>
                    <TableHead>Precio</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {routesLoading ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8">
                        <div className="flex items-center justify-center space-x-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                          <span>Cargando rutas...</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : routes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                        No hay rutas registradas
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedRoutes.map((route: PTYSSRoute) => (
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
                        <TableCell>
                          <Badge variant={route.status === "FULL" ? "default" : "secondary"}>
                            {route.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{route.cliente}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-blue-100 text-blue-800">
                            {route.routeArea}
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
              
              {/* Paginación local (frontend) */}
              {totalRoutesPages > 1 && (
                <div className="border-t p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      Mostrando {((routesCurrentPage - 1) * routesPerPage) + 1} a {Math.min(routesCurrentPage * routesPerPage, routes.length)} de {routes.length} rutas
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setRoutesCurrentPage(p => Math.max(1, p - 1))}
                        disabled={routesCurrentPage === 1}
                      >
                        Anterior
                      </Button>
                      <span className="text-sm text-muted-foreground">
                        Página {routesCurrentPage} de {totalRoutesPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setRoutesCurrentPage(p => Math.min(totalRoutesPages, p + 1))}
                        disabled={routesCurrentPage === totalRoutesPages}
                      >
                        Siguiente
                      </Button>
                    </div>
                  </div>
                </div>
              )}
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
          title="Gestión de Servicios Trasiego PTYSS" 
        />
      )}

      {activeTab === 'localServices' && (
        <div className="space-y-6">
          {/* Servicios Locales Fijos */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center">
                  <Settings2 className="mr-2 h-5 w-5" />
                  Servicios Locales Fijos
                </div>
              </CardTitle>
              <CardDescription>
                Servicios para cálculo automático en registros locales (TI, Estadia, Retención, Genset)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {localServicesLoading ? (
                <div className="flex justify-center p-4">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : (
                <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead>Precio</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell><Badge variant="outline">CLG097</Badge></TableCell>
                      <TableCell>Customs/TI</TableCell>
                      <TableCell>Customs/TI</TableCell>
                      <TableCell>
                        {editingLocalService === 'CLG097' ? (
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={localServicePrices.CLG097}
                              onChange={(e) => setLocalServicePrices({
                                ...localServicePrices,
                                CLG097: parseFloat(e.target.value) || 0
                              })}
                              className="w-20"
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleSaveLocalService('CLG097')}
                              disabled={additionalServicesLoading}
                            >
                              ✓
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={handleCancelEditLocalService}
                            >
                              ✕
                            </Button>
                          </div>
                        ) : (
                          <span>${localServicePrices.CLG097.toFixed(2)}</span>
                        )}
                      </TableCell>
                      <TableCell><Badge variant="secondary">Fijo</Badge></TableCell>
                      <TableCell><Badge variant="default">Activo</Badge></TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEditLocalService('CLG097')}
                          disabled={editingLocalService !== null && editingLocalService !== 'CLG097'}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell><Badge variant="outline">TRK163</Badge></TableCell>
                      <TableCell>Demurrage/Retención</TableCell>
                      <TableCell>Demurrage/Retención (se cobra después del 3er día)</TableCell>
                      <TableCell>
                        {editingLocalService === 'TRK163' ? (
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={localServicePrices.TRK163}
                              onChange={(e) => setLocalServicePrices({
                                ...localServicePrices,
                                TRK163: parseFloat(e.target.value) || 0
                              })}
                              className="w-20"
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleSaveLocalService('TRK163')}
                              disabled={additionalServicesLoading}
                            >
                              ✓
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={handleCancelEditLocalService}
                            >
                              ✕
                            </Button>
                          </div>
                        ) : (
                          <span>${localServicePrices.TRK163.toFixed(2)}</span>
                        )}
                      </TableCell>
                      <TableCell><Badge variant="secondary">Por día (después del 3er día)</Badge></TableCell>
                      <TableCell><Badge variant="default">Activo</Badge></TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEditLocalService('TRK163')}
                          disabled={editingLocalService !== null && editingLocalService !== 'TRK163'}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell><Badge variant="outline">TRK179</Badge></TableCell>
                      <TableCell>Storage/Estadía</TableCell>
                      <TableCell>Storage/Estadía</TableCell>
                      <TableCell>
                        {editingLocalService === 'TRK179' ? (
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={localServicePrices.TRK179}
                              onChange={(e) => setLocalServicePrices({
                                ...localServicePrices,
                                TRK179: parseFloat(e.target.value) || 0
                              })}
                              className="w-20"
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleSaveLocalService('TRK179')}
                              disabled={additionalServicesLoading}
                            >
                              ✓
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={handleCancelEditLocalService}
                            >
                              ✕
                            </Button>
                          </div>
                        ) : (
                          <span>${localServicePrices.TRK179.toFixed(2)}</span>
                        )}
                      </TableCell>
                      <TableCell><Badge variant="secondary">Fijo</Badge></TableCell>
                      <TableCell><Badge variant="default">Activo</Badge></TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEditLocalService('TRK179')}
                          disabled={editingLocalService !== null && editingLocalService !== 'TRK179'}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell><Badge variant="outline">SLR168</Badge></TableCell>
                      <TableCell>Genset Rental</TableCell>
                      <TableCell>Genset Rental</TableCell>
                      <TableCell>
                        {editingLocalService === 'SLR168' ? (
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={localServicePrices.SLR168}
                              onChange={(e) => setLocalServicePrices({
                                ...localServicePrices,
                                SLR168: parseFloat(e.target.value) || 0
                              })}
                              className="w-20"
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleSaveLocalService('SLR168')}
                              disabled={additionalServicesLoading}
                            >
                              ✓
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={handleCancelEditLocalService}
                            >
                              ✕
                            </Button>
                          </div>
                        ) : (
                          <span>${localServicePrices.SLR168.toFixed(2)}</span>
                        )}
                      </TableCell>
                      <TableCell><Badge variant="secondary">Por día</Badge></TableCell>
                      <TableCell><Badge variant="default">Activo</Badge></TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEditLocalService('SLR168')}
                          disabled={editingLocalService !== null && editingLocalService !== 'SLR168'}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
              )}
            </CardContent>
          </Card>

          <Separator />

          {/* Servicios Trasiego */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center">
                  <Settings2 className="mr-2 h-5 w-5" />
                  Servicios Locales
                </div>
                <Button onClick={() => setShowAddServiceForm(!showAddServiceForm)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar Servicio
                </Button>
              </CardTitle>
              <CardDescription>
                Servicios de locales que se seleccionan manualmente en el Paso 2 de crear prefactura
              </CardDescription>
            </CardHeader>
            <CardContent>
              {showAddServiceForm && (
                <Card className="border-dashed mb-6">
                  <CardHeader>
                    <CardTitle className="text-lg">
                      {editingAdditionalService ? "Editar Servicio Adicional" : "Nuevo Servicio Adicional"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="service-name">Nombre del Servicio *</Label>
                        <Input
                          id="service-name"
                          value={newAdditionalService.name}
                          onChange={(e) => setNewAdditionalService({...newAdditionalService, name: e.target.value})}
                          placeholder="TRK006"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="service-description">Descripción *</Label>
                        <Input
                          id="service-description"
                          value={newAdditionalService.description}
                          onChange={(e) => setNewAdditionalService({...newAdditionalService, description: e.target.value})}
                          placeholder="Descripción del servicio"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="service-price">Precio *</Label>
                        <Input
                          id="service-price"
                          type="number"
                          min="0"
                          step="0.01"
                          value={newAdditionalService.price === 0 ? "" : newAdditionalService.price}
                          onChange={(e) => {
                            const value = e.target.value;
                            setNewAdditionalService({
                              ...newAdditionalService, 
                              price: value === "" ? 0 : parseFloat(value) || 0
                            });
                          }}
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleAddAdditionalService} disabled={additionalServicesLoading}>
                        <Plus className="h-4 w-4 mr-2" />
                        {additionalServicesLoading ? "Guardando..." : (editingAdditionalService ? "Actualizar Servicio" : "Agregar Servicio")}
                      </Button>
                      <Button variant="outline" onClick={handleCancelAddService}>
                        Cancelar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {additionalServicesLoading ? (
                <div className="flex justify-center p-4">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Descripción</TableHead>
                        <TableHead>Precio</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {additionalServices.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                            No hay servicios adicionales registrados
                          </TableCell>
                        </TableRow>
                      ) : (
                        additionalServices.map((service: AdditionalService) => (
                          <TableRow key={service._id}>
                            <TableCell className="font-medium">{service.name}</TableCell>
                            <TableCell>{service.description}</TableCell>
                            <TableCell>${(service.price || 0).toFixed(2)}</TableCell>
                            <TableCell>
                              <Badge variant={service.isActive ? "default" : "secondary"}>
                                {service.isActive ? "Activo" : "Inactivo"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditAdditionalService(service)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteAdditionalService(service._id)}
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
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'containers' && (
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

      {/* Modal de confirmación para eliminar tipo de contenedor */}
      <Dialog open={!!containerTypeToDelete} onOpenChange={() => setContainerTypeToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar eliminación</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>¿Estás seguro de que quieres eliminar el tipo de contenedor?</p>
            {containerTypeToDelete && (
              <p className="font-medium mt-2">
                {containerTypeToDelete.name} ({containerTypeToDelete.code})
              </p>
            )}
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setContainerTypeToDelete(null)}>
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => {
                if (containerTypeToDelete) {
                  handleDeleteContainerType(containerTypeToDelete._id)
                }
              }}
              disabled={containerTypesDeleting}
            >
              Eliminar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Importador de precios */}
      {showPriceImporter && (
        <PTYSSPriceImporter
          onImport={handleImportPrices}
          onClose={() => setShowPriceImporter(false)}
        />
      )}
    </div>
  )
} 