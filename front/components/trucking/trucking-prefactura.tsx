"use client"

import { useEffect, useMemo, useState } from "react"
import { useAppDispatch, useAppSelector } from "@/lib/hooks"
import {
  fetchPendingRecordsByModule,
  selectPendingRecordsByModuleFromDB,
  type ExcelRecord as IndividualExcelRecord,
  updateMultipleRecordsStatusAsync,
  createInvoiceAsync,
  type PersistedInvoiceRecord,
  fetchRecordsByModule,
  selectRecordsByModule,
    deleteRecordAsync,
} from "@/lib/features/records/recordsSlice"
import { selectAllClients, fetchClients } from "@/lib/features/clients/clientsSlice"
import { fetchServices, selectAllServices, selectServicesLoading } from "@/lib/features/services/servicesSlice"
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
import { Database, Search, X, Edit, Eye as EyeIcon, Trash2 as TrashIcon, Calendar, Eye, Download, FileText, DollarSign, ArrowLeft, Plus, Trash2, Loader2 } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"


export function TruckingPrefactura() {
  const dispatch = useAppDispatch()
  const { toast } = useToast()

  // Cargar datos base
  const pendingTruckingRecords = useAppSelector(state => selectPendingRecordsByModuleFromDB(state as any, "trucking"))
  const clients = useAppSelector(selectAllClients)
  const services = useAppSelector(selectAllServices)
  const servicesLoading = useAppSelector(selectServicesLoading)

  useEffect(() => {
    dispatch(fetchPendingRecordsByModule("trucking"))
    dispatch(fetchClients())
    dispatch(fetchServices("trucking"))
    // Cargar también todos los registros del módulo para métricas (prefacturados)
    dispatch(fetchRecordsByModule("trucking"))
  }, [dispatch])

  // Selección de registros
  const [selectedRecordIds, setSelectedRecordIds] = useState<string[]>([])
  const toggleRecord = (recordId: string, checked: boolean) =>
    setSelectedRecordIds(prev => checked ? [...prev, recordId] : prev.filter(id => id !== recordId))
  const isSelected = (recordId: string) => selectedRecordIds.includes(recordId)

  // Paso actual (similar a PTYSS)
  type Step = 'select' | 'services'
  const [step, setStep] = useState<Step>('select')
  const [search, setSearch] = useState<string>("")
  const clearSelection = () => setSelectedRecordIds([])

  // Filtros estilo PTYSS
  const [statusFilter, setStatusFilter] = useState<'all'|'pendiente'|'completado'>('all')
  const [dateFilter, setDateFilter] = useState<'createdAt'|'moveDate'>('createdAt')
  const [isUsingPeriodFilter, setIsUsingPeriodFilter] = useState(false)
  const [activePeriodFilter, setActivePeriodFilter] = useState<'none'|'today'|'week'|'month'|'advanced'>('none')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [isDateModalOpen, setIsDateModalOpen] = useState(false)
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false)
  const [selectedRecordForView, setSelectedRecordForView] = useState<IndividualExcelRecord | null>(null)

  const getTodayDates = () => {
    const today = new Date()
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23,59,59,999)
    return { start: startOfDay.toISOString().split('T')[0], end: endOfDay.toISOString().split('T')[0] }
  }
  const getCurrentWeekDates = () => {
    const today = new Date()
    const dayOfWeek = today.getDay()
    const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)
    const startOfWeek = new Date(today.getFullYear(), today.getMonth(), diff)
    startOfWeek.setHours(0,0,0,0)
    const endOfWeek = new Date(startOfWeek)
    endOfWeek.setDate(startOfWeek.getDate()+6)
    endOfWeek.setHours(23,59,59,999)
    return { start: startOfWeek.toISOString().split('T')[0], end: endOfWeek.toISOString().split('T')[0] }
  }
  const getCurrentMonthDates = () => {
    const today = new Date()
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    const endOfMonth = new Date(today.getFullYear(), today.getMonth()+1, 0, 23,59,59,999)
    return { start: startOfMonth.toISOString().split('T')[0], end: endOfMonth.toISOString().split('T')[0] }
  }
  const handleFilterByPeriod = (period: 'today'|'week'|'month'|'advanced') => {
    if (activePeriodFilter === period) {
      setIsUsingPeriodFilter(false)
      setActivePeriodFilter('none')
      setStartDate('')
      setEndDate('')
      return
    }
    setIsUsingPeriodFilter(true)
    setActivePeriodFilter(period)
    switch(period) {
      case 'today': { const d = getTodayDates(); setStartDate(d.start); setEndDate(d.end); break }
      case 'week': { const d = getCurrentWeekDates(); setStartDate(d.start); setEndDate(d.end); break }
      case 'month': { const d = getCurrentMonthDates(); setStartDate(d.start); setEndDate(d.end); break }
      case 'advanced': 
        console.log('Abriendo modal de filtro avanzado...')
        setIsDateModalOpen(true)
        console.log('isDateModalOpen establecido en:', true)
        break
    }
  }
  const handleApplyDateFilter = (start: string, end: string) => {
    setStartDate(start); setEndDate(end); setIsUsingPeriodFilter(true); setActivePeriodFilter('advanced'); setIsDateModalOpen(false)
  }
  const handleCancelDateFilter = () => {
    setIsDateModalOpen(false)
    if (!startDate || !endDate) { setIsUsingPeriodFilter(false); setActivePeriodFilter('none') }
  }
  const getActivePeriodText = () => {
    if (!isUsingPeriodFilter || activePeriodFilter==='advanced') return null
    const week = getCurrentWeekDates(); const month = getCurrentMonthDates()
    if (startDate===endDate) return 'Hoy'
    if (startDate===week.start && endDate===week.end) return 'Semana en curso'
    if (startDate===month.start && endDate===month.end) return 'Mes en curso'
    return 'Período personalizado'
  }

  // Datos de prefactura
  const [prefacturaData, setPrefacturaData] = useState<{ prefacturaNumber: string; notes: string }>(
    { prefacturaNumber: `TRK-PRE-${Date.now().toString().slice(-5)}`, notes: "" }
  )

  // Filtrar SOLO trasiego y por búsqueda, tomando todos los registros del módulo que no estén prefacturados/facturados
  const allTruckingRecords = useAppSelector(state => selectRecordsByModule(state as any, 'trucking')) as any[]
  const trasiegoRecords = useMemo(() => {
    const isTrasiego = (rec: any) => !!(rec?.data?.leg || rec?.data?.matchedPrice || rec?.data?.line)
    const isNotClosed = (rec: any) => !['prefacturado','facturado'].includes((rec?.status || '').toLowerCase())
    const matches = (rec: any) => {
      if (!search.trim()) return true
      const hay = (v?: string) => (v || "").toString().toLowerCase().includes(search.toLowerCase())
      const clientName = (() => {
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
      })()
      return hay(rec?.data?.container) || hay(clientName) || hay(rec?.data?.containerConsecutive) || hay(rec?.data?.order)
    }
    const filtered = (allTruckingRecords as any[]).filter(isTrasiego).filter(isNotClosed).filter(matches)
    
    // Debug: verificar campo fe en registros filtrados
    if (filtered.length > 0) {
      console.log("=== DEBUG PREFACTURA: Registros trasiego filtrados ===")
      console.log("Total registros trasiego:", filtered.length)
      const withFe = filtered.filter(r => r?.data?.fe)
      console.log("Registros con campo fe:", withFe.length)
      if (withFe.length > 0) {
        console.log("Ejemplo con fe:", {
          id: withFe[0]._id,
          fe: withFe[0].data.fe,
          container: withFe[0].data.container,
          data: withFe[0].data
        })
      }
      const withoutFe = filtered.filter(r => !r?.data?.fe)
      if (withoutFe.length > 0) {
        console.log("Ejemplo sin fe:", {
          id: withoutFe[0]._id,
          container: withoutFe[0].data?.container,
          keys: Object.keys(withoutFe[0].data || {}),
          data: withoutFe[0].data
        })
      }
    }
    
    return filtered
  }, [allTruckingRecords, search])

  // Aplicar filtros de estado y fecha
  const visibleRecords = useMemo(() => {
    let list: any[] = [...trasiegoRecords]
    if (statusFilter !== 'all') list = list.filter(r => (r.status || '').toLowerCase() === statusFilter)
    if (isUsingPeriodFilter && startDate && endDate) {
      const s = new Date(startDate)
      const e = new Date(endDate); e.setHours(23,59,59,999)
      list = list.filter((r: any) => {
        const val = dateFilter === 'moveDate' ? (r.data?.moveDate || r.createdAt) : r.createdAt
        const d = new Date(val)
        return d >= s && d <= e
      })
    }
    return list
  }, [trasiegoRecords, statusFilter, isUsingPeriodFilter, startDate, endDate, dateFilter])

  const groupedByClient = useMemo(() => {
    const groups = new Map<string, IndividualExcelRecord[]>()
    visibleRecords.forEach((rec: any) => {
      const d = rec?.data || {}
      let name = 'PTY SHIP SUPPLIERS, S.A.'
      const byId = d.clientId || rec?.clientId
      if (byId) {
        const c = clients.find((x: any) => (x._id || x.id) === byId)
        if (c) name = c.type === 'natural' ? c.fullName : c.companyName
      } else {
        const bySap = d.clientSapCode || rec?.clientSapCode
        if (bySap) {
          const c = clients.find((x: any) => (x.sapCode || '').toLowerCase() === String(bySap).toLowerCase())
          if (c) name = c.type === 'natural' ? c.fullName : c.companyName
        }
      }
      if (!groups.has(name)) groups.set(name, [])
      groups.get(name)!.push(rec)
    })
    return groups
  }, [visibleRecords])

  const normalizeName = (s: string) => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '').trim()
  const getClient = (name: string) => {
    const target = normalizeName(name)
    return clients.find((c: any) => {
      const n = c.type === 'juridico' ? (c.companyName || '') : (c.fullName || '')
      return normalizeName(n) === target
    })
  }

  const selectedRecords = useMemo(
    () => allTruckingRecords.filter((r: any) => selectedRecordIds.includes(r._id || r.id)),
    [allTruckingRecords, selectedRecordIds]
  )

  // Generar PDF automáticamente cuando se pase al paso 2
  useEffect(() => {
    if (step === 'services' && selectedRecords.length > 0 && prefacturaData.prefacturaNumber) {
      // Usar setTimeout para evitar bucles infinitos
      const timeoutId = setTimeout(() => {
        handleGenerateRealtimePDF()
      }, 500) // Delay de 500ms para evitar actualizaciones excesivas
      
      return () => clearTimeout(timeoutId)
    }
  }, [step, selectedRecords.length, prefacturaData.prefacturaNumber])

  // Servicios adicionales (aplicados a la prefactura completa)
  const [additionalServiceId, setAdditionalServiceId] = useState<string>("")
  const [additionalServiceAmount, setAdditionalServiceAmount] = useState<number>(0)
  const [selectedAdditionalServices, setSelectedAdditionalServices] = useState<Array<{ id: string; name: string; description: string; amount: number }>>([])
  
  // Filtrar servicios para excluir impuestos especiales
  const availableServices = useMemo(() => {
    return services.filter(service => 
      service.module === 'trucking' && 
      service.isActive &&
      service.name !== 'Customs' && 
      service.name !== 'Administration Fee'
    )
  }, [services])
  
  // Estados para PDF
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null)
  const [modalPdfUrl, setModalPdfUrl] = useState<string | null>(null)
  const [showPdfPreview, setShowPdfPreview] = useState(false)
  
  // Estado para el loading de crear prefactura
  const [isCreatingPrefactura, setIsCreatingPrefactura] = useState(false)

  // Regenerar PDF cuando cambien los servicios adicionales (colocado después de declarar selectedAdditionalServices)
  useEffect(() => {
    if (step === 'services' && selectedRecords.length > 0 && prefacturaData.prefacturaNumber) {
      const timeoutId = setTimeout(() => {
        handleGenerateRealtimePDF()
      }, 150)
      
      return () => clearTimeout(timeoutId)
    }
  }, [selectedAdditionalServices, step, selectedRecords, prefacturaData.prefacturaNumber])

  const addService = () => {
    if (!additionalServiceId || additionalServiceAmount <= 0) return
    const svc = services.find((s: any) => s._id === additionalServiceId)
    if (!svc) return
    setSelectedAdditionalServices(prev => [...prev, { id: svc._id, name: svc.name, description: svc.description, amount: additionalServiceAmount }])
    setAdditionalServiceId("")
    setAdditionalServiceAmount(0)
    
    // Regenerar PDF en vivo después de agregar servicio
    setTimeout(() => handleGenerateRealtimePDF(), 100)
  }
  
  const clearServiceSelection = () => {
    setAdditionalServiceId("")
    setAdditionalServiceAmount(0)
  }
  
  // Auto-completar precio cuando se seleccione un servicio
  const handleServiceSelection = (serviceId: string) => {
    const selectedService = services.find((s: any) => s._id === serviceId)
    if (selectedService) {
      setAdditionalServiceId(serviceId)
      setAdditionalServiceAmount(selectedService.price || 0)
    }
  }
  
  const removeService = (id: string) => {
    setSelectedAdditionalServices(prev => prev.filter(s => s.id !== id))
    
    // Regenerar PDF en vivo después de remover servicio
    setTimeout(() => handleGenerateRealtimePDF(), 100)
  }

  const totalSelected = useMemo(() => {
    const base = selectedRecords.reduce((sum: number, r: any) => sum + (r.data?.matchedPrice || r.totalValue || 0), 0)
    const extras = selectedAdditionalServices.reduce((sum, s) => sum + s.amount, 0)
    
    // Calcular impuestos PTG basados en contenedores llenos
    const fullContainers = selectedRecords.filter((r: any) => {
      const fe = r?.data?.fe || ''
      return fe.toString().toUpperCase().trim() === 'F'
    })
    const totalFullContainers = fullContainers.length
    
    let taxes = 0
    if (totalFullContainers > 0) {
      const customsTax = services.find(s => s.module === 'trucking' && s.name === 'Customs' && s.isActive)
      const adminFeeTax = services.find(s => s.module === 'trucking' && s.name === 'Administration Fee' && s.isActive)
      
      if (customsTax && customsTax.price > 0) {
        taxes += customsTax.price * totalFullContainers
      }
      if (adminFeeTax && adminFeeTax.price > 0) {
        taxes += adminFeeTax.price * totalFullContainers
      }
    }
    
    return base + extras + taxes
  }, [selectedRecords, selectedAdditionalServices, services])

  const getSelectedClientName = (): string | null => {
    if (selectedRecords.length === 0) return null
    const first: any = selectedRecords[0]
    const d = first?.data || {}
    const byId = d.clientId || first?.clientId
    if (byId) {
      const c = clients.find((x: any) => (x._id || x.id) === byId)
      return c ? (c.type === 'natural' ? c.fullName : c.companyName) : 'PTY SHIP SUPPLIERS, S.A.'
    }
    const bySap = d.clientSapCode || first?.clientSapCode
    if (bySap) {
      const c = clients.find((x: any) => (x.sapCode || '').toLowerCase() === String(bySap).toLowerCase())
      return c ? (c.type === 'natural' ? c.fullName : c.companyName) : 'PTY SHIP SUPPLIERS, S.A.'
    }
    return 'PTY SHIP SUPPLIERS, S.A.'
  }

  const areAllSelectedSameClient = (): boolean => {
    if (selectedRecords.length === 0) return true
    const firstName = getSelectedClientName() || ''
    return selectedRecords.every((r: any) => {
      const d = (r as any).data || {}
      const byId = d.clientId || (r as any).clientId
      if (byId) {
        const c = clients.find((x: any) => (x._id || x.id) === byId)
        const n = c ? (c.type === 'natural' ? c.fullName : c.companyName) : 'PTY SHIP SUPPLIERS, S.A.'
        return n === firstName
      }
      const bySap = d.clientSapCode || (r as any).clientSapCode
      if (bySap) {
        const c = clients.find((x: any) => (x.sapCode || '').toLowerCase() === String(bySap).toLowerCase())
        const n = c ? (c.type === 'natural' ? c.fullName : c.companyName) : 'PTY SHIP SUPPLIERS, S.A.'
        return n === firstName
      }
      return 'PTY SHIP SUPPLIERS, S.A.' === firstName
    })
  }

  // KPI summary (solo trasiego): mostrar total, trasiego y prefacturados
  const totalDb = trasiegoRecords.length
  const trasiegoCount = trasiegoRecords.length
  const pendingCount = trasiegoRecords.filter((r: any) => !((r?.data?.matchedPrice || 0) > 0 || r?.data?.isMatched === true)).length
  const prefacturadosCount = allTruckingRecords.filter((r: any) => (r.status || '').toLowerCase() === 'prefacturado').length

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

  const handleViewRecord = (record: IndividualExcelRecord) => {
    setSelectedRecordForView(record)
    setIsRecordModalOpen(true)
  }

  const handleDeleteRecord = async (record: IndividualExcelRecord) => {
    const recordId = (record as any)._id || (record as any).id
    if (!recordId) return
    try {
      await dispatch(deleteRecordAsync(recordId)).unwrap()
      setSelectedRecordIds(prev => prev.filter(id => id !== recordId))
      toast({ title: "Registro eliminado", description: "El registro ha sido eliminado exitosamente" })
      dispatch(fetchPendingRecordsByModule("trucking"))
      dispatch(fetchRecordsByModule("trucking"))
    } catch (error: any) {
      toast({ title: "Error al eliminar registro", description: error?.message || "No se pudo eliminar el registro", variant: "destructive" })
    }
  }

  // PDF Prefactura estilo PTYSS (solo trasiego)
  const generatePrefacturaPdf = () => {
    if (selectedRecords.length === 0) {
      toast({ title: "Sin registros", description: "Selecciona al menos un registro", variant: "destructive" })
      return
    }
    const first = selectedRecords[0]
    const clientName = getSelectedClientName() || "Cliente"
    const client = getClient(clientName)
    // Emisor: PTG desde clientes en DB
    const issuer = getClient('PTG')

    const doc = new jsPDF()

    // Colores / encabezado
    const lightBlue = [59, 130, 246]
    doc.setFillColor(lightBlue[0], lightBlue[1], lightBlue[2])
    doc.rect(15, 15, 30, 15, 'F')
    // Texto 'PTG' grande, centrado y con padding visual
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(14)
    doc.setFont(undefined, 'bold')
    // Centramos vertical y horizontalmente dentro del rectángulo (15,15,30,15)
    // Centro X = 15 + 30/2 = 30, Centro Y = 15 + 15/2 = 22.5
    doc.text('PTG', 30, 23, { align: 'center', baseline: 'middle' })

    // Número de prefactura y fecha
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(14)
    doc.setFont(undefined, 'bold')
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

    // Información empresa (PTG)
    doc.setFontSize(9)
    doc.setFont(undefined, 'bold')
    const issuerName = issuer ? ((issuer as any).type === 'natural' ? (issuer as any).fullName : (issuer as any).companyName) : 'PTG'
    doc.text(issuerName || 'PTG', 15, 50)
    doc.setFontSize(8)
    doc.setFont(undefined, 'normal')
    const issuerRuc = issuer ? ((issuer as any).type === 'natural' ? (issuer as any).documentNumber : (issuer as any).ruc) : ''
    const issuerAddress = issuer ? (
      typeof (issuer as any).address === 'string' 
        ? (issuer as any).address 
        : `${(issuer as any).address?.district || ''}${(issuer as any).address?.province ? ', ' + (issuer as any).address?.province : ''}`
    ) : ''
    const issuerPhone = (issuer as any)?.phone || ''
    if (issuerRuc) doc.text(`RUC: ${issuerRuc}`, 15, 54)
    if (issuerAddress) doc.text(issuerAddress, 15, 58)
    if (issuerPhone) doc.text(`TEL: ${issuerPhone}`, 15, 62)

    // Cliente
    doc.setFontSize(9)
    doc.setFont(undefined, 'bold')
    doc.text('CUSTOMER:', 15, 82)
    doc.setFontSize(8)
    doc.setFont(undefined, 'normal')
    const ruc = (client as any)?.ruc || (client as any)?.documentNumber || 'N/A'
    const sap = (client as any)?.sapCode || ''
    const clientDisplay = client
      ? ((client as any).type === 'natural' ? (client as any).fullName : (client as any).companyName)
      : clientName
    const address = (client as any)?.address
      ? (typeof (client as any).address === 'string' ? (client as any).address : `${(client as any).address?.district || ''}, ${(client as any).address?.province || ''}`)
      : 'N/A'
    const phone = (client as any)?.phone || 'N/A'
    doc.text(clientDisplay, 15, 86)
    doc.text(`RUC: ${ruc}`, 15, 90)
    if (sap) doc.text(`SAP: ${sap}`, 60, 90)
    doc.text(`ADDRESS: ${address}`, 15, 94)
    doc.text(`TELEPHONE: ${phone}`, 15, 98)

    // Encabezado items
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

    // Agrupar registros por características similares (trasiego)
    const groupedRecords = new Map<string, { records: any[], price: number, count: number }>()
    
    console.log("=== DEBUG: Agrupando registros para PDF ===")
    console.log("Total registros seleccionados:", selectedRecords.length)
    
    selectedRecords.forEach((r: any) => {
      const moveType = (r.data?.moveType || 'SINGLE').toString().toUpperCase() // SINGLE/RT
      const routeType = (r.data?.route || 'PACIFIC').toString().toUpperCase() // PACIFIC/ATLANTIC
      const leg = r.data?.leg || `${r.data?.from || ''} / ${r.data?.to || ''}`
      const fe = r.data?.fe ? (r.data.fe.toString().toUpperCase().trim() === 'F' ? 'FULL' : 'EMPTY') : 'FULL'
      const size = r.data?.size || r.data?.containerSize || ''
      const type = r.data?.type || r.data?.containerType || ''
      const price = (r.data?.matchedPrice || r.totalValue || 0)
      
      // Crear clave única para agrupar
      const groupKey = `${moveType}|${routeType}|${leg}|${fe}|${size}|${type}|${price}`
      
      if (!groupedRecords.has(groupKey)) {
        groupedRecords.set(groupKey, {
          records: [],
          price: price,
          count: 0
        })
      }
      
      const group = groupedRecords.get(groupKey)!
      group.records.push(r)
      group.count += 1
    })

    console.log("Grupos creados:", groupedRecords.size)
    Array.from(groupedRecords.entries()).forEach(([key, group], index) => {
      const [moveType, routeType, leg, fe, size, type, priceStr] = key.split('|')
      console.log(`Grupo ${index + 1}: ${moveType} ${routeType} - ${leg}/${fe}/${size}/${type} - Cantidad: ${group.count} - Precio: $${group.price}`)
    })

    // Crear filas agrupadas para el PDF
    const bodyRows = Array.from(groupedRecords.entries()).map(([groupKey, group]) => {
      const [moveType, routeType, leg, fe, size, type, priceStr] = groupKey.split('|')
      const totalPrice = group.price * group.count
      
      // Descripción agrupada según el formato solicitado: MOVE_TYPE ROUTE_TYPE - LEG/FE/SIZE/TYPE
      const desc = `${moveType} ${routeType} - ${leg}/${fe}/${size}/${type}`
      
      return [group.count, desc, group.price.toFixed(2), totalPrice.toFixed(2)]
    })

    // Agregar servicios adicionales como filas de la tabla (estilo PTYSS)
    if (selectedAdditionalServices.length > 0) {
      selectedAdditionalServices.forEach(svc => {
        const description = svc.description || 'Additional Service'
        const amount = Number(svc.amount || 0)
        bodyRows.push([1, description, amount.toFixed(2), amount.toFixed(2)])
      })
    }

    // Agregar impuestos PTG (Customs y Administration Fee) basados en contenedores llenos
    const fullContainers = selectedRecords.filter((r: any) => {
      const fe = r?.data?.fe || ''
      return fe.toString().toUpperCase().trim() === 'F'
    })
    const totalFullContainers = fullContainers.length
    
    if (totalFullContainers > 0) {
      // Buscar los impuestos PTG en los servicios
      const customsTax = services.find(s => s.module === 'trucking' && s.name === 'Customs' && s.isActive)
      const adminFeeTax = services.find(s => s.module === 'trucking' && s.name === 'Administration Fee' && s.isActive)
      
      if (customsTax && customsTax.price > 0) {
        const customsTotal = customsTax.price * totalFullContainers
        bodyRows.push([totalFullContainers, `Customs`, customsTax.price.toFixed(2), customsTotal.toFixed(2)])
      }
      
      if (adminFeeTax && adminFeeTax.price > 0) {
        const adminFeeTotal = adminFeeTax.price * totalFullContainers
        bodyRows.push([totalFullContainers, `Administration Fee`, adminFeeTax.price.toFixed(2), adminFeeTotal.toFixed(2)])
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

    // Asegurar color de texto negro para secciones posteriores a la tabla
    doc.setTextColor(0, 0, 0)

    // TOTAL alineado a la derecha
    doc.setFont(undefined, 'bold')
    doc.setFontSize(12)
    doc.text('TOTAL:', 120, y)
    doc.setFontSize(16)
    doc.text(`$${totalSelected.toFixed(2)}`, 195, y, { align: 'right' })
    y += 14

    // Términos y condiciones (banda azul + texto)
    doc.setFillColor(lightBlue[0], lightBlue[1], lightBlue[2])
    doc.rect(15, y, tableWidth, 8, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(10)
    doc.setFont(undefined, 'bold')
    doc.text('TERMS AND CONDITIONS', 20, y + 5)
    doc.setTextColor(0, 0, 0)
    y += 14
    doc.setFont(undefined, 'normal')
    doc.setFontSize(9)
    doc.text(`Make check payments payable to: ${issuerName || 'PTG'}`, 15, y)
    y += 4
    doc.text('Money transfer to: Banco General - Checking Account', 15, y)
    y += 4
    doc.text('Account No. 03-72-01-124081-1', 15, y)
    y += 8
    doc.text('I Confirmed that I have received the original prefactura and documents.', 15, y)
    y += 8
    // Firmas
    doc.text('Received by: ____________', 15, y)
    doc.text('Date: ____________', 90, y)

    return doc.output('blob')
  }



  // Generar PDF en tiempo real para la vista previa en vivo
  const handleGenerateRealtimePDF = () => {
    if (selectedRecords.length === 0 || !prefacturaData.prefacturaNumber) return
    
    try {
      const blob = generatePrefacturaPdf()
      if (blob instanceof Blob) {
        // Liberar URL previa para evitar memoria/caché del visor
        if (pdfPreviewUrl) {
          try { URL.revokeObjectURL(pdfPreviewUrl) } catch {}
        }
        const url = URL.createObjectURL(blob)
        setPdfPreviewUrl(url)
      }
    } catch (error) {
      console.error('Error generando PDF en tiempo real:', error)
    }
  }

  // Vista previa del PDF
  const handlePreviewPDF = () => {
    try {
      const pdfBlob = generatePrefacturaPdf()
      if (pdfBlob instanceof Blob) {
        const url = URL.createObjectURL(pdfBlob)
        setShowPdfPreview(true)
        // No sobrescribir pdfPreviewUrl para mantener la vista en vivo
        setModalPdfUrl(url)
      }
    } catch (error) {
      console.error('Error generando PDF:', error)
    }
  }

  // Descargar PDF
  const handleDownloadPDF = () => {
    try {
    const pdfBlob = generatePrefacturaPdf()
    const first = selectedRecords[0]
    const clientName = getSelectedClientName() || "Cliente"
    const client = getClient(clientName)
      const clientDisplay = client
        ? ((client as any).type === 'natural' ? (client as any).fullName : (client as any).companyName)
        : clientName
      const safeName = (clientDisplay || 'cliente').replace(/[^a-z0-9_-]+/gi, '_')
      
      const url = URL.createObjectURL(pdfBlob)
      const a = document.createElement('a')
      a.href = url
      a.download = `prefactura_trucking_${safeName}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      toast({ title: "PDF descargado", description: "Se descargó la prefactura en PDF" })
    } catch (error) {
      console.error('Error descargando PDF:', error)
      toast({ title: "Error", description: "No se pudo generar el PDF", variant: "destructive" })
    }
  }

  // Limpiar URL del PDF al cerrar modal
  const handleClosePdfPreview = () => {
    setShowPdfPreview(false)
    if (modalPdfUrl) {
      URL.revokeObjectURL(modalPdfUrl)
      setModalPdfUrl(null)
    }
  }

  // Limpiar URL del PDF cuando se desmonte el componente
  useEffect(() => {
    return () => {
      if (pdfPreviewUrl) {
        URL.revokeObjectURL(pdfPreviewUrl)
      }
      if (modalPdfUrl) {
        URL.revokeObjectURL(modalPdfUrl)
      }
    }
  }, [pdfPreviewUrl, modalPdfUrl])

  // Marcar como prefacturado
  const handleCreatePrefactura = async () => {
    if (selectedRecords.length === 0) {
      toast({ title: "Error", description: "Debes seleccionar al menos un registro para crear la prefactura", variant: "destructive" })
      return
    }
    if (!prefacturaData.prefacturaNumber) {
      toast({ title: "Error", description: "Completa el número de prefactura", variant: "destructive" })
      return
    }
    
    setIsCreatingPrefactura(true)
    
    try {
      // Cliente del primer registro (derivado por clientId/clientSapCode; 'line' es naviera)
      const first = selectedRecords[0]
      const clientName = getSelectedClientName() || 'Cliente'
      const client = getClient(clientName)
      if (!client) {
        toast({ title: "Error", description: "No se encontró el cliente de los registros seleccionados", variant: "destructive" })
        return
      }
      console.log("client", client)
      const displayName = client.type === 'natural' ? client.fullName : client.companyName
      const displayRuc = client.type === 'natural' ? client.documentNumber : client.ruc
      const address = client.type === 'natural'
        ? (typeof client.address === 'string' ? client.address : `${client.address?.district || ''}, ${client.address?.province || ''}`)
        : (typeof (client as any).fiscalAddress === 'string' ? (client as any).fiscalAddress : `${(client as any).fiscalAddress?.district || ''}, ${(client as any).fiscalAddress?.province || ''}`)

      const newPrefactura: PersistedInvoiceRecord = {
        id: `TRK-PRE-${Date.now().toString().slice(-6)}`,
        module: 'trucking',
        invoiceNumber: prefacturaData.prefacturaNumber,
        clientName: displayName || clientName,
        clientRuc: displayRuc || '',
        clientSapNumber: client.sapCode || '',
        issueDate: new Date().toISOString().split('T')[0],
        dueDate: new Date().toISOString().split('T')[0],
        currency: 'USD',
        subtotal: totalSelected,
        taxAmount: 0,
        totalAmount: totalSelected,
        status: 'prefactura',
        xmlData: '',
        relatedRecordIds: selectedRecords.map((r: any) => r._id || r.id),
        notes: prefacturaData.notes,
        details: {
          clientAddress: address,
          clientPhone: client.phone || '',
          additionalServices: selectedAdditionalServices,
        },
        createdAt: new Date().toISOString(),
      }

      const response = await dispatch(createInvoiceAsync(newPrefactura))
      console.log("response", response)
      if (createInvoiceAsync.fulfilled.match(response)) {
        const createdId = response.payload.id
        await dispatch(updateMultipleRecordsStatusAsync({
          recordIds: selectedRecords.map((r: any) => r._id || r.id),
          status: 'prefacturado',
          invoiceId: createdId,
        })).unwrap()

        // refrescar y resetear
        dispatch(fetchPendingRecordsByModule('trucking'))
        setSelectedRecordIds([])
        setPrefacturaData({ prefacturaNumber: `TRK-PRE-${Date.now().toString().slice(-5)}`, notes: '' })
        setSelectedAdditionalServices([])
        setStep('select')

        toast({ title: 'Prefactura creada', description: `Prefactura ${newPrefactura.invoiceNumber} creada con ${selectedRecords.length} registros.` })
      } else {
        toast({ title: 'Error', description: 'No se pudo crear la prefactura', variant: 'destructive' })
      }
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "No se pudo marcar como prefacturado", variant: "destructive" })
    } finally {
      setIsCreatingPrefactura(false)
    }
  }

  // Estados de paginación para la tabla de registros (Paso 1)
  const [currentPage, setCurrentPage] = useState(1)
  const recordsPerPage = 10 // Cambiado de 15 a 10
  const totalPages = Math.ceil(trasiegoRecords.length / recordsPerPage)
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * recordsPerPage
    const end = start + recordsPerPage
    return trasiegoRecords.slice(start, end)
  }, [trasiegoRecords, currentPage, recordsPerPage])

  return (
    <div className="space-y-6">
          {/* Encabezado estilo PTYSS - solo Paso 1 */}
          {step === 'select' && (
            <div className="bg-slate-800 text-white rounded-md p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-md bg-slate-700 flex items-center justify-center">🏷️</div>
                <div>
                  <div className="text-lg font-semibold">Paso 1: Selección de Registros</div>
                  <div>
                    <Badge variant="secondary" className="text-slate-900 bg-white/90">{totalDb} disponibles</Badge>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-sm opacity-90">{selectedRecordIds.length} de {trasiegoRecords.length} seleccionados</div>
                <Button variant="outline" disabled={selectedRecordIds.length === 0} onClick={clearSelection} className="bg-white/10 hover:bg-white/20 border-white/30 text-white">
                  Limpiar Selección
                </Button>
              </div>
            </div>
          )}

          {/* Búsqueda y Filtros (estilo PTYSS) - solo Paso 1 */}
          {step === 'select' && (
          <div className="mb-6 mt-4 flex flex-col lg:flex-row gap-4 items-start lg:items-center w-full">
              {/* Filtro de fecha */}
              <div className="w-full lg:w-auto flex-1">
                <Label className="text-sm font-semibold text-slate-700">Filtrar por fecha:</Label>
                <div className="flex flex-col sm:flex-row gap-3 mt-2 lg:mt-1">
                  <div className="flex gap-1">
                    <Button variant={dateFilter==='createdAt'?'default':'outline'} size="sm" onClick={()=>{setDateFilter('createdAt'); setIsUsingPeriodFilter(false); setActivePeriodFilter('none'); setSelectedRecordIds([])}} className="text-xs h-8 px-3">Creación</Button>
                    <Button variant={dateFilter==='moveDate'?'default':'outline'} size="sm" onClick={()=>{setDateFilter('moveDate'); setIsUsingPeriodFilter(false); setActivePeriodFilter('none'); setSelectedRecordIds([])}} className="text-xs h-8 px-3">Movimiento</Button>
                  </div>
                  <div className="hidden sm:block w-px h-6 bg-gray-300 mx-2 self-center"></div>
                  <div className="flex gap-1 flex-wrap">
                    <Button variant={activePeriodFilter==='today'?'default':'outline'} size="sm" onClick={()=>handleFilterByPeriod('today')} className="text-xs h-8 px-2">Hoy</Button>
                    <Button variant={activePeriodFilter==='week'?'default':'outline'} size="sm" onClick={()=>handleFilterByPeriod('week')} className="text-xs h-8 px-2">Semana</Button>
                    <Button variant={activePeriodFilter==='month'?'default':'outline'} size="sm" onClick={()=>handleFilterByPeriod('month')} className="text-xs h-8 px-2">Mes</Button>
                    <Button variant={activePeriodFilter==='advanced'?'default':'outline'} size="sm" onClick={()=>handleFilterByPeriod('advanced')} className="text-xs h-8 px-2">Avanzado</Button>
                  </div>
                </div>
                <div className="mt-2">
                  {isUsingPeriodFilter && activePeriodFilter!=='advanced' && (
                    <div className="flex items-center gap-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
                      <Badge variant="default" className="bg-blue-600 text-white text-xs">{getActivePeriodText()}</Badge>
                      <span className="text-sm text-blue-700">{startDate} - {endDate}</span>
                      <Button variant="ghost" size="sm" onClick={()=>{setIsUsingPeriodFilter(false); setActivePeriodFilter('none'); setStartDate(''); setEndDate('')}} className="h-6 w-6 p-0 ml-auto"><X className="h-3 w-3"/></Button>
                    </div>
                  )}
                  {activePeriodFilter==='advanced' && startDate && endDate && (
                    <div className="flex items-center gap-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
                      <Badge variant="default" className="bg-blue-600 text-white text-xs">Filtro Avanzado</Badge>
                      <span className="text-sm text-blue-700">{startDate} - {endDate}</span>
                      <div className="flex gap-1 ml-auto">
                        <Button variant="ghost" size="sm" onClick={()=>setIsDateModalOpen(true)} className="h-6 w-6 p-0"><Edit className="h-3 w-3"/></Button>
                        <Button variant="ghost" size="sm" onClick={()=>{setIsUsingPeriodFilter(false); setActivePeriodFilter('none'); setStartDate(''); setEndDate('')}} className="h-6 w-6 p-0"><X className="h-3 w-3"/></Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              {/* Resumen de registros */}
              <div className="flex-1 flex justify-end w-full">
                <div className="flex items-center gap-3 bg-gradient-to-r from-slate-100 to-blue-100 border border-slate-300 p-4 rounded-lg shadow-sm w-fit">
                  <div className="p-2 bg-slate-600 rounded-lg">
                    <Database className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <span className="text-sm font-semibold text-slate-900">
                      Total de registros mostrados: {totalDb}
                    </span>
                  </div>
                  <div className="flex gap-4 text-xs">
                    <div className="bg-white/60 px-3 py-1 rounded-md">
                      <span className="font-medium text-slate-600">Trasiego:</span>
                      <span className="ml-1 font-bold text-slate-900">{trasiegoCount}</span>
                    </div>
                    {/*<div className="bg-white/60 px-3 py-1 rounded-md">
                      <span className="font-medium text-slate-600">Prefacturados:</span>
                      <span className="ml-1 font-bold text-slate-900">{prefacturadosCount}</span>
                    </div>*/}
                  </div>
                </div>
              </div>
            </div>
          )}
          {step === 'services' && (
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
                    <div className="p-1.5 bg-slate-600 rounded-md text-white">✓</div>
                    <h3 className="font-semibold text-slate-900 text-base">Resumen de Registros Seleccionados</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                    <div className="bg-white/60 p-2 rounded-md">
                      <span className="text-slate-600 font-medium text-xs">Cantidad:</span>
                      <div className="text-sm font-semibold text-slate-900">{selectedRecords.length} registro{selectedRecords.length !== 1 ? 's' : ''}</div>
                    </div>
                    <div className="bg-white/60 p-2 rounded-md">
                      <span className="text-slate-600 font-medium text-xs">Total:</span>
                      <div className="text-sm font-semibold text-slate-900">${totalSelected.toFixed(2)}</div>
                    </div>
                    <div className="bg-white/60 p-2 rounded-md">
                      <span className="text-slate-600 font-medium text-xs">Cliente:</span>
                      <div className="text-sm font-semibold text-slate-900">{(() => {
                        const first = selectedRecords[0];
                        if (!first) return 'N/A'
                        const name = first?.data?.line || 'Cliente'
                        const c = getClient(name)
                        return c ? ((c as any).type === 'natural' ? (c as any).fullName : (c as any).companyName) : name
                      })()}</div>
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
                            onChange={(e) => {
                              setPrefacturaData({...prefacturaData, prefacturaNumber: e.target.value})
                              // Regenerar PDF cuando cambie el número
                              if (e.target.value && selectedRecords.length > 0) {
                                setTimeout(() => handleGenerateRealtimePDF(), 100)
                              }
                            }}
                            placeholder="TRK-PRE-000001"
                            className="bg-white border-slate-300 focus:border-slate-500 focus:ring-slate-500"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="notes" className="text-sm font-semibold text-slate-700">Notas (Opcional)</Label>
                          <Textarea
                            id="notes"
                            value={prefacturaData.notes}
                            onChange={(e) => {
                              setPrefacturaData({...prefacturaData, notes: e.target.value})
                              // Regenerar PDF cuando cambien las notas
                              if (selectedRecords.length > 0) {
                                setTimeout(() => handleGenerateRealtimePDF(), 100)
                              }
                            }}
                            placeholder="Notas adicionales para la prefactura..."
                            rows={4}
                            className="bg-white border-slate-300 focus:border-slate-500 focus:ring-slate-500"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Servicios Adicionales */}
                    <div className="bg-gradient-to-br from-slate-50 to-blue-50 p-3 rounded-lg border border-slate-300">
                      <h3 className="text-lg font-bold text-slate-900 border-b border-slate-300 pb-2 mb-2">Servicios Adicionales</h3>
                      

                      
                      {/* Selección de servicios */}
                      <div className="space-y-4">
                        <div className="space-y-4">
                          <div className="space-y-3">
                            <Label className="text-sm font-semibold text-slate-700">Servicio</Label>
                            <Select onValueChange={handleServiceSelection} value={additionalServiceId}>
                              <SelectTrigger className="bg-white border-slate-300 focus:border-slate-500 focus:ring-slate-500 h-12 text-base">
                                <SelectValue placeholder="Seleccionar servicio..." />
                              </SelectTrigger>
                              <SelectContent>
                                {availableServices.length === 0 ? (
                                  <div className="p-2 text-sm text-muted-foreground">
                                    No hay servicios disponibles
                                  </div>
                                ) : (
                                  availableServices
                                    .filter(service => !selectedAdditionalServices.some(s => s.id === service._id))
                                    .map((service) => (
                                      <SelectItem key={service._id} value={service._id}>
                                        {service.name} - {service.description}
                                      </SelectItem>
                                    ))
                                )}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div className="space-y-3">
                            <Label className="text-sm font-semibold text-slate-700">Importe</Label>
                            <Input
                              type="text"
                              value={additionalServiceAmount === 0 ? "" : additionalServiceAmount.toString()}
                              onChange={(e) => {
                                const value = e.target.value
                                if (value === "" || value === "0") {
                                  setAdditionalServiceAmount(0)
                                } else {
                                  const numValue = parseFloat(value)
                                  if (!isNaN(numValue) && numValue >= 0) {
                                    setAdditionalServiceAmount(numValue)
                                  }
                                }
                              }}
                              placeholder="0.00"
                              className={`w-full h-12 text-base border-slate-300 focus:border-slate-500 focus:ring-slate-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                                additionalServiceId ? 'bg-slate-50 text-slate-600' : 'bg-white'
                              }`}
                              readOnly={!!additionalServiceId}
                            />
                          </div>
                          
                          <div className="flex gap-2">
                            <Button 
                              onClick={addService}
                              disabled={!additionalServiceId || additionalServiceAmount <= 0}
                              className="flex-1 h-12 text-base bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white font-semibold shadow-md"
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Agregar
                            </Button>
                            {additionalServiceId && (
                              <Button 
                                variant="outline"
                                onClick={clearServiceSelection}
                                className="h-12 px-3 border-slate-300 text-slate-600 hover:bg-slate-50"
                                title="Limpiar selección"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                        
                        {availableServices.length === 0 && (
                          <div className="text-sm text-muted-foreground">
                            No hay servicios adicionales configurados para Trucking. Ve a Configuración → Servicios PTG para agregar servicios.
                          </div>
                        )}
                      </div>

                      {/* Lista de servicios seleccionados */}
                      {selectedAdditionalServices.length > 0 && (
                        <div className="space-y-4 mt-4">
                          <Label className="text-sm font-semibold text-slate-700">Servicios Seleccionados</Label>
                          {selectedAdditionalServices.map((service) => (
                            <div key={service.id} className="flex items-center gap-4 p-4 bg-white/70 border border-slate-200 rounded-lg shadow-sm">
                              <div className="flex-1">
                                <div className="font-semibold text-sm text-slate-900">{service.description}</div>
                              </div>
                              <div className="flex items-center gap-4">
                                <span className="text-lg font-bold text-slate-900 bg-slate-100 px-3 py-1 rounded-full">${service.amount.toFixed(2)}</span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeService(service.id)}
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
                  </div>

                  {/* Columna derecha: Vista previa del PDF */}
                  <div className="lg:col-span-2 bg-gradient-to-br from-slate-50 to-blue-50 p-3 rounded-lg border border-slate-300">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-bold text-slate-900">Vista Previa del PDF</h3>
                      {pdfPreviewUrl && (
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
                    
                    {!pdfPreviewUrl ? (
                      <div className="flex items-center justify-center h-[750px] border-2 border-dashed border-slate-300 rounded-lg">
                        <div className="text-center text-slate-500">
                          <FileText className="h-12 w-12 mx-auto mb-4" />
                          <p className="text-sm">Ingresa el número de prefactura para ver la vista previa</p>
                        </div>
                      </div>
                    ) : (
                      <div className="w-full h-[750px] border border-slate-300 rounded-lg overflow-hidden">
                        <iframe
                          src={pdfPreviewUrl}
                          className="w-full h-full"
                          title="Vista previa de la prefactura"
                        />
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
                      <span className="font-bold text-lg text-slate-900">${selectedRecords.reduce((sum: number, r: any) => sum + (r.data?.matchedPrice || r.totalValue || 0), 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center bg-white/60 p-3 rounded-lg">
                      <span className="font-semibold text-slate-800">Servicios Adicionales:</span>
                      <span className="font-bold text-lg text-slate-900">${selectedAdditionalServices.reduce((sum, s) => sum + s.amount, 0).toFixed(2)}</span>
                    </div>
                    <div className="border-t-2 border-slate-300 pt-3 flex justify-between items-center bg-gradient-to-r from-slate-200 to-blue-200 p-4 rounded-lg">
                      <span className="font-bold text-lg text-slate-900">Total:</span>
                      <span className="font-bold text-2xl text-slate-900">${totalSelected.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Botones de navegación */}
                <div className="flex justify-between pt-4">
                  <Button 
                    variant="outline"
                    onClick={handlePrevStep}
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
                      disabled={!pdfPreviewUrl}
                    >
                      <Download className="mr-2 h-5 w-5" />
                      Descargar PDF
                    </Button>
                    
                    <Button 
                      onClick={handleCreatePrefactura}
                      className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold px-8 py-3 shadow-lg transform transition-all duration-200 hover:scale-105"
                      disabled={!prefacturaData.prefacturaNumber || selectedRecords.length === 0 || isCreatingPrefactura}
                    >
                      {isCreatingPrefactura ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Creando Prefactura...
                        </>
                      ) : (
                        <>
                          <FileText className="mr-2 h-5 w-5" />
                          Crear Prefactura
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {step === 'select' && (
            <Card>
              <CardContent>
                <div className="mb-3 flex items-center gap-3 pt-4">
                  <div className="text-sm text-muted-foreground">Total en base de datos (cargados): <span className="font-medium">{trasiegoRecords.length}</span></div>
                  <div className="ml-auto w-full max-w-md">
                    <Input placeholder="Buscar por contenedor, cliente o orden..." value={search} onChange={(e) => setSearch(e.target.value)} />
                  </div>
                </div>
                <div className="rounded-md border overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>
                          <Checkbox
                            checked={selectedRecordIds.length > 0 && selectedRecordIds.length === trasiegoRecords.length}
                            onCheckedChange={(c: boolean) => {
                              if (c) setSelectedRecordIds(trasiegoRecords.map((r: any) => r._id || r.id))
                              else setSelectedRecordIds([])
                            }}
                          />
                        </TableHead>
                        <TableHead>Contenedor</TableHead>
                        <TableHead>Fecha Movimiento</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>F/E</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Orden</TableHead>
                        <TableHead>Ruta</TableHead>
                        <TableHead>Operación</TableHead>
                        <TableHead>Monto</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {trasiegoRecords.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={12} className="text-center text-muted-foreground py-8">No hay registros</TableCell>
                        </TableRow>
                      ) : (
                        Array.from(groupedByClient.entries()).map(([clientName, records]) => (
                          paginatedRecords
                            .filter(rec => {
                              // Agrupar por cliente solo los de la página actual
                              const name = (() => {
                                const d = rec?.data || {}
                                let n = 'PTY SHIP SUPPLIERS, S.A.'
                                const byId = d.clientId || rec?.clientId
                                if (byId) {
                                  const c = clients.find((x: any) => (x._id || x.id) === byId)
                                  if (c) n = c.type === 'natural' ? c.fullName : c.companyName
                                } else {
                                  const bySap = d.clientSapCode || rec?.clientSapCode
                                  if (bySap) {
                                    const c = clients.find((x: any) => (x.sapCode || '').toLowerCase() === String(bySap).toLowerCase())
                                    if (c) n = c.type === 'natural' ? c.fullName : c.companyName
                                  }
                                }
                                return n
                              })()
                              return name === clientName
                            })
                            .map((rec, idx) => (
                              <TableRow key={(rec as any)._id || rec.id}>
                                <TableCell>
                                  <Checkbox checked={isSelected((rec as any)._id || rec.id)} onCheckedChange={(c: boolean) => toggleRecord((rec as any)._id || rec.id, !!c)} />
                                </TableCell>
                                <TableCell className="font-mono text-sm">{(rec as any).data?.container || ''}</TableCell>
                                <TableCell>{(rec as any).data?.moveDate || '-'}</TableCell>
                                <TableCell>
                                  <Badge variant="secondary">Trasiego</Badge>
                                </TableCell>
                                <TableCell>{(rec as any).data?.fe || '-'}</TableCell>
                                <TableCell>{clientName}</TableCell>
                                <TableCell>{(rec as any).data?.containerConsecutive || (rec as any).data?.order || ''}</TableCell>
                                <TableCell>{(rec as any).data?.leg || `${(rec as any).data?.from || ''} → ${(rec as any).data?.to || ''}`}</TableCell>
                                <TableCell>
                                  <Badge variant={((rec as any).data?.moveType || '').toLowerCase() === 'import' ? 'default' : 'outline'}>
                                    {((rec as any).data?.moveType || 'IMPORT').toUpperCase()}
                                  </Badge>
                                </TableCell>
                                <TableCell>${((rec as any).data?.matchedPrice || (rec as any).totalValue || 0).toFixed(2)}</TableCell>
                                <TableCell>
                                  {(() => {
                                    const isMatched = (((rec as any).data?.matchedPrice || 0) > 0) || ((rec as any).data?.isMatched === true)
                                    const isCompleted = isMatched || (((rec as any).status || '').toLowerCase() === 'completado')
                                    return (
                                      <Badge variant={isCompleted ? 'default' : 'secondary'}>
                                        {isCompleted ? 'Completado' : 'Pendiente'}
                                      </Badge>
                                    )
                                  })()}
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-600 hover:text-slate-800 hover:bg-slate-100" onClick={() => handleViewRecord(rec)} title="Ver">
                                      <EyeIcon className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleDeleteRecord(rec as any)} title="Eliminar">
                                      <TrashIcon className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="flex items-center justify-between mt-6">
                    <div className="text-sm">
                      Seleccionados: {selectedRecords.length} de {trasiegoRecords.length} | Total: <span className="font-semibold">${totalSelected.toFixed(2)}</span>
                    </div>
                    <div className="flex gap-2 items-center">
                      <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                        Anterior
                      </Button>
                      <span className="text-xs mx-2">Página {currentPage} de {totalPages}</span>
                      <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                        Siguiente
                      </Button>
                    </div>
                    <div className="flex gap-2 items-center">
                      {/* Controles de paginación */}
                      <Button onClick={handleNextStep} disabled={selectedRecords.length === 0}>Seguir al Paso 2</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            



             {/* Modal de vista previa del PDF */}
             <Dialog open={showPdfPreview} onOpenChange={handleClosePdfPreview}>
               <DialogContent className="max-w-6xl max-h-[90vh]">
                 <DialogHeader>
                   <DialogTitle className="flex items-center gap-2">
                     <Eye className="h-5 w-5" />
                     {`Previsualización de Prefactura - ${prefacturaData.prefacturaNumber || 'TRK-PRE'}`}
                   </DialogTitle>
                 </DialogHeader>
                 <div className="flex-1 min-h-[70vh]">
                   {modalPdfUrl && (
                     <iframe
                       src={modalPdfUrl}
                       className="w-full h-full min-h-[70vh] border rounded-lg"
                       title="Vista previa de prefactura"
                     />
                   )}
                 </div>
                 <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={handleClosePdfPreview}>
                    Cerrar
                  </Button>
                  <Button variant="outline" onClick={handleDownloadPDF}>
                    <Download className="h-4 w-4 mr-2" />
                    Descargar Previsualización
                  </Button>
                  <Button 
                    onClick={handleCreatePrefactura}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                    disabled={!prefacturaData.prefacturaNumber || selectedRecords.length === 0 || isCreatingPrefactura}
                  >
                    {isCreatingPrefactura ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creando...
                      </>
                    ) : (
                      `Crear Prefactura (${selectedRecords.length} registro${selectedRecords.length !== 1 ? 's' : ''})`
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* Modal de Detalles del Registro */}
            <Dialog open={isRecordModalOpen} onOpenChange={setIsRecordModalOpen}>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5" /> Detalles del Registro
                  </DialogTitle>
                </DialogHeader>
                {selectedRecordForView && (() => {
                  const rec: any = selectedRecordForView as any
                  const d = rec.data || {}
                  const createdAt = rec.createdAt ? new Date(rec.createdAt).toLocaleString('es-ES') : '—'
                  const moveDate = d.moveDate ? new Date(d.moveDate).toLocaleDateString('es-ES') : (d.moveDate || '—')
                  return (
                    <div className="space-y-6">
                      {/* Datos principales */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <span className="text-sm text-slate-600">Contenedor</span>
                          <div className="font-medium">{d.container || 'N/A'}</div>
                          <div className="text-xs text-slate-500">{(d.size ? `${d.size}'` : '')} {d.type || ''}</div>
                        </div>
                        <div>
                          <span className="text-sm text-slate-600">Cliente</span>
                          <div className="font-medium">{d.line || 'N/A'}</div>
                          <div className="text-xs text-slate-500">SAP: {rec.clientSapCode || d.clientSapCode || '—'}</div>
                        </div>
                        <div>
                          <span className="text-sm text-slate-600">Consecutivo / Orden</span>
                          <div className="font-medium">{d.containerConsecutive || d.order || 'N/A'}</div>
                        </div>
                        <div>
                          <span className="text-sm text-slate-600">Desde</span>
                          <div className="font-medium">{d.from || 'N/A'}</div>
                        </div>
                        <div>
                          <span className="text-sm text-slate-600">Hacia</span>
                          <div className="font-medium">{d.to || 'N/A'}</div>
                        </div>
                        <div>
                          <span className="text-sm text-slate-600">Ruta</span>
                          <div className="font-medium">{d.leg || `${d.from || ''}${d.to ? ' → ' + d.to : ''}` || 'N/A'}</div>
                        </div>
                        <div>
                          <span className="text-sm text-slate-600">F/E</span>
                          <div className="font-medium">{d.fe || '—'}</div>
                        </div>
                        <div>
                          <span className="text-sm text-slate-600">Operación</span>
                          <div className="font-medium">{(d.moveType || 'IMPORT').toString().toUpperCase()}</div>
                        </div>
                        <div>
                          <span className="text-sm text-slate-600">Chofer</span>
                          <div className="font-medium">{d.driverName || '—'}</div>
                        </div>
                        <div>
                          <span className="text-sm text-slate-600">Placa</span>
                          <div className="font-medium">{d.plate || '—'}</div>
                        </div>
                        <div>
                          <span className="text-sm text-slate-600">Fecha de Movimiento</span>
                          <div className="font-medium">{moveDate}</div>
                        </div>
                        <div>
                          <span className="text-sm text-slate-600">Monto</span>
                          <div className="font-medium">${((d.matchedPrice || rec.totalValue || 0)).toFixed(2)}</div>
                        </div>
                        <div>
                          <span className="text-sm text-slate-600">Estado</span>
                          <div className="font-medium">{(rec.status || (((d.matchedPrice || 0) > 0 || d.isMatched) ? 'completado' : 'pendiente')).toString()}</div>
                        </div>
                      </div>

                      {/* Datos técnicos */}
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-50 p-3 rounded-md border">
                        <div>
                          <span className="text-xs text-slate-600">ID</span>
                          <div className="text-sm font-mono">{rec._id || rec.id || '—'}</div>
                        </div>
                        <div>
                          <span className="text-xs text-slate-600">Excel ID</span>
                          <div className="text-sm font-mono">{rec.excelId || '—'}</div>
                        </div>
                        <div>
                          <span className="text-xs text-slate-600">Creación</span>
                          <div className="text-sm">{createdAt}</div>
                        </div>
                        <div>
                          <span className="text-xs text-slate-600">Prefactura</span>
                          <div className="text-sm font-mono">{rec.invoiceId || '—'}</div>
                        </div>
                      </div>

                      {/* Datos crudos */}
                      <details className="bg-white border rounded-md">
                        <summary className="cursor-pointer px-3 py-2 text-sm font-medium text-slate-700">Ver datos crudos</summary>
                        <pre className="p-3 text-xs overflow-auto max-h-80">{JSON.stringify(rec, null, 2)}</pre>
                      </details>
                    </div>
                  )
                })()}
                <div className="flex justify-end pt-4">
                  <Button variant="outline" onClick={() => setIsRecordModalOpen(false)}>Cerrar</Button>
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
    </div>
  )
}


