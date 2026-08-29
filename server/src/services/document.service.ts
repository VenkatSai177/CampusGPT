import fs from 'fs';
import path from 'path';
import { DocumentModel } from '../models/document.model';
import { ChunkModel } from '../models/chunk.model';
import { PdfService } from './pdf.service';
import { ChunkingService } from './chunking.service';
import { DocumentRecord, DocumentChunkRecord } from '../types';
import { AppError } from '../utils/appError';
import { logger } from '../utils/logger';

export const DocumentService = {
  /**
   * Safely deletes a file from the filesystem if it exists.
   */
  async cleanupTempFile(filePath: string): Promise<void> {
    try {
      if (filePath && fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
        logger.info(`🧹 Temporary file cleaned up: ${filePath}`);
      }
    } catch (err: any) {
      logger.warn(`Failed to delete temp file ${filePath}:`, err.message);
    }
  },

  /**
   * Full Phase 2 Ingestion Pipeline:
   * 1. Create document record ('pending')
   * 2. Set status to 'processing'
   * 3. Parse PDF page-by-page (preserves page_number)
   * 4. Perform recursive page-aware text chunking (1000 chars, 200 overlap)
   * 5. Batch insert chunks into DB
   * 6. Set status to 'indexed'
   * 7. Clean up temporary file
   */
  async ingestDocument(
    file: { originalname: string; path: string; size: number; mimetype?: string },
    adminUserId: string
  ): Promise<{ document: DocumentRecord; total_chunks: number }> {
    const title = path.parse(file.originalname).name.replace(/_/g, ' ');
    const filename = file.originalname;

    logger.info(`📥 Starting Document Ingestion Pipeline for: "${filename}" (${file.size} bytes)`);

    // Step 1: Create initial document record with status 'pending'
    const doc = await DocumentModel.create({
      title,
      filename,
      file_size: file.size,
      mime_type: file.mimetype || 'application/pdf',
      uploaded_by: adminUserId,
    });

    try {
      // Step 2: Update status to 'processing'
      await DocumentModel.updateStatus(doc.id, 'processing');

      // Step 3: Read file buffer and parse PDF pages
      if (!fs.existsSync(file.path)) {
        throw new AppError('Uploaded PDF file could not be found on server storage.', 400);
      }

      const pdfBuffer = await fs.promises.readFile(file.path);
      const parsedPages = await PdfService.parsePdfPages(pdfBuffer);

      // Step 4: Recursive page-aware character chunking
      const preparedChunks = ChunkingService.createDocumentChunks(
        parsedPages,
        doc.id,
        title,
        filename,
        { chunkSize: 1000, chunkOverlap: 200 }
      );

      if (preparedChunks.length === 0) {
        throw new AppError('Failed to generate chunks from extracted document text.', 400);
      }

      // Step 5: Store chunks in database
      const storedChunks = await ChunkModel.createMany(doc.id, preparedChunks);

      // Step 6: Update document record to 'indexed'
      const updatedDoc = await DocumentModel.updateStatus(doc.id, 'indexed', {
        total_pages: parsedPages.length,
        total_chunks: storedChunks.length,
        error_message: null,
      });

      logger.info(`✅ Ingestion Complete: Document "${doc.title}" [ID: ${doc.id}] marked 'indexed' (${parsedPages.length} pages, ${storedChunks.length} chunks).`);

      // Step 7: Clean up temp file
      await this.cleanupTempFile(file.path);

      return {
        document: updatedDoc || doc,
        total_chunks: storedChunks.length,
      };
    } catch (error: any) {
      // Step 8: Handle processing failure gracefully
      const errorMessage = error.message || 'Unknown error occurred during document processing.';
      logger.error(`❌ Ingestion Failed for Document [ID: ${doc.id}]:`, errorMessage);

      // Purge any partial chunks
      await ChunkModel.deleteByDocumentId(doc.id);

      // Update status to 'failed'
      await DocumentModel.updateStatus(doc.id, 'failed', {
        error_message: errorMessage,
      });

      // Cleanup file
      await this.cleanupTempFile(file.path);

      throw new AppError(`Document Ingestion Failed: ${errorMessage}`, error.statusCode || 500);
    }
  },

  async getAllDocuments(): Promise<DocumentRecord[]> {
    return DocumentModel.findAll();
  },

  async getDocumentDetails(id: string): Promise<{ document: DocumentRecord; chunks: DocumentChunkRecord[] }> {
    const document = await DocumentModel.findById(id);
    if (!document) {
      throw new AppError('Document not found.', 404);
    }

    const chunks = await ChunkModel.findByDocumentId(id);
    return { document, chunks };
  },

  async deleteDocument(id: string): Promise<boolean> {
    const doc = await DocumentModel.findById(id);
    if (!doc) {
      throw new AppError('Document not found.', 404);
    }

    // 1. Delete associated chunk records
    const deletedChunksCount = await ChunkModel.deleteByDocumentId(id);
    logger.info(`🗑️ Purged ${deletedChunksCount} chunks for document ID: ${id}`);

    // 2. Delete document record
    const deleted = await DocumentModel.delete(id);

    return deleted;
  },
};
