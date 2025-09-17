"use client"

import { useState, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { useToast } from "@/hooks/use-toast"
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, X, Loader2, Pause, Download } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'

interface ImportedRoute {
  billing: string
  routeArea: string
  origin: string
  destination: string
  status: string
  sizeContenedor: string
  tipo: string
  cliente: string
  rate: number
}

interface PriceImporterProps {
  onImport: (routes: ImportedRoute[], onProgress?: (progress: number, status: string) => void, overwriteDuplicates?: boolean) => Promise<void>
  onClose: () => void
}

export function PriceImporter({ onImport, onClose }: PriceImporterProps) {
  const { toast } = useToast()
  const [file, setFile] = useState<File | null>(null)
  const [importedData, setImportedData] = useState<ImportedRoute[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [importProgress, setImportProgress] = useState(0)
  const [importStatus, setImportStatus] = useState('')
  const [canCancel, setCanCancel] = useState(false)
  const [overwriteDuplicates, setOverwriteDuplicates] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (selectedFile) {
      if (selectedFile.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
          selectedFile.type === 'application/vnd.ms-excel' ||
          selectedFile.name.endsWith('.xlsx') || 
          selectedFile.name.endsWith('.xls')) {
        setFile(selectedFile)
        processFile(selectedFile)
      } else {
        toast({
          title: "Error",
          description: "Por favor selecciona un archivo Excel válido (.xlsx o .xls)",
          variant: "destructive"
        })
      }
    }
  }

  const processFile = async (file: File) => {
    setIsProcessing(true)
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
      
      // Mapear los índices de las columnas con mayor flexibilidad
      const columnMap = {
        billing: headers.findIndex(h => h?.toLowerCase().includes('billing')),
        routeArea: headers.findIndex(h => h?.toLowerCase().includes('route area') || h?.toLowerCase().includes('routearea') || h?.toLowerCase().includes('route')),
        origin: headers.findIndex(h => h?.toLowerCase().includes('origin')),
        destination: headers.findIndex(h => h?.toLowerCase().includes('destino') || h?.toLowerCase().includes('destination')),
        status: headers.findIndex(h => h?.toLowerCase().includes('status')),
        sizeContenedor: headers.findIndex(h => h?.toLowerCase().includes('sz') || h?.toLowerCase().includes('size') || h?.toLowerCase().includes('tamaño')),
        tipo: headers.findIndex(h => h?.toLowerCase().includes('tipo') || h?.toLowerCase().includes('type')),
        cliente: headers.findIndex(h => h?.toLowerCase().includes('cliente') || h?.toLowerCase().includes('client')),
        rate: headers.findIndex(h => h?.toLowerCase().includes('rate') || h?.toLowerCase().includes('precio') || h?.toLowerCase().includes('price'))
      }

      // Debug: mostrar información de mapeo
      console.log('Headers encontrados:', headers)
      console.log('Mapeo de columnas:', columnMap)

      // Verificar que se encontraron todas las columnas necesarias
      const missingColumns = Object.entries(columnMap)
        .filter(([key, index]) => index === -1)
        .map(([key]) => key)

      if (missingColumns.length > 0) {
        const foundColumns = Object.entries(columnMap)
          .filter(([key, index]) => index !== -1)
          .map(([key, index]) => `${key}: "${headers[index]}"`)
        
        throw new Error(
          `No se encontraron las siguientes columnas: ${missingColumns.join(', ')}\n\n` +
          `Columnas encontradas: ${foundColumns.join(', ')}\n\n` +
          `Encabezados disponibles: ${headers.join(', ')}`
        )
      }

      // Procesar datos (saltar la primera fila que son los encabezados)
      const routes: ImportedRoute[] = []
      for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i] as any[]
        
        // Saltar filas vacías
        if (!row || row.every(cell => !cell)) continue

        // Función para convertir números con comas a formato decimal
        const parseNumber = (value: any): number => {
          if (typeof value === 'number') return value
          const str = String(value || '').trim()
          if (!str) return 0
          // Reemplazar comas por puntos para parseFloat
          const normalizedStr = str.replace(',', '.')
          return parseFloat(normalizedStr) || 0
        }

        const route: ImportedRoute = {
          billing: String(row[columnMap.billing] || '').trim(),
          routeArea: String(row[columnMap.routeArea] || '').trim(),
          origin: String(row[columnMap.origin] || '').trim(),
          destination: String(row[columnMap.destination] || '').trim(),
          status: String(row[columnMap.status] || '').trim(),
          sizeContenedor: String(row[columnMap.sizeContenedor] || '').trim(),
          tipo: String(row[columnMap.tipo] || '').trim(),
          cliente: String(row[columnMap.cliente] || '').trim(),
          rate: parseNumber(row[columnMap.rate])
        }

        // Validar que todos los campos requeridos estén presentes
        if (route.billing && route.routeArea && route.origin && route.destination && 
            route.status && route.sizeContenedor && route.tipo && route.cliente && route.rate > 0) {
          routes.push(route)
        }
      }

      if (routes.length === 0) {
        throw new Error("No se encontraron datos válidos en el archivo")
      }

      setImportedData(routes)
      toast({
        title: "Archivo procesado",
        description: `Se encontraron ${routes.length} rutas válidas en el archivo`
      })

    } catch (error) {
      console.error('Error procesando archivo:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al procesar el archivo",
        variant: "destructive"
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleImport = async () => {
    if (importedData.length > 0) {
      setIsImporting(true)
      setImportProgress(0)
      setImportStatus('Iniciando importación...')
      setCanCancel(true)
      
      // Crear AbortController para cancelar la operación
      abortControllerRef.current = new AbortController()
      
      try {
        await onImport(importedData, (progress, status) => {
          setImportProgress(progress)
          setImportStatus(status)
        }, overwriteDuplicates)
        setImportStatus('Importación completada exitosamente')
        setTimeout(() => {
          onClose()
        }, 2000)
      } catch (error) {
        console.error('Error durante la importación:', error)
        toast({
          title: "Error en la importación",
          description: error instanceof Error ? error.message : "Error desconocido durante la importación",
          variant: "destructive"
        })
      } finally {
        setIsImporting(false)
        setCanCancel(false)
        abortControllerRef.current = null
      }
    }
  }

  const handleCancelImport = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      setImportStatus('Importación cancelada')
      setIsImporting(false)
      setCanCancel(false)
    }
  }




  const handleClear = () => {
    setFile(null)
    setImportedData([])
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleDownloadTemplate = () => {
    try {
      // Crear datos de ejemplo para la plantilla
      const templateData = [
        {
          'Billing': 'SINGLE',
          'Route Area': 'PACIFIC',
          'Origin': 'PSA',
          'Destino': 'BLB',
          'Status': 'FULL',
          'Sz': '20',
          'Tipo': 'CA',
          'Cliente': 'MSC',
          'Rate': '265.00'
        },
        {
          'Billing': 'RT',
          'Route Area': 'ATLANTIC',
          'Origin': 'CCT',
          'Destino': 'PSA',
          'Status': 'EMPTY',
          'Sz': '40',
          'Tipo': 'CT',
          'Cliente': 'MSC',
          'Rate': '433.50'
        },
        {
          'Billing': 'SINGLE',
          'Route Area': 'NORTH',
          'Origin': 'BLB',
          'Destino': 'CCT',
          'Status': 'FULL',
          'Sz': '45',
          'Tipo': 'DV',
          'Cliente': 'MSC',
          'Rate': '320.75'
        }
      ]

      // Crear un nuevo workbook
      const wb = XLSX.utils.book_new()
      
      // Crear la hoja de trabajo con los datos
      const ws = XLSX.utils.json_to_sheet(templateData)
      
      // Ajustar el ancho de las columnas
      const colWidths = [
        { wch: 10 }, // Billing
        { wch: 12 }, // Route Area
        { wch: 8 },  // Origin
        { wch: 8 },  // Destino
        { wch: 8 },  // Status
        { wch: 6 },  // Sz
        { wch: 8 },  // Tipo
        { wch: 10 }, // Cliente
        { wch: 10 }  // Rate
      ]
      ws['!cols'] = colWidths
      
      // Agregar la hoja al workbook
      XLSX.utils.book_append_sheet(wb, ws, 'Plantilla Rutas')
      
      // Generar el archivo Excel
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
      
      // Crear un blob y descargarlo
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      saveAs(blob, 'plantilla-rutas-trucking.xlsx')
      
      toast({
        title: "Plantilla descargada",
        description: "Se ha descargado la plantilla Excel con el formato correcto"
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="mx-4 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <Card className="shadow-2xl">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5" />
                  Importador de Precios de Rutas
                </CardTitle>
                <CardDescription>
                  Sube un archivo Excel con las rutas y precios para importar masivamente
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Instrucciones */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-blue-900">Formato del archivo Excel requerido:</h4>
                <Button 
                  onClick={handleDownloadTemplate} 
                  variant="outline" 
                  size="sm"
                  className="text-blue-700 border-blue-300 hover:bg-blue-100"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Descargar Plantilla
                </Button>
              </div>
              <div className="text-sm text-blue-800 space-y-1">
                <p>El archivo debe contener las siguientes columnas (en cualquier orden):</p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li><strong>Billing</strong> - Tipo de facturación (SINGLE, RT)</li>
                  <li><strong>Route Area</strong> - Área de la ruta (PACIFIC, NORTH, SOUTH, ATLANTIC)</li>
                  <li><strong>Origin</strong> - Origen (PSA, BLB, CCT, etc.)</li>
                  <li><strong>Destino</strong> - Destino (PSA, BLB, CCT, etc.)</li>
                  <li><strong>Status</strong> - Estado (FULL, EMPTY)</li>
                  <li><strong>Sz</strong> - Tamaño del contenedor (20, 40, 45)</li>
                  <li><strong>Tipo</strong> - Tipo de contenedor (CA, CT, DV, FL, etc.)</li>
                  <li><strong>Cliente</strong> - Cliente (MSC, etc.)</li>
                  <li><strong>Rate</strong> - Precio (265,00, 433,00, etc.) - Se acepta formato con comas</li>
                </ul>
                <p className="mt-2 text-xs text-blue-700">
                  <strong>Nota:</strong> Los nombres de las columnas pueden tener variaciones (ej: "Route Area" o "RouteArea"). 
                  El sistema detectará automáticamente las columnas correctas. 
                  <strong>Usa la plantilla descargada como referencia.</strong>
                </p>
              </div>
            </div>

            {/* Selector de archivo */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="file-upload">Seleccionar archivo Excel</Label>
                <Input
                  id="file-upload"
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileSelect}
                  ref={fileInputRef}
                  disabled={isProcessing}
                />
              </div>

              {file && (
                <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-green-800">
                    Archivo seleccionado: {file.name}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClear}
                    className="ml-auto"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}

              {isProcessing && (
                <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <span className="text-sm text-blue-800">Procesando archivo...</span>
                </div>
              )}
            </div>

            {/* Barra de progreso de importación */}
            {isImporting && (
              <div className="space-y-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                    <span className="font-medium text-blue-900">Importando rutas...</span>
                  </div>
                  {canCancel && (
                    <Button variant="outline" size="sm" onClick={handleCancelImport}>
                      <Pause className="h-3 w-3 mr-1" />
                      Cancelar
                    </Button>
                  )}
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-blue-700">
                    <span>{importStatus}</span>
                    <span>{importProgress}%</span>
                  </div>
                  <Progress value={importProgress} className="h-2" />
                </div>
              </div>
            )}

            {/* Vista previa de datos */}
            {importedData.length > 0 && !isImporting && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Vista previa de datos ({importedData.length} rutas)</h4>
                  <div className="flex gap-2">
                    <Button onClick={handleImport} className="bg-green-600 hover:bg-green-700" disabled={isImporting}>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Importar {importedData.length} rutas
                    </Button>
                    <Button variant="outline" onClick={handleClear} disabled={isImporting}>
                      <X className="h-4 w-4 mr-2" />
                      Limpiar
                    </Button>
                  </div>
                </div>

                {/* Opciones de importación */}
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="overwrite-duplicates" 
                      checked={overwriteDuplicates}
                      onCheckedChange={(checked) => setOverwriteDuplicates(checked as boolean)}
                    />
                    <Label htmlFor="overwrite-duplicates" className="text-sm font-medium text-yellow-800">
                      Sobrescribir rutas duplicadas
                    </Label>
                  </div>
                  <p className="text-xs text-yellow-700 mt-1">
                    Si está marcado, las rutas que ya existen serán actualizadas. Si no, se omitirán.
                  </p>
                </div>


                <div className="max-h-60 overflow-y-auto border rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left">Billing</th>
                        <th className="px-3 py-2 text-left">Route Area</th>
                        <th className="px-3 py-2 text-left">Origin</th>
                        <th className="px-3 py-2 text-left">Destino</th>
                        <th className="px-3 py-2 text-left">Status</th>
                        <th className="px-3 py-2 text-left">Size</th>
                        <th className="px-3 py-2 text-left">Tipo</th>
                        <th className="px-3 py-2 text-left">Cliente</th>
                        <th className="px-3 py-2 text-left">Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importedData.slice(0, 10).map((route, index) => (
                        <tr key={index} className="border-b">
                          <td className="px-3 py-2">{route.billing}</td>
                          <td className="px-3 py-2">{route.routeArea}</td>
                          <td className="px-3 py-2">{route.origin}</td>
                          <td className="px-3 py-2">{route.destination}</td>
                          <td className="px-3 py-2">{route.status}</td>
                          <td className="px-3 py-2">{route.sizeContenedor}</td>
                          <td className="px-3 py-2">{route.tipo}</td>
                          <td className="px-3 py-2">{route.cliente}</td>
                          <td className="px-3 py-2">${route.rate.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {importedData.length > 10 && (
                    <div className="p-3 text-center text-sm text-gray-500">
                      ... y {importedData.length - 10} rutas más
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Botones de acción */}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
