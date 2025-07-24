import { createSlice, createAsyncThunk, type PayloadAction } from "@reduxjs/toolkit"

// Interface para rutas locales de PTYSS
export interface PTYSSLocalRoute {
  _id: string
  clientName: string
  from: string
  to: string
  price: number
  createdAt: string
  updatedAt: string
}

// Interface para crear/actualizar rutas locales (sin _id y timestamps)
export interface PTYSSLocalRouteInput {
  clientName: string
  from: string
  to: string
  price: number
}

// State structure
interface PTYSSLocalRoutesState {
  routes: PTYSSLocalRoute[]
  loading: boolean
  error: string | null
}

// Initial state
const initialState: PTYSSLocalRoutesState = {
  routes: [],
  loading: false,
  error: null
}

// Async thunks
export const fetchPTYSSLocalRoutes = createAsyncThunk(
  'ptyssLocalRoutes/fetchPTYSSLocalRoutes',
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch('/api/ptyss-local-routes', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.payload?.message || errorData.message || 'Error al obtener rutas locales de PTYSS')
      }

      const data = await response.json()
      return data.payload.data
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Error desconocido')
    }
  }
)

export const createPTYSSLocalRoute = createAsyncThunk(
  'ptyssLocalRoutes/createPTYSSLocalRoute',
  async (routeData: PTYSSLocalRouteInput, { rejectWithValue }) => {
    try {
      const response = await fetch('/api/ptyss-local-routes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(routeData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.payload?.message || errorData.message || 'Error al crear ruta local de PTYSS')
      }

      const data = await response.json()
      return data.payload.data
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Error desconocido')
    }
  }
)

export const updatePTYSSLocalRoute = createAsyncThunk(
  'ptyssLocalRoutes/updatePTYSSLocalRoute',
  async ({ id, routeData }: { id: string; routeData: PTYSSLocalRouteInput }, { rejectWithValue }) => {
    try {
      const response = await fetch(`/api/ptyss-local-routes/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(routeData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.payload?.message || errorData.message || 'Error al actualizar ruta local de PTYSS')
      }

      const data = await response.json()
      return data.payload.data
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Error desconocido')
    }
  }
)

export const deletePTYSSLocalRoute = createAsyncThunk(
  'ptyssLocalRoutes/deletePTYSSLocalRoute',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await fetch(`/api/ptyss-local-routes/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.payload?.message || errorData.message || 'Error al eliminar ruta local de PTYSS')
      }

      return id
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Error desconocido')
    }
  }
)

const ptyssLocalRoutesSlice = createSlice({
  name: "ptyssLocalRoutes",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null
    }
  },
  extraReducers: (builder) => {
    // Fetch routes
    builder
      .addCase(fetchPTYSSLocalRoutes.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchPTYSSLocalRoutes.fulfilled, (state, action) => {
        state.loading = false
        state.routes = action.payload
      })
      .addCase(fetchPTYSSLocalRoutes.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
    
    // Create route
    builder
      .addCase(createPTYSSLocalRoute.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(createPTYSSLocalRoute.fulfilled, (state, action) => {
        state.loading = false
        state.routes.push(action.payload)
      })
      .addCase(createPTYSSLocalRoute.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
    
    // Update route
    builder
      .addCase(updatePTYSSLocalRoute.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(updatePTYSSLocalRoute.fulfilled, (state, action) => {
        state.loading = false
        const index = state.routes.findIndex(route => route._id === action.payload._id)
        if (index !== -1) {
          state.routes[index] = action.payload
        }
      })
      .addCase(updatePTYSSLocalRoute.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
    
    // Delete route
    builder
      .addCase(deletePTYSSLocalRoute.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(deletePTYSSLocalRoute.fulfilled, (state, action) => {
        state.loading = false
        state.routes = state.routes.filter(route => route._id !== action.payload)
      })
      .addCase(deletePTYSSLocalRoute.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
  }
})

// Selectors
export const selectPTYSSLocalRoutes = (state: { ptyssLocalRoutes: PTYSSLocalRoutesState }) => 
  state.ptyssLocalRoutes?.routes || []

export const selectPTYSSLocalRoutesLoading = (state: { ptyssLocalRoutes: PTYSSLocalRoutesState }) => 
  state.ptyssLocalRoutes?.loading || false

export const selectPTYSSLocalRoutesError = (state: { ptyssLocalRoutes: PTYSSLocalRoutesState }) => 
  state.ptyssLocalRoutes?.error || null

// Helper function to group routes by client
export const selectPTYSSLocalRoutesByClient = (state: { ptyssLocalRoutes: PTYSSLocalRoutesState }) => {
  const routes = state.ptyssLocalRoutes?.routes || []
  const grouped = routes.reduce((acc, route) => {
    if (!acc[route.clientName]) {
      acc[route.clientName] = []
    }
    acc[route.clientName].push(route)
    return acc
  }, {} as Record<string, PTYSSLocalRoute[]>)
  
  return grouped
}

export const { clearError } = ptyssLocalRoutesSlice.actions
export default ptyssLocalRoutesSlice.reducer 