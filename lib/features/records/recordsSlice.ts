import { createSlice, type PayloadAction } from "@reduxjs/toolkit"
import type { RootState } from "@/lib/store" // Import RootState for selectors

// Generic interface for a single record extracted from an Excel row
export interface ExcelRecord {
  id: string // Unique ID for this specific record (e.g., TRK-REC-EXCELID-ROWID)
  excelId: string // ID of the Excel file this record came from
  module: "trucking" | "shipchandler" | "agency"
  type: string // Type of data (e.g., "transport-services", "supply-order")
  status: "pendiente" | "facturado" | "anulado" // Status of this individual record
  totalValue: number // The calculated total value for this specific record/line item
  data: any // The raw data object for this record (e.g., TruckingRecordData)
  createdAt: string
  invoiceId?: string // ID of the invoice if it has been facturado
}

// Interface for a full Invoice document stored in records
export interface InvoiceRecord {
  id: string // Unique ID for the invoice document
  module: "trucking" | "shipchandler" | "agency"
  invoiceNumber: string
  clientName: string
  clientRuc: string
  issueDate: string
  dueDate: string
  currency: string
  subtotal: number
  taxAmount: number
  totalAmount: number
  status: "generada" | "transmitida" | "anulada" | "pagada"
  xmlData?: string
  relatedRecordIds: string[] // IDs of individual ExcelRecord items included in this invoice
  notes?: string
  details?: {
    [key: string]: any
  }
  createdAt: string
}

interface RecordsState {
  individualRecords: ExcelRecord[] // Stores all individual records from ALL Excels
  invoices: InvoiceRecord[] // Stores generated invoice documents
  loading: boolean
  error: string | null
}

const initialState: RecordsState = {
  individualRecords: [],
  invoices: [],
  loading: false,
  error: null,
}

const recordsSlice = createSlice({
  name: "records",
  initialState,
  reducers: {
    // This reducer is key: it adds an array of new individual records to the state.
    addRecords: (state, action: PayloadAction<ExcelRecord[]>) => {
      // We use push to add the new records without overwriting existing ones.
      state.individualRecords.push(...action.payload)
    },
    // This reducer marks the selected individual records as "facturado"
    markRecordsAsInvoiced: (state, action: PayloadAction<{ recordIds: string[]; invoiceId: string }>) => {
      action.payload.recordIds.forEach((recordId) => {
        const record = state.individualRecords.find((r) => r.id === recordId)
        if (record) {
          record.status = "facturado"
          record.invoiceId = action.payload.invoiceId
        }
      })
    },
    // This reducer adds a completed invoice document to the state.
    addInvoice: (state, action: PayloadAction<InvoiceRecord>) => {
      state.invoices.push(action.payload)
    },
    updateInvoiceStatus: (state, action: PayloadAction<{ id: string; status: InvoiceRecord["status"] }>) => {
      const invoice = state.invoices.find((inv) => inv.id === action.payload.id)
      if (invoice) {
        invoice.status = action.payload.status
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

export const { addRecords, markRecordsAsInvoiced, addInvoice, updateInvoiceStatus, setLoading, setError } =
  recordsSlice.actions

// SELECTORS - These are how components read data from this slice.
export const selectAllIndividualRecords = (state: RootState) => state.records.individualRecords
export const selectAllInvoices = (state: RootState) => state.records.invoices

// This is the most important selector for the invoice page.
// It finds all individual records for a specific module that are still "pendiente".
export const selectPendingRecordsByModule = (state: RootState, moduleName: ExcelRecord["module"]) =>
  state.records.individualRecords.filter((record) => record.module === moduleName && record.status === "pendiente")

export const selectInvoicesByModule = (state: RootState, moduleName: InvoiceRecord["module"]) =>
  state.records.invoices.filter((invoice) => invoice.module === moduleName)

export default recordsSlice.reducer
