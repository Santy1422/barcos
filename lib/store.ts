import { configureStore } from "@reduxjs/toolkit"
import configReducer from "./features/config/configSlice"
import recordsReducer from "./features/records/recordsSlice"
import excelReducer from "./features/excel/excelSlice"
import invoiceReducer from "./features/invoice/invoiceSlice"
import deliveryNotesReducer from "./features/delivery-notes/deliveryNotesSlice"
import inventoryReducer from "./features/inventory/inventorySlice"
import supplyOrdersReducer from "./features/supply-orders/supplyOrdersSlice"
import clientsReducer from "./features/clients/clientsSlice"

export const makeStore = () => {
  return configureStore({
    reducer: {
      config: configReducer,
      records: recordsReducer,
      excel: excelReducer,
      invoice: invoiceReducer,
      deliveryNotes: deliveryNotesReducer,
      inventory: inventoryReducer,
      supplyOrders: supplyOrdersReducer,
      clients: clientsReducer
    },
  })
}

export const store = makeStore()
export type AppStore = ReturnType<typeof makeStore>
export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
