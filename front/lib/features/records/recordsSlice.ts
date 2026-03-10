import { createSlice, createAsyncThunk, type PayloadAction } from "@reduxjs/toolkit"
import type { RootState } from "@/lib/store"
import { createSelector } from '@reduxjs/toolkit'
import { createApiUrl } from '@/lib/api-config'
import { logError } from '@/lib/errorLogger'

// Generic interface for a single record extracted from an Excel row
export interface ExcelRecord {
  id: string // Unique ID for this specific record (e.g., TRK-REC-EXCELID-ROWID)
  _id?: string // MongoDB ObjectId from database
  excelId: string // ID of the Excel file this record came from
  module: "trucking" | "ptyss"
  type: string // Type of data (e.g., "transport-services", "supply-order")
  status: "pendiente" | "en_progreso" | "completado" | "prefacturado" | "facturado" | "anulado" // Status of this individual record
  totalValue: number // The calculated total value for this specific record/line item
  data: any // The raw data object for this record (e.g., TruckingRecordData)
  sapCode?: string // Campo específico para consultas
  containerConsecutive?: string // Campo específico para consultas
  orderNumber?: string // Numero de orden consecutivo (formato: ORD-XXXXXX)
  createdAt: string
  invoiceId?: string // ID of the invoice if it has been facturado
}

// Interface for a full Invoice document stored in records
export interface InvoiceRecord {
  id: string // Unique ID for the invoice document
  module: "trucking" | "ptyss"
  invoiceNumber: string
  clientName: string
  clientRuc: string
  issueDate: string
  dueDate: string
  currency: string
  subtotal: number
  taxAmount: number
  totalAmount: number
  discountAmount?: number
  discountDescription?: string
  status: "prefactura" | "facturada" | "anulada"
  xmlData?: string
  relatedRecordIds: string[] // IDs of individual ExcelRecord items included in this invoice
  notes?: string
  details?: {
    [key: string]: any
  }
  createdAt: string
}

// Acciones async para interactuar con el backend
export const fetchRecordsByModule = createAsyncThunk(
  'records/fetchByModule',
  async (module: string, { rejectWithValue }) => {
    const url = createApiUrl(`/api/records/module/${module}`)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        await logError({
          method: 'GET',
          url,
          statusCode: response.status,
          error: { message: errorData.message || 'Error al obtener registros', code: String(response.status) },
          module: 'records',
          action: 'fetchByModule',
          responseBody: errorData
        })
        throw new Error(errorData.message || 'Error al obtener registros')
      }

      const data = await response.json()
      return data.data || []
    } catch (error: any) {
      await logError({
        method: 'GET',
        url,
        statusCode: 0,
        error: { message: error.message, stack: error.stack },
        module: 'records',
        action: 'fetchByModule'
      })
      return rejectWithValue(error.message)
    }
  }
)

export const fetchPendingRecords = createAsyncThunk(
  'records/fetchPending',
  async (_, { rejectWithValue }) => {
    const url = createApiUrl('/api/records/status/pendiente')
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        await logError({
          method: 'GET', url, statusCode: response.status,
          error: { message: errorData.message || 'Error al obtener registros pendientes' },
          module: 'records', action: 'fetchPending'
        })
        throw new Error('Error al obtener registros pendientes')
      }

      const data = await response.json()
      const transformedRecords = (data.data || []).map((record: any) => ({
        id: record._id,
        excelId: record.excelId || '',
        module: record.module,
        type: record.type,
        status: record.status,
        totalValue: record.totalValue || 0,
        data: record.data,
        createdAt: record.createdAt,
        invoiceId: record.invoiceId
      }))

      return transformedRecords
    } catch (error: any) {
      await logError({
        method: 'GET', url, statusCode: 0,
        error: { message: error.message, stack: error.stack },
        module: 'records', action: 'fetchPending'
      })
      return rejectWithValue(error.message)
    }
  }
)

// Nuevo thunk para obtener registros pendientes por módulo específico
export const fetchPendingRecordsByModule = createAsyncThunk(
  'records/fetchPendingByModule',
  async (module: string, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token')
      // Solicitar todos los registros sin paginación
      const response = await fetch(createApiUrl(`/api/records/status/pendiente?module=${module}&limit=1000`), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (!response.ok) {
        throw new Error('Error al obtener registros pendientes por módulo')
      }
      
      const data = await response.json()
      
      // Transformar los datos del backend al formato esperado por el frontend
      const transformedRecords = (data.data || []).map((record: any) => ({
        id: record._id,
        excelId: record.excelId || '',
        module: record.module,
        type: record.type,
        status: record.status,
        totalValue: record.totalValue || 0,
        data: record.data,
        sapCode: record.sapCode || null,
        containerConsecutive: record.containerConsecutive || null,
        createdAt: record.createdAt,
        invoiceId: record.invoiceId
      }))
      
      return { module, records: transformedRecords }
    } catch (error) {
                                       //@ts-ignore

      return rejectWithValue(error.message)
    }
  }
)

export const createAgencyRecords = createAsyncThunk(
  'records/createAgency',
  async ({ excelId, recordsData, isManualEntry = false }: {
    excelId?: string | null
    recordsData: any[]
    isManualEntry?: boolean
  }, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token')
      console.log("Creating Agency records:", { excelId, recordsCount: recordsData.length, isManualEntry })
      
      const response = await fetch(createApiUrl('/api/records/agency/bulk'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ excelId, recordsData, isManualEntry })
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al crear registros de Agency')
      }
      
      const data = await response.json()
      console.log("Agency records created:", data)
      return data
    } catch (error: any) {
      console.error("Error creating Agency records:", error)
      return rejectWithValue(error.message)
    }
  }
)

