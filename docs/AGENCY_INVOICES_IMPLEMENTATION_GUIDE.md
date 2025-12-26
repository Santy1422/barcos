# Agency Invoices Implementation Guide

## ✅ Completed: Backend (100%)

### 1. Schema Creado ✅
**File:** `api/src/database/schemas/agencyInvoiceSchema.ts`
- Interface `IAgencyInvoice` con todos los campos necesarios
- Schema de Mongoose con validaciones
- Indexes para mejor performance
- Modelo exportado correctamente

### 2. Controladores Creados ✅
**File:** `api/src/controllers/agencyControllers/agencyInvoicesControllers.ts`
- `getAllAgencyInvoices` - GET /api/agency/invoices
- `getAgencyInvoiceById` - GET /api/agency/invoices/:id
- `createAgencyInvoice` - POST /api/agency/invoices
- `updateAgencyInvoice` - PUT /api/agency/invoices/:id
- `deleteAgencyInvoice` - DELETE /api/agency/invoices/:id
- `facturarAgencyInvoice` - POST /api/agency/invoices/:id/facturar

### 3. Rutas Registradas ✅
**File:** `api/src/routes/agencyInvoicesRoutes.ts`
- Todas las rutas con autenticación
- Registradas en `api/src/routes/index.ts` como `/api/agency/invoices`

### 4. Base de Datos Actualizada ✅
**File:** `api/src/database/index.ts`
- Modelo `agencyInvoices` exportado
- Agregado a `getModels()` y type `Models`

---

## 🔨 TODO: Frontend

### 1. Redux Slice - Agregar Interfaces de Invoices
**File:** `front/lib/features/agencyServices/agencyServicesSlice.ts`

Agregar después de la línea 259 (después de `PricingState`):

```typescript
// ==================== INVOICES INTERFACES ====================

export interface AgencyInvoice {
  _id: string;
  id?: string;
  module: 'AGENCY';
  invoiceNumber: string;
  status: 'prefactura' | 'facturada';
  
  // Client
  clientId: string | Client;
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
    fileName: string;
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
  invoices: AgencyInvoice[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalInvoices: number;
    limit: number;
  };
}
```

### 2. Redux Slice - Agregar Async Thunks

Agregar después de los thunks existentes (buscar `createAsyncThunk`):

```typescript
// ==================== INVOICES THUNKS ====================

// Fetch all invoices
export const fetchAgencyInvoices = createAsyncThunk<InvoicesResponse, FetchInvoicesParams | undefined>(
  'agencyServices/fetchInvoices',
  async (params = {}) => {
    const token = localStorage.getItem('token');
    const { page = 1, limit = 100, filters = {} } = params;
    
    const queryParams = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...filters
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
    
    if (!response.ok) throw new Error('Failed to fetch invoices');
    return response.json();
  }
);

// Create invoice
export const createAgencyInvoice = createAsyncThunk<AgencyInvoice, CreateInvoiceParams>(
  'agencyServices/createInvoice',
  async (invoiceData) => {
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
    
    if (!response.ok) throw new Error('Failed to create invoice');
    const data = await response.json();
    return data.invoice;
  }
);

// Update invoice
export const updateAgencyInvoice = createAsyncThunk<AgencyInvoice, UpdateInvoiceParams>(
  'agencyServices/updateInvoice',
  async ({ id, updates }) => {
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
    
    if (!response.ok) throw new Error('Failed to update invoice');
    const data = await response.json();
    return data.invoice;
  }
);

// Delete invoice
export const deleteAgencyInvoice = createAsyncThunk<string, string>(
  'agencyServices/deleteInvoice',
  async (id) => {
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
    
    if (!response.ok) throw new Error('Failed to delete invoice');
    return id;
  }
);

// Facturar invoice
export const facturarAgencyInvoice = createAsyncThunk<AgencyInvoice, FacturarInvoiceParams>(
  'agencyServices/facturarInvoice',
  async (params) => {
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
    
    if (!response.ok) throw new Error('Failed to facturar invoice');
    const data = await response.json();
    return data.invoice;
  }
);
```

### 3. Redux Slice - Agregar Estado de Invoices

En el `interface AgencyServicesState` agregar:

```typescript
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
```

En el `initialState` agregar:

```typescript
// Invoices
invoices: [],
currentInvoice: null,
invoicesLoading: false,
invoicesError: null,
invoicesPagination: null,
```

### 4. Redux Slice - Agregar Reducers

En el `slice.reducers` agregar:

```typescript
// Invoice actions
setCurrentInvoice: (state, action: PayloadAction<AgencyInvoice | null>) => {
  state.currentInvoice = action.payload;
},
clearInvoicesError: (state) => {
  state.invoicesError = null;
},
```

En `extraReducers` agregar los casos para todos los thunks de invoices (buscar patrón en el archivo).

### 5. Hook - Actualizar useAgencyServices

**File:** `front/lib/features/agencyServices/useAgencyServices.ts`

Agregar selectors:

```typescript
const invoices = useSelector((state: AgencyServicesState) => state.agencyServices?.invoices || []);
const currentInvoice = useSelector((state: AgencyServicesState) => state.agencyServices?.currentInvoice);
const invoicesLoading = useSelector((state: AgencyServicesState) => state.agencyServices?.invoicesLoading || false);
const invoicesError = useSelector((state: AgencyServicesState) => state.agencyServices?.invoicesError);
const invoicesPagination = useSelector((state: AgencyServicesState) => state.agencyServices?.invoicesPagination);
```

Agregar acciones al return:

