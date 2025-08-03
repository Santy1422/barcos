import { createSlice, createAsyncThunk, type PayloadAction } from "@reduxjs/toolkit"

// Interface para clientes reales
export interface RealClient {
  _id: string
  type: 'natural' | 'juridico'
  fullName?: string
  companyName?: string
  sapCode: string
  email: string
  phone?: string
  isActive: boolean
}

// Interface para rutas locales de PTYSS
export interface PTYSSLocalRoute {
  _id: string
  clientName: string
  realClientId?: RealClient | string // Puede ser objeto poblado o string ID
  from: string
  to: string
  priceRegular: number // Precio para contenedores DV/HC (Dry Van/High Cube)
  priceReefer: number  // Precio para contenedores RE (Reefer/Refrigerado)
  price?: number       // Campo legacy para compatibilidad hacia atrás
  createdAt: string
  updatedAt: string
}

// Interface para crear/actualizar rutas locales (sin _id y timestamps)
export interface PTYSSLocalRouteInput {
  clientName: string
  realClientId?: string
  from: string
  to: string
  priceRegular: number // Precio para contenedores DV/HC (Dry Van/High Cube)
  priceReefer: number  // Precio para contenedores RE (Reefer/Refrigerado)
  price?: number       // Campo legacy para compatibilidad hacia atrás
}

// Interface para asociar cliente real a esquema de rutas
export interface AssociateClientInput {
  clientName: string
  realClientId: string
}

// Interface para desasociar cliente de esquema de rutas
export interface DisassociateClientInput {
  clientName: string
}

// Interface para crear nuevo esquema
export interface CreateSchemaInput {
  schemaName: string
}

// Interface para resumen de esquemas
export interface SchemaSummary {
  schemaName: string
  routeCount: number
  isAssociated: boolean
  associatedClient?: RealClient | null
  createdAt: string
  updatedAt: string
}

// Interface para respuesta de resumen
export interface SchemaSummaryResponse {
  schemas: SchemaSummary[]
  totalSchemas: number
  totalRoutes: number
  associatedSchemas: number
}

// State structure
interface PTYSSLocalRoutesState {
  routes: PTYSSLocalRoute[]
  schemaSummary: SchemaSummaryResponse | null
  loading: boolean
  error: string | null
}

// Initial state
const initialState: PTYSSLocalRoutesState = {
  routes: [],
  schemaSummary: null,
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

export const fetchSchemaSummary = createAsyncThunk(
  'ptyssLocalRoutes/fetchSchemaSummary',
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch('/api/ptyss-local-routes/schemas/summary', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.payload?.message || errorData.message || 'Error al obtener resumen de esquemas')
      }

      const data = await response.json()
      return data.payload.data
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Error desconocido')
    }
  }
)

export const createRouteSchema = createAsyncThunk(
  'ptyssLocalRoutes/createRouteSchema',
  async (schemaData: CreateSchemaInput, { rejectWithValue }) => {
    try {
      const response = await fetch('/api/ptyss-local-routes/schemas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(schemaData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.payload?.message || errorData.message || 'Error al crear esquema de rutas')
      }

      const data = await response.json()
      return data.payload.data
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Error desconocido')
    }
  }
)

