// ===================================================================================================
// BARCOS POWER BI CONNECTOR
// Version: 1.0.0
// Descripción: Conector personalizado para integrar el sistema de facturación marítima con Power BI
// ===================================================================================================

section BarcosBIConnector;

// Configuración global
shared BaseUrl = "https://barcos-production.up.railway.app/api/analytics";
shared ApiKey = "your-powerbi-api-key-here"; // CAMBIAR: Usar parámetro o Azure Key Vault en producción

// ===================================================================================================
// FUNCIÓN PRINCIPAL DE NAVEGACIÓN
// ===================================================================================================

[DataSource.Kind="BarcosBIConnector", Publish="BarcosBIConnector.Publish"]
shared BarcosBIConnector.Contents = Value.ReplaceType(NavigationTable, NavigationTableType);

NavigationTableType = type function () as table meta [
    Documentation.Name = "Barcos BI Connector",
    Documentation.LongDescription = "Conecta con el sistema de facturación marítima Barcos para análisis en Power BI",
    Documentation.Examples = {[
        Description = "Obtener datos de trucking del último mes",
        Code = "BarcosBIConnector.Contents()",
        Result = "Tabla de navegación con todos los datasets disponibles"
    ]}
];

NavigationTable = () as table =>
    let
        objects = {
            {"Trucking", "Trucking", GetTruckingData, "Table", "Table", true},
            {"Agency Services", "Agency", GetAgencyData, "Table", "Table", true},
            {"PTYSS", "PTYSS", GetPTYSSData, "Table", "Table", true},
            {"ShipChandler", "ShipChandler", GetShipChandlerData, "Table", "Table", true},
            {"Clients", "Clients", GetClientsData, "Table", "Table", true},
            {"Invoices", "Invoices", GetInvoicesData, "Table", "Table", true},
            {"Metrics Summary", "Metrics", GetMetricsData, "Table", "Table", true},
            {"Revenue Analytics", "Revenue", GetRevenueData, "Table", "Table", true},
            {"Operational Metrics", "Operational", GetOperationalData, "Table", "Table", true}
        },
        NavTable = Table.FromList(objects, Splitter.SplitByNothing(), null, null, ExtraValues.Error),
        RenamedColumns = Table.RenameColumns(NavTable, {{"Column1", "NavItem"}}),
        ExpandedColumns = Table.ExpandListColumn(RenamedColumns, "NavItem"),
        RenamedNavColumns = Table.RenameColumns(ExpandedColumns, {{"NavItem", "Column1"}}),
        NavItemsTable = Table.FromColumns(
            {
                List.Transform(objects, each _{0}),  // Name
                List.Transform(objects, each _{1}),  // Key
                List.Transform(objects, each _{2}),  // Data
                List.Transform(objects, each _{3}),  // ItemKind
                List.Transform(objects, each _{4}),  // ItemName
                List.Transform(objects, each _{5})   // IsLeaf
            },
            {"Name", "Key", "Data", "ItemKind", "ItemName", "IsLeaf"}
        ),
        NavigationTableTyped = Table.ToNavigationTable(NavItemsTable, {"Key"}, "Name", "Data", "ItemKind", "ItemName", "IsLeaf")
    in
        NavigationTableTyped;

// ===================================================================================================
// FUNCIONES DE OBTENCIÓN DE DATOS
// ===================================================================================================

// TRUCKING DATA
GetTruckingData = () =>
    let
        Source = GetApiData("/trucking"),
        DataTable = ConvertToTable(Source[data]),
        TransformedTable = Table.TransformColumnTypes(DataTable, {
            {"recordId", type text},
            {"containerNumber", type text},
            {"containerType", type text},
            {"containerSize", Int64.Type},
            {"fullEmpty", type text},
            {"moveDate", type datetime},
            {"price", type number},
            {"status", type text},
            {"clientName", type text},
            {"year", Int64.Type},
            {"month", Int64.Type},
            {"quarter", Int64.Type}
        })
    in
        TransformedTable;

