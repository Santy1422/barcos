"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useAppDispatch, useAppSelector } from "@/lib/hooks"
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Loader2, Search, ChevronLeft, ChevronRight, RefreshCw, Truck,
  Eye, Edit, Calendar, DollarSign, User, Trash2, Database, Code, X,
  Filter, SearchX, FileX, Zap, Info
} from "lucide-react"
import { createApiUrl } from "@/lib/api-config"
import { SectionGuard } from "@/components/section-guard"
import saveAs from "file-saver"

// Modales reutilizados del componente original
import { TruckingRecordsViewModal } from "@/components/trucking/trucking-records-view-modal"
import { TruckingPdfViewer } from "@/components/trucking/trucking-pdf-viewer"
import { TruckingXmlViewerModal } from "@/components/trucking/trucking-xml-viewer-modal"
import { TruckingPrefacturaEditModal } from "@/components/trucking/trucking-prefactura-edit-modal"
import { TruckingFacturacionModal } from "@/components/trucking/trucking-facturacion-modal"

// Importar actions necesarios
import {
  fetchInvoicesAsync,
  deleteInvoiceAsync,
  updateInvoiceAsync,
  updateMultipleRecordsStatusAsync,
  updateMultipleAutoridadesStatusAsync,
  fetchAutoridadesRecords,
  selectAutoridadesRecords,
} from "@/lib/features/records/recordsSlice"
import { fetchServices, selectAllServices } from "@/lib/features/services/servicesSlice"
import { selectAllClients } from "@/lib/features/clients/clientsSlice"
import { generateInvoiceXML } from "@/lib/xml-generator"

interface Invoice {
  _id: string
  id?: string
  invoiceNumber: string
  clientName: string
  clientRuc?: string
  clientSapNumber?: string
  totalAmount: number
  status: string
  issueDate?: string
  createdAt: string
  relatedRecordIds: string[]
  notes?: string
  details?: any
  xmlData?: any
  sentToSap?: boolean
  poNumber?: string
}

interface PaginationInfo {
  current: number
  pages: number
  total: number
}

const ITEMS_PER_PAGE = 15

