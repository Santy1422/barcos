import { createSlice, createAsyncThunk, type PayloadAction } from "@reduxjs/toolkit";
import { createApiUrl } from '@/lib/api-config';

// Types
export type RouteType = 'single' | 'roundtrip' | 'internal' | 'bags_claim' | 'documentation' | 'no_show';

export interface PassengerPriceRange {
  minPassengers: number;
  maxPassengers: number;
  price: number;
  description?: string;
}

export interface RoutePricing {
  routeType: RouteType;
  passengerRanges: PassengerPriceRange[];
}

export interface AgencyRoute {
  _id: string;
  name: string;
  pickupSiteType: string;  // Ahora usa site types en lugar de locations
  dropoffSiteType: string; // Ahora usa site types en lugar de locations
  pickupSiteTypeId?: string;
  dropoffSiteTypeId?: string;
  // Mantener para compatibilidad
  pickupLocation?: string;
  dropoffLocation?: string;
  pickupLocationId?: string;
  dropoffLocationId?: string;
  pricing: RoutePricing[];
  currency: string;
  waitingTimeRate?: number;
  extraPassengerRate?: number;
  description?: string;
  notes?: string;
  distance?: number;
  estimatedDuration?: number;
  isActive: boolean;
  createdBy?: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AgencyRouteInput {
  pickupSiteType: string;  // Ahora usa site types
  dropoffSiteType: string; // Ahora usa site types
  pricing: RoutePricing[];
  currency?: string;
  waitingTimeRate?: number;
  extraPassengerRate?: number;
  description?: string;
  notes?: string;
  distance?: number;
  estimatedDuration?: number;
}

export interface RouteFilters {
  isActive?: boolean;
  pickupSiteType?: string;
  dropoffSiteType?: string;
  pickupLocation?: string;  // Mantener para compatibilidad
  dropoffLocation?: string; // Mantener para compatibilidad
  search?: string;
}

export interface FetchRoutesParams {
  filters?: RouteFilters;
  page?: number;
  limit?: number;
}

export interface RoutesResponse {
  routes: AgencyRoute[];
  totalRoutes: number;
  currentPage: number;
  totalPages: number;
  filters: RouteFilters;
}

export interface UpdateRouteParams {
  id: string;
  updateData: Partial<AgencyRouteInput>;
}

export interface CalculatePriceParams {
  pickupLocation: string;  // Esto se mantiene porque el servicio usa locations
  dropoffLocation: string; // Esto se mantiene porque el servicio usa locations
  routeType: RouteType;
  passengerCount: number;
  waitingTimeHours?: number;
}

export interface PriceCalculationResult {
  found: boolean;
  price: number | null;
  breakdown?: {
    basePrice: number;
    waitingTime: number;
    extraPassengers: number;
    total: number;
  };
  route?: {
    id: string;
    name: string;
    pickupSiteType: string;
    dropoffSiteType: string;
    pickupLocation?: string;  // Para compatibilidad
    dropoffLocation?: string; // Para compatibilidad
    currency: string;
  };
  calculation?: {
    routeType: RouteType;
    passengerCount: number;
    waitingTimeHours: number;
  };
}

export interface RouteStatistics {
  totalRoutes: number;
  activeRoutes: number;
  inactiveRoutes: number;
  routesWithRoundtrip: number;
  routesWithSingle: number;
}

// State structure
interface AgencyRoutesState {
  routes: AgencyRoute[];
  currentRoute: AgencyRoute | null;
  filters: RouteFilters;
  totalRoutes: number;
  currentPage: number;
  totalPages: number;
  loading: boolean;
  error: string | null;
  isCreating: boolean;
  isUpdating: boolean;
  showViewModal: boolean;
  showEditModal: boolean;
  showCreateModal: boolean;
  selectedRouteId: string | null;
  statistics: RouteStatistics | null;
  statisticsLoading: boolean;
  priceCalculation: PriceCalculationResult | null;
  priceCalculationLoading: boolean;
}

const initialState: AgencyRoutesState = {
  routes: [],
  currentRoute: null,
  filters: {},
  totalRoutes: 0,
  currentPage: 1,
  totalPages: 1,
  loading: false,
  error: null,
  isCreating: false,
  isUpdating: false,
  showViewModal: false,
  showEditModal: false,
  showCreateModal: false,
  selectedRouteId: null,
  statistics: null,
  statisticsLoading: false,
  priceCalculation: null,
  priceCalculationLoading: false,
};

// Async thunks

// Fetch all routes
export const fetchAgencyRoutes = createAsyncThunk(
  'agencyRoutes/fetchAgencyRoutes',
  async (params: FetchRoutesParams = {}, { rejectWithValue }) => {
    try {
      const { filters = {}, page = 1, limit = 50 } = params;
      
      const queryParams = new URLSearchParams();
      queryParams.append('page', page.toString());
      queryParams.append('limit', limit.toString());
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, value.toString());
        }
      });
      
      const response = await fetch(createApiUrl(`/api/agency/routes?${queryParams}`), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch routes');
      }
      
      const data = await response.json();
      return data.payload as RoutesResponse;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

