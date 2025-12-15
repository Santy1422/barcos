# Guía de Configuración Power BI Desktop

## Configuración Rápida (5 minutos)

### Opción 1: Conexión Web Directa (Recomendado)

1. **Abrir Power BI Desktop**
2. **Get Data → Web → Advanced**

3. **Configurar la conexión:**
```
URL Parts:
├── https://barcos-production.up.railway.app
└── /api/analytics/trucking

HTTP Request Header Parameters:
├── Name: X-Api-Key
└── Value: [TU_API_KEY_AQUI]

Query Options (opcional):
├── startDate: 2024-01-01
└── endDate: 2024-12-31
```

4. **Click OK → Load**

### Opción 2: Usando Power Query M

1. **Get Data → Blank Query**
2. **Advanced Editor**
3. **Pegar este código:**

```powerquery
let
    // Configuración
    ApiKey = "TU_API_KEY_AQUI",
    BaseUrl = "https://barcos-production.up.railway.app/api/analytics",
    StartDate = "2024-01-01",
    EndDate = "2024-12-31",
    
    // Obtener datos de Trucking
    GetTruckingData = () =>
        let
            Source = Web.Contents(BaseUrl & "/trucking", [
                Headers = [
                    #"X-Api-Key" = ApiKey,
                    #"Content-Type" = "application/json"
                ],
                Query = [
                    startDate = StartDate,
                    endDate = EndDate
                ]
            ]),
            JsonData = Json.Document(Source),
            DataList = JsonData[data],
            DataTable = Table.FromList(DataList, Splitter.SplitByNothing()),
            ExpandedTable = Table.ExpandRecordColumn(
                DataTable, 
                "Column1",
                {"recordId", "containerNumber", "containerType", "moveDate", "price", "status", "clientName", "year", "month", "quarter"},
                {"RecordID", "Container", "Type", "Date", "Price", "Status", "Client", "Year", "Month", "Quarter"}
            ),
            TypedTable = Table.TransformColumnTypes(ExpandedTable, {
                {"Date", type datetime},
                {"Price", type number},
                {"Year", Int64.Type},
                {"Month", Int64.Type},
                {"Quarter", Int64.Type}
            })
        in
            TypedTable,
    
    Result = GetTruckingData()
in
    Result
```

## Configuración de Múltiples Datasets

### Crear función reutilizable:

```powerquery
// Función: fnGetBarcosData
(endpoint as text, optional startDate as text, optional endDate as text) =>
let
    ApiKey = "TU_API_KEY_AQUI",
    BaseUrl = "https://barcos-production.up.railway.app/api/analytics",
    
    QueryParams = [
        startDate = startDate ?? "2024-01-01",
        endDate = endDate ?? Date.ToText(Date.From(DateTime.LocalNow()), "yyyy-MM-dd")
    ],
    
    Source = Web.Contents(BaseUrl & endpoint, [
        Headers = [#"X-Api-Key" = ApiKey],
        Query = QueryParams
    ]),
    
    JsonData = Json.Document(Source),
    Data = JsonData[data],
    Table = Table.FromList(Data, Splitter.SplitByNothing()),
    Expanded = if Table.RowCount > 0 then
        Table.ExpandRecordColumn(Table, "Column1", Record.FieldNames(Table{0}[Column1]))
    else
        Table
in
    Expanded
```

### Usar la función para múltiples endpoints:

```powerquery
// Query: Trucking
= fnGetBarcosData("/trucking", "2024-01-01", "2024-12-31")

// Query: Agency
= fnGetBarcosData("/agency", "2024-01-01", "2024-12-31")

// Query: Clients
= fnGetBarcosData("/clients")

// Query: Metrics
= fnGetBarcosData("/metrics")
```

## Configuración de Refresh Automático

### En Power BI Desktop:

1. **File → Options and settings → Data source settings**
2. **Edit Permissions**
3. **Privacy Level: Organizational**

### En Power BI Service:

1. **Publicar el report**
2. **Dataset settings → Credentials**
   - Authentication: Anonymous
   - Privacy level: Organizational
   
3. **Scheduled refresh:**
```
☑ Keep your data up to date
Refresh frequency: Daily
Time zone: (UTC-05:00) Panama
Add time: 
  - 06:00 AM
  - 12:00 PM
  - 06:00 PM
☑ Send refresh failure notifications
```

## Medidas DAX Esenciales

### KPIs Principales

```dax
// Total Revenue
Total Revenue = 
SUM(Trucking[price])

// Total Revenue Formatted
Total Revenue Formatted = 
FORMAT([Total Revenue], "$#,##0")

// YTD Revenue
YTD Revenue = 
CALCULATE(
    [Total Revenue],
    DATESYTD('Calendar'[Date])
)

// MoM Growth %
MoM Growth % = 
VAR CurrentMonth = [Total Revenue]
VAR PreviousMonth = CALCULATE([Total Revenue], DATEADD('Calendar'[Date], -1, MONTH))
RETURN
DIVIDE(CurrentMonth - PreviousMonth, PreviousMonth, 0)

// Completion Rate
Completion Rate = 
DIVIDE(
    CALCULATE(COUNTROWS(Trucking), Trucking[status] = "completed"),
    COUNTROWS(Trucking),
    0
)

// Active Clients
Active Clients = 
DISTINCTCOUNT(Trucking[clientName])

// Average Container Price
Avg Container Price = 
AVERAGE(Trucking[price])

// Containers per Day
Containers per Day = 
DIVIDE(
    COUNTROWS(Trucking),
    DISTINCTCOUNT(Trucking[moveDate]),
    0
)
```

### Tabla de Calendario

