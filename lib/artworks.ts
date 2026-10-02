import { readFileSync } from "node:fs";
import { join } from "node:path";

export type Availability = "available" | "reserved" | "sold" | "not-for-sale";

export interface Artwork {
  id: string;
  title: string;
  year: number;
  medium: string;
  dimensions: string;
  price: number | null;
  currency: string;
  availability: Availability;
  image: string;
  shortDescription: string;
  themes: string[];
  signature?: boolean;
  exhibitionId: string;
}

export interface ArtworkNotes {
  id: string;
  markdown: string;
}

const CONTENT_DIR = join(process.cwd(), "content");

let cache: Artwork[] | null = null;

export function getArtworks(): Artwork[] {
  if (!cache) {
    const raw = readFileSync(join(CONTENT_DIR, "artworks.json"), "utf-8");
    cache = (JSON.parse(raw).artworks ?? []) as Artwork[];
  }
  return cache;
}

export function getArtwork(id: string): Artwork | null {
  return getArtworks().find((a) => a.id === id) ?? null;
}

export function getArtworkNotes(id: string): ArtworkNotes | null {
  try {
    const markdown = readFileSync(join(CONTENT_DIR, "artworks", `${id}.md`), "utf-8");
    return { id, markdown };
  } catch {
    return null;
  }
}

export function getExhibitionStatement(): string {
  return readFileSync(join(CONTENT_DIR, "exhibition.md"), "utf-8");
}

export function getArtistBio(): string {
  return readFileSync(join(CONTENT_DIR, "artist-bio.md"), "utf-8");
}

export function formatPrice(a: Artwork): string {
  if (a.price == null) return "Price on request";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: a.currency,
    maximumFractionDigits: 0,
  }).format(a.price);
}

export function availabilityLabel(a: Artwork): string {
  switch (a.availability) {
    case "available":
      return "Available";
    case "reserved":
      return "Reserved — ask Zak for details";
    case "sold":
      return "Sold";
    case "not-for-sale":
      return "Not for sale";
  }
}

/** Structured block injected into every grounded prompt — authoritative. */
export function artworkDataBlock(a: Artwork): string {
  return [
    `Title: ${a.title} (${a.year})`,
    `Medium: ${a.medium}`,
    `Dimensions: ${a.dimensions}`,
    `Price: ${formatPrice(a)}`,
    `Availability: ${availabilityLabel(a)}`,
    `Themes: ${a.themes.join(", ")}`,
    `Short description: ${a.shortDescription}`,
  ].join("\n");
}