export const createTruckingRecords = createAsyncThunk(
  'records/createTrucking',
  async ({ excelId, recordsData }: {
    excelId: string
    recordsData: any[]
  }, { rejectWithValue }) => {
    const url = '/api/records/trucking/bulk'
    try {
      const token = localStorage.getItem('token')
      console.log("📤 [Trucking] Enviando", recordsData.length, "registros al backend");

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ excelId, recordsData })
      })

      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        let errorMessage = `Error al crear registros (${response.status})`;
        let errorData: any = {};

        if (contentType && contentType.includes('application/json')) {
          errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } else {
          const errorText = await response.text();
          errorData = { html: errorText.substring(0, 500) };
          errorMessage = `Error del servidor (${response.status}). Backend no responde JSON.`;
        }

        await logError({
          method: 'POST', url, statusCode: response.status,
          error: { message: errorMessage, code: String(response.status) },
          module: 'trucking', action: 'createTruckingRecords',
          requestBody: { excelId, recordsCount: recordsData.length },
          responseBody: errorData
        })
        throw new Error(errorMessage);
      }

      const data = await response.json()
      console.log("✅ [Trucking] Registros creados:", data.payload?.records?.length || 0);
      return data.payload || {}
    } catch (error: any) {
      console.error("❌ [Trucking] Error:", error.message);
      await logError({
        method: 'POST', url, statusCode: 0,
        error: { message: error.message, stack: error.stack },
        module: 'trucking', action: 'createTruckingRecords',
        requestBody: { excelId, recordsCount: recordsData.length }
      })
      return rejectWithValue(error.message)
    }
  }
)

// Versión asíncrona - responde inmediatamente con jobId
export const createTruckingRecordsAsync = createAsyncThunk(
  'records/createTruckingAsync',
  async ({ excelId, recordsData }: {
    excelId: string
    recordsData: any[]
  }, { rejectWithValue }) => {
    const url = '/api/records/trucking/bulk-async'
    try {
      const token = localStorage.getItem('token')
      console.log("📤 [Trucking Async] Iniciando procesamiento de", recordsData.length, "registros");

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ excelId, recordsData })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Error al iniciar procesamiento (${response.status})`);
      }

      const data = await response.json()
      console.log("✅ [Trucking Async] Job creado:", data.payload?.jobId);
      return data.payload || {}
    } catch (error: any) {
      console.error("❌ [Trucking Async] Error:", error.message);
      return rejectWithValue(error.message)
    }
  }
)

// Obtener estado de un job de procesamiento
export const getUploadJobStatus = createAsyncThunk(
  'records/getJobStatus',
  async (jobId: string, { rejectWithValue }) => {
    const url = `/api/records/jobs/${jobId}`
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Error al obtener estado del job');
      }

      const data = await response.json()
      return data.payload?.job || data.job || {}
    } catch (error: any) {
      return rejectWithValue(error.message)
    }
  }
)

// Obtener jobs pendientes del usuario
export const getUserPendingJobs = createAsyncThunk(
  'records/getPendingJobs',
  async (_, { rejectWithValue }) => {
    const url = '/api/records/jobs/pending'
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error('Error al obtener jobs pendientes');
      }

      const data = await response.json()
      return data.payload?.jobs || data.jobs || []
    } catch (error: any) {
      return rejectWithValue(error.message)
    }
  }
)

export const createShipChandlerRecords = createAsyncThunk(
  'records/createShipChandler',
  async ({ excelId, recordsData }: {
    excelId: string
    recordsData: any[]
  }, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token')
      console.log("Token presente:", !!token);
      console.log("Token (primeros 20 chars):", token ? token.substring(0, 20) + "..." : "NO HAY TOKEN");
      console.log("Payload enviado a backend ShipChandler:", { excelId, recordsData });
      const response = await fetch('/api/records/shipchandler/bulk', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          excelId,
          recordsData
        })
      })
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error("Error backend - Status:", response.status);
        console.error("Error backend - Data:", JSON.stringify(errorData, null, 2));
        throw new Error(errorData.error || `Error al crear registros (${response.status})`);
      }
      
      console.log("✅ Response OK - Status:", response.status);
      const data = await response.json()
      console.log("Respuesta del backend:", data);
      console.log("data.payload:", data.payload);
      console.log("data.payload.records:", data.payload?.records);
      console.log("data.payload.records length:", data.payload?.records?.length);
      
      // Retornar toda la respuesta del backend para que el frontend pueda acceder a duplicates, count, etc.
      const result = data.payload || {};
      console.log("Resultado final a retornar:", result);
      console.log("Resultado final length:", result.records?.length || 0);
      return result
    } catch (error) {
                                       //@ts-ignore

      return rejectWithValue(error.message)
    }
  }
)

export const createPTYSSRecords = createAsyncThunk(
  'records/createPTYSS',
  async ({ excelId, recordsData }: {
    excelId: string
    recordsData: any[]
  }, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token')
      console.log("Token presente:", !!token);
      console.log("Token (primeros 20 chars):", token ? token.substring(0, 20) + "..." : "NO HAY TOKEN");
      console.log("Payload enviado a backend PTYSS:", { excelId, recordsData });
      const response = await fetch('/api/records/ptyss/bulk', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          excelId,
          recordsData
        })
      })
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error("Error backend PTYSS - Status:", response.status);
        console.error("Error backend PTYSS - Data:", JSON.stringify(errorData, null, 2));
        throw new Error(errorData.error || `Error al crear registros PTYSS (${response.status})`);
      }
      
      console.log("✅ Response OK PTYSS - Status:", response.status);
      const data = await response.json()
      console.log("Respuesta del backend PTYSS:", data);
      console.log("data.payload:", data.payload);
      console.log("data.payload.records:", data.payload?.records);
      console.log("data.payload.records length:", data.payload?.records?.length);
      
      // Retornar toda la respuesta del backend para que el frontend pueda acceder a duplicates, count, etc.
      const result = data.payload || {};
      console.log("Resultado final a retornar PTYSS:", result);
      console.log("Resultado final (records length):", result.records?.length || 0);
      console.log("Resultado final (count):", result.count);
      console.log("Resultado final (duplicates):", result.duplicates);
      return result
    } catch (error) {
                                       //@ts-ignore

      return rejectWithValue(error.message)
    }
  }
)

// Versión asíncrona de ShipChandler - responde inmediatamente con jobId
export const createShipChandlerRecordsAsync = createAsyncThunk(
  'records/createShipChandlerAsync',
  async ({ excelId, recordsData }: {
    excelId: string
    recordsData: any[]
  }, { rejectWithValue }) => {
    const url = '/api/records/shipchandler/bulk-async'
    try {
      const token = localStorage.getItem('token')
      console.log("📤 [ShipChandler Async] Iniciando procesamiento de", recordsData.length, "registros");

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ excelId, recordsData })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Error al iniciar procesamiento (${response.status})`);
      }

      const data = await response.json()
      console.log("✅ [ShipChandler Async] Job creado:", data.payload?.jobId);
      return data.payload || {}
    } catch (error: any) {
      console.error("❌ [ShipChandler Async] Error:", error.message);
      return rejectWithValue(error.message)
    }
  }
)

