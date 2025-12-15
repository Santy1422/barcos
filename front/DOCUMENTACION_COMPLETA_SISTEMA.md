# 📚 DOCUMENTACIÓN COMPLETA DEL SISTEMA DE FACTURACIÓN MARÍTIMA
## Manual de Usuario Técnico - Frontend

---

# ÍNDICE GENERAL

## PARTE I - SISTEMA PRINCIPAL
1. [INTRODUCCIÓN Y ARQUITECTURA](#introducción-y-arquitectura)
2. [SISTEMA DE AUTENTICACIÓN Y PERMISOS](#sistema-de-autenticación-y-permisos)
3. [FLUJOS DE USUARIO DETALLADOS](#flujos-de-usuario-detallados)
4. [MÓDULOS DEL SISTEMA](#módulos-del-sistema)
5. [GESTIÓN ADMINISTRATIVA](#gestión-administrativa)
6. [FACTURACIÓN Y DOCUMENTOS](#facturación-y-documentos)
7. [REPORTES Y ESTADÍSTICAS](#reportes-y-estadísticas)
8. [CONFIGURACIÓN Y CATÁLOGOS](#configuración-y-catálogos)

## PARTE II - ASPECTOS TÉCNICOS
9. [INTEGRACIONES EXTERNAS](#integraciones-externas)
10. [MANEJO DE ERRORES](#manejo-de-errores)
11. [COMPONENTES TÉCNICOS](#componentes-técnicos)
12. [SEGURIDAD DEL SISTEMA](#seguridad-del-sistema)
13. [OPTIMIZACIÓN Y RENDIMIENTO](#optimización-y-rendimiento)
14. [ACCESIBILIDAD](#accesibilidad)
15. [LOGGING Y MONITOREO](#logging-y-monitoreo)

## PARTE III - REFERENCIA Y MANTENIMIENTO
16. [ESTADOS Y TRANSICIONES](#estados-y-transiciones)
17. [GUÍA DE DESARROLLO](#guía-de-desarrollo)
18. [DEPLOYMENT Y CONFIGURACIÓN](#deployment-y-configuración)
19. [TROUBLESHOOTING AVANZADO](#troubleshooting-avanzado)
20. [ANEXOS Y REFERENCIAS](#anexos-y-referencias)

---

# 1. INTRODUCCIÓN Y ARQUITECTURA

## 1.1 Descripción General

El Sistema de Facturación Marítima es una plataforma web integral diseñada para gestionar operaciones portuarias, servicios de transporte marítimo y facturación asociada. El sistema maneja múltiples módulos especializados que cubren diferentes aspectos del negocio marítimo en Panamá.

## 1.2 Arquitectura Técnica

### Stack Tecnológico
- **Frontend Framework**: Next.js 14 con App Router
- **Lenguaje**: TypeScript
- **UI Library**: React 18
- **Estilización**: Tailwind CSS
- **Componentes UI**: Radix UI (shadcn/ui)
- **Estado Global**: Redux Toolkit
- **Autenticación**: JWT con middleware personalizado
- **Validación de Formularios**: React Hook Form + Zod
- **Gráficos**: Recharts
- **Generación de PDFs**: jsPDF + autoTable
- **Procesamiento Excel**: SheetJS (xlsx)

### URLs de Conexión
```javascript
// Desarrollo
const DEV_API = "http://localhost:8080"

// Producción
const PROD_API = "https://barcos-production-3aad.up.railway.app"
```

### Estructura de Directorios
```
/front
├── /app                    # Páginas y rutas (App Router)
│   ├── /agency            # Módulo Agency
│   ├── /trucking          # Módulo Trucking/PTG
│   ├── /ptyss             # Módulo PTYSS
│   ├── /shipchandler      # Módulo ShipChandler
│   ├── /usuarios          # Gestión de usuarios
│   ├── /clientes          # Gestión de clientes
│   ├── /login             # Autenticación
│   └── /register          # Registro
├── /components            # Componentes React
│   ├── /ui               # Componentes base (shadcn)
│   ├── /agency           # Componentes Agency
│   ├── /trucking         # Componentes Trucking
│   ├── /ptyss            # Componentes PTYSS
│   └── /shipchandler     # Componentes ShipChandler
├── /lib                   # Utilidades y configuración
│   ├── /store            # Redux store y slices
│   ├── utils.ts          # Funciones utilitarias
│   └── api-config.ts     # Configuración API
├── /hooks                 # Custom React hooks
└── /public               # Archivos estáticos
```

## 1.3 Módulos del Sistema

### Módulos Principales
1. **Trucking/PTG**: Gestión de transporte terrestre de contenedores
2. **PTYSS**: Servicios portuarios y operaciones marítimas
3. **ShipChandler**: Suministros y provisiones para buques
4. **Agency**: Servicios de agencia marítima y transporte de tripulación

### Módulos de Soporte
- **Gestión de Usuarios**: Control de acceso y permisos
- **Gestión de Clientes**: Base de datos de clientes
- **Configuración**: Catálogos y parámetros del sistema
- **Reportes**: Estadísticas y análisis

---

# 2. SISTEMA DE AUTENTICACIÓN Y PERMISOS

## 2.1 Roles del Sistema

### Jerarquía de Roles

```typescript
export type UserRole = 
  | 'administrador'    // Acceso total
  | 'operaciones'      // Crear registros y subir archivos
  | 'facturacion'      // Generar facturas y prefacturas
  | 'clientes'         // Gestionar clientes
  | 'catalogos'        // Configurar catálogos
  | 'pendiente'        // Sin acceso (cuenta nueva)
```

### Matriz de Permisos

| Rol | Dashboard | Usuarios | Clientes | Subir Excel | Prefacturas | Facturas | Catálogos | Reportes |
|-----|-----------|----------|----------|-------------|-------------|----------|-----------|----------|
| Administrador | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Operaciones | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Facturación | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ | ✅ |
| Clientes | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Catálogos | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| Pendiente | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

### Acceso Especial al Dashboard
- Solo el usuario `leandrojavier@gmail.com` puede acceder al dashboard principal
- Otros usuarios son redirigidos automáticamente a su primer módulo asignado

## 2.2 Proceso de Autenticación

### Flujo de Login

1. **Página de Login** (`/login`)
   - Usuario ingresa email y contraseña
   - Validación frontend de campos requeridos
   - Llamada API: `POST /api/user/login`

2. **Validación Backend**
   ```javascript
   // Verificaciones del servidor
   - Email existe en base de datos
   - Contraseña coincide con hash almacenado
   - Usuario está activo (isActive: true)
   - Usuario tiene rol diferente a 'pendiente'
   ```

3. **Almacenamiento de Token**
   ```javascript
   // Token JWT almacenado en múltiples ubicaciones
   localStorage.setItem('token', token)
   localStorage.setItem('isAuthenticated', 'true')
   localStorage.setItem('currentUser', JSON.stringify(user))
   document.cookie = 'auth-token=true; max-age=86400; path=/'
   ```

4. **Redirección Post-Login**
   - Administrador con email especial → Dashboard (`/`)
   - Usuario con módulos → Primer módulo asignado
   - Usuario rol 'facturacion' sin módulos → Clientes (`/clientes`)

### Middleware de Autenticación

```typescript
// middleware.ts
export function middleware(request: NextRequest) {
  const token = request.cookies.get('auth-token')
  const isAuthPage = ['/login', '/register'].includes(pathname)
  
  if (!token && !isAuthPage) {
    // Redirigir a login si no autenticado
    return NextResponse.redirect(new URL('/login', request.url))
  }
  
  if (token && isAuthPage) {
    // Redirigir a home si ya autenticado
    return NextResponse.redirect(new URL('/', request.url))
  }
}
```

## 2.3 Registro de Nuevos Usuarios

### Proceso de Registro

1. **Formulario de Registro** (`/register`)
   ```javascript
   // Campos requeridos
   - Nombre (text)
   - Apellido (text)
   - Nombre Completo (text)
   - Usuario (text, único)
   - Email (email, único)
   - Contraseña (password, mínimo 6 caracteres)
   - Confirmar Contraseña (debe coincidir)
   ```

2. **Creación de Cuenta**
   - Usuario creado con rol `'pendiente'`
   - Sin módulos asignados inicialmente
   - Requiere activación por administrador

3. **Mensaje Post-Registro**
   ```
   "Tu cuenta ha sido creada. Un administrador debe 
   activarla antes de que puedas acceder al sistema."
   ```

### Activación de Cuenta (Admin)

1. Administrador accede a `/usuarios`
2. Localiza usuario con rol 'pendiente'
3. Edita usuario y asigna:
   - Roles activos
   - Módulos de acceso
   - Estado activo = true
4. Usuario puede ahora hacer login

---

# 3. FLUJOS DE USUARIO DETALLADOS

## 3.1 Flujo de Usuario Operaciones

### Día Típico de Trabajo

1. **Login al Sistema**
   ```
   → Ingresa credenciales en /login
   → Sistema valida rol 'operaciones'
   → Redirección automática a módulo asignado (ej: /trucking)
   ```

2. **Subida de Excel en Trucking**
   ```
   → Navega a /trucking/upload
   → Selecciona archivo Excel de contenedores
   → Sistema procesa y valida automáticamente:
     - Matching con rutas configuradas
     - Validación de clientes
     - Detección de tipo de contenedor
   → Resuelve registros sin match creando rutas
   → Completa datos de clientes faltantes
   → Guarda registros en sistema
   ```

3. **Creación de Servicios en Agency**
   ```
   → Navega a /agency/services
   → Completa formulario:
     - Fecha y hora de pickup
     - Ubicaciones (validadas contra rutas)
     - Vessel y datos de viaje
     - Crew members con detalles
   → Sistema calcula precio automáticamente
   → Guarda servicio con estado 'pending'
   ```

## 3.2 Flujo de Usuario Facturación

### Proceso de Facturación Completo

1. **Creación de Prefactura en Trucking**
   ```
   → Accede a /trucking/prefactura
   → Filtra registros por:
     - Cliente específico
     - Rango de fechas
     - Estado (no facturados)
   → Selecciona registros del mismo cliente
   → Sistema genera:
     - Número de prefactura automático
     - Vista previa PDF
     - Cálculo de impuestos
   → Descarga PDF y marca registros como prefacturados
   ```

2. **Generación de Factura Final**
   ```
   → Accede a /trucking/records
   → Selecciona prefactura creada
   → Genera factura con:
     - Número de factura manual
     - Fecha de emisión
     - Validación de cliente SAP
   → Sistema genera XML para SAP
   → Descarga XML y PDF
   → Registros marcados como facturados
   ```

3. **Facturación en Agency (SAP Invoice)**
   ```
   → Navega a /agency/sap-invoice
   → Selecciona servicios completados del mismo cliente
   → Sistema agrupa por:
     - Tipo de movimiento
     - Rutas utilizadas
     - Fechas
   → Genera XML consolidado
   → Número de factura: AGY-YYYYMMDD-HHMM
   → Envío automático a SAP vía FTP
   ```

## 3.3 Flujo de Administrador

### Gestión Integral del Sistema

1. **Dashboard General**
   ```
   → Login con leandrojavier@gmail.com
   → Acceso a dashboard completo con:
     - Estadísticas por módulo
     - Accesos rápidos
     - Resumen de actividad
   ```

2. **Gestión de Usuarios**
   ```
   → Navega a /usuarios
   → Tabla con todos los usuarios del sistema
   → Acciones disponibles:
     - Crear nuevo usuario con roles/módulos
     - Editar permisos existentes
     - Activar/desactivar cuentas
     - Reset de contraseñas
     - Eliminación múltiple
   ```

3. **Configuración de Catálogos**
   ```
   → Accede a configuración por módulo
   → Gestiona:
     - Rutas y precios
     - Tipos de contenedores
     - Locations y site types
     - Vessels y shipping lines
     - Drivers y transport companies
   ```

---

# 4. MÓDULOS DEL SISTEMA

## 4.1 Módulo Trucking/PTG

### Descripción
Sistema de gestión de transporte terrestre de contenedores, manejo de rutas terrestres y facturación asociada.

### Funcionalidades Principales

#### Subir Excel (`/trucking/upload`)
**Proceso de Carga:**
1. Selección de archivo Excel (.xlsx, .xls)
2. Parsing automático con detección de columnas
3. Matching con rutas configuradas
4. Validación de clientes
5. Gestión de registros sin match

**Estructura Excel Esperada:**
```
| Container | Container Consecutive | F/E | Size | Type | Move Date | Cliente | Leg | Move Type |
|-----------|----------------------|-----|------|------|-----------|---------|-----|-----------|
| MSCU123456 | 001 | FULL | 40 | DV | 45234 | MSC | PTY/COL | SINGLE |
```

**Validaciones Automáticas:**
- Detección de tipo: REEFER vs DRY
- Conversión de fechas Excel a formato legible
- Eliminación de duplicados por containerConsecutive
- Matching por: origen, destino, tipo, tamaño, cliente

#### Crear Prefactura (`/trucking/prefactura`)
**Características:**
- Agrupamiento inteligente de registros
- Cálculo automático de impuestos PTG
- Generación de PDF con formato oficial
- Número automático: TRK-PRE-{timestamp}

**Servicios Adicionales Disponibles:**
```javascript
const additionalServices = [
  'FUMIGATION',
  'WASHING',
  'REPAIR',
  'INSPECTION',
  'SEAL',
  'WEIGHT'
]
```

#### Gastos Autoridades (`/trucking/gastos-autoridades`)
**Proceso:**
1. Carga de Excel con gastos por contenedor
2. Agrupamiento por autoridad
3. Asignación a facturas existentes
4. Generación de ítems XML tipo AUTH

**Códigos SAP para Autoridades:**
- TRK182: Aduana
- TRK175: Administration Fee
- TRK009: Otros gastos

### Catálogos y Configuración

#### Rutas Trucking
```typescript
interface TruckingRoute {
  name: string           // "PTY/COL"
  origin: string         // "PTY"
  destination: string    // "COL"
  containerType: string  // "DV", "HC", "FR", etc.
  routeType: "SINGLE" | "RT"
  price: number
  status: "FULL" | "EMPTY"
  cliente: string
  routeArea: "PACIFIC" | "ATLANTIC" | "NORTH" | "SOUTH"
  sizeContenedor: "20" | "40" | "45"
}
```

#### Tipos de Contenedores
**Mapeo a códigos ISO SAP:**
```javascript
// Ejemplos de mapeo
"DV" + "20" → "22G1"  // Dry Van 20'
"RF" + "40" → "42R1"  // Reefer 40'
"HC" + "40" → "45G1"  // High Cube 40'
"TK" + "20" → "20T0"  // Tank 20'
```

**Lista completa:** 280+ combinaciones tipo/tamaño

## 4.2 Módulo PTYSS

### Descripción
Puerto de Terminales y Servicios Portuarios - gestión de operaciones portuarias locales.

### Funcionalidades Principales

#### Crear Registros (`/ptyss/upload`)
**Tipos de Registro:**
- Local: Servicios dentro del puerto
- Trasiego: Movimientos entre terminales

**Campos del Formulario:**
```typescript
interface PTYSSRecord {
  containerNumber: string
  size: "20" | "40" | "45"
  type: string           // Tipo de contenedor
  fe: "FULL" | "EMPTY"
  line: string          // Naviera
  vessel: string
  voyage: string
  origin: string
  destination: string
  serviceDate: Date
  serviceType: "local" | "trasiego"
  price: number
}
```

#### Crear Prefactura (`/ptyss/invoice`)
**Características Especiales:**
- Agrupamiento por vessel y voyage
- Servicios locales predefinidos
- Cálculo de tarifas portuarias

#### Historial (`/ptyss/historial`)
**Funcionalidades:**
- Búsqueda avanzada multi-campo
- Filtros por estado y fecha
- Exportación a Excel
- Vista detallada de registros

### Servicios y Tarifas PTYSS

**Servicios Locales Fijos:**
```javascript
const localServices = {
  CLG097: "Gate Service",
  TRK163: "Terminal Handling",
  TRK179: "Storage",
  SLR168: "Reefer Connection"
}
```

## 4.3 Módulo ShipChandler

### Descripción
Gestión de suministros y provisiones para buques.

### Funcionalidades Principales

#### Subir Excel (`/shipchandler/upload`)
**Estructura de Datos:**
```
| Vessel | Item Code | Description | Quantity | Unit Price | Total |
|--------|-----------|-------------|----------|------------|-------|
| MSC VITA | PROV001 | Water | 100 | 5.00 | 500.00 |
```

#### Crear Prefactura (`/shipchandler/prefactura`)
**Características:**
- Agrupamiento por vessel
- Catálogo de productos marítimos
- Cálculo de impuestos ITBMS

### Catálogos ShipChandler
- Productos y suministros
- Categorías de items
- Unidades de medida
- Tarifas especiales

## 4.4 Módulo Agency

### Descripción
Servicios de agencia marítima, principalmente transporte de tripulación.

### Funcionalidades Principales

#### Service Request Form (`/agency/services`)

**Campos del Formulario Detallados:**

1. **Service Details**
   ```typescript
   interface ServiceDetails {
     moveType: "SINGLE" | "RT" | "INTERNAL" | "BAGS_CLAIM" | 
               "DOCUMENTATION" | "NO_SHOW"
     pickupDate: Date        // Fecha de recogida
     pickupTime: string      // Formato 24h (HH:MM)
     pickupLocation: string  // ID de location con siteType
     dropoffLocation: string // ID de location con siteType
     returnDropoffLocation?: string // Solo para RT
     comments?: string       // Observaciones
   }
   ```

2. **Transport Details**
   ```typescript
   interface TransportDetails {
     vessel: string          // ID del vessel
     voyage?: string         // Número de viaje
     serviceCode?: string    // Código para factura
     transportCompany: string // Compañía de transporte
     driver: string          // ID del conductor
     clientId: string        // Cliente con SAP code
   }
   ```

3. **Crew Members**
   ```typescript
   interface CrewMember {
     name: string            // Nombre completo
     nationality: string     // ID de nacionalidad
     crewRank: string       // Rango (Captain, Engineer, etc)
     crewCategory: string   // ON_SIGNER, OFF_SIGNER, etc
     flight: string         // Número de vuelo
   }
   ```

**Validación de Rutas en Tiempo Real:**
```javascript
// Sistema valida combinación de site types
const routeValidation = {
  pickupSiteType: getLocationSiteType(pickupLocation),
  dropoffSiteType: getLocationSiteType(dropoffLocation),
  passengerCount: crewMembers.length,
  routeType: moveType
}

// Búsqueda de ruta configurada
const route = findRoute(routeValidation)
if (!route) {
  showError("No existe ruta para esta combinación")
}
```

**Cálculo Automático de Precios:**
```javascript
// Precio base según ruta
let price = routePrice || tauliaPrice || defaultPrice

// Cargos adicionales
price += waitingTime * HOURLY_RATE
price += (passengers - 1) * PER_PERSON_RATE

// Round trip multiplier
if (moveType === 'RT') {
  price *= hasReturnLocation ? 1 : 2
}
```

#### SAP Invoice (`/agency/sap-invoice`)

**Proceso de Facturación:**
1. Selección de servicios completados
2. Validación: mismo cliente
3. Agrupamiento por características
4. Generación de XML consolidado
5. Número automático: AGY-YYYYMMDD-HHMM

### Sistema de Precios Agency

#### Configuración de Rutas (`/agency/pricing-config`)

**33 Rutas Predefinidas del PDF:**
```javascript
// Ejemplos de rutas
const routes = [
  { from: "AIRPORT", to: "PORT", price: 150, currency: "USD" },
  { from: "HOTEL", to: "TERMINAL", price: 200, currency: "USD" },
  { from: "PORT", to: "PORT", price: 100, currency: "PAB" }
]
```

**Prioridad de Precios:**
1. Ruta específica configurada (máxima prioridad)
2. Código Taulia del cliente
3. Precio por defecto del área

### Catálogos Agency

#### Locations
```typescript
interface Location {
  id: string
  name: string
  address?: string
  metadata: {
    siteTypeId: string  // HOTEL, PORT, AIRPORT, TERMINAL
    latitude?: number
    longitude?: number
  }
}
```

#### Vessels
```typescript
interface Vessel {
  id: string
  name: string
  shippingLine: string
  imo?: string
  flag?: string
  capacity?: number
}
```

#### Drivers
```typescript
interface Driver {
  id: string
  name: string
  phone: string
  license: string
  transportCompanyId: string
  vehiclePlate?: string
}
```

---

# 5. GESTIÓN ADMINISTRATIVA

## 5.1 Gestión de Usuarios

### Página de Usuarios (`/usuarios`)
**Acceso:** Solo rol `administrador`

### Tabla de Usuarios

**Columnas Mostradas:**
1. **Checkbox** - Selección múltiple
2. **Usuario** - Username o email
3. **Nombre Completo**
4. **Email**
5. **Rol(es)** - Badges múltiples
6. **Módulos** - Accesos asignados
7. **Estado** - Activo/Inactivo con ícono
8. **Último Acceso** - Fecha o "Nunca"
9. **Acciones** - Editar, Reset Password, Toggle Estado, Eliminar

### Operaciones CRUD de Usuarios

#### Crear Usuario
```javascript
// Campos del formulario
{
  username: string,        // Requerido, único
  email: string,           // Requerido, único
  fullName: string,        // Requerido
  password: string,        // Mínimo 6 caracteres
  roles: string[],         // Múltiples roles permitidos
  modules: string[],       // Módulos de acceso
  isActive: boolean        // Estado inicial
}
```

#### Editar Usuario
- Precarga datos existentes
- No puede editar password (usar reset)
- Conversión automática role → roles[]
- Validación de cambios en tiempo real

#### Reset Password
```javascript
// Modal de confirmación
{
  userId: string,
  newPassword: string      // Mínimo 6 caracteres
}
// No se muestra la contraseña actual
```

#### Restricciones de Seguridad
- Usuario no puede eliminarse a sí mismo
- Usuario no puede desactivarse a sí mismo
- Solo admin puede gestionar otros admins

## 5.2 Gestión de Clientes

### Página de Clientes (`/clientes`)
**Acceso:** Roles `administrador` o `clientes`

### Filtrado por Módulos
```javascript
// Admin ve todos los clientes
if (isAdmin) {
  fetchAllClients()
} else {
  // Usuario ve solo clientes de sus módulos
  fetchClientsByModules(userModules)
}
```

### Modal de Cliente

#### Búsqueda por SAP Code
```javascript
// Flujo de búsqueda
1. Usuario ingresa SAP code
2. Sistema busca en base de datos
3. Si existe:
   - Carga datos del cliente
   - Verifica módulos asignados
   - Permite actualizar/agregar módulos
4. Si no existe:
   - Habilita campos para crear nuevo
   - SAP code queda fijo
```

#### Tipos de Cliente

**Cliente Natural (Persona):**
```typescript
interface NaturalClient {
  type: "natural"
  fullName: string
  documentType: "cedula" | "pasaporte"
  documentNumber: string
  email?: string
  phone?: string
  address?: string
  sapCode: string          // Requerido
  modules: string[]        // Módulos donde está activo
  isActive: boolean
}
```

**Cliente Jurídico (Empresa):**
```typescript
interface JuridicalClient {
  type: "juridico"
  companyName: string      // Razón social
  name?: string           // Nombre corto
  ruc: string             // RUC de la empresa
  contactName?: string    // Persona de contacto
  email: string           // Requerido
  phone?: string
  address?: string
  sapCode: string         // Requerido
  modules: string[]
  isActive: boolean
}
```

### Validaciones de Cliente

#### Frontend
```javascript
// Validaciones en tiempo real
- SAP code: requerido, único
- Email: formato válido (jurídicos: requerido)
- RUC: formato válido (jurídicos)
- Documento: según tipo seleccionado
```

#### Backend
```javascript
// Validaciones del servidor
- SAP code único en sistema
- Email único si proporcionado
- Validación de RUC panameño
- Módulos válidos
```

### Integración con Otros Módulos
- Modal reutilizable desde cualquier componente
- Callback `onClientCreated` para actualizar listas
- Búsqueda por módulo específico

---

# 6. FACTURACIÓN Y DOCUMENTOS

## 6.1 Proceso de Prefacturación

### Concepto de Prefactura
Documento preliminar que agrupa registros/servicios para revisión antes de generar la factura final.

### Flujo General de Prefacturación

1. **Selección de Registros**
   ```javascript
   // Criterios de selección
   - Solo registros no facturados
   - Mismo cliente obligatorio
   - Filtros: fecha, tipo, estado
   ```

2. **Agrupamiento Automático**
   ```javascript
   // Trucking agrupa por:
   { moveType, routeType, leg, fe, size, type, price }
   
   // PTYSS agrupa por:
   { vessel, voyage, serviceType }
   
   // Agency agrupa por:
   { moveType, route, serviceDate }
   ```

3. **Generación de Documento**
   - Número automático con prefijo por módulo
   - Vista previa PDF en tiempo real
   - Cálculo de subtotales y totales
   - Aplicación de impuestos según corresponda

### Números de Prefactura por Módulo
```javascript
const prefacturaNumbers = {
  trucking: `TRK-PRE-${Date.now()}`,
  ptyss: `PTY-PRE-${Date.now()}`,
  shipchandler: `SCH-PRE-${Date.now()}`,
  agency: `AGY-PRE-${Date.now()}`
}
```

## 6.2 Generación de Facturas

### Proceso de Facturación Final

1. **Conversión Prefactura → Factura**
   ```javascript
   // Datos requeridos
   {
     invoiceNumber: string,    // Manual, único
     invoiceDate: Date,
     dueDate: Date,
     clientId: string,         // Con SAP code
     records: Record[],        // Registros asociados
     additionalCharges: [],    // Cargos extra
     taxes: []                 // Impuestos aplicables
   }
   ```

2. **Validaciones Pre-Factura**
   - Cliente debe tener SAP code
   - Registros no pueden estar facturados
   - Número de factura único
   - Fechas coherentes

3. **Generación de Documentos**
   - PDF para cliente (formato oficial)
   - XML para SAP (integración sistema)
   - Actualización de estados en BD

## 6.3 Estructura XML para SAP

### XML Trucking/PTG
```xml
<?xml version="1.0" encoding="UTF-8"?>
<ns1:LogisticARInvoices xmlns:ns1="urn:medlog.com:MSC_GVA_FS:CustomerInvoice:01.00">
  <CustomerInvoice>
    <Protocol>
      <SourceSystem>Trucking</SourceSystem>
      <MessageType>CustomerInvoice</MessageType>
      <Version>01.00</Version>
      <TechnicalContact>almeida.kant@ptyrmgmt.com;renee.taylor@ptyrmgmt.com</TechnicalContact>
    </Protocol>
    <Header>
      <CompanyCode>9325</CompanyCode>
      <DocumentType>XL</DocumentType>
      <DocumentDate>20241202</DocumentDate>
      <PostingDate>20241202</PostingDate>
      <TransactionCurrency>USD</TransactionCurrency>
      <Reference>TRK-2024-001</Reference>
      <Text>Factura Trucking</Text>
      <EntityDocNbr>SAP123456</EntityDocNbr>
    </Header>
    <CustomerOpenItem>
      <CustomerNbr>C0001234</CustomerNbr>
      <AmntTransactCur>1500.00</AmntTransactCur>
      <BaselineDate>20241202</BaselineDate>
      <DueDate>20250101</DueDate>
      <PaymentTerms>Z030</PaymentTerms>
    </CustomerOpenItem>
    <OtherItems>
      <OtherItem>
        <IncomeRebateCode>T</IncomeRebateCode>
        <AmntTransacCur>-1000.00</AmntTransacCur>
        <BaseUnitMeasure>CTR</BaseUnitMeasure>
        <Qty>10</Qty>
        <ProfitCenter>PAPANB110</ProfitCenter>
        <Service>TRK001</Service>
        <Activity>TRK</Activity>
        <Pillar>TRSP</Pillar>
        <Subcontracting>Y</Subcontracting>
        <Bundle>BUNDLE01</Bundle>
        <BusinessType>E</BusinessType>
        <FullEmpty>FULL</FullEmpty>
        <CtrISOcode>42G1</CtrISOcode>
        <CtrType>DV</CtrType>
        <CtrSize>40</CtrSize>
        <CtrCategory>A</CtrCategory>
        <Commodity>GENERAL</Commodity>
      </OtherItem>
      <!-- Impuestos -->
      <OtherItem>
        <IncomeRebateCode>T</IncomeRebateCode>
        <AmntTransacCur>-250.00</AmntTransacCur>
        <BaseUnitMeasure>EA</BaseUnitMeasure>
        <Qty>5</Qty>
        <ProfitCenter>PAPANB110</ProfitCenter>
        <Service>TRK182</Service>
        <Activity>AUTH</Activity>
        <Pillar>TRSP</Pillar>
      </OtherItem>
    </OtherItems>
  </CustomerInvoice>
</ns1:LogisticARInvoices>
```

### XML PTYSS
```xml
<?xml version="1.0" encoding="UTF-8"?>
<ns1:LogisticARInvoices xmlns:ns1="urn:medlog.com:MSC_GVA_FS:CustomerInvoice:01.00">
  <CustomerInvoice>
    <Protocol>
      <SourceSystem>Trucking</SourceSystem>
      <TechnicalContact>almeida.kant@ptyrmgmt.com;renee.taylor@ptyrmgmt.com</TechnicalContact>
    </Protocol>
    <Header>
      <CompanyCode>9326</CompanyCode>
      <DocumentType>XL</DocumentType>
      <DocumentDate>20241202</DocumentDate>
      <PostingDate>20241202</PostingDate>
      <TransactionCurrency>USD</TransactionCurrency>
      <Reference>PTY-2024-001</Reference>
      <EntityDocNbr>SAP789012</EntityDocNbr>
    </Header>
    <CustomerOpenItem>
      <CustomerNbr>C0005678</CustomerNbr>
      <AmntTransactCur>2500.00</AmntTransactCur>
      <BaselineDate>20241202</BaselineDate>
      <DueDate>20250101</DueDate>
    </CustomerOpenItem>
    <OtherItems>
      <!-- Items de trasiego -->
      <OtherItem>
        <IncomeRebateCode>I</IncomeRebateCode>
        <AmntTransacCur>-1500.00</AmntTransacCur>
        <BaseUnitMeasure>CTR</BaseUnitMeasure>
        <Qty>15</Qty>
        <ProfitCenter>PAPANC110</ProfitCenter>
        <Service>TRK002</Service>
        <Activity>TRK</Activity>
        <Pillar>LOGS</Pillar>
        <BusinessType>I</BusinessType>
        <FullEmpty>FULL</FullEmpty>
        <CtrISOcode>22G1</CtrISOcode>
        <CtrType>DV</CtrType>
        <CtrSize>20</CtrSize>
        <CtrCategory>A</CtrCategory>
      </OtherItem>
      <!-- Servicios locales -->
      <OtherItem>
        <IncomeRebateCode>I</IncomeRebateCode>
        <AmntTransacCur>-500.00</AmntTransacCur>
        <BaseUnitMeasure>EA</BaseUnitMeasure>
        <Qty>5</Qty>
        <ProfitCenter>PAPANC110</ProfitCenter>
        <Service>CLG097</Service>
        <Activity>CLG</Activity>
        <Pillar>NOPS</Pillar>
      </OtherItem>
    </OtherItems>
  </CustomerInvoice>
</ns1:LogisticARInvoices>
```

### XML ShipChandler
```xml
<?xml version="1.0" encoding="UTF-8"?>
<ns1:LogisticARInvoices xmlns:ns1="urn:medlog.com:MSC_GVA_FS:CustomerInvoice:01.00">
  <CustomerInvoice>
    <Protocol>
      <SourceSystem>ShipChandler</SourceSystem>
      <TechnicalContact>shipchandler@ptyrmgmt.com</TechnicalContact>
    </Protocol>
    <Header>
      <CompanyCode>9327</CompanyCode>
      <DocumentType>XL</DocumentType>
      <DocumentDate>20241202</DocumentDate>
      <PostingDate>20241202</PostingDate>
      <TransactionCurrency>USD</TransactionCurrency>
      <Reference>SCH-2024-001</Reference>
      <EntityDocNbr>SAP345678</EntityDocNbr>
    </Header>
    <CustomerOpenItem>
      <CustomerNbr>C0009012</CustomerNbr>
      <AmntTransactCur>3500.00</AmntTransactCur>
      <BaselineDate>20241202</BaselineDate>
      <DueDate>20250101</DueDate>
    </CustomerOpenItem>
    <OtherItems>
      <OtherItem>
        <IncomeRebateCode>S</IncomeRebateCode>
        <AmntTransacCur>-3500.00</AmntTransacCur>
        <BaseUnitMeasure>EA</BaseUnitMeasure>
        <Qty>1</Qty>
        <ProfitCenter>PAPANC110</ProfitCenter>
        <Service>SUP001</Service>
        <Activity>SUP</Activity>
        <Pillar>LOGS</Pillar>
        <Commodity>PROVISIONS</Commodity>
        <Vessel>MSC VITA</Vessel>
        <VoyageNumber>2024W48</VoyageNumber>
      </OtherItem>
    </OtherItems>
  </CustomerInvoice>
</ns1:LogisticARInvoices>
```

### XML Agency
```xml
<?xml version="1.0" encoding="UTF-8"?>
<ns1:LogisticARInvoices xmlns:ns1="urn:medlog.com:MSC_GVA_FS:CustomerInvoice:01.00">
  <CustomerInvoice>
    <Protocol>
      <SourceSystem>Agency</SourceSystem>
      <TechnicalContact>agency@ptyrmgmt.com</TechnicalContact>
    </Protocol>
    <Header>
      <CompanyCode>9328</CompanyCode>
      <DocumentType>XL</DocumentType>
      <DocumentDate>20241202</DocumentDate>
      <PostingDate>20241202</PostingDate>
      <TransactionCurrency>USD</TransactionCurrency>
      <Reference>AGY-20241202-1430</Reference>
      <EntityDocNbr>SAP567890</EntityDocNbr>
    </Header>
    <CustomerOpenItem>
      <CustomerNbr>C0003456</CustomerNbr>
      <AmntTransactCur>450.00</AmntTransactCur>
      <BaselineDate>20241202</BaselineDate>
      <DueDate>20250101</DueDate>
    </CustomerOpenItem>
    <OtherItems>
      <OtherItem>
        <IncomeRebateCode>A</IncomeRebateCode>
        <AmntTransacCur>-450.00</AmntTransacCur>
        <BaseUnitMeasure>EA</BaseUnitMeasure>
        <Qty>3</Qty>
        <ProfitCenter>PAPANC110</ProfitCenter>
        <Service>AGY001</Service>
        <Activity>AGY</Activity>
        <Pillar>LOGS</Pillar>
        <MoveType>RT</MoveType>
        <PickupLocation>AIRPORT</PickupLocation>
        <DropoffLocation>PORT</DropoffLocation>
        <CrewCount>3</CrewCount>
        <Vessel>MSC OSCAR</Vessel>
        <VoyageNumber>2024E12</VoyageNumber>
      </OtherItem>
    </OtherItems>
  </CustomerInvoice>
</ns1:LogisticARInvoices>
```

### Mapeo de Códigos ISO para Contenedores

```javascript
// Función de mapeo tipo + tamaño → código ISO
function getCtrISOcode(ctrType: string, ctrSize: string): string {
  const mapping = {
    // Dry Van
    'DV_20': '22G1',
    'DV_40': '42G1',
    'DV_45': '45G1',
    
    // High Cube
    'HC_40': '45G1',
    'HC_45': 'L5G1',
    
    // Reefer
    'RF_20': '22R1',
    'RF_40': '42R1',
    'RF_45': '45R1',
    
    // Open Top
    'OT_20': '22U1',
    'OT_40': '42U1',
    
    // Flat Rack
    'FR_20': '22P1',
    'FR_40': '42P1',
    
    // Tank
    'TK_20': '20T0',
    'TK_40': '40T0',
    
    // Platform
    'PL_20': '22P0',
    'PL_40': '42P0',
    
    // Default fallback
    'default': '42G1'
  }
  
  const key = `${ctrType}_${ctrSize}`
  return mapping[key] || mapping['default']
}
```

---

# 7. REPORTES Y ESTADÍSTICAS

## 7.1 Dashboard Principal

### Acceso Exclusivo
Solo usuario `leandrojavier@gmail.com`

### Componentes del Dashboard

#### Cards de Estadísticas
```javascript
const stats = [
  {
    title: "Excel Pendientes",
    value: 45,
    description: "Archivos esperando formato",
    icon: FileSpreadsheet,
    color: "orange",
    progress: 45
  },
  {
    title: "Excel Formateados",
    value: 23,
    description: "Listos para crear facturas",
    icon: FileSpreadsheet,
    color: "green",
    progress: 23
  },
  {
    title: "Excel Procesados",
    value: 89,
    description: "Archivos ya utilizados",
    icon: FileSpreadsheet,
    color: "blue",
    progress: 89
  },
  {
    title: "Facturas Creadas",
    value: 156,
    description: "Facturas generadas",
    icon: FileText,
    color: "purple",
    progress: 100
  }
]
```

#### Tablas de Resumen
- **Archivos Excel Recientes** (5 últimos)
- **Facturas Recientes** (5 últimas)
- **Tipos de Excel Soportados** (configurados)

## 7.2 Reportes por Módulo

### Agency Reports (`/agency/reports`)

#### KPIs Principales
```javascript
const kpis = [
  { label: "Total Services", value: 1234, change: "+12%" },
  { label: "Revenue", value: "$45,678", change: "+8%" },
  { label: "Active Clients", value: 89, change: "+3%" },
  { label: "Avg Service Value", value: "$234", change: "+5%" }
]
```

#### Visualizaciones
1. **Top Clientes** - Tabla con ranking y montos
2. **Rendimiento por Ruta** - Gráfico de barras
3. **Tendencia Mensual** - Gráfico de línea
4. **Distribución por Tipo** - Gráfico circular

### PTYSS Reports (`/ptyss/reports`)

#### Métricas Específicas
- Contenedores procesados
- Servicios locales vs trasiego
- Ocupación de terminal
- Tiempos de permanencia

### Trucking Reports

#### Análisis de Datos
- Rutas más utilizadas
- Tipos de contenedor frecuentes
- Clientes por volumen
- Comparativa mensual

## 7.3 Historial General

### Página de Historial (`/historial`)

#### Filtros Disponibles
```typescript
interface HistoryFilters {
  search: string           // Búsqueda global
  status: "all" | "pending" | "completed" | "prefacturado" | "facturado"
  module: "all" | "ptyss" | "trucking" | "shipchandler" | "agency"
  type: "all" | "local" | "trasiego"
  dateRange: "all" | "today" | "week" | "month" | "custom"
  startDate?: Date
  endDate?: Date
}
```

#### Exportación a Excel

**Campos Exportados:**
```javascript
const excelColumns = [
  'Fecha', 'Módulo', 'Estado', 'Tipo',
  'Contenedor', 'Tamaño', 'Tipo Contenedor',
  'Full/Empty', 'Cliente', 'Naviera',
  'Buque', 'Viaje', 'Origen', 'Destino',
  'Ruta', 'Tipo Movimiento', 'Precio',
  'Moneda', 'Factura', 'Prefactura',
  'Usuario Creador', 'Fecha Creación',
  'Usuario Modificación', 'Fecha Modificación',
  'Observaciones'
]
```

**Función de Exportación:**
```javascript
function exportToExcel(data: Record[]) {
  const ws = XLSX.utils.json_to_sheet(
    data.map(record => ({
      'Fecha': formatDate(record.date),
      'Módulo': record.module.toUpperCase(),
      'Estado': translateStatus(record.status),
      'Tipo': record.type,
      'Contenedor': record.containerNumber,
      'Tamaño': record.size,
      'Tipo Contenedor': record.containerType,
      'Full/Empty': record.fe,
      'Cliente': record.client?.name || record.line,
      'Naviera': record.shippingLine,
      'Buque': record.vessel,
      'Viaje': record.voyage,
      'Origen': record.origin,
      'Destino': record.destination,
      'Ruta': record.route || `${record.origin}/${record.destination}`,
      'Tipo Movimiento': record.moveType,
      'Precio': record.price,
      'Moneda': record.currency || 'USD',
      'Factura': record.invoiceNumber,
      'Prefactura': record.prefacturaNumber,
      'Usuario Creador': record.createdBy,
      'Fecha Creación': formatDate(record.createdAt),
      'Usuario Modificación': record.updatedBy,
      'Fecha Modificación': formatDate(record.updatedAt),
      'Observaciones': record.comments
    }))
  )
  
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, "Historial")
  XLSX.writeFile(wb, `historial_${Date.now()}.xlsx`)
}
```

---

# 8. CONFIGURACIÓN Y CATÁLOGOS

## 8.1 Configuración de Trucking

### Gestión de Rutas (`/trucking/config`)

#### Formulario de Ruta
```typescript
interface TruckingRouteForm {
  name: string              // Auto-generado: "{origin}/{destination}"
  origin: string            // Código de 3 letras (PTY, COL, etc)
  destination: string       // Código de 3 letras
  containerType: string     // DV, HC, RF, OT, FR, TK, PL
  routeType: "SINGLE" | "RT"
  price: number             // Precio base USD
  status: "FULL" | "EMPTY"
  cliente: string           // Naviera principal
  routeArea: "PACIFIC" | "ATLANTIC" | "NORTH" | "SOUTH"
  sizeContenedor: "20" | "40" | "45"
  isActive: boolean
}
```

#### Validaciones de Ruta
- Combinación única: origen + destino + tipo + tamaño + cliente
- Precio mínimo: 0
- Códigos de origen/destino: 3 letras mayúsculas

### Tipos de Contenedor

#### Configuración de Container Types
```javascript
const containerTypes = [
  { code: "DV", name: "Dry Van", description: "Contenedor seco estándar" },
  { code: "HC", name: "High Cube", description: "Contenedor de altura extendida" },
  { code: "RF", name: "Reefer", description: "Contenedor refrigerado" },
  { code: "OT", name: "Open Top", description: "Contenedor sin techo" },
  { code: "FR", name: "Flat Rack", description: "Plataforma con paredes laterales" },
  { code: "TK", name: "Tank", description: "Contenedor tanque para líquidos" },
  { code: "PL", name: "Platform", description: "Plataforma sin paredes" }
]
```

## 8.2 Catálogos de Agency

### Locations (`/agency/catalogs/locations`)

#### Estructura de Location
```typescript
interface AgencyLocation {
  id: string
  name: string              // Nombre descriptivo
  address?: string          // Dirección física
  metadata: {
    siteTypeId: string    // HOTEL, PORT, AIRPORT, TERMINAL
    latitude?: number
    longitude?: number
    contactPhone?: string
    operatingHours?: string
  }
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}
```

#### Site Types Disponibles
```javascript
const siteTypes = [
  { id: "HOTEL", name: "Hotel", icon: "🏨" },
  { id: "PORT", name: "Port", icon: "⚓" },
  { id: "AIRPORT", name: "Airport", icon: "✈️" },
  { id: "TERMINAL", name: "Terminal", icon: "🏢" },
  { id: "OFFICE", name: "Office", icon: "🏢" },
  { id: "WAREHOUSE", name: "Warehouse", icon: "📦" }
]
```

### Vessels (`/agency/catalogs/vessels`)

#### Gestión de Vessels
```typescript
interface Vessel {
  id: string
  name: string              // Nombre del buque
  shippingLine: string      // Línea naviera
  imo?: string             // Número IMO
  flag?: string            // Bandera
  capacity?: number        // Capacidad TEU
  type?: string           // Container, Bulk, Tanker, etc
  yearBuilt?: number
  lastPort?: string
  nextPort?: string
  eta?: Date              // Estimated Time of Arrival
  etd?: Date              // Estimated Time of Departure
  isActive: boolean
}
```

### Drivers (`/agency/catalogs/drivers`)

#### Información de Conductores
```typescript
interface Driver {
  id: string
  name: string
  phone: string
  license: string
  transportCompanyId: string
  vehiclePlate?: string
  vehicleType?: string     // Sedan, Van, Bus, Truck
  vehicleCapacity?: number // Número de pasajeros
  documentExpiry?: Date
  insuranceExpiry?: Date
  rating?: number          // 1-5 estrellas
  totalTrips?: number
  isActive: boolean
}
```

### Transport Companies (`/agency/catalogs/companies`)

#### Gestión de Compañías
```typescript
interface TransportCompany {
  id: string
  name: string
  ruc?: string
  contactName?: string
  contactPhone?: string
  contactEmail?: string
  address?: string
  fleetSize?: number       // Número de vehículos
  drivers?: Driver[]       // Conductores asociados
  services?: string[]      // Tipos de servicio ofrecidos
  rating?: number
  isActive: boolean
}
```

### Crew Ranks (`/agency/catalogs/ranks`)

#### Rangos de Tripulación
```javascript
const crewRanks = [
  // Officers
  { code: "CAPT", name: "Captain", level: 1 },
  { code: "CHOF", name: "Chief Officer", level: 2 },
  { code: "2OFF", name: "Second Officer", level: 3 },
  { code: "3OFF", name: "Third Officer", level: 4 },
  
  // Engineers
  { code: "CHENG", name: "Chief Engineer", level: 1 },
  { code: "2ENG", name: "Second Engineer", level: 2 },
  { code: "3ENG", name: "Third Engineer", level: 3 },
  { code: "4ENG", name: "Fourth Engineer", level: 4 },
  
  // Deck
  { code: "BSN", name: "Bosun", level: 5 },
  { code: "AB", name: "Able Seaman", level: 6 },
  { code: "OS", name: "Ordinary Seaman", level: 7 },
  
  // Engine
  { code: "FITT", name: "Fitter", level: 5 },
  { code: "OILER", name: "Oiler", level: 6 },
  { code: "WIPER", name: "Wiper", level: 7 },
  
  // Catering
  { code: "COOK", name: "Cook", level: 5 },
  { code: "STWD", name: "Steward", level: 6 },
  
  // Others
  { code: "CADET", name: "Cadet", level: 8 },
  { code: "SUPNUM", name: "Supernumerary", level: 9 }
]
```

### Nationalities (`/agency/catalogs/nationalities`)

#### Gestión de Nacionalidades
```javascript
const nationalities = [
  { code: "PAN", name: "Panamanian", spanishName: "Panameño" },
  { code: "PHL", name: "Filipino", spanishName: "Filipino" },
  { code: "IND", name: "Indian", spanishName: "Indio" },
  { code: "CHN", name: "Chinese", spanishName: "Chino" },
  { code: "RUS", name: "Russian", spanishName: "Ruso" },
  { code: "UKR", name: "Ukrainian", spanishName: "Ucraniano" },
  // ... más nacionalidades
]
```

## 8.3 Configuración de PTYSS

### Rutas PTYSS (`/ptyss/config`)

#### Configuración de Rutas Locales
```typescript
interface PTYSSRoute {
  id: string
  name: string              // Nombre descriptivo
  origin: string            // Terminal origen
  destination: string       // Terminal destino
  serviceType: "local" | "trasiego"
  containerTypes: string[]  // Tipos permitidos
  basePrice: number
  currency: "USD" | "PAB"
  validFrom: Date
  validTo?: Date
  restrictions?: string[]   // Restricciones especiales
  isActive: boolean
}
```

### Navieras (`/ptyss/config/shipping-lines`)

#### Gestión de Líneas Navieras
```typescript
interface ShippingLine {
  id: string
  code: string              // Código de 3 letras (MSC, CMA, etc)
  name: string              // Nombre completo
  sapCode?: string          // Código SAP
  contactName?: string
  contactEmail?: string
  contactPhone?: string
  creditTerms?: number      // Días de crédito
  currency?: "USD" | "PAB"
  discount?: number         // Porcentaje de descuento
  specialRates?: {
    service: string
    rate: number
  }[]
  isActive: boolean
}
```

## 8.4 Configuración de ShipChandler

### Productos y Suministros (`/shipchandler/config/products`)

#### Catálogo de Productos
```typescript
interface ShipChandlerProduct {
  id: string
  code: string              // Código interno
  name: string              // Nombre del producto
  category: string          // Categoría (Provisions, Stores, etc)
  unit: string             // Unidad de medida (KG, L, EA, etc)
  basePrice: number
  currency: "USD" | "PAB"
  minOrder?: number        // Cantidad mínima
  maxOrder?: number        // Cantidad máxima
  leadTime?: number        // Días de entrega
  supplier?: string
  taxRate?: number         // ITBMS
  description?: string
  specifications?: string
  isActive: boolean
}
```

### Categorías de Productos

```javascript
const productCategories = [
  { code: "PROV", name: "Provisions", description: "Food and beverages" },
  { code: "DECK", name: "Deck Stores", description: "Deck supplies" },
  { code: "ENG", name: "Engine Stores", description: "Engine room supplies" },
  { code: "CAB", name: "Cabin Stores", description: "Accommodation supplies" },
  { code: "MED", name: "Medical", description: "Medical supplies" },
  { code: "SAFE", name: "Safety", description: "Safety equipment" },
  { code: "CHEM", name: "Chemicals", description: "Cleaning and chemicals" },
  { code: "BOND", name: "Bonded", description: "Bonded stores" }
]
```

---

# 9. INTEGRACIONES EXTERNAS

## 9.1 Integración con SAP

### Configuración de Conexión
```javascript
// Configuración SAP
const sapConfig = {
  // Endpoints por módulo
  trucking: {
    companyCode: "9325",
    endpoint: "/sap/trucking/invoice",
    ftpPath: "/invoices/trucking/"
  },
  ptyss: {
    companyCode: "9326",
    endpoint: "/sap/ptyss/invoice",
    ftpPath: "/invoices/ptyss/"
  },
  shipchandler: {
    companyCode: "9327",
    endpoint: "/sap/shipchandler/invoice",
    ftpPath: "/invoices/shipchandler/"
  },
  agency: {
    companyCode: "9328",
    endpoint: "/sap/agency/invoice",
    ftpPath: "/invoices/agency/"
  }
}
```

### Proceso de Envío a SAP

1. **Generación de XML**
   ```javascript
   const xml = generateSAPXML({
     module: 'trucking',
     invoice: invoiceData,
     client: clientData,
     items: itemsData
   })
   ```

2. **Validación XSD**
   ```javascript
   const isValid = validateXMLSchema(xml, 'CustomerInvoice.xsd')
   if (!isValid) {
     throw new Error('XML no cumple con esquema SAP')
   }
   ```

3. **Envío FTP**
   ```javascript
   const ftpClient = new FTPClient(sapConfig[module])
   await ftpClient.upload(xml, `${invoiceNumber}.xml`)
   ```

4. **Confirmación y Logging**
   ```javascript
   await logSAPTransaction({
     invoiceNumber,
     module,
     status: 'sent',
     timestamp: new Date(),
     xmlContent: xml
   })
   ```

## 9.2 Procesamiento de Excel

### Librería SheetJS (xlsx)

#### Lectura de Archivos
```javascript
async function parseExcelFile(file: File): Promise<any[]> {
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array' })
  
  // Tomar primera hoja
  const sheetName = workbook.SheetNames[0]
  const worksheet = workbook.Sheets[sheetName]
  
  // Convertir a JSON
  const data = XLSX.utils.sheet_to_json(worksheet, {
    raw: false,        // Convertir fechas
    dateNF: 'DD/MM/YYYY'
  })
  
  return data
}
```

#### Conversión de Fechas Excel
```javascript
function convertExcelDate(excelDate: number): Date {
  // Excel almacena fechas como días desde 1900
  const EXCEL_EPOCH = new Date(1900, 0, 1)
  const LEAP_YEAR_BUG = 1 // Excel cuenta 1900 como bisiesto
  
  const days = excelDate - LEAP_YEAR_BUG
  const date = new Date(EXCEL_EPOCH.getTime() + days * 24 * 60 * 60 * 1000)
  
  return date
}
```

### Validación de Estructura

#### Trucking Excel
```javascript
const requiredColumns = [
  'Container',           // Número de contenedor
  'Container Consecutive', // Consecutivo único
  'F/E',                // Full/Empty
  'Size',               // 20/40/45
  'Type',               // Tipo de contenedor
  'Move Date',          // Fecha de movimiento
  'Cliente',            // Nombre del cliente
  'Leg',                // Ruta (origen/destino)
  'Move Type'           // SINGLE/RT
]

function validateTruckingExcel(data: any[]): ValidationResult {
  const errors = []
  
  // Verificar columnas requeridas
  const columns = Object.keys(data[0] || {})
  for (const required of requiredColumns) {
    if (!columns.includes(required)) {
      errors.push(`Columna faltante: ${required}`)
    }
  }
  
  // Validar datos fila por fila
  data.forEach((row, index) => {
    if (!row.Container?.match(/^[A-Z]{4}\d{7}$/)) {
      errors.push(`Fila ${index + 2}: Container inválido`)
    }
    if (!['FULL', 'EMPTY'].includes(row['F/E'])) {
      errors.push(`Fila ${index + 2}: F/E debe ser FULL o EMPTY`)
    }
    // ... más validaciones
  })
  
  return { isValid: errors.length === 0, errors }
}
```

## 9.3 Generación de PDFs

### Configuración jsPDF

#### Inicialización
```javascript
import jsPDF from 'jspdf'
import 'jspdf-autotable'

function createPDF(title: string): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  })
  
  // Configurar fuentes
  doc.setFont('helvetica')
  doc.setFontSize(12)
  
  return doc
}
```

### Templates de Facturas

#### Template Trucking/PTG
```javascript
function generateTruckingPDF(invoice: Invoice): Uint8Array {
  const doc = createPDF('Factura PTG')
  
  // Header
  doc.setFontSize(20)
  doc.text('PTG - Panama Terminal & Trucking', 105, 20, { align: 'center' })
  
  // Información de factura
  doc.setFontSize(10)
  doc.text(`Factura: ${invoice.number}`, 20, 40)
  doc.text(`Fecha: ${formatDate(invoice.date)}`, 20, 45)
  doc.text(`Cliente: ${invoice.client.name}`, 20, 50)
  doc.text(`RUC/ID: ${invoice.client.ruc}`, 20, 55)
  
  // Tabla de items
  const tableData = invoice.items.map(item => [
    item.description,
    item.quantity,
    item.unitPrice,
    item.total
  ])
  
  doc.autoTable({
    startY: 65,
    head: [['Descripción', 'Cantidad', 'Precio Unit.', 'Total']],
    body: tableData,
    theme: 'grid',
    styles: { fontSize: 9 },
    columnStyles: {
      0: { cellWidth: 80 },
      1: { cellWidth: 30, halign: 'center' },
      2: { cellWidth: 40, halign: 'right' },
      3: { cellWidth: 40, halign: 'right' }
    }
  })
  
  // Totales
  const finalY = doc.lastAutoTable.finalY + 10
  doc.text(`Subtotal: $${invoice.subtotal}`, 150, finalY)
  doc.text(`ITBMS (7%): $${invoice.tax}`, 150, finalY + 5)
  doc.setFont('helvetica', 'bold')
  doc.text(`Total: $${invoice.total}`, 150, finalY + 10)
  
  // Footer
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.text('Términos y Condiciones:', 20, finalY + 20)
  doc.text('- Pago a 30 días', 20, finalY + 25)
  doc.text('- Sujeto a términos del contrato', 20, finalY + 30)
  
  return doc.output('arraybuffer')
}
```

#### Template Agency
```javascript
function generateAgencyPDF(services: Service[]): Uint8Array {
  const doc = createPDF('Agency Services Invoice')
  
  // Logo y header
  doc.addImage(logoBase64, 'PNG', 20, 10, 40, 20)
  doc.setFontSize(16)
  doc.text('AGENCY SERVICES INVOICE', 105, 20, { align: 'center' })
  
  // Información del cliente
  const client = services[0].client
  doc.setFontSize(10)
  doc.text(`Bill To: ${client.name}`, 20, 40)
  doc.text(`Address: ${client.address}`, 20, 45)
  doc.text(`Invoice Date: ${formatDate(new Date())}`, 150, 40)
  doc.text(`Due Date: ${formatDate(addDays(new Date(), 30))}`, 150, 45)
  
  // Servicios agrupados
  const groupedServices = groupServicesByVessel(services)
  let yPosition = 60
  
  groupedServices.forEach(group => {
    // Header del vessel
    doc.setFont('helvetica', 'bold')
    doc.text(`Vessel: ${group.vessel}`, 20, yPosition)
    doc.text(`Voyage: ${group.voyage}`, 100, yPosition)
    yPosition += 5
    
    // Tabla de servicios
    const tableData = group.services.map(service => [
      formatDate(service.pickupDate),
      service.pickupTime,
      `${service.pickupLocation} → ${service.dropoffLocation}`,
      service.crewMembers.length,
      service.moveType,
      `$${service.price}`
    ])
    
    doc.autoTable({
      startY: yPosition,
      head: [['Date', 'Time', 'Route', 'Pax', 'Type', 'Amount']],
      body: tableData,
      theme: 'striped',
      styles: { fontSize: 8 },
      margin: { left: 20, right: 20 }
    })
    
    yPosition = doc.lastAutoTable.finalY + 10
  })
  
  // Resumen y totales
  const summary = calculateSummary(services)
  doc.setFont('helvetica', 'normal')
  doc.text(`Total Services: ${summary.count}`, 130, yPosition)
  doc.text(`Total Passengers: ${summary.passengers}`, 130, yPosition + 5)
  doc.setFont('helvetica', 'bold')
  doc.text(`Total Amount: $${summary.total}`, 130, yPosition + 10)
  
  return doc.output('arraybuffer')
}
```

## 9.4 Autenticación JWT

### Generación de Tokens

#### Backend - Creación de Token
```javascript
// Backend (Node.js/Express)
const jwt = require('jsonwebtoken')

function generateToken(user) {
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
    modules: user.modules
  }
  
  const token = jwt.sign(
    payload,
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  )
  
  return token
}
```

### Verificación de Tokens

#### Frontend - Interceptor
```javascript
// Frontend - Axios interceptor
import axios from 'axios'

// Request interceptor
axios.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  error => Promise.reject(error)
)

// Response interceptor
axios.interceptors.response.use(
  response => response,
  async error => {
    if (error.response?.status === 401) {
      // Token expirado o inválido
      localStorage.removeItem('token')
      localStorage.removeItem('isAuthenticated')
      localStorage.removeItem('currentUser')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)
```

#### Middleware de Verificación
```typescript
// middleware.ts
import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

export async function middleware(request: NextRequest) {
  const token = request.cookies.get('auth-token')
  
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET!)
    await jwtVerify(token.value, secret)
    return NextResponse.next()
  } catch {
    // Token inválido
    const response = NextResponse.redirect(new URL('/login', request.url))
    response.cookies.delete('auth-token')
    return response
  }
}

export const config = {
  matcher: [
    '/((?!login|register|_next/static|_next/image|favicon.ico).*)',
  ]
}
```

---

# 10. MANEJO DE ERRORES

## 10.1 Tipos de Errores

### Errores de Autenticación
```javascript
// Token expirado
{
  code: "AUTH_TOKEN_EXPIRED",
  message: "Tu sesión ha expirado. Por favor inicia sesión nuevamente.",
  action: "redirect:/login"
}

// Credenciales inválidas
{
  code: "AUTH_INVALID_CREDENTIALS",
  message: "Email o contraseña incorrectos.",
  action: "stay"
}

// Usuario inactivo
{
  code: "AUTH_USER_INACTIVE",
  message: "Tu cuenta está desactivada. Contacta al administrador.",
  action: "stay"
}
```

### Errores de Permisos
```javascript
// Sin acceso a módulo
{
  code: "PERM_MODULE_DENIED",
  message: "No tienes acceso al módulo {module}.",
  action: "redirect:/"
}

// Sin acceso a sección
{
  code: "PERM_SECTION_DENIED",
  message: "No tienes permisos para acceder a esta sección.",
  action: "redirect:back"
}

// Rol insuficiente
{
  code: "PERM_ROLE_INSUFFICIENT",
  message: "Tu rol ({role}) no tiene permisos para esta acción.",
  action: "toast"
}
```

### Errores de Validación
```javascript
// Campos requeridos
{
  code: "VAL_REQUIRED_FIELDS",
  message: "Por favor complete todos los campos requeridos.",
  fields: ["email", "password"]
}

// Formato inválido
{
  code: "VAL_INVALID_FORMAT",
  message: "El campo {field} tiene un formato inválido.",
  field: "email",
  expectedFormat: "email@domain.com"
}

// Duplicado
{
  code: "VAL_DUPLICATE_ENTRY",
  message: "Ya existe un registro con este {field}.",
  field: "containerConsecutive"
}
```

## 10.2 Manejo Global de Errores

### Redux Error Slice
```typescript
// store/slices/errorSlice.ts
interface ErrorState {
  errors: ErrorRecord[]
  globalError: string | null
}

const errorSlice = createSlice({
  name: 'error',
  initialState: {
    errors: [],
    globalError: null
  },
  reducers: {
    addError: (state, action) => {
      state.errors.push({
        id: Date.now(),
        ...action.payload,
        timestamp: new Date().toISOString()
      })
    },
    clearError: (state, action) => {
      state.errors = state.errors.filter(e => e.id !== action.payload)
    },
    setGlobalError: (state, action) => {
      state.globalError = action.payload
    }
  }
})
```

### Error Boundary Component
```typescript
// components/error-boundary.tsx
import { Component, ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }
  
  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }
  
  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Error caught by boundary:', error, errorInfo)
    // Enviar a servicio de logging
    logErrorToService(error, errorInfo)
  }
  
  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="error-fallback">
          <h2>Algo salió mal</h2>
          <p>{this.state.error?.message}</p>
          <button onClick={() => window.location.reload()}>
            Recargar página
          </button>
        </div>
      )
    }
    
    return this.props.children
  }
}
```

## 10.3 Logging y Monitoreo

### Sistema de Logging
```javascript
// lib/logger.ts
enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

class Logger {
  private static instance: Logger
  
  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger()
    }
    return Logger.instance
  }
  
  log(level: LogLevel, message: string, data?: any) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      data,
      userAgent: navigator.userAgent,
      url: window.location.href,
      user: this.getCurrentUser()
    }
    
    // Console log en desarrollo
    if (process.env.NODE_ENV === 'development') {
      console.log(`[${level.toUpperCase()}]`, message, data)
    }
    
    // Enviar a servidor en producción
    if (process.env.NODE_ENV === 'production') {
      this.sendToServer(logEntry)
    }
  }
  
  private sendToServer(logEntry: any) {
    fetch('/api/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(logEntry)
    }).catch(err => {
      // Fallback a localStorage si falla el envío
      const logs = JSON.parse(localStorage.getItem('pendingLogs') || '[]')
      logs.push(logEntry)
      localStorage.setItem('pendingLogs', JSON.stringify(logs))
    })
  }
  
  debug(message: string, data?: any) {
    this.log(LogLevel.DEBUG, message, data)
  }
  
  info(message: string, data?: any) {
    this.log(LogLevel.INFO, message, data)
  }
  
  warn(message: string, data?: any) {
    this.log(LogLevel.WARN, message, data)
  }
  
  error(message: string, data?: any) {
    this.log(LogLevel.ERROR, message, data)
  }
}

export const logger = Logger.getInstance()
```

### Tracking de Eventos
```javascript
// hooks/useEventTracking.ts
export function useEventTracking() {
  const track = useCallback((event: string, properties?: any) => {
    logger.info(`Event: ${event}`, properties)
    
    // Google Analytics
    if (typeof gtag !== 'undefined') {
      gtag('event', event, properties)
    }
    
    // Custom analytics
    fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, properties })
    })
  }, [])
  
  return { track }
}
```

---

# 11. COMPONENTES TÉCNICOS

## 11.1 Hooks Personalizados

### useAuth Hook
```typescript
// hooks/useAuth.ts
export function useAuth() {
  const dispatch = useAppDispatch()
  const { currentUser, isAuthenticated, loading } = useAppSelector(state => state.auth)
  
  const login = useCallback(async (email: string, password: string) => {
    const result = await dispatch(loginAsync({ email, password }))
    return result.meta.requestStatus === 'fulfilled'
  }, [dispatch])
  
  const logout = useCallback(() => {
    dispatch(logoutUser())
    localStorage.clear()
    document.cookie = 'auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT'
  }, [dispatch])
  
  const hasPermission = useCallback((requiredRole: string) => {
    if (!currentUser) return false
    if (currentUser.role === 'administrador') return true
    return currentUser.roles?.includes(requiredRole) || currentUser.role === requiredRole
  }, [currentUser])
  
  const hasModule = useCallback((module: string) => {
    if (!currentUser) return false
    if (currentUser.role === 'administrador') return true
    return currentUser.modules?.includes(module)
  }, [currentUser])
  
  return {
    user: currentUser,
    isAuthenticated,
    loading,
    login,
    logout,
    hasPermission,
    hasModule
  }
}
```

### useDebounce Hook
```typescript
// hooks/useDebounce.ts
export function useDebounce<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)
    
    return () => {
      clearTimeout(timer)
    }
  }, [value, delay])
  
  return debouncedValue
}
```

### usePagination Hook
```typescript
// hooks/usePagination.ts
interface PaginationOptions {
  totalItems: number
  itemsPerPage?: number
  initialPage?: number
}

export function usePagination(options: PaginationOptions) {
  const { totalItems, itemsPerPage = 10, initialPage = 1 } = options
  const [currentPage, setCurrentPage] = useState(initialPage)
  
  const totalPages = Math.ceil(totalItems / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems)
  
  const goToPage = useCallback((page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)))
  }, [totalPages])
  
  const nextPage = useCallback(() => {
    goToPage(currentPage + 1)
  }, [currentPage, goToPage])
  
  const prevPage = useCallback(() => {
    goToPage(currentPage - 1)
  }, [currentPage, goToPage])
  
  return {
    currentPage,
    totalPages,
    startIndex,
    endIndex,
    goToPage,
    nextPage,
    prevPage,
    hasNextPage: currentPage < totalPages,
    hasPrevPage: currentPage > 1
  }
}
```

## 11.2 Componentes UI Reutilizables

### DataTable Component
```typescript
// components/ui/data-table.tsx
interface DataTableProps<T> {
  data: T[]
  columns: ColumnDef<T>[]
  searchable?: boolean
  searchPlaceholder?: string
  filterable?: boolean
  filters?: Filter[]
  pagination?: boolean
  pageSize?: number
  onRowClick?: (row: T) => void
  actions?: TableAction<T>[]
}

export function DataTable<T>({
  data,
  columns,
  searchable = true,
  filterable = true,
  pagination = true,
  pageSize = 10,
  ...props
}: DataTableProps<T>) {
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState<Record<string, any>>({})
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null)
  
  // Filtrado
  const filteredData = useMemo(() => {
    let result = [...data]
    
    // Búsqueda
    if (search) {
      result = result.filter(item =>
        Object.values(item).some(value =>
          String(value).toLowerCase().includes(search.toLowerCase())
        )
      )
    }
    
    // Filtros
    Object.entries(filters).forEach(([key, value]) => {
      if (value && value !== 'all') {
        result = result.filter(item => item[key] === value)
      }
    })
    
    // Ordenamiento
    if (sortConfig) {
      result.sort((a, b) => {
        const aVal = a[sortConfig.key]
        const bVal = b[sortConfig.key]
        
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1
        return 0
      })
    }
    
    return result
  }, [data, search, filters, sortConfig])
  
  // Paginación
  const {
    currentPage,
    totalPages,
    startIndex,
    endIndex,
    goToPage,
    nextPage,
    prevPage
  } = usePagination({
    totalItems: filteredData.length,
    itemsPerPage: pageSize
  })
  
  const paginatedData = filteredData.slice(startIndex, endIndex)
  
  return (
    <div className="space-y-4">
      {/* Controles superiores */}
      <div className="flex justify-between items-center">
        {searchable && (
          <Input
            placeholder={props.searchPlaceholder || "Buscar..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />
        )}
        
        {filterable && props.filters && (
          <div className="flex gap-2">
            {props.filters.map(filter => (
              <Select
                key={filter.key}
                value={filters[filter.key] || 'all'}
                onValueChange={(value) => 
                  setFilters(prev => ({ ...prev, [filter.key]: value }))
                }
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder={filter.label} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {filter.options.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ))}
          </div>
        )}
      </div>
      
      {/* Tabla */}
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map(column => (
              <TableHead
                key={column.key}
                className={column.sortable ? 'cursor-pointer' : ''}
                onClick={() => column.sortable && handleSort(column.key)}
              >
                <div className="flex items-center gap-2">
                  {column.header}
                  {column.sortable && <SortIcon column={column.key} config={sortConfig} />}
                </div>
              </TableHead>
            ))}
            {props.actions && <TableHead>Acciones</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedData.map((row, index) => (
            <TableRow
              key={index}
              className={props.onRowClick ? 'cursor-pointer hover:bg-gray-50' : ''}
              onClick={() => props.onRowClick?.(row)}
            >
              {columns.map(column => (
                <TableCell key={column.key}>
                  {column.render ? column.render(row) : row[column.key]}
                </TableCell>
              ))}
              {props.actions && (
                <TableCell>
                  <div className="flex gap-2">
                    {props.actions.map((action, i) => (
                      <Button
                        key={i}
                        variant={action.variant || 'ghost'}
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          action.onClick(row)
                        }}
                      >
                        {action.icon && <action.icon className="h-4 w-4" />}
                        {action.label}
                      </Button>
                    ))}
                  </div>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      
      {/* Paginación */}
      {pagination && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">
            Mostrando {startIndex + 1} a {endIndex} de {filteredData.length} registros
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={prevPage}
              disabled={currentPage === 1}
            >
              Anterior
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(page => 
                  page === 1 ||
                  page === totalPages ||
                  Math.abs(page - currentPage) <= 2
                )
                .map((page, index, array) => (
                  <Fragment key={page}>
                    {index > 0 && array[index - 1] !== page - 1 && (
                      <span className="px-2">...</span>
                    )}
                    <Button
                      variant={page === currentPage ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => goToPage(page)}
                    >
                      {page}
                    </Button>
                  </Fragment>
                ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={nextPage}
              disabled={currentPage === totalPages}
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
```

### FormField Component
```typescript
// components/ui/form-field.tsx
interface FormFieldProps {
  label: string
  name: string
  type?: 'text' | 'email' | 'password' | 'number' | 'date' | 'select' | 'textarea'
  value: any
  onChange: (value: any) => void
  error?: string
  required?: boolean
  disabled?: boolean
  placeholder?: string
  options?: { value: string; label: string }[]
  rows?: number
  min?: number
  max?: number
  step?: number
}

export function FormField({
  label,
  name,
  type = 'text',
  value,
  onChange,
  error,
  required = false,
  disabled = false,
  ...props
}: FormFieldProps) {
  const renderInput = () => {
    switch (type) {
      case 'select':
        return (
          <Select
            value={value}
            onValueChange={onChange}
            disabled={disabled}
          >
            <SelectTrigger className={error ? 'border-red-500' : ''}>
              <SelectValue placeholder={props.placeholder || `Seleccionar ${label}`} />
            </SelectTrigger>
            <SelectContent>
              {props.options?.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )
        
      case 'textarea':
        return (
          <Textarea
            name={name}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            placeholder={props.placeholder}
            rows={props.rows || 3}
            className={error ? 'border-red-500' : ''}
          />
        )
        
      default:
        return (
          <Input
            type={type}
            name={name}
            value={value}
            onChange={(e) => onChange(
              type === 'number' ? parseFloat(e.target.value) : e.target.value
            )}
            disabled={disabled}
            placeholder={props.placeholder}
            min={props.min}
            max={props.max}
            step={props.step}
            className={error ? 'border-red-500' : ''}
          />
        )
    }
  }
  
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>
        {label} {required && <span className="text-red-500">*</span>}
      </Label>
      {renderInput()}
      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}
    </div>
  )
}
```

### Modal Component
```typescript
// components/ui/modal.tsx
interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  description?: string
  children: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  closeOnOverlayClick?: boolean
  closeOnEsc?: boolean
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  closeOnOverlayClick = true,
  closeOnEsc = true
}: ModalProps) {
  useEffect(() => {
    if (!closeOnEsc) return
    
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    
    if (isOpen) {
      document.addEventListener('keydown', handleEsc)
    }
    
    return () => document.removeEventListener('keydown', handleEsc)
  }, [isOpen, onClose, closeOnEsc])
  
  if (!isOpen) return null
  
  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    full: 'max-w-full mx-4'
  }
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={closeOnOverlayClick ? onClose : undefined}
      />
      
      {/* Modal */}
      <div className={`relative bg-white rounded-lg shadow-xl ${sizeClasses[size]} w-full max-h-[90vh] flex flex-col`}>
        {/* Header */}
        {(title || description) && (
          <div className="px-6 py-4 border-b">
            {title && (
              <h2 className="text-lg font-semibold">{title}</h2>
            )}
            {description && (
              <p className="text-sm text-gray-500 mt-1">{description}</p>
            )}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {children}
        </div>
        
        {/* Footer */}
        {footer && (
          <div className="px-6 py-4 border-t">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
```

---

# 12. ANEXOS Y REFERENCIAS

## 12.1 Códigos y Referencias Rápidas

### Códigos de Company SAP
```
9325 - Trucking/PTG
9326 - PTYSS
9327 - ShipChandler
9328 - Agency
```

### Códigos de Servicio SAP Comunes
```
TRK001 - Trucking Service
TRK002 - Transfer Service
TRK182 - Customs (AUTH)
TRK175 - Administration Fee (AUTH)
CLG097 - Gate Service
TRK163 - Terminal Handling
TRK179 - Storage
SLR168 - Reefer Connection
AGY001 - Agency Transport
SUP001 - Ship Supplies
```

### Estados de Registros
```typescript
type RecordStatus = 
  | 'pending'       // Pendiente de procesar
  | 'processing'    // En procesamiento
  | 'completed'     // Completado
  | 'prefacturado'  // Con prefactura generada
  | 'facturado'     // Con factura final
  | 'cancelled'     // Cancelado
  | 'error'        // Error en procesamiento
```

### Tipos de Movimiento
```typescript
type MoveType = 
  | 'SINGLE'        // Viaje único
  | 'RT'           // Round Trip (ida y vuelta)
  | 'INTERNAL'     // Movimiento interno
  | 'BAGS_CLAIM'   // Reclamo de equipaje
  | 'DOCUMENTATION' // Solo documentación
  | 'NO_SHOW'      // No presentado
```

## 12.2 Estructura de Base de Datos

### Colección Users
```javascript
{
  _id: ObjectId,
  username: String,
  email: String,
  password: String,        // Hashed
  fullName: String,
  name: String,
  lastName: String,
  role: String,           // Compatibilidad
  roles: [String],        // Roles múltiples
  modules: [String],
  isActive: Boolean,
  lastLogin: Date,
  createdAt: Date,
  updatedAt: Date,
  createdBy: ObjectId,
  updatedBy: ObjectId
}
```

### Colección Clients
```javascript
{
  _id: ObjectId,
  type: "natural" | "juridico",
  sapCode: String,         // Único
  // Para natural
  fullName: String,
  documentType: String,
  documentNumber: String,
  // Para jurídico
  companyName: String,
  name: String,           // Nombre corto
  ruc: String,
  contactName: String,
  // Comunes
  email: String,
  phone: String,
  address: String,
  modules: [String],      // Módulos donde está activo
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

### Colección Records (Trucking)
```javascript
{
  _id: ObjectId,
  excelId: ObjectId,       // Referencia al archivo Excel
  containerNumber: String,
  containerConsecutive: String,
  fe: "FULL" | "EMPTY",
  size: "20" | "40" | "45",
  type: String,           // Tipo de contenedor
  detectedType: "REEFER" | "DRY",
  moveDate: Date,
  client: ObjectId,       // Referencia a cliente
  line: String,          // Naviera
  leg: String,           // Ruta origen/destino
  moveType: String,
  matchedPrice: Number,
  status: String,
  invoiceId: ObjectId,    // Si facturado
  prefacturaId: ObjectId, // Si prefacturado
  createdAt: Date,
  updatedAt: Date
}
```

### Colección Services (Agency)
```javascript
{
  _id: ObjectId,
  pickupDate: Date,
  pickupTime: String,
  pickupLocation: ObjectId,
  dropoffLocation: ObjectId,
  returnDropoffLocation: ObjectId,
  moveType: String,
  vessel: ObjectId,
  voyage: String,
  transportCompany: ObjectId,
  driver: ObjectId,
  client: ObjectId,
  crewMembers: [{
    name: String,
    nationality: String,
    crewRank: String,
    crewCategory: String,
    flight: String
  }],
  price: Number,
  currency: String,
  waitingTime: Number,
  status: String,
  approve: Boolean,
  comments: String,
  serviceCode: String,
  invoiceId: ObjectId,
  createdAt: Date,
  updatedAt: Date,
  createdBy: ObjectId
}
```

## 12.3 Variables de Entorno

### .env.local (Frontend)
```bash
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:8080
NEXT_PUBLIC_PRODUCTION_API_URL=https://barcos-production-3aad.up.railway.app

# Authentication
JWT_SECRET=your-secret-key-here

# Analytics (opcional)
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX

# Features Flags
NEXT_PUBLIC_ENABLE_DEBUG=true
NEXT_PUBLIC_ENABLE_ANALYTICS=false
```

### .env (Backend)
```bash
# Database
MONGODB_URI=mongodb://localhost:27017/barcos
DATABASE_NAME=barcos

# Authentication
JWT_SECRET=your-secret-key-here
BCRYPT_ROUNDS=10

# Server
PORT=8080
NODE_ENV=development

# SAP Integration
SAP_FTP_HOST=ftp.sap.example.com
SAP_FTP_USER=username
SAP_FTP_PASSWORD=password
SAP_FTP_PORT=21

# Email (opcional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=notifications@example.com
SMTP_PASSWORD=password
```

## 12.4 Scripts y Comandos

### Package.json Scripts (Frontend)
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "type-check": "tsc --noEmit",
    "format": "prettier --write .",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  }
}
```

### Comandos Útiles de Desarrollo
```bash
# Instalar dependencias
npm install

# Desarrollo local
npm run dev

# Build para producción
npm run build

# Verificar tipos TypeScript
npm run type-check

# Ejecutar linter
npm run lint

# Formatear código
npm run format

# Ejecutar tests
npm run test

# Ver cambios en tiempo real
npm run dev -- --turbo
```

## 12.5 Troubleshooting Común

### Problemas de Autenticación
```javascript
// Token expirado
// Solución: Limpiar localStorage y cookies
localStorage.clear()
document.cookie = 'auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT'
window.location.href = '/login'

// Usuario sin permisos
// Verificar en consola:
console.log('Current user:', currentUser)
console.log('Roles:', currentUser.roles)
console.log('Modules:', currentUser.modules)
```

### Problemas de Carga de Datos
```javascript
// Excel no se procesa
// Verificar:
1. Formato de columnas correcto
2. Fechas en formato Excel válido
3. Sin caracteres especiales en containerConsecutive

// Rutas no hacen match
// Verificar:
1. Configuración de rutas activas
2. Códigos de origen/destino exactos
3. Tipo de contenedor configurado
```

### Problemas de Generación de XML
```javascript
// XML inválido para SAP
// Verificar:
1. Cliente tiene SAP code
2. Todos los campos requeridos presentes
3. Formato de fechas YYYYMMDD
4. Company code correcto por módulo
```

---

# 12. SEGURIDAD DEL SISTEMA

## 12.1 Arquitectura de Seguridad

### Sistema de Autenticación Multinivel
El sistema implementa una arquitectura de seguridad robusta con múltiples capas de protección:

#### JWT (JSON Web Tokens)
- **Generación segura**: Tokens firmados con secret key
- **Expiración**: 24 horas de validez
- **Almacenamiento múltiple**: localStorage + cookies httpOnly
- **Verificación automática**: Middleware valida en cada request
- **Renovación**: Sistema de refresh token implícito

#### Middleware de Protección
```typescript
// middleware.ts - Protección de rutas
export function middleware(request: NextRequest) {
  const token = request.cookies.get('auth-token')
  const pathname = request.nextUrl.pathname
  
  // Rutas públicas permitidas
  const publicRoutes = ['/login', '/register']
  
  if (!token && !publicRoutes.includes(pathname)) {
    // Redirigir a login con URL de retorno
    return NextResponse.redirect(
      new URL(`/login?from=${pathname}`, request.url)
    )
  }
  
  // Verificación adicional del token
  if (token) {
    try {
      // Validar estructura y expiración
      const decoded = verifyJWT(token.value)
      if (isExpired(decoded)) {
        throw new Error('Token expired')
      }
    } catch {
      // Token inválido - limpiar y redirigir
      const response = NextResponse.redirect(new URL('/login', request.url))
      response.cookies.delete('auth-token')
      return response
    }
  }
}
```

### Guards de Seguridad

#### AuthGuard
```typescript
// Protección básica de autenticación
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth()
  
  if (loading) return <LoadingScreen />
  
  if (!isAuthenticated) {
    redirect('/login')
  }
  
  return <>{children}</>
}
```

#### ModuleGuard
```typescript
// Protección por módulo
export function ModuleGuard({ 
  module, 
  children 
}: { 
  module: string
  children: React.ReactNode 
}) {
  const { user } = useAuth()
  
  const hasAccess = user?.role === 'administrador' || 
                   user?.modules?.includes(module)
  
  if (!hasAccess) {
    return <AccessDenied module={module} />
  }
  
  return <>{children}</>
}
```

#### SectionGuard
```typescript
// Protección granular por sección
export function SectionGuard({ 
  module,
  section,
  children 
}: { 
  module: string
  section: string
  children: React.ReactNode 
}) {
  const { user } = useAuth()
  
  // Verificación jerárquica
  if (!hasModuleAccess(user, module)) {
    return <ModuleAccessDenied />
  }
  
  if (!hasSectionAccess(user, section)) {
    return <SectionAccessDenied />
  }
  
  return <>{children}</>
}
```

## 12.2 Protección de Datos

### Sanitización de Inputs
- **Validación con Zod**: Esquemas estrictos para todos los formularios
- **React Hook Form**: Validación en tiempo real
- **Escape de HTML**: Prevención de XSS automática
- **Validación de tipos**: TypeScript strict mode

### Manejo Seguro de Archivos
```typescript
// Validación de archivos Excel
const validateExcelFile = (file: File): ValidationResult => {
  // Verificar tipo MIME
  const validTypes = [
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
  
  if (!validTypes.includes(file.type)) {
    return { 
      valid: false, 
      error: 'Archivo no es Excel válido' 
    }
  }
  
  // Verificar tamaño (max 10MB)
  const maxSize = 10 * 1024 * 1024
  if (file.size > maxSize) {
    return { 
      valid: false, 
      error: 'Archivo excede 10MB' 
    }
  }
  
  // Verificar extensión
  const validExtensions = ['.xlsx', '.xls']
  const extension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'))
  
  if (!validExtensions.includes(extension)) {
    return { 
      valid: false, 
      error: 'Extensión de archivo inválida' 
    }
  }
  
  return { valid: true }
}
```

### Prevención de Ataques Comunes

#### XSS (Cross-Site Scripting)
- React escapa automáticamente el contenido
- DOMPurify para contenido HTML dinámico
- Content Security Policy headers configurados
- Validación estricta de inputs

#### CSRF (Cross-Site Request Forgery)
- Tokens en cookies httpOnly
- Verificación de origen en requests
- SameSite cookies configuradas

#### SQL Injection
- N/A - Sistema usa MongoDB (NoSQL)
- Validación de parámetros en queries
- Sanitización de inputs en backend

## 12.3 Control de Acceso Basado en Roles (RBAC)

### Jerarquía de Permisos
```typescript
const ROLE_HIERARCHY = {
  administrador: {
    level: 3,
    inherits: ['operaciones', 'facturacion', 'clientes', 'catalogos'],
    modules: ['trucking', 'ptyss', 'shipchandler', 'agency'],
    sections: '*' // Acceso total
  },
  operaciones: {
    level: 2,
    inherits: [],
    modules: [], // Definido por usuario
    sections: ['upload', 'services', 'records']
  },
  facturacion: {
    level: 2,
    inherits: [],
    modules: [], // Definido por usuario
    sections: ['prefactura', 'invoice', 'sap-invoice', 'reports']
  },
  clientes: {
    level: 2,
    inherits: [],
    modules: [], // Aplicable a todos
    sections: ['clients']
  },
  catalogos: {
    level: 2,
    inherits: [],
    modules: [], // Definido por usuario
    sections: ['config', 'catalogs', 'pricing-config']
  },
  pendiente: {
    level: 0,
    inherits: [],
    modules: [],
    sections: []
  }
}
```

### Verificación de Permisos
```typescript
// Helper functions para verificación de permisos
export const hasPermission = (
  user: User,
  requiredRole: string
): boolean => {
  if (!user) return false
  
  // Admin tiene todos los permisos
  if (user.role === 'administrador') return true
  
  // Verificar rol específico
  if (user.roles?.includes(requiredRole)) return true
  
  // Verificar herencia de roles
  const userRole = ROLE_HIERARCHY[user.role]
  return userRole?.inherits?.includes(requiredRole) || false
}

export const canAccessSection = (
  user: User,
  module: string,
  section: string
): boolean => {
  if (!user) return false
  
  // Admin puede todo
  if (user.role === 'administrador') return true
  
  // Verificar acceso al módulo
  if (!user.modules?.includes(module)) return false
  
  // Verificar acceso a la sección
  const roleConfig = ROLE_HIERARCHY[user.role]
  if (!roleConfig) return false
  
  return roleConfig.sections === '*' || 
         roleConfig.sections.includes(section)
}
```

## 12.4 Auditoría y Trazabilidad

### Logging de Acciones Críticas
```typescript
// Sistema de auditoría
interface AuditLog {
  timestamp: Date
  userId: string
  userEmail: string
  action: string
  module: string
  details: any
  ip?: string
  userAgent?: string
}

const logAuditAction = async (action: AuditAction) => {
  const log: AuditLog = {
    timestamp: new Date(),
    userId: getCurrentUser().id,
    userEmail: getCurrentUser().email,
    action: action.type,
    module: action.module,
    details: action.details,
    ip: await getClientIP(),
    userAgent: navigator.userAgent
  }
  
  // Enviar al backend
  await api.post('/audit/log', log)
  
  // Almacenar localmente para redundancia
  const localLogs = JSON.parse(localStorage.getItem('auditLogs') || '[]')
  localLogs.push(log)
  localStorage.setItem('auditLogs', JSON.stringify(localLogs.slice(-100)))
}
```

### Acciones Auditadas
- Login/Logout de usuarios
- Creación/modificación/eliminación de registros
- Generación de facturas y XML
- Cambios en configuración
- Accesos denegados
- Errores críticos del sistema

---

# 13. OPTIMIZACIÓN Y RENDIMIENTO

## 13.1 Estrategias de Optimización

### Memoización Extensiva
El sistema implementa memoización en múltiples niveles para optimizar el rendimiento:

#### useMemo para Cálculos Costosos
```typescript
// Ejemplo: Cálculo de totales en facturas
const invoiceTotal = useMemo(() => {
  return items.reduce((total, item) => {
    const subtotal = item.quantity * item.unitPrice
    const tax = subtotal * (item.taxRate || 0)
    return total + subtotal + tax
  }, 0)
}, [items])

// Ejemplo: Filtrado complejo de datos
const filteredRecords = useMemo(() => {
  let result = [...records]
  
  // Aplicar múltiples filtros
  if (searchTerm) {
    result = result.filter(r => 
      r.containerNumber.includes(searchTerm) ||
      r.client.name.includes(searchTerm)
    )
  }
  
  if (statusFilter) {
    result = result.filter(r => r.status === statusFilter)
  }
  
  if (dateRange) {
    result = result.filter(r => 
      r.date >= dateRange.start && 
      r.date <= dateRange.end
    )
  }
  
  // Ordenamiento
  return result.sort((a, b) => b.date - a.date)
}, [records, searchTerm, statusFilter, dateRange])
```

#### useCallback para Funciones
```typescript
// Prevenir re-creación de funciones
const handleSubmit = useCallback(async (data: FormData) => {
  setLoading(true)
  try {
    await api.post('/submit', data)
    toast.success('Datos guardados')
    onSuccess?.()
  } catch (error) {
    toast.error('Error al guardar')
  } finally {
    setLoading(false)
  }
}, [onSuccess])

// Debounced search
const debouncedSearch = useCallback(
  debounce((term: string) => {
    performSearch(term)
  }, 300),
  []
)
```

### Redux Optimizado

#### Selectors Memoizados
```typescript
// store/selectors.ts
import { createSelector } from '@reduxjs/toolkit'

// Selector base
const selectRecords = (state: RootState) => state.records.items
const selectFilters = (state: RootState) => state.records.filters

// Selector memoizado complejo
export const selectFilteredRecords = createSelector(
  [selectRecords, selectFilters],
  (records, filters) => {
    // Cálculo costoso solo se ejecuta si cambian las dependencias
    return applyFilters(records, filters)
  }
)

// Selector con múltiples niveles
export const selectRecordStats = createSelector(
  [selectFilteredRecords],
  (records) => ({
    total: records.length,
    pending: records.filter(r => r.status === 'pending').length,
    completed: records.filter(r => r.status === 'completed').length,
    totalValue: records.reduce((sum, r) => sum + r.value, 0)
  })
)
```

## 13.2 Optimización de Renderizado

### React.memo para Componentes
```typescript
// Componente optimizado con memo
const ExpensiveComponent = React.memo(({ data, onUpdate }) => {
  // Solo re-renderiza si props cambian
  return (
    <div>
      {/* Renderizado costoso */}
    </div>
  )
}, (prevProps, nextProps) => {
  // Comparación personalizada
  return prevProps.data.id === nextProps.data.id &&
         prevProps.data.version === nextProps.data.version
})
```

### Virtualización de Listas
```typescript
// Para listas largas usar react-window
import { FixedSizeList } from 'react-window'

const VirtualizedTable = ({ items }) => {
  const Row = ({ index, style }) => (
    <div style={style}>
      {items[index].name}
    </div>
  )
  
  return (
    <FixedSizeList
      height={600}
      itemCount={items.length}
      itemSize={50}
      width="100%"
    >
      {Row}
    </FixedSizeList>
  )
}
```

## 13.3 Gestión de Estado Eficiente

### Normalización de Datos
```typescript
// Estado normalizado para evitar duplicación
interface NormalizedState {
  entities: {
    clients: Record<string, Client>
    invoices: Record<string, Invoice>
    records: Record<string, Record>
  }
  ids: {
    clients: string[]
    invoices: string[]
    records: string[]
  }
}

// Acceso eficiente
const getClientById = (state: RootState, id: string) => 
  state.entities.clients[id]
```

### Lazy Loading de Módulos
```typescript
// Carga diferida de componentes pesados
const HeavyComponent = lazy(() => import('./HeavyComponent'))

// Uso con Suspense
<Suspense fallback={<Loading />}>
  <HeavyComponent />
</Suspense>
```

## 13.4 Optimización de Red

### Caché de Datos
```typescript
// Hook con caché integrado
const useApiData = (endpoint: string, ttl: number = 5 * 60 * 1000) => {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    // Verificar caché
    const cacheKey = `cache_${endpoint}`
    const cached = localStorage.getItem(cacheKey)
    
    if (cached) {
      const { data, timestamp } = JSON.parse(cached)
      if (Date.now() - timestamp < ttl) {
        setData(data)
        setLoading(false)
        return
      }
    }
    
    // Fetch nuevo
    api.get(endpoint).then(response => {
      setData(response.data)
      // Guardar en caché
      localStorage.setItem(cacheKey, JSON.stringify({
        data: response.data,
        timestamp: Date.now()
      }))
      setLoading(false)
    })
  }, [endpoint, ttl])
  
  return { data, loading }
}
```

### Debounce para Búsquedas
```typescript
// Evitar requests excesivos
const SearchInput = () => {
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)
  
  useEffect(() => {
    if (debouncedSearch) {
      performSearch(debouncedSearch)
    }
  }, [debouncedSearch])
  
  return (
    <input
      value={search}
      onChange={(e) => setSearch(e.target.value)}
      placeholder="Buscar..."
    />
  )
}
```

## 13.5 Optimización de Bundle

### Configuración de Webpack
```javascript
// next.config.mjs
export default {
  webpack: (config, { isServer }) => {
    // Optimización para XLSX
    if (!isServer) {
      config.resolve.fallback = {
        fs: false,
        path: false,
        crypto: false,
      }
    }
    
    // Externals para reducir bundle
    config.externals.push({
      'xlsx': 'XLSX'
    })
    
    return config
  },
  
  // Compresión
  compress: true,
  
  // Optimización de imágenes
  images: {
    domains: ['localhost'],
    formats: ['image/webp'],
  }
}
```

### Code Splitting Automático
Next.js divide automáticamente el código por rutas, pero podemos optimizar más:

```typescript
// Importaciones dinámicas para componentes pesados
const PDFGenerator = dynamic(
  () => import('@/components/PDFGenerator'),
  { 
    loading: () => <p>Cargando generador PDF...</p>,
    ssr: false 
  }
)

const ExcelProcessor = dynamic(
  () => import('@/components/ExcelProcessor'),
  { 
    loading: () => <p>Cargando procesador Excel...</p>,
    ssr: false 
  }
)
```

---

# 14. ACCESIBILIDAD

## 14.1 Implementación ARIA

### Roles y Labels ARIA
```typescript
// Navegación accesible
<nav role="navigation" aria-label="Menú principal">
  <ul role="list">
    {menuItems.map(item => (
      <li key={item.id} role="listitem">
        <Link
          href={item.href}
          aria-current={pathname === item.href ? 'page' : undefined}
          aria-label={`Ir a ${item.label}`}
        >
          {item.label}
        </Link>
      </li>
    ))}
  </ul>
</nav>

// Formularios accesibles
<form aria-label="Formulario de login">
  <div role="group" aria-labelledby="email-label">
    <label id="email-label" htmlFor="email">
      Email <span aria-label="requerido">*</span>
    </label>
    <input
      id="email"
      type="email"
      aria-required="true"
      aria-invalid={!!errors.email}
      aria-describedby={errors.email ? "email-error" : undefined}
    />
    {errors.email && (
      <span id="email-error" role="alert">
        {errors.email}
      </span>
    )}
  </div>
</form>
```

### Navegación por Teclado
```typescript
// Hook para manejo de teclado
const useKeyboardNavigation = () => {
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Alt + M: Ir al menú principal
      if (e.altKey && e.key === 'm') {
        document.getElementById('main-menu')?.focus()
      }
      
      // Alt + S: Ir a búsqueda
      if (e.altKey && e.key === 's') {
        document.getElementById('search-input')?.focus()
      }
      
      // Escape: Cerrar modal
      if (e.key === 'Escape') {
        closeModal()
      }
    }
    
    document.addEventListener('keydown', handleKeyPress)
    return () => document.removeEventListener('keydown', handleKeyPress)
  }, [])
}
```

## 14.2 Focus Management

### Skip Links
```typescript
// Permitir saltar al contenido principal
<div className="sr-only focus:not-sr-only">
  <a href="#main-content" className="skip-link">
    Saltar al contenido principal
  </a>
  <a href="#main-navigation" className="skip-link">
    Saltar a la navegación
  </a>
</div>
```

### Focus Trap en Modales
```typescript
const Modal = ({ isOpen, children, onClose }) => {
  const modalRef = useRef<HTMLDivElement>(null)
  
  // Trap focus dentro del modal
  useEffect(() => {
    if (!isOpen) return
    
    const focusableElements = modalRef.current?.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    
    const firstElement = focusableElements?.[0] as HTMLElement
    const lastElement = focusableElements?.[focusableElements.length - 1] as HTMLElement
    
    firstElement?.focus()
    
    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return
      
      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault()
          lastElement?.focus()
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault()
          firstElement?.focus()
        }
      }
    }
    
    document.addEventListener('keydown', handleTab)
    return () => document.removeEventListener('keydown', handleTab)
  }, [isOpen])
  
  return isOpen ? (
    <div ref={modalRef} role="dialog" aria-modal="true">
      {children}
    </div>
  ) : null
}
```

## 14.3 Anuncios para Screen Readers

### Live Regions
```typescript
// Anuncios de cambios dinámicos
<div 
  role="status" 
  aria-live="polite" 
  aria-atomic="true"
  className="sr-only"
>
  {loading && "Cargando datos..."}
  {error && `Error: ${error.message}`}
  {success && "Operación completada exitosamente"}
</div>

// Alertas importantes
<div 
  role="alert" 
  aria-live="assertive"
>
  {criticalError && "Error crítico: Por favor contacte soporte"}
</div>
```

## 14.4 Contraste y Visualización

### Variables de Color Accesibles
```css
/* globals.css */
:root {
  /* Colores con contraste WCAG AAA */
  --text-primary: #0a0a0a;      /* Contraste 20.4:1 */
  --text-secondary: #404040;     /* Contraste 10.1:1 */
  --bg-primary: #ffffff;
  --bg-secondary: #f5f5f5;
  
  /* Estados con diferenciación no solo por color */
  --success: #10b981;
  --warning: #f59e0b;
  --error: #ef4444;
  --info: #3b82f6;
}

/* Modo oscuro accesible */
.dark {
  --text-primary: #f0f0f0;      /* Contraste 18.1:1 */
  --text-secondary: #b0b0b0;     /* Contraste 9.3:1 */
  --bg-primary: #0a0a0a;
  --bg-secondary: #1a1a1a;
}
```

---

# 15. LOGGING Y MONITOREO

## 15.1 Sistema de Logging

### Logger Centralizado
```typescript
// lib/logger.ts
enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  CRITICAL = 4
}

interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  context?: any
  user?: string
  sessionId?: string
  stackTrace?: string
}

class Logger {
  private static instance: Logger
  private buffer: LogEntry[] = []
  private flushInterval: number = 5000 // 5 segundos
  
  private constructor() {
    // Flush logs periódicamente
    setInterval(() => this.flush(), this.flushInterval)
    
    // Flush al cerrar página
    window.addEventListener('beforeunload', () => this.flush())
  }
  
  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger()
    }
    return Logger.instance
  }
  
  private log(level: LogLevel, message: string, context?: any) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      user: this.getCurrentUser(),
      sessionId: this.getSessionId()
    }
    
    // En desarrollo, log a consola
    if (process.env.NODE_ENV === 'development') {
      this.logToConsole(entry)
    }
    
    // Agregar al buffer
    this.buffer.push(entry)
    
    // Flush inmediato para errores críticos
    if (level >= LogLevel.ERROR) {
      this.flush()
    }
  }
  
  private logToConsole(entry: LogEntry) {
    const style = this.getConsoleStyle(entry.level)
    console.log(
      `%c[${LogLevel[entry.level]}] ${entry.message}`,
      style,
      entry.context || ''
    )
  }
  
  private getConsoleStyle(level: LogLevel): string {
    const styles = {
      [LogLevel.DEBUG]: 'color: gray',
      [LogLevel.INFO]: 'color: blue',
      [LogLevel.WARN]: 'color: orange; font-weight: bold',
      [LogLevel.ERROR]: 'color: red; font-weight: bold',
      [LogLevel.CRITICAL]: 'background: red; color: white; font-weight: bold'
    }
    return styles[level]
  }
  
  private async flush() {
    if (this.buffer.length === 0) return
    
    const logs = [...this.buffer]
    this.buffer = []
    
    try {
      await fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logs })
      })
    } catch (error) {
      // Guardar en localStorage como fallback
      const storedLogs = JSON.parse(
        localStorage.getItem('pendingLogs') || '[]'
      )
      localStorage.setItem(
        'pendingLogs',
        JSON.stringify([...storedLogs, ...logs].slice(-1000))
      )
    }
  }
  
  // Métodos públicos
  debug(message: string, context?: any) {
    this.log(LogLevel.DEBUG, message, context)
  }
  
  info(message: string, context?: any) {
    this.log(LogLevel.INFO, message, context)
  }
  
  warn(message: string, context?: any) {
    this.log(LogLevel.WARN, message, context)
  }
  
  error(message: string, context?: any) {
    this.log(LogLevel.ERROR, message, context)
    
    // Capturar stack trace para errores
    if (context instanceof Error) {
      this.log(LogLevel.ERROR, 'Stack trace', {
        stack: context.stack
      })
    }
  }
  
  critical(message: string, context?: any) {
    this.log(LogLevel.CRITICAL, message, context)
    
    // Notificar inmediatamente errores críticos
    this.notifyCriticalError(message, context)
  }
  
  private notifyCriticalError(message: string, context: any) {
    // Enviar notificación inmediata al equipo
    fetch('/api/critical-error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        context,
        timestamp: new Date().toISOString(),
        user: this.getCurrentUser()
      })
    }).catch(console.error)
  }
  
  private getCurrentUser(): string {
    const user = JSON.parse(localStorage.getItem('currentUser') || '{}')
    return user.email || 'anonymous'
  }
  
  private getSessionId(): string {
    let sessionId = sessionStorage.getItem('sessionId')
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random()}`
      sessionStorage.setItem('sessionId', sessionId)
    }
    return sessionId
  }
}

export const logger = Logger.getInstance()
```

## 15.2 Tracking de Eventos

### Event Tracking System
```typescript
// hooks/useEventTracking.ts
interface TrackingEvent {
  category: string
  action: string
  label?: string
  value?: number
  metadata?: Record<string, any>
}

export const useEventTracking = () => {
  const { user } = useAuth()
  
  const track = useCallback((event: TrackingEvent) => {
    // Log interno
    logger.info('Event tracked', {
      ...event,
      user: user?.email,
      timestamp: Date.now()
    })
    
    // Google Analytics (si está configurado)
    if (typeof gtag !== 'undefined') {
      gtag('event', event.action, {
        event_category: event.category,
        event_label: event.label,
        value: event.value
      })
    }
    
    // Analytics personalizado
    fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...event,
        userId: user?.id,
        sessionId: sessionStorage.getItem('sessionId')
      })
    }).catch(err => logger.error('Analytics error', err))
  }, [user])
  
  return { track }
}
```

### Eventos Importantes Trackeados
```typescript
// Eventos de autenticación
track({ category: 'Auth', action: 'Login', label: 'Success' })
track({ category: 'Auth', action: 'Logout' })
track({ category: 'Auth', action: 'SessionExpired' })

// Eventos de navegación
track({ category: 'Navigation', action: 'PageView', label: pathname })
track({ category: 'Navigation', action: 'ModuleAccess', label: moduleName })

// Eventos de datos
track({ category: 'Data', action: 'Create', label: 'Invoice', value: amount })
track({ category: 'Data', action: 'Export', label: 'Excel' })
track({ category: 'Data', action: 'GenerateXML', label: 'SAP' })

// Eventos de error
track({ category: 'Error', action: 'ValidationFailed', label: formName })
track({ category: 'Error', action: 'APIError', label: endpoint })
```

## 15.3 Monitoreo de Rendimiento

### Performance Monitoring
```typescript
// lib/performance.ts
class PerformanceMonitor {
  private metrics: Map<string, number[]> = new Map()
  
  measureTime(label: string, fn: () => Promise<any>) {
    return async (...args: any[]) => {
      const start = performance.now()
      
      try {
        const result = await fn(...args)
        const duration = performance.now() - start
        
        this.recordMetric(label, duration)
        
        if (duration > 1000) {
          logger.warn(`Slow operation: ${label}`, { duration })
        }
        
        return result
      } catch (error) {
        const duration = performance.now() - start
        logger.error(`Operation failed: ${label}`, { duration, error })
        throw error
      }
    }
  }
  
  private recordMetric(label: string, value: number) {
    if (!this.metrics.has(label)) {
      this.metrics.set(label, [])
    }
    
    const values = this.metrics.get(label)!
    values.push(value)
    
    // Mantener solo últimas 100 mediciones
    if (values.length > 100) {
      values.shift()
    }
  }
  
  getStats(label: string) {
    const values = this.metrics.get(label) || []
    
    if (values.length === 0) {
      return null
    }
    
    const sorted = [...values].sort((a, b) => a - b)
    
    return {
      count: values.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      avg: values.reduce((a, b) => a + b, 0) / values.length,
      p50: sorted[Math.floor(values.length * 0.5)],
      p95: sorted[Math.floor(values.length * 0.95)],
      p99: sorted[Math.floor(values.length * 0.99)]
    }
  }
  
  reportMetrics() {
    const report: any = {}
    
    for (const [label, values] of this.metrics) {
      report[label] = this.getStats(label)
    }
    
    logger.info('Performance metrics', report)
    
    // Enviar al servidor
    fetch('/api/metrics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(report)
    }).catch(err => logger.error('Metrics upload failed', err))
  }
}

export const perfMonitor = new PerformanceMonitor()

// Reportar métricas cada 5 minutos
setInterval(() => perfMonitor.reportMetrics(), 5 * 60 * 1000)
```

## 15.4 Error Tracking

### Global Error Handler
```typescript
// app/providers.tsx
export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Capturar errores no manejados
    const handleError = (event: ErrorEvent) => {
      logger.critical('Unhandled error', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error?.stack
      })
      
      // Mostrar notificación al usuario
      toast.error('Ha ocurrido un error inesperado')
    }
    
    // Capturar promesas rechazadas
    const handleRejection = (event: PromiseRejectionEvent) => {
      logger.critical('Unhandled promise rejection', {
        reason: event.reason,
        promise: event.promise
      })
    }
    
    window.addEventListener('error', handleError)
    window.addEventListener('unhandledrejection', handleRejection)
    
    return () => {
      window.removeEventListener('error', handleError)
      window.removeEventListener('unhandledrejection', handleRejection)
    }
  }, [])
  
  return <>{children}</>
}
```

---

# 16. ESTADOS Y TRANSICIONES

## 16.1 Máquina de Estados del Sistema

### Estados de Entidades Principales

#### Estados de Registros (Records)
```typescript
type RecordState = 
  | 'draft'          // Borrador, editable
  | 'pending'        // Pendiente de procesamiento
  | 'processing'     // En proceso
  | 'matched'        // Con coincidencia de ruta/precio
  | 'unmatched'      // Sin coincidencia
  | 'prefacturado'   // Incluido en prefactura
  | 'facturado'      // Incluido en factura final
  | 'cancelled'      // Cancelado
  | 'error'         // Error en procesamiento

// Transiciones permitidas
const RECORD_TRANSITIONS: Record<RecordState, RecordState[]> = {
  'draft': ['pending', 'cancelled'],
  'pending': ['processing', 'cancelled'],
  'processing': ['matched', 'unmatched', 'error'],
  'matched': ['prefacturado', 'cancelled'],
  'unmatched': ['matched', 'cancelled'],
  'prefacturado': ['facturado', 'cancelled'],
  'facturado': [], // Estado final
  'cancelled': ['draft'], // Puede reactivarse
  'error': ['pending', 'cancelled']
}
```

#### Estados de Servicios (Agency)
```typescript
type ServiceState = 
  | 'draft'          // Borrador
  | 'pending'        // Pendiente de aprobación
  | 'approved'       // Aprobado
  | 'in_progress'    // En progreso
  | 'completed'      // Completado
  | 'invoiced'       // Facturado
  | 'cancelled'      // Cancelado

// Reglas de transición
const canTransition = (
  from: ServiceState, 
  to: ServiceState, 
  userRole: string
): boolean => {
  // Admin puede hacer cualquier transición
  if (userRole === 'administrador') return true
  
  // Transiciones por rol
  const allowedTransitions = {
    operaciones: {
      draft: ['pending'],
      pending: ['in_progress', 'cancelled'],
      in_progress: ['completed']
    },
    facturacion: {
      completed: ['invoiced']
    }
  }
  
  return allowedTransitions[userRole]?.[from]?.includes(to) || false
}
```

#### Estados de Facturas
```typescript
type InvoiceState = 
  | 'draft'          // Borrador
  | 'prefactura'     // Prefactura generada
  | 'pending_approval' // Pendiente aprobación
  | 'approved'       // Aprobada
  | 'xml_generated'  // XML generado
  | 'sent_to_sap'    // Enviada a SAP
  | 'confirmed'      // Confirmada por SAP
  | 'rejected'       // Rechazada por SAP
  | 'cancelled'      // Anulada

// Workflow de facturación
const INVOICE_WORKFLOW = {
  'draft': {
    next: ['prefactura'],
    requires: ['items', 'client']
  },
  'prefactura': {
    next: ['pending_approval', 'draft'],
    requires: ['pdf_generated']
  },
  'pending_approval': {
    next: ['approved', 'draft'],
    requires: ['reviewer_id']
  },
  'approved': {
    next: ['xml_generated'],
    requires: ['invoice_number', 'sap_code']
  },
  'xml_generated': {
    next: ['sent_to_sap'],
    requires: ['xml_file']
  },
  'sent_to_sap': {
    next: ['confirmed', 'rejected'],
    requires: ['sap_response']
  },
  'confirmed': {
    next: [], // Estado final exitoso
    requires: []
  },
  'rejected': {
    next: ['draft', 'xml_generated'],
    requires: ['rejection_reason']
  },
  'cancelled': {
    next: [], // Estado final
    requires: ['cancellation_reason']
  }
}
```

## 16.2 Gestión de Transiciones

### State Machine Implementation
```typescript
// lib/stateMachine.ts
interface StateTransition<T> {
  from: T
  to: T
  guard?: (context: any) => boolean
  action?: (context: any) => void | Promise<void>
}

class StateMachine<T extends string> {
  private currentState: T
  private transitions: Map<string, StateTransition<T>> = new Map()
  private listeners: Set<(state: T) => void> = new Set()
  
  constructor(initialState: T) {
    this.currentState = initialState
  }
  
  defineTransition(transition: StateTransition<T>) {
    const key = `${transition.from}->${transition.to}`
    this.transitions.set(key, transition)
  }
  
  async transition(to: T, context?: any): Promise<boolean> {
    const key = `${this.currentState}->${to}`
    const transition = this.transitions.get(key)
    
    if (!transition) {
      logger.warn(`Invalid transition: ${key}`)
      return false
    }
    
    // Verificar guard
    if (transition.guard && !transition.guard(context)) {
      logger.warn(`Transition guard failed: ${key}`)
      return false
    }
    
    // Ejecutar acción
    if (transition.action) {
      try {
        await transition.action(context)
      } catch (error) {
        logger.error(`Transition action failed: ${key}`, error)
        return false
      }
    }
    
    // Cambiar estado
    const previousState = this.currentState
    this.currentState = to
    
    // Notificar listeners
    this.listeners.forEach(listener => listener(to))
    
    logger.info('State transition', {
      from: previousState,
      to: this.currentState,
      context
    })
    
    return true
  }
  
  getState(): T {
    return this.currentState
  }
  
  canTransitionTo(to: T): boolean {
    const key = `${this.currentState}->${to}`
    return this.transitions.has(key)
  }
  
  onStateChange(listener: (state: T) => void) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }
}

// Ejemplo de uso
const recordStateMachine = new StateMachine<RecordState>('draft')

// Definir transiciones
recordStateMachine.defineTransition({
  from: 'draft',
  to: 'pending',
  guard: (record) => !!record.containerNumber && !!record.client,
  action: async (record) => {
    await api.post('/records/submit', record)
  }
})

recordStateMachine.defineTransition({
  from: 'pending',
  to: 'processing',
  action: async (record) => {
    await processRecord(record)
  }
})
```

## 16.3 Validaciones de Estado

### Business Rules por Estado
```typescript
// Reglas de negocio para cada estado
const STATE_RULES = {
  records: {
    draft: {
      canEdit: true,
      canDelete: true,
      requiredFields: [],
      allowedActions: ['save', 'submit', 'delete']
    },
    pending: {
      canEdit: false,
      canDelete: false,
      requiredFields: ['containerNumber', 'client', 'date'],
      allowedActions: ['process', 'cancel']
    },
    prefacturado: {
      canEdit: false,
      canDelete: false,
      requiredFields: ['invoiceId'],
      allowedActions: ['viewInvoice', 'generateXML']
    },
    facturado: {
      canEdit: false,
      canDelete: false,
      requiredFields: ['invoiceNumber', 'sapDocument'],
      allowedActions: ['viewInvoice', 'downloadXML']
    }
  },
  
  invoices: {
    draft: {
      canEdit: true,
      canAddItems: true,
      canRemoveItems: true,
      minimumItems: 1,
      maximumItems: 999
    },
    approved: {
      canEdit: false,
      canAddItems: false,
      canRemoveItems: false,
      requiresSignature: true
    }
  }
}

// Validador de reglas
const validateStateRules = (
  entity: string, 
  state: string, 
  data: any
): ValidationResult => {
  const rules = STATE_RULES[entity]?.[state]
  
  if (!rules) {
    return { valid: false, error: 'Estado no válido' }
  }
  
  // Verificar campos requeridos
  for (const field of rules.requiredFields || []) {
    if (!data[field]) {
      return { 
        valid: false, 
        error: `Campo requerido: ${field}` 
      }
    }
  }
  
  // Verificar otras reglas
  if (rules.minimumItems && data.items?.length < rules.minimumItems) {
    return { 
      valid: false, 
      error: `Mínimo ${rules.minimumItems} items requeridos` 
    }
  }
  
  return { valid: true }
}
```

---

# 17. GUÍA DE DESARROLLO

## 17.1 Configuración del Entorno

### Requisitos Previos
```bash
# Node.js 18+ y npm 9+
node --version  # v18.0.0 o superior
npm --version   # v9.0.0 o superior

# Git
git --version   # v2.0.0 o superior
```

### Instalación Inicial
```bash
# Clonar repositorio
git clone https://github.com/empresa/barcos.git
cd barcos/front

# Instalar dependencias
npm install

# Copiar variables de entorno
cp .env.example .env.local

# Configurar variables de entorno
# Editar .env.local con los valores correctos
```

### Scripts de Desarrollo
```json
{
  "scripts": {
    "dev": "next dev",                    // Desarrollo local (puerto 3000)
    "dev:turbo": "next dev --turbo",      // Desarrollo con Turbopack
    "build": "next build",                // Build de producción
    "start": "next start",                // Servidor de producción
    "lint": "next lint",                  // Linter ESLint
    "lint:fix": "next lint --fix",        // Fix automático de lint
    "type-check": "tsc --noEmit",         // Verificación de tipos
    "format": "prettier --write .",       // Formateo con Prettier
    "analyze": "ANALYZE=true next build", // Análisis de bundle
    "clean": "rm -rf .next node_modules"  // Limpieza completa
  }
}
```

## 17.2 Estructura de Código

### Convenciones de Nomenclatura
```typescript
// Componentes: PascalCase
export const UserProfile = () => { }

// Hooks: camelCase con prefijo 'use'
export const useUserData = () => { }

// Utilidades: camelCase
export const formatDate = (date: Date) => { }

// Constantes: UPPER_SNAKE_CASE
export const MAX_FILE_SIZE = 10485760

// Tipos/Interfaces: PascalCase con prefijo 'I' opcional
interface IUser {
  id: string
  name: string
}

type UserRole = 'admin' | 'user'

// Enums: PascalCase
enum Status {
  PENDING = 'pending',
  ACTIVE = 'active'
}
```

### Estructura de Componentes
```typescript
// components/ExampleComponent.tsx
import { useState, useEffect, useMemo, useCallback } from 'react'
import { useAppSelector, useAppDispatch } from '@/hooks/redux'
import { ComponentProps } from './types'
import styles from './styles.module.css'

/**
 * Componente de ejemplo con todas las mejores prácticas
 */
export const ExampleComponent: React.FC<ComponentProps> = ({
  title,
  onSubmit,
  children
}) => {
  // 1. Hooks de estado
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // 2. Hooks de Redux
  const dispatch = useAppDispatch()
  const { user } = useAppSelector(state => state.auth)
  
  // 3. Hooks personalizados
  const { data, refetch } = useCustomHook()
  
  // 4. Memoización
  const computedValue = useMemo(() => {
    return expensiveCalculation(data)
  }, [data])
  
  // 5. Callbacks
  const handleSubmit = useCallback(async () => {
    setLoading(true)
    try {
      await onSubmit()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [onSubmit])
  
  // 6. Effects
  useEffect(() => {
    // Lógica de efecto
    return () => {
      // Cleanup
    }
  }, [dependency])
  
  // 7. Render
  if (loading) return <LoadingSpinner />
  if (error) return <ErrorMessage error={error} />
  
  return (
    <div className={styles.container}>
      <h1>{title}</h1>
      {children}
      <button onClick={handleSubmit}>Submit</button>
    </div>
  )
}

// 8. Export default si es necesario
export default ExampleComponent
```

## 17.3 Mejores Prácticas

### Performance Best Practices
```typescript
// ✅ BUENO: Memoización de valores costosos
const expensiveValue = useMemo(() => {
  return items.reduce((sum, item) => sum + item.value, 0)
}, [items])

// ❌ MALO: Cálculo en cada render
const expensiveValue = items.reduce((sum, item) => sum + item.value, 0)

// ✅ BUENO: Lazy loading de componentes pesados
const HeavyComponent = lazy(() => import('./HeavyComponent'))

// ❌ MALO: Importar todo de golpe
import HeavyComponent from './HeavyComponent'

// ✅ BUENO: Debounce para búsquedas
const debouncedSearch = useMemo(
  () => debounce(search, 300),
  []
)

// ❌ MALO: Búsqueda en cada keystroke
onChange={(e) => search(e.target.value)}
```

### State Management Best Practices
```typescript
// ✅ BUENO: Estado normalizado
const state = {
  entities: {
    users: { '1': { id: '1', name: 'John' } },
    posts: { '1': { id: '1', userId: '1', title: 'Post' } }
  },
  ids: {
    users: ['1'],
    posts: ['1']
  }
}

// ❌ MALO: Estado anidado profundamente
const state = {
  users: [
    {
      id: '1',
      name: 'John',
      posts: [
        { id: '1', title: 'Post', comments: [...] }
      ]
    }
  ]
}

// ✅ BUENO: Acciones atómicas
dispatch(updateUserName({ id: '1', name: 'Jane' }))

// ❌ MALO: Acciones que hacen demasiado
dispatch(updateEntireUserAndRefreshEverything(userData))
```

### Error Handling Best Practices
```typescript
// ✅ BUENO: Manejo específico de errores
try {
  await api.post('/data', payload)
} catch (error) {
  if (error.response?.status === 401) {
    // Manejar error de autenticación
    dispatch(logout())
  } else if (error.response?.status === 422) {
    // Manejar error de validación
    setErrors(error.response.data.errors)
  } else {
    // Error genérico
    toast.error('Ocurrió un error inesperado')
  }
}

// ❌ MALO: Catch genérico sin contexto
try {
  await api.post('/data', payload)
} catch (error) {
  console.log(error)
}
```

## 17.4 Testing Guidelines (Para Implementar)

### Estructura de Tests Recomendada
```typescript
// __tests__/components/UserProfile.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { UserProfile } from '@/components/UserProfile'
import { mockUser } from '@/__mocks__/user'

describe('UserProfile', () => {
  it('should render user information', () => {
    render(<UserProfile user={mockUser} />)
    
    expect(screen.getByText(mockUser.name)).toBeInTheDocument()
    expect(screen.getByText(mockUser.email)).toBeInTheDocument()
  })
  
  it('should handle edit mode', async () => {
    render(<UserProfile user={mockUser} />)
    
    const editButton = screen.getByRole('button', { name: /edit/i })
    fireEvent.click(editButton)
    
    await waitFor(() => {
      expect(screen.getByRole('textbox', { name: /name/i })).toBeInTheDocument()
    })
  })
  
  it('should save changes', async () => {
    const onSave = jest.fn()
    render(<UserProfile user={mockUser} onSave={onSave} />)
    
    // Entrar en modo edición
    fireEvent.click(screen.getByRole('button', { name: /edit/i }))
    
    // Cambiar nombre
    const nameInput = screen.getByRole('textbox', { name: /name/i })
    fireEvent.change(nameInput, { target: { value: 'New Name' } })
    
    // Guardar
    fireEvent.click(screen.getByRole('button', { name: /save/i }))
    
    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith({
        ...mockUser,
        name: 'New Name'
      })
    })
  })
})
```

---

# 18. DEPLOYMENT Y CONFIGURACIÓN

## 18.1 Build y Optimización

### Configuración de Next.js
```javascript
// next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Optimización de React
  reactStrictMode: true,
  swcMinify: true,
  
  // Optimización de imágenes
  images: {
    domains: ['localhost', 'barcos-production.railway.app'],
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 días
  },
  
  // Headers de seguridad
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains'
          }
        ]
      }
    ]
  },
  
  // Configuración de Webpack
  webpack: (config, { isServer }) => {
    // Optimización para cliente
    if (!isServer) {
      config.resolve.fallback = {
        fs: false,
        path: false,
        crypto: false,
      }
      
      // Externals para reducir bundle
      config.externals.push({
        'xlsx': 'XLSX',
        'pdfmake': 'pdfMake'
      })
    }
    
    // Análisis de bundle
    if (process.env.ANALYZE === 'true') {
      const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer')
      config.plugins.push(
        new BundleAnalyzerPlugin({
          analyzerMode: 'static',
          reportFilename: './analyze.html',
          openAnalyzer: true
        })
      )
    }
    
    return config
  },
  
  // Variables de entorno públicas
  env: {
    NEXT_PUBLIC_APP_VERSION: process.env.npm_package_version,
    NEXT_PUBLIC_BUILD_TIME: new Date().toISOString()
  }
}

export default nextConfig
```

### Optimización de Bundle
```bash
# Analizar tamaño del bundle
npm run analyze

# Build optimizado para producción
NODE_ENV=production npm run build

# Verificar tamaño de chunks
npx next-bundle-analyzer
```

## 18.2 Deployment Manual

### Preparación para Producción
```bash
# 1. Verificar código
npm run lint
npm run type-check

# 2. Build local de prueba
npm run build
npm run start

# 3. Verificar variables de entorno de producción
# .env.production debe contener:
NEXT_PUBLIC_API_URL=https://barcos-production-3aad.up.railway.app
```

### Deployment a Railway
```bash
# Railway CLI
npm install -g @railway/cli

# Login
railway login

# Inicializar proyecto
railway init

# Deploy
railway up

# Ver logs
railway logs

# Variables de entorno
railway variables set NEXT_PUBLIC_API_URL=https://api.production.com
```

### Deployment a Vercel
```bash
# Vercel CLI
npm install -g vercel

# Deploy
vercel

# Producción
vercel --prod

# Variables de entorno
vercel env add NEXT_PUBLIC_API_URL
```

## 18.3 Configuración de Servidor

### PM2 para Node.js
```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'barcos-frontend',
    script: 'npm',
    args: 'start',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    instances: 'max',
    exec_mode: 'cluster',
    autorestart: true,
    watch: false,
    max_memory_restart: '1G'
  }]
}
```

```bash
# Iniciar con PM2
pm2 start ecosystem.config.js

