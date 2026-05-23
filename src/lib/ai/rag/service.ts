import { prisma } from '@/lib/db/prisma';
import { retrieveContext, generateAnswer, shouldFlagAsUnanswered } from './retriever';
import { logger } from '@/lib/utils/logger';
import { trackUsage } from '@/lib/subscriptions/features';

export interface ChatAnswerRequest {
  question: string;
  companyId: string;
  userId: string;
  sessionId?: string;
  mode?: 'internal' | 'customer';
}

export interface ChatAnswerResponse {
  answer: string;
  sources: Array<{
    documentTitle: string;
    excerpt: string;
    similarity: number;
  }>;
  confidence: number;
  shouldEscalate: boolean;
  tokensUsed: number;
  sessionId: string;
  messageId: string;
}

export async function answerQuestion(
  request: ChatAnswerRequest
): Promise<ChatAnswerResponse> {
  try {
    logger.info(`Answering question for company ${request.companyId}`);

    // Get or create chat session
    let sessionId = request.sessionId;

    if (!sessionId) {
      const session = await prisma.chatSession.create({
        data: {
          companyId: request.companyId,
          userId: request.userId,
          title: request.question.substring(0, 100),
        },
      });
      sessionId = session.id;
    }

    // Store user question
    const userMessage = await prisma.chatMessage.create({
      data: {
        sessionId,
        role: 'USER',
        content: request.question,
      },
    });

    // Retrieve context from knowledge base
    const ragContext = await retrieveContext(request.question, request.companyId);

    // Get company AI settings
    const aiSettings = await prisma.aiSettings.findUnique({
      where: { companyId: request.companyId },
    });

    // Generate answer
    const answer = await generateAnswer(
      request.question,
      ragContext,
      aiSettings?.systemPrompt,
      aiSettings?.temperature || 0.7,
      request.mode || 'customer'
    );

    // Check if should be flagged as unanswered
    const shouldEscalate = await shouldFlagAsUnanswered(
      ragContext,
      aiSettings?.confidenceThreshold || 0.5
    );

    if (shouldEscalate) {
      logger.info(`Question flagged for escalation: ${request.question.substring(0, 50)}`);
      
      // Track unanswered question
      await prisma.unansweredQuestion.create({
        data: {
          companyId: request.companyId,
          question: request.question,
          confidence: ragContext.relevanceScore,
        },
      });
    }

    // Store AI response
    const assistantMessage = await prisma.chatMessage.create({
      data: {
        sessionId,
        role: 'ASSISTANT',
        content: answer,
      },
    });

    // Store sources
    if (aiSettings?.includeSourceCitations) {
      await Promise.all(
        ragContext.chunks.map(chunk =>
          prisma.chatMessageSource.create({
            data: {
              messageId: assistantMessage.id,
              chunkId: chunk.id,
              similarity: chunk.similarity,
            },
          })
        )
      );
    }

    // Track usage
    await trackUsage(
      request.companyId,
      request.userId,
      'QUESTIONS_ASKED',
      1,
      {
        mode: request.mode || 'customer',
        escalated: shouldEscalate,
      }
    );

    return {
      answer,
      sources: ragContext.chunks.map(chunk => ({
        documentTitle: chunk.documentTitle,
        excerpt: chunk.content.substring(0, 200),
        similarity: chunk.similarity,
      })),
      confidence: ragContext.relevanceScore,
      shouldEscalate,
      tokensUsed: 0, // TODO: Calculate from actual API response
      sessionId,
      messageId: assistantMessage.id,
    };
  } catch (error) {
    logger.error('Error answering question:', error);
    throw error;
  }
}

export async function getChatSessions(
  companyId: string,
  userId: string,
  limit: number = 20,
  offset: number = 0
) {
  return prisma.chatSession.findMany({
    where: {
      companyId,
      userId,
    },
    include: {
      messages: {
        orderBy: { createdAt: 'asc' },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
  });
}

export async function getChatSession(sessionId: string, companyId: string, userId: string) {
  return prisma.chatSession.findFirst({
    where: {
      id: sessionId,
      companyId,
      userId,
    },
    include: {
      messages: {
        include: {
          sources: true,
          feedback: true,
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  });
}

export async function storeFeedback(
  messageId: string,
  userId: string,
  useful: boolean | null,
  comment?: string
) {
  return prisma.feedback.upsert({
    where: { messageId },
    create: {
      messageId,
      userId,
      useful,
      comment,
    },
    update: {
      useful,
      comment,
    },
  });
}
