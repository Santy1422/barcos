"use client"

import { useEffect, useMemo, useState } from "react"
import { useAppDispatch, useAppSelector } from "@/lib/hooks"
import {
  fetchPendingRecordsByModule,
  selectPendingRecordsByModuleFromDB,
  type ExcelRecord as IndividualExcelRecord,
  updateMultipleRecordsStatusAsync,
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
import { useToast } from "@/hooks/use-toast"
import { Database, Search, X, Edit } from "lucide-react"
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
  }, [dispatch])

  // Selección de registros
  const [selectedRecordIds, setSelectedRecordIds] = useState<string[]>([])
  const toggleRecord = (recordId: string, checked: boolean) =>
    setSelectedRecordIds(prev => checked ? [...prev, recordId] : prev.filter(id => id !== recordId))
  const isSelected = (recordId: string) => selectedRecordIds.includes(recordId)

  // Paso actual (similar a PTYSS)
  type Step = 'select' | 'services' | 'review'
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
      case 'advanced': setIsDateModalOpen(true); break
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

  // Agrupar por cliente (columna 'line' en data)
  // Filtrar SOLO trasiego y por búsqueda
  const trasiegoRecords = useMemo(() => {
    const isTrasiego = (rec: any) => !!(rec?.data?.leg || rec?.data?.matchedPrice || rec?.data?.line)
    const matches = (rec: any) => {
      if (!search.trim()) return true
      const hay = (v?: string) => (v || "").toString().toLowerCase().includes(search.toLowerCase())
      return hay(rec?.data?.container) || hay(rec?.data?.line) || hay(rec?.data?.containerConsecutive) || hay(rec?.data?.order)
    }
    return (pendingTruckingRecords as any[]).filter(isTrasiego).filter(matches)
  }, [pendingTruckingRecords, search])

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
      const name = rec?.data?.line?.trim?.() || "SIN CLIENTE"
      if (!groups.has(name)) groups.set(name, [])
      groups.get(name)!.push(rec)
    })
    return groups
  }, [visibleRecords])

  const getClient = (name: string) => clients.find((c: any) =>
    c.type === 'juridico' ? c.companyName?.toLowerCase() === name.toLowerCase() : c.fullName?.toLowerCase() === name.toLowerCase()
  )

  const selectedRecords = useMemo(
    () => pendingTruckingRecords.filter((r: any) => selectedRecordIds.includes(r._id || r.id)),
    [pendingTruckingRecords, selectedRecordIds]
  )

  // Servicios adicionales (aplicados a la prefactura completa)
  const [additionalServiceId, setAdditionalServiceId] = useState<string>("")
  const [additionalServiceAmount, setAdditionalServiceAmount] = useState<number>(0)
  const [selectedAdditionalServices, setSelectedAdditionalServices] = useState<Array<{ id: string; name: string; amount: number }>>([])
  const addService = () => {
    if (!additionalServiceId || additionalServiceAmount <= 0) return
    const svc = services.find((s: any) => s._id === additionalServiceId)
    if (!svc) return
    setSelectedAdditionalServices(prev => [...prev, { id: svc._id, name: svc.name, amount: additionalServiceAmount }])
    setAdditionalServiceId("")
    setAdditionalServiceAmount(0)
  }
  const removeService = (id: string) => setSelectedAdditionalServices(prev => prev.filter(s => s.id !== id))

  const totalSelected = useMemo(() => {
    const base = selectedRecords.reduce((sum: number, r: any) => sum + (r.data?.matchedPrice || r.totalValue || 0), 0)
    const extras = selectedAdditionalServices.reduce((sum, s) => sum + s.amount, 0)
    return base + extras
  }, [selectedRecords, selectedAdditionalServices])

  const getSelectedClientName = (): string | null => {
    if (selectedRecords.length === 0) return null
    return selectedRecords[0]?.data?.line || null
  }

  const areAllSelectedSameClient = (): boolean => {
    if (selectedRecords.length === 0) return true
    const first = selectedRecords[0]?.data?.line || ''
    return selectedRecords.every((r: any) => (r?.data?.line || '') === first)
  }

  // KPI summary counts (solo trasiego)
  const totalDb = trasiegoRecords.length
  const localesCount = 0
  const trasiegoCount = trasiegoRecords.length
  const pendingCount = trasiegoRecords.filter((r: any) => (r.status || '').toLowerCase() === 'pendiente').length
  const completedCount = trasiegoRecords.filter((r: any) => (r.status || '').toLowerCase() === 'completado').length
  const prefacturadosCount = trasiegoRecords.filter((r: any) => (r.status || '').toLowerCase() === 'prefacturado').length

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
    } else if (step === 'services') {
      if (!prefacturaData.prefacturaNumber) {
        toast({ title: 'Número requerido', description: 'Completa el número de prefactura', variant: 'destructive' })
        return
      }
      setStep('review')
    }
  }

  const handlePrevStep = () => {
    if (step === 'services') setStep('select')
    if (step === 'review') setStep('services')
  }

  // PDF Prefactura estilo PTYSS (solo trasiego)
  const generatePrefacturaPdf = () => {
    if (selectedRecords.length === 0) {
      toast({ title: "Sin registros", description: "Selecciona al menos un registro", variant: "destructive" })
      return
    }
    const first = selectedRecords[0]
    const clientName = first?.data?.line || "Cliente"
    const client = getClient(clientName)

    const doc = new jsPDF()

    // Colores / encabezado similar a PTYSS
    const lightBlue = [59, 130, 246]
    doc.setFillColor(lightBlue[0], lightBlue[1], lightBlue[2])
    doc.rect(15, 15, 30, 15, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(12)
    doc.setFont(undefined, 'bold')
    doc.text('TRUCKING', 30, 25, { align: 'center' })

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

    // Información empresa
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

    // Filas de items (trasiego)
    const bodyRows = selectedRecords.map((r: any) => {
      const qty = 1
      const container = r.data?.container || ''
      const size = r.data?.size || r.data?.containerSize || ''
      const type = r.data?.type || r.data?.containerType || ''
      const leg = r.data?.leg || `${r.data?.from || ''} / ${r.data?.to || ''}`
      const price = (r.data?.matchedPrice || r.totalValue || 0)
      const desc = `Container: ${container}  ${size} ${type}  Route: ${leg}`
      return [1, desc, price.toFixed(2), price.toFixed(2)]
    })

    autoTable(doc, {
      startY: startY + 10,
      head: [],
      body: bodyRows,
      theme: 'plain',
      styles: { fontSize: 9 },
      columnStyles: { 0: { cellWidth: 20 }, 1: { cellWidth: 90 }, 2: { cellWidth: 35, halign: 'right' }, 3: { cellWidth: 35, halign: 'right' } },
    })

    let y = (doc as any).lastAutoTable.finalY + 6

    if (selectedAdditionalServices.length > 0) {
      doc.setFontSize(10)
      doc.setFont(undefined, 'bold')
      doc.text('ADDITIONAL SERVICES', 15, y)
      y += 4
      doc.setFontSize(9)
      doc.setFont(undefined, 'normal')
      selectedAdditionalServices.forEach(s => {
        doc.text(`- ${s.name}: $${s.amount.toFixed(2)}`, 18, y)
        y += 4
      })
    }

    y += 2
    doc.setFontSize(12)
    doc.setFont(undefined, 'bold')
    doc.text(`TOTAL: $${totalSelected.toFixed(2)}`, 15, y)

    const safeName = (clientDisplay || 'cliente').replace(/[^a-z0-9_-]+/gi, '_')
    doc.save(`prefactura_trucking_${safeName}.pdf`)
    toast({ title: "PDF generado", description: "Se descargó la prefactura en PDF" })
  }

  // Marcar como prefacturado
  const handleMarkPrefacturado = async () => {
    if (selectedRecords.length === 0) return
    try {
      const ids = selectedRecords.map((r: any) => r._id || r.id)
      await dispatch(updateMultipleRecordsStatusAsync({ recordIds: ids, status: "prefacturado", invoiceId: "" })).unwrap()
      toast({ title: "Registros actualizados", description: `${ids.length} registros marcados como prefactura` })
      setSelectedRecordIds([])
      dispatch(fetchPendingRecordsByModule("trucking"))
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "No se pudo marcar como prefacturado", variant: "destructive" })
    }
  }

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

      {/* Información del total de registros (estilo PTYSS) - solo Paso 1 */}
      {step === 'select' && (
        <div className="mb-4 mt-4 bg-gradient-to-r from-slate-100 to-blue-100 border border-slate-300 p-4 rounded-lg shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-600 rounded-lg">
              <Database className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1">
              <span className="text-sm font-semibold text-slate-900">
                Total de registros en la base de datos: {totalDb}
              </span>
            </div>
            <div className="flex gap-4 text-xs">
              <div className="bg-white/60 px-3 py-1 rounded-md">
                <span className="font-medium text-slate-600">Locales:</span>
                <span className="ml-1 font-bold text-slate-900">{localesCount}</span>
              </div>
              <div className="bg-white/60 px-3 py-1 rounded-md">
                <span className="font-medium text-slate-600">Trasiego:</span>
                <span className="ml-1 font-bold text-slate-900">{trasiegoCount}</span>
              </div>
              <div className="bg-white/60 px-3 py-1 rounded-md">
                <span className="font-medium text-slate-600">Pendientes:</span>
                <span className="ml-1 font-bold text-slate-900">{pendingCount}</span>
              </div>
              <div className="bg-white/60 px-3 py-1 rounded-md">
                <span className="font-medium text-slate-600">Completados:</span>
                <span className="ml-1 font-bold text-slate-900">{completedCount}</span>
              </div>
              <div className="bg-white/60 px-3 py-1 rounded-md">
                <span className="font-medium text-slate-600">Prefacturados:</span>
                <span className="ml-1 font-bold text-slate-900">{prefacturadosCount}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Búsqueda y Filtros (estilo PTYSS) - solo Paso 1 */}
      {step === 'select' && (
      <div className="mb-6 mt-4 space-y-4">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar por contenedor, cliente o orden..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <div className="grid grid-cols-1 md-grid-cols-3 md:grid-cols-3 gap-4">
          {/* Tipo (solo trasiego) */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-slate-700">Filtrar por tipo:</Label>
            <div className="flex gap-2">
              <Button variant="default" size="sm" className="text-xs" disabled>Todos</Button>
              <Button variant="default" size="sm" className="text-xs" disabled>Trasiego</Button>
            </div>
          </div>
          {/* Estado */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-slate-700">Filtrar por estado:</Label>
            <div className="flex gap-2">
              <Button variant={statusFilter==='all'?'default':'outline'} size="sm" onClick={()=>{setStatusFilter('all'); setSelectedRecordIds([])}} className="text-xs">Todos</Button>
              <Button variant={statusFilter==='pendiente'?'default':'outline'} size="sm" onClick={()=>{setStatusFilter('pendiente'); setSelectedRecordIds([])}} className="text-xs">Pendiente</Button>
              <Button variant={statusFilter==='completado'?'default':'outline'} size="sm" onClick={()=>{setStatusFilter('completado'); setSelectedRecordIds([])}} className="text-xs">Completado</Button>
            </div>
          </div>
          {/* Fecha */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-slate-700">Filtrar por fecha:</Label>
            <div className="flex flex-col sm:flex-row gap-3">
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
        </div>
      </div>
      )}
      {step === 'services' && (
      <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl">
        <CardHeader className="bg-gradient-to-r from-slate-700 to-slate-800 text-white rounded-t-lg">
          <CardTitle className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">🏷️</div>
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

          {/* Configuración de prefactura + servicios adicionales */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Columna izquierda */}
            <div className="lg:col-span-1 space-y-4">
              <div className="bg-gradient-to-br from-slate-50 to-blue-50 p-3 rounded-lg border border-slate-300">
                <h3 className="text-lg font-bold text-slate-900 border-b border-slate-300 pb-2 mb-2">Configuración de Prefactura</h3>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-sm font-semibold text-slate-700">Número de Prefactura *</Label>
                    <Input value={prefacturaData.prefacturaNumber} onChange={(e)=>setPrefacturaData({...prefacturaData, prefacturaNumber: e.target.value})} placeholder="TRK-PRE-000001" className="bg-white border-slate-300 focus:border-slate-500 focus:ring-slate-500" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm font-semibold text-slate-700">Notas (Opcional)</Label>
                    <Textarea rows={4} value={prefacturaData.notes} onChange={(e)=>setPrefacturaData({...prefacturaData, notes: e.target.value})} placeholder="Notas adicionales para la prefactura..." className="bg-white border-slate-300 focus:border-slate-500 focus:ring-slate-500" />
                  </div>
                </div>
              </div>
              {/* Servicios adicionales (manual, igual que Trucking tenía) */}
              <div className="bg-gradient-to-br from-slate-50 to-blue-50 p-3 rounded-lg border border-slate-300">
                <h3 className="text-lg font-bold text-slate-900 border-b border-slate-300 pb-2 mb-2">Servicios Adicionales</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-slate-700">Servicio</Label>
                      <select className="w-full border rounded h-10 px-2 bg-white border-slate-300 focus:border-slate-500 focus:ring-slate-500" value={additionalServiceId} onChange={(e)=>setAdditionalServiceId(e.target.value)}>
                        <option value="">Seleccionar...</option>
                        {services.filter((s: any) => s.module === 'trucking' && s.isActive).map((s: any) => (
                          <option key={s._id} value={s._id}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-slate-700">Importe</Label>
                      <Input type="number" min={0} step={0.01} value={additionalServiceAmount || ''} onChange={(e)=>setAdditionalServiceAmount(parseFloat(e.target.value) || 0)} className="h-10 bg-white border-slate-300 focus:border-slate-500 focus:ring-slate-500" />
                    </div>
                    <div className="space-y-2 flex items-end">
                      <Button onClick={addService} disabled={!additionalServiceId || additionalServiceAmount <= 0} className="w-full h-10 bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white">Agregar</Button>
                    </div>
                  </div>
                  {selectedAdditionalServices.length > 0 && (
                    <div className="rounded border p-2 text-sm bg-white/70">
                      {selectedAdditionalServices.map(s => (
                        <div key={s.id} className="flex items-center justify-between py-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{s.name}</Badge>
                            <span>${s.amount.toFixed(2)}</span>
                          </div>
                          <Button variant="ghost" size="sm" onClick={()=>removeService(s.id)}>Quitar</Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
            {/* Columna derecha: Indicadores y acciones */}
            <div className="lg:col-span-2">
              {/* Aquí mantenemos la lista/tablas de selección que ya adaptaste */}
              <div className="flex items-center justify-end gap-2 mt-4">
                <Button variant="outline" onClick={handlePrevStep}>Atrás</Button>
                <Button onClick={handleNextStep} disabled={!prefacturaData.prefacturaNumber}>Siguiente</Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      )}

      {step === 'select' && (
        <Card>
          <CardHeader>
          <CardTitle>Paso 1: Selección de Registros (Trucking - Solo Trasiego)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-3 flex items-center gap-3">
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
                        checked={selectedRecordIds.length > 0 && selectedRecordIds.length === pendingTruckingRecords.length}
                        onCheckedChange={(c: boolean) => {
                          if (c) setSelectedRecordIds(pendingTruckingRecords.map((r: any) => r._id || r.id))
                          else setSelectedRecordIds([])
                        }}
                      />
                    </TableHead>
                    <TableHead>Contenedor</TableHead>
                    <TableHead>Fecha Movimiento</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Orden</TableHead>
                    <TableHead>Ruta</TableHead>
                    <TableHead>Operación</TableHead>
                    <TableHead>Monto</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trasiegoRecords.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-muted-foreground py-8">No hay registros</TableCell>
                    </TableRow>
                  ) : (
                    Array.from(groupedByClient.entries()).map(([clientName, records]) => (
                      <>
                        {records.map((rec, idx) => (
                          <TableRow key={(rec as any)._id || rec.id}>
                            <TableCell>
                              <Checkbox checked={isSelected((rec as any)._id || rec.id)} onCheckedChange={(c: boolean) => toggleRecord((rec as any)._id || rec.id, !!c)} />
                            </TableCell>
                            <TableCell className="font-mono text-sm">{(rec as any).data?.container || ''}</TableCell>
                            <TableCell>{(rec as any).data?.moveDate || '-'}</TableCell>
                            <TableCell>
                              <Badge variant="secondary">Trasiego</Badge>
                            </TableCell>
                            <TableCell>{clientName}</TableCell>
                            <TableCell>{(rec as any).data?.containerConsecutive || (rec as any).data?.order || ''}</TableCell>
                            <TableCell>{(rec as any).data?.leg || `${(rec as any).data?.from || ''} → ${(rec as any).data?.to || ''}`}</TableCell>
                            <TableCell>
                              <Badge variant={((rec as any).data?.moveType || '').toLowerCase() === 'import' ? 'default' : 'outline'}>
                                {((rec as any).data?.moveType || 'IMPORT').toUpperCase()}
                              </Badge>
                            </TableCell>
                            <TableCell>${((rec as any).data?.matchedPrice || (rec as any).totalValue || 0).toFixed(2)}</TableCell>
                          </TableRow>
                        ))}
                        <TableRow>
                          <TableCell></TableCell>
                          <TableCell colSpan={7} className="text-right font-medium">Subtotal {clientName}</TableCell>
                          <TableCell className="font-medium">
                            ${records.reduce((sum: number, r: any) => sum + (r.data?.matchedPrice || r.totalValue || 0), 0).toFixed(2)}
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell colSpan={9}><Separator /></TableCell>
                        </TableRow>
                      </>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm">
                Seleccionados: {selectedRecords.length} de {trasiegoRecords.length} | Total: <span className="font-semibold">${totalSelected.toFixed(2)}</span>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleNextStep} disabled={selectedRecords.length === 0}>Siguiente</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 'services' && (
        <Card>
          <CardHeader>
            <CardTitle>Servicios adicionales</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap items-end gap-3">
              <div className="min-w-[240px]">
                <Label>Servicio</Label>
                <select
                  className="w-full border rounded h-9 px-2"
                  value={additionalServiceId}
                  onChange={(e) => setAdditionalServiceId(e.target.value)}
                  disabled={servicesLoading}
                >
                  <option value="">Seleccionar...</option>
                  {services.filter((s: any) => s.module === 'trucking' && s.isActive).map((s: any) => (
                    <option key={s._id} value={s._id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div className="w-32">
                <Label>Monto</Label>
                <Input type="number" min={0} step={0.01} value={additionalServiceAmount || ''} onChange={(e) => setAdditionalServiceAmount(parseFloat(e.target.value) || 0)} />
              </div>
              <Button onClick={addService} disabled={!additionalServiceId || additionalServiceAmount <= 0}>Agregar</Button>
            </div>
            {selectedAdditionalServices.length > 0 && (
              <div className="rounded border p-2 text-sm">
                {selectedAdditionalServices.map(s => (
                  <div key={s.id} className="flex items-center justify-between py-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{s.name}</Badge>
                      <span>${s.amount.toFixed(2)}</span>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => removeService(s.id)}>Quitar</Button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-center justify-between mt-2">
              <div className="text-sm">Cliente: <span className="font-medium">{getSelectedClientName() || '-'}</span></div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handlePrevStep}>Atrás</Button>
                <Button onClick={handleNextStep}>Siguiente</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 'review' && (
        <Card>
          <CardHeader>
            <CardTitle>Revisión y confirmación</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm mb-2">Cliente: <span className="font-medium">{getSelectedClientName() || '-'}</span></div>
            <div className="rounded-md border overflow-auto mb-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Contenedor</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Ruta</TableHead>
                    <TableHead>Monto</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedRecords.map((r: any, idx: number) => (
                    <TableRow key={r._id || r.id}>
                      <TableCell>{idx + 1}</TableCell>
                      <TableCell className="font-mono text-sm">{r.data?.container || ''}</TableCell>
                      <TableCell>{r.data?.size || ''}</TableCell>
                      <TableCell>{r.data?.type || ''}</TableCell>
                      <TableCell>{r.data?.leg || ''}</TableCell>
                      <TableCell>${(r.data?.matchedPrice || r.totalValue || 0).toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {selectedAdditionalServices.length > 0 && (
              <div className="rounded border p-3 text-sm mb-4">
                <div className="font-medium mb-2">Servicios Adicionales</div>
                {selectedAdditionalServices.map(s => (
                  <div key={s.id} className="flex items-center justify-between py-1">
                    <span>{s.name}</span>
                    <span>${s.amount.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-center justify-between">
              <div className="text-sm">
                Total Prefactura: <span className="font-semibold">${totalSelected.toFixed(2)}</span>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handlePrevStep}>Atrás</Button>
                <Button variant="outline" onClick={generatePrefacturaPdf} disabled={selectedRecords.length === 0}>Descargar PDF</Button>
                <Button onClick={handleMarkPrefacturado} disabled={selectedRecords.length === 0}>Marcar como Prefactura</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}


