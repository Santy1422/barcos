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
} from "@/lib/features/records/recordsSlice"
import { generateInvoiceXML } from "@/lib/xml-generator"
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

  // Datos
  const invoices = useAppSelector((state) => selectInvoicesByModule(state, "trucking"))
  const allRecords = useAppSelector(selectAllIndividualRecords)
  const loading = useAppSelector(selectRecordsLoading)
  const error = useAppSelector(selectRecordsError)

  useEffect(() => {
    dispatch(fetchInvoicesAsync("trucking"))
    dispatch(fetchAllRecordsByModule("trucking"))
  }, [dispatch])

  const getContainersForInvoice = (invoice: any) => {
    if (!invoice.relatedRecordIds || invoice.relatedRecordIds.length === 0) return "N/A"
    if (allRecords.length === 0) return "N/A"
    const related = allRecords.filter((r: any) => (r._id || r.id) && invoice.relatedRecordIds.includes(r._id || r.id))
    const containers = related.map((r: any) => r.data?.container || r.data?.contenedor || "N/A").filter((c: string) => c !== "N/A")
    if (containers.length === 0) return "N/A"
    if (containers.length === 1) return containers[0]
    return `${containers[0]} y ${containers.length - 1} más`
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
      case "advanced": setActivePeriodFilter("advanced"); break
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

  const filteredInvoices = useMemo(() => {
    const q = search.toLowerCase()
    return invoices.filter((inv: any) => {
      const containers = getContainersForInvoice(inv)
      const matchesSearch = (inv.invoiceNumber || '').toLowerCase().includes(q) || (inv.clientName || '').toLowerCase().includes(q) || containers.toLowerCase().includes(q)
      const matchesStatus = statusFilter === 'all' || inv.status === statusFilter
      let matchesDate = true
      if (isUsingPeriodFilter && startDate && endDate) {
        const d = new Date(inv.issueDate || inv.createdAt)
        const s = new Date(startDate)
        const e = new Date(endDate); e.setHours(23,59,59,999)
        matchesDate = d >= s && d <= e
      }
      return matchesSearch && matchesStatus && matchesDate
    })
  }, [invoices, allRecords, search, statusFilter, isUsingPeriodFilter, startDate, endDate])

  // Acciones
  const handleDeleteInvoice = async (invoice: any) => {
    try {
      await dispatch(deleteInvoiceAsync(invoice.id)).unwrap()
      toast({ title: "Factura eliminada", description: `Se eliminó ${invoice.invoiceNumber}` })
      dispatch(fetchInvoicesAsync("trucking"))
      dispatch(fetchAllRecordsByModule("trucking"))
    } catch (e: any) {
      toast({ title: "Error", description: e.message || 'No se pudo eliminar', variant: 'destructive' })
    }
  }

  const handleViewRecords = (invoice: any) => { setViewRecordsInvoice(invoice); setRecordsModalOpen(true) }

  const buildXmlPayload = (invoice: any) => {
    const recordsForXml = invoice.relatedRecordIds.map((recordId: string) => {
      const r = allRecords.find((x: any) => (x._id || x.id) === recordId)
      if (!r) return null
      const d = r.data || {}
      const unitPrice = Number(d.matchedPrice || r.totalValue || 0)
      const desc = d.description || `Container ${d.container || d.contenedor || ''} ${d.size || d.containerSize || ''} ${d.type || d.containerType || ''} ${d.leg || `${d.from || ''} / ${d.to || ''}`}`
      return {
        id: r._id || r.id,
        description: desc,
        quantity: 1,
        unitPrice,
        totalPrice: unitPrice,
        serviceCode: d.serviceCode || 'TRK-STD',
        unit: 'VIAJE',
        blNumber: d.bl || '',
        containerNumber: d.container || d.contenedor || '',
        containerSize: d.size || d.containerSize || '',
        containerType: d.type || d.containerType || '',
        containerIsoCode: d.containerIsoCode || '',
        fullEmptyStatus: d.fullEmptyStatus || '',
      }
    }).filter(Boolean)

    return {
          id: invoice.id,
          module: invoice.module,
          invoiceNumber: invoice.invoiceNumber,
          client: invoice.clientRuc,
          clientName: invoice.clientName,
          date: invoice.issueDate,
          dueDate: invoice.dueDate,
          currency: invoice.currency,
          total: invoice.totalAmount,
          records: recordsForXml,
      status: invoice.status,
    }
  }

  const handleGenerateXml = (invoice: any) => { setXmlInvoice(invoice); setXmlModalOpen(true) }

  const handleDownloadXml = () => {
    if (!xmlContent) return
    const blob = new Blob([xmlContent], { type: 'application/xml;charset=utf-8' })
    saveAs(blob, `factura_trucking.xml`)
  }

  const handleFacturar = async (invoice: any) => {
    try {
      // Generar XML y actualizar factura a 'facturada'
      const xml = generateInvoiceXML(buildXmlPayload(invoice) as any)
      await dispatch(updateInvoiceAsync({ id: invoice.id, updates: { status: 'facturada', xmlData: xml } })).unwrap()
      // Marcar registros como facturados en backend
      await dispatch(updateMultipleRecordsStatusAsync({ recordIds: invoice.relatedRecordIds, status: 'facturado', invoiceId: invoice.id })).unwrap()
      toast({ title: 'Facturada', description: `La factura ${invoice.invoiceNumber} fue marcada como facturada` })
      dispatch(fetchInvoicesAsync('trucking'))
      dispatch(fetchAllRecordsByModule('trucking'))
    } catch (e: any) {
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
              <Button variant="ghost" size="sm" onClick={()=>{ setIsUsingPeriodFilter(false); setActivePeriodFilter('none'); setStartDate(''); setEndDate('') }} className="h-6 w-6 p-0 ml-auto"><X className="h-3 w-3" /></Button>
            </div>
          )}

          <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                  <TableHead>Número</TableHead>
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
                  <TableRow><TableCell colSpan={7} className="py-8 text-center"><div className="flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Cargando…</div></TableCell></TableRow>
                ) : error ? (
                  <TableRow><TableCell colSpan={7} className="py-8 text-center text-red-600">{error}</TableCell></TableRow>
                ) : filteredInvoices.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="py-8 text-center text-muted-foreground">No hay prefacturas</TableCell></TableRow>
                ) : (
                  filteredInvoices.map((inv: any) => (
                    <TableRow key={inv.id}>
                      <TableCell className="font-mono text-sm">{inv.invoiceNumber}</TableCell>
                      <TableCell><div className="flex items-center gap-2"><User className="h-4 w-4 text-muted-foreground" />{inv.clientName}</div></TableCell>
                      <TableCell><div className="flex items-center gap-2"><Truck className="h-4 w-4 text-muted-foreground" />{getContainersForInvoice(inv)}</div></TableCell>
                      <TableCell><div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-muted-foreground" />{new Date(inv.issueDate).toLocaleDateString('es-ES')}</div></TableCell>
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
                          <Button variant="ghost" size="sm" title="Eliminar" onClick={()=>handleDeleteInvoice(inv)} className="h-8 w-8 text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4"/></Button>
                              </div>
                            </TableCell>
                          </TableRow>
                  ))
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
          await dispatch(updateInvoiceAsync({ id: facturarInvoice.id, updates: { status: 'facturada', invoiceNumber, xmlData: xmlData ? { xml: xmlData.xml, isValid: xmlData.isValid, generatedAt: new Date().toISOString() } : undefined } })).unwrap()
          await dispatch(updateMultipleRecordsStatusAsync({ recordIds: facturarInvoice.relatedRecordIds, status: 'facturado', invoiceId: facturarInvoice.id })).unwrap()
          setFacturarModalOpen(false)
          dispatch(fetchInvoicesAsync('trucking'))
          dispatch(fetchAllRecordsByModule('trucking'))
        } catch (e:any) {
          toast({ title: 'Error', description: e.message || 'No se pudo facturar', variant: 'destructive' })
        }
      }} />

      {/* El modal de edición se maneja con TruckingPrefacturaEditModal */}
    </div>
  )
}


