import { getArtworks, getArtwork } from "@/lib/artworks";
import { ArtworkCard } from "@/components/ArtworkCard";

export default function Home() {
  const artworks = getArtworks();
  const signature = artworks.find((a) => a.signature) ?? artworks[0];

  return (
    <>
      <section className="hero">
        <div className="wrap">
          <div className="kicker">A solo exhibition · Oct 9 – Nov 21, 2026</div>
          <h1>Thresholds</h1>
          <p className="lede">
            Six works about the moments between things — the hallway before the
            door opens, the season before it turns. Explore the show with
            Zak&apos;s private AI guide, grounded entirely in the artist&apos;s
            own notes.
          </p>
          <div className="hero-cta">
            <a className="btn" href="#works">Enter the exhibition</a>
            <a className="btn ghost" href={`/artworks/${signature.id}`}>
              Start with “{signature.title}”
            </a>
          </div>
        </div>
      </section>

      <section className="section" id="works">
        <div className="wrap">
          <h2>The works</h2>
          <p className="sub">
            Every piece shows verified price and availability from Zak&apos;s
            catalog. Open any work to ask the guide about it.
          </p>
          <div className="art-grid">
            {artworks.map((a) => (
              <ArtworkCard key={a.id} artwork={a} />
            ))}
          </div>
        </div>
      </section>

      <section className="section" id="about-zak">
        <div className="wrap two-col">
          <div>
            <h2>About Zak</h2>
            <p className="sub">
              Zak is a painter working in oil and cold wax on panel. Their work
              explores memory, distance, and the physical feeling of moving
              through transitional spaces — hallways, shorelines, seasons.
            </p>
            <a className="btn ghost" href="/about">More about Zak</a>
          </div>
          <div className="how-box" id="guide-how">
            <h3>How the AI guide works</h3>
            <p style={{ fontSize: "0.92rem", color: "var(--ink-soft)" }}>
              The guide answers from three sources only: Zak&apos;s artist
              notes, the exhibition statement, and the artwork catalog. Prices
              and availability come straight from structured data — never from
              the model. When Zak&apos;s notes don&apos;t cover a question, the
              guide says so instead of inventing an answer.
            </p>
            <p style={{ fontSize: "0.92rem", color: "var(--ink-soft)" }}>
              The story engine runs on open-weight models (Qwen3) locally, so
              Zak&apos;s private process notes never leave his control.
            </p>
          </div>
        </div>
      </section>

      <section className="section" id="contact">
        <div className="wrap">
          <h2>Contact</h2>
          <p className="sub">
            Interested in a piece? Open its page and use the{" "}
            <em>“Ask about acquiring this work”</em> form — your message goes
            straight to Zak with the artwork attached.
          </p>
        </div>
      </section>
    </>
  );
}
