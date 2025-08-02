import mongoose from 'mongoose';
import ptyssLocalRouteSchema from '../src/database/schemas/ptyssLocalRouteSchema';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

const PTYSSLocalRoute = mongoose.model('PTYSSLocalRoute', ptyssLocalRouteSchema);

// Mapeo de migración
const MIGRATION_MAP = {
  'cliente 1': 'esquema rutas 1',
  'cliente 2': 'esquema rutas 2', 
  'cliente 3': 'esquema rutas 3',
  'cliente 4': 'esquema rutas 4',
  'cliente 5': 'esquema rutas 5'
};

async function migratePTYSSLocalRoutes() {
  try {
    // Conectar a MongoDB
    await mongoose.connect(process.env.MONGO_URI!);
    console.log('🔌 Conectado a MongoDB');

    let totalMigrated = 0;

    // Migrar cada tipo de cliente
    for (const [oldName, newName] of Object.entries(MIGRATION_MAP)) {
      console.log(`\n🔄 Migrando "${oldName}" a "${newName}"...`);
      
      // Buscar rutas con el nombre antiguo
      const routesToMigrate = await PTYSSLocalRoute.find({ clientName: oldName });
      console.log(`📊 Encontradas ${routesToMigrate.length} rutas para migrar`);
      
      if (routesToMigrate.length > 0) {
        // Actualizar todas las rutas con el nuevo nombre
        const updateResult = await PTYSSLocalRoute.updateMany(
          { clientName: oldName },
          { $set: { clientName: newName } }
        );
        
        console.log(`✅ Migradas ${updateResult.modifiedCount} rutas de "${oldName}" a "${newName}"`);
        totalMigrated += updateResult.modifiedCount;
      } else {
        console.log(`ℹ️ No hay rutas para migrar de "${oldName}"`);
      }
    }

    console.log(`\n🎉 Migración completada exitosamente!`);
    console.log(`📈 Total de rutas migradas: ${totalMigrated}`);

    // Verificar el resultado
    console.log(`\n🔍 Verificando migración...`);
    for (const newName of Object.values(MIGRATION_MAP)) {
      const count = await PTYSSLocalRoute.countDocuments({ clientName: newName });
      console.log(`📊 ${newName}: ${count} rutas`);
    }

    // Verificar que no queden rutas con nombres antiguos
    const oldRoutes = await PTYSSLocalRoute.find({ 
      clientName: { $in: Object.keys(MIGRATION_MAP) } 
    });
    
    if (oldRoutes.length > 0) {
      console.log(`⚠️ Advertencia: Aún quedan ${oldRoutes.length} rutas con nombres antiguos`);
      oldRoutes.forEach(route => {
        console.log(`   - ${route.clientName}: ${route.from} → ${route.to}`);
      });
    } else {
      console.log(`✅ No quedan rutas con nombres antiguos`);
    }

  } catch (error) {
    console.error('❌ Error durante la migración:', error);
    process.exit(1);
  } finally {
    // Cerrar conexión
    await mongoose.connection.close();
    console.log('🔌 Conexión a MongoDB cerrada');
    process.exit(0);
  }
}

// Ejecutar migración
console.log('🚀 Iniciando migración de PTYSS Local Routes...');
console.log('📝 Cambiando "cliente X" por "esquema rutas X"');
migratePTYSSLocalRoutes(); 