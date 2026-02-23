"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Ship, DollarSign, FileText, Search, Calendar, Clock, Database, Loader2, Download, Eye, ArrowRight, ArrowLeft, CheckCircle, Info, Trash2, Plus, Edit, ChevronUp, ChevronDown, X, Filter } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useAppSelector, useAppDispatch } from "@/lib/hooks"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import saveAs from "file-saver"
import { 
  selectPendingRecordsByModuleFromDB,
  selectRecordsByModule,
  selectRecordsLoading,
  fetchPendingRecordsByModule,
  fetchRecordsByModule,
  markRecordsAsPrefacturado,
  markRecordsAsInvoiced,
  updateMultipleRecordsStatusAsync,
  addInvoice,
  createInvoiceAsync,
  deleteRecordAsync,
  updateRecordAsync,
  type ExcelRecord as IndividualExcelRecord,
  type InvoiceRecord as PersistedInvoiceRecord
} from "@/lib/features/records/recordsSlice"
import { selectAllClients, fetchClients } from "@/lib/features/clients/clientsSlice"
import { selectActiveNavieras, fetchNavieras } from "@/lib/features/naviera/navieraSlice"
import { selectServicesByModule, fetchServices, selectServicesLoading } from "@/lib/features/services/servicesSlice"
import { selectAllLocalServices, selectLocalServicesLoading, fetchLocalServices } from "@/lib/features/localServices/localServicesSlice"
import { selectCurrentUser } from "@/lib/features/auth/authSlice"
import { createApiUrl } from "@/lib/api-config"

