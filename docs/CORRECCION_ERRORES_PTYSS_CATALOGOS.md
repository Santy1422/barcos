# 🔧 Corrección de Errores en PTYSS Catálogos - Rutas Locales

## 🔍 Problemas Identificados

### 1. **Error 400 (Bad Request) al obtener clientes** ❌
```
GET http://localhost:8080/api/clients 400 (Bad Request)
```

**Causa:** El middleware `requireAnyRole` no incluía el rol `catalogos`, por lo que usuarios con ese rol no podían acceder al endpoint de clientes.

### 2. **Selectores Redux sin memoizar** ⚠️
Tres selectores estaban retornando nuevas referencias en cada render, causando re-renders innecesarios:
- `selectPTYSSLocalRoutesByClient`
- `selectClientAssociations` 
- `selectAllAvailableSchemas`

**Impacto:** Degradación del rendimiento por re-renders innecesarios del componente PTYSSLocalRoutes.

---

## ✅ Soluciones Implementadas

### 1. **Actualización del Middleware `requireAnyRole`**

📁 **Archivo:** `api/src/middlewares/authorization.ts`

**Cambio:**
```typescript
// ANTES
export const requireAnyRole = requireRole(['administrador', 'operaciones', 'facturacion']);

// DESPUÉS
export const requireAnyRole = requireRole(['administrador', 'operaciones', 'facturacion', 'catalogos']);
```

**Resultado:** 
- ✅ Los usuarios con rol `catalogos` ahora pueden acceder a los endpoints de clientes (GET)
- ✅ El error 400 al cargar la sección de rutas locales está resuelto

---

### 2. **Memoización de Selectores Redux**

📁 **Archivo:** `front/lib/features/ptyssLocalRoutes/ptyssLocalRoutesSlice.ts`

#### Cambio 1: Importar `createSelector`
```typescript
// ANTES
import { createSlice, createAsyncThunk, type PayloadAction } from "@reduxjs/toolkit"

// DESPUÉS
import { createSlice, createAsyncThunk, createSelector, type PayloadAction } from "@reduxjs/toolkit"
```

#### Cambio 2: Memoizar `selectPTYSSLocalRoutesByClient`
```typescript
// ANTES - Selector sin memoizar
export const selectPTYSSLocalRoutesByClient = (state: { ptyssLocalRoutes: PTYSSLocalRoutesState }) => {
  const routes = state.ptyssLocalRoutes?.routes || []
  // ... lógica de filtrado y agrupación
  return grouped
}

// DESPUÉS - Selector memoizado con createSelector
export const selectPTYSSLocalRoutesByClient = createSelector(
  [selectPTYSSLocalRoutes],
  (routes) => {
    // Filtrar rutas placeholder
    const realRoutes = routes.filter(route => 
      route.from !== '__PLACEHOLDER__' && route.to !== '__PLACEHOLDER__'
    )
    
    const grouped = realRoutes.reduce((acc, route) => {
      if (!acc[route.clientName]) {
        acc[route.clientName] = []
      }
      acc[route.clientName].push(route)
      return acc
    }, {} as Record<string, PTYSSLocalRoute[]>)
    
    return grouped
  }
)
```

#### Cambio 3: Memoizar `selectClientAssociations`
```typescript
// ANTES
export const selectClientAssociations = (state: { ptyssLocalRoutes: PTYSSLocalRoutesState }) => {
  const routes = state.ptyssLocalRoutes?.routes || []
  // ... lógica
  return associations
}

// DESPUÉS
export const selectClientAssociations = createSelector(
  [selectPTYSSLocalRoutes],
  (routes) => {
    const associations: Record<string, RealClient | null> = {}
    
    routes.forEach(route => {
      if (route.realClientId && typeof route.realClientId === 'object') {
        associations[route.clientName] = route.realClientId as RealClient
      } else if (!associations[route.clientName]) {
        associations[route.clientName] = null
      }
    })
    
    return associations
  }
)
```

#### Cambio 4: Memoizar `selectAllAvailableSchemas`
```typescript
// ANTES
export const selectAllAvailableSchemas = (state: { ptyssLocalRoutes: PTYSSLocalRoutesState }) => {
  const routeSchemas = state.ptyssLocalRoutes?.routes?.map(route => route.clientName) || []
  const summarySchemas = state.ptyssLocalRoutes?.schemaSummary?.schemas?.map(schema => schema.schemaName) || []
  // ... lógica
  return allSchemas.sort()
}

// DESPUÉS
export const selectAllAvailableSchemas = createSelector(
  [selectPTYSSLocalRoutes, selectSchemaSummary],
  (routes, schemaSummary) => {
    const routeSchemas = routes?.map(route => route.clientName) || []
    const summarySchemas = schemaSummary?.schemas?.map(schema => schema.schemaName) || []
    
    // Combinar ambos y eliminar duplicados
    const allSchemas = [...new Set([...routeSchemas, ...summarySchemas])]
    return allSchemas.sort()
  }
)
```

