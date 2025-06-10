"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Users, FileText, Plus, Check, Download, Mail } from "lucide-react"
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
import { useRouter } from "next/navigation"

// Mock data de Excel cargados
const mockExcelData = [
  {
    id: "excel-1",
    filename: "crew_transport_enero.xlsx",
    uploadDate: "2024-01-15",
    status: "pendiente",
    type: "crew-transport",
    records: [
      {
        id: 1,
        vesselName: "MSC LUDOVICA",
        voyage: "FR423W",
        crewMember: "ALMEIDA ALLISTER VINSON",
        rank: "THIRD ENGINEER",
        nationality: "INDIA",
        pickupLocation: "Aeropuerto Tocumen",
        dropoffLocation: "Puerto de Balboa",
        pickupTime: "09:00",
        vehicleType: "Sedan",
        baseRate: 25.0,
        rankSurcharge: 10,
        totalRate: 27.5,
      },
      {
        id: 2,
        vesselName: "MSC LUDOVICA",
        voyage: "FR423W",
        crewMember: "GARCIA MIGUEL ANTONIO",
        rank: "CAPTAIN",
        nationality: "PHILIPPINES",
        pickupLocation: "Hotel Marriott",
        dropoffLocation: "Puerto de Balboa",
        pickupTime: "14:30",
        vehicleType: "Luxury",
        baseRate: 30.0,
        rankSurcharge: 50,
        totalRate: 45.0,
      },
    ],
  },
  {
    id: "excel-2",
    filename: "crew_transport_febrero.xlsx",
    uploadDate: "2024-02-01",
    status: "pendiente",
    type: "crew-transport",
    records: [
      {
        id: 3,
        vesselName: "EVER GIVEN",
        voyage: "EG156E",
        crewMember: "PETROV VLADIMIR",
        rank: "CHIEF ENGINEER",
        nationality: "UKRAINE",
        pickupLocation: "Puerto de Cristóbal",
        dropoffLocation: "Aeropuerto Tocumen",
        pickupTime: "16:00",
        vehicleType: "Van",
        baseRate: 28.0,
        rankSurcharge: 25,
        totalRate: 35.0,
      },
    ],
  },
]

