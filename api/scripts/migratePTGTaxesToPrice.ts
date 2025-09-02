import mongoose from 'mongoose';
import { Service } from '../src/database/schemas/servicesSchema';
import dotenv from 'dotenv';

dotenv.config();

async function migratePTGTaxesToPrice() {
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
      console.log('⚠️  No se encontraron impuestos PTG para migrar');
      await mongoose.disconnect();
      return;
    }

    console.log(`📋 Encontrados ${existingTaxes.length} impuestos PTG para migrar:`);
    existingTaxes.forEach(tax => {
      console.log(`   - ${tax.name}: ${tax.description} (precio actual: $${tax.price || 0})`);
    });

    // Actualizar cada impuesto
    let updatedCount = 0;
    for (const tax of existingTaxes) {
      try {
        // Si no tiene campo price, crearlo
        if (tax.price === undefined) {
          // Intentar extraer precio del campo description si es un número
          let newPrice = 0;
          if (tax.description && !isNaN(parseFloat(tax.description))) {
            newPrice = parseFloat(tax.description);
          }

          // Actualizar descripción y agregar precio
          const updateData: any = {
            price: newPrice
          };

          // Solo actualizar descripción si era un número
          if (newPrice > 0) {
            if (tax.name === 'Customs') {
              updateData.description = 'Impuesto de aduana para el módulo de Trucking';
            } else if (tax.name === 'Administration Fee') {
              updateData.description = 'Tarifa administrativa para el módulo de Trucking';
            }
          }

          await Service.findByIdAndUpdate(tax._id, updateData);
          console.log(`✅ ${tax.name} migrado: precio = $${newPrice}`);
          updatedCount++;
        } else {
          console.log(`ℹ️  ${tax.name} ya tiene campo price: $${tax.price}`);
        }
      } catch (error) {
        console.error(`❌ Error migrando ${tax.name}:`, error);
      }
    }

    console.log(`\n🎯 Migración completada: ${updatedCount} impuestos actualizados`);

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
    console.error('❌ Error durante la migración:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado de MongoDB');
  }
}

// Ejecutar el script si se llama directamente
if (require.main === module) {
  migratePTGTaxesToPrice();
}

export { migratePTGTaxesToPrice };
