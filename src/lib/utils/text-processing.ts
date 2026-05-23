export async function extractTextFromFile(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const content = new TextDecoder().decode(buffer);
  return content;
}

export async function extractTextFromPDF(file: File): Promise<string> {
  try {
    // Import dynamically to avoid issues in non-browser environments
    const pdf = await import('pdfjs-dist');
    const pdfData = await file.arrayBuffer();

    const doc = await pdf.getDocument({ data: pdfData }).promise;
    let text = '';

    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      text += content.items
        .filter((item: any) => 'str' in item)
        .map((item: any) => item.str)
        .join('');
      text += '\n';
    }

    return text;
  } catch (error) {
    console.error('Error extracting PDF text:', error);
    throw new Error('Failed to extract text from PDF');
  }
}

export function cleanText(text: string): string {
  // Remove extra whitespace
  text = text.replace(/\s+/g, ' ').trim();
  // Remove special characters but keep punctuation
  text = text.replace(/[\x00-\x1F\x7F]/g, '');
  return text;
}

export function chunkText(
  text: string,
  chunkSize: number = 512,
  overlap: number = 50
): string[] {
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    chunks.push(text.substring(start, end));
    start = end - overlap;
  }

  return chunks.filter(chunk => chunk.trim().length > 0);
}

export function estimateTokenCount(text: string): number {
  // Rough estimation: ~4 characters per token on average
  return Math.ceil(text.length / 4);
}
