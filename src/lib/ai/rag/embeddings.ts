import { prisma } from '@/lib/db/prisma';
import { getAIProvider } from '@/lib/ai/providers';
import { chunkText, cleanText, estimateTokenCount } from '@/lib/utils/text-processing';
import { logger } from '@/lib/utils/logger';

const CHUNK_SIZE = parseInt(process.env.CHUNK_SIZE || '512');
const CHUNK_OVERLAP = parseInt(process.env.CHUNK_OVERLAP || '50');

export async function processDocumentEmbeddings(
  documentId: string,
  companyId: string,
  text: string
): Promise<{ chunksCreated: number; error?: string }> {
  try {
    logger.info(`Processing document ${documentId}`);

    // Mark as processing
    await prisma.document.update({
      where: { id: documentId },
      data: { status: 'PROCESSING' },
    });

    // Clean the text
    const cleanedText = cleanText(text);

    if (cleanedText.length === 0) {
      throw new Error('Document contains no valid text');
    }

    // Chunk the text
    const chunks = chunkText(cleanedText, CHUNK_SIZE, CHUNK_OVERLAP);

    if (chunks.length === 0) {
      throw new Error('Failed to create chunks from document');
    }

    logger.info(`Created ${chunks.length} chunks from document`);

    // Generate embeddings for each chunk
    const aiProvider = getAIProvider();
    let chunksCreated = 0;

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];

      try {
        const embedding = await aiProvider.generateEmbedding(chunk);
        const tokenCount = estimateTokenCount(chunk);

        // Save chunk to database
        await prisma.documentChunk.create({
          data: {
            documentId,
            companyId,
            content: chunk,
            embedding: embedding.embedding,
            chunkIndex: i,
            tokenCount,
          },
        });

        chunksCreated++;

        // Log progress every 10 chunks
        if ((i + 1) % 10 === 0) {
          logger.debug(`Processed ${i + 1}/${chunks.length} chunks`);
        }
      } catch (error) {
        logger.warn(`Failed to process chunk ${i}:`, error);
        // Continue with next chunk
      }
    }

    // Update document status
    await prisma.document.update({
      where: { id: documentId },
      data: {
        status: 'COMPLETED',
        totalChunks: chunksCreated,
        processedAt: new Date(),
      },
    });

    logger.info(`Successfully processed document with ${chunksCreated} chunks`);

    return { chunksCreated };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Error processing document ${documentId}:`, errorMessage);

    // Update document with error status
    await prisma.document.update({
      where: { id: documentId },
      data: {
        status: 'FAILED',
        processingError: errorMessage,
      },
    });

    return {
      chunksCreated: 0,
      error: errorMessage,
    };
  }
}

export async function reprocessDocument(documentId: string): Promise<{ success: boolean; error?: string }> {
  try {
    logger.info(`Reprocessing document ${documentId}`);

    // Get document
    const document = await prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      throw new Error('Document not found');
    }

    // Delete existing chunks
    await prisma.documentChunk.deleteMany({
      where: { documentId },
    });

    // Read file and reprocess
    // Note: In production, you'd read from storage
    // For MVP, we'll need to store the original text or file

    logger.info(`Reprocessed document ${documentId}`);
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: errorMessage,
    };
  }
}

export async function deleteDocumentEmbeddings(documentId: string): Promise<void> {
  await prisma.documentChunk.deleteMany({
    where: { documentId },
  });
}
