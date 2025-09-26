# 📚 Documentación Completa del Módulo AGENCY

## 🎯 Resumen Ejecutivo

El módulo **AGENCY** es un sistema integral para la gestión de servicios de transporte de tripulación marítima en Panamá. Proporciona funcionalidades completas para el registro, seguimiento, facturación y configuración de precios de servicios de transporte entre puertos, aeropuertos, hoteles y otras ubicaciones.

## 🏗️ Arquitectura del Sistema

### Stack Tecnológico

- **Backend**: Node.js + Express + TypeScript + MongoDB
- **Frontend**: Next.js 14 + React + TypeScript + Redux Toolkit
- **Base de Datos**: MongoDB con Mongoose ODM
- **Estado**: Redux Toolkit con persistencia local
- **UI**: Tailwind CSS + shadcn/ui components
- **Validación**: Express Validator + Zod

## 📁 Estructura del Proyecto

```
barcos/
├── api/                              # Backend
│   ├── src/
│   │   ├── controllers/
│   │   │   ├── agencyControllers/   # Controladores específicos de Agency
│   │   │   │   ├── agencyCatalogControllers.ts
│   │   │   │   ├── agencyCatalogImportExportControllers.ts
│   │   │   │   ├── agencyPricingConfigControllers.ts
│   │   │   │   ├── agencySapIntegrationControllers.ts
│   │   │   │   └── agencyServicesControllers.ts
│   │   │   └── recordsControllers/
│   │   │       └── createAgencyRecords.ts
│   │   ├── database/
│   │   │   └── schemas/
│   │   │       ├── agencyCatalogSchema.ts      # Catálogos maestros
│   │   │       ├── agencyServiceSchema.ts      # Servicios de transporte
│   │   │       └── agencyPricingConfigSchema.ts # Configuración de precios
│   │   ├── routes/
│   │   │   ├── agencyRoutes.ts
│   │   │   ├── agencyCatalogsRoutes.ts
│   │   │   ├── agencyFileRoutes.ts
│   │   │   ├── agencyPricingConfigRoutes.ts
│   │   │   └── agencySapRoutes.ts
│   │   └── services/
│   │       └── agencyPricingService.ts         # Lógica de cálculo de precios
│   └── scripts/
│       └── seedAgencyRoutePricing.ts           # Seed de rutas y precios
│
└── front/                            # Frontend
    ├── app/
    │   ├── agency/                   # Páginas del módulo
    │   │   ├── page.tsx              # Dashboard principal
    │   │   ├── upload/               # Carga de Excel/Manual
    │   │   └── pricing-config/       # Configuración de precios
    ├── components/
    │   └── agency/
    │       ├── agency-dashboard.tsx
    │       ├── agency-services.tsx
    │       ├── agency-upload.tsx
    │       └── pricing-config/       # Componentes de configuración
    │           ├── pricing-config-main.tsx
    │           ├── distance-rates-editor.tsx
    │           ├── fixed-routes-editor.tsx
    │           ├── distance-matrix-editor.tsx
    │           ├── service-adjustments-editor.tsx
    │           ├── additional-charges-editor.tsx
    │           ├── discounts-editor.tsx
    │           └── price-calculator.tsx
    └── lib/
        ├── features/
        │   └── agencyServices/
        │       ├── agencyServicesSlice.ts
        │       ├── agencyCatalogsSlice.ts
        │       ├── agencyPricingConfigSlice.ts
        │       ├── useAgencyServices.ts
        │       └── useAgencyCatalogs.ts
        └── excel-parser.ts            # Parser de Excel para Agency
```

## 🔧 Funcionalidades Principales

### 1. Gestión de Servicios de Transporte

#### Características:
- ✅ Registro de servicios de transporte de tripulación
- ✅ Tracking de estado (pendiente → en progreso → completado → facturado)
- ✅ Gestión de información del buque y tripulación
- ✅ Control de tiempos de espera y pasajeros adicionales
- ✅ Integración con sistema de clientes

