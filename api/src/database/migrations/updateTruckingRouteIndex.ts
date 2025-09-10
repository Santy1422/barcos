import mongoose from 'mongoose';
import truckingRouteSchema from '../schemas/truckingRouteSchema';
import dotenv from 'dotenv';

dotenv.config();

// Create the model
const TruckingRoute = mongoose.model('TruckingRoute', truckingRouteSchema);

async function updateTruckingRouteIndex() {
  try {
    console.log('🔧 Starting Trucking Route index migration...');
    
    // Connect to database
    const mongoUri = process.env.USER_MONGO_URI || 'mongodb://localhost:27017/barcos';
    await mongoose.connect(mongoUri);
    console.log('📦 Connected to MongoDB');

    // Get current indexes
    const indexes = await TruckingRoute.collection.indexes();
    console.log('📊 Current indexes:', indexes.map(idx => idx.name));

    // Drop the old index if it exists
    try {
      await TruckingRoute.collection.dropIndex('name_1_containerType_1_routeType_1');
      console.log('✅ Dropped old index: name_1_containerType_1_routeType_1');
    } catch (error: any) {
      if (error.codeName === 'IndexNotFound') {
        console.log('ℹ️ Old index not found, continuing...');
      } else {
        console.log('⚠️ Error dropping old index:', error.message);
      }
    }

    // Create the new index
    await TruckingRoute.collection.createIndex(
      { name: 1, containerType: 1, routeType: 1, status: 1 }, 
      { unique: true }
    );
    console.log('✅ Created new index: name_1_containerType_1_routeType_1_status_1');

    // Verify new indexes
    const newIndexes = await TruckingRoute.collection.indexes();
    console.log('📊 Updated indexes:', newIndexes.map(idx => idx.name));

    console.log('✨ Index migration completed successfully!');

  } catch (error) {
    console.error('❌ Error updating Trucking Route index:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Standalone execution
if (require.main === module) {
  updateTruckingRouteIndex()
    .then(() => {
      console.log('✅ Migration completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    });
}

export { updateTruckingRouteIndex };
