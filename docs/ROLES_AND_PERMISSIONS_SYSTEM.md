# Sistema de Gestión de Roles y Permisos

## Resumen

Se ha implementado un sistema completo de gestión de usuarios, roles y permisos por módulos. Los usuarios que se registran ahora quedan en estado "pendiente" hasta que un administrador les asigne roles y módulos.

## Roles Disponibles

1. **Pendiente** (`pendiente`)
   - Estado por defecto para usuarios nuevos
   - Sin acceso a ningún módulo
   - Cuenta inactiva hasta aprobación del administrador

2. **Facturación** (`facturacion`)
   - Nivel básico de permisos
   - Acceso solo a los módulos asignados por el administrador

3. **Operaciones** (`operaciones`)
   - Nivel intermedio de permisos
   - Acceso solo a los módulos asignados por el administrador

4. **Administrador** (`administrador`)
   - Acceso total al sistema
   - Acceso automático a todos los módulos
   - Puede gestionar usuarios, roles y permisos

## Módulos Disponibles

1. **PTG** (`trucking`)
2. **PTYSS** (`shipchandler`)
3. **Agency** (`agency`)

## Flujo de Trabajo

### 1. Registro de Usuario Nuevo

Cuando un usuario se registra:
- Se crea con rol `pendiente`
- No tiene módulos asignados
- Cuenta está inactiva (`isActive: false`)
- No puede acceder al sistema hasta ser activado

### 2. Activación por Administrador

El administrador debe:
1. Ir a la sección **Usuarios** (visible solo para administradores)
2. Editar el usuario pendiente
3. Asignar un rol apropiado (`facturacion`, `operaciones`, o `administrador`)
4. Seleccionar los módulos a los que tendrá acceso
5. Activar la cuenta (`isActive: true`)

### 3. Acceso del Usuario

Una vez activado y configurado:
- El usuario puede iniciar sesión
- Solo verá en el sidebar los módulos asignados
- Los administradores ven todos los módulos automáticamente

## Implementación Técnica

### Backend

#### Endpoints de Usuario

```
POST   /api/user/register         - Registro público (crea usuarios pendientes)
POST   /api/user/login             - Login
POST   /api/user/reloadUser        - Recargar datos del usuario [Autenticado]
GET    /api/user/all               - Obtener todos los usuarios [Admin]
PUT    /api/user/:userId           - Actualizar usuario [Admin]
DELETE /api/user/:userId           - Eliminar usuario [Admin]
```

#### Middlewares de Autorización

**Por Rol:**
- `requireAdmin` - Solo administradores
- `requireAdminOrOperations` - Administradores u operaciones
- `requireAnyRole` - Cualquier rol activo (excluyendo pendientes)

**Por Módulo:**
- `requireTruckingModule` - Requiere acceso a PTG
- `requireShipchandlerModule` - Requiere acceso a PTYSS
- `requireAgencyModule` - Requiere acceso a Agency

**Ejemplo de uso:**
```typescript
router.get('/services', 
  jwtUtils, 
  requireAgencyModule, 
  requireAdminOrOperations,
  catchedAsync(getAllAgencyServices)
);
```

#### Schema de Usuario

```typescript
{
  role: "administrador" | "operaciones" | "facturacion" | "pendiente",
  modules: ["trucking", "shipchandler", "agency"], // Array de módulos
  isActive: boolean,
  username: string,
  fullName: string,
  email: string,
  // ... otros campos
}
```

### Frontend

#### Componentes de Protección

**AuthGuard** - Protege rutas por autenticación y rol
```tsx
<AuthGuard requiredRole="administrador">
  <AdminContent />
</AuthGuard>
```

**ModuleGuard** - Protege rutas por acceso a módulo
```tsx
<ModuleGuard requiredModule="agency">
  <AgencyContent />
</ModuleGuard>
```

#### Funciones de Verificación

**hasPermission(user, requiredRole)** - Verifica si el usuario tiene el rol requerido o superior
```typescript
if (hasPermission(currentUser, 'administrador')) {
  // Mostrar opciones de admin
}
```

**hasModuleAccess(user, module)** - Verifica si el usuario tiene acceso al módulo
```typescript
if (hasModuleAccess(currentUser, 'trucking')) {
  // Mostrar sección PTG
}
```

