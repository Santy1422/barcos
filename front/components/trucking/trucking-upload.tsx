"use client"

import { useState } from "react"
import { useAppDispatch, useAppSelector } from "@/lib/hooks"
import { addRecords, setLoading } from "@/lib/features/records/recordsSlice"
import { addExcelFile } from "@/lib/features/excel/excelSlice"
import { parseTruckingExcel, TruckingExcelData } from "@/lib/excel-parser"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/hooks/use-toast"

export function TruckingUpload() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewData, setPreviewData] = useState<TruckingExcelData[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const dispatch = useAppDispatch()
  const { toast } = useToast()

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      setIsLoading(true)
      
      try {
        // Parsear el archivo Excel real
        const realData = await parseTruckingExcel(file)
        setPreviewData(realData)
        
        toast({
          title: "✅ Archivo Excel procesado",
          description: `Se han leído ${realData.length} registros REALES del archivo ${file.name}.`,
        })
      } catch (error) {
        console.error('Error al procesar archivo:', error)
        toast({
          title: "Error al procesar archivo",
          description: "No se pudo leer el archivo Excel. Verifica que tenga el formato correcto.",
          variant: "destructive",
        })
        setPreviewData([])
      } finally {
        setIsLoading(false)
      }
    } else {
      setSelectedFile(null)
      setPreviewData([])
    }
  }

  const handleUpload = async () => {
    if (!selectedFile || previewData.length === 0) {
      toast({
        title: "Error",
        description: "Por favor selecciona un archivo válido primero.",
        variant: "destructive",
      })
      return
    }

    setIsProcessing(true)
    dispatch(setLoading(true))

    try {
      // Crear el archivo Excel en el estado
      const excelFileId = `excel-${Date.now()}`
      dispatch(addExcelFile({
        id: excelFileId,
        filename: selectedFile.name,
        status: "processing",
        type: "trucking",
        module: "trucking",
        recordIds: []
      }))

      // Convertir los datos parseados a ExcelRecord format
      const records = previewData.map((data, index) => ({
        id: `TRK-REC-${excelFileId}-${index + 1}`,
        excelId: excelFileId,
        module: "trucking" as const,
        type: "transport-services",
        status: "pendiente" as const,
        totalValue: data.tarifa + data.gastosPuerto + data.otrosGastos,
        data: data,
        createdAt: new Date().toISOString()
      }))

      // Usar addRecords (plural) en lugar de addRecord
      dispatch(addRecords(records))

      // Actualizar el estado del archivo Excel
      dispatch(addExcelFile({
        id: excelFileId,
        filename: selectedFile.name,
        status: "completed",
        type: "trucking",
        module: "trucking",
        recordIds: records.map(r => r.id)
      }))

      toast({
        title: "✅ Datos cargados exitosamente",
        description: `Se han procesado ${records.length} registros de transporte.`,
      })

      // Limpiar el formulario
      setSelectedFile(null)
      setPreviewData([])
      
    } catch (error) {
      console.error('Error al cargar datos:', error)
      toast({
        title: "Error al cargar datos",
        description: "Hubo un problema al procesar los datos. Inténtalo de nuevo.",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
      dispatch(setLoading(false))
    }
  }

  return (
    <div className="space-y-6">
      <div className="border-b pb-4">
        <h1 className="text-3xl font-bold">Subir Excel - Trucking</h1>
        <p className="text-muted-foreground">Importa datos de servicios de transporte terrestre desde archivos Excel</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Subir Archivo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="file-upload">Archivo Excel</Label>
              <Input
                id="file-upload"
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                disabled={isLoading}
              />
            </div>
            
            {selectedFile && (
              <div className="text-sm text-muted-foreground">
                Archivo seleccionado: {selectedFile.name}
              </div>
            )}
            
            {previewData.length > 0 && (
              <Button 
                onClick={handleProcessFile} 
                disabled={isProcessing}
                className="w-full"
              >
                {isProcessing ? "Procesando..." : "Procesar Archivo"}
              </Button>
            )}
          </CardContent>
        </Card>

        {previewData.length > 0 && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Vista Previa de Datos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-h-96 overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Desde</TableHead>
                      <TableHead>Hacia</TableHead>
                      <TableHead>Contenedor</TableHead>
                      <TableHead>Tarifa</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewData.slice(0, 10).map((row, index) => (
                      <TableRow key={index}>
                        <TableCell>{row.fecha}</TableCell>
                        <TableCell>{row.cliente}</TableCell>
                        <TableCell>{row.desde}</TableCell>
                        <TableCell>{row.hacia}</TableCell>
                        <TableCell>{row.contenedor}</TableCell>
                        <TableCell>${row.tarifa}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {previewData.length > 10 && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Mostrando 10 de {previewData.length} registros
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
