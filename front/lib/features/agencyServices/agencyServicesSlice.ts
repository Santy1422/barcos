import { createSlice, createAsyncThunk, type PayloadAction } from "@reduxjs/toolkit";
import { createApiUrl } from '@/lib/api-config';

// Interface para cliente (referencia)
export interface Client {
  _id: string;
  name: string;
  tradeName?: string;
  ruc: string;
  sapCode: string;
  email: string;
  phone?: string;
  status: 'active' | 'inactive';
}

// Interface para archivo adjunto
export interface ServiceAttachment {
  fileName: string;
  fileUrl: string;
  uploadDate: string;
}

// Interface para servicio de Agency
export interface AgencyService {
  _id: string;
  module: 'AGENCY';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'prefacturado' | 'facturado' | 'nota_de_credito';
  
  // Fechas
  serviceDate: string;
  pickupDate: string;
  pickupTime: string;
  
  // Ubicaciones
  pickupLocation: string;
  dropoffLocation: string;
  returnDropoffLocation?: string; // For Round Trip
  
  // Información del buque
  vessel: string;
  voyage?: string;
  
  // Información de la tripulación (Legacy)
  crewName?: string;
  crewRank?: string;
  nationality?: string;
  
  // Crew Members (Nuevo - array de crew members)
  crewMembers?: Array<{
    id: string;
    name: string;
    nationality: string;
    crewRank: string;
    crewCategory: string;
    status: 'Visit' | 'On Signer';
    flight: string;
  }>;
  
  // Move type
  moveType?: 'RT' | 'SINGLE' | 'INTERNAL' | 'BAGS_CLAIM' | 'DOCUMENTATION';
  passengerCount?: number;
  
  // Información del transporte
  transportCompany?: string;
  driverName?: string;
  flightInfo?: string;
  
  // Detalles del servicio
  waitingTime: number;
  comments?: string;
  notes?: string;
  serviceCode?: string;
  
  // Pricing
  price?: number;
  currency: string;
  
  // Cliente
  clientId: string | Client;
  clientName?: string;
  
  // XML Data
  xmlData?: {
    xml: string;
    fileName: string;
    generatedAt: string;
  };
  
  // Referencias de facturación
  prefacturaId?: string;
  invoiceId?: string;
  sapDocumentNumber?: string;
  
  // Archivos adjuntos
  attachments: ServiceAttachment[];
  
  // Auditoría
  createdBy?: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
}

// Interface para crear/actualizar servicio
export interface AgencyServiceInput {
  pickupDate: string;
  pickupTime: string;
  pickupLocation: string;
  dropoffLocation: string;
  returnDropoffLocation?: string; // For Round Trip
  vessel: string;
  voyage?: string;
  
  // Crew information - legacy
  crewName?: string;
  crewRank?: string;
  nationality?: string;
  
  // Crew Members (Nuevo)
  crewMembers?: Array<{
    id: string;
    name: string;
    nationality: string;
    crewRank: string;
    crewCategory: string;
    status: 'Visit' | 'On Signer';
    flight: string;
  }>;
  
  // Move type
  moveType?: 'RT' | 'SINGLE' | 'INTERNAL' | 'BAGS_CLAIM' | 'DOCUMENTATION';
  passengerCount?: number;
  
  // Client (required)
  clientId: string;
  
  // Transport
  transportCompany?: string;
  driver?: string;
  driverName?: string;
  flightInfo?: string;
  approve?: boolean;
  
  // Service details
  waitingTime?: number;
  comments?: string;
  serviceCode?: string;
  
  // Pricing
  price?: number;
  currency?: string;
}

// Interface para filtros de búsqueda
export interface AgencyServiceFilters {
  status?: string;
  clientId?: string;
  pickupLocation?: string;
  dropoffLocation?: string;
  vessel?: string;
  crewName?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}

// Interface para parámetros de fetch
export interface FetchServicesParams {
  page?: number;
  limit?: number;
  filters?: AgencyServiceFilters;
}

// Interface para respuesta paginada
export interface ServicesResponse {
  services: AgencyService[];
  totalPages: number;
  currentPage: number;
  totalServices: number;
  filters: AgencyServiceFilters;
}

// Interface para actualizar estado
export interface UpdateStatusParams {
  id: string;
  status: 'pending' | 'in_progress' | 'completed';
}

// Interface para actualizar servicio
export interface UpdateServiceParams {
  id: string;
  updateData: Partial<AgencyServiceInput>;
}

// Interface para estadísticas
export interface AgencyStatistics {
  totalServices: number;
  servicesByStatus: {
    pending: number;
    inProgress: number;
    completed: number;
    invoiced: number;
  };
  topVessels: Array<{ _id: string; count: number }>;
  topRoutes: Array<{ _id: { pickup: string; dropoff: string }; count: number }>;
  period: {
    startDate?: string;
    endDate?: string;
  };
}

