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
import { Database, Search, X, Edit, Eye as EyeIcon, Trash2 as TrashIcon, Calendar, Eye, Download, FileText, DollarSign, ArrowLeft, Filter, Loader2, Check } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

// Función para convertir números de serie de Excel a fechas legibles
const convertExcelDateToReadable = (excelDate: string | number): string => {
  if (!excelDate) return ''
  
  let date: Date
  
  if (typeof excelDate === 'string' && excelDate.includes('T')) {
    date = new Date(excelDate)
  } else if (typeof excelDate === 'string' && excelDate.includes('-') && !excelDate.includes('/')) {
    date = new Date(excelDate)
  } else if (typeof excelDate === 'string' && excelDate.includes('/')) {
    const dateStr = excelDate.split(' ')[0]
    const parts = dateStr.split('/')
    
    if (parts.length === 3) {
      const [part1, part2, part3] = parts
      if (part1.length <= 2 && part2.length <= 2 && part3.length === 4) {
        const day = part2.padStart(2, '0')
        const month = part1.padStart(2, '0')
        const year = part3
        return `${day}/${month}/${year}`
      }
    }
    
    date = new Date(excelDate)
  } else {
    const excelSerialNumber = Number(excelDate)
    if (isNaN(excelSerialNumber)) return String(excelDate)
    
    const excelEpoch = new Date(1900, 0, 1)
    const millisecondsPerDay = 24 * 60 * 60 * 1000
    const adjustedSerialNumber = excelSerialNumber > 59 ? excelSerialNumber - 1 : excelSerialNumber
    
    date = new Date(excelEpoch.getTime() + (adjustedSerialNumber - 1) * millisecondsPerDay)
  }
  
  if (isNaN(date.getTime())) {
    return String(excelDate)
  }
  
  const day = date.getDate().toString().padStart(2, '0')
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const year = date.getFullYear()
  
  return `${day}/${month}/${year}`
}

