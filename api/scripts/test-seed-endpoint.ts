import axios from 'axios';

async function testSeedEndpoint() {
  try {
    const baseURL = 'http://localhost:8080';
    console.log(`🔗 Probando endpoint de seed en: ${baseURL}`);

    // Probar health check primero
    try {
      const healthResponse = await axios.get(`${baseURL}/api/health`);
      console.log('✅ Health check exitoso:', healthResponse.data);
    } catch (error) {
      console.log('❌ Health check falló:', error.message);
    }

    // Probar el endpoint de seed
    console.log('\n📝 Probando endpoint de seed...');
    const response = await axios.post(`${baseURL}/api/seed/ptyss-local-routes`, {}, {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000
    });

    console.log('✅ Respuesta del seed:');
    console.log('Status:', response.status);
    console.log('Headers:', response.headers);
    console.log('Data:', JSON.stringify(response.data, null, 2));

  } catch (error: any) {
    console.error('❌ Error durante la prueba:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
  }
}

// Ejecutar la prueba
testSeedEndpoint(); 