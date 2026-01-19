import mongoose from 'mongoose';
import { userConexion } from '../config/env';

// Importar todos los schemas
import usersSchema from './schemas/usersSchema';
import clientsSchema from './schemas/clientsSchema';
import recordsSchema from './schemas/recordsSchema';
import invoicesSchema from './schemas/invoicesSchema';
import configSchema from './schemas/configSchema';
import excelFilesSchema from './schemas/excelFilesSchema';
import { Naviera } from './schemas/navieraSchema';
import { Service } from './schemas/servicesSchema';
import { LocalService } from './schemas/localServiceSchema';
import AgencyService from './schemas/agencyServiceSchema';
import AgencyCatalog from './schemas/agencyCatalogSchema';
import AgencyInvoice from './schemas/agencyInvoiceSchema';
import recordsAutoridadesSchema from './schemas/recordsAutoridadesSchema';
import { ContainerType } from './schemas/containerTypesSchema';
import { ErrorLog } from './schemas/errorLogSchema';

mongoose.set('strictQuery', false);

const deploy = userConexion.db_uri;

// Conexión principal con configuración válida
mongoose.connect(deploy, {
  maxPoolSize: 10, // Mantener hasta 10 conexiones socket
  serverSelectionTimeoutMS: 15000, // Mantener intentando enviar operaciones por 5 segundos
  socketTimeoutMS: 45000, // Cerrar sockets después de 45 segundos de inactividad
}).then(() => {
  console.log("✅ Database connected successfully");
  console.log(`📊 Connected to: ${deploy.split('@')[1] || 'Database'}`);
}).catch(error => {
  console.error("❌ Database connection error:", error);
  process.exit(1);
});

// Definir todos los modelos usando la conexión por defecto
export const users = mongoose.model('users', usersSchema);
export const clients = mongoose.model('clients', clientsSchema);
export const records = mongoose.model('records', recordsSchema);
export const invoices = mongoose.model('invoices', invoicesSchema);
export const config = mongoose.model('config', configSchema);
export const excelFiles = mongoose.model('excelFiles', excelFilesSchema);
export const navieras = Naviera;
export const services = Service;
export const localServices = LocalService;
export const agencyServices = AgencyService;
export const agencyCatalogs = AgencyCatalog;
export const agencyInvoices = AgencyInvoice;
export const recordsAutoridades = mongoose.model('recordsAutoridades', recordsAutoridadesSchema);
export const containerTypes = ContainerType;
export const errorLogs = ErrorLog;

// Manejo de eventos de conexión
mongoose.connection.on('connected', () => {
  console.log('🔗 Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('🔌 Mongoose disconnected');
});

// Cerrar conexión cuando la aplicación se cierre
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('🔒 Database connection closed through app termination');
  process.exit(0);
});

// Exportar una función para obtener todos los modelos
export const getModels = () => {
  return {
    users,
    clients,
    records,
    invoices,
    config,
    excelFiles,
    navieras,
    services,
    localServices,
    agencyServices,
    agencyCatalogs,
    agencyInvoices,
    recordsAutoridades,
    containerTypes,
    errorLogs
  };
};

// Exportar tipos para TypeScript
export type Models = {
  users: typeof users;
  clients: typeof clients;
  records: typeof records;
  invoices: typeof invoices;
  config: typeof config;
  excelFiles: typeof excelFiles;
  navieras: typeof navieras;
  services: typeof services;
  localServices: typeof localServices;
  agencyServices: typeof agencyServices;
  agencyCatalogs: typeof agencyCatalogs;
  agencyInvoices: typeof agencyInvoices;
  recordsAutoridades: typeof recordsAutoridades;
  containerTypes: typeof containerTypes;
  errorLogs: typeof errorLogs;
};
