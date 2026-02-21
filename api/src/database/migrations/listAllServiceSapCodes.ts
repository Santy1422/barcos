import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function listAllServiceSapCodes() {
  try {
    console.log('Conectando a MongoDB...');
    const mongoUri = process.env.USER_MONGO_URI || 'mongodb://localhost:27017/barcos';
    await mongoose.connect(mongoUri);

    const db = mongoose.connection.db;
    const services = await db.collection('servicesapcodes')
      .find({})
      .sort({ module: 1, code: 1 })
      .toArray();

    console.log('');
    console.log('================================================================================');
    console.log('LISTADO DE SERVICIOS SAP MAPEADOS');
    console.log('================================================================================');
    console.log('');

    // Agrupar por módulo
    const byModule: Record<string, any[]> = {};
    services.forEach((s: any) => {
      const mod = s.module || 'sin_modulo';
      if (!byModule[mod]) byModule[mod] = [];
      byModule[mod].push(s);
    });

    // Mostrar por módulo
    const moduleOrder = ['trucking', 'ptyss', 'agency', 'shipchandler', 'all', 'sin_modulo'];

    moduleOrder.forEach(mod => {
      if (!byModule[mod]) return;

      console.log('');
      console.log('------------------------------------------------------------');
      console.log(`MODULO: ${mod.toUpperCase()}`);
      console.log('------------------------------------------------------------');
      console.log('');

      byModule[mod].forEach((s: any) => {
        const name = s.name || s.description || 'Sin descripcion';
        console.log(`${mod.toUpperCase()} -> ${name} -> ${s.code}`);
      });
    });

    // Resumen
    console.log('');
    console.log('================================================================================');
    console.log('RESUMEN');
    console.log('================================================================================');

    let total = 0;
    moduleOrder.forEach(mod => {
      if (byModule[mod]) {
        console.log(`${mod.toUpperCase()}: ${byModule[mod].length} servicios`);
        total += byModule[mod].length;
      }
    });
    console.log(`TOTAL: ${total} servicios`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

listAllServiceSapCodes();
