import { Request, Response } from "express";
import mongoose from "mongoose";
import truckingRouteSchema from "../../database/schemas/truckingRouteSchema";
import { response } from "../../utils";

const TruckingRoute = mongoose.model('TruckingRoute', truckingRouteSchema);

interface ImportedRoute {
  billing: string;
  routeArea: string;
  origin: string;
  destination: string;
  status: string;
  sizeContenedor: string;
  tipo: string;
  cliente: string;
  rate: number;
}

const importTruckingRoutes = async (req: Request, res: Response) => {
  try {
    const { routes, overwriteDuplicates = false } = req.body;

    if (!routes || !Array.isArray(routes) || routes.length === 0) {
      return response(res, 400, { message: 'Se requiere un array de rutas válido' });
    }

    const results = {
      success: 0,
      errors: 0,
      duplicates: 0,
      errorsList: [] as string[]
    };

    const BATCH_SIZE = 100; // Procesar en lotes de 100
    const totalRoutes = routes.length;

    console.log(`Iniciando importación de ${totalRoutes} rutas. Sobrescribir duplicados: ${overwriteDuplicates}`);

    // Procesar en lotes para mejorar el rendimiento
    for (let i = 0; i < routes.length; i += BATCH_SIZE) {
      const batch = routes.slice(i, i + BATCH_SIZE);
      const batchPromises = [];

      // Log del primer lote para debugging
      if (i === 0) {
        console.log('Primera ruta del lote:', JSON.stringify(batch[0], null, 2));
      }

      for (const routeData of batch) {
        batchPromises.push(processRoute(routeData, results, overwriteDuplicates));
      }

      // Procesar el lote en paralelo
      await Promise.allSettled(batchPromises);

      // Log de progreso
      const processed = Math.min(i + BATCH_SIZE, totalRoutes);
      console.log(`Procesadas ${processed}/${totalRoutes} rutas (${Math.round((processed / totalRoutes) * 100)}%) - Éxitos: ${results.success}, Duplicados: ${results.duplicates}, Errores: ${results.errors}`);
    }

    return response(res, 200, {
      message: `Importación completada. ${results.success} rutas importadas, ${results.duplicates} duplicadas, ${results.errors} errores`,
      data: {
        success: results.success,
        duplicates: results.duplicates,
        errors: results.errors,
        errorsList: results.errorsList.slice(0, 50) // Limitar errores a los primeros 50
      }
    });

  } catch (error) {
    console.error('Error en importación masiva de rutas:', error);
    return response(res, 500, {
      message: 'Error interno del servidor durante la importación',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

// Función auxiliar para procesar una ruta individual
async function processRoute(routeData: ImportedRoute, results: any, overwriteDuplicates: boolean = false): Promise<void> {
  try {
    // Validar campos requeridos con más detalle
    const missingFields = [];
    if (!routeData.billing) missingFields.push('billing');
    if (!routeData.routeArea) missingFields.push('routeArea');
    if (!routeData.origin) missingFields.push('origin');
    if (!routeData.destination) missingFields.push('destination');
    if (!routeData.status) missingFields.push('status');
    if (!routeData.sizeContenedor) missingFields.push('sizeContenedor');
    if (!routeData.tipo) missingFields.push('tipo');
    if (!routeData.cliente) missingFields.push('cliente');
    if (!routeData.rate || routeData.rate <= 0) missingFields.push('rate');

    if (missingFields.length > 0) {
      results.errors++;
      results.errorsList.push(`Ruta con campos faltantes (${missingFields.join(', ')}): ${JSON.stringify(routeData)}`);
      return;
    }

    // Generar nombre de la ruta
    const name = `${routeData.origin}/${routeData.destination}`;

    // Verificar si ya existe una ruta con los mismos datos clave (sin precio)
    const searchCriteria = {
      name,
      origin: routeData.origin,
      destination: routeData.destination,
      containerType: routeData.tipo,
      routeType: routeData.billing,
      status: routeData.status,
      cliente: routeData.cliente,
      routeArea: routeData.routeArea,
      sizeContenedor: routeData.sizeContenedor
    };

    const existingRoute = await TruckingRoute.findOne(searchCriteria);

    if (existingRoute) {
      console.log(`Ruta duplicada encontrada:`, {
        searchCriteria,
        existingRoute: {
          _id: existingRoute._id,
          name: existingRoute.name,
          origin: existingRoute.origin,
          destination: existingRoute.destination,
          containerType: existingRoute.containerType,
          routeType: existingRoute.routeType,
          status: existingRoute.status,
          cliente: existingRoute.cliente,
          routeArea: existingRoute.routeArea,
          sizeContenedor: existingRoute.sizeContenedor,
          price: existingRoute.price
        },
        newPrice: routeData.rate
      });

      if (overwriteDuplicates) {
        // Actualizar la ruta existente
        await TruckingRoute.findByIdAndUpdate(existingRoute._id, {
          name,
          origin: routeData.origin,
          destination: routeData.destination,
          containerType: routeData.tipo,
          routeType: routeData.billing,
          price: routeData.rate,
          status: routeData.status,
          cliente: routeData.cliente,
          routeArea: routeData.routeArea,
          sizeContenedor: routeData.sizeContenedor
        });
        results.success++;
        console.log(`Ruta actualizada: ${existingRoute._id} con nuevo precio: ${routeData.rate}`);
      } else {
        results.duplicates++;
        console.log(`Ruta marcada como duplicada: ${existingRoute._id}`);
      }
      return;
    }

    // Crear nueva ruta
    const newRoute = new TruckingRoute({
      name,
      origin: routeData.origin,
      destination: routeData.destination,
      containerType: routeData.tipo,
      routeType: routeData.billing,
      price: routeData.rate,
      status: routeData.status,
      cliente: routeData.cliente,
      routeArea: routeData.routeArea,
      sizeContenedor: routeData.sizeContenedor
    });

    await newRoute.save();
    results.success++;

  } catch (error) {
    results.errors++;
    const errorMessage = `Error procesando ruta: ${error instanceof Error ? error.message : 'Error desconocido'}`;
    results.errorsList.push(errorMessage);
    console.error('Error procesando ruta:', errorMessage, 'Datos:', JSON.stringify(routeData));
  }
}

export default importTruckingRoutes;
