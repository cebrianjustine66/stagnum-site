// Moteur du CMS : lire le contenu, enregistrer un brouillon, publier, historique.
// Chaque "document" (une page, un article…) est repéré par une clé et stocke
// deux états : le brouillon (draft, en cours) et le publié (visible du public),
// plus, si besoin, une version programmée (scheduled) à mettre en ligne à une heure donnée.
//
// Publication programmée : pas de tâche planifiée. Le site est lu en direct, donc dès
// qu'une page lit un document dont l'heure est passée, la version programmée devient
// la version publiée (une seule fois, de façon atomique), puis la page l'affiche.
import { db, ensureSchema } from './db';
import type { Row } from '@libsql/client';

export type VersionKind = 'draft' | 'published' | 'scheduled';
export type Version = { id: number; kind: VersionKind; at: string; by: string | null };
export type Doc<T = unknown> = {
  key: string;
  published: T | null;
  draft: T | null;
  scheduled: T | null;
  scheduledAt: string | null;
  updatedAt: string | null;
  updatedBy: string | null;
};

const s = (v: unknown) => JSON.stringify(v);
const COLS = 'key, draft, published, scheduled, scheduled_at, updated_at, updated_by';
const parse = <T,>(v: unknown) => (v ? (JSON.parse(v as string) as T) : null);

function toDoc<T>(row: Row): Doc<T> {
  return {
    key: row.key as string,
    published: parse<T>(row.published),
    draft: parse<T>(row.draft),
    scheduled: parse<T>(row.scheduled),
    scheduledAt: (row.scheduled_at as string) ?? null,
    updatedAt: (row.updated_at as string) ?? null,
    updatedBy: (row.updated_by as string) ?? null,
  };
}

// Met en ligne la version programmée si son heure est passée. Renvoie vrai si c'est fait.
async function promoteIfDue(key: string): Promise<boolean> {
  const now = new Date().toISOString();
  const r = await db().execute({
    sql: `UPDATE cms_docs SET published = scheduled, scheduled = NULL, scheduled_at = NULL,
            updated_at = ?, updated_by = COALESCE(updated_by, 'programmation')
          WHERE key = ? AND scheduled IS NOT NULL AND scheduled_at IS NOT NULL AND scheduled_at <= ?
          RETURNING published, updated_by`,
    args: [now, key, now],
  });
  const row = r.rows[0];
  if (!row) return false; // pas dû, ou déjà mis en ligne par une autre requête
  await db().execute({
    sql: 'INSERT INTO cms_versions (key, value, kind, at, by) VALUES (?, ?, ?, ?, ?)',
    args: [key, row.published as string, 'published', now, `${row.updated_by ?? 'Équipe'} (programmé)`],
  });
  return true;
}

const isDue = (d: Doc<unknown>) => !!(d.scheduled && d.scheduledAt && d.scheduledAt <= new Date().toISOString());

export async function getDoc<T = unknown>(key: string): Promise<Doc<T>> {
  await ensureSchema();
  const read = () => db().execute({ sql: `SELECT ${COLS} FROM cms_docs WHERE key = ?`, args: [key] });
  let row = (await read()).rows[0];
  if (!row) return { key, published: null, draft: null, scheduled: null, scheduledAt: null, updatedAt: null, updatedBy: null };
  if (isDue(toDoc(row))) { await promoteIfDue(key); row = (await read()).rows[0]; }
  return toDoc<T>(row);
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

// Publier tout de suite : le brouillon (ou à défaut la version programmée) passe en ligne,
// et une éventuelle programmation est annulée.
export async function publish(key: string, by: string): Promise<void> {
  await ensureSchema();
  const doc = await getDoc(key);
  const value = doc.draft ?? doc.scheduled ?? doc.published;
  if (value == null) return;
  const now = new Date().toISOString();
  await db().execute({
    sql: 'UPDATE cms_docs SET published = ?, draft = NULL, scheduled = NULL, scheduled_at = NULL, updated_at = ?, updated_by = ? WHERE key = ?',
    args: [s(value), now, by, key],
  });
  await db().execute({
    sql: 'INSERT INTO cms_versions (key, value, kind, at, by) VALUES (?, ?, ?, ?, ?)',
    args: [key, s(value), 'published', now, by],
  });
}

// Programmer la publication : le brouillon (ou la version déjà programmée) sera mis en ligne
// à l'heure `at` (date ISO). Le contenu publié actuel reste visible jusque-là.
export async function schedule(key: string, at: string, by: string): Promise<void> {
  await ensureSchema();
  const when = new Date(at);
  if (Number.isNaN(when.getTime())) throw new Error('Date de publication invalide');
  const doc = await getDoc(key);
  const value = doc.draft ?? doc.scheduled;
  if (value == null) throw new Error('Rien à programmer : enregistre d’abord un brouillon');
  const iso = when.toISOString();
  const now = new Date().toISOString();
  await db().execute({
    sql: 'UPDATE cms_docs SET scheduled = ?, scheduled_at = ?, draft = NULL, updated_at = ?, updated_by = ? WHERE key = ?',
    args: [s(value), iso, now, by, key],
  });
  await db().execute({
    sql: 'INSERT INTO cms_versions (key, value, kind, at, by) VALUES (?, ?, ?, ?, ?)',
    args: [key, s(value), 'scheduled', now, by],
  });
  if (iso <= now) await promoteIfDue(key); // heure déjà passée : en ligne tout de suite
}

// Annuler la programmation : la version programmée redevient un brouillon (rien n'est perdu).
export async function unschedule(key: string, by: string): Promise<void> {
  await ensureSchema();
  const now = new Date().toISOString();
  await db().execute({
    sql: `UPDATE cms_docs SET draft = COALESCE(draft, scheduled), scheduled = NULL, scheduled_at = NULL,
            updated_at = ?, updated_by = ? WHERE key = ? AND scheduled IS NOT NULL`,
    args: [now, by, key],
  });
}

// Liste tous les documents dont la clé commence par un préfixe (ex. "blog/").
export async function listDocs<T = unknown>(prefix: string): Promise<Doc<T>[]> {
  await ensureSchema();
  const read = () => db().execute({ sql: `SELECT ${COLS} FROM cms_docs WHERE key LIKE ? ORDER BY key`, args: [prefix + '%'] });
  let docs = (await read()).rows.map((row) => toDoc<T>(row));
  const due = docs.filter(isDue);
  if (due.length) {
    for (const d of due) await promoteIfDue(d.key);
    docs = (await read()).rows.map((row) => toDoc<T>(row));
  }
  return docs;
}

export async function history(key: string, limit = 20): Promise<Version[]> {
  await ensureSchema();
  const r = await db().execute({
    sql: 'SELECT id, kind, at, by FROM cms_versions WHERE key = ? ORDER BY id DESC LIMIT ?',
    args: [key, limit],
  });
  return r.rows.map((row) => ({
    id: Number(row.id),
    kind: row.kind as VersionKind,
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
