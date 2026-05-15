import OpenAI from 'openai';

let _client: OpenAI | null = null;
const client = () => {
  if (!_client) {
    if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY missing');
    _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _client;
};

const MODEL = process.env.OPENAI_EMBEDDING_MODEL ?? 'text-embedding-3-small';

export const embed = async (text: string): Promise<number[]> => {
  const res = await client().embeddings.create({ model: MODEL, input: text });
  if (!res.data[0]) throw new Error('embedding response empty');
  return res.data[0].embedding;
};

export const embedBatch = async (texts: string[]): Promise<number[][]> => {
  const res = await client().embeddings.create({ model: MODEL, input: texts });
  return res.data.map((d) => d.embedding);
};
