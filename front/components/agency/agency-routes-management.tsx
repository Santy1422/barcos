"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Route, MapPin, Plus, Edit, Trash2, X, Save, DollarSign, 
  Users, RefreshCw, Eye, ArrowRight, Search
} from "lucide-react"
import { useAgencyRoutes } from "@/lib/features/agencyServices/useAgencyRoutes"
import { useAgencyCatalogs } from "@/lib/features/agencyServices/useAgencyCatalogs"
import { useToast } from "@/hooks/use-toast"
import type { AgencyRouteInput, PassengerPriceRange, RoutePricing } from "@/lib/features/agencyServices/agencyRoutesSlice"

// Tipos de ruta
const ROUTE_TYPES = [
  { value: 'single', label: 'Single (Solo Ida)' },
  { value: 'roundtrip', label: 'Round Trip (Ida y Vuelta)' },
  { value: 'internal', label: 'Internal (Interno)' },
  { value: 'bags_claim', label: 'Bags Claim (Reclamo de Equipaje)' },
  { value: 'documentation', label: 'Documentation (Documentación)' }
] as const

// Plantilla de rangos de pasajeros por defecto
const DEFAULT_PASSENGER_RANGES: PassengerPriceRange[] = [
  { minPassengers: 1, maxPassengers: 3, price: 0, description: '1-3 pasajeros' },
  { minPassengers: 4, maxPassengers: 7, price: 0, description: '4-7 pasajeros' },
  { minPassengers: 8, maxPassengers: 999, price: 0, description: '8+ pasajeros' }
]

