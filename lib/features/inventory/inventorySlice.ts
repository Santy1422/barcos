import { createSlice, type PayloadAction } from "@reduxjs/toolkit"

export interface InventoryItem {
  id: string
  module: "shipchandler"
  productCode: string
  productName: string
  category: string
  currentStock: number
  unit: string
  minStock: number
  maxStock: number
  unitCost: number
  totalValue: number // currentStock * unitCost
  supplier: string
  lastUpdate: string
  location: string
  status: "Normal" | "Bajo Stock" | "Sobre Stock" // Para la tabla de registros
}

interface InventoryState {
  inventory: InventoryItem[]
  loading: boolean
  error: string | null
}

const initialState: InventoryState = {
  inventory: [],
  loading: false,
  error: null,
}

const inventorySlice = createSlice({
  name: "inventory",
  initialState,
  reducers: {
    addInventoryItem: (state, action: PayloadAction<InventoryItem>) => {
      state.inventory.push(action.payload)
    },
    updateInventoryItemStock: (state, action: PayloadAction<{ id: string; newStock: number }>) => {
      const item = state.inventory.find((i) => i.id === action.payload.id)
      if (item) {
        item.currentStock = action.payload.newStock
        item.totalValue = item.currentStock * item.unitCost // Recalcular valor
        // Actualizar estado (Normal, Bajo Stock, etc.)
        if (item.currentStock < item.minStock) item.status = "Bajo Stock"
        else if (item.currentStock > item.maxStock) item.status = "Sobre Stock"
        else item.status = "Normal"
      }
    },
    setInventoryLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload
    },
    setInventoryError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload
    },
  },
})

export const { addInventoryItem, updateInventoryItemStock, setInventoryLoading, setInventoryError } =
  inventorySlice.actions

export default inventorySlice.reducer
