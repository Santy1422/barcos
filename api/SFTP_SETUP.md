# Configuración SFTP para SAP

## Descripción

SFTP (SSH File Transfer Protocol) es una alternativa más segura al FTP tradicional. Si el FTP no funciona correctamente, SFTP puede resolver problemas de conexión y autenticación.

## Variables de Entorno

### Variables SFTP Específicas (Recomendadas)
```env
# Configuración SFTP específica para SAP
SAP_SFTP_HOST=sftp.msc.com
SAP_SFTP_USER=tu_usuario_sftp
SAP_SFTP_PASSWORD=tu_contraseña_sftp
SAP_SFTP_PATH=/Test/Upload/SAP/001
SAP_SFTP_PORT=22
SAP_SFTP_TIMEOUT=20000
SAP_SFTP_STRICT_VENDOR=false
```

### Variables de Fallback (FTP)
Si no tienes credenciales SFTP específicas, puedes usar las mismas del FTP:
```env
# Configuración FTP (usada como fallback para SFTP)
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

### 2. Configurar credenciales SFTP
Edita el archivo `.env` y agrega las variables SFTP:

```env
# Configuración SFTP (prioritaria)
SAP_SFTP_HOST=sftp.msc.com
SAP_SFTP_USER=SAP_PanamaTSG
SAP_SFTP_PASSWORD=contraseña_correcta_aqui
SAP_SFTP_PATH=/Test/Upload/SAP/001
SAP_SFTP_PORT=22

# Configuración FTP (fallback)
SAP_FTP_HOST=ftp.msc.com
SAP_FTP_USER=SAP_PanamaTSG
SAP_FTP_PASSWORD=contraseña_correcta_aqui
SAP_FTP_PATH=/Test/Upload/SAP/001
```

### 3. Reiniciar servidor
```bash
npm run dev
```

## Testing

### Herramientas de diagnóstico disponibles:

1. **Test de conexión SFTP**: `/api/invoices/test-sftp-connection`
   - Prueba conexión SSH/SFTP
   - Verifica acceso al directorio
   - Prueba escritura de archivos
   
2. **Envío XML via SFTP**: `/api/invoices/:invoiceId/send-xml-to-sap-sftp`
   - Envía XML usando SFTP
   - Más seguro que FTP tradicional

### Desde la interfaz

1. Abrir cualquier factura con XML
2. Click en el botón **XML** (verde)
3. Usar botones de diagnóstico:
   - **🟣 "Probar SFTP"** - Prueba conexión SFTP
   - **🟣 "Enviar a SAP (SFTP)"** - Envía usando SFTP

## Ventajas de SFTP

### ✅ Seguridad
- **Cifrado completo**: Todos los datos se transmiten cifrados
- **Autenticación robusta**: Usa SSH para autenticación
- **Sin interceptación**: Imposible capturar credenciales en tránsito

### ✅ Confiabilidad
- **Conexiones persistentes**: Menos problemas de timeout
- **Verificación de integridad**: Detecta corrupción de archivos
- **Resume de transferencias**: Puede continuar transferencias interrumpidas

### ✅ Compatibilidad
- **Puerto estándar**: Puerto 22 (más comúnmente abierto)
- **Menos restricciones**: Menos bloqueado por firewalls corporativos
- **Soporte universal**: Disponible en todos los servidores modernos

## Logs esperados

### ✅ Configuración correcta:
```
✅ Configuración SFTP específica cargada desde variables de entorno
🔧 Configuración SFTP: {
  host: 'sftp.msc.com',
  username: 'SAP_PanamaTSG',
  passwordLength: 20,
  path: '/Test/Upload/SAP/001',
  port: 22,
  configSource: 'SFTP_SPECIFIC'
}
[SFTP SUCCESS] Conexión SSH establecida exitosamente
[SFTP SUCCESS] Sesión SFTP creada exitosamente
[SFTP SUCCESS] Archivo XML subido exitosamente via SFTP
```

### ❌ Credenciales incorrectas:
```
[SFTP ERROR] Error de conexión SSH: All configured authentication methods failed
[SFTP ERROR] Error: Authentication failed
```

### ⚠️ Variables faltantes:
```
⚠️ Variables de entorno SFTP/FTP faltantes
⚠️ Usando valores por defecto (no recomendado para producción)
```

## Comparación FTP vs SFTP

| Característica | FTP | SFTP |
|---|---|---|
| **Puerto** | 21 | 22 |
| **Cifrado** | ❌ No | ✅ Sí |
| **Autenticación** | Usuario/Contraseña | SSH |
| **Seguridad** | Baja | Alta |
| **Firewall** | A menudo bloqueado | Raramente bloqueado |
| **Velocidad** | Más rápido | Ligeramente más lento |
| **Confiabilidad** | Menos confiable | Más confiable |

## Troubleshooting

### Error "All configured authentication methods failed"
- ✅ **Diagnóstico**: Credenciales incorrectas
- ✅ **Solución**: Verificar usuario y contraseña SFTP

### Error "Connection timeout"
- ✅ **Diagnóstico**: Puerto 22 bloqueado o servidor no responde
- ✅ **Solución**: Verificar conectividad al puerto 22

### Error "Permission denied"
- ✅ **Diagnóstico**: Sin permisos de escritura en directorio
- ✅ **Solución**: Contactar administrador del servidor

## Estructura de archivos

```
api/
├── .env                     # Credenciales (NO commitear)
├── .env.example            # Plantilla de ejemplo
├── src/config/sftpConfig.ts # Configuración SFTP centralizada
├── src/controllers/invoicesControllers/
│   ├── sendXmlToSapSftp.ts # Controlador SFTP
│   └── testSftpConnection.ts # Test de conexión SFTP
├── FTP_SETUP.md           # Documentación FTP
└── SFTP_SETUP.md          # Esta documentación
```

## Migración desde FTP

### 1. Probar SFTP
```bash
# Usar el botón "Probar SFTP" en la interfaz
# O hacer POST a /api/invoices/test-sftp-connection
```

### 2. Configurar credenciales
```env
# Agregar variables SFTP específicas
SAP_SFTP_HOST=sftp.msc.com
SAP_SFTP_USER=tu_usuario
SAP_SFTP_PASSWORD=tu_contraseña
```

### 3. Usar SFTP para envíos
- En la interfaz, hacer click en "Probar SFTP"
- Si es exitoso, automáticamente se usará SFTP para envíos
- Los botones mostrarán "(SFTP)" en lugar de "(FTP)"

## Seguridad

- ✅ El archivo `.env` está incluido en `.gitignore`
- ✅ Las credenciales no están hardcodeadas en el código
- ✅ SFTP cifra todos los datos en tránsito
- ✅ Autenticación SSH es más segura que FTP
- ⚠️ Mantener credenciales seguras y rotarlas regularmente 