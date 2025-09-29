/**
 * Script para poblar los catálogos de Agency CREW
 * Incluye: Taulia Codes, Crew Ranks, Drivers
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Cargar variables de entorno
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Importar el modelo
const AgencyCatalog = require('../src/database/schemas/agencyCatalogSchema').default;

// Taulia Codes basados en el documento
const tauliaCodes = [
  {
    type: 'taulia_code',
    code: 'ECR000669',
    name: 'Crew Members Transfer',
    description: 'Standard crew transportation service',
    metadata: {
      sapCode: 'TRK137',
      category: 'transport',
      adjustmentType: 'standard'
    }
  },
  {
    type: 'taulia_code',
    code: 'ECR001253',
    name: 'Reefer Technicians',
    description: 'Specialized reefer technician transport',
    metadata: {
      sapCode: 'TRK137',
      category: 'technical',
      adjustmentType: 'specialized',
      surcharge: 10
    }
  },
  {
    type: 'taulia_code',
    code: 'GEN000089',
    name: 'VIP Expense / Personal de MSC',
    description: 'VIP and MSC personnel transportation',
    metadata: {
      sapCode: 'TRK137',
      category: 'vip',
      adjustmentType: 'premium',
      surcharge: 30
    }
  },
  {
    type: 'taulia_code',
    code: 'CLA00001',
    name: 'Security guard / Seal check',
    description: 'Security services and seal verification',
    metadata: {
      sapCode: 'SHP242',
      category: 'security',
      adjustmentType: 'specialized',
      surcharge: 25
    }
  },
  {
    type: 'taulia_code',
    code: 'SHP242',
    name: 'Shipping Service',
    description: 'General shipping related services',
    metadata: {
      sapCode: 'SHP242',
      category: 'shipping',
      adjustmentType: 'standard'
    }
  },
  {
    type: 'taulia_code',
    code: 'TRK137',
    name: 'Transport Service',
    description: 'General transport services',
    metadata: {
      sapCode: 'TRK137',
      category: 'transport',
      adjustmentType: 'standard'
    }
  }
];

// Crew Ranks
const crewRanks = [
  // Officers
  {
    type: 'crew_rank',
    code: 'CAPT',
    name: 'Captain',
    description: 'Ship Captain / Master',
    metadata: {
      level: 'senior_officer',
      priority: 1,
      vipStatus: true
    }
  },
  {
    type: 'crew_rank',
    code: 'CHOFF',
    name: 'Chief Officer',
    description: 'Chief Officer / First Mate',
    metadata: {
      level: 'senior_officer',
      priority: 2,
      vipStatus: true
    }
  },
  {
    type: 'crew_rank',
    code: 'CHENG',
    name: 'Chief Engineer',
    description: 'Chief Engineering Officer',
    metadata: {
      level: 'senior_officer',
      priority: 2,
      vipStatus: true
    }
  },
  {
    type: 'crew_rank',
    code: '2OFF',
    name: 'Second Officer',
    description: 'Second Officer / Second Mate',
    metadata: {
      level: 'officer',
      priority: 3
    }
  },
  {
    type: 'crew_rank',
    code: '3OFF',
    name: 'Third Officer',
    description: 'Third Officer / Third Mate',
    metadata: {
      level: 'officer',
      priority: 4
    }
  },
  {
    type: 'crew_rank',
    code: '2ENG',
    name: 'Second Engineer',
    description: 'Second Engineering Officer',
    metadata: {
      level: 'officer',
      priority: 3
    }
  },
  
  // Ratings
  {
    type: 'crew_rank',
    code: 'AB',
    name: 'Able Seaman',
    description: 'Able Bodied Seaman',
    metadata: {
      level: 'rating',
      priority: 5
    }
  },
  {
    type: 'crew_rank',
    code: 'OS',
    name: 'Ordinary Seaman',
    description: 'Ordinary Seaman',
    metadata: {
      level: 'rating',
      priority: 6
    }
  },
  {
    type: 'crew_rank',
    code: 'OILER',
    name: 'Oiler',
    description: 'Engine Room Oiler',
    metadata: {
      level: 'rating',
      priority: 5
    }
  },
  {
    type: 'crew_rank',
    code: 'COOK',
    name: 'Cook',
    description: 'Ship Cook',
    metadata: {
      level: 'catering',
      priority: 5
    }
  },
  {
    type: 'crew_rank',
    code: 'STWD',
    name: 'Steward',
    description: 'Ship Steward',
    metadata: {
      level: 'catering',
      priority: 6
    }
  },
  {
    type: 'crew_rank',
    code: 'CADET',
    name: 'Cadet',
    description: 'Officer Cadet / Trainee',
    metadata: {
      level: 'trainee',
      priority: 7
    }
  }
];

// Drivers Database
const drivers = [
  // In-house drivers
  {
    type: 'driver',
    code: 'DRV001',
    name: 'Juan Pérez',
    description: 'In-house driver - Day shift',
    metadata: {
      company: 'Internal',
      type: 'in_house',
      license: 'B/D',
      vehicles: ['sedan', 'van', 'minibus'],
      languages: ['Spanish', 'English'],
      shift: 'day',
      experience: 5
    }
  },
  {
    type: 'driver',
    code: 'DRV002',
    name: 'Carlos Rodriguez',
    description: 'In-house driver - Night shift',
    metadata: {
      company: 'Internal',
      type: 'in_house',
      license: 'B/D',
      vehicles: ['sedan', 'van', 'minibus'],
      languages: ['Spanish', 'English'],
      shift: 'night',
      experience: 3
    }
  },
  {
    type: 'driver',
    code: 'DRV003',
    name: 'Miguel Santos',
    description: 'In-house driver - VIP services',
    metadata: {
      company: 'Internal',
      type: 'in_house',
      license: 'B/D',
      vehicles: ['luxury_sedan', 'suv'],
      languages: ['Spanish', 'English', 'French'],
      shift: 'flexible',
      experience: 8,
      vipCertified: true
    }
  },
  
  // Outsourced drivers
  {
    type: 'driver',
    code: 'DRV101',
    name: 'Roberto Díaz',
    description: 'Outsourced driver - TransPanama',
    metadata: {
      company: 'TransPanama S.A.',
      type: 'outsourcing',
      license: 'B/D/E',
      vehicles: ['bus', 'minibus', 'van'],
      languages: ['Spanish'],
      experience: 6
    }
  },
  {
    type: 'driver',
    code: 'DRV102',
    name: 'Fernando López',
    description: 'Outsourced driver - Elite Transport',
    metadata: {
      company: 'Elite Transport',
      type: 'outsourcing',
      license: 'B/D',
      vehicles: ['luxury_sedan', 'suv', 'van'],
      languages: ['Spanish', 'English'],
      experience: 10,
      vipCertified: true
    }
  },
  {
    type: 'driver',
    code: 'DRV103',
    name: 'José Martínez',
    description: 'Outsourced driver - Colon Express',
    metadata: {
      company: 'Colon Express',
      type: 'outsourcing',
      license: 'B/D/E',
      vehicles: ['bus', 'minibus'],
      languages: ['Spanish'],
      experience: 4,
      routes: ['PTY-COLON', 'CRISTOBAL-PTY']
    }
  }
];

// Crew Change Services
const crewChangeServices = [
  {
    type: 'crew_change_service',
    code: 'SIGN_ON',
    name: 'Crew Sign On',
    description: 'Complete crew sign-on service including transport and documentation',
    metadata: {
      includesTransport: true,
      includesDocumentation: true,
      averageDuration: 4 // hours
    }
  },
  {
    type: 'crew_change_service',
    code: 'SIGN_OFF',
    name: 'Crew Sign Off',
    description: 'Complete crew sign-off service including transport and documentation',
    metadata: {
      includesTransport: true,
      includesDocumentation: true,
      averageDuration: 4 // hours
    }
  },
  {
    type: 'crew_change_service',
    code: 'MED_EXAM',
    name: 'Medical Examination',
    description: 'Medical examination and certification for crew',
    metadata: {
      includesTransport: true,
      includesMedical: true,
      averageDuration: 6 // hours
    }
  },
  {
    type: 'crew_change_service',
    code: 'HOTEL_TRANS',
    name: 'Hotel Transfer',
    description: 'Transfer between hotel and port/airport',
    metadata: {
      includesTransport: true,
      includesWaiting: false,
      averageDuration: 2 // hours
    }
  },
  {
    type: 'crew_change_service',
    code: 'SHORE_LEAVE',
    name: 'Shore Leave Transport',
    description: 'Transportation for crew shore leave',
    metadata: {
      includesTransport: true,
      includesWaiting: true,
      averageDuration: 8 // hours
    }
  }
];

const seedAgencyCrewCatalogs = async () => {
  try {
    // Conectar a MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/barcos';
    console.log('🔗 Conectando a MongoDB...');
    
    await mongoose.connect(mongoUri);
    console.log('✅ Conectado a MongoDB');
    
    // Limpiar catálogos existentes de estos tipos
    console.log('🗑️ Limpiando catálogos existentes...');
    await AgencyCatalog.deleteMany({ 
      type: { $in: ['taulia_code', 'crew_rank', 'driver', 'crew_change_service'] }
    });
    
    // Insertar Taulia Codes
    console.log('\n📝 Insertando Taulia Codes...');
    const tauliaResults = await AgencyCatalog.insertMany(tauliaCodes.map(item => ({
      ...item,
      isActive: true
    })));
    console.log(`✅ ${tauliaResults.length} Taulia Codes creados`);
    
    // Insertar Crew Ranks
    console.log('\n📝 Insertando Crew Ranks...');
    const rankResults = await AgencyCatalog.insertMany(crewRanks.map(item => ({
      ...item,
      isActive: true
    })));
    console.log(`✅ ${rankResults.length} Crew Ranks creados`);
    
    // Insertar Drivers
    console.log('\n📝 Insertando Drivers...');
    const driverResults = await AgencyCatalog.insertMany(drivers.map(item => ({
      ...item,
      isActive: true
    })));
    console.log(`✅ ${driverResults.length} Drivers creados`);
    
    // Insertar Crew Change Services
    console.log('\n📝 Insertando Crew Change Services...');
    const serviceResults = await AgencyCatalog.insertMany(crewChangeServices.map(item => ({
      ...item,
      isActive: true
    })));
    console.log(`✅ ${serviceResults.length} Crew Change Services creados`);
    
    // Mostrar resumen
    console.log('\n=====================================');
    console.log('📊 RESUMEN DE CATÁLOGOS CREADOS:');
    console.log('=====================================');
    
    console.log('\n📋 Taulia Codes:');
    tauliaCodes.forEach(code => {
      console.log(`   ${code.code}: ${code.name}`);
    });
    
    console.log('\n👮 Crew Ranks:');
    crewRanks.forEach(rank => {
      console.log(`   ${rank.code}: ${rank.name} (${rank.metadata.level})`);
    });
    
    console.log('\n🚗 Drivers:');
    drivers.forEach(driver => {
      console.log(`   ${driver.code}: ${driver.name} - ${driver.metadata.company} (${driver.metadata.type})`);
    });
    
    console.log('\n🔄 Crew Change Services:');
    crewChangeServices.forEach(service => {
      console.log(`   ${service.code}: ${service.name}`);
    });
    
    console.log('\n=====================================');
    console.log('✅ Catálogos de CREW completados exitosamente');
    
    // Desconectar
    await mongoose.disconnect();
    console.log('👋 Desconectado de MongoDB');
    
  } catch (error) {
    console.error('❌ Error en seed:', error);
    process.exit(1);
  }
};

// Ejecutar el seed
seedAgencyCrewCatalogs()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });