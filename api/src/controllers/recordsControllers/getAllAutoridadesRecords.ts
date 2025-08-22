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

export async function getAllAutoridadesRecords(req: AuthenticatedRequest, res: Response) {
  try {
    const records = await recordsAutoridades.find().sort({ createdAt: -1 });
    res.json(records);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}


