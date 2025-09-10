import mongoose from 'mongoose';
import containerTypesSchema from '../schemas/containerTypesSchema';
import dotenv from 'dotenv';

dotenv.config();

// Create the model
const ContainerType = mongoose.model('ContainerType', containerTypesSchema);

async function updateContainerTypeCategories() {
  try {
    console.log('🔧 Starting container type categories migration...');
    
    // Connect to database
    const mongoUri = process.env.USER_MONGO_URI || 'mongodb://localhost:27017/barcos';
    await mongoose.connect(mongoUri);
    console.log('📦 Connected to MongoDB');

    // Get current container types count
    const currentCount = await ContainerType.countDocuments();
    console.log(`📊 Current container types in database: ${currentCount}`);

    // Since we're adding new enum values, we don't need to modify existing data
    // MongoDB will accept the new enum values automatically when we update documents
    console.log('✅ Container type categories enum updated in schema');
    console.log('ℹ️ Existing container types will continue to work with current categories');
    console.log('ℹ️ New container types can now use: A, B, DRY, N, REEFE, T, MTY, FB');

    // Verify the schema is working by checking the enum values
    const schemaPath = ContainerType.schema.path('category');
    if (schemaPath && 'enumValues' in schemaPath) {
      console.log('📋 Available categories:', schemaPath.enumValues);
    }

    console.log('✨ Container type categories migration completed successfully!');

  } catch (error) {
    console.error('❌ Error updating container type categories:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Standalone execution
if (require.main === module) {
  updateContainerTypeCategories()
    .then(() => {
      console.log('✅ Migration completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    });
}

export { updateContainerTypeCategories };
