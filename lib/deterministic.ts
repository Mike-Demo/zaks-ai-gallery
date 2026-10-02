import {
  availabilityLabel,
  formatPrice,
  getArtwork,
  type Artwork,
} from "./artworks";
import { UNKNOWN_ANSWER } from "./prompts";

export interface DeterministicAnswer {
  answer: string;
  sources: string[];
  handled: boolean;
}

const PRICE_RE = /\b(how much|price|cost|priced|pricing|\$)\b/i;
const AVAIL_RE = /\b(available|for sale|still have|sold|reserved|buy it|purchase)\b/i;
const DIM_RE = /\b(dimensions?|size|how big|measurements?|inches)\b/i;
const MEDIUM_RE = /\b(medium|material|made of|painted with|canvas|panel)\b/i;
const CONTACT_RE = /\b(contact|email|reach zak|get in touch|buy|acquire|purchase|interested)\b/i;
const SIMILAR_RE = /\b(similar|other works|which works|like this|explore.*theme|same.*theme)\b/i;

/**
 * Commerce and factual questions are answered deterministically from
 * artworks.json — the LLM never generates prices or availability.
 * Returns handled:false when the question needs retrieval + generation.
 */
export function deterministicAnswer(
  artworkId: string,
  question: string,
  allArtworks: Artwork[],
): DeterministicAnswer {
  const artwork = getArtwork(artworkId);
  if (!artwork) {
    return { answer: UNKNOWN_ANSWER, sources: [], handled: true };
  }
  const q = question.trim();
  const label = (id: string) => `Artwork catalog: ${getArtwork(id)?.title ?? id}`;

  if (PRICE_RE.test(q) && !AVAIL_RE.test(q)) {
    return {
      handled: true,
      sources: [label(artwork.id)],
      answer:
        `“${artwork.title}” is listed at ${formatPrice(artwork)}. ` +
        `Prices are set by Zak — I can't negotiate or hold a price. ` +
        `Use the “Ask about acquiring this work” form and Zak will confirm.`,
    };
  }

  if (AVAIL_RE.test(q)) {
    const status = availabilityLabel(artwork);
    const priceBit =
      artwork.availability === "available"
        ? ` It is listed at ${formatPrice(artwork)}.`
        : "";
    return {
      handled: true,
      sources: [label(artwork.id)],
      answer:
        `“${artwork.title}”: ${status}.${priceBit} ` +
        `Availability can change — submitting an inquiry does not reserve the work.`,
    };
  }

  if (DIM_RE.test(q)) {
    return {
      handled: true,
      sources: [label(artwork.id)],
      answer: `“${artwork.title}” measures ${artwork.dimensions}.`,
    };
  }

  if (MEDIUM_RE.test(q)) {
    return {
      handled: true,
      sources: [label(artwork.id)],
      answer: `Zak made “${artwork.title}” with ${artwork.medium.toLowerCase()}.`,
    };
  }

  if (CONTACT_RE.test(q) && !PRICE_RE.test(q)) {
    return {
      handled: true,
      sources: ["Exhibition contact information"],
      answer:
        `The fastest way to reach Zak about “${artwork.title}” is the ` +
        `“Ask about acquiring this work” form on this page — it sends your ` +
        `message straight to Zak with the artwork attached.`,
    };
  }

  if (SIMILAR_RE.test(q)) {
    const others = allArtworks
      .filter((a) => a.id !== artwork.id)
      .map((a) => {
        const shared = a.themes.filter((t) => artwork.themes.includes(t));
        return { a, shared: shared.length };
      })
      .filter((x) => x.shared > 0)
      .sort((x, y) => y.shared - x.shared)
      .slice(0, 3);
    if (others.length === 0) {
      return {
        handled: true,
        sources: [label(artwork.id)],
        answer: `None of the other works in this show share “${artwork.title}”'s themes directly — Zak's notes treat it as an outlier. You may still enjoy browsing the full grid.`,
      };
    }
    const list = others
      .map((x) => `“${x.a.title}” (shared themes: ${x.a.themes.filter((t) => artwork.themes.includes(t)).join(", ")})`)
      .join("; ");
    return {
      handled: true,
      sources: [label(artwork.id), "Artwork catalog"],
      answer: `Works exploring similar ideas: ${list}. Open any of them to ask the guide about it.`,
    };
  }

  return { handled: false, answer: "", sources: [] };
}
