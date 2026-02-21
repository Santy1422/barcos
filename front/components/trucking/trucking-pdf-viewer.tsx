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
import { selectAllIndividualRecords, selectAutoridadesRecords } from "@/lib/features/records/recordsSlice";
import { selectAllClients } from "@/lib/features/clients/clientsSlice";
import { selectAllServices } from "@/lib/features/services/servicesSlice";

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
  const autoridadesRecords = useAppSelector(selectAutoridadesRecords);
  const clients = useAppSelector(selectAllClients);
  const services = useAppSelector(selectAllServices);

  // Determinar si es una factura AUTH
  const isAuthInvoice = invoice?.invoiceNumber?.toString().toUpperCase().startsWith('AUTH-');

  // Copiar exactamente el regex de normalizeName de trucking-prefactura.tsx
  const normalizeName = (s: string) => (s || '').toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '').trim();
  const getClient = (name: string) => {
    const target = normalizeName(name);
    return clients.find((c: any) => {
      const n = c.type === 'juridico' ? (c.companyName || '') : (c.fullName || '');
      return normalizeName(n) === target;
    });
  };

  const generateTruckingPrefacturaPDF = (invoiceData: any, selectedRecords: any[], pdfTitle: string, logoBase64?: string) => {
    // Adaptar la función exacta de trucking-prefactura.tsx
    const issuer = getClient('PTG')
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

    // Número de prefactura y fecha
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(14)
    doc.setFont(undefined, 'bold')
    doc.text(`${pdfTitle} No. ${invoiceData.invoiceNumber}`, 195, 20, { align: 'right' })

    // Usar la fecha de la factura en lugar de la fecha actual
    // Aplicar la misma lógica de corrección de zona horaria que en trucking-records.tsx
    const formatInvoiceDate = (dateString: string) => {
      if (!dateString) return new Date()

      // Si la fecha está en formato YYYY-MM-DD, crear la fecha en zona horaria local
      if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [year, month, day] = dateString.split('-').map(Number)
        // Validar año razonable (1900-2100)
        if (year >= 1900 && year <= 2100) {
          return new Date(year, month - 1, day) // month - 1 porque Date usa 0-indexado
        }
        return new Date() // Año fuera de rango, usar fecha actual
      }

      // Si la fecha está en formato ISO con zona horaria UTC, extraer solo la parte de la fecha
      if (dateString.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)) {
        const datePart = dateString.split('T')[0] // Obtener solo YYYY-MM-DD
        const [year, month, day] = datePart.split('-').map(Number)
        // Validar año razonable (1900-2100)
        if (year >= 1900 && year <= 2100) {
          return new Date(year, month - 1, day) // Crear en zona horaria local
        }
        return new Date() // Año fuera de rango, usar fecha actual
      }

      // Para otros formatos, no usar new Date() genérico - usar fecha actual
      return new Date()
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

    // PO Number (solo si existe)
    if (invoiceData.poNumber) {
      doc.setFontSize(10)
      doc.setFont(undefined, 'bold')
      doc.text(`PO: ${invoiceData.poNumber}`, 195, 46, { align: 'right' })
      doc.setFont(undefined, 'normal')
    }

    // Información empresa (PTG)
    doc.setFontSize(9)
    doc.setFont(undefined, 'bold')
    const issuerName = issuer ? ((issuer as any).type === 'natural' ? (issuer as any).fullName : (issuer as any).companyName) : 'PTG'
    doc.text(issuerName || 'PTG', 15, 50)
    doc.setFontSize(8)
    doc.setFont(undefined, 'normal')
    const issuerRuc = issuer ? ((issuer as any).type === 'natural' ? (issuer as any).documentNumber : (issuer as any).ruc) : ''
    const issuerAddress = issuer ? (
      typeof (issuer as any).address === 'string' 
        ? (issuer as any).address 
        : `${(issuer as any).address?.district || ''}${(issuer as any).address?.province ? ', ' + (issuer as any).address?.province : ''}`
    ) : ''
    const issuerPhone = (issuer as any)?.phone || ''
    if (issuerRuc) doc.text(`RUC: ${issuerRuc}`, 15, 54)
    if (issuerAddress) doc.text(issuerAddress, 15, 58)
    if (issuerPhone) doc.text(`TEL: ${issuerPhone}`, 15, 62)

    // Cliente
    doc.setFontSize(9)
    doc.setFont(undefined, 'bold')
    doc.text('CUSTOMER:', 15, 82)
    doc.setFontSize(8)
    doc.setFont(undefined, 'normal')
    
    // Usar clientName del invoice
    const client = getClient(invoiceData.clientName)
    const ruc = (client as any)?.ruc || (client as any)?.documentNumber || 'N/A'
    const sap = (client as any)?.sapCode || ''
    const clientDisplay = client
      ? ((client as any).type === 'natural' ? (client as any).fullName : (client as any).companyName)
      : invoiceData.clientName
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

    // Agrupar registros por características similares (trasiego)
    const groupedRecords = new Map<string, { records: any[], price: number, count: number }>()
    
    selectedRecords.forEach((r: any) => {
      const moveType = (r.data?.moveType || 'SINGLE').toString().toUpperCase() // SINGLE/RT
      const routeType = (r.data?.route || 'PACIFIC').toString().toUpperCase() // PACIFIC/ATLANTIC
      const leg = r.data?.leg || `${r.data?.from || ''} / ${r.data?.to || ''}`
      const fe = r.data?.fe ? (r.data.fe.toString().toUpperCase().trim() === 'F' ? 'FULL' : 'EMPTY') : 'FULL'
      const size = r.data?.size || r.data?.containerSize || ''
      const type = r.data?.type || r.data?.containerType || ''
      const price = (r.data?.matchedPrice || r.totalValue || 0)
      
      // Crear clave única para agrupar
      const groupKey = `${moveType}|${routeType}|${leg}|${fe}|${size}|${type}|${price}`
      
      if (!groupedRecords.has(groupKey)) {
        groupedRecords.set(groupKey, {
          records: [],
          price: price,
          count: 0
        })
      }
      
      const group = groupedRecords.get(groupKey)!
      group.records.push(r)
      group.count += 1
    })

    // Crear filas agrupadas para el PDF
    const bodyRows = Array.from(groupedRecords.entries()).map(([groupKey, group]) => {
      const [moveType, routeType, leg, fe, size, type, priceStr] = groupKey.split('|')
      const totalPrice = group.price * group.count
      
      // Descripción agrupada según el formato solicitado: MOVE_TYPE ROUTE_TYPE - LEG/FE/SIZE/TYPE
      const desc = `${moveType} ${routeType} - ${leg}/${fe}/${size}/${type}`
      
      return [group.count, desc, group.price.toFixed(2), totalPrice.toFixed(2)]
    })

    // Agregar servicios adicionales como filas de la tabla
    const additionalServices = invoiceData.details?.additionalServices || []
    if (additionalServices.length > 0) {
      additionalServices.forEach((svc: any) => {
        const description = svc.description || 'Additional Service'
        const amount = Number(svc.amount || 0)
        bodyRows.push([1, description, amount.toFixed(2), amount.toFixed(2)])
      })
    }

    // Agregar impuestos PTG (Customs y Administration Fee) basados en contenedores llenos
    const fullContainers = selectedRecords.filter((r: any) => {
      const fe = r?.data?.fe || ''
      return fe.toString().toUpperCase().trim() === 'F'
    })
    const totalFullContainers = fullContainers.length
    
    if (totalFullContainers > 0) {
      // Buscar los impuestos PTG en los servicios
      const customsTax = services.find(s => s.module === 'trucking' && s.name === 'Aduana' && s.isActive)
      const adminFeeTax = services.find(s => s.module === 'trucking' && s.name === 'Administration Fee' && s.isActive)
      
      if (customsTax && customsTax.price > 0) {
        const customsTotal = customsTax.price * totalFullContainers
        bodyRows.push([totalFullContainers, `Aduana`, customsTax.price.toFixed(2), customsTotal.toFixed(2)])
      }
      
      if (adminFeeTax && adminFeeTax.price > 0) {
        const adminFeeTotal = adminFeeTax.price * totalFullContainers
        bodyRows.push([totalFullContainers, `Administration Fee`, adminFeeTax.price.toFixed(2), adminFeeTotal.toFixed(2)])
      }
    }

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

    // Asegurar color de texto negro para secciones posteriores a la tabla
    doc.setTextColor(0, 0, 0)

    // TOTAL alineado a la derecha
    doc.setFont(undefined, 'bold')
    doc.setFontSize(12)
    doc.text('TOTAL:', 120, y)
    doc.setFontSize(16)
    doc.text(`$${invoiceData.totalAmount.toFixed(2)}`, 195, y, { align: 'right' })
    y += 14

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
    doc.text(`Make check payments payable to: ${issuerName || 'PTG'}`, 15, y)
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

    return new Blob([doc.output('blob')], { type: 'application/pdf' });
  };

  const generateAutoridadesPdf = (invoiceData: any, selectedRecords: any[], pdfTitle: string, logoBase64?: string) => {
    // Usar EXACTAMENTE la misma función del paso 2 de trucking-gastos-autoridades-page.tsx
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
    doc.text(`${pdfTitle} No. ${invoiceData.invoiceNumber}`, 195, 20, { align: 'right' })

    // Usar la fecha de la factura en lugar de la fecha actual
    // Aplicar la misma lógica de corrección de zona horaria que en trucking-records.tsx
    const formatInvoiceDate = (dateString: string) => {
      if (!dateString) return new Date()

      // Si la fecha está en formato YYYY-MM-DD, crear la fecha en zona horaria local
      if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [year, month, day] = dateString.split('-').map(Number)
        // Validar año razonable (1900-2100)
        if (year >= 1900 && year <= 2100) {
          return new Date(year, month - 1, day) // month - 1 porque Date usa 0-indexado
        }
        return new Date() // Año fuera de rango, usar fecha actual
      }

      // Si la fecha está en formato ISO con zona horaria UTC, extraer solo la parte de la fecha
      if (dateString.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)) {
        const datePart = dateString.split('T')[0] // Obtener solo YYYY-MM-DD
        const [year, month, day] = datePart.split('-').map(Number)
        // Validar año razonable (1900-2100)
        if (year >= 1900 && year <= 2100) {
          return new Date(year, month - 1, day) // Crear en zona horaria local
        }
        return new Date() // Año fuera de rango, usar fecha actual
      }

      // Para otros formatos, no usar new Date() genérico - usar fecha actual
      return new Date()
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

    // PO Number (solo si existe)
    if (invoiceData.poNumber) {
      doc.setFontSize(10)
      doc.setFont(undefined, 'bold')
      doc.text(`PO: ${invoiceData.poNumber}`, 195, 46, { align: 'right' })
      doc.setFont(undefined, 'normal')
    }

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

    // Agrupar registros por BL Number (usando la misma lógica del componente original)
    const groupedByBL = new Map<string, any[]>()
    selectedRecords.forEach((record: any) => {
      const blNumber = record.blNumber || 'Sin BL'
      if (!groupedByBL.has(blNumber)) {
        groupedByBL.set(blNumber, [])
      }
      groupedByBL.get(blNumber)!.push(record)
    })

    // Crear filas agrupadas por BL Number con pricing exacta del componente original
    const bodyRows: any[] = []
    let grandTotal = 0
    
    // Usar las claves del groupedByBL para mostrar todos los BL Numbers disponibles
    const blNumbersToProcess = Array.from(groupedByBL.keys())
    
    blNumbersToProcess.forEach((blNumber: string) => {
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
    if (invoiceData.notes) {
      doc.setTextColor(0, 0, 0)
      doc.setFontSize(10)
      doc.setFont(undefined, 'bold')
      doc.text('NOTAS:', 15, y)
      doc.setFont(undefined, 'normal')
      y += 5
      const notes = doc.splitTextToSize(invoiceData.notes, 180)
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

    return new Blob([doc.output('blob')], { type: 'application/pdf' });
  };

  useEffect(() => {
    if (open && invoice) {
      setIsGenerating(true);

      const loadLogoAndGenerate = async () => {
        try {
          // Cargar logo PTG
          let logoBase64: string | undefined;
          try {
            const response = await fetch('/logos/logo_PTG.png');
            const blob = await response.blob();
            logoBase64 = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.readAsDataURL(blob);
            });
          } catch (e) {
            console.warn("No se pudo cargar el logo PTG, usando texto fallback");
          }

          let relatedRecords: any[] = [];
          let pdf: Blob;

          if (isAuthInvoice) {
            relatedRecords = autoridadesRecords.filter((record: any) =>
              invoice.relatedRecordIds.includes(record._id || record.id)
            );
            const pdfTitle = invoice.status === "facturada" ? "GASTOS AUTORIDADES" : "GASTOS AUTORIDADES";
            pdf = generateAutoridadesPdf(invoice, relatedRecords, pdfTitle, logoBase64);
          } else {
            relatedRecords = allRecords.filter((record: any) =>
              invoice.relatedRecordIds.includes(record._id || record.id)
            );
            const pdfTitle = invoice.status === "facturada" ? "FACTURA" : "PREFACTURA";
            pdf = generateTruckingPrefacturaPDF(invoice, relatedRecords, pdfTitle, logoBase64);
          }

          if (!pdf) {
            throw new Error("No se pudo generar el PDF");
          }

          setPdfBlob(pdf);
        } catch (error) {
          console.error("Error generando PDF:", error);
          toast({ title: "Error", description: "Error al generar el PDF", variant: "destructive" });
        } finally {
          setIsGenerating(false);
        }
      };

      loadLogoAndGenerate();
    }
  }, [open, invoice, allRecords, autoridadesRecords, clients, toast, isAuthInvoice]);

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
            <Eye className="h-5 w-5" /> 
            Previsualización - {invoice?.invoiceNumber}
            {isAuthInvoice && (
              <Badge variant="default" className="bg-orange-600 text-white">
                Gastos Auth
              </Badge>
            )}
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


