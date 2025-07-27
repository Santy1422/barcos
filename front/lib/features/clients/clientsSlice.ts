import { createSlice, createAsyncThunk, type PayloadAction } from "@reduxjs/toolkit"
import type { RootState } from "@/lib/store"
import { createApiUrl } from "@/lib/api-config"

// Tipos de cliente
export type ClientType = "natural" | "juridico"
export type DocumentType = "cedula" | "pasaporte" | "ruc"

// Interface para cliente natural (persona)
export interface NaturalClient {
  id?: string
  _id?: string
  type: "natural"
  fullName: string
  documentType: "cedula" | "pasaporte"
  documentNumber: string
  address?: string
  email?: string
  phone?: string
  sapCode?: string
  createdAt: string
  updatedAt: string
  isActive: boolean
}

// Interface para cliente jurídico (empresa)
export interface JuridicalClient {
  id?: string
  _id?: string
  type: "juridico"
  companyName: string
  ruc: string
  email: string
  phone?: string
  contactName?: string
  address?: string
  sapCode?: string
  createdAt: string
  updatedAt: string
  isActive: boolean
}

// Union type para ambos tipos de cliente
export type Client = NaturalClient | JuridicalClient

// Estado del slice
interface ClientsState {
  clients: Client[]
  loading: boolean
  error: string | null
}

// Estado inicial con datos de ejemplo
const initialState: ClientsState = {
  clients: [
    {
      id: "client-1",
      type: "natural",
      fullName: "Juan Carlos Pérez González",
      documentType: "cedula",
      documentNumber: "8-123-456",
      address: "Calle 50, Edificio Torre Global, Piso 15, San Francisco, Panamá",
      email: "juan.perez@email.com",
      phone: "6001-2345",
      sapCode: "SAP001",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isActive: true
    },
    {
      id: "client-2",
      type: "juridico",
      companyName: "Importadora Del Mar S.A.",
      ruc: "155678901-2-2020",
      email: "facturacion@importadoradelmar.com",
      phone: "507-264-5000",
      contactName: "María González",
      address: "Avenida Balboa, Torre de las Américas, Piso 20, Bella Vista, Panamá",
      sapCode: "SAP002",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isActive: true
    },
    {
      id: "client-3",
      type: "natural",
      fullName: "Ana María Rodríguez",
      documentType: "pasaporte",
      documentNumber: "PA123456789",
      address: "Cristóbal, Colón",
      email: "ana.rodriguez@email.com",
      phone: "6002-3456",
      sapCode: "SAP003",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isActive: true
    },
    {
      id: "client-4",
      type: "juridico",
      companyName: "Logística Total PTY",
      ruc: "8-NT-12345",
      email: "admin@logisticatotal.com",
      phone: "507-236-7890",
      contactName: "Carlos Mendoza",
      address: "José Domingo Espinar, San Miguelito, Panamá",
      sapCode: "SAP004",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isActive: true
    }
  ],
  loading: false,
  error: null
}

// Async thunks para conectar con API
export const fetchClients = createAsyncThunk(
  'clients/fetchClients',
  async () => {
    console.log('🔍 fetchClients - Iniciando fetch de clientes...')
          const response = await fetch(createApiUrl('/api/clients'))
    console.log('🔍 fetchClients - Response status:', response.status)
    
    if (!response.ok) {
      console.error('🔍 fetchClients - Error response:', response.status, response.statusText)
      throw new Error('Error al obtener clientes')
    }
    
    const data = await response.json()
    console.log('🔍 fetchClients - Response data:', data)
    console.log('🔍 fetchClients - data.payload:', data.payload)
    console.log('🔍 fetchClients - data.payload?.clients:', data.payload?.clients)
    
    const clients = data.payload?.clients || data.payload || data
    console.log('🔍 fetchClients - Clientes finales:', clients)
    console.log('🔍 fetchClients - Cantidad de clientes:', clients.length)
    
    return clients
  }
)

export const createClientAsync = createAsyncThunk(
  'clients/createClient',
  async (clientData: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token')
      
      if (!token) {
        throw new Error('No se encontró token de autenticación')
      }
      
      const response = await fetch(createApiUrl('/api/clients'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(clientData),
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('Error response:', errorData)
        throw new Error(errorData.error || errorData.message || `Error ${response.status}: ${response.statusText}`)
      }
      
      const data = await response.json()
      console.log('Success response:', data)
      return data.payload.client
    } catch (error) {
      console.error('Error en createClientAsync:', error)
      return rejectWithValue(error instanceof Error ? error.message : 'Error desconocido')
    }
  }
)

