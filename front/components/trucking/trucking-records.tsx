"use client"

import { useEffect, useMemo, useState } from "react"
import { useAppDispatch, useAppSelector } from "@/lib/hooks"
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Truck, Search, Download, Eye, Edit, Calendar, DollarSign, User, Loader2, Trash2, Database, Code, X } from "lucide-react"
import saveAs from "file-saver"

import {
  selectInvoicesByModule,
  fetchInvoicesAsync,
  selectAllIndividualRecords,
  fetchAllRecordsByModule,
  selectRecordsLoading,
  selectRecordsError,
  deleteInvoiceAsync,
  updateInvoiceAsync,
  updateMultipleRecordsStatusAsync,
  updateMultipleAutoridadesStatusAsync,
  fetchAutoridadesRecords,
  selectAutoridadesRecords,
} from "@/lib/features/records/recordsSlice"
import { generateInvoiceXML } from "@/lib/xml-generator"
import { selectAllServices, fetchServices } from "@/lib/features/services/servicesSlice"
import { selectAllClients } from "@/lib/features/clients/clientsSlice"
import { TruckingRecordsViewModal } from "./trucking-records-view-modal"
import { TruckingPdfViewer } from "./trucking-pdf-viewer"
import { TruckingXmlViewerModal } from "./trucking-xml-viewer-modal"
import { TruckingPrefacturaEditModal } from "./trucking-prefactura-edit-modal"
import { TruckingFacturacionModal } from "./trucking-facturacion-modal"