# Monitoreo
pm2 monit

# Logs
pm2 logs barcos-frontend

# Reload sin downtime
pm2 reload barcos-frontend
```

### Nginx Configuration
```nginx
# /etc/nginx/sites-available/barcos
server {
    listen 80;
    listen [::]:80;
    server_name barcos.example.com;
    
    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name barcos.example.com;
    
    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/barcos.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/barcos.example.com/privkey.pem;
    
    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
    
    # Proxy to Next.js
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Static files
    location /_next/static {
        proxy_pass http://localhost:3000;
        proxy_cache STATIC;
        proxy_cache_valid 60m;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }
    
    # Gzip
    gzip on;
    gzip_types text/plain text/css text/xml text/javascript 
               application/javascript application/xml+rss 
               application/json;
    gzip_min_length 1000;
}
```

---

# 19. TROUBLESHOOTING AVANZADO

## 19.1 Problemas Comunes y Soluciones

### Problemas de Autenticación
```typescript
// Problema: Token JWT expirado pero UI no se actualiza
// Solución:
const checkTokenExpiry = () => {
  const token = localStorage.getItem('token')
  if (!token) return
  
  try {
    const decoded = JSON.parse(atob(token.split('.')[1]))
    if (decoded.exp * 1000 < Date.now()) {
      // Token expirado
      localStorage.clear()
      window.location.href = '/login'
    }
  } catch (error) {
    // Token inválido
    localStorage.clear()
    window.location.href = '/login'
  }
}

