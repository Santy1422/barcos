import type { Invoice, InvoiceRecord } from "@/lib/features/invoice/invoiceSlice"
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
    _declaration: { _attributes: { version: "1.0", encoding: "utf-8" } },
    "LogisticARInvoices": {
      _attributes: {
        "xmlns:xsi": "http://www.w3.org/2001/XMLSchema-instance",
        "xmlns": "urn:medlog.com:MSC_GVA_FS:CustomerInvoice:01.00",
        "targetNamespace": "urn:medlog.com:MSC_GVA_FS:CustomerInvoice:01.00"
      },
      CustomerInvoice: {
        _attributes: { xmlns: "" },
        complexType: {
          _attributes: { name: "CustomerInvoices" }
        },
        sequence: {},
        element: {
          _attributes: { 
            name: "CustomerInvoice", 
            maxOccurs: "unbounded" 
          }
        },
        // Protocol Section
        Protocol: {
          TechnicalContact: "almeida.kant@ptyrmgmt.com / renee.taylor@ptyrmgmt.com"
        },
        // Header Section
        Header: {
          CompanyCode: invoice.module === "trucking" ? "932" : invoice.module === "shipchandler" ? "6721" : "9121",
          DocumentType: "XL",
          DocumentDate: formatDateForXML(invoice.date), // ISSUE_DATE
          PostingDate: formatDateForXML(invoice.date), // POSTING_DATE
          TransactionCurrency: invoice.currency || "USD",
          TranslationDate: formatDateForXML(invoice.date), // POSTING_DATE
          EntityDocNbr: invoice.invoiceNumber // SAP_DOCUMENT_NUMBER
        },
        // AdditionalTexts Section
        AdditionalTexts: {
          LongHeaderTextLangKey: "EN"
        },
        // CustomerOpenItem Section
        CustomerOpenItem: {
          CustomerNbr: invoice.clientSapNumber || invoice.client, // Usar número SAP del cliente
          AmntTransactCur: invoice.total.toFixed(2),
          PmtTerms: invoice.paymentTerms || "NET30"
        },
        // OtherItems Section
        OtherItems: {
          OtherItem: invoice.records.map((record: InvoiceRecord) => ({
            IncomeRebateCode: "I",
            CompanyCode: invoice.companyCode || "932", // ✅ Corregido
            BaseUnitMeasure: "EA", // ✅ Mejorado de "SAP - ECC"
            Qty: record.quantity || 1,
            ProfitCenter: invoice.profitCenter || "1000",
            InternalOrder: invoice.internalOrder || "",
            Bundle: record.serviceCode || invoice.serviceCode || "TRUCKING", // ⚠️ Mejorar mapeo
            Service: record.serviceCode || invoice.serviceCode || "TRANSPORT",
            Activity: record.activityCode || invoice.activityCode || "CONTAINER",
            Pillar: invoice.pillar || "LOGISTICS",
            BUCountry: invoice.buCountry || "PA",
            ServiceCountry: invoice.serviceCountry || "PA",
            RepairTyp: record.repairType || "N/A",
            ClientType: invoice.clientType || "COMMERCIAL",
            BusinessType: invoice.businessType || "IMPORT",
            FullEmpty: record.fullEmptyStatus || "FULL", // ⚠️ Necesita mapeo desde Excel
            CtrISOcode: record.containerIsoCode || "42G1", // ⚠️ Necesita mapeo desde Excel
            CtrType: record.containerType || "DV",
            CtrSize: record.containerSize || "40",
            CtrCategory: record.containerCategory || "STANDARD",
            SalesOrder: invoice.salesOrder || "",
            Route: record.route || invoice.routeName || "STANDARD",
            Commodity: record.commodity || "GENERAL",
            SubContracting: invoice.subContracting || "NO",
            CtrNbr: record.containerNumber || "",
            // Corregir cálculos de montos
            AmntTransacCur: (record.totalPrice || record.totalRate || 0).toFixed(3), // 3 decimales como especifica SAP
            AmntCpyCur: (record.totalPrice || record.totalRate || 0).toFixed(3),
            TaxCode: invoice.taxCode || "O7",
            TaxAmntDocCur: ((record.totalPrice || record.totalRate || 0) * (invoice.taxRate || 0.07)).toFixed(3),
            TaxAmntCpyCur: ((record.totalPrice || record.totalRate || 0) * (invoice.taxRate || 0.07)).toFixed(3),
            ReferencePeriod: `${(new Date(invoice.date).getMonth() + 1).toString().padStart(2, "0")}.${new Date(invoice.date).getFullYear()}`,
            AssignmentNbr: invoice.invoiceNumber,
            LineItemText: record.description || record.productName || `${record.serviceCode || "TRANSPORT"} (${record.containerSize || "40"}')`,
            BL: record.blNumber || "",
            REF_KEY1: invoice.refKey1 || "",
            REF_KEY2: invoice.refKey2 || "",
            REF_KEY3: invoice.refKey3 || ""
          }))
        }
      }
    }
  }
  
  return js2xml(xmlObject, { compact: true, spaces: 2 })
}
