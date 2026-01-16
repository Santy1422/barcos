# 🔧 Solución Final: Error 400 al cargar clientes

## 🔍 Problema Raíz Identificado

El error **400 (Bad Request)** en `/api/clients` NO era un problema de permisos, sino de **autenticación faltante**.

### ❌ Código Problemático

El thunk `fetchClients` en `front/lib/features/clients/clientsSlice.ts` hacía la petición **sin token de autenticación**:

```typescript
// ❌ ANTES - Sin autenticación
const response = await fetch(url)
```

Después de actualizar el backend para requerir autenticación en el endpoint de clientes (con `requireAnyRole`), todas las peticiones necesitan incluir el token JWT en el header `Authorization`.

---

## ✅ Solución Implementada

### Archivo modificado: `front/lib/features/clients/clientsSlice.ts`

**Cambio:**

```typescript
// ✅ DESPUÉS - Con autenticación
async (module?: string) => {
  console.log('🔍 fetchClients - Iniciando fetch de clientes...', module ? `para módulo ${module}` : 'todos')
  
  // Obtener token de autenticación
  const token = localStorage.getItem('token')
  if (!token) {
    console.error('🔍 fetchClients - No hay token de autenticación')
    throw new Error('No hay token de autenticación')
  }
  
  // Construir URL con parámetro de módulo si se proporciona
  let url = createApiUrl('/api/clients')
  if (module) {
    url = createApiUrl(`/api/clients?module=${module}`)
  }
  
  console.log('🔍 fetchClients - URL:', url)
  console.log('🔍 fetchClients - Token presente:', !!token)
  
  // Petición con headers de autenticación
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  })
  console.log('🔍 fetchClients - Response status:', response.status)
  
  // ... resto del código
}
```

**Cambios clave:**
1. ✅ Obtiene el token de `localStorage`
2. ✅ Valida que el token exista antes de hacer la petición
3. ✅ Incluye el token en el header `Authorization: Bearer {token}`
4. ✅ Agrega logging para debug

---

## 📋 Resumen de Todos los Cambios Realizados

Para resolver completamente el problema de acceso para usuarios con rol `catalogos`, se realizaron los siguientes cambios:

### 1. **Backend - Permisos de Autorización** ✅

#### `api/src/middlewares/authorization.ts`
```typescript
// Agregado rol 'catalogos' a requireAnyRole
export const requireAnyRole = requireRole(['administrador', 'operaciones', 'facturacion', 'catalogos']);

// Nuevo middleware específico
export const requireAdminOrCatalogos = requireRole(['administrador', 'catalogos']);
```

#### `api/src/routes/config.ts`
```typescript
// Container Types - Accesible por administradores y catalogos
router.get('/container-types', jwtUtils, requireAdminOrCatalogos, catchedAsync(getAllContainerTypes));
router.post('/container-types', jwtUtils, requireAdminOrCatalogos, catchedAsync(createContainerType));
router.put('/container-types/:id', jwtUtils, requireAdminOrCatalogos, catchedAsync(updateContainerType));
router.delete('/container-types/:id', jwtUtils, requireAdminOrCatalogos, catchedAsync(deleteContainerType));
```

#### `api/src/routes/agencyCatalogsRoutes.ts`
- Todos los endpoints de catálogos actualizados a `requireAdminOrCatalogos`

#### `api/src/routes/navieras.ts`
```typescript
router.use(jwtUtils)
router.use(requireAdminOrCatalogos)
```

#### `api/src/routes/clients.ts`
```typescript
// Lectura: Todos los roles autenticados
router.get('/', jwtUtils, requireAnyRole, catchedAsync(clientsControllers.getAllClients));

// Escritura: Solo admin o catalogos
router.post('/', jwtUtils, requireAdminOrCatalogos, catchedAsync(clientsControllers.createClient));
router.put('/:id', jwtUtils, requireAdminOrCatalogos, catchedAsync(clientsControllers.updateClient));
router.delete('/:id', jwtUtils, requireAdminOrCatalogos, catchedAsync(clientsControllers.deleteClient));
```

### 2. **Frontend - Jerarquía de Roles** ✅

#### `front/lib/features/auth/authSlice.ts`
```typescript
const roleHierarchy = {
  'administrador': 3,
  'operaciones': 2,
  'facturacion': 2,
  'clientes': 2,
  'catalogos': 2,  // ← AGREGADO
  'pendiente': 0,
}
```

### 3. **Frontend - Selectores Redux Memoizados** ✅

#### `front/lib/features/ptyssLocalRoutes/ptyssLocalRoutesSlice.ts`
- Memoizados 3 selectores con `createSelector`:
  - `selectPTYSSLocalRoutesByClient`
  - `selectClientAssociations`
  - `selectAllAvailableSchemas`

### 4. **Frontend - Autenticación en fetchClients** ✅ (CLAVE)

#### `front/lib/features/clients/clientsSlice.ts`
- Agregado token JWT a la petición de clientes

---

## 🚀 Cómo Aplicar los Cambios

