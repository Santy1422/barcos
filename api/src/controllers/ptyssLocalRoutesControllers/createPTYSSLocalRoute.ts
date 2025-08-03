import { Request, Response } from "express";
import mongoose from "mongoose";
import ptyssLocalRouteSchema from "../../database/schemas/ptyssLocalRouteSchema";
import { response } from "../../utils";

const PTYSSLocalRoute = mongoose.model('PTYSSLocalRoute', ptyssLocalRouteSchema);

const createPTYSSLocalRoute = async (req: Request, res: Response) => {
  try {
    const { clientName, realClientId, from, to, price, priceRegular, priceReefer } = req.body;

    // Validar nuevos campos de precio o campo legacy
    const hasNewPrices = priceRegular !== undefined && priceReefer !== undefined;
    const hasLegacyPrice = price !== undefined;
    
    if (!clientName || !from || !to || (!hasNewPrices && !hasLegacyPrice)) {
      return response(res, 400, { message: 'Todos los campos son requeridos (clientName, from, to, y precios)' });
    }

    // Validar que los precios sean válidos
    if (hasNewPrices && (priceRegular < 0 || priceReefer < 0)) {
      return response(res, 400, { message: 'Los precios deben ser mayores o iguales a 0' });
    }
    
    if (hasLegacyPrice && price < 0) {
      return response(res, 400, { message: 'El precio debe ser mayor o igual a 0' });
    }

    // Validar que el nombre del esquema no esté vacío y sea válido
    if (!clientName.trim() || clientName.trim().length < 3) {
      return response(res, 400, { 
        message: 'El nombre del esquema debe tener al menos 3 caracteres' 
      });
    }

    // Verificar si ya existe una ruta para este esquema con el mismo origen y destino
    const existingRoute = await PTYSSLocalRoute.findOne({ 
      clientName, 
      from, 
      to 
    });
    if (existingRoute) {
      return response(res, 400, { 
        message: `Ya existe una ruta para ${clientName} con origen "${from}" y destino "${to}"` 
      });
    }

    // Validar realClientId si se proporciona
    if (realClientId && !mongoose.Types.ObjectId.isValid(realClientId)) {
      return response(res, 400, { message: 'ID de cliente real inválido' });
    }

    // Eliminar ruta placeholder si existe para este esquema
    await PTYSSLocalRoute.deleteOne({ 
      clientName, 
      from: '__PLACEHOLDER__', 
      to: '__PLACEHOLDER__' 
    });

    // Preparar datos para la nueva ruta
    const routeData: any = { clientName, realClientId, from, to };
    
    if (hasNewPrices) {
      // Usar nuevos campos de precio
      routeData.priceRegular = priceRegular;
      routeData.priceReefer = priceReefer;
      routeData.price = priceRegular; // Usar precio regular como fallback para compatibilidad
    } else {
      // Usar precio legacy
      routeData.price = price;
      routeData.priceRegular = price;
      routeData.priceReefer = price;
    }
    
    const newRoute = new PTYSSLocalRoute(routeData);
    await newRoute.save();

    console.log(`Ruta real creada para ${clientName}, placeholder eliminado automáticamente`);

    return response(res, 201, { 
      message: 'Ruta local de PTYSS creada exitosamente',
      data: newRoute
    });
  } catch (error) {
    console.error('Error creando ruta local de PTYSS:', error);
    return response(res, 500, { 
      message: 'Error interno del servidor al crear ruta local de PTYSS',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

export default createPTYSSLocalRoute; 