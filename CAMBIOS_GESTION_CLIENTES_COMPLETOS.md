# Cambios en Gestión de Clientes - Resumen Completo

## ✅ Implementaciones Completadas

### 1. Nuevo Rol "clientes"
- ✅ Agregado rol `'clientes'` (Administrar Clientes)
- ✅ Solo usuarios con este rol pueden ver y gestionar clientes
- ✅ Removido acceso para rol `'facturacion'` sin rol `'clientes'`

### 2. Separación de Clientes por Módulos
- ✅ Campo `module` es un array: `["ptyss", "trucking", "agency"]`
- ✅ Un cliente puede pertenecer a múltiples módulos
- ✅ Los usuarios solo ven clientes de sus módulos asignados
- ✅ Mapeo correcto: 
  - Usuario: `"shipchandler"` → Cliente: `"ptyss"`
  - Usuario: `"trucking"` → Cliente: `"trucking"`
  - Usuario: `"agency"` → Cliente: `"agency"`

### 3. Nuevo Flujo de Creación/Asignación de Clientes

#### Características
1. **Campo SAP es primero**: El campo de código SAP es lo primero que se debe llenar
2. **Verificación de existencia**: Botón "Verificar" busca si existe un cliente con ese SAP
3. **Campos deshabilitados**: Todos los campos están deshabilitados hasta que:
   - Se verifique el SAP y no exista (puede crear nuevo)
   - O se haga click en "Continuar sin verificar"
   - O se esté editando un cliente existente

#### Flujo de Uso

**Escenario 1: Cliente NO existe**
1. Usuario ingresa código SAP
2. Click en "Verificar"
3. Sistema busca y no encuentra → muestra toast "Puedes crear un nuevo cliente"
4. Campos se habilitan automáticamente
5. Usuario llena los datos y crea el cliente
6. Cliente se crea con el módulo actual asignado

**Escenario 2: Cliente YA existe**
1. Usuario ingresa código SAP
2. Click en "Verificar"
3. Sistema encuentra el cliente existente
4. Carga todos los datos del cliente existente en el formulario
5. Muestra alerta: "Cliente existente encontrado. Si guardas, solo se agregará este módulo al cliente existente."
6. Usuario puede:
   - Editar los datos del cliente
   - Agregar información faltante
7. Al guardar: Se actualiza el cliente existente y se agrega el módulo actual a su array de módulos
8. NO se crea un cliente duplicado ✅

**Escenario 3: Usuario quiere crear sin verificar**
1. Usuario ingresa código SAP
2. Click en "Continuar sin verificar"
3. Campos se habilitan
4. Usuario crea cliente normalmente
5. Si el SAP ya existe, fallará el guardado y mostrará error

### 4. Mapeo de Módulos

```typescript
// Módulos del Usuario → Módulos de Clientes
{
  'trucking': 'trucking',
  'shipchandler': 'ptyss',  // PTYSS en usuarios es "shipchandler", en clientes es "ptyss"
  'agency': 'agency'
}
```

## Ejemplo de Uso

### Caso: Usuario de PTYSS asigna cliente existente de Agency

1. Usuario con módulo `["shipchandler"]` y rol `["clientes"]`
2. Va a crear un cliente con SAP `"12345"`
3. Hace clic en "Verificar"
4. Sistema encuentra que el cliente existe en `module: ["agency"]`
5. Muestra: "Este cliente ya existe en agency. Se agregará este módulo al cliente existente."
6. Carga los datos del cliente
7. Usuario edita si necesita (opcional)
8. Al guardar:
   - Se actualiza el cliente existente
   - Se agrega `"ptyss"` a su array de módulos
   - Resultado: `module: ["agency", "ptyss"]`
9. El cliente ahora es visible en ambos módulos ✅

## Permisos por Rol

| Rol | Ver Clientes | Crear Clientes | Editar Clientes | Módulos |
|-----|--------------|----------------|-----------------|---------|
| `administrador` | ✅ Todos | ✅ Sí | ✅ Sí | Todos |
| `clientes` | ✅ Solo su módulo | ✅ Sí | ✅ Sí | Solo sus módulos |
| `facturacion` | ❌ No | ❌ No | ❌ No | - |
| `operaciones` | ❌ No | ❌ No | ❌ No | - |
| `pendiente` | ❌ No | ❌ No | ❌ No | - |

## Campos del Formulario

### Orden de aparición
1. **Código SAP** (deshabilitado si está editando)
2. **Botones**: "Verificar" y "Continuar sin verificar" (solo cuando no está editando)
3. **Tipo de Cliente** (Natural/Jurídico) - deshabilitado hasta verificar
4. **Campos específicos según tipo** - deshabilitados hasta verificar
5. **Información de contacto** - deshabilitados hasta verificar

### Validaciones
- ✅ SAP code es obligatorio
- ✅ Si existe, no permite crear duplicado
- ✅ Campos específicos según tipo son obligatorios
- ✅ Email obligatorio para clientes jurídicos

## Estado del Formulario

El botón de guardar muestra:
- **"Crear Cliente"** - Cliente nuevo
- **"Agregar Módulo a Cliente Existente"** - Cliente existe, solo se agregará módulo
- **"Actualizar"** - Editando cliente existente

## Migración Completa

✅ Todos los clientes existentes ahora tienen `module: ["ptyss", "agency"]`
✅ Fueron migrados exitosamente (17 clientes)

