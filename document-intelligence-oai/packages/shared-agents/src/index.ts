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

export interface ClaudeJsonRequest {
  system: string;
  prompt: string;
  model?: string;
  maxTokens?: number;
}

interface AnthropicTextBlock {
  type: "text";
  text: string;
}

interface AnthropicMessageResponse {
  content: AnthropicTextBlock[];
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
  };
  model?: string;
}

export class ClaudeJsonClient {
  private readonly cache = new Map<string, AgentResult<unknown>>();

  constructor(private readonly apiKey = process.env.ANTHROPIC_API_KEY) {}

  async generate<T>(request: ClaudeJsonRequest): Promise<AgentResult<T>> {
    const model = request.model ?? defaultModels.haiku;
    const cacheKey = JSON.stringify({ ...request, model });
    const cached = this.cache.get(cacheKey);

    if (cached) {
      return { ...cached, cached: true } as AgentResult<T>;
    }

    if (!this.apiKey) {
      throw new Error("ANTHROPIC_API_KEY is required for ClaudeJsonClient");
    }

    const apiKey = this.apiKey;
    const response = await retry(async () => {
      const result = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01"
        },
        body: JSON.stringify({
          model,
          max_tokens: request.maxTokens ?? 1600,
          system: request.system,
          messages: [{ role: "user", content: `${request.prompt}\n\nResponde solo JSON valido.` }]
        })
      });

      if (!result.ok) {
        throw new Error(`Claude request failed with ${result.status}`);
      }

      return (await result.json()) as AnthropicMessageResponse;
    });

    const text = response.content.find((block) => block.type === "text")?.text ?? "{}";
    const parsed = JSON.parse(text) as T;
    const agentResult: AgentResult<T> = {
      data: parsed,
      usage: {
        inputTokens: response.usage?.input_tokens ?? 0,
        outputTokens: response.usage?.output_tokens ?? 0,
        estimatedUsd: estimateClaudeCost(model, response.usage?.input_tokens ?? 0, response.usage?.output_tokens ?? 0)
      },
      model: response.model ?? model,
      cached: false
    };

    this.cache.set(cacheKey, agentResult);
    return agentResult;
  }
}

export async function createEmbedding(input: string, apiKey = process.env.OPENAI_API_KEY): Promise<number[]> {
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is required for embeddings");
  }

  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model: defaultModels.embedding,
      input
    })
  });

  if (!response.ok) {
    throw new Error(`Embedding request failed with ${response.status}`);
  }

  const payload = (await response.json()) as { data: Array<{ embedding: number[] }> };
  const embedding = payload.data[0]?.embedding;

  if (!embedding) {
    throw new Error("Embedding response did not include a vector");
  }

  return embedding;
}

async function retry<T>(operation: () => Promise<T>, attempts = 3): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt < attempts - 1) {
        await wait(2 ** attempt * 500);
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Unknown retry error");
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function estimateClaudeCost(model: string, inputTokens: number, outputTokens: number): number {
  const isSonnet = model.toLowerCase().includes("sonnet");
  const inputPerMillion = isSonnet ? 3 : 0.8;
  const outputPerMillion = isSonnet ? 15 : 4;
  return (inputTokens / 1_000_000) * inputPerMillion + (outputTokens / 1_000_000) * outputPerMillion;
}
