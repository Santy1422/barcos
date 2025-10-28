const mongoose = require('mongoose');
const AgencyRoute = require('../src/database/schemas/agencyRouteSchema');

// Configuración de conexión a MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/barcos';

// Configuración de precios para no_show (puedes modificar estos valores)
const NO_SHOW_PRICING_CONFIG = {
  // Precios por defecto para no_show (generalmente 0 ya que es un "no show")
  passengerRanges: [
    { minPassengers: 1, maxPassengers: 3, price: 0, description: '1-3 pasajeros (No Show)' },
    { minPassengers: 4, maxPassengers: 7, price: 0, description: '4-7 pasajeros (No Show)' },
    { minPassengers: 8, maxPassengers: 999, price: 0, description: '8+ pasajeros (No Show)' }
  ]
};

async function migrateAddNoShowPricing() {
  try {
    console.log('🚀 Starting migration: Add no_show pricing to existing routes...');
    console.log('📋 Configuration:');
    console.log(`   - Price for 1-3 passengers: $${NO_SHOW_PRICING_CONFIG.passengerRanges[0].price}`);
    console.log(`   - Price for 4-7 passengers: $${NO_SHOW_PRICING_CONFIG.passengerRanges[1].price}`);
    console.log(`   - Price for 8+ passengers: $${NO_SHOW_PRICING_CONFIG.passengerRanges[2].price}`);
    
    // Conectar a MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Obtener todas las rutas activas
    const routes = await AgencyRoute.find({ isActive: true });
    console.log(`📊 Found ${routes.length} active routes to migrate`);

    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

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
        passengerRanges: JSON.parse(JSON.stringify(NO_SHOW_PRICING_CONFIG.passengerRanges))
      };

      route.pricing.push(noShowPricing);
      
      try {
        await route.save();
        console.log(`✅ Added no_show pricing to route: ${route.name}`);
        updatedCount++;
      } catch (error) {
        console.error(`❌ Error updating route ${route.name}:`, error.message);
        errorCount++;
      }
    }

    console.log('\n📈 Migration Summary:');
    console.log(`✅ Routes updated: ${updatedCount}`);
    console.log(`⏭️  Routes skipped (already had no_show): ${skippedCount}`);
    console.log(`❌ Routes with errors: ${errorCount}`);
    console.log(`📊 Total routes processed: ${routes.length}`);

    // Verificar que la migración fue exitosa
    const routesWithNoShow = await AgencyRoute.countDocuments({
      'pricing.routeType': 'no_show',
      isActive: true
    });
    
    console.log(`\n🔍 Verification: ${routesWithNoShow} routes now have no_show pricing`);

    // Mostrar algunas rutas como ejemplo
    if (routesWithNoShow > 0) {
      console.log('\n📋 Sample routes with no_show pricing:');
      const sampleRoutes = await AgencyRoute.find({
        'pricing.routeType': 'no_show',
        isActive: true
      }).limit(3);
      
      sampleRoutes.forEach(route => {
        const noShowPricing = route.pricing.find(p => p.routeType === 'no_show');
        console.log(`   - ${route.name}: ${noShowPricing.passengerRanges.length} price ranges`);
      });
    }

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

// Función para mostrar ayuda
function showHelp() {
  console.log(`
🚀 Migration Script: Add no_show pricing to existing routes

Usage:
  node migrateAddNoShowPricing.js [options]

Options:
  --help, -h          Show this help message
  --dry-run           Show what would be updated without making changes
  --price-1-3 <num>   Set price for 1-3 passengers (default: 0)
  --price-4-7 <num>   Set price for 4-7 passengers (default: 0)
  --price-8-plus <num> Set price for 8+ passengers (default: 0)

Examples:
  node migrateAddNoShowPricing.js
  node migrateAddNoShowPricing.js --price-1-3 10 --price-4-7 15 --price-8-plus 20
  node migrateAddNoShowPricing.js --dry-run
`);
}

// Procesar argumentos de línea de comandos
function processArgs() {
  const args = process.argv.slice(2);
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--help':
      case '-h':
        showHelp();
        process.exit(0);
        break;
      case '--price-1-3':
        NO_SHOW_PRICING_CONFIG.passengerRanges[0].price = parseFloat(args[++i]) || 0;
        break;
      case '--price-4-7':
        NO_SHOW_PRICING_CONFIG.passengerRanges[1].price = parseFloat(args[++i]) || 0;
        break;
      case '--price-8-plus':
        NO_SHOW_PRICING_CONFIG.passengerRanges[2].price = parseFloat(args[++i]) || 0;
        break;
      case '--dry-run':
        console.log('🔍 DRY RUN MODE - No changes will be made');
        // TODO: Implementar modo dry-run
        break;
    }
  }
}

// Ejecutar migración si se llama directamente
if (require.main === module) {
  processArgs();
  migrateAddNoShowPricing();
}

module.exports = migrateAddNoShowPricing;
