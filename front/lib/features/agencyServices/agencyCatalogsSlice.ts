import { createSlice, createAsyncThunk, type PayloadAction } from "@reduxjs/toolkit";

// Types based on backend schema
export type CatalogType = 'location' | 'nationality' | 'rank' | 'vessel' | 'transport_company' | 'driver' | 'taulia_code';

// Interface para catálogo individual
export interface AgencyCatalog {
  _id: string;
  type: CatalogType;
  name: string;
  code?: string;
  description?: string;
  isActive: boolean;
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  
  // Virtuals
  displayName?: string;
  typeLabel?: string;
}

// Interface para crear/actualizar catálogo
export interface AgencyCatalogInput {
  type: CatalogType;
  name: string;
  code?: string;
  description?: string;
  isActive?: boolean;
  metadata?: Record<string, any>;
}

// Interface para catálogos agrupados por tipo
export interface GroupedCatalogs {
  location: AgencyCatalog[];
  nationality: AgencyCatalog[];
  rank: AgencyCatalog[];
  vessel: AgencyCatalog[];
  transport_company: AgencyCatalog[];
  driver: AgencyCatalog[];
  taulia_code: AgencyCatalog[];
}

// Interface para filtros de búsqueda
export interface CatalogFilters {
  type?: CatalogType;
  isActive?: boolean;
  search?: string;
}

// Interface para parámetros de fetch
export interface FetchCatalogsParams {
  type?: CatalogType;
  filters?: CatalogFilters;
}

// Interface para respuesta paginada
export interface CatalogsResponse {
  catalogs: AgencyCatalog[];
  totalCatalogs: number;
  groupedCatalogs?: GroupedCatalogs;
  filters: CatalogFilters;
}

// Interface para actualizar catálogo
export interface UpdateCatalogParams {
  id: string;
  updateData: Partial<AgencyCatalogInput>;
}

// Interface para estadísticas de catálogos
export interface CatalogStatistics {
  totalCatalogs: number;
  catalogsByType: Record<CatalogType, number>;
  activeCatalogs: number;
  inactiveCatalogs: number;
}

// State structure
interface AgencyCatalogsState {
  // Catálogos principales
  catalogs: AgencyCatalog[];
  groupedCatalogs: GroupedCatalogs | null;
  currentCatalog: AgencyCatalog | null;
  
  // Filtros
  filters: CatalogFilters;
  totalCatalogs: number;
  
  // Estados UI
  loading: boolean;
  error: string | null;
  isCreating: boolean;
  isUpdating: boolean;
  
  // Estados de modales
  showViewModal: boolean;
  showEditModal: boolean;
  showCreateModal: boolean;
  selectedCatalogId: string | null;
  selectedCatalogType: CatalogType | null;
  
  // Estadísticas
  statistics: CatalogStatistics | null;
  statisticsLoading: boolean;
}

// Estado inicial
const initialState: AgencyCatalogsState = {
  catalogs: [],
  groupedCatalogs: null,
  currentCatalog: null,
  filters: {},
  totalCatalogs: 0,
  loading: false,
  error: null,
  isCreating: false,
  isUpdating: false,
  showViewModal: false,
  showEditModal: false,
  showCreateModal: false,
  selectedCatalogId: null,
  selectedCatalogType: null,
  statistics: null,
  statisticsLoading: false,
};

// Async thunks

