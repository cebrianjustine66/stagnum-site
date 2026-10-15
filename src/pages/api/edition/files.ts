// Lecture et écriture des contenus pour l'éditeur visuel, uniquement sur l'ordinateur (npm run dev).
// En ligne, l'éditeur passe par GitHub et cette adresse ne répond pas.
import type { APIRoute } from 'astro';
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { join, relative, resolve, sep } from 'node:path';

export const prerender = false;

const ROOT = process.cwd();
const CONTENT = resolve(ROOT, 'src/content');
const allowed = (p: string) => {
  const abs = resolve(ROOT, p);
  return abs.startsWith(CONTENT + sep) && /\.(json|md)$/.test(abs);
};

async function list(dir: string): Promise<string[]> {
  const out: string[] = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await list(p)));
    else if (/\.(json|md)$/.test(e.name)) out.push(p);
  }
  return out;
}

const off = () => new Response('Not Found', { status: 404 });

export const GET: APIRoute = async () => {
  if (!import.meta.env.DEV) return off();
  const files: Record<string, string> = {};
  for (const abs of await list(CONTENT)) files[relative(ROOT, abs).split(sep).join('/')] = await readFile(abs, 'utf8');
  return Response.json({ files });
};

export const POST: APIRoute = async ({ request }) => {
  if (!import.meta.env.DEV) return off();
  const { files } = (await request.json()) as { files: Record<string, string> };
  for (const p of Object.keys(files)) if (!allowed(p)) return new Response(`Fichier refusé : ${p}`, { status: 400 });
  for (const [p, text] of Object.entries(files)) await writeFile(resolve(ROOT, p), text, 'utf8');
  return Response.json({ ok: true });
};
