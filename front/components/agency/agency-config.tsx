"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Settings2, Plus, Edit, Trash2, Ship, Anchor, Wrench, MapPin, FileCode, Save, Clock } from "lucide-react"
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
// Removed invalid import - this is Agency config, not PTYSS
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
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Loader2 } from "lucide-react"
import { createApiUrl } from "@/lib/api-config"

export function AgencyConfig() {
  const dispatch = useAppDispatch()
  const { toast } = useToast()
  
  const navieras = useAppSelector(selectAllNavieras)
  const loading = useAppSelector(selectNavieraLoading)
  const error = useAppSelector(selectNavieraError)
  
  // PTYSS Routes state
  const routes = useAppSelector(selectPTYSSRoutes)
  const routesLoading = useAppSelector(selectPTYSSRoutesLoading)
  const routesError = useAppSelector(selectPTYSSRoutesError)

  // Additional Services state (servicios adicionales)
  const additionalServices = useAppSelector(selectAllAdditionalServices)
  const additionalServicesLoading = useAppSelector(selectAdditionalServicesLoading)
  
  // Local Services state (servicios locales fijos)
  const [localServices, setLocalServices] = useState<AdditionalService[]>([])
  const [localServicesLoading, setLocalServicesLoading] = useState(false)
  
  const [showAddNavieraForm, setShowAddNavieraForm] = useState(false)
  const [navieraToDelete, setNavieraToDelete] = useState<Naviera | null>(null)
  const [activeTab, setActiveTab] = useState<'navieras' | 'routes' | 'localRoutes' | 'services' | 'localServices' | 'sapCodes' | 'waitingTimeReasons'>('navieras')

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

  // Estado para SAP Service Codes
  interface SapServiceCode {
    _id?: string;
    code: string;
    name: string;
    description?: string;
    module?: string;
    profitCenter: string;
    activity: string;
    pillar: string;
    buCountry: string;
    serviceCountry: string;
    clientType: string;
    baseUnitMeasure: string;
    incomeRebateCode: string;
  }

  const [sapServiceCodes, setSapServiceCodes] = useState<SapServiceCode[]>([])
  const [editingSapCode, setEditingSapCode] = useState<string | null>(null)
  const [sapCodesLoading, setSapCodesLoading] = useState(false)

  // Waiting Time Reasons state
  interface WaitingTimeReason {
    _id: string;
    name: string;
    description?: string;
    isActive?: boolean;
  }
  const [waitingTimeReasons, setWaitingTimeReasons] = useState<WaitingTimeReason[]>([])
  const [waitingTimeReasonsLoading, setWaitingTimeReasonsLoading] = useState(false)
  const [showAddWTReasonForm, setShowAddWTReasonForm] = useState(false)
  const [editingWTReason, setEditingWTReason] = useState<WaitingTimeReason | null>(null)
  const [newWTReason, setNewWTReason] = useState({ name: '', description: '' })

  // Cargar navieras al montar el componente
  useEffect(() => {
    dispatch(fetchNavieras())
  }, [dispatch])

  // Cargar rutas al montar el componente
  useEffect(() => {
    dispatch(fetchPTYSSRoutes())
  }, [dispatch])

  // Cargar servicios adicionales al montar el componente
  useEffect(() => {
    dispatch(fetchAdditionalServices('agency'))
  }, [dispatch])

  // Cargar servicios locales fijos
  useEffect(() => {
    const fetchLocalServices = async () => {
      setLocalServicesLoading(true)
      try {
        const token = localStorage.getItem('token')
        console.log('🔍 Fetching local services...')
        console.log('🔍 Token:', token ? 'Present' : 'Missing')
        
        const response = await fetch(createApiUrl('/api/local-services'), {
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

  // Cargar SAP Service Codes desde el backend
  useEffect(() => {
    const fetchSapServiceCodes = async () => {
      setSapCodesLoading(true)
      try {
        const token = localStorage.getItem('token')
        const response = await fetch(createApiUrl('/api/sap-service-codes?module=agency'), {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })

        if (response.ok) {
          const data = await response.json()
          if (data.success && data.data && data.data.length > 0) {
            setSapServiceCodes(data.data)
          } else {
            // Si no hay datos, usar valores por defecto y hacer seed
            const seedResponse = await fetch(createApiUrl('/api/sap-service-codes/seed/agency'), {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            })

            if (seedResponse.ok) {
              // Volver a cargar después del seed
              const reloadResponse = await fetch(createApiUrl('/api/sap-service-codes?module=agency'), {
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                }
              })
              if (reloadResponse.ok) {
                const reloadData = await reloadResponse.json()
                if (reloadData.success && reloadData.data) {
                  setSapServiceCodes(reloadData.data)
                }
              }
            }
          }
        }
      } catch (error) {
        console.error('Error loading SAP service codes:', error)
      } finally {
        setSapCodesLoading(false)
      }
    }

    fetchSapServiceCodes()
  }, [])

  // Cargar Waiting Time Reasons
  useEffect(() => {
    const fetchWaitingTimeReasons = async () => {
      setWaitingTimeReasonsLoading(true)
      try {
        const token = localStorage.getItem('token')
        const response = await fetch(createApiUrl('/api/local-services?module=agency&category=waitingTimeReasons'), {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })
        if (response.ok) {
          const data = await response.json()
          setWaitingTimeReasons(data.data?.services || [])
        }
      } catch (error) {
        console.error('Error loading waiting time reasons:', error)
      } finally {
        setWaitingTimeReasonsLoading(false)
      }
    }
    fetchWaitingTimeReasons()
  }, [])

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
          module: 'agency'
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

  // Funciones para Waiting Time Reasons
  const handleAddWTReason = async () => {
    if (!newWTReason.name.trim()) {
      toast({
        title: "Error",
        description: "El nombre del motivo es requerido",
        variant: "destructive"
      })
      return
    }

    setWaitingTimeReasonsLoading(true)
    try {
      const token = localStorage.getItem('token')
      const url = editingWTReason
        ? createApiUrl(`/api/local-services/${editingWTReason._id}`)
        : createApiUrl('/api/local-services')

      const response = await fetch(url, {
        method: editingWTReason ? 'PUT' : 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: newWTReason.name,
          description: newWTReason.description || newWTReason.name,
          module: 'agency',
          category: 'waitingTimeReasons',
          price: 0,
          isActive: true
        })
      })

      if (response.ok) {
        toast({
          title: editingWTReason ? "Motivo actualizado" : "Motivo agregado",
          description: `El motivo "${newWTReason.name}" ha sido ${editingWTReason ? 'actualizado' : 'configurado'} correctamente`,
        })

        // Recargar la lista
        const reloadResponse = await fetch(createApiUrl('/api/local-services?module=agency&category=waitingTimeReasons'), {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })
        if (reloadResponse.ok) {
          const data = await reloadResponse.json()
          setWaitingTimeReasons(data.data?.services || [])
        }

        setNewWTReason({ name: '', description: '' })
        setEditingWTReason(null)
        setShowAddWTReasonForm(false)
      } else {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Error al guardar')
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Error al guardar el motivo",
        variant: "destructive"
      })
    } finally {
      setWaitingTimeReasonsLoading(false)
    }
  }

  const handleEditWTReason = (reason: WaitingTimeReason) => {
    setEditingWTReason(reason)
    setNewWTReason({
      name: reason.name,
      description: reason.description || ''
    })
    setShowAddWTReasonForm(true)
  }

  const handleDeleteWTReason = async (reasonId: string) => {
    if (!confirm('¿Estás seguro de eliminar este motivo?')) return

    setWaitingTimeReasonsLoading(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(createApiUrl(`/api/local-services/${reasonId}`), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        toast({
          title: "Motivo eliminado",
          description: "El motivo ha sido eliminado correctamente",
        })
        setWaitingTimeReasons(prev => prev.filter(r => r._id !== reasonId))
      } else {
        throw new Error('Error al eliminar')
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Error al eliminar el motivo",
        variant: "destructive"
      })
    } finally {
      setWaitingTimeReasonsLoading(false)
    }
  }

  const handleCancelAddWTReason = () => {
    setNewWTReason({ name: '', description: '' })
    setEditingWTReason(null)
    setShowAddWTReasonForm(false)
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
        setLocalServices(prev => prev.map(service => 
          service.name === serviceCode 
            ? { ...service, price: newPrice }
            : service
        ))
        
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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            Configuración Agency
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
              Catálogos
            </Button>
            <Button
              variant={activeTab === 'routes' ? "default" : "outline"}
              className={activeTab === 'routes' ? "bg-blue-600 hover:bg-blue-700" : ""}
              onClick={() => setActiveTab('routes')}
            >
              <MapPin className="h-4 w-4 mr-2" />
              Rutas Agency
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
              Servicios Agency
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
              variant={activeTab === 'sapCodes' ? "default" : "outline"}
              className={activeTab === 'sapCodes' ? "bg-blue-600 hover:bg-blue-700" : ""}
              onClick={() => setActiveTab('sapCodes')}
            >
              <FileCode className="h-4 w-4 mr-2" />
              SAP Service Codes
            </Button>
            <Button
              variant={activeTab === 'waitingTimeReasons' ? "default" : "outline"}
              className={activeTab === 'waitingTimeReasons' ? "bg-orange-600 hover:bg-orange-700" : ""}
              onClick={() => setActiveTab('waitingTimeReasons')}
            >
              <Clock className="h-4 w-4 mr-2" />
              Motivos WT
            </Button>
          </div>
        </CardContent>
      </Card>

      {activeTab === 'navieras' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Gestión de Catálogos Agency</CardTitle>
              <Button onClick={() => setShowAddNavieraForm(!showAddNavieraForm)}>
                <Plus className="h-4 w-4 mr-2" />
                Agregar Catálogo
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
              <CardTitle>Gestión de Rutas Agency</CardTitle>
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
        <Card>
          <CardHeader>
            <CardTitle>Agency Local Routes</CardTitle>
            <CardDescription>Configure local routes for Agency transportation services</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <p className="text-muted-foreground">Local routes configuration coming soon...</p>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'services' && (
        <ServicesManagement 
          module="agency" 
          title="Gestión de Servicios Agency" 
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
                  Servicios Trasiego
                </div>
                <Button onClick={() => setShowAddServiceForm(!showAddServiceForm)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar Servicio
                </Button>
              </CardTitle>
              <CardDescription>
                Servicios de trasiego que se seleccionan manualmente en el Paso 2 de crear prefactura
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

      {/* SAP Service Codes Tab */}
      {activeTab === 'sapCodes' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileCode className="h-5 w-5" />
              SAP Service Codes Configuration
            </CardTitle>
            <CardDescription>
              Configure SAP parameters for Agency service codes (Profit Center, Activity, Pillar, etc.)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {sapCodesLoading && sapServiceCodes.length === 0 ? (
              <div className="flex justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : sapServiceCodes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No SAP service codes configured. Please check the backend connection.
              </div>
            ) : (
            <div className="space-y-6">
              {sapServiceCodes.map((serviceCode) => (
                <Card key={serviceCode.code} className="border-2">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="text-lg font-mono px-3 py-1">
                          {serviceCode.code}
                        </Badge>
                        <span className="font-medium">{serviceCode.name}</span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingSapCode(editingSapCode === serviceCode.code ? null : serviceCode.code)}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        {editingSapCode === serviceCode.code ? 'Cancel' : 'Edit'}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {editingSapCode === serviceCode.code ? (
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor={`${serviceCode.code}-profitCenter`}>Profit Center</Label>
                          <Input
                            id={`${serviceCode.code}-profitCenter`}
                            value={serviceCode.profitCenter}
                            onChange={(e) => {
                              setSapServiceCodes(prev => prev.map(sc =>
                                sc.code === serviceCode.code
                                  ? { ...sc, profitCenter: e.target.value }
                                  : sc
                              ))
                            }}
                            placeholder="PAPANC440"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`${serviceCode.code}-activity`}>Activity</Label>
                          <Input
                            id={`${serviceCode.code}-activity`}
                            value={serviceCode.activity}
                            onChange={(e) => {
                              setSapServiceCodes(prev => prev.map(sc =>
                                sc.code === serviceCode.code
                                  ? { ...sc, activity: e.target.value }
                                  : sc
                              ))
                            }}
                            placeholder="SHP"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`${serviceCode.code}-pillar`}>Pillar</Label>
                          <Input
                            id={`${serviceCode.code}-pillar`}
                            value={serviceCode.pillar}
                            onChange={(e) => {
                              setSapServiceCodes(prev => prev.map(sc =>
                                sc.code === serviceCode.code
                                  ? { ...sc, pillar: e.target.value }
                                  : sc
                              ))
                            }}
                            placeholder="NOPS"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`${serviceCode.code}-buCountry`}>BU Country</Label>
                          <Input
                            id={`${serviceCode.code}-buCountry`}
                            value={serviceCode.buCountry}
                            onChange={(e) => {
                              setSapServiceCodes(prev => prev.map(sc =>
                                sc.code === serviceCode.code
                                  ? { ...sc, buCountry: e.target.value }
                                  : sc
                              ))
                            }}
                            placeholder="PA"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`${serviceCode.code}-serviceCountry`}>Service Country</Label>
                          <Input
                            id={`${serviceCode.code}-serviceCountry`}
                            value={serviceCode.serviceCountry}
                            onChange={(e) => {
                              setSapServiceCodes(prev => prev.map(sc =>
                                sc.code === serviceCode.code
                                  ? { ...sc, serviceCountry: e.target.value }
                                  : sc
                              ))
                            }}
                            placeholder="PA"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`${serviceCode.code}-clientType`}>Client Type</Label>
                          <Input
                            id={`${serviceCode.code}-clientType`}
                            value={serviceCode.clientType}
                            onChange={(e) => {
                              setSapServiceCodes(prev => prev.map(sc =>
                                sc.code === serviceCode.code
                                  ? { ...sc, clientType: e.target.value }
                                  : sc
                              ))
                            }}
                            placeholder="MSCGVA"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`${serviceCode.code}-baseUnitMeasure`}>Base Unit Measure</Label>
                          <Input
                            id={`${serviceCode.code}-baseUnitMeasure`}
                            value={serviceCode.baseUnitMeasure}
                            onChange={(e) => {
                              setSapServiceCodes(prev => prev.map(sc =>
                                sc.code === serviceCode.code
                                  ? { ...sc, baseUnitMeasure: e.target.value }
                                  : sc
                              ))
                            }}
                            placeholder="EA"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`${serviceCode.code}-incomeRebateCode`}>Income Rebate Code</Label>
                          <Input
                            id={`${serviceCode.code}-incomeRebateCode`}
                            value={serviceCode.incomeRebateCode}
                            onChange={(e) => {
                              setSapServiceCodes(prev => prev.map(sc =>
                                sc.code === serviceCode.code
                                  ? { ...sc, incomeRebateCode: e.target.value }
                                  : sc
                              ))
                            }}
                            placeholder="I"
                          />
                        </div>
                        <div className="col-span-full flex justify-end pt-2">
                          <Button
                            onClick={async () => {
                              setSapCodesLoading(true)
                              try {
                                const token = localStorage.getItem('token')
                                const response = await fetch(createApiUrl(`/api/sap-service-codes/${serviceCode.code}`), {
                                  method: 'PUT',
                                  headers: {
                                    'Authorization': `Bearer ${token}`,
                                    'Content-Type': 'application/json'
                                  },
                                  body: JSON.stringify({
                                    name: serviceCode.name,
                                    profitCenter: serviceCode.profitCenter,
                                    activity: serviceCode.activity,
                                    pillar: serviceCode.pillar,
                                    buCountry: serviceCode.buCountry,
                                    serviceCountry: serviceCode.serviceCountry,
                                    clientType: serviceCode.clientType,
                                    baseUnitMeasure: serviceCode.baseUnitMeasure,
                                    incomeRebateCode: serviceCode.incomeRebateCode
                                  })
                                })

                                if (response.ok) {
                                  toast({
                                    title: "Configuration saved",
                                    description: `SAP parameters for ${serviceCode.code} have been updated.`,
                                  })
                                  setEditingSapCode(null)
                                } else {
                                  const errorData = await response.json()
                                  toast({
                                    title: "Error",
                                    description: errorData.message || "Error saving SAP configuration",
                                    variant: "destructive"
                                  })
                                }
                              } catch (error: any) {
                                toast({
                                  title: "Error",
                                  description: error.message || "Error saving SAP configuration",
                                  variant: "destructive"
                                })
                              } finally {
                                setSapCodesLoading(false)
                              }
                            }}
                            className="bg-green-600 hover:bg-green-700"
                            disabled={sapCodesLoading}
                          >
                            <Save className="h-4 w-4 mr-2" />
                            {sapCodesLoading ? 'Saving...' : 'Save Changes'}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Profit Center:</span>
                          <span className="ml-2 font-mono">{serviceCode.profitCenter}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Activity:</span>
                          <span className="ml-2 font-mono">{serviceCode.activity}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Pillar:</span>
                          <span className="ml-2 font-mono">{serviceCode.pillar}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">BU Country:</span>
                          <span className="ml-2 font-mono">{serviceCode.buCountry}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Service Country:</span>
                          <span className="ml-2 font-mono">{serviceCode.serviceCountry}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Client Type:</span>
                          <span className="ml-2 font-mono">{serviceCode.clientType}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Base Unit:</span>
                          <span className="ml-2 font-mono">{serviceCode.baseUnitMeasure}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Income Rebate:</span>
                          <span className="ml-2 font-mono">{serviceCode.incomeRebateCode}</span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> These parameters are used when generating SAP XML invoices.
                  Changes will affect all new invoices generated after saving.
                </p>
              </div>
            </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Waiting Time Reasons Tab */}
      {activeTab === 'waitingTimeReasons' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Motivos de Waiting Time
                </CardTitle>
                <CardDescription>
                  Configure los motivos de espera que se pueden seleccionar al editar servicios
                </CardDescription>
              </div>
              <Button onClick={() => setShowAddWTReasonForm(!showAddWTReasonForm)}>
                <Plus className="h-4 w-4 mr-2" />
                Agregar Motivo
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {showAddWTReasonForm && (
              <Card className="border-dashed">
                <CardHeader>
                  <CardTitle className="text-lg">
                    {editingWTReason ? "Editar Motivo" : "Nuevo Motivo de Waiting Time"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="wt-reason-name">Nombre del Motivo *</Label>
                      <Input
                        id="wt-reason-name"
                        value={newWTReason.name}
                        onChange={(e) => setNewWTReason({...newWTReason, name: e.target.value})}
                        placeholder="Ej: Retraso en vuelo"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="wt-reason-description">Descripción</Label>
                      <Input
                        id="wt-reason-description"
                        value={newWTReason.description}
                        onChange={(e) => setNewWTReason({...newWTReason, description: e.target.value})}
                        placeholder="Descripción opcional"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleAddWTReason} disabled={waitingTimeReasonsLoading}>
                      <Plus className="h-4 w-4 mr-2" />
                      {waitingTimeReasonsLoading ? "Guardando..." : (editingWTReason ? "Actualizar Motivo" : "Agregar Motivo")}
                    </Button>
                    <Button variant="outline" onClick={handleCancelAddWTReason}>
                      Cancelar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {waitingTimeReasonsLoading && waitingTimeReasons.length === 0 ? (
              <div className="flex justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : waitingTimeReasons.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No hay motivos de waiting time configurados</p>
                <p className="text-sm">Agrega motivos para poder seleccionarlos al editar servicios</p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {waitingTimeReasons.map((reason) => (
                      <TableRow key={reason._id}>
                        <TableCell className="font-medium">{reason.name}</TableCell>
                        <TableCell>{reason.description || '-'}</TableCell>
                        <TableCell>
                          <Badge variant={reason.isActive !== false ? "default" : "secondary"}>
                            {reason.isActive !== false ? "Activo" : "Inactivo"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditWTReason(reason)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteWTReason(reason._id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <p className="text-sm text-orange-800">
                <strong>Nota:</strong> Los motivos configurados aquí aparecerán en el dropdown "Motivo de Waiting Time"
                al editar servicios en la sección de registros.
              </p>
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
    </div>
  )
} 