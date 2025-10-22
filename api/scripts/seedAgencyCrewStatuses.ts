import AgencyCatalog from '../src/database/schemas/agencyCatalogSchema';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const MONGODB_URI = process.env.USER_MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/barcos';

async function seedAgencyCrewStatuses() {
  try {
    // Connect to MongoDB
    console.log('🔌 Conectando a MongoDB...');
    console.log('URI:', MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@')); // Hide password in logs
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado a MongoDB');
    
    // MSC Status to create
    const crewStatuses = [
      { name: 'Visit' },
      { name: 'On Signer' },
      { name: 'Off Signer' },
      { name: 'Bil' }
    ];
    
    console.log('\n📦 Agregando MSC Status (Crew Status)...\n');
    
    let createdCount = 0;
    let updatedCount = 0;
    
    for (const status of crewStatuses) {
      const existing = await AgencyCatalog.findOne({
        type: 'crew_status',
        name: status.name
      });
      
      if (existing) {
        console.log(`⚠️  MSC Status "${status.name}" ya existe - actualizando...`);
        existing.isActive = true;
        await existing.save();
        updatedCount++;
      } else {
        await AgencyCatalog.create({
          type: 'crew_status',
          name: status.name,
          isActive: true
        });
        console.log(`✅ MSC Status "${status.name}" creado`);
        createdCount++;
      }
    }
    
    console.log('\n📊 Resumen:');
    console.log(`   ✅ Creados: ${createdCount}`);
    console.log(`   🔄 Actualizados: ${updatedCount}`);
    console.log(`   📦 Total: ${crewStatuses.length}`);
    
    // Verify
    const allCrewStatuses = await AgencyCatalog.find({ type: 'crew_status', isActive: true });
    console.log('\n🔍 Verificación - MSC Status activos:');
    allCrewStatuses.forEach(status => {
      console.log(`   - ${status.name}`);
    });
    
    console.log('\n✅ Seed de MSC Status completado exitosamente!');
    
  } catch (error) {
    console.error('❌ Error en seed de MSC Status:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado de MongoDB');
  }
}

// Run if executed directly
if (require.main === module) {
  seedAgencyCrewStatuses()
    .then(() => {
      console.log('✅ Script finalizado exitosamente');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Script falló:', error);
      process.exit(1);
    });
}

export default seedAgencyCrewStatuses;

