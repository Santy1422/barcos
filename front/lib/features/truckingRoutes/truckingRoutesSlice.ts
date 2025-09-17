import { createSlice, createAsyncThunk, type PayloadAction } from "@reduxjs/toolkit"

// Interface para rutas de trucking
export interface TruckingRoute {
  _id: string
  name: string
  origin: string
  destination: string
  containerType: string
  routeType: "SINGLE" | "RT"
  price: number
  status: "FULL" | "EMPTY"
  cliente: string
  routeArea: string
  sizeContenedor: string
  createdAt: string
  updatedAt: string
}

// Interface para crear/actualizar rutas (sin _id y timestamps)
export interface TruckingRouteInput {
  name: string
  origin: string
  destination: string
  containerType: string
  routeType: "SINGLE" | "RT"
  price: number
  status: "FULL" | "EMPTY"
  cliente: string
  routeArea: string
  sizeContenedor: string
}

// Interface para paginación
export interface PaginationInfo {
  currentPage: number
  totalPages: number
  totalItems: number
  itemsPerPage: number
  hasNextPage: boolean
  hasPrevPage: boolean
  nextPage: number | null
  prevPage: number | null
}

// State structure
interface TruckingRoutesState {
  routes: TruckingRoute[]
  loading: boolean
  error: string | null
  pagination: PaginationInfo | null
  filters: {
    search: string
    containerType: string
    routeType: string
    status: string
  }
}

const initialState: TruckingRoutesState = {
  routes: [],
  loading: false,
  error: null,
  pagination: null,
  filters: {
    search: '',
    containerType: 'all',
    routeType: 'all',
    status: 'all'
  }
}

// Async thunks para conectar con API
export const fetchTruckingRoutes = createAsyncThunk(
  'truckingRoutes/fetchRoutes',
  async (params: { page?: number; limit?: number; search?: string; containerType?: string; routeType?: string; status?: string } = {}, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token')
      
      if (!token) {
        throw new Error('No se encontró token de autenticación')
      }
      
      if (token === 'undefined' || token === 'null') {
        throw new Error('Token inválido en localStorage')
      }
      
      // Construir query string
      const queryParams = new URLSearchParams()
      if (params.page) queryParams.append('page', params.page.toString())
      if (params.limit) queryParams.append('limit', params.limit.toString())
      if (params.search) queryParams.append('search', params.search)
      if (params.containerType && params.containerType !== 'all') queryParams.append('containerType', params.containerType)
      if (params.routeType && params.routeType !== 'all') queryParams.append('routeType', params.routeType)
      if (params.status && params.status !== 'all') queryParams.append('status', params.status)
      
      const queryString = queryParams.toString()
      const url = `/api/trucking-routes${queryString ? `?${queryString}` : ''}`
      
      const response = await fetch(url, {
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
      return {
        routes: data.payload?.data || [],
        pagination: data.payload?.pagination || null
      }
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
    },
    setFilters: (state, action: PayloadAction<Partial<typeof initialState.filters>>) => {
      state.filters = { ...state.filters, ...action.payload }
    },
    setPage: (state, action: PayloadAction<number>) => {
      if (state.pagination) {
        state.pagination.currentPage = action.payload
      }
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
        state.routes = action.payload.routes
        state.pagination = action.payload.pagination
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

export const { clearError, setFilters, setPage } = truckingRoutesSlice.actions

// Selectors
export const selectTruckingRoutes = (state: { truckingRoutes: TruckingRoutesState }) => state.truckingRoutes.routes
export const selectTruckingRoutesLoading = (state: { truckingRoutes: TruckingRoutesState }) => state.truckingRoutes.loading
export const selectTruckingRoutesError = (state: { truckingRoutes: TruckingRoutesState }) => state.truckingRoutes.error
export const selectTruckingRoutesPagination = (state: { truckingRoutes: TruckingRoutesState }) => state.truckingRoutes.pagination
export const selectTruckingRoutesFilters = (state: { truckingRoutes: TruckingRoutesState }) => state.truckingRoutes.filters

export default truckingRoutesSlice.reducer 