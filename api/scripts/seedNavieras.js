const mongoose = require('mongoose');
const { Naviera } = require('../src/database/schemas/navieraSchema');
require('dotenv').config();

const navierasData = [
  {
    name: 'MSC Mediterranean Shipping Company',
    code: 'MSC',
    isActive: true
  },
  {
    name: 'Maersk Line',
    code: 'MAERSK',
    isActive: true
  },
  {
    name: 'CMA CGM',
    code: 'CMA CGM',
    isActive: true
  },
  {
    name: 'COSCO Shipping',
    code: 'COSCO',
    isActive: true
  },
  {
    name: 'Evergreen Marine',
    code: 'EVERGREEN',
    isActive: true
  },
  {
    name: 'Hapag-Lloyd',
    code: 'HAPAG-LLOYD',
    isActive: true
  },
  {
    name: 'Ocean Network Express',
    code: 'ONE',
    isActive: true
  },
  {
    name: 'Yang Ming Marine',
    code: 'YANG MING',
    isActive: true
  },
  {
    name: 'ZIM Integrated Shipping',
    code: 'ZIM',
    isActive: true
  },
  {
    name: 'Hamburg Süd',
    code: 'HAMBURG SUD',
    isActive: true
  }
];

async function seedNavieras() {
  try {
    // Conectar a la base de datos
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/barcos');
    console.log('Conectado a MongoDB');

    // Limpiar datos existentes
    await Naviera.deleteMany({});
    console.log('Datos de navieras existentes eliminados');

    // Crear un usuario de sistema para las navieras iniciales
    const systemUserId = new mongoose.Types.ObjectId();

    // Insertar navieras con el usuario de sistema
    const navierasWithUser = navierasData.map(naviera => ({
      ...naviera,
      createdBy: systemUserId
    }));

    const result = await Naviera.insertMany(navierasWithUser);
    console.log(`${result.length} navieras insertadas exitosamente`);

    // Mostrar las navieras insertadas
    console.log('\nNavieras insertadas:');
    result.forEach(naviera => {
      console.log(`- ${naviera.name} (${naviera.code})`);
    });

  } catch (error) {
    console.error('Error al poblar navieras:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Desconectado de MongoDB');
  }
}

// Ejecutar el script si se llama directamente
if (require.main === module) {
  seedNavieras();
}

module.exports = { seedNavieras }; 