"use client"

import { useState, useEffect, useMemo, useRef, useCallback } from "react"
import { useAppDispatch, useAppSelector } from "@/lib/hooks"
import { createAgencyRecords, createAgencyRecordsAsync, getUploadJobStatus, selectCreatingRecords, selectRecordsError } from "@/lib/features/records/recordsSlice"
import { addExcelFile } from "@/lib/features/excel/excelSlice"
import { parseAgencyExcel, AgencyExcelData, matchAgencyDataWithPricing } from "@/lib/excel-parser"
import { 
  fetchAgencyCatalogs,
  selectAgencyCatalogs,
  selectCatalogsLoading,
  selectCatalogsError,
  selectActiveLocations,
  selectActiveVessels,
  selectActiveTransportCompanies
} from "@/lib/features/agencyServices/agencyCatalogsSlice"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { TimeInput } from "@/components/ui/time-input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { 
  FileSpreadsheet, 
  Upload, 
  CheckCircle, 
  Loader2, 
  AlertCircle, 
  CheckCircle2, 
  Plus,
  Download,
  X,
  Edit,
  DollarSign
} from "lucide-react"
import { 
  selectAllClients,
  fetchClients,
  createClientAsync,
  type Client
} from "@/lib/features/clients/clientsSlice"
import { ClientModal } from "@/components/clients-management"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { createAgencyService } from "@/lib/features/agencyServices/agencyServicesSlice"

// Función para formatear fecha
const formatDate = (date: string | number): string => {
  if (!date) return ''
  
  // Si ya es una fecha legible, devolverla
  if (typeof date === 'string' && date.includes('/')) {
    return date
  }
  
  // Si es número serial de Excel
  const excelSerialNumber = Number(date)
  if (!isNaN(excelSerialNumber)) {
    const excelEpoch = new Date(1900, 0, 1)
    const millisecondsPerDay = 24 * 60 * 60 * 1000
    const adjustedSerialNumber = excelSerialNumber > 59 ? excelSerialNumber - 1 : excelSerialNumber
    const dateObj = new Date(excelEpoch.getTime() + (adjustedSerialNumber - 1) * millisecondsPerDay)
    
    const day = dateObj.getDate().toString().padStart(2, '0')
    const month = (dateObj.getMonth() + 1).toString().padStart(2, '0')
    const year = dateObj.getFullYear()
    
    return `${day}/${month}/${year}`
  }
  
  return String(date)
}

// Template de Excel para descargar
const downloadExcelTemplate = () => {
  const headers = [
    'Service Date', 'Pickup Date', 'Pickup Time', 'Pickup Location', 'Dropoff Location',
    'Vessel', 'Voyage', 'Crew Name', 'Passengers', 'Rank', 'Nationality',
    'Transport Company', 'Driver', 'Flight', 'Waiting Time', 'Price', 'Currency',
    'Service Code', 'Client', 'Comments'
  ]
  
  const sampleData = [
    [
      '01/01/2024', '01/01/2024', '08:00', 'HOTEL PTY', 'PTY PORT',
      'MSC VESSEL', 'V001', 'John Doe', '1', 'Captain', 'USA',
      'Transport Co', 'Driver Name', 'AA123', '2', '150', 'USD',
      'ECR000669', 'MSC', 'Sample service'
    ]
  ]
  
  // Create CSV content
  const csvContent = [
    headers.join(','),
    ...sampleData.map(row => row.join(','))
  ].join('\n')
  
  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = 'agency_template.csv'
  link.click()
  URL.revokeObjectURL(link.href)
}

