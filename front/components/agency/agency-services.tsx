"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { 
  Plus, Save, Send, 
  MapPin, Ship, User, Calendar, Clock, Plane, Users, DollarSign, X, AlertTriangle, CheckCircle, Search
} from "lucide-react"
import { useAgencyServices } from "@/lib/features/agencyServices/useAgencyServices"
import { useAgencyCatalogs } from "@/lib/features/agencyServices/useAgencyCatalogs"
import { useAgencyRoutes } from "@/lib/features/agencyServices/useAgencyRoutes"
import { useToast } from "@/hooks/use-toast"
import { format } from "date-fns"
import { useAppDispatch, useAppSelector } from "@/lib/hooks"
import { fetchClients, selectAllClients } from "@/lib/features/clients/clientsSlice"

interface CrewMember {
  id: string
  name: string
  nationality: string
  crewRank: string
  crewCategory: string
  status: 'Visit' | 'On Signer'
  flight: string
}

interface ServiceFormData {
  pickupDate: string
  pickupTime: string
  pickupLocation: string
  dropoffLocation: string
  returnDropoffLocation: string  // Solo para Round Trip
  vessel: string
  voyage: string
  moveType: 'RT' | 'SINGLE' | 'INTERNAL' | 'BAGS_CLAIM' | 'DOCUMENTATION' | 'NO_SHOW'
  transportCompany: string
  driver: string
  approve: boolean
  comments: string
  crewMembers: CrewMember[]
  waitingTime?: number    // Minutos de espera para cálculo de precio
  price?: number          // Precio calculado automáticamente
  currency?: string       // Moneda (USD por defecto)
  passengerCount?: number // Número de pasajeros para cálculo
  clientId: string        // Cliente seleccionado (requerido)
}

const initialFormData: ServiceFormData = {
  pickupDate: '',
  pickupTime: '',
  pickupLocation: '',
  dropoffLocation: '',
  returnDropoffLocation: '',   // Solo para Round Trip
  vessel: '',
  voyage: '',
  moveType: 'SINGLE',
  transportCompany: '',
  driver: '',
  approve: false,              // No se muestra en formulario
  comments: '',
  crewMembers: [],
  waitingTime: 0,             // Tiempo de espera inicial en minutos (no se muestra en formulario)
  price: 0,                   // Precio inicial
  currency: 'USD',            // Moneda por defecto
  passengerCount: 1,          // Un pasajero por defecto
  clientId: ''                // Cliente vacío inicialmente
}

const initialCrewMember: CrewMember = {
  id: '',
  name: '',
  nationality: '',
  crewRank: '',
  crewCategory: '',
  status: 'Visit',
  flight: ''
}

