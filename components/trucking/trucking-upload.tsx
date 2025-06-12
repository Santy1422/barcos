"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Truck, Upload } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useAppDispatch } from "@/lib/hooks"
import { addExcelFile } from "@/lib/features/excel/excelSlice"
import {
  addRecords, // The action to save individual records
  setLoading as setRecordsLoading,
  type ExcelRecord as IndividualExcelRecord,
} from "@/lib/features/records/recordsSlice"

interface TruckingServiceRecordData {
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
  [key: string]: any
}

export function TruckingUpload() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const excelTypeForTrucking = "Servicios de Transporte Terrestre"
  const [previewData, setPreviewData] = useState<TruckingServiceRecordData[]>([])
  const [isProcessing, setIsProcessing] = useState(false)

  const dispatch = useAppDispatch()
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
    },
  ]

  useEffect(() => {
    if (selectedFile) {
      setPreviewData(mockTruckingExcelData)
      toast({
        title: "Vista Previa Generada (Simulación)",
        description: `Mostrando ${mockTruckingExcelData.length} registros simulados.`,
      })
    } else {
      setPreviewData([])
    }
  }, [selectedFile, toast])

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setSelectedFile(file)
    } else {
      setSelectedFile(null)
    }
  }

  // THIS IS THE MOST IMPORTANT FUNCTION IN THIS FILE
  const handleProcessFile = async () => {
    if (!selectedFile || previewData.length === 0) {
      toast({
        title: "Error",
        description: "Selecciona un archivo para activar la simulación y previsualizar datos.",
        variant: "destructive",
      })
      return
    }
    setIsProcessing(true)
    dispatch(setRecordsLoading(true))
    try {
      await new Promise((resolve) => setTimeout(resolve, 500)) // Simulate async

      const excelId = `TRK-EXL-${Date.now().toString().slice(-6)}`
      const uploadDate = new Date().toISOString()

      // 1. Create an array of individual records from the preview data.
      const individualRecordsToSave: IndividualExcelRecord[] = previewData.map((row, index) => {
        const totalRate = (row.tarifa || 0) + (row.gastosPuerto || 0) + (row.otrosGastos || 0)
        return {
          id: `TRK-REC-${excelId}-${index + 1}`, // Unique ID for each row
          excelId: excelId,
          module: "trucking",
          type: excelTypeForTrucking,
          status: "pendiente", // Initial status is "pending"
          totalValue: totalRate,
          createdAt: uploadDate,
          data: row, // The entire row data is stored here
        }
      })

      // 2. Dispatch the action to add these records to the Redux store.
      dispatch(addRecords(individualRecordsToSave))

      // 3. (Optional but good practice) Save metadata about the Excel file itself.
      const excelFilePayload = {
        id: excelId,
        filename: selectedFile.name,
        uploadDate: uploadDate,
        status: "procesado" as const,
        type: excelTypeForTrucking,
        module: "trucking" as const,
        recordIds: individualRecordsToSave.map((rec) => rec.id),
        totalValue: individualRecordsToSave.reduce((sum, rec) => sum + rec.totalValue, 0),
        metadata: { clientName: previewData[0]?.cliente },
      }
      dispatch(addExcelFile(excelFilePayload))

      toast({
        title: "Excel Procesado Correctamente",
        description: `${individualRecordsToSave.length} registros individuales fueron guardados y están listos para facturar.`,
        duration: 5000,
      })

      // Reset UI
      setSelectedFile(null)
      setPreviewData([])
      const fileInput = document.getElementById("file-upload") as HTMLInputElement
      if (fileInput) fileInput.value = ""
    } catch (error: any) {
      toast({ title: "Error Procesando", description: error.message, variant: "destructive" })
    } finally {
      setIsProcessing(false)
      dispatch(setRecordsLoading(false))
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-blue-500 flex items-center justify-center">
          <Truck className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Subir Excel - Trucking</h1>
          <p className="text-muted-foreground">Importa datos de servicios de transporte (simulación).</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cargar Archivo Excel (Simulación)</CardTitle>
          <CardDescription>
            Sube cualquier archivo para activar la simulación. Se usarán datos de prueba para crear registros
            individuales.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="file-upload">Archivo Excel</Label>
            <Input id="file-upload" type="file" onChange={handleFileChange} disabled={isProcessing} />
            {selectedFile && <p className="text-sm text-muted-foreground">Archivo: {selectedFile.name}</p>}
          </div>
          <Button
            onClick={handleProcessFile}
            disabled={!selectedFile || previewData.length === 0 || isProcessing}
            className="w-full"
          >
            {isProcessing ? (
              <>
                <Upload className="mr-2 h-4 w-4 animate-spin" />
                Procesando...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Procesar y Guardar Registros Individuales
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {previewData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Vista Previa de Datos a Procesar ({previewData.length} registros)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Contenedor</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewData.slice(0, 5).map((row, index) => (
                    <TableRow key={index}>
                      <TableCell>{row.fecha}</TableCell>
                      <TableCell>{row.cliente}</TableCell>
                      <TableCell>{row.contenedor}</TableCell>
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
    </div>
  )
}
