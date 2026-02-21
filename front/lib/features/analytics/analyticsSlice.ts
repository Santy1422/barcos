"use client"

import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit"
import type { RootState } from "@/lib/store"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api"

// Types
interface ModuleData {
  totalRecords: number
  totalRevenue: number
  recentRecords: any[]
  byStatus: { [key: string]: number }
}

interface MetricsSummary {
  totalRevenue: number
  totalTransactions: number
  activeClients: number
  invoicesCreated: number
  pendingInvoices: number
}

interface RevenueData {
  timeline: { date: string; amount: number }[]
  byModule: {
    trucking: number
    agency: number
    ptyss: number
    shipchandler: number
  }
  total: number
}

interface OperationalMetrics {
  overallCompletionRate: number
  truckingEfficiency: number
  agencyEfficiency: number
  averageProcessingTime: number
}

interface AnalyticsState {
  // Data
  trucking: ModuleData | null
  agency: ModuleData | null
  ptyss: ModuleData | null
  shipchandler: ModuleData | null
  clients: any | null
  invoices: any | null
  metrics: MetricsSummary | null
  revenue: RevenueData | null
  operational: OperationalMetrics | null

  // State
  loading: boolean
  error: string | null
  lastFetched: string | null
}

const initialState: AnalyticsState = {
  trucking: null,
  agency: null,
  ptyss: null,
  shipchandler: null,
  clients: null,
  invoices: null,
  metrics: null,
  revenue: null,
  operational: null,
  loading: false,
  error: null,
  lastFetched: null,
}

// Helper to get auth header
const getAuthHeader = () => {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null
  return token ? { Authorization: `Bearer ${token}` } : {}
}

// Async Thunks
export const fetchMetrics = createAsyncThunk(
  "analytics/fetchMetrics",
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_URL}/analytics/metrics`, {
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeader(),
        },
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Error fetching metrics")
      }
      return await response.json()
    } catch (error: any) {
      return rejectWithValue(error.message || "Error fetching metrics")
    }
  }
)

export const fetchRevenue = createAsyncThunk(
  "analytics/fetchRevenue",
  async (params: { startDate?: string; endDate?: string } = {}, { rejectWithValue }) => {
    try {
      const queryParams = new URLSearchParams()
      if (params.startDate) queryParams.append("startDate", params.startDate)
      if (params.endDate) queryParams.append("endDate", params.endDate)

      const url = `${API_URL}/analytics/revenue${queryParams.toString() ? `?${queryParams}` : ""}`
      const response = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeader(),
        },
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Error fetching revenue")
      }
      return await response.json()
    } catch (error: any) {
      return rejectWithValue(error.message || "Error fetching revenue")
    }
  }
)

export const fetchOperational = createAsyncThunk(
  "analytics/fetchOperational",
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_URL}/analytics/operational`, {
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeader(),
        },
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Error fetching operational metrics")
      }
      return await response.json()
    } catch (error: any) {
      return rejectWithValue(error.message || "Error fetching operational metrics")
    }
  }
)

export const fetchModuleAnalytics = createAsyncThunk(
  "analytics/fetchModuleAnalytics",
  async (module: "trucking" | "agency" | "ptyss" | "shipchandler", { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_URL}/analytics/${module}`, {
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeader(),
        },
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || `Error fetching ${module} analytics`)
      }
      const data = await response.json()
      return { module, data }
    } catch (error: any) {
      return rejectWithValue(error.message || `Error fetching ${module} analytics`)
    }
  }
)

export const fetchClientsAnalytics = createAsyncThunk(
  "analytics/fetchClientsAnalytics",
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_URL}/analytics/clients`, {
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeader(),
        },
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Error fetching clients analytics")
      }
      return await response.json()
    } catch (error: any) {
      return rejectWithValue(error.message || "Error fetching clients analytics")
    }
  }
)

