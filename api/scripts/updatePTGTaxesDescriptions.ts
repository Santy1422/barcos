import mongoose from 'mongoose';
import { Service } from '../src/database/schemas/servicesSchema';
import dotenv from 'dotenv';

dotenv.config();

async function updatePTGTaxesDescriptions() {
  try {
    // Conectar a la base de datos
    const mongoUri = process.env.USER_MONGO_URI || 'mongodb://localhost:27017/barcos';
    await mongoose.connect(mongoUri);
    console.log('✅ Conectado a MongoDB');

    // Buscar impuestos PTG existentes
    const existingTaxes = await Service.find({
      module: 'trucking',
      name: { $in: ['Customs', 'Administration Fee'] }
    });

    if (existingTaxes.length === 0) {
      console.log('⚠️  No se encontraron impuestos PTG para actualizar');
      await mongoose.disconnect();
      return;
    }

    console.log(`📋 Encontrados ${existingTaxes.length} impuestos PTG para actualizar:`);
    existingTaxes.forEach(tax => {
      console.log(`   - ${tax.name}: ${tax.description} (precio: $${tax.price || 0})`);
    });

    // Actualizar descripciones
    let updatedCount = 0;
    for (const tax of existingTaxes) {
      try {
        let newDescription = '';
        
        if (tax.name === 'Customs') {
          newDescription = 'Impuesto de aduana para el módulo de Trucking';
        } else if (tax.name === 'Administration Fee') {
          newDescription = 'Tarifa administrativa para el módulo de Trucking';
        }

        if (newDescription && newDescription !== tax.description) {
          await Service.findByIdAndUpdate(tax._id, {
            description: newDescription
          });
          console.log(`✅ ${tax.name} actualizado: "${tax.description}" → "${newDescription}"`);
          updatedCount++;
        } else {
          console.log(`ℹ️  ${tax.name} ya tiene descripción correcta: "${tax.description}"`);
        }
      } catch (error) {
        console.error(`❌ Error actualizando ${tax.name}:`, error);
      }
    }

    console.log(`\n🎯 Actualización completada: ${updatedCount} impuestos actualizados`);

    // Mostrar estado final
    const finalTaxes = await Service.find({
      module: 'trucking',
      name: { $in: ['Customs', 'Administration Fee'] }
    });

    console.log('\n📊 Estado final de los impuestos PTG:');
    finalTaxes.forEach(tax => {
      console.log(`   - ${tax.name}: $${tax.price || 0} (${tax.description})`);
    });

  } catch (error) {
    console.error('❌ Error durante la actualización:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado de MongoDB');
  }
}

// Ejecutar el script si se llama directamente
if (require.main === module) {
  updatePTGTaxesDescriptions();
}

export { updatePTGTaxesDescriptions };
