// Connexion / déconnexion de l'équipe pour l'édition en ligne.
import type { APIRoute } from 'astro';
import { COOKIE_NAME, expectedToken, passwordMatches } from '../../lib/cms/auth';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  let body: { password?: string; action?: string };
  try { body = await request.json(); } catch { return new Response('JSON invalide', { status: 400 }); }

  if (body.action === 'logout') {
    cookies.delete(COOKIE_NAME, { path: '/' });
    return Response.json({ ok: true, loggedIn: false });
  }

  const token = expectedToken();
  if (!token) return new Response('Édition en ligne pas encore configurée', { status: 503 });

  if (!passwordMatches(String(body.password || ''))) {
    return new Response('Mot de passe incorrect', { status: 401 });
  }

  cookies.set(COOKIE_NAME, token, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: !import.meta.env.DEV,
    maxAge: 60 * 60 * 24 * 30, // 30 jours
  });
  return Response.json({ ok: true, loggedIn: true });
};
