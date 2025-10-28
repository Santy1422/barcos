const mongoose = require('mongoose');
const AgencyRoute = require('../src/database/schemas/agencyRouteSchema');

// Configuración de conexión a MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/barcos';

// Plantilla de rangos de pasajeros por defecto para no_show
const DEFAULT_NO_SHOW_PASSENGER_RANGES = [
  { minPassengers: 1, maxPassengers: 3, price: 0, description: '1-3 pasajeros' },
  { minPassengers: 4, maxPassengers: 7, price: 0, description: '4-7 pasajeros' },
  { minPassengers: 8, maxPassengers: 999, price: 0, description: '8+ pasajeros' }
];

async function migrateAddNoShowPricing() {
  try {
    console.log('🚀 Starting migration: Add no_show pricing to existing routes...');
    
    // Conectar a MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Obtener todas las rutas activas
    const routes = await AgencyRoute.find({ isActive: true });
    console.log(`📊 Found ${routes.length} active routes to migrate`);

    let updatedCount = 0;
    let skippedCount = 0;

    for (const route of routes) {
      console.log(`\n🔍 Processing route: ${route.name}`);
      
      // Verificar si ya tiene pricing de no_show
      const hasNoShowPricing = route.pricing.some(p => p.routeType === 'no_show');
      
      if (hasNoShowPricing) {
        console.log(`⏭️  Route already has no_show pricing, skipping...`);
        skippedCount++;
        continue;
      }

      // Agregar pricing de no_show
      const noShowPricing = {
        routeType: 'no_show',
        passengerRanges: JSON.parse(JSON.stringify(DEFAULT_NO_SHOW_PASSENGER_RANGES))
      };

      route.pricing.push(noShowPricing);
      
      try {
        await route.save();
        console.log(`✅ Added no_show pricing to route: ${route.name}`);
        updatedCount++;
      } catch (error) {
        console.error(`❌ Error updating route ${route.name}:`, error);
      }
    }

    console.log('\n📈 Migration Summary:');
    console.log(`✅ Routes updated: ${updatedCount}`);
    console.log(`⏭️  Routes skipped (already had no_show): ${skippedCount}`);
    console.log(`📊 Total routes processed: ${routes.length}`);

    // Verificar que la migración fue exitosa
    const routesWithNoShow = await AgencyRoute.countDocuments({
      'pricing.routeType': 'no_show',
      isActive: true
    });
    
    console.log(`\n🔍 Verification: ${routesWithNoShow} routes now have no_show pricing`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    // Cerrar conexión
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

// Ejecutar migración si se llama directamente
if (require.main === module) {
  migrateAddNoShowPricing();
}

module.exports = migrateAddNoShowPricing;
