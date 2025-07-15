import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import { getApiBaseUrl } from '@/lib/api-config'

// Tipos
export interface Naviera {
  _id: string
  name: string
  code: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  createdBy: string
}

interface NavieraState {
  navieras: Naviera[]
  loading: boolean
  error: string | null
  currentNaviera: Naviera | null
}

const initialState: NavieraState = {
  navieras: [],
  loading: false,
  error: null,
  currentNaviera: null
}

// Async thunks
export const fetchNavieras = createAsyncThunk(
  'naviera/fetchNavieras',
  async (status?: 'all' | 'active' | 'inactive') => {
    const token = localStorage.getItem('token')
    if (!token) throw new Error('No hay token de autenticación')

    const baseUrl = getApiBaseUrl()
    const url = status && status !== 'all' 
      ? `${baseUrl}/api/navieras?status=${status}`
      : `${baseUrl}/api/navieras`

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.message || 'Error al obtener navieras')
    }

    const data = await response.json()
    return data.data.navieras
  }
)

export const createNavieraAsync = createAsyncThunk(
  'naviera/createNaviera',
  async (navieraData: { name: string; code: string }) => {
    const token = localStorage.getItem('token')
    if (!token) throw new Error('No hay token de autenticación')

    const baseUrl = getApiBaseUrl()
    const response = await fetch(`${baseUrl}/api/navieras`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(navieraData)
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.message || 'Error al crear naviera')
    }

    const data = await response.json()
    return data.data.naviera
  }
)

export const updateNavieraAsync = createAsyncThunk(
  'naviera/updateNaviera',
  async ({ id, navieraData }: { id: string; navieraData: Partial<Naviera> }) => {
    const token = localStorage.getItem('token')
    if (!token) throw new Error('No hay token de autenticación')

    const baseUrl = getApiBaseUrl()
    const response = await fetch(`${baseUrl}/api/navieras/${id}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(navieraData)
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.message || 'Error al actualizar naviera')
    }

    const data = await response.json()
    return data.data.naviera
  }
)

export const deleteNavieraAsync = createAsyncThunk(
  'naviera/deleteNaviera',
  async (id: string) => {
    const token = localStorage.getItem('token')
    if (!token) throw new Error('No hay token de autenticación')

    const baseUrl = getApiBaseUrl()
    const response = await fetch(`${baseUrl}/api/navieras/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.message || 'Error al eliminar naviera')
    }

    return id
  }
)

// Slice
const navieraSlice = createSlice({
  name: 'naviera',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null
    },
    setCurrentNaviera: (state, action: PayloadAction<Naviera | null>) => {
      state.currentNaviera = action.payload
    }
  },
  extraReducers: (builder) => {
    // fetchNavieras
    builder
      .addCase(fetchNavieras.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchNavieras.fulfilled, (state, action) => {
        state.loading = false
        state.navieras = action.payload
      })
      .addCase(fetchNavieras.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message || 'Error al obtener navieras'
      })

    // createNavieraAsync
    builder
      .addCase(createNavieraAsync.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(createNavieraAsync.fulfilled, (state, action) => {
        state.loading = false
        state.navieras.unshift(action.payload)
      })
      .addCase(createNavieraAsync.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message || 'Error al crear naviera'
      })

    // updateNavieraAsync
    builder
      .addCase(updateNavieraAsync.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(updateNavieraAsync.fulfilled, (state, action) => {
        state.loading = false
        const index = state.navieras.findIndex(naviera => naviera._id === action.payload._id)
        if (index !== -1) {
          state.navieras[index] = action.payload
        }
      })
      .addCase(updateNavieraAsync.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message || 'Error al actualizar naviera'
      })

    // deleteNavieraAsync
    builder
      .addCase(deleteNavieraAsync.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(deleteNavieraAsync.fulfilled, (state, action) => {
        state.loading = false
        state.navieras = state.navieras.filter(naviera => naviera._id !== action.payload)
      })
      .addCase(deleteNavieraAsync.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message || 'Error al eliminar naviera'
      })
  }
})

// Selectors
export const selectAllNavieras = (state: { naviera: NavieraState }) => state.naviera.navieras
export const selectActiveNavieras = (state: { naviera: NavieraState }) => 
  state.naviera.navieras.filter(naviera => naviera.isActive)
export const selectNavieraLoading = (state: { naviera: NavieraState }) => state.naviera.loading
export const selectNavieraError = (state: { naviera: NavieraState }) => state.naviera.error
export const selectCurrentNaviera = (state: { naviera: NavieraState }) => state.naviera.currentNaviera

export const { clearError, setCurrentNaviera } = navieraSlice.actions
export default navieraSlice.reducer 