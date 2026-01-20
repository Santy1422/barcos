# 🚢 **BARCOS CRM - GUÍA DE AMBIENTES**

## 📋 **RESUMEN DEL PROYECTO**

Sistema CRM para gestión de facturación marítima con múltiples módulos:
- **PTYSS**: Gestión de servicios portuarios
- **Trucking**: Logística y transporte
- **Agency**: Servicios de agencia
- **ShipChandler**: Suministros marítimos

---

## 🌍 **ARQUITECTURA DE AMBIENTES**

### **📊 AMBIENTE PRODUCCIÓN**
```
🏗️ VM Azure: 4.151.121.68
🌐 Dominio: sapinterface.ptymgmt.com
🔗 Acceso: https://sapinterface.ptymgmt.com

📦 Servicios:
├── Frontend: puerto 3000 (Next.js)
├── API: puerto 3001 (Express + TypeScript)
└── Webhook: puerto 3002 (Deployment)

🗄️ Base de Datos: MongoDB Atlas (Cloud)
📝 Branch: main
🔒 SSL: Let's Encrypt
```

### **🧪 AMBIENTE TESTING**
```
🏗️ VM Azure: 4.151.121.68 (misma VM)
🌐 Dominio: testtest.duckdns.org
🔗 Acceso: http://testtest.duckdns.org

📦 Servicios:
├── Frontend: puerto 3003 (Next.js)
├── API: puerto 3004 (Express + TypeScript)
└── Nginx: configuración separada

🗄️ Base de Datos: MongoDB Railway (compartida con producción)
📝 Branch: testing-notas
🔒 SSL: Pendiente configurar
```

---

## 🔧 **CONFIGURACIÓN TÉCNICA**

### **MongoDB Atlas (Producción) / Railway (Testing)**
```bash
# URI Producción (Atlas)
USER_MONGO_URI=mongodb+srv://admin:Hola.1422%21@cluster0.ghtedex.mongodb.net/

# URI Testing (Railway - compartida)
USER_MONGO_URI=mongodb://mongo:uGiyrTQJDXyusAZNqlzBOHRdaWxGrSGJ@junction.proxy.rlwy.net:15000
```

### **Variables de Entorno**

#### **Producción (.env)**
```env
PORT=3001
NODE_ENV=production
USER_MONGO_URI=mongodb+srv://admin:Hola.1422%21@cluster0.ghtedex.mongodb.net/
JWT_ACCESCODE=production-jwt-azure-secret-2024
POWERBI_API_KEY=production-powerbi-api-key-azure
```

#### **Testing (.env.testing)**
```env
PORT=3004
NODE_ENV=testing
USER_MONGO_URI=mongodb://mongo:uGiyrTQJDXyusAZNqlzBOHRdaWxGrSGJ@junction.proxy.rlwy.net:15000
JWT_ACCESCODE=testing-jwt-secret-key
POWERBI_API_KEY=testing-powerbi-api-key
ENVIRONMENT=testing
DEBUG=true
```

### **Frontend Configuración**

#### **Producción (.env.local)**
```env
NEXT_PUBLIC_API_URL=https://sapinterface.ptymgmt.com
```

#### **Testing (.env.local.testing)**
```env
NEXT_PUBLIC_API_URL=http://testtest.duckdns.org
NODE_ENV=development
NEXT_PUBLIC_ENVIRONMENT=testing
PORT=3003
```

---

## 🔄 **PROCESO DE DEPLOYMENT**

### **1. Desarrollo → Testing**
```bash
# Conectar a VM
ssh complianceuser@4.151.121.68

# Deploy cambios a testing
./deploy-testing.sh
```

### **2. Testing → Producción**
```bash
# Si testing aprobado, merge a main
git checkout main
git merge testing-notas
git push origin main

# Deploy a producción
./manual-deploy.sh
```

---

## 🧪 **NUEVA FUNCIONALIDAD: COLUMNA NOTAS**

### **¿Qué se agregó?**
- ✅ **Columna "Notas"** en todas las tablas de facturas
- ✅ **Tooltip** para notas largas
- ✅ **Responsive**: se oculta en móvil
- ✅ **Export Excel** incluye notas (PTYSS)

### **Módulos Afectados:**
1. **PTYSS Records** (`/ptyss/records`)
2. **Trucking Records** (`/trucking/records`)
3. **Agency Records** (`/agency/records`)
4. **ShipChandler Records** (`/shipchandler/records`)

### **Archivos Modificados:**
- `components/ptyss/ptyss-records.tsx`
- `components/trucking/trucking-records.tsx`
- `components/agency/agency-records.tsx`
- `components/shipchandler/shipchandler-records.tsx`

---

## 📝 **GESTIÓN DE SERVICIOS**

### **Estado de Servicios (PM2)**
```bash
pm2 status

# Producción:
├── barcos-api (puerto 3001)
├── barcos-frontend (puerto 3000)
└── barcos-webhook (puerto 3002)

# Testing:
├── barcos-api-testing (puerto 3004)
└── barcos-frontend-testing (puerto 3003)
```

### **Scripts de Gestión**
```bash
# Deploy testing
./deploy-testing.sh

# Parar ambiente testing
./stop-testing.sh

# Iniciar ambiente testing
./start-testing.sh
```

---

## 🌐 **DNS Y DOMINIOS**