// Verificar cada minuto
setInterval(checkTokenExpiry, 60000)
```

### Problemas de Memoria
```typescript
// Problema: Memory leaks en componentes
// Solución: Cleanup apropiado
useEffect(() => {
  const timer = setInterval(() => {
    // Lógica
  }, 1000)
  
  const listener = (e: Event) => {
    // Handler
  }
  
  window.addEventListener('resize', listener)
  
  // IMPORTANTE: Cleanup
  return () => {
    clearInterval(timer)
    window.removeEventListener('resize', listener)
  }
}, [])

// Problema: Redux store muy grande
// Solución: Limpiar datos no necesarios
const cleanupOldData = () => {
  dispatch(removeOldRecords({ 
    olderThan: Date.now() - 7 * 24 * 60 * 60 * 1000 // 7 días
  }))
}
```

### Problemas de Rendimiento
```typescript
// Problema: Re-renders excesivos
// Solución: React DevTools Profiler + Optimización

// 1. Identificar componentes que se re-renderizan
// 2. Aplicar memo selectivamente
const ExpensiveComponent = React.memo(Component, (prev, next) => {
  // Comparación personalizada
  return prev.id === next.id && prev.version === next.version
})

// 3. Optimizar selectores de Redux
const selectFilteredData = createSelector(
  [selectData, selectFilters],
  (data, filters) => {
    // Cálculo memoizado
    return filterData(data, filters)
  }
)
```

## 19.2 Debugging Avanzado

### Redux DevTools
```typescript
// Configuración avanzada de Redux DevTools
const store = configureStore({
  reducer: rootReducer,
  devTools: {
    // Configuración personalizada
    name: 'Barcos App',
    trace: true,
    traceLimit: 25,
    features: {
      pause: true,
      lock: true,
      persist: true,
      export: true,
      import: 'custom',
      jump: true,
      skip: true,
      reorder: true,
      dispatch: true,
      test: true
    }
  }
})
```

### Custom Debug Tools
```typescript
// Debug helper para desarrollo
if (process.env.NODE_ENV === 'development') {
  // Exponer store globalmente para debugging
  window.__REDUX_STORE__ = store
  
  // Helper para dispatch manual
  window.__DISPATCH__ = (action: any) => store.dispatch(action)
  
  // Helper para obtener estado
  window.__GET_STATE__ = () => store.getState()
  
  // Helper para logging detallado
  window.__DEBUG__ = {
    enableVerboseLogging: () => {
      localStorage.setItem('debug', 'verbose')
    },
    disableLogging: () => {
      localStorage.removeItem('debug')
    },
    clearAllData: () => {
      localStorage.clear()
      sessionStorage.clear()
      document.cookie.split(";").forEach(c => {
        document.cookie = c.replace(/^ +/, "")
          .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/")
      })
      window.location.reload()
    }
  }
}
```

## 19.3 Herramientas de Diagnóstico

### Performance Profiling
```typescript
// Hook para medir performance
const usePerformanceProfile = (componentName: string) => {
  useEffect(() => {
    // Marcar inicio
    performance.mark(`${componentName}-mount-start`)
    
    return () => {
      // Marcar fin y medir
      performance.mark(`${componentName}-mount-end`)
      performance.measure(
        `${componentName}-mount`,
        `${componentName}-mount-start`,
        `${componentName}-mount-end`
      )
      
      // Log resultado
      const measure = performance.getEntriesByName(`${componentName}-mount`)[0]
      if (measure.duration > 100) {
        console.warn(`Slow component mount: ${componentName}`, measure.duration)
      }
    }
  }, [componentName])
}
```

### Network Diagnostics
```typescript
// Monitor de requests de red
class NetworkMonitor {
  private requests: Map<string, any> = new Map()
  
