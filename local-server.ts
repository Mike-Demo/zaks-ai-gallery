/**
 * Local demo server: serves the built static gallery (out/) and mounts the
 * REAL api handlers — /api/chat with full local RAG (Ollama + Chroma) and
 * /api/inquiries appending to data/inquiries.jsonl.
 *
 *   npm run build && npm run local   # http://localhost:3100
 */
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFileSync, appendFileSync, mkdirSync, existsSync, statSync } from "node:fs";
import { join, extname, normalize } from "node:path";

const PORT = Number(process.env.PORT ?? 3100);
const root = join(__dirname, "..");
const staticDir = join(root, "out");
const dataDir = join(root, "data");

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css",
  ".js": "text/javascript",
  ".json": "application/json",
  ".webp": "image/webp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

function send(res: ServerResponse, status: number, body: string | Buffer, type: string) {
  res.writeHead(status, { "Content-Type": type, "Cache-Control": "no-store" });
  res.end(body);
}

const json = (res: ServerResponse, status: number, body: unknown) =>
  send(res, status, JSON.stringify(body), "application/json");

async function readBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(c as Buffer);
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf-8"));
  } catch {
    return null;
  }
}

async function handleChat(req: IncomingMessage, res: ServerResponse) {
  const body = (await readBody(req)) as { artworkId?: string; question?: string; history?: { role: string; content: string }[] };

  // Lazy imports: keep the static server usable even without AI deps.
  const { validChatRequest } = await import("../lib/validation");
  const { deterministicAnswer } = await import("../lib/deterministic");
  const { getArtworks } = await import("../lib/artworks");
  const { SUGGESTED_QUESTIONS } = await import("../lib/prompts");

  const parsed = validChatRequest(body ?? {});
  if (!parsed.ok) return json(res, 400, { error: parsed.error });

  const det = deterministicAnswer(parsed.artworkId!, parsed.question!, getArtworks());
  if (det.handled) {
    return json(res, 200, {
      answer: det.answer,
      sources: det.sources,
      mode: "deterministic",
      suggestions: SUGGESTED_QUESTIONS,
    });
  }

  const { ragAvailable, answerWithRag } = await import("../lib/rag");
  if (!(await ragAvailable())) {
    return json(res, 200, {
      answer:
        "The local AI guide isn't running right now (Ollama/Qwen3 not reachable). " +
        "Start it with `docker compose up -d` and `npm run local`. " +
        "Meanwhile I can answer price, availability, size, materials, and contact from Zak's catalog — try one of the suggested questions.",
      sources: [],
      mode: "local-only",
      suggestions: SUGGESTED_QUESTIONS,
    });
  }

  try {
    const { answer, sources } = await answerWithRag(parsed.artworkId!, parsed.question!, parsed.history ?? []);
    return json(res, 200, { answer, sources, mode: "rag", suggestions: SUGGESTED_QUESTIONS });
  } catch (e) {
    console.error("RAG error:", e);
    return json(res, 500, { error: "The guide stumbled — please try again." });
  }
}

async function handleInquiry(req: IncomingMessage, res: ServerResponse) {
  const body = (await readBody(req)) as { artworkId?: string; name?: string; email?: string; message?: string };
  const { validInquiryRequest } = await import("../lib/validation");
  const { getArtwork } = await import("../lib/artworks");
  const parsed = validInquiryRequest(body ?? {});
  if (!parsed.ok) return json(res, 400, { error: parsed.error });

  mkdirSync(dataDir, { recursive: true });
  const record = {
    id: `inq_${Date.now().toString(36)}`,
    artworkId: parsed.artworkId,
    artworkTitle: getArtwork(parsed.artworkId!)?.title ?? parsed.artworkId,
    name: parsed.name,
    email: parsed.email,
    message: parsed.message,
    createdAt: new Date().toISOString(),
  };
  appendFileSync(join(dataDir, "inquiries.jsonl"), JSON.stringify(record) + "\n");
  return json(res, 200, { ok: true, inquiryId: record.id });
}

function serveStatic(pathname: string, res: ServerResponse) {
  let rel = decodeURIComponent(pathname);
  if (rel.endsWith("/")) rel += "index.html";
  const file = normalize(join(staticDir, rel));
  if (!file.startsWith(staticDir)) return send(res, 403, "Forbidden", "text/plain");

  let target = file;
  if (!existsSync(target)) {
    // Pretty URLs: /artworks/blue-passage -> /artworks/blue-passage.html
    if (existsSync(target + ".html")) target = target + ".html";
    else return send(res, 404, "Not found", "text/plain");
  }
  if (statSync(target).isDirectory()) target = join(target, "index.html");
  if (!existsSync(target)) return send(res, 404, "Not found", "text/plain");

  send(res, 200, readFileSync(target), MIME[extname(target)] ?? "application/octet-stream");
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", "http://localhost");
  try {
    if (url.pathname === "/api/chat" && req.method === "POST") return await handleChat(req, res);
    if (url.pathname === "/api/inquiries" && req.method === "POST") return await handleInquiry(req, res);
    if (url.pathname.startsWith("/api/")) return json(res, 404, { error: "Unknown API route." });
    if (req.method === "GET") return serveStatic(url.pathname, res);
    return send(res, 405, "Method not allowed", "text/plain");
  } catch (e) {
    console.error(e);
    return json(res, 500, { error: "Internal error." });
  }
});

if (!existsSync(staticDir)) {
  console.error(`Static dir ${staticDir} missing — run \`npm run build\` first.`);
  process.exit(1);
}
server.listen(PORT, () => console.log(`Zak's gallery (local AI mode) at http://localhost:${PORT}`));
