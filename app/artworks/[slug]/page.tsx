import { notFound } from "next/navigation";
import { getArtwork, getArtworks, getArtworkNotes, formatPrice, availabilityLabel } from "@/lib/artworks";
import { GalleryGuide } from "@/components/GalleryGuide";
import { InquiryForm } from "@/components/InquiryForm";

export function generateStaticParams() {
  return getArtworks().map((a) => ({ slug: a.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const artwork = getArtwork(slug);
  if (!artwork) return { title: "Not found" };
  return {
    title: `${artwork.title} — Thresholds`,
    description: artwork.shortDescription,
  };
}

export default async function ArtworkPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const artwork = getArtwork(slug);
  if (!artwork) notFound();
  const notes = getArtworkNotes(slug);

  return (
    <div className="wrap">
      <p className="breadcrumb">
        <a href="/">Thresholds</a> / {artwork.title}
      </p>
      <div className="detail">
        <figure>
          <img src={artwork.image} alt={`${artwork.title} by Zak — ${artwork.shortDescription}`} />
        </figure>
        <div>
          <h1>{artwork.title}</h1>
          <p className="meta">
            {artwork.year} · {artwork.medium} · {artwork.dimensions}
          </p>
          <div className="price-block">
            <span className="amount">{formatPrice(artwork)}</span>
            <span className={`badge ${artwork.availability}`}>{availabilityLabel(artwork)}</span>
          </div>
          <p className="curated">{artwork.shortDescription}</p>
          {notes && (
            <details>
              <summary style={{ cursor: "pointer", color: "var(--accent)" }}>
                Read Zak&apos;s notes for this work
              </summary>
              <div style={{ fontSize: "0.92rem", color: "var(--ink-soft)", whiteSpace: "pre-wrap", marginTop: 8 }}>
                {notes.markdown.replace(/^# .*\n/, "")}
              </div>
            </details>
          )}
        </div>
      </div>

      <GalleryGuide artworkId={artwork.id} artworkTitle={artwork.title} />

      <InquiryForm artworkId={artwork.id} artworkTitle={artwork.title} availability={artwork.availability} />
    </div>
  );
}