**Resultado:**
- ✅ Eliminados los warnings de Redux sobre selectores no memoizados
- ✅ Mejora significativa en el rendimiento al prevenir re-renders innecesarios
- ✅ Los selectores ahora solo recalculan cuando cambian sus dependencias

---

## 📊 Beneficios de la Memoización

### ¿Qué es la Memoización?
La memoización es una técnica de optimización que **cachea** el resultado de una función y solo lo recalcula cuando sus entradas (dependencias) cambian.

### ¿Por qué es importante en Redux?
Los selectores sin memoizar crean **nuevas referencias** de objetos/arrays en cada llamada, incluso si los datos no han cambiado. Esto causa:
- ❌ Re-renders innecesarios de componentes
- ❌ Degradación del rendimiento
- ❌ Consumo innecesario de CPU/memoria

### Con `createSelector`:
- ✅ Solo recalcula si las dependencias cambian (comparación por referencia)
- ✅ Retorna la misma referencia si los datos son idénticos
- ✅ Previene re-renders innecesarios
- ✅ Mejor rendimiento general

---

## 🚀 Cómo Aplicar los Cambios

### 1. **Reiniciar Backend**
```bash
cd api
# Detener el servidor (Ctrl + C)
npm run dev
```

### 2. **Refrescar Frontend**
El frontend se actualizará automáticamente si tienes hot reload activo. Si no:
```bash
cd front
# Detener el servidor (Ctrl + C)
npm run dev
```

### 3. **Limpiar Caché del Navegador**
- **Chrome/Edge:** `Ctrl + Shift + R` (Windows) o `Cmd + Shift + R` (Mac)
- **Firefox:** `Ctrl + F5` (Windows) o `Cmd + Shift + R` (Mac)

---

## 🧪 Verificación

### ✅ El Error 400 debe desaparecer
1. Login con usuario que tenga rol `catalogos`
2. Navegar a **PTYSS → Configuración → Rutas Locales**
3. La sección debe cargar correctamente SIN error 400
4. Los clientes deben cargarse correctamente

### ✅ Los Warnings de Redux deben desaparecer
1. Abrir la consola del navegador (F12)
2. Navegar a **PTYSS → Configuración → Rutas Locales**
3. Verificar que NO aparezcan estos warnings:
   - ❌ "Selector selectPTYSSLocalRoutesByClient returned a different result..."
   - ❌ "Selector selectClientAssociations returned a different result..."
   - ❌ "Selector selectAllAvailableSchemas returned a different result..."

### ✅ El rendimiento debe mejorar
- La sección debe cargar más rápido
- Interacciones más fluidas
- Menos re-renders en React DevTools

---

## 📝 Resumen de Archivos Modificados

| Archivo | Cambio | Estado |
|---------|--------|--------|
| `api/src/middlewares/authorization.ts` | Agregado rol `catalogos` a `requireAnyRole` | ✅ |
| `front/lib/features/ptyssLocalRoutes/ptyssLocalRoutesSlice.ts` | Importado `createSelector` | ✅ |
| `front/lib/features/ptyssLocalRoutes/ptyssLocalRoutesSlice.ts` | Memoizado `selectPTYSSLocalRoutesByClient` | ✅ |
| `front/lib/features/ptyssLocalRoutes/ptyssLocalRoutesSlice.ts` | Memoizado `selectClientAssociations` | ✅ |
| `front/lib/features/ptyssLocalRoutes/ptyssLocalRoutesSlice.ts` | Memoizado `selectAllAvailableSchemas` | ✅ |

**Sin errores de linting ✅**

---

## 📚 Documentación Relacionada

- [Redux Toolkit - createSelector](https://redux-toolkit.js.org/api/createSelector)
- [Reselect - Memoization](https://redux.js.org/usage/deriving-data-selectors#optimizing-selectors-with-memoization)
- [React Performance Optimization](https://react.dev/learn/render-and-commit)

---

## 💡 Lecciones Aprendidas

### 1. **Siempre incluir todos los roles necesarios en middlewares compartidos**
El middleware `requireAnyRole` debe incluir TODOS los roles que necesitan acceso de lectura a recursos compartidos como clientes.

### 2. **Memoizar selectores que retornan objetos/arrays calculados**
Los selectores simples (que solo acceden a state) no necesitan memoización, pero los que crean nuevos objetos/arrays SIEMPRE deben usar `createSelector`.

### 3. **Regla general para selectores:**
```typescript
// ✅ NO necesita memoización (retorna primitivo o referencia directa)
export const selectLoading = (state) => state.data.loading

// ❌ SÍ necesita memoización (crea nuevo array/objeto)
export const selectFilteredData = (state) => state.data.items.filter(...)

// ✅ Versión correcta con memoización
export const selectFilteredData = createSelector(
  [(state) => state.data.items],
  (items) => items.filter(...)
)
```

---

**Fecha de corrección:** 12 de Noviembre, 2025  
**Problemas resueltos:**
- ✅ Error 400 (Bad Request) en `/api/clients`
- ✅ Warnings de selectores Redux no memoizados
- ✅ Re-renders innecesarios en PTYSSLocalRoutes
- ✅ Mejora de rendimiento general

