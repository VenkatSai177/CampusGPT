import { Router } from 'express';
import { registerController, loginController, getMeController } from '../controllers/auth.controller';
import { requireAuth } from '../middleware/authMiddleware';

const router = Router();

// Public auth endpoints
router.post('/register', registerController);
router.post('/login', loginController);

// Protected auth endpoint
router.get('/me', requireAuth, getMeController);

export default router;