export function AgencyRoutesManagement() {
  const { toast } = useToast()
  
  const {
    routes,
    loading,
    isCreating,
    isUpdating,
    fetchRoutes,
    createRoute,
    updateRoute,
    deactivateRoute,
    reactivateRoute,
    deleteRoute,
    statistics,
    fetchStatistics
  } = useAgencyRoutes()

  const {
    siteTypes,
    fetchGroupedCatalogs
  } = useAgencyCatalogs()

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showViewModal, setShowViewModal] = useState(false)
  const [selectedRoute, setSelectedRoute] = useState<any>(null)

  // Form state
  const [formData, setFormData] = useState<{
    pickupSiteType: string
    dropoffSiteType: string
    pricing: RoutePricing[]
    currency: string
    waitingTimeRate: number
    extraPassengerRate: number
    description: string
    notes: string
    distance: number | undefined
    estimatedDuration: number | undefined
  }>({
    pickupSiteType: '',
    dropoffSiteType: '',
    pricing: [
      {
        routeType: 'single',
        passengerRanges: JSON.parse(JSON.stringify(DEFAULT_PASSENGER_RANGES))
      },
      {
        routeType: 'roundtrip',
        passengerRanges: JSON.parse(JSON.stringify(DEFAULT_PASSENGER_RANGES))
      },
      {
        routeType: 'internal',
        passengerRanges: JSON.parse(JSON.stringify(DEFAULT_PASSENGER_RANGES))
      },
      {
        routeType: 'bags_claim',
        passengerRanges: JSON.parse(JSON.stringify(DEFAULT_PASSENGER_RANGES))
      },
      {
        routeType: 'documentation',
        passengerRanges: JSON.parse(JSON.stringify(DEFAULT_PASSENGER_RANGES))
      }
    ],
    currency: 'USD',
    waitingTimeRate: 10,
    extraPassengerRate: 20,
    description: '',
    notes: '',
    distance: undefined,
    estimatedDuration: undefined
  })

  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [searchTerm, setSearchTerm] = useState('')

  // Load data on mount
  useEffect(() => {
    console.log('Loading routes management...')
    fetchGroupedCatalogs()
    fetchRoutes({ page: 1, limit: 100 }).then(() => {
      console.log('Routes fetched, total:', routes.length)
    })
    fetchStatistics()
  }, [fetchGroupedCatalogs, fetchRoutes, fetchStatistics])

  const handleOpenCreateModal = () => {
    setFormData({
      pickupSiteType: '',
      dropoffSiteType: '',
      pricing: [
        {
          routeType: 'single',
          passengerRanges: JSON.parse(JSON.stringify(DEFAULT_PASSENGER_RANGES))
        },
        {
          routeType: 'roundtrip',
          passengerRanges: JSON.parse(JSON.stringify(DEFAULT_PASSENGER_RANGES))
        },
        {
          routeType: 'internal',
          passengerRanges: JSON.parse(JSON.stringify(DEFAULT_PASSENGER_RANGES))
        },
        {
          routeType: 'bags_claim',
          passengerRanges: JSON.parse(JSON.stringify(DEFAULT_PASSENGER_RANGES))
        },
        {
          routeType: 'documentation',
          passengerRanges: JSON.parse(JSON.stringify(DEFAULT_PASSENGER_RANGES))
        }
      ],
      currency: 'USD',
      waitingTimeRate: 10,
      extraPassengerRate: 20,
      description: '',
      notes: '',
      distance: undefined,
      estimatedDuration: undefined
    })
    setFormErrors({})
    setShowCreateModal(true)
  }

  const handleOpenEditModal = (route: any) => {
    setSelectedRoute(route)
    setFormData({
      pickupSiteType: route.pickupSiteType || route.pickupLocation || '',
      dropoffSiteType: route.dropoffSiteType || route.dropoffLocation || '',
      pricing: route.pricing,
      currency: route.currency || 'USD',
      waitingTimeRate: route.waitingTimeRate || 10,
      extraPassengerRate: route.extraPassengerRate || 20,
      description: route.description || '',
      notes: route.notes || '',
      distance: route.distance,
      estimatedDuration: route.estimatedDuration
    })
    setFormErrors({})
    setShowEditModal(true)
  }

  const handleOpenViewModal = (route: any) => {
    setSelectedRoute(route)
    setShowViewModal(true)
  }

  const handleCloseModals = () => {
    setShowCreateModal(false)
    setShowEditModal(false)
    setShowViewModal(false)
    setSelectedRoute(null)
    setFormErrors({})
  }

  const updatePricing = (routeType: 'single' | 'roundtrip', rangeIndex: number, field: keyof PassengerPriceRange, value: any) => {
    setFormData(prev => ({
      ...prev,
      pricing: prev.pricing.map(p => {
        if (p.routeType === routeType) {
          const newRanges = [...p.passengerRanges]
          newRanges[rangeIndex] = {
            ...newRanges[rangeIndex],
            [field]: value
          }
          return { ...p, passengerRanges: newRanges }
        }
        return p
      })
    }))
  }

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {}

    if (!formData.pickupSiteType) errors.pickupSiteType = 'Pickup site type is required'
    if (!formData.dropoffSiteType) errors.dropoffSiteType = 'Dropoff site type is required'
    if (formData.pickupSiteType === formData.dropoffSiteType) {
      errors.dropoffSiteType = 'Dropoff site type must be different from pickup site type'
    }

    // Validate pricing
    formData.pricing.forEach((pricing, pIndex) => {
      pricing.passengerRanges.forEach((range, rIndex) => {
        if (range.price < 0) {
          errors[`pricing_${pIndex}_${rIndex}`] = 'Price cannot be negative'
        }
      })
    })

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    console.log('🔧 [FRONTEND] handleSubmit - Form data:', formData)
    
    if (!validateForm()) {
      console.log('❌ [FRONTEND] Validation failed:', formErrors)
      toast({
        title: "Validation Error",
        description: "Please fix the errors and try again",
        variant: "destructive",
      })
      return
    }

    try {
      const routeData: AgencyRouteInput = {
        pickupSiteType: formData.pickupSiteType,
        dropoffSiteType: formData.dropoffSiteType,
        pricing: formData.pricing,
        currency: formData.currency,
        waitingTimeRate: formData.waitingTimeRate,
        extraPassengerRate: formData.extraPassengerRate,
        description: formData.description,
        notes: formData.notes,
        distance: formData.distance,
        estimatedDuration: formData.estimatedDuration
      }

      console.log('🔧 [FRONTEND] Sending route data:', routeData)

      if (selectedRoute) {
        await updateRoute({
          id: selectedRoute._id,
          updateData: routeData
        })
        toast({
          title: "Success",
          description: "Route updated successfully",
        })
      } else {
        const result = await createRoute(routeData)
        console.log('✅ [FRONTEND] Route created successfully:', result)
        toast({
          title: "Success",
          description: "Route created successfully",
        })
      }
      
      handleCloseModals()
      
      // Esperar un momento antes de refrescar
      setTimeout(() => {
        fetchRoutes({ page: 1, limit: 100 })
        fetchStatistics()
      }, 300)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save route",
        variant: "destructive",
      })
    }
  }

  const handleToggleActive = async (route: any) => {
    try {
      if (route.isActive) {
        await deactivateRoute(route._id)
        toast({
          title: "Success",
          description: "Route deactivated",
        })
      } else {
        await reactivateRoute(route._id)
        toast({
          title: "Success",
          description: "Route reactivated",
        })
      }
      fetchRoutes({ page: 1, limit: 100 })
      fetchStatistics()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update route status",
        variant: "destructive",
      })
    }
  }

  const handleDeleteRoute = async (route: any) => {
    if (!confirm(`¿Está seguro que desea eliminar permanentemente la ruta "${route.name}"?\n\nEsta acción no se puede deshacer.`)) {
      return
    }

    try {
      await deleteRoute(route._id)
      toast({
        title: "Success",
        description: "Route deleted successfully",
      })
      fetchRoutes({ page: 1, limit: 100 })
      fetchStatistics()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete route",
        variant: "destructive",
      })
    }
  }

  const filteredRoutes = routes.filter(route => {
    const searchLower = searchTerm.toLowerCase()
    return (
      route.name.toLowerCase().includes(searchLower) ||
      (route.pickupSiteType && route.pickupSiteType.toLowerCase().includes(searchLower)) ||
      (route.dropoffSiteType && route.dropoffSiteType.toLowerCase().includes(searchLower)) ||
      (route.pickupLocation && route.pickupLocation.toLowerCase().includes(searchLower)) ||
      (route.dropoffLocation && route.dropoffLocation.toLowerCase().includes(searchLower))
    )
  })

  // Debug: log routes
  useEffect(() => {
    console.log('Current routes in state:', routes.length, routes)
  }, [routes])

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-green-500 flex items-center justify-center">
              <Route className="h-6 w-6 text-white" />
            </div>
            Route Pricing Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage routes with dynamic pricing based on passenger count and route type
          </p>
        </div>
        <Button onClick={handleOpenCreateModal} className="bg-green-600 hover:bg-green-700">
          <Plus className="h-4 w-4 mr-2" />
          Create Route
        </Button>
      </div>

      {/* Quick Stats */}
      {statistics && (
        <div className="grid gap-4 md:grid-cols-5">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{statistics.totalRoutes}</div>
              <p className="text-xs text-muted-foreground">Total Routes</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">{statistics.activeRoutes}</div>
              <p className="text-xs text-muted-foreground">Active Routes</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-red-600">{statistics.inactiveRoutes}</div>
              <p className="text-xs text-muted-foreground">Inactive Routes</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-blue-600">{statistics.routesWithSingle}</div>
              <p className="text-xs text-muted-foreground">With Single Pricing</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-purple-600">{statistics.routesWithRoundtrip}</div>
              <p className="text-xs text-muted-foreground">With Roundtrip Pricing</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search routes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
        </CardContent>
      </Card>

      {/* Routes Table */}
      <Card>
        <CardHeader>
          <CardTitle>Routes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Route Name</TableHead>
                  <TableHead>Pickup Site Type</TableHead>
                  <TableHead>Dropoff Site Type</TableHead>
                  <TableHead>Price Range</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRoutes.map((route) => {
                  // Get all pricing info
                  const allPrices = route.pricing.flatMap(p => p.passengerRanges.map(r => r.price))
                  const minPrice = allPrices.length > 0 ? Math.min(...allPrices) : 0
                  const maxPrice = allPrices.length > 0 ? Math.max(...allPrices) : 0
                  
                  return (
                    <TableRow key={route._id}>
                      <TableCell className="font-medium">{route.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-blue-500" />
                          {route.pickupSiteType || route.pickupLocation}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-green-500" />
                          {route.dropoffSiteType || route.dropoffLocation}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3" />
                          ${minPrice} - ${maxPrice}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {route.pricing.length} tipo(s) de ruta
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={route.isActive ? "default" : "secondary"}>
                          {route.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleOpenViewModal(route)}
                            title="View details"
                          >
                            <Eye className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleOpenEditModal(route)}
                            title="Edit route"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleToggleActive(route)}
                            title={route.isActive ? "Deactivate route" : "Reactivate route"}
                          >
                            <RefreshCw className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteRoute(route)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            title="Delete route permanently"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
                
                {filteredRoutes.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      No routes found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Create/Edit Modal */}
      <Dialog open={showCreateModal || showEditModal} onOpenChange={handleCloseModals}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedRoute ? 'Edit Route' : 'Create New Route'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Site Types */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pickupSiteType">
                  Pickup Site Type * <MapPin className="inline h-3 w-3 text-blue-500" />
                </Label>
                <Select
                  value={formData.pickupSiteType}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, pickupSiteType: value }))}
                  disabled={!!selectedRoute}
                >
                  <SelectTrigger className={formErrors.pickupSiteType ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Select pickup site type" />
                  </SelectTrigger>
                  <SelectContent>
                    {siteTypes.map((siteType) => (
                      <SelectItem key={siteType._id} value={siteType.name}>
                        {siteType.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formErrors.pickupSiteType && (
                  <p className="text-xs text-red-500">{formErrors.pickupSiteType}</p>
                )}
                {siteTypes.length === 0 && (
                  <p className="text-xs text-yellow-600">
                    No site types available. Create site types first in Catalogs.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="dropoffSiteType">
                  Dropoff Site Type * <MapPin className="inline h-3 w-3 text-green-500" />
                </Label>
                <Select
                  value={formData.dropoffSiteType}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, dropoffSiteType: value }))}
                  disabled={!!selectedRoute}
                >
                  <SelectTrigger className={formErrors.dropoffSiteType ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Select dropoff site type" />
                  </SelectTrigger>
                  <SelectContent>
                    {siteTypes.map((siteType) => (
                      <SelectItem key={siteType._id} value={siteType.name}>
                        {siteType.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formErrors.dropoffSiteType && (
                  <p className="text-xs text-red-500">{formErrors.dropoffSiteType}</p>
                )}
              </div>
            </div>

            {/* Route Name Preview */}
            {formData.pickupSiteType && formData.dropoffSiteType && (
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-sm font-medium text-blue-900">
                  Route Name: {formData.pickupSiteType} / {formData.dropoffSiteType}
                </p>
              </div>
            )}

            {/* Pricing Configuration */}
            <div className="space-y-4">
              <Label className="text-lg font-semibold">Pricing Configuration</Label>
              
              <Tabs defaultValue="single" className="w-full">
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="single">Single</TabsTrigger>
                  <TabsTrigger value="roundtrip">Roundtrip</TabsTrigger>
                  <TabsTrigger value="internal">Internal</TabsTrigger>
                  <TabsTrigger value="bags_claim">Bags Claim</TabsTrigger>
                  <TabsTrigger value="documentation">Documentation</TabsTrigger>
                </TabsList>

                {(['single', 'roundtrip', 'internal', 'bags_claim', 'documentation'] as const).map((routeType) => {
                  const pricing = formData.pricing.find(p => p.routeType === routeType)
                  if (!pricing) return null

                  return (
                    <TabsContent key={routeType} value={routeType} className="space-y-4">
                      <div className="space-y-3">
                        {pricing.passengerRanges.map((range, index) => (
                          <div key={index} className="grid grid-cols-4 gap-3 items-end p-3 border rounded-lg">
                            <div className="space-y-2">
                              <Label className="text-xs">Min Passengers</Label>
                              <Input
                                type="number"
                                min="1"
                                value={range.minPassengers}
                                onChange={(e) => updatePricing(routeType, index, 'minPassengers', parseInt(e.target.value) || 1)}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs">Max Passengers</Label>
                              <Input
                                type="number"
                                min="1"
                                value={range.maxPassengers}
                                onChange={(e) => updatePricing(routeType, index, 'maxPassengers', parseInt(e.target.value) || 1)}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs">Price ($)</Label>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={range.price}
                                onChange={(e) => updatePricing(routeType, index, 'price', parseFloat(e.target.value) || 0)}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs">Description</Label>
                              <Input
                                value={range.description || ''}
                                onChange={(e) => updatePricing(routeType, index, 'description', e.target.value)}
                                placeholder="e.g., 1-3 passengers"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </TabsContent>
                  )
                })}
              </Tabs>
            </div>

            {/* Additional Configuration */}
            <div className="space-y-2">
              <Label>Waiting Time Rate (per minute)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={formData.waitingTimeRate}
                onChange={(e) => setFormData(prev => ({ ...prev, waitingTimeRate: parseFloat(e.target.value) || 0 }))}
              />
              <p className="text-xs text-muted-foreground">Precio por minuto de espera</p>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseModals}>
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
              <Button type="submit" disabled={isCreating || isUpdating}>
                <Save className="mr-2 h-4 w-4" />
                {isCreating || isUpdating ? 'Saving...' : 'Save Route'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Modal */}
      <Dialog open={showViewModal} onOpenChange={() => setShowViewModal(false)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Route Details</DialogTitle>
          </DialogHeader>
          {selectedRoute && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-blue-500" />
                  <span className="font-medium">{selectedRoute.pickupSiteType || selectedRoute.pickupLocation}</span>
                </div>
                <ArrowRight className="h-5 w-5 text-gray-400" />
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-green-500" />
                  <span className="font-medium">{selectedRoute.dropoffSiteType || selectedRoute.dropoffLocation}</span>
                </div>
              </div>

              <Tabs defaultValue="single" className="w-full">
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="single">Single</TabsTrigger>
                  <TabsTrigger value="roundtrip">Roundtrip</TabsTrigger>
                  <TabsTrigger value="internal">Internal</TabsTrigger>
                  <TabsTrigger value="bags_claim">Bags Claim</TabsTrigger>
                  <TabsTrigger value="documentation">Documentation</TabsTrigger>
                </TabsList>

                {(['single', 'roundtrip', 'internal', 'bags_claim', 'documentation'] as const).map((routeType) => {
                  const pricing = selectedRoute.pricing.find((p: any) => p.routeType === routeType)
                  if (!pricing) return null

                  return (
                    <TabsContent key={routeType} value={routeType}>
                      <div className="space-y-2">
                        {pricing.passengerRanges.map((range: PassengerPriceRange, index: number) => (
                          <div key={index} className="flex justify-between items-center p-3 border rounded-lg">
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4 text-gray-500" />
                              <span>{range.minPassengers} - {range.maxPassengers} passengers</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <DollarSign className="h-4 w-4 text-green-600" />
                              <span className="font-bold text-green-600">${range.price}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </TabsContent>
                  )
                })}
              </Tabs>

              <div className="pt-4 border-t">
                <Label className="text-xs text-muted-foreground">Waiting Time Rate</Label>
                <p className="font-medium">${selectedRoute.waitingTimeRate}/hour</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

