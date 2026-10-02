export interface ChatRequest {
  artworkId?: unknown;
  question?: unknown;
  history?: unknown;
}

export interface InquiryRequest {
  artworkId?: unknown;
  name?: unknown;
  email?: unknown;
  message?: unknown;
}

export function validChatRequest(body: ChatRequest): {
  ok: boolean;
  artworkId?: string;
  question?: string;
  history?: { role: string; content: string }[];
  error?: string;
} {
  const artworkId = typeof body.artworkId === "string" ? body.artworkId.trim() : "";
  const question = typeof body.question === "string" ? body.question.trim() : "";
  if (!artworkId || artworkId.length > 80) return { ok: false, error: "Invalid artwork." };
  if (!question || question.length > 500) {
    return { ok: false, error: "Please ask a question (up to 500 characters)." };
  }
  let history: { role: string; content: string }[] = [];
  if (Array.isArray(body.history)) {
    history = body.history
      .filter(
        (m): m is { role: string; content: string } =>
          !!m && typeof m === "object" && typeof (m as { role?: unknown }).role === "string" &&
          typeof (m as { content?: unknown }).content === "string",
      )
      .slice(-6)
      .map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content.slice(0, 500) }));
  }
  return { ok: true, artworkId, question, history };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validInquiryRequest(body: InquiryRequest): {
  ok: boolean;
  artworkId?: string;
  name?: string;
  email?: string;
  message?: string;
  error?: string;
} {
  const artworkId = typeof body.artworkId === "string" ? body.artworkId.trim() : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const message = typeof body.message === "string" ? body.message.trim().slice(0, 2000) : "";
  if (!artworkId) return { ok: false, error: "No artwork selected." };
  if (!name) return { ok: false, error: "Please share your name." };
  if (!EMAIL_RE.test(email)) return { ok: false, error: "That email doesn't look right." };
  return { ok: true, artworkId, name, email, message };
}