export default function TruckingRecordsOptimizadoPage() {
  const dispatch = useAppDispatch()
  const { toast } = useToast()

  // Estados de datos
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [allRecords, setAllRecords] = useState<any[]>([])
  const [pagination, setPagination] = useState<PaginationInfo>({ current: 1, pages: 1, total: 0 })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Datos de Redux que necesitamos
  const autoridadesRecords = useAppSelector(selectAutoridadesRecords)
  const clients = useAppSelector(selectAllClients)
  const services = useAppSelector(selectAllServices)

  // Filtros y búsqueda
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "prefactura" | "facturada">("all")
  const [typeFilter, setTypeFilter] = useState<"all" | "normal" | "auth">("all")
  const [activePeriodFilter, setActivePeriodFilter] = useState<"none" | "today" | "week" | "month" | "advanced">("none")
  const [isUsingPeriodFilter, setIsUsingPeriodFilter] = useState(false)
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [clientFilter, setClientFilter] = useState<string>("all")
  const [showClientFilter, setShowClientFilter] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)

  // Estado de modales
  const [recordsModalOpen, setRecordsModalOpen] = useState(false)
  const [viewRecordsInvoice, setViewRecordsInvoice] = useState<any | null>(null)
  const [pdfModalOpen, setPdfModalOpen] = useState(false)
  const [pdfInvoice, setPdfInvoice] = useState<any | null>(null)
  const [xmlModalOpen, setXmlModalOpen] = useState(false)
  const [xmlInvoice, setXmlInvoice] = useState<any | null>(null)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editInvoice, setEditInvoice] = useState<any | null>(null)
  const [facturarModalOpen, setFacturarModalOpen] = useState(false)
  const [facturarInvoice, setFacturarInvoice] = useState<any | null>(null)
  const [isDateModalOpen, setIsDateModalOpen] = useState(false)

  // Cargar datos de Redux necesarios
  useEffect(() => {
    dispatch(fetchAutoridadesRecords())
    dispatch(fetchServices("trucking"))
  }, [dispatch])

  // Función para cargar facturas con paginación del servidor
  const fetchInvoices = async (page: number, filters?: {
    status?: string
    type?: string
    search?: string
    startDate?: string
    endDate?: string
    client?: string
  }) => {
    setLoading(true)
    setError(null)

    try {
      const token = localStorage.getItem('token')
      if (!token) throw new Error('No autenticado')

      let url = createApiUrl(`/api/invoices/module/trucking?page=${page}&limit=${ITEMS_PER_PAGE}`)

      if (filters?.status && filters.status !== 'all') {
        url += `&status=${filters.status}`
      }
      if (filters?.type && filters.type !== 'all') {
        url += `&type=${filters.type}`
      }
      if (filters?.search) {
        url += `&search=${encodeURIComponent(filters.search)}`
      }
      if (filters?.startDate) {
        url += `&startDate=${filters.startDate}`
      }
      if (filters?.endDate) {
        url += `&endDate=${filters.endDate}`
      }
      if (filters?.client && filters.client !== 'all') {
        url += `&client=${encodeURIComponent(filters.client)}`
      }

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) throw new Error('Error al cargar facturas')

      const data = await response.json()
      console.log('[fetchInvoices] Raw response:', data)

      // Handle response - the backend returns { error: false, payload: { invoices: [...], pagination: {...} } }
      let invoiceData: any[] = []
      let paginationData = { current: page, pages: 1, total: 0 }

      if (data.payload) {
        // Response wrapped in payload
        invoiceData = data.payload.invoices || data.payload.data || []
        paginationData = data.payload.pagination || paginationData
        console.log('[fetchInvoices] From payload - invoices:', invoiceData.length, 'pagination:', paginationData)
      } else {
        // Direct response
        invoiceData = data.invoices || data.data || []
        paginationData = data.pagination || paginationData
        console.log('[fetchInvoices] Direct - invoices:', invoiceData.length, 'pagination:', paginationData)
      }

      setInvoices(invoiceData.map((inv: any) => ({ ...inv, id: inv._id || inv.id })))
      setPagination(paginationData)
    } catch (err) {
      console.error('Error fetching invoices:', err)
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  // Cargar registros para poder mostrar contenedores
  const fetchRecords = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) return

      const response = await fetch(createApiUrl('/api/records/module/trucking?limit=5000'), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setAllRecords(data.data || [])
        }
      }
    } catch (err) {
      console.error('Error loading records:', err)
    }
  }

  // Efecto inicial - cargar datos al montar
  useEffect(() => {
    fetchInvoices(1, {
      status: statusFilter,
      type: typeFilter,
      search: '',
      startDate: undefined,
      endDate: undefined,
      client: 'all'
    })
    fetchRecords()
  }, [])

  // Efecto para actualizar cuando cambian los filtros
  useEffect(() => {
    fetchInvoices(currentPage, {
      status: statusFilter,
      type: typeFilter,
      search,
      startDate: isUsingPeriodFilter ? startDate : undefined,
      endDate: isUsingPeriodFilter ? endDate : undefined,
      client: clientFilter
    })
  }, [currentPage, statusFilter, typeFilter, isUsingPeriodFilter, startDate, endDate, clientFilter])

  const handleSearch = () => {
    setCurrentPage(1)
    fetchInvoices(1, {
      status: statusFilter,
      type: typeFilter,
      search,
      startDate: isUsingPeriodFilter ? startDate : undefined,
      endDate: isUsingPeriodFilter ? endDate : undefined,
      client: clientFilter
    })
  }

  const handleRefresh = () => {
    fetchInvoices(currentPage, {
      status: statusFilter,
      type: typeFilter,
      search,
      startDate: isUsingPeriodFilter ? startDate : undefined,
      endDate: isUsingPeriodFilter ? endDate : undefined,
      client: clientFilter
    })
    fetchRecords()
  }

  const goToPage = (page: number) => {
    if (page >= 1 && page <= pagination.pages) {
      setCurrentPage(page)
    }
  }

  // Helper functions
  const getContainersForInvoice = (invoice: Invoice) => {
    if (!invoice.relatedRecordIds || invoice.relatedRecordIds.length === 0) return "N/A"

    const isAuth = (invoice.invoiceNumber || '').toString().toUpperCase().startsWith('AUTH-')

    if (isAuth) {
      if (autoridadesRecords.length === 0) return "N/A"
      const related = autoridadesRecords.filter((r: any) => (r._id || r.id) && invoice.relatedRecordIds.includes(r._id || r.id))
      const containers = related.map((r: any) => r.container || "N/A").filter((c: string) => c !== "N/A")
      if (containers.length === 0) return "N/A"
      return `${containers.length} contenedor${containers.length === 1 ? '' : 'es'}`
    }

    if (allRecords.length === 0) return "N/A"
    const related = allRecords.filter((r: any) => (r._id || r.id) && invoice.relatedRecordIds.includes(r._id || r.id))
    const containers = related.map((r: any) => r.data?.container || r.data?.contenedor || "N/A").filter((c: string) => c !== "N/A")
    if (containers.length === 0) return "N/A"
    return `${containers.length} contenedor${containers.length === 1 ? '' : 'es'}`
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A'
    const cleanDate = typeof dateString === 'string' ? dateString.trim() : String(dateString)

    if (cleanDate.match(/^\d{4}-\d{1,2}-\d{1,2}$/)) {
      const [year, month, day] = cleanDate.split('-').map(Number)
      if (year >= 1900 && year <= 2100) {
        const date = new Date(year, month - 1, day)
        return date.toLocaleDateString('es-ES')
      }
    }

    if (cleanDate.match(/^\d{4}-\d{1,2}-\d{1,2}T/)) {
      const datePart = cleanDate.split('T')[0]
      const [year, month, day] = datePart.split('-').map(Number)
      if (year >= 1900 && year <= 2100) {
        const date = new Date(year, month - 1, day)
        return date.toLocaleDateString('es-ES')
      }
    }

    return 'N/A'
  }

  const getClientForInvoice = (invoice: Invoice) => {
    const isAuth = (invoice.invoiceNumber || '').toString().toUpperCase().startsWith('AUTH-')

    if (!isAuth) {
      return invoice.clientName || 'N/A'
    }

    if (!invoice.relatedRecordIds || invoice.relatedRecordIds.length === 0) {
      return invoice.clientName || 'N/A'
    }

    const relatedRecord = autoridadesRecords.find((r: any) =>
      (r._id || r.id) && invoice.relatedRecordIds.includes(r._id || r.id)
    )

    if (!relatedRecord) {
      return invoice.clientName || 'N/A'
    }

    if (relatedRecord.clientId) {
      const client = clients.find((c: any) => (c._id || c.id) === relatedRecord.clientId)
      if (client) {
        return client.type === 'natural' ? client.fullName : client.companyName
      }
    }

    return relatedRecord.customer || invoice.clientName || 'N/A'
  }

  // Period filter functions
  const getTodayDates = () => {
    const today = new Date()
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999)
    return { start: startOfDay.toISOString().split("T")[0], end: endOfDay.toISOString().split("T")[0] }
  }

  const getCurrentWeekDates = () => {
    const today = new Date()
    const dayOfWeek = today.getDay()
    const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)
    const startOfWeek = new Date(today.getFullYear(), today.getMonth(), diff)
    startOfWeek.setHours(0, 0, 0, 0)
    const endOfWeek = new Date(startOfWeek)
    endOfWeek.setDate(startOfWeek.getDate() + 6)
    endOfWeek.setHours(23, 59, 59, 999)
    return { start: startOfWeek.toISOString().split("T")[0], end: endOfWeek.toISOString().split("T")[0] }
  }

  const getCurrentMonthDates = () => {
    const today = new Date()
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999)
    return { start: startOfMonth.toISOString().split("T")[0], end: endOfMonth.toISOString().split("T")[0] }
  }

  const handleFilterByPeriod = (period: "today" | "week" | "month" | "advanced") => {
    if (activePeriodFilter === period) {
      setIsUsingPeriodFilter(false)
      setActivePeriodFilter("none")
      setStartDate("")
      setEndDate("")
      return
    }
    setIsUsingPeriodFilter(true)
    setActivePeriodFilter(period)
    switch (period) {
      case "today": { const d = getTodayDates(); setStartDate(d.start); setEndDate(d.end); break }
      case "week": { const d = getCurrentWeekDates(); setStartDate(d.start); setEndDate(d.end); break }
      case "month": { const d = getCurrentMonthDates(); setStartDate(d.start); setEndDate(d.end); break }
      case "advanced":
        setIsDateModalOpen(true)
        break
    }
    setCurrentPage(1)
  }

  const getActivePeriodText = () => {
    if (!isUsingPeriodFilter || activePeriodFilter === "advanced") return null
    const week = getCurrentWeekDates(); const month = getCurrentMonthDates()
    if (startDate === endDate) return "Hoy"
    if (startDate === week.start && endDate === week.end) return "Semana en curso"
    if (startDate === month.start && endDate === month.end) return "Mes en curso"
    return "Período personalizado"
  }

  const handleApplyDateFilter = (start: string, end: string) => {
    setStartDate(start)
    setEndDate(end)
    setIsDateModalOpen(false)
    setCurrentPage(1)
  }

  const handleCancelDateFilter = () => {
    setIsDateModalOpen(false)
    setIsUsingPeriodFilter(false)
    setActivePeriodFilter("none")
    setStartDate("")
    setEndDate("")
  }

  // Obtener clientes únicos de las facturas
  const uniqueClients = useMemo(() => {
    const clientNames = new Set<string>()
    invoices.forEach((inv: Invoice) => {
      const clientName = getClientForInvoice(inv)
      if (clientName && clientName !== 'N/A') {
        clientNames.add(clientName)
      }
    })
    return Array.from(clientNames).sort()
  }, [invoices, autoridadesRecords, clients])

  // Efecto para cerrar el filtro de cliente cuando se hace clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showClientFilter) {
        const target = event.target as Element
        if (!target.closest('[data-client-filter]')) {
          setShowClientFilter(false)
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showClientFilter])

  // Filtro local para búsqueda (el backend también debería soportarlo)
  const filteredInvoices = useMemo(() => {
    if (!search) return invoices
    const q = search.toLowerCase()
    return invoices.filter((inv: Invoice) => {
      const containers = getContainersForInvoice(inv)
      return (inv.invoiceNumber || '').toLowerCase().includes(q) ||
             (inv.clientName || '').toLowerCase().includes(q) ||
             containers.toLowerCase().includes(q)
    })
  }, [invoices, search, allRecords, autoridadesRecords])

  // Acciones
  const handleDeleteInvoice = async (invoice: Invoice) => {
    try {
      await dispatch(deleteInvoiceAsync(invoice.id || invoice._id)).unwrap()
      toast({ title: "Factura eliminada", description: `Se eliminó ${invoice.invoiceNumber}` })
      handleRefresh()

      if (invoice.invoiceNumber?.startsWith('AUTH-')) {
        dispatch(fetchAutoridadesRecords())
      }
    } catch (e: any) {
      toast({ title: "Error", description: e.message || 'No se pudo eliminar', variant: 'destructive' })
    }
  }

  const handleViewRecords = (invoice: Invoice) => {
    setViewRecordsInvoice({ ...invoice, id: invoice._id || invoice.id });
    setRecordsModalOpen(true)
  }

  const handleGenerateXml = (invoice: Invoice) => {
    setXmlInvoice({ ...invoice, id: invoice._id || invoice.id });
    setXmlModalOpen(true)
  }

  const handleEdit = (invoice: Invoice) => {
    setEditInvoice({ ...invoice, id: invoice._id || invoice.id });
    setEditModalOpen(true)
  }

  const buildXmlPayload = (invoice: Invoice) => {
    const recordsForXml = (invoice.relatedRecordIds || []).map((recordId: string) => {
      const r = allRecords.find((x: any) => (x._id || x.id) === recordId)
      if (!r) return null
      const d = r.data || {}

      const unitPrice = Number(d.matchedPrice || r.totalValue || 0)
      const desc = d.description || `Container ${d.container || d.contenedor || ''} ${d.size || d.containerSize || ''} ${d.type || d.containerType || ''} ${d.leg || `${d.from || ''} / ${d.to || ''}`}`

      let fullEmptyStatus = ''
      if (d.fe) {
        const feValue = d.fe.toString().toUpperCase().trim()
        if (feValue === 'F') fullEmptyStatus = 'FULL'
        else if (feValue === 'E') fullEmptyStatus = 'EMPTY'
      } else {
        fullEmptyStatus = 'FULL'
      }

      let ctrCategory = 'D'
      if (d.detectedContainerType === 'reefer') ctrCategory = 'R'

      return {
        id: r._id || r.id,
        description: desc,
        quantity: 1,
        unitPrice,
        totalPrice: unitPrice,
        serviceCode: d.serviceCode || 'TRK002',
        unit: 'VIAJE',
        blNumber: d.bl || '',
        containerNumber: d.container || d.contenedor || '',
        containerSize: d.size || d.containerSize || '',
        containerType: d.type || d.containerType || '',
        containerIsoCode: d.containerIsoCode || '',
        fullEmptyStatus,
        businessType: d.moveType || 'IMPORT',
        internalOrder: d.internalOrder || '',
        ctrCategory,
        subcontracting: d.subcontracting || 'N'
      }
    }).filter(Boolean)

    let invoiceDate = new Date().toISOString()
    if (invoice.issueDate) {
      const parsedDate = new Date(invoice.issueDate)
      if (!isNaN(parsedDate.getTime())) invoiceDate = parsedDate.toISOString()
    } else if (invoice.createdAt) {
      const parsedDate = new Date(invoice.createdAt)
      if (!isNaN(parsedDate.getTime())) invoiceDate = parsedDate.toISOString()
    }

    const otherItems: any[] = []

    const fullContainers = recordsForXml.filter((record: any) => {
      const r = allRecords.find((x: any) => (x._id || x.id) === record.id)
      if (!r) return false
      const d = r.data || {}
      const fe = d.fe || ''
      return fe.toString().toUpperCase().trim() === 'F'
    })
    const totalFullContainers = fullContainers.length

    if (totalFullContainers > 0) {
      const customsTax = services.find((s: any) =>
        s.module === 'trucking' && s.isActive &&
        (s.name === 'Aduana' || s.name === 'Customs' || s.name.toLowerCase().includes('aduana') || s.name.toLowerCase().includes('customs'))
      )
      const adminFeeTax = services.find((s: any) => s.module === 'trucking' && s.name === 'Administration Fee' && s.isActive)

      if (customsTax && customsTax.price > 0) {
        const customsTotal = customsTax.price * totalFullContainers
        otherItems.push({
          serviceCode: 'TRK135',
          description: 'Aduana',
          quantity: totalFullContainers,
          unitPrice: customsTax.price,
          totalPrice: customsTotal,
          unit: 'VIAJE',
          IncomeRebateCode: 'I',
          AmntTransacCur: -customsTotal,
          ProfitCenter: 'PTG',
          Activity: 'TRUCKING',
          Pillar: 'LOGISTICS',
          BUCountry: 'PA',
          ServiceCountry: 'PA',
          ClientType: 'EXTERNAL',
          FullEmpty: 'FULL'
        })
      }

      if (adminFeeTax && adminFeeTax.price > 0) {
        const adminFeeTotal = adminFeeTax.price * totalFullContainers
        otherItems.push({
          serviceCode: 'TRK130',
          description: 'Administration Fee',
          quantity: totalFullContainers,
          unitPrice: adminFeeTax.price,
          totalPrice: adminFeeTotal,
          unit: 'VIAJE',
          IncomeRebateCode: 'I',
          AmntTransacCur: -adminFeeTotal,
          ProfitCenter: 'PTG',
          Activity: 'TRUCKING',
          Pillar: 'LOGISTICS',
          BUCountry: 'PA',
          ServiceCountry: 'PA',
          ClientType: 'EXTERNAL'
        })
      }
    }

    if (invoice.details?.additionalServices && Array.isArray(invoice.details.additionalServices)) {
      invoice.details.additionalServices.forEach((additionalService: any) => {
        const serviceFromDb = services.find((s: any) => s._id === additionalService.id)
        const serviceCode = serviceFromDb?.name || 'TRK999'
        const serviceDescription = serviceFromDb?.description || additionalService.description || additionalService.name || 'Servicio Adicional'

        otherItems.push({
          serviceCode,
          description: serviceDescription,
          quantity: 1,
          unitPrice: additionalService.amount || 0,
          totalPrice: additionalService.amount || 0,
          unit: 'VIAJE',
          IncomeRebateCode: 'I',
          AmntTransacCur: (-(additionalService.amount || 0)).toFixed(3),
          ProfitCenter: 'PTG',
          Activity: 'TRUCKING',
          Pillar: 'LOGISTICS',
          BUCountry: 'PA',
          ServiceCountry: 'PA',
          ClientType: 'EXTERNAL',
          FullEmpty: 'FULL'
        })
      })
    }

    return {
      id: invoice.id || invoice._id || '',
      module: "trucking" as const,
      invoiceNumber: invoice.invoiceNumber || '',
      client: invoice.clientRuc || '',
      clientName: invoice.clientName,
      clientSapNumber: invoice.clientSapNumber || '',
      date: invoiceDate,
      currency: 'USD',
      total: invoice.totalAmount || 0,
      records: recordsForXml,
      otherItems,
      status: 'finalized' as const,
    }
  }

  return (
    <SectionGuard module="trucking" section="records">
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-blue-600 flex items-center justify-center">
            <Truck className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Facturas - PTG</h1>
            <p className="text-muted-foreground">Prefacturas y Facturas de Trasiego</p>
          </div>
        </div>

        {/* Banner informativo */}
        <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-center h-8 w-8 rounded-full bg-blue-100">
            <Info className="h-4 w-4 text-blue-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-blue-800">
              Mostrando {pagination.total} prefacturas y facturas
            </p>
            <p className="text-xs text-blue-600">
              Aquí aparecen las prefacturas ya creadas. Para crear nuevas prefacturas, ve a "Trasiego Rápido" o "Gastos Autoridades Rápido" y selecciona los registros pendientes.
            </p>
          </div>
        </div>

        <Card>
          <CardContent className="space-y-4 mt-6">
            {/* Filtros */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Buscar por número, cliente o contenedor"
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v as any); setCurrentPage(1) }}>
                <SelectTrigger className="w-[180px]"><SelectValue placeholder="Estado" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="prefactura">Prefactura</SelectItem>
                  <SelectItem value="facturada">Facturada</SelectItem>
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v as any); setCurrentPage(1) }}>
                <SelectTrigger className="w-[180px]"><SelectValue placeholder="Tipo" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los tipos</SelectItem>
                  <SelectItem value="normal">Trasiego</SelectItem>
                  <SelectItem value="auth">Gastos Autoridades</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex gap-1 flex-wrap">
                <Button variant={activePeriodFilter==='today'?'default':'outline'} size="sm" onClick={()=>handleFilterByPeriod('today')} className="h-8">Hoy</Button>
                <Button variant={activePeriodFilter==='week'?'default':'outline'} size="sm" onClick={()=>handleFilterByPeriod('week')} className="h-8">Semana</Button>
                <Button variant={activePeriodFilter==='month'?'default':'outline'} size="sm" onClick={()=>handleFilterByPeriod('month')} className="h-8">Mes</Button>
                <Button variant={activePeriodFilter==='advanced'?'default':'outline'} size="sm" onClick={()=>handleFilterByPeriod('advanced')} className="h-8">Avanzado</Button>
              </div>
            </div>

            {/* Badges de filtros activos */}
            {isUsingPeriodFilter && activePeriodFilter !== 'advanced' && (
              <div className="flex items-center gap-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
                <Badge variant="default" className="bg-blue-600 text-white text-xs">{getActivePeriodText()}</Badge>
                <span className="text-sm text-blue-700">{startDate} - {endDate}</span>
                <Button variant="ghost" size="sm" onClick={()=>{ setIsUsingPeriodFilter(false); setActivePeriodFilter("none"); setStartDate(""); setEndDate("") }} className="h-6 w-6 p-0 ml-auto"><X className="h-3 w-3" /></Button>
              </div>
            )}

            {typeFilter !== 'all' && (
              <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded-md">
                <Badge variant="default" className="bg-green-600 text-white text-xs">
                  {typeFilter === 'auth' ? 'Gastos Autoridades' : 'Trasiego'}
                </Badge>
                <span className="text-sm text-green-700">Mostrando solo facturas de {typeFilter === 'auth' ? 'gastos de autoridades' : 'trasiego'}</span>
                <Button variant="ghost" size="sm" onClick={()=>{ setTypeFilter('all'); setCurrentPage(1) }} className="h-6 w-6 p-0 ml-auto"><X className="h-3 w-3" /></Button>
              </div>
            )}

            {isUsingPeriodFilter && activePeriodFilter === 'advanced' && startDate && endDate && (
              <div className="flex items-center gap-2 p-2 bg-purple-50 border border-purple-200 rounded-md">
                <Badge variant="default" className="bg-purple-600 text-white text-xs">Filtro Avanzado</Badge>
                <span className="text-sm text-purple-700">{startDate} - {endDate}</span>
                <Button variant="ghost" size="sm" onClick={()=>{ setIsUsingPeriodFilter(false); setActivePeriodFilter("none"); setStartDate(""); setEndDate("") }} className="h-6 w-6 p-0 ml-auto"><X className="h-3 w-3" /></Button>
              </div>
            )}

            {clientFilter !== 'all' && (
              <div className="flex items-center gap-2 p-2 bg-orange-50 border border-orange-200 rounded-md">
                <Badge variant="default" className="bg-orange-600 text-white text-xs">Filtro Cliente</Badge>
                <span className="text-sm text-orange-700">Mostrando facturas de: {clientFilter}</span>
                <Button variant="ghost" size="sm" onClick={()=>{ setClientFilter('all'); setCurrentPage(1) }} className="h-6 w-6 p-0 ml-auto"><X className="h-3 w-3" /></Button>
              </div>
            )}

            {/* Tabla */}
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[120px]">Número</TableHead>
                    <TableHead className="min-w-[100px]">Tipo</TableHead>
                    <TableHead>
                      <div className="flex items-center justify-between relative" data-client-filter>
                        <span>Cliente</span>
                        <div className="flex items-center gap-1">
                          {clientFilter !== 'all' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => { setClientFilter('all'); setCurrentPage(1) }}
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
                                  onClick={() => { setClientFilter('all'); setShowClientFilter(false); setCurrentPage(1) }}
                                >
                                  Todos los clientes
                                </div>
                                {uniqueClients.map((clientName) => (
                                  <div
                                    key={clientName}
                                    className={`px-2 py-1 text-xs cursor-pointer rounded hover:bg-gray-100 ${clientFilter === clientName ? 'bg-blue-100 text-blue-800 font-medium' : ''}`}
                                    onClick={() => { setClientFilter(clientName); setShowClientFilter(false); setCurrentPage(1) }}
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
                    <TableHead className="min-w-[140px]">Contenedor</TableHead>
                    <TableHead className="min-w-[120px]">Fecha</TableHead>
                    <TableHead className="min-w-[100px]">Total</TableHead>
                    <TableHead className="min-w-[100px]">Estado</TableHead>
                    <TableHead className="min-w-[120px] hidden md:table-cell">Notas</TableHead>
                    <TableHead className="min-w-[200px] text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 10 }).map((_, index) => (
                      <TableRow key={`skeleton-${index}`}>
                        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-24 rounded-full" /></TableCell>
                        <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-full" /></TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Skeleton className="h-8 w-8" />
                            <Skeleton className="h-8 w-8" />
                            <Skeleton className="h-8 w-8" />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : error ? (
                    <TableRow><TableCell colSpan={9} className="py-8 text-center text-red-600">{error}</TableCell></TableRow>
                  ) : filteredInvoices.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="py-12">
                        <div className="flex flex-col items-center justify-center space-y-4">
                          {search || statusFilter !== "all" || typeFilter !== "all" || clientFilter !== "all" || isUsingPeriodFilter ? (
                            <>
                              <div className="rounded-full bg-orange-100 p-4">
                                <SearchX className="h-10 w-10 text-orange-600" />
                              </div>
                              <h3 className="text-lg font-semibold text-gray-900">Sin resultados</h3>
                              <p className="text-sm text-muted-foreground text-center max-w-sm">
                                No se encontraron prefacturas que coincidan con los filtros aplicados
                              </p>
                              <Button
                                variant="outline"
                                onClick={() => {
                                  setSearch("")
                                  setStatusFilter("all")
                                  setTypeFilter("all")
                                  setClientFilter("all")
                                  setIsUsingPeriodFilter(false)
                                  setStartDate("")
                                  setEndDate("")
                                  setCurrentPage(1)
                                }}
                              >
                                <X className="mr-2 h-4 w-4" />
                                Limpiar filtros
                              </Button>
                            </>
                          ) : (
                            <>
                              <div className="rounded-full bg-blue-100 p-4">
                                <FileX className="h-10 w-10 text-blue-600" />
                              </div>
                              <h3 className="text-lg font-semibold text-gray-900">Sin prefacturas</h3>
                              <p className="text-sm text-muted-foreground text-center max-w-sm">
                                Aún no hay prefacturas de Trucking creadas. Las prefacturas se generan desde los registros.
                              </p>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredInvoices.map((inv: Invoice) => {
                      const isAuth = (inv.invoiceNumber || '').toString().toUpperCase().startsWith('AUTH-')
                      return (
                        <TableRow key={inv._id || inv.id}>
                          <TableCell className="font-mono text-sm">{inv.invoiceNumber}</TableCell>
                          <TableCell>
                            <Badge variant={isAuth ? "default" : "secondary"} className={isAuth ? "bg-orange-600 text-white" : ""}>
                              {isAuth ? "Gastos Auth" : "Trasiego"}
                            </Badge>
                          </TableCell>
                          <TableCell><div className="flex items-center gap-2"><User className="h-4 w-4 text-muted-foreground" />{getClientForInvoice(inv)}</div></TableCell>
                          <TableCell><div className="flex items-center gap-2"><Truck className="h-4 w-4 text-muted-foreground" />{getContainersForInvoice(inv)}</div></TableCell>
                          <TableCell><div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-muted-foreground" />{formatDate(inv.issueDate || inv.createdAt)}</div></TableCell>
                          <TableCell className="font-bold"><div className="flex items-center gap-2"><DollarSign className="h-4 w-4 text-muted-foreground" />${(inv.totalAmount || 0).toFixed(2)}</div></TableCell>
                          <TableCell>
                            {inv.status === 'prefactura' ?
                              <Badge variant="outline" className="text-blue-600 border-blue-600">Prefactura</Badge> :
                              <Badge variant="outline" className="text-green-600 border-green-600">Facturada</Badge>
                            }
                          </TableCell>
                          <TableCell className="max-w-32 hidden md:table-cell">
                            {inv.notes ? (
                              <div className="text-sm text-gray-600 truncate cursor-help" title={inv.notes}>
                                {inv.notes}
                              </div>
                            ) : (
                              <span className="text-gray-400 text-sm">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="sm" title="Ver registros" onClick={()=>handleViewRecords(inv)} className="h-8 w-8 text-purple-600 hover:bg-purple-50"><Database className="h-4 w-4"/></Button>
                              <Button variant="ghost" size="sm" title="Ver PDF" onClick={()=>{ setPdfInvoice({ ...inv, id: inv._id || inv.id }); setPdfModalOpen(true) }} className="h-8 w-8 text-blue-600 hover:bg-blue-50"><Eye className="h-4 w-4"/></Button>
                              {inv.status === 'facturada' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  title={inv.sentToSap ? 'XML enviado a SAP' : 'Ver/Enviar XML a SAP'}
                                  onClick={()=>handleGenerateXml(inv)}
                                  className={`h-8 w-8 ${inv.sentToSap ? 'text-green-600 hover:text-green-700 hover:bg-green-50' : 'text-orange-600 hover:text-orange-700 hover:bg-orange-50'}`}
                                >
                                  <Code className="h-4 w-4"/>
                                </Button>
                              )}
                              {inv.status === 'prefactura' && (
                                <>
                                  <Button variant="outline" size="sm" title="Editar" onClick={()=>handleEdit(inv)} className="h-8 px-2 text-blue-700 border-blue-600 hover:bg-blue-50"><Edit className="h-4 w-4 mr-1"/>Editar</Button>
                                  <Button variant="outline" size="sm" title="Facturar" onClick={()=>{ setFacturarInvoice({ ...inv, id: inv._id || inv.id }); setFacturarModalOpen(true) }} className="h-8 px-2 text-green-700 border-green-600 hover:bg-green-50">Facturar</Button>
                                </>
                              )}
                              <Button variant="ghost" size="sm" title="Eliminar" onClick={()=>handleDeleteInvoice(inv)} className="h-8 w-8 text-red-600 hover:text-red-50"><Trash2 className="h-4 w-4"/></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Paginación y totales */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground">
                  Página {pagination.current} de {pagination.pages} ({pagination.total} facturas)
                </span>
                <span className="text-sm font-medium">
                  Total: ${filteredInvoices.reduce((s: number, i: Invoice) => s + (i.totalAmount || 0), 0).toFixed(2)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage <= 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Anterior
                </Button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                    let pageNum
                    if (pagination.pages <= 5) {
                      pageNum = i + 1
                    } else if (currentPage <= 3) {
                      pageNum = i + 1
                    } else if (currentPage >= pagination.pages - 2) {
                      pageNum = pagination.pages - 4 + i
                    } else {
                      pageNum = currentPage - 2 + i
                    }
                    return (
                      <Button
                        key={pageNum}
                        variant={pageNum === currentPage ? "default" : "outline"}
                        size="sm"
                        onClick={() => goToPage(pageNum)}
                        className="w-10"
                      >
                        {pageNum}
                      </Button>
                    )
                  })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage >= pagination.pages}
                >
                  Siguiente
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Modales */}
        <TruckingXmlViewerModal
          open={xmlModalOpen}
          onOpenChange={setXmlModalOpen}
          invoice={xmlInvoice}
          onXmlSentToSap={() => handleRefresh()}
        />
        <TruckingRecordsViewModal open={recordsModalOpen} onOpenChange={setRecordsModalOpen} invoice={viewRecordsInvoice} />
        <TruckingPdfViewer open={pdfModalOpen} onOpenChange={setPdfModalOpen} invoice={pdfInvoice} />
        <TruckingPrefacturaEditModal
          open={editModalOpen}
          onOpenChange={setEditModalOpen}
          invoice={editInvoice}
          onClose={()=>setEditModalOpen(false)}
          onEditSuccess={()=>handleRefresh()}
        />
        <TruckingFacturacionModal
          open={facturarModalOpen}
          onOpenChange={setFacturarModalOpen}
          invoice={facturarInvoice}
          onFacturar={async (invoiceNumber, xmlData, invoiceDate, poNumber) => {
            try {
              await dispatch(updateInvoiceAsync({
                id: facturarInvoice.id || facturarInvoice._id,
                updates: {
                  status: 'facturada',
                  invoiceNumber,
                  xmlData: xmlData ? xmlData.xml : undefined,
                  issueDate: invoiceDate,
                  ...(poNumber && { poNumber })
                }
              })).unwrap()

              const isAuthInvoice = facturarInvoice.invoiceNumber?.toString().toUpperCase().startsWith('AUTH-')
                || facturarInvoice.invoiceNumber?.toString().toUpperCase().endsWith(' AUT')
                || facturarInvoice.details?.documentType === 'gastos-autoridades'

              if (isAuthInvoice) {
                await dispatch(updateMultipleAutoridadesStatusAsync({
                  recordIds: facturarInvoice.relatedRecordIds,
                  status: 'facturado',
                  invoiceId: facturarInvoice.id || facturarInvoice._id
                })).unwrap()
              } else {
                await dispatch(updateMultipleRecordsStatusAsync({
                  recordIds: facturarInvoice.relatedRecordIds,
                  status: 'facturado',
                  invoiceId: facturarInvoice.id || facturarInvoice._id
                })).unwrap()
              }

              setFacturarModalOpen(false)
              handleRefresh()

              if (isAuthInvoice) {
                dispatch(fetchAutoridadesRecords())
              }

              toast({
                title: 'Facturación completada',
                description: `La prefactura ha sido facturada como ${invoiceNumber}`
              })
            } catch (e: any) {
              console.error("Error en onFacturar:", e)
              toast({
                title: 'Error',
                description: e.message || 'No se pudo facturar',
                variant: 'destructive'
              })
            }
          }}
        />

        {/* Modal de Selección de Fechas Avanzadas */}
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
              <Button variant="outline" onClick={handleCancelDateFilter}>
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
      </div>
    </SectionGuard>
  )
}
