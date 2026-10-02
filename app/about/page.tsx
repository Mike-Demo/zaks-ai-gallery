import { getArtistBio, getExhibitionStatement } from "@/lib/artworks";

export default function About() {
  const bio = getArtistBio().replace(/^# .*\n/, "");
  const statement = getExhibitionStatement().replace(/^# .*\n/, "");

  return (
    <div className="wrap">
      <section className="section">
        <h1>About Zak</h1>
        <div style={{ whiteSpace: "pre-wrap", maxWidth: 700 }}>{bio}</div>
      </section>
      <section className="section">
        <h2>About <span className="serif">Thresholds</span></h2>
        <div style={{ whiteSpace: "pre-wrap", maxWidth: 700 }}>{statement}</div>
      </section>
    </div>
  );
}
