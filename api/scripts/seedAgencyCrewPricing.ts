/**
 * Script para poblar la configuración de precios de Agency (CREW)
 * Basado en los requisitos del documento SAP
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Cargar variables de entorno
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Importar el modelo
import AgencyPricingConfig from '../src/database/schemas/agencyPricingConfigSchema';

const crewPricingConfig = {
  name: 'Agency Crew Pricing 2024',
  code: 'CREW_PRICING_2024',
  description: 'Configuración de precios para servicios de transporte de tripulación',
  
  // Precios base
  minimumPrice: 35,
  baseFee: 25,
  
  // Tarifas por cantidad de tripulantes
  crewRates: [
    {
      minCrew: 1,
      maxCrew: 3,
      rateMultiplier: 1.0,
      description: '1-3 personas - Tarifa estándar'
    },
    {
      minCrew: 4,
      maxCrew: 7,
      rateMultiplier: 1.5,
      description: '4-7 personas - Vehículo mediano'
    },
    {
      minCrew: 8,
      maxCrew: 99,
      rateMultiplier: 2.0,
      description: '8+ personas - Vehículo grande/múltiple'
    }
  ],
  
  // Tarifas por distancia
  distanceRates: [
    {
      minKm: 0,
      maxKm: 20,
      ratePerKm: 4.0
    },
    {
      minKm: 21,
      maxKm: 50,
      ratePerKm: 2.5
    },
    {
      minKm: 51,
      maxKm: 9999,
      ratePerKm: 1.5
    }
  ],
  
  // Ajustes por tipo de servicio
  serviceAdjustments: {
    airport: { type: 'percentage', value: 20 },
    medical: { type: 'percentage', value: 15 },
    vip: { type: 'percentage', value: 30 },
    security: { type: 'percentage', value: 25 },
    emergency: { type: 'percentage', value: 50 },
    weekend: { type: 'percentage', value: 15 },
    nightTime: { type: 'percentage', value: 20 }
  },
  
  // Cargos adicionales
  additionalCharges: {
    waitingHourRate: 10,
    extraPassengerRate: 20,
    luggageRate: 5,
    tollsIncluded: false
  },
  
  // Códigos SAP/Taulia y sus ajustes
  sapCodeAdjustments: [
    {
      code: 'ECR000669',
      name: 'Crew Members Transfer',
      adjustmentType: 'multiplier',
      adjustmentValue: 1.0,
      priority: 1
    },
    {
      code: 'ECR001253',
      name: 'Reefer Technicians',
      adjustmentType: 'percentage',
      adjustmentValue: 10,
      priority: 2
    },
    {
      code: 'GEN000089',
      name: 'VIP Expense / Personal de MSC',
      adjustmentType: 'percentage',
      adjustmentValue: 30,
      priority: 3
    },
    {
      code: 'CLA00001',
      name: 'Security guard / Seal check',
      adjustmentType: 'percentage',
      adjustmentValue: 25,
      priority: 4
    },
    {
      code: 'SHP242',
      name: 'Shipping Service',
      adjustmentType: 'multiplier',
      adjustmentValue: 1.0,
      priority: 5
    },
    {
      code: 'TRK137',
      name: 'Transport Service',
      adjustmentType: 'multiplier',
      adjustmentValue: 1.0,
      priority: 6
    }
  ],
  
  // Rutas fijas con precios específicos (incluye roundtrip)
  fixedRoutes: [
    // HOTEL PTY routes
    {
      from: 'HOTEL PTY',
      to: 'PTY PORT',
      leg: 'PTY-PORT',
      price: 120,
      roundtripPrice: 200,
      roundtripMultiplier: 1.67,
      tauliaCode: 'ECR000669',
      sapCode: 'TRK137'
    },
    {
      from: 'HOTEL PTY',
      to: 'TOCUMEN AIRPORT',
      leg: 'PTY-AIRPORT',
      price: 85,
      roundtripPrice: 150,
      roundtripMultiplier: 1.76,
      tauliaCode: 'ECR000669',
      sapCode: 'TRK137'
    },
    {
      from: 'HOTEL PTY',
      to: 'CRISTOBAL PORT',
      leg: 'PTY-CRISTOBAL',
      price: 200,
      roundtripPrice: 350,
      roundtripMultiplier: 1.75,
      tauliaCode: 'ECR000669',
      sapCode: 'TRK137'
    },
    {
      from: 'HOTEL PTY',
      to: 'COLON PORT',
      leg: 'PTY-COLON',
      price: 200,
      roundtripPrice: 350,
      roundtripMultiplier: 1.75,
      tauliaCode: 'GEN000089',
      sapCode: 'TRK137'
    },
    
    // TOCUMEN AIRPORT routes
    {
      from: 'TOCUMEN AIRPORT',
      to: 'CRISTOBAL PORT',
      leg: 'AIRPORT-CRISTOBAL',
      price: 85,
      roundtripPrice: 150,
      roundtripMultiplier: 1.76,
      tauliaCode: 'ECR000669',
      sapCode: 'TRK137'
    },
    {
      from: 'TOCUMEN AIRPORT',
      to: 'HOTEL PTY',
      leg: 'AIRPORT-PTY',
      price: 85,
      roundtripPrice: 150,
      roundtripMultiplier: 1.76,
      tauliaCode: 'ECR000669',
      sapCode: 'TRK137'
    },
    {
      from: 'TOCUMEN AIRPORT',
      to: 'PTY PORT',
      leg: 'AIRPORT-PORT',
      price: 150,
      roundtripPrice: 270,
      roundtripMultiplier: 1.8,
      tauliaCode: 'ECR000669',
      sapCode: 'TRK137'
    },
    
    // CRISTOBAL PORT routes
    {
      from: 'CRISTOBAL PORT',
      to: 'HOTEL RADISSON COLON',
      leg: 'CRISTOBAL-RADISSON',
      price: 35,
      roundtripPrice: 60,
      roundtripMultiplier: 1.71,
      tauliaCode: 'ECR000669',
      sapCode: 'TRK137'
    },
    {
      from: 'CRISTOBAL PORT',
      to: 'TOCUMEN AIRPORT',
      leg: 'CRISTOBAL-AIRPORT',
      price: 85,
      roundtripPrice: 150,
      roundtripMultiplier: 1.76,
      tauliaCode: 'ECR000669',
      sapCode: 'TRK137'
    },
    
    // Medical routes
    {
      from: 'HOSPITAL PTY',
      to: 'HOTEL PTY',
      leg: 'MEDICAL-PTY',
      price: 60,
      roundtripPrice: 100,
      roundtripMultiplier: 1.67,
      tauliaCode: 'ECR000669',
      sapCode: 'SHP242'
    },
    {
      from: 'HOSPITAL PTY',
      to: 'PTY PORT',
      leg: 'MEDICAL-PORT',
      price: 80,
      roundtripPrice: 140,
      roundtripMultiplier: 1.75,
      tauliaCode: 'ECR000669',
      sapCode: 'SHP242'
    }
  ],
  
  // Descuentos
  discounts: {
    volumeDiscounts: [
      {
        minServices: 10,
        maxServices: 20,
        discountPercentage: 5
      },
      {
        minServices: 21,
        maxServices: 50,
        discountPercentage: 10
      },
      {
        minServices: 51,
        maxServices: 9999,
        discountPercentage: 15
      }
    ]
  },
  
  // Estado
  isActive: true,
  isDefault: true,
  effectiveFrom: new Date('2024-01-01'),
  version: 1
};

const seedAgencyCrewPricing = async () => {
  try {
    // Conectar a MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/barcos';
    console.log('🔗 Conectando a MongoDB...');
    
    await mongoose.connect(mongoUri);
    console.log('✅ Conectado a MongoDB');
    
    // Verificar si ya existe configuración
    const existingConfig = await AgencyPricingConfig.findOne({ code: 'CREW_PRICING_2024' });
    
    if (existingConfig) {
      console.log('⚠️ Ya existe configuración. Actualizando...');
      await AgencyPricingConfig.findByIdAndUpdate(existingConfig._id, crewPricingConfig);
      console.log('✅ Configuración actualizada');
    } else {
      // Crear nueva configuración
      const newConfig = new AgencyPricingConfig(crewPricingConfig);
      await newConfig.save();
      console.log('✅ Nueva configuración creada');
    }
    
    // Mostrar resumen
    console.log('\n📊 Configuración de Precios CREW:');
    console.log('=====================================');
    console.log('\n📦 Tarifas por cantidad de tripulantes:');
    crewPricingConfig.crewRates.forEach(rate => {
      console.log(`   ${rate.minCrew}-${rate.maxCrew} personas: x${rate.rateMultiplier} - ${rate.description}`);
    });
    
    console.log('\n🚗 Tarifas por distancia:');
    crewPricingConfig.distanceRates.forEach(rate => {
      console.log(`   ${rate.minKm}-${rate.maxKm} km: $${rate.ratePerKm}/km`);
    });
    
    console.log('\n🛣️ Rutas fijas principales:');
    crewPricingConfig.fixedRoutes.slice(0, 10).forEach(route => {
      console.log(`   ${route.from} → ${route.to}: $${route.price} (Roundtrip: $${route.roundtripPrice})`);
    });
    
    console.log('\n📋 Códigos SAP/Taulia:');
    crewPricingConfig.sapCodeAdjustments.forEach(code => {
      console.log(`   ${code.code}: ${code.name} - Ajuste: ${code.adjustmentValue}`);
    });
    
    console.log('\n=====================================');
    console.log('✅ Configuración de precios CREW completada');
    
    // Desconectar
    await mongoose.disconnect();
    console.log('👋 Desconectado de MongoDB');
    
  } catch (error) {
    console.error('❌ Error en seed:', error);
    process.exit(1);
  }
};

// Ejecutar el seed
seedAgencyCrewPricing()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });