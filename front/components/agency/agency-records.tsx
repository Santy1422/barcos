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
  Car, Search, Filter, Download, Eye, FileText, Calendar, DollarSign, 
  User, Loader2, Trash2, Edit, RefreshCw, MapPin, ArrowRight, Paperclip, 
  Clock, Save, X, Ship, Users, Plane, Building 
} from "lucide-react"
import { useAgencyServices } from "@/lib/features/agencyServices/useAgencyServices"
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

  // Local state
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [clientFilter, setClientFilter] = useState("all")
  const [vesselFilter, setVesselFilter] = useState("")
  const [selectedService, setSelectedService] = useState<any>(null)
  
  // Edit modal state
  const [editFormData, setEditFormData] = useState({
    waitingTime: 0
  })

  // Load services on component mount
  useEffect(() => {
    fetchServices({ page: 1, limit: 20 })
  }, [fetchServices])

  // Load service data when edit modal opens
  useEffect(() => {
    if (modals?.showEditModal && selectedService) {
      setEditFormData({
        waitingTime: selectedService.waitingTime || 0
      })
    }
  }, [modals?.showEditModal, selectedService])

  // Apply filters
  useEffect(() => {
    const filterObj: any = {}
    
    if (searchTerm) {
      filterObj.search = searchTerm
    }
    if (statusFilter !== "all") {
      filterObj.status = statusFilter
    }
    if (clientFilter !== "all") {
      filterObj.clientId = clientFilter
    }
    if (vesselFilter) {
      filterObj.vessel = vesselFilter
    }

    setFilters(filterObj)
    fetchServices({ page: 1, limit: 20, filters: filterObj })
  }, [searchTerm, statusFilter, clientFilter, vesselFilter, setFilters, fetchServices])

  const handleClearFilters = () => {
    setSearchTerm("")
    setStatusFilter("all")
    setClientFilter("all")
    setVesselFilter("")
    clearFilters()
    fetchServices({ page: 1, limit: 20 })
  }

  const handleStatusChange = async (serviceId: string, newStatus: string) => {
    try {
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

  const handleEditService = async () => {
    if (!selectedService) return
    
    try {
      await updateService({
        id: selectedService._id,
        updateData: {
          waitingTime: editFormData.waitingTime / 60 // Convert minutes to hours for backend
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
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'in_progress':
        return 'bg-blue-100 text-blue-800'
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'prefacturado':
        return 'bg-purple-100 text-purple-800'
      case 'facturado':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Pending'
      case 'in_progress':
        return 'In Progress'
      case 'completed':
        return 'Completed'
      case 'prefacturado':
        return 'Pre-invoiced'
      case 'facturado':
        return 'Invoiced'
      default:
        return status
    }
  }

  const formatSafeDate = (dateValue: any) => {
    if (!dateValue) return 'N/A'
    
    try {
      // Si ya es una fecha válida
      if (dateValue instanceof Date && !isNaN(dateValue.getTime())) {
        return format(dateValue, 'MMM dd, yyyy')
      }
      
      // Si es string, intentar parsearlo
      const date = new Date(dateValue)
      if (isNaN(date.getTime())) {
        return 'Invalid Date'
      }
      
      return format(date, 'MMM dd, yyyy')
    } catch (error) {
      return 'Invalid Date'
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
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{totalServices}</div>
            <p className="text-xs text-muted-foreground">Total Services</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">
              {services.filter(s => s.status === 'pending').length}
            </div>
            <p className="text-xs text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">
              {services.filter(s => s.status === 'in_progress').length}
            </div>
            <p className="text-xs text-muted-foreground">In Progress</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">
              {services.filter(s => s.status === 'completed').length}
            </div>
            <p className="text-xs text-muted-foreground">Completed</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid gap-4 md:grid-cols-5">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search crew, vessel..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>

            <Input
              placeholder="Filter by vessel..."
              value={vesselFilter}
              onChange={(e) => setVesselFilter(e.target.value)}
            />

            <Button variant="outline" onClick={handleClearFilters}>
              Clear Filters
            </Button>

            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Services Table */}
      <Card>
        <CardHeader>
          <CardTitle>Services ({services.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Crew</TableHead>
                  <TableHead>Vessel</TableHead>
                  <TableHead>Route</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                      Loading services...
                    </TableCell>
                  </TableRow>
                ) : services.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      No services found
                    </TableCell>
                  </TableRow>
                ) : (
                  services.map((service) => (
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
                        <div>
                          {service.crewMembers && service.crewMembers.length > 0 ? (
                            <>
                              <div className="font-medium">
                                {service.crewMembers[0].name}
                                {service.crewMembers.length > 1 && (
                                  <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                                    +{service.crewMembers.length - 1} más
                                  </span>
                                )}
                              </div>
                              {service.crewMembers[0].crewRank && (
                                <div className="text-sm text-muted-foreground">
                                  {service.crewMembers[0].crewRank}
                                </div>
                              )}
                              {service.crewMembers[0].nationality && (
                                <div className="text-xs text-muted-foreground">
                                  {service.crewMembers[0].nationality}
                                </div>
                              )}
                            </>
                          ) : (
                            <>
                              <div className="font-medium">{service.crewName || '-'}</div>
                              {service.crewRank && (
                                <div className="text-sm text-muted-foreground">
                                  {service.crewRank}
                                </div>
                              )}
                              {service.nationality && (
                                <div className="text-xs text-muted-foreground">
                                  {service.nationality}
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="font-medium">{service.vessel}</div>
                        {service.voyage && (
                          <div className="text-sm text-muted-foreground">
                            Voyage: {service.voyage}
                          </div>
                        )}
                      </TableCell>
                      
                      <TableCell>
                        <div className="text-sm">
                          {/* First leg */}
                          <div className="flex items-center">
                            <MapPin className="h-3 w-3 mr-1" />
                            {service.pickupLocation}
                            <ArrowRight className="h-3 w-3 mx-2" />
                            {service.dropoffLocation}
                          </div>
                          {/* Second leg for Round Trip */}
                          {service.moveType === 'RT' && service.returnDropoffLocation && (
                            <div className="flex items-center mt-1 text-xs text-muted-foreground">
                              <MapPin className="h-3 w-3 mr-1" />
                              {service.dropoffLocation}
                              <ArrowRight className="h-3 w-3 mx-2" />
                              {service.returnDropoffLocation}
                              <span className="ml-2 text-blue-600 font-medium">(Return)</span>
                            </div>
                          )}
                          {/* Move type indicator */}
                          <div className="text-xs text-blue-600 font-medium mt-1">
                            {service.moveType === 'RT' ? 'Round Trip' :
                             service.moveType === 'SINGLE' ? 'Single' :
                             service.moveType === 'INTERNAL' ? 'Internal' :
                             service.moveType === 'BAGS_CLAIM' ? 'Bags Claim' :
                             service.moveType === 'DOCUMENTATION' ? 'Documentation' : 'Single'}
                          </div>
                        </div>
                        {service.transportCompany && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {service.transportCompany}
                          </div>
                        )}
                      </TableCell>
                      
                      <TableCell>
                        <Badge className={getStatusColor(service.status)}>
                          {getStatusLabel(service.status)}
                        </Badge>
                      </TableCell>
                      
                      <TableCell>
                        {service.price ? (
                          <div className="font-medium">
                            {service.currency === 'USD' ? '$' : service.currency} 
                            {service.price}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
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
                          
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleOpenEditModal(service._id)}
                            disabled={!['pending', 'in_progress'].includes(service.status)}
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
                          
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {/* Handle files */}}
                          >
                            <Paperclip className="h-3 w-3" />
                            {service.attachments?.length > 0 && (
                              <span className="ml-1 text-xs">
                                {service.attachments.length}
                              </span>
                            )}
                          </Button>
                          
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteService(service._id)}
                            disabled={service.status === 'facturado'}
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
          <div className="space-y-4">
            <p id="status-dialog-description" className="text-sm text-muted-foreground">
              Select the new status for this service
            </p>
            
            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => {
                  if (selectedService) {
                    handleStatusChange(selectedService, 'pending')
                  }
                }}
              >
                <Badge className="bg-yellow-100 text-yellow-800 mr-2">
                  Pending
                </Badge>
                Set as Pending
              </Button>
              
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => {
                  if (selectedService) {
                    handleStatusChange(selectedService, 'in_progress')
                  }
                }}
              >
                <Badge className="bg-blue-100 text-blue-800 mr-2">
                  In Progress
                </Badge>
                Set as In Progress
              </Button>
              
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => {
                  if (selectedService) {
                    handleStatusChange(selectedService, 'completed')
                  }
                }}
              >
                <Badge className="bg-green-100 text-green-800 mr-2">
                  Completed
                </Badge>
                Set as Completed
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeModals}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Service Modal */}
      <Dialog open={modals?.showEditModal} onOpenChange={closeModals}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Service</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedService && (
              <>
                <div className="text-sm text-muted-foreground">
                  <p><strong>Service ID:</strong> {selectedService._id}</p>
                  <p><strong>Date:</strong> {formatSafeDate(selectedService.pickupDate)}</p>
                  <p><strong>Time:</strong> {selectedService.pickupTime || 'N/A'}</p>
                  <p><strong>Route:</strong> {selectedService.pickupLocation} → {selectedService.dropoffLocation}</p>
                  {selectedService.moveType === 'RT' && selectedService.returnDropoffLocation && (
                    <p><strong>Return:</strong> {selectedService.dropoffLocation} → {selectedService.returnDropoffLocation}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="waitingTime" className="text-sm font-medium">
                    Tiempo de Espera (minutos)
                  </Label>
                  <div className="relative">
                    <Clock className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="waitingTime"
                      type="number"
                      min="0"
                      max="1440"
                      step="5"
                      value={editFormData.waitingTime}
                      onChange={(e) => setEditFormData(prev => ({ 
                        ...prev, 
                        waitingTime: parseInt(e.target.value) || 0 
                      }))}
                      className="pl-8"
                      placeholder="Enter waiting time in minutes"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Current waiting time: {selectedService.waitingTime ? `${selectedService.waitingTime * 60} minutes` : 'Not set'}
                  </p>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeModals}>
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button onClick={handleEditService} disabled={!selectedService}>
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </Button>
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
                        <DollarSign className="h-4 w-4" />
                        Pricing Information
                      </h3>
                      <div className="space-y-2 text-sm">
                        <div><strong>Price:</strong> 
                          {selectedService.price ? 
                            `${selectedService.currency === 'USD' ? '$' : selectedService.currency} ${selectedService.price}` : 
                            'Not set'
                          }
                        </div>
                        <div><strong>Passengers:</strong> {selectedService.passengerCount || 'N/A'}</div>
                        <div><strong>Waiting Time:</strong> 
                          {selectedService.waitingTime ? 
                            `${selectedService.waitingTime * 60} minutes` : 
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