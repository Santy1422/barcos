import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import { createApiUrl } from '@/lib/api-config'

// Interfaces
export interface LocalService {
  _id: string
  name: string
  description: string
  module: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface LocalServiceInput {
  name: string
  description: string
  module: string
}

// Estado inicial
interface LocalServicesState {
  services: LocalService[]
  loading: boolean
  error: string | null
}

const initialState: LocalServicesState = {
  services: [],
  loading: false,
  error: null
}

// Async thunks
export const fetchLocalServices = createAsyncThunk(
  'localServices/fetchLocalServices',
  async (module: string, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token')
      const url = createApiUrl(`/api/local-services?module=${module}`)
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error('Error al obtener servicios locales')
      }

      const data = await response.json()
      return data.data || []
    } catch (error: any) {
      return rejectWithValue(error.message)
    }
  }
)

export const createLocalServiceAsync = createAsyncThunk(
  'localServices/createLocalService',
  async (serviceData: LocalServiceInput, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(createApiUrl('/api/local-services'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(serviceData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Error al crear servicio local')
      }

      const data = await response.json()
      return data.data
    } catch (error: any) {
      return rejectWithValue(error.message)
    }
  }
)

export const updateLocalServiceAsync = createAsyncThunk(
  'localServices/updateLocalService',
  async ({ id, serviceData }: { id: string; serviceData: Partial<LocalServiceInput> }, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(createApiUrl(`/api/local-services/${id}`), {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(serviceData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Error al actualizar servicio local')
      }

      const data = await response.json()
      return data.data
    } catch (error: any) {
      return rejectWithValue(error.message)
    }
  }
)

export const deleteLocalServiceAsync = createAsyncThunk(
  'localServices/deleteLocalService',
  async (serviceId: string, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(createApiUrl(`/api/local-services/${serviceId}`), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Error al eliminar servicio local')
      }

      return serviceId
    } catch (error: any) {
      return rejectWithValue(error.message)
    }
  }
)

// Slice
const localServicesSlice = createSlice({
  name: 'localServices',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch services
      .addCase(fetchLocalServices.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchLocalServices.fulfilled, (state, action) => {
        state.loading = false
        state.services = action.payload
      })
      .addCase(fetchLocalServices.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message || 'Error al cargar servicios locales'
      })
      
      // Create service
      .addCase(createLocalServiceAsync.fulfilled, (state, action) => {
        state.services.push(action.payload)
      })
      
      // Update service
      .addCase(updateLocalServiceAsync.fulfilled, (state, action) => {
        const index = state.services.findIndex(service => service._id === action.payload._id)
        if (index !== -1) {
          state.services[index] = action.payload
        }
      })
      
      // Delete service
      .addCase(deleteLocalServiceAsync.fulfilled, (state, action) => {
        state.services = state.services.filter(service => service._id !== action.payload)
      })
  }
})

export const { clearError } = localServicesSlice.actions

// Selectors
export const selectAllLocalServices = (state: any) => state.localServices.services
export const selectLocalServicesLoading = (state: any) => state.localServices.loading
export const selectLocalServicesError = (state: any) => state.localServices.error

export default localServicesSlice.reducer 