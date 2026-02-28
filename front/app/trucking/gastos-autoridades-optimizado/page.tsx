"use client"

import React, { useEffect, useState, useMemo, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { useAppDispatch, useAppSelector } from "@/lib/hooks"
import {
  FileText, Download, ArrowLeft, Eye, Loader2, Trash2, Calendar, X, Search,
  RefreshCw, User, ChevronLeft, ChevronRight, Zap, Check, Briefcase, ChevronDown, ChevronUp
} from "lucide-react"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import {
  deleteAutoridadesRecord,
  createInvoiceAsync,
  updateMultipleAutoridadesStatusAsync,
  type PersistedInvoiceRecord,
} from "@/lib/features/records/recordsSlice"
import { selectAllClients, fetchClients } from "@/lib/features/clients/clientsSlice"
import { selectCurrentUser } from "@/lib/features/auth/authSlice"
import { SectionGuard } from "@/components/section-guard"
import { Skeleton } from "@/components/ui/skeleton"
import { createApiUrl } from "@/lib/api-config"

interface PaginationInfo {
  current: number
  pages: number
  total: number
}

const ITEMS_PER_PAGE = 20

export default function TruckingGastosAutoridadesOptimizadoPage() {
  const { toast } = useToast()
  const dispatch = useAppDispatch()

  // Step state
  type Step = 'select' | 'pdf'
  const [step, setStep] = useState<Step>('select')

  // Server-side paginated records
  const [records, setRecords] = useState<any[]>([])
  const [pagination, setPagination] = useState<PaginationInfo>({ current: 1, pages: 1, total: 0 })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Selection - stored as BL numbers to persist across pages
  const [selectedBLNumbers, setSelectedBLNumbers] = useState<string[]>([])
  const [selectedRecordsCache, setSelectedRecordsCache] = useState<Map<string, any[]>>(new Map())

  // Expansion state
  const [expandedBLNumbers, setExpandedBLNumbers] = useState<string[]>([])

  // Filters
  const [search, setSearch] = useState<string>("")
  const [authFilter, setAuthFilter] = useState<'all' | 'APA' | 'QUA'>('all')
  const [isUsingPeriodFilter, setIsUsingPeriodFilter] = useState(false)
  const [activePeriodFilter, setActivePeriodFilter] = useState<'none' | 'today' | 'week' | 'month' | 'advanced'>('none')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [isDateFilterModalOpen, setIsDateFilterModalOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)

  // PDF states
  const [documentData, setDocumentData] = useState({ number: `AUTH-${Date.now().toString().slice(-5)}`, notes: "" })
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null)
  const [showPdfPreview, setShowPdfPreview] = useState(false)
  const [isCreatingPrefactura, setIsCreatingPrefactura] = useState(false)

  // Redux state
  const clients = useAppSelector(selectAllClients)
  const currentUser = useAppSelector(selectCurrentUser)

  // Admin check
  const userRoles = currentUser?.roles || (currentUser?.role ? [currentUser.role] : [])
  const isAdmin = userRoles.includes('administrador')

  // Logo for PDF
  const [logoBase64, setLogoBase64] = useState<string | undefined>(undefined)

  // Load initial data
  useEffect(() => {
    dispatch(fetchClients())

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
    auth?: string
    search?: string
    startDate?: string
    endDate?: string
  }) => {
    setLoading(true)
    setError(null)

    try {
      const token = localStorage.getItem('token')
      if (!token) throw new Error('No autenticado')

      let url = createApiUrl(`/api/records/autoridades?page=${page}&limit=${ITEMS_PER_PAGE}`)

      if (filters?.auth && filters.auth !== 'all') {
        url += `&auth=${filters.auth}`
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

      if (data.success) {
        recordsData = data.data || []
        paginationData = data.pagination || paginationData
      } else if (Array.isArray(data)) {
        // Legacy format - no pagination
        recordsData = data
        paginationData = { current: 1, pages: 1, total: data.length }
      }

      // Backend now filters out prefacturado/facturado by default
      setRecords(recordsData)
      setPagination(paginationData)
    } catch (err) {
      console.error('Error fetching autoridades records:', err)
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }, [])

  // Load records on mount and when filters change
  useEffect(() => {
    fetchRecords(currentPage, {
      auth: authFilter,
      search,
      startDate: isUsingPeriodFilter ? startDate : undefined,
      endDate: isUsingPeriodFilter ? endDate : undefined
    })
  }, [currentPage, authFilter, isUsingPeriodFilter, startDate, endDate, fetchRecords])

  const handleSearch = () => {
    setCurrentPage(1)
    fetchRecords(1, {
      auth: authFilter,
      search,
      startDate: isUsingPeriodFilter ? startDate : undefined,
      endDate: isUsingPeriodFilter ? endDate : undefined
    })
  }

  const handleRefresh = () => {
    fetchRecords(currentPage, {
      auth: authFilter,
      search,
      startDate: isUsingPeriodFilter ? startDate : undefined,
      endDate: isUsingPeriodFilter ? endDate : undefined
    })
  }

  const goToPage = (page: number) => {
    if (page >= 1 && page <= pagination.pages) {
      setCurrentPage(page)
    }
  }

  // Group records by BL Number
  const groupedByBL = useMemo(() => {
    const groups = new Map<string, any[]>()
    records.forEach((record: any) => {
      const blNumber = record.blNumber || 'Sin BL'
      if (!groups.has(blNumber)) {
        groups.set(blNumber, [])
      }
      groups.get(blNumber)!.push(record)
    })
    return groups
  }, [records])

  // Selection functions
  const toggleBLSelection = (blNumber: string, checked: boolean) => {
    if (checked) {
      setSelectedBLNumbers(prev => [...prev, blNumber])
      const blRecords = groupedByBL.get(blNumber) || []
      setSelectedRecordsCache(prev => new Map(prev).set(blNumber, blRecords))
    } else {
      setSelectedBLNumbers(prev => prev.filter(bl => bl !== blNumber))
    }
  }

  const isSelected = (blNumber: string) => selectedBLNumbers.includes(blNumber)

  const clearSelection = () => {
    setSelectedBLNumbers([])
    setSelectedRecordsCache(new Map())
  }

  // Get all selected records
  const selectedRecords = useMemo(() => {
    const selected: any[] = []
    selectedBLNumbers.forEach(blNumber => {
      const cached = selectedRecordsCache.get(blNumber)
      if (cached) {
        selected.push(...cached)
      } else {
        const groupRecords = groupedByBL.get(blNumber) || []
        selected.push(...groupRecords)
      }
    })
    return selected
  }, [selectedBLNumbers, selectedRecordsCache, groupedByBL])

  // Expansion functions
  const toggleExpansion = (blNumber: string) => {
    setExpandedBLNumbers(prev =>
      prev.includes(blNumber)
        ? prev.filter(bl => bl !== blNumber)
        : [...prev, blNumber]
    )
  }

  const isExpanded = (blNumber: string) => expandedBLNumbers.includes(blNumber)

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
      case 'advanced': setIsDateFilterModalOpen(true); break
    }
  }

  const handleApplyDateFilter = (start: string, end: string) => {
    setStartDate(start)
    setEndDate(end)
    setIsUsingPeriodFilter(true)
    setActivePeriodFilter('advanced')
    setIsDateFilterModalOpen(false)
    setCurrentPage(1)
  }

  const handleCancelDateFilter = () => {
    setIsDateFilterModalOpen(false)
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

  // Calculate total
  const totalSelected = useMemo(() => {
    let total = 0
    selectedBLNumbers.forEach(blNumber => {
      const groupRecords = selectedRecordsCache.get(blNumber) || groupedByBL.get(blNumber) || []

      // NOTF: charge once per BL Number
      let notfRecord = groupRecords
        .filter((r: any) => {
          const hasValidOrder = r.order && !isNaN(parseFloat(r.order))
          if (!hasValidOrder) return false
          const notfStr = r.notf ? String(r.notf).trim() : ''
          if (!notfStr || notfStr === 'N/A' || notfStr === '') return false
          const parsed = parseFloat(notfStr)
          return !isNaN(parsed) && parsed > 0
        })
        .sort((a: any, b: any) => parseFloat(a.order) - parseFloat(b.order))[0]

      if (!notfRecord) {
        notfRecord = groupRecords.find((r: any) => {
          const notfStr = r.notf ? String(r.notf).trim() : ''
          if (!notfStr || notfStr === 'N/A' || notfStr === '') return false
          const parsed = parseFloat(notfStr)
          return !isNaN(parsed) && parsed > 0
        })
      }

      let notfValue = 0
      if (notfRecord?.notf) {
        const notfStr = String(notfRecord.notf).trim()
        if (notfStr && notfStr !== 'N/A' && notfStr !== '') {
          const parsed = parseFloat(notfStr)
          if (!isNaN(parsed) && parsed > 0) {
            notfValue = parsed
          }
        }
      }

      // SEAL: charge per container
      const sealTotal = groupRecords.reduce((sum: number, r: any) => {
        if (r.seal) {
          const sealStr = String(r.seal).trim()
          if (sealStr && sealStr !== 'N/A' && sealStr !== '') {
            const parsed = parseFloat(sealStr)
            if (!isNaN(parsed) && parsed > 0) {
              return sum + parsed
            }
          }
        }
        return sum
      }, 0)

      total += notfValue + sealTotal
    })
    return total
  }, [selectedBLNumbers, selectedRecordsCache, groupedByBL])

  // Client functions
  const normalizeName = (s: string) => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '').trim()

  const getClient = (name: string) => {
    const target = normalizeName(name)
    return clients.find((c: any) => {
      const n = c.type === 'juridico' ? (c.companyName || '') : (c.fullName || '')
      return normalizeName(n) === target
    })
  }

  // Get customer name from first selected record
  const getSelectedCustomerName = (): string | null => {
    if (selectedRecords.length === 0) return null
    return selectedRecords[0].customer || 'Cliente'
  }

  // Step navigation
  const handleNextStep = () => {
    if (selectedRecords.length === 0) {
      toast({ title: 'Selecciona registros', description: 'Debes seleccionar al menos un BL', variant: 'destructive' })
      return
    }
    setStep('pdf')
  }

  const handlePrevStep = () => {
    setStep('select')
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm("¿Eliminar este registro?")) return
    try {
      await dispatch(deleteAutoridadesRecord(id)).unwrap()
      toast({ title: "Registro eliminado" })
      handleRefresh()
    } catch (e: any) {
      toast({ title: "Error al eliminar", description: e.message, variant: "destructive" })
    }
  }

  // Create prefactura
  const handleCreatePrefactura = async () => {
    if (selectedRecords.length === 0) {
      toast({ title: 'Sin registros', description: 'Selecciona al menos un BL', variant: 'destructive' })
      return
    }

    setIsCreatingPrefactura(true)

    try {
      const customerName = getSelectedCustomerName() || 'Cliente'
      const client = getClient(customerName)
      const displayRuc = (client as any)?.ruc || (client as any)?.documentNumber || ''

      const relatedIds = selectedRecords.map((r: any) => r._id || r.id)

      const newPrefactura: PersistedInvoiceRecord = {
        id: `AUTH-${Date.now().toString().slice(-6)}`,
        module: 'trucking',
        invoiceNumber: documentData.number,
        clientName: customerName,
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
        relatedRecordIds: relatedIds,
        notes: documentData.notes,
        details: {
          documentType: 'gastos-autoridades',
          blNumbers: selectedBLNumbers
        },
        createdAt: new Date().toISOString(),
      }

      const response = await dispatch(createInvoiceAsync(newPrefactura))

      if (createInvoiceAsync.fulfilled.match(response)) {
        const createdId = response.payload.id

        await dispatch(updateMultipleAutoridadesStatusAsync({
          recordIds: relatedIds,
          status: 'prefacturado',
          invoiceId: createdId,
        })).unwrap()

        toast({
          title: 'Prefactura creada',
          description: `Se creó la prefactura ${documentData.number}`
        })

        // Reset
        clearSelection()
        setStep('select')
        setDocumentData({
          number: `AUTH-${Date.now().toString().slice(-5)}`,
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
  const generateAutoridadesPdf = () => {
    if (selectedRecords.length === 0) return null

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
    doc.text(`GASTOS AUTORIDADES No. ${documentData.number}`, 195, 20, { align: 'right' })

    const currentDate = new Date()
    const day = currentDate.getDate().toString().padStart(2, '0')
    const month = (currentDate.getMonth() + 1).toString().padStart(2, '0')
    const year = currentDate.getFullYear()
    doc.setFontSize(10)
    doc.text('DATE:', 195, 30, { align: 'right' })
    doc.setFontSize(12)
    doc.text(`${day} ${month} ${year}`, 195, 35, { align: 'right' })

    // Issuer info (PTG)
    doc.setFontSize(9)
    doc.setFont(undefined as any, 'bold')
    doc.text('PTG', 15, 50)
    doc.setFontSize(8)
    doc.setFont(undefined as any, 'normal')
    doc.text('RUC: 2207749-1-774410 DV 10', 15, 54)
    doc.text('Howard, Panama Pacifico', 15, 58)
    doc.text('TEL: (507) 838-7470', 15, 62)

    // Customer info
    const firstRecord = selectedRecords[0]
    const customerName = firstRecord?.customer || 'Cliente'
    let customer = null
    if (firstRecord?.clientId) {
      customer = clients.find((c: any) => (c._id || c.id) === firstRecord.clientId)
    }
    if (!customer) {
      customer = getClient(customerName)
    }

    doc.setFontSize(9)
    doc.setFont(undefined as any, 'bold')
    doc.text('CUSTOMER:', 15, 82)
    doc.setFontSize(8)
    doc.setFont(undefined as any, 'normal')

    const clientDisplay = customer
      ? ((customer as any).type === 'natural' ? (customer as any).fullName : (customer as any).companyName)
      : customerName
    const ruc = (customer as any)?.ruc || (customer as any)?.documentNumber || 'N/A'
    const sap = (customer as any)?.sapCode || ''
    const address = (customer as any)?.address
      ? (typeof (customer as any).address === 'string' ? (customer as any).address : `${(customer as any).address?.district || ''}, ${(customer as any).address?.province || ''}`)
      : 'N/A'
    const phone = (customer as any)?.phone || 'N/A'

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
    doc.text('BL NUMBER', 15, startY + 5)
    doc.text('CLIENT', 45, startY + 5)
    doc.text('CONTAINERS', 75, startY + 5)
    doc.text('AUTH', 105, startY + 5)
    doc.text('PRICE', 130, startY + 5)
    doc.text('TOTAL', 170, startY + 5)

    // Create rows grouped by BL Number
    const bodyRows: any[] = []
    let grandTotal = 0

    selectedBLNumbers.forEach(blNumber => {
      const groupRecords = selectedRecordsCache.get(blNumber) || groupedByBL.get(blNumber) || []
      const containers = groupRecords.map((r: any) => r.container).join(', ')
      const auth = groupRecords[0]?.auth || ''

      // NOTF: once per BL Number
      let notfRecord = groupRecords
        .filter((r: any) => {
          const hasValidOrder = r.order && !isNaN(parseFloat(r.order))
          if (!hasValidOrder) return false
          const notfStr = r.notf ? String(r.notf).trim() : ''
          if (!notfStr || notfStr === 'N/A' || notfStr === '') return false
          const parsed = parseFloat(notfStr)
          return !isNaN(parsed) && parsed > 0
        })
        .sort((a: any, b: any) => parseFloat(a.order) - parseFloat(b.order))[0]

      if (!notfRecord) {
        notfRecord = groupRecords.find((r: any) => {
          const notfStr = r.notf ? String(r.notf).trim() : ''
          if (!notfStr || notfStr === 'N/A' || notfStr === '') return false
          const parsed = parseFloat(notfStr)
          return !isNaN(parsed) && parsed > 0
        })
      }

      let notfValue = 0
      if (notfRecord?.notf) {
        const notfStr = String(notfRecord.notf).trim()
        if (notfStr && notfStr !== 'N/A' && notfStr !== '') {
          const parsed = parseFloat(notfStr)
          if (!isNaN(parsed) && parsed > 0) {
            notfValue = parsed
          }
        }
      }

      // SEAL: per container
      const sealTotal = groupRecords.reduce((sum: number, r: any) => {
        if (r.seal) {
          const sealStr = String(r.seal).trim()
          if (sealStr && sealStr !== 'N/A' && sealStr !== '') {
            const parsed = parseFloat(sealStr)
            if (!isNaN(parsed) && parsed > 0) {
              return sum + parsed
            }
          }
        }
        return sum
      }, 0)

      const blTotal = notfValue + sealTotal
      grandTotal += blTotal

      const priceDescription = []
      if (notfValue > 0) priceDescription.push(`NOTF: $${notfValue.toFixed(2)}`)
      if (sealTotal > 0) priceDescription.push(`SEAL: $${sealTotal.toFixed(2)}`)

      bodyRows.push([
        blNumber,
        groupRecords[0]?.customer || 'N/A',
        containers,
        auth,
        priceDescription.join('\n') || '-',
        `$${blTotal.toFixed(2)}`
      ])
    })

    autoTable(doc, {
      startY: startY + 10,
      head: [],
      body: bodyRows,
      theme: 'grid',
      styles: { fontSize: 9, lineWidth: 0.2, lineColor: [180, 180, 180] },
      columnStyles: {
        0: { cellWidth: 30 },
        1: { cellWidth: 30 },
        2: { cellWidth: 40 },
        3: { cellWidth: 20 },
        4: { cellWidth: 40 },
        5: { cellWidth: 20, halign: 'right' }
      },
      margin: { left: tableX },
    })

    let y = (doc as any).lastAutoTable.finalY + 10

    // Total
    doc.setTextColor(0, 0, 0)
    doc.setFont(undefined as any, 'bold')
    doc.setFontSize(12)
    doc.text('TOTAL GENERAL:', 120, y)
    doc.setFontSize(16)
    doc.text(`$${grandTotal.toFixed(2)}`, 195, y, { align: 'right' })
    y += 20

    // Notes
    if (documentData.notes) {
      doc.setTextColor(0, 0, 0)
      doc.setFontSize(10)
      doc.setFont(undefined as any, 'bold')
      doc.text('NOTAS:', 15, y)
      doc.setFont(undefined as any, 'normal')
      y += 5
      const notes = doc.splitTextToSize(documentData.notes, 180)
      doc.text(notes, 15, y)
      y += 10
    }

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
    doc.text('Make check payments payable to: PTG', 15, y)
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
      toast({ title: "Sin registros", description: "Selecciona al menos un BL", variant: "destructive" })
      return
    }

    try {
      const pdfBlob = generateAutoridadesPdf()
      if (pdfBlob instanceof Blob) {
        const url = URL.createObjectURL(pdfBlob)
        const a = document.createElement('a')
        a.href = url
        a.download = `gastos_autoridades_${documentData.number}.pdf`
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
    <SectionGuard module="trucking" section="gastos-autoridades">
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-orange-600 flex items-center justify-center">
            <Briefcase className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              Gastos Autoridades - PTG
              <Badge variant="secondary" className="text-xs">
                <Zap className="h-3 w-3 mr-1" />
                Rápido
              </Badge>
            </h1>
            <p className="text-muted-foreground">Selecciona BL Numbers para crear prefacturas de gastos de autoridades</p>
          </div>
        </div>

        {step === 'select' && (
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center justify-between">
                <span>Selección de BL Numbers ({selectedBLNumbers.length} seleccionados)</span>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={handleRefresh}>
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Actualizar
                  </Button>
                  {selectedBLNumbers.length > 0 && (
                    <>
                      <Button variant="outline" size="sm" onClick={clearSelection}>
                        <X className="h-4 w-4 mr-1" />
                        Limpiar
                      </Button>
                      <Button onClick={handleNextStep}>
                        Continuar ({selectedBLNumbers.length})
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
                    placeholder="Buscar por BL, factura, contenedor..."
                    className="pl-9"
                  />
                </div>
                <Select value={authFilter} onValueChange={(v) => { setAuthFilter(v as any); setCurrentPage(1) }}>
                  <SelectTrigger className="w-[150px]"><SelectValue placeholder="Autoridad" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="APA">APA</SelectItem>
                    <SelectItem value="QUA">QUA</SelectItem>
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

              {authFilter !== 'all' && (
                <div className="flex items-center gap-2 p-2 bg-orange-50 border border-orange-200 rounded-md">
                  <Badge variant="default" className="bg-orange-600 text-white text-xs">Filtro Autoridad</Badge>
                  <span className="text-sm text-orange-700">Mostrando solo: {authFilter}</span>
                  <Button variant="ghost" size="sm" onClick={() => { setAuthFilter('all'); setCurrentPage(1) }} className="h-6 w-6 p-0 ml-auto"><X className="h-3 w-3" /></Button>
                </div>
              )}

              {/* Info banner explaining what records are shown */}
              <div className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                <div className="flex items-center justify-center h-8 w-8 rounded-full bg-emerald-100">
                  <Check className="h-4 w-4 text-emerald-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-emerald-800">
                    Mostrando {pagination.total} registros pendientes
                  </p>
                  <p className="text-xs text-emerald-600">
                    Solo se muestran registros listos para prefacturar. Los registros ya prefacturados o facturados no aparecen aqui.
                  </p>
                </div>
              </div>

              {/* Records table grouped by BL */}
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">
                        <Checkbox
                          checked={groupedByBL.size > 0 && Array.from(groupedByBL.keys()).every(bl => selectedBLNumbers.includes(bl))}
                          ref={(el) => {
                            if (el) {
                              const allBLs = Array.from(groupedByBL.keys());
                              const selectedCount = allBLs.filter(bl => selectedBLNumbers.includes(bl)).length;
                              (el as any).indeterminate = selectedCount > 0 && selectedCount < allBLs.length;
                            }
                          }}
                          onCheckedChange={(checked) => {
                            const allBLs = Array.from(groupedByBL.keys());
                            if (checked) {
                              // Select all BLs on current page
                              const newSelected = [...new Set([...selectedBLNumbers, ...allBLs])];
                              setSelectedBLNumbers(newSelected);
                              // Cache records for all selected BLs
                              const newCache = new Map(selectedRecordsCache);
                              allBLs.forEach(bl => {
                                const blRecords = groupedByBL.get(bl) || [];
                                newCache.set(bl, blRecords);
                              });
                              setSelectedRecordsCache(newCache);
                              toast({
                                title: "Selección",
                                description: `${allBLs.length} BL Numbers seleccionados de esta página`
                              });
                            } else {
                              // Deselect all BLs on current page
                              setSelectedBLNumbers(prev => prev.filter(bl => !allBLs.includes(bl)));
                            }
                          }}
                          title="Seleccionar todos de esta página"
                        />
                      </TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                      <TableHead>BL Number</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Autoridad</TableHead>
                      <TableHead>Contenedores</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      Array.from({ length: 10 }).map((_, idx) => (
                        <TableRow key={`skeleton-${idx}`}>
                          <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                          <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                          <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                          <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                          <TableCell><Skeleton className="h-5 w-10" /></TableCell>
                          <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                        </TableRow>
                      ))
                    ) : error ? (
                      <TableRow><TableCell colSpan={7} className="py-8 text-center text-red-600">{error}</TableCell></TableRow>
                    ) : groupedByBL.size === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="py-12 text-center">
                          <div className="flex flex-col items-center justify-center space-y-4">
                            <div className="rounded-full bg-orange-100 p-4">
                              <Briefcase className="h-10 w-10 text-orange-600" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900">Sin registros</h3>
                            <p className="text-sm text-muted-foreground text-center max-w-sm">
                              No hay registros de gastos de autoridades disponibles
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      Array.from(groupedByBL.entries()).map(([blNumber, blRecords]) => {
                        const firstRecord = blRecords[0]
                        const customer = firstRecord.customer || 'N/A'
                        const auth = firstRecord.auth || 'N/A'
                        const containerCount = blRecords.length

                        // Calculate total for this BL
                        let blTotal = 0
                        const notfRecord = blRecords.find((r: any) => {
                          const notfStr = r.notf ? String(r.notf).trim() : ''
                          if (!notfStr || notfStr === 'N/A') return false
                          const parsed = parseFloat(notfStr)
                          return !isNaN(parsed) && parsed > 0
                        })
                        if (notfRecord?.notf) {
                          const parsed = parseFloat(String(notfRecord.notf))
                          if (!isNaN(parsed)) blTotal += parsed
                        }
                        blRecords.forEach((r: any) => {
                          if (r.seal) {
                            const parsed = parseFloat(String(r.seal))
                            if (!isNaN(parsed)) blTotal += parsed
                          }
                        })

                        return (
                          <React.Fragment key={blNumber}>
                            <TableRow className={isSelected(blNumber) ? 'bg-orange-50' : ''}>
                              <TableCell>
                                <Checkbox
                                  checked={isSelected(blNumber)}
                                  onCheckedChange={(checked) => toggleBLSelection(blNumber, !!checked)}
                                />
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => toggleExpansion(blNumber)}
                                  className="h-6 w-6 p-0"
                                >
                                  {isExpanded(blNumber) ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                </Button>
                              </TableCell>
                              <TableCell className="font-mono text-sm font-medium">{blNumber}</TableCell>
                              <TableCell>{customer}</TableCell>
                              <TableCell>
                                <Badge variant={auth === 'APA' ? 'default' : 'secondary'} className={auth === 'APA' ? 'bg-blue-600' : 'bg-green-600'}>
                                  {auth}
                                </Badge>
                              </TableCell>
                              <TableCell>{containerCount}</TableCell>
                              <TableCell className="text-right font-bold">${blTotal.toFixed(2)}</TableCell>
                            </TableRow>
                            {isExpanded(blNumber) && (
                              <TableRow className="bg-gray-50">
                                <TableCell colSpan={7} className="p-0">
                                  <div className="p-4 border-t">
                                    <Table>
                                      <TableHeader>
                                        <TableRow>
                                          <TableHead>Contenedor</TableHead>
                                          <TableHead>Factura</TableHead>
                                          <TableHead>Ruta</TableHead>
                                          <TableHead>NOTF</TableHead>
                                          <TableHead>SEAL</TableHead>
                                          <TableHead className="text-right">Acciones</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {blRecords.map((record: any) => (
                                          <TableRow key={record._id || record.id}>
                                            <TableCell className="font-mono text-sm">{record.container || 'N/A'}</TableCell>
                                            <TableCell>{record.noInvoice || 'N/A'}</TableCell>
                                            <TableCell>{record.ruta || 'N/A'}</TableCell>
                                            <TableCell>${parseFloat(record.notf || 0).toFixed(2)}</TableCell>
                                            <TableCell>${parseFloat(record.seal || 0).toFixed(2)}</TableCell>
                                            <TableCell className="text-right">
                                              {isAdmin && (
                                                <Button
                                                  variant="ghost"
                                                  size="sm"
                                                  onClick={() => handleDelete(record._id || record.id)}
                                                  className="h-8 w-8 text-red-600"
                                                >
                                                  <Trash2 className="h-4 w-4" />
                                                </Button>
                                              )}
                                            </TableCell>
                                          </TableRow>
                                        ))}
                                      </TableBody>
                                    </Table>
                                  </div>
                                </TableCell>
                              </TableRow>
                            )}
                          </React.Fragment>
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
                  {selectedBLNumbers.length > 0 && (
                    <span className="text-sm font-medium">
                      Total seleccionado: ${totalSelected.toFixed(2)}
                    </span>
                  )}
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

        {step === 'pdf' && (
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={handlePrevStep}>
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    Volver
                  </Button>
                  Prefactura de Gastos
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
                    <div className="text-lg font-semibold">{getSelectedCustomerName()}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-sm text-muted-foreground">BL Numbers seleccionados</div>
                    <div className="text-lg font-semibold">{selectedBLNumbers.length}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-sm text-muted-foreground">Total</div>
                    <div className="text-2xl font-bold text-green-600">${totalSelected.toFixed(2)}</div>
                  </CardContent>
                </Card>
              </div>

              {/* Document data */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Número de Prefactura</Label>
                  <Input
                    value={documentData.number}
                    onChange={(e) => setDocumentData(prev => ({ ...prev, number: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Notas</Label>
                  <Textarea
                    value={documentData.notes}
                    onChange={(e) => setDocumentData(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Notas adicionales..."
                    rows={2}
                  />
                </div>
              </div>

              {/* Selected BL summary */}
              <div className="space-y-2">
                <h3 className="font-semibold">BL Numbers Incluidos ({selectedBLNumbers.length})</h3>
                <div className="max-h-64 overflow-y-auto border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>BL Number</TableHead>
                        <TableHead>Contenedores</TableHead>
                        <TableHead className="text-right">NOTF</TableHead>
                        <TableHead className="text-right">SEAL</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedBLNumbers.map((blNumber) => {
                        const blRecords = selectedRecordsCache.get(blNumber) || groupedByBL.get(blNumber) || []
                        let notfTotal = 0
                        let sealTotal = 0
                        const notfRecord = blRecords.find((r: any) => {
                          const notfStr = r.notf ? String(r.notf).trim() : ''
                          if (!notfStr || notfStr === 'N/A') return false
                          return !isNaN(parseFloat(notfStr)) && parseFloat(notfStr) > 0
                        })
                        if (notfRecord?.notf) {
                          notfTotal = parseFloat(String(notfRecord.notf)) || 0
                        }
                        blRecords.forEach((r: any) => {
                          if (r.seal) {
                            sealTotal += parseFloat(String(r.seal)) || 0
                          }
                        })
                        return (
                          <TableRow key={blNumber}>
                            <TableCell className="font-mono text-sm">{blNumber}</TableCell>
                            <TableCell>{blRecords.length}</TableCell>
                            <TableCell className="text-right">${notfTotal.toFixed(2)}</TableCell>
                            <TableCell className="text-right">${sealTotal.toFixed(2)}</TableCell>
                            <TableCell className="text-right font-medium">${(notfTotal + sealTotal).toFixed(2)}</TableCell>
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

        {/* Date filter modal */}
        <Dialog open={isDateFilterModalOpen} onOpenChange={setIsDateFilterModalOpen}>
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
