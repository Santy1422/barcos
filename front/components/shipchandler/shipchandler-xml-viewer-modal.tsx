"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Textarea } from "@/components/ui/textarea"
import { Copy, Download, Send, CheckCircle, AlertTriangle, FileText, Info, ScrollText, Edit3, RefreshCw, X } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import saveAs from "file-saver"
import { generateXmlFileName, sendXmlToSapFtp } from "@/lib/xml-generator"

interface ShipChandlerXmlViewerModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  invoice: any
  onXmlSentToSap?: () => void // Callback para notificar al padre que se envió a SAP
}

export function ShipChandlerXmlViewerModal({
  open,
  onOpenChange,
  invoice,
  onXmlSentToSap
}: ShipChandlerXmlViewerModalProps) {
  const { toast } = useToast()
  const [isSendingToSap, setIsSendingToSap] = useState(false)
  const [sapLogs, setSapLogs] = useState<any[]>([])
  const [showSapLogs, setShowSapLogs] = useState(false)
  // Estado local para manejar inmediatamente el estado "enviado a SAP"
  const [localSentToSap, setLocalSentToSap] = useState<boolean | null>(null)
  const [localSentToSapAt, setLocalSentToSapAt] = useState<string | null>(null)
  const [localSapFileName, setLocalSapFileName] = useState<string | null>(null)
  // Estado para modo edición
  const [isEditing, setIsEditing] = useState(false)
  const [editedXml, setEditedXml] = useState<string>("")

  // Resetear estado local cuando cambie el invoice (ANTES del return condicional)
  useEffect(() => {
    if (invoice?.id) {
      setLocalSentToSap(null)
      setLocalSentToSapAt(null)
      setLocalSapFileName(null)
      setSapLogs([])
      setShowSapLogs(false)
      setIsEditing(false)
      setEditedXml("")
    }
  }, [invoice?.id])

  // Return condicional DESPUÉS de todos los hooks
  if (!invoice || !invoice.xmlData) return null

  const { xml, isValid, generatedAt } = invoice.xmlData

  // XML actual a usar (editado o original)
  const currentXml = isEditing && editedXml ? editedXml : xml

  // Función para iniciar edición
  const handleStartEditing = () => {
    setEditedXml(xml)
    setIsEditing(true)
  }

  // Función para cancelar edición
  const handleCancelEditing = () => {
    setEditedXml("")
    setIsEditing(false)
  }

  // Usar el estado local si está disponible, sino usar los datos del invoice
  // Los datos de SAP ahora están en campos directos del invoice, no en xmlData
  const effectiveSentToSap = localSentToSap !== null ? localSentToSap : invoice.sentToSap
  const effectiveSentToSapAt = localSentToSapAt || invoice.sentToSapAt
  
  // Obtener el nombre del archivo que se usó para enviar a SAP
  const sapFileName = localSapFileName || invoice.sapFileName

  // Función para copiar XML al portapapeles
  const handleCopyXml = async () => {
    try {
      await navigator.clipboard.writeText(currentXml)
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
    const blob = new Blob([currentXml], { type: "application/xml;charset=utf-8" })

    // Usar el nombre de SAP si existe, sino generar uno nuevo para la descarga
    const downloadFileName = sapFileName || generateXmlFileName('9326')

    saveAs(blob, downloadFileName)
    toast({
      title: "XML descargado",
      description: `El archivo XML ha sido descargado como ${downloadFileName}`
    })
  }

  // Función para enviar a SAP (permite reenvío con XML editado)
  const handleSendToSap = async (forceResend: boolean = false) => {
    setIsSendingToSap(true)
    setSapLogs([])
    setShowSapLogs(true)

    try {
      // Si es reenvío, generar nuevo nombre de archivo para evitar conflictos
      const fileNameToSend = forceResend
        ? generateXmlFileName('9326')
        : (sapFileName || generateXmlFileName('9326'))

      console.log("🚀 ShipChandler - Enviando XML a SAP vía FTP:", {
        invoiceId: invoice.id,
        fileName: fileNameToSend,
        isResend: forceResend,
        isEdited: isEditing
      })

      // Usar el XML actual (editado o original)
      const result = await sendXmlToSapFtp(invoice.id, currentXml, fileNameToSend)
      
      console.log("✅ ShipChandler - Respuesta de SAP:", result)
      setSapLogs(result.logs || [])
      
      if (result.success) {
        // Actualizar estado local inmediatamente para UI responsive
        setLocalSentToSap(true)
        setLocalSentToSapAt(new Date().toISOString())
        setLocalSapFileName(fileNameToSend)
        
        console.log("🔄 ShipChandler - Estado local actualizado:", {
          localSentToSap: true,
          localSentToSapAt: new Date().toISOString(),
          localSapFileName: fileNameToSend
        })
        
        // Notificar al componente padre para que actualice su estado
        if (onXmlSentToSap) {
          console.log("🔄 ShipChandler - Notificando al componente padre...")
          onXmlSentToSap()
        }
        
        toast({
          title: "XML enviado exitosamente",
          description: `Archivo ${fileNameToSend} enviado a SAP vía FTP correctamente.`,
        })
        
        // NO cerrar el modal automáticamente para que el usuario vea el cambio
        console.log("✅ ShipChandler - Estado local actualizado - UI debería mostrar 'Enviado a SAP'")
      } else {
        throw new Error(result.message || "Error al enviar XML")
      }
      
    } catch (error: any) {
      console.error("❌ ShipChandler - Error al enviar XML a SAP:", error)
      setSapLogs(prev => [...prev, {
        timestamp: new Date().toISOString(),
        level: 'error',
        message: `Error: ${error.message}`,
        details: error
      }])
      
      toast({
        title: "Error al enviar XML",
        description: error.message || "Error al conectar con SAP",
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
            <FileText className="h-5 w-5" />
            XML SAP - {invoice.invoiceNumber}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Información del XML */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-green-900 flex items-center gap-2">
                <Info className="h-4 w-4" /> Información del XML
              </h3>
              <div className="flex gap-2">
                <Badge 
                  variant={isValid ? "default" : "destructive"}
                  className="text-xs"
                >
                  {isValid ? "✓ Válido" : "⚠ Con errores"}
                </Badge>
                {effectiveSentToSap ? (
                  <Badge 
                    variant="secondary"
                    className="text-xs bg-blue-100 text-blue-800 border-blue-200"
                  >
                    ✓ Enviado a SAP
                  </Badge>
                ) : (
                  <Badge 
                    variant="secondary"
                    className="text-xs bg-orange-100 text-orange-800 border-orange-200"
                  >
                    ⏳ Pendiente de envío a SAP
                  </Badge>
                )}
              </div>
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
              {effectiveSentToSapAt && (
                <div>
                  <span className="font-medium text-green-800">Enviado a SAP:</span>
                  <span className="ml-2">{formatDate(effectiveSentToSapAt)}</span>
                </div>
              )}
              <div>
                <span className="font-medium text-green-800">Total:</span>
                <span className="ml-2">${invoice.totalAmount.toFixed(2)}</span>
              </div>
              {sapFileName && (
                <div>
                  <span className="font-medium text-green-800">Archivo XML:</span>
                  <span className="ml-2 font-mono text-xs bg-white px-2 py-1 rounded border">{sapFileName}</span>
                </div>
              )}
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
              <h3 className="font-semibold text-gray-900">
                Contenido XML {isEditing && <Badge variant="outline" className="ml-2 text-orange-600 border-orange-300">Editando</Badge>}
              </h3>
              <div className="flex gap-2 flex-wrap justify-end">
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
                {!isEditing ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleStartEditing}
                    className="flex items-center gap-2 text-orange-600 border-orange-300 hover:bg-orange-50"
                  >
                    <Edit3 className="h-4 w-4" />
                    Editar
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCancelEditing}
                    className="flex items-center gap-2 text-gray-600"
                  >
                    <X className="h-4 w-4" />
                    Cancelar
                  </Button>
                )}
                {effectiveSentToSap && !isEditing ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSendToSap(true)}
                    disabled={isSendingToSap}
                    className="flex items-center gap-2 text-purple-600 border-purple-300 hover:bg-purple-50"
                  >
                    {isSendingToSap ? (
                      <>
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-purple-600"></div>
                        Reenviando...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-3 w-3" />
                        Reenviar a SAP
                      </>
                    )}
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSendToSap(isEditing)}
                    disabled={isSendingToSap || !isValid}
                    className={`flex items-center gap-2 ${
                      isEditing
                        ? 'text-orange-600 border-orange-600 hover:bg-orange-50'
                        : 'text-blue-600 border-blue-600 hover:bg-blue-50'
                    }`}
                  >
                    {isSendingToSap ? (
                      <>
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Send className="h-3 w-3" />
                        {isEditing ? 'Enviar XML Editado' : 'Enviar a SAP'}
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
            {isEditing ? (
              <Textarea
                value={editedXml}
                onChange={(e) => setEditedXml(e.target.value)}
                className="font-mono text-xs min-h-[400px] bg-white"
                placeholder="Edita el XML aquí..."
              />
            ) : (
              <div className="border rounded-md p-3 bg-gray-50 min-h-[300px] max-h-[400px] overflow-auto">
                <pre className="font-mono text-xs whitespace-pre-wrap text-gray-800">
                  {xml}
                </pre>
              </div>
            )}
          </div>

          {/* Logs de envío a SAP */}
          {showSapLogs && sapLogs.length > 0 && (
            <div className="mt-4 p-4 border rounded-lg bg-gray-50">
              <h4 className="font-semibold mb-3 text-sm flex items-center gap-2">
                <ScrollText className="h-4 w-4" />
                Logs de envío a SAP
              </h4>
              <div className="max-h-60 overflow-y-auto space-y-2">
                {sapLogs.map((log, index) => (
                  <div key={index} className={`text-xs p-2 rounded ${
                    log.level === 'error' ? 'bg-red-100 text-red-800' :
                    log.level === 'success' ? 'bg-green-100 text-green-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    <div className="flex justify-between items-start gap-2">
                      <span className="font-mono text-xs opacity-75">
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                      <span className={`text-xs px-1 rounded ${
                        log.level === 'error' ? 'bg-red-200' :
                        log.level === 'success' ? 'bg-green-200' :
                        'bg-blue-200'
                      }`}>
                        {(log.level || 'info').toUpperCase()}
                      </span>
                    </div>
                    <div className="mt-1">{log.message}</div>
                    {log.details && (
                      <details className="mt-1">
                        <summary className="cursor-pointer text-xs opacity-75">Ver detalles</summary>
                        <pre className="mt-1 text-xs overflow-x-auto bg-white p-2 rounded">
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Acciones */}
          <div className="flex justify-center pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cerrar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

