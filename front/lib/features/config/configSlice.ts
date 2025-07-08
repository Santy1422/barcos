import { createSlice, type PayloadAction, createAsyncThunk } from "@reduxjs/toolkit"
import { createSelector } from '@reduxjs/toolkit'

// Interfaces for configuration items
export interface Driver {
  id: string
  name: string
  license: string
  contact: string
}

export interface Vehicle {
  id: string
  plate: string
  model: string
  capacity: string
}

export interface Route {
  id: string
  name: string
  origin: string
  destination: string
  containerType: "normal" | "refrigerated"
  routeType: "single" | "RT"
  price: number
}

export type CustomFieldType = "text" | "number" | "date" | "select"

export interface CustomFieldConfig {
  id: string
  label: string
  type: CustomFieldType
  options?: string[] // For 'select' type
  module: "trucking" // Which module this field belongs to
}

// Tipos para códigos SAP
export interface ServiceSapCode {
  _id: string
  code: string
  description: string
  module: 'trucking' | 'all'
  active: boolean
  createdAt: string
  updatedAt: string
}

// Thunk para cargar códigos SAP
export const fetchServiceSapCodes = createAsyncThunk(
  'config/fetchServiceSapCodes',
  async (module?: string) => {
    const token = localStorage.getItem('token')
    if (!token) {
      throw new Error('No se encontró token de autenticación')
    }
    
    const params = module ? `?module=${module}` : ''
    const response = await fetch(`/api/config/service-sap-codes${params}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.payload?.message || `Error ${response.status}: ${response.statusText}`)
    }
    
    const data = await response.json()
    return data.data as ServiceSapCode[]
  }
)

// Thunk para crear código SAP
export const createServiceSapCode = createAsyncThunk(
  'config/createServiceSapCode',
  async (codeData: Omit<ServiceSapCode, '_id' | 'createdAt' | 'updatedAt'>) => {
    const token = localStorage.getItem('token')
    if (!token) {
      throw new Error('No se encontró token de autenticación')
    }
    
    const response = await fetch('/api/config/service-sap-codes', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(codeData)
    })
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.payload?.message || `Error ${response.status}: ${response.statusText}`)
    }
    
    const data = await response.json()
    return data.data as ServiceSapCode
  }
)

// Thunk para actualizar código SAP
export const updateServiceSapCode = createAsyncThunk(
  'config/updateServiceSapCode',
  async ({ id, codeData }: { id: string, codeData: Partial<ServiceSapCode> }) => {
    const token = localStorage.getItem('token')
    if (!token) {
      throw new Error('No se encontró token de autenticación')
    }
    
    const response = await fetch(`/api/config/service-sap-codes/${id}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(codeData)
    })
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.payload?.message || `Error ${response.status}: ${response.statusText}`)
    }
    
    const data = await response.json()
    return data.data as ServiceSapCode
  }
)

