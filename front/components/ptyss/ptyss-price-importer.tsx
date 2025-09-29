"use client"

import { useState, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  Upload, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Download,
  Loader2
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import * as XLSX from "xlsx"
import { saveAs } from 'file-saver'

interface PTYSSPriceImporterProps {
  onImport: (routes: any[], onProgress?: (progress: number, status: string) => void, overwriteDuplicates?: boolean) => Promise<void>
  onClose: () => void
}

export function PTYSSPriceImporter({ onImport, onClose }: PTYSSPriceImporterProps) {
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [importProgress, setImportProgress] = useState(0)
  const [importStatus, setImportStatus] = useState("")
  const [overwriteDuplicates, setOverwriteDuplicates] = useState(false)
  const [previewData, setPreviewData] = useState<any[]>([])
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [skippedRowsCount, setSkippedRowsCount] = useState<number>(0)

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      if (file.type !== 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' && 
          file.type !== 'application/vnd.ms-excel') {
        toast({
          title: "Error",
          description: "Por favor selecciona un archivo Excel (.xlsx o .xls)",
          variant: "destructive"
        })
        return
      }
      setSelectedFile(file)
      processFile(file)
    }
  }

  const processFile = async (file: File) => {
    setIsProcessing(true)
    setValidationErrors([])
    setPreviewData([])
    setSkippedRowsCount(0)
    
    try {
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data)
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      
      // Convertir a JSON
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })
      
      if (jsonData.length < 2) {
        throw new Error("El archivo debe tener al menos una fila de encabezados y una fila de datos")
      }

      // Obtener encabezados (primera fila)
      const headers = jsonData[0] as string[]
      
      // Función helper para buscar columnas de manera más flexible
      const findColumnIndex = (patterns: string[]) => {
        return headers.findIndex(h => {
          const normalizedHeader = h?.toLowerCase().trim()
          return patterns.some(pattern => normalizedHeader.includes(pattern.toLowerCase()))
        })
      }

      // Mapear los índices de las columnas para PTYSS
      const columnMap = {
        from: findColumnIndex(['from', 'origen']),
        to: findColumnIndex(['to', 'destino']),
        containerType: findColumnIndex(['container type', 'container', 'tipo']),
        routeType: findColumnIndex(['route type', 'route', 'tipo ruta']),
        price: findColumnIndex(['price', 'precio', 'rate']),
        status: findColumnIndex(['status', 'estado']),
        cliente: findColumnIndex(['cliente', 'client']),
        routeArea: findColumnIndex(['route area', 'routearea', 'area'])
      }

      // Debug: mostrar información de mapeo
      console.log('Headers encontrados:', headers)
      console.log('Mapeo de columnas:', columnMap)

      // Verificar que se encontraron todas las columnas necesarias
      const missingColumns = []
      if (columnMap.from === -1) missingColumns.push('From')
      if (columnMap.to === -1) missingColumns.push('To')
      if (columnMap.containerType === -1) missingColumns.push('Container Type')
      if (columnMap.routeType === -1) missingColumns.push('Route Type')
      if (columnMap.price === -1) missingColumns.push('Price')
      if (columnMap.status === -1) missingColumns.push('Status')
      if (columnMap.cliente === -1) missingColumns.push('Cliente')
      if (columnMap.routeArea === -1) missingColumns.push('Route Area')

      if (missingColumns.length > 0) {
        throw new Error(`Faltan las siguientes columnas: ${missingColumns.join(', ')}. Columnas encontradas: ${headers.join(', ')}`)
      }

      // Procesar datos
      const processedData = []
      const errors = []
      let skippedRows = 0

      for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i] as any[]
        if (!row || row.length === 0) continue

        try {
          const from = row[columnMap.from]?.toString().trim()
          const to = row[columnMap.to]?.toString().trim()
          const containerType = row[columnMap.containerType]?.toString().trim().toUpperCase()
          const routeType = row[columnMap.routeType]?.toString().trim().toUpperCase()
          // Limpiar y parsear el precio de manera más robusta
          const priceRaw = row[columnMap.price]?.toString().trim() || ''
          const price = parseFloat(priceRaw.replace(/[^0-9.-]/g, '') || '0')
          const status = row[columnMap.status]?.toString().trim().toUpperCase()
          const cliente = row[columnMap.cliente]?.toString().trim()
          const routeArea = row[columnMap.routeArea]?.toString().trim().toUpperCase()

          // Validaciones
          if (!from) {
            errors.push(`Fila ${i + 1}: Campo 'From' es requerido`)
            continue
          }
          if (!to) {
            errors.push(`Fila ${i + 1}: Campo 'To' es requerido`)
            continue
          }
          if (!containerType) {
            errors.push(`Fila ${i + 1}: Campo 'Container Type' es requerido`)
            continue
          }
          if (!routeType || !['SINGLE', 'RT'].includes(routeType)) {
            errors.push(`Fila ${i + 1}: Campo 'Route Type' debe ser 'SINGLE' o 'RT'`)
            continue
          }
          if (isNaN(price) || price <= 0) {
            // Omitir fila silenciosamente si el precio no es válido
            skippedRows++
            continue
          }
          if (!status || !['FULL', 'EMPTY'].includes(status)) {
            errors.push(`Fila ${i + 1}: Campo 'Status' debe ser 'FULL' o 'EMPTY'`)
            continue
          }
          if (!cliente) {
            errors.push(`Fila ${i + 1}: Campo 'Cliente' es requerido`)
            continue
          }
          if (!routeArea || !['PACIFIC', 'NORTH', 'SOUTH', 'ATLANTIC'].includes(routeArea)) {
            errors.push(`Fila ${i + 1}: Campo 'Route Area' debe ser 'PACIFIC', 'NORTH', 'SOUTH' o 'ATLANTIC'`)
            continue
          }

          processedData.push({
            from,
            to,
            containerType,
            routeType: routeType === 'RT' ? 'RT' : 'single',
            price,
            status,
            cliente,
            routeArea
          })
        } catch (error) {
          errors.push(`Fila ${i + 1}: Error procesando datos - ${error instanceof Error ? error.message : 'Error desconocido'}`)
          skippedRows++
        }
      }

      if (errors.length > 0) {
        setValidationErrors(errors)
      }

      setPreviewData(processedData)
      setSkippedRowsCount(skippedRows)
      
      toast({
        title: "Archivo procesado",
        description: `Se procesaron ${processedData.length} rutas válidas${skippedRows > 0 ? `, se omitieron ${skippedRows} filas con precios inválidos` : ''}${errors.length > 0 ? ` con ${errors.length} errores` : ''}`,
        variant: errors.length > 0 ? "destructive" : "default"
      })

    } catch (error) {
      console.error('Error procesando archivo:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error procesando el archivo",
        variant: "destructive"
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleImport = async () => {
    if (previewData.length === 0) {
      toast({
        title: "Error",
        description: "No hay datos válidos para importar",
        variant: "destructive"
      })
      return
    }

    setIsImporting(true)
    setImportProgress(0)
    setImportStatus("Iniciando importación...")

    try {
      await onImport(previewData, (progress, status) => {
        setImportProgress(progress)
        setImportStatus(status)
      }, overwriteDuplicates)

      toast({
        title: "Importación completada",
        description: "Las rutas se importaron correctamente",
      })

      onClose()
    } catch (error) {
      console.error('Error en importación:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error durante la importación",
        variant: "destructive"
      })
    } finally {
      setIsImporting(false)
    }
  }

  const handleDownloadTemplate = () => {
    try {
      // Crear datos de ejemplo para la plantilla PTYSS
      const templateData = [
        {
          'Route Type': 'single',
          'Route Area': 'PACIFIC',
          'From': 'PSA',
          'To': 'BLB',
          'Status': 'FULL',
          'Container Type': 'CA',
          'Cliente': 'PTG',
          'Price': '265.00'
        },
        {
          'Route Type': 'RT',
          'Route Area': 'ATLANTIC',
          'From': 'CCT',
          'To': 'PSA',
          'Status': 'EMPTY',
          'Container Type': 'CT',
          'Cliente': 'PTG',
          'Price': '433.50'
        },
        {
          'Route Type': 'single',
          'Route Area': 'NORTH',
          'From': 'BLB',
          'To': 'CCT',
          'Status': 'FULL',
          'Container Type': 'DV',
          'Cliente': 'PTG',
          'Price': '320.75'
        },
        {
          'Route Type': 'RT',
          'Route Area': 'SOUTH',
          'From': 'MIT',
          'To': 'CTB',
          'Status': 'EMPTY',
          'Container Type': 'RE',
          'Cliente': 'PTG',
          'Price': '450.00'
        }
      ]

      // Crear un nuevo workbook
      const wb = XLSX.utils.book_new()
      
      // Crear la hoja de trabajo con los datos
      const ws = XLSX.utils.json_to_sheet(templateData)
      
      // Ajustar el ancho de las columnas
      const colWidths = [
        { wch: 12 }, // Route Type
        { wch: 12 }, // Route Area
        { wch: 8 },  // From
        { wch: 8 },  // To
        { wch: 8 },  // Status
        { wch: 15 }, // Container Type
        { wch: 10 }, // Cliente
        { wch: 10 }  // Price
      ]
      ws['!cols'] = colWidths
      
      // Agregar la hoja al workbook
      XLSX.utils.book_append_sheet(wb, ws, 'Plantilla Rutas PTYSS')
      
      // Generar el archivo Excel
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
      
      // Crear un blob y descargarlo
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      saveAs(blob, 'plantilla-rutas-ptyss.xlsx')
      
      toast({
        title: "Plantilla descargada",
        description: "Se ha descargado la plantilla Excel con el formato correcto para rutas PTYSS"
      })
    } catch (error) {
      console.error('Error generando plantilla:', error)
      toast({
        title: "Error",
        description: "Error al generar la plantilla Excel",
        variant: "destructive"
      })
    }
  }

  const handleClose = () => {
    if (isImporting) return
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Importar Precios PTYSS
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={handleClose} disabled={isImporting}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Selección de archivo */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="file-input">Seleccionar archivo Excel</Label>
              <Input
                ref={fileInputRef}
                id="file-input"
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileSelect}
                disabled={isProcessing || isImporting}
              />
            </div>

            {selectedFile && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileText className="h-4 w-4" />
                {selectedFile.name}
                <Badge variant="secondary">{previewData.length} rutas</Badge>
              </div>
            )}

            {/* Opciones de importación */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="overwrite-duplicates"
                checked={overwriteDuplicates}
                onCheckedChange={(checked) => setOverwriteDuplicates(checked as boolean)}
                disabled={isImporting}
              />
              <Label htmlFor="overwrite-duplicates" className="text-sm">
                Sobrescribir rutas duplicadas (actualizar precios de rutas existentes)
              </Label>
            </div>
            <div className="text-xs text-muted-foreground mt-1 ml-6">
              Si está activado: actualiza los precios de rutas que ya existen en el sistema.
              <br />
              Si está desactivado: omite las rutas duplicadas y solo importa rutas nuevas.
            </div>
          </div>

          {/* Errores de validación */}
          {validationErrors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1">
                  <p className="font-medium">Errores encontrados:</p>
                  <ul className="text-sm list-disc list-inside max-h-32 overflow-y-auto">
                    {validationErrors.slice(0, 10).map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                    {validationErrors.length > 10 && (
                      <li>... y {validationErrors.length - 10} errores más</li>
                    )}
                  </ul>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Vista previa de datos */}
          {previewData.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Vista previa de datos</h3>
                {skippedRowsCount > 0 && (
                  <div className="text-sm text-amber-600 bg-amber-50 px-3 py-1 rounded-md">
                    Se omitieron {skippedRowsCount} filas con precios inválidos
                  </div>
                )}
              </div>
              <div className="border rounded-md max-h-64 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left">From</th>
                      <th className="px-3 py-2 text-left">To</th>
                      <th className="px-3 py-2 text-left">Container Type</th>
                      <th className="px-3 py-2 text-left">Route Type</th>
                      <th className="px-3 py-2 text-left">Status</th>
                      <th className="px-3 py-2 text-left">Cliente</th>
                      <th className="px-3 py-2 text-left">Route Area</th>
                      <th className="px-3 py-2 text-left">Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.slice(0, 20).map((route, index) => (
                      <tr key={index} className="border-t">
                        <td className="px-3 py-2">{route.from}</td>
                        <td className="px-3 py-2">{route.to}</td>
                        <td className="px-3 py-2">{route.containerType}</td>
                        <td className="px-3 py-2">{route.routeType}</td>
                        <td className="px-3 py-2">{route.status}</td>
                        <td className="px-3 py-2">{route.cliente}</td>
                        <td className="px-3 py-2">{route.routeArea}</td>
                        <td className="px-3 py-2">${route.price.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {previewData.length > 20 && (
                  <div className="px-3 py-2 text-sm text-muted-foreground text-center">
                    ... y {previewData.length - 20} rutas más
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Progreso de importación */}
          {isImporting && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Importando rutas...</span>
                <span>{importProgress}%</span>
              </div>
              <Progress value={importProgress} className="w-full" />
              <p className="text-sm text-muted-foreground">{importStatus}</p>
            </div>
          )}

          {/* Botones de acción */}
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={handleClose} disabled={isImporting}>
              Cancelar
            </Button>
            <Button
              onClick={handleImport}
              disabled={previewData.length === 0 || isImporting || validationErrors.length > 0}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isImporting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Importar {previewData.length} Rutas
                </>
              )}
            </Button>
          </div>

          {/* Información de ayuda */}
          <div className="text-sm text-muted-foreground space-y-2">
            <div className="flex items-center justify-between mb-2">
              <p className="font-medium">Formato esperado del archivo Excel:</p>
              <Button 
                onClick={handleDownloadTemplate} 
                variant="outline" 
                size="sm"
                className="text-blue-700 border-blue-300 hover:bg-blue-100"
                disabled={isProcessing || isImporting}
              >
                <Download className="h-4 w-4 mr-2" />
                Descargar Plantilla
              </Button>
            </div>
            <ul className="list-disc list-inside space-y-1">
              <li>Columna "From": Puerto de origen</li>
              <li>Columna "To": Puerto de destino</li>
              <li>Columna "Container Type": Tipo de contenedor (DV, RE, etc.)</li>
              <li>Columna "Route Type": SINGLE o RT</li>
              <li>Columna "Status": FULL o EMPTY</li>
              <li>Columna "Cliente": Código del cliente</li>
              <li>Columna "Route Area": PACIFIC, NORTH, SOUTH o ATLANTIC</li>
              <li>Columna "Price": Precio de la ruta</li>
            </ul>
            <p className="text-xs text-muted-foreground mt-2">
              <strong>Orden de columnas recomendado:</strong> Route Type, Route Area, From, To, Status, Container Type, Cliente, Price
            </p>
            <p className="text-xs text-blue-700 mt-2">
              <strong>💡 Consejo:</strong> Usa la plantilla descargada como referencia para el formato correcto.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-3">
              <p className="text-xs font-medium text-blue-900 mb-1">💡 Detección de duplicados:</p>
              <p className="text-xs text-blue-700">
                Una ruta se considera duplicada si coinciden <strong>TODOS</strong> estos campos: 
                Origen, Destino, Tipo de Contenedor, Tipo de Ruta, Estado, Cliente y Área de Ruta.
                <br />
                <strong>Ejemplo:</strong> PSA/BLB + RE + RT + FULL + PTG + PACIFIC es diferente de PSA/BLB + RF + RT + FULL + PTG + PACIFIC
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
