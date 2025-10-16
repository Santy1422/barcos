# Solución: Usuario atascado en "Verificando autenticación"

## Problema
Tu usuario administrador existente se queda atascado en "Verificando autenticación" porque no tiene los campos nuevos del sistema de roles (`modules`, `isActive` actualizados).

## Solución Implementada

### 1. Controladores Actualizados ✅

Se actualizaron los controladores para manejar usuarios existentes:
- `api/src/controllers/usersControllers/login.ts`
- `api/src/controllers/usersControllers/reloadUser.ts`

Ahora automáticamente:
- Asignan valores por defecto a campos faltantes
- Si eres admin y no tienes módulos, te asignan todos automáticamente
- Devuelven solo los campos necesarios (sin contraseña)

### 2. Script de Migración Creado ✅

Archivo: `api/scripts/migrateExistingUsers.ts`

## Pasos para Resolver (OPCIÓN A - Recomendada)

### 1. Ejecutar el Script de Migración

Desde la carpeta `api/`:

```bash
# Opción 1: Con ts-node (si está instalado)
npx ts-node scripts/migrateExistingUsers.ts

# Opción 2: Compilar y ejecutar
npx tsc scripts/migrateExistingUsers.ts --esModuleInterop --skipLibCheck
node scripts/migrateExistingUsers.js
```

Este script:
- Conecta a tu base de datos
- Encuentra todos los usuarios
- Agrega campos faltantes (`modules`, `isActive`, `username`, `fullName`)
- Asigna todos los módulos a administradores
- Muestra un resumen de cambios

### 2. Limpiar localStorage del navegador

En el navegador donde intentas iniciar sesión:

```javascript
// Abrir consola del navegador (F12) y ejecutar:
localStorage.clear()
sessionStorage.clear()
location.reload()
```

O simplemente:
1. Abrir DevTools (F12)
2. Application → Storage → Clear site data
3. Recargar página

### 3. Iniciar Sesión Nuevamente

Ahora deberías poder iniciar sesión sin problemas.

## Pasos para Resolver (OPCIÓN B - Manual en MongoDB)

Si no puedes ejecutar el script, actualiza manualmente en MongoDB:

```javascript
// Conectar a MongoDB y ejecutar:

// Actualizar TODOS los usuarios para agregar campos faltantes
db.users.updateMany(
  {},
  {
    $set: {
      isActive: true
    }
  }
);

// Agregar modules a usuarios que no lo tienen
db.users.updateMany(
  { modules: { $exists: false } },
  { $set: { modules: [] } }
);

// Asignar todos los módulos a administradores
db.users.updateMany(
  { 
    role: "administrador",
    $or: [
      { modules: { $exists: false } },
      { modules: { $size: 0 } }
    ]
  },
  { 
    $set: { 
      modules: ["trucking", "shipchandler", "agency"],
      isActive: true 
    } 
  }
);

// Verificar tu usuario
db.users.findOne({ email: "TU_EMAIL_AQUI" });
```

## Pasos para Resolver (OPCIÓN C - Si todo lo demás falla)

### Crear nuevo usuario administrador:

1. Ir a la ruta `/register`
2. Crear un nuevo usuario
3. En MongoDB, actualizar manualmente ese usuario:

```javascript
db.users.updateOne(
  { email: "nuevo_admin@email.com" },
  {
    $set: {
      role: "administrador",
      modules: ["trucking", "shipchandler", "agency"],
      isActive: true
    }
  }
);
```

4. Limpiar localStorage
5. Iniciar sesión con el nuevo usuario

## Verificación

Después de aplicar cualquiera de las soluciones:

1. **Limpiar localStorage** del navegador
2. **Iniciar sesión**
3. Deberías ver el dashboard con todos los módulos en el sidebar
4. Puedes ir a `/usuarios` para gestionar otros usuarios

## ¿Por qué pasó esto?

El sistema de roles se actualizó pero tu usuario existente en la base de datos no tenía:
- Campo `modules` (array de módulos permitidos)
- Campo `isActive` configurado correctamente
- Campo `username` y `fullName` (opcionales pero útiles)

Los controladores ahora son "auto-sanadores" - si detectan un usuario antiguo, lo actualizan automáticamente. Pero necesitas:
1. Que los datos en la BD estén correctos
2. Limpiar el localStorage para que no use datos antiguos cacheados

## Soporte Adicional

Si después de estos pasos aún tienes problemas:

1. Revisa la consola del navegador (F12) para ver errores
2. Revisa los logs del backend para ver qué está fallando
3. Verifica que tu usuario en MongoDB tenga estos campos:
   ```javascript
   {
     role: "administrador",
     modules: ["trucking", "shipchandler", "agency"],
     isActive: true,
     username: "tu_usuario",
     email: "tu_email@dominio.com"
   }
   ```

## Estado Final Esperado

Después de la corrección, tu usuario debería verse así en la BD:

```javascript
{
  "_id": ObjectId("..."),
  "email": "admin@empresa.com",
  "username": "admin",
  "fullName": "Administrador",
  "name": "Administrador",
  "role": "administrador",
  "modules": ["trucking", "shipchandler", "agency"],
  "isActive": true,
  "password": "...", // hasheado
  "createdAt": ISODate("..."),
  "updatedAt": ISODate("...")
}
```