export function PTYSSPrefactura() {
  const dispatch = useAppDispatch()
  const { toast } = useToast()
  
  const ptyssRecords = useAppSelector((state) =>
    selectRecordsByModule(state, "ptyss")
  )
  const isLoadingRecords = useAppSelector(selectRecordsLoading)
  const clients = useAppSelector(selectAllClients)
  const navieras = useAppSelector(selectActiveNavieras)
  const additionalServices = useAppSelector((state) => selectServicesByModule(state, "ptyss"))
  const servicesLoading = useAppSelector(selectServicesLoading)
  const localServices = useAppSelector(selectAllLocalServices)
  const localServicesLoading = useAppSelector(selectLocalServicesLoading)
  
  // Debug: Log registros PTYSS
  console.log('🔍 PTYSSPrefactura - ptyssRecords:', ptyssRecords)
  console.log('🔍 PTYSSPrefactura - ptyssRecords.length:', ptyssRecords.length)
  console.log('🔍 PTYSSPrefactura - isLoadingRecords:', isLoadingRecords)
  

  
  // Debug: Log services
  console.log('🔍 PTYSSPrefactura - additionalServices:', additionalServices)
  console.log('🔍 PTYSSPrefactura - servicesLoading:', servicesLoading)
  console.log('🔍 PTYSSPrefactura - localServices:', localServices)
  console.log('🔍 PTYSSPrefactura - localServicesLoading:', localServicesLoading)
  
  // Estado para los pasos
  const [currentStep, setCurrentStep] = useState(1)
  const [selectedRecordIds, setSelectedRecordIds] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [recordTypeFilter, setRecordTypeFilter] = useState<"all" | "local" | "trasiego">("all")
  const [statusFilter, setStatusFilter] = useState<"all" | "pendiente" | "completado">("all")
  const [clientFilter, setClientFilter] = useState<string>('all')
  const [showClientFilter, setShowClientFilter] = useState(false)
  const [dateFilter, setDateFilter] = useState<"createdAt" | "moveDate">("createdAt")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [isUsingPeriodFilter, setIsUsingPeriodFilter] = useState(false)
  const [activePeriodFilter, setActivePeriodFilter] = useState<"none" | "today" | "week" | "month" | "advanced">("none")
  const [isDateModalOpen, setIsDateModalOpen] = useState(false)
  const [showSelectionRules, setShowSelectionRules] = useState(false)
  const [prefacturaData, setPrefacturaData] = useState({
    prefacturaNumber: `PTY-PRE-${Date.now().toString().slice(-5)}`,
    notes: ""
  })
  const [selectedAdditionalServices, setSelectedAdditionalServices] = useState<Array<{
    serviceId: string
    name: string
    description: string
    amount: number
    isLocalService?: boolean
  }>>([])
  const [currentServiceToAdd, setCurrentServiceToAdd] = useState<any>(null)
  const [currentServiceAmount, setCurrentServiceAmount] = useState<number>(0)
  const [generatedPdf, setGeneratedPdf] = useState<Blob | null>(null)
  const [previewPdf, setPreviewPdf] = useState<Blob | null>(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  
  // Estados para eliminación masiva
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false)
  const [isDeletingBulk, setIsDeletingBulk] = useState(false)
  
  // Redux state para usuario
  const currentUser = useAppSelector(selectCurrentUser)
  
  // Verificar si el usuario es administrador
  const userRoles = currentUser?.roles || (currentUser?.role ? [currentUser.role] : [])
  const isAdmin = userRoles.includes('administrador')
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)
  const [selectedRecordForView, setSelectedRecordForView] = useState<IndividualExcelRecord | null>(null)
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editedRecord, setEditedRecord] = useState<any>(null)
  
  // Estado para servicios locales fijos
  const [fixedLocalServices, setFixedLocalServices] = useState<any[]>([])
  const [fixedLocalServicesLoading, setFixedLocalServicesLoading] = useState(false)
  
  // Estados de paginación para la tabla de registros (Paso 1)
  const [currentPage, setCurrentPage] = useState(1)
  const recordsPerPage = 10



  // Cargar registros PTYSS al montar el componente
  // Logo para PDF
  const [logoBase64, setLogoBase64] = useState<string | undefined>(undefined)

  useEffect(() => {
    dispatch(fetchRecordsByModule("ptyss"))

    // Cargar logo PTYSS
    fetch('/logos/logo_PTYSS.png')
      .then(res => res.blob())
      .then(blob => {
        const reader = new FileReader()
        reader.onloadend = () => setLogoBase64(reader.result as string)
        reader.readAsDataURL(blob)
      })
      .catch(() => console.warn("No se pudo cargar el logo PTYSS"))
  }, [dispatch])

  // Cargar clientes al montar el componente
  useEffect(() => {
    dispatch(fetchClients())
  }, [dispatch])

  // Cargar servicios adicionales al montar el componente
  useEffect(() => {
    console.log('🔍 PTYSSPrefactura - Loading services for module: ptyss')
    dispatch(fetchServices("ptyss"))
  }, [dispatch])

  // Cargar servicios locales al montar el componente
  useEffect(() => {
    console.log('🔍 PTYSSPrefactura - Loading local services for module: ptyss')
    dispatch(fetchLocalServices("ptyss"))
  }, [dispatch])

  // Cargar servicios locales fijos al montar el componente
  useEffect(() => {
    const fetchFixedLocalServices = async () => {
      setFixedLocalServicesLoading(true)
      try {
        const token = localStorage.getItem('token')
        
        const response = await fetch(createApiUrl('/api/local-services'), {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })
        
        if (response.ok) {
          const data = await response.json()
          const services = data.data?.services || []
          
          // Filtrar solo los servicios locales fijos (FDA codes)
          const fixedServices = services.filter((service: any) =>
            ['FDA263', 'FDA047', 'FDA059'].includes(service.code)
          )
          
          setFixedLocalServices(fixedServices)
          console.log('🔍 PTYSSPrefactura - Fixed local services loaded:', fixedServices.map((s: any) => ({ code: s.code, name: s.name, price: s.price })))
        } else {
          console.error('🔍 Error loading fixed local services:', response.status, response.statusText)
        }
      } catch (error) {
        console.error('🔍 Error loading fixed local services:', error)
      } finally {
        setFixedLocalServicesLoading(false)
      }
    }
    
    fetchFixedLocalServices()
  }, [])

  // Cargar navieras al montar el componente
  useEffect(() => {
    dispatch(fetchNavieras('active'))
  }, [dispatch])

  // Función helper para obtener el precio de un servicio local fijo
  const getFixedLocalServicePrice = (serviceCode: string): number => {
    const service = fixedLocalServices.find((s: any) => s.code === serviceCode)
    return service?.price || 10 // Fallback a $10 si no se encuentra
  }

  // Función helper para obtener el ID correcto del registro
  const getRecordId = (record: IndividualExcelRecord): string => {
    if (!record) {
      return 'unknown'
    }
    
    // Buscar el ID en múltiples lugares posibles
    return record._id || record.id || 'unknown'
  }

  // Función para obtener el containerConsecutive de un registro
  const getContainerConsecutive = (record: IndividualExcelRecord): string => {
    const data = record.data as Record<string, any>
    
    // Buscar en múltiples lugares posibles
    return data.containerConsecutive || 
           record.containerConsecutive || 
           data.containerConsecutive || 
           "N/A"
  }

  // Función para determinar el tipo de registro
  const getRecordType = (record: IndividualExcelRecord): "local" | "trasiego" => {
    const data = record.data as Record<string, any>
    
    // Si el registro tiene el campo recordType, usarlo directamente
    if (data.recordType) {
      return data.recordType
    }
    
    // Los registros de trasiego tienen campos específicos del Excel de trucking
    // como containerConsecutive, leg, moveType, associate, etc.
    // Priorizar la detección de trasiego sobre local
    if (data.containerConsecutive || data.leg || data.moveType || data.associate || 
        data.from || data.to || data.line || data.driverName || data.plate) {
      return "trasiego"
    }
    
    // Los registros locales tienen campos específicos de PTYSS
    // como clientId, order, naviera, etc.
    if (data.clientId || data.order || data.naviera) {
      return "local"
    }
    
    // Por defecto, si no podemos determinar, asumimos que es local
    return "local"
  }

  // Función para obtener el cliente de un registro
  const getRecordClient = (record: IndividualExcelRecord) => {
    const data = record.data as Record<string, any>
    const clientId = data?.clientId
    const associate = data?.associate?.trim()
    
    console.log('🔍 getRecordClient - ClientId:', clientId, 'Associate:', associate, 'RecordType:', data?.recordType)
    console.log('🔍 getRecordClient - Clientes disponibles:', clients.map((c: any) => ({ name: c.name, companyName: c.companyName, fullName: c.fullName, type: c.type })))
    
    // Buscar por clientId primero (tanto para trasiego como locales)
    if (clientId && clientId.trim() !== '') {
      const clientById = clients.find((c: any) => (c._id || c.id) === clientId)
      if (clientById) {
        console.log('🔍 getRecordClient - Cliente encontrado por ID:', clientById?.companyName || clientById?.fullName)
        return clientById
      }
    }
    
    // Si no hay clientId, buscar por associate (nombre del cliente de Driver Name)
    if (associate) {
      const clientByName = clients.find((c: any) => {
        const name = c.name?.toLowerCase().trim() || ''
        const companyName = c.companyName?.toLowerCase().trim() || ''
        const fullName = c.fullName?.toLowerCase().trim() || ''
        const associateLower = associate.toLowerCase()
        
        return name === associateLower || companyName === associateLower || fullName === associateLower
      })
      if (clientByName) {
        console.log('🔍 getRecordClient - Cliente encontrado por nombre (associate):', clientByName?.companyName || clientByName?.fullName)
        return clientByName
      }
    }
    
    console.log('🔍 getRecordClient - No se encontró cliente')
    return null
  }

  // Debug: Log detallado de cada registro (después de definir getRecordType)
  if (ptyssRecords.length > 0) {
    console.log('🔍 PTYSSPrefactura - Análisis detallado de registros:')
    ptyssRecords.forEach((record: IndividualExcelRecord, index: number) => {
      const data = record.data as Record<string, any>
      const recordType = getRecordType(record)
      console.log(`  Registro ${index + 1}:`)
      console.log(`    ID: ${getRecordId(record)}`)
      console.log(`    Tipo detectado: ${recordType}`)
      console.log(`    Módulo: ${record.module}`)
      console.log(`    Data keys:`, Object.keys(data))
      console.log(`    clientId: ${data.clientId}`)
      console.log(`    order: ${data.order}`)
      console.log(`    naviera: ${data.naviera}`)
      console.log(`    containerConsecutive: ${data.containerConsecutive}`)
      console.log(`    associate: ${data.associate}`)
      console.log(`    leg: ${data.leg}`)
      console.log(`    moveType: ${data.moveType}`)
      console.log(`    recordType: ${data.recordType}`)
      console.log(`    ================================`)
    })
  }

  // Filtrar registros por búsqueda, tipo, estado y fecha
  const filteredRecords = ptyssRecords.filter((record: IndividualExcelRecord) => {
    const data = record.data as Record<string, any>
    const recordType = getRecordType(record)
    
    // EXCLUIR registros que ya han sido prefacturados (tienen invoiceId)
    if (record.invoiceId) {
      return false
    }
    
    // SOLO INCLUIR registros completados (tanto trasiego como locales)
    // Para registros de trasiego, siempre están completados
    // Para registros locales, verificar que status sea "completado"
    if (recordType === "local" && record.status !== "completado") {
      return false
    }
    
    // Aplicar filtro por tipo de registro
    if (recordTypeFilter !== "all" && recordType !== recordTypeFilter) {
      return false
    }
    
    // Aplicar filtro por cliente
    if (clientFilter !== 'all') {
      // Usar getRecordClient para obtener el cliente correcto (tanto trasiego como locales)
      const client = getRecordClient(record)
      const clientName = client ? (client.type === "natural" ? client.fullName : client.companyName) : "N/A"
      
      if (clientName !== clientFilter) {
        return false
      }
    }
    
    // Aplicar filtro por fecha
    if (startDate || endDate) {
      let dateToCheck: string = ""
      
      if (dateFilter === "createdAt") {
        dateToCheck = record.createdAt
      } else if (dateFilter === "moveDate") {
        dateToCheck = data.moveDate || ""
      }
      
      if (dateToCheck) {
        const recordDate = new Date(dateToCheck)
        
        if (startDate) {
          const start = new Date(startDate + "T00:00:00")
          if (recordDate < start) return false
        }
        
        if (endDate) {
          const end = new Date(endDate + "T23:59:59.999")
          if (recordDate > end) return false
        }
      } else if (dateFilter === "moveDate" && !dateToCheck) {
        // Si estamos filtrando por fecha de movimiento pero no hay fecha, excluir
        return false
      }
    }
    
    // Buscar el cliente por ID
    const client = clients.find((c: any) => (c._id || c.id) === data?.clientId)
    const clientName = client ? (client.type === "natural" ? client.fullName : client.companyName) : ""
    
    const searchableText = [
      data.container || "",
      data.order || "",
      data.containerConsecutive || "", // Incluir containerConsecutive para búsqueda
      data.associate || "", // Incluir associate para búsqueda
      clientName,
      data.moveDate || "",
      getRecordId(record),
    ].filter(Boolean).join(" ").toLowerCase()
    
    return searchTerm === "" || searchableText.includes(searchTerm.toLowerCase())
  }).sort((a: IndividualExcelRecord, b: IndividualExcelRecord) => {
    // Ordenar por fecha de creación: más nuevo primero
    const dateA = new Date(a.createdAt || 0)
    const dateB = new Date(b.createdAt || 0)
    return dateB.getTime() - dateA.getTime()
  })

  // Obtener clientes únicos de los registros filtrados
  const uniqueClients = useMemo(() => {
    const clientNames = new Set<string>()
    
    filteredRecords.forEach((record: IndividualExcelRecord) => {
      // Usar getRecordClient para obtener el cliente correcto (tanto trasiego como locales)
      const client = getRecordClient(record)
      const clientName = client ? (client.type === "natural" ? client.fullName : client.companyName) : "N/A"
      
      if (clientName) {
        clientNames.add(clientName)
      }
    })
    
    return Array.from(clientNames).sort()
  }, [filteredRecords, clients])

  // Lógica de paginación
  const totalPages = Math.ceil(filteredRecords.length / recordsPerPage)
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * recordsPerPage
    const end = start + recordsPerPage
    return filteredRecords.slice(start, end)
  }, [filteredRecords, currentPage, recordsPerPage])

  // Resetear página cuando cambien los filtros
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, recordTypeFilter, clientFilter, isUsingPeriodFilter, startDate, endDate, dateFilter])

  // Cerrar filtro de cliente al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (showClientFilter && !target.closest('[data-client-filter]')) {
        setShowClientFilter(false)
      }
    }

    if (showClientFilter) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showClientFilter])

  // Obtener registros seleccionados
    const selectedRecords = ptyssRecords.filter((record: IndividualExcelRecord) =>
    selectedRecordIds.includes(getRecordId(record))
  )

  // Función para validar si un registro puede ser seleccionado
  const canSelectRecord = (record: IndividualExcelRecord) => {
    const recordClient = getRecordClient(record)
    const recordType = getRecordType(record)
    
    // NO permitir seleccionar registros que ya han sido prefacturados
    if (record.invoiceId) {
      return false
    }
    
    // Si no hay registros seleccionados, solo permitir registros completados
    if (selectedRecordIds.length === 0) {
      return record.status === "completado"
    }
    
    // Obtener el primer registro seleccionado para comparar
    const firstSelectedRecord = ptyssRecords.find((r: IndividualExcelRecord) => getRecordId(r) === selectedRecordIds[0])
    if (!firstSelectedRecord) {
      return false
    }
    
    const firstSelectedClient = getRecordClient(firstSelectedRecord)
    const firstSelectedType = getRecordType(firstSelectedRecord)
    
    // Validar que sea del mismo cliente, mismo tipo y estado completado
    return (
      record.status === "completado" &&
      recordClient?._id === firstSelectedClient?._id &&
      recordType === firstSelectedType
    )
  }

  const handleRecordSelection = (recordId: string, checked: boolean) => {
    const record = ptyssRecords.find((r: IndividualExcelRecord) => getRecordId(r) === recordId)
    if (!record) return
    
    if (checked) {
      // Validar si se puede seleccionar
      if (!canSelectRecord(record)) {
        toast({
          title: "No se puede seleccionar este registro",
          description: "Solo puedes seleccionar registros del mismo cliente, mismo tipo y estado completado",
          variant: "destructive"
        })
        return
      }
      setSelectedRecordIds(prev => {
        const newSelectedIds = [...prev, recordId]
        return newSelectedIds
      })
      
      // Si es un registro local, agregar automáticamente los servicios locales fijos
      const data = record.data as Record<string, any>
      if (data.recordType === 'local') {
        const newLocalServices: Array<{
          serviceId: string
          name: string
          description: string
          amount: number
          isLocalService: boolean
        }> = []
        
        // FDA263 - monto manual (ti)
        if (data.ti && data.ti !== 'no') {
          const amount = parseFloat(data.ti)
          if (!isNaN(amount) && amount > 0) {
            newLocalServices.push({
              serviceId: 'FDA263',
              name: 'FDA263',
              description: 'Servicio Local FDA263',
              amount: amount,
              isLocalService: true
            })
          }
        }

        // FDA047 - monto manual (estadia)
        if (data.estadia && data.estadia !== 'no') {
          const amount = parseFloat(data.estadia)
          if (!isNaN(amount) && amount > 0) {
            newLocalServices.push({
              serviceId: 'FDA047',
              name: 'FDA047',
              description: 'Servicio Local FDA047',
              amount: amount,
              isLocalService: true
            })
          }
        }

        // FDA059 - monto manual (retencion)
        if (data.retencion && parseFloat(data.retencion) > 0) {
          newLocalServices.push({
            serviceId: 'FDA059',
            name: 'FDA059',
            description: 'Servicio Local FDA059',
            amount: parseFloat(data.retencion),
            isLocalService: true
          })
        }

        // Genset - monto manual
        if (data.genset && parseFloat(data.genset) > 0) {
          newLocalServices.push({
            serviceId: 'GENSET',
            name: 'Genset',
            description: `Genset`,
            amount: parseFloat(data.genset),
            isLocalService: true
          })
        }
        
        // Pesaje - precio directo
        if (data.pesaje && parseFloat(data.pesaje) > 0) {
          newLocalServices.push({
            serviceId: 'PESAJE',
            name: 'Pesaje',
            description: 'Pesaje',
            amount: parseFloat(data.pesaje),
            isLocalService: true
          })
        }
        
        // Agregar los servicios locales fijos a selectedAdditionalServices
        setSelectedAdditionalServices(prev => {
          // Mantener servicios que no son locales fijos
          const nonLocalServices = prev.filter(s => !s.isLocalService)
          
          // Obtener todos los registros locales seleccionados usando selectedRecordIds
          const selectedLocalRecords = ptyssRecords.filter((record: IndividualExcelRecord) => {
            const recordId = getRecordId(record)
            const isSelected = selectedRecordIds.includes(recordId)
            const data = record.data as Record<string, any>
            return isSelected && data.recordType === 'local'
          })
          
          // Acumular todos los servicios locales fijos de todos los registros seleccionados
          const allLocalServices: Array<{
            serviceId: string
            name: string
            description: string
            amount: number
            isLocalService: boolean
          }> = []
          
          console.log('🔍 handleRecordSelection - selectedLocalRecords count:', selectedLocalRecords.length)
          console.log('🔍 handleRecordSelection - selectedRecordIds:', selectedRecordIds)
          
          selectedLocalRecords.forEach((record: IndividualExcelRecord) => {
            const data = record.data as Record<string, any>
            
            // FDA263 - monto manual (ti)
            if (data.ti && data.ti !== 'no') {
              const amount = parseFloat(data.ti)
              if (!isNaN(amount) && amount > 0) {
                allLocalServices.push({
                  serviceId: 'FDA263',
                  name: 'FDA263',
                  description: 'Servicio Local FDA263',
                  amount: amount,
                  isLocalService: true
                })
              }
            }

            // FDA047 - monto manual (estadia)
            if (data.estadia && data.estadia !== 'no') {
              const amount = parseFloat(data.estadia)
              if (!isNaN(amount) && amount > 0) {
                allLocalServices.push({
                  serviceId: 'FDA047',
                  name: 'FDA047',
                  description: 'Servicio Local FDA047',
                  amount: amount,
                  isLocalService: true
                })
              }
            }

            // FDA059 - monto manual (retencion)
            if (data.retencion && parseFloat(data.retencion) > 0) {
              allLocalServices.push({
                serviceId: 'FDA059',
                name: 'FDA059',
                description: 'Servicio Local FDA059',
                amount: parseFloat(data.retencion),
                isLocalService: true
              })
            }

            // Genset - monto manual
            if (data.genset && parseFloat(data.genset) > 0) {
              allLocalServices.push({
                serviceId: 'GENSET',
                name: 'Genset',
                description: 'Genset',
                amount: parseFloat(data.genset),
                isLocalService: true
              })
            }

            // Pesaje - precio directo
            if (data.pesaje && parseFloat(data.pesaje) > 0) {
              allLocalServices.push({
                serviceId: 'PESAJE',
                name: 'Pesaje',
                description: 'Pesaje',
                amount: parseFloat(data.pesaje),
                isLocalService: true
              })
            }
          })
          
          return [...nonLocalServices, ...allLocalServices]
        })
      }
    } else {
      setSelectedRecordIds(prev => {
        const newSelectedIds = prev.filter(id => id !== recordId)
        
        // Recalcular servicios locales fijos después de actualizar selectedRecordIds
        setTimeout(() => {
          const selectedLocalRecords = ptyssRecords.filter((record: IndividualExcelRecord) => {
            const recordId = getRecordId(record)
            const isSelected = newSelectedIds.includes(recordId)
            const data = record.data as Record<string, any>
            return isSelected && data.recordType === 'local'
          })

          const allLocalServices: Array<{
            serviceId: string
            name: string
            description: string
            amount: number
            isLocalService: boolean
          }> = []

          selectedLocalRecords.forEach((record: IndividualExcelRecord) => {
            const data = record.data as Record<string, any>
            
            // FDA263 - monto manual (ti)
            if (data.ti && data.ti !== 'no') {
              const amount = parseFloat(data.ti)
              if (!isNaN(amount) && amount > 0) {
                allLocalServices.push({
                  serviceId: 'FDA263',
                  name: 'FDA263',
                  description: 'Servicio Local FDA263',
                  amount: amount,
                  isLocalService: true
                })
              }
            }

            // FDA047 - monto manual (estadia)
            if (data.estadia && data.estadia !== 'no') {
              const amount = parseFloat(data.estadia)
              if (!isNaN(amount) && amount > 0) {
                allLocalServices.push({
                  serviceId: 'FDA047',
                  name: 'FDA047',
                  description: 'Servicio Local FDA047',
                  amount: amount,
                  isLocalService: true
                })
              }
            }

            // FDA059 - monto manual (retencion)
            if (data.retencion && parseFloat(data.retencion) > 0) {
              allLocalServices.push({
                serviceId: 'FDA059',
                name: 'FDA059',
                description: 'Servicio Local FDA059',
                amount: parseFloat(data.retencion),
                isLocalService: true
              })
            }

            // Genset - monto manual
            if (data.genset && parseFloat(data.genset) > 0) {
              allLocalServices.push({
                serviceId: 'GENSET',
                name: 'Genset',
                description: 'Genset',
                amount: parseFloat(data.genset),
                isLocalService: true
              })
            }

            // Pesaje - precio directo
            if (data.pesaje && parseFloat(data.pesaje) > 0) {
              allLocalServices.push({
                serviceId: 'PESAJE',
                name: 'Pesaje',
                description: 'Pesaje',
                amount: parseFloat(data.pesaje),
                isLocalService: true
              })
            }
          })

          setSelectedAdditionalServices(prev => {
            const nonLocalServices = prev.filter(s => !s.isLocalService)
            return [...nonLocalServices, ...allLocalServices]
          })
        }, 0)
        
        return newSelectedIds
      })
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      // Solo seleccionar registros que cumplan con las restricciones
      const selectableRecords = filteredRecords.filter((record: IndividualExcelRecord) => canSelectRecord(record))
      const selectableIds = selectableRecords.map((record: IndividualExcelRecord) => getRecordId(record))
      
      if (selectableIds.length === 0) {
        toast({
          title: "No hay registros seleccionables",
          description: "No hay registros completados del mismo cliente y tipo para seleccionar",
          variant: "destructive"
        })
        return
      }
      
      setSelectedRecordIds(selectableIds)
      
      // Agregar servicios locales fijos para registros locales
      const newLocalServices: Array<{
        serviceId: string
        name: string
        description: string
        amount: number
        isLocalService: boolean
      }> = []
      
      selectableRecords.forEach((record: IndividualExcelRecord) => {
        const data = record.data as Record<string, any>
        if (data.recordType === 'local') {
          // FDA263 - monto manual (ti)
          if (data.ti && data.ti !== 'no') {
            const amount = parseFloat(data.ti)
            if (!isNaN(amount) && amount > 0) {
              newLocalServices.push({
                serviceId: 'FDA263',
                name: 'FDA263',
                description: 'Servicio Local FDA263',
                amount: amount,
                isLocalService: true
              })
            }
          }

          // FDA047 - monto manual (estadia)
          if (data.estadia && data.estadia !== 'no') {
            const amount = parseFloat(data.estadia)
            if (!isNaN(amount) && amount > 0) {
              newLocalServices.push({
                serviceId: 'FDA047',
                name: 'FDA047',
                description: 'Servicio Local FDA047',
                amount: amount,
                isLocalService: true
              })
            }
          }

          // FDA059 - monto manual (retencion)
          if (data.retencion && parseFloat(data.retencion) > 0) {
            newLocalServices.push({
              serviceId: 'FDA059',
              name: 'FDA059',
              description: 'Servicio Local FDA059',
              amount: parseFloat(data.retencion),
              isLocalService: true
            })
          }

          // Genset - monto manual
          if (data.genset && parseFloat(data.genset) > 0) {
            newLocalServices.push({
              serviceId: 'GENSET',
              name: 'Genset',
              description: 'Genset',
              amount: parseFloat(data.genset),
              isLocalService: true
            })
          }

          // Pesaje - precio directo
          if (data.pesaje && parseFloat(data.pesaje) > 0) {
            newLocalServices.push({
              serviceId: 'PESAJE',
              name: 'Pesaje',
              description: 'Pesaje',
              amount: parseFloat(data.pesaje),
              isLocalService: true
            })
          }
        }
      })
      
      // Agregar los servicios locales fijos a selectedAdditionalServices
      setSelectedAdditionalServices(prev => {
        const existingServices = prev.filter(s => !s.isLocalService || !newLocalServices.some(ns => ns.serviceId === s.serviceId))
        return [...existingServices, ...newLocalServices]
      })
    } else {
      setSelectedRecordIds([])
      // Remover todos los servicios locales fijos
      setSelectedAdditionalServices(prev => prev.filter(s => !s.isLocalService))
    }
  }

  const totalAmount = selectedRecords.reduce((sum: number, record: IndividualExcelRecord) => {
    // Siempre usar totalValue que ya incluye localRoutePrice + servicios adicionales (pesaje, retención, etc.)
    return sum + (record.totalValue || 0)
  }, 0)
  
  const additionalServicesTotal = selectedAdditionalServices.reduce((sum, service) => sum + service.amount, 0)
  const grandTotal = totalAmount + additionalServicesTotal
  
  // Debug logs para verificar cálculos
  console.log('🔍 Total Calculation - totalAmount:', totalAmount)
  console.log('🔍 Total Calculation - additionalServicesTotal:', additionalServicesTotal)
  console.log('🔍 Total Calculation - grandTotal:', grandTotal)
  console.log('🔍 Total Calculation - selectedAdditionalServices:', selectedAdditionalServices)
  console.log('🔍 Total Calculation - selectedAdditionalServices.length:', selectedAdditionalServices.length)

  // Verificar si hay registros de trasiego seleccionados
  const hasTrasiegoRecords = selectedRecords.some((record: IndividualExcelRecord) => {
    return getRecordType(record) === 'trasiego'
  })

  // Verificar si hay registros locales seleccionados
  const hasLocalRecords = selectedRecords.some((record: IndividualExcelRecord) => {
    return getRecordType(record) === 'local'
  })

  // useEffect para recalcular servicios locales fijos cuando cambien los registros seleccionados
  useEffect(() => {
    
    // Obtener todos los registros locales seleccionados
    const selectedLocalRecords = ptyssRecords.filter((record: IndividualExcelRecord) => {
      const recordId = getRecordId(record)
      const isSelected = selectedRecordIds.includes(recordId)
      const data = record.data as Record<string, any>
      return isSelected && data.recordType === 'local'
    })

    // Acumular todos los servicios locales fijos de todos los registros seleccionados
    const allLocalServices: Array<{
      serviceId: string
      name: string
      description: string
      amount: number
      isLocalService: boolean
    }> = []

    selectedLocalRecords.forEach((record: IndividualExcelRecord) => {
      const data = record.data as Record<string, any>

      // FDA263 - monto manual (ti)
      if (data.ti && data.ti !== 'no') {
        const amount = parseFloat(data.ti)
        if (!isNaN(amount) && amount > 0) {
          allLocalServices.push({
            serviceId: 'FDA263',
            name: 'FDA263',
            description: 'Servicio Local FDA263',
            amount: amount,
            isLocalService: true
          })
        }
      }

      // FDA047 - monto manual (estadia)
      if (data.estadia && data.estadia !== 'no') {
        const amount = parseFloat(data.estadia)
        if (!isNaN(amount) && amount > 0) {
          allLocalServices.push({
            serviceId: 'FDA047',
            name: 'FDA047',
            description: 'Servicio Local FDA047',
            amount: amount,
            isLocalService: true
          })
        }
      }

      // FDA059 - monto manual (retencion)
      if (data.retencion && parseFloat(data.retencion) > 0) {
        allLocalServices.push({
          serviceId: 'FDA059',
          name: 'FDA059',
          description: 'Servicio Local FDA059',
          amount: parseFloat(data.retencion),
          isLocalService: true
        })
      }

      // Genset - monto manual
      if (data.genset && parseFloat(data.genset) > 0) {
        allLocalServices.push({
          serviceId: 'GENSET',
          name: 'Genset',
          description: 'Genset',
          amount: parseFloat(data.genset),
          isLocalService: true
        })
      }

      // Pesaje - precio directo
      if (data.pesaje && parseFloat(data.pesaje) > 0) {
        allLocalServices.push({
          serviceId: 'PESAJE',
          name: 'Pesaje',
          description: 'Pesaje',
          amount: parseFloat(data.pesaje),
          isLocalService: true
        })
      }
    })

    // Actualizar selectedAdditionalServices manteniendo servicios no locales
    setSelectedAdditionalServices(prev => {
      const nonLocalServices = prev.filter(s => !s.isLocalService)
      return [...nonLocalServices, ...allLocalServices]
    })
  }, [selectedRecordIds, ptyssRecords, fixedLocalServices])

  // Navegación entre pasos
  const handleNextStep = () => {
    if (selectedRecords.length === 0) {
      toast({
        title: "Error",
        description: "Debes seleccionar al menos un registro para continuar",
        variant: "destructive"
      })
      return
    }
    setCurrentStep(2)
  }

  const handlePreviousStep = () => {
    setCurrentStep(1)
    // Limpiar servicios adicionales seleccionados al volver al paso 1
    setSelectedAdditionalServices([])
    setCurrentServiceToAdd(null)
    setCurrentServiceAmount(0)
  }

  const handleViewRecord = (record: IndividualExcelRecord) => {
    setSelectedRecordForView(record)
    setEditedRecord({ ...record.data })
    setIsEditing(false)
    setIsRecordModalOpen(true)
  }

  const handleEditRecord = () => {
    setIsEditing(true)
  }

  const handleSaveEdit = async () => {
    if (!selectedRecordForView || !editedRecord) return

    try {
      const recordId = getRecordId(selectedRecordForView)
      
      console.log("🔍 handleSaveEdit - recordId:", recordId);
      console.log("🔍 handleSaveEdit - editedRecord:", editedRecord);
      
      // Calcular el valor total actualizado
      const totalValue = (parseFloat(editedRecord.genset || '0') + 
                         parseFloat(editedRecord.retencion || '0') + 
                         parseFloat(editedRecord.pesaje || '0'))
      
      console.log("🔍 handleSaveEdit - totalValue calculado:", totalValue);
      
      const updatePayload = {
        id: recordId,
        updates: {
          data: editedRecord,
          totalValue: totalValue
        }
      };
      
      console.log("🔍 handleSaveEdit - updatePayload:", updatePayload);
      
      // Actualizar el registro en el backend
      await dispatch(updateRecordAsync(updatePayload)).unwrap()
      
      toast({
        title: "Registro actualizado",
        description: "El registro ha sido actualizado exitosamente",
      })
      
      // Refrescar los registros pendientes
      dispatch(fetchPendingRecordsByModule("ptyss"))
      
      // Cerrar el modal
      setIsRecordModalOpen(false)
      setIsEditing(false)
      setEditedRecord(null)
      
    } catch (error: any) {
      console.error("Error al actualizar registro:", error)
      toast({
        title: "Error al actualizar registro",
        description: error.message || "Error al actualizar el registro",
        variant: "destructive"
      })
    }
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    setEditedRecord(selectedRecordForView ? { ...selectedRecordForView.data } : null)
  }

  const handleStatusChange = async (record: IndividualExcelRecord, newStatus: "pendiente" | "completado") => {
    try {
      const recordId = getRecordId(record)
      
      console.log("🔍 handleStatusChange - record completo:", record);
      console.log("🔍 handleStatusChange - record._id:", record._id);
      console.log("🔍 handleStatusChange - record.id:", record.id);
      console.log("🔍 handleStatusChange - recordId calculado:", recordId);
      console.log("🔍 handleStatusChange - newStatus:", newStatus);
      
      // Actualizar el estado del registro en el backend
      await dispatch(updateRecordAsync({
        id: recordId,
        updates: {
          status: newStatus
        }
      })).unwrap()
      
      toast({
        title: "Estado actualizado",
        description: `El estado del registro ha sido cambiado a ${newStatus}`,
      })
      
      // Refrescar todos los registros del módulo PTYSS
      dispatch(fetchRecordsByModule("ptyss"))
      
    } catch (error: any) {
      console.error("Error al actualizar estado:", error)
      toast({
        title: "Error al actualizar estado",
        description: error.message || "Error al actualizar el estado del registro",
        variant: "destructive"
      })
    }
  }

  const handleDeleteRecord = async (record: IndividualExcelRecord) => {
    const recordId = getRecordId(record)
    
    console.log("🗑️ handleDeleteRecord - Registro a eliminar:", record)
    console.log("🗑️ handleDeleteRecord - ID calculado:", recordId)
    console.log("🗑️ handleDeleteRecord - record._id:", record._id)
    console.log("🗑️ handleDeleteRecord - record.id:", record.id)
    
    try {
      await dispatch(deleteRecordAsync(recordId)).unwrap()
      
      // Remover el registro del estado local de selección si estaba seleccionado
      setSelectedRecordIds(prev => prev.filter(id => id !== recordId))
      
      toast({
        title: "Registro eliminado",
        description: "El registro ha sido eliminado exitosamente",
      })
      
      // Refrescar todos los registros del módulo PTYSS
      dispatch(fetchRecordsByModule("ptyss"))
      
    } catch (error: any) {
      toast({
        title: "Error al eliminar registro",
        description: error.message || "Error al eliminar el registro",
        variant: "destructive"
      })
    }
  }

  const handleDeleteSelectedRecords = async () => {
    if (selectedRecordIds.length === 0) return
    
    // Verificación de seguridad: solo administradores pueden eliminar múltiples registros
    if (!isAdmin) {
      toast({ 
        title: "Sin permisos", 
        description: "Solo los administradores pueden eliminar múltiples registros", 
        variant: "destructive" 
      })
      setShowBulkDeleteDialog(false)
      return
    }
    
    setIsDeletingBulk(true)
    let successCount = 0
    let errorCount = 0
    
    // Guardar valores antes de limpiar la selección
    const recordsCount = selectedRecordIds.length
    
    try {
      // Eliminar todos los registros seleccionados
      for (const recordId of selectedRecordIds) {
        try {
          await dispatch(deleteRecordAsync(recordId)).unwrap()
          successCount++
        } catch (error: any) {
          console.error(`Error eliminando registro ${recordId}:`, error)
          errorCount++
        }
      }
      
      // Limpiar selección
      setSelectedRecordIds([])
      
      // Recargar datos
      dispatch(fetchRecordsByModule("ptyss"))
      
      // Mostrar resultado
      if (successCount > 0 && errorCount === 0) {
        toast({ 
          title: "Registros eliminados", 
          description: `${successCount} registro${successCount !== 1 ? 's' : ''} eliminado${successCount !== 1 ? 's' : ''} exitosamente` 
        })
      } else if (successCount > 0 && errorCount > 0) {
        toast({ 
          title: "Eliminación parcial", 
          description: `${successCount} eliminado${successCount !== 1 ? 's' : ''}, ${errorCount} error${errorCount !== 1 ? 'es' : ''}`,
          variant: "destructive"
        })
      } else {
        toast({ 
          title: "Error al eliminar registros", 
          description: `No se pudieron eliminar los ${errorCount} registro${errorCount !== 1 ? 's' : ''}`,
          variant: "destructive"
        })
      }
      
      setShowBulkDeleteDialog(false)
    } catch (error: any) {
      toast({ 
        title: "Error", 
        description: error?.message || "Ocurrió un error al eliminar los registros", 
        variant: "destructive" 
      })
    } finally {
      setIsDeletingBulk(false)
    }
  }

  const handleAddAdditionalService = (service: any) => {
    const isAlreadySelected = selectedAdditionalServices.some(s => s.serviceId === service._id)
    if (!isAlreadySelected) {
      setSelectedAdditionalServices(prev => [...prev, {
        serviceId: service._id,
        name: service.name,
        description: service.description,
        amount: 0
      }])
    }
  }

  const handleRemoveAdditionalService = (serviceId: string) => {
    setSelectedAdditionalServices(prev => prev.filter(s => s.serviceId !== serviceId))
  }

  const handleRemoveLocalService = (serviceId: string) => {
    setSelectedAdditionalServices(prev => prev.filter(s => s.serviceId !== serviceId))
  }

  const handleUpdateServiceAmount = (serviceId: string, amount: number) => {
    setSelectedAdditionalServices(prev => 
      prev.map(s => s.serviceId === serviceId ? { ...s, amount } : s)
    )
  }

  const handleUpdateLocalServiceAmount = (serviceId: string, amount: number) => {
    setSelectedAdditionalServices(prev => 
      prev.map(s => s.serviceId === serviceId ? { ...s, amount } : s)
    )
  }

  const handleAddServiceWithAmount = () => {
    if (!currentServiceToAdd || currentServiceAmount <= 0) {
      toast({
        title: "Error",
        description: "Selecciona un servicio y especifica un importe válido",
        variant: "destructive"
      })
      return
    }

    const isAlreadySelected = selectedAdditionalServices.some(s => s.serviceId === currentServiceToAdd._id)
    if (isAlreadySelected) {
      toast({
        title: "Error",
        description: "Este servicio ya ha sido agregado",
        variant: "destructive"
      })
      return
    }

    setSelectedAdditionalServices(prev => [...prev, {
      serviceId: currentServiceToAdd._id,
      name: currentServiceToAdd.name,
      description: currentServiceToAdd.description,
      amount: currentServiceAmount
    }])

    // Limpiar el formulario
    setCurrentServiceToAdd(null)
    setCurrentServiceAmount(0)

    toast({
      title: "Servicio agregado",
      description: `${currentServiceToAdd.name} agregado con importe $${currentServiceAmount.toFixed(2)}`,
    })
  }

  const handleAddLocalService = (service: any) => {
    console.log('🔍 handleAddLocalService - Service to add:', service)
    console.log('🔍 handleAddLocalService - Current selectedAdditionalServices:', selectedAdditionalServices)
    
    const isAlreadySelected = selectedAdditionalServices.some(s => s.serviceId === service._id)
    console.log('🔍 handleAddLocalService - Is already selected:', isAlreadySelected)
    
    if (!isAlreadySelected) {
      const newLocalService = {
        serviceId: service._id,
        name: service.name,
        description: service.description,
        amount: service.price // Usar el precio predefinido del servicio
      }
      
      console.log('🔍 handleAddLocalService - New local service to add:', newLocalService)
      
      setSelectedAdditionalServices(prev => {
        const updated = [...prev, newLocalService]
        console.log('🔍 handleAddLocalService - Updated selectedAdditionalServices:', updated)
        return updated
      })

      toast({
        title: "Servicio local agregado",
        description: `${service.name} agregado con precio $${service.price.toFixed(2)}`,
      })
    }
  }

  // Función para generar PDF de la prefactura PTYSS
  const generatePTYSSPrefacturaPDF = (prefacturaData: any, selectedRecords: IndividualExcelRecord[]) => {
    console.log('🔍 generatePTYSSPrefacturaPDF - Starting PDF generation')
    console.log('🔍 generatePTYSSPrefacturaPDF - prefacturaData:', prefacturaData)
    console.log('🔍 generatePTYSSPrefacturaPDF - selectedRecords:', selectedRecords)
    console.log('🔍 generatePTYSSPrefacturaPDF - selectedAdditionalServices:', selectedAdditionalServices)
    const doc = new jsPDF()
    
    // Configuración de colores
    const primaryBlue = [15, 23, 42] // slate-900
    const lightBlue = [59, 130, 246] // blue-500
    const lightGray = [241, 245, 249] // slate-50
    
    // Logo de la empresa
    if (logoBase64) {
      doc.addImage(logoBase64, 'PNG', 15, 12, 35, 18)
    } else {
      doc.setFillColor(lightBlue[0], lightBlue[1], lightBlue[2])
      doc.rect(15, 15, 30, 15, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(12)
      doc.setFont(undefined, 'bold')
      doc.text('PTYSS', 30, 25, { align: 'center' })
    }
    
    // Número de prefactura y fecha
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(14)
    doc.setFont(undefined, 'bold')
    doc.text(`PREFACTURA No. ${prefacturaData.prefacturaNumber}`, 195, 20, { align: 'right' })
    
    // Fecha
    const currentDate = new Date()
    const day = currentDate.getDate().toString().padStart(2, '0')
    const month = (currentDate.getMonth() + 1).toString().padStart(2, '0')
    const year = currentDate.getFullYear()
    
    doc.setFontSize(10)
    doc.text('DATE:', 195, 30, { align: 'right' })
    doc.setFontSize(12)
    doc.text(`${day} ${month} ${year}`, 195, 35, { align: 'right' })
    doc.setFontSize(8)
    doc.text('DAY MO YR', 195, 40, { align: 'right' })
    
    // Información de la empresa (PTY SHIP SUPPLIERS, S.A.)
    doc.setFontSize(9)
    doc.setFont(undefined, 'bold')
    doc.text('PTY SHIP SUPPLIERS, S.A.', 15, 50)
    doc.setFontSize(8)
    doc.setFont(undefined, 'normal')
    doc.text('RUC: 155600922-2-2015 D.V. 69', 15, 54)
    doc.text('PANAMA PACIFICO, INTERNATIONAL BUSINESS PARK', 15, 58)
    doc.text('BUILDING 3855, FLOOR 2', 15, 62)
    doc.text('PANAMA, REPUBLICA DE PANAMA', 15, 66)
    doc.text('T. (507) 838-9806', 15, 70)
    doc.text('C. (507) 6349-1326', 15, 74)
    
    // Información del cliente
    doc.setFontSize(9)
    doc.setFont(undefined, 'bold')
    doc.text('CUSTOMER:', 15, 82)
    doc.setFontSize(8)
    doc.setFont(undefined, 'normal')
    
    // Extraer información del cliente del primer registro
    const firstRecord = selectedRecords[0]
    if (!firstRecord) {
      console.log('🔍 generatePTYSSPrefacturaPDF - No hay registros seleccionados')
      return doc
    }
    
    // Buscar el cliente usando la función mejorada
    const client = getRecordClient(firstRecord)
    
    console.log('🔍 generatePTYSSPrefacturaPDF - Primer registro:', firstRecord)
    console.log('🔍 generatePTYSSPrefacturaPDF - Cliente encontrado:', client)
    console.log('🔍 generatePTYSSPrefacturaPDF - Cliente address:', client?.address)
    console.log('🔍 generatePTYSSPrefacturaPDF - Cliente phone:', client?.phone)
    
    const clientName = client ? (client.type === "natural" ? client.fullName : client.companyName) : "Cliente PTYSS"
    const clientRuc = client ? (client.type === "natural" ? client.documentNumber : client.ruc) : "N/A"
    const clientAddress = client ? 
      (typeof client.address === "string" ? client.address : `${client.address?.district || ""}, ${client.address?.province || ""}`) 
      : "N/A"
    const clientPhone = client?.phone || "N/A"
    
    doc.text(clientName, 15, 86)
    doc.text(`RUC: ${clientRuc}`, 15, 90)
    doc.text(`ADDRESS: ${clientAddress}`, 15, 94)
    doc.text(`TELEPHONE: ${clientPhone}`, 15, 98)
    
    // Tabla de items
    const startY = 115
    const tableWidth = 180
    const tableX = 15
    
    doc.setFillColor(lightBlue[0], lightBlue[1], lightBlue[2])
    doc.rect(tableX, startY, tableWidth, 8, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(10)
    doc.setFont(undefined, 'bold')
    doc.text('QTY', 25, startY + 5)
    doc.text('DESCRIPTION', 60, startY + 5)
    doc.text('PRICE', 140, startY + 5)
    doc.text('TOTAL', 170, startY + 5)
    
    // Generar items de la prefactura agrupados (similar a trucking prefactura)
    const items: string[][] = []
    let itemIndex = 1
    
    // Agrupar registros por características similares (como en trucking)
    const groupedRecords = new Map<string, { records: any[], price: number, count: number }>()
    
    console.log("=== DEBUG: Agrupando registros PTYSS para PDF ===")
    console.log("Total registros seleccionados:", selectedRecords.length)
    
    selectedRecords.forEach((record, index) => {
      const data = record.data as Record<string, any>
      
      console.log(`🔍 DEBUG PDF - Registro ${index + 1}:`, {
        recordType: data.recordType,
        associate: data.associate,
        from: data.from,
        to: data.to,
        containerSize: data.containerSize,
        containerType: data.containerType,
        totalValue: record.totalValue,
        line: data.line,
        matchedPrice: data.matchedPrice
      })
      
      // Identificar registros de trasiego: tienen line, matchedPrice, y no tienen localRouteId
      const isTrasiego = data.line && data.matchedPrice && !data.localRouteId
      
      if (isTrasiego) {
        console.log(`🔍 DEBUG PDF - Procesando como TRASIEGO`)
        // Los registros de trasiego en PTYSS tienen estos campos:
        // - line: cliente original del Excel
        // - from/to: origen y destino
        // - size: tamaño del contenedor
        // - type: tipo de contenedor
        // - route: ruta/área
        // - matchedPrice: precio total
        const line = data.line || ''
        const from = data.from || ''
        const to = data.to || ''
        const size = data.size || ''
        const type = data.type || ''
        const route = data.route || ''
        const fe = data.fe ? (data.fe.toString().toUpperCase().trim() === 'F' ? 'FULL' : 'EMPTY') : 'FULL'
        const price = (data.matchedPrice || record.totalValue || 0)
        
        // Crear clave única para agrupar por características similares
        const groupKey = `TRASIEGO|${line}|${from}|${to}|${size}|${type}|${fe}|${route}|${price}`
        
        if (!groupedRecords.has(groupKey)) {
          groupedRecords.set(groupKey, {
            records: [],
            price: price,
            count: 0
          })
        }
        
        const group = groupedRecords.get(groupKey)!
        group.records.push(record)
        group.count += 1
      } else {
        console.log(`🔍 DEBUG PDF - Procesando como LOCAL`)
        // Para registros locales, agrupar por ruta local
        const localRouteId = data.localRouteId || ''
        const localRoutePrice = data.localRoutePrice || 0
        const containerSize = data.containerSize || ''
        const containerType = data.containerType || ''
        const from = data.from || ''
        const to = data.to || ''
        
        const groupKey = `LOCAL|${localRouteId}|${containerSize}|${containerType}|${from}|${to}|${localRoutePrice}`
        
        if (!groupedRecords.has(groupKey)) {
          groupedRecords.set(groupKey, {
            records: [],
            price: localRoutePrice,
            count: 0
          })
        }
        
        const group = groupedRecords.get(groupKey)!
        group.records.push(record)
        group.count += 1
      }
    })

    console.log("Grupos PTYSS creados:", groupedRecords.size)
    Array.from(groupedRecords.entries()).forEach(([key, group], index) => {
      const parts = key.split('|')
      console.log(`Grupo PTYSS ${index + 1}: ${parts[0]} - Cantidad: ${group.count} - Precio: $${group.price}`)
    })

    // Crear filas agrupadas para el PDF
    Array.from(groupedRecords.entries()).forEach(([groupKey, group]) => {
      const parts = groupKey.split('|')
      const totalPrice = group.price * group.count
      
      let description = ''
      if (parts[0] === 'LOCAL') {
        // Para registros locales: LOCAL - FROM/TO/SIZE/TYPE
        const [_, localRouteId, containerSize, containerType, from, to, price] = parts
        description = `LOCAL - ${from}/${to}/${containerSize}'${containerType}`
      } else if (parts[0] === 'TRASIEGO') {
        // Para registros de trasiego: ROUTE_AREA - FROM/TO/SIZE/TYPE/FE (CLIENTE)
        const [_, line, from, to, size, type, fe, route, price] = parts
        description = `${route} - ${from}/${to}/${size}'${type}/${fe} (${line})`
      } else {
        // Fallback para otros tipos
        description = `SERVICIO - ${parts.join('/')}`
      }
      
      items.push([
        group.count.toString(),
        description,
        `$${group.price.toFixed(2)}`,
        `$${totalPrice.toFixed(2)}`
      ])
    })
    
    // Agrupar servicios adicionales por tipo
    const groupedServices: { [key: string]: { total: number, count: number, name: string, unitPrice: number } } = {}
    
    selectedAdditionalServices.forEach((service) => {
      const serviceKey = service.name // Usar el nombre como clave para agrupar
      
      if (!groupedServices[serviceKey]) {
        groupedServices[serviceKey] = { 
          total: 0, 
          count: 0, 
          name: service.name, 
          unitPrice: service.amount 
        }
      }
      
      // Para servicios locales fijos, acumular por tipo
      if (service.isLocalService) {
        // FDA codes y otros servicios locales son montos manuales
        if (service.serviceId === 'FDA263' || service.serviceId === 'FDA047' || service.serviceId === 'FDA059' || service.serviceId === 'GENSET') {
          // Servicios FDA y Genset son montos manuales directos
          groupedServices[serviceKey].count += 1
          groupedServices[serviceKey].total += service.amount
          groupedServices[serviceKey].unitPrice = service.amount
        } else if (service.serviceId === 'PESAJE') {
          // Pesaje es un valor directo
          groupedServices[serviceKey].count += 1
          groupedServices[serviceKey].total += service.amount
          groupedServices[serviceKey].unitPrice = service.amount
        } else {
          // Otros servicios locales
          groupedServices[serviceKey].count += 1
          groupedServices[serviceKey].total += service.amount
          groupedServices[serviceKey].unitPrice = service.amount
        }
      } else {
        // Para servicios adicionales no locales, mantener como están
        groupedServices[serviceKey].count += 1
        groupedServices[serviceKey].total += service.amount
        groupedServices[serviceKey].unitPrice = service.amount
      }
    })
    
    // Agregar servicios agrupados a la tabla
    Object.entries(groupedServices).forEach(([serviceKey, serviceData]) => {
      items.push([
        serviceData.count.toString(),
        serviceData.name,
        `$${serviceData.unitPrice.toFixed(2)}`,
        `$${serviceData.total.toFixed(2)}`
      ])
      itemIndex++
    })

    console.log('🔍 PDF Generation - itemIndex after additional services:', itemIndex)
    console.log('🔍 PDF Generation - Final items array:', items)
    
    // Crear tabla con autoTable
    autoTable(doc, {
      startY: startY + 10,
      head: [],
      body: items,
      theme: 'plain',
      styles: {
        fontSize: 9,
        cellPadding: 4,
        lineWidth: 0.1,
        lineColor: [200, 200, 200],
      },
      columnStyles: {
        0: { cellWidth: 25, halign: 'center' },
        1: { cellWidth: 80, halign: 'left' },
        2: { cellWidth: 35, halign: 'right' },
        3: { cellWidth: 35, halign: 'right' }
      },
      margin: { left: tableX, right: 15 },
      tableWidth: tableWidth,
      alternateRowStyles: {
        fillColor: [248, 250, 252]
      }
    })
    
    // Totales
    const tableEndY = (doc as any).lastAutoTable.finalY + 5
    const finalY = tableEndY + 10
    const totalX = 120
    const amountX = 170
    // Mostrar solo el total, sin fondo
    doc.setFontSize(14)
    doc.setFont(undefined, 'bold')
    doc.setTextColor(0, 0, 0)
    doc.text('TOTAL:', totalX, finalY)
    doc.text(`$${grandTotal.toFixed(2)}`, amountX, finalY, { align: 'right' })
    
    // Notas adicionales de registros locales y prefactura (trasiego)
    let notesY = finalY + 15
    const pageHeight = doc.internal.pageSize.getHeight()
    
    // Recopilar todas las notas de los registros locales que tienen notas
    const notesFromRecords: string[] = []
    selectedRecords.forEach((record) => {
      const data = record.data as Record<string, any>
      // Solo incluir notas de registros locales que tengan notas no vacías
      if (data.recordType === 'local' && data.notes && data.notes.trim() !== '') {
        const note = data.notes.trim()
        // Evitar duplicados
        if (!notesFromRecords.includes(note)) {
          notesFromRecords.push(note)
        }
      }
    })
    
    // Agregar notas de la prefactura (para registros de trasiego) si existen
    if (prefacturaData.notes && prefacturaData.notes.trim() !== '') {
      const prefacturaNote = prefacturaData.notes.trim()
      // Evitar duplicados con las notas de registros locales
      if (!notesFromRecords.includes(prefacturaNote)) {
        notesFromRecords.push(prefacturaNote)
      }
    }
    
    // Mostrar notas si existen
    if (notesFromRecords.length > 0) {
      // Verificar si hay espacio suficiente, si no, agregar nueva página
      if (notesY + (notesFromRecords.length * 10) + 20 > pageHeight) {
        doc.addPage()
        notesY = 20
      }
      
      doc.setFontSize(9)
      doc.setFont(undefined, 'bold')
      doc.text('NOTAS ADICIONALES:', 15, notesY)
      notesY += 5
      
      doc.setFontSize(8)
      doc.setFont(undefined, 'normal')
      notesFromRecords.forEach((note) => {
        // Dividir notas largas en múltiples líneas
        const noteLines = doc.splitTextToSize(note, 180)
        noteLines.forEach((line: string) => {
          if (notesY + 5 > pageHeight) {
            doc.addPage()
            notesY = 20
          }
          doc.text(`• ${line}`, 15, notesY)
          notesY += 4
        })
        notesY += 2 // Espacio entre notas
      })
    }
    
    // Términos y condiciones
    let termsY = notesY + 5
    if (termsY + 35 > pageHeight) {
      doc.addPage()
      termsY = 20
    }
    doc.setFillColor(lightBlue[0], lightBlue[1], lightBlue[2])
    doc.rect(15, termsY, 180, 5, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(9)
    doc.setFont(undefined, 'bold')
    doc.text('TERMS AND CONDITIONS', 20, termsY + 3)
    
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(8)
    doc.setFont(undefined, 'normal')
    doc.text('Make check payments payable to: PTY SHIP SUPPLIERS, S.A.', 15, termsY + 10)
    doc.text('Money transfer to: Banco General - Checking Account', 15, termsY + 13)
    doc.text('Account No. 03-72-01-124081-1', 15, termsY + 16)
    
    // Confirmación
    const confirmY = termsY + 22
    doc.setFontSize(8)
    doc.text('I Confirmed that I have received the original prefactura and documents.', 15, confirmY)
    doc.text('Received by: ___________        Date: ___________', 15, confirmY + 4)
    
    return new Blob([doc.output('blob')], { type: 'application/pdf' })
  }

  const handlePreviewPDF = () => {
    if (selectedRecords.length === 0) {
      toast({
        title: "Error",
        description: "Debes seleccionar al menos un registro para previsualizar la prefactura",
        variant: "destructive"
      })
      return
    }

    if (!prefacturaData.prefacturaNumber) {
      toast({
        title: "Error",
        description: "Completa el número de prefactura",
        variant: "destructive"
      })
      return
    }

    try {
      // Generar PDF de previsualización
      const pdfBlob = generatePTYSSPrefacturaPDF(prefacturaData, selectedRecords)
      if (pdfBlob instanceof Blob) {
      setPreviewPdf(pdfBlob)
      }
      setIsPreviewOpen(true)
    } catch (error) {
      console.error("Error al generar previsualización:", error)
      toast({
        title: "Error",
        description: "Hubo un problema al generar la previsualización",
        variant: "destructive"
      })
    }
  }

  // Función para generar PDF en tiempo real
  const generateRealtimePDF = () => {
    if (!prefacturaData.prefacturaNumber || selectedRecords.length === 0) {
      // Limpiar URL si no hay datos válidos
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl)
        setPdfUrl(null)
      }
      return
    }

    // Evitar generaciones simultáneas
    if (isGeneratingPDF) {
      return
    }

    setIsGeneratingPDF(true)

    try {
      // Limpiar URL anterior si existe
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl)
      }
      
      const pdfBlob = generatePTYSSPrefacturaPDF(prefacturaData, selectedRecords)
      if (pdfBlob instanceof Blob) {
      const url = URL.createObjectURL(pdfBlob)
      setPdfUrl(url)
      }
    } catch (error) {
      console.error("Error al generar PDF en tiempo real:", error)
      // Limpiar URL en caso de error
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl)
        setPdfUrl(null)
      }
    } finally {
      setIsGeneratingPDF(false)
    }
  }

  // Generar PDF en tiempo real cuando cambien los datos
  useEffect(() => {
    if (currentStep === 2 && prefacturaData.prefacturaNumber && selectedRecords.length > 0) {
      // Usar setTimeout para evitar bucles infinitos
      const timeoutId = setTimeout(() => {
        generateRealtimePDF()
      }, 500) // Delay de 500ms para evitar actualizaciones excesivas
      
      return () => clearTimeout(timeoutId)
    }
  }, [prefacturaData.prefacturaNumber, selectedRecords.length, selectedAdditionalServices.length, currentStep])

  // Cargar clientes cuando se necesiten para el PDF
  useEffect(() => {
    if (currentStep === 2 && selectedRecords.length > 0 && clients.length === 0) {
      console.log('🔍 Cargando clientes para PDF...')
      dispatch(fetchClients())
    }
  }, [currentStep, selectedRecords.length, clients.length, dispatch])

  // Limpiar URL del PDF cuando se desmonte el componente
  useEffect(() => {
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl)
      }
    }
  }, [pdfUrl])

  const handleDownloadPDF = () => {
    if (generatedPdf) {
      saveAs(generatedPdf, `${prefacturaData.prefacturaNumber}.pdf`)
      toast({ 
        title: "PDF Descargado", 
        description: "El archivo PDF ha sido descargado exitosamente." 
      })
    } else {
      toast({ 
        title: "Error", 
        description: "No hay PDF generado para descargar.", 
        variant: "destructive" 
      })
    }
  }

  const handleCreatePrefactura = async () => {
    if (selectedRecords.length === 0) {
      toast({
        title: "Error",
        description: "Debes seleccionar al menos un registro para crear la prefactura",
        variant: "destructive"
      })
      return
    }

    if (!prefacturaData.prefacturaNumber) {
      toast({
        title: "Error",
        description: "Completa el número de prefactura",
        variant: "destructive"
      })
      return
    }

    try {
      // Extraer información del cliente del primer registro
      const firstRecord = selectedRecords[0]
      if (!firstRecord) {
        toast({
          title: "Error",
          description: "No se encontró el registro seleccionado",
          variant: "destructive"
        })
        return
      }
      
      // Buscar el cliente usando la función mejorada
      const client = getRecordClient(firstRecord)
      
      if (!client) {
        toast({
          title: "Error",
          description: "No se encontró el cliente asociado al registro. Verifica que el cliente exista en la base de datos.",
          variant: "destructive"
        })
        return
      }
      
      const clientName = client.type === "natural" ? client.fullName : client.companyName
      const clientRuc = client.type === "natural" ? client.documentNumber : client.ruc
      const clientAddress = client.type === "natural" ? 
        (typeof client.address === "string" ? client.address : `${client.address?.district || ""}, ${client.address?.province || ""}`) :
        (typeof client.fiscalAddress === "string" ? client.fiscalAddress : `${client.fiscalAddress?.district || ""}, ${client.fiscalAddress?.province || ""}`)
      const clientPhone = client.phone || ""
      
      // Crear la prefactura con los registros seleccionados
      const newPrefactura: PersistedInvoiceRecord = {
        id: `PTY-PRE-${Date.now().toString().slice(-6)}`,
        module: "ptyss",
        invoiceNumber: prefacturaData.prefacturaNumber,
        clientName: clientName,
        clientRuc: clientRuc,
        clientSapNumber: client.sapCode || '',
        issueDate: new Date().toISOString().split("T")[0],
        dueDate: new Date().toISOString().split("T")[0],
        currency: "USD",
        subtotal: grandTotal,
        taxAmount: 0,
        totalAmount: grandTotal,
        status: "prefactura",
        relatedRecordIds: selectedRecords.map((r: IndividualExcelRecord) => getRecordId(r)),
        notes: prefacturaData.notes,
        details: {
          // Detalles específicos de PTYSS
          operationType: "maritime",
          containerCount: selectedRecords.length,
          totalContainers: selectedRecords.length,
          clientAddress: clientAddress,
          clientPhone: clientPhone,
          additionalServices: selectedAdditionalServices,
        },
        createdAt: new Date().toISOString(),
      }
      
      const response = await dispatch(createInvoiceAsync(newPrefactura))

      console.log("Respuesta completa de createInvoiceAsync:", response)
      console.log("response.payload:", response.payload)
      console.log("response.payload?.id:", response.payload?.id)

      if (createInvoiceAsync.fulfilled.match(response)) {
        console.log("✅ createInvoiceAsync fulfilled")
        console.log("ID de la factura creada:", response.payload.id)
        
        console.log("🔍 PTYSSPrefactura - Marcando registros como prefacturados en backend...")
        console.log("🔍 PTYSSPrefactura - Registros a marcar:", selectedRecords.map((r: IndividualExcelRecord) => getRecordId(r)))
        
        // Usar la nueva acción async que actualiza la base de datos
        await dispatch(updateMultipleRecordsStatusAsync({ 
          recordIds: selectedRecords.map((r: IndividualExcelRecord) => getRecordId(r)), 
          status: "prefacturado",
          invoiceId: response.payload.id 
        })).unwrap()
        
        console.log("🔍 PTYSSPrefactura - Registros marcados como prefacturados en backend")
        
        // Refrescar todos los registros PTYSS para actualizar el historial
        console.log("🔍 PTYSSPrefactura - Refrescando todos los registros PTYSS...")
        dispatch(fetchRecordsByModule("ptyss"))
        dispatch(fetchPendingRecordsByModule("ptyss"))

        // Usar el PDF de previsualización si existe, sino generar uno nuevo
        if (previewPdf) {
          setGeneratedPdf(previewPdf)
        } else {
          const pdfBlob = generatePTYSSPrefacturaPDF(prefacturaData, selectedRecords)
          if (pdfBlob instanceof Blob) {
          setGeneratedPdf(pdfBlob)
          }
        }

        toast({
          title: "Prefactura creada",
          description: `Prefactura ${prefacturaData.prefacturaNumber} creada con ${selectedRecords.length} registros. PDF generado.`,
        })

        // Cerrar previsualización y resetear
        setIsPreviewOpen(false)
        setPreviewPdf(null)

        // Resetear el formulario y volver al paso 1
        setSelectedRecordIds([])
        setPrefacturaData({
          prefacturaNumber: `PTY-PRE-${Date.now().toString().slice(-5)}`,
          notes: ""
        })
        setSelectedAdditionalServices([])
        setCurrentStep(1)
      } else {
        toast({
          title: "Error al crear prefactura",
          description: "Hubo un problema al crear la prefactura en el servidor.",
          variant: "destructive"
        })
        console.error("Error al crear prefactura:", response.error)
      }
    } catch (error) {
      console.error("Error al crear prefactura:", error)
      toast({
        title: "Error",
        description: "Hubo un problema al crear la prefactura",
        variant: "destructive"
      })
    }
  }

  // Función para formatear fechas correctamente (evitar problema de zona horaria)
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A'

    let year: number, month: number, day: number

    // Si la fecha está en formato YYYY-MM-DD, crear la fecha en zona horaria local
    if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
      [year, month, day] = dateString.split('-').map(Number)
    }
    // Si la fecha está en formato ISO con zona horaria UTC (ej: 2025-09-09T00:00:00.000+00:00)
    // Extraer solo la parte de la fecha y crear un objeto Date en zona horaria local
    else if (dateString.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)) {
      const datePart = dateString.split('T')[0] // Obtener solo YYYY-MM-DD
      ;[year, month, day] = datePart.split('-').map(Number)
    }
    // Para otros formatos, usar el método normal
    else {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return 'N/A'
      year = date.getFullYear()
      month = date.getMonth() + 1
      day = date.getDate()
    }

    // Year validation to prevent year 40000 issue
    if (year < 1900 || year > 2100) return 'N/A'

    const date = new Date(year, month - 1, day)
    return date.toLocaleDateString('es-ES')
  }

  // Función para formatear fecha y hora
  const formatDateTime = (dateString: string) => {
    if (!dateString) return { date: 'N/A', time: 'N/A' }
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return { date: 'N/A', time: 'N/A' }
    const year = date.getFullYear()
    // Year validation to prevent year 40000 issue
    if (year < 1900 || year > 2100) return { date: 'N/A', time: 'N/A' }
    return {
      date: date.toLocaleDateString('es-ES'),
      time: date.toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
    }
  }

  // Funciones para filtrar por períodos específicos
  const getTodayDates = () => {
    const today = new Date()
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999)
    
    return {
      start: startOfDay.toISOString().split('T')[0],
      end: endOfDay.toISOString().split('T')[0]
    }
  }

  const getCurrentWeekDates = () => {
    const today = new Date()
    const dayOfWeek = today.getDay()
    const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1) // Ajuste para que la semana empiece en lunes
    
    const startOfWeek = new Date(today.setDate(diff))
    startOfWeek.setHours(0, 0, 0, 0)
    
    const endOfWeek = new Date(startOfWeek)
    endOfWeek.setDate(startOfWeek.getDate() + 6)
    endOfWeek.setHours(23, 59, 59, 999)
    
    return {
      start: startOfWeek.toISOString().split('T')[0],
      end: endOfWeek.toISOString().split('T')[0]
    }
  }

  const getCurrentMonthDates = () => {
    const today = new Date()
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999)
    
    return {
      start: startOfMonth.toISOString().split('T')[0],
      end: endOfMonth.toISOString().split('T')[0]
    }
  }

  const handleFilterByPeriod = (period: 'today' | 'week' | 'month' | 'advanced') => {
    // Si el filtro ya está activo, desactivarlo
    if (activePeriodFilter === period) {
      setIsUsingPeriodFilter(false)
      setActivePeriodFilter("none")
      setStartDate("")
      setEndDate("")
      setSelectedRecordIds([])
      return
    }
    
    // Activar el filtro de período y establecer las fechas
    setIsUsingPeriodFilter(true)
    setActivePeriodFilter(period)
    
    switch (period) {
      case 'today':
        const todayDates = getTodayDates()
        setStartDate(todayDates.start)
        setEndDate(todayDates.end)
        break
      case 'week':
        const weekDates = getCurrentWeekDates()
        setStartDate(weekDates.start)
        setEndDate(weekDates.end)
        break
      case 'month':
        const monthDates = getCurrentMonthDates()
        setStartDate(monthDates.start)
        setEndDate(monthDates.end)
        break
      case 'advanced':
        // Para avanzado, abrir el modal de selección de fechas
        setIsDateModalOpen(true)
        break
    }
    
    setSelectedRecordIds([])
  }

  const handleApplyDateFilter = (start: string, end: string) => {
    setStartDate(start)
    setEndDate(end)
    setIsUsingPeriodFilter(true)
    setActivePeriodFilter("advanced")
    setIsDateModalOpen(false)
    setSelectedRecordIds([])
  }

  const handleCancelDateFilter = () => {
    setIsDateModalOpen(false)
    // Si no hay fechas establecidas, desactivar el filtro avanzado
    if (!startDate || !endDate) {
      setIsUsingPeriodFilter(false)
      setActivePeriodFilter("none")
    } else {
      // Si hay fechas pero se cancela, mantener el filtro avanzado activo
      setActivePeriodFilter("advanced")
    }
  }

  // Función para obtener el texto del período activo
  const getActivePeriodText = () => {
    if (!isUsingPeriodFilter || activePeriodFilter === "advanced") return null
    
    if (startDate === endDate) {
      return "Hoy"
    }
    
    const start = new Date(startDate)
    const end = new Date(endDate)
    const today = new Date()
    
    // Verificar si es la semana actual
    const weekDates = getCurrentWeekDates()
    if (startDate === weekDates.start && endDate === weekDates.end) {
      return "Semana en curso"
    }
    
    // Verificar si es el mes actual
    const monthDates = getCurrentMonthDates()
    if (startDate === monthDates.start && endDate === monthDates.end) {
      return "Mes en curso"
    }
    
    return "Período personalizado"
  }

  const isAllSelected = filteredRecords.length > 0 && selectedRecordIds.length === filteredRecords.length
  const isIndeterminate = selectedRecordIds.length > 0 && selectedRecordIds.length < filteredRecords.length

  return (
    <div className="space-y-4 bg-gradient-to-br from-slate-50 to-blue-50 min-h-screen p-4">

      {/* Paso 1: Selección de Registros */}
      {currentStep === 1 && (
        <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl">
          <CardHeader className="bg-gradient-to-r from-slate-700 to-slate-800 text-white rounded-t-lg">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <Ship className="h-6 w-6" />
                </div>
                <div>
                  <div className="text-xl font-bold">Paso 1: Selección de Registros</div>
                  {ptyssRecords.length > 0 && (
                    <Badge variant="secondary" className="mt-1 bg-white/20 text-white border-white/30">
                      {ptyssRecords.length} disponibles
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-sm text-slate-200">
                  {selectedRecordIds.length} de {filteredRecords.length} seleccionados
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setSelectedRecordIds([])}
                  disabled={selectedRecordIds.length === 0}
                  className="bg-white/20 hover:bg-white/30 text-white border-white/30"
                >
                  Limpiar Selección
                </Button>
                {isAdmin && (
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={selectedRecordIds.length === 0}
                    onClick={() => setShowBulkDeleteDialog(true)}
                    className="bg-red-600/90 hover:bg-red-700/90 border-red-500/50 text-white"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Eliminar Seleccionados ({selectedRecordIds.length})
                  </Button>
                )}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Información del total de registros */}
            <div className="mb-4 mt-4 bg-gradient-to-r from-slate-100 to-blue-100 border border-slate-300 p-4 rounded-lg shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-600 rounded-lg">
                  <Database className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1">
                  <span className="text-sm font-semibold text-slate-900">
                    Total de registros en la base de datos: {ptyssRecords.length}
                  </span>
                  {(searchTerm || recordTypeFilter !== "all" || statusFilter !== "all" || startDate || endDate) && (
                    <div className="mt-1 text-sm text-slate-700">
                      Mostrando {filteredRecords.length} registros filtrados
                    </div>
                  )}
                </div>
                <div className="flex gap-4 text-xs">
                  <div className="bg-white/60 px-3 py-1 rounded-md">
                    <span className="font-medium text-slate-600">Locales Completados:</span>
                    <span className="ml-1 font-bold text-slate-900">
                      {ptyssRecords.filter((r: IndividualExcelRecord) => getRecordType(r) === "local" && r.status === "completado" && !r.invoiceId).length}
                    </span>
                  </div>
                  <div className="bg-white/60 px-3 py-1 rounded-md">
                    <span className="font-medium text-slate-600">Trasiego:</span>
                    <span className="ml-1 font-bold text-slate-900">
                      {ptyssRecords.filter((r: IndividualExcelRecord) => getRecordType(r) === "trasiego" && !r.invoiceId).length}
                    </span>
                  </div>
                  <div className="bg-white/60 px-3 py-1 rounded-md">
                    <span className="font-medium text-slate-600">Prefacturados:</span>
                    <span className="ml-1 font-bold text-slate-900">
                      {ptyssRecords.filter((r: IndividualExcelRecord) => r.invoiceId).length}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Búsqueda y Filtros */}
            <div className="mb-6 mt-4 space-y-4">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Buscar por contenedor, cliente o orden..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
              
              {/* Filtros */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Filtro por tipo de registro */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-slate-700">Filtrar por tipo:</Label>
                  <div className="flex gap-2">
                    <Button
                      variant={recordTypeFilter === "all" ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        setRecordTypeFilter("all")
                        setSelectedRecordIds([])
                      }}
                      className="text-xs"
                    >
                      Todos
                    </Button>
                    <Button
                      variant={recordTypeFilter === "local" ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        setRecordTypeFilter("local")
                        setSelectedRecordIds([])
                      }}
                      className="text-xs"
                    >
                      Locales
                    </Button>
                    <Button
                      variant={recordTypeFilter === "trasiego" ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        setRecordTypeFilter("trasiego")
                        setSelectedRecordIds([])
                      }}
                      className="text-xs"
                    >
                      Trasiego
                    </Button>
                  </div>
                  
                  {/* Botón para limpiar todos los filtros - movido aquí para optimizar espacio */}
                  {(recordTypeFilter !== "all" || searchTerm || startDate || endDate) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setRecordTypeFilter("all")
                        setDateFilter("createdAt")
                        setSearchTerm("")
                        setStartDate("")
                        setEndDate("")
                        setIsUsingPeriodFilter(false)
                        setActivePeriodFilter("none")
                        setSelectedRecordIds([])
                      }}
                      className="text-xs text-slate-600 hover:text-slate-700 mt-2"
                    >
                      🗑️ Limpiar todos los filtros
                    </Button>
                  )}
                </div>

                {/* Filtro por fecha */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-slate-700">Filtrar por fecha:</Label>
                  <div className="flex flex-col sm:flex-row gap-3">
                    {/* Botones de tipo de fecha */}
                    <div className="flex gap-1">
                      <Button
                        variant={dateFilter === "createdAt" ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          setDateFilter("createdAt")
                          setIsUsingPeriodFilter(false)
                          setActivePeriodFilter("none")
                          setSelectedRecordIds([])
                        }}
                        className="text-xs h-8 px-3"
                      >
                        Creación
                      </Button>
                      <Button
                        variant={dateFilter === "moveDate" ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          setDateFilter("moveDate")
                          setIsUsingPeriodFilter(false)
                          setActivePeriodFilter("none")
                          setSelectedRecordIds([])
                        }}
                        className="text-xs h-8 px-3"
                      >
                        Movimiento
                      </Button>
                    </div>
                    
                    {/* Separador visual */}
                    <div className="hidden sm:block w-px h-6 bg-gray-300 mx-2 self-center"></div>
                    
                    {/* Botones de períodos rápidos */}
                    <div className="flex gap-1 flex-wrap">
                      <Button
                        variant={activePeriodFilter === "today" ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleFilterByPeriod('today')}
                        className="text-xs h-8 px-2"
                      >
                        Hoy
                      </Button>
                      <Button
                        variant={activePeriodFilter === "week" ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleFilterByPeriod('week')}
                        className="text-xs h-8 px-2"
                      >
                        Semana
                      </Button>
                      <Button
                        variant={activePeriodFilter === "month" ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleFilterByPeriod('month')}
                        className="text-xs h-8 px-2"
                      >
                        Mes
                      </Button>
                      <Button
                        variant={activePeriodFilter === "advanced" ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleFilterByPeriod('advanced')}
                        className="text-xs h-8 px-2"
                      >
                        Avanzado
                      </Button>
                    </div>
                  </div>
                  
                  {/* Indicadores de período - movidos fuera del contenedor de botones */}
                  <div className="mt-2">
                    {/* Indicador de período activo */}
                    {isUsingPeriodFilter && activePeriodFilter !== "advanced" && (
                      <div className="flex items-center gap-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
                        <Badge variant="default" className="bg-blue-600 text-white text-xs">
                          {getActivePeriodText()}
                        </Badge>
                        <span className="text-sm text-blue-700">
                          {startDate} - {endDate}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setIsUsingPeriodFilter(false)
                            setActivePeriodFilter("none")
                            setStartDate("")
                            setEndDate("")
                            setDateFilter("createdAt")
                          }}
                          className="h-6 w-6 p-0 ml-auto"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    )}

                    {/* Indicador de filtro avanzado */}
                    {activePeriodFilter === "advanced" && startDate && endDate && (
                      <div className="flex items-center gap-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
                        <Badge variant="default" className="bg-blue-600 text-white text-xs">
                          Filtro Avanzado
                        </Badge>
                        <span className="text-sm text-blue-700">
                          {startDate} - {endDate}
                        </span>
                        <div className="flex gap-1 ml-auto">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setIsDateModalOpen(true)}
                            className="h-6 w-6 p-0"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setIsUsingPeriodFilter(false)
                              setActivePeriodFilter("none")
                              setStartDate("")
                              setEndDate("")
                              setDateFilter("createdAt")
                            }}
                            className="h-6 w-6 p-0"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Información de selección múltiple */}
            {selectedRecordIds.length > 0 && (
              <div className="mb-4 bg-gradient-to-r from-blue-100 to-indigo-100 border border-blue-300 p-4 rounded-lg shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-blue-600 rounded-md">
                      <CheckCircle className="h-4 w-4 text-white" />
                    </div>
                    <h3 className="font-semibold text-blue-900 text-sm">Reglas de selección múltiple</h3>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowSelectionRules(!showSelectionRules)}
                    className="h-6 w-6 p-0 text-blue-700 hover:text-blue-900 hover:bg-blue-200"
                  >
                    {showSelectionRules ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                {showSelectionRules && (
                  <div className="text-xs text-blue-800 space-y-1 mt-3">
                    <p>• Solo puedes seleccionar registros con estado <strong>completado</strong></p>
                    <p>• Todos los registros deben ser del <strong>mismo cliente</strong></p>
                    <p>• Todos los registros deben ser del <strong>mismo tipo</strong> (local o trasiego)</p>
                    <p>• Los registros no seleccionables aparecen con opacidad reducida</p>
                  </div>
                )}
              </div>
            )}





            {isLoadingRecords ? (
              <div className="flex justify-center items-center p-12 bg-gradient-to-r from-slate-50 to-blue-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Loader2 className="h-10 w-10 animate-spin text-slate-600" />
                  <span className="text-lg font-medium text-slate-800">Cargando registros...</span>
                </div>
              </div>
            ) : filteredRecords.length > 0 ? (
              <div className="border border-slate-200 rounded-lg shadow-sm overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gradient-to-r from-slate-50 to-blue-50">
                      <TableHead className="w-12 py-3 px-3 font-semibold text-gray-700">
                        <Checkbox
                          checked={isAllSelected}
                          onCheckedChange={handleSelectAll}
                        />
                      </TableHead>
                      <TableHead className="py-3 px-3 text-sm font-semibold text-gray-700">Contenedor</TableHead>
                      <TableHead className="py-3 px-3 text-sm font-semibold text-gray-700">Fecha Movimiento</TableHead>
                      <TableHead className="py-3 px-3 text-sm font-semibold text-gray-700">Tipo</TableHead>
                      <TableHead>
                        <div className="flex items-center justify-between relative" data-client-filter>
                          <span className="text-sm font-semibold text-gray-700">Cliente</span>
                          <div className="flex items-center gap-1">
                            {clientFilter !== 'all' && (
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => setClientFilter('all')}
                                className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                title="Limpiar filtro"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            )}
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => setShowClientFilter(!showClientFilter)}
                              className={`h-6 w-6 p-0 ${clientFilter !== 'all' ? 'text-blue-600' : 'text-gray-500'}`}
                              title="Filtrar por cliente"
                            >
                              <Filter className="h-3 w-3" />
                            </Button>
                          </div>
                          {showClientFilter && (
                            <div className="absolute top-full right-0 mt-1 z-50 bg-white border border-gray-200 rounded-md shadow-lg p-3 min-w-64">
                              <div className="space-y-2">
                                <div className="text-xs font-medium text-gray-700 mb-2">Filtrar por cliente:</div>
                                <div className="max-h-48 overflow-y-auto space-y-1">
                                  <div 
                                    className={`px-2 py-1 text-xs cursor-pointer rounded hover:bg-gray-100 ${clientFilter === 'all' ? 'bg-blue-100 text-blue-800 font-medium' : ''}`}
                                    onClick={() => {
                                      setClientFilter('all')
                                      setShowClientFilter(false)
                                    }}
                                  >
                                    Todos los clientes
                                  </div>
                                  {uniqueClients.map((clientName) => (
                                    <div 
                                      key={clientName}
                                      className={`px-2 py-1 text-xs cursor-pointer rounded hover:bg-gray-100 ${clientFilter === clientName ? 'bg-blue-100 text-blue-800 font-medium' : ''}`}
                                      onClick={() => {
                                        setClientFilter(clientName)
                                        setShowClientFilter(false)
                                      }}
                                    >
                                      {clientName}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </TableHead>
                      <TableHead className="py-3 px-3 text-sm font-semibold text-gray-700">Orden</TableHead>
                      <TableHead className="py-3 px-3 text-sm font-semibold text-gray-700">
                        {recordTypeFilter === "trasiego" ? "Subcliente" : "Ruta"}
                      </TableHead>
                      <TableHead className="w-12 py-3 px-3 text-sm font-semibold text-gray-700">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedRecords.map((record: IndividualExcelRecord) => {
                      const data = record.data as Record<string, any>
                      const { date, time } = formatDateTime(record.createdAt)
                      const recordId = getRecordId(record)
                      const isSelected = selectedRecordIds.includes(recordId)
                      
                      // Debug: Log detallado para registros de trasiego
                      if (getRecordType(record) === "trasiego") {
                        console.log("🔍 REGISTRO TRASIEGO DETALLADO:")
                        console.log("  Record completo:", record)
                        console.log("  Data:", data)
                        console.log("  containerSize:", data.containerSize)
                        console.log("  containerType:", data.containerType)
                        console.log("  size:", data.size)
                        console.log("  type:", data.type)
                        console.log("  container:", data.container)
                        console.log("  containerConsecutive:", data.containerConsecutive)
                        console.log("  leg:", data.leg)
                        console.log("  moveType:", data.moveType)
                        console.log("  associate:", data.associate)
                        console.log("  from:", data.from)
                        console.log("  to:", data.to)
                        console.log("  naviera:", data.naviera)
                        console.log("  order:", data.order)
                        console.log("  clientId:", data.clientId)
                        console.log("  operationType:", data.operationType)
                        console.log("  moveDate:", data.moveDate)
                        console.log("  conductor:", data.conductor)
                        console.log("  plate:", data.plate)
                        console.log("  driverName:", data.driverName)
                        console.log("  route:", data.route)
                        console.log("  pol:", data.pol)
                        console.log("  pod:", data.pod)
                        console.log("  matchedPrice:", data.matchedPrice)
                        console.log("  matchedRouteId:", data.matchedRouteId)
                        console.log("  matchedRouteName:", data.matchedRouteName)
                        console.log("  isMatched:", data.isMatched)
                        console.log("  sapCode:", data.sapCode)
                        console.log("  line:", data.line)
                        console.log("  totalValue:", record.totalValue)
                        console.log("  =================================")
                      }
                      
                      return (
                        <TableRow 
                          key={recordId}
                          className={`${isSelected ? "bg-blue-50" : ""} ${selectedRecordIds.length > 0 && !canSelectRecord(record) && !isSelected ? "opacity-50" : ""}`}
                        >
                          <TableCell className="py-2 px-3">
                            <Checkbox
                              checked={isSelected}
                              disabled={selectedRecordIds.length > 0 && !canSelectRecord(record) && !isSelected}
                              onCheckedChange={(checked) => handleRecordSelection(recordId, checked as boolean)}
                            />
                          </TableCell>
                          <TableCell className="font-medium py-2 px-3">
                            <div className="space-y-0.5">
                              <div className="text-sm">{data.container || "N/A"}</div>
                              <div className="text-xs text-muted-foreground">
                                {(() => {
                                  // Para registros de trasiego, usar size y type del Excel
                                  if (getRecordType(record) === "trasiego") {
                                    const size = data.size || data.containerSize || "N/A"
                                    const type = data.type || data.containerType || "N/A"
                                    return `${size}' ${type}`
                                  }
                                  // Para registros locales, usar containerSize y containerType
                                  const size = data.containerSize || "N/A"
                                  const type = data.containerType || "N/A"
                                  return `${size}' ${type}`
                                })()}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="py-2 px-3">
                            <div className="text-sm">
                              {formatDate(data.moveDate)}
                            </div>
                          </TableCell>
                          <TableCell className="py-2 px-3">
                            <Badge 
                              variant={getRecordType(record) === "local" ? "default" : "secondary"}
                              className="text-xs"
                            >
                              {getRecordType(record) === "local" ? "Local" : "Trasiego"}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-2 px-3">
                            <div className="text-sm">
                              {(() => {
                                // Usar getRecordClient para obtener el cliente correcto (tanto trasiego como locales)
                                const client = getRecordClient(record)
                                return client ? (client.type === "natural" ? client.fullName : client.companyName) : "N/A"
                              })()}
                            </div>
                          </TableCell>
                          <TableCell className="py-2 px-3 text-sm">
                            {getRecordType(record) === "trasiego" 
                              ? getContainerConsecutive(record)
                              : (data.order || "N/A")
                            }
                          </TableCell>
                          <TableCell className="py-2 px-3">
                            <div className="space-y-0.5">
                              <div className="font-medium text-sm">
                                {(() => {
                                  // Para registros de trasiego, usar from y to extraídos del leg
                                  if (getRecordType(record) === "trasiego") {
                                    const from = data.from || data.pol || "N/A"
                                    const to = data.to || data.pod || "N/A"
                                    return `${from} → ${to}`
                                  }
                                  // Para registros locales, usar from y to
                                  return `${data.from || "N/A"} → ${data.to || "N/A"}`
                                })()}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {(() => {
                                  // Para registros de trasiego, usar line como subcliente
                                  if (getRecordType(record) === "trasiego") {
                                    return data.line || "N/A"
                                  }
                                  // Para registros locales, buscar el nombre de la naviera por ID
                                  const naviera = navieras.find(n => n._id === data.naviera)
                                  return naviera ? `${naviera.name} (${naviera.code})` : "N/A"
                                })()}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="py-2 px-3">
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleViewRecord(record)}
                                className="h-8 w-8 p-0"
                              >
                                {getRecordType(record) === "trasiego" ? (
                                  <Eye className="h-4 w-4" />
                                ) : (
                                  <Edit className="h-4 w-4" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteRecord(record)}
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
                
                {/* Controles de paginación */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-6 px-4 py-3 bg-slate-50 border-t">
                    <div className="text-sm text-slate-600">
                      Mostrando {((currentPage - 1) * recordsPerPage) + 1} a {Math.min(currentPage * recordsPerPage, filteredRecords.length)} de {filteredRecords.length} registros
                    </div>
                    <div className="flex gap-2 items-center">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                        disabled={currentPage === 1}
                      >
                        Anterior
                      </Button>
                      <span className="text-xs mx-2 text-slate-600">
                        Página {currentPage} de {totalPages}
                      </span>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
                        disabled={currentPage === totalPages}
                      >
                        Siguiente
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                {ptyssRecords.length === 0 
                  ? "No hay registros PTYSS disponibles para prefacturar"
                  : "No se encontraron registros que coincidan con la búsqueda"
                }
              </div>
            )}

            {/* Nota informativa al final del paso 1 */}
            <div className="mt-6 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 p-3 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="p-1 bg-green-600 rounded-md">
                  <CheckCircle className="h-4 w-4 text-white" />
                </div>
                <div className="text-sm text-green-800">
                  <strong>Nota:</strong> Solo se muestran registros disponibles para prefacturar. Los registros que ya han sido prefacturados no aparecen en esta lista para evitar facturación duplicada.
                </div>
              </div>
            </div>

            {/* Botón para continuar al siguiente paso */}
            <div className="flex justify-end mt-8">
              <Button 
                onClick={handleNextStep}
                disabled={selectedRecords.length === 0}
                className="bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white font-semibold px-8 py-3 rounded-lg shadow-lg transform transition-all duration-200 hover:scale-105"
              >
                Continuar al Paso 2
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Paso 2: Configuración de Prefactura */}
      {currentStep === 2 && (
        <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl">
          <CardHeader className="bg-gradient-to-r from-slate-700 to-slate-800 text-white rounded-t-lg">
            <CardTitle className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <FileText className="h-6 w-6" />
              </div>
              <div className="text-xl font-bold">Paso 2: Configuración de Prefactura</div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Resumen de registros seleccionados */}
            <div className="bg-gradient-to-r from-slate-100 to-blue-100 border border-slate-300 p-3 rounded-lg shadow-sm mt-2">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 bg-slate-600 rounded-md">
                  <CheckCircle className="h-4 w-4 text-white" />
                </div>
                <h3 className="font-semibold text-slate-900 text-base">Resumen de Registros Seleccionados</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="bg-white/60 p-2 rounded-md">
                  <span className="text-slate-600 font-medium text-xs">Cantidad:</span> 
                  <div className="text-sm font-semibold text-slate-900">{selectedRecords.length} registro{selectedRecords.length !== 1 ? 's' : ''}</div>
                </div>
                <div className="bg-white/60 p-2 rounded-md">
                  <span className="text-slate-600 font-medium text-xs">Total:</span> 
                  <div className="text-sm font-semibold text-slate-900">${grandTotal.toFixed(2)}</div>
                </div>
                <div className="bg-white/60 p-2 rounded-md">
                  <span className="text-slate-600 font-medium text-xs">Cliente:</span> 
                  <div className="text-sm font-semibold text-slate-900">{
                    (() => {
                      const firstRecord = selectedRecords[0]
                      if (!firstRecord) return "N/A"
                      
                      const client = getRecordClient(firstRecord)
                      return client ? (client.type === "natural" ? client.fullName : client.companyName) : "N/A"
                    })()
                  }</div>
                </div>
              </div>
            </div>

            {/* Configuración de la prefactura */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Columna izquierda: Configuración y Servicios */}
              <div className="lg:col-span-1 space-y-4">
                {/* Configuración básica */}
                <div className="bg-gradient-to-br from-slate-50 to-blue-50 p-3 rounded-lg border border-slate-300">
                  <h3 className="text-lg font-bold text-slate-900 border-b border-slate-300 pb-2 mb-2">Configuración de Prefactura</h3>
                  
                  <div className="space-y-2">
                    <div className="space-y-2">
                      <Label htmlFor="prefactura-number" className="text-sm font-semibold text-slate-700">Número de Prefactura *</Label>
                      <Input
                        id="prefactura-number"
                        value={prefacturaData.prefacturaNumber}
                        onChange={(e) => setPrefacturaData({...prefacturaData, prefacturaNumber: e.target.value})}
                        placeholder="PTY-PRE-2024-001"
                        className="bg-white border-slate-300 focus:border-slate-500 focus:ring-slate-500"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="notes" className="text-sm font-semibold text-slate-700">Notas (Opcional)</Label>
                      <Textarea
                        id="notes"
                        value={prefacturaData.notes}
                        onChange={(e) => setPrefacturaData({...prefacturaData, notes: e.target.value})}
                        placeholder="Notas adicionales para la prefactura..."
                        rows={4}
                        className="bg-white border-slate-300 focus:border-slate-500 focus:ring-slate-500"
                      />
                    </div>
                  </div>
                </div>

                                {/* Servicios Adicionales - Solo para registros de trasiego */}
                {hasTrasiegoRecords && (
                <div className="bg-gradient-to-br from-slate-50 to-blue-50 p-3 rounded-lg border border-slate-300">
                  <h3 className="text-lg font-bold text-slate-900 border-b border-slate-300 pb-2 mb-2">Servicios Adicionales</h3>
                  
                                                      {/* Selección de servicios */}
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-3">
                      <Label className="text-sm font-semibold text-slate-700">Servicio</Label>
                      {servicesLoading ? (
                        <div className="flex items-center gap-2 text-sm text-slate-600 bg-white/60 p-3 rounded-lg">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Cargando servicios...
                        </div>
                      ) : (
                        <Select onValueChange={(value) => {
                          const service = additionalServices.find(s => s._id === value)
                          if (service) {
                            setCurrentServiceToAdd(service)
                          }
                        }} value={currentServiceToAdd?._id || ""}>
                          <SelectTrigger className="bg-white border-slate-300 focus:border-slate-500 focus:ring-slate-500 h-12 text-base">
                            <SelectValue placeholder="Seleccionar servicio..." />
                          </SelectTrigger>
                          <SelectContent>
                            {additionalServices.length === 0 ? (
                              <div className="p-2 text-sm text-muted-foreground">
                                No hay servicios disponibles
                              </div>
                            ) : (
                              additionalServices
                                .filter(service => !selectedAdditionalServices.some(s => s.serviceId === service._id))
                                .map((service) => (
                                  <SelectItem key={service._id} value={service._id}>
                                    {service.name} - {service.description}
                                  </SelectItem>
                                ))
                            )}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                    
                    <div className="space-y-3">
                      <Label className="text-sm font-semibold text-slate-700">Importe</Label>
                      <Input
                        type="text"
                        value={currentServiceAmount === 0 ? "" : currentServiceAmount.toString()}
                        onChange={(e) => {
                          const value = e.target.value
                          if (value === "" || value === "0") {
                            setCurrentServiceAmount(0)
                          } else {
                            const numValue = parseFloat(value)
                            if (!isNaN(numValue) && numValue >= 0) {
                              setCurrentServiceAmount(numValue)
                            }
                          }
                        }}
                        placeholder="0.00"
                        className="w-full h-12 text-base bg-white border-slate-300 focus:border-slate-500 focus:ring-slate-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </div>
                    
                    <div className="space-y-3">
                      <Label className="text-sm font-semibold text-slate-700">&nbsp;</Label>
                      <Button 
                        onClick={handleAddServiceWithAmount}
                        disabled={!currentServiceToAdd || currentServiceAmount <= 0}
                        className="w-full h-12 text-base bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white font-semibold shadow-md"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Agregar
                      </Button>
                    </div>
                  </div>
                  
                  {!servicesLoading && additionalServices.length === 0 && (
                    <div className="text-sm text-muted-foreground">
                      No hay servicios adicionales configurados para PTYSS. Ve a Configuración → Servicios Adicionales para agregar servicios.
                    </div>
                  )}
                </div>

                                                    {/* Lista de servicios seleccionados */}
                  {selectedAdditionalServices.length > 0 && (
                    <div className="space-y-4">
                      <Label className="text-sm font-semibold text-slate-700">Servicios Seleccionados</Label>
                      {selectedAdditionalServices.map((service) => (
                        <div key={service.serviceId} className="flex items-center gap-4 p-4 bg-white/70 border border-slate-200 rounded-lg shadow-sm">
                        <div className="flex-1">
                          <div className="font-semibold text-sm text-slate-900">{service.name}</div>
                          <div className="text-xs text-slate-600">{service.description}</div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-lg font-bold text-slate-900 bg-slate-100 px-3 py-1 rounded-full">${service.amount.toFixed(2)}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveAdditionalService(service.serviceId)}
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-full"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                </div>
              )}

              {/* Servicios Locales - Solo para registros locales */}
              {hasLocalRecords && (
                        <div className="bg-gradient-to-br from-slate-50 to-blue-50 p-6 rounded-lg border border-slate-300">
          <h3 className="text-lg font-bold text-slate-900 border-b border-slate-300 pb-3 mb-4">Servicios Adicionales</h3>
                  
                                    {/* Selección de servicios locales */}
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 gap-6">
                      <div className="space-y-4">
                        <Label className="text-sm font-semibold text-slate-700">Servicio</Label>
                        {localServicesLoading ? (
                          <div className="flex items-center gap-2 text-sm text-slate-600 bg-white/60 p-3 rounded-lg">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Cargando servicios locales...
                          </div>
                        ) : localServices.length === 0 ? (
                          <div className="text-sm text-muted-foreground bg-white/60 p-3 rounded-lg">
                            No hay servicios locales disponibles
                          </div>
                        ) : (
                          <Select onValueChange={(value) => {
                            const service = localServices.find((s: any) => s._id === value)
                            if (service) {
                              handleAddLocalService(service)
                            }
                          }} value="">
                            <SelectTrigger className="bg-white border-slate-300 focus:border-slate-500 focus:ring-slate-500 h-14 text-lg">
                              <SelectValue placeholder="Seleccionar servicio local..." />
                            </SelectTrigger>
                            <SelectContent>
                              {localServices
                                .filter((service: any) => !selectedAdditionalServices.some((s: any) => s.serviceId === service._id))
                                .map((service: any) => (
                                  <SelectItem key={service._id} value={service._id}>
                                    {service.name} - {service.description} (${service.price.toFixed(2)})
                                  </SelectItem>
                                ))
                              }
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                                        </div>
                  </div>

                  {/* Lista de servicios locales seleccionados */}
                  {selectedAdditionalServices.filter(s => localServices.some((ls: any) => ls._id === s.serviceId)).length > 0 && (
                    <div className="space-y-4 mt-6">
                      <Label className="text-sm font-semibold text-slate-700">Servicios Locales Seleccionados</Label>
                      {selectedAdditionalServices.filter(s => localServices.some((ls: any) => ls._id === s.serviceId)).map((service) => (
                        <div key={service.serviceId} className="flex items-center gap-4 p-4 bg-white/70 border border-slate-200 rounded-lg shadow-sm">
                          <div className="flex-1">
                            <div className="font-semibold text-sm text-slate-900">{service.name}</div>
                            <div className="text-xs text-slate-600">{service.description}</div>
                            <div className="text-xs text-slate-500">Precio fijo configurado</div>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-lg font-bold text-slate-900 bg-slate-100 px-3 py-1 rounded-full">${service.amount.toFixed(2)}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveLocalService(service.serviceId)}
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-full"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

            </div>

            {/* Columna derecha: Vista previa del PDF */}
            <div className="lg:col-span-2 bg-gradient-to-br from-slate-50 to-blue-50 p-3 rounded-lg border border-slate-300">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-bold text-slate-900">Vista Previa del PDF</h3>
                {pdfUrl && (
                  <Button 
                    onClick={handlePreviewPDF} 
                    variant="outline"
                    size="sm"
                    className="border-slate-300 text-slate-700 hover:bg-slate-50"
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    Ver en Pantalla Completa
                  </Button>
                )}
              </div>
              
              {isGeneratingPDF ? (
                <div className="flex items-center justify-center h-[750px] border-2 border-dashed border-slate-300 rounded-lg">
                  <div className="text-center text-slate-500">
                    <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin" />
                    <p className="text-sm">Generando vista previa...</p>
                  </div>
                </div>
              ) : pdfUrl ? (
                <div className="w-full h-[750px] border border-slate-300 rounded-lg overflow-hidden">
                  <iframe
                    src={pdfUrl}
                    className="w-full h-full"
                    title="Vista previa de la prefactura"
                  />
                </div>
              ) : (
                <div className="flex items-center justify-center h-[750px] border-2 border-dashed border-slate-300 rounded-lg">
                  <div className="text-center text-slate-500">
                    <FileText className="h-12 w-12 mx-auto mb-4" />
                    <p className="text-sm">Ingresa el número de prefactura para ver la vista previa</p>
                  </div>
                </div>
              )}
            </div>
          </div>

                      {/* Detalles de la Prefactura */}
            <div className="bg-gradient-to-r from-slate-100 to-blue-100 border border-slate-300 p-3 rounded-lg shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-slate-600 rounded-lg">
                  <DollarSign className="h-5 w-5 text-white" />
                </div>
                <h4 className="font-bold text-slate-900 text-lg">Detalles de la Prefactura</h4>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center bg-white/60 p-3 rounded-lg">
                  <span className="font-semibold text-slate-800">Subtotal Registros:</span>
                  <span className="font-bold text-lg text-slate-900">${totalAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center bg-white/60 p-3 rounded-lg">
                  <span className="font-semibold text-slate-800">Servicios Adicionales:</span>
                  <span className="font-bold text-lg text-slate-900">${additionalServicesTotal.toFixed(2)}</span>
                </div>
                <div className="border-t-2 border-slate-300 pt-3 flex justify-between items-center bg-gradient-to-r from-slate-200 to-blue-200 p-4 rounded-lg">
                  <span className="font-bold text-lg text-slate-900">Total:</span>
                  <span className="font-bold text-2xl text-slate-900">${grandTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>
            <div className="flex justify-end"></div>

            {/* Botones de navegación */}
            <div className="flex justify-between pt-4">
              <Button 
                variant="outline"
                onClick={handlePreviousStep}
                className="border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold px-6 py-3"
              >
                <ArrowLeft className="mr-2 h-5 w-5" />
                Volver al Paso 1
              </Button>
              
              <div className="flex gap-3">
                <Button 
                  onClick={handleDownloadPDF} 
                  variant="outline"
                  className="border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold px-6 py-3"
                  disabled={!pdfUrl}
                >
                  <Download className="mr-2 h-5 w-5" />
                  Descargar PDF
                </Button>
                
                <Button 
                  onClick={handleCreatePrefactura}
                  className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold px-8 py-3 shadow-lg transform transition-all duration-200 hover:scale-105"
                  disabled={!prefacturaData.prefacturaNumber || selectedRecords.length === 0}
                >
                  <FileText className="mr-2 h-5 w-5" />
                  Crear Prefactura
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modal de Detalles del Registro */}
      <Dialog open={isRecordModalOpen} onOpenChange={setIsRecordModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Info className="h-5 w-5" />
                Detalles del Registro PTYSS
              </div>
              {selectedRecordForView && (
                <div className="flex gap-2 ml-auto">
                  {isEditing ? (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCancelEdit}
                      >
                        Cancelar
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleSaveEdit}
                      >
                        Guardar Cambios
                      </Button>
                    </>
                  ) : (
                    getRecordType(selectedRecordForView) !== "trasiego" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleEditRecord}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Editar
                      </Button>
                    )
                  )}
                </div>
              )}
            </DialogTitle>
          </DialogHeader>
          
          {selectedRecordForView && (
            <div className="space-y-6">
              {/* Información del Cliente */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium border-b pb-2">Información del Cliente</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Cliente</Label>
                    {isEditing && getRecordType(selectedRecordForView) === "local" ? (
                      <Select 
                        value={editedRecord?.clientId || ""} 
                        onValueChange={(value) => setEditedRecord({...editedRecord, clientId: value})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar cliente" />
                        </SelectTrigger>
                        <SelectContent>
                          {clients.map((client: any) => (
                            <SelectItem key={client._id || client.id} value={client._id || client.id}>
                              {client.type === "natural" ? client.fullName : client.companyName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="text-sm">
                        {(() => {
                          const data = selectedRecordForView.data as Record<string, any>
                          const recordType = getRecordType(selectedRecordForView)
                          
                          // Para registros de trasiego, el cliente está en el campo associate
                          if (recordType === "trasiego") {
                            return data.associate || "N/A"
                          }
                          // Para registros locales, buscar por clientId
                          const client = clients.find((c: any) => (c._id || c.id) === data?.clientId)
                          return client ? (client.type === "natural" ? client.fullName : client.companyName) : "N/A"
                        })()}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Orden</Label>
                    {isEditing && getRecordType(selectedRecordForView) === "local" ? (
                      <Input
                        value={editedRecord?.order || ""}
                        onChange={(e) => setEditedRecord({...editedRecord, order: e.target.value})}
                        placeholder="Número de orden"
                      />
                    ) : (
                      <p className="text-sm">
                        {(() => {
                          const recordType = getRecordType(selectedRecordForView)
                          
                          // Para registros de trasiego, usar containerConsecutive
                          if (recordType === "trasiego") {
                            return getContainerConsecutive(selectedRecordForView)
                          }
                          // Para registros locales, usar order
                          const data = selectedRecordForView.data as Record<string, any>
                          return data.order || "N/A"
                        })()}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Información del Contenedor */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium border-b pb-2">Información del Contenedor</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Contenedor</Label>
                    {isEditing && getRecordType(selectedRecordForView) === "local" ? (
                      <Input
                        value={editedRecord?.container || ""}
                        onChange={(e) => setEditedRecord({...editedRecord, container: e.target.value.toUpperCase()})}
                        placeholder="MSCU1234567"
                        maxLength={11}
                      />
                    ) : (
                      <p className="text-sm">{(selectedRecordForView.data as Record<string, any>).container || "N/A"}</p>
                    )}
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Tamaño</Label>
                    {isEditing && getRecordType(selectedRecordForView) === "local" ? (
                      <Select 
                        value={editedRecord?.containerSize || ""} 
                        onValueChange={(value) => setEditedRecord({...editedRecord, containerSize: value})}
                      >
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
                    ) : (
                      <p className="text-sm">
                        {(() => {
                          const data = selectedRecordForView.data as Record<string, any>
                          const recordType = getRecordType(selectedRecordForView)
                          
                          // Para registros de trasiego, usar size del Excel
                          if (recordType === "trasiego") {
                            return (data.size || data.containerSize || "N/A") + "'"
                          }
                          // Para registros locales, usar containerSize
                          return (data.containerSize || "N/A") + "'"
                        })()}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Tipo</Label>
                    {isEditing && getRecordType(selectedRecordForView) === "local" ? (
                      <Select 
                        value={editedRecord?.containerType || ""} 
                        onValueChange={(value) => setEditedRecord({...editedRecord, containerType: value})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="DV">DV - Dry Van</SelectItem>
                          <SelectItem value="HC">HC - High Cube</SelectItem>
                          <SelectItem value="RE">RE - Reefer</SelectItem>
                          <SelectItem value="TK">TK - Tank</SelectItem>
                          <SelectItem value="FL">FL - Flat Rack</SelectItem>
                          <SelectItem value="OS">OS - Open Side</SelectItem>
                          <SelectItem value="OT">OT - Open Top</SelectItem>
                          <SelectItem value="HR">HR - Hard Top</SelectItem>
                          <SelectItem value="PL">PL - Platform</SelectItem>
                          <SelectItem value="BV">BV - Bulk</SelectItem>
                          <SelectItem value="VE">VE - Ventilated</SelectItem>
                          <SelectItem value="PW">PW - Pallet Wide</SelectItem>
                          <SelectItem value="HT">HT - Hard Top</SelectItem>
                          <SelectItem value="IS">IS - Insulated</SelectItem>
                          <SelectItem value="XX">XX - Special</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="text-sm">
                        {(() => {
                          const data = selectedRecordForView.data as Record<string, any>
                          const recordType = getRecordType(selectedRecordForView)
                          
                          // Para registros de trasiego, usar type del Excel
                          if (recordType === "trasiego") {
                            return data.type || data.containerType || "N/A"
                          }
                          // Para registros locales, usar containerType
                          return data.containerType || "N/A"
                        })()}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">
                      {(() => {
                        const recordType = getRecordType(selectedRecordForView)
                        return recordType === "trasiego" ? "Subcliente" : "Naviera"
                      })()}
                    </Label>
                    {isEditing && getRecordType(selectedRecordForView) === "local" ? (
                      <Select 
                        value={editedRecord?.naviera || ""} 
                        onValueChange={(value) => setEditedRecord({...editedRecord, naviera: value})}
                      >
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
                    ) : (
                      <p className="text-sm">
                        {(() => {
                          const data = selectedRecordForView.data as Record<string, any>
                          const recordType = getRecordType(selectedRecordForView)
                          
                          // Para registros de trasiego, usar line como subcliente
                          if (recordType === "trasiego") {
                            return data.line || "N/A"
                          }
                          // Para registros locales, buscar el nombre de la naviera por ID
                          const naviera = navieras.find(n => n._id === data.naviera)
                          return naviera ? `${naviera.name} (${naviera.code})` : "N/A"
                        })()}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">From</Label>
                    {isEditing && getRecordType(selectedRecordForView) === "local" ? (
                      <Select 
                        value={editedRecord?.from || ""} 
                        onValueChange={(value) => setEditedRecord({...editedRecord, from: value})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar From" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MIT">MIT</SelectItem>
                          <SelectItem value="BLB">BLB</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="text-sm">
                        {(() => {
                          const data = selectedRecordForView.data as Record<string, any>
                          const recordType = getRecordType(selectedRecordForView)
                          
                          // Para registros de trasiego, usar from extraído del leg
                          if (recordType === "trasiego") {
                            return data.from || data.pol || "N/A"
                          }
                          // Para registros locales, usar from
                          return data.from || "N/A"
                        })()}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">To</Label>
                    {isEditing && getRecordType(selectedRecordForView) === "local" ? (
                      <Select 
                        value={editedRecord?.to || ""} 
                        onValueChange={(value) => setEditedRecord({...editedRecord, to: value})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar To" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Colon free zone">Colon free zone</SelectItem>
                          <SelectItem value="Parque sur">Parque sur</SelectItem>
                          <SelectItem value="Montemar">Montemar</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="text-sm">
                        {(() => {
                          const data = selectedRecordForView.data as Record<string, any>
                          const recordType = getRecordType(selectedRecordForView)
                          
                          // Para registros de trasiego, usar to extraído del leg
                          if (recordType === "trasiego") {
                            return data.to || data.pod || "N/A"
                          }
                          // Para registros locales, usar to
                          return data.to || "N/A"
                        })()}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Tipo Operación</Label>
                    {isEditing && getRecordType(selectedRecordForView) === "local" ? (
                      <Select 
                        value={editedRecord?.operationType || ""} 
                        onValueChange={(value) => setEditedRecord({...editedRecord, operationType: value})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar tipo de operación" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="import">Import</SelectItem>
                          <SelectItem value="export">Export</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="text-sm">
                        {(() => {
                          const data = selectedRecordForView.data as Record<string, any>
                          const recordType = getRecordType(selectedRecordForView)
                          
                          // Para registros de trasiego, siempre mostrar IMPORT
                          if (recordType === "trasiego") {
                            return "IMPORT"
                          }
                          // Para registros locales, usar operationType
                          return data.operationType?.toUpperCase() || "N/A"
                        })()}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Fecha Movimiento</Label>
                    {isEditing && getRecordType(selectedRecordForView) === "local" ? (
                      <Input
                        type="date"
                        value={editedRecord?.moveDate || ""}
                        onChange={(e) => setEditedRecord({...editedRecord, moveDate: e.target.value})}
                      />
                    ) : (
                      <p className="text-sm">
                        {formatDate((selectedRecordForView.data as Record<string, any>).moveDate)}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Servicios Adicionales */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium border-b pb-2">Servicios Adicionales</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Estadia</Label>
                    {isEditing && getRecordType(selectedRecordForView) === "local" ? (
                      <Select 
                        value={editedRecord?.estadia || ""} 
                        onValueChange={(value) => setEditedRecord({...editedRecord, estadia: value})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="si">Sí</SelectItem>
                          <SelectItem value="no">No</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="text-sm">{(selectedRecordForView.data as Record<string, any>).estadia || "N/A"}</p>
                    )}
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Genset</Label>
                    {isEditing && getRecordType(selectedRecordForView) === "local" ? (
                      <Input
                        type="number"
                        value={editedRecord?.genset || ""}
                        onChange={(e) => setEditedRecord({...editedRecord, genset: e.target.value})}
                        placeholder="Ingrese número"
                        min="0"
                        step="0.01"
                      />
                    ) : (
                      <p className="text-sm">{(selectedRecordForView.data as Record<string, any>).genset || "N/A"}</p>
                    )}
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Retención</Label>
                    {isEditing && getRecordType(selectedRecordForView) === "local" ? (
                      <Input
                        type="number"
                        value={editedRecord?.retencion || ""}
                        onChange={(e) => setEditedRecord({...editedRecord, retencion: e.target.value})}
                        placeholder="Ingrese número"
                        min="0"
                        step="0.01"
                      />
                    ) : (
                      <p className="text-sm">{(selectedRecordForView.data as Record<string, any>).retencion || "N/A"}</p>
                    )}
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Pesaje</Label>
                    {isEditing && getRecordType(selectedRecordForView) === "local" ? (
                      <Input
                        type="number"
                        value={editedRecord?.pesaje || ""}
                        onChange={(e) => setEditedRecord({...editedRecord, pesaje: e.target.value})}
                        placeholder="Ingrese monto en moneda"
                        min="0"
                        step="0.01"
                      />
                    ) : (
                      <p className="text-sm">{(selectedRecordForView.data as Record<string, any>).pesaje || "N/A"}</p>
                    )}
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">TI</Label>
                    {isEditing && getRecordType(selectedRecordForView) === "local" ? (
                      <Select 
                        value={editedRecord?.ti || ""} 
                        onValueChange={(value) => setEditedRecord({...editedRecord, ti: value})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="si">Sí</SelectItem>
                          <SelectItem value="no">No</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="text-sm">{(selectedRecordForView.data as Record<string, any>).ti || "N/A"}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Información de Transporte */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium border-b pb-2">Información de Transporte</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Conductor</Label>
                    {isEditing && getRecordType(selectedRecordForView) === "local" ? (
                      <Input
                        value={editedRecord?.conductor || ""}
                        onChange={(e) => setEditedRecord({...editedRecord, conductor: e.target.value})}
                        placeholder="Ingrese nombre del conductor"
                      />
                    ) : (
                      <p className="text-sm">
                        {(() => {
                          const data = selectedRecordForView.data as Record<string, any>
                          const recordType = getRecordType(selectedRecordForView)
                          
                          // Para registros de trasiego, usar driverName del Excel
                          if (recordType === "trasiego") {
                            return data.driverName || data.conductor || "N/A"
                          }
                          // Para registros locales, usar conductor
                          return data.conductor || "N/A"
                        })()}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Matrícula del Camión</Label>
                    {isEditing && getRecordType(selectedRecordForView) === "local" ? (
                      <Input
                        value={editedRecord?.matriculaCamion || ""}
                        onChange={(e) => setEditedRecord({...editedRecord, matriculaCamion: e.target.value})}
                        placeholder="Ingrese matrícula alfanumérica"
                      />
                    ) : (
                      <p className="text-sm">
                        {(() => {
                          const data = selectedRecordForView.data as Record<string, any>
                          const recordType = getRecordType(selectedRecordForView)
                          
                          // Para registros de trasiego, usar plate del Excel
                          if (recordType === "trasiego") {
                            return data.plate || data.matriculaCamion || "N/A"
                          }
                          // Para registros locales, usar matriculaCamion
                          return data.matriculaCamion || "N/A"
                        })()}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Número de Chasis/Placa</Label>
                    {isEditing && getRecordType(selectedRecordForView) === "local" ? (
                      <Input
                        value={editedRecord?.numeroChasisPlaca || ""}
                        onChange={(e) => setEditedRecord({...editedRecord, numeroChasisPlaca: e.target.value})}
                        placeholder="Ingrese número de chasis o placa"
                      />
                    ) : (
                      <p className="text-sm">{(selectedRecordForView.data as Record<string, any>).numeroChasisPlaca || "N/A"}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Información del Sistema */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium border-b pb-2">Información del Sistema</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-600">ID del Registro</Label>
                    <p className="text-sm font-mono ">{getRecordId(selectedRecordForView)}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Fecha de Creación</Label>
                    <p className="text-sm">{formatDateTime(selectedRecordForView.createdAt).date}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Hora de Creación</Label>
                    <p className="text-sm">{formatDateTime(selectedRecordForView.createdAt).time}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Valor Total</Label>
                    <p className="text-sm font-bold text-blue-600">${selectedRecordForView.totalValue?.toFixed(2) || "0.00"}</p>
                  </div>
                </div>
              </div>

              {/* Notas */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium border-b pb-2">Notas</h3>
                {isEditing && getRecordType(selectedRecordForView) === "local" ? (
                  <Textarea
                    value={editedRecord?.notes || ""}
                    onChange={(e) => setEditedRecord({...editedRecord, notes: e.target.value})}
                    placeholder="Notas adicionales sobre el registro..."
                    rows={3}
                  />
                ) : (
                  (selectedRecordForView.data as Record<string, any>).notes ? (
                    <p className="text-sm bg-gray-50 p-3 rounded-md">
                      {(selectedRecordForView.data as Record<string, any>).notes}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">Sin notas</p>
                  )
                )}
              </div>
            </div>
          )}
          
          <div className="flex justify-end pt-4">
            <Button
              variant="outline"
              onClick={() => setIsRecordModalOpen(false)}
            >
              Cerrar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Previsualización PDF */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Previsualización de Prefactura - {prefacturaData.prefacturaNumber}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            {previewPdf && (
              <div className="border rounded-md">
                <iframe
                  src={URL.createObjectURL(previewPdf)}
                  className="w-full h-[70vh]"
                  title="Previsualización de Prefactura"
                />
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setIsPreviewOpen(false)}
              >
                Cerrar
              </Button>
              <Button
                onClick={() => {
                  if (previewPdf) {
                    saveAs(previewPdf, `${prefacturaData.prefacturaNumber}-preview.pdf`)
                    toast({ 
                      title: "PDF Descargado", 
                      description: "El archivo PDF de previsualización ha sido descargado." 
                    })
                  }
                }}
                variant="outline"
                className="border-green-500 text-green-600 hover:bg-green-50"
              >
                <Download className="mr-2 h-4 w-4" />
                Descargar Previsualización
              </Button>
              <Button
                onClick={handleCreatePrefactura}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <FileText className="mr-2 h-4 w-4" />
                Crear Prefactura ({selectedRecords.length} registros)
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Selección de Fechas */}
      <Dialog open={isDateModalOpen} onOpenChange={setIsDateModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Seleccionar Rango de Fechas
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Fecha desde:</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-10"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Fecha hasta:</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="h-10"
                />
              </div>
            </div>
            
            {/* Botones de período rápido dentro del modal */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-600">Períodos rápidos:</Label>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const todayDates = getTodayDates()
                    setStartDate(todayDates.start)
                    setEndDate(todayDates.end)
                  }}
                  className="text-xs"
                >
                  Hoy
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const weekDates = getCurrentWeekDates()
                    setStartDate(weekDates.start)
                    setEndDate(weekDates.end)
                  }}
                  className="text-xs"
                >
                  Semana
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const monthDates = getCurrentMonthDates()
                    setStartDate(monthDates.start)
                    setEndDate(monthDates.end)
                  }}
                  className="text-xs"
                >
                  Mes
                </Button>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={handleCancelDateFilter}
            >
              Cancelar
            </Button>
            <Button
              onClick={() => handleApplyDateFilter(startDate, endDate)}
              disabled={!startDate || !endDate}
            >
              Aplicar Filtro
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmación para eliminación múltiple */}
      <Dialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar eliminación múltiple</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-4">
              ¿Estás seguro de que deseas eliminar <span className="font-bold text-destructive">{selectedRecordIds.length} registro{selectedRecordIds.length !== 1 ? 's' : ''}</span>?
            </p>
            <p className="text-sm font-semibold text-destructive mb-4">
              Esta acción no se puede deshacer.
            </p>
            {selectedRecordIds.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-xs font-medium text-slate-600 mb-2">Registros que serán eliminados:</p>
                <div className="max-h-48 overflow-y-auto space-y-1 bg-slate-50 p-3 rounded-md">
                  {ptyssRecords
                    .filter((rec: IndividualExcelRecord) => selectedRecordIds.includes(getRecordId(rec)))
                    .slice(0, 5)
                    .map((rec: IndividualExcelRecord) => {
                      const container = (rec as any).data?.container || (rec as any).container || 'N/A'
                      const clientName = (() => {
                        const d = (rec as any).data || {}
                        const byId = d.clientId || (rec as any).clientId
                        if (byId) {
                          const c = clients.find((x: any) => (x._id || x.id) === byId)
                          if (c) return c.type === 'natural' ? c.fullName : c.companyName
                        }
                        return d.customer || d.clientName || 'N/A'
                      })()
                      return (
                        <div key={getRecordId(rec)} className="text-xs text-slate-700 flex items-center gap-2">
                          <span className="font-mono">{container}</span>
                          <span className="text-slate-500">-</span>
                          <span className="truncate">{clientName}</span>
                        </div>
                      )
                    })}
                  {selectedRecordIds.length > 5 && (
                    <div className="text-xs text-slate-500 italic">
                      ...y {selectedRecordIds.length - 5} más
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button 
              variant="outline" 
              onClick={() => setShowBulkDeleteDialog(false)}
              disabled={isDeletingBulk}
            >
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteSelectedRecords}
              disabled={isDeletingBulk}
            >
              {isDeletingBulk ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Eliminando...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Eliminar {selectedRecordIds.length} Registro{selectedRecordIds.length !== 1 ? 's' : ''}
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
} 