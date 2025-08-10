import AgencyCatalog from '../schemas/agencyCatalogSchema';

export const agencyCatalogSeedData = {
  locations: [
    { type: 'location', name: 'HOTEL MARRIOTT FINISTERRE', metadata: { siteType: 'HOTEL PTY' } },
    { type: 'location', name: 'PSA PORT', metadata: { siteType: 'PACIFIC PORT' } },
    { type: 'location', name: 'AIRPORT PTY', metadata: { siteType: 'INTERNAL' } },
    { type: 'location', name: 'HOTEL CROWNE PLAZA', metadata: { siteType: 'HOTEL COLON' } },
    { type: 'location', name: 'HOTEL RADISSON COLON 2000', metadata: { siteType: 'ATLANTIC PORT' } },
    { type: 'location', name: 'CRISTOBAL PORT', metadata: { siteType: 'COLON INTERNAL' } },
    { type: 'location', name: 'HOSPITAL MAR DEL SUR', metadata: { siteType: 'BOAT LANDING PTY' } },
    { type: 'location', name: 'BALBOA PORT', metadata: { siteType: 'PORT' } },
    { type: 'location', name: 'HOSPITAL SANTA FE', metadata: { siteType: 'HOSPITAL' } },
    { type: 'location', name: 'COLON CONTAINER TERMINAL', metadata: { siteType: 'PORT' } },
    { type: 'location', name: 'HOTEL EL PANAMA', metadata: { siteType: 'HOTEL PTY' } },
    { type: 'location', name: 'HOTEL SHERATON', metadata: { siteType: 'HOTEL PTY' } },
    { type: 'location', name: 'HOTEL HILTON', metadata: { siteType: 'HOTEL PTY' } },
    { type: 'location', name: 'HOTEL INTERCONTINENTAL', metadata: { siteType: 'HOTEL PTY' } },
    { type: 'location', name: 'HOTEL WALDORF ASTORIA', metadata: { siteType: 'HOTEL PTY' } },
    { type: 'location', name: 'HOTEL WESTIN', metadata: { siteType: 'HOTEL PTY' } },
    { type: 'location', name: 'HOTEL BRISTOL', metadata: { siteType: 'HOTEL PTY' } },
    { type: 'location', name: 'HOTEL SORTIS', metadata: { siteType: 'HOTEL PTY' } },
    { type: 'location', name: 'HOTEL TRUMP OCEAN CLUB', metadata: { siteType: 'HOTEL PTY' } },
    { type: 'location', name: 'HOTEL GLOBAL', metadata: { siteType: 'HOTEL PTY' } },
    { type: 'location', name: 'HOTEL CONTINENTAL', metadata: { siteType: 'HOTEL PTY' } },
    { type: 'location', name: 'HOTEL BEST WESTERN', metadata: { siteType: 'HOTEL PTY' } },
    { type: 'location', name: 'HOTEL HOLIDAY INN', metadata: { siteType: 'HOTEL PTY' } },
    { type: 'location', name: 'HOTEL RIANDE', metadata: { siteType: 'HOTEL PTY' } },
    { type: 'location', name: 'MANZANILLO INTERNATIONAL TERMINAL', metadata: { siteType: 'PORT' } },
    { type: 'location', name: 'PANAMA PORTS COMPANY', metadata: { siteType: 'PORT' } },
    { type: 'location', name: 'RODMAN PORT', metadata: { siteType: 'PORT' } },
    { type: 'location', name: 'PUERTO ARMUELLES', metadata: { siteType: 'PORT' } },
    { type: 'location', name: 'CHARCO AZUL', metadata: { siteType: 'PORT' } },
    { type: 'location', name: 'VACAMONTE', metadata: { siteType: 'PORT' } },
    { type: 'location', name: 'HOSPITAL PUNTA PACIFICA', metadata: { siteType: 'HOSPITAL' } },
    { type: 'location', name: 'HOSPITAL NACIONAL', metadata: { siteType: 'HOSPITAL' } },
    { type: 'location', name: 'HOSPITAL SAN FERNANDO', metadata: { siteType: 'HOSPITAL' } },
    { type: 'location', name: 'HOSPITAL DEL NINO', metadata: { siteType: 'HOSPITAL' } },
    { type: 'location', name: 'HOSPITAL SANTO TOMAS', metadata: { siteType: 'HOSPITAL' } },
    { type: 'location', name: 'HOSPITAL REGIONAL DE COLON', metadata: { siteType: 'HOSPITAL' } },
    { type: 'location', name: 'HOSPITAL MANUEL AMADOR GUERRERO', metadata: { siteType: 'HOSPITAL' } },
    { type: 'location', name: 'AIRPORT COLON', metadata: { siteType: 'AIRPORT' } },
    { type: 'location', name: 'AIRPORT DAVID', metadata: { siteType: 'AIRPORT' } },
    { type: 'location', name: 'AIRPORT BOCAS DEL TORO', metadata: { siteType: 'AIRPORT' } },
    { type: 'location', name: 'MSC OFFICE PTY', metadata: { siteType: 'OFFICE' } },
    { type: 'location', name: 'MSC OFFICE COLON', metadata: { siteType: 'OFFICE' } }
  ],
  
  nationalities: [
    { type: 'nationality', name: 'INDIA' },
    { type: 'nationality', name: 'PHILIPPINES' },
    { type: 'nationality', name: 'SPAIN' },
    { type: 'nationality', name: 'POLAND' },
    { type: 'nationality', name: 'PORTUGAL' },
    { type: 'nationality', name: 'UKRAINE' },
    { type: 'nationality', name: 'ROMANIA' },
    { type: 'nationality', name: 'ITALY' },
    { type: 'nationality', name: 'GREECE' },
    { type: 'nationality', name: 'SOUTH AFRICA' },
    { type: 'nationality', name: 'PAKISTAN' },
    { type: 'nationality', name: 'MYANMAR' },
    { type: 'nationality', name: 'RUSSIA' },
    { type: 'nationality', name: 'ETHIOPIA' },
    { type: 'nationality', name: 'IRAN' },
    { type: 'nationality', name: 'BULGARIA' },
    { type: 'nationality', name: 'BRAZIL' },
    { type: 'nationality', name: 'CANADA' },
    { type: 'nationality', name: 'UNITED STATES' },
    { type: 'nationality', name: 'UNITED KINGDOM' },
    { type: 'nationality', name: 'ESTONIA' },
    { type: 'nationality', name: 'EGYPT' },
    { type: 'nationality', name: 'HUNGARY' },
    { type: 'nationality', name: 'SERBIA' },
    { type: 'nationality', name: 'ENGLAND' },
    { type: 'nationality', name: 'GERMANY' },
    { type: 'nationality', name: 'COLOMBIA' },
    { type: 'nationality', name: 'SOUTH KOREA' },
    { type: 'nationality', name: 'SRI LANKA' },
    { type: 'nationality', name: 'BANGLADESH' },
    { type: 'nationality', name: 'PANAMA' },
    { type: 'nationality', name: 'BRITISH' },
    { type: 'nationality', name: 'AUSTRALIA' },
    { type: 'nationality', name: 'LATVIA' },
    { type: 'nationality', name: 'MEXICO' },
    { type: 'nationality', name: 'GEORGIA' },
    { type: 'nationality', name: 'INDONESIA' },
    { type: 'nationality', name: 'NIGERIA' },
    { type: 'nationality', name: 'DOMINICAN REPUBLIC' },
    { type: 'nationality', name: 'LITHUANIA' },
    { type: 'nationality', name: 'TAIWAN' },
    { type: 'nationality', name: 'MALAYSIA' },
    { type: 'nationality', name: 'CHINA' },
    { type: 'nationality', name: 'SLOVAKIA' },
    { type: 'nationality', name: 'CROATIA' },
    { type: 'nationality', name: 'TURKEY' },
    { type: 'nationality', name: 'FRANCE' },
    { type: 'nationality', name: 'NETHERLANDS' },
    { type: 'nationality', name: 'BELGIUM' },
    { type: 'nationality', name: 'SWEDEN' },
    { type: 'nationality', name: 'NORWAY' },
    { type: 'nationality', name: 'FINLAND' },
    { type: 'nationality', name: 'DENMARK' }
  ],
  
  ranks: [
    { type: 'rank', name: 'Master', metadata: { company: 'MSC', level: 1 } },
    { type: 'rank', name: 'Chief Officer', metadata: { company: 'MSC', level: 2 } },
    { type: 'rank', name: 'Second Officer', metadata: { company: 'MSC', level: 3 } },
    { type: 'rank', name: 'Third Officer', metadata: { company: 'MSC', level: 4 } },
    { type: 'rank', name: 'Deck Cadet', metadata: { company: 'MSC', level: 5 } },
    { type: 'rank', name: 'Chief Engineer', metadata: { company: 'MSC', level: 2 } },
    { type: 'rank', name: 'Second Engineer', metadata: { company: 'MSC', level: 3 } },
    { type: 'rank', name: 'Third Engineer', metadata: { company: 'MSC', level: 4 } },
    { type: 'rank', name: 'Fourth Engineer', metadata: { company: 'MSC', level: 5 } },
    { type: 'rank', name: 'Engine Cadet', metadata: { company: 'MSC', level: 6 } },
    { type: 'rank', name: 'Bosun', metadata: { company: 'MSC', level: 7 } },
    { type: 'rank', name: 'Able Seaman', metadata: { company: 'MSC', level: 8 } },
    { type: 'rank', name: 'Ordinary Seaman', metadata: { company: 'MSC', level: 9 } },
    { type: 'rank', name: 'Oiler', metadata: { company: 'MSC', level: 8 } },
    { type: 'rank', name: 'Wiper', metadata: { company: 'MSC', level: 9 } },
    { type: 'rank', name: 'Cook', metadata: { company: 'MSC', level: 8 } },
    { type: 'rank', name: 'Chief Cook', metadata: { company: 'MSC', level: 7 } },
    { type: 'rank', name: 'Steward', metadata: { company: 'MSC', level: 9 } },
    { type: 'rank', name: 'Security Guard', metadata: { company: 'MSC', level: 8 } },
    { type: 'rank', name: 'Reefer Technician', metadata: { company: 'MSC', level: 6 } },
    { type: 'rank', name: 'Technician', metadata: { company: 'MSC', level: 7 } },
    { type: 'rank', name: 'Wartsila Technician', metadata: { company: 'MSC', level: 6 } },
    { type: 'rank', name: 'Trainee Electrical Officer', metadata: { company: 'MSC', level: 6 } },
    { type: 'rank', name: 'Welder', metadata: { company: 'MSC', level: 7 } },
    { type: 'rank', name: 'Fitter', metadata: { company: 'MSC', level: 7 } },
    { type: 'rank', name: 'Service Engineer', metadata: { company: 'MSC', level: 5 } },
    { type: 'rank', name: 'Electrical Officer', metadata: { company: 'MSC', level: 4 } },
    { type: 'rank', name: 'Pumpman', metadata: { company: 'MSC', level: 7 } },
    { type: 'rank', name: 'Motorman', metadata: { company: 'MSC', level: 8 } },
    { type: 'rank', name: 'Messman', metadata: { company: 'MSC', level: 10 } }
  ],
  
  vessels: [
    { type: 'vessel', name: 'MSC FANTASIA' },
    { type: 'vessel', name: 'MSC DIVINA' },
    { type: 'vessel', name: 'MSC PREZIOSA' },
    { type: 'vessel', name: 'MSC SPLENDIDA' },
    { type: 'vessel', name: 'MSC MAGNIFICA' },
    { type: 'vessel', name: 'MSC POESIA' },
    { type: 'vessel', name: 'MSC ORCHESTRA' },
    { type: 'vessel', name: 'MSC MUSICA' },
    { type: 'vessel', name: 'MSC SINFONIA' },
    { type: 'vessel', name: 'MSC ARMONIA' },
    { type: 'vessel', name: 'MSC LIRICA' },
    { type: 'vessel', name: 'MSC OPERA' },
    { type: 'vessel', name: 'MSC MERAVIGLIA' },
    { type: 'vessel', name: 'MSC BELLISSIMA' },
    { type: 'vessel', name: 'MSC GRANDIOSA' },
    { type: 'vessel', name: 'MSC VIRTUOSA' },
    { type: 'vessel', name: 'MSC SEASHORE' },
    { type: 'vessel', name: 'MSC SEASIDE' },
    { type: 'vessel', name: 'MSC SEAVIEW' },
    { type: 'vessel', name: 'MSC SEASCAPE' }
  ],
  
  transportCompanies: [
    { type: 'transport_company', name: 'TRANSPORTES PANAMA' },
    { type: 'transport_company', name: 'COLON TRANSPORT SERVICE' },
    { type: 'transport_company', name: 'PANAMA CITY SHUTTLES' },
    { type: 'transport_company', name: 'MARITIME TRANSPORT CO' },
    { type: 'transport_company', name: 'EXPRESS LOGISTICS PANAMA' },
    { type: 'transport_company', name: 'GLOBAL TRANSPORT SOLUTIONS' },
    { type: 'transport_company', name: 'PANAMA CREW SERVICES' },
    { type: 'transport_company', name: 'AIRPORT SHUTTLE PANAMA' }
  ],
  
  drivers: [
    { type: 'driver', name: 'Ovidio Centeno Atencio', metadata: { phone: '+507 6789-1234' } },
    { type: 'driver', name: 'Sergio Gonzalez', metadata: { phone: '+507 6789-2345' } },
    { type: 'driver', name: 'Luis Carlos Sierra', metadata: { phone: '+507 6789-3456' } },
    { type: 'driver', name: 'Fabio Robles', metadata: { phone: '+507 6789-4567' } },
    { type: 'driver', name: 'Felix Stanziola', metadata: { phone: '+507 6789-5678' } },
    { type: 'driver', name: 'Roberto De Freitas', metadata: { phone: '+507 6789-6789' } },
    { type: 'driver', name: 'Leonardo Vásquez', metadata: { phone: '+507 6789-7890' } },
    { type: 'driver', name: 'Ricardo Irimia', metadata: { phone: '+507 6789-8901' } },
    { type: 'driver', name: 'Albin Sánchez', metadata: { phone: '+507 6789-9012' } },
    { type: 'driver', name: 'Jiconi Stanziola', metadata: { phone: '+507 6789-0123' } },
    { type: 'driver', name: 'Angela Corredoira', metadata: { phone: '+507 6789-1234' } },
    { type: 'driver', name: 'Alfredo Corredoira', metadata: { phone: '+507 6789-2345' } },
    { type: 'driver', name: 'David Mojica', metadata: { phone: '+507 6789-3456' } },
    { type: 'driver', name: 'Martin Luck', metadata: { phone: '+507 6789-4567' } },
    { type: 'driver', name: 'Carlos Rodriguez', metadata: { phone: '+507 6789-5678' } },
    { type: 'driver', name: 'Miguel Santos', metadata: { phone: '+507 6789-6789' } },
    { type: 'driver', name: 'Jorge Martinez', metadata: { phone: '+507 6789-7890' } },
    { type: 'driver', name: 'Pedro Fernandez', metadata: { phone: '+507 6789-8901' } },
    { type: 'driver', name: 'Luis Mendoza', metadata: { phone: '+507 6789-9012' } },
    { type: 'driver', name: 'Roberto Diaz', metadata: { phone: '+507 6789-0123' } }
  ],
  
  tauliaCodes: [
    { 
      type: 'taulia_code', 
      name: 'Crew Members', 
      code: 'ECR000669', 
      description: 'Transporte de tripulación regular',
      metadata: { price: 0, category: 'crew' }
    },
    { 
      type: 'taulia_code', 
      name: 'Security guard / Seal check', 
      code: 'CLA00001', 
      description: 'Servicio de seguridad y verificación de sellos',
      metadata: { price: 0, category: 'security' }
    },
    { 
      type: 'taulia_code', 
      name: 'Reefer Technicians', 
      code: 'ECR001253', 
      description: 'Transporte de técnicos de refrigeración',
      metadata: { price: 0, category: 'technical' }
    },
    { 
      type: 'taulia_code', 
      name: 'VIP Expense / Personal de MSC', 
      code: 'GEN000089', 
      description: 'Gastos VIP y personal de MSC',
      metadata: { price: 0, category: 'vip' }
    },
    { 
      type: 'taulia_code', 
      name: 'Airport Transfer', 
      code: 'TRN000001', 
      description: 'Traslado aeropuerto',
      metadata: { price: 150, category: 'transport' }
    },
    { 
      type: 'taulia_code', 
      name: 'Port Transfer', 
      code: 'TRN000002', 
      description: 'Traslado puerto',
      metadata: { price: 100, category: 'transport' }
    },
    { 
      type: 'taulia_code', 
      name: 'Hotel Transfer', 
      code: 'TRN000003', 
      description: 'Traslado hotel',
      metadata: { price: 75, category: 'transport' }
    },
    { 
      type: 'taulia_code', 
      name: 'Emergency Transfer', 
      code: 'EMG000001', 
      description: 'Traslado de emergencia',
      metadata: { price: 200, category: 'emergency' }
    },
    { 
      type: 'taulia_code', 
      name: 'Medical Transfer', 
      code: 'MED000001', 
      description: 'Traslado médico/hospital',
      metadata: { price: 180, category: 'medical' }
    },
    { 
      type: 'taulia_code', 
      name: 'Waiting Time', 
      code: 'WAI000001', 
      description: 'Tiempo de espera (por hora)',
      metadata: { price: 25, category: 'additional' }
    }
  ]
};

