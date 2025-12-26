# 🚢 Módulo Agency (CREW) - Implementación Completa

## ✅ Ajustes Realizados según Documento SAP

### 1. 📊 Estructura de Precios por Cantidad de Tripulantes

**Implementado en**: `agencyPricingConfigSchema.ts`

```typescript
crewRates: [
  { minCrew: 1, maxCrew: 3, rateMultiplier: 1.0 },   // Tarifa estándar
  { minCrew: 4, maxCrew: 7, rateMultiplier: 1.5 },   // Vehículo mediano
  { minCrew: 8, maxCrew: 99, rateMultiplier: 2.0 }   // Vehículo grande/múltiple
]
```

### 2. 🛣️ Rutas con Precios Single y Roundtrip

**Actualizado en**: Schema y seed de precios

- **Single (Solo ida)**: Precio base
- **Roundtrip (Ida y vuelta)**: Precio con multiplicador (~1.75x)
- **Leg**: Campo agregado para identificar tramos

```typescript
fixedRoutes: {
  from: 'HOTEL PTY',
  to: 'PTY PORT',
  leg: 'PTY-PORT',
  price: 120,              // Single
  roundtripPrice: 200,     // Roundtrip
  tauliaCode: 'ECR000669',
  sapCode: 'TRK137'
}
```

### 3. 📋 Catálogos Implementados

#### Taulia Codes
- ECR000669 - Crew Members Transfer
- ECR001253 - Reefer Technicians (+10%)
- GEN000089 - VIP/MSC Personnel (+30%)
- CLA00001 - Security/Seal Check (+25%)
- SHP242 - Shipping Service
- TRK137 - Transport Service

#### Crew Ranks (Jerarquía)
**Officers:**
- CAPT - Captain (VIP)
- CHOFF - Chief Officer (VIP)
- CHENG - Chief Engineer (VIP)
- 2OFF/3OFF - Second/Third Officers

**Ratings:**
- AB - Able Seaman
- OS - Ordinary Seaman
- OILER - Engine Room Oiler
- COOK/STWD - Catering Staff
- CADET - Trainee

#### Crew Change Services
- SIGN_ON - Embarque completo
- SIGN_OFF - Desembarque completo
- MED_EXAM - Examen médico
- HOTEL_TRANS - Transfer hotel
- SHORE_LEAVE - Transporte para licencia

### 4. 🚗 Base de Datos de Drivers

**Tipos de Driver:**
- **In-house**: Personal interno
- **Outsourcing**: Conductores externos

```typescript
drivers: {
  name: 'Juan Pérez',
  company: 'Internal',
  type: 'in_house',
  vehicles: ['sedan', 'van', 'minibus'],
  languages: ['Spanish', 'English'],
  vipCertified: true
}
```

### 5. ✅ Manejo de Status Mejorado

**Nuevo flujo (NO pasa directo a PreFactura):**

```typescript
status: ['pending', 'in_progress', 'completed', 'ready_for_invoice', 'prefacturado', 'facturado']
reviewStatus: ['pending_review', 'reviewed', 'approved', 'rejected']
```

**Flujo correcto:**
1. `pending` → Servicio solicitado
2. `in_progress` → Servicio en ejecución
3. `completed` → Servicio completado
4. `pending_review` → Esperando revisión ⚠️
5. `approved` → Aprobado para facturación
6. `ready_for_invoice` → Listo para prefactura
7. `prefacturado` → En prefactura
8. `facturado` → Facturado

### 6. 📄 Estructura XML para Agency (CREW)

**Headers requeridos:**
```xml
<Protocol>
  <SourceSystem>CREW</SourceSystem>
  <TechnicalContact>emails@contact.com</TechnicalContact>
</Protocol>

<Header>
  <CompanyCode>9326</CompanyCode>
  <DocumentType>XL</DocumentType>
  <TransactionCurrency>USD</TransactionCurrency>
  <Reference>AG0000000000505</Reference>
  <EntityDocNbr>AGB0000000000505</EntityDocNbr>
</Header>
```

### 7. 💰 Fórmula de Cálculo de Precios

```
1. Precio Base = Tarifa Base + (Distancia × Tarifa/km)
2. Ajuste Tripulación = Precio Base × Multiplicador_Crew (1-3: x1.0, 4-7: x1.5, 8+: x2.0)
3. Ajuste Servicio = Según Taulia Code (VIP: +30%, Security: +25%, etc)
4. Ajuste Viaje = Single o Roundtrip (x1.75)
5. Precio Final = MAX($35, Subtotal + Cargos - Descuentos)
```

## 📁 Archivos Creados/Modificados

### Backend
- ✅ `/api/src/database/schemas/agencyPricingConfigSchema.ts` - Agregado crewRates, roundtrip
- ✅ `/api/src/database/schemas/agencyServiceSchema.ts` - Agregado reviewStatus
- ✅ `/api/src/database/schemas/agencyCatalogSchema.ts` - Agregado crew_rank, crew_change_service
- ✅ `/api/scripts/seedAgencyCrewPricing.ts` - Configuración de precios CREW
- ✅ `/api/scripts/seedAgencyCrewCatalogs.ts` - Catálogos CREW

### Frontend
- ✅ `/front/lib/features/agencyServices/agencyCatalogsSlice.ts` - Tipos actualizados

## 🚀 Scripts de Inicialización

```bash
# 1. Poblar configuración de precios CREW
npm run seed:agency-crew-pricing

# 2. Poblar catálogos (Taulia, Ranks, Drivers)
npm run seed:agency-crew-catalogs

# 3. Poblar rutas con precios
npm run seed:agency-route-pricing
```

## 📊 Resumen de Cambios

| Componente | Estado | Descripción |
|------------|--------|-------------|
| Precios por cantidad | ✅ | 1-3, 4-7, 8+ personas |
| Roundtrip vs Single | ✅ | Multiplicador ~1.75x |
| Taulia Codes | ✅ | 6 códigos con ajustes |
| Crew Ranks | ✅ | 12 rangos jerárquicos |
| Drivers DB | ✅ | In-house y Outsourcing |
| Status Review | ✅ | No pasa directo a prefactura |
| XML Structure | ✅ | Headers CREW definidos |

## ⚠️ Puntos Importantes

1. **NO usar el formulario actual de Agency** - Crear uno nuevo basado en esta estructura
2. **Revisar siempre antes de prefacturar** - Status `pending_review` obligatorio
3. **Aplicar multiplicadores en orden**: Distancia → Tripulación → Servicio → Viaje
4. **Códigos SAP/Taulia** son obligatorios para generar XML

## 🔄 Próximos Pasos

1. Crear nuevo formulario de captura de servicios Agency
2. Implementar flujo de revisión y aprobación
3. Generar XML con estructura CREW
4. Integrar con sistema de facturación SAP

---

**Fecha de implementación**: Septiembre 2024
**Versión**: 1.0
**Módulo**: Agency (CREW)