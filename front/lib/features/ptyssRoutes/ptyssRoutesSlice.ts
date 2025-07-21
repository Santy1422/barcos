import { createSlice, createAsyncThunk, type PayloadAction } from "@reduxjs/toolkit"

// Interface para rutas de PTYSS
export interface PTYSSRoute {
  _id: string
  name: string
  from: string
  to: string
  containerType: string
  routeType: "single" | "RT"
  price: number
  createdAt: string
  updatedAt: string
}

// Interface para crear/actualizar rutas (sin _id y timestamps)
export interface PTYSSRouteInput {
  from: string
  to: string
  containerType: string
  routeType: "single" | "RT"
  price: number
}

// State structure
interface PTYSSRoutesState {
  routes: PTYSSRoute[]
  loading: boolean
  error: string | null
}

const initialState: PTYSSRoutesState = {
  routes: [],
  loading: false,
  error: null
}

// Async thunks para conectar con API
export const fetchPTYSSRoutes = createAsyncThunk(
  'ptyssRoutes/fetchRoutes',
  async (_, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token')
      
      if (!token) {
        throw new Error('No se encontró token de autenticación')
      }
      
      if (token === 'undefined' || token === 'null') {
        throw new Error('Token inválido en localStorage')
      }
      
      const response = await fetch('/api/ptyss-routes', {
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
      console.error('Error en fetchPTYSSRoutes:', error)
      return rejectWithValue(error instanceof Error ? error.message : 'Error desconocido')
    }
  }
)

export const createPTYSSRoute = createAsyncThunk(
  'ptyssRoutes/createRoute',
  async (routeData: PTYSSRouteInput, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token')
      
      if (!token) {
        throw new Error('No se encontró token de autenticación')
      }
      
      const response = await fetch('/api/ptyss-routes', {
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
      return data.payload?.data || data.payload
    } catch (error) {
      console.error('Error en createPTYSSRoute:', error)
      return rejectWithValue(error instanceof Error ? error.message : 'Error desconocido')
    }
  }
)

export const updatePTYSSRoute = createAsyncThunk(
  'ptyssRoutes/updateRoute',
  async ({ id, routeData }: { id: string, routeData: PTYSSRouteInput }, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token')
      
      if (!token) {
        throw new Error('No se encontró token de autenticación')
      }
      
      const response = await fetch(`/api/ptyss-routes/${id}`, {
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
      return data.payload?.data || data.payload
    } catch (error) {
      console.error('Error en updatePTYSSRoute:', error)
      return rejectWithValue(error instanceof Error ? error.message : 'Error desconocido')
    }
  }
)

export const deletePTYSSRoute = createAsyncThunk(
  'ptyssRoutes/deleteRoute',
  async (id: string, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token')
      
      if (!token) {
        throw new Error('No se encontró token de autenticación')
      }
      
      const response = await fetch(`/api/ptyss-routes/${id}`, {
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
      console.error('Error en deletePTYSSRoute:', error)
      return rejectWithValue(error instanceof Error ? error.message : 'Error desconocido')
    }
  }
)

const ptyssRoutesSlice = createSlice({
  name: "ptyssRoutes",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null
    }
  },
  extraReducers: (builder) => {
    // Fetch routes
    builder
      .addCase(fetchPTYSSRoutes.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchPTYSSRoutes.fulfilled, (state, action) => {
        state.loading = false
        state.routes = action.payload
      })
      .addCase(fetchPTYSSRoutes.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
    
    // Create route
    builder
      .addCase(createPTYSSRoute.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(createPTYSSRoute.fulfilled, (state, action) => {
        state.loading = false
        state.routes.push(action.payload)
      })
      .addCase(createPTYSSRoute.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
    
    // Update route
    builder
      .addCase(updatePTYSSRoute.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(updatePTYSSRoute.fulfilled, (state, action) => {
        state.loading = false
        const index = state.routes.findIndex(route => route._id === action.payload._id)
        if (index !== -1) {
          state.routes[index] = action.payload
        }
      })
      .addCase(updatePTYSSRoute.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
    
    // Delete route
    builder
      .addCase(deletePTYSSRoute.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(deletePTYSSRoute.fulfilled, (state, action) => {
        state.loading = false
        state.routes = state.routes.filter(route => route._id !== action.payload)
      })
      .addCase(deletePTYSSRoute.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
  }
})

// Selectors
export const selectPTYSSRoutes = (state: { ptyssRoutes: PTYSSRoutesState }) => state.ptyssRoutes.routes
export const selectPTYSSRoutesLoading = (state: { ptyssRoutes: PTYSSRoutesState }) => state.ptyssRoutes.loading
export const selectPTYSSRoutesError = (state: { ptyssRoutes: PTYSSRoutesState }) => state.ptyssRoutes.error

export const { clearError } = ptyssRoutesSlice.actions

export default ptyssRoutesSlice.reducer 