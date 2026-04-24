import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { validateBody } from '../middleware/validation';
import { requireAuth } from '../middleware/auth';
import { RegisterSchema, LoginSchema } from '../utils/schemas';

const router = Router();

// POST /api/auth/register
router.post('/register', validateBody(RegisterSchema), authController.register);

// POST /api/auth/login
router.post('/login', validateBody(LoginSchema), authController.login);

// POST /api/auth/logout
router.post('/logout', authController.logout);

// GET /api/auth/me
router.get('/me', requireAuth, authController.getCurrentUser);

export default router;
