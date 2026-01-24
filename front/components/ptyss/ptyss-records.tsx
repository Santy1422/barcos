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
import { Ship, Search, Filter, Download, Eye, FileText, Calendar, DollarSign, User, Loader2, Trash2, Database, Code, X, Edit } from "lucide-react"
import { useAppSelector, useAppDispatch } from "@/lib/hooks"
import { useToast } from "@/hooks/use-toast"
import { selectInvoicesByModule, fetchInvoicesAsync, deleteInvoiceAsync, selectRecordsLoading, selectRecordsError, updateInvoiceAsync, updateInvoiceStatus, selectAllIndividualRecords, fetchAllRecordsByModule, markRecordsAsInvoiced, updateMultipleRecordsStatusAsync } from "@/lib/features/records/recordsSlice"
import { PTYSSPrefacturaEditModal } from "./ptyss-prefactura-edit-modal"
import { PTYSSPdfViewer } from "./ptyss-pdf-viewer"
import { PTYSSFacturacionModal } from "./ptyss-facturacion-modal"
import { PTYSSRecordsViewModal } from "./ptyss-records-view-modal"
import { PTYSSXmlViewerModal } from "./ptyss-xml-viewer-modal"
import { fetchClients } from "@/lib/features/clients/clientsSlice"
import saveAs from "file-saver"
import { generateXmlFileName } from "@/lib/xml-generator"
import * as XLSX from "xlsx"

