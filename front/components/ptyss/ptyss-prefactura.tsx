"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Ship, DollarSign, FileText, Search, Calendar, Clock, Database, Loader2, Download, Eye, ArrowRight, ArrowLeft, CheckCircle, Info, Trash2, Plus } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useAppSelector, useAppDispatch } from "@/lib/hooks"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import saveAs from "file-saver"
import { 
  selectPendingRecordsByModuleFromDB,
  selectRecordsLoading,
  fetchPendingRecordsByModule,
  markRecordsAsInvoiced,
  addInvoice,
  createInvoiceAsync,
  deleteRecordAsync,
  type ExcelRecord as IndividualExcelRecord,
  type InvoiceRecord as PersistedInvoiceRecord
} from "@/lib/features/records/recordsSlice"
import { selectAllClients, fetchClients } from "@/lib/features/clients/clientsSlice"
import { selectServicesByModule, fetchServices, selectServicesLoading } from "@/lib/features/services/servicesSlice"

export function PTYSSPrefactura() {
  const dispatch = useAppDispatch()
  const { toast } = useToast()
  
  const pendingPTYSSRecords = useAppSelector((state) =>
    selectPendingRecordsByModuleFromDB(state, "ptyss")
  )
  const isLoadingRecords = useAppSelector(selectRecordsLoading)
  const clients = useAppSelector(selectAllClients)
  const additionalServices = useAppSelector((state) => selectServicesByModule(state, "ptyss"))
  const servicesLoading = useAppSelector(selectServicesLoading)
  
  // Debug: Log registros pendientes
  console.log('🔍 PTYSSPrefactura - pendingPTYSSRecords:', pendingPTYSSRecords)
  console.log('🔍 PTYSSPrefactura - pendingPTYSSRecords.length:', pendingPTYSSRecords.length)
  console.log('🔍 PTYSSPrefactura - isLoadingRecords:', isLoadingRecords)
  
  // Debug: Log services
  console.log('🔍 PTYSSPrefactura - additionalServices:', additionalServices)
  console.log('🔍 PTYSSPrefactura - servicesLoading:', servicesLoading)
  
  // Estado para los pasos
  const [currentStep, setCurrentStep] = useState(1)
  const [selectedRecordIds, setSelectedRecordIds] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [prefacturaData, setPrefacturaData] = useState({
    prefacturaNumber: `PTY-PRE-${Date.now().toString().slice(-5)}`,
    notes: ""
  })
  const [selectedAdditionalServices, setSelectedAdditionalServices] = useState<Array<{
    serviceId: string
    name: string
    description: string
    amount: number
  }>>([])
  const [currentServiceToAdd, setCurrentServiceToAdd] = useState<any>(null)
  const [currentServiceAmount, setCurrentServiceAmount] = useState<number>(0)
  const [generatedPdf, setGeneratedPdf] = useState<Blob | null>(null)
  const [previewPdf, setPreviewPdf] = useState<Blob | null>(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [selectedRecordForView, setSelectedRecordForView] = useState<IndividualExcelRecord | null>(null)
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false)

  // Cargar registros PTYSS al montar el componente
  useEffect(() => {
    dispatch(fetchPendingRecordsByModule("ptyss"))
  }, [dispatch])

  // Cargar clientes al montar el componente
  useEffect(() => {
    dispatch(fetchClients())
  }, [dispatch])

  // Cargar servicios adicionales al montar el componente
  useEffect(() => {
    console.log('🔍 PTYSSPrefactura - Loading services for module: ptyss')
    dispatch(fetchServices("ptyss"))
  }, [dispatch])

  // Función helper para obtener el ID correcto del registro
  const getRecordId = (record: IndividualExcelRecord): string => {
    if (!record) {
      return 'unknown'
    }
    
    return record.id || 'unknown'
  }

  // Filtrar registros por búsqueda
  const filteredRecords = pendingPTYSSRecords.filter((record: IndividualExcelRecord) => {
    const data = record.data as Record<string, any>
    
    // Buscar el cliente por ID
    const client = clients.find((c: any) => (c._id || c.id) === data?.clientId)
    const clientName = client ? (client.type === "natural" ? client.fullName : client.companyName) : ""
    
    const searchableText = [
      data.container || "",
      data.order || "",
      clientName,
      data.moveDate || "",
      getRecordId(record),
    ].filter(Boolean).join(" ").toLowerCase()
    
    return searchTerm === "" || searchableText.includes(searchTerm.toLowerCase())
  })

  // Obtener registros seleccionados
  const selectedRecords = pendingPTYSSRecords.filter((record: IndividualExcelRecord) => 
    selectedRecordIds.includes(getRecordId(record))
  )

  const handleRecordSelection = (recordId: string, checked: boolean) => {
    if (checked) {
      setSelectedRecordIds(prev => [...prev, recordId])
    } else {
      setSelectedRecordIds(prev => prev.filter(id => id !== recordId))
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRecordIds(filteredRecords.map((record: IndividualExcelRecord) => getRecordId(record)))
    } else {
      setSelectedRecordIds([])
    }
  }

  const totalAmount = selectedRecords.reduce((sum: number, record: IndividualExcelRecord) => sum + (record.totalValue || 0), 0)
  const additionalServicesTotal = selectedAdditionalServices.reduce((sum, service) => sum + service.amount, 0)
  const grandTotal = totalAmount + additionalServicesTotal

  // Navegación entre pasos
  const handleNextStep = () => {
    if (selectedRecords.length === 0) {
      toast({
        title: "Error",
        description: "Debes seleccionar al menos un registro para continuar",
        variant: "destructive"
      })
      return
    }
    setCurrentStep(2)
  }

  const handlePreviousStep = () => {
    setCurrentStep(1)
  }

  const handleViewRecord = (record: IndividualExcelRecord) => {
    setSelectedRecordForView(record)
    setIsRecordModalOpen(true)
  }

  const handleDeleteRecord = async (record: IndividualExcelRecord) => {
    const recordId = getRecordId(record)
    
    try {
      await dispatch(deleteRecordAsync(recordId)).unwrap()
      
      toast({
        title: "Registro eliminado",
        description: "El registro ha sido eliminado exitosamente",
      })
      
      // Refrescar los registros pendientes
      dispatch(fetchPendingRecordsByModule("ptyss"))
      
    } catch (error: any) {
      toast({
        title: "Error al eliminar registro",
        description: error.message || "Error al eliminar el registro",
        variant: "destructive"
      })
    }
  }

  const handleAddAdditionalService = (service: any) => {
    const isAlreadySelected = selectedAdditionalServices.some(s => s.serviceId === service._id)
    if (!isAlreadySelected) {
      setSelectedAdditionalServices(prev => [...prev, {
        serviceId: service._id,
        name: service.name,
        description: service.description,
        amount: 0
      }])
    }
  }

  const handleRemoveAdditionalService = (serviceId: string) => {
    setSelectedAdditionalServices(prev => prev.filter(s => s.serviceId !== serviceId))
  }

  const handleUpdateServiceAmount = (serviceId: string, amount: number) => {
    setSelectedAdditionalServices(prev => 
      prev.map(s => s.serviceId === serviceId ? { ...s, amount } : s)
    )
  }

  const handleAddServiceWithAmount = () => {
    if (!currentServiceToAdd || currentServiceAmount <= 0) {
      toast({
        title: "Error",
        description: "Selecciona un servicio y especifica un importe válido",
        variant: "destructive"
      })
      return
    }

    const isAlreadySelected = selectedAdditionalServices.some(s => s.serviceId === currentServiceToAdd._id)
    if (isAlreadySelected) {
      toast({
        title: "Error",
        description: "Este servicio ya ha sido agregado",
        variant: "destructive"
      })
      return
    }

    setSelectedAdditionalServices(prev => [...prev, {
      serviceId: currentServiceToAdd._id,
      name: currentServiceToAdd.name,
      description: currentServiceToAdd.description,
      amount: currentServiceAmount
    }])

    // Limpiar el formulario
    setCurrentServiceToAdd(null)
    setCurrentServiceAmount(0)

    toast({
      title: "Servicio agregado",
      description: `${currentServiceToAdd.name} agregado con importe $${currentServiceAmount.toFixed(2)}`,
    })
  }

  // Función para generar PDF de la prefactura PTYSS
  const generatePTYSSPrefacturaPDF = (prefacturaData: any, selectedRecords: IndividualExcelRecord[]) => {
    const doc = new jsPDF()
    
    // Configuración de colores
    const primaryBlue = [15, 23, 42] // slate-900
    const lightBlue = [59, 130, 246] // blue-500
    const lightGray = [241, 245, 249] // slate-50
    
    // Encabezado con logo
    doc.setFillColor(lightBlue[0], lightBlue[1], lightBlue[2])
    doc.rect(15, 15, 30, 15, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(12)
    doc.setFont(undefined, 'bold')
    doc.text('PTYSS', 30, 25, { align: 'center' })
    
    // Número de prefactura y fecha
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(14)
    doc.setFont(undefined, 'bold')
    doc.text(`PREFACTURA No. ${prefacturaData.prefacturaNumber}`, 195, 20, { align: 'right' })
    
    // Fecha
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
    
    // Información de la empresa (PTY SHIP SUPPLIERS, S.A.)
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
    
    // Información del cliente
    doc.setFontSize(9)
    doc.setFont(undefined, 'bold')
    doc.text('CUSTOMER:', 15, 82)
    doc.setFontSize(8)
    doc.setFont(undefined, 'normal')
    
    // Extraer información del cliente del primer registro
    const firstRecord = selectedRecords[0]
    const firstRecordData = firstRecord?.data as Record<string, any>
    
    // Buscar el cliente por ID
    const client = clients.find((c: any) => (c._id || c.id) === firstRecordData?.clientId)
    
    const clientName = client ? (client.type === "natural" ? client.fullName : client.companyName) : "Cliente PTYSS"
    const clientRuc = client ? (client.type === "natural" ? client.documentNumber : client.ruc) : "N/A"
    const clientAddress = client ? (client.type === "natural" ? 
      (typeof client.address === "string" ? client.address : `${client.address?.district || ""}, ${client.address?.province || ""}`) :
      (typeof client.fiscalAddress === "string" ? client.fiscalAddress : `${client.fiscalAddress?.district || ""}, ${client.fiscalAddress?.province || ""}`)
    ) : "N/A"
    const clientPhone = client?.phone || "N/A"
    
    doc.text(clientName, 15, 86)
    doc.text(`RUC: ${clientRuc}`, 15, 90)
    doc.text(`ADDRESS: ${clientAddress}`, 15, 94)
    doc.text(`TELEPHONE: ${clientPhone}`, 15, 98)
    
    // Tabla de items
    const startY = 115
    const tableWidth = 180
    const tableX = 15
    
    doc.setFillColor(lightBlue[0], lightBlue[1], lightBlue[2])
    doc.rect(tableX, startY, tableWidth, 8, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(10)
    doc.setFont(undefined, 'bold')
    doc.text('ITEM', 25, startY + 5)
    doc.text('DESCRIPTION', 60, startY + 5)
    doc.text('PRICE', 140, startY + 5)
    doc.text('TOTAL', 170, startY + 5)
    
    // Generar items de la prefactura
    const items: string[][] = []
    let itemIndex = 1
    
    selectedRecords.forEach((record, index) => {
      const data = record.data as Record<string, any>
      const recordId = getRecordId(record)
      
      // Item principal - Flete
      items.push([
        itemIndex.toString(),
        'Flete',
        `$${(record.totalValue || 0).toFixed(2)}`,
        `$${(record.totalValue || 0).toFixed(2)}`
      ])
      itemIndex++
      
      // Item adicional - TI (si aplica)
      if (data.ti === 'si') {
        items.push([
          itemIndex.toString(),
          'TI',
          '$10.00',
          '$10.00'
        ])
        itemIndex++
      }
      
      // Item adicional - Gen set (si aplica)
      if (data.genset && data.genset !== '0') {
        items.push([
          itemIndex.toString(),
          'Gen set',
          `$${data.genset}.00`,
          `$${data.genset}.00`
        ])
        itemIndex++
      }
    })
    
    // Agregar servicios adicionales seleccionados
    selectedAdditionalServices.forEach((service) => {
      items.push([
        itemIndex.toString(),
        service.name,
        `$${service.amount.toFixed(2)}`,
        `$${service.amount.toFixed(2)}`
      ])
      itemIndex++
    })
    
    // Crear tabla con autoTable
    autoTable(doc, {
      startY: startY + 10,
      head: [],
      body: items,
      theme: 'plain',
      styles: {
        fontSize: 9,
        cellPadding: 4,
        lineWidth: 0.1,
        lineColor: [200, 200, 200],
      },
      columnStyles: {
        0: { cellWidth: 25, halign: 'center' },
        1: { cellWidth: 80, halign: 'left' },
        2: { cellWidth: 35, halign: 'right' },
        3: { cellWidth: 35, halign: 'right' }
      },
      margin: { left: tableX, right: 15 },
      tableWidth: tableWidth,
      alternateRowStyles: {
        fillColor: [248, 250, 252]
      }
    })
    
    // Información de contenedores después de la tabla
    const tableEndY = (doc as any).lastAutoTable.finalY + 5
    
    doc.setFontSize(8)
    doc.setTextColor(100, 100, 100)
    doc.setFont(undefined, 'bold')
    doc.text('Detalles de Contenedores:', 15, tableEndY)
    
    let containerY = tableEndY + 3
    selectedRecords.forEach((record, index) => {
      const data = record.data as Record<string, any>
      
      doc.setFontSize(7)
      doc.setFont(undefined, 'normal')
      doc.text(`Contenedor ${index + 1}:`, 15, containerY)
      doc.text(`  CTN: ${data.container || 'N/A'}`, 25, containerY + 3)
      doc.text(`  DESDE: ${data.from || 'N/A'}`, 25, containerY + 6)
      doc.text(`  HACIA: ${data.to || 'N/A'}`, 25, containerY + 9)
      doc.text(`  EMBARQUE: ${data.order || 'N/A'}`, 25, containerY + 12)
      
      containerY += 18
    })
    
    // Totales
    const finalY = containerY + 3
    const totalX = 120
    const amountX = 170
    // Mostrar solo el total, sin fondo
    doc.setFontSize(14)
    doc.setFont(undefined, 'bold')
    doc.setTextColor(0, 0, 0)
    doc.text('TOTAL:', totalX, finalY)
    doc.text(`$${totalAmount.toFixed(2)}`, amountX, finalY, { align: 'right' })
    
    // Términos y condiciones
    let termsY = finalY + 15
    const pageHeight = doc.internal.pageSize.getHeight()
    if (termsY + 35 > pageHeight) {
      doc.addPage()
      termsY = 20
    }
    doc.setFillColor(lightBlue[0], lightBlue[1], lightBlue[2])
    doc.rect(15, termsY, 180, 5, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(9)
    doc.setFont(undefined, 'bold')
    doc.text('TERMS AND CONDITIONS', 20, termsY + 3)
    
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(8)
    doc.setFont(undefined, 'normal')
    doc.text('Make check payments payable to: PTY SHIP SUPPLIERS, S.A.', 15, termsY + 10)
    doc.text('Money transfer to: Banco General - Checking Account', 15, termsY + 13)
    doc.text('Account No. 03-72-01-124081-1', 15, termsY + 16)
    
    // Confirmación
    const confirmY = termsY + 22
    doc.setFontSize(8)
    doc.text('I Confirmed that I have received the original prefactura and documents.', 15, confirmY)
    doc.text('Received by: ___________        Date: ___________', 15, confirmY + 4)
    
    return new Blob([doc.output('blob')], { type: 'application/pdf' })
  }

  const handlePreviewPDF = () => {
    if (selectedRecords.length === 0) {
      toast({
        title: "Error",
        description: "Debes seleccionar al menos un registro para previsualizar la prefactura",
        variant: "destructive"
      })
      return
    }

    if (!prefacturaData.prefacturaNumber) {
      toast({
        title: "Error",
        description: "Completa el número de prefactura",
        variant: "destructive"
      })
      return
    }

    try {
      // Generar PDF de previsualización
      const pdfBlob = generatePTYSSPrefacturaPDF(prefacturaData, selectedRecords)
      setPreviewPdf(pdfBlob)
      setIsPreviewOpen(true)
    } catch (error) {
      console.error("Error al generar previsualización:", error)
      toast({
        title: "Error",
        description: "Hubo un problema al generar la previsualización",
        variant: "destructive"
      })
    }
  }

  const handleDownloadPDF = () => {
    if (generatedPdf) {
      saveAs(generatedPdf, `${prefacturaData.prefacturaNumber}.pdf`)
      toast({ 
        title: "PDF Descargado", 
        description: "El archivo PDF ha sido descargado exitosamente." 
      })
    } else {
      toast({ 
        title: "Error", 
        description: "No hay PDF generado para descargar.", 
        variant: "destructive" 
      })
    }
  }

  const handleCreatePrefactura = async () => {
    if (selectedRecords.length === 0) {
      toast({
        title: "Error",
        description: "Debes seleccionar al menos un registro para crear la prefactura",
        variant: "destructive"
      })
      return
    }

    if (!prefacturaData.prefacturaNumber) {
      toast({
        title: "Error",
        description: "Completa el número de prefactura",
        variant: "destructive"
      })
      return
    }

    try {
      // Extraer información del cliente del primer registro
      const firstRecord = selectedRecords[0]
      const firstRecordData = firstRecord?.data as Record<string, any>
      
      // Buscar el cliente por ID
      const client = clients.find((c: any) => (c._id || c.id) === firstRecordData?.clientId)
      
      const clientName = client ? (client.type === "natural" ? client.fullName : client.companyName) : "Cliente PTYSS"
      const clientRuc = client ? (client.type === "natural" ? client.documentNumber : client.ruc) : ""
      const clientAddress = client ? (client.type === "natural" ? 
        (typeof client.address === "string" ? client.address : `${client.address?.district || ""}, ${client.address?.province || ""}`) :
        (typeof client.fiscalAddress === "string" ? client.fiscalAddress : `${client.fiscalAddress?.district || ""}, ${client.fiscalAddress?.province || ""}`)
      ) : ""
      const clientPhone = client?.phone || ""
      
      // Crear la prefactura con los registros seleccionados
      const newPrefactura: PersistedInvoiceRecord = {
        id: `PTY-PRE-${Date.now().toString().slice(-6)}`,
        module: "ptyss",
        invoiceNumber: prefacturaData.prefacturaNumber,
        clientName: clientName,
        clientRuc: clientRuc,
        issueDate: new Date().toISOString().split("T")[0],
        dueDate: new Date().toISOString().split("T")[0],
        currency: "USD",
        subtotal: grandTotal,
        taxAmount: 0,
        totalAmount: grandTotal,
        status: "generada",
        relatedRecordIds: selectedRecords.map((r: IndividualExcelRecord) => getRecordId(r)),
        notes: prefacturaData.notes,
        details: {
          // Detalles específicos de PTYSS
          operationType: "maritime",
          containerCount: selectedRecords.length,
          totalContainers: selectedRecords.length,
          clientAddress: clientAddress,
          clientPhone: clientPhone,
          additionalServices: selectedAdditionalServices,
        },
        createdAt: new Date().toISOString(),
      }
      
      const response = await dispatch(createInvoiceAsync(newPrefactura))

      console.log("Respuesta completa de createInvoiceAsync:", response)
      console.log("response.payload:", response.payload)
      console.log("response.payload?.id:", response.payload?.id)

      if (createInvoiceAsync.fulfilled.match(response)) {
        console.log("✅ createInvoiceAsync fulfilled")
        console.log("ID de la factura creada:", response.payload.id)
        
        console.log("🔍 PTYSSPrefactura - Marcando registros como facturados...")
        console.log("🔍 PTYSSPrefactura - Registros a marcar:", selectedRecords.map((r: IndividualExcelRecord) => getRecordId(r)))
        
        dispatch(markRecordsAsInvoiced({ 
          recordIds: selectedRecords.map((r: IndividualExcelRecord) => getRecordId(r)), 
          invoiceId: response.payload.id 
        }))
        
        console.log("🔍 PTYSSPrefactura - Registros marcados como facturados")
        
        // Esperar un poco antes de refrescar los registros para asegurar que el backend procese la actualización
        setTimeout(() => {
          console.log("🔍 PTYSSPrefactura - Refrescando registros pendientes...")
          dispatch(fetchPendingRecordsByModule("ptyss"))
        }, 100)

        // Usar el PDF de previsualización si existe, sino generar uno nuevo
        if (previewPdf) {
          setGeneratedPdf(previewPdf)
        } else {
          const pdfBlob = generatePTYSSPrefacturaPDF(prefacturaData, selectedRecords)
          setGeneratedPdf(pdfBlob)
        }

        toast({
          title: "Prefactura creada",
          description: `Prefactura ${prefacturaData.prefacturaNumber} creada con ${selectedRecords.length} registros. PDF generado.`,
        })

        // Cerrar previsualización y resetear
        setIsPreviewOpen(false)
        setPreviewPdf(null)

        // Resetear el formulario y volver al paso 1
        setSelectedRecordIds([])
        setPrefacturaData({
          prefacturaNumber: `PTY-PRE-${Date.now().toString().slice(-5)}`,
          notes: ""
        })
        setSelectedAdditionalServices([])
        setCurrentStep(1)
      } else {
        toast({
          title: "Error al crear prefactura",
          description: "Hubo un problema al crear la prefactura en el servidor.",
          variant: "destructive"
        })
        console.error("Error al crear prefactura:", response.error)
      }
    } catch (error) {
      console.error("Error al crear prefactura:", error)
      toast({
        title: "Error",
        description: "Hubo un problema al crear la prefactura",
        variant: "destructive"
      })
    }
  }

  // Función para formatear fecha y hora
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    return {
      date: date.toLocaleDateString('es-ES'),
      time: date.toLocaleTimeString('es-ES', { 
        hour: '2-digit', 
        minute: '2-digit',
        second: '2-digit'
      })
    }
  }

  const isAllSelected = filteredRecords.length > 0 && selectedRecordIds.length === filteredRecords.length
  const isIndeterminate = selectedRecordIds.length > 0 && selectedRecordIds.length < filteredRecords.length

  return (
    <div className="space-y-6 bg-gradient-to-br from-slate-50 to-blue-50 min-h-screen p-6">

      {/* Paso 1: Selección de Registros */}
      {currentStep === 1 && (
        <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl">
          <CardHeader className="bg-gradient-to-r from-slate-700 to-slate-800 text-white rounded-t-lg">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <Ship className="h-6 w-6" />
                </div>
                <div>
                  <div className="text-xl font-bold">Paso 1: Selección de Registros</div>
                  {pendingPTYSSRecords.length > 0 && (
                    <Badge variant="secondary" className="mt-1 bg-white/20 text-white border-white/30">
                      {pendingPTYSSRecords.length} disponibles
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-sm text-slate-200">
                  {selectedRecordIds.length} de {filteredRecords.length} seleccionados
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setSelectedRecordIds([])}
                  disabled={selectedRecordIds.length === 0}
                  className="bg-white/20 hover:bg-white/30 text-white border-white/30"
                >
                  Limpiar Selección
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Búsqueda */}
            <div className="mb-6 mt-4">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Buscar por contenedor, cliente o orden..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            {/* Información del total de registros */}
            <div className="mb-4 bg-gradient-to-r from-slate-100 to-blue-100 border border-slate-300 p-4 rounded-lg shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-600 rounded-lg">
                  <Database className="h-5 w-5 text-white" />
                </div>
                <div>
                  <span className="text-sm font-semibold text-slate-900">
                    Total de registros en la base de datos: {pendingPTYSSRecords.length}
                  </span>
                  {searchTerm && (
                    <div className="mt-1 text-sm text-slate-700">
                      Mostrando {filteredRecords.length} registros filtrados
                    </div>
                  )}
                </div>
              </div>
            </div>

            {isLoadingRecords ? (
              <div className="flex justify-center items-center p-12 bg-gradient-to-r from-slate-50 to-blue-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Loader2 className="h-10 w-10 animate-spin text-slate-600" />
                  <span className="text-lg font-medium text-slate-800">Cargando registros...</span>
                </div>
              </div>
            ) : filteredRecords.length > 0 ? (
              <div className="border border-slate-200 rounded-lg shadow-sm overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gradient-to-r from-slate-50 to-blue-50">
                      <TableHead className="w-12 py-3 px-3 font-semibold text-gray-700">
                        <Checkbox
                          checked={isAllSelected}
                          onCheckedChange={handleSelectAll}
                        />
                      </TableHead>
                      <TableHead className="py-3 px-3 text-sm font-semibold text-gray-700">Contenedor</TableHead>
                      <TableHead className="py-3 px-3 text-sm font-semibold text-gray-700">Fecha Movimiento</TableHead>
                      <TableHead className="py-3 px-3 text-sm font-semibold text-gray-700">Cliente</TableHead>
                      <TableHead className="py-3 px-3 text-sm font-semibold text-gray-700">Orden</TableHead>
                      <TableHead className="py-3 px-3 text-sm font-semibold text-gray-700">Ruta</TableHead>
                      <TableHead className="py-3 px-3 text-sm font-semibold text-gray-700">Operación</TableHead>
                      <TableHead className="w-12 py-3 px-3 text-sm font-semibold text-gray-700">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRecords.map((record: IndividualExcelRecord) => {
                      const data = record.data as Record<string, any>
                      const { date, time } = formatDateTime(record.createdAt)
                      const recordId = getRecordId(record)
                      const isSelected = selectedRecordIds.includes(recordId)
                      
                      return (
                        <TableRow 
                          key={recordId}
                          className={isSelected ? "bg-blue-50" : ""}
                        >
                          <TableCell className="py-2 px-3">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={(checked) => handleRecordSelection(recordId, checked as boolean)}
                            />
                          </TableCell>
                          <TableCell className="font-medium py-2 px-3">
                            <div className="space-y-0.5">
                              <div className="text-sm">{data.container || "N/A"}</div>
                              <div className="text-xs text-muted-foreground">
                                {data.containerSize || "N/A"}' {data.containerType || "N/A"}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="py-2 px-3">
                            <div className="text-sm">
                              {data.moveDate ? new Date(data.moveDate).toLocaleDateString('es-ES') : "N/A"}
                            </div>
                          </TableCell>
                          <TableCell className="py-2 px-3">
                            <div className="text-sm">
                              {(() => {
                                const client = clients.find((c: any) => (c._id || c.id) === data?.clientId)
                                return client ? (client.type === "natural" ? client.fullName : client.companyName) : "N/A"
                              })()}
                            </div>
                          </TableCell>
                          <TableCell className="py-2 px-3 text-sm">{data.order || "N/A"}</TableCell>
                          <TableCell className="py-2 px-3">
                            <div className="space-y-0.5">
                              <div className="font-medium text-sm">{data.from || "N/A"} → {data.to || "N/A"}</div>
                              <div className="text-xs text-muted-foreground">
                                {data.naviera || "N/A"}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="py-2 px-3">
                            <Badge variant={data.operationType === "import" ? "default" : "secondary"} className="text-xs">
                              {data.operationType?.toUpperCase() || "N/A"}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-2 px-3">
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleViewRecord(record)}
                                className="h-8 w-8 p-0"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteRecord(record)}
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                {pendingPTYSSRecords.length === 0 
                  ? "No hay registros PTYSS disponibles para prefacturar"
                  : "No se encontraron registros que coincidan con la búsqueda"
                }
              </div>
            )}

            {/* Botón para continuar al siguiente paso */}
            <div className="flex justify-end mt-8">
              <Button 
                onClick={handleNextStep}
                disabled={selectedRecords.length === 0}
                className="bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white font-semibold px-8 py-3 rounded-lg shadow-lg transform transition-all duration-200 hover:scale-105"
              >
                Continuar al Paso 2
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Paso 2: Configuración de Prefactura */}
      {currentStep === 2 && (
        <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl">
          <CardHeader className="bg-gradient-to-r from-slate-700 to-slate-800 text-white rounded-t-lg">
            <CardTitle className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <FileText className="h-6 w-6" />
              </div>
              <div className="text-xl font-bold">Paso 2: Configuración de Prefactura</div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Resumen de registros seleccionados */}
            <div className="bg-gradient-to-r from-slate-100 to-blue-100 border border-slate-300 p-4 rounded-lg shadow-sm mt-6">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 bg-slate-600 rounded-md">
                  <CheckCircle className="h-4 w-4 text-white" />
                </div>
                <h3 className="font-semibold text-slate-900 text-base">Resumen de Registros Seleccionados</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="bg-white/60 p-2 rounded-md">
                  <span className="text-slate-600 font-medium text-xs">Cantidad:</span> 
                  <div className="text-sm font-semibold text-slate-900">{selectedRecords.length} registro{selectedRecords.length !== 1 ? 's' : ''}</div>
                </div>
                <div className="bg-white/60 p-2 rounded-md">
                  <span className="text-slate-600 font-medium text-xs">Total:</span> 
                  <div className="text-sm font-semibold text-slate-900">${totalAmount.toFixed(2)}</div>
                </div>
                <div className="bg-white/60 p-2 rounded-md">
                  <span className="text-slate-600 font-medium text-xs">Cliente:</span> 
                  <div className="text-sm font-semibold text-slate-900">{
                    (() => {
                      const firstRecord = selectedRecords[0]
                      const firstRecordData = firstRecord?.data as Record<string, any>
                      const client = clients.find((c: any) => (c._id || c.id) === firstRecordData?.clientId)
                      return client ? (client.type === "natural" ? client.fullName : client.companyName) : "N/A"
                    })()
                  }</div>
                </div>
              </div>
            </div>

            {/* Configuración de la prefactura */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-6 bg-gradient-to-br from-slate-50 to-blue-50 p-6 rounded-lg border border-slate-300">
                <div className="space-y-2">
                  <Label htmlFor="prefactura-number" className="text-sm font-semibold text-slate-700">Número de Prefactura *</Label>
                  <Input
                    id="prefactura-number"
                    value={prefacturaData.prefacturaNumber}
                    onChange={(e) => setPrefacturaData({...prefacturaData, prefacturaNumber: e.target.value})}
                    placeholder="PTY-PRE-2024-001"
                    className="bg-white border-slate-300 focus:border-slate-500 focus:ring-slate-500"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="notes" className="text-sm font-semibold text-slate-700">Notas (Opcional)</Label>
                  <Textarea
                    id="notes"
                    value={prefacturaData.notes}
                    onChange={(e) => setPrefacturaData({...prefacturaData, notes: e.target.value})}
                    placeholder="Notas adicionales para la prefactura..."
                    rows={4}
                    className="bg-white border-slate-300 focus:border-slate-500 focus:ring-slate-500"
                  />
                </div>
              </div>

              <div className="space-y-6 bg-gradient-to-br from-slate-50 to-blue-50 p-6 rounded-lg border border-slate-300">
                <h3 className="text-lg font-bold text-slate-900 border-b border-slate-300 pb-2">Servicios Adicionales</h3>
                
                {/* Selección de servicios */}
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-slate-700">Servicio</Label>
                      {servicesLoading ? (
                        <div className="flex items-center gap-2 text-sm text-slate-600 bg-white/60 p-3 rounded-lg">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Cargando servicios...
                        </div>
                      ) : (
                        <Select onValueChange={(value) => {
                          const service = additionalServices.find(s => s._id === value)
                          if (service) {
                            setCurrentServiceToAdd(service)
                          }
                        }}>
                          <SelectTrigger className="bg-white border-slate-300 focus:border-slate-500 focus:ring-slate-500">
                            <SelectValue placeholder="Seleccionar servicio..." />
                          </SelectTrigger>
                          <SelectContent>
                            {additionalServices.length === 0 ? (
                              <div className="p-2 text-sm text-muted-foreground">
                                No hay servicios disponibles
                              </div>
                            ) : (
                              additionalServices
                                .filter(service => !selectedAdditionalServices.some(s => s.serviceId === service._id))
                                .map((service) => (
                                  <SelectItem key={service._id} value={service._id}>
                                    {service.name} - {service.description}
                                  </SelectItem>
                                ))
                            )}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-slate-700">Importe</Label>
                      <Input
                        type="number"
                        value={currentServiceAmount}
                        onChange={(e) => setCurrentServiceAmount(parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                        className="w-full bg-white border-slate-300 focus:border-slate-500 focus:ring-slate-500"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-slate-700">&nbsp;</Label>
                      <Button 
                        onClick={handleAddServiceWithAmount}
                        disabled={!currentServiceToAdd || currentServiceAmount <= 0}
                        className="w-full bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white font-semibold shadow-md"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Agregar Servicio
                      </Button>
                    </div>
                  </div>
                  
                  {!servicesLoading && additionalServices.length === 0 && (
                    <div className="text-sm text-muted-foreground">
                      No hay servicios adicionales configurados para PTYSS. Ve a Configuración → Servicios Adicionales para agregar servicios.
                    </div>
                  )}
                </div>

                {/* Lista de servicios seleccionados */}
                {selectedAdditionalServices.length > 0 && (
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold text-slate-700">Servicios Seleccionados</Label>
                    {selectedAdditionalServices.map((service) => (
                      <div key={service.serviceId} className="flex items-center gap-3 p-4 bg-white/70 border border-slate-200 rounded-lg shadow-sm">
                        <div className="flex-1">
                          <div className="font-semibold text-sm text-slate-900">{service.name}</div>
                          <div className="text-xs text-slate-600">{service.description}</div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-lg font-bold text-slate-900 bg-slate-100 px-3 py-1 rounded-full">${service.amount.toFixed(2)}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveAdditionalService(service.serviceId)}
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

            {/* Detalles de la Prefactura */}
            <div className="bg-gradient-to-r from-slate-100 to-blue-100 border border-slate-300 p-6 rounded-lg shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-slate-600 rounded-lg">
                  <DollarSign className="h-5 w-5 text-white" />
                </div>
                <h4 className="font-bold text-slate-900 text-lg">Detalles de la Prefactura</h4>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center bg-white/60 p-3 rounded-lg">
                  <span className="font-semibold text-slate-800">Subtotal Registros:</span>
                  <span className="font-bold text-lg text-slate-900">${totalAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center bg-white/60 p-3 rounded-lg">
                  <span className="font-semibold text-slate-800">Servicios Adicionales:</span>
                  <span className="font-bold text-lg text-slate-900">${additionalServicesTotal.toFixed(2)}</span>
                </div>
                <div className="border-t-2 border-slate-300 pt-3 flex justify-between items-center bg-gradient-to-r from-slate-200 to-blue-200 p-4 rounded-lg">
                  <span className="font-bold text-lg text-slate-900">Total:</span>
                  <span className="font-bold text-2xl text-slate-900">${grandTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>
            <div className="flex justify-end"></div>

            {/* Botones de navegación */}
            <div className="flex justify-between pt-6">
              <Button 
                variant="outline"
                onClick={handlePreviousStep}
                className="border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold px-6 py-3"
              >
                <ArrowLeft className="mr-2 h-5 w-5" />
                Volver al Paso 1
              </Button>
              
              <Button 
                onClick={handlePreviewPDF} 
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold px-8 py-3 shadow-lg transform transition-all duration-200 hover:scale-105"
                disabled={!prefacturaData.prefacturaNumber}
              >
                <Eye className="mr-2 h-5 w-5" />
                Previsualizar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modal de Detalles del Registro */}
      <Dialog open={isRecordModalOpen} onOpenChange={setIsRecordModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              Detalles del Registro PTYSS
            </DialogTitle>
          </DialogHeader>
          
          {selectedRecordForView && (
            <div className="space-y-6">
              {/* Información del Cliente */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium border-b pb-2">Información del Cliente</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Cliente</Label>
                    <p className="text-sm">
                      {(() => {
                        const data = selectedRecordForView.data as Record<string, any>
                        const client = clients.find((c: any) => (c._id || c.id) === data?.clientId)
                        return client ? (client.type === "natural" ? client.fullName : client.companyName) : "N/A"
                      })()}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Orden</Label>
                    <p className="text-sm">{(selectedRecordForView.data as Record<string, any>).order || "N/A"}</p>
                  </div>
                </div>
              </div>

              {/* Información del Contenedor */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium border-b pb-2">Información del Contenedor</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Contenedor</Label>
                    <p className="text-sm">{(selectedRecordForView.data as Record<string, any>).container || "N/A"}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Tamaño</Label>
                    <p className="text-sm">{(selectedRecordForView.data as Record<string, any>).containerSize || "N/A"}'</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Tipo</Label>
                    <p className="text-sm">{(selectedRecordForView.data as Record<string, any>).containerType || "N/A"}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Naviera</Label>
                    <p className="text-sm">{(selectedRecordForView.data as Record<string, any>).naviera || "N/A"}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">From</Label>
                    <p className="text-sm">{(selectedRecordForView.data as Record<string, any>).from || "N/A"}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">To</Label>
                    <p className="text-sm">{(selectedRecordForView.data as Record<string, any>).to || "N/A"}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Tipo Operación</Label>
                    <p className="text-sm">{(selectedRecordForView.data as Record<string, any>).operationType?.toUpperCase() || "N/A"}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Fecha Movimiento</Label>
                    <p className="text-sm">
                      {(selectedRecordForView.data as Record<string, any>).moveDate 
                        ? new Date((selectedRecordForView.data as Record<string, any>).moveDate).toLocaleDateString('es-ES')
                        : "N/A"
                      }
                    </p>
                  </div>
                </div>
              </div>

              {/* Servicios Adicionales */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium border-b pb-2">Servicios Adicionales</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Estadia</Label>
                    <p className="text-sm">{(selectedRecordForView.data as Record<string, any>).estadia || "N/A"}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Genset</Label>
                    <p className="text-sm">{(selectedRecordForView.data as Record<string, any>).genset || "N/A"}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Retención</Label>
                    <p className="text-sm">{(selectedRecordForView.data as Record<string, any>).retencion || "N/A"}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Pesaje</Label>
                    <p className="text-sm">{(selectedRecordForView.data as Record<string, any>).pesaje || "N/A"}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">TI</Label>
                    <p className="text-sm">{(selectedRecordForView.data as Record<string, any>).ti || "N/A"}</p>
                  </div>
                </div>
              </div>

              {/* Información de Transporte */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium border-b pb-2">Información de Transporte</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Conductor</Label>
                    <p className="text-sm">{(selectedRecordForView.data as Record<string, any>).conductor || "N/A"}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Matrícula del Camión</Label>
                    <p className="text-sm">{(selectedRecordForView.data as Record<string, any>).matriculaCamion || "N/A"}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Número de Chasis/Placa</Label>
                    <p className="text-sm">{(selectedRecordForView.data as Record<string, any>).numeroChasisPlaca || "N/A"}</p>
                  </div>
                </div>
              </div>

              {/* Información del Sistema */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium border-b pb-2">Información del Sistema</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-600">ID del Registro</Label>
                    <p className="text-sm font-mono ">{getRecordId(selectedRecordForView)}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Fecha de Creación</Label>
                    <p className="text-sm">{formatDateTime(selectedRecordForView.createdAt).date}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Hora de Creación</Label>
                    <p className="text-sm">{formatDateTime(selectedRecordForView.createdAt).time}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Valor Total</Label>
                    <p className="text-sm font-bold text-blue-600">${selectedRecordForView.totalValue?.toFixed(2) || "0.00"}</p>
                  </div>
                </div>
              </div>

              {/* Notas */}
              {(selectedRecordForView.data as Record<string, any>).notes && (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium border-b pb-2">Notas</h3>
                  <p className="text-sm bg-gray-50 p-3 rounded-md">
                    {(selectedRecordForView.data as Record<string, any>).notes}
                  </p>
                </div>
              )}
            </div>
          )}
          
          <div className="flex justify-end pt-4">
            <Button
              variant="outline"
              onClick={() => setIsRecordModalOpen(false)}
            >
              Cerrar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Previsualización PDF */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Previsualización de Prefactura - {prefacturaData.prefacturaNumber}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            {previewPdf && (
              <div className="border rounded-md">
                <iframe
                  src={URL.createObjectURL(previewPdf)}
                  className="w-full h-[70vh]"
                  title="Previsualización de Prefactura"
                />
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setIsPreviewOpen(false)}
              >
                Cerrar
              </Button>
              <Button
                onClick={() => {
                  if (previewPdf) {
                    saveAs(previewPdf, `${prefacturaData.prefacturaNumber}-preview.pdf`)
                    toast({ 
                      title: "PDF Descargado", 
                      description: "El archivo PDF de previsualización ha sido descargado." 
                    })
                  }
                }}
                variant="outline"
                className="border-green-500 text-green-600 hover:bg-green-50"
              >
                <Download className="mr-2 h-4 w-4" />
                Descargar Previsualización
              </Button>
              <Button
                onClick={handleCreatePrefactura}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <FileText className="mr-2 h-4 w-4" />
                Crear Prefactura ({selectedRecords.length} registros)
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
} 