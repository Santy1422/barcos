import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.USER_MONGO_URI;

if (!MONGODB_URI) {
  console.error('❌ Error: USER_MONGO_URI no está definido en las variables de entorno');
  process.exit(1);
}

async function migrateTruckingRoutesIndex() {
  try {
    console.log('🔌 Conectando a MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado a MongoDB');

    // Obtener la colección de trucking routes
    const db = mongoose.connection.db;
    const collection = db.collection('truckingroutes');

    console.log('📊 Verificando índices existentes...');
    const existingIndexes = await collection.indexes();
    console.log('Índices actuales:', existingIndexes.map(idx => idx.name));

    // Verificar si ya existe el índice compuesto
    const hasCompoundIndex = existingIndexes.some(idx => 
      idx.name === 'name_1_containerType_1_routeType_1'
    );

    if (hasCompoundIndex) {
      console.log('✅ El índice compuesto ya existe, no es necesario migrar');
    } else {
      console.log('🔧 Creando índice compuesto...');
      
      // Crear el índice compuesto
      await collection.createIndex(
        { name: 1, containerType: 1, routeType: 1 }, 
        { 
          unique: true,
          name: 'name_1_containerType_1_routeType_1'
        }
      );
      
      console.log('✅ Índice compuesto creado exitosamente');
    }

    // Verificar que no haya duplicados que violen la nueva restricción
    console.log('🔍 Verificando duplicados existentes...');
    const duplicates = await collection.aggregate([
      {
        $group: {
          _id: { name: '$name', containerType: '$containerType', routeType: '$routeType' },
          count: { $sum: 1 },
          routes: { $push: { _id: '$_id', name: '$name', containerType: '$containerType', routeType: '$routeType' } }
        }
      },
      {
        $match: { count: { $gt: 1 } }
      }
    ]).toArray();

    if (duplicates.length > 0) {
      console.log('⚠️  Se encontraron duplicados que violan la nueva restricción:');
      duplicates.forEach((dup, index) => {
        console.log(`  ${index + 1}. Nombre: "${dup._id.name}", Tipo: ${dup._id.containerType}, Ruta: ${dup._id.routeType}`);
        console.log(`     Rutas afectadas: ${dup.routes.map(r => r._id).join(', ')}`);
      });
      console.log('💡 Debes resolver estos duplicados antes de que el índice funcione correctamente');
    } else {
      console.log('✅ No se encontraron duplicados que violen la nueva restricción');
    }

    console.log('🎉 Migración completada');
  } catch (error) {
    console.error('❌ Error durante la migración:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado de MongoDB');
  }
}

// Ejecutar la migración
migrateTruckingRoutesIndex();
