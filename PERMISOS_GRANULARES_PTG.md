# 🔐 Sistema de Permisos Granulares - Módulo PTG

## Resumen

Se ha implementado control de acceso granular dentro de cada módulo. Los usuarios ahora ven solo las secciones que su rol les permite acceder.

---

## 📊 Permisos por Rol - Módulo PTG (Trucking)

### **Administrador** 
✅ Acceso Total:
- Subir Excel
- Crear Prefactura
- Gastos Autoridades
- Facturas
- Configuración

### **Operaciones**
✅ Acceso Limitado:
- **Subir Excel** ← Solo esta sección

❌ No puede acceder:
- Crear Prefactura
- Gastos Autoridades
- Facturas
- Configuración

### **Facturación**
✅ Acceso Limitado:
- **Crear Prefactura**
- **Gastos Autoridades**
- **Facturas**

❌ No puede acceder:
- Subir Excel
- Configuración

---

## 🎯 Implementación Técnica

### **1. Función Helper - `hasSectionAccess`**

**Archivo:** `front/lib/features/auth/authSlice.ts`

```typescript
export const hasSectionAccess = (
  user: User | null, 
  module: UserModule, 
  section: string
): boolean => {
  if (!user) return false
  if (user.role === 'administrador') return true
  if (!hasModuleAccess(user, module)) return false
  
  const sectionPermissions = {
    trucking: {
      'operaciones': ['upload'],
      'facturacion': ['prefactura', 'gastos-autoridades', 'records']
    },
    // ... otros módulos
  }
  
  const allowedSections = sectionPermissions[module]?.[user.role] || []
  return allowedSections.includes(section)
}
```

### **2. Sidebar Dinámico**

**Archivo:** `front/components/app-sidebar.tsx`

El sidebar ahora filtra las subsecciones según el rol:

```typescript
// PTG module con secciones filtradas
...(hasModuleAccess(currentUser, "trucking") ? [{
  title: "PTG",
  children: [
    // Solo muestra si tiene acceso
    ...(hasSectionAccess(currentUser, "trucking", "upload") ? [
      { title: "Subir Excel", href: "/trucking/upload" }
    ] : []),
    // ... etc
  ]
}] : [])
```

### **3. SectionGuard Component**

**Archivo:** `front/components/section-guard.tsx`

Componente para proteger páginas individuales:

```tsx
<SectionGuard module="trucking" section="upload">
  <UploadContent />
</SectionGuard>
```

---

## 🎨 Resultado en la UI

### **Usuario "Operaciones" con módulo PTG:**

Sidebar muestra:
```
Dashboard
└─ PTG
   └─ Subir Excel    ← Solo esto
Clientes
Historial General
```

### **Usuario "Facturación" con módulo PTG:**

Sidebar muestra:
```
Dashboard
└─ PTG
   ├─ Crear Prefactura
   ├─ Gastos Autoridades
   └─ Facturas
Clientes
Historial General
```

### **Usuario "Administrador" con módulo PTG:**

Sidebar muestra:
```
Dashboard
└─ PTG
   ├─ Subir Excel
   ├─ Crear Prefactura
   ├─ Gastos Autoridades
   ├─ Facturas
   └─ Configuración
Clientes
Historial General
Usuarios
```

---

## 🧪 Testing - Permisos PTG

### **Test 1: Usuario Operaciones**

1. Crear usuario de prueba
2. Como admin, asignar:
   - Rol: "Operaciones"
   - Módulos: PTG ☑️
3. Login con ese usuario
4. **Verificar sidebar:**
   - ✅ Solo ve "Subir Excel" en PTG
   - ❌ No ve otras secciones

### **Test 2: Usuario Facturación**

1. Crear usuario de prueba
2. Como admin, asignar:
   - Rol: "Facturación"
   - Módulos: PTG ☑️
3. Login con ese usuario
4. **Verificar sidebar:**
   - ✅ Ve "Crear Prefactura"
   - ✅ Ve "Gastos Autoridades"
   - ✅ Ve "Facturas"
   - ❌ No ve "Subir Excel"
   - ❌ No ve "Configuración"

