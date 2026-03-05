const mongoose = require('mongoose');
const XLSX = require('xlsx');
require('dotenv').config();

const MONGO_URI = process.env.USER_MONGO_URI;

if (!MONGO_URI) {
  console.error('Error: No se encontró USER_MONGO_URI en las variables de entorno');
  process.exit(1);
}

// Schema de TruckingRoute
const truckingRouteSchema = new mongoose.Schema({
  name: String,
  origin: String,
  destination: String,
  containerType: String,
  routeType: String,
  price: Number,
  status: String,
  cliente: String,
  routeArea: String,
  sizeContenedor: String
}, { timestamps: true });

const TruckingRoute = mongoose.model('truckingroutes', truckingRouteSchema);

async function exportRutasPTG() {
  try {
    console.log('Conectando a MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('Conectado exitosamente');

    console.log('Obteniendo rutas PTG...');
    const rutas = await TruckingRoute.find({}).lean();

    console.log(`Se encontraron ${rutas.length} rutas`);

    if (rutas.length === 0) {
      console.log('No hay rutas para exportar');
      await mongoose.disconnect();
      return;
    }

    // Mapear datos al formato solicitado
    const datosExcel = rutas.map((ruta) => ({
      'Nombre': ruta.name || '',
      'Tipo Contenedor': ruta.containerType || '',
      'Estado': ruta.status || '',
      'Precio': ruta.price || 0
    }));

    // Crear hoja de Excel
    const ws = XLSX.utils.json_to_sheet(datosExcel);

    // Ajustar ancho de columnas
    ws['!cols'] = [
      { wch: 25 }, // Nombre
      { wch: 18 }, // Tipo Contenedor
      { wch: 10 }, // Estado
      { wch: 12 }, // Precio
    ];

    // Crear libro y agregar hoja
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Rutas PTG');

    // Generar nombre de archivo con fecha
    const fecha = new Date().toISOString().split('T')[0];
    const nombreArchivo = `rutas_ptg_${fecha}.xlsx`;

    // Guardar archivo
    XLSX.writeFile(wb, nombreArchivo);
    console.log(`Archivo exportado: ${nombreArchivo}`);
    console.log(`Total de rutas exportadas: ${rutas.length}`);

    await mongoose.disconnect();
    console.log('Desconectado de MongoDB');

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

exportRutasPTG();
