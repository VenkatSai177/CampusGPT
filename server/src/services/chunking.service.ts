import { ParsedPdfPage, DocumentChunkMetadata } from '../types';
import { logger } from '../utils/logger';

export interface ChunkingOptions {
  chunkSize?: number;
  chunkOverlap?: number;
  separators?: string[];
}

export interface PreparedChunk {
  chunk_index: number;
  page_number: number;
  content: string;
  metadata: DocumentChunkMetadata;
}

export const ChunkingService = {
  /**
   * Recursively splits a string of text using a list of hierarchical separators.
   */
  splitTextRecursively(
    text: string,
    chunkSize: number,
    chunkOverlap: number,
    separators: string[] = ['\n\n', '\n', '. ', ' ', '']
  ): string[] {
    if (!text || text.trim().length === 0) return [];
    if (text.length <= chunkSize) return [text.trim()];

    let selectedSeparator = '';
    for (const sep of separators) {
      if (sep === '' || text.includes(sep)) {
        selectedSeparator = sep;
        break;
      }
    }

    const splits = selectedSeparator === '' ? text.split('') : text.split(selectedSeparator);
    const chunks: string[] = [];
    let currentChunk = '';

    for (const piece of splits) {
      const candidate = currentChunk
        ? `${currentChunk}${selectedSeparator}${piece}`
        : piece;

      if (candidate.length <= chunkSize) {
        currentChunk = candidate;
      } else {
        if (currentChunk.trim().length > 0) {
          chunks.push(currentChunk.trim());
        }

        // If piece itself is larger than chunkSize, sub-split it recursively with the next separator
        if (piece.length > chunkSize) {
          const nextSeparators = separators.slice(separators.indexOf(selectedSeparator) + 1);
          if (nextSeparators.length > 0) {
            const subChunks = ChunkingService.splitTextRecursively(
              piece,
              chunkSize,
              chunkOverlap,
              nextSeparators
            );
            chunks.push(...subChunks);
            currentChunk = '';
          } else {
            // Fallback hard split
            let start = 0;
            while (start < piece.length) {
              chunks.push(piece.slice(start, start + chunkSize).trim());
              start += chunkSize - chunkOverlap;
            }
            currentChunk = '';
          }
        } else {
          // Calculate overlap window from previous chunk
          if (chunkOverlap > 0 && currentChunk.length > chunkOverlap) {
            const overlapText = currentChunk.slice(currentChunk.length - chunkOverlap);
            currentChunk = `${overlapText}${selectedSeparator}${piece}`;
          } else {
            currentChunk = piece;
          }
        }
      }
    }

    if (currentChunk.trim().length > 0) {
      chunks.push(currentChunk.trim());
    }

    return chunks.filter((c) => c.length > 0);
  },

  /**
   * Splits extracted PDF pages into page-aware text chunks.
   * Every chunk preserves source page_number and sequential chunk_index.
   */
  createDocumentChunks(
    pages: ParsedPdfPage[],
    documentId: string,
    documentTitle: string,
    filename: string,
    options: ChunkingOptions = {}
  ): PreparedChunk[] {
    const chunkSize = options.chunkSize || 1000;
    const chunkOverlap = options.chunkOverlap || 200;
    const preparedChunks: PreparedChunk[] = [];
    let globalChunkIndex = 0;

    for (const page of pages) {
      const pageText = page.text.trim();
      if (!pageText) continue;

      const rawChunks = ChunkingService.splitTextRecursively(
        pageText,
        chunkSize,
        chunkOverlap
      );

      for (const textSnippet of rawChunks) {
        if (!textSnippet || textSnippet.trim().length === 0) continue;

        const chunkMetadata: DocumentChunkMetadata = {
          document_id: documentId,
          document_title: documentTitle,
          filename: filename,
          page_number: page.page_number,
          chunk_index: globalChunkIndex,
          char_count: textSnippet.length,
        };

        preparedChunks.push({
          chunk_index: globalChunkIndex,
          page_number: page.page_number,
          content: textSnippet.trim(),
          metadata: chunkMetadata,
        });

        globalChunkIndex++;
      }
    }

    logger.info(`✂️ Generated ${preparedChunks.length} page-aware text chunks (Size: ${chunkSize}, Overlap: ${chunkOverlap}).`);

    return preparedChunks;
  },
};
