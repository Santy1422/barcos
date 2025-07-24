import { Router } from 'express';
import seedPTYSSLocalRoutes from '../controllers/seedController';
import { catchedAsync } from '../utils';

const router = Router();

router.post('/ptyss-local-routes', catchedAsync(seedPTYSSLocalRoutes));

export default router; 