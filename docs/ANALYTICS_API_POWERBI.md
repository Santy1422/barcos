# Analytics API - Documentación para Power BI

Esta documentación describe todos los endpoints de Analytics disponibles para integración con Power BI u otras herramientas de Business Intelligence.

## Información General

| Propiedad | Valor |
|-----------|-------|
| **Base URL** | `https://sapinterface.ptymgmt.com/api/analytics` |
| **Autenticación** | JWT Bearer Token |
| **Formato de Respuesta** | JSON |

### Autenticación

Todos los endpoints requieren autenticación JWT. Incluye el token en el header:

```
Authorization: Bearer <tu_token_jwt>
```

Para obtener el token, usa el endpoint de login:
```http
POST /api/users/login
Content-Type: application/json

{
  "email": "usuario@ejemplo.com",
  "password": "contraseña"
}
```

### Parámetros de Fecha Comunes

Todos los endpoints soportan los siguientes parámetros de filtrado por fecha:

| Parámetro | Tipo | Descripción | Ejemplo |
|-----------|------|-------------|---------|
| `startDate` | ISO 8601 | Fecha de inicio | `2024-01-01` |
| `endDate` | ISO 8601 | Fecha de fin | `2024-12-31` |
| `month` | Number (1-12) | Mes específico | `3` (Marzo) |
| `year` | Number | Año específico | `2024` |

**Nota:** Si se especifica `month` y `year`, estos tienen prioridad sobre `startDate` y `endDate`.

---

## Endpoints

### 1. Métricas Principales (KPIs)

```http
GET /api/analytics/metrics
```

**Descripción:** Retorna los KPIs principales del sistema.

**Parámetros:** Parámetros de fecha comunes

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "totalRevenue": 125000.50,
    "totalTransactions": 342,
    "activeClients": 45,
    "totalClients": 78,
    "invoicesCreated": 342,
    "pendingInvoices": 28,
    "completedInvoices": 314,
    "totalRecords": 1250
  },
  "filters": {
    "startDate": "2024-01-01",
    "endDate": "2024-12-31",
    "month": null,
    "year": null
  },
  "timestamp": "2024-02-24T10:30:00.000Z"
}
```

**Campos para Power BI:**
- `totalRevenue` - Ingresos totales (USD)
- `totalTransactions` - Número de transacciones
- `activeClients` - Clientes activos
- `pendingInvoices` - Facturas pendientes
- `completedInvoices` - Facturas completadas

---

### 2. Revenue por Módulo

```http
GET /api/analytics/revenue
```

**Descripción:** Análisis de ingresos desglosado por módulo y timeline.

**Parámetros:** Parámetros de fecha comunes

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "byModule": {
      "trucking": 45000.00,
      "ptyss": 38000.00,
      "shipchandler": 22000.00,
      "agency": 20000.00
    },
    "total": 125000.00,
    "timeline": [
      { "date": "2024-02-20", "amount": 5200.00, "count": 12 },
      { "date": "2024-02-21", "amount": 4800.00, "count": 10 }
    ],
    "monthlyBreakdown": [
      { "year": 2024, "month": 2, "amount": 45000.00, "count": 120 },
      { "year": 2024, "month": 1, "amount": 42000.00, "count": 115 }
    ]
  },
  "timestamp": "2024-02-24T10:30:00.000Z"
}
```

**Campos para Power BI:**
- `byModule.*` - Revenue por cada módulo
- `timeline[]` - Serie temporal para gráficos de línea
- `monthlyBreakdown[]` - Datos mensuales para tendencias

---

### 3. Métricas Operacionales

```http
GET /api/analytics/operational
```

**Descripción:** Métricas de eficiencia operacional por módulo.

**Parámetros:** Parámetros de fecha comunes

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "overallCompletionRate": 0.85,
    "truckingEfficiency": 0.90,
    "ptyssEfficiency": 0.82,
    "shipchandlerEfficiency": 0.88,
    "agencyEfficiency": 0.75,
    "averageProcessingTime": 24,
    "moduleStats": {
      "trucking": { "total": 150, "completed": 135 },
      "ptyss": { "total": 120, "completed": 98 }
    },
    "totals": {
      "invoices": 450,
      "completed": 382,
      "agencyServices": 80,
      "agencyCompleted": 60
    }
  },
  "timestamp": "2024-02-24T10:30:00.000Z"
}
```

**Campos para Power BI:**
- `*Efficiency` - Tasas de eficiencia (0-1, multiplicar por 100 para %)
- `moduleStats` - Detalles por módulo
- `totals` - Totales generales

---

### 4. Analytics de Trucking (PTG)

```http
GET /api/analytics/trucking
```

**Descripción:** Métricas específicas del módulo Trucking/PTG.

**Parámetros:** Parámetros de fecha comunes

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "totalRecords": 520,
    "totalRevenue": 45000.00,
    "totalInvoices": 150,
    "byStatus": {
      "prefactura": 12,
      "facturada": 138
    },
    "topClients": [
      { "_id": "Cliente A", "totalRevenue": 12000.00, "count": 25 },
      { "_id": "Cliente B", "totalRevenue": 8500.00, "count": 18 }
    ],
    "recentRecords": []
  },
  "timestamp": "2024-02-24T10:30:00.000Z"
}
```

