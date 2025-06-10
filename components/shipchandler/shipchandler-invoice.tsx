"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Ship, FileText, Plus, Check, Download, Mail } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import { useAppDispatch, useAppSelector } from "@/lib/hooks"
import {
  createInvoice,
  finalizeInvoice as finalizeInvoiceAction,
  setCurrentInvoice,
  type Invoice,
  type InvoiceRecord,
} from "@/lib/features/invoice/invoiceSlice"
import { markExcelAsProcessed } from "@/lib/features/excel/excelSlice"
import { markRecordsAsInvoiced } from "@/lib/features/records/recordsSlice"
import { generateInvoiceXML } from "@/lib/xml-generator"
import { useRouter } from "next/navigation" // Para redirección

// Mock data de Excel cargados
const mockExcelData = [
  {
    id: "excel-1",
    filename: "supply_orders_enero.xlsx",
    uploadDate: "2024-01-15",
    status: "pendiente",
    type: "supply-order",
    records: [
      {
        id: 1,
        vesselName: "MSC LUDOVICA",
        vesselIMO: "9876543",
        eta: "2024-01-15 08:00",
        productCode: "FUEL001",
        productName: "Marine Gas Oil",
        quantity: 500,
        unit: "MT",
        unitPrice: 850.0,
        totalPrice: 425000.0,
        supplier: "Marine Fuel Supply Co.",
        deliveryDate: "2024-01-15",
      },
      {
        id: 2,
        vesselName: "MSC LUDOVICA",
        vesselIMO: "9876543",
        eta: "2024-01-15 08:00",
        productCode: "WATER001",
        productName: "Fresh Water",
        quantity: 200,
        unit: "MT",
        unitPrice: 15.0,
        totalPrice: 3000.0,
        supplier: "Panama Water Supply",
        deliveryDate: "2024-01-15",
      },
    ],
  },
  {
    id: "excel-2",
    filename: "supply_orders_febrero.xlsx",
    uploadDate: "2024-02-01",
    status: "pendiente",
    type: "supply-order",
    records: [
      {
        id: 3,
        vesselName: "EVER GIVEN",
        vesselIMO: "9811000",
        eta: "2024-02-01 14:00",
        productCode: "FOOD001",
        productName: "Fresh Provisions",
        quantity: 150,
        unit: "Kg",
        unitPrice: 8.5,
        totalPrice: 1275.0,
        supplier: "Fresh Food Distributors",
        deliveryDate: "2024-02-01",
      },
    ],
  },
]

