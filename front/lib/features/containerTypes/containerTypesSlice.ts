import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import { getApiBaseUrl } from '@/lib/api-config'

export interface ContainerType {
  _id: string
  code: string
  name: string
  category: 'A' | 'B' | 'DRY' | 'N' | 'REEFE' | 'T' | 'MTY' | 'FB'
  sapCode: string
  isActive: boolean
  description?: string
  createdAt?: string
  updatedAt?: string
}

export interface ContainerTypeInput {
  code: string
  name: string
  category: 'A' | 'B' | 'DRY' | 'N' | 'REEFE' | 'T' | 'MTY' | 'FB'
  sapCode: string
  description?: string
  isActive?: boolean
}

interface ContainerTypesState {
  containerTypes: ContainerType[]
  loading: boolean
  error: string | null
  creating: boolean
  updating: boolean
  deleting: boolean
}

const initialState: ContainerTypesState = {
  containerTypes: [],
  loading: false,
  error: null,
  creating: false,
  updating: false,
  deleting: false
}

// Async thunks
export const fetchContainerTypes = createAsyncThunk(
  'containerTypes/fetchContainerTypes',
  async (filters?: { category?: string; isActive?: string | boolean }) => {
    const token = localStorage.getItem('token')
    if (!token) throw new Error('No hay token de autenticación')

    const baseUrl = getApiBaseUrl()
    const params = new URLSearchParams()
    
    // Filtro por categoría
    if (filters?.category && filters.category !== 'all') {
      params.append('category', filters.category)
    }
    
    // Filtro por estado activo
    if (filters?.isActive && filters.isActive !== 'all') {
      // Convertir string a boolean si es necesario
      const isActiveValue = filters.isActive === 'true' ? true : filters.isActive === 'false' ? false : filters.isActive
      params.append('isActive', isActiveValue.toString())
    }

    const response = await fetch(`${baseUrl}/api/config/container-types?${params.toString()}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.message || 'Error al cargar tipos de contenedores')
    }
    const data = await response.json()
    return data.data
  }
)

export const createContainerType = createAsyncThunk(
  'containerTypes/createContainerType',
  async (containerTypeData: ContainerTypeInput) => {
    const token = localStorage.getItem('token')
    if (!token) throw new Error('No hay token de autenticación')

    const baseUrl = getApiBaseUrl()
    const response = await fetch(`${baseUrl}/api/config/container-types`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(containerTypeData),
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Error al crear tipo de contenedor')
    }
    const data = await response.json()
    return data.data
  }
)

export const updateContainerType = createAsyncThunk(
  'containerTypes/updateContainerType',
  async ({ id, containerTypeData }: { id: string; containerTypeData: ContainerTypeInput }) => {
    const token = localStorage.getItem('token')
    if (!token) throw new Error('No hay token de autenticación')

    const baseUrl = getApiBaseUrl()
    const response = await fetch(`${baseUrl}/api/config/container-types/${id}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(containerTypeData),
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Error al actualizar tipo de contenedor')
    }
    const data = await response.json()
    return data.data
  }
)

export const deleteContainerType = createAsyncThunk(
  'containerTypes/deleteContainerType',
  async (id: string) => {
    const token = localStorage.getItem('token')
    if (!token) throw new Error('No hay token de autenticación')

    const baseUrl = getApiBaseUrl()
    const response = await fetch(`${baseUrl}/api/config/container-types/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Error al eliminar tipo de contenedor')
    }
    return id
  }
)

const containerTypesSlice = createSlice({
  name: 'containerTypes',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null
    },
    clearContainerTypes: (state) => {
      state.containerTypes = []
    }
  },
  extraReducers: (builder) => {
    // fetchContainerTypes
    builder
      .addCase(fetchContainerTypes.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchContainerTypes.fulfilled, (state, action) => {
        state.loading = false
        state.containerTypes = action.payload
      })
      .addCase(fetchContainerTypes.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message || 'Error al cargar tipos de contenedores'
      })

    // createContainerType
    builder
      .addCase(createContainerType.pending, (state) => {
        state.creating = true
        state.error = null
      })
      .addCase(createContainerType.fulfilled, (state, action) => {
        state.creating = false
        state.containerTypes.push(action.payload)
      })
      .addCase(createContainerType.rejected, (state, action) => {
        state.creating = false
        state.error = action.error.message || 'Error al crear tipo de contenedor'
      })

    // updateContainerType
    builder
      .addCase(updateContainerType.pending, (state) => {
        state.updating = true
        state.error = null
      })
      .addCase(updateContainerType.fulfilled, (state, action) => {
        state.updating = false
        const index = state.containerTypes.findIndex(ct => ct._id === action.payload._id)
        if (index !== -1) {
          state.containerTypes[index] = action.payload
        }
      })
      .addCase(updateContainerType.rejected, (state, action) => {
        state.updating = false
        state.error = action.error.message || 'Error al actualizar tipo de contenedor'
      })

    // deleteContainerType
    builder
      .addCase(deleteContainerType.pending, (state) => {
        state.deleting = true
        state.error = null
      })
      .addCase(deleteContainerType.fulfilled, (state, action) => {
        state.deleting = false
        state.containerTypes = state.containerTypes.filter(ct => ct._id !== action.payload)
      })
      .addCase(deleteContainerType.rejected, (state, action) => {
        state.deleting = false
        state.error = action.error.message || 'Error al eliminar tipo de contenedor'
      })
  }
})

export const { clearError, clearContainerTypes } = containerTypesSlice.actions

// Selectors
export const selectAllContainerTypes = (state: any) => state.containerTypes.containerTypes
export const selectContainerTypesLoading = (state: any) => state.containerTypes.loading
export const selectContainerTypesError = (state: any) => state.containerTypes.error
export const selectContainerTypesCreating = (state: any) => state.containerTypes.creating
export const selectContainerTypesUpdating = (state: any) => state.containerTypes.updating
export const selectContainerTypesDeleting = (state: any) => state.containerTypes.deleting

export default containerTypesSlice.reducer