  constructor() {
    this.interceptFetch()
  }
  
  private interceptFetch() {
    const originalFetch = window.fetch
    
    window.fetch = async (...args) => {
      const [url, options] = args
      const requestId = `${Date.now()}-${Math.random()}`
      
      this.requests.set(requestId, {
        url,
        method: options?.method || 'GET',
        startTime: performance.now(),
        status: 'pending'
      })
      
      try {
        const response = await originalFetch(...args)
        
        this.requests.set(requestId, {
          ...this.requests.get(requestId),
          endTime: performance.now(),
          status: response.status,
          ok: response.ok
        })
        
        // Log slow requests
        const duration = performance.now() - this.requests.get(requestId).startTime
        if (duration > 1000) {
          console.warn(`Slow request: ${url}`, duration)
        }
        
        return response
      } catch (error) {
        this.requests.set(requestId, {
          ...this.requests.get(requestId),
          endTime: performance.now(),
          status: 'error',
          error
        })
        throw error
      }
    }
  }
  
  getStats() {
    const stats = {
      total: this.requests.size,
      pending: 0,
      successful: 0,
      failed: 0,
      averageTime: 0
    }
    
    let totalTime = 0
    let completedRequests = 0
    
    this.requests.forEach(req => {
      if (req.status === 'pending') stats.pending++
      else if (req.ok) stats.successful++
      else stats.failed++
      
      if (req.endTime) {
        totalTime += req.endTime - req.startTime
        completedRequests++
      }
    })
    
    stats.averageTime = completedRequests > 0 
      ? totalTime / completedRequests 
      : 0
    
    return stats
  }
}

