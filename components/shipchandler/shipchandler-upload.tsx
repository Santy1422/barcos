"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Ship, Upload, FileSpreadsheet, Eye, Plus, Download } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { ManualEntryForm } from "@/components/manual-entry-form" // Import ManualEntryForm
import { useAppDispatch, useAppSelector } from "@/lib/hooks"
import { addExcelFile, type ExcelFile } from "@/lib/features/excel/excelSlice"
import { addRecords, type ServiceRecord } from "@/lib/features/records/recordsSlice"
import { simulateExcelParse } from "@/lib/excel-parser-simulator"

export function ShipchandlerUpload() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [excelType, setExcelType] = useState("")
  const [previewData, setPreviewData] = useState<any[]>([])
  const [showPreview, setShowPreview] = useState(false)
  const [showManualEntry, setShowManualEntry] = useState(false)
  const { toast } = useToast()
  const dispatch = useAppDispatch()
  const filesInStore = useAppSelector((state) => state.excel.files)

  const excelTypes = [
    { value: "supply-order", label: "Orden de Suministros", description: "Órdenes de abastecimiento a barcos" },
    { value: "inventory", label: "Inventario", description: "Control de stock de productos" },
    { value: "vessel-manifest", label: "Manifiesto de Buque", description: "Datos del buque y tripulación" },
    { value: "delivery-note", label: "Nota de Entrega", description: "Confirmación de entregas realizadas" },
  ]

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && excelType) {
      setSelectedFile(file)

      // Simular el parseo del archivo para generar datos dinámicos
      const dynamicData = simulateExcelParse("shipchandler", excelType)

      if (dynamicData.length > 0) {
        setPreviewData(dynamicData)
        toast({
          title: "Vista previa generada dinámicamente",
          description: `Se han simulado ${dynamicData.length} registros para el archivo ${file.name}.`,
        })
      } else {
        setPreviewData([])
        toast({
          title: "Sin datos simulados",
          description: `El tipo de Excel "${excelType}" no tiene un generador de datos de simulación.`,
          variant: "destructive",
        })
      }
    }
  }

  const handleManualEntrySubmit = (data: any) => {
    const newEntry = {
      id: previewData.length + 1,
      ...data,
      status: "Manual",
    }
    setPreviewData([...previewData, newEntry])
    setShowManualEntry(false)
    toast({
      title: "Éxito",
      description: "Entrada manual agregada correctamente.",
    })
  }

  const getFieldsForType = (type: string) => {
    const fields = {
      "supply-order": [
        { name: "vesselName", label: "Nombre del Buque", type: "text", required: true },
        { name: "vesselIMO", label: "IMO del Buque", type: "text", required: true },
        { name: "eta", label: "ETA", type: "datetime-local", required: true },
        { name: "etd", label: "ETD", type: "datetime-local", required: true },
        { name: "agent", label: "Agente", type: "text", required: true },
        { name: "productCode", label: "Código Producto", type: "text", required: true },
        { name: "productName", label: "Nombre Producto", type: "text", required: true },
        { name: "quantity", label: "Cantidad", type: "number", required: true },
        { name: "unit", label: "Unidad", type: "select", options: ["MT", "Kg", "Litros", "Unidad"], required: true },
        { name: "unitPrice", label: "Precio Unitario", type: "number", required: true },
        { name: "supplier", label: "Proveedor", type: "text", required: true },
        { name: "deliveryDate", label: "Fecha Entrega", type: "date", required: true },
      ],
      inventory: [
        { name: "productCode", label: "Código Producto", type: "text", required: true },
        { name: "productName", label: "Nombre Producto", type: "text", required: true },
        {
          name: "category",
          label: "Categoría",
          type: "select",
          options: ["Combustibles", "Alimentos", "Agua", "Repuestos"],
          required: true,
        },
        { name: "currentStock", label: "Stock Actual", type: "number", required: true },
        { name: "unit", label: "Unidad", type: "select", options: ["MT", "Kg", "Litros", "Unidad"], required: true },
        { name: "minStock", label: "Stock Mínimo", type: "number", required: true },
        { name: "maxStock", label: "Stock Máximo", type: "number", required: true },
        { name: "unitCost", label: "Costo Unitario", type: "number", required: true },
        { name: "supplier", label: "Proveedor", type: "text", required: true },
        { name: "location", label: "Ubicación", type: "text", required: true },
      ],
      "vessel-manifest": [
        { name: "vesselName", label: "Nombre del Buque", type: "text", required: true },
        { name: "vesselIMO", label: "IMO del Buque", type: "text", required: true },
        { name: "flag", label: "Bandera", type: "text", required: true },
        { name: "captain", label: "Capitán", type: "text", required: true },
        { name: "crewCount", label: "Cantidad de Tripulantes", type: "number", required: true },
        { name: "lastPort", label: "Último Puerto", type: "text", required: true },
        { name: "nextPort", label: "Próximo Puerto", type: "text", required: true },
        { name: "departureDate", label: "Fecha de Salida", type: "date", required: true },
        { name: "arrivalDate", label: "Fecha de Arribo", type: "date", required: true },
      ],
      "delivery-note": [
        { name: "deliveryNoteNumber", label: "Número de Nota de Entrega", type: "text", required: true },
        { name: "vesselName", label: "Nombre del Buque", type: "text", required: true },
        { name: "vesselIMO", label: "IMO del Buque", type: "text", required: true },
        { name: "deliveryDate", label: "Fecha de Entrega", type: "date", required: true },
        { name: "productCode", label: "Código de Producto", type: "text", required: true },
        { name: "productName", label: "Nombre del Producto", type: "text", required: true },
        { name: "quantityDelivered", label: "Cantidad Entregada", type: "number", required: true },
        { name: "unit", label: "Unidad", type: "select", options: ["MT", "Kg", "Litros", "Unidad"], required: true },
        { name: "supplier", label: "Proveedor", type: "text", required: true },
        { name: "receiver", label: "Recibidor", type: "text", required: true },
      ],
    }
    return fields[type as keyof typeof fields] || []
  }

  const handleProcessAndSaveFile = () => {
    if (!selectedFile || !excelType || previewData.length === 0) {
      toast({
        title: "Error",
        description: "Selecciona un tipo, un archivo y asegúrate de que haya datos en la vista previa.",
        variant: "destructive",
      })
      return
    }

    const excelId = `excel-ship-${Date.now()}`
    const newExcelFile: ExcelFile = {
      id: excelId,
      filename: selectedFile.name,
      uploadDate: new Date().toISOString(),
      status: "pendiente",
      type: excelType,
      module: "shipchandler",
      records: previewData.map((record, index) => ({ ...record, id: `${excelId}-record-${index}` })), // Asegurar IDs únicos para records
      totalValue: previewData.reduce((sum, record) => sum + (record.totalPrice || 0), 0),
    }

    dispatch(addExcelFile(newExcelFile))

    // Crear ServiceRecords para el recordsSlice global
    const serviceRecords: ServiceRecord[] = newExcelFile.records.map(
      (rec) =>
        ({
          id: `service-${rec.id}`, // ID único global para el servicio
          excelFileId: newExcelFile.id,
          originalRecordId: rec.id, // ID del registro dentro del Excel
          module: "shipchandler",
          type: newExcelFile.type,
          description: rec.productName || "Servicio Shipchandler",
          quantity: rec.quantity || 1,
          unitPrice: rec.unitPrice || 0,
          totalPrice: rec.totalPrice || 0,
          date: rec.deliveryDate || newExcelFile.uploadDate,
          status: "pendiente",
          vesselName: rec.vesselName,
          // ... otros campos relevantes de Shipchandler
          productCode: rec.productCode,
          supplier: rec.supplier,
        }) as ServiceRecord,
    )
    dispatch(addRecords(serviceRecords))

    toast({
      title: "Excel Guardado en Redux",
      description: `${selectedFile.name} ha sido procesado y guardado.`,
    })
    setSelectedFile(null)
    // setExcelType(""); // Opcional: resetear tipo
    setPreviewData([])
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-green-500 flex items-center justify-center">
          <Ship className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Subir Excel - Shipchandler</h1>
          <p className="text-muted-foreground">Importa datos de abastecimiento a barcos desde archivos Excel</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Cargar Archivo Excel</CardTitle>
            <CardDescription>Selecciona el tipo de datos y sube tu archivo Excel</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="excel-type">Tipo de Excel</Label>
              <Select value={excelType} onValueChange={setExcelType}>
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
                onChange={handleFileUpload}
                disabled={!excelType}
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleProcessAndSaveFile}
                disabled={!selectedFile || !excelType || previewData.length === 0}
                className="flex-1"
              >
                <Upload className="mr-2 h-4 w-4" />
                Procesar y Guardar en Redux
              </Button>
              <Button variant="outline" onClick={() => setShowManualEntry(true)} disabled={!excelType}>
                <Plus className="mr-2 h-4 w-4" />
                Entrada Manual
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tipos de Excel Soportados</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {excelTypes.map((type) => (
              <div key={type.value} className="flex items-start space-x-3">
                <FileSpreadsheet className="h-5 w-5 text-green-500 mt-0.5" />
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
              <span>Vista Previa de Datos</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowPreview(true)}>
                  <Eye className="mr-2 h-4 w-4" />
                  Ver Detalles
                </Button>
                <Button variant="outline" size="sm">
                  <Download className="mr-2 h-4 w-4" />
                  Exportar
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    {excelType === "supply-order" && (
                      <>
                        <TableHead>Buque</TableHead>
                        <TableHead>IMO</TableHead>
                        <TableHead>ETA</TableHead>
                        <TableHead>Producto</TableHead>
                        <TableHead>Cantidad</TableHead>
                        <TableHead>Precio Total</TableHead>
                        <TableHead>Estado</TableHead>
                      </>
                    )}
                    {excelType === "inventory" && (
                      <>
                        <TableHead>Código</TableHead>
                        <TableHead>Producto</TableHead>
                        <TableHead>Categoría</TableHead>
                        <TableHead>Stock Actual</TableHead>
                        <TableHead>Unidad</TableHead>
                        <TableHead>Valor Total</TableHead>
                        <TableHead>Ubicación</TableHead>
                      </>
                    )}
                    {excelType === "vessel-manifest" && (
                      <>
                        <TableHead>Buque</TableHead>
                        <TableHead>IMO</TableHead>
                        <TableHead>Bandera</TableHead>
                        <TableHead>Capitán</TableHead>
                        <TableHead>Tripulantes</TableHead>
                        <TableHead>Próximo Puerto</TableHead>
                      </>
                    )}
                    {excelType === "delivery-note" && (
                      <>
                        <TableHead>Número de Nota</TableHead>
                        <TableHead>Buque</TableHead>
                        <TableHead>Producto</TableHead>
                        <TableHead>Cantidad</TableHead>
                        <TableHead>Unidad</TableHead>
                        <TableHead>Proveedor</TableHead>
                      </>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewData.slice(0, 5).map((row, index) => (
                    <TableRow key={index}>
                      {excelType === "supply-order" && (
                        <>
                          <TableCell className="font-medium">{row.vesselName}</TableCell>
                          <TableCell>{row.vesselIMO}</TableCell>
                          <TableCell>{new Date(row.eta).toLocaleDateString()}</TableCell>
                          <TableCell>{row.productName}</TableCell>
                          <TableCell>
                            {row.quantity} {row.unit}
                          </TableCell>
                          <TableCell>${row.totalPrice?.toLocaleString()}</TableCell>
                          <TableCell>
                            <Badge variant={row.status === "Confirmado" ? "success" : "default"}>{row.status}</Badge>
                          </TableCell>
                        </>
                      )}
                      {excelType === "inventory" && (
                        <>
                          <TableCell className="font-medium">{row.productCode}</TableCell>
                          <TableCell>{row.productName}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{row.category}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={row.currentStock > row.minStock ? "success" : "destructive"}>
                              {row.currentStock}
                            </Badge>
                          </TableCell>
                          <TableCell>{row.unit}</TableCell>
                          <TableCell>${row.totalValue?.toLocaleString()}</TableCell>
                          <TableCell>{row.location}</TableCell>
                        </>
                      )}
                      {excelType === "vessel-manifest" && (
                        <>
                          <TableCell className="font-medium">{row.vesselName}</TableCell>
                          <TableCell>{row.vesselIMO}</TableCell>
                          <TableCell>{row.flag}</TableCell>
                          <TableCell>{row.captain}</TableCell>
                          <TableCell>{row.crewCount}</TableCell>
                          <TableCell>{row.nextPort}</TableCell>
                        </>
                      )}
                      {excelType === "delivery-note" && (
                        <>
                          <TableCell className="font-medium">{row.deliveryNoteNumber}</TableCell>
                          <TableCell>{row.vesselName}</TableCell>
                          <TableCell>{row.productName}</TableCell>
                          <TableCell>
                            {row.quantityDelivered} {row.unit}
                          </TableCell>
                          <TableCell>{row.supplier}</TableCell>
                        </>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {previewData.length > 5 && (
              <div className="text-center text-sm text-muted-foreground mt-4">
                Mostrando 5 de {previewData.length} registros. Haz clic en "Ver Detalles" para ver todos.
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Vista Detallada - Shipchandler</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <pre>{JSON.stringify(previewData, null, 2)}</pre>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showManualEntry} onOpenChange={setShowManualEntry}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Entrada Manual - {excelTypes.find((t) => t.value === excelType)?.label || ""}</DialogTitle>
          </DialogHeader>
          <ManualEntryForm
            isOpen={showManualEntry}
            onClose={() => setShowManualEntry(false)}
            onSubmit={handleManualEntrySubmit}
            fields={getFieldsForType(excelType)}
            title={`Entrada Manual - ${excelTypes.find((t) => t.value === excelType)?.label || ""}`}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
