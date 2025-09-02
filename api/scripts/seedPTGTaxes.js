const mongoose = require('mongoose');
const { Service } = require('../src/database/schemas/servicesSchema');
require('dotenv').config();

const ptgTaxesData = [
  {
    name: 'Customs',
    description: 'Impuesto de aduana para el módulo de Trucking',
    price: 0,
    module: 'trucking',
    isActive: true
  },
  {
    name: 'Administration Fee',
    description: 'Tarifa administrativa para el módulo de Trucking',
    price: 0,
    module: 'trucking',
    isActive: true
  }
];

async function seedPTGTaxes() {
  try {
    // Conectar a la base de datos
    const mongoUri = process.env.USER_MONGO_URI || 'mongodb://localhost:27017/barcos';
    await mongoose.connect(mongoUri);
    console.log('✅ Conectado a MongoDB');

    // Verificar si ya existen los impuestos
    const existingTaxes = await Service.find({
      module: 'trucking',
      name: { $in: ['Customs', 'Administration Fee'] }
    });

    if (existingTaxes.length > 0) {
      console.log('⚠️  Los impuestos PTG ya existen en la base de datos:');
      existingTaxes.forEach(tax => {
        console.log(`   - ${tax.name}: $${tax.price || 0}`);
      });
      
      console.log('\n💡 Los impuestos se mantendrán con sus precios actuales.');
      console.log('   Puedes modificar los precios desde la interfaz de configuración de Trucking.');
      
      await mongoose.disconnect();
      console.log('🔌 Desconectado de MongoDB');
      return;
    }

    // Crear un usuario de sistema para los impuestos iniciales
    const systemUserId = new mongoose.Types.ObjectId();

    // Insertar impuestos con el usuario de sistema
    const taxesWithUser = ptgTaxesData.map(tax => ({
      ...tax,
      createdBy: systemUserId
    }));

    const result = await Service.insertMany(taxesWithUser);
    console.log(`✅ ${result.length} impuestos PTG insertados exitosamente`);

    // Mostrar los impuestos insertados
    console.log('\n📋 Impuestos PTG insertados:');
    result.forEach(tax => {
      console.log(`   - ${tax.name}: $${tax.price || 0}`);
    });

    console.log('\n💡 Nota: Los precios están inicializados en $0.00');
    console.log('   Puedes modificar los precios desde la interfaz de configuración de Trucking.');

  } catch (error) {
    console.error('❌ Error al poblar impuestos PTG:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado de MongoDB');
  }
}

// Ejecutar el script si se llama directamente
if (require.main === module) {
  seedPTGTaxes();
}

module.exports = { seedPTGTaxes };
