import { Request, Response, NextFunction } from 'express';
import { VectorService } from '../services/vector.service';
import { AppError } from '../utils/appError';

export const testRetrievalController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { query, top_k, threshold } = req.body;

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      throw new AppError('Please provide a valid text string for the "query" field.', 400);
    }

    const searchResponse = await VectorService.searchRelevantChunks(query, {
      topK: top_k ? parseInt(top_k, 10) : undefined,
      threshold: threshold !== undefined ? parseFloat(threshold) : undefined,
    });

    res.status(200).json({
      success: true,
      ...searchResponse,
    });
  } catch (error) {
    next(error);
  }
};
