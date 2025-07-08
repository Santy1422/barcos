// This slice is now primarily for defining types related to invoice structure and XML payload.
// The actual storage of generated invoices is handled by recordsSlice.ts.

import { createSlice, type PayloadAction } from "@reduxjs/toolkit"

// This is the structure for a line item specifically for the XML generation.
// It should contain all fields needed for the XML schema.
export interface InvoiceLineItemForXml {
  id: string // Unique ID for this line item (can be the ExcelRecord.id)
  description?: string
  quantity?: number
  unitPrice?: number
  totalPrice: number
  serviceCode?: string
  activityCode?: string // TRK por defecto
  unit?: string
  blNumber?: string
  containerNumber?: string
  containerSize?: string // 0, 10, 20, 22, 23, 24, 25, 26, 30, 40, 45, 48, 53, 8
  containerType?: string // BB, BH, BV, DV, FL, FT, HC, HH, HO, HP, HR, HT, IS, OS, OT, PL, PP, PW, RE, SH, SR, ST, SW, TH, TK, TS, VE, XX, ZZ
  containerIsoCode?: string // A, B, D, DRY, N, R, REEFE, T
  ctrCategory?: string // Categoría extraída del código ISO
  fullEmptyStatus?: "FULL" | "EMPTY"
  businessType?: "IMPORT" | "EXPORT" // Se guarda I o E en el XML
  internalOrder?: string // Orden interna para el XML
  salesOrder?: string // Orden de venta para el XML
  bundle?: string // Bundle para el XML
  route?: string // Nombre de la ruta
  commodity?: string // VER por defecto
  subcontracting?: "Y" | "N" // Yes/No se guarda Y/N en el XML
  driverName?: string
  plate?: string
  moveDate?: string
  associate?: string
  [key: string]: any // To capture any other custom field values for XML
}

// Payload for generateInvoiceXML
export interface InvoiceForXmlPayload {
  id: string // Unique ID for the XML document
  module: "trucking" | "shipchandler" | "agency"
  invoiceNumber: string
  sapDocumentNumber?: string
  client: string // RUC/Cedula for CustomerNbr
  clientName?: string
  date: string
  sapDate?: string
  currency: string
  total: number
  records: InvoiceLineItemForXml[] // Line items for XML
  status: "generated" | "draft" | "finalized" // Contextual status for XML generation
  // Add any other top-level fields needed for the XML (e.g., driver, vehicle, custom fields)
  driverId?: string
  vehicleId?: string
  routeId?: string
  [customFieldId: string]: any // For custom fields at invoice level
}

// This slice no longer manages a state for 'invoices' directly.
// It could be removed entirely if no other specific invoice-related state is needed,
// but keeping it for now to hold the XML payload type definitions.
interface InvoiceStateForXml {
  currentInvoiceForXml: InvoiceForXmlPayload | null
  loading: boolean
  error: string | null
}

const initialStateForXml: InvoiceStateForXml = { currentInvoiceForXml: null, loading: false, error: null }

const invoiceForXmlSlice = createSlice({
  name: "invoiceForXml",
  initialState: initialStateForXml,
  reducers: {
    setCurrentInvoiceForXml: (state, action: PayloadAction<InvoiceForXmlPayload | null>) => {
      state.currentInvoiceForXml = action.payload
    },
    setXmlLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload
    },
    setXmlError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload
    },
  },
})

export const { setCurrentInvoiceForXml, setXmlLoading, setXmlError } = invoiceForXmlSlice.actions

// Add this default export
export default invoiceForXmlSlice.reducer
