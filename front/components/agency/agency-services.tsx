"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { 
  UserPlus, Save, RotateCcw, ChevronDown, Clock, CheckCircle, 
  MapPin, Ship, User, Calendar, DollarSign, AlertCircle, Loader2, Calculator 
} from "lucide-react"
import { useAgencyServices } from "@/lib/features/agencyServices/useAgencyServices"
import { useAgencyCatalogs } from "@/lib/features/agencyServices/useAgencyCatalogs"
import { useToast } from "@/hooks/use-toast"
import { format } from "date-fns"

interface ServiceFormData {
  pickupDate: string
  pickupTime: string
  pickupLocation: string
  dropoffLocation: string
  vessel: string
  crewName: string
  clientId: string
  voyage?: string
  crewRank?: string
  nationality?: string
  transportCompany?: string
  driverName?: string
  flightInfo?: string
  waitingTime?: number
  comments?: string
  serviceCode?: string
  price?: number
  currency: string
}

const initialFormData: ServiceFormData = {
  pickupDate: '',
  pickupTime: '',
  pickupLocation: '',
  dropoffLocation: '',
  vessel: '',
  crewName: '',
  clientId: '',
  voyage: '',
  crewRank: '',
  nationality: '',
  transportCompany: '',
  driverName: '',
  flightInfo: '',
  waitingTime: 0,
  comments: '',
  serviceCode: '',
  price: 0,
  currency: 'USD'
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
  const [showOptionalFields, setShowOptionalFields] = useState(false)
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
        passengerCount: 1 // Default to 1 passenger for now
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
    calculateServicePrice,
    clearPricingState
  ])

  // Update form price when pricing is calculated
  useEffect(() => {
    if (currentPrice > 0 && currentPrice !== formData.price) {
      setFormData(prev => ({ ...prev, price: currentPrice }));
    }
  }, [currentPrice, formData.price])

  const handleInputChange = (field: keyof ServiceFormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Clear error when user starts typing
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {}

    // Required fields
    if (!formData.pickupDate) errors.pickupDate = 'Pickup date is required'
    if (!formData.pickupTime) errors.pickupTime = 'Pickup time is required'
    if (!formData.pickupLocation) errors.pickupLocation = 'Pickup location is required'
    if (!formData.dropoffLocation) errors.dropoffLocation = 'Drop-off location is required'
    if (!formData.vessel) errors.vessel = 'Vessel is required'
    if (!formData.crewName) errors.crewName = 'Crew name is required'
    if (!formData.clientId) errors.clientId = 'Client is required'

    // Validation rules
    if (formData.pickupLocation === formData.dropoffLocation) {
      errors.dropoffLocation = 'Drop-off location must be different from pickup location'
    }

    if (formData.price && formData.price < 0) {
      errors.price = 'Price cannot be negative'
    }

    if (formData.waitingTime && formData.waitingTime < 0) {
      errors.waitingTime = 'Waiting time cannot be negative'
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
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
      // Use calculated price or manual price
      const servicePrice = currentPrice > 0 ? currentPrice : (formData.price || 0);
      
      await createService({
        pickupDate: formData.pickupDate,
        pickupTime: formData.pickupTime,
        pickupLocation: formData.pickupLocation,
        dropoffLocation: formData.dropoffLocation,
        vessel: formData.vessel,
        crewName: formData.crewName,
        clientId: formData.clientId,
        voyage: formData.voyage || undefined,
        crewRank: formData.crewRank || undefined,
        nationality: formData.nationality || undefined,
        transportCompany: formData.transportCompany || undefined,
        driverName: formData.driverName || undefined,
        flightInfo: formData.flightInfo || undefined,
        waitingTime: formData.waitingTime || undefined,
        comments: formData.comments || undefined,
        serviceCode: formData.serviceCode || undefined,
        price: servicePrice,
        currency: formData.currency
      })

      toast({
        title: "Success",
        description: "Service created successfully",
      })

      // Reset form
      setFormData(initialFormData)
      setShowOptionalFields(false)
      
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
    setShowOptionalFields(false)
    clearPricingState()
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-green-500 flex items-center justify-center">
              <UserPlus className="h-6 w-6 text-white" />
            </div>
            Create New Service
          </h1>
          <p className="text-muted-foreground mt-1">
            Create a new transportation service for crew members
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-500" />
              <div>
                <div className="text-2xl font-bold">{quickStats.pending}</div>
                <p className="text-xs text-muted-foreground">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-blue-500" />
              <div>
                <div className="text-2xl font-bold">{quickStats.inProgress}</div>
                <p className="text-xs text-muted-foreground">In Progress</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <div>
                <div className="text-2xl font-bold">{quickStats.completed}</div>
                <p className="text-xs text-muted-foreground">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-purple-500" />
              <div>
                <div className="text-2xl font-bold">${quickStats.totalValue.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">Total Value</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Service Form */}
      <Card>
        <CardHeader>
          <CardTitle>Service Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Required Fields */}
            <div className="grid gap-4 md:grid-cols-2">
              {/* Pickup Date */}
              <div className="space-y-2">
                <Label htmlFor="pickupDate">
                  Pickup Date <span className="text-red-500">*</span>
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
                  <p className="text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {formErrors.pickupDate}
                  </p>
                )}
              </div>

              {/* Pickup Time */}
              <div className="space-y-2">
                <Label htmlFor="pickupTime">
                  Pickup Time <span className="text-red-500">*</span>
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
                  <p className="text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {formErrors.pickupTime}
                  </p>
                )}
              </div>

              {/* Pickup Location */}
              <div className="space-y-2">
                <Label htmlFor="pickupLocation">
                  Pickup Location <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.pickupLocation}
                  onValueChange={(value) => handleInputChange('pickupLocation', value)}
                >
                  <SelectTrigger className={formErrors.pickupLocation ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Select pickup location" />
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
                  <p className="text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {formErrors.pickupLocation}
                  </p>
                )}
              </div>

              {/* Drop-off Location */}
              <div className="space-y-2">
                <Label htmlFor="dropoffLocation">
                  Drop-off Location <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.dropoffLocation}
                  onValueChange={(value) => handleInputChange('dropoffLocation', value)}
                >
                  <SelectTrigger className={formErrors.dropoffLocation ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Select drop-off location" />
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
                  <p className="text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {formErrors.dropoffLocation}
                  </p>
                )}
              </div>

              {/* Vessel */}
              <div className="space-y-2">
                <Label htmlFor="vessel">
                  Vessel <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Ship className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="vessel"
                    value={formData.vessel}
                    onChange={(e) => handleInputChange('vessel', e.target.value)}
                    placeholder="MSC FANTASIA"
                    className={`pl-8 ${formErrors.vessel ? 'border-red-500' : ''}`}
                  />
                </div>
                {formErrors.vessel && (
                  <p className="text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {formErrors.vessel}
                  </p>
                )}
              </div>

              {/* Crew Name */}
              <div className="space-y-2">
                <Label htmlFor="crewName">
                  Crew Name <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <User className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="crewName"
                    value={formData.crewName}
                    onChange={(e) => handleInputChange('crewName', e.target.value)}
                    placeholder="John Smith"
                    className={`pl-8 ${formErrors.crewName ? 'border-red-500' : ''}`}
                  />
                </div>
                {formErrors.crewName && (
                  <p className="text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {formErrors.crewName}
                  </p>
                )}
              </div>
            </div>

            {/* Price Display */}
            {(formData.pickupLocation && formData.dropoffLocation) && (
              <Card className={`${currentPrice > 0 ? 'bg-green-50 border-green-200' : 'bg-gray-50'}`}>
                <CardContent className="pt-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Calculator className="h-4 w-4" />
                        <h3 className="font-semibold">Calculated Price</h3>
                        {routeFound && (
                          <Badge variant="outline" className="text-xs bg-blue-50">
                            Route Found
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {pricing.description || `${formData.pickupLocation} → ${formData.dropoffLocation}`}
                      </p>
                    </div>
                    <div className="text-right">
                      {pricingLoading ? (
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span className="text-sm text-muted-foreground">Calculating...</span>
                        </div>
                      ) : pricingError ? (
                        <div className="flex items-center gap-2 text-red-500">
                          <AlertCircle className="h-4 w-4" />
                          <span className="text-sm">Error calculating price</span>
                        </div>
                      ) : currentPrice > 0 ? (
                        <div>
                          <p className="text-2xl font-bold text-green-600">
                            ${currentPrice.toLocaleString()}
                          </p>
                          <p className="text-xs text-muted-foreground">USD</p>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No price available</p>
                      )}
                    </div>
                  </div>
                  
                  {/* Price Breakdown */}
                  {priceBreakdown && currentPrice > 0 && (
                    <div className="mt-3 pt-3 border-t border-green-200">
                      <div className="text-sm space-y-1">
                        <div className="flex justify-between">
                          <span>Base Rate:</span>
                          <span>${priceBreakdown.baseRate.toLocaleString()}</span>
                        </div>
                        {priceBreakdown.waitingTime > 0 && (
                          <div className="flex justify-between">
                            <span>Waiting Time ({formData.waitingTime}h):</span>
                            <span>${priceBreakdown.waitingTime.toLocaleString()}</span>
                          </div>
                        )}
                        {priceBreakdown.extraPassengers > 0 && (
                          <div className="flex justify-between">
                            <span>Extra Passengers:</span>
                            <span>${priceBreakdown.extraPassengers.toLocaleString()}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Client Selection - Full Width */}
            <div className="space-y-2">
              <Label htmlFor="clientId">
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
                  <SelectItem value="default-client">MSC Shipping</SelectItem>
                  {/* Add actual clients from useClients hook */}
                </SelectContent>
              </Select>
              {formErrors.clientId && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {formErrors.clientId}
                </p>
              )}
            </div>

            {/* Optional Fields - Collapsible */}
            <Collapsible open={showOptionalFields} onOpenChange={setShowOptionalFields}>
              <CollapsibleTrigger asChild>
                <Button type="button" variant="ghost" className="w-full">
                  <ChevronDown className={`h-4 w-4 mr-2 transition-transform ${showOptionalFields ? 'rotate-180' : ''}`} />
                  Optional Fields
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="grid gap-4 md:grid-cols-3 mt-4">
                  {/* Voyage */}
                  <div className="space-y-2">
                    <Label htmlFor="voyage">Voyage</Label>
                    <Input
                      id="voyage"
                      value={formData.voyage}
                      onChange={(e) => handleInputChange('voyage', e.target.value)}
                      placeholder="V001"
                    />
                  </div>

                  {/* Crew Rank */}
                  <div className="space-y-2">
                    <Label htmlFor="crewRank">Crew Rank</Label>
                    <Select
                      value={formData.crewRank}
                      onValueChange={(value) => handleInputChange('crewRank', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select rank" />
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

                  {/* Nationality */}
                  <div className="space-y-2">
                    <Label htmlFor="nationality">Nationality</Label>
                    <Select
                      value={formData.nationality}
                      onValueChange={(value) => handleInputChange('nationality', value)}
                    >
                      <SelectTrigger>
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

                  {/* Transport Company */}
                  <div className="space-y-2">
                    <Label htmlFor="transportCompany">Transport Company</Label>
                    <Select
                      value={formData.transportCompany}
                      onValueChange={(value) => handleInputChange('transportCompany', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select company" />
                      </SelectTrigger>
                      <SelectContent>
                        {transportCompanies.map((company) => (
                          <SelectItem key={company._id} value={company.name}>
                            {company.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Driver */}
                  <div className="space-y-2">
                    <Label htmlFor="driverName">Driver</Label>
                    <Select
                      value={formData.driverName}
                      onValueChange={(value) => handleInputChange('driverName', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select driver" />
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
                  </div>

                  {/* Waiting Time */}
                  <div className="space-y-2">
                    <Label htmlFor="waitingTime">Waiting Time (hours)</Label>
                    <Input
                      id="waitingTime"
                      type="number"
                      min="0"
                      step="0.5"
                      value={formData.waitingTime}
                      onChange={(e) => handleInputChange('waitingTime', parseFloat(e.target.value) || 0)}
                      placeholder="0"
                    />
                  </div>

                  {/* Price */}
                  <div className="space-y-2">
                    <Label htmlFor="price" className="flex items-center gap-2">
                      Price 
                      {currentPrice > 0 && (
                        <Badge variant="outline" className="text-xs">
                          Auto-calculated
                        </Badge>
                      )}
                    </Label>
                    <div className="flex">
                      <Select
                        value={formData.currency}
                        onValueChange={(value) => handleInputChange('currency', value)}
                      >
                        <SelectTrigger className="w-20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="USD">USD</SelectItem>
                          <SelectItem value="PAB">PAB</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        id="price"
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.price}
                        onChange={(e) => handleInputChange('price', parseFloat(e.target.value) || 0)}
                        placeholder={pricingLoading ? "Calculating..." : "0.00"}
                        className={`rounded-l-none ${currentPrice > 0 ? 'bg-green-50' : ''}`}
                        disabled={pricingLoading}
                      />
                    </div>
                    {currentPrice > 0 && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calculator className="h-3 w-3" />
                        Price calculated automatically based on route
                      </p>
                    )}
                  </div>

                  {/* Service Code */}
                  <div className="space-y-2">
                    <Label htmlFor="serviceCode">Service Code</Label>
                    <Select
                      value={formData.serviceCode}
                      onValueChange={(value) => handleInputChange('serviceCode', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select service code" />
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
                  </div>

                  {/* Flight Info - Full Width */}
                  <div className="space-y-2 md:col-span-3">
                    <Label htmlFor="flightInfo">Flight Information</Label>
                    <Input
                      id="flightInfo"
                      value={formData.flightInfo}
                      onChange={(e) => handleInputChange('flightInfo', e.target.value)}
                      placeholder="AA1234 - Departing 14:30"
                    />
                  </div>

                  {/* Comments - Full Width */}
                  <div className="space-y-2 md:col-span-3">
                    <Label htmlFor="comments">Comments</Label>
                    <Textarea
                      id="comments"
                      value={formData.comments}
                      onChange={(e) => handleInputChange('comments', e.target.value)}
                      placeholder="Additional notes or special instructions..."
                      rows={3}
                    />
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Form Actions */}
            <div className="flex gap-4 pt-4">
              <Button 
                type="submit" 
                disabled={isCreating || loading}
                className="flex-1 md:flex-none"
              >
                <Save className="mr-2 h-4 w-4" />
                {isCreating ? 'Creating...' : 'Create Service'}
              </Button>
              
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleClearForm}
                disabled={isCreating || loading}
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Clear Form
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}