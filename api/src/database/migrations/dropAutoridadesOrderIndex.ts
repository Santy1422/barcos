import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function dropAutoridadesOrderIndex() {
  try {
    console.log('🔧 Dropping unique index on recordsautoridades.order...');
    console.log('----------------------------------------');

    // Connect to database
    const mongoUri = process.env.USER_MONGO_URI || 'mongodb://localhost:27017/barcos';
    await mongoose.connect(mongoUri);
    console.log('📦 Connected to MongoDB');
    console.log('📊 Database name:', mongoose.connection.db.databaseName);

    const db = mongoose.connection.db;
    const collection = db.collection('recordsautoridades');

    // List current indexes
    console.log('\n🔍 Current indexes:');
    const indexes = await collection.indexes();
    console.log(JSON.stringify(indexes, null, 2));

    // Try to drop the order_1 index
    console.log('\n🗑️ Attempting to drop order_1 index...');
    try {
      await collection.dropIndex('order_1');
      console.log('✅ Successfully dropped order_1 index');
    } catch (e: any) {
      if (e.message.includes('index not found')) {
        console.log('ℹ️ order_1 index does not exist (already dropped or never created)');
      } else {
        console.error('❌ Error dropping index:', e.message);
      }
    }

    // Verify indexes after drop
    console.log('\n🔍 Indexes after drop:');
    const newIndexes = await collection.indexes();
    console.log(JSON.stringify(newIndexes, null, 2));

    // Count total records
    const count = await collection.countDocuments({});
    console.log(`\n📊 Total records in collection: ${count}`);

    // Count by status
    const statusCounts = await collection.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]).toArray();
    console.log('📊 Records by status:', statusCounts);

    await mongoose.connection.close();
    console.log('\n✅ Migration completed successfully!');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

dropAutoridadesOrderIndex();
