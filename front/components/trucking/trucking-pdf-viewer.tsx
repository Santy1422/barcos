"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Eye, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import saveAs from "file-saver";
import { useAppSelector } from "@/lib/hooks";
import { selectAllIndividualRecords } from "@/lib/features/records/recordsSlice";
import { selectAllClients } from "@/lib/features/clients/clientsSlice";

interface TruckingPdfViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: any;
}

export function TruckingPdfViewer({ open, onOpenChange, invoice }: TruckingPdfViewerProps) {
  const { toast } = useToast();
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const allRecords = useAppSelector(selectAllIndividualRecords);
  const clients = useAppSelector(selectAllClients);

  // Copiar exactamente el regex de normalizeName de trucking-prefactura.tsx
  const normalizeName = (s: string) => (s || '').toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '').trim();
  const getClient = (name: string) => {
    const target = normalizeName(name);
    return clients.find((c: any) => {
      const n = c.type === 'juridico' ? (c.companyName || '') : (c.fullName || '');
      return normalizeName(n) === target;
    });
  };

  const generateTruckingPrefacturaPDF = (invoiceData: any, selectedRecords: any[], pdfTitle: string) => {
    const doc = new jsPDF();
    const lightBlue = [59, 130, 246];
    doc.setFillColor(lightBlue[0], lightBlue[1], lightBlue[2]);
    doc.rect(15, 15, 30, 15, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('PTG', 30, 23, { align: 'center', baseline: 'middle' });
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text(`${pdfTitle} No. ${invoiceData.invoiceNumber}`, 195, 20, { align: 'right' });
    const currentDate = new Date();
    const day = currentDate.getDate().toString().padStart(2, '0');
    const month = (currentDate.getMonth() + 1).toString().padStart(2, '0');
    const year = currentDate.getFullYear();
    doc.setFontSize(10);
    doc.text('DATE:', 195, 30, { align: 'right' });
    doc.setFontSize(12);
    doc.text(`${day} ${month} ${year}`, 195, 35, { align: 'right' });
    doc.setFontSize(8);
    doc.text('DAY MO YR', 195, 40, { align: 'right' });
    // --- EMISOR PTG ---
    const issuer = getClient('PTG');
    doc.setFontSize(9);
    doc.setFont(undefined, 'bold');
    const issuerName = issuer ? (issuer.type === 'natural' ? issuer.fullName : issuer.companyName) : 'PTG';
    doc.text(issuerName || 'PTG', 15, 50);
    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    const issuerRuc = issuer ? (issuer.type === 'natural' ? issuer.documentNumber : issuer.ruc) : '';
    const issuerAddress = issuer ? (
      typeof issuer.address === 'string'
        ? issuer.address
        : `${issuer.address?.district || ''}${issuer.address?.province ? ', ' + issuer.address?.province : ''}`
    ) : '';
    const issuerPhone = issuer?.phone || '';
    if (issuerRuc) doc.text(`RUC: ${issuerRuc}`, 15, 54);
    if (issuerAddress) doc.text(issuerAddress, 15, 58);
    if (issuerPhone) doc.text(`T. ${issuerPhone}`, 15, 62);
    // ... el resto de los datos del emisor pueden agregarse aquí si existen ...
    doc.setFontSize(9);
    doc.setFont(undefined, 'bold');
    doc.text('CUSTOMER:', 15, 82);
    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    const firstRecord = selectedRecords[0];
    const firstData = firstRecord?.data || {};
    const client = clients.find((c: any) => (c._id || c.id) === firstData?.clientId);
    const clientName = client ? (client.type === "natural" ? client.fullName : client.companyName) : invoiceData.clientName || "Cliente PTG";
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
    const startY = 115;
    const tableWidth = 180;
    const tableX = 15;
    doc.setFillColor(lightBlue[0], lightBlue[1], lightBlue[2]);
    doc.rect(tableX, startY, tableWidth, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.text('QTY', 25, startY + 5);
    doc.text('DESCRIPTION', 60, startY + 5);
    doc.text('PRICE', 140, startY + 5);
    doc.text('TOTAL', 170, startY + 5);
    const bodyRows = selectedRecords.map((r: any) => {
      const d = r.data || {};
      const qty = 1;
      const container = d.container || '';
      const size = d.size || d.containerSize || '';
      const type = d.type || d.containerType || '';
      const leg = d.leg || `${d.from || ''} / ${d.to || ''}`;
      const price = (d.matchedPrice || r.totalValue || 0);
      const desc = `Container: ${container}  ${size} ${type}  Route: ${leg}`;
      return [qty, desc, price.toFixed(2), price.toFixed(2)];
    });
    const additionalServices = invoiceData.details?.additionalServices || [];
    additionalServices.forEach((s: any) => {
      bodyRows.push([1, s.name, s.amount.toFixed(2), s.amount.toFixed(2)]);
    });
    autoTable(doc, {
      startY: startY + 10,
      head: [],
      body: bodyRows as any,
      theme: 'plain',
      styles: { fontSize: 9, cellPadding: 4, lineWidth: 0.1, lineColor: [200,200,200] },
      columnStyles: { 0: { cellWidth: 20 }, 1: { cellWidth: 90 }, 2: { cellWidth: 35, halign: 'right' }, 3: { cellWidth: 35, halign: 'right' } },
      margin: { left: tableX, right: 15 },
      tableWidth: tableWidth,
      alternateRowStyles: { fillColor: [248, 250, 252] }
    });
    let y = (doc as any).lastAutoTable.finalY + 6;
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text(`TOTAL: $${invoiceData.totalAmount.toFixed(2)}`, 15, y);
    y += 10;
    const pageHeight = doc.internal.pageSize.getHeight();
    if (y + 40 > pageHeight) { doc.addPage(); y = 20; }
    doc.setFillColor(lightBlue[0], lightBlue[1], lightBlue[2]);
    doc.rect(15, y, 180, 5, 'F');
    doc.setTextColor(255,255,255);
    doc.setFontSize(9);
    doc.setFont(undefined, 'bold');
    doc.text('TERMS AND CONDITIONS', 20, y + 3);
    doc.setTextColor(0,0,0);
    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    doc.text('Make check payments payable to: PTY SHIP SUPPLIERS, S.A.', 15, y + 10);
    doc.text('Money transfer to: Banco General - Checking Account', 15, y + 13);
    doc.text('Account No. 03-72-01-124081-1', 15, y + 16);
    return new Blob([doc.output('blob')], { type: 'application/pdf' });
  };

  useEffect(() => {
    if (open && invoice) {
      setIsGenerating(true);
      try {
        const relatedRecords = allRecords.filter((record: any) => invoice.relatedRecordIds.includes(record._id || record.id));
        const pdfTitle = invoice.status === "facturada" ? "FACTURA" : "PREFACTURA";
        const pdf = generateTruckingPrefacturaPDF(invoice, relatedRecords, pdfTitle);
        setPdfBlob(pdf);
      } catch (error) {
        console.error("Error generando PDF:", error);
        toast({ title: "Error", description: "Error al generar el PDF", variant: "destructive" });
      } finally {
        setIsGenerating(false);
      }
    }
  }, [open, invoice, allRecords, clients, toast]);

  const handleDownload = () => {
    if (pdfBlob) {
      saveAs(pdfBlob, `${invoice?.invoiceNumber || 'prefactura_trucking'}.pdf`);
      toast({ title: "PDF Descargado", description: "El archivo PDF ha sido descargado exitosamente." });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" /> Previsualización - {invoice?.invoiceNumber}
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
              <iframe src={URL.createObjectURL(pdfBlob)} className="w-full h-[70vh]" title="Previsualización de PDF" />
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">No se pudo generar el PDF</div>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cerrar</Button>
            <Button onClick={handleDownload} disabled={!pdfBlob} className="bg-green-600 hover:bg-green-700">
              <Download className="mr-2 h-4 w-4" /> Descargar PDF
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}


