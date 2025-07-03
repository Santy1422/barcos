require('dotenv').config();
const mongoose = require('mongoose');

const serviceSapCodeSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  description: { type: String, required: true },
  module: { type: String, enum: ['trucking', 'agency', 'shipchandler', 'all'], default: 'all' },
  active: { type: Boolean, default: true }
}, { timestamps: true });

const ServiceSapCode = mongoose.model('ServiceSapCode', serviceSapCodeSchema);

const sapCodes = [
  { code: "TRK003", description: "Repositioning" },
  { code: "TRK004", description: "Cross border" },
  { code: "TRK005", description: "Genset" },
  { code: "TRK006", description: "Chassis detention" },
  { code: "TRK007", description: "Handling" },
  { code: "TRK008", description: "Overtime" },
  { code: "TRK009", description: "Seal" },
  { code: "TRK010", description: "Security" },
  { code: "TRK011", description: "VGM" },
  { code: "TRK012", description: "Rental of trucks" },
  { code: "TRK130", description: "Administration fees" },
  { code: "TRK135", description: "Customs" },
  { code: "TRK136", description: "Futile  trip" },
  { code: "TRK137", description: "Waiting time" },
  { code: "TRK162", description: "THC" },
  { code: "TRK163", description: "Demurrage" },
  { code: "TRK164", description: "Other services" },
  { code: "TRK169", description: "Extra drop" },
  { code: "TRK170", description: "Storage" },
  { code: "TRK171", description: "Monitoring" },
  { code: "TRK172", description: "Weighting" },
  { code: "TRK174", description: "Extra drop" },
  { code: "TRK175", description: "Chassis Rental" },
  { code: "TRK176", description: "Overdimension" },
  { code: "TRK177", description: "Overweight" },
  { code: "TRK179", description: "Storage" },
  { code: "TRK180", description: "Monitoring" },
  { code: "TRK181", description: "Weighting" },
  { code: "TRK182", description: "Freight" },
  { code: "TRK183", description: "Weekend delivery" },
  { code: "TRK184", description: "Transit container monitoring" },
  { code: "TRK185", description: "Transit Formalities Income" },
  { code: "TRK186", description: "Transit bond fee" },
  { code: "TRK196", description: "Port documentation services" },
  { code: "TRK203", description: "PTI" },
  { code: "TRK204", description: "Plugging" },
  { code: "TRK208", description: "Appointment Required" },
  { code: "TRK209", description: "Carbon tax" },
  { code: "TRK210", description: "Chassis Split" },
  { code: "TRK211", description: "Congestion Charges" },
  { code: "TRK212", description: "Crossdock" },
  { code: "TRK213", description: "Driver Assist" },
  { code: "TRK214", description: "Flex Service" },
  { code: "TRK215", description: "Hazmat" },
  { code: "TRK216", description: "Layover" },
  { code: "TRK217", description: "Pre-pull" },
  { code: "TRK219", description: "Reservation Fee" },
  { code: "TRK220", description: "Special Permit" },
  { code: "TRK221", description: "Storage Guarantee" },
  { code: "TRK222", description: "Tailgate" },
  { code: "TRK223", description: "Tarp" },
  { code: "TRK224", description: "Transload" },
  { code: "TRK225", description: "Urgent Delivery" },
  { code: "TRK226", description: "Yard Pull" },
  { code: "TRK227", description: "Re-Delivery" },
  { code: "TRK228", description: "Sorting Fee" },
  { code: "TRK230", description: "Drayage Rate" },
  { code: "TRK231", description: "Repositioning Full" },
  { code: "TRK233", description: "Trucking Drop-off" },
  { code: "TRK237", description: "Express Delivery (Air Cargo)" },
  { code: "TRK238", description: "Container cleaning" },
  { code: "TRK239", description: "Fumigation" },
  { code: "TRK240", description: "Lift On / Lift Off (LOLO)" },
  { code: "TRK251", description: "Insurance fee" }
];

async function seed() {
  const mongoUri = process.env.USER_MONGO_URI;
  
  if (!mongoUri) {
    console.error("❌ Error: USER_MONGO_URI no está definida en las variables de entorno");
    process.exit(1);
  }

  console.log("🔗 Conectando a MongoDB...");
  console.log(`📊 URI: ${mongoUri.split('@')[1] || 'Database'}`);
  
  try {
    await mongoose.connect(mongoUri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    
    console.log("✅ Conectado a MongoDB exitosamente");
    
    // Limpiar códigos existentes
    console.log("🧹 Limpiando códigos SAP existentes...");
    await ServiceSapCode.deleteMany({});
    
    // Insertar nuevos códigos
    console.log("📝 Insertando códigos SAP...");
    const result = await ServiceSapCode.insertMany(
      sapCodes.map(c => ({ ...c, module: 'trucking', active: true }))
    );
    
    console.log(`✅ ${result.length} códigos SAP cargados correctamente`);
    console.log("📋 Códigos insertados:");
    result.forEach(code => {
      console.log(`  - ${code.code}: ${code.description}`);
    });
    
  } catch (error) {
    console.error("❌ Error durante el seeding:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Conexión cerrada");
  }
}

seed();