#### Sidebar Dinámico

El sidebar muestra solo los módulos a los que el usuario tiene acceso:
- Los administradores ven todos los módulos
- Los demás usuarios solo ven sus módulos asignados
- La sección "Usuarios" solo es visible para administradores

#### Interfaz de Gestión de Usuarios

Ubicación: `/usuarios` (solo administradores)

Características:
- Lista de todos los usuarios con:
  - Usuario, Nombre, Email
  - Rol con badge de color
  - Módulos asignados con badges
  - Estado (Activo/Inactivo)
  - Último acceso
  - Acciones (Editar, Activar/Desactivar, Eliminar)

- Formulario de edición:
  - Asignar/cambiar rol
  - Seleccionar módulos (checkboxes)
  - Activar/desactivar usuario
  - Nota: Los administradores tienen acceso a todos los módulos automáticamente

## Jerarquía de Roles

```
Administrador (nivel 3)
    ↓
Operaciones (nivel 2)
    ↓
Facturación (nivel 1)
    ↓
Pendiente (nivel 0)
```

## Reglas de Seguridad

1. **Usuarios pendientes:**
   - No pueden acceder a ningún endpoint protegido
   - No pueden iniciar sesión efectivamente (bloqueados en middleware)

2. **Administradores:**
   - No pueden eliminarse a sí mismos
   - No pueden desactivarse a sí mismos
   - Tienen acceso automático a todos los módulos

3. **Control de acceso por módulo:**
   - Se valida tanto en frontend (UI) como en backend (API)
   - Los administradores siempre tienen acceso
   - Los demás usuarios solo acceden a sus módulos asignados

## Migraciones Necesarias

Si tienes usuarios existentes en la base de datos, necesitas:

1. **Actualizar usuarios existentes:**
```javascript
// Agregar el campo modules a usuarios que no lo tienen
db.users.updateMany(
  { modules: { $exists: false } },
  { $set: { modules: ['trucking', 'shipchandler', 'agency'] } }
);

// Actualizar usuarios con rol no válido
db.users.updateMany(
  { role: { $nin: ['administrador', 'operaciones', 'facturacion', 'pendiente'] } },
  { $set: { role: 'pendiente' } }
);
```

## Testing

### Casos de Prueba Recomendados

1. **Registro:**
   - ✓ Nuevo usuario se crea con rol "pendiente"
   - ✓ Usuario pendiente no puede acceder al sistema

2. **Gestión de Usuarios (Admin):**
   - ✓ Admin puede ver todos los usuarios
   - ✓ Admin puede editar roles y módulos
   - ✓ Admin puede activar/desactivar usuarios
   - ✓ Admin no puede eliminarse a sí mismo

3. **Control de Acceso por Módulo:**
   - ✓ Usuario sin módulo "trucking" no ve PTG en sidebar
   - ✓ Usuario sin módulo "trucking" recibe 403 en endpoints de PTG
   - ✓ Administrador ve todos los módulos

4. **Control de Acceso por Rol:**
   - ✓ Usuario con rol "facturacion" no puede acceder a endpoints de admin
   - ✓ Usuario "pendiente" no puede acceder a ningún endpoint protegido

## Notas de Desarrollo

### Frontend

- Los tipos de `User`, `UserRole` y `UserModule` están definidos en `front/lib/features/auth/authSlice.ts`
- El estado de autenticación se maneja con Redux Toolkit
- Los usuarios se cargan automáticamente al abrir la sección de gestión

### Backend

- Los middlewares de autorización están en `api/src/middlewares/authorization.ts`
- El schema de usuarios está en `api/src/database/schemas/usersSchema.ts`
- Los controladores de usuarios están en `api/src/controllers/usersControllers/`

## Próximos Pasos Sugeridos

1. **Notificaciones:**
   - Email al usuario cuando es activado
   - Email al admin cuando hay usuarios pendientes

2. **Auditoría:**
   - Log de cambios de roles y permisos
   - Historial de accesos por usuario

3. **UI Mejorada:**
   - Dashboard para usuarios pendientes con mensaje informativo
   - Indicador visual de usuarios pendientes para admins

4. **Permisos Granulares:**
   - Permisos específicos por acción dentro de cada módulo
   - Permisos de lectura vs escritura

