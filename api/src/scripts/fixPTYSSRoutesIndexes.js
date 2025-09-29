const mongoose = require('mongoose');

// Conectar a la base de datos
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/barcos');
    console.log('MongoDB conectado');
  } catch (error) {
    console.error('Error conectando a MongoDB:', error);
    process.exit(1);
  }
};

// Función para arreglar los índices de PTYSS Routes
const fixPTYSSRoutesIndexes = async () => {
  try {
    const db = mongoose.connection.db;
    const collection = db.collection('ptyssroutes');

    console.log('🔍 Verificando índices existentes...');
    
    // Obtener todos los índices
    const indexes = await collection.indexes();
    console.log('Índices actuales:', indexes.map(idx => idx.key));

    // Buscar el índice problemático
    const oldIndex = indexes.find(idx => 
      JSON.stringify(idx.key) === '{"name":1,"containerType":1,"routeType":1}'
    );

    if (oldIndex) {
      console.log('❌ Encontrado índice antiguo problemático:', oldIndex.key);
      console.log('🗑️ Eliminando índice antiguo...');
      
      // Eliminar el índice antiguo
      await collection.dropIndex(oldIndex.key);
      console.log('✅ Índice antiguo eliminado');
    } else {
      console.log('ℹ️ No se encontró el índice antiguo problemático');
    }

    // Verificar si existe el nuevo índice
    const newIndex = indexes.find(idx => 
      JSON.stringify(idx.key) === '{"name":1,"from":1,"to":1,"containerType":1,"routeType":1,"status":1,"cliente":1,"routeArea":1}'
    );

    if (!newIndex) {
      console.log('➕ Creando nuevo índice único...');
      
      // Crear el nuevo índice único
      await collection.createIndex(
        { 
          name: 1, 
          from: 1, 
          to: 1, 
          containerType: 1, 
          routeType: 1, 
          status: 1, 
          cliente: 1, 
          routeArea: 1 
        },
        { unique: true }
      );
      console.log('✅ Nuevo índice único creado');
    } else {
      console.log('ℹ️ El nuevo índice único ya existe');
    }

    // Crear índices adicionales para consultas frecuentes
    console.log('➕ Creando índices adicionales...');
    
    const additionalIndexes = [
      { cliente: 1 },
      { routeArea: 1 },
      { from: 1, to: 1 },
      { containerType: 1 },
      { routeType: 1 },
      { status: 1 }
    ];

    for (const indexKey of additionalIndexes) {
      try {
        await collection.createIndex(indexKey);
        console.log(`✅ Índice creado: ${JSON.stringify(indexKey)}`);
      } catch (error) {
        if (error.code === 85) {
          console.log(`ℹ️ Índice ya existe: ${JSON.stringify(indexKey)}`);
        } else {
          console.error(`❌ Error creando índice ${JSON.stringify(indexKey)}:`, error.message);
        }
      }
    }

    // Mostrar índices finales
    console.log('\n📋 Índices finales:');
    const finalIndexes = await collection.indexes();
    finalIndexes.forEach((idx, i) => {
      console.log(`${i + 1}. ${JSON.stringify(idx.key)} ${idx.unique ? '(único)' : ''}`);
    });

    console.log('\n🎉 ¡Índices de PTYSS Routes actualizados correctamente!');
    
  } catch (error) {
    console.error('❌ Error actualizando índices:', error);
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB desconectado');
  }
};

// Ejecutar el script
const runScript = async () => {
  await connectDB();
  await fixPTYSSRoutesIndexes();
};

runScript();