// Inicializar en desarrollo
if (process.env.NODE_ENV === 'development') {
  window.__NETWORK_MONITOR__ = new NetworkMonitor()
}
```

---

# 20. ANEXOS Y REFERENCIAS

## 20.1 Glosario de Términos

### Términos de Negocio
- **PTG**: Panama Terminal & Trucking - Módulo de transporte terrestre
- **PTYSS**: Puerto de Terminales y Servicios - Operaciones portuarias
- **ShipChandler**: Proveedor de suministros para buques
- **Agency**: Agencia marítima - Servicios de transporte de tripulación
- **Container ISO Code**: Código estandarizado internacional para contenedores
- **F/E**: Full/Empty - Estado de carga del contenedor
- **RT**: Round Trip - Viaje de ida y vuelta
- **SAP**: Sistema de planificación de recursos empresariales
- **Taulia Code**: Código de integración con sistema Taulia de SAP

### Términos Técnicos
- **JWT**: JSON Web Token - Token de autenticación
- **RBAC**: Role-Based Access Control - Control de acceso basado en roles
- **SSR**: Server-Side Rendering - Renderizado del lado del servidor
- **CSR**: Client-Side Rendering - Renderizado del lado del cliente
- **ISR**: Incremental Static Regeneration - Regeneración estática incremental
- **HMR**: Hot Module Replacement - Reemplazo de módulos en caliente
- **Bundle Splitting**: División del código en múltiples archivos
- **Tree Shaking**: Eliminación de código no utilizado

## 20.2 API Reference Quick Guide

### Endpoints Principales
```typescript
// Autenticación
POST   /api/user/login          // Login
POST   /api/user/register       // Registro
POST   /api/user/reloadUser     // Verificar token
POST   /api/user/logout         // Logout

