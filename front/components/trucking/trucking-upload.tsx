"use client"

import { useState } from "react"
import { useAppDispatch, useAppSelector } from "@/lib/hooks"
import { createTruckingRecords, selectCreatingRecords, selectRecordsError } from "@/lib/features/records/recordsSlice"
import { addExcelFile } from "@/lib/features/excel/excelSlice"
import { parseTruckingExcel, TruckingExcelData } from "@/lib/excel-parser"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"
import { FileSpreadsheet, Upload, CheckCircle, Loader2 } from "lucide-react"

export function TruckingUpload() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewData, setPreviewData] = useState<TruckingExcelData[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const dispatch = useAppDispatch()
  const { toast } = useToast()
  
  // Add this line to get the creating records state from Redux
  const isCreatingRecords = useAppSelector(selectCreatingRecords)
  const recordsError = useAppSelector(selectRecordsError)

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
          description: `Se han leído ${realData.length} registros del archivo ${file.name}.`,
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

  // En la función handleUpload
  const handleUpload = async () => {
    if (!selectedFile || previewData.length === 0) {
      toast({
        title: "Error",
        description: "Por favor selecciona un archivo y verifica que tenga datos válidos",
        variant: "destructive"
      })
      return
    }

    setIsLoading(true)

    try {
      // First, create the Excel file record to get a proper ObjectId
      const excelFileData = {
        filename: selectedFile.name,
        uploadDate: new Date().toISOString(),
        status: "pendiente" as const,
        type: "trucking-data",
        module: "trucking" as const,
        recordIds: [], // Will be populated after records are created
        totalValue: previewData.reduce((sum, record) => sum + (record.totalValue || 0), 0)
      }

      // TODO: Create API endpoint to create Excel file and return ObjectId
      // For now, we need to create the Excel file first, then use its ObjectId
      // This requires a backend API endpoint like POST /api/excel-files
      
      // Temporary workaround: Use a proper ObjectId format
      // You should replace this with actual Excel file creation
      const tempObjectId = new Date().getTime().toString(16).padStart(24, '0').substring(0, 24)
      
      const recordsData = previewData.map((record, index) => ({
        id: `TRK-REC-${tempObjectId}-${index}`,
        module: "trucking" as const,
        type: "trucking-data",
        status: "pendiente" as const,
        data: record,
        totalValue: record.totalValue || 0
      }))
      
      const userId = localStorage.getItem('userId') || 'default-user'
      
      const result = await dispatch(createTruckingRecords({
        excelId: tempObjectId, // Use the generated ObjectId
        recordsData,
        createdBy: userId
      })).unwrap()
      
      toast({
        title: "Éxito",
        description: `${result.length} registros guardados correctamente en el sistema`
      })
      
      // Limpiar el estado
      setPreviewData([])
      setSelectedFile(null)
      
    } catch (error) {
      toast({
        title: "Error",
        description: recordsError || "Error al guardar los registros",
        variant: "destructive"
      })
    }
  }

  const totalAmount = previewData.length; // O cualquier lógica que tenga sentido para trucking

  // Y en el JSX, remover o modificar la línea del total:
  <div className="text-right">
    <p className="text-sm font-medium">Total registros: {previewData.length}</p>
  </div>

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Subir Excel de Trucking
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="excel-file">Seleccionar archivo Excel</Label>
            <Input
              id="excel-file"
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              disabled={isLoading || isProcessing}
            />
          </div>
          
          {selectedFile && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileSpreadsheet className="h-4 w-4" />
              {selectedFile.name}
              <Badge variant="secondary">{previewData.length} registros</Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {previewData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Vista Previa de Datos</CardTitle>
            <p className="text-sm text-muted-foreground">
              {previewData.length} registros encontrados
            </p>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border max-h-96 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Container</TableHead>
                    <TableHead>Container Consecutive</TableHead>
                    <TableHead>Driver Name</TableHead>
                    <TableHead>Plate</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Move Date</TableHead>
                    <TableHead>Associate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewData.map((record, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-mono text-sm">{record.container}</TableCell>
                      <TableCell>{record.containerConsecutive}</TableCell>
                      <TableCell>{record.driverName}</TableCell>
                      <TableCell>{record.plate}</TableCell>
                      <TableCell>{record.size}</TableCell>
                      <TableCell>{record.type}</TableCell>
                      <TableCell>{record.moveDate}</TableCell>
                      <TableCell>{record.associate}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            
            <div className="mt-4 flex justify-end">
              <Button 
                onClick={handleUpload}
                disabled={isCreatingRecords}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isCreatingRecords ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  "Guardar en Sistema"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
