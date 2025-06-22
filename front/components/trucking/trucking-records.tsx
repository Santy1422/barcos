"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Truck, Search, Download, Eye, Edit, FileText, FileWarning, Pencil } from "lucide-react"
import { useAppSelector, useAppDispatch } from "@/lib/hooks"
import {
  selectAllIndividualRecords,
  selectAllInvoices,
  updateRecord,
  type InvoiceRecord as PersistedInvoiceRecord,
  type ExcelRecord as IndividualExcelRecord,
} from "@/lib/features/records/recordsSlice"
import { selectExcelFilesByModule, type ExcelFile } from "@/lib/features/excel/excelSlice"
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
import saveAs from "file-saver"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

export function TruckingRecords() {
  const [searchTerm, setSearchTerm] = useState("")
  const [recordStatusFilter, setRecordStatusFilter] = useState("all")
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState("all")
  const [showInvoiceDetailModal, setShowInvoiceDetailModal] = useState(false)
  const [invoiceToView, setInvoiceToView] = useState<PersistedInvoiceRecord | null>(null)
  const [showXmlModal, setShowXmlModal] = useState(false)
  const [xmlContent, setXmlContent] = useState("")
  
  // Nuevos estados para edición de Excel
  const [showEditExcelModal, setShowEditExcelModal] = useState(false)
  const [excelToEdit, setExcelToEdit] = useState<ExcelFile | null>(null)
  const [editingRecords, setEditingRecords] = useState<IndividualExcelRecord[]>([])
  const [activeTab, setActiveTab] = useState<"records" | "invoices" | "excel">("records")

  const { toast } = useToast()
  const dispatch = useAppDispatch()

  const allIndividualRecords = useAppSelector(selectAllIndividualRecords)
  const allPersistedInvoices = useAppSelector(selectAllInvoices)
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

      {/* Tabs para navegar entre secciones */}
      <div className="flex space-x-1 bg-muted p-1 rounded-lg w-fit">
        <Button
          variant={activeTab === "records" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("records")}
        >
          Registros de Servicios
        </Button>
        <Button
          variant={activeTab === "invoices" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("invoices")}
        >
          Facturas Creadas
        </Button>
        <Button
          variant={activeTab === "excel" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("excel")}
        >
          Archivos Excel
        </Button>
      </div>

      {/* ... existing statistics cards ... */}

      {/* Nueva sección para mostrar archivos Excel */}
      {activeTab === "excel" && (
        <Card>
          <CardHeader>
            <CardTitle>Archivos Excel Cargados</CardTitle>
            <div className="flex flex-col md:flex-row gap-4 mt-4">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre de archivo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {allExcelFiles.length === 0 ? (
              <Alert variant="default">
                <FileWarning className="h-4 w-4" />
                <AlertTitle>No hay archivos Excel</AlertTitle>
                <AlertDescription>
                  No hay archivos Excel cargados aún. Ve a la sección de carga para subir algunos archivos.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="max-h-[500px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre del Archivo</TableHead>
                      <TableHead>Fecha de Carga</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Registros</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Valor Total</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allExcelFiles
                      .filter(file => 
                        file.filename.toLowerCase().includes(searchTerm.toLowerCase())
                      )
                      .map((excelFile) => {
                        const relatedRecords = allIndividualRecords.filter(record => 
                          excelFile.recordIds.includes(record.id)
                        )
                        const totalValue = relatedRecords.reduce((sum, record) => sum + record.totalValue, 0)
                        
                        return (
                          <TableRow key={excelFile.id}>
                            <TableCell className="font-medium">{excelFile.filename}</TableCell>
                            <TableCell>{new Date(excelFile.uploadDate).toLocaleDateString()}</TableCell>
                            <TableCell>{excelFile.type}</TableCell>
                            <TableCell>{relatedRecords.length}</TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  excelFile.status === "procesado"
                                    ? "default"
                                    : excelFile.status === "pendiente"
                                      ? "secondary"
                                      : "destructive"
                                }
                              >
                                {excelFile.status}
                              </Badge>
                            </TableCell>
                            <TableCell>${totalValue.toFixed(2)}</TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditExcel(excelFile)}
                                  title="Editar Excel"
                                  disabled={excelFile.status !== "procesado"}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  title="Ver Detalles"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  title="Descargar"
                                >
                                  <Download className="h-4 w-4" />
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
      )}

      {/* ... existing records and invoices sections ... */}

      {/* Modal para editar Excel */}
      {excelToEdit && (
        <Dialog open={showEditExcelModal} onOpenChange={setShowEditExcelModal}>
          <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>Editar Excel: {excelToEdit.filename}</DialogTitle>
              <DialogDescription>
                Modifica los registros de este archivo Excel. Los cambios se guardarán automáticamente.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4 flex-grow overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>RUC</TableHead>
                    <TableHead>Desde</TableHead>
                    <TableHead>Hacia</TableHead>
                    <TableHead>Contenedor</TableHead>
                    <TableHead>Tamaño</TableHead>
                    <TableHead>Tarifa</TableHead>
                    <TableHead>Gastos Puerto</TableHead>
                    <TableHead>Otros Gastos</TableHead>
                    <TableHead>Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {editingRecords.map((record) => {
                    const data = record.data as any
                    return (
                      <TableRow key={record.id}>
                        <TableCell>
                          <Input
                            type="date"
                            value={data.fecha || ""}
                            onChange={(e) => handleUpdateRecord(record.id, "fecha", e.target.value)}
                            className="w-32"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={data.cliente || ""}
                            onChange={(e) => handleUpdateRecord(record.id, "cliente", e.target.value)}
                            className="w-40"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={data.ruc || ""}
                            onChange={(e) => handleUpdateRecord(record.id, "ruc", e.target.value)}
                            className="w-32"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={data.desde || ""}
                            onChange={(e) => handleUpdateRecord(record.id, "desde", e.target.value)}
                            className="w-32"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={data.hacia || ""}
                            onChange={(e) => handleUpdateRecord(record.id, "hacia", e.target.value)}
                            className="w-32"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={data.contenedor || ""}
                            onChange={(e) => handleUpdateRecord(record.id, "contenedor", e.target.value)}
                            className="w-32"
                          />
                        </TableCell>
                        <TableCell>
                          <Select
                            value={data.tamaño || ""}
                            onValueChange={(value) => handleUpdateRecord(record.id, "tamaño", value)}
                          >
                            <SelectTrigger className="w-20">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="20">20</SelectItem>
                              <SelectItem value="40">40</SelectItem>
                              <SelectItem value="45">45</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={data.tarifa || ""}
                            onChange={(e) => handleUpdateRecord(record.id, "tarifa", parseFloat(e.target.value) || 0)}
                            className="w-24"
                            step="0.01"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={data.gastosPuerto || ""}
                            onChange={(e) => handleUpdateRecord(record.id, "gastosPuerto", parseFloat(e.target.value) || 0)}
                            className="w-24"
                            step="0.01"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={data.otrosGastos || ""}
                            onChange={(e) => handleUpdateRecord(record.id, "otrosGastos", parseFloat(e.target.value) || 0)}
                            className="w-24"
                            step="0.01"
                          />
                        </TableCell>
                        <TableCell className="font-medium">
                          ${calculateRecordTotal(data).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => setShowEditExcelModal(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSaveExcelChanges}>
                Guardar Cambios
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ... existing modals ... */}
    </div>
  )
}

// Función para descargar PDF de factura existente
const handleDownloadPdf = (invoice: PersistedInvoiceRecord) => {
  if (invoice.pdfData) {
    saveAs(invoice.pdfData, `${invoice.invoiceNumber}.pdf`)
    toast({ title: "PDF Descargado", description: "El archivo PDF ha sido descargado." })
  } else {
    // Generar PDF si no existe
    toast({ title: "Generando PDF", description: "Generando PDF de la factura..." })
    // Aquí podrías regenerar el PDF usando los datos de la factura
  }
}

// Actualizar la tabla para incluir el botón de descarga de PDF
<div className="flex space-x-1">
  <Button
    variant="ghost"
    size="sm"
    onClick={() => handleViewXmlOfExisting(invoice)}
    title="Ver XML"
  >
    <FileText className="h-4 w-4" />
  </Button>
  <Button 
    variant="ghost" 
    size="sm" 
    onClick={() => handleDownloadPdf(invoice)}
    title="Descargar PDF"
  >
    <Download className="h-4 w-4" />
  </Button>
</div>

// Nueva función para manejar la edición de Excel (moved inside component)
const handleEditExcel = (excelFile: ExcelFile) => {
  const relatedRecords = allIndividualRecords.filter(record => 
    excelFile.recordIds.includes(record.id)
  )
  setExcelToEdit(excelFile)
  setEditingRecords([...relatedRecords])
  setShowEditExcelModal(true)
}

// Función para actualizar un registro individual
const handleUpdateRecord = (recordId: string, field: string, value: any) => {
  setEditingRecords(prev => 
    prev.map(record => 
      record.id === recordId 
        ? { ...record, data: { ...record.data, [field]: value } }
        : record
    )
  )
}

// Función para guardar los cambios
const handleSaveExcelChanges = () => {
  editingRecords.forEach(record => {
    dispatch(updateRecord({
      id: record.id,
      updates: {
        data: record.data,
        totalValue: calculateRecordTotal(record.data)
      }
    }))
  })
    
  setShowEditExcelModal(false)
  setExcelToEdit(null)
  setEditingRecords([])
    
  toast({
    title: "Excel Actualizado",
    description: "Los cambios han sido guardados exitosamente."
  })
}

// Función para calcular el total de un registro
const calculateRecordTotal = (data: any) => {
  const tarifa = parseFloat(data.tarifa) || 0
  const gastosPuerto = parseFloat(data.gastosPuerto) || 0
  const otrosGastos = parseFloat(data.otrosGastos) || 0
  return tarifa + gastosPuerto + otrosGastos
}
