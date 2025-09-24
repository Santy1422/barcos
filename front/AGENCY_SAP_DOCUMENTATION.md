# 🚢 Agency Complete System Documentation

## Overview
Complete Agency transportation system with SAP XML integration and automatic pricing based on Taulia Codes and routes. This system provides end-to-end functionality for managing maritime crew transportation services with automated price calculation and SAP invoice generation.

## 📋 System Architecture

### Core Features Overview

1. **🎯 Service Management**: Complete CRUD operations for transportation services
2. **💰 Automatic Pricing**: Real-time price calculation based on routes and Taulia codes
3. **📊 Catalog Management**: Dynamic catalogs for locations, vessels, crew ranks, etc.
4. **🧾 SAP Integration**: XML generation for SAP invoice processing
5. **📈 Statistics & Reporting**: Service analytics and performance metrics
6. **👥 Multi-User Support**: Role-based access control and user management

### Backend Components

#### 💰 Automatic Pricing System

##### Database Schema (`/api/src/database/schemas/agencyCatalogSchema.ts`)
**AgencyCatalog Model** supports multiple catalog types including the new `route_pricing`:

```typescript
export type CatalogType = 
  | 'location'           // Pickup/Dropoff locations (HOTEL PTY, PTY PORT, etc.)
  | 'nationality'        // Crew nationalities
  | 'rank'              // Crew ranks (Captain, Engineer, etc.)
  | 'vessel'            // Ship names and details
  | 'transport_company' // Transportation providers
  | 'driver'            // Driver information with contact details
  | 'taulia_code'       // SAP service codes with pricing
  | 'route_pricing';    // Route-specific pricing rules

interface RouteMetadata {
  fromLocation: string;      // Origin location
  toLocation: string;        // Destination location
  basePrice: number;         // Base transportation fee
  pricePerPerson: number;    // Additional cost per extra passenger (default: $20)
  waitingTimePrice: number;  // Cost per hour of waiting time (default: $10)
  currency: string;          // Currency (USD/PAB)
}
```

**Key Features**:
- ✅ Pre-save middleware for data normalization
- ✅ Custom validation per catalog type
- ✅ Automatic field population with defaults
- ✅ Full-text search capabilities
- ✅ Soft delete functionality

##### Pricing Controllers (`/api/src/controllers/agencyControllers/agencyPricingControllers.ts`)

**Core Functions**:

1. **`calculateServicePrice`** - Main pricing engine:
```typescript
// Priority-based pricing logic:
// 1. Specific route pricing (highest priority)
// 2. Taulia code pricing (medium priority)  
// 3. Default pricing by location types (fallback)

const pricing = {
  basePrice: routePrice || tauliaPrice || defaultPrice,
  waitingTimeCharge: waitingTime * hourlyRate,
  passengerSurcharge: (passengers - 1) * perPersonRate,
  totalPrice: basePrice + waitingTimeCharge + passengerSurcharge
};
```

2. **`seedRoutePricing`** - Populates database with PDF route data:
   - 33 predefined routes from Agency PDF
   - Includes Taulia codes and descriptions
   - Hotel PTY, PTY Port, Colon routes with specific pricing

3. **`getAllRoutePricing`** - Retrieves pricing catalog:
   - Supports grouping by origin location
   - Active/inactive filtering
   - Statistics and analytics

**Default Pricing Matrix**:
```typescript
const defaultPrices = {
  'HOTEL-PORT': 120,    // Hotel to Port transfers
  'HOTEL-AIRPORT': 85,  // Hotel to Airport transfers
  'PORT-HOTEL': 120,    // Port to Hotel transfers
  'AIRPORT-HOTEL': 85,  // Airport to Hotel transfers
  'HOTEL-HOSPITAL': 60, // Medical transfers
  'HOSPITAL-HOTEL': 60, // Medical returns
  'PORT-AIRPORT': 150,  // Port to Airport
  'AIRPORT-PORT': 150,  // Airport to Port
  'HOTEL-HOTEL': 150,   // Hotel transfers
  'PORT-PORT': 180,     // Port to Port
  'DEFAULT': 100        // Generic fallback
};
```

