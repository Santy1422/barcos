"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { FileText, Search, Download, RefreshCw, Eye } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useAppSelector, useAppDispatch } from "@/lib/hooks"
import { 
  fetchRecordsByModule, 
  selectAllIndividualRecords, 
  selectRecordsLoading,
  type ExcelRecord
} from "@/lib/features/records/recordsSlice"
import { 
  fetchClients, 
  selectAllClients 
} from "@/lib/features/clients/clientsSlice"
import { 
  fetchNavieras, 
  selectAllNavieras 
} from "@/lib/features/naviera/navieraSlice"
import * as XLSX from 'xlsx'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Label } from '@/components/ui/label'

interface Client {
  _id: string
  companyName?: string
  fullName?: string
  sapCode: string
  address: string
}

export function HistoryPage() {
  const dispatch = useAppDispatch()
  const { toast } = useToast()
  
  // Obtener datos del Redux store
  const records = useAppSelector(selectAllIndividualRecords)
  const loading = useAppSelector(selectRecordsLoading)
  const clients = useAppSelector(selectAllClients)
  const navieras = useAppSelector(selectAllNavieras)
  
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("todos")
  const [moduleFilter, setModuleFilter] = useState("todos")
  const [typeFilter, setTypeFilter] = useState("todos")
  const [dateFilter, setDateFilter] = useState("todos")
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [selectedRecord, setSelectedRecord] = useState<ExcelRecord | null>(null)
  const [showRecordModal, setShowRecordModal] = useState(false)

  // Cargar registros, clientes y navieras
  useEffect(() => {
    dispatch(fetchRecordsByModule("ptyss"))
    dispatch(fetchRecordsByModule("trucking"))
    dispatch(fetchClients())
    dispatch(fetchNavieras())
  }, [dispatch])

  // Funciones helper para obtener información del registro
  const getRecordClient = (record: ExcelRecord) => {
    if (record.data?.associate) return record.data.associate
    const client = clients.find(c => c._id === record.data?.clientId)
    return client ? (client.companyName || client.fullName || 'Cliente no encontrado') : 'Cliente no encontrado'
  }

  const getRecordNaviera = (record: ExcelRecord) => {
    const navieraId = record.data?.naviera
    if (!navieraId) return 'N/A'
    
    // Si navieraId ya es un string legible (no un ObjectId), devolverlo directamente
    if (navieraId.length < 20) return navieraId
    
    // Buscar la naviera por ID
    const naviera = navieras.find(n => n._id === navieraId)
    return naviera ? naviera.name : navieraId
  }

  const getRecordReference = (record: ExcelRecord) => {
    return record.data?.order || record.data?.container || record.id || 'N/A'
  }

  // Función para determinar el tipo de registro
  const getRecordType = (record: ExcelRecord): "local" | "trasiego" => {
    const data = record.data as Record<string, any>
    
    // Si el registro tiene el campo recordType, usarlo directamente
    if (data.recordType) {
      return data.recordType
    }
    
    // Los registros de trasiego tienen campos específicos del Excel de trucking
    // como containerConsecutive, leg, moveType, etc.
    if (data.containerConsecutive || data.leg || data.moveType || data.associate) {
      return "trasiego"
    }
    
    // Los registros locales tienen campos específicos de PTYSS
    // como clientId, order, naviera, etc.
    if (data.clientId || data.order || data.naviera) {
      return "local"
    }
    
    // Por defecto, si no podemos determinar, asumimos que es local
    return "local"
  }

  const filteredRecords = records.filter((record) => {
    // Filtro por término de búsqueda
    const matchesSearch =
      searchTerm === "" ||
      getRecordReference(record).toLowerCase().includes(searchTerm.toLowerCase()) ||
      getRecordClient(record).toLowerCase().includes(searchTerm.toLowerCase()) ||
      (getRecordNaviera(record).toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (record.data?.container?.toLowerCase() || '').includes(searchTerm.toLowerCase())

    // Filtro por estado
    const matchesStatus = statusFilter === "todos" || record.status === statusFilter

    // Filtro por módulo
    const matchesModule = moduleFilter === "todos" || record.module === moduleFilter

    // Filtro por tipo de registro
    const matchesType = typeFilter === "todos" || getRecordType(record) === typeFilter

    // Filtro por fecha
    let matchesDate = true
    if (dateFilter === 'custom' && startDate && endDate) {
      const recordDate = new Date(record.createdAt)
      const start = new Date(startDate)
      const end = new Date(endDate)
      matchesDate = recordDate >= start && recordDate <= end
    } else if (dateFilter === 'today') {
      const today = new Date()
      const recordDate = new Date(record.createdAt)
      matchesDate = recordDate.toDateString() === today.toDateString()
    } else if (dateFilter === 'week') {
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      const recordDate = new Date(record.createdAt)
      matchesDate = recordDate >= weekAgo
    } else if (dateFilter === 'month') {
      const monthAgo = new Date()
      monthAgo.setMonth(monthAgo.getMonth() - 1)
      const recordDate = new Date(record.createdAt)
      matchesDate = recordDate >= monthAgo
    }

    return matchesSearch && matchesStatus && matchesModule && matchesType && matchesDate
  })

  // Exportar a Excel
  const exportToExcel = () => {
    const exportData = filteredRecords.map(record => ({
      'Referencia/Orden': getRecordReference(record),
      'Módulo': record.module === 'trucking' ? 'PTG' : record.module.toUpperCase(),
      'Tipo Registro': getRecordType(record) === 'local' ? 'Local' : 'Trasiego',
      'Cliente': getRecordClient(record),
      'Naviera': getRecordNaviera(record),
      'Contenedor': record.data?.container || 'N/A',
      'Desde': record.data?.from || 'N/A',
      'Hasta': record.data?.to || 'N/A',
      'Tipo de Operación': record.data?.operationType || 'N/A',
      'Tamaño Contenedor': record.data?.containerSize || 'N/A',
      'Tipo Contenedor': record.data?.containerType || 'N/A',
      'Estadía': record.data?.estadia || 'N/A',
      'Genset': record.data?.genset || 'N/A',
      'Retención': record.data?.retencion || 'N/A',
      'Pesaje': record.data?.pesaje || 'N/A',
      'TI': record.data?.ti || 'N/A',
      'Matrícula Camión': record.data?.matriculaCamion || 'N/A',
      'Conductor': record.data?.conductor || 'N/A',
      'Número Chasis/Placa': record.data?.numeroChasisPlaca || 'N/A',
      'Fecha Movimiento': record.data?.moveDate || 'N/A',
      'Notas': record.data?.notes || 'N/A',
      'Valor Total': record.totalValue || 0,
      'Estado': record.status === 'pendiente' ? 'Pendiente' : 
                record.status === 'completado' ? 'Completado' : 
                record.status === 'prefacturado' ? 'Prefacturado' :
                record.status === 'facturado' ? 'Facturado' : 'Anulado',
      'Fecha Creación': record.createdAt ? new Date(record.createdAt).toLocaleDateString('es-ES') : 'N/A',
      'Cliente Local': record.data?.localClientName || '',
      'Precio Ruta Local': record.data?.localRoutePrice || '',
      // Campos adicionales para trucking
      'Consecutivo Contenedor': record.data?.containerConsecutive || 'N/A',
      'Tramo': record.data?.leg || 'N/A',
      'Tipo Movimiento': record.data?.moveType || 'N/A',
      'Asociado': record.data?.associate || 'N/A'
    }))

    const ws = XLSX.utils.json_to_sheet(exportData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Historial de Registros')
    
    const fileName = `historial_registros_${new Date().toISOString().split('T')[0]}.xlsx`
    XLSX.writeFile(wb, fileName)

    toast({
      title: "Exportación exitosa",
      description: `Se exportaron ${exportData.length} registros a ${fileName}`,
    })
  }

  // Ver detalles del registro
  const viewRecordDetails = (record: ExcelRecord) => {
    setSelectedRecord(record)
    setShowRecordModal(true)
  }

  // Estadísticas
  const stats = {
    total: records.length,
    ptyss: records.filter(r => r.module === 'ptyss').length,
    trucking: records.filter(r => r.module === 'trucking').length,
    locales: records.filter(r => getRecordType(r) === 'local').length,
    trasiego: records.filter(r => getRecordType(r) === 'trasiego').length,
    pendientes: records.filter(r => r.status === 'pendiente').length,
    completados: records.filter(r => r.status === 'completado').length,
    prefacturados: records.filter(r => r.status === 'prefacturado').length,
    facturados: records.filter(r => r.status === 'facturado').length
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Historial General</h1>
      </div>

      {/* Estadísticas */}
      <Card>
        <CardHeader>
          <CardTitle>Resumen de Registros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-gray-600" />
              <span className="text-sm font-medium">
                Total de registros: <strong>{stats.total}</strong>
              </span>
            </div>
            <div className="flex gap-4 flex-wrap">
              <Badge variant="outline">PTYSS: <strong>{stats.ptyss}</strong></Badge>
              <Badge variant="outline">PTG: <strong>{stats.trucking}</strong></Badge>
              <Badge variant="outline">Locales: <strong>{stats.locales}</strong></Badge>
              <Badge variant="outline">Trasiego: <strong>{stats.trasiego}</strong></Badge>
              <Badge variant="outline">Pendientes: <strong>{stats.pendientes}</strong></Badge>
              <Badge variant="outline">Completados: <strong>{stats.completados}</strong></Badge>
              <Badge variant="outline">Prefacturados: <strong>{stats.prefacturados}</strong></Badge>
              <Badge variant="outline">Facturados: <strong>{stats.facturados}</strong></Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Filtros principales */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Buscar</label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Referencia, cliente, naviera..."
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Estado</label>
                <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="pendiente">Pendiente</SelectItem>
                    <SelectItem value="completado">Completado</SelectItem>
                    <SelectItem value="prefacturado">Prefacturado</SelectItem>
                    <SelectItem value="facturado">Facturado</SelectItem>
                    <SelectItem value="anulado">Anulado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Módulo</label>
                <Select value={moduleFilter} onValueChange={(value) => setModuleFilter(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar módulo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="ptyss">PTYSS</SelectItem>
                    <SelectItem value="trucking">PTG</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Tipo</label>
                <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="local">Local</SelectItem>
                    <SelectItem value="trasiego">Trasiego</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Fecha</label>
                <Select value={dateFilter} onValueChange={(value) => setDateFilter(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar período" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="today">Hoy</SelectItem>
                    <SelectItem value="week">Esta semana</SelectItem>
                    <SelectItem value="month">Este mes</SelectItem>
                    <SelectItem value="custom">Personalizado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Botones de acción */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="text-sm text-gray-600">
                Mostrando {filteredRecords.length} de {records.length} registros
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    dispatch(fetchRecordsByModule("ptyss"))
                    dispatch(fetchRecordsByModule("trucking"))
                    dispatch(fetchClients())
                    dispatch(fetchNavieras())
                  }}
                  disabled={loading}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Actualizar
                </Button>
                <Button 
                  size="sm"
                  onClick={exportToExcel} 
                  disabled={filteredRecords.length === 0}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Exportar
                </Button>
              </div>
            </div>
          </div>

          {dateFilter === 'custom' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Fecha inicio</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">Fecha fin</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Resultados ({filteredRecords.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center p-8">
              <RefreshCw className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Referencia</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Módulo</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium">{getRecordReference(record)}</TableCell>
                    <TableCell>{new Date(record.createdAt).toLocaleDateString('es-ES')}</TableCell>
                    <TableCell>
                      <Badge variant={record.module === 'ptyss' ? 'default' : 'secondary'}>
                        {record.module === 'trucking' ? 'PTG' : record.module.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getRecordType(record) === 'local' ? 'default' : 'outline'}>
                        {getRecordType(record) === 'local' ? 'Local' : 'Trasiego'}
                      </Badge>
                    </TableCell>
                    <TableCell>{getRecordClient(record)}</TableCell>
                    <TableCell>
                      ${record.totalValue.toFixed(2)} USD
                    </TableCell>
                    <TableCell>
                                              <Badge
                          variant={
                            record.status === "completado"
                              ? "default"
                              : record.status === "prefacturado"
                                ? "outline"
                                : record.status === "facturado"
                                  ? "default"
                                  : record.status === "anulado"
                                    ? "destructive"
                                    : "secondary"
                          }
                        >
                          {record.status === "pendiente" && "Pendiente"}
                          {record.status === "completado" && "Completado"}
                          {record.status === "prefacturado" && "Prefacturado"}
                          {record.status === "facturado" && "Facturado"}
                          {record.status === "anulado" && "Anulado"}
                        </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => viewRecordDetails(record)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Modal de detalles del registro */}
      <Dialog open={showRecordModal} onOpenChange={setShowRecordModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalles del Registro</DialogTitle>
            <DialogDescription>
              Información completa del registro seleccionado
            </DialogDescription>
          </DialogHeader>
          
          {selectedRecord && (
            <div className="space-y-6">
              <Tabs defaultValue="general" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="general">General</TabsTrigger>
                  <TabsTrigger value="detalles">Detalles</TabsTrigger>
                  <TabsTrigger value="datos">Datos Raw</TabsTrigger>
                </TabsList>
                
                <TabsContent value="general" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium">ID</Label>
                      <p className="text-sm text-gray-600">{selectedRecord.id}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Módulo</Label>
                      <Badge variant={selectedRecord.module === 'ptyss' ? 'default' : 'secondary'}>
                        {selectedRecord.module === 'trucking' ? 'PTG' : selectedRecord.module.toUpperCase()}
                      </Badge>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Tipo</Label>
                      <Badge variant={getRecordType(selectedRecord) === 'local' ? 'default' : 'outline'}>
                        {getRecordType(selectedRecord) === 'local' ? 'Local' : 'Trasiego'}
                      </Badge>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Referencia</Label>
                      <p className="text-sm text-gray-600">{getRecordReference(selectedRecord)}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Cliente</Label>
                      <p className="text-sm text-gray-600">{getRecordClient(selectedRecord)}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Valor Total</Label>
                      <p className="text-sm font-bold text-green-600">${selectedRecord.totalValue.toFixed(2)}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Estado</Label>
                      <Badge 
                        variant={
                          selectedRecord.status === 'pendiente' ? 'destructive' :
                          selectedRecord.status === 'completado' ? 'default' : 'outline'
                        }
                      >
                        {selectedRecord.status}
                      </Badge>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Fecha de Creación</Label>
                      <p className="text-sm text-gray-600">{new Date(selectedRecord.createdAt).toLocaleString('es-ES')}</p>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="detalles" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    {selectedRecord.data?.container && (
                      <div>
                        <Label className="text-sm font-medium">Contenedor</Label>
                        <p className="text-sm text-gray-600">{selectedRecord.data.container}</p>
                      </div>
                    )}
                    <div>
                      <Label className="text-sm font-medium">Naviera</Label>
                      <p className="text-sm text-gray-600">{getRecordNaviera(selectedRecord)}</p>
                    </div>
                    {selectedRecord.data?.from && (
                      <div>
                        <Label className="text-sm font-medium">Desde</Label>
                        <p className="text-sm text-gray-600">{selectedRecord.data.from}</p>
                      </div>
                    )}
                    {selectedRecord.data?.to && (
                      <div>
                        <Label className="text-sm font-medium">Hasta</Label>
                        <p className="text-sm text-gray-600">{selectedRecord.data.to}</p>
                      </div>
                    )}
                    {selectedRecord.data?.operationType && (
                      <div>
                        <Label className="text-sm font-medium">Tipo de Operación</Label>
                        <p className="text-sm text-gray-600">{selectedRecord.data.operationType}</p>
                      </div>
                    )}
                    {selectedRecord.data?.moveDate && (
                      <div>
                        <Label className="text-sm font-medium">Fecha Inicial</Label>
                        <p className="text-sm text-gray-600">{selectedRecord.data.moveDate}</p>
                      </div>
                    )}
                    {selectedRecord.data?.endDate && (
                      <div>
                        <Label className="text-sm font-medium">Fecha Fin</Label>
                        <p className="text-sm text-gray-600">{selectedRecord.data.endDate}</p>
                      </div>
                    )}
                  </div>
                </TabsContent>
                
                <TabsContent value="datos" className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium">Datos Raw (JSON)</Label>
                    <pre className="text-xs bg-gray-100 p-4 rounded overflow-auto max-h-96">
                      {JSON.stringify(selectedRecord.data, null, 2)}
                    </pre>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
