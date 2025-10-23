# Implementación de Reset de Contraseña para Administradores

## Descripción
Se ha implementado la funcionalidad para que los administradores puedan resetear las contraseñas de los usuarios del sistema.

## Funcionalidades Implementadas

### 1. Controlador de Reset de Contraseña
- **Archivo**: `api/src/controllers/usersControllers/resetPassword.ts`
- **Funcionalidad**: Permite a los administradores resetear la contraseña de cualquier usuario
- **Validaciones**:
  - Solo administradores pueden usar esta funcionalidad
  - La nueva contraseña debe tener al menos 6 caracteres
  - Verificación de que el usuario existe

### 2. Endpoint API
- **Ruta**: `PUT /api/user/reset-password/:userId`
- **Método**: PUT
- **Autenticación**: Requerida (JWT)
- **Autorización**: Solo administradores
- **Parámetros**:
  - `userId`: ID del usuario cuya contraseña se va a resetear
- **Body**:
  ```json
  {
    "newPassword": "nuevaContraseña123"
  }
  ```

### 3. Respuesta Exitosa
```json
{
  "payload": {
    "message": "Contraseña reseteada correctamente",
    "user": {
      "id": "userId",
      "username": "username",
      "fullName": "Nombre Completo",
      "email": "email@example.com"
    }
  }
}
```

## Uso de la API

### Ejemplo con cURL
```bash
curl -X PUT "http://localhost:3001/api/user/reset-password/USER_ID" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"newPassword": "nuevaContraseña123"}'
```

### Ejemplo con JavaScript/Axios
```javascript
const response = await axios.put(
  'http://localhost:3001/api/user/reset-password/USER_ID',
  {
    newPassword: 'nuevaContraseña123'
  },
  {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  }
);
```

## Seguridad

### Validaciones Implementadas
1. **Autorización**: Solo usuarios con rol 'administrador' pueden resetear contraseñas
2. **Validación de contraseña**: Mínimo 6 caracteres
3. **Verificación de usuario**: Se valida que el usuario existe antes de proceder
4. **Hash seguro**: La nueva contraseña se hashea con bcrypt antes de guardarse

### Logs de Seguridad
- Se registra en consola cuando un administrador resetea una contraseña
- Incluye información del usuario afectado y del administrador que realizó la acción

## Archivos Modificados

1. **`api/src/controllers/usersControllers/resetPassword.ts`** - Nuevo controlador
2. **`api/src/controllers/usersControllers/usersControllers.ts`** - Agregado resetPassword
3. **`api/src/routes/user.ts`** - Nueva ruta PUT /reset-password/:userId

## Pruebas

Se incluye un script de prueba en `api/test-reset-password.js` que puede ser ejecutado para verificar la funcionalidad:

```bash
cd api
node test-reset-password.js
```

**Nota**: Antes de ejecutar las pruebas, actualizar las variables en el script:
- `ADMIN_EMAIL`: Email del administrador
- `ADMIN_PASSWORD`: Contraseña del administrador  
- `USER_TO_RESET_ID`: ID del usuario cuya contraseña se va a resetear

## Consideraciones

1. **Solo administradores**: Esta funcionalidad está restringida únicamente a usuarios con rol 'administrador'
2. **Contraseña temporal**: Se recomienda que el administrador comunique la nueva contraseña al usuario por un canal seguro
3. **Cambio obligatorio**: Se sugiere que el usuario cambie la contraseña en su próximo login
4. **Auditoría**: Los logs permiten rastrear qué administrador reseteó qué contraseña y cuándo

## Integración con Frontend

Para integrar esta funcionalidad en el frontend, se puede crear un botón "Resetear Contraseña" en la interfaz de administración de usuarios que:

1. Abra un modal solicitando la nueva contraseña
2. Valide que la contraseña tenga al menos 6 caracteres
3. Envíe la petición PUT al endpoint correspondiente
4. Muestre un mensaje de confirmación al administrador
