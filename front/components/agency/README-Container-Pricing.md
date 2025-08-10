# 🚢 Precios por Tipo de Contenedor - PTYSS

## 📋 Descripción

Se ha implementado un sistema de precios diferenciados por tipo de contenedor en las rutas locales de PTYSS. Ahora cada ruta puede tener precios específicos para:

- **Contenedores Regulares (DV/HC)** - Dry Van y High Cube
- **Contenedores Refrigerados (RE)** - Reefer

## 🆕 Nuevas Características

### 📊 **Configuración de Rutas Locales**
- **Precio Regular**: Para contenedores DV (Dry Van) y HC (High Cube)
- **Precio Reefer**: Para contenedores RE (Reefer/Refrigerado)
- **Compatibilidad**: Mantiene compatibilidad con datos existentes

### 🎯 **Cálculo Automático de Precios**
- Al crear un registro local en PTYSS Upload, el precio se calcula automáticamente según el tipo de contenedor seleccionado
- **Contenedor RE** → Usa `priceReefer`
- **Otros tipos** → Usa `priceRegular`

### 🔄 **Actualización Dinámica**
- Al cambiar el tipo de contenedor, el precio se actualiza automáticamente
- Los precios se muestran en tiempo real en el selector de rutas

## 🛠️ Uso

### Configuración de Rutas Locales
1. Ve a **Configuración** → **Rutas Local**
2. Selecciona un esquema de rutas
3. Al crear/editar una ruta, configura ambos precios:
   - **Precio Regular (DV/HC)**: Para contenedores normales
   - **Precio Reefer (RE)**: Para contenedores refrigerados

### Crear Registro Local
1. Ve a **PTYSS Upload** → **Crear Registro Individual**
2. Selecciona el cliente (automáticamente carga sus rutas asociadas)
3. Selecciona el tipo de contenedor
4. Elige la ruta (el precio se muestra según el tipo de contenedor)
5. El precio se aplica automáticamente según la selección

## 📋 Ejemplos

### Configuración de Ruta
```
Ruta: COLON → PANAMA
- Precio Regular (DV/HC): $250.00
- Precio Reefer (RE): $350.00
```

### Cálculo en Registro
```
Cliente: ACME Corp
Contenedor: RE (Reefer)
Ruta: COLON → PANAMA
Precio aplicado: $350.00 (Precio Reefer)
```

## 🔧 Migración de Datos

Para sistemas con datos existentes, se debe ejecutar el script de migración:

```bash
cd api
npm run ts-node scripts/migratePTYSSLocalRoutesPricing.ts
```

Este script:
- ✅ Preserva los precios existentes
- ✅ Crea campos `priceRegular` y `priceReefer` basados en el precio legacy
- ✅ Mantiene compatibilidad hacia atrás

## 🎨 Interfaz Visual

### En Configuración de Rutas
- 📝 Dos campos separados para precios
- 📋 Etiquetas descriptivas para cada tipo
- 💡 Tooltips explicativos

### En Creación de Registros
- 🎯 Precio dinámico en selector de rutas
- 🏷️ Badges indicando tipo de contenedor
- 💰 Precio actualizado automáticamente

## 🔄 Compatibilidad

### Hacia Atrás
- ✅ Datos existentes funcionan sin cambios
- ✅ Campo `price` legacy mantenido
- ✅ Migración automática disponible

### Hacia Adelante
- ✅ Nuevos datos usan campos específicos
- ✅ API acepta ambos formatos
- ✅ Frontend prioriza nuevos campos

## 🚀 Beneficios

1. **Precisión**: Precios específicos por tipo de contenedor
2. **Flexibilidad**: Diferentes tarifas para servicios especializados
3. **Automatización**: Cálculo automático sin intervención manual
4. **Transparencia**: Precios claros y visibles en toda la interfaz
5. **Escalabilidad**: Base para futuros tipos de contenedor