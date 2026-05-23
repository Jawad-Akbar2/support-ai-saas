export interface EmbeddingResponse {
  embedding: number[];
  tokensUsed: number;
}

export interface ChatResponse {
  text: string;
  tokensUsed: number;
  model: string;
}

export interface AIProvider {
  generateEmbedding(text: string): Promise<EmbeddingResponse>;
  chat(
    messages: { role: string; content: string }[],
    options?: ChatOptions
  ): Promise<ChatResponse>;
  healthCheck(): Promise<boolean>;
}

export interface EmbeddingProvider {
  generateEmbedding(text: string): Promise<EmbeddingResponse>;
  healthCheck(): Promise<boolean>;
}

export interface ChatOptions {
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}
