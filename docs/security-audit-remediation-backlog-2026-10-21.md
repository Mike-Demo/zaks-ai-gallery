# Security audit remediation backlog — 2026-10-21

Issue creation was unavailable in this session, so the prioritized issue titles and ready-to-file bodies are collected here. File each confirmed finding as a separate issue in the order below. Each body links to parent issue [#1](https://github.com/Mike-Demo/zaks-ai-gallery/issues/1).

## Priority

1. **Medium — anonymous inquiry spam.** The public endpoint can be called by anyone and every valid submission is inserted. It has the broadest lower-trust reachability.
2. **Medium — Ollama and Chroma published on all interfaces.** The unauthenticated APIs are exposed to the LAN when the Compose stack is run; Chroma also accepts collection deletion.
3. **Low — local demo server published on all interfaces.** Unauthenticated routes intended for local/demo use are callable by LAN devices.
4. **Low — unbounded local request bodies.** A reachable client can consume process memory before input validation; this is a separate root cause from the server bind.
5. **Low — inquiry PII is committable.** Disclosure requires an operator commit/push, making it less directly reachable by an untrusted caller than the server-side exposures above.

The two local-server findings are separate issues: they affect the same server, but have distinct root causes and smallest fixes. The rejected candidate `unpinned-release-tooling-fetched-and-executed-at-publish-time` is intentionally excluded.

## 1. `[security][medium] Rate-limit anonymous inquiry submissions`

**Ready-to-file body:**

Parent: #1

**Fingerprint:** `unauthenticated-inquiry-submission-spam-and-db-flooding`

**Evidence:** The public SpaceFast inquiries handler checks only the method and database presence, runs `ensureSchema`, parses JSON, validates shape via `validInquiryInput`, and unconditionally inserts a row. `validInquiryInput` caps only the message (sliced to 2000 chars); name and email have no length cap. A repo-wide search found no rate limiting, CAPTCHA, dedupe, or quota control anywhere in source. Each syntactically valid anonymous POST therefore creates one indistinguishable row in the operator's lead table…

**Root cause:** The anonymous public inquiry endpoint performs shape validation only and inserts unconditionally: no per-principal rate limit, CAPTCHA, dedupe, or quota exists anywhere in source, and name/email lack length caps.

**Smallest fix:** Add a per-IP rate limit and/or Turnstile check in `functions/api/inquiries.ts` before `insertInquiry`, and cap name and email at <=255 chars in `validInquiryInput` (`functions/_core/guide.ts`) to match the `VARCHAR(255)` columns.

## 2. `[security][medium] Bind Ollama and Chroma ports to loopback`

**Ready-to-file body:**

Parent: #1

**Fingerprint:** `unauthenticated-ollama-and-chroma-published-on-all-interfaces`

**Evidence:** `docker-compose.yml` publishes `"11434:11434"` (Ollama) and `"8000:8000"` (Chroma) with no `127.0.0.1` host bind, so Docker publishes both ports on all interfaces, and sets no auth-related environment for either image. That no credential is required in the shipped configuration is proved by the project's own code: `lib/rag.ts` calls both REST APIs with only a Content-Type header, and `scripts/ingest.ts` recreates the collection with an unauthenticated DELETE. A LAN principal can therefore query the gallery…

**Root cause:** Compose port mappings omit the loopback host bind and neither service is configured with any authentication, so both REST APIs are reachable unauthenticated from every network interface.

**Smallest fix:** Publish both ports on loopback only in `docker-compose.yml` (`"127.0.0.1:11434:11434"`, `"127.0.0.1:8000:8000"`); application defaults already point at localhost, so no code change is needed.

## 3. `[security][low] Bind the local demo server to loopback`

**Ready-to-file body:**

Parent: #1

**Fingerprint:** `local-server-binds-all-interfaces-unauthenticated`

**Evidence:** `scripts/local-server.ts` starts its HTTP server with `server.listen(PORT, callback)` and no host argument, so Node binds the unspecified address (all IPv4/IPv6 interfaces), despite the header comment and README framing local mode as `http://localhost:3100` for the operator's own/demo use. The request dispatch routes POST `/api/chat` and POST `/api/inquiries` with no authentication, token, or origin check anywhere in the file, so any LAN device can invoke the RAG guide and write local inquiries. Severity…

**Root cause:** `server.listen` is called without a host argument, binding all interfaces, and no route in the local server performs any authentication or origin check.

**Smallest fix:** Bind explicitly to loopback in `scripts/local-server.ts` so the local server is reachable only from the operator's machine.

## 4. `[security][low] Limit local server request body size`

**Ready-to-file body:**

Parent: #1

**Fingerprint:** `local-server-unbounded-request-body-read`

**Evidence:** In `scripts/local-server.ts`, `readBody` pushes every request chunk into an array and `Buffer.concat`s it with no running byte count, no Content-Length check, no timeout, and no abort threshold. Both API handlers await `readBody` before any validation runs, while validated legitimate bodies are tiny (question <=500 chars, message sliced to 2000), so memory growth per request is entirely attacker-controlled until the client stops or the process exhausts memory. Reachability is loopback for the operator…

**Root cause:** `readBody` buffers the whole request body in memory with no byte cap, length check, or abort threshold, and it runs before any input validation in both API handlers.

**Smallest fix:** Track accumulated bytes in `readBody` and destroy the request with a 413 once it exceeds a small cap (e.g. 16 KiB, comfortably above the validated field limits).

## 5. `[security][low] Keep local inquiry PII out of the repository tree`

**Ready-to-file body:**

Parent: #1

**Fingerprint:** `buyer-pii-jsonl-written-inside-repo-and-not-gitignored`

**Evidence:** In local mode, `handleInquiry` appends a record containing the buyer's name, email address, and message to `data/inquiries.jsonl` inside the repository working tree. The `.gitignore` file contains no `data/` or `.env*` entry, and `git check-ignore` confirms the file is not ignored at this source ref; no data file is tracked yet, so no PII disclosure has occurred in this snapshot. The missing lifecycle control means one ordinary commit-all/push in the operator's routine workflow would publish buyer PII to t…

**Root cause:** The local inquiry store is placed inside the repository tree (`dataDir = join(root, 'data')`) and `.gitignore` has no rule covering `data/` (or `.env*`), so the PII file the code creates by design is committable by default.

**Smallest fix:** Add `data/` (and `.env*`) to `.gitignore`, and preferably write the local inquiry store outside the repo tree (e.g. under `.local/`, already ignored).

## 6. `[security][needs-validation] Audit leads to validate`

**Ready-to-file body:**

Parent: #1

- [ ] **Local RAG guide interpolates visitor question and visitor-fabricated conversation history verbatim into a single-role grounding prompt** (`rag-prompt-injection-via-question-and-fabricated-history`)
  - Claimed root cause: Visitor-controlled question and history (including client-claimed assistant turns with embedded newlines) are interpolated verbatim into a single user-role prompt, so untrusted text shares the instruction region with the grounding rules and the authoritative catalog block.
  - Exact missing fact from parent issue: The behaviour of the shipped model (qwen3:4b, temperature 0.3, num_predict 220) on adversarial eval questions plus fabricated-history variants (e.g. a fake prior assistant turn confirming a discount or an invented fact) is unknown: whether the answer misstates price/availability/artist facts or complies cannot be decided from source, and running t…
