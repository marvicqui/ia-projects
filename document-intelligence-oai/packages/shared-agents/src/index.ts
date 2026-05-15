export interface AgentUsage {
  inputTokens: number;
  outputTokens: number;
  estimatedUsd: number;
}

export interface AgentResult<T> {
  data: T;
  usage: AgentUsage;
  model: string;
  cached: boolean;
}

export const defaultModels = {
  haiku: process.env.ANTHROPIC_HAIKU_MODEL ?? "claude-haiku-4-5",
  sonnet: process.env.ANTHROPIC_SONNET_MODEL ?? "claude-sonnet-4-5",
  embedding: process.env.OPENAI_EMBEDDING_MODEL ?? "text-embedding-3-small"
} as const;
