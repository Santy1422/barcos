"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Ship, Search, Filter, Download, Eye, FileText, Calendar, DollarSign, User, Loader2, Trash2, Code, X, Edit } from "lucide-react"
import { useAppSelector, useAppDispatch } from "@/lib/hooks"
import { useToast } from "@/hooks/use-toast"
import { selectInvoicesByModule, fetchInvoicesAsync, deleteInvoiceAsync, selectRecordsLoading, selectRecordsError, updateInvoiceAsync, selectAllIndividualRecords, fetchAllRecordsByModule, updateMultipleRecordsStatusAsync } from "@/lib/features/records/recordsSlice"
import { ShipChandlerFacturacionModal } from "./shipchandler-facturacion-modal"
import { ShipChandlerXmlViewerModal } from "./shipchandler-xml-viewer-modal"
import { ShipChandlerPdfViewer } from "./shipchandler-pdf-viewer"
import { fetchClients } from "@/lib/features/clients/clientsSlice"
import saveAs from "file-saver"
import { generateXmlFileName } from "@/lib/xml-generator"
import * as XLSX from "xlsx"

export function ShipChandlerRecords() {
  const dispatch = useAppDispatch()
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [invoiceToDelete, setInvoiceToDelete] = useState<any>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [pdfInvoice, setPdfInvoice] = useState<any>(null)
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false)
  const [facturarInvoice, setFacturarInvoice] = useState<any>(null)
  const [isFacturarModalOpen, setIsFacturarModalOpen] = useState(false)
  const [xmlInvoice, setXmlInvoice] = useState<any>(null)
  const [isXmlModalOpen, setIsXmlModalOpen] = useState(false)

  // Estados para filtros
  const [clientFilter, setClientFilter] = useState<string>('all')
  const [vesselFilter, setVesselFilter] = useState<string>('')
  const [activePeriodFilter, setActivePeriodFilter] = useState<"none" | "today" | "week" | "month" | "advanced">("none")
  const [isUsingPeriodFilter, setIsUsingPeriodFilter] = useState(false)
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [isDateModalOpen, setIsDateModalOpen] = useState(false)

  // Obtener prefacturas ShipChandler del store
  const shipchandlerInvoices = useAppSelector((state) => selectInvoicesByModule(state, "shipchandler"))
  const isLoading = useAppSelector(selectRecordsLoading)
  const error = useAppSelector(selectRecordsError)
  const allRecords = useAppSelector(selectAllIndividualRecords)
  const clients = useAppSelector((state) => state.clients.clients)

  // Función para obtener los vessels de una factura
  const getVesselsForInvoice = (invoice: any) => {
    if (!invoice.relatedRecordIds || invoice.relatedRecordIds.length === 0) {
      return "N/A"
    }
    
    if (allRecords.length === 0) {
      return "N/A"
    }
    
    const relatedRecords = allRecords.filter((record: any) => {
      const recordId = record._id || record.id
      return invoice.relatedRecordIds.includes(recordId)
    })
    
    if (relatedRecords.length === 0) {
      return "N/A"
    }
    
    const vessels = relatedRecords.map((record: any) => {
      const data = record.data as Record<string, any>
      return data?.vessel || "N/A"
    }).filter((vessel: string) => vessel !== "N/A")
    
    if (vessels.length === 0) return "N/A"
    const uniqueVessels = [...new Set(vessels)]
    if (uniqueVessels.length === 1) return uniqueVessels[0]
    return `${uniqueVessels[0]} y ${uniqueVessels.length - 1} más`
  }

  // Función para obtener el invoice date (date del registro) de una factura
  const getInvoiceDateForInvoice = (invoice: any): string => {
    if (!invoice.relatedRecordIds || invoice.relatedRecordIds.length === 0) {
      return "N/A"
    }
    
    if (allRecords.length === 0) {
      return "N/A"
    }
    
    const relatedRecords = allRecords.filter((record: any) => {
      const recordId = record._id || record.id
      return invoice.relatedRecordIds.includes(recordId)
    })
    
    if (relatedRecords.length === 0) {
      return "N/A"
    }
    
    // Tomar el date del primer registro
    const firstRecord = relatedRecords[0]
    const data = firstRecord.data as Record<string, any>
    const recordDate = data?.date
    
    if (!recordDate) {
      return "N/A"
    }
    
    // Convertir la fecha a formato legible
    return formatRecordDate(recordDate)
  }

  // Función para formatear la fecha del registro
  const formatRecordDate = (dateValue: any): string => {
    if (!dateValue) return 'N/A'
    
    // Si es string en formato DD-MM-YYYY, convertir a formato legible
    if (typeof dateValue === 'string' && dateValue.match(/^\d{2}-\d{2}-\d{4}$/)) {
      const parts = dateValue.split('-')
      if (parts.length === 3) {
        const [day, month, year] = parts
        return `${day}/${month}/${year}`
      }
    }
    
    // Si es string en formato YYYY-MM-DD, convertir
    if (typeof dateValue === 'string' && dateValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const parts = dateValue.split('-')
      if (parts.length === 3) {
        const [year, month, day] = parts
        return `${day}/${month}/${year}`
      }
    }
    
    // Si es número (serie de Excel), convertir
    if (typeof dateValue === 'number') {
      const excelEpoch = new Date(1900, 0, 1)
      const millisecondsPerDay = 24 * 60 * 60 * 1000
      const adjustedSerialNumber = dateValue > 59 ? dateValue - 1 : dateValue
      const date = new Date(excelEpoch.getTime() + (adjustedSerialNumber - 1) * millisecondsPerDay)
      
      if (!isNaN(date.getTime())) {
        const day = date.getDate().toString().padStart(2, '0')
        const month = (date.getMonth() + 1).toString().padStart(2, '0')
        const year = date.getFullYear()
        return `${day}/${month}/${year}`
      }
    }
    
    // Intentar parsear como fecha
    const date = new Date(dateValue)
    if (!isNaN(date.getTime())) {
      const day = date.getDate().toString().padStart(2, '0')
      const month = (date.getMonth() + 1).toString().padStart(2, '0')
      const year = date.getFullYear()
      return `${day}/${month}/${year}`
    }
    
    return String(dateValue)
  }

  // Función para convertir fecha del registro a Date para filtros
  const parseRecordDateToDate = (dateValue: any): Date | null => {
    if (!dateValue) return null
    
    // Si es string en formato DD-MM-YYYY
    if (typeof dateValue === 'string' && dateValue.match(/^\d{2}-\d{2}-\d{4}$/)) {
      const parts = dateValue.split('-')
      if (parts.length === 3) {
        const [day, month, year] = parts
        return new Date(Number(year), Number(month) - 1, Number(day))
      }
    }
    
    // Si es string en formato YYYY-MM-DD
    if (typeof dateValue === 'string' && dateValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const parts = dateValue.split('-')
      if (parts.length === 3) {
        const [year, month, day] = parts
        return new Date(Number(year), Number(month) - 1, Number(day))
      }
    }
    
    // Si es número (serie de Excel)
    if (typeof dateValue === 'number') {
      const excelEpoch = new Date(1900, 0, 1)
      const millisecondsPerDay = 24 * 60 * 60 * 1000
      const adjustedSerialNumber = dateValue > 59 ? dateValue - 1 : dateValue
      return new Date(excelEpoch.getTime() + (adjustedSerialNumber - 1) * millisecondsPerDay)
    }
    
    // Intentar parsear como fecha
    const date = new Date(dateValue)
    if (!isNaN(date.getTime())) {
      return date
    }
    
    return null
  }

  // Cargar facturas del backend al montar el componente
  useEffect(() => {
    dispatch(fetchInvoicesAsync("shipchandler"))
  }, [dispatch])

  // Cargar todos los registros ShipChandler para mostrar vessels
  useEffect(() => {
    dispatch(fetchAllRecordsByModule("shipchandler"))
  }, [dispatch])

  // Cargar clientes
  useEffect(() => {
    dispatch(fetchClients('shipchandler'))
  }, [dispatch])

  const handleDeleteInvoice = async (invoice: any) => {
    setIsDeleting(true)
    try {
      const result = await dispatch(deleteInvoiceAsync(invoice.id)).unwrap()
      
      toast({
        title: "Factura eliminada",
        description: `La factura ${invoice.invoiceNumber} ha sido eliminada y ${result.data.recordsFreed} registros han sido liberados.`,
      })
      
      setInvoiceToDelete(null)
      
      // Recargar las facturas para actualizar la lista
      dispatch(fetchInvoicesAsync("shipchandler"))
      
    } catch (error: any) {
      toast({
        title: "Error al eliminar factura",
        description: error.message || "Error al eliminar la factura",
        variant: "destructive"
      })
    } finally {
      setIsDeleting(false)
    }
  }


  // Función para exportar a Excel
  const exportToExcel = () => {
    const exportData = filteredInvoices.map((invoice: any) => {
      const vessels = getVesselsForInvoice(invoice)
      const invoiceDate = getInvoiceDateForInvoice(invoice)
      
      return {
        'Número de Factura': invoice.invoiceNumber || 'N/A',
        'Cliente': invoice.clientName || 'N/A',
        'Vessel': vessels,
        'Invoice Date': invoiceDate,
        'Fecha Creación': formatDate(invoice.createdAt),
        'Total': invoice.totalAmount || 0,
        'Estado': invoice.status === 'prefactura' ? 'Prefactura' : 
                  invoice.status === 'facturada' ? 'Facturada' : 
                  invoice.status === 'anulada' ? 'Anulada' : invoice.status,
        'XML Generado': invoice.xmlData ? 'Sí' : 'No',
        'XML Enviado a SAP': invoice.sentToSap ? 'Sí' : 'No',
        'Fecha Envío SAP': invoice.sentToSapAt ? new Date(invoice.sentToSapAt).toLocaleDateString('es-ES') : 'N/A',
        'Registros Asociados': invoice.relatedRecordIds?.length || 0
      }
    })

    const ws = XLSX.utils.json_to_sheet(exportData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Facturas ShipChandler')
    
    const fileName = `facturas_shipchandler_${new Date().toISOString().split('T')[0]}.xlsx`
    XLSX.writeFile(wb, fileName)

    toast({
      title: "Exportación exitosa",
      description: `Se exportaron ${exportData.length} facturas a ${fileName}`,
    })
  }

  // Funciones para filtros de fecha
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
    const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)
    
    const startOfWeek = new Date(today.getFullYear(), today.getMonth(), diff)
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
        setIsDateModalOpen(true)
        break
    }
  }

  const handleApplyDateFilter = (start: string, end: string) => {
    setStartDate(start)
    setEndDate(end)
    setIsUsingPeriodFilter(true)
    setActivePeriodFilter("advanced")
    setIsDateModalOpen(false)
  }

  const handleCancelDateFilter = () => {
    setIsDateModalOpen(false)
    if (!startDate || !endDate) {
      setIsUsingPeriodFilter(false)
      setActivePeriodFilter("none")
    } else {
      setActivePeriodFilter("advanced")
    }
  }

  const getActivePeriodText = () => {
    if (!isUsingPeriodFilter || activePeriodFilter === "advanced") return null
    
    if (startDate === endDate) {
      return "Hoy"
    }
    
    const weekDates = getCurrentWeekDates()
    if (startDate === weekDates.start && endDate === weekDates.end) {
      return "Semana en curso"
    }
    
    const monthDates = getCurrentMonthDates()
    if (startDate === monthDates.start && endDate === monthDates.end) {
      return "Mes en curso"
    }
    
    return "Período personalizado"
  }

  // Obtener lista única de clientes para el filtro
  const uniqueClients = Array.from(new Set(shipchandlerInvoices.map((inv: any) => inv.clientName).filter(Boolean)))

  const filteredInvoices = shipchandlerInvoices.filter((invoice: any) => {
    const vessels = getVesselsForInvoice(invoice)
    const matchesSearch = 
      invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vessels.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || invoice.status === statusFilter
    const matchesClient = clientFilter === 'all' || invoice.clientName === clientFilter
    const matchesVessel = !vesselFilter || vessels.toLowerCase().includes(vesselFilter.toLowerCase())
    
    // Filtro por fecha - usar el date del registro
    let matchesDate = true
    if (isUsingPeriodFilter && startDate && endDate) {
      // Obtener el date del primer registro relacionado
      if (invoice.relatedRecordIds && invoice.relatedRecordIds.length > 0 && allRecords.length > 0) {
        const relatedRecords = allRecords.filter((record: any) => {
          const recordId = record._id || record.id
          return invoice.relatedRecordIds.includes(recordId)
        })
        
        if (relatedRecords.length > 0) {
          const firstRecord = relatedRecords[0]
          const data = firstRecord.data as Record<string, any>
          const recordDate = data?.date
          
          if (recordDate) {
            const invoiceDate = parseRecordDateToDate(recordDate)
            if (invoiceDate) {
              const filterStartDate = new Date(startDate)
              const filterEndDate = new Date(endDate)
              filterEndDate.setHours(23, 59, 59, 999)
              
              matchesDate = invoiceDate >= filterStartDate && invoiceDate <= filterEndDate
            } else {
              matchesDate = false // Si no se puede parsear, no mostrar
            }
          } else {
            matchesDate = false // Si no hay fecha en el registro, no mostrar
          }
        } else {
          matchesDate = false // Si no hay registros relacionados, no mostrar
        }
      } else {
        matchesDate = false // Si no hay registros cargados, no mostrar
      }
    }
    
    return matchesSearch && matchesStatus && matchesClient && matchesVessel && matchesDate
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "prefactura":
        return <Badge variant="outline" className="text-blue-600 border-blue-600">Prefactura</Badge>
      case "facturada":
        return <Badge variant="outline" className="text-green-600 border-green-600">Facturada</Badge>
      case "anulada":
        return <Badge variant="outline" className="text-red-600 border-red-600">Anulada</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A'
    
    if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [year, month, day] = dateString.split('-').map(Number)
      const date = new Date(year, month - 1, day)
      return date.toLocaleDateString('es-ES')
    }
    
    if (dateString.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)) {
      const datePart = dateString.split('T')[0]
      const [year, month, day] = datePart.split('-').map(Number)
      const date = new Date(year, month - 1, day)
      return date.toLocaleDateString('es-ES')
    }
    
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return 'N/A'
    return date.toLocaleDateString('es-ES')
  }

  return (
    <div className="space-y-6">
      {/* Modal de facturación */}
      <ShipChandlerFacturacionModal
        open={isFacturarModalOpen}
        onOpenChange={(open) => {
          setIsFacturarModalOpen(open)
          if (!open) setFacturarInvoice(null)
        }}
        invoice={facturarInvoice}
        onFacturar={async (newInvoiceNumber: string, xmlData?: { xml: string; isValid: boolean; sentToSap?: boolean; sentToSapAt?: string }, invoiceDate?: string) => {
          if (!facturarInvoice) return
          
          const currentInvoice = facturarInvoice
          
          try {
            const updates: any = { 
              status: "facturada", 
              invoiceNumber: newInvoiceNumber 
            }
            
            if (invoiceDate) {
              updates.issueDate = invoiceDate
            }
            
            if (xmlData) {
              updates.xmlData = {
                xml: xmlData.xml,
                isValid: xmlData.isValid,
                generatedAt: new Date().toISOString(),
                ...(xmlData.sentToSap !== undefined && { sentToSap: xmlData.sentToSap }),
                ...(xmlData.sentToSapAt && { sentToSapAt: xmlData.sentToSapAt })
              }
            }
            
            await dispatch(updateInvoiceAsync({ id: currentInvoice.id, updates })).unwrap()
            
            if (currentInvoice.relatedRecordIds && currentInvoice.relatedRecordIds.length > 0) {
              await dispatch(updateMultipleRecordsStatusAsync({ 
                recordIds: currentInvoice.relatedRecordIds, 
                status: "facturado",
                invoiceId: currentInvoice.id 
              })).unwrap()
            }
            
            await dispatch(fetchInvoicesAsync("shipchandler")).unwrap()
            await dispatch(fetchAllRecordsByModule("shipchandler"))
            
            const xmlMessage = xmlData ? " XML generado y guardado." : ""
            
            toast({
              title: "Factura procesada",
              description: `La prefactura ha sido facturada exitosamente como ${newInvoiceNumber}.${xmlMessage}`,
            })
            
            setIsFacturarModalOpen(false)
            setFacturarInvoice(null)
            
          } catch (error: any) {
            toast({
              title: "Error al facturar",
              description: error.message || "Error al procesar la factura",
              variant: "destructive"
            })
          }
        }}
      />
      
      {/* Modal de visor de XML */}
      <ShipChandlerXmlViewerModal
        open={isXmlModalOpen}
        onOpenChange={(open) => {
          setIsXmlModalOpen(open)
          if (!open) setXmlInvoice(null)
        }}
        invoice={xmlInvoice}
        onXmlSentToSap={() => {
          console.log("🔄 XML enviado a SAP - Recargando facturas...")
          dispatch(fetchInvoicesAsync("shipchandler")).then(() => {
            console.log("✅ Facturas recargadas después del envío a SAP")
          })
        }}
      />

      {/* Modal de visor de PDF */}
      <ShipChandlerPdfViewer
        open={isPdfModalOpen}
        onOpenChange={(open) => {
          setIsPdfModalOpen(open)
          if (!open) setPdfInvoice(null)
        }}
        invoice={pdfInvoice}
        clients={clients}
        allRecords={allRecords}
      />
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Facturar - Prefacturas ShipChandler
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Buscar por número, cliente o vessel..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filtrar por estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="prefactura">Prefactura</SelectItem>
                  <SelectItem value="facturada">Facturada</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={exportToExcel}>
                <Download className="h-4 w-4 mr-2" />
                Exportar
              </Button>
            </div>
          </div>

          {/* Filtros */}
          <div className="bg-slate-50 p-4 rounded-lg border mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Filtro por cliente */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-700">Filtrar por cliente:</Label>
                <Select value={clientFilter} onValueChange={setClientFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos los clientes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los clientes</SelectItem>
                    {uniqueClients.map((client: string) => (
                      <SelectItem key={client} value={client}>{client}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Filtro por vessel */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-700">Filtrar por vessel:</Label>
                <Input
                  placeholder="Buscar vessel..."
                  value={vesselFilter}
                  onChange={(e) => setVesselFilter(e.target.value)}
                />
              </div>

              {/* Filtro por fecha */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-700">Filtrar por fecha:</Label>
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
                
                {isUsingPeriodFilter && activePeriodFilter !== "advanced" && (
                  <div className="flex items-center gap-2 p-2 bg-blue-50 border border-blue-200 rounded-md mt-2">
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
                      }}
                      className="h-6 w-6 p-0 ml-auto"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                )}

                {activePeriodFilter === "advanced" && startDate && endDate && (
                  <div className="flex items-center gap-2 p-2 bg-blue-50 border border-blue-200 rounded-md mt-2">
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

            {/* Botón para limpiar todos los filtros */}
            {(clientFilter !== 'all' || statusFilter !== "all" || searchTerm || vesselFilter || startDate || endDate) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setClientFilter('all')
                  setStatusFilter("all")
                  setSearchTerm("")
                  setVesselFilter("")
                  setIsUsingPeriodFilter(false)
                  setActivePeriodFilter("none")
                  setStartDate("")
                  setEndDate("")
                }}
                className="text-xs text-slate-600 hover:text-slate-700 mt-4"
              >
                🗑️ Limpiar todos los filtros
              </Button>
            )}
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Vessel</TableHead>
                  <TableHead>Invoice Date</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <div className="flex items-center justify-center space-x-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Cargando prefacturas...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : error ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <div className="text-red-600">
                        Error al cargar prefacturas: {error}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredInvoices.length > 0 ? (
                  filteredInvoices.map((invoice: any) => {
                    const vessels = getVesselsForInvoice(invoice)
                    
                    return (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-medium font-mono text-sm">
                          {invoice.invoiceNumber}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            {invoice.clientName}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Ship className="h-4 w-4 text-muted-foreground" />
                            {vessels}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            {getInvoiceDateForInvoice(invoice)}
                          </div>
                        </TableCell>
                        <TableCell className="font-bold">
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                            ${invoice.totalAmount.toFixed(2)}
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end space-x-2">
                            {/* Botón Ver PDF */}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              onClick={() => {
                                setPdfInvoice(invoice)
                                setIsPdfModalOpen(true)
                              }}
                              title="Ver PDF"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {invoice.status === "facturada" && invoice.xmlData && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className={`h-8 w-8 ${
                                  invoice.sentToSap 
                                    ? 'text-green-600 hover:text-green-700 hover:bg-green-50' 
                                    : 'text-orange-600 hover:text-orange-700 hover:bg-orange-50'
                                }`}
                                onClick={() => {
                                  setXmlInvoice(invoice)
                                  setIsXmlModalOpen(true)
                                }}
                                title={`Ver XML ${invoice.xmlData.isValid ? '(Válido)' : '(Con errores)'} - ${
                                  invoice.sentToSap ? 'Enviado a SAP' : 'Pendiente de envío a SAP'
                                }`}
                              >
                                <Code className="h-4 w-4" />
                              </Button>
                            )}
                            {invoice.status === "prefactura" && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 w-auto text-green-600 border-green-600 hover:bg-green-50"
                                onClick={() => {
                                  setFacturarInvoice(invoice)
                                  setIsFacturarModalOpen(true)
                                }}
                              >
                                Facturar
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => setInvoiceToDelete(invoice)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      {shipchandlerInvoices.length === 0
                        ? "No hay prefacturas ShipChandler creadas"
                        : "No se encontraron prefacturas que coincidan con los filtros"}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
            <span>Mostrando {filteredInvoices.length} de {shipchandlerInvoices.length} prefacturas</span>
            <span>Total: ${filteredInvoices.reduce((sum: number, invoice: any) => sum + invoice.totalAmount, 0).toFixed(2)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Modal de confirmación para eliminar factura */}
      <Dialog open={!!invoiceToDelete} onOpenChange={() => setInvoiceToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar eliminación</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>¿Estás seguro de que quieres eliminar esta prefactura?</p>
            {invoiceToDelete && (
              <div className="mt-4 space-y-2">
                <p className="font-medium">
                  {invoiceToDelete.invoiceNumber} - {invoiceToDelete.clientName}
                </p>
                <p className="text-sm text-muted-foreground">
                  Esta acción también liberará {invoiceToDelete.relatedRecordIds.length} registro{invoiceToDelete.relatedRecordIds.length !== 1 ? 's' : ''} asociado{invoiceToDelete.relatedRecordIds.length !== 1 ? 's' : ''} para que puedan ser utilizados en nuevas prefacturas.
                </p>
              </div>
            )}
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setInvoiceToDelete(null)}>
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => {
                if (invoiceToDelete) {
                  handleDeleteInvoice(invoiceToDelete)
                }
              }}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Eliminando...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Eliminar
                </>
              )}
            </Button>
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

