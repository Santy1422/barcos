"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { FileText, Code, AlertTriangle, CheckCircle, Calendar, DollarSign, User, Eye, Download } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useAppSelector } from "@/lib/hooks"
import { selectAllIndividualRecords } from "@/lib/features/records/recordsSlice"
import { generateInvoiceXML, validateXMLForSAP, generateXmlFileName, sendXmlToSapFtp } from "@/lib/xml-generator"
import { saveAs } from "file-saver"

interface TruckingFacturacionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  invoice: any
  onFacturar: (invoiceNumber: string, xmlData?: { xml: string, isValid: boolean }, invoiceDate?: string) => Promise<void>
}

export function TruckingFacturacionModal({ open, onOpenChange, invoice, onFacturar }: TruckingFacturacionModalProps) {
  const { toast } = useToast()
  const [isProcessing, setIsProcessing] = useState(false)
  const [newInvoiceNumber, setNewInvoiceNumber] = useState("")
  const [invoiceDate, setInvoiceDate] = useState(() => new Date().toISOString().split('T')[0])
  const [actions, setActions] = useState({ sendToSAP: false })
  const [generatedXml, setGeneratedXml] = useState<string>("")
  const [xmlValidation, setXmlValidation] = useState<{ isValid: boolean; errors: string[] } | null>(null)
  const [isSendingToSap, setIsSendingToSap] = useState(false)
  const [sapLogs, setSapLogs] = useState<any[]>([])
  const [showSapLogs, setShowSapLogs] = useState(false)

  const allRecords = useAppSelector(selectAllIndividualRecords)

  useEffect(() => {
    setGeneratedXml("")
    setXmlValidation(null)
    setNewInvoiceNumber("")
    setIsSendingToSap(false)
    setSapLogs([])
    setShowSapLogs(false)
    const today = new Date(); setInvoiceDate(today.toISOString().split('T')[0])
    setActions({ sendToSAP: false })
  }, [invoice?.id])

  const generateXMLForInvoice = () => {
    try {
      if (!invoice) throw new Error("No hay datos de factura disponibles")
      if (!newInvoiceNumber.trim()) throw new Error("Debe ingresar el número de factura")
      if (!invoiceDate) throw new Error("Debe seleccionar la fecha de factura")
      const relatedRecords = allRecords.filter((record: any) => invoice.relatedRecordIds?.includes(record._id || record.id))
      if (relatedRecords.length === 0) throw new Error("No se encontraron registros asociados a la factura")

      // Construir payload Trucking para generateInvoiceXML
      const xmlPayload = {
        id: invoice.id,
        module: 'trucking',
        invoiceNumber: newInvoiceNumber,
        client: invoice.clientRuc,
        clientName: invoice.clientName,
        clientSapNumber: invoice.clientSapNumber,
        date: invoiceDate,
        dueDate: invoiceDate,
        currency: 'USD',
        total: invoice.totalAmount,
        records: relatedRecords.map((r: any) => {
          const d = r.data || {}
          const unitPrice = Number(d.matchedPrice || r.totalValue || 0)
          const desc = d.description || `Servicio de transporte - Container: ${d.container || d.contenedor || ''}`
          return {
            id: r._id || r.id,
            description: desc,
            quantity: 1,
            unitPrice,
            totalPrice: unitPrice,
            serviceCode: d.serviceCode || 'TRK001',
            activityCode: 'TRK',
            unit: 'VIAJE',
            blNumber: d.bl || '',
            containerNumber: d.container || d.contenedor || '',
            containerSize: d.size || d.containerSize || '',
            containerType: d.type || d.containerType || '',
            containerIsoCode: d.containerIsoCode || '42G1',
            fullEmptyStatus: d.fullEmptyStatus || 'FULL',
            route: d.leg || `${d.from || ''} / ${d.to || ''}`,
            commodity: 'TRUCK',
          }
        })
      } as any

      const xml = generateInvoiceXML(xmlPayload)
      const validation = validateXMLForSAP(xml)
      setGeneratedXml(xml)
      setXmlValidation(validation)
      if (validation.isValid) toast({ title: "XML generado", description: "El XML cumple con los requisitos para SAP." })
      else toast({ title: "XML con advertencias", description: `Se encontraron ${validation.errors.length} advertencias.`, variant: "destructive" })
      return { xml, isValid: validation.isValid }
    } catch (error: any) {
      toast({ title: "Error al generar XML", description: error.message || "No se pudo generar el XML", variant: "destructive" })
      return null
    }
  }

  const handleSendToSap = async (invoiceId: string, xmlContent: string) => {
    setIsSendingToSap(true)
    setSapLogs([])
    setShowSapLogs(true)
    try {
      const fileName = generateXmlFileName()
      const result = await sendXmlToSapFtp(invoiceId, xmlContent, fileName)
      setSapLogs(result.logs || [])
      if (result.success) {
        toast({ title: "XML enviado a SAP", description: `Archivo ${fileName} enviado vía FTP.` })
      } else {
        throw new Error(result.message || "Error al enviar XML")
      }
    } catch (error: any) {
      toast({ title: "Error al enviar XML a SAP", description: error.message || "Error al conectar con SAP", variant: "destructive" })
    } finally {
      setIsSendingToSap(false)
    }
  }

  const handleFacturar = async () => {
    if (!newInvoiceNumber.trim()) { toast({ title: "Error", description: "Debe ingresar un número de factura", variant: "destructive" }); return }
    if (!invoiceDate) { toast({ title: "Error", description: "Debe seleccionar la fecha de factura", variant: "destructive" }); return }
    setIsProcessing(true)
    try {
      let xmlData = generateXMLForInvoice()
      if (!xmlData) xmlData = { xml: "", isValid: false }
      if (actions.sendToSAP && xmlData.xml && invoice?.id) {
        try {
          await handleSendToSap(invoice.id, xmlData.xml)
        } catch {}
      }
      await onFacturar(newInvoiceNumber, xmlData, invoiceDate)
      toast({ title: "Facturación completada", description: `La prefactura ha sido facturada como ${newInvoiceNumber}.` })
    } catch (error: any) {
      toast({ title: "Error en la facturación", description: error.message || "No se pudo completar la facturación", variant: "destructive" })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDownloadXml = () => {
    if (generatedXml) {
      const blob = new Blob([generatedXml], { type: "application/xml;charset=utf-8" })
      const filename = generateXmlFileName()
      saveAs(blob, filename)
      toast({ title: "XML Descargado", description: `Descargado como ${filename}` })
    }
  }

  if (!invoice) return null

  const defaultInvoiceNumber = invoice?.invoiceNumber?.replace(/^TRK-PRE-/, "TRK-FAC-") || "TRK-FAC-000001"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><FileText className="h-5 w-5" /> Facturar Prefactura - {invoice.invoiceNumber}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 p-4 rounded-lg">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="flex items-center gap-2"><User className="h-4 w-4 text-blue-600" /><span className="font-medium">Cliente:</span><span>{invoice.clientName}</span></div>
              <div className="flex items-center gap-2"><DollarSign className="h-4 w-4 text-blue-600" /><span className="font-medium">Total:</span><span className="font-bold">${invoice.totalAmount.toFixed(2)}</span></div>
              <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-blue-600" /><span className="font-medium">Fecha Emisión:</span><span>{new Date(invoice.issueDate).toLocaleDateString('es-ES')}</span></div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="invoice-number" className="text-sm font-semibold">Número de Factura *</Label>
            <Input id="invoice-number" value={newInvoiceNumber} onChange={(e)=>setNewInvoiceNumber(e.target.value.toUpperCase())} placeholder={defaultInvoiceNumber} className="font-mono" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="invoice-date" className="text-sm font-semibold">Fecha de Factura *</Label>
            <Input id="invoice-date" type="date" value={invoiceDate} onChange={(e)=>setInvoiceDate(e.target.value)} className="font-mono" />
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2"><FileText className="h-4 w-4" /> Acciones Adicionales</h3>
            <div className="space-y-3">
              <div className="flex items-center space-x-3 p-3 border border-gray-200">
                <Checkbox id="send-to-sap" checked={actions.sendToSAP} onCheckedChange={(checked) => setActions(prev => ({ ...prev, sendToSAP: checked as boolean }))} />
                <div className="flex items-center gap-2 flex-1"><Code className="h-4 w-4 text-green-600" /><Label htmlFor="send-to-sap" className="font-medium">Enviar XML a SAP (XML se genera automáticamente)</Label></div>
                {generatedXml && (
                  <div className="flex items-center gap-2">
                    <Badge variant={xmlValidation?.isValid ? "default" : "destructive"} className="text-xs">{xmlValidation?.isValid ? "✓ Válido" : "⚠ Con errores"}</Badge>
                    <Button variant="ghost" size="sm" onClick={handleDownloadXml} className="h-8 w-8 p-0"><Download className="h-4 w-4" /></Button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {!generatedXml && (
            <div className="flex flex-col items-center space-y-2">
              <Button variant="outline" onClick={generateXMLForInvoice} disabled={!newInvoiceNumber.trim() || !invoiceDate} className="flex items-center gap-2 text-blue-600 border-blue-600 hover:bg-blue-50 disabled:text-gray-400 disabled:border-gray-300">
                <Code className="h-4 w-4" /> Vista previa del XML
              </Button>
            </div>
          )}

          {showSapLogs && sapLogs.length > 0 && (
            <div className="mt-4 p-4 border rounded-lg bg-gray-50">
              <h4 className="font-semibold mb-3 text-sm flex items-center gap-2"><Eye className="h-4 w-4" /> Logs de envío a SAP</h4>
              <div className="max-h-60 overflow-y-auto space-y-2">
                {sapLogs.map((log, index) => (
                  <div key={index} className={`text-xs p-2 rounded ${log.level === 'error' ? 'bg-red-100 text-red-800' : log.level === 'success' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                    <div className="flex justify-between items-start gap-2"><span className="font-mono text-xs opacity-75">{new Date(log.timestamp).toLocaleString()}</span><span className={`text-xs px-1 rounded ${log.level === 'error' ? 'bg-red-200' : log.level === 'success' ? 'bg-green-200' : 'bg-blue-200'}`}>{log.level.toUpperCase()}</span></div>
                    <div className="mt-1">{log.message}</div>
                    {log.details && (<details className="mt-1"><summary className="cursor-pointer text-xs opacity-75">Ver detalles</summary><pre className="mt-1 text-xs overflow-x-auto bg-white p-2 rounded">{JSON.stringify(log.details, null, 2)}</pre></details>)}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isProcessing}>Cancelar</Button>
            <Button onClick={handleFacturar} disabled={isProcessing || !newInvoiceNumber.trim() || !invoiceDate} className="bg-green-600 hover:bg-green-700 text-white">
              {isProcessing ? (<><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>Facturando...</>) : (<><FileText className="h-4 w-4 mr-2" />Facturar</>)}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}


