import type { InvoiceForXmlPayload, InvoiceLineItemForXml } from "@/lib/features/invoice/invoiceSlice"
import { js2xml } from "xml-js"
import { TRUCKING_DEFAULTS } from "./constants/trucking-options"

// Tipos para PTYSS XML
export interface PTYSSInvoiceForXml {
  id: string
  invoiceNumber: string
  client: string
  clientName: string
  date: string
  sapDate?: string
  currency: string
  total: number
  records: PTYSSRecordForXml[]
  sapDocumentNumber?: string
  additionalServices?: Array<{
    serviceId: string
    name: string
    description: string
    amount: number
    isLocalService?: boolean
  }>
}

export interface PTYSSRecordForXml {
  id: string
  data: {
    container: string
    naviera: string
    from: string
    to: string
    operationType: string
    containerSize: string
    containerType: string
    moveDate: string
    order: string
    [key: string]: any
  }
  totalValue: number
}

function formatDateForXML(dateString: string): string {
  // Aplicar la misma lógica de corrección de zona horaria que en trucking-records.tsx
  let date: Date
  
  if (!dateString) {
    date = new Date()
  } else if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
    // Si la fecha está en formato YYYY-MM-DD, crear la fecha en zona horaria local
    const [year, month, day] = dateString.split('-').map(Number)
    date = new Date(year, month - 1, day) // month - 1 porque Date usa 0-indexado
  } else if (dateString.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)) {
    // Si la fecha está en formato ISO con zona horaria UTC, extraer solo la parte de la fecha
    const datePart = dateString.split('T')[0] // Obtener solo YYYY-MM-DD
    const [year, month, day] = datePart.split('-').map(Number)
    date = new Date(year, month - 1, day) // Crear en zona horaria local
  } else {
    // Para otros formatos, usar el método normal
    date = new Date(dateString)
  }
  
  const year = date.getFullYear()
  const month = (date.getMonth() + 1).toString().padStart(2, "0")
  const day = date.getDate().toString().padStart(2, "0")
  return `${year}${month}${day}`
}

function formatTimeForXML(dateString: string): string {
  const date = new Date(dateString)
  const hours = date.getHours().toString().padStart(2, "0")
  const minutes = date.getMinutes().toString().padStart(2, "0")
  const seconds = date.getSeconds().toString().padStart(2, "0")
  return `${hours}${minutes}${seconds}`
}

function calculateDueDate(dateString: string): string {
  // Aplicar la misma lógica de corrección de zona horaria que en formatDateForXML
  let date: Date
  
  if (!dateString) {
    date = new Date()
  } else if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
    // Si la fecha está en formato YYYY-MM-DD, crear la fecha en zona horaria local
    const [year, month, day] = dateString.split('-').map(Number)
    date = new Date(year, month - 1, day) // month - 1 porque Date usa 0-indexado
  } else if (dateString.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)) {
    // Si la fecha está en formato ISO con zona horaria UTC, extraer solo la parte de la fecha
    const datePart = dateString.split('T')[0] // Obtener solo YYYY-MM-DD
    const [year, month, day] = datePart.split('-').map(Number)
    date = new Date(year, month - 1, day) // Crear en zona horaria local
  } else {
    // Para otros formatos, usar el método normal
    date = new Date(dateString)
  }
  
  // Agregar 30 días
  const dueDate = new Date(date)
  dueDate.setDate(date.getDate() + 30)
  
  // Formatear como YYYYMMDD
  const year = dueDate.getFullYear()
  const month = (dueDate.getMonth() + 1).toString().padStart(2, "0")
  const day = dueDate.getDate().toString().padStart(2, "0")
  return `${year}${month}${day}`
}

function formatReferencePeriod(dateString: string): string {
  // Aplicar la misma lógica de corrección de zona horaria que en formatDateForXML
  let date: Date
  
  if (!dateString) {
    date = new Date()
  } else if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
    // Si la fecha está en formato YYYY-MM-DD, crear la fecha en zona horaria local
    const [year, month, day] = dateString.split('-').map(Number)
    date = new Date(year, month - 1, day) // month - 1 porque Date usa 0-indexado
  } else if (dateString.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)) {
    // Si la fecha está en formato ISO con zona horaria UTC, extraer solo la parte de la fecha
    const datePart = dateString.split('T')[0] // Obtener solo YYYY-MM-DD
    const [year, month, day] = datePart.split('-').map(Number)
    date = new Date(year, month - 1, day) // Crear en zona horaria local
  } else {
    // Para otros formatos, usar el método normal
    date = new Date(dateString)
  }
  
  // Formatear como MM.YYYY
  const year = date.getFullYear()
  const month = (date.getMonth() + 1).toString().padStart(2, "0")
  return `${month}.${year}`
}