### **DuckDNS Configuración**
```
Account: santy.garcia1996g@gmail.com

Dominios:
├── sapinterface.ptymgmt.com → 4.151.121.68 (Producción)
└── testtest.duckdns.org → 4.151.121.68 (Testing)
```

### **Nginx Virtual Hosts**
```bash
# Producción
/etc/nginx/sites-available/barcos

# Testing  
/etc/nginx/sites-available/barcos-testing
```

---

## 🔒 **SEGURIDAD Y SSL**

### **Certificados SSL**
```bash
# Producción (configurado)
https://sapinterface.ptymgmt.com

# Testing (pendiente)
# sudo certbot --nginx -d testtest.duckdns.org
```

### **Headers de Seguridad**
- `X-Frame-Options: SAMEORIGIN`
- `X-Content-Type-Options: nosniff`
- `X-Environment: TESTING` (solo testing)

---

## 🧪 **GUÍA DE TESTING**

### **URLs de Testing**
- 🌐 **Frontend**: http://testtest.duckdns.org
- 🔧 **API Health**: http://testtest.duckdns.org/api/health
- 📊 **Analytics**: http://testtest.duckdns.org/api/analytics/metrics

### **Test Cases Columna Notas**

#### **1. Verificar Visualización**
- [ ] Abrir cada módulo de records
- [ ] Verificar que aparece columna "Notas"
- [ ] Comprobar que se oculta en móvil

#### **2. Funcionalidad Notas**
- [ ] Crear factura nueva con notas
- [ ] Editar notas existentes  
- [ ] Verificar tooltip en notas largas
- [ ] Probar export Excel (PTYSS)

#### **3. Responsive Design**
- [ ] Desktop: columna visible
- [ ] Mobile: columna oculta
- [ ] Tablet: verificar breakpoints

---

## 🚨 **TROUBLESHOOTING**

### **Servicios Caídos**
```bash
# Verificar estado
pm2 status

# Reiniciar servicio específico
pm2 restart barcos-api-testing
pm2 restart barcos-frontend-testing

# Ver logs
pm2 logs barcos-api-testing
```

### **DNS No Resuelve**
```bash
# Verificar DNS
nslookup testtest.duckdns.org

# Debe resolver a: 4.151.121.68
```

### **SSL Issues**
```bash
# Verificar certificados
sudo certbot certificates

# Renovar si es necesario
sudo certbot renew
```

---

## 📊 **MONITOREO Y LOGS**

### **Logs de Aplicación**
```bash
# API Testing
pm2 logs barcos-api-testing --lines 100

# Frontend Testing  
pm2 logs barcos-frontend-testing --lines 100

# Nginx
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### **Métricas de Rendimiento**
```bash
# Uso de recursos
pm2 monit

# Estado de puertos
sudo netstat -tulpn | grep -E "(3000|3001|3003|3004)"
```

---

## 💰 **COSTOS Y OPTIMIZACIÓN**

### **Recursos Utilizados**
- **VM Azure**: Standard_B2s (2 vCPU, 4GB RAM)
- **MongoDB**: Atlas (Producción) + Railway (Testing)
- **SSL**: Let's Encrypt (Gratuito)
- **DNS**: DuckDNS (Gratuito)

### **Optimización**
- ✅ **Single VM**: Testing y producción en misma VM
- ✅ **Shared Database**: MongoDB Railway compartida
- ✅ **Port Separation**: No conflictos entre ambientes
- ✅ **Independent Scaling**: Servicios independientes

---

## 📋 **CHECKLIST DE DEPLOYMENT**

### **Pre-Deployment**
- [ ] Código tested localmente
- [ ] Branch `testing-notas` actualizado
- [ ] Backup de BD si necesario

### **Testing Environment**
- [ ] Deploy a testing ejecutado
- [ ] Funcionalidad probada
- [ ] Performance verificada  
- [ ] No errores en logs

### **Production Deployment**
- [ ] Testing aprobado
- [ ] Merge a `main`
- [ ] Deploy a producción
- [ ] Verificación post-deploy
- [ ] Monitoring activado

---

## 🎯 **PRÓXIMOS PASOS**

1. **Configurar SSL para Testing**
   ```bash
   sudo certbot --nginx -d testtest.duckdns.org
   ```

2. **Automatizar CI/CD**
   - GitHub Actions para auto-deploy
   - Tests automáticos
   - Rollback automático

3. **Monitoring Avanzado**
   - Alertas de errores
   - Métricas de rendimiento
   - Logs centralizados

4. **Backup Automatizado**
   - Backup diario de MongoDB
   - Backup de configuraciones
   - Recovery procedures

---

## 📞 **CONTACTO Y SOPORTE**

**Desarrollador**: Santiago García  
**Email**: santy.garcia1996g@gmail.com  
**VM SSH**: `ssh complianceuser@4.151.121.68`  

**URLs Importantes**:
- 🌐 **Prod**: https://sapinterface.ptymgmt.com
- 🧪 **Test**: http://testtest.duckdns.org (⚠️ actualizar DNS)
- 🗄️ **MongoDB**: Atlas Dashboard (Prod) / Railway Dashboard (Test)
- 🌍 **DNS**: https://duckdns.org

---

**⚠️ IMPORTANTE**: Para activar testing, actualizar DNS `testtest.duckdns.org` → `4.151.121.68`