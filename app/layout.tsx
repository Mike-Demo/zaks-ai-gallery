import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Thresholds — Zak's AI Gallery Guide",
  description:
    "Explore Zak's exhibition Thresholds with a private AI guide grounded in the artist's own notes. Ask about any work, check availability, and contact Zak.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <div className="wrap">
            <a className="brand" href="/">
              Thresholds<small>Zak · AI Gallery Guide</small>
            </a>
            <nav className="site-nav">
              <a href="/#works">Works</a>
              <a href="/about">About Zak</a>
              <a href="/#guide-how">The guide</a>
            </nav>
          </div>
        </header>
        <main>{children}</main>
        <footer>
          <div className="wrap">
            <p>
              <strong>Thresholds</strong> — a solo exhibition by Zak, Oct 9 – Nov 21, 2026.
              The AI guide answers only from Zak&apos;s approved notes and catalog data.
            </p>
            <p>Sample build for the open-source AI challenge — artwork, notes, and prices are placeholders.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