// Obtener todos los catálogos
export const fetchAgencyCatalogs = createAsyncThunk(
  'agencyCatalogs/fetchAgencyCatalogs',
  async (params: FetchCatalogsParams = {}, { rejectWithValue }) => {
    try {
      const { type, filters = {} } = params;
      
      // Construir query params
      const queryParams = new URLSearchParams();
      
      if (type) {
        queryParams.append('type', type);
      }
      
      // Agregar filtros
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, value.toString());
        }
      });
      
      const response = await fetch(`/api/agency/catalogs?${queryParams}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch catalogs');
      }
      
      const data = await response.json();
      return data.data as CatalogsResponse;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

// Obtener catálogos agrupados por tipo
export const fetchGroupedCatalogs = createAsyncThunk(
  'agencyCatalogs/fetchGroupedCatalogs',
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch('/api/agency/catalogs/grouped', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch grouped catalogs');
      }
      
      const data = await response.json();
      return data.data as GroupedCatalogs;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

// Crear nuevo catálogo
export const createAgencyCatalog = createAsyncThunk(
  'agencyCatalogs/createAgencyCatalog',
  async (catalogData: AgencyCatalogInput, { rejectWithValue }) => {
    try {
      const response = await fetch('/api/agency/catalogs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(catalogData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create catalog');
      }
      
      const data = await response.json();
      return data.catalog as AgencyCatalog;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

// Actualizar catálogo
export const updateAgencyCatalog = createAsyncThunk(
  'agencyCatalogs/updateAgencyCatalog',
  async ({ id, updateData }: UpdateCatalogParams, { rejectWithValue }) => {
    try {
      const response = await fetch(`/api/agency/catalogs/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(updateData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update catalog');
      }
      
      const data = await response.json();
      return data.catalog as AgencyCatalog;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

// Eliminar catálogo (soft delete - deactivate)
export const deactivateAgencyCatalog = createAsyncThunk(
  'agencyCatalogs/deactivateAgencyCatalog',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await fetch(`/api/agency/catalogs/${id}/deactivate`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to deactivate catalog');
      }
      
      const data = await response.json();
      return data.catalog as AgencyCatalog;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

// Reactivar catálogo
export const reactivateAgencyCatalog = createAsyncThunk(
  'agencyCatalogs/reactivateAgencyCatalog',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await fetch(`/api/agency/catalogs/${id}/reactivate`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to reactivate catalog');
      }
      
      const data = await response.json();
      return data.catalog as AgencyCatalog;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

// Obtener catálogo por ID
export const fetchCatalogById = createAsyncThunk(
  'agencyCatalogs/fetchCatalogById',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await fetch(`/api/agency/catalogs/${id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch catalog');
      }
      
      const data = await response.json();
      return data.catalog as AgencyCatalog;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

// Buscar catálogos
export const searchCatalogs = createAsyncThunk(
  'agencyCatalogs/searchCatalogs',
  async (searchTerm: string, { rejectWithValue }) => {
    try {
      const response = await fetch(`/api/agency/catalogs/search?q=${encodeURIComponent(searchTerm)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to search catalogs');
      }
      
      const data = await response.json();
      return data.catalogs as AgencyCatalog[];
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

// Obtener estadísticas de catálogos
export const fetchCatalogStatistics = createAsyncThunk(
  'agencyCatalogs/fetchCatalogStatistics',
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch('/api/agency/catalogs/statistics', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch catalog statistics');
      }
      
      const data = await response.json();
      return data.data as CatalogStatistics;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

// Slice
const agencyCatalogsSlice = createSlice({
  name: 'agencyCatalogs',
  initialState,
  reducers: {
    // Gestión de catálogos
    setCatalogs: (state, action: PayloadAction<AgencyCatalog[]>) => {
      state.catalogs = action.payload;
    },
    
    setGroupedCatalogs: (state, action: PayloadAction<GroupedCatalogs>) => {
      state.groupedCatalogs = action.payload;
    },
    
    addCatalog: (state, action: PayloadAction<AgencyCatalog>) => {
      state.catalogs.unshift(action.payload);
      state.totalCatalogs += 1;
      
      // Agregar al grupo correspondiente si existe
      if (state.groupedCatalogs && state.groupedCatalogs[action.payload.type]) {
        state.groupedCatalogs[action.payload.type].push(action.payload);
        state.groupedCatalogs[action.payload.type].sort((a, b) => a.name.localeCompare(b.name));
      }
    },
    
    updateCatalog: (state, action: PayloadAction<AgencyCatalog>) => {
      const index = state.catalogs.findIndex(c => c._id === action.payload._id);
      if (index !== -1) {
        state.catalogs[index] = action.payload;
      }
      if (state.currentCatalog?._id === action.payload._id) {
        state.currentCatalog = action.payload;
      }
      
      // Actualizar en grupo correspondiente si existe
      if (state.groupedCatalogs && state.groupedCatalogs[action.payload.type]) {
        const groupIndex = state.groupedCatalogs[action.payload.type].findIndex(c => c._id === action.payload._id);
        if (groupIndex !== -1) {
          state.groupedCatalogs[action.payload.type][groupIndex] = action.payload;
        }
      }
    },
    
    removeCatalog: (state, action: PayloadAction<string>) => {
      const catalogToRemove = state.catalogs.find(c => c._id === action.payload);
      
      state.catalogs = state.catalogs.filter(c => c._id !== action.payload);
      state.totalCatalogs = Math.max(0, state.totalCatalogs - 1);
      
      if (state.currentCatalog?._id === action.payload) {
        state.currentCatalog = null;
      }
      
      // Remover del grupo correspondiente si existe
      if (catalogToRemove && state.groupedCatalogs && state.groupedCatalogs[catalogToRemove.type]) {
        state.groupedCatalogs[catalogToRemove.type] = state.groupedCatalogs[catalogToRemove.type]
          .filter(c => c._id !== action.payload);
      }
    },
    
    // Gestión del catálogo actual
    setCurrentCatalog: (state, action: PayloadAction<AgencyCatalog | null>) => {
      state.currentCatalog = action.payload;
    },
    
    clearCurrentCatalog: (state) => {
      state.currentCatalog = null;
    },
    
    // Gestión de filtros
    setFilters: (state, action: PayloadAction<CatalogFilters>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    
    clearFilters: (state) => {
      state.filters = {};
    },
    
    // Gestión de estados UI
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    
    clearError: (state) => {
      state.error = null;
    },
    
    setIsCreating: (state, action: PayloadAction<boolean>) => {
      state.isCreating = action.payload;
    },
    
    setIsUpdating: (state, action: PayloadAction<boolean>) => {
      state.isUpdating = action.payload;
    },
    
    // Gestión de modales
    openViewModal: (state, action: PayloadAction<string>) => {
      state.showViewModal = true;
      state.selectedCatalogId = action.payload;
    },
    
    openEditModal: (state, action: PayloadAction<string>) => {
      state.showEditModal = true;
      state.selectedCatalogId = action.payload;
    },
    
    openCreateModal: (state, action: PayloadAction<CatalogType>) => {
      state.showCreateModal = true;
      state.selectedCatalogType = action.payload;
    },
    
    closeModals: (state) => {
      state.showViewModal = false;
      state.showEditModal = false;
      state.showCreateModal = false;
      state.selectedCatalogId = null;
      state.selectedCatalogType = null;
    },
    
    setSelectedCatalog: (state, action: PayloadAction<string | null>) => {
      state.selectedCatalogId = action.payload;
    },
    
    setSelectedCatalogType: (state, action: PayloadAction<CatalogType | null>) => {
      state.selectedCatalogType = action.payload;
    },
  },
  
  extraReducers: (builder) => {
    // Fetch catalogs
    builder
      .addCase(fetchAgencyCatalogs.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAgencyCatalogs.fulfilled, (state, action) => {
        state.loading = false;
        state.catalogs = action.payload.catalogs;
        state.totalCatalogs = action.payload.totalCatalogs;
        state.filters = action.payload.filters;
        if (action.payload.groupedCatalogs) {
          state.groupedCatalogs = action.payload.groupedCatalogs;
        }
      })
      .addCase(fetchAgencyCatalogs.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Fetch grouped catalogs
      .addCase(fetchGroupedCatalogs.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchGroupedCatalogs.fulfilled, (state, action) => {
        state.loading = false;
        state.groupedCatalogs = action.payload;
        // Flatten para obtener todos los catálogos
        const allCatalogs: AgencyCatalog[] = [];
        Object.values(action.payload).forEach(catalogs => {
          allCatalogs.push(...catalogs);
        });
        state.catalogs = allCatalogs;
        state.totalCatalogs = allCatalogs.length;
      })
      .addCase(fetchGroupedCatalogs.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Create catalog
      .addCase(createAgencyCatalog.pending, (state) => {
        state.isCreating = true;
        state.error = null;
      })
      .addCase(createAgencyCatalog.fulfilled, (state, action) => {
        state.isCreating = false;
        state.catalogs.unshift(action.payload);
        state.totalCatalogs += 1;
        
        // Agregar al grupo correspondiente si existe
        if (state.groupedCatalogs && state.groupedCatalogs[action.payload.type]) {
          state.groupedCatalogs[action.payload.type].push(action.payload);
          state.groupedCatalogs[action.payload.type].sort((a, b) => a.name.localeCompare(b.name));
        }
      })
      .addCase(createAgencyCatalog.rejected, (state, action) => {
        state.isCreating = false;
        state.error = action.payload as string;
      })
      
      // Update catalog
      .addCase(updateAgencyCatalog.pending, (state) => {
        state.isUpdating = true;
        state.error = null;
      })
      .addCase(updateAgencyCatalog.fulfilled, (state, action) => {
        state.isUpdating = false;
        const index = state.catalogs.findIndex(c => c._id === action.payload._id);
        if (index !== -1) {
          state.catalogs[index] = action.payload;
        }
        if (state.currentCatalog?._id === action.payload._id) {
          state.currentCatalog = action.payload;
        }
        
        // Actualizar en grupo correspondiente si existe
        if (state.groupedCatalogs && state.groupedCatalogs[action.payload.type]) {
          const groupIndex = state.groupedCatalogs[action.payload.type].findIndex(c => c._id === action.payload._id);
          if (groupIndex !== -1) {
            state.groupedCatalogs[action.payload.type][groupIndex] = action.payload;
          }
        }
      })
      .addCase(updateAgencyCatalog.rejected, (state, action) => {
        state.isUpdating = false;
        state.error = action.payload as string;
      })
      
      // Deactivate catalog
      .addCase(deactivateAgencyCatalog.pending, (state) => {
        state.isUpdating = true;
        state.error = null;
      })
      .addCase(deactivateAgencyCatalog.fulfilled, (state, action) => {
        state.isUpdating = false;
        const index = state.catalogs.findIndex(c => c._id === action.payload._id);
        if (index !== -1) {
          state.catalogs[index] = action.payload;
        }
        if (state.currentCatalog?._id === action.payload._id) {
          state.currentCatalog = action.payload;
        }
        
        // Actualizar en grupo correspondiente si existe
        if (state.groupedCatalogs && state.groupedCatalogs[action.payload.type]) {
          const groupIndex = state.groupedCatalogs[action.payload.type].findIndex(c => c._id === action.payload._id);
          if (groupIndex !== -1) {
            state.groupedCatalogs[action.payload.type][groupIndex] = action.payload;
          }
        }
      })
      .addCase(deactivateAgencyCatalog.rejected, (state, action) => {
        state.isUpdating = false;
        state.error = action.payload as string;
      })
      
      // Reactivate catalog
      .addCase(reactivateAgencyCatalog.pending, (state) => {
        state.isUpdating = true;
        state.error = null;
      })
      .addCase(reactivateAgencyCatalog.fulfilled, (state, action) => {
        state.isUpdating = false;
        const index = state.catalogs.findIndex(c => c._id === action.payload._id);
        if (index !== -1) {
          state.catalogs[index] = action.payload;
        }
        if (state.currentCatalog?._id === action.payload._id) {
          state.currentCatalog = action.payload;
        }
        
        // Actualizar en grupo correspondiente si existe
        if (state.groupedCatalogs && state.groupedCatalogs[action.payload.type]) {
          const groupIndex = state.groupedCatalogs[action.payload.type].findIndex(c => c._id === action.payload._id);
          if (groupIndex !== -1) {
            state.groupedCatalogs[action.payload.type][groupIndex] = action.payload;
          }
        }
      })
      .addCase(reactivateAgencyCatalog.rejected, (state, action) => {
        state.isUpdating = false;
        state.error = action.payload as string;
      })
      
      // Fetch catalog by ID
      .addCase(fetchCatalogById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCatalogById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentCatalog = action.payload;
      })
      .addCase(fetchCatalogById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Search catalogs
      .addCase(searchCatalogs.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(searchCatalogs.fulfilled, (state, action) => {
        state.loading = false;
        state.catalogs = action.payload;
        state.totalCatalogs = action.payload.length;
      })
      .addCase(searchCatalogs.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Fetch statistics
      .addCase(fetchCatalogStatistics.pending, (state) => {
        state.statisticsLoading = true;
        state.error = null;
      })
      .addCase(fetchCatalogStatistics.fulfilled, (state, action) => {
        state.statisticsLoading = false;
        state.statistics = action.payload;
      })
      .addCase(fetchCatalogStatistics.rejected, (state, action) => {
        state.statisticsLoading = false;
        state.error = action.payload as string;
      });
  },
});

// Export actions
export const {
  setCatalogs,
  setGroupedCatalogs,
  addCatalog,
  updateCatalog,
  removeCatalog,
  setCurrentCatalog,
  clearCurrentCatalog,
  setFilters,
  clearFilters,
  setLoading,
  setError,
  clearError,
  setIsCreating,
  setIsUpdating,
  openViewModal,
  openEditModal,
  openCreateModal,
  closeModals,
  setSelectedCatalog,
  setSelectedCatalogType,
} = agencyCatalogsSlice.actions;

// Selectors
export const selectAgencyCatalogs = (state: { agencyCatalogs: AgencyCatalogsState }) => 
  state.agencyCatalogs?.catalogs || [];

export const selectGroupedCatalogs = (state: { agencyCatalogs: AgencyCatalogsState }) => 
  state.agencyCatalogs?.groupedCatalogs || null;

export const selectCurrentCatalog = (state: { agencyCatalogs: AgencyCatalogsState }) => 
  state.agencyCatalogs?.currentCatalog || null;

export const selectCatalogFilters = (state: { agencyCatalogs: AgencyCatalogsState }) => 
  state.agencyCatalogs?.filters || {};

export const selectCatalogsLoading = (state: { agencyCatalogs: AgencyCatalogsState }) => 
  state.agencyCatalogs?.loading || false;

export const selectCatalogsError = (state: { agencyCatalogs: AgencyCatalogsState }) => 
  state.agencyCatalogs?.error || null;

export const selectIsCreatingCatalog = (state: { agencyCatalogs: AgencyCatalogsState }) => 
  state.agencyCatalogs?.isCreating || false;

export const selectIsUpdatingCatalog = (state: { agencyCatalogs: AgencyCatalogsState }) => 
  state.agencyCatalogs?.isUpdating || false;

export const selectTotalCatalogs = (state: { agencyCatalogs: AgencyCatalogsState }) => 
  state.agencyCatalogs?.totalCatalogs || 0;

export const selectCatalogStatistics = (state: { agencyCatalogs: AgencyCatalogsState }) => 
  state.agencyCatalogs?.statistics || null;

export const selectCatalogModals = (state: { agencyCatalogs: AgencyCatalogsState }) => ({
  showViewModal: state.agencyCatalogs?.showViewModal || false,
  showEditModal: state.agencyCatalogs?.showEditModal || false,
  showCreateModal: state.agencyCatalogs?.showCreateModal || false,
  selectedCatalogId: state.agencyCatalogs?.selectedCatalogId || null,
  selectedCatalogType: state.agencyCatalogs?.selectedCatalogType || null,
});

// Helper selectors

// Obtener catálogos activos por tipo
export const selectActiveCatalogsByType = (type: CatalogType) => 
  (state: { agencyCatalogs: AgencyCatalogsState }) => {
    const grouped = state.agencyCatalogs?.groupedCatalogs;
    if (!grouped) return [];
    
    return grouped[type]?.filter(catalog => catalog.isActive) || [];
  };

// Obtener catálogos activos de ubicaciones
export const selectActiveLocations = selectActiveCatalogsByType('location');

// Obtener catálogos activos de nacionalidades
export const selectActiveNationalities = selectActiveCatalogsByType('nationality');

// Obtener catálogos activos de rangos
export const selectActiveRanks = selectActiveCatalogsByType('rank');

// Obtener catálogos activos de buques
export const selectActiveVessels = selectActiveCatalogsByType('vessel');

// Obtener catálogos activos de empresas de transporte
export const selectActiveTransportCompanies = selectActiveCatalogsByType('transport_company');

// Obtener catálogos activos de conductores
export const selectActiveDrivers = selectActiveCatalogsByType('driver');

// Obtener códigos Taulia activos
export const selectActiveTauliaCodes = selectActiveCatalogsByType('taulia_code');

// Buscar catálogo por tipo y nombre
export const selectCatalogByTypeAndName = (type: CatalogType, name: string) => 
  (state: { agencyCatalogs: AgencyCatalogsState }) => {
    const catalogs = state.agencyCatalogs?.catalogs || [];
    return catalogs.find(catalog => 
      catalog.type === type && 
      catalog.name.toLowerCase() === name.toLowerCase() &&
      catalog.isActive
    ) || null;
  };

// Export reducer
export default agencyCatalogsSlice.reducer;