```dax
Calendar = 
VAR MinDate = MIN(Trucking[moveDate])
VAR MaxDate = MAX(Trucking[moveDate])
RETURN
ADDCOLUMNS(
    CALENDAR(MinDate, MaxDate),
    "Year", YEAR([Date]),
    "Month", FORMAT([Date], "MMM"),
    "MonthNum", MONTH([Date]),
    "Quarter", "Q" & QUARTER([Date]),
    "Week", WEEKNUM([Date]),
    "Weekday", FORMAT([Date], "ddd"),
    "IsWeekend", IF(WEEKDAY([Date], 2) >= 6, TRUE, FALSE),
    "YearMonth", FORMAT([Date], "YYYY-MM"),
    "MonthYear", FORMAT([Date], "MMM YYYY")
)
```

## Visualizaciones Recomendadas

### Dashboard Principal

```
┌─────────────────────────────────────────────────────────┐
│  KPI Cards (Primera Fila)                              │
├─────────────┬─────────────┬─────────────┬─────────────┤
│ Total       │ Active      │ Completion  │ Avg Price   │
│ Revenue     │ Clients     │ Rate        │ per Move    │
│ $2.5M       │ 142         │ 94.3%       │ $185.50     │
└─────────────┴─────────────┴─────────────┴─────────────┘

┌─────────────────────────────┬───────────────────────────┐
│ Revenue Trend (Line Chart)  │ Revenue by Module (Donut) │
│                             │                            │
│     📈                      │       🍩                   │
│                             │                            │
└─────────────────────────────┴───────────────────────────┘

┌─────────────────────────────┬───────────────────────────┐
│ Top 10 Clients (Bar)        │ Container Types (Treemap) │
│                             │                            │
│     📊                      │       ⬛⬜                 │
│                             │                            │
└─────────────────────────────┴───────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ Detailed Table with Filters                            │
│                                                         │
│ Date | Client | Container | Route | Price | Status     │
│ ──────────────────────────────────────────────────     │
└─────────────────────────────────────────────────────────┘
```

### Filtros Recomendados (Slicers)

1. **Date Range** (Between)
2. **Module** (Dropdown)
3. **Client** (Search box)
4. **Status** (Buttons)
5. **Container Type** (List)

## Optimización de Performance

### 1. Reducir el volumen de datos

```powerquery
// Filtrar solo últimos 6 meses
= Table.SelectRows(Source, each [moveDate] >= Date.AddMonths(Date.From(DateTime.LocalNow()), -6))

// Eliminar columnas no usadas
= Table.RemoveColumns(Source, {"unused1", "unused2"})

// Agrupar datos para resumen
= Table.Group(Source, {"Year", "Month"}, {
    {"Revenue", each List.Sum([price]), type number},
    {"Count", each Table.RowCount(_), Int64.Type}
})
```

### 2. Usar agregaciones

```dax
// Pre-calcular en Power Query
GroupedData = 
Table.Group(Source, {"clientName", "year", "month"}, {
    {"TotalRevenue", each List.Sum([price])},
    {"RecordCount", each Table.RowCount(_)}
})
```

### 3. Índices y relaciones

```dax
// Crear índice único
= Table.AddIndexColumn(Source, "Index", 1, 1, Int64.Type)

// Optimizar relaciones
- Usar Many-to-One cuando sea posible
- Evitar relaciones bidireccionales
- Usar enteros para keys
```

## Troubleshooting

### Error: "Unable to connect"
```powerquery
// Verificar API Key
ApiKey = "your-actual-api-key-here"  // No "TU_API_KEY_AQUI"

// Verificar URL
BaseUrl = "https://barcos-production.up.railway.app"  // Sin slash al final
```

### Error: "Rate limit exceeded"
- Reducir frecuencia de refresh
- Usar caché local
- Contactar para aumentar límite

### Error: "Invalid date range"
```powerquery
// Formato correcto de fechas
startDate = "2024-01-01"  // YYYY-MM-DD
endDate = Date.ToText(Date.From(DateTime.LocalNow()), "yyyy-MM-dd")
```

### Datos no se actualizan
1. Verificar scheduled refresh está activo
2. Verificar credenciales no expiraron
3. Revisar notification emails
4. Forzar refresh manual

## Scripts Útiles

### Exportar a Excel automáticamente

```powerquery
// Agregar paso al final del query
ExportToExcel = 
    let
        TempFile = "C:\Temp\BarcosData_" & DateTime.ToText(DateTime.LocalNow(), "yyyyMMdd_HHmmss") & ".xlsx",
        Export = Excel.Workbook(Table.ToRecords(FinalTable))
    in
        FinalTable  // Continuar con la tabla para Power BI
```

### Alertas personalizadas

```dax
Alert_LowCompletionRate = 
IF(
    [Completion Rate] < 0.9,
    "⚠️ Completion rate below 90%: " & FORMAT([Completion Rate], "0.0%"),
    "✅ Completion rate OK"
)
```

## Mejores Prácticas

1. **Nomenclatura consistente**
   - Tablas: PascalCase (ej: TruckingData)
   - Medidas: Sin prefijo (ej: Total Revenue)
   - Columnas calculadas: Prefijo "c" (ej: cYearMonth)

2. **Organización**
   - Crear carpetas para medidas por categoría
   - Ocultar columnas técnicas
   - Documentar medidas complejas

3. **Performance**
   - Importar solo datos necesarios
   - Usar variables en DAX
   - Evitar CALCULATE anidados

4. **Seguridad**
   - No hardcodear API Keys
   - Usar parámetros
   - Implementar RLS si necesario

## Recursos Adicionales

- [Documentación API](/api/API_ANALYTICS_DOCUMENTATION.md)
- [Power BI Best Practices](https://docs.microsoft.com/power-bi/guidance/)
- [DAX Guide](https://dax.guide/)
- Soporte: soporte@barcos.com

---

*Última actualización: Diciembre 2024*