import { createSlice, createAsyncThunk, type PayloadAction } from "@reduxjs/toolkit"
import type { RootState } from "@/lib/store"
import { createSelector } from '@reduxjs/toolkit'

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

// Acciones async para interactuar con el backend
export const fetchRecordsByModule = createAsyncThunk(
  'records/fetchByModule',
  async (module: string, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/records/module/${module}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (!response.ok) {
        throw new Error('Error al obtener registros')
      }
      
      const data = await response.json()
      return data.records || []
    } catch (error) {
      return rejectWithValue(error.message)
    }
  }
)

export const fetchPendingRecords = createAsyncThunk(
  'records/fetchPending',
  async (_, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('http://localhost:8080/api/records/status/pendiente', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (!response.ok) {
        throw new Error('Error al obtener registros pendientes')
      }
      
      const data = await response.json()
      
      // Transformar los datos del backend al formato esperado por el frontend
      const transformedRecords = (data.data || []).map((record: any) => ({
        id: record._id,
        excelId: record.excelId || '',
        module: record.module,
        type: record.type,
        status: record.status,
        totalValue: record.totalValue || 0,
        data: record.data,
        createdAt: record.createdAt,
        invoiceId: record.invoiceId
      }))
      
      return transformedRecords
    } catch (error) {
      return rejectWithValue(error.message)
    }
  }
)

export const createTruckingRecords = createAsyncThunk(
  'records/createTrucking',
  async ({ excelId, recordsData, createdBy }: {
    excelId: string
    recordsData: any[]
    createdBy: string
  }, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/records/trucking/bulk', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          excelId,
          recordsData,
          createdBy
        })
      })
      
      if (!response.ok) {
        throw new Error('Error al crear registros')
      }
      
      const data = await response.json()
      return data.records || []
    } catch (error) {
      return rejectWithValue(error.message)
    }
  }
)

export const updateRecordStatus = createAsyncThunk(
  'records/updateStatus',
  async ({ recordId, status, invoiceId }: {
    recordId: string
    status: string
    invoiceId?: string
  }, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/records/${recordId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status,
          ...(invoiceId && { invoiceId })
        })
      })
      
      if (!response.ok) {
        throw new Error('Error al actualizar registro')
      }
      
      const data = await response.json()
      return data.record
    } catch (error) {
      return rejectWithValue(error.message)
    }
  }
)

export const updateRecordAsync = createAsyncThunk(
  'records/updateRecord',
  async ({ id, updates }: { id: string; updates: Partial<ExcelRecord> }, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/records/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      })
      
      if (!response.ok) {
        throw new Error('Error al actualizar registro')
      }
      
      const data = await response.json()
      return { id, updates: data.data }
    } catch (error) {
      return rejectWithValue(error.message)
    }
  }
)

interface RecordsState {
  individualRecords: ExcelRecord[]
  invoices: InvoiceRecord[]
  loading: boolean
  error: string | null
  fetchingRecords: boolean
  creatingRecords: boolean
}

const initialState: RecordsState = {
  individualRecords: [],
  invoices: [],
  loading: false,
  error: null,
  fetchingRecords: false,
  creatingRecords: false,
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
    // Add this new reducer
    updateRecord: (state, action: PayloadAction<{ id: string; updates: Partial<ExcelRecord> }>) => {
      const record = state.individualRecords.find((r) => r.id === action.payload.id)
      if (record) {
        Object.assign(record, action.payload.updates)
      }
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
    clearRecords: (state) => {
      state.individualRecords = []
    },
    setRecords: (state, action: PayloadAction<ExcelRecord[]>) => {
      state.individualRecords = action.payload
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch records by module
      .addCase(fetchRecordsByModule.pending, (state) => {
        state.fetchingRecords = true
        state.error = null
      })
      .addCase(fetchRecordsByModule.fulfilled, (state, action) => {
        state.fetchingRecords = false
        state.individualRecords = action.payload
      })
      .addCase(fetchRecordsByModule.rejected, (state, action) => {
        state.fetchingRecords = false
        state.error = action.payload as string
      })
      
      // Fetch pending records
      .addCase(fetchPendingRecords.pending, (state) => {
        state.fetchingRecords = true
        state.error = null
      })
      .addCase(fetchPendingRecords.fulfilled, (state, action) => {
        state.fetchingRecords = false
        // Solo actualizar registros pendientes
        const pendingRecords = action.payload
        state.individualRecords = [
          ...state.individualRecords.filter(r => r.status !== 'pendiente'),
          ...pendingRecords
        ]
      })
      .addCase(fetchPendingRecords.rejected, (state, action) => {
        state.fetchingRecords = false
        state.error = action.payload as string
      })
      
      // Create trucking records
      .addCase(createTruckingRecords.pending, (state) => {
        state.creatingRecords = true
        state.error = null
      })
      .addCase(createTruckingRecords.fulfilled, (state, action) => {
        state.creatingRecords = false
        state.individualRecords.push(...action.payload)
      })
      .addCase(createTruckingRecords.rejected, (state, action) => {
        state.creatingRecords = false
        state.error = action.payload as string
      })
      
      // Update record status
      .addCase(updateRecordStatus.fulfilled, (state, action) => {
        const record = state.individualRecords.find(r => r.id === action.payload.id)
        if (record) {
          Object.assign(record, action.payload)
        }
      })
      // En extraReducers, agregar:
      .addCase(updateRecordAsync.fulfilled, (state, action) => {
        const record = state.individualRecords.find(r => r.id === action.payload.id)
        if (record) {
          Object.assign(record, action.payload.updates)
        }
      })
      .addCase(updateRecordAsync.rejected, (state, action) => {
        state.error = action.payload as string
      })
  },
})

export const { 
  addRecords, 
  updateRecord, 
  markRecordsAsInvoiced, 
  addInvoice, 
  updateInvoiceStatus, 
  setLoading, 
  setError,
  clearRecords,
  setRecords
} = recordsSlice.actions

// Selectores actualizados
export const selectAllIndividualRecords = (state: RootState) => state.records.individualRecords
export const selectAllInvoices = (state: RootState) => state.records.invoices
export const selectRecordsLoading = (state: RootState) => state.records.fetchingRecords
export const selectRecordsError = (state: RootState) => state.records.error
export const selectCreatingRecords = (state: RootState) => state.records.creatingRecords

export const selectPendingRecordsByModule = createSelector(
  [(state: RootState) => state.records.individualRecords, (state: RootState, moduleName: ExcelRecord["module"]) => moduleName],
  (individualRecords, moduleName) => 
    individualRecords.filter((record) => record.module === moduleName && record.status === "pendiente")
)

export const selectInvoicesByModule = createSelector(
  [(state: RootState) => state.records.invoices, (state: RootState, moduleName: InvoiceRecord["module"]) => moduleName],
  (invoices, moduleName) => 
    invoices.filter((invoice) => invoice.module === moduleName)
)

export default recordsSlice.reducer
export interface PersistedInvoiceRecord {
  id: string
  module: string
  invoiceNumber: string
  clientName: string
  clientRuc: string
  issueDate: string
  dueDate: string
  currency: string
  subtotal: number
  taxAmount: number
  totalAmount: number
  status: "generada" | "enviada" | "pagada" | "cancelada"
  xmlData: string
  pdfData?: Blob // Agregar campo para PDF
  relatedRecordIds: string[]
  notes?: string
  details?: Record<string, any>
  createdAt: string
  updatedAt?: string
}
