"use client"

import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Truck, FileText, Plus, Check, Download, Mail, Edit2, Eye, FileWarning } from "lucide-react" // Added Eye, Trash2, FileWarning
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import { useAppDispatch, useAppSelector } from "@/lib/hooks"
import { markExcelAsProcessed, type ExcelRecord } from "@/lib/features/excel/excelSlice"
import { createInvoice, type Invoice } from "@/lib/features/invoice/invoiceSlice" // Added updateInvoice
import { markRecordsAsInvoiced } from "@/lib/features/records/recordsSlice"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { generateInvoiceXML } from "@/lib/xml-generator"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger, // Added DialogTrigger
} from "@/components/ui/dialog"

interface TruckingRecordData extends ExcelRecord {
  fecha: string
  cliente: string
  desde: string
  hacia: string
  contenedor: string
  tamaño: string
  bl?: string
  driver?: string
  tarifa: number
  gastosPuerto: number
  otrosGastos: number
  totalRate: number
}

export function TruckingInvoice() {
  const [selectedExcelIds, setSelectedExcelIds] = useState<string[]>([])
  const [invoiceDetails, setInvoiceDetails] = useState({
    invoiceNumber: `TRK-INV-${Date.now().toString().slice(-6)}`,
    client: "",
    date: new Date().toISOString().split("T")[0],
    currency: "USD",
    driver: "",
    vehicle: "",
    paymentTerms: "NET 30",
    notes: "Servicios de transporte terrestre según detalle.",
  })
  const [currentStep, setCurrentStep] = useState<"select" | "create" | "preview">("select")
  const [generatedInvoicePreview, setGeneratedInvoicePreview] = useState<Invoice | null>(null)
  const [isFinalizing, setIsFinalizing] = useState(false)
  const [showXmlModal, setShowXmlModal] = useState(false)
  const [xmlContent, setXmlContent] = useState("")
  const [invoiceToView, setInvoiceToView] = useState<Invoice | null>(null) // For viewing existing invoice details

  const dispatch = useAppDispatch()
  const { files: allExcelFiles } = useAppSelector((state) => state.excel)
  const { invoices: allInvoices } = useAppSelector((state) => state.invoice)
  const { toast } = useToast()

  const truckingInvoices = useMemo(
    () =>
      allInvoices
        .filter((inv) => inv.module === "trucking")
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [allInvoices],
  )
  const availableExcelsForInvoicing = allExcelFiles.filter(
    (excel) => excel.status === "pendiente" && excel.module === "trucking",
  )

  const selectedExcelObjects = useMemo(() => {
    return allExcelFiles.filter((excelFile) => selectedExcelIds.includes(excelFile.id))
  }, [selectedExcelIds, allExcelFiles])

  const recordsForInvoicing = useMemo(() => {
    return selectedExcelObjects.flatMap((excelFile) =>
      excelFile.records.map((record) => ({
        ...record,
        excelId: excelFile.id,
        uniqueDisplayId: `disp-${excelFile.id}-${record.id}`,
      })),
    ) as TruckingRecordData[]
  }, [selectedExcelObjects])

  const { subtotal, tax, total } = useMemo(() => {
    const currentSubtotal = recordsForInvoicing.reduce((sum, record) => sum + (record.totalRate || 0), 0)
    const currentTax = currentSubtotal * 0.07
    const currentTotal = currentSubtotal + currentTax
    return { subtotal: currentSubtotal, tax: currentTax, total: currentTotal }
  }, [recordsForInvoicing])

  const handleExcelSelectionChange = (excelId: string, checked: boolean | string) => {
    if (typeof checked === "boolean") {
      setSelectedExcelIds((prev) => (checked ? [...prev, excelId] : prev.filter((id) => id !== excelId)))
    }
  }

  const proceedToCreateStep = () => {
    if (selectedExcelIds.length === 0) {
      toast({ title: "Error", description: "Selecciona al menos un archivo Excel.", variant: "destructive" })
      return
    }
    if (!invoiceDetails.client && selectedExcelObjects.length > 0 && selectedExcelObjects[0].records.length > 0) {
      const firstRecordClient = (selectedExcelObjects[0].records[0] as TruckingRecordData).cliente
      if (firstRecordClient) {
        setInvoiceDetails((prev) => ({ ...prev, client: firstRecordClient }))
      }
    }
    setCurrentStep("create")
  }

  const handleCreateInvoiceDraft = () => {
    if (!invoiceDetails.client) {
      toast({ title: "Error de Validación", description: "El campo 'Cliente' es obligatorio.", variant: "destructive" })
      return
    }
    if (recordsForInvoicing.length === 0) {
      toast({ title: "Error", description: "No hay registros seleccionados.", variant: "destructive" })
      return
    }

    const draftInvoice: Invoice = {
      id: `TEMP-INV-${Date.now()}`,
      invoiceNumber: invoiceDetails.invoiceNumber,
      module: "trucking",
      client: invoiceDetails.client,
      date: invoiceDetails.date,
      currency: invoiceDetails.currency,
      records: recordsForInvoicing.map((r) => ({ ...r, id: r.id.toString() })),
      subtotal,
      tax,
      total,
      status: "borrador",
      createdAt: new Date().toISOString(),
      excelIds: selectedExcelIds,
      driver: invoiceDetails.driver,
      vehicle: invoiceDetails.vehicle,
      paymentTerms: invoiceDetails.paymentTerms,
      notes: invoiceDetails.notes,
    }
    setGeneratedInvoicePreview(draftInvoice)
    setCurrentStep("preview")
    toast({ title: "Borrador Creado", description: "Revisa los detalles." })
  }

  const handleFinalizeInvoice = async () => {
    if (!generatedInvoicePreview) return
    setIsFinalizing(true)
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000))
      const finalInvoiceId = generatedInvoicePreview.id.startsWith("TEMP-")
        ? `TRK-INV-${Date.now().toString().slice(-6)}`
        : generatedInvoicePreview.id

      const xmlData = generateInvoiceXML({
        ...generatedInvoicePreview,
        id: finalInvoiceId,
        invoiceNumber: generatedInvoicePreview.invoiceNumber,
      })

      const finalizedInvoiceData: Invoice = {
        ...generatedInvoicePreview,
        id: finalInvoiceId,
        status: "creada",
        xmlData: xmlData,
      }

      dispatch(createInvoice(finalizedInvoiceData))
      dispatch(markExcelAsProcessed(selectedExcelIds))
      const recordIdsToUpdate: string[] = selectedExcelObjects.flatMap((excelFile) =>
        excelFile.records.map((record) => `TRK-REC-${excelFile.id}-${record.id}`),
      )
      dispatch(markRecordsAsInvoiced({ recordIds: recordIdsToUpdate, invoiceId: finalInvoiceId }))

      toast({ title: "¡Factura Finalizada!", description: `${finalizedInvoiceData.invoiceNumber} creada.` })
      setSelectedExcelIds([])
      setInvoiceDetails({
        invoiceNumber: `TRK-INV-${Date.now().toString().slice(-6)}`,
        client: "",
        date: new Date().toISOString().split("T")[0],
        currency: "USD",
        driver: "",
        vehicle: "",
        paymentTerms: "NET 30",
        notes: "Servicios de transporte terrestre según detalle.",
      })
      setGeneratedInvoicePreview(null)
      setCurrentStep("select") // Go back to select step to see the new invoice in the list
    } catch (error) {
      console.error("Error finalizing invoice:", error)
      toast({ title: "Error al Finalizar", description: "No se pudo finalizar.", variant: "destructive" })
    } finally {
      setIsFinalizing(false)
    }
  }

  const handleViewXmlOfExisting = (invoice: Invoice) => {
    if (invoice.xmlData) {
      setXmlContent(invoice.xmlData)
      setShowXmlModal(true)
    } else {
      // Generate on the fly if somehow missing (shouldn't happen for 'creada' status)
      const tempXml = generateInvoiceXML(invoice)
      setXmlContent(tempXml)
      setShowXmlModal(true)
      toast({ title: "XML Generado al Vuelo", description: "El XML no estaba pre-guardado." })
    }
  }

  const handleViewInvoiceDetails = (invoice: Invoice) => {
    setInvoiceToView(invoice)
    // setShowInvoiceDetailModal(true); // You'll need a new modal for this
  }

  // Step 1: Select Excel Files & View Existing Invoices
  if (currentStep === "select") {
    return (
      <div className="p-6 space-y-8">
        <div className="flex items-center gap-3">
          <Truck className="h-8 w-8 text-blue-500" />
          <div>
            <h1 className="text-3xl font-bold">Facturación - Trucking</h1>
            <p className="text-muted-foreground">Selecciona Excel para nueva factura o gestiona existentes.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Stats Cards */}
          <Card>
            <CardContent className="p-4">
              <p className="text-sm font-medium text-muted-foreground">Excel Pendientes</p>
              <p className="text-2xl font-bold">{availableExcelsForInvoicing.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm font-medium text-muted-foreground">Facturas Creadas (Trucking)</p>
              <p className="text-2xl font-bold">{truckingInvoices.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm font-medium text-muted-foreground">Excel Seleccionados</p>
              <p className="text-2xl font-bold">{selectedExcelIds.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm font-medium text-muted-foreground">Total Estimado (Nueva)</p>
              <p className="text-2xl font-bold">${total.toFixed(2)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Section to Create New Invoice */}
        <Card>
          <CardHeader>
            <CardTitle>Crear Nueva Factura</CardTitle>
            <CardDescription>
              Selecciona uno o más archivos Excel pendientes para generar una nueva factura.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {availableExcelsForInvoicing.length === 0 ? (
              <Alert variant="default">
                <FileWarning className="h-4 w-4" />
                <AlertTitle>No hay Excel pendientes</AlertTitle>
                <AlertDescription>
                  Sube nuevos archivos en "Subir Excel - Trucking" para poder facturarlos.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                {availableExcelsForInvoicing.map((excel) => (
                  <Card
                    key={excel.id}
                    className={`p-3 border rounded-lg transition-all ${selectedExcelIds.includes(excel.id) ? "border-primary ring-1 ring-primary" : "hover:shadow-sm"}`}
                  >
                    <div className="flex items-start space-x-3">
                      <Checkbox
                        id={`excel-${excel.id}`}
                        checked={selectedExcelIds.includes(excel.id)}
                        onCheckedChange={(checked) => handleExcelSelectionChange(excel.id, checked)}
                        className="mt-1"
                      />
                      <Label htmlFor={`excel-${excel.id}`} className="flex-1 cursor-pointer">
                        <div className="flex justify-between items-center">
                          <span className="font-medium">{excel.filename}</span>
                          <Badge variant={excel.status === "pendiente" ? "warning" : "default"}>{excel.status}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Subido: {new Date(excel.uploadDate).toLocaleDateString()} | {excel.records.length} registros |
                          Valor: ${excel.totalValue?.toFixed(2) || "0.00"}
                        </p>
                      </Label>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
          {availableExcelsForInvoicing.length > 0 && (
            <CardFooter className="border-t pt-4">
              <Button
                onClick={proceedToCreateStep}
                disabled={selectedExcelIds.length === 0}
                className="w-full md:w-auto ml-auto"
              >
                Continuar a Detalles de Factura ({selectedExcelIds.length} Excel sel.) <Plus className="ml-2 h-4 w-4" />
              </Button>
            </CardFooter>
          )}
        </Card>

        {/* Section to List Existing Invoices */}
        <Card>
          <CardHeader>
            <CardTitle>Facturas de Trucking Existentes</CardTitle>
            <CardDescription>Lista de todas las facturas generadas para el módulo de Trucking.</CardDescription>
          </CardHeader>
          <CardContent>
            {truckingInvoices.length === 0 ? (
              <Alert variant="default">
                <FileWarning className="h-4 w-4" />
                <AlertTitle>No hay facturas creadas</AlertTitle>
                <AlertDescription>Aún no se han generado facturas para el módulo de Trucking.</AlertDescription>
              </Alert>
            ) : (
              <div className="max-h-[400px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead># Factura</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-center">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {truckingInvoices.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                        <TableCell>{invoice.client}</TableCell>
                        <TableCell>{new Date(invoice.date).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">
                          ${invoice.total.toFixed(2)} {invoice.currency}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              invoice.status === "creada"
                                ? "success"
                                : invoice.status === "borrador"
                                  ? "warning"
                                  : "default"
                            }
                          >
                            {invoice.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center space-x-1">
                          <Dialog>
                            {" "}
                            {/* Wrap button in Dialog for viewing details */}
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="icon" onClick={() => handleViewInvoiceDetails(invoice)}>
                                <Eye className="h-4 w-4" />
                                <span className="sr-only">Ver Detalles</span>
                              </Button>
                            </DialogTrigger>
                            {/* Content for this dialog will be in the new InvoiceDetailModal */}
                          </Dialog>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleViewXmlOfExisting(invoice)}
                            title="Ver XML"
                          >
                            <FileText className="h-4 w-4" />
                            <span className="sr-only">Ver XML</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => toast({ title: "Simulación", description: "Descarga PDF simulada." })}
                            title="Descargar PDF"
                          >
                            <Download className="h-4 w-4" />
                            <span className="sr-only">Descargar PDF</span>
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
        {/* Modal for Viewing Invoice Details */}
        {invoiceToView && (
          <Dialog open={!!invoiceToView} onOpenChange={() => setInvoiceToView(null)}>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>Detalle Factura #{invoiceToView.invoiceNumber}</DialogTitle>
                <DialogDescription>
                  Cliente: {invoiceToView.client} - Fecha: {new Date(invoiceToView.date).toLocaleDateString()}
                </DialogDescription>
              </DialogHeader>
              <div className="mt-4 space-y-4 max-h-[70vh] overflow-y-auto p-1">
                <div className="grid md:grid-cols-2 gap-4 p-3 border rounded-lg bg-muted/30">
                  <div>
                    <h4 className="font-semibold text-sm">DE:</h4>
                    <p className="text-xs">Trucking Services Panama Demo</p>
                    <p className="text-xs">Edificio Inteligente, Piso 20, Ciudad de Panamá</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm">PARA:</h4>
                    <p className="text-xs font-medium">{invoiceToView.client}</p>
                    <p className="text-xs">Términos: {invoiceToView.paymentTerms}</p>
                  </div>
                </div>
                <h4 className="font-semibold">Servicios Incluidos:</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Fecha</TableHead>
                      <TableHead className="text-xs">Desde/Hacia</TableHead>
                      <TableHead className="text-xs">Contenedor</TableHead>
                      <TableHead className="text-xs text-right">Monto</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoiceToView.records.map((record, index) => {
                      const recData = record as TruckingRecordData
                      return (
                        <TableRow key={recData.uniqueDisplayId || index}>
                          <TableCell className="text-xs">{recData.fecha}</TableCell>
                          <TableCell className="text-xs">
                            {recData.desde} → {recData.hacia}
                          </TableCell>
                          <TableCell className="text-xs">
                            {recData.contenedor} ({recData.tamaño})
                          </TableCell>
                          <TableCell className="text-xs text-right">${(recData.totalRate || 0).toFixed(2)}</TableCell>
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
                      <span>ITBMS (7%):</span> <span>${invoiceToView.tax.toFixed(2)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-bold">
                      <span>TOTAL:</span>{" "}
                      <span>
                        ${invoiceToView.total.toFixed(2)} {invoiceToView.currency}
                      </span>
                    </div>
                  </div>
                </div>
                {invoiceToView.notes && (
                  <p className="text-xs text-muted-foreground border-t pt-2 mt-2">Notas: {invoiceToView.notes}</p>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setInvoiceToView(null)}>
                  Cerrar
                </Button>
                <Button
                  onClick={() => {
                    handleViewXmlOfExisting(invoiceToView)
                    setInvoiceToView(null)
                  }}
                >
                  Ver XML
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* XML Preview Modal (reused) */}
        <Dialog open={showXmlModal} onOpenChange={setShowXmlModal}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Vista Previa del XML de Factura</DialogTitle>
            </DialogHeader>
            <div className="mt-4 max-h-[60vh] overflow-y-auto rounded-md bg-muted p-4">
              <pre className="text-sm whitespace-pre-wrap break-all">
                <code>{xmlContent}</code>
              </pre>
            </div>
            <DialogFooter>
              <Button onClick={() => setShowXmlModal(false)}>Cerrar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  // Step 2: Create Invoice Details (Copied from previous version, ensure consistency)
  if (currentStep === "create") {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-3 mb-6">
          <Truck className="h-8 w-8 text-blue-500" />
          <div>
            <h1 className="text-3xl font-bold">Crear Factura - Trucking (Paso 2 de 3)</h1>
            <p className="text-muted-foreground">Completa los detalles de la factura y revisa los servicios.</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Información de la Factura</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="invoice-number">Número de Factura</Label>
                  <Input
                    id="invoice-number"
                    value={invoiceDetails.invoiceNumber}
                    onChange={(e) => setInvoiceDetails({ ...invoiceDetails, invoiceNumber: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="date">Fecha de Factura</Label>
                  <Input
                    id="date"
                    type="date"
                    value={invoiceDetails.date}
                    onChange={(e) => setInvoiceDetails({ ...invoiceDetails, date: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="client">Cliente *</Label>
                  <Select
                    value={invoiceDetails.client}
                    onValueChange={(value) => setInvoiceDetails({ ...invoiceDetails, client: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      {[...new Set(recordsForInvoicing.map((r) => r.cliente))].map((clientName) => (
                        <SelectItem key={clientName} value={clientName}>
                          {clientName}
                        </SelectItem>
                      ))}
                      <SelectItem value="Otro Cliente">Otro Cliente (Especificar)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="currency">Moneda</Label>
                  <Select
                    value={invoiceDetails.currency}
                    onValueChange={(value) => setInvoiceDetails({ ...invoiceDetails, currency: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD - Dólar Estadounidense</SelectItem>
                      <SelectItem value="PAB">PAB - Balboa Panameño</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="driver">Driver Principal (Opcional)</Label>
                  <Input
                    id="driver"
                    value={invoiceDetails.driver}
                    onChange={(e) => setInvoiceDetails({ ...invoiceDetails, driver: e.target.value })}
                    placeholder="Nombre del conductor"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="vehicle">Vehículo (Opcional)</Label>
                  <Input
                    id="vehicle"
                    value={invoiceDetails.vehicle}
                    onChange={(e) => setInvoiceDetails({ ...invoiceDetails, vehicle: e.target.value })}
                    placeholder="Placa o ID del vehículo"
                  />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <Label htmlFor="paymentTerms">Términos de Pago</Label>
                  <Input
                    id="paymentTerms"
                    value={invoiceDetails.paymentTerms}
                    onChange={(e) => setInvoiceDetails({ ...invoiceDetails, paymentTerms: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <Label htmlFor="notes">Notas Adicionales</Label>
                  <Input
                    id="notes"
                    value={invoiceDetails.notes}
                    onChange={(e) => setInvoiceDetails({ ...invoiceDetails, notes: e.target.value })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Resumen Financiero</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span> <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>ITBMS (7%):</span> <span>${tax.toFixed(2)}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-bold text-lg">
                  <span>TOTAL:</span>{" "}
                  <span>
                    ${total.toFixed(2)} {invoiceDetails.currency}
                  </span>
                </div>
              </CardContent>
            </Card>
            <Button onClick={handleCreateInvoiceDraft} className="w-full" size="lg">
              Continuar al Paso 3: Vista Previa
            </Button>
            <Button onClick={() => setCurrentStep("select")} variant="outline" className="w-full">
              Volver a Selección de Excel
            </Button>
          </div>
        </div>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Servicios Incluidos ({recordsForInvoicing.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {recordsForInvoicing.length > 0 ? (
              <div className="max-h-[400px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Desde/Hacia</TableHead>
                      <TableHead>Contenedor</TableHead>
                      <TableHead className="text-right">Total Servicio</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recordsForInvoicing.map((record) => (
                      <TableRow key={record.uniqueDisplayId}>
                        <TableCell>{record.fecha}</TableCell>
                        <TableCell>{record.cliente}</TableCell>
                        <TableCell>
                          {record.desde} → {record.hacia}
                        </TableCell>
                        <TableCell>
                          {record.contenedor} ({record.tamaño})
                        </TableCell>
                        <TableCell className="text-right">${record.totalRate.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-muted-foreground">No hay servicios para mostrar.</p>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  // Step 3: Preview and Finalize Invoice (Copied from previous version, ensure consistency)
  if (currentStep === "preview" && generatedInvoicePreview) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-3 mb-6">
          <Truck className="h-8 w-8 text-blue-500" />
          <div>
            <h1 className="text-3xl font-bold">Crear Factura - Trucking (Paso 3 de 3)</h1>
            <p className="text-muted-foreground">Revisa la factura y finaliza para guardarla.</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row justify-between items-center">
              <CardTitle>Factura #{generatedInvoicePreview.invoiceNumber}</CardTitle>
              <Badge variant={generatedInvoicePreview.status === "borrador" ? "warning" : "success"}>
                {generatedInvoicePreview.status}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6 p-4 border rounded-lg">
                <div>
                  <h3 className="font-semibold text-sm text-muted-foreground">DE:</h3>
                  <p>Trucking Services Panama Demo</p>
                  <p>Edificio Inteligente, Piso 20</p>
                  <p>Ciudad de Panamá, Panamá</p>
                  <p>RUC: 123456-7-890123 DV 45</p>
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-muted-foreground">PARA:</h3>
                  <p className="font-semibold">{generatedInvoicePreview.client}</p>
                  <p>Fecha: {new Date(generatedInvoicePreview.date).toLocaleDateString()}</p>
                  <p>Moneda: {generatedInvoicePreview.currency}</p>
                  <p>Términos: {generatedInvoicePreview.paymentTerms}</p>
                </div>
              </div>
              <Separator />
              <h3 className="font-semibold">Detalle de Servicios:</h3>
              <div className="max-h-[300px] overflow-y-auto border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Desde/Hacia</TableHead>
                      <TableHead>Contenedor</TableHead>
                      <TableHead className="text-right">Monto</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {generatedInvoicePreview.records.map((record, index) => {
                      const recData = record as TruckingRecordData
                      return (
                        <TableRow key={recData.uniqueDisplayId || index}>
                          <TableCell>{recData.fecha}</TableCell>
                          <TableCell>
                            {recData.desde} → {recData.hacia}
                          </TableCell>
                          <TableCell>
                            {recData.contenedor} ({recData.tamaño})
                          </TableCell>
                          <TableCell className="text-right">${recData.totalRate.toFixed(2)}</TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
              <Separator />
              <div className="flex justify-end">
                <div className="w-full max-w-xs space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal:</span> <span>${generatedInvoicePreview.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>ITBMS (7%):</span> <span>${generatedInvoicePreview.tax.toFixed(2)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-bold text-xl">
                    <span>TOTAL:</span>{" "}
                    <span>
                      ${generatedInvoicePreview.total.toFixed(2)} {generatedInvoicePreview.currency}
                    </span>
                  </div>
                </div>
              </div>
              {generatedInvoicePreview.notes && (
                <>
                  <Separator />
                  <div>
                    <h4 className="font-semibold text-sm">Notas:</h4>
                    <p className="text-sm text-muted-foreground">{generatedInvoicePreview.notes}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Acciones de Factura</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button onClick={handleFinalizeInvoice} className="w-full" disabled={isFinalizing} size="lg">
                  {isFinalizing ? <Check className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                  {isFinalizing ? "Finalizando..." : "Finalizar y Guardar Factura"}
                </Button>
                <Button onClick={() => setCurrentStep("create")} variant="outline" className="w-full">
                  <Edit2 className="mr-2 h-4 w-4" /> Volver a Editar Detalles
                </Button>
                <Separator className="my-3" />
                <Button
                  onClick={() => handleViewXmlOfExisting(generatedInvoicePreview)}
                  variant="secondary"
                  className="w-full"
                >
                  <FileText className="mr-2 h-4 w-4" /> Ver XML Generado
                </Button>
                <Button
                  onClick={() => toast({ title: "Simulación", description: "Descarga PDF simulada." })}
                  variant="outline"
                  className="w-full"
                >
                  <Download className="mr-2 h-4 w-4" /> Descargar PDF (Sim)
                </Button>
                <Button
                  onClick={() => toast({ title: "Simulación", description: "Envío por email simulado." })}
                  variant="outline"
                  className="w-full"
                >
                  <Mail className="mr-2 h-4 w-4" /> Enviar por Email (Sim)
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <p>Cargando estado de facturación...</p>
    </div>
  )
}
