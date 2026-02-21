import { Router } from 'express';
import { jwtUtils } from '../middlewares/jwtUtils';
import {
  getTruckingAnalytics,
  getAgencyAnalytics,
  getPTYSSAnalytics,
  getShipChandlerAnalytics,
  getMetricsSummary,
  getClientAnalytics,
  getInvoiceAnalytics,
  getRevenueAnalytics,
  getOperationalMetrics,
  getAdvancedAnalytics,
  getForecastingAnalytics,
  getModuleComparison,
  getAlertsAnalytics,
  getEfficiencyRankings,
  exportAnalyticsToExcel
} from '../controllers/analyticsControllers/analyticsControllers';

const router = Router();

// Usar el mismo middleware JWT que el resto de la aplicación
// Todos los endpoints requieren autenticación

// Endpoints principales de datos
router.get('/trucking', jwtUtils, getTruckingAnalytics);
router.get('/agency', jwtUtils, getAgencyAnalytics);
router.get('/ptyss', jwtUtils, getPTYSSAnalytics);
router.get('/shipchandler', jwtUtils, getShipChandlerAnalytics);

// Endpoints de análisis específicos
router.get('/clients', jwtUtils, getClientAnalytics);
router.get('/invoices', jwtUtils, getInvoiceAnalytics);

// Métricas agregadas y KPIs
router.get('/metrics', jwtUtils, getMetricsSummary);
router.get('/revenue', jwtUtils, getRevenueAnalytics);
router.get('/operational', jwtUtils, getOperationalMetrics);
router.get('/advanced', jwtUtils, getAdvancedAnalytics);

// Nuevos endpoints avanzados
router.get('/forecasting', jwtUtils, getForecastingAnalytics);
router.get('/module-comparison', jwtUtils, getModuleComparison);
router.get('/alerts', jwtUtils, getAlertsAnalytics);
router.get('/efficiency-rankings', jwtUtils, getEfficiencyRankings);

// Export a Excel
router.get('/export', jwtUtils, exportAnalyticsToExcel);

export default router;
