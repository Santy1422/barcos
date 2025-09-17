import { Request, Response } from "express";
import { response } from "../../utils";
import mongoose from "mongoose";
import truckingRouteSchema from "../../database/schemas/truckingRouteSchema";

const fixIndexes = async (req: Request, res: Response) => {
  try {
    // Obtener el modelo de TruckingRoute
    const TruckingRoute = mongoose.model('TruckingRoute', truckingRouteSchema);
    
    console.log('Eliminando índices existentes...');
    
    // Listar todos los índices existentes
    const existingIndexes = await TruckingRoute.collection.listIndexes().toArray();
    console.log('Índices existentes:', existingIndexes.map(idx => ({ name: idx.name, key: idx.key, unique: idx.unique })));
    
    // Eliminar todos los índices únicos existentes
    for (const index of existingIndexes) {
      if (index.unique && index.name !== '_id_') {
        try {
          await TruckingRoute.collection.dropIndex(index.name);
          console.log(`Índice eliminado: ${index.name}`);
        } catch (error) {
          console.log(`Error eliminando índice ${index.name}:`, error.message);
        }
      }
    }

    // Crear el nuevo índice único correcto
    console.log('Creando nuevo índice único...');
    try {
      await TruckingRoute.collection.createIndex(
        { 
          name: 1, 
          origin: 1, 
          destination: 1, 
          containerType: 1, 
          routeType: 1, 
          status: 1, 
          cliente: 1, 
          routeArea: 1, 
          sizeContenedor: 1
        },
        { 
          unique: true,
          name: 'unique_route_complete'
        }
      );
      console.log('Nuevo índice único creado correctamente');
    } catch (error) {
      if (error.code === 85) { // IndexOptionsConflict
        console.log('El índice ya existe con la estructura correcta, continuando...');
      } else {
        throw error;
      }
    }
    
    console.log('Nuevo índice único creado correctamente');
    
    // Listar todos los índices para verificar
    const indexes = await TruckingRoute.collection.listIndexes().toArray();
    console.log('Índices actuales:', indexes.map(idx => ({ name: idx.name, key: idx.key, unique: idx.unique })));
    
    return response(res, 200, {
      message: 'Índices corregidos exitosamente',
      data: {
        indexes: indexes.map(idx => ({ name: idx.name, key: idx.key, unique: idx.unique }))
      }
    });

  } catch (error) {
    console.error('Error corrigiendo índices:', error);
    return response(res, 500, {
      message: 'Error interno del servidor al corregir índices',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

export default fixIndexes;