---

### 5. Analytics de PTYSS

```http
GET /api/analytics/ptyss
```

**Descripción:** Métricas específicas del módulo PTYSS.

**Parámetros:** Parámetros de fecha comunes

**Respuesta:** Misma estructura que Trucking.

---

### 6. Analytics de ShipChandler

```http
GET /api/analytics/shipchandler
```

**Descripción:** Métricas específicas del módulo ShipChandler.

**Parámetros:** Parámetros de fecha comunes

**Respuesta:** Misma estructura que Trucking.

---

### 7. Analytics de Agency

```http
GET /api/analytics/agency
```

**Descripción:** Métricas específicas del módulo Agency.

**Parámetros:** Parámetros de fecha comunes

**Respuesta:** Misma estructura que Trucking, con datos de servicios de agencia.

---

### 8. Analytics de Clientes

```http
GET /api/analytics/clients
```

**Descripción:** Análisis detallado de clientes.

**Parámetros:** Parámetros de fecha comunes

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "total": 78,
    "totalActive": 45,
    "inactive": 33,
    "newThisMonth": 5,
    "byType": {
      "natural": 35,
      "juridica": 43
    },
    "topByRevenue": [
      { "_id": "Cliente A", "totalRevenue": 25000.00, "invoiceCount": 45 }
    ],
    "clientsByMonth": [
      { "year": 2024, "month": 2, "count": 5 },
      { "year": 2024, "month": 1, "count": 8 }
    ]
  },
  "timestamp": "2024-02-24T10:30:00.000Z"
}
```

**Campos para Power BI:**
- `byType` - Distribución por tipo de cliente (gráfico de pastel)
- `topByRevenue[]` - Top clientes por ingresos (tabla/ranking)
- `clientsByMonth[]` - Crecimiento de clientes (gráfico de línea)

---

### 9. Analytics de Facturas

```http
GET /api/analytics/invoices
```

**Descripción:** Análisis detallado de facturas.

**Parámetros:** Parámetros de fecha comunes

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "total": 450,
    "totalAmount": 125000.00,
    "pending": 28,
    "completed": 422,
    "byModule": {
      "trucking": { "count": 150, "amount": 45000.00 },
      "ptyss": { "count": 120, "amount": 38000.00 },
      "shipchandler": { "count": 100, "amount": 22000.00 }
    },
    "byStatus": {
      "prefactura": 28,
      "facturada": 422
    },
    "invoicesByDay": [
      { "date": "2024-02-20", "count": 12, "amount": 5200.00 },
      { "date": "2024-02-21", "count": 10, "amount": 4800.00 }
    ]
  },
  "timestamp": "2024-02-24T10:30:00.000Z"
}
```

**Campos para Power BI:**
- `byModule` - Facturas por módulo (gráfico de barras/pastel)
- `byStatus` - Estado de facturas (indicador de progreso)
- `invoicesByDay[]` - Tendencia diaria (gráfico de línea)

---

### 10. Analytics Avanzado

```http
GET /api/analytics/advanced
```

**Descripción:** Métricas avanzadas con comparativas temporales.

