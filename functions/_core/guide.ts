/**
 * Serverless-safe guide logic: deterministic answers from the inlined
 * catalog + request validation. No filesystem, no LangChain, no Ollama —
 * this is what runs on SpaceFast. Story questions that need the local
 * model are answered by scripts/local-server.ts instead.
 */
import { ARTWORKS, availabilityLabel, formatPrice, getArtwork, type Artwork } from "./catalog";

export const UNKNOWN_ANSWER = "Zak's current notes don't address that directly.";

export const SUGGESTED_QUESTIONS = [
  "What inspired this piece?",
  "What themes appear here?",
  "How was it made?",
  "Is it available?",
  "Which works explore similar ideas?",
];

const PRICE_RE = /\b(how much|price|cost|priced|pricing|\$)\b/i;
const AVAIL_RE = /\b(available|for sale|still have|sold|reserved|buy it|purchase)\b/i;
const DIM_RE = /\b(dimensions?|size|how big|measurements?|inches)\b/i;
const MEDIUM_RE = /\b(medium|material|made of|painted with|canvas|panel)\b/i;
const CONTACT_RE = /\b(contact|email|reach zak|get in touch|buy|acquire|purchase|interested)\b/i;
const SIMILAR_RE = /\b(similar|other works|like this|explore.*theme|same.*theme)\b/i;

interface StructuredFacts {
  price: string;
  availability: string;
  dimensions: string;
  medium: string;
  title: string;
  id: string;
}

export interface GuideAnswer {
  answer: string;
  sources: string[];
  mode: "deterministic" | "local-only";
  structured: StructuredFacts | null;
}

function structured(a: Artwork): StructuredFacts {
  return {
    price: formatPrice(a),
    availability: availabilityLabel(a),
    dimensions: a.dimensions,
    medium: a.medium,
    title: a.title,
    id: a.id,
  };
}

function similarWorks(artwork: Artwork): GuideAnswer {
  const others = ARTWORKS.filter((a) => a.id !== artwork.id)
    .map((a) => ({ a, shared: a.themes.filter((t) => artwork.themes.includes(t)) }))
    .filter((x) => x.shared.length > 0)
    .sort((x, y) => y.shared.length - x.shared.length)
    .slice(0, 3);
  const answer =
    others.length === 0
      ? `None of the other works in this show share “${artwork.title}”'s themes directly — Zak's notes treat it as an outlier. You may still enjoy browsing the full grid.`
      : `Works exploring similar ideas: ${others
          .map((x) => `“${x.a.title}” (shared themes: ${x.shared.join(", ")})`)
          .join("; ")}. Open any of them to ask the guide about it.`;
  return { answer, sources: [`Artwork catalog: ${artwork.title}`, "Artwork catalog"], mode: "deterministic", structured: structured(artwork) };
}

/** Answer a question about an artwork. Never invents; story questions that
 * need the local model return mode:"local-only" with an honest message. */
export function answerQuestion(artworkId: string, question: string): GuideAnswer {
  const artwork = getArtwork(artworkId);
  if (!artwork) {
    return { answer: UNKNOWN_ANSWER, sources: [], mode: "deterministic", structured: null };
  }
  const q = question.trim();
  const label = `Artwork catalog: ${artwork.title}`;
  const s = structured(artwork);

  if (PRICE_RE.test(q) && !AVAIL_RE.test(q)) {
    return {
      mode: "deterministic",
      sources: [label],
      structured: s,
      answer: `“${artwork.title}” is listed at ${s.price}. Prices are set by Zak — I can't negotiate or hold a price. Use the “Ask about acquiring this work” form and Zak will confirm.`,
    };
  }
  if (AVAIL_RE.test(q)) {
    const priceBit = artwork.availability === "available" ? ` It is listed at ${s.price}.` : "";
    return {
      mode: "deterministic",
      sources: [label],
      structured: s,
      answer: `“${artwork.title}”: ${s.availability}.${priceBit} Availability can change — submitting an inquiry does not reserve the work.`,
    };
  }
  if (DIM_RE.test(q)) {
    return { mode: "deterministic", sources: [label], structured: s, answer: `“${artwork.title}” measures ${artwork.dimensions}.` };
  }
  if (MEDIUM_RE.test(q)) {
    return { mode: "deterministic", sources: [label], structured: s, answer: `Zak made “${artwork.title}” with ${artwork.medium.toLowerCase()}.` };
  }
  if (CONTACT_RE.test(q) && !PRICE_RE.test(q)) {
    return {
      mode: "deterministic",
      sources: ["Exhibition contact information"],
      structured: s,
      answer: `The fastest way to reach Zak about “${artwork.title}” is the “Ask about acquiring this work” form on this page — it sends your message straight to Zak with the artwork attached.`,
    };
  }
  if (SIMILAR_RE.test(q)) return similarWorks(artwork);

  // Story / interpretation questions need the local open-weight model.
  return {
    mode: "local-only",
    sources: [],
    structured: s,
    answer:
      `That's a story question — and story answers come from Zak's approved notes via the local AI guide. ` +
      `This public demo answers price, availability, size, materials, and contact from Zak's catalog, but the full guide (Qwen3, running locally on Zak's machine) isn't reachable from here. ` +
      `Try one of the suggested questions below, or run the local demo: \`docker compose up -d && npm run local\`.`,
  };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validChatInput(body: { artworkId?: unknown; question?: unknown }): {
  ok: boolean; artworkId?: string; question?: string; error?: string;
} {
  const artworkId = typeof body.artworkId === "string" ? body.artworkId.trim() : "";
  const question = typeof body.question === "string" ? body.question.trim() : "";
  if (!artworkId || artworkId.length > 80 || !getArtwork(artworkId)) return { ok: false, error: "Unknown artwork." };
  if (!question || question.length > 500) return { ok: false, error: "Please ask a question (up to 500 characters)." };
  return { ok: true, artworkId, question };
}

export function validInquiryInput(body: { artworkId?: unknown; name?: unknown; email?: unknown; message?: unknown }): {
  ok: boolean; artworkId?: string; name?: string; email?: string; message?: string; error?: string;
} {
  const artworkId = typeof body.artworkId === "string" ? body.artworkId.trim() : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const message = typeof body.message === "string" ? body.message.trim().slice(0, 2000) : "";
  const artwork = artworkId ? getArtwork(artworkId) : null;
  if (!artwork) return { ok: false, error: "No artwork selected." };
  if (!name) return { ok: false, error: "Please share your name." };
  if (!EMAIL_RE.test(email)) return { ok: false, error: "That email doesn't look right." };
  return { ok: true, artworkId, name, email, message };
}
