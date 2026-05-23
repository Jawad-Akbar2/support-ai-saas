import { AIProvider } from './interface';
import { OllamaProvider } from './ollama.provider';
import { MockAIProvider } from './mock.provider';

let aiProvider: AIProvider | null = null;

export function getAIProvider(): AIProvider {
  if (aiProvider) {
    return aiProvider;
  }

  const provider = process.env.AI_PROVIDER || 'ollama';
  const mockAI = process.env.MOCK_AI === 'true';

  if (mockAI) {
    aiProvider = new MockAIProvider();
  } else if (provider === 'ollama') {
    aiProvider = new OllamaProvider();
  } else {
    aiProvider = new MockAIProvider();
  }

  return aiProvider;
}

export function resetAIProvider(): void {
  aiProvider = null;
}
