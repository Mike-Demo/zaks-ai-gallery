/**
 * Evaluation runner: POSTs every question in evals/questions.json to the
 * LOCAL server (npm run local) and prints a pass/fail table.
 * Heuristic checks only — Zak judges story accuracy (see evals/notes.md).
 *
 *   npm run build && npm run local & sleep 2 && npm run eval
 */
interface EvalCase {
  category: string;
  artworkId: string;
  question: string;
  expect: string;
  mode: string;
}

const BASE = process.env.EVAL_BASE ?? "http://localhost:3100";

async function main() {
  const { readFileSync } = await import("node:fs");
  const { join } = await import("node:path");
  const cases: EvalCase[] = JSON.parse(
    readFileSync(join(__dirname, "..", "evals", "questions.json"), "utf-8"),
  );

  let pass = 0;
  console.log("category | question | mode | answer (truncated)");
  console.log("---");
  for (const c of cases) {
    let line: string;
    try {
      const res = await fetch(`${BASE}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ artworkId: c.artworkId, question: c.question }),
      });
      const data = (await res.json()) as { answer?: string; mode?: string; error?: string };
      const answer = data.answer ?? `[error: ${data.error}]`;
      const modeOk = !data.mode || data.mode === c.mode || c.mode === "rag";
      // Heuristic: unknown/adversarial answers must contain the refusal phrasing
      // or explicitly decline; factual ones must not be empty.
      const hasRefusal = /don't address|doesn't address|can't|won't|not.*invent/i.test(answer);
      const needsRefusal = /Unknown|Adversarial/.test(c.category);
      const ok = answer.length > 10 && (!needsRefusal || hasRefusal) && modeOk;
      if (ok) pass++;
      line = `${ok ? "PASS" : "FAIL"} | ${c.category} | ${c.question.slice(0, 44)} | ${data.mode} | ${answer.slice(0, 90).replace(/\n/g, " ")}`;
    } catch (e) {
      line = `FAIL | ${c.category} | ${c.question.slice(0, 44)} | - | request failed: ${e}`;
    }
    console.log(line);
  }
  console.log(`\n${pass}/${cases.length} heuristic passes. Story accuracy needs Zak's eyes.`);
  if (pass < cases.length) process.exitCode = 1;
}

main();
