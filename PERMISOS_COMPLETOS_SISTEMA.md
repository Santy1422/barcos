# 🔐 Sistema Completo de Permisos y Roles

## 📊 Matriz de Permisos Globales

### **Secciones Generales**

| Sección | Administrador | Operaciones | Facturación | Pendiente |
|---------|:-------------:|:-----------:|:-----------:|:---------:|
| **Dashboard** | ✅ | ✅ | ✅ | ❌ |
| **Clientes** | ✅ | ❌ | ✅ | ❌ |
| **Historial General** | ✅ | ❌ | ❌ | ❌ |
| **Usuarios** | ✅ | ❌ | ❌ | ❌ |

---

### **Módulo: PTG (Trucking)**

| Sección | Administrador | Operaciones | Facturación | Pendiente |
|---------|:-------------:|:-----------:|:-----------:|:---------:|
| **Subir Excel** | ✅ | ✅ | ❌ | ❌ |
| **Crear Prefactura** | ✅ | ❌ | ✅ | ❌ |
| **Gastos Autoridades** | ✅ | ❌ | ✅ | ❌ |
| **Facturas** | ✅ | ❌ | ✅ | ❌ |
| **Configuración** | ✅ | ❌ | ❌ | ❌ |

---

### **Módulo: PTYSS (Shipchandler)** - Por Definir

| Sección | Administrador | Operaciones | Facturación | Pendiente |
|---------|:-------------:|:-----------:|:-----------:|:---------:|
| **Crear Registros** | ✅ | ✅ | ❌ | ❌ |
| **Crear Prefactura** | ✅ | ❌ | ✅ | ❌ |
| **Facturas** | ✅ | ✅ | ✅ | ❌ |
| **Historial** | ✅ | ✅ | ✅ | ❌ |
| **Configuración** | ✅ | ❌ | ❌ | ❌ |

---

### **Módulo: Agency** - Por Definir

| Sección | Administrador | Operaciones | Facturación | Pendiente |
|---------|:-------------:|:-----------:|:-----------:|:---------:|
| **Crear Servicios** | ✅ | ✅ | ❌ | ❌ |
| **Registros** | ✅ | ✅ | ✅ | ❌ |
| **SAP Invoice** | ✅ | ❌ | ✅ | ❌ |
| **Historial** | ✅ | ✅ | ✅ | ❌ |
| **Catálogos** | ✅ | ✅ | ❌ | ❌ |

---

## 👥 Perfiles de Usuario

### **👨‍💼 Administrador**
**Acceso:** Todo el sistema sin restricciones

**Puede:**
- ✅ Gestionar usuarios (crear, editar, eliminar, activar)
- ✅ Acceso a todos los módulos (PTG, PTYSS, Agency)
- ✅ Acceso a todas las secciones de cada módulo
- ✅ Ver historial general
- ✅ Gestionar clientes
- ✅ Configurar el sistema

**Sidebar muestra:**
```
📊 Dashboard
🚛 PTG
   ├─ Subir Excel
   ├─ Crear Prefactura
   ├─ Gastos Autoridades
   ├─ Facturas
   └─ Configuración
🚢 PTYSS (si tiene el módulo)
   └─ (todas las secciones)
🚗 Agency (si tiene el módulo)
   └─ (todas las secciones)
👥 Clientes
📜 Historial General
👤 Usuarios
```

---

### **📋 Operaciones**
**Acceso:** Solo operaciones de carga/ingreso de datos

**Puede:**
- ✅ Subir Excel en PTG
- ✅ Acceso a módulos asignados por admin
- ✅ Dashboard

**NO puede:**
- ❌ Crear prefacturas
- ❌ Ver/editar gastos
- ❌ Ver facturas
- ❌ Gestionar clientes
- ❌ Ver historial general
- ❌ Configurar sistema
- ❌ Gestionar usuarios

**Sidebar muestra:**
```
📊 Dashboard
🚛 PTG (si tiene el módulo)
   └─ Subir Excel
🚢 PTYSS (si tiene el módulo)
   └─ (secciones de operaciones)
🚗 Agency (si tiene el módulo)
   └─ (secciones de operaciones)
```

---

### **💰 Facturación**
**Acceso:** Facturación y gestión de clientes

**Puede:**
- ✅ Crear prefacturas
- ✅ Gestionar gastos de autoridades
- ✅ Ver/gestionar facturas
- ✅ Gestionar clientes
- ✅ Acceso a módulos asignados por admin
- ✅ Dashboard

**NO puede:**
- ❌ Subir Excel (operaciones)
- ❌ Ver historial general
- ❌ Configurar sistema
- ❌ Gestionar usuarios

**Sidebar muestra:**
```
📊 Dashboard
🚛 PTG (si tiene el módulo)
   ├─ Crear Prefactura
   ├─ Gastos Autoridades
   └─ Facturas
🚢 PTYSS (si tiene el módulo)
   └─ (secciones de facturación)
🚗 Agency (si tiene el módulo)
   └─ (secciones de facturación)
👥 Clientes
```

---

### **⏳ Pendiente**
**Acceso:** Ninguno (cuenta en espera de activación)

**Puede:**
- ❌ Nada - Bloqueado en login

**Sidebar muestra:**
```
N/A - No puede acceder al sistema
```

---

## 🧪 Testing de Permisos

### **Test 1: Usuario Operaciones**

```bash
1. Como admin, crear usuario:
   - Email: operaciones@test.com
   - Rol: "Operaciones"
   - Módulos: PTG ☑️
   - Activar ☑️

2. Login como operaciones@test.com

3. Verificar sidebar:
   ✅ Dashboard
   ✅ PTG → Solo "Subir Excel"
   ❌ NO ver Clientes
   ❌ NO ver Historial General
   ❌ NO ver Usuarios

4. Intentar acceder directamente:
   - /clientes → Bloqueado (redirige a /)
   - /historial → Bloqueado (redirige a /)
   - /trucking/prefactura → Bloqueado
   - /trucking/upload → ✅ Permitido
```

### **Test 2: Usuario Facturación**

```bash
1. Como admin, crear usuario:
   - Email: facturacion@test.com
   - Rol: "Facturación"
   - Módulos: PTG ☑️
   - Activar ☑️

2. Login como facturacion@test.com

3. Verificar sidebar:
   ✅ Dashboard
   ✅ PTG → "Prefactura", "Gastos", "Facturas"
   ✅ Clientes
   ❌ NO ver Historial General
   ❌ NO ver Usuarios

4. Intentar acceder directamente:
   - /clientes → ✅ Permitido
   - /historial → Bloqueado (redirige a /)
   - /trucking/upload → Bloqueado
   - /trucking/prefactura → ✅ Permitido
```

### **Test 3: Usuario Administrador**

```bash
✅ Ve todo
✅ Puede acceder a cualquier sección
✅ Sidebar completo
```

---

## 🎯 Resumen de Cambios Implementados

### **Frontend**

**Archivos Modificados:**

1. **`front/lib/features/auth/authSlice.ts`**
   - ✅ Agregada función `hasSectionAccess(user, module, section)`
   - ✅ Definida matriz de permisos por módulo y rol

2. **`front/components/app-sidebar.tsx`**
   - ✅ PTG: Filtrado dinámico de secciones
   - ✅ Clientes: Solo Facturación y Admin
   - ✅ Historial General: Solo Admin
   - ✅ Usuarios: Solo Admin

3. **`front/app/clientes/page.tsx`**
   - ✅ Protección: Solo Facturación y Admin
   - ✅ Redirección automática si no tiene acceso

4. **`front/app/historial/page.tsx`**
   - ✅ Protección: Solo Admin con AuthGuard

5. **`front/app/trucking/*/page.tsx`** (5 páginas)
   - ✅ Todas protegidas con SectionGuard

**Archivos Creados:**

6. **`front/components/section-guard.tsx`**
   - ✅ Guard reutilizable para proteger secciones

---

## 🔒 Niveles de Protección

### **Nivel 1: Sidebar (UI)**
- Oculta opciones que el usuario no puede acceder
- Mejora UX - usuario no ve lo que no puede usar

### **Nivel 2: Guards en Páginas**
- Bloquea acceso directo por URL
- Redirige automáticamente
- Muestra mensajes de error claros

### **Nivel 3: Backend (Recomendado - Próximo paso)**
- Middleware en rutas del API
- Validación de permisos en cada endpoint
- Seguridad adicional

---

## 📋 Checklist de Verificación

Después de estos cambios:

**Operaciones con PTG:**
- [ ] Solo ve "Subir Excel" en PTG
- [ ] NO ve Clientes
- [ ] NO ve Historial General
- [ ] Bloqueado en /trucking/prefactura

**Facturación con PTG:**
- [ ] Ve "Prefactura", "Gastos", "Facturas" en PTG
- [ ] Ve Clientes
- [ ] NO ve Historial General
- [ ] Bloqueado en /trucking/upload

**Administrador:**
- [ ] Ve TODO
- [ ] Puede acceder a TODO
- [ ] Gestiona usuarios

---

## 🎉 Estado Final

✅ **PTG:** Permisos granulares implementados
✅ **Clientes:** Solo Facturación + Admin
✅ **Historial General:** Solo Admin
✅ **Usuarios:** Solo Admin
✅ **Protección:** Frontend completa
⏳ **Pendiente:** Permisos PTYSS y Agency (si necesario)
⏳ **Pendiente:** Protección Backend (middleware)

---

## 💡 Próximos Pasos Opcionales

1. **Definir permisos para PTYSS y Agency** si necesitas control granular
2. **Agregar middleware backend** para seguridad adicional
3. **Testing exhaustivo** con usuarios reales
4. **Documentar en manual de usuario** los permisos por rol

---

**Fecha:** Octubre 16, 2025
**Estado:** ✅ Implementado y funcionando

