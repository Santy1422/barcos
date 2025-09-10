import mongoose from 'mongoose';
import truckingRouteSchema from '../schemas/truckingRouteSchema';

// Create the model
const TruckingRoute = mongoose.model('TruckingRoute', truckingRouteSchema);

// Raw data from user
const rawRouteData = `Move Type	Route	Status	Size	Type	Cost
SINGLE	PACIFIC - PSA / BLB	FULL	20	CA - REEFER	190
SINGLE	PACIFIC - PSA / CCT	FULL	20	CA - REEFER	190
SINGLE	PACIFIC - PSA / MIT	FULL	20	CA - REEFER	190
SINGLE	PACIFIC - BLB / PSA	EMPTY	20	CA - REEFER	190
SINGLE	PACIFIC - CCT / PSA	EMPTY	20	CA - REEFER	190
SINGLE	PACIFIC - MIT / PSA	EMPTY	20	CA - REEFER	190
SINGLE	PACIFIC - PSA / BLB	FULL	40	CA - REEFER	230
SINGLE	PACIFIC - PSA / CCT	FULL	40	CA - REEFER	230
SINGLE	PACIFIC - PSA / MIT	FULL	40	CA - REEFER	230
SINGLE	PACIFIC - BLB / PSA	EMPTY	40	CA - REEFER	230
SINGLE	PACIFIC - CCT / PSA	EMPTY	40	CA - REEFER	230
SINGLE	PACIFIC - MIT / PSA	EMPTY	40	CA - REEFER	230
SINGLE	PACIFIC - PSA / BLB	FULL	20	CA - DRY	150
SINGLE	PACIFIC - PSA / CCT	FULL	20	CA - DRY	150
SINGLE	PACIFIC - PSA / MIT	FULL	20	CA - DRY	150
SINGLE	PACIFIC - BLB / PSA	EMPTY	20	CA - DRY	150
SINGLE	PACIFIC - CCT / PSA	EMPTY	20	CA - DRY	150
SINGLE	PACIFIC - MIT / PSA	EMPTY	20	CA - DRY	150
SINGLE	PACIFIC - PSA / BLB	FULL	40	CA - DRY	180
SINGLE	PACIFIC - PSA / CCT	FULL	40	CA - DRY	180
SINGLE	PACIFIC - PSA / MIT	FULL	40	CA - DRY	180
SINGLE	PACIFIC - BLB / PSA	EMPTY	40	CA - DRY	180
SINGLE	PACIFIC - CCT / PSA	EMPTY	40	CA - DRY	180
SINGLE	PACIFIC - MIT / PSA	EMPTY	40	CA - DRY	180
RT	PACIFIC - PSA / BLB	FULL	20	CA - REEFER	350
RT	PACIFIC - PSA / CCT	FULL	20	CA - REEFER	350
RT	PACIFIC - PSA / MIT	FULL	20	CA - REEFER	350
RT	PACIFIC - PSA / BLB	FULL	40	CA - REEFER	420
RT	PACIFIC - PSA / CCT	FULL	40	CA - REEFER	420
RT	PACIFIC - PSA / MIT	FULL	40	CA - REEFER	420
RT	PACIFIC - PSA / BLB	FULL	20	CA - DRY	280
RT	PACIFIC - PSA / CCT	FULL	20	CA - DRY	280
RT	PACIFIC - PSA / MIT	FULL	20	CA - DRY	280
RT	PACIFIC - PSA / BLB	FULL	40	CA - DRY	330
RT	PACIFIC - PSA / CCT	FULL	40	CA - DRY	330
RT	PACIFIC - PSA / MIT	FULL	40	CA - DRY	330
SINGLE	ATLANTIC - CCT / BLB	FULL	20	CA - REEFER	190
SINGLE	ATLANTIC - CCT / PSA	FULL	20	CA - REEFER	190
SINGLE	ATLANTIC - CCT / MIT	FULL	20	CA - REEFER	190
SINGLE	ATLANTIC - BLB / CCT	EMPTY	20	CA - REEFER	190
SINGLE	ATLANTIC - PSA / CCT	EMPTY	20	CA - REEFER	190
SINGLE	ATLANTIC - MIT / CCT	EMPTY	20	CA - REEFER	190
SINGLE	ATLANTIC - CCT / BLB	FULL	40	CA - REEFER	230
SINGLE	ATLANTIC - CCT / PSA	FULL	40	CA - REEFER	230
SINGLE	ATLANTIC - CCT / MIT	FULL	40	CA - REEFER	230
SINGLE	ATLANTIC - BLB / CCT	EMPTY	40	CA - REEFER	230
SINGLE	ATLANTIC - PSA / CCT	EMPTY	40	CA - REEFER	230
SINGLE	ATLANTIC - MIT / CCT	EMPTY	40	CA - REEFER	230
SINGLE	ATLANTIC - CCT / BLB	FULL	20	CA - DRY	150
SINGLE	ATLANTIC - CCT / PSA	FULL	20	CA - DRY	150
SINGLE	ATLANTIC - CCT / MIT	FULL	20	CA - DRY	150
SINGLE	ATLANTIC - BLB / CCT	EMPTY	20	CA - DRY	150
SINGLE	ATLANTIC - PSA / CCT	EMPTY	20	CA - DRY	150
SINGLE	ATLANTIC - MIT / CCT	EMPTY	20	CA - DRY	150
SINGLE	ATLANTIC - CCT / BLB	FULL	40	CA - DRY	180
SINGLE	ATLANTIC - CCT / PSA	FULL	40	CA - DRY	180
SINGLE	ATLANTIC - CCT / MIT	FULL	40	CA - DRY	180
SINGLE	ATLANTIC - BLB / CCT	EMPTY	40	CA - DRY	180
SINGLE	ATLANTIC - PSA / CCT	EMPTY	40	CA - DRY	180
SINGLE	ATLANTIC - MIT / CCT	EMPTY	40	CA - DRY	180
RT	ATLANTIC - CCT / BLB	FULL	20	CA - REEFER	350
RT	ATLANTIC - CCT / PSA	FULL	20	CA - REEFER	350
RT	ATLANTIC - CCT / MIT	FULL	20	CA - REEFER	350
RT	ATLANTIC - CCT / BLB	FULL	40	CA - REEFER	420
RT	ATLANTIC - CCT / PSA	FULL	40	CA - REEFER	420
RT	ATLANTIC - CCT / MIT	FULL	40	CA - REEFER	420
RT	ATLANTIC - CCT / BLB	FULL	20	CA - DRY	280
RT	ATLANTIC - CCT / PSA	FULL	20	CA - DRY	280
RT	ATLANTIC - CCT / MIT	FULL	20	CA - DRY	280
RT	ATLANTIC - CCT / BLB	FULL	40	CA - DRY	330
RT	ATLANTIC - CCT / PSA	FULL	40	CA - DRY	330
RT	ATLANTIC - CCT / MIT	FULL	40	CA - DRY	330`;