// Función para obtener el CtrISOcode basándose en CtrType y CtrSize
const getCtrISOcode = (ctrType: string, ctrSize: string): string => {
  const type = ctrType?.toUpperCase() || ''
  const size = ctrSize?.toString() || ''
  
  // Tabla de mapeo CtrISOcode -> CtrSize -> CtrType (ordenada de arriba a abajo)
  const isoCodeMap = [
    { isoCode: '10G0', size: '10', type: 'DV' },
    { isoCode: '10T0', size: '10', type: 'TK' },
    { isoCode: '12R1', size: '10', type: 'RE' },
    { isoCode: '20G0', size: '20', type: 'DV' },
    { isoCode: '20G1', size: '20', type: 'DV' },
    { isoCode: '20H0', size: '20', type: 'HR' },
    { isoCode: '20P1', size: '20', type: 'FL' },
    { isoCode: '20T0', size: '20', type: 'TK' },
    { isoCode: '20T1', size: '20', type: 'TK' },
    { isoCode: '20T2', size: '20', type: 'TK' },
    { isoCode: '20T3', size: '20', type: 'TK' },
    { isoCode: '20T4', size: '20', type: 'TK' },
    { isoCode: '20T5', size: '20', type: 'TK' },
    { isoCode: '20T6', size: '20', type: 'TK' },
    { isoCode: '20T7', size: '20', type: 'TK' },
    { isoCode: '20T8', size: '20', type: 'TK' },
    { isoCode: '22B0', size: '20', type: 'BV' },
    { isoCode: '22G0', size: '20', type: 'DV' },
    { isoCode: '22G1', size: '20', type: 'DV' },
    { isoCode: '22H0', size: '20', type: 'IS' },
    { isoCode: '22K2', size: '20', type: 'TK' },
    { isoCode: '22OS', size: '20', type: 'OS' },
    { isoCode: '22P1', size: '20', type: 'FL' },
    { isoCode: '22P3', size: '20', type: 'FL' },
    { isoCode: '22P7', size: '20', type: 'FL' },
    { isoCode: '22P8', size: '20', type: 'FL' },
    { isoCode: '22P9', size: '20', type: 'FL' },
    { isoCode: '22R1', size: '20', type: 'RE' },
    { isoCode: '22R7', size: '20', type: 'PP' },
    { isoCode: '22R9', size: '20', type: 'RE' },
    { isoCode: '22S1', size: '20', type: 'XX' },
    { isoCode: '22T0', size: '20', type: 'TK' },
    { isoCode: '22T1', size: '20', type: 'TK' },
    { isoCode: '22T2', size: '20', type: 'TK' },
    { isoCode: '22T3', size: '20', type: 'TK' },
    { isoCode: '22T4', size: '20', type: 'TK' },
    { isoCode: '22T5', size: '20', type: 'TK' },
    { isoCode: '22T6', size: '20', type: 'TK' },
    { isoCode: '22T7', size: '20', type: 'TK' },
    { isoCode: '22T8', size: '20', type: 'TK' },
    { isoCode: '22U1', size: '20', type: 'OT' },
    { isoCode: '22U6', size: '20', type: 'HT' },
    { isoCode: '22V0', size: '20', type: 'VE' },
    { isoCode: '22V2', size: '20', type: 'VE' },
    { isoCode: '22V3', size: '20', type: 'VE' },
    { isoCode: '22W0', size: '20', type: 'PW' },
    { isoCode: '24T6', size: '20', type: 'TK' },
    { isoCode: '24W1', size: '20', type: 'PW' },
    { isoCode: '24ZZ', size: '20', type: 'ZZ' },
    { isoCode: '25G0', size: '20', type: 'DV' },
    { isoCode: '25P0', size: '20', type: 'PL' },
    { isoCode: '26G0', size: '20', type: 'DV' },
    { isoCode: '26H0', size: '20', type: 'IS' },
    { isoCode: '26T9', size: '20', type: 'TK' },
    { isoCode: '28G0', size: '20', type: 'HH' },
    { isoCode: '28T0', size: '20', type: 'HH' },
    { isoCode: '28T8', size: '20', type: 'TK' },
    { isoCode: '28U1', size: '20', type: 'HH' },
    { isoCode: '28V0', size: '20', type: 'HH' },
    { isoCode: '29P0', size: '20', type: 'PL' },
    { isoCode: '2EG0', size: '20', type: 'HC' },
    { isoCode: '2LXX', size: '20', type: 'XX' },
    { isoCode: '30B1', size: '30', type: 'BV' },
    { isoCode: '30G0', size: '30', type: 'DV' },
    { isoCode: '32R3', size: '30', type: 'PP' },
    { isoCode: '32T1', size: '30', type: 'TK' },
    { isoCode: '32T6', size: '30', type: 'TK' },
    { isoCode: '3LXX', size: '30', type: 'XX' },
    { isoCode: '3MB0', size: '30', type: 'BB' },
    { isoCode: '40I0', size: '40', type: 'IS' },
    { isoCode: '40V0', size: '40', type: 'VE' },
    { isoCode: '42G0', size: '40', type: 'DV' },
    { isoCode: '42G1', size: '40', type: 'DV' },
    { isoCode: '42H0', size: '40', type: 'RE' },
    { isoCode: '42OS', size: '40', type: 'OS' },
    { isoCode: '42P1', size: '40', type: 'FL' },
    { isoCode: '42P3', size: '40', type: 'FL' },
    { isoCode: '42P4', size: '40', type: 'FL' },
    { isoCode: '42P6', size: '40', type: 'FL' },
    { isoCode: '42P8', size: '40', type: 'FL' },
    { isoCode: '42P9', size: '40', type: 'FL' },
    { isoCode: '42R1', size: '40', type: 'RE' },
    { isoCode: '42R3', size: '40', type: 'PP' },
    { isoCode: '42R9', size: '40', type: 'RE' },
    { isoCode: '42S1', size: '40', type: 'XX' },
    { isoCode: '42T2', size: '40', type: 'TK' },
    { isoCode: '42T5', size: '40', type: 'TK' },
    { isoCode: '42T6', size: '40', type: 'TK' },
    { isoCode: '42T8', size: '40', type: 'TK' },
    { isoCode: '42U1', size: '40', type: 'OT' },
    { isoCode: '42U6', size: '40', type: 'HT' },
    { isoCode: '43T5', size: '40', type: 'TK' },
    { isoCode: '44ZZ', size: '40', type: 'ZZ' },
    { isoCode: '45B3', size: '40', type: 'BV' },
    { isoCode: '45G0', size: '40', type: 'HC' },
    { isoCode: '45G1', size: '40', type: 'HC' },
    { isoCode: '45P0', size: '40', type: 'PL' },
    { isoCode: '45P1', size: '40', type: 'FT' },
    { isoCode: '45P3', size: '40', type: 'FT' },
    { isoCode: '45P8', size: '40', type: 'FT' },
    { isoCode: '45R1', size: '40', type: 'HR' },
    { isoCode: '45R9', size: '40', type: 'RE' },
    { isoCode: '45U1', size: '40', type: 'OT' },
    { isoCode: '45U6', size: '40', type: 'HT' },
    { isoCode: '46H0', size: '40', type: 'HR' },
    { isoCode: '47T9', size: '40', type: 'TK' },
    { isoCode: '48G0', size: '20', type: 'HH' },
    { isoCode: '48T8', size: '40', type: 'TK' },
    { isoCode: '49P0', size: '40', type: 'PL' },
    { isoCode: '49P3', size: '40', type: 'FL' },
    { isoCode: '4CG0', size: '40', type: 'DV' },
    { isoCode: '4EG1', size: '40', type: 'HC' },
    { isoCode: '4MNL', size: '40', type: 'TK' },
    { isoCode: '72T0', size: '23', type: 'TK' },
    { isoCode: '72T8', size: '23', type: 'TK' },
    { isoCode: '74T0', size: '23', type: 'TK' },
    { isoCode: '74T1', size: '23', type: 'TK' },
    { isoCode: '74T6', size: '23', type: 'TK' },
    { isoCode: '74T7', size: '23', type: 'TK' },
    { isoCode: '74T8', size: '23', type: 'TK' },
    { isoCode: '74ZZ', size: '23', type: 'ZZ' },
    { isoCode: '75T8', size: '23', type: 'TK' },
    { isoCode: 'A2T1', size: '23', type: 'TK' },
    { isoCode: 'A2T3', size: '23', type: 'TK' },
    { isoCode: 'CMT1', size: '20', type: 'TK' },
    { isoCode: 'L0G0', size: '45', type: 'DV' },
    { isoCode: 'L0G1', size: '45', type: 'HC' },
    { isoCode: 'L2G1', size: '45', type: 'HC' },
    { isoCode: 'L2W0', size: '45', type: 'PW' },
    { isoCode: 'L4ZZ', size: '45', type: 'ZZ' },
    { isoCode: 'L5G1', size: '45', type: 'HC' },
    { isoCode: 'L5R0', size: '45', type: 'HR' },
    { isoCode: 'L5R1', size: '45', type: 'RE' },
    { isoCode: 'LEG1', size: '45', type: 'HC' },
    { isoCode: 'M0G0', size: '48', type: 'DV' },
    { isoCode: 'P0G0', size: '53', type: 'DV' },
    { isoCode: 'P5G0', size: '53', type: 'HC' },
    { isoCode: 'P5OS', size: '53', type: 'OS' },
    { isoCode: 'P5R1', size: '53', type: 'RE' },
    { isoCode: 'ZZNC', size: '0', type: 'ZZ' }
  ]
  
  // Buscar el primer match (de arriba a abajo en la lista)
  const match = isoCodeMap.find(item => 
    item.size === size && item.type === type
  )
  
  if (match) {
    console.log(`CtrISOcode encontrado: ${match.isoCode} para CtrType: ${type}, CtrSize: ${size}`)
    return match.isoCode
  }
  
  // Si no se encuentra match, usar valor por defecto
  console.warn(`No se encontró CtrISOcode para CtrType: ${type}, CtrSize: ${size}. Usando valor por defecto.`)
  return '42G1' // Valor por defecto para 40' DV
}

