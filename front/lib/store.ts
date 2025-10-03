import { configureStore } from '@reduxjs/toolkit'
import recordsReducer from './features/records/recordsSlice'
import invoiceReducer from './features/invoice/invoiceSlice'
import authReducer from './features/auth/authSlice'
import configReducer from './features/config/configSlice'
import excelReducer from './features/excel/excelSlice'
import clientsReducer from './features/clients/clientsSlice'
import truckingRoutesReducer from './features/truckingRoutes/truckingRoutesSlice'
import ptyssRoutesReducer from './features/ptyssRoutes/ptyssRoutesSlice'
import ptyssLocalRoutesReducer from './features/ptyssLocalRoutes/ptyssLocalRoutesSlice'
import localServicesReducer from './features/localServices/localServicesSlice'
import navieraReducer from './features/naviera/navieraSlice'
import servicesReducer from './features/services/servicesSlice'
import agencyServicesReducer from './features/agencyServices/agencyServicesSlice'
import agencyCatalogsReducer from './features/agencyServices/agencyCatalogsSlice'
import agencyPricingConfigReducer from './features/agencyServices/agencyPricingConfigSlice'
import agencyRoutesReducer from './features/agencyServices/agencyRoutesSlice'
import containerTypesReducer from './features/containerTypes/containerTypesSlice'
import { loadState, saveState } from './storage'

export const makeStore = () => {
  // Cargar estado persistido
  const persistedState = loadState()
  
  const store = configureStore({
    reducer: {
      records: recordsReducer,
      invoice: invoiceReducer,
      auth: authReducer,
      config: configReducer,
      excel: excelReducer,
      clients: clientsReducer,
      truckingRoutes: truckingRoutesReducer,
      ptyssRoutes: ptyssRoutesReducer,
      ptyssLocalRoutes: ptyssLocalRoutesReducer,
      localServices: localServicesReducer,
      naviera: navieraReducer,
      services: servicesReducer,
      agencyServices: agencyServicesReducer,
      agencyCatalogs: agencyCatalogsReducer,
      agencyPricingConfig: agencyPricingConfigReducer,
      agencyRoutes: agencyRoutesReducer,
      containerTypes: containerTypesReducer,
    },
    preloadedState: persistedState
  })
  
  // Guardar estado en localStorage cuando cambie
  store.subscribe(() => {
    const state = store.getState()
    saveState({
      auth: state.auth // Solo persistir el estado de auth
    })
  })
  
  return store
}

export const store = makeStore()
export type AppStore = ReturnType<typeof makeStore>
export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