// Function to parse the raw data
function parseRouteData(rawData: string) {
  const lines = rawData.trim().split('\n');
  const header = lines[0]; // Skip header
  const dataLines = lines.slice(1);
  
  return dataLines.map(line => {
    const columns = line.split('\t');
    const [moveType, route, status, size, type, cost] = columns;
    
    // Parse Move Type -> routeType (keep RT uppercase, convert SINGLE to lowercase)
    const routeType = moveType === 'SINGLE' ? 'single' : 'RT' as "single" | "RT";
    
    // Parse Route: "PACIFIC - PSA / BLB"
    // Split by " - " to get the prefix and route part
    const routeParts = route.split(' - ');
    const routeSection = routeParts[1]; // "PSA / BLB"
    
    // Split by " / " to get origin and destination
    const [origin, destination] = routeSection.split(' / ');
    
    // The name is the part after "-" which is the route section itself
    const name = routeSection;
    
    // Parse Status (capitalize first letter to match schema enum)
    const parsedStatus = status.charAt(0).toUpperCase() + status.slice(1).toLowerCase() as "Full" | "Empty";
    
    // Parse Type -> containerType
    // Check for different container types in the type field
    let containerType: "dry" | "reefer" | "mty" | "fb";
    if (type.includes('REEFER')) {
      containerType = 'reefer';
    } else if (type.includes('MTY')) {
      containerType = 'mty';
    } else if (type.includes('FB') || type.includes('FLATBED')) {
      containerType = 'fb';
    } else {
      containerType = 'dry';
    }
    
    // Parse Cost -> price
    const price = parseInt(cost);
    
    return {
      name,
      origin,
      destination,
      containerType,
      routeType,
      price,
      status: parsedStatus
    };
  });
}