export function TruckingRecords() {
  const dispatch = useAppDispatch()
  const { toast } = useToast()

  // Filtros y búsqueda
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "prefactura" | "facturada">("all")
  const [typeFilter, setTypeFilter] = useState<"all" | "normal" | "auth">("all")
  const [activePeriodFilter, setActivePeriodFilter] = useState<"none" | "today" | "week" | "month" | "advanced">("none")
  const [isUsingPeriodFilter, setIsUsingPeriodFilter] = useState(false)
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")

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

  // Datos
  const invoices = useAppSelector((state) => selectInvoicesByModule(state, "trucking"))
  const allRecords = useAppSelector(selectAllIndividualRecords)
  const autoridadesRecords = useAppSelector(selectAutoridadesRecords)
  const clients = useAppSelector(selectAllClients)
  const services = useAppSelector(selectAllServices)
  const loading = useAppSelector(selectRecordsLoading)
  const error = useAppSelector(selectRecordsError)

  useEffect(() => {
    dispatch(fetchInvoicesAsync("trucking"))
    dispatch(fetchAllRecordsByModule("trucking"))
    // Cargar registros de autoridades para mostrar clientes correctos en facturas AUTH
    dispatch(fetchAutoridadesRecords())
    // Cargar servicios para los impuestos PTG
    dispatch(fetchServices("trucking"))
  }, [dispatch])

  // Debug: verificar que los registros tengan el campo fe
  useEffect(() => {
    if (allRecords.length > 0) {
      console.log("=== DEBUG: Registros cargados ===")
      console.log("Total de registros:", allRecords.length)
      const recordsWithFe = allRecords.filter((r: any) => r.data?.fe)
      console.log("Registros con campo fe:", recordsWithFe.length)
      if (recordsWithFe.length > 0) {
        console.log("Ejemplo de registro con fe:", recordsWithFe[0])
        console.log("Valor del campo fe:", recordsWithFe[0].data.fe)
        console.log("Tipo del campo fe:", typeof recordsWithFe[0].data.fe)
        console.log("FE toString():", recordsWithFe[0].data.fe.toString())
        console.log("FE toUpperCase():", recordsWithFe[0].data.fe.toString().toUpperCase())
        console.log("FE trim():", recordsWithFe[0].data.fe.toString().toUpperCase().trim())
      }
      const recordsWithoutFe = allRecords.filter((r: any) => !r.data?.fe)
      console.log("Registros sin campo fe:", recordsWithoutFe.length)
      if (recordsWithoutFe.length > 0) {
        console.log("Ejemplo de registro sin fe:", recordsWithoutFe[0])
      }
    }
  }, [allRecords])

  const getContainersForInvoice = (invoice: any) => {
    if (!invoice.relatedRecordIds || invoice.relatedRecordIds.length === 0) return "N/A"
    
    const isAuth = (invoice.invoiceNumber || '').toString().toUpperCase().startsWith('AUTH-')
    
    // Para facturas de gastos de autoridades, buscar en registros de autoridades
    if (isAuth) {
      if (autoridadesRecords.length === 0) return "N/A"
      const related = autoridadesRecords.filter((r: any) => (r._id || r.id) && invoice.relatedRecordIds.includes(r._id || r.id))
      const containers = related.map((r: any) => r.container || "N/A").filter((c: string) => c !== "N/A")
      if (containers.length === 0) return "N/A"
      return `${containers.length} contenedor${containers.length === 1 ? '' : 'es'}`
    }
    
    // Para facturas normales, buscar en registros normales
    if (allRecords.length === 0) return "N/A"
    const related = allRecords.filter((r: any) => (r._id || r.id) && invoice.relatedRecordIds.includes(r._id || r.id))
    const containers = related.map((r: any) => r.data?.container || r.data?.contenedor || "N/A").filter((c: string) => c !== "N/A")
    if (containers.length === 0) return "N/A"
    return `${containers.length} contenedor${containers.length === 1 ? '' : 'es'}`
  }

  // Función para formatear fechas correctamente (evitar problema de zona horaria)
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

  // Función para obtener el cliente real de las facturas de gastos de autoridades
  const getClientForInvoice = (invoice: any) => {
    const isAuth = (invoice.invoiceNumber || '').toString().toUpperCase().startsWith('AUTH-')
    
    if (!isAuth) {
      // Para facturas normales, usar el clientName directamente
      return invoice.clientName || 'N/A'
    }
    
    // Para facturas de gastos de autoridades, obtener el cliente real de los registros
    if (!invoice.relatedRecordIds || invoice.relatedRecordIds.length === 0) {
      return invoice.clientName || 'N/A'
    }
    
    // Buscar en registros de autoridades
    const relatedRecord = autoridadesRecords.find((r: any) => 
      (r._id || r.id) && invoice.relatedRecordIds.includes(r._id || r.id)
    )
    
    if (!relatedRecord) {
      return invoice.clientName || 'N/A'
    }
    
    // Intentar obtener cliente por clientId primero
    if (relatedRecord.clientId) {
      const client = clients.find((c: any) => (c._id || c.id) === relatedRecord.clientId)
      if (client) {
        return client.type === 'natural' ? client.fullName : client.companyName
      }
    }
    
    // Si no se encontró por ID, usar el campo customer del registro
    return relatedRecord.customer || invoice.clientName || 'N/A'
  }

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
  }

  const handleCancelDateFilter = () => {
    setIsDateModalOpen(false)
    setIsUsingPeriodFilter(false)
    setActivePeriodFilter("none")
    setStartDate("")
    setEndDate("")
  }

  const filteredInvoices = useMemo(() => {
    const q = search.toLowerCase()
    return invoices.filter((inv: any) => {
      const containers = getContainersForInvoice(inv)
      const matchesSearch = (inv.invoiceNumber || '').toLowerCase().includes(q) || (inv.clientName || '').toLowerCase().includes(q) || containers.toLowerCase().includes(q)
      const matchesStatus = statusFilter === 'all' || inv.status === statusFilter
      
      // Filtro por tipo (Normal vs AUTH)
      let matchesType = true
      if (typeFilter !== 'all') {
        const isAuth = (inv.invoiceNumber || '').toString().toUpperCase().startsWith('AUTH-')
        matchesType = typeFilter === 'auth' ? isAuth : !isAuth
      }
      
      let matchesDate = true
      if (isUsingPeriodFilter && startDate && endDate) {
        const d = new Date(inv.issueDate || inv.createdAt)
        const s = new Date(startDate)
        const e = new Date(endDate); e.setHours(23,59,59,999)
        matchesDate = d >= s && d <= e
      }
      return matchesSearch && matchesStatus && matchesType && matchesDate
    })
  }, [invoices, allRecords, search, statusFilter, typeFilter, isUsingPeriodFilter, startDate, endDate])

  // Acciones
  const handleDeleteInvoice = async (invoice: any) => {
    try {
      await dispatch(deleteInvoiceAsync(invoice.id)).unwrap()
      toast({ title: "Factura eliminada", description: `Se eliminó ${invoice.invoiceNumber}` })
      
      // Recargar facturas
      dispatch(fetchInvoicesAsync("trucking"))
      
      // Si es una prefactura auth (gastos de autoridades), recargar registros de autoridades
      if (invoice.invoiceNumber && invoice.invoiceNumber.startsWith('AUTH-')) {
        dispatch(fetchAutoridadesRecords())
      } else {
        // Para facturas normales, recargar registros normales
        dispatch(fetchAllRecordsByModule("trucking"))
      }
    } catch (e: any) {
      toast({ title: "Error", description: e.message || 'No se pudo eliminar', variant: 'destructive' })
    }
  }

  const handleViewRecords = (invoice: any) => { setViewRecordsInvoice(invoice); setRecordsModalOpen(true) }

  const buildXmlPayload = (invoice: any) => {
    console.log("=== DEBUG: buildXmlPayload ===")
    console.log("Invoice:", invoice)
    console.log("All records:", allRecords)
    console.log("Services:", services)
    console.log("Services length:", services.length)
    
    const recordsForXml = invoice.relatedRecordIds.map((recordId: string) => {
      const r = allRecords.find((x: any) => (x._id || x.id) === recordId)
      console.log(`Record ${recordId}:`, r)
      
      if (!r) return null
      const d = r.data || {}
      console.log(`Record data:`, d)
      console.log(`Campo fe:`, d.fe)
      
      const unitPrice = Number(d.matchedPrice || r.totalValue || 0)
      const desc = d.description || `Container ${d.container || d.contenedor || ''} ${d.size || d.containerSize || ''} ${d.type || d.containerType || ''} ${d.leg || `${d.from || ''} / ${d.to || ''}`}`
      
      // Determinar el estado Full/Empty basado en el campo fe
      let fullEmptyStatus = ''
      let feValue = ''
      if (d.fe) {
        feValue = d.fe.toString().toUpperCase().trim()
        console.log(`FE value: "${feValue}"`)
        if (feValue === 'F') {
          fullEmptyStatus = 'FULL'
        } else if (feValue === 'E') {
          fullEmptyStatus = 'EMPTY'
        }
        console.log(`FullEmpty status: "${fullEmptyStatus}"`)
      } else {
        console.log(`No hay campo fe, usando valor por defecto`)
        fullEmptyStatus = 'FULL' // Valor por defecto
      }
      
      // Determinar CtrCategory basado en el tipo de contenedor detectado
      let ctrCategory = 'D' // Valor por defecto para DRY
      if (d.detectedContainerType) {
        if (d.detectedContainerType === 'reefer') {
          ctrCategory = 'R'
        } else if (d.detectedContainerType === 'dry') {
          ctrCategory = 'D'
        }
        console.log(`Detected container type: "${d.detectedContainerType}" -> CtrCategory: "${ctrCategory}"`)
      } else {
        console.log(`No hay detectedContainerType, usando valor por defecto CtrCategory: "${ctrCategory}"`)
      }
      
      console.log(`Campo fe original: "${d.fe}"`)
      console.log(`Campo fe procesado: "${feValue}"`)
      console.log(`FullEmpty status final: "${fullEmptyStatus}"`)
      
      const recordForXml = {
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
        fullEmptyStatus: fullEmptyStatus,
        // Campos adicionales requeridos por el XML
        businessType: d.moveType || 'IMPORT',
        internalOrder: d.internalOrder || '',
        ctrCategory: ctrCategory,
        subcontracting: d.subcontracting || 'N'
      }
      
      console.log(`Record for XML:`, recordForXml)
      return recordForXml
    }).filter(Boolean)

    // Corregir el problema con la fecha
    let invoiceDate = new Date().toISOString() // Fecha por defecto
    
    if (invoice.issueDate) {
      const parsedDate = new Date(invoice.issueDate)
      if (!isNaN(parsedDate.getTime())) {
        invoiceDate = parsedDate.toISOString()
      }
    } else if (invoice.createdAt) {
      const parsedDate = new Date(invoice.createdAt)
      if (!isNaN(parsedDate.getTime())) {
        invoiceDate = parsedDate.toISOString()
      }
    }
    
    console.log("Fecha procesada:", invoiceDate)
    console.log("Fecha original issueDate:", invoice.issueDate)
    console.log("Fecha original createdAt:", invoice.createdAt)

    // Agregar impuestos PTG y servicios adicionales como otheritems
    const otherItems: any[] = []
    
    // Calcular contenedores llenos para los impuestos
    const fullContainers = recordsForXml.filter((record: any) => {
      const r = allRecords.find((x: any) => (x._id || x.id) === record.id)
      if (!r) return false
      const d = r.data || {}
      const fe = d.fe || ''
      return fe.toString().toUpperCase().trim() === 'F'
    })
    const totalFullContainers = fullContainers.length
    
    console.log("=== DEBUG: Impuestos PTG ===")
    console.log("Total full containers:", totalFullContainers)
    console.log("Full containers:", fullContainers)
    console.log("All services loaded:", services)
    console.log("Trucking services:", services.filter(s => s.module === 'trucking'))
    console.log("Active trucking services:", services.filter(s => s.module === 'trucking' && s.isActive))
    console.log("All services details:", services.map(s => ({ name: s.name, module: s.module, isActive: s.isActive, price: s.price })))
    
    if (totalFullContainers > 0) {
      // Buscar los impuestos PTG en los servicios
      // Buscar Aduana con diferentes variaciones del nombre
      const customsTax = services.find(s => 
        s.module === 'trucking' && 
        s.isActive && 
        (s.name === 'Aduana' || 
         s.name === 'Customs' || 
         s.name.toLowerCase().includes('aduana') ||
         s.name.toLowerCase().includes('customs'))
      )
      const adminFeeTax = services.find(s => s.module === 'trucking' && s.name === 'Administration Fee' && s.isActive)
      
      console.log("Aduana tax found:", customsTax)
      console.log("Admin fee tax found:", adminFeeTax)
      
      // Agregar Aduana como otheritem
      if (customsTax && customsTax.price > 0) {
        console.log("Adding Aduana tax to otherItems")
        const customsTotal = customsTax.price * totalFullContainers
        const customsItem = {
          serviceCode: 'TRK135',
          description: 'Aduana',
          quantity: totalFullContainers,
          unitPrice: customsTax.price,
          totalPrice: customsTotal,
          unit: 'VIAJE',
          // Campos adicionales requeridos
          IncomeRebateCode: 'I',
          AmntTransacCur: -customsTotal,
          ProfitCenter: 'PTG',
          Activity: 'TRUCKING',
          Pillar: 'LOGISTICS',
          BUCountry: 'PA',
          ServiceCountry: 'PA',
          ClientType: 'EXTERNAL',
          // Solo para Aduana
          FullEmpty: 'FULL'
        }
        console.log("Aduana item to add:", customsItem)
        otherItems.push(customsItem)
      } else {
        console.log("Aduana service not found in services array")
        console.log("Available trucking services:", services.filter(s => s.module === 'trucking').map(s => ({ name: s.name, isActive: s.isActive, price: s.price })))
      }
      
      // Agregar Administration Fee como otheritem
      if (adminFeeTax && adminFeeTax.price > 0) {
        console.log("Adding Administration Fee tax to otherItems")
        const adminFeeTotal = adminFeeTax.price * totalFullContainers
        const adminFeeItem = {
          serviceCode: 'TRK130',
          description: 'Administration Fee',
          quantity: totalFullContainers,
          unitPrice: adminFeeTax.price,
          totalPrice: adminFeeTotal,
          unit: 'VIAJE',
          // Campos adicionales requeridos
          IncomeRebateCode: 'I',
          AmntTransacCur: -adminFeeTotal,
          ProfitCenter: 'PTG',
          Activity: 'TRUCKING',
          Pillar: 'LOGISTICS',
          BUCountry: 'PA',
          ServiceCountry: 'PA',
          ClientType: 'EXTERNAL'
        }
        console.log("Admin fee item to add:", adminFeeItem)
        otherItems.push(adminFeeItem)
      }
    }

    // Agregar servicios adicionales como otheritems
    if (invoice.details?.additionalServices && Array.isArray(invoice.details.additionalServices)) {
      console.log("=== DEBUG: Servicios adicionales ===")
      console.log("Additional services found:", invoice.details.additionalServices)
      
      invoice.details.additionalServices.forEach((additionalService: any) => {
        console.log("Processing additional service:", additionalService)
        
        // Buscar el servicio en la base de datos para obtener el serviceCode real
        const serviceFromDb = services.find((s: any) => s._id === additionalService.id)
        const serviceCode = serviceFromDb?.name || 'TRK999' // Usar el name como serviceCode (ej: "TRK006")
        const serviceDescription = serviceFromDb?.description || additionalService.description || additionalService.name || 'Servicio Adicional'
        
        console.log("Service from DB:", serviceFromDb)
        console.log("Using serviceCode:", serviceCode)
        
        const additionalServiceItem = {
          serviceCode: serviceCode, // Usar el serviceCode real de la DB
          description: serviceDescription,
          quantity: 1,
          unitPrice: additionalService.amount || 0,
          totalPrice: additionalService.amount || 0,
          unit: 'VIAJE',
          // Campos adicionales requeridos
          IncomeRebateCode: 'I',
          AmntTransacCur: (-(additionalService.amount || 0)).toFixed(3),
          ProfitCenter: 'PTG',
          Activity: 'TRUCKING',
          Pillar: 'LOGISTICS',
          BUCountry: 'PA',
          ServiceCountry: 'PA',
          ClientType: 'EXTERNAL',
          // Solo para servicios adicionales
          FullEmpty: 'FULL'
        }
        
        console.log("Additional service item to add:", additionalServiceItem)
        otherItems.push(additionalServiceItem)
      })
    }

    const payload = {
          id: invoice.id || invoice._id || '', // Campo requerido por generateInvoiceXML
          module: "trucking" as const, // Debe ser exactamente "trucking"
          invoiceNumber: invoice.invoiceNumber || '', // Campo requerido por generateInvoiceXML
          client: invoice.clientRuc || invoice.client || '', // Campo requerido por generateInvoiceXML
          clientName: invoice.clientName,
          clientSapNumber: invoice.clientSapNumber || '', // Campo requerido por generateInvoiceXML
          date: invoiceDate, // Usar la fecha procesada
          dueDate: invoice.dueDate,
          currency: invoice.currency || 'USD', // Valor por defecto
          total: invoice.totalAmount || 0, // Valor por defecto
          records: recordsForXml,
          otherItems: otherItems, // Agregar los impuestos PTG
          status: 'finalized' as const, // Status requerido por InvoiceForXmlPayload
    }
    
    console.log("=== DEBUG: Final XML payload ===")
    console.log("Final XML payload:", payload)
    console.log("OtherItems in payload:", payload.otherItems)
    console.log("OtherItems length:", payload.otherItems?.length || 0)
    return payload
  }

  const handleGenerateXml = (invoice: any) => { setXmlInvoice(invoice); setXmlModalOpen(true) }

  const handleDownloadXml = () => {
    if (!xmlInvoice?.xmlData?.xml) return
    const blob = new Blob([xmlInvoice.xmlData.xml], { type: 'application/xml;charset=utf-8' })
    saveAs(blob, `factura_trucking.xml`)
  }

  const handleFacturar = async (invoice: any) => {
    try {
      console.log("=== DEBUG: Generando XML ===")
      console.log("Invoice completa:", invoice)
      
      const xmlPayload = buildXmlPayload(invoice)
      console.log("XML Payload generado:", xmlPayload)
      
      // Generar XML y actualizar factura a 'facturada'
      const xml = generateInvoiceXML(xmlPayload as any)
      console.log("XML generado exitosamente")
      
      await dispatch(updateInvoiceAsync({ id: invoice.id, updates: { status: 'facturada', xmlData: xml } })).unwrap()
      // Marcar registros como facturados en backend
      await dispatch(updateMultipleRecordsStatusAsync({ recordIds: invoice.relatedRecordIds, status: 'facturado', invoiceId: invoice.id })).unwrap()
      toast({ title: 'Facturada', description: `La factura ${invoice.invoiceNumber} fue marcada como facturada` })
      dispatch(fetchInvoicesAsync('trucking'))
      dispatch(fetchAllRecordsByModule('trucking'))
    } catch (e: any) {
      console.error("=== ERROR en handleFacturar ===")
      console.error("Error completo:", e)
      console.error("Mensaje de error:", e.message)
      console.error("Stack trace:", e.stack)
      toast({ title: 'Error', description: e.message || 'No se pudo facturar', variant: 'destructive' })
    }
  }

  const handleEdit = (invoice: any) => { setEditInvoice(invoice); setEditModalOpen(true) }

  return (
    <div className="space-y-6 ">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-blue-600 flex items-center justify-center">
          <Truck className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Facturas - PTG</h1>
          <p className="text-muted-foreground">Prefacturas y Facturas de Trasiego</p>
        </div>
      </div>

        <Card>
         
        <CardContent className="space-y-4 mt-6">
          <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Buscar por número, cliente o contenedor" className="pl-9" />
            </div>
            <Select value={statusFilter} onValueChange={(v)=>setStatusFilter(v as any)}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Estado" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="prefactura">Prefactura</SelectItem>
                <SelectItem value="facturada">Facturada</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={(v)=>setTypeFilter(v as any)}>
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
              <Button variant="ghost" size="sm" onClick={()=>setTypeFilter('all')} className="h-6 w-6 p-0 ml-auto"><X className="h-3 w-3" /></Button>
            </div>
          )}

          {isUsingPeriodFilter && activePeriodFilter === 'advanced' && startDate && endDate && (
            <div className="flex items-center gap-2 p-2 bg-purple-50 border border-purple-200 rounded-md">
              <Badge variant="default" className="bg-purple-600 text-white text-xs">Filtro Avanzado</Badge>
              <span className="text-sm text-purple-700">{startDate} - {endDate}</span>
              <Button variant="ghost" size="sm" onClick={()=>{ setIsUsingPeriodFilter(false); setActivePeriodFilter("none"); setStartDate(""); setEndDate("") }} className="h-6 w-6 p-0 ml-auto"><X className="h-3 w-3" /></Button>
            </div>
          )}

          <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                  <TableHead>Número</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Contenedor</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Total</TableHead>
                      <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={8} className="py-8 text-center"><div className="flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Cargando…</div></TableCell></TableRow>
                ) : error ? (
                  <TableRow><TableCell colSpan={8} className="py-8 text-center text-red-600">{error}</TableCell></TableRow>
                ) : filteredInvoices.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="py-8 text-center text-muted-foreground">No hay prefacturas</TableCell></TableRow>
                ) : (
                  filteredInvoices.map((inv: any) => {
                    const isAuth = (inv.invoiceNumber || '').toString().toUpperCase().startsWith('AUTH-')
                    return (
                    <TableRow key={inv.id}>
                      <TableCell className="font-mono text-sm">{inv.invoiceNumber}</TableCell>
                      <TableCell>
                        <Badge variant={isAuth ? "default" : "secondary"} className={isAuth ? "bg-orange-600 text-white" : ""}>
                          {isAuth ? "Gastos Auth" : "Trasiego"}
                        </Badge>
                      </TableCell>
                      <TableCell><div className="flex items-center gap-2"><User className="h-4 w-4 text-muted-foreground" />{getClientForInvoice(inv)}</div></TableCell>
                      <TableCell><div className="flex items-center gap-2"><Truck className="h-4 w-4 text-muted-foreground" />{getContainersForInvoice(inv)}</div></TableCell>
                      <TableCell><div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-muted-foreground" />{formatDate(inv.issueDate)}</div></TableCell>
                      <TableCell className="font-bold"><div className="flex items-center gap-2"><DollarSign className="h-4 w-4 text-muted-foreground" />${(inv.totalAmount || 0).toFixed(2)}</div></TableCell>
                      <TableCell>{inv.status === 'prefactura' ? <Badge variant="outline" className="text-blue-600 border-blue-600">Prefactura</Badge> : <Badge variant="outline" className="text-green-600 border-green-600">Facturada</Badge>}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" title="Ver registros" onClick={()=>handleViewRecords(inv)} className="h-8 w-8 text-purple-600 hover:bg-purple-50"><Database className="h-4 w-4"/></Button>
                          <Button variant="ghost" size="sm" title="Ver PDF" onClick={()=>{ setPdfInvoice(inv); setPdfModalOpen(true) }} className="h-8 w-8 text-blue-600 hover:bg-blue-50"><Eye className="h-4 w-4"/></Button>
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
                              <Button variant="outline" size="sm" title="Facturar" onClick={()=>{ setFacturarInvoice(inv); setFacturarModalOpen(true) }} className="h-8 px-2 text-green-700 border-green-600 hover:bg-green-50">Facturar</Button>
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

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Mostrando {filteredInvoices.length} de {invoices.length}</span>
            <span>Total: ${filteredInvoices.reduce((s:number, i:any)=> s + (i.totalAmount || 0), 0).toFixed(2)}</span>
          </div>
          </CardContent>
        </Card>

      <TruckingXmlViewerModal 
        open={xmlModalOpen} 
        onOpenChange={setXmlModalOpen} 
        invoice={xmlInvoice}
        onXmlSentToSap={() => {
          dispatch(fetchInvoicesAsync('trucking'))
        }}
      />
      <TruckingRecordsViewModal open={recordsModalOpen} onOpenChange={setRecordsModalOpen} invoice={viewRecordsInvoice} />
      <TruckingPdfViewer open={pdfModalOpen} onOpenChange={setPdfModalOpen} invoice={pdfInvoice} />
      <TruckingPrefacturaEditModal open={editModalOpen} onOpenChange={setEditModalOpen} invoice={editInvoice} onClose={()=>setEditModalOpen(false)} onEditSuccess={()=>dispatch(fetchInvoicesAsync('trucking'))} />
      <TruckingFacturacionModal open={facturarModalOpen} onOpenChange={setFacturarModalOpen} invoice={facturarInvoice} onFacturar={async (invoiceNumber, xmlData, invoiceDate)=>{
        try {
          console.log("=== DEBUG: onFacturar callback ===")
          console.log("Invoice:", facturarInvoice)
          console.log("InvoiceNumber:", invoiceNumber)
          console.log("XmlData:", xmlData)
          console.log("InvoiceDate:", invoiceDate)
          
          // Actualizar la factura con el nuevo número y XML
          // Convertir la fecha a objeto Date en zona horaria local para evitar problemas de UTC
          const dateObj = new Date(invoiceDate + 'T00:00:00')
          
          await dispatch(updateInvoiceAsync({ 
            id: facturarInvoice.id, 
            updates: { 
              status: 'facturada', 
              invoiceNumber, 
              xmlData: xmlData ? xmlData.xml : undefined,
              issueDate: dateObj.toISOString()
            } 
          })).unwrap()
          
          // Marcar registros como facturados (usar función correcta según tipo de factura)
          const isAuthInvoice = facturarInvoice.invoiceNumber?.toString().toUpperCase().startsWith('AUTH-')
          
          if (isAuthInvoice) {
            console.log("Actualizando registros de autoridades...")
            await dispatch(updateMultipleAutoridadesStatusAsync({ 
              recordIds: facturarInvoice.relatedRecordIds, 
              status: 'facturado', 
              invoiceId: facturarInvoice.id 
            })).unwrap()
          } else {
            console.log("Actualizando registros de trasiego...")
            await dispatch(updateMultipleRecordsStatusAsync({ 
              recordIds: facturarInvoice.relatedRecordIds, 
              status: 'facturado', 
              invoiceId: facturarInvoice.id 
            })).unwrap()
          }
          
          setFacturarModalOpen(false)
          dispatch(fetchInvoicesAsync('trucking'))
          
          // Refrescar los registros correctos según el tipo de factura
          if (isAuthInvoice) {
            dispatch(fetchAutoridadesRecords())
          } else {
            dispatch(fetchAllRecordsByModule('trucking'))
          }
          
          toast({ 
            title: 'Facturación completada', 
            description: `La prefactura ha sido facturada como ${invoiceNumber}` 
          })
        } catch (e:any) {
          console.error("Error en onFacturar:", e)
          toast({ 
            title: 'Error', 
            description: e.message || 'No se pudo facturar', 
            variant: 'destructive' 
          })
        }
      }} />

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

      {/* El modal de edición se maneja con TruckingPrefacturaEditModal */}
    </div>
  )
}