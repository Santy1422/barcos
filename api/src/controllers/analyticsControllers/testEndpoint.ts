import { Request, Response } from 'express';

export default async (req: Request, res: Response) => {
  try {
    return res.json({
      success: true,
      message: 'Analytics API is working!',
      timestamp: new Date().toISOString(),
      endpoints: [
        'GET /api/analytics/trucking',
        'GET /api/analytics/agency', 
        'GET /api/analytics/ptyss',
        'GET /api/analytics/shipchandler',
        'GET /api/analytics/clients',
        'GET /api/analytics/invoices',
        'GET /api/analytics/metrics',
        'GET /api/analytics/revenue',
        'GET /api/analytics/operational'
      ],
      queryParams: req.query,
      headers: {
        'x-api-key': req.headers['x-api-key'] ? 'present' : 'missing',
        'authorization': req.headers.authorization ? 'present' : 'missing'
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Test endpoint error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};