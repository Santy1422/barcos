import { Request, Response } from "express";
import mongoose from "mongoose";
import ptyssRouteSchema from "../../database/schemas/ptyssRouteSchema";
import { response } from "../../utils";

const PTYSSRoute = mongoose.model('PTYSSRoute', ptyssRouteSchema);

interface ImportedPTYSSRoute {
  from: string;
  to: string;
  containerType: string;
  routeType: string;
  price: number;
  status: string;
  cliente: string;
  routeArea: string;
}

const importPTYSSRoutes = async (req: Request, res: Response) => {
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

    console.log(`Iniciando importación de ${totalRoutes} rutas PTYSS. Sobrescribir duplicados: ${overwriteDuplicates}`);

    // Procesar en lotes para mejorar el rendimiento
    for (let i = 0; i < routes.length; i += BATCH_SIZE) {
      const batch = routes.slice(i, i + BATCH_SIZE);
      const batchPromises = [];

      // Log del primer lote para debugging
      if (i === 0) {
        console.log('Primera ruta PTYSS del lote:', JSON.stringify(batch[0], null, 2));
      }

      for (const routeData of batch) {
        batchPromises.push(processPTYSSRoute(routeData, results, overwriteDuplicates));
      }

      // Procesar el lote en paralelo
      await Promise.allSettled(batchPromises);

      // Log de progreso
      const processed = Math.min(i + BATCH_SIZE, totalRoutes);
      console.log(`Procesadas ${processed}/${totalRoutes} rutas PTYSS (${Math.round((processed / totalRoutes) * 100)}%) - Éxitos: ${results.success}, Duplicados: ${results.duplicates}, Errores: ${results.errors}`);
    }

    return response(res, 200, {
      message: `Importación completada. ${results.success} rutas PTYSS importadas, ${results.duplicates} duplicadas, ${results.errors} errores`,
      data: {
        success: results.success,
        duplicates: results.duplicates,
        errors: results.errors,
        errorsList: results.errorsList.slice(0, 50) // Limitar errores a los primeros 50
      }
    });

  } catch (error) {
    console.error('Error en importación masiva de rutas PTYSS:', error);
    return response(res, 500, {
      message: 'Error interno del servidor durante la importación',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

// Función auxiliar para procesar una ruta PTYSS individual
async function processPTYSSRoute(routeData: ImportedPTYSSRoute, results: any, overwriteDuplicates: boolean = false): Promise<void> {
  try {
    // Log detallado de la ruta que se está procesando
    console.log('=== PROCESANDO RUTA PTYSS ===');
    console.log('Datos recibidos:', JSON.stringify(routeData, null, 2));
    console.log('Tipos de datos:', {
      from: typeof routeData.from,
      to: typeof routeData.to,
      containerType: typeof routeData.containerType,
      routeType: typeof routeData.routeType,
      status: typeof routeData.status,
      cliente: typeof routeData.cliente,
      routeArea: typeof routeData.routeArea,
      price: typeof routeData.price
    });

    // Normalizar y validar campos
    const normalizedData = {
      from: String(routeData.from || '').trim().toUpperCase(),
      to: String(routeData.to || '').trim().toUpperCase(),
      containerType: String(routeData.containerType || '').trim().toUpperCase(),
      routeType: String(routeData.routeType || '').trim(), // Mantener original para enum
      status: String(routeData.status || '').trim().toUpperCase(),
      cliente: String(routeData.cliente || '').trim().toUpperCase(),
      routeArea: String(routeData.routeArea || '').trim().toUpperCase(),
      price: Number(routeData.price) || 0
    };

    console.log('Datos normalizados:', JSON.stringify(normalizedData, null, 2));

    // Validar campos requeridos
    const missingFields = [];
    if (!normalizedData.from) missingFields.push('from');
    if (!normalizedData.to) missingFields.push('to');
    if (!normalizedData.containerType) missingFields.push('containerType');
    if (!normalizedData.routeType) missingFields.push('routeType');
    if (!normalizedData.price || normalizedData.price <= 0) missingFields.push('price');
    if (!normalizedData.status) missingFields.push('status');
    if (!normalizedData.cliente) missingFields.push('cliente');
    if (!normalizedData.routeArea) missingFields.push('routeArea');

    if (missingFields.length > 0) {
      results.errors++;
      results.errorsList.push(`Ruta PTYSS con campos faltantes (${missingFields.join(', ')}): ${JSON.stringify(routeData)}`);
      return;
    }

    // Generar nombre de la ruta
    const name = `${normalizedData.from}/${normalizedData.to}`;
    console.log('Nombre generado:', name);

    // Verificar si ya existe una ruta con los mismos datos clave
    const searchCriteria = {
      name,
      from: normalizedData.from,
      to: normalizedData.to,
      containerType: normalizedData.containerType,
      routeType: normalizedData.routeType,
      status: normalizedData.status,
      cliente: normalizedData.cliente,
      routeArea: normalizedData.routeArea
    };

    let existingRoute;
    try {
      console.log('Buscando ruta existente con criterios:', JSON.stringify(searchCriteria, null, 2));
      existingRoute = await PTYSSRoute.findOne(searchCriteria);
      console.log('Resultado de búsqueda:', existingRoute ? 'Encontrada' : 'No encontrada');
    } catch (error) {
      // Si hay error de índice único, intentar buscar de otra manera
      if (error instanceof Error && error.message.includes('duplicate key')) {
        console.log('⚠️ Error de índice único detectado, buscando ruta existente de manera alternativa...');
        existingRoute = await PTYSSRoute.findOne({
          name,
          containerType: normalizedData.containerType,
          routeType: normalizedData.routeType
        });
      } else {
        throw error;
      }
    }

    // Si no se encontró con la búsqueda completa, intentar búsquedas más específicas
    if (!existingRoute) {
      console.log('No encontrada con búsqueda completa, intentando búsqueda alternativa...');
      // Buscar por todos los campos del índice único
      existingRoute = await PTYSSRoute.findOne({
        name,
        from: normalizedData.from,
        to: normalizedData.to,
        containerType: normalizedData.containerType,
        routeType: normalizedData.routeType,
        status: normalizedData.status,
        cliente: normalizedData.cliente,
        routeArea: normalizedData.routeArea
      });
      console.log('Resultado de búsqueda alternativa:', existingRoute ? 'Encontrada' : 'No encontrada');
    }

    if (existingRoute) {
      console.log(`Ruta PTYSS duplicada encontrada:`, {
        searchCriteria,
        existingRoute: {
          _id: existingRoute._id,
          name: existingRoute.name,
          from: existingRoute.from,
          to: existingRoute.to,
          containerType: existingRoute.containerType,
          routeType: existingRoute.routeType,
          status: existingRoute.status,
          cliente: existingRoute.cliente,
          routeArea: existingRoute.routeArea,
          price: existingRoute.price
        },
        newPrice: normalizedData.price
      });

      if (overwriteDuplicates) {
        // Actualizar la ruta existente
        await PTYSSRoute.findByIdAndUpdate(existingRoute._id, {
          name,
          from: normalizedData.from,
          to: normalizedData.to,
          containerType: normalizedData.containerType,
          routeType: normalizedData.routeType,
          price: normalizedData.price,
          status: normalizedData.status,
          cliente: normalizedData.cliente,
          routeArea: normalizedData.routeArea
        });
        results.success++;
        console.log(`Ruta PTYSS actualizada: ${existingRoute._id} con nuevo precio: ${normalizedData.price}`);
      } else {
        results.duplicates++;
        console.log(`Ruta PTYSS marcada como duplicada: ${existingRoute._id}`);
      }
      return;
    }

    // Crear nueva ruta PTYSS
    try {
      console.log('Creando nueva ruta PTYSS con datos:', {
        name,
        from: normalizedData.from,
        to: normalizedData.to,
        containerType: normalizedData.containerType,
        routeType: normalizedData.routeType,
        price: normalizedData.price,
        status: normalizedData.status,
        cliente: normalizedData.cliente,
        routeArea: normalizedData.routeArea
      });

      const newRoute = new PTYSSRoute({
        name,
        from: normalizedData.from,
        to: normalizedData.to,
        containerType: normalizedData.containerType,
        routeType: normalizedData.routeType,
        price: normalizedData.price,
        status: normalizedData.status,
        cliente: normalizedData.cliente,
        routeArea: normalizedData.routeArea
      });

      await newRoute.save();
      results.success++;
      console.log(`Nueva ruta PTYSS creada exitosamente`);
    } catch (saveError) {
      // Si hay error de clave duplicada al guardar, verificar si es realmente un duplicado
      if (saveError instanceof Error && saveError.message.includes('E11000')) {
        console.log(`⚠️ Error de clave duplicada al guardar, verificando si la ruta ya existe...`);

        // Buscar la ruta existente nuevamente
        const duplicateRoute = await PTYSSRoute.findOne(searchCriteria);

        if (duplicateRoute) {
          if (overwriteDuplicates) {
            // Actualizar la ruta existente
            await PTYSSRoute.findByIdAndUpdate(duplicateRoute._id, {
              price: normalizedData.price
            });
            results.success++;
            console.log(`Ruta PTYSS actualizada después de error de clave duplicada: ${duplicateRoute._id} con nuevo precio: ${normalizedData.price}`);
          } else {
            results.duplicates++;
            console.log(`Ruta PTYSS marcada como duplicada después de error de clave duplicada: ${duplicateRoute._id}`);
          }
        } else {
          // Si no se encuentra la ruta, es un error real
          console.error('Error inesperado: clave duplicada pero ruta no encontrada:', saveError);
          throw saveError;
        }
      } else {
        // Si no es un error de clave duplicada, re-lanzar el error
        console.error('Error al guardar nueva ruta PTYSS:', saveError);
        throw saveError;
      }
    }

  } catch (error) {
    results.errors++;
    const errorMessage = `Error procesando ruta PTYSS: ${error instanceof Error ? error.message : 'Error desconocido'}`;
    results.errorsList.push(errorMessage);
    console.error('Error procesando ruta PTYSS:', errorMessage, 'Datos:', JSON.stringify(routeData));
  }
}

export default importPTYSSRoutes;
