"use client"

import { useState, useEffect } from "react"
import { useAppDispatch, useAppSelector } from "@/lib/hooks"
import {
  fetchPricingConfigs,
  fetchActiveConfig,
  createPricingConfig,
  updatePricingConfig,
  deletePricingConfig,
  clonePricingConfig,
  importSeedConfig,
  setSelectedConfig,
  selectAllPricingConfigs,
  selectActivePricingConfig,
  selectSelectedPricingConfig,
  selectPricingConfigLoading,
  type PricingConfig
} from "@/lib/features/agencyServices/agencyPricingConfigSlice"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import {
  Settings,
  Plus,
  Copy,
  Trash2,
  Edit,
  Save,
  X,
  Check,
  Upload,
  DollarSign,
  Route,
  MapPin,
  Percent,
  Clock,
  Users,
  Package,
  AlertCircle,
  Calculator
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog"
import { DistanceRatesEditor } from "./distance-rates-editor"
import { ServiceAdjustmentsEditor } from "./service-adjustments-editor"
import { FixedRoutesEditor } from "./fixed-routes-editor"
import { DistanceMatrixEditor } from "./distance-matrix-editor"
import { AdditionalChargesEditor } from "./additional-charges-editor"
import { DiscountsEditor } from "./discounts-editor"
import { PriceCalculator } from "./price-calculator"

export function PricingConfigMain() {
  const dispatch = useAppDispatch()
  const { toast } = useToast()

  // Redux state
  const configs = useAppSelector(selectAllPricingConfigs)
  const activeConfig = useAppSelector(selectActivePricingConfig)
  const selectedConfig = useAppSelector(selectSelectedPricingConfig)
  const loading = useAppSelector(selectPricingConfigLoading)

  // Local state
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showCloneDialog, setShowCloneDialog] = useState(false)
  const [showCalculator, setShowCalculator] = useState(false)
  const [configToDelete, setConfigToDelete] = useState<PricingConfig | null>(null)
  const [configToClone, setConfigToClone] = useState<PricingConfig | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [activeTab, setActiveTab] = useState("basic")

  // Form state for new config
  const [newConfigForm, setNewConfigForm] = useState({
    name: "",
    code: "",
    description: "",
    minimumPrice: 35,
    baseFee: 25,
    isDefault: false
  })

  // Clone form state
  const [cloneForm, setCloneForm] = useState({
    name: "",
    code: ""
  })

  // Load configs on mount
  useEffect(() => {
    dispatch(fetchPricingConfigs())
    dispatch(fetchActiveConfig())
  }, [dispatch])

  // Handle create config
  const handleCreateConfig = async () => {
    if (!newConfigForm.name || !newConfigForm.code) {
      toast({
        title: "Error",
        description: "Por favor complete todos los campos requeridos",
        variant: "destructive"
      })
      return
    }

    try {
      await dispatch(createPricingConfig({
        ...newConfigForm,
        distanceRates: [
          { minKm: 0, maxKm: 20, ratePerKm: 4.00 },
          { minKm: 21, maxKm: 50, ratePerKm: 2.50 },
          { minKm: 51, maxKm: 999, ratePerKm: 1.50 }
        ],
        additionalCharges: {
          waitingHourRate: 10,
          extraPassengerRate: 20
        },
        serviceAdjustments: {},
        isActive: true,
        isDefault: newConfigForm.isDefault
      })).unwrap()

      toast({
        title: "Éxito",
        description: "Configuración creada correctamente"
      })

      setShowCreateDialog(false)
      setNewConfigForm({
        name: "",
        code: "",
        description: "",
        minimumPrice: 35,
        baseFee: 25,
        isDefault: false
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo crear la configuración",
        variant: "destructive"
      })
    }
  }

  // Handle update config
  const handleSaveConfig = async () => {
    if (!selectedConfig?._id) return

    try {
      await dispatch(updatePricingConfig({
        id: selectedConfig._id,
        updates: selectedConfig
      })).unwrap()

      toast({
        title: "Éxito",
        description: "Configuración actualizada correctamente"
      })

      setEditMode(false)
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo actualizar la configuración",
        variant: "destructive"
      })
    }
  }

  // Handle delete config
  const handleDeleteConfig = async () => {
    if (!configToDelete?._id) return

    try {
      await dispatch(deletePricingConfig(configToDelete._id)).unwrap()

      toast({
        title: "Éxito",
        description: "Configuración eliminada correctamente"
      })

      setShowDeleteDialog(false)
      setConfigToDelete(null)
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo eliminar la configuración",
        variant: "destructive"
      })
    }
  }

  // Handle clone config
  const handleCloneConfig = async () => {
    if (!configToClone?._id || !cloneForm.name || !cloneForm.code) {
      toast({
        title: "Error",
        description: "Por favor complete todos los campos requeridos",
        variant: "destructive"
      })
      return
    }

    try {
      await dispatch(clonePricingConfig({
        id: configToClone._id,
        name: cloneForm.name,
        code: cloneForm.code
      })).unwrap()

      toast({
        title: "Éxito",
        description: "Configuración clonada correctamente"
      })

      setShowCloneDialog(false)
      setConfigToClone(null)
      setCloneForm({ name: "", code: "" })
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo clonar la configuración",
        variant: "destructive"
      })
    }
  }

  // Handle import seed
  const handleImportSeed = async () => {
    try {
      await dispatch(importSeedConfig()).unwrap()

      toast({
        title: "Éxito",
        description: "Configuración base importada correctamente"
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo importar la configuración base",
        variant: "destructive"
      })
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
              <Settings className="h-6 w-6 text-white" />
            </div>
            Configuración de Precios Agency
          </h2>
          <p className="text-muted-foreground mt-1">
            Gestione las reglas de precios para los servicios de transporte
          </p>
        </div>
        <div className="flex gap-2">
          {configs.length === 0 && (
            <Button
              onClick={handleImportSeed}
              variant="outline"
              disabled={loading}
            >
              <Upload className="h-4 w-4 mr-2" />
              Importar Base
            </Button>
          )}
          <Button
            onClick={() => setShowCalculator(true)}
            variant="outline"
          >
            <Calculator className="h-4 w-4 mr-2" />
            Calculadora
          </Button>
          <Button
            onClick={() => setShowCreateDialog(true)}
            disabled={loading}
          >
            <Plus className="h-4 w-4 mr-2" />
            Nueva Configuración
          </Button>
        </div>
      </div>

      {/* Configurations List */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {configs.map((config) => (
          <Card
            key={config._id}
            className={`cursor-pointer transition-all hover:shadow-lg ${
              selectedConfig?._id === config._id ? 'ring-2 ring-primary' : ''
            }`}
            onClick={() => dispatch(setSelectedConfig(config))}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{config.name}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Código: {config.code}
                  </p>
                </div>
                <div className="flex flex-col gap-1">
                  {config.isDefault && (
                    <Badge variant="default">Por Defecto</Badge>
                  )}
                  {config.isActive ? (
                    <Badge variant="success">Activa</Badge>
                  ) : (
                    <Badge variant="secondary">Inactiva</Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Precio mínimo:</span>
                  <span className="font-medium">${config.minimumPrice}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tarifa base:</span>
                  <span className="font-medium">${config.baseFee}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Rutas fijas:</span>
                  <span className="font-medium">{config.fixedRoutes?.length || 0}</span>
                </div>
              </div>
              <div className="flex gap-1 mt-4">
                <Button
                  size="sm"
                  variant="ghost"
                  className="flex-1"
                  onClick={(e) => {
                    e.stopPropagation()
                    setConfigToClone(config)
                    setCloneForm({
                      name: `${config.name} (Copia)`,
                      code: `${config.code}_COPY`
                    })
                    setShowCloneDialog(true)
                  }}
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="flex-1"
                  onClick={(e) => {
                    e.stopPropagation()
                    dispatch(setSelectedConfig(config))
                    setEditMode(true)
                  }}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="flex-1"
                  disabled={config.isDefault && config.isActive}
                  onClick={(e) => {
                    e.stopPropagation()
                    setConfigToDelete(config)
                    setShowDeleteDialog(true)
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Configuration Details */}
      {selectedConfig && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>
                {editMode ? 'Editando: ' : ''}{selectedConfig.name}
              </CardTitle>
              <div className="flex gap-2">
                {editMode ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditMode(false)}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancelar
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSaveConfig}
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Guardar Cambios
                    </Button>
                  </>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => setEditMode(true)}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Editar
                  </Button>
                )}
              </div>
            </div>
            {selectedConfig.description && (
              <CardDescription>{selectedConfig.description}</CardDescription>
            )}
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-6 w-full">
                <TabsTrigger value="basic">
                  <DollarSign className="h-4 w-4 mr-2" />
                  Básico
                </TabsTrigger>
                <TabsTrigger value="distance">
                  <Route className="h-4 w-4 mr-2" />
                  Distancias
                </TabsTrigger>
                <TabsTrigger value="routes">
                  <MapPin className="h-4 w-4 mr-2" />
                  Rutas
                </TabsTrigger>
                <TabsTrigger value="adjustments">
                  <Percent className="h-4 w-4 mr-2" />
                  Ajustes
                </TabsTrigger>
                <TabsTrigger value="charges">
                  <Package className="h-4 w-4 mr-2" />
                  Cargos
                </TabsTrigger>
                <TabsTrigger value="discounts">
                  <Users className="h-4 w-4 mr-2" />
                  Descuentos
                </TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Precio Mínimo</Label>
                    <Input
                      type="number"
                      value={selectedConfig.minimumPrice}
                      onChange={(e) => {
                        if (editMode) {
                          dispatch(setSelectedConfig({
                            ...selectedConfig,
                            minimumPrice: Number(e.target.value)
                          }))
                        }
                      }}
                      disabled={!editMode}
                    />
                  </div>
                  <div>
                    <Label>Tarifa Base</Label>
                    <Input
                      type="number"
                      value={selectedConfig.baseFee}
                      onChange={(e) => {
                        if (editMode) {
                          dispatch(setSelectedConfig({
                            ...selectedConfig,
                            baseFee: Number(e.target.value)
                          }))
                        }
                      }}
                      disabled={!editMode}
                    />
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="active"
                    checked={selectedConfig.isActive}
                    onCheckedChange={(checked) => {
                      if (editMode) {
                        dispatch(setSelectedConfig({
                          ...selectedConfig,
                          isActive: checked
                        }))
                      }
                    }}
                    disabled={!editMode}
                  />
                  <Label htmlFor="active">Configuración Activa</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="default"
                    checked={selectedConfig.isDefault || false}
                    onCheckedChange={(checked) => {
                      if (editMode) {
                        dispatch(setSelectedConfig({
                          ...selectedConfig,
                          isDefault: checked
                        }))
                      }
                    }}
                    disabled={!editMode}
                  />
                  <Label htmlFor="default">Configuración Por Defecto</Label>
                </div>
              </TabsContent>

              <TabsContent value="distance">
                <DistanceRatesEditor
                  rates={selectedConfig.distanceRates || []}
                  onChange={(rates) => {
                    if (editMode) {
                      dispatch(setSelectedConfig({
                        ...selectedConfig,
                        distanceRates: rates
                      }))
                    }
                  }}
                  disabled={!editMode}
                />
              </TabsContent>

              <TabsContent value="routes">
                <div className="space-y-6">
                  <FixedRoutesEditor
                    routes={selectedConfig.fixedRoutes || []}
                    onChange={(routes) => {
                      if (editMode) {
                        dispatch(setSelectedConfig({
                          ...selectedConfig,
                          fixedRoutes: routes
                        }))
                      }
                    }}
                    disabled={!editMode}
                  />
                  <DistanceMatrixEditor
                    matrix={selectedConfig.distanceMatrix || []}
                    onChange={(matrix) => {
                      if (editMode) {
                        dispatch(setSelectedConfig({
                          ...selectedConfig,
                          distanceMatrix: matrix
                        }))
                      }
                    }}
                    disabled={!editMode}
                  />
                </div>
              </TabsContent>

              <TabsContent value="adjustments">
                <ServiceAdjustmentsEditor
                  adjustments={selectedConfig.serviceAdjustments || {}}
                  onChange={(adjustments) => {
                    if (editMode) {
                      dispatch(setSelectedConfig({
                        ...selectedConfig,
                        serviceAdjustments: adjustments
                      }))
                    }
                  }}
                  disabled={!editMode}
                />
              </TabsContent>

              <TabsContent value="charges">
                <AdditionalChargesEditor
                  charges={selectedConfig.additionalCharges || {
                    waitingHourRate: 10,
                    extraPassengerRate: 20
                  }}
                  onChange={(charges) => {
                    if (editMode) {
                      dispatch(setSelectedConfig({
                        ...selectedConfig,
                        additionalCharges: charges
                      }))
                    }
                  }}
                  disabled={!editMode}
                />
              </TabsContent>

              <TabsContent value="discounts">
                <DiscountsEditor
                  discounts={selectedConfig.discounts || {}}
                  onChange={(discounts) => {
                    if (editMode) {
                      dispatch(setSelectedConfig({
                        ...selectedConfig,
                        discounts
                      }))
                    }
                  }}
                  disabled={!editMode}
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva Configuración de Precios</DialogTitle>
            <DialogDescription>
              Cree una nueva configuración de precios para Agency
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nombre</Label>
              <Input
                value={newConfigForm.name}
                onChange={(e) => setNewConfigForm(prev => ({
                  ...prev,
                  name: e.target.value
                }))}
                placeholder="Ej: Tarifa Estándar 2024"
              />
            </div>
            <div>
              <Label>Código</Label>
              <Input
                value={newConfigForm.code}
                onChange={(e) => setNewConfigForm(prev => ({
                  ...prev,
                  code: e.target.value.toUpperCase()
                }))}
                placeholder="Ej: STD_2024"
              />
            </div>
            <div>
              <Label>Descripción</Label>
              <Textarea
                value={newConfigForm.description}
                onChange={(e) => setNewConfigForm(prev => ({
                  ...prev,
                  description: e.target.value
                }))}
                placeholder="Descripción opcional..."
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Precio Mínimo</Label>
                <Input
                  type="number"
                  value={newConfigForm.minimumPrice}
                  onChange={(e) => setNewConfigForm(prev => ({
                    ...prev,
                    minimumPrice: Number(e.target.value)
                  }))}
                />
              </div>
              <div>
                <Label>Tarifa Base</Label>
                <Input
                  type="number"
                  value={newConfigForm.baseFee}
                  onChange={(e) => setNewConfigForm(prev => ({
                    ...prev,
                    baseFee: Number(e.target.value)
                  }))}
                />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="new-default"
                checked={newConfigForm.isDefault}
                onCheckedChange={(checked) => setNewConfigForm(prev => ({
                  ...prev,
                  isDefault: checked
                }))}
              />
              <Label htmlFor="new-default">
                Establecer como configuración por defecto
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateDialog(false)}
            >
              Cancelar
            </Button>
            <Button onClick={handleCreateConfig}>
              Crear Configuración
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Clone Dialog */}
      <Dialog open={showCloneDialog} onOpenChange={setShowCloneDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clonar Configuración</DialogTitle>
            <DialogDescription>
              Crear una copia de: {configToClone?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nombre de la nueva configuración</Label>
              <Input
                value={cloneForm.name}
                onChange={(e) => setCloneForm(prev => ({
                  ...prev,
                  name: e.target.value
                }))}
                placeholder="Nombre para la copia"
              />
            </div>
            <div>
              <Label>Código</Label>
              <Input
                value={cloneForm.code}
                onChange={(e) => setCloneForm(prev => ({
                  ...prev,
                  code: e.target.value.toUpperCase()
                }))}
                placeholder="Código único"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCloneDialog(false)
                setConfigToClone(null)
                setCloneForm({ name: "", code: "" })
              }}
            >
              Cancelar
            </Button>
            <Button onClick={handleCloneConfig}>
              Clonar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar configuración?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente la configuración:
              <br />
              <strong>{configToDelete?.name}</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfigToDelete(null)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfig}
              className="bg-red-600 hover:bg-red-700"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Price Calculator */}
      {showCalculator && (
        <PriceCalculator
          open={showCalculator}
          onClose={() => setShowCalculator(false)}
          configId={selectedConfig?._id}
        />
      )}
    </div>
  )
}