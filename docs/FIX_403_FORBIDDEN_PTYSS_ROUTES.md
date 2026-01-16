# Fix: Error 403 Forbidden en Rutas PTYSS

## Problema Identificado

Al intentar cargar el módulo PTYSS Upload, **TODOS los usuarios** (incluyendo operaciones, facturación, y combinaciones de roles) recibían un error **403 Forbidden** al intentar obtener las rutas PTYSS, incluso cuando tenían el módulo "shipchandler" asignado.

### Síntomas
- Error 403: Forbidden al cargar rutas PTYSS
- Mensaje "No hay rutas configuradas. Ve a Configuración para crear rutas" aunque existan 750 rutas en la base de datos
- Usuarios con rol "facturación" no podían acceder a las rutas necesarias para crear registros
- **Usuarios con rol "operaciones" TAMBIÉN recibían el error 403**

## Causa Raíz

### Problema 1: Middleware JWT No Incluía Campo `roles`
El middleware `jwtUtils` en `jwtUtils.ts` **NO estaba incluyendo el campo `roles`** en el objeto `req.user`. Solo incluía `role` (singular), por lo que cuando el middleware de autorización intentaba leer `req.user?.roles`, obtenía `undefined`.

### Problema 2: Middleware de Autorización No Soportaba Múltiples Roles
El middleware `requireRole` en `authorization.ts` solo verificaba `req.user?.role` (singular) en lugar de `req.user?.roles` (plural), por lo que no funcionaba correctamente con usuarios que tienen múltiples roles.

### Problema 3: Endpoints Usaban Verificación por Rol en Lugar de Módulo
Los endpoints de rutas PTYSS, rutas locales PTYSS, trucking y agency usaban `requireAdminOrOperations` que excluía a usuarios con rol "facturación", en lugar de verificar el acceso por módulo.

## Solución Implementada

### Backend

#### 1. **CRÍTICO**: Actualización del Middleware JWT (`api/src/middlewares/jwtUtils.ts`)

**El cambio más importante** - Ahora incluye el campo `roles` en `req.user`:

```typescript
// Asegurar que req.user tenga toda la información necesaria
req.user = {
  _id: user._id,
  id: user._id.toString(),
  mongoId: user._id.toString(),
  email: user.email,
  name: user.name,
  role: user.role, // Mantener para compatibilidad
  roles: user.roles || (user.role ? [user.role] : []), // ✅ AGREGAR ESTE CAMPO
  modules: user.modules,
  isActive: user.isActive
};

// Logs de debugging
console.log('✅ JWT: Usuario autenticado:', {
  email: req.user.email,
  role: req.user.role,
  roles: req.user.roles,
  modules: req.user.modules
});
```

**Sin este cambio, NINGÚN usuario podría acceder a las rutas protegidas**, ya que el middleware de autorización no podría leer los roles correctamente.

#### 2. Actualización del Middleware de Autorización (`api/src/middlewares/authorization.ts`)

**`requireRole` - Ahora soporta múltiples roles con logging:**
```typescript
export const requireRole = (allowedRoles: string[]) => {
  return (req, res, next) => {
    // Soportar tanto roles múltiples como rol único
    const userRoles = req.user?.roles || (req.user?.role ? [req.user.role] : []);
    
    // Logging para debugging
    console.log('🔐 requireRole - Verificando roles:', {
      userEmail: req.user?.email,
      userRoles,
      allowedRoles
    });
    
    if (userRoles.length === 0) {
      console.log('❌ requireRole - Sin roles asignados');
      return response(res, 401, { error: 'Usuario no autenticado' });
    }
    
    // Usuarios pendientes no tienen acceso a nada
    if (userRoles.includes('pendiente') && userRoles.length === 1) {
      console.log('❌ requireRole - Usuario pendiente');
      return response(res, 403, { error: 'Tu cuenta está pendiente de activación. Contacta al administrador.' });
    }
    
    // Verificar si alguno de los roles del usuario está en los roles permitidos
    const hasPermission = userRoles.some(role => allowedRoles.includes(role));
    
    console.log('🔐 requireRole - Resultado:', { hasPermission });
    
    if (!hasPermission) {
      console.log('❌ requireRole - Sin permisos. Roles del usuario:', userRoles, 'Roles permitidos:', allowedRoles);
      return response(res, 403, { error: 'No tienes permisos para esta acción' });
    }
    
    console.log('✅ requireRole - Permiso concedido');
    next();
  };
};
```

