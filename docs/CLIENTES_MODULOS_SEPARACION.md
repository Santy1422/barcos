# Separación de Clientes por Módulo

## Resumen
Se ha implementado la separación de clientes por módulo usando un sistema de arrays. Los clientes pueden pertenecer a **uno o múltiples módulos** (PTYSS, Trucking/PTG, Agency) y se filtrarán según el módulo desde el cual se consulte.

## Cambios Implementados

### Backend (API)

#### 1. Schema de Clientes (`api/src/database/schemas/clientsSchema.ts`)
- ✅ Agregado campo `module` como **array** de strings con valores permitidos: `"ptyss"`, `"trucking"`, `"agency"`
- ✅ Campo `module` es un array que permite que un cliente pertenezca a múltiples módulos
- ✅ Valor por defecto es `["ptyss"]` para mantener compatibilidad
- ✅ Código SAP debe ser único globalmente (no se permite duplicación)
- ✅ Agregado índice en campo `module` para búsquedas eficientes con `$in`

#### 2. Controladores
- ✅ `getAllClients.ts`
  - Soporta parámetro `?module=trucking` en query string
  - Si no se especifica, devuelve todos los clientes (comportamiento anterior)
  
- ✅ `getActiveClients.ts`
  - Soporta parámetro `?module=trucking` en query string
  - Si no se especifica, devuelve todos los clientes activos

- ✅ `createClient.ts`
  - Valida unicidad de `sapCode` globalmente
  - Si no se proporciona `module`, asigna `["ptyss"]` por defecto
  - Normaliza `module` a array si viene como string único
  - Un cliente puede tener `module: ["ptyss", "trucking"]` para aparecer en ambos módulos

### Frontend

#### 1. Redux Slice (`front/lib/features/clients/clientsSlice.ts`)
- ✅ `fetchClients` ahora acepta parámetro opcional `module` (string o array)
- ✅ `createClientAsync` ahora incluye campo `module` en los datos enviados al API
- ✅ Soporta `module` como string único o como array de strings
- ✅ Compatible con código existente que no especifica módulo (usa `["ptyss"]` por defecto)

#### 2. Componentes
- ✅ `ClientModal` acepta prop opcional `module` (por defecto "ptyss")
- ✅ `trucking-upload.tsx` usa `module="trucking"` en todas las operaciones de clientes

## Uso

### Crear Cliente en Módulo Específico

**Cliente para un solo módulo:**
```typescript
// Pasar el módulo como string o array con un elemento
dispatch(createClientAsync({ 
  ...clientData, 
  module: "trucking" // o ["trucking"]
}))
```

**Cliente para múltiples módulos:**
```typescript
// Pasar array con múltiples módulos
dispatch(createClientAsync({ 
  ...clientData, 
  module: ["ptyss", "trucking"] 
}))
```

### Cargar Clientes de un Módulo Específico
```typescript
// En el frontend, especificar el módulo al cargar
dispatch(fetchClients("trucking")) // Cargará clientes que incluyan "trucking"
```

### API Endpoints
```bash
# Obtener todos los clientes del módulo trucking
GET /api/clients?module=trucking

# Obtener clientes activos del módulo trucking
GET /api/clients/active?module=trucking

# Sin módulo especificado, devuelve todos (comportamiento anterior)
GET /api/clients
```

## Migración de Base de Datos

### Opcional: Actualizar Clientes Existentes
Si ya tienes clientes en la base de datos, puedes actualizarlos para asignarles módulos específicos:

**Asignar un solo módulo a todos los clientes sin módulo:**
```javascript
// En MongoDB o script de migración
db.clients.updateMany(
  { module: { $exists: false } },  // Documentos sin módulo
  { $set: { module: ["ptyss"] } }    // Asignar módulo ptyss como array
)
```

**Asignar múltiples módulos a clientes específicos:**
```javascript
// Por ejemplo, si tienes clientes que deben estar en PTYSS y Trucking
db.clients.updateMany(
  { name: "PTG" },  // Criterio de selección
  { $set: { module: ["ptyss", "trucking"] } }  // Array de módulos
)
```

**Actualizar clientes existentes con módulo string a array:**
```javascript
// Si algunos clientes tienen module como string, convertirlos a array
db.clients.find({ module: { $type: "string" } }).forEach(function(doc) {
  db.clients.update(
    { _id: doc._id },
    { $set: { module: [doc.module] } }
  );
});
```

## Notas Importantes

1. **Compatibilidad hacia atrás**: Los clientes existentes sin campo `module` se tratarán como `["ptyss"]` por defecto

2. **Unicidad de SAP Code**: El SAP code debe ser **único globalmente** (en toda la base de datos). No se permiten duplicados.

3. **Múltiples módulos**: Un cliente puede pertenecer a varios módulos simultáneamente:
   ```json
   {
     "name": "PTG",
     "module": ["ptyss", "trucking"],  // Aparece en ambos módulos
     "sapCode": "SAP001"
   }
   ```

4. **Módulos definidos**: Los módulos permitidos son:
   - `"ptyss"` (Shipchandler)
   - `"trucking"` (Trucking/PTG)
   - `"agency"` (Agency)

4. **Frontend**: Los módulos PTYSS y Agency seguirán viendo solo los clientes de su módulo (o clientes sin módulo asignado que se tratarán como "ptyss")

## Próximos Pasos (Opcional)

Si deseas aplicar esta separación a otros módulos (PTYSS, Agency), puedes:

1. Actualizar componentes de PTYSS para pasar `module="ptyss"` en las operaciones
2. Actualizar componentes de Agency para pasar `module="agency"` en las operaciones
3. Asegúrate de que cada módulo solo cargue sus clientes específicos usando `fetchClients("moduleName")`

## Testing

Para probar la separación:

1. **Crear cliente en módulo Trucking**: 
   - Ve a Trucking Upload
   - Crea un cliente desde el flujo de faltantes
   - Verifica que tenga `module: "trucking"` en la base de datos

2. **Verificar que no se ve entre módulos**:
   - Carga clientes en módulo trucking (`fetchClients("trucking")`)
   - No deberías ver clientes de PTYSS
   - Y viceversa

