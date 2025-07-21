import { Request, Response } from "express";
import mongoose from "mongoose";
import ptyssRouteSchema from "../../database/schemas/ptyssRouteSchema";
import { response } from "../../utils";

const PTYSSRoute = mongoose.model('PTYSSRoute', ptyssRouteSchema);

const deletePTYSSRoute = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    console.log('Eliminando ruta de PTYSS:', id);
    
    const deleted = await PTYSSRoute.findByIdAndDelete(id);
    if (!deleted) {
      return response(res, 404, { message: 'Ruta de PTYSS no encontrada' });
    }
    
    console.log('Ruta eliminada exitosamente:', deleted);
    return response(res, 200, { 
      message: 'Ruta de PTYSS eliminada',
      data: deleted
    });
  } catch (error) {
    console.error('Error eliminando ruta de PTYSS:', error);
    return response(res, 500, { 
      message: 'Error interno del servidor al eliminar ruta de PTYSS',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

export default deletePTYSSRoute; 