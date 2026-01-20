# 🚀 **GUÍA COMPLETA DE DEPLOYMENT**

## 📋 **ARQUITECTURA DE AMBIENTES**

### **🌍 RESUMEN GENERAL**
```
📦 BRANCH: main (único branch en producción)
├── 🏗️ Azure (Manual)     → Comando manual
├── ☁️ Vercel (Auto)      → Auto-deploy
└── 🚂 Railway (Auto)    → Auto-deploy
```

---

## 🏗️ **PRODUCCIÓN AZURE (Manual)**

### **📊 Configuración:**
- **Dominio**: https://sapinterface.ptymgmt.com
- **Servidor**: Azure VM `4.151.121.68`
- **Branch**: `main`
- **Deploy**: Manual con comando
- **MongoDB**: Atlas `mongodb+srv://admin:Hola.1422%21@cluster0.ghtedex.mongodb.net/`

### **🚀 Deploy Manual:**
```bash
# Desde tu terminal local
ssh complianceuser@4.151.121.68 "./manual-deploy.sh"
```

### **⚡ Deploy Directo (sin confirmación):**
```bash
ssh complianceuser@4.151.121.68 "./auto-deploy.sh"
```

### **🔧 Lo que hace el deploy:**
1. ✅ `git pull origin main`
2. ✅ `npm install` (API + Frontend)
3. ✅ `npm run build` (API + Frontend)
4. ✅ `pm2 restart barcos-api barcos-frontend`
5. ✅ `pm2 save`

### **📋 Servicios PM2:**
```bash
pm2 status
├── barcos-api (puerto 3001)
├── barcos-frontend (puerto 3000)
├── barcos-webhook (puerto 3002)
└── barcos-webhook-auto (puerto 3002)
```

### **🔍 Verificación:**
- **Frontend**: https://sapinterface.ptymgmt.com
- **API Health**: https://sapinterface.ptymgmt.com/api/health
- **SSL**: Let's Encrypt

---

## ☁️ **VERCEL (Auto-Deploy)**

### **📊 Configuración:**
- **Dominio**: https://barcos-vercel.app (ejemplo)
- **Branch**: `main`
- **Deploy**: Automático en push
- **Build**: Next.js optimizado

### **🔄 Deploy Automático:**
```bash
git push origin main  # Se despliega automáticamente
```

### **⚙️ Variables de Entorno Vercel:**
```env
NEXT_PUBLIC_API_URL=https://barcos-api-railway.com
NEXT_PUBLIC_ENVIRONMENT=production
NODE_ENV=production
```

### **🔧 Configuración en vercel.json:**
```json
{
  "builds": [
    {
      "src": "front/package.json",
      "use": "@vercel/next"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/front/$1"
    }
  ]
}
```

---

## 🚂 **RAILWAY (Auto-Deploy)**

### **📊 Configuración:**
- **API URL**: https://barcos-api-railway.up.railway.app
- **Branch**: `main`
- **Deploy**: Automático en push
- **MongoDB**: Railway interno

### **🔄 Deploy Automático:**
```bash
git push origin main  # Se despliega automáticamente
```

### **⚙️ Variables de Entorno Railway:**
```env
PORT=3001
NODE_ENV=production
USER_MONGO_URI=mongodb://mongo:uGiyrTQJDXyusAZNqlzBOHRdaWxGrSGJ@junction.proxy.rlwy.net:15000
JWT_ACCESCODE=railway-jwt-secret
POWERBI_API_KEY=railway-powerbi-key
```

### **🔧 railway.json:**
```json
{
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

---

## 🔄 **FLUJO DE TRABAJO COMPLETO**

### **🎯 Desarrollo → Producción:**

1. **Desarrollo Local:**
   ```bash
   # Hacer cambios
   git add .
   git commit -m "feat: nuevo feature"
   ```

2. **Push a Main:**
   ```bash
   git push origin main
   ```

3. **Auto-Deploy (Vercel + Railway):**
   - ✅ Vercel se actualiza automáticamente
   - ✅ Railway se actualiza automáticamente

4. **Manual Deploy (Azure):**
   ```bash
   ssh complianceuser@4.151.121.68 "./manual-deploy.sh"
   ```

### **⚡ Alias Recomendados:**
```bash
# Agregar a ~/.bashrc o ~/.zshrc
alias deploy-azure="ssh complianceuser@4.151.121.68 './manual-deploy.sh'"
alias deploy-azure-force="ssh complianceuser@4.151.121.68 './auto-deploy.sh'"
alias status-azure="ssh complianceuser@4.151.121.68 'pm2 status'"
```

**Uso:**
```bash
deploy-azure        # Deploy con confirmación
deploy-azure-force  # Deploy directo
status-azure        # Ver estado servicios
```

---

## 🛠️ **COMANDOS DE GESTIÓN**

### **🏗️ Azure Commands:**
```bash
# Deploy con confirmación
ssh complianceuser@4.151.121.68 "./manual-deploy.sh"

