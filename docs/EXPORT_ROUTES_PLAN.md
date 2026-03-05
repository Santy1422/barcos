# Plan de Implementacion: Exportar Rutas por Modulo

## Resumen Ejecutivo

Agregar un boton "Exportar" en cada modulo para descargar las rutas en formato Excel.

**Modulos afectados:**
- PTG/Trucking (rutas de trucking)
- PTYSS Trasiego (rutas de trasiego)
- PTYSS Local (rutas locales)
- Agency (rutas de agency)

---

## Estado Actual

| Modulo | Endpoint Export | Endpoint Import | Boton en UI |
|--------|-----------------|-----------------|-------------|
| Trucking | SI (solo JSON) | SI | NO |
| PTYSS Trasiego | NO | SI | NO |
| PTYSS Local | NO | NO | NO |
| Agency Routes | NO | NO | NO |
| Agency Catalogs | SI (JSON) | SI | SI |

---

## Arquitectura Propuesta

### Opcion A: Export desde Frontend (MAS SEGURO)
```
Usuario -> Click Boton -> Fetch datos del API existente -> Generar Excel en browser -> Descargar
```

**Ventajas:**
- NO modifica el backend
- NO agrega endpoints nuevos
- Usa APIs que YA existen y funcionan
- Riesgo de romper algo: **CASI CERO**

**Desventajas:**
- Puede ser lento con muchos datos (10k+ rutas)

### Opcion B: Export desde Backend (MAS COMPLEJO)
```
Usuario -> Click Boton -> Llamar nuevo endpoint -> Backend genera Excel -> Descargar
```

**Ventajas:**
- Mejor rendimiento con muchos datos

**Desventajas:**
- Requiere crear endpoints nuevos
- Mas codigo que mantener
- Mayor riesgo de introducir bugs

---

## RECOMENDACION: Opcion A (Frontend Export)

**Razon:** El proyecto ya tiene `xlsx` y `file-saver` instalados en el frontend. Solo hay que agregar un boton y una funcion que:
1. Tome los datos que YA estan cargados en el estado (Redux)
2. Los convierta a Excel
3. Descargue el archivo

**NO se modifica:**
- Base de datos
- APIs existentes
- Logica de negocio
- Autenticacion
- Nada del backend

---

## Implementacion Detallada

### 1. PTG/Trucking Routes

**Archivo a modificar:** `front/components/trucking/trucking-config.tsx`

**Ubicacion del boton:** Junto al boton "Importar Precios" (linea ~200)

**Datos a exportar:**
| Columna Excel | Campo en DB |
|---------------|-------------|
| Nombre | name |
| Origen | origin |
| Destino | destination |
| Tipo Contenedor | containerType |
| Tipo Ruta | routeType |
| Estado | status |
| Precio | price |
| Cliente | cliente |
| Area | routeArea |

**Codigo a agregar:**
```tsx
const handleExportRoutes = () => {
  const dataToExport = routes.map(route => ({
    'Nombre': route.name,
    'Origen': route.origin,
    'Destino': route.destination,
    'Tipo Contenedor': route.containerType,
    'Tipo Ruta': route.routeType,
    'Estado': route.status,
    'Precio': route.price,
    'Cliente': route.cliente,
    'Area': route.routeArea
  }));

  const ws = XLSX.utils.json_to_sheet(dataToExport);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Rutas Trucking');
  XLSX.writeFile(wb, `rutas_trucking_${new Date().toISOString().split('T')[0]}.xlsx`);
};
```

---

### 2. PTYSS Trasiego Routes

**Archivo a modificar:** `front/components/ptyss/ptyss-config.tsx`

**Datos a exportar:**
| Columna Excel | Campo en DB |
|---------------|-------------|
| Nombre | name |
| Desde | from |
| Hasta | to |
| Tipo Contenedor | containerType |
| Tipo Ruta | routeType |
| Estado | status |
| Precio | price |
| Cliente | cliente |
| Area | routeArea |

---

### 3. PTYSS Local Routes

**Archivo a modificar:** `front/components/ptyss/ptyss-local-routes.tsx`

**Datos a exportar:**
| Columna Excel | Campo en DB |
|---------------|-------------|
| Cliente | clientName |
| Desde | from |
| Hasta | to |
| Precio Regular | priceRegular |
| Precio Reefer | priceReefer |

---

### 4. Agency Routes

**Archivo a modificar:** `front/components/agency/agency-catalogs.tsx` (tab de rutas)

**Datos a exportar:**
| Columna Excel | Campo en DB |
|---------------|-------------|
| Nombre | name |
| Pickup | pickupLocation |
| Dropoff | dropoffLocation |
| Tipo Pickup | pickupSiteType |
| Tipo Dropoff | dropoffSiteType |
| Moneda | currency |
| Tarifa Espera | waitingTimeRate |

*Nota: Los precios de Agency son complejos (por rango de pasajeros). Se exportarian en columnas separadas o en una hoja adicional.*

---

## Archivos que se Modifican

```
front/components/trucking/trucking-config.tsx    (+30 lineas)
front/components/ptyss/ptyss-config.tsx          (+30 lineas)
front/components/ptyss/ptyss-local-routes.tsx    (+30 lineas)
front/components/agency/agency-catalogs.tsx      (+30 lineas)
```

**Total:** ~120 lineas de codigo nuevo

**Archivos que NO se tocan:**
- Todo el backend (api/)
- Base de datos
- Schemas
- Redux slices
- Rutas de API
- Middlewares
- Autenticacion

---

## Dependencias

**Ya instaladas (no hay que agregar nada):**
```json
// front/package.json
"xlsx": "^0.18.5",
"file-saver": "^2.0.5"
```

---

## Testing

### Test Manual por Modulo:
1. Ir a la pagina de configuracion/catalogos
2. Click en boton "Exportar"
3. Verificar que se descarga archivo .xlsx
4. Abrir en Excel y verificar datos correctos

### Casos Edge:
- [ ] Exportar con 0 rutas (debe mostrar mensaje o archivo vacio)
- [ ] Exportar con 1000+ rutas (verificar rendimiento)
- [ ] Exportar con caracteres especiales en nombres
- [ ] Exportar con valores null/undefined

---

## Rollback

Si algo falla, simplemente:
1. Revertir el commit
2. Deploy

No hay migraciones de base de datos ni cambios de schema.
