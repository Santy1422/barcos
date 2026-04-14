import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import { createApiUrl } from '@/lib/api-config';

export interface AgencyVehicleType {
  _id: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface AgencyVehicleTypeInput {
  name: string;
  description?: string;
  isActive?: boolean;
}

interface AgencyVehicleTypesState {
  vehicleTypes: AgencyVehicleType[];
  loading: boolean;
  error: string | null;
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
}

const initialState: AgencyVehicleTypesState = {
  vehicleTypes: [],
  loading: false,
  error: null,
  isCreating: false,
  isUpdating: false,
  isDeleting: false,
};

const authHeaders = (): HeadersInit => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('token') : ''}`,
});

export const fetchAgencyVehicleTypes = createAsyncThunk(
  'agencyVehicleTypes/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch(createApiUrl('/api/agency/vehicle-types'), {
        method: 'GET',
        headers: authHeaders(),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to fetch vehicle types');
      }
      const data = await response.json();
      return data.payload.vehicleTypes as AgencyVehicleType[];
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

export const createAgencyVehicleType = createAsyncThunk(
  'agencyVehicleTypes/create',
  async (input: AgencyVehicleTypeInput, { rejectWithValue }) => {
    try {
      const response = await fetch(createApiUrl('/api/agency/vehicle-types'), {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(input),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to create vehicle type');
      }
      const data = await response.json();
      return data.payload.vehicleType as AgencyVehicleType;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

export const updateAgencyVehicleType = createAsyncThunk(
  'agencyVehicleTypes/update',
  async (
    { id, updateData }: { id: string; updateData: Partial<AgencyVehicleTypeInput> },
    { rejectWithValue }
  ) => {
    try {
      const response = await fetch(createApiUrl(`/api/agency/vehicle-types/${id}`), {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify(updateData),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to update vehicle type');
      }
      const data = await response.json();
      return data.payload.vehicleType as AgencyVehicleType;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

export const deleteAgencyVehicleType = createAsyncThunk(
  'agencyVehicleTypes/delete',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await fetch(createApiUrl(`/api/agency/vehicle-types/${id}`), {
        method: 'DELETE',
        headers: authHeaders(),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to delete vehicle type');
      }
      return id;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

const agencyVehicleTypesSlice = createSlice({
  name: 'agencyVehicleTypes',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAgencyVehicleTypes.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAgencyVehicleTypes.fulfilled, (state, action: PayloadAction<AgencyVehicleType[]>) => {
        state.loading = false;
        state.vehicleTypes = action.payload;
      })
      .addCase(fetchAgencyVehicleTypes.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) || 'Error loading vehicle types';
      })
      .addCase(createAgencyVehicleType.pending, (state) => {
        state.isCreating = true;
        state.error = null;
      })
      .addCase(createAgencyVehicleType.fulfilled, (state, action: PayloadAction<AgencyVehicleType>) => {
        state.isCreating = false;
        state.vehicleTypes = [...state.vehicleTypes, action.payload].sort((a, b) =>
          a.name.localeCompare(b.name)
        );
      })
      .addCase(createAgencyVehicleType.rejected, (state, action) => {
        state.isCreating = false;
        state.error = (action.payload as string) || 'Error creating vehicle type';
      })
      .addCase(updateAgencyVehicleType.pending, (state) => {
        state.isUpdating = true;
        state.error = null;
      })
      .addCase(updateAgencyVehicleType.fulfilled, (state, action: PayloadAction<AgencyVehicleType>) => {
        state.isUpdating = false;
        const idx = state.vehicleTypes.findIndex((v) => v._id === action.payload._id);
        if (idx >= 0) state.vehicleTypes[idx] = action.payload;
        state.vehicleTypes = [...state.vehicleTypes].sort((a, b) => a.name.localeCompare(b.name));
      })
      .addCase(updateAgencyVehicleType.rejected, (state, action) => {
        state.isUpdating = false;
        state.error = (action.payload as string) || 'Error updating vehicle type';
      })
      .addCase(deleteAgencyVehicleType.pending, (state) => {
        state.isDeleting = true;
        state.error = null;
      })
      .addCase(deleteAgencyVehicleType.fulfilled, (state, action: PayloadAction<string>) => {
        state.isDeleting = false;
        state.vehicleTypes = state.vehicleTypes.filter((v) => v._id !== action.payload);
      })
      .addCase(deleteAgencyVehicleType.rejected, (state, action) => {
        state.isDeleting = false;
        state.error = (action.payload as string) || 'Error deleting vehicle type';
      });
  },
});

export const { clearError } = agencyVehicleTypesSlice.actions;
export default agencyVehicleTypesSlice.reducer;