// Función para generar nombre de archivo XML según estructura SAP
export function generateXmlFileName(companyCode: string = '9325'): string {
  const now = new Date()
  const year = now.getFullYear().toString().slice(-2) // últimos 2 dígitos del año
  const month = (now.getMonth() + 1).toString().padStart(2, '0')
  const day = now.getDate().toString().padStart(2, '0')
  const hours = now.getHours().toString().padStart(2, '0')
  const minutes = now.getMinutes().toString().padStart(2, '0')
  const seconds = now.getSeconds().toString().padStart(2, '0')
  // Estructura: <companyCode>_XL_yymmdd_hhmmss.XML
  return `${companyCode}_XL_${year}${month}${day}_${hours}${minutes}${seconds}.XML`
}

// Función para enviar XML a SAP vía FTP
export async function sendXmlToSap(invoiceId: string, xmlContent: string, fileName: string) {
  try {
    const response = await fetch(`/api/invoices/${invoiceId}/send-xml-to-sap`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({
        xmlContent,
        fileName
      })
    })

    const result = await response.json()
    
    if (!response.ok) {
      throw new Error(result.message || 'Error al enviar XML a SAP via FTP')
    }

    return result
  } catch (error: any) {
    console.error('Error al enviar XML a SAP via FTP:', error)
    throw error
  }
}

// Función para probar la conexión FTP con diferentes configuraciones
export async function testFtpConnection() {
  try {
    const response = await fetch('/api/invoices/test-ftp-connection', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })

    const result = await response.json()
    
    if (!response.ok) {
      throw new Error(result.message || 'Error al probar conexión FTP')
    }

    return result
  } catch (error: any) {
    console.error('Error al probar conexión FTP:', error)
    throw error
  }
}

// Función para debug de autenticación FTP con credenciales exactas
export async function debugFtpAuth() {
  try {
    const response = await fetch('/api/invoices/debug-ftp-auth', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })

    const result = await response.json()
    
    console.log('🔍 Debug FTP Auth Result:', result)
    
    if (!response.ok) {
      throw new Error(result.message || 'Error en debug de autenticación FTP')
    }

    return result
  } catch (error: any) {
    console.error('Error en debug FTP auth:', error)
    throw error
  }
}

// Función para diagnóstico híbrido FTP/SFTP
export async function diagnoseFtpServer() {
  try {
    const response = await fetch('/api/invoices/diagnose-ftp-server', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })

    const result = await response.json()
    
    console.log('🔍 Diagnóstico FTP/SFTP Result:', result)
    
    if (!response.ok) {
      throw new Error(result.message || 'Error en diagnóstico FTP/SFTP')
    }

    return result
  } catch (error: any) {
    console.error('Error en diagnóstico FTP/SFTP:', error)
    throw error
  }
}

// Función para marcar XML como enviado a SAP
export async function markXmlAsSentToSap(invoiceId: string) {
  try {
    const response = await fetch(`/api/invoices/${invoiceId}/mark-xml-sent-to-sap`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })

    const result = await response.json()
    
    if (!response.ok) {
      throw new Error(result.message || 'Error al marcar XML como enviado a SAP')
    }

    return result
  } catch (error: any) {
    console.error('Error al marcar XML como enviado a SAP:', error)
    throw error
  }
}

// Función para marcar XML como enviado a SAP (versión robusta con múltiples estrategias)
export async function markXmlAsSentToSapSimple(invoiceId: string) {
  try {
    console.log('🔍 Usando función simple para marcar XML como enviado a SAP:', invoiceId)
    
    const response = await fetch(`/api/invoices/${invoiceId}/mark-xml-sent-to-sap-simple`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })

    const result = await response.json()
    
    console.log('🔍 Respuesta del endpoint simple:', result)
    
    if (!response.ok) {
      throw new Error(result.message || 'Error al marcar XML como enviado a SAP (simple)')
    }

    return result
  } catch (error: any) {
    console.error('Error al marcar XML como enviado a SAP (simple):', error)
    throw error
  }
}

