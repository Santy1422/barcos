# Actualización de ProfitCenter en XML de Agency

## Cambios Realizados

Se actualizaron los valores de `ProfitCenter` en la generación del XML SAP para Agency según el tipo de servicio.

### Archivo Modificado

**`front/lib/xml-generator.ts`** - Función `generateAgencyInvoiceXML`

### Cambios Específicos

#### OtherItem 1: SHP242 - Crew Transportation

**Antes:**
```typescript
{
  "IncomeRebateCode": "I",
  "AmntTransacCur": (-ship242Total).toFixed(2),
  "BaseUnitMeasure": "EA",
  "Qty": "1.00",
  "ProfitCenter": "PAPANA110",  // ❌ Valor anterior
  "ReferencePeriod": formatReferencePeriod(invoice.invoiceDate),
  "Service": "SHP242",
  "Activity": "SHP",
  "Pillar": "NOPS",
  "BUCountry": "PA",
  "ServiceCountry": "PA",
  "ClientType": "MSCGVA"
}
```

**Después:**
```typescript
{
  "IncomeRebateCode": "I",
  "AmntTransacCur": (-ship242Total).toFixed(2),
  "BaseUnitMeasure": "EA",
  "Qty": "1.00",
  "ProfitCenter": "PAPANC440",  // ✅ Nuevo valor
  "ReferencePeriod": formatReferencePeriod(invoice.invoiceDate),
  "Service": "SHP242",
  "Activity": "SHP",
  "Pillar": "NOPS",
  "BUCountry": "PA",
  "ServiceCountry": "PA",
  "ClientType": "MSCGVA"
}
```

#### OtherItem 2: TRK137 - Transportation (Waiting Time)

**Antes:**
```typescript
{
  "IncomeRebateCode": "I",
  "AmntTransacCur": (-trk137Total).toFixed(2),
  "BaseUnitMeasure": "EA",
  "Qty": "1.00",
  "ProfitCenter": "PAPANA110",  // ❌ Valor anterior
  "ReferencePeriod": formatReferencePeriod(invoice.invoiceDate),
  "Service": "TRK137",
  "Activity": "TRK",
  "Pillar": "TRSP",
  "BUCountry": "PA",
  "ServiceCountry": "PA",
  "ClientType": "MSCGVA",
  "FullEmpty": "FULL"
}
```

**Después:**
```typescript
{
  "IncomeRebateCode": "I",
  "AmntTransacCur": (-trk137Total).toFixed(2),
  "BaseUnitMeasure": "EA",
  "Qty": "1.00",
  "ProfitCenter": "PAPANC430",  // ✅ Nuevo valor
  "ReferencePeriod": formatReferencePeriod(invoice.invoiceDate),
  "Service": "TRK137",
  "Activity": "TRK",
  "Pillar": "TRSP",
  "BUCountry": "PA",
  "ServiceCountry": "PA",
  "ClientType": "MSCGVA",
  "FullEmpty": "FULL"
}
```

## Resumen de Cambios

| Service | Descripción | ProfitCenter Anterior | ProfitCenter Nuevo |
|---------|-------------|----------------------|-------------------|
| **SHP242** | Crew Transportation | PAPANA110 | **PAPANC440** |
| **TRK137** | Transportation (Waiting Time) | PAPANA110 | **PAPANC430** |

## Ejemplo de XML Generado

```xml
<OtherItems>
  <OtherItem>
    <IncomeRebateCode>I</IncomeRebateCode>
    <AmntTransacCur>-250.00</AmntTransacCur>
    <BaseUnitMeasure>EA</BaseUnitMeasure>
    <Qty>1.00</Qty>
    <ProfitCenter>PAPANC440</ProfitCenter>  <!-- ✅ SHP242 -->
    <ReferencePeriod>202510</ReferencePeriod>
    <Service>SHP242</Service>
    <Activity>SHP</Activity>
    <Pillar>NOPS</Pillar>
    <BUCountry>PA</BUCountry>
    <ServiceCountry>PA</ServiceCountry>
    <ClientType>MSCGVA</ClientType>
  </OtherItem>
  <OtherItem>
    <IncomeRebateCode>I</IncomeRebateCode>
    <AmntTransacCur>-50.00</AmntTransacCur>
    <BaseUnitMeasure>EA</BaseUnitMeasure>
    <Qty>1.00</Qty>
    <ProfitCenter>PAPANC430</ProfitCenter>  <!-- ✅ TRK137 -->
    <ReferencePeriod>202510</ReferencePeriod>
    <Service>TRK137</Service>
    <Activity>TRK</Activity>
    <Pillar>TRSP</Pillar>
    <BUCountry>PA</BUCountry>
    <ServiceCountry>PA</ServiceCountry>
    <ClientType>MSCGVA</ClientType>
    <FullEmpty>FULL</FullEmpty>
  </OtherItem>
</OtherItems>
```

## Impacto

Este cambio afecta a **todos los XML de Agency** generados a partir de ahora para enviarse a SAP. Los valores de ProfitCenter ahora son específicos para cada tipo de servicio:

- **SHP242 (Crew Transportation)**: Centro de beneficio PAPANC440
- **TRK137 (Waiting Time)**: Centro de beneficio PAPANC430

## Verificación

Para verificar que los cambios funcionan correctamente:

1. Ir a **Agency → SAP Invoice**
2. Seleccionar servicios completados
3. Facturar y generar XML
4. Verificar en el XML generado que:
   - El OtherItem con `<Service>SHP242</Service>` tenga `<ProfitCenter>PAPANC440</ProfitCenter>`
   - El OtherItem con `<Service>TRK137</Service>` tenga `<ProfitCenter>PAPANC430</ProfitCenter>`

## Estado

✅ **COMPLETADO** - ProfitCenter actualizado para ambos servicios de Agency.

