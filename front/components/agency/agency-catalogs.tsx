"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { 
  MapPin, Flag, Users, Ship, Building, User, Code, Plus, Edit, 
  Trash2, Download, Search, AlertCircle, Save, X, RotateCcw, Route, DollarSign, Building2, Clock
} from "lucide-react"
import { useAgencyCatalogs } from "@/lib/features/agencyServices/useAgencyCatalogs"
import { useToast } from "@/hooks/use-toast"
import type { CatalogType, AgencyCatalog } from "@/lib/features/agencyServices/agencyCatalogsSlice"
import { AgencyRoutesManagement } from "./agency-routes-management"

interface CatalogTypeConfig {
  key: CatalogType
  label: string
  icon: React.ComponentType<{ className?: string }>
  description: string
  fields: {
    name: string
    code?: boolean
    description?: boolean
    metadata?: Array<{ key: string; label: string; type: 'text' | 'number' }>
  }
}

// Standard catalog types (excluding waiting_time which has special UI)
const catalogTypes: CatalogTypeConfig[] = [
  {
    key: 'site_type',
    label: 'Site Types',
    icon: Building2,
    description: 'Location site types for routing (Airport, Hotel, Port, etc)',
    fields: {
      name: 'Site Type Name',
      description: true
    }
  },
  {
    key: 'location',
    label: 'Locations',
    icon: MapPin,
    description: 'Pickup and drop-off locations associated with site types',
    fields: {
      name: 'Location Name',
      metadata: [
        { key: 'siteTypeId', label: 'Site Type', type: 'text' },
        { key: 'siteTypeName', label: 'Site Type Name', type: 'text' }
      ]
    }
  },
  {
    key: 'nationality',
    label: 'Nationalities',
    icon: Flag,
    description: 'Crew member nationalities',
    fields: {
      name: 'Country Name'
    }
  },
  {
    key: 'rank',
    label: 'Crew Ranks',
    icon: Users,
    description: 'Crew member ranks and positions',
    fields: {
      name: 'Crew Rank',
      code: true
    }
  },
  {
    key: 'vessel',
    label: 'Vessels',
    icon: Ship,
    description: 'Ships and vessels',
    fields: {
      name: 'Vessel Name',
      metadata: [
        { key: 'shippingLine', label: 'Shipping Line', type: 'text' }
      ]
    }
  },
  {
    key: 'transport_company',
    label: 'Transport Companies',
    icon: Building,
    description: 'Transportation service providers',
    fields: {
      name: 'Company Name'
    }
  },
  {
    key: 'driver',
    label: 'Drivers',
    icon: User,
    description: 'Transportation drivers',
    fields: {
      name: 'Driver Name',
      metadata: [
        { key: 'phone', label: 'Phone Number', type: 'text' },
        { key: 'company', label: 'Company', type: 'text' }
      ]
    }
  }
]