##### Route Pricing API (`/api/src/routes/agencyCatalogsRoutes.ts`)

**Endpoints**:
- `POST /pricing/calculate` - Calculate service price
- `GET /pricing/routes` - Get all route pricing (supports grouping)
- `POST /pricing/routes` - Create new route pricing
- `PUT /pricing/routes/:id` - Update existing route pricing
- `DELETE /pricing/routes/:id` - Soft delete route pricing
- `POST /pricing/seed` - Seed database with PDF pricing data
- `GET /pricing/stats` - Get pricing statistics

**Request/Response Examples**:

```typescript
// Calculate Price Request
POST /api/agency/catalogs/pricing/calculate
{
  "pickupLocation": "HOTEL PTY",
  "dropoffLocation": "PTY PORT", 
  "serviceCode": "ECR000669",
  "waitingTime": 2,
  "passengerCount": 3
}

// Response
{
  "success": true,
  "pricing": {
    "basePrice": 160,           // $120 base + $20 waiting + $20 extra passengers
    "waitingTimeCharge": 20,    // 2 hours * $10/hour
    "passengerSurcharge": 40,   // 2 extra passengers * $20
    "totalPrice": 160,
    "description": "HOTEL PTY → PTY PORT",
    "routeFound": true,
    "breakdown": {
      "baseRate": 120,
      "waitingTime": 20,
      "extraPassengers": 40
    }
  }
}
```

#### 📋 Agency Service Management

##### Service Controllers (`/api/src/controllers/agencyControllers/agencyServicesControllers.ts`)

**Complete CRUD Operations**:
- `getAllServices` - Paginated service listing with filters
- `getServiceById` - Individual service details
- `createService` - New service creation with auto-pricing
- `updateService` - Service modification
- `deleteService` - Soft delete functionality
- `updateServiceStatus` - Status workflow management
- `getServiceStatistics` - Analytics and reporting

**Service Status Workflow**:
```
pending → in_progress → completed → prefacturado → facturado
```

**Advanced Filtering**:
- Date range filtering
- Client-specific filtering  
- Location-based filtering
- Status-based filtering
- Vessel/crew filtering
- Full-text search

##### Service Data Model:
```typescript
interface AgencyService {
  _id: string;
  module: 'AGENCY';
  status: 'pending' | 'in_progress' | 'completed' | 'prefacturado' | 'facturado';
  
  // Service Details
  serviceDate: string;
  pickupDate: string;
  pickupTime: string;
  pickupLocation: string;
  dropoffLocation: string;
  
  // Crew Information
  vessel: string;
  voyage?: string;
  crewName: string;
  crewRank?: string;
  nationality?: string;
  
  // Transportation
  transportCompany?: string;
  driverName?: string;
  flightInfo?: string;
  waitingTime: number;
  
  // Pricing (Auto-calculated)
  price?: number;
  currency: string;
  serviceCode?: string;
  
  // Client & References
  clientId: string | Client;
  prefacturaId?: string;
  invoiceId?: string;
  sapDocumentNumber?: string;
  
  // Metadata
  comments?: string;
  notes?: string;
  attachments: ServiceAttachment[];
  createdBy?: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
}
```

#### 🗂️ Catalog Management

##### Catalog Controllers (`/api/src/controllers/agencyCatalogsControllers/agencyCatalogsControllers.ts`)

**Supported Catalog Types**:
1. **Locations** - Pickup/Dropoff points with site types (HOTEL, PORT, AIRPORT, HOSPITAL)
2. **Nationalities** - Crew nationality options
3. **Ranks** - Maritime crew positions with hierarchy levels
4. **Vessels** - Ship information and company details
5. **Transport Companies** - Transportation service providers
6. **Drivers** - Driver profiles with contact information
7. **Taulia Codes** - SAP service codes with pricing information
8. **Route Pricing** - Specific route pricing rules

**Features**:
- Dynamic catalog creation and management
- Bulk import/export capabilities
- Search and filtering
- Active/inactive status management
- Metadata support for extensible attributes

