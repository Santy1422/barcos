import React, { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { FileText, Download, ArrowLeft, Eye, Loader2, Trash2, Calendar, X, Edit, Search } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { 
  fetchAutoridadesRecords, 
  deleteAutoridadesRecord, 
  selectAutoridadesRecords,
  selectRecordsLoading,
  selectRecordsError 
} from "@/lib/features/records/recordsSlice";

export function TruckingGastosAutoridadesPage() {
  const { toast } = useToast();
  const dispatch = useAppDispatch();
  
  // Estados para el manejo de pasos
  type Step = 'select' | 'pdf'
  const [step, setStep] = useState<Step>('select')
  
  // Estados para selección
  const [selectedBLNumbers, setSelectedBLNumbers] = useState<string[]>([])
  
  // Estados para expansión de contenedores
  const [expandedBLNumbers, setExpandedBLNumbers] = useState<string[]>([])
  
  // Estados para filtros de fecha (similar a trucking-prefactura)
  const [dateFilter, setDateFilter] = useState<'createdAt'|'dateOfInvoice'>('createdAt')
  const [isUsingPeriodFilter, setIsUsingPeriodFilter] = useState(false)
  const [activePeriodFilter, setActivePeriodFilter] = useState<'none'|'today'|'week'|'month'|'advanced'>('none')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [isDateFilterModalOpen, setIsDateFilterModalOpen] = useState(false)
  
  // Estado para filtro por tipo de autoridad (APA/QUA)
  const [authFilter, setAuthFilter] = useState<'all'|'APA'|'QUA'>('all')
  
  // Estado para búsqueda
  const [search, setSearch] = useState<string>("")
  
  // Estados de paginación
  const [currentPage, setCurrentPage] = useState(1)
  const recordsPerPage = 10
  
  // Estados para PDF
  const [documentData, setDocumentData] = useState({ number: `AUTH-${Date.now().toString().slice(-5)}`, notes: "" })
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null)
  const [showPdfPreview, setShowPdfPreview] = useState(false)
  const [modalPdfUrl, setModalPdfUrl] = useState<string | null>(null)
  
  // Redux state
  const records = useAppSelector(selectAutoridadesRecords);
  const loading = useAppSelector(selectRecordsLoading);
  const error = useAppSelector(selectRecordsError);

  useEffect(() => {
    dispatch(fetchAutoridadesRecords());
  }, [dispatch]);

  // Filtrar registros por fecha, autoridad y búsqueda antes de agrupar
  const filteredRecords = useMemo(() => {
    let filtered = [...records]
    
    // Filtro por búsqueda
    if (search.trim()) {
      const searchTerm = search.toLowerCase()
      filtered = filtered.filter((record: any) => {
        const blNumber = (record.blNumber || '').toLowerCase().includes(searchTerm)
        const noInvoice = (record.noInvoice || '').toLowerCase().includes(searchTerm)
        const ruta = (record.ruta || '').toLowerCase().includes(searchTerm)
        return blNumber || noInvoice || ruta
      })
    }
    
    // Filtro por tipo de autoridad (APA/QUA)
    if (authFilter !== 'all') {
      filtered = filtered.filter((record: any) => {
        const recordAuth = (record.auth || '').toString().toUpperCase().trim()
        return recordAuth === authFilter
      })
    }
    
    // Filtro por fecha
    if (isUsingPeriodFilter && startDate && endDate) {
      const s = new Date(startDate)
      const e = new Date(endDate); e.setHours(23,59,59,999)
      
      filtered = filtered.filter((record: any) => {
        const val = dateFilter === 'dateOfInvoice' ? (record.dateOfInvoice || record.createdAt) : record.createdAt
        
        if (!val) return false
        
        const d = new Date(val)
        return d >= s && d <= e
      })
    }
    
    return filtered
  }, [records, search, authFilter, isUsingPeriodFilter, startDate, endDate, dateFilter])

  // Agrupar registros filtrados por BL Number
  const groupedByBL = useMemo(() => {
    const groups = new Map<string, any[]>()
    filteredRecords.forEach((record: any) => {
      const blNumber = record.blNumber || 'Sin BL'
      if (!groups.has(blNumber)) {
        groups.set(blNumber, [])
      }
      groups.get(blNumber)!.push(record)
    })
    return groups
  }, [filteredRecords])

  // Paginación de BL Numbers (no de registros individuales)
  const totalBLNumbers = Array.from(groupedByBL.keys())
  const totalPages = Math.ceil(totalBLNumbers.length / recordsPerPage)
  const paginatedBLNumbers = useMemo(() => {
    const start = (currentPage - 1) * recordsPerPage
    const end = start + recordsPerPage
    return totalBLNumbers.slice(start, end)
  }, [totalBLNumbers, currentPage, recordsPerPage])

  // Registros seleccionados
  const selectedRecords = useMemo(() => {
    const selected: any[] = []
    selectedBLNumbers.forEach(blNumber => {
      const groupRecords = groupedByBL.get(blNumber) || []
      selected.push(...groupRecords)
    })
    return selected
  }, [selectedBLNumbers, groupedByBL])

  // Funciones de selección
  const toggleBLSelection = (blNumber: string, checked: boolean) => {
    if (checked) {
      setSelectedBLNumbers(prev => [...prev, blNumber])
    } else {
      setSelectedBLNumbers(prev => prev.filter(bl => bl !== blNumber))
    }
  }

  const isSelected = (blNumber: string) => selectedBLNumbers.includes(blNumber)

  const clearSelection = () => setSelectedBLNumbers([])

  // Resetear página cuando cambien los filtros
  useEffect(() => {
    setCurrentPage(1)
  }, [search, authFilter, isUsingPeriodFilter, startDate, endDate, dateFilter])

  // Funciones de expansión
  const toggleExpansion = (blNumber: string) => {
    setExpandedBLNumbers(prev => 
      prev.includes(blNumber) 
        ? prev.filter(bl => bl !== blNumber)
        : [...prev, blNumber]
    )
  }

  const isExpanded = (blNumber: string) => expandedBLNumbers.includes(blNumber)

  // Funciones de filtros de fecha (replicadas de trucking-prefactura)
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
        setIsDateFilterModalOpen(true)
        break
    }
  }
  
  const handleApplyDateFilter = (start: string, end: string) => {
    setStartDate(start); setEndDate(end); setIsUsingPeriodFilter(true); setActivePeriodFilter('advanced'); setIsDateFilterModalOpen(false)
  }
  
  const handleCancelDateFilter = () => {
    setIsDateFilterModalOpen(false)
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

  const handleNextStep = () => {
    if (selectedRecords.length === 0) {
      toast({ title: 'Selecciona registros', description: 'Debes seleccionar al menos un BL', variant: 'destructive' })
      return
    }
    setStep('pdf')
    // Generar PDF automáticamente al pasar al paso 2
    setTimeout(() => generateRealtimePDF(), 500)
  }

  const handlePrevStep = () => {
    setStep('select')
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm("¿Eliminar este registro?")) return;
    try {
      await dispatch(deleteAutoridadesRecord(id)).unwrap();
      toast({ title: "Registro eliminado" });
    } catch (e: any) {
      toast({ title: "Error al eliminar", description: e.message, variant: "destructive" });
    }
  };

  // Generar PDF de gastos de autoridades
  const generateAutoridadesPdf = () => {
    if (selectedRecords.length === 0) return null

    const doc = new jsPDF()

    // Colores / encabezado
    const lightBlue = [59, 130, 246]
    doc.setFillColor(lightBlue[0], lightBlue[1], lightBlue[2])
    doc.rect(15, 15, 30, 15, 'F')
    
    // Texto 'PTG' grande, centrado
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(14)
    doc.setFont(undefined, 'bold')
    doc.text('PTG', 30, 23, { align: 'center', baseline: 'middle' })

    // Número de documento y fecha
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(14)
    doc.setFont(undefined, 'bold')
    doc.text(`GASTOS AUTORIDADES No. ${documentData.number}`, 195, 20, { align: 'right' })

    const currentDate = new Date()
    const day = currentDate.getDate().toString().padStart(2, '0')
    const month = (currentDate.getMonth() + 1).toString().padStart(2, '0')
    const year = currentDate.getFullYear()
    doc.setFontSize(10)
    doc.text('DATE:', 195, 30, { align: 'right' })
    doc.setFontSize(12)
    doc.text(`${day} ${month} ${year}`, 195, 35, { align: 'right' })

    // Encabezado de tabla
    const startY = 60
    const tableWidth = 180
    const tableX = 15
    doc.setFillColor(lightBlue[0], lightBlue[1], lightBlue[2])
    doc.rect(tableX, startY, tableWidth, 8, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(10)
    doc.setFont(undefined, 'bold')
    doc.text('BL NUMBER', 20, startY + 5)
    doc.text('CONTAINERS', 60, startY + 5)
    doc.text('AUTH', 100, startY + 5)
    doc.text('PRICE', 130, startY + 5)
    doc.text('TOTAL', 170, startY + 5)

    // Crear filas agrupadas por BL Number con pricing
    const bodyRows: any[] = []
    let grandTotal = 0
    
    selectedBLNumbers.forEach(blNumber => {
      const groupRecords = groupedByBL.get(blNumber) || []
      const containers = groupRecords.map(r => r.container).join(', ')
      const auth = groupRecords[0]?.auth || ''
      
      // NOTF: se cobra una vez por BL Number (del registro con el número de order más bajo)
      const notfRecord = groupRecords
        .filter(r => r.order && !isNaN(parseFloat(r.order))) // Solo registros con order válido
        .sort((a, b) => parseFloat(a.order) - parseFloat(b.order))[0] // Ordenar por order ascendente y tomar el primero
      const notfValue = notfRecord?.notf ? parseFloat(notfRecord.notf) || 0 : 0
      
      // SEAL: se cobra por cada contenedor que tenga valor en seal
      const sealTotal = groupRecords.reduce((sum, r) => {
        const sealValue = r.seal ? parseFloat(r.seal) || 0 : 0
        return sum + sealValue
      }, 0)
      
      // Total para este BL Number
      const blTotal = notfValue + sealTotal
      grandTotal += blTotal
      
      // Descripción del precio
      const priceDescription = []
      if (notfValue > 0) priceDescription.push(`NOTF: $${notfValue.toFixed(2)}`)
      if (sealTotal > 0) priceDescription.push(`SEAL: $${sealTotal.toFixed(2)} (${groupRecords.filter(r => r.seal && parseFloat(r.seal) > 0).length} containers)`)
      
      bodyRows.push([
        blNumber,
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
        0: { cellWidth: 40 }, 
        1: { cellWidth: 50 }, 
        2: { cellWidth: 25 }, 
        3: { cellWidth: 45 }, 
        4: { cellWidth: 20, halign: 'right' } 
      },
      margin: { left: tableX },
    })

    let y = (doc as any).lastAutoTable.finalY + 10

    // Total general
    doc.setTextColor(0, 0, 0)
    doc.setFont(undefined, 'bold')
    doc.setFontSize(12)
    doc.text('TOTAL GENERAL:', 120, y)
    doc.setFontSize(16)
    doc.text(`$${grandTotal.toFixed(2)}`, 195, y, { align: 'right' })
    y += 20

    // Información adicional
    if (documentData.notes) {
      doc.setTextColor(0, 0, 0)
      doc.setFontSize(10)
      doc.setFont(undefined, 'bold')
      doc.text('NOTAS:', 15, y)
      doc.setFont(undefined, 'normal')
      y += 5
      const notes = doc.splitTextToSize(documentData.notes, 180)
      doc.text(notes, 15, y)
    }

    return doc.output('blob')
  }

  // Generar PDF en tiempo real para vista previa
  const generateRealtimePDF = () => {
    if (selectedRecords.length === 0 || !documentData.number) return
    
    try {
      const blob = generateAutoridadesPdf()
      if (blob instanceof Blob) {
        if (pdfPreviewUrl) {
          try { URL.revokeObjectURL(pdfPreviewUrl) } catch {}
        }
        const url = URL.createObjectURL(blob)
        setPdfPreviewUrl(url)
      }
    } catch (error) {
      console.error('Error generando PDF:', error)
    }
  }

  // Vista previa del PDF
  const handlePreviewPDF = () => {
    try {
      const pdfBlob = generateAutoridadesPdf()
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
        
        toast({ title: "PDF descargado", description: "Se descargó el documento en PDF" })
      }
    } catch (error) {
      console.error('Error descargando PDF:', error)
      toast({ title: "Error", description: "No se pudo generar el PDF", variant: "destructive" })
    }
  }

  // Limpiar URLs cuando se desmonte el componente
  useEffect(() => {
    return () => {
      if (pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl)
      if (modalPdfUrl) URL.revokeObjectURL(modalPdfUrl)
    }
  }, [pdfPreviewUrl, modalPdfUrl])

  // Regenerar PDF cuando cambien los datos
  useEffect(() => {
    if (step === 'pdf' && selectedRecords.length > 0 && documentData.number) {
      const timeoutId = setTimeout(() => generateRealtimePDF(), 150)
      return () => clearTimeout(timeoutId)
    }
  }, [documentData, step, selectedRecords.length])

  return (
    <div className="space-y-6">
      {/* Paso 1: Selección de registros agrupados por BL Number */}
      {step === 'select' && (
        <>
          {/* Encabezado estilo PTYSS */}
          <div className="bg-slate-800 text-white rounded-md p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-md bg-slate-700 flex items-center justify-center">📋</div>
              <div>
                <div className="text-lg font-semibold">Paso 1: Selección por BL Number</div>
                <div>
                  <Badge variant="secondary" className="text-slate-900 bg-white/90">{Array.from(groupedByBL.keys()).length} BL Numbers</Badge>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-sm opacity-90">{selectedBLNumbers.length} BL seleccionados, {selectedRecords.length} registros</div>
              <Button variant="outline" disabled={selectedBLNumbers.length === 0} onClick={clearSelection} className="bg-white/10 hover:bg-white/20 border-white/30 text-white">
                Limpiar Selección
              </Button>
            </div>
          </div>

          {/* Filtros (estilo trucking-prefactura) */}
          <div className="mb-6 mt-4 flex flex-row gap-4 w-full">
            {/* Filtro de fecha */}
            <div className="w-full lg:w-auto flex-1">
              <Label className="text-sm font-semibold text-slate-700">Filtrar por fecha:</Label>
              <div className="flex flex-col sm:flex-row gap-3 mt-2 lg:mt-1">
                <div className="flex gap-1">
                  <Button variant={dateFilter==='createdAt'?'default':'outline'} size="sm" onClick={()=>{setDateFilter('createdAt'); setIsUsingPeriodFilter(false); setActivePeriodFilter('none'); setSelectedBLNumbers([])}} className="text-xs h-8 px-3">Creación</Button>
                  <Button variant={dateFilter==='dateOfInvoice'?'default':'outline'} size="sm" onClick={()=>{setDateFilter('dateOfInvoice'); setIsUsingPeriodFilter(false); setActivePeriodFilter('none'); setSelectedBLNumbers([])}} className="text-xs h-8 px-3">Fecha Invoice</Button>
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
                      <Button variant="ghost" size="sm" onClick={()=>setIsDateFilterModalOpen(true)} className="h-6 w-6 p-0"><Edit className="h-3 w-3"/></Button>
                      <Button variant="ghost" size="sm" onClick={()=>{setIsUsingPeriodFilter(false); setActivePeriodFilter('none'); setStartDate(''); setEndDate('')}} className="h-6 w-6 p-0"><X className="h-3 w-3"/></Button>
                    </div>
                  </div>
                )}
              </div>
            </div>            
            
            <div className="flex flex-row sm:flex-row gap-4 items-start sm:items-center ">
              {/* Resumen de registros */}
              <div className="flex-1 flex justify-end w-full">
                <div className="flex items-center gap-3 bg-gradient-to-r from-slate-100 to-blue-100 border border-slate-300 p-4 rounded-lg shadow-sm w-fit">
                  <div className="p-2 bg-slate-600 rounded-lg">
                    <Calendar className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <span className="text-sm font-semibold text-slate-900">
                      Total de BL Numbers mostrados: {Array.from(groupedByBL.keys()).length}
                    </span>
                  </div>
                  <div className="flex gap-4 text-xs">
                    <div className="bg-white/60 px-3 py-1 rounded-md">
                      <span className="font-medium text-slate-600">Registros:</span>
                      <span className="ml-1 font-bold text-slate-900">{filteredRecords.length}</span>
                    </div>
                    {authFilter !== 'all' && (
                      <div className="bg-white/60 px-3 py-1 rounded-md">
                        <span className="font-medium text-slate-600">Tipo:</span>
                        <span className="ml-1 font-bold text-slate-900">{authFilter}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <Card>
           
            <CardContent className="overflow-auto max-h-[70vh]">
              {/* Buscador */}
              <div className="mb-3 flex items-center gap-3 py-4">
                {/* Filtro por tipo de autoridad */}
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center ">
                  <div className="flex items-center gap-3">
                    <Label className="text-sm font-semibold text-slate-700">Tipo de Autoridad:</Label>
                    <Select value={authFilter} onValueChange={(value: 'all'|'APA'|'QUA') => setAuthFilter(value)}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Seleccionar tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="APA">APA</SelectItem>
                        <SelectItem value="QUA">QUA</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {authFilter !== 'all' && (
                    <div className="flex items-center gap-2">
                      <Badge variant="default" className="bg-green-600 text-white text-xs">
                        Filtrado por: {authFilter}
                      </Badge>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setAuthFilter('all')} 
                        className="h-6 w-6 p-0"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
                <div className="ml-auto w-full max-w-md">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      value={search} 
                      onChange={(e) => setSearch(e.target.value)} 
                      placeholder="Buscar por BL Number, No. Invoice o Ruta..." 
                      className="pl-9" 
                    />
                  </div>
                </div>
              </div>
              {loading ? (
                <div className="p-8 text-center">Cargando…</div>
              ) : Array.from(groupedByBL.keys()).length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">No hay registros cargados.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        <Checkbox
                          checked={paginatedBLNumbers.length > 0 && paginatedBLNumbers.every(bl => selectedBLNumbers.includes(bl))}
                          onCheckedChange={(c: boolean) => {
                            if (c) {
                              // Agregar todos los BL Numbers de la página actual
                              setSelectedBLNumbers(prev => [...new Set([...prev, ...paginatedBLNumbers])])
                            } else {
                              // Remover todos los BL Numbers de la página actual
                              setSelectedBLNumbers(prev => prev.filter(bl => !paginatedBLNumbers.includes(bl)))
                            }
                          }}
                        />
                      </TableHead>
                      <TableHead>BL Number</TableHead>
                      <TableHead>Contenedores</TableHead>
                      <TableHead>Auth</TableHead>
                      <TableHead>No. Invoice</TableHead>
                      <TableHead>RUTA</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedBLNumbers.map((blNumber) => {
                      const groupRecords = groupedByBL.get(blNumber) || []
                      return (
                      <TableRow key={blNumber}>
                        <TableCell>
                          <Checkbox 
                            checked={isSelected(blNumber)} 
                            onCheckedChange={(c: boolean) => toggleBLSelection(blNumber, !!c)} 
                          />
                        </TableCell>
                        <TableCell className="font-mono text-sm">{blNumber}</TableCell>
                        <TableCell>
                          {isExpanded(blNumber) ? (
                            // Vista expandida: mostrar todos los contenedores
                            <div className="space-y-1">
                              {groupRecords.map((record: any, idx: number) => (
                                <Badge key={idx} variant="outline" className="text-xs">
                                  {record.container} - {record.fe || '-'}
                                </Badge>
                              ))}
                              <div className="mt-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => toggleExpansion(blNumber)}
                                  className="text-xs text-blue-600 hover:text-blue-800 p-1 h-auto"
                                >
                                  ▲ Ocultar contenedores
                                </Button>
                              </div>
                            </div>
                          ) : (
                            // Vista compacta: mostrar solo cantidad
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="text-xs">
                                {groupRecords.length} contenedor{groupRecords.length !== 1 ? 'es' : ''}
                              </Badge>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleExpansion(blNumber)}
                                className="text-xs text-blue-600 hover:text-blue-800 p-1 h-auto"
                              >
                                ▼ Mostrar detalles
                              </Button>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>{groupRecords[0]?.auth || '-'}</TableCell>
                        <TableCell>{groupRecords[0]?.noInvoice || '-'}</TableCell>
                        <TableCell>{groupRecords[0]?.ruta || '-'}</TableCell>
                        <TableCell>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => {
                              // Eliminar todos los registros del grupo
                              groupRecords.forEach((record: any) => handleDelete(record._id))
                            }} 
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    )})}
                  </TableBody>
                </Table>
              )}
            </CardContent>
            
            <div className="flex justify-between items-center p-4">
              <div className="text-sm text-muted-foreground">
                Seleccionados: {selectedBLNumbers.length} de {totalBLNumbers.length} BL Numbers | Total: <span className="font-semibold">${selectedRecords.reduce((sum: number, r: any) => sum + (r.totalValue || 0), 0).toFixed(2)}</span>
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
                <Button 
                  onClick={handleNextStep}
                  disabled={selectedRecords.length === 0}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Seguir al Paso 2
                </Button>
              </div>
            </div>
          </Card>
        </>
      )}

      {/* Paso 2: Configuración y vista previa del PDF */}
      {step === 'pdf' && (
        <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl">
          <CardHeader className="bg-gradient-to-r from-slate-700 to-slate-800 text-white rounded-t-lg">
            <CardTitle className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <FileText className="h-6 w-6" />
              </div>
              <div className="text-xl font-bold">Paso 2: Configuración de Prefactura Auth</div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Resumen de selección */}
            <div className="bg-gradient-to-r from-slate-100 to-blue-100 border border-slate-300 p-3 rounded-lg shadow-sm mt-2">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 bg-slate-600 rounded-md text-white">✓</div>
                <h3 className="font-semibold text-slate-900 text-base">Resumen de Selección</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="bg-white/60 p-2 rounded-md">
                  <span className="text-slate-600 font-medium text-xs">BL Numbers:</span>
                  <div className="text-sm font-semibold text-slate-900">{selectedBLNumbers.length}</div>
                </div>
                <div className="bg-white/60 p-2 rounded-md">
                  <span className="text-slate-600 font-medium text-xs">Total Registros:</span>
                  <div className="text-sm font-semibold text-slate-900">{selectedRecords.length}</div>
                </div>
                <div className="bg-white/60 p-2 rounded-md">
                  <span className="text-slate-600 font-medium text-xs">Total Contenedores:</span>
                  <div className="text-sm font-semibold text-slate-900">{selectedRecords.length}</div>
                </div>
              </div>
            </div>

            {/* Configuración y vista previa */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Columna izquierda: Configuración */}
              <div className="lg:col-span-1 space-y-4">
                <div className="bg-gradient-to-br from-slate-50 to-blue-50 p-3 rounded-lg border border-slate-300">
                  <h3 className="text-lg font-bold text-slate-900 border-b border-slate-300 pb-2 mb-2">Configuración del Documento</h3>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="doc-number" className="text-sm font-semibold text-slate-700">Número de Prefactura Auth *</Label>
                      <Input
                        id="doc-number"
                        value={documentData.number}
                        onChange={(e) => {
                          setDocumentData({...documentData, number: e.target.value})
                        }}
                        placeholder="AUTH-00001"
                        className="bg-white border-slate-300 focus:border-slate-500 focus:ring-slate-500"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="doc-notes" className="text-sm font-semibold text-slate-700">Notas (Opcional)</Label>
                      <Textarea
                        id="doc-notes"
                        value={documentData.notes}
                        onChange={(e) => {
                          setDocumentData({...documentData, notes: e.target.value})
                        }}
                        placeholder="Notas adicionales para el documento..."
                        rows={4}
                        className="bg-white border-slate-300 focus:border-slate-500 focus:ring-slate-500"
                      />
                    </div>
                  </div>
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
                      <p className="text-sm">Ingresa el número de documento para ver la vista previa</p>
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-[750px] border border-slate-300 rounded-lg overflow-hidden">
                    <iframe
                      src={pdfPreviewUrl}
                      className="w-full h-full"
                      title="Vista previa del documento"
                    />
                  </div>
                )}
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
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modal de vista previa del PDF */}
      <Dialog open={showPdfPreview} onOpenChange={setShowPdfPreview}>
        <DialogContent className="max-w-6xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              {`Vista Previa - ${documentData.number || 'AUTH'}`}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-[70vh]">
            {modalPdfUrl && (
              <iframe
                src={modalPdfUrl}
                className="w-full h-full min-h-[70vh] border rounded-lg"
                title="Vista previa del documento"
              />
            )}
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setShowPdfPreview(false)}>
              Cerrar
            </Button>
            <Button variant="outline" onClick={handleDownloadPDF}>
              <Download className="h-4 w-4 mr-2" />
              Descargar PDF
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Selección de Fechas Avanzadas */}
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
  );
}