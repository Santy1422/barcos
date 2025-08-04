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
SAP_FTP_PASSWORD=nueva_contraseña_aqui
SAP_FTP_PATH=/Test/Upload/SAP/001
```

### 3. Reiniciar servidor

```bash
npm run dev
```

## Testing

### Probar conexión FTP

El sistema incluye endpoints para probar la configuración:

1. **Debug de autenticación**: `/api/invoices/debug-ftp-auth`
2. **Test de conexión**: `/api/invoices/test-ftp-connection`

### Desde la interfaz

1. Abrir cualquier factura con XML
2. Click en el botón **XML** (verde)
3. Click en **"Debug Auth"** para probar credenciales

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

## Estructura de archivos

```
api/
├── .env                     # Credenciales (NO commitear)
├── .env.example            # Plantilla de ejemplo
├── src/config/ftpConfig.ts # Configuración centralizada
└── FTP_SETUP.md           # Esta documentación
```

## Troubleshooting

### Error "530 Not logged in"
- Verificar credenciales en `.env`
- Probar con endpoint de debug
- Contactar proveedor FTP para validar credenciales

### Variables no encontradas
- Verificar que `.env` existe en directorio `api/`
- Verificar sintaxis del archivo `.env`
- Reiniciar servidor después de cambios