export const updateClientAsync = createAsyncThunk(
  'clients/updateClient',
  async ({ id, ...clientData }: Client, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token')
      
      if (!token) {
        throw new Error('No se encontró token de autenticación')
      }
      
      console.log('Updating client with ID:', id)
      console.log('Client data:', clientData)
      
      const response = await fetch(createApiUrl(`/api/clients/${id}`), {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(clientData),
      })
      
      console.log('Response status:', response.status)
      console.log('Response URL:', response.url)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('Error response:', errorData)
        throw new Error(errorData.error || errorData.message || `Error ${response.status}: ${response.statusText}`)
      }
      
      const data = await response.json()
      console.log('Success response:', data)
      return data.payload.client
    } catch (error) {
      console.error('Error en updateClientAsync:', error)
      return rejectWithValue(error instanceof Error ? error.message : 'Error desconocido')
    }
  }
)

export const deleteClientAsync = createAsyncThunk(
  'clients/deleteClient',
  async (id: string, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token')
      
      if (!token) {
        throw new Error('No se encontró token de autenticación')
      }
      
      const response = await fetch(createApiUrl(`/api/clients/${id}`), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Error ${response.status}: ${response.statusText}`)
      }
      
      return { id }
    } catch (error) {
      console.error('Error en deleteClientAsync:', error)
      return rejectWithValue(error instanceof Error ? error.message : 'Error desconocido')
    }
  }
)

// Slice con manejo de estados async
const clientsSlice = createSlice({
  name: "clients",
  initialState,
  reducers: {
    // Agregar cliente
    addClient: (state, action: PayloadAction<Client>) => {
      state.clients.push(action.payload)
    },
    
    // Actualizar cliente
    updateClient: (state, action: PayloadAction<Client>) => {
      const index = state.clients.findIndex(c => c.id === action.payload.id)
      if (index !== -1) {
        state.clients[index] = {
          ...action.payload,
          updatedAt: new Date().toISOString()
        }
      }
    },
    
    // Eliminar cliente (soft delete)
    deleteClient: (state, action: PayloadAction<string>) => {
      const index = state.clients.findIndex(c => c.id === action.payload)
      if (index !== -1) {
        state.clients[index].isActive = false
        state.clients[index].updatedAt = new Date().toISOString()
      }
    },
    
    // Activar/desactivar cliente
    toggleClientStatus: (state, action: PayloadAction<string>) => {
      const index = state.clients.findIndex(c => c.id === action.payload)
      if (index !== -1) {
        state.clients[index].isActive = !state.clients[index].isActive
        state.clients[index].updatedAt = new Date().toISOString()
      }
    },
    
    // Estados de carga
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload
    },
    
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload
    }
  },
  extraReducers: (builder) => {
    builder
      // fetchClients
      .addCase(fetchClients.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchClients.fulfilled, (state, action) => {
        state.loading = false
        state.clients = action.payload
      })
      .addCase(fetchClients.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message || 'Error al obtener clientes'
      })
      // createClientAsync
      .addCase(createClientAsync.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(createClientAsync.fulfilled, (state, action) => {
        state.loading = false
        state.clients.push(action.payload)
      })
      .addCase(createClientAsync.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message || 'Error al crear cliente'
      })
      // updateClientAsync
      .addCase(updateClientAsync.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(updateClientAsync.fulfilled, (state, action) => {
        state.loading = false
        const index = state.clients.findIndex(c => c.id === action.payload.id)
        if (index !== -1) {
          state.clients[index] = action.payload
        }
      })
      .addCase(updateClientAsync.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message || 'Error al actualizar cliente'
      })
      // deleteClientAsync
      .addCase(deleteClientAsync.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(deleteClientAsync.fulfilled, (state, action) => {
        state.loading = false
        const index = state.clients.findIndex(c => c.id === action.payload.id)
        if (index !== -1) {
          state.clients[index].isActive = false
          state.clients[index].updatedAt = new Date().toISOString()
        }
      })
      .addCase(deleteClientAsync.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message || 'Error al eliminar cliente'
      })
  }
})

export const {
  addClient,
  updateClient,
  deleteClient,
  toggleClientStatus,
  setLoading,
  setError
} = clientsSlice.actions

export default clientsSlice.reducer

// Selectores
export const selectAllClients = (state: RootState) => Array.isArray(state.clients.clients) ? state.clients.clients : []
export const selectActiveClients = (state: RootState) => {
  const clients = Array.isArray(state.clients.clients) ? state.clients.clients : []
  return clients.filter(client => client && client.isActive)
}
export const selectNaturalClients = (state: RootState) => {
  const clients = Array.isArray(state.clients.clients) ? state.clients.clients : []
  return clients.filter(client => client && client.type === "natural" && client.isActive)
}
export const selectJuridicalClients = (state: RootState) => {
  const clients = Array.isArray(state.clients.clients) ? state.clients.clients : []
  return clients.filter(client => client && client.type === "juridico" && client.isActive)
}
export const selectClientById = (state: RootState, clientId: string) => {
  const clients = Array.isArray(state.clients.clients) ? state.clients.clients : []
  return clients.find(client => client && client.id === clientId)
}
export const selectClientsLoading = (state: RootState) => state.clients.loading
export const selectClientsError = (state: RootState) => state.clients.error