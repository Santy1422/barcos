#!/usr/bin/env node
/**
 * Script para poblar la base de datos con las rutas de precios de Agency
 * Incluye las 33 rutas predefinidas del PDF con sus códigos SAP
 * 
 * Uso: npm run seed:agency-pricing
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import AgencyCatalog from '../src/database/schemas/agencyCatalogSchema';

// Cargar variables de entorno
dotenv.config({ path: path.join(__dirname, '../.env') });

// Distancias aproximadas entre ubicaciones principales en Panamá (en km)
const distanceMatrix: Record<string, Record<string, number>> = {
  'HOTEL PTY': {
    'PTY PORT': 15,           // Ciudad de Panamá al puerto de Balboa
    'TOCUMEN AIRPORT': 25,    // Ciudad de Panamá al aeropuerto
    'CRISTOBAL PORT': 80,     // Ciudad de Panamá a Cristóbal (Colón)
    'HOTEL RADISSON COLON': 75, // Ciudad de Panamá a hotel en Colón
    'COLON PORT': 78,         // Ciudad de Panamá al puerto de Colón
    'HOSPITAL PTY': 8,        // Dentro de la ciudad
    'HOSPITAL COLON': 75,     // Ciudad de Panamá a hospital en Colón
    'BOAT LANDING PTY': 12,   // Ciudad de Panamá a muelle
    'PTY': 5                  // Dentro de la ciudad
  },
  'PTY PORT': {
    'HOTEL PTY': 15,
    'TOCUMEN AIRPORT': 35,    // Puerto Balboa al aeropuerto
    'HOTEL RADISSON COLON': 65, // Puerto Balboa a hotel en Colón
    'CRISTOBAL PORT': 70,     // Puerto Balboa a Cristóbal
    'PTY': 10                 // Puerto al centro de la ciudad
  },
  'TOCUMEN AIRPORT': {
    'CRISTOBAL PORT': 95,     // Aeropuerto a Cristóbal (lado Atlántico)
    'HOTEL PTY': 25,
    'PTY PORT': 35,
    'HOTEL RADISSON COLON': 90
  },
  'CRISTOBAL PORT': {
    'HOTEL RADISSON COLON': 10, // Ambos en Colón, cerca
    'TOCUMEN AIRPORT': 95,
    'HOTEL PTY': 80,
    'PTY PORT': 70
  },
  'HOTEL RADISSON COLON': {
    'CRISTOBAL PORT': 10,
    'HOTEL PTY': 75,
    'PTY PORT': 65,
    'TOCUMEN AIRPORT': 90,
    'COLON PORT': 8           // Ambos en Colón
  },
  'COLON PORT': {
    'HOTEL PTY': 78,
    'PTY PORT': 68,
    'HOTEL RADISSON COLON': 8,
    'CRISTOBAL PORT': 5       // Puertos cercanos en Colón
  },
  'HOSPITAL PTY': {
    'HOTEL PTY': 8,
    'PTY PORT': 18
  },
  'HOSPITAL COLON': {
    'HOTEL RADISSON COLON': 5,
    'CRISTOBAL PORT': 12
  }
};

// Función para obtener distancia entre dos ubicaciones
const getDistance = (from: string, to: string): number => {
  if (distanceMatrix[from]?.[to]) return distanceMatrix[from][to];
  if (distanceMatrix[to]?.[from]) return distanceMatrix[to][from];
  return 0;
};

// Datos del PDF y documentación de Agency - Rutas con precios y códigos Taulia/SAP
// Incluye análisis de precio por km
const routePricingData = [
  // PANAMA CITY (PTY) - HOTEL routes
  { from: 'HOTEL PTY', to: 'PTY PORT', taulia: 'ECR000669', price: 120, desc: 'Crew Members Transfer', distance: 15, pricePerKm: 8.0 },
  { from: 'HOTEL PTY', to: 'TOCUMEN AIRPORT', taulia: 'ECR000669', price: 85, desc: 'Airport Transfer', distance: 25, pricePerKm: 3.4 },
  { from: 'HOTEL PTY', to: 'CRISTOBAL PORT', taulia: 'ECR000669', price: 200, desc: 'Inter-city Port Transfer', distance: 80, pricePerKm: 2.5 },
  { from: 'HOTEL PTY', to: 'HOTEL RADISSON COLON', taulia: 'ECR001253', price: 150, desc: 'Hotel to Hotel Transfer', distance: 75, pricePerKm: 2.0 },
  { from: 'HOTEL PTY', to: 'COLON PORT', taulia: 'GEN000089', price: 200, desc: 'VIP Expense / Personal de MSC', distance: 78, pricePerKm: 2.56 },
  { from: 'HOTEL PTY', to: 'HOSPITAL PTY', taulia: 'ECR000669', price: 60, desc: 'Medical Transport', distance: 8, pricePerKm: 7.5 },
  { from: 'HOTEL PTY', to: 'HOSPITAL COLON', taulia: 'ECR000669', price: 180, desc: 'Medical Transport Inter-city', distance: 75, pricePerKm: 2.4 },
  { from: 'HOTEL PTY', to: 'BOAT LANDING PTY', taulia: 'ECR000669', price: 90, desc: 'Boat Transfer', distance: 12, pricePerKm: 7.5 },
  { from: 'HOTEL PTY', to: 'PTY', taulia: 'CLA00001', price: 85, desc: 'Security guard / Seal check', distance: 5, pricePerKm: 17.0 },
  
  // PTY PORT routes
  { from: 'PTY PORT', to: 'HOTEL PTY', taulia: 'ECR000669', price: 120, desc: 'Crew Members Return' },
  { from: 'PTY PORT', to: 'TOCUMEN AIRPORT', taulia: 'ECR000669', price: 150, desc: 'Port to Airport' },
  { from: 'PTY PORT', to: 'HOTEL RADISSON COLON', taulia: 'ECR000669', price: 170, desc: 'Port to Hotel Colon' },
  { from: 'PTY PORT', to: 'CRISTOBAL PORT', taulia: 'ECR000669', price: 180, desc: 'Port to Port Transfer' },
  { from: 'PTY PORT', to: 'PTY', taulia: 'ECR000669', price: 40, desc: 'Local Transfer' },
  
  // TOCUMEN AIRPORT routes (basado en PDF AG-8215)
  { from: 'TOCUMEN AIRPORT', to: 'CRISTOBAL PORT', taulia: 'ECR000669', price: 85, desc: 'Airport to Cristobal Port', distance: 95, pricePerKm: 0.89 },
  { from: 'TOCUMEN AIRPORT', to: 'HOTEL PTY', taulia: 'ECR000669', price: 85, desc: 'Airport to Hotel PTY' },
  { from: 'TOCUMEN AIRPORT', to: 'PTY PORT', taulia: 'ECR000669', price: 150, desc: 'Airport to PTY Port' },
  { from: 'TOCUMEN AIRPORT', to: 'HOTEL RADISSON COLON', taulia: 'ECR000669', price: 120, desc: 'Airport to Hotel Colon' },
  
  // CRISTOBAL PORT routes (basado en PDF AG-8215)
  { from: 'CRISTOBAL PORT', to: 'HOTEL RADISSON COLON', taulia: 'ECR000669', price: 35, desc: 'Port to Hotel Local', distance: 10, pricePerKm: 3.5 },
  { from: 'CRISTOBAL PORT', to: 'TOCUMEN AIRPORT', taulia: 'ECR000669', price: 85, desc: 'Cristobal to Airport' },
  { from: 'CRISTOBAL PORT', to: 'HOTEL PTY', taulia: 'ECR000669', price: 200, desc: 'Cristobal to PTY Hotel' },
  { from: 'CRISTOBAL PORT', to: 'PTY PORT', taulia: 'ECR000669', price: 180, desc: 'Port to Port Transfer' },
  
  // HOTEL RADISSON COLON routes
  { from: 'HOTEL RADISSON COLON', to: 'CRISTOBAL PORT', taulia: 'ECR000669', price: 35, desc: 'Hotel to Port Local' },
  { from: 'HOTEL RADISSON COLON', to: 'HOTEL PTY', taulia: 'ECR000669', price: 150, desc: 'Hotel to Hotel Transfer' },
  { from: 'HOTEL RADISSON COLON', to: 'PTY PORT', taulia: 'ECR000669', price: 170, desc: 'Hotel Colon to PTY Port' },
  { from: 'HOTEL RADISSON COLON', to: 'TOCUMEN AIRPORT', taulia: 'ECR000669', price: 120, desc: 'Hotel Colon to Airport' },
  { from: 'HOTEL RADISSON COLON', to: 'COLON PORT', taulia: 'ECR000669', price: 60, desc: 'Local Transfer' },
  
  // COLON PORT routes
  { from: 'COLON PORT', to: 'HOTEL PTY', taulia: 'ECR000669', price: 200, desc: 'Port to Hotel Inter-city' },
  { from: 'COLON PORT', to: 'PTY PORT', taulia: 'ECR000669', price: 180, desc: 'Port to Port' },
  { from: 'COLON PORT', to: 'HOTEL RADISSON COLON', taulia: 'ECR000669', price: 60, desc: 'Port to Hotel Local' },
  { from: 'COLON PORT', to: 'CRISTOBAL PORT', taulia: 'ECR000669', price: 40, desc: 'Port to Port Local' },
  
  // HOSPITAL routes
  { from: 'HOSPITAL PTY', to: 'HOTEL PTY', taulia: 'ECR000669', price: 60, desc: 'Medical Return' },
  { from: 'HOSPITAL PTY', to: 'PTY PORT', taulia: 'ECR000669', price: 80, desc: 'Medical to Port' },
  { from: 'HOSPITAL COLON', to: 'HOTEL RADISSON COLON', taulia: 'ECR000669', price: 50, desc: 'Medical Return' },
  { from: 'HOSPITAL COLON', to: 'CRISTOBAL PORT', taulia: 'ECR000669', price: 70, desc: 'Medical to Port' },
  
  // Special Services (códigos SAP especiales)
  { from: 'ANY', to: 'ANY', taulia: 'CLA00001', price: 85, desc: 'Security guard / Seal check' },
  { from: 'ANY', to: 'ANY', taulia: 'ECR001253', price: 150, desc: 'Reefer Technicians' },
  { from: 'ANY', to: 'ANY', taulia: 'GEN000089', price: 200, desc: 'VIP Expense / Personal de MSC' },
];

// Análisis de patrones de precio
const analyzePricingPatterns = () => {
  console.log('\n🔍 ANÁLISIS DE PATRONES DE PRECIOS');
  console.log('=====================================\n');
  
  // Calcular estadísticas de precio por km
  const pricesPerKm = routePricingData
    .filter(r => r.distance && r.distance > 0)
    .map(r => ({
      route: `${r.from} → ${r.to}`,
      distance: r.distance,
      price: r.price,
      pricePerKm: (r.price / r.distance).toFixed(2),
      type: r.distance > 50 ? 'Larga distancia' : r.distance > 20 ? 'Media distancia' : 'Corta distancia'
    }));
  
  // Agrupar por tipo de distancia
  const shortDistance = pricesPerKm.filter(p => p.distance <= 20);
  const mediumDistance = pricesPerKm.filter(p => p.distance > 20 && p.distance <= 50);
  const longDistance = pricesPerKm.filter(p => p.distance > 50);
  
  console.log('📊 Precio promedio por km según distancia:');
  console.log('-------------------------------------------');
  
  if (shortDistance.length > 0) {
    const avgShort = shortDistance.reduce((sum, p) => sum + parseFloat(p.pricePerKm), 0) / shortDistance.length;
    console.log(`🚗 Corta distancia (≤20 km): $${avgShort.toFixed(2)}/km`);
    console.log('   Rutas:');
    shortDistance.forEach(r => {
      console.log(`   - ${r.route}: ${r.distance} km, $${r.price} ($${r.pricePerKm}/km)`);
    });
  }
  
  if (mediumDistance.length > 0) {
    const avgMedium = mediumDistance.reduce((sum, p) => sum + parseFloat(p.pricePerKm), 0) / mediumDistance.length;
    console.log(`\n🚐 Media distancia (20-50 km): $${avgMedium.toFixed(2)}/km`);
    console.log('   Rutas:');
    mediumDistance.forEach(r => {
      console.log(`   - ${r.route}: ${r.distance} km, $${r.price} ($${r.pricePerKm}/km)`);
    });
  }
  
  if (longDistance.length > 0) {
    const avgLong = longDistance.reduce((sum, p) => sum + parseFloat(p.pricePerKm), 0) / longDistance.length;
    console.log(`\n🚌 Larga distancia (>50 km): $${avgLong.toFixed(2)}/km`);
    console.log('   Rutas:');
    longDistance.forEach(r => {
      console.log(`   - ${r.route}: ${r.distance} km, $${r.price} ($${r.pricePerKm}/km)`);
    });
  }
  
  // Identificar patrones
  console.log('\n🔎 PATRONES IDENTIFICADOS:');
  console.log('---------------------------');
  console.log('1. ❌ NO hay correlación directa precio/distancia');
  console.log('2. ✅ Precio DISMINUYE por km en distancias largas (economía de escala)');
  console.log('3. ✅ Rutas cortas tienen precio base mínimo (~$35-60) independiente de km');
  console.log('4. ✅ Factores adicionales afectan el precio:');
  console.log('   - Tipo de servicio (VIP, Medical, Security)');
  console.log('   - Ubicación (aeropuerto tiene tarifa especial)');
  console.log('   - Complejidad de la ruta (inter-city vs local)');
  console.log('   - Código SAP/Taulia (diferentes tarifas por cliente)');
  
  console.log('\n💡 MODELO DE PRECIO SUGERIDO:');
  console.log('-------------------------------');
  console.log('Precio = MAX(Precio_Base, Precio_Calculado)');
  console.log('Precio_Calculado = Tarifa_Base + (Distancia * Tarifa_Por_Km) + Ajustes');
  console.log('\nDonde:');
  console.log('- Precio_Base = $35 (mínimo)');
  console.log('- Tarifa_Base = $25 (costo fijo)');
  console.log('- Tarifa_Por_Km:');
  console.log('  * 0-20 km: $4.00/km');
  console.log('  * 21-50 km: $2.50/km');
  console.log('  * >50 km: $1.50/km');
  console.log('- Ajustes:');
  console.log('  * Aeropuerto: +20%');
  console.log('  * Servicio médico: +15%');
  console.log('  * VIP/Security: +30%');
  console.log('  * Tiempo de espera: $10/hora');
  console.log('  * Pasajeros extra: $20/persona');
  
  console.log('\n=====================================\n');
};

const seedAgencyRoutePricing = async () => {
  try {
    // Conectar a MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/barcos';
    console.log('🔗 Conectando a MongoDB...');
    
    await mongoose.connect(mongoUri);
    console.log('✅ Conectado a MongoDB');
    
    // Verificar si ya existen rutas
    const existingCount = await AgencyCatalog.countDocuments({ type: 'route_pricing' });
    
    if (existingCount > 0) {
      console.log(`⚠️ Ya existen ${existingCount} rutas de precios. Eliminando para reemplazar...`);
      await AgencyCatalog.deleteMany({ type: 'route_pricing' });
      console.log('🗑️ Rutas anteriores eliminadas');
    }
    
    // Crear documentos de pricing
    console.log('📝 Creando rutas de precios de Agency...');
    const pricingDocs = routePricingData.map(route => ({
      type: 'route_pricing',
      name: `${route.from} → ${route.to}`,
      code: route.taulia,
      description: route.desc,
      metadata: {
        fromLocation: route.from,
        toLocation: route.to,
        basePrice: route.price,
        pricePerPerson: 20,      // $20 por pasajero adicional
        waitingTimePrice: 10,     // $10 por hora de espera
        currency: 'USD'
      },
      isActive: true
    }));
    
    // Insertar en batch
    const result = await AgencyCatalog.insertMany(pricingDocs);
    console.log(`✅ ${result.length} rutas de precios creadas exitosamente`);
    
    // Mostrar resumen
    console.log('\n📊 Resumen de rutas creadas:');
    console.log('================================');
    
    const groupedByOrigin = routePricingData.reduce((acc, route) => {
      if (!acc[route.from]) acc[route.from] = [];
      acc[route.from].push(route);
      return acc;
    }, {} as Record<string, typeof routePricingData>);
    
    Object.entries(groupedByOrigin).forEach(([origin, routes]) => {
      console.log(`\n📍 Desde ${origin}:`);
      routes.forEach(route => {
        console.log(`   → ${route.to.padEnd(20)} $${route.price.toString().padEnd(6)} [${route.taulia}] ${route.desc}`);
      });
    });
    
    console.log('\n================================');
    console.log('✅ Seed completado exitosamente');
    console.log(`📊 Total de rutas: ${pricingDocs.length}`);
    
    // Ejecutar análisis de patrones
    analyzePricingPatterns();
    
    // Desconectar
    await mongoose.disconnect();
    console.log('👋 Desconectado de MongoDB');
    
  } catch (error) {
    console.error('❌ Error en seed:', error);
    process.exit(1);
  }
};

// Ejecutar el seed
seedAgencyRoutePricing()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });