# 🚢 Agency SAP Integration System Documentation

## Overview
Complete SAP XML integration system for Agency transportation services, designed to generate structured XML invoices following SAP format requirements for maritime crew transportation services.

## 📋 System Architecture

### Backend Components

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

#### Redux Integration (`/front/lib/features/agencyServices/`)
- **State Management**: Complete SAP integration state
- **Async Actions**:
  - `fetchServicesReadyForInvoice` - Load services with status `completed`
  - `generateSapXml` - Generate XML invoice
  - `downloadSapXml` - Download XML file
  - `fetchSapXmlHistory` - Load generation history

#### UI Component (`/front/components/agency/agency-sap-invoice.tsx`)
- **Three-Tab Interface**:
  1. **Generate Invoice**: Service selection, filters, invoice configuration
  2. **XML Result**: Generated XML preview and download
  3. **History**: Previous XML generations
- **Key Features**:
  - Real-time service filtering
  - Bulk service selection
  - Auto invoice number generation
  - XML preview functionality
  - Complete error handling

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

## 🔧 Technical Features

### XML Structure Differences
Agency XML structure differs from Shipshandler:
- **Source System**: "Agency Transportation System"
- **Service Description**: Includes crew name and vessel
- **Route Information**: Pickup to dropoff location details
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