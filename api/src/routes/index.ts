import { Router } from 'express';
const router = Router();
import user from './user';
import clients from './clients';
import invoices from './invoices';
import records from './records';
import excelFiles from './excelFiles';
import config from './config';
import dashboard from './dashboard';
import truckingRoutes from './truckingRoutes';
import ptyssRoutes from './ptyssRoutes';
import ptyssLocalRoutes from './ptyssLocalRoutes';
import localServices from './localServices';
import navieras from './navieras';
import services from './services';
import health from './health';
import seed from './seed';
import agencyRoutes from './agencyRoutes';
import agencyCatalogsRoutes from './agencyCatalogsRoutes';
import agencyFileRoutes from './agencyFileRoutes';
import agencySapRoutes from './agencySapRoutes';
import agencyPricingConfigRoutes from './agencyPricingConfigRoutes';
import agencyRouteRoutes from './agencyRouteRoutes';
import agencyInvoicesRoutes from './agencyInvoicesRoutes';
import analyticsRoutes from './analyticsRoutes';
import errorLogs from './errorLogs';

router.use('/api/user', user);
router.use('/api/clients', clients);
router.use('/api/invoices', invoices);
router.use('/api/records', records);
router.use('/api/excel-files', excelFiles);
router.use('/api/config', config);
router.use('/api/dashboard', dashboard);
router.use('/api/trucking-routes', truckingRoutes);
router.use('/api/ptyss-routes', ptyssRoutes);
router.use('/api/ptyss-local-routes', ptyssLocalRoutes);
router.use('/api/local-services', localServices);
router.use('/api/navieras', navieras);
router.use('/api/services', services);
router.use('/api/health', health);
router.use('/api/seed', seed);

// Agency routes
router.use('/api/agency/services', agencyRoutes);
router.use('/api/agency/catalogs', agencyCatalogsRoutes);
router.use('/api/agency/files', agencyFileRoutes);
router.use('/api/agency/sap', agencySapRoutes);
router.use('/api/agency/pricing-config', agencyPricingConfigRoutes);
router.use('/api/agency/routes', agencyRouteRoutes);
router.use('/api/agency/invoices', agencyInvoicesRoutes);

// Analytics routes for Power BI
router.use('/api/analytics', analyticsRoutes);

// Error logs
router.use('/api/errors', errorLogs);

export default router;
