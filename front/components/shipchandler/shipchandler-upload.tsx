"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useAppDispatch, useAppSelector } from "@/lib/hooks"
import { selectCurrentUser } from "@/lib/features/auth/authSlice"
import { createShipChandlerRecords, createShipChandlerRecordsAsync, getUploadJobStatus, selectCreatingRecords, selectRecordsError } from "@/lib/features/records/recordsSlice"
import { addExcelFile } from "@/lib/features/excel/excelSlice"
import { parseShipChandlerExcel, ShipChandlerExcelData } from "@/lib/excel-parser"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { FileSpreadsheet, Upload, CheckCircle, Loader2, AlertCircle, CheckCircle2 } from "lucide-react"
import { 
  selectAllClients,
  fetchClients,
  type Client
} from "@/lib/features/clients/clientsSlice"
import { ClientModal } from "@/components/clients-management"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

export function ShipChandlerUpload() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewData, setPreviewData] = useState<ShipChandlerExcelData[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // Estado para el procesamiento asíncrono de uploads
  const [uploadJob, setUploadJob] = useState<{
    jobId: string | null
    status: 'idle' | 'pending' | 'processing' | 'completed' | 'failed'
    progress: number
    totalRecords: number
    processedRecords: number
    createdRecords: number
    duplicateRecords: number
    errorRecords: number
    message: string
  }>({
    jobId: null,
    status: 'idle',
    progress: 0,
    totalRecords: 0,
    processedRecords: 0,
    createdRecords: 0,
    duplicateRecords: 0,
    errorRecords: 0,
    message: ''
  })
  
  const dispatch = useAppDispatch()
  const { toast } = useToast()
  const currentUser = useAppSelector(selectCurrentUser)
  
  // Verificar permisos para gestionar clientes
  const userRoles = currentUser?.roles || (currentUser?.role ? [currentUser.role] : [])
  const canManageClients = userRoles.includes('administrador') || userRoles.includes('clientes')
  
  // Add this line to get the creating records state from Redux
  const isCreatingRecords = useAppSelector(selectCreatingRecords)
  const recordsError = useAppSelector(selectRecordsError)

  // Clients state
  const clients = useAppSelector(selectAllClients)
  const clientsLoading = useAppSelector((state) => state.clients.loading)

  // Missing clients management
  const [missingClients, setMissingClients] = useState<Array<{ name: string; records: ShipChandlerExcelData[] }>>([])
  const [showClientModal, setShowClientModal] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [clientToEdit, setClientToEdit] = useState<{ name: string; records: ShipChandlerExcelData[] } | null>(null)
  const [currentMissingIndex, setCurrentMissingIndex] = useState<number>(0)
  const [clientCompleteness, setClientCompleteness] = useState<Map<string, { isComplete: boolean; missingFields: string[] }>>(new Map())

  // Load clients - Solo clientes del módulo shipchandler
  useEffect(() => {
    dispatch(fetchClients('shipchandler'))
  }, [dispatch])

  // Polling para monitorear el estado del job de upload
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const pollJobStatus = useCallback(async (jobId: string) => {
    try {
      const result = await dispatch(getUploadJobStatus(jobId)).unwrap()
      console.log("📊 Job status:", result)

      setUploadJob(prev => ({
        ...prev,
        status: result.status,
        progress: result.progress || 0,
        totalRecords: result.totalRecords || 0,
        processedRecords: result.processedRecords || 0,
        createdRecords: result.createdRecords || 0,
        duplicateRecords: result.duplicateRecords || 0,
        errorRecords: result.errorRecords || 0,
        message: result.result?.message || ''
      }))

      if (result.status === 'completed' || result.status === 'failed') {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current)
          pollingIntervalRef.current = null
        }

        if (result.status === 'completed') {
          toast({
            title: "Carga completada",
            description: `${result.createdRecords || 0} registros creados, ${result.duplicateRecords || 0} duplicados, ${result.errorRecords || 0} errores`
          })
          setPreviewData([])
          setSelectedFile(null)
          setClientCompleteness(new Map())
        } else {
          toast({
            title: "Error en la carga",
            description: result.result?.message || "Hubo un error procesando los registros",
            variant: "destructive"
          })
        }

        setTimeout(() => {
          setUploadJob({
            jobId: null,
            status: 'idle',
            progress: 0,
            totalRecords: 0,
            processedRecords: 0,
            createdRecords: 0,
            duplicateRecords: 0,
            errorRecords: 0,
            message: ''
          })
        }, 3000)
      }
    } catch (error) {
      console.error("Error polling job status:", error)
    }
  }, [dispatch, toast])

  useEffect(() => {
    if (uploadJob.jobId && (uploadJob.status === 'pending' || uploadJob.status === 'processing')) {
      pollingIntervalRef.current = setInterval(() => {
        pollJobStatus(uploadJob.jobId!)
      }, 2000)
      pollJobStatus(uploadJob.jobId)
    }

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
        pollingIntervalRef.current = null
      }
    }
  }, [uploadJob.jobId, uploadJob.status, pollJobStatus])

  // Helper function to find client by name (busca por campo 'name' para jurídicos, no 'companyName')
  const findClientByName = (name: string): Client | null => {
    return (
      clients.find((client: any) => {
        if (!name) return false
        if (client.type === "juridico") {
          // Para clientes jurídicos, buscar por nombre corto (name) en lugar de companyName
          return client.name?.toLowerCase() === name.toLowerCase()
        }
        if (client.type === "natural") return client.fullName?.toLowerCase() === name.toLowerCase()
        return false
      }) || null
    )
  }

  // Helper function to find client by name in module
  const findClientByNameInModule = (name: string, module: string): Client | null => {
    return (
      clients.find((client: any) => {
        if (!name) return false
        
        // Verificar que el cliente esté asignado al módulo especificado
        const clientModules = client.module || []
        if (!clientModules.includes(module)) return false
        
        if (client.type === "juridico") {
          // Para clientes jurídicos, buscar por nombre corto (name) en lugar de companyName
          return client.name?.toLowerCase() === name.toLowerCase()
        }
        if (client.type === "natural") return client.fullName?.toLowerCase() === name.toLowerCase()
        return false
      }) || null
    )
  }

  // Helper function to check client completeness
  const checkClientCompleteness = (client: any): { isComplete: boolean; missingFields: string[] } => {
    const missing: string[] = []
    if (client.type === "juridico") {
      if (!client.companyName?.trim()) missing.push("Nombre de empresa")
      if (!client.name?.trim()) missing.push("Nombre corto")
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

  const processMissingClients = async (excelData: ShipChandlerExcelData[]): Promise<ShipChandlerExcelData[]> => {
    const grouped = new Map<string, ShipChandlerExcelData[]>()
    const newCompleteness = new Map<string, { isComplete: boolean; missingFields: string[] }>()
    
    // Agrupar registros por cliente (customerName)
    excelData.forEach((record) => {
      const clientName = record.customerName?.trim()
      if (clientName) {
        if (!grouped.has(clientName)) grouped.set(clientName, [])
        grouped.get(clientName)!.push(record)
      }
    })
    
    const missingList: Array<{ name: string; records: ShipChandlerExcelData[] }> = []
    
    // Verificar cada cliente encontrado en el Excel
    for (const [name, recs] of grouped) {
      // Buscar cliente en el módulo shipchandler específicamente
      const existingInModule = findClientByNameInModule(name, 'shipchandler')
      if (!existingInModule) {
        // Cliente no existe en el módulo shipchandler, agregarlo a la lista de faltantes
        missingList.push({ name, records: recs })
        newCompleteness.set(name, { isComplete: false, missingFields: ["No asignado al módulo shipchandler"] })
      } else {
        // Cliente existe en el módulo shipchandler, verificar si está completo
        newCompleteness.set(name, checkClientCompleteness(existingInModule))
      }
    }
    
    setClientCompleteness(newCompleteness)
    
    // Si hay clientes faltantes, mostrar modal
    if (missingList.length > 0) {
      setMissingClients(missingList)
      setShowClientModal(true)
      setCurrentMissingIndex(0)
      setClientToEdit(missingList[0])
      const total = missingList.reduce((sum, c) => sum + c.records.length, 0)
      toast({ 
        title: "Clientes faltantes detectados", 
        description: `Se encontraron ${missingList.length} clientes faltantes para ${total} registros.` 
      })
    }
    
    return excelData
  }

  // Recompute completeness when clients list updates
  useEffect(() => {
    if (clients.length > 0 && clientCompleteness.size > 0) {
      const newMap = new Map<string, { isComplete: boolean; missingFields: string[] }>()
      for (const [clientName] of clientCompleteness) {
        const c = findClientByNameInModule(clientName, 'shipchandler')
        if (c) {
          newMap.set(clientName, checkClientCompleteness(c))
        } else {
          newMap.set(clientName, { isComplete: false, missingFields: ["No asignado al módulo shipchandler"] })
        }
      }
      setClientCompleteness(newMap)
    }
  }, [clients, clientCompleteness.size])

  const areAllClientsComplete = (): boolean => {
    if (clientCompleteness.size === 0) return true
    for (const [, completeness] of clientCompleteness) if (!completeness.isComplete) return false
    return true
  }

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      setIsLoading(true)
      
      try {
        // Parsear el archivo Excel
        const realData = await parseShipChandlerExcel(file)
        
        console.log("=== DATOS PROCESADOS SHIPCHANDLER ===")
        console.log("Datos del Excel:", realData)
        console.log("Total de registros:", realData.length)
        
        // Procesar clientes faltantes
        const processedData = await processMissingClients(realData)
        setPreviewData(processedData)
        
        toast({
          title: "Excel procesado",
          description: `Se han leído ${realData.length} facturas correctamente (solo registros con Invoice Type = "Invoice").`,
        })
      } catch (error: any) {
        console.error('Error al procesar archivo:', error)
        toast({
          title: "Error al procesar archivo",
          description: error.message || "No se pudo procesar el archivo Excel. Verifica que tenga el formato correcto.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }
  }

  const handleUpload = async () => {
    if (!selectedFile || previewData.length === 0) {
      toast({
        title: "Error",
        description: "Debes seleccionar un archivo y tener datos para subir",
        variant: "destructive",
      })
      return
    }

    try {
      setIsProcessing(true)

      // 1. Subir el archivo Excel primero
      const formData = new FormData()
      formData.append('excelFile', selectedFile)
      formData.append('module', 'shipchandler')
      formData.append('description', `ShipChandler Excel - ${selectedFile.name}`)

      const token = localStorage.getItem('token')
      if (!token) {
        throw new Error('No se encontró token de autenticación')
      }

      const uploadResponse = await fetch('/api/excel-files/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      })

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json()
        console.error("Error response:", errorData)
        throw new Error(errorData.message || errorData.error || 'Error al subir el archivo Excel')
      }

      const uploadData = await uploadResponse.json()
      console.log("Upload response:", uploadData)
      
      // El endpoint devuelve { success: true, message: "...", data: excelFile }
      const excelFileId = uploadData.data?._id || uploadData.data?.id
      
      if (!excelFileId) {
        console.error("No se encontró ID en la respuesta:", uploadData)
        throw new Error('No se pudo obtener el ID del archivo Excel subido')
      }

      // 2. Usar el ID del archivo Excel subido
      const tempObjectId = excelFileId

      // Verificar que todos los clientes estén completos antes de continuar
      if (!areAllClientsComplete()) {
        toast({
          title: "Clientes incompletos",
          description: "Debes completar todos los datos de clientes antes de guardar los registros",
          variant: "destructive"
        })
        return
      }

      // 3. Preparar los datos de los registros con clientes asociados
      const recordsData = previewData.map((record) => {
        // Buscar el cliente usando customerName en el módulo shipchandler
        const clientName = record.customerName?.trim()
        const client = clientName ? findClientByNameInModule(clientName, 'shipchandler') : null
        
        if (!client) {
          throw new Error(`Cliente no encontrado en el módulo shipchandler: ${clientName}`)
        }
        
        const enriched = {
          ...record,
          // Guardar referencias del cliente real para facturación
          clientId: client._id || client.id,
          clientSapCode: client.sapCode,
        }
        return {
          data: enriched, // Datos completos + cliente asociado
          totalValue: record.total || 0, // Usar el total del Excel
        }
      })
      
      console.log("Records data preparado:", recordsData)
      console.log("Payload a enviar:", {
        excelId: tempObjectId,
        recordsData
      })

      // Usar versión asíncrona para evitar timeouts en cargas grandes
      const result = await dispatch(createShipChandlerRecordsAsync({
        excelId: tempObjectId,
        recordsData
      })).unwrap()

      console.log("=== JOB CREADO ===")
      console.log("Result:", result)

      if (result.jobId) {
        setUploadJob({
          jobId: result.jobId,
          status: 'pending',
          progress: 0,
          totalRecords: result.totalRecords || recordsData.length,
          processedRecords: 0,
          createdRecords: 0,
          duplicateRecords: 0,
          errorRecords: 0,
          message: 'Procesamiento iniciado...'
        })

        toast({
          title: "Procesamiento iniciado",
          description: `Se están procesando ${recordsData.length} registros. Puedes ver el progreso en la barra.`
        })
      } else {
        throw new Error("No se recibió jobId del servidor")
      }

    } catch (error: any) {
      console.error('Error al guardar registros:', error)
      toast({
        title: "Error al guardar registros",
        description: error.message || "No se pudieron guardar los registros. Intenta nuevamente.",
        variant: "destructive",
      })
      setUploadJob(prev => ({ ...prev, status: 'idle' }))
    } finally {
      setIsProcessing(false)
    }
  }

  const updateClientCompleteness = (clientName: string) => {
    const updated = findClientByNameInModule(clientName, 'shipchandler')
    if (updated) {
      const completeness = checkClientCompleteness(updated)
      setClientCompleteness(prev => new Map(prev).set(clientName, completeness))
      console.log(`Cliente ${clientName} actualizado en módulo shipchandler:`, completeness)
    } else {
      // Si el cliente no se encuentra en el módulo shipchandler, marcarlo como incompleto
      setClientCompleteness(prev => new Map(prev).set(clientName, { isComplete: false, missingFields: ["No asignado al módulo shipchandler"] }))
      console.log(`Cliente ${clientName} no encontrado en módulo shipchandler, marcado como incompleto`)
    }
  }

  const handleClientModalClose = () => {
    setShowClientModal(false)
    setEditingClient(null)
    setClientToEdit(null)
    setCurrentMissingIndex(0)
  }

  const handleClientClick = (clientName: string) => {
    if (!clientName) return
    
    if (!canManageClients) {
      toast({
        title: "Sin permiso",
        description: "No tienes permiso para gestionar clientes.",
        variant: "destructive"
      })
      return
    }
    
    const existing = findClientByName(clientName)
    if (existing) {
      // Cliente existe, abrir modal de edición
      setEditingClient(existing)
    } else {
      // Cliente no existe, crear uno nuevo
      setEditingClient({
        type: "juridico",
        companyName: clientName, // Usar el nombre del Excel como companyName por defecto
        name: clientName, // Usar el nombre del Excel como name (nombre corto)
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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Subir Excel - ShipChandler</CardTitle>
          <CardDescription>
            Sube un archivo Excel con los datos de ShipChandler. Las columnas requeridas son:
            Customer Name, Invoice No, Invoice Type, Vessel, Date, Reference No, Delivery Address,
            Discount, Delivery expenses, Port entry Fee, Customs Fee, Authorities, Other expenses, Over time, Total.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="excel-file-input">Seleccionar archivo Excel</Label>
              <Input
                id="excel-file-input"
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                disabled={isLoading || isProcessing}
              />
            </div>

            {isLoading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Procesando archivo...</span>
              </div>
            )}

            {selectedFile && !isLoading && (
              <div className="flex items-center gap-2 text-sm">
                <FileSpreadsheet className="h-4 w-4 text-green-600" />
                <span className="font-medium">{selectedFile.name}</span>
                <Badge variant="outline">{previewData.length} registros</Badge>
              </div>
            )}

            {previewData.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Vista previa de datos</h3>
                  <Button
                    onClick={handleUpload}
                    disabled={isProcessing || isCreatingRecords || !areAllClientsComplete() || uploadJob.status === 'pending' || uploadJob.status === 'processing'}
                    className={`${areAllClientsComplete() ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-400 cursor-not-allowed'}`}
                  >
                    {isProcessing || isCreatingRecords ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Guardando...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Guardar Registros
                      </>
                    )}
                  </Button>
                </div>

                {/* Barra de progreso para carga asíncrona */}
                {(uploadJob.status === 'pending' || uploadJob.status === 'processing') && (
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                        <span className="text-sm font-medium text-blue-700">
                          {uploadJob.status === 'pending' ? 'Iniciando procesamiento...' : 'Procesando registros...'}
                        </span>
                      </div>
                      <span className="text-sm text-blue-600 font-mono">{uploadJob.progress}%</span>
                    </div>
                    <Progress value={uploadJob.progress} className="h-2 bg-blue-100" />
                    <div className="mt-2 flex justify-between text-xs text-blue-600">
                      <span>{uploadJob.processedRecords} de {uploadJob.totalRecords} procesados</span>
                      <span>
                        {uploadJob.createdRecords > 0 && `${uploadJob.createdRecords} creados`}
                        {uploadJob.duplicateRecords > 0 && ` · ${uploadJob.duplicateRecords} duplicados`}
                        {uploadJob.errorRecords > 0 && ` · ${uploadJob.errorRecords} errores`}
                      </span>
                    </div>
                  </div>
                )}

                {uploadJob.status === 'completed' && (
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                      <span className="text-sm font-medium text-green-700">Carga completada</span>
                    </div>
                    <p className="mt-1 text-sm text-green-600">
                      {uploadJob.createdRecords} registros creados
                      {uploadJob.duplicateRecords > 0 && `, ${uploadJob.duplicateRecords} duplicados omitidos`}
                      {uploadJob.errorRecords > 0 && `, ${uploadJob.errorRecords} errores`}
                    </p>
                  </div>
                )}

                {uploadJob.status === 'failed' && (
                  <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 text-red-600" />
                      <span className="text-sm font-medium text-red-700">Error en la carga</span>
                    </div>
                    <p className="mt-1 text-sm text-red-600">{uploadJob.message || 'Hubo un error al procesar los registros'}</p>
                  </div>
                )}

                <div className="rounded-md border max-h-[600px] overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Customer Name</TableHead>
                        <TableHead>Invoice No</TableHead>
                        <TableHead>Invoice Type</TableHead>
                        <TableHead>Vessel</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Reference No</TableHead>
                        <TableHead>Delivery Address</TableHead>
                        <TableHead>Discount</TableHead>
                        <TableHead>Delivery Expenses</TableHead>
                        <TableHead>Port Entry Fee</TableHead>
                        <TableHead>Customs Fee</TableHead>
                        <TableHead>Authorities</TableHead>
                        <TableHead>Other Expenses</TableHead>
                        <TableHead>Over Time</TableHead>
                        <TableHead>Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewData.map((record, index) => {
                        const client = record.customerName ? findClientByNameInModule(record.customerName, 'shipchandler') : null
                        const hasClient = !!client
                        const clientStatus = record.customerName ? clientCompleteness.get(record.customerName) : null
                        
                        return (
                          <TableRow key={index}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {hasClient ? (
                                  <CheckCircle className="h-4 w-4 text-green-600" />
                                ) : (
                                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                                )}
                                <span
                                  className={hasClient ? "" : "text-yellow-600 cursor-pointer hover:underline"}
                                  onClick={() => handleClientClick(record.customerName)}
                                  title={hasClient ? "" : "Haz clic para editar datos del cliente"}
                                >
                                  {record.customerName}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>{record.invoiceNo}</TableCell>
                            <TableCell>{record.invoiceType}</TableCell>
                            <TableCell>{record.vessel}</TableCell>
                            <TableCell>{record.date}</TableCell>
                            <TableCell>{record.referenceNo}</TableCell>
                            <TableCell>{record.deliveryAddress}</TableCell>
                            <TableCell>${record.discount.toFixed(2)}</TableCell>
                            <TableCell>${record.deliveryExpenses.toFixed(2)}</TableCell>
                            <TableCell>${record.portEntryFee.toFixed(2)}</TableCell>
                            <TableCell>${record.customsFee.toFixed(2)}</TableCell>
                            <TableCell>${record.authorities.toFixed(2)}</TableCell>
                            <TableCell>${record.otherExpenses.toFixed(2)}</TableCell>
                            <TableCell>${record.overTime.toFixed(2)}</TableCell>
                            <TableCell className="font-semibold">${record.total.toFixed(2)}</TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Modal de cliente faltante */}
      <Dialog open={showClientModal} onOpenChange={handleClientModalClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Cliente Faltante: {clientToEdit?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              El cliente "{clientToEdit?.name}" no está registrado en el módulo ShipChandler. 
              Por favor, crea o actualiza el cliente para continuar.
            </p>
            <p className="text-sm font-medium">
              Registros afectados: {clientToEdit?.records.length || 0}
            </p>
            <div className="flex justify-between items-center space-x-2">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    const currentIndex = missingClients.indexOf(clientToEdit!)
                    const prevIndex = (currentIndex - 1 + missingClients.length) % missingClients.length
                    setClientToEdit(missingClients[prevIndex])
                    setCurrentMissingIndex(prevIndex)
                  }}
                  disabled={missingClients.length <= 1}
                >
                  ← Anterior
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    const currentIndex = missingClients.indexOf(clientToEdit!)
                    const nextIndex = (currentIndex + 1) % missingClients.length
                    setClientToEdit(missingClients[nextIndex])
                    setCurrentMissingIndex(nextIndex)
                  }}
                  disabled={missingClients.length <= 1}
                >
                  Siguiente →
                </Button>
              </div>
              <Button
                onClick={() => {
                  if (!canManageClients) {
                    toast({
                      title: "Sin permiso",
                      description: "No tienes permiso para gestionar clientes.",
                      variant: "destructive"
                    })
                    return
                  }
                  
                  // Buscar si el cliente ya existe en la base de datos (por nombre)
                  const existingClient = findClientByName(clientToEdit!.name)
                  
                  if (existingClient) {
                    // Cliente existe, abrir modal de edición con los datos del cliente
                    setEditingClient(existingClient)
                  } else {
                    // Cliente no existe, crear uno nuevo con datos parciales
                    // El usuario deberá ingresar el SAP code para buscar o crear
                    setEditingClient({
                      type: "juridico",
                      companyName: clientToEdit!.name, // Usar el nombre del Excel como companyName por defecto
                      name: clientToEdit!.name, // Usar el nombre del Excel como name (nombre corto)
                      ruc: "",
                      contactName: "",
                      email: "",
                      phone: "",
                      address: "",
                      sapCode: "", // Vacío para que el usuario lo ingrese y busque
                      isActive: true,
                    } as any)
                  }
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

      {/* Modal de edición de cliente */}
      <ClientModal
        isOpen={!!editingClient}
        onClose={() => setEditingClient(null)}
        editingClient={editingClient}
        module="shipchandler"
        onClientCreated={async (client) => {
          // Recalcular completitud
          const clientName = client.type === 'juridico' ? (client as any).name : (client as any).fullName
          updateClientCompleteness(clientName)
          setEditingClient(null)
          
          // Refrescar la lista de clientes - Solo clientes del módulo shipchandler
          await dispatch(fetchClients('shipchandler'))
          
          // Si hay más clientes faltantes, continuar con el siguiente
          if (showClientModal && missingClients.length > 0) {
            const nextIndex = currentMissingIndex + 1
            if (nextIndex < missingClients.length) {
              setCurrentMissingIndex(nextIndex)
              setClientToEdit(missingClients[nextIndex])
            } else {
              // Todos los clientes han sido procesados
              setShowClientModal(false)
              setClientToEdit(null)
              setCurrentMissingIndex(0)
              
              // Reprocess data to update client associations
              if (selectedFile) {
                const realData = await parseShipChandlerExcel(selectedFile)
                const processedData = await processMissingClients(realData)
                setPreviewData(processedData)
              }
            }
          } else {
            // Reprocess data to update client associations
            if (selectedFile) {
              const realData = await parseShipChandlerExcel(selectedFile)
              const processedData = await processMissingClients(realData)
              setPreviewData(processedData)
            }
          }
        }}
      />
    </div>
  )
}

