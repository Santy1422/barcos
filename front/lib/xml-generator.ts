import type { InvoiceForXmlPayload, InvoiceLineItemForXml } from "@/lib/features/invoice/invoiceSlice"
import { js2xml } from "xml-js"

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

export function generateInvoiceXML(invoice: InvoiceForXmlPayload): string {
  // Validar datos requeridos
  if (!invoice.invoiceNumber || !invoice.client || !invoice.date) {
    throw new Error("Datos requeridos faltantes para generar XML")
  }

  const xmlObject = {
    _declaration: { _attributes: { version: "1.0", encoding: "utf-8" } },
    "LogisticARInvoices": {
      _attributes: {
        "xmlns:xsi": "http://www.w3.org/2001/XMLSchema-instance",
        "xmlns": "urn:medlog.com:MSC_GVA_FS:CustomerInvoice:01.00",
        "targetNamespace": "urn:medlog.com:MSC_GVA_FS:CustomerInvoice:01.00"
      },
      "CustomerInvoice": {
        // Protocol Section
        "Protocol": {
          "TechnicalContact": "almeida.kant@ptyrmgmt.com / renee.taylor@ptyrmgmt.com",
          "Timestamp": formatDateForXML(invoice.date) + formatTimeForXML(new Date().toISOString()),
          "Version": "01.00"
        },
        // Header Section
        "Header": {
          "CompanyCode": invoice.module === "trucking" ? "932" : invoice.module === "shipchandler" ? "6721" : "9121",
          "DocumentType": "XL",
          "DocumentDate": formatDateForXML(invoice.date),
          "PostingDate": formatDateForXML(invoice.date),
          "TransactionCurrency": invoice.currency || "USD",
          "TranslationDate": formatDateForXML(invoice.date),
          "EntityDocNbr": invoice.invoiceNumber,
          "ReferenceDocument": invoice.invoiceNumber,
          "DocumentText": `Factura ${invoice.module} - ${invoice.invoiceNumber}`
        },
        // AdditionalTexts Section
        "AdditionalTexts": {
          "LongHeaderTextLangKey": "EN",
          "LongHeaderText": `Factura de ${invoice.module} - ${invoice.clientName || invoice.client}`
        },
        // CustomerOpenItem Section
        "CustomerOpenItem": {
          "CustomerNbr": invoice.client,
          "AmntTransactCur": invoice.total.toFixed(2),
          "PmtTerms": "NET30",
          "PaymentMethod": "BANK_TRANSFER",
          "DueDate": formatDateForXML(invoice.dueDate || invoice.date)
        },
        // OtherItems Section
        "OtherItems": {
          "OtherItem": invoice.records.map((record: InvoiceLineItemForXml, index: number) => ({
            "IncomeRebateCode": "I",
            "CompanyCode": invoice.module === "trucking" ? "932" : invoice.module === "shipchandler" ? "6721" : "9121",
            "BaseUnitMeasure": "EA",
            "Qty": record.quantity || 1,
            "ProfitCenter": "1000",
            "InternalOrder": "",
            "Bundle": record.serviceCode || "TRUCKING",
            "Service": record.serviceCode || "TRANSPORT",
            "Activity": record.activityCode || "CONTAINER",
            "Pillar": "LOGISTICS",
            "BUCountry": "PA",
            "ServiceCountry": "PA",
            "RepairTyp": "N/A",
            "ClientType": "COMMERCIAL",
            "BusinessType": "IMPORT",
            "FullEmpty": record.fullEmptyStatus || "FULL",
            "CtrISOcode": record.containerIsoCode || "42G1",
            "CtrType": record.containerType || "DV",
            "CtrSize": record.containerSize || "40",
            "CtrCategory": "STANDARD",
            "SalesOrder": "",
            "Route": record.route || "STANDARD",
            "Commodity": record.commodity || "GENERAL",
            "SubContracting": "NO",
            "CtrNbr": record.containerNumber || "",
            "AmntTransacCur": (record.totalPrice || 0).toFixed(3),
            "AmntCpyCur": (record.totalPrice || 0).toFixed(3),
            "TaxCode": "O7",
            "TaxAmntDocCur": ((record.totalPrice || 0) * 0.07).toFixed(3),
            "TaxAmntCpyCur": ((record.totalPrice || 0) * 0.07).toFixed(3),
            "ReferencePeriod": `${(new Date(invoice.date).getMonth() + 1).toString().padStart(2, "0")}.${new Date(invoice.date).getFullYear()}`,
            "AssignmentNbr": invoice.invoiceNumber,
            "LineItemText": record.description || `${record.serviceCode || "TRANSPORT"} (${record.containerSize || "40"}')`,
            "BL": record.blNumber || "",
            "REF_KEY1": invoice.invoiceNumber,
            "REF_KEY2": record.containerNumber || "",
            "REF_KEY3": record.blNumber || "",
            "LineItemNumber": (index + 1).toString().padStart(3, "0"),
            "DriverName": record.driverName || invoice.driverId || "",
            "VehiclePlate": record.plate || invoice.vehicleId || "",
            "MoveDate": record.moveDate ? formatDateForXML(record.moveDate) : formatDateForXML(invoice.date),
            "Associate": record.associate || ""
          }))
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
    invoiceNumber: "F-TRK-12345",
    client: "12345678-1",
    clientName: "Cliente de Prueba",
    date: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    currency: "USD",
    total: 500.00,
    records: [
      {
        id: "REC-001",
        description: "Servicio de transporte - Container: ABCD1234567",
        quantity: 1,
        unitPrice: 500.00,
        totalPrice: 500.00,
        serviceCode: "SRV100",
        unit: "VIAJE",
        blNumber: "BL123456789",
        containerNumber: "ABCD1234567",
        containerSize: "40",
        containerType: "DV",
        driverName: "Juan Pérez",
        plate: "ABC-123",
        moveDate: new Date().toISOString().split('T')[0],
        associate: "Empresa Asociada"
      }
    ],
    status: "generated",
    driverId: "DRIVER-001",
    vehicleId: "VEHICLE-001",
    routeId: "ROUTE-001"
  }
  
  return generateInvoiceXML(testInvoice)
}
