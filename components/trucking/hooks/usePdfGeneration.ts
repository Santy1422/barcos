import jsPDF from "jspdf"
import saveAs from "file-saver"
import { useToast } from "@/hooks/use-toast"
import type { TruckingFormData } from "./useTruckingInvoice"

export function usePdfGeneration() {
  const { toast } = useToast()

  const generateInvoicePDF = (
    invoiceData: TruckingFormData,
    configuredDrivers: any[],
    configuredVehicles: any[],
    configuredRoutes: any[]
  ): Blob => {
    const doc = new jsPDF()
    
    // Configurar el documento PDF
    doc.setFontSize(20)
    doc.text('FACTURA DE TRUCKING', 20, 30)
    
    doc.setFontSize(12)
    doc.text(`Número de Factura: ${invoiceData.invoiceNumber}`, 20, 50)
    doc.text(`Cliente: ${invoiceData.clientName}`, 20, 60)
    doc.text(`RUC: ${invoiceData.clientRuc}`, 20, 70)
    doc.text(`Fecha de Emisión: ${new Date(invoiceData.issueDate).toLocaleDateString()}`, 20, 80)
    doc.text(`Fecha de Vencimiento: ${new Date(invoiceData.dueDate).toLocaleDateString()}`, 20, 90)
    
    // Información del conductor y vehículo
    const driver = configuredDrivers.find(d => d.id === invoiceData.driverId)
    const vehicle = configuredVehicles.find(v => v.id === invoiceData.vehicleId)
    const route = configuredRoutes.find(r => r.id === invoiceData.routeId)
    
    if (driver) doc.text(`Conductor: ${driver.name}`, 20, 110)
    if (vehicle) doc.text(`Vehículo: ${vehicle.plate} (${vehicle.model})`, 20, 120)
    if (route) doc.text(`Ruta: ${route.name}`, 20, 130)
    
    // Detalles financieros
    doc.text(`Subtotal: ${invoiceData.currency} ${invoiceData.subtotal.toFixed(2)}`, 20, 150)
    doc.text(`Impuestos: ${invoiceData.currency} ${invoiceData.taxAmount.toFixed(2)}`, 20, 160)
    doc.setFontSize(14)
    doc.text(`Total: ${invoiceData.currency} ${invoiceData.total.toFixed(2)}`, 20, 180)
    
    // Descripción
    if (invoiceData.description) {
      doc.setFontSize(12)
      doc.text('Descripción:', 20, 200)
      const splitDescription = doc.splitTextToSize(invoiceData.description, 170)
      doc.text(splitDescription, 20, 210)
    }
    
    return new Blob([doc.output('blob')], { type: 'application/pdf' })
  }

  const handleDownloadPdf = (generatedPdf: Blob | null, invoiceNumber: string) => {
    if (generatedPdf) {
      saveAs(generatedPdf, `${invoiceNumber || "factura"}.pdf`)
      toast({ title: "PDF Descargado", description: "El archivo PDF ha sido descargado." })
    } else {
      toast({ title: "Error", description: "No hay PDF generado para descargar.", variant: "destructive" })
    }
  }

  const handleDownloadXml = (generatedXml: string | null, invoiceNumber: string) => {
    if (generatedXml) {
      const blob = new Blob([generatedXml], { type: "application/xml;charset=utf-8" })
      saveAs(blob, `${invoiceNumber || "factura"}.xml`)
      toast({ title: "XML Descargado", description: "El archivo XML ha sido descargado." })
    } else {
      toast({ title: "Error", description: "No hay XML generado para descargar.", variant: "destructive" })
    }
  }

  return {
    generateInvoicePDF,
    handleDownloadPdf,
    handleDownloadXml,
  }
}