export function generateInvoiceXML(invoice: InvoiceForXmlPayload): string {
  // Debug logs
  console.log("=== DEBUG: generateInvoiceXML ===")
  console.log("Invoice received:", invoice)
  console.log("OtherItems received:", invoice.otherItems)
  console.log("OtherItems length:", invoice.otherItems?.length || 0)
  
  // Validar datos requeridos
  if (!invoice.invoiceNumber || !invoice.client || !invoice.date) {
    throw new Error("Datos requeridos faltantes para generar XML")
  }
  if (!invoice.clientSapNumber) {
    throw new Error("El número SAP del cliente (clientSapNumber) es obligatorio para generar el XML.")
  }

  // Calcular el monto total de las rutas (AmntTransactCur)
  const routeAmountTotal = invoice.records.reduce((sum, record) => {
    // Usar routeAmount si está disponible, sino usar totalPrice como fallback
    const routeAmount = (record as any).routeAmount || record.totalPrice || 0
    return sum + routeAmount
  }, 0)

  // Calcular el monto total de los impuestos PTG
  const taxesAmountTotal = (invoice.otherItems || []).reduce((sum: number, taxItem: any) => {
    return sum + (taxItem.totalPrice || 0)
  }, 0)

  // Total general incluyendo rutas e impuestos
  const totalAmount = routeAmountTotal + taxesAmountTotal

  const xmlObject = {
    "ns1:LogisticARInvoices": {
      _attributes: {
        "xmlns:ns1": "urn:medlog.com:MSC_GVA_FS:CustomerInvoice:01.00"
      },
      "CustomerInvoice": {
        // Protocol Section
        "Protocol": {
          "SourceSystem": "PTGFACTUGO",
          "TechnicalContact": "almeida.kant@ptyrmgmt.com;renee.taylor@ptyrmgmt.com"
        },
        // Header Section
        "Header": {
          "CompanyCode": "9325",
          "DocumentType": "XL",
          "DocumentDate": formatDateForXML(invoice.date),
          "PostingDate": invoice.sapDate ? formatDateForXML(invoice.sapDate) : formatDateForXML(invoice.date),
          "TransactionCurrency": invoice.currency || "USD",
          "Reference": invoice.invoiceNumber,
          "EntityDocNbr": invoice.sapDocumentNumber || invoice.invoiceNumber
        },
        // AdditionalTexts Section
        "AdditionalTexts": {
          "LongHeaderTextLangKey": "EN"
        },
        // CustomerOpenItem Section
        "CustomerOpenItem": {
          "CustomerNbr": invoice.clientSapNumber || invoice.clientSapCode || invoice.clientSap || invoice.client,
          "AmntTransactCur": totalAmount.toFixed(3),
          "BaselineDate": formatDateForXML(invoice.date),
          "DueDate": calculateDueDate(invoice.date)
        },
        // OtherItems Section
        "OtherItems": {
          "OtherItem": [
            // Primero los registros principales (contenedores) - AGRUPADOS
            ...(function() {
              // Agrupar registros por características similares
              const groupedRecords = new Map<string, {
                record: InvoiceLineItemForXml,
                count: number,
                totalPrice: number
              }>()
              
              invoice.records.forEach((record: InvoiceLineItemForXml) => {
                // Crear una clave única basada en las características del registro
                // IMPORTANTE: No incluir description ni containerNumber porque son únicos por contenedor
                // Solo agrupar por: serviceCode, precio unitario, tipo/tamaño de contenedor, categoría, estado full/empty, tipo de negocio
                const key = `${record.serviceCode || "TRK002"}-${record.unitPrice}-${record.containerType || "DV"}-${record.containerSize || "40"}-${record.ctrCategory || "D"}-${record.fullEmptyStatus || "FULL"}-${record.businessType || "IMPORT"}`
                
                // Para registros AUTH ya agrupados, usar la cantidad que ya viene en el registro
                const recordQuantity = record.quantity || 1
                
                if (groupedRecords.has(key)) {
                  const existing = groupedRecords.get(key)!
                  existing.count += recordQuantity
                  existing.totalPrice += record.totalPrice || 0
                } else {
                  groupedRecords.set(key, {
                    record,
                    count: recordQuantity,
                    totalPrice: record.totalPrice || 0
                  })
                }
              })
              
              // Convertir grupos a OtherItems con Qty y BaseUnitMeasure
              return Array.from(groupedRecords.values()).map((group) => {
                const record = group.record
                const businessTypeXmlValue = record.businessType === "IMPORT" ? "I" : "E"
                
                // Determinar si es un servicio de impuestos AUTH
                const isAuthTaxService = ['TRK182', 'TRK175', 'TRK009'].includes(record.serviceCode || '')
                
                const otherItem: any = {
                  "IncomeRebateCode": TRUCKING_DEFAULTS.incomeRebateCode,
                  "AmntTransacCur": (-group.totalPrice).toFixed(3),
                  "BaseUnitMeasure": isAuthTaxService ? "EA" : "CTR", // EA para impuestos AUTH, CTR para contenedores
                  "Qty": group.count.toString(),
                  "ProfitCenter": "PAPANB110",
                  "ReferencePeriod": formatReferencePeriod(invoice.date),
                  "Service": record.serviceCode || "TRK002",
                  "Activity": "TRK",
                  "Pillar": TRUCKING_DEFAULTS.pillar,
                  "BUCountry": "PA",
                  "ServiceCountry": "PA",
                  "ClientType": TRUCKING_DEFAULTS.clientType,
                  "BusinessType": businessTypeXmlValue,
                  "FullEmpty": record.fullEmptyStatus || "FULL"
                }
                
                // Calcular y agregar CtrISOcode basándose en CtrType y CtrSize
                const ctrType = record.containerType || "DV"
                const ctrSize = record.containerSize || "40"
                const ctrISOcode = getCtrISOcode(ctrType, ctrSize)
                otherItem.CtrISOcode = ctrISOcode
                
                // Solo incluir CtrType, CtrSize, CtrCategory si tienen valores no vacíos
                if (record.containerType && record.containerType.trim()) {
                  otherItem.CtrType = record.containerType
                }
                if (record.containerSize && record.containerSize.trim()) {
                  otherItem.CtrSize = record.containerSize
                }
                if (record.ctrCategory && record.ctrCategory.trim()) {
                  otherItem.CtrCategory = record.ctrCategory
                }
                
                // Si no hay campos de contenedor especificados, usar valores por defecto para trasiego
                if (!record.containerType && !record.containerSize && !record.ctrCategory) {
                  otherItem.CtrType = "DV"
                  otherItem.CtrSize = "40"
                  otherItem.CtrCategory = "D"
                  otherItem.CtrISOcode = "42G1" // Valor por defecto para 40' DV
                }
                
                return otherItem
              })
            })(),
            // Luego los impuestos PTG (otherItems) - AGRUPADOS
            ...(function() {
              if (!invoice.otherItems || invoice.otherItems.length === 0) return []
              
              // Agrupar impuestos por serviceCode
              const groupedTaxes = new Map<string, {
                taxItem: any,
                count: number,
                totalPrice: number
              }>()
              
              invoice.otherItems.forEach((taxItem: any) => {
                const key = `${taxItem.serviceCode || "TRK135"}-${taxItem.description || ""}`
                
                if (groupedTaxes.has(key)) {
                  const existing = groupedTaxes.get(key)!
                  existing.count += taxItem.quantity || 1
                  existing.totalPrice += taxItem.totalPrice || 0
                } else {
                  groupedTaxes.set(key, {
                    taxItem,
                    count: taxItem.quantity || 1,
                    totalPrice: taxItem.totalPrice || 0
                  })
                }
              })
              
              // Convertir grupos a OtherItems con Qty y BaseUnitMeasure
              return Array.from(groupedTaxes.values()).map((group) => {
                const taxItem = group.taxItem
                console.log("Processing grouped tax item:", taxItem)
                
                const otherItem: any = {
                  "IncomeRebateCode": taxItem.IncomeRebateCode || "N",
                  "AmntTransacCur": (-group.totalPrice).toFixed(3),
                  "BaseUnitMeasure": "EA", // Unidad de medida para impuestos y servicios
                  "Qty": group.count.toString(),
                  "ProfitCenter": "PAPANB110",
                  "ReferencePeriod": formatReferencePeriod(invoice.date),
                  "Service": taxItem.serviceCode || "TRK135",
                  "Activity": "TRK",
                  "Pillar": "TRSP",
                  "BUCountry": "PA",
                  "ServiceCountry": "PA",
                  "ClientType": "MEDLOG",
                  "BusinessType": "E", // Los impuestos siempre son EXPORT
                  "FullEmpty": taxItem.FullEmpty || "FULL"
                }
                
                // Calcular y agregar CtrISOcode para impuestos si tienen información de contenedor
                if (taxItem.containerType && taxItem.containerSize) {
                  const ctrType = taxItem.containerType
                  const ctrSize = taxItem.containerSize
                  const ctrISOcode = getCtrISOcode(ctrType, ctrSize)
                  otherItem.CtrISOcode = ctrISOcode
                }
                
                // Solo incluir CtrType, CtrSize, CtrCategory si están definidos
                if (taxItem.containerType && taxItem.containerType.trim()) {
                  otherItem.CtrType = taxItem.containerType
                }
                if (taxItem.containerSize && taxItem.containerSize.trim()) {
                  otherItem.CtrSize = taxItem.containerSize
                }
                if (taxItem.ctrCategory && taxItem.ctrCategory.trim()) {
                  otherItem.CtrCategory = taxItem.ctrCategory
                }
                
                console.log("Generated grouped tax XML item:", otherItem)
                return otherItem
              })
            })()
          ]
        }
      }
    }
  }
  
  console.log("=== DEBUG: Final XML object ===")
  console.log("OtherItems in XML:", xmlObject["ns1:LogisticARInvoices"].CustomerInvoice.OtherItems)
  console.log("Number of OtherItems:", xmlObject["ns1:LogisticARInvoices"].CustomerInvoice.OtherItems.OtherItem.length)
  
  const xmlContent = js2xml(xmlObject, { compact: true, spaces: 2 })
  
  // Agregar la declaración XML al principio
  return '<?xml version="1.0" encoding="UTF-8"?>\n' + xmlContent
}

