# Migración: Agregar Pricing de "No Show" a Rutas Existentes

Este script agrega la configuración de pricing para el move type "no_show" a todas las rutas existentes en la base de datos.

## Archivos de Migración

- `addNoShowPricing.js` - Script simple y directo
- `migrateAddNoShowPricing.js` - Script con más detalles y logging
- `migrateAddNoShowPricingAdvanced.js` - Script avanzado con opciones de línea de comandos

## Instrucciones de Uso

### Opción 1: Script Simple (Recomendado)

```bash
# Navegar al directorio del script
cd api/scripts

# Ejecutar la migración
node addNoShowPricing.js
```

### Opción 2: Script con Logging Detallado

```bash
cd api/scripts
node migrateAddNoShowPricing.js
```

### Opción 3: Script Avanzado con Opciones

```bash
cd api/scripts

# Migración básica
node migrateAddNoShowPricingAdvanced.js

# Con precios personalizados
node migrateAddNoShowPricingAdvanced.js --price-1-3 10 --price-4-7 15 --price-8-plus 20

# Ver ayuda
node migrateAddNoShowPricingAdvanced.js --help
```

## ¿Qué hace el script?

1. **Conecta a MongoDB** usando la variable de entorno `MONGODB_URI`
2. **Busca todas las rutas activas** en la base de datos
3. **Verifica cada ruta** para ver si ya tiene pricing de "no_show"
4. **Agrega pricing de "no_show"** a las rutas que no lo tienen con:
   - 1-3 pasajeros: $0 (configurable)
   - 4-7 pasajeros: $0 (configurable)
   - 8+ pasajeros: $0 (configurable)
5. **Muestra un resumen** de la migración

## Configuración de Precios

Por defecto, el pricing de "no_show" se configura con precios en $0, ya que típicamente un "no show" no genera cobro. Sin embargo, puedes modificar estos valores:

### En el script simple:
Edita el archivo `addNoShowPricing.js` y modifica los valores en la sección:
```javascript
passengerRanges: [
  { minPassengers: 1, maxPassengers: 3, price: 0, description: '1-3 pasajeros' },
  { minPassengers: 4, maxPassengers: 7, price: 0, description: '4-7 pasajeros' },
  { minPassengers: 8, maxPassengers: 999, price: 0, description: '8+ pasajeros' }
]
```

### En el script avanzado:
Usa los parámetros de línea de comandos:
```bash
node migrateAddNoShowPricingAdvanced.js --price-1-3 10 --price-4-7 15 --price-8-plus 20
```

## Variables de Entorno

Asegúrate de tener configurada la variable de entorno `MONGODB_URI`:

```bash
export MONGODB_URI="mongodb://localhost:27017/barcos"
# o
export MONGODB_URI="mongodb://usuario:password@host:puerto/database"
```

## Verificación Post-Migración

Después de ejecutar la migración, puedes verificar que funcionó correctamente:

1. **En el frontend**: Ve a Agency Catalogs → Routes y verifica que todas las rutas ahora tienen la pestaña "No Show"
2. **En la base de datos**: Ejecuta esta consulta en MongoDB:
   ```javascript
   db.agencyroutes.countDocuments({"pricing.routeType": "no_show", "isActive": true})
   ```

## Ejemplo de Salida

```
🚀 Adding no_show pricing to existing routes...
✅ Connected to MongoDB
📊 Found 14 active routes
✅ Updated: AIRPORT / BOAT LANDING PTY
✅ Updated: HOTEL / AIRPORT
✅ Updated: PORT / HOTEL
...

📈 Migration Complete!
✅ Routes updated: 14
⏭️  Routes skipped (already had no_show): 0
🔍 Verification: 14 routes now have no_show pricing
🔌 Disconnected from MongoDB
```

## Troubleshooting

### Error de conexión a MongoDB
- Verifica que MongoDB esté ejecutándose
- Verifica la variable de entorno `MONGODB_URI`
- Verifica que la base de datos existe

### Error de permisos
- Asegúrate de que el usuario de MongoDB tenga permisos de escritura
- Verifica que la conexión esté autenticada correctamente

### Rutas no encontradas
- Verifica que existan rutas activas en la base de datos
- Verifica que el esquema de la base de datos sea correcto

## Notas Importantes

- **Backup**: Siempre haz un backup de la base de datos antes de ejecutar migraciones
- **Idempotente**: El script es seguro de ejecutar múltiples veces (no duplica datos)
- **Precios por defecto**: Los precios se configuran en $0 por defecto para "no_show"
- **Solo rutas activas**: Solo se procesan rutas con `isActive: true`
