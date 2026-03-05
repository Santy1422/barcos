# Roadmap: Export de Rutas - Analisis de Riesgos

## Timeline Estimado

```
Dia 1: Trucking + PTYSS Trasiego (2-3 horas)
Dia 2: PTYSS Local + Agency (2-3 horas)
Dia 3: Testing + Deploy (1-2 horas)
```

---

## Analisis de Riesgos por Componente

### RIESGO GENERAL DEL PROYECTO: MUY BAJO (5%)

**Justificacion:**
- Solo se agregan botones y funciones de export en frontend
- NO se modifica backend
- NO se modifica base de datos
- NO se cambian APIs existentes
- Se usan librerias que YA estan instaladas

---

## Riesgos Detallados

### 1. Trucking Config Export

| Riesgo | Probabilidad | Impacto | Mitigacion |
|--------|--------------|---------|------------|
| Boton no aparece | 5% | Bajo | Verificar imports de iconos |
| Error al generar Excel | 2% | Bajo | Try-catch con mensaje de error |
| Datos incorrectos | 3% | Medio | Mapear campos exactos del schema |
| Pagina se congela (muchos datos) | 10% | Bajo | Limitar a datos visibles o paginar |
| Rompe funcionalidad existente | **1%** | Alto | No tocar codigo existente |

**Probabilidad de exito: 99%**

---

### 2. PTYSS Trasiego Export

| Riesgo | Probabilidad | Impacto | Mitigacion |
|--------|--------------|---------|------------|
| Mismos riesgos que Trucking | ~5% | Bajo | Mismo patron de codigo |
| Campos diferentes no mapeados | 5% | Bajo | Revisar ptyssRouteSchema.ts |

**Probabilidad de exito: 98%**

---

### 3. PTYSS Local Export

| Riesgo | Probabilidad | Impacto | Mitigacion |
|--------|--------------|---------|------------|
| Estado no esta en Redux | 15% | Medio | Verificar como se cargan los datos |
| Componente usa estado local | 20% | Medio | Adaptar para usar estado local |
| Relacion con clientes | 10% | Bajo | Incluir clientName en export |

**Probabilidad de exito: 90%**

---

### 4. Agency Routes Export

| Riesgo | Probabilidad | Impacto | Mitigacion |
|--------|--------------|---------|------------|
| Schema complejo (pricing array) | 25% | Medio | Aplanar estructura para Excel |
| Multiples tipos de ruta | 15% | Bajo | Exportar en columnas separadas |
| Datos relacionados (locations) | 20% | Medio | Incluir IDs o nombres |

**Probabilidad de exito: 85%**

---

## Matriz de Riesgo General

```
                    IMPACTO
                 Bajo    Medio    Alto
              +--------+--------+--------+
    Alta      |        |        |        |
              +--------+--------+--------+
P   Media     |   4    |   3    |        |
R             +--------+--------+--------+
O   Baja      |   1,2  |        |        |
B             +--------+--------+--------+
    Muy Baja  |        |        |  ALL   |
              +--------+--------+--------+

Leyenda:
1 = Trucking Export
2 = PTYSS Trasiego Export
3 = PTYSS Local Export
4 = Agency Routes Export
ALL = Romper funcionalidad existente
```

---

## Que PUEDE Salir Mal (y que hacer)

### Escenario 1: El boton no hace nada
**Probabilidad:** 5%
**Causa:** Error en el handler o import faltante
**Solucion:** Revisar console del browser, agregar logs

### Escenario 2: Excel se descarga vacio
**Probabilidad:** 3%
**Causa:** Datos no cargados en el momento del click
**Solucion:** Verificar que routes.length > 0 antes de exportar

### Escenario 3: Excel tiene datos incorrectos
**Probabilidad:** 5%
**Causa:** Mapeo incorrecto de campos
**Solucion:** Comparar con datos en pantalla, ajustar mapeo

### Escenario 4: Browser se congela
**Probabilidad:** 2% (solo con 50k+ registros)
**Causa:** Demasiados datos para procesar en browser
**Solucion:** Exportar solo datos filtrados/visibles

### Escenario 5: Error de TypeScript
**Probabilidad:** 10%
**Causa:** Tipos no coinciden
**Solucion:** Agregar tipos correctos o usar `as any` temporalmente

### Escenario 6: Se rompe algo existente
**Probabilidad:** <1%
**Causa:** Modificar codigo que no debia tocarse
**Solucion:** SOLO agregar codigo nuevo, NO modificar existente

---

## Que NO Puede Pasar

| Situacion | Por que NO puede pasar |
|-----------|------------------------|
| Base de datos corrupta | No tocamos el backend |
| APIs dejan de funcionar | No modificamos APIs |
| Usuarios no pueden loguear | No tocamos auth |
| Datos se pierden | Solo leemos, no escribimos |
| Otros modulos fallan | Cambios aislados por archivo |
| Deploy falla | Solo cambios de frontend |

---

## Plan de Rollback

### Si algo falla en produccion:

```bash
# Opcion 1: Revertir commit
git revert HEAD
git push origin main
npm run deploy

# Opcion 2: Deploy de version anterior
git checkout HEAD~1
npm run deploy
```

**Tiempo de rollback:** < 5 minutos

---

## Checklist Pre-Deploy

- [ ] Codigo compila sin errores (`npm run build`)
- [ ] Boton aparece en UI
- [ ] Click descarga archivo
- [ ] Archivo tiene extension .xlsx
- [ ] Archivo abre en Excel
- [ ] Datos coinciden con pantalla
- [ ] No hay errores en console
- [ ] Funcionalidad existente sigue funcionando
  - [ ] Crear ruta funciona
  - [ ] Editar ruta funciona
  - [ ] Eliminar ruta funciona
  - [ ] Importar precios funciona

---

## Metricas de Exito

| Metrica | Objetivo |
|---------|----------|
| Tiempo de implementacion | < 1 dia por modulo |
| Bugs en produccion | 0 criticos, < 2 menores |
| Rollbacks necesarios | 0 |
| Downtime | 0 minutos |

---

## Orden de Implementacion (por riesgo)

1. **Trucking** - Mas simple, patron base (Riesgo: 1%)
2. **PTYSS Trasiego** - Casi identico a Trucking (Riesgo: 2%)
3. **PTYSS Local** - Estado puede ser diferente (Riesgo: 10%)
4. **Agency** - Schema mas complejo (Riesgo: 15%)

**Estrategia:** Empezar por el mas facil, validar patron, replicar.

---

## Conclusion

**Riesgo total del proyecto: MUY BAJO**

- No se modifica backend
- No se modifica base de datos
- No se cambian APIs
- Solo se agrega funcionalidad nueva en frontend
- Rollback instantaneo disponible
- Librerias ya instaladas

**Probabilidad de completar sin romper nada: 95%+**
