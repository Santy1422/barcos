const mongoose = require('mongoose');
const { LocalService } = require('../src/database/schemas/localServiceSchema');

// Servicios locales fijos que faltan
const missingLocalServices = [
  {
    code: 'CLG097',
    name: 'Spare Parts',
    description: 'Spare Parts - PTYSS',
    price: 10,
    type: 'fixed',
    active: true
  },
  {
    code: 'CLG096',
    name: 'Ship Chandler',
    description: 'Ship Chandler - PTYSS',
    price: 10,
    type: 'fixed',
    active: true
  },
  {
    code: 'CLG098',
    name: 'Agency Crew',
    description: 'Agency Crew Service',
    price: 10,
    type: 'fixed',
    active: true
  },
  {
    code: 'TRK163',
    name: 'Demurrage/Retención',
    description: 'Demurrage/Retención',
    price: 10,
    type: 'daily',
    active: true
  }
];

async function addMissingLocalServices() {
  try {
    // Conectar a la base de datos
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/barcos');
    console.log('✅ Conectado a MongoDB');

    // Verificar si ya existen los servicios
    for (const serviceData of missingLocalServices) {
      const existingService = await LocalService.findOne({ code: serviceData.code });
      
      if (existingService) {
        console.log(`⚠️ El servicio ${serviceData.code} ya existe, saltando...`);
      } else {
        // Crear el servicio
        const newService = new LocalService(serviceData);
        await newService.save();
        console.log(`✅ Servicio ${serviceData.code} creado: ${serviceData.name}`);
      }
    }

    console.log('\n🎉 Proceso completado');
    
    // Mostrar todos los servicios locales fijos
    const allFixedServices = await LocalService.find({
      code: { $in: ['CLG096', 'CLG097', 'CLG098', 'TRK163', 'TRK179', 'SLR168'] }
    }).sort({ code: 1 });
    
    console.log('\n📋 Servicios locales fijos actuales:');
    allFixedServices.forEach(service => {
      console.log(`  - ${service.code}: ${service.name} (${service.type}) - $${service.price}`);
    });

  } catch (error) {
    console.error('❌ Error durante el proceso:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado de MongoDB');
  }
}

// Ejecutar el script si se llama directamente
if (require.main === module) {
  addMissingLocalServices();
}

module.exports = { addMissingLocalServices }; 