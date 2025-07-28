'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Download, 
  Search, 
  Filter, 
  Calendar,
  FileText,
  Database,
  RefreshCw,
  Eye
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import * as XLSX from 'xlsx'
import { useAppSelector, useAppDispatch } from '@/lib/hooks'
import { 
  fetchRecordsByModule, 
  selectRecordsByModule, 
  selectRecordsLoading,
  type ExcelRecord as IndividualExcelRecord
} from '@/lib/features/records/recordsSlice'
import { 
  fetchClients, 
  selectAllClients 
} from '@/lib/features/clients/clientsSlice'

interface Client {
  _id: string
  companyName?: string
  fullName?: string
  sapCode: string
  address: string
}

export function PTYSSHistory() {
  const dispatch = useAppDispatch()
  const { toast } = useToast()
  
  // Obtener datos del Redux store
  const records = useAppSelector((state) => selectRecordsByModule(state, "ptyss"))
  const loading = useAppSelector(selectRecordsLoading)
  const clients = useAppSelector(selectAllClients)
  
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [dateFilter, setDateFilter] = useState<string>('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [selectedRecord, setSelectedRecord] = useState<IndividualExcelRecord | null>(null)
  const [showRecordModal, setShowRecordModal] = useState(false)
  const [activeTab, setActiveTab] = useState('all')

  // Cargar registros y clientes
  useEffect(() => {
    dispatch(fetchRecordsByModule("ptyss"))
    dispatch(fetchClients())
  }, [dispatch])

  // Debug: Log registros PTYSS
  console.log('🔍 PTYSSHistory - records:', records)
  console.log('🔍 PTYSSHistory - records.length:', records.length)
  console.log('🔍 PTYSSHistory - loading:', loading)
  console.log('🔍 PTYSSHistory - clients:', clients)



  // Filtrar registros
  const filteredRecords = records.filter(record => {
    const matchesSearch = 
      (record.order?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (record.container?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (record.naviera?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (record.associate?.toLowerCase() || '').includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === 'all' || record.status === statusFilter
    const matchesType = typeFilter === 'all' || getRecordType(record) === typeFilter

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

    return matchesSearch && matchesStatus && matchesType && matchesDate
  })

  // Funciones helper para obtener información del registro
  const getRecordType = (record: IndividualExcelRecord): "local" | "trasiego" => {
    return record.recordType || "trasiego"
  }

  const getRecordClient = (record: IndividualExcelRecord) => {
    if (record.associate) return record.associate
    const client = clients.find(c => c._id === record.clientId)
    return client ? (client.companyName || client.fullName || 'Cliente no encontrado') : 'Cliente no encontrado'
  }

  // Exportar a Excel
  const exportToExcel = () => {
    const exportData = filteredRecords.map(record => ({
      'Orden': record.order || 'N/A',
      'Contenedor': record.container || 'N/A',
      'Cliente': getRecordClient(record),
      'Naviera': record.naviera || 'N/A',
      'Desde': record.from || 'N/A',
      'Hasta': record.to || 'N/A',
      'Tipo de Operación': record.operationType || 'N/A',
      'Tamaño Contenedor': record.containerSize || 'N/A',
      'Tipo Contenedor': record.containerType || 'N/A',
      'Estadía': record.estadia || 'N/A',
      'Genset': record.genset || 'N/A',
      'Retención': record.retencion || 'N/A',
      'Pesaje': record.pesaje || 'N/A',
      'TI': record.ti || 'N/A',
      'Matrícula Camión': record.matriculaCamion || 'N/A',
      'Conductor': record.conductor || 'N/A',
      'Número Chasis/Placa': record.numeroChasisPlaca || 'N/A',
      'Fecha Movimiento': record.moveDate || 'N/A',
      'Notas': record.notes || 'N/A',
      'Valor Total': record.totalValue || 0,
      'Tipo Registro': getRecordType(record) === 'local' ? 'Local' : 'Trasiego',
      'Estado': record.status === 'pendiente' ? 'Pendiente' : 
                record.status === 'completado' ? 'Completado' : 'Prefacturado',
      'Fecha Creación': record.createdAt ? new Date(record.createdAt).toLocaleDateString('es-ES') : 'N/A',
      'Cliente Local': record.localClientName || '',
      'Precio Ruta Local': record.localRoutePrice || ''
    }))

    const ws = XLSX.utils.json_to_sheet(exportData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Registros PTYSS')
    
    const fileName = `registros_ptyss_${new Date().toISOString().split('T')[0]}.xlsx`
    XLSX.writeFile(wb, fileName)

    toast({
      title: "Exportación exitosa",
      description: `Se exportaron ${exportData.length} registros a ${fileName}`,
    })
  }

  // Ver detalles del registro
  const viewRecordDetails = (record: IndividualExcelRecord) => {
    setSelectedRecord(record)
    setShowRecordModal(true)
  }

  // Estadísticas
  const stats = {
    total: records.length,
    locales: records.filter(r => getRecordType(r) === 'local').length,
    trasiego: records.filter(r => getRecordType(r) === 'trasiego').length,
    pendientes: records.filter(r => r.status === 'pendiente').length,
    completados: records.filter(r => r.status === 'completado').length,
    prefacturados: records.filter(r => r.status === 'prefacturado').length
  }

  return (
    <div className="space-y-6">
      {/* Header con estadísticas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Historial de Registros PTYSS
          </CardTitle>
          <CardDescription>
            Visualiza y exporta todos los registros procesados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-gray-600" />
              <span className="text-sm font-medium">
                Total de registros en la base de datos: <strong>{stats.total}</strong>
              </span>
            </div>
            <div className="flex gap-4">
              <Badge variant="outline">Locales: <strong>{stats.locales}</strong></Badge>
              <Badge variant="outline">Trasiego: <strong>{stats.trasiego}</strong></Badge>
              <Badge variant="outline">Pendientes: <strong>{stats.pendientes}</strong></Badge>
              <Badge variant="outline">Completados: <strong>{stats.completados}</strong></Badge>
              <Badge variant="outline">Prefacturados: <strong>{stats.prefacturados}</strong></Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search">Buscar</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="Orden, contenedor, naviera..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Estado</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos los estados" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pendiente">Pendientes</SelectItem>
                  <SelectItem value="completado">Completados</SelectItem>
                  <SelectItem value="prefacturado">Prefacturados</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Tipo</Label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos los tipos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="local">Locales</SelectItem>
                  <SelectItem value="trasiego">Trasiego</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Fecha</Label>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas las fechas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="today">Hoy</SelectItem>
                  <SelectItem value="week">Última semana</SelectItem>
                  <SelectItem value="month">Último mes</SelectItem>
                  <SelectItem value="custom">Personalizado</SelectItem>
                </SelectContent>
              </Select>
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

          <div className="flex justify-between items-center mt-4">
            <div className="text-sm text-gray-600">
              Mostrando {filteredRecords.length} de {records.length} registros
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  dispatch(fetchRecordsByModule("ptyss"))
                  dispatch(fetchClients())
                }}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Actualizar
              </Button>
              <Button
                onClick={exportToExcel}
                disabled={filteredRecords.length === 0}
              >
                <Download className="h-4 w-4 mr-2" />
                Exportar Excel
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de registros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Registros
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center p-8">
              <RefreshCw className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Orden</TableHead>
                    <TableHead>Contenedor</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Naviera</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecords.map((record) => (
                    <TableRow key={record._id}>
                      <TableCell className="font-medium">{record.order || 'N/A'}</TableCell>
                      <TableCell>{record.container || 'N/A'}</TableCell>
                      <TableCell>{getRecordClient(record)}</TableCell>
                      <TableCell>{record.naviera || 'N/A'}</TableCell>
                      <TableCell>
                        <Badge variant={getRecordType(record) === 'local' ? 'default' : 'secondary'}>
                          {getRecordType(record) === 'local' ? 'Local' : 'Trasiego'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={
                            record.status === 'pendiente' ? 'destructive' :
                            record.status === 'completado' ? 'default' : 'outline'
                          }
                        >
                          {record.status === 'pendiente' ? 'Pendiente' :
                           record.status === 'completado' ? 'Completado' : 'Prefacturado'}
                        </Badge>
                      </TableCell>
                      <TableCell>${record.totalValue.toFixed(2)}</TableCell>
                      <TableCell>{new Date(record.createdAt).toLocaleDateString('es-ES')}</TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => viewRecordDetails(record)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
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
                  <TabsTrigger value="servicios">Servicios</TabsTrigger>
                  <TabsTrigger value="vehiculo">Vehículo</TabsTrigger>
                </TabsList>
                
                <TabsContent value="general" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium">Orden</Label>
                      <p className="text-sm text-gray-600">{selectedRecord.order || 'N/A'}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Contenedor</Label>
                      <p className="text-sm text-gray-600">{selectedRecord.container || 'N/A'}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Cliente</Label>
                      <p className="text-sm text-gray-600">
                        {getRecordClient(selectedRecord)}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Naviera</Label>
                      <p className="text-sm text-gray-600">{selectedRecord.naviera || 'N/A'}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Desde</Label>
                      <p className="text-sm text-gray-600">{selectedRecord.from || 'N/A'}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Hasta</Label>
                      <p className="text-sm text-gray-600">{selectedRecord.to || 'N/A'}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Tipo de Operación</Label>
                      <p className="text-sm text-gray-600">{selectedRecord.operationType || 'N/A'}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Tamaño Contenedor</Label>
                      <p className="text-sm text-gray-600">{selectedRecord.containerSize || 'N/A'}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Tipo Contenedor</Label>
                      <p className="text-sm text-gray-600">{selectedRecord.containerType || 'N/A'}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Fecha Movimiento</Label>
                      <p className="text-sm text-gray-600">{selectedRecord.moveDate || 'N/A'}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Valor Total</Label>
                      <p className="text-sm font-bold text-green-600">${(selectedRecord.totalValue || 0).toFixed(2)}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Tipo</Label>
                      <Badge variant={getRecordType(selectedRecord) === 'local' ? 'default' : 'secondary'}>
                        {getRecordType(selectedRecord) === 'local' ? 'Local' : 'Trasiego'}
                      </Badge>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Estado</Label>
                      <Badge 
                        variant={
                          selectedRecord.status === 'pendiente' ? 'destructive' :
                          selectedRecord.status === 'completado' ? 'default' : 'outline'
                        }
                      >
                        {selectedRecord.status === 'pendiente' ? 'Pendiente' :
                         selectedRecord.status === 'completado' ? 'Completado' : 'Prefacturado'}
                      </Badge>
                    </div>
                  </div>
                  
                  {selectedRecord.notes && (
                    <div>
                      <Label className="text-sm font-medium">Notas</Label>
                      <p className="text-sm text-gray-600">{selectedRecord.notes || 'N/A'}</p>
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="servicios" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium">Estadía</Label>
                      <p className="text-sm text-gray-600">{selectedRecord.estadia || 'N/A'}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Genset</Label>
                      <p className="text-sm text-gray-600">{selectedRecord.genset || 'N/A'}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Retención</Label>
                      <p className="text-sm text-gray-600">{selectedRecord.retencion || 'N/A'}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Pesaje</Label>
                      <p className="text-sm text-gray-600">{selectedRecord.pesaje || 'N/A'}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">TI</Label>
                      <p className="text-sm text-gray-600">{selectedRecord.ti || 'N/A'}</p>
                    </div>
                  </div>
                  
                  {getRecordType(selectedRecord) === 'local' && (
                    <div className="border-t pt-4">
                      <h4 className="font-medium mb-2">Información Local</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm font-medium">Cliente Local</Label>
                          <p className="text-sm text-gray-600">{selectedRecord.localClientName || 'N/A'}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Precio Ruta Local</Label>
                          <p className="text-sm text-gray-600">
                            {selectedRecord.localRoutePrice ? `$${selectedRecord.localRoutePrice.toFixed(2)}` : 'N/A'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="vehiculo" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium">Matrícula Camión</Label>
                      <p className="text-sm text-gray-600">{selectedRecord.matriculaCamion || 'N/A'}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Conductor</Label>
                      <p className="text-sm text-gray-600">{selectedRecord.conductor || 'N/A'}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Número Chasis/Placa</Label>
                      <p className="text-sm text-gray-600">{selectedRecord.numeroChasisPlaca || 'N/A'}</p>
                    </div>
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