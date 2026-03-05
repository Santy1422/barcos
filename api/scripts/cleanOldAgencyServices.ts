/**
 * Script para limpiar servicios de Agency creados antes del 26 de enero de 2026
 *
 * IMPORTANTE: Este script:
 * 1. Primero cuenta cuántos servicios serán afectados
 * 2. Muestra un resumen antes de borrar
 * 3. Solo borra servicios que NO estén facturados
 *
 * Ejecutar con: npx ts-node scripts/cleanOldAgencyServices.ts
 */

import mongoose from 'mongoose';
import AgencyService from '../src/database/schemas/agencyServiceSchema';

// Database connection string - usar la misma que en producción
const MONGODB_URI = process.env.USER_MONGO_URI || 'mongodb+srv://admin:Hola.1422!@cluster0.ghtedex.mongodb.net/test';

// Fecha límite: 26 de enero de 2026 a las 00:00:00
const CUTOFF_DATE = new Date('2026-01-26T00:00:00.000Z');

async function main() {
  try {
    console.log('🔌 Conectando a MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado a MongoDB');

    // Primero, contar servicios totales
    const totalServices = await AgencyService.countDocuments({});
    console.log(`\n📊 Total de servicios en Agency: ${totalServices}`);

    // Contar servicios antes de la fecha límite
    const oldServicesCount = await AgencyService.countDocuments({
      createdAt: { $lt: CUTOFF_DATE }
    });
    console.log(`📅 Servicios creados ANTES del 26/01/2026: ${oldServicesCount}`);

    // Contar servicios después de la fecha límite
    const newServicesCount = await AgencyService.countDocuments({
      createdAt: { $gte: CUTOFF_DATE }
    });
    console.log(`📅 Servicios creados DESDE el 26/01/2026: ${newServicesCount}`);

    // Verificar que no haya servicios facturados en los que vamos a borrar
    const facturadosCount = await AgencyService.countDocuments({
      createdAt: { $lt: CUTOFF_DATE },
      status: { $in: ['facturado', 'prefacturado'] }
    });

    if (facturadosCount > 0) {
      console.log(`\n⚠️ ADVERTENCIA: Hay ${facturadosCount} servicios facturados/prefacturados antes del 26/01/2026`);
      console.log('   Estos NO serán borrados para evitar problemas contables.');
    }

    // Mostrar algunos ejemplos de los servicios que se borrarán
    const ejemplos = await AgencyService.find({
      createdAt: { $lt: CUTOFF_DATE },
      status: { $nin: ['facturado', 'prefacturado'] }
    }).limit(5).select('_id vessel pickupDate status createdAt');

    console.log('\n📋 Ejemplos de servicios a borrar:');
    ejemplos.forEach((s, i) => {
      console.log(`   ${i + 1}. ID: ${s._id}, Vessel: ${s.vessel || 'N/A'}, Status: ${s.status}, Creado: ${s.createdAt}`);
    });

    // Contar exactamente cuántos se borrarán (excluyendo facturados)
    const toDeleteCount = await AgencyService.countDocuments({
      createdAt: { $lt: CUTOFF_DATE },
      status: { $nin: ['facturado', 'prefacturado'] }
    });

    console.log(`\n🗑️ Total de servicios que serán BORRADOS: ${toDeleteCount}`);
    console.log(`   (Excluyendo ${facturadosCount} servicios facturados/prefacturados)`);

    // Confirmar antes de borrar
    if (toDeleteCount === 0) {
      console.log('\n✅ No hay servicios para borrar.');
    } else {
      console.log('\n🚨 EJECUTANDO BORRADO...');

      // Borrar servicios (excluyendo facturados)
      const result = await AgencyService.deleteMany({
        createdAt: { $lt: CUTOFF_DATE },
        status: { $nin: ['facturado', 'prefacturado'] }
      });

      console.log(`✅ Borrados ${result.deletedCount} servicios de Agency`);

      // Verificar resultado final
      const remainingCount = await AgencyService.countDocuments({});
      console.log(`\n📊 Total de servicios restantes en Agency: ${remainingCount}`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Desconectado de MongoDB');
    process.exit(0);
  }
}

main();
