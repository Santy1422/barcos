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
import { useAppSelector, useAppDispatch } from "@/lib/hooks"
import { selectAllIndividualRecords, selectAutoridadesRecords, fetchAutoridadesRecords } from "@/lib/features/records/recordsSlice"
import { selectAllServices, fetchServices } from "@/lib/features/services/servicesSlice"
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
  const dispatch = useAppDispatch()
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
  const autoridadesRecords = useAppSelector(selectAutoridadesRecords)
  const services = useAppSelector(selectAllServices)
  
  // Detectar si es una factura AUTH
  const isAuthInvoice = invoice?.invoiceNumber?.toString().toUpperCase().startsWith('AUTH-')

  useEffect(() => {
    setGeneratedXml("")
    setXmlValidation(null)
    setNewInvoiceNumber("")
    setIsSendingToSap(false)
    setSapLogs([])
    setShowSapLogs(false)
    
    // Cargar servicios para los impuestos PTG
    if (open) {
      dispatch(fetchServices())
    }
    
    // Pre-rellenar el número de factura para prefacturas AUTH
    if (invoice?.invoiceNumber?.toString().toUpperCase().startsWith('AUTH-')) {
      const invoiceNum = invoice.invoiceNumber.toString()
      const suggestedNumber = invoiceNum.replace(/^AUTH-/, `AUTH-FAC-${Date.now().toString().slice(-6)}-`)
      setNewInvoiceNumber(suggestedNumber)
    }
    const today = new Date(); setInvoiceDate(today.toISOString().split('T')[0])
    setActions({ sendToSAP: false })
  }, [invoice?.id, open, dispatch])

  // Cargar registros de autoridades cuando se abre el modal
  useEffect(() => {
    if (open && isAuthInvoice) {
      console.log("Cargando registros de autoridades para factura AUTH...")
      dispatch(fetchAutoridadesRecords())
    }
  }, [open, isAuthInvoice, dispatch])

  // Debug: monitorear cambios en registros de autoridades
  useEffect(() => {
    console.log("=== DEBUG: Autoridades records changed ===")
    console.log("autoridadesRecords.length:", autoridadesRecords.length)
    console.log("isAuthInvoice:", isAuthInvoice)
    console.log("invoice.relatedRecordIds:", invoice?.relatedRecordIds)
    if (autoridadesRecords.length > 0) {
      console.log("Primeros 3 registros de autoridades:", autoridadesRecords.slice(0, 3))
    }
  }, [autoridadesRecords, isAuthInvoice, invoice?.relatedRecordIds])

  // Función para generar XML específico para facturas AUTH
  const generateAuthXML = (records: any[]) => {
    console.log("=== DEBUG: generateAuthXML ===")
    console.log("AUTH Records:", records)

    // Agrupar registros por BL Number
    const groupedByBL = new Map<string, any[]>()
    records.forEach((record: any) => {
      const blNumber = record.blNumber || 'Sin BL'
      if (!groupedByBL.has(blNumber)) {
        groupedByBL.set(blNumber, [])
      }
      groupedByBL.get(blNumber)!.push(record)
    })

    console.log("Grouped by BL:", groupedByBL)

    const authRecords: any[] = []

    // Para cada BL Number
    groupedByBL.forEach((blRecords, blNumber) => {
      console.log(`Processing BL: ${blNumber} with ${blRecords.length} records`)

      // 1. Agrupar contenedores por características similares (AUTH type, precio, etc.)
      const groupedContainers = new Map<string, { records: any[], count: number, totalPrice: number }>()
      
      blRecords.forEach((record: any) => {
        const authType = (record.auth || '').toString().toUpperCase().trim()
        let serviceCode = ''
        
        if (authType === 'APA') {
          serviceCode = 'TRK182'
        } else if (authType === 'QUA') {
          serviceCode = 'TRK175'
        } else {
          console.warn(`AUTH type no reconocido: ${authType}, usando TRK182 por defecto`)
          serviceCode = 'TRK182'
        }

        const unitPrice = parseFloat(record.seal) || 0
        const fe = record.fe ? (record.fe.toString().toUpperCase().trim() === 'F' ? 'FULL' : 'EMPTY') : 'FULL'
        
        // Crear clave única para agrupar contenedores similares
        const groupKey = `${serviceCode}-${unitPrice}-${fe}-${blNumber}`
        
        if (!groupedContainers.has(groupKey)) {
          groupedContainers.set(groupKey, {
            records: [],
            count: 0,
            totalPrice: 0
          })
        }
        
        const group = groupedContainers.get(groupKey)!
        group.records.push(record)
        group.count += 1
        group.totalPrice += unitPrice
      })

      // Convertir grupos a registros agrupados
      groupedContainers.forEach((group, groupKey) => {
        const [serviceCode, unitPrice, fe, blNumber] = groupKey.split('-')
        const authType = serviceCode === 'TRK175' ? 'QUA' : 'APA'
        
        const authRecord = {
          id: `${blNumber}-${serviceCode}-${group.count}`,
          description: `${authType} - BL ${blNumber} (${group.count} contenedores)`,
          quantity: group.count,
          unitPrice: parseFloat(unitPrice),
          totalPrice: group.totalPrice,
          serviceCode: serviceCode,
          unit: 'SERVICIO',
          blNumber: blNumber,
          containerNumber: '', // No específico para contenedores agrupados
          containerSize: '', // Se asigna solo para QUA
          containerType: '', // Se asigna solo para QUA
          containerIsoCode: '',
          fullEmptyStatus: fe,
          businessType: 'IMPORT',
          internalOrder: group.records[0]?.order || '',
          ctrCategory: '', // Se asigna solo para QUA
          subcontracting: 'N'
        }

        // Para QUA, agregar información de contenedor del primer registro
        if (authType === 'QUA' && group.records.length > 0) {
          const firstRecord = group.records[0]
          authRecord.containerSize = firstRecord.size || firstRecord.containerSize || ''
          authRecord.containerType = firstRecord.type || firstRecord.containerType || ''
          // Determinar CtrCategory basado en tipo detectado o por defecto 'D'
          authRecord.ctrCategory = firstRecord.detectedContainerType === 'reefer' ? 'R' : 'D'
        }

        authRecords.push(authRecord)
      })

      // 2. Agrupar NOTF por BL Number
      const notfRecords = blRecords
        .filter(r => r.order && !isNaN(parseFloat(r.order)) && r.notf && parseFloat(r.notf) > 0)
        .sort((a, b) => parseFloat(a.order) - parseFloat(b.order))
      
      if (notfRecords.length > 0) {
        // Agrupar NOTF por precio
        const groupedNOTF = new Map<number, { records: any[], count: number, totalPrice: number }>()
        
        notfRecords.forEach((record: any) => {
          const notfValue = parseFloat(record.notf) || 0
          
          if (!groupedNOTF.has(notfValue)) {
            groupedNOTF.set(notfValue, {
              records: [],
              count: 0,
              totalPrice: 0
            })
          }
          
          const group = groupedNOTF.get(notfValue)!
          group.records.push(record)
          group.count += 1
          group.totalPrice += notfValue
        })

        // Convertir grupos NOTF a registros agrupados
        groupedNOTF.forEach((group, notfValue) => {
          const blAuthRecord = {
            id: `${blNumber}-TRK009-${group.count}`,
            description: `NOTF - BL ${blNumber} (${group.count} registros)`,
            quantity: group.count,
            unitPrice: notfValue,
            totalPrice: group.totalPrice,
            serviceCode: 'TRK009',
            unit: 'SERVICIO',
            blNumber: blNumber,
            containerNumber: '',
            containerSize: '',
            containerType: '',
            containerIsoCode: '',
            fullEmptyStatus: 'FULL',
            businessType: 'IMPORT',
            internalOrder: group.records[0]?.order || '',
            ctrCategory: '',
            subcontracting: 'N'
          }

          authRecords.push(blAuthRecord)
        })
      }
    })

    console.log("Final AUTH records for XML (grouped):", authRecords)

    // Construir payload para generateInvoiceXML
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
      records: authRecords,
      status: 'finalized' as const,
    }

    console.log("AUTH XML payload:", xmlPayload)

    // Generar y validar XML
    const xml = generateInvoiceXML(xmlPayload as any)
    const validation = validateXMLForSAP(xml)
    
    setGeneratedXml(xml)
    setXmlValidation(validation)
    
    return { xml, isValid: validation.isValid }
  }

  const generateXMLForInvoice = () => {
    try {
      console.log("=== DEBUG: generateXMLForInvoice ===")
      console.log("Invoice:", invoice)
      console.log("Is AUTH Invoice:", isAuthInvoice)
      console.log("All records:", allRecords)
      console.log("Autoridades records:", autoridadesRecords)
      
      if (!invoice) throw new Error("No hay datos de factura disponibles")
      if (!newInvoiceNumber.trim()) throw new Error("Debe ingresar el número de factura")
      if (!invoiceDate) throw new Error("Debe seleccionar la fecha de factura")
      
      // Usar los registros correctos según el tipo de factura
      const recordsToSearch = isAuthInvoice ? autoridadesRecords : allRecords
      console.log("Records to search in:", recordsToSearch)
      console.log("recordsToSearch.length:", recordsToSearch.length)
      
      // Para facturas AUTH, verificar que se hayan cargado los registros de autoridades
      if (isAuthInvoice && autoridadesRecords.length === 0) {
        throw new Error("Los registros de autoridades no están cargados. Intenta cerrar y abrir el modal nuevamente.")
      }
      
      const relatedRecords = recordsToSearch.filter((record: any) => invoice.relatedRecordIds?.includes(record._id || record.id))
      console.log("Related records found:", relatedRecords)
      console.log("Related records found count:", relatedRecords.length)
      
      if (relatedRecords.length === 0) {
        const errorMsg = isAuthInvoice 
          ? "No se encontraron registros de autoridades asociados a la factura. Verifica que los registros no hayan sido eliminados." 
          : "No se encontraron registros asociados a la factura"
        throw new Error(errorMsg)
      }
      
      // Para facturas AUTH, generar XML con estructura específica
      if (isAuthInvoice) {
        console.log("Factura AUTH detectada - generando XML específico")
        return generateAuthXML(relatedRecords)
      }
      
      console.log("Related records:", relatedRecords)

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
          console.log(`Record ${r._id || r.id}:`, r)
          console.log(`Record data:`, d)
          console.log(`Campo fe:`, d.fe)
          
          const unitPrice = Number(d.matchedPrice || r.totalValue || 0)
          const desc = d.description || `Servicio de transporte - Container: ${d.container || d.contenedor || ''}`
          
          // Determinar el estado Full/Empty basado en el campo fe
          let fullEmptyStatus = 'FULL' // Valor por defecto
          if (d.fe) {
            const feValue = d.fe.toString().toUpperCase().trim()
            console.log(`FE value: "${feValue}"`)
            if (feValue === 'F') {
              fullEmptyStatus = 'FULL'
            } else if (feValue === 'E') {
              fullEmptyStatus = 'EMPTY'
            }
            console.log(`FullEmpty status: "${fullEmptyStatus}"`)
          } else {
            console.log(`No hay campo fe, usando valor por defecto`)
          }
          
          // Determinar CtrCategory basado en el tipo de contenedor detectado
          let ctrCategory = 'D' // Valor por defecto para DRY
          if (d.detectedContainerType) {
            if (d.detectedContainerType === 'reefer') {
              ctrCategory = 'R'
            } else if (d.detectedContainerType === 'dry') {
              ctrCategory = 'D'
            }
            console.log(`Detected container type: "${d.detectedContainerType}" -> CtrCategory: "${ctrCategory}"`)
          } else {
            console.log(`No hay detectedContainerType, usando valor por defecto CtrCategory: "${ctrCategory}"`)
          }
          
          const recordForXml = {
            id: r._id || r.id,
            description: desc,
            quantity: 1,
            unitPrice,
            totalPrice: unitPrice,
            serviceCode: d.serviceCode || 'TRK002',
            activityCode: 'TRK',
            unit: 'VIAJE',
            blNumber: d.bl || '',
            containerNumber: d.container || d.contenedor || '',
            containerSize: d.size || d.containerSize || '',
            containerType: d.type || d.containerType || '',
            containerIsoCode: d.containerIsoCode || '42G1',
            fullEmptyStatus: fullEmptyStatus,
            route: d.leg || `${d.from || ''} / ${d.to || ''}`,
            commodity: 'TRUCK',
            // Campos adicionales requeridos por el XML
            businessType: d.moveType || 'IMPORT',
            internalOrder: d.internalOrder || '',
            ctrCategory: ctrCategory,
            subcontracting: d.subcontracting || 'N'
          }
          
          console.log(`Record for XML:`, recordForXml)
          return recordForXml
        })
      } as any

      // Agregar impuestos PTG como otherItems (solo para facturas de trasiego, no AUTH)
      if (!isAuthInvoice) {
        console.log("=== DEBUG: Agregando impuestos PTG ===")
        console.log("Services:", services)
        console.log("Services length:", services.length)
        
        // Calcular contenedores llenos para los impuestos
        const fullContainers = relatedRecords.filter((r: any) => {
          const d = r.data || {}
          const fe = d.fe || ''
          const isFullContainer = fe.toString().toUpperCase().trim() === 'F'
          console.log(`Container ${d.container}: FE="${fe}" -> Full: ${isFullContainer}`)
          return isFullContainer
        })
        const totalFullContainers = fullContainers.length
        
        console.log("Total full containers:", totalFullContainers)
        console.log("Full containers:", fullContainers)
        
        const otherItems: any[] = []
        
        if (totalFullContainers > 0) {
          // Buscar los impuestos PTG en los servicios
          const customsTax = services.find(s => s.module === 'trucking' && s.name === 'Aduana' && s.isActive)
          const adminFeeTax = services.find(s => s.module === 'trucking' && s.name === 'Administration Fee' && s.isActive)
          
          console.log("Aduana tax found:", customsTax)
          console.log("Admin fee tax found:", adminFeeTax)
          
          // Agregar Aduana como otheritem
          if (customsTax && customsTax.price > 0) {
            console.log("Adding Aduana tax to otherItems")
            const customsTotal = customsTax.price * totalFullContainers
            const customsItem = {
              serviceCode: 'TRK135',
              description: 'Aduana',
              quantity: totalFullContainers,
              unitPrice: customsTax.price,
              totalPrice: customsTotal,
              unit: 'VIAJE',
              // Campos adicionales requeridos
              IncomeRebateCode: 'N',
              AmntTransacCur: -customsTotal,
              ProfitCenter: 'PTG',
              Activity: 'TRUCKING',
              Pillar: 'LOGISTICS',
              BUCountry: 'PA',
              ServiceCountry: 'PA',
              ClientType: 'EXTERNAL',
              // Solo para Aduana
              FullEmpty: 'FULL'
            }
            console.log("Aduana item to add:", customsItem)
            otherItems.push(customsItem)
          }
          
          // Agregar Administration Fee como otheritem
          if (adminFeeTax && adminFeeTax.price > 0) {
            console.log("Adding Administration Fee tax to otherItems")
            const adminFeeTotal = adminFeeTax.price * totalFullContainers
            const adminFeeItem = {
              serviceCode: 'TRK130',
              description: 'Administration Fee',
              quantity: totalFullContainers,
              unitPrice: adminFeeTax.price,
              totalPrice: adminFeeTotal,
              unit: 'VIAJE',
              // Campos adicionales requeridos
              IncomeRebateCode: 'N',
              AmntTransacCur: -adminFeeTotal,
              ProfitCenter: 'PTG',
              Activity: 'TRUCKING',
              Pillar: 'LOGISTICS',
              BUCountry: 'PA',
              ServiceCountry: 'PA',
              ClientType: 'EXTERNAL'
            }
            console.log("Admin fee item to add:", adminFeeItem)
            otherItems.push(adminFeeItem)
          }
        }
        
        // Agregar servicios adicionales como otheritems
        if (invoice.details?.additionalServices && Array.isArray(invoice.details.additionalServices)) {
          console.log("=== DEBUG: Servicios adicionales en modal ===")
          console.log("Additional services found:", invoice.details.additionalServices)
          
          invoice.details.additionalServices.forEach((additionalService: any) => {
            console.log("Processing additional service:", additionalService)
            
            // Buscar el servicio en la base de datos para obtener el serviceCode real
            const serviceFromDb = services.find((s: any) => s._id === additionalService.id)
            const serviceCode = serviceFromDb?.name || 'TRK999' // Usar el name como serviceCode (ej: "TRK006")
            const serviceDescription = serviceFromDb?.description || additionalService.description || additionalService.name || 'Servicio Adicional'
            
            console.log("Service from DB:", serviceFromDb)
            console.log("Using serviceCode:", serviceCode)
            
            const additionalServiceItem = {
              serviceCode: serviceCode, // Usar el serviceCode real de la DB
              description: serviceDescription,
              quantity: 1,
              unitPrice: additionalService.amount || 0,
              totalPrice: additionalService.amount || 0,
              unit: 'VIAJE',
              // Campos adicionales requeridos
              IncomeRebateCode: 'N',
              AmntTransacCur: (-(additionalService.amount || 0)).toFixed(3),
              ProfitCenter: 'PTG',
              Activity: 'TRUCKING',
              Pillar: 'LOGISTICS',
              BUCountry: 'PA',
              ServiceCountry: 'PA',
              ClientType: 'EXTERNAL',
              // Solo para servicios adicionales
              FullEmpty: 'FULL'
            }
            
            console.log("Additional service item to add:", additionalServiceItem)
            otherItems.push(additionalServiceItem)
          })
        }
        
        // Agregar los otherItems al payload
        xmlPayload.otherItems = otherItems
        console.log("OtherItems agregados al payload:", otherItems)
        console.log("OtherItems length:", otherItems.length)
      }

      console.log("Final XML payload:", xmlPayload)
      const xml = generateInvoiceXML(xmlPayload)
      console.log("XML generado exitosamente")
      
      const validation = validateXMLForSAP(xml)
      setGeneratedXml(xml)
      setXmlValidation(validation)
      if (validation.isValid) toast({ title: "XML generado", description: "El XML cumple con los requisitos para SAP." })
      else toast({ title: "XML con advertencias", description: `Se encontraron ${validation.errors.length} advertencias.`, variant: "destructive" })
      return { xml, isValid: validation.isValid }
    } catch (error: any) {
      console.error("=== ERROR en generateXMLForInvoice ===")
      console.error("Error completo:", error)
      console.error("Mensaje de error:", error.message)
      console.error("Stack trace:", error.stack)
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
    
    // Validación específica para facturas AUTH
    if (isAuthInvoice && !newInvoiceNumber.toUpperCase().startsWith('AUTH-')) {
      toast({ 
        title: "Error en número de factura", 
        description: "Las facturas de Gastos de Autoridades deben mantener el prefijo 'AUTH-'", 
        variant: "destructive" 
      });
      return;
    }
    setIsProcessing(true)
    try {
      console.log("=== DEBUG: handleFacturar iniciado ===")
      
      // Generar XML para facturas de trasiego y AUTH
      let xmlData = generateXMLForInvoice()
      if (!xmlData) {
        toast({ title: "Error", description: "No se pudo generar el XML", variant: "destructive" })
        return
      }
      console.log("=== DEBUG: XML generado ===")
      console.log("XmlData a pasar:", xmlData)
      
      // Enviar a SAP si está marcado
      if (actions.sendToSAP && xmlData.xml && invoice?.id) {
        try {
          await handleSendToSap(invoice.id, xmlData.xml)
        } catch (error) {
          console.error("Error enviando a SAP:", error)
          // Continuar con la facturación aunque falle el envío a SAP
        }
      }
      
      console.log("=== DEBUG: Llamando a onFacturar ===")
      console.log("XmlData a pasar:", xmlData)
      
      // Llamar al callback (con XML para trasiego, null para AUTH)
      await onFacturar(newInvoiceNumber, xmlData, invoiceDate)
      
      toast({ title: "Facturación completada", description: `La prefactura ha sido facturada como ${newInvoiceNumber}.` })
    } catch (error: any) {
      console.error("=== ERROR en handleFacturar ===")
      console.error("Error completo:", error)
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

  const defaultInvoiceNumber = (() => {
    if (!invoice?.invoiceNumber) return "TRK-FAC-000001"
    
    const invoiceNum = invoice.invoiceNumber.toString()
    
    // Si es una prefactura AUTH, mantener el prefijo AUTH- pero cambiarlo por el número de factura
    if (invoiceNum.toUpperCase().startsWith('AUTH-')) {
      return invoiceNum.replace(/^AUTH-/, `AUTH-FAC-${Date.now().toString().slice(-6)}-`)
    }
    
    // Para facturas normales de trasiego
    return invoiceNum.replace(/^TRK-PRE-/, "TRK-FAC-")
  })()

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
            <Label htmlFor="invoice-number" className="text-sm font-semibold">
              Número de Factura *
              {isAuthInvoice && (
                <span className="ml-2 text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded">
                  Debe mantener el prefijo AUTH-
                </span>
              )}
            </Label>
            <Input 
              id="invoice-number" 
              value={newInvoiceNumber} 
              onChange={(e) => {
                const value = e.target.value.toUpperCase()
                
                // Si es una factura AUTH, prevenir que se borre el prefijo AUTH-
                if (isAuthInvoice && !value.startsWith('AUTH-')) {
                  // Si el usuario intenta borrar AUTH-, mantener al menos AUTH-
                  if (value.length < 5) {
                    setNewInvoiceNumber('AUTH-')
                  } else {
                    // Si tienen texto pero no empieza con AUTH-, agregarlo
                    setNewInvoiceNumber('AUTH-' + value)
                  }
                } else {
                  setNewInvoiceNumber(value)
                }
              }} 
              placeholder={defaultInvoiceNumber} 
              className={`font-mono ${isAuthInvoice ? 'border-orange-200 focus:border-orange-400' : ''}`}
            />
            {isAuthInvoice && (
              <p className="text-xs text-muted-foreground">
                💡 El prefijo "AUTH-" es obligatorio para facturas de Gastos de Autoridades
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="invoice-date" className="text-sm font-semibold">Fecha de Factura *</Label>
            <Input id="invoice-date" type="date" value={invoiceDate} onChange={(e)=>setInvoiceDate(e.target.value)} className="font-mono" />
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2"><FileText className="h-4 w-4" /> Acciones Adicionales</h3>
            {isAuthInvoice && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <Code className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-800">
                    Factura AUTH - XML Específico
                  </span>
                </div>
                <p className="text-sm text-blue-700 mt-1">
                  Se generará XML específico para gastos de autoridades con servicios TRK182 (APA), TRK175 (QUA) y TRK009 (NOTF).
                </p>
              </div>
            )}
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


