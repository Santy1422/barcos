import mongoose from 'mongoose';
import truckingRouteSchema from '../schemas/truckingRouteSchema';
import dotenv from 'dotenv';

dotenv.config();

// Create the model
const TruckingRoute = mongoose.model('TruckingRoute', truckingRouteSchema);

async function updateContainerTypesEnum() {
  try {
    console.log('🔧 Starting container types enum migration...');
    
    // Connect to database
    const mongoUri = process.env.USER_MONGO_URI || 'mongodb://localhost:27017/barcos';
    await mongoose.connect(mongoUri);
    console.log('📦 Connected to MongoDB');

    // Get current routes count
    const currentCount = await TruckingRoute.countDocuments();
    console.log(`📊 Current routes in database: ${currentCount}`);

    // Since we're adding new enum values, we don't need to modify existing data
    // MongoDB will accept the new enum values automatically when we update documents
    console.log('✅ Container type enum updated in schema');
    console.log('ℹ️ Existing routes will continue to work with current container types');
    console.log('ℹ️ New routes can now use: dry, reefer, mty, fb');

    // Verify the schema is working by checking the enum values
    const schemaPath = TruckingRoute.schema.path('containerType');
    if (schemaPath && 'enumValues' in schemaPath) {
      console.log('📋 Available container types:', schemaPath.enumValues);
    }

    console.log('✨ Container types enum migration completed successfully!');

  } catch (error) {
    console.error('❌ Error updating container types enum:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Standalone execution
if (require.main === module) {
  updateContainerTypesEnum()
    .then(() => {
      console.log('✅ Migration completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    });
}

export { updateContainerTypesEnum };
