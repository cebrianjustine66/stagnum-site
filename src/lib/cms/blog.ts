// Aides pour le blog géré en base.
// Un article = un document sous la clé blog/<slug>, dont la valeur contient les
// champs d'en-tête (h1, description, date, tag, minutes, icon, color) ET le corps
// en HTML (bodyHtml). Les articles d'origine (fichiers Markdown) servent de contenu
// de départ : Astro nous donne leur HTML déjà compilé, sans rien réécrire.
import { POSTS } from '../../data/posts';

export type Article = {
  slug: string;
  title?: string;
  h1: string;
  description: string;
  date: string;
  tag: string;
  minutes: number;
  icon: string;
  color: string;
  bodyHtml: string;
};

const files = import.meta.glob('../../content/blog/*.md', { eager: true }) as Record<string, any>;
const fileBySlug = (slug: string) => Object.entries(files).find(([p]) => p.endsWith(`/${slug}.md`))?.[1];

// HTML compilé d'un article d'origine (par Astro) — identique au rendu du site.
export async function compiledBody(slug: string): Promise<string> {
  const f = fileBySlug(slug);
  if (!f?.compiledContent) return '';
  try { return await f.compiledContent(); } catch { return ''; }
}

// Contenu de départ complet d'un article d'origine (en-tête + corps HTML).
export async function baseArticleFull(slug: string): Promise<Article | null> {
  const p = POSTS.find((x) => x.slug === slug);
  if (!p) return null;
  return { ...(p.frontmatter as any), slug, bodyHtml: await compiledBody(slug) };
}

// En-têtes des articles d'origine, pour la liste du blog (repli quand la base est vide).
export const BASE_ARTICLE_METAS = POSTS.map((p) => ({ slug: p.slug, url: p.url, frontmatter: p.frontmatter as any }));

export function slugify(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'article';
}

// Ajoute un identifiant aux sous-titres (h2) s'ils n'en ont pas, et renvoie le sommaire.
export function addHeadingIds(html: string): { html: string; headings: { depth: number; slug: string; text: string }[] } {
  const out = html.replace(/<h2(?![^>]*\sid=)([^>]*)>([\s\S]*?)<\/h2>/g, (_m, attrs, inner) => {
    const text = String(inner).replace(/<[^>]+>/g, '').trim();
    return `<h2${attrs} id="${slugify(text)}">${inner}</h2>`;
  });
  const headings = [...out.matchAll(/<h2[^>]*\sid="([^"]+)"[^>]*>([\s\S]*?)<\/h2>/g)]
    .map((m) => ({ depth: 2, slug: m[1], text: String(m[2]).replace(/<[^>]+>/g, '').trim() }));
  return { html: out, headings };
}
