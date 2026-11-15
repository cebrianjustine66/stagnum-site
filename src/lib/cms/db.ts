// Connexion à la base du CMS.
// - En local (dév) : un simple fichier, aucun compte à créer.
// - En ligne (plus tard) : une base hébergée, via les variables LIBSQL_URL / LIBSQL_AUTH_TOKEN
//   (ex. Turso, ou une base Postgres compatible). Le code ne change pas.
import { createClient, type Client } from '@libsql/client';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

let client: Client | null = null;

export function db(): Client {
  if (client) return client;
  const url = process.env.LIBSQL_URL;
  if (url) {
    client = createClient({ url, authToken: process.env.LIBSQL_AUTH_TOKEN });
  } else {
    const dir = resolve(process.cwd(), '.data');
    try { mkdirSync(dir, { recursive: true }); } catch {}
    client = createClient({ url: `file:${resolve(dir, 'cms.db')}` });
  }
  return client;
}

let ready: Promise<void> | null = null;

export function ensureSchema(): Promise<void> {
  if (ready) return ready;
  const c = db();
  ready = (async () => {
    await c.execute(`CREATE TABLE IF NOT EXISTS cms_docs (
      key TEXT PRIMARY KEY,
      draft TEXT,
      published TEXT,
      updated_at TEXT,
      updated_by TEXT
    )`);
    await c.execute(`CREATE TABLE IF NOT EXISTS cms_versions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT NOT NULL,
      value TEXT NOT NULL,
      kind TEXT NOT NULL,
      at TEXT NOT NULL,
      by TEXT
    )`);
  })();
  return ready;
}
