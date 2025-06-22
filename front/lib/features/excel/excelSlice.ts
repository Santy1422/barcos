import { createSlice, type PayloadAction } from "@reduxjs/toolkit"

// ExcelRecord is now a generic type for individual rows, moved to recordsSlice
export interface ExcelFile {
  id: string
  filename: string
  uploadDate: string
  status: "pendiente" | "procesado" | "error"
  type: string // User-defined type/template name for this Excel structure
  module: "trucking" | "shipchandler" | "agency"
  recordIds: string[] // NEW: Stores IDs of individual records belonging to this file
  totalValue?: number
  metadata?: {
    clientName?: string
    ruc?: string
    clientAddress?: string
    [key: string]: any
  }
}

interface ExcelState {
  files: ExcelFile[]
  loading: boolean
  error: string | null
}

const initialState: ExcelState = {
  files: [],
  loading: false,
  error: null,
}

const excelSlice = createSlice({
  name: "excel",
  initialState,
  reducers: {
    addExcelFile: (state, action: PayloadAction<ExcelFile>) => {
      state.files.push(action.payload)
    },
    updateExcelStatus: (state, action: PayloadAction<{ id: string; status: ExcelFile["status"] }>) => {
      const file = state.files.find((f) => f.id === action.payload.id)
      if (file) {
        file.status = action.payload.status
      }
    },
    // This action is now less relevant as individual records will be marked as processed
    // Keeping it for potential future use if an entire Excel needs to be marked.
    markExcelAsProcessed: (state, action: PayloadAction<string[]>) => {
      action.payload.forEach((id) => {
        const file = state.files.find((f) => f.id === id)
        if (file) {
          file.status = "procesado"
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

export const { addExcelFile, updateExcelStatus, markExcelAsProcessed, setLoading, setError } = excelSlice.actions

export const selectExcelFiles = (state: { excel: ExcelState }) => state.excel.files
export const selectExcelFilesByModule = (state: { excel: ExcelState }, moduleName: ExcelFile["module"]) =>
  state.excel.files.filter((file) => file.module === moduleName)

export default excelSlice.reducer
