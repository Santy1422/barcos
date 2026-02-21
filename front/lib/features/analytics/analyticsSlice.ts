"use client"

import { createSlice, createAsyncThunk } from "@reduxjs/toolkit"
import type { RootState } from "@/lib/store"

// Asegurar que la URL base tenga /api al final
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"
const API_URL = BASE_URL.endsWith('/api') ? BASE_URL : `${BASE_URL}/api`

// Types
interface ModuleData {
  totalRecords: number
  totalRevenue: number
  totalInvoices: number
  recentRecords: any[]
  byStatus: { [key: string]: number }
  topClients?: any[]
}

interface MetricsSummary {
  totalRevenue: number
  totalTransactions: number
  activeClients: number
  totalClients: number
  invoicesCreated: number
  pendingInvoices: number
  completedInvoices: number
  totalRecords: number
}

interface RevenueData {
  timeline: { date: string; amount: number; count?: number }[]
  byModule: {
    trucking: number
    agency: number
    ptyss: number
    shipchandler: number
  }
  total: number
  monthlyBreakdown?: { year: number; month: number; amount: number; count: number }[]
}

interface OperationalMetrics {
  overallCompletionRate: number
  truckingEfficiency: number
  ptyssEfficiency: number
  shipchandlerEfficiency: number
  agencyEfficiency: number
  averageProcessingTime: number
  moduleStats: any
  totals: any
}

interface ClientsData {
  total: number
  totalActive: number
  inactive: number
  newThisMonth: number
  byType: { [key: string]: number }
  topByRevenue: any[]
  clientsByMonth: any[]
}

interface InvoicesData {
  total: number
  totalAmount: number
  pending: number
  completed: number
  byModule: { [key: string]: { count: number; amount: number } }
  byStatus: { [key: string]: number }
  invoicesByDay: { date: string; count: number; amount: number }[]
}

interface AdvancedData {
  comparisons: {
    thisMonth: { revenue: number; count: number }
    lastMonth: { revenue: number; count: number }
    monthOverMonthGrowth: number
    thisWeek: { revenue: number; count: number }
    lastWeek: { revenue: number; count: number }
    weekOverWeekGrowth: number
    thisYear: { revenue: number; count: number }
    lastYear: { revenue: number; count: number }
    yearOverYearGrowth: number
  }
  ticketStats: {
    average: number
    max: number
    min: number
    total: number
    count: number
  }
  activityByHour: { hour: number; count: number; amount: number }[]
  activityByDayOfWeek: { day: number; dayName: string; count: number; amount: number }[]
  topClientsThisMonth: { name: string; revenue: number; count: number }[]
  recentTransactions: { id: string; invoiceNumber: string; client: string; module: string; amount: number; status: string; date: string }[]
  activeUsers: { userId: string; invoiceCount: number; totalRevenue: number }[]
  recordsByModuleStatus: { module: string; status: string; count: number }[]
  clientGrowth: { year: number; month: number; count: number }[]
}

interface AnalyticsState {
  // Data
  trucking: ModuleData | null
  agency: ModuleData | null
  ptyss: ModuleData | null
  shipchandler: ModuleData | null
  clients: ClientsData | null
  invoices: InvoicesData | null
  metrics: MetricsSummary | null
  revenue: RevenueData | null
  operational: OperationalMetrics | null
  advanced: AdvancedData | null

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
  advanced: null,
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
  async (params: { month?: string; year?: string } = {}, { rejectWithValue }) => {
    try {
      let url = `${API_URL}/analytics/metrics`
      const queryParams = new URLSearchParams()
      if (params.month) queryParams.append("month", params.month)
      if (params.year) queryParams.append("year", params.year)
      if (queryParams.toString()) url += `?${queryParams}`

      const response = await fetch(url, {
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
  async (params: { startDate?: string; endDate?: string; month?: string; year?: string } = {}, { rejectWithValue }) => {
    try {
      const queryParams = new URLSearchParams()
      if (params.startDate) queryParams.append("startDate", params.startDate)
      if (params.endDate) queryParams.append("endDate", params.endDate)
      if (params.month) queryParams.append("month", params.month)
      if (params.year) queryParams.append("year", params.year)

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

export const fetchAdvancedAnalytics = createAsyncThunk(
  "analytics/fetchAdvancedAnalytics",
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_URL}/analytics/advanced`, {
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeader(),
        },
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Error fetching advanced analytics")
      }
      return await response.json()
    } catch (error: any) {
      return rejectWithValue(error.message || "Error fetching advanced analytics")
    }
  }
)

export const fetchAllAnalytics = createAsyncThunk(
  "analytics/fetchAll",
  async (_, { dispatch }) => {
    await Promise.all([
      dispatch(fetchMetrics({})),
      dispatch(fetchRevenue({})),
      dispatch(fetchOperational()),
      dispatch(fetchAdvancedAnalytics()),
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

    // Advanced Analytics
    builder
      .addCase(fetchAdvancedAnalytics.fulfilled, (state, action) => {
        state.advanced = action.payload.data || action.payload
        state.loading = false
      })
      .addCase(fetchAdvancedAnalytics.rejected, (state, action) => {
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
export const selectAdvancedAnalytics = (state: RootState) => state.analytics.advanced
export const selectLastFetched = (state: RootState) => state.analytics.lastFetched

export const { clearError, resetAnalytics } = analyticsSlice.actions
export default analyticsSlice.reducer