// Export the parsed data for use in other files
export const truckingRoutesSeedData = parseRouteData(rawRouteData);

// Main seeding function
export async function seedTruckingRoutes() {
  try {
    console.log('🚛 Starting Trucking Routes seeding...');
    
    // Clear existing data
    await TruckingRoute.deleteMany({});
    console.log('✅ Cleared existing trucking routes data');
    
    // Parse and seed routes
    console.log('🛣️ Parsing and seeding routes...');
    const routesData = parseRouteData(rawRouteData);
    
    // Remove duplicates by keeping the higher price (40ft containers)
    const uniqueRoutes = new Map();
    routesData.forEach(route => {
      const key = `${route.name}-${route.containerType}-${route.routeType}-${route.status}`;
      const existing = uniqueRoutes.get(key);
      
      if (!existing || route.price > existing.price) {
        uniqueRoutes.set(key, route);
      }
    });
    
    console.log(`📊 Processed ${routesData.length} total routes, ${uniqueRoutes.size} unique routes (keeping higher prices for 40ft containers)`);
    
    let createdCount = 0;
    let skippedCount = 0;
    
    for (const routeData of Array.from(uniqueRoutes.values())) {
      try {
        await TruckingRoute.create(routeData);
        createdCount++;
      } catch (error: any) {
        if (error.code === 11000) {
          // Duplicate key error - route already exists
          console.log(`⚠️ Skipping duplicate route: ${routeData.name} (${routeData.containerType}, ${routeData.routeType}, ${routeData.status})`);
          skippedCount++;
        } else {
          console.error(`❌ Error creating route ${routeData.name}:`, error.message);
          throw error;
        }
      }
    }
    
    console.log(`✅ Created ${createdCount} trucking routes`);
    if (skippedCount > 0) {
      console.log(`⚠️ Skipped ${skippedCount} duplicate routes`);
    }
    
    // Get final count
    const totalRoutes = await TruckingRoute.countDocuments();
    console.log(`📊 Total routes in database: ${totalRoutes}`);
    
    // Show sample of created routes
    const sampleRoutes = await TruckingRoute.find().limit(5);
    console.log('\n📝 Sample routes created:');
    sampleRoutes.forEach((route, index) => {
      console.log(`   ${index + 1}. ${route.name} (${route.origin} → ${route.destination}) - ${route.containerType} ${route.routeType} - $${route.price} - ${route.status}`);
    });
    
    console.log('\n✨ Trucking Routes seeding completed successfully!');
    
    return {
      created: createdCount,
      skipped: skippedCount,
      total: totalRoutes
    };
  } catch (error) {
    console.error('❌ Error seeding Trucking Routes:', error);
    throw error;
  }
}

// Standalone execution
if (require.main === module) {
  const dotenv = require('dotenv');
  
  dotenv.config();
  
  const mongoUri = process.env.USER_MONGO_URI || 'mongodb://localhost:27017/barcos';
  mongoose.connect(mongoUri)
    .then(() => {
      console.log('📦 Connected to MongoDB');
      return seedTruckingRoutes();
    })
    .then(() => {
      console.log('✅ Seeding completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seeding failed:', error);
      process.exit(1);
    });
}
