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
          CompanyCode: invoice.module === "trucking" ? "932?" : invoice.module === "shipchandler" ? "6721" : "9121",
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
          CustomerNbr: invoice.client, // SAP_CUSTOMER_NUMBER
          AmntTransactCur: invoice.total.toFixed(2), // INVOICE_AMOUNT
          PmtTerms: "PAYMENT_TERM_TABLE"
        },
        // OtherItems Section
        OtherItems: {
          OtherItem: invoice.records.map((record: InvoiceRecord) => ({
            IncomeRebateCode: "I", // I = INCOME
            CompanyCode: "SERVICE_DIMENSION",
            BaseUnitMeasure: "SAP - ECC",
            Qty: record.quantity || 1, // DEPENDS_ON_BASE_UNIT
            ProfitCenter: "SAP - ECC",
            InternalOrder: "", // string(12)
            Bundle: "SERVICE_DIMENSION",
            Service: "SERVICE_DIMENSION",
            Activity: "SERVICE_DIMENSION",
            Pillar: "SERVICE_DIMENSION",
            BUCountry: "SERVICE_DIMENSION",
            ServiceCountry: "SERVICE_DIMENSION",
            RepairTyp: "SERVICE_DIMENSION",
            ClientType: "SERVICE_DIMENSION",
            BusinessType: "SERVICE_DIMENSION",
            FullEmpty: record.fullEmptyStatus || "FULL / EMPTY",
            CtrISOcode: record.containerIsoCode || "SERVICE_DIMENSION",
            CtrType: "SERVICE_DIMENSION",
            CtrSize: "SERVICE_DIMENSION",
            CtrCategory: "SERVICE_DIMENSION",
            SalesOrder: "SERVICE_WITH_OUT_CONTRACT",
            Route: "SERVICE_DIMENSION",
            Commodity: "SERVICE_DIMENSION",
            SubContracting: "YES / NO",
            CtrNbr: record.containerNumber || "CONTAINER_NUMBER",
            // Campos adicionales según el esquema
            AmntTransacCur: (-record.totalPrice || -record.totalRate || 0).toFixed(2),
            AmntCpyCur: (-record.totalPrice || -record.totalRate || 0).toFixed(2),
            TaxCode: "O7",
            TaxAmntDocCur: (-(record.totalPrice || record.totalRate || 0) * 0.07).toFixed(2),
            TaxAmntCpyCur: (-(record.totalPrice || record.totalRate || 0) * 0.07).toFixed(2),
            ReferencePeriod: `${(new Date(invoice.date).getMonth() + 1).toString().padStart(2, "0")}.${new Date(invoice.date).getFullYear()}`,
            AssignmentNbr: invoice.invoiceNumber,
            LineItemText: record.description || record.productName || `${record.serviceCode || "N/A"} (${record.containerSize || "N/A"}')`,
            BL: record.blNumber || "",
            REF_KEY1: "",
            REF_KEY2: "",
            REF_KEY3: ""
          }))
        }
      }
    }
  }
  
  return js2xml(xmlObject, { compact: true, spaces: 2 })
}
