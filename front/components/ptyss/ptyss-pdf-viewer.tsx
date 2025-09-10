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

  // Función para generar el PDF (idéntica a la del paso 2, pero con título dinámico)
  const generatePTYSSPrefacturaPDF = (invoiceData: any, selectedRecords: any[], pdfTitle: string) => {
    const doc = new jsPDF();
    const lightBlue = [59, 130, 246];
    // Encabezado con logo
    doc.setFillColor(...lightBlue);
    doc.rect(15, 15, 30, 15, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('PTYSS', 30, 25, { align: 'center' });
    // Número de prefactura/factura y fecha
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text(`${pdfTitle} No. ${invoiceData.invoiceNumber}`, 195, 20, { align: 'right' });
    // Fecha - usar la fecha de la factura en lugar de la fecha actual
    // Aplicar la misma lógica de corrección de zona horaria que en trucking-records.tsx
    const formatInvoiceDate = (dateString: string) => {
      if (!dateString) return new Date()

      // Si la fecha está en formato YYYY-MM-DD, crear la fecha en zona horaria local
      if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [year, month, day] = dateString.split('-').map(Number)
        return new Date(year, month - 1, day) // month - 1 porque Date usa 0-indexado
      }

      // Si la fecha está en formato ISO con zona horaria UTC, extraer solo la parte de la fecha
      if (dateString.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)) {
        const datePart = dateString.split('T')[0] // Obtener solo YYYY-MM-DD
        const [year, month, day] = datePart.split('-').map(Number)
        return new Date(year, month - 1, day) // Crear en zona horaria local
      }

      // Para otros formatos, usar el método normal
      return new Date(dateString)
    }

    const invoiceDate = formatInvoiceDate(invoiceData.issueDate)
    const day = invoiceDate.getDate().toString().padStart(2, '0');
    const month = (invoiceDate.getMonth() + 1).toString().padStart(2, '0');
    const year = invoiceDate.getFullYear();
    doc.setFontSize(10);
    doc.text('DATE:', 195, 30, { align: 'right' });
    doc.setFontSize(12);
    doc.text(`${day} ${month} ${year}`, 195, 35, { align: 'right' });
    doc.setFontSize(8);
    doc.text('DAY MO YR', 195, 40, { align: 'right' });
    // Empresa
    doc.setFontSize(9);
    doc.setFont(undefined, 'bold');
    doc.text('PTY SHIP SUPPLIERS, S.A.', 15, 50);
    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    doc.text('RUC: 155600922-2-2015 D.V. 69', 15, 54);
    doc.text('PANAMA PACIFICO, INTERNATIONAL BUSINESS PARK', 15, 58);
    doc.text('BUILDING 3855, FLOOR 2', 15, 62);
    doc.text('PANAMA, REPUBLICA DE PANAMA', 15, 66);
    doc.text('T. (507) 838-9806', 15, 70);
    doc.text('C. (507) 6349-1326', 15, 74);
    // Cliente
    doc.setFontSize(9);
    doc.setFont(undefined, 'bold');
    doc.text('CUSTOMER:', 15, 82);
    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    const firstRecord = selectedRecords[0];
    const firstRecordData = firstRecord?.data as Record<string, any>;
    const client = clients.find((c: any) => (c._id || c.id) === firstRecordData?.clientId);
    const clientName = client ? (client.type === "natural" ? client.fullName : client.companyName) : invoiceData.clientName || "Cliente PTYSS";
    const clientRuc = client ? (client.type === "natural" ? client.documentNumber : client.ruc) : invoiceData.clientRuc || "N/A";
    const clientAddress = client ? (client.type === "natural"
      ? (typeof client.address === "string" ? client.address : `${client.address?.district || ""}, ${client.address?.province || ""}`)
      : (typeof client.fiscalAddress === "string" ? client.fiscalAddress : `${client.fiscalAddress?.district || ""}, ${client.fiscalAddress?.province || ""}`)
    ) : "N/A";
    const clientPhone = client?.phone || "N/A";
    doc.text(clientName, 15, 86);
    doc.text(`RUC: ${clientRuc}`, 15, 90);
    doc.text(`ADDRESS: ${clientAddress}`, 15, 94);
    doc.text(`TELEPHONE: ${clientPhone}`, 15, 98);
    // Tabla de items
    const startY = 115;
    const tableWidth = 180;
    const tableX = 15;
    doc.setFillColor(...lightBlue);
    doc.rect(tableX, startY, tableWidth, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.text('ITEM', 25, startY + 5);
    doc.text('DESCRIPTION', 60, startY + 5);
    doc.text('PRICE', 140, startY + 5);
    doc.text('TOTAL', 170, startY + 5);
    // Items
    const items: string[][] = [];
    let itemIndex = 1;
    selectedRecords.forEach((record) => {
      const data = record.data as Record<string, any>;
      // Flete
      items.push([
        itemIndex.toString(),
        'Flete',
        `$${(record.totalValue || 0).toFixed(2)}`,
        `$${(record.totalValue || 0).toFixed(2)}`
      ]);
      itemIndex++;
      // TI
      if (data.ti === 'si') {
        items.push([
          itemIndex.toString(),
          'TI',
          '$10.00',
          '$10.00'
        ]);
        itemIndex++;
      }
      // Gen set
      if (data.genset && data.genset !== '0') {
        items.push([
          itemIndex.toString(),
          'Gen set',
          `$${data.genset}.00`,
          `$${data.genset}.00`
        ]);
        itemIndex++;
      }
    });
    // Servicios adicionales
    const additionalServices = invoiceData.details?.additionalServices || [];
    additionalServices.forEach((service: any) => {
      items.push([
        itemIndex.toString(),
        service.name,
        `$${service.amount.toFixed(2)}`,
        `$${service.amount.toFixed(2)}`
      ]);
      itemIndex++;
    });
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
    });
    // Detalles de contenedores
    const tableEndY = (doc as any).lastAutoTable.finalY + 5;
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.setFont(undefined, 'bold');
    doc.text('Detalles de Contenedores:', 15, tableEndY);
    let containerY = tableEndY + 3;
    selectedRecords.forEach((record, index) => {
      const data = record.data as Record<string, any>;
      doc.setFontSize(7);
      doc.setFont(undefined, 'normal');
      doc.text(`Contenedor ${index + 1}:`, 15, containerY);
      doc.text(`  CTN: ${data.container || 'N/A'}`, 25, containerY + 3);
      doc.text(`  DESDE: ${data.from || 'N/A'}`, 25, containerY + 6);
      doc.text(`  HACIA: ${data.to || 'N/A'}`, 25, containerY + 9);
      doc.text(`  EMBARQUE: ${data.order || 'N/A'}`, 25, containerY + 12);
      containerY += 18;
    });
    // Totales
    const finalY = containerY + 3;
    const totalX = 120;
    const amountX = 170;
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('TOTAL:', totalX, finalY);
    doc.text(`$${invoiceData.totalAmount.toFixed(2)}`, amountX, finalY, { align: 'right' });
    // Términos y condiciones
    let termsY = finalY + 15;
    const pageHeight = doc.internal.pageSize.getHeight();
    if (termsY + 35 > pageHeight) {
      doc.addPage();
      termsY = 20;
    }
    doc.setFillColor(...lightBlue);
    doc.rect(15, termsY, 180, 5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont(undefined, 'bold');
    doc.text('TERMS AND CONDITIONS', 20, termsY + 3);
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    doc.text('Make check payments payable to: PTY SHIP SUPPLIERS, S.A.', 15, termsY + 10);
    doc.text('Money transfer to: Banco General - Checking Account', 15, termsY + 13);
    doc.text('Account No. 03-72-01-124081-1', 15, termsY + 16);
    // Confirmación
    const confirmY = termsY + 22;
    doc.setFontSize(8);
    doc.text('I Confirmed that I have received the original prefactura and documents.', 15, confirmY);
    doc.text('Received by: ___________        Date: ___________', 15, confirmY + 4);
    return new Blob([doc.output('blob')], { type: 'application/pdf' });
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