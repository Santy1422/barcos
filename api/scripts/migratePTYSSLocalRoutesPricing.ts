import mongoose from 'mongoose';
import ptyssLocalRouteSchema from '../src/database/schemas/ptyssLocalRouteSchema';

const PTYSSLocalRoute = mongoose.model('PTYSSLocalRoute', ptyssLocalRouteSchema);

async function migratePTYSSLocalRoutesPricing() {
  try {
    console.log('🔄 Iniciando migración de precios de rutas locales PTYSS...');

    // Conectar a la base de datos
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/barcos');
    console.log('✅ Conectado a MongoDB');

    // Buscar todas las rutas que no tienen los nuevos campos de precio
    const routesToMigrate = await PTYSSLocalRoute.find({
      $or: [
        { priceRegular: { $exists: false } },
        { priceReefer: { $exists: false } }
      ]
    });

    console.log(`📋 Encontradas ${routesToMigrate.length} rutas para migrar`);

    if (routesToMigrate.length === 0) {
      console.log('✅ No hay rutas para migrar');
      return;
    }

    // Migrar cada ruta
    let migratedCount = 0;
    for (const route of routesToMigrate) {
      try {
        const updateData: any = {};
        
        // Si la ruta tiene el campo price legacy pero no los nuevos campos
        if (route.price !== undefined && (!route.priceRegular || !route.priceReefer)) {
          updateData.priceRegular = route.price;
          updateData.priceReefer = route.price;
          console.log(`🔄 Migrando ruta ${route.clientName}: ${route.from} → ${route.to} (precio: $${route.price})`);
        } else {
          // Si no tiene precio legacy, usar valores por defecto
          updateData.priceRegular = 0;
          updateData.priceReefer = 0;
          updateData.price = 0;
          console.log(`⚠️ Ruta sin precio legacy ${route.clientName}: ${route.from} → ${route.to} - usando valores por defecto`);
        }

        await PTYSSLocalRoute.findByIdAndUpdate(route._id, updateData);
        migratedCount++;
      } catch (error) {
        console.error(`❌ Error migrando ruta ${route._id}:`, error);
      }
    }

    console.log(`✅ Migración completada: ${migratedCount}/${routesToMigrate.length} rutas migradas exitosamente`);

    // Verificar que la migración fue exitosa
    const routesWithNewFields = await PTYSSLocalRoute.countDocuments({
      priceRegular: { $exists: true },
      priceReefer: { $exists: true }
    });

    const totalRoutes = await PTYSSLocalRoute.countDocuments();

    console.log(`📊 Verificación: ${routesWithNewFields}/${totalRoutes} rutas tienen los nuevos campos de precio`);

    if (routesWithNewFields === totalRoutes) {
      console.log('🎉 ¡Migración exitosa! Todas las rutas tienen los nuevos campos de precio');
    } else {
      console.log('⚠️ Algunas rutas no fueron migradas correctamente');
    }

  } catch (error) {
    console.error('❌ Error durante la migración:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado de MongoDB');
  }
}

// Ejecutar la migración si el script se ejecuta directamente
if (require.main === module) {
  migratePTYSSLocalRoutesPricing()
    .then(() => {
      console.log('✅ Script de migración completado');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Script de migración falló:', error);
      process.exit(1);
    });
}

export default migratePTYSSLocalRoutesPricing;