import { Request, Response } from 'express';
import { recordsAutoridades } from '../../database';

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

export async function deleteAutoridadesRecord(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const deleted = await recordsAutoridades.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ error: 'Registro no encontrado' });
    }
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}


