import { createSlice, createAsyncThunk, type PayloadAction } from "@reduxjs/toolkit"
import type { RootState } from "@/lib/store"

// Tipos de cliente
export type ClientType = "natural" | "juridico"
export type DocumentType = "cedula" | "pasaporte" | "ruc"

// Interface para cliente natural (persona)
export interface NaturalClient {
  id: string
  type: "natural"
  fullName: string
  documentType: "cedula" | "pasaporte"
  documentNumber: string
  address: {
    province: string
    district: string
    corregimiento: string
    fullAddress?: string
  }
  email?: string
  phone?: string
  sapCode?: string // Nuevo campo
  createdAt: string
  updatedAt: string
  isActive: boolean
}

// Interface para cliente jurídico (empresa)
export interface JuridicalClient {
  id: string
  type: "juridico"
  companyName: string
  ruc: string
  dv: string
  fiscalAddress: {
    province: string
    district: string
    corregimiento: string
    fullAddress?: string
  }
  email: string
  phone?: string
  contactName?: string
  sapCode?: string // Nuevo campo
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
      address: {
        province: "Panamá",
        district: "Panamá",
        corregimiento: "San Francisco",
        fullAddress: "Calle 50, Edificio Torre Global, Piso 15"
      },
      email: "juan.perez@email.com",
      phone: "6001-2345",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isActive: true
    },
    {
      id: "client-2",
      type: "juridico",
      companyName: "Importadora Del Mar S.A.",
      ruc: "155678901-2-2020",
      dv: "12",
      fiscalAddress: {
        province: "Panamá",
        district: "Panamá",
        corregimiento: "Bella Vista",
        fullAddress: "Avenida Balboa, Torre de las Américas, Piso 20"
      },
      email: "facturacion@importadoradelmar.com",
      phone: "507-264-5000",
      contactName: "María González",
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
      address: {
        province: "Colón",
        district: "Colón",
        corregimiento: "Cristóbal"
      },
      email: "ana.rodriguez@email.com",
      phone: "6002-3456",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isActive: true
    },
    {
      id: "client-4",
      type: "juridico",
      companyName: "Logística Total PTY",
      ruc: "8-NT-12345",
      dv: "45",
      fiscalAddress: {
        province: "Panamá",
        district: "San Miguelito",
        corregimiento: "José Domingo Espinar"
      },
      email: "admin@logisticatotal.com",
      phone: "507-236-7890",
      contactName: "Carlos Mendoza",
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
    const response = await fetch('/api/clients')
    if (!response.ok) {
      throw new Error('Error al obtener clientes')
    }
    return response.json()
  }
)

export const createClientAsync = createAsyncThunk(
  'clients/createClient',
  async (clientData: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>) => {
    const response = await fetch('/api/clients', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(clientData),
    })
    if (!response.ok) {
      throw new Error('Error al crear cliente')
    }
    return response.json()
  }
)

export const updateClientAsync = createAsyncThunk(
  'clients/updateClient',
  async ({ id, ...clientData }: Client) => {
    const response = await fetch(`/api/clients/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(clientData),
    })
    if (!response.ok) {
      throw new Error('Error al actualizar cliente')
    }
    return response.json()
  }
)

export const deleteClientAsync = createAsyncThunk(
  'clients/deleteClient',
  async (id: string) => {
    const response = await fetch(`/api/clients/${id}`, {
      method: 'DELETE',
    })
    if (!response.ok) {
      throw new Error('Error al eliminar cliente')
    }
    return { id }
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
export const selectAllClients = (state: RootState) => state.clients.clients
export const selectActiveClients = (state: RootState) => 
  state.clients.clients.filter(client => client.isActive)
export const selectNaturalClients = (state: RootState) => 
  state.clients.clients.filter(client => client.type === "natural" && client.isActive)
export const selectJuridicalClients = (state: RootState) => 
  state.clients.clients.filter(client => client.type === "juridico" && client.isActive)
export const selectClientById = (state: RootState, clientId: string) => 
  state.clients.clients.find(client => client.id === clientId)
export const selectClientsLoading = (state: RootState) => state.clients.loading
export const selectClientsError = (state: RootState) => state.clients.error