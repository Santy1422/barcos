# Implementación Frontend - Reset de Contraseña

## Descripción
Se ha implementado la funcionalidad de reset de contraseña en el frontend, permitiendo a los administradores resetear las contraseñas de los usuarios desde la interfaz de gestión de usuarios.

## Funcionalidades Implementadas

### 1. Async Thunk para Reset de Contraseña
- **Archivo**: `front/lib/features/auth/authSlice.ts`
- **Función**: `resetPasswordAsync`
- **Endpoint**: `PUT /api/user/reset-password/:userId`
- **Parámetros**: `{ userId: string, newPassword: string }`

### 2. Botón de Reset en la Tabla de Usuarios
- **Ubicación**: Columna de acciones en la tabla de usuarios
- **Icono**: `Key` de Lucide React
- **Tooltip**: "Resetear contraseña"
- **Acción**: Abre modal de confirmación

### 3. Modal de Confirmación
- **Componente**: Dialog con formulario de nueva contraseña
- **Validaciones**:
  - Contraseña mínima de 6 caracteres
  - Campo obligatorio
  - Botón deshabilitado hasta cumplir validaciones
- **Confirmación**: Muestra nombre de usuario y advertencia

### 4. Estados y Lógica
- **Estados agregados**:
  - `showResetPasswordDialog`: Control de visibilidad del modal
  - `userToResetPassword`: Usuario seleccionado para reset
  - `newPassword`: Nueva contraseña ingresada

## Flujo de Usuario

### 1. Acceso a la Funcionalidad
1. El administrador navega a la sección de gestión de usuarios
2. En la tabla de usuarios, cada fila tiene un botón con icono de llave (Key)
3. Al hacer clic, se abre el modal de confirmación

### 2. Proceso de Reset
1. **Modal de Confirmación**:
   - Muestra el nombre del usuario seleccionado
   - Advertencia sobre el cambio inmediato de contraseña
   - Campo para ingresar nueva contraseña
   - Validación en tiempo real (mínimo 6 caracteres)

2. **Validación**:
   - Contraseña debe tener al menos 6 caracteres
   - Botón "Resetear Contraseña" se habilita solo cuando se cumple la validación

3. **Confirmación**:
   - Al confirmar, se envía la petición al backend
   - Toast de éxito o error según el resultado
   - Modal se cierra automáticamente en caso de éxito

## Componentes Modificados

### 1. `front/lib/features/auth/authSlice.ts`
```typescript
export const resetPasswordAsync = createAsyncThunk(
  'auth/resetPassword',
  async ({ userId, newPassword }: { userId: string; newPassword: string }, { rejectWithValue, getState }) => {
    // Implementación del thunk
  }
)
```

### 2. `front/components/users-management.tsx`
- **Import agregado**: `resetPasswordAsync` y `Key` icon
- **Estados agregados**: Para control del modal y datos
- **Funciones agregadas**:
  - `handleResetPassword(user)`: Abre modal con usuario seleccionado
  - `confirmResetPassword()`: Ejecuta el reset de contraseña
- **UI agregada**:
  - Botón de reset en la tabla
  - Modal de confirmación completo

## Características de Seguridad

### 1. Validaciones del Frontend
- **Longitud mínima**: 6 caracteres
- **Campo obligatorio**: No se puede enviar vacío
- **Validación en tiempo real**: Botón deshabilitado hasta cumplir requisitos

### 2. Experiencia de Usuario
- **Confirmación explícita**: Modal con advertencia clara
- **Feedback visual**: Toast notifications para éxito/error
- **Información clara**: Muestra nombre del usuario afectado

### 3. Integración con Backend
- **Autenticación**: Usa token JWT del usuario logueado
- **Autorización**: Solo administradores pueden usar la funcionalidad
- **Manejo de errores**: Captura y muestra errores del backend

## Estructura del Modal

```tsx
<Dialog open={showResetPasswordDialog} onOpenChange={setShowResetPasswordDialog}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Resetear Contraseña</DialogTitle>
      <DialogDescription>
        Estás a punto de resetear la contraseña de {userToResetPassword?.username}.
        Esta acción cambiará la contraseña del usuario inmediatamente.
      </DialogDescription>
    </DialogHeader>
    
    <div className="space-y-4">
      <div>
        <Label htmlFor="newPassword">Nueva Contraseña</Label>
        <Input
          id="newPassword"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="Ingresa la nueva contraseña"
        />
        <p className="text-sm text-muted-foreground">
          La contraseña debe tener al menos 6 caracteres
        </p>
      </div>
    </div>
    
    <DialogFooter>
      <Button variant="outline" onClick={cancelReset}>
        Cancelar
      </Button>
      <Button 
        variant="destructive" 
        onClick={confirmResetPassword}
        disabled={!newPassword || newPassword.length < 6}
      >
        <Key className="mr-2 h-4 w-4" />
        Resetear Contraseña
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

## Integración Completa

### Backend + Frontend
1. **API Endpoint**: `PUT /api/user/reset-password/:userId`
2. **Frontend Thunk**: `resetPasswordAsync`
3. **UI Component**: Botón + Modal en gestión de usuarios
4. **Validaciones**: Frontend y backend
5. **Feedback**: Toast notifications

### Flujo Completo
1. Administrador hace clic en botón de reset
2. Se abre modal con validaciones
3. Al confirmar, se envía petición al backend
4. Backend valida permisos y resetea contraseña
5. Frontend muestra resultado con toast
6. Modal se cierra automáticamente

## Consideraciones de UX

1. **Confirmación explícita**: El modal requiere confirmación manual
2. **Información clara**: Muestra qué usuario será afectado
3. **Validación inmediata**: Feedback visual en tiempo real
4. **Manejo de errores**: Mensajes claros para el usuario
5. **Accesibilidad**: Labels y tooltips apropiados

La funcionalidad está completamente integrada y lista para uso en producción.
