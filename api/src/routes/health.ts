import { Router } from 'express';
import healthCheck from '../controllers/healthController';
import { catchedAsync } from '../utils';

const router = Router();

router.get('/', catchedAsync(healthCheck));

export default router; 