#### SAP Controllers (`/api/src/controllers/agencyControllers/agencySapControllers.ts`)
- **Main Function**: `generateSapXml` - Generates XML with Agency-specific structure
- **Key Features**:
  - Validates service data before XML generation
  - Creates structured XML following SAP format
  - Updates service statuses to `facturado`
  - Handles date formatting and currency conversion
  - Implements proper error handling and logging

```typescript
// XML Structure for Agency
const xmlData = {
  Invoice: {
    Protocol: 'LOCAL',
    SourceSystem: 'Agency Transportation System',
    CompanyCode: '9326',
    DocumentType: 'XL',
    OtherItems: services.map(service => ({
      ServiceDescription: `${service.crewName} - ${service.vessel}`,
      Route: `${service.pickupLocation} to ${service.dropoffLocation}`,
      Amount: service.price,
      Currency: service.currency || 'USD'
    }))
  }
};
```

#### SAP Routes (`/api/src/routes/agencySapRoutes.ts`)
- **Endpoints**:
  - `POST /generate-xml` - Generate SAP XML for selected services
  - `GET /download/:fileName` - Download generated XML file
  - `GET /ready-for-invoice` - Get services ready for invoicing
  - `GET /history` - SAP generation history
- **Security**: Rate limiting, permission checks, request validation
- **Logging**: Complete operation logging for audit trails

### Frontend Components

#### 🎨 Redux State Management (`/front/lib/features/agencyServices/`)

##### Complete State Structure:
```typescript
interface AgencyServicesState {
  // Core Service Data
  services: AgencyService[];
  currentService: AgencyService | null;
  totalPages: number;
  currentPage: number;
  totalServices: number;
  filters: AgencyServiceFilters;
  
  // UI States
  loading: boolean;
  error: string | null;
  isCreating: boolean;
  isUpdating: boolean;
  
  // Modal States
  showViewModal: boolean;
  showEditModal: boolean;
  showStatusModal: boolean;
  selectedServiceId: string | null;
  
  // Statistics
  statistics: AgencyStatistics | null;
  statisticsLoading: boolean;
  
  // 💰 Automatic Pricing State
  pricing: {
    currentPrice: number;
    priceBreakdown: {
      baseRate: number;
      waitingTime: number;
      extraPassengers: number;
    };
    isCalculating: boolean;
    lastCalculation: PriceCalculationResponse | null;
    routeFound: boolean;
    description: string;
    error: string | null;
  };
  
  // 🧾 SAP Integration State
  sapIntegration: {
    xmlGenerated: boolean;
    xmlContent: string | null;
    fileName: string | null;
    totalAmount: number;
    lastInvoiceNumber: string | null;
    readyForInvoice: AgencyService[];
    sapLoading: boolean;
    sapError: string | null;
  };
}
```

##### Async Actions (`agencyServicesSlice.ts`):

**Core Service Actions**:
- `fetchAgencyServices` - Paginated service fetching with filters
- `createAgencyService` - New service creation with validation
- `updateAgencyService` - Service modification
- `updateServiceStatus` - Status workflow management
- `deleteAgencyService` - Soft delete with confirmation
- `fetchServiceById` - Individual service details
- `fetchAgencyStatistics` - Analytics and reporting

**💰 Pricing Actions**:
- `calculateServicePrice` - Real-time price calculation
```typescript
// Auto-triggered when locations change
const priceRequest = {
  pickupLocation: "HOTEL PTY",
  dropoffLocation: "PTY PORT",
  serviceCode: "ECR000669",
  waitingTime: 2,
  passengerCount: 1
};
dispatch(calculateServicePrice(priceRequest));
```

**🧾 SAP Actions**:
- `fetchServicesReadyForInvoice` - Load completed services
- `generateSapXml` - Create SAP XML files
- `downloadSapXml` - Download generated XML
- `fetchSapXmlHistory` - XML generation history

#### 🎯 Custom Hooks (`/front/lib/features/agencyServices/useAgencyServices.ts`)

