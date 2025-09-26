"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { 
  Plus, Save, Send, 
  MapPin, Ship, User, Calendar, Clock, Plane, Users, DollarSign
} from "lucide-react"
import { useAgencyServices } from "@/lib/features/agencyServices/useAgencyServices"
import { useAgencyCatalogs } from "@/lib/features/agencyServices/useAgencyCatalogs"
import { useToast } from "@/hooks/use-toast"
import { format } from "date-fns"

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
  vessel: string
  voyage: string
  taulia: string
  moveType: 'RT' | 'SINGLE'
  transportCompany: string
  driver: string
  totalWaitingTime: number
  approve: boolean
  comments: string
  crewMembers: CrewMember[]
  serviceCode?: string    // Para matcheo con códigos SAP/Taulia
  waitingTime?: number    // Horas de espera para cálculo de precio
  price?: number          // Precio calculado automáticamente
  currency?: string       // Moneda (USD por defecto)
  passengerCount?: number // Número de pasajeros para cálculo
}

const initialFormData: ServiceFormData = {
  pickupDate: '',
  pickupTime: '',
  pickupLocation: '',
  dropoffLocation: '',
  vessel: '',
  voyage: '',
  taulia: '',
  moveType: 'SINGLE',
  transportCompany: '',
  driver: '',
  totalWaitingTime: 0,
  approve: false,
  comments: '',
  crewMembers: [],
  serviceCode: 'ECR000669',  // Código SAP por defecto
  waitingTime: 0,             // Tiempo de espera inicial
  price: 0,                   // Precio inicial
  currency: 'USD',            // Moneda por defecto
  passengerCount: 1           // Un pasajero por defecto
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
    vessels,
    transportCompanies,
    drivers,
    tauliaCodes,
    fetchGroupedCatalogs
  } = useAgencyCatalogs()

  // Form state
  const [formData, setFormData] = useState<ServiceFormData>(initialFormData)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  // Load data on mount
  useEffect(() => {
    fetchGroupedCatalogs()
    fetchServices({ page: 1, limit: 10 })
  }, [fetchGroupedCatalogs, fetchServices])

  // Auto-calculate pricing when locations, service code, waiting time or passenger count change
  useEffect(() => {
    if (formData.pickupLocation && formData.dropoffLocation) {
      calculateServicePrice({
        pickupLocation: formData.pickupLocation,
        dropoffLocation: formData.dropoffLocation,
        serviceCode: formData.serviceCode || undefined,
        waitingTime: formData.waitingTime || 0,
        passengerCount: formData.passengerCount || 1
      });
    } else {
      // Clear pricing when locations are not set
      clearPricingState();
    }
  }, [
    formData.pickupLocation, 
    formData.dropoffLocation, 
    formData.serviceCode,
    formData.waitingTime,
    formData.passengerCount,
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
    setFormData(prev => ({ ...prev, [field]: value }))
    
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
  }

  const removeCrewMember = (id: string) => {
    setFormData(prev => ({
      ...prev,
      crewMembers: prev.crewMembers.filter(member => member.id !== id)
    }))
  }

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {}

    // Required fields
    if (!formData.pickupDate) errors.pickupDate = 'Pickup date is required'
    if (!formData.pickupTime) errors.pickupTime = 'Pickup time is required'
    if (!formData.pickupLocation) errors.pickupLocation = 'Pickup location is required'
    if (!formData.dropoffLocation) errors.dropoffLocation = 'Drop-off location is required'
    if (!formData.vessel) errors.vessel = 'Vessel is required'
    if (!formData.taulia) errors.taulia = 'Taulia is required'
    if (!formData.transportCompany) errors.transportCompany = 'Transport company is required'
    if (!formData.driver) errors.driver = 'Driver is required'

    // Validation rules
    if (formData.pickupLocation === formData.dropoffLocation) {
      errors.dropoffLocation = 'Drop-off location must be different from pickup location'
    }

    if (formData.totalWaitingTime && formData.totalWaitingTime < 0) {
      errors.totalWaitingTime = 'Waiting time cannot be negative'
    }

    if (formData.crewMembers.length === 0) {
      errors.crewMembers = 'At least one crew member is required'
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
      await createService({
        pickupDate: formData.pickupDate,
        pickupTime: formData.pickupTime,
        pickupLocation: formData.pickupLocation,
        dropoffLocation: formData.dropoffLocation,
        vessel: formData.vessel,
        voyage: formData.voyage,
        taulia: formData.taulia,
        moveType: formData.moveType,
        transportCompany: formData.transportCompany,
        driver: formData.driver,
        totalWaitingTime: formData.totalWaitingTime,
        approve: formData.approve,
        comments: formData.comments,
        crewMembers: formData.crewMembers,
        // Incluir campos de pricing y SAP
        serviceCode: formData.serviceCode || 'ECR000669',
        waitingTime: formData.waitingTime || 0,
        price: pricing?.currentPrice || formData.price || 0,
        currency: formData.currency || 'USD',
        passengerCount: formData.passengerCount || 1
      })

      toast({
        title: "Success",
        description: action === 'create' 
          ? "Service order created successfully" 
          : "Service order created and sent to driver successfully",
      })

      // Reset form
      setFormData(initialFormData)
      
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
            disabled={isCreating || loading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Save className="mr-2 h-4 w-4" />
            Create
          </Button>
          <Button 
            onClick={(e) => handleSubmit(e, 'createAndSend')}
            disabled={isCreating || loading}
            className="bg-green-600 hover:bg-green-700"
          >
            <Send className="mr-2 h-4 w-4" />
            Create & Send
          </Button>
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
                      min={format(new Date(), 'yyyy-MM-dd')}
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
                      <SelectValue placeholder="del catálogo / selección dinámica" />
                    </SelectTrigger>
                    <SelectContent>
                      {locations.map((location) => (
                        <SelectItem key={location._id} value={location.name}>
                          <div className="flex items-center gap-2">
                            <MapPin className="h-3 w-3" />
                            {location.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formErrors.pickupLocation && (
                    <p className="text-xs text-red-500">{formErrors.pickupLocation}</p>
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
                      <SelectValue placeholder="del catálogo / selección dinámica" />
                    </SelectTrigger>
                    <SelectContent>
                      {locations.map((location) => (
                        <SelectItem key={location._id} value={location.name}>
                          <div className="flex items-center gap-2">
                            <MapPin className="h-3 w-3" />
                            {location.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formErrors.dropoffLocation && (
                    <p className="text-xs text-red-500">{formErrors.dropoffLocation}</p>
                  )}
                </div>

                {/* Automatic Price Display */}
                {pricing && pricing.currentPrice > 0 && formData.pickupLocation && formData.dropoffLocation && (
                  <Card className="bg-green-50 border-green-200">
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2 mb-2">
                        <DollarSign className="h-4 w-4 text-green-600" />
                        <span className="font-medium text-green-800">Precio Calculado Automáticamente</span>
                      </div>
                      <div className="text-2xl font-bold text-green-700">
                        ${pricing.currentPrice || formData.price || 0} {formData.currency || 'USD'}
                      </div>
                      {pricing.priceBreakdown && (
                        <div className="text-sm text-green-600 mt-2 space-y-1">
                          <div>Tarifa Base: ${pricing.priceBreakdown.baseRate || 0}</div>
                          <div>Tiempo de Espera: ${pricing.priceBreakdown.waitingTime || 0}</div>
                          <div>Pasajeros Extra: ${pricing.priceBreakdown.extraPassengers || 0}</div>
                        </div>
                      )}
                      <div className="text-xs text-green-600 mt-2">
                        {pricing.routeFound ? '✅ Precio basado en ruta específica' : '⚠️ Precio por defecto aplicado'}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Service Code (SAP/Taulia) */}
                <div className="space-y-2">
                  <Label htmlFor="serviceCode" className="text-sm font-medium">
                    Código de Servicio (SAP)
                  </Label>
                  <Input
                    id="serviceCode"
                    value={formData.serviceCode || 'ECR000669'}
                    onChange={(e) => handleInputChange('serviceCode', e.target.value)}
                    placeholder="ECR000669"
                  />
                  <p className="text-xs text-muted-foreground">Código SAP/Taulia para facturación</p>
                </div>

                {/* Waiting Time */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="waitingTime" className="text-sm font-medium">
                      Tiempo de Espera (horas)
                    </Label>
                    <Input
                      id="waitingTime"
                      type="number"
                      min="0"
                      max="24"
                      step="0.5"
                      value={formData.waitingTime || 0}
                      onChange={(e) => handleInputChange('waitingTime', parseFloat(e.target.value) || 0)}
                      className="w-full"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="passengerCount" className="text-sm font-medium">
                      Número de Pasajeros
                    </Label>
                    <Input
                      id="passengerCount"
                      type="number"
                      min="1"
                      max="50"
                      value={formData.passengerCount || 1}
                      onChange={(e) => handleInputChange('passengerCount', parseInt(e.target.value) || 1)}
                      className="w-full"
                    />
                  </div>
                </div>

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
                    VESSEL <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.vessel}
                    onValueChange={(value) => handleInputChange('vessel', value)}
                  >
                    <SelectTrigger className={formErrors.vessel ? 'border-red-500' : ''}>
                      <SelectValue placeholder="del catálogo / selección dinámica" />
                    </SelectTrigger>
                    <SelectContent>
                      {vessels.map((vessel) => (
                        <SelectItem key={vessel._id} value={vessel.name}>
                          <div className="flex items-center gap-2">
                            <Ship className="h-3 w-3" />
                            {vessel.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formErrors.vessel && (
                    <p className="text-xs text-red-500">{formErrors.vessel}</p>
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

                {/* Taulia */}
                <div className="space-y-2">
                  <Label htmlFor="taulia" className="text-sm font-medium">
                    TAULIA <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.taulia}
                    onValueChange={(value) => handleInputChange('taulia', value)}
                  >
                    <SelectTrigger className={formErrors.taulia ? 'border-red-500' : ''}>
                      <SelectValue placeholder="del catálogo / selección dinámica" />
                    </SelectTrigger>
                    <SelectContent>
                      {tauliaCodes.map((code) => (
                        <SelectItem key={code._id} value={code.code || code.name}>
                          <div>
                            <div>{code.name}</div>
                            {code.code && (
                              <div className="text-xs text-muted-foreground">
                                {code.code}
                              </div>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formErrors.taulia && (
                    <p className="text-xs text-red-500">{formErrors.taulia}</p>
                  )}
                </div>

                {/* Move Type */}
                <div className="space-y-2">
                  <Label htmlFor="moveType" className="text-sm font-medium">
                    Move type
                  </Label>
                  <Select
                    value={formData.moveType}
                    onValueChange={(value) => handleInputChange('moveType', value as 'RT' | 'SINGLE')}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="RT o SINGLE" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="RT">RT</SelectItem>
                      <SelectItem value="SINGLE">SINGLE</SelectItem>
                    </SelectContent>
                  </Select>
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
                      <SelectValue placeholder="del catálogo / selección dinámica" />
                    </SelectTrigger>
                    <SelectContent>
                      {transportCompanies.map((company) => (
                        <SelectItem key={company._id} value={company.name}>
                          {company.name}
                        </SelectItem>
                      ))}
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
                      <SelectValue placeholder="del catálogo / selección dinámica" />
                    </SelectTrigger>
                    <SelectContent>
                      {drivers.map((driver) => (
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
                      ))}
                    </SelectContent>
                  </Select>
                  {formErrors.driver && (
                    <p className="text-xs text-red-500">{formErrors.driver}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Waiting Time & Approval */}
            <div className="grid gap-4 md:grid-cols-2 pt-4 border-t">
              <div className="space-y-2">
                <Label htmlFor="totalWaitingTime" className="text-sm font-medium">
                  Total Waiting Time
                </Label>
                <Input
                  id="totalWaitingTime"
                  type="number"
                  min="0"
                  step="0.5"
                  value={formData.totalWaitingTime}
                  onChange={(e) => handleInputChange('totalWaitingTime', parseFloat(e.target.value) || 0)}
                  placeholder="Numérico"
                />
                {formErrors.totalWaitingTime && (
                  <p className="text-xs text-red-500">{formErrors.totalWaitingTime}</p>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="approve"
                    checked={formData.approve}
                    onCheckedChange={(checked) => handleInputChange('approve', checked as boolean)}
                  />
                  <Label htmlFor="approve" className="text-sm font-medium">
                    Approve
                  </Label>
                </div>
                <div className="bg-yellow-50 p-3 rounded-lg text-xs text-gray-700">
                  Total del tiempo considerando más de 1:20 entre pickup y onroute y/o arrived y completed. 
                  Si hubo waiting time en el pickup y el dropoff, se sumariza todo. Debe poder editarse.
                </div>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Crew Members Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Crew Members
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {formData.crewMembers.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No crew members added yet. Click the + button to add one.
              </div>
            ) : (
              <div className="space-y-2">
                {formData.crewMembers.map((member, index) => (
                  <div key={member.id} className="grid grid-cols-6 gap-4 items-center p-3 border rounded-lg">
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
                        className="text-sm"
                      />
                    </div>
                    
                    <div>
                      <Select
                        value={member.nationality}
                        onValueChange={(value) => updateCrewMember(member.id, 'nationality', value)}
                      >
                        <SelectTrigger>
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
                    </div>
                    
                    <div>
                      <Select
                        value={member.crewRank}
                        onValueChange={(value) => updateCrewMember(member.id, 'crewRank', value)}
                      >
                        <SelectTrigger>
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
                    </div>
                    
                    <div>
                      <Select
                        value={member.crewCategory}
                        onValueChange={(value) => updateCrewMember(member.id, 'crewCategory', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Categoría" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Visit">Visit</SelectItem>
                          <SelectItem value="On Signer">On Signer</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Input
                        placeholder="alfanumérico"
                        value={member.flight}
                        onChange={(e) => updateCrewMember(member.id, 'flight', e.target.value)}
                        className="text-sm"
                      />
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

      {/* Workflow Note */}
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
        <div className="flex">
          <div className="ml-3">
            <p className="text-sm text-yellow-700">
              <strong>Nota:</strong> Que se marque en rojo el SR. Será necesaria la aprobación para envío de factura.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}