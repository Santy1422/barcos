import { createSlice, type PayloadAction } from "@reduxjs/toolkit"
import type { RootState } from "@/lib/store"

// Tipos de cliente
export type ClientType = "natural" | "juridico"
export type DocumentType = "cedula" | "pasaporte" | "ruc"

// Interface para cliente natural (persona)
export interface NaturalClient {
  id: string
  type: "natural"
  fullName: string // Nombre completo (nombres y apellidos)
  documentType: "cedula" | "pasaporte" // Tipo de documento
  documentNumber: string // Cédula o pasaporte
  address: {
    province: string // Provincia
    district: string // Distrito
    corregimiento: string // Corregimiento
    fullAddress?: string // Dirección completa opcional
  }
  email?: string // Correo electrónico (opcional)
  phone?: string // Teléfono (opcional)
  createdAt: string
  updatedAt: string
  isActive: boolean
}

// Interface para cliente jurídico (empresa)
export interface JuridicalClient {
  id: string
  type: "juridico"
  companyName: string // Nombre de la empresa (razón social)
  ruc: string // RUC (Registro Único del Contribuyente)
  dv: string // DV (Dígito Verificador)
  fiscalAddress: {
    province: string // Provincia
    district: string // Distrito
    corregimiento: string // Corregimiento
    fullAddress?: string // Dirección fiscal completa opcional
  }
  email: string // Correo electrónico (requerido para factura electrónica)
  phone?: string // Teléfono (opcional)
  contactName?: string // Nombre de contacto (opcional)
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