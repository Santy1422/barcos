"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Copy, Download, Send, CheckCircle, AlertTriangle, Code, Eye } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { saveAs } from "file-saver"
import { generateXmlFileName } from "@/lib/xml-generator"

interface PTYSSXmlViewerModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  invoice: any
}

export function PTYSSXmlViewerModal({ 
  open, 
  onOpenChange, 
  invoice 
}: PTYSSXmlViewerModalProps) {
  const { toast } = useToast()
  const [isSendingToSap, setIsSendingToSap] = useState(false)

  if (!invoice || !invoice.xmlData) return null

  const { xml, isValid, generatedAt } = invoice.xmlData

  // Función para copiar XML al portapapeles
  const handleCopyXml = async () => {
    try {
      await navigator.clipboard.writeText(xml)
      toast({
        title: "XML copiado",
        description: "El contenido del XML ha sido copiado al portapapeles.",
      })
    } catch (error) {
      toast({
        title: "Error al copiar",
        description: "No se pudo copiar el XML al portapapeles.",
        variant: "destructive"
      })
    }
  }

  // Función para descargar XML
  const handleDownloadXml = () => {
    const blob = new Blob([xml], { type: "application/xml;charset=utf-8" })
    const filename = generateXmlFileName()
    
    saveAs(blob, filename)
    toast({ 
      title: "XML descargado", 
      description: `El archivo XML ha sido descargado como ${filename}` 
    })
  }

  // Función para enviar a SAP (placeholder)
  const handleSendToSap = async () => {
    setIsSendingToSap(true)
    try {
      // TODO: Implementar envío real a SAP cuando tengamos las credenciales FTP
      await new Promise(resolve => setTimeout(resolve, 2000)) // Simular envío
      
      toast({
        title: "Funcionalidad pendiente",
        description: "El envío a SAP estará disponible cuando se configuren las credenciales FTP.",
        variant: "default"
      })
    } catch (error: any) {
      toast({
        title: "Error al enviar a SAP",
        description: error.message || "No se pudo enviar el XML a SAP",
        variant: "destructive"
      })
    } finally {
      setIsSendingToSap(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-ES')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Code className="h-5 w-5" />
            XML SAP - {invoice.invoiceNumber}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Información del XML */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-green-900 flex items-center gap-2">
                <Eye className="h-4 w-4" /> Información del XML
              </h3>
              <Badge 
                variant={isValid ? "default" : "destructive"}
                className="text-xs"
              >
                {isValid ? "✓ Válido" : "⚠ Con errores"}
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="font-medium text-green-800">Factura:</span>
                <span className="ml-2">{invoice.invoiceNumber}</span>
              </div>
              <div>
                <span className="font-medium text-green-800">Cliente:</span>
                <span className="ml-2">{invoice.clientName}</span>
              </div>
              <div>
                <span className="font-medium text-green-800">Generado:</span>
                <span className="ml-2">{formatDate(generatedAt)}</span>
              </div>
              <div>
                <span className="font-medium text-green-800">Total:</span>
                <span className="ml-2">${invoice.totalAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Estado del XML */}
          {isValid ? (
            <Alert className="border border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                <strong>XML válido:</strong> El XML cumple con todos los requisitos para SAP y está listo para envío.
              </AlertDescription>
            </Alert>
          ) : (
            <Alert className="border border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                <strong>XML con advertencias:</strong> El XML puede tener problemas de validación. 
                Revise el contenido antes de enviar a SAP.
              </AlertDescription>
            </Alert>
          )}

          {/* Contenido del XML */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Contenido XML</h3>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyXml}
                  className="flex items-center gap-2"
                >
                  <Copy className="h-4 w-4" />
                  Copiar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadXml}
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Descargar
                </Button>
              </div>
            </div>
            <div className="border rounded-md p-3 bg-gray-50 min-h-[300px] max-h-[400px] overflow-auto">
              <pre className="font-mono text-xs whitespace-pre-wrap text-gray-800">
                {xml}
              </pre>
            </div>
          </div>

          {/* Acciones */}
          <div className="flex justify-between items-center pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cerrar
            </Button>
            
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={handleSendToSap}
                disabled={isSendingToSap || !isValid}
                className="flex items-center gap-2 text-blue-600 border-blue-600 hover:bg-blue-50"
              >
                {isSendingToSap ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Enviar a SAP
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}