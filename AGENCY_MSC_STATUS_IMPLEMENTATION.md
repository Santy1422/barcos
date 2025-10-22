# Implementación de MSC Status en Agency

## ✅ Implementación Completada

Se ha agregado una nueva sección de catálogo en Agency Catalogs para gestionar los **MSC Status** (categorías de crew members).

## Cambios Realizados

### 1. Frontend

#### `front/components/agency/agency-catalogs.tsx`
- **Agregada nueva sección "MSC Status"** con los siguientes cambios:
  - Nuevo tipo de catálogo: `crew_status`
  - Label: "MSC Status"
  - Descripción: "Crew member status categories (Visit, On Signer, Off Signer, Bil)"
  - Campo: Solo `name` (Status Name)
  - Ícono: Users
- **Ajustado grid de Quick Stats**: De `md:grid-cols-7` a `md:grid-cols-4 lg:grid-cols-8`
- **Actualizado TabsList**: De 9 columnas a 10 columnas
- **Removido botón "Load Initial Data"**: Ya no es necesario en la interfaz

#### `front/components/agency/agency-services.tsx`
- **Cambio de columna**: "Status" → "Categoría"
- **Valores dinámicos**: Ahora usa los MSC Status del catálogo en lugar de valores hardcoded
- **Antes:**
  ```typescript
  <SelectItem value="Visit">Visit</SelectItem>
  <SelectItem value="On Signer">On Signer</SelectItem>
  ```
- **Después:**
  ```typescript
  {crewStatuses.map((status) => (
    <SelectItem key={status._id} value={status.name}>
      {status.name}
    </SelectItem>
  ))}
  ```

#### `front/lib/features/agencyServices/agencyCatalogsSlice.ts`
- Agregado `'crew_status'` al tipo `CatalogType`
- Agregado selector `selectActiveCrewStatuses`

#### `front/lib/features/agencyServices/useAgencyCatalogs.ts`
- Importado y exportado `selectActiveCrewStatuses`
- Agregado `crewStatuses` a los catálogos específicos retornados
- Agregado `crew_status` al objeto de estadísticas rápidas

### 2. Backend

#### `api/src/database/schemas/agencyCatalogSchema.ts`
- Agregado `'crew_status'` al tipo `CatalogType`
- Agregado `'crew_status'` al enum del schema
- Agregado `crew_status: []` al objeto `grouped` en `getAllGroupedByType`
- Agregado label `'crew_status': 'Estado MSC'` en typeLabel virtual

#### `api/src/controllers/agencyCatalogsControllers/agencyCatalogsControllers.ts`
- Agregado `crew_status: []` al objeto `grouped`
- Agregado `crew_status: grouped.crew_status.length` al objeto `counts`

#### `api/scripts/seedAgencyCrewStatuses.ts`
- Nuevo script para seed de datos iniciales
- Crea los 4 MSC Status por defecto:
  1. **Visit**
  2. **On Signer**
  3. **Off Signer**
  4. **Bil**

### 3. Seed Ejecutado

```bash
✅ Seed de MSC Status completado exitosamente!

📊 Resumen:
   ✅ Creados: 4
   🔄 Actualizados: 0
   📦 Total: 4

🔍 MSC Status activos:
   - Visit
   - On Signer
   - Off Signer
   - Bil
```

## Flujo de Uso

### 1. Gestión de MSC Status (Agency Catalogs)
1. Ir a **Agency → Catálogos**
2. Seleccionar tab **"MSC Status"**
3. Ver los 4 status pre-cargados
4. Agregar nuevos status si es necesario con el botón **"Add MSC Status"**
5. Editar/desactivar status existentes

### 2. Uso en Servicios (Agency Services)
1. Ir a **Agency → Crear Servicios**
2. En la sección **Crew Members**, agregar un crew member
3. En la columna **"Categoría"**, seleccionar de la lista:
   - Visit
   - On Signer
   - Off Signer
   - Bil
4. Los valores se cargan dinámicamente del catálogo

## Beneficios

1. ✅ **Configuración Centralizada**: Los MSC Status se gestionan en un solo lugar
2. ✅ **Valores Dinámicos**: No hay valores hardcoded, todo viene de la base de datos
3. ✅ **Extensible**: Se pueden agregar/editar/eliminar status fácilmente
4. ✅ **Consistencia**: Los mismos valores aparecen en todos los lugares donde se necesitan
5. ✅ **Administrable**: Los administradores pueden modificar los status sin cambiar código

## Estructura de Datos

### MSC Status en Base de Datos

```json
{
  "_id": "ObjectId",
  "type": "crew_status",
  "name": "Visit",
  "isActive": true,
  "metadata": {},
  "createdAt": "2025-10-22T...",
  "updatedAt": "2025-10-22T..."
}
```

### Crew Member en Servicio

```json
{
  "id": "timestamp",
  "name": "John Doe",
  "nationality": "USA",
  "crewRank": "Captain",
  "crewCategory": "Visit",  // ← Valor del catálogo MSC Status
  "status": "Visit",
  "flight": "AA123"
}
```

## Archivos Modificados

### Frontend (5 archivos)
1. `front/components/agency/agency-catalogs.tsx`
2. `front/components/agency/agency-services.tsx`
3. `front/lib/features/agencyServices/agencyCatalogsSlice.ts`
4. `front/lib/features/agencyServices/useAgencyCatalogs.ts`

### Backend (3 archivos)
5. `api/src/database/schemas/agencyCatalogSchema.ts`
6. `api/src/controllers/agencyCatalogsControllers/agencyCatalogsControllers.ts`
7. `api/scripts/seedAgencyCrewStatuses.ts` (nuevo)

## Estado

✅ **COMPLETADO** - Todos los cambios implementados y seed ejecutado exitosamente.

## Verificación

Para verificar que todo funciona:

1. **Agency Catalogs**:
   - ✅ Acceder a Agency → Catálogos
   - ✅ Ver tab "MSC Status"
   - ✅ Verificar que aparezcan los 4 status

2. **Agency Services**:
   - ✅ Acceder a Agency → Crear Servicios
   - ✅ Agregar un crew member
   - ✅ En columna "Categoría", verificar que aparezcan los 4 status desde el catálogo
   - ✅ Crear un servicio con diferentes categorías

## Próximos Pasos

- [x] Seed de datos iniciales ejecutado
- [ ] Verificar funcionamiento en interfaz
- [ ] Agregar más MSC Status si es necesario desde la interfaz

