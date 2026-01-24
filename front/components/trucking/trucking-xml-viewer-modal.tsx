"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Copy, Download, Send, CheckCircle, AlertTriangle, FileText, Info, ScrollText } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import saveAs from "file-saver"
import { generateXmlFileName, sendXmlToSapFtp } from "@/lib/xml-generator"

interface TruckingXmlViewerModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  invoice: any
  onXmlSentToSap?: () => void
}

export function TruckingXmlViewerModal({ open, onOpenChange, invoice, onXmlSentToSap }: TruckingXmlViewerModalProps) {
  const { toast } = useToast()
  const [isSendingToSap, setIsSendingToSap] = useState(false)
  const [sapLogs, setSapLogs] = useState<any[]>([])
  const [showSapLogs, setShowSapLogs] = useState(false)
  const [localSentToSap, setLocalSentToSap] = useState<boolean | null>(null)
  const [localSentToSapAt, setLocalSentToSapAt] = useState<string | null>(null)
  const [localSapFileName, setLocalSapFileName] = useState<string | null>(null)

  useEffect(() => {
    if (invoice?.id) {
      setLocalSentToSap(null)
      setLocalSentToSapAt(null)
      setLocalSapFileName(null)
      setSapLogs([])
      setShowSapLogs(false)
    }
  }, [invoice?.id])

  if (!invoice || !invoice.xmlData) return null

  // xmlData puede ser un string (desde la base de datos) o un objeto (desde la generación)
  const xml = typeof invoice.xmlData === 'string' ? invoice.xmlData : invoice.xmlData.xml
  const isValid = typeof invoice.xmlData === 'string' ? true : (invoice.xmlData.isValid ?? true)
  const generatedAt = typeof invoice.xmlData === 'string' ? invoice.createdAt : (invoice.xmlData.generatedAt ?? invoice.createdAt)
  
  const effectiveSentToSap = localSentToSap !== null ? localSentToSap : invoice.sentToSap
  const effectiveSentToSapAt = localSentToSapAt || invoice.sentToSapAt
  const sapFileName = localSapFileName || invoice.sapFileName

  const handleCopyXml = async () => {
    try {
      await navigator.clipboard.writeText(xml)
      toast({ title: "XML copiado", description: "El contenido del XML ha sido copiado al portapapeles." })
    } catch (error) {
      toast({ title: "Error al copiar", description: "No se pudo copiar el XML al portapapeles.", variant: "destructive" })
    }
  }

  const handleDownloadXml = () => {
    const blob = new Blob([xml], { type: "application/xml;charset=utf-8" })
    const downloadFileName = sapFileName || generateXmlFileName()
    saveAs(blob, downloadFileName)
    toast({ title: "XML descargado", description: `El archivo XML ha sido descargado como ${downloadFileName}` })
  }

  const handleSendToSap = async () => {
    if (!invoice?.id) return
    setIsSendingToSap(true)
    setSapLogs([])
    setShowSapLogs(true)
    try {
      const fileNameToSend = sapFileName || generateXmlFileName()
      const result = await sendXmlToSapFtp(invoice.id, xml, fileNameToSend)
      setSapLogs(result.logs || [])
      if (result.success) {
        setLocalSentToSap(true)
        setLocalSentToSapAt(new Date().toISOString())
        setLocalSapFileName(fileNameToSend)
        onXmlSentToSap?.()
        toast({ title: "XML enviado exitosamente", description: `Archivo ${fileNameToSend} enviado a SAP vía FTP correctamente.` })
      } else {
        throw new Error(result.message || "Error al enviar XML")
      }
    } catch (error: any) {
      setSapLogs(prev => [...prev, { timestamp: new Date().toISOString(), level: 'error', message: `Error: ${error.message}`, details: error }])
      toast({ title: "Error al enviar XML", description: error.message || "Error al conectar con SAP", variant: "destructive" })
    } finally {
      setIsSendingToSap(false)
    }
  }

  const formatDate = (dateString: string | Date) => {
    if (!dateString) return 'N/A'
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return 'N/A'
      // Validar año razonable (1900-2100) para prevenir fechas incorrectas
      const year = date.getFullYear()
      if (year < 1900 || year > 2100) return 'N/A'
      return date.toLocaleString('es-ES')
    } catch {
      return 'N/A'
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" /> XML SAP - {invoice.invoiceNumber}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-green-900 flex items-center gap-2">
                <Info className="h-4 w-4" /> Información del XML
              </h3>
              <div className="flex gap-2">
                <Badge variant={isValid ? "default" : "destructive"} className="text-xs">{isValid ? "✓ Válido" : "⚠ Con errores"}</Badge>
                {effectiveSentToSap ? (
                  <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800 border-blue-200">✓ Enviado a SAP</Badge>
                ) : (
                  <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-800 border-orange-200">⏳ Pendiente de envío a SAP</Badge>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="font-medium text-green-800">Factura:</span><span className="ml-2">{invoice.invoiceNumber}</span></div>
              <div><span className="font-medium text-green-800">Cliente:</span><span className="ml-2">{invoice.clientName}</span></div>
              <div><span className="font-medium text-green-800">Generado:</span><span className="ml-2">{formatDate(generatedAt)}</span></div>
              {effectiveSentToSapAt && (<div><span className="font-medium text-green-800">Enviado a SAP:</span><span className="ml-2">{formatDate(effectiveSentToSapAt)}</span></div>)}
              <div><span className="font-medium text-green-800">Total:</span><span className="ml-2">${invoice.totalAmount.toFixed(2)}</span></div>
              {sapFileName && (<div><span className="font-medium text-green-800">Archivo XML:</span><span className="ml-2 font-mono text-xs bg-white px-2 py-1 rounded border">{sapFileName}</span></div>)}
            </div>
          </div>

          {isValid ? (
            <Alert className="border border-green-200 bg-green-50"><CheckCircle className="h-4 w-4 text-green-600" /><AlertDescription className="text-green-800"><strong>XML válido:</strong> El XML cumple con todos los requisitos para SAP y está listo para envío.</AlertDescription></Alert>
          ) : (
            <Alert className="border border-red-200 bg-red-50"><AlertTriangle className="h-4 w-4 text-red-600" /><AlertDescription className="text-red-800"><strong>XML con advertencias:</strong> El XML puede tener problemas de validación.</AlertDescription></Alert>
          )}

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Contenido XML</h3>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleCopyXml} className="flex items-center gap-2"><Copy className="h-4 w-4" />Copiar</Button>
                <Button variant="outline" size="sm" onClick={handleDownloadXml} className="flex items-center gap-2"><Download className="h-4 w-4" />Descargar</Button>
                <Button variant="outline" size="sm" onClick={handleSendToSap} disabled={isSendingToSap || !isValid || effectiveSentToSap} className={`flex items-center gap-2 ${effectiveSentToSap ? 'text-green-600 border-green-600 bg-green-50' : 'text-blue-600 border-blue-600 hover:bg-blue-50'}`}>
                  {isSendingToSap ? (<><div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>Enviando...</>) : effectiveSentToSap ? (<><CheckCircle className="h-3 w-3" />Enviado</>) : (<><Send className="h-3 w-3" />Enviar a SAP</>)}
                </Button>
              </div>
            </div>
            <div className="border rounded-md p-3 bg-gray-50 min-h-[300px] max-h-[400px] overflow-auto">
              <pre className="font-mono text-xs whitespace-pre-wrap text-gray-800">{xml}</pre>
            </div>
          </div>

          {showSapLogs && sapLogs.length > 0 && (
            <div className="mt-4 p-4 border rounded-lg bg-gray-50">
              <h4 className="font-semibold mb-3 text-sm flex items-center gap-2"><ScrollText className="h-4 w-4" />Logs de envío a SAP</h4>
              <div className="max-h-60 overflow-y-auto space-y-2">
                {sapLogs.map((log, index) => (
                  <div key={index} className={`text-xs p-2 rounded ${log.level === 'error' ? 'bg-red-100 text-red-800' : log.level === 'success' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                    <div className="flex justify-between items-start gap-2">
                      <span className="font-mono text-xs opacity-75">{new Date(log.timestamp).toLocaleString()}</span>
                      <span className={`text-xs px-1 rounded ${log.level === 'error' ? 'bg-red-200' : log.level === 'success' ? 'bg-green-200' : 'bg-blue-200'}`}>{(log.level || 'info').toUpperCase()}</span>
                    </div>
                    <div className="mt-1">{log.message}</div>
                    {log.details && (<details className="mt-1"><summary className="cursor-pointer text-xs opacity-75">Ver detalles</summary><pre className="mt-1 text-xs overflow-x-auto bg-white p-2 rounded">{JSON.stringify(log.details, null, 2)}</pre></details>)}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-center pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cerrar</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}


