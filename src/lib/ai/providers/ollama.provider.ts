import axios from 'axios';
import { AIProvider, ChatResponse, ChatOptions, EmbeddingResponse } from './interface';
import { logger } from '@/lib/utils/logger';

export class OllamaProvider implements AIProvider {
  private baseUrl: string;
  private chatModel: string;
  private embeddingModel: string;

  constructor(
    baseUrl: string = process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
    chatModel: string = process.env.OLLAMA_CHAT_MODEL || 'llama3.1',
    embeddingModel: string = process.env.OLLAMA_EMBEDDING_MODEL || 'nomic-embed-text'
  ) {
    this.baseUrl = baseUrl;
    this.chatModel = chatModel;
    this.embeddingModel = embeddingModel;
  }

  async generateEmbedding(text: string): Promise<EmbeddingResponse> {
    try {
      const response = await axios.post(`${this.baseUrl}/api/embeddings`, {
        model: this.embeddingModel,
        prompt: text,
      });

      return {
        embedding: response.data.embedding,
        tokensUsed: response.data.prompt_eval_count || 0,
      };
    } catch (error) {
      logger.error('Ollama embedding error', error);
      throw new Error('Failed to generate embedding');
    }
  }

  async chat(
    messages: { role: string; content: string }[],
    options?: ChatOptions
  ): Promise<ChatResponse> {
    try {
      const systemMessage = options?.systemPrompt
        ? [
            {
              role: 'system',
              content: options.systemPrompt,
            },
          ]
        : [];

      const allMessages = [...systemMessage, ...messages];

      const response = await axios.post(`${this.baseUrl}/api/chat`, {
        model: this.chatModel,
        messages: allMessages,
        stream: false,
        options: {
          temperature: options?.temperature ?? 0.7,
          num_predict: options?.maxTokens ?? 500,
        },
      });

      return {
        text: response.data.message.content,
        tokensUsed: (response.data.prompt_eval_count || 0) + (response.data.eval_count || 0),
        model: this.chatModel,
      };
    } catch (error) {
      logger.error('Ollama chat error', error);
      throw new Error('Failed to generate response');
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.baseUrl}/api/tags`, {
        timeout: 5000,
      });
      return response.status === 200;
    } catch (error) {
      logger.warn('Ollama health check failed', error);
      return false;
    }
  }
}
