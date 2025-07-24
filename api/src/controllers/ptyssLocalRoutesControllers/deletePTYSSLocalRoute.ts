import { Request, Response } from "express";
import mongoose from "mongoose";
import ptyssLocalRouteSchema from "../../database/schemas/ptyssLocalRouteSchema";
import { response } from "../../utils";

const PTYSSLocalRoute = mongoose.model('PTYSSLocalRoute', ptyssLocalRouteSchema);

const deletePTYSSLocalRoute = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    console.log('Eliminando ruta local de PTYSS:', id);
    
    const deleted = await PTYSSLocalRoute.findByIdAndDelete(id);
    if (!deleted) {
      return response(res, 404, { message: 'Ruta local de PTYSS no encontrada' });
    }
    
    console.log('Ruta local eliminada exitosamente:', deleted);
    return response(res, 200, { 
      message: 'Ruta local de PTYSS eliminada',
      data: deleted
    });
  } catch (error) {
    console.error('Error eliminando ruta local de PTYSS:', error);
    return response(res, 500, { 
      message: 'Error interno del servidor al eliminar ruta local de PTYSS',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

export default deletePTYSSLocalRoute; 