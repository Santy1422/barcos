# Ocultar Precios para Rol Operaciones en PTYSS

## Objetivo

Los usuarios con rol "operaciones" (sin rol de facturación) no deben ver valores monetarios en el módulo PTYSS.

## Implementación

### Sistema de Permisos

Se agregó verificación de roles para determinar si un usuario puede ver precios:

```typescript
// Obtener usuario actual
const currentUser = useAppSelector(selectCurrentUser)

// Verificar si el usuario tiene SOLO rol de operaciones (no facturación ni admin)
const userRoles: UserRole[] = currentUser?.roles || (currentUser?.role ? [currentUser.role] : [])
const isOnlyOperations = userRoles.includes('operaciones') && !userRoles.includes('facturacion') && !userRoles.includes('administrador')
const canViewPrices = !isOnlyOperations // Solo ocultar precios si es SOLO operaciones
```

### Lógica de Permisos

| Rol(es) del Usuario | Puede Ver Precios |
|---------------------|-------------------|
| Solo "operaciones" | ❌ NO |
| "operaciones" + "facturación" | ✅ SÍ |
| Solo "facturación" | ✅ SÍ |
| "administrador" | ✅ SÍ |
| "administrador" + cualquier otro | ✅ SÍ |

## Cambios Realizados en PTYSS Upload

### Archivo: `front/components/ptyss/ptyss-upload.tsx`

#### 1. Imports Agregados
```typescript
import { selectCurrentUser, type UserRole } from "@/lib/features/auth/authSlice"
```

#### 2. Variables de Control
```typescript
const currentUser = useAppSelector(selectCurrentUser)
const userRoles: UserRole[] = currentUser?.roles || (currentUser?.role ? [currentUser.role] : [])
const isOnlyOperations = userRoles.includes('operaciones') && !userRoles.includes('facturacion') && !userRoles.includes('administrador')
const canViewPrices = !isOnlyOperations
```

#### 3. Elementos Ocultos Condicionalmente

##### A. Columna "Monto" en Lista de Registros Locales
✅ **Eliminada completamente** - No se muestra para ningún usuario

##### B. Precio en Selector de Rutas Locales (Modal)
```typescript
<SelectItem key={route._id} value={route._id}>
  <div className="flex flex-col">
    <span>{route.from} → {route.to}</span>
    {canViewPrices && (  // ✅ Oculto para solo-operaciones
      <span className="text-xs text-muted-foreground">
        ${routePrice.toFixed(2)} ({containerTypeLabel})
      </span>
    )}
  </div>
</SelectItem>
```

##### C. Precio en Información de Ruta Seleccionada (Modal)
```typescript
<div className="flex items-center justify-between">
  <div className="flex items-center gap-2">
    <span>Ruta seleccionada: {route.from} → {route.to}</span>
    <Badge>{route.clientName}</Badge>
    <Badge>{containerType}</Badge>
  </div>
  {canViewPrices && (  // ✅ Oculto para solo-operaciones
    <div className="text-sm font-bold text-blue-700">
      Precio: ${routePrice.toFixed(2)}
    </div>
  )}
</div>
```

##### D. Columna "Precio" en Vista Previa de Trasiego
```typescript
<TableHeader>
  <TableRow>
    <TableHead>Cliente PTG</TableHead>
    {/* ... otras columnas ... */}
    {canViewPrices && <TableHead>Precio</TableHead>}  // ✅ Oculto para solo-operaciones
    <TableHead>Match</TableHead>
  </TableRow>
</TableHeader>

<TableBody>
  {/* ... */}
  {canViewPrices && (  // ✅ Oculto para solo-operaciones
    <TableCell>
      {record.isMatched ? (
        <span className="font-medium text-green-600">
          ${record.matchedPrice?.toFixed(2)}
        </span>
      ) : (
        <span className="text-muted-foreground">-</span>
      )}
    </TableCell>
  )}
</TableBody>
```

##### E. Badge "con precio" en Vista Previa
```typescript
{canViewPrices ? (  // ✅ Texto diferente según permisos
  <Badge variant="outline" className="text-green-600 border-green-600">
    {matchedCount} con precio
  </Badge>
) : (
  <Badge variant="outline" className="text-green-600 border-green-600">
    {matchedCount} con match
  </Badge>
)}
```

##### F. Total en Vista Previa
```typescript
{canViewPrices && (  // ✅ Oculto para solo-operaciones
  <span className="ml-auto font-medium">
    Total: ${previewData.reduce((sum, record) => sum + (record.matchedPrice || 0), 0).toFixed(2)}
  </span>
)}
```

## Archivos Modificados

1. ✅ `front/components/ptyss/ptyss-upload.tsx`

## Estado Actual

✅ **COMPLETADO** para PTYSS Upload

### Elementos Ocultos para Usuario Solo-Operaciones:
- ✅ Columna "Monto" en registros locales (eliminada para todos)
- ✅ Precio en selector de rutas locales (modal crear/editar)
- ✅ Precio en información de ruta seleccionada (modal)
- ✅ Columna "Precio" en vista previa de trasiego
- ✅ Badge "con precio" → cambiado a "con match"
- ✅ Total de precios en vista previa

### Elementos Visibles para:
- ✅ Usuarios con rol "facturación" (con o sin otros roles)
- ✅ Usuarios con rol "administrador"
- ✅ Usuarios con "operaciones" + "facturación"

## Componentes Pendientes

Los siguientes componentes de PTYSS también muestran precios y podrían requerir el mismo tratamiento:

- [ ] `ptyss-config.tsx` - Configuración de rutas y precios
- [ ] `ptyss-prefactura.tsx` - Prefacturas con montos
- [ ] `ptyss-records.tsx` - Registros con precios
- [ ] `ptyss-history.tsx` - Historial con montos
- [ ] `ptyss-local-routes.tsx` - Rutas locales con precios

**Nota:** Si se requiere ocultar precios en estos componentes también, se debe aplicar el mismo patrón de verificación de permisos.

## Testing

### Caso 1: Usuario Solo Operaciones
- Email: operaciones@ejemplo.com
- Roles: ["operaciones"]
- Módulos: ["shipchandler"]
- **Resultado esperado:** ❌ NO ve precios en PTYSS Upload

### Caso 2: Usuario Operaciones + Facturación
- Email: mixed@ejemplo.com
- Roles: ["operaciones", "facturación"]
- Módulos: ["shipchandler"]
- **Resultado esperado:** ✅ SÍ ve precios en PTYSS Upload

### Caso 3: Usuario Solo Facturación
- Email: facturacion@ejemplo.com
- Roles: ["facturación"]
- Módulos: ["shipchandler"]
- **Resultado esperado:** ✅ SÍ ve precios en PTYSS Upload

### Caso 4: Usuario Administrador
- Email: admin@ejemplo.com
- Roles: ["administrador"]
- Módulos: ["shipchandler", "trucking", "agency"]
- **Resultado esperado:** ✅ SÍ ve precios en PTYSS Upload