// Versión asíncrona de PTYSS - responde inmediatamente con jobId
export const createPTYSSRecordsAsync = createAsyncThunk(
  'records/createPTYSSAsync',
  async ({ excelId, recordsData }: {
    excelId: string
    recordsData: any[]
  }, { rejectWithValue }) => {
    const url = '/api/records/ptyss/bulk-async'
    try {
      const token = localStorage.getItem('token')
      console.log("📤 [PTYSS Async] Iniciando procesamiento de", recordsData.length, "registros");

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ excelId, recordsData })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Error al iniciar procesamiento (${response.status})`);
      }

      const data = await response.json()
      console.log("✅ [PTYSS Async] Job creado:", data.payload?.jobId);
      return data.payload || {}
    } catch (error: any) {
      console.error("❌ [PTYSS Async] Error:", error.message);
      return rejectWithValue(error.message)
    }
  }
)

// Versión asíncrona de Agency - responde inmediatamente con jobId
export const createAgencyRecordsAsync = createAsyncThunk(
  'records/createAgencyAsync',
  async ({ excelId, recordsData, isManualEntry = false }: {
    excelId: string
    recordsData: any[]
    isManualEntry?: boolean
  }, { rejectWithValue }) => {
    const url = '/api/records/agency/bulk-async'
    try {
      const token = localStorage.getItem('token')
      console.log("📤 [Agency Async] Iniciando procesamiento de", recordsData.length, "registros");

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ excelId, recordsData, isManualEntry })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Error al iniciar procesamiento (${response.status})`);
      }

      const data = await response.json()
      console.log("✅ [Agency Async] Job creado:", data.payload?.jobId);
      return data.payload || {}
    } catch (error: any) {
      console.error("❌ [Agency Async] Error:", error.message);
      return rejectWithValue(error.message)
    }
  }
)

export const createInvoiceAsync = createAsyncThunk(
  'records/createInvoice',
  async (invoiceData: InvoiceRecord, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        throw new Error('No se encontró token de autenticación')
      }
      
      console.log("Enviando factura al backend:", invoiceData)
      
      const response = await fetch(createApiUrl('/api/invoices'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(invoiceData)
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        console.error("Error al crear factura:", errorData)
        throw new Error(errorData.error || `Error al crear factura (${response.status})`)
      }
      
      const data = await response.json()
      console.log("Factura creada exitosamente:", data)
      
      // El backend devuelve { error: false, payload: { invoice: ... } }
      if (data.payload && data.payload.invoice) {
        return data.payload.invoice
      } else {
        throw new Error('Respuesta del servidor inválida')
      }
    } catch (error) {
      console.error("Error en createInvoiceAsync:", error)
      return rejectWithValue(error instanceof Error ? error.message : 'Error desconocido')
    }
  }
)