// Interface para generación de XML SAP
export interface SapXmlGenerationRequest {
  serviceIds: string[];
  invoiceNumber: string;
  invoiceDate: string;
  postingDate?: string;
  xmlContent: string; // XML pre-generado desde el frontend
  trk137Amount: number; // Monto para el servicio TRK137
}

export interface SapXmlGenerationResponse {
  success: boolean;
  data: {
    xmlContent: string;
    fileName: string;
    filePath: string;
    invoiceNumber: string;
    invoiceDate: string;
    totalAmount: string;
    servicesCount: number;
    servicesUpdated: number;
  };
  message: string;
}

// Interface para servicios listos para facturar
export interface ReadyForInvoiceResponse {
  success: boolean;
  data: {
    services: AgencyService[];
    totalServices: number;
    totalAmount: string;
    groupedByVessel: Record<string, {count: number; amount: number; services: string[]}>;
    groupedByClient: Record<string, {count: number; amount: number; services: string[]}>;
    averageServiceValue: string;
    dateRange: {
      earliest: string | null;
      latest: string | null;
    };
  };
  filters: any;
  readyForInvoice: boolean;
}

// Interface para estado de pricing
export interface PricingState {
  currentPrice: number;
  priceBreakdown: {
    baseRate: number;
    waitingTime: number;
    extraPassengers: number;
  };
  isCalculating: boolean;
  lastCalculation: PriceCalculationResponse['pricing'] | null;
  routeFound: boolean;
  description: string;
  error: string | null;
}

// Interface para estado SAP
export interface SapIntegrationState {
  xmlGenerated: boolean;
  xmlContent: string | null;
  fileName: string | null;
  totalAmount: number;
  lastInvoiceNumber: string | null;
  readyForInvoice: AgencyService[];
  sapLoading: boolean;
  sapError: string | null;
}

// ==================== INVOICES INTERFACES ====================

export interface AgencyInvoice {
  _id: string;
  id?: string;
  module: 'AGENCY';
  invoiceNumber: string;
  status: 'prefactura' | 'facturada';
  
  // Client
  clientId: string;
  clientName: string;
  clientRuc?: string;
  clientSapNumber: string;
  
  // Services
  relatedServiceIds: string[];
  
  // Financial
  totalAmount: number;
  currency: string;
  
  // Dates
  issueDate: string;
  dueDate?: string;
  
  // SAP
  xmlData?: {
    xml: string;
    fileName: string;
    generatedAt: string;
  };
  sentToSap: boolean;
  sentToSapAt?: string;
  sapFileName?: string;
  sapLogs?: Array<{
    timestamp: string;
    level: 'info' | 'success' | 'error';
    message: string;
    details?: any;
  }>;
  
  // Details
  details?: {
    additionalServices?: Array<{
      id: string;
      name: string;
      description: string;
      amount: number;
    }>;
    notes?: string;
    trk137Amount?: number;
    trk137Description?: string;
  };
  
  // Audit
  createdBy?: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateInvoiceParams {
  invoiceNumber: string;
  clientId: string;
  relatedServiceIds: string[];
  issueDate: string;
  dueDate?: string;
  details?: AgencyInvoice['details'];
}

export interface UpdateInvoiceParams {
  id: string;
  updates: Partial<AgencyInvoice>;
}

export interface FacturarInvoiceParams {
  id: string;
  xmlData?: {
    xml: string;
    fileName?: string;
  };
  newInvoiceNumber?: string;
  invoiceDate?: string;
}

export interface InvoiceFilters {
  status?: 'all' | 'prefactura' | 'facturada';
  clientId?: string;
  startDate?: string;
  endDate?: string;
}

export interface FetchInvoicesParams {
  page?: number;
  limit?: number;
  filters?: InvoiceFilters;
}

export interface InvoicesResponse {
  success: boolean;
  invoices: AgencyInvoice[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalInvoices: number;
    limit: number;
  };
}

// State structure
interface AgencyServicesState {
  // Servicios principales
  services: AgencyService[];
  currentService: AgencyService | null;
  
  // Paginación y filtros
  totalPages: number;
  currentPage: number;
  totalServices: number;
  filters: AgencyServiceFilters;
  
  // Estados UI
  loading: boolean;
  error: string | null;
  isCreating: boolean;
  isUpdating: boolean;
  
  // Estados de modales
  showViewModal: boolean;
  showEditModal: boolean;
  showStatusModal: boolean;
  selectedServiceId: string | null;
  
  // Estadísticas
  statistics: AgencyStatistics | null;
  statisticsLoading: boolean;
  
  // Pricing automático
  pricing: PricingState;
  
  // Integración SAP
  sapIntegration: SapIntegrationState;
  
