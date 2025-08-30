import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.USER_MONGO_URI;

if (!MONGODB_URI) {
  console.error('❌ Error: USER_MONGO_URI no está definido en las variables de entorno');
  process.exit(1);
}

async function cleanTruckingRoutesDuplicates() {
  try {
    console.log('🔌 Conectando a MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado a MongoDB');

    // Obtener la colección de trucking routes
    const db = mongoose.connection.db;
    const collection = db.collection('truckingroutes');

    console.log('🔍 Buscando duplicados...');
    
    // Encontrar duplicados
    const duplicates = await collection.aggregate([
      {
        $group: {
          _id: { name: '$name', containerType: '$containerType', routeType: '$routeType' },
          count: { $sum: 1 },
          routes: { $push: { _id: '$_id', name: '$name', containerType: '$containerType', routeType: '$routeType', price: '$price', createdAt: '$createdAt' } }
        }
      },
      {
        $match: { count: { $gt: 1 } }
      },
      {
        $sort: { '_id.name': 1, '_id.containerType': 1, '_id.routeType': 1 }
      }
    ]).toArray();

    if (duplicates.length === 0) {
      console.log('✅ No se encontraron duplicados');
      return;
    }

    console.log(`⚠️  Se encontraron ${duplicates.length} grupos de duplicados:`);
    
    let totalDeleted = 0;
    
    for (const dup of duplicates) {
      console.log(`\n📋 Grupo: "${dup._id.name}" - ${dup._id.containerType} - ${dup._id.routeType}`);
      console.log(`   Cantidad: ${dup.count} rutas`);
      
      // Ordenar por fecha de creación (mantener la más antigua)
      const sortedRoutes = dup.routes.sort((a, b) => 
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      
      console.log('   Rutas encontradas:');
      sortedRoutes.forEach((route, index) => {
        console.log(`     ${index + 1}. ID: ${route._id}, Precio: $${route.price}, Creada: ${route.createdAt}`);
      });
      
      // Mantener la primera (más antigua) y eliminar las demás
      const routesToDelete = sortedRoutes.slice(1);
      console.log(`   🗑️  Eliminando ${routesToDelete.length} duplicados...`);
      
      for (const routeToDelete of routesToDelete) {
        const result = await collection.deleteOne({ _id: routeToDelete._id });
        if (result.deletedCount > 0) {
          console.log(`     ✅ Eliminada ruta: ${routeToDelete._id}`);
          totalDeleted++;
        } else {
          console.log(`     ❌ Error eliminando ruta: ${routeToDelete._id}`);
        }
      }
      
      console.log(`   ✅ Mantenida ruta: ${sortedRoutes[0]._id} (más antigua)`);
    }
    
    console.log(`\n🎉 Limpieza completada. Total de duplicados eliminados: ${totalDeleted}`);
    
    // Verificar que no queden duplicados
    console.log('\n🔍 Verificando que no queden duplicados...');
    const remainingDuplicates = await collection.aggregate([
      {
        $group: {
          _id: { name: '$name', containerType: '$containerType', routeType: '$routeType' },
          count: { $sum: 1 }
        }
      },
      {
        $match: { count: { $gt: 1 } }
      }
    ]).toArray();
    
    if (remainingDuplicates.length === 0) {
      console.log('✅ No quedan duplicados. Ahora puedes ejecutar el script de migración del índice.');
    } else {
      console.log(`⚠️  Aún quedan ${remainingDuplicates.length} grupos de duplicados. Revisa manualmente.`);
    }
    
  } catch (error) {
    console.error('❌ Error durante la limpieza:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado de MongoDB');
  }
}

// Ejecutar la limpieza
cleanTruckingRoutesDuplicates();