export const fetchInvoicesAsync = createAsyncThunk(
  'records/fetchInvoices',
  async (module: string | undefined, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        throw new Error('No se encontró token de autenticación')
      }
      
      const url = module ? `/api/invoices/module/${module}` : '/api/invoices'
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Error al obtener facturas (${response.status})`)
      }
      
      const data = await response.json()
      
      // El backend devuelve { error: false, payload:[object Object] invoices: [...] } }
      if (data.payload && data.payload.invoices) {
        return data.payload.invoices
      } else {
        return []
      }
    } catch (error) {
      console.error("Error en fetchInvoicesAsync:", error)
      return rejectWithValue(error instanceof Error ? error.message : 'Error desconocido')
    }
  }
)

export const updateRecordStatus = createAsyncThunk(
  'records/updateStatus',
  async ({ recordId, status, invoiceId }: {
    recordId: string
    status: string
    invoiceId?: string
  }, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(createApiUrl(`/api/records/${recordId}`), {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status,
          ...(invoiceId && { invoiceId })
        })
      })
      
      if (!response.ok) {
        throw new Error('Error al actualizar registro')
      }
      
      const data = await response.json()
      return data.record
    } catch (error: any) {
      return rejectWithValue(error.message)
    }
  }
)

export const fetchRecordsBySapCode = createAsyncThunk(
  'records/fetchBySapCode',
  async ({ sapCode, module = "trucking", page = 1, limit = 50 }: {
    sapCode: string
    module?: string
    page?: number
    limit?: number
  }, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(createApiUrl(`/api/records/sapcode/${sapCode}?module=${module}&page=${page}&limit=${limit}`), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (!response.ok) {
        throw new Error('Error al obtener registros por sapCode')
      }
      
      const data = await response.json()
      return data.payload || { records: [], pagination: {}, summary: {} }
    } catch (error: any) {
      return rejectWithValue(error.message)
    }
  }
)

export const updateRecordAsync = createAsyncThunk(
  'records/updateRecord',
  async ({ id, updates }: { id: string; updates: Partial<ExcelRecord> }, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(createApiUrl(`/api/records/${id}`), {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      })
      
      if (!response.ok) {
        throw new Error('Error al actualizar registro')
      }
      
      const data = await response.json()
      console.log("🔍 updateRecordAsync - Respuesta del backend:", data)
      console.log("🔍 updateRecordAsync - data.data:", data.data)
      return data.data // Devolver directamente el registro actualizado
    } catch (error: any) {
      return rejectWithValue(error.message)
    }
  }
)

export const updateInvoiceAsync = createAsyncThunk(
  'records/updateInvoice',
  async ({ id, updates }: { id: string, updates: Partial<InvoiceRecord> }, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        throw new Error('No se encontró token de autenticación')
      }
      const response = await fetch(createApiUrl(`/api/invoices/${id}`), {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || `Error al actualizar factura (${response.status})`)
      }
      const data = await response.json()
      return data.data
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Error desconocido')
    }
  }
)

export const deleteInvoiceAsync = createAsyncThunk(
  'records/deleteInvoice',
  async (invoiceId: string, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        throw new Error('No se encontró token de autenticación')
      }
      
      const response = await fetch(createApiUrl(`/api/invoices/${invoiceId}`), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || `Error al eliminar factura (${response.status})`)
      }
      
      const data = await response.json()
      return { invoiceId, data: data.data }
    } catch (error) {
      console.error("Error en deleteInvoiceAsync:", error)
      return rejectWithValue(error instanceof Error ? error.message : 'Error desconocido')
    }
  }
)

export const deleteRecordAsync = createAsyncThunk(
  'records/deleteRecord',
  async (recordId: string, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        throw new Error('No se encontró token de autenticación')
      }
      
      const response = await fetch(createApiUrl(`/api/records/${recordId}`), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || `Error al eliminar registro (${response.status})`)
      }
      
      const data = await response.json()
      return { recordId, data: data.data }
    } catch (error) {
      console.error("Error en deleteRecordAsync:", error)
      return rejectWithValue(error instanceof Error ? error.message : 'Error desconocido')
    }
  }
)

export const fetchAllRecordsByModule = createAsyncThunk(
  'records/fetchAllByModule',
  async (module: string, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        throw new Error('No se encontró token de autenticación')
      }
      
      const response = await fetch(createApiUrl(`/api/records?module=${module}&limit=1000`), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || `Error al obtener registros (${response.status})`)
      }
      
      const data = await response.json()
      console.log("🔍 fetchAllRecordsByModule - Response data:", data)
      
      // El backend devuelve { success: true, payload: [...] }
      if (data.success && data.payload) {
        return data.payload
      } else if (data.payload) {
        return data.payload
      } else {
        console.warn("🔍 fetchAllRecordsByModule - Respuesta inesperada:", data)
        return []
      }
    } catch (error) {
      console.error("Error en fetchAllRecordsByModule:", error)
      return rejectWithValue(error instanceof Error ? error.message : 'Error desconocido')
    }
  }
)

// Nueva acción async para actualizar múltiples registros en el backend
export const updateMultipleRecordsStatusAsync = createAsyncThunk(
  'records/updateMultipleStatus',
  async ({ recordIds, status, invoiceId }: { recordIds: string[]; status: string; invoiceId: string }, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        throw new Error('No se encontró token de autenticación')
      }

      console.log(`🔍 updateMultipleRecordsStatusAsync - Actualizando ${recordIds.length} registros a estado: ${status}`)
      
      // Actualizar cada registro individualmente
      const updatePromises = recordIds.map(async (recordId) => {
        console.log(`🔍 Actualizando registro ${recordId} a estado ${status}`)
        
        const response = await fetch(createApiUrl(`/api/records/${recordId}`), {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            status: status,
            invoiceId: invoiceId
          })
        })
        
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(`Error actualizando registro ${recordId}: ${errorData.message || response.statusText}`)
        }
        
        return await response.json()
      })
      
      const results = await Promise.all(updatePromises)
      console.log(`✅ updateMultipleRecordsStatusAsync - ${results.length} registros actualizados exitosamente`)
      
      return { recordIds, status, invoiceId, results }
    } catch (error: any) {
      console.error('❌ Error en updateMultipleRecordsStatusAsync:', error)
      return rejectWithValue(error.message)
    }
  }
)

// Thunks para Gastos Autoridades
export const createAutoridadesRecords = createAsyncThunk(
  'records/createAutoridadesRecords',
  async (recordsData: any[], { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        throw new Error('No se encontró token de autenticación')
      }
      
      const response = await fetch(createApiUrl('/api/records/autoridades/bulk'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ recordsData })
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        console.error('createAutoridadesRecords - Error del servidor:', errorData)
        throw new Error(errorData.error || `Error al crear registros de autoridades (${response.status})`)
      }
      
      const data = await response.json()
      console.log('createAutoridadesRecords - Respuesta exitosa del servidor:', data)
      return data.records || []
    } catch (error: any) {
      return rejectWithValue(error.message)
    }
  }
)

export const fetchAutoridadesRecords = createAsyncThunk(
  'records/fetchAutoridadesRecords',
  async (_, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        throw new Error('No se encontró token de autenticación')
      }
      
      const response = await fetch(createApiUrl('/api/records/autoridades'), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Error al obtener registros de autoridades (${response.status})`)
      }
      
      const data = await response.json()
      return data || []
    } catch (error: any) {
      return rejectWithValue(error.message)
    }
  }
)