export function PTYSSRecords() {
  const dispatch = useAppDispatch()
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [invoiceToDelete, setInvoiceToDelete] = useState<any>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [editInvoice, setEditInvoice] = useState<any>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [pdfInvoice, setPdfInvoice] = useState<any>(null)
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false)
  const [facturarInvoice, setFacturarInvoice] = useState<any>(null)
  const [isFacturarModalOpen, setIsFacturarModalOpen] = useState(false)
  // Estado para ver registros asociados
  const [viewRecordsInvoice, setViewRecordsInvoice] = useState<any>(null)
  const [isViewRecordsModalOpen, setIsViewRecordsModalOpen] = useState(false)
  // Estado para XML
  const [xmlInvoice, setXmlInvoice] = useState<any>(null)
  const [isXmlModalOpen, setIsXmlModalOpen] = useState(false)

  // Estados para filtros
  const [recordTypeFilter, setRecordTypeFilter] = useState<"all" | "local" | "trasiego">("all")
  const [activePeriodFilter, setActivePeriodFilter] = useState<"none" | "today" | "week" | "month" | "advanced">("none")
  const [isUsingPeriodFilter, setIsUsingPeriodFilter] = useState(false)
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [isDateModalOpen, setIsDateModalOpen] = useState(false)

  // Obtener prefacturas PTYSS del store
  const ptyssInvoices = useAppSelector((state) => selectInvoicesByModule(state, "ptyss"))
  const isLoading = useAppSelector(selectRecordsLoading)
  const error = useAppSelector(selectRecordsError)
  const allRecords = useAppSelector(selectAllIndividualRecords)
  const clients = useAppSelector((state) => state.clients.clients)

  // Función para obtener los contenedores de una factura
  const getContainersForInvoice = (invoice: any) => {
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
    
    const containers = relatedRecords.map((record: any) => {
      const data = record.data as Record<string, any>
      return data?.container || "N/A"
    }).filter((container: string) => container !== "N/A")
    
    if (containers.length === 0) return "N/A"
    if (containers.length === 1) return containers[0]
    return `${containers[0]} y ${containers.length - 1} más`
  }



  // Cargar facturas del backend al montar el componente
  useEffect(() => {
    dispatch(fetchInvoicesAsync("ptyss"))
  }, [dispatch])

  // Cargar todos los registros PTYSS para mostrar contenedores
  useEffect(() => {
    dispatch(fetchAllRecordsByModule("ptyss"))
  }, [dispatch])

  // Cargar clientes para el visor de PDF
  useEffect(() => {
    dispatch(fetchClients())
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
      dispatch(fetchInvoicesAsync("ptyss"))
      
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

  const handleEditSuccess = () => {
    // Recargar las facturas para actualizar la lista después de editar
    dispatch(fetchInvoicesAsync("ptyss"))
  }

  // Función para descargar XML
  const handleDownloadXml = (invoice: any) => {
    if (invoice.xmlData && invoice.xmlData.xml) {
      const blob = new Blob([invoice.xmlData.xml], { type: "application/xml;charset=utf-8" })
      const filename = generateXmlFileName('9326')
      
      saveAs(blob, filename)
      toast({ 
        title: "XML Descargado", 
        description: `El archivo XML ha sido descargado como ${filename}` 
      })
    } else {
      toast({
        title: "XML no disponible",
        description: "Esta factura no tiene XML generado.",
        variant: "destructive"
      })
    }
  }

  // Función para exportar a Excel
  const exportToExcel = () => {
    const exportData = filteredInvoices.map((invoice: any) => {
      const containers = getContainersForInvoice(invoice)
      const invoiceType = getInvoiceType(invoice)
      
      return {
        'Número de Factura': invoice.invoiceNumber || 'N/A',
        'Cliente': invoice.clientName || 'N/A',
        'Contenedores': containers,
        'Fecha Emisión': formatDate(invoice.issueDate),
        'Fecha Creación': formatDate(invoice.createdAt),
        'Total': invoice.totalAmount || 0,
        'Estado': invoice.status === 'prefactura' ? 'Prefactura' : 
                  invoice.status === 'facturada' ? 'Facturada' : 
                  invoice.status === 'anulada' ? 'Anulada' : invoice.status,
        'Tipo': invoiceType === 'local' ? 'Local' : 'Trasiego',
        'XML Generado': invoice.xmlData ? 'Sí' : 'No',
                 'XML Enviado a SAP': invoice.sentToSap ? 'Sí' : 'No',
         'Fecha Envío SAP': invoice.sentToSapAt ? new Date(invoice.sentToSapAt).toLocaleDateString('es-ES') : 'N/A',
        'Notas': invoice.notes || '',
        'Registros Asociados': invoice.relatedRecordIds?.length || 0
      }
    })

    const ws = XLSX.utils.json_to_sheet(exportData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Facturas PTYSS')
    
    const fileName = `facturas_ptyss_${new Date().toISOString().split('T')[0]}.xlsx`
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
    const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1) // Ajuste para que la semana empiece en lunes
    
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
    // Si el filtro ya está activo, desactivarlo
    if (activePeriodFilter === period) {
      setIsUsingPeriodFilter(false)
      setActivePeriodFilter("none")
      setStartDate("")
      setEndDate("")
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

  // Función para determinar el tipo de registro basándose en los datos del registro
  const getRecordType = (record: any): "local" | "trasiego" => {
    const data = record.data as Record<string, any>
    
    // Si el registro tiene el campo recordType, usarlo directamente
    if (data?.recordType === "local" || data?.recordType === "trasiego") {
      return data.recordType
    }
    
    // Los registros de trasiego tienen campos específicos del Excel de trucking
    // como containerConsecutive, leg, moveType, associate, etc.
    if (data?.containerConsecutive || data?.leg || data?.moveType || data?.associate || 
        data?.from || data?.to || data?.line || data?.driverName || data?.plate) {
      return "trasiego"
    }
    
    // Los registros locales tienen campos específicos de PTYSS
    // como clientId, order, naviera, etc.
    if (data?.clientId || data?.order || data?.naviera) {
      return "local"
    }
    
    // Por defecto, si no podemos determinar, asumimos que es local
    return "local"
  }

  // Función para determinar el tipo de una factura basándose en los registros relacionados
  const getInvoiceType = (invoice: any): "local" | "trasiego" => {
    // Si no hay registros relacionados, intentar determinar por el nombre del cliente como fallback
    if (!invoice.relatedRecordIds || invoice.relatedRecordIds.length === 0) {
      // Fallback: buscar por nombre del cliente (Panama Transshipment Group o variaciones)
      const clientName = invoice.clientName?.toString().toLowerCase().trim() || ""
      if (clientName.includes("panama transshipment") || clientName.includes("ptg") || 
          clientName === "ptg" || clientName.includes("transshipment group")) {
        return "trasiego"
      }
      return "local"
    }
    
    // Obtener los registros relacionados de la factura
    const relatedRecords = allRecords.filter((record: any) => {
      const recordId = record._id || record.id
      return invoice.relatedRecordIds.includes(recordId)
    })
    
    if (relatedRecords.length === 0) {
      // Si no se encuentran los registros, usar fallback por nombre del cliente
      const clientName = invoice.clientName?.toString().toLowerCase().trim() || ""
      if (clientName.includes("panama transshipment") || clientName.includes("ptg") || 
          clientName === "ptg" || clientName.includes("transshipment group")) {
        return "trasiego"
      }
      return "local"
    }
    
    // Determinar el tipo basándose en los registros relacionados
    // Si todos son del mismo tipo, usar ese tipo
    // Si hay mezcla, usar el tipo más común
    const recordTypes = relatedRecords.map((record: any) => getRecordType(record))
    const trasiegoCount = recordTypes.filter(t => t === "trasiego").length
    const localCount = recordTypes.filter(t => t === "local").length
    
    // Si hay más registros de trasiego, es trasiego; si hay más locales, es local
    // Si hay igual cantidad, usar el primero
    if (trasiegoCount > localCount) {
      return "trasiego"
    } else if (localCount > trasiegoCount) {
      return "local"
    } else {
      // Si hay igual cantidad, usar el tipo del primer registro
      return recordTypes[0] || "local"
    }
  }

  const filteredInvoices = ptyssInvoices.filter((invoice: any) => {
    const containers = getContainersForInvoice(invoice)
    const matchesSearch = 
      invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      containers.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || invoice.status === statusFilter
    
         // Filtro por tipo de registro
     const invoiceType = getInvoiceType(invoice)
     const matchesType = recordTypeFilter === "all" || invoiceType === recordTypeFilter
    
    // Filtro por fecha (solo fecha de creación/issue)
    let matchesDate = true
    if (isUsingPeriodFilter && startDate && endDate) {
      const invoiceDate = new Date(invoice.issueDate || invoice.createdAt)
      const filterStartDate = new Date(startDate)
      const filterEndDate = new Date(endDate)
      filterEndDate.setHours(23, 59, 59, 999) // Incluir todo el día
      
      matchesDate = invoiceDate >= filterStartDate && invoiceDate <= filterEndDate
    }
    
    return matchesSearch && matchesStatus && matchesType && matchesDate
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

  return (
    <div className="space-y-6">
      {/* Modal de edición de prefactura */}
      <PTYSSPrefacturaEditModal
        open={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        invoice={editInvoice}
        onClose={() => setIsEditModalOpen(false)}
        onEditSuccess={handleEditSuccess}
      />
      {/* Modal de facturación */}
      <PTYSSFacturacionModal
        open={isFacturarModalOpen}
        onOpenChange={(open) => {
          setIsFacturarModalOpen(open)
          if (!open) setFacturarInvoice(null)
        }}
        invoice={facturarInvoice}
        onFacturar={async (newInvoiceNumber: string, xmlData?: { xml: string; isValid: boolean; sentToSap?: boolean; sentToSapAt?: string }, invoiceDate?: string) => {
          if (!facturarInvoice) return
          
          const currentInvoice = facturarInvoice // Guardar referencia antes de cerrar modal
          
          try {
            // Preparar las actualizaciones de la factura
            const updates: any = { 
              status: "facturada", 
              invoiceNumber: newInvoiceNumber 
            }
            
            // Actualizar fecha de emisión si se proporcionó
            if (invoiceDate) {
              updates.issueDate = invoiceDate
            }
            
            // Agregar XML si está disponible
            console.log("🔍 PTYSSRecords - xmlData recibido:", xmlData)
            if (xmlData) {
              updates.xmlData = {
                xml: xmlData.xml,
                isValid: xmlData.isValid,
                generatedAt: new Date().toISOString(),
                // Incluir campos de envío a SAP si están presentes
                ...(xmlData.sentToSap !== undefined && { sentToSap: xmlData.sentToSap }),
                ...(xmlData.sentToSapAt && { sentToSapAt: xmlData.sentToSapAt })
              }
              console.log("✅ PTYSSRecords - xmlData agregado a updates:", updates.xmlData)
            } else {
              console.log("⚠️ PTYSSRecords - No se recibió xmlData")
            }
            
            // Actualizar la factura
            console.log("🔍 PTYSSRecords - Enviando updates a la base de datos:", updates)
            const updateResult = await dispatch(updateInvoiceAsync({ id: currentInvoice.id, updates })).unwrap()
            console.log("✅ PTYSSRecords - Resultado de actualización:", updateResult)
            
            // Marcar los registros asociados como facturados en la base de datos
            if (currentInvoice.relatedRecordIds && currentInvoice.relatedRecordIds.length > 0) {
              await dispatch(updateMultipleRecordsStatusAsync({ 
                recordIds: currentInvoice.relatedRecordIds, 
                status: "facturado",
                invoiceId: currentInvoice.id 
              })).unwrap()
            }
            
            // Recargar las facturas y registros para actualizar el historial - eliminar el estado local desactualizado
            console.log("🔄 PTYSSRecords - Recargando facturas...")
            const invoicesResult = await dispatch(fetchInvoicesAsync("ptyss")).unwrap()
            console.log("✅ PTYSSRecords - Facturas recargadas desde servidor:", invoicesResult)
            await dispatch(fetchAllRecordsByModule("ptyss"))
            
            // Verificar que la factura específica se actualizó
            const updatedInvoice = invoicesResult.find((inv: any) => inv.id === currentInvoice.id)
            console.log("🔍 PTYSSRecords - Factura actualizada encontrada:", updatedInvoice)
            console.log("🔍 PTYSSRecords - Estado de la factura actualizada:", updatedInvoice?.status)
            console.log("🔍 PTYSSRecords - XML en factura actualizada:", updatedInvoice?.xmlData ? "Presente" : "Ausente")
            
            // Forzar una actualización adicional si el estado no cambió
            if (!updatedInvoice || updatedInvoice.status !== "facturada") {
              console.log("⚠️ PTYSSRecords - Estado no se actualizó correctamente, intentando recarga adicional...")
              setTimeout(async () => {
                await dispatch(fetchInvoicesAsync("ptyss"))
              }, 1000)
            }
            
            const xmlMessage = xmlData ? " XML generado y guardado." : ""
            
            toast({
              title: "Factura procesada",
              description: `La prefactura ha sido facturada exitosamente como ${newInvoiceNumber}.${xmlMessage}`,
            })
            
            // Cerrar el modal solo si todo fue exitoso
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
      {/* Modal de ver registros asociados */}
      <PTYSSRecordsViewModal
        open={isViewRecordsModalOpen}
        onOpenChange={(open) => {
          setIsViewRecordsModalOpen(open)
          if (!open) setViewRecordsInvoice(null)
        }}
        invoice={viewRecordsInvoice}
      />
      {/* Modal de visor de PDF */}
      <PTYSSPdfViewer
        open={isPdfModalOpen}
        onOpenChange={setIsPdfModalOpen}
        invoice={pdfInvoice}
        clients={clients}
        allRecords={allRecords}
      />
      {/* Modal de visor de XML */}
      <PTYSSXmlViewerModal
        open={isXmlModalOpen}
        onOpenChange={(open) => {
          setIsXmlModalOpen(open)
          if (!open) setXmlInvoice(null)
        }}
        invoice={xmlInvoice}
        onXmlSentToSap={() => {
          console.log("🔄 XML enviado a SAP - Recargando facturas...")
          dispatch(fetchInvoicesAsync("ptyss")).then(() => {
            console.log("✅ Facturas recargadas después del envío a SAP")
          })
        }}
      />
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Facturar - Prefacturas PTYSS
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Buscar por número, cliente o contenedor..."
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
          <div className="bg-slate-50 p-4 rounded-lg border">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Filtro por tipo de registro */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-700">Filtrar por tipo:</Label>
                <div className="flex gap-2">
                  <Button
                    variant={recordTypeFilter === "all" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setRecordTypeFilter("all")}
                    className="text-xs"
                  >
                    Todos
                  </Button>
                  <Button
                    variant={recordTypeFilter === "local" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setRecordTypeFilter("local")}
                    className="text-xs"
                  >
                    Locales
                  </Button>
                  <Button
                    variant={recordTypeFilter === "trasiego" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setRecordTypeFilter("trasiego")}
                    className="text-xs"
                  >
                    Trasiego
                  </Button>
                </div>
                
                {/* Botón para limpiar todos los filtros - movido aquí para optimizar espacio */}
                {(recordTypeFilter !== "all" || statusFilter !== "all" || searchTerm || startDate || endDate) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setRecordTypeFilter("all")
                      setStatusFilter("all")
                      setSearchTerm("")
                      setIsUsingPeriodFilter(false)
                      setActivePeriodFilter("none")
                      setStartDate("")
                      setEndDate("")
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
                
                {/* Indicador de período activo */}
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

                {/* Indicador de filtro avanzado */}
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


          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Contenedor</TableHead>
                  <TableHead>Fecha Emisión</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="hidden md:table-cell">Notas</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <div className="flex items-center justify-center space-x-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Cargando prefacturas...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : error ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <div className="text-red-600">
                        Error al cargar prefacturas: {error}
                      </div>
                    </TableCell>
                  </TableRow>
                                 ) : filteredInvoices.length > 0 ? (
                   filteredInvoices.map((invoice: any) => {
                     const containers = getContainersForInvoice(invoice)
                    
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
                          {containers}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {formatDate(invoice.issueDate)}
                        </div>
                      </TableCell>
                      <TableCell className="font-bold">
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          ${invoice.totalAmount.toFixed(2)}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                      <TableCell className="max-w-32 hidden md:table-cell">
                        {invoice.notes ? (
                          <div 
                            className="text-sm text-gray-600 truncate cursor-help" 
                            title={invoice.notes}
                          >
                            {invoice.notes}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end space-x-2">
                          {/* Botón para ver registros asociados */}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                            onClick={() => {
                              setViewRecordsInvoice(invoice)
                              setIsViewRecordsModalOpen(true)
                            }}
                            title="Ver registros asociados"
                          >
                            <Database className="h-4 w-4" />
                          </Button>
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
                          {/* Botón para ver/descargar XML - solo para facturas con XML */}
                          {invoice.status === "facturada" && (
                            <>
                              {invoice.xmlData ? (
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
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                                  onClick={() => {
                                    toast({
                                      title: "XML no disponible",
                                      description: "Esta factura no tiene XML generado. Solo las facturas procesadas después de la actualización incluyen XML.",
                                      variant: "default"
                                    })
                                  }}
                                  title="Factura sin XML (procesada antes de la actualización)"
                                >
                                  <Code className="h-4 w-4 opacity-50" />
                                </Button>
                              )}
                            </>
                          )}
                          {invoice.status === "prefactura" && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 w-auto text-blue-600 border-blue-600 hover:bg-blue-50"
                                onClick={() => {
                                  setEditInvoice(invoice)
                                  setIsEditModalOpen(true)
                                }}
                              >
                                Editar
                              </Button>
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
                            </>
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
                  )})
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      {ptyssInvoices.length === 0
                        ? "No hay prefacturas PTYSS creadas"
                        : "No se encontraron prefacturas que coincidan con los filtros"}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
            <span>Mostrando {filteredInvoices.length} de {ptyssInvoices.length} prefacturas</span>
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