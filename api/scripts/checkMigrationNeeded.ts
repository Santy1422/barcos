import mongoose from 'mongoose';
import ptyssLocalRouteSchema from '../src/database/schemas/ptyssLocalRouteSchema';

const PTYSSLocalRoute = mongoose.model('PTYSSLocalRoute', ptyssLocalRouteSchema);

async function checkMigrationNeeded() {
  try {
    console.log('🔍 Verificando si es necesaria la migración...');

    // Conectar a la base de datos
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/barcos');
    console.log('✅ Conectado a MongoDB');

    // Contar total de rutas
    const totalRoutes = await PTYSSLocalRoute.countDocuments();
    console.log(`📊 Total de rutas locales: ${totalRoutes}`);

    if (totalRoutes === 0) {
      console.log('✅ No hay rutas en la base de datos. No es necesaria la migración.');
      return { needed: false, reason: 'No hay datos existentes' };
    }

    // Contar rutas que ya tienen los nuevos campos
    const routesWithNewFields = await PTYSSLocalRoute.countDocuments({
      priceRegular: { $exists: true },
      priceReefer: { $exists: true }
    });

    // Contar rutas que solo tienen el campo legacy
    const routesWithOnlyLegacy = await PTYSSLocalRoute.countDocuments({
      price: { $exists: true },
      $or: [
        { priceRegular: { $exists: false } },
        { priceReefer: { $exists: false } }
      ]
    });

    console.log(`📊 Rutas con nuevos campos: ${routesWithNewFields}`);
    console.log(`📊 Rutas solo con campo legacy: ${routesWithOnlyLegacy}`);

    if (routesWithOnlyLegacy > 0) {
      console.log('⚠️ MIGRACIÓN NECESARIA: Hay rutas que necesitan ser migradas');
      
      // Mostrar ejemplo de rutas que necesitan migración
      const sampleRoute = await PTYSSLocalRoute.findOne({
        price: { $exists: true },
        $or: [
          { priceRegular: { $exists: false } },
          { priceReefer: { $exists: false } }
        ]
      });

      if (sampleRoute) {
        console.log('📋 Ejemplo de ruta que necesita migración:');
        console.log(`   - Cliente: ${sampleRoute.clientName}`);
        console.log(`   - Ruta: ${sampleRoute.from} → ${sampleRoute.to}`);
        console.log(`   - Precio legacy: $${sampleRoute.price}`);
      }

      return { needed: true, count: routesWithOnlyLegacy };
    } else {
      console.log('✅ No es necesaria la migración. Todas las rutas tienen los nuevos campos.');
      return { needed: false, reason: 'Todas las rutas ya están migradas' };
    }

  } catch (error) {
    console.error('❌ Error verificando migración:', error);
    return { needed: false, error: error.message };
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado de MongoDB');
  }
}

// Ejecutar verificación si el script se ejecuta directamente
if (require.main === module) {
  checkMigrationNeeded()
    .then((result) => {
      if (result.needed) {
        console.log('\n🚀 Para ejecutar la migración, ejecuta:');
        console.log('npm run ts-node scripts/migratePTYSSLocalRoutesPricing.ts');
      } else {
        console.log('\n✅ Todo listo, no se requiere migración');
      }
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error en verificación:', error);
      process.exit(1);
    });
}

export default checkMigrationNeeded;