import { createSlice, type PayloadAction } from "@reduxjs/toolkit"

export interface DeliveryNoteItem {
  productCode: string
  productName: string
  quantityDelivered: number
  unit: string
}
export interface DeliveryNote {
  id: string
  module: "shipchandler"
  deliveryNoteNumber: string
  vesselName: string
  vesselIMO: string
  deliveryDate: string
  items: DeliveryNoteItem[]
  products: string // Para la tabla de registros (concatenación de nombres de productos)
  totalValue: number // Suma de valor de items entregados
  supplier: string
  deliveredBy: string // Para la tabla de registros
  receivedBy: string
  status: "Pendiente" | "Entregado" | "Parcial"
  relatedSupplyOrderId?: string // Opcional, para vincular a una orden
}

interface DeliveryNotesState {
  deliveryNotes: DeliveryNote[]
  loading: boolean
  error: string | null
}

const initialState: DeliveryNotesState = {
  deliveryNotes: [],
  loading: false,
  error: null,
}

const deliveryNotesSlice = createSlice({
  name: "deliveryNotes",
  initialState,
  reducers: {
    addDeliveryNote: (state, action: PayloadAction<DeliveryNote>) => {
      state.deliveryNotes.push(action.payload)
    },
    updateDeliveryNoteStatus: (state, action: PayloadAction<{ id: string; status: DeliveryNote["status"] }>) => {
      const note = state.deliveryNotes.find((n) => n.id === action.payload.id)
      if (note) {
        note.status = action.payload.status
      }
    },
    setDeliveryNotesLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload
    },
    setDeliveryNotesError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload
    },
  },
})

export const { addDeliveryNote, updateDeliveryNoteStatus, setDeliveryNotesLoading, setDeliveryNotesError } =
  deliveryNotesSlice.actions

export default deliveryNotesSlice.reducer
