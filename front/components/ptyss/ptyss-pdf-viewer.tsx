import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Eye, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import saveAs from "file-saver";

interface PTYSSPdfViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: any;
  clients: any[];
  allRecords: any[];
}

export function PTYSSPdfViewer({ open, onOpenChange, invoice, clients, allRecords }: PTYSSPdfViewerProps) {
  const { toast } = useToast();
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Helper para obtener el ID correcto
  const getRecordId = (record: any): string => {
    if (!record) return 'unknown';
    return record.id || record._id || 'unknown';
  };

  // Helper para determinar el tipo de registro
  const getRecordType = (record: any): "local" | "trasiego" => {
    const data = record.data as Record<string, any>
    
    if (data.recordType) {
      return data.recordType
    }
    
    // Los registros de trasiego tienen line, matchedPrice y no tienen localRouteId
    if (data.line && data.matchedPrice && !data.localRouteId) {
      return "trasiego"
    }
    
    return "local"
  }

  // Función para generar el PDF (idéntica a la del paso 2 de prefactura)
  const generatePTYSSPrefacturaPDF = (invoiceData: any, selectedRecords: any[], pdfTitle: string) => {
    console.log('🔍 PDF Viewer - Generating PDF')
    console.log('🔍 PDF Viewer - selectedRecords:', selectedRecords)
    console.log('🔍 PDF Viewer - invoiceData:', invoiceData)
    
    const doc = new jsPDF();
    
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
    doc.text(`${pdfTitle} No. ${invoiceData.invoiceNumber}`, 195, 20, { align: 'right' })
    
    // Fecha
    const formatInvoiceDate = (dateString: string) => {
      if (!dateString) return new Date()

      if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [year, month, day] = dateString.split('-').map(Number)
        return new Date(year, month - 1, day)
      }

      if (dateString.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)) {
        const datePart = dateString.split('T')[0]
        const [year, month, day] = datePart.split('-').map(Number)
        return new Date(year, month - 1, day)
      }

      return new Date(dateString)
    }

    const invoiceDate = formatInvoiceDate(invoiceData.issueDate)
    const day = invoiceDate.getDate().toString().padStart(2, '0')
    const month = (invoiceDate.getMonth() + 1).toString().padStart(2, '0')
    const year = invoiceDate.getFullYear()
    
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
    
    // Extraer información del cliente
    const firstRecord = selectedRecords[0]
    if (!firstRecord) {
      console.log('🔍 PDF Viewer - No hay registros seleccionados')
      return doc
    }
    
    const firstRecordData = firstRecord.data as Record<string, any>
    const recordType = getRecordType(firstRecord)
    
    // Para trasiego, siempre es PTG
    let client = null
    if (recordType === 'trasiego') {
      client = clients.find((c: any) => {
        const name = c.name?.toLowerCase().trim() || ''
        const companyName = c.companyName?.toLowerCase().trim() || ''
        const fullName = c.fullName?.toLowerCase().trim() || ''
        return name === 'ptg' || companyName === 'ptg' || fullName === 'ptg'
      })
    } else {
      // Para locales, buscar por clientId
      client = clients.find((c: any) => (c._id || c.id) === firstRecordData?.clientId)
    }
    
    console.log('🔍 PDF Viewer - Cliente encontrado:', client)
    console.log('🔍 PDF Viewer - Tipo de registro:', recordType)
    
    const clientName = client ? (client.type === "natural" ? client.fullName : client.companyName) : invoiceData.clientName || "Cliente PTYSS"
    const clientRuc = client ? (client.type === "natural" ? client.documentNumber : client.ruc) : invoiceData.clientRuc || "N/A"
    const clientAddress = client ? 
      (typeof client.address === "string" ? client.address : `${client.address?.district || ""}, ${client.address?.province || ""}`) 
      : "N/A"
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
    doc.text('QTY', 25, startY + 5)
    doc.text('DESCRIPTION', 60, startY + 5)
    doc.text('PRICE', 140, startY + 5)
    doc.text('TOTAL', 170, startY + 5)
    
    // Generar items de la prefactura agrupados
    const items: string[][] = []
    
    // Agrupar registros por características similares
    const groupedRecords = new Map<string, { records: any[], price: number, count: number }>()
    
    console.log("=== DEBUG PDF Viewer: Agrupando registros ===")
    
    selectedRecords.forEach((record: any, index: number) => {
      const data = record.data as Record<string, any>
      
      console.log(`🔍 DEBUG PDF Viewer - Registro ${index + 1}:`, {
        recordType: data.recordType,
        line: data.line,
        matchedPrice: data.matchedPrice,
        localRouteId: data.localRouteId
      })
      
      // Identificar registros de trasiego
      const isTrasiego = data.line && data.matchedPrice && !data.localRouteId
      
      if (isTrasiego) {
        console.log(`🔍 DEBUG PDF Viewer - Procesando como TRASIEGO`)
        const line = data.line || ''
        const from = data.from || ''
        const to = data.to || ''
        const size = data.size || ''
        const type = data.type || ''
        const route = data.route || ''
        const fe = data.fe ? (data.fe.toString().toUpperCase().trim() === 'F' ? 'FULL' : 'EMPTY') : 'FULL'
        const price = (data.matchedPrice || record.totalValue || 0)
        
        const groupKey = `TRASIEGO|${line}|${from}|${to}|${size}|${type}|${fe}|${route}|${price}`
        
        if (!groupedRecords.has(groupKey)) {
          groupedRecords.set(groupKey, {
            records: [],
            price: price,
            count: 0
          })
        }
        
        const group = groupedRecords.get(groupKey)!
        group.records.push(record)
        group.count += 1
      } else {
        console.log(`🔍 DEBUG PDF Viewer - Procesando como LOCAL`)
        const localRouteId = data.localRouteId || ''
        const localRoutePrice = data.localRoutePrice || 0
        const containerSize = data.containerSize || ''
        const containerType = data.containerType || ''
        const from = data.from || ''
        const to = data.to || ''
        
        const groupKey = `LOCAL|${localRouteId}|${containerSize}|${containerType}|${from}|${to}|${localRoutePrice}`
        
        if (!groupedRecords.has(groupKey)) {
          groupedRecords.set(groupKey, {
            records: [],
            price: localRoutePrice,
            count: 0
          })
        }
        
        const group = groupedRecords.get(groupKey)!
        group.records.push(record)
        group.count += 1
      }
    })

    console.log("Grupos creados:", groupedRecords.size)
    
    // Crear filas agrupadas para el PDF
    Array.from(groupedRecords.entries()).forEach(([groupKey, group]) => {
      const parts = groupKey.split('|')
      const totalPrice = group.price * group.count
      
      let description = ''
      if (parts[0] === 'LOCAL') {
        const [_, localRouteId, containerSize, containerType, from, to, price] = parts
        description = `LOCAL - ${from}/${to}/${containerSize}'${containerType}`
      } else if (parts[0] === 'TRASIEGO') {
        const [_, line, from, to, size, type, fe, route, price] = parts
        description = `${route} - ${from}/${to}/${size}'${type}/${fe} (${line})`
      } else {
        description = `SERVICIO - ${parts.join('/')}`
      }
      
      items.push([
        group.count.toString(),
        description,
        `$${group.price.toFixed(2)}`,
        `$${totalPrice.toFixed(2)}`
      ])
    })
    
    // Agregar servicios adicionales
    const additionalServices = invoiceData.details?.additionalServices || []
    additionalServices.forEach((service: any) => {
      items.push([
        '1',
        service.name,
        `$${service.amount.toFixed(2)}`,
        `$${service.amount.toFixed(2)}`
      ])
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
    
    // Totales
    const tableEndY = (doc as any).lastAutoTable.finalY + 5
    const finalY = tableEndY + 10
    const totalX = 120
    const amountX = 170
    
    doc.setFontSize(14)
    doc.setFont(undefined, 'bold')
    doc.setTextColor(0, 0, 0)
    doc.text('TOTAL:', totalX, finalY)
    doc.text(`$${invoiceData.totalAmount.toFixed(2)}`, amountX, finalY, { align: 'right' })
    
    // Notas adicionales de registros locales y factura/prefactura (trasiego)
    let notesY = finalY + 15
    const pageHeight = doc.internal.pageSize.getHeight()
    
    // Recopilar todas las notas de los registros locales que tienen notas
    const notesFromRecords: string[] = []
    selectedRecords.forEach((record: any) => {
      const data = record.data as Record<string, any>
      // Solo incluir notas de registros locales que tengan notas no vacías
      if (data.recordType === 'local' && data.notes && data.notes.trim() !== '') {
        const note = data.notes.trim()
        // Evitar duplicados
        if (!notesFromRecords.includes(note)) {
          notesFromRecords.push(note)
        }
      }
    })
    
    // Agregar notas de la factura/prefactura (para registros de trasiego) si existen
    if (invoiceData.notes && invoiceData.notes.trim() !== '') {
      const invoiceNote = invoiceData.notes.trim()
      // Evitar duplicados con las notas de registros locales
      if (!notesFromRecords.includes(invoiceNote)) {
        notesFromRecords.push(invoiceNote)
      }
    }
    
    // Mostrar notas si existen
    if (notesFromRecords.length > 0) {
      // Verificar si hay espacio suficiente, si no, agregar nueva página
      if (notesY + (notesFromRecords.length * 10) + 20 > pageHeight) {
        doc.addPage()
        notesY = 20
      }
      
      doc.setFontSize(9)
      doc.setFont(undefined, 'bold')
      doc.text('NOTAS ADICIONALES:', 15, notesY)
      notesY += 5
      
      doc.setFontSize(8)
      doc.setFont(undefined, 'normal')
      notesFromRecords.forEach((note) => {
        // Dividir notas largas en múltiples líneas
        const noteLines = doc.splitTextToSize(note, 180)
        noteLines.forEach((line: string) => {
          if (notesY + 5 > pageHeight) {
            doc.addPage()
            notesY = 20
          }
          doc.text(`• ${line}`, 15, notesY)
          notesY += 4
        })
        notesY += 2 // Espacio entre notas
      })
    }
    
    // Términos y condiciones
    let termsY = notesY + 5
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
  };

  useEffect(() => {
    if (open && invoice) {
      setIsGenerating(true);
      try {
        // Obtener los registros relacionados con esta factura
        const relatedRecords = allRecords.filter((record: any) =>
          invoice.relatedRecordIds.includes(record._id || record.id)
        );
        const pdfTitle = invoice.status === "facturada" ? "FACTURA" : "PREFACTURA";
        const pdf = generatePTYSSPrefacturaPDF(invoice, relatedRecords, pdfTitle);
        setPdfBlob(pdf);
      } catch (error) {
        console.error("Error generando PDF:", error);
        toast({
          title: "Error",
          description: "Error al generar el PDF",
          variant: "destructive"
        });
      } finally {
        setIsGenerating(false);
      }
    }
  }, [open, invoice, clients, allRecords, toast]);

  const handleDownload = () => {
    if (pdfBlob) {
      saveAs(pdfBlob, `${invoice?.invoiceNumber || 'prefactura'}.pdf`);
      toast({
        title: "PDF Descargado",
        description: "El archivo PDF ha sido descargado exitosamente."
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Previsualización de {invoice?.status === "facturada" ? "Factura" : "Prefactura"} - {invoice?.invoiceNumber}
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          {isGenerating ? (
            <div className="flex justify-center items-center p-12">
              <div className="flex items-center gap-3">
                <Loader2 className="h-10 w-10 animate-spin text-slate-600" />
                <span className="text-lg font-medium text-slate-800">Generando PDF...</span>
              </div>
            </div>
          ) : pdfBlob ? (
            <div className="border rounded-md">
              <iframe
                src={URL.createObjectURL(pdfBlob)}
                className="w-full h-[70vh]"
                title="Previsualización de PDF"
              />
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No se pudo generar el PDF
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cerrar
            </Button>
            <Button
              onClick={handleDownload}
              disabled={!pdfBlob}
              className="bg-green-600 hover:bg-green-700"
            >
              <Download className="mr-2 h-4 w-4" /> Descargar PDF
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 