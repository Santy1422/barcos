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
                const key = `${record.serviceCode || "TRK002"}-${record.description}-${record.unitPrice}-${record.containerType || "DV"}-${record.containerSize || "40"}-${record.fullEmptyStatus || "FULL"}-${record.businessType || "IMPORT"}`
                
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

  // Calcular el monto total de los servicios
  const totalAmount = invoice.records.reduce((sum, record) => {
    return sum + (record.totalValue || 0)
  }, 0)

  const xmlObject = {
    "ns1:LogisticARInvoices": {
      _attributes: {
        "xmlns:ns1": "urn:medlog.com:MSC_GVA_FS:CustomerInvoice:01.00"
      },
      "CustomerInvoice": {
        // Protocol Section
        "Protocol": {
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
        // OtherItems Section
        "OtherItems": {
          "OtherItem": invoice.records.map((record: PTYSSRecordForXml, index: number) => {
            // Determinar el valor de BusinessType para el XML (texto completo)
            const businessTypeXmlValue = record.data.operationType === "export" ? "EXPORT" : "IMPORT"
            
            // Mapear tamaño de contenedor PTYSS a formato SAP
            const containerSizeMap: { [key: string]: string } = {
              "20": "20",
              "40": "40",
              "45": "45",
              "20'": "20",
              "40'": "40",
              "45'": "45"
            }
            
            const containerSize = containerSizeMap[record.data.containerSize] || "40"
            
            // Mapear tipo de contenedor PTYSS a formato SAP
            const containerTypeMap: { [key: string]: string } = {
              "DRY": "DV",
              "DV": "DV",
              "REEFER": "RF",
              "RF": "RF",
              "TANK": "TK",
              "TK": "TK",
              "FLAT": "FL",
              "FL": "FL"
            }
            
            const containerType = containerTypeMap[record.data.containerType] || "FL"
            
            // Generar ISO code basado en tamaño y tipo según el ejemplo
            const generateIsoCode = (size: string, type: string): string => {
              if (size === "40" && type === "FL") {
                return "42P1" // Como en el ejemplo
              }
              // Otros mapeos básicos
              const sizeCode = size === "20" ? "2" : size === "40" ? "4" : size === "45" ? "L" : "4"
              const typeCode = type === "RF" ? "H" : type === "TK" ? "T" : type === "FL" ? "P" : "G"
              return `${sizeCode}${typeCode}1`
            }
            
            const isoCode = generateIsoCode(containerSize, containerType)
            
            // Determinar categoría del contenedor
            const ctrCategory = containerType === "FL" ? "N" : containerType.substring(0, 1)
            
            // Determinar el código de servicio basado en el tipo de registro
            const recordType = record.data.recordType || ''
            const sapCode = record.data.sapCode || ''
            // Fallback: si el cliente es PTG, o sapCode es TRK002, forzar trasiego
            const isTrasiego = recordType === 'trasiego' || sapCode === 'TRK002' || invoice.clientName === 'PTG'
            const serviceCode = isTrasiego ? 'TRK002' : 'TRK001'
            return {
              "IncomeRebateCode": "I",
              "AmntTransacCur": (-record.totalValue).toFixed(3),
              "BaseUnitMeasure": "CTR",
              "Qty": "1.00",
              "ProfitCenter": "PAPANB110",
              "ReferencePeriod": formatReferencePeriod(invoice.date),
              "Service": serviceCode,
              "Activity": "TRK",
              "Pillar": "TRSP",
              "BUCountry": "PAN",
              "ServiceCountry": "PAN",
              "ClientType": "MEDLOG",
              "BusinessType": businessTypeXmlValue,
              "FullEmpty": "FULL",
              "CtrISOcode": isoCode,
              "CtrType": containerType,
              "CtrSize": containerSize,
              "CtrCategory": ctrCategory,
              "SubContracting": "YES"
            }
          })
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
  console.log('SHP242 Total:', ship242Total)
  console.log('TRK137 Total (Waiting Time):', trk137Total)
  console.log('Total Amount:', totalAmount)
  console.log('Services with waiting time:', invoice.services.filter(s => s.waitingTime > 0))

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
          "AmntTransacCur": totalAmount.toFixed(2),
          "BaselineDate": formatDateForXML(invoice.invoiceDate),
          "DueDate": calculateDueDate(invoice.invoiceDate)
        },
        // OtherItems Section - siempre 2 items en NEGATIVO
        "OtherItems": {
          "OtherItem": [
            // Primer OtherItem: SHP242 - Crew Transportation
            {
              "IncomeRebateCode": "I",
              "AmntTransacCur": (-ship242Total).toFixed(2),
              "BaseUnitMeasure": "EA",
              "Qty": "1.00",
              "ProfitCenter": "PAPANA110",
              "ReferencePeriod": formatReferencePeriod(invoice.invoiceDate),
              "Service": "SHP242",
              "Activity": "SHP",
              "Pillar": "NOPS",
              "BUCountry": "PA",
              "ServiceCountry": "PA",
              "ClientType": "MSCGVA"
            },
            // Segundo OtherItem: TRK137 - Transportation
            {
              "IncomeRebateCode": "I",
              "AmntTransacCur": (-trk137Total).toFixed(2),
              "BaseUnitMeasure": "EA",
              "Qty": "1.00",
              "ProfitCenter": "PAPANA110",
              "ReferencePeriod": formatReferencePeriod(invoice.invoiceDate),
              "Service": "TRK137",
              "Activity": "TRK",
              "Pillar": "TRSP",
              "BUCountry": "PA",
              "ServiceCountry": "PA",
              "ClientType": "MSCGVA",
              "FullEmpty": "FULL"
            }
          ]
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
