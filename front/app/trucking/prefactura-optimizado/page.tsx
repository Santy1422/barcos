"use client"

import { useEffect, useMemo, useState, useCallback } from "react"
import { useAppDispatch, useAppSelector } from "@/lib/hooks"
import {
  type ExcelRecord as IndividualExcelRecord,
  type PersistedInvoiceRecord,
  updateMultipleRecordsStatusAsync,
  createInvoiceAsync,
  deleteRecordAsync,
  fetchAutoridadesRecords,
} from "@/lib/features/records/recordsSlice"
import { selectAllClients, fetchClients } from "@/lib/features/clients/clientsSlice"
import { fetchServices, selectAllServices, selectServicesLoading } from "@/lib/features/services/servicesSlice"
import { selectCurrentUser } from "@/lib/features/auth/authSlice"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { Database, Search, X, Edit, Eye as EyeIcon, Trash2 as TrashIcon, Calendar, Eye, Download, FileText, DollarSign, ArrowLeft, Plus, Trash2, Loader2, Filter, Check, ChevronLeft, ChevronRight, Zap, RefreshCw, Truck } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DiscountInput } from "@/components/ui/discount-input"
import { SectionGuard } from "@/components/section-guard"
import { Skeleton } from "@/components/ui/skeleton"
import { createApiUrl } from "@/lib/api-config"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

