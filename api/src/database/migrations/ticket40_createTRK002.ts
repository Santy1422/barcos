import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Ticket #40 - PTG TRASIEGO
 *
 * Crear ServiceSapCode TRK002 con los siguientes parámetros:
 * - code: TRK002
 * - profitCenter: PAPANB110
 * - activity: TRK
 * - pillar: TRSP
 * - buCountry: PA
 * - serviceCountry: PA
 * - clientType: MEDLOG
 * - incomeRebateCode: I (Import)
 * - baseUnitMeasure: EA
 */
async function createTRK002() {
  try {
    console.log('🔧 Ticket #40 - PTG TRASIEGO: Creando ServiceSapCode TRK002...');
    console.log('----------------------------------------');

    // Connect to database
    const mongoUri = process.env.USER_MONGO_URI || 'mongodb://localhost:27017/barcos';
    await mongoose.connect(mongoUri);
    console.log('📦 Conectado a MongoDB');

    const db = mongoose.connection.db;
    const serviceSapCodeCollection = db.collection('servicesapcodes');

    // Verificar si TRK002 ya existe
    console.log('\n🔍 Verificando si TRK002 ya existe...');
    const existingTRK002 = await serviceSapCodeCollection.findOne({ code: 'TRK002' });

    if (existingTRK002) {
      console.log('⚠️ TRK002 ya existe:');
      console.log(JSON.stringify(existingTRK002, null, 2));
      console.log('\n¿Deseas actualizar el registro existente? El script no lo actualizará automáticamente.');
      return;
    }

    // Crear el nuevo ServiceSapCode
    const newServiceSapCode = {
      code: 'TRK002',
      name: 'Trucking Service - Import',
      description: 'Trucking service for import operations',
      module: 'trucking',
      active: true,
      profitCenter: 'PAPANB110',
      activity: 'TRK',
      pillar: 'TRSP',
      buCountry: 'PA',
      serviceCountry: 'PA',
      clientType: 'MEDLOG',
      baseUnitMeasure: 'EA',
      incomeRebateCode: 'I',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    console.log('\n📝 Creando ServiceSapCode TRK002:');
    console.log(JSON.stringify(newServiceSapCode, null, 2));

    const result = await serviceSapCodeCollection.insertOne(newServiceSapCode);

    if (result.acknowledged) {
      console.log('\n✅ ServiceSapCode TRK002 creado exitosamente!');
      console.log(`   _id: ${result.insertedId}`);

      // Verificar la creación
      const createdDoc = await serviceSapCodeCollection.findOne({ _id: result.insertedId });
      console.log('\n📋 Documento creado:');
      console.log(JSON.stringify(createdDoc, null, 2));
    } else {
      console.log('❌ Error al crear el ServiceSapCode');
    }

    console.log('\n✨ Ticket #40 completado');

  } catch (error) {
    console.error('❌ Error durante la migración:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Desconectado de MongoDB');
  }
}

// Standalone execution
if (require.main === module) {
  createTRK002()
    .then(() => {
      console.log('\n✅ Script finalizado');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Script fallido:', error);
      process.exit(1);
    });
}

export { createTRK002 };