export function ShipchandlerInvoice() {
  const dispatch = useAppDispatch()
  const router = useRouter()
  const allExcelFiles = useAppSelector((state) => state.excel.files)
  const availableExcels = allExcelFiles.filter(
    (excel) => excel.module === "shipchandler" && excel.status === "pendiente",
  )
  const currentInvoiceDraft = useAppSelector((state) => state.invoice.currentInvoice)

  // Adaptar selectedExcels y selectedRecords para que se basen en IDs y se obtengan del store
  const [selectedExcels, setSelectedExcels] = useState<string[]>([]) // Mantener para IDs
  const [selectedRecords, setSelectedRecords] = useState<InvoiceRecord[]>([]) // Para los datos de los records

  // Reemplazar generatedInvoice con currentInvoiceDraft de Redux
  // const [generatedInvoice, setGeneratedInvoice] = useState<any>(null)
  const [invoiceData, setInvoiceData] = useState({
    invoiceNumber: `SC-${Date.now().toString().slice(-6)}`,
    client: "",
    vesselName: "",
    vesselIMO: "",
    date: new Date().toISOString().split("T")[0],
    eta: "",
    etd: "",
    currency: "USD",
    agent: "",
    captain: "",
  })
  const [currentStep, setCurrentStep] = useState<"select" | "create" | "preview">("select")
  // const [generatedInvoice, setGeneratedInvoice] = useState<any>(null)
  const { toast } = useToast()

  // const availableExcels = mockExcelData.filter((excel) => excel.status === "pendiente")

  const handleExcelSelection = (excelId: string, checked: boolean) => {
    let updatedSelectedExcelIds = [...selectedExcels]
    if (checked) {
      updatedSelectedExcelIds.push(excelId)
    } else {
      updatedSelectedExcelIds = updatedSelectedExcelIds.filter((id) => id !== excelId)
    }
    setSelectedExcels(updatedSelectedExcelIds)

    // Actualizar selectedRecordsData basado en los Excel seleccionados del store
    const newSelectedRecords: InvoiceRecord[] = []
    updatedSelectedExcelIds.forEach((id) => {
      const excelFile = allExcelFiles.find((ef) => ef.id === id)
      if (excelFile) {
        newSelectedRecords.push(...excelFile.records.map((r) => ({ ...r, excelId: id }))) // Añadir excelId para referencia
      }
    })
    setSelectedRecords(newSelectedRecords) // setSelectedRecords ahora maneja InvoiceRecord[]

    // Auto-fill (si es necesario, adaptar para tomar del primer excel seleccionado)
    if (checked && updatedSelectedExcelIds.length > 0) {
      const firstSelectedExcelId = updatedSelectedExcelIds[0]
      const excel = allExcelFiles.find((e) => e.id === firstSelectedExcelId)
      if (excel && excel.records.length > 0) {
        const firstRecord = excel.records[0]
        setInvoiceData((prev) => ({
          ...prev,
          vesselName: firstRecord.vesselName,
          vesselIMO: firstRecord.vesselIMO,
          eta: firstRecord.eta,
        }))
      }
    }
  }

  const handleRecordSelection = (recordId: string | number, excelFileId: string, checked: boolean) => {
    // Esta función necesitará una lógica más compleja si se permite deseleccionar records individuales
    // de múltiples Excels. Por simplicidad, podríamos asumir que si un Excel es seleccionado, todos sus records lo son.
    // Si se requiere selección granular:
    if (checked) {
      const excel = allExcelFiles.find((e) => e.id === excelFileId)
      const record = excel?.records.find((r) => r.id === recordId)
      if (record) {
        setSelectedRecords((prev) => [...prev, { ...record, excelId: excelFileId }])
      }
    } else {
      setSelectedRecords((prev) => prev.filter((r) => !(r.id === recordId && r.excelId === excelFileId)))
    }
  }

  const subtotal = selectedRecords.reduce((sum, record) => sum + record.totalPrice, 0)
  const tax = subtotal * 0.07
  const total = subtotal + tax

  const handleCreateInvoice = () => {
    if (selectedRecords.length === 0) {
      toast({
        title: "Error",
        description: "Debes seleccionar al menos un registro para crear la factura",
        variant: "destructive",
      })
      return
    }

    if (!invoiceData.client) {
      toast({
        title: "Error",
        description: "Debes seleccionar un cliente",
        variant: "destructive",
      })
      return
    }

    const newInvoice: Invoice = {
      id: `INV-SHIP-${Date.now()}`,
      invoiceNumber: invoiceData.invoiceNumber,
      module: "shipchandler",
      client: invoiceData.client,
      date: invoiceData.date,
      currency: invoiceData.currency,
      records: selectedRecords, // selectedRecords ahora es InvoiceRecord[]
      subtotal,
      tax,
      total,
      status: "borrador",
      createdAt: new Date().toISOString(),
      excelIds: selectedExcels,
      vesselName: invoiceData.vesselName,
      vesselIMO: invoiceData.vesselIMO,
      eta: invoiceData.eta,
      etd: invoiceData.etd,
      agent: invoiceData.agent,
      captain: invoiceData.captain,
    }

    dispatch(createInvoice(newInvoice))
    // setGeneratedInvoice(invoice) // No longer needed, use currentInvoiceDraft from Redux
    setCurrentStep("preview")
    toast({
      title: "Factura Creada",
      description: `Factura ${invoiceData.invoiceNumber} creada exitosamente`,
    })
  }

  const handleFinalizeInvoice = () => {
    if (!currentInvoiceDraft) {
      toast({ title: "Error", description: "No hay factura borrador para finalizar.", variant: "destructive" })
      return
    }
    const xmlData = generateInvoiceXML(currentInvoiceDraft)
    dispatch(finalizeInvoiceAction({ id: currentInvoiceDraft.id, xmlData }))
    dispatch(markExcelAsProcessed(currentInvoiceDraft.excelIds))

    // Marcar ServiceRecords como facturados
    const recordIdsToMark: string[] = []
    currentInvoiceDraft.excelIds.forEach((excelId) => {
      const excel = allExcelFiles.find((f) => f.id === excelId)
      excel?.records.forEach((rec) => {
        recordIdsToMark.push(`service-${rec.id}`) // Asumiendo que el ID del serviceRecord es `service-${excelRecord.id}`
      })
    })
    dispatch(markRecordsAsInvoiced({ recordIds: recordIdsToMark, invoiceId: currentInvoiceDraft.id }))

    toast({
      title: "Factura Finalizada",
      description: "La factura ha sido generada y los Excel marcados como procesados",
    })

    // Reset
    setSelectedExcels([])
    setSelectedRecords([])
    dispatch(setCurrentInvoice(null)) // Limpiar borrador actual
    setCurrentStep("select")
    // setGeneratedInvoice(null) // No longer needed
    router.push("/shipchandler/records") // O la ruta de registros de shipchandler
  }

  const handleDownloadPDF = () => {
    toast({
      title: "Descargando PDF",
      description: "La factura en PDF se está descargando...",
    })
  }

  const handleDownloadExcel = () => {
    toast({
      title: "Descargando Excel",
      description: "La factura en Excel se está descargando...",
    })
  }

  const handleSendEmail = () => {
    toast({
      title: "Enviando Email",
      description: "La factura ha sido enviada por correo electrónico",
    })
  }

  const handleDownloadXML = () => {
    if (currentInvoiceDraft && currentInvoiceDraft.xmlData) {
      const blob = new Blob([currentInvoiceDraft.xmlData], { type: "application/xml" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${currentInvoiceDraft.invoiceNumber}.xml`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast({ title: "XML Descargado", description: `Factura ${currentInvoiceDraft.invoiceNumber}.xml descargada.` })
    } else {
      toast({ title: "Error", description: "No hay datos XML para descargar.", variant: "destructive" })
    }
  }

  if (currentStep === "preview" && currentInvoiceDraft) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-green-500 flex items-center justify-center">
            <Ship className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Vista Previa - Factura Shipchandler</h1>
            <p className="text-muted-foreground">Revisa y finaliza tu factura</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          <Card className="col-span-2">
            <CardHeader>
              <CardTitle>Factura {currentInvoiceDraft?.invoiceNumber}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold">Información de la Empresa</h3>
                  <p>Shipchandler Services Panama</p>
                  <p>Puerto de Balboa, Panamá</p>
                  <p>Tel: (507) 123-4567</p>
                </div>
                <div>
                  <h3 className="font-semibold">Facturar a:</h3>
                  <p>{currentInvoiceDraft.client}</p>
                  <p>Fecha: {new Date(currentInvoiceDraft.date).toLocaleDateString()}</p>
                  <p>Moneda: {currentInvoiceDraft.currency}</p>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold">Información del Buque</h3>
                  <p>Buque: {currentInvoiceDraft.vesselName}</p>
                  <p>IMO: {currentInvoiceDraft.vesselIMO}</p>
                  <p>ETA: {currentInvoiceDraft.eta ? new Date(currentInvoiceDraft.eta).toLocaleString() : "N/A"}</p>
                </div>
                <div>
                  <h3 className="font-semibold">Detalles Adicionales</h3>
                  <p>Agente: {currentInvoiceDraft.agent || "N/A"}</p>
                  <p>Capitán: {currentInvoiceDraft.captain || "N/A"}</p>
                  <p>ETD: {currentInvoiceDraft.etd ? new Date(currentInvoiceDraft.etd).toLocaleString() : "N/A"}</p>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="font-semibold mb-4">Suministros y Servicios</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Producto</TableHead>
                      <TableHead>Cantidad</TableHead>
                      <TableHead>Unidad</TableHead>
                      <TableHead>Precio Unit.</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Proveedor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentInvoiceDraft.records.map((record: any) => (
                      <TableRow key={record.id}>
                        <TableCell>{record.productCode}</TableCell>
                        <TableCell>{record.productName}</TableCell>
                        <TableCell>{record.quantity}</TableCell>
                        <TableCell>{record.unit}</TableCell>
                        <TableCell>${record.unitPrice}</TableCell>
                        <TableCell>${record.totalPrice.toFixed(2)}</TableCell>
                        <TableCell>{record.supplier}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <Separator />

              <div className="flex justify-end">
                <div className="w-64 space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>${currentInvoiceDraft.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>ITBMS (7%):</span>
                    <span>${currentInvoiceDraft.tax.toFixed(2)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-bold text-lg">
                    <span>TOTAL:</span>
                    <span>
                      ${currentInvoiceDraft.total.toFixed(2)} {currentInvoiceDraft.currency}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Acciones</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button onClick={handleDownloadPDF} className="w-full">
                  <FileText className="mr-2 h-4 w-4" />
                  Descargar PDF
                </Button>
                <Button onClick={handleDownloadExcel} variant="outline" className="w-full">
                  <Download className="mr-2 h-4 w-4" />
                  Descargar Excel
                </Button>
                <Button onClick={handleSendEmail} variant="outline" className="w-full">
                  <Mail className="mr-2 h-4 w-4" />
                  Enviar por Email
                </Button>
                <Button
                  onClick={handleDownloadXML}
                  variant="outline"
                  className="w-full"
                  disabled={!currentInvoiceDraft?.xmlData}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Descargar XML
                </Button>
                <Separator />
                <Button onClick={handleFinalizeInvoice} className="w-full" variant="default">
                  <Check className="mr-2 h-4 w-4" />
                  Finalizar Factura
                </Button>
                <Button onClick={() => setCurrentStep("create")} variant="ghost" className="w-full">
                  Volver a Editar
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Resumen</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span>Suministros:</span>
                  <span>{currentInvoiceDraft.records.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Buque:</span>
                  <span>{currentInvoiceDraft.vesselName}</span>
                </div>
                <div className="flex justify-between">
                  <span>Cliente:</span>
                  <span>{currentInvoiceDraft.client}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  if (currentStep === "create") {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-green-500 flex items-center justify-center">
            <Ship className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Crear Factura - Shipchandler</h1>
            <p className="text-muted-foreground">Configura los detalles de la factura</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          <Card className="col-span-2">
            <CardHeader>
              <CardTitle>Detalles de la Factura</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="header" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="header">Encabezado</TabsTrigger>
                  <TabsTrigger value="vessel">Buque</TabsTrigger>
                </TabsList>

                <TabsContent value="header" className="space-y-4 pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="invoice-number">Número de Factura</Label>
                      <Input
                        id="invoice-number"
                        value={invoiceData.invoiceNumber}
                        onChange={(e) => setInvoiceData({ ...invoiceData, invoiceNumber: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="date">Fecha</Label>
                      <Input
                        id="date"
                        type="date"
                        value={invoiceData.date}
                        onChange={(e) => setInvoiceData({ ...invoiceData, date: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="client">Cliente/Agente *</Label>
                      <Select
                        value={invoiceData.client}
                        onValueChange={(value) => setInvoiceData({ ...invoiceData, client: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar cliente" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MSC Agency Panama">MSC Agency Panama</SelectItem>
                          <SelectItem value="Maersk Line Agency">Maersk Line Agency</SelectItem>
                          <SelectItem value="Evergreen Agency">Evergreen Agency</SelectItem>
                          <SelectItem value="CMA CGM Agency">CMA CGM Agency</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="currency">Moneda</Label>
                      <Select
                        value={invoiceData.currency}
                        onValueChange={(value) => setInvoiceData({ ...invoiceData, currency: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar moneda" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="USD">USD - Dólar Estadounidense</SelectItem>
                          <SelectItem value="EUR">EUR - Euro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="vessel" className="space-y-4 pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="vessel-name">Nombre del Buque</Label>
                      <Input
                        id="vessel-name"
                        value={invoiceData.vesselName}
                        onChange={(e) => setInvoiceData({ ...invoiceData, vesselName: e.target.value })}
                        placeholder="Ej: MSC LUDOVICA"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="vessel-imo">IMO del Buque</Label>
                      <Input
                        id="vessel-imo"
                        value={invoiceData.vesselIMO}
                        onChange={(e) => setInvoiceData({ ...invoiceData, vesselIMO: e.target.value })}
                        placeholder="Ej: 9876543"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="eta">ETA</Label>
                      <Input
                        id="eta"
                        type="datetime-local"
                        value={invoiceData.eta}
                        onChange={(e) => setInvoiceData({ ...invoiceData, eta: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="etd">ETD</Label>
                      <Input
                        id="etd"
                        type="datetime-local"
                        value={invoiceData.etd}
                        onChange={(e) => setInvoiceData({ ...invoiceData, etd: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="agent">Agente del Buque</Label>
                      <Input
                        id="agent"
                        value={invoiceData.agent}
                        onChange={(e) => setInvoiceData({ ...invoiceData, agent: e.target.value })}
                        placeholder="Nombre del agente"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="captain">Capitán</Label>
                      <Input
                        id="captain"
                        value={invoiceData.captain}
                        onChange={(e) => setInvoiceData({ ...invoiceData, captain: e.target.value })}
                        placeholder="Nombre del capitán"
                      />
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              <Separator className="my-6" />

              <div>
                <h3 className="text-lg font-medium mb-4">Suministros Seleccionados ({selectedRecords.length})</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Producto</TableHead>
                      <TableHead>Cantidad</TableHead>
                      <TableHead>Precio Unit.</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Proveedor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedRecords.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell>{record.productCode}</TableCell>
                        <TableCell>{record.productName}</TableCell>
                        <TableCell>
                          {record.quantity} {record.unit}
                        </TableCell>
                        <TableCell>${record.unitPrice}</TableCell>
                        <TableCell>${record.totalPrice.toFixed(2)}</TableCell>
                        <TableCell>{record.supplier}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Resumen de Factura</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>
                      ${subtotal.toFixed(2)} {invoiceData.currency}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>ITBMS (7%):</span>
                    <span>
                      ${tax.toFixed(2)} {invoiceData.currency}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-bold">
                    <span>TOTAL:</span>
                    <span>
                      ${total.toFixed(2)} {invoiceData.currency}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Acciones</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button onClick={handleCreateInvoice} className="w-full">
                  <FileText className="mr-2 h-4 w-4" />
                  Crear Factura
                </Button>
                <Button onClick={() => setCurrentStep("select")} variant="outline" className="w-full">
                  Volver a Selección
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-green-500 flex items-center justify-center">
          <Ship className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Crear Factura - Shipchandler</h1>
          <p className="text-muted-foreground">Selecciona los Excel y registros para facturar</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Excel Disponibles para Facturación</CardTitle>
            <p className="text-sm text-muted-foreground">Solo se muestran los Excel con estado "pendiente"</p>
          </CardHeader>
          <CardContent>
            {availableExcels.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No hay Excel pendientes para facturar</p>
                <Button variant="outline" className="mt-4">
                  Ir a Subir Excel
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {availableExcels.map((excel) => (
                  <Card key={excel.id} className="border-2">
                    <CardHeader>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={excel.id}
                          checked={selectedExcels.includes(excel.id)}
                          onCheckedChange={(checked) => handleExcelSelection(excel.id, checked as boolean)}
                        />
                        <div className="flex-1">
                          <h3 className="font-medium">{excel.filename}</h3>
                          <p className="text-sm text-muted-foreground">
                            Subido: {new Date(excel.uploadDate).toLocaleDateString()} • {excel.records.length} registros
                            • Tipo: {excel.type}
                          </p>
                        </div>
                        <Badge variant="outline">{excel.status}</Badge>
                      </div>
                    </CardHeader>
                    {selectedExcels.includes(excel.id) && (
                      <CardContent>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-12">Sel.</TableHead>
                              <TableHead>Buque</TableHead>
                              <TableHead>Producto</TableHead>
                              <TableHead>Cantidad</TableHead>
                              <TableHead>Precio Unit.</TableHead>
                              <TableHead>Total</TableHead>
                              <TableHead>Proveedor</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {excel.records.map((record) => (
                              <TableRow key={record.id}>
                                <TableCell>
                                  <Checkbox
                                    checked={selectedRecords.some((r) => r.id === record.id)}
                                    onCheckedChange={(checked) =>
                                      handleRecordSelection(record.id, excel.id, checked as boolean)
                                    }
                                  />
                                </TableCell>
                                <TableCell>{record.vesselName}</TableCell>
                                <TableCell>{record.productName}</TableCell>
                                <TableCell>
                                  {record.quantity} {record.unit}
                                </TableCell>
                                <TableCell>${record.unitPrice}</TableCell>
                                <TableCell>${record.totalPrice.toFixed(2)}</TableCell>
                                <TableCell>{record.supplier}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {selectedRecords.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Resumen de Selección</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center">
                <div>
                  <p>
                    Suministros seleccionados: <strong>{selectedRecords.length}</strong>
                  </p>
                  <p>
                    Total estimado: <strong>${total.toFixed(2)} USD</strong>
                  </p>
                </div>
                <Button onClick={() => setCurrentStep("create")}>
                  <Plus className="mr-2 h-4 w-4" />
                  Continuar con Factura
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
