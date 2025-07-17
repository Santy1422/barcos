"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Ship, Search, Filter, Download, Eye, FileText, Calendar, DollarSign, User, Loader2, Trash2 } from "lucide-react"
import { useAppSelector, useAppDispatch } from "@/lib/hooks"
import { useToast } from "@/hooks/use-toast"
import { selectInvoicesByModule, fetchInvoicesAsync, deleteInvoiceAsync, selectRecordsLoading, selectRecordsError } from "@/lib/features/records/recordsSlice"

export function PTYSSRecords() {
  const dispatch = useAppDispatch()
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [invoiceToDelete, setInvoiceToDelete] = useState<any>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Obtener prefacturas PTYSS del store
  const ptyssInvoices = useAppSelector((state) => selectInvoicesByModule(state, "ptyss"))
  const isLoading = useAppSelector(selectRecordsLoading)
  const error = useAppSelector(selectRecordsError)

  // Debug: Log las facturas cargadas
  console.log("🔍 PTYSSRecords - ptyssInvoices:", ptyssInvoices)
  console.log("🔍 PTYSSRecords - Cantidad de facturas:", ptyssInvoices.length)
  console.log("🔍 PTYSSRecords - isLoading:", isLoading)
  console.log("🔍 PTYSSRecords - error:", error)

  // Cargar facturas del backend al montar el componente
  useEffect(() => {
    console.log("🔍 PTYSSRecords - Cargando facturas PTYSS del backend...")
    dispatch(fetchInvoicesAsync("ptyss"))
  }, [dispatch])

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

  const filteredInvoices = ptyssInvoices.filter(invoice => {
    const matchesSearch = 
      invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.clientRuc.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === "all" || invoice.status === statusFilter
    
    return matchesSearch && matchesStatus
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "generada":
        return <Badge variant="outline" className="text-blue-600 border-blue-600">Generada</Badge>
      case "transmitida":
        return <Badge variant="outline" className="text-green-600 border-green-600">Transmitida</Badge>
      case "anulada":
        return <Badge variant="outline" className="text-red-600 border-red-600">Anulada</Badge>
      case "pagada":
        return <Badge variant="outline" className="text-purple-600 border-purple-600">Pagada</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES')
  }

  return (
    <div className="space-y-6">
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
                  placeholder="Buscar por número de prefactura, cliente..."
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
                  <SelectItem value="generada">Generada</SelectItem>
                  <SelectItem value="transmitida">Transmitida</SelectItem>
                  <SelectItem value="anulada">Anulada</SelectItem>
                  <SelectItem value="pagada">Pagada</SelectItem>
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
                  <TableHead>Número Prefactura</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>RUC</TableHead>
                  <TableHead>Fecha Emisión</TableHead>
                  <TableHead>Fecha Vencimiento</TableHead>
                  <TableHead>Subtotal</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Registros</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8">
                      <div className="flex items-center justify-center space-x-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Cargando prefacturas...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : error ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8">
                      <div className="text-red-600">
                        Error al cargar prefacturas: {error}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredInvoices.length > 0 ? (
                  filteredInvoices.map((invoice) => (
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
                      <TableCell className="font-mono text-sm">
                        {invoice.clientRuc}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {formatDate(invoice.issueDate)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {formatDate(invoice.dueDate)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          ${invoice.subtotal.toFixed(2)}
                        </div>
                      </TableCell>
                      <TableCell className="font-bold">
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          ${invoice.totalAmount.toFixed(2)}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {invoice.relatedRecordIds.length} registro{invoice.relatedRecordIds.length !== 1 ? 's' : ''}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
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
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
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
            <span>Total: ${filteredInvoices.reduce((sum, invoice) => sum + invoice.totalAmount, 0).toFixed(2)}</span>
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