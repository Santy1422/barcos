"use client"

import { useState, useEffect, useMemo, useRef, useCallback } from "react"
import { useAppDispatch, useAppSelector } from "@/lib/hooks"
import { selectCurrentUser } from "@/lib/features/auth/authSlice"
import { createTruckingRecords, createTruckingRecordsAsync, getUploadJobStatus, selectCreatingRecords, selectRecordsError } from "@/lib/features/records/recordsSlice"
import { addExcelFile } from "@/lib/features/excel/excelSlice"
import { parseTruckingExcel, TruckingExcelData, matchTruckingDataWithRoutes } from "@/lib/excel-parser"
import { selectTruckingRoutes, fetchTruckingRoutes, selectTruckingRoutesLoading, selectTruckingRoutesError, selectTruckingRoutesPagination } from "@/lib/features/truckingRoutes/truckingRoutesSlice"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { FileSpreadsheet, Upload, CheckCircle, Loader2, AlertCircle, CheckCircle2, Plus } from "lucide-react"
import { 
  selectAllClients,
  fetchClients,
  createClientAsync,
  type Client
} from "@/lib/features/clients/clientsSlice"
import { ClientModal } from "@/components/clients-management"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  selectAllContainerTypes,
  fetchContainerTypes,
  selectContainerTypesLoading,
  selectContainerTypesError,
  createContainerType,
  type ContainerTypeInput
} from "@/lib/features/containerTypes/containerTypesSlice"
import {
  createTruckingRoute,
  type TruckingRouteInput,
} from "@/lib/features/truckingRoutes/truckingRoutesSlice"
import { TruckingGastosAutoridadesUpload } from "./trucking-gastos-autoridades-upload"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

// Función para convertir números de serie de Excel a fechas legibles
const convertExcelDateToReadable = (excelDate: string | number): string => {
  if (!excelDate) return ''
  
  // Si ya es una fecha legible, devolverla tal como está
  if (typeof excelDate === 'string' && isNaN(Number(excelDate))) {
    return excelDate
  }
  
  // Convertir número de serie de Excel a fecha
  const excelSerialNumber = Number(excelDate)
  if (isNaN(excelSerialNumber)) return String(excelDate)
  
  // Excel cuenta los días desde 1900-01-01, pero hay un bug de año bisiesto
  // que hace que 1900 sea considerado bisiesto cuando no lo es
  const excelEpoch = new Date(1900, 0, 1) // 1 de enero de 1900
  const millisecondsPerDay = 24 * 60 * 60 * 1000
  
  // Ajustar por el bug del año bisiesto de Excel
  const adjustedSerialNumber = excelSerialNumber > 59 ? excelSerialNumber - 1 : excelSerialNumber
  
  const date = new Date(excelEpoch.getTime() + (adjustedSerialNumber - 1) * millisecondsPerDay)
  
  // Formatear la fecha como DD/MM/YYYY
  const day = date.getDate().toString().padStart(2, '0')
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const year = date.getFullYear()
  
  return `${day}/${month}/${year}`
}