export function generatePTYSSInvoiceXML(invoice: PTYSSInvoiceForXml): string {
  // Validar datos requeridos
  if (!invoice.invoiceNumber || !invoice.client || !invoice.date) {
    throw new Error("Datos requeridos faltantes para generar XML PTYSS")
  }

  // Función auxiliar para generar todos los OtherItems
  const generateOtherItems = () => {
    // Agrupar registros usando la misma lógica que el PDF de PTYSS
    const groupedRecords = new Map<string, { records: any[], price: number, count: number }>()
            
            console.log("🔍 PTYSS XML - Total records to process:", invoice.records.length)
            console.log("🔍 PTYSS XML - Records:", invoice.records)
            
            invoice.records.forEach((record: PTYSSRecordForXml, index: number) => {
              const data = record.data
              
              console.log(`🔍 PTYSS XML - Processing record ${index + 1}:`, {
                id: record.id,
                data: data,
                totalValue: record.totalValue
              })
              
              // Identificar registros de trasiego: tienen line, matchedPrice, y no tienen localRouteId
              const isTrasiego = data.line && data.matchedPrice && !data.localRouteId
              
              console.log(`🔍 PTYSS XML - Is trasiego:`, isTrasiego, {
                line: data.line,
                matchedPrice: data.matchedPrice,
                localRouteId: data.localRouteId
              })
              
              if (isTrasiego) {
                // Los registros de trasiego en PTYSS tienen estos campos:
                const line = data.line || ''
                const from = data.from || ''
                const to = data.to || ''
                const size = data.size || data.containerSize || ''
                const type = data.type || data.containerType || ''
                const route = data.route || ''
                const fe = data.fe ? (data.fe.toString().toUpperCase().trim() === 'F' ? 'FULL' : 'EMPTY') : 'FULL'
                const price = (data.matchedPrice || record.totalValue || 0)
                
                // Crear clave única para agrupar por características similares (igual que PDF)
                const groupKey = `TRASIEGO|${line}|${from}|${to}|${size}|${type}|${fe}|${route}|${price}`
                
                console.log(`🔍 PTYSS XML - Trasiego groupKey:`, groupKey)
                
                if (!groupedRecords.has(groupKey)) {
                  groupedRecords.set(groupKey, {
                    records: [],
                    price: price,
                    count: 0
                  })
                  console.log(`🔍 PTYSS XML - Created new trasiego group:`, groupKey)
                }
                
                const group = groupedRecords.get(groupKey)!
                group.records.push(record)
                group.count += 1
                console.log(`🔍 PTYSS XML - Added to trasiego group. Count:`, group.count)
              } else {
                // Para registros locales, agrupar por ruta local (igual que PDF)
                const localRouteId = data.localRouteId || ''
                const localRoutePrice = data.localRoutePrice || 0
                const containerSize = data.containerSize || ''
                const containerType = data.containerType || ''
                const from = data.from || ''
                const to = data.to || ''
                
                const groupKey = `LOCAL|${localRouteId}|${containerSize}|${containerType}|${from}|${to}|${localRoutePrice}`
                
                console.log(`🔍 PTYSS XML - Local groupKey:`, groupKey)
                
                if (!groupedRecords.has(groupKey)) {
                  groupedRecords.set(groupKey, {
                    records: [],
                    price: localRoutePrice,
                    count: 0
                  })
                  console.log(`🔍 PTYSS XML - Created new local group:`, groupKey)
                }
                
                const group = groupedRecords.get(groupKey)!
                group.records.push(record)
                group.count += 1
                console.log(`🔍 PTYSS XML - Added to local group. Count:`, group.count)
              }
            })
            
            console.log("🔍 PTYSS XML - Final groups created:", groupedRecords.size)
            Array.from(groupedRecords.entries()).forEach(([key, group], index) => {
              console.log(`🔍 PTYSS XML - Group ${index + 1}: ${key} - Count: ${group.count} - Price: $${group.price}`)
            })
            
            // Convertir grupos a OtherItems (cada grupo = una línea del PDF)
            const recordItems = Array.from(groupedRecords.entries()).map(([groupKey, group]) => {
              const parts = groupKey.split('|')
              const totalPrice = group.price * group.count
              
              // Usar el primer registro del grupo para obtener los datos
              const firstRecord = group.records[0]
              const data = firstRecord.data
              
              // Determinar el código de servicio basado en el tipo de registro
              const recordType = data.recordType || ''
              const sapCode = data.sapCode || ''
              const isTrasiego = recordType === 'trasiego' || sapCode === 'TRK002' || invoice.clientName === 'PTG'
              const serviceCode = isTrasiego ? 'TRK002' : 'TRK001'
              
              // Extraer información del contenedor
              let containerSize = "40"
              let containerType = "DV"
              let ctrCategory = "D"
              
              if (parts[0] === 'TRASIEGO') {
                containerSize = parts[4] || "40" // size
                containerType = parts[5] || "DV" // type
                // Determinar categoría basada en el tipo
                if (containerType.includes('HR') || containerType.includes('HC')) {
                  ctrCategory = 'H'
                } else if (containerType.includes('RF')) {
                  ctrCategory = 'R'
                } else if (containerType.includes('CA')) {
                  ctrCategory = 'C'
                } else if (containerType.includes('DV')) {
                  ctrCategory = 'D'
                } else if (containerType.includes('FL')) {
                  ctrCategory = 'N'
                }
              } else {
                containerSize = parts[2] || "40" // containerSize
                containerType = parts[3] || "DV" // containerType
                // Determinar categoría basada en el tipo
                if (containerType.includes('HR') || containerType.includes('HC')) {
                  ctrCategory = 'H'
                } else if (containerType.includes('RF')) {
                  ctrCategory = 'R'
                } else if (containerType.includes('CA')) {
                  ctrCategory = 'C'
                } else if (containerType.includes('DV')) {
                  ctrCategory = 'D'
                } else if (containerType.includes('FL')) {
                  ctrCategory = 'N'
                }
              }
              
              // Calcular CtrISOcode basándose en CtrType y CtrSize
              const ctrISOcode = getCtrISOcode(containerType, containerSize)
              
              // Determinar FullEmpty
              const fullEmpty = parts[0] === 'TRASIEGO' ? (parts[6] || 'FULL') : 'FULL'
              
              return {
                "IncomeRebateCode": "I",
                "AmntTransacCur": (-totalPrice).toFixed(3),
                "BaseUnitMeasure": "CTR",
                "Qty": group.count.toString(),
                "ProfitCenter": "PAPANB110",
                "ReferencePeriod": formatReferencePeriod(invoice.date),
                "Service": serviceCode,
                "Activity": "TRK",
                "Pillar": "TRSP",
                "BUCountry": "PA",
                "ServiceCountry": "PA",
                "ClientType": "MEDLOG",
                "BusinessType": "I", // Siempre IMPORT para PTYSS
                "FullEmpty": fullEmpty,
                "CtrISOcode": ctrISOcode,
                "CtrType": containerType,
                "CtrSize": containerSize,
                "CtrCategory": ctrCategory,
                "SubContracting": "YES"
              }
            })
            
            // Agregar servicios locales fijos como otheritem adicionales
            const localFixedServiceItems: any[] = []
            const localFixedServiceCodes = ['CLG097', 'TRK163', 'TRK179', 'SLR168', 'TRK196', 'PESAJE']
            
            if (invoice.additionalServices && invoice.additionalServices.length > 0) {
              console.log("🔍 PTYSS XML - Processing additional services:", invoice.additionalServices)
              
              invoice.additionalServices.forEach((service) => {
                // Solo procesar servicios locales fijos
                if (localFixedServiceCodes.includes(service.serviceId)) {
                  // Mapear PESAJE a TRK196
                  const serviceCode = service.serviceId === 'PESAJE' ? 'TRK196' : service.serviceId
                  
                  console.log(`🔍 PTYSS XML - Adding local fixed service: ${serviceCode} - Amount: ${service.amount}`)
                  
                  localFixedServiceItems.push({
                    "IncomeRebateCode": "I",
                    "AmntTransacCur": (-service.amount).toFixed(3),
                    "BaseUnitMeasure": "EA", // Each (unidad) para servicios fijos
                    "Qty": "1.00",
                    "ProfitCenter": "PAPANB110",
                    "ReferencePeriod": formatReferencePeriod(invoice.date),
                    "Service": serviceCode,
                    "Activity": serviceCode.startsWith('CLG') ? "CLG" : serviceCode.startsWith('SLR') ? "SLR" : "TRK",
                    "Pillar": "TRSP",
                    "BUCountry": "PA",
                    "ServiceCountry": "PA",
                    "ClientType": "MEDLOG",
                    "BusinessType": "I" // Siempre IMPORT para PTYSS
                  })
                }
              })
            }
            
            console.log(`🔍 PTYSS XML - Total record items: ${recordItems.length}`)
            console.log(`🔍 PTYSS XML - Total local fixed service items: ${localFixedServiceItems.length}`)
            
    // Combinar registros y servicios locales fijos
    return [...recordItems, ...localFixedServiceItems]
  }
  
  // Generar los OtherItems primero
  const otherItems = generateOtherItems()
  
  // Calcular el total sumando los valores absolutos de todos los AmntTransacCur
  const totalAmount = otherItems.reduce((sum, item) => {
    const amount = Math.abs(parseFloat(item.AmntTransacCur || '0'))
    return sum + amount
  }, 0)
  
  console.log("🔍 PTYSS XML - Calculated total from OtherItems:", totalAmount)
  
  const xmlObject = {
    "ns1:LogisticARInvoices": {
      _attributes: {
        "xmlns:ns1": "urn:medlog.com:MSC_GVA_FS:CustomerInvoice:01.00"
      },
      "CustomerInvoice": {
        // Protocol Section
        "Protocol": {
          "SourceSystem": "Trucking",
          "TechnicalContact": "almeida.kant@ptyrmgmt.com;renee.taylor@ptyrmgmt.com"
        },
        // Header Section
        "Header": {
          "CompanyCode": "9326",
          "DocumentType": "XL",
          "DocumentDate": formatDateForXML(invoice.date),
          "PostingDate": invoice.sapDate ? formatDateForXML(invoice.sapDate) : formatDateForXML(invoice.date),
          "TransactionCurrency": "USD",
          "TranslationDate": formatDateForXML(invoice.date),
          "Reference": invoice.invoiceNumber,
          "EntityDocNbr": invoice.sapDocumentNumber || invoice.invoiceNumber
        },
        // AdditionalTexts Section
        "AdditionalTexts": {
          "LongHeaderTextLangKey": "EN"
        },
        // CustomerOpenItem Section - usar el total calculado de los OtherItems
        "CustomerOpenItem": {
          "CustomerNbr": invoice.client,
          "AmntTransactCur": totalAmount.toFixed(2),
          "BaselineDate": formatDateForXML(invoice.date),
          "DueDate": calculateDueDate(invoice.date)
        },
        // OtherItems Section
        "OtherItems": {
          "OtherItem": otherItems
        }
      }
    }
  }
  
  const xmlContent = js2xml(xmlObject, { compact: true, spaces: 2 })
  
  // Agregar la declaración XML al principio
  return '<?xml version="1.0" encoding="UTF-8"?>\n' + xmlContent
}

