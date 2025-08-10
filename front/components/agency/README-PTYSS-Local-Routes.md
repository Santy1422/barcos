# PTYSS Local Routes - Gestión de Rutas Locales

## Descripción

El componente `PTYSSLocalRoutes` permite gestionar las rutas locales de PTYSS, organizadas por esquemas de rutas. Cada esquema puede tener múltiples rutas predefinidas con orígenes y destinos específicos, cada una con su propio precio. Los esquemas pueden ser asociados a clientes reales del sistema.

## Características

### 🏢 Gestión por Esquemas de Rutas
- **5 esquemas predefinidos**: esquema rutas 1, esquema rutas 2, esquema rutas 3, esquema rutas 4, esquema rutas 5
- **Vista organizada por pestañas**: Cada esquema tiene su propia pestaña para facilitar la gestión
- **Rutas independientes**: Cada esquema puede tener sus propias rutas y precios
- **Asociación con clientes reales**: Los esquemas pueden asociarse a clientes reales del sistema

### 🗺️ Rutas Predefinidas
- **Orígenes disponibles**: COLON, PSA
- **Destinos dinámicos**: Los destinos se filtran automáticamente según el origen seleccionado
- **Rutas del Esquema Rutas 1**: Basadas en la tabla "TARIFAS / cliente 1" del Excel proporcionado

### 💰 Gestión de Precios
- **Precios individuales**: Cada ruta tiene su propio precio
- **Validación**: Los precios deben ser mayores a 0
- **Formato**: Precios con 2 decimales

### 🔗 Asociación con Clientes Reales
- **Cliente único por esquema**: Cada esquema solo puede asociarse a un cliente real
- **Esquema único por cliente**: Cada cliente real solo puede asociarse a un esquema
- **Información visual**: Indicadores claros de qué esquemas están asociados
- **Gestión completa**: Crear nuevas asociaciones y ver información del cliente asociado

## Estructura de Datos

### Esquema de Base de Datos
```typescript
interface PTYSSLocalRoute {
  _id: string
  clientName: string // 'esquema rutas 1' | 'esquema rutas 2' | 'esquema rutas 3' | 'esquema rutas 4' | 'esquema rutas 5'
  realClientId?: ObjectId // Referencia opcional al cliente real asociado
  from: string       // Origen de la ruta
  to: string         // Destino de la ruta
  price: number      // Precio de la ruta
  createdAt: string
  updatedAt: string
}
```

### Rutas Predefinidas del Esquema Rutas 1

#### Rutas desde COLON:
- COLON → ANTON
- COLON → PENONOME
- COLON → AGUADULCE
- COLON → SANTIAGO
- COLON → VERAGUAS
- COLON → CHITRE
- COLON → HERRERA
- COLON → LOS SANTOS
- COLON → LAS TABLAS
- COLON → DAVID
- COLON → VOLCAN
- COLON → GUGABA
- COLON → PASO CANOA

#### Rutas desde PSA:
- PSA → SABANITA
- PSA → PORTOBELO
- PSA → BUENAS VISTA
- PSA → CHILIBRE
- PSA → LAS CUMBRES
- PSA → LOS ANDES
- PSA → SAN MIGUELITO
- PSA → CIUDAD PANAMA
- PSA → RIO ABAJO

## Funcionalidades

### ✅ Gestión de Rutas
- Crear nuevas rutas en cualquier esquema
- Editar rutas existentes
- Eliminar rutas
- Búsqueda por origen/destino

### ✅ Asociación de Clientes
- Asociar esquemas de rutas a clientes reales
- Ver información del cliente asociado
- Validaciones para evitar dobles asociaciones
- Indicadores visuales de estado de asociación

### ✅ Interfaz de Usuario
- Pestañas organizadas por esquema
- Indicadores visuales de asociación (✓ verde)
- Información completa del cliente asociado
- Filtros y búsquedas avanzadas

## API Endpoints

### Rutas Básicas
- `GET /api/ptyss-local-routes` - Obtener todas las rutas
- `POST /api/ptyss-local-routes` - Crear nueva ruta
- `PUT /api/ptyss-local-routes/:id` - Actualizar ruta
- `DELETE /api/ptyss-local-routes/:id` - Eliminar ruta

### Asociación de Clientes
- `POST /api/ptyss-local-routes/associate-client` - Asociar cliente real a esquema de rutas

## Validaciones

### Backend
- Solo esquemas válidos permitidos
- Validación de IDs de cliente real
- Prevención de dobles asociaciones
- Verificación de existencia de recursos

### Frontend  
- Campos requeridos validados
- Solo esquemas sin asociar disponibles
- Solo clientes reales disponibles
- Feedback visual completo 