# Nuevo Rol: Administrar Clientes

## Resumen
Se ha agregado un nuevo rol llamado **"clientes"** (Administrar Clientes) al sistema para permitir gestionar clientes sin necesidad de tener rol de administrador.

## Cambios Implementados

### Backend (API)

#### Schema de Usuarios (`api/src/database/schemas/usersSchema.ts`)
- ✅ Agregado `"clientes"` al enum de roles
- ✅ Actualizado tanto el campo `role` como el array `roles` para incluir el nuevo rol

### Frontend

#### 1. Types (`front/lib/features/auth/authSlice.ts`)
- ✅ Agregado `'clientes'` al tipo `UserRole`
- ✅ Actualizado la jerarquía de permisos para incluir rol `'clientes'` con nivel 2

#### 2. Componente de Gestión de Usuarios (`front/components/users-management.tsx`)
- ✅ Agregada etiqueta "Administrar Clientes" para el rol clientes
- ✅ Agregado color secundario para el badge del rol

#### 3. Página de Clientes (`front/app/clientes/page.tsx`)
- ✅ Actualizado para permitir acceso con roles:
  - `'administrador'`
  - `'facturacion'`
  - **`'clientes'`** (NUEVO)

#### 4. Sidebar (`front/components/app-sidebar.tsx`)
- ✅ Actualizado el link "Clientes" para mostrarse a usuarios con rol `'clientes'`

## Roles del Sistema

Ahora el sistema tiene **5 roles**:

1. **administrador**: Acceso completo al sistema
2. **operaciones**: Crear registros en módulos asignados
3. **facturacion**: Crear prefacturas, facturas y gestionar clientes
4. **clientes**: Administrar clientes (agregar, editar, eliminar)
5. **pendiente**: Sin permisos (esperando activación)

## Permisos del Rol "clientes"

Los usuarios con rol "clientes" pueden:
- ✅ Ver la sección "Clientes" en el sidebar
- ✅ Acceder a la página `/clientes`
- ✅ Ver, crear, editar y eliminar clientes
- ❌ NO pueden acceder a:
  - Gestión de usuarios (`/usuarios`)
  - Configuración de módulos
  - Otros permisos de administrador

## Jerarquía de Roles

```
Nivel 3: administrador (acceso completo)
Nivel 2: operaciones, facturacion, clientes
Nivel 0: pendiente (sin permisos)
```

## Ejemplo de Usuario con Rol "clientes"

```typescript
{
  username: "gestor_clientes",
  fullName: "Juan Pérez",
  email: "juan.perez@empresa.com",
  roles: ["clientes"],  // Puede tener múltiples roles
  modules: ["trucking"],  // Acceso a módulo trucking
  isActive: true
}
```

## Uso en el Sistema

### Asignar Rol a un Usuario

**Desde la interfaz de gestión de usuarios:**
1. Ve a `/usuarios` (requiere rol administrador)
2. Crea o edita un usuario
3. En la sección "Roles de Usuario", activa el switch "Administrar Clientes"
4. El usuario ahora tiene acceso al módulo de clientes

**Desde la línea de comando (MongoDB):**
```javascript
// Actualizar un usuario existente para agregar el rol clientes
db.users.updateOne(
  { email: "juan.perez@empresa.com" },
  { $addToSet: { roles: "clientes" } }
)

// Crear un nuevo usuario con rol clientes
db.users.insertOne({
  username: "gestor_clientes",
  fullName: "Juan Pérez",
  name: "Juan",
  lastName: "Pérez",
  email: "juan.perez@empresa.com",
  password: "hashed_password",
  roles: ["clientes"],
  modules: ["trucking"],
  isActive: true
})
```

## Casos de Uso

### Caso 1: Personal de Facturación
Un usuario con rol `clientes` puede:
- Agregar nuevos clientes cuando procesen facturas
- Actualizar información de clientes existentes
- Ver todos los clientes del módulo asignado

### Caso 2: Personal de Operaciones
Un usuario con rol `clientes` y módulo `trucking` puede:
- Crear clientes desde la carga de Excel en Trucking
- Editar datos de clientes incompletos
- Asignar clientes a registros de trasiego

### Caso 3: Múltiples Roles
Un usuario puede tener varios roles simultáneamente:
```typescript
{
  roles: ["operaciones", "clientes"],
  modules: ["trucking"]
}
```
Este usuario puede:
- Crear registros de trasiego (operaciones)
- Gestionar clientes (clientes)
- Ambos dentro del módulo trucking

## Compatibilidad con Clientes por Módulo

El rol `clientes` funciona con el sistema de clientes por módulo:

- Un usuario con `modules: ["trucking"]` y `roles: ["clientes"]` solo verá clientes con `module` que incluya "trucking"
- Un usuario con `modules: ["trucking", "shipchandler"]` verá clientes de ambos módulos
- Los clientes pueden pertenecer a múltiples módulos: `module: ["ptyss", "trucking"]`

## Notas Importantes

1. **El rol "clientes" NO reemplaza a "facturacion"**: Son roles complementarios
2. **Los administradores SIEMPRE tienen acceso**: El rol administrador tiene acceso completo
3. **Módulos controlan visibilidad**: Los usuarios solo ven clientes de sus módulos asignados
4. **Puede combinarse con otros roles**: Un usuario puede tener `["operaciones", "clientes"]`

## Próximos Pasos (Opcional)

Si deseas agregar más permisos específicos para el rol "clientes":
1. Crear permisos más granulares en cada módulo
2. Permitir que usuarios con rol clientes solo vean clientes de ciertos módulos
3. Agregar límites de edición (solo editores, no eliminadores)
4. Implementar auditoría de cambios en clientes