#### Campos del Servicio:
```typescript
{
  // Identificación
  module: 'AGENCY',
  status: 'pending' | 'in_progress' | 'completed' | 'prefacturado' | 'facturado',
  
  // Fechas y horarios
  serviceDate: Date,
  pickupDate: Date,
  pickupTime: string,
  
  // Ubicaciones
  pickupLocation: string,  // Ej: "HOTEL PTY"
  dropoffLocation: string, // Ej: "PTY PORT"
  
  // Información del buque
  vessel: string,
  voyage?: string,
  
  // Información de tripulación
  crewName: string,
  crewRank?: string,
  nationality?: string,
  
  // Detalles del servicio
  waitingTime: number,      // Horas
  passengerCount: number,   // Número de pasajeros
  serviceCode?: string,     // Código SAP/Taulia
  
  // Precios
  price: number,
  currency: 'USD' | 'PAB',
  
  // Referencias
  clientId: ObjectId,
  prefacturaId?: ObjectId,
  invoiceId?: ObjectId,
  sapDocumentNumber?: string
}
```

### 2. Sistema de Carga de Datos

#### Carga por Excel
- **Parser especializado** para archivos Excel de Agency
- **Detección automática** de columnas y formato
- **Matching inteligente** de precios según ruta
- **Validación** de datos antes de la carga
- **Detección de duplicados** por vessel+voyage+crew+date

#### Entrada Manual
- **Formulario completo** con todos los campos
- **Autocompletado** de ubicaciones comunes
- **Cálculo automático** de precio al ingresar ruta
- **Validación en tiempo real**

### 3. Sistema de Catálogos

El módulo utiliza catálogos maestros para mantener la consistencia de datos:

#### Tipos de Catálogos:
```typescript
type CatalogType = 
  | 'location'           // Ubicaciones (puertos, hoteles, aeropuertos)
  | 'vessel'            // Buques
  | 'nationality'       // Nacionalidades
  | 'rank'              // Rangos de tripulación
  | 'transport_company' // Compañías de transporte
  | 'driver'            // Conductores
  | 'route_pricing'     // Rutas con precios
  | 'sap_code'          // Códigos SAP/Taulia
```

#### Estructura del Catálogo:
```typescript
{
  type: CatalogType,
  name: string,
  code?: string,
  description?: string,
  metadata?: {
    // Para rutas con precio
    fromLocation?: string,
    toLocation?: string,
    basePrice?: number,
    pricePerPerson?: number,
    waitingTimePrice?: number,
    
    // Para conductores
    phone?: string,
    licenseNumber?: string,
    
    // Para ubicaciones
    address?: string,
    coordinates?: { lat: number, lng: number }
  },
  isActive: boolean
}
```

### 4. Sistema de Configuración de Precios

#### 🎯 Características Principales:

##### A. Configuración Base
- **Precio mínimo**: Precio floor configurable (default: $35)
- **Tarifa base**: Costo fijo inicial (default: $25)
- **Múltiples configuraciones**: Con control de versiones
- **Configuración por defecto**: Activa automáticamente
- **Vigencia temporal**: Fechas de inicio y fin opcionales

##### B. Tarifas por Distancia
Sistema escalonado de precios según kilómetros:

```javascript
distanceRates: [
  { minKm: 0,  maxKm: 20,  ratePerKm: 4.00 },  // Corta distancia
  { minKm: 21, maxKm: 50,  ratePerKm: 2.50 },  // Media distancia  
  { minKm: 51, maxKm: 999, ratePerKm: 1.50 }   // Larga distancia
]
```

##### C. Rutas Fijas
Precios predefinidos para rutas frecuentes:

```javascript
fixedRoutes: [
  { from: 'TOCUMEN AIRPORT', to: 'CRISTOBAL PORT', price: 85, sapCode: 'ECR000669' },
  { from: 'HOTEL PTY', to: 'PTY PORT', price: 120, sapCode: 'ECR000669' },
  // ... más rutas
]
```

##### D. Matriz de Distancias
Distancias reales entre ubicaciones:

```javascript
distanceMatrix: [
  { from: 'HOTEL PTY', to: 'PTY PORT', distance: 15, estimatedTime: 25 },
  { from: 'HOTEL PTY', to: 'TOCUMEN AIRPORT', distance: 25, estimatedTime: 40 },
  // ... más distancias
]
```

##### E. Ajustes por Tipo de Servicio
Recargos configurables por tipo:

