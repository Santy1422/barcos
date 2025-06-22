import { Router } from 'express';
const router = Router();
import user from './user';
import clients from './clients';
import invoices from './invoices';
import records from './records';
import excelFiles from './excelFiles';
import config from './config';
import dashboard from './dashboard';

router.use('/user', user);
router.use('/clients', clients);
router.use('/invoices', invoices);
router.use('/records', records);
router.use('/excel-files', excelFiles);
router.use('/config', config);
router.use('/dashboard', dashboard);

export default router;
