import { Router } from 'express';
import excelFilesControllers from '../controllers/excelFilesControllers/excelFilesControllers';
import { jwtUtils } from "../middlewares/jwtUtils";
import { requireAnyRole } from '../middlewares/authorization';

const { catchedAsync } = require('../utils');
const router = Router();

router.post('/upload', jwtUtils, requireAnyRole, catchedAsync(excelFilesControllers.uploadExcelFile));
router.get('/', jwtUtils, requireAnyRole, catchedAsync(excelFilesControllers.getAllExcelFiles));
router.get('/module/:module', jwtUtils, requireAnyRole, catchedAsync(excelFilesControllers.getExcelFilesByModule));
router.get('/:id', jwtUtils, requireAnyRole, catchedAsync(excelFilesControllers.getExcelFileById));
router.delete('/:id', jwtUtils, requireAnyRole, catchedAsync(excelFilesControllers.deleteExcelFile));

export default router;