"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { 
  Car, Search, Filter, Download, Eye, FileText, Calendar, DollarSign, 
  User, Loader2, Trash2, Edit, RefreshCw, MapPin, ArrowRight, Paperclip 
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

  // Load services on component mount
  useEffect(() => {
    fetchServices({ page: 1, limit: 20 })
  }, [fetchServices])

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
                            {format(new Date(service.pickupDate), 'MMM dd, yyyy')}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {service.pickupTime}
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
                        <div className="flex items-center text-sm">
                          <MapPin className="h-3 w-3 mr-1" />
                          {service.pickupLocation}
                          <ArrowRight className="h-3 w-3 mx-2" />
                          {service.dropoffLocation}
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
                            onClick={() => openViewModal(service._id)}
                          >
                            <Eye className="h-3 w-3" />
                          </Button>
                          
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openEditModal(service._id)}
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
    </div>
  )
}