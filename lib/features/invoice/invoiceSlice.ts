import { createSlice, type PayloadAction } from "@reduxjs/toolkit"
import type { ExcelRecord } from "../excel/excelSlice" // Import ExcelRecord

// Extend InvoiceRecord from ExcelRecord or define common fields
export interface InvoiceServiceRecord extends ExcelRecord {
  // Renamed to avoid conflict
  // Fields specific to how a record appears on an invoice, if different from ExcelRecord
  // For trucking, ExcelRecord might be sufficient if it contains all necessary fields like 'totalRate'
  // Ensure 'id' from ExcelRecord is preserved or mapped.
  // Example:
  // serviceDescription?: string;
  // unitPrice?: number;
  // quantity?: number;
  // lineTotal?: number;
}

export interface Invoice {
  id: string
  invoiceNumber: string
  module: "trucking" | "shipchandler" | "agency"
  client: string
  date: string
  currency: string
  records: InvoiceServiceRecord[] // Use the more specific type
  subtotal: number
  tax: number
  total: number
  status: "borrador" | "creada" | "enviada" | "pagada" | "anulada"
  createdAt: string
  excelIds: string[] // IDs of Excel files used to create this invoice
  xmlData?: string
  // Campos específicos por módulo (Trucking)
  driver?: string
  vehicle?: string
  // Nuevos campos generales de factura
  paymentTerms?: string
  notes?: string
  // Campos para Shipchandler / Agency (ejemplos)
  vesselName?: string
  vesselIMO?: string
  voyageNumber?: string
  portOfCall?: string
  eta?: string // Estimated Time of Arrival
  etd?: string // Estimated Time of Departure
}

interface InvoiceState {
  invoices: Invoice[]
  loading: boolean
  error: string | null
}

const initialState: InvoiceState = {
  invoices: [],
  loading: false,
  error: null,
}

const invoiceSlice = createSlice({
  name: "invoice",
  initialState,
  reducers: {
    createInvoice: (state, action: PayloadAction<Invoice>) => {
      // Prevent adding duplicates if this action is somehow dispatched multiple times with the same temp ID
      const existingIndex = state.invoices.findIndex((inv) => inv.id === action.payload.id)
      if (existingIndex === -1) {
        state.invoices.push(action.payload)
      } else {
        // If it's an update to an existing draft (e.g. changing ID from temp to final)
        state.invoices[existingIndex] = action.payload
      }
    },
    updateInvoice: (state, action: PayloadAction<Partial<Invoice> & { id: string }>) => {
      const index = state.invoices.findIndex((inv) => inv.id === action.payload.id)
      if (index !== -1) {
        state.invoices[index] = { ...state.invoices[index], ...action.payload }
      }
    },
    // finalizeInvoice was ambiguous. Renaming to reflect its action on the store.
    // The actual finalization logic (dispatching to other slices) is in the component.
    // This action primarily updates the status and XML of an existing invoice.
    finalizeInvoiceInStore: (state, action: PayloadAction<{ id: string; updates: Partial<Invoice> }>) => {
      const invoice = state.invoices.find((inv) => inv.id === action.payload.id)
      if (invoice) {
        Object.assign(invoice, action.payload.updates) // Apply all updates
        if (!invoice.status || invoice.status === "borrador") {
          // Set to 'creada' if it was a draft
          invoice.status = "creada"
        }
      }
    },
    // Kept original name for compatibility if used elsewhere, but it's essentially updateInvoice
    finalizeInvoice: (state, action: PayloadAction<{ id: string; xmlData?: string }>) => {
      const invoice = state.invoices.find((inv) => inv.id === action.payload.id)
      if (invoice) {
        invoice.status = "creada"
        if (action.payload.xmlData) {
          invoice.xmlData = action.payload.xmlData
        }
      }
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload
    },
  },
})

export const { createInvoice, updateInvoice, finalizeInvoiceInStore, finalizeInvoice, setLoading, setError } =
  invoiceSlice.actions

export default invoiceSlice.reducer
