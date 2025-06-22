import { Router } from 'express'
import usersControllers from '../controllers/usersControllers/usersControllers';
import {jwtUtils} from "../middlewares/jwtUtils";


const { catchedAsync } = require('../utils');

const router = Router();

router.post('/login', catchedAsync(usersControllers.login));


router.post(`/register`, catchedAsync(usersControllers.register))

router.post(`/reloadUser`,  jwtUtils, catchedAsync(usersControllers.reloadUser))


export default router;