**Main Hook Features**:
```typescript
const {
  // Service Data
  services, currentService, loading, error,
  
  // Pagination
  totalPages, currentPage, totalServices,
  
  // 💰 Pricing
  pricing, pricingLoading, currentPrice, priceBreakdown, routeFound,
  
  // 🧾 SAP Integration  
  sapIntegration, sapLoading, xmlGenerated, readyForInvoice,
  
  // Actions
  fetchServices, createService, updateService,
  calculateServicePrice, generateSapXml,
  
  // Helpers
  getQuickStats, canEditService, formatStatus, getStatusColor
} = useAgencyServices();
```

**Specialized Hooks**:
- `useAgencyServicesBasic()` - Simplified for basic operations
- `useAgencyServicesStatistics()` - Analytics focused
- `useAgencyServicesModals()` - Modal state management

#### 📊 Catalog Management (`/front/lib/features/agencyServices/useAgencyCatalogs.ts`)

**Dynamic Catalog Loading**:
```typescript
const {
  locations,         // Pickup/Dropoff locations with site types
  nationalities,     // Crew nationality options  
  ranks,            // Maritime crew positions
  vessels,          // Ship information
  transportCompanies, // Transportation providers
  drivers,          // Driver profiles with contacts
  tauliaCodes,      // SAP service codes with pricing
  loading,
  fetchGroupedCatalogs
} = useAgencyCatalogs();
```

#### 🎨 User Interface Components

##### 1. Service Creation (`/front/components/agency/agency-services.tsx`)

**💰 Auto-Pricing Features**:
- **Real-time calculation**: Price updates automatically when locations change
- **Visual feedback**: Green highlighting for calculated prices
- **Price breakdown**: Shows base rate + waiting time + extra passengers
- **Route detection**: Badge indicates if specific route pricing found
- **Manual override**: Users can still adjust prices manually

**Form Structure**:
```tsx
// Required Fields
- Pickup Date & Time
- Pickup Location (with auto-pricing trigger)
- Drop-off Location (with auto-pricing trigger)  
- Vessel Name
- Crew Name
- Client Selection

// Auto-Pricing Display Card
{(pickupLocation && dropoffLocation) && (
  <Card className="bg-green-50 border-green-200">
    <CardContent>
      <div className="flex justify-between">
        <div>
          <h3>Calculated Price</h3>
          <p>{pricing.description}</p>
          {routeFound && <Badge>Route Found</Badge>}
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-green-600">
            ${currentPrice.toLocaleString()}
          </p>
          // Price breakdown details
        </div>
      </div>
    </CardContent>
  </Card>
)}

// Optional Fields (Collapsible)
- Voyage, Crew Rank, Nationality
- Transport Company, Driver
- Waiting Time (triggers price recalculation)
- Service Code (Taulia Code)
- Comments & Flight Information
```

##### 2. Service Records (`/front/components/agency/agency-records.tsx`)

**Features**:
- Paginated service listing with advanced filters
- Status-based filtering and bulk operations
- Export capabilities (CSV, Excel, PDF)
- Service status management with workflow validation
- Quick actions: View, Edit, Delete, Status Change

##### 3. Catalog Management (`/front/components/agency/agency-catalogs.tsx`)

**Multi-Catalog Interface**:
- Tabbed interface for different catalog types
- CRUD operations for each catalog type
- Bulk import/export functionality
- Search and filtering capabilities
- Metadata management for extensible attributes

##### 4. Configuration (`/front/components/agency/agency-config.tsx`)

**System Configuration**:
- Pricing rule management
- Location and route setup
- Taulia code configuration
- Default values and system preferences
- User permission management

#### SAP Invoice Generation (`/front/components/agency/agency-sap-invoice.tsx`)

**Three-Tab Interface**:

1. **Generate Invoice Tab**:
   - Service filtering and selection
   - Invoice configuration (number, dates)
   - Real-time price calculation summary
   - Bulk service selection with statistics

2. **XML Result Tab**:
   - Generated XML preview (first 1000 characters)
   - Download functionality
   - Invoice details and metadata
   - Success/error feedback

3. **History Tab**:
   - Previous XML generations
   - Invoice tracking and audit trail
   - Search and filtering capabilities

