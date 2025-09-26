// Test script para verificar el orden de las etiquetas XML
const { js2xml } = require('xml-js');

// Simular la estructura de OtherItem con el nuevo orden
const testOtherItem = {
  "IncomeRebateCode": "I",
  "AmntTransacCur": "-160.000",
  "BaseUnitMeasure": "EA",
  "Qty": "1.00",
  "ProfitCenter": "PAPANB110",
  "ReferencePeriod": "09.2025",
  "Service": "TRK002",
  "Activity": "TRK",
  "Pillar": "TRSP",
  "BUCountry": "PA",
  "ServiceCountry": "PA",
  "ClientType": "MEDLOG",
  "BusinessType": "E",
  "FullEmpty": "FULL",
  "CtrISOcode": "45R1",
  "CtrType": "HR",
  "CtrSize": "40",
  "CtrCategory": "R"
};

const xmlObject = {
  "ns1:LogisticARInvoices": {
    _attributes: {
      "xmlns:ns1": "urn:medlog.com:MSC_GVA_FS:CustomerInvoice:01.00"
    },
    "CustomerInvoice": {
      "Protocol": {
        "SourceSystem": "PTGFACTUGO",
        "TechnicalContact": "almeida.kant@ptyrmgmt.com;renee.taylor@ptyrmgmt.com"
      },
      "Header": {
        "CompanyCode": "9325",
        "DocumentType": "XL",
        "DocumentDate": "20250912",
        "PostingDate": "20250917",
        "TransactionCurrency": "USD",
        "Reference": "52124",
        "EntityDocNbr": "52124"
      },
      "AdditionalTexts": {
        "LongHeaderTextLangKey": "EN"
      },
      "CustomerOpenItem": {
        "CustomerNbr": "1002012941",
        "AmntTransactCur": "180.000",
        "BaselineDate": "20251010",
        "DueDate": "20251008"
      },
      "OtherItems": {
        "OtherItem": [testOtherItem]
      }
    }
  }
};

const xmlContent = js2xml(xmlObject, { compact: true, spaces: 2 });
const fullXml = '<?xml version="1.0" encoding="UTF-8"?>\n' + xmlContent;

console.log('=== XML GENERADO CON NUEVO ORDEN DE ETIQUETAS ===');
console.log(fullXml);

// Verificar que las etiquetas están en el orden correcto
const xmlString = fullXml;
const expectedOrder = [
  'IncomeRebateCode',
  'AmntTransacCur', 
  'BaseUnitMeasure',
  'Qty',
  'ProfitCenter',
  'ReferencePeriod',
  'Service',
  'Activity',
  'Pillar',
  'BUCountry',
  'ServiceCountry',
  'ClientType',
  'BusinessType',
  'FullEmpty',
  'CtrISOcode',
  'CtrType',
  'CtrSize',
  'CtrCategory'
];

console.log('\n=== VERIFICACIÓN DEL ORDEN DE ETIQUETAS ===');
let lastIndex = -1;
let orderCorrect = true;

for (const tag of expectedOrder) {
  const index = xmlString.indexOf(`<${tag}>`);
  if (index === -1) {
    console.log(`❌ Etiqueta ${tag} no encontrada`);
    orderCorrect = false;
  } else if (index < lastIndex) {
    console.log(`❌ Etiqueta ${tag} está fuera de orden (índice: ${index}, anterior: ${lastIndex})`);
    orderCorrect = false;
  } else {
    console.log(`✅ ${tag} en posición correcta (índice: ${index})`);
    lastIndex = index;
  }
}

console.log(`\n${orderCorrect ? '✅ ORDEN CORRECTO' : '❌ ORDEN INCORRECTO'}`);
