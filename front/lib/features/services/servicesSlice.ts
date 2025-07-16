import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import { createApiUrl } from '@/lib/api-config'

export interface Service {
  _id: string
  name: string
  description: string
  isActive: boolean
  module: "ptyss" | "trucking" | "agency" | "shipchandler" | "all"
  createdBy?: string
  createdAt: string
  updatedAt: string
}

interface ServicesState {
  services: Service[]
  loading: boolean
  error: string | null
}

const initialState: ServicesState = {
  services: [],
  loading: false,
  error: null
}

// Fetch all services
export const fetchServices = createAsyncThunk(
  'services/fetchAll',
  async (module?: string, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token')
      const url = module 
        ? createApiUrl(`/api/services?module=${module}`)
        : createApiUrl('/api/services')
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error('Error al obtener servicios')
      }

      const data = await response.json()
      return data.data || []
    } catch (error: any) {
      return rejectWithValue(error.message)
    }
  }
)

// Create new service
export const createServiceAsync = createAsyncThunk(
  'services/create',
  async (serviceData: {
    name: string
    description: string
    module: "ptyss" | "trucking" | "agency" | "shipchandler" | "all"
  }, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(createApiUrl('/api/services'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(serviceData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Error al crear servicio')
      }

      const data = await response.json()
      return data.data
    } catch (error: any) {
      return rejectWithValue(error.message)
    }
  }
)

// Update service
export const updateServiceAsync = createAsyncThunk(
  'services/update',
  async ({ id, serviceData }: {
    id: string
    serviceData: Partial<Service>
  }, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(createApiUrl(`/api/services/${id}`), {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(serviceData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Error al actualizar servicio')
      }

      const data = await response.json()
      return data.data
    } catch (error: any) {
      return rejectWithValue(error.message)
    }
  }
)

// Delete service
export const deleteServiceAsync = createAsyncThunk(
  'services/delete',
  async (serviceId: string, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(createApiUrl(`/api/services/${serviceId}`), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Error al eliminar servicio')
      }

      return serviceId
    } catch (error: any) {
      return rejectWithValue(error.message)
    }
  }
)

const servicesSlice = createSlice({
  name: 'services',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch services
      .addCase(fetchServices.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchServices.fulfilled, (state, action) => {
        state.loading = false
        state.services = action.payload
      })
      .addCase(fetchServices.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
      
      // Create service
      .addCase(createServiceAsync.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(createServiceAsync.fulfilled, (state, action) => {
        state.loading = false
        state.services.push(action.payload)
      })
      .addCase(createServiceAsync.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
      
      // Update service
      .addCase(updateServiceAsync.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(updateServiceAsync.fulfilled, (state, action) => {
        state.loading = false
        const index = state.services.findIndex(service => service._id === action.payload._id)
        if (index !== -1) {
          state.services[index] = action.payload
        }
      })
      .addCase(updateServiceAsync.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
      
      // Delete service
      .addCase(deleteServiceAsync.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(deleteServiceAsync.fulfilled, (state, action) => {
        state.loading = false
        state.services = state.services.filter(service => service._id !== action.payload)
      })
      .addCase(deleteServiceAsync.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
  }
})

export const { clearError } = servicesSlice.actions

// Selectors
export const selectAllServices = (state: { services: ServicesState }) => state.services.services
export const selectActiveServices = (state: { services: ServicesState }) => 
  state.services.services.filter(service => service.isActive)
export const selectServicesByModule = (state: { services: ServicesState }, module: string) =>
  state.services.services.filter(service => service.module === module && service.isActive)
export const selectServicesLoading = (state: { services: ServicesState }) => state.services.loading
export const selectServicesError = (state: { services: ServicesState }) => state.services.error

export default servicesSlice.reducer 