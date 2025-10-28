# Migración de Clientes a PTYSS y Agency

## Resumen
Script de migración para asignar todos los clientes existentes en la base de datos al módulo PTYSS y Agency.

## Objetivo
Agregar el campo `module: ["ptyss", "agency"]` a todos los clientes existentes que no lo tengan o tengan valores diferentes.

## Ejecutar la Migración

### Opción 1: Desde la raíz del proyecto
```bash
cd api
npm run migrate:clients-to-ptyss-agency
```

### Opción 2: Ejecutar directamente con Node
```bash
cd api
node scripts/migrateClientsToPTYSSAndAgency.js
```

## ¿Qué hace el script?

1. **Se conecta a MongoDB** usando la variable de entorno `MONGO_URI`
2. **Busca todos los clientes** en la colección `clients`
3. **Para cada cliente**:
   - Si NO tiene campo `module` o es `null`: Asigna `["ptyss", "agency"]`
   - Si tiene `module` como string: Convierte a array agregando `"ptyss"` y `"agency"`
   - Si tiene `module` como array pero le faltan módulos: Agrega los faltantes
   - Si ya tiene ambos `"ptyss"` y `"agency"`: Lo salta
4. **Muestra un resumen** de cuántos clientes fueron actualizados

## Ejemplo de Ejecución

```
🚀 Iniciando migración de clientes a PTYSS y Agency...

📊 Total de clientes encontrados: 150

✅ Cliente SAP001: Agregados módulos [ptyss, agency]
✅ Cliente SAP002: Convertido de string a array. Módulos: [trucking, ptyss, agency]
⏭️  Cliente SAP003 ya tiene ambos módulos. Saltado.
✅ Cliente SAP004: ptyss agregado. Módulos actuales: [agency, ptyss]
...

📊 Resumen de la migración:
   ✅ Actualizados: 145
   ⏭️  Saltados: 3
   ❌ Errores: 2
   📝 Total procesados: 150

✅ Migración completada exitosamente
👋 Desconectado de MongoDB
```

## Requisitos

1. **MongoDB ejecutándose** y accesible
2. **Variable de entorno** `MONGO_URI` configurada en el archivo `.env`
3. **Dependencias instaladas** (`npm install` en la carpeta `api`)

## Archivos de Configuración

### `.env` (en la carpeta `api/`)
```env
MONGO_URI=mongodb://localhost:27017/nombre_de_tu_base_de_datos
```

## Verificación Post-Migración

Para verificar que la migración funcionó correctamente:

```javascript
// En MongoDB Shell
use tu_base_de_datos
db.clients.find({ module: { $all: ["ptyss", "agency"] } }).count()
// Debería devolver el total de clientes

db.clients.find({ module: { $size: 2 } }).count()
// Debería devolver el total de clientes con exactamente 2 módulos
```

## Manejo de Errores

El script maneja:
- ✅ Clientes sin campo `module`
- ✅ Clientes con `module` como string
- ✅ Clientes con `module` como array incompleto
- ✅ Evita duplicados al agregar módulos
- ✅ Muestra errores individuales sin detener la migración completa

## Casos Especiales

### Cliente solo en Trucking
Si un cliente tiene `module: ["trucking"]`:
- El script lo actualizará a `["trucking", "ptyss", "agency"]`
- Mantendrá el módulo trucking original

### Cliente solo en PTYSS
Si un cliente tiene `module: "ptyss"` (string):
- El script lo convertirá a `["ptyss", "agency"]`
- Eliminará duplicados automáticamente

### Cliente ya completo
Si un cliente tiene `module: ["ptyss", "agency"]`:
- El script lo saltará
- No lo actualizará (eficiencia)

## Rollback (Revertir)

Si necesitas revertir los cambios:

```javascript
// En MongoDB Shell - ¡Cuidado con esto!
// Solo ejecuta si estás seguro

// Opción 1: Restaurar módulos específicos
db.clients.updateMany(
  { module: { $in: ["ptyss", "agency"] } },
  { $set: { module: ["ptyss"] } }
)

// Opción 2: Eliminar campo module (no recomendado)
// db.clients.updateMany({}, { $unset: { module: "" } })
```

## Notas Importantes

1. **Haz backup** de tu base de datos antes de ejecutar el script
2. El script es **idempotente**: Puedes ejecutarlo múltiples veces sin problema
3. Los clientes **NO se eliminan**, solo se actualizan
4. El campo `updatedAt` se actualiza automáticamente

## Siguiente Paso

Después de ejecutar este script, todos tus clientes existentes:
- ✅ Tendrán `module: ["ptyss", "agency"]`
- ✅ Aparecerán en el módulo PTYSS
- ✅ Aparecerán en el módulo Agency
- ✅ NO aparecerán en Trucking (a menos que tú los agregues manualmente)

Para agregar clientes a Trucking también:
```javascript
db.clients.updateMany({}, { $set: { module: ["ptyss", "agency", "trucking"] } })
```