// Gestión de Usuarios (Admin)
GET    /api/user/all            // Listar usuarios
PUT    /api/user/{id}           // Actualizar usuario
DELETE /api/user/{id}           // Eliminar usuario
PUT    /api/user/reset-password/{id} // Reset password

// Clientes
GET    /api/clients             // Listar clientes
POST   /api/clients             // Crear cliente
PUT    /api/clients/{id}        // Actualizar cliente
DELETE /api/clients/{id}        // Eliminar cliente
GET    /api/clients/search/sap-code // Buscar por SAP

// Trucking
POST   /api/trucking/upload     // Subir Excel
GET    /api/trucking/records    // Obtener registros
POST   /api/trucking/prefactura // Crear prefactura
POST   /api/trucking/invoice    // Crear factura
GET    /api/trucking/routes     // Obtener rutas

// Agency
GET    /api/agency/services     // Listar servicios
POST   /api/agency/services     // Crear servicio
PUT    /api/agency/services/{id} // Actualizar servicio
DELETE /api/agency/services/{id} // Eliminar servicio
POST   /api/agency/sap/generate-xml // Generar XML

// PTYSS
POST   /api/ptyss/records       // Crear registros
GET    /api/ptyss/records       // Listar registros
POST   /api/ptyss/invoice       // Crear factura
GET    /api/ptyss/reports       // Obtener reportes

