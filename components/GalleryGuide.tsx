"use client";

import { useState } from "react";
import { SourceBadges } from "./SourceBadges";

interface ChatResponse {
  answer: string;
  sources: string[];
  mode: "deterministic" | "local-only";
  structured: { price: string; availability: string } | null;
  suggestions: string[];
  error?: string;
}

const FALLBACK_SUGGESTIONS = [
  "What inspired this piece?",
  "What themes appear here?",
  "How was it made?",
  "Is it available?",
  "Which works explore similar ideas?",
];

export function GalleryGuide({ artworkId, artworkTitle }: { artworkId: string; artworkTitle: string }) {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [sources, setSources] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>(FALLBACK_SUGGESTIONS);
  const [error, setError] = useState<string | null>(null);

  async function ask(q: string) {
    const trimmed = q.trim();
    if (!trimmed || loading) return;
    setLoading(true);
    setError(null);
    setAnswer(null);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ artworkId, question: trimmed }),
      });
      const data = (await res.json()) as ChatResponse;
      if (!res.ok) throw new Error(data.error ?? "The guide is unavailable right now.");
      setAnswer(data.answer);
      setSources(data.sources ?? []);
      if (data.suggestions?.length) setSuggestions(data.suggestions);
      setQuestion("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "The guide is unavailable right now.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="guide" aria-label={`Ask Zak's gallery guide about ${artworkTitle}`}>
      <h2>Ask Zak&apos;s Gallery Guide</h2>
      <p className="disclosure">
        This guide answers from Zak&apos;s artist notes, exhibition statement,
        and approved artwork details. It may not know everything, and it will
        say when Zak has not provided an answer.
      </p>
      <div className="chips">
        {suggestions.map((s) => (
          <button key={s} className="chip" disabled={loading} onClick={() => ask(s)}>
            {s}
          </button>
        ))}
      </div>
      <form
        className="ask-row"
        onSubmit={(e) => {
          e.preventDefault();
          ask(question);
        }}
      >
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder={`Ask about “${artworkTitle}”…`}
          maxLength={500}
          aria-label="Your question"
        />
        <button className="btn" type="submit" disabled={loading}>
          {loading ? "…" : "Ask"}
        </button>
      </form>
      {loading && <p className="typing">The guide is consulting Zak&apos;s notes…</p>}
      {error && <p className="inquiry error">{error}</p>}
      {answer && (
        <div className="answer">
          <p>{answer}</p>
          <SourceBadges sources={sources} />
        </div>
      )}
    </section>
  );
}
