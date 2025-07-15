"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Settings2, Plus, Edit, Trash2, Ship, Anchor } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useAppSelector, useAppDispatch } from "@/lib/hooks"
import { 
  selectAllNavieras, 
  selectNavieraLoading,
  selectNavieraError,
  fetchNavieras,
  createNavieraAsync,
  updateNavieraAsync,
  deleteNavieraAsync,
  clearError,
  type Naviera
} from "@/lib/features/naviera/navieraSlice"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'

export function PTYSSConfig() {
  const dispatch = useAppDispatch()
  const { toast } = useToast()
  
  const navieras = useAppSelector(selectAllNavieras)
  const loading = useAppSelector(selectNavieraLoading)
  const error = useAppSelector(selectNavieraError)
  
  const [showAddNavieraForm, setShowAddNavieraForm] = useState(false)
  const [navieraToDelete, setNavieraToDelete] = useState<Naviera | null>(null)

  // Cargar navieras al montar el componente
  useEffect(() => {
    dispatch(fetchNavieras())
  }, [dispatch])

  // Limpiar errores cuando cambie el tab
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



  const [newNaviera, setNewNaviera] = useState({
    name: "",
    code: ""
  })



  const handleAddNaviera = async () => {
    if (!newNaviera.name || !newNaviera.code) {
      toast({
        title: "Error",
        description: "Completa todos los campos obligatorios",
        variant: "destructive"
      })
      return
    }

    try {
      await dispatch(createNavieraAsync({
        name: newNaviera.name,
        code: newNaviera.code
      })).unwrap()
      
      setNewNaviera({
        name: "",
        code: ""
      })
      setShowAddNavieraForm(false)

      toast({
        title: "Naviera agregada",
        description: "La nueva naviera ha sido configurada correctamente",
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Error al crear la naviera",
        variant: "destructive"
      })
    }
  }

  const handleDeleteNaviera = async (navieraId: string) => {
    try {
      await dispatch(deleteNavieraAsync(navieraId)).unwrap()
      toast({
        title: "Naviera eliminada",
        description: "La naviera ha sido eliminada del sistema",
      })
      setNavieraToDelete(null)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Error al eliminar la naviera",
        variant: "destructive"
      })
    }
  }

  const handleToggleNavieraStatus = async (naviera: Naviera) => {
    try {
      await dispatch(updateNavieraAsync({
        id: naviera._id,
        navieraData: { isActive: !naviera.isActive }
      })).unwrap()
      
      toast({
        title: "Estado actualizado",
        description: `La naviera ${naviera.name} ha sido ${!naviera.isActive ? 'activada' : 'desactivada'}`,
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Error al actualizar el estado de la naviera",
        variant: "destructive"
      })
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            Configuración PTYSS
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-2">
            <Button
              variant="default"
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Ship className="h-4 w-4 mr-2" />
              Navieras
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Gestión de Navieras</CardTitle>
            <Button onClick={() => setShowAddNavieraForm(!showAddNavieraForm)}>
              <Plus className="h-4 w-4 mr-2" />
              Agregar Naviera
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {showAddNavieraForm && (
            <Card className="border-dashed">
              <CardHeader>
                <CardTitle className="text-lg">Nueva Naviera</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="naviera-name">Nombre de la Naviera *</Label>
                    <Input
                      id="naviera-name"
                      value={newNaviera.name}
                      onChange={(e) => setNewNaviera({...newNaviera, name: e.target.value})}
                      placeholder="MSC Mediterranean Shipping Company"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="naviera-code">Código *</Label>
                    <Input
                      id="naviera-code"
                      value={newNaviera.code}
                      onChange={(e) => setNewNaviera({...newNaviera, code: e.target.value})}
                      placeholder="MSC"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleAddNaviera} disabled={loading}>
                    <Plus className="h-4 w-4 mr-2" />
                    {loading ? "Agregando..." : "Agregar Naviera"}
                  </Button>
                  <Button variant="outline" onClick={() => setShowAddNavieraForm(false)}>
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
                  <TableHead>Código</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && navieras.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8">
                      <div className="flex items-center justify-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                        <span>Cargando navieras...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : navieras.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      No hay navieras registradas
                    </TableCell>
                  </TableRow>
                ) : (
                  navieras.map((naviera) => (
                    <TableRow key={naviera._id}>
                      <TableCell className="font-medium">{naviera.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{naviera.code}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={naviera.isActive ? "default" : "secondary"}>
                          {naviera.isActive ? "Activa" : "Inactiva"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleToggleNavieraStatus(naviera)}
                            disabled={loading}
                          >
                            {naviera.isActive ? "Desactivar" : "Activar"}
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => setNavieraToDelete(naviera)}
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

      {/* Modal de confirmación para eliminar naviera */}
      <Dialog open={!!navieraToDelete} onOpenChange={() => setNavieraToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar eliminación</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>¿Estás seguro de que quieres eliminar la naviera?</p>
            {navieraToDelete && (
              <p className="font-medium mt-2">
                {navieraToDelete.name} ({navieraToDelete.code})
              </p>
            )}
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setNavieraToDelete(null)}>
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => {
                if (navieraToDelete) {
                  handleDeleteNaviera(navieraToDelete._id)
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