import axios from 'axios';

// Rutas predefinidas para cliente 1 basadas en la tabla "TARIFAS / cliente 1"
const PREDEFINED_ROUTES_CLIENT_1 = [
  // Rutas desde COLON
  { clientName: 'cliente 1', from: "COLON", to: "ANTON", price: 0 },
  { clientName: 'cliente 1', from: "COLON", to: "PENONOME", price: 0 },
  { clientName: 'cliente 1', from: "COLON", to: "AGUADULCE", price: 0 },
  { clientName: 'cliente 1', from: "COLON", to: "SANTIAGO", price: 0 },
  { clientName: 'cliente 1', from: "COLON", to: "VERAGUAS", price: 0 },
  { clientName: 'cliente 1', from: "COLON", to: "CHITRE", price: 0 },
  { clientName: 'cliente 1', from: "COLON", to: "HERRERA", price: 0 },
  { clientName: 'cliente 1', from: "COLON", to: "LOS SANTOS", price: 0 },
  { clientName: 'cliente 1', from: "COLON", to: "LAS TABLAS", price: 0 },
  { clientName: 'cliente 1', from: "COLON", to: "DAVID", price: 0 },
  { clientName: 'cliente 1', from: "COLON", to: "VOLCAN", price: 0 },
  { clientName: 'cliente 1', from: "COLON", to: "GUGABA", price: 0 },
  { clientName: 'cliente 1', from: "COLON", to: "PASO CANOA", price: 0 },
  
  // Rutas desde PSA
  { clientName: 'cliente 1', from: "PSA", to: "SABANITA", price: 0 },
  { clientName: 'cliente 1', from: "PSA", to: "PORTOBELO", price: 0 },
  { clientName: 'cliente 1', from: "PSA", to: "BUENAS VISTA", price: 0 },
  { clientName: 'cliente 1', from: "PSA", to: "CHILIBRE", price: 0 },
  { clientName: 'cliente 1', from: "PSA", to: "LAS CUMBRES", price: 0 },
  { clientName: 'cliente 1', from: "PSA", to: "LOS ANDES", price: 0 },
  { clientName: 'cliente 1', from: "PSA", to: "SAN MIGUELITO", price: 0 },
  { clientName: 'cliente 1', from: "PSA", to: "CIUDAD PANAMA", price: 0 },
  { clientName: 'cliente 1', from: "PSA", to: "RIO ABAJO", price: 0 },
  { clientName: 'cliente 1', from: "PSA", to: "VILLA LUCRE", price: 0 },
  { clientName: 'cliente 1', from: "PSA", to: "TOCUMEN", price: 0 },
  { clientName: 'cliente 1', from: "PSA", to: "24 DICIEMBRE", price: 0 },
  { clientName: 'cliente 1', from: "PSA", to: "PACORA", price: 0 },
  { clientName: 'cliente 1', from: "PSA", to: "FELIPILLO", price: 0 },
  { clientName: 'cliente 1', from: "PSA", to: "METETI", price: 0 },
  { clientName: 'cliente 1', from: "PSA", to: "DARIEN", price: 0 }
];

async function seedPTYSSLocalRoutesAPI() {
  try {
    const baseURL = process.env.API_BASE_URL || 'http://localhost:8080';
    console.log(`🔗 Conectando a la API en: ${baseURL}`);

    // Verificar que la API esté funcionando
    try {
      await axios.get(`${baseURL}/api/health`);
      console.log('✅ API está funcionando');
    } catch (error) {
      console.log('⚠️ No se pudo verificar el estado de la API, continuando...');
    }

    let successCount = 0;
    let errorCount = 0;

    console.log(`📝 Ejecutando seed de rutas para cliente 1...`);

    try {
      const response = await axios.post(`${baseURL}/api/seed/ptyss-local-routes`, {}, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 30000 // 30 segundos de timeout para el seed completo
      });

      if (response.status === 200) {
        console.log(`✅ Seed completado exitosamente!`);
        console.log(`📊 Respuesta de la API:`, JSON.stringify(response.data, null, 2));
        
        // La función response envuelve el payload en { error: false, payload: ... }
        const payload = response.data.payload;
        if (payload && payload.data && payload.data.totalRoutes) {
          console.log(`📊 Resumen:`);
          console.log(`  - Total de rutas: ${payload.data.totalRoutes}`);
          console.log(`  - Rutas desde COLON: ${payload.data.colonRoutes}`);
          console.log(`  - Rutas desde PSA: ${payload.data.psaRoutes}`);
          successCount = payload.data.totalRoutes;
        } else {
          console.log(`⚠️ Respuesta recibida pero sin datos de resumen`);
          console.log(`📋 Payload recibido:`, payload);
          successCount = 1; // Asumir que funcionó si no hay error
        }
      }
    } catch (error: any) {
      errorCount++;
      console.log(`❌ Error durante el seed:`, error.response?.data?.message || error.message);
    }

    console.log('\n📊 Resumen del seed:');
    console.log(`- Rutas creadas exitosamente: ${successCount}`);
    console.log(`- Errores: ${errorCount}`);

    if (successCount > 0) {
      console.log('\n🎉 Seed completado exitosamente!');
    } else {
      console.log('\n⚠️ No se pudieron crear rutas. Verifica que:');
      console.log('1. El backend esté ejecutándose en el puerto 8080');
      console.log('2. La API esté funcionando correctamente');
      console.log('3. La base de datos esté conectada');
    }

  } catch (error) {
    console.error('❌ Error durante el seed:', error);
  }
}

// Ejecutar el seed si se llama directamente
if (require.main === module) {
  seedPTYSSLocalRoutesAPI();
}

export default seedPTYSSLocalRoutesAPI; 