### **Test 3: Acceso Directo por URL**

1. Como usuario "Operaciones"
2. Intentar acceder directamente a:
   - `/trucking/prefactura` → Debe bloquear
   - `/trucking/upload` → Debe permitir

---

## 🔒 Protección Backend (Próximo Paso)

Para proteger completamente, también debes agregar middleware en el backend:

**Ejemplo:** `api/src/routes/truckingRoutes.ts`

```typescript
import { requireRole, requireModule } from '../middlewares/authorization';

// Solo operaciones puede subir excel
router.post('/upload', 
  jwtUtils,
  requireModule('trucking'),
  requireRole(['administrador', 'operaciones']),
  catchedAsync(uploadExcel)
);

// Solo facturación puede crear prefactura
router.post('/prefactura',
  jwtUtils,
  requireModule('trucking'),
  requireRole(['administrador', 'facturacion']),
  catchedAsync(createPrefactura)
);
```

---

## 📋 Matriz de Permisos Completa

### **Módulo: PTG (Trucking)**

| Sección | Admin | Operaciones | Facturación |
|---------|-------|-------------|-------------|
| Subir Excel | ✅ | ✅ | ❌ |
| Crear Prefactura | ✅ | ❌ | ✅ |
| Gastos Autoridades | ✅ | ❌ | ✅ |
| Facturas | ✅ | ❌ | ✅ |
| Configuración | ✅ | ❌ | ❌ |

### **Módulo: PTYSS (Shipchandler)** - Por Definir

| Sección | Admin | Operaciones | Facturación |
|---------|-------|-------------|-------------|
| Crear Registros | ✅ | ✅ | ❌ |
| Crear Prefactura | ✅ | ❌ | ✅ |
| Facturas | ✅ | ✅ | ✅ |
| Historial | ✅ | ✅ | ✅ |
| Configuración | ✅ | ❌ | ❌ |

### **Módulo: Agency** - Por Definir

| Sección | Admin | Operaciones | Facturación |
|---------|-------|-------------|-------------|
| Crear Servicios | ✅ | ✅ | ❌ |
| Registros | ✅ | ✅ | ✅ |
| SAP Invoice | ✅ | ❌ | ✅ |
| Historial | ✅ | ✅ | ✅ |
| Catálogos | ✅ | ✅ | ❌ |

---

## 🚀 Uso del SectionGuard

### **Proteger una página individual:**

**Ejemplo:** `front/app/trucking/upload/page.tsx`

```tsx
import { SectionGuard } from "@/components/section-guard"

export default function TruckingUploadPage() {
  return (
    <SectionGuard module="trucking" section="upload">
      {/* Contenido de la página */}
      <UploadExcelPage />
    </SectionGuard>
  )
}
```

### **Proteger con mensaje personalizado:**

```tsx
<SectionGuard 
  module="trucking" 
  section="config"
  fallback={
    <Alert>
      <AlertDescription>
        Solo administradores pueden acceder a la configuración.
      </AlertDescription>
    </Alert>
  }
>
  <ConfigContent />
</SectionGuard>
```

---

## 💡 Próximos Pasos

1. **Aplicar SectionGuard** a todas las páginas del módulo PTG
2. **Definir permisos** para PTYSS y Agency
3. **Agregar middleware backend** para validación adicional
4. **Testing exhaustivo** de cada combinación rol/sección

---

## ✅ Estado Actual

- ✅ Función `hasSectionAccess` implementada
- ✅ Sidebar filtra secciones por rol
- ✅ SectionGuard component creado
- ✅ Permisos PTG definidos:
  - Operaciones: Solo "Subir Excel"
  - Facturación: "Prefactura", "Gastos", "Facturas"
- ⏳ Pendiente: Aplicar guards a páginas individuales
- ⏳ Pendiente: Definir permisos para PTYSS y Agency

---

**Fecha:** Octubre 16, 2025
**Módulo:** PTG (Trucking)
**Estado:** Implementado y listo para testing

