"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Ship, DollarSign, FileText, Search, Calendar, Clock, Database, Loader2, Download, Eye } from "lucide-react"
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

export function PTYSSInvoice() {
  const dispatch = useAppDispatch()
  const { toast } = useToast()
  
  const pendingPTYSSRecords = useAppSelector((state) =>
    selectPendingRecordsByModuleFromDB(state, "ptyss")
  )
  const isLoadingRecords = useAppSelector(selectRecordsLoading)
  const clients = useAppSelector(selectAllClients)
  
  const [selectedRecordIds, setSelectedRecordIds] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [invoiceData, setInvoiceData] = useState({
    invoiceNumber: `PTY-${Date.now().toString().slice(-5)}`,
    notes: ""
  })
  const [generatedPdf, setGeneratedPdf] = useState<Blob | null>(null)
  const [previewPdf, setPreviewPdf] = useState<Blob | null>(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)

  // Cargar registros PTYSS al montar el componente
  useEffect(() => {
    dispatch(fetchPendingRecordsByModule("ptyss"))
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
    const searchableText = [
      data.container || "",
      data.order || "",
      data.naviera || "",
      data.from || "",
      data.to || "",
      data.conductor || "",
      data.matriculaCamion || "",
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

  // Función para generar PDF de la factura PTYSS
  const generatePTYSSInvoicePDF = (invoiceData: any, selectedRecords: IndividualExcelRecord[]) => {
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
    
    // Número de factura y fecha
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(14)
    doc.setFont(undefined, 'bold')
    doc.text(`INVOICE No. ${invoiceData.invoiceNumber}`, 195, 20, { align: 'right' })
    
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
    
    // Generar items de la factura
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
    doc.text('I Confirmed that I have received the original invoice and documents.', 15, confirmY)
    doc.text('Received by: ___________', 15, confirmY + 6)
    doc.text('Date: ___________', 15, confirmY + 12)
    
    return new Blob([doc.output('blob')], { type: 'application/pdf' })
  }

  const handlePreviewPDF = () => {
    if (selectedRecords.length === 0) {
      toast({
        title: "Error",
        description: "Debes seleccionar al menos un registro para previsualizar la factura",
        variant: "destructive"
      })
      return
    }

    if (!invoiceData.invoiceNumber) {
      toast({
        title: "Error",
        description: "Completa el número de factura",
        variant: "destructive"
      })
      return
    }

    try {
      // Generar PDF de previsualización
      const pdfBlob = generatePTYSSInvoicePDF(invoiceData, selectedRecords)
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
      saveAs(generatedPdf, `${invoiceData.invoiceNumber}.pdf`)
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

  const handleCreateInvoice = async () => {
    if (selectedRecords.length === 0) {
      toast({
        title: "Error",
        description: "Debes seleccionar al menos un registro para crear la factura",
        variant: "destructive"
      })
      return
    }

    if (!invoiceData.invoiceNumber) {
      toast({
        title: "Error",
        description: "Completa el número de factura",
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
      
      // Crear la factura con los registros seleccionados
      const newInvoice: PersistedInvoiceRecord = {
        id: `PTY-INV-${Date.now().toString().slice(-6)}`,
        module: "ptyss",
        invoiceNumber: invoiceData.invoiceNumber,
        clientName: clientName,
        clientRuc: clientRuc,
        issueDate: new Date().toISOString().split("T")[0],
        dueDate: new Date().toISOString().split("T")[0],
        currency: "USD",
        subtotal: totalAmount,
        taxAmount: totalAmount * 0.07,
        totalAmount: totalAmount + (totalAmount * 0.07),
        status: "generada",
        relatedRecordIds: selectedRecords.map((r: IndividualExcelRecord) => getRecordId(r)),
        notes: invoiceData.notes,
        details: {
          // Detalles específicos de PTYSS
          operationType: "maritime",
          containerCount: selectedRecords.length,
          totalContainers: selectedRecords.length,
          clientAddress: clientAddress,
          clientPhone: clientPhone,
        },
        createdAt: new Date().toISOString(),
      }
      
      dispatch(addInvoice(newInvoice))
      dispatch(markRecordsAsInvoiced({ 
        recordIds: selectedRecords.map((r: IndividualExcelRecord) => getRecordId(r)), 
        invoiceId: newInvoice.id 
      }))
      dispatch(fetchPendingRecordsByModule("ptyss"))

      // Usar el PDF de previsualización si existe, sino generar uno nuevo
      if (previewPdf) {
        setGeneratedPdf(previewPdf)
      } else {
        const pdfBlob = generatePTYSSInvoicePDF(invoiceData, selectedRecords)
        setGeneratedPdf(pdfBlob)
      }

      toast({
        title: "Factura creada",
        description: `Factura ${invoiceData.invoiceNumber} creada con ${selectedRecords.length} registros. PDF generado.`,
      })

      // Cerrar previsualización y resetear
      setIsPreviewOpen(false)
      setPreviewPdf(null)

      // Resetear el formulario
      setSelectedRecordIds([])
      setInvoiceData({
        invoiceNumber: `PTY-${Date.now().toString().slice(-5)}`,
        notes: ""
      })
    } catch (error) {
      console.error("Error al crear factura:", error)
      toast({
        title: "Error",
        description: "Hubo un problema al crear la factura",
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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Crear Factura PTYSS
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="invoice-number">Número de Factura *</Label>
              <Input
                id="invoice-number"
                value={invoiceData.invoiceNumber}
                onChange={(e) => setInvoiceData({...invoiceData, invoiceNumber: e.target.value})}
                placeholder="PTY-2024-001"
              />
            </div>
            <div className="space-y-2">
              <Label>Total Seleccionado</Label>
              <div className="text-2xl font-bold text-blue-600">
                ${totalAmount.toFixed(2)}
              </div>
              <div className="text-sm text-muted-foreground">
                {selectedRecords.length} registro{selectedRecords.length !== 1 ? 's' : ''} seleccionado{selectedRecords.length !== 1 ? 's' : ''}
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notas</Label>
            <Textarea
              id="notes"
              value={invoiceData.notes}
              onChange={(e) => setInvoiceData({...invoiceData, notes: e.target.value})}
              placeholder="Notas adicionales para la factura..."
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Ship className="h-5 w-5" />
              Registros Disponibles
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
                placeholder="Buscar por contenedor, orden, naviera, conductor..."
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
                    <TableHead className="py-2 px-3 text-sm">Ruta</TableHead>
                    <TableHead className="py-2 px-3 text-sm">Operación</TableHead>
                    <TableHead className="py-2 px-3 text-sm">Conductor</TableHead>
                    <TableHead className="py-2 px-3 text-sm">Orden</TableHead>
                    <TableHead className="py-2 px-3 text-sm">Fecha Creación</TableHead>
                    <TableHead className="text-right py-2 px-3 text-sm">Monto</TableHead>
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
                          <div className="space-y-0.5">
                            <div className="text-sm">{data.conductor || "N/A"}</div>
                            <div className="text-xs text-muted-foreground">
                              {data.matriculaCamion || "N/A"}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-2 px-3 text-sm">{data.order || "N/A"}</TableCell>
                        <TableCell className="py-2 px-3">
                          <div className="text-xs space-y-0.5">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {date}
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {time}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium py-2 px-3 text-sm">
                          ${record.totalValue?.toFixed(2) || "0.00"}
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
                ? "No hay registros PTYSS disponibles para facturar"
                : "No se encontraron registros que coincidan con la búsqueda"
              }
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button 
          onClick={handlePreviewPDF} 
          variant="outline"
          className="border-blue-500 text-blue-600 hover:bg-blue-50"
          disabled={selectedRecords.length === 0 || !invoiceData.invoiceNumber}
        >
          <Eye className="mr-2 h-4 w-4" />
          Previsualizar Factura
        </Button>
      </div>

      {/* Modal de Previsualización PDF */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Previsualización de Factura - {invoiceData.invoiceNumber}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            {previewPdf && (
              <div className="border rounded-md">
                <iframe
                  src={URL.createObjectURL(previewPdf)}
                  className="w-full h-[70vh]"
                  title="Previsualización de Factura"
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
                    saveAs(previewPdf, `${invoiceData.invoiceNumber}-preview.pdf`)
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
                onClick={handleCreateInvoice}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <FileText className="mr-2 h-4 w-4" />
                Crear Factura ({selectedRecords.length} registros)
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
} 