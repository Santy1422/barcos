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
  selectAllServices, 
  selectServicesLoading,
  selectServicesError,
  fetchServices,
  createServiceAsync,
  updateServiceAsync,
  deleteServiceAsync,
  clearError,
  type Service
} from "@/lib/features/services/servicesSlice"

interface ServicesManagementProps {
  module: "ptyss" | "trucking"
  title: string
}

export function ServicesManagement({ module, title }: ServicesManagementProps) {
  const dispatch = useAppDispatch()
  const { toast } = useToast()
  
  const services = useAppSelector(selectAllServices)
  const loading = useAppSelector(selectServicesLoading)
  const error = useAppSelector(selectServicesError)
  
  const [showAddServiceForm, setShowAddServiceForm] = useState(false)
  const [serviceToDelete, setServiceToDelete] = useState<Service | null>(null)
  const [newService, setNewService] = useState({
    name: "",
    description: ""
  })

  // Cargar servicios al montar el componente
  useEffect(() => {
    dispatch(fetchServices(module))
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
    if (!newService.name || !newService.description) {
      toast({
        title: "Error",
        description: "Completa todos los campos obligatorios",
        variant: "destructive"
      })
      return
    }

    try {
      await dispatch(createServiceAsync({
        name: newService.name,
        description: newService.description,
        module
      })).unwrap()
      
      setNewService({
        name: "",
        description: ""
      })
      setShowAddServiceForm(false)

      toast({
        title: "Servicio agregado",
        description: "El nuevo servicio ha sido configurado correctamente",
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
      await dispatch(deleteServiceAsync(serviceId)).unwrap()
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

  const handleToggleServiceStatus = async (service: Service) => {
    try {
      await dispatch(updateServiceAsync({
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

  // Filtrar servicios por módulo
  const moduleServices = services.filter(service => service.module === module)

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5" />
              {title}
            </CardTitle>
            <Button onClick={() => setShowAddServiceForm(!showAddServiceForm)}>
              <Plus className="h-4 w-4 mr-2" />
              Agregar Servicio
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {showAddServiceForm && (
            <Card className="border-dashed">
              <CardHeader>
                <CardTitle className="text-lg">Nuevo Servicio</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="service-name">Nombre del Servicio *</Label>
                    <Input
                      id="service-name"
                      value={newService.name}
                      onChange={(e) => setNewService({...newService, name: e.target.value})}
                      placeholder="TI, GENSET, etc."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="service-description">Descripción del Servicio *</Label>
                    <Input
                      id="service-description"
                      value={newService.description}
                      onChange={(e) => setNewService({...newService, description: e.target.value})}
                      placeholder="Descripción detallada del servicio"
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
                  <TableHead>Estado</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && moduleServices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8">
                      <div className="flex items-center justify-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                        <span>Cargando servicios...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : moduleServices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      No hay servicios registrados para {module.toUpperCase()}
                    </TableCell>
                  </TableRow>
                ) : (
                  moduleServices.map((service) => (
                    <TableRow key={service._id}>
                      <TableCell className="font-medium">
                        <Badge variant="outline">{service.name}</Badge>
                      </TableCell>
                      <TableCell>{service.description}</TableCell>
                      <TableCell>
                        <Badge variant={service.isActive ? "default" : "secondary"}>
                          {service.isActive ? "Activo" : "Inactivo"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
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
            <p>¿Estás seguro de que quieres eliminar el servicio?</p>
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