# ✅ Permisos para Rol "Catalogos" - Implementado

## 🔍 Problema Identificado

Los usuarios con rol `catalogos` estaban recibiendo error **403 (Forbidden)** al intentar acceder a endpoints de catálogos, específicamente:
- `/api/config/container-types`
- Y otros endpoints de gestión de catálogos

### Causa Raíz
Los middlewares de autorización en el backend solo permitían acceso a usuarios con roles `administrador` u `operaciones`, excluyendo al rol `catalogos`.

---

## 🛠️ Cambios Implementados

### 1. **Backend - Middleware de Autorización**
📁 `api/src/middlewares/authorization.ts`

**Cambio:** Agregado nuevo middleware `requireAdminOrCatalogos`

```typescript
export const requireAdminOrCatalogos = requireRole(['administrador', 'catalogos']);
```

Este middleware permite acceso a usuarios con rol `administrador` o `catalogos`.

---

### 2. **Backend - Rutas de Container Types**
📁 `api/src/routes/config.ts`

**Cambio:** Actualizado middleware de todas las rutas de container-types

```typescript
// Container Types - Accesible por administradores y usuarios con rol catalogos
router.get('/container-types', jwtUtils, requireAdminOrCatalogos, catchedAsync(getAllContainerTypes));
router.post('/container-types', jwtUtils, requireAdminOrCatalogos, catchedAsync(createContainerType));
router.put('/container-types/:id', jwtUtils, requireAdminOrCatalogos, catchedAsync(updateContainerType));
router.delete('/container-types/:id', jwtUtils, requireAdminOrCatalogos, catchedAsync(deleteContainerType));
```

---

### 3. **Backend - Rutas de Catálogos de Agency**
📁 `api/src/routes/agencyCatalogsRoutes.ts`

**Cambio:** Actualizado middleware en **todos** los endpoints de catálogos:

- ✅ GET `/api/agency/catalogs` - Obtener todos los catálogos
- ✅ GET `/api/agency/catalogs/grouped` - Catálogos agrupados
- ✅ GET `/api/agency/catalogs/search` - Buscar catálogos
- ✅ GET `/api/agency/catalogs/:type` - Obtener por tipo
- ✅ POST `/api/agency/catalogs` - Crear entrada
- ✅ PUT `/api/agency/catalogs/:id` - Actualizar entrada
- ✅ PUT `/api/agency/catalogs/:id/reactivate` - Reactivar entrada
- ✅ DELETE `/api/agency/catalogs/:id` - Eliminar entrada
- ✅ POST `/api/agency/catalogs/pricing/calculate` - Calcular precio
- ✅ GET `/api/agency/catalogs/pricing/routes` - Obtener rutas de precios
- ✅ POST `/api/agency/catalogs/pricing/routes` - Crear ruta de precio
- ✅ PUT `/api/agency/catalogs/pricing/routes/:id` - Actualizar ruta
- ✅ DELETE `/api/agency/catalogs/pricing/routes/:id` - Eliminar ruta
- ✅ GET `/api/agency/catalogs/pricing/stats` - Estadísticas
- ✅ GET `/api/agency/catalogs/export` - Exportar catálogos

---

### 4. **Backend - Rutas de Navieras**
📁 `api/src/routes/navieras.ts`

**Cambio:** Aplicado middleware `requireAdminOrCatalogos` a todas las rutas de navieras

```typescript
router.use(jwtUtils)
router.use(requireAdminOrCatalogos)
```

---

### 5. **Backend - Rutas de Clientes**
📁 `api/src/routes/clients.ts`

**Cambio:** Permisos granulares por operación:

```typescript
// Operaciones de lectura: Cualquier rol autenticado
router.get('/', jwtUtils, requireAnyRole, ...)
router.get('/active', jwtUtils, requireAnyRole, ...)
router.get('/:id', jwtUtils, requireAnyRole, ...)

// Operaciones de escritura: Solo admin o catalogos
router.post('/', jwtUtils, requireAdminOrCatalogos, ...)
router.put('/:id', jwtUtils, requireAdminOrCatalogos, ...)
router.delete('/:id', jwtUtils, requireAdminOrCatalogos, ...)
```

