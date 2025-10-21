/**
 * Script para cargar masivamente vessels en el catálogo de Agency
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Cargar variables de entorno desde el directorio raíz del proyecto API
// Usar process.cwd() para obtener el directorio actual donde se ejecuta el script
const envPath = path.join(process.cwd(), '.env');
console.log('🔍 Cargando .env desde:', envPath);
dotenv.config({ path: envPath });

// Importar el modelo
const AgencyCatalog = require('../src/database/schemas/agencyCatalogSchema').default;

// Lista de vessels
const vessels = [
  'MSC VIDHI',
  'CONTI MAKALU',
  'MSC ANTONELLA',
  'MSC MANU',
  'MSC ANZU',
  'MSC POLINA',
  'MSC RUBY',
  'JENS MAERSK',
  'MSC YASHI B',
  'SEASPAN BRILLIANCE',
  'POMERENIA SKY',
  'MSC BIANCA',
  'MSC JENNIFER II',
  'VALUE',
  'MSC BALTIC III',
  'MSC RIDA',
  'SEASPAN BELIEF',
  'MSC BEIJING',
  'MSC ANTONIA',
  'MAERSK KOLKATA',
  'CAPE AKRITAS',
  'MSC JULIA R.',
  'MERIDIAN',
  'VALOR',
  'MSC SOFIA PAZ',
  'MSC JEONGMIN',
  'MSC AVNI',
  'SEASPAN BELLWETHER',
  'MSC SHREYA B',
  'MSC PARIS',
  'MSC SILVANA',
  'MSC VAISHNAVI R.',
  'MSC BARI',
  'SEASPAN BEAUTY',
  'JEPPESEN MAERSK',
  'GSL MARIA',
  'MSC NAOMI',
  'NORTHERN MONUMENT',
  'MSC ROMANE',
  'SEASPAN BEYOND',
  'HERMANN SCHULTE',
  'GSL VIOLETTA',
  'MSC ARUSHI R.',
  'MSC CARLOTTA',
  'MSC NITYA B',
  'MSC MICHELA',
  'MSC PERLE',
  'MAERSK MEMPHIS',
  'CONTI ANNAPURNA',
  'MSC RONIT R',
  'MSC ORION',
  'MSC SHUBA B',
  'MSC SIYA B',
  'MAERSK KALAMATA',
  'MSC SASHA',
  'VANTAGE',
  'MSC KATYA R.',
  'MSC KANOKO',
  'MSC ANTIGUA',
  'MSC ALANYA',
  'MSC BRITTANY',
  'HYUNDAI SATURN',
  'MSC MIRELLA',
  'MSC NATASHA',
  'MSC DAMLA',
  'VALIANT',
  'MSC MAXINE',
  'MARCOS V',
  'MSC ELISA',
  'VALENCE',
  'MSC JEWEL',
  'SEAMAX NORWALK',
  'SEASPAN BRAVO',
  'MSC RAPALLO',
  'SAN ANTONIO',
  'MSC VITA',
  'MSC CLEA',
  'MSC SARA ELENA',
  'MSC GISELLE',
  'MSC AINO',
  'MSC VIGO',
  'MARGARETE SCHULTE',
  'SPINEL',
  'COLUMBINE MAERSK',
  'MSC SILVIA',
  'MSC CORUNA',
  'BUXCOAST',
  'GH PAMPERO',
  'ARCHIMIDIS',
  'AGAMEMNON',
  'MSC METHONI',
  'MSC CHLOE',
  'MSC ROCHELLE',
  'MSC CADIZ',
  'AS CLEOPATRA',
  'VEGA VIRGO',
  'MSC BARBARA',
  'MH HAMBURG',
  'NORDIC ANNA'
];

// Determinar la línea naviera basándose en el nombre del vessel
const getShippingLine = (vesselName: string): string => {
  if (vesselName.startsWith('MSC ')) return 'MSC';
  if (vesselName.includes('MAERSK')) return 'MAERSK';
  if (vesselName.includes('SEASPAN')) return 'SEASPAN';
  if (vesselName.includes('CONTI ')) return 'HAPAG-LLOYD';
  if (vesselName.includes('HYUNDAI')) return 'HMM';
  if (vesselName.includes('GSL')) return 'GSL';
  return 'OTHER';
};

const seedAgencyVessels = async () => {
  try {
    // Conectar a MongoDB usando la misma variable de entorno que el backend
    const mongoUri = process.env.USER_MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/barcos';
    
    if (!process.env.USER_MONGO_URI) {
      console.log('⚠️ USER_MONGO_URI no encontrado en .env, usando fallback');
    }
    
    console.log('🔗 Conectando a MongoDB...');
    console.log('📍 URI:', mongoUri.split('@')[1] || mongoUri.substring(0, 30) + '...');
    
    mongoose.set('strictQuery', false);
    await mongoose.connect(mongoUri);
    console.log('✅ Conectado a MongoDB');
    
    // Preparar datos de vessels
    const vesselData = vessels.map(vesselName => ({
      type: 'vessel',
      name: vesselName,
      metadata: {
        shippingLine: getShippingLine(vesselName)
      },
      isActive: true
    }));
    
    // Verificar cuántos vessels ya existen
    const existingVessels = await AgencyCatalog.find({ type: 'vessel' });
    console.log(`\n📊 Vessels existentes en la base de datos: ${existingVessels.length}`);
    
    // Opción 1: Eliminar todos los vessels existentes y crear nuevos
    console.log('\n🗑️ Limpiando vessels existentes...');
    await AgencyCatalog.deleteMany({ type: 'vessel' });
    console.log('✅ Vessels existentes eliminados');
    
    // Insertar vessels
    console.log('\n📝 Insertando vessels...');
    const results = await AgencyCatalog.insertMany(vesselData);
    console.log(`✅ ${results.length} vessels creados exitosamente`);
    
    // Mostrar resumen por línea naviera
    console.log('\n=====================================');
    console.log('📊 RESUMEN POR LÍNEA NAVIERA:');
    console.log('=====================================');
    
    const vesselsByLine: { [key: string]: string[] } = {};
    vesselData.forEach(vessel => {
      const line = vessel.metadata.shippingLine;
      if (!vesselsByLine[line]) {
        vesselsByLine[line] = [];
      }
      vesselsByLine[line].push(vessel.name);
    });
    
    Object.entries(vesselsByLine).forEach(([line, ships]) => {
      console.log(`\n🚢 ${line} (${ships.length} vessels):`);
      ships.forEach(ship => {
        console.log(`   - ${ship}`);
      });
    });
    
    console.log('\n=====================================');
    console.log(`✅ Total de vessels cargados: ${results.length}`);
    console.log('=====================================');
    
    // Desconectar
    await mongoose.disconnect();
    console.log('\n👋 Desconectado de MongoDB');
    
  } catch (error) {
    console.error('❌ Error en seed:', error);
    process.exit(1);
  }
};

// Ejecutar el seed
seedAgencyVessels()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });

