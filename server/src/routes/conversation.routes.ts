import { Router } from 'express';
import {
  createConversationController,
  getConversationsController,
  getConversationByIdController,
  deleteConversationController,
  updateMessageFeedbackController,
} from '../controllers/conversation.controller';
import { requireAuth } from '../middleware/authMiddleware';

const router = Router();

// Require authenticated user for all conversation routes
router.use(requireAuth);

router.post('/conversations', createConversationController);
router.get('/conversations', getConversationsController);
router.get('/conversations/:id', getConversationByIdController);
router.delete('/conversations/:id', deleteConversationController);

// Feedback route on messages
router.patch('/messages/:id/feedback', updateMessageFeedbackController);

export default router;
