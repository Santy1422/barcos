"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Truck, Upload, FileSpreadsheet, Eye, Plus, Check, AlertCircle } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import { useAppDispatch, useAppSelector } from "@/lib/hooks"
import { addExcelFile, setLoading, type ExcelRecord } from "@/lib/features/excel/excelSlice"
import { addRecords } from "@/lib/features/records/recordsSlice"

// Define a more specific type for transport service records
interface TransportServiceRecord extends ExcelRecord {
  id: number // Original ID from Excel
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

export function TruckingUpload() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [excelType, setExcelType] = useState<string>("transport-services") // Default to transport-services
  const [previewData, setPreviewData] = useState<TransportServiceRecord[]>([])
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [showManualEntryModal, setShowManualEntryModal] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [manualEntryData, setManualEntryData] = useState<Partial<TransportServiceRecord>>({
    fecha: new Date().toISOString().split("T")[0],
    cliente: "",
    desde: "",
    hacia: "",
    contenedor: "",
    tamaño: "20'",
    tarifa: 0,
    gastosPuerto: 0,
    otrosGastos: 0,
  })

  const dispatch = useAppDispatch()
  const { files: allExcelFiles, loading } = useAppSelector((state) => state.excel)
  const truckingExcels = allExcelFiles.filter((f) => f.module === "trucking")
  const { toast } = useToast()

  const excelTypes = [
    { value: "transport-services", label: "Servicios de Transporte", description: "Servicios de transporte terrestre" },
    // Add other types if needed, but for the demo, this one is key
  ]

  const mockTransportServicesData: TransportServiceRecord[] = [
    {
      id: 1,
      fecha: "2024-05-15",
      cliente: "MSC Logistics",
      desde: "MIT",
      hacia: "PSA",
      contenedor: "MSCU7326823",
      tamaño: "40'",
      bl: "MEDUL6827090",
      driver: "Luis Matos",
      tarifa: 120.0,
      gastosPuerto: 25.0,
      otrosGastos: 15.0,
      totalRate: 160.0,
    },
    {
      id: 2,
      fecha: "2024-05-16",
      cliente: "MSC Logistics",
      desde: "PSA",
      hacia: "CCT",
      contenedor: "CTWU1601508",
      tamaño: "20'",
      bl: "7336875A",
      driver: "Luis Matos",
      tarifa: 85.0,
      gastosPuerto: 20.0,
      otrosGastos: 10.0,
      totalRate: 115.0,
    },
    {
      id: 3,
      fecha: "2024-05-17",
      cliente: "Global Shipping Co.",
      desde: "MIT",
      hacia: "BLB",
      contenedor: "GLOB1234567",
      tamaño: "45' HC",
      bl: "GLOB001234",
      driver: "Carlos Rodriguez",
      tarifa: 150.0,
      gastosPuerto: 30.0,
      otrosGastos: 20.0,
      totalRate: 200.0,
    },
    {
      id: 4,
      fecha: "2024-05-18",
      cliente: "SeaFreight International",
      desde: "CCT",
      hacia: "MIT",
      contenedor: "SFIU9876543",
      tamaño: "40' HC",
      bl: "SFIU005678",
      driver: "Ana Gomez",
      tarifa: 135.0,
      gastosPuerto: 28.0,
      otrosGastos: 12.0,
      totalRate: 175.0,
    },
    {
      id: 5,
      fecha: "2024-05-19",
      cliente: "MSC Logistics",
      desde: "BLB",
      hacia: "PSA",
      contenedor: "MSCU1122334",
      tamaño: "20'",
      bl: "MEDUL6827099",
      driver: "Luis Matos",
      tarifa: 90.0,
      gastosPuerto: 22.0,
      otrosGastos: 13.0,
      totalRate: 125.0,
    },
  ]

