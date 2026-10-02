import { withErrors, json, apiError, InputError } from "../_core/http";
import { answerQuestion, validChatInput, SUGGESTED_QUESTIONS } from "../_core/guide";

/**
 * POST /api/chat — the gallery guide endpoint (SpaceFast edition).
 *
 * Answers price / availability / dimensions / medium / contact / similar-works
 * deterministically from Zak's catalog. Story questions need the local
 * open-weight model, so they get an honest local-only message here and the
 * full RAG answer from scripts/local-server.ts on the demo laptop.
 */
const handler = withErrors(async (request: Request): Promise<Response> => {
  if (request.method !== "POST") return apiError(405, "method_not_allowed", "Use POST.");
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new InputError("bad_json", "Request body must be JSON.");
  }
  const parsed = validChatInput((body ?? {}) as { artworkId?: unknown; question?: unknown });
  if (!parsed.ok) throw new InputError("invalid_input", parsed.error ?? "Invalid input.");

  const result = answerQuestion(parsed.artworkId!, parsed.question!);
  return json({
    answer: result.answer,
    sources: result.sources,
    mode: result.mode,
    structured: result.structured,
    suggestions: SUGGESTED_QUESTIONS,
  });
});

export const POST = handler;
