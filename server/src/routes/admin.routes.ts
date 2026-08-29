import { Router } from 'express';
import {
  getAdminStatsController,
  uploadDocumentController,
  getDocumentsController,
  getDocumentByIdController,
  deleteDocumentController,
  runEvaluationController,
  getEvaluationResultsController,
} from '../controllers/admin.controller';
import { testRetrievalController } from '../controllers/retrieval.controller';
import { requireAuth } from '../middleware/authMiddleware';
import { requireAdmin } from '../middleware/adminGuard';
import { handleFileUpload } from '../middleware/uploadMiddleware';

const router = Router();

// Protect all admin endpoints with JWT auth and Admin Role guard
router.use(requireAuth);
router.use(requireAdmin);

// System Stats
router.get('/stats', getAdminStatsController);

// Document Ingestion & Management
router.post('/documents', handleFileUpload, uploadDocumentController);
router.get('/documents', getDocumentsController);
router.get('/documents/:id', getDocumentByIdController);
router.delete('/documents/:id', deleteDocumentController);

// Diagnostic Retrieval & Benchmark Evaluation
router.post('/retrieval/test', testRetrievalController);
router.post('/evaluation/run', runEvaluationController);
router.get('/evaluation/results', getEvaluationResultsController);

export default router;