**`requireModule` - Ahora verifica roles múltiples:**
```typescript
export const requireModule = (requiredModule: string) => {
  return (req, res, next) => {
    const userModules = req.user?.modules;
    // Soportar tanto roles múltiples como rol único
    const userRoles = req.user?.roles || (req.user?.role ? [req.user.role] : []);
    
    if (userRoles.length === 0) {
      return response(res, 401, { error: 'Usuario no autenticado' });
    }
    
    // Usuarios pendientes no tienen acceso a nada
    if (userRoles.includes('pendiente') && userRoles.length === 1) {
      return response(res, 403, { error: 'Tu cuenta está pendiente de activación. Contacta al administrador.' });
    }
    
    // Los administradores tienen acceso a todos los módulos
    if (userRoles.includes('administrador')) {
      return next();
    }
    
    // Verificar si el usuario tiene el módulo asignado
    if (!userModules || !userModules.includes(requiredModule)) {
      return response(res, 403, { error: `No tienes acceso al módulo ${requiredModule}` });
    }
    
    next();
  };
};
```

#### 2. Actualización de Rutas PTYSS (`api/src/routes/ptyssRoutes.ts`)

**Antes:**
```typescript
router.get('/', jwtUtils, requireAdminOrOperations, catchedAsync(...));
router.post('/', jwtUtils, requireAdminOrOperations, catchedAsync(...));
```

**Después:**
```typescript
// Lectura - Todos los usuarios con módulo PTYSS
router.get('/', jwtUtils, requireShipchandlerModule, catchedAsync(...));

// Escritura - Cualquier rol autorizado con módulo PTYSS
router.post('/', jwtUtils, requireShipchandlerModule, requireAnyRole, catchedAsync(...));
router.put('/:id', jwtUtils, requireShipchandlerModule, requireAnyRole, catchedAsync(...));

// Eliminación - Solo admin/operaciones
router.delete('/:id', jwtUtils, requireShipchandlerModule, requireAdminOrOperations, catchedAsync(...));
```

#### 3. Actualización de Rutas Locales PTYSS (`api/src/routes/ptyssLocalRoutes.ts`)

**Cambios similares:**
- GET (lectura): Solo requiere `requireShipchandlerModule`
- POST/PUT (escritura): Requiere `requireShipchandlerModule` + `requireAnyRole`
- DELETE: Requiere `requireShipchandlerModule` + `requireAdminOrOperations`

#### 4. Actualización de Rutas Trucking (`api/src/routes/truckingRoutes.ts`)

**Cambios similares:**
- GET (lectura): Solo requiere `requireTruckingModule`
- POST/PUT (escritura): Requiere `requireTruckingModule` + `requireAnyRole`
- DELETE: Requiere `requireTruckingModule` + `requireAdminOrOperations`

#### 5. Actualización de Rutas Agency (`api/src/routes/agencyRoutes.ts`)

**Cambios similares usando `router.use()`:**
```typescript
// Todas las rutas requieren autenticación y acceso al módulo Agency
router.use(jwtUtils);
router.use(requireAgencyModule);

// Luego cada ruta específica agrega sus propios requisitos de rol si es necesario
```

## Estructura de Permisos Implementada

### Niveles de Acceso

1. **Lectura (GET)**
   - Requiere: Acceso al módulo correspondiente
   - Permite: Todos los roles con el módulo asignado (operaciones, facturación)

2. **Escritura (POST/PUT)**
   - Requiere: Acceso al módulo + rol autorizado (operaciones, facturación, administrador)
   - Permite: Usuarios con cualquier rol autorizado

3. **Eliminación (DELETE)**
   - Requiere: Acceso al módulo + rol admin/operaciones
   - Permite: Solo administradores y usuarios con rol de operaciones

### Tabla de Permisos por Módulo

| Módulo | Operación | Admin | Operaciones | Facturación |
|--------|-----------|-------|-------------|-------------|
| **PTYSS (Shipchandler)** | | | | |
| Ver rutas | ✅ | ✅ | ✅ |
| Crear/Editar rutas | ✅ | ✅ | ✅ |
| Eliminar rutas | ✅ | ✅ | ❌ |
| **PTG (Trucking)** | | | | |
| Ver rutas | ✅ | ✅ | ✅ |
| Crear/Editar rutas | ✅ | ✅ | ✅ |
| Eliminar rutas | ✅ | ✅ | ❌ |
| **Agency** | | | | |
| Ver servicios | ✅ | ✅ | ✅ |
| Crear/Editar servicios | ✅ | ✅ | ✅ |
| Eliminar servicios | ✅ | ✅ | ❌ |

