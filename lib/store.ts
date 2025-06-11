import { configureStore, combineReducers } from "@reduxjs/toolkit"
import excelReducer from "./features/excel/excelSlice"
import recordsReducer from "./features/records/recordsSlice"
import supplyOrdersReducer from "./features/supply-orders/supplyOrdersSlice"
import inventoryReducer from "./features/inventory/inventorySlice"
import deliveryNotesReducer from "./features/delivery-notes/deliveryNotesSlice"
import configReducer from "./features/config/configSlice"
import { loadState, saveState } from "./storage"

const rootReducer = combineReducers({
  excel: excelReducer,
  records: recordsReducer,
  supplyOrders: supplyOrdersReducer,
  inventory: inventoryReducer,
  deliveryNotes: deliveryNotesReducer,
  config: configReducer,
})

// We load the persisted state from localStorage.
const preloadedState = loadState()

export const makeStore = () => {
  const store = configureStore({
    reducer: rootReducer,
    // The preloadedState is passed to the store on creation.
    preloadedState,
  })

  // We subscribe to the store updates.
  // This function will be called every time the state changes.
  store.subscribe(() => {
    const state = store.getState()
    // We create an object with only the parts of the state we want to persist.
    const stateToPersist = {
      records: state.records,
      excel: state.excel,
    }
    // And we save it to localStorage.
    saveState(stateToPersist)
  })

  return store
}

export type AppStore = ReturnType<typeof makeStore>
export type RootState = ReturnType<AppStore["getState"]>
export type AppDispatch = AppStore["dispatch"]
