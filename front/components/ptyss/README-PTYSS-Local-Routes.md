# PTYSS Local Routes - Gestión de Rutas Locales

## Descripción

El componente `PTYSSLocalRoutes` permite gestionar las rutas locales de PTYSS, organizadas por clientes. Cada cliente puede tener múltiples rutas predefinidas con orígenes y destinos específicos, cada una con su propio precio.

## Características

### 🏢 Gestión por Clientes
- **5 clientes predefinidos**: cliente 1, cliente 2, cliente 3, cliente 4, cliente 5
- **Vista organizada por pestañas**: Cada cliente tiene su propia pestaña para facilitar la gestión
- **Rutas independientes**: Cada cliente puede tener sus propias rutas y precios

### 🗺️ Rutas Predefinidas
- **Orígenes disponibles**: COLON, PSA
- **Destinos dinámicos**: Los destinos se filtran automáticamente según el origen seleccionado
- **Rutas del Cliente 1**: Basadas en la tabla "TARIFAS / cliente 1" del Excel proporcionado

### 💰 Gestión de Precios
- **Precios individuales**: Cada ruta tiene su propio precio
- **Validación**: Los precios deben ser mayores a 0
- **Formato**: Precios con 2 decimales

## Estructura de Datos

### Esquema de Base de Datos
```typescript
interface PTYSSLocalRoute {
  _id: string
  clientName: string // 'cliente 1' | 'cliente 2' | 'cliente 3' | 'cliente 4' | 'cliente 5'
  from: string       // Origen de la ruta
  to: string         // Destino de la ruta
  price: number      // Precio de la ruta
  createdAt: string
  updatedAt: string
}
```

### Rutas Predefinidas del Cliente 1

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
- PSA → VILLA LUCRE
- PSA → TOCUMEN
- PSA → 24 DICIEMBRE
- PSA → PACORA
- PSA → FELIPILLO
- PSA → METETI
- PSA → DARIEN

## Funcionalidades

### ✅ Crear Ruta
1. Seleccionar cliente
2. Seleccionar origen (COLON o PSA)
3. Seleccionar destino (filtrado por origen)
4. Establecer precio
5. Guardar

### ✏️ Editar Ruta
- Modificar cualquier campo de una ruta existente
- Validación de duplicados
- Actualización en tiempo real

### 🗑️ Eliminar Ruta
- Confirmación antes de eliminar
- Eliminación permanente de la base de datos

### 📊 Visualización
- **Tabla organizada**: Origen, Destino, Precio, Acciones
- **Pestañas por cliente**: Navegación fácil entre clientes
- **Estados de carga**: Indicadores visuales durante operaciones

## API Endpoints

### GET `/api/ptyss-local-routes`
Obtener todas las rutas locales de PTYSS

### POST `/api/ptyss-local-routes`
Crear una nueva ruta local

### PUT `/api/ptyss-local-routes/:id`
Actualizar una ruta existente

### DELETE `/api/ptyss-local-routes/:id`
Eliminar una ruta

## Scripts de Base de Datos

### Seed de Rutas Predefinidas
```bash
# Ejecutar desde la carpeta api/
npm run seed:ptyss-local-routes
```

Este script:
- Conecta a MongoDB
- Elimina rutas existentes del cliente 1
- Inserta todas las rutas predefinidas con precio 0
- Muestra un resumen de la operación

## Integración

### En PTYSS Config
El componente se integra en la configuración de PTYSS como una nueva pestaña:
- **Navieras**: Gestión de navieras
- **Rutas Trasiego**: Rutas de trasiego existentes
- **Rutas Local**: Nuevo componente de rutas locales
- **Servicios Adicionales**: Gestión de servicios

### Redux Store
```typescript
// Estado en el store
ptyssLocalRoutes: {
  routes: PTYSSLocalRoute[]
  loading: boolean
  error: string | null
}
```

## Validaciones

### Frontend
- Campos obligatorios completos
- Precio mayor a 0
- Selección de origen antes de destino
- Destinos filtrados por origen

### Backend
- Validación de cliente válido
- Prevención de duplicados (cliente + origen + destino)
- Validación de esquema MongoDB
- Manejo de errores con mensajes descriptivos

## Uso

1. **Acceder a Configuración PTYSS**
2. **Seleccionar pestaña "Rutas Local"**
3. **Navegar entre clientes** usando las pestañas
4. **Agregar rutas** con el botón "Agregar Ruta"
5. **Editar o eliminar** rutas existentes

## Próximos Pasos

- [ ] Agregar rutas predefinidas para clientes 2-5
- [ ] Implementar importación masiva desde Excel
- [ ] Agregar filtros y búsqueda
- [ ] Implementar exportación de datos
- [ ] Agregar historial de cambios 