/**
 * Script para agregar sapCode a los servicios locales fijos existentes en la BD.
 * NO modifica el campo "code" (legacy) para no romper datos en producción.
 * Ejecutar una vez después del deploy del nuevo esquema.
 *
 * Uso: node api/scripts/setLocalServicesSapCodes.js
 * (o desde raíz: node scripts/setLocalServicesSapCodes.js si se ejecuta desde api/)
 */

const mongoose = require('mongoose');

// Mapeo code legacy → sapCode (nuevos códigos SAP)
const LEGACY_TO_SAP = {
  CLG097: 'CHB123', // Customs/TI
  TRK163: 'RAI160', // Demurrage/Retención
  TRK179: 'ICD029', // Storage/Estadía
  SLR168: 'TRK005', // Genset Rental
  TRK196: 'WRH146', // Pesaje
};

async function setLocalServicesSapCodes() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/barcos';
    await mongoose.connect(mongoUri);
    console.log('✅ Conectado a MongoDB');

    const collection = mongoose.connection.collection('localservices');
    if (!collection) {
      console.error('❌ Colección localservices no encontrada');
      process.exit(1);
    }

    for (const [legacyCode, sapCode] of Object.entries(LEGACY_TO_SAP)) {
      const result = await collection.updateMany(
        { code: legacyCode },
        { $set: { sapCode } }
      );
      if (result.modifiedCount > 0 || result.matchedCount > 0) {
        console.log(`  ${legacyCode} → sapCode: ${sapCode} (matched: ${result.matchedCount}, modified: ${result.modifiedCount})`);
      }
    }

    console.log('\n🎉 sapCode actualizado en servicios locales fijos. Revisa los documentos si lo deseas.');
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado de MongoDB');
  }
}

setLocalServicesSapCodes();
