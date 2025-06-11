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
  unit?: string
  blNumber?: string
  containerNumber?: string
  containerSize?: string
  containerType?: string
  containerIsoCode?: string
  fullEmptyStatus?: "FULL" | "EMPTY"
  [key: string]: any // To capture any other custom field values for XML
}

// Payload for generateInvoiceXML
export interface InvoiceForXmlPayload {
  id: string // Unique ID for the XML document
  module: "trucking" | "shipchandler" | "agency"
  invoiceNumber: string
  client: string // RUC/Cedula for CustomerNbr
  clientName?: string
  date: string
  dueDate?: string
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

// The reducer is not added to the main store, as invoice management is centralized in recordsSlice.
// export default invoiceForXmlSlice.reducer;