export function AgencyServices() {
  const { toast } = useToast()
  const dispatch = useAppDispatch()
  const clients = useAppSelector(selectAllClients)
  
  const {
    services,
    loading,
    isCreating,
    createService,
    fetchServices,
    quickStats,
    // Pricing
    pricing,
    pricingLoading,
    pricingError,
    currentPrice,
    priceBreakdown,
    routeFound,
    calculateServicePrice,
    clearPricingState
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

  // Form state
  const [formData, setFormData] = useState<ServiceFormData>(initialFormData)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [vesselSearchTerm, setVesselSearchTerm] = useState('')
  const [vesselSelectOpen, setVesselSelectOpen] = useState(false)

  // Load data on mount
  useEffect(() => {
    fetchGroupedCatalogs()
    fetchActiveRoutes()
    fetchServices({ page: 1, limit: 10 })
    dispatch(fetchClients())
  }, [fetchGroupedCatalogs, fetchActiveRoutes, fetchServices, dispatch])

  // Get locations with site types only
  const getLocationsWithSiteType = () => {
    return locations.filter(loc => 
      loc.metadata?.siteTypeId && loc.metadata?.siteTypeName
    )
  }

  // Get valid dropoff locations based on selected pickup
  const getValidDropoffLocations = () => {
    const locationsWithSiteType = getLocationsWithSiteType()
    
    if (!formData.pickupLocation) {
      return locationsWithSiteType
    }
    
    // Find the selected pickup location's site type
    const pickupLocation = locations.find(loc => loc.name === formData.pickupLocation)
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

  // Get valid pickup locations based on selected dropoff
  const getValidPickupLocations = () => {
    const locationsWithSiteType = getLocationsWithSiteType()
    
    if (!formData.dropoffLocation) {
      return locationsWithSiteType
    }
    
    // Find the selected dropoff location's site type
    const dropoffLocation = locations.find(loc => loc.name === formData.dropoffLocation)
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

  // Get valid return dropoff locations for Round Trip (based on first dropoff location)
  const getValidReturnDropoffLocations = () => {
    const locationsWithSiteType = getLocationsWithSiteType()
    
    if (!formData.dropoffLocation) {
      return locationsWithSiteType
    }
    
    // Find the selected dropoff location's site type (this becomes the pickup for return trip)
    const dropoffLocation = locations.find(loc => loc.name === formData.dropoffLocation)
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

  // Auto-calculate pricing when locations, waiting time, move type or crew members change
  useEffect(() => {
    const passengerCount = formData.crewMembers.length;
    
    // Clear pricing state first to avoid conflicts
    clearPricingState();
    
    // For Round Trip, return dropoff is optional
    if (formData.moveType === 'RT') {
      if (formData.pickupLocation && formData.dropoffLocation && passengerCount > 0) {
        // Obtener los site types de las locations seleccionadas
        const pickupLoc = locations.find(loc => loc.name === formData.pickupLocation)
        const dropoffLoc = locations.find(loc => loc.name === formData.dropoffLocation)
        const returnDropoffLoc = formData.returnDropoffLocation 
          ? locations.find(loc => loc.name === formData.returnDropoffLocation)
          : null
        
        if (pickupLoc?.metadata?.siteTypeName && dropoffLoc?.metadata?.siteTypeName) {
          // If return dropoff location is provided and valid, include it in calculation
          if (formData.returnDropoffLocation && returnDropoffLoc?.metadata?.siteTypeName) {
            console.log('Calculating Round Trip price with return location:', {
              firstRoute: `${pickupLoc.metadata.siteTypeName} → ${dropoffLoc.metadata.siteTypeName}`,
              secondRoute: `${dropoffLoc.metadata.siteTypeName} → ${returnDropoffLoc.metadata.siteTypeName}`,
              routeType: 'roundtrip',
              waitingTime: formData.waitingTime || 0,
              passengerCount: passengerCount
            });
            
            calculateServicePrice({
              pickupLocation: pickupLoc.metadata.siteTypeName,
              dropoffLocation: dropoffLoc.metadata.siteTypeName,
              returnDropoffLocation: returnDropoffLoc.metadata.siteTypeName,
              routeType: 'roundtrip',
              waitingTime: 0,
              passengerCount: passengerCount
            });
          } else {
            // Round Trip without return location specified - calculate only first route
            console.log('Calculating Round Trip price (one-way only):', {
              route: `${pickupLoc.metadata.siteTypeName} → ${dropoffLoc.metadata.siteTypeName}`,
              routeType: 'roundtrip',
              waitingTime: formData.waitingTime || 0,
              passengerCount: passengerCount
            });
            
            calculateServicePrice({
              pickupLocation: pickupLoc.metadata.siteTypeName,
              dropoffLocation: dropoffLoc.metadata.siteTypeName,
              routeType: 'roundtrip',
              waitingTime: 0,
              passengerCount: passengerCount
            });
          }
        }
      } else {
        console.log('Clearing Round Trip pricing - conditions not met:', {
          hasPickup: !!formData.pickupLocation,
          hasDropoff: !!formData.dropoffLocation,
          crewMembersCount: passengerCount
        });
      }
    } else {
      // For other move types (Single, Internal, etc.)
      if (formData.pickupLocation && formData.dropoffLocation && passengerCount > 0) {
        const routeType = formData.moveType === 'SINGLE' ? 'single' :
                         formData.moveType === 'INTERNAL' ? 'internal' :
                         formData.moveType === 'BAGS_CLAIM' ? 'bags_claim' :
                         formData.moveType === 'DOCUMENTATION' ? 'documentation' :
                         formData.moveType === 'NO_SHOW' ? 'no_show' : 'single';
        
        console.log('Calculating price with:', {
          pickupLocation: formData.pickupLocation,
          dropoffLocation: formData.dropoffLocation,
          routeType: routeType,
          waitingTime: formData.waitingTime || 0, // Enviar en minutos
          passengerCount: passengerCount
        });
        
        // Obtener los site types de las locations seleccionadas
        const pickupLoc = locations.find(loc => loc.name === formData.pickupLocation)
        const dropoffLoc = locations.find(loc => loc.name === formData.dropoffLocation)
        
        if (pickupLoc?.metadata?.siteTypeName && dropoffLoc?.metadata?.siteTypeName) {
          calculateServicePrice({
            pickupLocation: pickupLoc.metadata.siteTypeName,
            dropoffLocation: dropoffLoc.metadata.siteTypeName,
            routeType: routeType,
            waitingTime: 0, // No waiting time in creation form
            passengerCount: passengerCount
          });
        }
      } else {
        // Clear pricing when locations are not set or no crew members
        console.log('Clearing pricing - conditions not met:', {
          hasPickup: !!formData.pickupLocation,
          hasDropoff: !!formData.dropoffLocation,
          crewMembersCount: passengerCount
        });
      }
    }
  }, [
    formData.pickupLocation, 
    formData.dropoffLocation, 
    formData.returnDropoffLocation, // Add return dropoff to dependencies
    formData.moveType,
    formData.crewMembers.length,
    calculateServicePrice,
    clearPricingState
  ])

  // Update form price when pricing is calculated
  useEffect(() => {
    if (currentPrice > 0 && currentPrice !== formData.price) {
      setFormData(prev => ({ ...prev, price: currentPrice }));
    }
  }, [currentPrice, formData.price])

  const handleInputChange = (field: keyof ServiceFormData, value: string | number | boolean) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value }
      
      // If changing pickup, clear dropoff if the combination is not valid
      if (field === 'pickupLocation' && prev.dropoffLocation) {
        const pickupLoc = locations.find(loc => loc.name === value as string)
        const dropoffLoc = locations.find(loc => loc.name === prev.dropoffLocation)
        
        if (pickupLoc?.metadata?.siteTypeName && dropoffLoc?.metadata?.siteTypeName) {
          const route = findRouteByLocations(pickupLoc.metadata.siteTypeName, dropoffLoc.metadata.siteTypeName)
          if (!route) {
            newData.dropoffLocation = ''
          }
        }
      }
      
      // If changing dropoff, clear pickup if the combination is not valid
      if (field === 'dropoffLocation' && prev.pickupLocation) {
        const pickupLoc = locations.find(loc => loc.name === prev.pickupLocation)
        const dropoffLoc = locations.find(loc => loc.name === value as string)
        
        if (pickupLoc?.metadata?.siteTypeName && dropoffLoc?.metadata?.siteTypeName) {
          const route = findRouteByLocations(pickupLoc.metadata.siteTypeName, dropoffLoc.metadata.siteTypeName)
          if (!route) {
            newData.pickupLocation = ''
          }
        }
      }
      
      // If changing transport company, clear driver if doesn't belong to this company
      if (field === 'transportCompany' && prev.driver) {
        const selectedDriver = drivers.find(d => d.name === prev.driver)
        if (selectedDriver && selectedDriver.metadata?.company !== value) {
          newData.driver = ''
        }
      }
      
      // If changing driver, automatically set their transport company
      if (field === 'driver') {
        const selectedDriver = drivers.find(d => d.name === value as string)
        if (selectedDriver?.metadata?.company) {
          newData.transportCompany = selectedDriver.metadata.company
        }
      }
      
      return newData
    })
    
    // Clear error when user starts typing
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const addCrewMember = () => {
    const newCrewMember = {
      ...initialCrewMember,
      id: Date.now().toString()
    }
    setFormData(prev => ({
      ...prev,
      crewMembers: [...prev.crewMembers, newCrewMember]
    }))
  }

  const updateCrewMember = (id: string, field: keyof CrewMember, value: string) => {
    setFormData(prev => ({
      ...prev,
      crewMembers: prev.crewMembers.map(member =>
        member.id === id ? { ...member, [field]: value } : member
      )
    }))
    
    // Clear crew member specific errors when user starts typing
    const memberIndex = formData.crewMembers.findIndex(member => member.id === id)
    if (memberIndex !== -1) {
      const errorKey = `crewMember_${memberIndex}_${field}`
      if (formErrors[errorKey]) {
        setFormErrors(prev => ({ ...prev, [errorKey]: '' }))
      }
    }
  }

  const removeCrewMember = (id: string) => {
    setFormData(prev => ({
      ...prev,
      crewMembers: prev.crewMembers.filter(member => member.id !== id)
    }))
  }

  // Check if form is complete (all required fields filled)
  const isFormComplete = (): boolean => {
    const pickupLoc = locations.find(loc => loc.name === formData.pickupLocation)
    const dropoffLoc = locations.find(loc => loc.name === formData.dropoffLocation)
    const returnDropoffLoc = locations.find(loc => loc.name === formData.returnDropoffLocation)
    
    // Check if all crew members have complete data
    const allCrewMembersComplete = formData.crewMembers.length > 0 && 
      formData.crewMembers.every(member => 
        member.name.trim() && 
        member.nationality && 
        member.crewRank && 
        member.crewCategory && 
        member.flight.trim()
      )
    
    const baseValidation = !!(
      formData.pickupDate &&
      formData.pickupTime &&
      formData.pickupLocation &&
      formData.dropoffLocation &&
      formData.transportCompany &&
      formData.driver &&
      formData.clientId &&
      allCrewMembersComplete &&
      formData.pickupLocation !== formData.dropoffLocation &&
      pickupLoc?.metadata?.siteTypeName &&
      dropoffLoc?.metadata?.siteTypeName &&
      findRouteByLocations(pickupLoc.metadata.siteTypeName, dropoffLoc.metadata.siteTypeName)
    )

    // For Round Trip, return dropoff location is optional
    // If it's provided, validate that the route exists
    if (formData.moveType === 'RT' && formData.returnDropoffLocation) {
      return baseValidation && !!(
        returnDropoffLoc?.metadata?.siteTypeName &&
        findRouteByLocations(dropoffLoc.metadata.siteTypeName, returnDropoffLoc.metadata.siteTypeName)
      )
    }

    return baseValidation
  }

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {}

    // Required fields
    if (!formData.pickupDate) errors.pickupDate = 'Pickup date is required'
    if (!formData.pickupTime) errors.pickupTime = 'Pickup time is required'
    if (!formData.pickupLocation) errors.pickupLocation = 'Pickup location is required'
    if (!formData.dropoffLocation) errors.dropoffLocation = 'Drop-off location is required'
    // Vessel es opcional - no validar
    if (!formData.transportCompany) errors.transportCompany = 'Transport company is required'
    if (!formData.driver) errors.driver = 'Driver is required'
    if (!formData.clientId) errors.clientId = 'Client is required'

    // For Round Trip, return dropoff location is optional (can be left empty)
    // No validation needed - it's optional

    // Validation rules
    if (formData.pickupLocation === formData.dropoffLocation) {
      errors.dropoffLocation = 'Drop-off location must be different from pickup location'
    }

    // For Round Trip, return dropoff can be the same as pickup (round trip)
    // No validation needed - it's valid for return dropoff to equal pickup location

    // Validate that the pickup/dropoff locations have site types
    const pickupLoc = locations.find(loc => loc.name === formData.pickupLocation)
    const dropoffLoc = locations.find(loc => loc.name === formData.dropoffLocation)
    const returnDropoffLoc = locations.find(loc => loc.name === formData.returnDropoffLocation)
    
    if (pickupLoc && !pickupLoc.metadata?.siteTypeId) {
      errors.pickupLocation = 'Esta ubicación no tiene un Site Type asociado. Por favor, edítela en Agency Catalogs > Locations.'
    }
    
    if (dropoffLoc && !dropoffLoc.metadata?.siteTypeId) {
      errors.dropoffLocation = 'Esta ubicación no tiene un Site Type asociado. Por favor, edítela en Agency Catalogs > Locations.'
    }

    if (formData.moveType === 'RT' && returnDropoffLoc && !returnDropoffLoc.metadata?.siteTypeId) {
      errors.returnDropoffLocation = 'Esta ubicación no tiene un Site Type asociado. Por favor, edítela en Agency Catalogs > Locations.'
    }
    
    // Validate that the pickup/dropoff site types combination exists in routes
    if (formData.pickupLocation && formData.dropoffLocation && pickupLoc && dropoffLoc) {
      const pickupSiteType = pickupLoc.metadata?.siteTypeName
      const dropoffSiteType = dropoffLoc.metadata?.siteTypeName
      
      if (pickupSiteType && dropoffSiteType) {
        const route = routes.find(r => 
          r.isActive && 
          (r.pickupSiteType || r.pickupLocation)?.toUpperCase() === pickupSiteType.toUpperCase() &&
          (r.dropoffSiteType || r.dropoffLocation)?.toUpperCase() === dropoffSiteType.toUpperCase()
        )
        
        if (!route) {
          errors.dropoffLocation = `No existe una ruta para la combinación de Site Types: ${pickupSiteType} → ${dropoffSiteType}. Por favor, cree la ruta en Agency Catalogs > Routes primero.`
        }
      }
    }

    // Validate return trip route for Round Trip (only if return dropoff location is provided)
    if (formData.moveType === 'RT' && formData.returnDropoffLocation && formData.dropoffLocation && dropoffLoc && returnDropoffLoc) {
      const dropoffSiteType = dropoffLoc.metadata?.siteTypeName
      const returnDropoffSiteType = returnDropoffLoc.metadata?.siteTypeName
      
      if (dropoffSiteType && returnDropoffSiteType) {
        const route = routes.find(r => 
          r.isActive && 
          (r.pickupSiteType || r.pickupLocation)?.toUpperCase() === dropoffSiteType.toUpperCase() &&
          (r.dropoffSiteType || r.dropoffLocation)?.toUpperCase() === returnDropoffSiteType.toUpperCase()
        )
        
        if (!route) {
          errors.returnDropoffLocation = `No existe una ruta para el return trip: ${dropoffSiteType} → ${returnDropoffSiteType}. Por favor, cree la ruta en Agency Catalogs > Routes primero.`
        }
      }
    }

    if (formData.crewMembers.length === 0) {
      errors.crewMembers = 'At least one crew member is required'
    } else {
      // Validate each crew member has all required fields
      formData.crewMembers.forEach((member, index) => {
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
        if (!member.flight.trim()) {
          errors[`crewMember_${index}_flight`] = `Crew member ${index + 1} flight is required`
        }
      })
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent, action: 'create' | 'createAndSend') => {
    e.preventDefault()
    
    if (!validateForm()) {
      toast({
        title: "Form Validation Error",
        description: "Please fix the errors and try again",
        variant: "destructive",
      })
      return
    }

    try {
      const passengerCount = formData.crewMembers.length || 1;
      await createService({
        pickupDate: formData.pickupDate,
        pickupTime: formData.pickupTime,
        pickupLocation: formData.pickupLocation,
        dropoffLocation: formData.dropoffLocation,
        returnDropoffLocation: formData.returnDropoffLocation || undefined, // Only for Round Trip
        vessel: formData.vessel,
        voyage: formData.voyage,
        moveType: formData.moveType,
        transportCompany: formData.transportCompany,
        driver: formData.driver,
        approve: false, // Always false in creation
        comments: formData.comments,
        crewMembers: formData.crewMembers,
        clientId: formData.clientId, // Cliente seleccionado
        // Incluir campos de pricing (no waiting time in creation)
        waitingTime: 0, // No waiting time in creation form
        price: pricing?.currentPrice || formData.price || 0,
        currency: formData.currency || 'USD',
        passengerCount: passengerCount
      })

      toast({
        title: "Success",
        description: action === 'create' 
          ? "Service order created successfully" 
          : "Service order created and sent to driver successfully",
      })

      // Reset form
      setFormData(initialFormData)
      setVesselSearchTerm('')
      
      // Refresh services list
      fetchServices({ page: 1, limit: 10 })

    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create service",
        variant: "destructive",
      })
    }
  }

  const handleClearForm = () => {
    setFormData(initialFormData)
    setFormErrors({})
    setVesselSearchTerm('')
  }

  const handleClearLocations = () => {
    setFormData(prev => ({
      ...prev,
      pickupLocation: '',
      dropoffLocation: '',
      returnDropoffLocation: ''
    }))
    setFormErrors(prev => ({
      ...prev,
      pickupLocation: '',
      dropoffLocation: '',
      returnDropoffLocation: ''
    }))
    clearPricingState()
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-500 flex items-center justify-center">
              <Plus className="h-6 w-6 text-white" />
            </div>
            Service Request Form
          </h1>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={(e) => handleSubmit(e, 'create')}
            disabled={isCreating || loading || !isFormComplete()}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="mr-2 h-4 w-4" />
            Create
          </Button>
          {/* <Button 
            onClick={(e) => handleSubmit(e, 'createAndSend')}
            disabled={isCreating || loading || !isFormComplete()}
            className="bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="mr-2 h-4 w-4" />
            Create & Send
          </Button> */}
        </div>
      </div>

      {/* Service Request Form */}
      <Card>
        <CardContent className="pt-6">
          <form className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Left Column - Service Timings & Locations */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-700">Service Details</h3>
                
                {/* Move Type */}
                <div className="space-y-2">
                  <Label htmlFor="moveType" className="text-sm font-medium">
                    Move type
                  </Label>
                  <Select
                    value={formData.moveType}
                    onValueChange={(value) => handleInputChange('moveType', value as 'RT' | 'SINGLE' | 'INTERNAL' | 'BAGS_CLAIM' | 'DOCUMENTATION' | 'NO_SHOW')}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione tipo de movimiento" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SINGLE">Single</SelectItem>
                      <SelectItem value="RT">Round Trip</SelectItem>
                      <SelectItem value="INTERNAL">Internal</SelectItem>
                      <SelectItem value="BAGS_CLAIM">Bags Claim</SelectItem>
                      <SelectItem value="DOCUMENTATION">Documentation</SelectItem>
                      <SelectItem value="NO_SHOW">No Show</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Pick Up Date */}
                <div className="space-y-2">
                  <Label htmlFor="pickupDate" className="text-sm font-medium">
                    Pick Up DATE <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Calendar className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="pickupDate"
                      type="date"
                      value={formData.pickupDate}
                      onChange={(e) => handleInputChange('pickupDate', e.target.value)}
                      className={`pl-8 ${formErrors.pickupDate ? 'border-red-500' : ''}`}
                    />
                  </div>
                  {formErrors.pickupDate && (
                    <p className="text-xs text-red-500">{formErrors.pickupDate}</p>
                  )}
                </div>

                {/* Pick Up Time */}
                <div className="space-y-2">
                  <Label htmlFor="pickupTime" className="text-sm font-medium">
                    PICK UP TIME <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Clock className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="pickupTime"
                      type="time"
                      value={formData.pickupTime}
                      onChange={(e) => handleInputChange('pickupTime', e.target.value)}
                      className={`pl-8 ${formErrors.pickupTime ? 'border-red-500' : ''}`}
                    />
                  </div>
                  {formErrors.pickupTime && (
                    <p className="text-xs text-red-500">{formErrors.pickupTime}</p>
                  )}
                </div>

                {/* Pick Up Location */}
                <div className="space-y-2">
                  <Label htmlFor="pickupLocation" className="text-sm font-medium">
                    PICK UP Loc <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.pickupLocation}
                    onValueChange={(value) => handleInputChange('pickupLocation', value)}
                  >
                    <SelectTrigger className={formErrors.pickupLocation ? 'border-red-500' : ''}>
                      <SelectValue placeholder="Seleccione pickup location" />
                    </SelectTrigger>
                    <SelectContent>
                      {getValidPickupLocations().length === 0 ? (
                        <div className="p-2 text-sm text-gray-500">
                          {formData.dropoffLocation 
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
                  {formErrors.pickupLocation && (
                    <p className="text-xs text-red-500">{formErrors.pickupLocation}</p>
                  )}
                  {formData.dropoffLocation && getValidPickupLocations().length > 0 && (
                    <p className="text-xs text-blue-600">
                      {getValidPickupLocations().length} ubicación(es) disponible(s) para este dropoff site type
                    </p>
                  )}
                  {formData.dropoffLocation && getValidPickupLocations().length === 0 && (
                    <p className="text-xs text-yellow-600">
                      No hay ubicaciones de pickup disponibles para el site type de este dropoff
                    </p>
                  )}
                </div>

                {/* Drop Off Location */}
                <div className="space-y-2">
                  <Label htmlFor="dropoffLocation" className="text-sm font-medium">
                    DROP OFF Loc <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.dropoffLocation}
                    onValueChange={(value) => handleInputChange('dropoffLocation', value)}
                  >
                    <SelectTrigger className={formErrors.dropoffLocation ? 'border-red-500' : ''}>
                      <SelectValue placeholder="Seleccione dropoff location" />
                    </SelectTrigger>
                    <SelectContent>
                      {getValidDropoffLocations().length === 0 ? (
                        <div className="p-2 text-sm text-gray-500">
                          {formData.pickupLocation 
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
                  {formErrors.dropoffLocation && (
                    <p className="text-xs text-red-500">{formErrors.dropoffLocation}</p>
                  )}
                  {formData.pickupLocation && getValidDropoffLocations().length > 0 && (
                    <p className="text-xs text-blue-600">
                      {getValidDropoffLocations().length} ubicación(es) disponible(s) para este pickup site type
                    </p>
                  )}
                  {formData.pickupLocation && getValidDropoffLocations().length === 0 && (
                    <p className="text-xs text-yellow-600">
                      No hay ubicaciones de dropoff disponibles para el site type de este pickup
                    </p>
                  )}
                </div>

                {/* Return Drop-off Location - Only for Round Trip */}
                {formData.moveType === 'RT' && (
                  <div className="space-y-2">
                    <Label htmlFor="returnDropoffLocation" className="text-sm font-medium">
                      RETURN DROP-OFF Location <span className="text-muted-foreground text-xs">(no obligatorio en esta instancia)</span>
                    </Label>
                    <Select
                      value={formData.returnDropoffLocation}
                      onValueChange={(value) => handleInputChange('returnDropoffLocation', value)}
                    >
                      <SelectTrigger className={formErrors.returnDropoffLocation ? 'border-red-500' : ''}>
                        <SelectValue placeholder="Seleccione return dropoff location" />
                      </SelectTrigger>
                      <SelectContent>
                        {getValidReturnDropoffLocations().length === 0 ? (
                          <div className="p-2 text-sm text-gray-500">
                            {formData.dropoffLocation 
                              ? 'No hay rutas disponibles para el return trip desde este dropoff'
                              : 'Primero seleccione el dropoff del primer viaje'
                            }
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
                    {formErrors.returnDropoffLocation && (
                      <p className="text-xs text-red-500">{formErrors.returnDropoffLocation}</p>
                    )}
                    {formData.dropoffLocation && getValidReturnDropoffLocations().length > 0 && (
                      <p className="text-xs text-blue-600">
                        {getValidReturnDropoffLocations().length} ubicación(es) disponible(s) para el return trip
                      </p>
                    )}
                    {formData.dropoffLocation && getValidReturnDropoffLocations().length === 0 && (
                      <p className="text-xs text-yellow-600">
                        No hay ubicaciones disponibles para el return trip desde este dropoff
                      </p>
                    )}
                  </div>
                )}

                {/* Clear Locations Button */}
                {(formData.pickupLocation || formData.dropoffLocation || formData.returnDropoffLocation) && (
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={handleClearLocations}
                      className="text-xs bg-gray-700 hover:bg-gray-800 text-white"
                    >
                      <X className="h-3 w-3 mr-1" />
                      Limpiar Ubicaciones
                    </Button>
                  </div>
                )}



                {/* Comments */}
                <div className="space-y-2">
                  <Label htmlFor="comments" className="text-sm font-medium">
                    Comments
                  </Label>
                  <Textarea
                    id="comments"
                    value={formData.comments}
                    onChange={(e) => handleInputChange('comments', e.target.value)}
                    placeholder="alfanumérico"
                    rows={3}
                  />
                </div>
              </div>

              {/* Right Column - Vessel & Transport Details */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-700">Transport Details</h3>
                
                {/* Vessel */}
                <div className="space-y-2">
                  <Label htmlFor="vessel" className="text-sm font-medium">
                    VESSEL
                  </Label>
                  
                  <Select
                    open={vesselSelectOpen}
                    onOpenChange={(open) => {
                      setVesselSelectOpen(open)
                      if (!open) {
                        // Limpiar búsqueda cuando se cierra el select
                        setVesselSearchTerm('')
                      }
                    }}
                    value={formData.vessel}
                    onValueChange={(value) => {
                      handleInputChange('vessel', value)
                      setVesselSelectOpen(false)
                    }}
                  >
                    <SelectTrigger className={formErrors.vessel ? 'border-red-500' : ''}>
                      <SelectValue placeholder="Seleccione vessel" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[400px]">
                      {/* Campo de búsqueda dentro del dropdown */}
                      <div className="sticky top-0 z-10 bg-white border-b pb-2 mb-2">
                        <div className="relative px-2 pt-2">
                          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <input
                            placeholder="Buscar vessel..."
                            value={vesselSearchTerm}
                            onChange={(e) => setVesselSearchTerm(e.target.value)}
                            onKeyDown={(e) => {
                              // Evitar que el select se cierre al presionar teclas
                              e.stopPropagation()
                            }}
                            className="w-full h-9 pl-9 pr-8 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          {vesselSearchTerm && (
                            <button
                              type="button"
                              onClick={() => setVesselSearchTerm('')}
                              className="absolute right-3 top-1/2 -translate-y-1/2 h-6 w-6 flex items-center justify-center hover:bg-gray-100 rounded"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      </div>
                      
                      {/* Lista de vessels filtrados */}
                      <div className="max-h-[300px] overflow-y-auto">
                        {vessels
                          .filter(vessel => 
                            vessel.name.toLowerCase().includes(vesselSearchTerm.toLowerCase()) ||
                            vessel.metadata?.shippingLine?.toLowerCase().includes(vesselSearchTerm.toLowerCase())
                          )
                          .map((vessel) => (
                            <SelectItem key={vessel._id} value={vessel.name}>
                              <div className="flex items-center gap-2">
                                <Ship className="h-3 w-3" />
                                <div className="flex flex-col">
                                  <span>{vessel.name}</span>
                                  {vessel.metadata?.shippingLine && (
                                    <span className="text-xs text-muted-foreground">
                                      {vessel.metadata.shippingLine}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </SelectItem>
                          ))}
                        {vessels.filter(vessel => 
                          vessel.name.toLowerCase().includes(vesselSearchTerm.toLowerCase()) ||
                          vessel.metadata?.shippingLine?.toLowerCase().includes(vesselSearchTerm.toLowerCase())
                        ).length === 0 && (
                          <div className="p-4 text-sm text-gray-500 text-center">
                            No se encontraron vessels que coincidan con "{vesselSearchTerm}"
                          </div>
                        )}
                      </div>
                    </SelectContent>
                  </Select>
                  {formErrors.vessel && (
                    <p className="text-xs text-red-500">{formErrors.vessel}</p>
                  )}
                  {vessels.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {vessels.length} vessel{vessels.length !== 1 ? 's' : ''} disponible{vessels.length !== 1 ? 's' : ''}
                    </p>
                  )}
                </div>

                {/* Voyage */}
                <div className="space-y-2">
                  <Label htmlFor="voyage" className="text-sm font-medium">
                    VOY (Voyage)
                  </Label>
                  <Input
                    id="voyage"
                    value={formData.voyage}
                    onChange={(e) => handleInputChange('voyage', e.target.value)}
                    placeholder="alfanumérico"
                  />
                  <p className="text-xs text-yellow-600">Voyage puede quedar en blanco.</p>
                </div>

                {/* Transport Company */}
                <div className="space-y-2">
                  <Label htmlFor="transportCompany" className="text-sm font-medium">
                    Transport Co. <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.transportCompany}
                    onValueChange={(value) => handleInputChange('transportCompany', value)}
                  >
                    <SelectTrigger className={formErrors.transportCompany ? 'border-red-500' : ''}>
                      <SelectValue placeholder="Seleccione transport company" />
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
                  {formErrors.transportCompany && (
                    <p className="text-xs text-red-500">{formErrors.transportCompany}</p>
                  )}
                </div>

                {/* Driver */}
                <div className="space-y-2">
                  <Label htmlFor="driver" className="text-sm font-medium">
                    Driver <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.driver}
                    onValueChange={(value) => handleInputChange('driver', value)}
                  >
                    <SelectTrigger className={formErrors.driver ? 'border-red-500' : ''}>
                      <SelectValue placeholder={formData.transportCompany ? "Seleccione driver de la compañía" : "Primero seleccione Transport Co."} />
                    </SelectTrigger>
                    <SelectContent>
                      {formData.transportCompany ? (
                        drivers
                          .filter(driver => driver.metadata?.company === formData.transportCompany)
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
                                  Compañía: {driver.metadata.company}
                                </div>
                              )}
                            </div>
                          </SelectItem>
                        ))
                      )}
                      {formData.transportCompany && drivers.filter(driver => driver.metadata?.company === formData.transportCompany).length === 0 && (
                        <div className="p-2 text-sm text-gray-500 text-center">
                          No hay drivers disponibles para esta compañía
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                  {formErrors.driver && (
                    <p className="text-xs text-red-500">{formErrors.driver}</p>
                  )}
                  {formData.transportCompany && (
                    <p className="text-xs text-blue-600">
                      {drivers.filter(driver => driver.metadata?.company === formData.transportCompany).length} driver(s) disponible(s) para {formData.transportCompany}
                    </p>
                  )}
                </div>

                {/* Client */}
                <div className="space-y-2">
                  <Label htmlFor="client" className="text-sm font-medium">
                    Client <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.clientId}
                    onValueChange={(value) => handleInputChange('clientId', value)}
                  >
                    <SelectTrigger className={formErrors.clientId ? 'border-red-500' : ''}>
                      <SelectValue placeholder="Select client" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.filter(c => c.isActive && c.sapCode).map((client) => (
                        <SelectItem key={client._id || client.id} value={client._id || client.id || ''}>
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {client.type === 'natural' ? client.fullName : client.companyName}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              SAP: {client.sapCode}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formErrors.clientId && (
                    <p className="text-xs text-red-500">{formErrors.clientId}</p>
                  )}
                </div>

                {/* Route Validation Display */}
                {formData.pickupLocation && formData.dropoffLocation && (
                  <>
                    {formData.crewMembers.length === 0 ? (
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
                    ) : pricing && pricing.currentPrice > 0 ? (
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
                              <span>{formData.crewMembers.length} pasajero{formData.crewMembers.length !== 1 ? 's' : ''}</span>
                            </div>
                            <div className="text-xs mt-1">
                              Tipo: {formData.moveType === 'RT' ? 'Round Trip' : 
                                     formData.moveType === 'SINGLE' ? 'Single' :
                                     formData.moveType === 'INTERNAL' ? 'Internal' :
                                     formData.moveType === 'BAGS_CLAIM' ? 'Bags Claim' :
                                     formData.moveType === 'DOCUMENTATION' ? 'Documentation' :
                                     formData.moveType === 'NO_SHOW' ? 'No Show' : 'Single'}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ) : pricing && pricing.error ? (
                      <Card className="bg-red-50 border-red-200">
                        <CardContent className="pt-4">
                          <div className="flex items-center gap-2 mb-2">
                            <AlertTriangle className="h-4 w-4 text-red-600" />
                            <span className="font-medium text-red-800">Error de Validación</span>
                          </div>
                          <p className="text-sm text-red-600">
                            {pricing.error}
                          </p>
                        </CardContent>
                      </Card>
                    ) : formData.crewMembers.length > 0 ? (
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
                            <div>• {formData.crewMembers.length} pasajero{formData.crewMembers.length !== 1 ? 's' : ''}</div>
                            <div>• Tipo: {formData.moveType === 'RT' ? 'Round Trip' : 
                                           formData.moveType === 'SINGLE' ? 'Single' :
                                           formData.moveType === 'INTERNAL' ? 'Internal' :
                                           formData.moveType === 'BAGS_CLAIM' ? 'Bags Claim' :
                                           formData.moveType === 'DOCUMENTATION' ? 'Documentation' :
                                           formData.moveType === 'NO_SHOW' ? 'No Show' : 'Single'}</div>
                            <div>• Ruta: {(() => {
                              const pickupLoc = locations.find(loc => loc.name === formData.pickupLocation);
                              const dropoffLoc = locations.find(loc => loc.name === formData.dropoffLocation);
                              return `${pickupLoc?.metadata?.siteTypeName || 'N/A'} → ${dropoffLoc?.metadata?.siteTypeName || 'N/A'}`;
                            })()}</div>
                          </div>
                          <p className="text-xs text-yellow-600 mt-2">
                            Contacte al administrador para configurar esta ruta.
                          </p>
                        </CardContent>
                      </Card>
                    ) : null}
                  </>
                )}
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Crew Members Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Crew Members
            </CardTitle>
            <div className="flex items-center gap-2">
              <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-semibold">
                {formData.crewMembers.length} {formData.crewMembers.length === 1 ? 'Pasajero' : 'Pasajeros'}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {formData.crewMembers.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No crew members added yet. Click the + button to add one.
              </div>
            ) : (
              <div className="space-y-2">
                {/* Column Headers */}
                <div className="grid gap-4 items-center px-3 pb-2 border-b" style={{ gridTemplateColumns: '50px 2fr 1fr 1fr 1fr 1fr' }}>
                  <div className="text-xs font-semibold text-gray-600"></div>
                  <div className="text-xs font-semibold text-gray-600">Name</div>
                  <div className="text-xs font-semibold text-gray-600">Nationality</div>
                  <div className="text-xs font-semibold text-gray-600">Crew Rank</div>
                  <div className="text-xs font-semibold text-gray-600">Categoría</div>
                  <div className="text-xs font-semibold text-gray-600">Flight</div>
                </div>
                
                {formData.crewMembers.map((member, index) => (
                  <div key={member.id} className="grid gap-4 items-center p-3 border rounded-lg" style={{ gridTemplateColumns: '50px 2fr 1fr 1fr 1fr 1fr' }}>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeCrewMember(member.id)}
                      className="h-8 w-8 p-0"
                    >
                      <Plus className="h-4 w-4 rotate-45" />
                    </Button>
                    
                    <div>
                      <Input
                        placeholder="Alfabético"
                        value={member.name}
                        onChange={(e) => updateCrewMember(member.id, 'name', e.target.value)}
                        className={`text-sm ${formErrors[`crewMember_${index}_name`] ? 'border-red-500' : ''}`}
                      />
                      {formErrors[`crewMember_${index}_name`] && (
                        <p className="text-xs text-red-500 mt-1">{formErrors[`crewMember_${index}_name`]}</p>
                      )}
                    </div>
                    
                    <div>
                      <Select
                        value={member.nationality}
                        onValueChange={(value) => updateCrewMember(member.id, 'nationality', value)}
                      >
                        <SelectTrigger className={formErrors[`crewMember_${index}_nationality`] ? 'border-red-500' : ''}>
                          <SelectValue placeholder="Nacionalidad" />
                        </SelectTrigger>
                        <SelectContent>
                          {nationalities.map((nationality) => (
                            <SelectItem key={nationality._id} value={nationality.name}>
                              {nationality.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {formErrors[`crewMember_${index}_nationality`] && (
                        <p className="text-xs text-red-500 mt-1">{formErrors[`crewMember_${index}_nationality`]}</p>
                      )}
                    </div>
                    
                    <div>
                      <Select
                        value={member.crewRank}
                        onValueChange={(value) => updateCrewMember(member.id, 'crewRank', value)}
                      >
                        <SelectTrigger className={formErrors[`crewMember_${index}_crewRank`] ? 'border-red-500' : ''}>
                          <SelectValue placeholder="Rango" />
                        </SelectTrigger>
                        <SelectContent>
                          {ranks.map((rank) => (
                            <SelectItem key={rank._id} value={rank.name}>
                              {rank.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {formErrors[`crewMember_${index}_crewRank`] && (
                        <p className="text-xs text-red-500 mt-1">{formErrors[`crewMember_${index}_crewRank`]}</p>
                      )}
                    </div>
                    
                    <div>
                      <Select
                        value={member.crewCategory}
                        onValueChange={(value) => updateCrewMember(member.id, 'crewCategory', value)}
                      >
                        <SelectTrigger className={formErrors[`crewMember_${index}_crewCategory`] ? 'border-red-500' : ''}>
                          <SelectValue placeholder="Categoría" />
                        </SelectTrigger>
                        <SelectContent>
                          {crewStatuses.map((status) => (
                            <SelectItem key={status._id} value={status.name}>
                              {status.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {formErrors[`crewMember_${index}_crewCategory`] && (
                        <p className="text-xs text-red-500 mt-1">{formErrors[`crewMember_${index}_crewCategory`]}</p>
                      )}
                    </div>
                    
                    <div>
                      <Input
                        placeholder="alfanumérico"
                        value={member.flight}
                        onChange={(e) => updateCrewMember(member.id, 'flight', e.target.value)}
                        className={`text-sm ${formErrors[`crewMember_${index}_flight`] ? 'border-red-500' : ''}`}
                      />
                      {formErrors[`crewMember_${index}_flight`] && (
                        <p className="text-xs text-red-500 mt-1">{formErrors[`crewMember_${index}_flight`]}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <Button
              type="button"
              variant="outline"
              onClick={addCrewMember}
              className="w-full"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Crew Member
            </Button>
            
            {formErrors.crewMembers && (
              <p className="text-xs text-red-500">{formErrors.crewMembers}</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}