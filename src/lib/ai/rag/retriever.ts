import { prisma } from '@/lib/db/prisma';
import { getAIProvider } from '@/lib/ai/providers';
import { logger } from '@/lib/utils/logger';

const VECTOR_SEARCH_LIMIT = parseInt(process.env.VECTOR_SEARCH_LIMIT || '10');
const SIMILARITY_THRESHOLD = parseFloat(process.env.SIMILARITY_THRESHOLD || '0.5');
const CHUNK_SIZE = parseInt(process.env.CHUNK_SIZE || '512');
const CHUNK_OVERLAP = parseInt(process.env.CHUNK_OVERLAP || '50');

export interface RAGContext {
  chunks: Array<{
    id: string;
    content: string;
    similarity: number;
    documentTitle: string;
  }>;
  relevanceScore: number;
}

export async function retrieveContext(
  question: string,
  companyId: string,
  limit: number = VECTOR_SEARCH_LIMIT
): Promise<RAGContext> {
  try {
    logger.debug('RAG: Retrieving context for question:', question.substring(0, 100));

    const aiProvider = getAIProvider();

    // Generate embedding for the question
    const questionEmbedding = await aiProvider.generateEmbedding(question);

    // Search similar chunks in the vector store (pgvector)
    const chunks = await prisma.$queryRaw<
      Array<{
        id: string;
        content: string;
        similarity: number;
        documentTitle: string;
      }>
    >`
      SELECT 
        dc.id,
        dc.content,
        1 - (dc.embedding <=> $1::vector) as similarity,
        d.title as "documentTitle"
      FROM "DocumentChunk" dc
      JOIN "Document" d ON dc."documentId" = d.id
      WHERE dc."companyId" = $2
      AND d.status = 'COMPLETED'
      AND d."deletedAt" IS NULL
      AND (1 - (dc.embedding <=> $1::vector)) > $3
      ORDER BY similarity DESC
      LIMIT $4
    `;

    // Filter by threshold
    const validChunks = chunks.filter(c => c.similarity >= SIMILARITY_THRESHOLD);

    // Calculate overall relevance score
    const relevanceScore =
      validChunks.length > 0
        ? validChunks.reduce((sum, c) => sum + c.similarity, 0) / validChunks.length
        : 0;

    logger.debug('RAG: Found', validChunks.length, 'relevant chunks');

    return {
      chunks: validChunks,
      relevanceScore,
    };
  } catch (error) {
    logger.error('RAG retrieval error', error);
    return {
      chunks: [],
      relevanceScore: 0,
    };
  }
}

export function buildPrompt(
  question: string,
  context: RAGContext,
  mode: 'internal' | 'customer' = 'customer'
): string {
  const contextText = context.chunks
    .map((chunk, index) => `[Source ${index + 1}] ${chunk.content}`)
    .join('\n\n');

  if (mode === 'customer') {
    return `You are a helpful customer support agent. Answer the following question based ONLY on the provided company knowledge base. If the answer is not in the knowledge base, say "I don't have information about this topic. Please contact support for assistance."

Knowledge Base:
${contextText}

Customer Question: ${question}

Provide a professional, concise answer suitable for sending directly to a customer.`;
  } else {
    return `You are an internal support knowledge assistant. Answer the following question based ONLY on the provided company knowledge base. If you cannot find the answer, suggest that the agent escalate to a manager or check with the knowledge management team.

Knowledge Base:
${contextText}

Question: ${question}

Provide both an internal explanation and a suggested customer-facing response.`;
  }
}

export async function generateAnswer(
  question: string,
  context: RAGContext,
  systemPrompt?: string,
  temperature: number = 0.7,
  mode: 'internal' | 'customer' = 'customer'
): Promise<string> {
  try {
    const aiProvider = getAIProvider();

    const prompt = buildPrompt(question, context, mode);

    const response = await aiProvider.chat(
      [
        {
          role: 'user',
          content: prompt,
        },
      ],
      {
        temperature,
        maxTokens: 500,
        systemPrompt:
          systemPrompt ||
          'You are a helpful, accurate customer support assistant. Always be honest about what you know and don\'t know.',
      }
    );

    return response.text;
  } catch (error) {
    logger.error('Answer generation error', error);
    throw new Error('Failed to generate answer');
  }
}

export async function shouldFlagAsUnanswered(
  context: RAGContext,
  threshold: number = 0.4
): Promise<boolean> {
  // Flag as unanswered if:
  // 1. No relevant chunks found
  // 2. Relevance score is too low
  return context.chunks.length === 0 || context.relevanceScore < threshold;
}
