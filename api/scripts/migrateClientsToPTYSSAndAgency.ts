import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

// Conexión a la base de datos
const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/barcos';
    await mongoose.connect(mongoUri);
    console.log('✅ Conectado a MongoDB');
  } catch (error) {
    console.error('❌ Error al conectar a MongoDB:', error);
    process.exit(1);
  }
};

// Schema de clientes (simplificado para la migración)
const clientsSchema = new mongoose.Schema({
  type: String,
  fullName: String,
  documentType: String,
  documentNumber: String,
  address: String,
  companyName: String,
  name: String,
  ruc: String,
  contactName: String,
  email: String,
  phone: String,
  sapCode: String,
  isActive: Boolean,
  module: [String], // Array para soportar múltiples módulos
  createdBy: mongoose.Schema.Types.ObjectId,
  createdAt: Date,
  updatedAt: Date
}, { timestamps: false });

const Clients = mongoose.model('clients', clientsSchema, 'clients');

async function migrateClients() {
  try {
    console.log('🚀 Iniciando migración de clientes a PTYSS y Agency...\n');

    // Buscar todos los clientes
    const allClients = await Clients.find({});
    console.log(`📊 Total de clientes encontrados: ${allClients.length}\n`);

    let updated = 0;
    let skipped = 0;
    let errors = 0;

    for (const client of allClients) {
      try {
        // Obtener el campo module actual
        const currentModule = client.module;

        // Verificar si ya tiene los módulos PTYSS y Agency
        if (Array.isArray(currentModule)) {
          const hasPTYSS = currentModule.includes('ptyss');
          const hasAgency = currentModule.includes('agency');

          if (hasPTYSS && hasAgency) {
            console.log(`⏭️  Cliente ${client.sapCode || client._id} ya tiene ambos módulos. Saltado.`);
            skipped++;
            continue;
          }

          // Si tiene algunos módulos pero no ambos, agregar los faltantes
          const modulesToAdd = [];
          if (!hasPTYSS) modulesToAdd.push('ptyss');
          if (!hasAgency) modulesToAdd.push('agency');

          await Clients.updateOne(
            { _id: client._id },
            { 
              $set: { 
                module: [...currentModule, ...modulesToAdd],
                updatedAt: new Date()
              }
            }
          );
          console.log(`✅ Cliente ${client.sapCode || client._id}: ${modulesToAdd.join(', ')} agregados. Módulos actuales: [${[...currentModule, ...modulesToAdd].join(', ')}]`);
          updated++;
        } else if (typeof currentModule === 'string') {
          // Si es un string, convertirlo a array con ambos módulos
          await Clients.updateOne(
            { _id: client._id },
            { 
              $set: { 
                module: [currentModule, 'ptyss', 'agency'].filter((v, i, a) => a.indexOf(v) === i), // Evitar duplicados
                updatedAt: new Date()
              }
            }
          );
          const newModules = [currentModule, 'ptyss', 'agency'].filter((v, i, a) => a.indexOf(v) === i);
          console.log(`✅ Cliente ${client.sapCode || client._id}: Convertido de string a array. Módulos: [${newModules.join(', ')}]`);
          updated++;
        } else if (!currentModule || currentModule === null) {
          // Si no tiene módulo, agregar ambos
          await Clients.updateOne(
            { _id: client._id },
            { 
              $set: { 
                module: ['ptyss', 'agency'],
                updatedAt: new Date()
              }
            }
          );
          console.log(`✅ Cliente ${client.sapCode || client._id}: Agregados módulos [ptyss, agency]`);
          updated++;
        }
      } catch (error: any) {
        console.error(`❌ Error actualizando cliente ${client.sapCode || client._id}:`, error.message);
        errors++;
      }
    }

    console.log('\n📊 Resumen de la migración:');
    console.log(`   ✅ Actualizados: ${updated}`);
    console.log(`   ⏭️  Saltados: ${skipped}`);
    console.log(`   ❌ Errores: ${errors}`);
    console.log(`   📝 Total procesados: ${allClients.length}\n`);

  } catch (error) {
    console.error('❌ Error en la migración:', error);
    throw error;
  }
}

async function main() {
  try {
    await connectDB();
    await migrateClients();
    console.log('✅ Migración completada exitosamente');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Desconectado de MongoDB');
  }
}

// Ejecutar la migración
main();