**Parámetros:** Ninguno (usa períodos predefinidos)

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "comparisons": {
      "thisMonth": { "revenue": 45000.00, "count": 120 },
      "lastMonth": { "revenue": 42000.00, "count": 115 },
      "monthOverMonthGrowth": 7.14,
      "thisWeek": { "revenue": 12000.00, "count": 32 },
      "lastWeek": { "revenue": 11000.00, "count": 30 },
      "weekOverWeekGrowth": 9.09,
      "thisYear": { "revenue": 280000.00, "count": 750 },
      "lastYear": { "revenue": 250000.00, "count": 680 },
      "yearOverYearGrowth": 12.00
    },
    "ticketStats": {
      "average": 375.00,
      "max": 15000.00,
      "min": 25.00,
      "total": 125000.00,
      "count": 333
    },
    "activityByHour": [
      { "hour": 9, "count": 45, "amount": 18000.00 },
      { "hour": 10, "count": 52, "amount": 21000.00 }
    ],
    "activityByDayOfWeek": [
      { "day": 2, "dayName": "Lun", "count": 85, "amount": 32000.00 },
      { "day": 3, "dayName": "Mar", "count": 78, "amount": 29000.00 }
    ],
    "topClientsThisMonth": [
      { "name": "Cliente A", "revenue": 12000.00, "count": 25 }
    ],
    "recentTransactions": [
      {
        "id": "65d1...",
        "invoiceNumber": "TRK-2024-001",
        "client": "Cliente A",
        "module": "trucking",
        "amount": 500.00,
        "status": "facturada",
        "date": "2024-02-24T08:30:00.000Z"
      }
    ],
    "activeUsers": [
      { "userId": "user123", "invoiceCount": 45, "totalRevenue": 18000.00 }
    ],
    "recordsByModuleStatus": [
      { "module": "Trucking", "status": "facturado", "count": 120 }
    ],
    "clientGrowth": [
      { "year": 2024, "month": 1, "count": 8 },
      { "year": 2024, "month": 2, "count": 5 }
    ]
  },
  "timestamp": "2024-02-24T10:30:00.000Z"
}
```

**Campos para Power BI:**
- `comparisons.*` - KPIs con comparativas (tarjetas con indicadores)
- `ticketStats` - Estadísticas de ticket promedio
- `activityByHour[]` - Actividad por hora (gráfico de barras)
- `activityByDayOfWeek[]` - Actividad por día (gráfico de barras)

---

### 11. Forecasting (Predicciones)

```http
GET /api/analytics/forecasting
```

**Descripción:** Predicciones basadas en tendencias históricas usando regresión lineal.

**Parámetros:** Ninguno

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "historical": [
      { "year": 2024, "month": 1, "revenue": 42000.00, "count": 115, "trendLine": 41500.00 },
      { "year": 2024, "month": 2, "revenue": 45000.00, "count": 120, "trendLine": 43000.00 }
    ],
    "forecast": [
      { "year": 2024, "month": 3, "predictedRevenue": 47500.00, "predictedCount": 128 },
      { "year": 2024, "month": 4, "predictedRevenue": 49000.00, "predictedCount": 132 },
      { "year": 2024, "month": 5, "predictedRevenue": 50500.00, "predictedCount": 136 }
    ],
    "trend": {
      "slope": 2500.00,
      "intercept": 35000.00,
      "direction": "upward",
      "monthlyChange": 2500.00
    },
    "confidence": 0.85,
    "averageGrowth": 5.5,
    "nextMonthPrediction": 47500.00,
    "nextQuarterPrediction": 147000.00,
    "seasonality": {
      "bestMonth": { "year": 2023, "month": 12, "y": 55000.00 },
      "worstMonth": { "year": 2023, "month": 6, "y": 28000.00 }
    }
  },
  "timestamp": "2024-02-24T10:30:00.000Z"
}
```

**Campos para Power BI:**
- `historical[]` + `forecast[]` - Gráfico de línea con proyección
- `confidence` - Indicador de confianza (0-1)
- `trend.direction` - Dirección de tendencia
- `nextMonthPrediction` - Predicción del próximo mes

---

### 12. Comparación de Módulos

```http
GET /api/analytics/module-comparison
```

**Descripción:** Comparativas detalladas entre todos los módulos.

