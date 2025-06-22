import { createSlice, type PayloadAction } from "@reduxjs/toolkit"

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
  distance: number
}

export type CustomFieldType = "text" | "number" | "date" | "select"

export interface CustomFieldConfig {
  id: string
  label: string
  type: CustomFieldType
  options?: string[] // For 'select' type
  module: "trucking" | "agency" | "shipchandler" // Which module this field belongs to
}

// State structure for the config slice
interface ConfigState {
  drivers: Driver[]
  vehicles: Vehicle[]
  routes: Route[]
  customFields: CustomFieldConfig[]
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
      distance: 25,
    },
    { id: "route-2", name: "Manzanillo - Colón", origin: "Manzanillo", destination: "Colón", distance: 15 },
  ],
  customFields: [
    { id: "trucking-cf-1", label: "Tipo de Carga", type: "text", module: "trucking" },
    { id: "trucking-cf-2", label: "Número de Sello", type: "text", module: "trucking" },
    { id: "trucking-cf-3", label: "Peso (kg)", type: "number", module: "trucking" },
  ],
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
export const selectModuleCustomFields = (state: { config: ConfigState }, module: CustomFieldConfig["module"]) =>
  state.config.customFields.filter((field) => field.module === module)
