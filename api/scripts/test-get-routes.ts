import axios from 'axios';

async function testGetRoutes() {
  try {
    const baseURL = 'http://localhost:8080';
    console.log(`🔗 Probando endpoint GET de rutas locales en: ${baseURL}`);

    // Probar el endpoint de obtener rutas
    console.log('\n📝 Obteniendo rutas locales...');
    const response = await axios.get(`${baseURL}/api/ptyss-local-routes`, {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 10000
    });

    console.log('✅ Respuesta del GET:');
    console.log('Status:', response.status);
    console.log('Data:', JSON.stringify(response.data, null, 2));

    if (response.data.payload && response.data.payload.data) {
      const routes = response.data.payload.data;
      console.log(`\n📊 Total de rutas encontradas: ${routes.length}`);
      
      // Agrupar por cliente
      const routesByClient = routes.reduce((acc: any, route: any) => {
        if (!acc[route.clientName]) {
          acc[route.clientName] = [];
        }
        acc[route.clientName].push(route);
        return acc;
      }, {});

      Object.keys(routesByClient).forEach(client => {
        console.log(`\n👤 ${client}: ${routesByClient[client].length} rutas`);
        routesByClient[client].forEach((route: any) => {
          console.log(`  - ${route.from} → ${route.to} ($${route.price})`);
        });
      });
    }

  } catch (error: any) {
    console.error('❌ Error durante la prueba:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
  }
}

// Ejecutar la prueba
testGetRoutes(); 