// AGENCY SERVICES DATA
GetAgencyData = () =>
    let
        Source = GetApiData("/agency"),
        DataTable = ConvertToTable(Source[data]),
        TransformedTable = Table.TransformColumnTypes(DataTable, {
            {"serviceId", type text},
            {"serviceName", type text},
            {"pickupDate", type datetime},
            {"pickupLocation", type text},
            {"dropoffLocation", type text},
            {"passengerCount", Int64.Type},
            {"price", type number},
            {"vesselName", type text},
            {"clientName", type text}
        })
    in
        TransformedTable;

// PTYSS DATA
GetPTYSSData = () =>
    let
        Source = GetApiData("/ptyss"),
        DataTable = ConvertToTable(Source[data]),
        TransformedTable = Table.TransformColumnTypes(DataTable, {
            {"recordId", type text},
            {"ptgAuthNumber", type text},
            {"vesselName", type text},
            {"vesselGRT", type number},
            {"terminal", type text},
            {"eta", type datetime},
            {"etd", type datetime},
            {"totalPTGAmount", type number},
            {"totalLocalAmount", type number},
            {"grandTotal", type number}
        })
    in
        TransformedTable;

// SHIPCHANDLER DATA
GetShipChandlerData = () =>
    let
        Source = GetApiData("/shipchandler"),
        DataTable = ConvertToTable(Source[data])
    in
        DataTable;

// CLIENTS DATA
GetClientsData = () =>
    let
        Source = GetApiData("/clients"),
        DataTable = ConvertToTable(Source[data]),
        TransformedTable = Table.TransformColumnTypes(DataTable, {
            {"clientId", type text},
            {"name", type text},
            {"sapCode", type text},
            {"type", type text},
            {"totalRevenue", type number},
            {"totalTransactions", Int64.Type},
            {"truckingRevenue", type number},
            {"agencyRevenue", type number},
            {"ptyssRevenue", type number},
            {"shipchandlerRevenue", type number}
        })
    in
        TransformedTable;

// INVOICES DATA
GetInvoicesData = () =>
    let
        Source = GetApiData("/invoices"),
        DataTable = ConvertToTable(Source[data]),
        TransformedTable = Table.TransformColumnTypes(DataTable, {
            {"invoiceId", type text},
            {"invoiceNumber", type text},
            {"invoiceDate", type datetime},
            {"dueDate", type datetime},
            {"totalAmount", type number},
            {"status", type text},
            {"clientName", type text},
            {"module", type text}
        })
    in
        TransformedTable;

// METRICS SUMMARY DATA
GetMetricsData = () =>
    let
        Source = GetApiData("/metrics"),
        KPIs = Source[kpis],
        KPIsTable = Record.ToTable(KPIs)
    in
        KPIsTable;

// REVENUE ANALYTICS DATA
GetRevenueData = () =>
    let
        Source = GetApiData("/revenue"),
        Timeline = ConvertToTable(Source[timeline]),
        TransformedTable = Table.TransformColumnTypes(Timeline, {
            {"trucking", type number},
            {"agency", type number},
            {"ptyss", type number},
            {"shipchandler", type number},
            {"total", type number}
        })
    in
        TransformedTable;

// OPERATIONAL METRICS DATA
GetOperationalData = () =>
    let
        Source = GetApiData("/operational"),
        KPIs = Source[kpis],
        KPIsTable = Record.ToTable(KPIs)
    in
        KPIsTable;

// ===================================================================================================
// FUNCIONES AUXILIARES
// ===================================================================================================

