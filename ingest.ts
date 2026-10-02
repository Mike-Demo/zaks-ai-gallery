/**
 * Ingestion: content/ -> semantic chunks -> Ollama embeddings -> Chroma.
 * Direct REST — no framework dependencies.
 * Run after `docker compose up -d` and pulling the embedding model:
 *
 *   docker exec zaks-ollama ollama pull qwen3-embedding:0.6b
 *   npm run ingest
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const OLLAMA_URL = process.env.OLLAMA_URL ?? "http://localhost:11434";
const CHROMA_URL = process.env.CHROMA_URL ?? "http://localhost:8000";
const COLLECTION = "zaks-gallery";
const EMBED_MODEL = process.env.EMBED_MODEL ?? "qwen3-embedding:0.6b";

const root = join(__dirname, "..");
const contentDir = join(root, "content");
const API = `${CHROMA_URL}/api/v2/tenants/default_tenant/databases/default_database/collections`;

interface Chunk {
  id: string;
  text: string;
  metadata: Record<string, string>;
}

function sectionChunks(markdown: string): { section: string; label: string; text: string }[] {
  const chunks: { section: string; label: string; text: string }[] = [];
  const parts = markdown.split(/^## /m);
  for (const part of parts.slice(1)) {
    const nl = part.indexOf("\n");
    const heading = part.slice(0, nl).trim();
    const text = part.slice(nl).trim();
    if (text.length > 20) chunks.push({ section: heading.toLowerCase(), label: heading, text });
  }
  return chunks;
}

async function embed(text: string): Promise<number[]> {
  const res = await fetch(`${OLLAMA_URL}/api/embed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: EMBED_MODEL, input: text }),
  });
  if (!res.ok) throw new Error(`Ollama embed failed (${res.status}) — is the model pulled?`);
  const data = (await res.json()) as { embeddings: number[][] };
  return data.embeddings[0];
}

async function main() {
  const artworks = JSON.parse(readFileSync(join(contentDir, "artworks.json"), "utf-8")).artworks as {
    id: string; title: string; year: number; medium: string; dimensions: string; themes: string[]; exhibitionId: string;
  }[];

  const chunks: Chunk[] = [];
  for (const a of artworks) {
    const md = readFileSync(join(contentDir, "artworks", `${a.id}.md`), "utf-8");
    for (const c of sectionChunks(md)) {
      chunks.push({
        id: `${a.id}-${c.section.replace(/\W+/g, "-")}`,
        text: c.text,
        metadata: {
          artworkId: a.id,
          artworkTitle: a.title,
          section: c.section,
          sourceLabel: `Artist notes for ${a.title}`,
          sourceType: "artist_notes",
          exhibitionId: a.exhibitionId,
        },
      });
    }
    chunks.push({
      id: `${a.id}-catalog`,
      text: `${a.title} (${a.year}): ${a.medium}, ${a.dimensions}. Themes: ${a.themes.join(", ")}.`,
      metadata: {
        artworkId: a.id,
        artworkTitle: a.title,
        section: "catalog facts",
        sourceLabel: `Artwork catalog: ${a.title}`,
        sourceType: "catalog",
        exhibitionId: a.exhibitionId,
      },
    });
  }
  chunks.push({
    id: "exhibition-statement",
    text: readFileSync(join(contentDir, "exhibition.md"), "utf-8"),
    metadata: { section: "exhibition", sourceLabel: "Exhibition statement", sourceType: "exhibition", exhibitionId: "thresholds-2026" },
  });
  chunks.push({
    id: "artist-bio",
    text: readFileSync(join(contentDir, "artist-bio.md"), "utf-8"),
    metadata: { section: "biography", sourceLabel: "Artist biography", sourceType: "bio", exhibitionId: "thresholds-2026" },
  });

  console.log(`Embedding ${chunks.length} chunks with ${EMBED_MODEL}...`);
  const embeddings: number[][] = [];
  for (let i = 0; i < chunks.length; i++) {
    embeddings.push(await embed(chunks[i].text));
    if ((i + 1) % 5 === 0) console.log(`  ${i + 1}/${chunks.length}`);
  }

  // Recreate the collection for a clean ingest.
  await fetch(`${API}/${COLLECTION}`, { method: "DELETE" }).catch(() => {});
  const create = await fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: COLLECTION, metadata: { "hnsw:space": "cosine" } }),
  });
  if (!create.ok) throw new Error(`Chroma create collection failed: ${create.status}`);
  const { id: collectionId } = (await create.json()) as { id: string };

  const add = await fetch(`${API}/${collectionId}/add`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ids: chunks.map((c) => c.id),
      embeddings,
      metadatas: chunks.map((c) => c.metadata),
      documents: chunks.map((c) => c.text),
    }),
  });
  if (!add.ok) throw new Error(`Chroma add failed: ${add.status} ${await add.text()}`);
  console.log(`Done. ${chunks.length} chunks in collection "${COLLECTION}".`);
}

main().catch((e) => {
  console.error("Ingest failed:", e instanceof Error ? e.message : e);
  process.exit(1);
});