export const deleteAutoridadesRecord = createAsyncThunk(
  'records/deleteAutoridadesRecord',
  async (recordId: string, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        throw new Error('No se encontró token de autenticación')
      }
      
      const response = await fetch(createApiUrl(`/api/records/autoridades/${recordId}`), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Error al eliminar registro de autoridades (${response.status})`)
      }
      
      return recordId
    } catch (error: any) {
      return rejectWithValue(error.message)
    }
  }
)

// Nueva acción async para actualizar múltiples registros de autoridades (bulk update)
export const updateMultipleAutoridadesStatusAsync = createAsyncThunk(
  'records/updateMultipleAutoridadesStatus',
  async ({ recordIds, status, invoiceId }: { recordIds: string[]; status: string; invoiceId: string }, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        throw new Error('No se encontró token de autenticación')
      }

      console.log(`🔍 updateMultipleAutoridadesStatusAsync - Actualizando ${recordIds.length} registros de autoridades a estado: ${status}`)

      // Usar endpoint de actualización masiva (una sola petición)
      const response = await fetch(createApiUrl(`/api/records/autoridades/bulk-update`), {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          recordIds: recordIds,
          status: status,
          invoiceId: invoiceId
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(`Error actualizando registros de autoridades: ${errorData.message || response.statusText}`)
      }

      const result = await response.json()
      console.log(`✅ updateMultipleAutoridadesStatusAsync - ${result.modifiedCount} registros de autoridades actualizados exitosamente`)

      return { recordIds, status, invoiceId, results: result }
    } catch (error: any) {
      console.error('❌ Error en updateMultipleAutoridadesStatusAsync:', error)
      return rejectWithValue(error.message)
    }
  }
)

interface RecordsState {
  individualRecords: ExcelRecord[]
  invoices: InvoiceRecord[]
  loading: boolean
  error: string | null
  fetchingRecords: boolean
  creatingRecords: boolean
  sapCodeRecords: ExcelRecord[]
  sapCodePagination: {
    currentPage: number
    totalPages: number
    totalCount: number
    hasNextPage: boolean
    hasPrevPage: boolean
    limit: number
  } | null
  sapCodeSummary: {
    totalValue: number
    averageValue: number
  } | null
  pendingRecordsByModule: {
    [module: string]: ExcelRecord[]
  }
  autoridadesRecords: any[]
}

const initialState: RecordsState = {
  individualRecords: [],
  invoices: [],
  loading: false,
  error: null,
  fetchingRecords: false,
  creatingRecords: false,
  sapCodeRecords: [],
  sapCodePagination: null,
  sapCodeSummary: null,
  pendingRecordsByModule: {},
  autoridadesRecords: [],
}

const recordsSlice = createSlice({
  name: "records",
  initialState,
  reducers: {
    // This reducer is key: it adds an array of new individual records to the state.
    addRecords: (state, action: PayloadAction<ExcelRecord[]>) => {
      // We use push to add the new records without overwriting existing ones.
      state.individualRecords.push(...action.payload)
    },
    // Add this new reducer
    updateRecord: (state, action: PayloadAction<{ id: string; updates: Partial<ExcelRecord> }>) => {
      const record = state.individualRecords.find((r) => r.id === action.payload.id)
      if (record) {
        Object.assign(record, action.payload.updates)
      }
    },
    // This reducer marks the selected individual records as "prefacturado" when creating a prefactura
    markRecordsAsPrefacturado: (state, action: PayloadAction<{ recordIds: string[]; invoiceId: string }>) => {
      action.payload.recordIds.forEach((recordId) => {
        const record = state.individualRecords.find((r) => (r._id || r.id) === recordId)
        if (record) {
          record.status = "prefacturado"
          record.invoiceId = action.payload.invoiceId
        }
      })
      
      // También actualizar pendingRecordsByModule para todos los módulos
      Object.keys(state.pendingRecordsByModule).forEach(module => {
        state.pendingRecordsByModule[module] = state.pendingRecordsByModule[module].filter(
          record => !action.payload.recordIds.includes(record._id || record.id)
        )
      })
    },
    // This reducer marks the selected individual records as "facturado" when finalizing invoice
    markRecordsAsInvoiced: (state, action: PayloadAction<{ recordIds: string[]; invoiceId: string }>) => {
      action.payload.recordIds.forEach((recordId) => {
        const record = state.individualRecords.find((r) => (r._id || r.id) === recordId)
        if (record) {
          record.status = "facturado"
          record.invoiceId = action.payload.invoiceId
        }
      })
      
      // También actualizar pendingRecordsByModule para todos los módulos
      Object.keys(state.pendingRecordsByModule).forEach(module => {
        state.pendingRecordsByModule[module] = state.pendingRecordsByModule[module].filter(
          record => !action.payload.recordIds.includes(record._id || record.id)
        )
      })
    },
    // This reducer adds a completed invoice document to the state.
    addInvoice: (state, action: PayloadAction<InvoiceRecord>) => {
      state.invoices.push(action.payload)
    },
    updateInvoiceStatus: (state, action: PayloadAction<{ id: string; status: InvoiceRecord["status"]; invoiceNumber?: string }>) => {
      const invoice = state.invoices.find((inv) => inv.id === action.payload.id)
      if (invoice) {
        invoice.status = action.payload.status
        if (action.payload.invoiceNumber) {
          invoice.invoiceNumber = action.payload.invoiceNumber
        }
      }
    },
    // This reducer releases records when an invoice is deleted
    releaseRecordsFromInvoice: (state, action: PayloadAction<{ invoiceId: string; recordIds: string[] }>) => {
      action.payload.recordIds.forEach((recordId) => {
        const record = state.individualRecords.find((r) => (r._id || r.id) === recordId)
        if (record && record.invoiceId === action.payload.invoiceId) {
          record.status = "pendiente"
          record.invoiceId = undefined
        }
      })
      
      // También actualizar pendingRecordsByModule para todos los módulos
      Object.keys(state.pendingRecordsByModule).forEach(module => {
        const releasedRecords = state.individualRecords.filter(
          record => action.payload.recordIds.includes(record._id || record.id) && 
                   record.module === module && 
                   record.status === "pendiente"
        )
        state.pendingRecordsByModule[module] = [
          ...state.pendingRecordsByModule[module],
          ...releasedRecords
        ]
      })
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload
    },
    clearRecords: (state) => {
      state.individualRecords = []
    },
    setRecords: (state, action: PayloadAction<ExcelRecord[]>) => {
      state.individualRecords = action.payload
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch records by module
      .addCase(fetchRecordsByModule.pending, (state) => {
        state.fetchingRecords = true
        state.error = null
      })
      .addCase(fetchRecordsByModule.fulfilled, (state, action) => {
        state.fetchingRecords = false
        console.log("🔍 fetchRecordsByModule.fulfilled - Registros recibidos:", action.payload.length)
        console.log("🔍 fetchRecordsByModule.fulfilled - Registros antes:", state.individualRecords.length)
        
        // Agregar los registros al estado individualRecords, evitando duplicados
        action.payload.forEach((newRecord: any) => {
          const existingIndex = state.individualRecords.findIndex(r => (r._id || r.id) === (newRecord._id || newRecord.id))
          if (existingIndex >= 0) {
            state.individualRecords[existingIndex] = newRecord
          } else {
            state.individualRecords.push(newRecord)
          }
        })
        
        console.log("🔍 fetchRecordsByModule.fulfilled - Registros después:", state.individualRecords.length)
      })
      .addCase(fetchRecordsByModule.rejected, (state, action) => {
        state.fetchingRecords = false
        state.error = action.payload as string
      })
      
      // Fetch pending records
      .addCase(fetchPendingRecords.pending, (state) => {
        state.fetchingRecords = true
        state.error = null
      })
      .addCase(fetchPendingRecords.fulfilled, (state, action) => {
        state.fetchingRecords = false
        // Solo actualizar registros pendientes
        const pendingRecords = action.payload
        state.individualRecords = [
          ...state.individualRecords.filter(r => r.status !== 'pendiente'),
          ...pendingRecords
        ]
      })
      .addCase(fetchPendingRecords.rejected, (state, action) => {
        state.fetchingRecords = false
        state.error = action.payload as string
      })
      
      // Fetch pending records by module
      .addCase(fetchPendingRecordsByModule.pending, (state) => {
        state.fetchingRecords = true
        state.error = null
      })
      .addCase(fetchPendingRecordsByModule.fulfilled, (state, action) => {
        state.fetchingRecords = false
        const { module, records } = action.payload
        state.pendingRecordsByModule[module] = records
      })
      .addCase(fetchPendingRecordsByModule.rejected, (state, action) => {
        state.fetchingRecords = false
        state.error = action.payload as string
      })
      
      // Create trucking records
      .addCase(createTruckingRecords.pending, (state) => {
        state.creatingRecords = true
        state.error = null
      })
      .addCase(createTruckingRecords.fulfilled, (state, action) => {
        state.creatingRecords = false
        // action.payload ahora es un objeto con {records, count, duplicates, message}
        if (action.payload.records && Array.isArray(action.payload.records)) {
          state.individualRecords.push(...action.payload.records)
        }
      })
      .addCase(createTruckingRecords.rejected, (state, action) => {
        state.creatingRecords = false
        state.error = action.payload as string
      })
      
      // Create Agency records
      .addCase(createAgencyRecords.pending, (state) => {
        state.creatingRecords = true
        state.error = null
      })
      .addCase(createAgencyRecords.fulfilled, (state, action) => {
        state.creatingRecords = false
        // action.payload es un objeto con {records, count, duplicates, message}
        if (action.payload.records && Array.isArray(action.payload.records)) {
          state.individualRecords.push(...action.payload.records)
        }
      })
      .addCase(createAgencyRecords.rejected, (state, action) => {
        state.creatingRecords = false
        state.error = action.payload as string
      })
      
      // Create PTYSS records
      .addCase(createPTYSSRecords.pending, (state) => {
        state.creatingRecords = true
        state.error = null
      })
      .addCase(createPTYSSRecords.fulfilled, (state, action) => {
        state.creatingRecords = false
        // action.payload ahora es un objeto con { count, duplicates, records, totalProcessed, message }
        // Solo agregar los records al estado
        if (action.payload.records && Array.isArray(action.payload.records)) {
          state.individualRecords.push(...action.payload.records)
        }
      })
      .addCase(createPTYSSRecords.rejected, (state, action) => {
        state.creatingRecords = false
        state.error = action.payload as string
      })
      
      // Create ShipChandler records
      .addCase(createShipChandlerRecords.pending, (state) => {
        state.creatingRecords = true
        state.error = null
      })
      .addCase(createShipChandlerRecords.fulfilled, (state, action) => {
        state.creatingRecords = false
        // action.payload ahora es un objeto con { count, duplicates, records, totalProcessed, message }
        // Solo agregar los records al estado
        if (action.payload.records && Array.isArray(action.payload.records)) {
          state.individualRecords.push(...action.payload.records)
        }
      })
      .addCase(createShipChandlerRecords.rejected, (state, action) => {
        state.creatingRecords = false
        state.error = action.payload as string
      })
      
      // Create invoice
      .addCase(createInvoiceAsync.pending, (state) => {
        state.creatingRecords = true
        state.error = null
      })
      .addCase(createInvoiceAsync.fulfilled, (state, action) => {
        state.creatingRecords = false
        state.invoices.push(action.payload)
      })
      .addCase(createInvoiceAsync.rejected, (state, action) => {
        state.creatingRecords = false
        state.error = action.payload as string
      })
      
      // Fetch invoices
      .addCase(fetchInvoicesAsync.pending, (state) => {
        state.fetchingRecords = true
        state.error = null
      })
      .addCase(fetchInvoicesAsync.fulfilled, (state, action) => {
        state.fetchingRecords = false
        state.invoices = action.payload
      })
      .addCase(fetchInvoicesAsync.rejected, (state, action) => {
        state.fetchingRecords = false
        state.error = action.payload as string
      })
      
      // Update record status
      .addCase(updateRecordStatus.fulfilled, (state, action) => {
        const record = state.individualRecords.find(r => r.id === action.payload.id)
        if (record) {
          Object.assign(record, action.payload)
        }
      })
      // En extraReducers, agregar:
      .addCase(updateRecordAsync.fulfilled, (state, action) => {
        const payloadId = action.payload._id ?? action.payload.id
        if (!payloadId) return
        const recordIndex = state.individualRecords.findIndex(
          r => (r._id || r.id) === payloadId || (r._id || r.id)?.toString() === String(payloadId)
        )
        if (recordIndex >= 0) {
          // Fusionar con el registro existente para no perder module/data si el backend no los envía
          const existing = state.individualRecords[recordIndex] as any
          state.individualRecords[recordIndex] = {
            ...existing,
            ...action.payload,
            module: action.payload.module ?? existing?.module,
            data: action.payload.data ?? existing?.data
          }
        } else {
          state.individualRecords.push(action.payload)
        }
      })
      .addCase(updateRecordAsync.rejected, (state, action) => {
        state.error = action.payload as string
      })
      
      // Update multiple records status
      .addCase(updateMultipleRecordsStatusAsync.fulfilled, (state, action) => {
        const { recordIds, status, invoiceId } = action.payload
        // Actualizar los registros en el estado local
        recordIds.forEach((recordId) => {
          const record = state.individualRecords.find((r) => (r._id || r.id) === recordId)
          if (record) {
            record.status = status as any
            record.invoiceId = invoiceId
          }
        })
        
        // También actualizar pendingRecordsByModule para todos los módulos
        Object.keys(state.pendingRecordsByModule).forEach(module => {
          state.pendingRecordsByModule[module] = state.pendingRecordsByModule[module].filter(
            record => !recordIds.includes(record._id || record.id)
          )
        })
        
        console.log(`🔍 updateMultipleRecordsStatusAsync.fulfilled - ${recordIds.length} registros actualizados a ${status}`)
      })
      .addCase(updateMultipleRecordsStatusAsync.rejected, (state, action) => {
        state.error = action.payload as string
        console.error('❌ updateMultipleRecordsStatusAsync.rejected:', action.payload)
      })
      
      // Fetch records by sapCode
      .addCase(fetchRecordsBySapCode.pending, (state) => {
        state.fetchingRecords = true
        state.error = null
      })
      .addCase(fetchRecordsBySapCode.fulfilled, (state, action) => {
        state.fetchingRecords = false
        state.sapCodeRecords = action.payload.records || []
        state.sapCodePagination = action.payload.pagination || null
        state.sapCodeSummary = action.payload.summary || null
      })
      .addCase(fetchRecordsBySapCode.rejected, (state, action) => {
        state.fetchingRecords = false
        state.error = action.payload as string
      })

      // Fetch all records by module
      .addCase(fetchAllRecordsByModule.pending, (state) => {
        state.fetchingRecords = true
        state.error = null
      })
      .addCase(fetchAllRecordsByModule.fulfilled, (state, action) => {
        state.fetchingRecords = false
        console.log("🔍 fetchAllRecordsByModule.fulfilled - Registros recibidos:", action.payload.length)
        console.log("🔍 fetchAllRecordsByModule.fulfilled - Registros antes:", state.individualRecords.length)
        
        // Agregar los registros al estado individualRecords, evitando duplicados
        action.payload.forEach((newRecord: any) => {
          const existingIndex = state.individualRecords.findIndex(r => (r._id || r.id) === (newRecord._id || newRecord.id))
          if (existingIndex >= 0) {
            state.individualRecords[existingIndex] = newRecord
          } else {
            state.individualRecords.push(newRecord)
          }
        })
        
        console.log("🔍 fetchAllRecordsByModule.fulfilled - Registros después:", state.individualRecords.length)
      })
      .addCase(fetchAllRecordsByModule.rejected, (state, action) => {
        state.fetchingRecords = false
        state.error = action.payload as string
      })

      // Update invoice
      .addCase(updateInvoiceAsync.pending, (state) => {
        state.creatingRecords = true
        state.error = null
      })
      .addCase(updateInvoiceAsync.fulfilled, (state, action) => {
        state.creatingRecords = false
        // Actualizar la factura en el estado local
        const updatedInvoice = action.payload
        const invoiceIndex = state.invoices.findIndex(inv =>
          inv.id === updatedInvoice._id || inv.id === updatedInvoice.id
        )
        if (invoiceIndex >= 0) {
          // Actualizar la factura existente con los nuevos datos
          state.invoices[invoiceIndex] = {
            ...state.invoices[invoiceIndex],
            ...updatedInvoice,
            id: updatedInvoice._id || updatedInvoice.id
          }
          console.log("✅ updateInvoiceAsync.fulfilled - Factura actualizada en estado:", updatedInvoice)
        } else {
          console.warn("⚠️ updateInvoiceAsync.fulfilled - Factura no encontrada en estado:", updatedInvoice._id || updatedInvoice.id)
        }
      })
      .addCase(updateInvoiceAsync.rejected, (state, action) => {
        state.creatingRecords = false
        state.error = action.payload as string
        console.error("❌ updateInvoiceAsync.rejected:", action.payload)
      })

      // Delete invoice
      .addCase(deleteInvoiceAsync.pending, (state) => {
        state.creatingRecords = true // Assuming creatingRecords is used for deletion
        state.error = null
      })
      .addCase(deleteInvoiceAsync.fulfilled, (state, action) => {
        state.creatingRecords = false
        // Remove the deleted invoice from the state
        state.invoices = state.invoices.filter(inv => inv.id !== action.payload.invoiceId)
        // Release records associated with the deleted invoice
        state.individualRecords = state.individualRecords.map(record => {
          if (record.invoiceId === action.payload.invoiceId) {
            record.status = "pendiente"
            record.invoiceId = undefined
          }
          return record
        })
      })
      .addCase(deleteInvoiceAsync.rejected, (state, action) => {
        state.creatingRecords = false
        state.error = action.payload as string
      })

      // Delete record
      .addCase(deleteRecordAsync.pending, (state) => {
        state.creatingRecords = true // Assuming creatingRecords is used for deletion
        state.error = null
      })
      .addCase(deleteRecordAsync.fulfilled, (state, action) => {
        state.creatingRecords = false
        const deletedRecordId = action.payload.recordId
        
        console.log("🗑️ Eliminando registro del estado local:", deletedRecordId)
        console.log("🗑️ Registros antes de eliminar:", state.individualRecords.length)
        
        // Remove the deleted record from the state using multiple ID fields
        state.individualRecords = state.individualRecords.filter(record => {
          const shouldKeep = record.id !== deletedRecordId && 
                           record._id !== deletedRecordId &&
                           record.id !== deletedRecordId.toString()
          if (!shouldKeep) {
            console.log("🗑️ Registro eliminado del estado:", record.id, record._id)
          }
          return shouldKeep
        })
        
        console.log("🗑️ Registros después de eliminar:", state.individualRecords.length)
        
        // También eliminar de pendingRecordsByModule para todos los módulos
        Object.keys(state.pendingRecordsByModule).forEach(module => {
          const beforeCount = state.pendingRecordsByModule[module].length
          state.pendingRecordsByModule[module] = state.pendingRecordsByModule[module].filter(
            record => record.id !== deletedRecordId && 
                     record._id !== deletedRecordId &&
                     record.id !== deletedRecordId.toString()
          )
          const afterCount = state.pendingRecordsByModule[module].length
          if (beforeCount !== afterCount) {
            console.log(`🗑️ Eliminados ${beforeCount - afterCount} registros del módulo ${module}`)
          }
        })
      })
      .addCase(deleteRecordAsync.rejected, (state, action) => {
        state.creatingRecords = false
        state.error = action.payload as string
      })

      // Gastos Autoridades
      .addCase(createAutoridadesRecords.pending, (state) => {
        state.creatingRecords = true
        state.error = null
      })
      .addCase(createAutoridadesRecords.fulfilled, (state, action) => {
        state.creatingRecords = false
        state.autoridadesRecords.push(...action.payload)
      })
      .addCase(createAutoridadesRecords.rejected, (state, action) => {
        state.creatingRecords = false
        state.error = action.payload as string
      })

      .addCase(fetchAutoridadesRecords.pending, (state) => {
        state.fetchingRecords = true
        state.error = null
      })
      .addCase(fetchAutoridadesRecords.fulfilled, (state, action) => {
        state.fetchingRecords = false
        state.autoridadesRecords = action.payload
      })
      .addCase(fetchAutoridadesRecords.rejected, (state, action) => {
        state.fetchingRecords = false
        state.error = action.payload as string
      })

      .addCase(deleteAutoridadesRecord.pending, (state) => {
        state.creatingRecords = true
        state.error = null
      })
      .addCase(deleteAutoridadesRecord.fulfilled, (state, action) => {
        state.creatingRecords = false
        state.autoridadesRecords = state.autoridadesRecords.filter(r => r._id !== action.payload)
      })
      .addCase(deleteAutoridadesRecord.rejected, (state, action) => {
        state.creatingRecords = false
        state.error = action.payload as string
      })
      
      // Update multiple autoridades records status
      .addCase(updateMultipleAutoridadesStatusAsync.fulfilled, (state, action) => {
        const { recordIds, status, invoiceId } = action.payload
        // Actualizar los registros de autoridades en el estado local
        recordIds.forEach((recordId) => {
          const record = state.autoridadesRecords.find((r) => (r._id || r.id) === recordId)
          if (record) {
            record.status = status as any
            record.invoiceId = invoiceId
          }
        })
        
        console.log(`🔍 updateMultipleAutoridadesStatusAsync.fulfilled - ${recordIds.length} registros de autoridades actualizados a ${status}`)
      })
      .addCase(updateMultipleAutoridadesStatusAsync.rejected, (state, action) => {
        state.error = action.payload as string
        console.error('❌ updateMultipleAutoridadesStatusAsync.rejected:', action.payload)
      })
  },
})

export const { 
  addRecords, 
  updateRecord, 
  markRecordsAsPrefacturado,
  markRecordsAsInvoiced, 
  addInvoice, 
  updateInvoiceStatus, 
  releaseRecordsFromInvoice,
  setLoading, 
  setError,
  clearRecords,
  setRecords
} = recordsSlice.actions



// Selectores actualizados
export const selectAllIndividualRecords = (state: RootState) => state.records.individualRecords
export const selectAllInvoices = (state: RootState) => state.records.invoices
export const selectRecordsLoading = (state: RootState) => state.records.fetchingRecords
export const selectRecordsError = (state: RootState) => state.records.error
export const selectCreatingRecords = (state: RootState) => state.records.creatingRecords
export const selectSapCodeRecords = (state: RootState) => state.records.sapCodeRecords
export const selectSapCodePagination = (state: RootState) => state.records.sapCodePagination
export const selectSapCodeSummary = (state: RootState) => state.records.sapCodeSummary
export const selectAutoridadesRecords = (state: RootState) => state.records.autoridadesRecords

export const selectRecordsByModule = createSelector(
  [
    (state: RootState) => state.records.individualRecords,
    (state: RootState, moduleName: ExcelRecord["module"]) => moduleName
  ],
  (individualRecords, moduleName) =>
    individualRecords.filter((record: any) => record.module?.toLowerCase() === moduleName?.toLowerCase())
)

export const selectPendingRecordsByModule = createSelector(
  [
    (state: RootState) => state.records.individualRecords,
    (state: RootState, moduleName: ExcelRecord["module"]) => moduleName
  ],
  (individualRecords, moduleName) =>
    individualRecords.filter((record: any) => record.module?.toLowerCase() === moduleName?.toLowerCase() && record.status === "pendiente")
)

export const selectPendingRecordsByModuleFromDB = createSelector(
  [(state: RootState) => state.records.pendingRecordsByModule, (state: RootState, moduleName: ExcelRecord["module"]) => moduleName],
  (pendingRecordsByModule, moduleName) => 
    pendingRecordsByModule[moduleName] || []
)

export const selectInvoicesByModule = createSelector(
  [(state: RootState) => state.records.invoices, (state: RootState, moduleName: InvoiceRecord["module"]) => moduleName],
  (invoices, moduleName) =>
    invoices.filter((invoice: any) => invoice.module?.toLowerCase() === moduleName?.toLowerCase())
)

export default recordsSlice.reducer
export interface PersistedInvoiceRecord {
  id: string
  module: "trucking" | "ptyss"
  invoiceNumber: string
  clientName: string
  clientRuc: string
  clientSapNumber?: string
  issueDate: string
  dueDate: string
  currency: string
  subtotal: number
  taxAmount: number
  totalAmount: number
  status: "prefactura" | "facturada" | "anulada"
  xmlData: string
  pdfData?: Blob // Agregar campo para PDF
  relatedRecordIds: string[]
  notes?: string
  details?: Record<string, any>
  // Campos de descuento - NUEVO (agregado 2026-01-08)
  discountAmount?: number
  discountDescription?: string
  createdAt: string
  updatedAt?: string
}