```javascript
serviceAdjustments: {
  airport:   { type: 'percentage', value: 20 },  // +20% aeropuerto
  medical:   { type: 'percentage', value: 15 },  // +15% médico
  vip:       { type: 'percentage', value: 30 },  // +30% VIP
  security:  { type: 'percentage', value: 25 },  // +25% seguridad
  emergency: { type: 'percentage', value: 50 },  // +50% emergencia
  weekend:   { type: 'percentage', value: 15 },  // +15% fin de semana
  holiday:   { type: 'percentage', value: 25 },  // +25% feriado
  nightTime: { type: 'percentage', value: 20 }   // +20% nocturno
}
```

##### F. Cargos Adicionales
Costos extra configurables:

```javascript
additionalCharges: {
  waitingHourRate: 10,      // $10 por hora de espera
  extraPassengerRate: 20,   // $20 por pasajero adicional
  luggageRate: 5,           // $5 por maleta extra
  fuelSurcharge: 0,         // Recargo de combustible
  tollsIncluded: false      // Peajes incluidos/excluidos
}
```

##### G. Sistema de Descuentos

**Descuentos por Volumen:**
```javascript
volumeDiscounts: [
  { minServices: 10, discountPercentage: 5 },   // 5% desde 10 servicios/mes
  { minServices: 25, discountPercentage: 10 },  // 10% desde 25 servicios/mes
  { minServices: 50, discountPercentage: 15 }   // 15% desde 50 servicios/mes
]
```

**Códigos Promocionales:**
```javascript
promotionalDiscounts: [
  {
    code: 'SUMMER2024',
    validFrom: '2024-06-01',
    validTo: '2024-08-31',
    discountPercentage: 20,
    maxUses: 100
  }
]
```

##### H. Códigos SAP/Taulia
Ajustes especiales por código:

```javascript
sapCodeAdjustments: [
  { code: 'ECR000669', name: 'Tarifa Estándar', adjustmentType: 'multiplier', value: 1.0 },
  { code: 'ECR001253', name: 'Reefer Tech', adjustmentType: 'percentage', value: 10 },
  { code: 'GEN000089', name: 'VIP/MSC', adjustmentType: 'percentage', value: 30 },
  { code: 'CLA00001', name: 'Security', adjustmentType: 'percentage', value: 25 }
]
```

#### 📊 Fórmula de Cálculo de Precio:

```
1. Precio Base = Tarifa Base + (Distancia × Tarifa por Km)
2. Ajustes = Precio Base × (% Tipo Servicio + % Código SAP)
3. Cargos = (Horas Espera × $10) + (Pasajeros Extra × $20)
4. Subtotal = Precio Base + Ajustes + Cargos
5. Descuentos = Subtotal × (% Mayor Descuento Aplicable)
6. Precio Final = MAX(Precio Mínimo, Subtotal - Descuentos)
```

### 5. Integración con SAP

#### Generación de XML para SAP
- **Formato estándar** SAP para facturas
- **Validación** de datos antes de generar
- **Códigos Taulia** integrados
- **Historial** de generaciones

#### Estructura XML:
```xml
<Invoice>
  <Header>
    <DocumentNumber>AG-2024-001</DocumentNumber>
    <DocumentDate>2024-01-15</DocumentDate>
    <ClientCode>MSC001</ClientCode>
    <TotalAmount>850.00</TotalAmount>
  </Header>
  <Lines>
    <Line>
      <ServiceCode>ECR000669</ServiceCode>
      <Description>TOCUMEN AIRPORT to CRISTOBAL PORT</Description>
      <Quantity>1</Quantity>
      <UnitPrice>85.00</UnitPrice>
      <Total>85.00</Total>
    </Line>
  </Lines>
</Invoice>
```

### 6. Dashboard y Estadísticas

#### Métricas Disponibles:
- **Total de servicios** por período
- **Ingresos totales** y promedio
- **Servicios por estado**
- **Top clientes** por volumen/ingresos
- **Top rutas** más frecuentes
- **Análisis de tiempos** de espera
- **Tendencias mensuales**

## 🔌 API Endpoints

### Servicios
```
GET    /api/agency/services           # Listar servicios
GET    /api/agency/services/:id       # Obtener servicio
POST   /api/agency/services           # Crear servicio
PUT    /api/agency/services/:id       # Actualizar servicio
DELETE /api/agency/services/:id       # Eliminar servicio
PATCH  /api/agency/services/:id/status # Actualizar estado
GET    /api/agency/services/statistics # Obtener estadísticas
```