export function AgencyUpload() {
  const [activeTab, setActiveTab] = useState<'excel' | 'manual'>('excel')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewData, setPreviewData] = useState<AgencyExcelData[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  
  // Estado para la barra de progreso del matching
  const [matchingProgress, setMatchingProgress] = useState({
    isMatching: false,
    current: 0,
    total: 0,
    percentage: 0,
    currentRecord: '',
    matchesFound: 0
  })

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

  // Manual entry state
  const [manualEntry, setManualEntry] = useState<Partial<AgencyExcelData>>({
    serviceDate: new Date().toISOString().split('T')[0],
    pickupDate: new Date().toISOString().split('T')[0],
    pickupTime: '08:00',
    pickupLocation: '',
    dropoffLocation: '',
    vessel: '',
    voyage: '',
    crewName: '',
    passengerCount: 1,
    waitingTime: 0,
    price: 0,
    currency: 'USD',
    clientName: ''
  })

  const dispatch = useAppDispatch()
  const { toast } = useToast()
  
  // Redux state
  const isCreatingRecords = useAppSelector(selectCreatingRecords)
  const recordsError = useAppSelector(selectRecordsError)
  
  // Agency catalogs
  const allCatalogs = useAppSelector(selectAgencyCatalogs)
  const routePricing = allCatalogs.filter(cat => cat.type === 'route_pricing' && cat.isActive)
  const locations = useAppSelector(selectActiveLocations)
  const vessels = useAppSelector(selectActiveVessels)
  const transportCompanies = useAppSelector(selectActiveTransportCompanies)
  const catalogsLoading = useAppSelector(selectCatalogsLoading)
  
  // Clients
  const clients = useAppSelector(selectAllClients)
  const clientsLoading = useAppSelector(state => state.clients.loading)
  
  // Missing clients management
  const [missingClients, setMissingClients] = useState<Array<{ name: string; records: AgencyExcelData[] }>>([])
  const [showClientModal, setShowClientModal] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [clientToEdit, setClientToEdit] = useState<{ name: string; records: AgencyExcelData[] } | null>(null)
  const [currentMissingIndex, setCurrentMissingIndex] = useState<number>(0)

  // Cargar catálogos y clientes al montar
  useEffect(() => {
    dispatch(fetchAgencyCatalogs())
    dispatch(fetchClients())
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

  // Función para manejar el archivo
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      setIsProcessing(true)
      setMatchingProgress({
        isMatching: true,
        current: 0,
        total: 0,
        percentage: 0,
        currentRecord: 'Iniciando procesamiento...',
        matchesFound: 0
      })
      
      try {
        // Parsear el archivo Excel
        const excelData = await parseAgencyExcel(file)
        
        if (!excelData || excelData.length === 0) {
          throw new Error('No se encontraron datos en el archivo')
        }
        
        // Hacer matching con las rutas de precios
        const matchedData = await matchAgencyDataWithPricing(
          excelData,
          routePricing,
          (progress) => {
            setMatchingProgress(prev => ({
              ...prev,
              percentage: progress,
              current: Math.floor((progress / 100) * excelData.length),
              total: excelData.length
            }))
          }
        )
        
        setPreviewData(matchedData)
        
        // Verificar clientes faltantes
        const uniqueClients = [...new Set(matchedData.map(r => r.clientName).filter(Boolean))]
        const existingClientNames = clients.map(c => c.comercialName.toLowerCase())
        const missing = uniqueClients.filter(
          clientName => !existingClientNames.includes(clientName.toLowerCase())
        )
        
        if (missing.length > 0) {
          const missingWithRecords = missing.map(name => ({
            name,
            records: matchedData.filter(r => r.clientName === name)
          }))
          setMissingClients(missingWithRecords)
          setCurrentMissingIndex(0)
        }
        
        toast({
          title: "Archivo procesado",
          description: `Se encontraron ${matchedData.length} registros. ${matchedData.filter(r => r.isMatched).length} con precio calculado.`,
        })
        
      } catch (error) {
        console.error('Error processing file:', error)
        toast({
          title: "Error al procesar archivo",
          description: error instanceof Error ? error.message : 'Error desconocido',
          variant: "destructive"
        })
        setPreviewData([])
      } finally {
        setIsProcessing(false)
        setMatchingProgress(prev => ({ ...prev, isMatching: false }))
      }
    }
  }

  // Función para manejar entrada manual
  const handleManualSubmit = async () => {
    try {
      // Validar campos requeridos
      if (!manualEntry.pickupLocation || !manualEntry.dropoffLocation || 
          !manualEntry.vessel || !manualEntry.crewName || !manualEntry.clientName) {
        toast({
          title: "Error de validación",
          description: "Por favor complete todos los campos requeridos",
          variant: "destructive"
        })
        return
      }

      setIsLoading(true)

      // Buscar cliente
      const client = clients.find(c => 
        c.comercialName.toLowerCase() === manualEntry.clientName?.toLowerCase()
      )

      if (!client) {
        toast({
          title: "Cliente no encontrado",
          description: `El cliente ${manualEntry.clientName} no existe en el sistema`,
          variant: "destructive"
        })
        return
      }

      // Crear el servicio de agency directamente
      const serviceData = {
        module: 'AGENCY' as const,
        serviceDate: manualEntry.serviceDate || new Date().toISOString().split('T')[0],
        pickupDate: manualEntry.pickupDate || new Date().toISOString().split('T')[0],
        pickupTime: manualEntry.pickupTime || '08:00',
        pickupLocation: manualEntry.pickupLocation,
        dropoffLocation: manualEntry.dropoffLocation,
        vessel: manualEntry.vessel,
        voyage: manualEntry.voyage || '',
        crewName: manualEntry.crewName,
        crewRank: manualEntry.crewRank || '',
        nationality: manualEntry.nationality || '',
        transportCompany: manualEntry.transportCompany || '',
        driverName: manualEntry.driverName || '',
        flightInfo: manualEntry.flightInfo || '',
        waitingTime: manualEntry.waitingTime || 0,
        passengerCount: manualEntry.passengerCount || 1,
        price: manualEntry.price || 0,
        currency: manualEntry.currency || 'USD',
        serviceCode: manualEntry.serviceCode || '',
        clientId: client._id,
        comments: manualEntry.comments || '',
        notes: manualEntry.notes || ''
      }

      await dispatch(createAgencyService(serviceData)).unwrap()

      toast({
        title: "Servicio creado",
        description: "El servicio de agency se creó exitosamente",
      })

      // Limpiar formulario
      setManualEntry({
        serviceDate: new Date().toISOString().split('T')[0],
        pickupDate: new Date().toISOString().split('T')[0],
        pickupTime: '08:00',
        pickupLocation: '',
        dropoffLocation: '',
        vessel: '',
        voyage: '',
        crewName: '',
        passengerCount: 1,
        waitingTime: 0,
        price: 0,
        currency: 'USD',
        clientName: ''
      })

    } catch (error) {
      console.error('Error creating service:', error)
      toast({
        title: "Error al crear servicio",
        description: error instanceof Error ? error.message : 'Error desconocido',
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Función para subir los registros
  const handleUpload = async () => {
    if (previewData.length === 0) {
      toast({
        title: "Sin datos",
        description: "No hay datos para cargar",
        variant: "destructive"
      })
      return
    }

    // Verificar clientes faltantes antes de procesar
    if (missingClients.length > 0) {
      toast({
        title: "Clientes faltantes",
        description: `Hay ${missingClients.length} clientes que necesitan ser creados primero`,
        variant: "destructive"
      })
      setShowClientModal(true)
      return
    }

    setIsLoading(true)

    try {
      // Primero subir el archivo Excel
      const formData = new FormData()
      if (selectedFile) {
        formData.append('file', selectedFile)
        formData.append('module', 'agency')
      }

      let excelId = null
      if (selectedFile) {
        const excelResponse = await dispatch(addExcelFile(formData)).unwrap()
        excelId = excelResponse._id
      }

      // Preparar los datos con los IDs de clientes
      const recordsData = previewData.map(record => {
        const client = clients.find(c => 
          c.comercialName.toLowerCase() === record.clientName.toLowerCase()
        )
        
        return {
          ...record,
          clientId: client?._id || null,
          data: record // Incluir todos los datos originales
        }
      })

      // Usar versión asíncrona para evitar timeouts en cargas grandes
      const result = await dispatch(createAgencyRecordsAsync({
        excelId: excelId || '',
        recordsData: recordsData,
        isManualEntry: !selectedFile
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

    } catch (error) {
      console.error('Error uploading records:', error)
      toast({
        title: "Error al cargar registros",
        description: error instanceof Error ? error.message : 'Error desconocido',
        variant: "destructive"
      })
      setUploadJob(prev => ({ ...prev, status: 'idle' }))
    } finally {
      setIsLoading(false)
    }
  }

  // Función para manejar la creación de cliente
  const handleCreateClient = async (clientData: Partial<Client>) => {
    try {
      const newClient = await dispatch(createClientAsync(clientData as any)).unwrap()
      
      // Actualizar la lista de clientes faltantes
      setMissingClients(prev => prev.filter(mc => mc.name !== clientToEdit?.name))
      
      // Si hay más clientes faltantes, continuar con el siguiente
      if (currentMissingIndex < missingClients.length - 1) {
        setCurrentMissingIndex(prev => prev + 1)
        setClientToEdit(missingClients[currentMissingIndex + 1])
        setEditingClient(null)
      } else {
        // Si no hay más, cerrar el modal
        setShowClientModal(false)
        setClientToEdit(null)
        setEditingClient(null)
        setCurrentMissingIndex(0)
        
        toast({
          title: "Clientes creados",
          description: "Todos los clientes han sido creados. Puede proceder con la carga.",
        })
      }
      
    } catch (error) {
      console.error('Error creating client:', error)
      toast({
        title: "Error al crear cliente",
        description: error instanceof Error ? error.message : 'Error desconocido',
        variant: "destructive"
      })
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Carga de Servicios Agency</CardTitle>
          <CardDescription>
            Cargue servicios de transporte de tripulación desde Excel o ingrese manualmente
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'excel' | 'manual')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="excel">
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Carga desde Excel
              </TabsTrigger>
              <TabsTrigger value="manual">
                <Edit className="w-4 h-4 mr-2" />
                Entrada Manual
              </TabsTrigger>
            </TabsList>

            <TabsContent value="excel" className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="agency-file-input">Seleccionar archivo Excel</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={downloadExcelTemplate}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Descargar Template
                  </Button>
                </div>
                <Input
                  id="agency-file-input"
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileChange}
                  disabled={isProcessing || isLoading}
                />
                {selectedFile && (
                  <p className="text-sm text-muted-foreground">
                    Archivo seleccionado: {selectedFile.name}
                  </p>
                )}
              </div>

              {/* Barra de progreso del matching */}
              {matchingProgress.isMatching && (
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="pt-6">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">Procesando registros...</span>
                        <span>{matchingProgress.percentage}%</span>
                      </div>
                      <Progress value={matchingProgress.percentage} className="h-2" />
                      <p className="text-xs text-muted-foreground">
                        {matchingProgress.current} de {matchingProgress.total} registros procesados
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Vista previa de los datos */}
              {previewData.length > 0 && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold">
                      Vista Previa ({previewData.length} registros)
                    </h3>
                    <div className="flex gap-2">
                      <Badge variant="outline">
                        <CheckCircle className="w-4 h-4 mr-1" />
                        {previewData.filter(r => r.isMatched).length} con precio
                      </Badge>
                      <Badge variant="outline">
                        <AlertCircle className="w-4 h-4 mr-1" />
                        {previewData.filter(r => !r.isMatched).length} sin ruta
                      </Badge>
                    </div>
                  </div>

                  <ScrollArea className="h-[400px] w-full rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Fecha</TableHead>
                          <TableHead>Pickup</TableHead>
                          <TableHead>Dropoff</TableHead>
                          <TableHead>Buque</TableHead>
                          <TableHead>Tripulante</TableHead>
                          <TableHead>Cliente</TableHead>
                          <TableHead>Precio</TableHead>
                          <TableHead>Estado</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {previewData.map((record, index) => (
                          <TableRow key={index}>
                            <TableCell>{formatDate(record.serviceDate)}</TableCell>
                            <TableCell>{record.pickupLocation}</TableCell>
                            <TableCell>{record.dropoffLocation}</TableCell>
                            <TableCell>{record.vessel}</TableCell>
                            <TableCell>{record.crewName}</TableCell>
                            <TableCell>{record.clientName}</TableCell>
                            <TableCell>
                              ${record.price || record.matchedPrice || 0} {record.currency}
                            </TableCell>
                            <TableCell>
                              {record.isMatched ? (
                                <Badge variant="success">
                                  <CheckCircle2 className="w-3 h-3 mr-1" />
                                  Calculado
                                </Badge>
                              ) : (
                                <Badge variant="secondary">
                                  <DollarSign className="w-3 h-3 mr-1" />
                                  Precio base
                                </Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>

                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setPreviewData([])
                        setSelectedFile(null)
                        const fileInput = document.getElementById('agency-file-input') as HTMLInputElement
                        if (fileInput) fileInput.value = ''
                      }}
                      disabled={isLoading || uploadJob.status === 'pending' || uploadJob.status === 'processing'}
                    >
                      <X className="w-4 h-4 mr-2" />
                      Cancelar
                    </Button>
                    <Button
                      onClick={handleUpload}
                      disabled={isLoading || isCreatingRecords || uploadJob.status === 'pending' || uploadJob.status === 'processing'}
                    >
                      {(isLoading || isCreatingRecords) ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Cargando...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 mr-2" />
                          Cargar Registros
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Barra de progreso para carga asíncrona */}
                  {(uploadJob.status === 'pending' || uploadJob.status === 'processing') && (
                    <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
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
                    <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
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
                    <div className="mt-4 p-4 bg-red-50 rounded-lg border border-red-200">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-5 w-5 text-red-600" />
                        <span className="text-sm font-medium text-red-700">Error en la carga</span>
                      </div>
                      <p className="mt-1 text-sm text-red-600">{uploadJob.message || 'Hubo un error al procesar los registros'}</p>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="manual" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="service-date">Fecha de Servicio*</Label>
                  <Input
                    id="service-date"
                    type="date"
                    value={manualEntry.serviceDate}
                    onChange={(e) => setManualEntry(prev => ({ ...prev, serviceDate: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pickup-time">Hora de Recogida*</Label>
                  <TimeInput
                    id="pickup-time"
                    value={manualEntry.pickupTime}
                    onChange={(value) => setManualEntry(prev => ({ ...prev, pickupTime: value }))}
                    placeholder="HH:MM (24 horas)"
                  />
                  <p className="text-xs text-muted-foreground">
                    Formato 24 horas (ej: 14:30 para 2:30 PM)
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pickup-location">Lugar de Recogida*</Label>
                  <Input
                    id="pickup-location"
                    value={manualEntry.pickupLocation}
                    onChange={(e) => setManualEntry(prev => ({ ...prev, pickupLocation: e.target.value }))}
                    placeholder="Ej: HOTEL PTY"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dropoff-location">Lugar de Destino*</Label>
                  <Input
                    id="dropoff-location"
                    value={manualEntry.dropoffLocation}
                    onChange={(e) => setManualEntry(prev => ({ ...prev, dropoffLocation: e.target.value }))}
                    placeholder="Ej: PTY PORT"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vessel">Buque*</Label>
                  <Input
                    id="vessel"
                    value={manualEntry.vessel}
                    onChange={(e) => setManualEntry(prev => ({ ...prev, vessel: e.target.value }))}
                    placeholder="Nombre del buque"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="voyage">Viaje</Label>
                  <Input
                    id="voyage"
                    value={manualEntry.voyage}
                    onChange={(e) => setManualEntry(prev => ({ ...prev, voyage: e.target.value }))}
                    placeholder="Número de viaje"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="crew-name">Nombre del Tripulante*</Label>
                  <Input
                    id="crew-name"
                    value={manualEntry.crewName}
                    onChange={(e) => setManualEntry(prev => ({ ...prev, crewName: e.target.value }))}
                    placeholder="Nombre completo"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="crew-rank">Rango</Label>
                  <Input
                    id="crew-rank"
                    value={manualEntry.crewRank}
                    onChange={(e) => setManualEntry(prev => ({ ...prev, crewRank: e.target.value }))}
                    placeholder="Ej: Captain, Engineer"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="passengers">Número de Pasajeros</Label>
                  <Input
                    id="passengers"
                    type="number"
                    min="1"
                    value={manualEntry.passengerCount}
                    onChange={(e) => setManualEntry(prev => ({ ...prev, passengerCount: parseInt(e.target.value) || 1 }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="waiting-time">Tiempo de Espera (horas)</Label>
                  <Input
                    id="waiting-time"
                    type="number"
                    min="0"
                    value={manualEntry.waitingTime}
                    onChange={(e) => setManualEntry(prev => ({ ...prev, waitingTime: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price">Precio</Label>
                  <Input
                    id="price"
                    type="number"
                    min="0"
                    value={manualEntry.price}
                    onChange={(e) => setManualEntry(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currency">Moneda</Label>
                  <Input
                    id="currency"
                    value={manualEntry.currency}
                    onChange={(e) => setManualEntry(prev => ({ ...prev, currency: e.target.value }))}
                    placeholder="USD"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="client">Cliente*</Label>
                  <Input
                    id="client"
                    value={manualEntry.clientName}
                    onChange={(e) => setManualEntry(prev => ({ ...prev, clientName: e.target.value }))}
                    placeholder="Nombre del cliente"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="service-code">Código de Servicio</Label>
                  <Input
                    id="service-code"
                    value={manualEntry.serviceCode}
                    onChange={(e) => setManualEntry(prev => ({ ...prev, serviceCode: e.target.value }))}
                    placeholder="Ej: ECR000669"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="comments">Comentarios</Label>
                <Textarea
                  id="comments"
                  value={manualEntry.comments}
                  onChange={(e) => setManualEntry(prev => ({ ...prev, comments: e.target.value }))}
                  placeholder="Comentarios adicionales..."
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setManualEntry({
                      serviceDate: new Date().toISOString().split('T')[0],
                      pickupDate: new Date().toISOString().split('T')[0],
                      pickupTime: '08:00',
                      pickupLocation: '',
                      dropoffLocation: '',
                      vessel: '',
                      voyage: '',
                      crewName: '',
                      passengerCount: 1,
                      waitingTime: 0,
                      price: 0,
                      currency: 'USD',
                      clientName: ''
                    })
                  }}
                  disabled={isLoading}
                >
                  <X className="w-4 h-4 mr-2" />
                  Limpiar
                </Button>
                <Button
                  onClick={handleManualSubmit}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creando...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      Crear Servicio
                    </>
                  )}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Modal para clientes faltantes */}
      <Dialog open={showClientModal} onOpenChange={setShowClientModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Cliente No Encontrado</DialogTitle>
            <DialogDescription>
              {missingClients.length > 0 && (
                <>
                  Cliente {currentMissingIndex + 1} de {missingClients.length}: 
                  <span className="font-semibold"> {missingClients[currentMissingIndex]?.name}</span>
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          
          {missingClients.length > 0 && (
            <ClientModal
              open={showClientModal}
              onOpenChange={(open) => {
                if (!open) {
                  setShowClientModal(false)
                  setEditingClient(null)
                  setClientToEdit(null)
                }
              }}
              onSave={handleCreateClient}
              client={editingClient}
              defaultValues={{
                comercialName: missingClients[currentMissingIndex]?.name || ''
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}