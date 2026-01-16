# Implementación de Estados de Registros Locales PTYSS

## Cambios Implementados

Se ha mejorado el sistema de estados de los registros locales de PTYSS para tener mejor control del flujo de trabajo.

## Estados Disponibles

### Antes
- ✅ Pendiente
- ✅ Completado

### Ahora
- 🟠 **Pendiente** - Registro creado, esperando acción
- 🟢 **Completado** - Registro enviado a prefactura, listo para facturar
- 🔴 **Cancelado** - Registro cancelado, no se facturará

## Archivo Modificado

**`front/components/ptyss/ptyss-upload.tsx`**

## Cambios Específicos

### 1. Filtro de Registros Actualizado

**Antes:**
```typescript
// Solo mostraba registros pendientes
const pendingLocalRecords = useMemo(() => {
  return ptyssRecords.filter((record: ExcelRecord) => {
    const data = record.data as Record<string, any>
    return data.recordType === "local" && record.status === "pendiente" && !record.invoiceId
  })
}, [ptyssRecords])
```

**Ahora:**
```typescript
// Muestra registros pendientes Y completados (excluye cancelados)
const pendingLocalRecords = useMemo(() => {
  return ptyssRecords.filter((record: ExcelRecord) => {
    const data = record.data as Record<string, any>
    return data.recordType === "local" && 
           (record.status === "pendiente" || record.status === "completado") && 
           !record.invoiceId
  })
}, [ptyssRecords])
```

### 2. Función para Cancelar Registros

**Nueva función agregada:**
```typescript
const handleMarkAsCancelled = async () => {
  if (!recordToSend) return

  try {
    await dispatch(updateRecordAsync({
      id: recordToSend,
      updates: {
        status: "cancelado"
      }
    })).unwrap()
    
    toast({
      title: "Registro cancelado",
      description: "El registro ha sido marcado como cancelado",
    })
    
    dispatch(fetchRecordsByModule("ptyss"))
    setConfirmSendDialogOpen(false)
    setRecordToSend(null)
  } catch (error: any) {
    toast({
      title: "Error al cancelar",
      description: error.message || "Error al actualizar el estado del registro",
      variant: "destructive"
    })
  }
}
```

### 3. Columna de Estado Dinámica

**Antes:**
```typescript
<TableCell>
  <Badge variant="outline" className="text-orange-600 border-orange-600">
    Pendiente
  </Badge>
</TableCell>
```

**Ahora:**
```typescript
<TableCell>
  {record.status === "pendiente" && (
    <Badge variant="outline" className="text-orange-600 border-orange-600">
      Pendiente
    </Badge>
  )}
  {record.status === "completado" && (
    <Badge variant="outline" className="text-green-600 border-green-600">
      Completado
    </Badge>
  )}
  {record.status === "cancelado" && (
    <Badge variant="outline" className="text-red-600 border-red-600">
      Cancelado
    </Badge>
  )}
</TableCell>
```

### 4. Botones de Acción Condicionales

**Lógica de Botones:**

| Estado | Editar | Acciones | Eliminar |
|--------|--------|----------|----------|
| **Pendiente** | ✅ Sí | ✅ Sí | ✅ Sí |
| **Completado** | ❌ No | ❌ No | ❌ No |
| **Cancelado** | ❌ No | ❌ No | ✅ Sí |

**Implementación:**
```typescript
<div className="flex items-center justify-center gap-2">
  {/* Botón Editar - Solo para pendientes */}
  {record.status === "pendiente" && (
    <Button onClick={() => handleEditRecord(record)}>
      <Edit className="h-4 w-4 mr-1" />
      Editar
    </Button>
  )}
  
  {/* Botón Acciones - Solo para pendientes */}
  {record.status === "pendiente" && (
    <Button onClick={() => handleOpenSendConfirmation(record._id || record.id || "")}>
      <Send className="h-4 w-4 mr-1" />
      Acciones
    </Button>
  )}
  
  {/* Botón Eliminar - Para todos excepto completados */}
  {record.status !== "completado" && (
    <Button onClick={() => handleDeletePendingRecord(record._id || record.id || "")}>
      <Trash2 className="h-4 w-4" />
    </Button>
  )}
</div>
```

