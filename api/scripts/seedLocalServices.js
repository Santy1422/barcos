const mongoose = require('mongoose');
const { LocalService } = require('../src/database/schemas/localServiceSchema');

// Datos de ejemplo para servicios locales de PTYSS
const localServicesData = [
  {
    name: 'Estacionamiento',
    description: 'Servicio de estacionamiento para contenedores',
    module: 'ptyss',
    isActive: true
  },
  {
    name: 'Limpieza de Contenedor',
    description: 'Servicio de limpieza y sanitización de contenedores',
    module: 'ptyss',
    isActive: true
  },
  {
    name: 'Inspección Adicional',
    description: 'Inspección adicional de contenedores por autoridades',
    module: 'ptyss',
    isActive: true
  },
  {
    name: 'Almacenamiento Extendido',
    description: 'Almacenamiento por tiempo extendido en terminal',
    module: 'ptyss',
    isActive: true
  },
  {
    name: 'Servicio de Grúa',
    description: 'Servicio de grúa para movilización especial',
    module: 'ptyss',
    isActive: true
  },
  {
    name: 'Documentación Adicional',
    description: 'Procesamiento de documentación adicional requerida',
    module: 'ptyss',
    isActive: true
  },
  {
    name: 'Servicio de Seguridad',
    description: 'Servicio de seguridad adicional para contenedores',
    module: 'ptyss',
    isActive: true
  },
  {
    name: 'Mantenimiento de Equipos',
    description: 'Mantenimiento y reparación de equipos especializados',
    module: 'ptyss',
    isActive: true
  }
];

async function seedLocalServices() {
  try {
    // Conectar a la base de datos
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/barcos');
    console.log('✅ Conectado a MongoDB');

    // Limpiar servicios locales existentes
    await LocalService.deleteMany({});
    console.log('🗑️ Servicios locales existentes eliminados');

    // Insertar nuevos servicios locales
    const createdServices = await LocalService.insertMany(localServicesData);
    console.log(`✅ ${createdServices.length} servicios locales creados:`);

    // Mostrar los servicios creados
    createdServices.forEach(service => {
      console.log(`  - ${service.name}: ${service.description}`);
    });

    console.log('\n🎉 Seed de servicios locales completado exitosamente');
  } catch (error) {
    console.error('❌ Error durante el seed de servicios locales:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado de MongoDB');
  }
}

// Ejecutar el seed si se llama directamente
if (require.main === module) {
  seedLocalServices();
}

module.exports = { seedLocalServices }; 