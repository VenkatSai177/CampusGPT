import { Request, Response, NextFunction } from 'express';
import { DocumentService } from '../services/document.service';
import { DocumentModel } from '../models/document.model';
import { ChunkModel } from '../models/chunk.model';
import { EvaluationService } from '../services/evaluation.service';
import { supabaseClient as supabase } from '../config/db';
import { AppError } from '../utils/appError';

/**
 * GET /api/admin/stats
 * Provides aggregated system stats for the Admin Portal dashboard
 */
export const getAdminStatsController = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const docs = await DocumentModel.findAll();
    const totalDocs = docs.length;
    const totalPages = docs.reduce((sum, d) => sum + (d.total_pages || 0), 0);
    const totalChunks = docs.reduce((sum, d) => sum + (d.total_chunks || 0), 0);

    let totalConversations = 0;
    let totalMessages = 0;
    let totalFeedbackLikes = 0;
    let totalFeedbackDislikes = 0;

    if (supabase) {
      const { count: cCount } = await supabase.from('conversations').select('*', { count: 'exact', head: true });
      totalConversations = cCount || 0;

      const { count: mCount } = await supabase.from('messages').select('*', { count: 'exact', head: true });
      totalMessages = mCount || 0;

      const { count: lCount } = await supabase.from('messages').select('*', { count: 'exact', head: true }).eq('feedback', 'like');
      totalFeedbackLikes = lCount || 0;

      const { count: dCount } = await supabase.from('messages').select('*', { count: 'exact', head: true }).eq('feedback', 'dislike');
      totalFeedbackDislikes = dCount || 0;
    } else {
      // Mock Fallback stats
      totalConversations = 5;
      totalMessages = 18;
      totalFeedbackLikes = 12;
      totalFeedbackDislikes = 2;
    }

    const totalFeedback = totalFeedbackLikes + totalFeedbackDislikes;
    const positivePercentage = totalFeedback > 0 ? Math.round((totalFeedbackLikes / totalFeedback) * 100) : 100;

    res.status(200).json({
      success: true,
      stats: {
        total_documents: totalDocs,
        total_pages: totalPages,
        total_chunks: totalChunks,
        total_conversations: totalConversations,
        total_messages: totalMessages,
        total_feedback: totalFeedback,
        feedback_likes: totalFeedbackLikes,
        feedback_dislikes: totalFeedbackDislikes,
        positive_feedback_percentage: positivePercentage,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const uploadDocumentController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.file) {
      throw new AppError('No PDF file uploaded. Please select a valid PDF document.', 400);
    }

    const uploadedBy = req.user?.userId || 'unknown-admin';

    const result = await DocumentService.ingestDocument(req.file, uploadedBy);

    res.status(201).json({
      success: true,
      message: 'Document successfully uploaded and indexed for vector search.',
      document: result.document,
      total_chunks: result.total_chunks,
    });
  } catch (error) {
    next(error);
  }
};

export const getDocumentsController = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const documents = await DocumentModel.findAll();
    res.status(200).json({
      success: true,
      documents,
    });
  } catch (error) {
    next(error);
  }
};

export const getDocumentByIdController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = req.params.id as string;
    const document = await DocumentModel.findById(id);

    if (!document) {
      throw new AppError('Document not found.', 404);
    }

    const chunks = await ChunkModel.findByDocumentId(id);

    res.status(200).json({
      success: true,
      document,
      chunks,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/admin/documents/:id
 * Purges document record, chunks, and embeddings safely.
 */
export const deleteDocumentController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = req.params.id as string;
    const document = await DocumentModel.findById(id);

    if (!document) {
      throw new AppError('Document not found.', 404);
    }

    // 1. Purge all chunks and vectors for this document
    await ChunkModel.deleteByDocumentId(id);

    // 2. Delete the document record
    const deleted = await DocumentModel.delete(id);

    if (!deleted) {
      throw new AppError('Failed to delete document from database.', 500);
    }

    res.status(200).json({
      success: true,
      message: `Document "${document.title}" and all associated vectors were permanently deleted.`,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/admin/evaluation/run
 */
export const runEvaluationController = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const summary = await EvaluationService.runEvaluation();
    res.status(200).json({
      success: true,
      summary,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/evaluation/results
 */
export const getEvaluationResultsController = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const summary = await EvaluationService.getLatestResults();
    res.status(200).json({
      success: true,
      summary,
    });
  } catch (error) {
    next(error);
  }
};
