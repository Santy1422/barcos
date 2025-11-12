"use client"

import { useState, useRef, useEffect, useCallback, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { 
  FileText, 
  Plus, 
  AlertCircle, 
  CheckCircle2,
  Ship,
  Database,
  Trash2,
  Edit,
  Save,
  Loader2,
  Check,
  Send,
  X
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useAppSelector, useAppDispatch } from "@/lib/hooks"
import { selectCurrentUser, type UserRole } from "@/lib/features/auth/authSlice"
import { createTruckingRecords, createPTYSSRecords, selectCreatingRecords, selectRecordsError, selectRecordsByModule, fetchRecordsByModule, updateRecordAsync, deleteRecordAsync, type ExcelRecord } from "@/lib/features/records/recordsSlice"
import { 
  selectAllClients,
  createClientAsync,
  fetchClients,
  type Client,
  type NaturalClient,
  type JuridicalClient,
  type ClientType
} from "@/lib/features/clients/clientsSlice"
import { 
  selectActiveNavieras,
  fetchNavieras
} from "@/lib/features/naviera/navieraSlice"
import { 
  selectPTYSSRoutes,
  fetchPTYSSRoutes,
  selectPTYSSRoutesLoading,
  selectPTYSSRoutesError,
  createPTYSSRoute,
  type PTYSSRouteInput
} from "@/lib/features/ptyssRoutes/ptyssRoutesSlice"
import { 
  selectPTYSSLocalRoutes,
  fetchPTYSSLocalRoutes,
  selectPTYSSLocalRoutesLoading,
  selectPTYSSLocalRoutesError,
  type PTYSSLocalRoute
} from "@/lib/features/ptyssLocalRoutes/ptyssLocalRoutesSlice"
import {
  selectAllContainerTypes,
  fetchContainerTypes,
  selectContainerTypesLoading,
} from "@/lib/features/containerTypes/containerTypesSlice"
import { parseTruckingExcel, matchTruckingDataWithRoutes, type TruckingExcelData } from "@/lib/excel-parser"
import { ClientModal } from "@/components/clients-management"

interface PTYSSRecordData {
  clientId: string
  associate?: string // Nombre del cliente para búsqueda posterior
  order: string
  container: string
  naviera: string
  from: string
  to: string
  operationType: string
  containerSize: string
  containerType: string
  estadia: string
  genset: string
  retencion: string
  pesaje: string
  ti: string
  matriculaCamion: string
  conductor: string
  numeroChasisPlaca: string
  moveDate: string
  notes: string
  totalValue: number
  recordType: "local" | "trasiego" // Campo para identificar registros locales o de trasiego
  // Campos para rutas locales
  localRouteId?: string // ID de la ruta local seleccionada
  localRoutePrice?: number // Precio de la ruta local
}

const initialRecordData: PTYSSRecordData = {
  clientId: "",
  order: "",
  container: "",
  naviera: "",
  from: "",
  to: "",
  operationType: "",
  containerSize: "40",
  containerType: "DV",
  estadia: "",
  genset: "",
  retencion: "",
  pesaje: "",
  ti: "",
  matriculaCamion: "",
  conductor: "",
  numeroChasisPlaca: "",
  moveDate: "",
  notes: "",
  totalValue: 0,
  recordType: "local",
  localRouteId: "",
  localRoutePrice: 0
}

export function PTYSSUpload() {
  const dispatch = useAppDispatch()
  const { toast } = useToast()
  
  // Obtener usuario actual para verificar permisos
  const currentUser = useAppSelector(selectCurrentUser)
  
  // Verificar si el usuario tiene SOLO rol de operaciones (no facturación ni admin)
  const userRoles: UserRole[] = currentUser?.roles || (currentUser?.role ? [currentUser.role] : [])
  const isOnlyOperations = userRoles.includes('operaciones') && !userRoles.includes('facturacion') && !userRoles.includes('administrador')
  const canViewPrices = !isOnlyOperations // Solo ocultar precios si es SOLO operaciones
  
  const [currentRecord, setCurrentRecord] = useState<PTYSSRecordData>(initialRecordData)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<"local" | "trasiego">("local")
  const [confirmSendDialogOpen, setConfirmSendDialogOpen] = useState(false)
  const [recordToSend, setRecordToSend] = useState<string | null>(null)
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null)
  
  // Excel upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewData, setPreviewData] = useState<TruckingExcelData[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  
  // Obtener clientes y navieras del store de Redux
  const clients = useAppSelector(selectAllClients)
  const navieras = useAppSelector(selectActiveNavieras)
  const clientsLoading = useAppSelector((state) => state.clients.loading)
  
  // PTYSS Routes state
  const routes = useAppSelector(selectPTYSSRoutes)
  const routesLoading = useAppSelector(selectPTYSSRoutesLoading)
  const routesError = useAppSelector(selectPTYSSRoutesError)
  
  // PTYSS Local Routes state
  const localRoutes = useAppSelector(selectPTYSSLocalRoutes)
  const localRoutesLoading = useAppSelector(selectPTYSSLocalRoutesLoading)
  const localRoutesError = useAppSelector(selectPTYSSLocalRoutesError)

  // Container Types state
  const containerTypes = useAppSelector(selectAllContainerTypes)
  const containerTypesLoading = useAppSelector(selectContainerTypesLoading)
  
  const isCreatingRecords = useAppSelector(selectCreatingRecords)
  const recordsError = useAppSelector(selectRecordsError)
  
  // Obtener registros PTYSS desde Redux (para mostrar registros pendientes)
  const ptyssRecords = useAppSelector((state) => selectRecordsByModule(state, "ptyss"))

  // Estado para filtro de estado de registros locales
  const [statusFilter, setStatusFilter] = useState<'all' | 'pendiente' | 'completado' | 'cancelado'>('all')

  // Estado para crear rutas desde registros sin match
  const [showCreateRouteModal, setShowCreateRouteModal] = useState(false)
  const [recordForRoute, setRecordForRoute] = useState<TruckingExcelData | null>(null)
  const [newRoute, setNewRoute] = useState({
    from: "",
    to: "",
    containerType: "",
    routeType: "single" as "single" | "RT",
    price: 0,
    status: "FULL" as "FULL" | "EMPTY",
    cliente: "",
    routeArea: ""
  })
  const [shouldReprocess, setShouldReprocess] = useState(false)

  // Debug: Log clientes cargados
  console.log('🔍 PTYSSUpload - clients:', clients)
  console.log('🔍 PTYSSUpload - clients.length:', clients.length)
  console.log('🔍 PTYSSUpload - clientsLoading:', clientsLoading)

  // Cargar navieras al montar el componente
  useEffect(() => {
    dispatch(fetchNavieras('active'))
  }, [dispatch])

  // Cargar clientes al montar el componente
  useEffect(() => {
    dispatch(fetchClients())
  }, [dispatch])

  // Cargar rutas al montar el componente - cargar todas las rutas para matching
  useEffect(() => {
    dispatch(fetchPTYSSRoutes({ page: 1, limit: 10000 })) // Cargar hasta 10,000 rutas para matching
  }, [dispatch])

  // Cargar rutas locales al montar el componente
  useEffect(() => {
    dispatch(fetchPTYSSLocalRoutes())
  }, [dispatch])

  // Cargar tipos de contenedores al montar el componente
  useEffect(() => {
    dispatch(fetchContainerTypes())
  }, [dispatch])

  // Cargar registros PTYSS al montar el componente
  useEffect(() => {
    dispatch(fetchRecordsByModule("ptyss"))
  }, [dispatch])

  // Filtrar registros locales (pendientes, completados y cancelados)
  const pendingLocalRecords = useMemo(() => {
    const filtered = ptyssRecords.filter((record: ExcelRecord) => {
      const data = record.data as Record<string, any>
      // Filtrar solo registros locales (tienen recordType = "local")
      // Mostrar pendientes, completados y cancelados (excluir solo los que ya tienen factura)
      return data.recordType === "local" && 
             (record.status === "pendiente" || record.status === "completado" || record.status === "cancelado") && 
             !record.invoiceId
    })
    
    // Aplicar filtro de estado si no es 'all'
    if (statusFilter === 'all') {
      return filtered
    }
    
    return filtered.filter(record => record.status === statusFilter)
  }, [ptyssRecords, statusFilter])

  // Función para re-procesar el Excel (simula el handleFileChange pero sin seleccionar archivo)
  const reprocessExcel = useCallback(async () => {
    if (!selectedFile) return
    
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
      const realData = await parseTruckingExcel(selectedFile)
      
      console.log("=== RE-PROCESANDO EXCEL PTYSS ===")
      console.log("Datos del Excel:", realData)
      console.log("Rutas disponibles:", routes)
      
      // Aplicar matching con las rutas configuradas de PTYSS
      const matchedData = matchTruckingDataWithPTYSSRoutes(realData, routes)
      
      console.log("Datos después del re-matching:", matchedData)
      
      // Verificar clientes faltantes antes de mostrar los datos
      const processedData = await processMissingClients(matchedData)
      
      setPreviewData(processedData)
      
      // Contar registros con match
      const matchedCount = processedData.filter(record => record.isMatched).length
      const unmatchedCount = processedData.length - matchedCount
      
      console.log(`Re-procesamiento completado: ${matchedCount}/${processedData.length} con match`)
      
      toast({
        title: "✅ Excel re-procesado",
        description: `${matchedCount} registros con precio asignado, ${unmatchedCount} sin coincidencia.`,
      })
    } catch (error) {
      console.error('Error al re-procesar archivo:', error)
      toast({
        title: "Error al re-procesar archivo",
        description: "No se pudo re-procesar el archivo Excel.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }, [selectedFile, routesLoading, routes, toast])

  // Debug: Monitorear cuando las rutas PTYSS se cargan
  useEffect(() => {
    console.log("=== RUTAS PTYSS CARGADAS ===")
    console.log("Rutas PTYSS disponibles:", routes)
    console.log("Número de rutas PTYSS:", routes.length)
    console.log("Cargando rutas PTYSS:", routesLoading)
    console.log("Error en rutas PTYSS:", routesError)
    if (routes.length > 0) {
      routes.forEach((route, index) => {
        console.log(`Ruta PTYSS ${index + 1}:`, {
          name: route.name,
          from: route.from,
          to: route.to,
          containerType: route.containerType,
          routeType: route.routeType,
          status: route.status,
          cliente: route.cliente,
          routeArea: route.routeArea,
          price: route.price
        })
      })
    }
    console.log("")
  }, [routes, routesLoading, routesError])

  // Re-procesar Excel cuando se actualicen las rutas (después de crear una nueva ruta)
  useEffect(() => {
    if (shouldReprocess && !routesLoading && routes.length > 0 && selectedFile) {
      console.log("=== RE-PROCESANDO EXCEL DESPUÉS DE CREAR RUTA ===")
      reprocessExcel()
      setShouldReprocess(false)
    }
  }, [shouldReprocess, routesLoading, routes, selectedFile, reprocessExcel])

  // Función helper para formatear fechas correctamente (evitar problema de zona horaria)
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A'
    
    // Si la fecha está en formato YYYY-MM-DD, crear la fecha en zona horaria local
    if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [year, month, day] = dateString.split('-').map(Number)
      const date = new Date(year, month - 1, day) // month - 1 porque Date usa 0-indexado
      return date.toLocaleDateString('es-ES')
    }
    
    // Si la fecha está en formato ISO con zona horaria UTC (ej: 2025-09-09T00:00:00.000+00:00)
    // Extraer solo la parte de la fecha y crear un objeto Date en zona horaria local
    if (dateString.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)) {
      const datePart = dateString.split('T')[0] // Obtener solo YYYY-MM-DD
      const [year, month, day] = datePart.split('-').map(Number)
      const date = new Date(year, month - 1, day) // Crear en zona horaria local
      return date.toLocaleDateString('es-ES')
    }
    
    // Para otros formatos, usar el método normal
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return 'N/A'
    return date.toLocaleDateString('es-ES')
  }

  // Cargar servicios locales fijos al montar el componente
  useEffect(() => {
    const fetchLocalServices = async () => {
      setLocalServicesLoading(true)
      try {
        const token = localStorage.getItem('token')
        
        const response = await fetch('http://localhost:8080/api/local-services', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })
        
        if (response.ok) {
          const data = await response.json()
          const services = data.data?.services || []
          
          // Filtrar solo los servicios locales fijos
          const fixedServices = services.filter((service: any) => 
            ['CLG097', 'TRK163', 'TRK179', 'SLR168'].includes(service.code)
          )
          
          setLocalServices(fixedServices)
          console.log('🔍 PTYSSUpload - Local services loaded:', fixedServices)
        } else {
          console.error('🔍 Error loading local services:', response.status, response.statusText)
        }
      } catch (error) {
        console.error('🔍 Error loading local services:', error)
      } finally {
        setLocalServicesLoading(false)
      }
    }
    
    fetchLocalServices()
  }, [])

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

  // Estado para el formulario de nuevo cliente
  const [newClient, setNewClient] = useState({
    companyName: "",
    ruc: "",
    contactName: "",
    email: "",
    phone: "",
    address: "",
    sapCode: ""
  })
  
  const [showAddClientDialog, setShowAddClientDialog] = useState(false)

  // Estado para manejar clientes faltantes del Excel de trasiego
  const [missingClients, setMissingClients] = useState<Array<{
    name: string
    records: TruckingExcelData[]
  }>>([])
  const [showClientModal, setShowClientModal] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [clientToEdit, setClientToEdit] = useState<{
    name: string
    records: TruckingExcelData[]
  } | null>(null)
  
  // Estado para tracking de clientes completos/incompletos
  const [clientCompleteness, setClientCompleteness] = useState<Map<string, {
    isComplete: boolean
    missingFields: string[]
  }>>(new Map())
  
  // Estado para servicios locales fijos
  const [localServices, setLocalServices] = useState<any[]>([])
  const [localServicesLoading, setLocalServicesLoading] = useState(false)
  
  // Estado para filtro de matching
  const [matchFilter, setMatchFilter] = useState<'all' | 'matched' | 'unmatched'>('all')

  // Filtrar registros basado en el filtro de matching
  const filteredPreviewData = useMemo(() => {
    if (matchFilter === 'all') return previewData
    if (matchFilter === 'matched') return previewData.filter(record => record.isMatched)
    if (matchFilter === 'unmatched') return previewData.filter(record => !record.isMatched)
    return previewData
  }, [previewData, matchFilter])

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

  // Recargar clientes cuando cambie el estado de completitud
  useEffect(() => {
    if (clientCompleteness.size > 0) {
      dispatch(fetchClients())
    }
  }, [clientCompleteness.size, dispatch])

  // Actualizar completitud cuando cambien los clientes
  useEffect(() => {
    if (clients.length > 0 && clientCompleteness.size > 0) {
      // Recalcular completitud para todos los clientes en el estado
      const newCompleteness = new Map<string, { isComplete: boolean; missingFields: string[] }>()
      
      for (const [clientName, _] of clientCompleteness) {
        const client = findClientByName(clientName)
        if (client) {
          const completeness = checkClientCompleteness(client)
          newCompleteness.set(clientName, completeness)
        }
      }
      
      setClientCompleteness(newCompleteness)
    }
  }, [clients, clientCompleteness.size])

  // Funciones para manejar clientes
  const handleAddClient = async () => {
    if (!newClient.sapCode || !newClient.companyName || !newClient.ruc || !newClient.email) {
      toast({
        title: "Error",
        description: "Completa los campos obligatorios (Código SAP, Nombre de Empresa, RUC y Email)",
        variant: "destructive"
      })
      return
    }

    try {
      const clientData = {
        type: "juridico" as const,
        companyName: newClient.companyName,
        ruc: newClient.ruc,
        email: newClient.email,
        phone: newClient.phone || undefined,
        contactName: newClient.contactName || undefined,
        address: newClient.address || undefined,
        sapCode: newClient.sapCode,
        isActive: true
      }

      await dispatch(createClientAsync(clientData)).unwrap()
      
      setNewClient({
        companyName: "",
        ruc: "",
        contactName: "",
        email: "",
        phone: "",
        address: "",
        sapCode: ""
      })
      setShowAddClientDialog(false)

      toast({
        title: "Cliente agregado",
        description: "El nuevo cliente ha sido agregado correctamente",
      })
    } catch (error: any) {
      console.error("Error al crear cliente:", error)
      toast({
        title: "Error",
        description: error.message || "Error al crear el cliente. Inténtalo de nuevo.",
        variant: "destructive"
      })
    }
  }

  const getSelectedClient = () => {
    return clients.find((client: any) => client && (client._id || client.id) === currentRecord.clientId)
  }

  // Función para verificar si un cliente existe por nombre
  const findClientByName = (name: string): Client | null => {
    console.log('🔍 Buscando cliente por nombre:', name)
    console.log('🔍 Clientes disponibles:', clients.map((c: any) => ({
      type: c.type,
      name: c.name,
      companyName: c.companyName,
      fullName: c.fullName,
      sapCode: c.sapCode
    })))
    
    const foundClient = clients.find((client: any) => {
      // Buscar por el campo 'name' (nombre corto) que es lo que viene del Excel
      const match = client.name?.toLowerCase() === name.toLowerCase()
      console.log(`🔍 Comparando name: "${client.name}" vs "${name}" = ${match}`)
      return match
    }) || null
    
    console.log('🔍 Cliente encontrado:', foundClient ? 'SÍ' : 'NO')
    return foundClient
  }

  // Función para crear un cliente temporal con solo el nombre
  const createTemporaryClient = async (name: string): Promise<Client> => {
    const tempClientData = {
      type: "juridico" as const,
      companyName: name,
      ruc: "",
      contactName: "",
      email: "",
      phone: "",
      address: "",
      sapCode: "",
      isActive: true
    }

    try {
      const result = await dispatch(createClientAsync(tempClientData)).unwrap()
      toast({
        title: "Cliente temporal creado",
        description: `Se creó un cliente temporal para "${name}". Completa los datos faltantes.`,
      })
      return result
    } catch (error: any) {
      console.error("Error al crear cliente temporal:", error)
      toast({
        title: "Error",
        description: "Error al crear cliente temporal. Inténtalo de nuevo.",
        variant: "destructive"
      })
      throw error
    }
  }

  // Función para verificar y procesar clientes faltantes del Excel
  const processMissingClients = async (excelData: TruckingExcelData[]): Promise<TruckingExcelData[]> => {
    const missingClientsMap = new Map<string, TruckingExcelData[]>()
    const newClientCompleteness = new Map<string, { isComplete: boolean; missingFields: string[] }>()
    
    // Agrupar registros por cliente SOLO para registros que hicieron match
    excelData.forEach(record => {
      const clientName = record.associate?.trim()
      console.log('🔍 Procesando registro - clientName del Excel:', clientName, 'isMatched:', record.isMatched)
      console.log('🔍 record.line:', record.line, 'record.associate:', record.associate)
      if (clientName && record.isMatched) {
        if (!missingClientsMap.has(clientName)) {
          missingClientsMap.set(clientName, [])
        }
        missingClientsMap.get(clientName)!.push(record)
      }
    })

    // Verificar qué clientes faltan y su completitud
    const missingClientsList: Array<{name: string, records: TruckingExcelData[]}> = []
    
    for (const [clientName, records] of missingClientsMap) {
      const existingClient = findClientByName(clientName)
      if (!existingClient) {
        missingClientsList.push({ name: clientName, records })
        // Marcar como incompleto
        newClientCompleteness.set(clientName, { isComplete: false, missingFields: ['Todos los campos'] })
      } else {
        // Verificar completitud del cliente existente
        const completeness = checkClientCompleteness(existingClient)
        newClientCompleteness.set(clientName, completeness)
      }
    }

    // Actualizar estado de completitud
    setClientCompleteness(newClientCompleteness)

    if (missingClientsList.length > 0) {
      setMissingClients(missingClientsList)
      setShowClientModal(true)
      setClientToEdit(missingClientsList[0])
      
      // Contar total de registros con match
      const totalMatchedRecords = missingClientsList.reduce((total, client) => total + client.records.length, 0)
      
      // Mostrar toast informativo
      toast({
        title: "Clientes faltantes detectados",
        description: `Se encontraron ${missingClientsList.length} clientes que no existen en la base de datos para ${totalMatchedRecords} registros con match. Completa sus datos.`,
      })
      
      // Retornar los datos originales por ahora
      return excelData
    }

    return excelData
  }

  // Función para verificar si un cliente tiene todos los datos completos
  const checkClientCompleteness = (client: any): { isComplete: boolean; missingFields: string[] } => {
    const missingFields: string[] = []
    
    if (client.type === 'juridico') {
      if (!client.companyName || client.companyName.trim() === '') missingFields.push('Nombre de empresa')
      if (!client.ruc || client.ruc.trim() === '') missingFields.push('RUC')
      if (!client.email || client.email.trim() === '') missingFields.push('Email')
      if (!client.sapCode || client.sapCode.trim() === '') missingFields.push('Código SAP')
    } else {
      if (!client.fullName || client.fullName.trim() === '') missingFields.push('Nombre completo')
      if (!client.documentNumber || client.documentNumber.trim() === '') missingFields.push('Número de documento')
      if (!client.sapCode || client.sapCode.trim() === '') missingFields.push('Código SAP')
    }
    
    console.log('Checking completeness for client:', client.companyName || client.fullName)
    console.log('Missing fields:', missingFields)
    console.log('Is complete:', missingFields.length === 0)
    
    return {
      isComplete: missingFields.length === 0,
      missingFields
    }
  }

  // Función para actualizar el estado de completitud de un cliente
  const updateClientCompleteness = (clientName: string, clientData: any) => {
    // Buscar el cliente actualizado en la lista de clientes
    const updatedClient = clients.find((c: any) => {
      if (c.type === 'juridico') {
        return c.companyName?.toLowerCase() === clientName.toLowerCase()
      } else if (c.type === 'natural') {
        return c.fullName?.toLowerCase() === clientName.toLowerCase()
      }
      return false
    })
    
    if (updatedClient) {
      const completeness = checkClientCompleteness(updatedClient)
      setClientCompleteness(prev => new Map(prev).set(clientName, completeness))
    }
  }

  // Función para verificar si todos los clientes están completos
  const areAllClientsComplete = (): boolean => {
    if (clientCompleteness.size === 0) return true
    
    for (const [_, completeness] of clientCompleteness) {
      if (!completeness.isComplete) return false
    }
    return true
  }

  // Route creation handlers
  const handleCreateRouteClick = (record: TruckingExcelData) => {
    setRecordForRoute(record)
    
    // Pre-llenar el formulario con datos del registro
    const legParts = record.leg?.split('/') || ['', '']
    const from = legParts[0]?.trim() || ''
    const to = legParts[1]?.trim() || ''
    
    setNewRoute({
      from: from,
      to: to,
      containerType: record.type || "",
      routeType: record.moveType?.toLowerCase() === 'rt' ? "RT" : "single",
      price: 0,
      status: record.fe === "E" || record.fe === "EMPTY" ? "EMPTY" : "FULL",
      cliente: "PTG", // Usar PTG como cliente fijo para registros de trasiego
      routeArea: record.route || ""
    })
    
    setShowCreateRouteModal(true)
  }

  const handleCreateRoute = async () => {
    if (!newRoute.from || !newRoute.to || !newRoute.containerType || !newRoute.routeType || newRoute.price <= 0 || !newRoute.status || !newRoute.cliente || !newRoute.routeArea) {
      toast({ title: "Error", description: "Completa todos los campos obligatorios", variant: "destructive" })
      return
    }
    
    try {
      console.log("🔧 Intentando crear ruta PTYSS:", newRoute)
      const result = await dispatch(createPTYSSRoute(newRoute)).unwrap()
      console.log("✅ Ruta PTYSS creada exitosamente:", result)
      console.log("✅ ID de la ruta creada:", result._id || result.id)
      
      // Cerrar modal y limpiar estado
      setShowCreateRouteModal(false)
      setRecordForRoute(null)
      setNewRoute({
        from: "",
        to: "",
        containerType: "",
        routeType: "single",
        price: 0,
        status: "FULL",
        cliente: "",
        routeArea: ""
      })
      
      // Activar flag para re-procesar cuando las rutas se actualicen
      if (selectedFile && previewData.length > 0) {
        console.log("=== RUTA PTYSS CREADA, ACTIVANDO RE-PROCESAMIENTO ===")
        setShouldReprocess(true)
        toast({ 
          title: "Ruta creada", 
          description: `La ruta ${newRoute.from}/${newRoute.to} ha sido creada. Re-procesando Excel...` 
        })
      } else {
        toast({ title: "Ruta creada", description: `La ruta ${newRoute.from}/${newRoute.to} ha sido creada exitosamente` })
      }
    } catch (error: any) {
      console.error("❌ Error al crear ruta PTYSS:", error)
      console.error("❌ Detalles del error:", error.message, error.stack)
      toast({ title: "Error", description: error.message || "Error al crear la ruta", variant: "destructive" })
    }
  }

  const handleCancelCreateRoute = () => {
    setShowCreateRouteModal(false)
    setRecordForRoute(null)
    setNewRoute({
      from: "",
      to: "",
      containerType: "",
      routeType: "single",
      price: 0,
      status: "FULL",
      cliente: "",
      routeArea: ""
    })
  }


  // Función para manejar la creación/edición de cliente desde el modal
  const handleClientCreated = (client: any) => {
    // Actualizar completitud del cliente
    updateClientCompleteness(client.companyName || client.fullName, client)
    
    // Remover el cliente de la lista de faltantes
    setMissingClients(prev => prev.filter(c => c.name !== clientToEdit?.name))
    
    // Si hay más clientes faltantes, mostrar el siguiente
    if (missingClients.length > 1) {
      const nextClient = missingClients.find(c => c.name !== clientToEdit?.name)
      if (nextClient) {
        setClientToEdit(nextClient)
        setShowClientModal(true)
      } else {
        setShowClientModal(false)
        setClientToEdit(null)
      }
    } else {
      // No hay más clientes faltantes, cerrar modal
      setShowClientModal(false)
      setClientToEdit(null)
      
      // Reprocesar el Excel con los clientes creados
      if (selectedFile) {
        handleFileChange({ target: { files: [selectedFile] } } as any)
      }
    }
  }

  // Función para manejar clic en cliente para editarlo
  const handleClientClick = (clientName: string) => {
    const existingClient = findClientByName(clientName)
    if (existingClient) {
      setEditingClient(existingClient)
    }
    // Si no existe, no hacemos nada - el usuario debe crear el cliente desde el modal de faltantes
  }

  // Obtener rutas locales asociadas a un cliente específico por su realClientId
  const getLocalRoutesByRealClientId = (clientId: string): PTYSSLocalRoute[] => {
    return localRoutes.filter(route => {
      // El realClientId puede ser un string (ID) o un objeto poblado
      if (typeof route.realClientId === 'string') {
        return route.realClientId === clientId
      } else if (route.realClientId && typeof route.realClientId === 'object') {
        return route.realClientId._id === clientId
      }
      return false
    })
  }

  // Obtener el esquema de rutas asociado al cliente seleccionado
  const getSelectedClientRouteSchema = () => {
    if (!currentRecord.clientId) return null
    const clientRoutes = getLocalRoutesByRealClientId(currentRecord.clientId)
    return clientRoutes.length > 0 ? clientRoutes[0].clientName : null
  }

  // Obtener ruta seleccionada
  const getSelectedLocalRoute = () => {
    if (!currentRecord.localRouteId) return null
    return localRoutes.find(route => route._id === currentRecord.localRouteId)
  }

  // Obtener precio correcto según el tipo de contenedor
  const getRoutePrice = (route: PTYSSLocalRoute, containerType: string): number => {
    if (!route) return 0
    
    // Determinar si es contenedor refrigerado
    const isReefer = containerType === 'RE'
    
    if (isReefer) {
      return route.priceReefer || route.price || 0
    } else {
      // Para DV, HC y otros tipos usar precio regular
      return route.priceRegular || route.price || 0
    }
  }

  const handleAddRecord = async () => {
    // Verificar que el cliente tenga rutas locales asociadas
    const clientRoutes = getLocalRoutesByRealClientId(currentRecord.clientId)
    
    if (!currentRecord.clientId || !currentRecord.order || !currentRecord.container || !currentRecord.naviera || 
        !currentRecord.localRouteId || !currentRecord.operationType || !currentRecord.containerSize || 
        !currentRecord.containerType || !currentRecord.conductor) {
      toast({
        title: "Error",
        description: "Completa todos los campos obligatorios marcados con *",
        variant: "destructive"
      })
      return
    }

    // Verificar que el cliente tenga rutas locales asociadas
    if (clientRoutes.length === 0) {
      toast({
        title: "Error",
        description: "El cliente seleccionado no tiene rutas locales asociadas. Configure las rutas en la sección de Configuración → Rutas Local.",
        variant: "destructive"
      })
      return
    }

    setIsSaving(true)

    try {
      if (editingRecordId) {
        // Modo edición: actualizar registro existente
        const updatedRecord = {
          ...currentRecord,
          totalValue: calculateTotalValue(currentRecord)
        }
        
        await dispatch(updateRecordAsync({
          id: editingRecordId,
          updates: {
            data: updatedRecord,
            totalValue: updatedRecord.totalValue || 0
          }
        })).unwrap()
        
        toast({
          title: "Registro actualizado",
          description: "El registro ha sido actualizado exitosamente",
        })
      } else {
        // Modo creación: guardar nuevo registro
        const tempObjectId = new Date().getTime().toString(16).padStart(24, '0').substring(0, 24)
        
        const newRecord = {
          ...currentRecord,
          totalValue: calculateTotalValue(currentRecord)
        }
        
        const recordsData = [{
          data: newRecord,
          totalValue: newRecord.totalValue || 0
        }]
        
        await dispatch(createPTYSSRecords({
          excelId: tempObjectId,
          recordsData
        })).unwrap()
        
        toast({
          title: "Registro guardado",
          description: "El registro ha sido guardado exitosamente en la base de datos con estado pendiente",
        })
      }
      
      // Refrescar los registros para actualizar la lista
      dispatch(fetchRecordsByModule("ptyss"))
      
      // Cerrar el modal y resetear
      setCurrentRecord({
        ...initialRecordData,
        localRouteId: "",
        localRoutePrice: 0
      })
      setIsDialogOpen(false)
      setEditingRecordId(null)
      
    } catch (error) {
      console.error("Error al guardar:", error)
      toast({
        title: "Error",
        description: "Error al guardar el registro en el sistema",
        variant: "destructive"
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleEditRecord = async (record: ExcelRecord) => {
    const data = record.data as Record<string, any>
    
    // Precargar los datos en el formulario
    setCurrentRecord({
      clientId: data.clientId || "",
      associate: data.associate || "",
      order: data.order || "",
      container: data.container || "",
      naviera: data.naviera || "",
      from: data.from || "",
      to: data.to || "",
      operationType: data.operationType || "",
      containerSize: data.containerSize || "",
      containerType: data.containerType || "",
      estadia: data.estadia || "",
      genset: data.genset || "",
      retencion: data.retencion || "",
      pesaje: data.pesaje || "",
      ti: data.ti || "",
      matriculaCamion: data.matriculaCamion || "",
      conductor: data.conductor || "",
      numeroChasisPlaca: data.numeroChasisPlaca || "",
      moveDate: data.moveDate || "",
      notes: data.notes || "",
      totalValue: data.totalValue || 0,
      recordType: "local",
      localRouteId: data.localRouteId || "",
      localRoutePrice: data.localRoutePrice || 0
    })
    
    // Refrescar las rutas locales antes de abrir el diálogo y esperar a que termine
    await dispatch(fetchPTYSSLocalRoutes())
    
    // Guardar el ID del registro que se está editando
    setEditingRecordId(record._id || record.id || "")
    
    // Abrir el modal
    setIsDialogOpen(true)
  }

  const calculateTotalValue = (record: PTYSSRecordData): number => {
    let total = 0
    
    // Agregar precio de ruta local si existe
    if (record.localRoutePrice) total += record.localRoutePrice
    
    // Obtener precios de servicios locales desde la configuración
    const getServicePrice = (serviceCode: string): number => {
      // Buscar en los servicios locales fijos
      const localService = localServices.find((service: any) => service.code === serviceCode)
      return localService?.price || 10 // Fallback a $10 si no se encuentra
    }
    
    // Calcular servicios locales basados en la configuración
    // TI (CLG097) - precio fijo
    if (record.ti === 'si') {
      total += getServicePrice('CLG097')
    }
    
    // Estadia (TRK179) - precio fijo
    if (record.estadia === 'si') {
      total += getServicePrice('TRK179')
    }
    
    // Retencion (TRK163) - precio por día después del tercer día
    if (record.retencion && parseFloat(record.retencion) > 0) {
      const dias = parseFloat(record.retencion)
      if (dias > 3) {
        const diasCobrables = dias - 3 // Solo cobrar días después del tercero
        total += getServicePrice('TRK163') * diasCobrables
      }
      // Si son 3 días o menos, no se cobra nada
    }
    
    // Genset (SLR168) - precio por día
    if (record.genset && parseFloat(record.genset) > 0) {
      total += getServicePrice('SLR168') * parseFloat(record.genset)
    }
    
    // Agregar pesaje directamente (monto fijo)
    if (record.pesaje) total += parseFloat(record.pesaje) || 0
    
    return total
  }


  // Función para abrir el diálogo de confirmación
  const handleOpenSendConfirmation = (recordId: string) => {
    setRecordToSend(recordId)
    setConfirmSendDialogOpen(true)
  }

  // Función para cambiar el estado de un registro pendiente a completado
  const handleMarkAsCompleted = async () => {
    if (!recordToSend) return

    try {
      await dispatch(updateRecordAsync({
        id: recordToSend,
        updates: {
          status: "completado"
        }
      })).unwrap()
      
      toast({
        title: "Registro enviado",
        description: "El registro ha sido marcado como completado y ahora aparecerá en la lista de prefactura",
      })
      
      // Refrescar los registros
      dispatch(fetchRecordsByModule("ptyss"))
      
      // Cerrar el diálogo
      setConfirmSendDialogOpen(false)
      setRecordToSend(null)
      
    } catch (error: any) {
      console.error("Error al actualizar estado:", error)
      toast({
        title: "Error al enviar",
        description: error.message || "Error al actualizar el estado del registro",
        variant: "destructive"
      })
    }
  }

  // Función para cancelar un registro
  const handleMarkAsCancelled = async () => {
    if (!recordToSend) return

    try {
      await dispatch(updateRecordAsync({
        id: recordToSend,
        updates: {
          status: "cancelado"
        }
      })).unwrap()
      
      toast({
        title: "Registro cancelado",
        description: "El registro ha sido marcado como cancelado",
      })
      
      // Refrescar los registros
      dispatch(fetchRecordsByModule("ptyss"))
      
      // Cerrar el diálogo
      setConfirmSendDialogOpen(false)
      setRecordToSend(null)
      
    } catch (error: any) {
      console.error("Error al cancelar registro:", error)
      toast({
        title: "Error al cancelar",
        description: error.message || "Error al actualizar el estado del registro",
        variant: "destructive"
      })
    }
  }

  // Función para eliminar un registro pendiente
  const handleDeletePendingRecord = async (recordId: string) => {
    try {
      await dispatch(deleteRecordAsync(recordId)).unwrap()
      
      toast({
        title: "Registro eliminado",
        description: "El registro ha sido eliminado exitosamente",
      })
      
      // Refrescar los registros
      dispatch(fetchRecordsByModule("ptyss"))
      
    } catch (error: any) {
      toast({
        title: "Error al eliminar registro",
        description: error.message || "Error al eliminar el registro",
        variant: "destructive"
      })
    }
  }

  // Función para hacer matching de datos de trucking con rutas de PTYSS
  const matchTruckingDataWithPTYSSRoutes = (truckingData: TruckingExcelData[], ptyssRoutes: Array<{_id: string, name: string, from: string, to: string, containerType: string, routeType: "single" | "RT", status: string, cliente: string, routeArea: string, price: number}>): TruckingExcelData[] => {
    console.log("=== INICIANDO MATCHING PTYSS CON DATOS TRUCKING ===")
    console.log("Rutas PTYSS disponibles:", ptyssRoutes)
    console.log("")
    
    return truckingData.map((record, index) => {
      console.log(`Procesando registro PTYSS ${index + 1}:`)
      console.log(`  Leg: "${record.leg}"`)
      console.log(`  MoveType: "${record.moveType}"`)
      console.log(`  Type: "${record.type}"`)
      console.log(`  Associate: "${record.associate}"`)
      console.log(`  Line: "${record.line}"`)
      console.log(`  Route: "${record.route}"`)
      
      // Extraer from y to del campo leg (separado por "/")
      const legParts = record.leg?.split('/').map(part => part.trim()) || [];
      const from = legParts[0] || '';
      const to = legParts[1] || '';
      
      console.log(`  From extraído: "${from}"`)
      console.log(`  To extraído: "${to}"`)
      console.log(`  Route Area extraído: "${record.route}"`)
      
      // Buscar coincidencia basada en los criterios de PTYSS:
      // 1. from y to extraídos del leg
      // 2. moveType (routeType de la ruta) - case insensitive
      // 3. type (containerType de la ruta) - mapear tipos
      // 4. fe (status de la ruta) - FULL/EMPTY
      // 5. line (cliente de la ruta) - opcional para matching más preciso
      // 6. route (routeArea de la ruta) - área de ruta
      
      const matchedRoute = ptyssRoutes.find(route => {
        // Matching por from y to extraídos del leg
        const fromMatch = route.from?.toUpperCase() === from.toUpperCase();
        const toMatch = route.to?.toUpperCase() === to.toUpperCase();
        
        // Matching por moveType (routeType de la ruta) - case insensitive
        const normalizedMoveType = record.moveType?.trim().toLowerCase() || '';
        const moveTypeMatch = 
          (normalizedMoveType === 's' && route.routeType === 'single') ||
          (normalizedMoveType === 'single' && route.routeType === 'single') ||
          (normalizedMoveType === 'rt' && route.routeType === 'RT') ||
          (normalizedMoveType === 'rt' && route.routeType === 'RT');
        
        // Matching por type (containerType de la ruta) - mapear tipos de PTYSS
        const normalizedType = record.type?.trim().toUpperCase() || '';
        const containerTypeMatch = route.containerType?.toUpperCase() === normalizedType;
        
        // Matching por fe (status de la ruta) - FULL/EMPTY
        const normalizedFE = record.fe?.trim().toUpperCase() || '';
        const statusMatch = 
          !normalizedFE || // Si no hay FE, hacer match con cualquier status
          route.status?.toUpperCase() === normalizedFE ||
          (normalizedFE === 'F' && route.status?.toUpperCase() === 'FULL') ||
          (normalizedFE === 'E' && route.status?.toUpperCase() === 'EMPTY') ||
          (normalizedFE === 'FULL' && route.status?.toUpperCase() === 'FULL') ||
          (normalizedFE === 'EMPTY' && route.status?.toUpperCase() === 'EMPTY');
        
        // Matching por cliente PTG - todos los registros de trasiego usan PTG
        const clienteMatch = 
          route.cliente?.toUpperCase() === 'PTG' ||
          route.cliente?.toUpperCase().includes('PTG') ||
          'PTG'.includes(route.cliente?.toUpperCase() || '');
        
        // Matching por route (routeArea de la ruta) - área de ruta
        const normalizedRoute = record.route?.trim().toUpperCase() || '';
        const routeAreaMatch = 
          !normalizedRoute || // Si no hay route, hacer match con cualquier área
          route.routeArea?.toUpperCase() === normalizedRoute ||
          route.routeArea?.toUpperCase().includes(normalizedRoute) ||
          normalizedRoute.includes(route.routeArea?.toUpperCase() || '');
        
        console.log(`  Comparando con ruta PTYSS "${route.name}":`)
        console.log(`    From: "${from}" vs "${route.from}" = ${fromMatch}`)
        console.log(`    To: "${to}" vs "${route.to}" = ${toMatch}`)
        console.log(`    MoveType normalizado: "${normalizedMoveType}" vs "${route.routeType}" = ${moveTypeMatch}`)
        console.log(`    Type normalizado: "${normalizedType}" vs "${route.containerType}" = ${containerTypeMatch}`)
        console.log(`    FE normalizado: "${normalizedFE}" vs "${route.status}" = ${statusMatch}`)
        console.log(`    Cliente PTG vs "${route.cliente}" = ${clienteMatch}`)
        console.log(`    Route normalizado: "${normalizedRoute}" vs "${route.routeArea}" = ${routeAreaMatch}`)
        console.log(`    Match total: ${fromMatch && toMatch && moveTypeMatch && containerTypeMatch && statusMatch && clienteMatch && routeAreaMatch}`)
        
        return fromMatch && toMatch && moveTypeMatch && containerTypeMatch && statusMatch && clienteMatch && routeAreaMatch;
      });
      
      if (matchedRoute) {
        console.log(`  ✅ MATCH ENCONTRADO: ${matchedRoute.name} - $${matchedRoute.price}`)
        return {
          ...record,
          from: from, // Agregar from extraído del leg
          to: to, // Agregar to extraído del leg
          operationType: 'import', // Siempre import para registros de trasiego
          associate: record.line || record.associate, // Usar line como cliente principal
          matchedPrice: matchedRoute.price,
          matchedRouteId: matchedRoute._id || '',
          matchedRouteName: matchedRoute.name || '',
          isMatched: true,
          sapCode: 'PTYSS001'
        };
      } else {
        console.log(`  ❌ NO SE ENCONTRÓ MATCH`)
        return {
          ...record,
          from: from, // Agregar from extraído del leg
          to: to, // Agregar to extraído del leg
          operationType: 'import', // Siempre import para registros de trasiego
          associate: record.line || record.associate, // Usar line como cliente principal
          matchedPrice: 0,
          isMatched: false,
          sapCode: 'PTYSS001'
        };
      }
    });
  }

  // Función para convertir datos de trucking a PTYSS
  const convertTruckingToPTYSS = (truckingData: TruckingExcelData[]): PTYSSRecordData[] => {
    return truckingData.map(record => {
      // Para registros de trasiego, buscar el cliente PTG por el campo 'name'
      const ptgClient = clients.find((c: any) => {
        return c.name?.toLowerCase() === 'ptg'
      })
      
      const clientId = ptgClient?._id || ptgClient?.id || ''
      
      console.log(`Convirtiendo registro de trasiego - Cliente PTG buscado:`, ptgClient)
      console.log(`ClientId PTG asignado: ${clientId}`)
      console.log(`Cliente original del Excel (line): "${record.line}"`)
      
      return {
        clientId: clientId, // Usar cliente PTG para todos los registros de trasiego
        associate: record.line || '', // Guardar el nombre del cliente original de la columna line
        order: record.containerConsecutive || '',
        container: record.container || '',
        naviera: record.route || '',
        from: record.pol || '',
        to: record.pod || '',
        operationType: 'import', // Siempre import para registros de trasiego
        containerSize: record.size || '',
        containerType: record.type || '',
        estadia: '',
        genset: '',
        retencion: '',
        pesaje: '',
        ti: '',
        matriculaCamion: record.plate || '',
        conductor: record.driverName || '',
        numeroChasisPlaca: '',
        moveDate: record.moveDate || '',
        notes: '',
        totalValue: record.matchedPrice || 0,
        recordType: "trasiego" // Campo para identificar registros de trasiego
      }
    })
  }

  // Excel upload handlers
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
        
        console.log("=== DEBUGGING MATCHING PTYSS ===")
        console.log("Datos del Excel:", realData)
        console.log("Primer registro containerConsecutive:", realData[0]?.containerConsecutive)
        console.log("Primer registro keys:", Object.keys(realData[0] || {}))
        console.log("Todos los registros containerConsecutive:", realData.map(r => r.containerConsecutive))
        console.log("Rutas disponibles:", routes)
        console.log("")
        
        // Aplicar matching con las rutas configuradas de PTYSS
        const matchedData = matchTruckingDataWithPTYSSRoutes(realData, routes)
        
        console.log("Datos después del matching:", matchedData)
        console.log("")
        
        // Verificar clientes faltantes antes de mostrar los datos
        const processedData = await processMissingClients(matchedData)
        
        setPreviewData(processedData)
        
        // Contar registros con match
        const matchedCount = processedData.filter(record => record.isMatched).length
        const unmatchedCount = processedData.length - matchedCount
        
        console.log(`Registros con match: ${matchedCount}/${processedData.length}`)
        
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

  const handleUpload = async () => {
    if (!selectedFile || previewData.length === 0) {
      toast({
        title: "Error",
        description: "Por favor selecciona un archivo y verifica que tenga datos válidos",
        variant: "destructive"
      })
      return
    }

    // Verificar que todos los registros tengan match antes de continuar
    const unmatchedRecords = previewData.filter(record => !record.isMatched)
    if (unmatchedRecords.length > 0) {
      toast({
        title: "Registros sin match",
        description: `No se puede guardar. Hay ${unmatchedRecords.length} registros sin coincidencia. Crea las rutas faltantes o corrige los datos.`,
        variant: "destructive"
      })
      return
    }

    // Verificar que todos los clientes estén completos
    if (!areAllClientsComplete()) {
      const incompleteClients = Array.from(clientCompleteness.entries())
        .filter(([_, completeness]) => !completeness.isComplete)
        .map(([clientName, completeness]) => ({
          name: clientName,
          missingFields: completeness.missingFields
        }))

      toast({
        title: "Clientes incompletos",
        description: `Hay ${incompleteClients.length} clientes con datos incompletos. Completa todos los datos antes de guardar.`,
        variant: "destructive"
      })
      return
    }

    setIsLoading(true)

    try {
      console.log("=== INICIANDO GUARDADO PTYSS EXCEL ===")
      console.log("Datos a guardar:", previewData)
      
      // Temporary workaround: Use a proper ObjectId format
      const tempObjectId = new Date().getTime().toString(16).padStart(24, '0').substring(0, 24)
      
      console.log("ExcelId:", tempObjectId)
      
      // Filtrar solo los registros que tienen match
      const matchedRecords = previewData.filter(record => record.isMatched);
      
      if (matchedRecords.length === 0) {
        toast({
          title: "No hay registros válidos",
          description: "No se encontraron registros que coincidan con las rutas configuradas",
          variant: "destructive"
        })
        return
      }
      
      // Contar duplicados en el Excel para informar al usuario
      const seenInExcel = new Set<string>()
      let duplicatesInExcel = 0
      
      matchedRecords.forEach(record => {
        if (record.containerConsecutive) {
          if (seenInExcel.has(record.containerConsecutive)) {
            duplicatesInExcel++
          } else {
            seenInExcel.add(record.containerConsecutive)
          }
        }
      })
      
      console.log(`🔍 Duplicados en Excel detectados: ${duplicatesInExcel}`)
      
      // Enviar TODOS los registros con match al backend
      // El backend se encargará de filtrar los duplicados que ya existen en la DB
      const recordsData = matchedRecords.map((record, index) => ({
        data: record, // Datos completos del Excel incluyendo matchedPrice, matchedRouteId, etc.
        totalValue: record.matchedPrice || 0 // Usar el precio de la ruta si está disponible
      }))
      
      console.log("=== DATOS A GUARDAR ===")
      console.log("Primer registro completo:", recordsData[0])
      console.log("ContainerConsecutive del primer registro:", recordsData[0]?.data?.containerConsecutive)
      console.log("Todos los containerConsecutive:", recordsData.map(r => r.data.containerConsecutive))
      console.log("Records data preparado:", recordsData)
      console.log("Payload a enviar:", {
        excelId: tempObjectId,
        recordsData
      })
      
      const result = await dispatch(createPTYSSRecords({
        excelId: tempObjectId, // Use the generated ObjectId
        recordsData
      })).unwrap()
      
      console.log("=== RESULTADO DEL GUARDADO ===")
      console.log("Result:", result)
      console.log("Result.count:", result.count)
      console.log("Result.duplicates:", result.duplicates)
      console.log("Result.records:", result.records)
      console.log("Result.totalProcessed:", result.totalProcessed)
      console.log("Result completo (JSON):", JSON.stringify(result, null, 2))
      
      // Manejar respuesta con información de duplicados (igual que Trucking)
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
      
      console.log("=== PROCESANDO MENSAJE ===")
      console.log("recordsCreated:", recordsCreated)
      console.log("result.duplicates:", result.duplicates)
      console.log("result.duplicates?.count:", result.duplicates?.count)
      console.log("previewData.length:", previewData.length)
      console.log("matchedRecords.length:", matchedRecords.length)
      
      // Manejar diferentes casos de respuesta
      if (result.duplicates && result.duplicates.count > 0) {
        // Caso con duplicados (puede haber 0 o más registros nuevos guardados)
        if (recordsCreated === 0) {
          // Todos eran duplicados
          successMessage = `Todos los registros ya existen en la base de datos. 0 registros nuevos guardados, ${result.duplicates.count} duplicados omitidos.`
          console.log("Caso 1: Todos duplicados - Mensaje:", successMessage)
        } else {
          // Algunos duplicados, algunos nuevos
          successMessage = `${recordsCreated} registros nuevos guardados. ${result.duplicates.count} registros duplicados omitidos (ya existían en DB).`
          console.log("Caso 2: Parcialmente duplicados - Mensaje:", successMessage)
        }
        if (result.duplicates.containerConsecutives) {
          console.log("ContainerConsecutives duplicados:", result.duplicates.containerConsecutives)
        }
      } else if (recordsCreated > 0) {
        // Sin duplicados, registros guardados exitosamente
        const omittedCount = previewData.length - matchedRecords.length
        if (omittedCount > 0) {
          successMessage = `${recordsCreated} registros guardados correctamente (${omittedCount} sin match omitidos)`
        } else {
          successMessage = `${recordsCreated} registros guardados correctamente`
        }
        console.log("Caso 3: Sin duplicados - Mensaje:", successMessage)
      } else {
        // No se guardó nada y no hay información de duplicados
        successMessage = "No se guardaron registros. Verifica la consola para más detalles."
        console.log("Caso 4: Sin guardar y sin info de duplicados - Mensaje:", successMessage)
      }
      
      console.log("Mensaje final:", successMessage)
      
      // Determinar el título del toast según el resultado
      const toastTitle = recordsCreated > 0 ? "Éxito" : "Información"
      const toastVariant = recordsCreated === 0 && result.duplicates ? "default" : undefined
      
      toast({
        title: toastTitle,
        description: successMessage,
        variant: toastVariant
      })
      
      // Limpiar el estado
      setPreviewData([])
      setSelectedFile(null)
      setMatchFilter('all')
      setClientCompleteness(new Map())
      
    } catch (error: any) {
      console.error("❌ Error al guardar registros PTYSS:", error)
      console.error("❌ Error completo:", JSON.stringify(error, null, 2))
      console.error("❌ Error.message:", error?.message)
      console.error("❌ recordsError:", recordsError)
      
      toast({
        title: "Error al guardar",
        description: error?.message || recordsError || "Error al guardar los registros. Revisa la consola para más detalles.",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }



  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Ship className="h-5 w-5" />
            Crear Registros PTYSS
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "local" | "trasiego")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="local" className="flex items-center gap-2">
                <Database className="h-4 w-4" />
                Registros Locales
              </TabsTrigger>
              <TabsTrigger value="trasiego" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Registros Trasiego
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="local" className="space-y-4 mt-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-medium">Crear Registro Local Individual</h3>
                  <p className="text-sm text-muted-foreground">
                    Agrega registros marítimos locales uno por uno para luego generar facturas
                  </p>
                </div>
                <Button onClick={async () => {
                  // Refrescar las rutas locales antes de abrir el diálogo
                  await dispatch(fetchPTYSSLocalRoutes())
                  
                  setCurrentRecord({
                    ...initialRecordData,
                    localRouteId: "",
                    localRoutePrice: 0,
                    recordType: "local"
                  })
                  setIsDialogOpen(true)
                }}>
                  <Plus className="mr-2 h-4 w-4" />
                  Nuevo Registro Local
                </Button>
              </div>

            </TabsContent>
            
            <TabsContent value="trasiego" className="space-y-4 mt-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium">Crear Registros Trasiego desde Excel</h3>
                  <p className="text-sm text-muted-foreground">
                    Importa registros de trasiego desde archivos Excel de trucking
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="excel-file">Seleccionar archivo Excel</Label>
                  <div className="flex gap-2">
                    <Input
                      id="excel-file"
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleFileChange}
                      disabled={isLoading || isProcessing || routesLoading}
                      className="flex-1"
                    />
                    {selectedFile && (
                      <Button
                        variant="outline"
                        onClick={() => {
                          setSelectedFile(null)
                          setPreviewData([])
                          setMatchFilter('all')
                          // Reset del input file
                          const fileInput = document.getElementById('excel-file') as HTMLInputElement
                          if (fileInput) {
                            fileInput.value = ''
                          }
                        }}
                        disabled={isLoading || isProcessing}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Quitar Archivo
                      </Button>
                    )}
                  </div>
                </div>
                
                {/* Indicador de procesamiento del Excel */}
                {isLoading && (
                  <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-blue-900">Procesando archivo Excel...</p>
                      <p className="text-xs text-blue-700">Aplicando matching con rutas configuradas</p>
                    </div>
                  </div>
                )}
                
                {/* Estado de carga de rutas */}
                {routesLoading && !isLoading && (
                  <div className="flex items-center gap-2 text-sm text-blue-600">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                    Cargando rutas configuradas...
                  </div>
                )}
                
                {!routesLoading && !isLoading && routes.length === 0 && (
                  <div className="flex items-center gap-2 text-sm text-orange-600">
                    <AlertCircle className="h-4 w-4" />
                    No hay rutas configuradas. Ve a Configuración para crear rutas.
                  </div>
                )}
                
                {!routesLoading && !isLoading && routes.length > 0 && !selectedFile && (
                  <div className="flex items-center gap-2 text-sm text-green-600">
                    <CheckCircle2 className="h-4 w-4" />
                    {routes.length} ruta{routes.length !== 1 ? 's' : ''} configurada{routes.length !== 1 ? 's' : ''} lista{routes.length !== 1 ? 's' : ''}
                  </div>
                )}
                
                {selectedFile && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <FileText className="h-4 w-4" />
                    {selectedFile.name}
                    <Badge variant="secondary">{previewData.length} registros</Badge>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Lista de registros locales solo para tab local */}
      {activeTab === "local" && pendingLocalRecords.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Registros Locales
                {statusFilter !== 'all' && (
                  <Badge variant="secondary" className="ml-2">
                    {pendingLocalRecords.length} {statusFilter}
                  </Badge>
                )}
              </span>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-orange-600 border-orange-600 text-xs">
                  {ptyssRecords.filter((r: ExcelRecord) => {
                    const data = r.data as Record<string, any>
                    return data.recordType === "local" && r.status === "pendiente" && !r.invoiceId
                  }).length} Pendientes
                </Badge>
                <Badge variant="outline" className="text-green-600 border-green-600 text-xs">
                  {ptyssRecords.filter((r: ExcelRecord) => {
                    const data = r.data as Record<string, any>
                    return data.recordType === "local" && r.status === "completado" && !r.invoiceId
                  }).length} Completados
                </Badge>
                <Badge variant="outline" className="text-red-600 border-red-600 text-xs">
                  {ptyssRecords.filter((r: ExcelRecord) => {
                    const data = r.data as Record<string, any>
                    return data.recordType === "local" && r.status === "cancelado" && !r.invoiceId
                  }).length} Cancelados
                </Badge>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Filtro de Estado */}
            <div className="flex items-center gap-4 mb-4 p-3 bg-slate-50 rounded-lg border">
              <Label htmlFor="status-filter" className="text-sm font-medium whitespace-nowrap">Filtrar por estado:</Label>
              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as 'all' | 'pendiente' | 'completado' | 'cancelado')}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Seleccionar estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    Todos ({ptyssRecords.filter((r: ExcelRecord) => {
                      const data = r.data as Record<string, any>
                      return data.recordType === "local" && !r.invoiceId
                    }).length})
                  </SelectItem>
                  <SelectItem value="pendiente">
                    Pendientes ({ptyssRecords.filter((r: ExcelRecord) => {
                      const data = r.data as Record<string, any>
                      return data.recordType === "local" && r.status === "pendiente" && !r.invoiceId
                    }).length})
                  </SelectItem>
                  <SelectItem value="completado">
                    Completados ({ptyssRecords.filter((r: ExcelRecord) => {
                      const data = r.data as Record<string, any>
                      return data.recordType === "local" && r.status === "completado" && !r.invoiceId
                    }).length})
                  </SelectItem>
                  <SelectItem value="cancelado">
                    Cancelados ({ptyssRecords.filter((r: ExcelRecord) => {
                      const data = r.data as Record<string, any>
                      return data.recordType === "local" && r.status === "cancelado" && !r.invoiceId
                    }).length})
                  </SelectItem>
                </SelectContent>
              </Select>
              {statusFilter !== 'all' && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setStatusFilter('all')}
                  className="text-xs"
                >
                  Limpiar Filtro
                </Button>
              )}
            </div>
            
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="font-semibold">Contenedor</TableHead>
                    <TableHead className="font-semibold">Cliente</TableHead>
                    <TableHead className="font-semibold">Orden</TableHead>
                    <TableHead className="font-semibold">Ruta</TableHead>
                    <TableHead className="font-semibold">Operación</TableHead>
                    <TableHead className="font-semibold">Fecha Movimiento</TableHead>
                    <TableHead className="font-semibold">Estado</TableHead>
                    <TableHead className="font-semibold text-center">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingLocalRecords.map((record: ExcelRecord) => {
                    const data = record.data as Record<string, any>
                    const client = clients.find((c: any) => (c._id || c.id) === data?.clientId)
                    const clientName = client ? (client.type === "natural" ? client.fullName : client.companyName) : "N/A"
                    const naviera = navieras.find((n: any) => n._id === data.naviera)
                    
                    return (
                      <TableRow key={record._id || record.id}>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium">{data.container || "N/A"}</div>
                            <div className="text-xs text-muted-foreground">
                              {data.containerSize}' {data.containerType}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div>{clientName}</div>
                            {naviera && (
                              <div className="text-xs text-muted-foreground">
                                {naviera.name} ({naviera.code})
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{data.order || "N/A"}</TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {data.from} → {data.to}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={data.operationType === "import" ? "default" : "secondary"} className="text-xs">
                            {data.operationType?.toUpperCase() || "N/A"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {formatDate(data.moveDate)}
                        </TableCell>
                        <TableCell>
                          {record.status === "pendiente" && (
                            <Badge variant="outline" className="text-orange-600 border-orange-600">
                              Pendiente
                            </Badge>
                          )}
                          {record.status === "completado" && (
                            <Badge variant="outline" className="text-green-600 border-green-600">
                              Completado
                            </Badge>
                          )}
                          {record.status === "cancelado" && (
                            <Badge variant="outline" className="text-red-600 border-red-600">
                              Cancelado
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-2">
                            {/* Botón Editar - Solo para pendientes */}
                            {record.status === "pendiente" && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditRecord(record)}
                                className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                                title="Editar registro"
                              >
                                <Edit className="h-4 w-4 mr-1" />
                                Editar
                              </Button>
                            )}
                            
                            {/* Botón Enviar/Cancelar - Solo para pendientes */}
                            {record.status === "pendiente" && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenSendConfirmation(record._id || record.id || "")}
                                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                title="Completar o Cancelar registro"
                              >
                                <Send className="h-4 w-4 mr-1" />
                                Acciones
                              </Button>
                            )}
                            
                            {/* Botón Eliminar - Para todos los estados excepto completado */}
                            {record.status !== "completado" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeletePendingRecord(record._id || record.id || "")}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                title="Eliminar registro"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modal para crear/editar registro */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        setIsDialogOpen(open)
        if (!open) {
          // Al cerrar el modal, resetear el modo de edición
          setEditingRecordId(null)
          setCurrentRecord({
            ...initialRecordData,
            localRouteId: "",
            localRoutePrice: 0
          })
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingRecordId ? "Editar Registro Local" : "Crear Nuevo Registro Local"}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Información del Cliente */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Información del Cliente</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="client">Cliente *</Label>
                  <div className="flex gap-2">
                    <Select 
                      value={currentRecord.clientId} 
                      onValueChange={(value) => {
                        // Al cambiar el cliente, limpiar las rutas seleccionadas
                        setCurrentRecord({
                          ...currentRecord, 
                          clientId: value,
                          localRouteId: "",
                          localRoutePrice: 0,
                          from: "",
                          to: ""
                        })
                      }}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Seleccionar cliente" />
                      </SelectTrigger>
                      <SelectContent>
                        {(() => {
                          if (clientsLoading) {
                            return (
                              <div className="p-2 text-sm text-muted-foreground">
                                <div className="flex items-center gap-2">
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                                  Cargando clientes...
                                </div>
                              </div>
                            )
                          }
                          
                          const activeClients = clients.filter((client: any) => client && client.isActive)
                          console.log('🔍 PTYSSUpload - activeClients:', activeClients)
                          console.log('🔍 PTYSSUpload - activeClients.length:', activeClients.length)
                          
                          if (activeClients.length === 0) {
                            return (
                              <div className="p-2 text-sm text-muted-foreground">
                                No hay clientes activos disponibles
                              </div>
                            )
                          }
                          
                          return activeClients.map((client: any) => (
                            <SelectItem key={client._id || client.id} value={client._id || client.id}>
                              {client.type === "natural" ? client.fullName : client.companyName} - {client.sapCode || "Sin SAP"}
                            </SelectItem>
                          ))
                        })()}
                      </SelectContent>
                    </Select>
                    <Dialog open={showAddClientDialog} onOpenChange={setShowAddClientDialog}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="icon">
                          <Plus className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Agregar Nuevo Cliente</DialogTitle>
                        </DialogHeader>
                        
                        <div className="space-y-4">
                          {/* Información de la Empresa */}
                          <div className="space-y-4">
                            <h3 className="text-lg font-medium">Información de la Empresa</h3>
                            
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label htmlFor="companyName">Nombre de la Empresa *</Label>
                                <Input
                                  id="companyName"
                                  value={newClient.companyName}
                                  onChange={(e) => setNewClient({...newClient, companyName: e.target.value})}
                                  placeholder="Razón social"
                                />
                              </div>
                              
                              <div className="space-y-2">
                                <Label htmlFor="sapCode">Código SAP *</Label>
                                <Input
                                  id="sapCode"
                                  value={newClient.sapCode}
                                  onChange={(e) => setNewClient({...newClient, sapCode: e.target.value})}
                                  placeholder="Código SAP del cliente"
                                />
                              </div>
                              
                              <div className="space-y-2">
                                <Label htmlFor="ruc">RUC *</Label>
                                <Input
                                  id="ruc"
                                  value={newClient.ruc}
                                  onChange={(e) => setNewClient({...newClient, ruc: e.target.value})}
                                  placeholder="155678901-2-2020"
                                />
                              </div>
                              
                              <div className="space-y-2">
                                <Label htmlFor="contactName">Nombre de Contacto</Label>
                                <Input
                                  id="contactName"
                                  value={newClient.contactName}
                                  onChange={(e) => setNewClient({...newClient, contactName: e.target.value})}
                                  placeholder="Persona de contacto"
                                />
                              </div>
                            </div>
                          </div>
                          
                          <Separator />
                          
                          {/* Información de Contacto */}
                          <div className="space-y-4">
                            <h3 className="text-lg font-medium">Información de Contacto</h3>
                            
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label htmlFor="email">Correo Electrónico *</Label>
                                <Input
                                  id="email"
                                  type="email"
                                  value={newClient.email}
                                  onChange={(e) => setNewClient({...newClient, email: e.target.value})}
                                  placeholder="correo@ejemplo.com"
                                />
                              </div>
                              
                              <div className="space-y-2">
                                <Label htmlFor="phone">Teléfono</Label>
                                <Input
                                  id="phone"
                                  value={newClient.phone}
                                  onChange={(e) => setNewClient({...newClient, phone: e.target.value})}
                                  placeholder="6001-2345"
                                />
                              </div>
                            </div>
                          </div>
                          
                          <Separator />
                          
                          {/* Dirección */}
                          <div className="space-y-4">
                            <h3 className="text-lg font-medium">Dirección</h3>
                            
                            <div className="space-y-2">
                              <Label htmlFor="address">Dirección</Label>
                              <Textarea
                                id="address"
                                value={newClient.address}
                                onChange={(e) => setNewClient({...newClient, address: e.target.value})}
                                placeholder="Dirección completa de la empresa"
                                rows={3}
                              />
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex justify-end gap-2 pt-4">
                          <Button variant="outline" onClick={() => setShowAddClientDialog(false)}>
                            Cancelar
                          </Button>
                          <Button onClick={handleAddClient}>
                            <Plus className="h-4 w-4 mr-2" />
                            Agregar Cliente
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                  {getSelectedClient() && (
                    <div className="space-y-1">
                      <div className="text-sm text-muted-foreground">
                        {getSelectedClient()?.type === "juridico" ? (
                          <>
                            RUC: {getSelectedClient()?.ruc} | 
                            Tel: {getSelectedClient()?.phone || "No especificado"}
                          </>
                        ) : (
                          <>
                            {getSelectedClient()?.documentType?.toUpperCase()}: {getSelectedClient()?.documentNumber} | 
                            Tel: {getSelectedClient()?.phone || "No especificado"}
                          </>
                        )}
                      </div>
                      {(() => {
                        const clientRoutes = getLocalRoutesByRealClientId(currentRecord.clientId)
                        const schemaName = getSelectedClientRouteSchema()
                        
                        if (clientRoutes.length > 0) {
                          return (
                            <div className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded border border-green-200">
                              ✓ {clientRoutes.length} ruta{clientRoutes.length !== 1 ? 's' : ''} disponible{clientRoutes.length !== 1 ? 's' : ''} 
                              {schemaName && ` (${schemaName})`}
                            </div>
                          )
                        } else {
                          return (
                            <div className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded border border-orange-200">
                              ⚠ Sin rutas locales asociadas. Configure en Configuración → Rutas Local.
                            </div>
                          )
                        }
                      })()}
                    </div>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="order">Orden *</Label>
                  <Input
                    id="order"
                    value={currentRecord.order}
                    onChange={(e) => setCurrentRecord({...currentRecord, order: e.target.value})}
                    placeholder="Número de orden"
                    required
                  />
                </div>
              </div>
            </div>
            
            <Separator />
            
            {/* Información del Contenedor */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Información del Contenedor</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="container">Contenedor *</Label>
                  <Input
                    id="container"
                    value={currentRecord.container}
                    onChange={(e) => {
                      const value = e.target.value.toUpperCase()
                      if (value.length <= 11) {
                        setCurrentRecord({...currentRecord, container: value})
                      }
                    }}
                    placeholder="MSCU1234567"
                    maxLength={11}
                    pattern="[A-Z0-9]+"
                    title="Solo letras y números, máximo 11 caracteres"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="naviera">Naviera *</Label>
                  <Select value={currentRecord.naviera} onValueChange={(value) => setCurrentRecord({...currentRecord, naviera: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar naviera" />
                    </SelectTrigger>
                    <SelectContent>
                      {navieras.map((naviera) => (
                        <SelectItem key={naviera._id} value={naviera._id}>
                          {naviera.name} ({naviera.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="localRoute">Ruta Local *</Label>
                  <Select 
                    value={currentRecord.localRouteId} 
                    onValueChange={(value) => {
                      const selectedRoute = localRoutes.find(route => route._id === value)
                      const routePrice = selectedRoute ? getRoutePrice(selectedRoute, currentRecord.containerType) : 0
                      setCurrentRecord({
                        ...currentRecord, 
                        localRouteId: value,
                        localRoutePrice: routePrice,
                        from: selectedRoute?.from || "",
                        to: selectedRoute?.to || ""
                      })
                    }}
                    disabled={!currentRecord.clientId || getLocalRoutesByRealClientId(currentRecord.clientId).length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={
                        !currentRecord.clientId 
                          ? "Seleccione un cliente primero"
                          : getLocalRoutesByRealClientId(currentRecord.clientId).length === 0
                            ? "Sin rutas locales asociadas"
                            : "Seleccionar ruta local"
                      } />
                    </SelectTrigger>
                    <SelectContent>
                      {currentRecord.clientId && getLocalRoutesByRealClientId(currentRecord.clientId).map(route => {
                        const routePrice = getRoutePrice(route, currentRecord.containerType)
                        const containerTypeLabel = currentRecord.containerType === 'RE' ? 'Reefer' : 'Regular'
                        return (
                          <SelectItem key={route._id} value={route._id}>
                            <div className="flex flex-col">
                              <span>{route.from} → {route.to}</span>
                              {canViewPrices && (
                                <span className="text-xs text-muted-foreground">
                                  ${routePrice.toFixed(2)} ({containerTypeLabel})
                                </span>
                              )}
                            </div>
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Mostrar información de la ruta seleccionada */}
                {currentRecord.localRouteId && getSelectedLocalRoute() && (
                  <div className="col-span-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-blue-700">
                          Ruta seleccionada: {getSelectedLocalRoute()?.from} → {getSelectedLocalRoute()?.to}
                        </span>
                        <Badge variant="outline" className="text-blue-700 border-blue-700">
                          {getSelectedLocalRoute()?.clientName}
                        </Badge>
                        <Badge variant="outline" className="text-blue-700 border-blue-700">
                          {currentRecord.containerType === 'RE' ? 'Reefer' : 'Regular'}
                        </Badge>
                      </div>
                      {canViewPrices && (
                        <div className="text-sm font-bold text-blue-700">
                          Precio: ${getRoutePrice(getSelectedLocalRoute()!, currentRecord.containerType).toFixed(2)}
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                <div className="space-y-2">
                  <Label htmlFor="operationType">Tipo Operación *</Label>
                  <Select value={currentRecord.operationType} onValueChange={(value) => setCurrentRecord({...currentRecord, operationType: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar tipo de operación" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="import">Import</SelectItem>
                      <SelectItem value="export">Export</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="containerSize">Tamaño de Contenedor *</Label>
                  <Select value={currentRecord.containerSize} onValueChange={(value) => setCurrentRecord({...currentRecord, containerSize: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar tamaño" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10' - 10 pies</SelectItem>
                      <SelectItem value="20">20' - 20 pies</SelectItem>
                      <SelectItem value="40">40' - 40 pies</SelectItem>
                      <SelectItem value="45">45' - 45 pies</SelectItem>
                      <SelectItem value="48">48' - 48 pies</SelectItem>
                      <SelectItem value="53">53' - 53 pies</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="containerType">Tipo de Contenedor *</Label>
                  <Select 
                    value={currentRecord.containerType} 
                    onValueChange={(value) => {
                      // Actualizar precio cuando cambie el tipo de contenedor
                      const selectedRoute = currentRecord.localRouteId ? localRoutes.find(route => route._id === currentRecord.localRouteId) : null
                      const newPrice = selectedRoute ? getRoutePrice(selectedRoute, value) : 0
                      setCurrentRecord({
                        ...currentRecord, 
                        containerType: value,
                        localRoutePrice: newPrice
                      })
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {containerTypes
                        .filter((ct: any) => ct.isActive)
                        .sort((a: any, b: any) => a.code.localeCompare(b.code))
                        .map((containerType: any) => (
                          <SelectItem key={containerType.code} value={containerType.code}>
                            {containerType.code} - {containerType.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            
            <Separator />
            
            {/* Servicios Adicionales */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Servicios Adicionales</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="estadia">Estadia</Label>
                  <Select value={currentRecord.estadia} onValueChange={(value) => setCurrentRecord({...currentRecord, estadia: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="si">Sí</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="genset">Genset</Label>
                  <Input
                    id="genset"
                    type="number"
                    value={currentRecord.genset}
                    onChange={(e) => setCurrentRecord({...currentRecord, genset: e.target.value})}
                    placeholder="Ingrese número"
                    min="0"
                    step="0.01"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="retencion">Retención</Label>
                  <Input
                    id="retencion"
                    type="number"
                    value={currentRecord.retencion}
                    onChange={(e) => setCurrentRecord({...currentRecord, retencion: e.target.value})}
                    placeholder="Ingrese número"
                    min="0"
                    step="0.01"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="pesaje">Pesaje</Label>
                  <Input
                    id="pesaje"
                    type="number"
                    value={currentRecord.pesaje}
                    onChange={(e) => setCurrentRecord({...currentRecord, pesaje: e.target.value})}
                    placeholder="Ingrese monto en moneda"
                    min="0"
                    step="0.01"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="ti">TI</Label>
                  <Select value={currentRecord.ti} onValueChange={(value) => setCurrentRecord({...currentRecord, ti: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="si">Sí</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            
            <Separator />
            
            {/* Información de Transporte */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Información de Transporte</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="matriculaCamion">Matrícula del Camión</Label>
                  <Input
                    id="matriculaCamion"
                    value={currentRecord.matriculaCamion}
                    onChange={(e) => setCurrentRecord({...currentRecord, matriculaCamion: e.target.value})}
                    placeholder="Ingrese matrícula alfanumérica"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="conductor">Conductor *</Label>
                  <Input
                    id="conductor"
                    value={currentRecord.conductor}
                    onChange={(e) => setCurrentRecord({...currentRecord, conductor: e.target.value})}
                    placeholder="Ingrese nombre del conductor"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="numeroChasisPlaca">Número de Chasis o Placa</Label>
                  <Input
                    id="numeroChasisPlaca"
                    value={currentRecord.numeroChasisPlaca}
                    onChange={(e) => setCurrentRecord({...currentRecord, numeroChasisPlaca: e.target.value})}
                    placeholder="Ingrese número de chasis o placa"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="moveDate">Fecha de Movimiento</Label>
                  <Input
                    id="moveDate"
                    type="date"
                    value={currentRecord.moveDate}
                    onChange={(e) => setCurrentRecord({...currentRecord, moveDate: e.target.value})}
                  />
                </div>
              </div>
            </div>
            
            <Separator />
            
            {/* Notas */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Notas Adicionales</h3>
              <div className="space-y-2">
                <Label htmlFor="notes">Notas</Label>
                <Textarea
                  id="notes"
                  value={currentRecord.notes}
                  onChange={(e) => setCurrentRecord({...currentRecord, notes: e.target.value})}
                  placeholder="Notas adicionales sobre el registro..."
                  rows={3}
                />
              </div>
            </div>
          </div>
          
          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleAddRecord} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {editingRecordId ? "Actualizando..." : "Guardando..."}
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  {editingRecordId ? "Actualizar Registro" : "Guardar Registro"}
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Vista previa de datos del Excel */}
      {previewData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Vista Previa de Datos</CardTitle>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>{previewData.length} registros encontrados</span>
              {canViewPrices ? (
                <Badge variant="outline" className="text-green-600 border-green-600">
                  {previewData.filter(record => record.isMatched).length} con precio
                </Badge>
              ) : (
                <Badge variant="outline" className="text-green-600 border-green-600">
                  {previewData.filter(record => record.isMatched).length} con match
                </Badge>
              )}
              {previewData.filter(record => !record.isMatched).length > 0 && (
                <Badge variant="outline" className="text-orange-600 border-orange-600">
                  {previewData.filter(record => !record.isMatched).length} sin coincidencia
                </Badge>
              )}
              {hasDuplicateContainerConsecutives && (
                <Badge variant="outline" className="text-red-600 border-red-600">
                  ⚠️ {duplicateContainerConsecutives.length} containerConsecutive duplicados
                </Badge>
              )}
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
              {canViewPrices && (
                <span className="ml-auto font-medium">
                  Total: ${previewData.reduce((sum, record) => sum + (record.matchedPrice || 0), 0).toFixed(2)}
                </span>
              )}
            </div>
            
            {/* Filtro de matching */}
            <div className="flex items-center gap-4 mt-6 mb-4 p-4 bg-slate-50 rounded-lg border">
              <Label htmlFor="match-filter" className="text-sm font-medium">Filtrar por matching:</Label>
              <Select value={matchFilter} onValueChange={(value) => setMatchFilter(value as 'all' | 'matched' | 'unmatched')}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Seleccionar filtro" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    Todos ({previewData.length})
                  </SelectItem>
                  <SelectItem value="matched">
                    Con Match ({previewData.filter(record => record.isMatched).length})
                  </SelectItem>
                  <SelectItem value="unmatched">
                    Sin Match ({previewData.filter(record => !record.isMatched).length})
                  </SelectItem>
                </SelectContent>
              </Select>
              {matchFilter !== 'all' && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setMatchFilter('all')}
                  className="text-xs"
                >
                  Limpiar Filtro
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border max-h-96 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente PTG</TableHead>
                    <TableHead>Ruta (Leg)</TableHead>
                    <TableHead>Área (Route)</TableHead>
                    <TableHead>Tipo Movimiento</TableHead>
                    <TableHead>Tipo Contenedor</TableHead>
                    <TableHead>Estado (FE)</TableHead>
                    {canViewPrices && <TableHead>Precio</TableHead>}
                    <TableHead>Match</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPreviewData.map((record, index) => {
                    const clientName = record.associate?.trim()
                    const clientStatus = clientName ? clientCompleteness.get(clientName) : null
                    const isClickable = record.isMatched && clientStatus && !clientStatus.isComplete
                    
                    // Verificar si este containerConsecutive está duplicado en el Excel
                    const isDuplicate = record.containerConsecutive && duplicateContainerConsecutives.includes(record.containerConsecutive)
                    
                    return (
                      <TableRow 
                        key={index}
                        className={isDuplicate ? 'bg-red-50' : ''}
                      >
                        {/* Cliente PTG */}
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <span className="font-medium text-blue-700">
                              PTG
                            </span>
                            <Badge variant="outline" className="text-green-600 border-green-600 text-xs">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Cliente Final
                            </Badge>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            Line: {record.associate}
                          </div>
                        </TableCell>
                        
                        {/* Ruta (Leg) - From/To */}
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">{record.leg || "N/A"}</span>
                            <span className="text-xs text-muted-foreground">
                              {record.from} → {record.to}
                            </span>
                          </div>
                        </TableCell>
                        
                        {/* Área (Route) */}
                        <TableCell>
                          <Badge variant="outline" className="bg-blue-100 text-blue-800">
                            {record.route || "N/A"}
                          </Badge>
                        </TableCell>
                        
                        {/* Tipo Movimiento (MoveType) */}
                        <TableCell>
                          <Badge variant={record.moveType === "RT" ? "default" : "secondary"}>
                            {record.moveType?.toUpperCase() || 'N/A'}
                          </Badge>
                        </TableCell>
                        
                        {/* Tipo Contenedor (Type) */}
                        <TableCell>
                          <div className="flex flex-col">
                            <Badge variant="outline">{record.type || "N/A"}</Badge>
                            <span className="text-xs text-muted-foreground mt-1">
                              {record.size}'
                            </span>
                          </div>
                        </TableCell>
                        
                        {/* Estado FE (Full/Empty) */}
                        <TableCell>
                          <Badge variant={record.fe === "F" || record.fe === "FULL" ? "default" : "secondary"}>
                            {record.fe || "N/A"}
                          </Badge>
                        </TableCell>
                        
                        {/* Precio - Solo mostrar si el usuario puede ver precios */}
                        {canViewPrices && (
                          <TableCell>
                            {record.isMatched ? (
                              <span className="font-medium text-green-600">
                                ${record.matchedPrice?.toFixed(2)}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                        )}
                        
                        {/* Estado del Match */}
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            {record.isMatched ? (
                              <Badge variant="outline" className="text-green-600 border-green-600">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Match
                              </Badge>
                            ) : (
                              <Badge 
                                variant="outline" 
                                className="text-orange-600 border-orange-600 cursor-pointer hover:bg-orange-50 hover:border-orange-700"
                                onClick={() => handleCreateRouteClick(record)}
                                title="Haz clic para crear una ruta para este registro"
                              >
                                <AlertCircle className="h-3 w-3 mr-1" />
                                Sin match
                              </Badge>
                            )}
                            {isDuplicate && (
                              <Badge variant="outline" className="text-red-600 border-red-600 text-xs">
                                ⚠️ DUPLICADO
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                  )})}
                </TableBody>
              </Table>
            </div>
            
            <div className="mt-4 flex justify-between items-center">
              <div className="flex items-center gap-2">
                {(() => {
                  const unmatchedCount = previewData.filter(record => !record.isMatched).length
                  if (unmatchedCount > 0) {
                    return (
                      <div className="flex items-center space-x-2 text-sm text-red-600">
                        <AlertCircle className="h-4 w-4" />
                        <span>
                          <strong>No se puede guardar:</strong> {unmatchedCount} registros sin match. 
                          Haz clic en los badges "Sin match" para crear las rutas faltantes.
                        </span>
                      </div>
                    )
                  }
                  
                  if (!areAllClientsComplete()) {
                    return (
                      <div className="flex items-center space-x-2 text-sm text-red-600">
                        <AlertCircle className="h-4 w-4" />
                        <span>Completa todos los datos de clientes antes de guardar</span>
                      </div>
                    )
                  }
                  
                  if (hasDuplicateContainerConsecutives) {
                    return (
                      <div className="flex items-center space-x-2 text-sm text-orange-600">
                        <AlertCircle className="h-4 w-4" />
                        <span>
                          ⚠️ Se detectaron {duplicateContainerConsecutives.length} containerConsecutive duplicados en el Excel. 
                          Los duplicados serán filtrados automáticamente al guardar.
                        </span>
                      </div>
                    )
                  }
                  
                  return (
                    <div className="flex items-center space-x-2 text-sm text-green-600">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Todos los registros están listos para guardar</span>
                    </div>
                  )
                })()}
              </div>
              
              <Button 
                onClick={handleUpload}
                disabled={isLoading || isCreatingRecords || !areAllClientsComplete() || previewData.filter(record => !record.isMatched).length > 0}
                className={`${areAllClientsComplete() && previewData.filter(record => !record.isMatched).length === 0 ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-400 cursor-not-allowed'}`}
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

      {/* Modal de Clientes */}
      <ClientModal
        isOpen={showAddClientDialog}
        onClose={() => setShowAddClientDialog(false)}
        onClientCreated={(client) => {
          // Cuando se crea un cliente, seleccionarlo automáticamente
          setCurrentRecord(prev => ({
            ...prev,
            clientId: client._id || client.id || ""
          }))
          setShowAddClientDialog(false)
        }}
      />

      {/* Modal para clientes faltantes del Excel de trasiego */}
      {showClientModal && clientToEdit && (
        <Dialog open={showClientModal} onOpenChange={setShowClientModal}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Cliente Faltante: {clientToEdit.name}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="h-5 w-5 text-yellow-600" />
                  <h4 className="font-medium text-yellow-800">Cliente no encontrado</h4>
                </div>
                <p className="text-sm text-yellow-700 mt-2">
                  El cliente "{clientToEdit.name}" no existe en la base de datos. 
                  Se encontraron {clientToEdit.records.length} registros con match para este cliente en el Excel.
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">Registros con match asociados:</h4>
                <div className="max-h-40 overflow-y-auto border rounded-lg p-2">
                  {clientToEdit.records.slice(0, 5).map((record, index) => (
                    <div key={index} className="text-sm text-muted-foreground py-1">
                      • {record.containerConsecutive} - {record.container} ({record.size}' {record.type})
                    </div>
                  ))}
                  {clientToEdit.records.length > 5 && (
                    <div className="text-sm text-muted-foreground py-1">
                      ... y {clientToEdit.records.length - 5} registros más
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Solo se muestran registros que hicieron match con las rutas configuradas.
                </p>
              </div>

              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    // Crear cliente temporal automáticamente
                    createTemporaryClient(clientToEdit.name).then(() => {
                      handleClientCreated({ companyName: clientToEdit.name })
                    })
                  }}
                >
                  Crear Cliente Temporal
                </Button>
                <Button
                  onClick={() => {
                    // Abrir modal de edición de cliente
                    setEditingClient({
                      type: "juridico",
                      companyName: clientToEdit.name,
                      ruc: "",
                      contactName: "",
                      email: "",
                      phone: "",
                      address: "",
                      sapCode: "",
                      isActive: true
                    } as any)
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

      {/* Modal de edición de cliente */}
      <ClientModal
        isOpen={!!editingClient}
        onClose={() => setEditingClient(null)}
        editingClient={editingClient}
        onClientCreated={(client) => {
          // Recargar clientes para obtener los datos actualizados
          dispatch(fetchClients()).then(() => {
            // Esperar un poco para que se actualice el estado de clientes
            setTimeout(() => {
              // Actualizar completitud del cliente
              const clientName = client.type === 'juridico' ? client.companyName : client.fullName
              updateClientCompleteness(clientName, client)
              
              // Si estamos editando un cliente temporal, cerrar el modal
              if (editingClient && !editingClient._id) {
                setEditingClient(null)
              }
            }, 100)
          })
        }}
      />

      {/* Modal para crear ruta desde registro sin match */}
      <Dialog open={showCreateRouteModal} onOpenChange={setShowCreateRouteModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Crear Nueva Ruta PTYSS Trasiego
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {recordForRoute && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="h-5 w-5 text-blue-600" />
                  <h4 className="font-medium text-blue-800">Registro sin match</h4>
                </div>
                <p className="text-sm text-blue-700 mt-2">
                  Creando ruta para: <strong>{recordForRoute.container}</strong> - {recordForRoute.leg} ({recordForRoute.type})
                </p>
              </div>
            )}
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="route-name">Nombre de la Ruta *</Label>
                  <Input 
                    id="route-name"
                    value={newRoute.from && newRoute.to ? `${newRoute.from}/${newRoute.to}` : ""} 
                    placeholder="Se genera automáticamente" 
                    disabled 
                    className="bg-gray-50" 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="route-from">Origen *</Label>
                  <Input 
                    id="route-from" 
                    value={newRoute.from} 
                    onChange={(e) => setNewRoute({ ...newRoute, from: e.target.value.toUpperCase() })} 
                    placeholder="PSA" 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="route-to">Destino *</Label>
                  <Input 
                    id="route-to" 
                    value={newRoute.to} 
                    onChange={(e) => setNewRoute({ ...newRoute, to: e.target.value.toUpperCase() })} 
                    placeholder="BLB" 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="route-container-type">Tipo de Contenedor *</Label>
                  <Select value={newRoute.containerType} onValueChange={(value) => setNewRoute({ ...newRoute, containerType: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {containerTypes
                        .filter((ct: any) => ct.isActive)
                        .sort((a: any, b: any) => a.code.localeCompare(b.code))
                        .map((containerType: any) => (
                          <SelectItem key={containerType.code} value={containerType.code}>
                            {containerType.code} - {containerType.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="route-type">Tipo de Ruta *</Label>
                  <Select value={newRoute.routeType} onValueChange={(value) => setNewRoute({ ...newRoute, routeType: value as "single" | "RT" })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar tipo de ruta" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="single">Single - Viaje único</SelectItem>
                      <SelectItem value="RT">RT - Round Trip</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="route-price">Precio *</Label>
                  <Input 
                    id="route-price" 
                    type="number" 
                    value={newRoute.price} 
                    onChange={(e) => setNewRoute({ ...newRoute, price: parseFloat(e.target.value) || 0 })} 
                    placeholder="250.00" 
                    min="0" 
                    step="0.01" 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="route-status">Estado *</Label>
                  <Select value={newRoute.status} onValueChange={(value) => setNewRoute({ ...newRoute, status: value as "FULL" | "EMPTY" })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar estado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FULL">Full</SelectItem>
                      <SelectItem value="EMPTY">Empty</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="route-cliente">Cliente *</Label>
                  <Input 
                    id="route-cliente" 
                    value={newRoute.cliente} 
                    onChange={(e) => setNewRoute({ ...newRoute, cliente: e.target.value })} 
                    placeholder="Código del cliente" 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="route-area">Área de Ruta *</Label>
                  <Select value={newRoute.routeArea} onValueChange={(value) => setNewRoute({ ...newRoute, routeArea: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar área de ruta" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PACIFIC">PACIFIC</SelectItem>
                      <SelectItem value="NORTH">NORTH</SelectItem>
                      <SelectItem value="SOUTH">SOUTH</SelectItem>
                      <SelectItem value="ATLANTIC">ATLANTIC</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={handleCancelCreateRoute}>
                  Cancelar
                </Button>
                <Button onClick={handleCreateRoute} disabled={routesLoading}>
                  <Plus className="h-4 w-4 mr-2" />
                  {routesLoading ? "Creando..." : "Crear Ruta"}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Diálogo de confirmación para acciones del registro */}
      <Dialog open={confirmSendDialogOpen} onOpenChange={setConfirmSendDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-blue-600" />
              Acciones de Registro
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-green-900">
                    Completar Registro
                  </p>
                  <p className="text-xs text-green-700">
                    El registro pasará a estado <span className="font-semibold">completado</span> y estará disponible en la lista de prefactura para ser facturado.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                <X className="h-5 w-5 text-red-600 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-red-900">
                    Cancelar Registro
                  </p>
                  <p className="text-xs text-red-700">
                    El registro pasará a estado <span className="font-semibold">cancelado</span> y no aparecerá en prefactura.
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex justify-between gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setConfirmSendDialogOpen(false)
                setRecordToSend(null)
              }}
            >
              Cerrar
            </Button>
            <div className="flex gap-2">
              <Button 
                variant="outline"
                onClick={handleMarkAsCancelled}
                className="text-red-700 border-red-600 hover:bg-red-50"
              >
                <X className="h-4 w-4 mr-2" />
                Cancelar Registro
              </Button>
              <Button 
                onClick={handleMarkAsCompleted}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Completar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
} 