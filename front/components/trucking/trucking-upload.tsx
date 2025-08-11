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
import { FileSpreadsheet, Upload, CheckCircle, Loader2, AlertCircle, CheckCircle2 } from "lucide-react"
import { 
  selectAllClients,
  fetchClients,
  createClientAsync,
  type Client
} from "@/lib/features/clients/clientsSlice"
import { ClientModal } from "@/components/clients-management"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"

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

  // Clients state
  const clients = useAppSelector(selectAllClients)
  const clientsLoading = useAppSelector((state) => state.clients.loading)

  // Missing clients management (replicating PTYSS logic)
  const [missingClients, setMissingClients] = useState<Array<{ name: string; records: TruckingExcelData[] }>>([])
  const [showClientModal, setShowClientModal] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [clientToEdit, setClientToEdit] = useState<{ name: string; records: TruckingExcelData[] } | null>(null)
  const [currentMissingIndex, setCurrentMissingIndex] = useState<number>(0)
  const [clientCompleteness, setClientCompleteness] = useState<Map<string, { isComplete: boolean; missingFields: string[] }>>(new Map())

  // Cargar rutas al montar el componente
  useEffect(() => {
    dispatch(fetchTruckingRoutes())
  }, [dispatch])

  // Load clients
  useEffect(() => {
    dispatch(fetchClients())
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

  const findClientByName = (name: string): Client | null => {
    return (
      clients.find((client: any) => {
        if (!name) return false
        if (client.type === "juridico") return client.companyName?.toLowerCase() === name.toLowerCase()
        if (client.type === "natural") return client.fullName?.toLowerCase() === name.toLowerCase()
        return false
      }) || null
    )
  }

  const checkClientCompleteness = (client: any): { isComplete: boolean; missingFields: string[] } => {
    const missing: string[] = []
    if (client.type === "juridico") {
      if (!client.companyName?.trim()) missing.push("Nombre de empresa")
      if (!client.ruc?.trim()) missing.push("RUC")
      if (!client.email?.trim()) missing.push("Email")
      if (!client.sapCode?.trim()) missing.push("Código SAP")
    } else {
      if (!client.fullName?.trim()) missing.push("Nombre completo")
      if (!client.documentNumber?.trim()) missing.push("Número de documento")
      if (!client.sapCode?.trim()) missing.push("Código SAP")
    }
    return { isComplete: missing.length === 0, missingFields: missing }
  }

  const updateClientCompleteness = (clientName: string) => {
    const updated = findClientByName(clientName)
    if (updated) {
      const completeness = checkClientCompleteness(updated)
      setClientCompleteness(prev => new Map(prev).set(clientName, completeness))
    }
  }

  const areAllClientsComplete = (): boolean => {
    if (clientCompleteness.size === 0) return true
    for (const [, completeness] of clientCompleteness) if (!completeness.isComplete) return false
    return true
  }

  const createTemporaryClient = async (name: string): Promise<Client> => {
    const temp: any = {
      type: "juridico",
      companyName: name,
      ruc: "",
      contactName: "",
      email: "",
      phone: "",
      address: "",
      sapCode: "",
      isActive: true,
    }
    const result = await dispatch(createClientAsync(temp as any)).unwrap()
    toast({ title: "Cliente temporal creado", description: `Se creó un cliente temporal para "${name}".` })
    return result
  }

  const handleClientClick = (clientName: string) => {
    const existing = findClientByName(clientName)
    if (existing) {
      setEditingClient(existing)
    } else if (clientName) {
      setEditingClient({
        type: "juridico",
        companyName: clientName,
        ruc: "",
        contactName: "",
        email: "",
        phone: "",
        address: "",
        sapCode: "",
        isActive: true,
      } as any)
    }
  }

  // When completeness map changes, refresh clients to recalc
  useEffect(() => {
    if (clientCompleteness.size > 0) dispatch(fetchClients())
  }, [clientCompleteness.size, dispatch])

  // Recompute completeness when clients list updates
  useEffect(() => {
    if (clients.length > 0 && clientCompleteness.size > 0) {
      const newMap = new Map<string, { isComplete: boolean; missingFields: string[] }>()
      for (const [clientName] of clientCompleteness) {
        const c = findClientByName(clientName)
        if (c) newMap.set(clientName, checkClientCompleteness(c))
      }
      setClientCompleteness(newMap)
    }
  }, [clients, clientCompleteness.size])

  const processMissingClients = async (excelData: TruckingExcelData[]): Promise<TruckingExcelData[]> => {
    const grouped = new Map<string, TruckingExcelData[]>()
    const newCompleteness = new Map<string, { isComplete: boolean; missingFields: string[] }>()
    excelData.forEach((record) => {
      const clientName = record.line?.trim()
      if (clientName && record.isMatched) {
        if (!grouped.has(clientName)) grouped.set(clientName, [])
        grouped.get(clientName)!.push(record)
      }
    })
    const missingList: Array<{ name: string; records: TruckingExcelData[] }> = []
    for (const [name, recs] of grouped) {
      const existing = findClientByName(name)
      if (!existing) {
        missingList.push({ name, records: recs })
        newCompleteness.set(name, { isComplete: false, missingFields: ["Todos los campos"] })
      } else {
        newCompleteness.set(name, checkClientCompleteness(existing))
      }
    }
    setClientCompleteness(newCompleteness)
    if (missingList.length > 0) {
      setMissingClients(missingList)
      setShowClientModal(true)
      setCurrentMissingIndex(0)
      setClientToEdit(missingList[0])
      const total = missingList.reduce((sum, c) => sum + c.records.length, 0)
      toast({ title: "Clientes faltantes detectados", description: `Se encontraron ${missingList.length} clientes faltantes para ${total} registros con match.` })
    }
    return excelData
  }

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
        
        // Procesar clientes faltantes antes de mostrar
        const processed = await processMissingClients(matchedData)
        setPreviewData(processed)
        
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

    // Verificar clientes completos
    if (!areAllClientsComplete()) {
      toast({
        title: "Clientes incompletos",
        description: "Hay clientes con datos incompletos. Completa todos los datos antes de guardar.",
        variant: "destructive",
      })
      return
    }

    // Verificación defensiva adicional basada en previewData actual
    const matchedRecords = previewData.filter(r => r.isMatched)
    const incompleteFromPreview = matchedRecords
      .map(rec => rec.line?.trim())
      .filter(Boolean)
      .map(name => ({
        name: name as string,
        client: findClientByName(name as string)
      }))
      .filter(({ client }) => !client || !checkClientCompleteness(client).isComplete)

    if (incompleteFromPreview.length > 0) {
      toast({
        title: "Clientes incompletos",
        description: `Faltan datos en ${incompleteFromPreview.length} cliente(s). Completa SAP y datos requeridos antes de guardar.`,
        variant: "destructive",
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
      
      const recordsData = previewData
        .filter((r) => r.isMatched)
        .map((record, index) => {
          const clientName = record.line?.trim() || ""
          const client = clientName ? clients.find((c: any) => {
            if (c.type === 'juridico') return c.companyName?.toLowerCase() === clientName.toLowerCase()
            if (c.type === 'natural') return c.fullName?.toLowerCase() === clientName.toLowerCase()
            return false
          }) : null
          const enriched = {
            ...record,
            // Guardar referencias del cliente real para facturación
            clientId: client?._id || client?.id || undefined,
            clientSapCode: client?.sapCode || undefined,
          }
          return {
            data: enriched, // Datos completos + cliente asociado
            totalValue: record.matchedPrice || 0, // Usar el precio de la ruta si está disponible
          }
        })
      
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
        description: `${result.length} registros con match guardados correctamente en el sistema (${previewData.length - recordsData.length} sin match omitidos)`
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

  const totalAmount = previewData.reduce((sum, record) => sum + (record.matchedPrice || 0), 0)
  const matchedCount = previewData.filter(record => record.isMatched).length
  const unmatchedCount = previewData.length - matchedCount

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
              <span className="ml-auto font-medium">Total: ${totalAmount.toFixed(2)}</span>
              {clientCompleteness.size > 0 && (
                <>
                  <Badge variant="outline" className="text-green-600 border-green-600">
                    {Array.from(clientCompleteness.values()).filter(c => c.isComplete).length} clientes completos
                  </Badge>
                  <Badge variant="outline" className="text-red-600 border-red-600">
                    {Array.from(clientCompleteness.values()).filter(c => !c.isComplete).length} clientes incompletos
                  </Badge>
                </>
              )}
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
                                      <TableHead>Sap Code</TableHead>

                    <TableHead>Plate</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Move Date</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Leg</TableHead>
                    <TableHead>Move Type</TableHead>
                    <TableHead>Precio</TableHead>

                    <TableHead>Estado</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewData.map((record, index) => {
                    const clientName = record.line?.trim()
                    const clientStatus = clientName ? clientCompleteness.get(clientName) : null
                    const isClickable = record.isMatched && clientStatus && !clientStatus.isComplete
                    return (
                    <TableRow key={index}>
                      <TableCell className="font-mono text-sm">{record.container}</TableCell>
                      <TableCell>{record.containerConsecutive}</TableCell>
                      <TableCell>{record.driverName}</TableCell>
                                            <TableCell>{record?.sapCode}</TableCell>

                      <TableCell>{record.plate}</TableCell>
                      <TableCell>{record.size}</TableCell>
                      <TableCell>{record.type}</TableCell>
                      <TableCell>{record.moveDate}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <span
                            className={isClickable ? "cursor-pointer text-blue-600 hover:text-blue-800 underline" : ""}
                            onClick={isClickable ? () => handleClientClick(clientName!) : undefined}
                          >
                            {record.line}
                          </span>
                          {record.isMatched && clientStatus && (
                            <div className="flex items-center">
                              {clientStatus.isComplete ? (
                                <Badge variant="outline" className="text-green-600 border-green-600 text-xs">
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  Completo
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-red-600 border-red-600 text-xs cursor-pointer" onClick={() => handleClientClick(clientName!)}>
                                  <AlertCircle className="h-3 w-3 mr-1" />
                                  Incompleto
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                      </TableCell>
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
                      <TableCell>
                        {!clientStatus || !clientStatus.isComplete ? (
                          <Button variant="outline" size="sm" onClick={() => handleClientClick(clientName || '')}>Completar datos</Button>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  )})}
                </TableBody>
              </Table>
            </div>
            
            <div className="mt-4 flex justify-end space-x-2">
              {!areAllClientsComplete() && (
                <div className="flex items-center space-x-2 text-sm text-red-600">
                  <AlertCircle className="h-4 w-4" />
                  <span>Completa todos los datos de clientes antes de guardar</span>
                </div>
              )}
              <Button 
                onClick={handleUpload}
                disabled={isLoading || isCreatingRecords || !areAllClientsComplete()}
                className={`${areAllClientsComplete() ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-400 cursor-not-allowed'}`}
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

      {/* Modal de Clientes (crear/editar) */}
      <ClientModal
        isOpen={!!editingClient}
        onClose={() => setEditingClient(null)}
        editingClient={editingClient}
        onClientCreated={(client) => {
          // Recalcular completitud
          const clientName = client.type === 'juridico' ? (client as any).companyName : (client as any).fullName
          updateClientCompleteness(clientName)
          setEditingClient(null)
          // Si veníamos del flujo de faltantes, avanzar al siguiente automáticamente
          if (missingClients.length > 0) {
            // buscar por nombre actual en missingClients
            const currentIndex = missingClients.findIndex(mc => mc.name.toLowerCase() === clientName.toLowerCase())
            const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % missingClients.length : 0
            if (missingClients.length > 1) {
              setClientToEdit(missingClients[nextIndex])
              setShowClientModal(true)
            }
          }
        }}
      />

      {/* Modal para clientes faltantes del Excel */}
      {showClientModal && clientToEdit && (
        <Dialog open={showClientModal} onOpenChange={setShowClientModal}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Cliente Faltante ({missingClients.indexOf(clientToEdit) + 1}/{missingClients.length}): {clientToEdit.name}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="h-5 w-5 text-yellow-600" />
                  <h4 className="font-medium text-yellow-800">Cliente no encontrado</h4>
                </div>
                <p className="text-sm text-yellow-700 mt-2">
                  El cliente "{clientToEdit.name}" no existe en la base de datos. Se encontraron {clientToEdit.records.length} registros con match para este cliente en el Excel.
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium">Registros con match asociados:</h4>
                <div className="max-h-40 overflow-y-auto border rounded-lg p-2">
                  {clientToEdit.records.slice(0, 5).map((record, index) => (
                    <div key={index} className="text-sm text-muted-foreground py-1">• {record.containerConsecutive} - {record.container} ({record.size}' {record.type})</div>
                  ))}
                  {clientToEdit.records.length > 5 && (
                    <div className="text-sm text-muted-foreground py-1">... y {clientToEdit.records.length - 5} registros más</div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">Solo se muestran registros que hicieron match con las rutas configuradas.</p>
              </div>
              <div className="flex justify-between items-center space-x-2">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      const currentIndex = missingClients.indexOf(clientToEdit)
                      const prevIndex = (currentIndex - 1 + missingClients.length) % missingClients.length
                      setClientToEdit(missingClients[prevIndex])
                    }}
                    disabled={missingClients.length <= 1}
                  >
                    ← Anterior
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      const currentIndex = missingClients.indexOf(clientToEdit)
                      const nextIndex = (currentIndex + 1) % missingClients.length
                      setClientToEdit(missingClients[nextIndex])
                    }}
                    disabled={missingClients.length <= 1}
                  >
                    Siguiente →
                  </Button>
                </div>
                <Button
                  variant="outline"
                  onClick={() => {
                    createTemporaryClient(clientToEdit.name).then(() => {
                      updateClientCompleteness(clientToEdit.name)
                      // avanzar o cerrar
                      if (missingClients.length > 1) {
                        const currentIndex = missingClients.indexOf(clientToEdit)
                        const nextIndex = (currentIndex + 1) % missingClients.length
                        setClientToEdit(missingClients[nextIndex])
                      } else {
                        setShowClientModal(false)
                      }
                    })
                  }}
                >
                  Crear Cliente Temporal
                </Button>
                <Button
                  onClick={() => {
                    setEditingClient({
                      type: "juridico",
                      companyName: clientToEdit.name,
                      ruc: "",
                      contactName: "",
                      email: "",
                      phone: "",
                      address: "",
                      sapCode: "",
                      isActive: true,
                    } as any)
                    // cerrar modal para abrir editor
                    setShowClientModal(false)
                  }}
                >
                  Editar Datos del Cliente
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
