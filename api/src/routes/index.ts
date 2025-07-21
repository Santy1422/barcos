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
import navieras from './navieras';
import services from './services';

router.use('/api/user', user);
router.use('/api/clients', clients);
router.use('/api/invoices', invoices);
router.use('/api/records', records);
router.use('/api/excel-files', excelFiles);
router.use('/api/config', config);
router.use('/api/dashboard', dashboard);
router.use('/api/trucking-routes', truckingRoutes);
router.use('/api/ptyss-routes', ptyssRoutes);
router.use('/api/navieras', navieras);
router.use('/api/services', services);

export default router;
