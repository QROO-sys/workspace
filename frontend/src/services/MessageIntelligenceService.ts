// Interfaces

/** Supported intents */
export type Intent = "ORDER" | "QUESTION" | "COMPLAINT" | "OTHER";

/** Priority classification */
export type Priority = "HIGH" | "NORMAL" | "LOW";

/** The structured output */
export interface MessageAnalysisResult {
  intent: Intent;
  priority: Priority;
  suggestedResponse: string;
  relevantChunks: string[];
}

/** Vector store interface */
export interface VectorStore {
  // Given an input, returns top k relevant docs/chunks
  query(input: string, k?: number): Promise<string[]>;
}

/** LLM client interface */
export interface LLMClient {
  // Classifies intent
  classifyIntent(input: string): Promise<{ intent: Intent; priority: Priority }>;
  // Generates a suggested response
  generateResponse(input: string, context: string[]): Promise<string>;
}

// Service

export class MessageIntelligenceService {
  constructor(
    private llm: LLMClient,
    private vector: VectorStore
  ) {}

  async analyzeMessage(message: string): Promise<MessageAnalysisResult> {
    // 1. Classify intent and priority
    const { intent, priority } = await this.llm.classifyIntent(message);
    // 2. Retrieve top relevant knowledge chunks
    const relevantChunks = await this.vector.query(message, 5);
    // 3. Generate suggested response using chunks
    const suggestedResponse = await this.llm.generateResponse(message, relevantChunks);

    return { intent, priority, suggestedResponse, relevantChunks };
  }
}

// --- Mock implementations for local development ---

export class MockVectorStore implements VectorStore {
  constructor(private docs: string[]) {}
  async query(input: string, k = 5): Promise<string[]> {
    // naive: returns the first k docs for demo
    return this.docs.slice(0, k);
  }
}

export class MockLLMClient implements LLMClient {
  async classifyIntent(input: string): Promise<{ intent: Intent; priority: Priority }> {
    // naive intent classifier for demo
    if (input.toLowerCase().includes("order")) return { intent: "ORDER", priority: "NORMAL" };
    if (input.toLowerCase().includes("problem") || input.toLowerCase().includes("complaint")) return { intent: "COMPLAINT", priority: "HIGH" };
    if (input.endsWith("?")) return { intent: "QUESTION", priority: "NORMAL" };
    return { intent: "OTHER", priority: "LOW" };
  }

  async generateResponse(input: string, context: string[]): Promise<string> {
    return `Thank you for your message: "${input}".\n(Info: ${context.slice(0,2).join("; ")})`;
  }
}

// --- Usage example ---

const docs = [
  "Our pizza is made from fresh ingredients.",
  "The kitchen closes at 10pm.",
  "For complaints, contact the manager.",
  "Menu items can be customized.",
  "We serve drinks until midnight."
];

const service = new MessageIntelligenceService(
  new MockLLMClient(),
  new MockVectorStore(docs)
);

(async () => {
  const result = await service.analyzeMessage("Can I order a pizza?");
  console.log(result);
})();