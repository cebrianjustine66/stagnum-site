// Moteur du CMS : lire le contenu, enregistrer un brouillon, publier, historique.
// Chaque "document" (une page, un article…) est repéré par une clé et stocke
// deux états : le brouillon (draft, en cours) et le publié (visible du public).
import { db, ensureSchema } from './db';

export type Version = { id: number; kind: 'draft' | 'published'; at: string; by: string | null };
export type Doc<T = unknown> = {
  key: string;
  published: T | null;
  draft: T | null;
  updatedAt: string | null;
  updatedBy: string | null;
};

const s = (v: unknown) => JSON.stringify(v);

export async function getDoc<T = unknown>(key: string): Promise<Doc<T>> {
  await ensureSchema();
  const r = await db().execute({
    sql: 'SELECT draft, published, updated_at, updated_by FROM cms_docs WHERE key = ?',
    args: [key],
  });
  const row = r.rows[0];
  if (!row) return { key, published: null, draft: null, updatedAt: null, updatedBy: null };
  return {
    key,
    published: row.published ? (JSON.parse(row.published as string) as T) : null,
    draft: row.draft ? (JSON.parse(row.draft as string) as T) : null,
    updatedAt: (row.updated_at as string) ?? null,
    updatedBy: (row.updated_by as string) ?? null,
  };
}

// Crée le document publié la première fois (contenu de départ), sans écraser l'existant.
export async function seedPublished<T>(key: string, value: T): Promise<void> {
  await ensureSchema();
  const existing = await db().execute({ sql: 'SELECT key FROM cms_docs WHERE key = ?', args: [key] });
  if (existing.rows.length) return;
  const now = new Date().toISOString();
  await db().execute({
    sql: 'INSERT INTO cms_docs (key, draft, published, updated_at, updated_by) VALUES (?, NULL, ?, ?, ?)',
    args: [key, s(value), now, 'seed'],
  });
  await db().execute({
    sql: 'INSERT INTO cms_versions (key, value, kind, at, by) VALUES (?, ?, ?, ?, ?)',
    args: [key, s(value), 'published', now, 'seed'],
  });
}

// Reprise du contenu existant : écrit (ou met à jour) directement le PUBLIÉ depuis les fichiers JSON.
export async function migratePublished<T>(key: string, value: T): Promise<void> {
  await ensureSchema();
  const now = new Date().toISOString();
  await db().execute({
    sql: `INSERT INTO cms_docs (key, published, updated_at, updated_by) VALUES (?, ?, ?, 'import')
          ON CONFLICT(key) DO UPDATE SET published = excluded.published, updated_at = excluded.updated_at, updated_by = 'import'`,
    args: [key, s(value), now],
  });
}

export async function saveDraft<T>(key: string, value: T, by: string): Promise<void> {
  await ensureSchema();
  const now = new Date().toISOString();
  await db().execute({
    sql: `INSERT INTO cms_docs (key, draft, updated_at, updated_by) VALUES (?, ?, ?, ?)
          ON CONFLICT(key) DO UPDATE SET draft = excluded.draft, updated_at = excluded.updated_at, updated_by = excluded.updated_by`,
    args: [key, s(value), now, by],
  });
  await db().execute({
    sql: 'INSERT INTO cms_versions (key, value, kind, at, by) VALUES (?, ?, ?, ?, ?)',
    args: [key, s(value), 'draft', now, by],
  });
}

export async function publish(key: string, by: string): Promise<void> {
  await ensureSchema();
  const doc = await getDoc(key);
  const value = doc.draft ?? doc.published;
  if (value == null) return;
  const now = new Date().toISOString();
  await db().execute({
    sql: 'UPDATE cms_docs SET published = ?, draft = NULL, updated_at = ?, updated_by = ? WHERE key = ?',
    args: [s(value), now, by, key],
  });
  await db().execute({
    sql: 'INSERT INTO cms_versions (key, value, kind, at, by) VALUES (?, ?, ?, ?, ?)',
    args: [key, s(value), 'published', now, by],
  });
}

export async function history(key: string, limit = 20): Promise<Version[]> {
  await ensureSchema();
  const r = await db().execute({
    sql: 'SELECT id, kind, at, by FROM cms_versions WHERE key = ? ORDER BY id DESC LIMIT ?',
    args: [key, limit],
  });
  return r.rows.map((row) => ({
    id: Number(row.id),
    kind: row.kind as 'draft' | 'published',
    at: row.at as string,
    by: (row.by as string) ?? null,
  }));
}

// Restaure une ancienne version : on la remet en BROUILLON (pour relire avant de republier).
export async function restore<T = unknown>(key: string, versionId: number, by: string): Promise<T | null> {
  await ensureSchema();
  const r = await db().execute({ sql: 'SELECT value FROM cms_versions WHERE id = ? AND key = ?', args: [versionId, key] });
  const row = r.rows[0];
  if (!row) return null;
  const value = JSON.parse(row.value as string) as T;
  await saveDraft(key, value, by);
  return value;
}
