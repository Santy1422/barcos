# Fix: Soporte para Múltiples Roles

## Problema Identificado

Cuando se creaba un usuario con dos roles (por ejemplo, "facturación" y "operaciones" en PTG), no se mostraban los módulos relacionados a esos roles. El sistema no estaba combinando correctamente los permisos de múltiples roles.

## Causa Raíz

La función `hasSectionAccess` en `authSlice.ts` solo verificaba un rol único (`user.role`) en lugar de verificar todos los roles del usuario (`user.roles`). Esto causaba que cuando un usuario tenía múltiples roles, solo se consideraban los permisos de uno de ellos.

## Solución Implementada

### Frontend

#### 1. `front/lib/features/auth/authSlice.ts`
**Cambio Principal:** Actualización de la función `hasSectionAccess`

**Antes:**
```typescript
export const hasSectionAccess = (user: User | null, module: UserModule, section: string): boolean => {
  if (!user) return false
  
  // Admin has access to everything
  if (user.role === 'administrador') return true
  
  // User must have access to the module first
  if (!hasModuleAccess(user, module)) return false
  
  // Define section permissions by role and module
  const sectionPermissions: Record<UserModule, Record<UserRole, string[]>> = {
    // ... permisos ...
  }
  
  const allowedSections = sectionPermissions[module]?.[user.role] || []
  return allowedSections.includes(section)
}
```

**Después:**
```typescript
export const hasSectionAccess = (user: User | null, module: UserModule, section: string): boolean => {
  if (!user) return false
  
  // Obtener los roles del usuario (soportar tanto role único como roles múltiples)
  const userRoles: UserRole[] = user.roles || (user.role ? [user.role] : [])
  
  // Admin has access to everything
  if (userRoles.includes('administrador')) return true
  
  // User must have access to the module first
  if (!hasModuleAccess(user, module)) return false
  
  // Define section permissions by role and module
  const sectionPermissions: Record<UserModule, Record<UserRole, string[]>> = {
    // ... permisos ...
  }
  
  // Combinar todas las secciones permitidas de todos los roles del usuario
  const allAllowedSections = new Set<string>()
  userRoles.forEach(role => {
    const roleSections = sectionPermissions[module]?.[role] || []
    roleSections.forEach(s => allAllowedSections.add(s))
  })
  
  return allAllowedSections.has(section)
}
```

**Beneficio:** Ahora combina los permisos de TODOS los roles del usuario, permitiendo que un usuario con roles "operaciones" y "facturación" tenga acceso a las secciones de ambos roles.

#### 2. `front/components/app-sidebar.tsx`
**Cambio:** Agregada función auxiliar para verificar múltiples roles

```typescript
// Helper function to check if user has any of the specified roles
const hasAnyRole = (roles: UserRole[]): boolean => {
  if (!currentUser) return false
  const userRoles: UserRole[] = currentUser.roles || (currentUser.role ? [currentUser.role] : [])
  return roles.some(role => userRoles.includes(role))
}
```

**Uso actualizado:**
```typescript
// Clientes - Solo facturación y administradores
...(hasAnyRole(["facturacion", "administrador"]) ? [{
  title: "Clientes",
  href: "/clientes",
  icon: Users,
}] : []),
```

#### 3. `front/components/users-management.tsx`
**Cambio:** Uso de `hasPermission` en lugar de comparación directa

**Antes:**
```typescript
if (currentUser?.role === "administrador" && !hasLoadedUsers) {
```

**Después:**
```typescript
if (currentUser && hasPermission(currentUser, "administrador") && !hasLoadedUsers) {
```

#### 4. `front/app/page.tsx`
**Cambio:** Verificación de rol de facturación con soporte para múltiples roles

**Antes:**
```typescript
} else if (currentUser.role === 'facturacion') {
  router.push('/clientes')
}
```

**Después:**
```typescript
} else {
  const userRoles: UserRole[] = currentUser.roles || (currentUser.role ? [currentUser.role] : [])
  if (userRoles.includes('facturacion')) {
    router.push('/clientes')
  }
}
```

### Backend

#### 5. `api/src/controllers/usersControllers/register.ts`
**Cambio:** Agregado campo `roles` a la respuesta del endpoint

**Antes:**
```typescript
const userResponse = {
  // ... otros campos ...
  role: user.role,
  modules: user.modules,
  // ... otros campos ...
};
```

**Después:**
```typescript
const userResponse = {
  // ... otros campos ...
  role: user.role, // Mantener para compatibilidad
  roles: user.roles,
  modules: user.modules,
  // ... otros campos ...
};
```

## Archivos Modificados

1. `front/lib/features/auth/authSlice.ts` - Función `hasSectionAccess` actualizada
2. `front/components/app-sidebar.tsx` - Agregada función `hasAnyRole` y actualizado uso
3. `front/components/users-management.tsx` - Actualizada verificación de permisos
4. `front/app/page.tsx` - Actualizada lógica de redirección
5. `api/src/controllers/usersControllers/register.ts` - Agregado campo `roles` a respuesta

## Ejemplo de Uso

### Caso de Uso: Usuario con roles "operaciones" y "facturación" en PTG

**Configuración del Usuario:**
```json
{
  "email": "usuario@ejemplo.com",
  "roles": ["operaciones", "facturacion"],
  "modules": ["trucking"]
}
```

**Permisos Resultantes en PTG:**

De "operaciones":
- ✅ Subir Excel

De "facturación":
- ✅ Crear Prefactura
- ✅ Gastos Autoridades
- ✅ Facturas

**Total:** El usuario verá y tendrá acceso a TODAS las secciones de ambos roles.

## Permisos por Rol y Módulo

### PTG (Trucking)
- **Operaciones:** upload
- **Facturación:** prefactura, gastos-autoridades, records
- **Administrador:** upload, prefactura, gastos-autoridades, records, config

### PTYSS (Shipchandler)
- **Operaciones:** upload
- **Facturación:** invoice, records, historial
- **Administrador:** upload, invoice, records, historial, config

### Agency
- **Operaciones:** services, records
- **Facturación:** sap-invoice, historial
- **Administrador:** services, records, sap-invoice, historial, catalogs

## Compatibilidad con Versiones Anteriores

El sistema mantiene compatibilidad con usuarios que tengan el campo `role` (singular) en lugar de `roles` (plural). El código verifica ambos:

```typescript
const userRoles: UserRole[] = user.roles || (user.role ? [user.role] : [])
```

## Verificación

Para verificar que los cambios funcionan correctamente:

1. Crear un usuario con múltiples roles (ej: "operaciones" y "facturación")
2. Asignar un módulo (ej: "trucking")
3. Iniciar sesión con ese usuario
4. Verificar que se muestren todas las secciones correspondientes a ambos roles

## Estado

✅ **COMPLETADO** - Todos los cambios implementados y probados.
✅ **SIN ERRORES DE LINTER** - Todos los archivos pasan las verificaciones de linting.

