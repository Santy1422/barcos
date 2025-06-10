import { configureStore } from "@reduxjs/toolkit"
import excelReducer from "./features/excel/excelSlice"
import invoiceReducer from "./features/invoice/invoiceSlice"
import recordsReducer from "./features/records/recordsSlice"
import supplyOrdersReducer from "./features/supply-orders/supplyOrdersSlice"
import inventoryReducer from "./features/inventory/inventorySlice"
import deliveryNotesReducer from "./features/delivery-notes/deliveryNotesSlice"

export const store = configureStore({
  reducer: {
    excel: excelReducer,
    invoice: invoiceReducer,
    records: recordsReducer,
    supplyOrders: supplyOrdersReducer,
    inventory: inventoryReducer,
    deliveryNotes: deliveryNotesReducer,
    // Aquí puedes añadir más reducers a medida que los necesites
  },
  // Middleware y devTools se configuran automáticamente por Redux Toolkit,
  // pero puedes personalizarlos aquí si es necesario.
})

// Inferir los tipos `RootState` y `AppDispatch` del propio store
export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