```typescript
// Invoices
invoices,
currentInvoice,
invoicesLoading,
invoicesError,
invoicesPagination,
fetchInvoices: (params?: FetchInvoicesParams) => dispatch(fetchAgencyInvoices(params)),
createInvoice: (params: CreateInvoiceParams) => dispatch(createAgencyInvoice(params)),
updateInvoice: (params: UpdateInvoiceParams) => dispatch(updateAgencyInvoice(params)),
deleteInvoice: (id: string) => dispatch(deleteAgencyInvoice(id)),
facturarInvoice: (params: FacturarInvoiceParams) => dispatch(facturarAgencyInvoice(params)),
setCurrentInvoice: (invoice: AgencyInvoice | null) => dispatch(agencyServicesSlice.actions.setCurrentInvoice(invoice)),
```

---

## 🎨 Modales del Frontend

### 1. AgencyServicesViewModal
**File:** `front/components/agency/agency-services-view-modal.tsx`

**Copiar de:** `front/components/trucking/trucking-records-view-modal.tsx`

**Adaptaciones:**
- Cambiar "registros/contenedores" por "servicios"
- Tabla con columnas: Fecha, Crew Member, Vessel, Route, Move Type, Passengers
- Mostrar datos de `crewMembers` array
- Sin columna de precio (ocultar precios)

### 2. AgencyPdfViewer
**File:** `front/components/agency/agency-pdf-viewer.tsx`

**Copiar de:** `front/components/trucking/trucking-pdf-viewer.tsx`

**Adaptaciones:**
- Usar endpoint `/api/agency/invoices/:id/pdf` (cuando se implemente)
- Mismo diseño de visor PDF

### 3. AgencyXmlViewerModal
**File:** `front/components/agency/agency-xml-viewer-modal.tsx`

**Copiar de:** `front/components/trucking/trucking-xml-viewer-modal.tsx`

**Adaptaciones:**
- Usar `generateAgencyInvoiceXML` en lugar de `generateInvoiceXML`
- Endpoint de envío a SAP: `/api/agency/sap/send-to-sap`
- Logs de envío específicos para Agency

### 4. AgencyPrefacturaEditModal
**File:** `front/components/agency/agency-prefactura-edit-modal.tsx`

**Copiar de:** `front/components/trucking/trucking-prefactura-edit-modal.tsx`

**Adaptaciones:**
- En lugar de seleccionar "registros", seleccionar "servicios completados"
- Mostrar lista de servicios con: Crew, Vessel, Date, Route
- Agregar/quitar servicios
- Editar monto TRK137 (tiempo de espera)
- Editar servicios adicionales
- Calcular total automáticamente

### 5. AgencyFacturacionModal
**File:** `front/components/agency/agency-facturacion-modal.tsx`

**Copiar de:** `front/components/trucking/trucking-facturacion-modal.tsx`

**Adaptaciones:**
- Generar número de factura formato: `AGY-YYYYMMDD-HHMM`
- Generar XML usando `generateAgencyInvoiceXML`
- Llamar a `facturarInvoice` action del Redux
- Preview del XML antes de confirmar
- Botón "Facturar" que convierte prefactura → factura

---

## 🔌 Conectar agency-sap-invoice.tsx

**File:** `front/components/agency/agency-sap-invoice.tsx`

Ya está la estructura básica, falta:

1. Conectar con Redux:
```typescript
const {
  invoices,
  invoicesLoading,
  fetchInvoices,
  deleteInvoice,
  // ...otros
} = useAgencyServices();
```

2. Cargar invoices en useEffect:
```typescript
useEffect(() => {
  fetchInvoices({ page: 1, limit: 100 });
}, [fetchInvoices]);
```

3. Importar y usar los modales:
```typescript
import { AgencyServicesViewModal } from './agency-services-view-modal';
import { AgencyPdfViewer } from './agency-pdf-viewer';
// ...etc

// Agregar al JSX después de la Card principal
<AgencyServicesViewModal 
  open={servicesModalOpen} 
  onOpenChange={setServicesModalOpen} 
  invoice={viewServicesInvoice}
/>
// ...otros modales
```

4. Implementar las funciones de handlers para usar las acciones de Redux en lugar de TODOs.

---

## 📚 Referencias

- **Patrón completo:** `front/components/trucking/trucking-records.tsx`
- **Modales de referencia:** Carpeta `front/components/trucking/`
- **Redux de referencia:** `front/lib/features/records/recordsSlice.ts`

---

## 🚀 Orden de Implementación Recomendado

1. ✅ Backend (Completo)
2. Redux Slice - Interfaces
3. Redux Slice - Thunks
4. Redux Slice - State y Reducers
5. Hook - useAgencyServices updates
6. Modal 1: AgencyServicesViewModal
7. Modal 2: AgencyFacturacionModal
8. Modal 3: AgencyXmlViewerModal
9. Modal 4: AgencyPrefacturaEditModal
10. Modal 5: AgencyPdfViewer
11. Conectar todo en agency-sap-invoice.tsx
12. Testing completo

---

## ✨ Ventajas del Nuevo Sistema

1. **Consistencia Total** con Trucking
2. **Prefacturas y Facturas** en el mismo lugar
3. **Edición fácil** de prefacturas antes de facturar
4. **Trazabilidad completa** con logs de SAP
5. **Sin precios visibles** en lugares no apropiados
6. **Base de datos robusta** con el schema completo

---

*Todo el backend está completo y probado sin errores de linting. El frontend solo necesita seguir el patrón de trucking para completarse rápidamente.*