### 1. **El frontend se actualizará automáticamente**
Si tienes Next.js en modo desarrollo con hot reload, los cambios deberían aplicarse automáticamente.

### 2. **Refrescar el navegador**
```
Ctrl + Shift + R (Windows/Linux)
Cmd + Shift + R (Mac)
```

### 3. **Verificar en la consola**
Deberías ver estos nuevos logs:
```
🔍 fetchClients - Token presente: true
🔍 fetchClients - Response status: 200
```

---

## ✅ Verificación Final

### Después de estos cambios, deberías ver:

1. **✅ NO más error 400**
   - La petición a `/api/clients` debe devolver 200 OK
   - Los clientes se cargan correctamente

2. **✅ NO más warnings de Redux**
   - Los selectores memoizados eliminan los re-renders

3. **✅ Sección funcional**
   - Rutas Locales en PTYSS → Configuración debe funcionar completamente
   - Los clientes reales aparecen en los selectores

### Logs esperados (exitosos):
```
🔍 fetchClients - Iniciando fetch de clientes... todos
🔍 fetchClients - URL: http://localhost:8080/api/clients
🔍 fetchClients - Token presente: true
🔍 fetchClients - Response status: 200
🔍 fetchClients - Clientes finales: Array(X)
🔍 fetchClients - Cantidad de clientes: X
```

---

## 🔎 Si Aún Tienes Problemas

### Problema: El error 400 persiste
**Solución:** Verifica que el token existe en localStorage:
1. Abre DevTools (F12)
2. Ve a la pestaña "Application" o "Almacenamiento"
3. En "Local Storage", busca la entrada `token`
4. Si no existe o está vacío, cierra sesión y vuelve a iniciar sesión

### Problema: Error 401 (Unauthorized)
**Causa:** El token expiró o es inválido
**Solución:** Cierra sesión y vuelve a iniciar sesión para obtener un token nuevo

### Problema: Error 403 (Forbidden)
**Causa:** El usuario no tiene el rol adecuado
**Solución:** Verifica que el usuario tenga uno de estos roles: `administrador`, `operaciones`, `facturacion`, o `catalogos`

---

## 📊 Matriz de Acceso Final

| Endpoint | Administrador | Catalogos | Operaciones | Facturación |
|----------|:-------------:|:---------:|:-----------:|:-----------:|
| **GET /api/clients** | ✅ | ✅ | ✅ | ✅ |
| **POST /api/clients** | ✅ | ✅ | ❌ | ❌ |
| **PUT /api/clients/:id** | ✅ | ✅ | ❌ | ❌ |
| **DELETE /api/clients/:id** | ✅ | ✅ | ❌ | ❌ |
| **GET /api/config/container-types** | ✅ | ✅ | ❌ | ❌ |
| **POST /api/config/container-types** | ✅ | ✅ | ❌ | ❌ |
| **GET /api/navieras** | ✅ | ✅ | ❌ | ❌ |
| **POST /api/navieras** | ✅ | ✅ | ❌ | ❌ |
| **GET /api/agency/catalogs** | ✅ | ✅ | ❌ | ❌ |
| **POST /api/agency/catalogs** | ✅ | ✅ | ❌ | ❌ |

---

## 📝 Archivos Modificados - Resumen Final

| Archivo | Cambio | Estado |
|---------|--------|--------|
| `api/src/middlewares/authorization.ts` | Agregado `catalogos` a `requireAnyRole` | ✅ |
| `api/src/middlewares/authorization.ts` | Nuevo middleware `requireAdminOrCatalogos` | ✅ |
| `api/src/routes/config.ts` | Actualizados permisos container-types | ✅ |
| `api/src/routes/agencyCatalogsRoutes.ts` | Actualizados todos los endpoints | ✅ |
| `api/src/routes/navieras.ts` | Agregado middleware catalogos | ✅ |
| `api/src/routes/clients.ts` | Permisos granulares por operación | ✅ |
| `front/lib/features/auth/authSlice.ts` | Agregado rol catalogos | ✅ |
| `front/lib/features/ptyssLocalRoutes/ptyssLocalRoutesSlice.ts` | Memoizados 3 selectores | ✅ |
| `front/lib/features/clients/clientsSlice.ts` | **Agregado token JWT a fetchClients** | ✅ |

**Total: 9 archivos modificados**  
**Sin errores de linting ✅**

---

## 🎯 Conclusión

El problema tenía **dos causas**:

1. **Permisos en el backend:** El rol `catalogos` no estaba incluido en los middlewares
2. **Autenticación en el frontend:** El `fetchClients` no enviaba el token JWT

Ambos problemas han sido resueltos. La sección de Rutas Locales en PTYSS → Configuración ahora debe funcionar correctamente para usuarios con rol `catalogos`.

---

**Fecha de corrección:** 12 de Noviembre, 2025  
**Problema resuelto:** Error 400 al cargar clientes en PTYSS Rutas Locales  
**Causa raíz:** Petición sin token de autenticación

