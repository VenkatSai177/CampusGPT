import { ParsedPdfPage } from '../types';
import { AppError } from '../utils/appError';
import { logger } from '../utils/logger';

// Require pdf-parse to avoid TypeScript CJS/ESM interop call signature issues
const pdfParse = require('pdf-parse');

export const PdfService = {
  /**
   * Cleans raw extracted text from a PDF page:
   * - Strips non-printable ASCII control characters
   * - Normalizes multiple spaces into a single space
   * - Preserves double line-breaks (paragraph delimiters) while trimming empty lines
   */
  cleanPageText(rawText: string): string {
    if (!rawText) return '';

    return rawText
      // Replace null bytes and non-printable control characters (except tabs and newlines)
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
      // Replace Windows \r\n with \n
      .replace(/\r\n/g, '\n')
      // Normalize multiple consecutive spaces or tabs on the same line to a single space
      .replace(/[ \t]+/g, ' ')
      // Reduce 3 or more consecutive newlines down to 2 newlines (paragraph boundary)
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  },

  /**
   * Parses a PDF buffer page-by-page using pdf-parse custom pagerender hook.
   * Retains page metadata (page_number: 1..N) for downstream page-aware chunking.
   */
  async parsePdfPages(pdfBuffer: Buffer): Promise<ParsedPdfPage[]> {
    if (!pdfBuffer || pdfBuffer.length === 0) {
      throw new AppError('PDF buffer is empty or invalid.', 400);
    }

    const pages: ParsedPdfPage[] = [];

    // Custom pagerender callback to capture text for each individual page
    const renderPage = (pageData: any): string => {
      const pageNumber = pageData.pageIndex + 1;

      return pageData.getTextContent().then((textContent: any) => {
        let lastY: number | null = null;
        let pageText = '';

        for (const item of textContent.items) {
          if (lastY !== null && Math.abs(item.transform[5] - lastY) > 5) {
            pageText += '\n';
          } else if (pageText.length > 0 && !pageText.endsWith(' ') && !pageText.endsWith('\n')) {
            pageText += ' ';
          }
          pageText += item.str;
          lastY = item.transform[5];
        }

        const cleanedText = PdfService.cleanPageText(pageText);

        if (cleanedText.length > 0) {
          pages.push({
            page_number: pageNumber,
            text: cleanedText,
          });
        }

        return pageText;
      });
    };

    try {
      const data = await pdfParse(pdfBuffer, {
        pagerender: renderPage,
      });

      logger.info(`📄 PDF parsed successfully: ${data.numpages} total pages, ${pages.length} non-empty pages extracted.`);

      if (pages.length === 0) {
        throw new AppError('No readable text could be extracted from the PDF. It may contain scanned images without OCR text.', 400);
      }

      // Sort pages by page_number to ensure strict sequential order
      pages.sort((a, b) => a.page_number - b.page_number);

      return pages;
    } catch (error: any) {
      if (error instanceof AppError) throw error;
      logger.error('PDF Extraction Error:', error);
      throw new AppError(`Failed to parse PDF document: ${error.message || 'Corrupted or password-protected PDF.'}`, 400);
    }
  },
};
