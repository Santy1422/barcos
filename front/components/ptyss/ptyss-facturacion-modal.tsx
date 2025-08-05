"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { FileText, 
  Code, 
  AlertTriangle, 
  CheckCircle, 
  Calendar,
  DollarSign,
  User,
  Ship,
  Eye,
  Download
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { PTYSSRecordsViewModal } from "./ptyss-records-view-modal"
import { generatePTYSSInvoiceXML, validateXMLForSAP, generateXmlFileName, sendXmlToSap, type PTYSSInvoiceForXml } from "@/lib/xml-generator"
import { useAppSelector } from "@/lib/hooks"
import { selectAllIndividualRecords } from "@/lib/features/records/recordsSlice"
import { saveAs } from "file-saver"

interface PTYSSFacturacionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  invoice: any
  onFacturar: (invoiceNumber: string, xmlData?: { xml: string, isValid: boolean }, invoiceDate?: string) => Promise<void>
}

export function PTYSSFacturacionModal({ 
  open, 
  onOpenChange, 
  invoice, 
  onFacturar 
}: PTYSSFacturacionModalProps) {
  const { toast } = useToast()
  const [isProcessing, setIsProcessing] = useState(false)
  const [newInvoiceNumber, setNewInvoiceNumber] = useState("")
  const [invoiceDate, setInvoiceDate] = useState(() => {
    const today = new Date()
    return today.toISOString().split('T')[0] // Formato YYYY-MM-DD
  })
  const [actions, setActions] = useState({
    sendToSAP: false
  })
  const [showRecordsModal, setShowRecordsModal] = useState(false)
  const [generatedXml, setGeneratedXml] = useState<string>("")
  const [xmlValidation, setXmlValidation] = useState<{ isValid: boolean; errors: string[] } | null>(null)
  const [isSendingToSap, setIsSendingToSap] = useState(false)
  const [sapLogs, setSapLogs] = useState<any[]>([])
  const [showSapLogs, setShowSapLogs] = useState(false)
  
  // Obtener registros asociados para generar XML
  const allRecords = useAppSelector(selectAllIndividualRecords)
  const clients = useAppSelector((state) => state.clients.clients)

  // Generar número de factura por defecto
  const defaultInvoiceNumber = invoice?.invoiceNumber?.replace(/^PTY-PRE-/, "PTY-FAC-") || "PTY-FAC-000001"
  
  // Limpiar estado del XML cuando cambie la factura
  useEffect(() => {
    setGeneratedXml("")
    setXmlValidation(null)
    setNewInvoiceNumber("")
    setIsSendingToSap(false)
    setSapLogs([])
    setShowSapLogs(false)
    const today = new Date()
    setInvoiceDate(today.toISOString().split('T')[0])
         setActions({
       sendToSAP: false
     })
  }, [invoice?.id])
  
  // Función para generar XML de PTYSS
  const generateXMLForInvoice = () => {
    console.log("🔍 generateXMLForInvoice - Iniciando...")
    console.log("🔍 generateXMLForInvoice - invoice:", invoice)
    console.log("🔍 generateXMLForInvoice - newInvoiceNumber:", newInvoiceNumber)
    console.log("🔍 generateXMLForInvoice - invoiceDate:", invoiceDate)
    try {
      if (!invoice) {
        throw new Error("No hay datos de factura disponibles")
      }

      if (!newInvoiceNumber.trim()) {
        throw new Error("Debe ingresar el número de factura antes de generar el XML")
      }

      if (!invoiceDate) {
        throw new Error("Debe seleccionar la fecha de factura antes de generar el XML")
      }

      // Obtener registros relacionados
      console.log("🔍 generateXMLForInvoice - allRecords:", allRecords.length)
      console.log("🔍 generateXMLForInvoice - invoice.relatedRecordIds:", invoice.relatedRecordIds)
      const relatedRecords = allRecords.filter((record: any) => 
        invoice.relatedRecordIds && invoice.relatedRecordIds.includes(record._id || record.id)
      )
      console.log("🔍 generateXMLForInvoice - relatedRecords encontrados:", relatedRecords.length)

      if (relatedRecords.length === 0) {
        throw new Error("No se encontraron registros asociados a la factura")
      }

      // Buscar el cliente para obtener el número SAP
      const firstRecord = relatedRecords[0]
      const clientId = firstRecord.data?.clientId || invoice.clientId
      console.log("🔍 generateXMLForInvoice - clientId:", clientId)
      console.log("🔍 generateXMLForInvoice - clients disponibles:", clients.length)
      const client = clients.find((c: any) => (c._id || c.id) === clientId)
      console.log("🔍 generateXMLForInvoice - cliente encontrado:", client)
      
      let clientSapNumber = "0000000000" // Valor por defecto
      if (client && client.sapCode) {
        clientSapNumber = client.sapCode
      } else if (invoice.clientRuc) {
        clientSapNumber = invoice.clientRuc
      }
      console.log("🔍 generateXMLForInvoice - clientSapNumber final:", clientSapNumber)

      // Preparar datos para XML
      const invoiceForXml: PTYSSInvoiceForXml = {
        id: invoice.id,
        invoiceNumber: newInvoiceNumber,
        client: clientSapNumber, // Usar número SAP del cliente
        clientName: invoice.clientName,
        date: invoiceDate, // Usar fecha de factura seleccionada
        currency: "USD",
        total: invoice.totalAmount,
        records: relatedRecords.map((record: any) => ({
          id: record._id || record.id,
          data: record.data,
          totalValue: record.totalValue || 0
        }))
      }

      console.log("🔍 generateXMLForInvoice - Generando XML con datos:", invoiceForXml)
      const xml = generatePTYSSInvoiceXML(invoiceForXml)
      console.log("🔍 generateXMLForInvoice - XML generado, longitud:", xml.length)
      const validation = validateXMLForSAP(xml)
      console.log("🔍 generateXMLForInvoice - Validación:", validation)
      
      setGeneratedXml(xml)
      setXmlValidation(validation)
      
      if (validation.isValid) {
        toast({
          title: "XML generado exitosamente",
          description: "El XML cumple con todos los requisitos para SAP.",
          className: "bg-green-600 text-white"
        })
      } else {
        toast({
          title: "XML generado con advertencias",
          description: `Se encontraron ${validation.errors.length} problema(s). Revise los detalles.`,
          variant: "destructive"
        })
      }
      
      const result = { xml, isValid: validation.isValid }
      console.log("✅ generateXMLForInvoice - Retornando resultado:", result)
      return result
    } catch (error: any) {
      console.error("❌ generateXMLForInvoice - Error:", error)
      toast({
        title: "Error al generar XML",
        description: error.message || "No se pudo generar el XML",
        variant: "destructive"
      })
      return null
    }
  }

  // Función para enviar XML a SAP
  const handleSendToSap = async (invoiceId: string, xmlContent: string) => {
    setIsSendingToSap(true)
    setSapLogs([])
    setShowSapLogs(true)
    
    try {
      const fileName = generateXmlFileName()
      console.log("🚀 Enviando XML a SAP:", { invoiceId, fileName })
      
      const result = await sendXmlToSap(invoiceId, xmlContent, fileName)
      
      console.log("✅ Respuesta de SAP:", result)
      setSapLogs(result.logs || [])
      
      if (result.success) {
        toast({
          title: "XML enviado exitosamente",
          description: `Archivo ${fileName} enviado a SAP`,
        })
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

  const handleFacturar = async () => {
    if (!newInvoiceNumber.trim()) {
      toast({
        title: "Error",
        description: "Debe ingresar un número de factura",
        variant: "destructive"
      })
      return
    }

    if (!invoiceDate) {
      toast({
        title: "Error",
        description: "Debe seleccionar la fecha de factura",
        variant: "destructive"
      })
      return
    }

    setIsProcessing(true)
    try {
      // Siempre generar XML al facturar
      console.log("🔍 PTYSSFacturacionModal - Iniciando generación de XML...")
      let xmlData
      try {
        const xmlResult = generateXMLForInvoice()
        console.log("🔍 PTYSSFacturacionModal - Resultado de generateXMLForInvoice:", xmlResult)
        if (xmlResult) {
          xmlData = xmlResult
          console.log("✅ PTYSSFacturacionModal - XML generado exitosamente")
        } else {
          console.log("⚠️ PTYSSFacturacionModal - generateXMLForInvoice devolvió null")
          // Si no se pudo generar, crear un xmlData de error
          xmlData = {
            xml: "<!-- Error al generar XML -->",
            isValid: false
          }
        }
      } catch (xmlError) {
        console.error("❌ PTYSSFacturacionModal - Error al generar XML:", xmlError)
        // Crear xmlData de error
        xmlData = {
          xml: `<!-- Error al generar XML: ${xmlError} -->`,
          isValid: false
        }
      }
      
      console.log("🔍 PTYSSFacturacionModal - xmlData final que se enviará:", xmlData)
      
      // Si se marcó la opción de enviar a SAP, enviar antes de facturar para actualizar el estado
      if (actions.sendToSAP && xmlData && xmlData.xml && invoice?.id) {
        console.log("📤 Enviando a SAP antes de facturar para marcar estado...")
        try {
          const fileName = generateXmlFileName()
          const result = await sendXmlToSap(invoice.id, xmlData.xml, fileName)
          
          if (result.success) {
            // Marcar el xmlData como enviado a SAP
            xmlData = {
              ...xmlData,
              sentToSap: true,
              sentToSapAt: new Date().toISOString()
            }
            console.log("✅ XML enviado a SAP exitosamente, estado actualizado")
          } else {
            throw new Error(result.message || "Error al enviar XML")
          }
        } catch (sapError: any) {
          console.error("❌ Error al enviar XML a SAP:", sapError)
          toast({
            title: "Error al enviar XML a SAP",
            description: sapError.message || "Error al conectar con SAP",
            variant: "destructive"
          })
          // Continuar con la facturación aunque falle el envío a SAP
        }
      }
      
      await onFacturar(newInvoiceNumber, xmlData, invoiceDate)
      
      const xmlMessage = xmlData?.isValid 
        ? " XML generado y validado correctamente."
        : xmlData 
          ? " XML generado con advertencias."
          : " Error al generar XML."
      
      const sapMessage = actions.sendToSAP ? " Enviado a SAP." : ""
      
      toast({
        title: "Facturación completada",
        description: `La prefactura ha sido facturada como ${newInvoiceNumber}.${xmlMessage}${sapMessage}`,
        className: "bg-green-600 text-white"
      })
      
      // El modal se cierra desde el componente padre
    } catch (error: any) {
      toast({
        title: "Error en la facturación",
        description: error.message || "No se pudo completar la facturación",
        variant: "destructive"
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleActionChange = (action: keyof typeof actions, checked: boolean) => {
    setActions(prev => ({
      ...prev,
      [action]: checked
    }))
  }

  // Función para descargar XML
  const handleDownloadXml = () => {
    if (generatedXml) {
      const blob = new Blob([generatedXml], { type: "application/xml;charset=utf-8" })
      const filename = generateXmlFileName()
      
      saveAs(blob, filename)
      toast({ 
        title: "XML Descargado", 
        description: `El archivo XML ha sido descargado como ${filename}` 
      })
    }
  }

  if (!invoice) return null

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Facturar Prefactura - {invoice.invoiceNumber}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Información de la prefactura */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 p-4 rounded-lg">
              <div className="flex items-center mb-3">
                <h3 className="font-semibold text-blue-900 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" /> Información de la Prefactura
                </h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-blue-600" />
                  <span className="font-medium">Cliente:</span>
                  <span>{invoice.clientName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-blue-600" />
                  <span className="font-medium">Total:</span>
                  <span className="font-bold">${invoice.totalAmount.toFixed(2)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-blue-600" />
                  <span className="font-medium">Fecha Emisión:</span>
                  <span>{new Date(invoice.issueDate).toLocaleDateString('es-ES')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Ship className="h-4 w-4 text-blue-600" />
                  <span className="font-medium">Contenedores:</span>
                  <span>{invoice.relatedRecordIds?.length || 0}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowRecordsModal(true)}
                    className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50 ml-1"
                  >
                    <Eye className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Número de factura */}
            <div className="space-y-2">
              <Label htmlFor="invoice-number" className="text-sm font-semibold">
                Número de Factura *
              </Label>
              <Input
                id="invoice-number"
                value={newInvoiceNumber}
                onChange={(e) => setNewInvoiceNumber(e.target.value.toUpperCase())}
                placeholder={defaultInvoiceNumber}
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Ingresa el número de factura que se enviará a SAP
              </p>
            </div>

            {/* Fecha de factura */}
            <div className="space-y-2">
              <Label htmlFor="invoice-date" className="text-sm font-semibold">
                Fecha de Factura *
              </Label>
              <Input
                id="invoice-date"
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Esta fecha se usará en todos los campos de fecha del XML
              </p>
            </div>

            {/* Información importante */}
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
              <div className="flex items-start gap-2">
                <Code className="h-4 w-4 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-900">XML se genera automáticamente</p>
                  <p className="text-xs text-blue-700 mt-1">
                    Al facturar, se generará automáticamente el XML para SAP y se guardará en la factura.
                  </p>
                </div>
              </div>
            </div>

            {/* Acciones de facturación */}
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <FileText className="h-4 w-4" /> Acciones Adicionales
              </h3>
                             <div className="space-y-3">
                 <div className="flex items-center space-x-3 p-3 border border-gray-200">
                  <Checkbox
                    id="send-to-sap"
                    checked={actions.sendToSAP}
                    onCheckedChange={(checked) => handleActionChange('sendToSAP', checked as boolean)}
                  />
                  <div className="flex items-center gap-2 flex-1">
                    <Code className="h-4 w-4 text-green-600" />
                    <Label htmlFor="send-to-sap" className="font-medium">
                      Enviar XML a SAP (XML se genera automáticamente)
                    </Label>
                  </div>
                  {generatedXml && (
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant={xmlValidation?.isValid ? "default" : "destructive"} 
                        className="text-xs"
                      >
                        {xmlValidation?.isValid ? "✓ Válido" : "⚠ Con errores"}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleDownloadXml}
                        className="h-8 w-8 p-0"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Información del XML generado */}
            {generatedXml && xmlValidation && (
              <div className="space-y-3">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Code className="h-4 w-4" /> Estado del XML
                </h3>
                {xmlValidation.isValid ? (
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
                      <strong>XML con errores:</strong> Se encontraron {xmlValidation.errors.length} problema(s):
                      <ul className="mt-2 list-disc list-inside text-sm">
                        {xmlValidation.errors.slice(0, 3).map((error, index) => (
                          <li key={index}>{error}</li>
                        ))}
                        {xmlValidation.errors.length > 3 && (
                          <li>... y {xmlValidation.errors.length - 3} más</li>
                        )}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadXml}
                    className="flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Descargar XML
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setGeneratedXml("")}
                    className="text-red-600 hover:text-red-700"
                  >
                    Limpiar
                  </Button>
                </div>
              </div>
            )}

            {/* Botón para generar XML sin facturar */}
            {!generatedXml && (
              <div className="flex flex-col items-center space-y-2">
                <Button
                  variant="outline"
                  onClick={generateXMLForInvoice}
                  disabled={!newInvoiceNumber.trim() || !invoiceDate}
                  className="flex items-center gap-2 text-blue-600 border-blue-600 hover:bg-blue-50 disabled:text-gray-400 disabled:border-gray-300"
                >
                  <Code className="h-4 w-4" />
                  Vista previa del XML
                </Button>
                {(!newInvoiceNumber.trim() || !invoiceDate) && (
                  <p className="text-xs text-muted-foreground text-center">
                    {!newInvoiceNumber.trim() && !invoiceDate 
                      ? "Ingrese el número y fecha de factura para generar el XML"
                      : !newInvoiceNumber.trim() 
                        ? "Ingrese el número de factura para generar el XML"
                        : "Seleccione la fecha de factura para generar el XML"
                    }
                  </p>
                )}
              </div>
            )}

            {/* Logs de envío a SAP */}
            {showSapLogs && sapLogs.length > 0 && (
              <div className="mt-4 p-4 border rounded-lg bg-gray-50">
                <h4 className="font-semibold mb-3 text-sm flex items-center gap-2">
                  <Eye className="h-4 w-4" />
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
                          {log.level.toUpperCase()}
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

            {/* Botones */}
            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isProcessing}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleFacturar}
                disabled={isProcessing || !newInvoiceNumber.trim() || !invoiceDate}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {isProcessing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Facturando...
                  </>
                ) : (
                  <>
                    <FileText className="h-4 w-4 mr-2" />
                    Facturar
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de visualización de registros */}
      <PTYSSRecordsViewModal
        open={showRecordsModal}
        onOpenChange={setShowRecordsModal}
        invoice={invoice}
      />
    </>
  )
} 