### 5. Diálogo de Acciones Mejorado

**Antes:**
```
┌─────────────────────────────────┐
│ Confirmar Envío a Prefactura   │
├─────────────────────────────────┤
│ ¿Estás seguro de enviar...?    │
│                                 │
│         [Cancelar] [Confirmar]  │
└─────────────────────────────────┘
```

**Ahora:**
```
┌──────────────────────────────────────┐
│ Acciones de Registro                │
├──────────────────────────────────────┤
│ ┌────────────────────────────────┐  │
│ │ ✓ Completar Registro           │  │
│ │ El registro pasará a estado... │  │
│ └────────────────────────────────┘  │
│                                      │
│ ┌────────────────────────────────┐  │
│ │ ✗ Cancelar Registro            │  │
│ │ El registro pasará a estado... │  │
│ └────────────────────────────────┘  │
│                                      │
│ [Cerrar] [Cancelar Registro] [✓ Completar]│
└──────────────────────────────────────┘
```

### 6. Header con Badges de Conteo

**Antes:**
```
Registros Locales Pendientes (15)
```

**Ahora:**
```
Registros Locales (20)
[5 Pendientes] [15 Completados]
```

## Flujo de Trabajo

### Registro Pendiente
1. Usuario crea un registro local → Estado: **Pendiente** 🟠
2. Puede **Editar**, **Completar**, **Cancelar** o **Eliminar**

### Completar Registro
3. Usuario presiona "Acciones" → Selecciona "Completar"
4. Estado cambia a: **Completado** 🟢
5. Aparece en lista de prefactura
6. **No se puede editar ni eliminar** (protección de datos)

### Cancelar Registro
3. Usuario presiona "Acciones" → Selecciona "Cancelar Registro"
4. Estado cambia a: **Cancelado** 🔴
5. **No aparece** en la lista de registros locales
6. Se puede eliminar permanentemente si es necesario

## Beneficios

1. ✅ **Mayor Control** - Tres estados claros del registro
2. ✅ **Visibilidad Completa** - Ver registros pendientes Y completados
3. ✅ **Opción de Cancelar** - Marcar registros que no se procesarán
4. ✅ **Protección de Datos** - Registros completados no se pueden editar/eliminar
5. ✅ **Mejor UX** - Diálogo más claro con opciones explicadas
6. ✅ **Contadores** - Ver cuántos registros hay en cada estado

## Estados Visuales

| Estado | Color | Ícono | Acciones Disponibles |
|--------|-------|-------|---------------------|
| 🟠 **Pendiente** | Naranja | - | Editar, Completar, Cancelar, Eliminar |
| 🟢 **Completado** | Verde | ✓ | Ninguna (protegido) |
| 🔴 **Cancelado** | Rojo | ✗ | Eliminar (oculto de lista) |

## Testing

### Caso 1: Crear y Completar Registro
1. Crear un registro local → Estado: Pendiente
2. Click en "Acciones"
3. Seleccionar "Completar"
4. **Resultado:** Estado = Completado, aparece en verde en la lista

### Caso 2: Crear y Cancelar Registro
1. Crear un registro local → Estado: Pendiente
2. Click en "Acciones"
3. Seleccionar "Cancelar Registro"
4. **Resultado:** Estado = Cancelado, desaparece de la lista

### Caso 3: Editar Registro Pendiente
1. Registro con estado: Pendiente
2. Click en "Editar"
3. Modificar datos
4. Guardar
5. **Resultado:** Sigue en estado Pendiente con datos actualizados

### Caso 4: Intentar Editar Registro Completado
1. Registro con estado: Completado
2. **Resultado:** No aparece botón "Editar" ni "Eliminar" (protegido)

## Estado

✅ **COMPLETADO** - Sistema de estados de registros locales implementado.

