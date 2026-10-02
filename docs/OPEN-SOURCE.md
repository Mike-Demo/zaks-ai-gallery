# Why open matters for Zak's gallery

The challenge asks entrants to explain why open technology matters for
their project. For Zak's AI Gallery Guide, openness isn't a licensing
checkbox — it's the product's trust story.

## 1. Zak keeps his notes

The guide answers from Zak's private process notes: how works were
made, what was scraped back, what survived. With a closed-model API,
every visitor question — and the retrieved notes answering it — would
travel to a third-party provider. With Ollama + Qwen3 running locally,
nothing leaves Zak's machine. An artist's working notes stay the
artist's.

## 2. The grounding pipeline is inspectable

Trust here means "the guide won't invent my story." Anyone can read
`lib/prompts.ts` (the grounding prompt), `functions/_core/guide.ts`
(the deterministic commerce answers), and `scripts/ingest.ts` (exactly
what gets embedded). There is no black-box system prompt on someone
else's server. If Zak doubts an answer, the source labels point at the
exact Markdown file it came from.

## 3. The model is replaceable

Qwen3 4B is a choice, not a dependency. The RAG service speaks plain
HTTP to Ollama's API — swapping in Gemma, Llama, or next year's small
model is a one-line change (`CHAT_MODEL`). No vendor lock-in, no
deprecation notice that breaks the gallery.

## 4. Inference costs ~nothing

A 4B quantized model runs on an ordinary laptop. There is no per-token
bill for answering "What inspired this piece?" for the thousandth
visitor. For a solo artist, the difference between "free after setup"
and "a meter running" decides whether the guide stays online.

## 5. Another artist can fork it

Replace the images, edit `artworks.json`, add Markdown notes, run
`npm run ingest`, start the stack. No API keys, no accounts, no
contracts. The whole thing — model, embeddings, vector store, app —
is reproducible from this repository.

## What open doesn't solve

Open weights don't guarantee truth. That's why prices and availability
never come from the model — they come from `content/artworks.json`,
read as structured data. Openness gives Zak *control and inspection*;
the grounding discipline gives visitors *accuracy*. You need both.
