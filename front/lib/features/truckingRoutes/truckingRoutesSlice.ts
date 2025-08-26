import { createSlice, createAsyncThunk, type PayloadAction } from "@reduxjs/toolkit"

// Interface para rutas de trucking
export interface TruckingRoute {
  _id: string
  name: string
  origin: string
  destination: string
  containerType: "dry" | "reefer"
  routeType: "single" | "RT"
  price: number
  createdAt: string
  updatedAt: string
}

// Interface para crear/actualizar rutas (sin _id y timestamps)
export interface TruckingRouteInput {
  name: string
  origin: string
  destination: string
  containerType: "dry" | "reefer"
  routeType: "single" | "RT"
  price: number
}

// State structure
interface TruckingRoutesState {
  routes: TruckingRoute[]
  loading: boolean
  error: string | null
}

const initialState: TruckingRoutesState = {
  routes: [],
  loading: false,
  error: null
}

// Async thunks para conectar con API
export const fetchTruckingRoutes = createAsyncThunk(
  'truckingRoutes/fetchRoutes',
  async (_, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token')
      
      if (!token) {
        throw new Error('No se encontró token de autenticación')
      }
      
      if (token === 'undefined' || token === 'null') {
        throw new Error('Token inválido en localStorage')
      }
      
      const response = await fetch('/api/trucking-routes', {
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
      return data.payload?.data || []
    } catch (error) {
      console.error('Error en fetchTruckingRoutes:', error)
      return rejectWithValue(error instanceof Error ? error.message : 'Error desconocido')
    }
  }
)

export const createTruckingRoute = createAsyncThunk(
  'truckingRoutes/createRoute',
  async (routeData: TruckingRouteInput, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token')
      
      if (!token) {
        throw new Error('No se encontró token de autenticación')
      }
      
      const response = await fetch('/api/trucking-routes', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(routeData)
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.payload?.message || `Error ${response.status}: ${response.statusText}`)
      }
      
      const data = await response.json()
      return data.payload?.data
    } catch (error) {
      console.error('Error en createTruckingRoute:', error)
      return rejectWithValue(error instanceof Error ? error.message : 'Error desconocido')
    }
  }
)

export const updateTruckingRoute = createAsyncThunk(
  'truckingRoutes/updateRoute',
  async ({ id, routeData }: { id: string; routeData: TruckingRouteInput }, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token')
      
      if (!token) {
        throw new Error('No se encontró token de autenticación')
      }
      
      const response = await fetch(`/api/trucking-routes/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(routeData)
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.payload?.message || `Error ${response.status}: ${response.statusText}`)
      }
      
      const data = await response.json()
      return data.payload?.data
    } catch (error) {
      console.error('Error en updateTruckingRoute:', error)
      return rejectWithValue(error instanceof Error ? error.message : 'Error desconocido')
    }
  }
)

export const deleteTruckingRoute = createAsyncThunk(
  'truckingRoutes/deleteRoute',
  async (id: string, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token')
      
      if (!token) {
        throw new Error('No se encontró token de autenticación')
      }
      
      const response = await fetch(`/api/trucking-routes/${id}`, {
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
    } catch (error) {
      console.error('Error en deleteTruckingRoute:', error)
      return rejectWithValue(error instanceof Error ? error.message : 'Error desconocido')
    }
  }
)

const truckingRoutesSlice = createSlice({
  name: "truckingRoutes",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null
    }
  },
  extraReducers: (builder) => {
    // Fetch routes
    builder
      .addCase(fetchTruckingRoutes.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchTruckingRoutes.fulfilled, (state, action) => {
        state.loading = false
        state.routes = action.payload
      })
      .addCase(fetchTruckingRoutes.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
    
    // Create route
    builder
      .addCase(createTruckingRoute.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(createTruckingRoute.fulfilled, (state, action) => {
        state.loading = false
        state.routes.push(action.payload)
      })
      .addCase(createTruckingRoute.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
    
    // Update route
    builder
      .addCase(updateTruckingRoute.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(updateTruckingRoute.fulfilled, (state, action) => {
        state.loading = false
        const index = state.routes.findIndex(route => route._id === action.payload._id)
        if (index !== -1) {
          state.routes[index] = action.payload
        }
      })
      .addCase(updateTruckingRoute.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
    
    // Delete route
    builder
      .addCase(deleteTruckingRoute.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(deleteTruckingRoute.fulfilled, (state, action) => {
        state.loading = false
        state.routes = state.routes.filter(route => route._id !== action.payload)
      })
      .addCase(deleteTruckingRoute.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
  }
})

export const { clearError } = truckingRoutesSlice.actions

// Selectors
export const selectTruckingRoutes = (state: { truckingRoutes: TruckingRoutesState }) => state.truckingRoutes.routes
export const selectTruckingRoutesLoading = (state: { truckingRoutes: TruckingRoutesState }) => state.truckingRoutes.loading
export const selectTruckingRoutesError = (state: { truckingRoutes: TruckingRoutesState }) => state.truckingRoutes.error

export default truckingRoutesSlice.reducer 