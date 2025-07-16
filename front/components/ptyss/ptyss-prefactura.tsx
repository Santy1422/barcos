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
import { Ship, DollarSign, FileText, Search, Calendar, Clock, Database, Loader2, Download, Eye, ArrowRight, ArrowLeft, CheckCircle, Info, Trash2 } from "lucide-react"
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
  type ExcelRecord as IndividualExcelRecord,
  type InvoiceRecord as PersistedInvoiceRecord
} from "@/lib/features/records/recordsSlice"
import { selectAllClients } from "@/lib/features/clients/clientsSlice"
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
  const [generatedPdf, setGeneratedPdf] = useState<Blob | null>(null)
  const [previewPdf, setPreviewPdf] = useState<Blob | null>(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [selectedRecordForView, setSelectedRecordForView] = useState<IndividualExcelRecord | null>(null)
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false)

  // Cargar registros PTYSS al montar el componente
  useEffect(() => {
    dispatch(fetchPendingRecordsByModule("ptyss"))
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
    doc.setFontSize(12)
    doc.setFont(undefined, 'bold')
    doc.text('PTY SHIP SUPPLIERS, S.A.', 15, 50)
    doc.setFontSize(10)
    doc.setFont(undefined, 'normal')
    doc.text('RUC: 155600922-2-2015 D.V. 69', 15, 55)
    doc.text('PANAMA PACIFICO, INTERNATIONAL BUSINESS PARK', 15, 60)
    doc.text('BUILDING 3855, FLOOR 2', 15, 65)
    doc.text('PANAMA, REPUBLICA DE PANAMA', 15, 70)
    doc.text('T. (507) 838-9806', 15, 75)
    doc.text('C. (507) 6349-1326', 15, 80)
    
    // Información del cliente
    doc.setFontSize(12)
    doc.setFont(undefined, 'bold')
    doc.text('CUSTOMER:', 15, 95)
    doc.setFontSize(10)
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
    
    doc.text(clientName, 15, 100)
    doc.text(`RUC: ${clientRuc}`, 15, 105)
    doc.text(`ADDRESS: ${clientAddress}`, 15, 110)
    doc.text(`TELEPHONE: ${clientPhone}`, 15, 115)
    
    // Tabla de items
    const startY = 130
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
    const tableEndY = (doc as any).lastAutoTable.finalY + 8
    
    doc.setFontSize(9)
    doc.setTextColor(100, 100, 100)
    doc.setFont(undefined, 'bold')
    doc.text('Detalles de Contenedores:', 15, tableEndY)
    
    let containerY = tableEndY + 5
    selectedRecords.forEach((record, index) => {
      const data = record.data as Record<string, any>
      
      doc.setFontSize(8)
      doc.setFont(undefined, 'normal')
      doc.text(`Contenedor ${index + 1}:`, 15, containerY)
      doc.text(`  CTN: ${data.container || 'N/A'}`, 25, containerY + 3)
      doc.text(`  DESDE: ${data.from || 'N/A'}`, 25, containerY + 6)
      doc.text(`  HACIA: ${data.to || 'N/A'}`, 25, containerY + 9)
      doc.text(`  EMBARQUE: ${data.order || 'N/A'}`, 25, containerY + 12)
      
      containerY += 15
    })
    
    // Totales
    const finalY = containerY + 5
    const totalX = 120
    const amountX = 170
    const totalBarWidth = 80
    
    doc.setFontSize(12)
    doc.setFont(undefined, 'bold')
    doc.text('Subtotal:', totalX, finalY)
    doc.text(`$${totalAmount.toFixed(2)}`, amountX, finalY, { align: 'right' })
    
    doc.text('Tax:', totalX, finalY + 6)
    doc.text('$0.00', amountX, finalY + 6, { align: 'right' })
    
    // Total final - barra horizontal
    const totalBarY = finalY + 10
    doc.setFillColor(lightBlue[0], lightBlue[1], lightBlue[2])
    doc.rect(totalX, totalBarY, totalBarWidth, 8, 'F')
    doc.setTextColor(255, 255, 255)
    doc.text('TOTAL', totalX + 5, totalBarY + 5)
    
    // Parte derecha de la barra con el monto - ajustada para alineación
    doc.setTextColor(0, 0, 0)
    doc.setFillColor(173, 216, 230) // light blue background
    doc.rect(amountX - 20, totalBarY, 25, 8, 'F')
    doc.text(`$${totalAmount.toFixed(2)}`, amountX - 5, totalBarY + 5, { align: 'right' })
    
    // Términos y condiciones
    const termsY = finalY + 20
    doc.setFillColor(lightBlue[0], lightBlue[1], lightBlue[2])
    doc.rect(15, termsY, 180, 6, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(10)
    doc.setFont(undefined, 'bold')
    doc.text('TERMS AND CONDITIONS', 20, termsY + 4)
    
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(9)
    doc.setFont(undefined, 'normal')
    doc.text('Make check payments payable to: PTY SHIP SUPPLIERS, S.A.', 15, termsY + 12)
    doc.text('Money transfer to:', 15, termsY + 16)
    doc.text('Banco General', 15, termsY + 20)
    doc.text('Checking Account', 15, termsY + 24)
    doc.text('Account No. 03-72-01-124081-1', 15, termsY + 28)
    
    // Confirmación
    const confirmY = termsY + 35
    doc.setFontSize(10)
    doc.text('I Confirmed that I have received the original prefactura and documents.', 15, confirmY)
    doc.text('Received by: ___________', 15, confirmY + 6)
    doc.text('Date: ___________', 15, confirmY + 12)
    
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
        taxAmount: grandTotal * 0.07,
        totalAmount: grandTotal + (grandTotal * 0.07),
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
      
      dispatch(addInvoice(newPrefactura))
      dispatch(markRecordsAsInvoiced({ 
        recordIds: selectedRecords.map((r: IndividualExcelRecord) => getRecordId(r)), 
        invoiceId: newPrefactura.id 
      }))
      dispatch(fetchPendingRecordsByModule("ptyss"))

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
    <div className="space-y-6">
      {/* Indicador de Pasos */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center space-x-8">
            <div className={`flex items-center space-x-2 ${currentStep >= 1 ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                currentStep >= 1 ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-300'
              }`}>
                {currentStep > 1 ? <CheckCircle className="h-5 w-5" /> : '1'}
              </div>
              <span className="font-medium">Selección de Registros</span>
            </div>
            
            <ArrowRight className="h-6 w-6 text-gray-400" />
            
            <div className={`flex items-center space-x-2 ${currentStep >= 2 ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                currentStep >= 2 ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-300'
              }`}>
                2
              </div>
              <span className="font-medium">Configuración de Prefactura</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Paso 1: Selección de Registros */}
      {currentStep === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Ship className="h-5 w-5" />
                Paso 1: Selección de Registros
                {pendingPTYSSRecords.length > 0 && (
                  <Badge variant="outline" className="ml-2">
                    {pendingPTYSSRecords.length} disponibles
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-4">
                <div className="text-sm text-muted-foreground">
                  {selectedRecordIds.length} de {filteredRecords.length} seleccionados
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedRecordIds([])}
                  disabled={selectedRecordIds.length === 0}
                >
                  Limpiar Selección
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Búsqueda */}
            <div className="mb-4">
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
            <div className="mb-4 bg-blue-50 border border-blue-200 p-3 rounded-md">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">
                  Total de registros en la base de datos: {pendingPTYSSRecords.length}
                </span>
              </div>
              {searchTerm && (
                <div className="mt-2 text-sm text-blue-600">
                  Mostrando {filteredRecords.length} registros filtrados
                </div>
              )}
            </div>

            {isLoadingRecords ? (
              <div className="flex justify-center items-center p-8">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="ml-2">Cargando registros...</span>
              </div>
            ) : filteredRecords.length > 0 ? (
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12 py-2 px-3">
                        <Checkbox
                          checked={isAllSelected}
                          onCheckedChange={handleSelectAll}
                        />
                      </TableHead>
                      <TableHead className="py-2 px-3 text-sm">Contenedor</TableHead>
                      <TableHead className="py-2 px-3 text-sm">Fecha Movimiento</TableHead>
                      <TableHead className="py-2 px-3 text-sm">Cliente</TableHead>
                      <TableHead className="py-2 px-3 text-sm">Orden</TableHead>
                      <TableHead className="py-2 px-3 text-sm">Ruta</TableHead>
                      <TableHead className="py-2 px-3 text-sm">Operación</TableHead>
                      <TableHead className="w-12 py-2 px-3 text-sm">Acciones</TableHead>
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
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewRecord(record)}
                              className="h-8 w-8 p-0"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
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
            <div className="flex justify-end mt-6">
              <Button 
                onClick={handleNextStep}
                disabled={selectedRecords.length === 0}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Continuar al Paso 2
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Paso 2: Configuración de Prefactura */}
      {currentStep === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Paso 2: Configuración de Prefactura
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Resumen de registros seleccionados */}
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-md">
              <h3 className="font-medium text-blue-800 mb-2">Resumen de Registros Seleccionados</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-blue-600 font-medium">Cantidad:</span> {selectedRecords.length} registro{selectedRecords.length !== 1 ? 's' : ''}
                </div>
                <div>
                  <span className="text-blue-600 font-medium">Total:</span> ${totalAmount.toFixed(2)}
                </div>
                <div>
                  <span className="text-blue-600 font-medium">Cliente:</span> {
                    (() => {
                      const firstRecord = selectedRecords[0]
                      const firstRecordData = firstRecord?.data as Record<string, any>
                      const client = clients.find((c: any) => (c._id || c.id) === firstRecordData?.clientId)
                      return client ? (client.type === "natural" ? client.fullName : client.companyName) : "N/A"
                    })()
                  }
                </div>
              </div>
            </div>

            {/* Configuración de la prefactura */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="prefactura-number">Número de Prefactura *</Label>
                  <Input
                    id="prefactura-number"
                    value={prefacturaData.prefacturaNumber}
                    onChange={(e) => setPrefacturaData({...prefacturaData, prefacturaNumber: e.target.value})}
                    placeholder="PTY-PRE-2024-001"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="notes">Notas (Opcional)</Label>
                  <Textarea
                    id="notes"
                    value={prefacturaData.notes}
                    onChange={(e) => setPrefacturaData({...prefacturaData, notes: e.target.value})}
                    placeholder="Notas adicionales para la prefactura..."
                    rows={4}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-md">
                  <h4 className="font-medium text-gray-800 mb-2">Detalles de la Prefactura</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Subtotal Registros:</span>
                      <span className="font-medium">${totalAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Servicios Adicionales:</span>
                      <span className="font-medium">${additionalServicesTotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Subtotal General:</span>
                      <span className="font-medium">${grandTotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Impuestos (7%):</span>
                      <span className="font-medium">${(grandTotal * 0.07).toFixed(2)}</span>
                    </div>
                    <div className="border-t pt-2 flex justify-between font-bold">
                      <span>Total:</span>
                      <span className="text-blue-600">${(grandTotal + (grandTotal * 0.07)).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Servicios Adicionales */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium border-b pb-2">Servicios Adicionales</h3>
              
              {/* Selección de servicios */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-600">Agregar Servicio</Label>
                <div className="flex gap-2">
                  {servicesLoading ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Cargando servicios...
                    </div>
                  ) : (
                    <Select onValueChange={(value) => {
                      const service = additionalServices.find(s => s._id === value)
                      if (service) {
                        handleAddAdditionalService(service)
                      }
                    }}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Seleccionar servicio adicional..." />
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
                {!servicesLoading && additionalServices.length === 0 && (
                  <div className="text-sm text-muted-foreground">
                    No hay servicios adicionales configurados para PTYSS. Ve a Configuración → Servicios Adicionales para agregar servicios.
                  </div>
                )}
              </div>

              {/* Lista de servicios seleccionados */}
              {selectedAdditionalServices.length > 0 && (
                <div className="space-y-3">
                  <Label className="text-sm font-medium text-gray-600">Servicios Seleccionados</Label>
                  {selectedAdditionalServices.map((service) => (
                    <div key={service.serviceId} className="flex items-center gap-3 p-3 border rounded-md">
                      <div className="flex-1">
                        <div className="font-medium text-sm">{service.name}</div>
                        <div className="text-xs text-gray-600">{service.description}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Label className="text-xs">Monto:</Label>
                        <Input
                          type="number"
                          value={service.amount}
                          onChange={(e) => handleUpdateServiceAmount(service.serviceId, parseFloat(e.target.value) || 0)}
                          className="w-24 h-8 text-sm"
                          min="0"
                          step="0.01"
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveAdditionalService(service.serviceId)}
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex justify-end"></div>

            {/* Botones de navegación */}
            <div className="flex justify-between pt-4">
              <Button 
                variant="outline"
                onClick={handlePreviousStep}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver al Paso 1
              </Button>
              
              <div className="flex gap-2">
                <Button 
                  onClick={handlePreviewPDF} 
                  variant="outline"
                  className="border-blue-500 text-blue-600 hover:bg-blue-50"
                  disabled={!prefacturaData.prefacturaNumber}
                >
                  <Eye className="mr-2 h-4 w-4" />
                  Previsualizar
                </Button>
                <Button
                  onClick={handleCreatePrefactura}
                  className="bg-green-600 hover:bg-green-700"
                  disabled={!prefacturaData.prefacturaNumber}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Crear Prefactura
                </Button>
              </div>
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
                    <p className="text-sm font-mono text-xs">{getRecordId(selectedRecordForView)}</p>
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