export function TruckingUpload() {
  const [activeTab, setActiveTab] = useState<'trasiego' | 'autoridades'>('trasiego')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewData, setPreviewData] = useState<TruckingExcelData[]>([])
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

  const dispatch = useAppDispatch()
  const { toast } = useToast()
  const currentUser = useAppSelector(selectCurrentUser)
  
  // Verificar permisos para gestionar clientes
  const userRoles = currentUser?.roles || (currentUser?.role ? [currentUser.role] : [])
  const canManageClients = userRoles.includes('administrador') || userRoles.includes('clientes')
  
  // Add this line to get the creating records state from Redux
  const isCreatingRecords = useAppSelector(selectCreatingRecords)
  const recordsError = useAppSelector(selectRecordsError)
  
  // Obtener las rutas configuradas para el matching
  const routes = useAppSelector(selectTruckingRoutes)
  const routesLoading = useAppSelector(selectTruckingRoutesLoading)
  const routesError = useAppSelector(selectTruckingRoutesError)
  const routesPagination = useAppSelector(selectTruckingRoutesPagination)

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

  // Route creation modal state
  const [showCreateRouteModal, setShowCreateRouteModal] = useState(false)
  const [recordForRoute, setRecordForRoute] = useState<TruckingExcelData | null>(null)
  const [newRoute, setNewRoute] = useState<TruckingRouteInput>({
    name: "",
    origin: "",
    destination: "",
    containerType: "",
    routeType: "SINGLE",
    price: 0,
    status: "FULL",
    cliente: "",
    routeArea: "",
    sizeContenedor: "",
  })
  const [shouldReprocess, setShouldReprocess] = useState(false)

  // Estado para filtro de matching
  const [matchFilter, setMatchFilter] = useState<'all' | 'matched' | 'unmatched'>('all')

  // Estado para tipos de contenedores faltantes del Excel
  const [missingContainerTypes, setMissingContainerTypes] = useState<string[]>([])
  const [showMissingContainerTypesModal, setShowMissingContainerTypesModal] = useState(false)
  const [newContainerType, setNewContainerType] = useState<ContainerTypeInput>({
    code: '',
    name: '',
    category: 'DRY',
    sapCode: '',
    description: '',
    isActive: true
  })
  const [isCreatingContainerType, setIsCreatingContainerType] = useState(false)

  // Filtrar registros basado en el filtro de matching
  const filteredPreviewData = useMemo(() => {
    if (matchFilter === 'all') return previewData
    if (matchFilter === 'matched') return previewData.filter(record => record.isMatched === true)
    if (matchFilter === 'unmatched') return previewData.filter(record => record.isMatched !== true)
    return previewData
  }, [previewData, matchFilter])

  // Cargar rutas al montar el componente - cargar todas las rutas para matching
  useEffect(() => {
    dispatch(fetchTruckingRoutes({ page: 1, limit: 10000 })) // Cargar hasta 10,000 rutas para matching
  }, [dispatch])

  // Cargar container types al montar el componente
  useEffect(() => {
    dispatch(fetchContainerTypes())
  }, [dispatch])

  // Load clients - cargar todos los clientes para poder buscar por SAP code
  useEffect(() => {
    dispatch(fetchClients()) // Sin parámetro para cargar todos los clientes
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

  // Debug: Monitorear cuando los clientes se cargan
  useEffect(() => {
    console.log("=== CLIENTES CARGADOS ===")
    console.log("Clientes disponibles:", clients)
    console.log("Número de clientes:", clients.length)
    console.log("Cargando clientes:", clientsLoading)
    if (clients.length > 0) {
      console.log("Ejemplos de clientes:")
      clients.slice(0, 5).forEach((client: any, index: number) => {
        const displayName = client.type === 'juridico' ? client.companyName : client.fullName
        const code = client.type === 'juridico' ? client.name : client.documentNumber
        console.log(`  ${index + 1}: ${displayName} (${code}) - ${client.type}`)
      })
    }
    console.log("")
  }, [clients, clientsLoading])

  // DEBUG: Monitorear previewData cada vez que cambie
  useEffect(() => {
    console.log("=== PREVIEW DATA ACTUALIZADO ===")
    console.log("Total registros:", previewData.length)
    if (previewData.length > 0) {
      const matchedCount = previewData.filter(r => r.isMatched === true).length
      const unmatchedCount = previewData.filter(r => r.isMatched === false).length
      const undefinedCount = previewData.filter(r => r.isMatched === undefined).length
      console.log(`Matcheados: ${matchedCount}, Sin match: ${unmatchedCount}, Undefined: ${undefinedCount}`)
      console.log("Primeros 3 registros:")
      previewData.slice(0, 3).forEach((r, i) => {
        console.log(`  ${i + 1}: isMatched=${r.isMatched} (${typeof r.isMatched}), precio=${r.matchedPrice}, leg=${r.leg}, type=${r.type}`)
      })
    }
  }, [previewData])

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

      // Si el job terminó (completed o failed), detener polling
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
          // Limpiar estado
          setPreviewData([])
          setSelectedFile(null)
          setMatchFilter('all')
          setClientCompleteness(new Map())
          // Refrescar listas
          try {
            const { fetchPendingRecordsByModule, fetchRecordsByModule } = await import("@/lib/features/records/recordsSlice")
            //@ts-ignore
            dispatch(fetchPendingRecordsByModule("trucking"))
            //@ts-ignore
            dispatch(fetchRecordsByModule("trucking"))
          } catch {}
        } else {
          toast({
            title: "Error en la carga",
            description: result.result?.message || "Hubo un error procesando los registros",
            variant: "destructive"
          })
        }

        // Reset job state after a delay
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

  // Efecto para iniciar polling cuando hay un jobId
  useEffect(() => {
    if (uploadJob.jobId && (uploadJob.status === 'pending' || uploadJob.status === 'processing')) {
      // Polling cada 2 segundos
      pollingIntervalRef.current = setInterval(() => {
        pollJobStatus(uploadJob.jobId!)
      }, 2000)

      // Hacer una llamada inicial inmediata
      pollJobStatus(uploadJob.jobId)
    }

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
        pollingIntervalRef.current = null
      }
    }
  }, [uploadJob.jobId, uploadJob.status, pollJobStatus])

  const findClientByName = (name: string): Client | null => {
    return (
      clients.find((client: any) => {
        if (!name) return false
        const nameLower = name.toLowerCase().trim()
        if (client.type === "juridico") {
          // Para clientes jurídicos, buscar por nombre corto (name) O por companyName
          const clientName = client.name?.toLowerCase().trim() || ''
          const clientCompanyName = client.companyName?.toLowerCase().trim() || ''
          return clientName === nameLower || clientCompanyName === nameLower
        }
        if (client.type === "natural") return client.fullName?.toLowerCase().trim() === nameLower
        return false
      }) || null
    )
  }

  const findClientByNameInModule = (name: string, module: string): Client | null => {
    return (
      clients.find((client: any) => {
        if (!name) return false
        const nameLower = name.toLowerCase().trim()

        // Verificar que el cliente esté asignado al módulo especificado
        const clientModules = client.module || []
        if (!clientModules.includes(module)) return false

        if (client.type === "juridico") {
          // Para clientes jurídicos, buscar por nombre corto (name) O por companyName
          const clientName = client.name?.toLowerCase().trim() || ''
          const clientCompanyName = client.companyName?.toLowerCase().trim() || ''
          return clientName === nameLower || clientCompanyName === nameLower
        }
        if (client.type === "natural") return client.fullName?.toLowerCase().trim() === nameLower
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
    const updated = findClientByNameInModule(clientName, 'trucking')
    if (updated) {
      const completeness = checkClientCompleteness(updated)
      setClientCompleteness(prev => new Map(prev).set(clientName, completeness))
      console.log(`Cliente ${clientName} actualizado en módulo trucking:`, completeness)
    } else {
      // Si el cliente no se encuentra en el módulo trucking, marcarlo como incompleto
      setClientCompleteness(prev => new Map(prev).set(clientName, { isComplete: false, missingFields: ["No asignado al módulo trucking"] }))
      console.log(`Cliente ${clientName} no encontrado en módulo trucking, marcado como incompleto`)
    }
  }

  const areAllClientsComplete = (): boolean => {
    if (clientCompleteness.size === 0) return true
    for (const [, completeness] of clientCompleteness) if (!completeness.isComplete) return false
    return true
  }

  // Función para detectar tipos de contenedores del Excel que no existen en la BD
  const detectMissingContainerTypes = (excelData: TruckingExcelData[]): string[] => {
    const typesInExcel = new Set<string>()
    excelData.forEach(record => {
      if (record.type) {
        typesInExcel.add(record.type.toUpperCase().trim())
      }
    })

    const existingCodes = new Set(containerTypes.map(ct => ct.code.toUpperCase().trim()))
    const missing: string[] = []

    typesInExcel.forEach(type => {
      if (!existingCodes.has(type)) {
        missing.push(type)
      }
    })

    return missing
  }

  // Handler para crear un nuevo tipo de contenedor
  const handleCreateContainerType = async () => {
    if (!newContainerType.code || !newContainerType.name || !newContainerType.sapCode) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos obligatorios (Código, Nombre, SAP Code)",
        variant: "destructive"
      })
      return
    }

    setIsCreatingContainerType(true)
    try {
      await dispatch(createContainerType(newContainerType)).unwrap()

      // Remover el tipo creado de la lista de faltantes
      const updatedMissing = missingContainerTypes.filter(type => type !== newContainerType.code.toUpperCase())
      setMissingContainerTypes(updatedMissing)

      // Refrescar la lista de container types
      dispatch(fetchContainerTypes())

      // Limpiar el formulario
      setNewContainerType({
        code: '',
        name: '',
        category: 'DRY',
        sapCode: '',
        description: '',
        isActive: true
      })

      toast({
        title: "Tipo de contenedor creado",
        description: `El tipo "${newContainerType.code}" ha sido creado correctamente.`
      })

      // Si no hay más tipos faltantes, cerrar el modal y re-procesar
      if (updatedMissing.length === 0) {
        setShowMissingContainerTypesModal(false)
        // Marcar para re-procesar cuando los containerTypes se actualicen
        setShouldReprocess(true)
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Error al crear el tipo de contenedor",
        variant: "destructive"
      })
    } finally {
      setIsCreatingContainerType(false)
    }
  }

  // Handler para seleccionar un tipo faltante y pre-llenar el formulario
  const handleSelectMissingType = (typeCode: string) => {
    setNewContainerType({
      code: typeCode,
      name: typeCode, // Por defecto usar el código como nombre
      category: 'DRY', // Por defecto DRY
      sapCode: 'DV', // Por defecto DV
      description: `Tipo de contenedor ${typeCode}`,
      isActive: true
    })
  }

  // Route creation handlers
  const handleCreateRouteClick = (record: TruckingExcelData) => {
    setRecordForRoute(record)
    
    // Pre-llenar el formulario con datos del registro
    const legParts = record.leg?.split('/') || ['', '']
    const origin = legParts[0]?.trim() || ''
    const destination = legParts[1]?.trim() || ''
    
    setNewRoute({
      name: `${origin}/${destination}`,
      origin: origin,
      destination: destination,
      containerType: record.type || "",
      routeType: record.moveType?.toLowerCase() === 'rt' ? "RT" : "SINGLE",
      price: 0,
      status: "FULL",
      cliente: record.line || "",
      routeArea: record.route || "", // Usar la columna Route del Excel para el área de ruta
      sizeContenedor: record.size || "",
    })
    
    setShowCreateRouteModal(true)
  }

  // Función para re-procesar el Excel (simula el handleFileChange pero sin seleccionar archivo)
  const reprocessExcel = async () => {
    if (!selectedFile) return
    
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
      const realData = await parseTruckingExcel(selectedFile)

      console.log("=== DEBUGGING RE-PROCESSING MATCHING ===")
      console.log("Datos del Excel:", realData)
      console.log("Rutas disponibles:", routes)
      console.log("Container types disponibles:", containerTypes)
      console.log("")

      // Detectar tipos de contenedores faltantes ANTES de hacer el matching
      const missingTypes = detectMissingContainerTypes(realData)
      console.log("=== TIPOS DE CONTENEDORES FALTANTES (RE-PROCESS) ===")
      console.log("Tipos faltantes:", missingTypes)

      if (missingTypes.length > 0) {
        setMissingContainerTypes(missingTypes)
        setShowMissingContainerTypesModal(true)
        handleSelectMissingType(missingTypes[0])
        setPreviewData(realData.map(r => ({ ...r, isMatched: false })))
        toast({
          title: "⚠️ Tipos de contenedores faltantes",
          description: `Aún faltan ${missingTypes.length} tipos de contenedores: ${missingTypes.join(', ')}. Debes crearlos antes de continuar.`,
          variant: "destructive",
        })
        setIsLoading(false)
        return
      }

      // Inicializar estado de progreso inmediatamente
      setMatchingProgress({
        isMatching: true,
        current: 0,
        total: realData.length,
        percentage: 0,
        currentRecord: 'Re-procesando...',
        matchesFound: 0
      })

      // Aplicar matching con las rutas configuradas y container types del backend
      const matchedData = await matchTruckingDataWithRoutes(realData, routes, containerTypes, (current, total, currentRecord, matchesFound) => {
        setMatchingProgress({
          isMatching: true,
          current: current + 1, // Mostrar como 1-based para el usuario
          total,
          percentage: Math.round(((current + 1) / total) * 100),
          currentRecord,
          matchesFound
        })
      })
      
      console.log("Datos después del re-matching:", matchedData)
      console.log("")
      
      // Procesar clientes faltantes usando la columna 'line' del Excel
      const processedData = await processMissingClients(matchedData)
      setPreviewData(processedData)
      
      // Limpiar estado de progreso
      setMatchingProgress({
        isMatching: false,
        current: 0,
        total: 0,
        percentage: 0,
        currentRecord: '',
        matchesFound: 0
      })
      
      // Contar registros con match
      const matchedCount = matchedData.filter(record => record.isMatched).length
      const unmatchedCount = matchedData.length - matchedCount
      
      console.log(`Re-procesamiento: ${matchedCount}/${matchedData.length} registros con match`)
      
      // Contar tipos de contenedores detectados
      const dryCount = matchedData.filter(r => r.detectedContainerType === 'dry').length;
      const reeferCount = matchedData.filter(r => r.detectedContainerType === 'reefer').length;
      
      let description = `Re-procesamiento completado. ${matchedCount} con precio asignado, ${unmatchedCount} sin coincidencia.`;
      if (dryCount > 0 || reeferCount > 0) {
        description += ` Tipos detectados: ${dryCount > 0 ? `${dryCount} DRY` : ''}${dryCount > 0 && reeferCount > 0 ? ', ' : ''}${reeferCount > 0 ? `${reeferCount} REEFER` : ''}`;
      }
      
      toast({
        title: "✅ Excel re-procesado",
        description: description,
      })
    } catch (error) {
      console.error('Error al re-procesar archivo:', error)
      toast({
        title: "Error al re-procesar archivo",
        description: "No se pudo re-procesar el archivo Excel. Verifica que tenga el formato correcto.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateRoute = async () => {
    if (!newRoute.origin || !newRoute.destination || !newRoute.containerType || !newRoute.routeType || newRoute.price <= 0 || !newRoute.status || !newRoute.cliente || !newRoute.routeArea || !newRoute.sizeContenedor) {
      toast({ title: "Error", description: "Completa todos los campos obligatorios", variant: "destructive" })
      return
    }
    
    try {
      await dispatch(createTruckingRoute(newRoute)).unwrap()
      
      // Cerrar modal y limpiar estado
      setShowCreateRouteModal(false)
      setRecordForRoute(null)
      setNewRoute({ name: "", origin: "", destination: "", containerType: "", routeType: "SINGLE", price: 0, status: "FULL", cliente: "", routeArea: "", sizeContenedor: "" })
      
      // Activar flag para re-procesar cuando las rutas se actualicen
      if (selectedFile && previewData.length > 0) {
        console.log("=== RUTA CREADA, ACTIVANDO RE-PROCESAMIENTO ===")
        setShouldReprocess(true)
        toast({ 
          title: "Ruta creada", 
          description: `La ruta ${newRoute.name} ha sido creada. Re-procesando Excel...` 
        })
      } else {
        toast({ 
          title: "Ruta creada", 
          description: `La ruta ${newRoute.name} ha sido creada correctamente.` 
        })
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Error al crear la ruta", variant: "destructive" })
    }
  }

  const handleCancelCreateRoute = () => {
    setShowCreateRouteModal(false)
    setRecordForRoute(null)
    setNewRoute({ name: "", origin: "", destination: "", containerType: "", routeType: "SINGLE", price: 0, status: "FULL", cliente: "", routeArea: "", sizeContenedor: "" })
  }

  // Re-procesar Excel cuando las rutas se actualicen y shouldReprocess sea true
  useEffect(() => {
    if (shouldReprocess && !routesLoading && routes.length > 0 && selectedFile && previewData.length > 0) {
      console.log("=== TRIGGERING RE-PROCESSING DUE TO ROUTES UPDATE ===")
      setShouldReprocess(false) // Reset flag
      reprocessExcel()
    }
  }, [routes, routesLoading, shouldReprocess, selectedFile, previewData.length, reprocessExcel])

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

  // When completeness map changes, refresh clients to recalc
  useEffect(() => {
    if (clientCompleteness.size > 0) dispatch(fetchClients()) // Cargar todos los clientes
  }, [clientCompleteness.size, dispatch])

  // Recompute completeness when clients list updates
  useEffect(() => {
    if (clients.length > 0 && clientCompleteness.size > 0) {
      const newMap = new Map<string, { isComplete: boolean; missingFields: string[] }>()
      for (const [clientName] of clientCompleteness) {
        const c = findClientByNameInModule(clientName, 'trucking')
        if (c) {
          newMap.set(clientName, checkClientCompleteness(c))
        } else {
          newMap.set(clientName, { isComplete: false, missingFields: ["No asignado al módulo trucking"] })
        }
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
      // Buscar cliente en el módulo trucking específicamente
      const existingInModule = findClientByNameInModule(name, 'trucking')
      if (!existingInModule) {
        // Cliente no existe en el módulo trucking, agregarlo a la lista de faltantes
        missingList.push({ name, records: recs })
        newCompleteness.set(name, { isComplete: false, missingFields: ["No asignado al módulo trucking"] })
      } else {
        // Cliente existe en el módulo trucking, verificar si está completo
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

        // Detectar tipos de contenedores faltantes ANTES de hacer el matching
        const missingTypes = detectMissingContainerTypes(realData)
        console.log("=== TIPOS DE CONTENEDORES FALTANTES ===")
        console.log("Tipos faltantes:", missingTypes)

        if (missingTypes.length > 0) {
          setMissingContainerTypes(missingTypes)
          setShowMissingContainerTypesModal(true)
          // Pre-llenar el formulario con el primer tipo faltante
          handleSelectMissingType(missingTypes[0])

          // Guardar los datos parseados para re-procesar después de crear los tipos
          setPreviewData(realData.map(r => ({ ...r, isMatched: false })))

          toast({
            title: "⚠️ Tipos de contenedores faltantes",
            description: `Se encontraron ${missingTypes.length} tipos de contenedores del Excel que no existen en la configuración: ${missingTypes.join(', ')}. Debes crearlos antes de continuar.`,
            variant: "destructive",
          })
          setIsLoading(false)
          return
        }

        // Inicializar estado de progreso inmediatamente
        console.log("=== INICIANDO BARRA DE PROGRESO ===")
        console.log("Configurando estado de progreso:", {
          isMatching: true,
          current: 0,
          total: realData.length,
          percentage: 0,
          currentRecord: 'Iniciando...',
          matchesFound: 0
        })
        
        setMatchingProgress({
          isMatching: true,
          current: 0,
          total: realData.length,
          percentage: 0,
          currentRecord: 'Iniciando...',
          matchesFound: 0
        })
        
        console.log("Estado de progreso configurado")
        
        // Forzar re-render con un pequeño delay
        await new Promise(resolve => setTimeout(resolve, 100))
        
        // Aplicar matching con las rutas configuradas y container types del backend
        const matchedData = await matchTruckingDataWithRoutes(realData, routes, containerTypes, (current, total, currentRecord, matchesFound) => {
          console.log("=== CALLBACK DE PROGRESO ===")
          console.log("Current:", current, "Total:", total, "Record:", currentRecord, "Matches:", matchesFound)
          
          setMatchingProgress({
            isMatching: true,
            current: current + 1, // Mostrar como 1-based para el usuario
            total,
            percentage: Math.round(((current + 1) / total) * 100),
            currentRecord,
            matchesFound
          })
        })
        
        console.log("Datos después del matching:", matchedData)
        console.log("=== VERIFICANDO isMatched ===")
        matchedData.forEach((record, index) => {
          console.log(`Registro ${index + 1}: isMatched=${record.isMatched}, tipo=${typeof record.isMatched}, precio=${record.matchedPrice}, leg=${record.leg}, type=${record.type}`)
        })
        console.log(`Total matcheados: ${matchedData.filter(r => r.isMatched === true).length}/${matchedData.length}`)
        console.log("")

        // Procesar clientes faltantes usando la columna 'line' del Excel
        const processedData = await processMissingClients(matchedData)

        console.log("=== DATOS DESPUÉS DE processMissingClients ===")
        processedData.forEach((record, index) => {
          console.log(`Registro ${index + 1}: isMatched=${record.isMatched}, tipo=${typeof record.isMatched}`)
        })

        setPreviewData(processedData)
        
        // Limpiar estado de progreso
        setMatchingProgress({
          isMatching: false,
          current: 0,
          total: 0,
          percentage: 0,
          currentRecord: '',
          matchesFound: 0
        })
        
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

      // Usar versión asíncrona para evitar timeouts en cargas grandes
      const result = await dispatch(createTruckingRecordsAsync({
        excelId: tempObjectId,
        recordsData
      })).unwrap()

      console.log("=== JOB CREADO ===")
      console.log("Result:", result)

      if (result.jobId) {
        // Iniciar el tracking del job
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
      console.error("Error al guardar:", error)
      toast({
        title: "Error",
        description: recordsError || "Error al guardar los registros",
        variant: "destructive"
      })
      setUploadJob(prev => ({ ...prev, status: 'idle' }))
    } finally {
      setIsLoading(false)
    }
  }

  const totalAmount = previewData.reduce((sum, record) => sum + (record.matchedPrice || 0), 0)
  const matchedCount = previewData.filter(record => record.isMatched === true).length
  const unmatchedCount = previewData.filter(record => record.isMatched !== true).length

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
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as 'trasiego' | 'autoridades')}
        className="w-full"
      >
        <TabsList className="mb-6">
          <TabsTrigger value="trasiego">Subir Excel Trasiego</TabsTrigger>
          <TabsTrigger value="autoridades">Gastos Autoridades</TabsTrigger>
        </TabsList>
        <TabsContent value="trasiego" className="space-y-6">
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
              {routesPagination?.totalItems || routes.length} ruta{(routesPagination?.totalItems || routes.length) !== 1 ? 's' : ''} y {containerTypes.length} tipo{containerTypes.length !== 1 ? 's' : ''} de contenedor{containerTypes.length !== 1 ? 'es' : ''} configurado{(routesPagination?.totalItems || routes.length) !== 1 ? 's' : ''} listo{(routesPagination?.totalItems || routes.length) !== 1 ? 's' : ''}
            </div>
          )}
          
          {selectedFile && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileSpreadsheet className="h-4 w-4" />
              {selectedFile.name}
              <Badge variant="secondary">{previewData.length} registros</Badge>
            </div>
          )}

          {/* Barra de progreso del matching */}
          {console.log("=== RENDERIZANDO BARRA DE PROGRESO ===", matchingProgress.isMatching, matchingProgress)}
          {matchingProgress.isMatching && (
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                      <span className="text-sm font-medium text-blue-900">
                        Buscando coincidencias...
                      </span>
                    </div>
                    <span className="text-sm text-blue-700">
                      {matchingProgress.percentage}%
                    </span>
                  </div>
                  
                  <Progress 
                    value={matchingProgress.percentage} 
                    className="h-2"
                  />
                  
                  <div className="flex items-center justify-between text-xs text-blue-700">
                    <span>
                      Procesando: {matchingProgress.currentRecord}
                    </span>
                    <span>
                      {matchingProgress.current} de {matchingProgress.total} registros
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between text-xs text-blue-600">
                    <span>
                      ✅ {matchingProgress.matchesFound} coincidencias encontradas
                    </span>
                    <span>
                      🔍 Comparando con {routes.length} rutas disponibles
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      {previewData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-bold  mb-4">Vista Previa de Datos</CardTitle>
            
            {/* Cartel de registros sin match */}
            {unmatchedCount > 0 && (
              <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <AlertCircle className="h-5 w-5 text-red-400" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">
                      ⚠️ Registros sin coincidencia detectados
                    </h3>
                    <div className="mt-2 text-sm text-red-700">
                      <p className="mb-2">
                        <strong>No se puede proceder</strong> hasta que todos los registros tengan una ruta asignada.
                      </p>
                      <p className="mb-2">
                        <strong>Para crear las rutas faltantes:</strong>
                      </p>
                      <ol className="list-decimal list-inside space-y-1 ml-4">
                        <li>Haz clic en el botón <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-orange-100 text-orange-800 border border-orange-200">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          Sin match
                        </span> en la columna "Estado" de cada registro sin coincidencia</li>
                        <li>Completa el formulario de creación de ruta con los datos del registro</li>
                        <li>El sistema re-procesará automáticamente y mostrará el match</li>
                        <li>Repite hasta que todos los registros tengan <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Match
                        </span></li>
                      </ol>
                      <p className="mt-2 font-medium">
                        Registros pendientes: <span className="text-red-600 font-bold">{unmatchedCount}</span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
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
            {/* Headers fijos fuera de la tabla */}
            <div className="rounded-md border-b bg-gray-50 overflow-x-auto">
              <Table className="w-full table-fixed">
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-semibold w-32">Container</TableHead>
                    <TableHead className="font-semibold w-32">Container Consecutive</TableHead>
                    <TableHead className="font-semibold w-16">F/E</TableHead>
                    <TableHead className="font-semibold w-16">Size</TableHead>
                    <TableHead className="font-semibold w-16">Type</TableHead>
                    <TableHead className="font-semibold w-24">Tipo Detectado</TableHead>
                    <TableHead className="font-semibold w-24">Move Date</TableHead>
                    <TableHead className="font-semibold w-24">Cliente</TableHead>
                    <TableHead className="font-semibold w-24">Leg</TableHead>
                    <TableHead className="font-semibold w-20">Move Type</TableHead>
                    <TableHead className="font-semibold w-20">Precio</TableHead>
                    <TableHead className="font-semibold w-20">Estado</TableHead>
                    {/* <TableHead className="font-semibold w-20">Acciones</TableHead> */}
                  </TableRow>
                </TableHeader>
              </Table>
            </div>
            
            {/* Tabla con solo el cuerpo, scrolleable */}
            <div className="rounded-md border-t-0 border max-h-96 overflow-auto">
              <Table className="w-full table-fixed">
                <TableBody>
                  {filteredPreviewData.map((record, index) => {
                    const clientName = record.line?.trim()
                    const clientStatus = clientName ? clientCompleteness.get(clientName) : null
                    const isClickable = record.isMatched && clientName && (clientStatus ? !clientStatus.isComplete : true)
                    const uniqueKey = `${record.containerConsecutive || ''}-${record.container || ''}-${index}`
                    return (
                    <TableRow key={uniqueKey}>
                      <TableCell className="font-mono text-sm w-32">{record.container}</TableCell>
                      <TableCell className="w-32">{record.containerConsecutive}</TableCell>
                      <TableCell className="w-16">{record.fe}</TableCell>
                      <TableCell className="w-16">{record.size}</TableCell>
                      <TableCell className="w-16">{record.type}</TableCell>
                      <TableCell className="w-24">
                        {record.detectedContainerType ? (
                          <Badge variant={record.detectedContainerType === 'reefer' ? 'default' : 'secondary'}>
                            {record.detectedContainerType === 'reefer' ? 'REEFER' : 'DRY'}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="w-24">{convertExcelDateToReadable(record.moveDate)}</TableCell>
                      <TableCell className="w-24">
                        <span
                          className={isClickable ? "cursor-pointer text-blue-600 hover:text-blue-800 underline" : ""}
                          onClick={isClickable ? () => handleClientClick(clientName!) : undefined}
                          title={isClickable ? "Haz clic para editar datos del cliente" : ""}
                        >
                          {record.line || "N/A"}
                        </span>
                      </TableCell>
                      <TableCell className="w-24">{record.leg}</TableCell>
                      <TableCell className="w-20">{record.moveType}</TableCell>
                      <TableCell className="w-20">
                        {record.isMatched === true ? (
                          <span className="font-medium text-green-600">
                            ${record.matchedPrice?.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="w-20">
                        {record.isMatched === true ? (
                          <Badge variant="outline" className="text-green-600 border-green-600">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Match
                          </Badge>
                        ) : (
                          <div className="space-y-1">
                            <Badge
                              variant="outline"
                              className="text-orange-600 border-orange-600 cursor-pointer hover:bg-orange-50 hover:border-orange-700"
                              onClick={() => handleCreateRouteClick(record)}
                              title={record.matchFailReason || "Haz clic para crear una ruta para este registro"}
                            >
                              <AlertCircle className="h-3 w-3 mr-1" />
                              Sin match
                            </Badge>
                            {record.matchFailReason && (
                              <p className="text-xs text-orange-700 max-w-[200px] truncate" title={record.matchFailReason}>
                                {record.matchFailReason}
                              </p>
                            )}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  )})}
                </TableBody>
              </Table>
            </div>
            
            <div className="mt-4 flex justify-between items-center">
              <div className="flex items-center gap-2">
                {unmatchedCount > 0 && (
                  <div className="flex items-center space-x-2 text-sm text-red-600">
                    <AlertCircle className="h-4 w-4" />
                    <span>
                      <strong>No se puede guardar:</strong> {unmatchedCount} registros sin match. 
                      <span className="ml-1 text-orange-600">
                        Haz clic en los botones "Sin match" para crear las rutas faltantes.
                      </span>
                    </span>
                  </div>
                )}
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
                        const existing = findClientByNameInModule(clientName, 'trucking')
                        if (existing) {
                          newCompleteness.set(clientName, checkClientCompleteness(existing))
                        } else {
                          newCompleteness.set(clientName, { isComplete: false, missingFields: ["No asignado al módulo trucking"] })
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
                disabled={isLoading || isCreatingRecords || !areAllClientsComplete() || unmatchedCount > 0 || uploadJob.status === 'pending' || uploadJob.status === 'processing'}
                className={`${areAllClientsComplete() && unmatchedCount === 0 ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-400 cursor-not-allowed'}`}
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
                  <span className="text-sm text-blue-600 font-mono">
                    {uploadJob.progress}%
                  </span>
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

            {/* Resultado de carga completada */}
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

            {/* Error de carga */}
            {uploadJob.status === 'failed' && (
              <div className="mt-4 p-4 bg-red-50 rounded-lg border border-red-200">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  <span className="text-sm font-medium text-red-700">Error en la carga</span>
                </div>
                <p className="mt-1 text-sm text-red-600">{uploadJob.message || 'Hubo un error al procesar los registros'}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Modal de Clientes (crear/editar) - usar módulo trucking */}
      <ClientModal
        isOpen={!!editingClient}
        onClose={() => setEditingClient(null)}
        editingClient={editingClient}
        module="trucking"
        onClientCreated={(client) => {
          // Recalcular completitud
          const clientName = client.type === 'juridico' ? (client as any).companyName : (client as any).fullName
          updateClientCompleteness(clientName)
          setEditingClient(null)
          
          // Refrescar la lista de clientes
          dispatch(fetchClients()) // Cargar todos los clientes
          
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
                    if (!canManageClients) {
                      toast({
                        title: "Sin permiso",
                        description: "No tienes permiso para gestionar clientes.",
                        variant: "destructive"
                      })
                      return
                    }
                    
                    // Siempre crear un cliente nuevo con datos parciales para que el usuario ingrese el SAP code
                    // El modal de edición permitirá buscar por SAP code y completar los datos
                    setEditingClient({
                      type: "juridico",
                      companyName: clientToEdit.name, // Usar el nombre del Excel como companyName por defecto
                      name: clientToEdit.name, // Usar el nombre del Excel como name (nombre corto)
                      ruc: "",
                      contactName: "",
                      email: "",
                      phone: "",
                      address: "",
                      sapCode: "", // Vacío para que el usuario lo ingrese y busque
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

      {/* Modal para crear ruta desde registro sin match */}
      <Dialog open={showCreateRouteModal} onOpenChange={setShowCreateRouteModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Crear Nueva Ruta PTG
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
                    value={newRoute.origin && newRoute.destination ? `${newRoute.origin}/${newRoute.destination}` : ""} 
                    placeholder="Se genera automáticamente" 
                    disabled 
                    className="bg-gray-50" 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="route-origin">Origen *</Label>
                  <Input 
                    id="route-origin" 
                    value={newRoute.origin} 
                    onChange={(e) => setNewRoute({ ...newRoute, origin: e.target.value.toUpperCase() })} 
                    placeholder="PTY" 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="route-destination">Destino *</Label>
                  <Input 
                    id="route-destination" 
                    value={newRoute.destination} 
                    onChange={(e) => setNewRoute({ ...newRoute, destination: e.target.value.toUpperCase() })} 
                    placeholder="COL" 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="route-container-type">Tipo de Contenedor *</Label>
                  <Select value={newRoute.containerType} onValueChange={(value) => setNewRoute({ ...newRoute, containerType: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar tipo de contenedor" />
                    </SelectTrigger>
                    <SelectContent>
                      {containerTypes
                        .filter(ct => ct.isActive)
                        .sort((a, b) => a.code.localeCompare(b.code))
                        .map(containerType => (
                          <SelectItem key={containerType.code} value={containerType.code}>
                            {containerType.code} - {containerType.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="route-route-type">Tipo de Ruta *</Label>
                  <Select 
                    value={newRoute.routeType} 
                    onValueChange={(value) => setNewRoute({ ...newRoute, routeType: value as "SINGLE" | "RT" })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar tipo de ruta" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SINGLE">Single - Viaje único</SelectItem>
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
                  <Select 
                    value={newRoute.status} 
                    onValueChange={(value) => setNewRoute({ ...newRoute, status: value as "FULL" | "EMPTY" })}
                  >
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
                  <Select value={newRoute.cliente} onValueChange={(value) => setNewRoute({ ...newRoute, cliente: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients
                        .filter(client => client.isActive)
                        .sort((a, b) => {
                          const nameA = a.type === 'juridico' ? (a as any).companyName : (a as any).fullName
                          const nameB = b.type === 'juridico' ? (b as any).companyName : (b as any).fullName
                          return nameA.localeCompare(nameB)
                        })
                        .map(client => {
                          const displayName = client.type === 'juridico' ? (client as any).companyName : (client as any).fullName
                          const code = client.type === 'juridico' ? (client as any).name : (client as any).documentNumber
                          return (
                            <SelectItem key={client._id || client.id} value={code || displayName}>
                              {displayName} ({code})
                            </SelectItem>
                          )
                        })}
                    </SelectContent>
                  </Select>
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
                <div className="space-y-2">
                  <Label htmlFor="route-size">Tamaño del Contenedor *</Label>
                  <Select value={newRoute.sizeContenedor} onValueChange={(value) => setNewRoute({ ...newRoute, sizeContenedor: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar tamaño" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="40">40</SelectItem>
                      <SelectItem value="45">45</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="flex justify-between items-center space-x-2">
                <div className="text-sm text-muted-foreground">
                  La ruta se creará y el Excel se re-procesará automáticamente para mostrar el match.
                </div>
                <div className="flex gap-2">
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
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal para crear tipos de contenedores faltantes */}
      <Dialog open={showMissingContainerTypesModal} onOpenChange={setShowMissingContainerTypesModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              ⚠️ Tipos de Contenedores Faltantes
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-700">
                Los siguientes tipos de contenedores encontrados en el Excel <strong>no existen</strong> en la base de datos.
                Debes crearlos antes de poder procesar el archivo.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {missingContainerTypes.map(typeCode => (
                <Badge
                  key={typeCode}
                  variant={newContainerType.code === typeCode ? "default" : "outline"}
                  className={`cursor-pointer ${newContainerType.code === typeCode
                    ? "bg-primary text-white"
                    : "hover:bg-gray-100"
                  }`}
                  onClick={() => handleSelectMissingType(typeCode)}
                >
                  {typeCode}
                </Badge>
              ))}
            </div>

            <div className="border rounded-lg p-4 space-y-4">
              <h4 className="font-medium">Crear tipo de contenedor: {newContainerType.code || "(selecciona uno)"}</h4>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ct-code">Código *</Label>
                  <Input
                    id="ct-code"
                    value={newContainerType.code}
                    onChange={(e) => setNewContainerType({...newContainerType, code: e.target.value.toUpperCase()})}
                    placeholder="MT"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ct-name">Nombre *</Label>
                  <Input
                    id="ct-name"
                    value={newContainerType.name}
                    onChange={(e) => setNewContainerType({...newContainerType, name: e.target.value})}
                    placeholder="Empty Container"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ct-sapCode">Código SAP *</Label>
                  <Select value={newContainerType.sapCode} onValueChange={(value) => setNewContainerType({...newContainerType, sapCode: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar código SAP" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DV">DV - Dry Van</SelectItem>
                      <SelectItem value="RE">RE - Reefer</SelectItem>
                      <SelectItem value="FL">FL - Flat</SelectItem>
                      <SelectItem value="TK">TK - Tank</SelectItem>
                      <SelectItem value="OT">OT - Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ct-category">Categoría *</Label>
                  <Select value={newContainerType.category} onValueChange={(value: any) => setNewContainerType({...newContainerType, category: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DRY">DRY - Contenedor seco</SelectItem>
                      <SelectItem value="REEFE">REEFE - Refrigerado</SelectItem>
                      <SelectItem value="MTY">MTY - Vacío</SelectItem>
                      <SelectItem value="FB">FB - Flat Bed</SelectItem>
                      <SelectItem value="T">T - Tank</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="ct-description">Descripción</Label>
                  <Input
                    id="ct-description"
                    value={newContainerType.description || ''}
                    onChange={(e) => setNewContainerType({...newContainerType, description: e.target.value})}
                    placeholder="Descripción del tipo de contenedor"
                  />
                </div>
              </div>

              <div className="flex justify-between items-center pt-4">
                <p className="text-sm text-muted-foreground">
                  Faltan <strong>{missingContainerTypes.length}</strong> tipos por crear
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowMissingContainerTypesModal(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleCreateContainerType}
                    disabled={isCreatingContainerType || !newContainerType.code || !newContainerType.name || !newContainerType.sapCode}
                  >
                    {isCreatingContainerType ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Creando...
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-2" />
                        Crear Tipo
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
        </TabsContent>
        <TabsContent value="autoridades">
          <TruckingGastosAutoridadesUpload />
        </TabsContent>
      </Tabs>
    </div>
  )
}
