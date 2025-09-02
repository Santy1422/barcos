# Seed de Impuestos PTG (Trucking)

Este script crea los dos impuestos fijos necesarios para el módulo de Trucking:

## Impuestos que se crean:

1. **Customs** - Impuesto de aduana
2. **Administration Fee** - Tarifa administrativa

## Características:

- **Módulo**: `trucking`
- **Estado**: Activos por defecto
- **Precio inicial**: $0.00 (se puede modificar desde la interfaz)
- **Campo de precio**: Se almacena en el campo `price` del servicio

## Ejecución del Script

### Opción 1: Usando npm script (Recomendado)
```bash
# Desde el directorio raíz del proyecto
npm run seed:ptg-taxes

# O usando la versión JavaScript
npm run seed:ptg-taxes:js
```

### Opción 2: Ejecución directa
```bash
# Versión TypeScript
npx ts-node scripts/seedPTGTaxes.ts

# Versión JavaScript
node scripts/seedPTGTaxes.js
```

### Opción 3: Desde el directorio api/
```bash
cd api/
npm run seed:ptg-taxes
```

## Requisitos previos:

1. **Base de datos**: MongoDB debe estar ejecutándose
2. **Variables de entorno**: Archivo `.env` con `USER_MONGO_URI`
3. **Dependencias**: `npm install` ejecutado

## Estructura en la base de datos:

Los impuestos se crean en la colección `services` con la siguiente estructura:

```json
{
  "name": "Customs",
  "description": "Impuesto de aduana para el módulo de Trucking",
  "price": 0,
  "module": "trucking",
  "isActive": true,
  "createdBy": "ObjectId del sistema",
  "createdAt": "Fecha de creación",
  "updatedAt": "Fecha de última actualización"
}
```

## Comportamiento del script:

- ✅ **Si no existen**: Crea los dos impuestos con precio $0.00
- ⚠️ **Si ya existen**: Muestra los impuestos existentes y no los modifica
- 🔌 **Conexión**: Se conecta automáticamente a MongoDB usando las variables de entorno
- 🧹 **Limpieza**: Se desconecta automáticamente al finalizar

## Modificación de precios:

Una vez creados los impuestos, puedes modificar sus precios desde:

1. **Interfaz de configuración**: Trucking → Servicios PTG → Impuestos PTG
2. **Base de datos directa**: Modificando el campo `description` en la colección `services`

## Notas importantes:

- Los impuestos son **fijos** y no se pueden eliminar
- Solo se puede modificar el **precio** (campo `description`)
- Los nombres son **inmutables** para mantener la integridad del sistema
- El módulo está **bloqueado** en `trucking`

## Troubleshooting:

### Error de conexión a MongoDB:
```bash
# Verificar que MongoDB esté ejecutándose
# Verificar la variable USER_MONGO_URI en .env
```

### Error de dependencias:
```bash
# Instalar dependencias
npm install

# Verificar que ts-node esté instalado
npm install -g ts-node
```

### Error de permisos:
```bash
# Verificar permisos de escritura en la base de datos
# Verificar que el usuario tenga permisos de inserción
```
