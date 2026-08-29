import { Request, Response, NextFunction } from 'express';
import { DocumentService } from '../services/document.service';

export const uploadDocumentController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, message: 'No PDF file attached to request.' });
      return;
    }

    const adminUserId = req.user?.userId || 'admin-system';
    const result = await DocumentService.ingestDocument(req.file, adminUserId);

    res.status(201).json({
      success: true,
      message: 'Document ingested and processed successfully into page-aware text chunks.',
      document: result.document,
      total_chunks: result.total_chunks,
    });
  } catch (error) {
    next(error);
  }
};

export const getDocumentsController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const documents = await DocumentService.getAllDocuments();
    res.status(200).json({
      success: true,
      count: documents.length,
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
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const result = await DocumentService.getDocumentDetails(id);

    res.status(200).json({
      success: true,
      document: result.document,
      chunk_count: result.chunks.length,
      chunks: result.chunks,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteDocumentController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    await DocumentService.deleteDocument(id);

    res.status(200).json({
      success: true,
      message: 'Document and associated page chunks successfully deleted.',
      id,
    });
  } catch (error) {
    next(error);
  }
};
