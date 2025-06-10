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
import { Users, Upload, FileSpreadsheet, Eye, Plus, Download } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { useAppDispatch, useAppSelector } from "@/lib/hooks"
import { addExcelFile, type ExcelFile } from "@/lib/features/excel/excelSlice"
import { addRecords, type ServiceRecord } from "@/lib/features/records/recordsSlice"
import { simulateExcelParse } from "@/lib/excel-parser-simulator"

export function AgencyUpload() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [excelType, setExcelType] = useState("")
  const [previewData, setPreviewData] = useState<any[]>([])
  const [showPreview, setShowPreview] = useState(false)
  const [showManualEntry, setShowManualEntry] = useState(false)
  const { toast } = useToast()
  const dispatch = useAppDispatch()
  const filesInStore = useAppSelector((state) => state.excel.files)

  const excelTypes = [
    {
      value: "crew-transport",
      label: "Transporte de Tripulación",
      description: "Servicios de transporte de tripulantes",
    },
    { value: "crew-manifest", label: "Manifiesto de Tripulación", description: "Lista de tripulantes por buque" },
    { value: "transport-schedule", label: "Horarios de Transporte", description: "Programación de transportes" },
    {
      value: "driver-assignment",
      label: "Asignación de Drivers",
      description: "Asignación de conductores a servicios",
    },
  ]

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && excelType) {
      setSelectedFile(file)

      // Simular el parseo del archivo para generar datos dinámicos
      const dynamicData = simulateExcelParse("agency", excelType)

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
      "crew-transport": [
        { name: "vesselName", label: "Nombre del Buque", type: "text", required: true },
        { name: "voyage", label: "Número de Viaje", type: "text", required: true },
        { name: "crewMember", label: "Nombre del Tripulante", type: "text", required: true },
        {
          name: "rank",
          label: "Rango",
          type: "select",
          options: ["Captain", "Chief Officer", "Chief Engineer", "Third Engineer", "Officer", "Crew"],
          required: true,
        },
        {
          name: "nationality",
          label: "Nacionalidad",
          type: "select",
          options: ["PHILIPPINES", "INDIA", "UKRAINE", "ROMANIA", "RUSSIA"],
          required: true,
        },
        {
          name: "pickupLocation",
          label: "Lugar de Recogida",
          type: "select",
          options: ["Aeropuerto Tocumen", "Hotel Marriott", "Puerto de Balboa", "Puerto de Cristóbal"],
          required: true,
        },
        {
          name: "dropoffLocation",
          label: "Lugar de Destino",
          type: "select",
          options: ["Aeropuerto Tocumen", "Hotel Marriott", "Puerto de Balboa", "Puerto de Cristóbal"],
          required: true,
        },
        { name: "pickupTime", label: "Hora de Recogida", type: "time", required: true },
        {
          name: "vehicleType",
          label: "Tipo de Vehículo",
          type: "select",
          options: ["Sedan", "Van", "Bus", "Luxury"],
          required: true,
        },
        {
          name: "driver",
          label: "Driver",
          type: "select",
          options: ["Roberto Mendoza", "Ana García", "Luis Herrera"],
          required: false,
        },
        { name: "baseRate", label: "Tarifa Base", type: "number", required: true },
      ],
      "crew-manifest": [
        { name: "vesselName", label: "Nombre del Buque", type: "text", required: true },
        { name: "voyage", label: "Número de Viaje", type: "text", required: true },
        { name: "crewMember", label: "Nombre del Tripulante", type: "text", required: true },
        {
          name: "rank",
          label: "Rango",
          type: "select",
          options: ["Captain", "Chief Officer", "Chief Engineer", "Third Engineer", "Officer", "Crew"],
          required: true,
        },
        {
          name: "nationality",
          label: "Nacionalidad",
          type: "select",
          options: ["PHILIPPINES", "INDIA", "UKRAINE", "ROMANIA", "RUSSIA"],
          required: true,
        },
        { name: "passport", label: "Número de Pasaporte", type: "text", required: true },
        { name: "seamanBook", label: "Libreta de Mar", type: "text", required: true },
        { name: "joinDate", label: "Fecha de Embarque", type: "date", required: true },
        { name: "signOffDate", label: "Fecha de Desembarque", type: "date", required: true },
        {
          name: "transportRequired",
          label: "Requiere Transporte",
          type: "select",
          options: ["Sí", "No"],
          required: true,
        },
        { name: "specialRequirements", label: "Requerimientos Especiales", type: "text", required: false },
      ],
      "transport-schedule": [
        { name: "date", label: "Fecha", type: "date", required: true },
        { name: "time", label: "Hora", type: "time", required: true },
        { name: "vesselName", label: "Nombre del Buque", type: "text", required: true },
        { name: "voyageNumber", label: "Número de Viaje", type: "text", required: true },
        { name: "pickupLocation", label: "Lugar de Recogida", type: "text", required: true },
        { name: "dropoffLocation", label: "Lugar de Destino", type: "text", required: true },
        { name: "driver", label: "Conductor", type: "text", required: true },
        { name: "vehicle", label: "Vehículo", type: "text", required: true },
        { name: "notes", label: "Notas", type: "text", required: false },
      ],
      "driver-assignment": [
        { name: "date", label: "Fecha", type: "date", required: true },
        { name: "time", label: "Hora", type: "time", required: true },
        { name: "driverName", label: "Nombre del Conductor", type: "text", required: true },
        { name: "vehicle", label: "Vehículo", type: "text", required: true },
        { name: "vesselName", label: "Nombre del Buque", type: "text", required: true },
        { name: "voyageNumber", label: "Número de Viaje", type: "text", required: true },
        { name: "pickupLocation", label: "Lugar de Recogida", type: "text", required: true },
        { name: "dropoffLocation", label: "Lugar de Destino", type: "text", required: true },
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

    const excelId = `excel-agen-${Date.now()}`
    const newExcelFile: ExcelFile = {
      id: excelId,
      filename: selectedFile.name,
      uploadDate: new Date().toISOString(),
      status: "pendiente",
      type: excelType,
      module: "agency",
      records: previewData.map((record, index) => ({ ...record, id: `${excelId}-record-${index}` })),
      totalValue: previewData.reduce((sum, record) => sum + (record.totalRate || 0), 0),
    }

    dispatch(addExcelFile(newExcelFile))

    const serviceRecords: ServiceRecord[] = newExcelFile.records.map(
      (rec) =>
        ({
          id: `service-${rec.id}`,
          excelFileId: newExcelFile.id,
          originalRecordId: rec.id,
          module: "agency",
          type: newExcelFile.type,
          description: `Transporte: ${rec.crewMember} (${rec.rank})` || "Servicio Agency",
          quantity: 1, // Asumir 1 por transporte
          unitPrice: rec.totalRate || 0,
          totalPrice: rec.totalRate || 0,
          date: newExcelFile.uploadDate, // O una fecha específica del registro si existe
          status: "pendiente",
          vesselName: rec.vesselName,
          voyage: rec.voyage,
          // ... otros campos relevantes de Agency
          crewMember: rec.crewMember,
          pickupLocation: rec.pickupLocation,
          dropoffLocation: rec.dropoffLocation,
        }) as ServiceRecord,
    )
    dispatch(addRecords(serviceRecords))

    toast({
      title: "Excel Guardado en Redux",
      description: `${selectedFile.name} ha sido procesado y guardado.`,
    })
    setSelectedFile(null)
    setPreviewData([])
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-purple-500 flex items-center justify-center">
          <Users className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Subir Excel - Agency</h1>
          <p className="text-muted-foreground">Importa datos de transporte de tripulaciones desde archivos Excel</p>
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
                <FileSpreadsheet className="h-5 w-5 text-purple-500 mt-0.5" />
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
                    {excelType === "crew-transport" && (
                      <>
                        <TableHead>Buque</TableHead>
                        <TableHead>Viaje</TableHead>
                        <TableHead>Tripulante</TableHead>
                        <TableHead>Rango</TableHead>
                        <TableHead>Origen</TableHead>
                        <TableHead>Destino</TableHead>
                        <TableHead>Tarifa</TableHead>
                        <TableHead>Estado</TableHead>
                      </>
                    )}
                    {excelType === "crew-manifest" && (
                      <>
                        <TableHead>Buque</TableHead>
                        <TableHead>Viaje</TableHead>
                        <TableHead>Tripulante</TableHead>
                        <TableHead>Rango</TableHead>
                        <TableHead>Nacionalidad</TableHead>
                        <TableHead>Embarque</TableHead>
                        <TableHead>Transporte</TableHead>
                      </>
                    )}
                    {excelType === "transport-schedule" && (
                      <>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Hora</TableHead>
                        <TableHead>Buque</TableHead>
                        <TableHead>Viaje</TableHead>
                        <TableHead>Origen</TableHead>
                        <TableHead>Destino</TableHead>
                      </>
                    )}
                    {excelType === "driver-assignment" && (
                      <>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Hora</TableHead>
                        <TableHead>Conductor</TableHead>
                        <TableHead>Vehículo</TableHead>
                        <TableHead>Buque</TableHead>
                        <TableHead>Viaje</TableHead>
                      </>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewData.slice(0, 5).map((row, index) => (
                    <TableRow key={index}>
                      {excelType === "crew-transport" && (
                        <>
                          <TableCell className="font-medium">{row.vesselName}</TableCell>
                          <TableCell>{row.voyage}</TableCell>
                          <TableCell>{row.crewMember}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{row.rank}</Badge>
                          </TableCell>
                          <TableCell>{row.pickupLocation}</TableCell>
                          <TableCell>{row.dropoffLocation}</TableCell>
                          <TableCell>${row.totalRate}</TableCell>
                          <TableCell>
                            <Badge variant={row.status === "Completado" ? "success" : "default"}>{row.status}</Badge>
                          </TableCell>
                        </>
                      )}
                      {excelType === "crew-manifest" && (
                        <>
                          <TableCell className="font-medium">{row.vesselName}</TableCell>
                          <TableCell>{row.voyage}</TableCell>
                          <TableCell>{row.crewMember}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{row.rank}</Badge>
                          </TableCell>
                          <TableCell>{row.nationality}</TableCell>
                          <TableCell>{new Date(row.joinDate).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <Badge variant={row.transportRequired === "Sí" ? "default" : "secondary"}>
                              {row.transportRequired}
                            </Badge>
                          </TableCell>
                        </>
                      )}
                      {excelType === "transport-schedule" && (
                        <>
                          <TableCell>{row.date}</TableCell>
                          <TableCell>{row.time}</TableCell>
                          <TableCell className="font-medium">{row.vesselName}</TableCell>
                          <TableCell>{row.voyageNumber}</TableCell>
                          <TableCell>{row.pickupLocation}</TableCell>
                          <TableCell>{row.dropoffLocation}</TableCell>
                        </>
                      )}
                      {excelType === "driver-assignment" && (
                        <>
                          <TableCell>{row.date}</TableCell>
                          <TableCell>{row.time}</TableCell>
                          <TableCell className="font-medium">{row.driverName}</TableCell>
                          <TableCell>{row.vehicle}</TableCell>
                          <TableCell className="font-medium">{row.vesselName}</TableCell>
                          <TableCell>{row.voyageNumber}</TableCell>
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
            <DialogTitle>Vista Detallada - Agency</DialogTitle>
          </DialogHeader>
          {/* Aquí iría la tabla detallada, similar a ExcelPreviewModal */}
          <p>Implementar tabla detallada aquí</p>
        </DialogContent>
      </Dialog>

      <Dialog open={showManualEntry} onOpenChange={setShowManualEntry}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Entrada Manual - {excelTypes.find((t) => t.value === excelType)?.label || ""}</DialogTitle>
          </DialogHeader>
          {/* Aquí iría el formulario de entrada manual, similar a ManualEntryForm */}
          <p>Implementar formulario de entrada manual aquí</p>
        </DialogContent>
      </Dialog>
    </div>
  )
}
