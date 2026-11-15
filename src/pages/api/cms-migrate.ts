// Reprise du contenu actuel : copie les fichiers src/content/*.json dans la base
// (comme contenu publié). À lancer une fois en local. Idempotent : relançable sans risque.
import type { APIRoute } from 'astro';
import { migratePublished } from '../../lib/cms/store';
import { LANDINGS } from '../../data/pages';
import { MONDES } from '../../data/mondes';

export const prerender = false;

const files = import.meta.glob('../../content/*.json', { eager: true }) as Record<string, { default: unknown }>;

export const POST: APIRoute = async () => {
  if (!import.meta.env.DEV) return new Response('Reprise disponible seulement en local', { status: 404 });
  const migrated: string[] = [];
  // Pages « simples » (accueil, tarifs, à propos, comparatif…)
  for (const [path, mod] of Object.entries(files)) {
    const key = path.split('/').pop()!.replace(/\.json$/, '');
    await migratePublished(key, mod.default);
    migrated.push(key);
  }
  // Pages produit (/logiciel-…) : une clé pages/<slug> par page.
  for (const l of LANDINGS) {
    await migratePublished(`pages/${l.slug}`, l);
    migrated.push(`pages/${l.slug}`);
  }
  // Pages « mondes » (au-bureau, au-comptoir, sur-le-terrain).
  for (const m of MONDES) {
    await migratePublished(`mondes/${m.slug}`, m);
    migrated.push(`mondes/${m.slug}`);
  }
  return Response.json({ ok: true, count: migrated.length, migrated });
};
