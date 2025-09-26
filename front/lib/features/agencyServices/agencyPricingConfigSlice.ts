import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { createApiUrl } from '@/lib/api-config';

// Tipos
export interface DistanceRate {
  minKm: number;
  maxKm: number;
  ratePerKm: number;
  fixedPrice?: number;
}

export interface ServiceAdjustment {
  type: 'percentage' | 'fixed';
  value: number;
}

export interface CustomCharge {
  name: string;
  description?: string;
  type: 'per_unit' | 'fixed' | 'percentage';
  value: number;
}

export interface SapCodeAdjustment {
  code: string;
  name: string;
  adjustmentType: 'multiplier' | 'fixed' | 'percentage';
  adjustmentValue: number;
  priority?: number;
}

export interface FixedRoute {
  from: string;
  to: string;
  price: number;
  sapCode?: string;
  conditions?: {
    minPassengers?: number;
    maxPassengers?: number;
    timeFrom?: string;
    timeTo?: string;
    daysOfWeek?: number[];
  };
}

export interface DistanceMatrixEntry {
  from: string;
  to: string;
  distance: number;
  estimatedTime?: number;
  tollCost?: number;
}

export interface Location {
  name: string;
  category: 'airport' | 'port' | 'hotel' | 'hospital' | 'office' | 'residential' | 'other';
  zone?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  surcharge?: number;
}

export interface PricingConfig {
  _id?: string;
  name: string;
  code: string;
  description?: string;
  
  minimumPrice: number;
  baseFee: number;
  
  distanceRates: DistanceRate[];
  
  serviceAdjustments: {
    airport?: ServiceAdjustment;
    medical?: ServiceAdjustment;
    vip?: ServiceAdjustment;
    security?: ServiceAdjustment;
    emergency?: ServiceAdjustment;
    weekend?: ServiceAdjustment;
    holiday?: ServiceAdjustment;
    nightTime?: ServiceAdjustment;
    custom?: Array<CustomCharge & { condition: string }>;
  };
  
  additionalCharges: {
    waitingHourRate: number;
    extraPassengerRate: number;
    luggageRate?: number;
    tollsIncluded?: boolean;
    fuelSurcharge?: number;
    customCharges?: CustomCharge[];
  };
  
  discounts?: {
    volumeDiscounts?: Array<{
      minServices: number;
      discountPercentage: number;
    }>;
    clientDiscounts?: Array<{
      clientId: string;
      discountPercentage: number;
    }>;
    promotionalDiscounts?: Array<{
      code: string;
      validFrom: Date;
      validTo: Date;
      discountPercentage: number;
      maxUses?: number;
      currentUses?: number;
    }>;
  };
  
  sapCodeAdjustments?: SapCodeAdjustment[];
  fixedRoutes?: FixedRoute[];
  distanceMatrix?: DistanceMatrixEntry[];
  locations?: Location[];
  
  timeBasedPricing?: {
    nightHours?: {
      from: string;
      to: string;
      surchargeType: 'percentage' | 'fixed';
      surchargeValue: number;
    };
    peakHours?: Array<{
      from: string;
      to: string;
      daysOfWeek: number[];
      surchargeType: 'percentage' | 'fixed';
      surchargeValue: number;
    }>;
  };
  
  roundingRules?: {
    method: 'none' | 'up' | 'down' | 'nearest';
    precision: number;
  };
  
