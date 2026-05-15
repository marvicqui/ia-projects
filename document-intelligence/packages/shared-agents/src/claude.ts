import Anthropic from '@anthropic-ai/sdk';

let _client: Anthropic | null = null;
const client = () => {
  if (!_client) {
    if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY missing');
    _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return _client;
};

export const MODEL_DEFAULT = process.env.ANTHROPIC_MODEL_DEFAULT ?? 'claude-haiku-4-5-20251001';
export const MODEL_FALLBACK = process.env.ANTHROPIC_MODEL_FALLBACK ?? 'claude-sonnet-4-6';

interface CompleteOptions {
  model?: string;
  system?: string;
  maxTokens?: number;
  temperature?: number;
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export const complete = async (
  messages: Anthropic.MessageParam[],
  options: CompleteOptions = {},
): Promise<string> => {
  const { model = MODEL_DEFAULT, system, maxTokens = 4096, temperature = 0 } = options;

  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await client().messages.create({
        model,
        system,
        max_tokens: maxTokens,
        temperature,
        messages,
      });
      const text = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map((b) => b.text)
        .join('\n');
      return text;
    } catch (error) {
      lastError = error;
      if (error instanceof Anthropic.APIError && (error.status === 429 || (error.status ?? 0) >= 500)) {
        await sleep(2 ** attempt * 1000);
        continue;
      }
      throw error;
    }
  }
  throw lastError;
};

export const completeJSON = async <T>(
  messages: Anthropic.MessageParam[],
  options: CompleteOptions = {},
): Promise<T> => {
  const text = await complete(messages, options);
  const match = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  if (!match) throw new Error(`No JSON in response: ${text.slice(0, 200)}`);
  return JSON.parse(match[0]) as T;
};

export const completeWithImage = async (
  imageBase64: string,
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp' | 'application/pdf',
  prompt: string,
  options: CompleteOptions = {},
): Promise<string> => {
  if (mimeType === 'application/pdf') {
    // Claude supports PDF as document content block (vision).
    const response = await client().messages.create({
      model: options.model ?? MODEL_DEFAULT,
      system: options.system,
      max_tokens: options.maxTokens ?? 4096,
      temperature: options.temperature ?? 0,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: imageBase64 } },
            { type: 'text', text: prompt },
          ],
        },
      ],
    });
    return response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('\n');
  }

  return complete(
    [
      {
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mimeType, data: imageBase64 } },
          { type: 'text', text: prompt },
        ],
      },
    ],
    options,
  );
};
