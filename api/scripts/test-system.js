/**
 * Script de pruebas del sistema PTG/Trucking
 * Ejecutar: node scripts/test-system.js
 *
 * Guarda logs en: logs/test-results-[fecha].log
 */

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const MONGO_URI = process.env.USER_MONGO_URI;

// Crear directorio de logs si no existe
const logsDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Archivo de log
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const logFile = path.join(logsDir, `test-results-${timestamp}.log`);
const logStream = fs.createWriteStream(logFile, { flags: 'a' });

function log(message) {
  const line = `[${new Date().toISOString()}] ${message}`;
  console.log(line);
  logStream.write(line + '\n');
}

function logSection(title) {
  const separator = '='.repeat(50);
  log('');
  log(separator);
  log(title);
  log(separator);
}

// Schemas
const containerTypeSchema = new mongoose.Schema({
  code: String, name: String, category: String, sapCode: String, isActive: Boolean
});
const truckingRouteSchema = new mongoose.Schema({
  name: String, origin: String, destination: String, containerType: String,
  routeType: String, price: Number, status: String, cliente: String,
  routeArea: String, sizeContenedor: String
});
const recordSchema = new mongoose.Schema({
  module: String, status: String, totalValue: Number, data: Object,
  containerConsecutive: String, clientId: String
});

const ContainerType = mongoose.model('containertypes', containerTypeSchema);
const TruckingRoute = mongoose.model('truckingroutes', truckingRouteSchema);
const Record = mongoose.model('records', recordSchema);

