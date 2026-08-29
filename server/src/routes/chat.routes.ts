import { Router } from 'express';
import { chatQueryController } from '../controllers/chat.controller';
import { requireAuth } from '../middleware/authMiddleware';

const router = Router();

// Protect RAG Chat query endpoint with JWT authentication (students and admins allowed)
router.use(requireAuth);

router.post('/', chatQueryController);

export default router;
