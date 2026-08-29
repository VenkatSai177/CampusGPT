import { Router } from 'express';
import {
  uploadDocumentController,
  getDocumentsController,
  getDocumentByIdController,
  deleteDocumentController,
} from '../controllers/admin.controller';
import { requireAuth } from '../middleware/authMiddleware';
import { requireAdmin } from '../middleware/adminGuard';
import { handleFileUpload } from '../middleware/uploadMiddleware';

const router = Router();

// Protect all admin document management routes with JWT auth and Admin Role guard
router.use(requireAuth);
router.use(requireAdmin);

router.post('/documents', handleFileUpload, uploadDocumentController);
router.get('/documents', getDocumentsController);
router.get('/documents/:id', getDocumentByIdController);
router.delete('/documents/:id', deleteDocumentController);

export default router;