export const deleteRouteSchema = createAsyncThunk(
  'ptyssLocalRoutes/deleteRouteSchema',
  async (schemaName: string, { rejectWithValue }) => {
    try {
      const response = await fetch(`/api/ptyss-local-routes/schemas/${encodeURIComponent(schemaName)}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.payload?.message || errorData.message || 'Error al eliminar esquema de rutas')
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

// Thunk para asociar cliente real a esquema de rutas
export const associateClientToRouteSet = createAsyncThunk(
  'ptyssLocalRoutes/associateClientToRouteSet',
  async (associationData: AssociateClientInput, { rejectWithValue }) => {
    try {
      const response = await fetch('/api/ptyss-local-routes/associate-client', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(associationData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.payload?.message || errorData.message || 'Error al asociar cliente a esquema de rutas')
      }

      const data = await response.json()
      return data.payload.data
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Error desconocido')
    }
  }
)

// Thunk para desasociar cliente de esquema de rutas
export const disassociateClientFromRouteSet = createAsyncThunk(
  'ptyssLocalRoutes/disassociateClientFromRouteSet',
  async (disassociationData: DisassociateClientInput, { rejectWithValue }) => {
    try {
      const response = await fetch('/api/ptyss-local-routes/disassociate-client', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(disassociationData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.payload?.message || errorData.message || 'Error al desasociar cliente de esquema de rutas')
      }

      const data = await response.json()
      return data.payload.data
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

    // Fetch schema summary
    builder
      .addCase(fetchSchemaSummary.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchSchemaSummary.fulfilled, (state, action) => {
        state.loading = false
        state.schemaSummary = action.payload
      })
      .addCase(fetchSchemaSummary.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })

    // Create schema
    builder
      .addCase(createRouteSchema.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(createRouteSchema.fulfilled, (state, action) => {
        state.loading = false
        // Agregar el nuevo esquema al resumen, inicializando si no existe
        if (!state.schemaSummary) {
          state.schemaSummary = {
            schemas: [],
            totalSchemas: 0,
            totalRoutes: 0,
            associatedSchemas: 0
          }
        }

        const newSchema: SchemaSummary = {
          schemaName: action.payload.schemaName,
          routeCount: 0,
          isAssociated: false,
          associatedClient: null,
          createdAt: action.payload.createdAt,
          updatedAt: action.payload.createdAt
        }
        state.schemaSummary.schemas.push(newSchema)
        state.schemaSummary.totalSchemas += 1
        state.schemaSummary.schemas.sort((a, b) => a.schemaName.localeCompare(b.schemaName))
      })
      .addCase(createRouteSchema.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })

    // Delete schema
    builder
      .addCase(deleteRouteSchema.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(deleteRouteSchema.fulfilled, (state, action) => {
        state.loading = false
        const deletedSchemaName = action.payload.schemaName
        
        // Remover del resumen
        if (state.schemaSummary) {
          const schemaIndex = state.schemaSummary.schemas.findIndex(s => s.schemaName === deletedSchemaName)
          if (schemaIndex !== -1) {
            const deletedSchema = state.schemaSummary.schemas[schemaIndex]
            state.schemaSummary.schemas.splice(schemaIndex, 1)
            state.schemaSummary.totalSchemas -= 1
            state.schemaSummary.totalRoutes -= deletedSchema.routeCount
            if (deletedSchema.isAssociated) {
              state.schemaSummary.associatedSchemas -= 1
            }
          }
        }
        
        // Remover rutas del estado
        state.routes = state.routes.filter(route => route.clientName !== deletedSchemaName)
      })
      .addCase(deleteRouteSchema.rejected, (state, action) => {
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
        
        // Actualizar resumen si existe
        if (state.schemaSummary) {
          const schema = state.schemaSummary.schemas.find(s => s.schemaName === action.payload.clientName)
          if (schema) {
            schema.routeCount += 1
            state.schemaSummary.totalRoutes += 1
          }
        }
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
        const deletedRouteId = action.payload
        const deletedRoute = state.routes.find(route => route._id === deletedRouteId)
        
        state.routes = state.routes.filter(route => route._id !== deletedRouteId)
        
        // Actualizar resumen si existe
        if (state.schemaSummary && deletedRoute) {
          const schema = state.schemaSummary.schemas.find(s => s.schemaName === deletedRoute.clientName)
          if (schema) {
            schema.routeCount -= 1
            state.schemaSummary.totalRoutes -= 1
          }
        }
      })
      .addCase(deletePTYSSLocalRoute.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
    
    // Associate client to route set
    builder
      .addCase(associateClientToRouteSet.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(associateClientToRouteSet.fulfilled, (state, action) => {
        state.loading = false
        // Actualizar las rutas del esquema con la nueva asociación
        const { routes: updatedRoutes } = action.payload
        updatedRoutes.forEach((updatedRoute: PTYSSLocalRoute) => {
          const index = state.routes.findIndex(route => route._id === updatedRoute._id)
          if (index !== -1) {
            state.routes[index] = updatedRoute
          }
        })
        
        // Actualizar resumen si existe
        if (state.schemaSummary) {
          const schema = state.schemaSummary.schemas.find(s => s.schemaName === action.payload.clientName)
          if (schema) {
            schema.isAssociated = true
            schema.associatedClient = action.payload.realClient
            state.schemaSummary.associatedSchemas += 1
          }
        }
      })
      .addCase(associateClientToRouteSet.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })

    // Disassociate client from route set
    builder
      .addCase(disassociateClientFromRouteSet.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(disassociateClientFromRouteSet.fulfilled, (state, action) => {
        state.loading = false
        // Actualizar las rutas del esquema eliminando la asociación
        const { routes: updatedRoutes } = action.payload
        updatedRoutes.forEach((updatedRoute: PTYSSLocalRoute) => {
          const index = state.routes.findIndex(route => route._id === updatedRoute._id)
          if (index !== -1) {
            state.routes[index] = updatedRoute
          }
        })
        
        // Actualizar resumen si existe
        if (state.schemaSummary) {
          const schema = state.schemaSummary.schemas.find(s => s.schemaName === action.payload.clientName)
          if (schema) {
            schema.isAssociated = false
            schema.associatedClient = null
            state.schemaSummary.associatedSchemas -= 1
          }
        }
      })
      .addCase(disassociateClientFromRouteSet.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
  }
})

// Selectors
export const selectPTYSSLocalRoutes = (state: { ptyssLocalRoutes: PTYSSLocalRoutesState }) => 
  state.ptyssLocalRoutes?.routes || []

export const selectSchemaSummary = (state: { ptyssLocalRoutes: PTYSSLocalRoutesState }) => 
  state.ptyssLocalRoutes?.schemaSummary || null

export const selectPTYSSLocalRoutesLoading = (state: { ptyssLocalRoutes: PTYSSLocalRoutesState }) => 
  state.ptyssLocalRoutes?.loading || false

export const selectPTYSSLocalRoutesError = (state: { ptyssLocalRoutes: PTYSSLocalRoutesState }) => 
  state.ptyssLocalRoutes?.error || null

// Helper function to group routes by client (excluding placeholders)
export const selectPTYSSLocalRoutesByClient = (state: { ptyssLocalRoutes: PTYSSLocalRoutesState }) => {
  const routes = state.ptyssLocalRoutes?.routes || []
  
  // Filtrar rutas placeholder
  const realRoutes = routes.filter(route => 
    route.from !== '__PLACEHOLDER__' && route.to !== '__PLACEHOLDER__'
  )
  
  const grouped = realRoutes.reduce((acc, route) => {
    if (!acc[route.clientName]) {
      acc[route.clientName] = []
    }
    acc[route.clientName].push(route)
    return acc
  }, {} as Record<string, PTYSSLocalRoute[]>)
  
  return grouped
}

// Helper function to get real client name
export const getRealClientName = (client: RealClient): string => {
  return client.type === 'natural' ? (client.fullName || '') : (client.companyName || '')
}

// Selector to get client associations
export const selectClientAssociations = (state: { ptyssLocalRoutes: PTYSSLocalRoutesState }) => {
  const routes = state.ptyssLocalRoutes?.routes || []
  const associations: Record<string, RealClient | null> = {}
  
  // Agrupar por clientName y obtener el cliente real asociado (si existe)
  routes.forEach(route => {
    if (route.realClientId && typeof route.realClientId === 'object') {
      associations[route.clientName] = route.realClientId as RealClient
    } else if (!associations[route.clientName]) {
      associations[route.clientName] = null
    }
  })
  
  return associations
}

// Selector to get unique schema names from routes
export const selectUniqueSchemaNames = (state: { ptyssLocalRoutes: PTYSSLocalRoutesState }) => {
  const routes = state.ptyssLocalRoutes?.routes || []
  return [...new Set(routes.map(route => route.clientName))].sort()
}

// Selector to get all available schema names (from both summary and routes)
export const selectAllAvailableSchemas = (state: { ptyssLocalRoutes: PTYSSLocalRoutesState }) => {
  const routeSchemas = state.ptyssLocalRoutes?.routes?.map(route => route.clientName) || []
  const summarySchemas = state.ptyssLocalRoutes?.schemaSummary?.schemas?.map(schema => schema.schemaName) || []
  
  // Combinar ambos y eliminar duplicados
  const allSchemas = [...new Set([...routeSchemas, ...summarySchemas])]
  return allSchemas.sort()
}

export const { clearError } = ptyssLocalRoutesSlice.actions
export default ptyssLocalRoutesSlice.reducer 