export function AgencyCatalogs() {
  const { toast } = useToast()
  
  const {
    groupedCatalogs,
    loading,
    isCreating,
    isUpdating,
    error,
    fetchGroupedCatalogs,
    createCatalog,
    updateCatalog,
    deactivateCatalog,
    reactivateCatalog,
    deleteCatalog,
    quickStats,
    siteTypes
  } = useAgencyCatalogs()

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedCatalogType, setSelectedCatalogType] = useState<CatalogType>('location')
  const [editingCatalog, setEditingCatalog] = useState<AgencyCatalog | null>(null)

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    metadata: {} as Record<string, any>
  })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  // Waiting Time Rate state
  const [waitingTimeRate, setWaitingTimeRate] = useState(0)
  const [isSavingWaitingTime, setIsSavingWaitingTime] = useState(false)

  // Search state
  const [searchTerm, setSearchTerm] = useState('')

  // Load catalogs on mount
  useEffect(() => {
    fetchGroupedCatalogs()
  }, [fetchGroupedCatalogs])

  // Load waiting time rate when catalogs are loaded
  useEffect(() => {
    if (groupedCatalogs?.taulia_code) {
      const waitingTimeConfig = groupedCatalogs.taulia_code.find(
        (c: any) => c.code === 'WAITING_TIME_RATE' && c.isActive
      )
      if (waitingTimeConfig) {
        setWaitingTimeRate(waitingTimeConfig.metadata?.price || 0)
      }
    }
  }, [groupedCatalogs])

  const getCurrentTypeConfig = () => 
    catalogTypes.find(type => type.key === selectedCatalogType) || catalogTypes[0]

  const getCatalogsForType = (type: CatalogType) => {
    if (!groupedCatalogs) return []
    return groupedCatalogs[type] || []
  }

  const getFilteredCatalogs = (type: CatalogType) => {
    const catalogs = getCatalogsForType(type)
    if (!searchTerm) return catalogs
    
    return catalogs.filter(catalog =>
      catalog.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      catalog.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      catalog.description?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }

  const handleCreateCatalog = (type: CatalogType) => {
    setSelectedCatalogType(type)
    setFormData({
      name: '',
      code: '',
      description: '',
      metadata: {}
    })
    setFormErrors({})
    setShowCreateModal(true)
  }

  const handleEditCatalog = (catalog: AgencyCatalog) => {
    setEditingCatalog(catalog)
    setSelectedCatalogType(catalog.type)
    setFormData({
      name: catalog.name,
      code: catalog.code || '',
      description: catalog.description || '',
      metadata: catalog.metadata || {}
    })
    setFormErrors({})
    setShowEditModal(true)
  }

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {}
    
    if (!formData.name.trim()) {
      errors.name = 'Name is required'
    }

    const typeConfig = getCurrentTypeConfig()
    if (typeConfig.fields.code && !formData.code.trim()) {
      errors.code = 'Code is required'
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    const typeConfig = getCurrentTypeConfig()
    const catalogData = {
      type: selectedCatalogType,
      name: formData.name.trim(),
      ...(typeConfig.fields.code && { code: formData.code.trim() }),
      ...(typeConfig.fields.description && { description: formData.description.trim() }),
      metadata: formData.metadata
    }

    try {
      if (editingCatalog) {
        await updateCatalog({
          id: editingCatalog._id,
          updateData: catalogData
        })
        toast({
          title: "Success",
          description: "Catalog entry updated successfully",
        })
      } else {
        await createCatalog(catalogData)
        toast({
          title: "Success",
          description: "Catalog entry created successfully",
        })
      }
      
      handleCloseModals()
      fetchGroupedCatalogs()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save catalog entry",
        variant: "destructive",
      })
    }
  }

  const handleToggleActive = async (catalog: AgencyCatalog) => {
    if (!confirm(`Are you sure you want to ${catalog.isActive ? 'deactivate' : 'reactivate'} "${catalog.name}"?`)) return

    try {
      if (catalog.isActive) {
        await deactivateCatalog(catalog._id)
        toast({
          title: "Success",
          description: "Catalog entry deactivated",
        })
      } else {
        await reactivateCatalog(catalog._id)
        toast({
          title: "Success",
          description: "Catalog entry reactivated",
        })
      }
      
      fetchGroupedCatalogs()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update catalog entry",
        variant: "destructive",
      })
    }
  }

  const handleDeletePermanently = async (catalog: AgencyCatalog) => {
    const typeLabel = getCurrentTypeConfig().label.slice(0, -1) // Remove 's' from plural
    if (!confirm(`¿Está seguro que desea eliminar permanentemente "${catalog.name}" de ${typeLabel}?\n\nEsta acción no se puede deshacer.`)) {
      return
    }

    try {
      await deleteCatalog(catalog._id)
      toast({
        title: "Success",
        description: `${typeLabel} deleted successfully`,
      })
      fetchGroupedCatalogs()
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to delete ${typeLabel.toLowerCase()}`,
        variant: "destructive",
      })
    }
  }

  const handleCloseModals = () => {
    setShowCreateModal(false)
    setShowEditModal(false)
    setEditingCatalog(null)
    setFormData({
      name: '',
      code: '',
      description: '',
      metadata: {}
    })
    setFormErrors({})
  }

  const handleMetadataChange = (key: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      metadata: {
        ...prev.metadata,
        [key]: value
      }
    }))
  }

  const handleSaveWaitingTimeRate = async () => {
    setIsSavingWaitingTime(true)
    try {
      // Check if waiting time config already exists
      const existingConfig = groupedCatalogs?.taulia_code?.find(
        (c: any) => c.code === 'WAITING_TIME_RATE'
      )

      const catalogData: any = {
        type: 'taulia_code',
        name: 'Waiting Time Hourly Rate',
        code: 'WAITING_TIME_RATE',
        description: 'Default hourly rate for waiting time calculation',
        metadata: {
          price: waitingTimeRate,
          category: 'waiting_time'
        }
      }

      if (existingConfig) {
        // Update existing
        await updateCatalog({
          id: existingConfig._id,
          updateData: catalogData
        })
      } else {
        // Create new
        await createCatalog(catalogData)
      }

      toast({
        title: "Success",
        description: "Waiting time rate saved successfully",
      })
      
      fetchGroupedCatalogs()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save waiting time rate",
        variant: "destructive",
      })
    } finally {
      setIsSavingWaitingTime(false)
    }
  }

  const handleSeedCatalogs = async () => {
    if (!confirm("This will load initial catalog data. Continue?")) return
    
    try {
      // Call seed API endpoint
      const response = await fetch('/api/agency/catalogs/seed', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Initial catalog data loaded successfully",
        })
        fetchGroupedCatalogs()
      } else {
        throw new Error('Seed operation failed')
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load initial catalog data",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-purple-500 flex items-center justify-center">
              <Code className="h-6 w-6 text-white" />
            </div>
            Agency Catalogs
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage locations, drivers, vessels and service codes
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleSeedCatalogs} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Load Initial Data
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-7">
        {catalogTypes.map((type) => (
          <Card key={type.key}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <type.icon className="h-4 w-4 text-blue-500" />
                <div>
                  <div className="text-lg font-bold">
                    {quickStats[type.key]?.active || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">{type.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search catalogs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
        </CardContent>
      </Card>

      {/* Catalog Tabs */}
      <Tabs value={selectedCatalogType} onValueChange={(value) => setSelectedCatalogType(value as CatalogType)}>
        <TabsList className="grid w-full grid-cols-9">
          {catalogTypes.map((type) => (
            <TabsTrigger key={type.key} value={type.key} className="text-xs">
              <type.icon className="h-3 w-3 mr-1" />
              {type.label}
            </TabsTrigger>
          ))}
          <TabsTrigger value="waiting_time" className="text-xs">
            <Clock className="h-3 w-3 mr-1" />
            Waiting Time
          </TabsTrigger>
          <TabsTrigger value="routes" className="text-xs">
            <Route className="h-3 w-3 mr-1" />
            Routes
          </TabsTrigger>
        </TabsList>

        {catalogTypes.map((type) => (
          <TabsContent key={type.key} value={type.key}>
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <type.icon className="h-5 w-5" />
                      {type.label}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {type.description}
                    </p>
                  </div>
                  <Button onClick={() => handleCreateCatalog(type.key)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add {type.label.slice(0, -1)}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        {type.fields.code && (
                          <TableHead>
                            {type.key === 'rank' ? 'Taulia Code' : 'Code'}
                          </TableHead>
                        )}
                        {type.fields.description && <TableHead>Description</TableHead>}
                        {type.fields.metadata && <TableHead>Details</TableHead>}
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {getFilteredCatalogs(type.key).map((catalog) => (
                        <TableRow key={catalog._id}>
                          <TableCell className="font-medium">
                            {catalog.name}
                          </TableCell>
                          {type.fields.code && (
                            <TableCell>
                              <code className="bg-muted px-1 py-0.5 rounded text-xs">
                                {catalog.code}
                              </code>
                            </TableCell>
                          )}
                          {type.fields.description && (
                            <TableCell className="max-w-xs truncate">
                              {catalog.description}
                            </TableCell>
                          )}
                          {type.fields.metadata && (
                            <TableCell>
                              <div className="text-xs space-y-1">
                                {Object.entries(catalog.metadata || {}).map(([key, value]) => (
                                  <div key={key} className="flex gap-1">
                                    <span className="font-medium">{key}:</span>
                                    <span>{String(value)}</span>
                                  </div>
                                ))}
                              </div>
                            </TableCell>
                          )}
                          <TableCell>
                            <Badge variant={catalog.isActive ? "default" : "secondary"}>
                              {catalog.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleEditCatalog(catalog)}
                                title="Edit"
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleToggleActive(catalog)}
                                title={catalog.isActive ? "Deactivate" : "Reactivate"}
                              >
                                <RotateCcw className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeletePermanently(catalog)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                title="Delete permanently"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      
                      {getFilteredCatalogs(type.key).length === 0 && (
                        <TableRow>
                          <TableCell 
                            colSpan={4 + (type.fields.code ? 1 : 0) + (type.fields.description ? 1 : 0) + (type.fields.metadata ? 1 : 0)} 
                            className="h-24 text-center"
                          >
                            No {type.label.toLowerCase()} found
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}

        {/* Waiting Time Tab - Special handling */}
        <TabsContent value="waiting_time">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Waiting Time Configuration
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Configure the hourly rate for waiting time calculation
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="max-w-2xl space-y-6">
                <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                  <div className="flex items-start gap-3">
                    <DollarSign className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-blue-900 mb-2">How it works</h3>
                      <p className="text-sm text-blue-800">
                        When a service has waiting time, the system will automatically calculate the price:
                      </p>
                      <p className="text-sm text-blue-800 font-mono mt-2 bg-white/50 p-2 rounded">
                        Waiting Time Price = (Hours × Hourly Rate)
                      </p>
                      <p className="text-xs text-blue-700 mt-2">
                        Example: 2.5 hours × $50/hour = $125.00
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="hourly-rate" className="text-base font-semibold">
                      Hourly Rate ($/hour)
                    </Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <Input
                        id="hourly-rate"
                        type="number"
                        min="0"
                        step="0.01"
                        value={waitingTimeRate}
                        onChange={(e) => setWaitingTimeRate(parseFloat(e.target.value) || 0)}
                        className="pl-10 text-lg font-semibold h-12"
                        placeholder="0.00"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      This rate will be used to calculate the waiting time price for all services
                    </p>
                  </div>

                  <Button 
                    onClick={handleSaveWaitingTimeRate} 
                    disabled={isSavingWaitingTime || waitingTimeRate < 0}
                    className="w-full"
                  >
                    {isSavingWaitingTime ? (
                      <>
                        <Save className="mr-2 h-4 w-4 animate-pulse" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Save Hourly Rate
                      </>
                    )}
                  </Button>
                </div>

                {/* Current Configuration */}
                {groupedCatalogs?.taulia_code?.find((c: any) => c.code === 'WAITING_TIME_RATE') && (
                  <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Save className="h-4 w-4 text-green-600" />
                      <h4 className="font-semibold text-green-900">Current Configuration</h4>
                    </div>
                    <div className="text-sm text-green-800">
                      <p>Hourly Rate: <span className="font-bold">${waitingTimeRate.toFixed(2)}/hour</span></p>
                      <p className="text-xs mt-1 text-green-700">
                        Last updated: {new Date(groupedCatalogs.taulia_code.find((c: any) => c.code === 'WAITING_TIME_RATE')?.updatedAt || '').toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Routes Tab - Special handling */}
        <TabsContent value="routes">
          <AgencyRoutesManagement />
        </TabsContent>
      </Tabs>

      {/* Create Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Add New {getCurrentTypeConfig().label.slice(0, -1)}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">
                {getCurrentTypeConfig().fields.name} *
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className={formErrors.name ? 'border-red-500' : ''}
                placeholder={`Enter ${getCurrentTypeConfig().fields.name.toLowerCase()}`}
              />
              {formErrors.name && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {formErrors.name}
                </p>
              )}
            </div>

            {getCurrentTypeConfig().fields.code && (
              <div className="space-y-2">
                <Label htmlFor="code">
                  {selectedCatalogType === 'rank' ? 'Taulia Code *' : 'Code *'}
                </Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                  className={formErrors.code ? 'border-red-500' : ''}
                  placeholder={selectedCatalogType === 'rank' ? 'Enter Taulia code' : 'Enter code'}
                />
                {formErrors.code && (
                  <p className="text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {formErrors.code}
                  </p>
                )}
              </div>
            )}

            {getCurrentTypeConfig().fields.description && (
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Enter description"
                  rows={2}
                />
              </div>
            )}

            {getCurrentTypeConfig().fields.metadata?.map((metaField) => {
              // Special handling for Site Type selection in Location catalog
              if (selectedCatalogType === 'location' && metaField.key === 'siteTypeId') {
                return (
                  <div key={metaField.key} className="space-y-2">
                    <Label htmlFor={metaField.key}>
                      {metaField.label} *
                    </Label>
                    <Select
                      value={formData.metadata[metaField.key] || ''}
                      onValueChange={(value) => {
                        const selectedSiteType = siteTypes.find(st => st._id === value)
                        handleMetadataChange('siteTypeId', value)
                        if (selectedSiteType) {
                          handleMetadataChange('siteTypeName', selectedSiteType.name)
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select site type" />
                      </SelectTrigger>
                      <SelectContent>
                        {siteTypes.map((siteType) => (
                          <SelectItem key={siteType._id} value={siteType._id}>
                            {siteType.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {siteTypes.length === 0 && (
                      <p className="text-xs text-yellow-600">
                        No site types available. Please create site types first.
                      </p>
                    )}
                  </div>
                )
              }
              
              // Skip siteTypeName as it's auto-populated
              if (selectedCatalogType === 'location' && metaField.key === 'siteTypeName') {
                return null
              }
              
              return (
                <div key={metaField.key} className="space-y-2">
                  <Label htmlFor={metaField.key}>{metaField.label}</Label>
                  <Input
                    id={metaField.key}
                    type={metaField.type}
                    value={formData.metadata[metaField.key] || ''}
                    onChange={(e) => handleMetadataChange(
                      metaField.key, 
                      metaField.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value
                    )}
                    placeholder={`Enter ${metaField.label.toLowerCase()}`}
                  />
                </div>
              )
            })}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseModals}>
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
              <Button type="submit" disabled={isCreating}>
                <Save className="mr-2 h-4 w-4" />
                {isCreating ? 'Creating...' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Edit {getCurrentTypeConfig().label.slice(0, -1)}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">
                {getCurrentTypeConfig().fields.name} *
              </Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className={formErrors.name ? 'border-red-500' : ''}
              />
              {formErrors.name && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {formErrors.name}
                </p>
              )}
            </div>

            {getCurrentTypeConfig().fields.code && (
              <div className="space-y-2">
                <Label htmlFor="edit-code">
                  {selectedCatalogType === 'rank' ? 'Taulia Code *' : 'Code *'}
                </Label>
                <Input
                  id="edit-code"
                  value={formData.code}
                  onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                  className={formErrors.code ? 'border-red-500' : ''}
                  placeholder={selectedCatalogType === 'rank' ? 'Enter Taulia code' : 'Enter code'}
                />
                {formErrors.code && (
                  <p className="text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {formErrors.code}
                  </p>
                )}
              </div>
            )}

            {getCurrentTypeConfig().fields.description && (
              <div className="space-y-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={2}
                />
              </div>
            )}

            {getCurrentTypeConfig().fields.metadata?.map((metaField) => {
              // Special handling for Site Type selection in Location catalog
              if (selectedCatalogType === 'location' && metaField.key === 'siteTypeId') {
                return (
                  <div key={metaField.key} className="space-y-2">
                    <Label htmlFor={`edit-${metaField.key}`}>
                      {metaField.label} *
                    </Label>
                    <Select
                      value={formData.metadata[metaField.key] || ''}
                      onValueChange={(value) => {
                        const selectedSiteType = siteTypes.find(st => st._id === value)
                        handleMetadataChange('siteTypeId', value)
                        if (selectedSiteType) {
                          handleMetadataChange('siteTypeName', selectedSiteType.name)
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select site type" />
                      </SelectTrigger>
                      <SelectContent>
                        {siteTypes.map((siteType) => (
                          <SelectItem key={siteType._id} value={siteType._id}>
                            {siteType.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )
              }
              
              // Skip siteTypeName as it's auto-populated
              if (selectedCatalogType === 'location' && metaField.key === 'siteTypeName') {
                return null
              }
              
              return (
                <div key={metaField.key} className="space-y-2">
                  <Label htmlFor={`edit-${metaField.key}`}>{metaField.label}</Label>
                  <Input
                    id={`edit-${metaField.key}`}
                    type={metaField.type}
                    value={formData.metadata[metaField.key] || ''}
                    onChange={(e) => handleMetadataChange(
                      metaField.key, 
                      metaField.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value
                    )}
                  />
                </div>
              )
            })}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseModals}>
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
              <Button type="submit" disabled={isUpdating}>
                <Save className="mr-2 h-4 w-4" />
                {isUpdating ? 'Updating...' : 'Update'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}