### Catálogos
```
GET    /api/agency/catalogs           # Listar catálogos
GET    /api/agency/catalogs/by-type   # Obtener por tipo
POST   /api/agency/catalogs           # Crear catálogo
PUT    /api/agency/catalogs/:id       # Actualizar catálogo
DELETE /api/agency/catalogs/:id       # Eliminar catálogo
POST   /api/agency/catalogs/import    # Importar catálogos
GET    /api/agency/catalogs/export    # Exportar catálogos
```

### Configuración de Precios
```
GET    /api/agency/pricing-config           # Listar configuraciones
GET    /api/agency/pricing-config/active    # Obtener activa
GET    /api/agency/pricing-config/:id       # Obtener por ID
POST   /api/agency/pricing-config           # Crear configuración
PUT    /api/agency/pricing-config/:id       # Actualizar
DELETE /api/agency/pricing-config/:id       # Eliminar
POST   /api/agency/pricing-config/:id/clone # Clonar configuración
POST   /api/agency/pricing-config/calculate # Calcular precio
POST   /api/agency/pricing-config/import/seed # Importar base
```

### Integración SAP
```
GET    /api/agency/sap/ready-for-invoice   # Servicios listos para facturar
POST   /api/agency/sap/generate-xml        # Generar XML SAP
GET    /api/agency/sap/xml-history         # Historial de generaciones
GET    /api/agency/sap/download/:id        # Descargar XML
```

### Records (Excel)
```
POST   /api/records/agency                 # Crear desde Excel
GET    /api/records/agency/duplicates      # Verificar duplicados
```

## 🚀 Guía de Uso

### 1. Configuración Inicial

#### Paso 1: Importar Configuración Base
```bash
# Backend - Ejecutar seed de rutas y precios
npm run seed:agency-pricing

# Frontend - Importar desde UI
Navegar a /agency/pricing-config
Click en "Importar Base"
```

#### Paso 2: Personalizar Configuración
1. Acceder a `/agency/pricing-config`
2. Editar tarifas por distancia
3. Agregar rutas fijas específicas
4. Configurar ajustes y descuentos
5. Guardar cambios

### 2. Carga de Servicios

#### Opción A: Carga por Excel
1. Navegar a `/agency/upload`
2. Seleccionar archivo Excel
3. Verificar vista previa
4. Confirmar carga

#### Opción B: Entrada Manual
1. Navegar a `/agency/upload`
2. Seleccionar pestaña "Entrada Manual"
3. Completar formulario
4. Crear servicio

### 3. Gestión de Servicios

#### Ver Dashboard
```
Navegar a /agency
- Vista general de estadísticas
- Servicios recientes
- Métricas clave
```

#### Gestionar Servicios
```
Navegar a /agency/services
- Filtrar por estado, fecha, cliente
- Editar información
- Cambiar estados
- Generar facturas
```

### 4. Facturación

#### Generar Pre-factura
1. Seleccionar servicios completados
2. Click en "Generar Pre-factura"
3. Revisar y confirmar

#### Generar XML SAP
1. Navegar a `/agency/sap`
2. Seleccionar servicios pre-facturados
3. Generar XML
4. Descargar archivo

## 📈 Análisis de Precios

### Patrones Identificados

El análisis de datos reales reveló los siguientes patrones:

#### Economía de Escala en Distancia
```
Corta distancia (≤20 km):  $8.70/km promedio
Media distancia (20-50 km): $3.40/km promedio  
Larga distancia (>50 km):   $2.07/km promedio
```

#### Factores que Afectan el Precio
1. **Tipo de ubicación**: Aeropuertos +20%, Hospitales +15%
2. **Tipo de servicio**: VIP +30%, Emergencia +50%
3. **Horario**: Nocturno +20%, Fin de semana +15%
4. **Código SAP**: Diferentes tarifas por cliente/contrato
5. **Volumen**: Descuentos progresivos por cantidad