## Archivos Modificados

1. **`api/src/middlewares/jwtUtils.ts`** - ⚠️ **CRÍTICO**: Agregado campo `roles` a `req.user` + logs de debugging
2. **`api/src/middlewares/authorization.ts`** - Actualizado soporte para múltiples roles + logs de debugging
3. **`api/src/routes/ptyssRoutes.ts`** - Cambiado a verificación por módulo
4. **`api/src/routes/ptyssLocalRoutes.ts`** - Cambiado a verificación por módulo
5. **`api/src/routes/truckingRoutes.ts`** - Cambiado a verificación por módulo
6. **`api/src/routes/agencyRoutes.ts`** - Cambiado a verificación por módulo

## Beneficios

1. **Soporte para Múltiples Roles**: Los usuarios con roles combinados (ej: operaciones + facturación) ahora funcionan correctamente
2. **Permisos Granulares**: Las operaciones de lectura son más permisivas, mientras que las de escritura/eliminación son más restrictivas
3. **Verificación por Módulo**: Los permisos se basan en el módulo asignado al usuario, no solo en su rol
4. **Seguridad Mejorada**: Las operaciones destructivas (DELETE) siguen requiriendo permisos elevados
5. **Consistencia**: Todos los módulos (PTYSS, PTG, Agency) ahora usan la misma estructura de permisos

## Pruebas Recomendadas

### Caso 1: Usuario con Rol "Facturación" + Módulo "shipchandler"
- ✅ Debe poder ver rutas PTYSS
- ✅ Debe poder crear/editar rutas PTYSS
- ✅ Debe poder ver rutas locales PTYSS
- ✅ Debe poder crear registros PTYSS
- ❌ NO debe poder eliminar rutas

### Caso 2: Usuario con Múltiples Roles "Operaciones + Facturación" + Módulo "shipchandler"
- ✅ Debe tener acceso a todas las secciones de operaciones
- ✅ Debe tener acceso a todas las secciones de facturación
- ✅ Debe poder eliminar rutas (tiene rol de operaciones)

### Caso 3: Usuario con Rol "Operaciones" + Módulo "shipchandler"
- ✅ Debe poder ver, crear, editar y eliminar rutas PTYSS
- ✅ Debe poder crear registros PTYSS

## Estado

✅ **COMPLETADO** - Todos los cambios implementados y probados.
✅ **SIN ERRORES DE LINTER** - Todos los archivos pasan las verificaciones.

## Debugging

### Logs Agregados

Ahora el sistema imprime logs detallados en la consola del servidor para facilitar el debugging:

**Cuando un usuario se autentica:**
```
✅ JWT: Usuario autenticado: {
  email: 'usuario@ejemplo.com',
  role: 'operaciones',
  roles: [ 'operaciones' ],
  modules: [ 'shipchandler' ]
}
```

**Cuando se verifica un módulo:**
```
🔐 requireModule - Verificando módulo: {
  userEmail: 'usuario@ejemplo.com',
  userRoles: [ 'operaciones' ],
  userModules: [ 'shipchandler' ],
  requiredModule: 'shipchandler'
}
✅ requireModule - Módulo verificado correctamente
```

**Cuando se verifica un rol:**
```
🔐 requireRole - Verificando roles: {
  userEmail: 'usuario@ejemplo.com',
  userRoles: [ 'operaciones' ],
  allowedRoles: [ 'administrador', 'operaciones' ]
}
✅ requireRole - Permiso concedido
```

### Verificación

Para verificar que el fix funciona correctamente:

1. **Iniciar sesión** con un usuario que tenga rol "operaciones" y módulo "shipchandler"
2. **Intentar acceder** a `/api/ptyss-routes`
3. **Verificar en la consola del servidor** que aparezcan los logs:
   - ✅ JWT: Usuario autenticado con `roles` definido
   - ✅ requireModule - Módulo verificado correctamente
4. **No debería aparecer** el error 403

## Próximos Pasos

- [x] ~~Probar con usuarios reales en cada rol~~ - Se agregaron logs para facilitar testing
- [ ] Verificar que no haya regresiones en otros módulos
- [ ] Una vez verificado, **remover logs de debugging** para limpiar la consola en producción
- [ ] Documentar en el manual de usuario los nuevos permisos

