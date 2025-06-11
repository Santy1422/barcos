"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Truck, Search, Download, Eye, Edit, FileText, FileWarning } from "lucide-react"
import { useAppSelector } from "@/lib/hooks"
import {
  selectIndividualRecords,
  selectInvoices,
  type InvoiceRecord as PersistedInvoiceRecord,
} from "@/lib/features/records/recordsSlice"
import { selectExcelFilesByModule } from "@/lib/features/excel/excelSlice"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { generateInvoiceXML } from "@/lib/xml-generator"
import type { InvoiceForXmlPayload, InvoiceLineItemForXml } from "@/lib/features/invoice/invoiceSlice"
import { useToast } from "@/hooks/use-toast"
import { Separator } from "@/components/ui/separator"
import { selectModuleCustomFields, type CustomFieldConfig } from "@/lib/features/config/configSlice"

export function TruckingRecords() {
  const [searchTerm, setSearchTerm] = useState("")
  const [recordStatusFilter, setRecordStatusFilter] = useState("all")
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState("all")
  const [showInvoiceDetailModal, setShowInvoiceDetailModal] = useState(false)
  const [invoiceToView, setInvoiceToView] = useState<PersistedInvoiceRecord | null>(null)
  const [showXmlModal, setShowXmlModal] = useState(false)
  const [xmlContent, setXmlContent] = useState("")

  const { toast } = useToast()

  const allIndividualRecords = useAppSelector(selectIndividualRecords)
  const allPersistedInvoices = useAppSelector(selectInvoices)
  const allExcelFiles = useAppSelector((state) => selectExcelFilesByModule(state, "trucking"))
  const truckingCustomFields = useAppSelector((state) => selectModuleCustomFields(state, "trucking"))

  const truckingIndividualRecords = useMemo(
    () => allIndividualRecords.filter((record) => record.module === "trucking"),
    [allIndividualRecords],
  )
  const truckingPersistedInvoices = useMemo(
    () => allPersistedInvoices.filter((invoice) => invoice.module === "trucking"),
    [allPersistedInvoices],
  )

  const filteredRecords = useMemo(() => {
    const lowerSearch = searchTerm.toLowerCase()
    return truckingIndividualRecords.filter((record) => {
      const data = record.data as Record<string, any>
      const matchesSearch =
        String(data.cliente || "")
          .toLowerCase()
          .includes(lowerSearch) ||
        String(data.ruc || "")
          .toLowerCase()
          .includes(lowerSearch) ||
        String(data.contenedor || "")
          .toLowerCase()
          .includes(lowerSearch) ||
        String(data.bl || "")
          .toLowerCase()
          .includes(lowerSearch) ||
        String(data.driverExcel || "")
          .toLowerCase()
          .includes(lowerSearch) ||
        String(record.id).toLowerCase().includes(lowerSearch)
      const matchesStatus = recordStatusFilter === "all" || record.status === recordStatusFilter
      return matchesSearch && matchesStatus
    })
  }, [truckingIndividualRecords, searchTerm, recordStatusFilter])

  const filteredInvoices = useMemo(() => {
    const lowerSearch = searchTerm.toLowerCase()
    return truckingPersistedInvoices.filter((invoice) => {
      const matchesSearch =
        String(invoice.clientName || "")
          .toLowerCase()
          .includes(lowerSearch) ||
        String(invoice.invoiceNumber || "")
          .toLowerCase()
          .includes(lowerSearch) ||
        String(invoice.clientRuc || "")
          .toLowerCase()
          .includes(lowerSearch)
      const matchesStatus = invoiceStatusFilter === "all" || invoice.status === invoiceStatusFilter
      return matchesSearch && matchesStatus
    })
  }, [truckingPersistedInvoices, searchTerm, invoiceStatusFilter])

  const handleViewInvoiceDetails = (invoice: PersistedInvoiceRecord) => {
    setInvoiceToView(invoice)
    setShowInvoiceDetailModal(true)
  }

  const handleViewXmlOfExisting = (invoice: PersistedInvoiceRecord) => {
    if (invoice.xmlData) {
      setXmlContent(invoice.xmlData)
      setShowXmlModal(true)
    } else {
      try {
        const recordsForXml: InvoiceLineItemForXml[] = invoice.relatedRecordIds
          .map((recordId) => {
            const originalRecord = allIndividualRecords.find((r) => r.id === recordId)
            if (!originalRecord) return null
            const recData = originalRecord.data as Record<string, any>
            const lineItemCustomFields: Record<string, any> = {}
            truckingCustomFields.forEach((cf) => {
              const excelKeyGuess = cf.label
                .toLowerCase()
                .replace(/\s+/g, "_")
                .replace(/[^\w_]/g, "")
              if (recData && recData[excelKeyGuess] !== undefined) {
                lineItemCustomFields[cf.id] = recData[excelKeyGuess]
              }
            })
            return {
              id: originalRecord.id,
              description:
                recData.description || `Servicio de ${recData.tamaño || ""} Cont. ${recData.contenedor || ""}`,
              quantity: recData.quantity || 1,
              unitPrice: recData.tarifa || originalRecord.totalValue,
              totalPrice: originalRecord.totalValue,
              serviceCode: recData.serviceCode || "TRK-STD",
              unit: recData.unit || "VIAJE",
              blNumber: recData.bl || "",
              containerNumber: recData.contenedor || "",
              containerSize: recData.tamaño || "40",
              containerType: recData.tipoContenedor || "DV",
              containerIsoCode: recData.containerIsoCode || "42G1",
              fullEmptyStatus: recData.fullEmptyStatus || "EMPTY",
              ...lineItemCustomFields,
            }
          })
          .filter((item): item is InvoiceLineItemForXml => item !== null)

        const invoiceLevelCustomFields: Record<string, any> = {}
        if (invoice.details) {
          truckingCustomFields.forEach((cf) => {
            if (invoice.details![cf.id] !== undefined) {
              invoiceLevelCustomFields[cf.id] = invoice.details![cf.id]
            }
          })
        }

        const xmlPayload: InvoiceForXmlPayload = {
          id: invoice.id,
          module: invoice.module,
          invoiceNumber: invoice.invoiceNumber,
          client: invoice.clientRuc,
          clientName: invoice.clientName,
          date: invoice.issueDate,
          dueDate: invoice.dueDate,
          currency: invoice.currency,
          total: invoice.totalAmount,
          records: recordsForXml,
          status: "generated", // Or invoice.status if more appropriate
          driverId: invoice.details?.driverId,
          vehicleId: invoice.details?.vehicleId,
          routeId: invoice.details?.routeId,
          ...invoiceLevelCustomFields,
        }
        const tempXml = generateInvoiceXML(xmlPayload)
        setXmlContent(tempXml)
        setShowXmlModal(true)
        toast({ title: "XML Generado al Vuelo", description: "El XML no estaba pre-guardado." })
      } catch (error: any) {
        console.error("Error generating XML on the fly:", error)
        toast({ title: "Error", description: `No se pudo generar el XML: ${error.message}`, variant: "destructive" })
      }
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-blue-500 flex items-center justify-center">
          <Truck className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Registros - Trucking</h1>
          <p className="text-muted-foreground">Historial completo de servicios de transporte terrestre</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Registros</p>
                <p className="text-2xl font-bold">{truckingIndividualRecords.length}</p>
              </div>
              <FileText className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Facturas Creadas</p>
                <p className="text-2xl font-bold">{truckingPersistedInvoices.length}</p>
              </div>
              <FileText className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Excel Procesados</p>
                <p className="text-2xl font-bold">{allExcelFiles.filter((f) => f.status === "procesado").length}</p>
              </div>
              <FileText className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Valor Total Registros</p>
                <p className="text-2xl font-bold">
                  ${truckingIndividualRecords.reduce((sum, record) => sum + record.totalValue, 0).toFixed(2)}
                </p>
              </div>
              <Download className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Registros de Servicios de Trucking</CardTitle>
          <div className="flex flex-col md:flex-row gap-4 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por cliente, RUC, contenedor, ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={recordStatusFilter} onValueChange={setRecordStatusFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Estado Registro" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los Estados</SelectItem>
                <SelectItem value="pendiente">Pendiente</SelectItem>
                <SelectItem value="facturado">Facturado</SelectItem>
                <SelectItem value="anulado">Anulado</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Exportar Registros
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {filteredRecords.length === 0 ? (
            <Alert variant="default">
              <FileWarning className="h-4 w-4" />
              <AlertTitle>No hay registros</AlertTitle>
              <AlertDescription>
                {truckingIndividualRecords.length === 0
                  ? "No hay registros de Trucking aún. Sube algunos Excel para comenzar."
                  : "No se encontraron registros con los filtros aplicados."}
              </AlertDescription>
            </Alert>
          ) : (
            <div className="max-h-[500px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>RUC</TableHead>
                    <TableHead>Desde</TableHead>
                    <TableHead>Hacia</TableHead>
                    <TableHead>Contenedor</TableHead>
                    <TableHead>Driver (Excel)</TableHead>
                    <TableHead>Valor Total</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Factura ID</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecords.map((record) => {
                    const data = record.data as Record<string, any>
                    return (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">{record.id.split("-").slice(-2).join("-")}</TableCell>
                        <TableCell>{data.fecha}</TableCell>
                        <TableCell>{data.cliente}</TableCell>
                        <TableCell>{data.ruc || "-"}</TableCell>
                        <TableCell>{data.desde || "-"}</TableCell>
                        <TableCell>{data.hacia || "-"}</TableCell>
                        <TableCell>{data.contenedor || "-"}</TableCell>
                        <TableCell>{data.driverExcel || "-"}</TableCell>
                        <TableCell>${record.totalValue.toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              record.status === "facturado"
                                ? "success"
                                : record.status === "pendiente"
                                  ? "warning"
                                  : "secondary"
                            }
                          >
                            {record.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {record.invoiceId ? (
                            <Badge variant="outline">{record.invoiceId.split("-").pop()}</Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" title="Ver Detalles">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" title="Editar Registro">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Facturas de Trucking Creadas</CardTitle>
          <div className="flex flex-col md:flex-row gap-4 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por número de factura, cliente, RUC..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={invoiceStatusFilter} onValueChange={setInvoiceStatusFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Estado Factura" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los Estados</SelectItem>
                <SelectItem value="generada">Generada</SelectItem>
                <SelectItem value="transmitida">Transmitida</SelectItem>
                <SelectItem value="pagada">Pagada</SelectItem>
                <SelectItem value="anulada">Anulada</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Exportar Facturas
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {filteredInvoices.length === 0 ? (
            <Alert variant="default">
              <FileWarning className="h-4 w-4" />
              <AlertTitle>No hay facturas creadas</AlertTitle>
              <AlertDescription>Aún no se han generado facturas para el módulo de Trucking.</AlertDescription>
            </Alert>
          ) : (
            <div className="max-h-[500px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Número</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>RUC</TableHead>
                    <TableHead>Fecha Emisión</TableHead>
                    <TableHead>Registros</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                      <TableCell>{invoice.clientName}</TableCell>
                      <TableCell>{invoice.clientRuc || "-"}</TableCell>
                      <TableCell>{new Date(invoice.issueDate).toLocaleDateString()}</TableCell>
                      <TableCell>{invoice.relatedRecordIds.length}</TableCell>
                      <TableCell className="text-right">
                        ${invoice.totalAmount.toFixed(2)} {invoice.currency}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            invoice.status === "generada"
                              ? "default"
                              : invoice.status === "transmitida"
                                ? "success"
                                : invoice.status === "pagada"
                                  ? "outline"
                                  : "destructive"
                          }
                        >
                          {invoice.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewInvoiceDetails(invoice)}
                            title="Ver Detalles"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewXmlOfExisting(invoice)}
                            title="Ver XML"
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" title="Descargar PDF (Sim)">
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {invoiceToView && (
        <Dialog open={showInvoiceDetailModal} onOpenChange={setShowInvoiceDetailModal}>
          <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>Detalle Factura #{invoiceToView.invoiceNumber}</DialogTitle>
              <DialogDescription>
                Cliente: {invoiceToView.clientName} - Fecha: {new Date(invoiceToView.issueDate).toLocaleDateString()}
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4 space-y-4 flex-grow overflow-y-auto p-1">
              <div className="grid md:grid-cols-2 gap-4 p-3 border rounded-lg bg-muted/30">
                <div>
                  <h4 className="font-semibold text-sm">DE:</h4>
                  <p className="text-xs">Trucking Services Panama Demo</p>
                  <p className="text-xs">Edificio Inteligente, Piso 20, Ciudad de Panamá</p>
                </div>
                <div>
                  <h4 className="font-semibold text-sm">PARA:</h4>
                  <p className="text-xs font-medium">{invoiceToView.clientName}</p>
                  <p className="text-xs">RUC: {invoiceToView.clientRuc}</p>
                  <p className="text-xs">Dirección: {(invoiceToView.details as any)?.clientAddress || "N/A"}</p>
                  <p className="text-xs">Fecha Vencimiento: {new Date(invoiceToView.dueDate).toLocaleDateString()}</p>
                </div>
              </div>
              {invoiceToView.details && (
                <div className="grid md:grid-cols-2 gap-4 p-3 border rounded-lg bg-muted/30">
                  <div>
                    <h4 className="font-semibold text-sm">Detalles de Servicio:</h4>
                    <p className="text-xs">Conductor: {invoiceToView.details.driverName || "N/A"}</p>
                    <p className="text-xs">Vehículo: {invoiceToView.details.vehicleInfo || "N/A"}</p>
                    <p className="text-xs">Ruta: {invoiceToView.details.routeName || "N/A"}</p>
                  </div>
                  {truckingCustomFields.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-sm">Campos Personalizados:</h4>
                      {truckingCustomFields.map((cf: CustomFieldConfig) => {
                        const value = invoiceToView.details![cf.id]
                        return value !== undefined && value !== "" ? (
                          <p key={cf.id} className="text-xs">
                            {cf.label}: {String(value)}
                          </p>
                        ) : null
                      })}
                    </div>
                  )}
                </div>
              )}
              <h4 className="font-semibold">Registros Incluidos:</h4>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Fecha</TableHead>
                    <TableHead className="text-xs">Cliente</TableHead>
                    <TableHead className="text-xs">Contenedor</TableHead>
                    <TableHead className="text-xs text-right">Monto</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoiceToView.relatedRecordIds.map((recordId) => {
                    const record = allIndividualRecords.find((r) => r.id === recordId)
                    if (!record)
                      return (
                        <TableRow key={recordId}>
                          <TableCell colSpan={4}>Registro no encontrado</TableCell>
                        </TableRow>
                      )
                    const data = record.data as Record<string, any>
                    return (
                      <TableRow key={record.id}>
                        <TableCell className="text-xs">{data.fecha}</TableCell>
                        <TableCell className="text-xs">{data.cliente}</TableCell>
                        <TableCell className="text-xs">
                          {data.contenedor} ({data.tamaño})
                        </TableCell>
                        <TableCell className="text-xs text-right">${record.totalValue.toFixed(2)}</TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
              <div className="flex justify-end mt-4">
                <div className="w-full max-w-xs space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal:</span> <span>${invoiceToView.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>ITBMS (7%):</span> <span>${invoiceToView.taxAmount.toFixed(2)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-bold">
                    <span>TOTAL:</span>{" "}
                    <span>
                      ${invoiceToView.totalAmount.toFixed(2)} {invoiceToView.currency}
                    </span>
                  </div>
                </div>
              </div>
              {invoiceToView.notes && (
                <p className="text-xs text-muted-foreground border-t pt-2 mt-2">Notas: {invoiceToView.notes}</p>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowInvoiceDetailModal(false)}>
                Cerrar
              </Button>
              <Button
                onClick={() => {
                  handleViewXmlOfExisting(invoiceToView)
                  setShowInvoiceDetailModal(false)
                }}
              >
                Ver XML
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      <Dialog open={showXmlModal} onOpenChange={setShowXmlModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Vista Previa del XML de Factura</DialogTitle>
          </DialogHeader>
          <div className="mt-4 max-h-[60vh] overflow-y-auto rounded-md bg-muted p-4 flex-grow">
            <pre className="text-sm whitespace-pre-wrap break-all">
              <code>{xmlContent}</code>
            </pre>
          </div>
          <DialogFooter className="mt-4">
            <Button onClick={() => setShowXmlModal(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