// ShipChandler
POST   /api/shipchandler/upload // Subir Excel
POST   /api/shipchandler/prefactura // Crear prefactura
POST   /api/shipchandler/invoice // Crear factura
```

## 20.3 Códigos de Error

### Códigos HTTP
```typescript
// 2xx - Éxito
200 OK                  // Solicitud exitosa
201 Created            // Recurso creado
204 No Content         // Sin contenido (delete exitoso)

// 4xx - Errores del Cliente
400 Bad Request        // Solicitud mal formada
401 Unauthorized       // No autenticado
403 Forbidden          // Sin permisos
404 Not Found          // Recurso no encontrado
422 Unprocessable Entity // Validación fallida

// 5xx - Errores del Servidor
500 Internal Server Error // Error genérico del servidor
502 Bad Gateway          // Error de proxy
503 Service Unavailable  // Servicio no disponible
504 Gateway Timeout      // Timeout del gateway
```

### Códigos de Error Personalizados
```typescript
// Autenticación
AUTH001: "Credenciales inválidas"
AUTH002: "Token expirado"
AUTH003: "Token inválido"
AUTH004: "Usuario no activo"
AUTH005: "Sesión cerrada"

// Permisos
PERM001: "Sin permisos para esta acción"
PERM002: "Módulo no autorizado"
PERM003: "Sección no autorizada"
PERM004: "Rol insuficiente"

