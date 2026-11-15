// API du CMS : lecture (public) et écriture (brouillon, publication, restauration).
// Lecture : ouverte. Écriture : pour l'instant seulement en local (npm run dev) ;
// en ligne, elle sera ouverte aux membres connectés (étape « connexion des membres »).
import type { APIRoute } from 'astro';
import { getDoc, saveDraft, publish, history, restore } from '../../lib/cms/store';
import { isEditor } from '../../lib/cms/auth';

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  const key = url.searchParams.get('key');
  if (!key) return new Response('key manquant', { status: 400 });
  if (url.searchParams.get('history')) return Response.json({ versions: await history(key) });
  return Response.json(await getDoc(key));
};

export const POST: APIRoute = async ({ request, cookies }) => {
  // Écriture réservée aux membres connectés (toujours autorisée en local).
  if (!isEditor(cookies)) return new Response('Connexion requise pour éditer', { status: 401 });

  let body: { action?: string; key?: string; value?: unknown; by?: string; versionId?: number };
  try {
    body = await request.json();
  } catch {
    return new Response('JSON invalide', { status: 400 });
  }

  const { action, key, value, versionId } = body;
  if (!key) return new Response('key manquant', { status: 400 });
  const who = (body.by && String(body.by).trim()) || 'Équipe';

  if (action === 'save') await saveDraft(key, value, who);
  else if (action === 'publish') await publish(key, who);
  else if (action === 'restore') await restore(key, Number(versionId), who);
  else return new Response('action inconnue', { status: 400 });

  return Response.json({ ok: true, doc: await getDoc(key) });
};
