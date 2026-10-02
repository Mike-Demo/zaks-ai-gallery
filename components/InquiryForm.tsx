"use client";

import { useState } from "react";

export function InquiryForm({
  artworkId,
  artworkTitle,
  availability,
}: {
  artworkId: string;
  artworkTitle: string;
  availability: string;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const soldish = availability === "sold" || availability === "not-for-sale";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (sending) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ artworkId, name, email, message }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Couldn't send your inquiry.");
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't send your inquiry.");
    } finally {
      setSending(false);
    }
  }

  if (done) {
    return (
      <div className="success" role="status">
        <h2>Thank you — Zak has your inquiry.</h2>
        <p>
          Your message about <strong>“{artworkTitle}”</strong> is on its way to
          Zak. They&apos;ll reply personally about availability, pricing, and
          next steps.
        </p>
      </div>
    );
  }

  return (
    <section className="inquiry" aria-label={`Express interest in ${artworkTitle}`}>
      <h2>Ask about acquiring this work</h2>
      <p style={{ margin: "4px 0 0", color: "var(--ink-soft)", fontSize: "0.92rem" }}>
        {soldish
          ? `“${artworkTitle}” isn't currently listed as available, but you're welcome to ask Zak about it — or about similar works.`
          : `Interested in “${artworkTitle}”? Send Zak a note.`}
      </p>
      <form onSubmit={submit}>
        <label htmlFor="inq-name">Name</label>
        <input
          id="inq-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
          required
        />
        <label htmlFor="inq-email">Email</label>
        <input
          id="inq-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
        />
        <label htmlFor="inq-message">Message <span style={{ fontWeight: 400 }}>(optional)</span></label>
        <textarea
          id="inq-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={`Hi Zak, I'm interested in learning more about “${artworkTitle}”…`}
        />
        <p className="disclaimer">
          Submitting this form does not reserve the artwork. Zak will confirm
          current availability personally.
        </p>
        {error && <p className="error">{error}</p>}
        <button className="btn" type="submit" disabled={sending}>
          {sending ? "Sending…" : "I'm interested — send to Zak"}
        </button>
      </form>
    </section>
  );
}
