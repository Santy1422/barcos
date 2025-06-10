import { createSlice, type PayloadAction } from "@reduxjs/toolkit"

export interface SupplyOrderItem {
  id: string
  productCode: string
  productName: string
  quantity: number
  unit: string
  unitPrice: number
  totalPrice: number
}

export interface SupplyOrder {
  id: string
  module: "shipchandler" // Aseguramos que sea específico del módulo
  vesselName: string
  vesselIMO: string
  eta: string
  etd: string
  agent: string
  items: SupplyOrderItem[]
  itemsCount: number // Para la tabla de registros
  totalValue: number
  status: "Pendiente" | "En Proceso" | "Completado" | "Facturado"
  createdAt: string
  invoiceId?: string
}

interface SupplyOrdersState {
  supplyOrders: SupplyOrder[]
  loading: boolean
  error: string | null
}

const initialState: SupplyOrdersState = {
  supplyOrders: [],
  loading: false,
  error: null,
}

const supplyOrdersSlice = createSlice({
  name: "supplyOrders",
  initialState,
  reducers: {
    addSupplyOrder: (state, action: PayloadAction<SupplyOrder>) => {
      state.supplyOrders.push(action.payload)
    },
    updateSupplyOrderStatus: (
      state,
      action: PayloadAction<{ id: string; status: SupplyOrder["status"]; invoiceId?: string }>,
    ) => {
      const order = state.supplyOrders.find((o) => o.id === action.payload.id)
      if (order) {
        order.status = action.payload.status
        if (action.payload.invoiceId) {
          order.invoiceId = action.payload.invoiceId
        }
      }
    },
    setSupplyOrdersLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload
    },
    setSupplyOrdersError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload
    },
  },
})

export const { addSupplyOrder, updateSupplyOrderStatus, setSupplyOrdersLoading, setSupplyOrdersError } =
  supplyOrdersSlice.actions

export default supplyOrdersSlice.reducer
