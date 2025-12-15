import { Router } from 'express';
import { 
  biAuthMiddleware,
  biRateLimiter,
  biCacheMiddleware,
  validateAnalyticsParams
} from '../middleware/biAuthMiddleware';
import { 
  getTruckingAnalytics,
  getAgencyAnalytics,
  getPTYSSAnalytics,
  getShipChandlerAnalytics,
  getMetricsSummary,
  getClientAnalytics,
  getInvoiceAnalytics,
  getRevenueAnalytics,
  getOperationalMetrics
} from '../controllers/analyticsControllers/analyticsControllers';

const router = Router();

// Aplicar rate limiting a todas las rutas
router.use(biRateLimiter);

// Endpoints principales de datos (con caché de 5 minutos)
router.get('/trucking', 
  biAuthMiddleware, 
  validateAnalyticsParams,
  biCacheMiddleware(300),
  getTruckingAnalytics
);

router.get('/agency', 
  biAuthMiddleware, 
  validateAnalyticsParams,
  biCacheMiddleware(300),
  getAgencyAnalytics
);

router.get('/ptyss', 
  biAuthMiddleware, 
  validateAnalyticsParams,
  biCacheMiddleware(300),
  getPTYSSAnalytics
);

router.get('/shipchandler', 
  biAuthMiddleware, 
  validateAnalyticsParams,
  biCacheMiddleware(300),
  getShipChandlerAnalytics
);

// Endpoints de análisis específicos (con caché de 10 minutos)
router.get('/clients', 
  biAuthMiddleware, 
  validateAnalyticsParams,
  biCacheMiddleware(600),
  getClientAnalytics
);

router.get('/invoices', 
  biAuthMiddleware, 
  validateAnalyticsParams,
  biCacheMiddleware(300),
  getInvoiceAnalytics
);

// Métricas agregadas y KPIs (con caché de 3 minutos)
router.get('/metrics', 
  biAuthMiddleware, 
  validateAnalyticsParams,
  biCacheMiddleware(180),
  getMetricsSummary
);

router.get('/revenue', 
  biAuthMiddleware, 
  validateAnalyticsParams,
  biCacheMiddleware(180),
  getRevenueAnalytics
);

router.get('/operational', 
  biAuthMiddleware, 
  validateAnalyticsParams,
  biCacheMiddleware(180),
  getOperationalMetrics
);

export default router;