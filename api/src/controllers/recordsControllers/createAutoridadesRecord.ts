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

export async function createAutoridadesRecord(req: AuthenticatedRequest, res: Response) {
  try {
    const data = req.body;
    // Validar campos obligatorios
    const requiredFields = [
      'order', 'nombreListado', 'no', 'container', 'size', 'type', 'weight', 'pol', 'blNo', 'notf', 'seal', 'fromVslVoy', 'commodity', 'tramite', 'ruta', 'dateOfInvoice', 'noInvoice'
    ];
    for (const field of requiredFields) {
      if (!data[field]) {
        return res.status(400).json({ error: `Falta el campo obligatorio: ${field}` });
      }
    }
    // Crear registro
    const record = await recordsAutoridades.create({
      ...data,
      status: data.status || 'cargado',
    });
    res.status(201).json(record);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

