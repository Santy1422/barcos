import mongoose from 'mongoose';
import { Service } from '../src/database/schemas/servicesSchema';
import dotenv from 'dotenv';

dotenv.config();

async function testUpdatePTGTaxPrice() {
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
      console.log('⚠️  No se encontraron impuestos PTG para probar');
      await mongoose.disconnect();
      return;
    }

    console.log(`📋 Estado inicial de los impuestos PTG:`);
    existingTaxes.forEach(tax => {
      console.log(`   - ${tax.name}: $${tax.price || 0} (${tax.description})`);
    });

    // Probar actualización del precio del primer impuesto
    const firstTax = existingTaxes[0];
    const newPrice = (firstTax.price || 0) + 1; // Incrementar en $1
    
    console.log(`\n🧪 Probando actualización de precio para ${firstTax.name}:`);
    console.log(`   Precio actual: $${firstTax.price || 0}`);
    console.log(`   Nuevo precio: $${newPrice}`);

    // Actualizar el precio
    const updatedTax = await Service.findByIdAndUpdate(
      firstTax._id,
      { price: newPrice },
      { new: true, runValidators: true }
    );

    if (updatedTax) {
      console.log(`✅ Precio actualizado exitosamente:`);
      console.log(`   - ${updatedTax.name}: $${updatedTax.price} (${updatedTax.description})`);
      
      // Verificar que el cambio se guardó
      const verificationTax = await Service.findById(firstTax._id);
      if (verificationTax) {
        console.log(`🔍 Verificación en base de datos:`);
        console.log(`   - ${verificationTax.name}: $${verificationTax.price} (${verificationTax.description})`);
        
        if (verificationTax.price === newPrice) {
          console.log(`✅ Verificación exitosa: El precio se guardó correctamente`);
        } else {
          console.log(`❌ Verificación fallida: El precio no se guardó correctamente`);
        }
      }
    } else {
      console.log(`❌ Error: No se pudo actualizar el impuesto`);
    }

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
    console.error('❌ Error durante la prueba:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado de MongoDB');
  }
}

// Ejecutar el script si se llama directamente
if (require.main === module) {
  testUpdatePTGTaxPrice();
}

export { testUpdatePTGTaxPrice };
