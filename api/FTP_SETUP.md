# Configuración FTP para SAP

## Variables de Entorno Requeridas

Para configurar las credenciales FTP de SAP, crea un archivo `.env` en el directorio `api/` con las siguientes variables:

```env
# Configuración FTP para SAP
SAP_FTP_HOST=ftp.msc.com
SAP_FTP_USER=tu_usuario_ftp
SAP_FTP_PASSWORD=tu_contraseña_ftp
SAP_FTP_PATH=/Test/Upload/SAP/001
```

## Instrucciones de Configuración

### 1. Crear archivo .env

```bash
cd api
cp .env.example .env
# Editar .env con las credenciales correctas
```

### 2. Configurar credenciales

Edita el archivo `.env` y reemplaza los valores:

```env
SAP_FTP_HOST=ftp.msc.com
SAP_FTP_USER=SAP_PanamaTSG
SAP_FTP_PASSWORD=contraseña_correcta_aqui
SAP_FTP_PATH=/Test/Upload/SAP/001
```

**⚠️ IMPORTANTE**: 
- El servidor usa **FTP tradicional** (puerto 21), no SFTP
- Credenciales actuales están incorrectas según diagnóstico
- Contactar proveedor para credenciales válidas

### 3. Reiniciar servidor

```bash
npm run dev
```

## Testing

### Herramientas de diagnóstico disponibles:

1. **Diagnóstico completo**: `/api/invoices/diagnose-ftp-server`
   - Prueba AMBOS FTP y SFTP
   - Recomienda el protocolo correcto
   
2. **Debug de autenticación**: `/api/invoices/debug-ftp-auth`
   - Analiza credenciales en detalle
   - Detecta caracteres invisibles
   
3. **Test de conexión**: `/api/invoices/test-ftp-connection`
   - Prueba conexión, navegación y escritura

### Desde la interfaz

1. Abrir cualquier factura con XML
2. Click en el botón **XML** (verde)
3. Usar botones de diagnóstico:
   - **🟣 "Diagnóstico FTP/SFTP"** - Determina protocolo correcto
   - **🟠 "Debug Auth"** - Analiza credenciales

## Logs esperados

### ✅ Configuración correcta:
```
✅ Configuración FTP cargada desde variables de entorno
🔧 Configuración FTP: {
  host: 'ftp.msc.com',
  user: 'SAP_PanamaTSG',
  passwordLength: 20,
  path: '/Test/Upload/SAP/001',
  fromEnv: true
}
[FTP SUCCESS] Conexión FTP establecida exitosamente
[FTP SUCCESS] Archivo XML subido exitosamente
```

### ❌ Credenciales incorrectas (estado actual):
```
Connected to 40.118.31.218:21 ✅
> USER SAP_PanamaTSG
< 331 Password required for SAP_PanamaTSG. ✅
> PASS ###
< 530 Not logged in. ❌

[FTP ERROR] Error de autenticación FTP - Credenciales incorrectas
```

### ⚠️ Variables faltantes:
```
⚠️ Variables de entorno FTP faltantes: ['SAP_FTP_PASSWORD']
⚠️ Usando valores por defecto (no recomendado para producción)
```

## Seguridad

- ✅ El archivo `.env` está incluido en `.gitignore`
- ✅ Las credenciales no están hardcodeadas en el código
- ✅ Valores por defecto solo para desarrollo/testing
- ⚠️ FTP tradicional no cifra datos (normal para servidores corporativos)

## Estructura de archivos

```
api/
├── .env                     # Credenciales (NO commitear)
├── .env.example            # Plantilla de ejemplo
├── src/config/ftpConfig.ts # Configuración FTP centralizada
├── FTP_SETUP.md           # Esta documentación
└── SFTP_SETUP.md          # Documentación SFTP (deprecated)
```

## Resultados del Diagnóstico

### 🎯 Estado actual confirmado:
- **✅ Servidor:** `ftp.msc.com` responde en puerto 21
- **✅ Protocolo:** FTP tradicional (NO SFTP)
- **✅ Usuario:** `SAP_PanamaTSG` es válido
- **❌ Contraseña:** `6whLgP4RKRhnTFEfYPt0` es incorrecta

### 🚀 Protocolo recomendado: **FTP**
- Puerto 21
- Sin cifrado
- Librería `basic-ftp`

## Troubleshooting

### Error "530 Not logged in"
- ✅ **Diagnóstico:** Credenciales incorrectas confirmado
- ✅ **Servidor funciona:** Conexión exitosa al puerto 21
- ✅ **Usuario válido:** Servidor acepta `SAP_PanamaTSG`
- ❌ **Contraseña incorrecta:** Solicitar nueva contraseña al proveedor

### SFTP no funciona
- ✅ **Confirmado:** El servidor NO soporta SFTP (puerto 22)
- ✅ **Solución:** Usar FTP tradicional implementado

### Variables no encontradas
- Verificar que `.env` existe en directorio `api/`
- Verificar sintaxis del archivo `.env`
- Reiniciar servidor después de cambios

## Próximos pasos

1. **Contactar proveedor** para credenciales FTP correctas
2. **Actualizar contraseña** en archivo `.env`
3. **Probar envío** usando botón "Enviar a SAP"

## Comandos útiles para debug

### Verificar conexión FTP manualmente (si tienes cliente FTP):
```bash
ftp ftp.msc.com
# Usuario: SAP_PanamaTSG
# Contraseña: [solicitar nueva]
```

### Test desde el sistema:
1. **Botón "Diagnóstico FTP/SFTP"** - Confirma protocolo
2. **Botón "Debug Auth"** - Analiza credenciales actuales
3. **Botón "Enviar a SAP"** - Prueba envío real (cuando credenciales sean correctas)