  useEffect(() => {
    if (selectedFile && excelType === "transport-services") {
      // Simulate reading data for preview
      setPreviewData(mockTransportServicesData)
      toast({
        title: "Vista previa generada",
        description: `Mostrando ${mockTransportServicesData.length} registros simulados para ${selectedFile.name}`,
      })
    } else {
      setPreviewData([])
    }
  }, [selectedFile, excelType, toast])

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      if (
        file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
        file.type === "application/vnd.ms-excel"
      ) {
        setSelectedFile(file)
      } else {
        toast({
          title: "Archivo no válido",
          description: "Por favor, selecciona un archivo Excel (.xlsx o .xls).",
          variant: "destructive",
        })
        setSelectedFile(null)
        event.target.value = "" // Clear the input
      }
    } else {
      setSelectedFile(null)
    }
  }

  const handleProcessFile = async () => {
    if (!selectedFile || !excelType || previewData.length === 0) {
      toast({
        title: "Error de Validación",
        description: "Debes seleccionar un archivo Excel, un tipo de Excel y tener datos en la vista previa.",
        variant: "destructive",
      })
      return
    }

    setIsProcessing(true)
    dispatch(setLoading(true))

    try {
      await new Promise((resolve) => setTimeout(resolve, 1000)) // Simulate processing

      const excelId = `TRK-EXL-${Date.now().toString().slice(-6)}`
      const totalValue = previewData.reduce((sum, record) => sum + record.totalRate, 0)

      const excelFilePayload = {
        id: excelId,
        filename: selectedFile.name,
        uploadDate: new Date().toISOString(),
        status: "pendiente" as const,
        type: excelType,
        module: "trucking" as const,
        records: previewData as ExcelRecord[], // Cast to base type
        totalValue,
      }
      dispatch(addExcelFile(excelFilePayload))

      const serviceRecordsPayload = previewData.map((record) => ({
        id: `TRK-REC-${excelId}-${record.id}`, // Globally unique record ID
        module: "trucking" as const,
        type: excelType, // e.g., "transport-services"
        date: record.fecha,
        client: record.cliente,
        status: "pendiente" as const,
        totalValue: record.totalRate,
        data: record, // Store the full original record data
        excelId: excelId,
      }))
      dispatch(addRecords(serviceRecordsPayload))

      toast({
        title: "¡Excel Procesado Exitosamente!",
        description: `Se han guardado ${previewData.length} registros. Ahora puedes crear facturas con estos datos desde la sección 'Crear Factura'.`,
        duration: 5000,
      })

      setSelectedFile(null)
      setPreviewData([])
      const fileInput = document.getElementById("file-upload") as HTMLInputElement
      if (fileInput) fileInput.value = ""
    } catch (error) {
      console.error("Error processing file:", error)
      toast({
        title: "Error Inesperado",
        description: "Hubo un problema al procesar el archivo. Intenta de nuevo o revisa la consola.",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
      dispatch(setLoading(false))
    }
  }

  const handleManualInputChange = (field: keyof TransportServiceRecord, value: string | number) => {
    setManualEntryData((prev) => ({ ...prev, [field]: value }))
  }

  const handleAddManualEntry = () => {
    if (!manualEntryData.cliente || !manualEntryData.tarifa) {
      toast({ title: "Error", description: "Cliente y Tarifa son requeridos.", variant: "destructive" })
      return
    }
    const newEntry: TransportServiceRecord = {
      id: previewData.length + 1 + Date.now(), // More unique ID for preview
      fecha: manualEntryData.fecha || new Date().toISOString().split("T")[0],
      cliente: manualEntryData.cliente!,
      desde: manualEntryData.desde || "N/A",
      hacia: manualEntryData.hacia || "N/A",
      contenedor: manualEntryData.contenedor || "N/A",
      tamaño: manualEntryData.tamaño || "N/A",
      tarifa: Number(manualEntryData.tarifa) || 0,
      gastosPuerto: Number(manualEntryData.gastosPuerto) || 0,
      otrosGastos: Number(manualEntryData.otrosGastos) || 0,
      totalRate:
        (Number(manualEntryData.tarifa) || 0) +
        (Number(manualEntryData.gastosPuerto) || 0) +
        (Number(manualEntryData.otrosGastos) || 0),
      driver: manualEntryData.driver || "N/A",
      bl: manualEntryData.bl || "N/A",
    }
    setPreviewData((prev) => [...prev, newEntry])
    setShowManualEntryModal(false)
    setManualEntryData({
      // Reset form
      fecha: new Date().toISOString().split("T")[0],
      cliente: "",
      desde: "",
      hacia: "",
      contenedor: "",
      tamaño: "20'",
      tarifa: 0,
      gastosPuerto: 0,
      otrosGastos: 0,
    })
    toast({ title: "Entrada Manual Agregada", description: "El registro se añadió a la vista previa." })
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-blue-500 flex items-center justify-center">
          <Truck className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Subir Excel - Trucking</h1>
          <p className="text-muted-foreground">
            Importa datos de servicios de transporte terrestre desde archivos Excel
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Excel Cargados (Trucking)</p>
                <p className="text-2xl font-bold">{truckingExcels.length}</p>
              </div>
              <FileSpreadsheet className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pendientes de Facturar</p>
                <p className="text-2xl font-bold">{truckingExcels.filter((f) => f.status === "pendiente").length}</p>
              </div>
              <Upload className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Procesados (Facturados)</p>
                <p className="text-2xl font-bold">{truckingExcels.filter((f) => f.status === "procesado").length}</p>
              </div>
              <Check className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Cargar Archivo Excel</CardTitle>
            <CardDescription>Selecciona el tipo de datos y sube tu archivo Excel (.xlsx o .xls)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="excel-type">Tipo de Excel</Label>
              <Select value={excelType} onValueChange={setExcelType} disabled={isProcessing}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona el tipo de datos" />
                </SelectTrigger>
                <SelectContent>
                  {excelTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div>
                        <div className="font-medium">{type.label}</div>
                        <div className="text-sm text-muted-foreground">{type.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="file-upload">Archivo Excel</Label>
              <Input
                id="file-upload"
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                disabled={!excelType || isProcessing}
              />
              {selectedFile && (
                <p className="text-sm text-muted-foreground">Archivo seleccionado: {selectedFile.name}</p>
              )}
            </div>

            {!excelType && (
              <Alert variant="default">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Selecciona un Tipo de Excel</AlertTitle>
                <AlertDescription>Por favor, elige un tipo de Excel para poder cargar un archivo.</AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2">
              <Button
                onClick={handleProcessFile}
                disabled={!selectedFile || !excelType || previewData.length === 0 || isProcessing || loading}
                className="flex-1"
              >
                {isProcessing || loading ? (
                  <>
                    <Upload className="mr-2 h-4 w-4 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Procesar y Guardar
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowManualEntryModal(true)}
                disabled={!excelType || isProcessing}
              >
                <Plus className="mr-2 h-4 w-4" />
                Entrada Manual
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tipos de Excel Soportados</CardTitle>
            <CardDescription>Para la demo, nos enfocaremos en "Servicios de Transporte".</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {excelTypes.map((type) => (
              <div
                key={type.value}
                className="flex items-start space-x-3 p-2 rounded-md border border-transparent hover:border-primary/50 transition-colors"
              >
                <FileSpreadsheet className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-medium text-sm">{type.label}</div>
                  <div className="text-xs text-muted-foreground">{type.description}</div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {previewData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Vista Previa de Datos ({previewData.length} registros)</span>
              <Button variant="outline" size="sm" onClick={() => setShowPreviewModal(true)}>
                <Eye className="mr-2 h-4 w-4" />
                Ver Todos los Detalles
              </Button>
            </CardTitle>
            <CardDescription>
              Mostrando los primeros 5 registros. Haz clic en "Ver Todos los Detalles" para la tabla completa.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Desde</TableHead>
                    <TableHead>Hacia</TableHead>
                    <TableHead>Contenedor</TableHead>
                    <TableHead>Driver</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewData.slice(0, 5).map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>{row.fecha}</TableCell>
                      <TableCell>{row.cliente}</TableCell>
                      <TableCell>{row.desde}</TableCell>
                      <TableCell>{row.hacia}</TableCell>
                      <TableCell>{row.contenedor}</TableCell>
                      <TableCell>{row.driver || "N/A"}</TableCell>
                      <TableCell className="text-right">${row.totalRate.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={showPreviewModal} onOpenChange={setShowPreviewModal}>
        <DialogContent className="max-w-4xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle>
              Vista Detallada - {excelTypes.find((t) => t.value === excelType)?.label || "Datos"}
            </DialogTitle>
            <DialogDescription>Todos los registros cargados en la vista previa.</DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto pr-2">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Desde</TableHead>
                  <TableHead>Hacia</TableHead>
                  <TableHead>Contenedor</TableHead>
                  <TableHead>Tamaño</TableHead>
                  <TableHead>BL</TableHead>
                  <TableHead>Driver</TableHead>
                  <TableHead className="text-right">Tarifa</TableHead>
                  <TableHead className="text-right">G. Puerto</TableHead>
                  <TableHead className="text-right">Otros G.</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewData.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.id}</TableCell>
                    <TableCell>{row.fecha}</TableCell>
                    <TableCell>{row.cliente}</TableCell>
                    <TableCell>{row.desde}</TableCell>
                    <TableCell>{row.hacia}</TableCell>
                    <TableCell>{row.contenedor}</TableCell>
                    <TableCell>{row.tamaño}</TableCell>
                    <TableCell>{row.bl || "N/A"}</TableCell>
                    <TableCell>{row.driver || "N/A"}</TableCell>
                    <TableCell className="text-right">${row.tarifa.toFixed(2)}</TableCell>
                    <TableCell className="text-right">${row.gastosPuerto.toFixed(2)}</TableCell>
                    <TableCell className="text-right">${row.otrosGastos.toFixed(2)}</TableCell>
                    <TableCell className="text-right">${row.totalRate.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showManualEntryModal} onOpenChange={setShowManualEntryModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Entrada Manual de Servicio de Transporte</DialogTitle>
            <DialogDescription>Completa los campos para agregar un nuevo registro a la vista previa.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto pr-3">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="manual-fecha">Fecha</Label>
                <Input
                  id="manual-fecha"
                  type="date"
                  value={manualEntryData.fecha}
                  onChange={(e) => handleManualInputChange("fecha", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="manual-cliente">Cliente *</Label>
                <Input
                  id="manual-cliente"
                  value={manualEntryData.cliente}
                  onChange={(e) => handleManualInputChange("cliente", e.target.value)}
                  placeholder="Nombre del Cliente"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="manual-desde">Desde</Label>
                <Input
                  id="manual-desde"
                  value={manualEntryData.desde}
                  onChange={(e) => handleManualInputChange("desde", e.target.value)}
                  placeholder="Origen"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="manual-hacia">Hacia</Label>
                <Input
                  id="manual-hacia"
                  value={manualEntryData.hacia}
                  onChange={(e) => handleManualInputChange("hacia", e.target.value)}
                  placeholder="Destino"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="manual-contenedor">Contenedor</Label>
                <Input
                  id="manual-contenedor"
                  value={manualEntryData.contenedor}
                  onChange={(e) => handleManualInputChange("contenedor", e.target.value)}
                  placeholder="Ej: MSCU1234567"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="manual-tamaño">Tamaño Cont.</Label>
                <Select
                  value={manualEntryData.tamaño}
                  onValueChange={(value) => handleManualInputChange("tamaño", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="20'">20'</SelectItem>
                    <SelectItem value="40'">40'</SelectItem>
                    <SelectItem value="40' HC">40' HC</SelectItem>
                    <SelectItem value="45' HC">45' HC</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="manual-driver">Driver</Label>
                <Input
                  id="manual-driver"
                  value={manualEntryData.driver}
                  onChange={(e) => handleManualInputChange("driver", e.target.value)}
                  placeholder="Nombre del Driver"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="manual-bl">BL (Opcional)</Label>
                <Input
                  id="manual-bl"
                  value={manualEntryData.bl}
                  onChange={(e) => handleManualInputChange("bl", e.target.value)}
                  placeholder="Número de BL"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="manual-tarifa">Tarifa *</Label>
                <Input
                  id="manual-tarifa"
                  type="number"
                  value={manualEntryData.tarifa}
                  onChange={(e) => handleManualInputChange("tarifa", Number.parseFloat(e.target.value))}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="manual-gastosPuerto">Gastos Puerto</Label>
                <Input
                  id="manual-gastosPuerto"
                  type="number"
                  value={manualEntryData.gastosPuerto}
                  onChange={(e) => handleManualInputChange("gastosPuerto", Number.parseFloat(e.target.value))}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="manual-otrosGastos">Otros Gastos</Label>
                <Input
                  id="manual-otrosGastos"
                  type="number"
                  value={manualEntryData.otrosGastos}
                  onChange={(e) => handleManualInputChange("otrosGastos", Number.parseFloat(e.target.value))}
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setShowManualEntryModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddManualEntry}>Agregar a Vista Previa</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