// Thunk para eliminar código SAP
export const deleteServiceSapCode = createAsyncThunk(
  'config/deleteServiceSapCode',
  async (id: string) => {
    const token = localStorage.getItem('token')
    if (!token) {
      throw new Error('No se encontró token de autenticación')
    }
    
    const response = await fetch(`/api/config/service-sap-codes/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.payload?.message || `Error ${response.status}: ${response.statusText}`)
    }
    
    return id
  }
)

// State structure for the config slice
interface ConfigState {
  drivers: Driver[]
  vehicles: Vehicle[]
  routes: Route[]
  customFields: CustomFieldConfig[]
  serviceSapCodes: ServiceSapCode[]
  serviceSapCodesLoading: boolean
  serviceSapCodesError: string | null
}

const initialState: ConfigState = {
  drivers: [
    { id: "driver-1", name: "Juan Pérez", license: "P-123456", contact: "6001-0001" },
    { id: "driver-2", name: "María González", license: "P-654321", contact: "6002-0002" },
  ],
  vehicles: [
    { id: "vehicle-1", plate: "500001", model: "Freightliner Cascadia", capacity: "20 Ton" },
    { id: "vehicle-2", plate: "500002", model: "Kenworth T680", capacity: "25 Ton" },
  ],
  routes: [
    {
      id: "route-1",
      name: "Puerto Balboa - Ciudad",
      origin: "Puerto Balboa",
      destination: "Ciudad de Panamá",
      containerType: "normal",
      routeType: "single",
      price: 1000,
    },
    { id: "route-2", name: "Manzanillo - Colón", origin: "Manzanillo", destination: "Colón", containerType: "normal", routeType: "single", price: 750 },
  ],
  customFields: [
    { id: "trucking-cf-1", label: "Tipo de Carga", type: "text", module: "trucking" },
    { id: "trucking-cf-2", label: "Número de Sello", type: "text", module: "trucking" },
    { id: "trucking-cf-3", label: "Peso (kg)", type: "number", module: "trucking" },
  ],
  serviceSapCodes: [],
  serviceSapCodesLoading: false,
  serviceSapCodesError: null
}

const configSlice = createSlice({
  name: "config",
  initialState,
  reducers: {
    addDriver: (state, action: PayloadAction<Driver>) => {
      state.drivers.push(action.payload)
    },
    updateDriver: (state, action: PayloadAction<Driver>) => {
      const index = state.drivers.findIndex((d) => d.id === action.payload.id)
      if (index !== -1) {
        state.drivers[index] = action.payload
      }
    },
    deleteDriver: (state, action: PayloadAction<string>) => {
      state.drivers = state.drivers.filter((d) => d.id !== action.payload)
    },
    addVehicle: (state, action: PayloadAction<Vehicle>) => {
      state.vehicles.push(action.payload)
    },
    updateVehicle: (state, action: PayloadAction<Vehicle>) => {
      const index = state.vehicles.findIndex((v) => v.id === action.payload.id)
      if (index !== -1) {
        state.vehicles[index] = action.payload
      }
    },
    deleteVehicle: (state, action: PayloadAction<string>) => {
      state.vehicles = state.vehicles.filter((v) => v.id !== action.payload)
    },
    addRoute: (state, action: PayloadAction<Route>) => {
      state.routes.push(action.payload)
    },
    updateRoute: (state, action: PayloadAction<Route>) => {
      const index = state.routes.findIndex((r) => r.id === action.payload.id)
      if (index !== -1) {
        state.routes[index] = action.payload
      }
    },
    deleteRoute: (state, action: PayloadAction<string>) => {
      state.routes = state.routes.filter((r) => r.id !== action.payload)
    },
    addCustomField: (state, action: PayloadAction<CustomFieldConfig>) => {
      state.customFields.push(action.payload)
    },
    updateCustomField: (state, action: PayloadAction<CustomFieldConfig>) => {
      const index = state.customFields.findIndex((cf) => cf.id === action.payload.id)
      if (index !== -1) {
        state.customFields[index] = action.payload
      }
    },
    deleteCustomField: (state, action: PayloadAction<string>) => {
      state.customFields = state.customFields.filter((cf) => cf.id !== action.payload)
    },
  },
  extraReducers: (builder) => {
    // Reducers para códigos SAP
    builder
      // Fetch Service SAP Codes
      .addCase(fetchServiceSapCodes.pending, (state) => {
        state.serviceSapCodesLoading = true
        state.serviceSapCodesError = null
      })
      .addCase(fetchServiceSapCodes.fulfilled, (state, action) => {
        state.serviceSapCodesLoading = false
        state.serviceSapCodes = action.payload
      })
      .addCase(fetchServiceSapCodes.rejected, (state, action) => {
        state.serviceSapCodesLoading = false
        state.serviceSapCodesError = action.error.message || 'Error al cargar códigos SAP'
      })
      
      // Create Service SAP Code
      .addCase(createServiceSapCode.fulfilled, (state, action) => {
        state.serviceSapCodes.push(action.payload)
      })
      
      // Update Service SAP Code
      .addCase(updateServiceSapCode.fulfilled, (state, action) => {
        const index = state.serviceSapCodes.findIndex(code => code._id === action.payload._id)
        if (index !== -1) {
          state.serviceSapCodes[index] = action.payload
        }
      })
      
      // Delete Service SAP Code
      .addCase(deleteServiceSapCode.fulfilled, (state, action) => {
        state.serviceSapCodes = state.serviceSapCodes.filter(code => code._id !== action.payload)
      })
  }
})

export const {
  addDriver,
  updateDriver,
  deleteDriver,
  addVehicle,
  updateVehicle,
  deleteVehicle,
  addRoute,
  updateRoute,
  deleteRoute,
  addCustomField,
  updateCustomField,
  deleteCustomField,
} = configSlice.actions

export default configSlice.reducer

// Selectors
export const selectTruckingDrivers = (state: { config: ConfigState }) => state.config.drivers
export const selectTruckingVehicles = (state: { config: ConfigState }) => state.config.vehicles
export const selectTruckingRoutes = (state: { config: ConfigState }) => state.config.routes
export const selectModuleCustomFields = createSelector(
  [(state: { config: ConfigState }) => state.config.customFields, (state: { config: ConfigState }, module: CustomFieldConfig["module"]) => module],
  (customFields, module) => 
    customFields.filter((field) => field.module === module)
)

// Selectores para códigos SAP
export const selectServiceSapCodes = (state: { config: ConfigState }) => state.config.serviceSapCodes
export const selectServiceSapCodesLoading = (state: { config: ConfigState }) => state.config.serviceSapCodesLoading
export const selectServiceSapCodesError = (state: { config: ConfigState }) => state.config.serviceSapCodesError

// Selector para códigos SAP por módulo
export const selectServiceSapCodesByModule = (state: { config: ConfigState }, module: string) => 
  state.config.serviceSapCodes.filter(code => code.module === module || code.module === 'all')

// Selector para códigos SAP activos
export const selectActiveServiceSapCodes = (state: { config: ConfigState }) => 
  state.config.serviceSapCodes.filter(code => code.active)
