# 📊 GUÍA COMPLETA: INTEGRACIÓN MONGODB → POWER BI
## Sistema de Facturación Marítima - Análisis de Datos

---

## ÍNDICE
1. [Opciones de Integración](#opciones-de-integración)
2. [Método 1: MongoDB Connector for BI](#método-1-mongodb-connector-for-bi)
3. [Método 2: API REST con Scheduled Refresh](#método-2-api-rest-con-scheduled-refresh)
4. [Método 3: Export a SQL Database](#método-3-export-a-sql-database)
5. [Método 4: Azure Data Factory](#método-4-azure-data-factory)
6. [Método 5: Python Script con pymongo](#método-5-python-script-con-pymongo)
7. [Implementación Recomendada](#implementación-recomendada)

---

## OPCIONES DE INTEGRACIÓN

### Comparación de Métodos

| Método | Tiempo Real | Complejidad | Costo | Mejor Para |
|--------|------------|-------------|-------|------------|
| MongoDB BI Connector | ✅ | Media | $$ | Empresas con MongoDB Atlas |
| API REST | ⚡ (15min-24h) | Baja | $ | Sistemas existentes con API |
| Export to SQL | ❌ | Media | $ | Migración única |
| Azure Data Factory | ✅ | Alta | $$$ | Empresas con Azure |
| Python Script | ⚡ | Media | $ | Control total |

---

## MÉTODO 1: MONGODB CONNECTOR FOR BI
### (Recomendado para MongoDB Atlas)

### Paso 1: Instalar MongoDB Connector for BI

```bash
# Windows
# Descargar desde: https://www.mongodb.com/try/download/bi-connector

# macOS
brew install mongodb/brew/mongodb-connector-for-bi

# Linux
wget https://downloads.mongodb.com/bi-connector/mongodb-bi-linux-x86_64-ubuntu2004-v2.14.4.tgz
tar -xvzf mongodb-bi-linux-x86_64-ubuntu2004-v2.14.4.tgz
```

### Paso 2: Configuración del Connector

Crear archivo `mongosqld-config.yml`:

```yaml
# mongosqld-config.yml
mongodb:
  net:
    uri: "mongodb://usuario:password@servidor:27017/barcos?authSource=admin"
    # Para MongoDB Atlas:
    # uri: "mongodb+srv://usuario:password@cluster.mongodb.net/barcos"
  
schema:
  path: "./schema"
  
net:
  bindIp: "127.0.0.1"
  port: 3307

log:
  path: "./mongosqld.log"
  logAppend: true
  verbosity: 2

processManagement:
  service:
    name: "mongosqld"
    displayName: "MongoDB Connector for BI"
    description: "MongoDB Connector for BI service"
```

### Paso 3: Generar Schema

```bash
# Generar schema de todas las colecciones
mongodrdl --uri "mongodb://localhost:27017/barcos" \
         --out schema.drdl \
         --collection users \
         --collection clients \
         --collection records \
         --collection services \
         --collection invoices
```

### Paso 4: Iniciar el Connector

```bash
# Iniciar el servicio
mongosqld --config mongosqld-config.yml

# O ejecutar directamente
mongosqld --mongo-uri "mongodb://localhost:27017/barcos" \
          --addr "127.0.0.1:3307" \
          --schema schema.drdl
```

### Paso 5: Conectar desde Power BI

1. Abrir Power BI Desktop
2. Get Data → More → Database → MySQL Database
3. Server: `localhost:3307`
4. Database: `barcos`
5. Username/Password del connector (no de MongoDB)

---

## MÉTODO 2: API REST CON SCHEDULED REFRESH
### (Recomendado para sistema actual)

### Paso 1: Crear Endpoints de Analytics en el Backend

```javascript
// backend/routes/analytics.js
const express = require('express');
const router = express.Router();

// Endpoint para Power BI - Todos los registros de Trucking
router.get('/api/analytics/trucking', async (req, res) => {
  try {
    const records = await db.collection('trucking_records').aggregate([
      {
        $lookup: {
          from: 'clients',
          localField: 'clientId',
          foreignField: '_id',
          as: 'client'
        }
      },
      {
        $unwind: '$client'
      },
      {
        $project: {
          // Campos planos para Power BI
          recordId: '$_id',
          containerNumber: 1,
          containerType: 1,
          containerSize: 1,
          fullEmpty: '$fe',
          moveDate: 1,
          moveType: 1,
          price: 1,
          status: 1,
          clientName: '$client.name',
          clientSapCode: '$client.sapCode',
          clientType: '$client.type',
          origin: 1,
          destination: 1,
          invoiceNumber: 1,
          createdAt: 1,
          updatedAt: 1
        }
      }
    ]).toArray();

    res.json(records);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint para Agency Services
router.get('/api/analytics/agency', async (req, res) => {
  try {
    const services = await db.collection('agency_services').aggregate([
      {
        $lookup: {
          from: 'clients',
          localField: 'clientId',
          foreignField: '_id',
          as: 'client'
        }
      },
      {
        $unwind: '$client'
      },
      {
        $lookup: {
          from: 'vessels',
          localField: 'vesselId',
          foreignField: '_id',
          as: 'vessel'
        }
      },
      {
        $unwind: {
          path: '$vessel',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $project: {
          serviceId: '$_id',
          pickupDate: 1,
          pickupTime: 1,
          pickupLocation: 1,
          dropoffLocation: 1,
          moveType: 1,
          price: 1,
          currency: 1,
          status: 1,
          passengerCount: { $size: '$crewMembers' },
          clientName: '$client.name',
          clientSapCode: '$client.sapCode',
          vesselName: '$vessel.name',
          vesselImo: '$vessel.imo',
          invoiceNumber: 1,
          createdAt: 1,
          completedAt: 1
        }
      }
    ]).toArray();

    res.json(services);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint para métricas agregadas
router.get('/api/analytics/metrics', async (req, res) => {
  try {
    const metrics = {
      trucking: await getTruckingMetrics(),
      agency: await getAgencyMetrics(),
      ptyss: await getPTYSSMetrics(),
      clients: await getClientMetrics(),
      invoicing: await getInvoicingMetrics()
    };
    
    res.json(metrics);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

async function getTruckingMetrics() {
  const pipeline = [
    {
      $facet: {
        byStatus: [
          { $group: { _id: '$status', count: { $sum: 1 }, total: { $sum: '$price' } } }
        ],
        byMonth: [
          {
            $group: {
              _id: { 
                year: { $year: '$createdAt' },
                month: { $month: '$createdAt' }
              },
              count: { $sum: 1 },
              revenue: { $sum: '$price' }
            }
          }
        ],
        byContainerType: [
          { $group: { _id: '$containerType', count: { $sum: 1 } } }
        ],
        byClient: [
          {
            $group: { 
              _id: '$clientId',
              clientName: { $first: '$clientName' },
              totalRecords: { $sum: 1 },
              totalRevenue: { $sum: '$price' }
            }
          },
          { $sort: { totalRevenue: -1 } },
          { $limit: 10 }
        ]
      }
    }
  ];

  return await db.collection('trucking_records').aggregate(pipeline).toArray();
}
```

### Paso 2: Configurar Power BI Web Connector

```javascript
// power-bi-connector.js
// Crear un Custom Connector para Power BI

[DataSource.Kind="BarcosBIConnector", Publish="BarcosBIConnector.Publish"]
shared BarcosBIConnector.Data = Value.ReplaceType(BarcosBIConnector.Func, FuncType);

FuncType = type function (
    baseUrl as text
) as table meta [
    Documentation.Name = "Barcos BI Connector",
    Documentation.LongDescription = "Conecta con el sistema de facturación marítima"
];

BarcosBIConnector.Func = (baseUrl as text) =>
    let
        // Obtener token de autenticación
        token = GetAuthToken(baseUrl),
        
        // Definir endpoints
        endpoints = {
            {"Trucking Records", baseUrl & "/api/analytics/trucking"},
            {"Agency Services", baseUrl & "/api/analytics/agency"},
            {"PTYSS Records", baseUrl & "/api/analytics/ptyss"},
            {"Clients", baseUrl & "/api/analytics/clients"},
            {"Invoices", baseUrl & "/api/analytics/invoices"},
            {"Metrics", baseUrl & "/api/analytics/metrics"}
        },
        
        // Crear tabla de navegación
        NavTable = Table.FromRows(endpoints, {"Name", "Url"}),
        
        // Agregar columna de datos
        NavTableWithData = Table.AddColumn(
            NavTable, 
            "Data", 
            each GetData([Url], token)
        ),
        
        // Crear tabla de navegación final
        NavigationTable = Table.ToNavigationTable(
            NavTableWithData, 
            {"Name"}, 
            "Name", 
            "Data"
        )
    in
        NavigationTable;
```

### Paso 3: Configurar en Power BI Desktop

1. **Get Data → Web**
2. URL: `https://barcos-production.up.railway.app/api/analytics/trucking`
3. Headers:
   - Authorization: Bearer {token}
   - Content-Type: application/json

### Paso 4: Configurar Scheduled Refresh

1. Publicar en Power BI Service
2. Dataset Settings → Credentials
3. Schedule Refresh:
   - Frequency: Daily
   - Time: Multiple times (cada 30 min para near real-time)
   - Send failure notifications

---

## MÉTODO 3: EXPORT A SQL DATABASE
### (Para análisis histórico)

### Script de Migración MongoDB → PostgreSQL

```javascript
// migrate-to-postgres.js
const { MongoClient } = require('mongodb');
const { Client } = require('pg');

const mongoUri = 'mongodb://localhost:27017/barcos';
const pgConfig = {
  host: 'localhost',
  database: 'barcos_analytics',
  user: 'postgres',
  password: 'password',
  port: 5432
};

async function migrateData() {
  const mongo = new MongoClient(mongoUri);
  const pg = new Client(pgConfig);
  
  try {
    await mongo.connect();
    await pg.connect();
    
    const db = mongo.db('barcos');
    
    // Crear tablas en PostgreSQL
    await createPostgresTables(pg);
    
    // Migrar colección por colección
    await migrateCollection(db, pg, 'users', 'users');
    await migrateCollection(db, pg, 'clients', 'clients');
    await migrateCollection(db, pg, 'trucking_records', 'trucking_records');
    await migrateCollection(db, pg, 'agency_services', 'agency_services');
    await migrateCollection(db, pg, 'invoices', 'invoices');
    
    console.log('✅ Migración completada');
    
  } finally {
    await mongo.close();
    await pg.end();
  }
}

async function createPostgresTables(pg) {
  // Tabla de trucking_records
  await pg.query(`
    CREATE TABLE IF NOT EXISTS trucking_records (
      id VARCHAR(24) PRIMARY KEY,
      container_number VARCHAR(20),
      container_type VARCHAR(10),
      container_size INTEGER,
      full_empty VARCHAR(10),
      move_date DATE,
      move_type VARCHAR(20),
      origin VARCHAR(10),
      destination VARCHAR(10),
      price DECIMAL(10,2),
      status VARCHAR(20),
      client_id VARCHAR(24),
      client_name VARCHAR(200),
      client_sap_code VARCHAR(20),
      invoice_number VARCHAR(50),
      created_at TIMESTAMP,
      updated_at TIMESTAMP
    )
  `);
  
  // Tabla de agency_services
  await pg.query(`
    CREATE TABLE IF NOT EXISTS agency_services (
      id VARCHAR(24) PRIMARY KEY,
      pickup_date DATE,
      pickup_time TIME,
      pickup_location VARCHAR(100),
      dropoff_location VARCHAR(100),
      move_type VARCHAR(20),
      price DECIMAL(10,2),
      currency VARCHAR(3),
      status VARCHAR(20),
      passenger_count INTEGER,
      client_id VARCHAR(24),
      client_name VARCHAR(200),
      vessel_id VARCHAR(24),
      vessel_name VARCHAR(100),
      invoice_number VARCHAR(50),
      created_at TIMESTAMP,
      completed_at TIMESTAMP
    )
  `);
  
  // Índices para mejor performance
  await pg.query('CREATE INDEX idx_trucking_client ON trucking_records(client_id)');
  await pg.query('CREATE INDEX idx_trucking_date ON trucking_records(move_date)');
  await pg.query('CREATE INDEX idx_agency_client ON agency_services(client_id)');
  await pg.query('CREATE INDEX idx_agency_date ON agency_services(pickup_date)');
}

async function migrateCollection(db, pg, mongoCollection, pgTable) {
  console.log(`Migrando ${mongoCollection}...`);
  
  const collection = db.collection(mongoCollection);
  const documents = await collection.find({}).toArray();
  
  for (const doc of documents) {
    const flatDoc = flattenDocument(doc);
    await insertIntoPostgres(pg, pgTable, flatDoc);
  }
  
  console.log(`✓ ${documents.length} registros migrados de ${mongoCollection}`);
}

function flattenDocument(doc) {
  // Convertir ObjectId a string
  if (doc._id) {
    doc.id = doc._id.toString();
    delete doc._id;
  }
  
  // Convertir referencias de ObjectId
  Object.keys(doc).forEach(key => {
    if (doc[key] && doc[key]._bsontype === 'ObjectID') {
      doc[key] = doc[key].toString();
    }
  });
  
  // Convertir fechas
  Object.keys(doc).forEach(key => {
    if (doc[key] instanceof Date) {
      doc[key] = doc[key].toISOString();
    }
  });
  
  return doc;
}
```

### Conexión desde Power BI a PostgreSQL

1. Get Data → PostgreSQL database
2. Server: `localhost`
3. Database: `barcos_analytics`
4. Import múltiples tablas

---

## MÉTODO 4: AZURE DATA FACTORY
### (Enterprise Solution)

### Paso 1: Configurar Azure Data Factory

```json
{
  "name": "MongoDBToPowerBIPipeline",
  "properties": {
    "activities": [
      {
        "name": "CopyMongoDBData",
        "type": "Copy",
        "inputs": [
          {
            "referenceName": "MongoDBDataset",
            "type": "DatasetReference"
          }
        ],
        "outputs": [
          {
            "referenceName": "AzureSQLDataset",
            "type": "DatasetReference"
          }
        ],
        "typeProperties": {
          "source": {
            "type": "MongoDbV2Source",
            "batchSize": 100,
            "filter": "{status: {$ne: 'deleted'}}"
          },
          "sink": {
            "type": "AzureSqlSink",
            "writeBatchSize": 10000,
            "tableOption": "autoCreate"
          },
          "enableStaging": false,
          "translator": {
            "type": "TabularTranslator",
            "mappings": [
              {
                "source": {
                  "path": "$._id"
                },
                "sink": {
                  "name": "RecordId",
                  "type": "String"
                }
              },
              {
                "source": {
                  "path": "$.containerNumber"
                },
                "sink": {
                  "name": "ContainerNumber",
                  "type": "String"
                }
              }
            ]
          }
        }
      }
    ],
    "triggers": [
      {
        "name": "DailyTrigger",
        "type": "ScheduleTrigger",
        "typeProperties": {
          "recurrence": {
            "frequency": "Day",
            "interval": 1,
            "startTime": "2024-01-01T02:00:00Z"
          }
        }
      }
    ]
  }
}
```

### Paso 2: Linked Service para MongoDB

```json
{
  "name": "MongoDBLinkedService",
  "properties": {
    "type": "MongoDbV2",
    "typeProperties": {
      "connectionString": "mongodb://usuario:password@servidor:27017/barcos?ssl=true&replicaSet=atlas-xxx",
      "database": "barcos"
    }
  }
}
```

---

## MÉTODO 5: PYTHON SCRIPT CON PYMONGO
### (Máximo control y flexibilidad)

### Script de Extracción y Transformación

```python
# extract_to_powerbi.py
import pymongo
import pandas as pd
from datetime import datetime, timedelta
import pyodbc
from sqlalchemy import create_engine
import schedule
import time

class MongoToPowerBI:
    def __init__(self):
        # Conexión MongoDB
        self.mongo_client = pymongo.MongoClient(
            "mongodb://localhost:27017/"
        )
        self.db = self.mongo_client['barcos']
        
        # Conexión SQL Server para Power BI
        self.sql_engine = create_engine(
            'mssql+pyodbc://username:password@server/database?driver=ODBC+Driver+17+for+SQL+Server'
        )
    
    def extract_trucking_data(self):
        """Extraer datos de trucking con transformaciones"""
        
        pipeline = [
            {
                '$lookup': {
                    'from': 'clients',
                    'localField': 'clientId',
                    'foreignField': '_id',
                    'as': 'client'
                }
            },
            {
                '$unwind': {
                    'path': '$client',
                    'preserveNullAndEmptyArrays': True
                }
            },
            {
                '$project': {
                    'record_id': {'$toString': '$_id'},
                    'container_number': 1,
                    'container_type': 1,
                    'container_size': 1,
                    'full_empty': '$fe',
                    'move_date': 1,
                    'move_type': 1,
                    'origin': 1,
                    'destination': 1,
                    'price': 1,
                    'status': 1,
                    'client_name': '$client.name',
                    'client_sap': '$client.sapCode',
                    'client_type': '$client.type',
                    'invoice_number': 1,
                    'created_at': 1,
                    'year': {'$year': '$move_date'},
                    'month': {'$month': '$move_date'},
                    'quarter': {
                        '$cond': [
                            {'$lte': [{'$month': '$move_date'}, 3]}, 'Q1',
                            {'$cond': [
                                {'$lte': [{'$month': '$move_date'}, 6]}, 'Q2',
                                {'$cond': [
                                    {'$lte': [{'$month': '$move_date'}, 9]}, 'Q3',
                                    'Q4'
                                ]}
                            ]}
                        ]
                    },
                    'week': {'$week': '$move_date'},
                    'day_of_week': {'$dayOfWeek': '$move_date'},
                    'route': {'$concat': ['$origin', '-', '$destination']}
                }
            }
        ]
        
        records = list(self.db.trucking_records.aggregate(pipeline))
        df = pd.DataFrame(records)
        
        # Transformaciones adicionales
        if not df.empty:
            # Categorías de precio
            df['price_category'] = pd.cut(
                df['price'], 
                bins=[0, 100, 500, 1000, float('inf')],
                labels=['Low', 'Medium', 'High', 'Premium']
            )
            
            # Días desde la creación
            df['days_since_created'] = (
                datetime.now() - pd.to_datetime(df['created_at'])
            ).dt.days
            
            # Indicadores de performance
            df['is_delayed'] = df['status'] == 'pending'
            df['is_completed'] = df['status'] == 'completed'
            df['is_invoiced'] = df['invoice_number'].notna()
        
        return df
    
    def extract_agency_data(self):
        """Extraer datos de agency services"""
        
        pipeline = [
            {
                '$lookup': {
                    'from': 'clients',
                    'localField': 'clientId',
                    'foreignField': '_id',
                    'as': 'client'
                }
            },
            {
                '$lookup': {
                    'from': 'vessels',
                    'localField': 'vesselId',
                    'foreignField': '_id',
                    'as': 'vessel'
                }
            },
            {
                '$unwind': {'path': '$client', 'preserveNullAndEmptyArrays': True}
            },
            {
                '$unwind': {'path': '$vessel', 'preserveNullAndEmptyArrays': True}
            },
            {
                '$project': {
                    'service_id': {'$toString': '$_id'},
                    'pickup_date': 1,
                    'pickup_time': 1,
                    'pickup_location': 1,
                    'dropoff_location': 1,
                    'move_type': 1,
                    'price': 1,
                    'currency': 1,
                    'status': 1,
                    'passenger_count': {'$size': '$crewMembers'},
                    'client_name': '$client.name',
                    'client_sap': '$client.sapCode',
                    'vessel_name': '$vessel.name',
                    'vessel_imo': '$vessel.imo',
                    'created_at': 1,
                    'completed_at': 1,
                    'duration_hours': {
                        '$divide': [
                            {'$subtract': ['$completed_at', '$created_at']},
                            3600000  # Convertir ms a horas
                        ]
                    },
                    'route': {
                        '$concat': ['$pickup_location', ' → ', '$dropoff_location']
                    }
                }
            }
        ]
        
        services = list(self.db.agency_services.aggregate(pipeline))
        return pd.DataFrame(services)
    
    def create_summary_metrics(self):
        """Crear métricas resumidas para dashboards"""
        
        metrics = {}
        
        # Métricas de Trucking
        trucking_metrics = self.db.trucking_records.aggregate([
            {
                '$group': {
                    '_id': None,
                    'total_records': {'$sum': 1},
                    'total_revenue': {'$sum': '$price'},
                    'avg_price': {'$avg': '$price'},
                    'unique_clients': {'$addToSet': '$clientId'},
                    'containers_processed': {'$addToSet': '$containerNumber'}
                }
            }
        ])
        
        # Métricas de Agency
        agency_metrics = self.db.agency_services.aggregate([
            {
                '$group': {
                    '_id': None,
                    'total_services': {'$sum': 1},
                    'total_revenue': {'$sum': '$price'},
                    'avg_price': {'$avg': '$price'},
                    'total_passengers': {'$sum': {'$size': '$crewMembers'}},
                    'unique_vessels': {'$addToSet': '$vesselId'}
                }
            }
        ])
        
        return metrics
    
    def save_to_sql(self, df, table_name):
        """Guardar DataFrame en SQL Server"""
        
        df.to_sql(
            name=table_name,
            con=self.sql_engine,
            if_exists='replace',
            index=False,
            chunksize=1000
        )
        print(f"✅ Tabla {table_name} actualizada: {len(df)} registros")
    
    def run_etl(self):
        """Ejecutar proceso ETL completo"""
        
        print(f"🚀 Iniciando ETL - {datetime.now()}")
        
        try:
            # Extraer datos
            trucking_df = self.extract_trucking_data()
            agency_df = self.extract_agency_data()
            
            # Guardar en SQL
            self.save_to_sql(trucking_df, 'bi_trucking_records')
            self.save_to_sql(agency_df, 'bi_agency_services')
            
            # Crear vista materializada para Power BI
            self.create_materialized_views()
            
            print(f"✅ ETL completado exitosamente - {datetime.now()}")
            
        except Exception as e:
            print(f"❌ Error en ETL: {str(e)}")
    
    def create_materialized_views(self):
        """Crear vistas materializadas para Power BI"""
        
        views_sql = """
        -- Vista de análisis de trucking
        CREATE OR ALTER VIEW vw_trucking_analysis AS
        SELECT 
            record_id,
            container_number,
            container_type,
            container_size,
            full_empty,
            move_date,
            YEAR(move_date) as year,
            MONTH(move_date) as month,
            DATENAME(QUARTER, move_date) as quarter,
            DATENAME(WEEKDAY, move_date) as weekday,
            origin,
            destination,
            CONCAT(origin, '-', destination) as route,
            price,
            status,
            client_name,
            client_sap,
            CASE 
                WHEN price < 100 THEN 'Low'
                WHEN price < 500 THEN 'Medium'
                WHEN price < 1000 THEN 'High'
                ELSE 'Premium'
            END as price_category,
            DATEDIFF(day, created_at, GETDATE()) as days_since_created
        FROM bi_trucking_records;
        
        -- Vista de KPIs
        CREATE OR ALTER VIEW vw_kpis AS
        SELECT 
            'Trucking' as module,
            COUNT(*) as total_records,
            SUM(price) as total_revenue,
            AVG(price) as avg_price,
            COUNT(DISTINCT client_name) as unique_clients,
            COUNT(DISTINCT container_number) as unique_containers
        FROM bi_trucking_records
        UNION ALL
        SELECT 
            'Agency' as module,
            COUNT(*) as total_records,
            SUM(price) as total_revenue,
            AVG(price) as avg_price,
            COUNT(DISTINCT client_name) as unique_clients,
            COUNT(DISTINCT vessel_name) as unique_containers
        FROM bi_agency_services;
        """
        
        with self.sql_engine.connect() as conn:
            conn.execute(views_sql)
    
    def schedule_etl(self):
        """Programar ejecución automática"""
        
        # Ejecutar cada 30 minutos
        schedule.every(30).minutes.do(self.run_etl)
        
        # Ejecutar a horas específicas
        schedule.every().day.at("06:00").do(self.run_etl)
        schedule.every().day.at("12:00").do(self.run_etl)
        schedule.every().day.at("18:00").do(self.run_etl)
        
        print("📅 ETL programado. Ejecutando...")
        
        while True:
            schedule.run_pending()
            time.sleep(60)

if __name__ == "__main__":
    etl = MongoToPowerBI()
    
    # Ejecutar una vez
    etl.run_etl()
    
    # O programar ejecución continua
    # etl.schedule_etl()
```

### Instalación de Dependencias

```bash
# Instalar librerías Python necesarias
pip install pymongo pandas pyodbc sqlalchemy schedule

# Para conexión con SQL Server
# Windows: Instalar ODBC Driver 17 for SQL Server
# macOS: brew install unixodbc freetds
# Linux: sudo apt-get install unixodbc-dev
```

---

## IMPLEMENTACIÓN RECOMENDADA

### Para tu Sistema Actual

Considerando que tienes:
- MongoDB como base de datos
- Backend en Node.js con API REST
- Sistema en producción en Railway

**Recomiendo la siguiente arquitectura:**

### 1. FASE 1: API REST + Power BI (Inmediato)

```javascript
// backend/analytics-api.js
const express = require('express');
const router = express.Router();

// Middleware de caché para reducir carga
const cache = require('memory-cache');

router.get('/api/bi/dataset/:collection', authenticateBI, (req, res) => {
  const { collection } = req.params;
  const { startDate, endDate, clientId } = req.query;
  
  // Generar cache key
  const cacheKey = `bi_${collection}_${startDate}_${endDate}_${clientId}`;
  
  // Verificar caché
  const cachedData = cache.get(cacheKey);
  if (cachedData) {
    return res.json(cachedData);
  }
  
  // Query con filtros
  const query = {};
  if (startDate && endDate) {
    query.createdAt = {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    };
  }
  if (clientId) query.clientId = clientId;
  
  // Obtener datos
  const data = await db.collection(collection)
    .find(query)
    .limit(100000) // Límite de seguridad
    .toArray();
  
  // Guardar en caché por 5 minutos
  cache.put(cacheKey, data, 5 * 60 * 1000);
  
  res.json(data);
});
```

### 2. FASE 2: MongoDB BI Connector (Mediano Plazo)

Si migras a MongoDB Atlas:
1. Activar MongoDB Charts (incluido en Atlas)
2. Configurar BI Connector
3. Conexión directa desde Power BI

### 3. FASE 3: Data Warehouse (Largo Plazo)

Para análisis histórico pesado:
1. ETL nocturno MongoDB → PostgreSQL/SQL Server
2. Datos agregados y optimizados para BI
3. Power BI conectado al Data Warehouse

---

## CONFIGURACIÓN EN POWER BI

### Power Query para Transformación

```powerquery
let
    // Obtener datos de la API
    Source = Web.Contents(
        "https://barcos-production.up.railway.app/api/bi/dataset/trucking",
        [
            Headers = [
                #"Authorization" = "Bearer " & Token,
                #"Content-Type" = "application/json"
            ]
        ]
    ),
    
    // Parsear JSON
    JsonData = Json.Document(Source),
    
    // Convertir a tabla
    Table = Table.FromList(JsonData, Splitter.SplitByNothing(), null, null, ExtraValues.Error),
    
    // Expandir columnas
    ExpandedTable = Table.ExpandRecordColumn(
        Table, 
        "Column1", 
        {"record_id", "container_number", "container_type", "price", "status", "client_name", "move_date"},
        {"RecordID", "Container", "Type", "Price", "Status", "Client", "Date"}
    ),
    
    // Transformaciones
    TransformedTable = Table.TransformColumns(ExpandedTable, {
        {"Date", each DateTime.From(_), type datetime},
        {"Price", each Number.From(_), type number}
    }),
    
    // Agregar columnas calculadas
    FinalTable = Table.AddColumn(
        TransformedTable,
        "PriceCategory",
        each if [Price] < 100 then "Low"
             else if [Price] < 500 then "Medium"
             else if [Price] < 1000 then "High"
             else "Premium"
    )
in
    FinalTable
```

### Medidas DAX Recomendadas

```dax
// Total Revenue
Total Revenue = SUM(TruckingRecords[Price])

// Revenue YTD
Revenue YTD = TOTALYTD([Total Revenue], 'Calendar'[Date])

// Revenue Growth %
Revenue Growth % = 
VAR CurrentPeriod = [Total Revenue]
VAR PreviousPeriod = CALCULATE([Total Revenue], DATEADD('Calendar'[Date], -1, MONTH))
RETURN
DIVIDE(CurrentPeriod - PreviousPeriod, PreviousPeriod, 0)

// Active Clients
Active Clients = DISTINCTCOUNT(TruckingRecords[ClientID])

// Average Container Price
Avg Container Price = AVERAGE(TruckingRecords[Price])

// Completion Rate
Completion Rate = 
DIVIDE(
    CALCULATE(COUNTROWS(TruckingRecords), TruckingRecords[Status] = "completed"),
    COUNTROWS(TruckingRecords),
    0
)
```

---

## SEGURIDAD Y MEJORES PRÁCTICAS

### 1. Autenticación API para Power BI

```javascript
// Crear API Key específica para BI
const authenticateBI = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  
  // Verificar API Key para Power BI
  if (apiKey !== process.env.POWERBI_API_KEY) {
    return res.status(401).json({ error: 'Invalid API Key' });
  }
  
  // Rate limiting
  const ip = req.ip;
  const requests = rateLimiter.get(ip) || 0;
  
  if (requests > 100) { // Max 100 requests por hora
    return res.status(429).json({ error: 'Rate limit exceeded' });
  }
  
  rateLimiter.set(ip, requests + 1);
  next();
};
```

### 2. Optimización de Queries

```javascript
// Índices recomendados en MongoDB
db.trucking_records.createIndex({ createdAt: -1, clientId: 1 });
db.trucking_records.createIndex({ status: 1, price: 1 });
db.agency_services.createIndex({ pickupDate: -1, clientId: 1 });
db.invoices.createIndex({ invoiceDate: -1, moduleId: 1 });
```

### 3. Datos Sensibles

```javascript
// Excluir campos sensibles
const sanitizeDataForBI = (data) => {
  return data.map(record => {
    const sanitized = { ...record };
    delete sanitized.password;
    delete sanitized.internalNotes;
    delete sanitized.sensitiveData;
    return sanitized;
  });
};
```

---

## CONCLUSIÓN

Para tu sistema, recomiendo empezar con el **Método 2 (API REST)** porque:

1. ✅ Ya tienes la API construida
2. ✅ Mínima inversión adicional
3. ✅ Control total sobre los datos expuestos
4. ✅ Fácil de implementar y mantener
5. ✅ Power BI puede actualizar automáticamente

Luego puedes evolucionar a MongoDB BI Connector o un Data Warehouse dedicado según crezcan las necesidades de análisis.

---

**Última actualización**: Diciembre 2024
**Versión**: 1.0.0