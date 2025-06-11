"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Truck, Upload, FileSpreadsheet, Eye, Plus, Check } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { useAppDispatch, useAppSelector } from "@/lib/hooks"
import { addExcelFile, setLoading as setExcelLoading } from "@/lib/features/excel/excelSlice"
import {
  addRecords,
  setLoading as setRecordsLoading,
  type ExcelRecord as IndividualExcelRecord,
} from "@/lib/features/records/recordsSlice"

// Define a more specific type for trucking service records, extending the base ExcelRecord
interface TruckingServiceRecordData {
  // These are the raw columns from the Excel file
  fecha: string
  cliente: string
  ruc: string
  desde: string
  hacia: string
  contenedor: string
  tamaño: string
  tipoContenedor: string
  bl?: string
  driverExcel?: string
  tarifa: number
  gastosPuerto?: number
  otrosGastos?: number
  numero_de_sello?: string
  temperatura_carga_c?: number
  [key: string]: any
}

export function TruckingUpload() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const excelTypeForTrucking = "Servicios de Transporte Terrestre"
  const [previewData, setPreviewData] = useState<TruckingServiceRecordData[]>([])
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [showManualEntryModal, setShowManualEntryModal] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  const initialManualEntry: Partial<TruckingServiceRecordData> = {
    fecha: new Date().toISOString().split("T")[0],
    cliente: "",
    ruc: "",
    desde: "",
    hacia: "",
    contenedor: "",
    tamaño: "20",
    tipoContenedor: "DV",
    tarifa: 0,
    gastosPuerto: 0,
    otrosGastos: 0,
  }
  const [manualEntryData, setManualEntryData] = useState(initialManualEntry)

  const dispatch = useAppDispatch()
  const { files: allExcelFiles, loading: excelLoading } = useAppSelector((state) => state.excel)
  const { loading: recordsLoading } = useAppSelector((state) => state.records)
  const truckingExcels = allExcelFiles.filter((f) => f.module === "trucking")
  const { toast } = useToast()

  const mockTruckingExcelData: TruckingServiceRecordData[] = [
    {
      fecha: "2024-07-10",
      cliente: "Importadora Del Mar S.A.",
      ruc: "155678901-2-2020",
      desde: "Puerto Balboa",
      hacia: "Ciudad de Panamá",
      contenedor: "MSCU1234567",
      tamaño: "40",
      tipoContenedor: "HC",
      bl: "MSCA001",
      driverExcel: "Carlos Perez",
      tarifa: 180,
      gastosPuerto: 35,
      otrosGastos: 10,
      numero_de_sello: "SEALPA001",
      temperatura_carga_c: 4,
    },
    {
      fecha: "2024-07-11",
      cliente: "Logística Total PTY",
      ruc: "8-NT-12345",
      desde: "Zona Libre Colón",
      hacia: "Aeropuerto Tocumen",
      contenedor: "CMAU7654321",
      tamaño: "20",
      tipoContenedor: "DV",
      bl: "CMAA002",
      driverExcel: "Ana Rodriguez",
      tarifa: 130,
      gastosPuerto: 20,
      otrosGastos: 5,
      numero_de_sello: "SEALPA002",
    },
    {
      fecha: "2024-07-12",
      cliente: "Importadora Del Mar S.A.",
      ruc: "155678901-2-2020",
      desde: "Puerto Balboa",
      hacia: "Colón",
      contenedor: "MSCU9876543",
      tamaño: "40",
      tipoContenedor: "DV",
      bl: "MSCA003",
      driverExcel: "Carlos Perez",
      tarifa: 160,
      gastosPuerto: 30,
      otrosGastos: 10,
      numero_de_sello: "SEALPA003",
    },
    {
      fecha: "2024-07-13",
      cliente: "Transportes Rápidos S.A.",
      ruc: "9-RT-67890",
      desde: "Puerto Manzanillo",
      hacia: "David",
      contenedor: "TRSU1122334",
      tamaño: "20",
      tipoContenedor: "RF",
      bl: "TRSA001",
      driverExcel: "Pedro Gómez",
      tarifa: 250,
      gastosPuerto: 40,
      otrosGastos: 15,
      temperatura_carga_c: -18,
    },
  ]

  useEffect(() => {
    if (selectedFile) {
      // In a real scenario, you'd parse selectedFile here.
      // For simulation, we use mock data.
      setPreviewData(mockTruckingExcelData)
      toast({
        title: "Vista Previa Generada (Simulación)",
        description: `Mostrando ${mockTruckingExcelData.length} registros simulados.`,
      })
    } else {
      setPreviewData([])
    }
  }, [selectedFile, toast]) // mockTruckingExcelData is stable, toast is stable

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      if (
        file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
        file.type === "application/vnd.ms-excel"
      ) {
        setSelectedFile(file)
      } else {
        toast({ title: "Archivo no válido", description: "Solo archivos Excel (.xlsx, .xls).", variant: "destructive" })
        setSelectedFile(null)
        event.target.value = "" // Reset file input
      }
    } else {
      setSelectedFile(null)
    }
  }

  const handleProcessFile = async () => {
    if (!selectedFile || previewData.length === 0) {
      toast({
        title: "Error",
        description: "Selecciona un archivo y asegúrate que tenga datos para previsualizar.",
        variant: "destructive",
      })
      return
    }
    setIsProcessing(true)
    dispatch(setExcelLoading(true))
    dispatch(setRecordsLoading(true))
    try {
      // Simulate async processing (e.g., file parsing, API calls)
      await new Promise((resolve) => setTimeout(resolve, 1000))

      const excelId = `TRK-EXL-${Date.now().toString().slice(-6)}`
      const uploadDate = new Date().toISOString()

      // 1. Create individual records for recordsSlice
      const individualRecordsToSave: IndividualExcelRecord[] = previewData.map((row, index) => {
        const totalRate = (row.tarifa || 0) + (row.gastosPuerto || 0) + (row.otrosGastos || 0)
        return {
          id: `TRK-REC-${excelId}-${index + 1}`, // Unique ID for each record
          excelId: excelId,
          module: "trucking",
          type: excelTypeForTrucking, // e.g., "Servicios de Transporte Terrestre"
          status: "pendiente", // Initial status for individual record
          totalValue: totalRate,
          createdAt: uploadDate,
          data: {
            // This is the raw row data from Excel (TruckingServiceRecordData)
            ...row,
            // If you added calculated fields to row like `totalRate` earlier, they'd be here.
            // It's generally better to keep `data` as close to original row + essential derived values.
          },
        }
      })
      dispatch(addRecords(individualRecordsToSave))

      // 2. Create ExcelFile entry for excelSlice (metadata about the file itself)
      const excelFilePayload = {
        id: excelId,
        filename: selectedFile.name,
        uploadDate: uploadDate,
        status: "procesado" as const, // Mark file as processed since records are extracted
        type: excelTypeForTrucking,
        module: "trucking" as const,
        recordIds: individualRecordsToSave.map((rec) => rec.id), // Store IDs of individual records
        totalValue: individualRecordsToSave.reduce((sum, rec) => sum + rec.totalValue, 0),
        metadata: {
          clientName: previewData[0]?.cliente, // Example metadata
          ruc: previewData[0]?.ruc,
        },
      }
      dispatch(addExcelFile(excelFilePayload))

      toast({
        title: "Excel Procesado",
        description: `${individualRecordsToSave.length} registros individuales guardados y listos para facturar.`,
        duration: 5000,
      })
      setSelectedFile(null) // Clear selected file
      setPreviewData([]) // Clear preview data
      const fileInput = document.getElementById("file-upload") as HTMLInputElement
      if (fileInput) fileInput.value = "" // Reset file input
    } catch (error: any) {
      toast({ title: "Error Procesando Archivo", description: error.message || String(error), variant: "destructive" })
    } finally {
      setIsProcessing(false)
      dispatch(setExcelLoading(false))
      dispatch(setRecordsLoading(false))
    }
  }

  const handleManualInputChange = (field: keyof TruckingServiceRecordData, value: string | number) => {
    setManualEntryData((prev) => ({ ...prev, [field]: value }))
  }

  const handleAddManualEntry = () => {
    if (!manualEntryData.cliente || !manualEntryData.ruc || !manualEntryData.tarifa) {
      toast({
        title: "Error",
        description: "Cliente, RUC y Tarifa son requeridos para entrada manual.",
        variant: "destructive",
      })
      return
    }
    const newEntry: TruckingServiceRecordData = {
      fecha: manualEntryData.fecha || new Date().toISOString().split("T")[0],
      cliente: manualEntryData.cliente!,
      ruc: manualEntryData.ruc!,
      desde: manualEntryData.desde || "N/A",
      hacia: manualEntryData.hacia || "N/A",
      contenedor: manualEntryData.contenedor || "N/A",
      tamaño: manualEntryData.tamaño || "20",
      tipoContenedor: manualEntryData.tipoContenedor || "DV",
      tarifa: Number(manualEntryData.tarifa) || 0,
      gastosPuerto: Number(manualEntryData.gastosPuerto) || 0,
      otrosGastos: Number(manualEntryData.otrosGastos) || 0,
      driverExcel: manualEntryData.driverExcel,
      bl: manualEntryData.bl,
      numero_de_sello: manualEntryData.numero_de_sello,
      temperatura_carga_c: manualEntryData.temperatura_carga_c,
    }
    // Add to previewData. These will be processed if user clicks "Procesar y Guardar Excel"
    // Or, if you want to add them directly as individual records:
    // dispatch(addRecords([{ id: `MAN-TRK-${Date.now()}`, ...newEntry, module:"trucking", type:"Manual", status:"pendiente", totalValue: newEntry.tarifa, createdAt: new Date().toISOString(), data: newEntry, excelId: "MANUAL" }]))
    setPreviewData((prev) => [...prev, newEntry])
    setShowManualEntryModal(false)
    setManualEntryData(initialManualEntry)
    toast({ title: "Entrada Manual Agregada a Vista Previa" })
  }

  const isLoading = excelLoading || recordsLoading || isProcessing

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-blue-500 flex items-center justify-center">
          <Truck className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Subir Excel - Trucking</h1>
          <p className="text-muted-foreground">Importa datos de servicios de transporte terrestre (simulación).</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Excel Cargados</p>
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
                <p className="text-sm font-medium text-muted-foreground">Pendientes Facturar (Archivos)</p>
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
                <p className="text-sm font-medium text-muted-foreground">Procesados (Archivos)</p>
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
            <CardTitle>Cargar Archivo Excel (Simulación)</CardTitle>
            <CardDescription>
              Sube tu archivo de Servicios de Transporte (.xlsx o .xls). Se usarán datos de prueba.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="excel-type-fixed">Tipo de Excel (Fijo para Trucking)</Label>
              <Input id="excel-type-fixed" value={excelTypeForTrucking} readOnly disabled className="bg-muted/50" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="file-upload">Archivo Excel</Label>
              <Input
                id="file-upload"
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                disabled={isLoading}
              />
              {selectedFile && (
                <p className="text-sm text-muted-foreground">Archivo seleccionado: {selectedFile.name}</p>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleProcessFile}
                disabled={!selectedFile || previewData.length === 0 || isLoading}
                className="flex-1"
              >
                {isLoading ? (
                  <>
                    <Upload className="mr-2 h-4 w-4 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Procesar y Guardar Registros
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={() => setShowManualEntryModal(true)} disabled={isLoading}>
                <Plus className="mr-2 h-4 w-4" />
                Entrada Manual (a Vista Previa)
              </Button>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Columnas Esperadas (Ejemplo de Simulación)</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            <p>
              Fecha, Cliente, RUC, Desde, Hacia, Contenedor, Tamaño, TipoContenedor, BL, DriverExcel, Tarifa,
              GastosPuerto, OtrosGastos, Numero_De_Sello, Temperatura_Carga_C.
            </p>
            <p className="text-xs text-muted-foreground">Estos son los campos usados en los datos de simulación.</p>
          </CardContent>
        </Card>
      </div>

      {previewData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Vista Previa de Datos a Procesar ({previewData.length} registros)
              <Button variant="outline" size="sm" onClick={() => setShowPreviewModal(true)}>
                <Eye className="mr-2 h-4 w-4" />
                Ver Detalles Completos
              </Button>
            </CardTitle>
            <CardDescription>
              Estos son los datos (simulados) que se guardarán como registros individuales. Primeros 5 mostrados.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>RUC</TableHead>
                    <TableHead>Contenedor</TableHead>
                    <TableHead>Sello</TableHead>
                    <TableHead className="text-right">Total Calculado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewData.slice(0, 5).map((row, index) => (
                    <TableRow key={index}>
                      <TableCell>{row.fecha}</TableCell>
                      <TableCell>{row.cliente}</TableCell>
                      <TableCell>{row.ruc}</TableCell>
                      <TableCell>{row.contenedor}</TableCell>
                      <TableCell>{row.numero_de_sello || "N/A"}</TableCell>
                      <TableCell className="text-right">
                        ${((row.tarifa || 0) + (row.gastosPuerto || 0) + (row.otrosGastos || 0)).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={showPreviewModal} onOpenChange={setShowPreviewModal}>
        <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Vista Detallada de Datos a Procesar - {excelTypeForTrucking}</DialogTitle>
            <DialogDescription>Registros (simulados) en la vista previa.</DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto flex-grow pr-2 mt-4">
            <Table size="sm">
              <TableHeader>
                <TableRow>
                  {Object.keys(previewData[0] || {}).map((key) => (
                    <TableHead key={key} className={typeof previewData[0]?.[key] === "number" ? "text-right" : ""}>
                      {key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewData.map((row, index) => (
                  <TableRow key={index}>
                    {Object.entries(row).map(([key, val]) => (
                      <TableCell key={key} className={typeof val === "number" ? "text-right" : ""}>
                        {typeof val === "number"
                          ? (val as number).toFixed(2)
                          : String(val !== null && val !== undefined ? val : "N/A")}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowPreviewModal(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showManualEntryModal} onOpenChange={setShowManualEntryModal}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Entrada Manual de Servicio de Transporte (a Vista Previa)</DialogTitle>
            <DialogDescription>Completa los campos para agregar un nuevo registro a la vista previa.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3 py-4 pr-3">
            {Object.keys(initialManualEntry).map((key) => {
              const fieldKey = key as keyof TruckingServiceRecordData
              const label = key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
              const isRequired = ["cliente", "ruc", "tarifa"].includes(key)
              return (
                <div className="space-y-1.5" key={key}>
                  <Label htmlFor={`manual-${key}`}>
                    {label}
                    {isRequired ? " *" : ""}
                  </Label>
                  <Input
                    id={`manual-${key}`}
                    type={
                      typeof initialManualEntry[fieldKey] === "number" ||
                      key.includes("tarifa") ||
                      key.includes("gastos")
                        ? "number"
                        : key.includes("fecha")
                          ? "date"
                          : "text"
                    }
                    value={manualEntryData[fieldKey] || ""}
                    onChange={(e) =>
                      handleManualInputChange(
                        fieldKey,
                        typeof initialManualEntry[fieldKey] === "number" ||
                          key.includes("tarifa") ||
                          key.includes("gastos")
                          ? Number.parseFloat(e.target.value) || 0
                          : e.target.value,
                      )
                    }
                    placeholder={label}
                  />
                </div>
              )
            })}
          </div>
          <DialogFooter className="pt-4 border-t">
            <Button variant="outline" onClick={() => setShowManualEntryModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddManualEntry}>Agregar a Vista Previa</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
