import { vi } from "vitest";

/**
 * AI Provider mock factory.
 *
 * Provides typed mock factories for AI provider interfaces used throughout
 * the commit generation, code review, and branch name generation flows.
 *
 * Usage:
 *   import { createMockAIProvider } from "@/__tests__/mocks/ai-providers";
 */

export interface MockAIProviderOptions {
  content?: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
  commitStreamChunks?: string[];
}

/**
 * Creates a mock that satisfies the `AIProvider` interface.
 */
export function createMockAIProvider(options: MockAIProviderOptions = {}) {
  const {
    content = "feat: add new feature",
    usage = { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
    commitStreamChunks = ["feat: ", "add new ", "feature"],
  } = options;

  // Build a ReadableStream-like async iterable from chunks
  async function* streamGenerator() {
    for (const chunk of commitStreamChunks) {
      yield chunk;
    }
  }

  return {
    generateCommit: vi.fn(async () => ({
      content,
      usage,
    })),
    generateLayeredCommit: vi.fn(async () => ({
      title: content,
      body: "",
      isLayered: true,
    })),
    generateCommitStream: vi.fn(async () => streamGenerator()),
    generateCommitWithFunctionCalling: vi.fn(async () => ({
      content,
      usage,
    })),
    generateCodeReview: vi.fn(async () => ({
      content: "LGTM",
      usage,
    })),
    generateBranchName: vi.fn(async () => ({
      content: "feature/new-branch",
      usage,
    })),
    generateWeeklyReport: vi.fn(async () => ({
      content: "Weekly report",
      usage,
    })),
  };
}

/**
 * Creates a mock streaming response as an async iterable.
 */
export function createMockStreamingResponse(chunks: string[] = ["hello", " world"]) {
  async function* generator() {
    for (const chunk of chunks) {
      yield chunk;
    }
  }
  return generator();
}

/**
 * Creates a mock `AIProviderFactory` that returns the given provider for any model.
 */
export function createMockProviderFactory(provider?: ReturnType<typeof createMockAIProvider>) {
  const mockProvider = provider ?? createMockAIProvider();
  return {
    getProvider: vi.fn(() => mockProvider),
    createProvider: vi.fn(() => mockProvider),
    listProviders: vi.fn(() => ["openai", "anthropic", "google"]),
    mockProvider,
  };
}
