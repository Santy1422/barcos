"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { 
  Car, Search, Eye, FileText, Calendar, 
  User, Loader2, Trash2, Edit, RefreshCw, MapPin, ArrowRight, Paperclip,
  Clock, Save, X, Ship, Users, Plane, Building, Plus, CheckCircle, AlertTriangle
} from "lucide-react"
import { TimeInput } from "@/components/ui/time-input"
import { useAgencyServices } from "@/lib/features/agencyServices/useAgencyServices"
import { useAgencyCatalogs } from "@/lib/features/agencyServices/useAgencyCatalogs"
import { useAgencyRoutes } from "@/lib/features/agencyServices/useAgencyRoutes"
import { useToast } from "@/hooks/use-toast"
import { format } from "date-fns"
import Link from "next/link"

export function AgencyRecords() {
  const { toast } = useToast()
  const {
    services,
    loading,
    error,
    filters,
    totalServices,
    currentPage,
    totalPages,
    fetchServices,
    updateService,
    updateStatus,
    deleteService,
    setFilters,
    clearFilters,
    openViewModal,
    openEditModal,
    openStatusModal,
    closeModals,
    modals
  } = useAgencyServices()

  const {
    locations,
    nationalities,
    ranks,
    crewStatuses,
    vessels,
    transportCompanies,
    drivers,
    fetchGroupedCatalogs
  } = useAgencyCatalogs()

  const {
    routes,
    fetchActiveRoutes,
    findRouteByLocations
  } = useAgencyRoutes()

  // Local state
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [clientFilter, setClientFilter] = useState("all")
  const [vesselFilter, setVesselFilter] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [selectedService, setSelectedService] = useState<any>(null)

  // Column filters
  const [dateFilter, setDateFilter] = useState("")
  const [crewFilter, setCrewFilter] = useState("")
  const [routeFilter, setRouteFilter] = useState("")
  const [moveTypeFilter, setMoveTypeFilter] = useState("all")
  const [flightFilter, setFlightFilter] = useState("")
  const [commentsFilter, setCommentsFilter] = useState("")
  const [transportFilter, setTransportFilter] = useState("")
  
  // Edit modal state
  const [editFormData, setEditFormData] = useState({
    // Basic service info
    pickupDate: '',
    pickupTime: '',
    pickupLocation: '',
    dropoffLocation: '',
    returnDropoffLocation: '',
    
    // Vessel info
    vessel: '',
    voyage: '',
    
    // Move type and passenger count
    moveType: 'SINGLE' as 'RT' | 'SINGLE' | 'INTERNAL' | 'BAGS_CLAIM' | 'DOCUMENTATION',
    passengerCount: 1,
    
    // Transport info
    transportCompany: '',
    driver: '',
    
    // Service details
    waitingTime: 0,
    comments: '',
    
    // Crew members (new structure)
    crewMembers: [] as Array<{
      id: string;
      name: string;
      nationality: string;
      crewRank: string;
      crewCategory: string;
      status: 'Visit' | 'On Signer';
      flight: string;
    }>,
    
    // Legacy crew info (for backward compatibility)
    crewName: '',
    crewRank: '',
    nationality: '',
    
    // Client
    clientId: ''
  })
  const [editFormErrors, setEditFormErrors] = useState<Record<string, string>>({})

  // Load catalogs on component mount (services are loaded by the filters useEffect)
  useEffect(() => {
    fetchGroupedCatalogs()
    fetchActiveRoutes()
  }, [fetchGroupedCatalogs, fetchActiveRoutes])

  // Load service data when edit modal opens
  useEffect(() => {
    if (modals?.showEditModal && selectedService) {
      // Convert waiting time from minutes to hours for display
      const waitingTimeInHours = selectedService.waitingTime ? selectedService.waitingTime / 60 : 0
      
      setEditFormData({
        // Basic service info
        pickupDate: selectedService.pickupDate ? (() => {
          if (typeof selectedService.pickupDate === 'string') {
            // Si es string, extraer solo la parte de fecha
            return selectedService.pickupDate.split('T')[0];
          } else {
            // Si es Date object, crear una fecha local sin cambios de zona horaria
            const date = new Date(selectedService.pickupDate);
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
          }
        })() : '',
        pickupTime: selectedService.pickupTime || '',
        pickupLocation: selectedService.pickupLocation || '',
        dropoffLocation: selectedService.dropoffLocation || '',
        returnDropoffLocation: selectedService.returnDropoffLocation || '',
        
        // Vessel info
        vessel: selectedService.vessel || '',
        voyage: selectedService.voyage || '',
        
        // Move type and passenger count
        moveType: selectedService.moveType || 'SINGLE',
        passengerCount: selectedService.passengerCount || 1,
        
        // Transport info
        transportCompany: selectedService.transportCompany || '',
        driver: selectedService.driver || selectedService.driverName || '',
        
        // Service details
        waitingTime: waitingTimeInHours,
        comments: selectedService.comments || '',
        
        // Crew members (new structure)
        crewMembers: selectedService.crewMembers || [],
        
        // Legacy crew info (for backward compatibility)
        crewName: selectedService.crewName || '',
        crewRank: selectedService.crewRank || '',
        nationality: selectedService.nationality || '',
        
        // Client
        clientId: typeof selectedService.clientId === 'string' ? selectedService.clientId : selectedService.clientId?._id || ''
      })
      setEditFormErrors({})
    }
  }, [modals?.showEditModal, selectedService])

  // Check if any column filter is active (requires all data loaded)
  const hasColumnFilters = !!(dateFilter || crewFilter || routeFilter || moveTypeFilter !== "all" || flightFilter || commentsFilter || transportFilter)

  // Apply filters
  useEffect(() => {
    const filterObj: any = {}

    if (searchTerm) {
      filterObj.search = searchTerm
    }
    if (statusFilter !== "all") {
      // If filtering by "completed", include prefacturado, facturado and nota_de_credito as well
      if (statusFilter === "completed") {
        filterObj.statusIn = ['completed', 'prefacturado', 'facturado', 'nota_de_credito']
      } else {
        filterObj.status = statusFilter
      }
    }
    if (clientFilter !== "all") {
      filterObj.clientId = clientFilter
    }
    if (vesselFilter) {
      filterObj.vessel = vesselFilter
    }
    if (startDate) {
      filterObj.startDate = startDate
    }
    if (endDate) {
      // Set end of day for the endDate so it includes the full day
      filterObj.endDate = endDate + 'T23:59:59.999Z'
    }

    setFilters(filterObj)
    // When column filters are active, load all records to filter client-side
    const limit = hasColumnFilters ? 500 : 20
    fetchServices({ page: 1, limit, filters: filterObj })
  }, [searchTerm, statusFilter, clientFilter, vesselFilter, startDate, endDate, hasColumnFilters, setFilters, fetchServices])

  const handleClearFilters = () => {
    setSearchTerm("")
    setStatusFilter("all")
    setClientFilter("all")
    setVesselFilter("")
    setStartDate("")
    setEndDate("")
    setDateFilter("")
    setCrewFilter("")
    setRouteFilter("")
    setMoveTypeFilter("all")
    setFlightFilter("")
    setCommentsFilter("")
    setTransportFilter("")
    clearFilters()
    fetchServices({ page: 1, limit: 20 })
  }

  // Safe string conversion for filtering - handles numbers, objects, arrays, etc.
  const toStr = (val: any): string => {
    if (val == null) return ''
    if (typeof val === 'string') return val
    return String(val)
  }

  // Client-side filtering for column filters
  const filteredServices = (services && Array.isArray(services) ? services : []).filter((service) => {
    if (!service) return false

    try {
      // Global search
      if (searchTerm) {
        const term = searchTerm.toLowerCase()
        const matchesSearch =
          (service.crewMembers?.some((m: any) => toStr(m?.name).toLowerCase().includes(term))) ||
          toStr(service.crewName).toLowerCase().includes(term) ||
          toStr(service.vessel).toLowerCase().includes(term) ||
          toStr(service.pickupLocation).toLowerCase().includes(term) ||
          toStr(service.dropoffLocation).toLowerCase().includes(term)
        if (!matchesSearch) return false
      }

      // Status filter
      if (statusFilter !== "all" && service.status !== statusFilter) return false

      // Vessel filter
      if (vesselFilter && !toStr(service.vessel).toLowerCase().includes(vesselFilter.toLowerCase())) return false

      // Date filter
      if (dateFilter) {
        const dateStr = (formatSafeDate(service.pickupDate) || '').toLowerCase()
        const timeStr = toStr(service.pickupTime).toLowerCase()
        if (!dateStr.includes(dateFilter.toLowerCase()) && !timeStr.includes(dateFilter.toLowerCase())) return false
      }

      // Crew filter
      if (crewFilter) {
        const term = crewFilter.toLowerCase()
        const matchesCrew =
          service.crewMembers?.some((m: any) =>
            toStr(m?.name).toLowerCase().includes(term) ||
            toStr(m?.crewRank).toLowerCase().includes(term) ||
            toStr(m?.nationality).toLowerCase().includes(term)
          ) ||
          toStr(service.crewName).toLowerCase().includes(term)
        if (!matchesCrew) return false
      }

      // Route filter
      if (routeFilter) {
        const term = routeFilter.toLowerCase()
        if (
          !toStr(service.pickupLocation).toLowerCase().includes(term) &&
          !toStr(service.dropoffLocation).toLowerCase().includes(term) &&
          !toStr(service.returnDropoffLocation).toLowerCase().includes(term)
        ) return false
      }

      // Move type filter
      if (moveTypeFilter !== "all" && service.moveType !== moveTypeFilter) return false

      // Flight filter
      if (flightFilter) {
        const term = flightFilter.toLowerCase()
        const matchesFlight = service.crewMembers?.some((m: any) =>
          toStr(m?.flight).toLowerCase().includes(term)
        )
        if (!matchesFlight) return false
      }

      // Comments filter
      if (commentsFilter) {
        const term = commentsFilter.toLowerCase()
        if (
          !toStr(service.comments).toLowerCase().includes(term) &&
          !toStr(service.notes).toLowerCase().includes(term)
        ) return false
      }

      // Transport/Driver filter
      if (transportFilter) {
        const term = transportFilter.toLowerCase()
        if (
          !toStr(service.transportCompany).toLowerCase().includes(term) &&
          !toStr(service.driver).toLowerCase().includes(term)
        ) return false
      }

      return true
    } catch (error) {
      console.error('Error filtering service:', service._id, error)
      return true // Include the service if filtering fails
    }
  })

  const handleStatusChange = async (serviceId: string, newStatus: string) => {
    try {
      // Find the service to validate
      const service = services.find(s => s._id === serviceId)
      
      // Validate Round Trip services before marking as completed
      if (newStatus === 'completed' && service?.moveType === 'RT' && !service?.returnDropoffLocation) {
        toast({
          title: "Validation Error",
          description: "Round Trip services require a Return Drop-off Location before marking as completed. Please edit the service first.",
          variant: "destructive",
        })
        return
      }
      
      console.log('Changing status:', { serviceId, newStatus })
      await updateStatus({ id: serviceId, status: newStatus as any })
      toast({
        title: "Success",
        description: "Service status updated successfully",
      })
      closeModals()
      fetchServices({ page: currentPage, limit: 20, filters })
    } catch (error) {
      console.error('Status change error:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update service status",
        variant: "destructive",
      })
    }
  }

  const handleOpenViewModal = (serviceId: string) => {
    const service = services.find(s => s._id === serviceId)
    if (service) {
      setSelectedService(service)
      openViewModal(serviceId)
    }
  }

  const handleOpenEditModal = (serviceId: string) => {
    const service = services.find(s => s._id === serviceId)
    if (service) {
      setSelectedService(service)
      openEditModal(serviceId)
    }
  }

  const handleOpenStatusModal = (serviceId: string) => {
    const service = services.find(s => s._id === serviceId)
    if (service) {
      setSelectedService(serviceId)
      openStatusModal(serviceId)
    }
  }

  const handleDeleteService = async (serviceId: string) => {
    if (!confirm("Are you sure you want to delete this service?")) return
    
    try {
      await deleteService(serviceId)
      toast({
        title: "Success",
        description: "Service deleted successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete service",
        variant: "destructive",
      })
    }
  }

  // Get locations with site types only
  const getLocationsWithSiteType = () => {
    return locations.filter(loc => 
      loc.metadata?.siteTypeId && loc.metadata?.siteTypeName
    )
  }

  // Get valid pickup locations based on selected dropoff
  const getValidPickupLocations = () => {
    const locationsWithSiteType = getLocationsWithSiteType()
    
    if (!editFormData.dropoffLocation) {
      return locationsWithSiteType
    }
    
    // Find the selected dropoff location's site type
    const dropoffLocation = locations.find(loc => loc.name === editFormData.dropoffLocation)
    if (!dropoffLocation || !dropoffLocation.metadata?.siteTypeName) {
      return []
    }
    
    const dropoffSiteType = dropoffLocation.metadata.siteTypeName
    
    // Find routes that end with this site type
    const validRoutes = routes.filter(
      route => (route.dropoffSiteType || route.dropoffLocation)?.toUpperCase() === dropoffSiteType.toUpperCase() && route.isActive
    )
    
    // Get valid pickup site types from routes
    const validPickupSiteTypes = validRoutes.map(route => 
      (route.pickupSiteType || route.pickupLocation)?.toUpperCase()
    )
    
    // Return locations whose site type matches valid pickup site types
    return locationsWithSiteType.filter(loc =>
      loc.metadata?.siteTypeName && 
      validPickupSiteTypes.includes(loc.metadata.siteTypeName.toUpperCase())
    )
  }

  // Get valid dropoff locations based on selected pickup
  const getValidDropoffLocations = () => {
    const locationsWithSiteType = getLocationsWithSiteType()
    
    if (!editFormData.pickupLocation) {
      return locationsWithSiteType
    }
    
    // Find the selected pickup location's site type
    const pickupLocation = locations.find(loc => loc.name === editFormData.pickupLocation)
    if (!pickupLocation || !pickupLocation.metadata?.siteTypeName) {
      return []
    }
    
    const pickupSiteType = pickupLocation.metadata.siteTypeName
    
    // Find routes that start with this site type
    const validRoutes = routes.filter(
      route => (route.pickupSiteType || route.pickupLocation)?.toUpperCase() === pickupSiteType.toUpperCase() && route.isActive
    )
    
    // Get valid dropoff site types from routes
    const validDropoffSiteTypes = validRoutes.map(route => 
      (route.dropoffSiteType || route.dropoffLocation)?.toUpperCase()
    )
    
    // Return locations whose site type matches valid dropoff site types
    return locationsWithSiteType.filter(loc =>
      loc.metadata?.siteTypeName && 
      validDropoffSiteTypes.includes(loc.metadata.siteTypeName.toUpperCase())
    )
  }

  // Get valid return dropoff locations for Round Trip (based on first dropoff location)
  const getValidReturnDropoffLocations = () => {
    const locationsWithSiteType = getLocationsWithSiteType()
    
    if (!editFormData.dropoffLocation) {
      return locationsWithSiteType
    }
    
    // Find the selected dropoff location's site type (this becomes the pickup for return trip)
    const dropoffLocation = locations.find(loc => loc.name === editFormData.dropoffLocation)
    if (!dropoffLocation || !dropoffLocation.metadata?.siteTypeName) {
      return []
    }
    
    const dropoffSiteType = dropoffLocation.metadata.siteTypeName
    
    // Find routes that start with this site type (for return trip)
    const validRoutes = routes.filter(
      route => (route.pickupSiteType || route.pickupLocation)?.toUpperCase() === dropoffSiteType.toUpperCase() && route.isActive
    )
    
    // Get valid dropoff site types from routes
    const validDropoffSiteTypes = validRoutes.map(route => 
      (route.dropoffSiteType || route.dropoffLocation)?.toUpperCase()
    )
    
    // Return locations whose site type matches valid dropoff site types
    return locationsWithSiteType.filter(loc =>
      loc.metadata?.siteTypeName && 
      validDropoffSiteTypes.includes(loc.metadata.siteTypeName.toUpperCase())
    )
  }

  // Validate form data
  const validateEditForm = (): boolean => {
    const errors: Record<string, string> = {}
    
    // Required fields validation
    if (!editFormData.pickupDate) {
      errors.pickupDate = 'Pickup date is required'
    }
    
    if (!editFormData.pickupTime) {
      errors.pickupTime = 'Pickup time is required'
    }
    
    if (!editFormData.pickupLocation) {
      errors.pickupLocation = 'Pickup location is required'
    }
    
    if (!editFormData.dropoffLocation) {
      errors.dropoffLocation = 'Drop-off location is required'
    }
    
    // Vessel is optional - no validation needed
    
    // Validate return dropoff location for Round Trip
    if (editFormData.moveType === 'RT' && editFormData.returnDropoffLocation) {
      const dropoffLoc = locations.find(loc => loc.name === editFormData.dropoffLocation)
      const returnDropoffLoc = locations.find(loc => loc.name === editFormData.returnDropoffLocation)
      
      if (!dropoffLoc?.metadata?.siteTypeName || !returnDropoffLoc?.metadata?.siteTypeName) {
        errors.returnDropoffLocation = 'Selected locations do not have site types assigned'
      } else {
        const route = findRouteByLocations(
          dropoffLoc.metadata.siteTypeName,
          returnDropoffLoc.metadata.siteTypeName
        )
        
        if (!route) {
          errors.returnDropoffLocation = `No existe una ruta para el return trip: ${dropoffLoc.metadata.siteTypeName} → ${returnDropoffLoc.metadata.siteTypeName}`
        }
      }
    }

    // Validate crew members
    if (editFormData.crewMembers.length === 0) {
      errors.crewMembers = 'At least one crew member is required'
    } else {
      // Validate each crew member has all required fields
      editFormData.crewMembers.forEach((member, index) => {
        if (!member.name.trim()) {
          errors[`crewMember_${index}_name`] = `Crew member ${index + 1} name is required`
        }
        if (!member.nationality) {
          errors[`crewMember_${index}_nationality`] = `Crew member ${index + 1} nationality is required`
        }
        if (!member.crewRank) {
          errors[`crewMember_${index}_crewRank`] = `Crew member ${index + 1} crew rank is required`
        }
        if (!member.crewCategory) {
          errors[`crewMember_${index}_crewCategory`] = `Crew member ${index + 1} crew category is required`
        }
        // Flight is optional - no validation needed
      })
    }
    
    setEditFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Validate return dropoff location for Round Trip
  const validateReturnDropoffLocation = (): boolean => {
    if (!selectedService) return false
    
    // If not Round Trip or no return dropoff location selected, it's valid (optional)
    if (editFormData.moveType !== 'RT' || !editFormData.returnDropoffLocation) {
      return true
    }
    
    // Validate that the return route exists
    const dropoffLoc = locations.find(loc => loc.name === editFormData.dropoffLocation)
    const returnDropoffLoc = locations.find(loc => loc.name === editFormData.returnDropoffLocation)
    
    if (!dropoffLoc?.metadata?.siteTypeName || !returnDropoffLoc?.metadata?.siteTypeName) {
      setEditFormErrors(prev => ({
        ...prev,
        returnDropoffLocation: 'Selected locations do not have site types assigned'
      }))
      return false
    }
    
    const route = findRouteByLocations(
      dropoffLoc.metadata.siteTypeName,
      returnDropoffLoc.metadata.siteTypeName
    )
    
    if (!route) {
      setEditFormErrors(prev => ({
        ...prev,
        returnDropoffLocation: `No existe una ruta para el return trip: ${dropoffLoc.metadata.siteTypeName} → ${returnDropoffLoc.metadata.siteTypeName}`
      }))
      return false
    }
    
    setEditFormErrors(prev => {
      const newErrors = { ...prev }
      delete newErrors.returnDropoffLocation
      return newErrors
    })
    return true
  }

  const handleEditService = async () => {
    if (!selectedService) return
    
    // Validate form data
    if (!validateEditForm()) {
      toast({
        title: "Validation Error",
        description: "Please fix the errors and try again",
        variant: "destructive",
      })
      return
    }
    
    try {
      // Convert waiting time from hours to minutes for backend
      const waitingTimeInMinutes = Math.round(editFormData.waitingTime * 60)
      
      await updateService({
        id: selectedService._id,
        updateData: {
          // Basic service info
          pickupDate: editFormData.pickupDate,
          pickupTime: editFormData.pickupTime,
          pickupLocation: editFormData.pickupLocation,
          dropoffLocation: editFormData.dropoffLocation,
          returnDropoffLocation: editFormData.moveType === 'RT' ? editFormData.returnDropoffLocation : undefined,
          
          // Vessel info
          vessel: editFormData.vessel,
          voyage: editFormData.voyage,
          
          // Move type and passenger count (calculated automatically)
          moveType: editFormData.moveType,
          passengerCount: editFormData.crewMembers.length || 1,
          
          // Transport info
          transportCompany: editFormData.transportCompany,
          driver: editFormData.driver,
          
          // Service details
          waitingTime: waitingTimeInMinutes, // Guardar en minutos (backend espera minutos)
          comments: editFormData.comments,
          
          // Crew members (new structure)
          crewMembers: editFormData.crewMembers,
          
          // Legacy crew info (for backward compatibility)
          crewName: editFormData.crewName,
          crewRank: editFormData.crewRank,
          nationality: editFormData.nationality,
          
          // Client
          clientId: editFormData.clientId
        }
      })
      
      toast({
        title: "Success",
        description: "Service updated successfully",
      })
      
      closeModals()
      fetchServices({ page: currentPage, limit: 20, filters })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update service",
        variant: "destructive",
      })
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'tentative':
        return 'bg-purple-100 text-purple-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'in_progress':
        return 'bg-blue-100 text-blue-800'
      case 'completed':
      case 'prefacturado':
      case 'facturado':
      case 'nota_de_credito':
        return 'bg-green-100 text-green-800'
      case 'cancelled':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'tentative':
        return 'Tentative'
      case 'pending':
        return 'Pending'
      case 'in_progress':
        return 'In Progress'
      case 'completed':
        return 'Completed'
      case 'prefacturado':
        return 'Prefacturado'
      case 'facturado':
        return 'Facturado'
      case 'nota_de_credito':
        return 'Nota de Crédito'
      case 'cancelled':
        return 'Cancelled'
      default:
        return status
    }
  }

  const formatSafeDate = (dateValue: any) => {
    if (!dateValue) return 'N/A'

    try {
      let year: number, month: number, day: number

      // Si ya es una fecha válida
      if (dateValue instanceof Date && !isNaN(dateValue.getTime())) {
        year = dateValue.getFullYear()
        // Validate year is within reasonable range (1900-2100)
        if (year < 1900 || year > 2100) return 'N/A'
        return format(dateValue, 'MMM dd, yyyy')
      }

      // Si es string, extraer solo la parte de fecha para evitar cambios de zona horaria
      if (typeof dateValue === 'string') {
        const dateOnly = dateValue.split('T')[0] // Extraer solo la parte de fecha
        ;[year, month, day] = dateOnly.split('-').map(Number)
        // Validate year is within reasonable range (1900-2100)
        if (year < 1900 || year > 2100) return 'N/A'
        const date = new Date(year, month - 1, day)
        return format(date, 'MMM dd, yyyy')
      }

      // Si es otro tipo, intentar parsearlo
      const date = new Date(dateValue)
      if (isNaN(date.getTime())) {
        return 'N/A'
      }

      // Validate year is within reasonable range (1900-2100)
      year = date.getFullYear()
      if (year < 1900 || year > 2100) return 'N/A'

      return format(date, 'MMM dd, yyyy')
    } catch (error) {
      return 'N/A'
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-500 flex items-center justify-center">
              <Car className="h-6 w-6 text-white" />
            </div>
            Agency Services
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage transportation services and crew transfers
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/agency/services">
            <Button>
              <User className="mr-2 h-4 w-4" />
              New Service
            </Button>
          </Link>
          <Button variant="outline" onClick={() => fetchServices({ page: currentPage, limit: 20 })}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-6">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{totalServices || 0}</div>
            <p className="text-xs text-muted-foreground">Total Services</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-purple-600">
              {services && Array.isArray(services) ? services.filter(s => s?.status === 'tentative').length : 0}
            </div>
            <p className="text-xs text-muted-foreground">Tentative</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">
              {services && Array.isArray(services) ? services.filter(s => s?.status === 'pending').length : 0}
            </div>
            <p className="text-xs text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">
              {services && Array.isArray(services) ? services.filter(s => s?.status === 'in_progress').length : 0}
            </div>
            <p className="text-xs text-muted-foreground">In Progress</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">
              {services && Array.isArray(services) ? services.filter(s => ['completed', 'prefacturado', 'facturado', 'nota_de_credito'].includes(s?.status)).length : 0}
            </div>
            <p className="text-xs text-muted-foreground">Completed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">
              {services && Array.isArray(services) ? services.filter(s => s?.status === 'cancelled').length : 0}
            </div>
            <p className="text-xs text-muted-foreground">Cancelled</p>
          </CardContent>
        </Card>
      </div>

      {/* Global Search & Filters */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex gap-4 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search crew, vessel, location..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>

            <Button variant="outline" onClick={handleClearFilters}>
              Clear Filters
            </Button>
          </div>

          {/* Date Range Filter */}
          <div className="flex gap-4 items-center">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Label className="text-sm font-medium whitespace-nowrap">Date Range:</Label>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-40"
                placeholder="From"
              />
              <span className="text-sm text-muted-foreground">to</span>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-40"
                min={startDate || undefined}
                placeholder="To"
              />
            </div>
            {(startDate || endDate) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setStartDate(""); setEndDate("") }}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Services Table */}
      <Card>
        <CardHeader>
          <CardTitle>Services ({filteredServices.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="py-3 font-semibold text-xs uppercase tracking-wider">Date</TableHead>
                  <TableHead className="py-3 font-semibold text-xs uppercase tracking-wider">Crew</TableHead>
                  <TableHead className="py-3 font-semibold text-xs uppercase tracking-wider">Vessel</TableHead>
                  <TableHead className="py-3 font-semibold text-xs uppercase tracking-wider">Route</TableHead>
                  <TableHead className="py-3 font-semibold text-xs uppercase tracking-wider">Move Type</TableHead>
                  <TableHead className="py-3 font-semibold text-xs uppercase tracking-wider">Flight</TableHead>
                  <TableHead className="py-3 font-semibold text-xs uppercase tracking-wider">Comments</TableHead>
                  <TableHead className="py-3 font-semibold text-xs uppercase tracking-wider">Transport</TableHead>
                  <TableHead className="py-3 font-semibold text-xs uppercase tracking-wider">Status</TableHead>
                  <TableHead className="py-3 font-semibold text-xs uppercase tracking-wider">Actions</TableHead>
                </TableRow>
                <TableRow className="border-b bg-background">
                  <TableHead className="py-1.5 px-2">
                    <Input
                      placeholder="Filter date..."
                      value={dateFilter}
                      onChange={(e) => setDateFilter(e.target.value)}
                      className="h-7 text-xs bg-muted/30 border-dashed"
                    />
                  </TableHead>
                  <TableHead className="py-1.5 px-2">
                    <Input
                      placeholder="Filter crew..."
                      value={crewFilter}
                      onChange={(e) => setCrewFilter(e.target.value)}
                      className="h-7 text-xs bg-muted/30 border-dashed"
                    />
                  </TableHead>
                  <TableHead className="py-1.5 px-2">
                    <Input
                      placeholder="Filter vessel..."
                      value={vesselFilter}
                      onChange={(e) => setVesselFilter(e.target.value)}
                      className="h-7 text-xs bg-muted/30 border-dashed"
                    />
                  </TableHead>
                  <TableHead className="py-1.5 px-2">
                    <Input
                      placeholder="Filter route..."
                      value={routeFilter}
                      onChange={(e) => setRouteFilter(e.target.value)}
                      className="h-7 text-xs bg-muted/30 border-dashed"
                    />
                  </TableHead>
                  <TableHead className="py-1.5 px-2">
                    <Select value={moveTypeFilter} onValueChange={setMoveTypeFilter}>
                      <SelectTrigger className="h-7 text-xs bg-muted/30 border-dashed">
                        <SelectValue placeholder="All" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="SINGLE">Single</SelectItem>
                        <SelectItem value="RT">Round Trip</SelectItem>
                        <SelectItem value="INTERNAL">Internal</SelectItem>
                        <SelectItem value="BAGS_CLAIM">Bags Claim</SelectItem>
                        <SelectItem value="DOCUMENTATION">Documentation</SelectItem>
                        <SelectItem value="NO_SHOW">No Show</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableHead>
                  <TableHead className="py-1.5 px-2">
                    <Input
                      placeholder="Filter flight..."
                      value={flightFilter}
                      onChange={(e) => setFlightFilter(e.target.value)}
                      className="h-7 text-xs bg-muted/30 border-dashed"
                    />
                  </TableHead>
                  <TableHead className="py-1.5 px-2">
                    <Input
                      placeholder="Filter..."
                      value={commentsFilter}
                      onChange={(e) => setCommentsFilter(e.target.value)}
                      className="h-7 text-xs bg-muted/30 border-dashed"
                    />
                  </TableHead>
                  <TableHead className="py-1.5 px-2">
                    <Input
                      placeholder="Filter..."
                      value={transportFilter}
                      onChange={(e) => setTransportFilter(e.target.value)}
                      className="h-7 text-xs bg-muted/30 border-dashed"
                    />
                  </TableHead>
                  <TableHead className="py-1.5 px-2">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="h-7 text-xs bg-muted/30 border-dashed">
                        <SelectValue placeholder="All" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="tentative">Tentative</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableHead>
                  <TableHead className="py-1.5 px-2" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={10} className="h-24 text-center">
                      <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                      Loading services...
                    </TableCell>
                  </TableRow>
                ) : filteredServices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="h-24 text-center">
                      No services found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredServices.map((service) => (
                    <TableRow key={service._id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {formatSafeDate(service.pickupDate)}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {service.pickupTime || 'N/A'}
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="text-sm space-y-0.5">
                          {service?.crewMembers && Array.isArray(service.crewMembers) && service.crewMembers.length > 0 ? (
                            service.crewMembers.map((m: any, i: number) => (
                              <div key={i} className="font-medium leading-tight">
                                {m.name || '-'}
                              </div>
                            ))
                          ) : (
                            <div className="font-medium">{service.crewName || '-'}</div>
                          )}
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="font-medium">{service.vessel || '-'}</div>
                        {service.voyage && (
                          <div className="text-sm text-muted-foreground">
                            Voyage: {service.voyage}
                          </div>
                        )}
                      </TableCell>

                      <TableCell>
                        <div className="text-sm">
                          <div className="flex items-center">
                            <MapPin className="h-3 w-3 mr-1" />
                            {service.pickupLocation}
                            <ArrowRight className="h-3 w-3 mx-2" />
                            {service.dropoffLocation}
                          </div>
                          {service.moveType === 'RT' && service.returnDropoffLocation && (
                            <div className="flex items-center mt-1 text-xs text-muted-foreground">
                              <MapPin className="h-3 w-3 mr-1" />
                              {service.dropoffLocation}
                              <ArrowRight className="h-3 w-3 mx-2" />
                              {service.returnDropoffLocation}
                              <span className="ml-2 text-blue-600 font-medium">(Return)</span>
                            </div>
                          )}
                        </div>
                      </TableCell>

                      <TableCell>
                        <Badge variant="outline" className="font-medium">
                          {service.moveType === 'RT' ? 'Round Trip' :
                           service.moveType === 'SINGLE' ? 'Single' :
                           service.moveType === 'INTERNAL' ? 'Internal' :
                           service.moveType === 'BAGS_CLAIM' ? 'Bags Claim' :
                           service.moveType === 'DOCUMENTATION' ? 'Documentation' :
                           service.moveType === 'NO_SHOW' ? 'No Show' : 'Single'}
                        </Badge>
                      </TableCell>

                      {/* Flight column */}
                      <TableCell>
                        <div className="text-sm">
                          {service?.crewMembers && Array.isArray(service.crewMembers) && service.crewMembers.length > 0 ? (
                            <>
                              {service.crewMembers[0].flight ? (
                                <div className="flex items-center gap-1">
                                  <Plane className="h-3 w-3 text-muted-foreground" />
                                  <span>{service.crewMembers[0].flight}</span>
                                </div>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                              {service.crewMembers.length > 1 && service.crewMembers.some((m: any) => m.flight) && (
                                <div className="text-xs text-muted-foreground mt-0.5">
                                  +{service.crewMembers.filter((m: any) => m.flight).length - (service.crewMembers[0].flight ? 1 : 0)} más
                                </div>
                              )}
                            </>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </div>
                      </TableCell>

                      {/* Comments column */}
                      <TableCell className="max-w-32">
                        {service.comments || service.notes ? (
                          <div
                            className="text-sm text-gray-600 truncate cursor-help"
                            title={toStr(service.comments || service.notes)}
                          >
                            {toStr(service.comments || service.notes)}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">-</span>
                        )}
                      </TableCell>

                      {/* Transport / Driver column */}
                      <TableCell>
                        <div className="text-sm">
                          {service.transportCompany ? (
                            <div className="flex items-center gap-1">
                              <Building className="h-3 w-3 text-muted-foreground" />
                              <span className="font-medium">{service.transportCompany}</span>
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                          {service.driver && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                              <User className="h-3 w-3" />
                              <span>{service.driver}</span>
                            </div>
                          )}
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="space-y-2">
                          <Badge className={getStatusColor(service.status)}>
                            {getStatusLabel(service.status)}
                          </Badge>

                          {(() => {
                            const isRoundTrip = service.moveType === 'RT'
                            const totalFields = isRoundTrip ? 9 : 8

                            const completedFields = [
                              service.pickupDate,
                              service.pickupTime,
                              service.pickupLocation,
                              service.dropoffLocation,
                              service.vessel,
                              service.transportCompany,
                              service.driver,
                              (service.crewMembers?.length ?? 0) > 0 || service.crewName,
                              isRoundTrip ? service.returnDropoffLocation : true
                            ].filter(Boolean).length

                            const actualCompletedFields = Math.min(completedFields, totalFields)
                            const percentage = Math.round((actualCompletedFields / totalFields) * 100)
                            const isComplete = actualCompletedFields === totalFields

                            return (
                              <div className="flex items-center gap-1 text-xs">
                                <div className={`w-1.5 h-1.5 rounded-full ${isComplete ? 'bg-green-500' : actualCompletedFields > totalFields / 2 ? 'bg-yellow-500' : 'bg-red-500'}`} />
                                <span className={`font-medium ${isComplete ? 'text-green-600' : actualCompletedFields > totalFields / 2 ? 'text-yellow-600' : 'text-red-600'}`}>
                                  {actualCompletedFields}/{totalFields}
                                </span>
                                <span className="text-gray-500">({percentage}%)</span>
                              </div>
                            )
                          })()}
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleOpenViewModal(service._id)}
                            title="View Service Details"
                          >
                            <Eye className="h-3 w-3" />
                          </Button>

                          {!['completed', 'prefacturado', 'facturado', 'nota_de_credito', 'cancelled'].includes(service.status) && (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleOpenEditModal(service._id)}
                                disabled={!['tentative', 'pending', 'in_progress'].includes(service.status)}
                              >
                                <Edit className="h-3 w-3" />
                              </Button>

                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleOpenStatusModal(service._id)}
                                title="Change Status"
                              >
                                <RefreshCw className="h-3 w-3" />
                              </Button>
                            </>
                          )}

                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteService(service._id)}
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

      {/* Pagination */}
      {totalPages > 1 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={currentPage === 1}
                  onClick={() => fetchServices({ page: currentPage - 1, limit: 20, filters })}
                >
                  Previous
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={currentPage === totalPages}
                  onClick={() => fetchServices({ page: currentPage + 1, limit: 20, filters })}
                >
                  Next
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Status Change Modal */}
      <Dialog open={modals?.showStatusModal} onOpenChange={closeModals}>
        <DialogContent className="sm:max-w-md" aria-describedby="status-dialog-description">
          <DialogHeader>
            <DialogTitle>Change Service Status</DialogTitle>
          </DialogHeader>
          {(() => {
            const currentService = services.find(s => s._id === selectedService)
            const currentStatus = currentService?.status || ''

            // Valid forward transitions per the flow diagram
            const validTransitions: Record<string, string[]> = {
              'pending': ['tentative', 'in_progress'],
              'tentative': ['in_progress'],
              'in_progress': ['completed'],
              'completed': ['prefacturado'],
              'prefacturado': ['facturado'],
              'facturado': ['nota_de_credito'],
              'cancelled': [],
              'nota_de_credito': []
            }

            const allowedStatuses = validTransitions[currentStatus] || []

            // Always allow rollback to pending (except from pending, facturado, cancelled, nota_de_credito)
            const canRollbackToPending = !['pending', 'facturado', 'cancelled', 'nota_de_credito'].includes(currentStatus)

            // Always allow cancellation (except from facturado, cancelled, nota_de_credito)
            const canCancel = !['facturado', 'cancelled', 'nota_de_credito'].includes(currentStatus)

            const isRtMissingReturn = currentService?.moveType === 'RT' && !currentService?.returnDropoffLocation

            const statusOptions = [
              { value: 'tentative', label: 'Tentative', color: 'bg-purple-100 text-purple-800' },
              { value: 'pending', label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
              { value: 'in_progress', label: 'In Progress', color: 'bg-blue-100 text-blue-800' },
              { value: 'completed', label: 'Completed', color: 'bg-green-100 text-green-800' },
              { value: 'cancelled', label: 'Cancelled', color: 'bg-red-100 text-red-800' },
            ]

            return (
              <div className="space-y-4">
                <p id="status-dialog-description" className="text-sm text-muted-foreground">
                  Current status: <Badge className={getStatusColor(currentStatus)}>{getStatusLabel(currentStatus)}</Badge>
                </p>

                {isRtMissingReturn && (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                    <p className="text-xs text-yellow-800">
                      This Round Trip service does not have a Return Drop-off Location. Please edit the service to add it before marking as completed.
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  {statusOptions.map(opt => {
                    const isForwardTransition = allowedStatuses.includes(opt.value)
                    const isRollback = opt.value === 'pending' && canRollbackToPending
                    const isCancelOption = opt.value === 'cancelled' && canCancel
                    const isAllowed = isForwardTransition || isRollback || isCancelOption

                    if (!isAllowed) return null

                    const isDisabled = opt.value === 'completed' && isRtMissingReturn

                    return (
                      <Button
                        key={opt.value}
                        variant="outline"
                        className="w-full justify-start"
                        disabled={isDisabled}
                        onClick={() => {
                          if (selectedService) {
                            handleStatusChange(selectedService, opt.value)
                          }
                        }}
                      >
                        <Badge className={`${opt.color} mr-2`}>
                          {opt.label}
                        </Badge>
                        Set as {opt.label}
                      </Button>
                    )
                  })}
                </div>
              </div>
            )
          })()}
          <DialogFooter>
            <Button variant="outline" onClick={closeModals}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Service Modal */}
      <Dialog open={modals?.showEditModal} onOpenChange={closeModals}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Service</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {selectedService && (
              <>
                {/* Service Info Section */}
                <div className="text-sm text-muted-foreground bg-gray-50 p-3 rounded-lg">
                  <p><strong>Service ID:</strong> {selectedService._id}</p>
                  <p><strong>Current Status:</strong> {getStatusLabel(selectedService.status)}</p>
                </div>

                {/* Basic Service Information */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="pickupDate" className="text-sm font-medium">
                      Pickup Date *
                    </Label>
                    <Input
                      id="pickupDate"
                      type="date"
                      value={editFormData.pickupDate}
                      onChange={(e) => setEditFormData(prev => ({ 
                        ...prev, 
                        pickupDate: e.target.value 
                      }))}
                      className={editFormErrors.pickupDate ? 'border-red-500' : ''}
                    />
                    {editFormErrors.pickupDate && (
                      <p className="text-xs text-red-500">{editFormErrors.pickupDate}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="pickupTime" className="text-sm font-medium">
                      Pickup Time *
                    </Label>
                    <TimeInput
                      id="pickupTime"
                      value={editFormData.pickupTime}
                      onChange={(value) => setEditFormData(prev => ({ 
                        ...prev, 
                        pickupTime: value 
                      }))}
                      className={editFormErrors.pickupTime ? 'border-red-500' : ''}
                      placeholder="HH:MM (24 horas)"
                    />
                    {editFormErrors.pickupTime && (
                      <p className="text-xs text-red-500">{editFormErrors.pickupTime}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Formato 24 horas (ej: 14:30 para 2:30 PM)
                    </p>
                  </div>
                </div>

                {/* Locations */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="pickupLocation" className="text-sm font-medium">
                      Pickup Location *
                    </Label>
                    <Select
                      value={editFormData.pickupLocation}
                      onValueChange={(value) => {
                        setEditFormData(prev => {
                          const newData = { ...prev, pickupLocation: value }
                          
                          // If changing pickup, clear dropoff if the combination is not valid
                          if (prev.dropoffLocation) {
                            const pickupLoc = locations.find(loc => loc.name === value)
                            const dropoffLoc = locations.find(loc => loc.name === prev.dropoffLocation)
                            
                            if (pickupLoc?.metadata?.siteTypeName && dropoffLoc?.metadata?.siteTypeName) {
                              const route = findRouteByLocations(pickupLoc.metadata.siteTypeName, dropoffLoc.metadata.siteTypeName)
                              if (!route) {
                                newData.dropoffLocation = ''
                              }
                            }
                          }
                          
                          return newData
                        })
                      }}
                    >
                      <SelectTrigger className={editFormErrors.pickupLocation ? 'border-red-500' : ''}>
                        <SelectValue placeholder="Select pickup location" />
                      </SelectTrigger>
                      <SelectContent>
                        {getValidPickupLocations().length === 0 ? (
                          <div className="p-2 text-sm text-gray-500">
                            {editFormData.dropoffLocation 
                              ? 'No hay rutas disponibles para el site type de este dropoff'
                              : 'No hay locations con site types asignados'
                            }
                          </div>
                        ) : (
                          getValidPickupLocations().map((location) => (
                            <SelectItem key={location._id} value={location.name}>
                              <div className="flex flex-col">
                                <div className="flex items-center gap-2">
                                  <MapPin className="h-3 w-3" />
                                  {location.name}
                                </div>
                                {location.metadata?.siteTypeName && (
                                  <div className="text-xs text-muted-foreground ml-5">
                                    Site Type: {location.metadata.siteTypeName}
                                  </div>
                                )}
                              </div>
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    {editFormErrors.pickupLocation && (
                      <p className="text-xs text-red-500">{editFormErrors.pickupLocation}</p>
                    )}
                    {editFormData.dropoffLocation && getValidPickupLocations().length > 0 && (
                      <p className="text-xs text-blue-600">
                        {getValidPickupLocations().length} ubicación(es) disponible(s) para este dropoff site type
                      </p>
                    )}
                    {editFormData.dropoffLocation && getValidPickupLocations().length === 0 && (
                      <p className="text-xs text-yellow-600">
                        No hay ubicaciones de pickup disponibles para el site type de este dropoff
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="dropoffLocation" className="text-sm font-medium">
                      Drop-off Location *
                    </Label>
                    <Select
                      value={editFormData.dropoffLocation}
                      onValueChange={(value) => {
                        setEditFormData(prev => {
                          const newData = { ...prev, dropoffLocation: value }
                          
                          // If changing dropoff, clear pickup if the combination is not valid
                          if (prev.pickupLocation) {
                            const pickupLoc = locations.find(loc => loc.name === prev.pickupLocation)
                            const dropoffLoc = locations.find(loc => loc.name === value)
                            
                            if (pickupLoc?.metadata?.siteTypeName && dropoffLoc?.metadata?.siteTypeName) {
                              const route = findRouteByLocations(pickupLoc.metadata.siteTypeName, dropoffLoc.metadata.siteTypeName)
                              if (!route) {
                                newData.pickupLocation = ''
                              }
                            }
                          }
                          
                          return newData
                        })
                      }}
                    >
                      <SelectTrigger className={editFormErrors.dropoffLocation ? 'border-red-500' : ''}>
                        <SelectValue placeholder="Select drop-off location" />
                      </SelectTrigger>
                      <SelectContent>
                        {getValidDropoffLocations().length === 0 ? (
                          <div className="p-2 text-sm text-gray-500">
                            {editFormData.pickupLocation 
                              ? 'No hay rutas disponibles para el site type de este pickup'
                              : 'No hay locations con site types asignados'
                            }
                          </div>
                        ) : (
                          getValidDropoffLocations().map((location) => (
                            <SelectItem key={location._id} value={location.name}>
                              <div className="flex flex-col">
                                <div className="flex items-center gap-2">
                                  <MapPin className="h-3 w-3" />
                                  {location.name}
                                </div>
                                {location.metadata?.siteTypeName && (
                                  <div className="text-xs text-muted-foreground ml-5">
                                    Site Type: {location.metadata.siteTypeName}
                                  </div>
                                )}
                              </div>
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    {editFormErrors.dropoffLocation && (
                      <p className="text-xs text-red-500">{editFormErrors.dropoffLocation}</p>
                    )}
                    {editFormData.pickupLocation && getValidDropoffLocations().length > 0 && (
                      <p className="text-xs text-blue-600">
                        {getValidDropoffLocations().length} ubicación(es) disponible(s) para este pickup site type
                      </p>
                    )}
                    {editFormData.pickupLocation && getValidDropoffLocations().length === 0 && (
                      <p className="text-xs text-yellow-600">
                        No hay ubicaciones de dropoff disponibles para el site type de este pickup
                      </p>
                    )}
                  </div>
                </div>

                {/* Move Type */}
                <div className="space-y-2">
                  <Label htmlFor="moveType" className="text-sm font-medium">
                    Move Type *
                  </Label>
                  <Select
                    value={editFormData.moveType}
                    onValueChange={(value) => {
                      setEditFormData(prev => ({ 
                        ...prev, 
                        moveType: value as any,
                        // Clear return dropoff if changing from RT to another type
                        returnDropoffLocation: value === 'RT' ? prev.returnDropoffLocation : ''
                      }))
                      setEditFormErrors({})
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select move type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SINGLE">Single</SelectItem>
                      <SelectItem value="RT">Round Trip</SelectItem>
                      <SelectItem value="INTERNAL">Internal</SelectItem>
                      <SelectItem value="BAGS_CLAIM">Bags Claim</SelectItem>
                      <SelectItem value="DOCUMENTATION">Documentation</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Return Drop-off Location - Only for Round Trip */}
                {editFormData.moveType === 'RT' && (
                  <div className="space-y-2">
                    <Label htmlFor="returnDropoffLocation" className="text-sm font-medium">
                      Return Drop-off Location
                    </Label>
                    <Select
                      value={editFormData.returnDropoffLocation}
                      onValueChange={(value) => {
                        setEditFormData(prev => ({ 
                          ...prev, 
                          returnDropoffLocation: value 
                        }))
                        // Clear error when user selects a value
                        setEditFormErrors(prev => {
                          const newErrors = { ...prev }
                          delete newErrors.returnDropoffLocation
                          return newErrors
                        })
                      }}
                    >
                      <SelectTrigger className={editFormErrors.returnDropoffLocation ? 'border-red-500' : ''}>
                        <SelectValue placeholder="Select return drop-off location" />
                      </SelectTrigger>
                      <SelectContent>
                        {getValidReturnDropoffLocations().length === 0 ? (
                          <div className="p-2 text-sm text-gray-500">
                            No hay rutas disponibles para el return trip desde {editFormData.dropoffLocation}
                          </div>
                        ) : (
                          getValidReturnDropoffLocations().map((location) => (
                            <SelectItem key={location._id} value={location.name}>
                              <div className="flex flex-col">
                                <div className="flex items-center gap-2">
                                  <MapPin className="h-3 w-3" />
                                  {location.name}
                                </div>
                                {location.metadata?.siteTypeName && (
                                  <div className="text-xs text-muted-foreground ml-5">
                                    Site Type: {location.metadata.siteTypeName}
                                  </div>
                                )}
                              </div>
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    {editFormErrors.returnDropoffLocation && (
                      <p className="text-xs text-red-500">{editFormErrors.returnDropoffLocation}</p>
                    )}
                    {getValidReturnDropoffLocations().length > 0 && (
                      <p className="text-xs text-blue-600">
                        {getValidReturnDropoffLocations().length} ubicación(es) disponible(s) para el return trip
                      </p>
                    )}
                  </div>
                )}

                {/* Vessel Information */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="vessel" className="text-sm font-medium">
                      Vessel
                    </Label>
                    <Input
                      id="vessel"
                      value={editFormData.vessel}
                      onChange={(e) => setEditFormData(prev => ({ 
                        ...prev, 
                        vessel: e.target.value 
                      }))}
                      placeholder="Enter vessel name"
                      className={editFormErrors.vessel ? 'border-red-500' : ''}
                    />
                    {editFormErrors.vessel && (
                      <p className="text-xs text-red-500">{editFormErrors.vessel}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="voyage" className="text-sm font-medium">
                      Voyage
                    </Label>
                    <Input
                      id="voyage"
                      value={editFormData.voyage}
                      onChange={(e) => setEditFormData(prev => ({ 
                        ...prev, 
                        voyage: e.target.value 
                      }))}
                      placeholder="Enter voyage number"
                    />
                  </div>
                </div>

                {/* Transport Information */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="transportCompany" className="text-sm font-medium">
                      Transport Company
                    </Label>
                    <Select
                      value={editFormData.transportCompany}
                      onValueChange={(value) => {
                        setEditFormData(prev => {
                          const newData = { ...prev, transportCompany: value }
                          
                          // Clear driver if it doesn't belong to the new company
                          if (prev.driver) {
                            const selectedDriver = drivers.find(d => d.name === prev.driver)
                            if (selectedDriver && selectedDriver.metadata?.company !== value) {
                              newData.driver = ''
                            }
                          }
                          
                          return newData
                        })
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select transport company" />
                      </SelectTrigger>
                      <SelectContent>
                        {transportCompanies.map((company) => {
                          const driversCount = drivers.filter(d => d.metadata?.company === company.name).length
                          return (
                            <SelectItem key={company._id} value={company.name}>
                              <div className="flex items-center justify-between gap-2">
                                <span>{company.name}</span>
                                <span className={`text-xs px-2 py-0.5 rounded-full ${driversCount > 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                  {driversCount} driver{driversCount !== 1 ? 's' : ''}
                                </span>
                              </div>
                            </SelectItem>
                          )
                        })}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="driver" className="text-sm font-medium">
                      Driver
                    </Label>
                    <Select
                      value={editFormData.driver}
                      onValueChange={(value) => {
                        setEditFormData(prev => {
                          const newData = { ...prev, driver: value }
                          
                          // Auto-set transport company when driver is selected
                          const selectedDriver = drivers.find(d => d.name === value)
                          if (selectedDriver?.metadata?.company) {
                            newData.transportCompany = selectedDriver.metadata.company
                          }
                          
                          return newData
                        })
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select driver" />
                      </SelectTrigger>
                      <SelectContent>
                        {editFormData.transportCompany ? (
                          drivers
                            .filter(driver => driver.metadata?.company === editFormData.transportCompany)
                            .map((driver) => (
                              <SelectItem key={driver._id} value={driver.name}>
                                <div>
                                  {driver.name}
                                  {driver.metadata?.phone && (
                                    <div className="text-xs text-muted-foreground">
                                      {driver.metadata.phone}
                                    </div>
                                  )}
                                </div>
                              </SelectItem>
                            ))
                        ) : (
                          drivers.map((driver) => (
                            <SelectItem key={driver._id} value={driver.name}>
                              <div>
                                {driver.name}
                                {driver.metadata?.phone && (
                                  <div className="text-xs text-muted-foreground">
                                    {driver.metadata.phone}
                                  </div>
                                )}
                                {driver.metadata?.company && (
                                  <div className="text-xs text-blue-600">
                                    Company: {driver.metadata.company}
                                  </div>
                                )}
                              </div>
                            </SelectItem>
                          ))
                        )}
                        {editFormData.transportCompany && drivers.filter(driver => driver.metadata?.company === editFormData.transportCompany).length === 0 && (
                          <div className="p-2 text-sm text-gray-500 text-center">
                            No hay drivers disponibles para esta compañía
                          </div>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Waiting Time */}
                <div className="space-y-2">
                  <Label htmlFor="waitingTime" className="text-sm font-medium">
                    Waiting Time (hours)
                  </Label>
                  <div className="relative">
                    <Clock className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="waitingTime"
                      type="number"
                      min="0"
                      max="24"
                      step="0.25"
                      value={editFormData.waitingTime}
                      onChange={(e) => setEditFormData(prev => ({ 
                        ...prev, 
                        waitingTime: parseFloat(e.target.value) || 0 
                      }))}
                      className="pl-8"
                      placeholder="Enter waiting time in hours"
                    />
                  </div>
                </div>

                {/* Comments */}
                <div className="space-y-2">
                  <Label htmlFor="comments" className="text-sm font-medium">
                    Comments
                  </Label>
                  <textarea
                    id="comments"
                    value={editFormData.comments}
                    onChange={(e) => setEditFormData(prev => ({ 
                      ...prev, 
                      comments: e.target.value 
                    }))}
                    className="w-full p-2 border border-gray-300 rounded-md resize-none"
                    rows={3}
                    placeholder="Enter any additional comments or notes"
                  />
                </div>

                {/* Route Validation Display */}
                {editFormData.pickupLocation && editFormData.dropoffLocation && (
                  <>
                    {editFormData.crewMembers.length === 0 ? (
                      <Card className="bg-blue-50 border-blue-200">
                        <CardContent className="pt-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Users className="h-4 w-4 text-blue-600" />
                            <span className="font-medium text-blue-800">Agregue Crew Members</span>
                          </div>
                          <p className="text-sm text-blue-600">
                            Debe agregar al menos un crew member para validar la ruta.
                          </p>
                        </CardContent>
                      </Card>
                    ) : (() => {
                      // Check if route exists
                      const pickupLoc = locations.find(loc => loc.name === editFormData.pickupLocation)
                      const dropoffLoc = locations.find(loc => loc.name === editFormData.dropoffLocation)
                      
                      if (pickupLoc?.metadata?.siteTypeName && dropoffLoc?.metadata?.siteTypeName) {
                        const route = findRouteByLocations(pickupLoc.metadata.siteTypeName, dropoffLoc.metadata.siteTypeName)
                        
                        if (route) {
                          return (
                            <Card className="bg-green-50 border-green-200">
                              <CardContent className="pt-4">
                                <div className="flex items-center gap-2 mb-2">
                                  <CheckCircle className="h-4 w-4 text-green-600" />
                                  <span className="font-medium text-green-800">Ruta Válida</span>
                                </div>
                                <p className="text-sm text-green-600">
                                  ✅ Existe una ruta configurada para esta combinación
                                </p>
                                <div className="text-sm text-green-600 mt-2">
                                  <div className="flex items-center gap-2">
                                    <Users className="h-3 w-3" />
                                    <span>{editFormData.crewMembers.length} pasajero{editFormData.crewMembers.length !== 1 ? 's' : ''}</span>
                                  </div>
                                  <div className="text-xs mt-1">
                                    Tipo: {editFormData.moveType === 'RT' ? 'Round Trip' : 
                                           editFormData.moveType === 'SINGLE' ? 'Single' :
                                           editFormData.moveType === 'INTERNAL' ? 'Internal' :
                                           editFormData.moveType === 'BAGS_CLAIM' ? 'Bags Claim' :
                                           editFormData.moveType === 'DOCUMENTATION' ? 'Documentation' : 'Single'}
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          )
                        } else {
                          return (
                            <Card className="bg-yellow-50 border-yellow-200">
                              <CardContent className="pt-4">
                                <div className="flex items-center gap-2 mb-2">
                                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                                  <span className="font-medium text-yellow-800">Ruta No Configurada</span>
                                </div>
                                <p className="text-sm text-yellow-600">
                                  No existe configuración de ruta para esta combinación:
                                </p>
                                <div className="text-sm text-yellow-600 mt-2 space-y-1">
                                  <div>• {editFormData.crewMembers.length} pasajero{editFormData.crewMembers.length !== 1 ? 's' : ''}</div>
                                  <div>• Tipo: {editFormData.moveType === 'RT' ? 'Round Trip' : 
                                                 editFormData.moveType === 'SINGLE' ? 'Single' :
                                                 editFormData.moveType === 'INTERNAL' ? 'Internal' :
                                                 editFormData.moveType === 'BAGS_CLAIM' ? 'Bags Claim' :
                                                 editFormData.moveType === 'DOCUMENTATION' ? 'Documentation' : 'Single'}</div>
                                  <div>• Ruta: {pickupLoc.metadata.siteTypeName} → {dropoffLoc.metadata.siteTypeName}</div>
                                </div>
                                <p className="text-xs text-yellow-600 mt-2">
                                  Contacte al administrador para configurar esta ruta.
                                </p>
                              </CardContent>
                            </Card>
                          )
                        }
                      }
                      
                      return null
                    })()}
                  </>
                )}

                {/* Crew Members Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">
                      Crew Members
                    </Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const newCrewMember = {
                          id: Date.now().toString(),
                          name: '',
                          nationality: '',
                          crewRank: '',
                          crewCategory: '',
                          status: 'Visit' as 'Visit' | 'On Signer',
                          flight: ''
                        }
                        setEditFormData(prev => ({
                          ...prev,
                          crewMembers: [...prev.crewMembers, newCrewMember]
                        }))
                      }}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Crew Member
                    </Button>
                  </div>

                  {editFormData.crewMembers.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-300 rounded-lg">
                      No crew members added yet. Click "Add Crew Member" to add one.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {editFormData.crewMembers.map((member, index) => (
                        <div key={member.id} className="border rounded-lg p-4 bg-gray-50">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-medium text-sm">Crew Member {index + 1}</h4>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditFormData(prev => ({
                                  ...prev,
                                  crewMembers: prev.crewMembers.filter(m => m.id !== member.id)
                                }))
                              }}
                              className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                          
                          <div className="grid gap-3 md:grid-cols-3">
                            <div className="space-y-2">
                              <Label className="text-xs font-medium">Name *</Label>
                              <Input
                                value={member.name}
                                onChange={(e) => {
                                  setEditFormData(prev => ({
                                    ...prev,
                                    crewMembers: prev.crewMembers.map(m =>
                                      m.id === member.id ? { ...m, name: e.target.value } : m
                                    )
                                  }))
                                }}
                                placeholder="Enter crew member name"
                                className="text-sm"
                              />
                            </div>

                            <div className="space-y-2">
                              <Label className="text-xs font-medium">Nationality *</Label>
                              <Select
                                value={member.nationality}
                                onValueChange={(value) => {
                                  setEditFormData(prev => ({
                                    ...prev,
                                    crewMembers: prev.crewMembers.map(m =>
                                      m.id === member.id ? { ...m, nationality: value } : m
                                    )
                                  }))
                                }}
                              >
                                <SelectTrigger className="text-sm">
                                  <SelectValue placeholder="Select nationality" />
                                </SelectTrigger>
                                <SelectContent>
                                  {nationalities.map((nationality) => (
                                    <SelectItem key={nationality._id} value={nationality.name}>
                                      {nationality.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-2">
                              <Label className="text-xs font-medium">Crew Rank *</Label>
                              <Select
                                value={member.crewRank}
                                onValueChange={(value) => {
                                  setEditFormData(prev => ({
                                    ...prev,
                                    crewMembers: prev.crewMembers.map(m =>
                                      m.id === member.id ? { ...m, crewRank: value } : m
                                    )
                                  }))
                                }}
                              >
                                <SelectTrigger className="text-sm">
                                  <SelectValue placeholder="Select crew rank" />
                                </SelectTrigger>
                                <SelectContent>
                                  {ranks.map((rank) => (
                                    <SelectItem key={rank._id} value={rank.name}>
                                      {rank.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-2">
                              <Label className="text-xs font-medium">Category *</Label>
                              <Select
                                value={member.crewCategory}
                                onValueChange={(value) => {
                                  setEditFormData(prev => ({
                                    ...prev,
                                    crewMembers: prev.crewMembers.map(m =>
                                      m.id === member.id ? { ...m, crewCategory: value } : m
                                    )
                                  }))
                                }}
                              >
                                <SelectTrigger className="text-sm">
                                  <SelectValue placeholder="Select category" />
                                </SelectTrigger>
                                <SelectContent>
                                  {crewStatuses.map((status) => (
                                    <SelectItem key={status._id} value={status.name}>
                                      {status.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>


                            <div className="space-y-2">
                              <Label className="text-xs font-medium">Flight</Label>
                              <Input
                                value={member.flight}
                                onChange={(e) => {
                                  setEditFormData(prev => ({
                                    ...prev,
                                    crewMembers: prev.crewMembers.map(m =>
                                      m.id === member.id ? { ...m, flight: e.target.value } : m
                                    )
                                  }))
                                }}
                                placeholder="Enter flight number"
                                className="text-sm"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2 text-sm">
                {(() => {
                  // For Round Trip, return dropoff location is optional but counts if filled
                  const isRoundTrip = editFormData.moveType === 'RT'
                  
                  // For Round Trip, always 9 fields total (8 basic + 1 optional return dropoff)
                  // For Single and other types, 8 fields total
                  const totalFields = isRoundTrip ? 9 : 8
                  
                  const completedFields = [
                    editFormData.pickupDate,
                    editFormData.pickupTime,
                    editFormData.pickupLocation,
                    editFormData.dropoffLocation,
                    editFormData.vessel,
                    editFormData.transportCompany,
                    editFormData.driver,
                    editFormData.crewMembers.length > 0,
                    // For Round Trip, count return dropoff if it's filled (optional)
                    isRoundTrip ? editFormData.returnDropoffLocation : true
                  ].filter(Boolean).length
                  
                  // Cap the completed fields to the total to avoid percentages > 100%
                  const actualCompletedFields = Math.min(completedFields, totalFields)
                  
                  const percentage = Math.round((actualCompletedFields / totalFields) * 100)
                  const isComplete = actualCompletedFields === totalFields
                  
                  return (
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <div className={`w-2 h-2 rounded-full ${isComplete ? 'bg-green-500' : actualCompletedFields > totalFields / 2 ? 'bg-yellow-500' : 'bg-red-500'}`} />
                        <span className={`text-xs font-medium ${isComplete ? 'text-green-600' : actualCompletedFields > totalFields / 2 ? 'text-yellow-600' : 'text-red-600'}`}>
                          {actualCompletedFields}/{totalFields} campos
                        </span>
                      </div>
                      <div className="w-16 bg-gray-200 rounded-full h-1.5">
                        <div 
                          className={`h-1.5 rounded-full transition-all duration-300 ${
                            isComplete ? 'bg-green-500' : actualCompletedFields > totalFields / 2 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500">{percentage}%</span>
                      <div className="group relative">
                        <div className="w-4 h-4 rounded-full bg-gray-300 hover:bg-gray-400 cursor-help flex items-center justify-center text-xs text-gray-600">
                          ?
                        </div>
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                          <div className="text-center">
                            <div className="font-semibold mb-1">Campos incluidos:</div>
                            <div className="text-left space-y-1">
                              <div>• Fecha y hora</div>
                              <div>• Ubicaciones (pickup/dropoff)</div>
                              <div>• Vessel, transport, driver</div>
                              <div>• Crew members</div>
                              {isRoundTrip && <div>• Return dropoff (opcional)</div>}
                            </div>
                            <div className="mt-2 pt-1 border-t border-gray-600">
                              <div className="font-semibold">No incluidos:</div>
                              <div className="text-left">
                                <div>• Comments, voyage</div>
                                <div>• Waiting time</div>
                              </div>
                            </div>
                          </div>
                          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
                        </div>
                      </div>
                    </div>
                  )
                })()}
              </div>
              
              <div className="flex gap-2">
                <Button variant="outline" onClick={closeModals}>
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
                <Button onClick={handleEditService} disabled={!selectedService}>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </Button>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Service Modal */}
      <Dialog open={modals?.showViewModal} onOpenChange={closeModals}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Service Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {selectedService && (
              <>
                {/* Service Overview */}
                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardContent className="pt-4">
                      <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Service Information
                      </h3>
                      <div className="space-y-2 text-sm">
                        <div><strong>Service ID:</strong> {selectedService._id}</div>
                        <div><strong>Date:</strong> {formatSafeDate(selectedService.pickupDate)}</div>
                        <div><strong>Time:</strong> {selectedService.pickupTime || 'N/A'}</div>
                        <div><strong>Status:</strong> 
                          <Badge className={`ml-2 ${getStatusColor(selectedService.status)}`}>
                            {getStatusLabel(selectedService.status)}
                          </Badge>
                        </div>
                        <div><strong>Move Type:</strong> 
                          {selectedService.moveType === 'RT' ? 'Round Trip' :
                           selectedService.moveType === 'SINGLE' ? 'Single' :
                           selectedService.moveType === 'INTERNAL' ? 'Internal' :
                           selectedService.moveType === 'BAGS_CLAIM' ? 'Bags Claim' :
                           selectedService.moveType === 'DOCUMENTATION' ? 'Documentation' : 'Single'}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-4">
                      <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Service Details
                      </h3>
                      <div className="space-y-2 text-sm">
                        <div><strong>Passengers:</strong> {selectedService.passengerCount || 'N/A'}</div>
                        <div><strong>Waiting Time:</strong> 
                          {selectedService.waitingTime ? 
                            `${(selectedService.waitingTime / 60).toFixed(2)} horas (${selectedService.waitingTime} minutos)` : 
                            'Not set'
                          }
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Route Information */}
                <Card>
                  <CardContent className="pt-4">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Route Information
                    </h3>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-blue-500" />
                        <span className="font-medium">Pickup:</span>
                        <span>{selectedService.pickupLocation}</span>
                      </div>
                      <div className="flex items-center gap-2 ml-6">
                        <ArrowRight className="h-4 w-4 text-gray-400" />
                        <MapPin className="h-4 w-4 text-green-500" />
                        <span className="font-medium">Drop-off:</span>
                        <span>{selectedService.dropoffLocation}</span>
                      </div>
                      
                      {/* Return route for Round Trip */}
                      {selectedService.moveType === 'RT' && selectedService.returnDropoffLocation && (
                        <>
                          <div className="flex items-center gap-2 ml-6">
                            <ArrowRight className="h-4 w-4 text-gray-400" />
                            <MapPin className="h-4 w-4 text-orange-500" />
                            <span className="font-medium">Return Drop-off:</span>
                            <span>{selectedService.returnDropoffLocation}</span>
                          </div>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Vessel & Transport Information */}
                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardContent className="pt-4">
                      <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <Ship className="h-4 w-4" />
                        Vessel Information
                      </h3>
                      <div className="space-y-2 text-sm">
                        <div><strong>Vessel:</strong> {selectedService.vessel || 'N/A'}</div>
                        <div><strong>Voyage:</strong> {selectedService.voyage || 'N/A'}</div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-4">
                      <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <Building className="h-4 w-4" />
                        Transport Information
                      </h3>
                      <div className="space-y-2 text-sm">
                        <div><strong>Company:</strong> {selectedService.transportCompany || 'N/A'}</div>
                        <div><strong>Driver:</strong> {selectedService.driver || 'N/A'}</div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Crew Members */}
                {selectedService.crewMembers && selectedService.crewMembers.length > 0 && (
                  <Card>
                    <CardContent className="pt-4">
                      <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Crew Members ({selectedService.crewMembers.length})
                      </h3>
                      <div className="space-y-3">
                        {selectedService.crewMembers.map((member, index) => (
                          <div key={member.id || index} className="border rounded-lg p-3 bg-gray-50">
                            <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3 text-sm">
                              <div><strong>Name:</strong> {member.name || 'N/A'}</div>
                              <div><strong>Nationality:</strong> {member.nationality || 'N/A'}</div>
                              <div><strong>Rank:</strong> {member.crewRank || 'N/A'}</div>
                              <div><strong>Category:</strong> {member.crewCategory || 'N/A'}</div>
                              <div><strong>Status:</strong> {member.status || 'N/A'}</div>
                              <div><strong>Flight:</strong> {member.flight || 'N/A'}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Legacy Crew Information (if no crew members array) */}
                {(!selectedService.crewMembers || selectedService.crewMembers.length === 0) && 
                 (selectedService.crewName || selectedService.crewRank || selectedService.nationality) && (
                  <Card>
                    <CardContent className="pt-4">
                      <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Crew Information (Legacy)
                      </h3>
                      <div className="space-y-2 text-sm">
                        <div><strong>Name:</strong> {selectedService.crewName || 'N/A'}</div>
                        <div><strong>Rank:</strong> {selectedService.crewRank || 'N/A'}</div>
                        <div><strong>Nationality:</strong> {selectedService.nationality || 'N/A'}</div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Comments */}
                {selectedService.comments && (
                  <Card>
                    <CardContent className="pt-4">
                      <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Comments
                      </h3>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {selectedService.comments}
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* Attachments */}
                {selectedService.attachments && selectedService.attachments.length > 0 && (
                  <Card>
                    <CardContent className="pt-4">
                      <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <Paperclip className="h-4 w-4" />
                        Attachments ({selectedService.attachments.length})
                      </h3>
                      <div className="space-y-2">
                        {selectedService.attachments.map((attachment, index) => (
                          <div key={index} className="flex items-center gap-2 text-sm">
                            <Paperclip className="h-3 w-3" />
                            <span>{attachment.fileName}</span>
                            <span className="text-muted-foreground">
                              ({formatSafeDate(attachment.uploadDate)})
                            </span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeModals}>
              <X className="mr-2 h-4 w-4" />
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}