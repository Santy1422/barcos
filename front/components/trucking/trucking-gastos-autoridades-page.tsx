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
import { FileText, Download, ArrowLeft, Eye, Loader2, Trash2, Calendar, X, Edit, Search, RefreshCw, User } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { 
  fetchAutoridadesRecords, 
  deleteAutoridadesRecord, 
  selectAutoridadesRecords,
  selectRecordsLoading,
  selectRecordsError,
  createInvoiceAsync,
  updateMultipleAutoridadesStatusAsync,
  type PersistedInvoiceRecord
} from "@/lib/features/records/recordsSlice";
import { selectAllClients, fetchClients } from "@/lib/features/clients/clientsSlice";
import { selectCurrentUser } from "@/lib/features/auth/authSlice";

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
  
  // Estado para crear prefactura
  const [isCreatingPrefactura, setIsCreatingPrefactura] = useState(false)
  
  // Estados para eliminación masiva
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false)
  const [isDeletingBulk, setIsDeletingBulk] = useState(false)
  
  // Redux state
  const records = useAppSelector(selectAutoridadesRecords);
  const loading = useAppSelector(selectRecordsLoading);
  const error = useAppSelector(selectRecordsError);
  const clients = useAppSelector(selectAllClients);
  const currentUser = useAppSelector(selectCurrentUser);
  
  // Verificar si el usuario es administrador
  const userRoles = currentUser?.roles || (currentUser?.role ? [currentUser.role] : [])
  const isAdmin = userRoles.includes('administrador')

  // Logo para PDF
  const [logoBase64, setLogoBase64] = useState<string | undefined>(undefined)

  useEffect(() => {
    dispatch(fetchAutoridadesRecords());
    dispatch(fetchClients());

    // Cargar logo PTG
    fetch('/logos/logo_PTG.png')
      .then(res => res.blob())
      .then(blob => {
        const reader = new FileReader()
        reader.onloadend = () => setLogoBase64(reader.result as string)
        reader.readAsDataURL(blob)
      })
      .catch(() => console.warn("No se pudo cargar el logo PTG"))
  }, [dispatch]);

  // Recargar cuando la ventana recupera el foco (útil al volver de trucking-records)
  useEffect(() => {
    const handleFocus = () => {
      dispatch(fetchAutoridadesRecords());
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [dispatch]);

  // Filtrar registros por fecha, autoridad y búsqueda antes de agrupar
  const filteredRecords = useMemo(() => {
    let filtered = [...records]
    
    // Filtro principal: solo mostrar registros que NO estén prefacturados ni facturados
    filtered = filtered.filter((record: any) => {
      const status = (record.status || '').toLowerCase()
      return status !== 'prefacturado' && status !== 'facturado'
    })
    
    // Filtro por búsqueda
    if (search.trim()) {
      const searchTerm = search.toLowerCase()
      filtered = filtered.filter((record: any) => {
        const blNumber = (record.blNumber || '').toLowerCase().includes(searchTerm)
        const noInvoice = (record.noInvoice || '').toLowerCase().includes(searchTerm)
        const ruta = (record.ruta || '').toLowerCase().includes(searchTerm)
        const customer = (record.customer || '').toLowerCase().includes(searchTerm)
        return blNumber || noInvoice || ruta || customer
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

  // Calcular total seleccionado (replicando lógica del PDF)
  const totalSelected = useMemo(() => {
    let total = 0
    selectedBLNumbers.forEach(blNumber => {
      const groupRecords = groupedByBL.get(blNumber) || []
      
      // NOTF: se cobra una vez por BL Number (del registro con el número de order más bajo que tenga notf válido)
      // Primero intentar encontrar el registro con order más bajo que tenga notf válido
      let notfRecord = groupRecords
        .filter(r => {
          // Verificar que tenga order válido Y notf válido
          const hasValidOrder = r.order && !isNaN(parseFloat(r.order))
          if (!hasValidOrder) return false
          
          // Verificar que tenga notf válido
          const notfStr = r.notf ? String(r.notf).trim() : ''
          if (!notfStr || notfStr === 'N/A' || notfStr === '') return false
          const parsed = parseFloat(notfStr)
          return !isNaN(parsed) && parsed > 0
        })
        .sort((a, b) => parseFloat(a.order) - parseFloat(b.order))[0]
      
      // Si no se encontró con order válido, buscar cualquier registro con notf válido
      if (!notfRecord) {
        notfRecord = groupRecords.find(r => {
          const notfStr = r.notf ? String(r.notf).trim() : ''
          if (!notfStr || notfStr === 'N/A' || notfStr === '') return false
          const parsed = parseFloat(notfStr)
          return !isNaN(parsed) && parsed > 0
        })
      }
      
      // Mejorar parseo de notf: manejar "N/A", cadenas vacías, y valores no numéricos
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
      
      // SEAL: se cobra por cada contenedor que tenga valor en seal
      const sealTotal = groupRecords.reduce((sum, r) => {
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

  // Funciones para manejo de clientes (similar a trucking-prefactura)
  const normalizeName = (s: string) => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '').trim()
  
  const getClient = (name: string) => {
    const target = normalizeName(name)
    return clients.find((c: any) => {
      const n = c.type === 'juridico' ? (c.companyName || '') : (c.fullName || '')
      return normalizeName(n) === target
    })
  }

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
      // Remover el BL Number de la selección si ya no tiene registros
      dispatch(fetchAutoridadesRecords());
    } catch (e: any) {
      toast({ title: "Error al eliminar", description: e.message, variant: "destructive" });
    }
  };

  const handleDeleteSelectedRecords = async () => {
    if (selectedBLNumbers.length === 0) return
    
    // Verificación de seguridad: solo administradores pueden eliminar múltiples registros
    if (!isAdmin) {
      toast({ 
        title: "Sin permisos", 
        description: "Solo los administradores pueden eliminar múltiples registros", 
        variant: "destructive" 
      })
      setShowBulkDeleteDialog(false)
      return
    }
    
    setIsDeletingBulk(true)
    let successCount = 0
    let errorCount = 0
    
    // Guardar valores antes de limpiar la selección
    const blNumbersCount = selectedBLNumbers.length
    const recordsCount = selectedRecords.length
    
    try {
      // Obtener todos los registros de los BL Numbers seleccionados
      const recordsToDelete: any[] = []
      selectedBLNumbers.forEach(blNumber => {
        const groupRecords = groupedByBL.get(blNumber) || []
        recordsToDelete.push(...groupRecords)
      })
      
      // Eliminar todos los registros
      for (const record of recordsToDelete) {
        try {
          await dispatch(deleteAutoridadesRecord(record._id || record.id)).unwrap()
          successCount++
        } catch (error: any) {
          console.error(`Error eliminando registro ${record._id || record.id}:`, error)
          errorCount++
        }
      }
      
      // Limpiar selección
      setSelectedBLNumbers([])
      
      // Recargar datos
      dispatch(fetchAutoridadesRecords())
      
      // Mostrar resultado
      if (successCount > 0 && errorCount === 0) {
        toast({ 
          title: "Registros eliminados", 
          description: `${successCount} registro${successCount !== 1 ? 's' : ''} eliminado${successCount !== 1 ? 's' : ''} exitosamente de ${blNumbersCount} BL Number${blNumbersCount !== 1 ? 's' : ''}` 
        })
      } else if (successCount > 0 && errorCount > 0) {
        toast({ 
          title: "Eliminación parcial", 
          description: `${successCount} eliminado${successCount !== 1 ? 's' : ''}, ${errorCount} error${errorCount !== 1 ? 'es' : ''}`,
          variant: "destructive"
        })
      } else {
        toast({ 
          title: "Error al eliminar registros", 
          description: `No se pudieron eliminar los ${errorCount} registro${errorCount !== 1 ? 's' : ''}`,
          variant: "destructive"
        })
      }
      
      setShowBulkDeleteDialog(false)
    } catch (error: any) {
      toast({ 
        title: "Error", 
        description: error?.message || "Ocurrió un error al eliminar los registros", 
        variant: "destructive" 
      })
    } finally {
      setIsDeletingBulk(false)
    }
  }

  // Generar PDF de gastos de autoridades
  const generateAutoridadesPdf = () => {
    if (selectedRecords.length === 0) return null

    const doc = new jsPDF()

    // Logo de la empresa
    const lightBlue = [59, 130, 246]
    if (logoBase64) {
      doc.addImage(logoBase64, 'PNG', 15, 12, 35, 18)
    } else {
      doc.setFillColor(lightBlue[0], lightBlue[1], lightBlue[2])
      doc.rect(15, 15, 30, 15, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(14)
      doc.setFont(undefined, 'bold')
      doc.text('PTG', 30, 23, { align: 'center', baseline: 'middle' })
    }

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

    // Información empresa (PTG)
    doc.setFontSize(9)
    doc.setFont(undefined, 'bold')
    const issuerName = 'PTG'
    doc.text(issuerName, 15, 50)
    doc.setFontSize(8)
    doc.setFont(undefined, 'normal')
    doc.text('RUC: 2207749-1-774410 DV 10', 15, 54)
    doc.text('Howard, Panama Pacifico', 15, 58)
    doc.text('TEL: (507) 838-7470', 15, 62)

    // Cliente
    doc.setFontSize(9)
    doc.setFont(undefined, 'bold')
    doc.text('CUSTOMER:', 15, 82)
    doc.setFontSize(8)
    doc.setFont(undefined, 'normal')
    
    // Obtener el primer cliente de los registros seleccionados
    const firstRecord = selectedRecords[0]
    const customerName = firstRecord?.customer || 'Cliente'
    
    // Intentar obtener cliente por clientId primero, luego por nombre como fallback
    let customer = null
    if (firstRecord?.clientId) {
      // Buscar cliente por ID en la lista de clientes
      customer = clients.find((c: any) => (c._id || c.id) === firstRecord.clientId)
    }
    
    // Si no se encontró por ID, buscar por nombre
    if (!customer) {
      customer = getClient(customerName)
    }
    
    const clientDisplay = customer
      ? (customer.type === 'natural' ? customer.fullName : customer.companyName)
      : customerName
    const ruc = customer?.ruc || customer?.documentNumber || 'N/A'
    const sap = customer?.sapCode || ''
    const address = customer?.address
      ? (typeof customer.address === 'string' ? customer.address : `${customer.address?.district || ''}, ${customer.address?.province || ''}`)
      : 'N/A'
    const phone = customer?.phone || 'N/A'
    
    doc.text(clientDisplay, 15, 86)
    doc.text(`RUC: ${ruc}`, 15, 90)
    if (sap) doc.text(`SAP: ${sap}`, 60, 90)
    doc.text(`ADDRESS: ${address}`, 15, 94)
    doc.text(`TELEPHONE: ${phone}`, 15, 98)

    // Encabezado de tabla
    const startY = 115
    const tableWidth = 180
    const tableX = 15
    doc.setFillColor(lightBlue[0], lightBlue[1], lightBlue[2])
    doc.rect(tableX, startY, tableWidth, 8, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(10)
    doc.setFont(undefined, 'bold')
    doc.text('BL NUMBER', 15, startY + 5)
    doc.text('CLIENT', 45, startY + 5)
    doc.text('CONTAINERS', 75, startY + 5)
    doc.text('AUTH', 105, startY + 5)
    doc.text('PRICE', 130, startY + 5)
    doc.text('TOTAL', 170, startY + 5)

    // Crear filas agrupadas por BL Number con pricing
    const bodyRows: any[] = []
    let grandTotal = 0
    
    selectedBLNumbers.forEach(blNumber => {
      const groupRecords = groupedByBL.get(blNumber) || []
      const containers = groupRecords.map(r => r.container).join(', ')
      const auth = groupRecords[0]?.auth || ''
      
      // NOTF: se cobra una vez por BL Number (del registro con el número de order más bajo que tenga notf válido)
      // Primero intentar encontrar el registro con order más bajo que tenga notf válido
      let notfRecord = groupRecords
        .filter(r => {
          // Verificar que tenga order válido Y notf válido
          const hasValidOrder = r.order && !isNaN(parseFloat(r.order))
          if (!hasValidOrder) return false
          
          // Verificar que tenga notf válido
          const notfStr = r.notf ? String(r.notf).trim() : ''
          if (!notfStr || notfStr === 'N/A' || notfStr === '') return false
          const parsed = parseFloat(notfStr)
          return !isNaN(parsed) && parsed > 0
        })
        .sort((a, b) => parseFloat(a.order) - parseFloat(b.order))[0]
      
      // Si no se encontró con order válido, buscar cualquier registro con notf válido
      if (!notfRecord) {
        notfRecord = groupRecords.find(r => {
          const notfStr = r.notf ? String(r.notf).trim() : ''
          if (!notfStr || notfStr === 'N/A' || notfStr === '') return false
          const parsed = parseFloat(notfStr)
          return !isNaN(parsed) && parsed > 0
        })
      }
      
      // Mejorar parseo de notf: manejar "N/A", cadenas vacías, y valores no numéricos
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
      
      // SEAL: se cobra por cada contenedor que tenga valor en seal
      const sealTotal = groupRecords.reduce((sum, r) => {
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
      
      // Total para este BL Number
      const blTotal = notfValue + sealTotal
      grandTotal += blTotal
      
      // Descripción del precio
      const priceDescription = []
      if (notfValue > 0) priceDescription.push(`NOTF: $${notfValue.toFixed(2)}`)
      if (sealTotal > 0) priceDescription.push(`SEAL: $${sealTotal.toFixed(2)} (${groupRecords.filter(r => r.seal && parseFloat(r.seal) > 0).length} containers)`)
      
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
        0: { cellWidth: 30 }, // BL NUMBER
        1: { cellWidth: 30 }, // CLIENT
        2: { cellWidth: 40 }, // CONTAINERS
        3: { cellWidth: 20 }, // AUTH
        4: { cellWidth: 40 }, // PRICE
        5: { cellWidth: 20, halign: 'right' } // TOTAL
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
      y += 10
    }

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
    doc.text(`Make check payments payable to: ${issuerName}`, 15, y)
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

  // Crear prefactura auth (similar a trucking-prefactura)
  const handleCreatePrefactura = async () => {
    if (selectedRecords.length === 0) {
      toast({ title: "Error", description: "Debes seleccionar al menos un BL para crear la prefactura", variant: "destructive" })
      return
    }
    if (!documentData.number) {
      toast({ title: "Error", description: "Completa el número de prefactura", variant: "destructive" })
      return
    }
    
    setIsCreatingPrefactura(true)
    
    try {
      // Obtener el cliente del primer registro seleccionado
      const firstRecord = selectedRecords[0]
      const customerName = firstRecord?.customer || 'Cliente'
      
      // Intentar obtener cliente por clientId primero, luego por nombre como fallback
      let customer = null
      if (firstRecord?.clientId) {
        // Buscar cliente por ID en la lista de clientes
        customer = clients.find((c: any) => (c._id || c.id) === firstRecord.clientId)
      }
      
      // Si no se encontró por ID, buscar por nombre
      if (!customer) {
        customer = getClient(customerName)
      }
      
      if (!customer) {
        toast({ title: "Error", description: `No se encontró el cliente "${customerName}" asociado a los registros seleccionados`, variant: "destructive" })
        return
      }
      
      const displayName = customer.type === 'natural' ? customer.fullName : customer.companyName
      const displayRuc = customer.type === 'natural' ? customer.documentNumber : customer.ruc
      const address = customer.type === 'natural'
        ? (typeof customer.address === 'string' ? customer.address : `${customer.address?.district || ''}, ${customer.address?.province || ''}`)
        : (typeof (customer as any).fiscalAddress === 'string' ? (customer as any).fiscalAddress : `${(customer as any).fiscalAddress?.district || ''}, ${(customer as any).fiscalAddress?.province || ''}`)

      const newPrefactura: PersistedInvoiceRecord = {
        id: `AUTH-PRE-${Date.now().toString().slice(-6)}`,
        module: 'trucking',
        invoiceNumber: documentData.number,
        clientName: displayName || customerName,
        clientRuc: displayRuc || '',
        clientSapNumber: customer.sapCode || '',
        issueDate: new Date().toISOString().split('T')[0],
        dueDate: new Date().toISOString().split('T')[0],
        currency: 'USD',
        subtotal: totalSelected,
        taxAmount: 0,
        totalAmount: totalSelected,
        status: 'prefactura',
        xmlData: '',
        relatedRecordIds: selectedRecords.map((r: any) => r._id || r.id),
        notes: documentData.notes,
        details: {
          clientAddress: address,
          clientPhone: customer.phone || '',
          documentType: 'gastos-autoridades',
          selectedBLNumbers: selectedBLNumbers,
        },
        createdAt: new Date().toISOString(),
      }

      const response = await dispatch(createInvoiceAsync(newPrefactura))
      if (createInvoiceAsync.fulfilled.match(response)) {
        const createdId = response.payload.id
        await dispatch(updateMultipleAutoridadesStatusAsync({
          recordIds: selectedRecords.map((r: any) => r._id || r.id),
          status: 'prefacturado',
          invoiceId: createdId,
        })).unwrap()

        // Refrescar y resetear
        dispatch(fetchAutoridadesRecords())
        setSelectedBLNumbers([])
        setDocumentData({ number: `AUTH-${Date.now().toString().slice(-5)}`, notes: '' })
        setStep('select')

        toast({ title: 'Prefactura Auth creada', description: `Prefactura ${newPrefactura.invoiceNumber} creada con ${selectedBLNumbers.length} BL Numbers.` })
      } else {
        toast({ title: 'Error', description: 'No se pudo crear la prefactura', variant: 'destructive' })
      }
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "No se pudo crear la prefactura", variant: "destructive" })
    } finally {
      setIsCreatingPrefactura(false)
    }
  }

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
              <Button 
                variant="outline" 
                onClick={() => {
                  dispatch(fetchAutoridadesRecords())
                  toast({ title: "Refrescando datos", description: "Actualizando registros de autoridades..." })
                }} 
                className="bg-white/10 hover:bg-white/20 border-white/30 text-white"
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refrescar
              </Button>
              <Button variant="outline" disabled={selectedBLNumbers.length === 0} onClick={clearSelection} className="bg-white/10 hover:bg-white/20 border-white/30 text-white">
                Limpiar Selección
              </Button>
              {isAdmin && (
                <Button 
                  variant="destructive" 
                  disabled={selectedBLNumbers.length === 0} 
                  onClick={() => setShowBulkDeleteDialog(true)} 
                  className="bg-red-600/90 hover:bg-red-700/90 border-red-500/50 text-white"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Eliminar Seleccionados ({selectedBLNumbers.length})
                </Button>
              )}
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
                      placeholder="Buscar por BL Number, No. Invoice, Ruta o Cliente..." 
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
                          checked={totalBLNumbers.length > 0 && totalBLNumbers.every(bl => selectedBLNumbers.includes(bl))}
                          onCheckedChange={(c: boolean) => {
                            if (c) {
                              // Agregar todos los BL Numbers disponibles (no solo los de la página actual)
                              setSelectedBLNumbers([...totalBLNumbers])
                            } else {
                              // Deseleccionar todos los BL Numbers
                              setSelectedBLNumbers([])
                            }
                          }}
                        />
                      </TableHead>
                      <TableHead>BL Number</TableHead>
                      <TableHead>Cliente</TableHead>
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
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">
                              {groupRecords[0]?.customer || 'N/A'}
                            </span>
                          </div>
                        </TableCell>
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
                Seleccionados: {selectedBLNumbers.length} de {totalBLNumbers.length} BL Numbers | Total: <span className="font-semibold">${totalSelected.toFixed(2)}</span>
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
                  <span className="text-slate-600 font-medium text-xs">Total:</span>
                  <div className="text-sm font-semibold text-slate-900">${totalSelected.toFixed(2)}</div>
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
                
                <Button 
                  onClick={handleCreatePrefactura}
                  className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold px-8 py-3 shadow-lg transform transition-all duration-200 hover:scale-105"
                  disabled={!documentData.number || selectedRecords.length === 0 || isCreatingPrefactura}
                >
                  {isCreatingPrefactura ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Creando Prefactura Auth...
                    </>
                  ) : (
                    <>
                      <FileText className="mr-2 h-5 w-5" />
                      Crear Prefactura Auth
                    </>
                  )}
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
            <Button 
              onClick={handleCreatePrefactura}
              className="bg-blue-600 hover:bg-blue-700 text-white"
              disabled={!documentData.number || selectedRecords.length === 0 || isCreatingPrefactura}
            >
              {isCreatingPrefactura ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creando...
                </>
              ) : (
                `Crear Prefactura Auth (${selectedBLNumbers.length} BL${selectedBLNumbers.length !== 1 ? 's' : ''})`
              )}
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

        {/* Dialog de confirmación para eliminación múltiple */}
        <Dialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmar eliminación múltiple</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-sm text-muted-foreground mb-4">
                ¿Estás seguro de que deseas eliminar todos los registros de <span className="font-bold text-destructive">{selectedBLNumbers.length} BL Number{selectedBLNumbers.length !== 1 ? 's' : ''}</span> seleccionado{selectedBLNumbers.length !== 1 ? 's' : ''}?
              </p>
              <p className="text-sm font-semibold text-destructive mb-4">
                Esta acción eliminará <span className="font-bold">{selectedRecords.length} registro{selectedRecords.length !== 1 ? 's' : ''}</span> y no se puede deshacer.
              </p>
              {selectedBLNumbers.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-xs font-medium text-slate-600 mb-2">BL Numbers que serán eliminados:</p>
                  <div className="max-h-48 overflow-y-auto space-y-1 bg-slate-50 p-3 rounded-md">
                    {selectedBLNumbers.slice(0, 5).map((blNumber) => {
                      const groupRecords = groupedByBL.get(blNumber) || []
                      const customerName = groupRecords[0]?.customer || 'N/A'
                      return (
                        <div key={blNumber} className="text-xs text-slate-700 flex items-center gap-2">
                          <span className="font-mono font-semibold">{blNumber}</span>
                          <span className="text-slate-500">-</span>
                          <span className="truncate">{customerName}</span>
                          <span className="text-slate-400">({groupRecords.length} registro{groupRecords.length !== 1 ? 's' : ''})</span>
                        </div>
                      )
                    })}
                    {selectedBLNumbers.length > 5 && (
                      <div className="text-xs text-slate-500 italic">
                        ...y {selectedBLNumbers.length - 5} BL Number{selectedBLNumbers.length - 5 !== 1 ? 's' : ''} más
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button 
                variant="outline" 
                onClick={() => setShowBulkDeleteDialog(false)}
                disabled={isDeletingBulk}
              >
                Cancelar
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleDeleteSelectedRecords}
                disabled={isDeletingBulk}
              >
                {isDeletingBulk ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Eliminando...
                  </>
                ) : (
                  <>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Eliminar {selectedRecords.length} Registro{selectedRecords.length !== 1 ? 's' : ''}
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
    </div>
  );
}