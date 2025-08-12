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
import { Database, Search, X, Edit } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { Eye, Download, FileText, DollarSign, ArrowLeft, Plus, Trash2 } from "lucide-react"

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
  const [selectedAdditionalServices, setSelectedAdditionalServices] = useState<Array<{ id: string; name: string; amount: number }>>([])
  
  // Estados para PDF
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null)
  const [modalPdfUrl, setModalPdfUrl] = useState<string | null>(null)
  const [showPdfPreview, setShowPdfPreview] = useState(false)

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
    setSelectedAdditionalServices(prev => [...prev, { id: svc._id, name: svc.name, amount: additionalServiceAmount }])
    setAdditionalServiceId("")
    setAdditionalServiceAmount(0)
    
    // Regenerar PDF en vivo después de agregar servicio
    setTimeout(() => handleGenerateRealtimePDF(), 100)
  }
  
  const removeService = (id: string) => {
    setSelectedAdditionalServices(prev => prev.filter(s => s.id !== id))
    
    // Regenerar PDF en vivo después de remover servicio
    setTimeout(() => handleGenerateRealtimePDF(), 100)
  }

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

  // KPI summary (solo trasiego): mostrar total, trasiego y prefacturados
  const totalDb = trasiegoRecords.length
  const trasiegoCount = trasiegoRecords.length
  const pendingCount = trasiegoRecords.filter((r: any) => (r.status || '').toLowerCase() === 'pendiente').length
  const allTruckingRecords = useAppSelector(state => selectRecordsByModule(state as any, 'trucking')) as any[]
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

    // Agregar servicios adicionales como filas de la tabla (estilo PTYSS)
    if (selectedAdditionalServices.length > 0) {
      selectedAdditionalServices.forEach(svc => {
        const name = svc.name || 'Additional Service'
        const amount = Number(svc.amount || 0)
        bodyRows.push([1, name, amount.toFixed(2), amount.toFixed(2)])
      })
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

    // Detalles del contenedor (estilo PTYSS)
    doc.setFontSize(9)
    doc.setFont(undefined, 'bold')
    doc.text('Detalles de Contenedores:', 15, y)
    y += 5
    doc.setFont(undefined, 'normal')
    const firstRecord = selectedRecords[0] as any
    const cont = firstRecord?.data?.container || 'N/A'
    const from = firstRecord?.data?.from || (firstRecord?.data?.pol || '') || 'N/A'
    const to = firstRecord?.data?.to || (firstRecord?.data?.pod || '') || 'N/A'
    const vessel = firstRecord?.data?.vessel || ''
    doc.text('Contenedor 1:', 15, y)
    y += 4
    doc.text(`CTN: ${cont}`, 25, y)
    y += 4
    doc.text(`DESDE: ${from}`, 25, y)
    y += 4
    doc.text(`HACIA: ${to}`, 25, y)
    y += 4
    if (vessel) {
      doc.text(`EMBARQUE: ${vessel}`, 25, y)
      y += 6
    } else {
      doc.text('EMBARQUE: N/A', 25, y)
      y += 6
    }

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
    doc.text('Make check payments payable to: PTY SHIP SUPPLIERS, S.A.', 15, y)
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
      const clientName = first?.data?.line || "Cliente"
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
    try {
      // Cliente del primer registro (por nombre en columna line)
      const first = selectedRecords[0]
      const clientName = first?.data?.line || "Cliente"
      const client = getClient(clientName)
      if (!client) {
        toast({ title: "Error", description: "No se encontró el cliente de los registros seleccionados", variant: "destructive" })
        return
      }
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
                <span className="font-medium text-slate-600">Trasiego:</span>
                <span className="ml-1 font-bold text-slate-900">{trasiegoCount}</span>
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
          {/* Filtros de tipo y estado removidos (todos son trasiego) */}
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
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-3">
                        <Label className="text-sm font-semibold text-slate-700">Servicio</Label>
                        <Select onValueChange={(value) => {
                          const service = services.find((s: any) => s._id === value)
                          if (service) {
                            setAdditionalServiceId(value)
                          }
                        }} value={additionalServiceId}>
                          <SelectTrigger className="bg-white border-slate-300 focus:border-slate-500 focus:ring-slate-500 h-12 text-base">
                            <SelectValue placeholder="Seleccionar servicio..." />
                          </SelectTrigger>
                          <SelectContent>
                            {services.filter((s: any) => s.module === 'trucking' && s.isActive).length === 0 ? (
                              <div className="p-2 text-sm text-muted-foreground">
                                No hay servicios disponibles
                              </div>
                            ) : (
                              services
                                .filter((s: any) => s.module === 'trucking' && s.isActive)
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
                          className="w-full h-12 text-base bg-white border-slate-300 focus:border-slate-500 focus:ring-slate-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      </div>
                      
                      <div className="space-y-3">
                        <Label className="text-sm font-semibold text-slate-700">&nbsp;</Label>
                        <Button 
                          onClick={addService}
                          disabled={!additionalServiceId || additionalServiceAmount <= 0}
                          className="w-full h-12 text-base bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white font-semibold shadow-md"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Agregar
                        </Button>
                      </div>
                    </div>
                    
                    {services.filter((s: any) => s.module === 'trucking' && s.isActive).length === 0 && (
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
                            <div className="font-semibold text-sm text-slate-900">{service.name}</div>
                            <div className="text-xs text-slate-600">Importe personalizado</div>
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
              disabled={!prefacturaData.prefacturaNumber || selectedRecords.length === 0}
            >
              {`Crear Prefactura (${selectedRecords.length} registro${selectedRecords.length !== 1 ? 's' : ''})`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}


