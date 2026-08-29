import { Router, Request, Response } from 'express';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    system: 'CampusGPT Backend API',
    phase: 'Phase 4 - Grounded RAG Pipeline',
    timestamp: new Date().toISOString(),
  });
});

export default router;
