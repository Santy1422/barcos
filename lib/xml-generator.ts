import type { Invoice, InvoiceRecord } from "@/lib/features/invoice/invoiceSlice"
// Corrected import for xml-js
import { js2xml } from "xml-js"

function formatDateForXML(dateString: string): string {
  const date = new Date(dateString)
  const year = date.getFullYear()
  const month = (date.getMonth() + 1).toString().padStart(2, "0")
  const day = date.getDate().toString().padStart(2, "0")
  return `${year}${month}${day}`
}

export function generateInvoiceXML(invoice: Invoice): string {
  const xmlObject = {
    _declaration: { _attributes: { version: "1.0", encoding: "UTF-8" } },
    "ns1:LogisticARInvoices": {
      _attributes: {
        "xmlns:ns1": "urn:medlog.com:MSC_GVA_FS:CustomerInvoice:01.00",
      },
      CustomerInvoice: {
        Protocol: {
          SourceSystem: "CMSTH", // Puede ser dinámico o configurable
          TechnicalContact: "patrick@logisticssystem.com", // Puede ser dinámico o configurable
        },
        Header: {
          CompanyCode: invoice.module === "trucking" ? "6820" : invoice.module === "shipchandler" ? "6721" : "9121", // Ejemplo, ajustar según lógica
          DocumentType: "XL",
          DocumentDate: formatDateForXML(invoice.date),
          PostingDate: formatDateForXML(invoice.date), // O usar una fecha de posteo diferente si es necesario
          TransactionCurrency: invoice.currency,
          Reference: invoice.invoiceNumber,
          EntityDocNbr: invoice.invoiceNumber, // O un número de documento de entidad diferente
        },
        CustomerOpenItem: {
          CustomerNbr: invoice.client, // Asumiendo que el 'client' es el CustomerNbr
          AmntTransactCur: invoice.total.toFixed(2),
          AmntCpyCur: invoice.total.toFixed(2), // Asumiendo misma moneda para compañía
          ProfitCenter: "THLCHA211", // Ejemplo, debe ser dinámico o configurable
          BusinessPlace: "0003", // Ejemplo, debe ser dinámico o configurable
          BaselineDate: formatDateForXML(invoice.date),
          DueDate: formatDateForXML(
            new Date(new Date(invoice.date).setDate(new Date(invoice.date).getDate() + 30)).toISOString(),
          ), // Ejemplo: Vence en 30 días
          AssignmentNbr: invoice.invoiceNumber,
          BL: invoice.records[0]?.blNumber || "", // Tomar BL del primer registro si existe
          REF_KEY1: "",
          REF_KEY2: "",
          REF_KEY3: "",
        },
        OtherItems: {
          OtherItem: invoice.records.map((record: InvoiceRecord) => ({
            IncomeRebateCode: "I",
            CompanyCode: invoice.module === "trucking" ? "6820" : invoice.module === "shipchandler" ? "6721" : "9121",
            AmntTransacCur: (-record.totalPrice || -record.totalRate || 0).toFixed(2), // Negativo como en el ejemplo
            AmntCpyCur: (-record.totalPrice || -record.totalRate || 0).toFixed(2),
            TaxCode: "O7", // Ejemplo, debe ser dinámico
            TaxAmntDocCur: (-(record.totalPrice || record.totalRate || 0) * 0.07).toFixed(2), // Asumiendo 7% de impuesto, ajustar
            TaxAmntCpyCur: (-(record.totalPrice || record.totalRate || 0) * 0.07).toFixed(2),
            BaseUnitMeasure: record.unit || "CTR", // 'CTR' o la unidad del registro
            Qty: record.quantity || 1,
            ProfitCenter: "THLCHA211", // Ejemplo
            ReferencePeriod: `${(new Date(invoice.date).getMonth() + 1).toString().padStart(2, "0")}.${new Date(invoice.date).getFullYear()}`,
            Service: record.serviceCode || record.productCode || "ICD043", // Código del servicio/producto
            Activity: invoice.module === "trucking" ? "TRK" : invoice.module === "shipchandler" ? "SUP" : "AGY", // TRK, SUP, AGY
            Pillar: "INFR", // Ejemplo
            ServiceCountry: "PA", // Ejemplo, Panamá
            ClientType: "THIRDP", // Ejemplo
            BusinessType: "E", // Ejemplo
            FullEmpty: record.fullEmptyStatus || "EMPTY", // FULL o EMPTY
            CtrISOcode: record.containerIsoCode || "42G1", // Ejemplo
            CtrType: record.containerType || "DV", // Ejemplo
            CtrSize: record.containerSize || "40", // Ejemplo
            LineItemText:
              record.description ||
              record.productName ||
              `${record.serviceCode || "N/A"} (${record.containerSize || "N/A"}')`,
            BL: record.blNumber || "",
            CtrNbr: record.containerNumber || "",
            REF_KEY1: "",
            REF_KEY2: "",
            REF_KEY3: "",
          })),
        },
      },
    },
  }
  // Corrected usage of js2xml
  return js2xml(xmlObject, { compact: true, spaces: 2 })
}
