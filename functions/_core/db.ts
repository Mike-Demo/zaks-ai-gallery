/**
 * Buyer inquiries storage. Weekend-safe delivery: every inquiry lands in
 * the SpaceFast database with the artwork attached — no email integration
 * required for the demo.
 */

export interface SpacefastDb {
  prepare(sql: string): { bind(...params: unknown[]): DbResult };
}

export interface DbResult {
  all(): Promise<{ results: Record<string, unknown>[] }>;
  first(): Promise<Record<string, unknown> | null>;
  run(): Promise<unknown>;
}

export interface RouteEnv {
  DB: SpacefastDb;
}

const SCHEMA: readonly string[] = [
  `CREATE TABLE IF NOT EXISTS inquiries (
    id VARCHAR(64) PRIMARY KEY,
    artwork_id VARCHAR(128) NOT NULL,
    artwork_title VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    message MEDIUMTEXT NULL,
    referrer VARCHAR(1024) NULL,
    created_at BIGINT NOT NULL,
    INDEX idx_inquiries_artwork (artwork_id),
    INDEX idx_inquiries_time (created_at)
  )`,
];

export async function ensureSchema(db: SpacefastDb): Promise<void> {
  for (const sql of SCHEMA) {
    await db.prepare(sql).bind().run();
  }
}

export function rid(prefix: string): string {
  const r = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now().toString(36)}${r}`;
}

export async function insertInquiry(
  db: SpacefastDb,
  i: { artworkId: string; artworkTitle: string; name: string; email: string; message: string; referrer: string | null },
): Promise<string> {
  const id = rid("inq");
  await db
    .prepare(
      `INSERT INTO inquiries (id, artwork_id, artwork_title, name, email, message, referrer, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(id, i.artworkId, i.artworkTitle, i.name, i.email, i.message || null, i.referrer, Date.now())
    .run();
  return id;
}
