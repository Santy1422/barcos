# Configuración de API - Frontend

Este documento explica cómo configurar el frontend para conectarse a diferentes entornos de la API.

## Entornos Disponibles

### 🏠 Desarrollo Local
- **URL**: `http://localhost:8080`
- **Uso**: Para desarrollo local cuando el backend está corriendo en tu máquina

### 🚀 Producción (Railway)
- **URL**: `https://barcos-production-3aad.up.railway.app`
- **Uso**: Para conectarse al servidor de producción en Railway

## Cómo Cambiar de Entorno

### Método 1: Archivo .env.local (Recomendado)

1. Abre el archivo `.env.local` en la raíz del proyecto frontend
2. Para usar **desarrollo local**:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:8080
   ```

3. Para usar **producción**:
   ```env
   NEXT_PUBLIC_API_URL=https://barcos-production-3aad.up.railway.app
   ```

4. Reinicia el servidor de desarrollo:
   ```bash
   npm run dev
   ```

### Método 2: Variables de Entorno del Sistema

Puedes establecer la variable de entorno directamente al ejecutar el proyecto:

```bash
# Para desarrollo local
NEXT_PUBLIC_API_URL=http://localhost:8080 npm run dev

# Para producción
NEXT_PUBLIC_API_URL=https://barcos-production-3aad.up.railway.app npm run dev
```

## Verificación

Para verificar qué URL está siendo utilizada:

1. Abre las herramientas de desarrollador del navegador (F12)
2. Ve a la pestaña "Network" o "Red"
3. Realiza alguna acción que haga una petición a la API
4. Verifica que las peticiones se dirijan a la URL correcta

## Archivos Importantes

- **`.env.local`**: Configuración de entorno local
- **`.env.example`**: Plantilla con ejemplos de configuración
- **`lib/api-config.ts`**: Utilidad para manejar URLs de API dinámicamente
- **`next.config.mjs`**: Configuración de rewrites para proxy de API

## Notas Importantes

- ⚠️ **Siempre reinicia el servidor** después de cambiar variables de entorno
- 🔒 **No commitees** archivos `.env.local` con configuraciones de producción
- 📝 **Usa `.env.example`** como referencia para nuevos desarrolladores
- 🔄 **El proxy automático** en `next.config.mjs` redirige `/api/*` a la URL configurada

## Solución de Problemas

### Error de CORS
Si ves errores de CORS, verifica que:
1. El backend esté configurado para aceptar requests del frontend
2. La URL en `NEXT_PUBLIC_API_URL` sea correcta

### Error 404 en API
Si las rutas de API devuelven 404:
1. Verifica que el backend esté corriendo
2. Confirma que la URL base sea correcta
3. Revisa que los endpoints existan en el backend

### Variables de Entorno No Se Aplican
1. Reinicia completamente el servidor de desarrollo
2. Verifica que el nombre de la variable sea exactamente `NEXT_PUBLIC_API_URL`
3. Asegúrate de que no haya espacios extra en el archivo `.env.local`