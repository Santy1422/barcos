"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Eye, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import saveAs from "file-saver";
import { useAppSelector } from "@/lib/hooks";
import { selectAllClients } from "@/lib/features/clients/clientsSlice";
import { useAgencyCatalogs } from "@/lib/features/agencyServices/useAgencyCatalogs";

interface AgencyPdfViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service: any;
  services?: any[]; // Para facturación múltiple
  isMultipleServices?: boolean;
}

export function AgencyPdfViewer({ open, onOpenChange, service, services = [], isMultipleServices = false }: AgencyPdfViewerProps) {
  const { toast } = useToast();
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const clients = useAppSelector(selectAllClients);
  const { ranks, fetchGroupedCatalogs } = useAgencyCatalogs();

  useEffect(() => {
    if (open) {
      fetchGroupedCatalogs();
    }
  }, [open, fetchGroupedCatalogs]);

  const normalizeName = (s: string) => (s || '').toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '').trim();
  const getClient = (name: string) => {
    const target = normalizeName(name);
    return clients.find((c: any) => {
      const n = c.type === 'juridico' ? (c.companyName || '') : (c.fullName || '');
      return normalizeName(n) === target;
    });
  };

  const generateAgencyInvoicePDF = (serviceData: any, pdfTitle: string, allServices?: any[]) => {
    const issuer = getClient('PTYSS')
    const doc = new jsPDF()

    // Colores / encabezado
    const lightBlue = [59, 130, 246]
    doc.setFillColor(lightBlue[0], lightBlue[1], lightBlue[2])
    doc.rect(15, 15, 30, 15, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(14)
    doc.setFont(undefined, 'bold')
    doc.text('PTYSS', 30, 23, { align: 'center', baseline: 'middle' })

    // Número de factura y fecha
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(14)
    doc.setFont(undefined, 'bold')
    doc.text(`${pdfTitle} No. ${serviceData.invoiceNumber}`, 195, 20, { align: 'right' })

    // Formatear fecha de factura
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
    
    const invoiceDate = formatInvoiceDate(serviceData.invoiceDate)
    const day = invoiceDate.getDate().toString().padStart(2, '0')
    const month = (invoiceDate.getMonth() + 1).toString().padStart(2, '0')
    const year = invoiceDate.getFullYear()
    doc.setFontSize(10)
    doc.text('DATE:', 195, 30, { align: 'right' })
    doc.setFontSize(12)
    doc.text(`${day} ${month} ${year}`, 195, 35, { align: 'right' })
    doc.setFontSize(8)
    doc.text('DAY MO YR', 195, 40, { align: 'right' })

    // Información empresa (PTYSS)
    doc.setFontSize(9)
    doc.setFont(undefined, 'bold')
    const issuerName = issuer ? ((issuer as any).type === 'natural' ? (issuer as any).fullName : (issuer as any).companyName) : 'PTY SHIP SUPPLIERS, S.A.'
    doc.text(issuerName, 15, 50)
    doc.setFontSize(8)
    doc.setFont(undefined, 'normal')
    
    // Obtener datos del emisor
    const issuerRuc = issuer ? ((issuer as any).type === 'natural' ? (issuer as any).documentNumber : (issuer as any).ruc) : '155600922-2-2015 D.V. 69'
    const issuerAddress = issuer?.address || 'PANAMA PACIFICO, INTERNATIONAL BUSINESS PARK, BUILDING 3855, FLOOR 2'
    const issuerPhone = (issuer as any)?.phone || '(507) 838-9806'
    const issuerEmail = (issuer as any)?.email || 'info@ptyss.com'
    
    let issuerY = 54
    
    // Mostrar RUC
    doc.text(`RUC: ${issuerRuc}`, 15, issuerY)
    issuerY += 4
    
    // Mostrar dirección - puede ser string o objeto
    if (issuerAddress) {
      if (typeof issuerAddress === 'string') {
        // Si es string, dividirlo en líneas si es muy largo
        const addressLines = doc.splitTextToSize(issuerAddress, 180)
        addressLines.forEach((line: string, index: number) => {
          if (index < 3) { // Máximo 3 líneas de dirección
            doc.text(line, 15, issuerY)
            issuerY += 4
          }
        })
      } else {
        // Si es objeto, construir la dirección
        if (issuerAddress.street) {
          doc.text(issuerAddress.street, 15, issuerY)
          issuerY += 4
        }
        if (issuerAddress.district || issuerAddress.province) {
          const location = `${issuerAddress.district || ''}${issuerAddress.province ? ', ' + issuerAddress.province : ''}`
          doc.text(location, 15, issuerY)
          issuerY += 4
        }
        if (issuerAddress.country) {
          doc.text(issuerAddress.country, 15, issuerY)
          issuerY += 4
        }
      }
    }
    
    // Mostrar teléfono
    doc.text(`TEL: ${issuerPhone}`, 15, issuerY)
    issuerY += 4
    
    // Mostrar email
    doc.text(`EMAIL: ${issuerEmail}`, 15, issuerY)

    // Cliente
    doc.setFontSize(9)
    doc.setFont(undefined, 'bold')
    doc.text('CUSTOMER:', 15, 82)
    doc.setFontSize(8)
    doc.setFont(undefined, 'normal')
    
    const client = getClient(serviceData.clientName)
    const ruc = (client as any)?.ruc || (client as any)?.documentNumber || 'N/A'
    const sap = (client as any)?.sapCode || ''
    const clientDisplay = client
      ? ((client as any).type === 'natural' ? (client as any).fullName : (client as any).companyName)
      : serviceData.clientName
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
    doc.text('DATE', 20, startY + 5)
    doc.text('DESCRIPTION', 70, startY + 5)
    doc.text('TOTAL', 170, startY + 5)

    // Función para obtener el label del move type
    const getMoveTypeLabel = (moveType: string) => {
      const moveTypes: { [key: string]: string } = {
        'SINGLE': 'Single',
        'RT': 'Round Trip',
        'INTERNAL': 'Internal',
        'BAGS_CLAIM': 'Bags Claim',
        'DOCUMENTATION': 'Documentation',
        'NO_SHOW': 'No Show'
      };
      return moveTypes[moveType] || moveType;
    };

    // Función para procesar un servicio y agregarlo a bodyRows
    const processService = (svc: any, rows: any[]) => {
      // Formatear fecha del servicio
      const serviceDate = formatInvoiceDate(svc.pickupDate)
      const formattedDate = `${serviceDate.getDate().toString().padStart(2, '0')}/${(serviceDate.getMonth() + 1).toString().padStart(2, '0')}/${serviceDate.getFullYear()}`
      
      // Descripción del servicio principal
      let route = `${svc.pickupLocation} TO ${svc.dropoffLocation}`
      
      // Si es Round Trip, agregar el Return Drop-off
      if (svc.moveType === 'RT' && svc.returnDropoffLocation) {
        route += ` TO ${svc.returnDropoffLocation}`
      }
      
      // Crew members - solo nombre y taulia code del rank
      const crewInfo = svc.crewMembers && svc.crewMembers.length > 0
        ? svc.crewMembers.map((cm: any) => {
            // Buscar el rank en el catálogo para obtener el taulia code
            const rank = ranks.find((r: any) => r.name === cm.crewRank);
            const rankCode = rank?.code || cm.crewRank || 'N/A';
            return `${cm.name} (${rankCode})`;
          }).join(', ')
        : svc.crewName || 'N/A'
      
      const moveTypeLabel = svc.moveType ? getMoveTypeLabel(svc.moveType) : '';
      
      // Construir la descripción con Service Code si existe
      let description = moveTypeLabel ? `${moveTypeLabel} - ${route}` : route;
      
      // Agregar Service Code si existe
      if (svc.serviceCode && svc.serviceCode.trim()) {
        description += ` (${svc.serviceCode})`;
      }
      
      // Agregar crew info en nueva línea
      description += `\n${crewInfo}`;
      
      const price = svc.price || 0
      
      rows.push([formattedDate, description, price.toFixed(2)])
      
      // Agregar waiting time si existe
      if (svc.waitingTime > 0 && svc.waitingTimePrice > 0) {
        const hours = (svc.waitingTime / 60).toFixed(2)
        const wtDescription = `Waiting Time (${hours} hours)`
        rows.push(['', wtDescription, svc.waitingTimePrice.toFixed(2)])
      }
    };

    // Crear filas para el PDF con información de crew members
    const bodyRows: any[] = []
    const vessel = serviceData.vessel || 'N/A'
    
    // Si hay múltiples servicios, procesar todos
    if (allServices && allServices.length > 0) {
      allServices.forEach(svc => processService(svc, bodyRows))
    } else {
      // Procesar solo el servicio individual
      processService(serviceData, bodyRows)
    }

    autoTable(doc, {
      startY: startY + 10,
      head: [],
      body: bodyRows,
      theme: 'grid',
      styles: { fontSize: 9, lineWidth: 0.2, lineColor: [180, 180, 180] },
      columnStyles: { 
        0: { cellWidth: 30, halign: 'center' }, // DATE
        1: { cellWidth: 110 }, // DESCRIPTION
        2: { cellWidth: 40, halign: 'right' } // TOTAL
      },
      margin: { left: tableX },
    })

    let y = (doc as any).lastAutoTable.finalY + 8

    // Asegurar color de texto negro
    doc.setTextColor(0, 0, 0)

    // Vessel
    doc.setFontSize(9)
    doc.setFont(undefined, 'bold')
    doc.text('VESSEL:', 15, y)
    doc.setFont(undefined, 'normal')
    doc.text(vessel, 35, y)
    
    y += 5

    // Notes (del campo notes del servicio)
    if (serviceData.notes) {
      doc.setFont(undefined, 'bold')
      doc.text('NOTES:', 15, y)
      doc.setFont(undefined, 'normal')
      const notesLines = doc.splitTextToSize(serviceData.notes, 160)
      doc.text(notesLines, 35, y)
      y += (notesLines.length * 4) + 5
    }

    y += 5

    // TOTAL alineado a la derecha - sumar todos los servicios si hay múltiples
    let totalAmount = 0;
    if (allServices && allServices.length > 0) {
      totalAmount = allServices.reduce((sum, svc) => sum + (svc.price || 0) + (svc.waitingTimePrice || 0), 0);
    } else {
      totalAmount = (serviceData.price || 0) + (serviceData.waitingTimePrice || 0);
    }
    doc.setFont(undefined, 'bold')
    doc.setFontSize(12)
    doc.text('TOTAL:', 120, y)
    doc.setFontSize(16)
    doc.text(`$${totalAmount.toFixed(2)}`, 195, y, { align: 'right' })

    y += 15

    // Terms and Conditions
    doc.setFontSize(10)
    doc.setFont(undefined, 'bold')
    doc.setTextColor(59, 130, 246) // Blue color for header
    doc.text('TERMS AND CONDITIONS', 15, y)
    
    y += 8
    
    // Reset to black text
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(9)
    doc.setFont(undefined, 'normal')
    
    // Payment Terms
    doc.setFont(undefined, 'bold')
    doc.text('1. Payment Terms:', 15, y)
    doc.setFont(undefined, 'normal')
    doc.text('Payments should be made within 30 days by check or money transfer.', 20, y + 4)
    y += 12
    
    // Check Payments
    doc.setFont(undefined, 'bold')
    doc.text('2. Check Payments:', 15, y)
    doc.setFont(undefined, 'normal')
    doc.text('Make check payments payable to: PTY SHIP SUPPLIERS, S.A.', 20, y + 4)
    y += 12
    
    // Money Transfer Details
    doc.setFont(undefined, 'bold')
    doc.text('3. Money Transfer Details:', 15, y)
    doc.setFont(undefined, 'normal')
    doc.text('Money transfer to:', 20, y + 4)
    doc.text('Banco General', 20, y + 8)
    doc.text('Checking Account', 20, y + 12)
    doc.text('Account No. 03-72-01-124081-1', 20, y + 16)
    y += 24
    
    // Confirmation Statement
    doc.setFont(undefined, 'bold')
    doc.text('4. Confirmation Statement:', 15, y)
    doc.setFont(undefined, 'normal')
    doc.text('I Confirmed that I have received the original invoice and documents.', 20, y + 4)
    y += 12
    
    // Signature and Date Lines
    doc.text('Received by: ________________________________________', 15, y)
    y += 8
    doc.text('Date: ________________________________________', 15, y)

    return doc
  }

  useEffect(() => {
    if (open && (service || (isMultipleServices && services.length > 0))) {
      setIsGenerating(true)
      try {
        // Para múltiples servicios, usar el primer servicio como base para datos del cliente
        const baseService = isMultipleServices && services.length > 0 ? services[0] : service;
        const pdfTitle = baseService.status === 'facturado' ? 'INVOICE' : 'PRE-INVOICE'
        const doc = generateAgencyInvoicePDF(baseService, pdfTitle, isMultipleServices ? services : undefined)
        const blob = doc.output('blob')
        setPdfBlob(blob)
      } catch (error) {
        console.error('Error generating PDF:', error)
        toast({ title: "Error", description: "No se pudo generar el PDF", variant: "destructive" })
      } finally {
        setIsGenerating(false)
      }
    }
  }, [open, service, services, isMultipleServices, toast, ranks])

  const handleDownload = () => {
    if (!pdfBlob) return
    const baseService = isMultipleServices && services.length > 0 ? services[0] : service;
    if (!baseService) return;
    const fileName = `agency_invoice_${baseService.invoiceNumber || baseService._id}.pdf`
    saveAs(pdfBlob, fileName)
    toast({ title: "PDF descargado", description: `El archivo ${fileName} ha sido descargado` })
  }

  const handleView = () => {
    if (!pdfBlob) return
    const url = URL.createObjectURL(pdfBlob)
    window.open(url, '_blank')
  }

  if (!service && !isMultipleServices) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" /> Vista Previa PDF - {isMultipleServices ? `${services.length} Servicios` : (service?.invoiceNumber || 'Servicio')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {isGenerating ? (
            <div className="flex justify-center items-center py-12">
              <div className="flex items-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                <span className="text-lg font-medium text-gray-800">Generando PDF...</span>
              </div>
            </div>
          ) : pdfBlob ? (
            <>
              <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-green-900">PDF Generado</h3>
                    <p className="text-sm text-green-700">El PDF está listo para descargar o visualizar</p>
                  </div>
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    {(isMultipleServices && services.length > 0 ? services[0].status : service?.status) === 'facturado' ? 'Factura' : 'Pre-factura'}
                  </Badge>
                </div>
              </div>

              <div className="flex gap-3 justify-center">
                <Button onClick={handleView} className="flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  Ver PDF
                </Button>
                <Button onClick={handleDownload} variant="outline" className="flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  Descargar PDF
                </Button>
              </div>

              {/* Preview del PDF */}
              <div className="border rounded-lg overflow-hidden">
              <iframe 
                src={URL.createObjectURL(pdfBlob)} 
                  className="w-full h-[600px]"
                  title="PDF Preview"
              />
            </div>
            </>
          ) : (
            <div className="text-center py-12 text-gray-500">
              No se pudo generar el PDF
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
