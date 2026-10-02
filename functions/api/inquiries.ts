import { withErrors, json, apiError, InputError } from "../_core/http";
import { ensureSchema, insertInquiry, type RouteEnv } from "../_core/db";
import { getArtwork } from "../_core/catalog";
import { validInquiryInput } from "../_core/guide";

/**
 * POST /api/inquiries — purchase-interest capture.
 * Stores the inquiry in the SpaceFast database with the artwork attached.
 * Responding never reserves the artwork (the form says so explicitly).
 */
const handler = withErrors(async (request: Request, env: Record<string, unknown>): Promise<Response> => {
  if (request.method !== "POST") return apiError(405, "method_not_allowed", "Use POST.");
  const { DB } = env as unknown as RouteEnv;
  if (!DB) return apiError(500, "no_database", "Database not configured.");
  await ensureSchema(DB);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new InputError("bad_json", "Request body must be JSON.");
  }
  const parsed = validInquiryInput((body ?? {}) as Record<string, unknown>);
  if (!parsed.ok) throw new InputError("invalid_input", parsed.error ?? "Invalid input.");

  const artwork = getArtwork(parsed.artworkId!);
  const id = await insertInquiry(DB, {
    artworkId: parsed.artworkId!,
    artworkTitle: artwork?.title ?? parsed.artworkId!,
    name: parsed.name!,
    email: parsed.email!,
    message: parsed.message ?? "",
    referrer: request.headers.get("referer"),
  });
  return json({ ok: true, inquiryId: id });
});

export const POST = handler;
