// API de la démo : lit et enregistre le contenu dans le « classeur » local.
// L'enregistrement ne passe PAS par GitHub : il écrit dans la base, c'est immédiat.
import type { APIRoute } from 'astro';
import { readStore, writeStore, type Store } from '../../lib/demo-cms';

export const prerender = false;

export const GET: APIRoute = async () => Response.json(await readStore());

export const POST: APIRoute = async ({ request }) => {
  // Prototype : écriture autorisée seulement en local (npm run dev).
  if (!import.meta.env.DEV) return new Response('Démo disponible seulement en local', { status: 404 });

  let body: Partial<Store>;
  try {
    body = (await request.json()) as Partial<Store>;
  } catch {
    return new Response('JSON invalide', { status: 400 });
  }

  const current = await readStore();
  const next: Store = {
    hero: { ...current.hero, ...(body.hero ?? {}) },
    intro: typeof body.intro === 'string' ? body.intro : current.intro,
    articles: Array.isArray(body.articles) ? body.articles : current.articles,
  };
  await writeStore(next);
  return Response.json({ ok: true, store: next });
};
