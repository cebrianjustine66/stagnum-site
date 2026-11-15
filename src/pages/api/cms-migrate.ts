// Reprise du contenu actuel : copie les fichiers src/content/*.json dans la base
// (comme contenu publié). À lancer une fois en local. Idempotent : relançable sans risque.
import type { APIRoute } from 'astro';
import { migratePublished } from '../../lib/cms/store';

export const prerender = false;

const files = import.meta.glob('../../content/*.json', { eager: true }) as Record<string, { default: unknown }>;

export const POST: APIRoute = async () => {
  if (!import.meta.env.DEV) return new Response('Reprise disponible seulement en local', { status: 404 });
  const migrated: string[] = [];
  for (const [path, mod] of Object.entries(files)) {
    const key = path.split('/').pop()!.replace(/\.json$/, '');
    await migratePublished(key, mod.default);
    migrated.push(key);
  }
  return Response.json({ ok: true, count: migrated.length, migrated });
};
