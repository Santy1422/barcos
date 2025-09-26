"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Settings, Ship, Route, MapPin, Package, Wrench } from "lucide-react"
import { useAppDispatch, useAppSelector } from "@/lib/hooks"
import { useToast } from "@/hooks/use-toast"
import { ConfigNavieras } from "./ConfigNavieras"
import { ConfigTab, NavieraFormData } from "./types"

// Redux imports
import { 
  fetchNavieras, 
  addNaviera, 
  updateNaviera, 
  deleteNaviera,
  selectAllNavieras,
  selectNavierasLoading,
  selectNavierasError,
  clearError
} from "@/lib/features/naviera/navieraSlice"

export function ConfigMain() {
  const dispatch = useAppDispatch()
  const { toast } = useToast()
  
  // Redux state
  const navieras = useAppSelector(selectAllNavieras)
  const navierasLoading = useAppSelector(selectNavierasLoading)
  const error = useAppSelector(selectNavierasError)
  
  // Local state
  const [activeTab, setActiveTab] = useState<ConfigTab['id']>('navieras')
  
  // Load initial data
  useEffect(() => {
    dispatch(fetchNavieras())
  }, [dispatch])
  
  // Handle errors
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

  // Tab configuration
  const tabs: ConfigTab[] = [
    { id: 'navieras', label: 'Navieras', icon: <Ship className="h-4 w-4" /> },
    { id: 'routes', label: 'Rutas', icon: <Route className="h-4 w-4" /> },
    { id: 'localRoutes', label: 'Rutas Locales', icon: <MapPin className="h-4 w-4" /> },
    { id: 'services', label: 'Servicios Adicionales', icon: <Package className="h-4 w-4" /> },
    { id: 'localServices', label: 'Servicios Locales', icon: <Wrench className="h-4 w-4" /> }
  ]

  // Handlers for Navieras
  const handleAddNaviera = async (data: NavieraFormData) => {
    try {
      await dispatch(addNaviera(data)).unwrap()
      toast({
        title: "Naviera agregada",
        description: "La naviera se ha agregado correctamente"
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo agregar la naviera",
        variant: "destructive"
      })
    }
  }

  const handleUpdateNaviera = async (id: string, data: Partial<NavieraFormData>) => {
    try {
      await dispatch(updateNaviera({ id, updates: data })).unwrap()
      toast({
        title: "Naviera actualizada",
        description: "La naviera se ha actualizado correctamente"
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo actualizar la naviera",
        variant: "destructive"
      })
    }
  }

  const handleDeleteNaviera = async (id: string) => {
    if (!confirm("¿Está seguro de eliminar esta naviera?")) return
    
    try {
      await dispatch(deleteNaviera(id)).unwrap()
      toast({
        title: "Naviera eliminada",
        description: "La naviera se ha eliminado correctamente"
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo eliminar la naviera",
        variant: "destructive"
      })
    }
  }

  if (navierasLoading && navieras.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Cargando configuración...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-6 w-6" />
            Configuración del Módulo Agency
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Tab Navigation */}
          <div className="flex gap-2 mb-6 border-b">
            {tabs.map((tab) => (
              <Button
                key={tab.id}
                variant={activeTab === tab.id ? "default" : "ghost"}
                className={activeTab === tab.id ? "bg-blue-600 hover:bg-blue-700 rounded-b-none" : "rounded-b-none"}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.icon}
                <span className="ml-2">{tab.label}</span>
              </Button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="mt-6">
            {activeTab === 'navieras' && (
              <ConfigNavieras
                navieras={navieras}
                onAdd={handleAddNaviera}
                onUpdate={handleUpdateNaviera}
                onDelete={handleDeleteNaviera}
              />
            )}
            
            {activeTab === 'routes' && (
              <div className="text-center py-20 text-muted-foreground">
                <Route className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p>Configuración de Rutas - Próximamente</p>
                <p className="text-sm mt-2">Este componente será implementado en ConfigRoutes.tsx</p>
              </div>
            )}
            
            {activeTab === 'localRoutes' && (
              <div className="text-center py-20 text-muted-foreground">
                <MapPin className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p>Configuración de Rutas Locales - Próximamente</p>
                <p className="text-sm mt-2">Este componente será implementado en ConfigLocalRoutes.tsx</p>
              </div>
            )}
            
            {activeTab === 'services' && (
              <div className="text-center py-20 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p>Servicios Adicionales - Próximamente</p>
                <p className="text-sm mt-2">Este componente será implementado en ConfigServices.tsx</p>
              </div>
            )}
            
            {activeTab === 'localServices' && (
              <div className="text-center py-20 text-muted-foreground">
                <Wrench className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p>Servicios Locales - Próximamente</p>
                <p className="text-sm mt-2">Este componente será implementado en ConfigLocalServices.tsx</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}