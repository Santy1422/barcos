"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Plus, Edit, Trash2, Settings2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useAppSelector, useAppDispatch } from "@/lib/hooks"
import { 
  selectAllLocalServices, 
  selectLocalServicesLoading,
  selectLocalServicesError,
  fetchLocalServices,
  createLocalServiceAsync,
  updateLocalServiceAsync,
  deleteLocalServiceAsync,
  clearError,
  type LocalService
} from "@/lib/features/localServices/localServicesSlice"

interface LocalServicesManagementProps {
  module: "ptyss" | "trucking"
  title: string
}

export function LocalServicesManagement({ module, title }: LocalServicesManagementProps) {
  const dispatch = useAppDispatch()
  const { toast } = useToast()
  
  const services = useAppSelector(selectAllLocalServices) || []
  const loading = useAppSelector(selectLocalServicesLoading)
  const error = useAppSelector(selectLocalServicesError)
  
  const [showAddServiceForm, setShowAddServiceForm] = useState(false)
  const [serviceToDelete, setServiceToDelete] = useState<LocalService | null>(null)
  const [serviceToEdit, setServiceToEdit] = useState<LocalService | null>(null)
  const [newService, setNewService] = useState({
    name: "",
    description: "",
    price: 0
  })
  const [editingService, setEditingService] = useState({
    name: "",
    description: "",
    price: 0
  })

  // Cargar servicios al montar el componente
  useEffect(() => {
    dispatch(fetchLocalServices(module))
  }, [dispatch, module])

  // Limpiar errores cuando cambie
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

  const handleAddService = async () => {
    if (!newService.name || !newService.description || newService.price < 0) {
      toast({
        title: "Error",
        description: "Completa todos los campos obligatorios. El precio debe ser mayor o igual a 0.",
        variant: "destructive"
      })
      return
    }

    try {
      await dispatch(createLocalServiceAsync({
        name: newService.name,
        description: newService.description,
        price: newService.price,
        module
      })).unwrap()
      
      setNewService({
        name: "",
        description: "",
        price: 0
      })
      setShowAddServiceForm(false)

      toast({
        title: "Servicio agregado",
        description: "El nuevo servicio local ha sido configurado correctamente",
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Error al crear el servicio",
        variant: "destructive"
      })
    }
  }

  const handleDeleteService = async (serviceId: string) => {
    try {
      await dispatch(deleteLocalServiceAsync(serviceId)).unwrap()
      toast({
        title: "Servicio eliminado",
        description: "El servicio ha sido eliminado del sistema",
      })
      setServiceToDelete(null)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Error al eliminar el servicio",
        variant: "destructive"
      })
    }
  }

  const handleToggleServiceStatus = async (service: LocalService) => {
    try {
      await dispatch(updateLocalServiceAsync({
        id: service._id,
        serviceData: { isActive: !service.isActive }
      })).unwrap()
      
      toast({
        title: "Estado actualizado",
        description: `El servicio ${service.name} ha sido ${!service.isActive ? 'activado' : 'desactivado'}`,
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Error al actualizar el estado del servicio",
        variant: "destructive"
      })
    }
  }

  const handleEditService = (service: LocalService) => {
    setServiceToEdit(service)
    setEditingService({
      name: service.name,
      description: service.description,
      price: service.price
    })
  }

  const handleSaveEdit = async () => {
    if (!serviceToEdit || !editingService.name || !editingService.description || editingService.price < 0) {
      toast({
        title: "Error",
        description: "Completa todos los campos obligatorios. El precio debe ser mayor o igual a 0.",
        variant: "destructive"
      })
      return
    }

    try {
      await dispatch(updateLocalServiceAsync({
        id: serviceToEdit._id,
        serviceData: {
          name: editingService.name,
          description: editingService.description,
          price: editingService.price
        }
      })).unwrap()
      
      setServiceToEdit(null)
      setEditingService({ name: "", description: "", price: 0 })

      toast({
        title: "Servicio actualizado",
        description: "El servicio ha sido actualizado correctamente",
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Error al actualizar el servicio",
        variant: "destructive"
      })
    }
  }

  const handleCancelEdit = () => {
    setServiceToEdit(null)
    setEditingService({ name: "", description: "", price: 0 })
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5" />
              {title}
            </CardTitle>
            {!showAddServiceForm && (
              <Button onClick={() => setShowAddServiceForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Agregar Servicio Local
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {showAddServiceForm && (
            <Card className="border-dashed">
              <CardHeader>
                <CardTitle className="text-lg">Nuevo Servicio Local</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="service-name">Nombre del Servicio *</Label>
                    <Input
                      id="service-name"
                      value={newService.name}
                      onChange={(e) => setNewService({...newService, name: e.target.value})}
                      placeholder="TRK006"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="service-description">Descripción *</Label>
                    <Input
                      id="service-description"
                      value={newService.description}
                      onChange={(e) => setNewService({...newService, description: e.target.value})}
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
                        value={newService.price === 0 ? "" : newService.price}
                        onChange={(e) => {
                          const value = e.target.value;
                          setNewService({
                            ...newService, 
                            price: value === "" ? 0 : parseFloat(value) || 0
                          });
                        }}
                        placeholder="0.00"
                      />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleAddService} disabled={loading}>
                    <Plus className="h-4 w-4 mr-2" />
                    {loading ? "Agregando..." : "Agregar Servicio"}
                  </Button>
                  <Button variant="outline" onClick={() => setShowAddServiceForm(false)}>
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
                  <TableHead>Descripción</TableHead>
                  <TableHead>Precio</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && (!Array.isArray(services) || services.length === 0) ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      <div className="flex items-center justify-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                        <span>Cargando servicios...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : !Array.isArray(services) || services.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No hay servicios locales registrados
                    </TableCell>
                  </TableRow>
                ) : (
                  services.map((service) => (
                    <TableRow key={service._id}>
                      <TableCell className="font-medium">
                        {serviceToEdit?._id === service._id ? (
                          <Input
                            value={editingService.name}
                            onChange={(e) => setEditingService({...editingService, name: e.target.value})}
                            className="w-full"
                          />
                        ) : (
                          service.name
                        )}
                      </TableCell>
                      <TableCell>
                        {serviceToEdit?._id === service._id ? (
                          <Input
                            value={editingService.description}
                            onChange={(e) => setEditingService({...editingService, description: e.target.value})}
                            className="w-full"
                          />
                        ) : (
                          service.description
                        )}
                      </TableCell>
                      <TableCell>
                        {serviceToEdit?._id === service._id ? (
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={editingService.price === 0 ? "" : editingService.price}
                            onChange={(e) => {
                              const value = e.target.value;
                              setEditingService({
                                ...editingService, 
                                price: value === "" ? 0 : parseFloat(value) || 0
                              });
                            }}
                            className="w-full"
                          />
                        ) : (
                          `$${service.price.toFixed(2)}`
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={service.isActive ? "default" : "secondary"}>
                          {service.isActive ? "Activo" : "Inactivo"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {serviceToEdit?._id === service._id ? (
                            <>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={handleSaveEdit}
                                disabled={loading}
                              >
                                Guardar
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={handleCancelEdit}
                                disabled={loading}
                              >
                                Cancelar
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleEditService(service)}
                                disabled={loading}
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleToggleServiceStatus(service)}
                                disabled={loading}
                              >
                                {service.isActive ? "Desactivar" : "Activar"}
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => setServiceToDelete(service)}
                                disabled={loading}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </>
                          )}
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

      {/* Modal de confirmación para eliminar servicio */}
      <Dialog open={!!serviceToDelete} onOpenChange={() => setServiceToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar eliminación</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>¿Estás seguro de que quieres eliminar el servicio local?</p>
            {serviceToDelete && (
              <p className="font-medium mt-2">
                {serviceToDelete.name} - {serviceToDelete.description}
              </p>
            )}
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setServiceToDelete(null)}>
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => {
                if (serviceToDelete) {
                  handleDeleteService(serviceToDelete._id)
                }
              }}
              disabled={loading}
            >
              Eliminar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
} 