const convertExcelDateToReadable = (excelDate: string | number): string => {
  if (!excelDate) return ''
  const cleanDate = typeof excelDate === 'string' ? excelDate.trim() : excelDate

  if (typeof cleanDate === 'string' && cleanDate.includes('T')) {
    const datePart = cleanDate.split('T')[0]
    if (datePart.match(/^\d{4}-\d{1,2}-\d{1,2}$/)) {
      const [year, month, day] = datePart.split('-').map(Number)
      if (year >= 1900 && year <= 2100) {
        return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`
      }
    }
  }

  if (typeof cleanDate === 'string' && cleanDate.match(/^\d{4}-\d{1,2}-\d{1,2}$/)) {
    const [year, month, day] = cleanDate.split('-').map(Number)
    if (year >= 1900 && year <= 2100) {
      return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`
    }
  }

  if (typeof cleanDate === 'string' && cleanDate.match(/^\d{1,2}-\d{1,2}-\d{4}$/)) {
    const parts = cleanDate.split('-')
    if (parts.length === 3) {
      const [part1, part2, yearStr] = parts
      const year = Number(yearStr)
      if (year >= 1900 && year <= 2100) {
        return `${part1.padStart(2, '0')}/${part2.padStart(2, '0')}/${year}`
      }
    }
  }

  if (typeof cleanDate === 'string' && cleanDate.includes('/')) {
    const dateStr = cleanDate.split(' ')[0]
    const parts = dateStr.split('/')
    if (parts.length === 3) {
      const [part1, part2, part3] = parts
      if (part1.length <= 2 && part2.length <= 2 && part3.length === 4) {
        const year = Number(part3)
        if (year >= 1900 && year <= 2100) {
          if (Number(part1) > 12) {
            return `${part1.padStart(2, '0')}/${part2.padStart(2, '0')}/${year}`
          }
          return `${part2.padStart(2, '0')}/${part1.padStart(2, '0')}/${year}`
        }
      }
    }
  }

  const excelSerialNumber = Number(cleanDate)
  if (!isNaN(excelSerialNumber) && excelSerialNumber > 0 && excelSerialNumber < 100000) {
    const excelEpoch = new Date(1900, 0, 1)
    const millisecondsPerDay = 24 * 60 * 60 * 1000
    const adjustedSerialNumber = excelSerialNumber > 59 ? excelSerialNumber - 1 : excelSerialNumber
    const date = new Date(excelEpoch.getTime() + (adjustedSerialNumber - 1) * millisecondsPerDay)
    if (!isNaN(date.getTime())) {
      const year = date.getFullYear()
      if (year >= 1900 && year <= 2100) {
        const day = date.getDate().toString().padStart(2, '0')
        const month = (date.getMonth() + 1).toString().padStart(2, '0')
        return `${day}/${month}/${year}`
      }
    }
  }

  return String(excelDate)
}

interface PaginationInfo {
  current: number
  pages: number
  total: number
}

const ITEMS_PER_PAGE = 20

export default function TruckingPrefacturaOptimizadoPage() {
  const dispatch = useAppDispatch()
  const { toast } = useToast()

  // Data from Redux
  const clients = useAppSelector(selectAllClients)
  const services = useAppSelector(selectAllServices)
  const servicesLoading = useAppSelector(selectServicesLoading)
  const currentUser = useAppSelector(selectCurrentUser)

  // Admin check
  const userRoles = currentUser?.roles || (currentUser?.role ? [currentUser.role] : [])
  const isAdmin = userRoles.includes('administrador')

  // Logo for PDF
  const [logoBase64, setLogoBase64] = useState<string | undefined>(undefined)

  // Server-side paginated records
  const [records, setRecords] = useState<any[]>([])
  const [pagination, setPagination] = useState<PaginationInfo>({ current: 1, pages: 1, total: 0 })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Selection - stored as IDs to persist across pages
  const [selectedRecordIds, setSelectedRecordIds] = useState<string[]>([])
  const [selectedRecordsCache, setSelectedRecordsCache] = useState<Map<string, any>>(new Map())

  // Current step
  type Step = 'select' | 'services'
  const [step, setStep] = useState<Step>('select')
  const [search, setSearch] = useState<string>("")
  const [currentPage, setCurrentPage] = useState(1)

  // Filters
  const [statusFilter, setStatusFilter] = useState<'all' | 'pendiente' | 'completado'>('all')
  const [clientFilter, setClientFilter] = useState<string>('all')
  const [showClientFilter, setShowClientFilter] = useState(false)
  const [isUsingPeriodFilter, setIsUsingPeriodFilter] = useState(false)
  const [activePeriodFilter, setActivePeriodFilter] = useState<'none' | 'today' | 'week' | 'month' | 'advanced'>('none')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [isDateModalOpen, setIsDateModalOpen] = useState(false)
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false)
  const [selectedRecordForView, setSelectedRecordForView] = useState<any | null>(null)

  // Discount
  const [discountAmount, setDiscountAmount] = useState(0)

  // Prefactura data
  const [prefacturaData, setPrefacturaData] = useState<{ prefacturaNumber: string; notes: string }>(
    { prefacturaNumber: `TRK-PRE-${Date.now().toString().slice(-5)}`, notes: "" }
  )

  // Services
  const [additionalServiceId, setAdditionalServiceId] = useState<string>("")
  const [additionalServiceAmount, setAdditionalServiceAmount] = useState<number>(0)
  const [selectedAdditionalServices, setSelectedAdditionalServices] = useState<Array<{ id: string; name: string; description: string; amount: number }>>([])

  // PDF states
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null)
  const [showPdfPreview, setShowPdfPreview] = useState(false)
  const [isCreatingPrefactura, setIsCreatingPrefactura] = useState(false)

  // Load initial data
  useEffect(() => {
    dispatch(fetchClients())
    dispatch(fetchServices("trucking"))

    fetch('/logos/logo_PTG.png')
      .then(res => res.blob())
      .then(blob => {
        const reader = new FileReader()
        reader.onloadend = () => setLogoBase64(reader.result as string)
        reader.readAsDataURL(blob)
      })
      .catch(() => console.warn("No se pudo cargar el logo PTG"))
  }, [dispatch])

  // Fetch records with server-side pagination
  const fetchRecords = useCallback(async (page: number, filters?: {
    status?: string
    search?: string
    client?: string
    startDate?: string
    endDate?: string
  }) => {
    setLoading(true)
    setError(null)

    try {
      const token = localStorage.getItem('token')
      if (!token) throw new Error('No autenticado')

      // Build URL with query params for trasiego records only
      let url = createApiUrl(`/api/records/module/trucking?page=${page}&limit=${ITEMS_PER_PAGE}`)

      // Status filter for excluding prefacturado/facturado
      if (filters?.status && filters.status !== 'all') {
        url += `&status=${filters.status}`
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

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) throw new Error('Error al cargar registros')

      const data = await response.json()

      let recordsData: any[] = []
      let paginationData = { current: page, pages: 1, total: 0 }

      if (data.payload) {
        recordsData = data.payload.data || data.payload.records || []
        paginationData = data.payload.pagination || paginationData
      } else {
        recordsData = data.data || data.records || []
        paginationData = data.pagination || paginationData
      }

      // Filter for trasiego records only (client-side for now since backend doesn't support this filter)
      // Note: Backend now excludes prefacturado/facturado by default
      const isTrasiego = (rec: any) => !!(rec?.data?.leg || rec?.data?.matchedPrice || rec?.data?.line)

      let filteredRecords = recordsData.filter(isTrasiego)

      // Apply client filter client-side if needed
      if (filters?.client && filters.client !== 'all') {
        filteredRecords = filteredRecords.filter((rec: any) => {
          const clientName = getClientNameForRecord(rec)
          return clientName === filters.client
        })
      }

      setRecords(filteredRecords)
      setPagination(paginationData)
    } catch (err) {
      console.error('Error fetching records:', err)
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }, [])

  // Helper to get client name for a record
  const getClientNameForRecord = useCallback((rec: any) => {
    const d = rec?.data || {}
    const byId = d.clientId || rec?.clientId
    if (byId) {
      const c = clients.find((x: any) => (x._id || x.id) === byId)
      if (c) return c.type === 'natural' ? c.fullName : c.companyName
    }
    const bySap = d.clientSapCode || rec?.clientSapCode
    if (bySap) {
      const c = clients.find((x: any) => (x.sapCode || '').toLowerCase() === String(bySap).toLowerCase())
      if (c) return c.type === 'natural' ? c.fullName : c.companyName
    }
    return 'PTY SHIP SUPPLIERS, S.A.'
  }, [clients])

  // Load records on mount and when filters change
  useEffect(() => {
    fetchRecords(currentPage, {
      status: statusFilter,
      search,
      client: clientFilter,
      startDate: isUsingPeriodFilter ? startDate : undefined,
      endDate: isUsingPeriodFilter ? endDate : undefined
    })
  }, [currentPage, statusFilter, isUsingPeriodFilter, startDate, endDate, clientFilter, fetchRecords])

  const handleSearch = () => {
    setCurrentPage(1)
    fetchRecords(1, {
      status: statusFilter,
      search,
      client: clientFilter,
      startDate: isUsingPeriodFilter ? startDate : undefined,
      endDate: isUsingPeriodFilter ? endDate : undefined
    })
  }

  const handleRefresh = () => {
    fetchRecords(currentPage, {
      status: statusFilter,
      search,
      client: clientFilter,
      startDate: isUsingPeriodFilter ? startDate : undefined,
      endDate: isUsingPeriodFilter ? endDate : undefined
    })
  }

  const goToPage = (page: number) => {
    if (page >= 1 && page <= pagination.pages) {
      setCurrentPage(page)
    }
  }

  // Selection functions
  const toggleRecord = (recordId: string, checked: boolean, record?: any) => {
    if (checked) {
      setSelectedRecordIds(prev => [...prev, recordId])
      if (record) {
        setSelectedRecordsCache(prev => new Map(prev).set(recordId, record))
      }
    } else {
      setSelectedRecordIds(prev => prev.filter(id => id !== recordId))
    }
  }

  const isSelected = (recordId: string) => selectedRecordIds.includes(recordId)

  const clearSelection = () => {
    setSelectedRecordIds([])
    setSelectedRecordsCache(new Map())
  }

  // Get all selected records from cache
  const selectedRecords = useMemo(() => {
    return selectedRecordIds.map(id => selectedRecordsCache.get(id)).filter(Boolean)
  }, [selectedRecordIds, selectedRecordsCache])

  // Period filter functions
  const getTodayDates = () => {
    const today = new Date()
    return { start: today.toISOString().split('T')[0], end: today.toISOString().split('T')[0] }
  }

  const getCurrentWeekDates = () => {
    const today = new Date()
    const dayOfWeek = today.getDay()
    const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)
    const startOfWeek = new Date(today.getFullYear(), today.getMonth(), diff)
    const endOfWeek = new Date(startOfWeek)
    endOfWeek.setDate(startOfWeek.getDate() + 6)
    return { start: startOfWeek.toISOString().split('T')[0], end: endOfWeek.toISOString().split('T')[0] }
  }

  const getCurrentMonthDates = () => {
    const today = new Date()
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)
    return { start: startOfMonth.toISOString().split('T')[0], end: endOfMonth.toISOString().split('T')[0] }
  }

  const handleFilterByPeriod = (period: 'today' | 'week' | 'month' | 'advanced') => {
    if (activePeriodFilter === period) {
      setIsUsingPeriodFilter(false)
      setActivePeriodFilter('none')
      setStartDate('')
      setEndDate('')
      return
    }
    setIsUsingPeriodFilter(true)
    setActivePeriodFilter(period)
    setCurrentPage(1)
    switch (period) {
      case 'today': { const d = getTodayDates(); setStartDate(d.start); setEndDate(d.end); break }
      case 'week': { const d = getCurrentWeekDates(); setStartDate(d.start); setEndDate(d.end); break }
      case 'month': { const d = getCurrentMonthDates(); setStartDate(d.start); setEndDate(d.end); break }
      case 'advanced': setIsDateModalOpen(true); break
    }
  }

  const handleApplyDateFilter = (start: string, end: string) => {
    setStartDate(start)
    setEndDate(end)
    setIsUsingPeriodFilter(true)
    setActivePeriodFilter('advanced')
    setIsDateModalOpen(false)
    setCurrentPage(1)
  }

  const handleCancelDateFilter = () => {
    setIsDateModalOpen(false)
    if (!startDate || !endDate) {
      setIsUsingPeriodFilter(false)
      setActivePeriodFilter('none')
    }
  }

  const getActivePeriodText = () => {
    if (!isUsingPeriodFilter || activePeriodFilter === 'advanced') return null
    if (startDate === endDate) return 'Hoy'
    const week = getCurrentWeekDates()
    const month = getCurrentMonthDates()
    if (startDate === week.start && endDate === week.end) return 'Semana en curso'
    if (startDate === month.start && endDate === month.end) return 'Mes en curso'
    return 'Período personalizado'
  }

  // Unique clients from current records
  const uniqueClients = useMemo(() => {
    const clientNames = new Set<string>()
    records.forEach((rec: any) => {
      clientNames.add(getClientNameForRecord(rec))
    })
    return Array.from(clientNames).sort()
  }, [records, getClientNameForRecord])

  // Close client filter when clicking outside
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

  // Available services (excluding special taxes)
  const availableServices = useMemo(() => {
    return services.filter(service =>
      service.module === 'trucking' &&
      service.isActive &&
      service.name !== 'Aduana' &&
      service.name !== 'Administration Fee'
    )
  }, [services])

  // Service functions
  const addService = () => {
    if (!additionalServiceId || additionalServiceAmount <= 0) return
    const svc = services.find((s: any) => s._id === additionalServiceId)
    if (!svc) return
    setSelectedAdditionalServices(prev => [...prev, { id: svc._id, name: svc.name, description: svc.description, amount: additionalServiceAmount }])
    setAdditionalServiceId("")
    setAdditionalServiceAmount(0)
  }

  const handleServiceSelection = (serviceId: string) => {
    const selectedService = services.find((s: any) => s._id === serviceId)
    if (selectedService) {
      setAdditionalServiceId(serviceId)
      setAdditionalServiceAmount(selectedService.price || 0)
    }
  }

  const removeService = (id: string) => {
    setSelectedAdditionalServices(prev => prev.filter(s => s.id !== id))
  }

  // Total calculation
  const totalSelected = useMemo(() => {
    const base = selectedRecords.reduce((sum: number, r: any) => sum + (r.data?.matchedPrice || r.totalValue || 0), 0)
    const extras = selectedAdditionalServices.reduce((sum, s) => sum + s.amount, 0)

    const fullContainers = selectedRecords.filter((r: any) => {
      const fe = r?.data?.fe || ''
      return fe.toString().toUpperCase().trim() === 'F'
    })
    const totalFullContainers = fullContainers.length

    let taxes = 0
    if (totalFullContainers > 0) {
      const customsTax = services.find(s => s.module === 'trucking' && s.name === 'Aduana' && s.isActive)
      const adminFeeTax = services.find(s => s.module === 'trucking' && s.name === 'Administration Fee' && s.isActive)

      if (customsTax && customsTax.price > 0) {
        taxes += customsTax.price * totalFullContainers
      }
      if (adminFeeTax && adminFeeTax.price > 0) {
        taxes += adminFeeTax.price * totalFullContainers
      }
    }

    return base + extras + taxes - discountAmount
  }, [selectedRecords, selectedAdditionalServices, services, discountAmount])

  // Client validation
  const getSelectedClientName = (): string | null => {
    if (selectedRecords.length === 0) return null
    return getClientNameForRecord(selectedRecords[0])
  }

  const areAllSelectedSameClient = (): boolean => {
    if (selectedRecords.length === 0) return true
    const firstName = getSelectedClientName() || ''
    return selectedRecords.every((r: any) => getClientNameForRecord(r) === firstName)
  }

  const normalizeName = (s: string) => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '').trim()

  const getClient = (name: string) => {
    const target = normalizeName(name)
    return clients.find((c: any) => {
      const clientName = c.name || ''
      const companyName = c.companyName || ''
      const fullName = c.fullName || ''
      return normalizeName(clientName) === target ||
        normalizeName(companyName) === target ||
        normalizeName(fullName) === target
    })
  }

  // Step navigation
  const handleNextStep = () => {
    if (step === 'select') {
      if (selectedRecords.length === 0) {
        toast({ title: 'Selecciona registros', description: 'Debes seleccionar al menos un registro', variant: 'destructive' })
        return
      }
      if (!areAllSelectedSameClient()) {
        toast({ title: 'Clientes mezclados', description: 'Selecciona registros de un único cliente', variant: 'destructive' })
        return
      }
      setStep('services')
    }
  }

  const handlePrevStep = () => {
    if (step === 'services') setStep('select')
  }

  const handleViewRecord = (record: any) => {
    setSelectedRecordForView(record)
    setIsRecordModalOpen(true)
  }

  const handleDeleteRecord = async (record: any) => {
    const recordId = record._id || record.id
    if (!recordId) return
    try {
      await dispatch(deleteRecordAsync(recordId)).unwrap()
      setSelectedRecordIds(prev => prev.filter(id => id !== recordId))
      toast({ title: "Registro eliminado", description: "El registro ha sido eliminado exitosamente" })
      handleRefresh()
    } catch (error: any) {
      toast({ title: "Error al eliminar registro", description: error?.message || "No se pudo eliminar el registro", variant: "destructive" })
    }
  }

  // Create prefactura
  const handleCreatePrefactura = async () => {
    if (selectedRecords.length === 0) {
      toast({ title: 'Sin registros', description: 'Selecciona al menos un registro', variant: 'destructive' })
      return
    }

    setIsCreatingPrefactura(true)

    try {
      const clientName = getSelectedClientName() || 'Cliente'
      const client = getClient(clientName)
      const displayRuc = (client as any)?.ruc || (client as any)?.documentNumber || ''

      const newPrefactura: PersistedInvoiceRecord = {
        id: `TRK-PRE-${Date.now().toString().slice(-6)}`,
        module: 'trucking',
        invoiceNumber: prefacturaData.prefacturaNumber,
        clientName: clientName,
        clientRuc: displayRuc,
        clientSapNumber: (client as any)?.sapCode || '',
        issueDate: new Date().toLocaleDateString('en-CA'),
        dueDate: new Date().toLocaleDateString('en-CA'),
        currency: 'USD',
        subtotal: totalSelected,
        taxAmount: 0,
        totalAmount: totalSelected,
        status: 'prefactura',
        xmlData: '',
        relatedRecordIds: selectedRecordIds,
        notes: prefacturaData.notes,
        discountAmount: discountAmount,
        discountDescription: discountAmount > 0 ? 'Descuento aplicado a prefactura' : undefined,
        details: {
          documentType: 'trasiego',
          additionalServices: selectedAdditionalServices,
        },
        createdAt: new Date().toISOString(),
      }

      const response = await dispatch(createInvoiceAsync(newPrefactura))

      if (createInvoiceAsync.fulfilled.match(response)) {
        const createdId = response.payload.id

        await dispatch(updateMultipleRecordsStatusAsync({
          recordIds: selectedRecordIds,
          status: 'prefacturado',
          invoiceId: createdId,
        })).unwrap()

        toast({
          title: 'Prefactura creada',
          description: `Se creó la prefactura ${prefacturaData.prefacturaNumber}`
        })

        // Reset
        clearSelection()
        setStep('select')
        setSelectedAdditionalServices([])
        setDiscountAmount(0)
        setPrefacturaData({
          prefacturaNumber: `TRK-PRE-${Date.now().toString().slice(-5)}`,
          notes: ''
        })
        handleRefresh()
      } else {
        toast({ title: 'Error', description: 'No se pudo crear la prefactura', variant: 'destructive' })
      }

    } catch (error: any) {
      console.error('Error creating prefactura:', error)
      toast({
        title: 'Error',
        description: error?.message || 'No se pudo crear la prefactura',
        variant: 'destructive'
      })
    } finally {
      setIsCreatingPrefactura(false)
    }
  }

  // PDF generation with autoTable and full formatting
  const generatePrefacturaPdf = () => {
    if (selectedRecords.length === 0) return null

    const clientName = getSelectedClientName() || "Cliente"
    const client = getClient(clientName)
    const issuer = getClient('PTG')

    const doc = new jsPDF()
    const lightBlue = [59, 130, 246]
    const tableWidth = 180
    const tableX = 15

    // Logo
    if (logoBase64) {
      doc.addImage(logoBase64, 'PNG', 15, 12, 35, 18)
    } else {
      doc.setFillColor(lightBlue[0], lightBlue[1], lightBlue[2])
      doc.rect(15, 15, 30, 15, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(14)
      doc.setFont(undefined as any, 'bold')
      doc.text('PTG', 30, 23, { align: 'center', baseline: 'middle' })
    }

    // Header
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(14)
    doc.setFont(undefined as any, 'bold')
    doc.text(`PREFACTURA No. ${prefacturaData.prefacturaNumber}`, 195, 20, { align: 'right' })

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

    // Issuer info
    doc.setFontSize(9)
    doc.setFont(undefined as any, 'bold')
    const issuerName = issuer ? ((issuer as any).type === 'natural' ? (issuer as any).fullName : (issuer as any).companyName) : 'PTG'
    doc.text(issuerName || 'PTG', 15, 50)
    doc.setFontSize(8)
    doc.setFont(undefined as any, 'normal')
    const issuerRuc = issuer ? ((issuer as any).type === 'natural' ? (issuer as any).documentNumber : (issuer as any).ruc) : ''
    if (issuerRuc) doc.text(`RUC: ${issuerRuc}`, 15, 54)

    // Customer info
    doc.setFontSize(9)
    doc.setFont(undefined as any, 'bold')
    doc.text('CUSTOMER:', 15, 82)
    doc.setFontSize(8)
    doc.setFont(undefined as any, 'normal')
    const ruc = (client as any)?.ruc || (client as any)?.documentNumber || 'N/A'
    const sap = (client as any)?.sapCode || ''
    const clientDisplay = client ? ((client as any).type === 'natural' ? (client as any).fullName : (client as any).companyName) : clientName
    const address = (client as any)?.address
      ? (typeof (client as any).address === 'string' ? (client as any).address : `${(client as any).address?.district || ''}, ${(client as any).address?.province || ''}`)
      : 'N/A'
    const phone = (client as any)?.phone || 'N/A'
    doc.text(clientDisplay, 15, 86)
    doc.text(`RUC: ${ruc}`, 15, 90)
    if (sap) doc.text(`SAP: ${sap}`, 60, 90)
    doc.text(`ADDRESS: ${address}`, 15, 94)
    doc.text(`TELEPHONE: ${phone}`, 15, 98)

    // Table header
    const startY = 115
    doc.setFillColor(lightBlue[0], lightBlue[1], lightBlue[2])
    doc.rect(tableX, startY, tableWidth, 8, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(10)
    doc.setFont(undefined as any, 'bold')
    doc.text('QTY', 25, startY + 5)
    doc.text('DESCRIPTION', 60, startY + 5)
    doc.text('PRICE', 140, startY + 5)
    doc.text('TOTAL', 170, startY + 5)

    // Group records by similar characteristics
    const groupedRecords = new Map<string, { records: any[], price: number, count: number }>()
    selectedRecords.forEach((r: any) => {
      const moveType = (r.data?.moveType || 'SINGLE').toString().toUpperCase()
      const routeType = (r.data?.route || 'PACIFIC').toString().toUpperCase()
      const leg = r.data?.leg || `${r.data?.from || ''} / ${r.data?.to || ''}`
      const fe = r.data?.fe ? (r.data.fe.toString().toUpperCase().trim() === 'F' ? 'FULL' : 'EMPTY') : 'FULL'
      const size = r.data?.size || r.data?.containerSize || ''
      const type = r.data?.type || r.data?.containerType || ''
      const price = (r.data?.matchedPrice || r.totalValue || 0)
      const groupKey = `${moveType}|${routeType}|${leg}|${fe}|${size}|${type}|${price}`

      if (!groupedRecords.has(groupKey)) {
        groupedRecords.set(groupKey, { records: [], price: price, count: 0 })
      }
      const group = groupedRecords.get(groupKey)!
      group.records.push(r)
      group.count += 1
    })

    // Create body rows
    const bodyRows = Array.from(groupedRecords.entries()).map(([groupKey, group]) => {
      const [moveType, routeType, leg, fe, size, type] = groupKey.split('|')
      const totalPrice = group.price * group.count
      const desc = `${moveType} ${routeType} - ${leg}/${fe}/${size}/${type}`
      return [group.count, desc, group.price.toFixed(2), totalPrice.toFixed(2)]
    })

    // Add additional services
    if (selectedAdditionalServices.length > 0) {
      selectedAdditionalServices.forEach(svc => {
        const amount = Number(svc.amount || 0)
        bodyRows.push([1, svc.description || svc.name, amount.toFixed(2), amount.toFixed(2)])
      })
    }

    // Add PTG taxes for full containers
    const fullContainers = selectedRecords.filter((r: any) => {
      const fe = r?.data?.fe || ''
      return fe.toString().toUpperCase().trim() === 'F'
    })
    const totalFullContainers = fullContainers.length

    if (totalFullContainers > 0) {
      const customsTax = services.find(s => s.module === 'trucking' && s.name === 'Aduana' && s.isActive)
      const adminFeeTax = services.find(s => s.module === 'trucking' && s.name === 'Administration Fee' && s.isActive)

      if (customsTax && customsTax.price > 0) {
        const customsTotal = customsTax.price * totalFullContainers
        bodyRows.push([totalFullContainers, 'Aduana', customsTax.price.toFixed(2), customsTotal.toFixed(2)])
      }

      if (adminFeeTax && adminFeeTax.price > 0) {
        const adminFeeTotal = adminFeeTax.price * totalFullContainers
        bodyRows.push([totalFullContainers, 'Administration Fee', adminFeeTax.price.toFixed(2), adminFeeTotal.toFixed(2)])
      }
    }

    autoTable(doc, {
      startY: startY + 10,
      head: [],
      body: bodyRows,
      theme: 'grid',
      styles: { fontSize: 9, lineWidth: 0.2, lineColor: [180, 180, 180] },
      columnStyles: { 0: { cellWidth: 20 }, 1: { cellWidth: 90 }, 2: { cellWidth: 35, halign: 'right' }, 3: { cellWidth: 35, halign: 'right' } },
      margin: { left: tableX },
    })

    let y = (doc as any).lastAutoTable.finalY + 8

    // Total
    doc.setTextColor(0, 0, 0)
    doc.setFont(undefined as any, 'bold')
    doc.setFontSize(12)
    doc.text('TOTAL:', 120, y)
    doc.setFontSize(16)
    doc.text(`$${totalSelected.toFixed(2)}`, 195, y, { align: 'right' })
    y += 14

    // Terms and conditions
    doc.setFillColor(lightBlue[0], lightBlue[1], lightBlue[2])
    doc.rect(15, y, tableWidth, 8, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(10)
    doc.setFont(undefined as any, 'bold')
    doc.text('TERMS AND CONDITIONS', 20, y + 5)
    doc.setTextColor(0, 0, 0)
    y += 14
    doc.setFont(undefined as any, 'normal')
    doc.setFontSize(9)
    doc.text(`Make check payments payable to: ${issuerName || 'PTG'}`, 15, y)
    y += 4
    doc.text('Money transfer to: Banco General - Checking Account', 15, y)
    y += 4
    doc.text('Account No. 03-72-01-124081-1', 15, y)
    y += 8
    doc.text('I Confirmed that I have received the original prefactura and documents.', 15, y)
    y += 8
    doc.text('Received by: ____________', 15, y)
    doc.text('Date: ____________', 90, y)

    return doc.output('blob')
  }

  const handleGeneratePDF = () => {
    if (selectedRecords.length === 0) {
      toast({ title: "Sin registros", description: "Selecciona al menos un registro", variant: "destructive" })
      return
    }

    try {
      const pdfBlob = generatePrefacturaPdf()
      if (pdfBlob instanceof Blob) {
        const clientName = getSelectedClientName() || 'Cliente'
        const client = getClient(clientName)
        const clientDisplay = client ? ((client as any).type === 'natural' ? (client as any).fullName : (client as any).companyName) : clientName
        const safeName = (clientDisplay || 'cliente').replace(/[^a-z0-9_-]+/gi, '_')

        const url = URL.createObjectURL(pdfBlob)
        const a = document.createElement('a')
        a.href = url
        a.download = `prefactura_trucking_${safeName}.pdf`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)

        toast({ title: 'PDF generado', description: 'El archivo se ha descargado' })
      }
    } catch (error) {
      console.error('Error generando PDF:', error)
      toast({ title: 'Error', description: 'No se pudo generar el PDF', variant: 'destructive' })
    }
  }

  return (
    <SectionGuard module="trucking" section="prefactura">
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-blue-600 flex items-center justify-center">
            <Truck className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              Crear Prefactura - PTG
              <Badge variant="secondary" className="text-xs">
                <Zap className="h-3 w-3 mr-1" />
                Rápido
              </Badge>
            </h1>
            <p className="text-muted-foreground">Selecciona registros de trasiego para crear prefacturas</p>
          </div>
        </div>

        {step === 'select' && (
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center justify-between">
                <span>Selección de Registros ({selectedRecordIds.length} seleccionados)</span>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={handleRefresh}>
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Actualizar
                  </Button>
                  {selectedRecordIds.length > 0 && (
                    <>
                      <Button variant="outline" size="sm" onClick={clearSelection}>
                        <X className="h-4 w-4 mr-1" />
                        Limpiar
                      </Button>
                      <Button onClick={handleNextStep}>
                        Continuar ({selectedRecordIds.length})
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </>
                  )}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder="Buscar por contenedor, cliente..."
                    className="pl-9"
                  />
                </div>
                <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v as any); setCurrentPage(1) }}>
                  <SelectTrigger className="w-[150px]"><SelectValue placeholder="Estado" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="pendiente">Pendiente</SelectItem>
                    <SelectItem value="completado">Completado</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex gap-1 flex-wrap">
                  <Button variant={activePeriodFilter === 'today' ? 'default' : 'outline'} size="sm" onClick={() => handleFilterByPeriod('today')} className="h-8">Hoy</Button>
                  <Button variant={activePeriodFilter === 'week' ? 'default' : 'outline'} size="sm" onClick={() => handleFilterByPeriod('week')} className="h-8">Semana</Button>
                  <Button variant={activePeriodFilter === 'month' ? 'default' : 'outline'} size="sm" onClick={() => handleFilterByPeriod('month')} className="h-8">Mes</Button>
                  <Button variant={activePeriodFilter === 'advanced' ? 'default' : 'outline'} size="sm" onClick={() => handleFilterByPeriod('advanced')} className="h-8">Avanzado</Button>
                </div>
              </div>

              {/* Active filter badges */}
              {isUsingPeriodFilter && activePeriodFilter !== 'advanced' && (
                <div className="flex items-center gap-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
                  <Badge variant="default" className="bg-blue-600 text-white text-xs">{getActivePeriodText()}</Badge>
                  <span className="text-sm text-blue-700">{startDate} - {endDate}</span>
                  <Button variant="ghost" size="sm" onClick={() => { setIsUsingPeriodFilter(false); setActivePeriodFilter("none"); setStartDate(""); setEndDate("") }} className="h-6 w-6 p-0 ml-auto"><X className="h-3 w-3" /></Button>
                </div>
              )}

              {clientFilter !== 'all' && (
                <div className="flex items-center gap-2 p-2 bg-orange-50 border border-orange-200 rounded-md">
                  <Badge variant="default" className="bg-orange-600 text-white text-xs">Filtro Cliente</Badge>
                  <span className="text-sm text-orange-700">Mostrando registros de: {clientFilter}</span>
                  <Button variant="ghost" size="sm" onClick={() => { setClientFilter('all'); setCurrentPage(1) }} className="h-6 w-6 p-0 ml-auto"><X className="h-3 w-3" /></Button>
                </div>
              )}

              {/* Info banner explaining what records are shown */}
              <div className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                <div className="flex items-center justify-center h-8 w-8 rounded-full bg-emerald-100">
                  <Check className="h-4 w-4 text-emerald-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-emerald-800">
                    Mostrando {pagination.total} registros pendientes de trasiego
                  </p>
                  <p className="text-xs text-emerald-600">
                    Solo se muestran registros listos para prefacturar. Los registros ya prefacturados o facturados no aparecen aqui.
                  </p>
                </div>
              </div>

              {/* Records table */}
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">
                        <Checkbox
                          checked={records.length > 0 && records.every(r => isSelected(r._id || r.id))}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              const newIds = records.map(r => r._id || r.id)
                              setSelectedRecordIds(prev => [...new Set([...prev, ...newIds])])
                              records.forEach(r => {
                                setSelectedRecordsCache(prev => new Map(prev).set(r._id || r.id, r))
                              })
                            } else {
                              const idsToRemove = new Set(records.map(r => r._id || r.id))
                              setSelectedRecordIds(prev => prev.filter(id => !idsToRemove.has(id)))
                            }
                          }}
                        />
                      </TableHead>
                      <TableHead>Contenedor</TableHead>
                      <TableHead>
                        <div className="flex items-center justify-between relative" data-client-filter>
                          <span>Cliente</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowClientFilter(!showClientFilter)}
                            className={`h-6 w-6 p-0 ${clientFilter !== 'all' ? 'text-blue-600' : 'text-gray-500'}`}
                          >
                            <Filter className="h-3 w-3" />
                          </Button>
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
                      <TableHead>Ruta</TableHead>
                      <TableHead>Precio</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      Array.from({ length: 10 }).map((_, idx) => (
                        <TableRow key={`skeleton-${idx}`}>
                          <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                          <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                          <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                          <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                          <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                          <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                          <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                          <TableCell><Skeleton className="h-8 w-16" /></TableCell>
                        </TableRow>
                      ))
                    ) : error ? (
                      <TableRow><TableCell colSpan={8} className="py-8 text-center text-red-600">{error}</TableCell></TableRow>
                    ) : records.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="py-12 text-center">
                          <div className="flex flex-col items-center justify-center space-y-4">
                            <div className="rounded-full bg-blue-100 p-4">
                              <Database className="h-10 w-10 text-blue-600" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900">Sin registros</h3>
                            <p className="text-sm text-muted-foreground text-center max-w-sm">
                              No hay registros de trasiego disponibles para prefacturar
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      records.map((rec: any) => {
                        const recordId = rec._id || rec.id
                        const d = rec.data || {}
                        const container = d.container || d.contenedor || 'N/A'
                        const leg = d.leg || `${d.from || ''} / ${d.to || ''}`
                        const price = d.matchedPrice || rec.totalValue || 0
                        const clientName = getClientNameForRecord(rec)
                        const status = rec.status || 'pendiente'
                        const createdAt = convertExcelDateToReadable(rec.createdAt)

                        return (
                          <TableRow key={recordId} className={isSelected(recordId) ? 'bg-blue-50' : ''}>
                            <TableCell>
                              <Checkbox
                                checked={isSelected(recordId)}
                                onCheckedChange={(checked) => toggleRecord(recordId, !!checked, rec)}
                              />
                            </TableCell>
                            <TableCell className="font-mono text-sm">{container}</TableCell>
                            <TableCell>{clientName}</TableCell>
                            <TableCell>{leg}</TableCell>
                            <TableCell className="font-bold">${price.toFixed(2)}</TableCell>
                            <TableCell>{createdAt}</TableCell>
                            <TableCell>
                              <Badge variant={status === 'completado' ? 'default' : 'secondary'}>
                                {status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button variant="ghost" size="sm" onClick={() => handleViewRecord(rec)} className="h-8 w-8"><Eye className="h-4 w-4" /></Button>
                                {isAdmin && (
                                  <Button variant="ghost" size="sm" onClick={() => handleDeleteRecord(rec)} className="h-8 w-8 text-red-600"><Trash2 className="h-4 w-4" /></Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="text-sm text-muted-foreground">
                    Página {pagination.current} de {pagination.pages} ({pagination.total} registros)
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
        )}

        {step === 'services' && (
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={handlePrevStep}>
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    Volver
                  </Button>
                  Servicios y Prefactura
                </span>
                <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={handleGeneratePDF}>
                    <Download className="h-4 w-4 mr-1" />
                    Descargar PDF
                  </Button>
                  <Button onClick={handleCreatePrefactura} disabled={isCreatingPrefactura}>
                    {isCreatingPrefactura && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                    <Check className="h-4 w-4 mr-1" />
                    Crear Prefactura
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-sm text-muted-foreground">Cliente</div>
                    <div className="text-lg font-semibold">{getSelectedClientName()}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-sm text-muted-foreground">Registros seleccionados</div>
                    <div className="text-lg font-semibold">{selectedRecords.length}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-sm text-muted-foreground">Total</div>
                    <div className="text-2xl font-bold text-green-600">${totalSelected.toFixed(2)}</div>
                  </CardContent>
                </Card>
              </div>

              {/* Prefactura data */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Número de Prefactura</Label>
                  <Input
                    value={prefacturaData.prefacturaNumber}
                    onChange={(e) => setPrefacturaData(prev => ({ ...prev, prefacturaNumber: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Notas</Label>
                  <Textarea
                    value={prefacturaData.notes}
                    onChange={(e) => setPrefacturaData(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Notas adicionales..."
                    rows={2}
                  />
                </div>
              </div>

              {/* Additional services */}
              <div className="space-y-4">
                <h3 className="font-semibold">Servicios Adicionales</h3>
                <div className="flex gap-2">
                  <Select value={additionalServiceId} onValueChange={handleServiceSelection}>
                    <SelectTrigger className="w-[250px]"><SelectValue placeholder="Seleccionar servicio" /></SelectTrigger>
                    <SelectContent>
                      {availableServices.map((svc: any) => (
                        <SelectItem key={svc._id} value={svc._id}>
                          {svc.name} - ${svc.price}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    value={additionalServiceAmount}
                    onChange={(e) => setAdditionalServiceAmount(Number(e.target.value))}
                    placeholder="Monto"
                    className="w-[120px]"
                  />
                  <Button variant="outline" onClick={addService}>
                    <Plus className="h-4 w-4 mr-1" />
                    Agregar
                  </Button>
                </div>

                {selectedAdditionalServices.length > 0 && (
                  <div className="space-y-2">
                    {selectedAdditionalServices.map((svc, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
                        <span>{svc.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">${svc.amount.toFixed(2)}</span>
                          <Button variant="ghost" size="sm" onClick={() => removeService(svc.id)}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Discount */}
              <div className="space-y-2">
                <Label>Descuento</Label>
                <DiscountInput
                  value={discountAmount}
                  onChange={setDiscountAmount}
                  maxAmount={totalSelected + discountAmount}
                />
              </div>

              {/* Selected records summary */}
              <div className="space-y-2">
                <h3 className="font-semibold">Registros Incluidos ({selectedRecords.length})</h3>
                <div className="max-h-48 overflow-y-auto border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Contenedor</TableHead>
                        <TableHead>Ruta</TableHead>
                        <TableHead className="text-right">Precio</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedRecords.map((rec: any) => {
                        const d = rec.data || {}
                        return (
                          <TableRow key={rec._id || rec.id}>
                            <TableCell className="font-mono text-sm">{d.container || d.contenedor || 'N/A'}</TableCell>
                            <TableCell>{d.leg || `${d.from || ''} / ${d.to || ''}`}</TableCell>
                            <TableCell className="text-right font-medium">${(d.matchedPrice || rec.totalValue || 0).toFixed(2)}</TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Record detail modal */}
        <Dialog open={isRecordModalOpen} onOpenChange={setIsRecordModalOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Detalles del Registro</DialogTitle>
            </DialogHeader>
            {selectedRecordForView && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {Object.entries(selectedRecordForView.data || {}).map(([key, value]) => (
                    <div key={key} className="space-y-1">
                      <Label className="text-xs text-muted-foreground capitalize">{key.replace(/([A-Z])/g, ' $1')}</Label>
                      <div className="text-sm font-medium">{String(value) || 'N/A'}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Date filter modal */}
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
