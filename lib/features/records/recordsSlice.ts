import { createSlice, type PayloadAction } from "@reduxjs/toolkit"

export interface ServiceRecord {
  id: string
  module: "trucking" | "shipchandler" | "agency"
  type: string
  date: string
  client: string
  status: "pendiente" | "en_proceso" | "completado" | "facturado"
  totalValue: number
  data: Record<string, any>
  invoiceId?: string
  excelId?: string
}

interface RecordsState {
  records: ServiceRecord[]
  loading: boolean
  error: string | null
}

const initialState: RecordsState = {
  records: [],
  loading: false,
  error: null,
}

const recordsSlice = createSlice({
  name: "records",
  initialState,
  reducers: {
    addRecord: (state, action: PayloadAction<ServiceRecord>) => {
      state.records.push(action.payload)
    },
    addRecords: (state, action: PayloadAction<ServiceRecord[]>) => {
      state.records.push(...action.payload)
    },
    updateRecord: (state, action: PayloadAction<Partial<ServiceRecord> & { id: string }>) => {
      const index = state.records.findIndex((record) => record.id === action.payload.id)
      if (index !== -1) {
        state.records[index] = { ...state.records[index], ...action.payload }
      }
    },
    markRecordsAsInvoiced: (state, action: PayloadAction<{ recordIds: string[]; invoiceId: string }>) => {
      action.payload.recordIds.forEach((id) => {
        const record = state.records.find((r) => r.id === id)
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

export const { addRecord, addRecords, updateRecord, markRecordsAsInvoiced, setLoading, setError } = recordsSlice.actions

export default recordsSlice.reducer
