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
import { generatePTYSSInvoiceXML, validateXMLForSAP, generateXmlFileName, sendXmlToSapFtp, setContainerTypesMap, clearMissingContainerTypes, getMissingContainerTypes, hasMissingContainerTypes, type PTYSSInvoiceForXml } from "@/lib/xml-generator"
import { useAppSelector, useAppDispatch } from "@/lib/hooks"
import { selectAllIndividualRecords, fetchAllRecordsByModule } from "@/lib/features/records/recordsSlice"
import { selectAllContainerTypes, fetchContainerTypes } from "@/lib/features/containerTypes/containerTypesSlice"
import saveAs from "file-saver"

interface PTYSSFacturacionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  invoice: any
  onFacturar: (invoiceNumber: string, xmlData?: { xml: string, isValid: boolean }, invoiceDate?: string, poNumber?: string) => Promise<void>
}

export function PTYSSFacturacionModal({
  open,
  onOpenChange,
  invoice,
  onFacturar
}: PTYSSFacturacionModalProps) {
  const { toast } = useToast()
  const dispatch = useAppDispatch()
  const [isProcessing, setIsProcessing] = useState(false)
  const [newInvoiceNumber, setNewInvoiceNumber] = useState("")
  const [poNumber, setPoNumber] = useState("")
  const [invoiceDate, setInvoiceDate] = useState(() => {
    const today = new Date()
    return today.toLocaleDateString('en-CA') // Formato YYYY-MM-DD en zona horaria local
  })
  const [showRecordsModal, setShowRecordsModal] = useState(false)
  const [generatedXml, setGeneratedXml] = useState<string>("")
  const [xmlValidation, setXmlValidation] = useState<{ isValid: boolean; errors: string[] } | null>(null)
  const [isSendingToSap, setIsSendingToSap] = useState(false)
  const [sapLogs, setSapLogs] = useState<any[]>([])
  const [showSapLogs, setShowSapLogs] = useState(false)
  const [showMissingTypesModal, setShowMissingTypesModal] = useState(false)
  const [missingTypes, setMissingTypes] = useState<string[]>([])

     // Obtener registros asociados para generar XML
   const allRecords = useAppSelector(selectAllIndividualRecords) || []
   const clients = useAppSelector((state) => state.clients.clients) || []
   const clientsLoading = useAppSelector((state) => state.clients.loading)
   const containerTypes = useAppSelector(selectAllContainerTypes) || []
   const recordsLoading = useAppSelector((state) => state.records.fetchingRecords)
   
   // Debug: Verificar estado del componente
   useEffect(() => {
     console.log('🔍 PTYSSFacturacionModal - ESTADO COMPLETO:')
     console.log('  - open:', open)
     console.log('  - invoice:', invoice?.id)
     console.log('  - allRecords type:', typeof allRecords)
     console.log('  - allRecords isArray:', Array.isArray(allRecords))
     console.log('  - allRecords length:', allRecords?.length ?? 'undefined')
     console.log('  - clients length:', clients?.length ?? 'undefined')
     console.log('  - clientsLoading:', clientsLoading)
     console.log('  - recordsLoading:', recordsLoading)
     console.log('  - containerTypes length:', containerTypes?.length ?? 'undefined')
   }, [open, invoice, allRecords, clients, clientsLoading, recordsLoading, containerTypes])

  // Formatear fecha de emisión como día civil local (evita desfase por UTC)
  const formatIssueDate = (dateString: string) => {
    if (!dateString) return 'N/A'
    const s = String(dateString).slice(0, 10)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return new Date(dateString).toLocaleDateString('es-ES')
    const [y, m, d] = s.split('-').map(Number)
    if (y < 1900 || y > 2100) return 'N/A'
    return new Date(y, m - 1, d).toLocaleDateString('es-ES')
  }

  // Generar número de factura por defecto
  const defaultInvoiceNumber = invoice?.invoiceNumber?.replace(/^PTY-PRE-/, "PTY-FAC-") || "PTY-FAC-000001"
  
  // Limpiar estado del XML cuando cambie la factura
  useEffect(() => {
    setGeneratedXml("")
    setXmlValidation(null)
    setNewInvoiceNumber("")
    setPoNumber("")
    setIsSendingToSap(false)
    setSapLogs([])
    setShowSapLogs(false)
    setShowMissingTypesModal(false)
    setMissingTypes([])
    const today = new Date()
    setInvoiceDate(today.toLocaleDateString('en-CA'))

    // Cargar container types para homologación SAP y registros
    if (open) {
      dispatch(fetchContainerTypes())
      // Cargar registros PTYSS si no hay registros cargados
      if (allRecords.length === 0) {
        console.log("🔄 PTYSSFacturacionModal - Cargando registros PTYSS...")
        dispatch(fetchAllRecordsByModule('ptyss'))
      }
    }
  }, [invoice?.id, open, dispatch, allRecords.length])

  // Actualizar el mapa de containerTypes para homologación SAP
  useEffect(() => {
    if (containerTypes && containerTypes.length > 0) {
      console.log("🗺️ PTYSS - Actualizando mapa de containerTypes para homologación SAP:", containerTypes.length, "tipos")
      setContainerTypesMap(containerTypes.map((ct: any) => ({
        code: ct.code,
        sapCode: ct.sapCode,
        category: ct.category
      })))
    }
  }, [containerTypes])
  
  // Función para generar XML de PTYSS
  const generateXMLForInvoice = () => {
    // Limpiar tipos de contenedor faltantes antes de generar
    clearMissingContainerTypes()

    console.log("🔍 generateXMLForInvoice - Iniciando...")
    console.log("🔍 generateXMLForInvoice - invoice:", invoice)
    console.log("🔍 generateXMLForInvoice - newInvoiceNumber:", newInvoiceNumber)
    console.log("🔍 generateXMLForInvoice - invoiceDate:", invoiceDate)
    console.log("🔍 generateXMLForInvoice - allRecords disponibles:", allRecords?.length || 0)
    console.log("🔍 generateXMLForInvoice - recordsLoading:", recordsLoading)

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

      // Validar que los registros estén disponibles
      if (!allRecords || !Array.isArray(allRecords)) {
        throw new Error("Los registros no están disponibles. Por favor, recarga la página e intenta de nuevo.")
      }

      if (recordsLoading) {
        throw new Error("Los registros están siendo cargados. Por favor, espera un momento e intenta de nuevo.")
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
      const data = firstRecord.data as Record<string, any>
      const clientId = data?.clientId
      const recordType = data?.recordType
      const associate = data?.associate
      
      console.log("🔍 generateXMLForInvoice - firstRecord completo:", firstRecord)
      console.log("🔍 generateXMLForInvoice - data completo:", data)
      console.log("🔍 generateXMLForInvoice - clientId:", clientId)
      console.log("🔍 generateXMLForInvoice - recordType:", recordType)
      console.log("🔍 generateXMLForInvoice - associate:", associate)
      console.log("🔍 generateXMLForInvoice - clients disponibles:", clients.length)
      console.log("🔍 generateXMLForInvoice - clients cargando:", clientsLoading)
      
      // Verificar que los clientes no estén cargando
      if (clientsLoading) {
        throw new Error("Los clientes están siendo cargados. Por favor, espere un momento y vuelva a intentar.")
      }
      
      let client = null
      
      // Determinar si es trasiego basado en múltiples indicadores
      // Para PTYSS, los registros de trasiego son los que tienen:
      // 1. recordType === 'trasiego' (establecido en ptyss-upload)
      // 2. Tienen line (subcliente del Excel) pero el cliente real es PTG
      // 3. Tienen matchedPrice y matchedRouteId (fueron matcheados con rutas)
      const isTrasiego = recordType === 'trasiego' || 
                        (data?.line && data?.matchedPrice && !data?.localRouteId) ||
                        (invoice.clientName && invoice.clientName.toLowerCase() === 'ptg')
      
      console.log('🔍 generateXMLForInvoice - isTrasiego:', isTrasiego)
      console.log('🔍 generateXMLForInvoice - recordType:', recordType)
      console.log('🔍 generateXMLForInvoice - data.line:', data?.line)
      console.log('🔍 generateXMLForInvoice - data.matchedPrice:', data?.matchedPrice)
      console.log('🔍 generateXMLForInvoice - data.localRouteId:', data?.localRouteId)
      console.log('🔍 generateXMLForInvoice - invoice.clientName:', invoice.clientName)
      
      // Buscar cliente por clientId primero (tanto para trasiego como locales)
      if (clientId && clientId.trim() !== '') {
        client = clients.find((c: any) => (c._id || c.id) === clientId)
        console.log('🔍 generateXMLForInvoice - Cliente encontrado por ID:', client?.companyName || client?.fullName)
      }
      
      // Si no hay clientId, buscar por associate (nombre del cliente de Driver Name)
      if (!client && associate) {
        const associateTrimmed = associate.trim()
        client = clients.find((c: any) => {
          const name = c.name?.toLowerCase().trim() || ''
          const companyName = c.companyName?.toLowerCase().trim() || ''
          const fullName = c.fullName?.toLowerCase().trim() || ''
          const associateLower = associateTrimmed.toLowerCase()
          
          return name === associateLower || companyName === associateLower || fullName === associateLower
        })
        console.log('🔍 generateXMLForInvoice - Cliente encontrado por nombre (associate):', client?.companyName || client?.fullName)
      }
      
      // Si aún no se encontró el cliente y es local, mostrar error
      if (!client && !isTrasiego) {
        throw new Error("El registro local no tiene un cliente asociado (clientId). Por favor, verifique la configuración del registro.")
      }
      
      // Si aún no se encontró el cliente y es trasiego, mostrar error
      if (!client && isTrasiego) {
        console.log('❌ generateXMLForInvoice - NO SE ENCONTRÓ CLIENTE para trasiego')
        console.log('🔍 generateXMLForInvoice - clientId:', clientId)
        console.log('🔍 generateXMLForInvoice - associate:', associate)
        console.log('🔍 generateXMLForInvoice - Total clientes cargados:', clients.length)
        throw new Error(`No se encontró el cliente para el registro de trasiego. ClientId: ${clientId || 'N/A'}, Associate: ${associate || 'N/A'}. Por favor, verifique que el cliente esté configurado en el sistema.`)
      }
      
      console.log("🔍 generateXMLForInvoice - cliente final:", client)
      
      // Validar que el cliente tenga código SAP configurado
      if (!client) {
        throw new Error(`No se encontró el cliente en la lista de clientes. ClientId: ${clientId || 'N/A'}, Associate: ${associate || 'N/A'}. Por favor, verifique que el cliente esté configurado en el sistema.`)
      }
      if (!client.sapCode) {
        throw new Error(`El cliente ${client.companyName || client.fullName} no tiene código SAP configurado. Por favor, configure el código SAP del cliente antes de generar el XML.`)
      }
      let clientSapNumber = client.sapCode
      console.log("🔍 generateXMLForInvoice - clientSapNumber final:", clientSapNumber)

      // Preparar datos para XML - pasar los registros originales para que el generador haga la agrupación.
      // Locales → un solo OtherItem TRK001. Trasiego → un OtherItem TRK002 agregado + servicios adicionales.
      // localRecordsOnly = true solo cuando hay al menos un registro local y ninguno trasiego.
      const anyRecordIsTrasiego = relatedRecords.some((r: any) => {
        const d = r.data || {}
        return d.recordType === 'trasiego' || (Boolean(d.line) && Boolean(d.matchedPrice) && !d.localRouteId)
      })
      const anyRecordIsLocal = relatedRecords.some((r: any) => {
        const d = r.data || {}
        return d.recordType === 'local' || !!d.localRouteId || r.recordType === 'local' || !!r.localRouteId
      })
      const localRecordsOnly = anyRecordIsLocal && !anyRecordIsTrasiego
      console.log('🔍 generateXMLForInvoice - localRecordsOnly:', localRecordsOnly, 'anyRecordIsLocal:', anyRecordIsLocal, 'anyRecordIsTrasiego:', anyRecordIsTrasiego)

      const invoiceForXml: PTYSSInvoiceForXml = {
        id: invoice.id,
        invoiceNumber: newInvoiceNumber,
        client: clientSapNumber, // Usar número SAP del cliente
        clientName: invoice.clientName,
        date: invoiceDate, // Usar fecha de factura seleccionada
        currency: "USD",
        total: invoice.totalAmount,
        localRecordsOnly,
        records: relatedRecords.map((record: any) => {
          const d = record.data || {}
          return {
            id: record._id || record.id,
            data: {
              ...d,
              recordType: d.recordType ?? record.recordType,
              localRouteId: d.localRouteId ?? record.localRouteId,
              localRoutePrice: d.localRoutePrice ?? record.localRoutePrice
            },
            totalValue: record.totalValue || 0
          }
        }),
        // Incluir servicios adicionales locales fijos (solo se usan cuando localRecordsOnly es false, i.e. trasiego)
        additionalServices: invoice.details?.additionalServices || []
      }

      console.log("🔍 generateXMLForInvoice - Generando XML con datos:", invoiceForXml)
      const xml = generatePTYSSInvoiceXML(invoiceForXml)
      console.log("🔍 generateXMLForInvoice - XML generado, longitud:", xml.length)

      // Verificar si hay tipos de contenedor faltantes
      if (hasMissingContainerTypes()) {
        const missing = getMissingContainerTypes()
        console.warn("⚠️ Tipos de contenedor no configurados:", missing)
        setMissingTypes(missing)
        setShowMissingTypesModal(true)
      }

      const validation = validateXMLForSAP(xml)
      console.log("🔍 generateXMLForInvoice - Validación:", validation)

      setGeneratedXml(xml)
      setXmlValidation(validation)

      if (validation.isValid && !hasMissingContainerTypes()) {
        toast({
          title: "XML generado exitosamente",
          description: "El XML cumple con todos los requisitos para SAP.",
          className: "bg-green-600 text-white"
        })
      } else if (hasMissingContainerTypes()) {
        toast({
          title: "Advertencia",
          description: `Hay ${getMissingContainerTypes().length} tipo(s) de contenedor sin configurar en SAP.`,
          variant: "destructive"
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
      console.error("❌ generateXMLForInvoice - Error stack:", error.stack)
      console.error("❌ generateXMLForInvoice - Estado al momento del error:")
      console.error("  - allRecords type:", typeof allRecords)
      console.error("  - allRecords isArray:", Array.isArray(allRecords))
      console.error("  - allRecords length:", allRecords?.length ?? 'undefined')
      console.error("  - clients length:", clients?.length ?? 'undefined')
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
      const fileName = generateXmlFileName('9326')
      console.log("🚀 Enviando XML a SAP vía FTP:", { invoiceId, fileName })
      
      const result = await sendXmlToSapFtp(invoiceId, xmlContent, fileName)
      
      console.log("✅ Respuesta de SAP:", result)
      setSapLogs(result.logs || [])
      
      if (result.success) {
        toast({
          title: "XML enviado exitosamente",
          description: `Archivo ${fileName} enviado a SAP vía FTP`,
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
      
      await onFacturar(newInvoiceNumber, xmlData, invoiceDate, poNumber)
      
      const xmlMessage = xmlData?.isValid 
        ? " XML generado y validado correctamente."
        : xmlData 
          ? " XML generado con advertencias."
          : " Error al generar XML."
      
      toast({
        title: "Facturación completada",
        description: `La prefactura ha sido facturada como ${newInvoiceNumber}.${xmlMessage}`,
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


  // Función para descargar XML (PTYSS siempre usa companyCode 9326 en el nombre)
  const handleDownloadXml = () => {
    if (generatedXml) {
      const blob = new Blob([generatedXml], { type: "application/xml;charset=utf-8" })
      const filename = generateXmlFileName('9326')
      
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
                  <span>{formatIssueDate(invoice.issueDate)}</span>
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

            {/* Número de PO */}
            <div className="space-y-2">
              <Label htmlFor="po-number" className="text-sm font-semibold">
                Numero de PO (opcional)
              </Label>
              <Input
                id="po-number"
                value={poNumber}
                onChange={(e) => setPoNumber(e.target.value.toUpperCase())}
                placeholder="Ej: PO-12345"
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Este campo aparecera solo en el PDF, no en el XML
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

            {/* Advertencia si los clientes o registros están cargando */}
            {(clientsLoading || recordsLoading) && (
              <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-yellow-900">
                      {clientsLoading && recordsLoading
                        ? "Cargando clientes y registros..."
                        : clientsLoading
                          ? "Cargando clientes..."
                          : "Cargando registros..."}
                    </p>
                    <p className="text-xs text-yellow-700 mt-1">
                      Espere un momento mientras se cargan los datos antes de facturar.
                    </p>
                  </div>
                </div>
              </div>
            )}

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
                  disabled={!newInvoiceNumber.trim() || !invoiceDate || recordsLoading || clientsLoading}
                  className="flex items-center gap-2 text-blue-600 border-blue-600 hover:bg-blue-50 disabled:text-gray-400 disabled:border-gray-300"
                >
                  <Code className="h-4 w-4" />
                  {recordsLoading ? "Cargando registros..." : "Vista previa del XML"}
                </Button>
                {(!newInvoiceNumber.trim() || !invoiceDate) && !recordsLoading && (
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
                disabled={isProcessing || !newInvoiceNumber.trim() || !invoiceDate || clientsLoading || recordsLoading}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {isProcessing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Facturando...
                  </>
                ) : clientsLoading || recordsLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {clientsLoading ? "Cargando clientes..." : "Cargando registros..."}
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

      {/* Modal de advertencia para tipos de contenedor faltantes */}
      <Dialog open={showMissingTypesModal} onOpenChange={setShowMissingTypesModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-600">
              <AlertTriangle className="h-5 w-5" />
              Tipos de Contenedor No Configurados
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Alert className="border-orange-200 bg-orange-50">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-800">
                Los siguientes tipos de contenedor no están configurados en el sistema y SAP los rechazará:
              </AlertDescription>
            </Alert>

            <div className="bg-gray-100 p-4 rounded-lg">
              <div className="flex flex-wrap gap-2">
                {missingTypes.map((type, index) => (
                  <Badge key={index} variant="destructive" className="text-sm font-mono">
                    {type}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="text-sm text-gray-600 space-y-2">
              <p><strong>Para solucionar esto:</strong></p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Ve a <strong>Configuración → Tipos de Contenedor</strong></li>
                <li>Agrega los tipos faltantes con su código SAP correspondiente</li>
                <li>Vuelve a generar el XML</li>
              </ol>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowMissingTypesModal(false)}>
                Entendido
              </Button>
              <Button
                className="bg-orange-600 hover:bg-orange-700"
                onClick={() => {
                  setShowMissingTypesModal(false)
                  window.open('/configuracion', '_blank')
                }}
              >
                Ir a Configuración
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
} 