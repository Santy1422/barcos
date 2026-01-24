"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Copy, Download, Send, CheckCircle, AlertTriangle, FileText, Info, ScrollText } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import saveAs from "file-saver"
import { generateXmlFileName, sendXmlToSapFtp, testSftpConnection, testFtpTraditional } from "@/lib/xml-generator"

interface PTYSSXmlViewerModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  invoice: any
  onXmlSentToSap?: () => void // Callback para notificar al padre que se envió a SAP
}

export function PTYSSXmlViewerModal({ 
  open, 
  onOpenChange, 
  invoice,
  onXmlSentToSap 
}: PTYSSXmlViewerModalProps) {
  const { toast } = useToast()
  const [isSendingToSap, setIsSendingToSap] = useState(false)
  const [sapLogs, setSapLogs] = useState<any[]>([])
  const [showSapLogs, setShowSapLogs] = useState(false)
  // Estado local para manejar inmediatamente el estado "enviado a SAP"
  const [localSentToSap, setLocalSentToSap] = useState<boolean | null>(null)
  const [localSentToSapAt, setLocalSentToSapAt] = useState<string | null>(null)
  const [localSapFileName, setLocalSapFileName] = useState<string | null>(null)
  // Estado para protocolo (FTP por defecto)
  const [useSftp, setUseSftp] = useState(false)
  const [isTestingSftp, setIsTestingSftp] = useState(false)
  const [isTestingFtp, setIsTestingFtp] = useState(false)

  // Resetear estado local cuando cambie el invoice (ANTES del return condicional)
  useEffect(() => {
    if (invoice?.id) {
      setLocalSentToSap(null)
      setLocalSentToSapAt(null)
      setLocalSapFileName(null)
      setSapLogs([])
      setShowSapLogs(false)
      setUseSftp(false)
      setIsTestingSftp(false)
      setIsTestingFtp(false)
    }
  }, [invoice?.id])

  // Return condicional DESPUÉS de todos los hooks
  if (!invoice || !invoice.xmlData) return null

  const { xml, isValid, generatedAt } = invoice.xmlData

  // Usar el estado local si está disponible, sino usar los datos del invoice
  // Los datos de SAP ahora están en campos directos del invoice, no en xmlData
  const effectiveSentToSap = localSentToSap !== null ? localSentToSap : invoice.sentToSap
  const effectiveSentToSapAt = localSentToSapAt || invoice.sentToSapAt
  
  // Obtener el nombre del archivo que se usó para enviar a SAP
  const sapFileName = localSapFileName || invoice.sapFileName

  // Debug: Log para verificar el estado
  console.log("🔍 PTYSSXmlViewerModal - Estado SAP:", {
    localSentToSap,
    invoiceSentToSap: invoice.sentToSap,
    effectiveSentToSap,
    sapFileName: invoice.sapFileName,
    localSapFileName
  })

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
    
    // Usar el nombre de SAP si existe, sino generar uno nuevo para la descarga
    const downloadFileName = sapFileName || generateXmlFileName('9326')
    
    saveAs(blob, downloadFileName)
    toast({ 
      title: "XML descargado", 
      description: `El archivo XML ha sido descargado como ${downloadFileName}` 
    })
  }

  // Función para probar conexión SFTP
  const handleTestSftp = async () => {
    setIsTestingSftp(true)
    setSapLogs([])
    setShowSapLogs(true)
    
    try {
      console.log("🔧 Probando conexión SFTP...")
      
      const result = await testSftpConnection()
      
      console.log("✅ Resultado de test SFTP:", result)
      setSapLogs(result.logs || [])
      
      if (result.success) {
        toast({
          title: "Conexión SFTP exitosa",
          description: "La conexión SFTP está funcionando correctamente. Puedes usar SFTP para enviar XML.",
        })
        setUseSftp(true)
      } else {
        toast({
          title: "Error en conexión SFTP",
          description: result.message || "No se pudo establecer conexión SFTP",
          variant: "destructive"
        })
      }
      
    } catch (error: any) {
      console.error("❌ Error al probar SFTP:", error)
      setSapLogs(prev => [...prev, {
        timestamp: new Date().toISOString(),
        level: 'error',
        message: `Error: ${error.message}`,
        details: error
      }])
      
      toast({
        title: "Error al probar SFTP",
        description: error.message || "Error al conectar con SFTP",
        variant: "destructive"
      })
    } finally {
      setIsTestingSftp(false)
    }
  }

  // Función para probar conexión FTP tradicional
  const handleTestFtp = async () => {
    setIsTestingFtp(true)
    setSapLogs([])
    setShowSapLogs(true)
    
    try {
      console.log("🔧 Probando conexión FTP tradicional...")
      
      const result = await testFtpTraditional()
      
      console.log("✅ Resultado de test FTP:", result)
      setSapLogs(result.logs || [])
      
      if (result.success) {
        toast({
          title: "✅ Conexión FTP exitosa",
          description: "El servidor FTP tradicional está funcionando correctamente.",
        })
        setUseSftp(false)
      } else {
        toast({
          title: "❌ Error en conexión FTP",
          description: result.message || "No se pudo establecer conexión FTP.",
          variant: "destructive"
        })
      }
    } catch (error: any) {
      console.error("❌ Error al probar FTP:", error)
      toast({
        title: "❌ Error al probar FTP",
        description: error.message || "Error inesperado al probar conexión FTP.",
        variant: "destructive"
      })
    } finally {
      setIsTestingFtp(false)
    }
  }

  // Función para enviar a SAP
  const handleSendToSap = async () => {
    setIsSendingToSap(true)
    setSapLogs([])
    setShowSapLogs(true)
    
    try {
      // Generar nombre de archivo solo si no existe uno previo
      const fileNameToSend = sapFileName || generateXmlFileName('9326')
      
      console.log("🚀 Enviando XML a SAP vía FTP:", { 
        invoiceId: invoice.id, 
        fileName: fileNameToSend
      })
      
      // Usar FTP tradicional (método que funciona)
      const result = await sendXmlToSapFtp(invoice.id, xml, fileNameToSend)
      
      console.log("✅ Respuesta de SAP:", result)
      setSapLogs(result.logs || [])
      
      if (result.success) {
        // Actualizar estado local inmediatamente para UI responsive
        setLocalSentToSap(true)
        setLocalSentToSapAt(new Date().toISOString())
        setLocalSapFileName(fileNameToSend)
        
        console.log("🔄 Estado local actualizado:", {
          localSentToSap: true,
          localSentToSapAt: new Date().toISOString(),
          localSapFileName: fileNameToSend
        })
        
        // Notificar al componente padre para que actualice su estado
        if (onXmlSentToSap) {
          console.log("🔄 Notificando al componente padre...")
          onXmlSentToSap()
        }
        
        toast({
          title: "XML enviado exitosamente",
          description: `Archivo ${fileNameToSend} enviado a SAP vía FTP correctamente.`,
        })
        
        // NO cerrar el modal automáticamente para que el usuario vea el cambio
        console.log("✅ Estado local actualizado - UI debería mostrar 'Enviado a SAP'")
      } else {
        throw new Error(result.message || "Error al enviar XML")
      }
      
    } catch (error: any) {
      console.error("❌ Error al enviar XML a SAP:", error)
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
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return 'N/A'
    const year = date.getFullYear()
    // Year validation to prevent year 40000 issue
    if (year < 1900 || year > 2100) return 'N/A'
    return date.toLocaleString('es-ES')
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
                                        {/* Botones de test ocultos - descomentar si se necesitan para debugging
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleTestSftp}
                          disabled={isTestingSftp}
                          className={`flex items-center gap-2 ${
                            useSftp
                              ? 'text-purple-600 border-purple-600 bg-purple-50'
                              : 'text-gray-600 border-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          {isTestingSftp ? (
                            <>
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-purple-600"></div>
                              Probando...
                            </>
                          ) : (
                            <>
                              <Send className="h-3 w-3" />
                              {useSftp ? 'SFTP ✓' : 'Probar SFTP'}
                            </>
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleTestFtp}
                          disabled={isTestingFtp}
                          className={`flex items-center gap-2 ${
                            !useSftp
                              ? 'text-blue-600 border-blue-600 bg-blue-50'
                              : 'text-gray-600 border-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          {isTestingFtp ? (
                            <>
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                              Probando...
                            </>
                          ) : (
                            <>
                              <Send className="h-3 w-3" />
                              {!useSftp ? 'FTP ✓' : 'Probar FTP'}
                            </>
                          )}
                        </Button>
                        */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSendToSap}
                  disabled={isSendingToSap || !isValid || effectiveSentToSap}
                  className={`flex items-center gap-2 ${
                    effectiveSentToSap 
                      ? 'text-green-600 border-green-600 bg-green-50' 
                      : 'text-blue-600 border-blue-600 hover:bg-blue-50'
                  }`}
                >
                  {isSendingToSap ? (
                    <>
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                      Enviando...
                    </>
                  ) : effectiveSentToSap ? (
                    <>
                      <CheckCircle className="h-3 w-3" />
                      Enviado
                    </>
                  ) : (
                    <>
                      <Send className="h-3 w-3" />
                      Enviar a SAP
                    </>
                  )}
                </Button>
              </div>
            </div>
            <div className="border rounded-md p-3 bg-gray-50 min-h-[300px] max-h-[400px] overflow-auto">
              <pre className="font-mono text-xs whitespace-pre-wrap text-gray-800">
                {xml}
              </pre>
            </div>
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