import { Request, Response } from 'express';
import { recordsAutoridades } from '../../database';
import { response } from '../../utils';

// Extender la interfaz Request para incluir user
interface AuthenticatedRequest extends Request {
  user?: {
    _id: string;
    id: string;
    mongoId: string;
    email: string;
    name: string;
    role: string;
    modules: string[];
    isActive: boolean;
  };
}

export async function updateAutoridadesRecord(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    console.log(`🔍 Actualizando registro de autoridades ${id} con datos:`, updateData);
    
    if (!id) {
      return response(res, 400, { error: 'ID del registro es requerido' });
    }
    
    const record = await recordsAutoridades.findByIdAndUpdate(
      id,
      { ...updateData, updatedAt: new Date() },
      { new: true }
    );
    
    if (!record) {
      console.log(`❌ Registro de autoridades ${id} no encontrado`);
      return response(res, 404, { error: 'Registro no encontrado' });
    }
    
    console.log(`✅ Registro de autoridades ${id} actualizado exitosamente`);
    return response(res, 200, record);
  } catch (error) {
    console.error('Error updating autoridades record:', error);
    return response(res, 500, { 
      error: 'Error al actualizar registro de autoridades',
      details: error.message 
    });
  }
}