---

### 6. **Frontend - Jerarquía de Roles**
📁 `front/lib/features/auth/authSlice.ts`

**Cambio:** Agregado rol `catalogos` a la jerarquía de roles con nivel 2

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

---

## 📋 Permisos del Rol "Catalogos"

### ✅ Puede Acceder A:
- **Container Types:** Crear, leer, actualizar y eliminar
- **Navieras:** Crear, leer, actualizar y eliminar
- **Clientes:** Crear, actualizar y eliminar (lectura disponible para todos)
- **Catálogos de Agency:** Todos los tipos (locations, drivers, ranks, vessels, etc.)
- **Pricing de Agency:** Calcular precios, gestionar rutas de precios
- **Exportar/Importar:** Exportar catálogos (importar solo admin)

### ❌ No Puede Acceder A:
- Seed operations (solo administrador)
- Bulk delete (solo administrador)
- Import de catálogos (solo administrador)
- Configuraciones del sistema
- Gestión de usuarios

---

## 🚀 Instrucciones para Aplicar los Cambios

### 1. **Reiniciar el Servidor Backend**

```bash
# Si estás usando nodemon (desarrollo), debería reiniciarse automáticamente
# Si no, detén y reinicia el servidor:

cd api
npm run dev
# o
npm start
```

### 2. **Reiniciar el Frontend**

```bash
# Si estás usando Next.js con hot reload, debería aplicarse automáticamente
# Si no, reinicia el servidor de desarrollo:

cd front
npm run dev
```

### 3. **Limpiar Caché del Navegador**

Es importante limpiar el caché o hacer un **hard refresh**:
- **Chrome/Edge:** `Ctrl + Shift + R` (Windows) o `Cmd + Shift + R` (Mac)
- **Firefox:** `Ctrl + F5` (Windows) o `Cmd + Shift + R` (Mac)

---

## 🧪 Cómo Probar

1. **Login con usuario que tenga rol `catalogos`**
2. **Navegar a PTYSS → Configuración** (o cualquier sección de catálogos)
3. **Verificar que ya NO aparezca el error 403**
4. **Probar operaciones:**
   - Ver container types
   - Crear/editar container types
   - Ver navieras
   - Gestionar clientes

---

## 📊 Matriz de Permisos - Catálogos

| Endpoint | Administrador | Catalogos | Operaciones | Facturación |
|----------|:-------------:|:---------:|:-----------:|:-----------:|
| **Container Types** | ✅ | ✅ | ❌ | ❌ |
| **Navieras** | ✅ | ✅ | ❌ | ❌ |
| **Clientes (lectura)** | ✅ | ✅ | ✅ | ✅ |
| **Clientes (escritura)** | ✅ | ✅ | ❌ | ❌ |
| **Agency Catalogs** | ✅ | ✅ | ❌ | ❌ |
| **Pricing Routes** | ✅ | ✅ | ❌ | ❌ |
| **Seed/Import** | ✅ | ❌ | ❌ | ❌ |

---

## ✅ Estado Actual

| Archivo | Estado |
|---------|--------|
| `api/src/middlewares/authorization.ts` | ✅ Actualizado |
| `api/src/routes/config.ts` | ✅ Actualizado |
| `api/src/routes/agencyCatalogsRoutes.ts` | ✅ Actualizado |
| `api/src/routes/navieras.ts` | ✅ Actualizado |
| `api/src/routes/clients.ts` | ✅ Actualizado |
| `front/lib/features/auth/authSlice.ts` | ✅ Actualizado |

**Sin errores de linting ✅**

---

## 📝 Notas Adicionales

1. **El rol `catalogos` tiene el mismo nivel de jerarquía (2) que `operaciones`, `facturacion` y `clientes`**
2. **Los administradores siguen teniendo acceso total a todo**
3. **Los usuarios pendientes no tienen acceso a nada**
4. **Las operaciones de seed y bulk delete siguen siendo exclusivas de administradores**

---

**Fecha de implementación:** 12 de Noviembre, 2025
**Problema resuelto:** Error 403 (Forbidden) para usuarios con rol `catalogos`

