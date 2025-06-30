"use client"

import { useState, useEffect } from "react"
import { useAppDispatch, useAppSelector } from "@/lib/hooks"
import { createTruckingRecords, selectCreatingRecords, selectRecordsError } from "@/lib/features/records/recordsSlice"
import { addExcelFile } from "@/lib/features/excel/excelSlice"
import { parseTruckingExcel, TruckingExcelData, matchTruckingDataWithRoutes } from "@/lib/excel-parser"
import { selectTruckingRoutes, fetchTruckingRoutes, selectTruckingRoutesLoading, selectTruckingRoutesError } from "@/lib/features/truckingRoutes/truckingRoutesSlice"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"
import { FileSpreadsheet, Upload, CheckCircle, Loader2, AlertCircle } from "lucide-react"

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
  
  // Obtener las rutas configuradas para el matching
  const routes = useAppSelector(selectTruckingRoutes)
  const routesLoading = useAppSelector(selectTruckingRoutesLoading)
  const routesError = useAppSelector(selectTruckingRoutesError)

  // Cargar rutas al montar el componente
  useEffect(() => {
    dispatch(fetchTruckingRoutes())
  }, [dispatch])

  // Debug: Monitorear cuando las rutas se cargan
  useEffect(() => {
    console.log("=== RUTAS CARGADAS ===")
    console.log("Rutas disponibles:", routes)
    console.log("Número de rutas:", routes.length)
    console.log("Cargando rutas:", routesLoading)
    console.log("Error en rutas:", routesError)
    if (routes.length > 0) {
      routes.forEach((route, index) => {
        console.log(`Ruta ${index + 1}:`, {
          name: route.name,
          containerType: route.containerType,
          routeType: route.routeType,
          price: route.price
        })
      })
    }
    console.log("")
  }, [routes, routesLoading, routesError])

  // Mostrar error si existe
  useEffect(() => {
    if (routesError) {
      toast({
        title: "Error al cargar rutas",
        description: routesError,
        variant: "destructive",
      })
    }
  }, [routesError, toast])

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      setIsLoading(true)
      
      try {
        // Verificar que las rutas estén cargadas
        if (routesLoading) {
          toast({
            title: "Cargando rutas",
            description: "Espera un momento mientras se cargan las rutas configuradas...",
          })
          return
        }

        if (routes.length === 0) {
          toast({
            title: "No hay rutas configuradas",
            description: "Debes configurar rutas en la sección de configuración antes de subir archivos.",
            variant: "destructive",
          })
          return
        }

        // Parsear el archivo Excel real
        const realData = await parseTruckingExcel(file)
        
        console.log("=== DEBUGGING MATCHING ===")
        console.log("Datos del Excel:", realData)
        console.log("Rutas disponibles:", routes)
        console.log("")
        
        // Aplicar matching con las rutas configuradas
        const matchedData = matchTruckingDataWithRoutes(realData, routes)
        
        console.log("Datos después del matching:", matchedData)
        console.log("")
        
        setPreviewData(matchedData)
        
        // Contar registros con match
        const matchedCount = matchedData.filter(record => record.isMatched).length
        const unmatchedCount = matchedData.length - matchedCount
        
        console.log(`Registros con match: ${matchedCount}/${matchedData.length}`)
        
        toast({
          title: "✅ Archivo Excel procesado",
          description: `Se han leído ${realData.length} registros. ${matchedCount} con precio asignado, ${unmatchedCount} sin coincidencia.`,
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
      console.log("=== INICIANDO GUARDADO ===")
      console.log("Datos a guardar:", previewData)
      
      // Temporary workaround: Use a proper ObjectId format
      // You should replace this with actual Excel file creation
      const tempObjectId = new Date().getTime().toString(16).padStart(24, '0').substring(0, 24)
      
      console.log("ExcelId:", tempObjectId)
      
      // First, create the Excel file record to get a proper ObjectId
      const excelFileData = {
        filename: selectedFile.name,
        uploadDate: new Date().toISOString(),
        status: "pendiente" as const,
        type: "trucking-data",
        module: "trucking" as const,
        recordIds: [], // Will be populated after records are created
        totalValue: 0 // Valor por defecto ya que no tenemos totalValue en los datos
      }

      // TODO: Create API endpoint to create Excel file and return ObjectId
      // For now, we need to create the Excel file first, then use its ObjectId
      // This requires a backend API endpoint like POST /api/excel-files
      
      const recordsData = previewData.map((record, index) => ({
        data: record, // Datos completos del Excel incluyendo matchedPrice, matchedRouteId, etc.
        totalValue: record.matchedPrice || 0 // Usar el precio de la ruta si está disponible
      }))
      
      console.log("Records data preparado:", recordsData)
      console.log("Payload a enviar:", {
        excelId: tempObjectId,
        recordsData
      })
      
      const result = await dispatch(createTruckingRecords({
        excelId: tempObjectId, // Use the generated ObjectId
        recordsData
      })).unwrap()
      
      console.log("Resultado del guardado:", result)
      console.log("Result length:", result.length)
      console.log("Result type:", typeof result)
      console.log("Result is array:", Array.isArray(result))
      
      toast({
        title: "Éxito",
        description: `${result.length} registros guardados correctamente en el sistema`
      })
      
      // Limpiar el estado
      setPreviewData([])
      setSelectedFile(null)
      
    } catch (error) {
      console.error("Error al guardar:", error)
      toast({
        title: "Error",
        description: recordsError || "Error al guardar los registros",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const totalAmount = previewData.reduce((sum, record) => sum + (record.matchedPrice || 0), 0);
  const matchedCount = previewData.filter(record => record.isMatched).length;
  const unmatchedCount = previewData.length - matchedCount;

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
              disabled={isLoading || isProcessing || routesLoading}
            />
          </div>
          
          {/* Estado de carga de rutas */}
          {routesLoading && (
            <div className="flex items-center gap-2 text-sm text-blue-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              Cargando rutas configuradas...
            </div>
          )}
          
          {!routesLoading && routes.length === 0 && (
            <div className="flex items-center gap-2 text-sm text-orange-600">
              <AlertCircle className="h-4 w-4" />
              No hay rutas configuradas. Ve a Configuración para crear rutas.
            </div>
          )}
          
          {!routesLoading && routes.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <CheckCircle className="h-4 w-4" />
              {routes.length} ruta{routes.length !== 1 ? 's' : ''} configurada{routes.length !== 1 ? 's' : ''} lista{routes.length !== 1 ? 's' : ''}
            </div>
          )}
          
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
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>{previewData.length} registros encontrados</span>
              <Badge variant="outline" className="text-green-600 border-green-600">
                {matchedCount} con precio
              </Badge>
              {unmatchedCount > 0 && (
                <Badge variant="outline" className="text-orange-600 border-orange-600">
                  {unmatchedCount} sin coincidencia
                </Badge>
              )}
              <span className="ml-auto font-medium">
                Total: ${totalAmount.toFixed(2)}
              </span>
            </div>
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
                    <TableHead>Leg</TableHead>
                    <TableHead>Move Type</TableHead>
                    <TableHead>Precio</TableHead>
                    <TableHead>Estado</TableHead>
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
                      <TableCell>{record.leg}</TableCell>
                      <TableCell>{record.moveType}</TableCell>
                      <TableCell>
                        {record.isMatched ? (
                          <span className="font-medium text-green-600">
                            ${record.matchedPrice?.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {record.isMatched ? (
                          <Badge variant="outline" className="text-green-600 border-green-600">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Match
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-orange-600 border-orange-600">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Sin match
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            
            <div className="mt-4 flex justify-end">
              <Button 
                onClick={handleUpload}
                disabled={isLoading || isCreatingRecords}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isLoading || isCreatingRecords ? (
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