// Validación
VAL001: "Campos requeridos faltantes"
VAL002: "Formato de email inválido"
VAL003: "Contraseña muy corta"
VAL004: "Fecha inválida"
VAL005: "Archivo muy grande"

// Negocio
BUS001: "Cliente no tiene SAP code"
BUS002: "Ruta no configurada"
BUS003: "Contenedor duplicado"
BUS004: "Factura ya existe"
BUS005: "Registro ya facturado"
```

## 20.4 Configuración de Herramientas

### ESLint Configuration
```json
// .eslintrc.json
{
  "extends": [
    "next/core-web-vitals",
    "plugin:@typescript-eslint/recommended"
  ],
  "rules": {
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/no-explicit-any": "warn",
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "warn"
  }
}
```

### Prettier Configuration
```json
// .prettierrc
{
  "semi": false,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2,
  "useTabs": false,
  "bracketSpacing": true,
  "arrowParens": "always",
  "endOfLine": "lf"
}
```

### TypeScript Configuration
```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "paths": {
      "@/*": ["./src/*"],
      "@components/*": ["./src/components/*"],
      "@hooks/*": ["./src/hooks/*"],
      "@lib/*": ["./src/lib/*"],
      "@store/*": ["./src/lib/store/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules"]
}
```

## 20.5 Recursos y Enlaces

### Documentación Externa
- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev)
- [TypeScript Documentation](https://www.typescriptlang.org/docs)
- [Redux Toolkit Documentation](https://redux-toolkit.js.org)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Radix UI Documentation](https://www.radix-ui.com/docs)
- [shadcn/ui Documentation](https://ui.shadcn.com)

### Herramientas de Desarrollo
- [React DevTools](https://react.dev/learn/react-developer-tools)
- [Redux DevTools](https://github.com/reduxjs/redux-devtools)
- [Next.js DevTools](https://nextjs.org/docs/advanced-features/debugging)
- [Chrome DevTools](https://developer.chrome.com/docs/devtools)
- [Postman](https://www.postman.com) - Testing de APIs
- [TablePlus](https://tableplus.com) - Gestión de base de datos

### Recursos de Aprendizaje
- [Next.js Learn Course](https://nextjs.org/learn)
- [TypeScript Deep Dive](https://basarat.gitbook.io/typescript)
- [React Patterns](https://reactpatterns.com)
- [Clean Code JavaScript](https://github.com/ryanmcdermott/clean-code-javascript)

## 20.6 Contactos y Soporte

# CONCLUSIÓN

Este documento representa una guía completa del Sistema de Facturación Marítima, cubriendo todos los aspectos técnicos y funcionales del frontend. El sistema está diseñado para ser escalable, mantenible y seguro, con una arquitectura modular que permite agregar nuevas funcionalidades sin afectar las existentes.

La documentación debe mantenerse actualizada con cada cambio significativo en el sistema, especialmente en:
- Nuevos módulos o funcionalidades
- Cambios en la estructura de datos
- Modificaciones en los flujos de usuario
- Actualizaciones de integraciones externas
- Cambios en permisos y roles

Para cualquier consulta adicional o clarificación, consulte con el equipo de desarrollo o revise el código fuente directamente en el repositorio.

---

**Última actualización**: Diciembre 2024
**Versión del documento**: 1.0.0
**Estado**: Completo