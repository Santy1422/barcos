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

// Nueva interfaz para los datos del Excel de shipchandler
export interface ShipchandlerExcelRecord {
  id: number
  fecha: string
  clientes: string
  desde: string
  subClientes: string
  hacia: string
  bl: string
  buque: string
  tamano: string
  numeroContenedor: string
  ptgOrder: string
  status: string
  voyage: string
  tarifa: number
  gastosPuerto: string
  otrosGastos: number
  jira: string
  fechaFacturacion: string
  driver: string
  plate: string
  bono: number
  rtContainer: string
}

// Mantener la interfaz existente para compatibilidad
export interface SupplyOrder {
  id: string
  module: "shipchandler"
  vesselName: string
  vesselIMO: string
  eta: string
  etd: string
  agent: string
  items: SupplyOrderItem[]
  itemsCount: number
  totalValue: number
  status: "Pendiente" | "En Proceso" | "Completado" | "Facturado"
  createdAt: string
  invoiceId?: string
  // Agregar referencia a los datos del Excel
  excelData?: ShipchandlerExcelRecord[]
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
    // Agregar nuevo reducer para manejar datos del Excel
    addShipchandlerExcelData: (
      state,
      action: PayloadAction<{ supplyOrderId: string; excelData: ShipchandlerExcelRecord[] }>
    ) => {
      const order = state.supplyOrders.find(order => order.id === action.payload.supplyOrderId)
      if (order) {
        order.excelData = action.payload.excelData
      }
    },
  },
})

export const { addSupplyOrder, updateSupplyOrderStatus, setSupplyOrdersLoading, setSupplyOrdersError } =
  supplyOrdersSlice.actions

export default supplyOrdersSlice.reducer