#### Rutas Más Frecuentes
```
1. TOCUMEN AIRPORT ↔ CRISTOBAL PORT ($85)
2. HOTEL PTY ↔ PTY PORT ($120)
3. CRISTOBAL PORT ↔ HOTEL RADISSON COLON ($35)
4. HOTEL PTY ↔ TOCUMEN AIRPORT ($85)
5. HOTEL PTY ↔ CRISTOBAL PORT ($200)
```

## 🔒 Seguridad

### Autenticación y Autorización
- **JWT** para autenticación de API
- **Roles y permisos** por usuario
- **Validación** de datos en cliente y servidor
- **Sanitización** de inputs

### Protección de Datos
- **Encriptación** de datos sensibles
- **Logs de auditoría** para cambios críticos
- **Backup automático** de configuraciones
- **Control de versiones** de configuraciones

## 🛠️ Mantenimiento

### Base de Datos

#### Índices Recomendados
```javascript
// Agency Services
db.agencyservices.createIndex({ clientId: 1, status: 1 })
db.agencyservices.createIndex({ pickupDate: 1 })
db.agencyservices.createIndex({ vessel: 1 })
db.agencyservices.createIndex({ serviceCode: 1 })

// Agency Catalogs
db.agencycatalogs.createIndex({ type: 1, isActive: 1 })
db.agencycatalogs.createIndex({ code: 1 })

// Pricing Config
db.agencypricingconfigs.createIndex({ isActive: 1, isDefault: 1 })
```

#### Limpieza de Datos
```javascript
// Eliminar servicios antiguos (>1 año)
db.agencyservices.deleteMany({
  createdAt: { $lt: new Date(Date.now() - 365*24*60*60*1000) },
  status: 'facturado'
})

// Archivar configuraciones antiguas
db.agencypricingconfigs.updateMany(
  { updatedAt: { $lt: new Date(Date.now() - 180*24*60*60*1000) } },
  { $set: { isActive: false } }
)
```

### Monitoreo

#### Métricas Clave
- **Tiempo de respuesta** de cálculo de precios (<100ms)
- **Tasa de error** en carga de Excel (<1%)
- **Disponibilidad** del servicio (>99.9%)
- **Uso de memoria** del servidor
- **Tamaño de base de datos**

#### Alertas Recomendadas
- Servicio sin actualización >24h
- Error rate >5%
- Tiempo de respuesta >500ms
- Base de datos >80% capacidad
- Configuración sin respaldo >7 días

## 🔄 Actualizaciones Futuras

### Roadmap Sugerido

#### Fase 1: Optimización (Q1 2025)
- [ ] Cache de cálculos de precio
- [ ] Optimización de queries MongoDB
- [ ] Compresión de archivos Excel
- [ ] Lazy loading en frontend

#### Fase 2: Nuevas Funcionalidades (Q2 2025)
- [ ] API móvil para conductores
- [ ] Tracking GPS en tiempo real
- [ ] Notificaciones push
- [ ] Integración con WhatsApp Business

#### Fase 3: Inteligencia (Q3 2025)
- [ ] Predicción de demanda con ML
- [ ] Optimización automática de rutas
- [ ] Análisis predictivo de precios
- [ ] Recomendaciones basadas en histórico

#### Fase 4: Expansión (Q4 2025)
- [ ] Multi-idioma (ES/EN/PT)
- [ ] Multi-moneda con tasas en tiempo real
- [ ] Integración con otros ERPs
- [ ] API pública para partners

## 📞 Soporte

### Contactos Técnicos
- **Backend Issues**: backend@barcos.com
- **Frontend Issues**: frontend@barcos.com
- **Database**: dba@barcos.com
- **Emergencias**: oncall@barcos.com

### Recursos
- **Documentación API**: `/api-docs`
- **Swagger UI**: `/swagger`
- **Logs**: `/var/log/agency/`
- **Métricas**: `/metrics`

## 📝 Notas de Versión

### v1.0.0 (Current)
- ✅ Sistema completo de gestión de servicios
- ✅ Carga por Excel y manual
- ✅ Sistema de catálogos
- ✅ Configuración de precios 100% personalizable
- ✅ Integración SAP
- ✅ Dashboard con estadísticas
- ✅ Calculadora de precios
- ✅ Sistema de descuentos

---

**Última actualización**: 26 de Septiembre 2024
**Autor**: Sistema de Documentación Automática
**Versión del Documento**: 1.0.0