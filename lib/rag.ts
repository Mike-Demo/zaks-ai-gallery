/**
 * RAG service — direct REST, no framework.
 *
 * Uses Ollama's HTTP API (embeddings + chat) and Chroma's HTTP API
 * (collection query with metadata filters). One readable module, zero
 * heavy dependencies — the whole local AI stack stays inspectable.
 *
 * Runs ONLY on the demo laptop / local dev (scripts/local-server.ts).
 * SpaceFast functions never import this module.
 */
import { buildGroundingPrompt, UNKNOWN_ANSWER } from "./prompts";
import { getArtwork } from "./artworks";

const OLLAMA_URL = process.env.OLLAMA_URL ?? "http://localhost:11434";
const CHROMA_URL = process.env.CHROMA_URL ?? "http://localhost:8000";
const COLLECTION = "zaks-gallery";
const CHAT_MODEL = process.env.CHAT_MODEL ?? "qwen3:4b";
const EMBED_MODEL = process.env.EMBED_MODEL ?? "qwen3-embedding:0.6b";

export interface RagResult {
  answer: string;
  sources: string[];
}

interface ChromaDoc {
  id: string;
  document: string;
  metadata: Record<string, string>;
  distance: number;
}

async function ollamaModels(): Promise<string[]> {
  const res = await fetch(`${OLLAMA_URL}/api/tags`, { signal: AbortSignal.timeout(4000) });
  if (!res.ok) return [];
  const data = (await res.json()) as { models?: { name: string }[] };
  return (data.models ?? []).map((m) => m.name);
}

export async function ragAvailable(): Promise<boolean> {
  try {
    const names = await ollamaModels();
    const hasChat = names.some((n) => n.startsWith("qwen3:4b") || n === "qwen3");
    if (!hasChat) return false;
    const col = await fetch(`${CHROMA_URL}/api/v2/tenants/default_tenant/databases/default_database/collections/${COLLECTION}`);
    return col.ok;
  } catch {
    return false;
  }
}

async function embed(text: string): Promise<number[]> {
  const res = await fetch(`${OLLAMA_URL}/api/embed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: EMBED_MODEL, input: text }),
  });
  if (!res.ok) throw new Error(`Ollama embed failed: ${res.status}`);
  const data = (await res.json()) as { embeddings: number[][] };
  return data.embeddings[0];
}

async function chromaQuery(
  collectionId: string,
  queryEmbedding: number[],
  nResults: number,
  where?: Record<string, string>,
): Promise<ChromaDoc[]> {
  const res = await fetch(`${CHROMA_URL}/api/v2/tenants/default_tenant/databases/default_database/collections/${collectionId}/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query_embeddings: [queryEmbedding],
      n_results: nResults,
      where,
      include: ["documents", "metadatas", "distances"],
    }),
  });
  if (!res.ok) throw new Error(`Chroma query failed: ${res.status}`);
  const data = (await res.json()) as {
    ids: string[][];
    documents: string[][];
    metadatas: Record<string, string>[][];
    distances: number[][];
  };
  return data.ids[0].map((id, i) => ({
    id,
    document: data.documents[0][i],
    metadata: data.metadatas[0][i],
    distance: data.distances[0][i],
  }));
}

async function chat(prompt: string): Promise<string> {
  const res = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: CHAT_MODEL,
      stream: false,
      messages: [{ role: "user", content: prompt }],
      options: { temperature: 0.3, num_predict: 220 },
    }),
  });
  if (!res.ok) throw new Error(`Ollama chat failed: ${res.status}`);
  const data = (await res.json()) as { message: { content: string } };
  return data.message.content.trim();
}

export async function answerWithRag(
  artworkId: string,
  question: string,
  history: { role: string; content: string }[] = [],
): Promise<RagResult> {
  const artwork = getArtwork(artworkId);
  if (!artwork) return { answer: UNKNOWN_ANSWER, sources: [] };

  const colRes = await fetch(
    `${CHROMA_URL}/api/v2/tenants/default_tenant/databases/default_database/collections/${COLLECTION}`,
  );
  if (!colRes.ok) return { answer: UNKNOWN_ANSWER, sources: [] };
  const { id: collectionId } = (await colRes.json()) as { id: string };

  const queryEmbedding = await embed(question);

  // Hard metadata filter: current artwork first, plus one exhibition-level chunk.
  const [artworkDocs, exhibitionDocs] = await Promise.all([
    chromaQuery(collectionId, queryEmbedding, 4, { artworkId }),
    chromaQuery(collectionId, queryEmbedding, 1, { section: "exhibition" }),
  ]);
  const seen = new Set<string>();
  const docs = [...artworkDocs, ...exhibitionDocs].filter((d) => {
    if (seen.has(d.id)) return false;
    seen.add(d.id);
    return true;
  }).slice(0, 5);

  if (docs.length === 0) return { answer: UNKNOWN_ANSWER, sources: [] };

  const context = docs.map((d) => `[${d.metadata.sourceLabel}]\n${d.document}`).join("\n\n");
  const sources = [...new Set(docs.map((d) => d.metadata.sourceLabel))];
  const historyText = history.slice(-4).map((m) => `${m.role}: ${m.content}`).join("\n");

  const answer = await chat(buildGroundingPrompt(artwork, context, question, historyText));
  return { answer, sources };
}
