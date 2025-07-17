"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Ship, Search, Filter, Download, Eye, FileText, Calendar, DollarSign, User, Loader2, Trash2, Database } from "lucide-react"
import { useAppSelector, useAppDispatch } from "@/lib/hooks"
import { useToast } from "@/hooks/use-toast"
import { selectInvoicesByModule, fetchInvoicesAsync, deleteInvoiceAsync, selectRecordsLoading, selectRecordsError, updateInvoiceAsync, updateInvoiceStatus, selectAllIndividualRecords, fetchAllRecordsByModule } from "@/lib/features/records/recordsSlice"
import { PTYSSPrefacturaEditModal } from "./ptyss-prefactura-edit-modal"
import { PTYSSPdfViewer } from "./ptyss-pdf-viewer"
import { PTYSSFacturacionModal } from "./ptyss-facturacion-modal"
import { PTYSSRecordsViewModal } from "./ptyss-records-view-modal"
import { fetchClients } from "@/lib/features/clients/clientsSlice"

export function PTYSSRecords() {
  const dispatch = useAppDispatch()
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [invoiceToDelete, setInvoiceToDelete] = useState<any>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [editInvoice, setEditInvoice] = useState<any>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [pdfInvoice, setPdfInvoice] = useState<any>(null)
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false)
  const [facturarInvoice, setFacturarInvoice] = useState<any>(null)
  const [isFacturarModalOpen, setIsFacturarModalOpen] = useState(false)
  // Estado para ver registros asociados
  const [viewRecordsInvoice, setViewRecordsInvoice] = useState<any>(null)
  const [isViewRecordsModalOpen, setIsViewRecordsModalOpen] = useState(false)

  // Obtener prefacturas PTYSS del store
  const ptyssInvoices = useAppSelector((state) => selectInvoicesByModule(state, "ptyss"))
  const isLoading = useAppSelector(selectRecordsLoading)
  const error = useAppSelector(selectRecordsError)
  const allRecords = useAppSelector(selectAllIndividualRecords)
  const clients = useAppSelector((state) => state.clients.clients)

  // Función para obtener los contenedores de una factura
  const getContainersForInvoice = (invoice: any) => {
    console.log("🔍 getContainersForInvoice - invoice:", invoice)
    console.log("🔍 getContainersForInvoice - relatedRecordIds:", invoice.relatedRecordIds)
    console.log("🔍 getContainersForInvoice - allRecords length:", allRecords.length)
    
    if (!invoice.relatedRecordIds || invoice.relatedRecordIds.length === 0) {
      console.log("🔍 getContainersForInvoice - No hay relatedRecordIds")
      return "N/A"
    }
    
    if (allRecords.length === 0) {
      console.log("🔍 getContainersForInvoice - No hay registros cargados")
      return "N/A"
    }
    
    const relatedRecords = allRecords.filter((record: any) => {
      const isRelated = invoice.relatedRecordIds.includes(record._id || record.id)
      console.log(`🔍 getContainersForInvoice - Record ${record._id || record.id} isRelated: ${isRelated}`)
      return isRelated
    })
    
    console.log("🔍 getContainersForInvoice - relatedRecords encontrados:", relatedRecords.length)
    console.log("🔍 getContainersForInvoice - relatedRecords:", relatedRecords)
    
    if (relatedRecords.length === 0) {
      console.log("🔍 getContainersForInvoice - No se encontraron registros relacionados")
      return "N/A"
    }
    
    const containers = relatedRecords.map((record: any) => {
      const data = record.data as Record<string, any>
      console.log("🔍 getContainersForInvoice - record data:", data)
      const container = data?.container || "N/A"
      console.log("🔍 getContainersForInvoice - container extraído:", container)
      return container
    }).filter((container: string) => container !== "N/A")
    
    console.log("🔍 getContainersForInvoice - containers extraídos:", containers)
    
    if (containers.length === 0) return "N/A"
    if (containers.length === 1) return containers[0]
    return `${containers[0]} y ${containers.length - 1} más`
  }

  // Debug: Log las facturas cargadas
  console.log("🔍 PTYSSRecords - ptyssInvoices:", ptyssInvoices)
  console.log("🔍 PTYSSRecords - Cantidad de facturas:", ptyssInvoices.length)
  console.log("🔍 PTYSSRecords - isLoading:", isLoading)
  console.log("🔍 PTYSSRecords - error:", error)
  console.log("🔍PTYSSRecords - allRecords:", allRecords)
  console.log("🔍 PTYSSRecords - Cantidad de registros:", allRecords.length)
  
  // Debug: Verificar IDs de registros en facturas
  if (ptyssInvoices.length > 0) {
    console.log("🔍 PTYSSRecords - Primera factura relatedRecordIds:", ptyssInvoices[0].relatedRecordIds)
    console.log("🔍PTYSSRecords - IDs de registros disponibles:", allRecords.map((r: any) => r._id || r.id))
    console.log("🔍 PTYSSRecords - Todos los registros:", allRecords)
    
    // Verificar si el registro relacionado existe
    const firstInvoice = ptyssInvoices[0]
    const relatedRecordId = firstInvoice.relatedRecordIds[0]
    const relatedRecord = allRecords.find((r: any) => (r._id || r.id) === relatedRecordId)
    console.log("🔍 PTYSSRecords - Registro relacionado encontrado:", relatedRecord)
    console.log("🔍 PTYSSRecords - Estado del registro relacionado:", relatedRecord?.status)
  }

  // Cargar facturas del backend al montar el componente
  useEffect(() => {
    console.log("🔍 PTYSSRecords - Cargando facturas PTYSS del backend...")
    dispatch(fetchInvoicesAsync("ptyss"))
  }, [dispatch])

  // Cargar todos los registros PTYSS para mostrar contenedores
  useEffect(() => {
    console.log("🔍 PTYSSRecords - Cargando registros PTYSS para contenedores...")
    dispatch(fetchAllRecordsByModule("ptyss"))
  }, [dispatch])

  // Cargar clientes para el visor de PDF
  useEffect(() => {
    console.log("🔍 PTYSSRecords - Cargando clientes para visor de PDF...")
    dispatch(fetchClients())
  }, [dispatch])

  // Debug: Monitorear cambios en los registros
  useEffect(() => {
    console.log("🔍 PTYSSRecords - allRecords actualizado:", allRecords.length)
    if (allRecords.length > 0) {
      console.log("🔍 PTYSSRecords - Primer registro:", allRecords[0])
      console.log("🔍 PTYSSRecords - Módulos disponibles:", [...new Set(allRecords.map((r: any) => r.module))])
    }
  }, [allRecords])

  const handleDeleteInvoice = async (invoice: any) => {
    setIsDeleting(true)
    try {
      const result = await dispatch(deleteInvoiceAsync(invoice.id)).unwrap()
      
      toast({
        title: "Factura eliminada",
        description: `La factura ${invoice.invoiceNumber} ha sido eliminada y ${result.data.recordsFreed} registros han sido liberados.`,
      })
      
      setInvoiceToDelete(null)
      
      // Recargar las facturas para actualizar la lista
      dispatch(fetchInvoicesAsync("ptyss"))
      
    } catch (error: any) {
      toast({
        title: "Error al eliminar factura",
        description: error.message || "Error al eliminar la factura",
        variant: "destructive"
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const handleEditSuccess = () => {
    // Recargar las facturas para actualizar la lista después de editar
    dispatch(fetchInvoicesAsync("ptyss"))
  }

  const filteredInvoices = ptyssInvoices.filter((invoice: any) => {
    const containers = getContainersForInvoice(invoice)
    const matchesSearch = 
      invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      containers.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || invoice.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "prefactura":
        return <Badge variant="outline" className="text-blue-600 border-blue-600">Prefactura</Badge>
      case "facturada":
        return <Badge variant="outline" className="text-green-600 border-green-600">Facturada</Badge>
      case "anulada":
        return <Badge variant="outline" className="text-red-600 border-red-600">Anulada</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES')
  }

  return (
    <div className="space-y-6">
      {/* Modal de edición de prefactura */}
      <PTYSSPrefacturaEditModal
        open={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        invoice={editInvoice}
        onClose={() => setIsEditModalOpen(false)}
        onEditSuccess={handleEditSuccess}
      />
      {/* Modal de facturación */}
      <PTYSSFacturacionModal
        open={isFacturarModalOpen}
        onOpenChange={(open) => {
          setIsFacturarModalOpen(open)
          if (!open) setFacturarInvoice(null)
        }}
        invoice={facturarInvoice}
        onFacturar={async (newInvoiceNumber: string) => {
          if (!facturarInvoice) return
          await dispatch(updateInvoiceAsync({ id: facturarInvoice.id, updates: { status: "facturada", invoiceNumber: newInvoiceNumber } })).unwrap()
          dispatch(updateInvoiceStatus({ id: facturarInvoice.id, status: "facturada", invoiceNumber: newInvoiceNumber }))
          dispatch(fetchInvoicesAsync("ptyss"))
        }}
      />
      {/* Modal de ver registros asociados */}
      <PTYSSRecordsViewModal
        open={isViewRecordsModalOpen}
        onOpenChange={(open) => {
          setIsViewRecordsModalOpen(open)
          if (!open) setViewRecordsInvoice(null)
        }}
        invoice={viewRecordsInvoice}
      />
      {/* Modal de visor de PDF */}
      <PTYSSPdfViewer
        open={isPdfModalOpen}
        onOpenChange={setIsPdfModalOpen}
        invoice={pdfInvoice}
        clients={clients}
        allRecords={allRecords}
      />
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Facturar - Prefacturas PTYSS
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Buscar por número, cliente o contenedor..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filtrar por estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="prefactura">Prefactura</SelectItem>
                  <SelectItem value="facturada">Facturada</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Exportar
              </Button>
            </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Contenedor</TableHead>
                  <TableHead>Fecha Emisión</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <div className="flex items-center justify-center space-x-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Cargando prefacturas...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : error ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <div className="text-red-600">
                        Error al cargar prefacturas: {error}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredInvoices.length > 0 ? (
                  filteredInvoices.map((invoice: any) => {
                    console.log("🔍 Renderizando factura:", invoice.invoiceNumber)
                    const containers = getContainersForInvoice(invoice)
                    console.log("🔍 Contenedores calculados:", containers)
                    
                    return (
                      <TableRow key={invoice.id}>
                      <TableCell className="font-medium font-mono text-sm">
                        {invoice.invoiceNumber}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          {invoice.clientName}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Ship className="h-4 w-4 text-muted-foreground" />
                          {containers}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {formatDate(invoice.issueDate)}
                        </div>
                      </TableCell>
                      <TableCell className="font-bold">
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          ${invoice.totalAmount.toFixed(2)}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end space-x-2">
                                                      {/* Botón para ver registros asociados */}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                              onClick={() => {
                                setViewRecordsInvoice(invoice)
                                setIsViewRecordsModalOpen(true)
                              }}
                              title="Ver registros asociados"
                            >
                              <Database className="h-4 w-4" />
                            </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            onClick={() => {
                              setPdfInvoice(invoice)
                              setIsPdfModalOpen(true)
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {invoice.status === "prefactura" && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 w-auto text-blue-600 border-blue-600 hover:bg-blue-50"
                                onClick={() => {
                                  setEditInvoice(invoice)
                                  setIsEditModalOpen(true)
                                }}
                              >
                                Editar
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 w-auto text-green-600 border-green-600 hover:bg-green-50"
                                onClick={() => {
                                  setFacturarInvoice(invoice)
                                  setIsFacturarModalOpen(true)
                                }}
                              >
                                Facturar
                              </Button>
                            </>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => setInvoiceToDelete(invoice)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )})
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      {ptyssInvoices.length === 0
                        ? "No hay prefacturas PTYSS creadas"
                        : "No se encontraron prefacturas que coincidan con los filtros"}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
            <span>Mostrando {filteredInvoices.length} de {ptyssInvoices.length} prefacturas</span>
            <span>Total: ${filteredInvoices.reduce((sum: number, invoice: any) => sum + invoice.totalAmount, 0).toFixed(2)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Modal de confirmación para eliminar factura */}
      <Dialog open={!!invoiceToDelete} onOpenChange={() => setInvoiceToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar eliminación</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>¿Estás seguro de que quieres eliminar esta prefactura?</p>
            {invoiceToDelete && (
              <div className="mt-4 space-y-2">
                <p className="font-medium">
                  {invoiceToDelete.invoiceNumber} - {invoiceToDelete.clientName}
                </p>
                <p className="text-sm text-muted-foreground">
                  Esta acción también liberará {invoiceToDelete.relatedRecordIds.length} registro{invoiceToDelete.relatedRecordIds.length !== 1 ? 's' : ''} asociado{invoiceToDelete.relatedRecordIds.length !== 1 ? 's' : ''} para que puedan ser utilizados en nuevas prefacturas.
                </p>
              </div>
            )}
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setInvoiceToDelete(null)}>
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => {
                if (invoiceToDelete) {
                  handleDeleteInvoice(invoiceToDelete)
                }
              }}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Eliminando...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Eliminar
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
} 