import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Ticket #40 - PTG TRASIEGO
 *
 * Cambio solicitado:
 * - Servicio: TRK130 → TRK002
 * - Business Type: E → I
 *
 * Datos del ticket:
 * PAPANB110 | 01.2026 | TRK130 | TRK | TRSP | PA | PA | MEDLOG | E | FULL
 */
async function updateTruckingRecord() {
  try {
    console.log('🔧 Ticket #40 - PTG TRASIEGO: Iniciando búsqueda...');
    console.log('----------------------------------------');

    // Connect to database
    const mongoUri = process.env.USER_MONGO_URI || 'mongodb://localhost:27017/barcos';
    await mongoose.connect(mongoUri);
    console.log('📦 Conectado a MongoDB');

    const db = mongoose.connection.db;

    // ========== PARTE 1: Buscar en ServiceSapCode ==========
    console.log('\n========== ServiceSapCode Collection ==========');

    const serviceSapCodeCollection = db.collection('servicesapcodes');

    // Buscar el código TRK130
    console.log('\n🔍 Buscando ServiceSapCode con code TRK130...');
    const trk130Service = await serviceSapCodeCollection.findOne({ code: 'TRK130' });

    if (trk130Service) {
      console.log('✅ Encontrado TRK130:');
      console.log(JSON.stringify(trk130Service, null, 2));
    } else {
      console.log('❌ No se encontró ServiceSapCode con code TRK130');
    }

    // Buscar el código TRK002
    console.log('\n🔍 Buscando ServiceSapCode con code TRK002...');
    const trk002Service = await serviceSapCodeCollection.findOne({ code: 'TRK002' });

    if (trk002Service) {
      console.log('✅ Encontrado TRK002:');
      console.log(JSON.stringify(trk002Service, null, 2));
    } else {
      console.log('❌ No se encontró ServiceSapCode con code TRK002');
    }

    // Listar todos los ServiceSapCodes que empiecen con TRK
    console.log('\n🔍 Listando ServiceSapCodes con código TRK...');
    const trkServices = await serviceSapCodeCollection.find({
      code: { $regex: '^TRK', $options: 'i' }
    }).toArray();

    if (trkServices.length > 0) {
      console.log(`📋 Encontrados ${trkServices.length} ServiceSapCodes con TRK:`);
      trkServices.forEach((svc: any, idx: number) => {
        console.log(`  ${idx + 1}. ${svc.code} - ${svc.name || 'Sin nombre'} (incomeRebate: ${svc.incomeRebateCode || 'N/A'})`);
      });
    } else {
      console.log('❌ No se encontraron ServiceSapCodes con TRK');
    }

    // ========== PARTE 2: Buscar en Records ==========
    console.log('\n========== Records Collection ==========');

    const recordsCollection = db.collection('records');

    // Buscar registros con sapCode TRK130
    console.log('\n🔍 Buscando records con sapCode TRK130...');
    const trk130Records = await recordsCollection.find({
      module: 'trucking',
      sapCode: 'TRK130'
    }).limit(10).toArray();

    if (trk130Records.length > 0) {
      console.log(`📋 Se encontraron ${trk130Records.length} registro(s) con sapCode TRK130:`);
      trk130Records.forEach((rec: any, idx: number) => {
        console.log(`\n--- Registro ${idx + 1} ---`);
        console.log(`  _id: ${rec._id}`);
        console.log(`  containerConsecutive: ${rec.containerConsecutive}`);
        console.log(`  sapCode: ${rec.sapCode}`);
        console.log(`  data.moveDate: ${rec.data?.moveDate}`);
        console.log(`  data.fe: ${rec.data?.fe}`);
        console.log(`  status: ${rec.status}`);
      });
    } else {
      console.log('❌ No se encontraron registros con sapCode TRK130');
    }

    // Buscar registros de trucking recientes
    console.log('\n🔍 Buscando últimos 10 records de trucking...');
    const recentTruckingRecords = await recordsCollection.find({
      module: 'trucking'
    }).sort({ createdAt: -1 }).limit(10).toArray();

    if (recentTruckingRecords.length > 0) {
      console.log(`📋 Últimos ${recentTruckingRecords.length} registros de trucking:`);
      recentTruckingRecords.forEach((rec: any, idx: number) => {
        console.log(`  ${idx + 1}. ${rec.containerConsecutive || 'N/A'} - sapCode: ${rec.sapCode || 'N/A'}, fe: ${rec.data?.fe || 'N/A'}, status: ${rec.status}`);
      });
    } else {
      console.log('❌ No se encontraron registros de trucking');
    }

    // Contar total de registros
    const totalTruckingRecords = await recordsCollection.countDocuments({ module: 'trucking' });
    console.log(`\n📊 Total de registros trucking: ${totalTruckingRecords}`);

    // ========== PARTE 3: Buscar PAPANB110 ==========
    console.log('\n========== Buscando PAPANB110 ==========');

    // Buscar en truckingroutes
    const truckingRoutesCollection = db.collection('truckingroutes');
    const routesWithPapanb = await truckingRoutesCollection.find({
      $or: [
        { profitCenter: 'PAPANB110' },
        { 'sapConfig.profitCenter': 'PAPANB110' }
      ]
    }).limit(5).toArray();

    if (routesWithPapanb.length > 0) {
      console.log(`📋 Rutas con PAPANB110:`);
      routesWithPapanb.forEach((route: any, idx: number) => {
        console.log(`  ${idx + 1}. ${route.name || route._id} - profitCenter: ${route.profitCenter || route.sapConfig?.profitCenter}`);
      });
    } else {
      console.log('❌ No se encontraron rutas con PAPANB110');
    }

    // Buscar en serviceSapCodes por profitCenter
    const sapCodesWithPapanb = await serviceSapCodeCollection.find({
      profitCenter: 'PAPANB110'
    }).limit(5).toArray();

    if (sapCodesWithPapanb.length > 0) {
      console.log(`\n📋 ServiceSapCodes con profitCenter PAPANB110:`);
      sapCodesWithPapanb.forEach((svc: any, idx: number) => {
        console.log(`  ${idx + 1}. ${svc.code} - ${svc.description || 'Sin descripción'}`);
      });
    } else {
      console.log('❌ No se encontraron ServiceSapCodes con profitCenter PAPANB110');
    }

    // Buscar en configs
    const configsCollection = db.collection('configs');
    const configWithPapanb = await configsCollection.findOne({
      $or: [
        { 'trucking.profitCenter': 'PAPANB110' },
        { profitCenter: 'PAPANB110' }
      ]
    });

    if (configWithPapanb) {
      console.log(`\n📋 Config encontrada con PAPANB110:`);
      console.log(JSON.stringify(configWithPapanb, null, 2));
    }

    // ========== PARTE 4: Buscar registros del período 01.2026 con fe=E ==========
    console.log('\n========== Registros 01.2026 con fe=E ==========');

    // Buscar registros de enero 2026 con fe=E
    const jan2026RecordsE = await recordsCollection.find({
      module: 'trucking',
      $or: [
        { 'data.moveDate': { $regex: '01/2026', $options: 'i' } },
        { 'data.moveDate': { $regex: '2026-01', $options: 'i' } },
        { 'data.moveDate': { $regex: '/01/2026', $options: 'i' } }
      ],
      'data.fe': 'E'
    }).limit(20).toArray();

    if (jan2026RecordsE.length > 0) {
      console.log(`📋 Registros de enero 2026 con fe=E: ${jan2026RecordsE.length}`);
      jan2026RecordsE.forEach((rec: any, idx: number) => {
        console.log(`  ${idx + 1}. ${rec.containerConsecutive} - sapCode: ${rec.sapCode}, line: ${rec.data?.line}, moveDate: ${rec.data?.moveDate}`);
      });
    } else {
      console.log('❌ No se encontraron registros de enero 2026 con fe=E');
    }

    // Buscar registros con sapCode que contenga 130
    console.log('\n🔍 Buscando registros con sapCode que contenga 130...');
    const sapCode130Records = await recordsCollection.find({
      module: 'trucking',
      sapCode: { $regex: '130', $options: 'i' }
    }).limit(10).toArray();

    if (sapCode130Records.length > 0) {
      console.log(`📋 Registros con sapCode conteniendo 130: ${sapCode130Records.length}`);
      sapCode130Records.forEach((rec: any, idx: number) => {
        console.log(`  ${idx + 1}. ${rec.containerConsecutive} - sapCode: ${rec.sapCode}, fe: ${rec.data?.fe}`);
      });
    } else {
      console.log('❌ No se encontraron registros con sapCode conteniendo 130');
    }

    // Buscar todos los registros que no sean TRK002
    console.log('\n🔍 Buscando registros con sapCode diferente a TRK002...');
    const nonTrk002Records = await recordsCollection.find({
      module: 'trucking',
      sapCode: { $ne: 'TRK002', $exists: true }
    }).limit(20).toArray();

    if (nonTrk002Records.length > 0) {
      console.log(`📋 Registros con sapCode diferente a TRK002: ${nonTrk002Records.length}`);
      const sapCodeCounts: any = {};
      nonTrk002Records.forEach((rec: any) => {
        const code = rec.sapCode || 'null';
        sapCodeCounts[code] = (sapCodeCounts[code] || 0) + 1;
      });
      console.log('Distribución de sapCodes:');
      Object.entries(sapCodeCounts).forEach(([code, count]) => {
        console.log(`  - ${code}: ${count}`);
      });
    } else {
      console.log('❌ Todos los registros tienen sapCode TRK002');
    }

    // Ver distribución de sapCodes únicos
    console.log('\n🔍 Distribución de sapCodes únicos en trucking...');
    const sapCodeDistribution = await recordsCollection.aggregate([
      { $match: { module: 'trucking' } },
      { $group: { _id: '$sapCode', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 20 }
    ]).toArray();

    console.log('SapCodes más frecuentes:');
    sapCodeDistribution.forEach((item: any) => {
      console.log(`  - ${item._id || 'null'}: ${item.count} registros`);
    });

    console.log('\n----------------------------------------');
    console.log('⚠️ Búsqueda completada. Revisa los resultados arriba.');

  } catch (error) {
    console.error('❌ Error durante la búsqueda:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Desconectado de MongoDB');
  }
}

// Standalone execution
if (require.main === module) {
  updateTruckingRecord()
    .then(() => {
      console.log('\n✅ Script finalizado');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Script fallido:', error);
      process.exit(1);
    });
}

export { updateTruckingRecord };
