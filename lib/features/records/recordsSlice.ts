import { createSlice, type PayloadAction } from "@reduxjs/toolkit"

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

// Interface for a full Invoice document stored in records (different from XML payload)
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
  status: "generada" | "transmitida" | "anulada" | "pagada" // Status of the invoice document
  xmlData?: string
  relatedExcelFileIds?: string[] // IDs of Excel files used (for reference)
  relatedRecordIds: string[] // NEW: IDs of individual records included in this invoice
  notes?: string
  details?: {
    driverId?: string
    driverName?: string
    vehicleId?: string
    vehicleInfo?: string
    routeId?: string
    routeName?: string
    [key: string]: any // For custom fields
  }
  createdAt: string
}

interface RecordsState {
  individualRecords: ExcelRecord[] // NEW: Stores all individual records from Excels
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
    addRecords: (state, action: PayloadAction<ExcelRecord[]>) => {
      state.individualRecords.push(...action.payload)
    },
    updateRecordStatus: (
      state,
      action: PayloadAction<{ id: string; status: ExcelRecord["status"]; invoiceId?: string }>,
    ) => {
      const record = state.individualRecords.find((r) => r.id === action.payload.id)
      if (record) {
        record.status = action.payload.status
        if (action.payload.invoiceId) record.invoiceId = action.payload.invoiceId
      }
    },
    addInvoice: (state, action: PayloadAction<InvoiceRecord>) => {
      state.invoices.push(action.payload)
    },
    updateInvoiceStatus: (state, action: PayloadAction<{ id: string; status: InvoiceRecord["status"] }>) => {
      const invoice = state.invoices.find((inv) => inv.id === action.payload.id)
      if (invoice) {
        invoice.status = action.payload.status
      }
    },
    markRecordsAsInvoiced: (state, action: PayloadAction<{ recordIds: string[]; invoiceId: string }>) => {
      action.payload.recordIds.forEach((recordId) => {
        const record = state.individualRecords.find((r) => r.id === recordId)
        if (record) {
          record.status = "facturado"
          record.invoiceId = action.payload.invoiceId
        }
      })
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload
    },
  },
})

export const {
  addRecords,
  updateRecordStatus,
  addInvoice,
  updateInvoiceStatus,
  markRecordsAsInvoiced,
  setLoading,
  setError,
} = recordsSlice.actions

export const selectIndividualRecords = (state: { records: RecordsState }) => state.records.individualRecords
export const selectInvoices = (state: { records: RecordsState }) => state.records.invoices
export const selectInvoicesByModule = (state: { records: RecordsState }, moduleName: InvoiceRecord["module"]) =>
  state.records.invoices.filter((invoice) => invoice.module === moduleName)
export const selectPendingRecordsByModule = (state: { records: RecordsState }, moduleName: ExcelRecord["module"]) =>
  state.records.individualRecords.filter((record) => record.module === moduleName && record.status === "pendiente")

export default recordsSlice.reducer
