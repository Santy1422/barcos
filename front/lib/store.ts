import { configureStore } from '@reduxjs/toolkit'
import recordsReducer from './features/records/recordsSlice'
import invoiceReducer from './features/invoice/invoiceSlice'
import authReducer from './features/auth/authSlice'
import configReducer from './features/config/configSlice'
import excelReducer from './features/excel/excelSlice'
import clientsReducer from './features/clients/clientsSlice'

export const makeStore = () => {
  return configureStore({
    reducer: {
      records: recordsReducer,
      invoice: invoiceReducer,
      auth: authReducer,
      config: configReducer,
      excel: excelReducer,
      clients: clientsReducer,
    },
  })
}

export const store = makeStore()
export type AppStore = ReturnType<typeof makeStore>
export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
