"use client"

import { useState, useEffect, useMemo } from "react"
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
import { 
  selectAllContainerTypes,
  fetchContainerTypes,
  selectContainerTypesLoading,
  selectContainerTypesError
} from "@/lib/features/containerTypes/containerTypesSlice"

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

  // Container Types state
  const containerTypes = useAppSelector(selectAllContainerTypes)
  const containerTypesLoading = useAppSelector(selectContainerTypesLoading)
  const containerTypesError = useAppSelector(selectContainerTypesError)

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

  // Cargar container types al montar el componente
  useEffect(() => {
    dispatch(fetchContainerTypes())
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

  // Debug: Monitorear cuando los container types se cargan
  useEffect(() => {
    console.log("=== CONTAINER TYPES CARGADOS ===")
    console.log("Container types disponibles:", containerTypes)
    console.log("Número de container types:", containerTypes.length)
    console.log("Cargando container types:", containerTypesLoading)
    console.log("Error en container types:", containerTypesError)
    if (containerTypes.length > 0) {
      console.log("Ejemplos de container types:")
      containerTypes.slice(0, 5).forEach((ct: any, index: number) => {
        console.log(`  ${index + 1}: ${ct.code} - ${ct.name} (${ct.category})`)
      })
    }
    console.log("")
  }, [containerTypes, containerTypesLoading, containerTypesError])

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
        if (client.type === "juridico") {
          // Para clientes jurídicos, buscar por nombre corto (name) en lugar de companyName
          return client.name?.toLowerCase() === name.toLowerCase()
        }
        if (client.type === "natural") return client.fullName?.toLowerCase() === name.toLowerCase()
        return false
      }) || null
    )
  }

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

  const updateClientCompleteness = (clientName: string) => {
    const updated = findClientByName(clientName)
    if (updated) {
      const completeness = checkClientCompleteness(updated)
      setClientCompleteness(prev => new Map(prev).set(clientName, completeness))
      console.log(`Cliente ${clientName} actualizado:`, completeness)
    } else {
      // Si el cliente no se encuentra, marcarlo como incompleto
      setClientCompleteness(prev => new Map(prev).set(clientName, { isComplete: false, missingFields: ["Cliente no encontrado"] }))
      console.log(`Cliente ${clientName} no encontrado, marcado como incompleto`)
    }
  }

  const areAllClientsComplete = (): boolean => {
    if (clientCompleteness.size === 0) return true
    for (const [, completeness] of clientCompleteness) if (!completeness.isComplete) return false
    return true
  }

  const handleClientClick = (clientName: string) => {
    if (!clientName) return
    
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
    
    // Agrupar registros por cliente (columna 'line') solo si tienen match
    excelData.forEach((record) => {
      const clientName = record.line?.trim()
      if (clientName && record.isMatched) {
        if (!grouped.has(clientName)) grouped.set(clientName, [])
        grouped.get(clientName)!.push(record)
      }
    })
    
    const missingList: Array<{ name: string; records: TruckingExcelData[] }> = []
    
    // Verificar cada cliente encontrado en el Excel
    for (const [name, recs] of grouped) {
      const existing = findClientByName(name)
      if (!existing) {
        // Cliente no existe en la base de datos
        missingList.push({ name, records: recs })
        newCompleteness.set(name, { isComplete: false, missingFields: ["Todos los campos"] })
      } else {
        // Cliente existe, verificar si está completo
        newCompleteness.set(name, checkClientCompleteness(existing))
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
        description: `Se encontraron ${missingList.length} clientes faltantes para ${total} registros con match.` 
      })
    }
    
    return excelData
  }

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      setIsLoading(true)
      
      try {
        // Verificar que las rutas y container types estén cargados
        if (routesLoading || containerTypesLoading) {
          toast({
            title: "Cargando configuración",
            description: "Espera un momento mientras se cargan las rutas y tipos de contenedores...",
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
        
        if (containerTypes.length === 0) {
          toast({
            title: "No hay tipos de contenedores configurados",
            description: "Debes configurar tipos de contenedores en la sección de configuración antes de subir archivos.",
            variant: "destructive",
          })
          return
        }

        // Parsear el archivo Excel real
        const realData = await parseTruckingExcel(file)
        
        console.log("=== DEBUGGING MATCHING ===")
        console.log("Datos del Excel:", realData)
        console.log("Rutas disponibles:", routes)
        console.log("Container types disponibles:", containerTypes)
        console.log("")
        
        // Aplicar matching con las rutas configuradas y container types del backend
        const matchedData = matchTruckingDataWithRoutes(realData, routes, containerTypes)
        
        console.log("Datos después del matching:", matchedData)
        console.log("")
        
        // Procesar clientes faltantes usando la columna 'line' del Excel
        const processedData = await processMissingClients(matchedData)
        setPreviewData(processedData)
        
        // Contar registros con match
        const matchedCount = matchedData.filter(record => record.isMatched).length
        const unmatchedCount = matchedData.length - matchedCount
        
        console.log(`Registros con match: ${matchedCount}/${matchedData.length}`)
        
        // Contar tipos de contenedores detectados
        const dryCount = matchedData.filter(r => r.detectedContainerType === 'dry').length;
        const reeferCount = matchedData.filter(r => r.detectedContainerType === 'reefer').length;
        
        let description = `Se han leído ${realData.length} registros. ${matchedCount} con precio asignado, ${unmatchedCount} sin coincidencia.`;
        if (dryCount > 0 || reeferCount > 0) {
          description += ` Tipos detectados: ${dryCount > 0 ? `${dryCount} DRY` : ''}${dryCount > 0 && reeferCount > 0 ? ', ' : ''}${reeferCount > 0 ? `${reeferCount} REEFER` : ''}`;
        }
        
        toast({
          title: "✅ Archivo Excel procesado",
          description: description,
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

    // Verificar que todos los clientes estén completos antes de continuar
    if (!areAllClientsComplete()) {
      toast({
        title: "Clientes incompletos",
        description: "Debes completar todos los datos de clientes antes de guardar los registros",
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
      
      // Helper para comparar nombres ignorando puntuación/acentos/espacios
      const normalizeName = (s: string) =>
        (s || '')
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '') // quitar acentos
          .replace(/[^a-z0-9]+/g, '') // quitar puntuación/espacios
          .trim()

      const recordsData = previewData
        .filter((r) => r.isMatched)
        .map((record, index) => {
          // Buscar el cliente usando la columna 'line' del Excel
          const clientName = record.line?.trim()
          const client = clientName ? findClientByName(clientName) : null
          
          if (!client) {
            throw new Error(`Cliente no encontrado: ${clientName}`)
          }
          
          const enriched = {
            ...record,
            // Guardar referencias del cliente real para facturación
            clientId: client._id || client.id,
            clientSapCode: client.sapCode,
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
      console.log("Result.count:", result.count)
      console.log("Result.duplicates:", result.duplicates)
      console.log("Result.records:", result.records)
      console.log("Result.totalProcessed:", result.totalProcessed)
      console.log("Result completo (JSON):", JSON.stringify(result, null, 2))
      
      // Manejar respuesta con información de duplicados
      let successMessage = ""
      
      // Obtener el conteo de registros creados de diferentes formas posibles
      let recordsCreated = 0
      if (typeof result.count === 'number') {
        recordsCreated = result.count
      } else if (Array.isArray(result.records)) {
        recordsCreated = result.records.length
      } else if (Array.isArray(result)) {
        recordsCreated = result.length
      }
      
      // Si no pudimos obtener el conteo, usar un mensaje genérico
      if (recordsCreated === 0 && !result.duplicates) {
        successMessage = "Registros procesados exitosamente. Verifica la consola para más detalles."
      } else if (result.duplicates && result.duplicates.count > 0) {
        successMessage = `${recordsCreated} registros nuevos guardados, ${result.duplicates.count} duplicados (containerConsecutive) omitidos.`
        if (result.duplicates.containerConsecutives) {
          console.log("ContainerConsecutives duplicados:", result.duplicates.containerConsecutives)
        }
      } else {
        // Contar tipos de contenedores guardados
        const dryCount = recordsData.filter(r => r.data?.detectedContainerType === 'dry').length;
        const reeferCount = recordsData.filter(r => r.data?.detectedContainerType === 'reefer').length;
        
        successMessage = `${recordsCreated} registros con match guardados correctamente en el sistema (${previewData.length - recordsData.length} sin match omitidos)`;
        if (dryCount > 0 || reeferCount > 0) {
          successMessage += ` Tipos: ${dryCount > 0 ? `${dryCount} DRY` : ''}${dryCount > 0 && reeferCount > 0 ? ', ' : ''}${reeferCount > 0 ? `${reeferCount} REEFER` : ''}`;
        }
      }
      
      toast({
        title: "Éxito",
        description: successMessage
      })
      
      // Limpiar el estado
      setPreviewData([])
      setSelectedFile(null)
      // Refrescar listas del módulo para reflejar estados/completados en Prefactura
      try {
        // Evitar importar aquí fetchers del slice para no aumentar dependencias del upload
        // La pantalla de prefactura ya los llama al montar, pero refrescamos por UX
        const { fetchPendingRecordsByModule, fetchRecordsByModule } = await import("@/lib/features/records/recordsSlice")
        //@ts-ignore
        dispatch(fetchPendingRecordsByModule("trucking"))
        //@ts-ignore
        dispatch(fetchRecordsByModule("trucking"))
      } catch {}
      
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

  // Verificar duplicados dentro del Excel por containerConsecutive
  const duplicateContainerConsecutives = useMemo(() => {
    const containerConsecutives = previewData
      .filter(record => record.isMatched)
      .map(record => record.containerConsecutive)
      .filter(Boolean)
    
    const duplicates = containerConsecutives.filter((item, index) => 
      containerConsecutives.indexOf(item) !== index
    )
    
    return [...new Set(duplicates)] // Eliminar duplicados de la lista de duplicados
  }, [previewData])

  const hasDuplicateContainerConsecutives = duplicateContainerConsecutives.length > 0

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Subir excel Trasiego
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
              disabled={isLoading || isProcessing || routesLoading || containerTypesLoading}
            />
          </div>
          
          {/* Estado de carga de rutas y container types */}
          {(routesLoading || containerTypesLoading) && (
            <div className="flex items-center gap-2 text-sm text-blue-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              Cargando configuración...
            </div>
          )}
          
          {!routesLoading && !containerTypesLoading && routes.length === 0 && (
            <div className="flex items-center gap-2 text-sm text-orange-600">
              <AlertCircle className="h-4 w-4" />
              No hay rutas configuradas. Ve a Configuración para crear rutas.
            </div>
          )}

          {!routesLoading && !containerTypesLoading && containerTypes.length === 0 && (
            <div className="flex items-center gap-2 text-sm text-orange-600">
              <AlertCircle className="h-4 w-4" />
              No hay tipos de contenedores configurados. Ve a Configuración para configurar tipos de contenedores.
            </div>
          )}
          
          {!routesLoading && !containerTypesLoading && routes.length > 0 && containerTypes.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <CheckCircle className="h-4 w-4" />
              {routes.length} ruta{routes.length !== 1 ? 's' : ''} y {containerTypes.length} tipo{containerTypes.length !== 1 ? 's' : ''} de contenedor{containerTypes.length !== 1 ? 'es' : ''} configurado{routes.length !== 1 ? 's' : ''} listo{routes.length !== 1 ? 's' : ''}
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
            <CardTitle className="text-2xl font-bold  mb-4">Vista Previa de Datos</CardTitle>
            <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap mt-2">
              <span className="font-medium">{previewData.length} registros encontrados</span>
              <Badge variant="outline" className="text-green-600 border-green-600 px-3 py-1">
                {matchedCount} con precio
              </Badge>
              {unmatchedCount > 0 && (
                <Badge variant="outline" className="text-orange-600 border-orange-600 px-3 py-1">
                  {unmatchedCount} sin coincidencia
                </Badge>
              )}
              {hasDuplicateContainerConsecutives && (
                <Badge variant="outline" className="text-red-600 border-red-600 px-3 py-1">
                  ⚠️ {duplicateContainerConsecutives.length} containerConsecutive duplicados
                </Badge>
              )}
              {/* Mostrar conteo de tipos de contenedores detectados */}
              {(() => {
                const dryCount = previewData.filter(r => r.detectedContainerType === 'dry').length;
                const reeferCount = previewData.filter(r => r.detectedContainerType === 'reefer').length;
                return (
                  <>
                    {dryCount > 0 && (
                      <Badge variant="outline" className="text-blue-600 border-blue-600 px-3 py-1">
                        🚛 {dryCount} DRY
                      </Badge>
                    )}
                    {reeferCount > 0 && (
                      <Badge variant="outline" className="text-green-600 border-green-600 px-3 py-1">
                        ❄️ {reeferCount} REEFER
                      </Badge>
                    )}
                  </>
                );
              })()}

              {clientCompleteness.size > 0 && (
                <>
                  <Badge variant="outline" className="text-green-600 border-green-600 px-3 py-1">
                    {Array.from(clientCompleteness.values()).filter(c => c.isComplete).length} clientes completos
                  </Badge>
                  <Badge variant="outline" className="text-red-600 border-red-600 px-3 py-1">
                    {Array.from(clientCompleteness.values()).filter(c => !c.isComplete).length} clientes incompletos
                  </Badge>
                  <Badge variant="outline" className="text-blue-600 border-blue-600 px-3 py-1">
                    {Array.from(clientCompleteness.keys()).length} clientes únicos
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
                    <TableHead>F/E</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Tipo Detectado</TableHead>
                    <TableHead>Move Date</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Leg</TableHead>
                    <TableHead>Move Type</TableHead>
                    <TableHead>Precio</TableHead>
                    <TableHead>Estado</TableHead>
                    {/* <TableHead>Acciones</TableHead> */}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewData.map((record, index) => {
                    const clientName = record.line?.trim()
                    const clientStatus = clientName ? clientCompleteness.get(clientName) : null
                    const isClickable = record.isMatched && clientName && (clientStatus ? !clientStatus.isComplete : true)
                    return (
                    <TableRow key={index}>
                      <TableCell className="font-mono text-sm">{record.container}</TableCell>
                      <TableCell>{record.containerConsecutive}</TableCell>
                      <TableCell>{record.fe}</TableCell>
                      <TableCell>{record.size}</TableCell>
                      <TableCell>{record.type}</TableCell>
                      <TableCell>
                        {record.detectedContainerType ? (
                          <Badge variant={record.detectedContainerType === 'reefer' ? 'default' : 'secondary'}>
                            {record.detectedContainerType === 'reefer' ? 'REEFER' : 'DRY'}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>{record.moveDate}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <span
                            className={isClickable ? "cursor-pointer text-blue-600 hover:text-blue-800 underline" : ""}
                            onClick={isClickable ? () => handleClientClick(clientName!) : undefined}
                            title={isClickable ? "Haz clic para editar datos del cliente" : ""}
                          >
                            {record.line || "N/A"}
                          </span>
                          {record.isMatched && clientName && (
                            <div className="flex items-center">
                              {clientStatus ? (
                                clientStatus.isComplete ? (
                                  <Badge variant="outline" className="text-green-600 border-green-600 text-xs">
                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                    Completo
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-red-600 border-red-600 text-xs cursor-pointer" onClick={() => handleClientClick(clientName)}>
                                    <AlertCircle className="h-3 w-3 mr-1" />
                                    Incompleto
                                  </Badge>
                                )
                              ) : (
                                <Badge variant="outline" className="text-orange-600 border-orange-600 text-xs cursor-pointer" onClick={() => handleClientClick(clientName)}>
                                  <AlertCircle className="h-3 w-3 mr-1" />
                                  No existe
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
                    </TableRow>
                  )})}
                </TableBody>
              </Table>
            </div>
            
            <div className="mt-4 flex justify-between items-center">
              <div className="flex items-center gap-2">
                {!areAllClientsComplete() && (
                  <div className="flex items-center space-x-2 text-sm text-red-600">
                    <AlertCircle className="h-4 w-4" />
                    <span>Completa todos los datos de clientes antes de guardar</span>
                  </div>
                )}
                {hasDuplicateContainerConsecutives && (
                  <div className="flex items-center space-x-2 text-sm text-orange-600">
                    <AlertCircle className="h-4 w-4" />
                    <span>
                      ⚠️ Se detectaron {duplicateContainerConsecutives.length} containerConsecutive duplicados en el Excel. 
                      Los duplicados serán filtrados automáticamente al guardar.
                    </span>
                  </div>
                )}
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    // Refrescar verificación de clientes
                    const newCompleteness = new Map<string, { isComplete: boolean; missingFields: string[] }>()
                    previewData.forEach((record) => {
                      const clientName = record.line?.trim()
                      if (clientName && record.isMatched) {
                        const existing = findClientByName(clientName)
                        if (existing) {
                          newCompleteness.set(clientName, checkClientCompleteness(existing))
                        } else {
                          newCompleteness.set(clientName, { isComplete: false, missingFields: ["Cliente no existe"] })
                        }
                      }
                    })
                    setClientCompleteness(newCompleteness)
                    toast({ title: "Verificación actualizada", description: "Se ha refrescado la verificación de clientes" })
                  }}
                  className="text-xs"
                >
                  🔄 Refrescar verificación
                </Button>
              </div>
              
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
          
          // Refrescar la lista de clientes
          dispatch(fetchClients())
          
          // Si veníamos del flujo de faltantes, avanzar al siguiente automáticamente
          if (missingClients.length > 0) {
            // buscar por nombre actual en missingClients
            const currentIndex = missingClients.findIndex(mc => mc.name.toLowerCase() === clientName.toLowerCase())
            const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % missingClients.length : 0
            if (missingClients.length > 1) {
              setClientToEdit(missingClients[nextIndex])
              setShowClientModal(true)
            } else {
              // Si era el último, cerrar el modal
              setShowClientModal(false)
              setMissingClients([])
            }
          }
          
          toast({ 
            title: "Cliente actualizado", 
            description: `Los datos del cliente "${clientName}" han sido actualizados correctamente.` 
          })
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
                  onClick={() => {
                    setEditingClient({
                      type: "juridico",
                      companyName: clientToEdit.name, // Usar el nombre del Excel como companyName por defecto
                      name: clientToEdit.name, // Usar el nombre del Excel como name (nombre corto)
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
