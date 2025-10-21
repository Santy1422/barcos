# Script de Carga Masiva de Vessels - Agency

## Descripción

Este script carga masivamente 102 vessels en el catálogo de Agency. Los vessels se organizan automáticamente por línea naviera.

## Líneas Navieras Incluidas

- **MSC**: 71 vessels
- **MAERSK**: 7 vessels  
- **SEASPAN**: 6 vessels
- **HAPAG-LLOYD** (CONTI): 2 vessels
- **GSL**: 2 vessels
- **HMM** (HYUNDAI): 1 vessel
- **OTHER**: 13 vessels

## Uso

### Opción 1: Desde la raíz del proyecto

```bash
cd api
npm run seed:agency-vessels
```

### Opción 2: Ejecutar directamente

```bash
cd api
npx ts-node scripts/seedAgencyVessels.ts
```

## ⚠️ Importante

- **Este script elimina todos los vessels existentes** antes de insertar los nuevos
- Asegúrate de tener una copia de seguridad si hay vessels importantes en la base de datos
- Los vessels se crean con `isActive: true` por defecto

## Vessels Incluidos

El script carga los siguientes 102 vessels:

MSC VIDHI, CONTI MAKALU, MSC ANTONELLA, MSC MANU, MSC ANZU, MSC POLINA, MSC RUBY, JENS MAERSK, MSC YASHI B, SEASPAN BRILLIANCE, POMERENIA SKY, MSC BIANCA, MSC JENNIFER II, VALUE, MSC BALTIC III, MSC RIDA, SEASPAN BELIEF, MSC BEIJING, MSC ANTONIA, MAERSK KOLKATA, CAPE AKRITAS, MSC JULIA R., MERIDIAN, VALOR, MSC SOFIA PAZ, MSC JEONGMIN, MSC AVNI, SEASPAN BELLWETHER, MSC SHREYA B, MSC PARIS, MSC SILVANA, MSC VAISHNAVI R., MSC BARI, SEASPAN BEAUTY, JEPPESEN MAERSK, GSL MARIA, MSC NAOMI, NORTHERN MONUMENT, MSC ROMANE, SEASPAN BEYOND, HERMANN SCHULTE, GSL VIOLETTA, MSC ARUSHI R., MSC CARLOTTA, MSC NITYA B, MSC MICHELA, MSC PERLE, MAERSK MEMPHIS, CONTI ANNAPURNA, MSC RONIT R, MSC ORION, MSC SHUBA B, MSC SIYA B, MAERSK KALAMATA, MSC SASHA, VANTAGE, MSC KATYA R., MSC KANOKO, MSC ANTIGUA, MSC ALANYA, MSC BRITTANY, HYUNDAI SATURN, MSC MIRELLA, MSC NATASHA, MSC DAMLA, VALIANT, MSC MAXINE, MARCOS V, MSC ELISA, VALENCE, MSC JEWEL, SEAMAX NORWALK, SEASPAN BRAVO, MSC RAPALLO, SAN ANTONIO, MSC VITA, MSC CLEA, MSC SARA ELENA, MSC GISELLE, MSC AINO, MSC VIGO, MARGARETE SCHULTE, SPINEL, COLUMBINE MAERSK, MSC SILVIA, MSC CORUNA, BUXCOAST, GH PAMPERO, ARCHIMIDIS, AGAMEMNON, MSC METHONI, MSC CHLOE, MSC ROCHELLE, MSC CADIZ, AS CLEOPATRA, VEGA VIRGO, MSC BARBARA, MH HAMBURG, NORDIC ANNA

## Estructura de Datos

Cada vessel se crea con la siguiente estructura:

```javascript
{
  type: 'vessel',
  name: 'MSC VIDHI',
  metadata: {
    shippingLine: 'MSC' // Detectado automáticamente
  },
  isActive: true
}
```

## Salida del Script

El script mostrará:
- Número de vessels existentes
- Confirmación de eliminación de vessels existentes
- Número de vessels insertados
- Resumen agrupado por línea naviera
- Lista completa de todos los vessels cargados

## Configuración

El script usa la variable de entorno `USER_MONGO_URI` para conectarse a MongoDB (la misma que usa el backend).

Asegúrate de tener el archivo `.env` en el directorio `api` con:

```env
USER_MONGO_URI=tu_uri_de_mongodb
```

## Troubleshooting

Si el script falla con error de conexión:

1. **Verifica que MongoDB esté corriendo**
2. **Verifica que el archivo `.env` existe** en el directorio `api`
3. **Verifica que `USER_MONGO_URI` esté configurado** en el archivo `.env`
4. Asegúrate de estar en el directorio `api` al ejecutar el comando
5. Si el backend está funcionando correctamente, el script debería usar la misma conexión