export const fetchInvoicesAnalytics = createAsyncThunk(
  "analytics/fetchInvoicesAnalytics",
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_URL}/analytics/invoices`, {
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeader(),
        },
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Error fetching invoices analytics")
      }
      return await response.json()
    } catch (error: any) {
      return rejectWithValue(error.message || "Error fetching invoices analytics")
    }
  }
)

export const fetchAllAnalytics = createAsyncThunk(
  "analytics/fetchAll",
  async (_, { dispatch }) => {
    await Promise.all([
      dispatch(fetchMetrics()),
      dispatch(fetchRevenue({})),
      dispatch(fetchOperational()),
      dispatch(fetchModuleAnalytics("trucking")),
      dispatch(fetchModuleAnalytics("agency")),
      dispatch(fetchModuleAnalytics("ptyss")),
      dispatch(fetchModuleAnalytics("shipchandler")),
      dispatch(fetchClientsAnalytics()),
      dispatch(fetchInvoicesAnalytics()),
    ])
  }
)

// Slice
const analyticsSlice = createSlice({
  name: "analytics",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null
    },
    resetAnalytics: () => initialState,
  },
  extraReducers: (builder) => {
    // Metrics
    builder
      .addCase(fetchMetrics.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchMetrics.fulfilled, (state, action) => {
        state.metrics = action.payload.data || action.payload
        state.loading = false
        state.lastFetched = new Date().toISOString()
      })
      .addCase(fetchMetrics.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })

    // Revenue
    builder
      .addCase(fetchRevenue.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchRevenue.fulfilled, (state, action) => {
        state.revenue = action.payload.data || action.payload
        state.loading = false
      })
      .addCase(fetchRevenue.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })

    // Operational
    builder
      .addCase(fetchOperational.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchOperational.fulfilled, (state, action) => {
        state.operational = action.payload.data || action.payload
        state.loading = false
      })
      .addCase(fetchOperational.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })

    // Module Analytics
    builder
      .addCase(fetchModuleAnalytics.fulfilled, (state, action) => {
        const { module, data } = action.payload
        state[module] = data.data || data
        state.loading = false
      })
      .addCase(fetchModuleAnalytics.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })

    // Clients Analytics
    builder
      .addCase(fetchClientsAnalytics.fulfilled, (state, action) => {
        state.clients = action.payload.data || action.payload
        state.loading = false
      })
      .addCase(fetchClientsAnalytics.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })

    // Invoices Analytics
    builder
      .addCase(fetchInvoicesAnalytics.fulfilled, (state, action) => {
        state.invoices = action.payload.data || action.payload
        state.loading = false
      })
      .addCase(fetchInvoicesAnalytics.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })

    // Fetch All
    builder
      .addCase(fetchAllAnalytics.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchAllAnalytics.fulfilled, (state) => {
        state.loading = false
        state.lastFetched = new Date().toISOString()
      })
  },
})

// Selectors
export const selectAnalyticsLoading = (state: RootState) => state.analytics.loading
export const selectAnalyticsError = (state: RootState) => state.analytics.error
export const selectMetrics = (state: RootState) => state.analytics.metrics
export const selectRevenue = (state: RootState) => state.analytics.revenue
export const selectOperational = (state: RootState) => state.analytics.operational
export const selectTruckingAnalytics = (state: RootState) => state.analytics.trucking
export const selectAgencyAnalytics = (state: RootState) => state.analytics.agency
export const selectPtyssAnalytics = (state: RootState) => state.analytics.ptyss
export const selectShipchandlerAnalytics = (state: RootState) => state.analytics.shipchandler
export const selectClientsAnalytics = (state: RootState) => state.analytics.clients
export const selectInvoicesAnalytics = (state: RootState) => state.analytics.invoices
export const selectLastFetched = (state: RootState) => state.analytics.lastFetched

export const { clearError, resetAnalytics } = analyticsSlice.actions
export default analyticsSlice.reducer
