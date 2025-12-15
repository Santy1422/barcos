# API de Analytics para Power BI - Documentación Completa

## Índice
1. [Resumen](#resumen)
2. [Autenticación](#autenticación)
3. [Endpoints Disponibles](#endpoints-disponibles)
4. [Parámetros Comunes](#parámetros-comunes)
5. [Rate Limiting](#rate-limiting)
6. [Caché](#caché)
7. [Ejemplos de Uso](#ejemplos-de-uso)
8. [Configuración en Power BI](#configuración-en-power-bi)
9. [Monitoreo y Troubleshooting](#monitoreo-y-troubleshooting)

---

## Resumen

La API de Analytics proporciona acceso optimizado a los datos del sistema de facturación marítima para su consumo en Power BI y otras herramientas de Business Intelligence. Todos los endpoints están diseñados para devolver datos planos y agregados, optimizados para visualización y análisis.

**Base URL Production**: `https://barcos-production.up.railway.app/api/analytics`
**Base URL Development**: `http://localhost:3000/api/analytics`

---

## Autenticación

La API soporta dos métodos de autenticación:

### 1. API Key (Recomendado para Power BI)

```http
GET /api/analytics/trucking
Headers:
  X-Api-Key: your-powerbi-api-key-here
```

### 2. JWT Bearer Token (Para usuarios del sistema)

```http
GET /api/analytics/trucking
Headers:
  Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Variables de Entorno Requeridas

```env
POWERBI_API_KEY=your-secure-api-key-here
JWT_SECRET=your-jwt-secret-here
```

---

## Endpoints Disponibles

### 1. Trucking Analytics
**GET** `/api/analytics/trucking`

Retorna datos detallados de operaciones de transporte terrestre.

**Response Schema:**
```json
{
  "data": [
    {
      "recordId": "string",
      "containerNumber": "string",
      "containerType": "string",
      "containerSize": "number",
      "fullEmpty": "FULL|EMPTY",
      "moveDate": "date",
      "moveType": "string",
      "origin": "string",
      "destination": "string",
      "price": "number",
      "status": "string",
      "clientName": "string",
      "clientSapCode": "string",
      "year": "number",
      "month": "number",
      "quarter": "number",
      "priceCategory": "Low|Medium|High|Premium"
    }
  ],
  "summary": {
    "totals": {},
    "byStatus": [],
    "byContainerType": [],
    "byMonth": []
  },
  "metadata": {}
}
```

### 2. Agency Services Analytics
**GET** `/api/analytics/agency`

Retorna datos de servicios de agencia marítima.

**Response Schema:**
```json
{
  "data": [
    {
      "serviceId": "string",
      "serviceName": "string",
      "serviceType": "string",
      "pickupDate": "date",
      "pickupTime": "string",
      "pickupLocation": "string",
      "dropoffLocation": "string",
      "passengerCount": "number",
      "price": "number",
      "vesselName": "string",
      "vesselImo": "string",
      "clientName": "string"
    }
  ],
  "summary": {
    "totals": {},
    "byStatus": [],
    "byServiceType": [],
    "byVessel": [],
    "topRoutes": []
  }
}
```

### 3. PTYSS Analytics
**GET** `/api/analytics/ptyss`

Retorna datos de servicios portuarios PTYSS.

**Response Schema:**
```json
{
  "data": [
    {
      "recordId": "string",
      "ptgAuthNumber": "string",
      "vesselName": "string",
      "vesselImo": "string",
      "vesselGRT": "number",
      "terminal": "string",
      "eta": "date",
      "etd": "date",
      "ptgServicesCount": "number",
      "totalPTGAmount": "number",
      "localServicesCount": "number",
      "totalLocalAmount": "number",
      "grandTotal": "number",
      "portStayDays": "number"
    }
  ],
  "summary": {}
}
```

### 4. ShipChandler Analytics
**GET** `/api/analytics/shipchandler`

Retorna datos de suministros a barcos.

### 5. Client Analytics
**GET** `/api/analytics/clients`

Retorna análisis detallado de clientes con métricas consolidadas.

### 6. Invoice Analytics
**GET** `/api/analytics/invoices`

Retorna análisis de facturación y cobranza.

### 7. Metrics Summary
**GET** `/api/analytics/metrics`

Retorna KPIs y métricas consolidadas del sistema.

**Response Schema:**
```json
{
  "kpis": {
    "totalRevenue": "number",
    "totalTransactions": "number",
    "totalClients": "number",
    "completionRate": {},
    "invoicingRate": {}
  },
  "modules": {
    "trucking": {},
    "agency": {},
    "ptyss": {},
    "shipchandler": {}
  }
}
```

### 8. Revenue Analytics
**GET** `/api/analytics/revenue`

Retorna análisis de ingresos con tendencias temporales.

### 9. Operational Metrics
**GET** `/api/analytics/operational`

Retorna métricas operacionales y de eficiencia.

---

## Parámetros Comunes

Todos los endpoints aceptan los siguientes parámetros de query:

| Parámetro | Tipo | Descripción | Ejemplo |
|-----------|------|-------------|---------|
| `startDate` | ISO Date | Fecha inicial del rango | `2024-01-01` |
| `endDate` | ISO Date | Fecha final del rango | `2024-12-31` |
| `clientId` | String | ID del cliente para filtrar | `507f1f77bcf86cd799439011` |
| `status` | String | Estado del registro | `completed`, `pending` |
| `limit` | Number | Límite de registros (max: 100000) | `5000` |
| `groupBy` | String | Agrupación temporal (solo revenue) | `day`, `week`, `month`, `quarter`, `year` |

**Ejemplo de request:**
```http
GET /api/analytics/trucking?startDate=2024-01-01&endDate=2024-03-31&status=completed&limit=1000
```

---

## Rate Limiting

### Límites por método de autenticación:

| Método | Límite | Ventana | Headers de respuesta |
|--------|--------|---------|---------------------|
| API Key | 1000 req | 1 hora | `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` |
| JWT Token | 100 req | 15 min | Estándar rate limit headers |
| JWT Admin | Sin límite | - | - |

### Respuesta cuando se excede el límite:
```json
{
  "success": false,
  "error": "Rate limit exceeded",
  "message": "Too many requests. Maximum 1000 requests per hour allowed.",
  "retryAfter": 3600
}
```

---

## Caché

Los endpoints implementan caché automático con los siguientes TTLs:

| Endpoint | TTL | Header |
|----------|-----|--------|
| `/trucking`, `/agency`, `/ptyss`, `/shipchandler` | 5 minutos | `X-Cache: HIT/MISS` |
| `/clients` | 10 minutos | `X-Cache-TTL: seconds` |
| `/invoices` | 5 minutos | |
| `/metrics`, `/revenue`, `/operational` | 3 minutos | |

Para forzar refresh del caché, usar un parámetro único:
```http
GET /api/analytics/trucking?_refresh=1234567890
```

---

## Ejemplos de Uso

### Ejemplo 1: Power BI - Obtener datos de Trucking

**Power Query M:**
```powerquery
let
    Source = Web.Contents(
        "https://barcos-production.up.railway.app/api/analytics/trucking",
        [
            Headers = [
                #"X-Api-Key" = "your-powerbi-api-key-here",
                #"Content-Type" = "application/json"
            ],
            Query = [
                startDate = "2024-01-01",
                endDate = "2024-12-31",
                limit = "10000"
            ]
        ]
    ),
    JsonData = Json.Document(Source),
    DataTable = Table.FromList(
        JsonData[data], 
        Splitter.SplitByNothing(), 
        null, 
        null, 
        ExtraValues.Error
    ),
    ExpandedTable = Table.ExpandRecordColumn(
        DataTable, 
        "Column1", 
        Record.FieldNames(DataTable{0}[Column1])
    )
in
    ExpandedTable
```

### Ejemplo 2: Python - Análisis con pandas

```python
import requests
import pandas as pd
from datetime import datetime, timedelta

# Configuración
API_KEY = "your-powerbi-api-key-here"
BASE_URL = "https://barcos-production.up.railway.app/api/analytics"

# Obtener datos de los últimos 30 días
end_date = datetime.now()
start_date = end_date - timedelta(days=30)

headers = {
    "X-Api-Key": API_KEY
}

params = {
    "startDate": start_date.isoformat(),
    "endDate": end_date.isoformat()
}

# Request
response = requests.get(
    f"{BASE_URL}/trucking",
    headers=headers,
    params=params
)

if response.status_code == 200:
    data = response.json()
    df = pd.DataFrame(data['data'])
    
    # Análisis
    print(f"Total records: {len(df)}")
    print(f"Total revenue: ${df['price'].sum():,.2f}")
    print(f"Average price: ${df['price'].mean():,.2f}")
    
    # Agrupar por mes
    df['moveDate'] = pd.to_datetime(df['moveDate'])
    monthly = df.groupby(df['moveDate'].dt.to_period('M'))['price'].sum()
    print("\nMonthly Revenue:")
    print(monthly)
else:
    print(f"Error: {response.status_code}")
    print(response.json())
```

### Ejemplo 3: JavaScript/Node.js - Dashboard en tiempo real

```javascript
const axios = require('axios');

class AnalyticsClient {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseURL = 'https://barcos-production.up.railway.app/api/analytics';
  }

  async getMetrics(startDate, endDate) {
    try {
      const response = await axios.get(`${this.baseURL}/metrics`, {
        headers: {
          'X-Api-Key': this.apiKey
        },
        params: {
          startDate,
          endDate
        }
      });

      return response.data;
    } catch (error) {
      console.error('Error fetching metrics:', error.response?.data || error.message);
      throw error;
    }
  }

  async getRevenueAnalysis(groupBy = 'month') {
    try {
      const response = await axios.get(`${this.baseURL}/revenue`, {
        headers: {
          'X-Api-Key': this.apiKey
        },
        params: {
          groupBy
        }
      });

      return response.data;
    } catch (error) {
      console.error('Error fetching revenue:', error.response?.data || error.message);
      throw error;
    }
  }
}

// Uso
const client = new AnalyticsClient('your-powerbi-api-key-here');

// Obtener métricas del mes actual
const startOfMonth = new Date();
startOfMonth.setDate(1);

client.getMetrics(startOfMonth.toISOString(), new Date().toISOString())
  .then(metrics => {
    console.log('KPIs del mes:');
    console.log(`- Revenue Total: $${metrics.kpis.totalRevenue.toLocaleString()}`);
    console.log(`- Transacciones: ${metrics.kpis.totalTransactions}`);
    console.log(`- Clientes Activos: ${metrics.kpis.activeClients}`);
  })
  .catch(console.error);
```

---

## Configuración en Power BI

### Paso 1: Configurar Data Source

1. Abrir Power BI Desktop
2. Get Data → Web
3. Seleccionar "Advanced"

### Paso 2: Configurar la conexión

```
URL parts:
  https://barcos-production.up.railway.app/api/analytics/trucking

HTTP request header parameters:
  X-Api-Key: your-powerbi-api-key-here

URL query parameters:
  startDate: 2024-01-01
  endDate: 2024-12-31
```

### Paso 3: Scheduled Refresh

1. Publicar el report en Power BI Service
2. Ir a Dataset Settings
3. En "Data source credentials":
   - Authentication method: Anonymous
   - Privacy level: Organizational
4. En "Scheduled refresh":
   - Keep your data up to date: ON
   - Refresh frequency: Daily
   - Time zone: Tu zona horaria
   - Add multiple times for near real-time (cada 30 min durante horario laboral)

### Paso 4: Crear medidas DAX

```dax
// Total Revenue
Total Revenue = SUM(TruckingData[price])

// YTD Revenue
YTD Revenue = TOTALYTD([Total Revenue], 'Calendar'[Date])

// Completion Rate
Completion Rate = 
DIVIDE(
    CALCULATE(COUNTROWS(TruckingData), TruckingData[status] = "completed"),
    COUNTROWS(TruckingData),
    0
) * 100

// Average Container Price by Type
Avg Price by Type = 
AVERAGEX(
    FILTER(TruckingData, TruckingData[containerType] = SELECTEDVALUE(TruckingData[containerType])),
    TruckingData[price]
)
```

---

## Monitoreo y Troubleshooting

### Headers de diagnóstico

Cada respuesta incluye headers útiles para debugging:

| Header | Descripción |
|--------|-------------|
| `X-Cache` | `HIT` si viene de caché, `MISS` si es fresh |
| `X-Cache-TTL` | Segundos restantes en caché |
| `X-RateLimit-Limit` | Límite total de requests |
| `X-RateLimit-Remaining` | Requests restantes |
| `X-RateLimit-Reset` | Momento de reset del límite |

### Códigos de error comunes

| Código | Mensaje | Solución |
|--------|---------|----------|
| 401 | Invalid API Key | Verificar el API Key en headers |
| 401 | Authentication required | Incluir X-Api-Key o Bearer token |
| 403 | Insufficient permissions | Usuario no tiene rol de analytics |
| 429 | Rate limit exceeded | Esperar el tiempo indicado en retryAfter |
| 400 | Invalid date range | Verificar formato ISO de fechas |
| 400 | Date range too large | Máximo 1 año de rango |
| 500 | Internal server error | Contactar soporte |

### Logs y métricas

Los endpoints registran:
- Todas las requests con timestamp
- Método de autenticación usado
- Tiempo de respuesta
- Hits/misses de caché
- Errores y excepciones

### Performance tips

1. **Usar parámetros de fecha** para limitar data
2. **Implementar paginación** con el parámetro limit
3. **Aprovechar el caché** para queries repetitivas
4. **Agrupar requests** cuando sea posible
5. **Usar filtros específicos** (clientId, status) para reducir payload

---

## Soporte y Contacto

Para reportar issues o solicitar nuevos features:
- GitHub Issues: [https://github.com/your-repo/issues](https://github.com/your-repo/issues)
- Email: soporte@barcos.com

---

## Changelog

### v1.0.0 (2024-12-05)
- Release inicial de la API de Analytics
- 9 endpoints principales
- Autenticación con API Key y JWT
- Sistema de caché y rate limiting
- Documentación completa

---

*Última actualización: Diciembre 2024*