export async function seedAgencyCatalogs() {
  try {
    console.log('🌱 Starting Agency Catalog seeding...');
    
    // Clear existing data
    await AgencyCatalog.deleteMany({});
    console.log('✅ Cleared existing catalog data');
    
    // Seed locations
    console.log('📍 Seeding locations...');
    for (const location of agencyCatalogSeedData.locations) {
      await AgencyCatalog.create(location);
    }
    console.log(`✅ Created ${agencyCatalogSeedData.locations.length} locations`);
    
    // Seed nationalities
    console.log('🌍 Seeding nationalities...');
    for (const nationality of agencyCatalogSeedData.nationalities) {
      await AgencyCatalog.create(nationality);
    }
    console.log(`✅ Created ${agencyCatalogSeedData.nationalities.length} nationalities`);
    
    // Seed ranks
    console.log('⚓ Seeding ranks...');
    for (const rank of agencyCatalogSeedData.ranks) {
      await AgencyCatalog.create(rank);
    }
    console.log(`✅ Created ${agencyCatalogSeedData.ranks.length} ranks`);
    
    // Seed vessels
    console.log('🚢 Seeding vessels...');
    for (const vessel of agencyCatalogSeedData.vessels) {
      await AgencyCatalog.create(vessel);
    }
    console.log(`✅ Created ${agencyCatalogSeedData.vessels.length} vessels`);
    
    // Seed transport companies
    console.log('🚐 Seeding transport companies...');
    for (const company of agencyCatalogSeedData.transportCompanies) {
      await AgencyCatalog.create(company);
    }
    console.log(`✅ Created ${agencyCatalogSeedData.transportCompanies.length} transport companies`);
    
    // Seed drivers
    console.log('🚗 Seeding drivers...');
    for (const driver of agencyCatalogSeedData.drivers) {
      await AgencyCatalog.create(driver);
    }
    console.log(`✅ Created ${agencyCatalogSeedData.drivers.length} drivers`);
    
    // Seed Taulia codes
    console.log('💳 Seeding Taulia codes...');
    for (const code of agencyCatalogSeedData.tauliaCodes) {
      await AgencyCatalog.create(code);
    }
    console.log(`✅ Created ${agencyCatalogSeedData.tauliaCodes.length} Taulia codes`);
    
    // Get summary
    const summary = await (AgencyCatalog as any).getAllGroupedByType();
    console.log('\n📊 Seeding Summary:');
    Object.entries(summary).forEach(([type, items]) => {
      console.log(`   ${type}: ${(items as any[]).length} items`);
    });
    
    console.log('\n✨ Agency Catalog seeding completed successfully!');
    
    return summary;
  } catch (error) {
    console.error('❌ Error seeding Agency catalogs:', error);
    throw error;
  }
}

// Standalone execution
if (require.main === module) {
  const mongoose = require('mongoose');
  const dotenv = require('dotenv');
  
  dotenv.config();
  
  mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/barcos')
    .then(() => {
      console.log('📦 Connected to MongoDB');
      return seedAgencyCatalogs();
    })
    .then(() => {
      console.log('✅ Seeding completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seeding failed:', error);
      process.exit(1);
    });
}