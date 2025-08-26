const mongoose = require('mongoose');
const { ContainerType } = require('../src/database/schemas/containerTypesSchema');
require('dotenv').config();

const containerTypesData = [
  // All (A)
  { code: 'BB', name: 'Unspecified BB', category: 'A', description: 'Tipo de contenedor no especificado BB' },
  
  // BulkC (B)
  { code: 'BH', name: 'Swap Body High', category: 'B', description: 'Cuerpo intercambiable alto' },
  { code: 'BV', name: 'Bulk van', category: 'B', description: 'Vagón de carga a granel' },
  
  // Dry (DRY)
  { code: 'DV', name: 'Dry van', category: 'DRY', description: 'Contenedor seco estándar' },
  { code: 'FL', name: 'Flat rack', category: 'DRY', description: 'Plataforma plana' },
  { code: 'FT', name: 'Unspecified FT', category: 'DRY', description: 'Tipo de contenedor no especificado FT' },
  { code: 'HC', name: 'High cube', category: 'DRY', description: 'Contenedor de altura extra' },
  { code: 'HH', name: 'Half height', category: 'DRY', description: 'Contenedor de media altura' },
  { code: 'HO', name: 'High cube open top', category: 'DRY', description: 'Contenedor de altura extra con techo abierto' },
  { code: 'HP', name: 'High Cube Palletwide', category: 'DRY', description: 'Contenedor de altura extra para pallets' },
  { code: 'HR', name: 'High cube reefer', category: 'DRY', description: 'Contenedor de altura extra refrigerado' },
  { code: 'HT', name: 'Hard top', category: 'DRY', description: 'Contenedor con techo rígido' },
  { code: 'IS', name: 'Insulated', category: 'DRY', description: 'Contenedor aislado' },
  { code: 'OS', name: 'Open side', category: 'DRY', description: 'Contenedor con laterales abiertos' },
  { code: 'OT', name: 'Open top', category: 'DRY', description: 'Contenedor con techo abierto' },
  { code: 'PL', name: 'Platform flat', category: 'DRY', description: 'Plataforma plana' },
  { code: 'PP', name: 'Power Pack', category: 'DRY', description: 'Paquete de potencia' },
  { code: 'PW', name: 'Palette Wide', category: 'DRY', description: 'Contenedor ancho para pallets' },
  
  // Non Containerized (N)
  { code: 'SH', name: 'Semi Trailer High', category: 'N', description: 'Semi remolque alto' },
  { code: 'SR', name: 'Low Bed Semi Trailer', category: 'N', description: 'Semi remolque de cama baja' },
  { code: 'ST', name: 'SemiTrailer', category: 'N', description: 'Semi remolque estándar' },
  { code: 'SW', name: 'Swap Body', category: 'N', description: 'Cuerpo intercambiable' },
  { code: 'XX', name: 'Unspecified XX', category: 'N', description: 'Tipo no especificado XX' },
  { code: 'ZZ', name: 'Unspecified ZZ', category: 'N', description: 'Tipo no especificado ZZ' },
  
  // Reefer (REEFE)
  { code: 'RE', name: 'Reefer', category: 'REEFE', description: 'Contenedor refrigerado' },
  
  // TankD (T)
  { code: 'TH', name: 'Therm Refr.', category: 'T', description: 'Contenedor térmico refrigerado' },
  { code: 'TK', name: 'Tank', category: 'T', description: 'Contenedor tanque' },
  { code: 'TS', name: 'Tank Semi Trailer', category: 'T', description: 'Semi remolque tanque' },
  { code: 'VE', name: 'Ventilated', category: 'T', description: 'Contenedor ventilado' }
];

async function seedContainerTypes() {
  try {
    // Conectar a la base de datos usando la misma variable que el backend
    const mongoUri = process.env.USER_MONGO_URI || 'mongodb://localhost:27017/barcos';
    console.log('🔌 Conectando a MongoDB usando:', mongoUri);
    
    await mongoose.connect(mongoUri);
    console.log('✅ Conectado a MongoDB');

    // Limpiar datos existentes
    await ContainerType.deleteMany({});
    console.log('🗑️  Tipos de contenedores existentes eliminados');

    // Crear un usuario de sistema para los tipos de contenedores iniciales
    const systemUserId = new mongoose.Types.ObjectId();

    // Insertar tipos de contenedores con el usuario de sistema
    const containerTypesWithUser = containerTypesData.map(containerType => ({
      ...containerType,
      createdBy: systemUserId
    }));

    const result = await ContainerType.insertMany(containerTypesWithUser);
    console.log(`✅ ${result.length} tipos de contenedores insertados exitosamente`);

    // Mostrar resumen por categoría
    console.log('\n📊 Resumen por categoría:');
    const summary = result.reduce((acc, ct) => {
      acc[ct.category] = (acc[ct.category] || 0) + 1;
      return acc;
    }, {});

    Object.entries(summary).forEach(([category, count]) => {
      console.log(`  ${category}: ${count} tipos`);
    });

    // Mostrar los tipos insertados
    console.log('\n📋 Tipos de contenedores insertados:');
    result.forEach(containerType => {
      console.log(`  - ${containerType.code}: ${containerType.name} (${containerType.category})`);
    });

    console.log(`\n🎉 Seeding completado exitosamente. Total: ${result.length} tipos de contenedores`);

  } catch (error) {
    console.error('❌ Error al poblar tipos de contenedores:', error);
    console.error('💡 Verifica que:');
    console.error('   1. La variable USER_MONGO_URI esté configurada en el archivo .env');
    console.error('   2. MongoDB esté ejecutándose en el puerto correcto');
    console.error('   3. La base de datos "barcos" exista');
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado de MongoDB');
  }
}

// Ejecutar el script si se llama directamente
if (require.main === module) {
  seedContainerTypes();
}

module.exports = { seedContainerTypes };