**Key Features**:
- Real-time service filtering by client, date, vessel, location
- Auto invoice number generation: `AGY-YYYYMMDD-HHMM`
- Bulk service selection with "Select All" functionality  
- Live price calculation and summaries
- XML preview with syntax highlighting
- Complete error handling and user feedback
- Mobile-responsive design

## 🛠 Usage Instructions

### Step 1: Access SAP Invoice Module
Navigate to: **Agency → SAP Invoice** in the sidebar menu

### Step 2: Configure Invoice
1. **Invoice Number**: Enter manually or click "Auto" for automatic generation
   - Format: `AGY-YYYYMMDD-HHMM` (e.g., AGY-20241210-1430)
2. **Invoice Date**: Select invoice date
3. **Posting Date**: Optional, defaults to invoice date

### Step 3: Filter and Select Services
1. **Apply Filters**:
   - Client selection (All, MSC, Other)
   - Date range (start/end dates)
   - Vessel name filter
   - Pickup location filter
2. **Select Services**:
   - Individual selection via checkboxes
   - Bulk selection with "Select All"
   - View service details: crew, vessel, route, pricing

### Step 4: Generate SAP XML
1. Review selected services and total amount
2. Click "Generate SAP XML"
3. System validates data and generates XML
4. Automatically switches to "XML Result" tab

### Step 5: Download and Use
1. **Download XML**: Click "Download XML" button
2. **Preview**: View XML structure in preview section
3. **Import to SAP**: Use downloaded XML file in SAP system

## 📊 Service Status Flow

```
pending → in_progress → completed → [SAP XML Generation] → facturado
```

- **completed**: Services ready for SAP invoice generation
- **facturado**: Services included in generated SAP XML

## 🔧 Technical Features ∫

### XML Structure Differences
Agency XML structure differs from Shipshandler: 
- **Source System**: "Agency Transportation System" 
- **Service Description**: Includes crew name and vessel
- **Route Information**: Pickup to dropoff location details ß
- **Document Type**: XL (specific to Agency)

### Data Validation
- Invoice number format validation (A-Z, 0-9, hyphens, underscores)
- Service status verification
- Date format validation
- Currency and amount validation

### Error Handling
- Complete error boundaries in UI
- Backend validation with descriptive messages
- Toast notifications for user feedback
- Graceful fallbacks for failed operations

### Performance Features
- Service filtering with real-time updates
- Efficient Redux state management
- Optimized table rendering for large datasets
- Lazy loading for XML history

## 📁 File Structure

```
Backend:
/api/src/controllers/agencyControllers/agencySapControllers.ts 
/api/src/routes/agencySapRoutes.ts

Frontend:
/front/components/agency/agency-sap-invoice.tsx
/front/app/agency/sap-invoice/page.tsx
/front/lib/features/agencyServices/agencyServicesSlice.ts
/front/lib/features/agencyServices/useAgencyServices.ts

Navigation:
/front/components/app-sidebar.tsx (Agency menu with SAP Invoice link)

UI Components:
/front/components/ui/collapsible.tsx (custom implementation)
```

## 🚀 Deployment Status

✅ **Backend**: Fully connected with validation and error handling
✅ **Frontend**: Complete UI with three-tab interface
✅ **Redux**: Integrated state management with SAP actions
✅ **Navigation**: Added to sidebar menu
✅ **Build**: Successfully builds without blocking errors

## 🔍 Testing Checklist

- [ ] Generate XML with valid services
- [ ] Test various filter combinations
- [ ] Verify XML structure matches SAP requirements  
- [ ] Download functionality works correctly
- [ ] Error handling for invalid data
- [ ] History tab displays previous generations
- [ ] Mobile responsive design

## 🚨 Important Notes

1. **XML Format**: Agency uses different XML structure than Shipshandler
2. **Service Status**: Only `completed` services appear in SAP invoice generation
3. **Invoice Numbers**: Must be unique and follow format requirements
4. **File Storage**: Generated XML files are stored temporarily for download
5. **Permissions**: Users need appropriate SAP permissions to access functionality

## 📞 Support

For technical issues or questions about the SAP integration:
- Check error logs in browser console
- Verify service statuses in Agency Records
- Ensure proper permissions are configured
- Contact system administrator for SAP-specific issues