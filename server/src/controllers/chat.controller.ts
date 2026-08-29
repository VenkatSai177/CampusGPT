import { Request, Response, NextFunction } from 'express';
import { RAGService } from '../services/rag.service';
import { AppError } from '../utils/appError';

export const chatQueryController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { query } = req.body;

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      throw new AppError('Please provide a valid question in the "query" field.', 400);
    }

    const result = await RAGService.processQuery(query);

    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
};
