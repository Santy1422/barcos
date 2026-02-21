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
  Download,
  Loader2
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { generateShipChandlerInvoiceXML, validateXMLForSAP, generateXmlFileName, sendXmlToSapFtp, type ShipChandlerInvoiceForXml } from "@/lib/xml-generator"
import { useAppSelector } from "@/lib/hooks"
import { selectAllIndividualRecords } from "@/lib/features/records/recordsSlice"
import saveAs from "file-saver"

interface ShipChandlerFacturacionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  invoice: any
  onFacturar: (invoiceNumber: string, xmlData?: { xml: string, isValid: boolean }, invoiceDate?: string, poNumber?: string) => Promise<void>
}

export function ShipChandlerFacturacionModal({ 
  open, 
  onOpenChange, 
  invoice, 
  onFacturar 
}: ShipChandlerFacturacionModalProps) {
  const { toast } = useToast()
  const [isProcessing, setIsProcessing] = useState(false)
  const [newInvoiceNumber, setNewInvoiceNumber] = useState("")
  const [poNumber, setPoNumber] = useState("")
  const [invoiceDate, setInvoiceDate] = useState(() => {
    const today = new Date()
    return today.toLocaleDateString('en-CA') // Formato YYYY-MM-DD en zona horaria local
  })
  const [generatedXml, setGeneratedXml] = useState<string>("")
  const [xmlValidation, setXmlValidation] = useState<{ isValid: boolean; errors: string[] } | null>(null)
  const [isSendingToSap, setIsSendingToSap] = useState(false)
  const [sapLogs, setSapLogs] = useState<any[]>([])
  const [showSapLogs, setShowSapLogs] = useState(false)
  
  // Obtener registros asociados para generar XML
  const allRecords = useAppSelector(selectAllIndividualRecords)
  const clients = useAppSelector((state) => state.clients.clients)
  const clientsLoading = useAppSelector((state) => state.clients.loading)

  // Función para obtener el invoice date (date del registro) de una factura
  const getInvoiceDateForDisplay = (invoice: any): string => {
    if (!invoice?.relatedRecordIds || invoice.relatedRecordIds.length === 0) {
      return "N/A"
    }
    
    if (allRecords.length === 0) {
      return "N/A"
    }
    
    const relatedRecords = allRecords.filter((record: any) => {
      const recordId = record._id || record.id
      return invoice.relatedRecordIds.includes(recordId)
    })
    
    if (relatedRecords.length === 0) {
      return "N/A"
    }
    
    // Tomar el date del primer registro
    const firstRecord = relatedRecords[0]
    const data = firstRecord.data as Record<string, any>
    const recordDate = data?.date
    
    if (!recordDate) {
      return "N/A"
    }
    
    // Convertir la fecha a formato legible
    return formatRecordDateForDisplay(recordDate)
  }

  // Función para formatear la fecha del registro para visualización
  const formatRecordDateForDisplay = (dateValue: any): string => {
    if (!dateValue) return 'N/A'

    // Helper function para convertir Excel serial date a displayable string
    const convertExcelSerialToDisplay = (serial: number): string | null => {
      const excelEpoch = new Date(1900, 0, 1)
      const millisecondsPerDay = 24 * 60 * 60 * 1000
      const adjustedSerialNumber = serial > 59 ? serial - 1 : serial
      const date = new Date(excelEpoch.getTime() + (adjustedSerialNumber - 1) * millisecondsPerDay)

      if (isNaN(date.getTime())) return null

      const year = date.getFullYear()
      if (year < 1900 || year > 2100) return null

      const day = date.getDate().toString().padStart(2, '0')
      const month = (date.getMonth() + 1).toString().padStart(2, '0')
      return `${day}/${month}/${year}`
    }

    // Si es string en formato DD-MM-YYYY, convertir a formato legible
    if (typeof dateValue === 'string' && dateValue.match(/^\d{2}-\d{2}-\d{4}$/)) {
      const parts = dateValue.split('-')
      if (parts.length === 3) {
        const [day, month, year] = parts
        return `${day}/${month}/${year}`
      }
    }

    // Si es string en formato YYYY-MM-DD, convertir
    if (typeof dateValue === 'string' && dateValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const parts = dateValue.split('-')
      if (parts.length === 3) {
        const [year, month, day] = parts
        return `${day}/${month}/${year}`
      }
    }

    // Si es string que representa un número de serie de Excel
    if (typeof dateValue === 'string' && dateValue.match(/^\d+$/)) {
      const serial = parseInt(dateValue, 10)
      if (serial > 0 && serial < 100000) {
        const result = convertExcelSerialToDisplay(serial)
        if (result) return result
      }
    }

    // Si es número (serie de Excel), convertir
    if (typeof dateValue === 'number') {
      const result = convertExcelSerialToDisplay(dateValue)
      if (result) return result
    }

    // Intentar parsear como fecha (solo para formatos ISO conocidos)
    if (typeof dateValue === 'string' && dateValue.match(/^\d{4}-\d{1,2}-\d{1,2}(T|$)/)) {
      const datePart = dateValue.split('T')[0]
      const [year, month, day] = datePart.split('-').map(Number)
      if (year >= 1900 && year <= 2100) {
        return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`
      }
    }

    return String(dateValue)
  }

  // Función para convertir fecha de Excel o string a formato YYYY-MM-DD
  const convertDateToInputFormat = (dateValue: any): string => {
    if (!dateValue) {
      console.log('❌ convertDateToInputFormat: dateValue es null o undefined')
      return ''
    }

    console.log('🔍 convertDateToInputFormat - Input:', dateValue, 'Type:', typeof dateValue)

    // Helper function para convertir Excel serial date a YYYY-MM-DD
    const convertExcelSerialToDate = (serial: number): string => {
      // Excel serial date: 1 = 1900-01-01
      // Ajuste: Excel cuenta el 29/02/1900 como válido, pero JavaScript no
      const excelEpoch = new Date(1900, 0, 1) // 1 de enero de 1900
      const millisecondsPerDay = 24 * 60 * 60 * 1000
      const adjustedSerialNumber = serial > 59 ? serial - 1 : serial
      const date = new Date(excelEpoch.getTime() + (adjustedSerialNumber - 1) * millisecondsPerDay)

      if (isNaN(date.getTime())) {
        console.log('❌ Fecha inválida después de convertir número de Excel')
        return ''
      }

      const year = date.getFullYear()
      // Validar que el año sea razonable
      if (year < 1900 || year > 2100) {
        console.log('❌ Año fuera de rango después de convertir Excel serial:', year)
        return ''
      }

      const month = (date.getMonth() + 1).toString().padStart(2, '0')
      const day = date.getDate().toString().padStart(2, '0')
      return `${year}-${month}-${day}`
    }

    // Si es un número (serie de Excel), convertir - solo valores razonables
    if (typeof dateValue === 'number' && dateValue > 0 && dateValue < 100000) {
      console.log('🔍 Es número, tratando como serie de Excel:', dateValue)
      const result = convertExcelSerialToDate(dateValue)
      if (result) {
        console.log('✅ Fecha convertida desde número:', result)
      }
      return result
    }

    // Si es string, intentar parsear
    if (typeof dateValue === 'string') {
      // IMPORTANTE: Verificar primero si es un string que representa un número de serie de Excel
      // Esto ocurre cuando el Excel parser convierte la fecha a String()
      if (dateValue.match(/^\d+$/)) {
        const serial = parseInt(dateValue, 10)
        // Verificar que el serial esté en un rango razonable para fechas de Excel
        // Valores típicos de Excel para años 2020-2030 están entre ~43000 y ~48000
        if (serial > 0 && serial < 100000) {
          console.log('🔍 String parece ser serial de Excel:', serial)
          const result = convertExcelSerialToDate(serial)
          if (result) {
            console.log('✅ Fecha convertida desde string serial de Excel:', result)
            return result
          }
        }
      }
      console.log('🔍 Es string, intentando parsear')
      
      // Si ya está en formato YYYY-MM-DD
      if (dateValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
        console.log('✅ Ya está en formato YYYY-MM-DD')
        return dateValue
      }
      
      // Si contiene formato con guiones (DD-MM-YYYY o MM-DD-YYYY)
      if (dateValue.includes('-') && dateValue.match(/^\d{2}-\d{2}-\d{4}$/)) {
        const parts = dateValue.split('-')
        if (parts.length === 3) {
          const [part1, part2, part3] = parts
          // Intentar determinar si es DD-MM-YYYY o MM-DD-YYYY
          // Si part1 > 12, es DD-MM-YYYY
          if (Number(part1) > 12) {
            // DD-MM-YYYY
            const day = part1.padStart(2, '0')
            const month = part2.padStart(2, '0')
            const year = part3
            const result = `${year}-${month}-${day}`
            console.log('✅ Fecha convertida desde DD-MM-YYYY:', result)
            return result
          } else {
            // MM-DD-YYYY
            const month = part1.padStart(2, '0')
            const day = part2.padStart(2, '0')
            const year = part3
            const result = `${year}-${month}-${day}`
            console.log('✅ Fecha convertida desde MM-DD-YYYY:', result)
            return result
          }
        }
      }
      
      // Si contiene formato con barras (DD/MM/YYYY o MM/DD/YYYY)
      if (dateValue.includes('/')) {
        const parts = dateValue.split('/')
        if (parts.length === 3) {
          const [part1, part2, part3] = parts
          // Intentar determinar si es DD/MM/YYYY o MM/DD/YYYY
          // Si part1 > 12, es DD/MM/YYYY
          if (Number(part1) > 12) {
            // DD/MM/YYYY
            const day = part1.padStart(2, '0')
            const month = part2.padStart(2, '0')
            const year = part3
            const result = `${year}-${month}-${day}`
            console.log('✅ Fecha convertida desde DD/MM/YYYY:', result)
            return result
          } else {
            // MM/DD/YYYY
            const month = part1.padStart(2, '0')
            const day = part2.padStart(2, '0')
            const year = part3
            const result = `${year}-${month}-${day}`
            console.log('✅ Fecha convertida desde MM/DD/YYYY:', result)
            return result
          }
        }
      }
      
      // Intentar parsear como fecha ISO o estándar (solo si tiene formato esperado)
      // IMPORTANTE: No usar new Date() genérico porque puede producir años inválidos como 40000
      if (dateValue.match(/^\d{4}-\d{1,2}-\d{1,2}(T|$)/)) {
        const datePart = dateValue.split('T')[0]
        const [year, month, day] = datePart.split('-').map(Number)
        // Validar año razonable
        if (year >= 1900 && year <= 2100) {
          const result = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          console.log('✅ Fecha parseada desde formato ISO:', result)
          return result
        }
      }

      console.log('❌ No se pudo parsear el string como fecha')
    }

    console.log('❌ convertDateToInputFormat: No se pudo convertir', dateValue)
    return ''
  }
  
  // Limpiar estado del XML cuando cambie la factura y establecer valores automáticos
  useEffect(() => {
    if (!open || !invoice) return // Solo ejecutar cuando el modal esté abierto y haya una factura
    
    setGeneratedXml("")
    setXmlValidation(null)
    setPoNumber("")
    setIsSendingToSap(false)
    setSapLogs([])
    setShowSapLogs(false)
    
    // Función para establecer valores desde los registros
    const setValuesFromRecords = () => {
      // Obtener registros relacionados para establecer valores automáticos
      if (invoice?.relatedRecordIds && allRecords.length > 0) {
        const relatedRecords = allRecords.filter((record: any) => 
          invoice.relatedRecordIds.includes(record._id || record.id)
        )
        
        console.log('🔍 Registros relacionados encontrados:', relatedRecords.length)
        
        if (relatedRecords.length > 0) {
          const firstRecord = relatedRecords[0]
          const data = firstRecord.data as Record<string, any>
          
          console.log('🔍 Primer registro completo:', firstRecord)
          console.log('🔍 Data del primer registro:', data)
          
          // Establecer número de factura desde invoiceNo
          const invoiceNo = (data?.invoiceNo || '').toString().trim()
          if (invoiceNo) {
            setNewInvoiceNumber(invoiceNo)
            console.log('✅ Número de factura establecido:', invoiceNo)
          } else {
            setNewInvoiceNumber("")
            console.log('⚠️ No se encontró invoiceNo en el registro')
          }
          
          // Establecer fecha desde date del registro
          const recordDate = data?.date
          console.log('🔍 Estableciendo fecha - recordDate:', recordDate, 'Type:', typeof recordDate)
          console.log('🔍 Todos los campos del registro:', Object.keys(data))
          
          if (recordDate !== undefined && recordDate !== null && recordDate !== '') {
            const formattedDate = convertDateToInputFormat(recordDate)
            console.log('🔍 Fecha formateada:', formattedDate)
            if (formattedDate) {
              setInvoiceDate(formattedDate)
              console.log('✅ Fecha establecida desde registro:', formattedDate)
            } else {
              console.log('⚠️ No se pudo convertir la fecha, usando fecha actual')
              // Si no se puede convertir, usar fecha actual
              const today = new Date()
              setInvoiceDate(today.toLocaleDateString('en-CA'))
            }
          } else {
            console.log('⚠️ No hay fecha en el registro (recordDate es:', recordDate, '), usando fecha actual')
            // Si no hay fecha, usar fecha actual
            const today = new Date()
            setInvoiceDate(today.toLocaleDateString('en-CA'))
          }
        } else {
          console.log('⚠️ No se encontraron registros relacionados')
          // Si no hay registros, valores por defecto
          setNewInvoiceNumber("")
          const today = new Date()
          setInvoiceDate(today.toLocaleDateString('en-CA'))
        }
      } else {
        console.log('⚠️ No hay registros cargados aún o no hay relatedRecordIds')
        // Si no hay registros cargados aún, valores por defecto
        setNewInvoiceNumber("")
        const today = new Date()
        setInvoiceDate(today.toLocaleDateString('en-CA'))
      }
    }
    
    // Intentar establecer valores inmediatamente
    setValuesFromRecords()
    
    // Si no hay registros aún, esperar un poco y volver a intentar
    if (allRecords.length === 0) {
      console.log('⏳ Esperando a que se carguen los registros...')
      const timeout = setTimeout(() => {
        setValuesFromRecords()
      }, 500)
      
      return () => clearTimeout(timeout)
    }
  }, [open, invoice?.id, allRecords])
  
  // Función para generar XML de ShipChandler
  const generateXMLForInvoice = () => {
    console.log("🔍 ShipChandler generateXMLForInvoice - Iniciando...")
    console.log("🔍 ShipChandler generateXMLForInvoice - invoice:", invoice)
    console.log("🔍 ShipChandler generateXMLForInvoice - newInvoiceNumber:", newInvoiceNumber)
    console.log("🔍 ShipChandler generateXMLForInvoice - invoiceDate:", invoiceDate)
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
      console.log("🔍 ShipChandler generateXMLForInvoice - allRecords:", allRecords.length)
      console.log("🔍 ShipChandler generateXMLForInvoice - invoice.relatedRecordIds:", invoice.relatedRecordIds)
      const relatedRecords = allRecords.filter((record: any) => 
        invoice.relatedRecordIds && invoice.relatedRecordIds.includes(record._id || record.id)
      )
      console.log("🔍 ShipChandler generateXMLForInvoice - relatedRecords encontrados:", relatedRecords.length)

      if (relatedRecords.length === 0) {
        throw new Error("No se encontraron registros asociados a la factura")
      }

      // Buscar el cliente para obtener el número SAP
      const firstRecord = relatedRecords[0]
      const data = firstRecord.data as Record<string, any>
      const clientId = data?.clientId || data?.clientSapCode
      
      console.log("🔍 ShipChandler generateXMLForInvoice - firstRecord completo:", firstRecord)
      console.log("🔍 ShipChandler generateXMLForInvoice - data completo:", data)
      console.log("🔍 ShipChandler generateXMLForInvoice - clientId:", clientId)
      console.log("🔍 ShipChandler generateXMLForInvoice - clients disponibles:", clients.length)
      console.log("🔍 ShipChandler generateXMLForInvoice - clients cargando:", clientsLoading)
      
      // Verificar que los clientes no estén cargando
      if (clientsLoading) {
        throw new Error("Los clientes están siendo cargados. Por favor, espere un momento y vuelva a intentar.")
      }
      
      let client = null
      
      // Buscar el cliente por ID o por clientSapCode
      if (!clientId) {
        throw new Error("El registro no tiene un cliente asociado (clientId o clientSapCode). Por favor, verifique la configuración del registro.")
      }
      
      // Primero intentar buscar por ID
      client = clients.find((c: any) => (c._id || c.id) === clientId)
      
      // Si no se encuentra por ID, buscar por SAP code (puede que clientId sea el SAP code)
      if (!client) {
        client = clients.find((c: any) => c.sapCode === clientId)
      }
      
      // Si aún no se encuentra, usar clientSapCode directamente del registro
      if (!client && data?.clientSapCode) {
        // Usar el SAP code directamente del registro
        console.log("🔍 ShipChandler generateXMLForInvoice - Usando clientSapCode del registro:", data.clientSapCode)
        const clientSapNumber = data.clientSapCode
        
        // Preparar datos para XML
        const invoiceForXml: ShipChandlerInvoiceForXml = {
          id: invoice.id,
          invoiceNumber: newInvoiceNumber,
          client: clientSapNumber,
          clientName: invoice.clientName,
          date: invoiceDate,
          currency: "USD",
          total: invoice.totalAmount,
          records: relatedRecords.map((record: any) => ({
            id: record._id || record.id,
            data: {
              ...record.data
            },
            totalValue: record.totalValue || 0
          }))
        }

        console.log("🔍 ShipChandler generateXMLForInvoice - Generando XML con datos:", invoiceForXml)
        const xml = generateShipChandlerInvoiceXML(invoiceForXml)
        console.log("🔍 ShipChandler generateXMLForInvoice - XML generado, longitud:", xml.length)
        const validation = validateXMLForSAP(xml)
        console.log("🔍 ShipChandler generateXMLForInvoice - Validación:", validation)
        
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
        console.log("✅ ShipChandler generateXMLForInvoice - Retornando resultado:", result)
        return result
      }
      
      console.log("🔍 ShipChandler generateXMLForInvoice - cliente encontrado:", client)
      
      // Validar que el cliente tenga código SAP configurado
      if (!client) {
        throw new Error(`No se encontró el cliente con ID/SAP ${clientId} en la lista de clientes. Por favor, verifique que el cliente esté configurado en el sistema.`)
      }
      if (!client.sapCode) {
        throw new Error(`El cliente ${client.companyName || client.fullName} no tiene código SAP configurado. Por favor, configure el código SAP del cliente antes de generar el XML.`)
      }
      let clientSapNumber = client.sapCode
      console.log("🔍 ShipChandler generateXMLForInvoice - clientSapNumber final:", clientSapNumber)

      // Preparar datos para XML
      const invoiceForXml: ShipChandlerInvoiceForXml = {
        id: invoice.id,
        invoiceNumber: newInvoiceNumber,
        client: clientSapNumber,
        clientName: invoice.clientName,
        date: invoiceDate,
        currency: "USD",
        total: invoice.totalAmount,
        records: relatedRecords.map((record: any) => ({
          id: record._id || record.id,
          data: {
            ...record.data
          },
          totalValue: record.totalValue || 0
        }))
      }

      console.log("🔍 ShipChandler generateXMLForInvoice - Generando XML con datos:", invoiceForXml)
      const xml = generateShipChandlerInvoiceXML(invoiceForXml)
      console.log("🔍 ShipChandler generateXMLForInvoice - XML generado, longitud:", xml.length)
      const validation = validateXMLForSAP(xml)
      console.log("🔍 ShipChandler generateXMLForInvoice - Validación:", validation)
      
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
      console.log("✅ ShipChandler generateXMLForInvoice - Retornando resultado:", result)
      return result
    } catch (error: any) {
      console.error("❌ ShipChandler generateXMLForInvoice - Error:", error)
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
        return true
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
      return false
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
      console.log("🔍 ShipChandlerFacturacionModal - Iniciando generación de XML...")
      let xmlData
      try {
        const xmlResult = generateXMLForInvoice()
        console.log("🔍 ShipChandlerFacturacionModal - Resultado de generateXMLForInvoice:", xmlResult)
        if (xmlResult) {
          xmlData = xmlResult
          console.log("✅ ShipChandlerFacturacionModal - XML generado exitosamente")
        } else {
          console.log("⚠️ ShipChandlerFacturacionModal - generateXMLForInvoice devolvió null")
          xmlData = {
            xml: "<!-- Error al generar XML -->",
            isValid: false
          }
        }
      } catch (xmlError) {
        console.error("❌ ShipChandlerFacturacionModal - Error al generar XML:", xmlError)
        xmlData = {
          xml: `<!-- Error al generar XML: ${xmlError} -->`,
          isValid: false
        }
      }
      
      console.log("🔍 ShipChandlerFacturacionModal - xmlData final que se enviará:", xmlData)
      
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


  // Función para descargar XML
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
                  <span className="font-medium">Invoice Date:</span>
                  <span>{getInvoiceDateForDisplay(invoice)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Ship className="h-4 w-4 text-blue-600" />
                  <span className="font-medium">Registros:</span>
                  <span>{invoice.relatedRecordIds?.length || 0}</span>
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
                readOnly
                className="font-mono bg-gray-50 cursor-not-allowed"
              />
              <p className="text-xs text-muted-foreground">
                Número de factura obtenido automáticamente del registro (Invoice No)
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
                Fecha obtenida automáticamente del registro (Date). Puede editarla si es necesario.
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

            {/* Vista previa del XML */}
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Code className="h-4 w-4" /> Vista Previa del XML
              </h3>
              
              {!generatedXml ? (
                <div className="flex flex-col items-center space-y-2 p-4 border border-dashed border-gray-300 rounded-lg">
                  <Button 
                    variant="outline" 
                    onClick={generateXMLForInvoice} 
                    disabled={!newInvoiceNumber.trim() || !invoiceDate} 
                    className="flex items-center gap-2 text-blue-600 border-blue-600 hover:bg-blue-50 disabled:text-gray-400 disabled:border-gray-300"
                  >
                    <Code className="h-4 w-4" /> Generar Vista Previa del XML
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-gray-50">
                    <div className="flex items-center gap-2">
                      <Code className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium">XML Generado</span>
                      <Badge variant={xmlValidation?.isValid ? "default" : "destructive"} className="text-xs">
                        {xmlValidation?.isValid ? "✓ Válido" : "⚠ Con errores"}
                      </Badge>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleDownloadXml} className="flex items-center gap-2">
                      <Download className="h-4 w-4" />
                      Descargar XML
                    </Button>
                  </div>
                  {xmlValidation && !xmlValidation.isValid && (
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        <ul className="list-disc list-inside mt-2">
                          {xmlValidation.errors.map((error, index) => (
                            <li key={index} className="text-xs">{error}</li>
                          ))}
                        </ul>
                      </AlertDescription>
                    </Alert>
                  )}
                  <div className="bg-slate-900 text-green-400 p-4 rounded-lg font-mono text-xs overflow-x-auto max-h-64 overflow-y-auto">
                    <pre>{generatedXml}</pre>
                  </div>
                </div>
              )}
            </div>

            {/* Botones de acción */}
            <div className="flex justify-end space-x-2 pt-4 border-t">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleFacturar}
                disabled={isProcessing}
                className="bg-green-600 hover:bg-green-700"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Facturar
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

