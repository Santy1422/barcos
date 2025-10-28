import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import AgencyRoute from '../src/database/schemas/agencyRouteSchema';

// Configuración de conexión a MongoDB
const MONGODB_URI = process.env.USER_MONGO_URI || 'mongodb://localhost:27017/barcos';

async function addNoShowPricingToExistingRoutes() {
  try {
    console.log('🚀 Adding no_show pricing to existing routes...');
    
    // Conectar a MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Obtener todas las rutas activas
    const routes = await AgencyRoute.find({ isActive: true });
    console.log(`📊 Found ${routes.length} active routes`);

    let updatedCount = 0;
    let skippedCount = 0;

    for (const route of routes) {
      // Verificar si ya tiene pricing de no_show
      const hasNoShowPricing = route.pricing.some(p => p.routeType === 'no_show');
      
      if (hasNoShowPricing) {
        skippedCount++;
        continue;
      }

      // Agregar pricing de no_show con precios en 0 (típico para no show)
      const noShowPricing = {
        routeType: 'no_show',
        passengerRanges: [
          { minPassengers: 1, maxPassengers: 3, price: 0, description: '1-3 pasajeros' },
          { minPassengers: 4, maxPassengers: 7, price: 0, description: '4-7 pasajeros' },
          { minPassengers: 8, maxPassengers: 999, price: 0, description: '8+ pasajeros' }
        ]
      };

      route.pricing.push(noShowPricing);
      await route.save();
      updatedCount++;
      
      console.log(`✅ Updated: ${route.name}`);
    }

    console.log('\n📈 Migration Complete!');
    console.log(`✅ Routes updated: ${updatedCount}`);
    console.log(`⏭️  Routes skipped (already had no_show): ${skippedCount}`);

    // Verificar resultado
    const routesWithNoShow = await AgencyRoute.countDocuments({
      'pricing.routeType': 'no_show',
      isActive: true
    });
    
    console.log(`🔍 Verification: ${routesWithNoShow} routes now have no_show pricing`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  addNoShowPricingToExistingRoutes();
}

module.exports = addNoShowPricingToExistingRoutes;
