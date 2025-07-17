const mongoose = require('mongoose');
require('dotenv').config();

// Importar el modelo de clientes
const clientsSchema = require('../src/database/schemas/clientsSchema');
const Clients = mongoose.model('Clients', clientsSchema);

// Datos de clientes de ejemplo
const clientsData = [
  {
    type: "natural",
    fullName: "Juan Carlos Pérez González",
    documentType: "cedula",
    documentNumber: "8-123-456",
    address: "Calle 50ficio Torre Global, Piso 15San Francisco, Panamá",
    email: "juan.perez@email.com",
    phone: "612345",
    sapCode: "SAP01",
    isActive: true
  },
  {
    type: "juridico",
    companyName: "Importadora Del Mar S.A.",
    ruc: "1556789012-220",
    email: "facturacion@importadoradelmar.com",
    phone: "5075000",
    contactName: "María González",
    address: "Avenida Balboa, Torre de las Américas, Piso 20, Bella Vista, Panamá",
    sapCode: "SAP02",
    isActive: true
  },
  {
    type: "natural",
    fullName: "Ana María Rodríguez",
    documentType: "pasaporte",
    documentNumber: "PA123456789",
    address: "Cristóbal, Colón",
    email: "ana.rodriguez@email.com",
    phone: "623456",
    sapCode: "SAP03",
    isActive: true
  },
  {
    type: "juridico",
    companyName: "Logística Total PTY",
    ruc: "8-NT-12345",
    email: "admin@logisticatotal.com",
    phone: "5077890",
    contactName: "Carlos Mendoza",
    address: "José Domingo Espinar, San Miguelito, Panamá",
    sapCode: "SAP04",
    isActive: true
  },
  {
    type: "juridico",
    companyName: "PTY SHIP SUPPLIERS, S.A.",
    ruc: "15569222-215",
    email: "info@ptyship.com",
    phone: "5079806",
    contactName: "Roberto Martínez",
    address: "PANAMA PACIFICO, INTERNATIONAL BUSINESS PARK, BUILDING 3855FLOOR 2, PANAMA",
    sapCode: "SAP05",
    isActive: true
  }
];

async function seedClients() {
  try {
    // Conectar a la base de datos
    const mongoUri = process.env.USER_MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/barcos';
    await mongoose.connect(mongoUri);
    console.log('✅ Conectado a MongoDB');

    // Limpiar datos existentes
    await Clients.deleteMany({});
    console.log('🧹 Datos de clientes existentes eliminados');

    // Crear un usuario de sistema para los clientes iniciales
    const systemUserId = new mongoose.Types.ObjectId();

    // Insertar clientes con el usuario de sistema
    const clientsWithUser = clientsData.map(client => ({
      ...client,
      createdBy: systemUserId
    }));

    const result = await Clients.insertMany(clientsWithUser);
    console.log(`✅ ${result.length} clientes insertados exitosamente`);

    // Mostrar los clientes insertados
    console.log('\n📋 Clientes insertados:');
    result.forEach(client => {
      if (client.type === "natural") {
        console.log(`- ${client.fullName} (${client.documentType}: ${client.documentNumber}) - SAP: ${client.sapCode}`);
      } else {
        console.log(`- ${client.companyName} (RUC: ${client.ruc}) - SAP: ${client.sapCode}`);
      }
    });

  } catch (error) {
    console.error('❌ Error al poblar clientes:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado de MongoDB');
  }
}

// Ejecutar el seed
seedClients(); 