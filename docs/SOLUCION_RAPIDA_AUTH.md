# 🚨 Solución Rápida: Usuario Atascado en "Verificando Autenticación"

## Si tu usuario tiene `modules` e `isActive: true` en la BD

El problema es que hay datos antiguos en localStorage o el backend no está respondiendo correctamente.

## ✅ SOLUCIÓN INMEDIATA (3 pasos)

### Paso 1: Limpiar Todo el localStorage

Abre la consola del navegador (F12) y ejecuta:

```javascript
// Limpieza completa
localStorage.clear()
sessionStorage.clear()

// Eliminar cookies
document.cookie.split(";").forEach(function(c) { 
  document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
});

// Recargar
location.reload()
```

### Paso 2: Ve a `/login` e Inicia Sesión Nuevamente

Después de limpiar, deberías ver la página de login limpia.

### Paso 3: Monitorear la Consola

Ahora con los logs mejorados, cuando intentes iniciar sesión verás en la consola:

```
🔐 AuthProvider - Current state: ...
🔍 verifyToken - Starting...
🔍 verifyToken - Token found, calling /api/user/reloadUser...
🔍 verifyToken - Response status: 200
✅ verifyToken - Response data: ...
✅ verifyToken - User loaded: ...
```

Si alguno de estos pasos falla, verás exactamente dónde está el problema.

---

## 🔧 Si Aún No Funciona

### Verificación en el Backend

1. **Verifica que el backend esté corriendo:**
   ```bash
   cd api
   npm run dev
   ```

2. **Prueba el endpoint manualmente:**
   
   En Postman o Thunder Client:
   ```
   POST http://localhost:3001/api/user/reloadUser
   Headers:
     Authorization: Bearer TU_TOKEN_AQUI
     Content-Type: application/json
   ```
   
   Para obtener el token, en la consola del navegador:
   ```javascript
   console.log(localStorage.getItem('token'))
   ```

3. **Revisa los logs del backend**
   
   Deberías ver:
   ```
   === JWT UTILS MIDDLEWARE ===
   Headers authorization: Bearer ...
   Token extraído: ...
   🔍 Buscando usuario en BD con mongoId: ...
   Usuario encontrado: SÍ
   ✅ req.user establecido: ...
   ```

---

## 🐛 Diagnóstico con Timeout

He agregado un timeout de 10 segundos. Si después de 10 segundos no hay respuesta:
- Se limpiará automáticamente el localStorage
- Te redirigirá a `/login`
- Verás en consola: `⏱️ AuthProvider - verifyToken timeout`

---

## 📊 Verificar tu Usuario en MongoDB

Ejecuta esto en MongoDB:

```javascript
db.users.findOne({ email: "TU_EMAIL@AQUI.com" })
```

Debe tener esta estructura:

```javascript
{
  _id: ObjectId("..."),
  email: "admin@empresa.com",
  username: "admin",
  fullName: "Admin",
  name: "Admin",
  lastName: "...",
  role: "administrador",
  modules: ["trucking", "shipchandler", "agency"],  // ✅ Debe tener esto
  isActive: true,                                     // ✅ Debe ser true
  password: "$2b$10$...",
  createdAt: ISODate("..."),
  updatedAt: ISODate("...")
}
```

---

## 🔄 Si Necesitas Crear Usuario Nuevo

Si todo lo demás falla:

1. **Limpia localStorage completamente** (Paso 1 arriba)
2. **Ve a `/register`**
3. **Crea un nuevo usuario**
4. **Actualiza manualmente en MongoDB:**
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
   )
   ```
5. **Inicia sesión con el nuevo usuario**

---

## 📝 Logs que Deberías Ver

### En el Navegador (Consola):
```
🔐 AuthProvider - Current state: { isAuthenticated: false, isLoading: false, ... }
🔐 AuthProvider - Checking localStorage: { hasToken: true, storedAuth: 'true', ... }
🔐 AuthProvider - Dispatching verifyToken...
🔍 verifyToken - Starting...
🔍 verifyToken - Token found, calling /api/user/reloadUser...
🔍 verifyToken - Response status: 200
✅ verifyToken - Response data: { code: 200, payload: { user: {...} } }
✅ verifyToken - User loaded: { id: '...', email: '...', role: 'administrador', modules: [...] }
✅ AuthProvider - verifyToken completed: { type: 'auth/verifyToken/fulfilled', ... }
```

### En el Backend (Terminal):
```
=== JWT UTILS MIDDLEWARE ===
Headers authorization: Bearer eyJhbGc...
Token extraído: eyJhbGc...
🔍 Decodificando token...
Token decodificado: { mongoId: '...' }
🔍 Buscando usuario en BD con mongoId: ...
Usuario encontrado: SÍ
✅ req.user establecido: { id: '...', email: '...', role: 'administrador', ... }
```

---

## 🎯 Checklist de Diagnóstico

- [ ] Backend está corriendo (`npm run dev` en carpeta `api/`)
- [ ] localStorage limpio (ejecutar script de limpieza)
- [ ] Usuario en MongoDB tiene `modules` array
- [ ] Usuario en MongoDB tiene `isActive: true`
- [ ] Usuario en MongoDB tiene `role: "administrador"`
- [ ] Consola del navegador muestra los logs de verifyToken
- [ ] Backend muestra logs de JWT middleware
- [ ] No hay errores 401 o 403 en la consola Network

---

## 💡 Qué se Mejoró en el Código

1. **AuthProvider** ahora tiene:
   - Timeout de 10 segundos para evitar quedar atascado
   - Mejor manejo de loading (solo cuando realmente está verificando)
   - Logs detallados en cada paso

2. **verifyToken** ahora tiene:
   - Logs exhaustivos en cada paso
   - Mejor manejo de errores
   - Limpieza automática de datos corruptos

3. **Backend (reloadUser)** ahora:
   - Mapea correctamente todos los campos del usuario
   - Asigna módulos automáticamente a admins sin módulos
   - Devuelve estructura consistente sin contraseña

---

## 🆘 Si Nada de Esto Funciona

Abre un issue con:
1. Logs completos de la consola del navegador
2. Logs completos del backend
3. Resultado de `db.users.findOne({ email: "TU_EMAIL" })` en MongoDB
4. Captura de pantalla de la Network tab (DevTools) mostrando la petición a `/api/user/reloadUser`