**Parámetros:** Ninguno

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "modules": [
      {
        "module": "trucking",
        "thisMonth": {
          "revenue": 45000.00,
          "count": 150,
          "avgTicket": 300.00,
          "maxTicket": 5000.00,
          "minTicket": 50.00,
          "completed": 138,
          "pending": 12,
          "completionRate": 92.0
        },
        "lastMonth": {
          "revenue": 42000.00,
          "count": 140
        },
        "growth": 7.14,
        "uniqueClients": 25,
        "topClients": [
          { "name": "Cliente A", "revenue": 12000.00, "count": 25 }
        ]
      }
    ],
    "rankings": {
      "byRevenue": [...],
      "byVolume": [...],
      "byGrowth": [...],
      "byAvgTicket": [...]
    },
    "dailyTrend": {
      "trucking": [
        { "date": "2024-02-20", "revenue": 2500.00, "count": 8 }
      ]
    },
    "totals": {
      "revenue": 125000.00,
      "count": 450,
      "avgGrowth": 6.5
    }
  },
  "timestamp": "2024-02-24T10:30:00.000Z"
}
```

**Campos para Power BI:**
- `modules[]` - Tabla comparativa de módulos
- `rankings.*` - Rankings por diferentes métricas
- `dailyTrend` - Tendencias diarias por módulo
- `totals` - Totales consolidados

---

### 13. Alertas y Anomalías

```http
GET /api/analytics/alerts
```

**Descripción:** Sistema de alertas y detección de anomalías.

**Parámetros:** Ninguno

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "alerts": [
      {
        "type": "warning",
        "category": "revenue",
        "title": "Revenue bajo hoy",
        "message": "Revenue de hoy ($1200.00) está 40% por debajo del promedio diario",
        "value": 1200.00,
        "threshold": 2000.00,
        "severity": "medium"
      },
      {
        "type": "warning",
        "category": "operations",
        "title": "Prefacturas pendientes antiguas",
        "message": "Hay 5 prefacturas con más de 7 días sin procesar",
        "value": 5,
        "threshold": 0,
        "severity": "high"
      }
    ],
    "summary": {
      "total": 5,
      "byType": {
        "success": 1,
        "warning": 3,
        "info": 1
      },
      "bySeverity": {
        "high": 1,
        "medium": 2,
        "low": 2
      },
      "healthScore": 70
    },
    "metrics": {
      "todayRevenue": 1200.00,
      "todayTransactions": 8,
      "avgDailyRevenue": 2000.00,
      "avgDailyTransactions": 12,
      "projectedMonthly": 36000.00,
      "lastMonthRevenue": 42000.00
    }
  },
  "timestamp": "2024-02-24T10:30:00.000Z"
}
```

**Campos para Power BI:**
- `alerts[]` - Lista de alertas activas
- `summary.healthScore` - Indicador de salud (0-100)
- `summary.bySeverity` - Alertas por severidad
- `metrics` - Métricas actuales vs promedio

**Tipos de Alerta:**
- `success` - Alerta positiva (rendimiento excepcional)
- `warning` - Advertencia (requiere atención)
- `info` - Informativa

**Niveles de Severidad:**
- `high` - Alta prioridad
- `medium` - Prioridad media
- `low` - Baja prioridad

---

### 14. Rankings de Eficiencia

```http
GET /api/analytics/efficiency-rankings
```

**Descripción:** Rankings de eficiencia de clientes, módulos, días y horas.

**Parámetros:** Ninguno

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "clients": [
      {
        "rank": 1,
        "name": "Cliente A",
        "revenue": 25000.00,
        "invoices": 45,
        "avgTicket": 555.56,
        "modules": ["trucking", "ptyss"],
        "growth": 15.5,
        "score": 125000
      }
    ],
    "modules": [
      {
        "module": "trucking",
        "revenue": 45000.00,
        "invoices": 150,
        "avgTicket": 300.00,
        "completionRate": 92.0,
        "uniqueClients": 25,
        "revenuePerClient": 1800.00,
        "efficiencyScore": 85.5
      }
    ],
    "days": [
      { "rank": 1, "day": "Martes", "dayNumber": 3, "revenue": 32000.00, "transactions": 85, "avgTicket": 376.47 }
    ],
    "hours": [
      { "rank": 1, "hour": 10, "label": "10:00 - 11:00", "revenue": 21000.00, "transactions": 52, "avgTicket": 403.85 }
    ],
    "growth": [
      { "name": "Cliente B", "current": 8000.00, "previous": 4000.00, "growth": 100.0 }
    ],
    "atRisk": [
      { "name": "Cliente C", "current": 500.00, "previous": 5000.00, "growth": -90.0 }
    ],
    "summary": {
      "topClient": "Cliente A",
      "topModule": "trucking",
      "bestDay": "Martes",
      "bestHour": "10:00 - 11:00",
      "clientsAtRisk": 3
    }
  },
  "timestamp": "2024-02-24T10:30:00.000Z"
}
```

**Campos para Power BI:**
- `clients[]` - Top clientes (tabla con ranking)
- `modules[]` - Eficiencia por módulo (gráfico de barras)
- `days[]` - Mejores días (gráfico de barras)
- `hours[]` - Mejores horas (gráfico de barras)
- `atRisk[]` - Clientes en riesgo (alerta/tabla)

---

### 15. Exportar a Excel

```http
GET /api/analytics/export
```

**Descripción:** Exporta datos analíticos a un archivo Excel.

**Parámetros:**
| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `type` | String | Tipo de exportación (default: `all`) |
| + Parámetros de fecha comunes |

**Respuesta:** Archivo Excel (.xlsx) con las siguientes hojas:
- **Resumen** - Métricas principales
- **Por Módulo** - Revenue y cantidad por módulo
- **Top Clientes** - Los 50 mejores clientes
- **Facturas** - Detalle de las últimas 1000 facturas

**Headers de Respuesta:**
```
Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
Content-Disposition: attachment; filename="analytics_export_2024-02-24.xlsx"
```

---

## Ejemplos de Consultas para Power BI

### Configuración de Origen de Datos Web

En Power BI Desktop:
1. Obtener datos → Web
2. URL: `https://sapinterface.ptymgmt.com/api/analytics/metrics`
3. En "Encabezados de solicitud HTTP avanzados", agregar:
   - `Authorization`: `Bearer <tu_token>`

