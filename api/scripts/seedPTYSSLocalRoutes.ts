import mongoose from 'mongoose';
import dotenv from 'dotenv';
import ptyssLocalRouteSchema from '../src/database/schemas/ptyssLocalRouteSchema';

// Cargar variables de entorno
dotenv.config();

const PTYSSLocalRoute = mongoose.model('PTYSSLocalRoute', ptyssLocalRouteSchema);

// Rutas predefinidas para esquema rutas 1 basadas en la tabla "TARIFAS / cliente 1"
const PREDEFINED_ROUTES_SCHEMA_1 = [
  // Rutas desde COLON
  { clientName: 'esquema rutas 1', from: "COLON", to: "ANTON", price: 0 },
  { clientName: 'esquema rutas 1', from: "COLON", to: "PENONOME", price: 0 },
  { clientName: 'esquema rutas 1', from: "COLON", to: "AGUADULCE", price: 0 },
  { clientName: 'esquema rutas 1', from: "COLON", to: "SANTIAGO", price: 0 },
  { clientName: 'esquema rutas 1', from: "COLON", to: "VERAGUAS", price: 0 },
  { clientName: 'esquema rutas 1', from: "COLON", to: "CHITRE", price: 0 },
  { clientName: 'esquema rutas 1', from: "COLON", to: "HERRERA", price: 0 },
  { clientName: 'esquema rutas 1', from: "COLON", to: "LOS SANTOS", price: 0 },
  { clientName: 'esquema rutas 1', from: "COLON", to: "LAS TABLAS", price: 0 },
  { clientName: 'esquema rutas 1', from: "COLON", to: "DAVID", price: 0 },
  { clientName: 'esquema rutas 1', from: "COLON", to: "VOLCAN", price: 0 },
  { clientName: 'esquema rutas 1', from: "COLON", to: "GUGABA", price: 0 },
  { clientName: 'esquema rutas 1', from: "COLON", to: "PASO CANOA", price: 0 },
  
  // Rutas desde PSA
  { clientName: 'esquema rutas 1', from: "PSA", to: "SABANITA", price: 0 },
  { clientName: 'esquema rutas 1', from: "PSA", to: "PORTOBELO", price: 0 },
  { clientName: 'esquema rutas 1', from: "PSA", to: "BUENAS VISTA", price: 0 },
  { clientName: 'esquema rutas 1', from: "PSA", to: "CHILIBRE", price: 0 },
  { clientName: 'esquema rutas 1', from: "PSA", to: "LAS CUMBRES", price: 0 },
  { clientName: 'esquema rutas 1', from: "PSA", to: "LOS ANDES", price: 0 },
  { clientName: 'esquema rutas 1', from: "PSA", to: "SAN MIGUELITO", price: 0 },
  { clientName: 'esquema rutas 1', from: "PSA", to: "CIUDAD PANAMA", price: 0 },
  { clientName: 'esquema rutas 1', from: "PSA", to: "RIO ABAJO", price: 0 },
  { clientName: 'esquema rutas 1', from: "PSA", to: "VILLA LUCRE", price: 0 },
  { clientName: 'esquema rutas 1', from: "PSA", to: "TOCUMEN", price: 0 },
  { clientName: 'esquema rutas 1', from: "PSA", to: "24 DICIEMBRE", price: 0 },
  { clientName: 'esquema rutas 1', from: "PSA", to: "PACORA", price: 0 },
  { clientName: 'esquema rutas 1', from: "PSA", to: "FELIPILLO", price: 0 },
  { clientName: 'esquema rutas 1', from: "PSA", to: "METETI", price: 0 },
  { clientName: 'esquema rutas 1', from: "PSA", to: "DARIEN", price: 0 }
];

async function seedPTYSSLocalRoutes() {
  try {
    // Conectar a MongoDB usando la misma configuración que el backend
    const mongoUri = process.env.USER_MONGO_URI || 'mongodb://localhost:27017/barcos';
    if (!mongoUri) {
      throw new Error('No se encontró la variable de entorno USER_MONGO_URI');
    }
    
    console.log('🔗 Intentando conectar a MongoDB...');
    console.log(`📡 URI: ${mongoUri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}`); // Ocultar credenciales
    
    await mongoose.connect(mongoUri);
    console.log('✅ Conectado a MongoDB exitosamente');

    // Limpiar rutas existentes para cliente 1
    await PTYSSLocalRoute.deleteMany({ clientName: 'esquema rutas 1' });
    console.log('🗑️ Rutas existentes para cliente 1 eliminadas');

    // Insertar rutas predefinidas
    const routes = await PTYSSLocalRoute.insertMany(PREDEFINED_ROUTES_SCHEMA_1);
    console.log(`✅ ${routes.length} rutas predefinidas insertadas para cliente 1`);

    // Mostrar resumen
    console.log('\n📊 Resumen de rutas insertadas:');
    console.log(`- Cliente: cliente 1`);
    console.log(`- Total de rutas: ${routes.length}`);
    
    const colonRoutes = routes.filter(r => r.from === 'COLON').length;
    const psaRoutes = routes.filter(r => r.from === 'PSA').length;
    console.log(`- Rutas desde COLON: ${colonRoutes}`);
    console.log(`- Rutas desde PSA: ${psaRoutes}`);

    console.log('\n🎉 Seed completado exitosamente!');
  } catch (error) {
    console.error('❌ Error durante el seed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado de MongoDB');
  }
}

// Ejecutar el seed si se llama directamente
if (require.main === module) {
  seedPTYSSLocalRoutes();
}

export default seedPTYSSLocalRoutes; 