// Tipos para ShipChandler XML
export interface ShipChandlerInvoiceForXml {
  id: string
  invoiceNumber: string
  client: string
  clientName: string
  date: string
  sapDate?: string
  currency: string
  total: number
  records: ShipChandlerRecordForXml[]
  sapDocumentNumber?: string
}

export interface ShipChandlerRecordForXml {
  id: string
  data: {
    customerName: string
    invoiceNo: string
    invoiceType: string
    vessel: string
    date: string
    referenceNo: string
    deliveryAddress: string
    discount: number
    deliveryExpenses: number
    portEntryFee: number
    customsFee: number
    authorities: number
    otherExpenses: number
    overTime: number
    total: number
    clientId?: string
    clientSapCode?: string
    [key: string]: any
  }
  totalValue: number
}

// Función para generar XML de ShipChandler
export function generateShipChandlerInvoiceXML(invoice: ShipChandlerInvoiceForXml): string {
  // Validar datos requeridos
  if (!invoice.invoiceNumber || !invoice.client || !invoice.date) {
    throw new Error("Datos requeridos faltantes para generar XML ShipChandler")
  }

  // Calcular el monto total sumando todos los servicios de todos los registros
  // Los servicios a sumar son: deliveryExpenses, portEntryFee, customsFee, authorities, otherExpenses, overTime, total
  const totalAmount = invoice.records.reduce((sum, record) => {
    const data = record.data
    const recordTotal = 
      Number(data.deliveryExpenses || 0) +
      Number(data.portEntryFee || 0) +
      Number(data.customsFee || 0) +
      Number(data.authorities || 0) +
      Number(data.otherExpenses || 0) +
      Number(data.overTime || 0) +
      Number(data.total || 0)
    return sum + recordTotal
  }, 0)

  const xmlObject = {
    "ns1:LogisticARInvoices": {
      _attributes: {
        "xmlns:ns1": "urn:medlog.com:MSC_GVA_FS:CustomerInvoice:01.00"
      },
      "CustomerInvoice": {
        // Protocol Section
        "Protocol": {
          "SourceSystem": "ShipChandler",
          "TechnicalContact": "almeida.kant@ptyrmgmt.com;renee.taylor@ptyrmgmt.com"
        },
        // Header Section
        "Header": {
          "CompanyCode": "9326",
          "DocumentType": "XL",
          "DocumentDate": formatDateForXML(invoice.date),
          "PostingDate": invoice.sapDate ? formatDateForXML(invoice.sapDate) : formatDateForXML(invoice.date),
          "TransactionCurrency": "USD",
          "TranslationDate": formatDateForXML(invoice.date),
          "Reference": invoice.invoiceNumber,
          "EntityDocNbr": invoice.sapDocumentNumber || invoice.invoiceNumber
        },
        // AdditionalTexts Section
        "AdditionalTexts": {
          "LongHeaderTextLangKey": "EN"
        },
        // CustomerOpenItem Section
        "CustomerOpenItem": {
          "CustomerNbr": invoice.client,
          "AmntTransactCur": totalAmount.toFixed(2),
          "BaselineDate": formatDateForXML(invoice.date),
          "DueDate": calculateDueDate(invoice.date)
        },
        // OtherItems Section - crear una línea por cada servicio que tenga valor
        "OtherItems": {
          "OtherItem": (function() {
            const otherItems: any[] = []
            let lineNbr = 1
            
            // Mapeo de campos a service codes con sus configuraciones
            const serviceCodeConfig: Record<string, { code: string; activity: string; pillar: string }> = {
              deliveryExpenses: { code: 'TRK357', activity: 'TRK', pillar: 'TRSP' },
              portEntryFee: { code: 'CLG096', activity: 'SHP', pillar: 'TRSP' },
              customsFee: { code: 'CHB123', activity: 'SHP', pillar: 'TRSP' },
              authorities: { code: 'TRK130', activity: 'SHP', pillar: 'TRSP' }, // Mantener configuración original
              otherExpenses: { code: 'CHB122', activity: 'SHP', pillar: 'TRSP' },
              overTime: { code: 'WRH156', activity: 'SHP', pillar: 'TRSP' },
              total: { code: 'SHP243', activity: 'SHP', pillar: 'NOPS' }
            }
            
            // Procesar cada registro
            invoice.records.forEach((record: ShipChandlerRecordForXml) => {
              const data = record.data
              const invoiceNo = data.invoiceNo || ''
              
              // Crear una línea por cada campo que tenga valor mayor a 0
              Object.entries(serviceCodeConfig).forEach(([fieldName, config]) => {
                const value = Number(data[fieldName] || 0)
                if (value > 0) {
                  // Determinar el nombre del servicio para la descripción
                  const serviceNames: Record<string, string> = {
                    deliveryExpenses: 'Delivery Expenses',
                    portEntryFee: 'Port Entry Fee',
                    customsFee: 'Customs Fee',
                    authorities: 'Authorities',
                    otherExpenses: 'Other Expenses',
                    overTime: 'Over Time',
                    total: 'Total'
                  }
                  
                  const serviceName = serviceNames[fieldName] || fieldName
                  
                  // Para el service code SHP243 (campo "total"), usar ProfitCenter específico
                  const isTotalService = config.code === 'SHP243'
                  
                  otherItems.push({
                    "IncomeRebateCode": "I",
                    "AmntTransacCur": (-value).toFixed(3),
                    "BaseUnitMeasure": "EA", // Each - unidad por cada servicio
                    "Qty": "1",
                    "ProfitCenter": isTotalService ? "PAPANC441" : "PAPANB110",
                    "ReferencePeriod": formatReferencePeriod(invoice.date),
                    "Service": config.code,
                    "Activity": config.activity,
                    "Pillar": config.pillar,
                    "BUCountry": "PA",
                    "ServiceCountry": "PA",
                    "ClientType": "MEDLOG",
                    "BusinessType": "I" // Siempre IMPORT para ShipChandler
                    // SubContracting eliminado según requerimientos
                  })
                  
                  lineNbr++
                }
              })
            })
            
            return otherItems
          })()
        }
      }
    }
  }
  
  const xmlContent = js2xml(xmlObject, { compact: true, spaces: 2 })
  
  // Agregar la declaración XML al principio
  return '<?xml version="1.0" encoding="UTF-8"?>\n' + xmlContent
}

// Función para validar el XML generado
export function validateXMLForSAP(xmlString: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = []
  
  try {
    // Verificar que el XML es válido
    if (!xmlString.includes('ns1:LogisticARInvoices')) {
      errors.push("Falta el elemento raíz ns1:LogisticARInvoices")
    }
    
    if (!xmlString.includes('CustomerInvoice')) {
      errors.push("Falta el elemento CustomerInvoice")
    }
    
    // Verificar campos requeridos
    const requiredFields = [
      'CompanyCode',
      'DocumentType',
      'DocumentDate',
      'CustomerNbr',
      'AmntTransactCur'
    ]
    
    requiredFields.forEach(field => {
      if (!xmlString.includes(field)) {
        errors.push(`Falta el campo requerido: ${field}`)
      }
    })
    
    // Verificar formato de fechas (YYYYMMDD)
    const dateMatches = xmlString.match(/DocumentDate>(\d{8})</)
    if (dateMatches) {
      const date = dateMatches[1]
      const year = parseInt(date.substring(0, 4))
      const month = parseInt(date.substring(4, 6))
      const day = parseInt(date.substring(6, 8))
      
      if (year < 2020 || year > 2030) {
        errors.push("Año de fecha inválido")
      }
      if (month < 1 || month > 12) {
        errors.push("Mes de fecha inválido")
      }
      if (day < 1 || day > 31) {
        errors.push("Día de fecha inválido")
      }
    }
    
    // Verificar que hay al menos un item
    if (!xmlString.includes('OtherItem')) {
      errors.push("Debe haber al menos un item de servicio")
    }
    
    return {
      isValid: errors.length === 0,
      errors
    }
    
  } catch (error) {
    errors.push(`Error al validar XML: ${error}`)
    return {
      isValid: false,
      errors
    }
  }
}

// Función para generar un XML de prueba
export function generateTestXML(): string {
  const testInvoice: InvoiceForXmlPayload = {
    id: "TEST-001",
    module: "trucking",
    invoiceNumber: "F-DHL-01250",
    client: "1234567890",
    clientName: "DHL Express",
    date: "2025-07-04",
    dueDate: "2025-08-03",
    currency: "USD",
    total: 2485.00,
    records: [
      {
        id: "REC-001",
        description: "Servicio de transporte - Container: DHLU8901234",
        quantity: 1,
        unitPrice: 850.00,
        totalPrice: 850.00,
        serviceCode: "SRV100",
        activityCode: "CONTAINER",
        unit: "VIAJE",
        blNumber: "DHLGC987654",
        containerNumber: "DHLU8901234",
        containerSize: "40",
        containerType: "DV",
        containerIsoCode: "42G1",
        fullEmptyStatus: "FULL",
        route: "STANDARD",
        commodity: "EXPRESS",
        driverName: "Juan Pérez",
        plate: "ABC-123",
        moveDate: "2025-07-04",
        associate: "DHL_EXPRESS"
      },
      {
        id: "REC-002",
        description: "Servicio de almacenamiento - 7 días - Container: DHLU8901234",
        quantity: 7,
        unitPrice: 50.00,
        totalPrice: 350.00,
        serviceCode: "SRV200",
        activityCode: "STORAGE",
        unit: "DAYS",
        blNumber: "DHLGC987654",
        containerNumber: "DHLU8901234",
        containerSize: "40",
        containerType: "DV",
        containerIsoCode: "42G1",
        fullEmptyStatus: "FULL",
        route: "WAREHOUSE",
        commodity: "EXPRESS",
        driverName: "Juan Pérez",
        plate: "ABC-123",
        moveDate: "2025-07-04",
        associate: "STORAGE"
      },
      {
        id: "REC-003",
        description: "Servicio de manipulación de carga - Container: DHLU8901234",
        quantity: 1,
        unitPrice: 280.00,
        totalPrice: 280.00,
        serviceCode: "SRV300",
        activityCode: "HANDLING",
        unit: "VIAJE",
        blNumber: "DHLGC987654",
        containerNumber: "DHLU8901234",
        containerSize: "40",
        containerType: "DV",
        containerIsoCode: "42G1",
        fullEmptyStatus: "FULL",
        route: "TERMINAL",
        commodity: "EXPRESS",
        driverName: "Juan Pérez",
        plate: "ABC-123",
        moveDate: "2025-07-04",
        associate: "HANDLING"
      },
      {
        id: "REC-004",
        description: "Servicio de documentación y trámites aduaneros",
        quantity: 1,
        unitPrice: 150.00,
        totalPrice: 150.00,
        serviceCode: "SRV400",
        activityCode: "DOCUMENTATION",
        unit: "VIAJE",
        blNumber: "DHLGC987654",
        containerNumber: "DHLU8901234",
        containerSize: "N/A",
        containerType: "N/A",
        containerIsoCode: "N/A",
        fullEmptyStatus: "EMPTY",
        route: "OFFICE",
        commodity: "DOCUMENTS",
        driverName: "Juan Pérez",
        plate: "ABC-123",
        moveDate: "2025-07-04",
        associate: "DOCUMENTATION"
      },
      {
        id: "REC-005",
        description: "Seguro de carga internacional - Container: DHLU8901234",
        quantity: 1,
        unitPrice: 180.00,
        totalPrice: 180.00,
        serviceCode: "SRV500",
        activityCode: "INSURANCE",
        unit: "VIAJE",
        blNumber: "DHLGC987654",
        containerNumber: "DHLU8901234",
        containerSize: "40",
        containerType: "DV",
        containerIsoCode: "42G1",
        fullEmptyStatus: "FULL",
        route: "COVERAGE",
        commodity: "EXPRESS",
        driverName: "Juan Pérez",
        plate: "ABC-123",
        moveDate: "2025-07-04",
        associate: "INSURANCE"
      }
    ],
    status: "generated",
    driverId: "DRIVER-001",
    vehicleId: "VEHICLE-001",
    routeId: "ROUTE-001"
  }
  
  return generateInvoiceXML(testInvoice)
}

// Interfaces para Agency XML
export interface AgencyServiceForXml {
  _id: string
  pickupDate: string
  vessel: string
  crewMembers: Array<{
    name: string
    nationality: string
    crewRank: string
  }>
  pickupLocation: string
  dropoffLocation: string
  moveType: 'RT' | 'SINGLE'
  price: number
  currency: string
  waitingTime?: number // Waiting time en minutos
  waitingTimePrice?: number // Precio del waiting time para TRK137
}

export interface AgencyInvoiceForXml {
  invoiceNumber: string
  invoiceDate: string
  clientSapNumber: string
  services: AgencyServiceForXml[]
  additionalService?: {
    amount: number
    description: string
  }
}

// Función para generar XML de Agency (Crew)
export function generateAgencyInvoiceXML(invoice: AgencyInvoiceForXml): string {
  // Validar datos requeridos
  if (!invoice.invoiceNumber || !invoice.clientSapNumber || !invoice.invoiceDate) {
    throw new Error("Datos requeridos faltantes para generar XML de Agency")
  }

  // Calcular el total de los servicios (SHP242)
  const ship242Total = invoice.services.reduce((sum, service) => sum + (service.price || 0), 0)
  
  // Obtener el monto del servicio adicional (TRK137) - Waiting Time
  // Sumar todos los waitingTimePrice de los servicios
  const trk137Total = invoice.services.reduce((sum, service) => sum + (service.waitingTimePrice || 0), 0) || invoice.additionalService?.amount || 0
  
  // El total de la factura debe ser la suma de ambos
  const totalAmount = ship242Total + trk137Total
  
  console.log('=== DEBUG: generateAgencyInvoiceXML ===')
  console.log('Number of services:', invoice.services.length)
  console.log('SHP242 Total:', ship242Total)
  console.log('TRK137 Total (Waiting Time):', trk137Total)
  console.log('Total Amount:', totalAmount)
  console.log('Services with waiting time:', invoice.services.filter(s => (s.waitingTime || 0) > 0).length)
  
  // Crear array de OtherItems dinámicamente
  const otherItems: any[] = [];
  
  // Agregar un SHP242 por cada servicio
  invoice.services.forEach((service, index) => {
    otherItems.push({
      "IncomeRebateCode": "I",
      "AmntTransacCur": (-(service.price || 0)).toFixed(2),
      "BaseUnitMeasure": "EA",
      "Qty": "1.00",
      "ProfitCenter": "PAPANC440",
      "ReferencePeriod": formatReferencePeriod(invoice.invoiceDate),
      "Service": "SHP242",
      "Activity": "SHP",
      "Pillar": "NOPS",
      "BUCountry": "PA",
      "ServiceCountry": "PA",
      "ClientType": "MSCGVA"
    });
    
    // Si el servicio tiene waiting time, agregar un TRK137
    if (service.waitingTimePrice && service.waitingTimePrice > 0) {
      otherItems.push({
        "IncomeRebateCode": "I",
        "AmntTransacCur": (-(service.waitingTimePrice || 0)).toFixed(2),
        "BaseUnitMeasure": "EA",
        "Qty": "1.00",
        "ProfitCenter": "PAPANC430",
        "ReferencePeriod": formatReferencePeriod(invoice.invoiceDate),
        "Service": "TRK137",
        "Activity": "TRK",
        "Pillar": "TRSP",
        "BUCountry": "PA",
        "ServiceCountry": "PA",
        "ClientType": "MSCGVA",
        "FullEmpty": "FULL"
      });
    }
  });
  
  console.log('Total OtherItems generated:', otherItems.length)

  const xmlObject = {
    "ns1:LogisticARInvoices": {
      _attributes: {
        "xmlns:ns1": "urn:medlog.com:MSC_GVA_FS:CustomerInvoice:01.00"
      },
      "CustomerInvoice": {
        // Protocol Section - específico para CREW
        "Protocol": {
          "SourceSystem": "CREW",
          "TechnicalContact": "E-almeida.kant@msc.com;E-renee.taylor@msc.com"
        },
        // Header Section
        "Header": {
          "CompanyCode": "9326",
          "DocumentType": "XL",
          "DocumentDate": formatDateForXML(invoice.invoiceDate),
          "PostingDate": formatDateForXML(invoice.invoiceDate),
          "TransactionCurrency": "USD",
          "Reference": invoice.invoiceNumber,
          "EntityDocNbr": invoice.invoiceNumber
        },
        // AdditionalTexts Section
        "AdditionalTexts": {
          "LongHeaderTextLangKey": "EN"
        },
        // CustomerOpenItem Section - monto en POSITIVO
        "CustomerOpenItem": {
          "CustomerNbr": invoice.clientSapNumber,
          "AmntTransactCur": totalAmount.toFixed(2),
          "BaselineDate": formatDateForXML(invoice.invoiceDate),
          "DueDate": calculateDueDate(invoice.invoiceDate)
        },
        // OtherItems Section - items dinámicos según servicios
        "OtherItems": {
          "OtherItem": otherItems
        }
      }
    }
  }

  const xmlContent = js2xml(xmlObject, { compact: true, spaces: 2 })
  
  // Agregar la declaración XML al principio
  return '<?xml version="1.0" encoding="UTF-8"?>\n' + xmlContent
}

// Función para probar conexión SFTP
export async function testSftpConnection() {
  try {
    const response = await fetch('/api/invoices/test-sftp-connection', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })

    const result = await response.json()
    
    if (!response.ok) {
      throw new Error(result.message || 'Error al probar conexión SFTP')
    }

    return result
  } catch (error: any) {
    console.error('Error al probar conexión SFTP:', error)
    throw error
  }
}

// Función para probar conexión FTP tradicional
export async function testFtpTraditional() {
  try {
    const response = await fetch('/api/invoices/test-ftp-traditional', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })

    const result = await response.json()
    
    if (!response.ok) {
      throw new Error(result.message || 'Error al probar conexión FTP tradicional')
    }

    return result
  } catch (error: any) {
    console.error('Error al probar conexión FTP tradicional:', error)
    throw error
  }
}

// Función para enviar XML a SAP vía SFTP
export async function sendXmlToSapSftp(invoiceId: string, xmlContent: string, fileName: string) {
  try {
    const response = await fetch(`/api/invoices/${invoiceId}/send-xml-to-sap-sftp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({
        xmlContent,
        fileName
      })
    })

    const result = await response.json()
    
    if (!response.ok) {
      throw new Error(result.message || 'Error al enviar XML a SAP via SFTP')
    }

    return result
  } catch (error: any) {
    console.error('Error al enviar XML a SAP via SFTP:', error)
    throw error
  }
}

// Función para enviar XML a SAP vía FTP tradicional
export async function sendXmlToSapFtp(invoiceId: string, xmlContent: string, fileName: string) {
  try {
    const response = await fetch(`/api/invoices/${invoiceId}/send-xml-to-sap-ftp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({
        xmlContent,
        fileName
      })
    })

    const result = await response.json()
    
    if (!response.ok) {
      throw new Error(result.message || 'Error al enviar XML a SAP via FTP')
    }

    return result
  } catch (error: any) {
    console.error('Error al enviar XML a SAP via FTP:', error)
    throw error
  }
}
