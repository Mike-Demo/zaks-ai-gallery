import { availabilityLabel, formatPrice, type Artwork } from "@/lib/artworks";

export function ArtworkCard({ artwork }: { artwork: Artwork }) {
  return (
    <a className="art-card" href={`/artworks/${artwork.id}`}>
      <img src={artwork.image} alt={`${artwork.title} by Zak`} loading="lazy" />
      <div className="body">
        <h3>{artwork.title}</h3>
        <div className="meta">
          {artwork.year} · {artwork.medium}
        </div>
        <div className="row">
          <span className="price">{formatPrice(artwork)}</span>
          <span className={`badge ${artwork.availability}`}>{availabilityLabel(artwork)}</span>
        </div>
      </div>
    </a>
  );
}
