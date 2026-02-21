import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Eye, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import saveAs from "file-saver";

interface ShipChandlerPdfViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: any;
  clients: any[];
  allRecords: any[];
}

export function ShipChandlerPdfViewer({ open, onOpenChange, invoice, clients, allRecords }: ShipChandlerPdfViewerProps) {
  const { toast } = useToast();
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Función para generar el PDF (basada en la lógica de ShipChandler prefactura)
  const generateShipChandlerPDF = (invoiceData: any, selectedRecords: any[], pdfTitle: string, logoBase64?: string) => {
    if (selectedRecords.length === 0) {
      return new Blob([], { type: 'application/pdf' })
    }

    const first = selectedRecords[0]
    const firstData = first?.data || {}
    
    // Obtener cliente
    const clientName = invoiceData.clientName || "Cliente"
    const client = clients.find((c: any) => {
      const companyName = (c.companyName || '').toLowerCase().trim()
      const fullName = (c.fullName || '').toLowerCase().trim()
      const searchName = clientName.toLowerCase().trim()
      return companyName === searchName || fullName === searchName
    })

    // Obtener todos los vessels únicos de los registros seleccionados
    const vessels = Array.from(new Set(
      selectedRecords
        .map((rec: any) => (rec?.data?.vessel || '').toString().trim())
        .filter((v: string) => v.length > 0)
    ))
    const vesselDisplay = vessels.length > 0 ? vessels.join(', ') : 'N/A'

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
      doc.text('SCH', 30, 23, { align: 'center', baseline: 'middle' })
    }

    // Número de factura/prefactura y fecha
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(14)
    doc.setFont(undefined, 'bold')
    doc.text(`${pdfTitle} No. ${invoiceData.invoiceNumber}`, 195, 20, { align: 'right' })

    // Función para obtener la fecha del primer registro relacionado
    const getDateFromFirstRecord = (records: any[]): Date | null => {
      if (!records || records.length === 0) {
        return null
      }

      const firstRecord = records[0]
      const data = firstRecord?.data || {}
      let recordDate = data?.date

      if (!recordDate) {
        return null
      }

      // Si es string, limpiar espacios y caracteres especiales
      if (typeof recordDate === 'string') {
        recordDate = recordDate.trim()
      }

      // Si es string en formato DD-MM-YYYY (incluyendo variantes con espacios)
      if (typeof recordDate === 'string' && recordDate.match(/^\d{1,2}-\d{1,2}-\d{4}$/)) {
        const parts = recordDate.split('-')
        if (parts.length === 3) {
          const [part1, part2, year] = parts.map(Number)
          // Si el primer número es > 12, es DD-MM-YYYY
          if (part1 > 12) {
            return new Date(year, part2 - 1, part1)
          }
          // Si el segundo número es > 12, es MM-DD-YYYY
          if (part2 > 12) {
            return new Date(year, part1 - 1, part2)
          }
          // Asumir DD-MM-YYYY por defecto (formato europeo/latinoamericano)
          return new Date(year, part2 - 1, part1)
        }
      }

      // Si es string en formato YYYY-MM-DD
      if (typeof recordDate === 'string' && recordDate.match(/^\d{4}-\d{1,2}-\d{1,2}$/)) {
        const [year, month, day] = recordDate.split('-').map(Number)
        // Validar que el año sea razonable (entre 1900 y 2100)
        if (year >= 1900 && year <= 2100) {
          return new Date(year, month - 1, day)
        }
      }

      // Si es string en formato ISO con T
      if (typeof recordDate === 'string' && recordDate.includes('T')) {
        const datePart = recordDate.split('T')[0]
        if (datePart.match(/^\d{4}-\d{1,2}-\d{1,2}$/)) {
          const [year, month, day] = datePart.split('-').map(Number)
          if (year >= 1900 && year <= 2100) {
            return new Date(year, month - 1, day)
          }
        }
      }

      // Si es string con formato DD/MM/YYYY
      if (typeof recordDate === 'string' && recordDate.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
        const parts = recordDate.split('/')
        if (parts.length === 3) {
          const [part1, part2, year] = parts.map(Number)
          // Si el primer número es > 12, es DD/MM/YYYY
          if (part1 > 12) {
            return new Date(year, part2 - 1, part1)
          }
          // Asumir DD/MM/YYYY por defecto
          return new Date(year, part2 - 1, part1)
        }
      }

      // Si es número (serie de Excel) - solo valores razonables (1 a 100000)
      if (typeof recordDate === 'number' && recordDate > 0 && recordDate < 100000) {
        const excelEpoch = new Date(1900, 0, 1)
        const millisecondsPerDay = 24 * 60 * 60 * 1000
        const adjustedSerialNumber = recordDate > 59 ? recordDate - 1 : recordDate
        const date = new Date(excelEpoch.getTime() + (adjustedSerialNumber - 1) * millisecondsPerDay)
        if (!isNaN(date.getTime()) && date.getFullYear() >= 1900 && date.getFullYear() <= 2100) {
          return date
        }
      }

      // NO usar new Date(recordDate) genérico - puede producir años inválidos
      // En su lugar, usar fecha actual como fallback
      console.warn('getDateFromFirstRecord: No se pudo parsear la fecha:', recordDate)
      return null
    }
    
    // Fecha
    const formatInvoiceDate = (dateString: string) => {
      if (!dateString) return null

      // Limpiar espacios
      const cleanDate = typeof dateString === 'string' ? dateString.trim() : String(dateString)

      // Formato YYYY-MM-DD
      if (cleanDate.match(/^\d{4}-\d{1,2}-\d{1,2}$/)) {
        const [year, month, day] = cleanDate.split('-').map(Number)
        // Validar año razonable
        if (year >= 1900 && year <= 2100) {
          return new Date(year, month - 1, day)
        }
      }

      // Formato ISO con T
      if (cleanDate.match(/^\d{4}-\d{1,2}-\d{1,2}T/)) {
        const datePart = cleanDate.split('T')[0]
        const [year, month, day] = datePart.split('-').map(Number)
        if (year >= 1900 && year <= 2100) {
          return new Date(year, month - 1, day)
        }
      }

      // Formato DD-MM-YYYY
      if (cleanDate.match(/^\d{1,2}-\d{1,2}-\d{4}$/)) {
        const parts = cleanDate.split('-')
        if (parts.length === 3) {
          const [part1, part2, year] = parts.map(Number)
          if (year >= 1900 && year <= 2100) {
            // Si part1 > 12, es DD-MM-YYYY
            if (part1 > 12) {
              return new Date(year, part2 - 1, part1)
            }
            // Asumir DD-MM-YYYY
            return new Date(year, part2 - 1, part1)
          }
        }
      }

      // NO usar new Date(dateString) genérico - puede producir años inválidos
      console.warn('formatInvoiceDate: No se pudo parsear la fecha:', dateString)
      return null
    }

    // Obtener fecha: primero intentar fecha del primer registro (invoice date), luego issueDate, finalmente fecha de hoy
    let invoiceDate: Date
    
    // Prioridad 1: Obtener la fecha del primer registro relacionado (esta es la fecha real del invoice)
    const recordDate = getDateFromFirstRecord(selectedRecords)
    
    if (recordDate) {
      invoiceDate = recordDate
    } else {
      // Prioridad 2: Intentar usar issueDate si existe
      const issueDateParsed = invoiceData.issueDate ? formatInvoiceDate(invoiceData.issueDate) : null
      if (issueDateParsed) {
        invoiceDate = issueDateParsed
      } else {
        // Prioridad 3: Solo usar fecha de hoy como último recurso
        invoiceDate = new Date()
      }
    }
    const day = invoiceDate.getDate().toString().padStart(2, '0')
    const month = (invoiceDate.getMonth() + 1).toString().padStart(2, '0')
    const year = invoiceDate.getFullYear()

    doc.setFontSize(10)
    doc.text('DATE:', 195, 30, { align: 'right' })
    doc.setFontSize(12)
    doc.text(`${day} ${month} ${year}`, 195, 35, { align: 'right' })
    doc.setFontSize(8)
    doc.text('DAY MO YR', 195, 40, { align: 'right' })

    // PO Number (solo si existe)
    if (invoiceData.poNumber) {
      doc.setFontSize(10)
      doc.setFont(undefined, 'bold')
      doc.text(`PO: ${invoiceData.poNumber}`, 195, 46, { align: 'right' })
      doc.setFont(undefined, 'normal')
    }

    // Información empresa
    doc.setFontSize(9)
    doc.setFont(undefined, 'bold')
    doc.text('PTY SHIP SUPPLIERS, S.A.', 15, 50)
    doc.setFontSize(8)
    doc.setFont(undefined, 'normal')
    doc.text('RUC: 155583454-1-2022 DV 42', 15, 54)
    doc.text('Panama, Panama', 15, 58)

    // Cliente
    doc.setFontSize(9)
    doc.setFont(undefined, 'bold')
    doc.text('CUSTOMER:', 15, 82)
    doc.setFontSize(8)
    doc.setFont(undefined, 'normal')
    const ruc = (client as any)?.ruc || (client as any)?.documentNumber || 'N/A'
    const sap = (client as any)?.sapCode || ''
    const clientDisplay = client
      ? ((client as any).type === 'natural' ? (client as any).fullName : (client as any).companyName)
      : clientName
    const address = (client as any)?.address
      ? (typeof (client as any).address === 'string' ? (client as any).address : `${(client as any).address?.district || ''}, ${(client as any).address?.province || ''}`)
      : 'N/A'
    const phone = (client as any)?.phone || 'N/A'
    doc.text(clientDisplay, 15, 86)
    doc.text(`RUC: ${ruc}`, 15, 90)
    if (sap) doc.text(`SAP: ${sap}`, 60, 90)
    doc.text(`ADDRESS: ${address}`, 15, 94)
    doc.text(`TELEPHONE: ${phone}`, 15, 98)

    // Encabezado items
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

    // Crear filas de servicios a cobrar
    const bodyRows: any[] = []
    
    selectedRecords.forEach((rec: any) => {
      const data = rec?.data || {}
      const invoiceNo = data.invoiceNo || ''
      
      // Agregar servicios solo si tienen valores
      if (Number(data.deliveryExpenses || 0) > 0) {
        bodyRows.push([1, `Delivery Expenses - Invoice: ${invoiceNo}`, Number(data.deliveryExpenses || 0).toFixed(2), Number(data.deliveryExpenses || 0).toFixed(2)])
      }
      if (Number(data.portEntryFee || 0) > 0) {
        bodyRows.push([1, `Port Entry Fee - Invoice: ${invoiceNo}`, Number(data.portEntryFee || 0).toFixed(2), Number(data.portEntryFee || 0).toFixed(2)])
      }
      if (Number(data.customsFee || 0) > 0) {
        bodyRows.push([1, `Customs Fee - Invoice: ${invoiceNo}`, Number(data.customsFee || 0).toFixed(2), Number(data.customsFee || 0).toFixed(2)])
      }
      if (Number(data.authorities || 0) > 0) {
        bodyRows.push([1, `Authorities - Invoice: ${invoiceNo}`, Number(data.authorities || 0).toFixed(2), Number(data.authorities || 0).toFixed(2)])
      }
      if (Number(data.otherExpenses || 0) > 0) {
        bodyRows.push([1, `Other Expenses - Invoice: ${invoiceNo}`, Number(data.otherExpenses || 0).toFixed(2), Number(data.otherExpenses || 0).toFixed(2)])
      }
      if (Number(data.overTime || 0) > 0) {
        bodyRows.push([1, `Over Time - Invoice: ${invoiceNo}`, Number(data.overTime || 0).toFixed(2), Number(data.overTime || 0).toFixed(2)])
      }
      if (Number(data.total || 0) > 0) {
        bodyRows.push([1, `Total - Invoice: ${invoiceNo}`, Number(data.total || 0).toFixed(2), Number(data.total || 0).toFixed(2)])
      }
    })

    autoTable(doc, {
      startY: startY + 10,
      head: [],
      body: bodyRows,
      theme: 'grid',
      styles: { fontSize: 9, lineWidth: 0.2, lineColor: [180, 180, 180] },
      columnStyles: { 0: { cellWidth: 20 }, 1: { cellWidth: 90 }, 2: { cellWidth: 35, halign: 'right' }, 3: { cellWidth: 35, halign: 'right' } },
      margin: { left: tableX },
    })

    let y = (doc as any).lastAutoTable.finalY + 8

    // Asegurar color de texto negro
    doc.setTextColor(0, 0, 0)

    // Vessel - después de los items, antes del total
    doc.setFont(undefined, 'bold')
    doc.setFontSize(10)
    doc.text(`VESSEL: ${vesselDisplay}`, 15, y)
    y += 8

    // TOTAL alineado a la derecha
    doc.setFont(undefined, 'bold')
    doc.setFontSize(12)
    doc.text('TOTAL:', 120, y)
    doc.setFontSize(16)
    doc.text(`$${invoiceData.totalAmount.toFixed(2)}`, 195, y, { align: 'right' })
    y += 14

    // Términos y condiciones
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
    doc.text('Make check payments payable to: PTY SHIP SUPPLIERS, S.A.', 15, y)
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

    // Notas si existen
    if (invoiceData.notes && invoiceData.notes.trim()) {
      y += 10
      doc.setFontSize(9)
      doc.setFont(undefined, 'bold')
      doc.text('NOTES:', 15, y)
      y += 4
      doc.setFont(undefined, 'normal')
      const notesLines = doc.splitTextToSize(invoiceData.notes, 180)
      notesLines.forEach((line: string) => {
        doc.text(line, 15, y)
        y += 4
      })
    }

    return new Blob([doc.output('blob')], { type: 'application/pdf' })
  };

  useEffect(() => {
    if (open && invoice) {
      setIsGenerating(true);

      const loadLogoAndGenerate = async () => {
        try {
          // Cargar logo PTYSS (ShipChandler es parte de PTY Ship Suppliers)
          let logoBase64: string | undefined;
          try {
            const response = await fetch('/logos/logo_PTYSS.png');
            const blob = await response.blob();
            logoBase64 = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.readAsDataURL(blob);
            });
          } catch (e) {
            console.warn("No se pudo cargar el logo PTYSS, usando texto fallback");
          }

          const relatedRecords = allRecords.filter((record: any) =>
            invoice.relatedRecordIds.includes(record._id || record.id)
          );
          const pdfTitle = invoice.status === "facturada" ? "FACTURA" : "PREFACTURA";
          const pdf = generateShipChandlerPDF(invoice, relatedRecords, pdfTitle, logoBase64);
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
      };

      loadLogoAndGenerate();
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