export function AgencyInvoice() {
  const dispatch = useAppDispatch()
  const router = useRouter()
  const allExcelFiles = useAppSelector((state) => state.excel.files)
  const availableExcels = allExcelFiles.filter((excel) => excel.module === "agency" && excel.status === "pendiente")
  const currentInvoiceDraft = useAppSelector((state) => state.invoice.currentInvoice)
  const [selectedExcels, setSelectedExcels] = useState<string[]>([])
  const [selectedRecords, setSelectedRecords] = useState<any[]>([])
  const [invoiceData, setInvoiceData] = useState({
    invoiceNumber: `AG-${Date.now().toString().slice(-6)}`,
    client: "",
    vesselName: "",
    date: new Date().toISOString().split("T")[0],
    currency: "USD",
    voyage: "",
    driver: "",
    vehicle: "",
  })
  const [currentStep, setCurrentStep] = useState<"select" | "create" | "preview">("select")
  const { toast } = useToast()

  const handleExcelSelection = (excelId: string, checked: boolean) => {
    let updatedSelectedExcelIds = [...selectedExcels]
    if (checked) {
      updatedSelectedExcelIds.push(excelId)
    } else {
      updatedSelectedExcelIds = updatedSelectedExcelIds.filter((id) => id !== excelId)
    }
    setSelectedExcels(updatedSelectedExcelIds)

    const newSelectedRecords: InvoiceRecord[] = []
    updatedSelectedExcelIds.forEach((id) => {
      const excelFile = allExcelFiles.find((ef) => ef.id === id)
      if (excelFile) {
        newSelectedRecords.push(...excelFile.records.map((r) => ({ ...r, excelId: id })))
      }
    })
    setSelectedRecords(newSelectedRecords)

    if (checked && updatedSelectedExcelIds.length > 0) {
      const firstSelectedExcelId = updatedSelectedExcelIds[0]
      const excel = allExcelFiles.find((e) => e.id === firstSelectedExcelId)
      if (excel && excel.records.length > 0) {
        const firstRecord = excel.records[0]
        setInvoiceData((prev) => ({
          ...prev,
          vesselName: firstRecord.vesselName,
          voyage: firstRecord.voyage,
        }))
      }
    }
  }

  const handleRecordSelection = (recordId: number, checked: boolean) => {
    if (checked) {
      const allRecords = mockExcelData.flatMap((excel) => excel.records)
      const record = allRecords.find((r) => r.id === recordId)
      if (record) {
        setSelectedRecords([...selectedRecords, record])
      }
    } else {
      setSelectedRecords(selectedRecords.filter((r) => r.id !== recordId))
    }
  }

  const subtotal = selectedRecords.reduce((sum, record) => sum + record.totalRate, 0)
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
      id: `INV-AGEN-${Date.now()}`,
      invoiceNumber: invoiceData.invoiceNumber,
      module: "agency",
      client: invoiceData.client,
      date: invoiceData.date,
      currency: invoiceData.currency,
      records: selectedRecords,
      subtotal,
      tax,
      total,
      status: "borrador",
      createdAt: new Date().toISOString(),
      excelIds: selectedExcels,
      vesselName: invoiceData.vesselName,
      voyage: invoiceData.voyage,
      driver: invoiceData.driver,
      vehicle: invoiceData.vehicle,
    }
    dispatch(createInvoice(newInvoice))
    setCurrentStep("preview")
    toast({
      title: "Factura Creada",
      description: `Factura ${invoiceData.invoiceNumber} creada exitosamente`,
    })
  }

  const handleFinalizeInvoice = () => {
    if (!currentInvoiceDraft) {
      toast({
        title: "Error",
        description: "No se puede finalizar una factura que no existe",
        variant: "destructive",
      })
      return
    }
    const xmlData = generateInvoiceXML(currentInvoiceDraft)
    dispatch(finalizeInvoiceAction({ id: currentInvoiceDraft.id, xmlData }))
    dispatch(markExcelAsProcessed(currentInvoiceDraft.excelIds))

    const recordIdsToMark: string[] = []
    currentInvoiceDraft.excelIds.forEach((excelId) => {
      const excel = allExcelFiles.find((f) => f.id === excelId)
      excel?.records.forEach((rec) => {
        recordIdsToMark.push(`service-${rec.id}`)
      })
    })
    dispatch(markRecordsAsInvoiced({ recordIds: recordIdsToMark, invoiceId: currentInvoiceDraft.id }))

    toast({
      title: "Factura Finalizada",
      description: "La factura ha sido generada y los Excel marcados como procesados",
    })

    setSelectedExcels([])
    setSelectedRecords([])
    dispatch(setCurrentInvoice(null))
    setCurrentStep("select")
    router.push("/agency/records") // O la ruta de registros de agency
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
    if (!currentInvoiceDraft) {
      toast({
        title: "Error",
        description: "No se puede descargar el XML de una factura que no existe",
        variant: "destructive",
      })
      return
    }

    const xmlData = generateInvoiceXML(currentInvoiceDraft)
    const blob = new Blob([xmlData], { type: "text/xml" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${currentInvoiceDraft.invoiceNumber}.xml`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)

    toast({
      title: "Descargando XML",
      description: "El archivo XML se está descargando...",
    })
  }

  if (currentStep === "preview" && currentInvoiceDraft) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-purple-500 flex items-center justify-center">
            <Users className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Vista Previa - Factura Agency</h1>
            <p className="text-muted-foreground">Revisa y finaliza tu factura</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          <Card className="col-span-2">
            <CardHeader>
              <CardTitle>Factura {currentInvoiceDraft.invoiceNumber}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold">Información de la Empresa</h3>
                  <p>Agency Services Panama</p>
                  <p>Zona Libre de Colón, Panamá</p>
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
                  <h3 className="font-semibold">Información del Viaje</h3>
                  <p>Buque: {currentInvoiceDraft.vesselName}</p>
                  <p>Viaje: {currentInvoiceDraft.voyage}</p>
                </div>
                <div>
                  <h3 className="font-semibold">Detalles Adicionales</h3>
                  <p>Driver: {currentInvoiceDraft.driver || "N/A"}</p>
                  <p>Vehículo: {currentInvoiceDraft.vehicle || "N/A"}</p>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="font-semibold mb-4">Transportes de Tripulación</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tripulante</TableHead>
                      <TableHead>Rango</TableHead>
                      <TableHead>Nacionalidad</TableHead>
                      <TableHead>Origen</TableHead>
                      <TableHead>Destino</TableHead>
                      <TableHead>Hora</TableHead>
                      <TableHead>Vehículo</TableHead>
                      <TableHead>Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentInvoiceDraft.records.map((record: any) => (
                      <TableRow key={record.id}>
                        <TableCell>{record.crewMember}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{record.rank}</Badge>
                        </TableCell>
                        <TableCell>{record.nationality}</TableCell>
                        <TableCell>{record.pickupLocation}</TableCell>
                        <TableCell>{record.dropoffLocation}</TableCell>
                        <TableCell>{record.pickupTime}</TableCell>
                        <TableCell>{record.vehicleType}</TableCell>
                        <TableCell>${record.totalRate.toFixed(2)}</TableCell>
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
                <Button onClick={handleDownloadXML} variant="outline" className="w-full">
                  <FileText className="mr-2 h-4 w-4" />
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
                  <span>Transportes:</span>
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
          <div className="h-10 w-10 rounded-lg bg-purple-500 flex items-center justify-center">
            <Users className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Crear Factura - Agency</h1>
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
                  <TabsTrigger value="voyage">Viaje</TabsTrigger>
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
                      <Label htmlFor="client">Cliente *</Label>
                      <Select
                        value={invoiceData.client}
                        onValueChange={(value) => setInvoiceData({ ...invoiceData, client: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar cliente" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MSC Logistics">MSC Logistics</SelectItem>
                          <SelectItem value="D'Amico Ship Management">D'Amico Ship Management</SelectItem>
                          <SelectItem value="WSM Global Services">WSM Global Services</SelectItem>
                          <SelectItem value="Maersk Line">Maersk Line</SelectItem>
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
                          <SelectItem value="PAB">PAB - Balboa Panameño</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="voyage" className="space-y-4 pt-4">
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
                      <Label htmlFor="voyage">Número de Viaje</Label>
                      <Input
                        id="voyage"
                        value={invoiceData.voyage}
                        onChange={(e) => setInvoiceData({ ...invoiceData, voyage: e.target.value })}
                        placeholder="Ej: FR423W"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="driver">Driver Asignado</Label>
                      <Select
                        value={invoiceData.driver}
                        onValueChange={(value) => setInvoiceData({ ...invoiceData, driver: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar driver" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Roberto Mendoza">Roberto Mendoza</SelectItem>
                          <SelectItem value="Ana García">Ana García</SelectItem>
                          <SelectItem value="Luis Herrera">Luis Herrera</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="vehicle">Vehículo</Label>
                      <Select
                        value={invoiceData.vehicle}
                        onValueChange={(value) => setInvoiceData({ ...invoiceData, vehicle: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar vehículo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sedan-001">Sedan AGY-001</SelectItem>
                          <SelectItem value="van-002">Van AGY-002</SelectItem>
                          <SelectItem value="bus-003">Bus AGY-003</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              <Separator className="my-6" />

              <div>
                <h3 className="text-lg font-medium mb-4">Transportes Seleccionados ({selectedRecords.length})</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tripulante</TableHead>
                      <TableHead>Rango</TableHead>
                      <TableHead>Origen</TableHead>
                      <TableHead>Destino</TableHead>
                      <TableHead>Hora</TableHead>
                      <TableHead>Vehículo</TableHead>
                      <TableHead>Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedRecords.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell>{record.crewMember}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{record.rank}</Badge>
                        </TableCell>
                        <TableCell>{record.pickupLocation}</TableCell>
                        <TableCell>{record.dropoffLocation}</TableCell>
                        <TableCell>{record.pickupTime}</TableCell>
                        <TableCell>{record.vehicleType}</TableCell>
                        <TableCell>${record.totalRate.toFixed(2)}</TableCell>
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
        <div className="h-10 w-10 rounded-lg bg-purple-500 flex items-center justify-center">
          <Users className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Crear Factura - Agency</h1>
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
                              <TableHead>Viaje</TableHead>
                              <TableHead>Tripulante</TableHead>
                              <TableHead>Rango</TableHead>
                              <TableHead>Origen</TableHead>
                              <TableHead>Destino</TableHead>
                              <TableHead>Total</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {excel.records.map((record) => (
                              <TableRow key={record.id}>
                                <TableCell>
                                  <Checkbox
                                    checked={selectedRecords.some((r) => r.id === record.id)}
                                    onCheckedChange={(checked) => handleRecordSelection(record.id, checked as boolean)}
                                  />
                                </TableCell>
                                <TableCell>{record.vesselName}</TableCell>
                                <TableCell>{record.voyage}</TableCell>
                                <TableCell>{record.crewMember}</TableCell>
                                <TableCell>
                                  <Badge variant="outline">{record.rank}</Badge>
                                </TableCell>
                                <TableCell>{record.pickupLocation}</TableCell>
                                <TableCell>{record.dropoffLocation}</TableCell>
                                <TableCell>${record.totalRate.toFixed(2)}</TableCell>
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
                    Transportes seleccionados: <strong>{selectedRecords.length}</strong>
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
