import './pdf-polyfills'; // MUST precede pdf-parse: seats DOMMatrix on globalThis
import { PDFParse } from 'pdf-parse';

/**
 * Extract concatenated plain text from a PDF buffer.
 *
 * pdf-parse v2 exposes a PDFParse class (not the old callable default export).
 * We must call destroy() to release the underlying pdf.js worker/document,
 * otherwise repeated calls in a long-lived worker process leak memory.
 */
export async function extractPdfText(buffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return result.text.trim();
  } finally {
    await parser.destroy();
  }
}