// Función para realizar llamadas a la API
GetApiData = (endpoint as text, optional queryParams as record) =>
    let
        // Construir URL con parámetros
        queryString = if queryParams <> null then 
            "?" & Text.Combine(
                List.Transform(
                    Record.FieldNames(queryParams),
                    each _ & "=" & Text.From(Record.Field(queryParams, _))
                ),
                "&"
            )
        else "",
        
        url = BaseUrl & endpoint & queryString,
        
        // Realizar petición
        Source = Web.Contents(url, [
            Headers = [
                #"X-Api-Key" = ApiKey,
                #"Content-Type" = "application/json",
                #"Accept" = "application/json"
            ],
            Timeout = #duration(0, 0, 2, 0) // 2 minutos timeout
        ]),
        
        // Parsear JSON
        JsonData = Json.Document(Source)
    in
        JsonData;

// Función para convertir lista de records a tabla
ConvertToTable = (data as list) =>
    let
        Table = Table.FromList(data, Splitter.SplitByNothing(), null, null, ExtraValues.Error),
        ExpandedTable = if Table.RowCount > 0 then
            Table.ExpandRecordColumn(Table, "Column1", Record.FieldNames(Table{0}[Column1]))
        else
            Table
    in
        ExpandedTable;

// Función para crear tabla de navegación
Table.ToNavigationTable = (
    table as table,
    keyColumns as list,
    nameColumn as text,
    dataColumn as text,
    itemKindColumn as text,
    itemNameColumn as text,
    isLeafColumn as text
) as table =>
    let
        tableType = Value.Type(table),
        newTableType = Type.AddTableKey(tableType, keyColumns, true) meta [
            NavigationTable.NameColumn = nameColumn,
            NavigationTable.DataColumn = dataColumn,
            NavigationTable.ItemKindColumn = itemKindColumn,
            Preview.DelayColumn = itemNameColumn,
            NavigationTable.IsLeafColumn = isLeafColumn
        ],
        navigationTable = Value.ReplaceType(table, newTableType)
    in
        navigationTable;

// ===================================================================================================
// METADATA Y PUBLICACIÓN
// ===================================================================================================

BarcosBIConnector.Publish = [
    Beta = true,
    Category = "Other",
    ButtonText = { "Barcos BI Connector", "Conectar con el sistema Barcos" },
    LearnMoreUrl = "https://github.com/your-repo/barcos",
    SourceImage = BarcosBIConnector.Icons,
    SourceTypeImage = BarcosBIConnector.Icons
];

BarcosBIConnector.Icons = [
    Icon16 = { Extension.Contents("BarcosBIConnector16.png"), Extension.Contents("BarcosBIConnector20.png"), Extension.Contents("BarcosBIConnector24.png"), Extension.Contents("BarcosBIConnector32.png") },
    Icon32 = { Extension.Contents("BarcosBIConnector32.png"), Extension.Contents("BarcosBIConnector40.png"), Extension.Contents("BarcosBIConnector48.png"), Extension.Contents("BarcosBIConnector64.png") }
];

// ===================================================================================================
// FUNCIONES DE UTILIDAD ADICIONALES
// ===================================================================================================

// Función para obtener datos con filtro de fechas
GetDataWithDateRange = (endpoint as text, startDate as date, endDate as date) =>
    let
        params = [
            startDate = Date.ToText(startDate, "yyyy-MM-dd"),
            endDate = Date.ToText(endDate, "yyyy-MM-dd")
        ],
        data = GetApiData(endpoint, params)
    in
        data;

// Función para obtener datos del mes actual
GetCurrentMonthData = (endpoint as text) =>
    let
        today = Date.From(DateTime.LocalNow()),
        startOfMonth = Date.StartOfMonth(today),
        data = GetDataWithDateRange(endpoint, startOfMonth, today)
    in
        data;

// Función para obtener datos del año actual
GetCurrentYearData = (endpoint as text) =>
    let
        today = Date.From(DateTime.LocalNow()),
        startOfYear = Date.StartOfYear(today),
        data = GetDataWithDateRange(endpoint, startOfYear, today)
    in
        data;