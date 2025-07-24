import { Request, Response } from "express";
import { response } from "../utils";

const healthCheck = async (req: Request, res: Response) => {
  try {
    return response(res, 200, { 
      message: 'API is running',
      timestamp: new Date().toISOString(),
      status: 'healthy'
    });
  } catch (error) {
    return response(res, 500, { 
      message: 'API health check failed',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

export default healthCheck; 