async function runTests() {
  let passed = 0;
  let failed = 0;
  const issues = []; // Guardar problemas encontrados

  try {
    logSection('INICIANDO PRUEBAS DEL SISTEMA');
    log(`Fecha: ${new Date().toLocaleString()}`);
    log(`Log guardado en: ${logFile}`);
    log(`Servidor: ${process.env.NODE_ENV || 'development'}`);
    log(`MongoDB: ${MONGO_URI ? MONGO_URI.substring(0, 30) + '...' : 'NO CONFIGURADO'}`);

    // Conexión
    await mongoose.connect(MONGO_URI);
    log('✅ Conexión a MongoDB OK');

    // TEST 1: Tipos de contenedores
    logSection('TEST 1: TIPOS DE CONTENEDORES');
    const containerTypes = await ContainerType.find({ isActive: true }).lean();
    log(`Total tipos activos: ${containerTypes.length}`);

    const expectedCategories = {
      'CA': 'DRY', 'CT': 'DRY', 'DC': 'DRY', 'DV': 'DRY',
      'HR': 'REEFE', 'RE': 'REEFE', 'RF': 'REEFE'
    };

    for (const [code, expected] of Object.entries(expectedCategories)) {
      const ct = containerTypes.find(c => c.code === code);
      if (ct) {
        if (ct.category === expected) {
          log(`  ✅ ${code}: ${ct.category} (correcto)`);
          passed++;
        } else {
          log(`  ❌ ${code}: ${ct.category} (esperado: ${expected})`);
          failed++;
        }
      } else {
        log(`  ⚠️ ${code}: No encontrado`);
      }
    }

    // TEST 2: Rutas CCT/CTB
    logSection('TEST 2: RUTAS CCT/CTB HR MSC 40');
    const hrRoutes = await TruckingRoute.find({
      name: 'CCT/CTB', containerType: 'HR', cliente: 'MSC',
      sizeContenedor: '40', routeType: 'SINGLE'
    }).lean();

    log(`Rutas encontradas: ${hrRoutes.length}`);
    hrRoutes.forEach(r => log(`  - ${r.status}: $${r.price}`));

    const fullRoute = hrRoutes.find(r => r.status === 'FULL');
    const emptyRoute = hrRoutes.find(r => r.status === 'EMPTY');

    if (fullRoute && fullRoute.price === 235) {
      log('✅ Ruta FULL existe con precio $235');
      passed++;
    } else {
      log('❌ Ruta FULL no encontrada o precio incorrecto');
      failed++;
    }

    if (emptyRoute && emptyRoute.price === 103) {
      log('✅ Ruta EMPTY existe con precio $103');
      passed++;
    } else {
      log('❌ Ruta EMPTY no encontrada o precio incorrecto');
      failed++;
    }

    // TEST 3: Simulación de matching con F/E
    logSection('TEST 3: MATCHING CON CAMPO F/E');

    const testCases = [
      { fe: '2', expectedStatus: 'FULL', expectedPrice: 235 },
      { fe: 'F', expectedStatus: 'FULL', expectedPrice: 235 },
      { fe: 'FULL', expectedStatus: 'FULL', expectedPrice: 235 },
      { fe: 'E', expectedStatus: 'EMPTY', expectedPrice: 103 },
      { fe: '0', expectedStatus: 'EMPTY', expectedPrice: 103 },
      { fe: '1', expectedStatus: 'EMPTY', expectedPrice: 103 },
    ];

    for (const tc of testCases) {
      const feValue = tc.fe.toString().trim().toUpperCase();
      const targetStatus =
        (feValue === 'F' || feValue === 'FULL' || feValue === '2') ? 'FULL' :
        (feValue === 'E' || feValue === 'EMPTY' || feValue === '1' || feValue === '0') ? 'EMPTY' : null;

      const matchedRoute = hrRoutes.find(r => r.status === targetStatus);

      if (targetStatus === tc.expectedStatus && matchedRoute && matchedRoute.price === tc.expectedPrice) {
        log(`  ✅ F/E="${tc.fe}" -> ${targetStatus} -> $${matchedRoute.price}`);
        passed++;
      } else {
        log(`  ❌ F/E="${tc.fe}" -> esperado ${tc.expectedStatus}/$${tc.expectedPrice}, obtenido ${targetStatus}/$${matchedRoute?.price}`);
        failed++;
      }
    }

    // TEST 4: Verificar registros trucking recientes
    logSection('TEST 4: REGISTROS TRUCKING');
    const recentRecords = await Record.find({ module: 'trucking' })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    log(`Registros trucking recientes: ${recentRecords.length}`);
    if (recentRecords.length > 0) {
      log('✅ Hay registros trucking en el sistema');
      passed++;
    } else {
      log('⚠️ No hay registros trucking recientes');
    }

    // TEST 5: Verificar total de rutas
    logSection('TEST 5: ESTADÍSTICAS DE RUTAS');
    const totalRoutes = await TruckingRoute.countDocuments();
    const routesByType = await TruckingRoute.aggregate([
      { $group: { _id: '$containerType', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    log(`Total de rutas: ${totalRoutes}`);
    log('Por tipo de contenedor:');
    routesByType.slice(0, 10).forEach(r => log(`  - ${r._id}: ${r.count}`));

    if (totalRoutes > 0) {
      log('✅ Sistema tiene rutas configuradas');
      passed++;
    } else {
      log('❌ No hay rutas configuradas');
      failed++;
    }

    // TEST 6: Verificar clientes
    logSection('TEST 6: CLIENTES');
    const clientSchema = new mongoose.Schema({ name: String, sapCode: String, isActive: Boolean });
    const Client = mongoose.models.clients || mongoose.model('clients', clientSchema);
    const clientCount = await Client.countDocuments({ isActive: true });
    log(`Clientes activos: ${clientCount}`);

    const clientsWithoutSapCode = await Client.find({ isActive: true, sapCode: { $in: [null, '', undefined] } }).lean();
    if (clientsWithoutSapCode.length > 0) {
      log(`⚠️ ${clientsWithoutSapCode.length} clientes sin código SAP:`);
      clientsWithoutSapCode.slice(0, 5).forEach(c => {
        log(`  - ${c.name}`);
        issues.push(`Cliente sin SAP: ${c.name}`);
      });
    } else {
      log('✅ Todos los clientes tienen código SAP');
      passed++;
    }

    // TEST 7: Verificar registros con problemas
    logSection('TEST 7: REGISTROS CON PROBLEMAS');
    const recordsWithNoPrice = await Record.find({
      module: 'trucking',
      totalValue: { $in: [0, null, undefined] }
    }).limit(10).lean();

    log(`Registros trucking sin precio: ${recordsWithNoPrice.length}`);
    if (recordsWithNoPrice.length > 0) {
      recordsWithNoPrice.slice(0, 3).forEach(r => {
        log(`  - ${r.containerConsecutive || r._id}: $${r.totalValue}`);
        issues.push(`Registro sin precio: ${r.containerConsecutive || r._id}`);
      });
    }

    // TEST 8: Verificar códigos SAP de contenedores
    logSection('TEST 8: CÓDIGOS SAP DE CONTENEDORES');
    const invalidSapCodes = ['XX', '', null, undefined];
    const ctWithBadSap = await ContainerType.find({
      isActive: true,
      sapCode: { $in: invalidSapCodes }
    }).lean();

    if (ctWithBadSap.length > 0) {
      log(`⚠️ ${ctWithBadSap.length} tipos con código SAP inválido:`);
      ctWithBadSap.forEach(ct => {
        log(`  - ${ct.code}: sapCode="${ct.sapCode}"`);
        issues.push(`Tipo contenedor con SAP inválido: ${ct.code}`);
      });
    } else {
      log('✅ Todos los tipos de contenedor tienen código SAP válido');
      passed++;
    }

    // Resumen
    logSection('RESUMEN DE PRUEBAS');
    log(`✅ Pasaron: ${passed}`);
    log(`❌ Fallaron: ${failed}`);
    log(`Total: ${passed + failed}`);
    log('');

    if (issues.length > 0) {
      logSection('⚠️ PROBLEMAS DETECTADOS');
      issues.forEach((issue, i) => log(`${i + 1}. ${issue}`));
    }

    if (failed === 0) {
      log('');
      log('🎉 TODAS LAS PRUEBAS PASARON');
    } else {
      log('');
      log('⚠️ ALGUNAS PRUEBAS FALLARON - REVISAR');
    }

    await mongoose.disconnect();
    log('');
    log(`Log guardado en: ${logFile}`);

  } catch (error) {
    log(`❌ ERROR: ${error.message}`);
    failed++;
  } finally {
    logStream.end();
    process.exit(failed > 0 ? 1 : 0);
  }
}

runTests();