  // Invoices
  invoices: AgencyInvoice[];
  currentInvoice: AgencyInvoice | null;
  invoicesLoading: boolean;
  invoicesError: string | null;
  invoicesPagination: {
    currentPage: number;
    totalPages: number;
    totalInvoices: number;
    limit: number;
  } | null;
}

// Estado inicial
const initialState: AgencyServicesState = {
  services: [],
  currentService: null,
  totalPages: 0,
  currentPage: 1,
  totalServices: 0,
  filters: {},
  loading: false,
  error: null,
  isCreating: false,
  isUpdating: false,
  showViewModal: false,
  showEditModal: false,
  showStatusModal: false,
  selectedServiceId: null,
  statistics: null,
  statisticsLoading: false,
  pricing: {
    currentPrice: 0,
    priceBreakdown: {
      baseRate: 0,
      waitingTime: 0,
      extraPassengers: 0
    },
    isCalculating: false,
    lastCalculation: null,
    routeFound: false,
    description: '',
    error: null
  },
  sapIntegration: {
    xmlGenerated: false,
    xmlContent: null,
    fileName: null,
    totalAmount: 0,
    lastInvoiceNumber: null,
    readyForInvoice: [],
    sapLoading: false,
    sapError: null,
  },
  
  // Invoices initial state
  invoices: [],
  currentInvoice: null,
  invoicesLoading: false,
  invoicesError: null,
  invoicesPagination: null,
};

// Async thunks

// Obtener servicios con filtros
export const fetchAgencyServices = createAsyncThunk(
  'agencyServices/fetchAgencyServices',
  async (params: FetchServicesParams = {}, { rejectWithValue }) => {
    try {
      const { page = 1, limit = 10, filters = {} } = params;
      
      // Construir query params
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      
      // Agregar filtros
      Object.entries(filters).forEach(([key, value]) => {
        if (value) {
          // If statusIn is an array, convert to JSON string
          if (key === 'statusIn' && Array.isArray(value)) {
            queryParams.append(key, JSON.stringify(value));
          } else {
            queryParams.append(key, value);
          }
        }
      });
      
      const response = await fetch(createApiUrl(`/api/agency/services?${queryParams}`), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch services');
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

// Crear nuevo servicio
export const createAgencyService = createAsyncThunk(
  'agencyServices/createAgencyService',
  async (serviceData: AgencyServiceInput, { rejectWithValue }) => {
    try {
      const response = await fetch(createApiUrl('/api/agency/services'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(serviceData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create service');
      }
      
      const data = await response.json();
      // El backend devuelve { error: false, payload: { success: true, service: {...} } }
      const service = data.payload?.service || data.service;
      return service as AgencyService;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

// Actualizar servicio
export const updateAgencyService = createAsyncThunk(
  'agencyServices/updateAgencyService',
  async ({ id, updateData }: UpdateServiceParams, { rejectWithValue }) => {
    try {
      console.log('updateAgencyService called with:', { id, updateData });
      const response = await fetch(createApiUrl(`/api/agency/services/${id}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(updateData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('updateAgencyService failed:', errorData);
        throw new Error(errorData.message || 'Failed to update service');
      }
      
      const data = await response.json();
      console.log('updateAgencyService response:', data);
      
      // El backend devuelve { error: false, payload: { success: true, service: {...} } }
      const service = data.payload?.service || data.service;
      
      if (!service) {
        console.error('No service in response:', data);
        throw new Error('Service data missing from response');
      }
      
      return service as AgencyService;
    } catch (error) {
      console.error('updateAgencyService error:', error);
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

// Actualizar estado del servicio
export const updateServiceStatus = createAsyncThunk(
  'agencyServices/updateServiceStatus',
  async ({ id, status }: UpdateStatusParams, { rejectWithValue }) => {
    try {
      console.log('Updating service status:', { id, status });
      const response = await fetch(createApiUrl(`/api/agency/services/${id}/status`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ status })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Status update failed:', errorData);
        throw new Error(errorData.message || 'Failed to update service status');
      }
      
      const data = await response.json();
      console.log('Status update response:', data);
      return data.payload?.service || data.service as AgencyService;
    } catch (error) {
      console.error('Status update error:', error);
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

// Eliminar servicio
export const deleteAgencyService = createAsyncThunk(
  'agencyServices/deleteAgencyService',
  async (id: string, { rejectWithValue }) => {
    try {
      // Agregar parámetro hardDelete=true para eliminación permanente
      const response = await fetch(createApiUrl(`/api/agency/services/${id}?hardDelete=true`), {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete service');
      }
      
      return id;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

// Obtener servicio por ID
export const fetchServiceById = createAsyncThunk(
  'agencyServices/fetchServiceById',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await fetch(createApiUrl(`/api/agency/services/${id}`), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch service');
      }
      
      const data = await response.json();
      // El backend devuelve { error: false, payload: { data: service } }
      const service = data.payload?.data || data.data || data;
      return service;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

// Obtener estadísticas
export const fetchAgencyStatistics = createAsyncThunk(
  'agencyServices/fetchAgencyStatistics',
  async (params: { startDate?: string; endDate?: string; clientId?: string } = {}, { rejectWithValue }) => {
    try {
      const queryParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value) {
          queryParams.append(key, value);
        }
      });
      
      const response = await fetch(createApiUrl(`/api/agency/services/statistics?${queryParams}`), {
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
      // El backend devuelve { error: false, payload: { data: {...} } }
      const statistics = data.payload?.data || data.data || data;
      return statistics;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

// ========== ASYNC THUNKS PRICING ==========

// Interface para calcular precio
export interface PriceCalculationRequest {
  pickupLocation: string;
  dropoffLocation: string;
  returnDropoffLocation?: string; // For Round Trip
  routeType?: 'single' | 'roundtrip';
  serviceCode?: string;
  waitingTime?: number;
  passengerCount?: number;
}

export interface PriceCalculationResponse {
  success: boolean;
  pricing: {
    basePrice: number;
    waitingTimeCharge?: number;
    passengerSurcharge?: number;
    totalPrice: number;
    description?: string;
    routeFound: boolean;
    breakdown: {
      baseRate: number;
      waitingTime: number;
      extraPassengers: number;
    };
  };
}

// Calcular precio automático para un servicio usando rutas
export const calculateServicePrice = createAsyncThunk(
  'agencyServices/calculateServicePrice',
  async (priceData: PriceCalculationRequest, { rejectWithValue }) => {
    try {
      const response = await fetch(createApiUrl('/api/agency/routes/calculate-price'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          pickupLocation: priceData.pickupLocation,
          dropoffLocation: priceData.dropoffLocation,
          returnDropoffLocation: priceData.returnDropoffLocation, // Add return location for Round Trip
          routeType: priceData.routeType || 'single',
          passengerCount: priceData.passengerCount || 1,
          waitingTimeHours: priceData.waitingTime || 0
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to calculate service price');
      }
      
      const data = await response.json();
      
      // Transform response to match expected format
      return {
        success: data.success,
        pricing: {
          basePrice: data.payload?.price || 0,
          totalPrice: data.payload?.price || 0,
          routeFound: data.payload?.found || false,
          breakdown: {
            baseRate: data.payload?.breakdown?.basePrice || 0,
            waitingTime: data.payload?.breakdown?.waitingTime || 0,
            extraPassengers: data.payload?.breakdown?.extraPassengers || 0
          }
        }
      } as PriceCalculationResponse;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

// ========== ASYNC THUNKS SAP ==========

// Obtener servicios listos para facturar
export const fetchServicesReadyForInvoice = createAsyncThunk(
  'agencyServices/fetchServicesReadyForInvoice',
  async (filters: { 
    clientId?: string; 
    startDate?: string; 
    endDate?: string;
    vessel?: string;
    pickupLocation?: string;
  } = {}, { rejectWithValue }) => {
    try {
      const queryParams = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== 'all') {
          queryParams.append(key, value);
        }
      });
      
      const response = await fetch(createApiUrl(`/api/agency/sap/ready-for-invoice?${queryParams}`), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch services ready for invoice');
      }
      
      const data = await response.json();
      return data as ReadyForInvoiceResponse;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

// Generar XML SAP
export const generateSapXml = createAsyncThunk(
  'agencyServices/generateSapXml',
  async (invoiceData: SapXmlGenerationRequest, { rejectWithValue }) => {
    try {
      const response = await fetch(createApiUrl('/api/agency/sap/generate-xml'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(invoiceData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate SAP XML');
      }
      
      const data = await response.json();
      return data as SapXmlGenerationResponse;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

// Descargar XML SAP
export const downloadSapXml = createAsyncThunk(
  'agencyServices/downloadSapXml',
  async (fileName: string, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      console.log('Downloading XML:', fileName, 'with token:', token ? 'exists' : 'missing');
      
      const response = await fetch(createApiUrl(`/api/agency/sap/download/${fileName}`), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Download error:', errorData);
        throw new Error(errorData.error || 'Failed to download SAP XML');
      }
      
      // Obtener el blob del archivo
      const blob = await response.blob();
      
      // Crear un enlace de descarga
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      return { fileName, downloaded: true };
    } catch (error) {
      console.error('Download XML error:', error);
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

// Obtener historial de XMLs SAP
export const fetchSapXmlHistory = createAsyncThunk(
  'agencyServices/fetchSapXmlHistory',
  async (params: { page?: number; limit?: number } = {}, { rejectWithValue }) => {
    try {
      const queryParams = new URLSearchParams({
        page: (params.page || 1).toString(),
        limit: (params.limit || 20).toString()
      });
      
      const response = await fetch(createApiUrl(`/api/agency/sap/history?${queryParams}`), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch SAP XML history');
      }
      
      const data = await response.json();
      return data.data;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

// ==================== INVOICES THUNKS ====================

// Fetch all invoices
export const fetchAgencyInvoices = createAsyncThunk<InvoicesResponse, FetchInvoicesParams | undefined>(
  'agencyServices/fetchInvoices',
  async (params = {}, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      const { page = 1, limit = 100, filters = {} } = params;
      
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      
      // Add filters to query params
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== 'all') {
          queryParams.append(key, value as string);
        }
      });
      
      const response = await fetch(
        createApiUrl(`/api/agency/invoices?${queryParams}`),
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch invoices');
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

// Create invoice
export const createAgencyInvoice = createAsyncThunk<AgencyInvoice, CreateInvoiceParams>(
  'agencyServices/createInvoice',
  async (invoiceData, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(
        createApiUrl('/api/agency/invoices'),
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(invoiceData)
        }
      );
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create invoice');
      }
      
      const data = await response.json();
      return data.invoice;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

// Update invoice
export const updateAgencyInvoice = createAsyncThunk<AgencyInvoice, UpdateInvoiceParams>(
  'agencyServices/updateInvoice',
  async ({ id, updates }, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(
        createApiUrl(`/api/agency/invoices/${id}`),
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(updates)
        }
      );
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update invoice');
      }
      
      const data = await response.json();
      return data.invoice;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

// Delete invoice
export const deleteAgencyInvoice = createAsyncThunk<string, string>(
  'agencyServices/deleteInvoice',
  async (id, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(
        createApiUrl(`/api/agency/invoices/${id}`),
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete invoice');
      }
      
      return id;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

// Facturar invoice
export const facturarAgencyInvoice = createAsyncThunk<AgencyInvoice, FacturarInvoiceParams>(
  'agencyServices/facturarInvoice',
  async (params, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(
        createApiUrl(`/api/agency/invoices/${params.id}/facturar`),
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            xmlData: params.xmlData,
            newInvoiceNumber: params.newInvoiceNumber,
            invoiceDate: params.invoiceDate
          })
        }
      );
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to facturar invoice');
      }
      
      const data = await response.json();
      return data.invoice;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

// Slice
const agencyServicesSlice = createSlice({
  name: 'agencyServices',
  initialState,
  reducers: {
    // Gestión de servicios
    setServices: (state, action: PayloadAction<AgencyService[]>) => {
      state.services = action.payload;
    },
    
    addService: (state, action: PayloadAction<AgencyService>) => {
      state.services.unshift(action.payload);
      state.totalServices += 1;
    },
    
    updateService: (state, action: PayloadAction<AgencyService>) => {
      const index = state.services.findIndex(s => s._id === action.payload._id);
      if (index !== -1) {
        state.services[index] = action.payload;
      }
      if (state.currentService?._id === action.payload._id) {
        state.currentService = action.payload;
      }
    },
    
    removeService: (state, action: PayloadAction<string>) => {
      state.services = state.services.filter(s => s._id !== action.payload);
      state.totalServices = Math.max(0, state.totalServices - 1);
      if (state.currentService?._id === action.payload) {
        state.currentService = null;
      }
    },
    
    // Gestión del servicio actual
    setCurrentService: (state, action: PayloadAction<AgencyService | null>) => {
      state.currentService = action.payload;
    },
    
    clearCurrentService: (state) => {
      state.currentService = null;
    },
    
    // Gestión de filtros
    setFilters: (state, action: PayloadAction<AgencyServiceFilters>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    
    clearFilters: (state) => {
      state.filters = {};
    },
    
    // Gestión de paginación
    setPagination: (state, action: PayloadAction<{ page: number; totalPages: number; totalServices: number }>) => {
      state.currentPage = action.payload.page;
      state.totalPages = action.payload.totalPages;
      state.totalServices = action.payload.totalServices;
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
      state.selectedServiceId = action.payload;
    },
    
    openEditModal: (state, action: PayloadAction<string>) => {
      state.showEditModal = true;
      state.selectedServiceId = action.payload;
    },
    
    openStatusModal: (state, action: PayloadAction<string>) => {
      state.showStatusModal = true;
      state.selectedServiceId = action.payload;
    },
    
    closeModals: (state) => {
      state.showViewModal = false;
      state.showEditModal = false;
      state.showStatusModal = false;
      state.selectedServiceId = null;
    },
    
    setSelectedService: (state, action: PayloadAction<string | null>) => {
      state.selectedServiceId = action.payload;
    },
    
    // ========== PRICING REDUCERS ==========
    
    // Limpiar estado de pricing
    clearPricingState: (state) => {
      state.pricing = {
        currentPrice: 0,
        priceBreakdown: {
          baseRate: 0,
          waitingTime: 0,
          extraPassengers: 0
        },
        isCalculating: false,
        lastCalculation: null,
        routeFound: false,
        description: '',
        error: null
      };
    },
    
    // Configurar precio calculado
    setPricing: (state, action: PayloadAction<PriceCalculationResponse['pricing']>) => {
      state.pricing.currentPrice = action.payload.totalPrice;
      state.pricing.priceBreakdown = action.payload.breakdown;
      state.pricing.lastCalculation = action.payload;
      state.pricing.routeFound = action.payload.routeFound;
      state.pricing.description = action.payload.description;
      state.pricing.isCalculating = false;
      state.pricing.error = null;
    },
    
    // Configurar estado loading de pricing
    setPricingLoading: (state, action: PayloadAction<boolean>) => {
      state.pricing.isCalculating = action.payload;
      if (action.payload) {
        state.pricing.error = null;
      }
    },
    
    // Configurar error de pricing
    setPricingError: (state, action: PayloadAction<string | null>) => {
      state.pricing.error = action.payload;
      state.pricing.isCalculating = false;
    },
    
    // ========== SAP REDUCERS ==========
    
    // Limpiar estado SAP
    clearSapState: (state) => {
      state.sapIntegration = {
        xmlGenerated: false,
        xmlContent: null,
        fileName: null,
        totalAmount: 0,
        lastInvoiceNumber: null,
        readyForInvoice: [],
        sapLoading: false,
        sapError: null,
      };
    },
    
    // Configurar estado SAP loading
    setSapLoading: (state, action: PayloadAction<boolean>) => {
      state.sapIntegration.sapLoading = action.payload;
      if (action.payload) {
        state.sapIntegration.sapError = null;
      }
    },
    
    // Configurar error SAP
    setSapError: (state, action: PayloadAction<string | null>) => {
      state.sapIntegration.sapError = action.payload;
      state.sapIntegration.sapLoading = false;
    },
    
    // Actualizar servicios listos para facturar
    setReadyForInvoice: (state, action: PayloadAction<AgencyService[]>) => {
      state.sapIntegration.readyForInvoice = action.payload;
    },
    
    // Marcar XML como generado
    setSapXmlGenerated: (state, action: PayloadAction<{
      fileName: string;
      xmlContent: string;
      totalAmount: number;
      invoiceNumber: string;
    }>) => {
      state.sapIntegration.xmlGenerated = true;
      state.sapIntegration.fileName = action.payload.fileName;
      state.sapIntegration.xmlContent = action.payload.xmlContent;
      state.sapIntegration.totalAmount = action.payload.totalAmount;
      state.sapIntegration.lastInvoiceNumber = action.payload.invoiceNumber;
      state.sapIntegration.sapLoading = false;
      state.sapIntegration.sapError = null;
    },
    
    // Invoice actions
    setCurrentInvoice: (state, action: PayloadAction<AgencyInvoice | null>) => {
      state.currentInvoice = action.payload;
    },
    
    clearInvoicesError: (state) => {
      state.invoicesError = null;
    },
  },
  
  extraReducers: (builder) => {
    // Fetch services
    builder
      .addCase(fetchAgencyServices.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAgencyServices.fulfilled, (state, action) => {
        state.loading = false;
        state.services = action.payload.payload.data.services;
        state.totalPages = action.payload.payload.data.totalPages;
        state.currentPage = action.payload.payload.data.currentPage;
        state.totalServices = action.payload.payload.data.totalServices;
        state.filters = action.payload.payload.data.filters;
      })
      .addCase(fetchAgencyServices.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Create service
      .addCase(createAgencyService.pending, (state) => {
        state.isCreating = true;
        state.error = null;
      })
      .addCase(createAgencyService.fulfilled, (state, action) => {
        state.isCreating = false;
        state.services.unshift(action.payload);
        state.totalServices += 1;
      })
      .addCase(createAgencyService.rejected, (state, action) => {
        state.isCreating = false;
        state.error = action.payload as string;
      })
      
      // Update service
      .addCase(updateAgencyService.pending, (state) => {
        state.isUpdating = true;
        state.error = null;
      })
      .addCase(updateAgencyService.fulfilled, (state, action) => {
        state.isUpdating = false;
        // Safety check for payload
        if (!action.payload || !action.payload._id) {
          console.error('updateAgencyService.fulfilled: payload is missing or invalid', action.payload);
          return;
        }
        const index = state.services.findIndex(s => s && s._id === action.payload._id);
        if (index !== -1) {
          state.services[index] = action.payload;
        }
        if (state.currentService?._id === action.payload._id) {
          state.currentService = action.payload;
        }
      })
      .addCase(updateAgencyService.rejected, (state, action) => {
        state.isUpdating = false;
        state.error = action.payload as string;
      })
      
      // Update status
      .addCase(updateServiceStatus.pending, (state) => {
        state.isUpdating = true;
        state.error = null;
      })
      .addCase(updateServiceStatus.fulfilled, (state, action) => {
        state.isUpdating = false;
        const index = state.services.findIndex(s => s._id === action.payload._id);
        if (index !== -1) {
          state.services[index] = action.payload;
        }
        if (state.currentService?._id === action.payload._id) {
          state.currentService = action.payload;
        }
      })
      .addCase(updateServiceStatus.rejected, (state, action) => {
        state.isUpdating = false;
        state.error = action.payload as string;
      })
      
      // Delete service
      .addCase(deleteAgencyService.pending, (state) => {
        state.error = null;
      })
      .addCase(deleteAgencyService.fulfilled, (state, action) => {
        state.services = state.services.filter(s => s._id !== action.payload);
        state.totalServices = Math.max(0, state.totalServices - 1);
        if (state.currentService?._id === action.payload) {
          state.currentService = null;
        }
      })
      .addCase(deleteAgencyService.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      
      // Fetch service by ID
      .addCase(fetchServiceById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchServiceById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentService = action.payload.payload.data;
      })
      .addCase(fetchServiceById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Fetch statistics
      .addCase(fetchAgencyStatistics.pending, (state) => {
        state.statisticsLoading = true;
        state.error = null;
      })
      .addCase(fetchAgencyStatistics.fulfilled, (state, action) => {
        state.statisticsLoading = false;
        state.statistics = action.payload;
      })
      .addCase(fetchAgencyStatistics.rejected, (state, action) => {
        state.statisticsLoading = false;
        state.error = action.payload as string;
      })
      
      // ========== PRICING EXTRA REDUCERS ==========
      
      // Calculate service price
      .addCase(calculateServicePrice.pending, (state) => {
        state.pricing.isCalculating = true;
        state.pricing.error = null;
      })
      .addCase(calculateServicePrice.fulfilled, (state, action) => {
        state.pricing.isCalculating = false;
        if (action.payload.success) {
          state.pricing.currentPrice = action.payload.pricing.totalPrice;
          state.pricing.priceBreakdown = action.payload.pricing.breakdown;
          state.pricing.lastCalculation = action.payload.pricing;
          state.pricing.routeFound = action.payload.pricing.routeFound;
          state.pricing.description = action.payload.pricing.description;
          state.pricing.error = null;
        } else {
          state.pricing.error = 'Failed to calculate price';
        }
      })
      .addCase(calculateServicePrice.rejected, (state, action) => {
        state.pricing.isCalculating = false;
        state.pricing.error = action.payload as string;
      })
      
      // ========== SAP EXTRA REDUCERS ==========
      
      // Fetch services ready for invoice
      .addCase(fetchServicesReadyForInvoice.pending, (state) => {
        state.sapIntegration.sapLoading = true;
        state.sapIntegration.sapError = null;
      })
      .addCase(fetchServicesReadyForInvoice.fulfilled, (state, action) => {
        state.sapIntegration.sapLoading = false;
        state.sapIntegration.readyForInvoice = action.payload.payload.data.services;
        state.sapIntegration.sapError = null;
      })
      .addCase(fetchServicesReadyForInvoice.rejected, (state, action) => {
        state.sapIntegration.sapLoading = false;
        state.sapIntegration.sapError = action.payload as string;
        state.sapIntegration.readyForInvoice = [];
      })
      
      // Generate SAP XML
      .addCase(generateSapXml.pending, (state) => {
        state.sapIntegration.sapLoading = true;
        state.sapIntegration.sapError = null;
        state.sapIntegration.xmlGenerated = false;
      })
      .addCase(generateSapXml.fulfilled, (state, action) => {
        state.sapIntegration.sapLoading = false;
        state.sapIntegration.xmlGenerated = true;
        state.sapIntegration.xmlContent = action.payload.data.xmlContent;
        state.sapIntegration.fileName = action.payload.data.fileName;
        state.sapIntegration.totalAmount = parseFloat(action.payload.data.totalAmount);
        state.sapIntegration.lastInvoiceNumber = action.payload.data.invoiceNumber;
        state.sapIntegration.sapError = null;
        
        // Actualizar servicios de completed a prefacturado
        // Nota: En la práctica, esto se actualizaría al refrescar los datos
        // pero podemos hacer una actualización optimista aquí
      })
      .addCase(generateSapXml.rejected, (state, action) => {
        state.sapIntegration.sapLoading = false;
        state.sapIntegration.sapError = action.payload as string;
        state.sapIntegration.xmlGenerated = false;
      })
      
      // Download SAP XML
      .addCase(downloadSapXml.pending, (state) => {
        state.sapIntegration.sapLoading = true;
        state.sapIntegration.sapError = null;
      })
      .addCase(downloadSapXml.fulfilled, (state) => {
        state.sapIntegration.sapLoading = false;
        state.sapIntegration.sapError = null;
        // El download fue exitoso, no necesitamos cambiar más estado
      })
      .addCase(downloadSapXml.rejected, (state, action) => {
        state.sapIntegration.sapLoading = false;
        state.sapIntegration.sapError = action.payload as string;
      })
      
      // Fetch SAP XML history
      .addCase(fetchSapXmlHistory.pending, (state) => {
        state.sapIntegration.sapLoading = true;
        state.sapIntegration.sapError = null;
      })
      .addCase(fetchSapXmlHistory.fulfilled, (state) => {
        state.sapIntegration.sapLoading = false;
        state.sapIntegration.sapError = null;
        // Los datos del historial se manejan localmente en el componente
      })
      .addCase(fetchSapXmlHistory.rejected, (state, action) => {
        state.sapIntegration.sapLoading = false;
        state.sapIntegration.sapError = action.payload as string;
      })
      
      // ==================== INVOICES EXTRA REDUCERS ====================
      
      // Fetch invoices
      .addCase(fetchAgencyInvoices.pending, (state) => {
        state.invoicesLoading = true;
        state.invoicesError = null;
      })
      .addCase(fetchAgencyInvoices.fulfilled, (state, action) => {
        state.invoicesLoading = false;
        state.invoices = action.payload.invoices || [];
        state.invoicesPagination = action.payload.pagination;
        state.invoicesError = null;
      })
      .addCase(fetchAgencyInvoices.rejected, (state, action) => {
        state.invoicesLoading = false;
        state.invoicesError = action.payload as string;
      })
      
      // Create invoice
      .addCase(createAgencyInvoice.pending, (state) => {
        state.invoicesLoading = true;
        state.invoicesError = null;
      })
      .addCase(createAgencyInvoice.fulfilled, (state, action) => {
        state.invoicesLoading = false;
        state.invoices.unshift(action.payload);
        state.invoicesError = null;
      })
      .addCase(createAgencyInvoice.rejected, (state, action) => {
        state.invoicesLoading = false;
        state.invoicesError = action.payload as string;
      })
      
      // Update invoice
      .addCase(updateAgencyInvoice.pending, (state) => {
        state.invoicesLoading = true;
        state.invoicesError = null;
      })
      .addCase(updateAgencyInvoice.fulfilled, (state, action) => {
        state.invoicesLoading = false;
        const index = state.invoices.findIndex(inv => (inv._id || inv.id) === (action.payload._id || action.payload.id));
        if (index !== -1) {
          state.invoices[index] = action.payload;
        }
        if (state.currentInvoice && (state.currentInvoice._id === action.payload._id || state.currentInvoice.id === action.payload.id)) {
          state.currentInvoice = action.payload;
        }
        state.invoicesError = null;
      })
      .addCase(updateAgencyInvoice.rejected, (state, action) => {
        state.invoicesLoading = false;
        state.invoicesError = action.payload as string;
      })
      
      // Delete invoice
      .addCase(deleteAgencyInvoice.pending, (state) => {
        state.invoicesLoading = true;
        state.invoicesError = null;
      })
      .addCase(deleteAgencyInvoice.fulfilled, (state, action) => {
        state.invoicesLoading = false;
        state.invoices = state.invoices.filter(inv => (inv._id || inv.id) !== action.payload);
        if (state.currentInvoice && (state.currentInvoice._id === action.payload || state.currentInvoice.id === action.payload)) {
          state.currentInvoice = null;
        }
        state.invoicesError = null;
      })
      .addCase(deleteAgencyInvoice.rejected, (state, action) => {
        state.invoicesLoading = false;
        state.invoicesError = action.payload as string;
      })
      
      // Facturar invoice
      .addCase(facturarAgencyInvoice.pending, (state) => {
        state.invoicesLoading = true;
        state.invoicesError = null;
      })
      .addCase(facturarAgencyInvoice.fulfilled, (state, action) => {
        state.invoicesLoading = false;
        const index = state.invoices.findIndex(inv => (inv._id || inv.id) === (action.payload._id || action.payload.id));
        if (index !== -1) {
          state.invoices[index] = action.payload;
        }
        state.invoicesError = null;
      })
      .addCase(facturarAgencyInvoice.rejected, (state, action) => {
        state.invoicesLoading = false;
        state.invoicesError = action.payload as string;
      });
  },
});

// Export actions
export const {
  setServices,
  addService,
  updateService,
  removeService,
  setCurrentService,
  clearCurrentService,
  setFilters,
  clearFilters,
  setPagination,
  setLoading,
  setError,
  clearError,
  setIsCreating,
  setIsUpdating,
  openViewModal,
  openEditModal,
  openStatusModal,
  closeModals,
  setSelectedService,
  // Pricing actions
  clearPricingState,
  setPricing,
  setPricingLoading,
  setPricingError,
  // SAP actions
  clearSapState,
  setSapLoading,
  setSapError,
  setReadyForInvoice,
  setSapXmlGenerated,
  // Invoice actions
  setCurrentInvoice,
  clearInvoicesError,
} = agencyServicesSlice.actions;

// Export reducer
export default agencyServicesSlice.reducer;