// Fetch active routes
export const fetchActiveRoutes = createAsyncThunk(
  'agencyRoutes/fetchActiveRoutes',
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch(createApiUrl('/api/agency/routes/active'), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch active routes');
      }
      
      const data = await response.json();
      return data.payload.routes as AgencyRoute[];
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

// Fetch route by ID
export const fetchRouteById = createAsyncThunk(
  'agencyRoutes/fetchRouteById',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await fetch(createApiUrl(`/api/agency/routes/${id}`), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch route');
      }
      
      const data = await response.json();
      return data.payload.route as AgencyRoute;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

// Create route
export const createAgencyRoute = createAsyncThunk(
  'agencyRoutes/createAgencyRoute',
  async (routeData: AgencyRouteInput, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      console.log('🔧 [REDUX] Token exists:', !!token);
      console.log('🔧 [REDUX] Token length:', token?.length);
      
      const response = await fetch(createApiUrl('/api/agency/routes'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(routeData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create route');
      }
      
      const data = await response.json();
      return data.payload.route as AgencyRoute;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

// Update route
export const updateAgencyRoute = createAsyncThunk(
  'agencyRoutes/updateAgencyRoute',
  async ({ id, updateData }: UpdateRouteParams, { rejectWithValue }) => {
    try {
      const response = await fetch(createApiUrl(`/api/agency/routes/${id}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(updateData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update route');
      }
      
      const data = await response.json();
      return data.payload.route as AgencyRoute;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

// Deactivate route
export const deactivateAgencyRoute = createAsyncThunk(
  'agencyRoutes/deactivateAgencyRoute',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await fetch(createApiUrl(`/api/agency/routes/${id}/deactivate`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to deactivate route');
      }
      
      const data = await response.json();
      return data.payload.route as AgencyRoute;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

// Reactivate route
export const reactivateAgencyRoute = createAsyncThunk(
  'agencyRoutes/reactivateAgencyRoute',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await fetch(createApiUrl(`/api/agency/routes/${id}/reactivate`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to reactivate route');
      }
      
      const data = await response.json();
      return data.payload.route as AgencyRoute;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

// Delete route (permanent deletion)
export const deleteAgencyRoute = createAsyncThunk(
  'agencyRoutes/deleteAgencyRoute',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await fetch(createApiUrl(`/api/agency/routes/${id}`), {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete route');
      }
      
      return id; // Return the ID of the deleted route
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

// Calculate price
export const calculateRoutePrice = createAsyncThunk(
  'agencyRoutes/calculateRoutePrice',
  async (params: CalculatePriceParams, { rejectWithValue }) => {
    try {
      const response = await fetch(createApiUrl('/api/agency/routes/calculate-price'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(params)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to calculate price');
      }
      
      const data = await response.json();
      return data.payload as PriceCalculationResult;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

// Fetch statistics
export const fetchRouteStatistics = createAsyncThunk(
  'agencyRoutes/fetchRouteStatistics',
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch(createApiUrl('/api/agency/routes/statistics'), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch statistics');
      }
      
      const data = await response.json();
      return data.payload.statistics as RouteStatistics;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

// Slice
const agencyRoutesSlice = createSlice({
  name: 'agencyRoutes',
  initialState,
  reducers: {
    setRoutes: (state, action: PayloadAction<AgencyRoute[]>) => {
      state.routes = action.payload;
    },
    setCurrentRoute: (state, action: PayloadAction<AgencyRoute | null>) => {
      state.currentRoute = action.payload;
    },
    clearCurrentRoute: (state) => {
      state.currentRoute = null;
    },
    setFilters: (state, action: PayloadAction<RouteFilters>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearFilters: (state) => {
      state.filters = {};
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    openViewModal: (state, action: PayloadAction<string>) => {
      state.showViewModal = true;
      state.selectedRouteId = action.payload;
    },
    openEditModal: (state, action: PayloadAction<string>) => {
      state.showEditModal = true;
      state.selectedRouteId = action.payload;
    },
    openCreateModal: (state) => {
      state.showCreateModal = true;
    },
    closeModals: (state) => {
      state.showViewModal = false;
      state.showEditModal = false;
      state.showCreateModal = false;
      state.selectedRouteId = null;
    },
    clearPriceCalculation: (state) => {
      state.priceCalculation = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch routes
      .addCase(fetchAgencyRoutes.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAgencyRoutes.fulfilled, (state, action) => {
        state.loading = false;
        state.routes = action.payload.routes;
        state.totalRoutes = action.payload.totalRoutes;
        state.currentPage = action.payload.currentPage;
        state.totalPages = action.payload.totalPages;
        state.filters = action.payload.filters;
      })
      .addCase(fetchAgencyRoutes.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Fetch active routes
      .addCase(fetchActiveRoutes.fulfilled, (state, action) => {
        state.routes = action.payload;
      })
      
      // Fetch route by ID
      .addCase(fetchRouteById.fulfilled, (state, action) => {
        state.currentRoute = action.payload;
      })
      
      // Create route
      .addCase(createAgencyRoute.pending, (state) => {
        state.isCreating = true;
        state.error = null;
      })
      .addCase(createAgencyRoute.fulfilled, (state, action) => {
        state.isCreating = false;
        state.routes.unshift(action.payload);
        state.totalRoutes += 1;
      })
      .addCase(createAgencyRoute.rejected, (state, action) => {
        state.isCreating = false;
        state.error = action.payload as string;
      })
      
      // Update route
      .addCase(updateAgencyRoute.pending, (state) => {
        state.isUpdating = true;
        state.error = null;
      })
      .addCase(updateAgencyRoute.fulfilled, (state, action) => {
        state.isUpdating = false;
        const index = state.routes.findIndex(r => r._id === action.payload._id);
        if (index !== -1) {
          state.routes[index] = action.payload;
        }
        if (state.currentRoute?._id === action.payload._id) {
          state.currentRoute = action.payload;
        }
      })
      .addCase(updateAgencyRoute.rejected, (state, action) => {
        state.isUpdating = false;
        state.error = action.payload as string;
      })
      
      // Deactivate route
      .addCase(deactivateAgencyRoute.fulfilled, (state, action) => {
        const index = state.routes.findIndex(r => r._id === action.payload._id);
        if (index !== -1) {
          state.routes[index] = action.payload;
        }
      })
      
      // Reactivate route
      .addCase(reactivateAgencyRoute.fulfilled, (state, action) => {
        const index = state.routes.findIndex(r => r._id === action.payload._id);
        if (index !== -1) {
          state.routes[index] = action.payload;
        }
      })
      
      // Delete route
      .addCase(deleteAgencyRoute.fulfilled, (state, action) => {
        state.routes = state.routes.filter(r => r._id !== action.payload);
        state.totalRoutes = Math.max(0, state.totalRoutes - 1);
        if (state.currentRoute?._id === action.payload) {
          state.currentRoute = null;
        }
      })
      
      // Calculate price
      .addCase(calculateRoutePrice.pending, (state) => {
        state.priceCalculationLoading = true;
      })
      .addCase(calculateRoutePrice.fulfilled, (state, action) => {
        state.priceCalculationLoading = false;
        state.priceCalculation = action.payload;
      })
      .addCase(calculateRoutePrice.rejected, (state, action) => {
        state.priceCalculationLoading = false;
        state.error = action.payload as string;
      })
      
      // Fetch statistics
      .addCase(fetchRouteStatistics.pending, (state) => {
        state.statisticsLoading = true;
      })
      .addCase(fetchRouteStatistics.fulfilled, (state, action) => {
        state.statisticsLoading = false;
        state.statistics = action.payload;
      })
      .addCase(fetchRouteStatistics.rejected, (state, action) => {
        state.statisticsLoading = false;
        state.error = action.payload as string;
      });
  },
});

// Export actions
export const {
  setRoutes,
  setCurrentRoute,
  clearCurrentRoute,
  setFilters,
  clearFilters,
  setError,
  clearError,
  openViewModal,
  openEditModal,
  openCreateModal,
  closeModals,
  clearPriceCalculation,
} = agencyRoutesSlice.actions;

// Export reducer
export default agencyRoutesSlice.reducer;

