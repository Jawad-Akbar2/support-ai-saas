import { AIProvider, ChatResponse, ChatOptions, EmbeddingResponse } from './interface';
import { logger } from '@/lib/utils/logger';

export class MockAIProvider implements AIProvider {
  async generateEmbedding(text: string): Promise<EmbeddingResponse> {
    logger.debug('MockAI: generating embedding for text length:', text.length);
    
    // Generate a consistent mock embedding based on text length
    const embedding = Array(1536)
      .fill(0)
      .map((_, i) => {
        const seed = text.charCodeAt(0) || 0;
        return Math.sin((i + seed) * 0.1) * 0.5 + 0.5;
      });

    return {
      embedding,
      tokensUsed: Math.ceil(text.length / 4),
    };
  }

  async chat(
    messages: { role: string; content: string }[],
    options?: ChatOptions
  ): Promise<ChatResponse> {
    const lastMessage = messages[messages.length - 1]?.content || '';
    
    logger.debug('MockAI: generating response for:', lastMessage.substring(0, 100));

    // Mock response based on keywords
    let mockResponse = 'This is a mock response. ';
    
    if (lastMessage.toLowerCase().includes('refund')) {
      mockResponse = 'Our refund policy allows returns within 30 days. Please contact support for assistance.';
    } else if (lastMessage.toLowerCase().includes('help')) {
      mockResponse = 'How can I help you today? Please provide more details about your inquiry.';
    } else if (lastMessage.toLowerCase().includes('policy')) {
      mockResponse = 'We have various policies in place. Which specific policy would you like to know about?';
    } else {
      mockResponse = `Mock response to: "${lastMessage.substring(0, 50)}..."`;
    }

    return {
      text: mockResponse,
      tokensUsed: Math.ceil(mockResponse.length / 4),
      model: 'mock',
    };
  }

  async healthCheck(): Promise<boolean> {
    logger.debug('MockAI: health check passed');
    return true;
  }
}