### Consulta M (Power Query) para Métricas

```powerquery
let
    Source = Json.Document(
        Web.Contents(
            "https://sapinterface.ptymgmt.com/api/analytics/metrics",
            [
                Headers = [
                    Authorization = "Bearer " & Token,
                    #"Content-Type" = "application/json"
                ],
                Query = [
                    startDate = "2024-01-01",
                    endDate = "2024-12-31"
                ]
            ]
        )
    ),
    Data = Source[data]
in
    Data
```

### Consulta M para Revenue Timeline

```powerquery
let
    Source = Json.Document(
        Web.Contents(
            "https://sapinterface.ptymgmt.com/api/analytics/revenue",
            [
                Headers = [
                    Authorization = "Bearer " & Token
                ]
            ]
        )
    ),
    Data = Source[data],
    Timeline = Data[timeline],
    ToTable = Table.FromList(Timeline, Splitter.SplitByNothing()),
    Expanded = Table.ExpandRecordColumn(ToTable, "Column1", {"date", "amount", "count"})
in
    Expanded
```

### Consulta M para Forecasting

```powerquery
let
    Source = Json.Document(
        Web.Contents(
            "https://sapinterface.ptymgmt.com/api/analytics/forecasting",
            [
                Headers = [
                    Authorization = "Bearer " & Token
                ]
            ]
        )
    ),
    Data = Source[data],
    Historical = Data[historical],
    Forecast = Data[forecast],

    // Combinar histórico y predicción
    HistTable = Table.FromList(Historical, Splitter.SplitByNothing()),
    HistExpanded = Table.ExpandRecordColumn(HistTable, "Column1", {"year", "month", "revenue", "trendLine"}),
    HistWithType = Table.AddColumn(HistExpanded, "Type", each "Actual"),

    ForeTable = Table.FromList(Forecast, Splitter.SplitByNothing()),
    ForeExpanded = Table.ExpandRecordColumn(ForeTable, "Column1", {"year", "month", "predictedRevenue"}),
    ForeRenamed = Table.RenameColumns(ForeExpanded, {{"predictedRevenue", "revenue"}}),
    ForeWithType = Table.AddColumn(ForeRenamed, "Type", each "Forecast"),

    Combined = Table.Combine({HistWithType, ForeWithType})
in
    Combined
```

---

## Recomendaciones para Power BI

### Actualización de Datos

- **Frecuencia recomendada:** Cada 1-4 horas para dashboards operacionales
- **Para reportes mensuales:** Actualización diaria es suficiente

### Visualizaciones Sugeridas

| Endpoint | Visualización Recomendada |
|----------|--------------------------|
| `/metrics` | Tarjetas KPI |
| `/revenue` | Gráfico de líneas (timeline) + Donut (byModule) |
| `/operational` | Indicadores de gauge |
| `/advanced` | Tarjetas con flechas de tendencia |
| `/forecasting` | Gráfico de líneas con área sombreada |
| `/alerts` | Tabla con formato condicional |
| `/efficiency-rankings` | Gráficos de barras horizontales |

### Manejo de Errores

Todas las respuestas incluyen:
- `success: true/false` - Indica si la operación fue exitosa
- `error` (solo si success=false) - Mensaje de error

```json
{
  "success": false,
  "error": "Token expirado"
}
```

---

## Notas Importantes

1. **Rate Limiting:** No hay límite actualmente, pero se recomienda no exceder 60 requests/minuto.

2. **Timeout:** Las consultas complejas pueden tardar hasta 30 segundos.

3. **Caché:** Los datos se consultan en tiempo real, no hay caché del lado del servidor.

4. **Zona Horaria:** Todas las fechas están en UTC. Ajustar en Power BI según sea necesario.

5. **Datos Sensibles:** El endpoint `/export` puede generar archivos grandes. Usar con moderación.