export function ShipChandlerPrefactura() {
  const dispatch = useAppDispatch()
  const { toast } = useToast()

  // Cargar datos base
  const shipchandlerRecords = useAppSelector(state => selectRecordsByModule(state as any, "shipchandler"))
  const clients = useAppSelector(selectAllClients)

  useEffect(() => {
    dispatch(fetchRecordsByModule("shipchandler"))
    dispatch(fetchClients('shipchandler'))
  }, [dispatch])

  // Selección de registros
  const [selectedRecordIds, setSelectedRecordIds] = useState<string[]>([])
  
  // Función helper para obtener el clientId de un registro
  const getRecordClientId = (record: any): string | null => {
    const d = record?.data || {}
    const byId = d.clientId || record?.clientId
    if (byId) return byId
    
    const bySap = d.clientSapCode || record?.clientSapCode
    if (bySap) {
      const c = clients.find((x: any) => (x.sapCode || '').toLowerCase() === String(bySap).toLowerCase())
      if (c) return c._id || c.id
    }
    
    // Si no hay clientId ni SAP code, usar customerName como identificador único
    if (d.customerName) {
      const c = clients.find((x: any) => {
        const cName = x.type === 'natural' ? x.fullName : x.companyName
        return cName === d.customerName
      })
      if (c) return c._id || c.id
    }
    
    return null
  }
  
  const toggleRecord = (recordId: string, checked: boolean) => {
    if (!checked) {
      // Deseleccionar siempre está permitido
      setSelectedRecordIds(prev => prev.filter(id => id !== recordId))
      return
    }
    
    // Obtener el registro que se está intentando seleccionar
    const recordToSelect = visibleRecords.find((r: any) => (r._id || r.id) === recordId)
    if (!recordToSelect) return
    
    const newRecordClientId = getRecordClientId(recordToSelect)
    
    // Si ya hay registros seleccionados, verificar que sean del mismo cliente
    if (selectedRecordIds.length > 0) {
      const firstSelectedRecord = visibleRecords.find((r: any) => selectedRecordIds.includes(r._id || r.id))
      if (firstSelectedRecord) {
        const firstClientId = getRecordClientId(firstSelectedRecord)
        
        // Si los clientes no coinciden, mostrar error y no permitir selección
        if (firstClientId !== newRecordClientId) {
          toast({
            title: "Error de selección",
            description: "Solo puedes seleccionar registros del mismo cliente. Deselecciona los registros actuales para seleccionar registros de otro cliente.",
            variant: "destructive"
          })
          return
        }
      }
    }
    
    // Si no hay registros seleccionados o el cliente coincide, permitir selección
    setSelectedRecordIds(prev => [...prev, recordId])
  }
  
  const isSelected = (recordId: string) => selectedRecordIds.includes(recordId)
  
  // Función para verificar si un registro puede ser seleccionado
  const canSelectRecord = (record: any): boolean => {
    // Si no hay registros seleccionados, todos pueden ser seleccionados
    if (selectedRecordIds.length === 0) return true
    
    // Obtener el cliente del registro actual
    const recordClientId = getRecordClientId(record)
    if (!recordClientId) return false
    
    // Obtener el cliente del primer registro seleccionado
    const firstSelectedRecord = visibleRecords.find((r: any) => selectedRecordIds.includes(r._id || r.id))
    if (!firstSelectedRecord) return true
    
    const firstClientId = getRecordClientId(firstSelectedRecord)
    
    // Solo puede ser seleccionado si es del mismo cliente
    return recordClientId === firstClientId
  }

  // Paso actual
  type Step = 'select' | 'services'
  const [step, setStep] = useState<Step>('select')
  const [search, setSearch] = useState<string>("")
  const clearSelection = () => setSelectedRecordIds([])

  // Filtros
  const [statusFilter, setStatusFilter] = useState<'all'|'pendiente'|'completado'|'prefacturado'>('all')
  const [clientFilter, setClientFilter] = useState<string>('all')
  const [vesselFilter, setVesselFilter] = useState<string>('all')
  const [showClientFilter, setShowClientFilter] = useState(false)
  const [showVesselFilter, setShowVesselFilter] = useState(false)
  const [dateFilter, setDateFilter] = useState<'createdAt'|'date'>('createdAt')
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
        setIsDateModalOpen(true)
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
    { prefacturaNumber: `SCH-PRE-${Date.now().toString().slice(-5)}`, notes: "" }
  )

  // Filtrar registros que no estén prefacturados/facturados
  const availableRecords = useMemo(() => {
    return (shipchandlerRecords as any[]).filter((rec: any) => {
      const status = (rec?.status || '').toLowerCase()
      return !['prefacturado', 'facturado'].includes(status)
    })
  }, [shipchandlerRecords])

  // Aplicar TODOS los filtros
  const visibleRecords = useMemo(() => {
    let list: any[] = [...availableRecords]
    
    // Filtro de búsqueda (vessel y cliente)
    if (search.trim()) {
      const hay = (v?: string) => (v || "").toString().toLowerCase().includes(search.toLowerCase())
      list = list.filter((rec: any) => {
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
          return d.customerName || 'Cliente'
        })()
        const vessel = (rec?.data?.vessel || '').toString()
        return hay(vessel) || hay(clientName) || hay(rec?.data?.invoiceNo) || hay(rec?.data?.referenceNo)
      })
    }
    
    // Filtro de estado
    if (statusFilter !== 'all') {
      list = list.filter(r => (r.status || '').toLowerCase() === statusFilter)
    }
    
    // Filtro de cliente
    if (clientFilter !== 'all') {
      list = list.filter((rec: any) => {
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
          return d.customerName || 'Cliente'
        })()
        return clientName === clientFilter
      })
    }
    
    // Filtro de vessel
    if (vesselFilter !== 'all') {
      list = list.filter((rec: any) => {
        const vessel = (rec?.data?.vessel || '').toString()
        return vessel === vesselFilter
      })
    }
    
    // Filtro de fecha
    if (isUsingPeriodFilter && startDate && endDate) {
      const s = new Date(startDate)
      const e = new Date(endDate); e.setHours(23,59,59,999)
      list = list.filter((r: any) => {
        let val = dateFilter === 'date' ? (r.data?.date || r.createdAt) : r.createdAt
        
        if (dateFilter === 'date' && val && typeof val === 'string' && val.includes('/') && !val.includes('T')) {
          const parts = val.split('/')
          if (parts.length === 3) {
            const [month, day, year] = parts
            val = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
          }
        }
        
        if (!val) return false
        const recDate = new Date(val)
        return recDate >= s && recDate <= e
      })
    }
    
    return list
  }, [availableRecords, search, statusFilter, clientFilter, vesselFilter, isUsingPeriodFilter, startDate, endDate, dateFilter, clients])

  // Obtener clientes únicos
  const uniqueClients = useMemo(() => {
    const clientSet = new Set<string>()
    availableRecords.forEach((rec: any) => {
      const d = rec?.data || {}
      const byId = d.clientId || rec?.clientId
      if (byId) {
        const c = clients.find((x: any) => (x._id || x.id) === byId)
        if (c) clientSet.add(c.type === 'natural' ? c.fullName : c.companyName)
      } else {
        const bySap = d.clientSapCode || rec?.clientSapCode
        if (bySap) {
          const c = clients.find((x: any) => (x.sapCode || '').toLowerCase() === String(bySap).toLowerCase())
          if (c) clientSet.add(c.type === 'natural' ? c.fullName : c.companyName)
        } else if (d.customerName) {
          clientSet.add(d.customerName)
        }
      }
    })
    return Array.from(clientSet).sort()
  }, [availableRecords, clients])

  // Obtener vessels únicos
  const uniqueVessels = useMemo(() => {
    const vesselSet = new Set<string>()
    availableRecords.forEach((rec: any) => {
      const vessel = (rec?.data?.vessel || '').toString().trim()
      if (vessel) vesselSet.add(vessel)
    })
    return Array.from(vesselSet).sort()
  }, [availableRecords])

  // Registros seleccionados
  const selectedRecords = useMemo(() => {
    return visibleRecords.filter((r: any) => selectedRecordIds.includes(r._id || r.id))
  }, [visibleRecords, selectedRecordIds])

  // Calcular total de servicios a cobrar
  const calculateServicesTotal = (record: any): number => {
    const data = record?.data || {}
    const deliveryExpenses = Number(data.deliveryExpenses || 0)
    const portEntryFee = Number(data.portEntryFee || 0)
    const customsFee = Number(data.customsFee || 0)
    const authorities = Number(data.authorities || 0)
    const otherExpenses = Number(data.otherExpenses || 0)
    const overTime = Number(data.overTime || 0)
    const total = Number(data.total || 0)
    
    return deliveryExpenses + portEntryFee + customsFee + authorities + otherExpenses + overTime + total
  }

  // Total seleccionado
  const totalSelected = useMemo(() => {
    return selectedRecords.reduce((sum: number, r: any) => sum + calculateServicesTotal(r), 0)
  }, [selectedRecords])

  // Obtener nombre del cliente
  const getClientName = (rec: any): string => {
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
    return d.customerName || 'Cliente'
  }

  const getClient = (name: string) => {
    return clients.find((c: any) => {
      const cName = c.type === 'natural' ? c.fullName : c.companyName
      return cName === name
    })
  }

  const getSelectedClientName = () => {
    if (selectedRecords.length === 0) return null
    return getClientName(selectedRecords[0])
  }

  // Navegación de pasos
  const handleNextStep = () => {
    if (selectedRecords.length === 0) {
      toast({ title: "Error", description: "Selecciona al menos un registro", variant: "destructive" })
      return
    }
    
    // Generar número de prefactura basado en el invoiceNo del primer registro
    const firstRecord = selectedRecords[0]
    const invoiceNo = (firstRecord?.data?.invoiceNo || '').toString().trim()
    
    if (invoiceNo) {
      // Agregar prefijo "PRE-" al número de invoice (con guion)
      // Si el invoiceNo ya tiene formato PRE-, mantenerlo; si no, agregar PRE-
      const prefacturaNumber = invoiceNo.startsWith('PRE-') ? invoiceNo : `PRE-${invoiceNo}`
      setPrefacturaData(prev => ({
        ...prev,
        prefacturaNumber: prefacturaNumber
      }))
    }
    
    setStep('services')
    // Generar vista previa del PDF en tiempo real
    setTimeout(() => handleGenerateRealtimePDF(), 100)
  }
  const handlePrevStep = () => {
    setStep('select')
  }

  // Vista y edición de registros
  const handleViewRecord = (rec: any) => {
    setSelectedRecordForView(rec)
    setIsRecordModalOpen(true)
  }

  const handleDeleteRecord = async (rec: any) => {
    if (!confirm('¿Estás seguro de eliminar este registro?')) return
    try {
      await dispatch(deleteRecordAsync(rec._id || rec.id)).unwrap()
      toast({ title: "Registro eliminado", description: "El registro ha sido eliminado correctamente" })
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "No se pudo eliminar el registro", variant: "destructive" })
    }
  }

  // Generar PDF con número de prefactura específico
  const generatePrefacturaPdfWithNumber = (prefacturaNum?: string) => {
    const numberToUse = prefacturaNum || prefacturaData.prefacturaNumber
    return generatePrefacturaPdfInternal(numberToUse)
  }

  // Generar PDF
  const generatePrefacturaPdf = () => {
    return generatePrefacturaPdfInternal(prefacturaData.prefacturaNumber)
  }

  const generatePrefacturaPdfInternal = (prefacturaNumberParam?: string) => {
    if (selectedRecords.length === 0) {
      toast({ title: "Sin registros", description: "Selecciona al menos un registro", variant: "destructive" })
      return
    }
    const first = selectedRecords[0]
    const clientName = getSelectedClientName() || "Cliente"
    const client = getClient(clientName)
    // Obtener todos los vessels únicos de los registros seleccionados
    const vessels = Array.from(new Set(
      selectedRecords
        .map((rec: any) => (rec?.data?.vessel || '').toString().trim())
        .filter((v: string) => v.length > 0)
    ))
    const vesselDisplay = vessels.length > 0 ? vessels.join(', ') : 'N/A'

    const doc = new jsPDF()

    // Colores / encabezado
    const lightBlue = [59, 130, 246]
    doc.setFillColor(lightBlue[0], lightBlue[1], lightBlue[2])
    doc.rect(15, 15, 30, 15, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(14)
    doc.setFont(undefined, 'bold')
    doc.text('SCH', 30, 23, { align: 'center', baseline: 'middle' })

    // Número de prefactura y fecha
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(14)
    doc.setFont(undefined, 'bold')
    // Usar el parámetro o el valor del estado, o generar uno automáticamente
    let prefacturaNumber = prefacturaNumberParam || prefacturaData.prefacturaNumber
    if (!prefacturaNumber && selectedRecords.length > 0) {
      const invoiceNo = (first?.data?.invoiceNo || '').toString().trim()
      prefacturaNumber = invoiceNo ? `PRE-${invoiceNo}` : 'PRE-N/A'
    }
    // Limpiar el número de prefactura para evitar duplicados de PRE o guiones extra
    if (prefacturaNumber && prefacturaNumber.startsWith('PRE-PRE-')) {
      prefacturaNumber = prefacturaNumber.replace(/^PRE-PRE-/, 'PRE-')
    }
    // Si tiene formato SCH-PRE-xxx, extraer solo la parte relevante y usar el invoiceNo
    if (prefacturaNumber && prefacturaNumber.includes('SCH-PRE-')) {
      const invoiceNo = (first?.data?.invoiceNo || '').toString().trim()
      if (invoiceNo) {
        prefacturaNumber = `PRE-${invoiceNo}`
      }
    }
    // Asegurar que si no tiene guion después de PRE, agregarlo (excepto si ya tiene PRE-)
    if (prefacturaNumber && prefacturaNumber.startsWith('PRE') && !prefacturaNumber.startsWith('PRE-')) {
      prefacturaNumber = prefacturaNumber.replace(/^PRE/, 'PRE-')
    }
    doc.text(`PREFACTURA No. ${prefacturaNumber}`, 195, 20, { align: 'right' })

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
    doc.text('RUC: 155583454-1-2022 DV 42', 15, 54)
    doc.text('Panama, Panama', 15, 58)

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

    // Crear filas de servicios a cobrar
    const bodyRows: any[] = []
    
    selectedRecords.forEach((rec: any) => {
      const data = rec?.data || {}
      const invoiceNo = data.invoiceNo || ''
      
      // Agregar servicios solo si tienen valores
      if (Number(data.deliveryExpenses || 0) > 0) {
        bodyRows.push([1, `Delivery Expenses - Invoice: ${invoiceNo}`, Number(data.deliveryExpenses || 0).toFixed(2), Number(data.deliveryExpenses || 0).toFixed(2)])
      }
      if (Number(data.portEntryFee || 0) > 0) {
        bodyRows.push([1, `Port Entry Fee - Invoice: ${invoiceNo}`, Number(data.portEntryFee || 0).toFixed(2), Number(data.portEntryFee || 0).toFixed(2)])
      }
      if (Number(data.customsFee || 0) > 0) {
        bodyRows.push([1, `Customs Fee - Invoice: ${invoiceNo}`, Number(data.customsFee || 0).toFixed(2), Number(data.customsFee || 0).toFixed(2)])
      }
      if (Number(data.authorities || 0) > 0) {
        bodyRows.push([1, `Authorities - Invoice: ${invoiceNo}`, Number(data.authorities || 0).toFixed(2), Number(data.authorities || 0).toFixed(2)])
      }
      if (Number(data.otherExpenses || 0) > 0) {
        bodyRows.push([1, `Other Expenses - Invoice: ${invoiceNo}`, Number(data.otherExpenses || 0).toFixed(2), Number(data.otherExpenses || 0).toFixed(2)])
      }
      if (Number(data.overTime || 0) > 0) {
        bodyRows.push([1, `Over Time - Invoice: ${invoiceNo}`, Number(data.overTime || 0).toFixed(2), Number(data.overTime || 0).toFixed(2)])
      }
      if (Number(data.total || 0) > 0) {
        bodyRows.push([1, `Total - Invoice: ${invoiceNo}`, Number(data.total || 0).toFixed(2), Number(data.total || 0).toFixed(2)])
      }
    })

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

    // Asegurar color de texto negro
    doc.setTextColor(0, 0, 0)

    // Vessel - después de los items, antes del total
    doc.setFont(undefined, 'bold')
    doc.setFontSize(10)
    doc.text(`VESSEL: ${vesselDisplay}`, 15, y)
    y += 8

    // TOTAL alineado a la derecha
    doc.setFont(undefined, 'bold')
    doc.setFontSize(12)
    doc.text('TOTAL:', 120, y)
    doc.setFontSize(16)
    doc.text(`$${totalSelected.toFixed(2)}`, 195, y, { align: 'right' })
    y += 14

    // Términos y condiciones
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

    // Notas si existen
    if (prefacturaData.notes && prefacturaData.notes.trim()) {
      y += 10
      doc.setFontSize(9)
      doc.setFont(undefined, 'bold')
      doc.text('NOTES:', 15, y)
      y += 4
      doc.setFont(undefined, 'normal')
      const notesLines = doc.splitTextToSize(prefacturaData.notes, 180)
      notesLines.forEach((line: string) => {
        doc.text(line, 15, y)
        y += 4
      })
    }

    return doc.output('blob')
  }

  // Generar PDF en tiempo real para la vista previa
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null)
  const [showPdfPreview, setShowPdfPreview] = useState(false)
  const [modalPdfUrl, setModalPdfUrl] = useState<string | null>(null)
  const [isCreatingPrefactura, setIsCreatingPrefactura] = useState(false)

  const handleGenerateRealtimePDF = () => {
    if (selectedRecords.length === 0) return
    
    try {
      const blob = generatePrefacturaPdf()
      if (blob instanceof Blob) {
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

  // Actualizar vista previa cuando cambia el número de prefactura o las notas
  useEffect(() => {
    if (step === 'services') {
      // Pequeño delay para asegurar que el estado se haya actualizado
      const timer = setTimeout(() => {
        handleGenerateRealtimePDF()
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [prefacturaData.prefacturaNumber, prefacturaData.notes, selectedRecords.length, step])

  // Vista previa del PDF
  const handlePreviewPDF = () => {
    try {
      const pdfBlob = generatePrefacturaPdf()
      if (pdfBlob instanceof Blob) {
        const url = URL.createObjectURL(pdfBlob)
        setShowPdfPreview(true)
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
      const clientName = getSelectedClientName() || "cliente"
      const client = getClient(clientName)
      const clientDisplay = client
        ? ((client as any).type === 'natural' ? (client as any).fullName : (client as any).companyName)
        : clientName
      const safeName = (clientDisplay || 'cliente').replace(/[^a-z0-9_-]+/gi, '_')
      
      const url = URL.createObjectURL(pdfBlob)
      const a = document.createElement('a')
      a.href = url
      a.download = `prefactura_shipchandler_${safeName}.pdf`
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
      const first = selectedRecords[0]
      const clientName = getSelectedClientName() || 'Cliente'
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
        id: `SCH-PRE-${Date.now().toString().slice(-6)}`,
        module: 'shipchandler',
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
          vessel: (first?.data?.vessel || '').toString(),
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
        dispatch(fetchRecordsByModule('shipchandler'))
        setSelectedRecordIds([])
        setPrefacturaData({ prefacturaNumber: `SCH-PRE-${Date.now().toString().slice(-5)}`, notes: '' })
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

  // Estados de paginación
  const [currentPage, setCurrentPage] = useState(1)
  const recordsPerPage = 10
  const totalPages = Math.ceil(visibleRecords.length / recordsPerPage)
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * recordsPerPage
    const end = start + recordsPerPage
    return visibleRecords.slice(start, end)
  }, [visibleRecords, currentPage, recordsPerPage])

  // Resetear página cuando cambien los filtros
  useEffect(() => {
    setCurrentPage(1)
  }, [search, statusFilter, clientFilter, vesselFilter, isUsingPeriodFilter, startDate, endDate, dateFilter])

  // Cerrar filtros cuando se hace clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      if (showClientFilter && !target.closest('[data-client-filter]')) {
        setShowClientFilter(false)
      }
      if (showVesselFilter && !target.closest('[data-vessel-filter]')) {
        setShowVesselFilter(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showClientFilter, showVesselFilter])

  const totalDb = visibleRecords.length

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
            <div className="text-sm opacity-90">{selectedRecordIds.length} de {visibleRecords.length} seleccionados</div>
            <Button variant="outline" disabled={selectedRecordIds.length === 0} onClick={clearSelection} className="bg-white/10 hover:bg-white/20 border-white/30 text-white">
              Limpiar Selección
            </Button>
          </div>
        </div>
      )}

      {/* Búsqueda y Filtros - solo Paso 1 */}
      {step === 'select' && (
        <div className="mb-6 mt-4 flex flex-col lg:flex-row gap-4 items-start lg:items-center w-full">
          {/* Filtro de fecha */}
          <div className="w-full lg:w-auto flex-1">
            <Label className="text-sm font-semibold text-slate-700">Filtrar por fecha:</Label>
            <div className="flex flex-col sm:flex-row gap-3 mt-2 lg:mt-1">
              <div className="flex gap-1">
                <Button variant={dateFilter==='createdAt'?'default':'outline'} size="sm" onClick={()=>{setDateFilter('createdAt'); setIsUsingPeriodFilter(false); setActivePeriodFilter('none'); setSelectedRecordIds([])}} className="text-xs h-8 px-3">Creación</Button>
                <Button variant={dateFilter==='date'?'default':'outline'} size="sm" onClick={()=>{setDateFilter('date'); setIsUsingPeriodFilter(false); setActivePeriodFilter('none'); setSelectedRecordIds([])}} className="text-xs h-8 px-3">Fecha</Button>
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="bg-white/60 p-3 rounded-lg">
                  <div className="text-slate-600">Registros</div>
                  <div className="text-2xl font-bold text-slate-900">{selectedRecords.length}</div>
                </div>
                <div className="bg-white/60 p-3 rounded-lg">
                  <div className="text-slate-600">Cliente</div>
                  <div className="text-lg font-semibold text-slate-900">{getSelectedClientName() || 'N/A'}</div>
                </div>
                <div className="bg-white/60 p-3 rounded-lg">
                  <div className="text-slate-600">Vessel</div>
                  <div className="text-lg font-semibold text-slate-900">{(selectedRecords[0]?.data?.vessel || '').toString() || 'N/A'}</div>
                </div>
              </div>
            </div>

            {/* Servicios a cobrar */}
            <div className="bg-white/70 border border-slate-200 rounded-lg p-4">
              <h3 className="font-semibold text-slate-900 mb-4">Servicios a Cobrar</h3>
              <div className="space-y-2">
                {selectedRecords.map((rec: any, idx: number) => {
                  const data = rec?.data || {}
                  const invoiceNo = data.invoiceNo || `Invoice ${idx + 1}`
                  const services: Array<{name: string, amount: number}> = []
                  
                  if (Number(data.deliveryExpenses || 0) > 0) {
                    services.push({ name: 'Delivery Expenses', amount: Number(data.deliveryExpenses || 0) })
                  }
                  if (Number(data.portEntryFee || 0) > 0) {
                    services.push({ name: 'Port Entry Fee', amount: Number(data.portEntryFee || 0) })
                  }
                  if (Number(data.customsFee || 0) > 0) {
                    services.push({ name: 'Customs Fee', amount: Number(data.customsFee || 0) })
                  }
                  if (Number(data.authorities || 0) > 0) {
                    services.push({ name: 'Authorities', amount: Number(data.authorities || 0) })
                  }
                  if (Number(data.otherExpenses || 0) > 0) {
                    services.push({ name: 'Other Expenses', amount: Number(data.otherExpenses || 0) })
                  }
                  if (Number(data.overTime || 0) > 0) {
                    services.push({ name: 'Over Time', amount: Number(data.overTime || 0) })
                  }
                  if (Number(data.total || 0) > 0) {
                    services.push({ name: 'Total', amount: Number(data.total || 0) })
                  }
                  
                  const recordTotal = services.reduce((sum, s) => sum + s.amount, 0)
                  
                  if (services.length === 0) return null
                  
                  return (
                    <div key={rec._id || rec.id} className="border border-slate-300 rounded-lg p-3 bg-white">
                      <div className="font-semibold text-slate-900 mb-2">Invoice: {invoiceNo}</div>
                      <div className="space-y-1">
                        {services.map((service, sIdx) => (
                          <div key={sIdx} className="flex justify-between text-sm">
                            <span className="text-slate-700">{service.name}</span>
                            <span className="font-semibold text-slate-900">${service.amount.toFixed(2)}</span>
                          </div>
                        ))}
                        <Separator className="my-2" />
                        <div className="flex justify-between font-bold text-slate-900">
                          <span>Subtotal</span>
                          <span>${recordTotal.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Columna izquierda: Datos de prefactura */}
              <div className="lg:col-span-1 space-y-4">
                <div className="space-y-3">
                  <Label className="text-sm font-semibold text-slate-700">Número de Prefactura *</Label>
                  <Input
                    value={prefacturaData.prefacturaNumber}
                    onChange={(e) => {
                      setPrefacturaData({...prefacturaData, prefacturaNumber: e.target.value})
                    }}
                    placeholder="SCH-PRE-00001"
                    className="h-12 text-base border-slate-300 focus:border-slate-500 focus:ring-slate-500"
                  />
                </div>
                
                <div className="space-y-3">
                  <Label className="text-sm font-semibold text-slate-700">Notas (Opcional)</Label>
                  <Textarea
                    value={prefacturaData.notes}
                    onChange={(e) => {
                      setPrefacturaData({...prefacturaData, notes: e.target.value})
                    }}
                    placeholder="Notas adicionales..."
                    className="min-h-[100px] border-slate-300 focus:border-slate-500 focus:ring-slate-500"
                  />
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
              <div className="text-sm text-muted-foreground">Mostrando: <span className="font-medium">{visibleRecords.length}</span> de <span className="font-medium">{availableRecords.length}</span> registros</div>
              <div className="ml-auto w-full max-w-md">
                <Input placeholder="Buscar por vessel, cliente, invoice o referencia..." value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
            </div>
            <div className="rounded-md border overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <Checkbox
                        checked={(() => {
                          if (selectedRecordIds.length === 0) return false
                          // Verificar si todos los registros seleccionables están seleccionados
                          const selectableRecords = visibleRecords.filter((r: any) => canSelectRecord(r))
                          return selectableRecords.length > 0 && 
                                 selectableRecords.every((r: any) => selectedRecordIds.includes(r._id || r.id))
                        })()}
                        onCheckedChange={(c: boolean) => {
                          if (c) {
                            // Si hay registros seleccionados, solo seleccionar los del mismo cliente
                            if (selectedRecordIds.length > 0) {
                              const selectableRecords = visibleRecords.filter((r: any) => canSelectRecord(r))
                              setSelectedRecordIds(selectableRecords.map((r: any) => r._id || r.id))
                            } else {
                              // Si no hay selección previa, seleccionar todos los registros del primer cliente visible
                              if (visibleRecords.length > 0) {
                                const firstRecord = visibleRecords[0]
                                const firstClientId = getRecordClientId(firstRecord)
                                if (firstClientId) {
                                  const sameClientRecords = visibleRecords.filter((r: any) => {
                                    const rClientId = getRecordClientId(r)
                                    return rClientId === firstClientId
                                  })
                                  setSelectedRecordIds(sameClientRecords.map((r: any) => r._id || r.id))
                                }
                              }
                            }
                          } else {
                            setSelectedRecordIds([])
                          }
                        }}
                        disabled={visibleRecords.length === 0}
                      />
                    </TableHead>
                    <TableHead>Invoice No</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>
                      <div className="flex items-center justify-between relative" data-vessel-filter>
                        <span>Vessel</span>
                        <div className="flex items-center gap-1">
                          {vesselFilter !== 'all' && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => setVesselFilter('all')}
                              className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                              title="Limpiar filtro"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          )}
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setShowVesselFilter(!showVesselFilter)}
                            className={`h-6 w-6 p-0 ${vesselFilter !== 'all' ? 'text-blue-600' : 'text-gray-500'}`}
                            title="Filtrar por vessel"
                          >
                            <Filter className="h-3 w-3" />
                          </Button>
                        </div>
                        {showVesselFilter && (
                          <div className="absolute top-full right-0 mt-1 z-50 bg-white border border-gray-200 rounded-md shadow-lg p-3 min-w-64">
                            <div className="space-y-2">
                              <div className="text-xs font-medium text-gray-700 mb-2">Filtrar por vessel:</div>
                              <div className="max-h-48 overflow-y-auto space-y-1">
                                <div 
                                  className={`px-2 py-1 text-xs cursor-pointer rounded hover:bg-gray-100 ${vesselFilter === 'all' ? 'bg-blue-100 text-blue-800 font-medium' : ''}`}
                                  onClick={() => {
                                    setVesselFilter('all')
                                    setShowVesselFilter(false)
                                  }}
                                >
                                  Todos los vessels
                                </div>
                                {uniqueVessels.map((vesselName) => (
                                  <div 
                                    key={vesselName}
                                    className={`px-2 py-1 text-xs cursor-pointer rounded hover:bg-gray-100 ${vesselFilter === vesselName ? 'bg-blue-100 text-blue-800 font-medium' : ''}`}
                                    onClick={() => {
                                      setVesselFilter(vesselName)
                                      setShowVesselFilter(false)
                                    }}
                                  >
                                    {vesselName}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </TableHead>
                    <TableHead>
                      <div className="flex items-center justify-between relative" data-client-filter>
                        <span>Cliente</span>
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
                    <TableHead>Total</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleRecords.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center text-muted-foreground py-8">No hay registros que coincidan con los filtros</TableCell>
                    </TableRow>
                  ) : (
                    paginatedRecords.map((rec) => {
                      const clientName = getClientName(rec)
                      const total = calculateServicesTotal(rec)
                      
                      return (
                        <TableRow key={(rec as any)._id || rec.id}>
                          <TableCell>
                            <Checkbox 
                              checked={isSelected((rec as any)._id || rec.id)} 
                              onCheckedChange={(c: boolean) => toggleRecord((rec as any)._id || rec.id, !!c)}
                              disabled={!canSelectRecord(rec)}
                            />
                          </TableCell>
                          <TableCell className="font-mono text-sm">{(rec as any).data?.invoiceNo || ''}</TableCell>
                          <TableCell>{convertExcelDateToReadable((rec as any).data?.date || (rec as any).createdAt) || '-'}</TableCell>
                          <TableCell>{(rec as any).data?.vessel || '-'}</TableCell>
                          <TableCell>{clientName}</TableCell>
                          <TableCell className="font-semibold">${total.toFixed(2)}</TableCell>
                          <TableCell>
                            <Badge variant={((rec as any).status || '').toLowerCase() === 'completado' ? 'default' : 'secondary'}>
                              {((rec as any).status || 'Pendiente').charAt(0).toUpperCase() + ((rec as any).status || 'Pendiente').slice(1)}
                            </Badge>
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
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm">
                Seleccionados: {selectedRecords.length} de {visibleRecords.length} | Total: <span className="font-semibold">${totalSelected.toFixed(2)}</span>
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
              {`Previsualización de Prefactura - ${prefacturaData.prefacturaNumber || 'SCH-PRE'}`}
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
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de vista de registro */}
      <Dialog open={isRecordModalOpen} onOpenChange={setIsRecordModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalles del Registro</DialogTitle>
          </DialogHeader>
          {selectedRecordForView && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-semibold">Invoice No</Label>
                  <p className="text-sm">{(selectedRecordForView as any).data?.invoiceNo || '-'}</p>
                </div>
                <div>
                  <Label className="text-sm font-semibold">Fecha</Label>
                  <p className="text-sm">{convertExcelDateToReadable((selectedRecordForView as any).data?.date || (selectedRecordForView as any).createdAt) || '-'}</p>
                </div>
                <div>
                  <Label className="text-sm font-semibold">Vessel</Label>
                  <p className="text-sm">{(selectedRecordForView as any).data?.vessel || '-'}</p>
                </div>
                <div>
                  <Label className="text-sm font-semibold">Cliente</Label>
                  <p className="text-sm">{getClientName(selectedRecordForView as any)}</p>
                </div>
                <div>
                  <Label className="text-sm font-semibold">Delivery Expenses</Label>
                  <p className="text-sm">${Number((selectedRecordForView as any).data?.deliveryExpenses || 0).toFixed(2)}</p>
                </div>
                <div>
                  <Label className="text-sm font-semibold">Port Entry Fee</Label>
                  <p className="text-sm">${Number((selectedRecordForView as any).data?.portEntryFee || 0).toFixed(2)}</p>
                </div>
                <div>
                  <Label className="text-sm font-semibold">Customs Fee</Label>
                  <p className="text-sm">${Number((selectedRecordForView as any).data?.customsFee || 0).toFixed(2)}</p>
                </div>
                <div>
                  <Label className="text-sm font-semibold">Authorities</Label>
                  <p className="text-sm">${Number((selectedRecordForView as any).data?.authorities || 0).toFixed(2)}</p>
                </div>
                <div>
                  <Label className="text-sm font-semibold">Other Expenses</Label>
                  <p className="text-sm">${Number((selectedRecordForView as any).data?.otherExpenses || 0).toFixed(2)}</p>
                </div>
                <div>
                  <Label className="text-sm font-semibold">Over Time</Label>
                  <p className="text-sm">${Number((selectedRecordForView as any).data?.overTime || 0).toFixed(2)}</p>
                </div>
                <div>
                  <Label className="text-sm font-semibold">Total</Label>
                  <p className="text-sm">${Number((selectedRecordForView as any).data?.total || 0).toFixed(2)}</p>
                </div>
                <div className="col-span-2">
                  <Label className="text-sm font-semibold">Total de Servicios</Label>
                  <p className="text-lg font-bold">${calculateServicesTotal(selectedRecordForView as any).toFixed(2)}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de filtro de fecha avanzado */}
      <Dialog open={isDateModalOpen} onOpenChange={setIsDateModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Filtro de Fecha Avanzado</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Fecha Inicio</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <Label>Fecha Fin</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleCancelDateFilter}>
                Cancelar
              </Button>
              <Button onClick={() => handleApplyDateFilter(startDate, endDate)} disabled={!startDate || !endDate}>
                Aplicar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

