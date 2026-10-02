# Why open matters for Zak's gallery

The challenge asks why open technology matters here. Short version:
for this guide, openness is the trust story. Not a license badge. The
thing that lets Zak hand his private notes to a machine and still sleep
at night.

## 1. Zak keeps his notes

The guide answers from Zak's process notes. How a piece got made, what
got scraped back, what survived. Point that at a closed-model API and
every visitor question leaves the building, retrieved notes and all.
Run Ollama and Qwen3 on Zak's own laptop and nothing leaves the room.
An artist's working notes stay the artist's. That's the whole pitch.

## 2. You can read the plumbing

"The guide won't invent my story" is a promise you should be able to
check. It's all here: `lib/prompts.ts` holds the grounding prompt,
`functions/_core/guide.ts` holds the commerce answers, `scripts/ingest.ts`
shows exactly what gets embedded and how. No hidden system prompt on
someone else's server. If Zak doubts an answer, the source labels point
at the exact Markdown file it came from. Go look.

## 3. The model is a choice, not a marriage

Qwen3 4B is what we picked. The RAG service talks plain HTTP to Ollama's
API, so swapping in Gemma or Llama or whatever small model shows up
next year means changing one line (`CHAT_MODEL`). Nobody can deprecate
Zak's gallery out from under him.

## 4. It costs basically nothing to run

A 4B quantized model runs on a normal laptop. No per-token meter ticking
every time someone asks "what inspired this piece?" for the thousandth
time. For a solo artist, free-after-setup versus a running meter is the
difference between the guide staying up and coming down.

## 5. Another artist can just fork it

New images, edit `artworks.json`, drop in Markdown notes, run
`npm run ingest`, start the stack. No API keys. No accounts. No sales
call. Model, embeddings, vector store, app: all reproducible from this
repo.

## What open doesn't solve

Open weights don't make answers true. Prices and availability never come
from the model. They come from `content/artworks.json`, read as plain
structured data. Openness gives Zak control and a way to inspect what's
happening. The grounding discipline gives visitors accuracy. You need
both.
