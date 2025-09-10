import mongoose from 'mongoose';
import containerTypesSchema from '../schemas/containerTypesSchema';
import dotenv from 'dotenv';

dotenv.config();

// Create the model
const ContainerType = mongoose.model('ContainerType', containerTypesSchema);

// Sample MTY and FB container types
const mtyFbContainerTypes = [
  // MTY Container Types
  {
    code: 'MTY20',
    name: 'MTY 20ft Container',
    category: 'MTY',
    description: 'Empty 20ft container for special cargo',
    isActive: true
  },
  {
    code: 'MTY40',
    name: 'MTY 40ft Container',
    category: 'MTY',
    description: 'Empty 40ft container for special cargo',
    isActive: true
  },
  {
    code: 'MTY45',
    name: 'MTY 45ft Container',
    category: 'MTY',
    description: 'Empty 45ft container for special cargo',
    isActive: true
  },
  
  // FB (Flatbed) Container Types
  {
    code: 'FB20',
    name: 'Flatbed 20ft',
    category: 'FB',
    description: '20ft flatbed container for oversized cargo',
    isActive: true
  },
  {
    code: 'FB40',
    name: 'Flatbed 40ft',
    category: 'FB',
    description: '40ft flatbed container for oversized cargo',
    isActive: true
  },
  {
    code: 'FB45',
    name: 'Flatbed 45ft',
    category: 'FB',
    description: '45ft flatbed container for oversized cargo',
    isActive: true
  }
];

export async function seedMTYFBContainerTypes() {
  try {
    console.log('📦 Starting MTY/FB Container Types seeding...');
    
    // Connect to database
    const mongoUri = process.env.USER_MONGO_URI || 'mongodb://localhost:27017/barcos';
    await mongoose.connect(mongoUri);
    console.log('📦 Connected to MongoDB');

    let createdCount = 0;
    let skippedCount = 0;

    for (const containerTypeData of mtyFbContainerTypes) {
      try {
        // Check if container type already exists
        const existing = await ContainerType.findOne({ code: containerTypeData.code });
        if (existing) {
          console.log(`⚠️ Skipping existing container type: ${containerTypeData.code}`);
          skippedCount++;
          continue;
        }

        await ContainerType.create(containerTypeData);
        console.log(`✅ Created container type: ${containerTypeData.code} (${containerTypeData.category})`);
        createdCount++;
      } catch (error: any) {
        if (error.code === 11000) {
          console.log(`⚠️ Skipping duplicate container type: ${containerTypeData.code}`);
          skippedCount++;
        } else {
          console.error(`❌ Error creating container type ${containerTypeData.code}:`, error.message);
          throw error;
        }
      }
    }

    console.log(`✅ Created ${createdCount} MTY/FB container types`);
    if (skippedCount > 0) {
      console.log(`⚠️ Skipped ${skippedCount} existing container types`);
    }

    // Get final count
    const totalContainerTypes = await ContainerType.countDocuments();
    console.log(`📊 Total container types in database: ${totalContainerTypes}`);

    // Show sample of created container types
    const sampleContainerTypes = await ContainerType.find({ category: { $in: ['MTY', 'FB'] } }).limit(5);
    console.log('\n📝 Sample MTY/FB container types:');
    sampleContainerTypes.forEach((ct, index) => {
      console.log(`   ${index + 1}. ${ct.code} - ${ct.name} (${ct.category}) - ${ct.isActive ? 'Active' : 'Inactive'}`);
    });

    console.log('\n✨ MTY/FB Container Types seeding completed successfully!');

    return {
      created: createdCount,
      skipped: skippedCount,
      total: totalContainerTypes
    };
  } catch (error) {
    console.error('❌ Error seeding MTY/FB Container Types:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Standalone execution
if (require.main === module) {
  seedMTYFBContainerTypes()
    .then(() => {
      console.log('✅ Seeding completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seeding failed:', error);
      process.exit(1);
    });
}

export { mtyFbContainerTypes };