# Deploy directo
ssh complianceuser@4.151.121.68 "./auto-deploy.sh"

# Ver estado
ssh complianceuser@4.151.121.68 "pm2 status"

# Ver logs
ssh complianceuser@4.151.121.68 "pm2 logs barcos-api --lines 20"

# Reiniciar servicio específico
ssh complianceuser@4.151.121.68 "pm2 restart barcos-api"

# Monitoreo en tiempo real
ssh complianceuser@4.151.121.68 "pm2 monit"
```

### **☁️ Vercel Commands:**
```bash
# Deploy desde CLI (opcional)
vercel --prod

# Ver deployments
vercel ls

# Ver logs
vercel logs
```

### **🚂 Railway Commands:**
```bash
# Ver deployments
railway status

# Ver logs
railway logs

# Variables de entorno
railway variables
```

---

## 🔍 **MONITOREO Y VERIFICACIÓN**

### **📊 URLs de Verificación:**

| Ambiente | Frontend | API Health | Tipo |
|----------|----------|------------|------|
| **Azure** | https://sapinterface.ptymgmt.com | https://sapinterface.ptymgmt.com/api/health | Manual |
| **Vercel** | https://barcos-vercel.app | N/A | Auto |
| **Railway** | N/A | https://barcos-api-railway.up.railway.app/api/health | Auto |

### **🚨 Checklist Post-Deploy:**
```bash
# Azure
curl -I https://sapinterface.ptymgmt.com/api/health
curl -I https://sapinterface.ptymgmt.com

# Railway
curl -I https://barcos-api-railway.up.railway.app/api/health

# Vercel
curl -I https://barcos-vercel.app
```

---

## 🐛 **TROUBLESHOOTING**

### **🏗️ Azure Issues:**

**API no responde:**
```bash
ssh complianceuser@4.151.121.68 "pm2 logs barcos-api --lines 50"
ssh complianceuser@4.151.121.68 "pm2 restart barcos-api"
```

**Frontend no carga:**
```bash
ssh complianceuser@4.151.121.68 "pm2 logs barcos-frontend --lines 50"
ssh complianceuser@4.151.121.68 "pm2 restart barcos-frontend"
```

**SSL Issues:**
```bash
ssh complianceuser@4.151.121.68 "sudo certbot certificates"
ssh complianceuser@4.151.121.68 "sudo certbot renew"
```

### **☁️ Vercel Issues:**

**Build Failed:**
- Verificar `vercel.json`
- Revisar variables de entorno
- Verificar Next.js config

**Domain Issues:**
- Verificar DNS en Vercel dashboard
- Verificar SSL certificate

### **🚂 Railway Issues:**

**Deploy Failed:**
- Verificar `railway.json`
- Revisar variables de entorno
- Verificar logs en Railway dashboard

**Database Issues:**
- Verificar MongoDB Railway connection
- Revisar Railway database logs

---

## 🔄 **ROLLBACK PROCEDURES**

### **🏗️ Azure Rollback:**
```bash
# Conectar a Azure
ssh complianceuser@4.151.121.68

# Ver commits recientes
cd /home/complianceuser/apps/barcos
git log --oneline -10

# Rollback a commit anterior
git checkout <commit-hash>
./auto-deploy.sh

# O volver a main
git checkout main
git reset --hard HEAD~1  # Retroceder 1 commit
./auto-deploy.sh
```

### **☁️ Vercel Rollback:**
- Ir a Vercel Dashboard
- Deployments → Seleccionar deployment anterior
- Promote to Production

### **🚂 Railway Rollback:**
- Ir a Railway Dashboard
- Deployments → Seleccionar deployment anterior
- Redeploy

---

## 📋 **RESUMEN EJECUTIVO**

### **✅ Deploy Workflow:**

1. **Desarrollo**: Hacer cambios locales
2. **Push**: `git push origin main`
3. **Auto**: Vercel y Railway se actualizan solos
4. **Manual**: Ejecutar comando para Azure

### **🎯 Comandos Esenciales:**
```bash
# Push cambios
git push origin main

# Deploy Azure
ssh complianceuser@4.151.121.68 "./manual-deploy.sh"

# Verificar todo
curl -I https://sapinterface.ptymgmt.com/api/health
curl -I https://barcos-api-railway.up.railway.app/api/health
curl -I https://barcos-vercel.app
```

### **📞 Contactos:**
- **Desarrollador**: Santiago García
- **Email**: santy.garcia1996g@gmail.com
- **Azure VM**: `complianceuser@4.151.121.68`
- **Contraseña VM**: `Compl1anc3us3r@`

---

**🎉 ¡Deployment configurado correctamente en los 3 ambientes!** 🚀

- **Azure**: Manual, control total
- **Vercel**: Auto, frontend optimizado  
- **Railway**: Auto, API backend confiable