  isActive: boolean;
  isDefault?: boolean;
  effectiveFrom?: Date;
  effectiveTo?: Date;
  createdBy?: any;
  updatedBy?: any;
  version?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface PriceCalculation {
  price: number;
  distance?: number;
  source: 'fixed_route' | 'calculated' | 'database';
  configId?: string;
  configName?: string;
  breakdown?: {
    baseFee?: number;
    distanceCharge?: number;
    serviceAdjustment?: number;
    waitingCharge?: number;
    extraPassengerCharge?: number;
    discount?: number;
    minimumPrice?: number;
    basePrice?: number;
    extraPassengers?: number;
  };
}

interface PricingConfigState {
  configs: PricingConfig[];
  activeConfig: PricingConfig | null;
  selectedConfig: PricingConfig | null;
  calculatedPrice: PriceCalculation | null;
  loading: boolean;
  error: string | null;
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
  isCalculating: boolean;
}

const initialState: PricingConfigState = {
  configs: [],
  activeConfig: null,
  selectedConfig: null,
  calculatedPrice: null,
  loading: false,
  error: null,
  isCreating: false,
  isUpdating: false,
  isDeleting: false,
  isCalculating: false
};

// Async Thunks
export const fetchPricingConfigs = createAsyncThunk(
  'agencyPricingConfig/fetchAll',
  async (params?: { active?: boolean; page?: number; limit?: number }) => {
    const queryParams = new URLSearchParams();
    if (params?.active !== undefined) queryParams.append('active', String(params.active));
    if (params?.page) queryParams.append('page', String(params.page));
    if (params?.limit) queryParams.append('limit', String(params.limit));
    
    const response = await fetch(createApiUrl(`/api/agency/pricing-config?${queryParams}`), {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    
    if (!response.ok) throw new Error('Failed to fetch pricing configurations');
    const data = await response.json();
    return data.data;
  }
);

export const fetchActiveConfig = createAsyncThunk(
  'agencyPricingConfig/fetchActive',
  async () => {
    const response = await fetch(createApiUrl('/api/agency/pricing-config/active'));
    
    if (!response.ok) throw new Error('Failed to fetch active configuration');
    const data = await response.json();
    return data.data;
  }
);

export const fetchPricingConfigById = createAsyncThunk(
  'agencyPricingConfig/fetchById',
  async (id: string) => {
    const response = await fetch(createApiUrl(`/api/agency/pricing-config/${id}`), {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    
    if (!response.ok) throw new Error('Failed to fetch pricing configuration');
    const data = await response.json();
    return data.data;
  }
);

export const createPricingConfig = createAsyncThunk(
  'agencyPricingConfig/create',
  async (configData: Partial<PricingConfig>) => {
    const response = await fetch(createApiUrl('/api/agency/pricing-config'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(configData)
    });
    
    if (!response.ok) throw new Error('Failed to create pricing configuration');
    const data = await response.json();
    return data.data;
  }
);

export const updatePricingConfig = createAsyncThunk(
  'agencyPricingConfig/update',
  async ({ id, updates }: { id: string; updates: Partial<PricingConfig> }) => {
    const response = await fetch(createApiUrl(`/api/agency/pricing-config/${id}`), {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(updates)
    });
    
    if (!response.ok) throw new Error('Failed to update pricing configuration');
    const data = await response.json();
    return data.data;
  }
);

export const deletePricingConfig = createAsyncThunk(
  'agencyPricingConfig/delete',
  async (id: string) => {
    const response = await fetch(createApiUrl(`/api/agency/pricing-config/${id}`), {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    
    if (!response.ok) throw new Error('Failed to delete pricing configuration');
    return id;
  }
);

export const clonePricingConfig = createAsyncThunk(
  'agencyPricingConfig/clone',
  async ({ id, name, code }: { id: string; name?: string; code?: string }) => {
    const response = await fetch(createApiUrl(`/api/agency/pricing-config/${id}/clone`), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ name, code })
    });
    
    if (!response.ok) throw new Error('Failed to clone pricing configuration');
    const data = await response.json();
    return data.data;
  }
);

export const calculatePrice = createAsyncThunk(
  'agencyPricingConfig/calculate',
  async (params: {
    configId?: string;
    from: string;
    to: string;
    serviceDate?: Date;
    serviceTime?: string;
    passengerCount?: number;
    waitingHours?: number;
    serviceType?: string;
    sapCode?: string;
    promoCode?: string;
    clientId?: string;
  }) => {
    const response = await fetch(createApiUrl('/api/agency/pricing-config/calculate'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params)
    });
    
    if (!response.ok) throw new Error('Failed to calculate price');
    const data = await response.json();
    return data.data;
  }
);

export const importSeedConfig = createAsyncThunk(
  'agencyPricingConfig/importSeed',
  async () => {
    const response = await fetch(createApiUrl('/api/agency/pricing-config/import/seed'), {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    
    if (!response.ok) throw new Error('Failed to import seed configuration');
    const data = await response.json();
    return data.data;
  }
);

// Slice
const agencyPricingConfigSlice = createSlice({
  name: 'agencyPricingConfig',
  initialState,
  reducers: {
    setSelectedConfig: (state, action: PayloadAction<PricingConfig | null>) => {
      state.selectedConfig = action.payload;
    },
    clearCalculatedPrice: (state) => {
      state.calculatedPrice = null;
    },
    clearError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    // Fetch all configs
    builder
      .addCase(fetchPricingConfigs.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPricingConfigs.fulfilled, (state, action) => {
        state.loading = false;
        state.configs = action.payload;
      })
      .addCase(fetchPricingConfigs.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch configs';
      });
    
    // Fetch active config
    builder
      .addCase(fetchActiveConfig.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchActiveConfig.fulfilled, (state, action) => {
        state.loading = false;
        state.activeConfig = action.payload;
      })
      .addCase(fetchActiveConfig.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch active config';
      });
    
    // Fetch by ID
    builder
      .addCase(fetchPricingConfigById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPricingConfigById.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedConfig = action.payload;
      })
      .addCase(fetchPricingConfigById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch config';
      });
    
    // Create config
    builder
      .addCase(createPricingConfig.pending, (state) => {
        state.isCreating = true;
        state.error = null;
      })
      .addCase(createPricingConfig.fulfilled, (state, action) => {
        state.isCreating = false;
        state.configs.push(action.payload);
        if (action.payload.isDefault) {
          state.activeConfig = action.payload;
        }
      })
      .addCase(createPricingConfig.rejected, (state, action) => {
        state.isCreating = false;
        state.error = action.error.message || 'Failed to create config';
      });
    
    // Update config
    builder
      .addCase(updatePricingConfig.pending, (state) => {
        state.isUpdating = true;
        state.error = null;
      })
      .addCase(updatePricingConfig.fulfilled, (state, action) => {
        state.isUpdating = false;
        const index = state.configs.findIndex(c => c._id === action.payload._id);
        if (index !== -1) {
          state.configs[index] = action.payload;
        }
        if (action.payload.isDefault) {
          state.activeConfig = action.payload;
        }
        if (state.selectedConfig?._id === action.payload._id) {
          state.selectedConfig = action.payload;
        }
      })
      .addCase(updatePricingConfig.rejected, (state, action) => {
        state.isUpdating = false;
        state.error = action.error.message || 'Failed to update config';
      });
    
    // Delete config
    builder
      .addCase(deletePricingConfig.pending, (state) => {
        state.isDeleting = true;
        state.error = null;
      })
      .addCase(deletePricingConfig.fulfilled, (state, action) => {
        state.isDeleting = false;
        state.configs = state.configs.filter(c => c._id !== action.payload);
        if (state.selectedConfig?._id === action.payload) {
          state.selectedConfig = null;
        }
      })
      .addCase(deletePricingConfig.rejected, (state, action) => {
        state.isDeleting = false;
        state.error = action.error.message || 'Failed to delete config';
      });
    
    // Clone config
    builder
      .addCase(clonePricingConfig.pending, (state) => {
        state.isCreating = true;
        state.error = null;
      })
      .addCase(clonePricingConfig.fulfilled, (state, action) => {
        state.isCreating = false;
        state.configs.push(action.payload);
      })
      .addCase(clonePricingConfig.rejected, (state, action) => {
        state.isCreating = false;
        state.error = action.error.message || 'Failed to clone config';
      });
    
    // Calculate price
    builder
      .addCase(calculatePrice.pending, (state) => {
        state.isCalculating = true;
        state.error = null;
      })
      .addCase(calculatePrice.fulfilled, (state, action) => {
        state.isCalculating = false;
        state.calculatedPrice = action.payload;
      })
      .addCase(calculatePrice.rejected, (state, action) => {
        state.isCalculating = false;
        state.error = action.error.message || 'Failed to calculate price';
      });
    
    // Import seed
    builder
      .addCase(importSeedConfig.pending, (state) => {
        state.isCreating = true;
        state.error = null;
      })
      .addCase(importSeedConfig.fulfilled, (state, action) => {
        state.isCreating = false;
        state.configs.push(action.payload);
        state.activeConfig = action.payload;
      })
      .addCase(importSeedConfig.rejected, (state, action) => {
        state.isCreating = false;
        state.error = action.error.message || 'Failed to import seed config';
      });
  }
});

// Selectores
export const selectAllPricingConfigs = (state: any) => state.agencyPricingConfig.configs;
export const selectActivePricingConfig = (state: any) => state.agencyPricingConfig.activeConfig;
export const selectSelectedPricingConfig = (state: any) => state.agencyPricingConfig.selectedConfig;
export const selectCalculatedPrice = (state: any) => state.agencyPricingConfig.calculatedPrice;
export const selectPricingConfigLoading = (state: any) => state.agencyPricingConfig.loading;
export const selectPricingConfigError = (state: any) => state.agencyPricingConfig.error;

export const { setSelectedConfig, clearCalculatedPrice, clearError } = agencyPricingConfigSlice.actions;

export default agencyPricingConfigSlice.reducer;