import { createSlice, type PayloadAction } from "@reduxjs/toolkit"

export interface ExcelRecord {
  id: number
  [key: string]: any
}

export interface ExcelFile {
  id: string
  filename: string
  uploadDate: string
  status: "pendiente" | "procesado" | "error"
  type: string
  module: "trucking" | "shipchandler" | "agency"
  records: ExcelRecord[]
  totalValue?: number
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

export default excelSlice.reducer
