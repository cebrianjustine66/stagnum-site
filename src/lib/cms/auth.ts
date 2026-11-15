// Connexion de l'équipe pour éditer en ligne.
// Principe simple et solide pour une petite équipe : un mot de passe d'équipe
// (variable d'environnement CMS_EDIT_PASSWORD). Une fois saisi, on dépose un cookie
// signé ; le serveur n'accepte d'enregistrer/publier que si ce cookie est présent.
// En local (dév), l'édition est toujours ouverte, sans mot de passe.
// (Évolution possible plus tard : connexion via le compte Stagnum / OAuth.)
import { createHash } from 'node:crypto';

export const COOKIE_NAME = 'cms_edit';
const SALT = 'stagnum-edition-v1';

function editPassword(): string {
  return (process.env.CMS_EDIT_PASSWORD || '').trim();
}

// Jeton attendu dans le cookie, dérivé du mot de passe (on ne stocke jamais le mot de passe en clair).
export function expectedToken(): string | null {
  const pw = editPassword();
  if (!pw) return null;
  return createHash('sha256').update(pw + SALT).digest('hex');
}

export function passwordMatches(pw: string): boolean {
  const real = editPassword();
  return !!real && typeof pw === 'string' && pw.trim() === real;
}

type CookieReader = { get(name: string): { value: string } | undefined };

// L'utilisateur peut-il éditer ? En dév : toujours. En ligne : cookie valide.
export function isEditor(cookies: CookieReader): boolean {
  if (import.meta.env.DEV) return true;
  const token = expectedToken();
  if (!token) return false; // pas de mot de passe configuré → édition en ligne fermée
  return cookies.get(COOKIE_NAME)?.value === token;
}

// Un mot de passe d'édition est-il configuré en ligne ?
export function onlineEditingConfigured(): boolean {
  return !!expectedToken();
}
