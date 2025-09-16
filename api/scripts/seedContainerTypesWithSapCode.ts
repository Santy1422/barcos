import mongoose from 'mongoose'
import { ContainerType } from '../src/database/schemas/containerTypesSchema'
import { userConexion } from '../src/config/env'

// Datos únicos de contenedores con sus códigos SAP
const containerTypesData = [
  // REEFE (Reefer containers)
  {
    code: 'CA',
    name: 'Cargo',
    category: 'REEFE',
    sapCode: 'RE',
    description: 'Cargo container with reefer capabilities',
    isActive: true
  },
  {
    code: 'CT',
    name: 'Container',
    category: 'REEFE',
    sapCode: 'RE',
    description: 'Standard container with reefer capabilities',
    isActive: true
  },
  {
    code: 'RE',
    name: 'Reefer',
    category: 'REEFE',
    sapCode: 'RE',
    description: 'Refrigerated container',
    isActive: true
  },
  {
    code: 'RF',
    name: 'Reefer',
    category: 'REEFE',
    sapCode: 'RE',
    description: 'Refrigerated container (alternative code)',
    isActive: true
  },

  // DRY containers
  {
    code: 'DV',
    name: 'Dry Van',
    category: 'DRY',
    sapCode: 'DV',
    description: 'Standard dry van container',
    isActive: true
  },
  {
    code: 'DC',
    name: 'Dry Container',
    category: 'DRY',
    sapCode: 'DV',
    description: 'Dry container (alternative code)',
    isActive: true
  },
  {
    code: 'FL',
    name: 'Flat',
    category: 'DRY',
    sapCode: 'FL',
    description: 'Flat rack container',
    isActive: true
  },
  {
    code: 'FT',
    name: 'Flat Trailer',
    category: 'DRY',
    sapCode: 'FT',
    description: 'Flat trailer container',
    isActive: true
  },
  {
    code: 'OT',
    name: 'Other',
    category: 'DRY',
    sapCode: 'OT',
    description: 'Other type of dry container',
    isActive: true
  },
  {
    code: 'PK',
    name: 'Pack',
    category: 'DRY',
    sapCode: 'PP',
    description: 'Pack container',
    isActive: true
  },
  {
    code: 'PP',
    name: 'Pack',
    category: 'DRY',
    sapCode: 'PP',
    description: 'Pack container (alternative code)',
    isActive: true
  },

  // TANK containers
  {
    code: 'TK',
    name: 'Tank',
    category: 'T',
    sapCode: 'TK',
    description: 'Tank container',
    isActive: true
  }
]

async function seedContainerTypes() {
  try {
    // Conectar a MongoDB
    await mongoose.connect(userConexion.db_uri)
    console.log('✅ Conectado a MongoDB')

    // Limpiar datos existentes
    await ContainerType.deleteMany({})
    console.log('🗑️  Datos existentes eliminados')

    // Insertar nuevos datos
    const insertedTypes = await ContainerType.insertMany(containerTypesData)
    console.log(`✅ ${insertedTypes.length} tipos de contenedores insertados`)

    // Mostrar resumen por categoría
    const summary = containerTypesData.reduce((acc, type) => {
      if (!acc[type.category]) {
        acc[type.category] = []
      }
      acc[type.category].push(type)
      return acc
    }, {} as Record<string, typeof containerTypesData>)

    console.log('\n📊 Resumen por categoría:')
    Object.keys(summary).forEach(category => {
      console.log(`\n${category}:`)
      summary[category].forEach(type => {
        console.log(`  ${type.code} -> ${type.sapCode} (${type.name})`)
      })
    })

    console.log('\n🎉 Seed completado exitosamente!')
  } catch (error) {
    console.error('❌ Error durante el seed:', error)
  } finally {
    await mongoose.disconnect()
    console.log('🔌 Desconectado de MongoDB')
  }
}

// Ejecutar el seed
if (require.main === module) {
  seedContainerTypes()
}

export { seedContainerTypes }
