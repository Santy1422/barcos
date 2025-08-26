import mongoose from 'mongoose'
import { config } from 'dotenv'

// Cargar variables de entorno
config()

// Conectar a la base de datos
const connectDB = async () => {
  try {
    const mongoUri = process.env.USER_MONGO_URI || 'mongodb://localhost:27017/barcos'
    console.log('🔌 Conectando a MongoDB usando:', mongoUri)
    
    await mongoose.connect(mongoUri)
    console.log('✅ Conectado a MongoDB')
  } catch (error) {
    console.error('❌ Error conectando a MongoDB:', error)
    process.exit(1)
  }
}

// Función de migración
const migrateContainerTypes = async () => {
  try {
    console.log('🚀 Iniciando migración de tipos de contenedores en rutas de trucking...')
    
    // Obtener la colección de rutas de trucking
    const db = mongoose.connection.db
    const routesCollection = db.collection('truckingroutes')
    
    // Contar registros antes de la migración
    const totalRoutes = await routesCollection.countDocuments()
    console.log(`📊 Total de rutas encontradas: ${totalRoutes}`)
    
    if (totalRoutes === 0) {
      console.log('ℹ️  No hay rutas para migrar')
      return
    }
    
    // Contar registros con valores antiguos
    const normalRoutes = await routesCollection.countDocuments({ containerType: 'normal' })
    const refrigeratedRoutes = await routesCollection.countDocuments({ containerType: 'refrigerated' })
    
    console.log(`📋 Rutas con 'normal': ${normalRoutes}`)
    console.log(`📋 Rutas con 'refrigerated': ${refrigeratedRoutes}`)
    
    if (normalRoutes === 0 && refrigeratedRoutes === 0) {
      console.log('ℹ️  No hay rutas que necesiten migración')
      return
    }
    
    // Realizar la migración
    let updatedCount = 0
    
    // Actualizar 'normal' a 'dry'
    if (normalRoutes > 0) {
      const result = await routesCollection.updateMany(
        { containerType: 'normal' },
        { $set: { containerType: 'dry' } }
      )
      console.log(`✅ Actualizadas ${result.modifiedCount} rutas de 'normal' a 'dry'`)
      updatedCount += result.modifiedCount
    }
    
    // Actualizar 'refrigerated' a 'reefer'
    if (refrigeratedRoutes > 0) {
      const result = await routesCollection.updateMany(
        { containerType: 'refrigerated' },
        { $set: { containerType: 'reefer' } }
      )
      console.log(`✅ Actualizadas ${result.modifiedCount} rutas de 'refrigerated' a 'reefer'`)
      updatedCount += result.modifiedCount
    }
    
    // Verificar el resultado
    const finalNormalRoutes = await routesCollection.countDocuments({ containerType: 'normal' })
    const finalRefrigeratedRoutes = await routesCollection.countDocuments({ containerType: 'refrigerated' })
    const finalDryRoutes = await routesCollection.countDocuments({ containerType: 'dry' })
    const finalReeferRoutes = await routesCollection.countDocuments({ containerType: 'reefer' })
    
    console.log('\n📊 Resumen de la migración:')
    console.log(`  Rutas con 'normal': ${finalNormalRoutes} (debería ser 0)`)
    console.log(`  Rutas con 'refrigerated': ${finalRefrigeratedRoutes} (debería ser 0)`)
    console.log(`  Rutas con 'dry': ${finalDryRoutes}`)
    console.log(`  Rutas con 'reefer': ${finalReeferRoutes}`)
    console.log(`  Total de rutas actualizadas: ${updatedCount}`)
    
    if (finalNormalRoutes === 0 && finalRefrigeratedRoutes === 0) {
      console.log('\n🎉 Migración completada exitosamente!')
      console.log('💡 Los valores han sido actualizados a los estándares de la industria:')
      console.log('   - "normal" → "dry"')
      console.log('   - "refrigerated" → "reefer"')
    } else {
      console.log('\n⚠️  Algunas rutas no pudieron ser actualizadas')
    }
    
  } catch (error) {
    console.error('❌ Error durante la migración:', error)
  }
}

// Función principal
const main = async () => {
  try {
    await connectDB()
    await migrateContainerTypes()
  } catch (error) {
    console.error('❌ Error en la migración:', error)
  } finally {
    await mongoose.disconnect()
    console.log('🔌 Desconectado de MongoDB')
    process.exit(0)
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  main()
}

export { migrateContainerTypes }
