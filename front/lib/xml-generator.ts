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
  const date = new Date(dateString)
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

// Función para generar nombre de archivo XML según estructura SAP
export function generateXmlFileName(): string {
  const now = new Date()
  const year = now.getFullYear().toString().slice(-2) // últimos 2 dígitos del año
  const month = (now.getMonth() + 1).toString().padStart(2, '0')
  const day = now.getDate().toString().padStart(2, '0')
  const hours = now.getHours().toString().padStart(2, '0')
  const minutes = now.getMinutes().toString().padStart(2, '0')
  const seconds = now.getSeconds().toString().padStart(2, '0')
  
  // Estructura: 9326_XL_yymmdd_hhmmss.XML
  return `9326_XL_${year}${month}${day}_${hours}${minutes}${seconds}.XML`
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
      throw new Error(result.message || 'Error al enviar XML a SAP')
    }

    return result
  } catch (error: any) {
    console.error('Error al enviar XML a SAP:', error)
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

export function generateInvoiceXML(invoice: InvoiceForXmlPayload): string {
  // Validar datos requeridos
  if (!invoice.invoiceNumber || !invoice.client || !invoice.date) {
    throw new Error("Datos requeridos faltantes para generar XML")
  }

  // Calcular el monto total de las rutas (AmntTransactCur)
  const routeAmountTotal = invoice.records.reduce((sum, record) => {
    // Usar routeAmount si está disponible, sino usar totalPrice como fallback
    const routeAmount = (record as any).routeAmount || record.totalPrice || 0
    return sum + routeAmount
  }, 0)

  const xmlObject = {
    _declaration: { _attributes: { version: "1.0", encoding: "utf-8" } },
    "LogisticARInvoices": {
      _attributes: {
        "xmlns": "urn:medlog.com:MSC_GVA_FS:CustomerInvoice:01.00",
        "targetNamespace": "urn:medlog.com:MSC_GVA_FS:CustomerInvoice:01.00"
      },
      "CustomerInvoice": {
        // Protocol Section
        "Protocol": {
          "SourceSystem": "DEP",
          "TechnicalContact": "almeida.kant@ptyrmgmt.com / renee.taylor@ptyrmgmt.com"
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
          "CustomerNbr": invoice.client,
          "AmntTransactCur": routeAmountTotal.toFixed(3)
        },
        // OtherItems Section
        "OtherItems": {
          "OtherItem": invoice.records.map((record: InvoiceLineItemForXml, index: number) => {
            // Determinar el valor de BusinessType para el XML (I o E)
            const businessTypeXmlValue = record.businessType === "IMPORT" ? "I" : "E"
            
            return {
              "IncomeRebateCode": TRUCKING_DEFAULTS.incomeRebateCode,
              "AmntTransacCur": (record.totalPrice || 0).toFixed(3),
              "TaxCode": (record as any).taxCode || "O7",
              "TaxAmntDocCur": ((record as any).taxAmntDocCur || 0),
              "TaxAmntCpyCur": ((record as any).taxAmntCpyCur || 0),
              "ProfitCenter": (record as any).profitCenter || "1000",
              "InternalOrder": record.internalOrder || "",
              "Bundle": record.bundle || "0000",
              "Service": "TRK001",
              "Activity": "TRK",
              "Pillar": TRUCKING_DEFAULTS.pillar,
              "BUCountry": TRUCKING_DEFAULTS.buCountry,
              "ServiceCountry": TRUCKING_DEFAULTS.serviceCountry,
              "RepairTyp": TRUCKING_DEFAULTS.repairTyp,
              "ClientType": TRUCKING_DEFAULTS.clientType,
              "BusinessType": businessTypeXmlValue,
              "FullEmpty": record.fullEmptyStatus || "FULL",
              "CtrISOcode": record.containerIsoCode || "D",
              "CtrType": record.containerType || "DV",
              "CtrSize": record.containerSize || "40",
              "CtrCategory": record.ctrCategory || "D",
              "SalesOrder": record.salesOrder || "",
              "Route": record.route || "STANDARD",
              "Commodity": record.commodity || "10",
              "SubContracting": record.subcontracting || "N"
            }
          })
        }
      }
    }
  }
  
  return js2xml(xmlObject, { compact: true, spaces: 2 })
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
    _declaration: { _attributes: { version: "1.0", encoding: "UTF-8" } },
    "LogisticARInvoices": {
      _attributes: {
        "xmlns": "urn:medlog.com:MSC_GVA_FS:CustomerInvoice:01.00",
        "targetNamespace": "urn:medlog.com:MSC_GVA_FS:CustomerInvoice:01.00"
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
          "AmntTransactCur": totalAmount.toFixed(2)
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
            
            return {
              "IncomeRebateCode": "I",
              "CompanyCode": "9326",
              "BaseUnitMeasure": "EA",
              "Qty": "1",
              "ProfitCenter": "1000",
              "Service": "TRK001",
              "Activity": "TRK",
              "Pillar": "TRSP",
              "BUCountry": "PA",
              "ServiceCountry": "PA",
              "ClientType": "MEDLOG",
              "BusinessType": businessTypeXmlValue,
              "FullEmpty": "FULL",
              "CtrISOcode": isoCode,
              "CtrType": containerType,
              "CtrSize": containerSize,
              "CtrCategory": ctrCategory,
              "SubContracting": "YES",
              "AmntTransacCur": (record.totalValue || 0).toFixed(2),
              "AmntCpyCur": (record.totalValue || 0).toFixed(2)
            }
          })
        }
      }
    }
  }
  
  return js2xml(xmlObject, { compact: true, spaces: 2 })
}

// Función para validar el XML generado
export function validateXMLForSAP(xmlString: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = []
  
  try {
    // Verificar que el XML es válido
    if (!xmlString.includes('<?xml')) {
      errors.push("El XML no tiene declaración válida")
    }
    
    if (!xmlString.includes('LogisticARInvoices')) {
      errors.push("Falta el elemento raíz LogisticARInvoices")
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
