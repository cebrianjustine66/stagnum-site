// Où l'éditeur lit et enregistre les contenus.
// Sur l'ordinateur (npm run dev) : directement dans les fichiers de src/content/.
// En ligne : dans le dépôt GitHub, avec le compte GitHub de la personne connectée. Chaque publication
// crée un commit sur main, et Vercel remet le site à jour tout seul.
import { REPO } from './schema';

export interface Loaded {
  texts: Record<string, string>; // contenu brut de chaque fichier
  version: Record<string, string>; // empreinte de chaque fichier au chargement (pour repérer les modifications faites entre-temps)
}

export interface User { login: string; name: string; avatar: string }

export const ONLINE = !import.meta.env.DEV || import.meta.env.PUBLIC_KEYSTATIC_MODE === 'github';
const BRANCH = 'main';
const isContent = (p: string) => p.startsWith('src/content/') && /\.(json|md)$/.test(p);

export class AuthError extends Error {}
export class ConflictError extends Error {
  constructor(public files: string[]) { super('conflict'); }
}

/* ---------- Sur l'ordinateur ---------- */

async function localLoad(): Promise<Loaded> {
  const res = await fetch('/api/edition/files');
  if (!res.ok) throw new Error('Lecture des fichiers impossible');
  const { files } = await res.json();
  return { texts: files, version: { ...files } };
}

async function localSave(changes: Record<string, string | null>, loaded: Loaded) {
  const current = (await localLoad()).texts;
  const changed = Object.keys(changes).filter((p) => current[p] !== loaded.version[p]);
  if (changed.length) throw new ConflictError(changed);
  const res = await fetch('/api/edition/files', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ files: changes }) });
  if (!res.ok) throw new Error(await res.text());
}

/* ---------- En ligne, sur GitHub ---------- */

const cookie = (name: string) => document.cookie.split('; ').find((c) => c.startsWith(name + '='))?.split('=').slice(1).join('=');
const token = () => cookie('keystatic-gh-access-token');

async function gh(path: string, init: RequestInit = {}, retry = true): Promise<any> {
  let t = token();
  if (!t && retry) {
    await fetch('/api/keystatic/github/refresh-token', { method: 'POST' });
    t = token();
  }
  if (!t) throw new AuthError('Non connecté');
  const res = await fetch(`https://api.github.com${path}`, {
    ...init,
    headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${t}`, ...(init.body ? { 'Content-Type': 'application/json' } : {}), ...init.headers },
  });
  if (res.status === 401 && retry) {
    await fetch('/api/keystatic/github/refresh-token', { method: 'POST' });
    return gh(path, init, false);
  }
  if (res.status === 401) throw new AuthError('Session expirée');
  if (!res.ok) {
    const err = new Error(`GitHub ${res.status}`);
    (err as any).status = res.status;
    throw err;
  }
  return res.status === 204 ? null : res.json();
}

const decode = (b64: string) => new TextDecoder().decode(Uint8Array.from(atob(b64.replace(/\n/g, '')), (c) => c.charCodeAt(0)));

async function contentTree() {
  const ref = await gh(`/repos/${REPO}/git/ref/heads/${BRANCH}`);
  const commit = await gh(`/repos/${REPO}/git/commits/${ref.object.sha}`);
  const tree = await gh(`/repos/${REPO}/git/trees/${commit.tree.sha}?recursive=1`);
  const blobs: Record<string, string> = {};
  for (const item of tree.tree) if (item.type === 'blob' && isContent(item.path)) blobs[item.path] = item.sha;
  return { commitSha: ref.object.sha as string, treeSha: commit.tree.sha as string, blobs };
}

async function githubLoad(): Promise<Loaded> {
  const { blobs } = await contentTree();
  const entries = await Promise.all(
    Object.entries(blobs).map(async ([path, sha]) => [path, decode((await gh(`/repos/${REPO}/git/blobs/${sha}`)).content)] as const),
  );
  return { texts: Object.fromEntries(entries), version: blobs };
}

async function githubSave(changes: Record<string, string | null>, loaded: Loaded, message: string) {
  const latest = await contentTree();
  const changed = Object.keys(changes).filter((p) => latest.blobs[p] !== loaded.version[p]);
  if (changed.length) throw new ConflictError(changed);
  const tree = await gh(`/repos/${REPO}/git/trees`, {
    method: 'POST',
    body: JSON.stringify({
      base_tree: latest.treeSha,
      // null : fichier supprimé (un article retiré du blog).
      tree: Object.entries(changes).map(([path, content]) => (content === null ? { path, mode: '100644', type: 'blob', sha: null } : { path, mode: '100644', type: 'blob', content })),
    }),
  });
  const commit = await gh(`/repos/${REPO}/git/commits`, {
    method: 'POST',
    body: JSON.stringify({ message, tree: tree.sha, parents: [latest.commitSha] }),
  });
  await gh(`/repos/${REPO}/git/refs/heads/${BRANCH}`, { method: 'PATCH', body: JSON.stringify({ sha: commit.sha }) });
}

export async function currentUser(): Promise<User | null> {
  if (!ONLINE) return null;
  try {
    const u = await gh('/user');
    const repo = await gh(`/repos/${REPO}`);
    if (!repo.permissions?.push) throw new AuthError('no-access');
    return { login: u.login, name: u.name || u.login, avatar: u.avatar_url };
  } catch (e) {
    if (e instanceof AuthError) throw e;
    if ((e as any).status === 404) throw new AuthError('no-access');
    throw e;
  }
}

export function login() {
  // La connexion passe par l'écran GitHub de Keystatic, qui nous renvoie ensuite vers /edition.
  document.cookie = 'edition-retour=1; path=/; max-age=600; samesite=lax';
  location.href = '/api/keystatic/github/login';
}

export function logout() {
  document.cookie = 'edition-retour=1; path=/; max-age=600; samesite=lax';
  location.href = '/api/keystatic/github/logout';
}

export const load = () => (ONLINE ? githubLoad() : localLoad());
// Un contenu à null est supprimé.
export const save = (changes: Record<string, string | null>, loaded: Loaded, message: string) =>
  ONLINE ? githubSave(changes, loaded, message) : localSave(changes, loaded);
